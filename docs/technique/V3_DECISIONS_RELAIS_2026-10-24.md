# V3 — decisions and changes of the cloud relay day (24 October 2026)

*Synthesis asked by the user ("le détail des décisions, mais on enlève les allers-retours ; le plus précis possible, mais
regroupé"). It states the **final state** only: what was decided, by whom, and what the code does now. The chronology,
the attempts and the reversals are in `V3_JOURNAL_SESSION_CLOUD.md`; the reference point is `66cc22dab` (ergonomics
session's last commit). Everything below is on GitHub `v3`; Framagit is untouched. The ergonomics session may confirm,
mitigate or cancel each item (the user's words are quoted where a decision is his).*

## 1. Target and rules of the phone screen (`V3_SPECIFICATION.md` § 7.1)

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
9. **Chips of the drawing** (Carte: Profil · Météo · i ; Météo: ◀ ▶ · i): a **vertical column at the right of the
   drawing** with the bare grip; back **into the title row, horizontally**, whenever that row is shown, the drawing
   taking the full width ("objectif : maximiser la largeur dispo"). No empty margin at the left of the drawing (the
   cut's gutter is measured on its level labels).
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
15. **Flight grid vs world weather**: no visible edge by default; an administrator option "Draw the flight zone's
    limit" on the threshold page ("Pas de bord, si ça ne se justifie pas, ou alors en option avancée… au même niveau
    que les sliders de zoom").

## 2. Frame (`frame/`)

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

## 3. Design (`frame/design/`)

- Four designs retained for V3 besides `standard`: **metro, swiss, cupertino, material** (user); `cabinet` goes, `field`
  may stay; nothing skeuomorphic on a phone. Mock-ups and token sets on `v3-metro` (demo pages), system fonts only.
- Overlay buttons: round where `--sog-radius` > 0 (standard, cupertino, material), square elsewhere; `--sog-surface`
  at 92 %, hairline, light shadow.
- Open for the user (§ 10.3): landmark colours and exact hues (Material `#5359c6` vs `#1d5fb8`), Cupertino's blue vs
  `#0066cc`, Swiss cards as a top rule vs a box, a web font or none, which design is `standard`, rules repeated across
  designs to promote to tokens.

## 4. Carte (`modules/maps/`)

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

## 5. Météo / Atmosphère (`modules/atmosphere/`, own session, decisions applied by the relay)

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
- **Weather map as a library** `modules/atmosphere/lib/weather_map.js`: `attach(target, { ctx, flight, levelFt, time,
  layers, edge }) → { update, detach, state ('ok' | 'world-only' | 'missing'), legend(), info(), at(), worldPoint() }`,
  overlay canvas under the map's own, MapLibre or plain-background target, cache-only reads; Atmosphere draws with it.
- **Performance** (390 px, CPU ×4): a pan frame with the seven layers 7.9 ms (was 76), first draw 3.9 s cold /
  2.4 s warm, a lead change 670 KB with levels / 159 KB without; the real device rate is to confirm.
- GFS vs Open-Meteo (documented): 5° published mesh vs the fine model on the flight grid, 3 h steps vs hourly, run
  available ≈ 4.2 h after vs 2.7 h, 11 levels vs 14 but tropopause / jet / clouds per layer, no quota vs 10 000 a day
  per IP.
- Nothing redraws during a sheet drag; the map keeps the module's full size under the sheet.

## 6. Carburant (`modules/fuel/`)

- Opens on the **Devis**, never on the sheets; step 4 is "Résultat"; the sticky result bar is compact on a phone.
- **Flight date** ("slider date du vol pour ajouter x heures à la planification"): the field "Date du vol" (+30 /
  Maint.) writes **`planned_at`** (ISO UTC, optional) into the shared `current_flight.json`; TAF and quote winds read
  at that date; a typed date re-reads the forecast; Carte's ETA and Atmosphère's slider read it.
- Display units next to kg / lb: kt / km/h, ft / m, NM / km / SM (conversions at the screen; FL stays FL).
- Winds sampled along the unrolled route (date line).
- Mount and quote races closed: each mount owns its state and abandons when unmounted; a field changed while the
  flight is still being read is ignored (the screen is `inert` until then); the Devis / Fiches toggle writes `?view=`.
- The date row no longer overflows at 360 / 390 px.

## 7. CR (`modules/report/`)

- One muted line "Prérempli depuis : …" per card instead of a badge in each label; grid cells `min-width: 0`, labels
  on one line (full text as `title`), every field 44 px; action bar = "Enregistrer" (filled) and "Enregistrer et
  inscrire sur le site" (outlined) on two 44 px rows (one row from 700 px), the disabled reason as `title`, description
  and one muted line under the bar; no overflow in five designs, day and night. Cause was the module, not the designs.

## 8. Vols (`modules/flightlog/`)

- Publishes `cache/flightlog/pending.json` (flights without a report, newest first, five at most, 30 days, with the
  `handoff` of "Write the report"); read by the frame for the badge and the status block.

## 9. Réglages and aeronautical base (`frame/settings/`, `frame/aerodb/`)

- Réglages opens on the status block (rule 3), its lines lead to the right card (Identité, Accès, Synchronisation,
  Usages); "Réglage des seuils de la carte (administrateur)" button in Administration (level "Complet").
- The base's three states are told apart (section 2); the home-screen app's "no base" was the base loading in the
  background. Option left to the user: the published base also served from the public pages without a token (licence
  audit, 17–19 MB per cycle).

## 10. Non-regression suite (`tests/v3/`, rule 6 of `CLAUDE.md`)

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
- Known weakness: J1 and C1 are load-sensitive (one is a fuel race now fixed, the other a 30 s bench limit).

## 11. Process

- Relay role formalised (`.claude/agents/relais-cloud.md`): decisions logged with who decided, one worktree per
  agent, GitHub only, journal for the ergonomics session with the rollback instruction.
- The ergonomics session may contest every item above; the old linear history is kept at `v3-avant-squash-2026-10-25`
  and in the lot branches `v3-*` and `feature/atmosphere-route` on GitHub.

## 12. Open for the user

1. Synoptic world on the iPhone (if still missing: the title of the expanded grip).
2. The gear badge as the only glance (rule 3 reverses the afternoon's "i" button).
3. Météo rather than Fiches in the bar's fifth slot.
4. Published base served without a token from the public pages.
5. Design hues, web font, which design is `standard` (§ 10.3).
6. TestFlight secrets (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_API_KEY_P8`, `APPLE_TEAM_ID`) for the Capacitor shell lot.
7. Mission fixture for journey P6; a settings language control (J5 step 5).
