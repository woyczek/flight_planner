# V3 — decisions and changes of the cloud relay, 24 to 27 October 2026

*Synthesis of the decisions and modifications of the cloud relay on `v3`, first written for the day of 24 October at the user's
request ("le détail des décisions, mais on enlève les allers-retours ; le plus précis possible, mais regroupé", 24 October), then
brought up to 27 October on 28 October ("Oui, s'il te plaît, mets à jour ce V3_DECISIONS_RELAIS.", 28 October). It states the
**final state** only: what was decided, by whom (the user's words are quoted in French), what the code does now, the commit on `v3`
and the tests that guard it. The chronology, the attempts and the reversals are in `V3_JOURNAL_SESSION_CLOUD.md`.*

*How to read it. **Part 1** is the document of 24 October as it was written (reference point `66cc22dab`); where a later decision
replaced a point, an italic line under it says "Superseded" or "Amended" and points to Part 2, the history is not rewritten.
**Part 2** is the final state of 25, 26 and 27 October, by area, the same areas as Part 1 plus the aeronautical base, the data
and the process. Everything is on GitHub `v3` (head `0ab8cb32c` for the content, 88 commits after the squash base `5595fdd01`);
Framagit is untouched. The ergonomics session may confirm, mitigate or cancel each item; a lot is withdrawn by `git revert` of its
commit.*

---

## Part 1 — 24 October 2026

*Synthesis asked by the user ("le détail des décisions, mais on enlève les allers-retours ; le plus précis possible, mais
regroupé"). It states the **final state** only: what was decided, by whom, and what the code does now. The chronology,
the attempts and the reversals are in `V3_JOURNAL_SESSION_CLOUD.md`; the reference point is `66cc22dab` (ergonomics
session's last commit). Everything below is on GitHub `v3`; Framagit is untouched. The ergonomics session may confirm,
mitigate or cancel each item (the user's words are quoted where a decision is his).*

### 1. Target and rules of the phone screen (`V3_SPECIFICATION.md` § 7.1)

Reference: the iVAC application. Decided by the user unless stated.

1. **Fixed modules** (Carte, Météo): the screen is header · map · data sheet · bottom bar, **nothing else** between the
   header and the map ("header, carte, carte, footer. Les autres infos sont mises ailleurs"); no page scroll; the map
   gets the maximum room.
2. **Buttons over the map only**: the module's controls are round 44 px buttons laid over the map by the frame (right
   column: the module's actions, full-screen last; left column: Layers), never a toolbar or an info line.
3. **Header on a phone**: name (or ←) · **?** (contextual help: the chapter of the current screen) · **⚙** (Réglages,
   carrying the badge: green = news, amber = attention). No "i" button, no pop-up: its lines are the **status block at
   the top of Réglages** ("les messages et la synchro visibles tout en haut des params, donc pas besoin de boutons dans
   le header"). On a screen the header keeps the sync dot and "?".
   *Amended on 25 October by rule 16: on Carburant, CR and Vols the header carries the module's title in place of the
   application's name, see Part 2 § 1 and § 2.*
4. **Bottom bar**: Préparer · Carte · CR · Vols · **Météo**. Réglages left the bar (the gear opens it). A second tap on
   the active tab opens a popover of the group's entries (Préparer: Carburant · Fiches); a single-entry tab does
   nothing ("Tu gardes le principe de double clic sur le menu pour mettre plus de boutons"). Relay's choice: Météo
   rather than the performance sheets in the fifth slot (the richest screen, hidden until then).
5. **Full screen**: a frame button (last of the right column) hides header and bar (header and rail on a screen); the
   same button or Escape leaves; no exit chip (relay: redundant since the toolbars left). Kept while a frame screen
   is opened over the module; reset on module change.
6. **Sheet** (data block): a frame primitive, three positions on a phone (collapsed, default, expanded), **default 30 %**
   of the view (floor 170 px; user: maximise the map). The grip row carries a meaningful title (content + context),
   ◀ ▶ when they apply, ✕ at the right ("J'aime la proposition de volet de la part de météo").
7. **The drawing fits the sheet**: the vertical profile and the weather cut are drawn at the body's exact height, the x
   axis and the place names always visible without scrolling (no readability floor above the body; level labels thin
   out first). Scrolling is for lists only. In the **default position** the body holds the drawing alone; the text
   strip and the notes appear in the expanded position ("on ne veut que le profil. Le reste apparaît quand on slide").
8. **Bare grip over a drawing, default position only**: 28 px, the handle bar and ✕, no title ("info redondante, qui
   prend de l'espace vertical"); expanded, collapsed and landscape keep the titled row ("utile en volet agrandi ou
   réduit et paysage").
   *Amended on 25 October (rule 13, fourth refinement): the bare row also holds the three chips, see Part 2 § 1.*
9. **Chips of the drawing** (Carte: Profil · Météo · i ; Météo: ◀ ▶ · i): a **vertical column at the right of the
   drawing** with the bare grip; back **into the title row, horizontally**, whenever that row is shown, the drawing
   taking the full width ("objectif : maximiser la largeur dispo"). No empty margin at the left of the drawing (the
   cut's gutter is measured on its level labels).
   *Superseded on 25 October by rule 13, fourth refinement: no vertical column, the three chips sit in the bare row
   itself and their number never changes, see Part 2 § 1.*
10. **Legend behind an "i" chip** (relay's choice among the user's options: no hover on a phone): last chip, toggles a
    translucent legend over the drawing (closed by the chip, a tap, Escape), listing the series actually drawn with
    their symbol and name in four languages, produced by the drawing code (`sectionLegend()` for the cut, the profile's
    own list), never a static text; the help chapter repeats it.
11. **Landscape on a phone** (relay, closing open question 1; Safari ignores the portrait lock): `html.f-land` when
    wider than high and under 1024 px: the bar becomes a 44 px icon rail at the left, the sheet a **right column**
    (40 % of the width, floor 280 px, expanded 60 %, two positions), the map full height, overlay columns never wrap,
    the flight-date slider stays horizontal in the column (vertical kept as the fallback).
12. **Group popover, lists, status**: a module's secondary panels (Layers, Details, Flight, airspace lists) are
    **sheet contents** with a titled head, never panels over the map ("Le sélecteur de couche passe par dessus").
13. **Weather on the Carte**: the Météo chip shows the cut in the sheet **and** will draw the weather layers on the map
    from Atmosphere's shared renderer (library delivered, map integration is the next maps lot).
14. **Map complexity slider is a zoom shift only** ("l'admin définit ce qu'un pilote veut voir à chaque niveau de
    zoom, via cette page outil"): 1 step = 1 zoom level, −4 … +4, first control of Layers; what each zoom shows comes
    from the administrator's threshold page (`#maps?tune=1`), reachable from Réglages › Administration (level
    "Complet").
   *Amended on 25 October by rule 18: Administration is one card with one button per page, see Part 2 § 9.*
15. **Flight grid vs world weather**: no visible edge by default; an administrator option "Draw the flight zone's
    limit" on the threshold page ("Pas de bord, si ça ne se justifie pas, ou alors en option avancée… au même niveau
    que les sliders de zoom").
   *Superseded on 25 October by rule 15 amended: the edge is drawn by default, with the model and mesh of both sides
   in the legend and the help, see Part 2 § 1.*

### 2. Frame (`frame/`)

- **Tabs** = groups of modules (`APP.tabs`, with `views` for sub-views such as `#fuel?view=sheets`); phone bar and
  screen rail from the same table; popover on the second tap.
- **`meta.fixed`**: full-height view with the frame's height variables (`--f-head-h` 57 px, `--f-vh`, `--f-view-h`,
  `--f-split-h`, `--f-pane-h`); the module starts exactly under the header.
- **Overlay layer** `ctx.overlay = { left, right, button({ icon, label, onClick, pressed, side }), over(el), refresh(),
  full }`: a sibling of the module root laid over its map box (follows size changes), `.f-ov-btn` 44 px with a 48 px
  hit area, columns wrap to a second column only on a very low map (4 px gap in landscape so six buttons fit), the
  right column aligned to the edge whatever an element's width, `[hidden]` respected; icons `cloud`, `undo`, `move4`
  added to `frame/lib/icons.js`.
- **Full screen** `html.f-full`: see rule 5; `frame-fullscreen` event then a `resize`; Escape order popover → frame
  screen → full screen; modules that take Escape call `preventDefault()`.
- **Sheet primitive** `frame/lib/sheet.js` + `primitives.css`: `createSheet({ root, panel, head, grip, pos, ignore,
  labels, locked, onChange, onSettle })`; tokens `--f-sheet-default` (30 % phone / 35 % screen), `--f-sheet-expanded`,
  `--f-sheet-head`, `--f-sheet-head-bare` (28 px), `--f-sheet-side*` (landscape column); the **bare handle** is a class
  the module toggles (`head.classList.toggle('f-sheet-head-bare', isDrawing)`), heights measured on the real head;
  nothing redraws during a drag (modules redraw once at `onSettle`).
  *Rewritten on 25 October (rule 19) from the fixed rules: same API, classes and tokens, a move carried by one CSS
  variable, a glide and `onSettle` at the release; see Part 2 § 2.*
- **Landscape** `html.f-land`: rule 11; set before first paint, kept on `resize` / `orientationchange`,
  `frame-orientation` event.
- **Header and status**: rule 3; the badge on `#fDevice`; the **status block** is drawn by the frame (`ctx.status =
  { html, bind }`) and placed first by Réglages: started flight › Carte, report to write › CR (from
  `cache/flightlog/pending.json`, schema 2 with `handoff`, written to `pilot/handoff.json`), data synchronised /
  pending writes / conflicts, aeronautical base state, launcher (host · state), position (GPS toggle), error; each
  line leads to the card that answers.
- **Navigation**: one navigation at a time (`navSeq` token; a stale import, mount, help, pane, settings or error
  screen writes nothing; the previous section is unmounted and removed before the next); `unmount()` can fall during
  a module's `mount()`.
- **Shared geometry** `frame/lib/geo.js`: `wrapLon`, `nearLon`, `unwrapLons` (same logic as Atmosphere's, bench
  compares them), used by Carte, Carburant and Atmosphère.
- **Aeronautical base state** (`frame/aerodb`): `state()` ∈ loading / ready / noaccess / offline / unpublished / idle,
  `on('state')`, `refresh()` on access change and network return, an empty list re-read after 30 s; the first answer
  is no longer cached for the page's life.
- Manifest `orientation: portrait` kept (not honoured by Safari: hence rule 11).

### 3. Design (`frame/design/`)

- Four designs retained for V3 besides `standard`: **metro, swiss, cupertino, material** (user); `cabinet` goes, `field`
  may stay; nothing skeuomorphic on a phone. Mock-ups and token sets on `v3-metro` (demo pages), system fonts only.
- Overlay buttons: round where `--sog-radius` > 0 (standard, cupertino, material), square elsewhere; `--sog-surface`
  at 92 %, hairline, light shadow.
- Open for the user (§ 10.3): landmark colours and exact hues (Material `#5359c6` vs `#1d5fb8`), Cupertino's blue vs
  `#0066cc`, Swiss cards as a top rule vs a box, a web font or none, which design is `standard`, rules repeated across
  designs to promote to tokens.

### 4. Carte (`modules/maps/`)

- Screen per rule 1; overlay buttons: Modifier la route, Cadrer, mode (six modes in a small panel), Modifier (toggle),
  Suivre (started flight), "+" and Annuler in Edit mode; Layers at the left.
- **Layers** as a sheet content: flight selector first, then the **Complexity** slider (rule 14, label · value ·
  slider on one 44 px line), then the layer boxes; MapLibre attribution compact and folded (shared `map_base.js`);
  `startTiles({ worldCopies })`.
- **Thresholds**: `airline/map_profiles.json` only ever held the VFR mode; a mode never tuned now takes the zooms of a
  tuned mode of its family, then (IFR only) the stricter VFR; the tuning page says where its thresholds come from and
  is filled after the mode is known.
- **Sheet**: rules 6–10; title "Profil · FL · NM · vol prévu / en cours" only with a titled head (summary otherwise in
  the handle's label); contents: profile, weather cut (Atmosphere's `drawSection`, `minHeight: 0`), Layers, airspaces
  at a point (one non-wrapping line per space, graph ≤ 30 %), VFR points, levels, aerodrome; strip and notes in the
  expanded position; a drag on the cut moves the shared cursor like on the profile; the "no forecast" message names
  the flight.
  *Superseded on 26 October for the airspaces list: no "one non-wrapping line per space" and no 30 % cap; columns of
  at least 14 px, graph up to 60 %, list on two lines, highest first, no surface-to-ceiling space, an "Aussi ici"
  line; see Part 2 § 4.*
- **Status** as a one-time notification plus a note in the sheet: "base en cours de chargement…", "accès aux données
  non réglé" (button to Réglages), "non publiée" (only when the access works); the alternate no longer blocks the
  route.
- **Date line**: the route is unrolled before any computation or drawing, framing on continuous longitudes, aerodb
  boxes split at 180°, tiles and MORA read at the wrapped longitude, taps and distances modulo 360 (UHMA → PAOM drawn
  across the Pacific, LFRS → LFML unchanged). Still open, in the debt: airspace polygons straddling 180°, mission
  bounds across the line, the poles.
- Airway names drawn after the airway strokes (the name is a filled cartouche, not a halo); ETA from `planned_at` for
  an undeparted flight (none without a date, none once the arrival is past).
- Debt kept open with a measure: SFC–UNL volumes (the published base writes FL 999 / FL 660, never "UNL").
  *Superseded in part on 26 October: `SiaAero.limitRead` reads UNL, FL 999 and FL 660 notations and `surfaceToCeiling`
  removes the spaces from the surface to the ceiling, see Part 2 § 4.*

### 5. Météo / Atmosphère (`modules/atmosphere/`, own session, decisions applied by the relay)

- Dedicated module, fixed screen on the map template; reached by the **Météo** tab; sheet per rules 6–10 with the
  **flight-date slider** (0 to +72 h, origin `planned_at`, then `weather.when`, then now) under the grip, the cut
  (global profile) or the local slice after a tap on the map, Flight · Details · Layers as titled contents; always the
  **current flight** (the schema example is a visit trial, marked, never kept).
- **World synoptic from NOAA GFS** ("NOAA en background, openmeteo en one shoot par utilisateur"): built by the
  Pages workflow every 6 h and on pushes (`tools/build_world_weather.py`, `tools/grib2_lite.py`, standard library,
  NOMADS GRIB filter; OpenDAP is retired), 5° mesh, 3-hourly to +72 h, 15 variables + 11 pressure levels per lead,
  published under `/v3/weather/world/` (index + one file per lead); the workflow never calls Open-Meteo; a device never
  calls Open-Meteo outside the flight grid; "Charger" reads the flight grid (every day the slider can reach) once per
  user. `pages.yml` is identical on `develop` and `v3` (user authorised the develop commits).
- **One rendering for both sides**: fills (clouds, temperature, jet, convection) from the synoptic on both sides of the
  flight grid, lines and barbs blended, no fill or label on the transition band, previous world fields kept only at the
  same level and hour (the "rings" were a blend with the surface while the level file loaded); drawn on every world
  copy; `edge` option per rule 15.
  *Superseded on 25 October for the `edge` option: drawn by default, `edge.show: false` in `airline/map_profiles.json`
  hides it, see Part 2 § 1 and § 5.*
- **Weather map as a library** `modules/atmosphere/lib/weather_map.js`: `attach(target, { ctx, flight, levelFt, time,
  layers, edge }) → { update, detach, state ('ok' | 'world-only' | 'missing'), legend(), info(), at(), worldPoint() }`,
  overlay canvas under the map's own, MapLibre or plain-background target, cache-only reads; Atmosphere draws with it.
- **Performance** (390 px, CPU ×4): a pan frame with the seven layers 7.9 ms (was 76), first draw 3.9 s cold /
  2.4 s warm, a lead change 670 KB with levels / 159 KB without; the real device rate is to confirm.
- GFS vs Open-Meteo (documented): 5° published mesh vs the fine model on the flight grid, 3 h steps vs hourly, run
  available ≈ 4.2 h after vs 2.7 h, 11 levels vs 14 but tropopause / jet / clouds per layer, no quota vs 10 000 a day
  per IP.
- Nothing redraws during a sheet drag; the map keeps the module's full size under the sheet.

### 6. Carburant (`modules/fuel/`)

- Opens on the **Devis**, never on the sheets; step 4 is "Résultat"; the sticky result bar is compact on a phone.
- **Flight date** ("slider date du vol pour ajouter x heures à la planification"): the field "Date du vol" (+30 /
  Maint.) writes **`planned_at`** (ISO UTC, optional) into the shared `current_flight.json`; TAF and quote winds read
  at that date; a typed date re-reads the forecast; Carte's ETA and Atmosphère's slider read it.
- Display units next to kg / lb: kt / km/h, ft / m, NM / km / SM (conversions at the screen; FL stays FL).
- Winds sampled along the unrolled route (date line).
- Mount and quote races closed: each mount owns its state and abandons when unmounted; a field changed while the
  flight is still being read is ignored (the screen is `inert` until then); the Devis / Fiches toggle writes `?view=`.
- The date row no longer overflows at 360 / 390 px.

### 7. CR (`modules/report/`)

- One muted line "Prérempli depuis : …" per card instead of a badge in each label; grid cells `min-width: 0`, labels
  on one line (full text as `title`), every field 44 px; action bar = "Enregistrer" (filled) and "Enregistrer et
  inscrire sur le site" (outlined) on two 44 px rows (one row from 700 px), the disabled reason as `title`, description
  and one muted line under the bar; no overflow in five designs, day and night. Cause was the module, not the designs.

### 8. Vols (`modules/flightlog/`)

- Publishes `cache/flightlog/pending.json` (flights without a report, newest first, five at most, 30 days, with the
  `handoff` of "Write the report"); read by the frame for the badge and the status block.

### 9. Réglages and aeronautical base (`frame/settings/`, `frame/aerodb/`)

- Réglages opens on the status block (rule 3), its lines lead to the right card (Identité, Accès, Synchronisation,
  Usages); "Réglage des seuils de la carte (administrateur)" button in Administration (level "Complet").
  *Amended on 25 October by rule 18: the thresholds button is one of the Administration card's buttons, see Part 2 §
  9.*
- The base's three states are told apart (section 2); the home-screen app's "no base" was the base loading in the
  background. Option left to the user: the published base also served from the public pages without a token (licence
  audit, 17–19 MB per cycle).

### 10. Non-regression suite (`tests/v3/`, rule 6 of `CLAUDE.md`)

- Plan by the relay (`PLAN.md`): nine areas A–I, 86 cases with the expected value and the rule behind each, the bugs
  caught this day as guard cases (§ L), **adherence** of files to areas (§ M) and to six **journeys** P1–P6 (§ N–O:
  Préparer, Voler, Rendre compte, Relire ses vols, Installer et synchroniser, Carte de mission) with end-to-end cases
  J1–J6; written by a cheaper agent, run by a cheaper session.
- Runner `run.py`: `--all`, `--changed [base]` (prints the areas and the `JOURNEY` lines touched), `--for <paths>`,
  `--journey`, `--tag`, `--grep`, `--list`, `--failed [ids]` (replays the failed runs in their exact design / width /
  language), `--failed-scope` (their areas, journeys and the fix's files), Chromium detection, preflight with exit 2.
- **Rule** (`CLAUDE.md` 6): a lot is good when `run.py --changed` passes; a failed test is replayed alone as it
  failed, then in its full scope; the lot's report quotes both. Last full run: 86 cases, 84 pass, 0 fail, 2 skip (no
  mission fixture; format tool absent on the runner).
  *Superseded on 27 October: last full run 116 passes of 118 cases, 0 failures, 2 skips, see Part 2 § 12.*
- Known weakness: J1 and C1 are load-sensitive (one is a fuel race now fixed, the other a 30 s bench limit).

### 11. Process

- Relay role formalised (`.claude/agents/relais-cloud.md`): decisions logged with who decided, one worktree per
  agent, GitHub only, journal for the ergonomics session with the rollback instruction.
- The ergonomics session may contest every item above; the old linear history is kept at `v3-avant-squash-2026-10-25`
  and in the lot branches `v3-*` and `feature/atmosphere-route` on GitHub.

### 12. Open for the user

1. Synoptic world on the iPhone (if still missing: the title of the expanded grip).
2. The gear badge as the only glance (rule 3 reverses the afternoon's "i" button).
3. Météo rather than Fiches in the bar's fifth slot.
4. Published base served without a token from the public pages.
5. Design hues, web font, which design is `standard` (§ 10.3).
6. TestFlight secrets (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_KEY_P8`, `APPLE_TEAM_ID`) for the Capacitor shell lot.
7. Mission fixture for journey P6; a settings language control (J5 step 5).

*Added on 28 October: the questions and debts that appeared since are in Part 2 § 14.*

---

## Part 2 — 25 to 27 October 2026, final state by area

*Same zones as Part 1, plus three new ones (aeronautical base and procedures, data, process). "Rule N" means the rule of
`V3_SPECIFICATION.md` § 7.1 under that number; Part 1 items are cited as "Part 1 § 1 item N". Commits are on `v3`
(GitHub); an item fed by a branch squashed or cherry-picked onto `v3` cites the `v3` commit. A lot is one commit.
Documentation-only commits carry no test. "To check" marks what the sources do not settle.*

### 1. Rules of the phone screen (`V3_SPECIFICATION.md` § 7.1)

- **Rule 13, fourth refinement** (25 Oct; "le i sur la ligne de titre est bien plus lisible que le bouton i, il permet de
  gagner de la place", "ils doivent rester 3, pas faire d'aller-retour entre 2 et 3"). With the bare grip, the three chips
  (Carte: Profil · Météo · i; Météo: ◀ ▶ · i) sit **in the bare row itself**, at its right before ✕: 28 px chips with a
  44 px touch zone; the drawing takes the full width and the full height under the row. Their **number never changes**: a
  chip with nothing to show is `disabled` + `aria-disabled` and dimmed, never hidden. The vertical column of Part 1 is gone.
  Commits `9bb526af7` (Carte), `7d8586179` (Atmosphère). Tests D4, E5.
- **Rule 15 amended** (Part 1 § 1 item 15; the same text sits under item 12 of the spec, which has no item numbered 15 — to
  check; 25 Oct, "il y a un saut entre météo et gfs (normal). Donc je tranche : on affiche le cadre (filet fin) avec un mot
  dans l'aide contextuelle et/ou la légende pour indiquer la différence de modèle entre AROME et GFS. Et la précision du
  modèle"). The edge of the flight zone is **drawn by default**; the legend and the help say "zone du vol" with its model and
  mesh (Météo-France AROME 1,3 km · ARPEGE 0,1°) against "monde" (NOAA GFS 1° (NOMADS), published mesh of 5° **read from the
  world index**, not written in the text; an early "GFS 0,25°" was wrong). Hiding the line is an administrator option
  (`edge.show` in `airline/map_profiles.json`, rule 18). Commits `7d8586179`, `b1709060f`.
- **Rule 16, non-fixed modules on a phone** (25 Oct, the user's proposal: "tu peux laisser le « comment s'en servir » avec
  une croix de masquage… Bien vérifier que l'aide contextuelle arrive sur le bon paragraphe. Limite le surligner"). The
  header carries the module's title (Carburant, CR, Vols) in place of the application's name; the "Comment s'en servir"
  card has a 44 px ✕ and stays hidden on the device once dismissed; the "?" opens the manual at the paragraph of the current
  screen or step and highlights it once for 1,5 s. Commit `a3e617987`; tests A2, A17, A18.
- **Rule 17, map chrome above the sheet** (25 Oct, "le double i, invisible. Masqué par le volet"). MapLibre's controls sit
  above the sheet, never under it, through `map_base.setBottomInset(map, px)`; one attribution control. The "double i" was
  the attribution button stretched to 44 px by the frame's global `summary` rule (Part 2 § 4). Commits `9bb526af7`,
  `f34721950`; test D19.
- **Rule 18, administration behind one button** (25 Oct, "tous les settings admin vont sur un bouton, comme celui des
  réglages de seuils"). One card at the Complete level, one 44 px button per administrator page (Part 2 § 9). Commit
  `c3cad7567`; test A12.
- **Rule 19, the sheet rewritten from the fixed rules** (24–25 Oct, "il lui arrive de clignoter. C'est le signe qu'il faut
  totalement le reprendre, à partir des specs maintenant fixées. On repart d'une feuille vierge dès que prêt. Le résultat
  doit être le même qu'aujourd'hui fonctionnellement"). The relay measured first: the flicker was **the Carte's, not the
  primitive's** (Part 2 § 2). Commit `da8ebe89e`; tests D20, E7, C cases, bench `frame/lib/test/sheet.html`.
- **Rule 20, zoom of the vertical drawings** (25 Oct, "Trouver le moyen de zoomer (pour être précis) le profil vertical",
  read by the relay as an intent). A **window on the distance axis**: pinch around the centre and two-finger pan, one finger
  stays the cursor, double tap or the text button "Vol entier" comes back; on a screen Ctrl + wheel, drag, double click. The
  vertical axis refits to the visible part (that is where the precision comes from). Never stored, **one window per route
  shared by the profile and the weather cut**. No new chip (rule 13). Commits `a33f213ea`, `d785ec7c6`, `79fea5529`; tests
  D21–D25b, E8, E9.
- **Rule 21, no surface-to-ceiling airspace in the vertical views** (25 Oct, "La règle, pour simplifier l'affichage, c'est
  « pas d'espace de la surface au plafond ». Ne pas afficher les SIV, FIR, dans le profil vertical"). Amended on 26 Oct after
  "SIV FIR etc. C'était un workaround pour ne pas avoir de colonnes nonsense. Soit une coche active tout (FIR ?) soit ça n'a
  pas d'intérêt… À toi de trancher avec plusieurs cas d'usages et exemple (endroits simples, endroits chargés)". The relay's
  three use cases: (a) quiet countryside at FL100 near Poitiers — the question is what is crossed (CTA FL115–FL145, R 49 N1);
  FIR and SIV are the service to call, a name and not a column; (b) Paris area, thirteen volumes or more — three more
  full-height columns carry no information; (c) low-level VFR — the SIV name matters, its height does not. **Decision**: no
  checkbox; the graph and the profile never draw them; the sheet and the hover bubble end with one folded line
  "Aussi ici : FIR … · SIV …", names only, not counted in the title, ×4. Commits `51d628491`, `1c3ba2d4d`; tests D26, D28.

### 2. Frame (`frame/`)

- **Title, how-to card, help anchors** (rule 16, `a3e617987`). `meta.title` ×4 of the module is read with the level;
  `paintName(id)` writes `#fName` only when it changes and toggles `html.f-titled`, which clips the module's `h1`; only
  under 760 px, never for a fixed module, a frame screen or a screen. The card is drawn by the frame (`SogHelp.panel()`), its
  ✕ writes `hidden.<module>` in `device/help.json`; the way back is the link "Revoir les premiers pas" under the chapter
  title. `ctx.helpAnchor(id | fn)` stores the anchor; the "?" opens `#help?m=<id>&a=<anchor>`; `help.js` scrolls under the
  sticky header and gives the paragraph the class `f-hl` once, only when `m` and `a` come together. Anchors are identical in
  the four languages (`fuel-step-n`, `fuel-quote`, `fuel-sheets`, `report-step-n`, `flightlog-*`); `build_help.py` refuses
  divergent, duplicate or unknown anchors. A real defect found on the way: the ✕ negative margin overflowed by 2 px in
  `swiss` (A1, F4, G2, G4). Not tried with a real iPhone (✕ inside a `summary`).
- **`frame/lib/sheet.js` rewritten** (rule 19, `da8ebe89e`), same API (`createSheet({ root, panel, head, grip, pos, ignore,
  labels, locked, onChange, onSettle })`), same HTML, classes and tokens. Measured before any code (390 × 844, slow drag):
  62 height changes caused **69 `map.resize()`** and as many MapLibre canvas resets, 48 of 50 calls from **MapLibre's own
  `trackResize` observer** (it runs after layout and before paint, so an empty frame is painted: the blink and the grey
  zone), plus four module observers redrawing at every frame. Atmosphere does not flicker because its map is oversized.
  Now: one state (the position); a move writes one CSS variable `--f-sheet-live` once per step and only if it changed, no
  DOM read under the finger; at the release a 200 ms Web Animation glide (none under `prefers-reduced-motion`), then
  `onSettle` at once; no catch-up timer. After: **0 resize and 0 canvas reset during a drag, one resize after the release**.
  A transform was tried and abandoned (grey band, breaks Atmosphere). **Contract deltas** (`frame/INTEGRATION.md` § 11):
  `onSettle` may fire earlier than 120 ms (never during a move), no CSS height transition (`primitives.css` loses it), maps
  created with `trackResize: false`. Bench 177 → 186 checks; tests C1–C6, D20, E1–E7.
- **Data laboratory screen**: `frame/app.js` gets `LAZY.datalab`, `ROUTES.datalab` / `SCREENS` and `renderDatalab` (about
  45 lines: an adapter reading `sia/base/`, writing `cache/lab/`, the level, the launcher survey and the device's GitHub
  transport, never the token), commit `e998cb2f2`; temporary, **to be reread by the frame session** (Part 2 § 11).
- Frame pieces moved by the settings lot (keys in `device/keys.json`, `navigator.storage.persist()`): Part 2 § 9.

### 3. Design (`frame/design/`)

Nothing decided. The designs were only the test bed: D20, D29 and the pixel checks of the sheet lot run in the five designs,
day and night; the one defect found (✕ in `swiss`, § 2) was the module's CSS, not a design token.

### 4. Carte (`modules/maps/`)

- **Chips, "double i", chrome above the sheet** (`9bb526af7`, rules 13 and 17). Chips `chipOff` written only on a change
  (the "i" disabled while the drawing has no legend, Météo when `canWeather()` is false — a mission map now shows a disabled
  chip, Profil without a profile); collapsed, the chips are visible in the title line and a tap on Météo or "i" opens the
  sheet first. The second "i": `map_base.js` injects one `<style data-map-base>` resetting MapLibre's attribution `summary`
  to 24 px (no repeat, no frame chevron). `setBottomInset(map, px)` writes `--mb-inset-b` only when it changes and lifts the
  bottom controls; called by `mapSize()` and a `ResizeObserver` on the sheet with `sheetOverlap()`; the camera is not
  touched. Tests D4, D19. **D7's root cause** (attribution folded as soon as the control exists; the test waits on states,
  not 500 ms) is fixed in `da8ebe89e`.
- **The sheet's glue** (rule 19): one `ResizeObserver` that only calls `sheet.settle()`; `onSheetSettled` is the only place
  that resizes MapLibre, reframes and redraws (nothing when sizes are unchanged); band of the style's background colour
  instead of page grey. Test D20 (five designs, pixel band check).
- **Legend of the weather cut** (`79b465ca3`; user's iPhone shot "Bug : cf screenshot (légende)", empty boxes). Cause on the
  Map's side: `legendRows('weather')` read `swatch.css` while Atmosphere's `sectionLegend` already returns a coloured 28 × 14
  SVG. Now the SVG is placed as is (`.mp-lg-svg`), one `WX_LAYERS` constant is passed to both `drawSection` and
  `sectionLegend`, the legend follows the app's language and, since the zoom lot, reads `geo.layers` / `geo.strips`. D4 checks
  that every symbol is painted (red before). The legend has nine rows and scrolls inside the default sheet.
- **Airspace limits read at one place** (`51d628491`; "Bug de hauteur. La R57 est affichée plus haut que sa hauteur plafond
  indiquée", "Bug. Retour, dans certains cas, des espaces UNL"). Causes: the Map's copy `limitFt` tested `SFC|GND` before the
  number, so "800 ASFC" read 0 ft and the ceiling fell to UNL; and the published base carries **no limits** for 368 CTL, 35
  SIV, 113 FBZ, FIR, UIR, RMZ, TMZ…, which read 0 / ∞. Fix in `lib/aero_symbols.js`: `SiaAero.limitRead(text, top) → { ft, rel,
  unl, ok }` (number before the word, FL × 100, metres, `rel` for ASFC / AGL / AAL / SFC / GND and never with AMSL, `unl` for
  UNL or ≥ 66 000, `ok` false when empty or unreadable) and `SiaAero.surfaceToCeiling(airspace)` (types SIV / FIR / UIR / CTL,
  or a floor SFC / GND / unreadable under a ceiling UNL / unreadable / empty): **the one filter** of `MapsRender.airspacesAt`
  (list, tooltip, count) and `MapsProfile.build` (cut). An unreadable ceiling is a dotted "?" column, never UNL. ASFC in the
  graph counts from 0 (terrain is asynchronous; the cut adds it per sample). Test D26 (15 notations; R 57 between 800 and
  1 800 ft above ground; red before: 6 listed for 4). Debt: Part 2 § 14.
- **"Aussi ici"** (`1c3ba2d4d`): `MapsRender.airspacesAround(list, lat, lon, more) → { shown, also }`; the sheet ends with a
  frame `<details>` (44 px summary, folded, "TYPE NOM" deduplicated, FIR / UIR / SIV first, absent when empty), the tooltip of
  an airspace label ends with a greyed line. Two deviations validated: the line reads `data.flat` (a service to call stays one
  even when its layer is unticked) and the tooltip exists on labels only. Test D28.
- **The airspaces graph, final state** (`212fceba8`, `6b0dde119`, `615a6ab6d`; the user: "J'aurais préféré garder la largeur du
  graphique, mais un texte sur 2 lignes ? Objectif : lisibilité des zones du graphe", then "C'est bien pour les espaces. Pour
  lire, le plus haut en haut, le plus bas en bas. Inverser 12345 quoi."). Columns are **at least 14 px** (22 px at most) and the
  graph at most **60 %** of the body — except when the 14 px floor needs more (13 airspaces at 301 px: 228 px, 76 %; the floor
  wins, validated by the relay); under 600 px the column width is the largest in 14–22 px that leaves room for the longest limits.
  The list stays beside the graph while a `2.5em + 9ch` basis fits (**two lines per entry**: name, then levels), else drops under
  it at full width; names keep at least 8 characters by wrapping, never by shrinking the graph. **Order**:
  `MapsRender.sortAirspacesTopDown` (ceiling descending, UNL first, then floor descending, then name; unreadable ceiling ranked
  as its floor) applied once in `airspacesAround`: number 1 is the highest in the list, the graph (1 at the left), the tooltip
  and the cursor strip. Tests D11 (admits two lines), D26 (order), D29 (five designs × 844 × 390, 390 × 844, 360 × 780 ×
  default and expanded; red before: names cut to one character, pitch 5,7 px). Not seen with iOS fonts.
- **VFR reporting points**: one point is one row and one label. Read side (`8c1898ed3`, "Bug LFQN. Points de report VFR
  doublonnés."): `MapsRender.dedupeVrp` (same code within 0,5 NM; richest description, then prefixed id) on the layer and on
  `baseVrpOf`; `reportPoints` rewritten (VAC points merged by code, joined to the base point by `vrp`, else same code within 5 NM,
  else within 0,6 NM; "position VAC à n NM" ×4 when it differs by more than 0,5 NM). The first reading blamed the SIA base; the
  source is fixed in the merge (Part 2 § 10). Test D27 (LFQN-shaped fixture, red before: 10 codes listed for 5).
- **Vertical profile zoom** (rule 20, `a33f213ea`, `79fea5529`): `lib/axis_window.js` (`createAxisWindow(el, { total, onChange, min,
  plot, enabled })`, no module state, no timer, no DOM write); `MapsProfile.draw({ window: { from, to } })` in NM draws the
  visible part only, floor of the vertical scale 2 500 ft in a window, round NM step ≥ 40 px, `xOf` / `sOf` read the window so
  the cursor chain (distance based) is unchanged; canvas exposes `data-window` / `-scale` / `-plot` / `-ticks`. Min window 5 NM,
  never outside the flight, disarmed in Edit mode. **One window per route for both drawings** (two helpers, one per container,
  passing the window to each other; `drawSection` gets it; one `requestAnimationFrame` redraws the shown view); kept for the
  page with the route's signature, reset when the points change, never stored; the cut's pointer capture is in the capture phase
  (its SVG is replaced at each redraw). Manual ×4 ("Zoomer le profil", `maps-profile-zoom`). Tests D21–D25b (D25: window shared;
  D25b: a sheet drag on the cut redraws nothing). Not tried with a real finger; no keyboard path.
- **Procedures drawn**: `drawProcedures` draws SID / STAR from `route.procedures` in purple over the route (`1faf869d7`); the
  vertical profile does not draw them yet, and unpositioned points are placed by aerodb (request in `modules/maps/INTEGRATION.md`).
- **`lib/routing.js`** (`94920db8f`): V2's `shared/mission_routing.js` ported to `AeroDB.airways({ bbox })`; edge open when floor − 100
  ≤ level ≤ ceiling + 100 ft, entry and exit to the 8 nearest nodes within 60 NM, detour over 40 % rejected, legs ≤ 40 NM left
  direct, one node per identifier within 2 NM, composite designators, binary heap, `RoutingError` when the base is missing.
  Contract: `modules/maps/INTEGRATION.md` § 9. Bench `modules/maps/test/routing.html` (41 checks), cases F8, F9.

### 5. Atmosphère (`modules/atmosphere/`, own session, lots integrated by the relay)

- **Edge by default, legend naming both models** (rule 15, `7d8586179`): `edge` on in `weather_map.js`; reads `edge` /
  `edge.show` of `airline/map_profiles.json` (`false` hides it: `b1709060f`); the Layers panel names both sides with model and
  mesh, one help paragraph ×4.
- **Chips** (rule 13): ◀ ▶ i always three in the bare row (28 px, 44 px touch zone), ◀ ▶ disabled off a route slice.
- **Map controls** (rule 17, `f34721950`): `sizeMap()` calls `map_base.setBottomInset(map, covered height)` at each settle
  (onSettle, `ResizeObserver` outside a drag); `--at-hide-b` is gone, `--at-hide-r` stays for the landscape column.
- **Rule 19**: `trackResize: false` also for Atmosphere's map (its observers return while `f-sheet-nt` is on); no change to its
  code; E1–E7 pass.
- **Zoom of the cut** (rule 20, `d785ec7c6`): `drawSection(el, { …, window: { from, to } })` / `sectionSvg(model, { window })` in NM
  (absent = whole cut, 1 NM minimum): columns, barbs, isotherm labels, ticks, points, TOC / TOD, cursor and selection filtered; the
  height scale refits to the visible part (levels and relief in the window + 1 500 ft, rounded to the thousand, between 3 000 ft
  and the whole cut's top); `geo` gains `window`, `top`, `strips`, `layers`. Module: `createAxisWindow` on its own cut (5 NM min),
  "Vol entier" ×4 in the grip row **only while zoomed** (still three chips), reset with the route; on a zoomed cut a tap waits
  320 ms before opening the slice (a double tap resets). Tests E8 (pinch, marks, button ×4), E9 (sheet drag keeps the window).
- Atmosphere reads no airspace limit in its cut (checked 26 Oct), so rule 21 does not touch it.

### 6. Carburant (`modules/fuel/`)

- **"Auto" button of the airways** (`94920db8f`; the user, "Oui pour auto"): a 44 px button in the route line, level of the flight,
  else of the quote, else 6 500 ft (said in a notification). It writes **once** the airways into `route.text` (grouped "A AWY B") and
  `route.points` (middle nodes with `awy`, `via`); nothing recomputes them later, a second tap only fills the legs that still have
  none. Real base LFRS → LFML at 6 500 ft: 426,7 NM (+17 %); above FL195 no path (free-route, said rather than invented). Limits:
  no one-way airways, no SID / STAR, `textFromPoints` loses the airway name when a point is edited by hand (geometry kept).
  Tests F8 (synthetic airways), F9 (routing bench), P1.
- **`route.procedures`** is written after "load the OFP" (14 lines in fuel, `1faf869d7`), read by the Map (Part 2 § 10).

### 7. CR (`modules/report/`)

No module decision in this period. The module gets the rule 16 treatment (title in the header, how-to card with ✕, manual anchors
`report-*`); tests A2, A17, A18, G cases.

### 8. Vols (`modules/flightlog/`)

Same: rule 16 (anchors `flightlog-*`); `cache/flightlog/pending.json` unchanged.

### 9. Réglages (`frame/settings/`)

- **Lost keys** (`c3cad7567`; "les settings ont tous sauté cette nuit sur les clefs avwx et github. A priori relance de Safari. En
  revanche, RBR et IVAO sont restés"). Cause, from the code (the loss itself is an inference, nothing in the code erases anything):
  the GitHub token and the avwx key lived in `localStorage` while the identity (trigram, IVAO, VATSIM, SimBrief) lived in IndexedDB;
  Safari evicts script-writable storage of a site it judges unused and the two stores are not evicted together. Decision of the
  relay: the keys persist **like the identity**, in `device/keys.json` (IndexedDB `sogFrame`, policy `cache`, never synchronised,
  left out of `dump()`, ignored by `load()`); `transport_github.js` holds the access in memory and persists through the function
  the frame gives; the old `localStorage` values are taken over once, then erased; `navigator.storage.persist()` is asked at
  the first touch (asked at start it broke D7 one run in two) and the diagnostic says `storage.persisted`. Still possible if Safari
  clears IndexedDB too (seven-day rule outside a home-screen app); the manual advises the Home Screen. Test A19 (a persistent
  browser context closed and reopened; fails on the old code with the user's exact symptom). Spec § 10.16.
- **Administration card** (rule 18, same commit): at the Complete level, **one button per page** with its sentence: map thresholds
  (`#maps?tune=1`), flight-zone limit (a folded checkbox writing `edge: { show }` into `airline/map_profiles.json`, shown by default;
  contract for modules in `frame/settings/INTEGRATION.md` § 4), export of a pilot's configuration (moved here from the Access card),
  roadmap, diagnostics, benches (greyed without a launcher), V2 pages. The launcher-only cards (data repository, IVAO keys, local
  network, Little Navmap) stay in place (Part 2 § 14). Atmosphere's read of `edge.show` is `b1709060f`. Tests A12, A15, D16.
- **Data laboratory button and link**: one more button "Laboratoire données" (Complete level, not `primary`), and, since pass 2
  (27 Oct, "Ajouter un lien direct vers le labo depuis la page admin ; pour tester via github"), the absolute published address
  `new URL(href, location.href)` with a "Copier le lien" button; the lab screen opens with a back link to Réglages. Temporary, it
  goes with the lab. Commits `e998cb2f2`, `e79838de6`; tests A12, A20.

### 10. Aeronautical base and procedures (`frame/aerodb/`, own session "V3 aerodb — procédures")

- **Decision** (25 Oct): « On est d'accord que c'est via aerodb que tu récupères les data ? Donc on parle de consolidation
  uniquement. Step 1 : simbrief. Step 2 : zip. Step 3 en // eurocontrol. Step 4 : us et reste du monde. » and « Idéalement pas
  X-Plane ni Navigraph, mais en fallback. » Procedures enter the suite **only through aerodb**: one common schema
  (`proc/<cycle>/<ICAO>.json` + `index.json`, status `official` > `check` > `ofp`, source and cycle on each record), one API
  (`AeroDB.procedures / procedureIndex / procedureFromOfp / rememberOfp`, async), read by Maps and Fuel. X-Plane / Navigraph stay a
  local fallback, never copied or published (`LICENSE.md`). State of the repository before the work: `V3_ROUTES_PROCEDURES_ETAT.md`
  (airways existed; no procedure source anywhere).
- **Step 1, the OFP** (`1faf869d7`, `frame/aerodb/procedures.js`): SID / STAR read from the SimBrief navlog. The user: « On n'aspire
  pas depuis simbrief, mais le dépôt data est privé, donc on peut synchro. C'est une source secondaire (même simbrief donne des
  routes non authoritatives) » → procedures seen in an OFP are stored in `proc-seen/<ICAO>.json` (read-write, synchronised to the
  **private** data repository, status `ofp`, lowest precedence, never on a public site, no bulk fetch). `proc/` is read-only
  published data. Bench `frame/aerodb/test/procedures.html`, case K1. Limits: the bench was built from SimBrief's documented fields;
  the user then gave his SimBrief address and one real OFP was read outside the repository (`sid_trans` / `star_trans` empty-object
  fix); the committed fixture `ofp_lfrs_lfml.json` is lightened and **rounded** (« Arrondi, oui »: 14 fixes, 2 decimals, no time,
  no personal field; `f85f56682`).
- **Step 2, the SIA eAIP** (`b015d3d7d`, `tools/proc_eaip.py`). The "AD 2 DATA" pages give only a bag of points; the source is the
  ARINC **coding tables** ("DATA_SID/STAR_…_RNAV_CODE", "DATA_RWYxx_RNP_CODE": one line per leg IF / CF / DF / TF with fix, course,
  distance, turn, altitude, speed). Output status `check`, source `eaip`; nothing guessed, doubts in `warnings` (LFBD 38 procedures /
  45 warnings, LFAV 6 / 1, AIRAC 2026-10-01); RNP glide angle, missed phase. **pypdf** (user, 25 Oct, « Pypdf sur le poste. 1
  lecteur pdf, à prévoir pour l'appli (liens vers cartes VAC) »): declared **optional dependency** of the workstation builders,
  the only exception to the standard-library rule (`CLAUDE.md` amended in `ecdccf0a5`), never the launcher nor the page, with a clear
  message when missing. Each aerodrome file carries `charts { base, items[{path, kind}], vac }` for the PDF reader of the
  application (spec § 10.17, to specify). `689b35a4b`: `--all` (the 141 aerodromes of the eAIP menu, `--delay`), publication command
  documented in `frame/aerodb/INTEGRATION.md`, run by the user on the data repository. Cases K2, K3. Limits: no conventional
  procedure (ILS, VOR have no coding table), some RNP AR / VPT lines unreadable.
- **Step 3, EUROCONTROL** (`689b35a4b`, `frame/aerodb/EUROCONTROL_REQUEST.md`): `ext.eurocontrol.int` answers 403 Cloudflare from the
  container; the EAD agreement is paid with State royalties (not suited); the AIXM 5.1.1 "Procedures" data sets may be open (terms and
  coverage unknown). Request drafted for the user, **not sent**; no sample, so no AIXM converter (no simulated input).
- **EAD Basic** (user, 25 Oct, « J'ai un accès basic à l'EAD »; `cc21a80de`, `EAD_BASIC.md`): a presentation tool, an AIP library of PDFs
  by State, "not for operational use", terms of automated access unknown; which States code RNAV / RNP in AD 2 tables is not known
  (France only verified). **Alert to the user**: the code repository is public (Pages on), so no AIP PDF of any State is committed,
  not even as a fixture. **"1 clic"** (26 Oct, « Dfs en standby à beaucoup plus tard. Je privilégie EAD (eurocontrol), mais je le veux en
  « facile » à utiliser (1 clic et de l'autom derrière) », `93534fce8`): a launcher-only button in Réglages › Maintenance
  (Expert level) logging in with the credential kept in the launcher's vault, downloading the AD 2 pages into the local cache,
  layout registry + pypdf, `proc/<cycle>/` status `check`; obstacles listed in order in `EAD_BASIC.md` § 5. **The probe**
  (user, « Sonde, UK, EGGL », read as EGLL; `28dc1b438`): `tools/proc_ead.py --probe`, standard library, read-only, password
  at the prompt or `EAD_PASSWORD`, never kept nor shown, only `www.ead.eurocontrol.int`, no PDF downloaded, report sanitised and
  refused if a secret remains; written without the logged-in screens, so a first run may stop at a step the report names.
  Case K6; how-to `EAD_BASIC.md` § 6.
- **DFS** (user, 25 Oct, « Dfs : procédure . »; `0a93c5d03`): the DFS publishes an AIXM 5.1 "ED Procedure" set openly (REST API,
  checksum) but its terms forbid storage and redistribution without written permission → nothing downloaded; licence request in
  English and German to `data@dfs.de` (address read in the API documentation; the user checks whether a licensing address exists).
  **26 Oct: standby**, « à beaucoup plus tard ».
- **Step 4, FAA CIFP** (`40be45386`, `tools/proc_cifp.py`, standard library): FAACIFP18 (ARINC 424-18, 132 columns) → SID / STAR with
  transitions, approaches, constraints, RNP, glide angle, status `official`, source `cifp`, FAA "as is" notice and `LICENSE.md`.
  Measured on CIFP_261001: 3 070 aerodromes, 51 497 procedures, 274 703 points, 47 MB of JSON (3,64 MiB packed), 4,5 s. Case K4.
  Legs without a fix (VA, VI, CA…) are counted in `warnings`, not drawn. The user publishes it every 28 days (next cycle 2611,
  29 Oct).
- **Inventory of the world** (`4532d4d4f`, `b4f0662b7`, `AIP_OPEN_DATA_INVENTORY.md`): ENAIRE CSV / AIXM without procedures, Poland,
  Switzerland old samples, UK, Canada, Australia, New Zealand no lead; hosts to allow listed per source. **The four steps are
  delivered**; what remains is the user's (publications per cycle, the EUROCONTROL and DFS requests).
- **VFR reporting points at the source** (`869cff5ec`, 26 Oct, « Correctif parser report : à spawner sur un agent « outils
  déconnectés » »). Not the SIA parser (1 098 VFR points, unique and prefixed) but the merge with openAIP: the 674 bare entries come
  from `fr_rpp.geojson` and `AeroSources.merge` compared identical ids only ("N" ≠ "QT-N"). `merge` now drops, for kind `vrp`, a
  point of another source whose bare code (aerodrome prefix and "H-" removed) is already in the list within 0,5 NM; replayed on the
  real files 1 772 → 1 116. `parserVersion` **17**, `COMPAT` 14 (older bases read, marked `outdated`). Bench `frame/aerodb/test/
  vrp_sources.html`, case K5. **To do by the user**: Paramètres › Maintenance › Données aéronautiques › "Reconstruire la base
  aéronautique", then "Synchroniser"; until then the phones read the old base and the Map hides the duplicates.

### 11. Data: regeneration page, dedicated application, laboratory P0

- **Regeneration page** (spec § 10.18; user, 26 Oct: « Envisager une page dédiée régénération des données, sans passer par la v2
  (récupérer fichiers en cache local, compiler, pousser, nettoyer) »; « Go » to specify; `025748c79`,
  `docs/technique/V3_DONNEES_REGENERATION.md`). Today five unrelated chains, **17 sources, 7 with a step without any tool**
  (SIA zip order, NATS, DIRCAM PDF, VAC PDF, CIFP zip, the eAIP address typed by hand, the push of `proc/`). Target: a frame screen
  `#data` drawn by aerodb behind Administration, one row per source with its state against the AIRAC cycle and `parserVersion`, four
  buttons (fetch · compile · push · clean) per row and for all, through a new `ctx.launcher` adapter and a job runner
  `/__setup/regen/state|job|put|publish|clean`; the base's compile leaves `shared/sia_base.js` for pure builders in a worker with
  a byte-identical golden test against V2. **Nine lots D1–D9** (read-only screen, jobs and fetch, procedure sources, compile and
  push of the Python rows, the base without the page, clean, "All" and the cycle watcher, V2 removal, unattended sources); nothing
  coded. User, 26 Oct, on files downloaded by hand: « Ce fichier arrive chez l'utilisateur dans « download » (poste et/ou téléphone)
  pour l'import » → picked up from Downloads in one gesture (`1a611007d`). Questions for the user: `V3_DONNEES_REGENERATION.md` § 5.
- **Dedicated application** (spec § 10.19; user, 26 Oct: « L'appli est en bonne voie. On peut imaginer une appli dédiée au parsing
  et à la compilation de toutes ces données : iOS, android. Chantier dédié. »; `025748c79`, `V3_APP_DONNEES.md`): a separate project.
  Implications written: 71 MB of inflated XML and 44 MB of AIXM for a `DOMParser`, no CORS (Capacitor native HTTP to check), the SIA
  zip stays a human gesture, no Android chain, iOS workflow paused. Proposal: measure first (laboratory inside Pilot), the shell after.
  No lot until the user's go.
- **Laboratory P0** (user, 26 Oct, « Go. Tu inclus toi-même les injecteurs et mesures dans le lab. Je m'organise pour download le SIA
  « payant », tu trouves toutes les autres URLs. »; `e998cb2f2`): screen `#datalab` (Complete level) drawn by aerodb (`lab.js`,
  `lab_sources.js` with 15 rows and their verified addresses, `lab_xml.js` streaming tag reader, `lab_zip.js`, `lab_run.js` +
  `lab_worker.js`, `lab_measure.js`, `lab_report.js`). Per row: "Tester l'adresse" (time, code, size, CORS / policy / unreachable
  diagnosis), "Depuis un fichier", "Depuis Téléchargements" (launcher). **Three modes** of the SIA zip, run in the order c, b, a:
  (a) main thread as V2 with `DOMParser`, (b) worker with a streaming reader, (c) zip streamed too; time per step, heap when the
  browser exposes it, a survival trace in `localStorage` for a killed tab. CIFP streamed, JSON / HTML / PDF probes, trial publication
  by the frame's GitHub transport, copyable report in `cache/lab/report.json`. Deviations: 12 source hosts added to `connect-src`
  (**AUDIT M2, to revert when the lab goes**), `frame/app.js` touched (§ 2). Chromium 141 on the real export: a 2,5 s / 775 MB, b 0,68 s,
  c 0,53 s / 259 MB, identical counts (1 817 airspaces, 1 098 VRP, 808 aerodromes, 406 navaids, 4 276 points, 13 836 obstacles).
  Fixtures are **synthetic**: the relay found one contour point and the export's header dates verbatim in the first version.
  Cases K8 (105 checks), K9, A20–A24.
- **Measured on the user's iPhone** (27 Oct, iOS 18.7, Safari, 4 cores; `V3_APP_DONNEES.md` "P0 results", `d5a306b43`): SIA zip parsed in
  **0,41 s** in a streamed worker (0,37 s worker, 2,7 s main thread as V2), the three modes survive twice, **counts identical** to the
  workstation; CIFP 51 MB in 121 ms; publication through the GitHub API 107 B in 2,8 s and **2 MB in 3,2 s** (the 5,3 and 10 MB blocks
  missing from the report). **CORS** allowed for AWS tiles, ENAIRE and FAA ArcGIS; blocked for SIA, FAA aeronav, NOAA, openAIP,
  GeoNames, DIRCAM, NAV CANADA, NATS, NAT (9 of 15 sources in the regeneration table). Conclusion: compiling on a phone is a
  non-issue, the obstacle is the download (a direct link + Files gesture on the web, native HTTP in the dedicated app). GitHub's
  documentation gives no maximum for create-blob / create-tree; repository files warn at 50 MiB and are refused at 100 MiB.
- **Pass 2** (27 Oct, « Prochaine passe du labo : lien direct sans Copy/paste en cas d'échec », « Pas vu de test eurocontrol ead dans le
  labo »; `e79838de6`): a real "Ouvrir / Télécharger" link per source (44 px; the cycle in force and the next when asked), a folded
  long-press help ("Télécharger le fichier lié" → Fichiers › Téléchargements → "Depuis un fichier") unfolded after a CORS block;
  "Enregistrer le résultat" and "Partager le rapport" by `navigator.share({files})` when `canShare`; **four separate publication
  buttons 0,5 / 2 / 5,3 / 10 MB**, each result or "no answer after 120 s" written, "Nettoyer" lists what it removes; ten-line summary at
  the head of the report; an **EAD Basic row** (login page probe, empty-fields login call to tell CORS from refusal, no credential
  anywhere; EAD host added to `connect-src`). Tests K8 (105 checks), A20, A21, A23.
- **"Every link went to openAIP"** (27 Oct, `63649e2ae`): **not reproduced** in Chromium with an iPhone emulation (16 rows, five designs,
  `sogLab:urls` absent / `{}` / `null` / malformed). Fixed: the test hook of the addresses now answers only on `localhost`,
  `127.0.0.1`, `[::1]`, with an own-keys plain object and https strings, so it is **inert in production**; the openAIP row says its
  S3 export can be slow and that long press is the gesture. Test A20 (host of every link equals the table's). The iPhone cause is
  unknown (to check: which row was tapped first, whether an openAIP tab was already open).
- **EAD from the phone** (27 Oct, « EAD : on finit par arriver sur un catalogue, avec des charts. Navigation uniquement manuelle ? »):
  yes from a phone; the one-click is the launcher's, after the probe.

### 12. Non-regression suite (`tests/v3/`)

- **Passes of the runner** (Haiku, detached checkout, `--all --jobs 2`): from 84 passes of 86 cases (Part 1 § 10) to **116 of 118,
  0 failures, 2 skips** (I5: no beautifier on the runner; J6: no mission fixture), last on `6102864e9` (27 Oct); intermediate passes
  `64f7fb711` 89/92, `7ad5b3c40` 95/97, `6fce55a7b` 103/105, `ac1af86af` 105/107, `84c6ddb06` 107/109, `e4fbed82a` 108/110,
  `a3c3f1504` 116/118. D7, D10 and J2 passed in the last passes.
- **Cases added (32)**: A17 (help lands on the right paragraph), A18 (how-to card dismissed once), A19 (keys survive a relaunch), A20–A24
  (data laboratory: Administration at the Full level and the links, "Tester l'adresse", "Depuis un fichier" with a small zip, four
  publication buttons, "Depuis Téléchargements"); D19 (map chrome above the sheet), D20 (still during a sheet drag), D21–D25b (profile
  and cut windows: pinch, sheet drag, kept then reset, Ctrl + wheel, shared window), D26 (limits and order), D27 (one line per VFR
  point), D28 ("Aussi ici"), D29 (airspaces graph and list); E8, E9 (cut window); F8, F9 (Auto airways, routing bench); and a **new area
  K = aerodb**: K1 (procedures API bench), K2 (eAIP coding tables), K3 (eAIP aerodrome file), K4 (FAA CIFP reader), K5 (one VFR point
  per point at the source), K6 (EAD probe), K8 (laboratory: sources, streaming reader, three modes, report), K9 (laboratory repository
  rules: hosts in the page policy, launcher patterns, no secret). K7 is not used (to check). Adapted: A2, A12, A15, D4 (three chips
  always, every legend symbol painted), D11 (two lines per airspace), D16.
- **Rules**. I5 (format) skips when the touched sources are all generated, instead of checking the whole tree (`b15e96b63`). I4 (help
  bundle fresh) fails after **every** journal commit because `apps/aide/docs_bundle.js` bundles `docs/technique/*`, this journal and
  this document included: each journal or documentation commit rebuilds it (`python3 tools/build_docs_bundle.py`), seen on `64f7fb711`.
  A test that proves a fix fails on the old code ("red before") is the habit of every lot above.
- **Weak spots**: D7 (attribution folded after load) was flaky on the base itself, root cause fixed in `da8ebe89e`; J2 failed once in
  `390/standard/de` under load (passes alone and in two more passes); `collapseAttribution` stays timing-sensitive.

### 13. Process

- **Squash of 25 Oct** (« Tu me reprends toutes les décisions et modifications, et tu les synthétises… Ensuite, je veux un squash
  sélectif par module »): `v3` since `66cc22dab` rewritten, one commit per zone on base `5595fdd01` (frame `5b7c071fe`, design
  `ee0fd30cd`, aerodb `dcfc13ea1`, settings `8d067e88e`, weather `64d09c2a0`, maps `ff99f005a`, fuel `f97f7d771`, report `ace72e940`,
  flightlog `08c0ed10e`, help `1a8d063f0`, tests `9dca7a7be`, docs `5595fdd01`), pushed with force-with-lease; the linear history
  survives as `v3-avant-squash-2026-10-25` and in the lot branches. Since then **88 commits** to `0ab8cb32c`.
- **One commit per lot**: documentation, CHANGELOG, manuals ×4 and `apps/aide/docs_bundle.js` in the lot's commit (the rule of
  `CLAUDE.md`); a lot with several branch commits is squashed (the aerodb step 1 had merged `origin/v3` into its branch: its tree
  was applied as one commit). Lots arrive by **cherry-pick or fast-forward**; a conflict is merged by the relay (CHANGELOG, DECISIONS,
  `PLAN.md`, the bundle); **a journal commit follows each lot** (about half of the 88).
- **Who does what**: lots are written by Sonnet sessions in the module's V3 role on `v3-*` branches (maps, frame, settings, fuel,
  aerodb), Atmosphere by its own Opus session on `feature/atmosphere-route`, aligned on `v3`; the relay reviews, gates, integrates
  and pushes to GitHub only; "V3 aerodb — procédures" (EAD, DFS, CIFP, eAIP, `tools/proc_ead.py`) is idle until called; a Haiku
  session runs the full suite on request. Each lot reports its gate (`run.py --changed`) and the relay re-runs a smoke of 50 cases
  plus the lot's cases.
- **Test hook inert in production**: `localStorage['sogLab:urls']` answers only on a local page (§ 11).
- **Public repository**: no AIP PDF in the code repository, not even as a fixture; the real-OFP fixture is rounded and anonymous; the
  laboratory's fixtures are synthetic (the first version of `v3-donnees-lab` kept two values copied from the licensed SIA export;
  an amend + force-push was refused by the classifier, so that branch holds the first version in its history and can be deleted).
- **Network**: every host of steps 2–4 is denied by the cloud environment's policy; the user adds them. Not tested on real WebKit or a
  finger for any lot of this period (Chromium with touch emulation, CDP touch events).

### 14. Open for the user, and debts

For the user (list of the instruction of 28 Oct, then what the journal adds):

1. Report of **laboratory pass 2** from the iPhone (long-press save of a JSON, `.geojson` in the picker, `canShare({files})`, the 5,3 and
   10 MB blocks, the EAD login call) and which row was tapped first in the "openAIP" incident.
2. Report of the **EAD probe** (`tools/proc_ead.py --probe`) on the workstation.
3. **Rebuild the base** (parserVersion 17) and synchronise.
4. The questions of `V3_DONNEES_REGENERATION.md` § 5 before lot D1 (the journal says eight; the section lists nine — to check).
5. Send the **EUROCONTROL** request (`EUROCONTROL_REQUEST.md`) and, much later, the **DFS** one; the EAD terms question to
   ead.service; run the per-cycle publications (eAIP `--all`, CIFP 2611 on 29 Oct).
6. **Launcher-only cards** (data repository, IVAO keys, local network, Little Navmap) behind Administration or not.
7. **Cut legend on two columns** or not (nine rows scroll in the default sheet).
8. **Hover tooltip** without SIV / FIR: confirm (same filter as the list; they are on the "Aussi ici" line).
9. Delete the lot branches `v3-*` (37) and `feature/atmosphere-route` after reading, and `v3-donnees-lab`.
10. Still open from Part 1 § 12: world synoptic on the iPhone, TestFlight secrets, mission fixture for P6, a language control.

Debts: the studio's V2 copies of `limitFt` (`shared/carto/aero_symbols.js`, `vertical_profile.js`, `vprof_editor.js`, same ASFC bug) for BUGS
SOG; the "Not done" line of `modules/maps/DECISIONS.md` still blames the SIA parser for the duplicated points (to correct by the Map);
a name already carrying its type may read "FIR FIR PARIS" in "Aussi ici", mission maps have no `data.flat` (empty line); unconfirmed
reading of the iOS fonts for the graph and list; polygons across 180°, the poles (Part 1 § 4); D7 and J2 under load; the `connect-src`
hosts and `renderDatalab` go with the laboratory; the PDF reader of the application (§ 10.17) is not specified.
