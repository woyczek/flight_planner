# Changelog — X-Plane Web Suite (DEFA Virtual)

Toutes les évolutions notables de la suite (CR DEFA, Landing Performance Dashboard, Flight
Performance & Fuel Planner, Missions SIA, framework commun). Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation `majeur.mineur.correctif`.
La version affichée en pied de page de chaque page (lien vers ce fichier) vient de
`repository_tree` (`release`).

Dépôt : <https://framagit.org/asr/flight_planner> — demandes de fusion : `!n`.

## [Unreleased]

### V3

- **Atmosphere: no rings round the flight's grid** (`modules/atmosphere/lib/weather_map.js`, `test/weather_map.html`; atmosphere
  DECISIONS, INTEGRATION § 6) — at a flight level, while the world's pressure-level file was still being read, the surface world was
  blended into the grid: a dark frame of concentric isobars and isotherms with stacked labels. The world is now blended only at the same
  level and hour, no label sits on the transition band, and a grid alone fades out instead of ending in a rectangle.
- **Map: the Complexity slider goes lower and comes first; the administrator's thresholds apply to every mode; the tuning page has a button**
  (`modules/maps/module.js`, `render.js`, `frame/settings/admin_links.js`, `settings.js`, manuals in four languages, `tests/v3/` D14 / D15 / D16;
  maps SPEC § 4 quinquies, DECISIONS) — the slider only shifts the zoom (one whole zoom level per step, −4 … +4; it was ¾ of a level from −2
  to +2, which went down 1.5 levels only), so zoomed out on Europe on a phone its minimum leaves nothing passing a range; it is now the
  first control of the Layers content, right under the flight selector, named "Complexity" (no more "(trial)"), with a help sentence in four
  languages, and the map follows the finger. The thresholds of the airline's file (`airline/map_profiles.json`) were read and applied, but the
  file held the VFR mode only (the tuning page saves the mode on screen), so Auto, IFR low / high, Topo and CAM kept the looser built-in values:
  a mode the airline never tuned now takes the ranges of a tuned mode (its family first; an IFR mode may take VFR's, never the reverse), and
  the tuning page says where the mode on screen gets its thresholds. Settings, "Administration" card (Full level): the link to the tuning page
  is the button "Map threshold tuning (administrator)". The map element publishes `data-zoom-eff` and `data-kept` (what the thresholds keep)
  for the tests.
- **Atmosphere: the weather map is a library, ready for the Map** (`modules/atmosphere/lib/weather_map.js`, `module.js`, `texts.js`,
  `test/weather_map.html`; atmosphere INTEGRATION § 6, DECISIONS; V3_SPECIFICATION § 7.1.8) — isobars, isotherms, clouds, barbs,
  temperature, jet stream and convection, the flight's grid blended into the world synoptic, now drawn by one renderer: `attach(map,
  { ctx, flight, levelFt, time, layers })` → `{ update, detach, state, legend, … }` over a MapLibre map or a flat background, or
  `createWeatherMap` for a host drawing into its own canvas. The Atmosphere module draws through it; the Map's Météo chip will. The
  library reads the weather cache only and the published world synoptic, never Open-Meteo; `legend()` gives the layer rows in four
  languages. The jet and convection layers lose their "(world)" suffix (drawn everywhere since the shared computation).
- **Landscape on a phone: a rail at the left, the sheet as a right column, a full-height map** (`frame/app.js`, `frame/index.html`,
  `frame/frame.css`, `frame/design/primitives.css` and the four designs' bar rules, `frame/lib/sheet.js`, `frame/lib/test/sheet.html`,
  `tests/v3`; frame INTEGRATION § 9.1–9.4 and § 11, SPEC, design SPEC; the help in four languages) — Safari does not honour the
  portrait lock, so a phone turned to 844 × 390 now gets its own layout: when the window is wider than high and under 1024 px the frame
  sets `<html class="f-land">` (once per change, on `resize` / `orientationchange`; `frame-orientation` is fired after). The bottom bar
  becomes a **44 px rail of icons at the left edge** (full height under the header, no label but an `aria-label`, the same popover on a
  second touch, opened at its right), the header stays at 57 px, and the view takes the rest. A fixed module's **sheet becomes a column at
  the right of the map** (`--f-sheet-side` 40 % of the width, 280 px at least; expanded `--f-sheet-side-max` 60 %; two positions, the
  grip row at its top, a tap or a horizontal drag switches them, the body scrolls inside) and **the map takes the rest at full height**
  (333 px instead of 163 on an iPhone 13); the overlay buttons stay on the map in one column (4 px gap, six fit, a seventh wraps).
  `onChange` / `onSettle` give the same position names as in portrait: Maps and Atmosphere change nothing. Full screen in landscape hides
  the header and the rail and keeps the column. The device's safe areas (notch, home indicator) are left free. **The full-screen exit chip
  is removed** (the column's button, which shows "minimize" in full screen, and Escape leave it), in portrait too. Portrait is unchanged;
  the designs' tab-bar rules no longer sit under `max-width: 760px` (the bar is displayed on a phone and in landscape only). New case
  A14 in the suite and a landscape part in the sheet bench (129 checks).

- **V3 Map: the weather cut is no longer clipped at the bottom; the default sheet shows the drawing alone** (`modules/maps/module.js`, maps
  DECISIONS, `tests/v3/` D4 and `seed_forecast`) — on a phone the weather cut kept its 140 px readability floor in a body that was
  `overflow: hidden`, so the distance axis was cut (a short window, landscape before the column: a 117 px body); the body now scrolls and the cut is redrawn at the real
  height when the sheet settles. At the default position the sheet body shows the profile or the cut alone, on the whole body height
  (the profile has a 120 px floor); the text line under the cursor and the notes appear only when the sheet is expanded, under the drawing.

- **Aeronautical database: loading, access not set and not published are three different messages** (`frame/aerodb/aerodb.js`, `frame/app.js`,
  `modules/maps/module.js`, manual note in four languages, `tests/v3/` A15 / D5 / D5b; settings DECISIONS, aerodb INTEGRATION / DECISIONS, frame
  INTEGRATION § 10) — on a phone (seen in the app added to the iOS home screen) the Map said "Aeronautical database not published" while the base
  was still coming: an empty list read before the network was ready stayed for the page's life, and the alternate's lookup kept the whole map
  blank. aerodb now says `loading` / `noaccess` / `unpublished` (`aerodb.state()`, `on('state')`, `refresh()`); the Map's note reads "Aeronautical
  database loading…" (with the zones being read), "Data access not set on this device" with a Settings button, or "not published" only when the
  access works; the "i" pop-up has one line for the same states; an empty list is read again after 30 s and when the access or the network
  changes; the alternate no longer blocks the route. Serving the base from the public pages is noted for decision, nothing changed.

- **Fuel: the flight date belongs to the shared flight** (`modules/fuel/module.js`, `frame/lib/current_flight.js`,
  `modules/maps/module.js` one condition; fuel SPEC § 9–12 / INTEGRATION § 3 / DECISIONS, maps INTEGRATION / DECISIONS, the manual in
  four languages) — the "Flight date" field (ex "Flight date (optional: TAF)") writes `current_flight.planned_at` (ISO 8601 UTC,
  optional, absent = now; schema number and merge rule unchanged), the one value that the quote's weather (aerodromes' TAF, winds
  and temperatures aloft), the Map's ETA and, from its own session, Atmosphere's slider start from; `weather.when` stays as its copy
  in local time. A date typed in the field now reads the forecasts again for the new hour (only "+30" / "Now" did). The Map draws the
  ETA of the route points for a flight that is not started too, counted from `planned_at` (fuel writes `progress.eta` only; nothing
  without a date or once the arrival is past). Step 4 of the plan is renamed "Result" (fr Résultat, de Ergebnis, es Resultado): "Quote" is the first tab's name only.
  The date row no longer overflows at 390 px (known failures F4 and F5 of the suite fixed and removed from `known_failures.py`).
- **Frame finishing touches: `hidden` on overlay buttons, three icons, launcher line in the "i" pop-up** (`frame/design/primitives.css`,
  `frame/lib/icons.js`, `frame/app.js`, `modules/maps/module.js`; frame INTEGRATION § 9.3 / § 10 and SPEC) — a button of the overlay layer
  with `hidden` is now really hidden by the frame, so the Map drops its own rule; `cloud`, `undo` and `move4` (four directions) join the
  frame's icons and the Map no longer carries copies of them; when the data goes through the launcher, the "i" pop-up has a line
  "Launcher: <computer> · <state>" (four languages) that opens Settings, the only place where a phone shows the host.

- **Flights across the date line: Siberia to Alaska on the Map** (`frame/lib/geo.js` new, `frame/lib/test/geo.html`,
  `modules/maps/module.js`, `render.js`, `profile.js`, `contours.js`, `lib/map_base.js`, `modules/fuel/winds.js`; frame
  INTEGRATION § 12 and SPEC, maps SPEC § 4 octies / INTEGRATION / DECISIONS, the manual in four languages) — the helper that
  Atmosphere wrote (`wrapLon`, `nearLon`, `unwrapLons`) is now the frame's, with the same logic so that the weather cache cells
  do not move. The Map unrolls the route before any calculation or drawing (UHMA → PAOM runs 177.7° → 194.6° instead of crossing
  Europe): the distance marks, TOC / TOD, profile, cursor, barbs and framing follow; MapLibre runs with world copies for the Map,
  every longitude is taken to the copy nearest the view, aerodb boxes are cut in two at 180°, relief, MORA, contour tiles and the
  route written by the Edit mode are always in [-180, 180[, taps and distances compare modulo 360. Fuel's `winds.js samples`
  interpolates the winds aloft on the unrolled route (they were read round the world). The "no forecast" message of the Weather
  chip names the flight ("No forecast for UHMA → PAOM:"). An ordinary flight is unchanged (route, marks, data boxes identical to
  the previous version). Not done: airspaces that straddle 180°, mission maps whose extent straddles the line, the poles.
  The note "Aeronautical database not published" in the sheet now carries the "Offline data" button to the settings.
- **V3 non-regression suite** (`tests/v3/`: `run.py`, `lib.py`, `domains.py`, `cases/*.py`, `README.md`, plan in `PLAN.md`) — one command,
  `python3 tests/v3/run.py`, no launcher, data repository, network or token: it starts a standard-library static server on a free
  local port, drives Chromium with Playwright and checks what must stay true on every screen of the Pilot application: the
  frame's layout and chrome (header 57 px, five-entry bottom bar, group popover, "i" pop-up and badge), the overlay layer and full
  screen, the sheet primitive, the Maps, Atmosphere, Fuel, Flightlog and Report screens, the five designs and the repository
  rules (fingerprints, conflict markers, four languages, help bundle, format, module documents, CHANGELOG). Each case runs on the
  phone in the five designs and once on a screen, four languages where it matters; it records JavaScript errors, names the rule
  that broke with the measured and the expected value, and keeps a screenshot. The frame's cache is seeded without a launcher
  (design, identity, a planned flight, a pending report, a tiny SIA base). `--changed`, `--for <paths>`, `--grep`, `--tag` choose
  the cases from the files changed (the adherence map of PLAN.md section M); `cases/known_failures.py` carries the two known
  failures (F4, F5) without hiding them. Report in `tests/v3/report.md` and `report.json` (git-ignored).
- **V3 non-regression suite: the functional scope** (`tests/v3/journeys.py`, `cases/journeys.py`, `run.py`, `lib.py`, `README.md`, PLAN.md sections N and O) — the six journeys of the pilot (prepare a flight, fly, report, read one's flights, install and synchronise, mission map) as data with the files that carry each and the area cases that guard it, and one end-to-end case per journey (J1 to J6: the quote typed by hand to Carte and Météo, the flight started and cancelled in four languages, a flight without a report to the saved report, the flight log's totals, filters and CSV, the first launch to the design and offline). `--changed` / `--for` print one `JOURNEY P1 … — <files>` line per journey a change touches (or `JOURNEY none (areas only)`), add its end-to-end case, and head `report.md` / `report.json`; `--journey P1,P3` runs journeys by name; `--list` shows areas and journeys without running; `--failed [IDS]` replays the failed cases of the last report in the combinations that failed and `--failed-scope [BASE]` runs their full scope (the areas and journeys they belong to, plus the cases chosen by the files the fix touched): PLAN.md section P. A journey case names the step that broke and records, never hides, the steps the suite cannot do (website, data repository, network sessions, language control).
- **Maps: the screen is header · map · sheet · bar** (`modules/maps/module.js`, `lib/map_base.js`, SPEC § 4, INTEGRATION § 2 quater,
  DECISIONS, the manual in four languages) — nothing between the frame's header and the map: the flight selector moves into the
  Layers content, the flight summary becomes the sheet handle's title ("Profile · FL065 · 427 NM · planned flight"), the Profile ·
  Weather toggle becomes two icon chips at the right of the handle, and the buttons (Edit the route, Recentre, map mode, Edit on the
  map, Follow, "+", Undo; Layers on the left) are the frame's overlay buttons, the full-screen button last. Layers opens in the
  sheet like the aerodrome contents (title "Layers · flight", ✕ back to the profile) instead of floating over the map. The status
  lines are gone: "database not published" and "GPS or network not enabled" are a floating notification once, kept in the sheet's
  notes, and the empty state is a card on the map area; the hints moved to the manual (the Edit mode's help is shown once per page).
  Escape closes what the module opened (modes, sheet content, card, "+", Edit mode) without leaving the full screen. MapLibre's
  attribution is folded on its "i" button and carries the SIA note: one credit text.
- V3 frame: overlay right column aligns every button to the map's right edge, a wider element included (`align-items` under `wrap-reverse`).
- **Frame: overlay layer and full screen for fixed modules, a header reduced to name · i · ⚙ on a phone, the tab group as a
  popover** (`frame/app.js`, `frame/frame.css`, `frame/design/primitives.css`, `frame/lib/icons.js`, `frame/index.html`,
  `frame/lib/test/sheet.html`; frame SPEC § 3.1, INTEGRATION § 9.1 / 9.3 / 9.4 / 11, DECISIONS, design SPEC and DECISIONS, the
  manual's introduction in four languages) — the map screens of the user's 24 October rules ("header, map, map, footer"): a fixed
  module now gets `ctx.overlay`, a layer laid exactly over its map with a left column and a right column of round 44 px buttons
  (`ctx.overlay.button({ icon, label, onClick, pressed, side })`, `over(el)`), never over the sheet; the frame adds a **full
  screen** button to every fixed module that hides the header and the bottom bar (the header and the rail on a screen), gives
  the view the whole window (`--f-view-h` = `--f-vh`), shows a 44 px exit chip, leaves on Escape, and tells the module with a
  `resize` event. On a phone the **header is name · "i" · ⚙** only: the synchronisation dot becomes the colour of the "i" badge
  (green: a flight or report applies; amber: no trigram, pending writes, conflicts, error, offline) and lines of its pop-up,
  which also gets "Position: <source>" and, last, "Help for this screen ›" (the former "?"). The row of group sub-tabs above a
  module is gone: a **second tap on the active bottom tab** lists the group's modules in a small popover (Prepare: Fuel ·
  Atmosphere). The sheet's default height is 30 % on a phone (the map gets the room); no margin between the header and a fixed
  module. Modules migrate their own toolbars in their lots.
- **Frame: the three-position sheet is a primitive; Maps adopts it and takes the frame's heights** (`frame/lib/sheet.js`,
  `frame/design/primitives.css`, `frame/lib/test/sheet.html`, `modules/maps/module.js`; frame INTEGRATION § 11 and § 9.2,
  SPEC § 3.9, design SPEC, DECISIONS, `modules/maps/{INTEGRATION,SPEC,DECISIONS}.md`) — the block under a map that sits
  collapsed, default or expanded and is pulled by its header line becomes `createSheet({ root, panel, head, grip, pos, ignore,
  labels, locked, onChange, onSettle })`: the drag follows the finger and snaps to the nearest position (a flick above 0.8 px/ms
  goes to the next one, a tap collapses or restores and never expands), the keyboard and the ARIA are done, and the heights are
  the frame tokens `--f-sheet-head` / `-default` / `-expanded` (and their floors) a module may override on its root. It writes
  no text and keeps no state. Maps drops its own copy and its CSS, and also its two copied pane / split heights and the
  `!important` of its tuning page (the frame applies `--f-view-h`): the Map screen is pixel-identical in the three positions,
  at 390 and 1280, in the seven designs and in the dual view. A bench on a bare page (`frame/lib/test/sheet.html`, 76 checks)
  covers positions, snapping, flick, keyboard, `onChange` / `onSettle`. Atmosphere's copy is replaced by its own session.
- **Maps: shared map base, weather cross-section in the sheet** (`modules/maps/lib/map_base.js`, `modules/maps/module.js`,
  `modules/maps/{SPEC,INTEGRATION,DECISIONS}.md`, `modules/maps/help/*.md`) — the MapLibre loading, base styles, tiled base,
  own-resize marker and plain background of the map move to `lib/map_base.js`, a state-free ES module that the atmosphere
  module will import instead of its copies (INTEGRATION § 7; the Map screen is pixel-identical, with and without tiles). The
  data sheet's three functions are one isolated block (`createSheet`) ready to become a frame primitive. The sheet's header
  gets a small "Profile · Weather" toggle (44 px, four languages, remembered while the page lives): "Weather" draws
  atmosphere's pure cross-section along the route against the flight's level, following the shared cursor (a tap on it moves the
  cursor); it only shows the forecast atmosphere has already read into `cache/weather/` (maps never asks Open-Meteo), otherwise
  one line leads to Weather in Prepare. The airspaces and aerodrome contents are unchanged.
- **Frame: the "i" status button of the header, a one-row header after any screen, heights for modules in the dual view,
  a weaker `display` rule** (`frame/app.js`, `frame/frame.css`, `frame/index.html`, `frame/design/primitives.css`; SPEC
  § 3.1, INTEGRATION § 9.2 and new § 10, DECISIONS) — the status line of the Prepare tab is replaced by an **"i" button**
  of the header (the iVAC pattern, spec § 7.1): a green badge when something is news, a pop-up under the header with
  one line each — "Flight in progress › Map" (a started flight), "Report to write for the flight of <date> <DEP>→<ARR>"
  (read from the cache record `cache/flightlog/pending.json` that flightlog publishes; a touch hands the flight to the
  report module through `pilot/handoff.json`, or opens My flights without a hand-over), the data state ("synchronised
  4 min ago · 2 writes pending", the transport in use; a touch opens Settings, or the conflicts) and "Offline: working
  on this device's copy"; four languages, Escape and ✕ close it. **Bug fixed**: after a screen with a back button
  (report from the map, then back) the header grew from 57 to 73 px and stayed so on returning to the map — the help's
  "←" paragraph rule (`.f-back`, 16 px of margin) also hit the header's back button; the rule is scoped to `p.f-back` and
  the header is now exactly one row of 57 px in every state. New CSS variables `--f-head-h`, `--f-vh`, `--f-view-h`,
  `--f-split-h`, `--f-pane-h`, and the frame sizes a fixed module itself in the dual view (the split main and the pane),
  so a module no longer copies "100dvh − 86 px − 44 px". The frame's fixed layout of a module root is now weightless
  (`:where()`): a module's own `display` wins without `!important`. `status: true` of `APP.tabs` is gone.
- **Flightlog: the flights without a report are published for the frame's "i" button** (`modules/flightlog/module.js`,
  `modules/flightlog/model.js`, `modules/flightlog/test/pending.html`; SPEC § 4, INTEGRATION § 5, DECISIONS) — the module
  writes `cache/flightlog/pending.json` (`{ schema: 2, updated_at, flights: [{ date, dep, arr, registration, source, handoff }] }`,
  cache policy, device only, never synchronised): the flights without a report that it already finds (website log, IVAO /
  VATSIM sessions), newest first, five at most, within the last 30 days, `source` being `website`, `ivao` or `vatsim`;
  an empty array when nothing is pending. It is written through `ctx.data` at mount and each time the list is
  refreshed (reports saved or received, website log changed, network read), and only when the flights change. The frame
  reads it to draw its "report to write" lines; each entry carries the `handoff` (`family`, `values`) that the module's "Write the report" action hands to report, built by the same function, so the frame can write `pilot/handoff.json` itself and open `#report?from=flightlog`. One rule decides "without a report" (the "Without report" filter, the
  tile and the record); no screen change.
- **Changed — Fuel: the first tab is called "Quote"** (`modules/fuel/module.js`; SPEC § 9, INTEGRATION, DECISIONS, help ×4)
  — "Préparer / Plan / Planen / Preparar" becomes "Devis / Quote / Berechnung / Cálculo", because "Prepare" is now the name
  of the frame's bottom tab. The message "No OFP on this device" names the new tab.

- **Fixed — Fuel: the level decision no longer spikes at the plan's level, and its fuel axis follows the displayed unit**
  (`modules/fuel/levels.js` `requoteSeries`, `modules/fuel/module.js`, `modules/fuel/test/levels.html`; SPEC § 3 and § 9,
  INTEGRATION, DECISIONS, help ×4, BUGS ×2) — on a route with level steps ("FL160→090→110→070"), the fuel and time curves
  jumped at the plan's level and made false optimums, because that one point was quoted with the route's steps and its
  neighbours as flat flights. Every level, the plan's included, is now a flat flight at that level; the plan's real quote
  (with the steps and the plan's wind) is a diamond on both curves with its own legend line ("Plan: FL160, 856 kg, 0:54").
  The fuel axis and its unit label are in the displayed unit (kg or lb), not the sheet's.

- **Map: the screen is fixed — one-line toolbar, full-height map, the data block as a three-position sheet, no page
  scroll** (`modules/maps/module.js`, `modules/maps/test/index.html`; SPEC § 4, INTEGRATION § 2 ter and § 6, DECISIONS,
  help ×4) — the Map module declares the frame's `meta.fixed`: on a phone and on a screen the page no longer scrolls
  and nothing slides under the header (the "scroll bar and artefacts in the header" of the bug report). From top to
  bottom: a 44 px toolbar (flight selector, Edit the route, Recentre and the map mode as icon buttons; the title is gone,
  the tab bar or the rail names the screen), the flight's information line, the map taking all the rest, and the **data
  block as a sheet** with a drag handle and three heights: collapsed (its title line only), normal (38 % of the view on
  a phone, 35 % on a screen) and expanded (70 %); the profile, the airspaces list and an aerodrome's reporting points
  scroll inside it, the map resizes with it and keeps the route framed unless the user has moved it. A tap on the handle
  collapses the sheet or brings it back; the keyboard moves it too. The airspaces and reporting-point contents open the
  sheet when it is collapsed. The dual-view pane and the `#maps?tune=1` tuning page (which scrolls inside the root) work
  as before. The sheet accepts a content that draws itself (`openData(kind, key, title, build(w, h, el))`), ready for the
  atmosphere cross-section. A map resize was wrongly taken for a gesture of the user (the route was no longer reframed
  by a live update): fixed.

- **Frame: orientation locked to portrait for now** (`frame/manifest.webmanifest`, `frame/app.js`; SPEC § 3.6,
  DECISIONS) — effective when the application runs installed (manifest, `screen.orientation.lock`); a browser page is
  not locked. The landscape layout of the map and atmosphere screens is to decide (specification § 7.1).
- **Frame: the phone's bottom tab bar, tabs as groups of modules, flight status line, fixed view** (`frame/app.js`,
  `frame/frame.css`, `frame/index.html`, `frame/lib/icons.js`, `frame/design/*`; frame SPEC § 3.1 and INTEGRATION § 9,
  design SPEC, DECISIONS, help intro ×4) — on a phone (760 px or less) the menu button and the drawer are gone: a bar
  at the bottom, **Prepare · Map · Report · Flights · Settings** (Préparer · Carte · CR · Vols · Réglages, four
  languages), an icon above a one-word label, 56 px plus the device's safe area, 44 px targets; the selected tab changes
  form (filled icon on a soft pill, label in the accent). A tab is a group of modules (`APP.tabs`; Prepare = fuel +
  atmosphere, a module not registered yet is skipped): it stays selected while any module of its group is shown, a
  touch returns to the last one shown, and a row of sub-tabs above the module switches inside a group of two or more.
  Website and the example module belong to no tab (still reachable by address; the rail of the screens lists every
  module as before). A status line tops the Prepare tab while a flight is started ("Flight in progress › Map", one
  touch to the map, "Hide" for the session). A module may declare `meta.fixed: true` for a view that takes the whole
  height between the header and the bar with no page scroll (the map's lot will use it). `ctx.tab` gives a module its
  group. The four mock-up designs (metro, swiss, cupertino, material) each style the bar in their own sheet; sticky
  result bars and notifications sit above it.
- **Map: the airspaces and the reporting points move to the data block, short codes, thresholds corrected by the frame's
  size** (`modules/maps/module.js`, `modules/maps/render.js`; SPEC, DECISIONS, help ×4) — the map view is fixed, the map
  then the data block: the airspaces list ("n airspaces at this point") and an aerodrome's VFR reporting points (points,
  VAC sequences, instructions) are no longer cards over the map but open in the data block under it, replacing the
  vertical profile while open (header line with ✕; closing brings the profile back; the block keeps the profile's height
  rule and scrolls long content; on a phone the page scrolls to bring it into view, the map never moves). On the map a
  reporting point shows only its short code ("NA", "E", "SE"); the long name stays in the tooltip and the list. The
  display thresholds now compare an effective zoom: the zoom (after the Complexity slider) corrected by
  log2(mean of the frame's height and width / 900 px), so a phone or a pane of the dual view shows fewer elements than a
  laptop at the same map zoom (shown on the tuning page next to the real zoom); replaces the former fixed step under 600 px.
- **Map: the airspaces card on a phone** (`modules/maps/module.js`; SPEC, DECISIONS, help ×4) — "n airspaces at this
  point" no longer fills the map nor hides under the buttons: its own layer above them, the lower 45 % of the frame on
  a phone (level block beside the scrolling list, ✕ fixed), 320 px at the tap point on a screen; a tap on an empty spot
  closes it (✕ and Escape too), a drag or the wheel leave it; the aerodrome's card is unchanged.
- **Fuel: opens on the Plan, compact result bar on a phone** (`modules/fuel/module.js`; SPEC, INTEGRATION, DECISIONS,
  help ×4) — the module always opens on the Plan (the Sheets screen by its tab or `#fuel?view=sheets`, the last screen
  is no longer kept); the sticky result takes about half the height at 390 px (192 → 104 px): context on one line
  ("Block · FL060→090→110→070 · wind ARPEGE FL060", full text on touch), the figure one size smaller, three one-line
  tiles Trip / Time / TOD.
- **Design: "Material" (Material Design 3) mock-up, pending decision** (`frame/design/tokens.css`, `frame/design/material.css`,
  `frame/design/demo_metro.html`, `frame/app.js`, `frame/frame.css`, `frame/index.html`, `frame/sw.js`; design SPEC,
  DECISIONS) — a fourth retained design in Settings › Design, built like the others (token set first, few frame rules):
  tonal surfaces (page, cards, fields), a muted blue-violet primary checked at 4.5 : 1 as text on every surface, day and
  night, pill buttons, 1 px outlined fields that turn 2 px on focus, underlined tabs, steps as tonal chips, a top app bar on
  the page surface, a navigation drawer on a phone and a navigation rail on a screen (active indicator tinted with the
  module's colour), two elevation levels only. System fonts (Roboto when installed). The demo page takes
  `?design=material`. The other designs are unchanged; the rules left out because three other mock-ups already carry them
  are listed as token / primitive candidates.
- **Design: "Swiss" and "Cupertino" mock-ups, pending decision** (`frame/design/tokens.css`, `frame/design/swiss.css`,
  `frame/design/cupertino.css`, `frame/design/demo_metro.html`, `frame/app.js`, `frame/frame.css`, `frame/index.html`,
  `frame/sw.js`; design SPEC, DECISIONS) — two more designs in Settings › Design, built like Metro (token sets first,
  few frame rules): Swiss, the International Typographic Style (grid and air, black / white / grey, one signal red, radius 0,
  rules instead of cards, small spaced capitals, tabular figures) and Cupertino, the iOS Settings look (grey page, white
  grouped cards, system blue, segmented tabs, grouped lists with chevrons). System fonts only. The demo page takes
  `?design=metro|swiss|cupertino`. The other designs are unchanged; open points are listed for decision.
- **Design: "Metro" mock-up, pending decision** (`frame/design/tokens.css`, `frame/design/metro.css`, `frame/design/demo_metro.html`,
  `frame/app.js`, `frame/frame.css`, `frame/index.html`, `frame/sw.js`; design SPEC, DECISIONS) — a fourth design, picked
  in Settings › Design: flat colour blocks, square corners, system fonts, big light page titles, verb blocks in the
  drawer and a rail on a screen, one landmark colour per module (`--sog-module`, in every design, visible only in
  Metro). The other designs are unchanged pixel for pixel; the frame amendments it shows are listed for decision.
- **Technical debt, map module** (`docs/technique/DETTE_TECHNIQUE.md`, new section) — five findings of the user on 23 October:
  the map stops at the antimeridian; the aerodrome card sometimes misplaced and impossible to close; SFC–UNL volumes
  drawn; a tap on an empty spot does not close the card; VFR text written over the map. Each with its cause and what to do.
- **Atmosphere module** (`modules/atmosphere/`: SPEC, INTEGRATION, DECISIONS, ROADMAP; `frame/app.js`; bench
  `modules/atmosphere/test/weather_store.html`) — the atmosphere along the current flight, born as the `labs/atmosphere`
  page (which now forwards to `#atmosphere`), in the Préparer group (sub-tab on a phone, rail on a screen). A fixed,
  full-height view on the maps module's template: nothing between the header and the map, round buttons over the map in
  the frame's overlay layer (Layers; Flight, Details, Load, an altitude chip; the frame's full screen), the map at a
  chosen altitude (isobars, isotherms, cloud, wind; constant-altitude isobars aloft; the computed trajectory coloured by
  the temperature met) drawn with the maps module's technique — MapLibre and a vector overlay redrawn with every frame
  of the movement, its plain background without tiles (`MapsRender`, countries' outlines) — and a bottom block: the
  overall profile along the route (cloud by level, isotherms, inversions, indicative icing, density altitude, wind,
  terrain; requested, planned and computed paths) in the frame's three-position sheet, its handle line titled with the content and the flight in brief (never a status), always the current flight at opening (another flight is a marked, unsaved try; none: Prepare in Fuel or See the example; a load also reads the flight's own level, so the maps module's Weather cross-section is there), nothing written over the map (the tap hint is a notification), the local slice of any point tapped on the map or the profile, the
  summary (a compact list), aerodromes (METAR / TAF) and table behind "Details", the settings behind "Flight", the layers
  of the map and the profile in the same block. Profile and slice in SVG
  (vector lines, smooth fields); the profile is offered to the maps module's sheet as a pure `drawSection` (section.js). The map
  base is the maps module's (`modules/maps/lib/map_base.js`), the bottom sheet the frame's (`frame/lib/sheet.js`);
  touch gestures are kept on the map alone, the buttons answer a tap at once. Everything through the frame (`ctx.data` for the current flight, read only; `ctx.net`
  for Open-Meteo, METAR and TAF, the avwx key added by the frame; `ctx.aerodb` for a route text), four languages,
  `--sog-*` tokens. **Shared weather cache** `cache/weather/<model>/<cell>/<day>.json` (cells at the model's resolution,
  0.1° floor; valid for the model run; only the missing cells, days and variables are asked; a tally waits under 600
  calls a minute and stops before 10,000 a day; past days removed), written to move unchanged into the frame lot
  `frame/weather`. Nothing is asked when the screen opens; sampling as Fuel (50 NM, 24 places at most): a 370 NM flight
  costs ≈ 295 weighted calls once, then 0; a slice off the route, one place (≈ 10). **World synoptic** outside the
  flight's grid, never a call from the device: `/v3/weather/world/` built from NOAA GFS by `tools/build_world_weather.py`
  (GRIB2 read by `tools/grib2_lite.py`) in the Pages workflow — 5° grid, every 3 h to +72 h, one file per step,
  pressure, wind, temperature, cloud and its layers, CAPE, 0 °C isotherm, tropopause, jet stream, precipitation,
  visibility; schedule every 6 h — drawn when the view leaves the grid (jet and convection layers), the handle's title
  saying what is shown, every value at a tapped point outside the grid. **Flight date slider** under the handle (0 to
  +72 h): the cross-section, the map and the world synoptic follow, nothing asked; "Load" reads every day it can
  reach. The slider starts from the shared flight's date (`planned_at`); in landscape the cross-section scrolls instead of being cut. No border between the flight's grid and the world: one computation at the map's altitude (the publication carries 11 pressure levels), jet and convection drawn everywhere, the flight's grid relaxed into the world over its outer quarter. The map goes round the world east or west, the flight on every copy. Routes across the date line
  (Siberia → Alaska) on continuous longitudes: sampling, grid, framing, cross-section and drawing follow the route.
- **Map: no town named twice, ETA never over an airfield** (`modules/maps/module.js`, `render.js`; SPEC, DECISIONS,
  help ×4) — the base map's own place names are hidden while our towns are drawn (shown again otherwise); a point's ETA
  is placed with the route labels, under its name, before the aerodromes.
- **Map: cards that stay, reporting points as targets** (`modules/maps/module.js`, `render.js`; SPEC, DECISIONS, help ×4)
  — the aerodrome's card and the airspaces card stay open (✕, Escape) while the map moves; another aerodrome replaces
  it; a tap on a reporting point opens its aerodrome's card with that point first; the airspaces card from one
  airspace on ("1 airspace at this point").
- **Report: times in UTC** (`modules/report/module.js`; INTEGRATION, DECISIONS, help ×4, website SPEC) — a new report
  is marked `timeline.tz = "Z"` with UTC times; an older one is shown converted ("entered 18:30 local") and
  rewritten in UTC only when saved.
- **Frame: the first screen no longer waits for the network** (`frame/app.js`, `frame/store/frame_data.js`,
  `frame/store/transport_launcher.js`; SPEC, INTEGRATION, DECISIONS) — the airline's settings are read in the
  background, and a repository's first tree is read once for everything that needs it. On a phone at Fast 3G, the
  first GitHub opening shows Fuel's fields at 0.8 s instead of 3.4 s.
- **Fuel: first screen sooner** (`modules/fuel/module.js`; DECISIONS) — Fuel shows its fields from what the device
  has, says "Loading…" while the aircraft and sheets arrive, then completes the quote; nothing is written in
  between.
- **aerodb: light index of the aerodromes** (`frame/aerodb/aerodb.js`, `shared/sia_base.js`, `modules/fuel/module.js`;
  SPEC, DECISIONS) — the base's publication writes `aeroindex.json` per zone (ICAO aerodromes: code, name, position,
  elevation, runway axis; France 31 KB instead of 328 KB), read to resolve a route and for Fuel's corridor: first route
  entered in 4.0 s instead of 5.7 s (Fast 3G); a base published before reads as before.
- **Report, My flights, Website: times shown in UTC** (`modules/report/module.js`, `modules/flightlog/module.js`,
  `modules/website/module.js`; DECISIONS) — "16:59Z", with the device's time in brackets at the engine start.
- **aerodb: Little Navmap follow-up only with a launcher** (`frame/aerodb/aerodb.js`; DECISIONS) — a phone no longer loads
  `lnmperf.js` (27 KB) at each opening.
- **Fuel: times in UTC** (`modules/fuel/module.js`; DECISIONS, help ×4) — "16:57Z", with the device's time in
  brackets at the departure, the planned take-off and the planned arrival.
- **Map: times from `frame/lib/time.js`** (`modules/maps/module.js`; SPEC, help ×4) — ETA, planned position and wind
  forecasts in UTC ("14:52Z"), the local time in brackets beside departure and arrival only.
- **Frame: smaller installation, UTC times in Settings** (`frame/sw.js`, `frame/settings/settings.js`; DECISIONS) — the
  Little Navmap and AAR helpers are kept offline the first time they are used, not at installation; the
  Synchronisation card shows its times in UTC with Z.
- **Map: lighter installation, started flight** (`modules/maps/module.js`; SPEC, INTEGRATION, DECISIONS) — the country
  outlines of the plain background (350 KB) are loaded at their first use (kept ahead only when MapLibre is not
  cached): installation 2,420 → 2,072 KB; a position from before the start (the previous flight's) is ignored; while
  taxiing the planned aircraft stays at the departure aerodrome, on the ground.
- **My flights: filters from the last visit shown** (`modules/flightlog/module.js`; DECISIONS, help ×4) — a chip
  "1 year · LFRS ✕" recalls and removes them; a report without times says so on its "—".
- **Fuel: no default aircraft** (`modules/fuel/module.js`; SPEC, DECISIONS, help ×4) — a new flight takes the last
  aircraft chosen on the device, shown first in the search; with none, the quote waits for a choice.
- **aerodb: aircraft registry read in parallel** (`frame/aerodb/aerodb.js`, `registry.js`; SPEC, DECISIONS) — the
  types base and every source of the registry (sheets, V2 fpdb, fleet, reference) are asked at once instead of one
  after the other: first GitHub screen 7.46 s → 5.70 s (CPU ×4, Fast 3G).
- **My flights: the time of a report with only its engine start** (`modules/flightlog/model.js`; DECISIONS) — the
  detail shows the engine start when there is no off-block nor take-off time yet.
- **Report: the Mission step says "to check" until you open it** (`modules/report/module.js`; DECISIONS, help ×4) —
  a new report no longer shows the Mission step as done when its family and series were only taken by default.
- **Fuel: the level decision gives the quote's figures** (`modules/fuel/module.js`; SPEC, DECISIONS, help ×4) — each
  level of the curve is worked out like the quote, with the forecast wind at that level; at the chosen level both
  say the same. Start texts corrected (taxi until when, where the real position comes from).
- **Frame: header, positions, refused writes, times** (`frame/app.js`, `frame/frame.css`, `frame/store/frame_data.js`,
  `frame/store/transport_launcher.js`, `frame/lib/time.js`, `tools/launch.py`; SPEC, INTEGRATION, DECISIONS):
  - on a phone the header never gets wider than the screen;
  - a new flight no longer shows the previous one's position;
  - a write the launcher refuses for good leaves the queue for the conflicts ("take it back or set it aside")
    instead of blocking synchronisation;
  - the frame's error messages follow the application's language;
  - every time is in UTC with Z (`frame/lib/time.js`);
  - modules learn whether the map is beside them (`ctx.layout`).
- **Frame: lighter start** (`frame/app.js`, `frame/index.html`, `frame/sw.js`, `frame/help/help.js`; SPEC § 3.1 and
  § 3.6, DECISIONS). Settings, help and roadmap load the first time their screen opens; a module's help loads after
  the module. The help is kept offline in the application's language only. On a phone at Fast 3G the menu appears
  1.3 s sooner, and the installation is 168 KB lighter.
- **Map: beacons in the same place** (`modules/maps/lib/aero_symbols.js`, `render.js`, `module.js`; SPEC, DECISIONS,
  help ×4) — a VOR (or TACAN, DME) keeps its symbol and label over an NDB, an NDB over an ILS; the ILS is drawn
  underneath and, when it shares the VOR's place, named in the VOR's new tooltip ("also here: ILS 25L BG 109.9").

### Fixed

- **Map studio and Flight maps: every town name twice on an OpenFreeMap or VersaTiles background**
  (`apps/cpco/map_parser.html`, `apps/planner/map_planner.html` rebuilt) — with "Town labels" ticked, the studio wrote its
  own names over the place names of the vector background. The background's place layers (`place`, `place_labels`) are
  now hidden while "Town labels" is ticked, and shown again when it is not.

## [6.0.0-alpha.1] — 2026-10-23

First alpha of the V3 **Pilot application** (`frame/`, `modules/`), published under `/v3/frame/` on the same site
as the V2 suite and served by the same launcher. One frame: a data layer with a local cache, offline writes and
batched synchronisation (this device only, the workstation's launcher, a GitHub repository), an installable
offline app, a verb menu, usage levels, in-page help, a network relay, real position during a started flight
(simulator through the launcher, GPS, IVAO / VATSIM), the launcher opened to a tablet on the local network. Six
modules: Fuel (five steps in the pilot's order, weather of the route corridor, winds aloft, density altitude,
editable route, "Start the flight"), Map (en-route charts with modes, layers, tunable zoom thresholds, route
editing on the map and the profile, wind barbs, VFR reporting points and VAC sequences, flight in progress),
Report (three steps, sixteen families, prefill, "Save and record on the site"), My flights, Site (log and fleet
by paste or through the launcher, airline card) and Settings (identity, usages, access, backup, offline data by
zone, level, keys, pilot configuration export / import, "Join the airline" wizard, administration links). One
aircraft registry (types, performance sheets, fleet, reference; `.lnmperf` kept in sync both ways), a Pilot manual
and two tutorials in four languages, a roadmap in the app. Alpha: data formats and screens may still change.

### V3

- **Map: a VFR reporting point drawn once** (`modules/maps/module.js`, `render.js`; SPEC, DECISIONS) — a VAC point
  matched with a base VRP (by id, or within 0.6 NM) is drawn once, at the base's position with its name, the VAC code in
  the tooltip; the VRP layer no longer redraws the points of a highlighted aerodrome.
- **Maintenance: VFR card below the Expert level** (`shared/maintenance_page.js`) — under level 4, a line says where
  the "VFR reporting points (VAC)" card is ("Expert level, menu ☰ › Level") instead of nothing; the card follows the
  page's mode (`GH_LITE`).
- **Frame: without a trigram, nothing leaves the device** (`frame/store/frame_data.js`, `frame/app.js`,
  `frame/index.html`, `frame/frame.css`, `tools/launch.py`; SPEC § 2 and § 3.5, DECISIONS). Documents written
  without a trigram (`pilot/ANON/`) stay on the device, and nothing is sent or exchanged until the trigram is set. A
  "Trigram?" button opens Settings. Once the trigram is set, those documents move under it, including a
  `pilot/ANON/` already in `data/`, which then empties itself. The launcher refuses a batch with no author.
- **Fuel › Sheets: the airline's types without a sheet, by category** (`modules/fuel/module.js`; SPEC, DECISIONS,
  help ×4) — as in V2, each type the airline uses (fleet, reference) without a sheet is listed "performance to fill in"
  with "Create the sheet", and the list is sorted by category (helicopters first): the company helicopters (EC45,
  AS65, NH90…) show again.
- **Launcher: security review of the local-network access** (`tools/launch.py`, `tools/lan_access.py`,
  `frame/app.js`, `frame/settings/settings.js`; SPEC § 3.10, DECISIONS, settings SPEC, help ×4) — the data batch no
  longer accepts a path that leaves `data/` (Windows `\`, `:`, `..`, junctions) nor a page, SVG or XML file. The
  relay follows a redirect only to an allowed host and reaches public addresses only. A pairing code works once and
  lasts 10 minutes, and 30 wrong codes in an hour close pairing. Only the main address is opened by default. Each
  paired device can be forgotten on its own. Body size and batch length are bounded.
- **Settings: copying on a paired tablet** (`frame/settings/settings.js`, `join.js`, `frame/sw.js`) — the
  diagnostics, the configuration link and the username copy through `frame/lib/clipboard.js`, so they work over http;
  when nothing can copy, the text is shown selected and the notification says to copy it.
- **Copy and paste on a tablet served by the computer** (`frame/lib/clipboard.js`, fuel, report, website) — copying
  works over http too (or the text is shown selected to copy it yourself); "Paste from the clipboard" only
  appears where the browser allows it.
- **Settings: card "Computer access"** (`frame/settings/settings.js`, settings SPEC, DECISIONS, help ×4) — on the
  computer that serves the page: open or close the local-network access, the address with its QR code, the pairing
  code and its limits, the paired devices and "Forget the devices", a "trusted network only" warning; the
  Diagnostic shows the page's secure context, offline use and the launcher's computer. Help: "The tablet next to the
  simulator".
- **Map: an aerodrome's reporting points from the base, aeroplane / helicopter colours** (`modules/maps/module.js`,
  `render.js`, `tools/vfr_import.py`; SPECs, DECISIONS, help ×4) — the aerodrome's card and hover always list the
  published base's VRPs, the VAC compilation adds to them ("VAC sequences: not imported" without it); VFR reporting
  points in black for aeroplanes and green for helicopters ("-H-" in the base) everywhere; the import also matches the
  helicopter points.
- **VFR points: restricted use and manual vertices** (`tools/vfr_import.py`, `modules/maps/module.js`; SPECs,
  DECISIONS) — the import keeps a point's usage restrictions and a manual vertex's accuracy; the aerodrome's card lists
  the restricted points (dashed ring on the map) and how many vertices were placed by hand; the GeoJSON written next to
  the compilation is not needed (same content).
- **Launcher: the Pilot application on a tablet or a phone of the local network** (`tools/lan_access.py`,
  `tools/launch.py`, `frame/app.js`, `frame/store/frame_data.js`, `frame/store/transport_launcher.js`,
  `frame/index.html`, `frame/frame.css`, `.gitignore`; SPEC § 3.10, DECISIONS, INSTALL) — `lancer.cmd --lan` (or the
  computer's Settings) also serves the computer's private addresses until the launcher stops. A device pairs once
  with a 6-digit code shown in the console, and then works like the computer: its `data/`, the simulator's position,
  the relay. It gets only the Pilot application's routes, and addresses that are not private are refused. On the
  device (http): a "Launcher on <computer>" badge, no offline use (said in Diagnostic), the data layer's own SHA-1.
- **Settings: the right GitHub token for the repository's owner** (`frame/settings/config.js`, `join.js`,
  `settings.js`) — the export records whether the repository belongs to a user or an organisation; a user's repository
  gets a classic `repo` token (prefilled link, the account-wide reach said plainly), an organisation's the fine-grained
  token; "Test" accepts both.
- **Map: VFR points, format 2** (`modules/maps/module.js`; SPEC, DECISIONS, help ×4) — a route reviewed by hand follows
  its interpreted track (with its manual vertices), a one-way route gets an arrow, the card gives the analysis status
  and notes, and each route its name, runways and conditions; no line is drawn to the aerodrome's centre any more.
- **Report VFR in the suite** (`tools/report-vfr/`, `tools/vfr_import.py`; aerodb SPEC, DECISIONS, admin manuals ×4) —
  the workstation tool that compiles the VAC charts (`refresh_vfr.py`, `vfr_core.py`, manual analyses in
  `interpretations/`; optional `pypdf`, a clear message without it, an English README); the import now reads its format
  2 (named routes with direction, runways, conditions and interpreted geometries, manual vertices, analysis status per
  aerodrome) as well as the first one.
- **Settings: the right GitHub token for the repository's owner** (`frame/settings/config.js`, `join.js`,
  `settings.js`) — the export records whether the repository belongs to a user or an organisation; a user's repository
  gets a classic `repo` token (prefilled link, the account-wide reach said plainly), an organisation's the fine-grained
  token; "Test" accepts both.
- **Settings: "Join the airline" assistant and QR code** (`frame/settings/join.js`, `frame/lib/qr.js`,
  `frame/settings/settings.js`, `frame/help/help.js`, `frame/help/tutorial/`; SPEC § 5 and § 7, DECISIONS, help ×4) —
  the configuration link, file, Settings or welcome card open a seven-step assistant (configuration, account, invitation,
  token step by step, test with clear messages, network IDs, finish and synchronise), resumable on the device; the
  administrator's export lists their steps and shows a QR code of the link (pure JavaScript generator, checked by an
  independent decoder); tutorial "Join the airline" (en, fr).
- **Fuel: flight date in one touch** (`modules/fuel/module.js`; SPEC, DECISIONS, help ×4) — "+30" next to the
  flight date sets the flight 30 min from now (30 more at each press), "Now" goes back to the current time; the
  weather and the winds aloft follow.
- **Map: VFR reporting points of an aerodrome** (`modules/maps/module.js`, `render.js`; SPEC, INTEGRATION, DECISIONS,
  help ×4) — hovering an aerodrome lights up its reporting points and the sequences of its VAC charts; a tap pins it,
  zooms in on its points and opens its card (sequences, then the VAC instructions page by page), all marked "to be
  checked", never as a published route; departure and arrival shown in VFR mode. The Edit mode now writes the flight
  through `frame/lib/current_flight.js` (only `route` and `level`).
- **Frame: what the launcher exposes under `sia/` written down** (SPEC, DECISIONS) — `sia/base/` and `sia/vfr/` only,
  never the raw SIA sources.
- **Settings: token how-to always shown at import, account sign-up first** (`frame/settings/settings.js`,
  `frame/settings/config.js`) — the how-to is visible (folded) even on a workstation already following the repository;
  it starts with the account sign-up link and, for GitHub, the invitation to accept.
- **aerodb: VFR reporting points of the VAC charts** (`frame/aerodb/aerodb.js`, `tools/vfr_import.py`,
  `tools/launch.py`, `shared/maintenance_page.js`; SPEC, DECISIONS, admin manuals ×4) — Settings › Maintenance ›
  Aeronautical data, "Import a VFR compilation (VAC)…" (Expert, launcher): the `vfr-compiled.json` of
  `tools/report-vfr/compile_vfr.py` is checked strictly, its points matched with the base's VRPs, a plan shown, then one
  file per aerodrome written to `sia/vfr/` of the data repository (points, sequences, instructions by page) with an
  index, and synchronised; `aerodb.vfrRoutes(icao)` and `vfrIndex()` read them, marked as candidates to be checked.
- **Frame: the actual position written through the shared current-flight merge** (`frame/app.js`, `frame/sw.js`;
  SPEC § 3.2, § 3.9, DECISIONS) — the position service uses `frame/lib/current_flight.js` like fuel and report: only
  `progress.actual` is replaced in the record re-read just before.
- **fuel, report: the real position of the flight is no longer erased** (`frame/lib/current_flight.js`,
  `modules/fuel/module.js`, `modules/report/module.js`) — each module rewrites only its own part of the current
  flight; fuel no longer rewrites it after every position update.
- **Map: all the airspaces at a point** (`modules/maps/module.js`; SPEC, DECISIONS, help ×4) — a tap where several
  airspaces overlap opens a card with a block of levels like the vertical profile (one numbered column per airspace,
  floor to ceiling) and the numbered list in SIA notation, instead of "TMA … (+3 more)".
- **Map: source of the actual position** (`modules/maps/module.js`; SPEC, INTEGRATION, help ×4) — the in-flight line
  ends with "source: GPS / network / IVAO / VATSIM / X-Plane / Little Navmap" (frame lot 16); an unknown value shows
  nothing.
- **Map: tuning page boxes, map size, Layers panel** (`modules/maps/module.js`, `render.js`; SPEC, DECISIONS, help ×4)
  — a "drawn" box in front of each line of `#maps?tune=1`, the same as the Layers panel's layer (two new layers:
  airspace names, airway names), "Reset the boxes" and "Reset the sliders"; the MapLibre background always the size of
  its frame (also after a hidden or frozen tab, a style change, tiles still loading); the Layers panel's "Reset all" no
  longer covers the Complexity slider.
- **Frame: `keepScroll` shared** (`frame/lib/dom.js`, `frame/sw.js`; SPEC § 3.9, INTEGRATION § 6, DECISIONS) — one
  helper for the modules: a render keeps the scroll of the page and of every scrolling container, and the field
  being typed in (value, focus, selection); fuel, report and flightlog take it instead of their own copies.
- **fuel, report, my flights: the page no longer jumps to the top** (`modules/fuel/module.js`, `modules/report/module.js`,
  `modules/flightlog/module.js`) — a screen redrawn because the flight changed elsewhere keeps where you were.
- **Frame: the flight simulator as the first source of the actual position** (`tools/sim_position.py`,
  `tools/launch.py`, `frame/app.js`, `frame/frame.css`; SPEC § 3.2, DECISIONS) — when the launcher serves the page,
  a started flight follows X-Plane 12 (web API) or Little Navmap (web API) every 5 s, before the device's GPS and the
  IVAO / VATSIM session; the header badge says "X-Plane" or "Little Navmap"; ports set in `tools/.sim.json`
  (local), local machine only.
- **Settings: Administration card** (`frame/settings/admin_links.js`, `frame/settings/settings.js`, `frame/frame.css`,
  `frame/index.html`, `frame/sw.js`; SPEC § 6, DECISIONS, help ×4) — at the Full level, one card gathers the map
  threshold tuning, the roadmap, the diagnostics, the benches (workstation with launcher only) and the workstation's V2
  administration pages (with a launcher), each with a sentence, from a declared list.
- **Map: narrow pane** (`modules/maps/module.js`, `profile.js`, `lib/vertical_profile.js`; SPEC, DECISIONS, help ×4) —
  one intermediate step in the IFR thresholds (TMA, CTA, R and TSA shapes before names, airways and MORA) and one step
  less when the map frame is under 600 px; vertical profile labels never overlap (airspaces entered first, the others
  counted in "+n"); in Edit mode a point is added only after "+" or a 500 ms press, a simple tap shows the tooltip.
- **Frame: "Reload" after a new version works** (`frame/sw.js`, `frame/app.js`; SPEC, DECISIONS) — the "new version"
  notice no longer comes back after every load (the page was checked at another address than its copy); "Reload" lets
  a waiting service worker take over or fetches every copy again, then reloads, with no Ctrl+Shift+F5. The "Try" page
  (example module) leaves the Pilot application; developers open it with `localStorage['sogFrame:dev'] = '1'`.
- **Settings: pending writes listed** (`frame/settings/settings.js`, `frame/frame.css`; SPEC, DECISIONS, help ×4) — the
  Synchronisation card lists the writes waiting (`FD.status().queue`: path, module, time, ✕ for a deletion), newest
  first, and shows while some wait even without an exchange.
- **Frame: no more "1 pending" for ever on a workstation** (`frame/store/frame_data.js`,
  `frame/store/transport_launcher.js`, `frame/app.js`) — with the launcher, a write goes into `data/` within seconds
  instead of waiting ten minutes; the sync button's tooltip lists what is waiting (file, module, time) and the last
  error.
- **aerodb: helicopter estimates** (`frame/aerodb/aircraft.js`; SPEC, DECISIONS) — a helicopter gets a practical
  ceiling (12,000 to 20,000 ft by class instead of an aircraft-like value) and a low economical level (3,000 ft) for
  fuel; the launcher no longer reports a missing types base when the one published in the data repository is there.
- **Frame, lot 15: the actual position during a flight** (`frame/app.js`, `frame/frame.css`, `frame/index.html`) —
  while a flight is started, the app follows the device's GPS (allowed by a tap on the header badge) or, without GPS,
  the pilot's IVAO or VATSIM session, and writes the actual position into the current flight for the Map; the badge
  shows the source.
- **Settings: configuring a pilot** (`frame/settings/config.js`, `frame/settings/settings.js`, `frame/help/help.js`,
  `frame/index.html`, `frame/sw.js`; SPEC § 5, DECISIONS, help ×4) — on a workstation, "Export a configuration for a
  pilot…" makes `sog-config-<TRI>.json` (schema `sog-config/1`: airline, data repository without credentials, trigram,
  usages, token how-to per host in four languages, never a token) and a one-tap link `#settings?config=…`; on the
  pilot's device, the link, "Import a configuration…" or the welcome card show it, ask the network IDs and the token,
  test the access, then set identity, usages and access, synchronise once and offer Offline data.
- **fuel: the wind aloft stays while a new forecast loads** (`modules/fuel/module.js`; docs) — no more silent switch
  to the surface wind; a missing forecast is said; an estimated ceiling is called so.
- **Map, lot 8: started flight** (`modules/maps/module.js`; SPEC, INTEGRATION, DECISIONS, help ×4) — planned and
  actual positions on the map and the profile, the difference (ahead or late, off the route, altitude), ETA of each
  point close up, a "Follow" button, and the states without a position or with a stale one.
- **Frame: no "Map" toggle on Settings or Help** (`frame/app.js`, `frame/frame.css`) — the dual view only applies to a
  module: Settings, Help, the roadmap and the conflicts take the whole area, and the Map comes back with the module.
- **report: saving the report ends the started flight** (`modules/report/module.js`; docs) — fuel goes back to
  planning and My flights drops "in progress"; the shutdown time is no longer taken from fuel.
- **fuel: starting a flight redoes the weather and the quote for now** (`modules/fuel/module.js`; docs) — and says
  what changed (wind, block, arrival); "End the flight" is gone: a started flight ends with its report, or is
  cancelled.
- **fuel: ending a flight and its planned progress** (`modules/fuel/progress.js`, `module.js`; `test/progress.html`,
  docs) — "End the flight" and "Cancel the start"; the result shows how long the flight has been going; the Departure
  step shows where the flight should be — time over each point, distance and fuel remaining — minute by minute, and
  the map gets it.
- **Map, lot 7b** (`modules/maps/`, `contours.js`; SPEC, INTEGRATION, DECISIONS, help ×4) — each element of the
  map has its own zoom range per mode (VRP very close, CTR close, TMA in a medium view, FIR from afar), tuned by the
  administrator on `#maps?tune=1` with the map redrawn live and stored in `airline/map_profiles.json` (studio
  format); a "Complexity (trial)" slider shifts them all; Topo and VFR show contour lines close up, computed from the
  relief tiles.
- **Map, lot 7a** (`modules/maps/`; SPEC, DECISIONS, help ×4) — one tooltip for hover, tap and click (follows the
  pointer, stays 5 seconds); map modes as icons; obstacle heights close up ("434 AGL (771)"); the map keeps the
  user's view after a route edit or a new quote, only "Recentre" or another flight reframes it.
- **Help, lot 4: the two tutorials** (`frame/help/help.js`, `frame/help/build_help.py`, `frame/help/tutorial/`,
  `frame/app.js`, `frame/sw.js`, `frame/frame.css`; SPEC § 6, DECISIONS) — "Prepare a flight" (Fuel's five steps) and
  "Write a report" (to the website and My flights), English and French, one 375 px capture per step taken by
  `tutorial/capture.py` on test data; reached from "Start with…" at the top of the manual and a welcome card at the
  first opening; the build checks them. The Fuel, Map, Report and My flights chapters are retranslated in English, German and
  Spanish.
- **Map, lot 6c: winds aloft** (`modules/maps/module.js`; SPEC, INTEGRATION, DECISIONS, help ×4) — wind barbs at the
  flight level along the route, at each point and every 50 NM, from Fuel's forecast; a tap or a hover gives direction,
  speed, temperature, level and forecast hour; a layer of their own.
- **my flights: the flight in progress** (`modules/flightlog/module.js`; docs) — a flight started in fuel and not yet
  reported shows first, with "Write the report".
- **Map: levels as in Fuel** (`modules/maps/`; SPEC, DECISIONS) — "FL060" from the transition altitude, "3 500 ft"
  below, through the shared `formatLevel`; relief and minimum altitudes always in feet.
- **report: more from the current flight** (`modules/report/module.js`; docs) — the card says everything it will take,
  and "Use" also fills the engine start time and the fuel at start from fuel, each marked with its source.
- **Map: free points** (`modules/maps/module.js`; SPEC, DECISIONS, help ×4) — a waypoint dropped away from any fix,
  beacon or airfield becomes a free point named by its coordinates (4530N00030E), for VFR and helicopters.
- **fuel: after the end-to-end pass** (`modules/fuel/module.js`, `frame/lib/route_text.js`, `winds.js`; docs) — the
  wind's source in the result, the ISA deviation at the planned level, one level notation (FL060 / 3 500 ft), a busy
  weather button, the start time cleared for a new departure and a diversion noted, the dual view kept when the
  flight starts on a wide screen, tighter Flight step; changing the departure or arrival no longer stacks aerodromes
  in the route text.
- **aerodb: one line per registration** (`frame/aerodb/registry.js`; SPEC, DECISIONS) — the aircraft search merges an
  aircraft's own sheet, fleet and reference entries into one line, and the chosen sheet always gives a quote: an own
  sheet without a fuel flow is completed by its type's sheet, else the estimate.
- **Map, lot 5e: refuelling and NAT tracks** (`frame/aerodb/aar.js`, `aerodb.aarTracks()` and `natTracks()`,
  `modules/maps/`; SPEC, DECISIONS, help ×4) — the CAM mode draws the air refuelling racetracks (France and the United
  Kingdom) with their outbound leg and name, and the day's NAT tracks with their levels; two layers of their own.
- **fuel: an aircraft without its own sheet uses its type's estimate** (`modules/fuel/module.js`) — it no longer
  borrows the first sheet of the list.
- **Map, lot 6b: levels on the profile** (`modules/maps/module.js`; SPEC, INTEGRATION, DECISIONS, help ×4) — in the
  Edit mode, drag a level up or down on the profile, or use − / + in a point's card (steps of FL10); the route text
  keeps the airways of the segments left unchanged (fuel's `frame/lib/route_text.js`).
- **fuel: airways kept when the points change** (`frame/lib/route_text.js`, `modules/fuel/module.js`;
  `test/route_text.html`, `INTEGRATION.md`, `DECISIONS.md`, `help/fr.md`) — editing the points (list or map) no longer
  erases the airways typed in the route, except on the legs that changed; the route text code is shared with maps.
- **Map, lot 6a: edit the route on the map** (`modules/maps/module.js`; SPEC, INTEGRATION, DECISIONS, help ×4) — an
  "Edit" mode: drag a waypoint onto a fix, a beacon or an airfield, tap one to insert it, tap a route point to remove
  it, undo the last gestures; each change is saved in the current flight (`by: 'maps'`) and Fuel redoes the quote.
- **Map, lot 5d: six map modes** (`modules/maps/`, `frame/lib/icons.js`; SPEC, INTEGRATION, DECISIONS, help ×4) — the
  user's mode selector (Auto, Low IFR, High IFR, VFR, Topo, CAM) replaces the preset list; Topo shows the terrain with
  a minimal overlay, CAM adds R / D / P, TSA / TRA / CBA and the low-flying network at all levels; the mouse tooltip
  stays 5 seconds after leaving a label and is lighter.
- **fuel: no error when leaving while the weather loads** (`modules/fuel/module.js`) — an answer arriving after you
  left Fuel is dropped quietly.
- **Frame: the header fits a phone in every language** (`frame/app.js`, `frame/frame.css`, `frame/index.html`) — on a
  narrow screen the sync button shows a short state (✓, number pending, ⟳, ✕), the full label staying in its tooltip;
  the page no longer gets wider than the window at 375 px.
- **Map, lot 5c: layers, hover, VFR in full** (`modules/maps/`; SPEC, INTEGRATION, DECISIONS, help ×4) — a Layers
  panel (airspace families, airways, beacons, airway points, VRP, obstacles, MORA, towns, graticule, alternate, "Around
  the route only"), kept per preset on the device; with a mouse, a light tooltip follows the pointer over airway and
  airspace names; the VFR map keeps TMA, CTR, R / D / P limits and VRP at every zoom (it went bare close up); close up,
  the whole view is drawn; TOC / TOD labels no longer cover route names; "Edit the route" opens fuel's Route step.
- **Frame, lot 14: help and settings over the current module** (`frame/app.js`, `frame/frame.css`) — the menu stays
  in place (it no longer scrolls away on long screens) with the current module marked; "?" and "⚙" are toggles:
  a second click, or Escape, closes help or settings and brings back the module exactly where it was (same step, same
  scroll).
- **fuel: winds and temperatures aloft** (`modules/fuel/winds.js`, `module.js`; `test/winds.html`, `SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`, `help/fr.md`) — the forecast by level along the route (Open-Meteo: Météo-France,
  ICON or GFS), shown point by point; with real weather, the quote's wind is the wind at the planned level; the real
  atmosphere at departure shows its inversions beside the density altitude chart; the map gets the winds for its
  arrows.
- **fuel: typing in the route is never rewritten** (`modules/fuel/module.js`; `DECISIONS.md`) — a field being typed in
  keeps its text whatever is redrawn or saved meanwhile; the route is tidied only when you leave it or press Enter.
- **report: the flight started in fuel comes first** (`modules/report/module.js`; `INTEGRATION.md`, `DECISIONS.md`,
  `help/fr.md`) — "Flight started at hh:mm" is offered before anything else, and no longer once its report is saved.
- **fuel: weather without a launcher** (`frame/lib/metar.js`, `modules/fuel/module.js`; `test/metar.html`, `SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`, `help/fr.md`) — on a phone the METARs come from metar.vatsim.net, decoded on the
  device, and the TAFs from avwx.rest with your own weather key; without a key the card says the TAF is unavailable
  and uses the METAR.
- **fuel: Plan in five steps** (`modules/fuel/module.js`; `SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`, `help/fr.md`) —
  Flight, Route, Weather, Quote, Departure, one at a time on a phone and all at once on a wide screen, the block fuel
  always in view; "Show the map" opens the map beside or on its own; "Start the flight" records the departure time
  and opens the map; the map's "Edit the route" lands on the route, ready to type.
- **fuel: a route changed on the map is quoted again** (`modules/fuel/module.js`; `INTEGRATION.md`, `DECISIONS.md`) —
  when another module writes the current flight, fuel keeps its route as written, recomputes distance, quote and
  climb / descent profile, and writes them back, live or the next time it opens.
- **aerodb lot 5b: Little Navmap files kept in step** (`frame/aerodb/lnmperf.js`, launcher routes
  `/__setup/lnmperf-folder` and `/__setup/lnmperf`, Settings card, `FrameData.noteConflict`; SPEC, INTEGRATION,
  DECISIONS, Settings help ×4) — on a launcher workstation, the performance sheets and the `.lnmperf` files of a chosen
  folder stay the same both ways: a changed sheet rewrites its file, a changed file updates the sheet, a new file
  becomes a sheet, a deleted file is written again; a value changed on both sides goes to the newest, the other is
  kept and a conflict is counted at the frame's button; a removed sheet's file is set aside in `_removed/`, never
  deleted. Checked at start, after each synchronisation and every two minutes. Fix: a kg sheet was exported to
  `.lnmperf` with its kg values in the pound fields.
- **flightlog: wide layout in the dual view** (`modules/flightlog/module.js`) — my flights lays out by its own width, not the window's,
  so it stays right in half of a wide screen.
- **report: wide layout in the dual view** (`modules/report/module.js`) — report lays out by its own width, not the window's,
  so it stays right in half of a wide screen.
- **Frame: a readable dual view toggle** (`frame/app.js`, `frame/frame.css`) — the "Map" button of the header was
  clipped to an icon; it is now a toggle with its label, readable in every design, with a "×" on the pane. Fuel and
  Report open the Map beside them by themselves from 1200 px wide until you choose, and your choice is kept.
- **fuel: the route text first** (`modules/fuel/module.js`; `SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`, `help/fr.md`)
  — the route is typed in a field that is always visible and tidied when you leave it (one line, levels as /F280,
  airways kept, unknown points named under it, ICAO coordinates read); distance and true track are shown with their
  source and typed only when the route does not resolve; the points list is folded below.
- **maps: a clearer flight map** (`modules/maps/render.js`, `module.js`; `DECISIONS.md`, `test/render.html`) — the route
  is the strongest line, with its labels larger than the aerodromes' and beacons', MORA and graticule quieter, beacon
  names dropped in the overview; every text reaches WCAG AA contrast by day and by night in the three designs, and
  the plain background stays dark at night.
- **Frame, lot 13: forecasts by pressure level** (`frame/app.js`, `tools/launch.py`) — api.open-meteo.com (winds and
  temperatures by level, no key) is reachable by the modules, relayed by the launcher or called directly.
- **Map, lot 5: charts that read like en-route charts** (`modules/maps/`; SPEC, INTEGRATION, DECISIONS, help ×4) —
  airway points (triangles and beacons) with their names, boxed airway names along the segment with minimum level,
  distance and tracks when zoomed in; three presets at the top left (Low IFR, High IFR, VFR) chosen automatically from
  the flight's level and kept per device; density by zoom (large airfields and airways from afar, everything close
  up); tooltips in AIP notation on airspaces and airways, by tap or by hover, also on the profile; live view on every
  change of the flight, with the levels held from route points (`alt_ft`) drawn as steps.
- **design: the dual view no longer squeezes three blocks into half a screen** (`frame/design/primitives.css`,
  `frame/frame.css`) — columns, grids and tables are decided on the width of the pane (container queries), not of the
  window: in the dual view Fuel or Report stacks its blocks while the Map keeps its half.
- **settings: weather key for TAF without a launcher** (`frame/settings/settings.js`, `frame/settings/help/*.md`;
  `frame/settings/SPEC.md`, `DECISIONS.md`, manuals rebuilt) — a "Weather key (TAF, avwx.rest)" card, with or without a
  launcher: METAR works without a key, TAF without a launcher needs a personal avwx.rest key, kept on the device only
  (never in a file, a backup or the repository, never shown again); Save, Test, Erase, link to the provider's sign-up
  page.
- **Frame, lot 12: airport weather without a launcher** (`frame/app.js`, `tools/launch.py`, `tools/csp_policy.py`) —
  the METAR comes from metar.vatsim.net (no key; relayed by the launcher when there is one), the TAF from avwx.rest with
  a personal key entered on the device (Settings › Keys), which the app adds itself and never keeps in a backup or in
  the repository.
- **fuel: weather along the route's corridor** (`modules/fuel/module.js`; `SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`,
  `help/fr.md`) — the "intermediate aerodrome" field is gone: every aerodrome within a settable distance of the route
  (10 NM by default) that reports a METAR or TAF is shown with its distance along the route, folded beyond two, and
  the real wind averages them leg by leg.
- **Frame, lot 11: back to the module you came from** (`frame/app.js`, `frame/frame.css`, `frame/index.html`) — a
  module opened from another (the Map's "Edit the route", "Write the report" of My flights, `?from=`) shows
  "← <that module>" in the header, which goes back to the same place.
- **fuel: editable route points and step levels** (`modules/fuel/module.js`, `model.js`; `SPEC.md`, `INTEGRATION.md`,
  `DECISIONS.md`, `help/fr.md`, `test/quote.html`) — the route's points as a list to reorder, remove or add to, with an
  optional level per point flown from that point on; the quote counts each step (its climb or descent, then the
  cruise at that level) and descends from the last one; levels written in a route (OFP or item 15) are read; every
  change goes to the map at once (`route.points[].alt_ft`).
- **fuel: ISA deviation from the departure METAR and a density altitude chart** (`modules/fuel/module.js`; `SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`, `help/fr.md`) — once the weather is read, the ISA deviation of the departure
  (temperature against the aerodrome's standard temperature) is proposed in one tap and kept in the quote settings; a
  folded chart shows the density altitude by ISA deviation and pressure altitude, with the sheet's ceiling and the
  pressure altitude where it is reached that day — the helicopter case.
- **report: the callsign from the current flight** (`modules/report/module.js`) — the aircraft chosen in fuel brings
  its registration and callsign into a report in one tap.
- **fuel: aircraft and sheets through aerodb** (`modules/fuel/module.js`; `SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`,
  `help/fr.md`) — the Aircraft block becomes one line with a search over every source (my sheets, the airline's fleet
  and log, published types, free code), each with its origin and the sheet that will serve it; the chosen
  registration and callsign go into the current flight; the Sheets screen reads and writes through aerodb's registry
  (each change stamped with its source); fuel no longer writes `planner/`, and its copy of the sheets logic is gone.
- **aerodb: `.lnmperf` export no longer blocked** by the registration and callsign fields added in lot 5a (Little
  Navmap has no such fields).
- **Frame, lot 10: dual view on a tablet or a wide screen** (`frame/app.js`, `frame/frame.css`, `frame/index.html`) —
  Fuel and Report can show the Map beside them (header button, address `#fuel?with=maps`, kept per module); a change of
  the flight plan in Fuel appears in the Map at once. Nothing changes on a phone.
- **settings: readable diagnostics** (`frame/settings/settings.js`, `frame/settings/help/*.md`; `DECISIONS.md`, manuals
  rebuilt) — Settings › About › Diagnostics shows the frame's diagnostic line by line (transport, sync, errors,
  repository tree, reference bases, aeronautical base), labels in four languages, and "Copy" puts the full JSON on the
  clipboard to paste in a message from the phone.
- **Frame: the aeronautical base appears on the phone in GitHub mode** (`frame/store/frame_data.js`, `frame/app.js`) —
  zones and aircraft pushed to the data repository after the app was opened are signalled at the next
  synchronisation, with no reload, and a read made before the first synchronisation looks at the repository's tree of
  the moment. The data layer gives a diagnostic (tree, references, last failed read, what aerodb sees) for the Settings
  screen. METAR / TAF only through the launcher (aviationweather.gov allows no direct call from a page).
- **fuel: aerodrome weather** (`modules/fuel/weather.js`, `module.js`; `SPEC.md` § 10, `INTEGRATION.md`, `help/fr.md`)
  — METAR / TAF of the departure, an intermediate aerodrome and the arrival (aviationweather.gov through the launcher):
  flight category in colour, wind and runway components, ceiling, visibility, temperature and QNH, CB / TCU warning,
  raw message folded; TAF when a flight date falls in it; "Real weather" sets the quote's wind to the average along
  the route; last values kept for offline use.
- **aerodb lot 5a: one aircraft registry.**
  - `aerodb.aircraft()` now gathers:
    - the performance sheets, one file each in `aircraft/sheets/` (V2's sheets adopted, and mirrored back while V2
      lives);
    - the company fleet and the V2 reference;
    - the ICAO types and a free code.
  - Every field keeps its origin and date; the newest wins and the other value is kept.
  - One search lists sheets, fleet, reference, types and free code in that order.
  - An aircraft takes its own sheet, else its type's, else an estimate.
  - The sheets logic moves from fuel to aerodb.
  - Fixes in aerodb's watchers for GitHub mode.
- **settings: usages on a workstation with the launcher** (`frame/settings/settings.js`, `frame/settings/help/*.md`;
  `DECISIONS.md`, manuals rebuilt) — with no exchange ticked, the Usages card now says that this workstation reads and
  writes the launcher's `data/` folder and that an exchange usage shares it through git; without a launcher, "Alone on
  this device" as before.
- **Frame, lot 9: V2 and V3 see the same data on a workstation** (`frame/app.js`, `frame/store/frame_data.js`) — on a
  page served by the launcher, `data/` is the device's storage whatever the usages (git exchange only with "several
  devices" or "several users"); the documents already kept in the browser are taken up at the first pass, with the
  usual merge (nothing lost: the older version stays in the conflicts screen).
- **settings: the launcher's confirmation window made visible** (`frame/settings/settings.js`,
  `frame/settings/help/*.md`; `frame/settings/SPEC.md`, `DECISIONS.md`, manuals rebuilt) — before taking `data/` into
  another repository or saving another remote address, the Access card says that a Yes / No window will open on the
  workstation, not in the page; while waiting it says to answer it (maybe behind other windows); after a refusal it
  shows the launcher's precise reason. The Settings chapter explains why the window exists.
- **settings: taking data/ into a repository, checked** (`frame/settings/settings.js`; `frame/settings/DECISIONS.md`) —
  "Take data/ into this repository" tried against the launcher's new route on test copies: the device's trigram is
  sent as the author of the local "Reprise du poste" commit, and the launcher's report stays in the card after success.
- **fuel: the frame's design primitives** (`modules/fuel/module.js`) — its own colours, shadows and title sizes
  replaced by the `f-…` primitives and `--sog-…` tokens, so it follows the three designs by day and by night.
- **settings: Design card** (`frame/settings/settings.js`, `frame/frame.css`, `frame/settings/help/*.md`;
  `frame/settings/SPEC.md`, `DECISIONS.md`, manuals rebuilt) — a thumbnail per look (Standard, Cabinet, Rugged), each a
  small live preview of its colours, and the tone Automatic / Day / Night, applied at once by the frame; the help
  panel's summaries take the frame's common folded style. The Settings chapter describes the Design and About cards.
- **report: the frame's design primitives** (`modules/report/module.js`) — its own colours, shadows and title sizes
  replaced by the `f-…` primitives and `--sog-…` tokens, so it follows the three designs by day and by night.
- **help: a visual roadmap in the app** (`frame/help/roadmap.js`, `frame/help/roadmap.json` de / es,
  `frame/help/build_help.py`, `frame/help/help.js`, `frame/settings/settings.js`, `frame/app.js`, `frame/index.html`,
  `frame/sw.js`, `frame/frame.css`; `frame/help/SPEC.md` § 5, `DECISIONS.md`, `frame/settings/SPEC.md`) — a `#roadmap`
  screen: the rule first (what is delivered must work, a gap is a bug; in progress, planned or later is not), the
  applications and their state, then one row per module or block with its items in four columns Delivered, In
  progress, Planned, Later (one card per module on a phone), coloured by state; reached from the top of the manual and
  from Settings › About; offline; the build checks that every text is in four languages.
- **flightlog: the frame's design primitives** (`modules/flightlog/module.js`) — its own colours, shadows and title sizes
  replaced by the `f-…` primitives and `--sog-…` tokens, so it follows the three designs by day and by night.
- **website: the frame's design primitives** (`modules/website/module.js`) — its own colours, shadows and title sizes
  replaced by the `f-…` primitives and `--sog-…` tokens, so it follows the three designs by day and by night.
- **maps: designs, day and night.**
  - The map and the profile take the frame's design tokens: background, ink, greys, grid and accent cursor.
  - Night uses a dark base map and lightens dark map colours. Nothing stays white.
  - The module redraws when the design, the tone or the system theme changes.
  - It now uses the frame's primitives (`f-tools`, `f-muted`).
- **design, lot 2: designs for the Pilot application** (`frame/design/tokens.css`, `frame/design/primitives.css`,
  `frame/lib/icons.js`, `frame/frame.css`, `frame/app.js`, `labs/design_primitives.html`).
  - Three designs: Standard, Cabinet and Rugged (square corners and their own fonts for the last two), by day and by
    night, following the system or forced. They are chosen in Settings and applied before the first paint.
  - Primitives given to the modules: headings, folded sections, tabs and steps, field grid, columns, sticky bar, table,
    tiles, row list, dot and badge, toolbar, callout, link button.
  - Line icons in the menu and the header instead of emoji.
  - 44 px targets, fields at 16 px (no zoom on iOS), links and shadows on the tokens, print of a screen without its
    chrome.
- **settings: a door for data/ without git** (`frame/settings/settings.js`, `frame/app.js`, `frame/settings/help/*.md`;
  `frame/settings/SPEC.md`, `DECISIONS.md`, manuals rebuilt) — on a workstation served by the launcher, the Access card
  says that `data/` is a folder ignored by the code repository that becomes its own git repository, and offers "Fetch
  the data" when `data/` is missing (clone) or "Take data/ into this repository" when it has no git (adopt), with the
  address, an optional username and password or token never kept by the page, and "Remember" in Git; progress and
  report in the card, state read again afterwards.
- Roadmap of the V3 applications (`frame/help/roadmap.json`): lanes per module with delivered / in progress / planned / later items, the rule for reporting bugs; rendered by the help screen.
- **settings: the remote repository of data/ from the frame** (`frame/settings/settings.js`,
  `frame/settings/help/*.md`; `frame/settings/SPEC.md`, `DECISIONS.md`, manuals rebuilt) — on a workstation served by
  the launcher, the Access card shows the remote repository of `data/` (address, branch) and lets you check and save a
  new address, with the V2 first start's rules (another repository confirmed in a window of the launcher, never
  blocking); without git, a sentence and a link to the help; "Several users" without a remote warns on the Usages
  card. The Settings chapter gains "A git repository for data/".
- **help: chapters Report, My flights, Website, Map and Settings** (`modules/{report,flightlog,website,maps}/help/
  {en,de,es}.md`, `modules/fuel/help/*.md`, `frame/settings/help/*.md`, `frame/help/build_help.py`,
  `frame/help/pilot.*.md`, `frame/settings/settings.js`, `frame/app.js`; `frame/help/SPEC.md`, `DECISIONS.md`,
  `frame/settings/SPEC.md`, `DECISIONS.md`) — the chapters written in French by the module agents translated into
  English, German and Spanish with each screen's own labels, Fuel updated ("Open in"), and a Settings chapter placed
  after the modules; it says what a device with no access and no launcher sees (no aeronautical or aircraft base) and
  how to get them. In Settings, data access can now be set without an exchange when no launcher serves the page (it
  only reads the bases), "Offline data" says what to do when there is no base, and the screen has its own "How to
  use" panel.
- **maps: help chapter** (`modules/maps/help/fr.md`, French; the help session translates and assembles it).
  - How to use: the planned flight, what the map shows, the profile and its cursor, TOC / TOD, mission maps, "Edit the
    route".
  - What works offline.
  - Special cases: no flight, no database, area not kept, different cycle, older mission.
- **help: the Pilot manual and the in-page help** (`frame/help/help.js`, `frame/help/build_help.py`,
  `frame/help/intro.*.md`, `frame/help/pilot.*.md`, `frame/lib/markdown.js`, `frame/app.js`, `frame/index.html`,
  `frame/sw.js`, `frame/frame.css`, `modules/fuel/help/{en,de,es}.md`; `frame/help/SPEC.md`, `INTEGRATION.md`,
  `DECISIONS.md`, `frame/SPEC.md`, `frame/INTEGRATION.md`) — each module's chapter (`modules/<id>/help/<lang>.md`,
  written in French by its agent, translated) is assembled with the application's introduction into one manual per
  language by a standard-library build that refuses a missing language and lists translations to redo; the frame
  draws a folded "How to use" panel at the top of each module from its chapter's first section, state kept per module,
  with `ctx.help.open` and `ctx.help.link`; a `#help` screen (header button ?) shows the manual text first at the
  module's chapter, contents folded on a phone, tables as lists at 375 px, French typography, offline. First chapter:
  Fuel and level, in four languages.
- **website: the user's chapter in French** (`modules/website/help/fr.md`) — "How to use" (my flight log, the fleet,
  the preview, reading through the launcher, the airline card), then good to know and special cases; to be translated
  and assembled by the help session.
- **design: reading of V2's designs** (`frame/design/READING.md`, `frame/design/DECISIONS.md`) — what the Pilot
  application keeps of V2's designs, skins, icons and phone rules; the proposed `--sog-*` token set, the primitives the
  modules built by hand that move into the frame, density (44 px targets, 16 px field text on touch screens), day /
  night, print, the design choice in Settings; a survey of the seven screens at 375 px and on a screen, day and night,
  in two token sets. No code.
- **flightlog: the user's chapter in French** (`modules/flightlog/help/fr.md`) — "How to use" (totals, filters,
  list, details, write or open the report, More), then where flights come from and special cases; to be translated and
  assembled by the help session.
- **report: the user's chapter in French** (`modules/report/help/fr.md`) — "How to use" (three steps, last flight,
  other sources, mission, result, saving, recording on the website, my last reports), then prefill in detail, report
  numbers, the "→ Vol" bookmark, special cases; to be translated and assembled by the help session.
- **fuel: "Open in ▾"** (`modules/fuel/module.js`, `frame/lib/external_links.js`, `help/fr.md`) — under the result,
  the same flight in SimBrief (dispatch prefilled), SkyVector (route with speed and level), Navigraph and ChartFox
  (aerodrome charts), V2's links copied; `meta.files` lists fuel's files for offline use.
- **fuel: the user's chapter in French** (`modules/fuel/help/fr.md`) — "How to use" (aircraft, route and SimBrief,
  level and wind, level decision, result, climb instructions, towards maps and the report), then performance sheets,
  settings and units, special cases; to be translated and assembled by the help session.
- **help: reading of the V2 help** (`frame/help/READING.md`, `frame/help/DECISIONS.md`) — what the Pilot application
  keeps (tutorials first, one manual per application with one chapter per module, a help screen with its own bundle),
  one source per module (`help/<lang>.md`, whose "How to use" section is also the folded in-page help drawn by the frame
  from `meta.help`), the phone help page, and what the delivered modules have today (no user help yet). No code.
- **aerodb: towns filed by their country.**
  - The SIA publication now files each GeoNames town under the zone of its own country, using the zone contours only
    for countries without a zone. Simplified contours had filed the Zeeland towns under Belgium and the Geneva suburbs
    under France.
  - `tools/check_cities.py` lists the towns that fall outside their country's contour.
  - The "Béziers" seen near Châtellerault was a label of the base map tiles, not our data.
- **maps lot 4: mission maps redrawn on the phone.**
  - The map module lists the missions of the data repository and redraws each mission map from its YAML.
  - Each map is drawn with its own display profile, extent and route when the studio wrote them (`profile_def`,
    `resolved_bbox`, `route_points`), otherwise with the built-in profile of its type and the studio's framing rules.
  - The mission's zones, points and route are drawn too, and the mission's vertical profile follows its levels.
  - A map made on another AIRAC cycle is flagged.
  - Choosers in the header switch between the planned flight, the missions and their maps; address
    `#maps?mission=<ID>&map=<file>`.
  - Built-in profiles generated from the studio (`tools/build_maps_profiles.py`).
- **maps lot 3: the vertical profile under the map, with a common cursor.**
  - The profile shows:
    - terrain from elevation tiles, or the MORA of the cells crossed when offline;
    - the airspaces the planned trajectory enters;
    - fuel's climb and descent (TOC and TOD), otherwise its own;
    - the route points and NM marks.
  - A finger on the profile, or a tap on the route, moves one cursor on both views. A line says the distance, planned
    altitude, terrain or MORA, and the airspace under it.
  - TOC and TOD are also drawn on the map.
  - Airspaces and airways are read leg by leg along the route: 3.64 MB instead of 7.7 MB for Nantes → Marseille.
  - "Map" is in the Pilot app's menu, after Fuel.
  - Profile drawn in 1.5 s (2.6 s on a phone-like CPU).
- **aerodb: zones chosen by the cells their data cover.**
  - The SIA publication writes in `sia/base/index.json`, per zone, the one-degree cells its data cover.
  - aerodb opens a zone only when its data touch the area asked for. Zone frames, which overflow (Spain's covers the
    south of France), remain the fallback for a manifest without cells.
  - Route LFRS → LFML: Germany no longer read (7.71 → 7.34 MB); 3.56 MB when the corridor is asked leg by leg.
- **Frame, lot 8: `meta.net` and `meta.lazy`** (`tools/csp_policy.py`, `tools/build_pages.py`, `tools/launch.py`,
  `frame/app.js`) — a module declares the public hosts its library calls by itself (map tiles), added to the page's
  `connect-src` with and without a launcher; heavy files are kept at their first use instead of being preloaded.
- **fuel: vertical profile in the current flight** (`modules/fuel/module.js`; `INTEGRATION.md` § 3, `DECISIONS.md`) —
  `pilot/<trigram>/current_flight.json` gains `profile { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` from
  every quote, for maps' vertical profile.
- **maps lot 2: the route map of the planned flight** (`modules/maps/`).
  - The Pilot app's map draws fuel's flight (`pilot/<trigram>/current_flight.json`), read only: OpenFreeMap tiles
    through MapLibre (loaded at the first map), with the aeronautical layer cut out of the V2 studio on a canvas.
  - The layer shows airspaces within 10 NM of the route, low or high airways by flight level, aerodromes, navaids,
    MORA, graticule, and the route with NM marks and the alternate. In overview, only what is near the route.
  - Without tiles (offline, no WebGL), it uses a plain background with the country outlines.
  - Empty states: no flight, database not published, area not kept offline.
  - First drawing in 0.5 s, or 1.4 s on a phone-like CPU.
  - Files: `module.js`, `render.js`, copies in `lib/`, `tools/build_maps_outlines.py`, a test page; `SPEC.md`,
    `INTEGRATION.md`, `DECISIONS.md`.
- **website: "Read through the launcher"** (`modules/website/module.js`; `SPEC.md` § 3 bis, `INTEGRATION.md`,
  `DECISIONS.md`) — on a workstation, the website's log and fleet pages are read in one tap through the frame's
  `ctx.net` (GET, relayed by the launcher), then the same preview as a paste; where the site cannot be reached, the
  button gives way to "paste only".
- **website: the airline website in the Pilot application** (`modules/website/module.js`, `model.js`, `frame/app.js`;
  `SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`) — verb "Website" (level 2): the website's flight log pasted (HTML from
  the clipboard first) → my rows in `pilot/<trigram>/site_log.json`, the fleet page pasted → `airline/fleet.json`
  (V2 merge rules), each after a preview of what changes; the Airline card (`airline/settings.json`: name, site,
  pages) edited on a computer screen, read only on a phone, read by the frame as `ctx.airline` (report's website
  button becomes active). No request to the site, no login, no address in the code.
- **Frame, lot 7: the airline's website through `ctx.net`** (`frame/app.js`, `tools/launch.py`) — the host of
  `airline.site` is relayed by the launcher (or called directly), GET only, https only, never a local or private
  address, so the website module can read the fleet and the log.
- **Frame: a merged device backup leaves `device/` aside** (`frame/store/frame_data.js`) — `FrameData.load` in merge
  mode never takes another device's usages, identity or level; "replace" still takes them, never a token.
- **maps: reading of the V2 map studio** (`modules/maps/READING.md`, `modules/maps/DECISIONS.md`) — the minimal
  rendering core to cut out of the studio (ICAO symbols, profile, cursor sync, the drawing functions once they take a
  profile object instead of reading the page); what a mission map stores today and what the studio and generator must
  add for it to redraw alone (a copy of the display profile, the resolved extent, the cycle); the weight on a phone
  (about 130 KB of code, MapLibre 1 MB on demand, about 3.9 MB of SIA data for a France IFR map); what stays in the
  studio; what the module asks of aerodb, the frame and fuel; the phone screen (IFR map of the planned flight and a
  synchronised vertical profile, read only). No code.
- **settings: backup and access on the frame's lot 6** (`frame/settings/settings.js`; `frame/settings/SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`) — the device backup now uses `FrameData.dump()` and `FrameData.load()`: "Export
  (one file)", "Import (merge)…" (nothing of this device is lost) and "Replace from a file…" (asked, says what is
  erased); "Cut access" goes through the frame's `cutAccess`; zones show their real state and "Free" now that the
  frame's adapter offers `cached` and `evict`; sizes in the units of the application's language.
- **website: "record the flight" moved to `frame/lib/website.js`** — shared pure code owned by the website module,
  self-contained; report imports it from there.
- **settings: usage level** (`frame/settings/settings.js`, `frame/app.js`, `frame/frame.css`; `frame/settings/SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`, `frame/SPEC.md` § 3.1) — a Level card in Settings: Discovery, Everyday (the
  default) or Full, one tap, with the menu each level shows; the frame's menu lists only the modules whose
  `meta.level` is at most the device's level (`device/level.json`), a hidden module staying reachable by its address.
- **website: reading of the DEFA Virtual website as V2 uses it** (`modules/website/READING.md`,
  `modules/website/DECISIONS.md`) — the site's pages, forms and fields, what is public and what needs the pilot's
  session, the pasted flight log and fleet towards `pilot/<trigram>/site_log.json` and `airline/fleet.json`, the
  "record the flight" function report calls, the airline setting `airline/settings.json`, and what a future PHP web
  service would expose as a frame transport, by lots. No code.
- **flightlog: "My flights" in the Pilot application** (`modules/flightlog/module.js`, `model.js`,
  `frame/lib/js-yaml.min.js`, `frame/app.js`, `modules/report/module.js`; `SPEC.md`, `INTEGRATION.md`,
  `DECISIONS.md`) — my past flights, one line per flight, from my reports (V3 records and the V2 registry), the
  airline website log (`pilot/<trigram>/site_log.json`, written by the website module) and my IVAO / VATSIM
  sessions, without duplicates (report > log > network); three tiles of totals, period, search, "without report",
  details on a tap, CSV in More; "Write the report" starts a report prefilled with the flight, "Open the report"
  reopens it (hand-over `{ fresh, family, values }` and `{ open }`, read by report).
- **settings: the settings screen of the Pilot application** (`frame/settings/settings.js`, `frame/app.js`,
  `frame/index.html`, `frame/sw.js`, `frame/frame.css`; `frame/settings/SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`,
  `frame/SPEC.md`) — ⚙ opens `#settings`, which replaces the frame's device screen: short cards saved one by one,
  phone first. Identity (trigram, IVAO VID, VATSIM CID, SimBrief, checked in the card); usages, with "Alone on this
  device" shown as the state when no exchange is ticked and how data are exchanged; for single use, export and import
  of the device's data in one file; with an exchange, data access (repository, branch, token never shown, "Test",
  "Cut access") and synchronisation (last success, pending, network, last error, "Synchronise now"); offline data
  (browser storage, one row per published zone with its state, cycle and size, "Keep offline" and "Free" through
  `aerodb.offline`, the aircraft base); the launcher's IVAO key when a launcher serves the page; folded diagnostics
  to copy. V2 settings found on the same origin (identity, GitHub access) are offered once, taken over in one tap.
- **report: "last flight" moved to `frame/lib/last_flight.js`** — shared pure code (report owns it, flightlog uses
  it): a module never imports from another module.
- **flightlog: reading of V2 "My flights"** (`modules/flightlog/READING.md`, `modules/flightlog/DECISIONS.md`) —
  the sources of a flight and their key (reports, the airline website log, IVAO / VATSIM sessions), one line per
  flight, filters, totals, CSV, "Write the report" handed to the report module, the phone screen, and what in
  `shared/my_flights.js` is pure model. No code.
- **report: every family** (`modules/report/families/*.js`, `module.js`, `model.js`, `vocab.js`; `SPEC.md` § 2 and
  § 5, `INTEGRATION.md`, `DECISIONS.md`) — the sixteen V2 families (FIRE, SPECIAL, SAR, AIRLIFT… with their series,
  crew roles and blocks) copied from `shared/mission_core/families/`, without their statistics; blocks and fields shown
  by their V2 conditions (series group, capabilities, aircraft category), the common task block for the families
  without an order of their own, and a new report opened in the family of my last one.
- **report: "Save and record on the website"** (`modules/report/website_handoff.js`, `module.js`; `SPEC.md` § 3 bis,
  `INTEGRATION.md`, `DECISIONS.md`) — one gesture opens the airline website's "add a flight" form with the flight in the
  address fragment and saves the report; the "→ Vol" bookmark (V2's, unchanged) fills the form without submitting it;
  "Copy the fields" for a phone. The address comes from the airline setting (`ctx.airline`); without it the button is
  greyed. "My last reports" is now a folded list under the Flight step.
- **Frame, lot 6** (`frame/app.js`, `frame/store/frame_data.js`, `tools/report_bridge.py`, `tools/launch.py`).
  - Addresses with a query: `#report?from=flightlog` opens report and gives it `ctx.query`.
  - `ctx.airline`: name, website and pages of the airline, read from `airline/settings.json` of the data repository.
  - "Cut access" wired in the frame (`FrameData.github.clear()`): the transport switches at once, in every tab.
  - Data layer: `cached(prefix)` and `evict(path)` for the state of the cache, `FrameData.dump()` /
    `load(file)` for a backup of the device in one JSON file (merge by default, or replace).
  - METAR from aviationweather.gov relayed by the launcher, or called directly.
  - Registry bridge: every V3 report is replayed into the V2 registry `cr/missions.yaml` at each batch and each
    exchange of the launcher, in V2's exact format.
- **fuel: display units for speed, altitude and distance** (`modules/fuel/module.js`, `model.js`, `test/quote.html`;
  `SPEC.md` § 6 and § 9, `INTEGRATION.md`, `DECISIONS.md`) — beside kg / lb in the Plan screen's settings, speed in kt
  or km/h, altitude in ft or m, distance in NM, km or SM, saved with the other quote settings; the model, the current
  flight and the sheets stay in kt, ft and NM, conversion is the screen's in both directions (typed distance, wind
  speed and manual IAS and rate are read in the displayed unit); flight levels stay flight levels. Bench: conversions
  and round trips (50/50).
- **settings: reading of the V2 Settings** (`frame/settings/READING.md`, `frame/settings/DECISIONS.md`) — each V2
  Settings card and where it goes in the Pilot application (identity, access, keys on a launcher, offline data, about,
  diagnostics; the rest to modules, CPCO, the design block, or dropped), the usages checklist and the cards each usage
  shows, settings as a frame screen replacing `#device`, a one-tap take-over of V2's identity and access, three
  questions for the user. No code.
- **report: prefill** (`modules/report/fpl.js`, `text_import.js`, `last_flight.js`, `module.js`; `SPEC.md` § 6,
  `INTEGRATION.md`, `DECISIONS.md`) — my last IVAO flight proposed at mount and taken in one tap (sessions cut by
  disconnections grouped, times from the track), my last VATSIM flight, the SimBrief flight plan, a pasted flight plan,
  tracker page or METAR, and a hand-over record from another module (`pilot/handoff.json`); empty fields only, the
  source shown per field, "Replace the n fields already filled". Networks through `ctx.net` (the launcher relays IVAO
  with its key and VATSIM); the V2 flight-plan and paste code copied, the launcher's "last flight" ported to
  JavaScript.
- **report: the mission report in the Pilot application, HEMS first** (`modules/report/module.js`, `vocab.js`,
  `model.js`, `families/hems.js`, `frame/app.js`; `SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`) — three steps Flight ·
  Mission · Result (one at a time on a phone, side by side on a wide screen), nothing required (what is missing and
  the V2 checks shown as warnings), the current flight of fuel and maps as a one-tap prefill, the HEMS blocks, a draft
  kept on the device, my last reports reopened for editing. One JSON record per report, `cr/reports/<year>/<CR
  number>.json`: the V2 registry entry plus `schema`, `updated_at`, `by`, so the launcher's bridge folds it into
  `cr/missions.yaml` unchanged. V2 vocabulary, model and HEMS family copied, not rewritten.
- **report: reading of the V2 mission report** (`modules/report/READING.md`, `modules/report/DECISIONS.md`) — what
  the V2 report does on each path, what the Pilot application keeps and what moves to CPCO, the SOG client or other
  modules, today's shortest path (5 clicks to a report saved in the browser, 8 with the website) and the target (3
  taps, 4 with the website), what the module asks of the frame and aerodb, the three phone steps Flight · Mission ·
  Result, and the website hand-off. No code.
- **Frame, lot 5: publication and iOS shell** (`.github/workflows/pages.yml`, `tools/build_pages.py`, `mobile/`,
  `frame/app.js`).
  - One GitHub Pages site for both branches: V2 (develop) at the root, V3 (v3) under `/v3/` (Pilot application:
    `/v3/frame/`), rebuilt on a push to either.
  - `build_pages.py --start PATH`: the root page redirects to the given page; the Capacitor shell, now named "SOG
    Pilote", opens on the Pilot application.
  - Modules declare the files they import (`meta.files`); the frame keeps them offline from the first visit.
- **fuel: numbers of ChatGPT answers, RPM table editor, offline** (`modules/fuel/sheets.js`, `modules/fuel/module.js`,
  `modules/fuel/test/sheets.html`) — "2,400" is read as 2400 (thousands commas, European form, otherwise decimal
  comma; V2 read 2.4), with its bench cases (18/18); the RPM / fuel flow table is edited row by row on a computer
  screen (read only on a phone), removed rows previewed; the calculation files are fetched again when the frame's
  service worker takes control, so the module is complete offline from the first visit.
- **fuel: the module in the Pilot application** (`modules/fuel/module.js`, `frame/app.js`; `SPEC.md` § 9,
  `INTEGRATION.md`, `DECISIONS.md`) — mounted by the frame's loader as the first verb. Plan: aircraft, route
  (aerodb positions, or typed distance and track; last SimBrief OFP through `ctx.net`, kept on the device), level and
  wind, level decision drawn (fuel and time by level, least fuel, fastest, tap to choose), block fuel sticky at the
  bottom; folded: the quote's details, the climb instructions (drawing and table), the quote settings. Sheets: list,
  import of files or pasted text (CSV, JSON, `.lnmperf`, OFP, ChatGPT answer), new sheet, editor, EUROCONTROL or
  another sheet to complete, ChatGPT requests, `.lnmperf` and JSON export; every change previewed line by line and
  written only as ticked. The current flight is shared with maps (`pilot/<trigram>/current_flight.json`).
- **fuel: performance sheets in pure code** (`modules/fuel/sheets.js`, `modules/fuel/perf_prompt.js`; `SPEC.md` § 8,
  `INTEGRATION.md`, `DECISIONS.md`) — the V2 sheet functions copied verbatim, their globals replaced by the module's
  environment (aerodb's aircraft base, the sheets, the active sheet, texts): performance CSV (simple and enriched),
  RPM tables, JSON sheets and databases, Little Navmap `.lnmperf` read and written, SimBrief OFP sheet and
  calibration, EUROCONTROL proposals, gaps filled from another sheet, merge sheet by sheet (dates, differences,
  choices), ChatGPT prompts and replies read whatever their shape. `tools/build_perf_prompt.py` also writes the
  module's copy of the prompts. Bench (`modules/fuel/test/sheets.html`) against the V2 functions on the same inputs:
  9/9.
- **Frame: offline for real** (`frame/sw.js`, `frame/manifest.webmanifest`).
  - The Pilot application is installable and starts offline after a first visit: frame and modules are kept by the
    frame's own service worker, data by the data layer.
  - A changed file brings the whole new version and a "Reload" notification.
  - Outgoing calls of modules (`ctx.net`) are relayed by the launcher for SimBrief, IVAO (with its key) and VATSIM
    (`tools/launch.py`: `POST /__setup/net`), called directly without a launcher where the site allows it, and answer
    503 instead of failing.
  - Synchronisation resumes on its own: retry after an offline pass, a pass on wake when one is due, the button's
    state refreshed when the phone wakes up.
- **fuel: level decision and climb instructions in pure code** (`modules/fuel/levels.js`; `SPEC.md` § 7,
  `INTEGRATION.md`, `DECISIONS.md`) — taken out of the V2 view (`shared/flight_perf_view.js`) without its layout:
  climb goals (economical, best rate, fast, sheet's IAS, manual) and their laws, the whole trip at every level up to
  110 % of the ceiling (least fuel, fastest, why higher levels cannot be flown), the level curves of the detailed
  view, the climb instructions to the plan's level (throttle, RPM, IAS, rate, fuel flow, Mach, cumulative time and
  fuel) and the minimum distance of a level. Bench (`modules/fuel/test/levels.html`) against the V2 view's state on
  the quote bench's sheet: 24/24. The drawing comes with the module screen, on the frame's loader.
- **fuel: the pure quote model** (`modules/fuel/model.js`, `modules/fuel/performance_model.js`; `modules/fuel/SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`) — the fuel quote taken out of the V2 page (`calculate` of
  `apps/planner/flight_planner.js`) as a pure function, inputs → quote: cruise flow and TAS with their source (entry
  for this flight, sheet and RPM table, Poll-Schumann, SimBrief, estimate from aerodb), model sheet completed by the
  EUROCONTROL record, calibrated climb and cruise (V2 flight mechanics copied unchanged), descent, taxi, contingency,
  reserve, block (or its range with an unknown wind), time and top of descent. Bench
  (`modules/fuel/test/quote.html`): three known cases from the V2 page on a fictitious sheet, every displayed value
  found again (30/30). The current flight shared with maps is specified (`pilot/<trigram>/current_flight.json`).
  The module screen follows on the frame's loader.
- **Frame: the Pilot application skeleton** (`frame/index.html`, `frame/app.js`, `frame/frame.css`,
  `modules/hello/`).
  - Navigation by short verbs: a column on a screen, a drawer on a phone; `#module` addresses.
  - Modules loaded on demand (`modules/<id>/module.js`: `meta`, `mount`, `unmount`) with one context: data, aerodb,
    texts in four languages, notifications, the frame's question windows, outgoing calls that never throw offline,
    read-only identity.
  - A synchronisation button with its state (up to date, pending, in progress, offline, conflicts, error, this device
    only).
  - A conflicts screen where a set-aside version can be taken back.
  - A device screen (usages, identity, GitHub access) that chooses the transport: local when nothing is to be
    exchanged, else the launcher, else GitHub.
- **Data layer additions**:
  - the `cache` write policy (device-only files);
  - shared write prefixes;
  - `restore`;
  - merges dated by `updated_at`, falling back to `updatedAt`;
  - the launcher transport (`frame/store/transport_launcher.js`; `tools/launch.py`: `GET /__setup/changes`,
    `POST /__setup/batch`, one local commit per batch, git exchange through `/__setup/sync`).
- **Frame: data layer** (`frame/store/frame_data.js`, `frame/store/transport_github.js`; `frame/SPEC.md`,
  `frame/INTEGRATION.md`, `frame/DECISIONS.md`) — disconnected mode at the core: one local cache (IndexedDB
  `sogFrame`) serves every read with no network; writes are queued and sent in batches, one commit per
  synchronisation (at start, on the button, every 10 minutes online), never one per click; changes made elsewhere are
  pulled and merged three ways (record: the newest wins, the loser kept and signalled; journal: union; keyed lists:
  record by record); a refused push pulls and pushes again. Transports: local (single user) and GitHub through the git
  data API (device token, conditional head request, immutable blobs). Policies per prefix: documents pulled ahead,
  references (SIA and aircraft bases, for aerodb) read on demand and revalidated. Modules get `get`, `read`, `list`,
  `put`, `remove`, `watch`, `status`, `sync` through their adapter and may write only under their declared prefixes.
  Tests: `frame/store/test/index.html` against a standard-library fake GitHub (`frame/store/test/fake_github.py`), 37
  checks.

- **aerodb: the aeronautical database for every module** (`frame/aerodb/`, branch `v3`). It reads the bases published
  to the data repository by a workstation: the SIA base by zone and cycle, the towns and the aircraft types (JSON, or
  the V2 `.js` read as a literal, never executed). It builds nothing and writes nothing.
  - One asynchronous API, by area or identifier, never by zone or file: airspaces, aerodromes, navaids, points,
    airways, VRP, obstacles, MORA, refuelling and NAT tracks, towns, ranked place search, coordinates, and the
    aircraft types (classification, aliases, performance, cruise fuel estimate, search).
  - Zones load on demand, chosen from a generated table of zone frames (`tools/build_aerodb_zones.py`), and are indexed
    in memory by one-degree cell.
  - Reading goes through the frame's data contract (`data.read` with policy "reference", `data.list`, `data.watch`), with
    a provisional reader for the launcher and GitHub mode until the frame delivers it.
  - Bench (`frame/aerodb/bench.html`, 375 px) on the user's 13 real zones: France in about 120 ms on a phone-like CPU,
    all zones in about 280 ms, a whole-world question returns exactly the published base.
  - Documents: `frame/aerodb/SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`.
- **aerodb lot 3: the SIA base split by kind, towns by zone, the aircraft base as JSON.**
  - Each rebuild now also publishes one file per zone, cycle and kind (`sia/base/<zone>/<cycle>/<kind>.json`:
    airspaces, aerodromes, navaids, points, VRP, airways, obstacles, MORA, the zone's towns, meta).
  - Also published: the world's major towns (`sia/base/cities_major.json`) and a manifest of the published zones
    (`sia/base/index.json`).
  - The Maintenance button publishes `AircraftDB/aircraft_db.json` and `aircraft_perf.json` next to the `.js` files.
  - The old format is still written. aerodb reads both and prefers the new one, so a module asking for the aerodromes
    around Paris downloads 426 KB instead of 5.6 MB, and a place search never reads the world's towns.
  - Administrator manuals (4 languages) and `docs/technique/DONNEES_ET_ACCES.md` updated.
- **aerodb mounted by the frame: no longer forgets a zone when a file first arrives.** The frame's data layer reports a
  reference file entering its cache as a change. aerodb now forgets a zone only when a file it already read gets a new
  revision. Checked through `frame/index.html` with the launcher transport.
- **Frame: reference files with the local transport.** In single-user mode (no exchange, the default), the data layer
  read no `reference` file, so aerodb, and the fuel module through it, had no SIA base and no aircraft base.
  - `FrameData.configure({ references })` now takes a read-only source for those files: the launcher that serves the
    page, otherwise the configured GitHub repository.
  - Files are read on demand and revalidated at sync. Nothing is ever sent, and offline the pass still succeeds.
  - New scenario in `frame/store/test/`; `frame/SPEC.md` and `DECISIONS.md` updated.
- **aerodb lot 4: offline data API** (`aerodb.offline`, for the "Offline data" card of the coming Settings screen).
  - `zones()` gives, for each published zone: its name in four languages, ICAO prefixes, published size and state
    (absent, partial, complete, with cycle and date of the newest copy).
  - `keep(zone)` downloads every kind of the zone into the frame's cache; `release(zone)` frees it; the aircraft base
    has its own state. Everything goes through the frame's adapter.
  - The adapter still needs `cached` and `evict`, asked of the frame; until then, states read "unknown" and release is
    refused.
  - Bench `frame/aerodb/offline_bench.html` (375 px): France kept (6.9 MB, about 120 ms), answered with the network
    cut, then released.
  - Fixes: the manifest of lot 3 is now read (it was looked for one level too deep); a zone or kind unreadable offline
    is asked for again instead of staying empty.
- **aerodb lot 4b: offline data on the frame's real adapter.** With the frame's `cached` and `evict` (frame lot 6):
  - zone states are real (absent, then partial after one question, complete after `keep`);
  - `release` frees the zone's whole folder in one call;
  - the bench (`frame/aerodb/offline_bench.html`) runs on `FrameData` as the Pilot app configures it, and its
    stand-in reader is removed. France kept in about 180 ms (410 ms on a phone-like CPU), answered with the network
    cut, released in 80–200 ms.

### Livraison

- Archive de livraison : `xplane-web-suite-6.0.0-alpha.1.zip` — SHA-256 `5026985db8c0bafc202ddae70a4989aa578d697db47fb82407a38f3f4791ae71` (code seul, hors dépôt : dossier `dist/`).
- Module package: `dispos-module-6.0.0-alpha.1.zip` — SHA-256 `09fa2a2a484acc78f78d940bec91de44351e9803d600e8852cd9154f003fff0b` (outside the repository: `dist/` folder).

## [5.4.0] — 2026-10-23

Last release of the V2 line, before the V3 Pilot application. The suite now runs without the launcher: the data
live in a GitHub repository, the pages are published on GitHub Pages as an installable app, an iOS shell is
ready, a mobile mode adapts the main pages to a phone, and the aeronautical database and the aircraft database
are published to the data repository so that phones read them. The map studio writes, on every mission map, what
it takes to redraw it elsewhere, and edits the airline's map profiles for the V3 app. The launcher updates `data/`
at start without failing on local changes, a `data/` folder that already holds data can join the data repository,
and the usage level is set from the header of every Settings page. Flight orders show one availability row per
member, Fuel and Flight maps open the flight in SimBrief, SkyVector, Navigraph and ChartFox, and My missions is
the pilot's entry page. Fixes: launcher start, confirmation windows, GitHub mode on a workstation, SimBrief
waypoints, and the rest listed below.

### Added

- **Settings: the usage level in the header** (`shared/repository_nav.js`, `shared/repository_nav.css`) — every Settings
  page, Maintenance included, shows "Usage level" next to the language (1 · Crew to 4 · Expert; a change reloads the
  page), besides My profile › Usage level (with the modules). `RepositoryNav.levels.NAMES` and `levels.hint(n, what)`:
  a line shown only below level n ("…: at level 4 · Expert — change level"), to put next to an element marked
  `data-min-level="n"`; used for "Publish the aircraft database" in Maintenance › Aircraft types. User manual ×4.

- **Map studio: the airline's map profiles for the app (V3)** (`apps/cpco/map_parser.html`, `tools/data_sync.py`;
  Flight maps rebuilt, the boxes hidden there) — the studio reads and writes `airline/map_profiles.json` of the data
  repository, one display profile per mode of the app's map (Auto, Low IFR, High IFR, VFR, Topo, CAM) in the
  `profile_def` format: "Take into the studio" makes a mode an "App — mode" profile, "Save for the app" writes into a mode,
  after confirmation, a partial profile — what the profile shown changes from the studio's defaults and the zoom
  thresholds filled in, the rest keeping the app's built-in values (record rule: the file is read again and written
  whole; the other modes and the app's own settings are kept). New "App zoom thresholds (V3)": the 26 keys of the app's `elements.zoom`, each "from …
  to …" in MapLibre zoom. A studio profile now keeps, when saved, the element keys it does not know (the app's
  extensions: `vfrDensity`, `fixes`, `awLabels`, `zoom`). `airline/` joins the synchronised pool, so "Synchronise"
  shares the file. Planner manual ×4, `docs/technique/FRAMEWORK.md`, `docs/technique/SYNCHRONISATION.md` § 3.

- **First run: "Take data/ into this repository"** (`tools/launch.py` `POST /__setup/adopt`, `tools/data_sync.py`
  `adopt`, `apps/settings/premier_lancement.html`) — a `data/` folder that already holds data without being a git
  repository (examples, archive, data entered) had no way to join the data repository: saving the address was refused.
  The "Git repository for data synchronisation" card now offers to make it a clone: the repository is cloned alongside,
  its history moved into `data/`, the workstation's files merged by the synchronisation rules (newest record kept, the
  other in `_conflits/`, assignments merged), one local commit "Reprise du poste", nothing pushed; replaced originals go
  to `data_avant_<date>/`, a failure leaves `data/` as it was. Sample data is set aside and replaced by a plain clone.
  Same address rules as `sync-remote` (another repository confirmed in the launcher's window); `GET
  /__setup/sync-remote` gains `state` (`absent`, `plain`, `repo`). The synchronisation merge rules are shared
  (`merge_raw`). User manual ×4, `docs/technique/SYNCHRONISATION.md` § 9; `python tools/data_sync.py --essai` covers it.

- **Map studio: each mission map carries what it takes to redraw it elsewhere** (`apps/cpco/map_parser.html`,
  `apps/planner/map_planner.html` rebuilt, `shared/mission_registry.js`) — for the V3 maps module, saving in the studio
  writes on every `maps[]` entry of `mission<ID>.yaml` a full copy of its display profile with every element resolved
  (`profile_def`), the extent actually drawn (`resolved_bbox`, separate from the `bbox` input) and the AIRAC date of the
  SIA database (`cycle`, refreshed with `generated_at` when PNG files are produced); `vertical_profile` gets
  `profile_def`, `cycle` and the resolved `route_points`. Additions only: no existing mission changes meaning, the
  registry does not count them as a new version and carries them over to a new version. Format in
  `docs/technique/FRAMEWORK.md`.

- **Board (flight orders): one thin row per member under “Available together”** — each member's availability ranges of
  the day, in the colour of their category, hatched when they do not make the member assignable to a flight, to see who
  starts earlier, finishes later or covers “together”; with a single member available that day, “together” shows their
  ranges (at least one member instead of two). Beyond seven members the rows fold from the label (open by default,
  remembered in `odvOrdersTogether:v1`); hidden in read-only mode like “together”. An assigned mission flight (mission
  order issued, “OM” badge) is drawn in the page ink — black by day, white at night and in dark designs — instead of its
  callsign colour, on the timeline and in the phone list (user manual, 4 languages).

- **Settings › Maintenance › Aircraft types: “Publish the aircraft database to the data repository”** (Expert level,
  workstation with the launcher) — for phones and the website (GitHub mode): copies `AircraftDB/aircraft_db.js` and
  `aircraft_perf.js` into `AircraftDB/` of the data repository, removes everything else from that folder (caches,
  scripts, `__pycache__`), commits and synchronises; the page first shows the list of files copied and removed and asks
  for agreement. Both files must be plain values: `tools/data_guard.py` now admits `window.AIRCRAFT_DB` and
  `window.AIRCRAFT_PERF` literals. Never published on the public website (`tools/launch.py` `/__setup/aircraft-publish`).

- **Route field: coordinates typed in any common way** (map studio, Flight maps, Fuel planner) — decimal degrees,
  degrees and minutes or degrees, minutes, seconds, hemisphere letters before or after (O = west), decimal point or
  comma, packed ICAO-like digits of any precision (“441819584N00032421849733W”), or signed decimals (“+44.18,-0.038”)
  are rewritten in the flight plan format when leaving the field: to the minute (“4411N00002W”) when the position falls
  exactly on it, otherwise to the second (“441048N0000217W”); a notification lists what changed. Coordinates already in
  ICAO form and unsigned decimal “lat lon” are left as they are; “Copy ICAO” still rounds to the minute
  (`SiaProfile.normalizeCoords`, `SiaProfile.coordHelper`, `shared/carto/vertical_profile.js`; help text and user manual,
  4 languages).

- **Aeronautical database published to the data repository, read by phones** — each rebuild on a workstation
  (Settings › Maintenance › Aeronautical data, map studio) also writes the database zone by zone into the data folder:
  `sia/base/<zone>/<cycle>.json` (plain JSON, a few hundred KB up to about 5 MB for France) and `sia/base/cities.json`;
  a file is rewritten only when its content changes, older cycles of the zone are removed, and the rebuild report says
  what was published (or why not: data folder not authorised). "Synchronise" sends them (`sia/base` added to the pool of
  `tools/data_sync.py`). In GitHub mode the database is read from these files (conditional requests, latest cycle of
  each published zone), joined back and kept in the browser; checked at most every 10 minutes, re-read only when a
  file changed. Map studio, Flight maps and the ODV pages get the same database as the workstation; Settings ›
  Maintenance › Aeronautical data shows the published zones and cycle, with "Re-read the published base". The ODV
  orders no longer warn "aeronautical database missing" in GitHub mode while none is published
  (`shared/sia_base.js`, `shared/github_data.js`, `docs/technique/DONNEES_ET_ACCES.md` § 2).

- **Settings › Installation in GitHub mode** (app without the launcher, same on a desktop browser): the page is reduced
  to a single “Data access” card — repository (link) and branch, access status (token check), last successful read
  (new `GitHubData.lastRead()`), writes pending in the browser outbox with a “Synchronise” button, the aircraft type
  database read from the repository, link to the virtual airline website and to My profile › Data access, and a
  sentence saying that local folders, IVAO keys and SIA import are set on a computer with the launcher. The other
  cards (Sources and folders, Keys and external services, Aeronautical data, Aircraft types) and the “First run” tab
  are not built in that mode (`ghAccess` section and `github:false` page flag in `config/repository_tree`); outside
  GitHub mode nothing changes. User manuals (administrator, four languages) updated.
- Technical documentation: `docs/technique/DONNEES_ET_ACCES.md`, map of data storage and access (git data repository,
  browser, website, launcher workstation, apps), shared versus local; linked from `APPLI_AUTONOME.md`.
- **Stand-alone app, step 3: iOS shell** (`mobile/`: Capacitor project, Node only there and only in CI; workflow
  `.github/workflows/ios.yml`) — the built site bundled in a native iOS app, project generated on a macOS runner,
  unsigned simulator build published as an artifact; signed archive and TestFlight upload when the four Apple secrets
  are set (App Store Connect API key, team). Never built yet: the first run of the workflow will tell. Reads of the
  data no longer rely on a service worker (see step 1), so the app's WebView needs nothing more. Settings ›
  Installation › Sources: the “Data repository” field is no longer disabled — in GitHub mode it shows the GitHub
  repository with a link to My profile › Data access; without a git `data/` it points to the first-run card.
- **Stand-alone app, step 2: publication on GitHub Pages, installable app** (`tools/build_pages.py`,
  `.github/workflows/pages.yml`, `manifest.webmanifest`) — static site built from the tracked files (no `data/`), real
  `?v=` stamps, `config/repository_tree.js` copy for the pages (Pages serves the extensionless file as binary),
  commit footer, LFS images; home-screen icons drawn at publication; manifest (start page: Today) and home-screen tags
  on every page; the two `AircraftDB` scripts (aircraft database and performance, never published) are now loaded through
  `shared/data_files.js` on every page (same in launcher mode: suite root), which reads them from the private data
  repository in GitHub mode;
  `index.html` opened without the launcher shows a “Data access” card (My profile) instead of the first run. Checked on
  the built site served statically: every phase-1 page reads the real data, no JavaScript error.
- **Stand-alone app, step 1: data on GitHub** (`shared/github_data.js`, `shared/data_files.js`, `sw.js`; plan:
  `docs/technique/APPLI_AUTONOME.md`) — My profile › Data access (repository, branch, fine-grained personal token, kept
  in this browser only, in localStorage `githubData:v1` and excluded from backups): data is read in the page itself.
  `window.fetch` is overridden for `data/…` addresses (GitHub contents API, conditional requests, offline copy in
  IndexedDB `sogGithubData`); data files loaded as `<script>` are read synchronously by `shared/data_files.js` (copy in
  localStorage, reused at once then refreshed); the folder indexes (`disponibilites/_index.json`,
  `utilisateurs/_index.json`) are rebuilt from the repository tree when absent. It also works in a WebView without
  service worker (iOS app); `sw.js` only keeps the site's own code for offline use.
  Writes go through the API, one commit per file under the trigram: pool files (`MissionAssignments` write sink) and
  the report ledger (`MissionLedger`: written with the sha it read; changed meanwhile → re-read, three-way merge,
  written again). Without that setting nothing changes. Checked against a fake GitHub serving the
  real data: fleet (205 aircraft), availability read and written, report ledger written, two simultaneous reports
  merged.

- **Mobile mode (prototype)** (`shared/mobile.css`, `html[data-mobile="on"]`, set in the header by
  `config/repository_tree`; setting `repositoryMobile`: auto ≤ 760 px or a phone in landscape, on, off; `RepositoryNav.mobile`) — narrow-screen
  layout for every page, with no maximum content width: compact one-line header, the side bar becomes a bottom
  navigation bar (up to 6 entries; beyond, the first 5 and “More”, a panel with the other entries, Settings and Help;
  short labels `mobileLabel`), tabs on one scrolling line, full-width blocks with a compact heading (chevron-only hide
  button, no drag), 40 px touch targets, 16 px fields (no iOS zoom), tables scroll inside their block or turn into
  cards (`table.m-cards`, `td[data-label]` set by the page). Mobile skins (`designs.list[id].mobile`), one chosen by
  default on touch screens (`repositoryMobileSkin`: “mobile” by default, “mobile-swiss”, or “design” to keep the
  user's design): “Mobile” (flat and light) and “Swiss” (Swiss design / brutalist: system grotesque, black and white,
  square corners, a single red accent); both in day and night, following the phone (`html[data-mobile-theme]`: auto,
  day, night; setting `repositoryMobileTheme`). Pages declared `mobile:false` (flight maps, performance sheets, Centre
  generator / studio / registry / ODV planning, Centre / Installation / Maintenance settings) are left out of the
  bottom bar and tabs on touch screens only (`html[data-touch]`), with a “designed for a large screen” notice; a
  narrow computer window keeps every tab. Fleet page: filters folded behind a “Filters (n)” button, taller map, a tap
  opens the aircraft or aerodrome sheet in a bottom panel and selects, one card per aircraft. **Mobile preview**
  (`tools/mobile_preview.html`): a page of the suite in phone and tablet frames on a computer, with the mobile skin and
  day / night chosen (frame named `sogMobilePreview:<skin>:<theme>`: mobile mode forced in that frame only).
  **Appearance › On phones**: mobile mode (automatic, always, never), phone skin (Mobile, Swiss, my design), day / night
  (follows the phone, day, night), link to the mobile preview (Expert level); mobile skins no longer listed among the
  designs. Styles listed as technical debt. User manual (4 languages).
  **Phase 1 pages on phones**: My flights — totals as tiles (flights, block hours, flights without a report, most flown
  types), one card per flight (date and call sign at the top), a tap unfolds the details. Fuel — single column, the Result is brought on
  screen after “Calculate”; blocks scrolled into view stop below the sticky header (`scroll-margin-top`). My missions —
  a tap on a mission brings its folder on screen, the folder actions (create the report, close…) stay pinned above
  the bottom bar while reading. Mission report — one step open at a time (the first one to complete on arrival; opening
  a step folds the others, `shared/mission_core/core.js`), the step bar pinned at the top and marking the open step, the
  mission header no longer pinned (too tall for a phone), “Add to ledger” floating above the bottom bar. My
  availability — “one day” view instead of the week grid (`shared/dispos_week.js`; “Day” / “Week” toggle, kept in
  `disposView:v1`): day bar and the seven days, swipe to the next / previous day (the neighbouring week is read past
  the ends), hours top to bottom in a scrolling frame opened before the day's first availability, a range laid by two
  taps (start, end) with the palette category, “Whole day”, the day's ranges listed with “✕”, “↶ Undo”. Swiss skin:
  palette chips (`repo-plain` buttons) keep their category colours.
  My profile › My aircraft — the Owned / Mastered checkboxes become one state dot (everywhere) cycled by a tap: not
  owned → owned (red) → owned, novice (orange) → mastered (green); “novice” is a new optional list (`aircraft.novice`,
  week files `appareils.neophytes`), always also in `owned`, so the Centre's readers are unchanged; every row action
  (create the performance sheet, remove a variant, find the type / record, correct or delete) moves into a “⋯” menu;
  on phones the table keeps only aircraft, state and “⋯” (`table.m-fit`: a table that fits, layout left to the page),
  the hidden columns are shown in the menu. Appearance on phones — “On phones” first; under a phone skin, the computer
  settings (design, icons, side bar, theme colours) are replaced by a note. Fuel — “Level (FL)” is the only parameter
  outside the “Flight parameters” fold (all screens; the fold stays closed on phones); level labels of the decision
  and climb charts thinned out to stay readable on a narrow chart. Automatic mobile mode also covers a phone in
  landscape (touch screen under 500 px high). Mobile preview: “Orientation” (portrait, landscape, both).
  Phone in landscape (under 500 px high) — navigation as a left rail instead of the bottom bar, header not pinned,
  Fuel curves capped to the usable height so that each one fits with its level slider, cursor card beside the
  decision curve. Mobile header — slides away when scrolling down, back when scrolling up (`repo-header-away`, pinned
  headers only, never while one of its menus is open).
  My aircraft state dot — ODV workbook colours and meaning: red NQ (owned, not qualified), orange to qualify (novice),
  green mastered; ODV setting “All but red” relabelled “NQ: owned, not qualified”.
  Aircraft sheet — no longer a dead end: it sits under the “Fleet” tab (tab `match`, Report › Fleet active), a fleet
  selector (by type) with previous / next of the same type at the top; aircraft and crew sheets save each field as it
  changes (no more “Save sheet” button far below the editable fields, which now come first). Mobile header — when it
  slides away, its first line (title, tools) stays visible; only the CR form's header is unpinned (the rule also hit
  the sheets, Fleet and reporting pages, whose title then scrolled away).
  Mobile header title — up to two lines before it is cut (an aircraft sheet read “D-HA…” at 360 px); the header
  “Synchronise” and “Save” buttons show their icon and count only (label in the tooltip).
- **Report › Fleet: fleet map page** (`apps/cr/flotte.html`, `apps/cr/flotte.js`, `shared/fleet_map.js`) — read-only
  page for everyone, new “Fleet” tab of the side bar “Report” button (now a tab group like “Tools”: “Report”, “Fleet”;
  family report pages keep the button active). Every fleet aircraft at its current aerodrome
  (`AircraftPositions.whereIs`: website location or mission-order report, else home base; coordinates from
  `MissionAssignments.coordsOf`), on an OpenStreetMap background (MapLibre). Overview: one badge per aerodrome with the
  aircraft count; aerodromes whose badges (or aprons) overlap on screen are merged into one badge with the total count,
  recomputed at each zoom; zoomed in, the aircraft are lined up on an apron. Hover: count per callsign series and type
  (and per aerodrome for a merged badge), or the aircraft short sheet with the date and time of its last flight (DEFA
  flight log and mission log, latest wins). Selection by click (Ctrl / Shift: add or remove), Shift + drag rectangle,
  Esc. Combined filters at the top of the map (operator, type, callsign series, aerodrome, status, position origin,
  last-flight age, free search; kept in the browser). Table of the aircraft kept by the filters: sortable, row hover
  highlights the position on the map, row click selects and centres. With the Centre enabled, “Edit the fleet” leads to
  Settings › Centre › Fleet, which links back with a “Fleet map” button. Framework blocks, 4 languages. User and
  administrator manuals (4 languages).
- **Fuel and Flight maps: “Open in ▾”** (`shared/external_links.js`) — a short menu that opens the page's flight in
  another service, in a new tab: “SimBrief — plan this flight” (dispatch options prefilled: departure, arrival, type,
  route, registration, airline and flight number from the call sign, alternate, level), “SkyVector — the route”
  (`?fpl=`), “Navigraph Charts” and “ChartFox” for the departure and arrival aerodromes. Built from the flight plan,
  level and aircraft of the page (Fuel: alternate, call sign and registration of the last SimBrief OFP when it has the
  same route); nothing else is sent; a greyed-out entry gives its reason. Fuel: in the flight plan row; Flight maps:
  page header. Formats checked in `docs/technique/V2_FABLE.md` § 14 (Navigraph and ChartFox to be confirmed signed in).
  Pilot manual (4 languages).

### Changed

- **User manual: new screenshot of My availability** (`docs/images/captures-manuels/utilisateur-disponibilites.png`) —
  the timeline (one rectangle per availability with its times, background bands, palette with "Clear background",
  folded "How to use"), instead of the former hourly grid.
- **Performance sheets on phones (portrait)** (`apps/planner/flight_planner.js`, `apps/planner/flight_planner.css`,
  `config/repository_tree`) — the page is offered on phones (no more `mobile:false` and "large screen" banner): short
  title "Sheets"; the sheets table becomes a list of cards (aircraft, origin, what is missing), the map, cruise flow
  and ceiling shown with their labels on the chosen line; the sheet's sections are folded one by one (`<details>`,
  kept open across redraws) in a single column; touch targets of at least 40 px. Large screens unchanged.
  `tools/mobile_preview.html` lists the phase-2 pages (Board, Help, Performance sheets). User manual (4 languages).
- **Help on phones: the text first** (`apps/aide/aide.html`, `apps/aide/aide.js`) — in mobile mode the contents
  (search, index, outline) are folded behind "Contents ▾" at the top (a link followed closes them) and "↑ Contents"
  at the end of each chapter reopens them; the text of a manual now starts right below the header instead of after
  4,000 px of menu. Large screens unchanged. User manual (4 languages).
- **ODV Board on phones: the day's strips as a list** (`apps/cpco/odv_orders.js`, `apps/cpco/odv_orders.html`) — in
  mobile mode the order of the day lists the strips by start time (start–end z, call sign or label, aircraft, crew,
  mission, status); a tap opens the strip's window (read-only when the page is); "Timeline" shows the 24-hour
  timeline and "List" goes back. The "aeronautical database missing" notice is shown from level 2 only (`minLevel`).
  Planner manual (4 languages).
- **ODV Board and planning: why the page is view-only** (`apps/cpco/odv_core.js` `OdvCore.readOnlyReason` /
  `showReadOnly`, `apps/cpco/odv_orders.js`, `apps/cpco/odv_planning.js`, `shared/repository_nav.js`) — instead of
  the generic "read-only without the Centre" notice, a floating notice gives the actual reason with a link to the
  setting that fixes it: Centre locked in this browser (Settings › Centre), Crew level (My profile › Usage level),
  signed-in account without the `admin_centre` role, production mode without an admin sign-in; in GitHub mode it
  adds that the Centre lock and the level are settings of this browser. Planner manual (4 languages).
- **My missions is the pilot's entry page; Today merged into it** (`apps/pilot/mes_missions.html`,
  `shared/pilot_today.js`, `shared/dispos_week.js`, `apps/pilot/aujourdhui.html`, `config/repository_tree`,
  `manifest.webmanifest`) — at levels 1 and 2 the page holds four blocks on one 1,400 × 900 screen and says first what
  there is to do: "My next mission" (time UTC, mission, aircraft, airfield, callsign; "Open the folder", "Flight
  maps" and "Fuel" when the suite offers those tools, "Create the report"; then the missions of the next seven
  days, one line each, seven at most), "Reports to write" ("Write the report", "No report"), "My availability" in
  a compact form (one box per day, "D+ 17:00–22:00"; its own week bar at every level; "Edit my week" unfolds the
  editor in place, unfolded at once for an empty week; `DisposWeek.mount(host, { compact: true })`, the timeline
  module untouched) and a line of links (My flights; Pilot, Aircraft mastered, Simulators from level 2). Empty blocks
  are one line ("No upcoming mission.", "No report pending.", "No availability entered this week."). The full week
  list (week bar, past missions) comes at level 3; the folder is unchanged, full width at levels 1 and 2. Folder links
  open the folder in place and then run `?do=maps | fuel | cr` (the folder is opened for it). `aujourdhui.html`
  redirects to My missions (query and hash kept) and leaves the sidebar and the phone bar; the web app starts on My
  missions, and so does GitHub mode once enabled. User manual (4 languages): the Today and My missions chapters
  merged; `docs/technique/V2_FABLE.md` § 2.1.
- **SimBrief: what was read, and the route points in Fuel** (`shared/simbrief_ofp.js`,
  `shared/flight_vertical_profile.js`, `apps/planner/flight_performance_planner.html`, `apps/cpco/map_parser.html`) —
  a shared module reads the OFP (navlog points in `json=1` and `v2`, alternate, summary, reason when there is no
  point-by-point route, JSON window with "Copy"). After "Fetch latest SimBrief FPL" (Fuel) and the route block's
  "SimBrief" button (Flight maps), a line says what was read ("OFP of 19/10 · LFRS → LFML · 11 points · FL270 ·
  alternate LFPG · S210 F-BHHH", with "View the JSON"; Fuel also shows it as a notification); an OFP without
  navlog points says why ("empty navlog", "navlog without positioned point") instead of silently giving a route of
  two airfields. Fuel lists the route points under the flight plan (airfields in bold, airway points dimmed, level
  changes, position on hover), so the route can be checked without opening Flight maps.
- **Flight maps: lighter page** (`apps/cpco/map_parser.html`, `tools/build_map_planner.py`) — MapLibre (~800 KB) is
  loaded at the first map preview or generation (`ensureMapLibre`) instead of in the page head; the assembly map is
  no longer rendered off screen while its block is hidden (levels 1 to 3), it is rendered when the level shows it;
  a route edit (editor, field, SimBrief, route search) is saved and drawn once: `vprof-route-edited` is cancelable
  (`routeEdited`) and Flight maps cancels it when it rebuilds the flight itself (one mission save and one profile
  drawing instead of two); the live preview shows the route once (the editor's red line; the purple dashes stay on
  generated maps); the AAR tracks file is parsed once; an alternate missing from the SIA database no longer blocks
  the flight (warning, maps made without it). Dead code removed: `territory` / `inTerritory` / `zoneCentre`,
  `airspaceGeoJson` / `addInteractiveAirspaces`, `zoneFamily`, `zoneFloorFt` / `zoneCeilFt`, `outputLabel`, the
  settings / preview splitter (`setSplit`, `.splitter`).
- **Flight maps: map and vertical profile linked** (`shared/carto/vprof_editor.js`, `apps/cpco/map_parser.html`) — a
  shared cursor follows the route in both views (hovering over the profile marks the map, hovering over the route on
  the map draws a line in the profile); the profile's tooltip adds the distance (NM) and the airspace under the cursor,
  highlighted on the map; clicking a profile point without moving it centres the map on it; TOC / TOD and NM
  graduations are set along the route on the map.
- **Flight maps: open on the current flight, IFR route map, no ZIP** (`tools/build_map_planner.py`,
  `apps/cpco/map_parser.html`, `shared/flight_vertical_profile.js`) — the flight shared with Fuel
  (`flightPlanShared:v1`) now carries the route, the cruise level, the aircraft's sheet and the alternate (from the
  last SimBrief OFP when it has the same trip); at opening, the most recent one wins over the stored mission (it was
  replaced by the stored route before) and the route map and the vertical profile are shown at once. The route map uses
  two new display profiles of the studio, "IFR low" and "IFR high", chosen from the cruise level (FL195): airways of
  the band, ICAO symbology, R / D / P / TRA / CTR / TMA / CTA zones of the band within 10 NM of the route (`corridorNm`,
  `selectedAirspaces`). New "Alternate (ICAO)" field (mission point `alternate`, passed to "Open in ▾"). No ZIP any
  more in Flight maps: the images (maps and `profil_vertical.png`, now on by default) are shown in the "Maps" block
  with "Download", "Print" and "Print all" (`window.SiaDeliver`, studio `deliverFiles`); the Centre's map studio keeps
  its ZIP.
- **Aircraft picker in the mission report, My aircraft, Landing and the vertical profile** (`shared/aircraft_picker.js`,
  `shared/mission_core/form.js`, `assist.js`, `shared/equipment_editor.js`, Landing Performance,
  `shared/carto/vertical_profile.js`) — the shared drop-down list with search (5.3.0, Fuel and Performance sheets)
  now serves:
  - mission report (16 families): the registration and ICAO type fields of each aircraft, in field mode instead of
    the browser's datalist — same values (`suggest`, cross-filtering), same effects (a choice is an entry: `input`
    then `change`, hence known aircraft, auto-filled values and assistants), silhouettes and categories
    (`AircraftDBIcons` now loaded by the report pages);
  - My aircraft (Settings › My profile) and the "Add an aircraft" window: `attachSuggest` is the picker in field mode
    (results of `makeSearch` kept as scored, grouped by origin — fleet, this computer's base, ICAO list —, no entry
    active by default so Enter still adds the typed text, list closed when empty); its own list and CSS are removed;
  - Landing Performance: the "Aircraft" button ("All", then the types by category; the hidden select keeps the
    value); the former menu, its CSS and `aircraftGroupOf` are removed;
  - Flight maps and map studio, vertical profile: `SiaProfile.aircraftChoice` replaces the copy of
    `fillVprofAircraft` in both pages; the choice is shown as soon as the page opens.
  The component keeps one set of document listeners for all pickers and puts its list in the page only while open; a
  field opened by a click shows the whole list with its value highlighted; new options `limit`, `openOnClick`,
  `filter: false`, `activeFirst: false`, `hideEmpty` (docs/technique/FRAMEWORK.md).
  - Centre: the aircraft of a post in the assignment window (`AssignDialog`), the ODV planning matrix and the
    aircraft table of a flight in the flight orders, through `AircraftPicker.fromSelect` (a native `<select>` shown by
    the picker: options, groups, disabled entries with their reason — "already taken", "unavailable" —, the hidden
    select keeps its value and `change` events; "other (type in)…" keeps its entry window). `planeOptions`
    (odv_orders.js), never called, is removed.
  - free ICAO type fields: the Fleet base (Settings › Centre), an aircraft's type in the mission editor's YAML tree and
    the AAR receivers' type, through `AircraftPicker.typeField` (the catalogue's type base by category, values
    already entered first, free entry kept).

### Fixed

- **Launcher start: "cannot pull with rebase: You have unstaged changes"** (`tools/launch.py`, `tools/data_sync.py`
  `update`) — the start-up `git pull --ff-only` stopped on any local change (and followed the user's `pull.rebase`). The
  launcher no longer pulls: it commits the pool files changed on the workstation ("Modifications du poste <TRI>", same
  rules as "Synchronise"), merges the remote branch record by record and pushes nothing. A file outside the pool changed
  locally (`sia/mora.csv`) is left as it is; when the update would overwrite it, the update is put off and the console
  names the file. Generated indexes, conflict copies and the launcher marker go to `.git/info/exclude`. The console says
  what was done. Synchronisation steps shared with `run`. Administrator manual ×4, `INSTALL.md`,
  `docs/technique/SYNCHRONISATION.md` § 9; `python tools/data_sync.py --essai` covers it.
- **Maintenance on a workstation with the launcher, GitHub mode set in the same browser: the workstation's cards were
  missing** (`shared/maintenance_page.js`) — the page preferred GitHub mode to the launcher: "Aeronautical data" only
  offered "Re-read the published database", and building or publishing the SIA database, the MORA or the aircraft
  database could not be done. When the launcher serves the page (one `/__setup/status` probe, in GitHub mode on a local
  address only), Maintenance now shows all its blocks and buttons, with on "Aeronautical data" and "Aircraft types" the
  sentence "GitHub mode active in this browser: the data read come from the repository, publications are made on this
  workstation (launcher)". Without the launcher, the GitHub variant is unchanged. Administrator manual ×4.
- **Launcher confirmation window: "not confirmed" without saying why** (`tools/launch.py`,
  `apps/settings/premier_lancement.html`) — taking `data/` into a repository other than the configured one (or changing
  the synchronisation repository) answered "refused, closed, or window impossible to open" whatever happened. The window
  is now system-modal and announced in the launcher's console, and the page gets the actual reason: refused (with the
  seconds left before a new try), another confirmation window already open, or no window possible on this computer. The
  routes answer `needsConfirm`, and the page warns before the window opens (`dry` call for the take-over, "Check" for the
  repository address). User manual ×4, `docs/technique/SYNCHRONISATION.md` § 9.
- **First run in GitHub mode: step 1 "Folders" stayed to do, with a button that only refused**
  (`apps/settings/premier_lancement.html`) — with My profile › Data access set, the data come from the GitHub repository
  and there is no folder to choose: the step is now "not applicable" (–) in the rail, its badge and the checklist, the
  next steps open, and "Finish" no longer waits for it. The application folder card and "OneDrive folder…" are hidden
  ("or the Excel file…" stays for the ODV workbook); one sentence names the repository and, on a page served by the
  launcher, says that GitHub mode wins and where to remove it. User manual ×4 updated.
- **Settings: an aircraft table appeared in whatever section was open, some ten seconds later** (`shared/data_admin.js`) —
  the sections of My profile and Settings shared one body: "Aircraft and simulators", slow to read its data, wrote its
  table into the section shown when it finished, and could clear that section's buttons and status line. Each section
  now gets its own body, and a section left behind no longer touches the page.
- **GitHub mode: pages waited about ten seconds for availability and user indexes** (`shared/github_data.js`) — the
  folder indexes (`disponibilites/_index.json`, `utilisateurs/_index.json`) were rebuilt by reading every file of the
  folder, one request after the other, and twice per page. Each file's entry is now kept with the blob SHA the repository
  tree gives, so only changed files are read, six at a time; readers of the same tree share one build. Kept in this
  browser (`githubData:entries`, excluded from backups like the other `githubData:` keys, cleared with the access).
- **Availability: Undo forgot every gesture when the language changed** (`shared/dispos_timeline.js`,
  `shared/dispos_week.js`, `labs/dispos_timeline.html`) — the page mounts the component again to change its texts, and
  each mount started a new history. The component takes a new `undoStore` option, a `Map` kept by the page; My
  missions and My availability pass the same one to each mount, so Ctrl+Z and Ctrl+Y still reach the gestures made
  before the switch. The history starts afresh when the categories or the pilot change; the example page keeps it
  across a density change. Module spec and integration guide updated.
- **My missions on phones: the "Day" view could not be seen** (`shared/dispos_week.js`) — in the compact availability
  block (since the entry page), the Day / Week switch was inside the folded "Edit my week", so with a week already
  filled in (GitHub mode, real data) the phone showed no "Day"; an empty week (preview, sample data) unfolded it. The
  switch now sits above the summary, choosing a view unfolds the entry, and a tap on a day of the summary opens the
  entry on that day (Day view on phones). User manual (4 languages).
- **Fleet map and Maintenance zones map: "Access blocked" instead of the background** — both used raster tiles from
  `tile.openstreetmap.org`, which refuses this use. They now use the vector background OpenFreeMap Positron, like the
  map studio's defaults (`shared/fleet_map.js`, `shared/maintenance_page.js`).
- **Performance sheets in GitHub mode: a deleted sheet came back at the next reread** — it was removed from the browser
  only. “Delete (n)” now also removes it from `planner/flight_performance_database_merged.fpdb.json` of the data
  repository (`sha`-checked write, retried when another pilot changed the file meanwhile); “Undo” puts back the removed
  sheets without overwriting other changes (`apps/planner/flight_planner.js`).

- **GitHub mode: two commits for each availability week or profile written** — the folder index
  (`disponibilites/_index.json`, `utilisateurs/_index.json`) was written to the data repository with every file. It is no
  longer written (nor sent from an old outbox entry), and it is always rebuilt from the repository tree, never read from
  the repository, where a copy left by an earlier version would be stale. On a workstation, "Synchronise" untracks an
  index still tracked in the repository instead of failing the merge on the launcher's rebuilt copy; the data repository
  template ignores `**/_index.json` (`shared/assignments.js`, `shared/github_data.js`, `tools/data_sync.py`).

- **GitHub mode: remembered folders are ignored** (`shared/file_access.js` and its users) — a browser that had once
  authorised a folder (launcher workstation) kept reading it in GitHub mode and repeatedly warned “Assignments: the
  authorised missions folder and the files served by the page differ (another copy?)”. One decision point:
  `FileAccess.get()` returns no folder when `GitHubData.on()` (so `status()` says “not chosen”, `sameAsServed()` has
  nothing to compare, `set()` keeps nothing, `pickFolder()` refuses with an explanation, `decorate()` hides the folder
  button); `missionsSource()` and the other direct users are explicit too: the report ledger (`directory()`), the
  missions registry (no folder, no “Re-read folder”), the browser backup (no backup-folder button: the archive is
  downloaded), the SIA base block (a sentence says the base is not available in this mode), Settings › Maintenance
  reference files (“Save to repository” commits through GitHub instead of asking for the application folder), the ODV
  workbook (chosen by hand each time). Launcher mode is unchanged.
- **GitHub mode: the performance sheets were empty** (`apps/planner/flight_planner.js`) — the profiles were read only
  from the remembered performance folder. They are now read from `planner/flight_performance_database_merged.fpdb.json`
  of the data repository when the page opens (browser copy refreshed in the background) and by “Reread”; a sheet of
  the repository replaces the browser's one only if it is more recent, so an edit not yet saved is never overwritten.
  “Save to the repository (n)” writes the ticked sheets back into that file (one commit, conflict-checked with the
  file `sha`, merge redone if another pilot saved meanwhile); no folder button, status line and intro say so in four
  languages. Deleting a sheet stays local to the browser (the repository file keeps it).
- **GitHub mode: pages survive without `AircraftDB/` in the data repository** — the aircraft type base and
  performance files are read from the repository root; when absent, every page that uses the base now runs on an empty
  one and says it once per page (“Aircraft type database missing from the data repository (AircraftDB/): type names and
  performance unavailable”, four languages, `shared/aircraft_catalog.js`); the type completion no longer calls a
  launcher that does not exist (a “Launcher stopped” notification per type), and the on-demand loading of the types
  performance (`shared/equipment_editor.js`) reads it from the repository instead of the code site.
- **GitHub mode: Settings › Maintenance reduced to what works without launcher or folders** (`shared/maintenance_page.js`)
  — kept: versions (without git, SIA folder or synchronisation rows), aeronautical data (one sentence: the base is
  produced on a workstation with the launcher), browser caches (without the SIA base and update-check caches), disk
  space (browser only), browser backup (downloaded archive, no folders, no “Changes since”), journal; not built: updates
  (git), references and dependencies, aircraft types (rebuild), and the git synchronisation (`shared/sync.js`) and
  site-download (`shared/defa_site.js`) launcher calls. Block lists are decided when built, never hidden afterwards.
- **GitHub mode: mission files** — page code no longer asks for files that cannot exist: legacy per-family report
  ledgers (18 API requests per fresh browser), launcher endpoints (`mission-folders`, `defa-site`, `sync`); mission map
  images, when the repository has them, are read through the API and shown as object URLs (a `data/…` address cannot
  load in an image tag); absent maps (excluded from git) still show “map not available” without error.
- **ODV orders: “Cannot read properties of undefined (reading 'weekId')” on reopening** (`apps/cpco/odv_orders.js`) —
  with the browser copies of GitHub mode the page started before the shared availability module was inserted; it now
  waits for the `load` event.
- Phone (Safari iOS): floating notifications no longer fill the whole screen (the popover container was stretched to the viewport height and the grid stretched every message with it); rows sized to their content, aligned at the bottom, each message capped at 40 % of the screen height.
- **Passwords: "not saved" after setting one** — the Centre password (*Settings › Centre › Mode and access*) was
  written to the data folder but announced "kept in this browser: authorise the data folder", because the page
  checked for a result that writing never returns (`'data'` instead of `'folder'`, `shared/data_admin.js`). Changing
  one's own password (*My profile › Sign-in and password*) now says "Password changed in this browser only: …" with
  the reason when the user file could not be written to the data folder (`shared/settings_panels.js`).
- **Aircraft sheet: "Home aerodrome" taken from the flight log instead of the Fleet page** — F-ZBMC, based at LFTW
  on the Fleet page, showed "Home aerodrome HCMK", the reference's estimate (most frequent departure, during a
  deployment), which also overrode the base in the common catalogue. The Fleet page's base and home aerodrome now win
  (`shared/aircraft_catalog.js`). The sheet stores a home aerodrome only when it is typed; an old sheet that had frozen
  the estimate gives way to the Fleet page's base (`shared/mission_core/sheets.js`).
- **Settings › Installation and Maintenance on a narrow screen** (`shared/maintenance.css`) — below 900 px the page is a
  single column, but each block stayed pinned to the second grid column, squeezing it beside the menu; it now sits
  under the menu.
- **Settings › Installation › Sources: data repository shown empty** (`shared/maintenance_page.js`) — the “Data
  repository (private)” field only read a browser setting, while the first run saves the address as the remote of
  `data/` (git, through the launcher). The field now shows that remote (`/__setup/sync-remote`), accepts SSH
  addresses (`git@…`) and saves a change through the launcher, as the first run does.
- **My profile: the personal IVAO OAuth client card was hidden below the Expert level** — it is now shown at every
  level (the IVAO prefill it serves is available from level 1).

- **“Open in ▾”: SkyVector speed and level always sent, departure time copied** (`shared/external_links.js`) — the
  speed/level group only left with a route that carried one (`N0450F350`), so a plain route sent neither speed nor
  level, even with the flight level set. A route without a group now takes the cruise TAS (SimBrief OFP when it
  matches the trip, otherwise the aircraft sheet; Fuel and Flight maps) with the flight level. SkyVector has no
  address parameter for the ETD: the OFP departure time is copied on click, to paste into its ETD field; the menu
  entry's tooltip says what is sent.

- **SimBrief OFP, json v2: the navlog read as a list** — the "Fetch latest SimBrief FPL" route kept only the airfields and the speed/level group with a json=v2 OFP, whose `navlog` is directly the list of fixes (the reader looked for a `fix` container inside each fix). Checked on a real LFRS → LFML OFP: twelve waypoints, SID and STAR included.
- **“Open in ▾”: SkyVector speed and altitude, SimBrief route** (`shared/external_links.js`) — SkyVector gets the
  ICAO speed/level group at the start of `fpl` (the only form it reads: speed and altitude of its Flight Plan panel;
  no address parameter fills the aircraft or the ETD); SimBrief gets, from a SimBrief OFP route list, only the named
  waypoints (no coordinates, no aerodromes), with the level of the route group when the flight has none.
- **“Open in ▾”: SkyVector now takes the route** (`shared/external_links.js`) — SkyVector resolves each name on its
  own, so pseudo-points of a SimBrief OFP route (`TOC`, `TOD`, `WPT`) were sent to far-away namesakes (Toccoa, USA)
  and airways or procedures were ignored. SkyVector now gets names of 2 to 5 letters and ICAO coordinates
  (`4341N00122E`) built from the OFP route positions for unnamed points; airways, procedures and `DCT` are left out.
  SimBrief gets the same coordinates for unnamed OFP points.
- **Last SimBrief flight plan: waypoints and alternate** (`shared/flight_vertical_profile.js`,
  `shared/mission_core/fpl.js`, `tools/build_map_planner.py`) — Fuel: the OFP's alternate was never passed to Flight
  maps (departure and arrival were read from the last word of the "ID lat lon" route, a longitude; the `json=v2`
  alternate is a list). Flight maps: a new flight from Fuel brings its own alternate instead of keeping the previous
  flight's one, which could block the rebuild ("unknown alternate") and leave the old waypoints on screen. Mission
  report ("Filed flight plan — Last SimBrief OFP"): the waypoints follow the imported route (navlog fixes) instead of
  keeping those of an earlier flight.
- **Fuel: "Get latest SimBrief FPL" kept only the two airfields** (`apps/planner/flight_planner.js`) — the navlog
  was searched depth-first through the whole OFP and an earlier block could be taken for it, so the route came back
  as departure, speed / level group and destination only. `findNavlog` now reads the OFP's own `navlog.fix` first
  (`json=1` and `v2`); every fix except TOC / TOD is kept, SID / STAR points included.
- **Flight maps: "SimBrief" button takes the waypoints** (`apps/cpco/map_parser.html`, `tools/build_map_planner.py`) —
  the route block's "SimBrief" button took only the ATC route (field 15), so the points along airways were not route
  points of the flight; it now writes each navlog point with its position ("ID lat lon", same form as Fuel; field 15
  kept as a fallback without positions) and, in Flight maps, fills the alternate.

### Security

- **Device enrolment and revocation (signed accounts L4, S2)** — My profile › "This device" shows the device
  fingerprint and state, lets a pilot confirm the group registry (no Centre tab needed) and "Request access": a request
  signed with the device key (proof of possession) in `data/utilisateurs/demandes/<TRI>_<kid>.json`, written through
  the launcher's data folder or as a commit in GitHub mode. Settings › Centre › "Group mode" lists the requests with the
  fingerprint recalculated by the admin's page ("Approve": new registry version with the key, user created if needed;
  "Reject": request removed), the device keys ("Revoke": new version without it; deactivating a user revokes all their
  keys) and, once two admins have a device key, "Activate the group" (`etat: actif`, `actif_depuis` starts the 30 days
  of accepted unsigned data). The launcher lists the requests (`/__setup/data-list`, `utilisateurs/demandes` only);
  in GitHub mode the registry history comes from the commits API (`GitHubData.history`), so a phone can join a group
  whose registry is past version 1. 7 new tests in `tools/crypto_banc.html` (52 in all).
- **App without launcher: immediate measures (S1)** — every page of the GitHub Pages site (and the iOS app built
  from it) carries the content security policy as a meta tag, built by `tools/build_pages.py` from the list shared with
  the launcher (`tools/csp_policy.py`): pages may only contact the suite, the GitHub API and the listed services.
  Settings › My profile › Data access asks for a fine-grained token of 90 days at most, explains “Cut access” and what
  to do with a lost phone, and warns, on a `….github.io` site, that every other Pages site of the account shares the
  origin. “Allow this website…” only shows on a launcher page. Keychain storage in the iOS app needs a native plugin:
  not done, noted in `APPLI_AUTONOME_SECURITE.md` § 6.
- **Signed user registry, group mode** (signed accounts, batch L3; `shared/sog_registry.js`, Settings › Centre ›
  "Group mode (signed registry)") — in group mode, roles, state and password hashes come from
  `data/utilisateurs/_registre.json`, a signed envelope verified by every browser: next version signed by an admin (or
  the recovery key) of the accepted one, unbroken `precedente` chain, no rollback (last accepted version kept in
  IndexedDB), missing versions read from the data git history (`/__setup/registre-historique`); version 1 accepted on
  first use after the founder's fingerprint is confirmed on the device ("Confirm" / "Reject" notification). A user file
  that gives itself a role no longer has any effect; a role, state or password change is a new version signed with the
  device key of a registry admin. "Switch to group mode" (Centre enabled, launcher CSP required) writes version 1 from the
  existing user files with the current user as first admin, and downloads an encrypted recovery key; "New recovery key",
  "Use the recovery key" (makes a trigram admin with this device's key), "Re-found the group", "Back to standalone
  mode". While the group is being set up (fewer than two admins with a device key) the Centre stays accessible with its
  password; once active, through a registry admin's device key. `data_sync.py` keeps the highest registry version on a
  git conflict. 14 registry tests in `tools/crypto_banc.html`.
- **Switch-off for navigations from another site** — to work with an extension (Claude in Chrome sends its
  navigations as coming from another site): HTML pages only, confirmed in the launcher window, valid until the launcher
  closes, with a red button in the header to turn it back on.
- **Read-only folders** (audit of 7 October, batch 4b) — the application folder, the X-Plane ones, the ODV workbook
  and the folders added to the backup are opened read-only; a trapped script can no longer rewrite the suite's code nor
  drop a plug-in into X-Plane. Write access to the data (`data/`) is asked separately, right after choosing the
  application folder ("Allow writing the data", then the browser prompt) and with the "Allow" button after a restart;
  one-off writes (restore, AircraftDB) are asked only on click. Sub-folders of `data/` are taken without write access
  if they exist; the local backup goes to `data/local`, no longer to the application root. Settings › Installation
  shows "authorised (read)".
- **Content security policy (CSP) sent by the launcher** (audit of 7 October, batch 4a) — pages may only contact
  (fetch, maps, workers) the suite, a fixed list (map backgrounds, relief, Overpass, SimBrief, IVAO, VATSIM, weather,
  airport database) and the addresses of `config/repository_tree`; scripts limited to the suite's own (inline included)
  and pinned pdf.js / acorn; no `<object>`, no `<base>`, no form to another site. A trapped script can no longer send the
  data elsewhere by request. Another wanted site (report web service, other repository) is added with "Allow this
  website…" in the block notification, confirmed in the launcher window; list and "Remove" in Settings › Installation ›
  Sources and folders. The launcher reports `csp: true` (prerequisite for the group mode of signed accounts). Images and
  navigation stay open (documented residual leak).

### Livraison

- Archive de livraison : `xplane-web-suite-5.4.0.zip` — SHA-256 `aa79dfdc83e24e67f19f25d289f4bf49793c11dd35b8166d778f0400cfa42b01` (code seul, hors dépôt : dossier `dist/`).
- Module package: `dispos-module-5.4.0.zip` — SHA-256 `b4ce114db4938b25af740f891167dcf1528f8887f8bb995b966d5a45e2616822` (outside the repository: `dist/` folder).

## [5.3.0] — 2026-10-19

The mission report is rebuilt around what a pilot does: one "Prefill ▾" menu gathers every source (a mission order,
one of my flights, my last IVAO or VATSIM flight read through the launcher, a filed flight plan, a pasted tracker page
or METAR, a file), the form is read in three steps — Flight, Mission, Result — with prefilled blocks shown as one-line
summaries, and each block says where its values come from. The availability editor is a new module: a continuous
time axis, rectangles drawn, moved and resized to five minutes, unavailability as a background, undo, delivered
separately with its specification and integration prompts. Performance sheets have their own page, Fuel keeps the
plan only, and one aircraft picker with search serves the suite. "My flights" lists the pilot's past flights, "Keys
and external services" holds every suite key in one place, and the aircraft type logic (classification, lookup,
names) lives once in the shared framework.

### Added

- **Mission report: prefill from my last IVAO / VATSIM flight** (`shared/mission_core/core.js`, `tools/launch.py`) —
  a "My last flight" part in the report's "Prefill ▾" menu ("Complete this report from…"), from level 1, with an IVAO
  and a VATSIM entry (greyed out with "IVAO VID missing — My profile ↗" when the profile has no ID; the IDs come from My profile
  only). The launcher reads the pilot's flights of the last 7 days (`/__setup/ivao/last-flight`: IVAO tracker API
  with the suite's key, never sent to the page, all result pages; `/__setup/vatsim/last-flight`: public VATSIM history
  and filed plans), rolling window in UTC, never dependent on the report family or date; one flight is applied at
  once, several are offered as a list (call sign, route, UTC times, "in progress" for an open session, a ↗ tracker
  link per line); an empty list says which ID and period were searched; open sessions and empty lists are never
  cached. A flight cut by disconnections (same call sign, next session within 30 min resuming where the previous one
  stopped, the previous one not ending on blocks — checked on the tracks) is one entry, "3 sessions (reconnections)":
  flight plan of the last session, tracks put end to end, all session ids kept, breaks listed. The flight comes back
  in the tracker-paste format (ICAO flight plan text, track samples) and goes through the same prefill as a paste
  (`MissionTextImport.apply`, empty fields only), including `REG/` registration and track times; VATSIM gives
  connection times only (no track). "View on the IVAO tracker ↗" next to the button and to the "Track URL" field as
  soon as a flight is taken or pasted. Pasting a tracker page stays in "Analyse / import…" (level 3). Pilot manual
  (4 languages) and operations manual (external services) updated.
- **Tutorial "Write your first mission report"** (`docs/tutorial/first_report.fr.md` / `.en.md`, Help › Tutorials;
  the help already listed it, the file was missing) — the report from start to finish: open it from an assigned
  mission, from a flight without a report in My flights, or from scratch; family and series; the aircraft (what the
  assistant fills in); "My last IVAO / VATSIM flight" or a pasted tracker page; times (local) and route; result, crew
  and family blocks; save; send (web service, airline website with the "→ Vol" bookmark); find the flight again in My
  flights. Block names quoted as on screen, no screenshots.
- **"My flights" page** (`apps/pilot/mes_vols.html`, side bar under "My missions", level 1) — the pilot's past
  flights, most recent first, one per line: date, call sign, aircraft (the shared name cell), route, block duration,
  mission, report. Sources merged by date, call sign and registration without duplicates (the report wins): the pilot's
  reports in the report ledger and the airline flight log imported from the website, filtered on the trigram; more
  sources plug in through `window.MyFlights.addSource` (IVAO, VATSIM later). Period (7 / 31 days, 12 months by
  default, all), search, totals (flights, block hours, three most flown types), CSV export of the list shown, link to
  the detailed analysis. A row opens its report; a log flight without a report unfolds its details with "Write the
  report", which opens the family's report pre-filled (date, call sign, aircraft, route, declared block time) through
  the mission order's gateway (`?from=sia`, new `__flight` part). Under 800 px: date, call sign, route, duration. Links
  from My missions and from the report's "Send" menu.
- **Mission report: record the flight on the airline website** (`shared/mission_core/core.js`) — the report's "Send"
  menu (the web service's "Send report", now grouped with it so the toolbar keeps seven entries) gets an "Airline
  website" part when the site address is set (`RepositoryNav.vaUrl("recordFlight")`, `/selection_appareil.php` in
  `config/repository_tree`): "Record the flight on the website ↗" opens the site's "Enregistrer mon vol" page with the
  flight's fields in the fragment (`#defa=`, base64url JSON, never sent to the server); the "→ Vol" bookmark, dragged
  once to the bookmarks bar, goes to the aircraft (by registration), then to "Ajouter un vol", and fills it by field
  name — call sign chosen in the site's list by name or code, flight number, end-of-flight date (report date and
  on-block or landing time, local time like the report's timeline, next day past midnight), block (else flight) duration, mission, arrival; the site's
  read-only fields (registration, departure) are compared and differences reported; nothing is ever submitted. The
  fields survive the site's login in its session storage. Fallback: "Copy the fields" (one line). The suite never
  logs in to the site.
- **Availability timeline module** (`shared/dispos_timeline.js`, formats in `shared/dispos_formats.js`; in the suite's
  pages through `shared/dispos_week.js`, see Changed) — a stand-alone component, with no dependency on the framework, to enter one person's availability
  for an ISO week on a continuous time axis, in UTC. Background bands give the nature of the unavailability;
  availability rectangles sit on top, with square corners, the start time on the left, the type centred and the end
  time on the right. One state per minute: under a rectangle the background does not count, but it stays in place, so
  a moved or deleted rectangle gives it back.
  - One rule for every gesture, whatever the brush: a gesture that starts on an availability rectangle takes it —
    click selects, drag moves (5 min steps, to another row: same times, another day), the edges resize, Shift+drag
    draws over it; a gesture that starts anywhere else (empty space, background band, gutter) draws with the brush.
    Background bands are not objects: around an availability they only fill the rest of the day (00:00 to it, it to
    24:00), so they are never selected or moved, and an availability in the middle of a day covered by a band moves
    on its own.
  - Across several rows, a selection rectangle lays the same hours on each day it crosses, started anywhere (empty
    space, background band, gutter between rows). The last shape wins, and a background drawn through an availability cuts it, live.
  - A palette entry dropped on a shape changes its nature; dropped on a day (empty part of the row, day name) it fills
    the whole day, and a background entry then changes only the background. Double-clicks replace the background of
    a day or of the week, never removing an availability.
  - Keyboard, long press, undo history (Ctrl+Z / Ctrl+Y, 50 steps per week), repeating period box across weeks, hover
    text giving the visible range. A "How to use" panel (option `help`: open, `"collapsed"` or off) explains it in
    nine short paragraphs, in the order of use; `replace(data)` imports a week as one step that can be undone.
  - Two densities, a mount option that changes sizes only. `compact`, the default, has the look of the former cell
    grid: rows of 22 px, hour cells with the hours 0–23 above them, "Mon 12/10" day labels, and palette chips such as
    "O For anything" on four lines (Available, Exercise, Busy, Unavailable); still one letter per rectangle, with
    its times, shortened ("8 O 12") when the rectangle is narrow. `comfortable` has rows of 44 px. A gutter
    above the first row and below the last lets a selection rectangle start there.
  - English texts by default; the host page translates through `labels` or `t(key, default)`, categories and short
    labels included; dates through `Intl`. Theme through CSS variables. Events `dispos-change`, `dispos-select`, `dispos-week`,
    `dispos-history`; `destroy()`.
  - Native format schema 3 (`ranges` is the declaration, the truth; `background` is an editing convenience a reader
    can ignore). `DisposFormats` reads and writes schema 3 and the suite's schema 2, and takes new formats through
    `register`.
  - `labs/dispos_timeline.html` is its example page (French through `labels`, localStorage). It has a density
    switch, and its data panel offers every registered format: schema 3, schema 2, and a demonstration format `flat`
    registered by the page. For the chosen format it shows the JSON, live, with "Copy" and a paste-and-import box. Two prompts:
    `docs/technique/DISPOS_TIMELINE_SPEC.md` (full description, to regenerate it) and
    `docs/technique/DISPOS_TIMELINE_INTEGRATION.md` (to put it into another single-page HTML application).
- **Delivery: module packages** — `tools/publish_dist.py` also builds `dist/dispos-module-<version>.zip` (both scripts,
  `example.html` loading them from its own folder, the two prompts, a README, the code licence MPL 2.0 and the
  document licence CC BY-SA 4.0), with its SHA-256 on a "Delivery" line of the CHANGELOG and of `docs/VERSION.md`;
  `--sans-modules` skips it, `--modules-seulement --ref HEAD` builds a package to try it.
- **Assignment: declared aircraft variants** — a pilot's declaration may list variants per ICAO designator
  (`appareils.variantes`, e.g. `{ "CL2T": ["CL-415"] }`; editor by Features SOG). Qualification stays per designator
  (never a block); among candidate aircraft and pilots, the matching variant comes first (fleet `variant` = declared
  variant); a mismatch shows "different variant: CL-415 declared, CL-215T in the fleet" on the assignment card and in
  the pilot's mission order (`aircraft.declared_variant`, *My missions*). Schema in
  `docs/technique/DISPOS_ET_REORGANISATION.md` § 1.3 (`shared/assignments.js`, `shared/assign_dialog.js`, 4 languages).
- **Performance sheets: one box per group, no gaps between boxes** — each group heading of the table (Helicopters,
  Turboprops…) has a box that ticks or unticks all its sheets, folded group included (indeterminate when part of it is
  ticked); the whole checkbox cell ticks or unticks its row, so a click that misses the box no longer replaces the
  selection with that single row.
- **Performance sheets: "Import…" by file or by pasting, duplicates proposed for completion** — "Import…" (bottom bar,
  and the ☰ menu) opens a window with two ways: choose one or more files (`.lnmperf`, JSON, CSV), or paste a text (a
  sheet JSON, a ChatGPT answer with its prose and code blocks, a `.lnmperf`, a CSV separated by `;`, `,` or tab); the
  pasted text follows a file's path, a ChatGPT answer becomes a "… — ChatGPT" sheet, an empty or unreadable text is
  reported in the window. An imported sheet that already exists (same type, aliases included, or same name) is never
  created silently: "Complete the existing sheet" (default, empty fields only, summary first), "Merge" (field by field
  preview) or "Create a second sheet"; "same choice for the next duplicates" beyond two (ticked in advance); "Undo" for
  10 s restores the database as before the import. A JSON with several entries (an array, or a `sheets` / `profiles` /
  `fiches` / `aircraft` / `items` list) gives as many sheets, each matched by identifier, then type (aliases included),
  then name — the same matching as "Fill in the missing fields" (`gptMatchRank`); two entries for the same sheet add up;
  an unreadable entry does not stop the others; one summary at the end ("n completed, m merged, k created").
- **Tutorial "Create a performance sheet"** (`docs/tutorial/fuel_profile.fr.md` / `.en.md`, Help › Tutorials) — the
  Performance sheets page step by step: choose the aircraft, create its sheet (SimBrief, ChatGPT, class estimate),
  complete it with ChatGPT (one aircraft, or "Fill in the missing fields" for several), check the fields and the engine
  map, save, then use it in Fuel. Block names quoted as on screen, no screenshots.
- **Landing: one reading block** (`apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html`) — the format note
  and the trend card are merged into a single card under the analysis dock: the trend verdict on the left (coloured
  title and text, for the asymptote, first/last quarter and moving-average methods, and the empty or insufficient
  cases), the legend on the right in small print (format read, "estimated" diamond, rating swatches, estimation on
  or off); on two rows under 800 px. The shared block framework (`shared/app_framework.js`,
  `shared/block_icons.js`) treats it as one block.
- **Landing: linked points and pinned tooltip** (`apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html`) —
  hovering a point lights up the same landing on the five charts (score, rate, G, nose, FPM × G scatter: larger,
  ringed point, the others dimmed); a click pins the tooltip with the landing's full record (date, aircraft,
  airport and runway when present, FPM, G, nose, score, source), keeps it lit and highlights its row in the
  landings table, centred in the table's own scroll box. Closed by the cross, a second click on the point, a click
  outside the points or Esc; one pinned point at a time. Tooltips stay inside the window (flipped left of / above
  the pointer near the edges, 8 px margin), and the range selection now starts only after a real drag, so a plain
  click on a point is no longer taken as a selection.
- **"Fill in the missing fields (n)"** (Performance sheets, bottom bar, ticked rows) — one ChatGPT question for every
  ticked sheet: for each, what the suite already knows and its empty fields (engine map included when the sheet has
  none); the pasted answer (one entry per sheet) fills only the empty fields, never what is already entered, with a
  summary per sheet before confirming and "Undo" for 10 s. Prompt in docs/technique/PROMPT_PROFIL_PERFORMANCES.md
  (`<language>-missing` blocks, rules shared with the full prompt).
- **"Performance sheets" page** (`apps/planner/performance_sheets.html`, Tools, level 3; docs/technique/V2_FABLE.md
  § 13, step 1) — the management of the aircraft's performance sheets: the "Performance profiles" table and all its
  actions, the field editor, engine performance and RPM table, engine map, flight regimes, OFP calibration and audit.
  In the header, an "Aircraft" selector, divided like Fuel's menu, that picks the sheet being edited and the ChatGPT
  panel's aircraft (a click on a table row too; several rows ticked: none); a bottom bar of five commands: "Add an
  aircraft", "Import…", a "Selection (n) ▾" menu for the ticked rows (merge, export, save to the folder, fill in the
  missing fields, delete), the sheet's state with "Save the sheet" and "Discard changes"; the performance folder has
  its own line under the table's introduction (My aircraft, folder state, reread, choose), and "Fetch latest SimBrief
  FPL" moved to the OFP calibration; search, sorting and ChatGPT stay above the table. An aircraft without a sheet shows only
  "none" in the table; choosing it (its row, or the selector) offers "Create the sheet" (SimBrief, ChatGPT, class
  estimate) once, in the bottom bar. Notifications sit above the bottom bar. Below the table, four cards instead of nine
  blocks: "Sheet being edited" (flight regimes and fields, from the Design level), "Engine" (engine map, RPM table and
  curve, interpolation), "SimBrief" (airframe, OFP calibration, traceability, audit) and "File" (last imported JSON,
  folded); the duplicate export buttons are gone (the bottom bar exports the ticked sheets). It shares its script and styles with Fuel
  (`apps/planner/flight_planner.js` / `.css`, moved out of the fuel page) and the same local database; a sheet saved
  on one page is picked up at once by the other one open in another tab. Fuel keeps its blocks during this step.
- **My aircraft, one list with its performance side** — Settings › My profile › Aircraft and simulators ("My aircraft",
  fleet included) and the fuel page's "Performance profiles" block show the same aircraft, in the same order and with
  the same name (silhouette, bold name, designator and class); each Settings row has a "Performance" column (profile
  source, linked to Fuel, or "none" with "Create from SimBrief" when SimBrief knows the type, "Ask ChatGPT", "Estimate
  from the class"). Aircraft are always added by a name ("CL-415", "Canadair 415" and "CL415" give CL2T, shown
  "Canadair CL-415"); with no match the aircraft is kept under its name, "ICAO type to confirm". The fuel block is
  grouped by category (collapsible), sortable by name, category or source, has an "Add an aircraft" window (the same
  as Settings) and creates a profile in one click: SimBrief record, ChatGPT panel, or a minimal profile estimated from
  the ICAO class (fuel flow, TAS, ceiling, marked estimated). The reporting section "My aircraft (reporting)" is renamed
  "Aircraft flown (reports)". Variants of a shared designator (CL2T: CL-215T and CL-415): the declaration keeps
  `appareils.variantes` next to the designator lists; the add list offers each variant (record model, fleet variants,
  common names), one row per variant in My aircraft and in Fuel, named after the variant (otherwise "Canadair CL-215T /
  CL-415"), the performance profile staying per designator ("performance shared by the variants"). Common name cell (48 px
  silhouette box, left-aligned name on one line with the full name as a tooltip, one line of badges: designator, class,
  mentions), constant row height; "Search an aircraft" field in both places (name, variant, designator, class, source;
  groups with a match unfolded, the others folded, "n aircraft").
- **Textured designs: sliders and scrollbars** — `input[type=range]` (climb instructions, level slider, zone radius) and scrollbars (page, tables, menus) now wear the design's materials (track = tab rail, thumb = the design's button, square corners, rounded in Aqua) in Cabinet, Flight log, Rugged, Aqua (both tones) and Tactical; flat designs unchanged.
- **Fuel: "Flight level decision" chart, and simpler curves** (docs/technique/V2_FABLE.md § 12) — first block of the fuel
  plan, in the simple and the detailed view: trip fuel (left scale) and trip time (right scale, thin curve) of the whole
  flight at each level, each scale in the colour of its curve, climbing with the goal of the climb instructions; "Least
  fuel" and "Fastest" pills (click: cursor there); plan level as a solid line, cursor dashed; one grey for levels that
  cannot be held (ceiling, trip too short, not enough thrust), the reason being in the cursor card. The card is one table,
  always the same: plan, cursor and difference (trip fuel and time, cruise TAS, climb, TOD, descent, IAS and rates);
  "Use this level" makes the cursor the plan level. Fixed tables: "Levels" (round levels, sortable) and,
  in the detailed view, "Climb goals" (always to the plan level). The climb chart and the instruments follow the
  cursor, the climb instructions the chosen level (not the hover); nothing moves the page while hovering (stable heights, reserved warning line).
  Detailed view: "Optimum altitude" and "TAS by level" removed; one "Climb" chart (rate, fuel per 1,000 ft, IAS and TAS
  by altitude) for the chosen goal; engine settings only with an engine map; one side panel per chart, three lines and
  "Learn more"; the Result's cursor card is gone.

### Changed

- **One aircraft picker for the suite, first in Fuel** (`shared/aircraft_picker.js`, `apps/planner/flight_planner.js`,
  `shared/flight_ui.js`, `shared/equipment_editor.js`) — `AircraftPicker.attach(host, { kind, sources, onPick, … })`:
  a drop-down list with a search field at the top (name, type, designator, registration, call sign, catalogue
  aliases), titled groups, keyboard, kept inside the window, free entry where the page accepts it, disabled entries
  with their reason (docs/technique/FRAMEWORK.md). Fuel's "Aircraft" button uses it (sheets: "My aircraft" first,
  then by category from `AircraftCatalog.classify`); the former home-made menu and its CSS are removed. Performance
  sheets: the "Aircraft" selector of the header (sheets and types without a sheet, the one in use shown first when it
  is not in the list) replaces its native `<select>`; `aircraftGroups` and `profileVisual` are removed.
  `EquipmentEditor.makeSearch` now scores with the shared `AircraftPicker.match`.
- **Mission report: fourth step "Flight details"** (`shared/mission_core/core.js`, `core.css`) — folded by default, it
  gathers Navigation, Environment / weather, Timed events, Legs / rotations and Capabilities; opened, it shows them at
  every level (it replaces the former "Detailed report"), each block summed up on one line (first filled values) with
  its provenance badge and "Edit".
- **Mission report: the form in steps, with block summaries** (`shared/mission_core/core.js`, `core.css`) — the form
  reads in three steps, "1 Flight · 2 Mission · 3 Result" (progress bar at the top, each step folds by its title, which
  says "✓" or "to complete"): Flight = Identification, Aircraft, Timeline, Crew, Fuel (and Network track from level 3);
  Mission = Tasking and the family blocks; Result = "Results and remarks". A block whose key fields are filled shows
  one summary line with its provenance badge (aircraft "MILAN74 · DH8D F-ZBMD", timeline "block 13:07 → 15:13, flight
  13:21 → 15:02" with the track link, fuel "1200 → 650 kg", crew names, identification); "Edit" unfolds its fields.
  Never on a block with a consistency issue; a block being edited stays unfolded. At levels 1-2, "All fields" in a
  block replaces the "Detailed report" button, which is removed. A click on a consistency issue opens its step, block
  and, if needed, all its fields (`reveal`). A read-only "number · date" chip heads the toolbar. Steps are plain
  containers outside the block framework: the ↕ handle is removed in the report and **block orders remembered
  before the steps no longer apply**.
- **Mission report: "Results and remarks" in one block; Tasking from level 1** (`shared/mission_core/blocks.js`,
  `core.js`, families FIRE / ISR / LE) — the "Remarks" block (observations, lessons learned) joins "Results" (data paths
  `results.*` and `remarks.*` unchanged; a remembered "hidden" state of the former Remarks block is lost). "Tasking"
  is shown from level 1 for families without their own order block; FIRE, ISR and LE declare `ownOrder` and keep it in
  the detailed report. `MissionBlocks.list(family)` builds the form's block list.
- **Mission report: field provenance** (`shared/mission_core/core.js`, `core.css`) — the title of each block filled
  by a source carries a "↧" badge naming it (prefill source with the flight date, mission order, airline log, network
  tracking), with the number of fields in its tooltip. A field corrected by hand loses its provenance; "Undo" restores
  the previous one. Kept with the draft in the browser (`<draft key>:origins`), never in the ledger.
- **Mission report: new report from a recent order or flight** (`shared/my_flights.js`, `shared/mission_core/core.js`,
  `apps/pilot/mes_vols.html`) — "Prefill ▾ › New report from…" lists the 7 recent mission orders without a report
  (`PilotToday.pending`) and the 7 recent flights of the airline log without a report, one line each (date, call sign,
  route), with "Open My missions / My flights ↗" as the last line; a click opens the prefilled report through the same
  bridge as those pages. The modules are loaded on demand. The flight sources, merge and report bridge of My flights
  move to `shared/my_flights.js` (`window.MyFlights`: `collect`, `withoutReport`, `writeReport`, `addSource`), shared
  by both pages.
- **Mission report: one "Prefill ▾" menu** (`shared/mission_core/core.js`, `core.css`, `text_import.js`, `fpl.js`) —
  everything that fills the report is gathered in one short header menu, from level 1: one line per entry, in two
  titled groups, "New report from…" (a mission order, one of my flights, a file at level 3) and "Complete this report
  from…" (my last IVAO / VATSIM flight, moved out of the Timeline block with the same behaviour; the filed flight plan
  from SimBrief / IVAO / VATSIM, moved out of the Navigation block; paste of a flight plan, tracker page or METAR; the
  "→ CR" bookmark). The menu stays inside the window (opened upwards or shifted left when needed, scrolls only as a
  last resort) and closes with Escape or a click elsewhere; an entry greyed out for a missing network ID gives the
  reason as a tooltip. Each entry then opens its own suite dialog (flight list, flight plan sources, paste box), which
  scrolls on its own, with its help folded under "Help". All sources go through the same path (`applyImport`): empty
  fields only, the same summary naming the source and the flight date, the blocks touched, the fields already entered
  that were kept and what the source did not give, shown in a notification with "Undo" (10 s, restores the report as
  before) and "Replace the fields already entered (n)" (applies the source again with replacement: `replace` option of
  `MissionTextImport.apply` and `MissionFpl.apply`, which also report the kept fields). The most explicit source wins:
  the known-aircraft assistant only fills empty aircraft fields and never replaces a value set by the source or
  already entered, even when the registration changes in the same step (`sourceWins`); the summary names what was not
  applied ("fleet call sign MILAN74 not applied (CFN12 comes from the source)"). Replaces the "Analyse / import…"
  menu.
- **Keys and external services: one place** (`shared/maintenance_page.js`, `tools/launch.py`, `shared/app_framework.js`)
  — Settings › Installation gets a "Keys and external services" section, one card per service (IVAO, VATSIM,
  SimBrief, airline website, report web service): key state ("saved on … UTC (…abcd)", "missing", "IVAO_API_KEY
  environment variable"), what uses it (links), and for the IVAO key "Save" (replaces then tests), "Test" (control
  call through `/__setup/secrets/test`: "OK, N tracker sessions read over the last hour" or "key refused") and
  "Remove". The key field leaves Sources and folders and the first run (state and link only). Launcher IVAO routes
  answer `{ key: "missing" | "refused" }` (401 / 403); `AppFramework.keyIssue` turns it into a translated message and
  every notification carrying it gets an "Open the keys ↗" link (report, Board, ODV planning). Personal IDs (IVAO VID,
  VATSIM CID, SimBrief) are edited in My profile only: the ☰ › Pilot profile menu shows them read-only with "Edit in My
  profile ↗", and "ID missing" messages point to My profile. Administrator manual (4 languages), pilot manual
  (4 languages) and operations manual updated.
- **Availability editor replaced by the availability timeline module** — *My missions › My availability*, *My
  availability* and the ODV legend use `shared/dispos_timeline.js` through `shared/dispos_week.js`. It brings a
  continuous time axis to the minute, background and availabilities, one state per minute, the single gesture rule,
  selection rectangle, palette drops and undo (Ctrl+Z / Ctrl+Y). It is set up with the suite's categories, texts in
  four languages, compact density, and its "How to use" panel folded.
  - Around it, the page keeps its week bar (or the page's week in *My missions*) and the mission themes opened by the
    chosen category under the palette.
  - It also keeps "Precise range" to the minute, "⧉ Previous week" (asks before replacing a week that is not empty;
    Ctrl+Z undoes it), "Clear all" (Ctrl+Z), the status line with "Write to the data folder (n)", and the import of a
    former hourly grid.
  - No repeating period in the suite's pages (decision pending).
  - Weeks are written in schema 3 (`{ schema: 3, pilot, week, tz, ranges, background, appareils, simulateurs }`).
    Schema 2 weeks are still read, and a week moves to schema 3 the next time it is written (no bulk migration).
  - `SuiteDispos.readPilot` reads both formats through `shared/dispos_formats.js` and gives each week normalised: its
    ranges and background, plus a per-day view to the minute for the ODV and the assignments. Coverage is now
    computed to the minute (`cutsBetween`) instead of in quarter-hour steps; the ODV's day editing keeps the rest of
    the week (`setDay`).
  - In a schema 2 week, two availability categories laid over the same time are read with the later one winning.
  - `shared/dispos_editor.js` is removed, with its texts. The user manual (four languages) is rewritten on the new
    entry. `docs/technique/DISPOS_ET_REORGANISATION.md` § 1.3 is updated, and the module specification adds `nav`,
    `period`, `add(ranges)`, `slot("palette")`, `buttonClass` and `dispos-brush`. The palette chips and the ✕ keep
    their colours and square corners under every design (`repo-plain`, and a kept `!important` for the corners).
- **Aircraft types: last duplicates** — the Poll-Schumann fuel model now resolves the type through the common
  catalogue first (aliases followed: H145 → EC45); its `SYN` table is kept: it is not a name table but the nearby
  reference aircraft its data give for an uncovered type (C-17 → B764). The Landing dashboard no longer redefines the
  silhouette function of `AircraftDB/aircraft_icons.js`, which it overwrote.
- **Aircraft categories: one set of names, wake category "L/M"** (Simplification decisions) — assignments said "Jet
  aircraft", *My aircraft* "Jets": both now use `AircraftCatalog.categoryLabel` (Helicopters, Turboprops, Jets, Pistons,
  Others; "Réacteurs" in French). Fuel planner and performance-sheet groups: "Pistons, 1 engine" and "Pistons, 2
  engines or more" (names from `AircraftCatalog.groupLabel`, 4 languages). Wake category "L/M" (King Air 350, BE20, SW4)
  is kept as given by ICAO: its icon has the size of M with a dashed outline, and the Landing dashboard orders it
  between L and M instead of with the unknown ones.
- **Aircraft type lookup factored into the shared framework** (second step) — about twenty places resolved a
  designator from a code, alias or name on their own, most following only one alias (A4M → A400M, not to A400).
  `AircraftCatalog.canonical` / `.record` / `.related` (with `codeOf` for free text) now do it for *My aircraft*,
  Maintenance, first run, fleet reporting, the Fuel planner and performance sheets (APD, SimBrief, profile keys),
  Landing, the CR, duration estimates and the fuel reference. The assignment fleet index uses the catalogue's usage
  names (`USAGE`) instead of a drifted copy; only the fleet approximations stay local (C-130J requested → the fleet's
  C-130H). `docs/technique/FRAMEWORK.md` § 11 bis.
- **Aircraft type classification factored into the shared framework** — about a dozen pages each decoded the ICAO
  description their own way (five category sets that disagreed on gyroplanes, tiltrotors, amphibians, airships).
  `AircraftCatalog.record` / `.classify` / `.CATEGORIES` now give one answer (helicopters = H and gyroplanes; then by
  power: jet, turboprop, piston; balloons, airships, electric and unknown: others; wing: rotary, amphibious, fixed),
  used by the silhouettes and groups, assignments, *My aircraft*, the CR, duration estimates, the performance model,
  Maintenance, the Fuel planner and the Landing dashboard; the catalogue is now loaded on the 7 pages that read the
  type base without it (studio, Flight maps, generator, registry, ODV orders and planning, My missions). Fuel planner
  groups: by power, then number of engines for pistons ("Multi-engine piston": the four-engine pistons — B-17, DC-6 —
  leave "Others"), translated in four languages. "Estimate from the class" is offered only for a classified type.
  Dead code removed (`shared/aircraft_icons.js`, unused Landing functions). `docs/technique/FRAMEWORK.md` § 11 bis.
- **Fuel: the fuel plan only** (docs/technique/V2_FABLE.md § 13, step 2) — the sheet management moved to Performance
  sheets: the fuel page loses the "Performance profiles" block, the field editor, engine performance and RPM table,
  engine map, OFP calibration and audit, the ChatGPT panel, the "Performance folder" button, the sheet actions of the ☰
  menu and the status bar. One aircraft choice, in the header, listing existing sheets only (My aircraft first, then
  "Manage performance sheets ↗"); without a sheet for the wanted aircraft, a line links to the sheets page
  (`?aircraft=`); `?create=` is redirected there. The sheet consulted stays read only in the Result (collapsible
  "Flight regimes" group, "Edit this sheet in Performance sheets ↗"). My aircraft: the "Performance" column links to
  the sheets page.
- **Fuel tables: resizable columns, clipped comments, one row per type** — the "Comment" column of the RPM / power
  table no longer stretches it: the comment sits on one line with an ellipsis, the whole text in a tooltip, and a
  double-click unfolds it. The columns of this table and of the performance profiles table can be resized by
  dragging the edge of a header (double-click: default widths); the setting is kept in the browser. Common framework
  `shared/table_resize.js` (`TableResize.attach(table, { key })`), usable on any table of the suite. In the profiles
  table, a designator declared under several variants has a single row (the performance is the type's; no variant
  badge, no duplicated creation buttons), and a box at the head of the selection column ticks or unticks every
  displayed row.
- **Help: one source per subject** — the per-subject guides (`DONNEES.md`, `ODV_PLANNING.md`, `SIA_MISSIONS.md`,
  `FLIGHT_PLANNER.md`, `LANDING_DASHBOARD.md`, `PRESENTATION*.md`) are merged into the manuals and removed; what had
  become wrong was dropped. New in the manuals (four languages where they exist): map profiles and extents, the studio's
  vertical section, operation map and operation file, estimated-duration and exercise rules, translated briefs, MORA
  method, ISA effect and thrust-limited cruise in the fuel quote; in the operations manual, the contents of `data/`,
  the browser keys of the missions and the Planning, and what leaves the computer.

### Fixed

- **Mission report: long freeze while typing an aircraft's registration, type or callsign** — every keystroke
  rebuilt the known-aircraft registry from all its sources (fleet, directory, HEMS and FIRE ledgers, flight log,
  reference, mission registry) several times over, and the callsign abbreviation table copied its values for every
  pair of series (quadratic). Both are now cached until a source changes, and the abbreviation table keeps a set of
  its values instead of copying them; a field now answers in about 60 ms whatever the size of the flight log.
- **Local changes to the aircraft type base applied three different ways** — the catalogue merged them with
  `Object.assign`, the CR replaced the whole base, Settings merged them type by type; Settings also compared the
  changes with a base already modified in place, so they no longer showed. One rule now (Simplification decision):
  `AircraftCatalog.effectiveData` — replace when made on this file, otherwise merge type by type and rewrite with the
  file date; the catalogue applies it (`typesDb`) and keeps the file as served (`typesFile`) for Settings.
  `docs/technique/FRAMEWORK.md` § 11 bis.
- **My missions: mission order labels in French in every language** — "Assigned aircraft", "Callsign", "Departure
  airfield", "Requested take-off" / "Ready at", "Status" and the "assigned" status are now translated at the source
  (4 languages). Assignments: the generic crew post rule is documented (helicopter pilot if the common classification
  says helicopter or gyroplane, aeroplane pilot otherwise, airships and electric aircraft included).
- **Aircraft types: Goodyear GZ-20 airship shown as "B2P" and classed with piston aircraft** — "B2P" was Aviation
  Fanatic's category (B = balloon) taken for an ICAO description. Balloons and airships (no ICAO class exists for them)
  now have no description but their nature (`kind`: airship / balloon), engines and engine type; shown as "airship ·
  non-ICAO: SHIP in a flight plan", class "airship, 2 piston engines (non-ICAO)" in Maintenance, "Others" in the
  performance sheets, "other" silhouette. Existing records are converted at the next pass of the updater.
- **Assignment: declared variant "Canadair CL-415" not matched with the fleet's "CL-415 Pélican"** — variants are now
  compared by model number (CL415 ≠ CL215T), by inclusion only when they have none ("Rafale B" = "Dassault Rafale B")
  (`shared/assignments.js`).
- **Aircraft types: CL-415 shown as "Canadair CL-215T"** — ICAO Doc 8643 files the CL-215T and the CL-415 under one
  designator, CL2T (one record, one set of performance figures, CL2T in a flight plan); the record took the first ICAO
  model name. It is now named "Canadair CL-215T / CL-415" (`SHARED_DESIGNATOR_NAMES` in `update_aircraft_db.py`, a short
  chosen list, applied at every pass of the updater; data overrides still win). Telling the two apart in the declared
  aircraft (variants) is a separate change.
- **Generator and studio: no city names, silently** — a browser SIA database built while `villes_geonames.csv` could
  not be read was stored without cities: towns were not suggested for turning points and maps had no city labels, with
  no message. When the database has no cities, they are now read from `shared/carto/villes_geonames.csv` and stored
  with it (no rebuild); if that fails, a notification gives the address and the reason (`shared/sia_base.js`).
- **Audit fixes (reported by Features SOG)** — ODV planning: the "timeline flights to check" notification pointed to a
  removed block; it now names the flights (day, times, callsign, reason). Generator: exported files were named
  "S4-MM-016_…" with current IDs; current IDs are kept as they are ("M-016_…"). `apps/landing/README.md` rewritten in
  English for the current layout (shared type base in `AircraftDB/`, sources, command line); the outdated French section
  of `README.md` ("four steps") removed — the French installation tutorial stays linked at the top.
- **Availability, "Precise range": a time off the quarter hour was refused with a misleading message** — "12:19 to
  17:03" gave "inconsistent times" although the end followed the start: the stored format is to the quarter hour and
  the form silently required it, while the block's subtitle promised "minutes". The start is now rounded down and the
  end up to the quarter hour, the message says so, and the subtitle and manuals say "to the quarter hour".
- **"Fill in the missing fields": a pasted answer found its sheet** — the answer was matched to the ticked sheets by
  the `id` only; a plain ChatGPT answer (no `id`, several code blocks) filled nothing and the message said "no value".
  The answer is now read like any ChatGPT answer, in the forms `{ sheets }`, `{ profiles }`, an array or a single
  sheet, and matched by id, then by type (aliases included), then by name; with no match, the message says which
  aircraft the answer describes and which sheets are ticked.
- **ChatGPT answers read whatever their shape** — a long answer (several code blocks, an example before the sheet,
  comments, trailing commas, curly quotes, the sheet wrapped in `profile` or given as an array, keys in another case or
  spelling such as `ICAO` or `cruise_tas`, values given as objects `{ value, unit, source }` or `{ min, max }`, numbers
  with thousands separators) was refused or imported empty although the data was there. The import now tries every
  code block and keeps the one that carries the sheet's keys, cleans the text, unwraps, renames keys to the schema,
  reduces objects to their value and converts a per-field unit that contradicts the sheet's (lb/h in a kg sheet, with a
  warning).
- **Fuel: "by altitude / by engine setting" toggle without effect** — the climb chart toggle did nothing once the
  sheet had changed under the page (reread from the Performance sheets page, new sheet chosen) until the next
  calculation, because the cached optimum laws had been cleared. The toggle now rebuilds that cache when it is missing.
- **Fuel: all the profiles of an aircraft on its row** — an aircraft of "My aircraft" took only the first profile of
  its type; its other profiles were listed apart as "not in My aircraft", and a profile whose codes the base did not
  know (an X-Plane or Little Navmap file named "Ecureuil AS350 B3" without a type) was never attached, leaving the
  aircraft's row at "none" without a selection box. Now one row per profile under the aircraft (each under its own
  name when there are several), the type being read from the profile's name when its codes are unknown; a row has a
  selection box when it carries a profile, "none" rows have the creation buttons instead.
- **Aircraft types: the record is completed for the Fuel profiles too** — a profile created in Fuel (ChatGPT, SimBrief,
  file, estimate) for a type this computer's base did not know yet (EPIC, the Epic LT) stayed "missing from this
  computer's type base": only "Add" in Settings asked the launcher. Fuel now asks the launcher for every profile type
  without a record (short pass, a few seconds, table redrawn), on opening and after each change; with the launcher
  stopped, a warning says to restart it and click "Look up the record" instead of staying silent.
- **Fuel: merging profiles that differ by nothing** — "Merge" stayed disabled when the most recent profile already
  held every value (label "Merge (nothing)"), although the other ticked profiles would be removed. The button now
  counts the removed profiles ("Merge (1 profile removed)") and stays active: the most recent is kept as is, the
  others disappear.

### Livraison

- Archive de livraison : `xplane-web-suite-5.3.0.zip` — SHA-256 `3f95d59310f962153496b8bcc0d6ea3282981cb43be1698a02cfb61d5934af8d` (code seul, hors dépôt : dossier `dist/`).
- Module package: `dispos-module-5.3.0.zip` — SHA-256 `6e84695139fc0cab8940e542f8c27c3b5ca0e7a1141fd188f0dd3515fc7c80c7` (outside the repository: `dist/` folder).

## [5.2.0] — 2026-10-12

Missions can now be built entirely by hand in the generator — the single place where missions are created — with a
"Step by step" guided entry, six documented paths from a standalone flight to a coordinated exercise, tidy risks and
objectives, a shared place search including towns, and a status line telling what is saved. The map studio's window
shows the same interactive map. Pilots can declare aircraft outside the fleet. The help is rebuilt around tutorials and
three manuals (pilot, planner, administrator), and no native browser dialog is left in the suite.

### Added

- **Missions: creation has a single door, the generator** — "New mission", "Create the skeleton here" and "Order
  from ChatGPT…" live in the generator's Mission block. The registry no longer creates anything (its "Order a mission"
  block is gone): it consults, files, duplicates, deletes and imports what arrives. Its "New mission" button opens the
  generator on a new mission with the order form unfolded (`mission_editor.html?new`); "Open in generator" opens an
  existing one. "New mission" asks before replacing a mission not yet saved to the folder (declining reopens it) and
  clears the previous operation batch. The order card's button reads "Copy this order's prompt again".
- **Mission generator: "Create the skeleton here", without ChatGPT** — the order settings give complete missions
  without story: one per flying team, aircraft from the fleet suited to the family (prompt § 6 categories; tanker and
  receivers for air refuelling), callsign from the fleet or the callsign table, airfields at the aircraft base,
  theatre of that base, target, turning points, rendezvous, working zone, AAR track if planned, timing from the
  duration, expected maps, empty sections; with "Coordinated exercise", the organisation mission …Z. A "Skeleton: n
  point(s) to place, m text(s) to write" line leads to the studio; empty fields are framed until filled.
- **Mission generator: "Step by step" guided entry** (`apps/cpco/mission_guide.js`) — a rail of six steps (Frame,
  Places, Story, Objectives and risks, Timeline, Maps and documents), one open at a time, "Next →", "Show everything"
  for the full layout; same data as the blocks. Proposals are put in the field and marked "proposed ✓" (theatre from
  the aircraft base, fleet callsign, departure = base, entry/exit 15 NM from the target, story canvas, route events,
  maps from the places); warnings are lines under the field with one-click fixes. Places: search over airfields,
  beacons, points and towns, "+ Target / Working zone / Turning point / Rendezvous", and "Paste a table of points"
  (`shared/point_table.js`: separator and header detected, decimal, DMS or degrees-minutes coordinates, unresolved
  places looked up by exact name, preview before "Add n points", line order = route order; also in the YAML block).
  Risks in a four-column table with a level selector. Default for a new mission at levels 1 to 3.
- **Mission generator: six paths by hand** (docs/technique/V2_FABLE.md § 10) — on the Operation line of the Mission
  block, each action saying first what it creates or removes: "Add a crew…" (standalone mission → crew A, M-016 →
  M-016A, new mission B with the shared context and its own brief; in an operation, the next letter), "Remove this
  crew…" (the last crew becomes standalone again), "Create the exercise organisation…", "Open the organisation". Any
  crew mission gets a timeline in its "Timeline" section (H = planned take-off, events at H+n at a place of the
  mission or free text), printed at the top of the brief's Timeline section.
- **Mission generator and map studio: status line, "Undo changes", Operation line** — a status line under the Mission
  buttons, the same in both pages: "Saved to the folder (n min ago)", "Same as the folder version", "Not yet saved to
  the folder" or "Unsaved changes since 14:32 (n field(s))"; "Save to the folder" is the main button while something is
  unsaved; "Undo changes" goes back to the saved or loaded version, the other page following. In the generator, an
  Operation line always shown ("Standalone mission (no operation)" or "Operation X (A-001): crew B of 5 ·
  organisation A-001Z · H-hour 10:00"); the Operation block only for operations.
- **Mission generator: hand-written missions tidied at the source** — risks one per line with columns separated by
  tab, "—", "|" or ";", a level (Critical / High / Moderate / Low, four languages) recognised anywhere, stored as
  `{ hazard, level, consequence, mitigation }` and printed with their level; a line without separator goes to notes.
  A numbered list in the main objective is split (first item stays, the others lead the secondaries). Applied when
  leaving the section and on opening a mission. A line in Identification flags a theatre that does not match the
  departure airfield, with a one-click fix. YAML editor: place names searched (airfields, beacons, points, towns;
  `shared/place_search.js`), callsigns suggested from the fleet, the team name follows the callsign.
- **Mission generator and registry: "Duplicate"** — a copy ready to edit: next free identifier and series of the same
  family, references to the old identifier followed, title "… (copy)", operation reduced to the copy, maps and renders
  to redo; it opens in the generator.
- **Mission generator: text sections by type** — "Add a text section" offers the sections the brief and the report can
  place, each typed (stable key, translated title, "where it appears, what to write"), one per type except "Free
  text"; objectives, risks and notes are written under their YAML keys, the others complete the brief section of the
  same name. The sections follow the page language.
- **Map studio: "Points to place (n)"** — for a mission without coordinates, the Route block lists the places to
  place: click the map, or search airfields, beacons, points, towns or "lat, lon"; a placed point can be dragged;
  zone radius in km.
- **Map studio: "⧉ Window" shows the same interactive map** — the window is the studio itself reduced to its live
  map (`map_parser.html?carte`): no side bar, header or footer; pan, wheel and pinch zoom, same overlays and draggable
  points; toolbar ◀ list ▶, Recentre, Refresh, Open in the studio, Close; keys ← → + − 0 Esc. Synchronised with the
  main studio; a point moved in the window is saved once, without looping.
- **Mission registry: ChatGPT reply, deletion** — an ordered mission shows a "ChatGPT reply" panel (paste the reply or
  choose the files): the mission is filed in the missions folder and replaces the order. "Delete…" on the card
  (folder included, after confirmation); "Remove pending orders (n)".
- **My profile › Aircraft: aircraft outside the fleet** — an "Other aircraft (outside the fleet)" card: type a
  designator, a model or a common name (suggestions while typing: fleet, this computer's type base, published ICAO list,
  aliases, types declared by other pilots); the type is ticked "Owned" and goes with the declared availability, so the
  Centre and the other pilots see it. Click a row to correct or delete it. A type missing from this computer's base is
  completed by the launcher on "Add" (short pass, queued if one is running, still running if the page is closed):
  ICAO, EUROCONTROL, then Aviation Fanatic as a last resort for retired or non-ICAO types (S210 Caravelle, GZ20
  airship; read on each computer, never published). A link opens the Aviation Fanatic type list.
- **Help page: fixed structure, tutorials first** — Tutorials · Pilot, planner and administrator manuals · For
  developers; the home page and the index come from that structure, search covers tutorials and the three manuals in
  the current language.

### Changed

- **Map studio: "SIA database" block removed** — its panel (folder, re-read, gauge, report) appears under the "SIA base"
  line of the Mission block only when needed; the database is managed in Settings › Maintenance › Aeronautical data.
  Flight maps keeps the block.
- **No native browser dialog left in the suite** — every `confirm()`, `prompt()` and `alert()` now asks in the page
  (`AppFramework.ask`, new `AppFramework.askText`); confirmations wait for the shared layer instead of freezing the tab.
  Only the two bookmarklets, which run on the airline's website, keep `alert()`.

### Fixed

- **Mission registry: mission without a type, imported mission that would not open** — `affectations.yaml` was read as
  a mission file; files added from outside the missions folder are now filed in it; a folder-less duplicate is removed
  by "Clean up the registry".
- **Mission generator: duplicated brief sections in two languages** ("Summary", "Teams involved"… next to their
  French titles) — one table of generated sections, recognised in four languages; missions already loaded are cleaned
  on opening; the PDF prints each section once.
- **Mission generator: back from the registry reopened the wrong mission** — the "opened from the registry" token is
  used once and dropped when it no longer matches the shared mission.
- **Registry and generator: "Estimated duration" left in French** in the other languages.
- **Map studio and Flight maps: preview zoom buttons shown as two empty blue squares.**
- **Launcher: Python traceback on an unreadable request** (TLS on the HTTP port, unknown HTTP version).

### Livraison

- Archive de livraison : `xplane-web-suite-5.2.0.zip` — SHA-256 `14a36ca4f87d387850c1d9561753360ba14d884b5451a88d0e8bbc3c3d8b4a54` (code seul, hors dépôt : dossier `dist/`).

## [5.1.0] — 2026-10-09

Carburant devient l'atelier des profils de performances. Un bloc **« Profils de performances »** donne pour chaque
type de la flotte et chaque profil enregistré d'où il vient, s'il a une cartographie moteur et ce qui lui manque. On y
**sélectionne** des profils pour les **fusionner** (le plus récent gagne champ par champ ; aperçu des changements, donnée
par donnée, à cocher), les **exporter** ou les **enregistrer** dans le dossier (un fichier par profil) et les
**supprimer** (retirés aussi du dossier performances, « Annuler » 10 s). Nouvelles sources : **SimBrief** (fiche
publique de 224 types, créer, mettre à jour ou fusionner un profil), modèle de **Poll et Schumann** (avions de ligne),
**Airframe DB** (militaires, hélicoptères), et **« Demander à ChatGPT »** (prompt du type, réponse importée ou fusionnée,
valeurs estimées signalées). Consignes de montée et montée choisie dans Carburant. Lot d'ergonomie A à G : contrastes des
designs à matières, Premier lancement (rail des étapes, types d'aéronefs), Sources et dossiers, Maintenance, Aéro, Cartes
de vol. Données aéronautiques : mise en place idempotente, « Purger la zone… », zone **Atlantique Nord** et tracks NAT du
jour, profils de cartes revus (IFR simplifié, AIRWAYS, points RNAV). Plus d'empreintes `?v=` dans le dépôt : le lanceur
les pose en servant. Corrigés : A400M, renvoi en boucle du premier lancement, textures absentes après un clone, données
servies depuis un autre disque, registre aux fichiers absents, profils cachés à la relecture du dossier performances.

### Ajouté

- **Carburant, Profils de performances : « Demander à ChatGPT »** — bouton dans la barre du bloc et dans la fiche du
  profil actif ; panneau : appareil (profil ou type de la flotte sans profil), « Copier le prompt et ouvrir ChatGPT »
  (repli `execCommand`, prompt prérempli s'il est court), « Voir le prompt ». Prompt rédigé en règles, dans la langue de
  la page, tenu dans `docs/technique/PROMPT_PROFIL_PERFORMANCES.md` (un bloc par langue, schéma JSON commun) et généré
  dans `apps/planner/perf_prompt.js` par `tools/build_perf_prompt.py` (relancé par `bump_versions.py`) : sources à
  compiler, croisière ordinaire à masse moyenne, unités imposées, valeurs estimées dans `estimated`, sources citées,
  JSON seul avec les clés du schéma ; il donne ce que la suite sait déjà (EUROCONTROL, SimBrief, Airframe DB, profil
  actuel). Réponse collée (JSON, ou CSV de performances) : clés inconnues ignorées et signalées, valeurs illisibles ou
  hors plage écartées, kg ou lb, varios positifs, cartographie relue comme dans l'éditeur ; « Importer comme nouveau
  profil » (`GPT_<code>`, source « ChatGPT ») ou « Fusionner avec « … » » (réponse datée du jour, aperçu d'abord).
  Valeurs estimées gardées (`estimatedFields`, lignes de cartographie notées « estimé (ChatGPT) ») et affichées sous
  « Données manquantes » ; une valeur estimée changée à la main (fiche, ou ligne de cartographie) ne l'est plus.
  Manuel utilisateur (4 langues).
- **Carburant, Profils de performances : fusion avec la fiche SimBrief, aperçu avant toute fusion** — la fiche SimBrief
  du type devient une source de fusion comme un profil (profil virtuel « <type> — SimBrief », daté de sa récupération,
  `simbrief.fetched`, sinon date de la passe ; carburant converti dans l'unité du profil) : quatrième choix
  « Fusionner » dans « Mettre à jour depuis SimBrief », case « Inclure la fiche SimBrief du type » (cochée d'avance)
  dans « Fusionner (n) », possible dès un profil coché. Même règle partout (`mergeProfileSources`) : le plus récent gagne
  champ par champ, les vides sont comblés, cartographie réunie, profil gardé (identifiant, nom, unité, source) ;
  notification « Repris des sources : … » qui nomme SimBrief. Toute fusion, et toute mise à jour depuis SimBrief qui
  change des champs, montre d'abord un aperçu (champ, valeur actuelle, valeur retenue, source ; inchangés repliés ;
  lignes de cartographie ajoutées / remplacées), redessiné quand la case SimBrief ou le nom changent ; « Annuler » 10 s
  reste. Boutons « Choisir » / « Créer » dans une colonne à eux, au même endroit sur chaque ligne. Manuel utilisateur
  (4 langues).
- **Carburant, Profils de performances : supprimer, fusionner, profil SimBrief** — sur chaque ligne, « Supprimer »
  (confirmation, « Annuler » pendant 10 s ; profil noté supprimé, `state.removedProfiles`, que la relecture du dossier
  performances ne ramène plus, le fichier n'étant jamais effacé ; un import explicite le ramène) et « Profil SimBrief »
  quand le type est dans la liste de SimBrief (`AIRCRAFT_PERF[code].simbrief`) : profil « <type> — SimBrief »
  (`SB_TYPE_<code>` : consommation, plafond, Mach ou vitesse indiquée et TAS au niveau de référence, Badin de montée et de
  descente, carburant utilisable, piste ; masses et moteurs en description), créé ou remis à jour sans perdre ce qui a été
  ajouté à la main ; face à un profil perso : « Mettre à jour les champs vides », « Remplacer » ou « Nouveau profil » ;
  même bouton dans la fiche du profil actif. « Fusionner » : profils cochés du même type réunis (nom choisi, celui du
  plus complet par défaut ; base : le plus récent ; manques comblés par les autres ; cartographie moteur réunie) ;
  notification qui dit ce qui a été repris de chacun, « Annuler » 10 s. Manuel utilisateur (4 langues).
- **Carburant — consignes de montée, base de performances (v2-fable, §7 de `docs/technique/V2_FABLE.md`)** :
  - **Consignes de montée** (bloc du devis, toutes vues, tous niveaux ; `shared/flight_perf_view.js`) : objectif par
    segments (Éco · Vy · Rapide · Profil · Réglée, chacun avec son temps et son carburant jusqu'au niveau), tableau par
    tranche d'altitude (sol, 2 000, 5 000, 10 000 ft… niveau du plan : gaz « plein » ou %, RPM / N1 si cartographie,
    Badin à tenir, vario attendu, temps cumulé) et phrase « Régler / Tenir / Attendu » produite à la source (gaz, hélice ou
    régime ; instrument qui porte la consigne ; vario, niveau, temps et carburant attendus), en quatre langues.
  - **Montée choisie, vue détaillée** : trois curseurs horizontaux (vitesse indiquée, vario, régime — RPM / N1 de la
    cartographie, sinon gaz en %) avec une case « fixé » devant chacun : deux fixés, le troisième calculé et grisé ;
    valeur et état (« plein gaz », « calculé ») sous chaque curseur. Les curseurs verticaux autour des courbes et le mode
    « Régler par le régime » sont retirés ; la ligne de base du calcul ne change plus de longueur (détail de la montée
    choisie en infobulle).
  - **Graphe de montée par altitude ↔ par régime** (à mi-montée, au Badin de la montée choisie : vario à Vy et au Badin
    choisi, carburant par 1000 ft, réglage du moment).
  - **Altimètre et chronomètre** de retour dans le bandeau d'instruments, niveau Expert seulement (`data-min-level="4"`) :
    altitude survolée, temps de montée depuis le sol à la montée choisie (`shared/flight_instruments.js`).
  - **Bloc « Profils de performances »** (niveau 3 et plus) : une ligne par type (profils enregistrés et types de la
    flotte sans profil) — source du profil (.lnmperf, SimBrief, OFP calibré, CSV, JSON, saisie, estimation), cartographie
    (oui, n lignes / non), consommation de croisière et son origine, plafond, données manquantes nommées ; Importer,
    Dossier, Relire ; le dossier performances est relu quand il change ailleurs (`file-access-change`, clé `__perf`).
  - **Cartographie moteur : colonne « Altitude » facultative** dans l'éditeur ; avec deux altitudes ou plus, débits
    interpolés entre les lignes d'une même altitude puis entre altitudes (`FlightPerfModel.mapAt`), utilisés par le devis,
    la montée choisie, les consignes et la fiche moteur ; sinon comportement inchangé.
  - **Choix d'appareil en liste** (icône, nom, type, source du profil, état « complet / à compléter (n) / sans profil »),
    clavier (flèches, Entrée, Échap) ; **« Copier JSON »** : repli `execCommand("copy")` hors contexte sécurisé, bouton
    grisé avec infobulle quand rien n'est chargé.
- **Plus d'empreintes `?v=` dans le dépôt** : toutes les références restent à `?v=0` ; le lanceur pose l'empreinte réelle en
  servant chaque page, script ou feuille (`tools/version_stamps.py`, poussé sur develop) et `tools/publish_dist.py` les pose
  dans l'archive de livraison (fichiers du tag extraits dans un dossier temporaire, empreintes calculées d'un fichier à
  l'autre comme en service). `bump_versions.py --neutral` remet tout à `?v=0` ; sans option il ne sert plus qu'à un usage
  sans lanceur. Plus rien à monter avant un commit (CLAUDE.md, README des outils, INSTALL) : fini les dizaines de pages
  modifiées à chaque retouche et les conflits d'empreintes.
- **Ergonomie (F, suite) : Carburant — Poll-Schumann et SimBrief, montée choisie, revue d'usage** — Outils › Carburant
  (`apps/planner/flight_performance_planner.html`, `shared/flight_perf_view.js`, `shared/flight_instruments.js`,
  `shared/flight_i18n.js`). **Consommation** : après la saisie du vol et le profil, Poll-Schumann pour les avions de
  ligne couverts (`shared/fuel_poll_schumann.js` ; masse à mi-croisière tirée de la masse au décollage saisie, sinon
  masse moyenne du module ; origine « Poll-Schumann, 198 t à mi-croisière, FL350, M0,82 »), puis SimBrief
  (`AIRCRAFT_PERF[type].simbrief`, « ≈ » si la précision n'est pas « high »), puis l'estimation ; « Utiliser cette
  valeur » recopie la source automatique dans le champ ; TAS de croisière aussi tirée de SimBrief. Montée et descente
  du modèle complétées par la fiche EUROCONTROL quand le profil ne les donne pas (A400M : plafond calculé FL176 →
  FL264) ; un niveau du plan au-dessus du plafond calculé est signalé dans la ligne d'état. **Montée choisie** dans le
  devis, à tout niveau : curseurs « Vitesse indiquée » et « Vario », chacun avec son champ chiffré (pas de 5 kt et
  50 ft/min), et en lecture à mi-montée régime (table du profil, sinon « non connu pour ce type »), manette et débit ;
  en vue détaillée, pour un profil à table régime → débit, « Régler par le régime » (vitesse et vario deviennent les
  valeurs lues). « Loi réglée » devient « montée choisie » partout (courbes, panneaux, instruments, base du devis), les
  « lois » rapide et économique deviennent des « montées », « Comparaison des montées ». **Résultat** : carburant
  d'abord — Carburant bloc, Temps de vol, Début de descente (TOD), puis Roulage, Délestage (étape), Contingence,
  Réserve ; montée, croisière et descente sous le délestage en vue détaillée, base du devis (niveau, montée choisie)
  aussi ; libellés produits dans la langue de la page (plus de « Block fuel » en dur). **Courbes** : graduations
  rondes (1, 2, 2,5, 5 × 10ⁿ) sur tous les axes de valeurs, niveau du plan marqué (trait discret « FL240 plan ») sur
  « TAS selon le niveau » et « Montée ». **Instruments** : lecture seulement (plus de réglage par glisser ou molette) ;
  altimètre et horloge retirés (ils redisaient le niveau survolé et la durée déjà écrits) ; restent vitesse indiquée,
  vario et carburant du trajet, en vue détaillée. Fourchette de carburant ramenée à une valeur quand ses bornes
  s'affichent pareil. Quatre langues.
- **Ergonomie (G) : contrastes restants ; Opérationnel et Console cohérents** — suite de la passe de contraste
  (`docs/technique/CONTRASTE_2026-10-09.md` § 5 et 6, relevés `tools/contrast_audit.html` avant / après : 16 → 5
  textes sous le seuil en Standard, Opérationnel et Console, 11 → 5 en Aéro ; les 5 restants sont dans les Ordres de
  vols et les tableaux triables, fichiers d'une autre session). Contrastes : petits textes des CR (`--muted` de
  `shared/mission_core/core.css` #5b6270 : cases de calcul 4,1 → 5,2:1) ; titres de bloc d'Aéro sur un bloc sombre
  d'une page claire (Ordres de vols : 2,7 → 9,8:1, `--repo-ink`) ; texte sur l'accent et rang des créneaux du Planning
  (`apps/cpco/odv_blocks.css`) ; boutons « déplacer » et « masquer » du jeu Gel sur les pages du Centre en bulle
  marine (or sur or 2,9 → 10:1, `shared/block_icons.css`, règle du générateur à reporter). **Opérationnel** : un seul
  angle de 3 px (onglets, sous-cartes et groupes de champs des CR, menu ☰, champs, liens-boutons), boutons du contenu
  à la hauteur des champs denses, en-tête compact et même sous-titre sur toutes les pages, titre de l'aperçu
  imprimable du CR plus mis en capitales. **Console** : tous les titres de bloc en capitales (aussi ceux sans icône),
  hauteur de 40 px réservée au contenu (plus dans l'en-tête, les menus, les boutons à icône seule ni les tableaux),
  rayons alignés (6 px commandes et ☰, 8 px sous-cartes, onglets et bandeaux, 10 px blocs et menus), onglets aérés.
  Formes de Standard et d'Aéro inchangées (règles en `html[data-design="ops"|"console"]`).
- **Ergonomie (F) : Carburant — état du calcul, consommation toujours disponible** — Outils › Carburant
  (`apps/planner/flight_performance_planner.html`, nouveau `shared/fuel_reference.js`). Cause du « Calculer ne fait
  rien » : l'appareil choisi (type de la flotte sans profil, ex. A400M) n'avait ni consommation ni TAS de croisière ; le
  devis calculait temps et TOD avec des valeurs par défaut et un carburant nul (« 0–0 kg »), le plan de vol relu
  mettait déjà le devis à jour, et un nouveau clic redonnait les mêmes chiffres sans rien dire ; le modèle de
  performances refusant un profil incomplet, courbes de niveau et instruments disparaissaient aussi au niveau Expert.
  Désormais : **ligne d'état** dans Résultat après chaque calcul (« Calculé pour … à 11:48:18 : 500 NM au FL280, temps
  de vol 1 h 26, TOD 98 NM. Consommation de croisière : ≈ 4 000 kg/h (estimation type A400) », TAS et son origine) et,
  sans consommation, « Carburant non calculé : … » et quoi faire, au lieu d'un tiret muet ou d'un 0 ; « Calculer »
  sans avion ou sans distance le dit en notification et met le champ en avant ; les valeurs inchangées ne sont pas
  réécrites. **Consommation de croisière** dans le devis, trois sources affichées avec leur origine : saisie du vol
  (champ prérempli, kg/h ou lb/h selon l'unité affichée, « Mémoriser pour ce type » l'écrit dans le profil comme
  « Enregistrer le profil »), profil enregistré (table RPM ou débit de croisière), sinon **estimation** (≈, jamais
  confondue avec le profil, « Utiliser cette estimation » la recopie dans le champ) : 34 types nommés de la flotte
  (A400M, C-130, A330 MRTT, E-3F, Rafale, Mirage 2000, PC-21, TBM 700, H145, H160, NH90, Puma, Tigre, Gazelle, CAP 10,
  Twin Otter…, source citée pour chacun) puis classes OACI (L1P à L4J, H1T, H2T) × catégorie de sillage (MTOW
  EUROCONTROL sinon base des types) ; TAS de croisière : profil, sinon fiche EUROCONTROL, sinon estimation. Bloc,
  réserves et courbes se calculent dès qu'une consommation existe. **Vue simple / Vue détaillée** (bouton du Résultat,
  choix mémorisé, défaut : détaillée au niveau 4, simple aux niveaux 1 à 3) : courbes de niveau et de consommation,
  panneaux et instruments à tout niveau, sans recalcul au basculement quand ils sont à jour ; plan de vol relu :
  courbes retracées. Fiche EUROCONTROL trouvée aussi par les alias de la base (A4M ↔ A400). Quatre langues.
- **Ergonomie (D) : Sources et dossiers — une seule ligne X-Plane, dossiers déduits repliés** — Paramètres ›
  Installation › « Sources et dossiers » (`shared/maintenance_page.js`, libellés et aides de `shared/file_access.js`) :
  6 lignes visibles au lieu de 10. « Dossier X-Plane (atterrissages) » et « Dossier du simulateur X-Plane » deviennent
  une ligne « X-Plane » : bouton principal du dossier d'installation (données de navigation) et, en second plan,
  « Journaux d'atterrissage : autre dossier… » (le plugin écrit ses CSV où on l'a réglé : dossier propre, gardé) ;
  libellés renommés « Dossier d'installation d'X-Plane » et « Journaux d'atterrissage X-Plane ». Registre, missions et
  SIA, déduits du dossier des données, passent sous « Dossiers déduits (3) », replié (une ligne en avertissement reste
  visible). Chaque ligne dit à quoi sert le dossier et ce qui se passe sans lui ; un dossier facultatif non choisi est
  une information, plus un avertissement. Types d'aéronefs : un type sans fiche OACI garde la silhouette par défaut,
  avec l'infobulle « type sans fiche OACI : silhouette inconnue ».
- **Pilote de fusion des empreintes `?v=`** (`tools/merge_vstamp.py`, déclaré dans `.gitattributes` pour les pages, scripts,
  feuilles et `config/repository_tree`, configuré par `tools/install_hooks.sh`) : à la fusion ou au rebase, un conflit qui ne
  porte que sur les empreintes de cache posées par `bump_versions.py` est résolu seul (côté courant gardé, empreinte
  remise par `bump_versions.py`) ; les vrais conflits restent à résoudre à la main.
- **Ergonomie (E) : Premier lancement — rail des étapes, états, étape 5 réordonnée** — la page devient un assistant
  qui dit à chaque étape où on en est, quoi faire et quand c'est fini (`apps/settings/premier_lancement.html`).
  - **Rail des six étapes** en tête (1 Dossiers · 2 Données · 3 Compagnie · 4 Profil · 5 Données aéronautiques et
    types · 6 Centre) : état calculé par le bilan (✓ faite, ○ à faire, – facultative, 🔒 verrouillée sans l'étape 1,
    ✗ à refaire), étape courante cerclée ; un clic ouvre l'étape. Le même état en pastille dans chaque titre (le
    numéro ne passe au vert que quand l'étape est faite) et une ligne « ✓ Fait : … » / « ○ À faire : … » sous le titre.
    L'étape courante est ouverte, les autres repliées (bouton Masquer / Afficher des blocs) ; chaque étape finit par
    « Suivant → », la 6 par « Terminer », actif seulement quand les étapes 1 à 5 sont faites (sinon ce qui manque).
    Le bilan détaillé passe dans un volet replié ; « Recommencer » est replié par défaut.
  - **Étape 5 dans l'ordre naturel** : ① types d'aéronefs et performances d'abord, précédés d'une ligne d'état aux
    mêmes sources que le bloc (lanceur `/__setup/aircraft-db`, bases chargées, flotte, missions, types saisis) — « ✓ 34
    types connus, 18 avec performances », « ○ n types à compléter », pendant une passe « téléchargement en cours », puis
    « ✓ Terminé : n fiches OACI, m performances ; k types sans performances EUROCONTROL (normal pour les militaires et
    les hélicoptères) » ; ② données aéronautiques, précédées de leurs lignes d'état (base : AIRAC, espaces, date de
    construction, cycle en vigueur ; MORA : cases, date de `mora.csv` ; X-Plane : facultatif). Les cartes expertes
    (Base aéronautique, MORA, Cohérence) sont repliées sous « Outils avancés (aussi dans Paramètres › Maintenance) ».
    Un seul bouton principal **« Tout installer pour <zones> »** enchaîne « Compléter automatiquement » puis
    « Activer » sous la carte, en attendant la fin de chaque tâche, et dit ce qui reste.
  - **Étape 6** : chaque lien sortant (flotte, registre des missions, réglages du Centre) dit ce qu'on y fait et
    s'ouvre dans un nouvel onglet ; carte Missions : « ✓ 66 missions au registre : rien à faire » ou d'où elles
    viennent (données de l'étape 2, sinon Centre › Générateur de mission). Pilotes : « Réservé aux administrateurs :
    passer ».
  - Textes nouveaux produits à la source (`K.t` / `K.tf`, quatre langues), écrits seulement quand ils changent ;
    blocs embarqués de `shared/maintenance_page.js` inchangés (ordre par CSS, volet ajouté hors de leur corps).
- **Ergonomie (B) : contraste et cohérence des designs à matières** — passe de contraste sur toutes les pages et tous
  les designs, outil de mesure à l'appui (`tools/contrast_audit.html` : 18 pages × 9 designs × décor complet et sobre,
  menus ☰ et langues ouverts ; contraste WCAG de chaque texte visible contre son fond effectif, textures et dégradés
  échantillonnés ; relevés avant / après dans `docs/technique/perf/runs/contrast_2026-10-09.json`, rapport
  `docs/technique/CONTRASTE_2026-10-09.md`). **Menus** ☰ et langues (`designs_skeuo.css`, `repository_nav.css`) : une
  seule encre par design (`--sk-menu-ink`, titres de groupe `--sk-menu-ink-2`, séparateurs et survol qui en dérivent :
  jetons `--repo-menu-*`, plus de `--repo-bar-text` en dur) ; entrées « Données locales » et « Page » en lignes plates
  (elles prenaient le cuir marine des boutons sous une encre foncée : 1,1:1) ; champs du profil pilote aux champs du
  design ; Cabinet et Carnet de vol en ton sombre : menu, notifications et pied de page en parchemin sombre (texte
  clair sur parchemin clair : 1,2 à 1,9:1). **Aqua** : matières en jetons (`--aq-glass*` verre, `--aq-slate*` ardoise,
  `--aq-rail*` métal du rail) que le ton sombre redéfinit seuls — boutons secondaires, ☰, langue, liens-boutons, outils
  de bloc, listes, segments et onglets au repos en verre fumé, page courante et action principale en gel, rail des
  onglets sombre (il restait clair sous des poussoirs sombres) ; gel moins blanchi en haut (texte blanc ≥ 4,5:1, 3,6:1
  avant) ; entrée courante de la barre latérale lisible en ton sombre. **Onglets** : un seul composant par design — les
  onglets propres au Studio cartographique et aux Cartes de vol (`.profileTabs`) prennent le rail et les poussoirs des
  onglets de page ; liseré du bloc à onglets aussi sur Carburant (contenu en `.wrap`, pas en `main`). **Encres** :
  secondaire de Cabinet assombrie (`--cab-ink-2`, 3,7 → 4,9:1 sur le parchemin réel), gris des pages (`--muted`,
  `.small`) remplacé par l'encre secondaire du design dans tous les designs à matières, y compris en-tête, boutons et
  barres d'état ; liens des blocs à l'encre du design (`--sk-link`) ; aperçu imprimable (`.report`) à l'encre
  d'impression sur papier clair (Durci, Tactique : 1:1) ; menu des Paramètres posé sur la surface des blocs ; sélecteur
  segmenté du Carnet de vol en aluminium clair ; vert du bouton principal de Durci approfondi.
- **Ergonomie (D) : Maintenance — types d'aéronefs, référence anonymisée, journal des vols** — sans changer les données
  ni les mécanismes. Le bloc « Types d'aéronefs » (`shared/maintenance_page.js`) se lit en trois temps : ce que c'est
  (fiche OACI qui donne l'icône et la classe 2P, 2T, 4T…, performances EUROCONTROL, téléchargées sur ce poste) ; où on
  en est (tableau des types de la flotte, des missions et des types saisis dans les CR : silhouette de l'appareil
  `AircraftDBIcons`, code et modèle, classe OACI et libellé « avion, 2 réacteurs », fiche ✓/manquante, performances
  clés plafond · croisière · V2 · Vat avec toutes les valeurs en infobulle et lien EUROCONTROL, emploi ; manques en
  avertissement, types absents d'EUROCONTROL en information) ; quoi faire (« Compléter automatiquement », avec la barre
  des tâches commune, à la place des boutons « Types inconnus / Flotte / Missions » ; codes libres repliés sous
  « Télécharger d'autres types… » ; lien « Modifier la base à la main… » au niveau Expert). Rubriques de Paramètres
  (`shared/data_admin.js`) : commandes secondaires des bases du dépôt (« Appliquer dans ce navigateur », « Télécharger »,
  « Annuler », « Revenir au fichier ») repliées sous « Plus… », « Enregistrer dans le dépôt » en évidence ; la
  référence devient « Flotte et pilotes de la compagnie (référence anonymisée) », présentée en trois phrases, avec
  « Mettre à jour depuis le journal des vols » (même fonction que dans le journal) ; « Séries d'indicatifs » du journal :
  chemin vers la correspondance expliqué, « Ajouter à la correspondance », notification avec « Ouvrir la
  correspondance » (ligne filtrée, modifications gardées) et état « Dans la correspondance ✓ » ; intros de la
  correspondance, de la base OACI, des types ajoutés localement et des appareils des missions reliées à ces rubriques.
  Plus d'état ni de boutons de la base précédente affichés en changeant de rubrique.
- **Ergonomie (A) : en-têtes des reportings et niveau d'utilisation plus clairs** — les pages de reporting des familles
  de mission (`shared/mission_core/reporting.js`) et le reporting général (`global_reporting.js`) ne portent plus de
  barre d'outils dans l'en-tête, qui garde titre et sous-titre comme les autres pages : famille · sous-type (ou puces des
  familles), « + Nouveau compte rendu », données (registre / journal), période, regroupement et mesure forment le
  **bloc n° 1 « Famille(s) et période »** (six commandes sur des rangées souples, styles `.mc-scope` de `core.css`) ;
  les blocs suivants gardent leurs identifiants (disposition et blocs masqués mémorisés), l'impression montre la période
  sans les commandes, le menu « Données » suit le changement de langue. Mon profil › **Niveau d'utilisation**
  (`settings_panels.js`, `settings_page.css`) : quatre cartes de niveau (numéro et nom, ce que le niveau montre,
  « Demande le Centre » pour 2 à 4 ; carte cochée en évidence, 2 × 2 sur grand écran), ligne « Niveau actuel », outils
  facultatifs avec une courte description (désactivés, « Tous inclus au niveau Expert » au niveau 4) ; textes produits
  dans la langue de la page, en quatre langues ; plus de légende « Mon usage ».
- **Ergonomie (C) : Aéro fidèle à la maquette ; Cartes de vol en ton foncé** — le design Aéro reprend sur les vraies
  pages les formes de sa maquette (`docs/technique/demo_design_icones.html`) : en-tête compact (titre 21 px, description
  en sous-titre à 84 % du texte du bandeau), blocs à marge intérieure de 20 px et titre sans filet, champs de 38 px à
  bordure fine et anneau de focus à la couleur des icônes, libellés en gras, groupes de champs arrondis, aides à 78 % du
  texte (≥ 4,5:1), tableaux de lecture aérés, onglets de page en pastilles, barre d'action arrondie en verre
  (`shared/designs.css`, règles `html[data-design="aero"]` seulement : Standard, Opérationnel et Console inchangés).
  **Cartes de vol** passe en ton foncé comme Carburant, dans tous les designs : `<html data-tool="dark">` (palette
  « outil sombre ») et règles de ton posées par `tools/build_map_planner.py` en couche « app » après celles du studio
  (surfaces, champs, boutons, onglets des profils, aperçus, pied de page ; accent du thème ; cartes et images
  inchangées) ; onglets lisibles en Opérationnel. Le Studio cartographique du Centre reste clair.
- **« Purger la zone… »** (panneau d'une zone qui a des données, Paramètres › Maintenance › Données aéronautiques) :
  après confirmation, supprime les fichiers de la zone du dossier SIA (toutes sources ; France : XML du SIA et axes
  ENR 5.7) et ses cases de `mora.csv` (ancien fichier archivé), oublie ses marques de mise en place, la désactive et
  relit la base ; le dossier X-Plane n'est pas touché. Une nouvelle activation réinstalle tout. Manuel administrateur
  (4 langues).
- **Types d'aéronefs : Airframe DB** (passe `--airframedb` de `AircraftDB/update_aircraft_db.py`, enchaînée par le
  lanceur après SimBrief, 40 fiches au plus par passe, 1,5 s entre deux, cache de 30 jours dans le dossier du cache OACI) :
  alias des noms en usage vers le code OACI (nom de la fiche, de la variante, de chaque désignateur : H125 → AS50,
  « Aero Vodochody L-39 » → L39…), jamais à la place d'un alias existant ni d'un désignateur officiel ; bloc
  `airframedb` de `aircraft_perf.js` (vitesses de croisière et maximale, plafond, vario, masses, distance franchissable,
  d'après Wikipédia) pour les types sans EUROCONTROL ni SimBrief (militaires, hélicoptères). Données gardées sur chaque
  poste ; `LICENSE.md`, manuel administrateur (4 langues).
- **Performances : modèle de Poll et Schumann** (`shared/fuel_poll_schumann.js`, `window.FuelPollSchumann`) — consommation
  de croisière calculée selon la masse, l'altitude et le Mach pour 68 avions de ligne à réaction (et 35 codes OACI
  équivalents) : portage en JavaScript de la partie croisière du modèle « PSFlight » de pycontrails (Apache 2.0,
  Contrails.org et Breakthrough Energy Foundation), paramètres générés par `tools/build_fuel_poll_schumann.py` ; résultats
  identiques à pycontrails 0.64 sur neuf cas (A320 à A380). API : `covers(icao)`, `fuelFlowKgh(icao, { massKg,
  altitudeFt, mach })`, `params(icao)` ; branché dans Carburant avant SimBrief (lot de la v2). Licence ajoutée
  (`LICENSES/Apache-2.0.txt`, `LICENSE.md`), avec SimBrief et les tracks NAT de la FAA.
- **Performances : SimBrief en seconde source** — la mise à jour des types (lanceur, « Compléter automatiquement » ;
  `AircraftDB/update_aircraft_db.py --simbrief`) lit aussi la liste publique de SimBrief (`inputs.airframes.json`, une
  requête, cache d'une semaine) : consommation de croisière (kg/h), masses du gabarit SimBrief (vide, sans carburant,
  atterrissage, carburant maximal), plafond, vitesse, distances et profils de 224 types, dans le bloc `simbrief` de
  `aircraft_perf.js` (sur chaque poste, jamais publié) ; fiches EUROCONTROL gardées, fichier réécrit seulement s'il
  change ; précision de SimBrief notée (`accuracy`). Manuel administrateur (4 langues).
- **Atlantique Nord : zone océanique et tracks NAT du jour** — nouvelle zone « Atlantique Nord (océanique, NAT) »
  (contour au large des côtes, `OCEANIC` de `tools/build_aero_zones.py`), sources X-Plane et « Tracks NAT du jour » :
  les points et routes océaniques d'X-Plane, jusqu'ici écartés car hors de tout pays, entrent dans la base quand la
  zone est active. Tracks : message de Shanwick et de Gander tel que publié par la FAA
  (`nms.aim.faa.gov/datanat/nat.json`), téléchargé et lu par le lanceur (`tools/aero_fetch.py nat` →
  `data/sia/zones/nat/nat_tracks.json` : lettre, points, niveaux est et ouest, validité ; fichier réécrit seulement si
  les tracks changent), gardés dans la base (`natTracks`), « ancien » au-delà de 12 heures. Cartes : case « Tracks NAT
  du jour » dans les voies aériennes (tireté magenta, « NAT A » ; « 63/20 » = 63° N 020° W, points nommés placés
  d'après la base), cochée dans AIRWAYS (profils de base, version 3). Manuels (4 langues).

### Corrigé

- **Bouton « Sauvegarder (n) » qui semblait ne rien faire** : tout ce que disait la sauvegarde (demande d'accès du
  navigateur au dossier, erreur, dossier introuvable) allait dans le message d'état du menu ☰, fermé. Désormais en
  notification : demande d'accès annoncée (« l'accepter dans la fenêtre du navigateur »), sauvegarde écrite, dossier
  non autorisé (sauvegarde téléchargée à la place, et comment rétablir le dossier), dossier déplacé ou supprimé (en
  choisir un autre), toute autre erreur (4 langues).
- **Registre : artefacts de missions indexées dont le dossier n'existe plus, sans moyen simple de les retirer** : à
  l'ouverture, le registre demande au lanceur les dossiers présents et marque « fichier absent » les missions qui n'en
  ont plus ; « Nettoyer le registre (n) » les retire sans dossier autorisé (plus de sélecteur de dossier), visible à
  tous les niveaux dès qu'il y a quelque chose à nettoyer, confirmation dans la page (4 langues). Une entrée
  incomplète (sans statut ni types) ne fait plus tomber la page du registre.
- **Carburant, profils supprimés ou fusionnés : retirés aussi du dossier performances** — plus de profils cachés à chaque
  relecture sans moyen de les retrouver (DC3, Caravelle) : après la confirmation (qui nomme les fichiers), la base
  exportée (`flight_performance_database.fpdb.json`…) est réécrite sans eux et un fichier d'un seul profil est renommé
  `.bak` ; « Annuler » 10 s remet aussi les fichiers. La marque `state.removedProfiles` ne reste que pour un profil encore
  dans un fichier (écriture refusée, CSV à plusieurs profils) ; « Dossier… » et « Relire » l'effacent (relire = reprendre
  ce que le dossier contient) ; ligne « n profil(s) retiré(s) encore dans le dossier — Restaurer ». Manuel utilisateur
  (4 langues).
- **Carburant, réponse ChatGPT : type de la réponse d'abord** — le code OACI et le nom viennent de la réponse (JSON :
  `icao`, sinon `type` ; CSV : colonne ICAO), l'appareil choisi n'étant qu'un repli ; type différent : confirmation
  (« Importer comme <réponse> » / « Importer comme <choisi> » ; pour une fusion : « Importer comme nouveau profil » /
  « Fusionner quand même ») ; l'identifiant `GPT_<code>` et le nom « <nom> — ChatGPT » suivent le code retenu (nom de la
  réponse seulement si elle décrit ce type, sinon modèle du type) — plus de nom d'un type avec le code d'un autre. Même
  type par alias : code de l'appareil choisi. CSV de la réponse : séparateur de l'en-tête détecté (virgule,
  point-virgule, tabulation). Manuel utilisateur (4 langues).
- **En-tête des pages chargées (Atterrissages, Studio, Cartes de vol…) : contrôles de la page écrasés par les outils
  du socle** (jusqu'à 750 px en Aqua) : bouton de sauvegarde au libellé court (« Sauvegarder (184) », libellé complet
  et date de la dernière sauvegarde en infobulle, 4 langues) ; première ligne de l'en-tête qui passe à la ligne,
  outils rangés à droite, au lieu de rétrécir les contrôles de la page.
- **Premier lancement : renvoi vers l'accueil en boucle** une fois « Terminer » validé : ouverte sans `?force`
  (Paramètres › Premier lancement, que le message de « Terminer » indique), la page renvoyait à l'accueil à chaque
  clic. Le renvoi ne vaut plus que pour la page ouverte par le lanceur (adresse `?t=…`).
- **Lanceur : réponses coupées pour les données servies depuis un autre disque** (`--data`) : le contrôle des
  empreintes de version échouait sur un chemin hors du dossier de la suite (fichier jamais reçu, « Failed to fetch »)
  ; un tel fichier part désormais tel quel, et aucune erreur de ce contrôle ne coupe plus une réponse.
- **Lanceur : « fournisseur inconnu : nat »** (tracks NAT) après une mise à jour sans relancer le lanceur : il gardait
  l'ancien `tools/aero_fetch.py` ; le module est relu quand son fichier a changé.
- **Registre des missions : artefacts aux fichiers absents** : au premier démarrage, le registre servi était repris
  tel quel, y compris les missions dont le dossier n'existe plus (registre périmé : 55 sur 67 dans une copie). Le
  lanceur liste les dossiers présents (`/__setup/mission-folders`) et seules ces missions sont reprises ; Paramètres ›
  Maintenance › Caches : « Index des données (registre des missions, CR, fiches) » avec le nombre de missions — sa
  purge reconstruit le registre proprement.
- **A400M sans performances ni fiche : alias à l'envers** — l'outil des types (`AircraftDB/update_aircraft_db.py`) et le
  jeu d'essai déclaraient « A400 → A4M » : le désignateur OACI de l'A400M (A400, celui d'EUROCONTROL et de SimBrief)
  était détourné vers un code maison inconnu partout ; la suite cherchait donc ses performances sous A4M et la
  complétion des types échouait. Alias remis à l'endroit (A4M et A400M → A400), type maison A4M retiré du jeu d'essai ;
  l'outil ne laisse plus jamais un alias détourner un désignateur OACI officiel vers un code qui n'en est pas un (il
  l'inverse, y compris pour un alias venu des données de la compagnie). À la prochaine complétion des types, la base de
  chaque poste est corrigée.
- **Types d'aéronefs : noms des missions sans code OACI** (« A330 MRTT Phénix », « C-130J-30 Super Hercules », « H225M
  Caracal », « Rafale B — Patrouille de 2 », « A330 ») affichés « fiche OACI manquante » ou classés « autre » : résolveur commun
  `AircraftCatalog.codeOf` (désignateur, alias, noms d'usage militaires des missions, nom propre du modèle quand il
  désigne un seul type) : A332, C30J, EC25, RFAL ; utilisé par Paramètres › Maintenance › Types d'aéronefs.
- **Contraste (rapport `docs/technique/CONTRASTE_2026-10-09.md`), Tableau et tableaux triables** : pastilles de
  simulateur en encre sombre ou blanche selon leur couleur (blanc d'office : 2:1 sur vert, jaune, cyan → 8:1) ;
  en-têtes des tableaux triables (4,4 → 5,9:1) et flèches de tri sans transparence (2,1 → 5,9:1) ; Tableau : petits
  textes des gabarits, libellé de l'heure courante et réservations ATC lisibles (encre du thème au lieu d'une opacité
  ou de l'accent).
- **Premier démarrage : « aucune mission » alors que le registre est plein** : le registre des missions du navigateur
  (index IndexedDB) n'était rempli qu'en relisant le dossier « Missions » ; seul le Tableau lisait le registre servi.
  À la première ouverture (index vide), le registre servi par le lanceur (`data/missions/mission_registry.yaml`) est
  repris pour toutes les pages (`shared/data_index.js`).
- **Types d'aéronefs : types des missions comptés « inconnus » de la base OACI** (« MIR2 Mirage 2000B », « A400M Atlas
  », « A330 MRTT Phénix »…) : le nom écrit dans la mission était comparé tel quel aux codes. Il est ramené à son code
  (texte entier, puis chacun de ses mots, code de la base ou alias : MIR2, A400, A332…). Alias ajoutés : H225M, EC725
  et Caracal → EC25 (table par défaut d'`update_aircraft_db.py` et références du jeu d'essai ; pris en compte à la
  prochaine mise à jour de la base des types).
- **Studio et Cartes de vol : l'aperçu ne se redessinait plus après une modification du profil de carte** (fond,
  zones, symboles, éléments). Depuis la 4.2.0, « Réglages du profil » est déplacé sous l'aperçu du bloc Route, hors du
  conteneur dont l'écouteur relançait l'aperçu : ses changements n'y remontaient plus. Changements du profil écoutés
  au niveau du document (deux conteneurs) ; `map_planner.html` regénéré.
- **Import de la MILAIP ENR 5.7 : XML écrit d'office** : après l'import du PDF, il fallait encore cliquer « Écrire
  miam-enr-5-7-tracks.xml ». Dès que des axes sont lus, le XML est écrit dans le dossier SIA (édition lue dans le PDF,
  ancien archivé, base mise à jour), les anomalies restant listées ; « Écrire… » ne reste, avec sa raison, que si
  l'écriture n'a pas pu se faire (dossier SIA à autoriser d'un clic).
- **Textures, icônes et polices absentes après un clone de la suite** : un clone fait sans Git LFS installé ne laisse
  que des pointeurs (texte de 130 octets) à la place des images, textures et polices suivies par Git LFS. Le lanceur
  contrôle désormais la suite et `data/` à chaque démarrage (et après le clone des données) : fichiers récupérés par
  `git lfs pull` si Git LFS est installé, sinon consigne dans sa fenêtre et en notification sur la page de premier
  lancement (installer Git LFS, relancer), jamais en silence ; `tools/update_suite.py` les récupère après une mise à
  jour et les signale dans `doctor`.
- **Premier lancement : ID IVAO (et autres champs du profil) absent de Mon profil › Identité et réseaux** : la carte «
  Pilote » ne s'enregistrait qu'avec « Enregistrer le profil » ; une saisie suivie du passage à l'étape suivante était
  perdue sans avertissement. Chaque champ (trigramme, ID IVAO, ID VATSIM, SimBrief, identifiant du site) s'enregistre
  désormais dès qu'on le quitte, comme ☰ › Profil pilote ; trigramme figé (mode production) jamais réécrit.
- **Données aéronautiques : « Choisir le dossier… » X-Plane restait dans « Actions à faire » une fois le dossier
  choisi** : autorisation à renouveler (après un rechargement), la ligne propose « Ré-autoriser le dossier… » pour ce
  dossier ; dossier autorisé dont « Custom Data » est d'un ancien cycle, simple information (mise à jour dans X-Plane,
  Navigraph), hors du compte des actions restantes (4 langues).
- **Premier lancement, données aéronautiques : « dossier X-Plane non choisi » au recalcul de la MORA** : la source
  X-Plane, facultative pour une zone dont la MORA est calculée (France…), était affichée en rouge « manquant » et
  comptée dans les actions à faire, et « MORA d'X-Plane → mora.csv » renvoyait une erreur sans dossier. La source est
  désormais « facultatif » (en fin de liste, hors du compte des actions restantes ; exigée seulement pour une zone
  trop étendue) ; le bouton enchaîne lui-même : choix du dossier du simulateur, reconstruction de la base, puis MORA
  d'X-Plane (4 langues).
- **Planning et Tableau, bloc des zones : colonnes VATSIM / IVAO de l'éditeur des activations prises pour des blocs
  imbriqués sans titre** (`repo-block`, `block-1` / `block-2`) : écrites en `<section>`, que le framework transforme
  en blocs ; ce sont désormais de simples conteneurs (`shared/odv_activations_editor.js`).
- **Paramètres › Maintenance : la rubrique « Types d'aéronefs » paraissait un instant à l'ouverture, puis
  disparaissait** : l'éditeur des bases ouvrait sa première rubrique avant que la page n'ouvre « Mises à jour ». Page
  Maintenance sans `?base=`, ou bloc demandé (`?m=`) : aucune rubrique de l'éditeur n'est rendue. Journal des bugs
  ouverts et fermés : `docs/technique/BUGS.md` ; dette technique : deux observateurs de réécriture restants.
- **Cartes de vol, mission reçue de Mes missions** : aux niveaux 1 à 3, « Générer les cartes et le ZIP » remplaçait les
  cartes prévues par la mission par celles d'un vol libre construit à partir du cheminement ; il génère désormais les
  cartes de la mission telles quelles. « Tracer » et « Carburant » travaillent sur la mission chargée sans la remplacer,
  et « Préparer les cartes » (niveau Expert) demande confirmation avant de la remplacer, comme le dit le manuel.
- **Manuels (4 langues), chemins d'accès de la v2** : « Compte rendu » au lieu de « CR », onglets de « Outils » (Cartes
  de vol, Carburant, Atterrissages, Analyse des missions) et de « Missions » (Registre, Générateur, Studio
  cartographique), « Paramètres » partout (nom retenu pour les réglages) ; bouton « Générer une mission » du registre ; « DLO et
  butées » repliables ; Cartes de vol : blocs « Cheminement » et « Cartes », bouton unique des niveaux 1 à 3. Prise en main : déplacement des blocs (moitié haute ou basse, autre colonne) et ☰ « Réinitialiser l'ordre
  des blocs ».

### Modifié

- **Carburant, aperçu de fusion : données à cocher** — une case par champ qui change et par ligne de cartographie
  ajoutée ou remplacée (décochée : la valeur actuelle est gardée, ligne grisée « gardé »), « Tout reprendre » / « Ne rien
  reprendre », bouton « Fusionner (7 champs, 1 ligne de cartographie) » grisé si rien n'est coché ; même fenêtre pour
  SimBrief et ChatGPT ; note de fusion et notification limitées à ce qui a été repris. Le nom ne redessine plus l'aperçu
  (sélection gardée). Tableau des profils : colonne de l'appareil alignée à gauche. Panneau ChatGPT : il suit
  l'appareil choisi ou coché ; un seul onglet ChatGPT, réutilisé, sans préremplissage. Manuel utilisateur (4 langues).
- **Carburant, Profils de performances, retours de l'utilisateur** : un seul bouton par ligne (« Choisir », ou
  « Créer » avec « Créer depuis SimBrief » à côté pour un type sans profil), tableau resserré ; cases de sélection pour
  « Fusionner (n) », « Exporter (n) » (un fichier téléchargé par profil : `.lnmperf` si complet, sinon JSON),
  « Enregistrer dans le dossier (n) » (un JSON par profil, nommé d'après le profil ; jamais un fichier qui les regroupe) et
  « Supprimer (n) » (une confirmation, un seul message pour le lot, « Annuler » 10 s) ;
  dans la fiche du profil actif, « Mettre à jour depuis SimBrief » avec sa phrase d'explication (au lieu de « Profil
  SimBrief ») ; fenêtre de choix habillée par le socle (`.repo-ask`), sans couleurs propres. Manuel utilisateur (4 langues).
- **Carburant, modèle de performances** : un type absent de la base OACI du poste, sans motorisation renseignée, n'est plus pris pour un piston (plafond calculé vers 12 000 ft, courbes « inaccessibles » dès le FL120 pour une Caravelle III) : la TAS de croisière départage (réacteur au-dessus de 320 kt, turbopropulseur au-dessus de 230 kt), et une note de la base du calcul dit que la motorisation a été déduite et comment la fixer.
- **Manuels (4 langues), Carburant (V2_FABLE § 7)** : liste d'appareils (flèches, Entrée, Échap), curseurs « Montée
  choisie » (badin, vario, gaz ou régime ; deux fixés, le troisième calculé ; « plein gaz » sous le vario), bloc
  « Consignes de montée » (cinq objectifs, Régler / Tenir / Attendu, tableau par tranche d'altitude), graphe de montée
  par altitude ou par régime, bandeau d'instruments avec altimètre et chronomètre, bloc « Profils de performances »,
  colonne « Altitude (ft) » de la cartographie moteur, « Copier JSON » grisé ; dossier performances relu par Carburant.
- **Manuel utilisateur (4 langues), Carburant** : l'estimation de consommation s'appuie sur la fiche Airframe DB (TAS de
  croisière, plafond) pour les types sans fiche EUROCONTROL ni SimBrief.
- **Estimation de consommation (`shared/fuel_reference.js`)** : la fiche Airframe DB du type (posée par le lanceur pour les types sans EUROCONTROL ni SimBrief) affine l'estimation par classe — TAS de croisière, plafond (`ceilingFt`) et catégorie de sillage d'après sa MTOW ; la consommation reste celle du type ou de la classe. Manuels administrateur : paragraphe « Types d'aéronefs » fusionné avec develop (Airframe DB), alias cité à l'endroit (A4M → A400), rechargement automatique.
- **Manuels (4 langues), Premier lancement et types d'aéronefs** : retour au premier lancement seulement si le dossier
  de l'application ou les données manquent (rappel discret dans l'accueil ensuite) ; « Terminer » au bout du rail et bloc
  de fin toujours visible ; étape 5 : ligne d'état des types avec « Compléter automatiquement », téléchargement suivi,
  rechargement et bilan automatiques, types estimés (« ≈ … (type connu) », « (classe OACI …) ») ; Types d'aéronefs : un
  groupe par avion, types en clair des CR reconnus ; Carburant : ligne d'état « Calculé pour … ».
- **Premier lancement, étape 5 « Types d'aéronefs »** : un seul groupe par avion — les libellés en clair des missions (« A332 A330 MRTT Phénix ») et des CR (« A330 MRTT PHÉNIX ») sont ramenés au code OACI par le catalogue (flotte, alias, noms d'usage ; `shared/aircraft_catalog.js`, aussi dans `mission_core/aircraft.js` : plus de type local parasite) ; la ligne d'état nomme les types à compléter et porte « Compléter automatiquement » ; pendant la passe, étape et durée ; à la fin, la page se recharge d'elle-même et montre le bilan (aussi après « Tout installer ») ; les types sans performances EUROCONTROL sont « estimées » (consommation par type ou classe OACI, `shared/fuel_reference.js`, dans le bloc Types d'aéronefs de Maintenance et Installation aussi) ; « Terminer » sort de l'étape 6 (dernier point du rail, cerclé quand tout est fait : l'étape Centre ne s'allume plus pour un pilote) ; le lanceur ne ramène au premier lancement que si le dossier ou les données manquent, l'accueil rappelle le reste en discret.
- **Manuels (4 langues), Carburant et Sources et dossiers** : chaîne de la consommation de croisière (saisie, profil,
  Poll-Schumann, SimBrief, estimation ≈), champ « Consommation de croisière » (« Utiliser cette valeur », « Mémoriser
  pour ce type »), « Montée choisie » (au lieu de « loi réglée »), « Vue détaillée » / « Vue simple », « Comparaison des
  montées », origine de la consommation dans la base du calcul ; Sources et dossiers : « Dossiers déduits (3) »
  repliés, ligne X-Plane unique avec « Journaux d'atterrissage : autre dossier… ».
- **Manuels (4 langues)** : groupe « Référence et journal » (ex-« Base ») des rubriques de Paramètres, colonne « Terrain
  de base » de la flotte ; Premier lancement : « Terminer » après les étapes 1 et 2 (3 à 5 recommandées), type sans fiche
  OACI non bloquant à l'étape 5.
- **Manuels (4 langues) alignés sur le lot d'ergonomie A à E** : Mon profil › Niveau d'utilisation (cartes de niveau,
  « Niveau actuel », outils facultatifs décrits) ; Premier lancement (rail des six étapes et leurs états, « Suivant → »,
  étape 5 dans l'ordre types puis données aéronautiques, « Tout installer pour <zones> », « Outils avancés », étape 6 et
  « Terminer ») ; reportings (bloc « Familles et période » / « Famille et période ») ; Paramètres (« Plus… », ligne
  « État », rubrique Types d'aéronefs de Maintenance, « Flotte et pilotes de la compagnie (référence anonymisée) »,
  séries d'indicatifs du journal).
- **Plus d'empreintes `?v=` dans le dépôt (develop)** : toutes les références à `?v=0` (`tools/bump_versions.py
  --neutral`), le lanceur pose les empreintes réelles en servant (`tools/version_stamps.py`) ; `tools/publish_dist.py`
  les pose dans l'archive de livraison ; `tools/README.md`, `docs/INSTALL.md` (repris de v2-fable, 5c67f30c8).
- **Empreintes de version posées par le lanceur** (`tools/version_stamps.py`) : quand il sert une page, un script ou
  une feuille des designs, chaque référence `chemin?v=…` reçoit l'empreinte du contenu servi du fichier visé (mêmes
  références que `tools/bump_versions.py`) ; pages servies avec un ETag (304 si inchangées), fichiers versionnés en
  cache long, résultats gardés en mémoire tant que leurs fichiers ne changent pas (0,2 ms par fichier). Prépare le
  passage du dépôt à `?v=0` : plus d'empreintes à recalculer et à fusionner avant chaque commit.
- **Cartes : profils de base revus** (Studio cartographique, Cartes de vol) — profils réglés par l'administrateur :
  IFR, **IFR simplifié** (nouveau), VFR détaillé, VFR simplifié, AIRWAYS. Profil par défaut d'une carte : IFR simplifié
  pour la carte principale d'une mission et les vues d'ensemble, VFR détaillé pour cible, détail et rendez-vous, VFR
  simplifié pour l'approche ; Cartes de vol (hors mission) : AIRWAYS pour la carte de la route. Les profils de base déjà
  gardés dans un navigateur sont remplacés une fois (`BASE_PROFILES_VERSION` 2 ; ancienne liste dans
  `siaDisplayProfiles:avant`, profil de même nom créé à la main repris) ; les profils créés par l'utilisateur restent.
  **Points RNAV en route** : nouvelle case dans « Points de report VFR » (points désignés OACI de la base : SIA, autres
  pays, X-Plane, openAIP ; triangle bleu, libellé avec ceux des points VFR), cochée dans AIRWAYS. Manuel utilisateur
  (4 langues).
- **Données aéronautiques : mise en place des zones idempotente** — si tout est là, rien n'est refait. Une source
  téléchargée à jour (moins de 28 jours depuis son téléchargement ou sa dernière vérification) n'est pas retéléchargée ;
  « Tout récupérer et recalculer » la revérifie par requête conditionnelle (`If-Modified-Since` : réponse 304 sans
  téléchargement). Le lanceur (`tools/aero_fetch.py`) ne réécrit jamais un fichier identique, ne retélécharge pas un
  amendement ENAIRE déjà présent et ne relit pas un PDF inchangé (AIP militaire britannique, NAV CANADA) ; les dépôts
  de Téléchargements identiques ne sont pas réécrits. La base aéronautique n'est relue que si ses entrées ont changé :
  empreinte des fichiers lus (taille, date), des zones actives, des sources cochées et de la version du lecteur, gardée
  à chaque relecture (`SiaBase.upToDate`) et suivie quand la suite réécrit `mora.csv` ou les axes ENR 5.7 avec la base.
  Relancée sans rien de nouveau, la mise en place ne télécharge, n'écrit et ne recalcule rien (« base déjà à jour »).

### Livraison

- Archive de livraison : `xplane-web-suite-5.1.0.zip` — SHA-256 `07ed25ee741ff296d6a789224cf42721385b9671266c5b91d38f82837c7492d9` (code seul, hors dépôt : dossier `dist/`).

## [5.0.0] — 2026-10-08

Version « v2 » : la suite s'adapte à son utilisateur. Un **niveau d'utilisation** (équipage, planification, conception,
expert) remplace « avec ou sans Centre » et range barre latérale, menus, accueil et pages, sept entrées au plus par
groupe ; outils facultatifs cochés à part. Page **« Aujourd'hui »** (prochaine mission, CR à écrire, semaine).
**Planning refait** en six blocs natifs, consultable par tous en lecture seule, avec Annuler, retrait d'une demande de
zone et « Masquer les pilotes indisponibles » ; habilitation corrigée (écriture réservée à `admin_centre`). Cartes de
vol, Carburant, Mes missions, CR (court par défaut), Réglages, Générateur et Registre simplifiés aux premiers niveaux ;
Missions s'ouvre sur le registre ; même largeur pour toutes les pages. Bouton Arrêter sur les tâches longues, messages
d'erreur clairs. Nettement plus rapide (Planning, Cartes de vol, Studio, Maintenance, sauvegarde, synchronisation,
décor). Corrigés : convoyages du Tableau, déplacement des blocs, dossier des profils d'une autre copie. Clés de poste
et signatures prêtes (pas encore branchées).

### Ajouté

- **v2-fable, performance (4) : Studio et Cartes de vol** — le résumé « Zones retenues » (7 000 espaces filtrés, jusqu'à
  400 lignes) n'est recalculé que si le profil ou la base ont changé : 123 ms → 0 à chaque autre rendu du profil.
- **v2-fable, performance (3) : base SIA plus légère à l'ouverture** — les villes (GeoNames, ≈ 70 000 entrées) sont rangées
  sous leur propre clé de la base du navigateur (`SiaBase.cities()`, migration silencieuse d'une base existante) : la
  base se lit en 115 ms au lieu de 210 ; le Studio et les Cartes de vol les lisent après le premier affichage et avant
  une génération ; axes de ravitaillement analysés à l'inactivité ; complétion des zones calculée au focus du champ.
- **v2-fable, performance (2) : Cartes de vol et Studio cartographique** — les listes de complétion des zones, aérodromes
  et balises (jusqu'à 13 000 `<option>` d'après la base SIA) ne sont plus écrites au chargement mais quand leur champ
  reçoit le focus : page de 15 000 à 1 500 éléments, tâches longues après le premier rendu de 1,5 s à 0,55 s (mesuré en
  Aqua, Chrome).
- **v2-fable, lot 2** (`docs/technique/V2_FABLE.md` § 5) — **pastille de synchronisation** : aux niveaux 1 et 2, le
  bouton « Synchroniser » de l'en-tête garde son libellé et porte une pastille quand il y a quelque chose à envoyer ou à
  recevoir, au lieu du compteur « (n) » (règle `html[data-level]` de `repository_nav.css` ; le nombre reste dans le
  bouton pour les niveaux 3-4 et en tête de l'infobulle, quatre langues ; contenu du bouton réécrit seulement s'il
  change). **Bouton « Arrêter » sur les tâches longues** : Studio cartographique et Cartes de vol (aperçus et génération
  des cartes, aperçus et génération de toutes les missions d'un lot : arrêt entre deux cartes, ni ZIP ni rangement d'une
  génération incomplète, bilan du lot arrêté), Maintenance (MORA d'une zone, calcul complet de la grille, MORA par blocs
  — le bloc en cours est écrit, mora.csv partiel signalé —, import de la MILAIP ENR 5.7), lecture du dossier du registre
  des missions (registre inchangé) ; `job.end(false)` : fin sans notification (tâche d'un lot qui fait son bilan).
  **Messages d'erreur clairs** : `AppFramework.explain(erreur, contexte, { remote })` dit ce qui a échoué et quoi faire,
  en quatre langues (serveur du lanceur muet, service en ligne muet, erreur du serveur, fichier absent, espace du
  navigateur saturé, accès refusé, délai dépassé, annulé ; sinon « échec (détail technique) ») et sert à `job.fail` ;
  appliqué aux erreurs de Mes missions (affectations illisibles, fichier de mission introuvable ou illisible), Tableau
  et Planning ODV, Studio cartographique (villes ou MORA absentes de la base, SimBrief, enregistrement, exports),
  Générateur de mission (exports PDF et YAML, imports, enregistrement), registre des missions, Maintenance (dossier SIA,
  ZIP du SIA, MORA, sauvegarde totale, blocs de la page) et compte rendu (plan de vol, import, dossier du registre).
- **v2-fable, performance (1)** : Planning — plus de requête par pilote et par semaine quand l'index des déclarations ne
  connaît pas la semaine (`SuiteDispos.readPilot` filtre les semaines demandées par `data/disponibilites/_index.json` ;
  48 réponses 404 par ouverture avant) ; réglages de compagnie et de sources (`suiteVA:v1`, `suiteSources:v1`) et outils
  cochés lus par analyse mémorisée (`jsonCached`) au lieu d'une analyse JSON par texte traduit (1 900 analyses par
  ouverture du Planning avant, 160 après).
- **v2-fable (branche `v2-fable`) : la suite dit quoi faire et se tait quand ça ne concerne pas** (proposition et
  fichiers : `docs/technique/V2_FABLE.md`) — page **« Aujourd'hui »** (`apps/pilot/aujourdhui.html`, première entrée de la
  barre latérale à tout niveau, en tête de « Mes tâches » de l'accueil) : trois blocs, une action chacun — ma prochaine
  mission (« Ouvrir le dossier »), comptes rendus à écrire (missions passées sur 21 jours sans CR dans le registre,
  « Écrire le compte rendu » / « Pas de CR », sept lignes au plus), ma semaine ; sans trigramme, le premier bloc le
  demande sur place (champ + « Enregistrer »). Module `shared/pilot_today.js`. **Nouveau compte rendu** : bloc « Mes
  missions à rendre » avant le choix de la famille. **Mes missions** : trigramme saisi sous la liste (plus de renvoi
  aux réglages), `?mission=` d'une autre semaine (semaine de la mission affichée, missions passées montrées au besoin),
  `?do=cr` (CR commencé à l'ouverture du dossier). **Socle** : `AppFramework.notify(…, { once, minLevel })` (une fois par
  session ; niveau minimal d'affichage), appliqué au rappel « Base SIA absente » du Studio cartographique et des Cartes
  de vol ; `AppFramework.task(…, { cancel })` avec bouton **Arrêter** (« Arrêt… » puis « Annulé. »), branché sur la mise
  en place des zones de Maintenance ; champs de texte qui s'agrandissent avec leur contenu (`field-sizing: content`,
  `data-fixed-size` pour garder une hauteur fixe) ; icône `today`, entrée de barre latérale et d'accueil. Manuel
  utilisateur : chapitre « Aujourd'hui » et retouches, en quatre langues.
- **v2 (branche `feature/v2-niveaux`), lot L0 : niveau d'utilisation** — Mon profil › « Niveau d'utilisation » remplace
  « avec ou sans Centre » : 1 équipage (Mes missions, Compte rendu, Planning en lecture), 2 planification (Planning ODV),
  3 conception (Missions : générateur, registre), 4 expert (tous les outils, studio cartographique) ; outils facultatifs
  (cartes de vol, carburant, atterrissages, analyse des missions) cochés à n'importe quel niveau, rangés sous « Outils ».
  Barre latérale, onglets, menu ☰ et accueil ne montrent que les pages du niveau (`pages[].level`, `pages[].module`),
  au plus sept entrées ; Apparence en onglet de Réglages. Le niveau range l'interface, sans donner de droits.
  Proposition complète : `docs/technique/V2_NIVEAUX.md`.
- **v2 : studio cartographique dans Missions** (onglet, niveau 4) ; « Outils » ne garde que les outils facultatifs, sans
  rien du Centre. L'icône du Centre ne marque Planning et Missions que pour qui s'en sert (Centre ouvert, niveau 2 ou
  plus, pas un compte sans le rôle `admin_centre`) ; sinon icône ordinaire.
- **Planning : « Masquer les pilotes indisponibles »** (palette et vue semaine du Tableau, reprise de la page ODV ; même
  règle que les conflits : plage qui rend affectable à un vol) ; au **niveau Expert**, créneaux communs (plusieurs
  pilotes disponibles) et missions probables repris de la page ODV (voir « Planning refait »).
- **v2, niveau 1 : Planning en consultation seule**, quels que soient les droits (Centre ouvert compris) : ni DLO et
  butées, ni activations de zones, ni modification ; thème ordinaire au lieu de celui du Centre pour qui ne fait que
  consulter (niveau 1, Centre fermé, compte sans le rôle `admin_centre`).
- **v2, Planning rationalisé** : une seule page (plus d'onglet « Planning ODV ») ; au niveau Expert, créneaux communs et
  missions probables dans la page (« Page ODV complète » pour le classeur et l'export) ; **Annuler** (dix pas, Ctrl+Z) ; **Retirer la demande** d'une zone inscrite comme demandée ; l'ordre du
  jour en premier bloc, sa barre (semaine, jours, vue, annuler, briefing) au-dessus de la frise.
- **v2, lot S0 : niveaux dans les pages** — `<html data-level>` posé dès l'en-tête (repository_tree), `data-min-level="n"`
  (élément visible à partir du niveau n) et `data-max-level="n"` (jusqu'au niveau n) appliqués par `repository_nav.css`,
  sans réécriture de la page : blocs, champs et boutons se marquent à la source.
- **v2, lots S1 à S5 : pages simplifiées par niveau** (tout reste au niveau Expert) —
  **Cartes de vol** aux niveaux 1 à 3 : route, niveau, SimBrief, liste des cartes, « Cartes du vol », un seul
  « Générer les cartes et le ZIP » ; **Carburant** (nouveau titre) : avion, plan de vol ou dernier FPL SimBrief,
  « Paramètres du vol » repliés, Calculer, Résultat ; **Mes missions** : dossier réduit à l'essentiel au niveau 1, boutons
  Cartes de vol et Carburant selon les outils cochés, une seule barre de semaine, « Plage précise » repliée ; **CR court**
  aux niveaux 1-2 (identification, résultat, appareil, équipage, 4 heures, carburant, blocs de la famille, remarques) et
  bouton « CR détaillé » ; **Réglages** : Installation au niveau 2, Maintenance au niveau Expert, sept entrées au plus par
  groupe, doublons retirés de la vue (langue, client OAuth IVAO, rubrique « Premier lancement » d'Installation, second
  « Nettoyer et recommencer »), Apparence réduite aux designs courants et aux icônes ; **Générateur et Registre**
  (niveau 3) : sept blocs, commande à six réglages et « Plus d'options », quatre filtres et « Plus de filtres », sept
  colonnes.
- **v2, Planning refait** : six blocs natifs, déplaçables et repliables, sans cadre : Ordre du jour (barre de la semaine
  et frise, tous niveaux), Équipage de la semaine (dispos et DLO, ancienne vue « Semaine »), Zones (activations et demandes
  réunies), Statistiques (ancienne vue) au niveau 2 ; Créneaux communs et Missions probables au niveau Expert, servis par
  le script de la page ODV dans la page (même semaine que le Planning, `OdvPlanning.setMonday`) ; styles des blocs ODV
  partagés (`apps/cpco/odv_blocks.css`) ; plus de choix de vue ; lien vers la page ODV complète (classeur, export).
- **v2, retouches** : Missions s'ouvre sur le registre, bouton « Générer une mission » vers le générateur ; onglet
  « Mes disponibilités » de nouveau à tous les niveaux ; « Commander à ChatGPT » : copie du prompt et ouverture de ChatGPT
  dans le geste de l'utilisateur, avant l'inscription au registre (la copie était refusée) ; échec SimBrief du Carburant
  aussi en notification flottante (détail visible à tout niveau) ; note « Clés d'API » : client OAuth IVAO dans Mon
  profil au niveau Expert.
- **v2 : même largeur pour toutes les pages** — contenu sur toute la largeur disponible à côté de la barre latérale, marge
  commune de 16 px (`--repo-main-pad`, une règle dans `repository_nav.css`) ; textes longs de l'aide limités dans l'article ;
  la fenêtre détachée du studio reste bord à bord.
- **v2, Cartes de vol** : blocs « Route » et « Cartes » ; aux niveaux 1 à 3, un seul bouton « Générer les cartes et le ZIP »
  dans le bloc des cartes, sous leur choix (crée les cartes puis lance la génération), progression et compte rendu juste
  dessous, plus de pied de page ni de bloc « Aperçus et génération » ; au niveau 4, « Préparer les cartes » puis la
  génération du pied de page.
- **Pages de démonstration du moteur des CR hors des comptes rendus** : `apps/cr/MissionCore/` → `tools/demo/mission_core/`
  (outils de développement, niveau Expert) ; plus rien dans le dossier des CR qui ne soit une famille.
- **Clés de poste et signatures** (`shared/sog_keys.js`, lot L2 de [COMPTES_SIGNES.md](technique/COMPTES_SIGNES.md)) : par
  poste, une paire de signature ECDSA P-256 et une paire d'échange ECDH P-256, non exportables, gardées dans la base
  `sogKeys` du navigateur (hors sauvegarde) ; empreinte courte `7F3A-91C2-04BE-D85E` ; JSON canonique (RFC 8785) ;
  enveloppes et fiches signées ; clé de secours chiffrée par mot de passe (PBKDF2 600 000, AES-GCM). Pas encore branché
  sur les pages (registre et enrôlement : lots suivants). Banc d'essai : `tools/crypto_banc.html`.

### Corrigé

- **Paramètres › Maintenance (bases) : 21 libellés affichés en anglais en allemand et en espagnol** (flotte, accès au
  Centre, calcul des routes de transit, valeurs par défaut…) : traductions ajoutées (`shared/data_admin_i18n.js`) ;
  l'anglais de la mise à jour de la flotte depuis le site mentionne la mise à jour automatique quotidienne.
- **Tableau : plaquette de convoyage réinitialisée à la modification d'une mission** : le recalcul des convoyages
  retirait toute plaquette qu'il ne savait pas recalculer à cet instant (mission absente du registre le temps d'une
  relecture, appareil hors flotte, terrain sans coordonnées ou liste des aéroports non téléchargée), puis la recréait
  au passage suivant à l'heure calculée, « à affecter » : déplacement à la main et convoyeur perdus. Une plaquette
  n'est plus retirée que si son vol ne la demande plus (vol supprimé, appareil changé ou déjà au terrain de départ) ;
  sinon elle est gardée telle quelle. Une durée changée à la main est gardée tant que le trajet ne change pas (durée
  calculée notée dans `convoyage.minutes`). Fenêtre du vol : un pilote posé qui n'est pas dans la liste des membres
  (membre désactivé, pilote venu des affectations) reste proposé au lieu d'être effacé à l'enregistrement.
- **Déplacement des blocs (poignée ↕)** : le bloc visé s'illumine dans tous les designs (contour d'accent et trait
  d'insertion ; l'ancienne ombre était recouverte par les designs à matières, visible en Métro seulement) ; posé sur la
  moitié haute d'un bloc, le bloc déplacé va avant lui, sur la moitié basse après (dernière position possible) ; dépôt
  dans une autre colonne ; la page défile pendant le glisser près du bas de la fenêtre et sous l'en-tête fixe (monter un
  bloc tout en haut d'une longue page). Disposition mémorisée sous une clé unique par conteneur (`layout`) ; les
  dispositions déjà mémorisées (`order`) restent lues. Un dépôt qui ne changerait rien est retourné : bloc 1 lâché sur
  le haut du bloc 2 → « après 2 », et dans l'autre sens « avant » (blocs cachés ignorés). Menu ☰ : « Réinitialiser
  l'ordre des blocs » (ordre d'origine de la page, blocs masqués gardés), 4 langues.
- **« Suite lancée depuis …, dossier déclaré …/planner/ » alors que le dossier de l'application est le bon** : le
  dossier des profils de performance (et celui de la sauvegarde locale) était gardé d'une installation à l'autre, pour
  respecter un choix personnel — y compris quand il venait d'une autre copie de la suite. À la déduction des dossiers,
  un dossier gardé qui est celui d'une autre copie (non confirmée) est désormais remplacé par celui de `data/` ; le
  premier lancement refait la déduction à l'ouverture.
- **Habilitation du planning** : un compte connecté sans le rôle `admin_centre` pouvait, Centre ouvert en mode develop,
  inscrire des zones comme demandées, modifier les DLO (objectifs) et, au Planning ODV, ajouter, retirer ou importer des
  sessions ATC, écrire des préférences dans les fiches et affecter des pilotes. Tableau et Planning ODV : écriture
  réservée à `admin_centre` dès qu'un utilisateur est connecté (et toujours en production), lecture seule sinon.
- **Tableau en lecture seule** : le planning seul (frise du jour : vols, contrôles, divers, notes) ; zones, ATC, dispos
  communes, problèmes, journal, vues semaine et statistiques, activations et demandes de zones réservés au Centre.

### Modifié

- **Icônes des blocs : passe limitée à l'élément remonté** : `AppFramework.refresh(racine)` (éditeur d'activations,
  panneaux remontés dans un bloc) relançait la passe des icônes sur toute la page ; elle se limite désormais à cette
  racine, `refresh()` sans racine gardant la passe complète.
- **Décor des designs à matières : passes inutiles du chargement supprimées** : en plus des recalculs déclenchés par
  les changements de hauteur et de blocs, le décor était refait sans condition au chargement complet puis une seconde
  après (jusqu'à 80 ms chacune). La passe du chargement complet est regroupée avec celles des changements de hauteur
  qui l'entourent ; celle d'une seconde après n'a lieu que si la mise en page a changé (design, ton, largeur, hauteur,
  place des blocs).
- **Activations de zones (Tableau, Planning) plus légères** : le tableau des activations importées (IVAO), replié,
  était construit en entier à l'ouverture de la page (des centaines de lignes) et la liste des zones proposées portait
  une option par zone de la base — près de 8 000 éléments pour ce bloc dans le Tableau. Le tableau des importées est
  construit à l'ouverture de son volet, la liste des zones au premier passage dans un champ « zone ». Audit
  `tools/perf_audit.html` : parcours mis à jour (pages de CR renommées, Aujourd'hui, Tableau, accueil).
- **Sauvegarde automatique des données du navigateur allégée** : au départ de chaque page (et toutes les 5 minutes),
  elle analysait tout le stockage du navigateur et refaisait le texte YAML complet, puis constatait qu'il n'avait pas
  changé — des dizaines de ms à chaque changement de page avec un stockage de 400 Ko. Au départ d'une page, une
  empreinte rapide des textes bruts (et de la date du registre) décide ; le contrôle complet des 5 minutes, bases
  IndexedDB comprises, est inchangé. Sans dossier de sauvegarde autorisé, le texte n'est plus construit du tout.
- **Paramètres › Maintenance plus rapide à l'ouverture** (audit `tools/perf_audit.html`) : les réglages des zones
  aéronautiques étaient analysés à nouveau pour chaque fichier de la base (1 122 analyses JSON à l'ouverture) —
  analyse gardée tant que le réglage ne change pas ; les tableaux éditables des bases (flotte, indicatifs…) montrent
  100 lignes, puis « Afficher les 100 suivantes » ou « Tout afficher » (le filtre et le tri portent sur toutes les
  lignes), listes de choix calculées une fois par colonne. Ouverture : 11 300 → 4 300 éléments, analyses JSON 1 200 →
  79, page bloquée 921 → 216 ms.
- **État de la synchronisation servi tout de suite** : le lanceur relançait ses commandes git (1 à 3 s sur un gros
  dossier `data/`) à chaque ouverture de page, deux fois. Il répond désormais avec le dernier état connu et le relit en
  tâche de fond s'il a plus de 20 s (relu tout de suite au premier appel, avec le dépôt distant, et après un passage de
  synchronisation).
- **Fréquence de vérification de la synchronisation réglable** (Paramètres › Maintenance › Versions et
  synchronisations, réglage de ce navigateur) : à chaque page, toutes les 30 minutes (défaut), 3 fois par jour, une fois
  par jour, et « Vérifier maintenant ». Le bouton « Synchroniser » s'affiche tout de suite avec le dernier état connu
  (`syncState:v1`), sans requête ; une seule vérification (dépôt distant compris) quand la période est écoulée, au lieu
  de deux à chaque page et d'une toutes les 5 minutes ; après une écriture, relevé local seul. Manuels (4 langues).
- **Nom de la compagnie par jetons résolus à la source** : `{SOG}`, `{SOG_NOM}`, `{SOG_NOM_LONG}`, `{CENTRE}` dans les
  textes (quatre langues, HTML fixe et titres d'onglet compris), résolus par `K.t` / `K.tf` / `K.brand` et par la
  traduction des textes fixes, de nouveau quand la compagnie réglée change ; l'observateur qui renommait la page après
  coup est supprimé (pages de Paramètres figées, nom réglé contenant l'ancien). Données inchangées.
  « SO Group » seul (premier lancement, mode autonome du Centre) et libellés de catégories du jeu d'essai en jetons aussi.
  Voir `docs/technique/FRAMEWORK.md` § 4 bis.
- **Carte « Accès au Centre » remise en ordre** (Centre verrouillé) : champ du mot de passe, puis bouton « Activer le
  Centre » avec « Mot de passe : DEFA » sur la même ligne (premier lancement compris) ; texte d'introduction à jour (le
  mot de passe vient des données, seule l'activation reste dans le navigateur), traduit en allemand et en espagnol.
- **Textes du Centre traduits à la source** (règle du CLAUDE.md) : carte « Accès au Centre » et « Mode et accès »,
  mot de passe affiché au premier lancement et message de confirmation du dépôt distant passent par `K.t` dans les
  quatre langues ; leurs entrées des tables de traduction après coup (`data_admin_i18n.js`,
  `premier_lancement_i18n.js`) sont retirées ; textes écrits seulement s'ils changent.

### Livraison

- Archive de livraison : `xplane-web-suite-5.0.0.zip` — SHA-256 `f3785cb40d5700f95bffb6b3bfff2da86df98d9b86628296a9b53353b20e8462` (code seul, hors dépôt : dossier `dist/`).

## [4.11.0] — 2026-10-08

La suite s'installe avec un tutoriel illustré (captures, schémas des échanges et des identifiants, prérequis
utilisateur et administrateur), en français et en anglais, suivi par le menu de langue de l'aide. Centre en mode
autonome : mot de passe lu dans les données (`data/config/centre.json`, DEFA par défaut), affiché et modifiable ;
conception des comptes et données signés par git. Mot de passe du site du SOG hors service (INOP). Premier lancement
plus sûr (dossiers de `data/` déduits quand les données arrivent, accès à redonner, faux « autre copie » supprimé) ;
contrôle des mises à jour juste (commit servi, filiation demandée au dépôt) ; titres traduits ; nombre de cases MORA
d'une zone correct.

### Ajouté

- **Tutoriel d'installation** (`docs/tutorial/`, français et anglais, Markdown et HTML) : installation en quelques
  minutes, captures d'écran d'une installation neuve à chaque étape du premier lancement ; schémas des échanges de la
  suite avec les services extérieurs (lu, envoyé, par le navigateur ou par le lanceur) et des identifiants (où on les
  saisit, où ils restent, vers qui ils partent) ; prérequis distingués entre utilisateur et administrateur du SOG, avec
  ce que fournissent les admins et comment le créer. Schémas et pages HTML régénérables
  (`docs/tutorial/build_diagrams.py`, `build_html.py`) ; repris par l'aide intégrée ; `INSTALL.md` y renvoie et décrit
  les six étapes actuelles. Visible dès le début : encadré « Start here » en tête du README du dépôt, première ligne
  des sommaires de la documentation (4 langues), bouton « 📘 Tutoriel d'installation, pas à pas » en tête du premier
  lancement, adresse affichée dans la fenêtre du lanceur ; l'ancien `TUTORIAL.md` y renvoie.

### Modifié

- **Mot de passe du Centre dans les données** : le verrou d'usage du Centre ne compare plus le mot de passe à une
  empreinte écrite dans le code. Il lit `data/config/centre.json` (`{ "motDePasse": "DEFA" }`), qui est partagé avec les
  données. Le mot de passe est affiché à côté du bouton « Activer le Centre » (premier lancement, Paramètres › Centre).
  Il se change dans Paramètres › Centre › « Mode et accès », une fois le Centre activé, et part au prochain
  « Synchroniser ». Le jeu d'essai et le modèle des données livrent le fichier.
- **Mode du Centre affiché** : mode autonome (mot de passe) dans le bilan du premier lancement et dans Paramètres ›
  Centre. Le mode groupe (registre signé, accès par le rôle) est en conception
  ([COMPTES_SIGNES.md](technique/COMPTES_SIGNES.md)).
- **Aide : documents nommés par langue** (`….fr.md`, `….en.md`, comme le tutoriel d'installation) affichés dans la
  langue de la suite (allemand, espagnol : l'anglais) ; le menu de langue fait basculer le document, et un lien vers la
  version d'une autre langue change la langue de la suite, comme le menu. Pages HTML du tutoriel : menu de langue.
- **Mot de passe du site du SOG hors service (INOP)** tant que le SOG n'a pas de webservice (un accès futur passera
  probablement par une clé d'API) : champ grisé avec une étiquette façon bande DYMO (composant commun `.repo-inop`,
  `shared/repository_nav.css`) dans Mon profil et au premier lancement ; ce mot de passe n'est plus ni lu ni gardé (un
  ancien est retiré à l'enregistrement). Bilan et étape Profil : l'identifiant suffit.

### Corrigé

- **Pages de Paramètres figées (« page unresponsive »)** quand la compagnie réglée diffère de SO Group Virtual : le
  renommage dans les pages (`repository_nav.js`) réécrivait à l'identique un texte contenant « CPCO » (centre non
  renommé), et chaque écriture relançait son observateur, sans fin. Un texte n'est plus réécrit que s'il change, le texte
  qu'il vient d'écrire n'est pas retraité (nom réglé contenant l'ancien), et un nœud réécrit plus de 20 fois par seconde
  n'est plus touché.
- **« Dossier des données : impossible de vérifier qu'il est celui de la suite servie »** après une installation neuve :
  le lanceur n'écrivait ses repères (`.defa_instance`) qu'au démarrage, avant que `data/` existe ; ils sont désormais
  écrits aussi après le jeu d'essai, le clone du dépôt ou l'archive des données (même jeton pour toute la vie du lanceur).
- **« Mise à jour disponible » alors que la version locale est en avance** : le commit local venait d'un relevé du
  dossier mémorisé par le navigateur (parfois vieux de plusieurs jours), et de la branche `develop` du dépôt même quand
  une autre branche est extraite (`develop-local`) ; « en retard » était décidé par les dates. Désormais : commit local =
  commit servi, relu à chaque contrôle (`AppFramework.servedCommit`) ; le dépôt distant dit s'il manque des commits en
  local (API `repository/compare`). Nouveaux états : « En avance sur … » (le local contient déjà le canal) et
  « Commits locaux non publiés » (commit local inconnu du dépôt).
- **Nombre de cases MORA d'une zone sous-compté** (« 74 case(s) dans mora.csv » pour la France au lieu de 133) : le
  panneau comptait les seules cases dont le centre tombe dans le contour du pays ; les petites îles (La Réunion,
  Mayotte, Antilles…) sont désormais comptées, comme dans le calcul (`zoneCellKeys`).
- **Titres restés en français** : titre de la page Premier lancement (entrée de traduction manquante) et titres d'onglet
  du navigateur de toutes les pages (`document.title` désormais traduit par la couche commune, `shared/content_i18n.js`).
- **Premier lancement : dossiers SIA, missions et registre jamais réglés** quand les données arrivent après le choix du
  dossier de l'application (nouvel ordre des étapes : jeu d'essai, dépôt ou archive installés ensuite) — « dossier SIA
  non autorisé » à l'étape des données aéronautiques. Ils se déduisent dès que les données sont là, et à la demande
  (`FileAccess.get` : dossier déduit absent → déduit du dossier de l'application déjà autorisé, un essai toutes les 10 s).
- **Même dossier annoncé comme « autre copie »** (« Suite lancée depuis E:\…, dossier déclaré …/même dossier ») après un
  rechargement ou un redémarrage : le navigateur retire l'accès au dossier, son repère était illisible et pris pour
  celui d'une autre copie. Sans accès, le contrôle est désormais « impossible pour l'instant » ; l'étape 1 propose
  « Autoriser à nouveau » (accès redonné d'un clic, dossiers de `data/` déduits aussitôt).
- **Case « mémoriser dans le gestionnaire d'identifiants de Git »** seule sur sa ligne, libellé trop grand : case et
  libellé sur une ligne, à la taille des libellés.
- **Villes absentes de la base aéronautique (« villes_geonames.csv not found »)** : la lecture de
  `shared/carto/villes_geonames.csv` est tentée deux fois (un lanceur occupé par un téléchargement peut refuser ou couper
  une requête) ; en cas d'échec, le compte rendu de la relecture donne l'adresse et la raison (code HTTP, erreur réseau,
  dossier de l'application) ; message en 4 langues.

### Livraison

- Archive de livraison : `xplane-web-suite-4.11.0.zip` — SHA-256 `36197cbd531c616c52e1fdf634f46b871ba06540b9410244b44aaab35b8d6c24` (code seul, hors dépôt : dossier `dist/`).

## [4.10.0] — 2026-10-07

La compagnie devient SO Group Virtual. Nouvelle page Tableau (ordre de vol de la semaine). Premier lancement repensé :
bilan, dossier de l'application d'abord (tout grisé tant qu'il n'est pas cohérent avec la suite), jeu d'essai ; accueil
généré. Données aéronautiques par pays : choix sur la carte et « Activer » qui télécharge, reconstruit la base et
calcule la MORA ; Royaume-Uni (AIP militaire) et Canada (NAV CANADA) ; MORA de l'outre-mer et des grandes zones, sommets
parasites du relief écartés. Sessions ATC et activations IVAO et VATSIM ; flotte et terrain des appareils lus sur le site
de la compagnie ; design Tactique. Sécurité : lanceur fermé aux autres sites, fichiers de données au format imposé, git
durci. Code commenté et remis en forme.

### Ajouté

- **Canada : manuel des espaces aériens désignés de NAV CANADA (DAH) téléchargé et lu** — source officielle cochée par
  défaut (openAIP et X-Plane en repli) : le lanceur trouve l'édition en vigueur sur la page des guides opérationnels
  (`aero_fetch.py navcan` → `tools/navcan_dah.py`, sans bibliothèque : polices CID décodées par leur table ToUnicode) ;
  243 espaces de la partie 5 (`zones/ca/navcan_dah.geojson`) : 19 zones dangereuses, 142 réglementées, 26 consultatives
  d'opérations militaires (MOA) et 56 autres consultatives, avec arcs, cercles, secteurs séparés, limites verticales,
  horaires et organisme de contrôle. À retélécharger tous les 56 jours.
- **Royaume-Uni : AIP militaire (UK Mil AIP ENR 5.2) téléchargée et lue** — source officielle cochée par défaut (openAIP et
  X-Plane en repli) : le lanceur prend le PDF à son adresse fixe (`aero_fetch.py ukmil` → `tools/ukmil_aip.py`) ; 25 zones
  de vol à basse altitude (sol à 2000 ft AGL), 30 secteurs de la Valley Aerial Tactics Area, zone d'évitement TVAA, et
  14 zones de ravitaillement (AARA) en axes IP → CP ajoutés à ceux de la DIRCAM (`SiaBase` : `aarXmlExtra`,
  `OdvAirspace.aarTracks`). Fichiers `zones/<zone>/<source>_…` rattachés à leur source par le préfixe ; lien NAV CANADA
  corrigé.
- **Site de la compagnie** : adresses par défaut (site, pages Flotte, Log des vols…) valables pour la compagnie par défaut de
  la suite (SO Group Virtual, ou DEFA Virtual) — elles comptaient « non réglées » depuis le renommage ; le lanceur lit la
  flotte et le journal à l'adresse réglée (transmise par la page), plus à une adresse écrite en dur ; compagnie sans
  adresse réglée : rien n'est importé.
- **MORA des grandes zones** (plus de 1500 cases : États-Unis, Canada…) : MORA d'X-Plane par défaut (panneau, actions à
  faire, mise en place automatique) ; « Calcul complet… » par blocs de 10° sur confirmation (volume annoncé), chaque bloc
  écrit aussitôt dans `mora.csv`, arrêt et reprise ; relief des tuiles ouvertes d'AWS majoré de 100 m, sans requête
  OpenStreetMap (`computeMoraGrid` : options `peaks`, `fineMax`).
- **Données aéronautiques : mise en place automatique d'une zone** à sa première activation (téléchargements, derniers
  ZIP de Téléchargements, reconstruction de la base, MORA de la zone, double jauge) et bouton « Tout récupérer et
  recalculer » ; « Actions à faire » sous la carte (une ligne par source des zones actives, lien et bouton) ; tableau
  de la base en SortedTable (triable, problèmes d'abord), nombre de contrôles sans souci, mode « Afficher les problèmes ».
- **Données aéronautiques et types d'aéronefs dans l'installation** : Paramètres › Installation montre les blocs
  « Données aéronautiques » et « Types d'aéronefs » (mêmes blocs que Maintenance : un bloc peut être sur plusieurs pages,
  `settings.sections` « installation,maintenance ») ; nouveau bloc « Types d'aéronefs (OACI et performances) » avec
  « Compléter les types manquants de la flotte et des missions » ; premier lancement, étape 4 « Données aéronautiques
  et types d'aéronefs » avec ces mêmes blocs (`<div id="maintenance" data-blocks="sia,types">`), « Terminer » ramène à
  l'accueil ; « (facultatif) » sur le classeur ODV et le dépôt git de synchronisation.
- **Terrain actuel des appareils** (`shared/aircraft_positions.js`) : emplacement de la page Flotte du site gardé
  (`location`, `locationAt` : date du dernier changement ; script et collage), ou terrain d'atterrissage réel d'un CR
  issu d'un ordre de mission, le plus récent l'emportant ; les convoyages en partent (fenêtre d'affectation, affectations,
  Planning ODV, fiche appareil). CR : champ « Terrain d'atterrissage réel (OACI) » jamais prérempli, référence de l'ordre
  (`metadata.orderRef`) posée depuis « Mes missions », départ et arrivée du convoyage pour un ordre de convoyage,
  rédacteur (`metadata.reportedBy`). Mon profil › Mes appareils : CR rédigés comptés, décompte du journal affiché.
- **Mon profil › Mes appareils (reporting)** : appareils pilotés ou reportés (CR où le trigramme figure dans l'équipage),
  coche grisée « Flotte DEFA » ; la liste complète reste dans Centre › Flotte.
- **Maintenance › Types d'aéronefs et performances** : codes OACI dans une zone de texte (un par ligne ou séparés par des
  virgules), bouton « Télécharger types et performances ».
- **Flotte dans Paramètres › Centre, avec les appareils du reporting** : sous la flotte connue, les appareils qui volent
  dans le journal des missions (`shared/fleet_reporting.js`), case « personnel » (cochée par défaut : hors flotte ;
  décochée : ajouté à la flotte, affectable) ; index des appareils individuels `data/references/aircraft_personal.js`
  enregistré avec la flotte ; « Rafraîchir types et performances » ; mise à jour depuis le site déplacée sous la flotte.
  Le lanceur complète en tâche de fond les types inconnus après la mise à jour quotidienne (`unknown_types`).
- **Terrain d'un appareil** : il ne change que par la mise à jour depuis le site ou un CR issu d'un ordre de mission ;
  la fiche appareil (« 📍 ») ne le déduit plus du dernier CR venu.
- **Ordres de vols : ordre de mission réémis d'office au déplacement d'une plaquette** — mêmes pilotes, appareils,
  indicatifs et convoyeurs à la nouvelle heure, sans fenêtre ; pli déjà ouvert rescellé. Conflit d'affectation ou dossier
  non autorisé : non réémis, signalé sur la plaquette (`omAttente`, `omRaison`) qui garde sa nouvelle heure.
- **Fenêtre d'affectation : convoyage repris des Ordres de vols** — option `departure` (terrain de départ de secours
  quand le yaml de la mission n'en donne pas : le convoyage n'était alors ni calculé ni montré) et `rows[].ferry`
  (plaquette de convoyage placée : heure et durée reprises telles quelles, marquées « plaquette de convoyage »).
- **Flotte et référence DEFA automatiques depuis le site** : le lanceur lit les pages publiques Flotte et Log des vols de
  flotte.defa-virtual.fr (sans connexion) une fois par jour, à l'ouverture d'une page (`shared/defa_site.js`,
  `/__setup/defa-site`), et les passe aux scripts du collage (`update_fleet.py`, `defa_reference.py`) ; carte
  « Flotte et journal DEFA (site) » dans Paramètres › Maintenance (réglage automatique, « Mettre à jour maintenant »).
  Scripts : option `--out=` ; le lanceur écrit dans son dossier de données (`--data`), envoi du journal du premier
  lancement compris. Procédure du manuel d'exploitation (§ 4.2) réécrite ; mentions périmées corrigées.
- **Périmètre des sessions ATC : pays préféré** (Paramètres › Centre › Planning ODV, France métropolitaine par défaut ;
  44 pays, préfixes OACI des indicatifs de terrain) : imports VATSIM et IVAO, positions en ligne et sessions montrées
  limités à ce pays (`SuiteAtc.perimeter` / `inPerimeter`) ; le lanceur reçoit les préfixes (`/__setup/ivao-bookings?pre=`).
- **Planning ODV, sessions ATC** : trainings, examens et événements en tête du tableau (repérés en marge), simples
  réservations de position repliées ; message d'import détaillé (trainings, examens, autres sessions).
- **« Importer d'IVAO » importe aussi les sessions ATC IVAO** (trainings, examens, réservations) ; import IVAO
  automatique à l'ouverture d'une semaine, au plus une fois par heure, si la page peut écrire (`SuiteAtc.autoImport`,
  commun au Planning ODV et aux Ordres de vols).
- **Activations des zones par réseau, VATSIM et IVAO côte à côte** (Ordres de vols et Planning ODV, même éditeur,
  mêmes données) : saisies de chaque réseau, activations « les deux réseaux » dans les deux colonnes, import IVAO replié
  dans sa colonne ; VATSIM ne publie pas d'activations (saisie à la main).
- **Sessions ATC : import IVAO** (trainings, examens, réservations de France métropolitaine, clé d'API de
  l'installation, lanceur `/__setup/ivao-bookings`) ; un seul import par réseau pour toutes les pages
  (`SuiteAtc.importNetwork`).
- **Fenêtre d'affectation sans écriture** : `apply(lignes, { takeoff, h_hour, alert, block_min })` rend aussi l'heure
  et l'astreinte choisies (Ordres de vols : plaquette remplie en entier).
- **Données aéronautiques : un seul bloc « Base aéronautique : sources, cycles et reconstruction »** (fusion de
  « Reconstruire la base aéronautique » et « Cycles AIRAC et âge des données ») : tableau de toutes les sources cochées des
  zones actives (zone, source, fichiers, cycle ou date, âge, taille, état), ligne cliquable qui met la source à jour,
  boutons « Tout recalculer » et « Purger le cache ».
- **Axes de ravitaillement depuis le PDF de la MILAIP** : Données aéronautiques › zone France › DIRCAM › « Importer le
  PDF MILAIP… » (pdf.js chargé à la demande, `AarTracks.parseEnr57`), anomalies à valider, édition repérée (AMDT),
  écriture de `miam-enr-5-7-tracks.xml` dans le dossier SIA (ancien archivé) et mise à jour de la base.
- **Espace disque : données aéronautiques par zone** (place du dossier SIA, sources, fichiers ; zones inactives signalées).
- **Design « Tactique »** (Apparence) : repris de l'outil Ordres de vols — fond de nuit dégradé à halos, verre fumé
  (flou, bord lumineux), accent cyan, texte Inter, titres Orbitron en capitales, liseré du thème en haut des blocs. Sans
  image ni texture (aucun décor, logo et icônes plats) ; polices dans `shared/fonts/` (SIL OFL). Règles dans
  `designs_skeuo.css` (jetons des composants communs), clé `logo` du registre des designs (logo plat d'un design à matières).
- **Base des types d'aéronefs plus visible** : carte en tête de Références et dépendances, encadrée et signalée par une
  notification quand la base est vide, bouton « Compléter la base » (types de la flotte et des missions), « Recharger la
  page » à la fin d'une passe, fichiers écrits expliqués.
- **Lanceur plus rapide sur `localhost`** : écoute aussi sur `::1` (sous Windows, chaque fichier attendait ≈ 0,2 s le repli
  IPv6 → IPv4 : page et fond affichés en 1,5 s au lieu de 0,15 s).
- **Clés d'API et identifiants des services externes** : Paramètres › Installation › Sources et dossiers › « Clés
  d'API » (IVAO, commune à la suite) et Mon profil › « IVAO — client OAuth (personnel) » (client ID, secret, adresse de
  redirection à déclarer) ; gardés par le lanceur (`secrets/`, exclu de git, hors des données et des sauvegardes ;
  `GET` / `POST /__setup/secrets`), jamais renvoyés à la page (état et 4 derniers caractères).
- **Carte des zones : épinglage** — un clic garde la zone au panneau (activation par « Activer la zone », sources) ;
  nouveau clic, Échap ou « Libérer » la relâchent. Carte redimensionnée quand le bloc s'ouvre depuis le menu ; bouton
  du dossier SIA en double retiré ; plus de rafraîchissement de la page à chaque survol ; panneau sans barre de défilement
  propre (la page défile ; molette au-dessus de la carte : la page, zoom avec Ctrl) ; « Télécharger » : état et résultat
  sous le bouton, avertissement si les fichiers écrits ne sont pas visibles (dossier SIA non autorisé ou autre).
- **Écart entre `data/` et sa sauvegarde git** (`tools/data_sync.py` : `divergence`, `shared/sync.js`) : bouton
  « Synchroniser » orange ou rouge selon les modifications non envoyées (nombre, âge), les commits à recevoir ou non
  envoyés, les fichiers modifiés hors des données synchronisées, l'absence de dépôt git ou distant, une fusion en cours ;
  raisons en infobulle, alerte en notification une fois par session ; bouton « ⚠ Sauvegarde » si `data/` n'est pas un
  dépôt git (hors jeu d'essai) ; seuils dans `data/config/suite.json` (`sync`). `odv/` rejoint les données synchronisées.
- **CR : « Causes »** (plusieurs cases) d'une mission non effectuée ou partielle : météo, technique, simulateur, pilote ou
  équipage absent, contrôle absent, réseau, zone non activée, ravitailleur absent, manque de temps, opérationnel, autre
  (`results.causes`, `MissionVocab.mneCauses`), affichées dans le compte rendu.
- **Ordres de vols** (☰ › Centre — Ordres de vols ; barre latérale « Ordres ») : l'ordre de vol de la semaine, repris de
  l'outil autonome « Ordres de vols V0 » dans le modèle de la suite ([ODV_ORDRES.md](technique/ODV_ORDRES.md)). Frise du
  jour en heures z (tranches matin, après-midi, soir ; nuit aéronautique ; RTBA · LL ; zones des vols ; dispos ensemble),
  plaquettes de vol (mission du registre ou entraînement), contrôle, divers et notes glissés depuis les modèles, membres
  glissés sur les plaquettes, empilement automatique ; conflits (semaine non déclarée, non couvert, non affectable,
  chevauchement, doublon, zone non activée), badge P ; états repris des CR ; récurrences datées ; vue semaine (dispos par
  membre, récup, modifications prises en compte), statistiques, briefing plein écran. Données : `data/odv/<semaine>.json`,
  réglages `data/config/odv.json` (Paramètres › Centre › Ordres de vols) ; dispos et affectations de la suite.
  Catégorie de dispo « Disponible au sol seulement » (`sol`) et règle d'affectation par catégorie
  (`SuiteDispos.affectable` : un contrôle n'est affectable qu'en contrôle).
- **Ordres de vols : modules partagés** — `shared/odv_airspace.js` (activations de zones par réseau et par plage,
  `data/atc/activations/<semaine>.json` ; zones requises d'une mission et leur état ; contrôle ouvert ; examens et
  trainings), `shared/odv_activations_editor.js` (saisie des activations), `shared/odv_reports.js` (missions ravitailleur
  liées ; CR → plaquette : succès = ME, succès partiel ou échec = MNE avec causes, annulée = BÂCHÉ, sans CR après le délai
  = MNE « pas de CR »). Registre des missions : rôle et axe de ravitaillement (`aarRole`, `aarTrack`).
- **Données aéronautiques : carte des zones du monde** (Paramètres › Maintenance › Données aéronautiques). Une zone par
  pays (Natural Earth, domaine public ; la France regroupe métropole et outre-mer), activée d'un clic ; au survol, ses
  sources dans le panneau : téléchargement (openAIP, ENAIRE, FAA), commande ou inscription avec lien et mode d'emploi
  (SIA France, NATS), PDF (DIRCAM ENR 5.7, AIP militaire britannique, NAV CANADA), dossier (X-Plane), calcul (MORA de la
  zone). États sur la carte : vierge, inactive avec données, active incomplète, active complète. « Reconstruire la base
  aéronautique » ne lit que les sources cochées des zones actives (X-Plane découpé à leurs contours) ; tableau des cycles
  AIRAC et de l'âge des données ; MORA par zone (cadres regroupés : métropole et chaque outre-mer). Le pas à pas SIA en
  six étapes et le contrôle des différences disparaissent ; les adresses DIRCAM, NATS, AIP militaire britannique et
  NAV CANADA rejoignent les Sources externes (Paramètres › Installation). Réglage `aeroZones:v1` (ancien `aeroSources:v1`
  repris : pays openAIP).
- **Barre latérale réglable** (Apparence › Icônes) : « Taille des icônes » (petite, moyenne, grande) et « Affichage »
  (icône et libellé, icône seule — barre plus étroite, nom en infobulle —, libellé seul) ; barre resserrée par défaut.
- **Premier lancement : jeu d’essai ou dépôt de données de la compagnie.** Étape « Données » : « Jeu d’essai »
  (données fictives livrées avec la suite, `tools/jeu_essai.py`, lancé par le lanceur : `POST /__setup/jeu-essai`, refusé
  si des données sont déjà là), « Dépôt de données » (adresse saisie, identifiants facultatifs), archive reçue par mail.
  Plus aucune adresse de dépôt de données en dur : `sources.dataRepo` vide, pas de clone automatique sans adresse,
  modèle `tools/data_template` sans adresse ; identifiants en double de la page corrigés (`plRepo`, `plRepoMsg`).
  **Contenu du jeu d'essai** (`tools/jeu_essai/`, voir son README) : 12 missions générées traduites en anglais —
  BOXING GLOVES (exercice A-001 : organisation, deux éléments Rafale, ravitailleur, deux chiffons révélés par radio à
  l'heure dite), EYE OF SOLOGNE (I-001 : E-3F « le grand disque », ravitailleur, Rafale), S-001, N-001, T-001 — ; quatre
  pilotes fictifs (ALF, BRV, CHL, DLT), flotte des types de ces missions, indicatifs, configuration SOG ; disponibilités
  (semaine en cours et suivante) et cinq affectations datées à l'installation (exercice le lendemain, heure H 19:00Z).
  `--force` ne réinstalle que par-dessus un jeu d'essai (dates remises à jour).

### Modifié

- **MORA : tableau des changements de hauteur replié par défaut** (« Voir le tableau des changements de hauteur (n
  case(s)) ») ; ouvert ou fermé, il le reste quand le bloc se redessine.
- **Données aéronautiques : pays choisis sur la carte, puis « Activer »** (Maintenance, Installation, premier lancement) :
  un clic ajoute un pays à la sélection, un autre l'en retire (pays choisis en bleu, barre sous la carte : pays, à
  activer, à désactiver, « Annuler ») ; « Activer » applique la sélection et enchaîne pour toutes les zones choisies
  incomplètes les téléchargements, les derniers ZIP de Téléchargements, une seule reconstruction de la base, puis la
  MORA de chaque zone qui en manque — seulement si la base a été reconstruite (sinon relief sans obstacles) ; une source
  en échec n'arrête pas les autres ; résumé en notification. « Actions à faire » ne liste plus que le manuel (commande
  du SIA, PDF, dossier X-Plane, fichiers à déposer) — téléchargements et MORA comptés sur une ligne « automatique » — et
  ses boutons sont compacts (`aeroAutoZones`, `aeroSelShow`).

- **Code source documenté et remis en forme** : fonctions du Tableau, des modules ODV partagés et du premier lancement
  commentées, docstrings des scripts `tools/` ; `tools/format_sources.py` coupe les lignes au-delà de 140 caractères
  (hors chaînes et gabarits), passé sur 122 fichiers et contrôlé par `tools/verify_format.html` (arbres syntaxiques
  identiques, modules ES compris) : lignes de plus de 300 caractères 1 212 → 711 (gabarits HTML et chaînes).
- **Premier lancement repensé** : bilan « Où en est la suite » en tête (données, git, dossier, compagnie, clé IVAO,
  pilote, identifiants du site, données aéronautiques ; Centre : flotte et journal, missions, utilisateurs, envoi des CR),
  six étapes (données, dossiers, compagnie, profil et identifiants, données aéronautiques, Centre pour les
  administrateurs) ; onglet « Premier lancement » dans Paramètres, carte de rappel sur l'accueil tant qu'il reste à faire.
- **Accueil généré depuis `repository_tree`** (barre latérale et onglets) : plus de liste écrite à la main qui prend du
  retard ; pages du Centre masquées tant qu'il est verrouillé.
- **« Ordres de vols » renommé « Tableau »** (EN Board, DE Einsatztafel, ES Tablero) : page, barre latérale, menu,
  rubrique de Paramètres › Centre, manuels ; fichiers et clés inchangés (`odv_orders.html`, `data/odv/`, `odvOrders`).
- **Renommage : DEFA Virtual → SO Group Virtual** (écriture statique dans les sources, les quatre langues et la
  documentation) : nom de la compagnie « SO Group Virtual » (`repository_tree.va`, en-têtes, pieds de page, PDF, YAML,
  sauvegardes) ; « DEFA » qualificatif retiré (« CR DEFA » → « CR » / « Report », flotte, référence, base, journal,
  trigramme, équipes et aéronefs du générateur, Planning ODV) ; logo générique (cible) ; couche de renommage pour une
  autre compagnie comparée désormais à la marque des sources. **Site de la compagnie** : réglage (Paramètres ›
  Installation › Sources et dossiers) ; les adresses par défaut (flotte.defa-virtual.fr) ne valent que pour DEFA
  Virtual — sinon aucun lien inventé, invitation à renseigner l'adresse (`RepositoryNav.siteLink`) ; libellés « site de
  la compagnie ». **Catégories de disponibilité** : « Exercice SOG », « Vol hors SOG »… (4 langues). En-tête du lanceur
  `X-SOG-Setup` (l'ancien `X-DEFA-Setup` reste accepté pour cette version : **relancer le lanceur** après la mise à
  jour) ; constante du générateur `ÉQUIPES_SOG` (l'ancien nom reste lu). Noms : « SO Group Virtual », nom long
  « Virtual Special Operation Group » (nouveau champ de Paramètres › Sources et dossiers, première mention de l'accueil,
  du premier lancement, des présentations et des manuels), sigle « SOG » ; champ `va` des nouveaux fichiers de
  données : le sigle réglé (les fichiers existants gardent « DEFA »). Couche de renommage pour une autre compagnie
  réparée (expressions régulières abîmées par fc0f4408).
- **Dossier d'une autre copie de la suite : confirmation explicite** : « Suite lancée depuis <dossier servi>, dossier
  déclaré <dossier choisi>. Cela peut conduire à des incohérences. Confirmer ? » (4 langues ; chemin complet du dossier
  choisi lu dans son repère `.defa_instance`, dont le lanceur écrit maintenant le chemin réel en 2e ligne — sinon son
  nom). Confirmé, le dossier et ce qui s'en déduit (data/missions, cr, sia…) sont lus ET écrits directement, avec un
  rappel du même message ; la confirmation est oubliée si le dossier est rechoisi sans elle. Non confirmé (choix
  antérieur), rien n'y est écrit et le message dit pourquoi, au lieu de « Dossier des données d'une autre copie… ».

### Corrigé

- **Reconstruction de la base aéronautique en échec** (« Cannot access 'aarExtra' before initialization », depuis la
  lecture de l'AIP militaire britannique) : la liste des axes de ravitaillement d'autres pays était utilisée avant sa
  déclaration ; aucune base ne se construisait, la MORA d'une zone n'était pas calculée.

- **MORA faussée par des pixels parasites du relief** : les tuiles de relief (Terrarium, AWS) portent des pixels isolés
  faux (5 389 m au bord de mer de La Réunion, trou de la source mal comblé) ; la MORA gardant le point le plus haut de
  chaque case, La Réunion sud sortait à 20 100 ft au lieu de 12 400 ft. Un pixel qui dépasse de plus de 1 000 m la
  médiane de ses 8 voisins est désormais écarté (un vrai sommet : 390 m au plus en z9, 70 m en z12 ; relevé sur le
  Mont Blanc, le Cervin, le Dru, l'Ossau et le Piton des Neiges). Les `mora.csv` déjà calculés gardent l'ancienne
  valeur : recalculer la zone (Paramètres › Maintenance › Données aéronautiques).

### Sécurité

Suite de l'[audit du 7 octobre](technique/AUDIT_SECURITE_2026-10-07.md), lots 1 à 3.

- **Lanceur fermé aux autres sites** : une page web quelconque lisait les fichiers `data/*.js` (trigrammes, vols,
  configuration) par `<script src="http://127.0.0.1:8000/…">`. Toute requête venue d'un autre site (en-tête
  `Sec-Fetch-Site`) est refusée, navigations comprises (page explicative et lien vers l'accueil). S'y ajoutent
  `Cross-Origin-Resource-Policy`, `X-Frame-Options` et `frame-ancestors`.
- **Plus rien de privé servi** : `secrets/` (clé IVAO, en clair), `data/local/`, fichiers et dossiers « . » (`.git` :
  seulement ce que lit le pied de page), listes de dossiers. Contrôle sur le chemin demandé et sur le chemin réel
  (casse, points finaux, flux NTFS, noms courts, liens).
- **Fichiers de données exécutés : format imposé** (`tools/data_guard.py`). Un `.js` de `data/` n'est servi, et commité
  par « Synchroniser », que s'il suit le format des fichiers de données (gabarit de `datafile.py` ou
  `window.NOM = littéral;`, exportations en liste fermée). Les fichiers HTML, SVG ou XML de `data/` sont servis en bac à
  sable.
- **Téléchargements** : la page ne demande plus qu'un motif déclaré par une source (`aero_zones.js`). Avant, `*.*`
  rendait tout le dossier.
- **Dépôt distant de `data/`** : un autre dépôt que celui en place (ou celui de la configuration) se confirme dans une
  fenêtre Oui / Non que le lanceur ouvre sur l'ordinateur. Elle montre l'adresse actuelle et la nouvelle, avec « Non »
  par défaut, et aucune page ne peut y répondre. Sans cela, une page piégée pouvait faire envoyer toutes les données
  ailleurs. Après un « Non », pas de nouvelle demande pendant 30 s. L'adresse ne peut plus contenir de mot de passe ou
  de jeton, ni commencer par « - ».
- **Git durci** : git pris par son chemin absolu hors du dossier de la suite ; `core.fsmonitor=false`,
  `protocol.ext.allow=never`, `submodule.recurse=false` sur chaque appel ; `--` devant les adresses. `lancer.cmd` ne
  lance plus un `py` ou un `git` déposé dans le dossier (`NoDefaultCurrentDirectoryInExePath`).
- **Archive des données** : ni dossier `.git` (commande lancée par git) ni exécutable n'est extrait.
- **XSS** :
  - couleur d'une catégorie de disponibilité ou d'un groupe, et couleurs des modèles d'ODV : vraies couleurs
    seulement (`RepositoryKit.cssColor`) ;
  - statut d'une mission dans le registre ;
  - profil de performance (nom, indicatif, immatriculation d'un appareil SimBrief, d'un `.lnmperf` ou d'un OFP) ;
  - altitude-densité du CR ;
  - version distante dans le badge de mise à jour (validée et échappée).
- **Aide** : `?doc=` limité aux documents de `docs/` (un document d'un autre site s'y chargeait) ; liens limités à
  `http(s)`, plus de `javascript:` ; messages à la page de la suite seulement.

### Livraison

- Archive de livraison : `xplane-web-suite-4.10.0.zip` — SHA-256 `d39a524833076d541ce746d280a8f0a5cd0a11dda34fac548ebf3a414cecf756` (code seul, hors dépôt : dossier `dist/`).

## [4.9.0] — 2026-10-06

Données aéronautiques d'autres pays : lecteurs AIXM 5.1, GeoJSON, OpenAir et X-Plane, téléchargements (openAIP, FAA,
ENAIRE), sources activables dans Paramètres › Maintenance › Données aéronautiques. Licences : code sous MPL 2.0, contenu
sous CC BY-SA 4.0, crédits de toutes les sources (`LICENSE.md`) ; les données de tiers ne sont plus publiées — types
d'aéronefs complétés sur chaque poste, type par type. Outil de livraison des versions (`tools/publish_dist.py`).

### Ajouté

- **Types d'aéronefs complétés sur chaque poste, type par type** : les bases OACI (Doc 8643) et EUROCONTROL
  (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) ne sont plus publiées (ignorées par git) ; Paramètres › Maintenance ›
  Références et dépendances, carte « Types d'aéronefs et performances » : un code saisi, les types inconnus, ceux de la
  flotte ou des missions — jamais toute la base EUROCONTROL (lanceur : `POST /__setup/aircraft-db`,
  `update_aircraft_db.py --only` puis `--apd`) ; liste des codes de la suite : `AircraftDB/aircraft_types.txt`.
  `LICENSE.md` : grille MORA (ODbL pour sa part OpenStreetMap) et axes ENR 5.7 calculés sur le poste, jamais
  redistribués.
- **Licences** : `LICENSE.md` — code sous Mozilla Public License 2.0, contenu (documentation, images) sous CC BY-SA 4.0
  (textes complets dans `LICENSES/`) ; licences et crédits exigés de tout ce qui vient de tiers (MapLibre, jsPDF,
  js-yaml, textures ambientCG, GeoNames, OACI, EUROCONTROL, SIA, DIRCAM, FAA, openAIP, ENAIRE, NATS, Mil AIP, X-Plane,
  Navigraph, OpenStreetMap, OpenTopoMap, OpenFreeMap, VersaTiles, Terrarium, Open-Meteo, mwgg/Airports, VATSIM, IVAO,
  SimBrief) ; pied de page : « © RBR » et lien vers les licences (à la place de « CC RBR ») ; README et présentations
  renvoient à `LICENSE.md`.
- **Logo générique** (cible, 8 variantes : flat, line, gloss, aqua, cabinet, field, flightlog, wood — `shared/icons/generic/`)
  en haut de la barre latérale quand la compagnie virtuelle n’est pas DEFA Virtual (ex. SO Group Virtual) ; le logo
  DEFA reste pour DEFA Virtual (Paramètres › Sources et dossiers).
- **Données aéronautiques d'autres pays** (`shared/aero_sources.js`) : lecteurs AIXM 5.1 (ENAIRE, NATS, DFS, FAA…),
  GeoJSON (openAIP, FAA ADDS — espaces à usage spécial, routes MTR en couloirs, classes —, générique), OpenAir et
  données de navigation de X-Plane (`earth_nav`, `earth_fix`, `earth_awy`, `earth_mora`) ; ajoutés sans doublon après le
  SIA dans la base (version 16, source de chaque espace) ; zones TSA, MOA, MTR, W, A dessinées et comptées dans les
  espaces à activer.
- **Paramètres › Maintenance › Données aéronautiques** (ancienne « Mise à jour SIA ») : sources actives ou non (SIA,
  DIRCAM, AIXM 5.1, GeoJSON, openAIP, X-Plane), fichiers trouvés, téléchargements ; dossier du simulateur X-Plane
  (Sources et dossiers).
- `tools/aero_fetch.py` : téléchargement des données libres (openAIP par pays, FAA, ENAIRE) dans `data/sia/<source>/`,
  en ligne de commande ou par le lanceur (`POST /__setup/aero-fetch`).
- `tools/publish_dist.py` (lanceurs `publish_dist.sh` / `.cmd`) : archive de livraison d’une version publiée,
  `dist/xplane-web-suite-<version>.zip` — le code seul au tag (ni `data/` ni `examples/`), vraies images LFS (pas de
  pointeurs), archive reproductible — empreinte SHA-256 et rubrique « Livraison » dans la section de la version.

### Livraison

- Archive de livraison : `xplane-web-suite-4.9.0.zip` — SHA-256 `0826c50f0764eb64b9913d3bf803593e331b9d6425fa00ecaad24185275b0da9` (code seul, hors dépôt : dossier `dist/`).

## [4.8.0] — 2026-10-05

Les données se partagent : bouton « Synchroniser » (dépôt git de `data/`, fusion fiche par fiche), utilisateurs et
droits, disponibilités en catégories configurables, index des données dans le navigateur. Paramètres en quatre pages ;
Aide intégrée (fenêtre au chapitre de la page, manuels utilisateur et administrateur en quatre langues, sans lanceur
aussi) ; documentation réorganisée. Mes missions : dossier animé selon le design, liste et dossier côte à côte. Briefs
traduits, compagnie virtuelle configurable, en-têtes de l'ordre selon la famille, onglets habillés par design.

### Ajouté

- **En-têtes de l'ordre selon la famille** pour Durci (EMA, BSPP, SSA, HIA, DCSSA, EMZD, DMD, CPCO), Cabinet (aéronautique
  navale) et Carnet de vol (protection civile, secours), avec le **tampon de l'émetteur** à la signature (Carnet de vol).
- `AppFramework.ask` : confirmation dans la page (fond d'un bloc du design, 4 langues) ; `RepositoryKit.viewHtml` et
  `RepositoryKit.tf` (phrase traduite à valeurs).
- Traductions (en, de, es) : Mes missions (dossier, plis, signet, fiche technique), fenêtre et dialogue d'affectation de
  l'ODV, semaines et filtres de l'ODV, générateur et studio, planificateur, Premier lancement.
- **Brief de mission traduit** : bloc `i18n` du YAML (réglage « Traductions » du générateur, `en` par défaut), lu par
  `shared/mission_i18n.js` ; Mes missions affiche le brief, les plis et les pistes dans la langue de la page (repli sur
  le français champ par champ). Doc : `docs/SIA_MISSIONS.md` § 2 sexies.
- Audit de sécurité (`docs/technique/AUDIT_SECURITE_2026-10-02.md`).
- **Livre de mission traduit automatiquement** quand la mission n'apporte pas sa traduction (pas de bloc `i18n`) :
  traducteur intégré du navigateur (Chrome / Edge, sur l'ordinateur, rien n'est envoyé), résultats gardés
  (`shared/machine_translate.js`) ; note en tête de l'ordre, bouton quand la langue doit d'abord être téléchargée.
- **Compagnie virtuelle configurable** (Paramètres › Sources et dossiers) : nom, sigle, centre, pages du site (log des
  vols, flotte, fiche appareil) ; DEFA Virtual par défaut (`repository_tree.va`, `RepositoryNav.va()` / `vaUrl()`) ;
  autre compagnie : « DEFA Virtual », « DEFA » et « CPCO » affichés avec ses valeurs dans toute la suite.
- Outil `tools/audit_i18n.html` : textes restés en français, page par page, dans une autre langue.
- **Journal DEFA** : favori « → Journal DEFA » (copie toute la page « Log des vols », tableau compris), collage du
  HTML du presse-papiers plutôt que du texte seul, bouton « Coller depuis le presse-papiers » ; adresse du log prise dans
  la configuration de la compagnie virtuelle.
- Planches contact des en-têtes de l'ordre de mission par organisme, pour chaque design à matières
  (`tools/planche_rubriques.py` → `docs/planches/`).
- **Dossier d'une autre copie signalé** : le lanceur écrit à chaque démarrage un repère (`.defa_instance`, ignoré par
  git) à la racine et dans `data/` ; un dossier autorisé qui n'est pas celui de la suite lancée (ex. « DEFA - Copy »)
  est confirmé au choix et marqué ⚠ avec une notification sur les boutons de dossier (`FileAccess.sameAsServed`).
- **Chiffons joués traités comme des missions** : chaque chiffon joué a sa mission d'équipe dans l'opération
  (`mission.role: chiffon`, piste de la Z reliée par `mission` et `takeoff`) — registre, affectation dans l'ODV sur la
  ligne de l'opération (décalage par rapport à H), Mes missions (brief, consignes, plis adressés par id de piste ou
  indicatif). Prompt du générateur mis à jour ; pour les opérations existantes, bouton « Créer les missions des
  chiffons joués » dans le bloc Opération du générateur.

- **Synchronisation des données** : bouton « Synchroniser (n) » de l'en-tête (`shared/sync.js`) — fichiers du pool
  commités au nom du trigramme connecté, fusion fiche par fiche par le lanceur (`tools/data_sync.py`), copies de
  conflit dans `_conflits/` ; dépôt git de `data/` (git@ ou https) renseigné et vérifié dans Premier lancement, sans
  bloquer. Architecture : `docs/technique/SYNCHRONISATION.md`.
- **Utilisateurs et droits** : fiches `data/utilisateurs/<TRI>.json` (rôle, actif, empreinte PBKDF2-SHA256 salée), mode
  `develop` / `production` (`data/config/suite.json`), connexion, changement et réinitialisation du mot de passe,
  usurpation par l'administrateur du Centre.
- **Disponibilités en catégories configurables** (Paramètres › Centre › Catégories, `data/config/disponibilites.json`) :
  palette d'une ligne par groupe, libellés abrégés (infobulles), plages précises à la minute, préférences de thèmes par
  domaine (Mon profil) ; ancienne grille horaire importée dans la semaine ; planning ODV aux couleurs des catégories,
  sessions ATC VATSIM / IVAO.
- **Index des données** (IndexedDB) : registres des missions et des CR, suivi du Centre, disponibilités et fiches
  utilisateurs lus par signature (`_index.json` tenus par le lanceur) ; « Index des données » dans Maintenance › caches.
- **Aide** : entrée « Aide » de la barre latérale (à la place de « Menu ») et ☰ › Aide, en fenêtre au-dessus de la page,
  au chapitre de la page en cours ; index documentaire, sommaire, recherche ; **manuels utilisateur et administrateur**
  (un chapitre par page, une section par bloc) en français, anglais, allemand et espagnol ; documents intégrés
  (`apps/aide/docs_bundle.js`, `tools/build_docs_bundle.py`) pour l'ouverture sans lanceur.
- **Mes missions : dossier animé** selon le design — ouverture et fermeture propres à chacun (Cabinet : liasse sortie
  du range-dossier, couverture tournée ; Carnet de vol : carnet sorti de l'enveloppe) ; changement de mission : le
  dossier se referme, part à gauche, le suivant arrive de la droite et se rouvre s'il l'était.
- **Paramètres en quatre pages** : Mon profil, Centre, Installation, Maintenance.
- **Flotte DEFA** : « Coller la page Flotte du site… » (Paramètres › Maintenance › Flotte DEFA).
- Barre latérale configurable (Apparence) ; Apparence, Paramètres et Aide fixés en bas ; bouton « Missions » du
  générateur et du studio.
- Onglets de page habillés par design à matières (Carnet de vol, Cabinet, Durci, Aqua).
- Planning ODV : résumé d'une mission probable déplié sous sa ligne.
- Outils : sommaire `tools/index.html`, jeu de test fantôme, `tools/cabinet_layers.py` ; lanceur `--data <dossier>`
  (servir une copie des données pour les essais).

### Modifié

- Boîtes natives (`confirm`, `alert`) remplacées par la confirmation dans la page et les notifications (gardées : sortie
  de page, fermeture synchrone de la fenêtre d'un créneau, changement d'identifiant du générateur).
- Visionneuse commune pour le registre des missions (YAML, Markdown, versions, cartes).
- Plus de galon sous le bandeau des designs à matières ; bouton désactivé nettement grisé (Cabinet, Carnet de vol).
- Couche de traduction : comparaison sans la typographie de la langue ; libellé court suivi d'une flèche de tri.
- Mes missions : dates et semaine dans la langue de la page ; liste et grille redessinées au changement de langue ;
  rubriques du résumé « pli / plis » de nouveau écartées du dossier (expression abîmée par un caractère de contrôle).
- Traductions : générateur, studio, Cartes de vol, planificateur, ODV (infobulles des zones calculées, créneaux, jours),
  Paramètres, Premier lancement, en-têtes des CR (« FIRE / GAAR — Compte rendu de mission ») ; la couche de traduction
  reconnaît « début libre — texte connu », traduit les infobulles des zones calculées et ne dépend plus du rafraîchissement
  de l'écran (onglet en arrière-plan).
- IVAO et VATSIM à égalité : légende des codes de disponibilité neutre (« Exercice SO (IVAO / VATSIM) »…), favori du CR
  présenté pour le tracker IVAO et StatSim (VATSIM).
- **Lecture des missions et affectations plus fluide** : petite base de fichiers dans `assignments.js` (lectures
  gardées en mémoire et revalidées par requête conditionnelle, fichiers absents compris ; invalidation entre onglets
  `defa-data` ; écritures des affectations, du journal et des disponibilités sous verrous Web Locks) ; plus de relecture
  par le dossier autorisé quand il est celui de la suite servie ; registre : relecture incrémentale du dossier (dossiers
  inchangés repris sans réanalyse) et `mission_registry.yaml` réécrit seulement s'il change ; Mes missions se met à jour
  dès qu'un autre onglet écrit une affectation.
- Sources remises en forme (`tools/format_sources.py`) ; commentaires d'en-tête et `docs/technique/FRAMEWORK.md` à jour.
- **Mes missions** : liste et dossier côte à côte, disponibilités en dessous sur toute la largeur ; bloc « Pilote »
  remplacé par trois boutons vers Mon profil (Pilote, Appareils maîtrisés, Simulateurs) ; appareils et simulateurs
  saisis dans Paramètres › Mon profil.
- **Documentation réorganisée** : au premier niveau de `docs/`, installation, paramétrage, utilisation et versions ; la
  documentation technique (architecture, synchronisation, feuille de route, dette technique, audits, propositions)
  dans `docs/technique/`.
- Planning ODV : classeur ODV masqué par défaut ; changement de créneau sans clignotement.
- Performances : audit et actions de priorité 1 et 2 (`docs/technique/perf/`) ; changement de page par les onglets et
  décor recalculé sans clignotement.
- Versions de cache : l'empreinte des images d'un script ne couvre que les images suivies par git.
- Aqua : bannière livrée en bas de page (sombre / clair selon le ton) ; Durci : poignées latérales retirées.

### Corrigé

- Disponibilités : plus de perte en changeant de semaine.
- Mes missions : le livre ne clignote plus au clic sur une mission ; cartes sans doublons ; CR créé depuis une mission
  avec l'immatriculation de l'appareil affecté.
- Cartes de vol : mission reçue plus remplacée par « Tracer » / « Carburant ».
- Atterrissages : plusieurs fichiers CSV / LOG lus ensemble (bouton et glisser-déposer).
- Paramètres › Centre : utilisateur ajouté affiché aussitôt ; préférences de thèmes lisibles en Cabinet et Carnet de vol.
- Plaques de titre : plus de texte qui déborde dans une colonne étroite.
- Données lues là où elles sont écrites (alerte sinon).

### Sécurité

- Lanceur : en-tête `Host` de la machine exigé (parade au « DNS rebinding »), envois limités à 512 Mo, `nosniff`,
  identifiants framagit sans retour à la ligne.
- Planificateur : commentaire et noms de phase d'un profil importé échappés.
- Webservice d'envoi des CR : `https://` obligatoire (hors localhost).

### Livraison

- Archive de livraison : `xplane-web-suite-4.8.0.zip` — SHA-256 `ae688fc9cf1479f5442d9b6700c105cb01e54050370c9829da166932cc5d48ff` (code seul, hors dépôt : dossier `dist/`).

## [4.7.0] — 2026-10-02

Exercices et plis scellés : les messages et pistes d'un exercice arrivent au pilote dans des enveloppes cachetées,
derrière le signet de son dossier de mission, ouvertes à leur heure ; le Centre affecte une opération entière (toutes
ses missions, une heure H) d'une seule ligne de l'ODV. Lanceurs et page « Premier lancement » ; décor complet et Aqua
par défaut ; galons argent / or ; signets, enveloppes et appareils de page dans les quatre designs à matières.

### Ajouté

- **Lanceurs** `lancer.cmd` (Windows) et `lancer.sh` (macOS / Linux) : Python trouvé ou installé, données récupérées,
  serveur local démarré, navigateur ouvert sur la page **Premier lancement** (`tools/launch.py`).
- **Premier lancement** (`apps/settings/premier_lancement.html`) : données (identifiants framagit ou archive reçue par
  mail ; journal des vols DEFA en option), profil (trigramme, IVAO, VATSIM, SimBrief, identifiants du site DEFA hors
  sauvegardes), dossiers (dossier de l'application, classeur ODV : OneDrive ou fichier Excel), puis mise à jour SIA ;
  bouton « Nettoyer et recommencer ».
- Planning ODV : classeur rouvert à l'arrivée (dossier OneDrive, sinon copie gardée du dernier classeur).
- **Plis scellés de l'exercice** (« Mes missions ») : événements adressés à l'équipage (ou émis par lui : « message à
  transmettre ») dans l'enveloppe cachetée du design, derrière le signet (page « Informations complémentaires », 4
  langues) ; heure d'ouverture calculée (décollage du participant, décalage, passage du point), ouverture automatique
  à l'heure, scellé brisé d'un clic sur l'enveloppe (confirmation en deux temps avant l'heure), « Resceller » ; pistes
  et cartes d'exercice visibles seulement dans le pli ouvert.
- **Journal des gestes du pilote** (`LocalStore.logEvent`, `kind: 'mission'`) : mission ouverte ou rescellée, plis
  ouverts (à l'heure, avant), rescellés, envois vers les Cartes de vol, le carburant, le CR — base du CR prérempli.
- **ODV, opérations à plusieurs missions** : une ligne, une coche, un poste par équipage de chaque mission, « +
  équipier » sous chaque équipage, enregistrement de toutes les missions d'un coup ; **heure H** de l'opération et
  décollage de chaque équipage à H + son décalage, convoyage calculé sur ce décollage.
- **ODV** : « Modifier » montre les missions enregistrées du créneau, préremplies ; vols de la frise horaire →
  « Planifier… / Modifier… » ; choix de la semaine (précédente, suivante, en cours, semaine du classeur) ; convoyage
  par un tiers = mission (« à affecter », puis confiée) ; décollage avancé ou choisi ; missions sur plusieurs
  créneaux ; appareils compatibles seulement, triés par distance, temps de convoyage affiché ; missions probables
  pondérées par les CR de la famille.
- **Heure d'exercice** : une seule référence (H, T ou M), décalages avec leur unité (`H+2mn`, `H-20mn`, `H+1h`) ;
  lecture et écriture communes (`RepositoryKit.hOffset` / `hText`) ; éditeur, prompt du générateur et doc.
- **Visionneuse d'image commune** (`RepositoryKit.viewImage` : croix, Échap, taille réelle au clic) : cartes de
  « Mes missions ».
- **En-tête de l'ordre de mission selon la famille** (Aqua : 9 émetteurs).
- **Designs** : galons (argent, or au Centre) dans les quatre designs à matières ; signets (Aqua, Durci) et enveloppes
  de pli par design ; appareil de page d'Aqua (défibrillateur, moniteur) ; nouvelle frise de pied de page d'Aqua ;
  panneaux du ton sombre d'Aqua et du Carnet de vol ; feuille de registre d'Aqua (porte-bloc, pince, en-tête CPCO-DEFA).
- **Pied de page en `file://`** : numéro de commit lu dans `config/build.js` (crochets git ; `sh tools/install_hooks.sh`
  une fois par clone).
- `tools/assets_status.py` : inventaire des assets des designs.

### Modifié

- Racine rangée : `README.md` pour débutant, documentation dans `docs/` (sommaire), configuration dans
  `config/repository_tree` ; `repository_tree` à la racine ne reste que comme relais pour le contrôle des mises à jour
  des versions 4.6.0 et antérieures (bloc release seul, généré par `tools/bump_versions.py`), à retirer en 4.9.
- Paramètres › Sources et dossiers : dossier du dépôt en tête ; le choisir règle data/, ses sous-dossiers et la
  sauvegarde locale.
- **Décor complet par défaut** partout, **Aqua design par défaut** d'une nouvelle installation.
- **Convoyage** : le pilote convoyeur ne reçoit que l'ordre de convoyage (appareil, départ, arrivée, heure).
- **Une mission par pilote et par tranche** (matin, après-midi, soir), convoyeurs compris.
- **Mes missions** : dernière page du dossier à gauche, signet posé à la fin du dossier (il tourne avec la page) ;
  fiche technique lisible (libellés, tableaux, coordonnées ; ni pistes ni injects) ; cartes de pistes retirées des
  cartes fournies.
- Fenêtres d'affectation lisibles dans les designs à matières (fond d'un bloc), ancrées sur l'élément en cours de
  saisie ; bouton « Enregistrer dans le dossier » au style « danger » du design, sur une ligne.
- Framework : jeton d'angles `--repo-round` ; panneaux de blocs sur une seule classe ; fonds illustrés (BG) retirés.

### Corrigé

- Pages `*_core_*` de FIRE / HEMS ressuscitées par erreur en 4.6.0 : retirées.
- ODV : une mission d'exercice n'affecte plus toutes les équipes de l'opération ; mission d'organisation (…Z) jamais
  proposée ; distance et convoyage pour toutes les missions (départ par position) ; appareil déjà affecté grisé.
- Planificateur carburant : appareil de la mission transmise sélectionné ; SimBrief : sa réponse au lieu de
  « indisponible ».
- Landing : « Cannot access 'esc' before initialization ».
- Signets : clignotements et sauts au tournage des pages ; numéros de page sans saut.

## [4.6.0] — 2026-10-01

Affectation des missions aux pilotes et page pilote « Mes missions » : la mission arrive scellée dans un dossier propre
à chaque design (dossier ficelé du Cabinet, enveloppe cachetée du Carnet de vol, porte-documents noué d'Aqua, dossier
zippé de Durci), s'ouvre comme un livre dont on tourne les pages ; Planning ODV dense ; échappement HTML commun.

### Ajouté

- **Affectation des missions aux pilotes** : bouton « Affecter… » du registre (pilotes, appareils, heure, astreinte,
  convoyage, postes par équipage, conflits), vivier de pilotes disponibles possédant l'appareil, matrice d'un créneau
  ODV, journal des affectations (date, qui, quoi, à qui) ; trigramme dans le profil pilote ; bloc `alert` (astreinte)
  dans le prompt du générateur. Conception : [docs/AFFECTATION_MISSIONS.md](technique/AFFECTATION_MISSIONS.md).
- **Page pilote « Mes missions »** : missions de la semaine, disponibilités aux codes et couleurs de l'ODV, appareils
  du pilote ; pli cacheté dans l'en-tête pour une mission non lue ; transferts Cartes de vol, Carburant, CR.
- **Dossier de mission** dans les designs à matières : mission non lue scellée (ficelle et cachet, ruban noué,
  enveloppe cachetée, ficelle en croix), ouvrir brise le sceau ; dossier ouvert en livre (page 1 l'étiquette, puis
  l'ordre avec l'en-tête du design, le détail, les cartes posées, objectifs et signature), pages tournées autour du dos
  par le coin corné ou un clic, numéros en bas de page ; signets (Cabinet, Carnet de vol) qui mènent à la dernière
  page ; tampons « CONFIDENTIEL », « URGENT », « DIFFUSION RESTREINTE ».
- **Planning ODV** : grille dense, déclarations des pilotes, missions probables, simulateurs abrégés et colorés,
  affectation depuis un créneau, en-têtes en icônes.

### Modifié

- Modules applicatifs : l'échappement HTML commun (`RepositoryKit.esc`) remplace 24 copies ; `kit.js` chargé avant
  tout module qui s'en sert.
- Versions de cache : les images des styles d'une page sont versionnées (`url("…?v=…")`), comme les scripts.
- INSTALL : Brave uniquement en mode serveur local, accès aux dossiers à activer.
- Images sources ChatGPT orphelines retirées du dépôt (86).

## [4.5.0] — 2026-10-01

CR FIRE / GAAR et HEMS / MEDEVAC sur le Mission Core (toutes les familles de CR partagent le même socle) ; toolkit
phase 3 (couches CSS : les designs l'emportent sans `!important`, rendu inchangé au banc) ; palette commune des outils
sombres ; messages clairs quand le navigateur ne permet pas de choisir un dossier (Brave, http, Firefox).

> **Annonce : suite du refactoring du toolkit.** La phase 3 (couches CSS, retrait des `!important`) se poursuit et
> pourra encore modifier légèrement l'apparence des designs à matières. Plan :
> [docs/REFACTORING_TOOLKIT.md](technique/REFACTORING_TOOLKIT.md).

### Ajouté

- Générateur : durée de l'opération en tailles (XS · S · M · L · XL, de 30 min à 8 h).
- Pied de page : numéro de commit entre deux versions (`v4.5.0+abc1234`).

### Modifié

- Planificateur carburant : nom d'appareil « référence surnom — constructeur » (plus de nom tronqué sur l'essentiel).
- Renforts `:not(#imp)` sans effet (audit sur toutes les pages × designs × tons, `tools/imp_audit.html`) rendus à
  leur règle d'origine : 113 règles ; rendu inchangé au banc.

- Framework : socle, styles des pages et styles posés par les scripts rangés dans une couche CSS `app` (MapLibre en
  `lib`, en dessous) ; les designs, hors couche, l'emportent sans `!important`. Les `!important` du socle et des pages
  sont convertis en sélecteurs renforcés (`:not(#imp)`) ; rendu inchangé au banc de non-régression.
- Banc de non-régression : un panel réduit se compare au *snap* du panel complet.
- CR FIRE / GAAR et HEMS / MEDEVAC : les pages du Mission Core remplacent les pages historiques, à la même adresse
  (mêmes champs ; anciens registres CSV importables depuis la page : « Importer l'ancien registre … »). Toutes les
  familles de CR partagent désormais le même socle.
- Outils à fond sombre (Landing, planificateur, planning ODV, reporting des opérations) : une palette commune aux noms
  de la palette claire, atteinte par les designs ; la Landing et le reporting des opérations changent de quelques
  nuances.
- Designs : leurs `!important` convertis eux aussi (`designs.css` 29 → 0, `designs_skeuo.css` 279 → 32 : impression,
  masquage et quatre cas contre un style en ligne) ; rendu inchangé au banc.

### Corrigé

- Choix d'un dossier (Paramètres › Sources et dossiers, registres, sauvegarde) dans un navigateur qui ne le permet
  pas : au lieu de « File System Access API (Chrome / Edge) », un message qui dit quoi faire — Brave : activer
  `brave://flags/#file-system-access-api` puis relancer ; page en http hors localhost : ouvrir par 127.0.0.1 ;
  Firefox, Safari : Chrome ou Edge. Affiché en notification.
- Paramètres › Maintenance sans dossier `data/` : plus de requêtes vers `data/` ni vers `VERSION.json` (404 en
  console) ; seul reste le 404 de `data/data_tree.js`, qui détecte l'absence des données.


## [4.4.0] — 2026-09-30

Nouvelle famille COMBAT (combat aérien : BFM, ACM, DACT, interception) ; identifiants de mission liés migrés d'un bloc
au lieu de casser l'opération ; enregistrement dans le dossier des missions qui dit toujours pourquoi il échoue ;
toolkit phase 2 terminée (jetons, boutons communs, feuille de registre commune), barres de progression et
notifications dans la matière des designs ; début de la phase 3 (couches CSS).

- **Designs à matières — barres de progression et notifications** : `<progress>` (tâches longues, jauges des pages)
  dans la matière du design (piste creusée ; laiton de Cabinet, encre du Carnet de vol, voyants verts de Durci, gel rayé
  d'Aqua), angles vifs, balayage quand l'avancement est inconnu, sans mouvement si le système le demande ;
  notifications flottantes dans la matière des menus (jetons `--sk-prog-*`, `--sk-menu-*`).
- **Registre — feuille de registre** : carte posée sur la feuille (détail d'une mission) en papier punaisé à encre
  foncée dans les trois designs à feuille (Durci : plus de plaque d'acier illisible) ; règles communes par jetons
  `--sheet-*`. Bouton ☰ centré dans tous les designs. Studio cartographique : « Enregistrer dans le dossier » affiche
  toujours son résultat (succès, échec et cause). Fenêtres du Mission Core : texture du design rétablie.
- **Toolkit — phase 3 (couches CSS), début** : banc de non-régression par page et en design « standard » ; 52
  `!important` retirés des styles de 5 pages (banc : aucun écart) ; `tools/strip_page_important.py`. Les pages COMBAT,
  copiées pendant l'essai de couches, sont de nouveau habillées par les designs.
- **Missions — identifiants liés** : changer l'identifiant d'une mission d'opération (générateur : champ quitté, ou
  identifiant hors format corrigé à l'enregistrement) propose une migration globale — toute l'opération si la base
  change (`BFM-001C` → `A-001C` migre `BFM-001` → `A-001` : missions, organisation, participants de l'exercice, noms
  des cartes, textes, famille ; ancien identifiant dans `mission.former_id`) — sinon l'identifiant est rétabli.
  Pendant la saisie, la mission garde sa place dans le lot (plus d'écrasement d'une autre mission par un identifiant
  partiel ou en double). Missions déjà rangées : `tools/migrate_operation_ids.py`. Dossier des missions : cause
  précise de chaque échec (sélecteur, autorisation, écriture, identifiant hors format) au lieu de « non autorisé ».
- **Nouvelle famille COMBAT — combat aérien / entraînement chasse** (lettre A : missions `A-001`, CR `CRA-001-1`,
  `CRA-A01-0`) : sous-types BFM (combat rapproché), ACM (combat aérien manœuvrant), DACT (adversaire dissemblable),
  INTERCEPT (interception d'entraînement, identification visuelle). CR et reporting (`apps/cr/COMBAT/`) : dispositif et
  zone (TSA / CBA / zone D, bloc d'altitude, plancher de sécurité, format 2v2…, adversaire, contrôle, joker / bingo),
  engagements (situation de départ, armement simulé, tirs valides, issue — victoire, défaite, nul, knock-it-off),
  bilan de la séance ; statistiques (engagements, victoires, tirs valides, KIO) et résumé automatique. Générateur de
  missions : famille, règles des zones d'entraînement, Mirage 2000 (MIR2) parmi les appareils. La police du ciel réelle
  reste en COMMAND / AIR_POLICING, le ravitaillement en AAR.
- **Toolkit — phase 2, premiers chantiers** : feuille de registre à éléments facultatifs (valeurs par défaut) et bloc
  « découpe » réécrit par `tools/cut_register_sheet.py <design> --write` ; carnet des aperçus devenu composant commun
  (`.repo-notebooks` / `.repo-notebook`, `designs_skeuo.css`) ; contrôle des images `tools/check_assets.py` (format,
  poids, absentes, orphelines), lancé par `bump_versions.py`.
- **Toolkit — phase 2, suite** : pastilles de code (`--sk-code-*`) et polices des boutons et liens-boutons
  (`--sk-btn-family`, `--sk-lbtn-family`) par jetons ; tonalité des surfaces `html[data-surface]` (« dark » pour Durci,
  dont les blocs sont sombres, et pour tout ton sombre ; déclarée dans le registre des designs : `surface:"dark"`) :
  encadrés d'état écrits pour elle au lieu d'une liste de designs. Rendu identique (banc).
- **Boutons — convention commune** (tous les designs à matières) : 1ᵉʳ bouton de l'en-tête principal, les suivants
  secondaires ; liens secondaires et « Ajouter des fichiers » secondaires. Changements visibles : Cabinet et Carnet de
  vol (2ᵉ bouton de l'en-tête de l'éditeur de mission en parchemin), Aqua (« Ajouter des fichiers » en verre).
- **Toolkit — phase 2** : frise du pied de page déclarative (liste de composants : bande, plaque, radar, voyant de
  sauvegarde) au lieu d'un gabarit HTML propre à Durci.
- **Toolkit — phase 2** : cadre de la page (`--sk-page-*`) et vis des coins de l'en-tête, des blocs et des sous-cartes
  (`--sk-corner-screw`, `--sk-*-screw-*`) par jetons : une règle par emplacement au lieu d'une par design. Rendu
  identique (banc).
- **Toolkit — phase 2** : emblème de l'en-tête (`--sk-emblem-*`, mobile compris), lien « choisir » des zones de dépôt
  (`--sk-pick-shadow`, `--sk-pick-family`), pied de page, ligne de base et police des graphiques du reporting
  (`--sk-chart-base`, `--sk-chart-font`) par jetons. Rendu identique (banc).
- **Toolkit — phase 2** : textes courants des blocs (encre du design) et police des libellés par jetons, règles jumelles
  de Cabinet et Durci retirées (dont couleurs mortes des petits textes de Cabinet). Rendu identique (banc).
- **Toolkit — phase 2** : ombre de la barre latérale, ombre et liseré intérieur des bandeaux, encre des sous-cartes par
  jetons (valeurs relevées sur le rendu actuel : aucun écart) ; banc de non-régression étendu (Planning ODV, registre
  des missions, Paramètres ; bandeaux, feuille de registre, commandes des tableaux).
- **Toolkit — phase 2** : titre de l'en-tête par jetons (`--sk-title-*`) ; plaque de titre du Carnet de vol par les jetons
  communs des plaques ; code mort retiré. Rendu identique (banc).
- **Tableaux des designs à matières** : lignes resserrées (boutons et champs compacts dans les cellules : 45 → 33 px
  dans le registre des missions) ; Durci : type de mission (gras) à l'encre foncée sur la feuille de registre.
- **Textes secondaires des pages** (`var(--muted)`) : encre secondaire du design dans les blocs des designs à cadre
  (sous-lignes des dossiers de Paramètres illisibles en Carnet de vol).
- **Toolkit — phase 2** : sélecteurs segmentés d'Aqua dans les règles communes (jetons de fond de segment et de
  rayon) ; entrée courante de la barre latérale par jetons (`--sk-nav-on-bg`, `--sk-nav-on-edge`, règle de base).
- **Carnet de vol** (feuille de registre) : en-tête entier, fondus courts (le fondu mangeait le texte).
- **Planificateur de vol** : courbe RPM / consommation au même habillage que les autres graphiques (grille, courbe
  nominale, bornes en pointillés, curseur ; écran d'instrument dans les designs à matières).
- **Appareil de page** : entre les blocs 2 et 3 (une page à trois blocs, comme le registre des missions, l'accueille).
- **Versions de cache par empreinte** (`tools/bump_versions.py`) : `?v=` = empreinte du contenu du fichier visé (au lieu
  d'une date à lettres) ; une page ne change que si l'un de ses fichiers change ; feuilles de design chargées avec
  leur propre version (table `FILE_V`) ; versions écrites à la main dans trois scripts (extensions, traductions GAAR
  et HEMS), figées depuis le 23 septembre, désormais tenues à jour.
- **Code lisible** : JavaScript, CSS et scripts / styles des pages remis en forme (118 fichiers : une instruction et une
  déclaration par ligne), sans changer le code — contrôle avant / après des arbres syntaxiques et des règles CSS
  (`tools/format_sources.py`, `tools/verify_format.html`) ; éditeur de mission : chaque fonction commentée.
- **Toolkit — phase 2, jetons des designs à cadre** : règles jumelles de Cabinet et Durci (pastille d'étape, titres
  de sous-cartes, zones de dépôt, icône des bandeaux, focus, pied de page, sélecteur segmenté) fusionnées en règles
  communes à jetons ; code mort retiré. Rendu identique (banc de non-régression).
- **Panneaux de fond** (Cabinet, Durci) : atténués de façon uniforme, plus de dégradé en transparence vers la gauche.
- **Durci** : poignées latérales regénérées (poignée à grip, nette) ; poignée horizontale et barre fine remplacées.

## [4.3.1] — 2026-09-30

Toolkit refactoré (phase 1) ; feuilles de registre, carnets du Studio et appareils de page pour Cabinet, Carnet de vol
et Durci ; tâches longues avec barre de progression et garde de sortie de page.

- **Toolkit — boîte à outils commune** (`shared/kit.js`, `window.RepositoryKit`) : échappement HTML, langue et
  traductions, stockage local protégé, couleurs et contraste WCAG ; chargée par toutes les pages avant
  `repository_nav.js` ; le socle (`repository_nav`, `block_icons`, `appearance_page`, `app_framework`, `file_access`,
  `suite_update`, `design_deco`) l'utilise à la place de ses copies ; API de `RepositoryNav.appearance` reformatée.
- **Toolkit — registre unique des designs** : `REPOSITORY_TREE.designs.list` porte `skeuo` et `chart` ; palette et
  relief des graphiques, logo, dossier des icônes (`appearance.iconFolder`) et jeux du générateur d'icônes en sont
  déduits ; attribut `html[data-skeuo]` pour la CSS commune aux designs à matières (63 listes de designs remplacées).
- **Toolkit — CSS par jetons (en cours)** : 103 jetons `--sk-*` par design et par ton ; en-tête, menus, blocs, cartes,
  zones de dépôt, bandeaux, champs, boutons, liens-boutons, barre latérale, pied de page, barre d'action, outils de bloc
  écrits une seule fois ; règles propres aux CR, à l'éditeur de mission, au planificateur et à l'Apparence rangées dans
  leurs feuilles. Rendu identique (banc `tools/skeuo_regression.html`), `!important` 551 → 328.
- **Cabinet** : plus de rose des vents en filigrane des blocs (les panneaux les habillent) ; feuille de registre redécoupée
  (pages qui dépassent du livre en haut à gauche, tranches raccordables arrêtées aux coins, coins fondus, N° et tampon
  « Diffusion restreinte » à droite, ficelle et œillets posés sur le dos).
- **Landing Performance** (designs à cadre) : barre d'analyse de nouveau fixée en bas de page (les designs forçaient la
  position des blocs : barre décalée à droite dans la page).
- **Durci** : vis cruciformes découpées dans la planche enfin appliquées (règle neutralisée par un commentaire mal fermé).
- **Centre** : fond des icônes par convention de nom (`vierge.rouge.webp`, cuivre, pour Cabinet, Carnet de vol et Durci ;
  à défaut `vierge.gris.webp`) ; option `centreBg` du générateur retirée.
- **Appareil de page** : entre les blocs 3 et 4 pour tous les designs (constante `DEVICE_AT`), plus entre les deux
  premiers ; Carnet de vol : carnet de cuir fermé et DME.
- **Décors** : `design_deco.js` réorganisé et documenté (familles de décors, formats des tableaux de réglage) ; plus
  d'objet posé sur une feuille de registre.
- **Feuille de registre** : géométrie par design (jetons `--sh-*` : coins, bandes, papier, marges, en-tête, accessoire du
  bord gauche) ; `tools/cut_register_sheet.py` générique (une configuration par design, jetons affichés). **Durci** :
  carnet de terrain dans sa pochette olive (coins entiers, bord droit redressé, intérieur réglé effacé), crayon dans son
  étui élastique hors de la fermeture éclair (marge `--sh-gut`), encre foncée sur le papier ; tableau resserré ;
  Carnet de vol reprend le dossier de Cabinet (en attendant son en-tête).
- **Durci** : appareil de page = câble et poste radio de face (entre les blocs 3 et 4) ; crayon parmi les objets (le câble n'y
  est plus) ; génération de cartes : carnet fermé tant qu'aucune carte n'est affichée, carnet ouvert sous chaque carte.
  Plus de défilement horizontal de 10 px (poignées latérales débordant de la marge).
- **Carnet de vol** : sa propre feuille de registre (carnet de vol toilé, en-tête imprimé « République française —
  Carnet de vol », cachet « Autorisation de transit » à droite, ficelle sur le dos) ; carte de navigation (objet)
  reconvertie (PNG de 2,9 Mo → WebP de 90 Ko).
- **Studio cartographique** (Cabinet, Carnet de vol, Durci) : carnet des aperçus commun aux designs à cadre (jetons
  `--nb-*`) ; carnet de cuir bleu pour Cabinet et Carnet de vol ; carnet fermé à la hauteur du carnet ouvert, à la
  place du premier aperçu, calé à droite (il s'ouvre vers la gauche) ; un clic sur le carnet actualise les aperçus. Aperçu agrandi : un clic le ferme.
- **Barres d'action** (designs à matières) : au-dessus des objets posés entre les blocs.
- **Tâches longues** (socle, `AppFramework.task`) : barre de progression flottante et avertissement avant de quitter
  la page (fermeture, rechargement, lien interne) tant qu'une tâche tourne ; Studio : aperçus des cartes (une mission
  ou toutes), génération (une mission ou toutes ; remplace la barre du pied de page) ; registre : lecture du dossier des
  missions ; Paramètres : calcul complet MORA ; import SIA (garde de sortie, erreurs relayées en notifications).
- **Durci** (feuille de registre) : crayon contre la pochette, un peu caché par la fermeture éclair ; coins droits
  redressés comme la bande de droite (tous sur la même verticale).
- **Appareil de page** (designs à matières) : déplaçable latéralement (glisser), position gardée par design ; réduit à
  la largeur de sa colonne s'il la dépasse ; dessiné devant le bloc au-dessus. Durci : câble lové et grand poste radio
  dont l'antenne dépasse sur le contenu au-dessus.
- **Durci** : poignées latérales au premier plan (devant l'en-tête collant), davantage sur la page.
- **Décors** : images inutilisées retirées (fond « carte de cuir » du Carnet de vol) ; vérification croisée images ↔ code.
- **Barre latérale** : contenu un peu descendu (logo DEFA centré dans sa case).
- Proposition de phase 2 du refactoring (supprimer les exceptions ; assets à fournir) : `docs/REFACTORING_TOOLKIT.md`.

## [4.3.0] — 2026-09-30

Décors des designs à matières : objets, panneaux de fond par thème, feuille de registre et appareil de page ; icônes
composées pour tous les jeux skeuomorphes ; contrastes (Planning ODV).

- **Icônes** : Cabinet, Durci et Carnet de vol passent aux icônes composées (fond vierge + glyphe du registre) ; nouveaux
  glyphes `trending-up` et `shield` ; les commandes à ChatGPT prennent l'icône `sparkles`.
- **Panneaux de fond par thème** (Durci, Cabinet) : chaque bloc reçoit un panneau en rapport avec son contenu (appareils,
  terrains, horaires, radio, navigation, équipement, résultats, familles, opérations), choisi d'après son titre, puis son
  icône, puis son sous-titre ; en paysage ou en portrait selon la forme du bloc ; blocs imbriqués : un seul fond, sur le
  grand. Cabinet : jeu « 1930 » marine en ton sombre, ivoire en ton clair (dossier réglable pour un futur jeu « 1800 »).
  Les fonds illustrés propres à Cabinet et Durci sont retirés (les panneaux les remplacent).
- **Feuille de registre** (Cabinet, ton clair) : les blocs de tableau des registres et journaux prennent le dossier
  « Aéronautique navale » en fond (en-tête imprimé et tampon, dos et ficelle, pages empilées), contenu décalé à l'intérieur.
- **Appareil de page** (Cabinet) : livre de bord et poste radio dans un emplacement réel entre les deux premiers blocs.
- **Objets** : Durci (grille d'aération, lampe, plaque vierge, blindage, interrupteur, câble, cadran) ; Cabinet (objets
  « 1930 » : cartes, règle parallèle, porte-mine, sextant, valise, enveloppes, étiquette « Top secret »…) ; objets posés
  dans un bloc (ordre de mission, étiquette) ; objets entre les blocs décalés et inclinés au besoin. Ménage : objets en
  double ou de moindre qualité retirés, panneaux allégés (décors Cabinet et Durci : 9,7 → 4,7 Mo).
- **Contrastes** : panneaux calés à droite et estompés côté texte ; voile à la couleur du design sous les tableaux et les
  données (`--repo-veil`) ; Durci : panneaux assombris ; Planning ODV : détail d'un créneau en sous-bloc habillé,
  avertissements lisibles en ton clair.

## [4.2.1] — 2026-09-29

- **Carte du bloc Route** : les points tournants de la mission déjà portés par la route éditable ne sont plus dessinés une
  seconde fois (plus de double pastille ni de double étiquette) ; les points hors route (rendez-vous, cible…) restent.

## [4.2.0] — 2026-09-29

Planning ODV (Centre), bloc Route (plan de vol case 15 lié à la carte et à la coupe verticale, voies aériennes, RTBA,
SimBrief, points de report VFR), plan de vol unique entre planificateur carburant et Cartes de vol, masse au décollage
prévue, journal des alertes, icônes composées (fond vierge + glyphe) et sélecteur segmenté des designs à matières,
plans trois vues du Carnet de vol.

À la mise à jour : relire le dossier SIA une fois (base au format 15 : points de report VFR).

- **Bloc Route** : réglages du profil de la carte affichée (fond, zones, symboles, éléments) avec le choix de la carte et
  de son profil, sous l'aperçu (plus seulement dans « Cartes à produire »).
- **Carnet de vol** : plans trois vues plus grands (45 % de la largeur du bloc, 340 px au plus) ; en ton sombre, traits crème
  façon blueprint (versions `blueprint-*-clair.webp`), traits sépia en ton clair.

- **Carnet de vol** : plans trois vues (Islander, DC-3, B-17, P-51, Concorde ; `deco/flightlog/blueprint-*.webp`,
  convertis en sépia sans franges, ~100 Ko) au coin des blocs en décor complet, en alternance dans l'ordre de la page
  (rang `data-deco-n` posé par le framework) ; ancien `blueprint.webp` retiré.

- **Framework — sélecteur segmenté** (`repo-segs` / `repo-seg`, `aria-pressed`) : composant commun (page Apparence :
  décor, style des graphiques, barre latérale), habillé dans les designs à matières avec les textures existantes — Cabinet :
  barrette de laiton, choix en cuir marine ; Carnet de vol : aluminium, choix en cuir marine ; Durci : acier sombre, choix
  en champ noir à voyant vert ; Aqua : verre et gel.

- **Bloc Route revu** : champ pleine largeur sans étiquette redondante, barre d'outils sur une ligne en deux groupes
  (construire : niveau, recherche « Voies aériennes / RTBA » + Chercher, SimBrief, route probable ; exploiter : Tracer,
  Carburant, Copier OACI), liste de recherche à sa largeur, syntaxe et mode d'emploi réunis dans « Syntaxe et
  utilisation » ; Cartes de vol : texte d'accueil redondant du bloc « Cartes du vol » retiré.
- **Aqua** : boutons des blocs (masquer, déplacer) en petites bulles vierges teintées, symbole par-dessus (jaune dans le
  Centre).

- **Aqua** : bouton « déplacer le bloc » (↕) de nouveau visible (jeux composés : symbole en texte, comme les jeux au trait).

- **Aqua** : disque teinté ajusté au cerclage des bulles (centre remonté de 1 px, diamètre réduit de 2 px ; réglages up /
  shrink du générateur).
- **Bloc Route** : niveau de croisière avec les outils du champ de route (plus dans les réglages repliés) ; Cartes de vol :
  champ « Niveau » du bloc « Cartes du vol » retiré (doublon).

- **Aqua** : cerclage des bulles hors teinte (seul le disque intérieur prend la couleur Aqua) ; images d'icônes Aqua
  retirées (seules les bulles vierges servent), rotation de teinte (--aq-shift) supprimée, boutons des blocs au trait ;
  barre latérale et page Apparence sans images pour les jeux composés (`REPOSITORY_TREE.iconComposed`, écrit par le
  générateur, réécrit pour séparer jeux composés et jeux peints).

- **Icônes du Centre** : jeux `<jeu>-cpco/` retirés (le Centre se distingue par le fond `vierge.gris` des jeux composés et
  son glyphe jaune) ; plus de lien brisé dans la barre latérale.

- **Aqua : icônes composées** : bulle `vierge.gris.webp` teintée exactement à la couleur Aqua choisie (mélange de calques, plus
  de rotation de teinte) et découpée à sa forme, glyphe blanc ; Centre : même bulle, glyphe jaune. Même principe à venir pour Durci, Cabinet et Carnet de vol (fonds `vierge` / `vierge.gris`).

- **Base SIA** : une base au format précédent (14) reste utilisable (studio, Cartes de vol, profil vertical) — seuls les
  points de report VFR manquent jusqu'à la relecture du dossier SIA (signalé dans la ligne d'état du studio).
- **Syntaxe de la route** : explication associée au champ de route (planificateur : sous « Plan de vol » ; studio et
  Cartes de vol : « Syntaxe de la route » sous le champ).

- **Cartes de vol** : « Créer les cartes » applique les profils par défaut (route et approche en IFR) au lieu de reprendre
  ceux de la mission précédente ; profils choisis à la main et cadrages gardés ; mission enregistrée avec l'ancienne
  carte de route en VFR détaillé recréée en IFR à l'ouverture.

- **Carte du bloc Route** : points exactement sur le tracé (marqueur = pastille seule centrée sur le point, étiquette posée à
  côté hors du cadre ; écart mesuré < 0,5 px quelle que soit la longueur de l'étiquette) ; banc d'essai : option « Correction ».

- **Icônes skeuomorphes composées** (fond + glyphe SVG) : dès que `shared/icons/skeuo/<jeu>-bg/normal.webp` existe
  (Aqua, Cabinet, Durci, Carnet de vol), les icônes du jeu deviennent un fond commun et le glyphe du registre par-dessus
  (blanc / crème ; jaune sur le fond `centre.webp` du Centre), ombre portée vers le bas, contours nets à toute taille ;
  couleurs, ombre et marge réglables dans `tools/build_skeuo_icons_css.py` (GLYPH). Sans fond : images actuelles.

- **Un seul plan de vol** entre le planificateur carburant et les Cartes de vol (`flightPlanShared:v1`, le plus récent
  l'emporte) : champ « Plan de vol (case 15) » en tête du devis carburant (distance, route vraie et niveau en sont
  déduits), bouton « Cartes de vol » (cartes et profil créés à l'arrivée) ; import SimBrief du planificateur repris par
  les Cartes de vol.
- **Masse au décollage prévue** (devis carburant) : comparée à la MTOW de l'appareil (fiche APD), masse à l'atterrissage
  estimée dans le résultat, alerte en cas de dépassement.
- **Outil de développement** : `tools/stub_marker_offset.html` (banc d'essai du décalage des points de route sur la carte).

- **Points de report VFR** : lus dans le XML_SIA (1 098 points « VFR », ex. MM-CV Cavaillon) — base SIA au format 15 :
  relire le dossier SIA une fois ; affichables sur les cartes (profil d'affichage : Symboles OACI › Points de report VFR,
  losange vert et identifiant), utilisables dans le champ de route (« MM-CV ») et comme aimant sur la carte.
- **Voies aériennes sur les cartes** : basses (jusqu'au FL195, bleu) et hautes (violet pointillé), avec désignation
  (Symboles OACI › Voies aériennes) ; nouveau profil d'affichage **AIRWAYS** (ajouté aussi aux profils déjà enregistrés).
- **Bloc Route** : bouton « SimBrief » (route du dernier OFP : départ, groupe vitesse / niveau, route ATC, destination ;
  identifiant du profil pilote). Coordonnées des points ajoutés en notation OACI de la case 15 (degrés et minutes,
  « 4419N00316E ») ; les secondes restent acceptées à la lecture.
- **Designs Cabinet et Carnet de vol** : texte des boutons secondaires (parchemin) plus foncé et en gras.

- **Bloc Route** : clic droit sur un point (carte ou coupe) → suppression, point nommé compris (départ et arrivée
  exceptés) ; point d'entrée ou de sortie d'une voie aérienne supprimé → tronçon direct (« GOSAD DCT CTX »).
- **Designs skeuomorphes** : boutons de zoom des cartes (+ / −) de nouveau avec leur icône (styles des boutons du design
  non appliqués aux commandes MapLibre).

- **Boutons (designs skeuomorphes)** : même hauteur (38 px) avec ou sans icône, dans les blocs, la barre d'action et la
  barre d'état ; l'icône d'un bouton ne l'agrandit plus ; bouton icône seule carré de même hauteur.
- **Carte du bloc Route** : points collés au tracé (le marqueur est la pastille seule, l'étiquette à côté) ; points
  ajoutés écrits à la seconde dans le champ (« 441912N0031604E »), arrondis à la minute seulement dans le plan de vol OACI.

- **Cartes de vol** : la carte de la route (`route_<départ>_<destination>.png`) est en IFR, comme les autres cartes par défaut.
- **Icônes du Centre** : jeux d'icônes propres au Centre `shared/icons/skeuo/<jeu>-cpco/` (copies des jeux Laiton, Acier,
  Gel, Aviation, à retoucher), utilisés sur les pages du Centre et pour ses entrées de la barre latérale ; les filtres
  de couleur (rendu grossier) sont retirés. Règles générées par `tools/build_skeuo_icons_css.py`.
- **Outils** : `tools/README.md` (outils courants, ateliers graphiques, migrations ponctuelles) ; `bump_versions.py`
  met aussi à jour les scripts du Planning ODV et les images des jeux d'icônes du Centre.
- **Décors** : retouches de l'utilisateur (Cabinet, Carnet de vol, Aqua).

- **Barre latérale** : affichée par défaut (Apparence : « Toujours » ; « Selon le design » reste possible).
- **Accès au Centre** : entrées du Centre (barre latérale, menu ☰) montrées ou masquées aussitôt à l'activation ou au
  verrouillage, sans recharger.
- **Planning ODV en Durci** : carte des créneaux en « champ noir » (texte crème, remplissage vert selon le nombre de
  pilotes), jours et textes secondaires éclaircis.

- **Bloc « Route »** (studio du Centre, Cartes de vol) : un seul champ de route au format case 15 OACI, modifiable, juste
  au-dessus de la carte et de la coupe verticale ; recherche de route (voies aériennes ou RTBA) écrite avec les voies
  (« GOSAD G36 LMG G28 CTX »), voies aériennes suivies point par point par le profil et la carte, altitudes au point
  « /A035 » ; survol lié champ ↔ carte ↔ coupe (jeton surligné dans le champ) ; carte : points déplaçables
  latéralement, aimantés sur balises, points de report et terrains, clic sur la route pour insérer un point ;
  « Copier en OACI » (plan de vol strict) ; réglages du profil repliés. Bloc « Cartes à produire » sans aperçu (l'aperçu
  est la carte du bloc Route). Cartes de vol : bloc « Cartes du vol » (rendez-vous, niveau, cartes) après la route.
- **Profil vertical** : l'option « Afficher les altitudes (plafond / plancher) » du profil d'affichage s'applique aussi à
  la coupe (studio, planificateur).
- **Profils des cartes** : IFR par défaut (détail, cible, rendez-vous : VFR détaillé).
- **Planning ODV** : page du Centre (`apps/cpco/odv_planning.html`, accès réservé, entrée « ODV » de la barre latérale).
- **Icônes du Centre en Aqua** : bulle bleu nuit cerclée d'or (au lieu du glyphe jaune).

- **Planning ODV — sessions ATC et registre** : un « TRAINING » ou « EXAMEN » de position (« EXAMEN LFMN_TWR ») rend
  la CTR du terrain indisponible pour le créneau (et si possible ses TMA) ; bouton « Missions du registre… » sur les
  créneaux d'au moins deux pilotes : missions avec rendez-vous ou à plusieurs équipes de la famille, route estimée
  confrontée aux espaces à éviter (CTR → écartée, TMA → signalée), ouverture dans le registre (Centre activé).
- **Framework — journal des alertes** : les erreurs et avertissements notifiés (effacés de l'écran au bout de quelques
  secondes) restent consultables le temps de la page : témoin « ⚠ n » dans l'en-tête (rouge s'il y a une erreur, orange
  sinon, neutre une fois tout acquitté), liste horodatée (répétitions comptées), ACK par alerte, « Tout acquitter »,
  « Vider » ; 50 dernières alertes, rien n'est conservé au changement de page (`AppFramework.alerts`).

- **Profil vertical éditable à la souris** (studio du Centre, Cartes de vol ; `shared/carto/vprof_editor.js`) : clic
  dans la coupe → nouveau point à cette distance et cette altitude (« 44.3361 3.2544/2500 »), aimanté sur un point
  existant proche (seule son altitude change : « R590A/1650 ») ; points déplaçables (altitude au pas de 50 ft ; les
  points ajoutés glissent aussi le long de la route et fusionnent avec le point sur lequel on les lâche ; double-clic :
  suppression) ; altitude, hauteur AGL et relief affichés pendant le déplacement. Étiquettes du cheminement sous le
  champ : survol d'une étiquette, d'un point ou curseur dans le champ → tronçon illuminé des deux côtés. Aux Cartes de
  vol, la route du bloc Vol suit les modifications.

- **Profil vertical → planificateur carburant** : bouton « Planificateur carburant » (studio du Centre, Cartes de vol) :
  cheminement converti en route de plan de vol OACI (`SiaProfile.toIcaoRoute` : points publiés par leur indicatif,
  autres points — sommets des zones du RTBA — en coordonnées `4419N00316E`, changements de niveau « R589B, FL55 » →
  `4419N00316E/N0160F055`), affichée et copiable ; le planificateur s'ouvre avec la route, la distance, le niveau, la
  route vraie et l'appareil, relance le calcul et trace son profil.
- **Cartes de vol** : un seul champ de route — la route du bloc Vol est le cheminement du profil vertical (virgules,
  niveaux « FL55 », « R590A/FL65 », « N0180F055 » acceptés), profil tracé dès « Créer les cartes » et mis à jour quand
  la route change.
- **Designs skeuomorphes** : l'en-tête garde l'arrondi de son design (Cabinet, Carnet de vol, Durci) ; en Durci, carte
  et radar du bandeau à angles droits (plaque et bloc de sauvegarde inchangés).
- **Planning ODV** (`apps/planner/odv_planning.html`, ☰ › Planning ODV, accueil) : lecture du classeur hebdomadaire
  ODV de l'escadrille (.xlsx) **dans le navigateur**, sans envoi ni conservation (lecteur ZIP de la suite +
  `DOMParser` ; seuls les réglages sont mémorisés) ; trigrammes lus dans les zones de texte, codes normalisés
  (casse, espaces), légende et couleurs lues dans le fichier, événements des lignes de groupe, profils FLOTTE (types,
  niveaux, rôles, simulateurs) ; grille de disponibilité filtrable, carte des créneaux communs et détail (horaires en
  commentaire, contrôleurs, événements, vols posés), missions probables par règles expliquées (familles de la suite +
  TRAINING avec contrôleur), vols de la frise contrôlés contre les disponibilités, zones à activer ; décalage de date
  de la frise et anomalies signalés par notifications ; exports CSV, JSON et récapitulatif texte. Voir
  [docs/ODV_PLANNING.md](ODV_PLANNING.md).

## [4.1.0] — 2026-09-29

Centre de planification et de conduite des opérations (CPCO), à accès réservé ; outil public « Cartes de vol ».

- **Centre de planification et de conduite des opérations (CPCO)** : générateur de mission, studio cartographique et
  registre des missions déplacés de `apps/sia/` vers `apps/cpco/` (anciennes adresses redirigées), menu « Centre — … »,
  titres « Centre de planification et de conduite des opérations », thème propre (bleu nuit et or, favicon), compatible
  avec les quatre designs skeuomorphes et proposé dans Apparence.
- **Accès au Centre** : activé dans Paramètres › Centre (CPCO) par un mot de passe (gardé dans ce navigateur) ; Centre
  verrouillé : pages absentes du menu, de la barre latérale et de l'accueil, page ouverte directement recouverte d'un
  avis, réglages du Centre (calcul des routes, espace disque des missions) verrouillés. Verrou d'usage, pas une sécurité.
- **Cartographie partagée** : `aero_symbols.js`, `vertical_profile.js`, MapLibre et `villes_geonames.csv` déplacés dans
  `shared/carto/` (utilisés hors du CPCO : planificateur, Paramètres, Cartes de vol).
- **Cartes de vol** (`apps/planner/map_planner.html`, accessible à tous, ☰ › Cartes de vol, barre latérale « Cartes ») :
  route (codes OACI, balises, points, coordonnées), recherche de la route par les voies aériennes ou à basse hauteur
  par le RTBA, rendez-vous facultatif, niveau ; cartes topographique de la route, approche, rendez-vous et destination,
  profil vertical, réglages et génération du studio. Page construite depuis le studio du Centre par
  `tools/build_map_planner.py` (à relancer après toute modification du studio) ; mission gardée à part dans le
  navigateur (celle du Centre n'est jamais touchée).
- **Icônes du Centre** (designs skeuomorphes) : sur les pages du Centre et pour ses entrées de la barre latérale, fond
  en merisier (laiton) ou peint en rouge (acier), glyphe doré comme un galon (aviation, gel) ; les autres icônes restent
  classiques.
- **Designs skeuomorphes** : en-tête, bandeau décoratif, pied de page (barre d'état) et barre d'action à angles droits.
- **Profil vertical** : les points de transit de la route probable (sommets des zones du RTBA, « R 46 N2 ») sont
  reconnus — la route RTBA (ex. LFBO → LFSI) se trace ; sans niveau saisi, niveau de croisière de l'appareil.
## [4.0.0] — 2026-09-29

Exercices (organisation, chiffons, chronologie radio et plis), routes de transit calculées (voies aériennes, RTBA),
zones à activer, zones de recherche, théâtres étrangers, format de mission 2.0 ; générateur, studio, registre et
Maintenance réorganisés ; framework : notifications flottantes, tableaux à colonnes réglables.

À la mise à jour : relire le dossier SIA une fois (base au format 14 : gestionnaires des zones, voies aériennes) ;
relancer le calcul de la MORA (outre-mer et missions à l'étranger) ; relire le dossier des missions dans le registre.

- **Registre : suppression individuelle des cartes** — croix sur chaque vignette (confirmation), emplacement affiché
  (cartes/ ou racine), cartes en double à la racine repérées et supprimables d'un coup ; PDF compté dans la place.
- **Maintenance › Espace disque** : colonne PDF et « Purger les PDF » (régénérés par le générateur).
- **Registre : cartes surnuméraires** — dans les fichiers d'une mission, cartes absentes de sa liste de cartes marquées
  (croix de suppression), bouton « Supprimer les cartes surnuméraires », place occupée par la mission.
- **Maintenance › Espace disque** : place occupée par les missions (par mission et par type : données, cartes, dont
  surnuméraires, versions, textes reçus ; totaux) et par le navigateur ; purge des cartes surnuméraires ou de toutes les
  cartes générées (régénérables depuis le YAML), avec confirmation.
- **Studio, génération des cartes** : barre de progression et étape en cours dans le pied de page ; rangement dans le
  dossier de la mission toujours annoncé (notification, compte rendu) ; sans accès au dossier, bouton « Ranger les cartes
  dans le dossier » dans le pied de page. Registre : cartes en vignettes réduites.
- **Avertissements** : les zones d'état (`data-status`) passent leurs erreurs et avertissements en notification flottante
  (effacement automatique, croix) et ne les répètent plus en ligne ; état de la base SIA du studio en ligne neutre +
  notification.
- **Routes : mode et réglages visibles** — bloc Durée estimée : transit calculé ou raison du direct (hélicoptère, VFR,
  base SIA à relire, hors de la couverture des données SIA pour une mission à l'étranger, tronçons courts, détour) ;
  mode imposé par mission (`route_mode` : automatique, voies aériennes, RTBA, direct) ; paramètres du calcul réglables
  (longueur minimale, niveaux, portée d'entrée, détour admis), communs et mémorisés dans le navigateur.
- **Organisation d'exercice** : mission seule sans exercice (ex. H-001) → une ligne discrète au lieu du bloc Opération ;
  organisation créée avec un brief général proposé d'après les missions ; dossier organisation sans brief écrit →
  celui des missions.
- **Cartes générées par le studio** : rangement dans le dossier de la mission signalé ; sans accès au dossier, bouton
  « Ranger les cartes dans le dossier de la mission » (les cartes générées sont gardées en mémoire).
- **Markdown depuis le YAML** (`SiaMission.markdownOf`, format du § 9 du prompt, organisation d'exercice comprise) :
  affiché à la demande dans le registre quand le dossier n'a pas de `summary<ID>.md` ; même code pour « Exporter
  Markdown » du générateur (qui ne reprenait que les textes).
- **Cartes d'exercice** ajoutées d'office par le studio à l'ouverture d'une mission d'exercice (message ou pli qui
  révèle une position ou une piste, organisation, chiffons) ; générateur : liste des cartes d'exercice et leur état ;
  PDF de l'équipage : carte de chaque pli après sa page, carte d'un message radio sur une page « à remettre à réception
  du message ». L-001 : `exercice_EV-1_L-001.png` ; L-001Z : `organisation_L-001Z.png`.
- **Théâtre étranger** : commande « étranger (pays) » (champ Pays), règles du prompt (bases prépositionnées,
  partenaires, lieux réels, pas de données aéronautiques inventées), `mission.theatre` et `mission.country` (ISO) ;
  registre : « étranger — Japon ».
- **MORA hors des théâtres français** : le calcul complet (Maintenance) ajoute les emprises des missions du registre
  situées ailleurs (relief et sommets).
- **Villes** : outre-mer français (≥ 500 hab.) et reste du monde (≥ 15 000 hab., 187 pays) ajoutés à
  `villes_geonames.csv` (41 665 → 70 962 villes) par `tools/update_cities_geonames.py` (option `--world`).
- **Maintenance** : Versions et synchronisation, Références et dépendances — `moraCycle` lu dans `SiaBase`.
- **Maintenance** : chaque bloc rendu séparément ; une lecture en échec (dossier, base SIA, git) s'affiche dans son
  bloc et en notification au lieu de laisser Sources et dossiers, Versions et synchronisation… vides.
- **Barre latérale** : préférence et design posés dès l'en-tête de chaque page (repository_tree) ; planificateur :
  navigation chargée avant les calculs — la barre ne paraît plus en fin de calcul.
- **Registre → générateur** : plus de PDF produit à l'ouverture (demande de PDF consommée à l'arrivée, liée à la mission).
- **Notifications** : une seule par zone d'état, effacement automatique (erreur 12 s, avertissement 8 s, autres 5 s),
  plus de doublon message en ligne + notification.
- **Zones de recherche** lisibles sur les fonds topographiques : magenta, liseré blanc, hachures.
- **Format 2.0** : missions mémorisées dans le navigateur (partagée, lot) mises à niveau à la lecture.
- **Routes de transit calculées** (`shared/mission_routing.js`) : voies aériennes de l'AIXM pour un avion en IFR,
  chaînage du RTBA à basse hauteur, direct pour les hélicoptères et le VFR ; dans la route probable, les durées, le
  croquis, le profil vertical (« ↺ Route probable ») et les zones à activer. Temps d'aller et de retour éprouvés par les
  CR repris à la place du calcul. Base SIA au format 14 (voies aériennes) : relire le dossier une fois.
- **Studio réorganisé** — Mission (état, enregistrer, état de la base SIA, ouvrir une autre mission replié) ;
  Cartes et cadrage (liste des cartes, réglages du profil repliés, aperçu ; boutons Actualiser, Garder ce cadrage,
  Recentrer, Cadrage automatique) ; Profil vertical ; Aperçus et génération ; base SIA masquée par défaut. Cadrage
  automatique d'après la mission (points, zones, format 16/10). Fond local PNG « Carte France vierge » et ses champs
  de calage supprimés ; calcul de la MORA retiré du studio (Paramètres › Maintenance).
- **Zones de mission et de recherche** (`zones[]` : cercle ou polygone, `kind`) lues et dessinées par défaut ;
  cheminement affiché sans passer par le profil vertical. L-001 : secteur de recherche et exercice L-001Z (position
  transmise par radio, carte détaillée de la position révélée).
- **Zones à activer** (`shared/mission_airspaces.js`) : zones R, D, TRA, RTBA recoupées par la route et les zones, par
  gestionnaire (AIXM), dans le générateur et les PDF ; base SIA au format 13 (à relire une fois).
- **Générateur** : import et commande ChatGPT repliés quand une mission est chargée, bouton « Commander à
  ChatGPT… » ; Identification refaite (famille, sous-types proposés, identifiant et série suivants en indication
  grise, contrôle de la lettre de famille) ; format **helo-xp-mission 2.0** (`tools/migrate_missions_schema.py`).
- **Registre** : « Ouvrir » charge toute l'opération d'une mission d'opération (boutons en double retirés) ; fichiers
  d'une mission retrouvés même si le registre a gardé un mauvais nom ; croquis de la route et tronçons côte à côte.
- **Correctif** : un YAML commençant par un commentaire « # Mission … » n'est plus découpé en deux fichiers
  (`mission2.yaml` dans le registre).
- **Notifications communes** (`AppFramework.notify`) : les erreurs des zones d'état (`data-status`) et des ouvertures
  s'affichent en bas de page sur toutes les pages qui les déclarent.
- **Prompt** : description sans itinéraire, niveaux, durées ni zones à activer ; basse altitude dans le RTBA ; zones
  selon le type de mission ; position connue en vol = exercice ; schéma 2.0.
- **Studio : carte plate** — certains styles publiés (VersaTiles) imposaient la projection « globe » : vue mappemonde
  et, depuis l'outre-mer (Nouméa…), grille MORA et libellés de métropole projetés sur la carte. Le studio reste en
  Mercator.
- **MORA outre-mer** — le calcul complet (Maintenance, studio) couvre aussi Antilles, Guyane, Saint-Pierre-et-Miquelon,
  Réunion, Mayotte, Nouvelle-Calédonie, Polynésie (îles de la Société) et Wallis-et-Futuna (obstacles de l'AIXM
  FR_OM) ; à relancer pour produire le nouveau `mora.csv`.
- **Villes outre-mer** — `tools/update_cities_geonames.py` ajoute à `villes_geonames.csv` les lieux habités de GeoNames
  (≥ 500 hab., comme cities500) des pays choisis, outre-mer français par défaut.
- **Tableaux : largeur des colonnes réglable** (SortedTable) — poignée à droite de chaque en-tête, double-clic pour la
  largeur automatique, mémorisée par tableau. Registre : hauteur du tableau réglable (poignée en bas), mémorisée.
- **Maintenance › Sources et dossiers** : boutons de dossier sur une ligne (ils se repliaient lettre par lettre).
- **Dossier d'une mission** : `mission<ID>.yaml` (données + réglages du studio + dates et historique), `summary<ID>.md`,
  `cartes/` (PNG du studio), `recu/` (textes reçus horodatés), `versions/` (YAML remplacés). Réimport : comparaison des
  données — identique (rien remplacé) ou nouvelle version (ancienne gardée, différences listées, réglages du studio
  repris). Générateur et studio : « Enregistrer dans le dossier » ; cartes générées rangées dans `cartes/`.
- **Registre : fichiers de la mission** — YAML, Markdown lisible, vignettes des cartes, versions (différences), textes
  reçus, PDF à la demande (générateur, cartes du dossier chargées), Modifier ; état complète / partielle / sans cartes.
- **Exercices : organisation, chiffons, chronologie** (`shared/mission_exercise.js`, toutes familles) — mission
  d'organisation `…Z` de l'opération (`I-001Z`, `M-016Z`…) : brief général, heure H commune, participants et leur
  décollage (H±n), chiffons joués ou seulement dessinés (route, départ, consignes), chronologie de messages radio et
  de plis scellés (à H+n ou au passage d'un point par un participant, émetteur, destinataires, pistes révélées) ;
  chaque destinataire ne reçoit que ce qui lui est adressé. Ancien format (`tracks`, `injects`, `phases`) toujours lu
  et repris à la création de l'organisation. Exercice d'essai : opération I-001 « ŒIL DE SOLOGNE » (I-001Z).
- **Générateur réorganisé** — bloc **Opération** en tête (missions, décollages, organisation, passage de l'une à
  l'autre), mode organisation sur la Z (brief général, exercice, « Ce que reçoit chacun »), bloc **Documents** : brief
  de l'équipage avec ses plis (une page chacun), dossier organisation, fiches des chiffons joués, tous les documents
  de l'exercice (un PDF par destinataire), exports de données.
- **Studio : cartes par destinataire** — organisation (toutes les pistes et les routes des participants), chiffon (sa
  route, son départ), équipage (pistes connues après chaque message ou pli) ; « + Cartes d'exercice » selon la mission.
- **Registre** — missions d'organisation repérées, fiche : membres de l'opération, résumé de l'exercice, « Ouvrir
  l'opération » (générateur ou studio, en un lot) ; en-tête du tableau fixe au défilement, tableau compact (type et
  sous-type, équipes et types réunis, textes longs coupés, complets au survol).
- **Prompt** : mission d'organisation `missionNNZ.yaml` / `summaryNNZ.md` (§ 3, § 4 bis), `operation.organisation`,
  règles de choix (exercice, chiffon joué ou non) ; plus de `tracks` / `injects` dans les missions des équipes.
- **Studio : sommets OSM sans coordonnées** (chemins renvoyés par Overpass) ignorés — ils interrompaient le rendu.
- **Mission reçue → registre et dossier** : une mission chargée ou collée dans le générateur est inscrite au registre
  (commande rapprochée) et rangée dans `data/missions/<lettre>_<FAMILLE>/<identifiant>/` si le dossier est autorisé
  (sinon bouton « Ranger dans le dossier des missions… »).
- **Commande : aéronefs imposés respectés** — chaque aéronef choisi part avec son désignateur OACI en tête et la
  mention (IMPOSÉ) ; le prompt en fait une contrainte stricte (prime sur les listes d'unités et d'aéronefs, la mission
  s'adapte à l'appareil, jamais l'inverse) et la vérifie dans le bloc VALIDATION ; flotte DEFA proposée « type OACI
  variante — indicatif ».
- **Studio : tracé carte par carte** — sans tracé, cheminement (carte brief), route probable avec retours possibles
  et durée (carte organisation), ou les deux ; gardé dans le YAML (`maps[].trace`). Profil vertical : « ↺ Route
  probable » reprend la route probable comme cheminement.
- **Durée estimée et route probable** (`shared/mission_estimate.js`) : dans le générateur (bloc « Durée estimée »)
  et le registre (colonne, fiche) — route probable jusqu'au retour base, vitesses et varios du type (planificateur,
  fiche APD, valeurs types), temps sur place, phases aller / sur zone / retour, options de retour (hôpital selon
  l'état du patient…), briefs successifs ; comparaison avec les CR de la mission (écart par vol et par phase) et,
  dans le CR, « vol estimé — ce vol (+x %) » ; route affichable ou non (croquis, tronçons).
- **Prompt du générateur** : `cruise_speed_kt`, `cruise_level`, `time_on_task_min`, `route_order` (route probable),
  `return_options`, `phases` (briefs successifs B, C… : déclenchement « 10 min après RDV-1 », message reçu, brief,
  suite de la route ; section « ## Partie B » du Markdown), `timing` (durées annoncées) ; retour base obligatoire.
  Brief PDF : une page par partie (« pli à remettre »).
- **Registre ⇄ CR** : fiche d'une mission avec tous ses CR (liens vers chaque CR), colonne « CR » (nombre de vols),
  « Nouveau CR (vol n) » pour les missions récurrentes ; dans le CR, lien « voir la mission dans le registre » sous le
  champ Mission. Le registre retient la mission affichée et accepte `?mission=M-016` ; le générateur et le studio
  ouverts depuis le registre ont un lien « ← Registre (M-016) ».
- **Numérotation unifiée missions / CR, avec tiret** — mission : lettre de famille + tiret + 3 chiffres (+ équipe),
  `M-016`, `S-002A` (écritures sans tiret acceptées). CR : dans le CR, on saisit la mission volée et le n° de CR est
  calculé (lecture seule) — `CRM-016-1`, `CRM-016-2` si la mission est rejouée ; CR sans mission : `CRM-A01-0` …
  `CRM-A99-0`, puis `CRM-B01-0`. « Créer le CR » depuis le registre reprend la mission et l'essai suivant ; statut
  « CR fait » d'après le n° de CR. Migrations : `tools/dash_mission_ids.py` (missions, dossiers et fichiers :
  `M001/missionM001.yaml` → `M-001/missionM-001.yaml`), `tools/renumber_reports.py` (CR : HEMS-014 → `CRM-A14-0`,
  ancien n° dans `metadata.formerMissionId`).
- **Commande ChatGPT unifiée** (`shared/mission_order.js`, `MissionOrder`) : le générateur de brief (« Créer une
  mission avec ChatGPT ») et le registre (« Commander une mission ») montent le même bloc — mêmes paramètres (sous-type,
  identifiant calculé, aéronef par équipe, rendez-vous, équipes au sol, ravitaillement désormais aussi dans le
  générateur), même prompt, réglages partagés ; une commande passée depuis le générateur est inscrite au registre.
- **Registre des missions : « Nettoyer le registre »** — retire les missions « fichier absent » restées après la
  renumérotation (relecture du dossier d'abord, confirmation) ; statut, notes, date de vol, commande et CR reportés sur
  la mission renumérotée (`former_id`, sinon titre + type + lettre d'équipe). `mission.former_id` lu dans le registre.
- **Paramètres › Maintenance › Caches** (nouveau bloc) : état et purge des caches reconstructibles — aérodromes
  utilisés (`missionAirports:v1`), base mondiale des aérodromes (purge du CDN jsDelivr puis rechargement), base SIA
  analysée, contrôle des mises à jour, cache HTTP des fichiers de l'application (« Recharger sans cache ») ; « Tout
  purger et recharger ». Aucune donnée utilisateur touchée. Adresse de la base mondiale réglable (source `airports`).

## [3.1.0] — 2026-09-28

Missions renumérotées par famille, base SIA factorisée et mise à jour SIA guidée, studio et designs retouchés.

### Missions

- **Numérotation des missions** : lettre de famille + numéro sur 3 chiffres, compté par famille (+ lettre d'équipe) —
  « M016 », « S002A ». Lettres : M HEMS/MEDEVAC, H HADR, F FIRE, S SAR, T AIRLIFT, R AAR, P AIRBORNE, N MARITIME,
  I ISR, L LE, C COMMAND, O SOF, V FI, G SURVEY, X SPECIAL ; `mission.series` = rang de la série dans sa famille.
  Prompt du générateur : `PROCHAINS_NUMEROS` (auto, rempli d'après le registre, `SiaMission.nextNumbering()` /
  `numberingTable()`) ; registre : série numérique et identifiant calculé. Fichiers missionM016.yaml /
  summaryM016.md… Rangement : `data/missions/<lettre>_<FAMILLE>/<identifiant>/`. Outils :
  `tools/renumber_missions.py` (ancien identifiant gardé dans `mission.former_id`, table
  `data/missions/RENUMEROTATION.md`), `tools/reletter_missions.py` (migration des identifiants à lettre de série),
  `tools/import_pdf_missions.py` (import de dossiers PDF et ZIP de cartes ; YAML et résumé reconstruits au besoin).
- **Registre des missions, commande** : une ligne par équipe en vol (A, B, C…) ; vide = automatique ; complétion par
  les types courants et les appareils de la flotte DEFA (indicatif) ; un même type peut servir à plusieurs équipes.
- **Correspondance des indicatifs** : une nouvelle ligne propose tous les organismes connus (et plus seulement SAMU).

### Studio SIA

- **Studio, points tournants** : rouge et libellés de 11 pt par défaut ; nouveau sélecteur de couleur de remplissage
  des points (à côté de la taille), en plus de celui des libellés et du contour. Profils d'affichage enregistrés avec
  les anciens réglages par défaut (7 pt, gris foncé) passés aux nouveaux ; réglages personnalisés conservés.
- **Studio, profil vertical** : les deux cases (image `profil_vertical.png` dans les sorties, cheminement sur les
  cartes) sont cochées par défaut et ne se recouvrent plus (une ligne chacune) ; champ du niveau de croisière pleine
  largeur.

### Base et mise à jour SIA

- **Base SIA factorisée** (`shared/sia_base.js`, `SiaBase`) : lecture du dossier SIA, parseurs (AIXM 4.5, XML_SIA,
  obstacles, villes, mora.csv), cache IndexedDB (lecture, écriture, mise à jour, purge), résumé `siaBaseInfo:v1` et base
  précédente (`siaBaseInfo:prev`, gardée à chaque nouvelle lecture), grille MORA (calcul complet et recalcul simple) :
  un seul code pour le studio et Maintenance (fin des copies dans `map_parser.html` et `airac.js`). **Bloc commun**
  « Base de données SIA » (dossier, Relire, Purger, état, fichiers) monté dans le studio et à l'étape 4 de la mise à
  jour SIA : la relecture se fait sur place, sans passer par le studio. Étape 6 : calcul MORA complet ajouté à côté du
  recalcul simple.
- **Mise à jour SIA pas à pas clarifiée** (Paramètres › Maintenance) : étapes renommées, consigne « À faire » par étape
  tant qu'elle n'est pas faite ; étape 4 « Ouvrir le studio et relire » ouvre le bloc « Base de données SIA » du studio,
  qui relit une seule fois le dossier, affiche « ✓ Base chargée et mémorisée (AIRAC …) » et un bouton « Retour à la
  mise à jour » (étape 5) ; au retour, les étapes 4 à 6 se recalculent seules (plus de bouton « Studio relu :
  comparer ») ; étape 5 sans base précédente : « rien à comparer ». Purge du cache rangée sous « En cas de problème »,
  avec son message effacé à la relecture suivante. Studio : plus d'invite d'autorisation en pleine relecture (fond de
  carte), plus de double relecture à l'ouverture.
- **Mise à jour SIA** : étapes 5 et 6 acquittables (« Vu, c'est fait », mémorisé pour la base en cours) ; contrôle de
  cohérence clarifié (registre des missions vide dans ce navigateur → lien vers le Registre ; performances : APD et
  profils du planificateur, seuls les types sans aucune performance sont signalés) ; plus de débordement à droite
  (pastilles et longs textes coupés, colonnes rétrécissables).
- **Relecture SIA observable** : jauge d'avancement (octets lus, étape, temps écoulé), bouton Annuler, alerte après
  15 s sans avancement (onglet en arrière-plan, fichier en cours de téléchargement par le client de synchronisation,
  autre onglet), durée de chaque étape à la fin, journal dans la console (`[SiaBase]`) ; lecture en flux, pauses
  d'affichage non ralenties en arrière-plan ; garde-fou si la base du navigateur (IndexedDB) ne répond pas.

### Designs et framework

- **Designs à matières** : plus de fonds blancs dans le générateur complet de mission (rubriques, éléments de liste,
  cartes du dossier, badges), les CR FIRE / HEMS MEDEVAC (encadré, indicateurs, liens-boutons) et le registre des
  missions (bouton de fichier) — habillés comme les cartes et boutons du design (Durci, Carnet de vol, Cabinet, Aqua).
  Emblème DEFA de l'en-tête (Carnet de vol, Cabinet) ramené dans le bandeau (marge haute et basse). Aqua : en-tête et
  pied de page pleine largeur à angles droits (les arrondis restent aux blocs, cartes et boutons).
- **Bandeaux Carnet de vol, Cabinet, Durci** : le panneau de la page reste à l'intérieur du cadre cousu (marges
  latérales) et l'en-tête devient une plaque vissée en retrait (plus de coins ni de vis contre le bord de la fenêtre,
  plus de bande vide au-dessus) ; emblème du Carnet de vol détouré (médaillon ailé seul) ; avion des plaques de titre
  gravé sur fond transparent (plus de vignette encadrée).
- **Ancres de bloc** : `page.html#id-du-bloc` affiche le bloc (même masqué), le fait défiler et le signale
  (`AppFramework.reveal(id)`).
- **Versions de cache** : `tools/bump_versions.py` refuse un argument qui n'est pas une version (un `--help` avait
  écrit `?v=--help` dans les pages, corrigé).

## [3.0.0] — 2026-09-28

Version majeure : **l'application et les données sont séparées**, arborescence de l'application réorganisée.
Migration d'une installation v2 : INSTALL.md § 2 (`tools/migrate_v3.py`).

- **Espaces aériens lus directement dans `XML_SIA_<date>.xml`** (SIV, RMZ/TMZ, AP, FIR… ; arcs densifiés par le SIA) :
  le fichier dérivé `sia-airspaces-<date>.xml`, qu'aucune source officielle ne publie, n'est plus demandé (un nouveau
  cycle n'est plus signalé « incomplet »). Lecture sans DOM (≈ 40 ms), résultat dans la base mémorisée (version 12 :
  une relecture du dossier). Avertissement quand la base mémorisée est d'un cycle périmé ; **purge du cache** SIA
  (studio › Base de données SIA, et Paramètres › Maintenance › Mise à jour SIA).
- **Données dans un dépôt à part** (privé : <https://framagit.org/defa-virtual/missions-defa>), cloné dans `data/` à la
  racine de l'application et ignoré par git : `references/` (flotte DEFA, référence DEFA, indicatifs, corrections OACI),
  `cr/` (registre unique, registres historiques FIRE / HEMS, CR, packs FMS GAAR), `missions/`, `sia/` (MORA, axes
  ENR 5.7 ; XML AIRAC hors git), `planner/`, `local/` (hors git). Chargement par `shared/data_files.js` (`data/`, sinon
  les exemples fictifs d'`examples/`). Modèle du dépôt de données : `tools/data_template/`.
- **Arborescence de l'application** sans espaces : `apps/cr/` (ex-`CR DEFA/`), `apps/settings/` (Paramétrage,
  Apparence, Maintenance), `apps/sia/` (ex-`SIA XML/`, fond et villes dans `apps/sia/assets/`), `apps/planner/`,
  `apps/landing/` (ex-`LandingPerformanceDashboard/`) ; page d'accueil `index.html`.
- **Un seul dossier à autoriser** : ☰ › Paramètres › Maintenance › Sources et dossiers › **Dossier des données** (`data/`) — registre,
  missions et SIA en sont déduits (les anciens dossiers mémorisés « CR DEFA », « Missions », « SIA XML » sont oubliés
  une fois).
- Outils : `update_fleet.py`, `defa_reference.py`, `update_aircraft_db.py` (corrections), Paramétrage (« Enregistrer
  dans le dépôt ») écrivent dans `data/references/` ; `tools/migrate_v3.py` range les données d'une installation v2.
- Studio : fond de carte et villes pris dans l'application quand le dossier SIA ne les contient pas.
- **Maintenance intégrée à Paramètres** : rubrique « Maintenance » du menu latéral de Paramètres, une entrée par bloc
  (mises à jour, sources et dossiers, versions, dépendances, mise à jour SIA, sauvegarde totale, journal) ; plus de
  bouton « Maintenance » séparé (menu ☰, barre latérale) ; `apps/settings/maintenance.html` redirige vers
  `parametrage.html?m=<bloc>` ; styles dans `shared/maintenance.css`.
- **Git LFS** pour tous les binaires (`.gitattributes` : images, PDF, archives, polices, médias ; mêmes règles dans le
  modèle du dépôt de données) ; les 289 images existantes converties en pointeurs LFS (sans réécrire l'historique) ;
  fins de ligne normalisées (`* text=auto`). Garde-fou `tools/check_binaries.py` (crochet pre-commit : `--install`),
  vérifié par `update_suite.py doctor`.
- `.gitignore` recentré (plus de règles globales `*.json`, `*.csv`, `*.yaml`) ; `VERSION.json` abandonné.

- **Paramètres › Maintenance** (nouvelle page, `CR DEFA/maintenance.html`, bouton « Maintenance » du menu ☰ et de la
  barre latérale) :
  - **Mises à jour** : canal `master` (stable) ou `develop` (early bird) ; contrôle manuel, automatique (à chaque
    ouverture, chaque jour, chaque semaine, chaque cycle AIRAC, chaque mois) ou désactivé ; dernière version du canal
    lue sur framagit (API publique) ; pastille « Mise à jour » dans l'en-tête de toutes les pages ; état git local
    (branche, commit, suivi origin, dernier fetch, canal mémorisé, packs orphelins, journal des mises à jour).
    Application par **`tools/update_suite.py`** (`status`, `channel`, `update`, `doctor`) : refus si des fichiers
    suivis sont modifiés, fast-forward seulement, journal `.git/suite-update.log`.
  - **Versions et synchronisations** : suite, cache des scripts, git, canal distant, AIRAC en vigueur / suivant, base du
    studio, dossier SIA, `mora.csv`, axes ENR 5.7, types OACI, performances APD, flotte et référence DEFA, indicatifs,
    OFP SimBrief, profils du planificateur, registres, journal d'atterrissages, données locales, sauvegarde totale.
  - **Références et dépendances** : pour chaque référence, traçage, processus de mise à jour, dépendants et contrôle de
    cohérence (cycles SIA, MORA, ENR 5.7, types de flotte avec alias, performances, prompt des missions, VERSION.json).
  - **Mise à jour SIA pas à pas** avec mode d'emploi : cycle (liens vers la page du SIA), dossier (inventaire par
    cycle, fichiers manquants, extraction du ZIP d'export du SIA), archivage des anciens cycles (`_archives/`),
    relecture par le studio (`map_parser.html?relire=1`), différences entre les deux bases (espaces ajoutés / retirés,
    aérodromes, obstacles), recalculs simples (grille MORA avec les obstacles du nouveau cycle, flotte, performances,
    profils, terrains des missions).
  - **Sauvegarde totale** : données du navigateur et fichiers connus des dossiers autorisés (registres des CR, missions,
    profils de performance, configuration du dépôt, CSV d'atterrissage, données SIA, dossiers ajoutés) en une archive
    ZIP avec manifeste (tailles, dates, SHA-256) ; « Changements depuis » ; **rechargement** d'une sauvegarde totale
    avec comparaison fichier par fichier (identique, absent, plus ancien / plus récent sur le disque), copie des fichiers
    remplacés dans `_avant_restauration/`.
  - **Journal des sauvegardes et rechargements** : chaque restauration des données locales (☰ › Données locales),
    sauvegarde totale, rechargement, extraction SIA, archivage, recalcul MORA — date, origine, clés ajoutées / mises à jour.
- **Registre des missions générées** (`SIA XML/mission_registry.html`, menu ☰ « Registre des missions (SIA) », barre
  latérale « Registre ») : inventaire des séries du dossier `Missions/` (YAML + Markdown) ; choix par type, sous-type,
  avec ou sans rendez-vous, nombre et types d'équipes engagées, ravitaillement en vol, théâtre, statut ; tirage au
  sort ; ouverture dans le générateur, le studio ou un nouveau CR ; statuts (commandée, générée, planifiée, volée,
  CR fait — repris du registre des CR —, abandonnée), date de vol, notes ; export CSV ; `Missions/mission_registry.yaml`.
  **Commander une mission** : type, sous-type, théâtre(s), série, équipes DEFA en vol, types d'équipes, rendez-vous,
  équipes au sol, ravitaillement → prompt réglé copié et ChatGPT ouvert ; la commande est rapprochée de la mission
  générée à la relecture du dossier.
- **Prompt des missions** : paramètres `SOUS_TYPE`, `RENDEZ_VOUS`, `TYPES_EQUIPES`, `ÉQUIPES_SOL`, `RAVITAILLEMENT`.
- **Studio cartographique** : un seul cycle AIRAC lu (le plus récent du dossier ; les autres sont signalés au lieu
  d'être mélangés) ; cycle mémorisé dans la base (`airac`) et résumé `siaBaseInfo:v1` ; cycle des obstacles tracé
  dans `mora.csv` ; `?relire=1` relit le dossier mémorisé.
- **Framework** : `shared/suite_update.js` (canal, contrôle, pastilles), `shared/airac.js` (cycles AIRAC, dossier SIA,
  base du studio, recalcul MORA), `shared/zip_store.js` (ZIP écrits / lus sans dépendance), dossier mémorisé
  `__missions` (FileAccess), journal `LocalStore.journal()` / `logEvent()`, `LocalStore.toText()`.
- **Sources et dossiers** (Paramètres › Maintenance) : tous les dossiers locaux (dépôt, registre des CR, missions, SIA
  XML, **X-Plane** — journaux d'atterrissage, nouveau —, performances, sauvegarde locale) et les **adresses des sources**
  (site DEFA, SIA : bases de données, page d'un cycle AIRAC, eAIP, contours d'espaces ; dépôts de l'application et des
  données) réglés au même endroit. Adresses par défaut dans `repository_tree` (`sources`), surcharge locale
  (`suiteSources:v1`), lues par `RepositoryNav.source(clé)` : liens DEFA (journal des vols, fiches appareils, flotte,
  logo de la barre latérale), pages SIA des cycles, contrôle des mises à jour. La liste « Dossiers paramétrés » de
  Paramétrage y est transférée. Le sélecteur de fichiers du Landing Dashboard s'ouvre dans le dossier X-Plane ; ses
  journaux entrent dans la sauvegarde totale.
- **Paramétrage** : bloc « Apparence » retiré (doublon du bouton du menu ☰ et de la barre latérale, qui ouvrent la
  même fenêtre ; `shared/appearance_admin.js` supprimé).
- **Corrigé** : `tools/bump_versions.py` re-versionne aussi les scripts de `SIA XML/` (`mission_store.js`,
  `sia_i18n.js`…). Manuel : la version de la suite vient de `repository_tree` (`VERSION.json`, ignoré et périmé,
  n'est lu par rien).
- **Audit** du 28/09/2026 (entrées SIA, installation, git, dépendances) : [docs/AUDIT_2026-09-28.md](technique/AUDIT_2026-09-28.md).

## [2.5.0] — 2026-09-27

- **Planificateur : fin de montée à Vy** : quand la vitesse de montée du profil ne monte plus (haut de la montée), le
  modèle finit la montée à Vy (meilleur vario), comme pour le calcul du plafond, au lieu de refuser le niveau. Supprime
  la zone « inaccessible » artificielle sous le plafond (DC-3 : montée à 135 kt épuisée vers le FL130, plafond FL155 à
  Vy ; tous les niveaux jusqu'au plafond sont désormais utilisables).
- **Planificateur : bloc Résultat épinglable** : bouton « Épingler » dans ses outils ; épinglé, le bloc reste déplié
  quand il suit la page (il se repliait dès qu'il se collait sous l'en-tête). Choix mémorisé dans le navigateur.
- **Planificateur, hélices : plus de niveaux refusés à tort sous le plafond** : quand la puissance de croisière du
  profil ne tient plus le palier (air moins dense), le modèle ajoute la puissance nécessaire et vole à la vitesse de
  puissance minimale (croisière « limitée ») au lieu de refuser le niveau ; refus seulement si même la pleine puissance
  ne tient pas le palier. Supprime la zone « inaccessible — puissance insuffisante » artificielle (un avion qui monte au
  FL123 tient le FL095).
- **Planificateur : moteurs à pistons suralimentés** : champ de profil « Altitude de rétablissement (ft) » (Croisière) ;
  pleine puissance jusqu'à cette altitude, puis décroissance d'un moteur atmosphérique rapportée à ce niveau (DC-3,
  R-1830 : environ 7 500 ft). Sans valeur : moteur atmosphérique, comme avant (puissance en baisse dès le sol).
- **Planificateur : oxygène** : champ de profil « Cabine pressurisée » (non renseigné : piston non pressurisé,
  réacteur et turbopropulseur pressurisés) ; au-dessus de l'altitude sans oxygène (Paramétrage › Planificateur
  carburant, 10 000 ft par défaut), zone « oxygène requis » sur le graphique d'altitude optimale (information, le
  calcul n'est pas limité).
- **Planificateur : zones expliquées sous les graphiques** (altitude optimale, TAS selon le niveau) : « inaccessible —
  trajet trop court », « inaccessible — puissance insuffisante », « oxygène requis », zone au-delà du plafond (plafond du
  profil ou calculé par le modèle, vario résiduel) ; zone tracée seulement pour un vrai niveau refusé (plus de double
  colonne « inaccessible » due à l'arrondi du dernier pas). TAS selon le niveau : plus de réapparition des courbes
  au-delà du plafond après un trou.
- **Durci : bandeau radar adaptatif** : le radar prend presque toute la largeur (plaque DEFA et voyant de sauvegarde
  empilés à droite) ; sa hauteur suit la largeur de la page (140 à 230 px) et l'écran est recadré en conséquence
  (rogné en haut et en bas, réticule toujours au tiers de la hauteur, jamais de vide).
## [2.4.0] — 2026-09-27

- **Durci : bandeau radar recadré** comme la maquette (banner.cropped) : plus large que haut (1402 × 304), bas de
  l'écran visible (réticule en haut, carte en médaillon et échelle en bas) ; plot de la Corse déplacé au repère 010
  de l'échelle, à la même hauteur ; un plot d'île passé en mer.
- **Planificateur : cause réelle des niveaux non tenables** : la zone sous le plafond indique « trajet trop court »
  seulement quand c'est le cas ; sinon « croisière non tenable » (puissance insuffisante pour la vitesse de croisière du
  profil, cas d'un DC-3 à FL250) ou « niveaux non tenables », avec l'explication au survol.
- **Durci : nouveau bandeau radar** (écran tactique, carte, réticule, cible rouge) : balayage recentré sur le réticule
  et étendu jusqu'à la cible, plots sur les îles et la cible ; radar sur toute la largeur restante, rogné en haut et
  en bas (centré) ; plaque DEFA et voyant de sauvegarde à la taille de leur contenu, centrés.
- **Planificateur, altitude optimale : plus de « trou » dans les courbes** : quand le trajet est trop court pour monter
  plus haut, les courbes s'arrêtent au dernier niveau tenable et ne réapparaissent plus au-delà du plafond ; zone
  « trajet trop court » entre ce niveau et le plafond (explication au survol).
- **Planificateur : explication au survol des pastilles** (plus rapide, carburant minimal à la vitesse du profil,
  carburant minimal en croisière économique, niveau du plan) avec niveau, carburant et durée.
- **Barre d'état du planificateur et barre d'analyse de Landing** décalées de la largeur de la barre latérale (leur
  texte passait dessous).
- **Planificateur : graphiques et curseurs en matière** : graphiques du devis carburant en écran d'instrument (Cabinet et
  Carnet de vol : panneau bleu marine serti de laiton, quadrillage gravé or ; Durci : écran phosphore vert à balayage ;
  Aqua : verre clair ou sombre) ; couleurs des courbes selon la palette des graphiques (Apparence) ; curseurs verticaux
  en commandes (bouton de laiton moleté, levier d'acier, bulle de gel) ; redessinés au changement de design.
- **Durci : voyant « modifications à sauvegarder » actif** : un clic sauvegarde comme le bouton de l'en-tête (dossier de
  sauvegarde, sinon choix du dossier, sinon téléchargement).
- **Durci : bandeau radar** : largeur de la colonne, hauteur plafonnée ; l'écran est rogné en haut et en bas, centré
  (le balayage reste centré sur la cible).
- **CR DEFA dans les designs à matières** : boutons et menus de l'en-tête (Ajouter au registre, Analyse / import,
  Suivi réseau, Mission, Registre des missions, changement de mission) habillés comme les boutons du design, action
  principale à la couleur d'accent ; fenêtres surgissantes sur la surface du design (parchemin, acier sombre, verre)
  avec des entrées lisibles (elles étaient en texte sombre sur boutons sombres) ; cartes des calculs automatiques,
  fiches d'appareil, encadrés plan de vol et météo, tableaux habillés ; aperçu du rapport en feuille de papier.
- **CR DEFA : menus de droite de la barre** (Mission, Registre) ouverts vers la gauche : ils ne sortent plus de l'écran.
- **Éditeur de missions (Durci)** : fonds d'« Identification » et d'« Importer » étendus à tout le bloc (le mode
  « side » y montrait les bords du panneau de l'image au milieu du bloc).
- **Durci : série de fonds en panneaux olive rivetés** : reporting (vue aérienne, pictogrammes des missions, ailes au
  laurier validé, chevrons, plaque de plans d'aéronefs, pictogrammes des capacités, cadran soleil et lune, pupitre
  radio, étoile) ; aussi hors reporting : studio cartographique (carte et écran radar sur « Cartes »), éditeur de
  missions (insigne sur « Identification », étagère d'équipement sur « Importer »), planificateur (« Résultat »).
  Anciens fonds Durci retirés.
- **Fonds illustrés : mode « side »** pour les blocs larges : image à la hauteur du bloc, calée à droite, fondue vers
  la gauche (le texte reste sur la matière unie).
- **Cabinet : cadre de cuir plus réaliste** : bordure plus large, bord arrondi (lumière en haut et à gauche, ombre en bas
  et à droite), parchemin serti sous le cuir ; couture de nouveau visible partout (reporting compris), dessinée dans le
  cuir par le contour du bloc lui-même (jamais coupé par le défilement du bloc) ; pas de couture sur l'aluminium du
  Carnet de vol.
- **Blocs du reporting qui changeaient de taille en boucle** (Cabinet, Carnet de vol, décor complet, fenêtres très
  larges, barres de défilement classiques) : la couture et les vis des blocs étaient dessinées par un pseudo-élément
  qui dépassait de 4 px ; dans les blocs à défilement (`.section`, `overflow:auto`), ce dépassement faisait apparaître
  une barre de défilement, qui disparaissait au calcul suivant. Pseudo-élément ramené dans le bloc (le contour, qui ne
  compte pas dans le défilement, reste au même endroit).
- **Barres de défilement qui clignotaient** (designs à matières, décor complet) : place de la barre verticale toujours
  réservée (`scrollbar-gutter: stable`), décors des marges jamais au-delà du bas de la page ni à l'origine d'un
  défilement horizontal. La boucle : barre qui apparaît → marge plus étroite → décors retirés → page plus courte →
  barre qui disparaît → décors remis…
- **Cabinet : série marine** pour le reporting (neuf fonds) : archipel et porte-avions (terrains de départ), barre à
  roue (par famille), ancre aux lauriers (résultats), flotte et phare (séries), frégate et hélicoptère (types
  d'appareil), radar, grue et dôme (capacités), soleil et lune (jour / nuit), satellites et proue (réseau), chenal
  balisé (contexte). Cabinet et Carnet de vol ont chacun leur jeu (la piste des terrains de départ de Carnet de vol
  est rangée dans son propre dossier).
- **Carnet de vol : jeu de fonds propre** pour le reporting (cuir marine, tracés or) : capacités (hélicoptères et
  montagnes), résultats (rose des vents sur mappemonde), types d'appareil (biplan et globe), séries (globes et routes),
  par famille (montage aviation), jour / nuit (piste de nuit) ; terrains de départ inchangés (piste de Cabinet).
  Nouveaux emplacements de fonds sur les blocs par famille, séries, jour / nuit, réseau et contexte.
- **Outils de bloc** (designs à matières) : icônes « déplacer » et « masquer » à la même taille (24 px, boutons de
  30 px) ; « déplacer » était plus petit et plus large.
- **Fonds illustrés du reporting : Durci, Aqua, Carnet de vol** : Durci en panneaux olive rivetés (courbes de niveau,
  plans d'avions) et métal bronze aux tracés de navigation ; Aqua en eau et verre, cadrée différemment sur chaque
  bloc ; Carnet de vol : résultats sur cuir et mappemonde aux avions. Chaque fond peut préciser son image, son cadrage et
  son opacité (`design_deco.js`, `BG`) ; opacité par défaut ajustée par design.
- **Aqua, ton sombre** : icône « déplacer » des blocs de nouveau visible (le dégradé des boutons la recouvrait).
- **Barre latérale : logo DEFA** en haut, décliné selon le design (Cabinet : or sur cuir marine ; Carnet de vol :
  acier riveté ; Durci : plaque militaire ; Aqua : chrome ; autres designs : aplat bleu ; variantes bois et laiton,
  brillant et au trait conservées dans `shared/icons/defa/`) ; un clic ouvre le site de la flotte DEFA Virtual
  (flotte.defa-virtual.fr, nouvel onglet).
- **Fonds illustrés du reporting** (Cabinet, Carnet de vol) : terrains de départ (piste au pied des montagnes),
  capacités (relief et réticule), résultats (mappemonde et rose des vents), types d'appareil (globe), bleu marine et
  or, en mode « cover » atténué.
- **Graphiques : palette et style au choix** (Apparence › Graphiques, comme les icônes) : palettes Automatique
  (selon le design), Vives (couleurs des pages), Ardoise, Laiton et cuir, Kaki et olive ; styles Automatique, Aplats,
  Relief (`html[data-chart-palette]`, `html[data-chart-style]`, règles du relief dans `designs.css` : utilisables dans
  tous les designs).
- **Changement de design, de palette ou de couleurs appliqué en direct** : les reportings (global, par famille) et le
  rapport de mission se redessinent (événement `repository-design-change`), sans recharger la page.
- **Fonds illustrés des blocs** (designs à matières) : emplacements prêts sur les blocs du reporting (terrains de
  départ, capacités, résultats, types d'appareil : `data-deco-bg`), image `shared/deco/<design>/bg-<clé>.webp` sous le
  contenu, fondue vers la droite et le bas ; modes « anchor » (taille d'origine, s'étend vers la droite et le bas) ou
  « cover » (redimensionnée), déclarés dans `design_deco.js` (`BG`).
- **Durci : icônes de la barre latérale** découpées dans la planche haute définition (cible, carte, compte rendu,
  graphique, carburant, avion, palette, réglages, aide), réutilisées pour les mêmes icônes partout.
- **Plaques de titre** : toujours sur la première ligne, à côté de l'icône (plus de passage sous l'icône) ; retour à la
  ligne entre les mots seulement.
- **Fenêtre Apparence** : blocs habillés par le design après chaque réglage (et non plus seulement à l'ouverture) ;
  en-tête au-dessus des outils de bloc (bouton de fermeture toujours visible).
- **Graphiques dans les designs à matières** : couleurs ramenées à la famille du design, peu saturées
  (`RepositoryNav.chartColor` : Cabinet et Carnet de vol en laiton, beige, bleu acier, cuivre, lie-de-vin, sauge, taupe ;
  Durci en kaki, olive, moutarde, rouille, gris-vert, ardoise ; plus de rose vif) : graphiques, indicateurs, pastilles
  de résultat, familles. Style en relief au lieu des aplats : barres cylindriques, anneaux ombrés, rainures gravées,
  repères gravés, ligne de base en laiton, chiffres dans la police du design. Standard, Aero, Ops, Console, Aqua :
  couleurs inchangées.
- **En-têtes de bloc (designs au trait : Standard, Aero…)** : icône, titre et sous-titre, outils centrés verticalement
  (l'icône n'est plus collée en haut à gauche, ni les outils en haut à droite).
- **Cadran Aqua** : ouverture ronde recentrée (la planche Aqua n'est pas étirée : plaque plus haute que large),
  sans correction d'ovale.
- **Aqua : plus de boutons plats** : listes déroulantes, segments, vignettes et rangées de l'Apparence en verre bombé
  (clair ou sombre), état choisi en gel de la couleur Aqua.
- **Apparence, cartes de couleurs** : en-têtes lisibles quelle que soit la page hôte (règle `header` du planificateur
  qui les repeignait en noir) ; pastilles WCAG non repeintes par les encadrés `.ok` / `.err` des tons sombres.
- **Outils de bloc (Déplacer, Masquer)** dans les designs à matières : icônes seules, sans bouton ni libellé
  (libellé en infobulle et pour les lecteurs d'écran), toujours dans le coin haut droit du bloc, même quand la plaque
  de titre passe sur deux lignes.
- **Plaques de titre** (Cabinet, Carnet de vol, Durci) : texte plus petit ; dans les blocs étroits (grilles 3 × 3 du
  reporting), les mots restent entiers (plus de texte vertical ni d'artefacts).
- **Aqua : couleur au choix** (Apparence › Design) : bleu par défaut, turquoise, vert, graphite, violet, orange, rouge,
  rose, ou couleur de chaque application ; boutons gel et icônes suivent (contraste WCAG ≥ 4,5:1 avec le texte blanc),
  les icônes d'état gardent leurs couleurs. Icônes Gel uniformisées sur une seule teinte de base (bleu),
  `tools/icons_skeuo_generator.html?set=gel`.
- **Cadrans** : lunettes non étirées ; les planches d'origine sont étirées d'environ 3,5 % en hauteur, ouverture
  relevée (ellipse) et découpe ramenée au carré (`tools/gauges_from_sheets.html`) : plus de cadran visible en haut.
- **Décors entre blocs** : posés seulement entre deux blocs voisins immédiats, l'un sous l'autre dans la même
  colonne ; plus de décor au milieu d'une grille de graphiques (reporting, « Capacités employées ») quand un
  autre élément s'intercale ; décors recalculés quand la mise en page change après le chargement.
- **Durci** : texte des plaques de titre de bloc réduit (≈ 0,98 rem, interlettrage resserré).
- **Radars** (Durci) : front du balayage net, traînée dégradée derrière (sens de rotation) ; plots éteints qui ne
  s'allument qu'au passage du front (délai calculé selon leur angle), puis s'estompent.
- **Contrastes WCAG dans les designs à matières** (studio en Durci notamment) : pastilles de code (`code`, `kbd`,
  `samp`) accordées à la matière ; encadrés d'état des pages (`.warn` jaune pâle, `.ok` vert et `.err` rouge foncés)
  lisibles sur les matières sombres.
- **Barre d'action** `repo-actionbar` (framework) : barre collée en bas d'une page, habillée par le design (acier,
  cuir marine, métal brossé) ; appliquée à la barre « Générer les cartes et le ZIP » du studio.
- **Icônes des panneaux** (CR : calculs, compte rendu) : plus d'icône en double décrochée ni de panneau déformé (la passe
  précoce de `block_icons.js` traitait un futur bloc comme un élément à icône en ligne).
- **En-têtes de blocs étroits** (designs à matières) : la plaque de titre ne dépasse plus sa colonne, les boutons ↕ /
  Masquer restent visibles et cliquables.
- **Décors entre les blocs** : seulement dans les empilements verticaux (plus dans les grilles, où ils créaient une
  cellule et tombaient sur un titre).
- **Décors** : presse-papiers et boussole redétourés (croissance de région, trous — la pince — rendus transparents,
  seule la plus grande pièce gardée) ; décors placés entre les blocs au-dessus des blocs (z-index), notamment sur la
  page Atterrissages.
- Fenêtre modale Apparence : icônes au trait des rangées d'exemple à leur taille (22 px) quel que soit le CSS de la page.
- **Cadrans** : boîtiers entiers (la découpe rognait les plaques en haut, en bas et sur les côtés) ; séparation
  automatique d'avec les instruments voisins (colonne la moins opaque).
- **Fenêtre modale Apparence** habillée par le design courant : en-tête et blocs du framework (`AppFramework.refresh(racine)`
  monte désormais des blocs dans n'importe quel conteneur), fond de la page du design ; « Tout réinitialiser » et
  « Démonstration » lisibles dans tous les designs.
- **Apparence en fenêtre modale** : le menu ☰, la barre latérale et Paramétrage l'ouvrent au-dessus de la page courante
  (réglages appliqués en direct à cette page ; fermeture par le bouton, Échap ou un clic à côté, on reste sur la page ;
  l'aperçu d'un thème est annulé à la fermeture). La page Apparence reste accessible directement.
- **Boîtiers de cadrans** tirés des planches sur fond transparent (silhouette d'origine exacte : Cabinet, Carnet de vol,
  Durci, Aqua), ouverture ajustée.
- **Boîtiers de cadrans** redécoupés sur leur silhouette (fond et ombres de la planche retirés par croissance de région,
  morceaux d'instruments voisins écartés, bords adoucis) ; ombre recréée sur le contour (contact + portée).
- **En-têtes de blocs** (designs à matières) : icône, plaque de titre et boutons alignés en haut ; en jeu d'icônes
  skeuomorphe, « Masquer / Afficher » et « Déplacer » en images du jeu (chevron haut / bas, déplacer).
- **Planificateur : cadrans réalistes** dans les designs à matières — boîtiers découpés dans les planches de cadrans
  (lunette de laiton pour Cabinet, métal sombre pour Carnet de vol, plaque sombre vissée pour Durci, plaque chromée pour
  Aqua ; vis et bouton de calage ; `tools/gauges_from_sheets.html` mesure l'ouverture et la rend transparente) ; dessous,
  le cadran vivant : fond bombé (bleu nuit pour Aqua), chiffres, graduations et aiguilles crème ombrées, moyeu, reflet
  du verre ; lecture inchangée.
- Barre latérale : groupe Apparence / Paramètres / Menu de nouveau en bas avec les jeux d'icônes skeuomorphes (la marge
  resserrée des séparateurs s'appliquait aussi au séparateur du bas).
## [2.3.0] — 2026-09-26

- **Design « Carnet de vol »** (déclinaison aéronautique de Cabinet, planche dédiée) : blocs cerclés du cadre d'aluminium
  riveté, plan d'avion en filigrane, plaques de titre en aluminium brossé avec silhouette d'avion, emblème à hélice
  ailée, barre latérale en cuir marine ; décors : bandeau du bas (tableau de bord, carte, plan de vol), presse-papier
  « Flight plan » et cadrans (anémomètre, horizon, altimètre) entre les blocs et dans les marges ; jeu d'icônes
  **Avionique** (boutons ronds de métal sombre de la planche, les autres fabriqués dans leur style).
- **Barre latérale, studio cartographique** : icônes décalées (la page n'impose pas `box-sizing` : liens plus larges
  que la barre) → modèle de boîte imposé à la barre ; entrées resserrées en jeu skeuomorphe (tout tient dans 800 px de
  haut), barre de défilement masquée (elle réduisait la largeur des entrées).
- **Barre latérale : icônes skeuomorphes affichées en premier** — images posées dès la construction de la barre
  (téléchargées avec la page, taille réservée), sans attendre le registre d'icônes ni `block_icons.css` ; mises à
  jour au changement de jeu ou de design.
- Icônes skeuomorphes plus grandes dans la barre latérale (50 px) et sur les boutons ; barre latérale de Durci texturée
  (peinture olive assombrie : deux règles de la feuille étaient avalées par un reste de ligne orpheline) ; radar
  de Durci : balayage centré sur la cible de l'image et limité à son cercle.
- **Trois jeux d'icônes skeuomorphes en images**, sélectionnables dans tous les designs : **Laiton** (médaillons),
  **Acier** (plaques vissées), **Gel** (bulles) ; icônes des planches de maquette, les autres (une cinquantaine par
  jeu) fabriquées dans leur style ; l'image remplace le tracé partout (blocs, boutons, barre latérale, zones de dépôt).
  Jeu par défaut : Laiton pour Cabinet, Acier pour Durci, Gel pour Aqua. L'ancien relief « Matière » est retiré.
- **Radar haute définition** dans le pied de page de Durci. Page Apparence : rangées « Selon le design » et des trois
  jeux (vraies images), libellés lisibles dans tous les designs.
- **Jeux d'icônes skeuomorphes tirés des planches** : médaillons de bronze (Cabinet), plaques d'acier vissées (Durci),
  bulles de gel (Aqua), découpés dans les maquettes ; les icônes absentes des planches sont dessinées dans le même
  style (médaillon, plaque, bulle), y compris dans la barre latérale.
- **Décors disséminés** (décor complet, invisibles dans les autres designs) : frise de bureau de la planche Cabinet,
  plaque DEFA, écran radar animé et plaque avion de Durci en pied de page ; presse-papier, plaques « Attention » /
  ailes / DEFA, poignée entre les blocs ; boussole, carte, pochoirs « MISSION » / « DEFA », grille, plaquettes dans les
  marges des grands écrans. Vis cruciformes, punaises de laiton et poignées de la planche à la place des dessins.
- Barres d'état des pages (« Aucune mission chargée ») habillées dans les designs à matières.
- **Textures photographiques** (ambientCG, CC0) : cuir brun et marine, bois verni, parchemin froissé, laiton, acier
  brossé et rayé, peinture écaillée olive / gris-vert / kaki ; relief cuit, reteinte, tuiles WebP ; adresses des
  textures versionnées (plus d'anciennes images en cache).
- **Espacements** : retrait latéral des blocs des designs à matières fixé (22 px ; il tombait à 14 px sur fenêtre
  étroite). **Boutons** : « Démonstration complète » (page Apparence) et « Nouveau compte rendu » (reporting global)
  ne sont plus des liens nus ; les vignettes et sélecteurs de la page Apparence gardent leur dessin (`repo-plain`).
- **Jeu d'icônes « Matière »** (relief : ombre, corps en laiton / acier / gel, trait d'encre ; palette par design),
  choix à part entière sur la page Apparence et jeu par défaut de Cabinet, Durci et Aqua ; médaillons, plaques et
  bulles des icônes de blocs réservés à ce jeu.
- **Aqua sombre** sur les pages à thème sombre (planificateur, Landing) : graphite et verre fumé, graphiques inchangés.
- **Textures plus réalistes** : relief éclairé (grain du cuir, pores du bois, plis du papier, brossage, éclats de
  peinture en creux) ; **illustrations** en décor complet : frise de bureau de Cabinet, radar tournant, plaque DEFA et
  voyants de Durci (`design_deco.js`).
- **Espacements** des blocs, sous-cartes, champs et boutons des designs à matières ; liens d'action en boutons (retour
  au générateur, « Choisir des fichiers »).
- **Réglages** : Apparence et Paramètres en boutons en tête du menu ☰, et en bas de la barre latérale.
- **Designs à matières : Cabinet, Durci, Aqua.** Cabinet (cuir, bois verni, parchemin, laiton gravé, médaillon rose
  des vents ; variante « carte de nuit » sur les thèmes sombres), Durci (carte topographique, peinture olive écaillée,
  acier, plaques kaki, champs noirs, bouton vert à voyant, radar), Aqua (métal brossé, verre dépoli, boutons gel).
  Textures WebP générées (`shared/textures/`, ≈ 140 Ko, chargées seulement avec ces designs), icônes de blocs en
  matière (médaillons, plaques vissées, bulles), emblème d'en-tête, voyant de sauvegarde dans la barre d'état.
  Réglage **Décor** (complet / sobre) sur la page Apparence, sobre par défaut sur les CR, le planificateur et Landing ;
  vignettes des nouveaux designs. Traductions ajoutées : « Exporter tous les PDF », « Dossier d'opération (un PDF) ».
- **Icônes immédiates** : en-têtes de blocs (`app_framework.js`) et icônes (`block_icons.js`) posés dès que le DOM
  est prêt, sans attendre images, polices et cartes (nouvelle passe au chargement complet).
- **Icônes, suite de la migration** : reportings (par famille et global : blocs et boutons d'export / impression /
  dossier), fiches appareil et équipage (blocs du framework), Paramétrage, bandeau d'édition du CR ; nouvelles icônes
  `folder`, `printer`, `clock`, `trash`, `edit`. Emoji remplacés : boutons « maintenant » du CR (📅 / ⏱ → calendrier /
  horloge, icône seule toujours affichée), bouton de sauvegarde (💾). Le bouton de dossier garde son icône quand son
  libellé change (`file_access.js`).
- **Aéro** : arrondis adoucis (blocs 12 px, boutons 8 px au lieu de pastilles, champs 7 px, menus 12 px).
- **Page Apparence** (`CR DEFA/apparence.html`) à la place du bloc de Paramétrage : vignettes des quatre designs
  dessinées dans leur design, jeux d'icônes montrés par épaisseur de trait, barre latérale en trois choix, une carte par
  thème (applications, familles de CR) avec palette de familles, ton, aperçu bandeau / bouton / lien, contrastes WCAG
  et aperçu du thème sur la page ; lien vers la démonstration, réinitialisation. Le menu ☰ « Apparence… » y mène,
  Paramétrage garde un lien.
- **Missions** : plus de numéros 1 / 2 / 3 en tête des blocs du générateur et du studio.
- **Barre latérale immédiate** : construite par `repository_nav.js` dès son exécution, styles dans `repository_nav.css`
  (chargé dans l'en-tête) ; elle paraît avec l'en-tête au lieu d'arriver en dernier, les icônes se posent ensuite dans
  des emplacements de taille fixe (`side_nav.js`). Paramétrage : bouton « Ouvrir la page Apparence ».
- **Icônes et sous-titres de blocs — migration** : CR (les 16 familles : icône et sous-titre des blocs communs, icône par
  défaut des blocs propres aux familles, panneaux de calculs et de compte rendu), Landing, planificateur, générateur de
  mission et studio (blocs numérotés, zones de dépôt de fichiers, boutons à icône) ; sous-titres en 4 langues.
- **Apparence (Paramétrage › Apparence)** : design (Standard, Aéro, Opérationnel, **Console** — remplace Brief),
  jeu d'icônes (trait normal, fin, épais, aucune), barre latérale, **couleurs des thèmes par famille** (teinte /
  saturation) et ton, avec aperçu et contrastes WCAG calculés ; page de démonstration accessible depuis ce bloc.
  Le menu ☰ mène à ces réglages (« Apparence… »).
- **Framework — icônes, numéros, sous-titres, zones de dépôt, barre latérale** (`block_icons.js`,
  `icons/repository_icons.js`, `side_nav.js`), chargés sur toutes les pages ; page pilote : générateur de mission
  (blocs numérotés à icône et sous-titre, zones « glisser-déposer », boutons à icône).
- **Compteur de sauvegarde** : les préférences d'affichage (design, icônes, couleurs, langue, onglets et séparateurs
  du studio, colonnes et cadrans du planificateur, formats de sortie…) ne comptent plus comme modifications.
- `repository_tree` versionné (`?v=`) dans toutes les pages, comme les scripts partagés.
- **Opérations — assemblage** : studio — carte de l'opération (trajets de toutes les équipes en couleurs, légende,
  rendez-vous communs), à la racine du ZIP de toutes les missions et en tête des aperçus ; générateur — **dossier
  d'opération en un PDF** (page de garde : missions et équipes, rendez-vous communs, carte de l'opération ; puis
  le brief de chaque mission).
## [2.2.8] — 2026-09-26

- **Studio — opérations** : aperçus de toutes les cartes de toutes les missions, groupés par mission ; « Générer les
  N missions » en un ZIP (un dossier par mission, chacune avec sa carte d'assemblage) ; réglages des cartes gardés
  d'une mission à l'autre. Générateur : lecture de ce ZIP (carte d'assemblage de chaque mission).
- **Missions — collage de plusieurs missions en un** : réponse de ChatGPT copiée depuis la page (étiquettes « yaml »,
  « Copier le code », sans ```), ou YAML et Markdown des missions à la suite ; texte hors mission écarté.
- **Missions — opérations chargées en plusieurs fois** : sélecteur de l'en-tête affiché dès qu'une mission annonce
  son opération (missions manquantes grisées) ; une mission de la même opération collée ensuite rejoint le lot ;
  prompt : livraison mission par mission (« suite ») quand la réponse est trop longue.
- **Missions — lots (opérations à plusieurs équipes)** : plusieurs missions chargées d'un coup, par fichiers ou
  texte collé (réponse ChatGPT découpée sur « Fichier : … » ou « # Mission … ») ; navigation ◀ ▶ dans l'en-tête du
  générateur et du studio (lot partagé, modifications gardées) ; générateur : **Exporter les N PDF** (un brief par
  mission). Étape suivante : cartes et assemblage de l'opération.
## [2.2.7] — 2026-09-26

- **Prompt de génération — opérations à plusieurs équipes** : une mission complète par équipe DEFA (41A, 41B… : son
  aéronef, son départ, ses points tournants, ses cartes, son brief), regroupées par un bloc `operation` ; rendez-vous
  communs identiques d'une mission à l'autre ; section « Coordination de l'opération » (ex. FIRE : Milan, Dragon et
  avion de commandement). Le lecteur de missions distingue 41A de 41B.
## [2.2.6] — 2026-09-26

- **Planificateur — courbes compactes** : hauteur bornée par la fenêtre (les courbes s'élargissent sur une colonne
  large au lieu de grandir), redessinées au changement de taille ; espace entre courbes ajouté seulement quand un
  panneau déborderait.
- **Prompt / ChatGPT — plusieurs théâtres** : `THÉÂTRE` accepte « A + B » (acheminement Guyane – métropole, relève
  Corse – continent… avec escales réalistes) ; second théâtre facultatif dans le générateur.
- **Créer une mission avec ChatGPT** déplacé dans le **générateur de mission** (sous-bloc du bloc 1, à côté du
  collage) ; correctif « failed to fetch » : le prompt est embarqué dans `SIA XML/mission_prompt.js`
  (`tools/build_mission_prompt.py`, relancé par `bump_versions.py`) au lieu d'être lu dans docs/.
- **Studio** : le doublon de « Générer les cartes et le ZIP » est un vrai pied de page semi-fixe (il était devenu
  un bloc déplaçable), avec le nombre de cartes du ZIP ; bloc « Créer une mission avec ChatGPT » affiché ouvert.
- **Planificateur — au-dessus du plafond** : courbes (altitude optimale, montée, TAS) jusqu'à 110 % du plafond,
  zone grisée « inaccessible », courbes prolongées (modèle au-delà du plafond, sinon extrapolation) ; optimums et
  devis inchangés, sous le plafond.
- **Planificateur — cadran horloge** : temps de vol du trajet au niveau courant, même lecture que le cadran
  carburant (une par courbe, dans sa couleur, changée d'un clic sur l'un ou l'autre).
- **Planificateur** : TAS (tirets de la couleur de chaque loi) sur la courbe « Vitesses de montée — Badin et TAS » ;
  cadran **carburant** (carburant du trajet au niveau courant, kg / lbs, durée), une lecture par courbe — loi
  réglée, profil, croisière économique, montée rapide, Vy, montée économique — changée d'un clic, dans sa couleur ; liens des messages d'erreur vers les
  champs à renseigner (profil incomplet, limites, altitude de référence estimée).
- **Studio** : case « ZIP » aussi sur la carte de contrôle et sur les aperçus ; bouton « Générer les cartes et le
  ZIP » doublé dans une barre fixe en bas de page ; bloc **Créer une mission avec ChatGPT** (type, théâtre, série,
  équipes DEFA en vol 1 à 5, ou aléatoire) : prompt copié et ChatGPT ouvert dans un nouvel onglet.
- **Prompt de génération** : paramètre `ÉQUIPES_DEFA` (aéronefs DEFA en vol ; équipes sol en plus selon la mission).
- **Correctif — plafond et altitude de référence du modèle** : sans « Altitude de référence » dans le profil,
  l'estimation par cohérence des débits de montée / croisière tombait sur la borne basse (Caravelle III calibrée à
  2 000 ft → plafond 17 600 ft ; courbes arrêtées vers le FL150). Désormais : fiche EUROCONTROL APD du type en
  référence (plafond pratique ; réacteur : altitude où le Mach APD donne la TAS du profil), recherche bornée à la
  plage plausible de la classe et retenue seulement si l'optimum est intérieur, sinon altitude type de la classe
  (Caravelle III : plafond 37 300 ft ; Citation X : 40 900 ft ; Twin Otter plafonné à son plafond APD).
- **Correctif — planificateur** : plus de clignotement des colonnes quand on bouge les curseurs (rangées de
  courbes qui ne font que grandir pendant un réglage — `StickyFrame.resetGrow()` au calcul suivant ; hauteur fixe
  de la ligne de rappel du devis).
- **Planificateur — le devis suit les courbes** : block fuel, temps de vol, détail et TOD recalculés aussitôt avec
  la loi de montée des curseurs et le niveau épinglé (à la place du niveau du plan) ; rappel du niveau et de la loi
  retenus sous le block fuel.
- **Studio — case « ZIP » par carte** : décochée, la carte n'est pas générée ni mise dans le ZIP (reste
  prévisualisable) ; recochée à chaque chargement de mission.
- **Planificateur — corrections d'affichage** : aiguille TAS semi-transparente sur le Badin (échelle étendue à la
  TAS) ; la fiche épinglée reste visible quand le bloc Résultat est collé (le mode compact la masquait) ; les
  panneaux de la colonne de droite ne se chevauchent plus (chaque rangée de courbe au moins aussi haute que son
  panneau — option `grow` de `StickyFrame.follow`) et plus d'espace entre les courbes.
- **Planificateur — météo (écart ISA)** : écart ISA, ou température au sol (avec l'altitude du terrain), ou
  température au niveau ; appliqué au modèle (densité, vitesse du son, poussée / puissance, consommation, plafond ;
  profil calibré en standard) : devis, courbes et fiche. Nouveau **temps de vol** dans le Résultat et encart de
  comparaison au standard (trajet, niveau optimal, plafond).
- **Planificateur — courbe TAS** selon le niveau (croisière, croisière économique, montée à la loi réglée,
  croisière en ISA en pointillés), jauge synchronisée.
- **Correctif — modèle de performances** : au plafond d'un réacteur (« coin de cercueil » : traînée minimale
  au-delà du Mach permis), la croisière limitée en poussée donnait une vitesse supérieure au Mach du profil ;
  le palier est maintenant refusé (poussée insuffisante).
- **Prompt de génération de missions** : consignes au lieu d'une liste fermée de terrains — départ depuis la base
  réelle de l'unité (Dragon, SMUR / hôpital, pélicandrome pour Dash 8 / Canadair / Tracker, terrain militaire de
  préférence), théâtres d'outre-mer (Antilles, Guyane, Réunion, Mayotte, Nouvelle-Calédonie, Polynésie…),
  signes des coordonnées ; désignateurs Sécurité civile (CL2T, DH8D, BE9L).
  Titre et description avec un trait d'humour ou une situation décalée, sans nuire au réalisme.
  Textes aérés : résumé en 2 paragraphes, description détaillée en 5 (contexte, transit, action, décisions,
  retour), blocs YAML littéraux « |- » (« >- » recollait les lignes).
- **Planificateur — trois colonnes redimensionnables** : saisie et courbes | Résultat | instruments (Badin, vario,
  altimètre, empilés et collés sous l'en-tête) ; poignées entre les colonnes (framework `column_resize.js`,
  double-clic : largeurs par défaut). Correctif : la colonne Résultat s'arrêtait 120 px avant le bord des blocs
  pleine largeur (colonnes implicites de l'ancienne grille à 12 colonnes).
- **Designs** : formes appliquées à toute la page — boutons et listes déroulantes de l'en-tête (sélecteurs des CR,
  menu ☰, langue), boutons ↕ / Masquer des blocs (ex. Brief : tout carré).
- **Prompt de génération de missions** (`docs/PROMPT_GENERATEUR_MISSIONS.md`) : schéma YAML exact, format Markdown,
  codes de familles et sous-types, désignateurs OACI reconnus, terrains de référence, axes AAR, cartes, profil
  vertical et contrôles de validation, pour produire des séries directement lisibles.
- **Studio — profil vertical** : `DESTINATION` (et `ORIGIN`, `TARGET`) toujours reconnus dans le cheminement,
  même quand la destination est le terrain de départ (le point était fusionné, le retour disparaissait).
- **Planificateur — instruments du bandeau** : Badin, vario et altimètre fictifs dans l'en-tête, associés aux
  curseurs de la loi réglée (consigne en repère violet, valeur tenue à l'altitude survolée / épinglée / du plan) ;
  Badin et vario réglables sur l'instrument (glisser ou molette).
- **Designs graphiques** (menu ☰ › Design) : Standard, **Aéro**, **Opérationnel**, **Brief** — configurés par
  le framework (`shared/designs.css`, liste dans `repository_tree`), sur toutes les pages ; couleurs du thème de
  chaque page conservées.
- **Générateur de mission** : fenêtre de collage (Markdown ou YAML), comme dans le studio.
## [2.2.5] — 2026-09-25

- **Profil vertical (studio et planificateur) — changement de niveau entre deux points** : une ligne `FL105`
  ou `5500 ft` seule dans le cheminement fait monter ou descendre vers ce niveau après le point précédent (sans
  point ni groupe vitesse / niveau).
- **Studio — profil vertical** : champ **Niveau de croisière** (`FL65` ou `6500`, enregistré dans la mission) —
  sans niveau ni altitude dans le cheminement, la trajectoire n'était pas tracée, sans explication (un message le
  dit désormais). Le cheminement proposé suit origine → points tournants → destination (il passait par la
  destination en 2ᵉ point : 906 NM au lieu de 380 sur COMMAND 41) ; les points de la mission sont listés sous le
  champ et s'ajoutent d'un clic.
- **Correctif — menu ☰ et menu des langues** : ils passaient sous les boutons de la ligne 2 de l'en-tête (CR,
  reporting : « Mission ▾ », « Registre ▾ ») ; ils sont maintenant au-dessus.
- **Correctif — lecture des missions générées (YAML + Markdown)** : le Markdown actuel des séries
  (`summaryNN.md` : AAR, AIRLIFT, COMMAND, LE, MARITIME, MEDEVAC) n'était lu qu'au titre près — seul, il donnait
  une mission sans points. Ses données sont maintenant lues (points tournants, rendez-vous, équipes, charge,
  objectifs, ravitaillement en vol, risques, départ / destination) ; le générateur et le studio partagent la même
  lecture. Un dossier de série entier n'est plus fusionné silencieusement en une mission (message clair), les
  fichiers annexes (`maps_manifest.md`, `AAR_TRACKS_REFERENCE.md`, `VALIDATION.txt`) sont ignorés et la ligne
  « --- » recopiée comme équipe dans les YAML MEDEVAC est écartée. Vérifié sur les 44 missions générées.
- **Contrastes (WCAG ≥ 4,5:1)** : description de famille en blanc dans l'en-tête (plus de gris sur la couleur
  du thème) ; thèmes trop clairs assombris d'un ton (MARITIME, AAR, SAR, AIRBORNE, FI, SURVEY : ≥ 5:1 même sur
  les boutons de l'en-tête) ; liens de l'import (texte cyan sur fond cyan, invisibles), libellés du choix de
  famille des reportings (blanc sur blanc) et textes gris des menus (opacité) corrigés.
- **Code — JS partagés lisibles et spécifiés** : framework, Mission Core (modules et familles), modèle de
  performances, profils verticaux, axes AAR, symboles et magasin SIA reformatés (jsbeautifier, littéraux protégés,
  code identique hors blancs, contrôles de syntaxe et d'insertion de points-virgules) ; chaque fonction porte sa
  spécification (rôle, entrées, sortie, effets).
- **Scrapper des types (update_aircraft_db.py)** : la source OACI Doc 8643 était hors service (PDF en 404) —
  remplacée par la liste officielle JSON de l'OACI (7 262 entrées, nom représentatif par désignateur) ;
  position d'aile cohérente avec la classe OACI (plus de « rotor » pour le Rafale ou le MQ-9) ; option
  `--only`. Les 20 types militaires écrits en dur dans `aircraft_catalog.js` viennent maintenant de la base
  (E2C → E2, RQ9P → Q9 en alias dans `aircraft_overrides.json`).
- **Données — inventaire et sauvegarde** : `docs/DONNEES.md` recense chaque base (référence importée par un
  outil, donnée utilisateur sauvegardée, ou cache reconstructible). Les sauvegardes des données locales
  incluent désormais les bases IndexedDB de données utilisateur (OFP / calibrations du planificateur, journal
  d'atterrissages chargé), restaurées par fusion.
- **Base des types — passe EUROCONTROL APD** (252 types) : 173 fiches de performances dans
  `AircraftDB/aircraft_perf.js` (comparées aux profils dans le planificateur), 141 noms de modèle réparés dans
  `aircraft_db.js` (« Aircraft Performance Database », « Skip to aircraft details »), 79 types sans fiche APD.
- Code : carte et spécification des fonctions du planificateur (`flight_performance_planner.html`) et de
  `flight_ui.js` (commentaires seulement).
- **Planificateur** : aide au survol de chaque champ du profil (contenu et usage par le modèle, 4 langues,
  `shared/flight_profile_help.js`) ; Vx partout où figure Vy (fiche du curseur, panneaux, relevés, courbe
  des vitesses en pointillés fins).
## [2.2.4] — 2026-09-25

- **CR DEFA — description de famille dans l'en-tête** : elle était posée mais masquée (règle CSS qui cachait le
  sous-titre quand l'en-tête porte la barre d'outils) ; affichée sur toutes les pages de CR et de reporting,
  anciennes pages FIRE et HEMS / MEDEVAC comprises, même texte qu'au survol des tuiles de « Nouveau compte rendu ».
- **Planificateur — vue des courbes robuste** : chaque courbe et table est dessinée isolément ; une erreur
  n'emporte que sa courbe (cause affichée dans son panneau, détail en console). Sans niveau atteignable, les
  courbes de montée restent affichées et la cause est précisée (plafond sous 1000 ft, trajet trop court).
- **Landing dashboard — traducteur commun** : libellés statiques (titres, options, menus) traduits par
  `content_i18n.js` à partir des dictionnaires de la page, typographie commune partout ; zones calculées
  (cartes, courbes, tables, état) en `data-no-i18n`. Traducteur : conteneur `[data-i18n]` traduit même
  rangé dans le menu ☰.
- **Typographie** (`content_i18n.js`, toutes les pages traduites) : en français, espace fine insécable (U+202F)
  avant « : ; ! ? » » et après « « » — le retour à la ligne ne rejette plus la ponctuation en début de ligne ;
  en anglais, allemand et espagnol, plus d'espace avant « : ; ! ? ». Appliquée à l'affichage (textes et
  attributs, outils d'en-tête compris), jamais aux sources. Planificateur : scripts partagés versionnés (cache).
- **Framework — `sticky_frame.js`** : cadres semi-mobiles (`StickyFrame.stick` / `follow`), repris par le
  Studio cartographique (colonne d'aperçu, même comportement) et le planificateur.
- **Planificateur — vue des courbes réorganisée** (`shared/flight_perf_view.js`, fonctions documentées) :
  courbes à gauche ; à droite le bloc Résultat (compact une fois collé) et un panneau d'explications par
  courbe qui la suit au défilement ; loi réglable en **curseurs verticaux** (vario à gauche, Badin à
  droite) sur chaque courbe, courbe violette aussi sur l'altitude optimale ; couleur au libellé seulement,
  une taille de texte ; définitions au survol ; groupe Régimes de vol repliable.
- **Planificateur** : fiche curseur (⌖ survol, 📌 épinglé) dans le bloc Résultat, suivie du groupe **Régimes de vol**
  (ancien bloc « Profil actif ») ; le bloc Résultat **reste fixe au défilement** jusqu'à la rangée moteur / RPM ; **loi de montée réglable**
  (Badin et vario visé, en violet sur les courbes, dans la table et la fiche) ; croisière d'un réacteur
  **limitée par la poussée** au lieu d'un niveau « inatteignable » ; montée au Badin du profil **puis en Mach**
  (un Badin constant dépassait Mach 0,9 en altitude) ; croisière économique jamais plus rapide que celle
  du profil ; jauges : un seul enregistrement par courbe redessinée.
- **Base des types — EUROCONTROL APD** : `update_aircraft_db.py --apd` lit le tableau de performances de
  chaque type → `AircraftDB/aircraft_perf.js` et répare les noms de modèle mal lus (143 entrées) ;
  écritures atomiques réessayées si un client de synchronisation verrouille le fichier. L'éditeur de
  profil compare les champs aux valeurs APD (étiquettes identique / différent / vide, reprise au clic).

## [2.2.3] — 2026-09-25

- **Planificateur — courbes de performance plus lisibles** : bloc « Comment lire ces courbes » (marche à suivre
  de graphe en graphe, définitions Vy / Vx / Badin / TAS / TOC / TOD, 4 langues) ; les trois courbes en altitude
  ont une **jauge commune** (survol) et un **clic épingle un niveau** (trait blanc sur les trois + fiche 📌 :
  croisières, vario, vitesses à tenir) ; vocabulaire explicite (« croisière du profil », « croisière économique »,
  « vitesse de montée du profil »). Ligne **Limites** : plafond retenu et sa source (champ « Plafond max » du
  profil ou modèle), niveau demandé, niveau le plus haut possible sur la distance ; chaque « inatteignable »
  donne sa cause (trajet trop court, plafond, poussée) et le champ à modifier.
- Correctif : un commentaire `//` dans `content_i18n.js` minifié cassait la traduction de toutes les pages.
- **CR DEFA — nouvelle famille AAR / ravitaillement en vol** : rôle (ravitailleur / ravitaillé),
  hippodrome du MIAM ENR 5.7 ou autre zone, niveau, type de rendez-vous, système (perche, panier,
  nacelles), ravitaillés (indicatif, type, carburant prévu / transféré, contacts, résultat), bilan
  carburant, breakaways, incidents ; statistiques et synthèse ; pages `CR DEFA/AAR/`. Les missions
  « ravitaillement / refuelling / tanker » (brief SIA, journal DEFA) y sont rangées (auparavant
  transport / spécial).
- CR DEFA : **police du ciel / interception (QRA)**, nouveau sous-type de COMMAND (aéronef intercepté,
  motif, délai alerte → décollage, mesure prise, déroutement ; événements scramble, interception,
  identification) ; libellés plus clairs (« Commandement / police du ciel / guet aérien », « Contrôle en
  vol des aides radio ») ; **description de chaque famille** (4 langues) en sous-titre des pages de CR /
  reporting et au survol dans « Nouveau compte rendu ». Recherche de famille dans les 4 langues.
- Traduction : morceaux de texte composés (« Types d’appareil : aucune », « Dossier : navigateur
  uniquement », liste des familles de l’en-tête) désormais traduits en entier.
- « Nouveau compte rendu » : **champ de recherche** de la famille — la description de la mission
  (« évasan hélico », « ravito », « police du ciel »…) est comparée aux mots-clés de chaque famille
  (synonymes FR / EN, appareils et indicatifs typiques, expressions) ; familles classées, les autres
  estompées, Entrée ouvre la première. Recherche locale, sans service en ligne.
- Planificateur : **triangle des optimums de montée** (Vy, montée rapide — temps de bloc, montée
  économique — carburant, gaz compris pour une hélice), lois de Badin selon l'altitude, table
  comparative montée / trajet ; altitude optimale : un optimum par courbe (profil, économique, vitesse)
  au lieu d'un minimum mélangé, relevé de jauge coloré ; textes du planificateur dans les 4 langues.
- Planificateur : jauges déplaçables et valeurs sous les courbes de montée et RPM / consommation ;
  légendes aux couleurs des courbes.
- **Flight Performance & Fuel Planner — Profil vertical** : bloc de coupe le long d'une route
  saisie ou reprise de l'OFP importé en en-tête (paliers compris) ; trajectoire prévue aux taux
  de montée / descente du profil avion actif, **TOC** et **TOD** ; profil d'affichage du studio SIA
  (par défaut celui choisi dans le studio) et base SIA mémorisée par le studio.
- Profil vertical (studio et planificateur) : **groupes vitesse / niveau** du plan de vol
  (`N0450F350`, K / M, F / A / S / M), **VFR**, case 15 (DCT, voies aériennes, coordonnées
  `4630N00130E`) ; trajectoire tracée sur la coupe.
- **Flight Performance & Fuel Planner — modèle de performances** (`shared/flight_performance_model.js`) :
  mécanique du vol calibrée sur le profil (polaire, poussée / puissance selon la densité et la
  motorisation, consommation) ; **altitude optimale** carburant et vitesse (régime économique et régime
  du profil, montée et descente comprises), **montée optimale** (Vy, Vx, vario et carburant par 1000 ft
  selon l'altitude, régimes RPM / N1) ; devis carburant au niveau du plan par le même modèle.
  Correctif : l'optimum ne dépend plus du niveau saisi (il servait de référence quand le profil n'en
  avait pas) ; la calibration OFP enregistre le niveau de croisière et le Badin moyen de chaque phase ;
  champ « Motorisation ».
- Profil vertical : montée selon le modèle de l'appareil (planificateur : avion actif ; studio : appareil
  choisi parmi les profils du planificateur), taux saisis en secours.
- Surfaces bâties : contour **orange** autour des agglomérations des villes ≥ 100 000 hab.,
  **jaune** autour des autres.
- Studio SIA : **plancher** de la coupe réglable (en plus du plafond) ; points « NOM lat lon ».
- Module `SIA XML/vertical_profile.js` partagé : sélection des espaces d'un profil, résolution
  des points, relief (le studio s'en sert aussi).

## [2.2.2] — 2026-09-25

Studio cartographique (Missions SIA) : symboles OACI.

- Onglet **Aérodromes et radionav** renommé **Symboles OACI**.
- **Survol interdit** (installations portant une marque distinctive) : les symboles ⊗ ne se
  recouvrent plus (les plus grands sites d'abord).
- **Parcs et réserves naturels** de nouveau affichés : 117 des 143 de l'AIXM ne sont qu'un point
  et étaient écartés ; ils ont maintenant un symbole vert (base à relire une fois).
- **Agglomérations** dans l'onglet Symboles OACI : surfaces bâties dessinées par le studio sur tous
  les fonds (raster compris), au choix **aucune / contour / remplissage / contour + remplissage**
  (orange / jaune OACI), seulement autour des villes d'au moins **N habitants** (réglable, 20 000
  par défaut) ; polygones OpenMapTiles, visibles dès l'échelle régionale, contour sans coutures de
  tuiles. Villes en symboles OACI (grande ville tache orange, ville jaune, localité point jaune),
  affichées même sans « Libellés de villes » (symbole seul).
- Correctif : le contour orange des surfaces bâties s'affichait même couche décochée ; les surfaces
  bâties n'apparaissaient pas à l'échelle régionale sur le fond vectoriel par défaut.
- Libellés courts, détails en sous-titre (villes OACI, parcs et réserves).
- Onglet Fond de carte : cadre **Villes et agglomérations** (libellés, population, symboles OACI,
  surfaces bâties) ; onglet Symboles OACI : **obstacles** regroupés avec survol interdit et parcs.
- Correctif : surfaces bâties absentes quand la carte se chargeait en arrière-plan (source intégrée au style).
- **Profil vertical** (nouveau) : cheminement (points de la mission, aérodromes, balises,
  coordonnées, altitude prévue « /3000 » ou « /FL65 »), coupe relief / obstacles / espaces traversés
  en second aperçu, image `profil_vertical.png` dans le ZIP (facultative) et dans le brief PDF ;
  réglages enregistrés dans le YAML de la mission (`vertical_profile`). Cheminement fait de tous
  les points connus : brief, aérodromes, balises, points RNAV de l'AIXM, radiale / distance
  « REN300010 » ; tracé sur les cartes (aperçu et PNG).
- Le profil vertical est une **carte comme les autres** : entrée `profil_vertical.png` dans la liste
  des cartes, avec son profil d'affichage (nouveau profil par défaut **Profil vertical** : toutes
  les familles d'espaces, aucune autre case) ; espaces et obstacles de la coupe selon ce profil ;
  libellés de **tous** les espaces traversés (place libre, sinon trait de rappel) ; plafond
  automatique couvrant leurs planchers (jusqu'au FL 195).
- Case **Noms abrégés** (onglet Zones) : nom seul, sans le type de zone (cartes et coupe).
- Villes : curseurs de population logarithmiques dès 1 000 habitants, seuils séparés pour les
  symboles, les libellés et les surfaces bâties ; villes de l'aperçu dessinées sur le canvas
  (placement accéléré par grille : des milliers de villes).
- Correctif : colonne de l'aperçu plus haute que la fenêtre (bas inaccessible). Le fond de
  l'aperçu interactif qui s'efface au défilement reste un bug connu.
- Tour de commentaires dans le code (en-têtes de fichiers, sections) ; section **Bugs connus**.

## [2.2.1] — 2026-09-25

Corrections du studio cartographique (Missions SIA).

- **Outre-mer** : toutes les zones, aérodromes et balises sont de nouveau sélectionnables (Nouméa,
  Polynésie…) ; seul le dessin est limité à l'emprise affichée (rien de l'autre côté du globe).
- **Aérodromes** : ne sont plus masqués par leurs propres balises (LFRN restait invisible derrière
  le DME et l'ILS de Rennes) ; priorité aux plus grands et aux contrôlés ; liste blanche opérante.
- **Radionavigation** : TACAN visibles (au-dessus des symboles de bases aériennes) ; priorité
  TACAN > VOR > DME > NDB > ILS > DME d'ILS (bout de piste) ; libellés rétablis (ils se rejetaient
  eux-mêmes) ; cases « libellés » séparées pour les aérodromes, les balises et les espaces.
- Nouvel onglet **Aérodromes et radionav** (devenu **Symboles OACI** en 2.2.2) ; **installations portant une marque distinctive**
  (survol interdit < 1000 m / 3300 ft, 198 sites de l'AIXM, symbole ⊗) et parcs / réserves.
- Espaces : **opacité réglable** (50 % par défaut) ; libellés de villes et de points tournants
  réservés avant les cartouches de zones (plus de recouvrement).
- **Libellés de villes** sans recouvrement : les villes les plus peuplées d'abord, une ville dont le
  libellé recouvrirait un autre n'est pas écrite (PNG, SVG, carte de contrôle).
- Blocs : 1. Mission (avec « Afficher toutes les cartes » et « Générer »), 2. Profils, 3. Cartes.
- Fenêtre séparée : synchronisée aussi pour le profil de chaque carte et les cartes ajoutées ;
  carte agrandie (⤢) et fenêtre séparée réduites à la carte et à ses commandes.

## [2.2.0] — 2026-09-25

Nouvelle application **Missions SIA** (générateur de mission et studio cartographique), corrections
de la suite.

### Suite

- **Fusions / renommages** (pilotes, appareils) : une fusion faite dans un sens puis renommée dans
  l'autre créait une boucle (A → B et B → A) qui échangeait les deux noms (cas GRR / RBR) et
  empêchait tout nouveau renommage. Le renommage retire l'équivalence contraire, les chaînes sont
  suivies sans boucle ; Paramétrage › **Fusions et renommages** liste les équivalences, signale
  les boucles et permet de les supprimer.
- **Rappel de sauvegarde** : bouton rouge « Sauvegarder dans le dossier (n) · dernière : … » après
  10 modifications des données du navigateur ; il disparaît après la sauvegarde.
- En-têtes des pages Missions SIA alignés sur ceux des autres applications (bandeau pleine largeur,
  titre, boutons, menu ☰ à droite) ; sorties des cartes (PNG, SVG, largeur) dans le menu ☰ comme
  le profil pilote.

### Missions SIA (nouvelle application, dossier `SIA XML/`)

- **Documentation** : `docs/SIA_MISSIONS.md` (générateur de mission et studio :
  données, format des missions, profils, zones, MORA, hippodromes, stockage, services) ; README
  EN / FR (quatre applications), INSTALL (données SIA), tutoriel (§ 13, mission SIMONE), manuel
  d'exploitation (§ 9.1 : cycle AIRAC, MORA, axes ENR 5.7), FRAMEWORK (`aar_tracks.js`,
  passerelle mission → CR, dossier `__sia`).

- **Générateur de mission** et **studio cartographique** intégrés à la suite : bandeau et menu
  communs (thème et favicon SIA), blocs masquables / déplaçables, pied de page de version,
  js-yaml commun ; historique du dépôt d'origine repris.
- Studio : **hippodromes de ravitaillement** (MILAIP ENR 5.7) tracés exactement pour les axes
  de la mission (cap, longueur, largeur, côté ; côté non publié en pointillés) ;
  `miam-enr-5-7-tracks.xml` nommé et corrigé depuis le PDF (`shared/aar_tracks.js`).
- Studio : choix de **fonds vectoriels** (OSM Shortbread réglable, OpenFreeMap Liberty / Bright /
  Positron, VersaTiles Colorful / Graybeard / Shadow / Eclipse), relief et courbes ajoutés aux
  fonds publiés.
- Studio : **profils d'affichage** (ajout, duplication, suppression) regroupés dans le bloc 3
  avec les zones, et **carte de contrôle** en colonne de droite (carte de la mission au choix,
  profil en cours, actualisée à chaque réglage) ; bouton « Retour » / « Transmettre » dans la
  barre d'en-tête, menu ☰ à droite.
- Studio : les **autres éléments** (points tournants, hippodromes, cercle de zone, quadrillage,
  MORA, tailles et couleurs des libellés) font partie du profil, comme les zones et les couches ;
  chaque carte est dessinée avec les réglages de son profil. Bloc 4 : données complémentaires
  (import MORA, calibration du fond local).
- Studio : **couches OSM sur tous les fonds vectoriels** (OpenFreeMap, VersaTiles : couches du
  style regroupées par source ; POI et numéros masqués) ; seuls les fonds raster les désactivent.
- Studio : collage de mission dans la fenêtre de copier-coller commune.
- **Passerelle vers CR DEFA** : « Créer le CR DEFA » (générateur de mission) ouvre un nouveau CR de
  la famille du type de mission (MEDEVAC → HEMS, TRAINING → SPECIAL…), pré-rempli : nom et numéro,
  objectif, terrains (OACI du nom), points et coordonnées, appareils (type OACI du catalogue,
  indicatif ; à défaut, équipes dotées d'un aéronef), exploitant, charge.
- Studio : **grille MORA calculée** (1° × 1°) : point le plus haut — relief Terrarium (z9 puis
  z12 autour des maxima), sommets OSM, obstacles de l'AIXM SIA (13 836) — + 1000 ft (2000 ft
  au-delà de 5000 ft), arrondi à la centaine ; relief majoré de 100 m si les sommets OSM sont
  indisponibles. Remplace l'import PDF : la carte ENR 6.1 n'a pas de grille (ses valeurs sont
  celles de zones irrégulières), l'ancien `mora.csv` était faux. `mora.csv` régénéré (150
  cellules, 1000 à 18 100 ft). Valeurs non certifiées.
- Studio : grille MORA affichée en **valeurs seules** (le quadrillage fait la grille), centrées dans
  les carrés ; en zoom arrière, cellules fusionnées par 2 × 2 puis 4 × 4 (valeur la plus haute),
  seuil réglable (« espacement minimal des valeurs »), blocs calés sur le quadrillage.
- Studio, sélection des zones : groupes « R 166 — 4 zones (A1, A2, B, C) » dans la complétion
  (identifiant de base : numéro de tête, ou nom sans son numéro final) ; zones
  déjà ajoutées retirées des choix.
- Studio, sélection des zones : tri par famille (R, P, D, CTR, TMA, SIV) puis par numéro (12 avant
  118) ; « Tout supprimer » ; collage d'une liste (une zone par ligne) ; complétion sur toutes les
  familles avec limites verticales ; **alias** modifiables communs aux profils (« @RTBA », proposé
  d'après les zones AZBA de la base SIA).
- Studio : libellés des zones avec leurs limites verticales (« 800 ft ASFC – 2700 ft ASFC ») ;
  libellés des zones, quadrillage et MORA lisibles sur la carte de contrôle (échelle écran).
- Studio, bloc « Profils d'affichage » compact : barre de profil, onglets Fond de carte / Zones /
  Éléments, colonnes 60 / 40 réglables par une barre de redimensionnement (double-clic : 60 / 40),
  carte de contrôle agrandissable (⤢, Échap).
- Studio : **hippodrome choisi explicitement** par mission (Automatique — axe détecté et raison —,
  Aucun, ou l'un des 31 axes) ; axes ENR 5.7 mémorisés avec la base (fonctionne sans relire le
  dossier, y compris en `file://`) ; base mémorisée d'une version précédente relue automatiquement.
- Studio : valeurs MORA lisibles (12 pt, opacité 90 %, halo non atténué).
- Studio : **symbologie des cartes OACI** (légende SIA / IGN) : espaces contrôlés par classe,
  R / D hachurées, P quadrillées, RTBA, croix des petites zones, cartouches nom / plafond /
  plancher ; **tranche d'altitude** affichée (plancher / plafond).
- Studio : **aérodromes** (type de piste, orientation, CAP / restreint / État), **radionavigation**
  (VOR, VOR-DME, VOR-TACAN, TACAN, DME, NDB, rose magnétique), **obstacles** (hauteur minimale,
  balisage, groupes, éoliennes) lus dans l'AIXM SIA (`SIA XML/aero_symbols.js`).
- Studio : colonne de droite = carte de contrôle, commandes (Refresh, **Reprendre le cadre**,
  ⌂, Rétablir, Appliquer, ⧉, ⤢), liste des cartes, **profil de la carte choisie** (plus de liste
  déroulante de carte ni de profil) ; cases à cocher de taille fixe ; champ d'ajout de carte élargi.
- Studio : **ILS** ; priorité des balises (TACAN > VOR > DME > aérodrome > NDB > ILS, élément
  recouvert masqué) ; libellés des grandes zones prioritaires ; MORA décalée pour ne rien
  recouvrir ; taille de la rose des VOR ; **listes** d'aérodromes et de balises (blanche / noire) ;
  croix des petites zones cochée par défaut.
- Studio : erreurs de fond expliquées, secours OSM standard, rapport d'erreur à copier ; course
  entre deux rafraîchissements corrigée (« reading 'layers' »).
- **Mission partagée** générateur ⇄ studio (`SIA XML/mission_store.js`) : un seul document avec
  révision, enregistré à chaque modification et relu par l'autre page ; lecture Markdown / YAML
  commune. Studio : **emprise** de chaque carte modifiable (zoom, déplacement, vue affichée),
  **Appliquer** l'écrit dans la mission (`bbox`), valeurs d'origine gardées jusque-là ; cartes
  **ajoutées / supprimées** ; position de la carte conservée au rafraîchissement, ⌂ pour revenir
  à la position définie.
- Studio : blocs réordonnés (Mission, Sorties, Profils, Base SIA, Données complémentaires) ; liste
  des cartes et profils sous la carte de contrôle ; type de sortie et largeur PNG dans le menu ☰.
- Studio : lecture AIXM corrigée — **arcs** dans le bon sens (du sommet porteur au suivant) et
  **cercles** (185 espaces, dont CTR RENNES absente et CTR NANTES tronquée) ; familles CTA, TRA,
  RMZ, TMZ, PJE ; **territoire** de la mission (plus d'espaces ni d'aérodromes d'outre-mer sur une
  mission en métropole) ; filtres des aérodromes (CAP, restreints, État, hélistations, bandes ;
  contrôlés / non contrôlés) et des balises (VOR, TACAN, DME, NDB) ; libellés sans recouvrement
  (centre puis contour) ; taille des libellés des espaces et altitudes facultatives dans l'onglet
  Zones ; bande OACI uniforme, croix des petites zones facultative.
- Studio : plusieurs hippodromes à la fois (liste à cocher) ; carte de contrôle dans une
  **fenêtre séparée synchronisée** (⧉) ; colonnes redimensionnables jusqu'à 25 / 75 sans
  débordement du bloc de sélection des zones.
- Studio : « Autres éléments » regroupés par élément (case à cocher en titre, réglages grisés
  quand l'élément est décoché).
- Studio : **quadrillage** au pas adapté à l'emprise (1′ à 5°), libellés en degrés et minutes ;
  quadrillage et MORA aussi sur la carte de contrôle dynamique.
- Studio : **sélection des zones** refaite : liste de zones (puces supprimables, nombre de contours
  reconnus), champ d'ajout avec complétion (« R 45 A », « CTR BEZIERS 2 »), mode **liste blanche /
  liste noire**, liste des zones retenues à côté ; comparaison sans espaces, tirets ni accents
  (l'ancienne liste ne reconnaissait pas « LF-R 45 A »).
- Studio : coche globale « toutes » pour les zones R / D / P et les espaces contrôlés ; profil
  « Désactivé » par carte (carte ni générée, ni prévisualisée, ni sur l'assemblage).
- Générateur de mission : nom des exports `S1-M11_AIRLIFT_Pont_logistique_vers_Solenzara`
  (série-numéro, type, titre ou cible) ; résumé et description proposés depuis les données quand
  le fichier n'en contient pas (points, rendez-vous et participants, zone, consignes, axe de
  ravitaillement ENR 5.7 : route, longueur, largeur, sens des virages).
- **Dossier SIA XML mémorisé** (`FileAccess`, clef `__sia`) : « Relire le dossier » après une
  mise à jour AIRAC ; sélecteurs de fichiers des pages SIA ouverts dans ce dossier.
- Supprimés : générateur Python en ligne de commande (`generate_operational_map.py`, son README,
  son exemple de demande et sa carte de vérification), remplacé par le studio ; pdf.js (import
  MORA abandonné).
- Corrections : image vide « carte de contrôle » affichée à côté de la carte dynamique ; un fond
  lent (OpenTopoMap) n'empêche plus les surcharges (points tournants,
  zones) ; une carte en échec n'arrête plus la génération (ZIP des cartes réussies,
  `rapport_generation.txt`, bouton « Réessayer seule ») ni la galerie d'aperçus.

### Demandes de fusion

!48 Missions SIA (générateur, studio, symbologie OACI, MORA, hippodromes), mission partagée,
corrections de la suite.

## [2.1.0] — 2026-09-24

Application **CR DEFA** (Mission Report Core), bases DEFA, reportings unifiés, framework enrichi.

### CR DEFA — comptes rendus

- 14 familles de missions sur un noyau commun (HEMS, FIRE/GAAR, SAR, AIRLIFT, MARITIME, HADR,
  AIRBORNE, FI, SURVEY, LE, ISR, COMMAND, SOF, SPECIAL) ; pages dans `CR DEFA/`, page
  « Nouveau compte rendu » (choix de la famille).
- Registre **unique** `CR DEFA/missions.yaml` (toutes familles), anciens registres HEMS / GAAR
  importés ; lecture robuste (un registre illisible n'est jamais remplacé par une copie
  partielle).
- Saisie assistée : valeurs connues, appareils connus (flotte DEFA, référence DEFA, missions),
  filtrage croisé immatriculation / indicatif / type, indicatif intelligent (`ctm58` → COTAM 58,
  CTM58, OPR/ CTM), table de correspondance des indicatifs (forme plan de vol, autres formes),
  terrains (base mondiale), plan de vol SimBrief / IVAO / VATSIM.
- Analyse de textes collés : plan de vol OACI, pages du tracker IVAO (favori « → CR DEFA »),
  StatSim (VATSIM), historique VATSIM, METAR.
- Suivi réseau en direct (IVAO / VATSIM) : mise en route, décollage, atterrissage, fin de mission.
- Météo : METAR réel ou **METAR calculé** à l'heure du vol (Open-Meteo), lever / coucher du soleil,
  jour / nuit, **altitude densité** ; renseignement automatique dès que terrain, date et heure
  sont connus.
- Saisie : « + » dans le titre des collections, **tableaux compacts** (événements, étapes,
  équipage, points…), bouton **maintenant** sur chaque date / heure, heure locale ⇄ UTC (fuseau
  du terrain, heure d'été), événements créés depuis la chronologie, autorités (historique ou
  département), bloc Résultat en 2e position, lien vers la fiche appareil, routes proposées pour
  le même trajet uniquement.
- Contrôles de cohérence : heures invalides ou inversées, chronologie > 20 h, carburant, date
  future, durées déclarées.
- Barre d'en-tête à 7 entrées (famille · série, enregistrer, envoyer, importer, suivi réseau,
  mission, registre) ; aperçu du CR dans la colonne de droite ; version publique (données
  sensibles masquées) ; champs texte en majuscules.
- **Envoi du CR** à un webservice JSON (adresse et clef paramétrables, clef hors sauvegarde).

### Reportings

- Reporting général « Reporting missions — CR DEFA » et reportings de famille sur le registre
  unique : indicateurs, **graphiques** (activité par période, répartitions), synthèses par
  famille / appareil / équipage, contrôle des données.
- **Période et zoom** : composant commun (préréglages, dates, ◀ zoom − ▶, glisser / cliquer sur
  un graphique), période partagée entre les reportings ; repères « avant / après » sous les
  tableaux.
- **Modification dans le tableau** (date, n°, série, immatriculation, indicatif, résultat,
  terrains, temps de vol / bloc) avec trace ; durées sans heures « déclarées ».
- **Données** : « Mes missions (registre) » ou « Journal DEFA (vols réalisés) » — chargement /
  mise à jour par copier-coller de la page « Log des vols » ou page enregistrée, fusion sans
  doublon (historique cumulé).
- Clic : famille → reporting de la famille ; appareil → **fiche appareil** ; équipage → **fiche
  équipage**.

### Fiches appareil et équipage

- Fiche appareil : statut (disponible, maintenance…), « actuellement à », terrain de
  rattachement, mise en service, indicatifs utilisés, équipements, vie de l'appareil
  (maintenance, incidents…), performances du Flight Planner (courbes), activité **par période**
  (graphique avec zoom).
- Fiche équipage : qualifications, fonctions, heures par type, activité par période.
- **Fusionner / renommer** deux appareils ou deux pilotes (ex. GRR → RBR) : missions mises à jour,
  fiches fusionnées, équivalence appliquée au journal DEFA rechargé.

### Bases DEFA

- Flotte DEFA (205 appareils) importée depuis le site de la flotte.
- **Référence DEFA anonymisée** (`shared/defa_reference.js`, committée) : pilotes (trigrammes),
  appareils, indicatifs utilisés, terrains — sans les vols ; `tools/defa_reference.py`.
- **Journal DEFA** (non committé) : base du navigateur, analyse des séries d'indicatifs
  (≈ 50 séries 2025-2026 ajoutées à la table de correspondance).
- Page **Paramétrage › Bases de données** : flotte, types d'aéronefs, indicatifs, référence et
  journal DEFA, données du navigateur, registres, envoi des CR, dossiers paramétrés.

### Landing Performance Dashboard

- Période : composant commun (préréglages, dates, navigation, zoom par glisser), mémorisée par
  fichier ; types militaires et types locaux reconnus (catalogue commun).

### Flight Performance & Fuel Planner

- Tous les types employés par la DEFA proposés, même sans profil ; ouverture depuis une fiche
  appareil (`?aircraft=`) et liens vers les fiches des appareils du type ; identifiant SimBrief
  du profil pilote commun ; dossier performances mémorisé.

### Framework commun

- `time_period.js` (période et zoom), `charts.js` (graphiques SVG), `file_access.js` (dossiers
  paramétrés affichés, sélecteur de fichiers ouvert dans le dossier paramétré, fenêtres de
  copier-coller avec × / Fermer / Charger → Valider), `aircraft_catalog.js` (types et appareils
  communs aux trois applications), profil pilote, sauvegarde locale avec **rappel de sauvegarde**
  (bouton après 10 modifications), blocs masqués par défaut, lien de version vers ce changelog.

### Documentation

- README (EN / FR) : trois applications et un framework ; INSTALL ; tutoriel ; manuel
  d'exploitation ; `docs/FRAMEWORK.md`, `docs/FLIGHT_PLANNER.md` (reprise de la section d'origine),
  `docs/LANDING_DASHBOARD.md` ; notes de conception (`docs/mission_report_core_audit.md`).

### Demandes de fusion

!35 StatSim · !36 indicatif, METAR calculé, envoi du CR · !37 reporting général et graphiques ·
!38 barre d'en-tête · !39 contrôles de cohérence · !40 période et zoom unifiés, documentation ·
!41 base DEFA · !42 saisie, dossiers, rappel de sauvegarde · !43 référence DEFA, catalogue
commun, journal alternatif · !44 fiches appareil / équipage · !45 modification en grille,
fusions, journal DEFA depuis les reportings, tableaux compacts · !46 fenêtres de copier-coller ·
!47 période sur les fiches, version 2.1.0 et changelog.

## [2.0.7] — 2026-09-21

Première version publiée de la suite réunie dans un seul dépôt.

- CR et reporting GAAR (sécurité civile) ; Flight Performance & Fuel Planner (profils,
  devis carburant, courbe de montée optimale, calibration SimBrief, Little Navmap).
- Landing Performance Dashboard (analyse multi-CSV, tendances, filtres).
- Bandeau et menu communs, arborescence `repository_tree`, thèmes, icônes d'aéronefs,
  traduction FR / EN / DE / ES.
