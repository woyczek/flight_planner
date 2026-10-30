# Changelog — X-Plane Web Suite (DEFA Virtual)

Toutes les évolutions notables de la suite (CR DEFA, Landing Performance Dashboard, Flight
Performance & Fuel Planner, Missions SIA, framework commun). Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation `majeur.mineur.correctif`.
La version affichée en pied de page de chaque page (lien vers ce fichier) vient de
`repository_tree` (`release`).

Dépôt : <https://framagit.org/asr/flight_planner> — demandes de fusion : `!n`.

## [Unreleased]

### V3

- **Data: pickup with a bad zip name; refusal during a suite update** (`modules/data/`; help ×4; noreg L8, L16, L17, L18, L19): a zip whose name is outside the launcher's rule is shown in the pickup plan as « file name to rename: letters, digits, . _ - » and never run (`pickupSplit`: the real run carries only the ready sources, in `zones` and in `zips`; with none ready there is no question and nothing is called); a 409 with reason `updating` is its own refusal ×4 (« Suite update under way: try again after the launcher restarts ») for every job start (base, sets, chain, pickup, sheets).
- **Update the suite, « suivi »: the fast-forward goes to the commit the plan read** (`tools/suite_update.py`; Settings
  SPEC 9a-bis; noreg I25) — Sécurisation's review of 513f6fb5b: never the name `origin/<branch>`, which another check's
  fetch could move between the plan and the merge.
- **Update the suite: the version written is the one the check showed** (`tools/suite_update.py` `changed`,
  `tools/launch.py` `update_target`; Settings panel, SPEC 9a-bis, DECISIONS, help ×4; noreg I25, A51) — Sécurisation's
  review of 99b4c2a25. « Mettre à jour » sends back the sha « Vérifier » showed; another target is refused (`changed`),
  nothing written, and the panel asks to check again. Noreg: I27 keeps its own trial's lines out of the pass's output.
- **Refactor R-S2, no behaviour change: one reader and one writer for the airline's map profiles** (`frame/settings/admin.js`, `settings.js`; INTEGRATION § 4) — `readEdge` / `writeEdge` / `readRunwayZoom` / `writeRunwayZoom` become `readProfiles` (one `get`, `{ edge, runwayZoom }`) and `writeProfiles(c, patch)` (`{ edge: { show } }` or `{ runwayZoom }`, the rest of the file kept); the Settings screen reads the file once instead of twice; same file contents, same defaults, same messages.
- **Update the suite: the Data module keeps answering during an update** (`tools/launch.py` `update_suite`,
  `tools/regen_jobs.py` `Jobs.hold`; Settings SPEC 9a-bis, DECISIONS; noreg I25) — Sécurisation's review of 2a02aedde.
  The plan and its fetch run outside any lock; job starts are refused (`updating`) by a flag instead of the jobs' lock,
  so the job state, « Arrêter » and the windowless page answer; `SYNC_LOCK` covers the writing alone.
- **Data: the pickup takes only the zip it showed; approximate outlines on the map** (`modules/data/`; help ×4; noreg L16, L19, L20): the real `base/pickup` run sends `zips: { <source>: { name, size } }` built from the plan that was shown (kept in the module state between the question and the run, never re-read); a source refused with `changed` (another zip arrived during the question) is said with the newest name, escaped, nothing is taken for it, and a « Run the plan again » button starts a new dry run. On the zones map, a zone whose outline has no ring or only its frame rectangle (`isApproxOutline`, from the data, never from a zone name) is dashed, says « approximate outline » in its title and aria-label, and adds a legend item.
- **Noreg: every bench is opened by a case** (noreg I28, A53; frame DECISIONS) — I28 lists the pages of `frame/*/test/` and
  `modules/*/test/` and fails on one that no case opens (pages served only by the launcher are out). The three still without a case
  wait in the case's own table with their owner (two of Atmosphère, one of Flightlog); a page that only measures
  (Atmosphère's drawing times) is out of the check, said as such; the sessions table gets Atmosphère's row. A53 runs the frame's three: geometry,
  the data layer against its own fake GitHub (on a free port), and the QR codes read back by the independent decoder.
- **Update the suite: refused while a job or a synchronisation runs** (`tools/launch.py` `update_suite`; Settings SPEC 9a-bis,
  help ×4; noreg I25) — Sécurisation's review of 4fc473e5d. « Mettre à jour » answers `reason: 'busy'` while a job of the Data
  module or a synchronisation of data/ runs, and holds both locks while it runs: the checkout changes `tools/` while a child
  process may still import from it. The help now says the target is not verified (the tags are not signed): the same trust as
  the manual `git pull` it replaces.
- **Refactor R-C6, no behaviour change: the GitHub and GitLab transports on one base** (`frame/store/transport_git.js`;
  frame SPEC 2, DECISIONS; noreg I16 now finds the redirect refusal in the base) — the API call (no cache, no redirect
  followed, offline and refusals), the publication loop and the base64 were written twice; each transport keeps its
  addresses, access header, refusal reading and commit. Loaded before both on every page, in the service worker's list
  and in the frame's list of store scripts to ask again.
- **Map: labels declared as requests, aerodb answers deduplicated by key, refactor without change of behaviour (R-M2 b, § 10.33)**
  (`modules/maps/lib/aero_symbols.js`, `render.js`, `render_airspace.js`, `render_route.js`, `procs.js`, `choose.js`, `data.js`;
  DECISIONS; noreg D84). Every label of the Map is a request `{ layer, rank, key, anchor, boxes, paint, force }` through one
  `ask`, placed in today's order (the canvas of six real scenes is the same); `many()` deduplicates by a key per kind (an airspace by
  type, key, name, limits and first point: the SIA's key alone is not unique).

- **Frame: the help panel and the welcome card below a module's content** (`frame/app.js`; frame/help SPEC § 3, DECISIONS;
  help ×4; noreg A52) — they arrive after the module's first drawing and no longer push the page down under a pilot's tap.
- **Aircraft SPEC as a state** (`modules/aircraft/SPEC.md`): each rule with its case M, what became false removed (the Registre view, the
  type completion, the count in the removal question), the history in DECISIONS; new cases M12–M15 for the writes that had none (new
  sheet, file import, completion from another sheet, ChatGPT reply).
- **Data: a map of the zones to tick** (`modules/data/`; help ×4; noreg L20): above the zone list of the base panel and the State list of the procedures panel, an inline SVG of the outlines read from `ctx.aerodb.zoneOutlines()` (equirectangular, 5 % margin, at most 260 px high). A tap, a click or Space/Enter changes the selection the list reads and both are redrawn from it (one writer); each zone is a keyboard-reachable `role=checkbox` whose `title` and `aria-label` give the name AND the state in words; colours are the frame's tokens, a ticked zone has a thick stroke and a solid tint; a one-line legend names the tones. No map (the list alone, no error line) when the outlines are missing or when a zone would be under 44 px at the current width (re-evaluated on resize, one listener removed at unmount); frozen while an operation runs.
- **Noreg: a targeted pass no longer waits for another worktree's full pass** (`tests/v3/run.py`; tests/v3 README, frame
  DECISIONS; noreg I27) — it runs beside it at 4 runs at a time; two full passes stay exclusive.
- **Fuel: F82, the weather corridor** (a « no case » debt of the SPEC): the radius, the order along the route, the aerodromes without a
  message left out, the folding beyond two.
- **Launcher: `base/pickup` takes the file the plan showed** (`tools/regen/base_sources.py`; aerodb INTEGRATION; noreg I24) —
  with `zips` from the plan, a zip changed in Downloads during the question is refused for its source, nothing written.
- **Fuel: a METAR without a wind direction no longer counts as a north wind** (`modules/fuel/weather.js` `hasWind`, `routeWind`, the
  « Real weather » filter; METAR bench, F80) — that aerodrome leaves the mean, which comes from the others; 00000KT stays a calm wind.
- **Map: one cartouche primitive, the procedures' hues from the design tokens, refactor without change of behaviour (R-M5 a,
  § 10.33)** (`modules/maps/render.js`, `procs.js`, `choose.js`, `render_airspace.js`; SPEC § 3 target form of the labels,
  DECISIONS; noreg D83). `MapsRender.cartouche` draws the procedure labels, the choose mode's labels and the airway boxes (the same
  pixels on four real scenes); `PALETTE.sid / star / app` read `--sog-map-*` (Features SOG, R-F3).

- **Administration: « Mise à jour de la suite »** (`tools/suite_update.py`, `tools/launch.py`, `frame/settings/launcher.js`;
  frame/settings SPEC 9a-bis, DECISIONS, frame INTEGRATION; help ×4; noreg I25, A51) — stable, pre-releases or the development
  branch; the plan first, forward only, refused on local changes; the launcher to restart by hand; the data never touched.
- **Fuel: the surface-wind mean of « Real weather » has its checks** (METAR bench, F80; a « no case » debt of the SPEC); a gap noted in
  fuel DECISIONS (a missing wind direction read as 0°), not fixed yet.
- **Fuel: F81, « Cancel the start »** (a « no case » debt of the SPEC): the question, « No » changes nothing, « Yes » clears `started`
  and `progress`.
- **Map: the choose pane has one exit, refactor without change of behaviour (R-M1 c, § 10.33)** (`modules/maps/choose.js`,
  `sheet_view.js`; SPEC, DECISIONS; noreg D62). `chooseClose()` for Done, ✕ and Escape replaces `chooseFinish` and `chooseExit`:
  the keys back to Fuel, or, opened from the aerodrome card with nothing chosen, back to the flight without a reload.

- **Fuel SPEC as a state, part 3b** (`modules/fuel/SPEC.md` § 9; refactoring § 10.33): the screens by screen and step (9.1–9.8), each
  rule with its case, every F case cited; what was no longer true dropped, the history in DECISIONS with where each paragraph went.
- **Fuel SPEC as a state, part 3a** (`modules/fuel/SPEC.md`; refactoring § 10.33): sections 1–12 in order, the files as they are, each
  rule with its case (or « no case »), dates and lots moved to DECISIONS; § 9 (screens) in part 3b.
- **Data: « Take the downloaded file »** (`modules/data/`; help ×4; noreg L19): the launcher's `base/pickup` as the second button of the base panel and under the manual sources of a download that carry `pickup: true` (with their expected name): the plan first (`dry` sent), then ONE question (the zip found with its files and size, the file missing with its pattern, where the raw files go, never committed); nothing found says what is missing without a question; the real run (`dry: false`) ends with « Taken: n files (x MB) », the failures named and « Now start Build »; one journal entry; grey with the usual reason when the launcher does not know the verb; never part of « Update all ».
- **Map: the choose pane rendered from its model, refactor without change of behaviour (R-M1 b, § 10.33)**
  (`modules/maps/choose.js`, `frame/lib/pane_model.js`; DECISIONS; noreg D60, D62, D66, D70, D77 read the new state). The pane
  keeps one state `{ sel, pend, open, hl }` and renders the pane and the map from `paneModel`; its rules left `choose.js`
  (1 108 → 808 lines).

- **Map: the choose pane's model, pure (R-M1 a, § 10.33)** (`frame/lib/pane_model.js`, bench `frame/lib/test/pane_model.html`;
  maps SPEC § 5.1 target form, frame INTEGRATION; noreg D82). `paneModel(input, state)` holds the pane's meaning — groups, folds,
  families, the pending family, transitions under the STAR, route and heading axes, marks, the correction line, summary, wind,
  frame — with its reducers and the one way back; the Map does not use it yet (next lot), nothing changes on screen.

- **Map: the plain background from aerodb; the modules' file lists complete** (`modules/maps/lib/map_base.js`, `draw.js`,
  `module.js`, `modules/atmosphere/module.js` (meta.files only); DECISIONS; noreg D81, I26). The plain background draws the
  countries of `aerodb.zoneOutlines()` instead of the Map's own copy (kept for Atmosphere until it moves too); the Map's and
  Atmosphere's `meta.files` list every file they import, so they load offline from the start.

- **Cases merged (refactoring § 10.33)**: F63 → F41 (« the Map's return »: one key or several, said once, consumed; a missing key
  keeps its family; « none »; hostile keys ignored), F67 → F8 (« Auto »: written, idempotent, the previous Auto replaced). F63 and
  F67 are retired.
- **Refonte, sans changement de comportement — R-F6, un seul état des côtés de la carte des procédures** (`modules/fuel/procedures.js`
  `cardState { open, focus }`, `modules/fuel/module.js` `S.focus`: four flags over two files become two; fuel DECISIONS).
- **Map: panning scheduler, refactor without change of behaviour (R-M3, § 10.33)** (`modules/maps/draw.js`; SPEC, DECISIONS;
  noreg D68, D65). One scheduler in three states (rest, move, settle) with one animation-frame slot replaces the four entry
  points; the image kept for the gesture is copied at its first move only, no longer after every full drawing at rest.

- **Noreg: every module loads offline before its first opening** (`tests/v3/cases/repo.py`; frame INTEGRATION § 2; noreg I26,
  known for now) — a static case: meta.files (with lazy) holds the whole chain of a module's imports, the service worker's
  list the frame's; today's gaps (Fuel, Maps, Report, Atmosphere) are listed for their owners.
- **Sheets on a phone** (user, 30 Oct: « bug d'affichage sur les fiches, sur téléphone », iPhone, cupertino;
  `modules/aircraft/sheets.js`, `modules/fuel/module.js`; aircraft SPEC § 6; cases M5, F79) — the sheet form had three columns of
  96 px (labels on three lines, lists cut, empty fields stretched to the row, checkboxes as wide as their label): two columns of
  150 px, fields at their own height; a row of the sheets list, in Fuel and Maintenance, squeezed its text to one word a line beside
  « Utiliser » and « Modifier dans Maintenance »: the text takes the width, the actions go under it below 480 px.
- **Fuel: every file it imports is kept offline from the installation** (`modules/fuel/module.js` `meta.files`: `frame/lib/wind.js`,
  `route_model.js`, `adnames.js`, `metar.js` were missing) — a pilot who went offline before ever opening Fuel could not load it.
- **aerodb: `zoneOutlines()`, the zones' outlines for the modules** (`frame/aerodb/aerodb.js`; aerodb SPEC, INTEGRATION,
  DECISIONS; noreg K21) — loaded once, served frozen in the GeoJSON order, with each zone's box; the Data module's map of
  zones reads it, the Map's background will.
- **Map: flown trail, refactor without change of behaviour (R-M6, § 10.33)** (`modules/maps/flight_time.js`; SPEC, DECISIONS;
  noreg D61). The frame's trail (`ctx.live.trail()`) is the only source: the Map joins it to the actual position and keeps no
  position of its own (`TRAIL_MS` and the merge removed).

- **Refactor R-S1, no behaviour change** (`modules/data/`; noreg L6, L14, L16 moved onto the generic functions): `viewVerb`, `isBuildView`, `isDry`, `buildState` and `VERBS` are gone (the module already used `viewOp`, `opDry`, `setGate`); `countOf` and `listLen` are one helper; `linkHtml` uses `isHttps`; the unused `me` parameter of `endBuild`, `endFetch`, `endPurge` and `endSheets` is dropped; the catalogue lookup written three times is `catSource`; the journal line's three « word or itself » fallbacks are `wordOf`.
- **Launcher: `base/pickup`, the SIA and NATS files taken from Downloads** (`tools/regen/base_sources.py`, `tools/launch.py`;
  frame and aerodb INTEGRATION; noreg I24, K54) — for France and the United Kingdom, the downloaded zip with the expected name is
  checked and its useful files put where the build reads them; dry first; the page gives the zone only.
- **Refactor R-C5, no behaviour change: the two take-overs of data/ share their rules** (`tools/data_sync.py`; frame
  DECISIONS; noreg I15, I16) — one identity, one pool commit with the `.js` check, one reader of a file at a revision.
- **Settings: the « Compte IVAO » card sits in the Identity group** (`frame/settings/groups.js`; ergonomics session, 30 Oct) — next to
  the trigram and the IVAO / VATSIM / SimBrief identifiers (it is the pilot's account), instead of standing outside every group.
- **Map: runways, refactor without change of behaviour (R-M4, § 10.33)** (`modules/maps/procs.js`, `data.js`, `draw.js`,
  `choose.js`; SPEC, DECISIONS; noreg D58, D71, D60, D79). One store `S.runways` filled by one path (`wantRunways`) instead of
  `S.rwys` and `S.adRwys`; the runway zoom's default written once (`readSettings`); `arrowOf` without its unused side; the
  bearing from `wind.runwayAxis` (R-F1), the rule shared with Fuel; dead `gcNmPlain` removed.

- **Refactor R-C1, no behaviour change: one identity of the relay** (`tools/launch.py`; frame SPEC § 3.11, DECISIONS; noreg
  I13) — host, port and server in one `Relay`, set together before listening; the proxy-header belt a named method.
- **Settings: the keys panel's link to the IVAO application assistant says its own text** (`frame/settings/launcher.js`) — the key
  `ivaoAppLink` was defined twice in the shared texts (settings.js and launcher.js), the later loaded won and the keys panel showed the
  IVAO account card's wording; the panel's key is now `ivaoAppSteps` (« Créer l'application IVAO des pilotes : pas à pas » ×4).
- **Refonte, sans changement de comportement — R-F5, une seule liste de complétion** (`modules/fuel/suggest.js`
  `createSuggestList`, used by `adnames.js` and `routecomplete.js`, which keep their sources; cases F44–F47, F75).
- **Refonte — R-F4c, un seul écrivain du texte de route** (`frame/lib/route_text.js` `textFromPoints` through `textFromTokens({ dct:
  true })`; bench merged into `frame/lib/test/route_text.html`, F69) — after an edit on the Map the text has its « DCT », the ICAO
  form of Fuel's field; a kept airway stays an airway.
- **Status block: every line leads somewhere, the dot reads as a status** (`frame/app.js` `statusItems`, `frame/frame.css` `.f-status-dot`; user captures of 30 Oct) — the Weather line leads to the weather key card and the Offline line to Synchronisation
  (a chevron on every line); the dot takes the design's token (green, warning) as a filled disc ringed by 1 px of the same tint,
  so it no longer reads as a dirty icon when the token renders dark (Standard light); case A50.
- **Map: the profile's constraint texts in the collision pass; runway numbers before the beacons** (`modules/maps/procs.js`,
  `render.js`, `draw.js`, `choose.js`; maps help ×4; noreg D80, D79). The texts of the procedures' constraints on the profile
  ("FL100", "3000"…) take a free place (above right, above left, below) or none, never over a space's label, TOC / TOD or a
  level; on the map, from the airline's runway zoom and in the choose mode, runway numbers reserve their place before the
  beacons (« a minima le numéro de piste au seuil »), which give way.

- **Map: the aerodrome's code above the procedures, runway numbers that give way** (`modules/maps/choose.js`, `draw.js`,
  `render.js`; maps help ×4; noreg D79). In the choose mode the aerodrome's code takes its place before any procedure label and
  is written above the veil, once (the dimmed route no longer repeats it, the base map's label no longer hides under it); the
  runway numbers join the collision pass: one that would fall on a beacon box or a label is not written, its arrow stays.

- **Settings: the data repository's provider is read, not set** (`frame/settings/config.js` `providerOf`, `launcher.js`, `access.js`, `admin.js`; help ×4; A49) — the remote repository panel opens on « Provider: GitLab · project group/project » read from the remote's address (one classification, `SogConfig.kind`): GitLab adds the « Pilots' tokens » link, GitHub suggests a GitLab project (the change still goes through the launcher's window); the exported configuration carries `data.provider`, and the pilot's Access card shows GitLab's field and hint for a GitLab project.
- **Map: the choose pane opens tall, "Done" always in sight** (`modules/maps/choose.js`, `style.js`; maps help ×4; noreg D78). The
  pane opens the sheet expanded (it had 240 px at 1280 px, 164 at 390), its hint is shown from the start, and "Done" sticks to
  the foot of the body however far the rows scroll. Fix of a314a352c: the Layers chip, which a `hidden` did not hide, no longer
  shows while choosing.

- **Refactor R-C4, no behaviour change: one list of routes** (`tools/launch.py`, `frame/app.js`; frame INTEGRATION § 6.1 and
  § 13, DECISIONS; noreg I10, A48) — the launcher publishes its route table, the noreg checks its rules instead of a copy,
  a service screen says when the launcher is older than it.
- **Data: « Update all »** (`modules/data/`; help ×4; noreg L18): one button under the coverage with the count of data sets; a plan first and ONE question (the AIRAC cycle, the data sets in the published order with what each touches, downloads' size unknown, no purge, skipped sets with their reason); then, through the ordinary follower and one operation at a time, Download then Build for the base, the procedures, the VFR points and the aircraft, a chain line « n / m data sets » with one « Stop », stop at the first failure (partial, stopped, merge-pending…) with what is built kept and nothing published, and ONE publication at the end without its own question; one journal entry (`set: 'all'`, `verb: 'update'`) and one notification; a chain cut by a reload is said; the attention dot on the base's Build and on the button when a published cycle is gone by.
- **Refonte — R-F4b, la sortie de SID entre une fois** (`frame/lib/procedures.js` `endsOf`; Fuel's `procsToText`, `autoAirways`,
  `knownPoints`; `flight_path.js` `routingChain` removed; fuel DECISIONS) — the text and Auto take the ends of the procedures from
  one rule, Auto brings the text up to date first. One wanted fix: with a SID point already in the text, Auto joins there instead of
  inserting the exit after the departure and routing backwards.
- **Map: no approach transition the chosen STAR does not lead to** (`modules/maps/choose.js`; maps help ×4; noreg D77). Under
  the chosen approach, a transition whose IAF is not on the chosen STAR is no longer offered (`PR.compatible({ star })`), and a
  STAR chosen after such a transition sets it back to "None" (LFPO: AMB 9E with ILS 02 leaves only "via ODILO 1S"; MOLBA 1E,
  east of Paris, is gone).

- **Map: the Layers button next to the pane it opens** (`modules/maps/module.js`, `screen.js`, `sheet_view.js`, `style.js`; maps
  help ×4, SPEC; noreg D76). Layers leaves the map's top left corner for the sheet's line, a chip left of the grip, on a phone
  and a computer alike; with nothing to draw the sheet is that line alone, so Layers stays reachable.

- **Refactor R-C3, no behaviour change: IVAO's return in one place** (`tools/launch.py`, `tools/outbound.py`,
  `frame/app.js`; frame SPEC § 3.11, INTEGRATION, DECISIONS; noreg I10, I14, I20) — one declared route and one guard, one
  opener that never follows a redirect; `ctx.ivao.token()` and the launcher's refresh, without a reader, removed; « Ouvrir »
  of « Dossiers du poste » imposes the Explorer.
- **Refonte, sans changement de comportement — R-F4a, la route lue depuis son texte dans le cadre** (`frame/lib/route_model.js`
  `routeModel`, `AIRWAY_WORD`: Fuel's `routePoints` moved unchanged, the aerodb face passed as `base`; bench
  `frame/lib/test/route_model.html` in F69).
- **Launcher: pairing closes per channel, expired devices purged** (`tools/device_access.py`; frame SPEC § 3.12, DECISIONS;
  noreg I22) — 30 wrong codes on the relay no longer close the local network; an expired device leaves the list.
- **Administration: « Dossiers du poste »** (`frame/settings/launcher.js`, `admin_links.js`, `settings.js`, `tools/launch.py`;
  frame/settings SPEC 9a, DECISIONS, frame INTEGRATION; help ×4; noreg A47, I23) — the suite, data/, downloads and Little
  Navmap's folders of this computer, read only, where each comes from, « Ouvrir » by id; X-Plane said unknown to the
  launcher.
- **Refactor R-C2, no behaviour change but one: one pairing for the local network and the relay**
  (`tools/device_access.py` replaces `lan_access.py` and `relay_access.py`; `tools/launch.py`, `frame/settings/devices.js`
  replaces `relay_devices.js`, `frame/settings/launcher.js`, `frame/app.js`; frame SPEC § 3.10–3.12, INTEGRATION,
  DECISIONS; help ×4; noreg I22, A40, I13) — one list of devices with their channel, one code, one revocation, one
  Maintenance screen « Appareils » (`#relay-devices` leads there); the local network's pairing code has 8 digits, no
  longer 6.
- **Map: a light drawing while panning** (`modules/maps/light.js`, `draw.js`, `render.js`; maps help ×4, DECISIONS; noreg D68).
  During a gesture the map is no longer frozen on its last image: at most every 120 ms it redraws its lines only (airspaces,
  airways, route, aerodromes as small squares) from paths cached in Mercator, under a millisecond on the real Paris base; the
  kept image fills in between, labels and collisions come back at rest, and a light drawing over 8 ms gives the gesture back
  to the copy alone. The help's "seen from afar" sentence now names the "Around the flight only" box.

- **Frame: each application's identity, and a switcher on its name** (`frame/app.js`, `frame/index.html`,
  `frame/frame.css`; frame SPEC § 3.1, INTEGRATION, DECISIONS; help ×4; noreg A46) — the header's name opens the list of
  applications (Maintenance greyed below the Full level); Maintenance shows the suite's plane in red, in the header and
  the browser tab.
- **Refonte — R-F3, les teintes des procédures en jetons du design** (`frame/design/tokens.css` `--sog-map-sid`, `--sog-map-star`,
  `--sog-map-app`, design SPEC § 2; Fuel's points-list groups read them instead of a copy of the Map's `PALETTE`). One visible
  change, on purpose: at night the groups take the Map's night hues (they kept the day ones).
- **Refonte, sans changement de comportement — R-F2b, compatible absorbe conflictsOf, un rendu des noms** (`frame/lib/procedures.js`:
  one private `reasonsOf` behind `compatible` and `conflictsOf`, same signatures and data; `displayName` for `summaryOf` and Fuel's
  `nameOfId`; bench F32).
- **Noreg: a run whose browser crashed is replayed once** (`tests/v3/lib.py`, `tests/v3/run.py`; tests/v3 README, frame
  DECISIONS; noreg I21) — in a fresh browser, said in the report; more than 3 crashes in a pass lower it to 6 runs at a
  time for the rest.
- **Map: "Around the flight only" made explicit; the same density on both sides of a border** (`modules/maps/data.js`,
  `layers.js`, `sheet_view.js`, `texts.js`, `style.js`, `render_airspace.js`, `lib/aero_symbols.js`, `lib/vertical_profile.js`;
  maps help ×4, SPEC, DECISIONS; noreg D75, D64). The corridor reading is the first box of Layers, "Around the flight only
  (faster)" with "otherwise the whole view" below it, ticked by default as before and kept on the device; ticked, the pane
  title ends "· around the flight" and the "i" chip says nothing is read outside the corridor; unticked, the whole view is
  read, filtered by complexity alone, except a view wider than 600 NM (corridor imposed, said in the chip). A name carrying
  its type (Spain's "TMA BARCELONA AREA 1") reads the type once, on the map and the profile, like a French one.

- **Data: the panels follow the launcher's real shapes** (`modules/data/`; help ×4; noreg L16, L17): VAC points read the cycle's view (`cycles`), say « n charts not published yet » without calling it a failure, report `no-base`, `no-pypdf` (with the first-install link), `no-cache`, `invalid` and a build without a commit (no trigram), and purge all cycles' caches; Procedures offer only the States with a bulk source (France, United States), never the EAD ones (one line says they are read one aerodrome at a time); the other sets count in the launcher's unit and write « (n / m) » without a noun; `unsafe-path` is said for every purge; Procedures follow the real `proc/*` shapes (sorted States sent, `built: { State: n }`, counts of aerodromes, `no-cache` per State) and `merge-pending` (a merge waiting in data/: nothing written) is one sentence for every set.
- **Launcher: no session identifier in the console, every zip bounded, no redirect to another host**
  (`tools/outbound.py`, `tools/regen_jobs.py`, `tools/proc_cifp.py`, `tools/launch.py`; frame INTEGRATION § 15, DECISIONS,
  aerodb DECISIONS; noreg I20) — a failed address loses its `;jsessionid=…`; the CIFP and the data archive are refused
  over 2 GB unpacked, the CIFP's file read at its root only; every source follows a redirect on its own host only.
- **Refonte, sans changement de comportement — R-F2a, une seule notion de transition d'approche** (`frame/lib/procedures.js`
  `appChoices`; the « fiche qui en alimente une autre » rule and its fallback removed, `isAppTransition` already covers them; the
  dead re-export of `conflictsOf` / `orderProcedures` in `flight_path.js` removed; benches F32 and current_flight).
- **Refonte, sans changement de comportement — R-F1, une seule règle du vent sur une piste** (`frame/lib/wind.js` `runwayAxis`,
  `oppositeRunway`, `bestRunwayEnd`; Fuel's `weather.js runwayWind` removed; bench F62) — the axis rule of the Map for both modules.
- **Frame: the end-of-cycle line says what to do** (`frame/app.js`; frame SPEC § 3, INTEGRATION § 15.3, DECISIONS; noreg
  A31) — « cycle 2610 dépassé, à reconstruire pour 2611 » and « rien de construit pour 2612 », no longer « en attente de
  publication » next to the Data module's « Rien à publier ».
- **Frame: the floating notes rise above a view's sticky bar** (`frame/app.js`, `frame/frame.css`; frame SPEC § 3,
  INTEGRATION, DECISIONS; noreg A45) — on a phone Fuel's result bar is no longer covered by a note.
- **Launcher: one named User-Agent for every outgoing request, each failure said in the console** (`tools/outbound.py`,
  `tools/launch.py`, `tools/regen_jobs.py`, `tools/aero_fetch.py`, `tools/proc_sia.py`, `tools/proc_ead.py`; frame
  INTEGRATION § 15, DECISIONS; noreg I20) — the IVAO sign-in failed (« IVAO discovery: HTTPError »): Cloudflare refused
  urllib's default User-Agent; the messages now carry the HTTP code; host, path and code in the console, never a token.
- **Fuel: the sheets editor is removed, the « Fiches » list is read-only** (`modules/fuel/module.js` −556 lines, V3 § 10.34 A2
  step 5; help ×4; F79) — sheets are edited in Maintenance › Appareils only; Fuel keeps the list, « Utiliser » and the links
  « Modifier / Créer dans Maintenance »; `perf_prompt.js` moves to `modules/aircraft/`.
- **Maintenance: the performance-sheets editor moves from Fuel to « Appareils »** (`modules/aircraft/sheets.js`, `sheets_texts.js`,
  V3 § 10.34 A2 step 3; help ×4; M6–M11) — Fuel's « Fiches » code moved, not rewritten (Fuel keeps its copy for now): list by
  family with search, editor, imports with the preview, export, removal; new: the origin and date of each field, the tabs
  Flotte / Fiches kept on the device, `#aircraft?sheet=<id>`, and the status line « N appareils, M fiches ».
- **Flight plan export: APP as the ARINC identifier, CYCLE of the published base** (`frame/lib/fms.js`, `procedures.js`
  `arincApp`; `compatible({ star })` for approach transitions) — « APP I02 », « CYCLE 2610 ».
- **Map and Fuel: approach labels without repeats** (`modules/maps/choose.js`, `frame/lib/procedures.js` `transitionLabelOf`;
  Fuel and Map help ×4, maps SPEC, frame INTEGRATION; noreg D70, F66, procedures unit page). The runway tag goes when the label
  already says it ("ILS 02", not "ILS 02 02"); a transition whose published name starts with its IAF reads "via MOLBA 1E" (not
  "via MOLBA · MOLBA 1E"), in Fuel's list as on the Map; the Map's small labels of the approaches read the list's label ("ILS 02",
  not "ILS LOC RWY 02"), the published name staying in the row's title.

- **aerodb: openAIP aerodromes carry `bearing`, `hardLen`, `water`, `runways` and `magVar`; parser version 20** (`shared/aero_sources.js`, `shared/sia_base.js`, `frame/aerodb/catalogue.js`; SPEC § 2, DECISIONS 30 Oct; noreg K58) — derived from the export's runways and `magneticDeclination`, as the SIA gives them to France; zones built before show as outdated until rebuilt.
- **Launcher: procedure jobs per State; merge, download and environment rules for every job** (`tools/regen/proc.py`,
  `tools/proc_sia.py`, `tools/regen_jobs.py`, `tools/regen/base.py`, `tools/regen/base_sources.py`; frame INTEGRATION § 15,
  DECISIONS; noreg I19, K22): `proc/fetch`, `build`, `purge` for LF (SIA eAIP) and K (FAA CIFP) — EAD States stay one
  aerodrome at a time; nothing is written into `data/` while a merge is pending; downloads are capped and stay on their host.
- **Map: on a direct route the SIDs and STARs rank by heading** (`modules/maps/choose.js`, `texts.js`, `style.js`; maps help ×4,
  DECISIONS; noreg D74). With no point and no airway between the aerodromes, no more "exit AMOLO" after "AMOLO 7A": the rows rank
  by the angle between their exit (entry) and the great circle to the other aerodrome, "Towards LFPO" over those within 60°, a
  small arrow along the way flown on each row.

- **Map: the choose view frames the aerodrome, not every entry** (`modules/maps/choose.js`; maps help ×4, DECISIONS; noreg
  D73). The view fits the aerodrome, its runways and the points of the compatible procedures within 40 NM of it (LFPO opens at
  zoom 8.5 instead of 7); a chosen procedure leaving the view widens it to that procedure alone.

- **Fuel: the walk's small anomalies** (`modules/fuel`, `frame/lib/adnames.js`; F78) — one distance « procédures comprises »,
  « TOD avant l'arrivée », « SID → AMOLO 7A », one row per same-name SID with its runways, names no longer in capitals, « · » spaced.
- **Data: the same Download · Build · Purge panel for every group** (`modules/data/`; help ×4; noreg L16, L17): Procedures (States ticked from the green and orange ones), VFR points (the cycle in force, in the Base group), Aircraft (ICAO types typed in a field, empty = the fleet's; the run lines are the three steps) and the airline's published sheets (`aircraft/publish`: dry plan, one question with counts and size, then the real run) get the panel of the aeronautical base, on `regen/job { set, verb }`. The launcher's verbs are read once (`regen/verbs`): a verb it does not know greys its button with one sentence per panel (an older launcher: the base only). One operation at a time across all panels, found again at the opening; journal entries carry `set` and `verb`; a purge runs dry first and asks once; nothing committed by Download or Purge, nor by `aircraft/build` (AircraftDB/ is not versioned). No « Update all » yet.
- **Fuel: the route text no longer repeats the SID at each return from the Map** (`frame/lib/route_text.js` `glueProcWords`,
  `compactName`; F69, F77) — names published with a space (« AMOLO 7A ») are one ICAO designator « AMOLO7A »; Auto routes from the SID's exit.
- **Launcher: jobs of the VFR set; a reduced environment and one path rule for every job** (`tools/regen/vfr.py`,
  `tools/regen_jobs.py`, `tools/regen/aircraft.py`, `tools/regen/base_sources.py`; frame INTEGRATION § 15, DECISIONS; noreg I17,
  I18): `vfr/fetch`, `build`, `purge` for the Data module (V3 § 10.34 A1); the jobs' subprocesses never see the launcher's
  credentials; no purge follows a link or a junction.

- **Map: TOC and TOD in place on Fuel's constrained path** (`modules/maps/profile.js`; noreg D42). Fuel's cruise drifts by a
  few feet (24,980 → 24,970 ft) and the top was read to the foot, so TOC slid to the end of the cruise or TOD to its start
  (LFBO → LFPO: TOC drawn at 290 NM instead of 77). Both are now read within 100 ft of the top; a real step climb still tops
  at the higher level.

- **Maintenance: the « Appareils » module, the fleet** (`modules/aircraft/`, V3 § 10.34 A2; help ×4; area M, M1–M5) — the
  company's fleet as a list with search, add, edit (the changed fields said before writing) and retire (a question).
- **Launcher: jobs of the aircraft set, and the list of loaded verbs** (`tools/regen/aircraft.py`, `tools/launch.py`; frame
  INTEGRATION § 15, DECISIONS; noreg I17, I14): `aircraft/fetch`, `build`, `purge`, `publish` for the Data module (V3 § 10.34
  A1), `GET /__setup/regen/verbs`; IVAO's refusal code shown only for a sign-in in progress of the device.
- **Aircraft sheets: the crosswind limit is a field of the schema** (`frame/aerodb/sheets.js` PROFILE_FIELDS `maxCrosswindKt`,
  « Piste et alternat », kt, not in .lnmperf; F76) — read by Fuel's wind colours (§ 10.30), edited in the sheet form (§ 10.34 A2).
- **Map: one value escaped, one stale comment** (`modules/maps/choose.js`, `layers.js`). The wind severity on a runway row goes
  through `esc()` like every other attribute (defence in depth from the security review); the Coverage layer's comment no longer
  says it lights itself (the automatic lighting went on 29 Oct, § 10.29 h).

- **Settings › IVAO account without an application** (`tools/launch.py`, `frame/app.js`, `frame/settings/settings.js`;
  Settings help ×4, frame DECISIONS; noreg A44, I14, I10): the button is off with the reason
  (this workstation or the relay) and nothing leaves; on the workstation a link opens the « IVAO application » assistant;
  IVAO's own refusal is said with its code, a stray return in a plain sentence, never « (state) ».
- **Settings: the IVAO application assistant** (`frame/settings/launcher.js` `ivaoAppHtml`, `tools/launch.py`; help ×4; A43) — a card
  "IVAO application (pilots' sign-in)" in the Administration group (`#settings?card=ivaoapp`, linked from the keys panel): the
  steps at developers.ivao.aero, the return addresses to declare (`GET /__setup/secrets` now answers `ivaoRedirects`) with a Copy
  button each, the Client ID and Client Secret given once to `secrets/ivao_oauth.json` through the launcher, never read back;
  "Test" (`secrets/test?service=ivao_oauth`) reads IVAO's OpenID discovery document again.
- **Frame: one criterion for the layout and the computer's design** (`frame/app.js`, `frame/index.html`; INTEGRATION
  § 9.1, DECISIONS; noreg A42): a computer's window wider than high no longer falls into the phone's landscape rail;
  Aqua applies exactly with the computer's rail with labels.
- **Tests: one heavy noreg pass at a time** (`tests/v3/run.py`; tests README, frame DECISIONS): a full pass or any pass of
  more than 30 cases takes a lock in the computer's temp folder, shared by every worktree; a second full pass refuses with
  the holder named, or waits with `--wait`, a heavy targeted pass waits for its turn; a stale lock is ignored.
- **Tests: K49 checks its own profile only** (`tests/v3/cases/aerodb.py`; frame DECISIONS): the build job's temporary
  browser profile is followed by name, no longer compared with everything in the shared temp folder.
- **Fuel: the route field completes at the cursor** (`modules/fuel/routecomplete.js`; help ×4; F75) — SID / STAR names, nearby
  airways, points and navaids, seven at most; the word is written at the cursor.
- **Fuel: Auto names the airway that joins two points but is closed at the leg's level** (`frame/lib/routing.js`
  `joiningAirway`; help ×4; F74) — « A34 relie LACOU à LMG, fermée au FL260 (ouverte de 6 500 ft au FL195) : tronçon direct ».
- **Tests: the choose-mode cases and D68 hold under load** (`tests/v3/cases/maps_recode.py`). D60 read the pane before it was drawn
  (the mode's state is ready a moment before the sheet): the cases now wait for the pane itself, and a missing group says so;
  their waits are 10 s. D68 checks the rule rather than a timing: a full drawing during a drag is only the one of rest (no copy
  for 140 ms), never one closely following a copy. Ten runs of D60 under load green, six of the eight neighbours.

- **Security: three gaps of the inventory closed** (`tools/launch.py`, `tools/data_sync.py`,
  `frame/store/transport_github.js`; frame DECISIONS; noreg I16): the local network's pairing accepts a code from its own
  page only; every file path given to git is a name, never a pattern; the GitHub transport, like GitLab's, never follows a
  redirect with the token.
- **Fuel: each chosen procedure is one group row of the points list** (`modules/fuel/module.js` renderPts; help ×4; F73) —
  « SID NTS1A · 2 points », its fixes under a tap, never at the rank of the typed points; « Points (N) » counts points and groups.
- **Fuel: the procedure card opens folded** (`modules/fuel/procedures.js`; help ×4; F72) — one summary line per side, a tap
  unfolds its lists, one side at a time; readable without scrolling on a phone.
- **Noreg: 2.6 times faster, and a targeted pass before a push** (`tests/v3/run.py`, `tests/v3/domains.py`,
  `tests/v3/cases/aerodb.py`; tests README, frame DECISIONS): the static cases beside the browser workers, the slowest
  jobs first, 10 workers by default (the full pass in 359 s instead of 926 s); `--touched` = the changed files' cases plus
  a smoke base of twelve; each case's seconds and the 20 slowest in the report; K51 waits for the page's answer, never a
  fixed 40 s, and names the race when it fails.
- **Map: inventory "à refondre" of 28–30 Oct** (`modules/maps/DECISIONS.md`, docs only). Per zone (choose mode, labels and the
  collision pass, panning, runways, procedure labels, flown trail): what was done then undone, what is left doubled or dead, and
  the target form in one sentence, with an order for after the stabilisation.
- **Map, choosing on the map: SIDs and STARs towards your route first; aerodromes named by the shared rule**
  (`modules/maps/choose.js`, `draw.js`, `render.js`, `texts.js`, `style.js`; help ×4, maps SPEC; noreg D71, D72; V3 § 10.31,
  § 10.30). Among the procedures that fit the choice, the SIDs whose exit and the STARs whose entry is on the typed route come
  first under "Towards your route" ×4, the others after, marked "exit LACOU" / "entry OKRIX" ×4 (`compatible({ route })`,
  `exitOf`, `entryOf`). Close in, the aerodromes' labels read `adTitle` of `frame/lib/adnames.js` ("LFPO Paris-Orly"), the
  name rule Fuel uses.
- **Frame: the aerodrome name next to its code, one rule** (`frame/lib/adnames.js` `adLabel`, `adTitle`, `adLine`; bench F71) —
  « LFPO Paris-Orly » for the Map's pin and Fuel, from the rule Fuel had.
- **Fuel: the route text is a view of the procedures** (`frame/lib/route_text.js` `withProcedures`, `proceduresOfText`,
  `textFromTokens` dct; `frame/lib/procedures.js` `exitOf`, `entryOf`, `compatible({ route })`; help ×4; F69, F70) — ICAO form with
  DCT, the SID and STAR names written from the choice and read back from an edit; « NTS1A sort à NT102 : NT102 DCT LUGEN ».
- **Map: from the airline's zoom, every aerodrome shows its runways and its name** (`modules/maps/procs.js`, `draw.js`,
  `render.js`, `lib/aero_symbols.js`; help ×4, maps SPEC; noreg D71; V3 § 10.30 fourth reading, point 3). Above `runwayZoom`
  each aerodrome drawn has its runways read on demand and drawn as thin 24 px vectors with their numbers at the thresholds, in
  the labels' collision pass right after the aerodromes; its label reads its code and name ("LFPO PARIS ORLY"). Below the zoom
  nothing changes.
- **Map, choosing on the map: approaches as the SIA publishes them** (`modules/maps/choose.js`; help ×4, maps SPEC § 5.1;
  noreg D66, D70; V3 § 10.30, fourth reading). The approach rows are the finals by their short label ("ILS 06", "RNP 06";
  `labelOf`), the published name in the tooltip; the initial approach segments the SIA publishes once for the runway are
  transitions under the chosen final ("via ODILO · ODILO 1A"; `transitionsOf`, `transitionLabelOf`), in the final's hue; a
  transition meeting the final on no shared point is joined to it by a dashed line.
- **Fuel: a typed airway is never read as a point** (`modules/fuel/module.js` routePoints, `frame/lib/routing.js` `along`,
  `corridor`; help ×4; F68) — « GILUX A3 MOTAL » no longer goes to a point « A3 » near Gibraltar (1 871 NM); the airway is followed
  only along its own nodes, else the leg is direct and a line says so.
- **Fuel: « Auto » is idempotent and routes the SID exit** (`modules/fuel/module.js`, `frame/lib/route_text.js` `provenance`;
  help ×4; F8, F28, F67) — it recomputes from the pinned points and replaces what a previous Auto wrote (no more loops through
  Spain on LFBO → LFPO); a leg left direct says why; « LFBO LACOU7B LACOU LMG » routes LACOU → LMG.
- **Map, choosing on the map, third reading: what is looked at goes on top** (`modules/maps/choose.js`, `texts.js`, `style.js`;
  help ×4, maps SPEC § 5.1, DECISIONS; noreg D60, D69; V3 § 10.30). The highlighted procedure is drawn last with its own label
  and full name, the others below (⌛, ⚠, compatible, chosen); one small label per family and point ("NIMER 9"), never one per
  procedure of a family, dropped when there is no room. Hovering a row of any family highlights its trace (and a trace its
  row); a tap leaves the row highlighted. Runway rows show `wind.label` (↓ head, ↑ tail, ← from the right, → from the left) in
  the colour of `wind.severity` (green, orange, red) ×4. The summary at the top is the table of contents: three lines always,
  a tap on a family's label scrolls to its group and unfolds it, ✕ clears.

- **Tests: C1 names the failures of the sheet bench** (`tests/v3/cases/sheet.py`): the bench's rows are
  `{ name, ok, detail }`; the case looked for the text « FAIL » in them and always listed none. It now names up to five
  failed assertions with what they measured.
- **Map: one label per airway segment, one collision pass by priority** (`modules/maps/render_airspace.js`, `render.js`; maps
  SPEC, DECISIONS; noreg D67; user, 30 Oct: "toujours ce recouvrement", the leg towards Le Blanc). The same segment read by
  several boxes of the corridor was labelled once per copy, the copies sliding along the line ("22", "F065" repeated). A segment
  is now drawn and labelled once, distance and level on one line ("22 · F065"), only when it is longer on screen than its
  label, the longer segments first. The labels' single collision pass now follows the priority of V3 § 10.30: the procedures
  (highlighted, then chosen), the route's segments, the airway boxes, aerodromes, navaids and fixes, then the rest (the towns no
  longer reserve their room before everything else).
- **Map: fluid panning on a dense map** (`modules/maps/draw.js`, `screen.js`, `render.js`; maps DECISIONS; noreg D68; user, 30 Oct:
  "déplacement de carte sur la région de Paris : très saccadé (2 fps ?)"). Every move event of the base map redrew the whole
  overlay — every airspace ring re-projected, every label placed again, several times per frame. During a gesture the last full
  image now follows the map by its two geographic corners (one copy, no projection), other drawing requests wait, and the full
  drawing comes once at rest (end of the gesture, or 150 ms without movement). The drawing context's proxy no longer binds a
  new function at each call. Measured (synthetic dense base, 20-step drag): 51 full drawings of 8–12 ms during the drag before,
  none after (20 copies of 0.2 ms, one full drawing at rest).

- **Approaches the SIA way: initial segments are transitions, finals read short** (`frame/lib/procedures.js` `isAppTransition`,
  `labelOf`, `transitionLabelOf`, `appChoices`; `frame/lib/flight_path.js` junction at the first common point; Fuel's approach list;
  help ×4; F66) — no more six identical « INA RNAV RWY 06 » rows at LFPO: « ILS 06 » via « ODILO · ODILO 1A ».
- **Map: the runways as 24 px threshold vectors from the airline's zoom; the choice above the base's labels** (`modules/maps/procs.js`,
  `draw.js`, `data.js`, `render.js`, `layers.js`, `choose.js`; help ×4, maps SPEC, DECISIONS; noreg D58; V3 § 10.30, fourth
  reading). The full-length runway arrow of § 10.24 is gone: every runway of the departure and arrival aerodromes is a short
  screen vector from its threshold along its true bearing, the designator behind the threshold, the chosen one bold in its
  side's hue, from `runwayZoom` of `airline/map_profiles.json` (8 to 16, 11 by default; Settings › Administration) only; the
  runways are read with the flight even without a chosen procedure; the thresholds page loses `procRwy`. In the choose mode the
  airway boxes go under the dim veil, so the mode's traces, vectors and labels are above every label of the base.
- **Wind on a runway: arrows where the wind blows, and three colours** (`frame/lib/wind.js` `label`, `severity`; Fuel's runway
  list and side title; help ×4; F62, F64, F65) — « ↓ 12 kt » is a head wind (the runway drawn upward); green, orange, red by one rule.
- **Fuel: each side's title ends with the summary of its choice** (`modules/fuel/procedures.js`, `summaryOf`; help ×4; case F65) —
  « 13R · ↑ 12 kt », « MEN1A via NEPIX », « I13R », the same text as the Map's pane.
- **Map, choosing on the map, second reading: compatible rows only, families as rows, condensed** (`modules/maps/choose.js`,
  `texts.js`, `style.js`; help ×4, maps SPEC § 5.1, DECISIONS; noreg D60, D66; V3 § 10.30 second reading, the user after
  af261d3e3: "en trois clics … qu'on ne voie que les compatibles, mais qu'on puisse changer facilement … condenser"). The three
  families stay visible, any order; each choice narrows the two others to what fits (`compatible`), the rest folded under one
  thin "N more · All" line ×4 that unfolds it marked ⚠. A STAR / SID family (OKRI5L, OKRI5R) is one row "OKRI5" with runway
  tags (`familiesOf`): chosen before its runway it waits, the runway resolves the record (`firstServing`). The chosen
  approach's transitions are sub-rows ("No transition" first, key `apptrans`). The selection reads at the top, one line per
  family with ✕ (`summaryOf`, Fuel's text); the wind uses `wind.label` (arrows where the wind comes from, as in Fuel). Rows
  are 36 px, no gap (the frame's 44 px minimum set to 0 in the pane).
- **Frame: procedure families, compatibility and the choice summary** (`frame/lib/procedures.js`: `familyOf`, `siblingsOf`,
  `familiesOf`, `compatible`, `summaryOf`; bench F32) — the rules of the Map's three-tap pane and of Fuel's side title (§ 10.30).
- **Fuel: the Map's choice comes back in one trip, and each runway shows its wind** (`modules/fuel/procedures.js`, `module.js`,
  `frame/lib/wind.js` `label`; help ×4; cases F63, F64) — runway, procedure and approach applied together with one change line;
  « 13R — ↑ 12 kt · ← 6 kt » from the known METAR, orange for a tail wind over 5 kt.
- **Map: no error when it is left right after it mounts** (`modules/maps/module.js`, `data.js`, `profile_view.js`,
  `mission_view.js`; noreg D65; reported by Features SOG, F41 / F63 under load). The mount, `readFlight`, `applyFlight`,
  `readSettings`, `buildProfile` and `applyMission` resumed after an await on the state the teardown had cleared (TypeError on
  `S`); every resumption now checks the Map is still there first. D65 slows the Map's readings and leaves it at five moments of
  its mount (no error), and checks that leaving the choose mode from outside adds no return of its own (the return to Fuel is the
  pane's ✕ / Escape / "Terminer" only).

- **Data layer: the trial base frozen like a device's** (`frame/store/frame_data.js`; INTEGRATION § 4, DECISIONS): a
  `reference` copy without a revision is deep-frozen at each read too, so that a module writing on a record fails in the
  noreg rather than on a device.
- **Taking up a rewritten history, security review** (`tools/data_sync.py`, `frame/settings/launcher.js`; SYNCHRONISATION
  § 10, frame DECISIONS; noreg I15): paths are file names, never patterns; accented names read as they are; a file outside
  the synchronised data that this computer had committed is copied back into `data/`, never sent, and the plan says so ×4.
- **Map: choosing on the map in one pane, the selection kept, one trip back to Fuel** (`modules/maps/choose.js`, `texts.js`,
  `style.js`, `sheet_view.js`; help ×4, maps SPEC § 5.1, DECISIONS; noreg D60, D62; V3 § 10.30, after the first group tests:
  "sa version Sur la carte n'est pas convaincante"). The pane lists the side's families at once — runway, SID or STAR,
  approach (its transition folded under it) — each "Aucune" first, compatible rows then ⚠, six rows and "N more…". A tap on a row
  or a trace adds that choice to the pane and leaves it drawn (every runway, the one in force bold; the family touched whole, its
  other procedures dimmed; the other families' choice in its hue). A procedure serving one runway sets it when none is chosen;
  otherwise a line under the group offers the correction in one tap ("OPAL2E sert la 25 — Passer en 25", "OKRIX5A ne sert pas
  la 07 — Choisir OKRIX5B"; `runwayOf`, `firstServing`). Each runway row carries the wind of the METAR already known ("↑ 12 kt ·
  ← 6 kt", tail in orange above 5 kt; `components`; no METAR, no line). "Terminer", ✕ or Escape return once:
  `#fuel?focus=<side>&rwy=…&star=…&app=…&apptrans=…`, one key per family touched, `none` for "Aucune"; the Map writes nothing.
  The runway chips go (the runway group replaces them).

- **Map: every element invisible in the general view** (`modules/maps/render_airspace.js`; noreg D64; user, 30 Oct: "tous les
  éléments sont invisibles, même à complexité > 0, sauf si on zoome très fort"). Since the data layer deep-freezes the published
  base (shared references, 802e6856f), the corridor selection's cache of an airspace's box, written on the record itself
  (`a._mb ??=`), threw a TypeError; the reading of the corridor was lost whole, so the general view showed the route and the
  procedures only, until a zoom close enough to read without the corridor. The box is now kept in a `WeakMap`; D64 runs the Map
  on a frozen base (as on the device) and checks airspaces and aerodromes in the general view and at zoom 9.

- **A rewritten data repository: refused, then « Take up the new history »** (`tools/data_sync.py`, `tools/launch.py`,
  `frame/settings/launcher.js`, `frame/app.js`, `frame/store/frame_data.js`, `shared/sync.js`; SYNCHRONISATION § 10, frame
  DECISIONS, Settings help ×4; noreg I15): a remote branch without a common ancestor is never merged and is said ×4;
  on the launcher's computer, Settings › Administration › Remote repository takes up the new history after showing the
  plan (old branch kept in `refs/sog/`, pool files carried over, files outside the pool never pushed), then synchronises.
- **The flown track stays on the device** (`frame/app.js`, `frame/store/frame_data.js`, `modules/maps/flight_time.js`; frame
  SPEC, INTEGRATION § 6, DECISIONS; noreg A35, D61): the track is kept in the device's data (never synchronised, never in a
  backup) and read with `ctx.live.trail()`; the shared current flight carries the position only. The group usage's
  status line says so ×4.
- **Map, choose mode: one scrolling surface** (`modules/maps/choose.js`, `style.js`, `texts.js`; help ×4, maps SPEC § 5.1; noreg
  D60). The list scrolled inside the sheet that scrolled too (two scrollbars, V3 § 10.30). It now shows "Aucune" and six
  procedures, the others folded under "N more…" ×4 which unfolds them in place (a procedure highlighted from the map unfolds
  them too); only the sheet scrolls.

- **Settings: the runway thresholds zoom** (`frame/settings/admin.js`, `admin_links.js`, `settings.js`; V3 § 10.30) — Settings › Administration (Full level) has the line « Seuils de piste sur la carte »: a list from 8 to 16 (11 by default), saved
  at once for the airline in `airline/map_profiles.json`, key `runwayZoom` (the rest of the file kept, like `edge`); the Map draws
  the runway thresholds from that zoom and reads the key with its profiles (`frame/settings/INTEGRATION.md` § 4); help ×4; case A12.
- **Frame: wind components on a runway, and the runway a procedure serves** (`frame/lib/wind.js`, `frame/lib/procedures.js`;
  benches F62, F32) — the rules the Map's pane and Fuel share for § 10.30.
- **Tests: D61 is deterministic** (`tests/v3/cases/maps_recode.py`). Its reread was stamped `updated_at` in whole seconds; on a
  warm browser the write could fall in the same second as the flight's own stamp, and the Map, which rereads only a strictly
  newer record (a correct rule: real writers stamp milliseconds), rightly ignored it — one run in seven under load. The reread
  is now stamped strictly later, and the case waits for the expected track itself (20 s) instead of a length.

- **IVAO sign-in through the relay (R1b)** (`tools/launch.py`, `frame/app.js`, `frame/settings/settings.js`; frame
  SPEC § 3.11, INTEGRATION, DECISIONS, Settings help ×4; noreg I10, I14, A41): Settings › IVAO account links a device to
  the pilot's IVAO account (OpenID code flow with PKCE run by the launcher, which keeps the application's secret); the
  tokens stay on the device and are renewed through the launcher; « Unlink » revokes the token at IVAO when it can;
  the sign-in can be tried on the workstation without the relay (return `http://127.0.0.1:<port>/__relay/ivao/callback`).
  Tested against a simulated IVAO, not exposed.
- **Tests: E3 no longer depends on the clock** (`tests/v3/cases/atmosphere.py`). The sheet title gives the departure with its day
  when it is not today (`fmtWhen`, a correct rule); the default departure being the next hour, after 23:00Z it is tomorrow and
  the case, which expected "HH:MMZ" alone, failed every night. It now accepts an optional day before the time.
- **Fuel: the flight plan for the simulators** (`frame/lib/fms.js`, `frame/lib/test/fms.html`, `modules/fuel/module.js`; SPEC, DECISIONS,
  help ×4; noreg F60, F61) — step Departure downloads the route and the chosen procedures as X-Plane `.fms` (11/12 and 10) or MSFS `.pln`.
- **Launcher: the airline's relay, devices and codes (R1a)** (`tools/launch.py`, `tools/relay_access.py`,
  `frame/settings/relay_devices.js`, `frame/app.js`; frame SPEC § 3.11, INTEGRATION, DECISIONS, Settings help ×4; noreg
  I10, I13, A40): `launch.py --relay <host>` serves the Pilot application to paired devices behind a reverse proxy (https
  only), the Pilot app's routes only, writes signed with the device's trigram; the administrator issues pairing codes and
  revokes devices in Maintenance › Relay devices. Never with the local network (`--lan` refused); the pairing page is
  never framed. Security review: the relay on its own port (`--relay-port`, everything there is the relay's; the proxy
  targets it and keeps `Host`), a proxy request on the interface's port refused, start check of the public host, pairing
  from the same origin only, no space or control character in the return path, cookie `SameSite=Lax`. Tested on the
  workstation only, not exposed.
- **Fuel: the aerodrome fields search by full name** (`modules/fuel/module.js`, `adnames.js`, DECISIONS; help ×4; case F48) — only a
  chosen or typed code reaches the route; leaving without a choice goes back to the saved aerodrome.
- **Maintenance › Pilots' tokens, security review** (`tools/launch.py`, `frame/settings/pilot_tokens.js`; frame
  DECISIONS; noreg I12, A39): the administrator's token never follows a redirect; only a pilot's token can be revoked;
  a new token's value is wiped when the screen is left; the screen advises turning off CI/CD on the data project.
- **Data: "Télécharger" and "Purger" next to "Construire"** (`modules/data/module.js`, `model.js`, `texts.js`; help ×4; noreg L14, L15).
  The Aeronautical base panel (now "Télécharger, construire, purger" ×4) holds the three launcher verbs on one choice of zones, in
  this order: **Télécharger** (`base/fetch`, `args { zones, personal }`: ENAIRE only when ticked) follows the job with one line per
  zone ("n / m sources") and one per source (downloaded n files, unchanged, failed with its code and HTTP status, skipped:
  licence not declared, manual); the end says "Téléchargé : n zones changées, m inchangées ; k échecs", lists the manual sources
  by name ×4 ("à déposer à la main", a link only for an `https://` address), warns of tracked source files changed outside the
  synchronised data, says "Rien à télécharger pour ces zones" when nothing is downloadable, and tells "Réessayez dans n s" on a
  429. **Purger** (`base/purge`) first runs the plan (`dry`), then asks ONE question ("Purger n fichiers (x Mo) des sources de …",
  with the SIA sentence when France is in it and the count of files tracked by git that are kept), nothing on No, the real job on
  Yes ("Purgé : n fichiers, x Mo", refused paths said); an empty plan says "Rien à purger" without a question. One operation at
  a time: the four verbs share one grey reason; a download or a purge found running at mount is followed like a build. Sizes
  are written with the language's decimal separator; the journal records `download` and `purge` (never the plan).

- **Maintenance: the pilots' tokens** (`frame/settings/pilot_tokens.js`, `frame/app.js`, `tools/launch.py`; frame SPEC,
  INTEGRATION § 13, DECISIONS, Settings help ×4; noreg A39, I12): on the launcher's computer, the administrator creates
  a GitLab project access token per pilot (shown once), sees them all and revokes one — the launcher keeps the
  administrator's token and never shows it.
- **Fuel: the aerodrome's name under its code, and progressive completion** (`modules/fuel/adnames.js`, `module.js`; SPEC, DECISIONS, help x4;
  cases F44-F47) — a fixed line « LFPO — Paris-Orly » under the departure, arrival and alternate, seven suggestions at most from two
  characters (↑ ↓ Enter Esc, touch), the names in step 5's summary.
- **Map: "Source" on the aerodrome card; one doubt rule** (`modules/maps/procs.js`, `choose.js`, `texts.js`; help ×4, maps
  SPEC; noreg D63). Each chosen procedure whose record carries an `https://` `source.url` (aerodb, V3 § 10.25) gets a
  "Source" ×4 link to its published page, in a new tab with `rel="noopener noreferrer"` ("Source STAR" / "Source APP" when
  both have one); a record without a public page has no link, its document named in the row's tooltip. The choose mode now
  filters with `isDoubt` from `frame/lib/procedures.js` (the rule of Fuel's lists) instead of its own copy. The flown trail read
  from the frame is cut to `TRAIL_MAX` before it is read and drops points off the Earth (|lat| > 90, |lon| > 180; noreg D61).

- **Frame: a data token never goes to a new host** (`frame/store/transport_github.js`, `frame/store/transport_gitlab.js`,
  `frame/settings/access.js`; frame DECISIONS; bench A38): the saved token is reused only for the same provider, host and
  project; pasting another address asks for its token; the GitLab transport follows no redirect and accepts only an
  `https://<host>/api/v4` address.
- **Frame: Maintenance at its own level, without Pilot's welcome** (`frame/app.js`; frame DECISIONS; noreg A36): the
  Maintenance application runs at the Complet level whatever the level chosen for Pilot, and no longer shows Pilot's
  first-visit tutorials.
- **Launcher: a job stopped by a fatal interruption ends in error** (`tools/regen_jobs.py`; frame DECISIONS; noreg I8): never
  « running » for ever; the decisions also say that no guard rests on the application chosen by the address.
- **Fuel: a flight dated in the past says so** (`modules/fuel/module.js`, SPEC, DECISIONS; case F43) — weather and NOTAMs no longer
  apply; nothing is blocked.
- **Fuel: « Source » opens the coded page of the chosen procedure** (`modules/fuel/procedures.js`; SPEC, DECISIONS; help ×4;
  case F42) — the SIA's public page, in a new tab.
- **Map: the flown trail comes from the frame; "Choose on the map" on the aerodrome card** (`modules/maps/flight_time.js`,
  `choose.js`, `procs.js`, `texts.js`, `style.js`; help ×4, maps SPEC; noreg D61, D62). The trail starts from
  `progress.actual.trail` (`[lat, lon, altFt, s since started.at]`, written by the frame), read again at each reading of the
  flight, so a change of tab no longer loses it and its older points are kept; the Map only adds its own positions newer than
  the frame's last point (before, the frame's points were not read at all and a reread could double them). The card of the
  departure or arrival aerodrome offers "Choisir sur la carte" ×4 next to "Changer" (full width on a phone): the choose mode
  for that side, on the family the flight lacks, by the same code as `#maps?choose=` without a reload; leaving the mode gives
  back the flight's frame.

- **Base build on the launcher: the browser's temporary profile is always removed** (`tools/regen/base.py`; DECISIONS; test K49) — a
  late browser process could re-create it right after the job deleted it.
- **Frame: the data repository on GitLab** (`frame/store/transport_gitlab.js`, `frame/store/transport_github.js`,
  `frame/settings/access.js`, `frame/app.js`, `tools/launch.py`; frame SPEC, DECISIONS, Settings help ×4; noreg A38, I11):
  paste a GitLab project's address (gitlab.com, framagit…) and the project access token the administrator gave you —
  the app reads and writes the data there as it does on GitHub; the launcher keeps a GitLab secret without ever showing
  it.
- **Fuel: « On the map » next to each side of the procedures** (`modules/fuel/procedures.js`, `module.js`; SPEC, DECISIONS, frame
  INTEGRATION § 6.1; help ×4; case F41) — opens the Map's choice mode, and the choice made there comes back into Fuel, said.
- **Frame data layer, security review** (`frame/store/frame_data.js`, `tools/regen_jobs.py`; INTEGRATION § 4,
  DECISIONS): a shared reference value is deep-frozen when parsed (a reader can no longer change it for the others; about
  44 ms once per revision for the largest zone); a job's zone outputs are dropped in a `finally`.
- **Frame: applications** (`frame/app.js`, `frame/settings/admin_links.js`, `frame/settings/admin.js`; frame SPEC § 3.1,
  INTEGRATION, DECISIONS; noreg A36): one frame, named sets of modules chosen by the address — Pilot (default) and
  Maintenance (`/frame/?app=maintenance`: Données, Administration, Aide, and the V2 maintenance page with a launcher; read
  only elsewhere); Pilot's Réglages › Administration opens Maintenance, and Pilot no longer carries Données.
- **Frame: a module can publish on the user's gesture** (`frame/store/frame_data.js`; INTEGRATION § 4, DECISIONS; noreg
  A37): `data.sync({ gesture: true })` is the header button's pass and returns the launcher's report (sent, kept,
  received, conflicts, merge settled) — for « Publier » of the Données module.
- **Frame: « Stop » cancels a launcher job again** (`frame/lib/launcher.js`; INTEGRATION § 15.1, DECISIONS; bench A29):
  declaring a job's route also allows its cancel, which the client sends when the user stops a job.
- **Launcher: a job's headless page claims its token once** (`tools/regen_jobs.py`, `tools/launch.py`; frame
  INTEGRATION § 15.1, DECISIONS; noreg I8): `POST /__setup/regen/job/claim` hands the running job's token, and what its
  verb offered, once — the base build of D5 needs no exception to the same-origin check.
- **aerodb: the « Source » link only points to the SIA** (`frame/aerodb/aerodb.js`; SPEC, DECISIONS; test K1) — a link is given only
  when the aerodrome file's base address is on the SIA's site, so an edited file cannot turn it into a link elsewhere.
- **Weather (Atmosphere): choosing the layers no longer hides the cut, one tap is one toggle** (`modules/atmosphere/module.js`,
  `texts.js`; help ×4, SPEC; noreg E12). The Layers content took the bottom block in place of the cut (user: "choisir les
  éléments météo masque le profil vertical"), and its whole HTML was rewritten at each box and on every status update, so a
  rewrite between press and release lost the tap ("certaines coches doivent être cliquées deux fois"). The layers are now a
  panel over the map under their button (scrolling on a phone, never over the sheet); the cut stays in view and is redrawn
  by each box; the panel is written only when its rows change and the boxes' state is set in place. Its cross ×4, Escape,
  Flight or Details close it.

- **Data: what the download job takes from a server is checked** (`tools/aero_fetch.py`, `tools/navcan_dah.py`; `frame/aerodb/INTEGRATION.md`; test K57) — an
  ENAIRE file name read from its page is written (and the previous amendment removed) only if it matches a strict pattern and stays under `sia/aixm5`; the
  NAV CANADA guide is requested only in https on its own host; a response over 200 MB is stopped and nothing is written.
- **Data: the raw sources of a zone, fetched and purged by the launcher; they leave the data repository** (`tools/regen/base_sources.py`, `tools/data_template/.gitignore`; frame SPEC, INTEGRATION, DECISIONS of `frame/aerodb/`; tests K52 to K56) — the jobs `base/fetch` (downloads the zone's openAIP, FAA, ENAIRE, UK Mil, NAV CANADA and NAT sources through `tools/aero_fetch.py`, no commit; manual sources are listed with their address; the tracked files it modified are counted) and `base/purge` (removes a zone's raw sources and caches; never `sia/base/`, `proc/` or a file tracked by git; dry run). The data template now ignores `sia/openaip/`, `sia/zones/`, `sia/aixm5/`, `sia/geojson/`, `sia/miam-*.xml`, the aircraft HTTP cache and `__pycache__`.
- **aerodb: each eAIP procedure carries its « Source » link** (`frame/aerodb/aerodb.js`; SPEC, INTEGRATION, DECISIONS; test K1) —
  `source.url` is the public address of the coded page on the SIA site, so Fuel and the Map open it in one tap.
- **Fuel: on a phone, choosing a procedure no longer reopens the list; the « Procédures » grid also beside the Map** (`modules/fuel/procedures.js`,
  DECISIONS; cases F34, F35, F38, F40) — and a failed reading says its counts once, translated.
- **Map: choosing on the map, simplified** (`modules/maps/choose.js`; V3 § 10.23, § 10.24; maps SPEC § 5.1, help ×4, noreg D60):
  `#maps?choose=dep|arr&icao=LFXX` (read and removed at mount by `ctx.consume`) opens the Map on the aerodrome's published
  procedures, the base map and the Map's own layers dimmed (`mp-choosing`, the new `dim` option of `MapsRender.draw`), **one
  family per opening** — the first the flight has not chosen yet: departure runway, SID, transition; arrival runway, STAR,
  approach, transitions. Each procedure has one hue of eight (`MapsRender.palette().procHues`, cycled), the same on its row, its
  label and its trace; one label per exit (SID) or entry point (STAR, approach) stacks the names; the transitions are drawn
  only for the highlighted procedure; the runway family draws every runway as an arrow (`arrowOf`, shared with the chosen
  runway's), the chosen one bold. The sheet lists the family ("Aucune" first, seven rows then scrolling, ⌛ and ⚠ from
  `frame/lib/procedures.js`, runway chips as a filter); **one tap on a row, a label or a trace** replaces the address by
  `#fuel?focus=<side>&<key>=<id>` (`none` for "Aucune"); the Map writes nothing to the flight. Doubt records and records without a name are never listed (as in Fuel).
  Fuel's side (the button, the key's consumption) is its own lot.

- **Data: « Construire » the aeronautical base on the launcher** (`modules/data/` `module.js`, `model.js`, `texts.js`, `help/` x4; SPEC § 3, § 5.4, § 6.5; cases L1, L6–L10; V3 data regeneration, D5 front end) — first action of the module, in the Aeronautical base group: a build panel with a checkbox per zone of the coverage (all ticked) and, only when a ticked zone feeds them, the personal-licence sources (ENAIRE, NATS, X-Plane: unticked by default, each with its « only if the data repository is used by you alone » line; a hint when X-Plane is ticked, the build in the page not being possible yet). « Construire » starts `regen/job { set: 'base', verb: 'build', args: { zones, personal } }` through `ctx.launcher.job`; the bar, « n zones sur m », the step, the elapsed time and one line per zone (waiting, building n / m sources, built, failed with the reason of its code, cancelled) follow the job's view; « Arrêter » cancels; at mount `resume` follows a running build, or says « Construction interrompue » (state `interrupted`) or the summary of the last one. One notification with the counts at the end only, the summary and what to do in the panel (partial, failed, cancelled, `no-browser`, `xplane-in-page`), the rows re-read; the grey button says why once (no launcher, another operation running, no zone, offline), the refusals (409, 429 too-soon, 404 unknown route, 400) are worded. The last 50 operations go to `cache/data/journal.json` and to a journal fold at the foot. `meta.launcher` declares `regen/job` and `regen/job/cancel` (a declaration of `regen/job` alone does not cover the cancel call the job client makes). Tests against a fake launcher; the personal-licence table of `model.js` is checked against `shared/aero_zones.js`.
- **Data: « Publier » the base through the frame's gesture sync** (`modules/data/` `module.js`, `model.js`, `texts.js`, `help/` x4; SPEC § 3, § 6.5; INTEGRATION § 1.3; cases L11, L12) — second action of the module, in a panel right after « Construire »: the state of `data/` from `GET sync-status` (n files changed · m commits to send, a pending merge, the last pass), the button « Publier » (44 px) and, one question « Publier n fichiers et m commits vers le dépôt des données ? », `ctx.data.sync({ gesture: true })` (only when the frame carries `ctx.data.sync.gesture === true`: otherwise the button stays grey, never a pass without the gesture). While it runs an indeterminate line shows and « Construire » is grey (and the reverse); the end says what was committed and received, the files of the base kept on the workstation (a build is under way), the conflicts (see Settings › Conflicts), the refused files, or, on a failure, a sentence and the launcher's message as text; one notification with the counts, a journal entry, then `sync-status` and `publication()` are read again. The grey reasons are written once (no launcher, publishing, build running, another operation, frame too old, nothing to publish, offline). `meta.launcher` declares `sync-status`. Tests on a fake launcher and a fake `ctx.data.sync`.
- **Frame: the flown track, privacy** (`frame/lib/trail.js`, `frame/app.js`; frame INTEGRATION § 6, DECISIONS, help ×4;
  noreg A35): points to about 100 m; the track is carried on only for the same start (`trailFrom`); the Status block and
  the help say that, with several users, the track is shared with the group and stays in the repository's history.
- **Frame data layer: listing and reading again cost almost nothing** (`frame/store/frame_data.js`; INTEGRATION § 4,
  DECISIONS; tests open the cache without a version): `list` reads keys only (69 → 0.7 ms on a 17.8 MB cache), a
  reference file is parsed once per revision (a 1 MB zone read again: 8.1 → 2.3 ms), an absent reference is not asked
  again for 30 s.
- **Launcher, security review** (`tools/data_sync.py`, `tools/launch.py`, `tools/regen_jobs.py`; frame DECISIONS;
  noreg I8, I9): no credential in a https address of the data repository, the token alone as user name included
  (refused, dropped from the configured address, cleaned in what the page reads); a job's zone output is taken once and
  dropped at the end of the job.
- **Fuel tests: pure benches, shared fixtures, waits on a state, and `fmtDayZ`** (`frame/lib/time.js`, `frame/lib/test/time.html`,
  `modules/fuel/test/vertical.html`, `tests/v3/fixtures/procedures.py`, `tests/v3/cases/fuel.py`, `tests/v3/lib.py`; V3 § 10.29 h, i; cases F23,
  F39) — `fmtDayZ(iso)` writes « 29/10 16:53Z » (UTC) for the procedures line; the vertical path of the quote (`verticalPath`) has a bench without
  the page, which F23 runs; the invented procedures of the fuel cases live in one fixture file; the fixed pauses of the fuel cases wait for a
  state (`Ctx.quiet`, the document written, the notification said).

- **Fuel: the challenge of 29 Oct applied to the procedures** (`modules/fuel/procedures.js`, `module.js`; V3 § 10.20, § 10.23, § 10.29 f, g;
  cases F16, F19, F21, F26, F36, F37, F38) — choices made in a row are written once (400 ms after the last one, one quote); nothing is locked after
  the start (the « La SID est passée » lock is gone); a conflicting choice is marked ⚠ and says nothing else (no notification);
  « Charger mon OFP » fills only the sides you have not chosen and lists only what it filled; « 3 non lues » counts the pages and records
  of the partly read aerodromes; a failed reading says how many pages were read; `quote.legsAt` is kept while the legs do not change.

- **Fuel: the procedures block has its own file, and the « Procédures » card is redone** (`modules/fuel/procedures.js`, `procedures_texts.js`,
  `module.js`; V3 § 10.29 d, e; cases F34, F35, F36, F11–F31 updated; refactoring 29 Oct d + e) — each side is titled with the aerodrome's
  name (« Départ LFPO Paris-Orly »), carries one muted line « lu le 29/10 16:53Z · Relire · 3 non lues », and its lists sit on one fixed grid, the
  same on both sides (runway · procedure · transition; approach under the STAR), no label cut, one column on a phone; a runway chosen,
  the labels no longer repeat it (« OPALE 2E »); a change of the lists updates the existing selects in place and never moves the focus.

- **Data: a read-only « Données » screen** (`modules/data/` `module.js`, `model.js`, `texts.js`, `help/`; `frame/app.js` registry; SPEC § 3, § 6.2,
  § 9; cases L1–L5; V3 data regeneration, first lot) — Full level (level 3); not a place of Pilot's rail: the heart of the future « Maintenance » application (user, 29 Oct), reached by
  `#data` and by the line « Maintenance » of Settings › Administration (read only on a phone). It shows the AIRAC cycle in force and the next one, the workstation's coverage by zone (written once to
  `cache/data/coverage.json`) and the States grouped green / orange / red (seven lines, the rest folded), then the four groups — aeronautical
  base, procedures, aircraft, weather — one row per data set with its cycle, age, counts and a computed state (cycle gone by, old parser, absent,
  over 28 days, up to date), the link, licence and published zones under a tap. Everything comes from aerodb's `publication()`, `zones()`,
  `sources()` and `coverageByState()`; no action button, no launcher job, no network. The model (`model.js`) is pure and tested on fixtures.
- **Frame: the flown track** (`frame/lib/trail.js`, `frame/app.js`, `frame/sw.js`; frame INTEGRATION § 6, DECISIONS;
  noreg A35): the current flight's `progress.actual.trail` keeps where the aircraft went since the start — one point per
  NM or per minute, turns kept, 500 points at most — written with the position, reset at a new start or when the flight
  stops.
- **Synchronisation: a build of the base under way keeps it, even on the button** (`tools/data_sync.py`,
  `tools/launch.py`; SYNCHRONISATION, frame DECISIONS; noreg I9): an uncommitted `sia/base/` file written less than
  10 min ago means a build (the V2 page writes through its allowed folder, unseen by the launcher); a pending merge that
  cannot be cancelled names the files to set aside; git's texts also lose the real path of `data/` behind a junction.
- **Map, Coverage layer: an aerodrome partly read** (`modules/maps/coverage.js`, `texts.js`; help ×4, maps SPEC § 6.7; noreg
  D59): an orange aerodrome of reason `partial` (V3 § 10.26: procedures held, part of them not read) no longer reads as
  "readable on demand": its card says "Procedures: partly held", the reason, "n pages not read" and "n records to check"
  (from `partial { pages, doubt }`, a zero left out, singular or plural) and the SID / STAR / APP counts, as for green; the
  orange legend line names both cases ×4.

- **Launcher: a job's headless page returns its output** (`tools/regen_jobs.py`, `tools/launch.py`; frame
  INTEGRATION § 15.1, DECISIONS; noreg I8): `POST /__setup/regen/job/put` hands a zone's output to the running job
  (its random token, a zone of its arguments, bounded names and size, workstation only); the job's verb receives it with
  `job.take(zone)`, writes and commits it — for the base build on the launcher (D5).
- **Launcher: one table of routes** (`tools/launch.py`, `tools/lan_access.py`, `frame/sw.js`,
  `shared/maintenance_page.js`; frame INTEGRATION, DECISIONS; noreg I10): each `/__setup/` route is declared once with
  its public (local network or this workstation), and the local network's gate reads that table; the data repository's
  configured address never carries credentials; Maintenance names a workstation setting to a paired device; two frame
  libraries join the offline shell.
- **Fuel and the Map: the rules of the procedures are one pure module, `frame/lib/procedures.js`** (refactoring 29 Oct c; `modules/fuel/module.js`,
  `frame/lib/flight_path.js` re-exporting `conflictsOf` / `orderProcedures`; bench `frame/lib/test/procedures.html`, case F32; no visible
  change) — runway matching, names, conflicts, order, transitions, the approaches listed once and the runways offered, with no state and no text.
- **Synchronisation, security review** (`tools/data_sync.py`, `tools/launch.py`, `tools/regen_jobs.py`; administrator
  manuals ×4, SYNCHRONISATION; noreg I9): a merge left pending is always cancelled and redone, never concluded (a merge
  commit would carry files staged before the interruption, outside the pool, unchecked); files the workstation staged
  since are unstaged first so that the cancel keeps them; git's texts lose credentials and local paths; a paired device
  gets a generic message on a failed pass; conflicting paths follow the `data_file` rule; the aircraft base publication
  checks for a pending merge before writing into `data/`; while a job of the Data module runs on the launcher,
  `sia/base/` stays on the workstation whatever the page's `gesture` flag (an intention, not an authorisation).
- **Map: the chosen runway as an arrow** (`modules/maps/procs.js`, `data.js`, `draw.js`, `layers.js`, `texts.js`; SPEC § 5, help
  ×4, case D58; V3 § 10.24, user 29 Oct: "quand on choisit une piste, un vecteur sur la carte indiquant la piste (flèche)") —
  the runway chosen in Fuel is drawn from its threshold over its length along its true bearing (the record's `true`, else
  threshold to opposite threshold, else QFU + the aerodrome's variation), the tip at the end for a departure and at the
  threshold for an arrival, its number at the threshold, in its side's hue, from the aerodrome view (threshold "Chosen runway
  (arrow)" on the thresholds page). The aids (ILS, DME) come later.
- **Données: the aeronautical base built on the launcher, in one headless browser** (lot D5; `tools/regen/base.py` — job `base/build`, args `{ zones,
  personal? }`; `frame/aerodb/build/headless.html` + `headless.js`; `shared/sia_base.js` `buildZones` and the pieces `publishSplit` now shares; cases
  K42–K51; SPEC § 5 septies, INTEGRATION, DECISIONS 30 Oct) — the page's own builders run in Edge or Chrome without a window, **one instance for all the
  requested zones** (output identical to the page's, byte for byte), each zone written under `sia/base/<zone>/<cycle>/` through the launcher's path rule
  and committed alone as soon as it is handed back by `POST /__setup/regen/job/put` (a failed zone publishes nothing and stops no other). **Route B**: the
  verb offers `{ zones, cycle, personal, inputs }` (`job.offer`) and starts the browser on the launcher's page with `#job=<id>` only; the page makes one
  `POST /__setup/regen/job/claim` for the offer and the token, **checks it before reading anything**, and reads (no token, no parameter on any command line,
  no bootstrap file, no exception in the launcher's same-origin check). Zones as a dict at the root of the job view (`state`, `done`, `total`, `error`), result
  `built` / `failed` / `commits` / `reason`; no browser: `no-browser`; `xplane` in `personal`: `xplane-in-page`. Ten zones: 10 to 12 s, 1.3 GB. Security: browser by
  absolute path only (`taskkill` through `GetSystemDirectoryW`), temporary profile deleted (leftovers purged at load), WebRTC limited, nothing reachable beyond the
  launcher's address, time limit and cancel kill the process tree. `aerodb` also declares `regen/job/cancel` (cancelling an EAD or eAIP reading was refused).
  The V2 page and the Worker path are unchanged (same files byte for byte).

- **Map: a flight write that lands during the mount is no longer missed** (`modules/maps/data.js` `watchFlight`; journey J2,
  step 3, seen once in two) — the map read the flight, then subscribed to its changes after other waits; a write between the
  two (Fuel writes `started.at`, then opens the map) had no event, so the map stayed on a flight not started and said nothing
  ("no actual position"); right after subscribing it now reads the flight once more.

- **Map: the profile shows only the airspaces the flight enters, one envelope per family** (`modules/maps/profile.js`,
  `profile_view.js`, `lib/vertical_profile.js`; help ×4, case D57; user, 29 Oct, LFPO → EIDW at FL280: "toujours la pollution
  par les CTA") — an airspace is drawn only where the planned vertical path enters it (within 500 ft); overlapping sectors of
  one name family, type and class (DUBLIN CTA 3 / 4 / 5, VATA LOWER AIRSPACE A1 … D4) are one envelope named by the family,
  lowest floor to highest ceiling; free route airspace (FRA), W and weather research areas are left out unless the "Other
  airspaces" layer is on; at most seven airspaces are labelled, the others in the list below.

- **Map and Atmosphere: one point chooses the weather model** (`frame/lib/flight_path.js` `routeMidpoint`,
  `modules/maps/weather.js`, `modules/atmosphere/module.js`; bench) — the map took the middle point of its list by rank,
  Atmosphere the middle point of its own: near the edge of a model's box they could choose different models; both now ask
  the frame's `modelFor` at the same point, half the length of the route.

- **Synchronisation: the aeronautical database leaves by the user's gesture only** (`tools/data_sync.py`,
  `tools/launch.py`, `shared/sync.js`, `frame/store/transport_launcher.js`, `frame/store/frame_data.js`; administrator
  manuals ×4, SYNCHRONISATION; noreg I9): `sia/base/` is committed by the « Synchroniser » button (and by the build job
  itself), never by a background pass (update at start, the frame's periodic exchange), which keeps it on the computer
  and says so — a zone half written by a rebuild no longer leaves by itself.
- **Fuel: the procedure rows appear without waiting for the aircraft registry** (`modules/fuel/module.js`, DECISIONS; case F33).
- **aerodb: coverage `partial`, States held and named, `PARSER_VERSION`** (`frame/aerodb/aerodb.js`, `catalogue.js`, `tools/proc_manual.py`; cases K1, K11, K21; SPEC § 5, INTEGRATION « Coverage »; V3 § 10.26) — `coverage(icao)`
  answers **orange `partial`** (with `partial { pages, doubt }` and the fields of `held`) for an aerodrome held whose file has pages not read or records to check; `proc_manual.py install` writes `pages_unread` and `doubt` into the
  aerodrome's entry of `proc/manual/index.json` (an entry without them is not partial). `coverageByState()` gives each State its `names` [fr, en, de, es] (47 States, in `AeroCatalogue.EAD_STATES`) and `held` (aerodromes
  held; `held > 0` → green `held`). `AeroCatalogue.PARSER_VERSION` (= `VERSION` of `shared/sia_base.js`, checked by K21). `COVERAGE.partial` in the four languages.

- **Synchronisation: a git warning no longer stops the merge** (`tools/data_sync.py`, `tools/launch.py`,
  `tools/regen_jobs.py`; administrator manuals ×4, SYNCHRONISATION; noreg I9): `git()` mixed git's warnings (« LF will
  be replaced by CRLF ») into its output, so a warning line was taken for a conflicting file, `open()` failed, the
  exception reached the server and the merge stayed pending — every later launcher commit failed. Now git's output alone
  is read (its warnings go to the launcher's log), conflicting files are read from the index (`ls-files -u -z`), any error
  during a pass cancels the merge with a clean message, a merge left pending is concluded or cancelled by the next pass,
  and the launcher's commits check for a pending merge first.
- **aerodb: `source.file`, the document a record was read from** (`tools/proc_records.py`, `tools/proc_manual.py`; SPEC, INTEGRATION, DECISIONS; V3 § 10.25; cases K11, K14, K24, K26) — every procedure read from a document carries the document's name without folder: the SIA coding page for the eAIP (the page the « Source » link
  opens, `charts.base` + `Cartes/<ICAO>/` + `source.file`), the downloaded document for EAD layouts and OCR, the input file for a hand reading installed from one. The other sources show the name only.
- **Zone builds: sectors of one family that overlap with different floors are reported, never cut** (`shared/sia_base.js`
  `SiaBase.sameFamilyOverlaps`, parser version 18 → 19; `frame/aerodb/SPEC.md` § 2, DECISIONS 29 Oct; case K41) — openAIP's
  Dublin CTA 3 to 6 are discs that contain the airport; the base reproduces the source. The publication now checks each zone
  (same source, type, class and family name, real shared surface, different floors, shared volume) and writes
  `meta.json › overlaps` { count, airspaces, families: [{ family, type, cls, src, members, floors }] } (50 families at most) and
  an `ovl` flag (the family name) on every airspace involved, for the Map's point sheet. Measured on the published zones: 0 to
  23 ms, ie 3 families (Dublin CTA, Shannon CTA, Shannon CTA Cork), de 5, fr 5, in 6, iq 3, tr 2, es 1. Zones built with
  parser 18 show as outdated until rebuilt.

- **Map: the rendering parts no longer share a mutable kit, and the theme lives for one drawing** (`modules/maps/render.js`,
  `render_airspace.js`, `render_route.js`, `screen.js`; SPEC § 1; case D40; V3 § 10.29 e, reduced form) — the parts expose
  their drawing as frozen namespaces (`MapsRender.parts.airspace`, `.route`) instead of storing it in `MapsRender.kit`, now
  frozen; `draw()` hands them a frozen `env = { theme, placer, pal }` and resets its theme when it returns, so nothing
  lingers from one drawing to the next. Nothing changes on screen.

- **Weather: the map and Atmosphere again read the same forecast** (`modules/atmosphere/weather_store.js`,
  `modules/maps/weather.js`; frame DECISIONS): since 28 Oct the two weather stores used two different model runs for the
  same cache and each discarded the other's data — the map showed no weather and the cut stopped part-way (LFPO → EIDW).
- **aerodb: the ILS of the SIA eAIP goes through its final approach fix** (`tools/proc_sia.py` `parse_faf`, `tools/proc_records.py`; SPEC § 5 quinquies, INTEGRATION; V3 § 10.20; cases K24, K25) — the DATA pages print « FAF LOC RWY nn »: an ILS is now IF → FAF → threshold → missed
  (`{ id: 'FAFnn', leg: 'CF', alt: null, synthetic: 'faf' }`), the FAF inserted only when it lies on the final (nearer than the initial fix, within 10° of the runway bearing), else a warning and the former IF → threshold. 16 of the 17 ILS of Orly, Toulouse and Paris-CDG get theirs
  (8 to 14 NM from the threshold). The ILS initial fix printed as « IG08L ( IF ILS/LOC RWY 08L ) … » is read too.

- **Fuel: the reasons of a procedure reading are translated by aerodb's catalogue** (`modules/fuel/module.js`, DECISIONS) —
  never a code or a French console phrase in another language; a failure always shows what the workstation saw.
- **aerodb: the procedures load at once** (`frame/aerodb/aerodb.js`; bench `frame/aerodb/test/perf_procedures.html`, case K40; SPEC § 5 quinquies, DECISIONS 29 Oct 2026; V3 § 10.29 g) — Fuel and the Map took
  250–400 ms for **every** `procedures()`, `procedure()`, `runways()` call (2.2 s + 1.3 s + 1.8 s for the mount of Fuel, the Map and a redraw on the real files): each call read the aerodrome's four files and asked
  the frame for `list('proc/')` (which loads the whole cache), and the aerodromes whose points the base does not all give (LFPO, LFBO, LFPG) were rebuilt at each call, one base search per point. Now the merged list is
  built **once per aerodrome**, shared by every call and every module, trusted until the `proc/` watcher, `fetchProcedures`, `refresh()` or a change of the base drops it: a warm call is 0 ms, 0 reads, 0 lists (mount
  of Fuel 456 ms, of the Map 0.1 ms, a redraw 0.2 ms; same answers). The base is searched once per identifier (864 searches → 82 for LFPO), the cycle choice and `procedureIndex()` are kept. What is left (a
  `FrameData.list` that loads every cached document) is the frame's.

- **Map: one element for the airway names** (`modules/maps/render.js`, `render_airspace.js`; case D51; V3 § 10.29 g) — the
  display profile's `airwayLabels` and the Layers box's `awLabels` were combined; `awLabels` alone remains, and a profile of
  the studio or of an airline that still carries `airwayLabels` is read as `awLabels` (`MapsRender.migrated`).

- **Map: one palette, day and night** (`modules/maps/render.js` `MapsRender.palette`, read by `render_route.js`,
  `render_airspace.js`, `procs.js`, `sheet_view.js`, `flight_time.js`, `tips.js`, `vfr.js`, `draw.js`; SPEC § 3; V3 § 10.29 f)
  — the map's cartographic colours were written in a dozen places; they are now one palette read by the renderer and by the
  legend, so a swatch is always the colour of what it names. Same colours as before.

- **Map: the drawing order is one list of layers** (`modules/maps/render.js` `draw`; SPEC § 3; V3 § 10.29 d) — each layer
  `{ id, reserve(), paint(ctx) }`, every reservation in the label placer first, then every painting, in the list's order; the
  same order as before, nothing changes on screen.
- **aerodb: one page set per French aerodrome, regenerable by a tool** (`tools/make_eaip_fixtures.py`, `frame/aerodb/test/fixtures/eaip/<ICAO>/`, `SOURCES.md`; `tools/regen/proc.py`; V3 § 10.29 (e); cases K24, K25, K33, K34, K22) — the loose `.rows.txt` of the SIA eAIP become a set per aerodrome (LFPO, LFBO, LFPG whole: 171 pages, 346 KB of text;
  LFBD and LFAV as they were) with the AD 2.12 extract and a manifest (cycle, pages, rows, hash of each PDF); `make_eaip_fixtures.py LFPO --cache <PDF> [--check|--fetch|--adopt]` rebuilds or verifies them. K24 and K25 assert on whole aerodromes (and find a real row that cannot be read in LFPO STAR RWY07). Also from the
  security review of the reading job: a document of another aerodrome than the requested one is never installed, and `ead-fetch` refuses a French code.

- **aerodb: one reading job, `tools/regen/proc.py`** (`tools/regen_jobs.py`; SPEC, DECISIONS; V3 § 10.29 (d); cases K22, K23, I8) — `proc/ead-fetch` and `proc/eaip-fetch` were two copies of one job; they are now ONE function driven by a source table (which
  State each source reads — France by the SIA eAIP, no account; any other State by EAD Basic, with the account — where its cache is, how it is read, what is checked before installing), loaded by the frame's base (`load_verbs()`). The commit is the base's
  `commit_outputs`, signed by the page's trigram (nothing is committed without one). `regen_jobs.py` goes from 656 to 373 lines. The results are unchanged.

- **Launcher: detection and the workstation's settings apart** (`tools/launch.py`, `shared/app_framework.js`,
  `shared/file_access.js`, `shared/maintenance_page.js`, `shared/sog_registry.js`, `apps/settings/premier_lancement.html`;
  frame SPEC, DECISIONS): `/__setup/status` only says that a launcher serves the page (the same everywhere);
  the workstation's own settings move to `/__setup/workstation`, never given to a paired device.
- **Flight path: `expandedPath` marks every junction, the map only draws** (`frame/lib/flight_path.js`, `modules/maps/procs.js`;
  bench; V3 § 10.29 c) — the point after a junction carries `join`: `'common'` (the procedure meets the route on a shared point;
  `joinPhase`, the phase of the leg that leads there), `'direct'` (no shared point: a dashed direct) or `'gap'` (a leg whose
  predecessor is not coded, now dashed too); the map no longer guesses them from the procedures' fix names.

- **Frame lib: `current_flight.js` split in three** (`frame/lib/current_flight.js`, `flight_time.js`, `flight_path.js`; V3 § 10.29 b)
  — the record's merge stays in `current_flight.js`; the flight in time (`legTimes`, `etaOf`, `plannedPositionAt`) goes to
  `flight_time.js`, the route and its procedures (`proceduresOf` … `altitudeAt`, `conflictsOf`, `orderProcedures`) to
  `flight_path.js`; `current_flight.js` re-exports both during the transition, the code moved as it was. Listed in the
  service worker and the modules' files.
- **aerodb: reasons as codes, the layout's tolerance as a fallback, a missing Belgian point as a doubt, security review of the split** (`tools/proc_geometry.py`, `proc_records.py`, `proc_layouts.py`, `proc_sia.py`, `proc_ead.py`,
  `proc_ocr.py`, `proc_pdf.py`; `frame/aerodb/catalogue.js` `READ_REASONS`; SPEC, INTEGRATION, DECISIONS; V3 § 10.29 (c); cases K30 to K32, the catalogue test page) — every page not read carries `formats[].reason` (`layout`, `low-read`, `title`,
  `no-legs`, `counts`, `vector`, `timeout`) and `stats.reasons` is `[code, count]` (the page codes and the doubt codes), the French phrase staying in the console; `AeroCatalogue.READ_REASONS` gives the four-language labels. A leg that prints only a distance is
  judged at its layout's tolerance. A point missing from a Belgian list no longer refuses the block: the procedure is kept as a doubt (`unresolved`). A PDF name from a server is a plain file name under the cache, the ICAO codes of the command
  line are checked, and the default cache of `proc_sia.py` is `data/local/eaip` (or the ignored `.proc_cache/`). The readings of LFPO, LFBO, LFPG and EIDW keep their procedures and doubts.

- **Frame: requests between modules taken once** (`frame/app.js`, `modules/hello/module.js`, `frame/lib/launcher.js`,
  `frame/aerodb/aerodb.js`; INTEGRATION § 6.1 and § 15.1, SPEC, DECISIONS; cases A29, A34): `ctx.consume(keys)` takes a
  request carried by the address and removes it, so a reload or Back no longer replays it; the address keys used between
  modules are listed in one table; the launcher's refusals have one written shape; aerodb declares the launcher routes it
  calls.
- **Launcher jobs: security review** (`tools/regen_jobs.py`, `frame/store/frame_data.js`; DECISIONS; I8): a set can no
  longer overwrite another's verb nor shorten a gap; trigrams of 2 to 5 signs are accepted as authors; commit paths are
  literal (no pattern); `revalidate` keeps an error of the device's storage in its result instead of throwing.
- **aerodb: `proc_eaip.py` split, no logic changed** (`tools/proc_layouts.py`, `proc_pdf.py`, `proc_records.py`, `proc_sia.py`, `ead_probe.py`; `proc_ocr.py`, `proc_ead.py`, `proc_manual.py`, `regen_jobs.py`; SPEC § 5 quinquies,
  DECISIONS; V3 § 10.29 (b); cases K1 to K29) — the 2 718-line eAIP reader becomes the SIA reader (`proc_sia`), the foreign layouts as **one ordered list** (`proc_layouts.LAYOUTS`: detection, parser, fingerprints, OCR normaliser,
  OCR flag, tolerance), the PDF reading shared by every reader (`proc_pdf`) and lines → records with the whole-aerodrome pass (`proc_records`); the EAD probe leaves `proc_ead.py` (`tools/ead_probe.py`). `proc_ocr` and
  `proc_manual` no longer import the eAIP reader. The command line is `python tools/proc_sia.py` (same options). The readings of LFPO, LFBO, LFPG and EIDW are byte-identical. The point schema is written once in the SPEC.

- **Map: the coverage layer is named "Coverage" and lit by its box only** (`modules/maps/coverage.js`, `layers.js`, `texts.js`;
  SPEC § 6.11, INTEGRATION, help ×4, case D46; V3 § 10.29 h) — the automatic lighting (a side without a chosen procedure whose
  aerodrome is not green) is gone, with the "box touched" state; the layer "Aerodrome procedures" is now "Coverage" ×4.

- **Flight path: the guess of an unmarked missed approach left the helper** (`frame/lib/current_flight.js`; V3 § 10.29 h) — aerodb's
  reader now marks it at the source and counts the records it guessed (`guessed: ['missed']`); `expandedPath` no longer guesses.

- **Flight path: `loadProcedures` returns the records without duplicates** (`frame/lib/current_flight.js` `dedupProcs`; bench; V3
  § 10.29 a) — a transition equal to its procedure is dropped there, so Fuel and the Map see the same records (Fuel had its own
  copy).

- **Fuel: compatible procedures first, one rule shared with the Map, doubtful records never listed** (`frame/lib/current_flight.js`
  `conflictsOf`, `orderProcedures`; `modules/fuel/module.js`; bench `frame/lib/test/current_flight.html`; SPEC, DECISIONS; help ×4;
  cases F22, F31) — every list opens with what fits the choice, then the ⚠ ones; the runway list with the runways of the chosen
  SID or approach; a record without a name or with status `doubt` is not listed and a muted line counts « N procédures non lues sur
  cette page » (slot reserved for the « Source » link).
- **Fuel: « Read the procedures » always says how it ended** (`modules/fuel/module.js`, SPEC, DECISIONS; case F14) — its
  start, then its result or its failure with the reason and the number of warnings, even after leaving Fuel; leaving no longer
  cancels the reading.
- **Fuel: « Now » shows the present time in the date field** (`modules/fuel/module.js`, DECISIONS; case F6) — no longer an
  empty field drawn « dd/mm/yyyy ».
- **Launcher: the jobs' base, alone** (`tools/regen_jobs.py`, `tools/launch.py`, `frame/lib/launcher.js`, `frame/app.js`;
  INTEGRATION § 15.1, DECISIONS; cases I8, A29): each data set brings its own verbs in `tools/regen/<set>.py`; one commit
  path for every job, signed with the trigram of the page; the last job and the gaps between readings survive a restart of
  the launcher (an interrupted job is said so).
- **aerodb: one geometry check and one policy for every reader** (`tools/proc_geometry.py`; `proc_eaip.py`, `proc_manual.py`, `proc_ocr.py`, `proc_ead.py`, `regen_jobs.py`; SPEC § 5 quinquies,
  DECISIONS; V3 § 10.26 and § 10.29 (a); cases K1 to K28) — the three checks (`check_geometry`, `gaps_of`, `proc_manual.verify`) and the guards (name, repeated point, zigzag) become one module: printed course and
  distance against the recomputed ones with a tolerance chosen by what the source prints (true course 0.25° / 0.2 NM, magnetic course or distance 30° / 0.55 NM, nothing printed: « uncheckable », a warning). A record that fails is kept
  with `status: 'doubt'` and its reason as a code (`geometry`, `unresolved`, `name`, `repeat`, `zigzag`, `unread`), the text staying in the console and the file's warnings; EAD and OCR no longer drop a table for one
  record; a hand reading is still refused procedure by procedure (never the whole file unless none is left); `stats.reasons` carries the codes. The outcome on LFPO, LFBO, LFPG and EIDW is unchanged.

- **Aeronautical data: personal-licence sources say who may tick them** (`shared/aero_zones.js` `personal`,
  `shared/maintenance_page.js`; `modules/data/SPEC.md` invariant 1, DECISIONS): in Settings › Maintenance (V2) ›
  Aeronautical data, the box of the X-Plane source (and of ENAIRE and NATS, personal-use licences) carries the line « À cocher
  seulement si le dépôt de données n'est utilisé que par vous » ×4; the box stays, nothing is blocked (user, 29 Oct).
- **aerodb: a reading is shown from the installed file through the frame's revalidation** (`frame/aerodb/aerodb.js`; SPEC,
  DECISIONS; test K1) — the hand-made freshness after « Lire les procédures » (forget, sync, in-memory copy) gives way to
  `FD.revalidate` of the aerodrome's two files.
- **The base's parser version goes to 18** (`shared/sia_base.js`) — the zones built before the fix of X-Plane's airspace limits
  are now shown as outdated, so the maintenance page offers to rebuild them.
- **Map: the airspaces at a point say when sectors of one family overlap** (`modules/maps/lv.js`, `texts.js`, case D56) — when
  airspaces of one name family, one type and one class overlap there with different floors (Dublin: openAIP codes CTA 3 to 6
  without their inner hole), a discreet note ×4 under the list: "Overlapping sectors of one family: as given by the source";
  the map cuts nothing.

- **Atmosphere: the cut follows Fuel's vertical path, and its times the ground speed** (`modules/atmosphere/atmo.js`
  `trajectory`, `section.js`; case E11; user, 29 Oct: "la coupe météo ignore les altitudes imposées … 30 kt de face = 30 kt de
  vitesse sol en moins") — the cut drew its own climb and descent at default rates and timed the flight at true airspeed;
  it now follows `profile.path` (constraint steps included, brought onto the route by its length) when Fuel computed it at
  this level, its top of climb and of descent where that path reaches and leaves its highest level, and a second pass times
  each NM at the ground speed, the headwind read along the path at the hours of the first pass.

- **Fuel › Auto: each leg is routed at the altitude of the profile** (`modules/fuel/module.js` `autoAirways`, case F30; user,
  29 Oct, LFPO → EIDW at FL260: "la T421 était à préférer à la J150") — every leg was routed at the cruise level (or the step
  written at its first point), so a leg of the climb could not take a low airway and a leg flown at FL260 could; each leg is
  now routed at the planned altitude at its middle (`altitudeAt` on the chain widened with the procedures' points, brought
  onto the flown path).

- **Frame: `revalidate(paths)` in the data layer** (`frame/store/frame_data.js`, `frame/app.js`; INTEGRATION § 4, § 15.2,
  SPEC, DECISIONS; bench A33): a module (and aerodb) can check a few known files against the repository at once, without
  waiting for the background sync — changed copies are read again and announced, vanished references dropped, the
  device's own pending writes kept; a publication now shows its new files at once.
- **Airspaces from X-Plane: limits in feet again** (`shared/aero_sources.js`; aerodb DECISIONS; test K27) — the « M » of « MSL »
  (« 3000MSL ») was read as metres, so X-Plane's airspaces showed « 3000 m AMSL »; the zones built with them need a rebuild.
- **Frame: three bugs** (`frame/app.js`, `tools/regen_jobs.py`, `tests/v3/lib.py`; SPEC § 3, INTEGRATION § 15.3,
  DECISIONS; cases A31, I8, J2):
  - on a device alone, a write waiting an instant in the queue no longer turns the ⚙ amber (journey J2's intermittent
    failure);
  - the end-of-cycle line reads the real form of aerodb's publication (it never showed);
  - the launcher jobs' journal and steps are cleaned of secrets whatever a job writes;
  - the suite's seeded aeronautical base follows the AIRAC calendar.
- **Fuel and Map: the winds aloft along the route are taken at the altitude of the profile** (`frame/lib/current_flight.js`
  `altitudeAt`, `routeNmToFlown`, `modules/fuel/module.js` `aloftCalc`; bench, case F29; user, 29 Oct: "à LFPO on n'est pas
  encore au FL260, à BAGIT on n'y est plus") — every point's wind and temperature were read at the cruise level (steps
  included); they are now read at the planned altitude there: fuel's vertical path (`profile.path`), else the climb to
  `tocNm` and the descent over the last `todNm`, the route's distances brought onto the flown path of the procedures.

- **Atmosphere: a flight dated before today has its weather from its departure** (`modules/atmosphere/module.js`,
  `weather_store.js`, case E10; user, 29 Oct: "pas de météo avant H+56" on a flight of 26 Oct) — the forecast was read from
  today only, so the hours between a past departure and today stayed empty and the nearest hour was shown; the days from the
  departure (up to 92 days back, which Open-Meteo serves) are now read too.
- **aerodb: the date of the last reading** (`frame/aerodb/aerodb.js`, `tools/proc_manual.py`, K1, K11; V3 § 10.29) — `coverage(icao).read_at` (ISO 8601 UTC, or `null`) is the
  most recent `updated_at` of the aerodrome's entries in `proc/manual/index.json` and `proc/local/index.json`, which `proc_manual.install()` now writes; every record served from
  `proc/manual/` carries `source.read_at`. Fuel and the Map show « lu le … » with « Relire », or the button alone when it is `null`.

- **aerodb: no orange without a reader** (`frame/aerodb/aerodb.js`, K1; V3 § 10.29) — `coverage()` and `coverageByState()` no longer give the orange `lnm` (Little Navmap has no
  reader yet); the key stays in `AeroCatalogue.COVERAGE`, never produced. The `lnm` hint of `fetchProcedures` (`no-tables`) stays.

- **aerodb: the missed approach is guessed by the reader and counted** (`frame/aerodb/procedures.js`, `aerodb.js`, K1; V3 § 10.29) — an approach with no point of phase `missed`
  gets it after the point nearest to the landing threshold of its runway (`dthr`, else `lat` / `lon`, else the aerodrome), unless that point is the last; the record carries
  `guessed: ['missed']` and `procedureStats().guessed.missed` counts them. The consumer's `withMissed` in `frame/lib/current_flight.js` becomes a no-op on these records (the maps lot removes it).

- **aerodb: `procedures()` memoised per aerodrome and per revision of its files** (`frame/aerodb/aerodb.js`, K1; V3 § 10.29) — the merged, phased and placed list is built once per
  revision of `proc/<cycle>/`, `proc/manual/`, `proc-seen/` and `proc/local/` files (300 calls cost one merge); `procedure(id)` and `runways(icao)` read the same entry; the watcher,
  a successful `fetchProcedures`, `refresh()` and `rememberOfp` drop it; new `procedureStats()` (`memo`, `merges`, `hits`, `guessed`).

- **Map: the aircraft arrow points at the position with its tip** (`modules/maps/flight_time.js`, case D55; user, 29 Oct) — the
  planned and the X-Plane (red) arrows were centred on the position; their tip is now on it, the body behind.

- **Map: the route points a STAR (or a SID) bypasses are no longer drawn, nor given winds** (`modules/maps/state.js` `keptRoute`,
  `draw.js`, `tips.js`, case D54; user, 29 Oct: "les points de la route sont toujours présents, avec les flèches de vent, bien
  que la star se connecte à l'un des points de la route") — the path already dropped them, but the marks, names and wind
  barbs were still drawn from every point of the route; they now follow the route points the path keeps.

- **aerodb: `--fetch` reads every results page (fix)** (`tools/proc_ead.py` `page_rows`, K12) — seen on the real screen (29 Oct 2026, 22 approach documents): the PrimeFaces page change answers with bare `<tr>` rows (no table body), which the walk took for "no results table" and stopped at page 2; the rows are now read from the table's update fragment; the diagnostic is two short lines that fit the launcher's job log.
- **Map: procedure names at every scale, their fixes and constraints from the regional view, both on the thresholds page**
  (`modules/maps/procs.js`, `layers.js`, `tune.js`, `draw.js`, `render.js`, `texts.js`; SPEC § 5, help ×4, case D53; user, 29 Oct:
  "ils disparaissent trop tôt en zoom arrière (c'est une info hyper importante)" and "le nom de l'approche ne semble pas
  s'afficher") — the fixed 300 px per degree became two thresholds of `#maps?tune=1`, "Procedure names" (every scale) and
  "Procedure fixes and constraints" (from about 110 px per degree); the names are anchored at the middle of the procedure's
  longest leg, with a fallback when an approach has a single fix off its threshold, and every procedure label is painted
  last, so an airway box near the aerodrome no longer hides the approach's name.

- **Fuel: "Auto" starts from the end of the chosen SID and ends at the start of the arrival** (`modules/fuel/module.js`,
  DECISIONS; case F28) — e.g. LFBO FINOT G36 GOSAD, which it could not find from the aerodrome.
- **aerodb: "Read the procedures" for Dublin (EIDW) and the other Irish aerodromes** (`tools/proc_eaip.py`, `tools/proc_ead.py`, `tools/regen_jobs.py`; `frame/aerodb/EAD_BASIC.md` § 10, DECISIONS 29 Oct; cases K26, K19, K22, K12) — the reading ran
  3.5 minutes and ended « no procedure could be read » (31 documents, every one "layout not recognised"): Dublin prints `Term` / `Mag track` and its columns in another order than the page seen on 28 October (name, position, terminator, tracks,
  distance), the departures start with a point-less `RWY28 - CA` leg, the text layer spaces digits and cuts names, STAR pages come backwards, RNP rows are cut over three lines. One tolerant row reader now takes both column orders; on the 31 documents:
  43 pages read, **196 procedures (115 SID, 43 STAR, 38 approaches)**, 659 legs through the geometry check with none rejected; VOR approaches (fix tables) and missed-approach tables alone stay unread, said. The job now gives real progress
  (searches, documents downloaded / read / analysed, i of n) and its counts (`stats`) and a message that says what was seen even when nothing could be read (« 31 document(s), 0 of 31 page(s) read (…) »).

- **Flight path: `routingChain(flight, procs, points)` for the airway routing** (`frame/lib/current_flight.js`; bench
  `frame/lib/test/current_flight.html`) — the points between which the routing looks for airways, with the chosen SID's end
  (its transition included) inserted after the departure and the start of the chosen arrival (STAR transition, else STAR,
  else approach transition, else approach) before the arrival, when the route does not hold them yet (user, 29 Oct: a FINOT
  departure from LFBO with a route starting at GOSAD did not get G36 from "Auto"; Fuel's button is wired to it next).

- **Map: the flight's procedures are read again after "Read" / "Read again" in Fuel** (`modules/maps/module.js`, case D52) — aerodb
  says `{ procedures: ICAO, coverage: true }` after reading an aerodrome, and the map only cleared its coverage: it kept drawing
  the old records (it read them again on a refresh of the base only). It now reads them again when that aerodrome is the
  flight's departure or arrival.

- **Map › Layers: the "Airway names" box works** (`modules/maps/render_airspace.js`, case D51) — it only switched the segment's
  length and tracks, while the name box obeyed another element of the display profile that Layers never set: unticking it
  left every name on the map. It now shows and hides the airway's box, with its length and tracks. Its label is the same in Layers and on the thresholds page: "Airway names (length, tracks)" ×4.
- **Fuel: "Read again" on an aerodrome that already has procedures** (`modules/fuel/module.js`, SPEC, DECISIONS; help ×4; case
  F27) — with the date of its last reading.
- **Map: SID, STAR and approach in their own hues, and the airway boxes stay over their traces** (`modules/maps/procs.js`,
  `render.js`, `draw.js`, `sheet_view.js`; SPEC § 5, help ×4; user, 29 Oct: "des couleurs de contraste autres que violet (vert ?
  orange ? bleu ?)" and "toujours pas de cartouche pour les routes, mais là c'est une approche") — the SID is green, the STAR
  orange, the approach and its missed approach sky blue (day and night shades), their constraints and point names in the same
  hue; the chosen procedures are now painted at the route's level, before the boxes of the airways their legs follow, which
  were hidden under an approach's trace.
- **aerodb: Paris-CDG (LFPG) read whole, point merge kept apart, a doubtful reading kept with status `doubt`** (`tools/proc_eaip.py`, `tools/proc_manual.py`, `tools/regen_jobs.py`, `frame/aerodb/procedures.js`,
  `aerodb.js`; SPEC, INTEGRATION, DECISIONS; tests K25, K1, K22-K24) — the SIA's cycle 2026-10-29 prints three more layouts: STAR titles with a parenthesis
  of conditions (the cause of the glued STARs and the nameless one), SIDs with a « Nav Spec » column and scrambled cells, INA / FNA pages with spaced words. Offline: 85 of 85 pages read (62 before), 711 procedures (296),
  0 nameless; the sequencing arcs BIBA1-5 / LUKI1-5 leave the routes and go to `point_merge` of the aerodrome file. A nameless record, a point repeated outside a holding, a zigzag, a record with an unreadable leg row or a failed
  geometry check is kept with `status: 'doubt'` and a `doubt` reason (counted in `stats.doubt`), served only to `procedures(icao, { doubt: true })`; Orly's ELCOB SIDs gain their last leg, one Orly STAR is now flagged.

- **Fuel: the Departure and Arrival procedure rows are in step 2 Route, not in step 1 Flight** (`modules/fuel/module.js`, SPEC,
  INTEGRATION, DECISIONS; help ×4; cases F11-F26) — user: « star et sid sont “route”, pas “vol” »; a card at the end of the Route step before
  the start, still in the Departure step after; `#fuel?focus=arr` opens the Route step before the start.

- **Fuel: ⚠ only for a runway conflict** (`modules/fuel/module.js`, SPEC, DECISIONS; help ×4; F21, F26) — a STAR that does not
  join the approach is no longer marked (real STARs end in a hold or radar vectors).
- **aerodb: Orly's STARs keep their names** (`tools/proc_eaip.py`; DECISIONS; test K24) — an arrow leading a table row cut
  AMB 9W in two and left a nameless STAR; an untitled block repeating a procedure begun on the previous page is no longer kept twice.
- **Fuel: a procedure in conflict is marked ⚠ (orange) and stays selectable; the lists are flat** (`modules/fuel/module.js`
  `conflictsOf`, `procOptions`, `procChosen`, SPEC, DECISIONS; help ×4; cases F11, F13, F20-F22, F26) — reverses the pruning: choosing a
  runway no longer cuts the lists nor removes a choice; ⚠ after ⌛ marks a SID, STAR or approach that does not serve the runway, a STAR that
  joins no point of the chosen approach, a transition that does not start where the STAR ends (class `conflict`, the reason as title);
  one notification says it when it appears. One list sorted by runway then name, no group per runway; the runway is in the label
  only for a single-runway procedure whose name does not say it.

- **Fuel: an outdated procedure shows ⌛ instead of the word "outdated"** (`modules/fuel/module.js`, SPEC, DECISIONS; help ×4;
  case F13) — greyed on the computer, with a tooltip "Read under an earlier cycle: to read again"; and "Wait n s before the next
  reading (EAD Basic)" when EAD Basic is asked again too soon.
- **Map: an outdated procedure is marked "⌛", never by the word** (`modules/maps/procs.js`, `coverage.js`, `sheet_view.js`,
  `texts.js`, help ×4; decision of 29 Oct after the user's word "plutôt que « périmé », un symbole court") — the trace's label
  reads "SID NAME ⌛" (the symbol in grey), the aerodrome card shows ⌛ in place of the word (its meaning in the tooltip),
  and the "i" legend gives one line "⌛ read under an earlier cycle" while such a procedure is drawn; "X-Plane, local" and
  "Little Navmap, local" are unchanged.

- **Fuel › Sheets: a pasted or imported `{ "sheets": [...] }` gives its sheets** (`frame/aerodb/sheets.js`, case F25) — the
  ChatGPT reply read as JSON (paste or file) became one sheet with a field "sheets" holding the whole array, and the review
  proposed that single field; the `sheets` envelope and a bare array now give one sheet per element, merged field by field
  into the sheet of the same id.
- **aerodb: the ILS of Orly and Toulouse are usable, and every runway has its threshold** (`tools/proc_eaip.py`, `frame/aerodb/aerodb.js` comment; SPEC, INTEGRATION, DECISIONS; case K24) — the eAIP builder now reads the section AD 2.12 of the aerodrome page
  (runway numbers, bearings, dimensions, threshold and displaced-threshold positions and elevations): the file carries every runway (LFPO 6, LFBO 4), and the `RWnn` points of the RNP pages are placed, at the displaced threshold when there is one (the coding tables agree with
  it, measured on Orly 06 and 25). An ILS page, which codes only the initial fix then « See chart », gets the runway threshold between the initial fix and the missed approach (`synthetic: 'threshold'`): IF → threshold → missed approach, drawn straight. No procedure
  is dropped by the geometry check (LFPO 316 / 316, LFBO 78 / 78).

- **aerodb: procedures synchronised from the workstation are announced** (`frame/aerodb/aerodb.js`; SPEC, INTEGRATION, DECISIONS;
  test K1) — an aerodrome read on the workstation now shows on the other devices as soon as its file arrives: aerodb announces
  `{ procedures, coverage }` for it, and Fuel and the Map ask again instead of keeping an empty answer.
- **Flight path: a transition that runs past its junction with the approach is cut there** (`frame/lib/current_flight.js`;
  bench `frame/lib/test/current_flight.html`) — when the first point of a procedure (the approach after its transition, the
  approach after the STAR) is already in the chain, the chain is cut at that point: the previous procedure's own tail is
  no longer flown, and no leg is flown twice.

- **Map: the rendering core split in three files** (`modules/maps/render.js`, `render_airspace.js`, `render_route.js`; SPEC § 1,
  INTEGRATION) — `render.js` had grown to 78 KB, above the module's 60 KB rule; airspaces, airways, AAR and NAT
  (21 KB) and the route's labels and trace (7 KB) moved as they were into two classic scripts loaded after the core
  (50 KB), which shares its helpers in `MapsRender.kit`. Nothing changes on screen.

- **Fuel: a procedure read without a name says "STAR without a name"** (`modules/fuel/module.js`, DECISIONS) — no longer
  "NONAME".
- **Fuel: "Read the procedures" gives its counts** (`modules/fuel/module.js`, SPEC, DECISIONS; case F14) — e.g. "78
  procedures read from 18 pages", with the pages not read and their most frequent reason, and the procedures dropped by
  the geometry check.
- **Fuel: the vertical path no longer folds — no vertical jump, no climb back in the descent; an approach given by its entries is
  listed once** (`modules/fuel/progress.js` `verticalPath`, `module.js` `dedupProcs`, SPEC, DECISIONS; help ×4; cases F23, F24) — on the
  user's LFBO → LFPO the saved choice had the same record as approach and as transition (its fixes chained twice, 524 NM for 327), the
  path dropped from FL260 to 1,600 ft in 4 NM and rose to 7,000 ft; a ceiling now pulls the path down along the model's descent
  gradient, and once the descent has started the path never rises.

- **Fuel: a runway can be chosen at LFPO and LFBO — the runways are those of the procedures when aerodb has none**
  (`modules/fuel/module.js` `runwayChoices`, SPEC, DECISIONS; help ×4; case F22) — `aerodb.runways()` answers `[]` for files whose
  `RWnn` points have no position; the select now offers the runways the procedures name, then the two ends of the runway axis of the base.

- **Fuel: the runway, the STAR and the approach filter one another** (`modules/fuel/module.js` `procChosen`, SPEC, DECISIONS; help ×4;
  case F21) — a runway keeps the procedures that serve it (those with no runway named or `ALL` serve all); the choice that no longer
  fits goes back to « not chosen » with one floating line saying which; a SID, STAR or approach chosen first that serves one runway
  sets it.

- **Fuel: an aerodrome with approaches only shows them — LFBO's 18 were hidden behind « aucune procédure publiée »**
  (`modules/fuel/module.js`, SPEC, DECISIONS; help ×4; case F20) — the rows ask aerodb once per aerodrome for all kinds, so
  the Departure row of an aerodrome with approaches but no SID is no longer « without data »; without a runway chosen
  a list shows all the procedures, one group per runway; the lists are read again when aerodb installs or announces
  procedures.
- **Launcher jobs: errors cleaned, EAD Basic paced** (`tools/regen_jobs.py`, `frame/lib/launcher.js`, `frame/aerodb/aerodb.js`; INTEGRATION,
  SPEC, DECISIONS; tests K1, K22) — an error escaping a job no longer carries credentials, session identifiers or tokens into the job's log
  or the page; two EAD Basic readings are at least 30 s apart (« too soon », with the seconds left), so it is never read in bulk.
- **Map: "Aerodrome procedures" layer — the aerodrome pins coloured by what the device holds of their procedures**
  (`modules/maps/coverage.js`, `render.js`, `draw.js`, `layers.js`, `sheet_view.js`, `vfr.js`, `texts.js`, `lib/aero_symbols.js`,
  help ×4; V3_SPECIFICATION § 10.22) — green (held), orange (readable on demand), red (nothing readable), from
  `aerodb.coverage(icao)`; a box in Layers (off by default, not offered without `coverage`), one legend row per level in the "i"
  panel while the layer is shown, a coverage line (pin, level, reason from `AeroCatalogue.COVERAGE`, outdated, SID / STAR / APP
  counts) on the pinned aerodrome's card. Only the aerodromes in the frame are asked, in one batch per drawing, cached and asked
  again on an aerodb `coverage` / `refreshed` change. The layer lights up by itself while the flight has a side without chosen
  procedure whose aerodrome is not green (and goes out when both sides are chosen or green); touching its box wins until the page
  is reloaded; the kept state of the box is never written by the automatic lighting. Cases D45 to D50.

- **« Météo », one word for the weather module** (`frame/app.js`, help of fuel and the map, roadmap; DECISIONS): the computer's
  rail said « Atmosphère » while the phone's bar said « Météo »; now « Météo » / Weather / Wetter / Meteo everywhere (rail,
  bar, popover, header title, help). The address stays `#atmosphere`.
- **Launcher: nothing local to the workstation for a paired device** (`tools/launch.py`, `frame/app.js`): `/__setup/status`
  gives a paired device of the local network only what the frame's detection needs (no installation path, repository
  address, settings or Little Navmap databases), and aerodb's launcher job is null on such a device.
- **Flight path: an approach whose missed approach is not marked no longer flies it** (`frame/lib/current_flight.js`; bench
  `frame/lib/test/current_flight.html`) — LFPO RNP 20 read from the eAIP gave IPO20, FPO20, then PO425, MLN and MOLBA at
  7,000 ft without the `missed` phase: the path flew the missed approach before LFPO, the profile went down to 1,600 ft
  and climbed back, the distance grew by about 60 NM and the extra fixes crowded the labels. A final approach with no
  `missed` point now stops at its fix nearest to the chosen threshold (else the aerodrome); the fixes after it are its missed
  approach, drawn dashed and never flown.

- **aerodb: `--fetch` walks every results page, `proc_manual` refuses an empty file, safer Tesseract lookup** (`tools/proc_ead.py`, `tools/proc_manual.py`, `tools/proc_ocr.py`, K11 K12 K14) — the EAD results table is paged through (15 rows a page, 1 s between pages; the PrimeFaces paging parameters were not seen on the real screen: the first paged walk prints what it sends); `--fetch` ends by naming the text file and the OCR file with their counts and install commands; a file without procedures is never installed and its reasons are printed; Tesseract is looked up with `NoDefaultCurrentDirectoryInExePath` and run by absolute path, `--dpi` is capped at 600, the display mode runs under the OCR timeout.
- **Fuel: "Read the procedures" says where it reads** (`modules/fuel/module.js`, SPEC, DECISIONS; help ×4; case F14) — while
  reading, the button says "Reading the SIA eAIP…" (France) or "Reading EAD Basic…"; a State without published procedure
  tables is told so (and that Little Navmap has a database on this workstation, when it has); the old "layout unknown" refusal
  is gone.
- **aerodb: « Lire les procédures » for Toulouse and Orly — every page of the eAIP read, counts in the answer, runways of Orly selectable** (`tools/proc_eaip.py`, `tools/regen_jobs.py`, `tools/proc_manual.py`,
  `frame/aerodb/aerodb.js`; SPEC § 5 quinquies, INTEGRATION, DECISIONS; tests K1, K22, K23, K24) — LFBO installed 18 approaches and no SID / STAR, LFPO 160 procedures with whole pages missing, because the SIA's pages
  have layouts the reader refused (spelled cells `Y e s` / `1 . 0`, a runway header before each runway's own first legs, glued dashes, decimal commas, `F L 070`, a name cut in two `PB 096`, STAR titles with `(FIR)`, INA and ILS pages). All
  74 pages of the two aerodromes are now read (LFBO: 38 SID, 14 STAR, 26 approaches; LFPO: 181 SID, 102 STAR, 33 approaches), the one row that stays ambiguous is reported. Departures for two runways give one procedure per runway;
  legs without a fix (CA, FM) are kept; INA transitions are named by their STAR designator; ILS pages give the initial fix and the missed approach (`gap`). The missed approach of the RNP page of Orly RWY 20 was lost
  (its threshold row held a decimal comma): found. The first reading answered « 0 procédures » although the files were installed: the job result now carries `file` (the installed file) and aerodb serves it until its reader
  catches up; it also carries `stats` `{ pages, read, rejected, procedures, dropped, reasons }` for Fuel's notification (INTEGRATION). `runways(icao)` adds the runways the records name (Orly: 02, 06, 07, 20, 24, 25). A new reading of an
  aerodrome replaces the previous eAIP reading in `proc/manual/` (no ghost procedure under an old identifier).
- **aerodb: coverage of the procedures — `coverage(icao)`, `coverageByState()`, `AeroCatalogue.COVERAGE`**
  (`frame/aerodb/aerodb.js`, `catalogue.js`; SPEC § 5 and § 6 invariant 4, INTEGRATION « Coverage of the procedures », DECISIONS, V3_SPECIFICATION § 10.22; tests K1, K21) — what the
  Map's « Procédures » layer and the Données module's State list need: per aerodrome, green (procedures held: published, hand reading, X-Plane fallback, with the source, `outdated`
  and the counts), orange (readable on demand: SIA eAIP for France, EAD Basic, a Little Navmap database on the workstation) or red (nothing, with the reason: images, labels, points,
  prose, VFR only, none, unknown State), and `here` (this device can start the reading); per State, the same without held aerodromes, with a four-language label. One in-memory table
  built once from the procedure indexes (the base is never loaded), dropped and announced by `on('change')` as `{ coverage: true }` after an on-demand reading, a `refresh()` or a
  changed index.

- **aerodb: « Lire les procédures de LFPO » works for France — the on-demand reading is dispatched by State**
  (`frame/aerodb/aerodb.js` `fetchProcedures`, `tools/regen_jobs.py` verb `proc/eaip-fetch`, `tools/proc_eaip.py` `read_aerodrome`
  / `eaip_url`, `tools/launch.py` `/__setup/status › lnm`, `frame/store/transport_launcher.js`; SPEC § 5 quinquies, INTEGRATION,
  DECISIONS, V3_SPECIFICATION § 10.20; tests K1, K21, K23) — France (`LF`) reads the SIA eAIP coding tables (free, no account; the AIRAC
  folder address is computed by the launcher from the cycle in force, nothing from the page is an address), a State readable in EAD Basic
  keeps `proc/ead-fetch`, any other State answers `no-tables` (« aucune table publiée pour cet État », with `lnm` set when Little Navmap
  databases are on the workstation); `unknown-layout` is gone, `onProgress` and the success carry `source` (`eaip` | `ead`). Records stay
  `check` / `eaip`; a procedure whose geometry (magnetic course, distance) disagrees with its positions is not installed; installed under
  `proc/manual/` without overwriting another source and committed (those two paths, no push).

- **Launcher opens the Pilot application** (`tools/launch.py`) — the browser now opens `/frame/` (V3) at start; the V2
  pages stay at their addresses (`--page apps/…`, Settings › Administration). User: "le lanceur lance la v2, désormais
  obsolète".

- **Map: the chosen runway, SID, STAR and approach are drawn, and the profile follows the path "route + procedures"**
  (`modules/maps/procs.js`, `data.js`, `draw.js`, `render.js`, `profile.js`, `profile_view.js`, `flight_time.js`, `edit.js`,
  `vfr.js`, `texts.js`, help ×4; V3_SPECIFICATION § 10.20) — the procedures chosen in Fuel (`route.procedures` v2) are loaded once
  per change (`loadProcedures`) and the map keeps the expanded path and the flown path (`expandedPath`, `flownPath`); without
  aerodb, a choice or a record the path is the route and nothing changes. The trace starts at the runway threshold, transitions
  and the missed approach are dashed, a leg without a fix is a 2 NM stroke along its course then dashes, an RF leg is an arc,
  the SID and the STAR join the route on a common point or by a dashed direct (the route no longer draws the legs they draw),
  labelled "SID NAME" / "STAR NAME" / "APP NAME" with "X-Plane, local", "Little Navmap, local" or "outdated" when the source says
  so; from 300 px per degree each fix carries its altitude (underlined = at or above, overlined = at or below, both = exactly,
  "5000–7000" between) and speed ("≤ 220 kt") constraints, reserved in the label placer after the route's labels; procedures that
  are not chosen are never drawn and Layers has no box for them. The profile is cut along the flown path (distance, NM marks,
  cursor, ETA and planned position by `{ path }`), draws fuel's `profile.path` when it exists (else its fallback) and shows the
  constraints as steps. The aerodrome card gives the runway and procedures chosen with a "Change" button to
  `#fuel?focus=arr` (`dep`); the map never writes `route.procedures`, Edit mode no longer removes it. Constraint altitudes are in
  feet up to the airline's transition altitude included ("5000", never "FL050" at a 5,000 ft transition). Fixed on the way:
  fuel's profile was ignored whenever the frame had written the live position (`by: 'frame'`); only the map's own edit
  (`by: 'maps'`) makes it stale. Cases D41–D44, D30 updated.

- **Fuel: runway, SID, STAR and approach chosen in the preparation, the quote on their path, the arrival changed in flight**
  (`modules/fuel/module.js`, `progress.js`, `INTEGRATION.md` § 3, `SPEC.md`, `DECISIONS.md`; help ×4; cases F11–F19) —
  V3_SPECIFICATION § 10.20. Step Flight gets two short rows ("Departure: runway · SID · transition", "Arrival: runway · STAR ·
  transition · approach"), selects filled by aerodb and filtered by the runway (the X-Plane local record last, "outdated" marked,
  "aucune" writes `null`); an aerodrome without data offers "Read the procedures of LFXX" and shows the reason of a refusal in
  a floating notification. `route.procedures` is v2 (identifiers; fuel the only writer, readers through `proceduresOf`; an old
  `{ sid, star }` is migrated by fuel's next write, nothing at mount). "Load my OFP" replaces the choice by the OFP's SID and STAR
  and says what changed, one line per side. Before the start the quote runs on the flown path (`quote.legs` one per point with
  its origin, `quote.distanceNm`, `profile.path` with the constraints applied); after "Start the flight" the Departure step keeps
  the arrival row editable (the departure row until the end of the SID) and a change rewrites only the legs, `profile.path`, the
  length and `quote.legsAt`, never the block fuel. `#fuel?focus=arr` (the Map's "Change") opens the step with the arrival row.

- **Settings: EAD Basic credentials in the launcher's keys panel** (`frame/settings/launcher.js`, `tools/launch.py`, help ×4)
  — under the IVAO key, a block for the EAD Basic user name and password (given once to the launcher, kept in
  `secrets/ead.json`, never read back by the page, which only shows « saved on <date> » or « missing »), with the notice
  « demonstration tool, non-operational data, simulation use » ×4; used by the procedures job `proc/ead-fetch`; never
  synchronised. Test A32.
- **Data module: specification aligned on aerodb's and the frame's contracts (documentation only)** (`modules/data/SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`, `ROADMAP.md`): compiling (builders, workstation) kept apart from using (reader, every
  device); cycles as effective dates shown `YYNN`; the module reads aerodb's `publication()`, `zones()`, `sources()` only;
  procedures read by hand, EAD or OCR in `proc/manual/`, never purged, « Périmé » with « Relire », removed only by the
  owner's « Retirer »; `meta.launcher` / `meta.publish`, the launcher's operations as verbs of `regen/job`, `ctx.publish`
  one commit per zone; D0 and aerodb's D1 marked delivered.
- **Atmosphere: the date slider no longer jumps, and says when it is outside the forecast** (`modules/atmosphere/module.js`,
  `texts.js`, help ×4) — the time line beside the slider has a fixed width: a longer text (the day added past midnight) no
  longer shortened the slider, whose thumb moved under the pointer and changed the hour back and forth (+30 h ↔ +32 h); when
  part of the slider is outside the forecast read (a planned departure already past: the first hours seemed inoperative), a
  band under it shows the hours covered, ⚠ is shown on the slider line (not only in the collapsed grip) and a floating
  warning says it once; widening the panel no longer turns the cross-section's title into "World synoptic · 00:00Z · run
  00:00Z +— h" (the world title is for the map without a cross-section, and never shows an unknown hour); the departure in
  the title carries its day.

- **Flight path with the chosen procedures** (`frame/lib/current_flight.js`; bench `frame/lib/test/current_flight.html`) —
  `proceduresOf(flight)` gives the v2 view of `route.procedures` (`{ dep: { rwy, sid, trans }, arr: { rwy, star, trans, app,
  appTrans } }`; an old `{ sid, star }` migrated, a side naming another aerodrome returned empty), `loadProcedures(aerodb,
  flight)` resolves the ids and the chosen runways, `expandedPath(flight, procs)` lays route and procedures end to end (joined
  on the first common point, never a leg twice, legs without a fix kept for drawing, missed approach last) and `flownPath(path)`
  gives the flown points with their cumulative distance `nm`, the single measure for the profile, the map marks, the times and
  the quote; `legTimes`, `etaOf` and `plannedPositionAt` take `{ path }`, and without it read only the `quote.legs` of route
  points.

- **Performance sheets: airframe and propulsion come from the ICAO catalogue** (`frame/aerodb/sheets.js`, `modules/fuel/`; SPEC, DECISIONS, F10) —
  the "engine type" of a sheet (a ChatGPT guess that made a helicopter a turboprop) is replaced by two lists, airframe (aeroplane,
  helicopter, gyroplane, glider, balloon, airship) and propulsion (piston, turboprop, turboshaft, jet, electric, none, other),
  which the ICAO catalogue fills in by itself ("auto · helicopter" in the form); you only choose when the catalogue is silent or
  wrong. They are no longer counted as empty nor asked of ChatGPT, whose prompt got the new keys. Old sheets are converted when read.
  The sheets list now says what is missing by family ("To complete: rpm, speeds, cruise, taxi, runway") instead of a count.
  The critical altitude is only counted (and asked of ChatGPT) for piston engines.

- **aerodb: the on-demand reading of an aerodrome's procedures is wired** (`frame/aerodb/aerodb.js` `fetchProcedures`, `tools/regen_jobs.py` verb
  `proc/ead-fetch`, `frame/app.js`; SPEC § 5 quinquies, INTEGRATION, EAD_BASIC § 1, DECISIONS; tests K1, K22) — one aerodrome per gesture: the launcher
  logs in to EAD Basic with `secrets/ead.json` (never shown or logged), reads the aerodrome, repeats the geometry check, installs it under `proc/manual/`
  and commits those two files only in the data repository (whatever else the user has staged or modified there stays; no push); `fetchProcedures`
  answers the merged procedures, or a reason (`no-launcher`, `paired`, `unknown-layout`, `no-credentials`, `busy`, `cancelled`, `failed`). The frame hands
  aerodb `launcher.job`.
- **Fuel: the review of a re-imported sheet wraps its texts** (`modules/fuel/module.js`) — a long value (the description written by
  ChatGPT) stayed on one line in the "before / after" table and pushed it into a sideways scroll; numbers stay right-aligned on
  one line, texts wrap in their column.

- **aerodb: procedures for the preparation** (`frame/aerodb/aerodb.js`, `procedures.js`, `tools/proc_cifp.py`, `tools/proc_manual.py`;
  SPEC § 5 quinquies, INTEGRATION, EAD_BASIC § 1, DECISIONS; tests K1, K4, K11) — every leg with its phase (main, transition, missed),
  RF arcs and runway records from the FAA CIFP, legs without a fix kept without a position; hand-read procedures installed outside
  the cycles (`proc/manual/`) and served « outdated » once their cycle is past; `procedure(id)` (an OFP procedure included),
  `runways(icao)`, the index with the hand-read aerodromes, and the contract of `fetchProcedures` (the on-demand reading, wired next);
  a local X-Plane fallback (`proc/local/`, lowest rank, never synchronised).
- **Airway routing and map: the airways a route follows are found and readable** (`frame/lib/routing.js`, `modules/maps/render.js`;
  bench `frame/lib/test/routing.html`, 45 checks; fuel SPEC) — the user's route "LFBO GOSAD AULON LAVRA OBLOC VELIN LMG … LFPO":
  VELIN → LMG stayed direct although R10 joins them through NORON (a point on a node reached the next node by a direct entry
  of the same length, so the path had no airway segment); the airway now wins a tie, and a leg of 40 NM or less whose two ends
  are airway nodes takes the airway (OBLOC R10 VELIN, GOSAD G36 AULON) when the base is read for the chain; above FL195 these
  low airways stay closed, as they should. LAVRA → OBLOC is V14 through IBDER in the published base (V44 runs MTL – ROLIR). On
  the map, the boxed name of an airway that a route leg follows stays on the airway and is drawn over the route's line, which
  it interrupts (the en-route charts' convention; decided with the user), sliding along the segment, never beside it, when a
  route label is in the way (case D40).

- **Frame, lot D0: services for the Data module** (`frame/lib/launcher.js`, `frame/app.js`,
  `frame/store/transport_github.js`, `tools/regen_jobs.py`, `tools/launch.py`, Settings' `kit.js`, aerodb's `lnmperf.js`;
  INTEGRATION § 15, SPEC, DECISIONS; benches A29, A30, cases A31, I8):
  - `ctx.launcher`: the workstation's launcher for a module, limited to the routes and paths its `meta.launcher` declares,
    with a fixed protocol for long jobs (progress, cancel, resume after a reload);
  - `ctx.publish`: generated files committed to the data repository without a launcher, one commit per zone, a conflict
    returned and resumed, the token never given to a module;
  - the launcher's jobs base (`/__setup/regen/state`, `/__setup/regen/job`): one job at a time from a fixed list;
  - an end-of-cycle line in the Status block when the published base or procedures are behind the AIRAC cycle;
  - Settings and aerodb's `.lnmperf` sheets now reach the launcher through the frame's one client.
- **aerodb, lot D1 for the Données module** (`frame/aerodb/airac.js`, `catalogue.js` (was `sources_data.js`), `aerodb.js`,
  `frame/app.js` (the Sources screen's scripts); SPEC § 5 and § 5 sexies, INTEGRATION, DECISIONS; bench `test/catalogue.html`, test K21) —
  one calculation of the AIRAC cycle; the catalogue with each source's group, zones, fetch, build and publication, the EAD Basic
  outcome of the 47 States and the file-name readers; `publication()` (what is published, without loading the data), `zones()` (every
  known zone) and `sources()` (the catalogue) for the module.

## [6.0.0-alpha.2] — 2026-10-28

Second alpha of the V3 **Pilot application**, five days after the first. The phone screen follows the iVAC target
(bottom bar Prepare · Map · Report · Flights · Weather, gear with a badge, status block at the top of Settings, fixed
map screens with overlay buttons, full screen, a three-position sheet, landscape as a rail and a column). The **Map
module was recoded from its specification** (files by concern, derived times from the quote's leg times, Edit mode
merging into the route, airspaces at a point read from the source, VFR points and aerodromes pinned). One **weather
layer** in the frame (cache, counted quota) read by Fuel and the Map; the **Atmosphere** module (cut along the flight,
world synoptic from NOAA GFS published by the site). **Settings** grouped by level, keys kept across a Safari
relaunch, Administration behind one button, **Aqua** design for computers only. **Procedures** (SID / STAR /
approach) through one aerodb API: SimBrief OFP, SIA eAIP, FAA CIFP, EAD Basic read by hand per aerodrome (coding
tables of 17 States, OCR, manual readings kept and marked outdated; non-operational data). A **non-regression suite**
(140 cases) gates every lot. The data laboratory was measured and removed; a **Data module** is specified. Alpha: data
formats and screens may still change; Atmosphere is being recoded for the next alpha.

### V3

- **aerodb: hand-read procedures kept, marked outdated** (`frame/aerodb/SPEC.md` § 1 and § 5 quinquies, `INTEGRATION.md`, DECISIONS;
  documentation only) — the user's amendment: EAD Basic, manual and OCR readings live in `proc/manual/<ICAO>.json`, outside the cycles,
  read whatever their age and marked `outdated` once their cycle is not in force, never purged by themselves; compiling the raw sources and
  using the compiled data stay strictly apart, the compiled JSON in the private data repository.
- **aerodb: contracts with the Données module** (`frame/aerodb/SPEC.md` § 4, § 5, § 5 quinquies to 5 septies, § 6,
  `INTEGRATION.md`, DECISIONS; documentation only) — cycles stored as effective dates and shown as AIRAC ids through one
  `airac.js`, three cycles kept; `publication()`, `zones()` and `sources()` for the module (lot D1); the catalogue kept by
  aerodb as `catalogue.js`; builders in two stages (pieces per source, an assembler per zone, nothing written by them, lot
  D5, complete readers first); invariant 1 amended; procedure sources `ead-basic` and `manual`, and an aerodrome missing
  from the cycle in force read from the previous kept cycle.
- **Data module specified (documentation only)** (`modules/data/SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`, `ROADMAP.md`;
  a pointer in `docs/technique/V3_DONNEES_REGENERATION.md`): the module « Données » (Full level) that regenerates the
  published data without V2 — coverage (every published zone ticked at first), data sets in four groups, « Tout mettre à jour » on top, the verbs Télécharger, Construire, Publier, Purger and
  « Mettre à jour », states and the gap between the workstation and the repository, three cycles, the EAD line, what works
  without the launcher; its requests to the frame (`ctx.launcher`, the launcher's routes, publishing without a launcher,
  the end-of-cycle line) and to aerodb (the published state, the builders); lots D0–D10; it replaces the Sources screen at
  D1 (test zone L). No code.
- **aerodb: Belgian coding tables, SID variant and the real `--fetch` run** (`tools/proc_eaip.py` `parse_be_coding`, K14, `frame/aerodb/EAD_BASIC.md` § 7.1) — a SID/STAR table whose middle legs print no course is kept with the warning "course not printed: geometry not checkable" only when every point is resolved from its list, the first leg is IF/CF and every leg is IF/TF/CF/DF; identifiers printed in two lists with different co-ordinates reject their tables; approaches keep the strict rule. Real on-demand run on three aerodromes: EGLL 4 approaches + 18 STAR by OCR, LOWG 4, EBBE 5 of 6 (the sixth prints a course 1.2° off its own co-ordinates: rejected by design).
- **aerodb: EAD Basic used as its terms allow** (`tools/proc_eaip.py` `ead_notice`, `tools/proc_ead.py`, `tools/proc_ocr.py`,
  `tools/proc_manual.py`; `LICENSE.md` § 5, `frame/aerodb/EAD_BASIC.md` § 1 and § 8.1, DECISIONS; test K12) — the user's decisions: simulation
  use, data not operational (a mention in every file read through EAD Basic), the survey by hand, one aerodrome per `--fetch` on an explicit
  gesture, never scheduled nor in bulk; a licence line for EAD Basic; one State per line with its outcome, the OFP as the per-flight source
  where a State publishes no coding tables, France from the SIA only.
- **aerodb: OCR of drawn pages, survey of the 47 EAD Basic authorities, whole-document reading, nine layouts** (`tools/proc_ocr.py` new,
  `tools/proc_eaip.py`, `tools/proc_ead.py`; `frame/aerodb/EAD_BASIC.md` § 7 to 9, DECISIONS; tests K12, K14 to K20, `.gitignore`) — pages
  without a text layer are rendered (`pypdfium2`) and read by OCR (Tesseract or `rapidocr-onnxruntime`, optional, workstation builders only,
  the user's decision), re-read at 300, 500 then 200 dpi, regrouped into rows and passed to the usual parsers; the result `<ICAO>.ocr.json`
  is installed only by `tools/proc_manual.py` after its geometry gate, and `--fetch` runs this OCR pass on drawn documents. Every page of
  every PDF is read (the table is often on page 2 or later), co-ordinate lists in five printed forms fill the points of tables without
  co-ordinates before the gate, a leg without a printed true course is checked from its magnetic course or its distance. Layouts `uk-star`
  (EGLL's 18 STARs, now automatic), `at-coding`, `de-route`, `icao-tab`, `ei-coding`, `be-coding`, `ge-coding` join `sia-code`, `uk-app` and
  `am-coding`; the survey of the 47 authorities (one sample per State, 1 s apart) reads 14 States, lists the others (charts only, image
  only, prose, vector tables). Single-letter cells (fly-over, turn) are not read by the OCR. Each document is rendered and read under a time
  limit (`OCR_TIMEOUT`, 10 min).
- **aerodb: EAD Basic per-State survey, on-demand fetch of one aerodrome, Armenian coding tables** (`tools/proc_ead.py --survey /
  --fetch`, `tools/proc_eaip.py` `classify_pdf` / `am-coding`; `frame/aerodb/EAD_BASIC.md` § 6 terdecies, DECISIONS; tests K12, K13,
  `.gitignore`) — one command counts, for every authority, the coding / departure / arrival / approach charts and classifies one
  sample (text, vector, image); another downloads and reads one aerodrome's coding tables (or its SID / STAR / IAP charts when the State
  publishes none), reporting unknown layouts instead of guessing; the Armenian layout (cells split over several lines) is read by
  order and count of values and checked against the printed courses and distances. Security review: at least one second between two
  requests, the survey files written sanitised, ICAO codes checked before they name a file, each PDF read under a time limit.
- **aerodb: manual interpretations installed through a geometry gate** (`tools/proc_manual.py`; SPEC § 5 quinquies `trk`, `nav`,
  `source.how`; `frame/aerodb/EAD_BASIC.md` § 6 duodecies, DECISIONS; test K11) — a procedure read by hand (or by a model) from a page whose
  text is drawn as outlines is installed only if the printed course and distance of each TF leg agree with its positions, with status
  `check`; the installer merges by procedure id into the aerodrome's file, keeps the best status (`official` > `check`), and refuses to
  touch a file of another source without `--replace`. The UK STARs of EGLL were prepared this way (the data go to the private data
  repository only).
- **aerodb: format check of the coding pages, UK coding tables, geometry check** (`tools/proc_eaip.py` `detect_layout` /
  `verify_page` / `fingerprint` / `--check` / `--page` / `parse_uk_app` / `records_uk_app` / `check_geometry` / `build_pdf_dir` /
  `--pdf-dir`, `tools/proc_ead.py` `--aip-type` / `--docs`; SPEC `formats`, `frame/aerodb/EAD_BASIC.md` § 6 septies to 6 undecies,
  DECISIONS; tests K3, K6, K10) — a coding page is read only if its layout is recognised and at least 85 % of its leg rows are read; the
  aerodrome file lists the verdict of each page and `--check` runs it alone before a publication. The UK's coding tables are separate
  *Charts* documents fetched by exact name; its RNP approach tables (text layer) are read into approaches, each table checked by
  recomputing the true course and distance from its own co-ordinates (an incoherent table is not kept); a page drawn as vector
  outlines (the UK STAR tables) is reported as unreadable, never guessed. Each PDF is read by pypdf under a time limit.
- **aerodb: EAD Basic probe and library, rounds 2 to 5** (`tools/proc_ead.py`, `tools/proc_eaip.py --scan-pdf`; `frame/aerodb/EAD_BASIC.md`
  § 6 bis to 6 sexies, DECISIONS; tests K3, K6) — from the owner's runs on the real screen: page-state tokens blanked in the report; the
  AIP Library's data table read from the JSF partial answer (the announced count, every list sent with its default, the State's change
  event replayed); the advanced search opened and "Document Name" found by its label, the prefix `EG_AD_2_EGLL` searched (exact-name
  enumeration as a fallback, never walking the pages), four request shapes tried and the one that works kept first; one document
  downloaded through its ▶ button into the local cache only (`--name`, `--download`, `--docs`); `--scan-pdf` reports page by page the
  titles and keywords of a downloaded PDF to find coding tables, copying no content.
- **Frame: a store script lost at start no longer breaks the page** (`frame/app.js`; SPEC § 3, DECISIONS; test A28): the
  frame asks a missing store file again once and starts; if it is still missing, the page says which file and offers
  "Reload" instead of a blank page and a JavaScript error ("reading 'detect'").
- **Design: Aqua, for computers** (`frame/design/tokens.css`, `aqua.css`, `aqua/`; `frame/app.js`, `frame/index.html`,
  `frame/sw.js`; design SPEC § 1–3, DECISIONS, V3_SPECIFICATION § 10.3; tests H5, H6): brushed metal header and rail, glass
  cards, gel buttons, striped page and one desk panel per module, day and night. Offered and drawn on a computer only
  (`html.f-desk`); on a phone or a tablet a saved Aqua stays saved and the frame draws Standard; Aqua's images are never
  fetched there.
- **Design: skin tokens** (`frame/design/primitives.css`, `frame/frame.css`; design SPEC § 2, DECISIONS): buttons, the
  primary button, fields, cards, the sticky bar, the header and the rail read optional `--sog-btn-*`, `--sog-card-*`,
  `--sog-field-shadow`, `--sog-bar-bg`, `--sog-bar-radius`, `--sog-head-*`, `--sog-nav-*` tokens, falling back to today's
  values: every design draws the same to the pixel; a design can now change their material with tokens only (first user:
  Aqua).
- **Settings: a card reached by its address is shown whatever the level** (`frame/settings/settings.js`, `groups.js`;
  SPEC § 1, DECISIONS, Settings help ×4; test A27): `#settings?card=<name>` and the joining assistant's
  `#settings?offline=1` show that card alone under "← Settings", even at Discovery, whose list stays at seven cards.
- **Settings: the Design card says when Aqua does not apply** (`frame/settings/settings.js`; SPEC § 3 item 3b,
  DECISIONS, Settings help ×4; test A26): on a device that is not a computer, Aqua chosen shows Standard; one line under
  the thumbnails says so, Standard's thumbnail is marked, and touching a thumbnail replaces the choice.
- **Settings: seven cards at Discovery, folded groups above; the launcher's administration behind Administration**
  (`frame/settings/groups.js` new, `settings.js`, `launcher.js`, `admin.js`, `admin_links.js`, `diagnostic.js`,
  `frame/frame.css`, `frame/app.js` `LAZY.settings`, `frame/sw.js`; SPEC § 1, § 3, § 6, INTEGRATION § 1, DECISIONS,
  Settings help ×4; tests A8, A12, and A19, A20, D16, J5 open the group of the card they touch): Discovery shows Identity, Access, Synchronisation, Usages, Level, Design and About,
  flat; Everyday and Full show seven folded groups (Identity, Access, Data, Device, Display, Administration, Help), the one
  that needs attention open with an amber dot; a status line opens the group of its card. The remote repository of
  `data/` and the IVAO key are panels of the Administration card. Computer access: pairing date in UTC, clearer messages
  when forgetting a device or opening the other addresses. The Design card says when the design chosen is for the
  computer only (Aqua, once its lot 1b is in).
- **Fuel: times over the points derived, not written** (`modules/fuel/module.js`; INTEGRATION, SPEC, DECISIONS) — the
  Map computes the ETAs and the planned position from the quote's legs; fuel keeps only the fuel and distance remaining
  and the phase of a started flight.
- **Frame: the recoded Map's touches, reviewed** (`frame/app.js`; INTEGRATION § 6, SPEC § 3, DECISIONS): the elevation
  tiles' direct path is limited to https and GET; `ctx.level`, the flight-in-time helpers of `frame/lib/current_flight.js`
  and `frame/lib/routing.js` are documented.
- **Map recoded from its specification (lot 1)** (`modules/maps/`: `module.js` split into `state.js`, `texts.js`, `style.js`,
  `screen.js`, `draw.js`, `data.js`, `layers.js`, `sheet_view.js`, `profile_view.js`, `tips.js`, `lv.js`, `vfr.js`,
  `flight_time.js`, `mission_view.js`, `weather.js`, and `edit.js`, `tune.js` loaded on demand; `frame/lib/current_flight.js`,
  `frame/lib/routing.js`; benches `modules/maps/test/profile.html`, `axis_window.html`, `mission.html`, `sort.html`,
  `frame/lib/test/current_flight.html`; tests D30–D38, J6, mission fixture; help ×4; SPEC, INTEGRATION, DECISIONS): the
  5,490-line module becomes eighteen files of at most 60 KB, the libraries unchanged. The flight's ETA and planned position
  are derived from fuel's `quote.legs` by the frame's `etaOf` / `plannedPositionAt` (a flight is started when `started.at`
  is set, never because `progress` exists; arrived and diverted flights get their note; the progress line has an "Enable
  the position" button); the Edit mode merges into `route` (procedures of the same aerodromes kept, the moved point's wind
  dropped) and shows only Edit, "+", Undo, Recentre and full screen; Layers starts with Complexity and ends with the flight
  selector; the modes panel lives in the frame's overlay layer; the airway routing moves to `frame/lib/routing.js`; a
  mission's origin and destination are found again when they carry their own codes. The weather cut reads the frame's weather
  layer (`ctx.weather.grid`, cache only, frame INTEGRATION § 14) instead of atmosphere's store, and departs at `started.at`, else
  `planned_at`; the elevation tiles of the profile and the contour lines are read through `ctx.net` (the bricks take a `load`
  function and never call `fetch`; the frame lets `s3.amazonaws.com/elevation-tiles-prod/` through), the module fetches none of
  its own files any more; "Save for the airline" of the tuning page is refused below the Full level (`ctx.level`, new in the
  module context); the profile states its window to the hundredth of a NM like the cut (D25). The map's help chapter carries the
  French fingerprint in English, German and Spanish again.

- **Map: the specification rewritten as a final state, before the module is recoded from it** (`modules/maps/SPEC.md`,
  `INTEGRATION.md`, `DECISIONS.md`, `tests/v3/PLAN.md`): the 52 contradictions, gaps and ambiguities found between the map's
  documents, V3_SPECIFICATION § 7.1, the frame, atmosphere, aerodb and fuel contracts and the tests were decided; the SPEC now
  states one behaviour per subject, renumbered, with what is written, the addresses and a DOM contract; the times of the flight
  (ETA, planned position) become derived values of `frame/lib/current_flight.js` from fuel's `quote.legs`; the Edit mode merges
  into `route` instead of replacing it; `lib/routing.js` is to move to `frame/lib/`; the test plan's map cases are reworded and
  D30–D38 added (Edit mode, derived times, date line, mission fixture, plain background, device settings, Escape order, base-map
  names, benches). Amended after review: weather read through the frame's `ctx.weather`, Complexity first in Layers and the
  flight selector last, the Edit mode's column limited to five buttons, fuel's `quote.taxiMin`, contextual help anchors. No
  code changes.
- **Launcher, access of the computer: "Open them too" leaves the pairing code alone** (`tools/launch.py`; frame SPEC,
  DECISIONS): on an access already open it adds the other private addresses without issuing a code, so a pairing closed
  after 30 wrong codes stays closed until "New code".
- **Settings: `settings.js` split into five parts, no change of behaviour** (`frame/settings/kit.js`, `launcher.js`,
  `access.js`, `diagnostic.js`, `admin.js`, `settings.js`; `frame/app.js` `LAZY.settings`, `frame/sw.js` `SHELL`;
  INTEGRATION § 1, SPEC, DECISIONS): files of at most 60 KB by concern; the screen is identical (snapshot compared in
  eight contexts).
- **Weather layer: the run shown is the data's** (`frame/lib/weather_store.js`; INTEGRATION § 14, DECISIONS; bench 73/73):
  for Météo-France the layer read AROME HD's run (03:00Z) while the winds aloft are ARPEGE's (06:00Z); it now reads the
  metadata of the model that carries the pressure levels (ARPEGE Europe, ICON, GFS 0.25°). The expected precision of a
  cell (its centre, up to 0.05° from the point) is written.
- **Frame: `html.f-desk`** (`frame/app.js`, `frame/index.html`; INTEGRATION § 9.1, SPEC, DECISIONS): the frame marks a
  computer (wider than 760 px, a precise hovering pointer, not a phone in landscape) from the first paint, for the designs
  kept for computers (Aqua); `frame-desk` says when it changes.
- **Fuel reads the shared weather layer** (`modules/fuel/module.js`, `winds.js`; SPEC, INTEGRATION, DECISIONS) — the
  winds aloft and the aerodromes' METAR / TAF come from the frame's weather store: one cache and one count of calls for
  the whole app; fuel no longer calls any weather service itself.
- **Frame: `progress.actual` fixed, Escape taken by a module** (`frame/app.js`; INTEGRATION § 6 and § 9.4, DECISIONS;
  test B11): the actual position the frame writes into the current flight has a written shape (fields, units, nulls,
  frequency); the frame ignores an Escape a module already took (`preventDefault`) and marks the ones it uses.
- **Frame: the level message of a service screen is marked** (`frame/app.js`: `data-screen-level="<id>"`, for a test to
  find it without reading its text); the frame's debt "GitHub token within the page's reach" is written in
  `docs/technique/DETTE_TECHNIQUE.md`.
- **Frame: the module's title across a resize** (`frame/app.js`, `frame/frame.css`; INTEGRATION § 6, SPEC § 4,
  DECISIONS): the header's title and `frame-titled` are also recomputed on `resize` and `orientationchange`; the rule
  that hid the modules' `h1` is removed, the modules now hide it themselves.
- **Tests V3 under Windows: the runner's own static server** (`tests/v3/static_server.py`, `run.py`, `lib.py`, README,
  PLAN): `python -m http.server` lost module loads at random (HTTP/1.0, one connection per file: a run left 13,375
  ports in TIME_WAIT and Windows ran out of them; a listen queue of 5); the new server speaks HTTP/1.1 with keep-alive,
  has a long queue, one thread per connection, fixed file types and no cache. A run failing on a file the server did not give is played once more, and the report says "played twice". F1,
  which failed on every try, passes 10 times out of 10.
- **Frame: one weather layer** (`frame/lib/weather_store.js`, `ctx.weather`; `frame/app.js`, `frame/store/frame_data.js`;
  INTEGRATION § 14, SPEC, DECISIONS; bench `frame/lib/test/weather_store.html`, case A25):
  - one cache for the device (`cache/weather/<model>/<cell>/<UTC day>.json`, never synchronised, out of backups);
  - Open-Meteo is called only for the missing cells, days and variables, in as few requests as possible;
  - a weighted count over 24 h waits before Open-Meteo's minute limit and stops before its day limit, with a margin;
  - the winds aloft of a route, a forecast grid, METAR and TAF, the published world forecast;
  - a new Status line, "Weather: n calls today".
- **Data sources screen in place of the data laboratory** (`frame/aerodb/sources.js`, `sources_data.js`, `xml_stream.js`, `zip_stream.js`;
  `frame/app.js`, `frame/settings/admin_links.js`, `frame/store/transport_github.js`, `tools/csp_policy.py`, `tools/build_pages.py`,
  `tools/launch.py`; SPEC, INTEGRATION, DECISIONS, frame SPEC and INTEGRATION, Settings help ×4, tests A20, K8, K9) — the user's decision:
  the laboratory (`#datalab`) is removed with its probes, parsing modes, trial publications, page-policy hosts and launcher patterns; a
  « Sources » screen (Full level, Administration card) lists the sources used, considered or set aside, each with what it gives, its
  licence and a plain link (the cycle in force for the dated ones), downloading nothing; the streaming XML and ZIP readers are kept,
  renamed, with a bench each, for the future Data module.
- **Built pages and the laboratory's end date** (`tools/build_pages.py`; DECISIONS, test K9) — a page built without launcher freezes
  its policy in a meta tag (Pages site, iOS app) until it is built again: the build names `LAB_UNTIL` while the lab's hosts are in
  it, and once the date is passed with the laboratory still in the code it warns (GitHub Actions annotation) without refusing; K9
  builds `frame/index.html` in a temporary folder and checks its meta policy before and after the date.
- **EAD probe: the login answer encoded twice** (`tools/proc_ead.py`; DECISIONS, test K6) — the login form's answer, met as a JSON
  string holding the object during the owner's run, is read again (`login_json`); another JSON value is named as unexpected, a
  non-JSON answer shows its beginning in the report (sanitised like every line). Taken from the uncommitted change of the run.
- **Security review of 28 October: CSP, EAD probe, fixtures** (`tools/csp_policy.py`, `tools/proc_ead.py`, `.gitignore`,
  `frame/aerodb/EAD_BASIC.md`, `frame/aerodb/test/fixtures/SOURCES.md`; DECISIONS, INTEGRATION, tests K6 and K9) — the
  laboratory's hosts get an end date in the code (31 Dec 2026) and ArcGIS Online only the path of the measured service; the
  probe's report removes the encoded forms of a secret and refuses a redirect off the EAD host, its folder is ignored by git;
  the fixtures say their source and licence (SIA open licence for the eAIP extracts, the AIXM sample is synthetic).
- **Data laboratory: trials on a disposable branch** (`frame/aerodb/lab*.js`, `frame/store/transport_github.js`, `frame/app.js`;
  SPEC, INTEGRATION, DECISIONS, frame SPEC, tests A23 and K9) — the trial blocks go to `lab/<trigram>`, created from the main
  branch's head and deleted by "Clean" (and by the next opening), never to the main branch whose history kept them; the lab
  receives a reduced transport enforced by the frame (commits under `lab/` on that branch only); one block at a time, 10 MB per
  session; the report says what was written and where; INTEGRATION documents the purge of the blocks already published.
- **My flights: status lines for Settings** (`modules/flightlog/model.js`, `module.js`; INTEGRATION, SPEC, DECISIONS) —
  the reports to write are published ready to show (four languages, times in UTC); the frame no longer reads the
  module's own list.
- **Fuel: minutes to each route point in the quote** (`modules/fuel/module.js`; INTEGRATION, DECISIONS) —
  `quote.legs` gives the Map the planned time from brake release to every point.
- **Fuel: one flight date** (`modules/fuel/module.js`; INTEGRATION, DECISIONS, help ×4) — the
  flight date is only `planned_at` (no more `weather.when` copy), its field says it is in the device's local time;
  readers of `progress` test the start (`started.at`).
- **Frame: service screens, published status lines, `ctx.titled`** (`frame/app.js`, `frame/aerodb/lab.js`,
  `frame/design/primitives.css`; INTEGRATION § 6, 7, 10, 13, SPEC § 4, DECISIONS):
  - frame screens drawn by a service are declared (`APP.screens`), and the frame's code no longer names the data
    laboratory;
  - modules may publish ready status lines (`cache/<module>/status.json`), which the frame shows without knowing their
    formats;
  - `ctx.titled` tells a module that the phone's header carries its title;
  - "unmount during mount" is written as a module contract;
  - the remaining debts are dated.
- **Tests: the V3 suite runs on Windows** (`tests/v3/lib.py`, `run.py`, `domains.py`, `README.md`) — the runner finds
  Playwright's Chromium under `%LOCALAPPDATA%` or the installed Chrome, accepts Playwright's own browser, writes UTF-8
  whatever the console, reads git in UTF-8; commands written `python tests/v3/run.py`, `SOG_CHROME` shown with the
  Windows example.
- **Relay synthesis brought up to 27 October** (`docs/technique/V3_DECISIONS_RELAIS_2026-10-24_27.md`, renamed from `..._2026-10-24.md`; documentation only): Part 1 keeps the 24 October document with italic "Superseded" lines, Part 2 gives the final state by area of 25, 26 and 27 October (rules 13 to 21, the sheet rewrite, the airspaces graph, procedures through aerodb, the data laboratory and the iPhone measures, the suite from 86 to 118 cases, process, open points); references in the journal and in `V3_APP_DONNEES.md` follow the new name, help bundle rebuilt.
- **Data laboratory: the test hook of the addresses no longer exists on a published site; the openAIP line says its S3 export is slow** (`frame/aerodb/lab_sources.js`,
  `lab.js`, the Settings manual and the pilot manual in four languages, `tests/v3/cases/frame.py` A20). User, 27 Oct, iPhone, Safari: "all the lab's 'open the link' tries went
  to openAIP, and timed out". **Not reproduced**: in Chromium with an iPhone emulation (375 x 667, touch, iOS user agent), five designs, day and night, every one of the 16
  lines has an `href` equal to its table address and a touch on it opens a tab on that same address, with `sogLab:urls` absent, `{}`, `null`, malformed, an array or a string,
  after a "blocked by CORS" test (links moved first) and after a reload with a report. The code path (`linkSet` > `urlOf` > `override` or `rawUrl`) cannot give one address to every
  line; WebKit is not available here, so an iOS-only behaviour is neither shown nor excluded. What was wrong and is fixed: `override` took any stored value (a number, an
  object, `javascript:`) and worked on any page; it now answers only on a page served from `localhost` / `127.0.0.1` and only with an https string (or http to the machine itself,
  the fake servers of the tests), otherwise `''`. The openAIP help (folded) says that the S3 export can be slow to answer and that the long press is the right gesture. A20
  checks every link's host and address against the table, three touches (SIA, CIFP, NAT) on a touch emulation, and the hook's cases including a "published" host.
- **Data laboratory, pass 2: a direct link on every source, no address to copy; four publication buttons; a ten-line summary; EAD Basic; a real link from the
  Administration card** (`frame/aerodb/lab.js`, `lab_sources.js`, `lab_report.js`, `lab_measure.js`, `lab.css`, `frame/aerodb/test/lab.html`,
  `frame/settings/admin_links.js` + `settings.js`, `tools/csp_policy.py`, `tests/v3` A20 A21 A23 K8, aerodb SPEC § 5 sexies, DECISIONS, `V3_APP_DONNEES.md`, Settings
  manual x4; **temporary**) — user 27 Oct, after the first run on his iPhone: "Un certain nombre de fichiers json récupérés mais téléchargés en pdf (impossible de
  sauvegarder un json depuis safari). Prochaine passe du labo : lien direct sans Copy/paste en cas d'échec." Nine sources of fifteen are blocked by CORS from a
  page, so each line now has a real `<a href target=_blank rel=noopener>` "Open / Download" to its address (the cycle in force; the next cycle's too when it is
  asked for in the cycle list or its last test answered), with a folded help "long-press the link, then Download Linked File; the file lands in Files ›
  Downloads; then From a file" that **unfolds after a test that says "blocked by CORS"**, which also puts the link and "From a file" before "Test the address"; where the
  read is permitted the test stays first and the chain runs directly. A page that is not a file (SIA product page, ENAIRE index, NAV CANADA, NATS, eAIP menu)
  says what to download there. A JSON read that worked can be saved by the share sheet (`navigator.share({ files })`) when the device offers it; the report's device
  block now says whether it does (`share / canShare / files json / files geojson`). Publication: four buttons (0.5 / 2 / 5.3 / 10 MB), one block each, each with its
  result or error in the report, even when the API never answers ("no answer after 120 s", then the late answer if it comes); "Clean" lists what it removes. The report
  opens with a summary of ten lines at most (parsing times, sizes published, sources allowed / blocked / unreachable by name, EAD Basic), "Share the report" when
  the device can. New line **EAD Basic (EUROCONTROL)** after NATS: "Test the address" on the public login page, "Test the login call (empty)" (the form's POST with
  empty fields, nothing else, no cookie; never a credential), the link and the help, a PDF or ZIP by "From a file"; host added to `connect-src`. The GitHub limits
  found in its documentation are in the report and in `V3_APP_DONNEES.md`. The Administration card's lab entry shows the absolute address of the screen (from
  `location`) under its link, with "Copy the link"; a "Settings › Administration" link at the top of the screen. A20 A21 A23 K8.
- **Map: the airspaces of a point read top-down** (`modules/maps/render.js` `sortAirspacesTopDown`, `modules/maps/module.js` `levelsHtml` / `strip`, `tests/v3` D26,
  SPEC § 4 nonies, DECISIONS, Pilot manual x4) — user 26 Oct: "Pour lire, le plus haut en haut, le plus bas en bas. Inverser 12345 quoi." The list
  "n espaces sur ce point" now starts with the highest space (ceiling descending, UNL first, then floor descending, then the name); number 1 is that space,
  the graph's columns keep the number of their line and run left to right in the same order, and the hover bubble and the profile cursor's line use the
  same order (one function). A ceiling that cannot be read is ranked with its floor, after the known ceilings above it. The "Aussi ici" line is unchanged.
  D26.
- **aerodb: EAD Basic probe** (`tools/proc_ead.py --probe`, `tests/v3/cases/aerodb.py` K6, `frame/aerodb/EAD_BASIC.md` § 6, DECISIONS) — a read-only explorer the owner
  runs with his own EAD Basic account (password typed, never kept): login, AIP Library form, search for the United Kingdom / AD, documents found for EGLL;
  no PDF downloaded, output sanitised. It prepares the one-click job and the first State's layout.
- **aerodb: one-click design for the EAD Basic procedures** (`frame/aerodb/EAD_BASIC.md` § 5, DECISIONS) — a Maintenance button starting a launcher job
  (login from the secrets store, AIP Library search, AD 2 download into the local cache, layout registry, `proc/`, plan then result), the blockers in
  the order to lift them (terms of automated access, one real page per layout, the AIP Library screens) and a draft question to EUROCONTROL. DFS on standby.
- **Data laboratory: can the aeronautical base be fetched, parsed, compiled and published from a phone? Measured on the owner's phone** (screen
  `#datalab`, `frame/aerodb/lab*.js` and `lab.css`, a button of the Administration card at the Full level, `frame/aerodb/test/lab.html` and its
  synthetic fixtures, `tools/csp_policy.py`, `tools/launch.py` `download_patterns`, `tests/v3` A20–A24 and K8–K9, aerodb SPEC "Data laboratory",
  DECISIONS, INTEGRATION; **temporary**, lot P0 of `docs/technique/V3_APP_DONNEES.md`) — user 26 Oct: "Go. Tu inclus toi-même les injecteurs et mesures
  dans le lab. Je m'organise pour download le SIA « payant », tu trouves toutes les autres URLs." One line per source of the table 1.2 (15: the 17 without
  X-Plane and the aircraft types) with its real address (the eAIP and CIFP ones derived from the AIRAC cycle), expected size and licence;
  "Test the address" (a timed `fetch`, with the diagnosis "blocked by CORS" / "blocked by the page policy" / "unreachable") and "From a file" (a picker; "From
  Downloads" on a workstation with the launcher, by the existing `GET /__setup/downloads`; the cycle is read from the SIA file name). The SIA zip goes through
  the chain of V2 in three separately measured modes — (a) main thread with `DOMParser`, (b) a Worker without `DOMParser` and a tag-based XML reader, zip in memory,
  (c) the same fully streamed — with time per step, heap where the browser exposes it, a trace that detects a killed tab, and counts per kind compared with
  the published base; the reader's counts are identical to V2's on the real 2026-10-01 export. A trial publication through the data layer's GitHub transport
  (never the token), its cleaning, and a report that is copied and kept on the device (`cache/lab/report.json`). The page policy now lists the 12
  hosts of the sources in `connect-src` (a security decision per host, to be reviewed when the laboratory goes).
- **Data: the "Data" screen and the dedicated data application, specified** (`docs/technique/V3_DONNEES_REGENERATION.md`,
  `docs/technique/V3_APP_DONNEES.md`, `V3_SPECIFICATION.md` § 10.18 and § 10.19, aerodb DECISIONS; documentation only, no code) — user 26 Oct:
  inventory of the 17 sources and of their chains (7 with a step by hand), the screen `#data` (fetch · compile · push · clean, per row and for all), the
  launcher routes it needs, what runs without the launcher, nine lots; and the project file of an iOS / Android application on the same screen.
- **Map: the airspaces graph keeps its width, the list wraps** (`modules/maps/module.js` `levelsHtml` and the `.mp-lv-*` styles, `tests/v3` D29, SPEC,
  DECISIONS) — user 26 Oct: "J'aurais préféré garder la largeur du graphique, mais un texte sur 2 lignes ? Objectif : lisibilité des zones du graphe."
  The priority of the previous lot is reversed: the graph takes the width its columns ask for (14 px at least, 22 at most, so the number stays
  readable; the axis and the margin), bounded only by 60 % of the body (the 14 px come first when thirteen spaces are read on a narrow body); the list
  takes the rest and wraps (the name, then the levels and the class under it); a name keeps its 8 characters by the wrap, and when even those do not fit
  beside the graph the list goes under it. D29.
- **Map: the airspaces sheet no longer cuts the names to one character in the landscape column** (`modules/maps/module.js` `levelsHtml` and the
  `.mp-lv-*` styles, `tests/v3` D29, D11, SPEC, DECISIONS) — user 26 Oct, iPhone in landscape: "Bug affichage de texte coupé". The graph now takes the
  width its columns need, at most 40 % of the body and always leaving the list the room of a 12-character name; when an entry is too long for its line
  it takes two (the name, then the levels and the class aligned under it) and a name is never cut under 8 characters (the ellipsis stays for a name
  longer than a full line). With the "Aussi ici" line the graph keeps a lower floor so the line stays in the default sheet. D29.
- **Map: the spaces left out of the list are named on one folded line "Aussi ici"** (`modules/maps/render.js` `airspacesAround`,
  `modules/maps/module.js` `alsoHtml` / `alsoTip`, manual of the Map x4, `tests/v3` D28, SPEC § 4 nonies, DECISIONS) — user 26 Oct: "SIV FIR etc.
  C'était un workaround pour ne pas avoir de colonnes nonsense. Soit une coche active tout (FIR ?) soit ça n'a pas d'intérêt". No checkbox: the graph
  and the vertical profile still never draw FIR, UIR, SIV, control sectors or any space from the surface to the ceiling, but the sheet "n espaces sur
  ce point" now ends with a folded "Aussi ici (n)" line (names only, FIR, UIR, SIV first, then the others by name, one per name; not a column, not
  counted in the title) and the bubble of a space label with a muted "Aussi ici : FIR PARIS · SIV POITIERS" line, in four languages. The SIV or the FIR
  to call reads in one touch, whether or not the Layers draw them. D28.
- **Base: one entry per VFR reporting point; parser version 17** (`shared/aero_sources.js` `merge`, `shared/sia_base.js` `VERSION` 16 -> 17,
  `frame/aerodb/test/vrp_sources.html`, `tests/v3` K5; aerodb DECISIONS, INTEGRATION "Republication of the base after a parser change") — relay of the
  cloud, user 26 Oct: "Correctif parser report". The published France base carried every reporting point twice ("QT-N" with its description and
  "N" bare, name = code, 5 decimals: 1,772 entries for 1,098 points). The SIA parser was not the cause: `parseXmlSiaVfrPoints` reads the 1,098 VFR
  `NavFix` of the XML_SIA once each, all prefixed. The bare entries (674) come from the openAIP file `openaip/fr_rpp.geojson` (675 points, identifier
  and name = code), added after the SIA by `AeroSources.merge`, which only recognised the same identifier. `merge` now drops an incoming reporting
  point whose code equals the bare code of one already in the list ("QT-N" -> "N", "HM-H-EH" -> "EH") within 0.5 NM: the SIA entry keeps its
  prefixed identifier, description and 6-decimal position. On the real files: 1,772 -> 1,116 entries (18 openAIP-only points remain, none with a SIA
  point of the same code within 0.5 NM). `parserVersion` 17 (`COMPAT` unchanged: a base of parser 14 to 16 still reads, marked `outdated`). The
  published base is rebuilt from Settings > Maintenance > Aeronautical data > "Rebuild the aeronautical database", then "Synchronise". The Map's
  `dedupeVrp` stays (older published bases, other sources).
- **Map: "800 ASFC" is no longer the ground; no space from the surface to the ceiling in the list and the profile** (`modules/maps/lib/aero_symbols.js`
  `limitRead` / `surfaceToCeiling`, `render.js`, `profile.js`, `lib/vertical_profile.js`, `module.js`, `tests/v3` D26; SPEC § 4 nonies, DECISIONS) —
  user 25 Oct (iPhone, near Rennes): "Bug de hauteur. La R57 est affichée plus haut que sa hauteur plafond indiquée" (R 57, 800 ASFC|1800 ASFC, drawn
  from SFC to UNL) and "Retour, dans certains cas, des espaces UNL" (ten CTL sectors and a SIV of the base, which carry no limit, drawn from the
  ground to UNL; the graph showed 7 columns for 13 lines). Cause: `limitFt` tested `/SFC|GND/` before the number, so "800 ASFC" and "1800 ASFC"
  both read 0 ft (the ceiling fell under the floor: UNL), and an empty limit read 0 / infinity. One reading now, `SiaAero.limitRead` (value, from the
  ground, UNL, readable), for the list's graph, the vertical profile and the filters. The user's rule: "pas d'espace de la surface au plafond" - SIV,
  FIR, UIR, the CTL sectors and any space from the surface to the ceiling (or whose limits cannot be read and would amount to that) are in neither
  the list "n espaces sur ce point" (count after filtering) nor the vertical profile (`SiaAero.surfaceToCeiling`, one function for both); the map
  keeps its own thresholds by type. An unreadable ceiling is a dotted column marked "?", never UNL; one column per listed space, narrower when there are
  many. D26 (four languages).
- **The Map: one line per VFR reporting point** (`modules/maps/render.js` `dedupeVrp`, `modules/maps/module.js` `reportPoints` and the layer's read,
  manual of the Map x4, `tests/v3` D27 and its `aero_extra` seed, DECISIONS) — user 25 Oct: "Bug LFQN. Points de report VFR doublonnés". LFQN's card
  listed each of its four points twice ("N Relais hertzien 2 NM Sud Steenvoorde", then "N N") and the map wrote each label twice. Cause: the published
  SIA base lists every VRP twice, `QT-N` with its description and `N` bare with the code for name, at the same place (554 of the 674 bare ones of the
  France file have such a twin), and nothing merged them; a VAC point of the same code but a slightly different position was a third line. Now a point
  is one line and one label: the base's twins are merged when the base is read (same code, 0.5 NM at most, one of them bare: the described one and its
  prefixed identifier win), the VAC file is merged by code (case and spaces ignored) and joins the base's point of the same code within 5 NM; the line
  keeps the base's description and published position, and says "VAC position 1,2 NM away" (x4) when the chart puts it more than 0.5 NM off. Nothing to
  re-publish: the files are read the same way, only better. D27 (red on the previous code: ten lines).

- **Zoom the vertical profile** (`modules/maps/lib/axis_window.js` new, `modules/maps/profile.js`, `modules/maps/lib/vertical_profile.js`,
  `modules/maps/module.js`, manual of the Map x4, `tests/v3` D21-D24, SPEC § 4 bis, `INTEGRATION.md` § 8 and § 10, DECISIONS; V3_SPECIFICATION
  § 7.1 rule 20) — user 25 Oct, 14:30: "Trouver le moyen de zoomer (pour être précis) le profil vertical". The profile accepts a window on the
  distance axis: two fingers pinch (around their middle) and slide, one finger stays the reading cursor, a double tap or the new "Whole flight"
  text button (in the sheet's head line, only while zoomed; no extra chip) comes back to the whole flight; on a screen Ctrl + wheel zooms around
  the pointer, a drag moves the window, a double click resets. The vertical axis refits to what is visible (that is where the precision comes
  from), the distance marks take a round step inside the window, points, TOC / TOD and labels outside it are not drawn, the cursor, the
  airspace reading and the strip stay exact. The window is kept while the page lives and reset when the route changes; it is never stored.
  The weather cut zooms too (see the next two entries). D21 pinch / scale / cursor / button, D22 sheet drag, D23 kept and reset, D24 screen gestures.

- **Atmosphere: the weather cut zooms like the vertical profile** (`modules/atmosphere/section.js`, `module.js`, `texts.js`, `help/*.md`,
  `frame/help/pilot.*.md`, `tests/v3` E8-E9; atmosphere INTEGRATION § 5, DECISIONS; V3_SPECIFICATION § 7.1 rule 20) — `drawSection` /
  `sectionSvg` take `o.window = { from, to }` (NM, the whole cut by default): only the columns, barbs, marks, points, TOC / TOD and labels inside
  the window are drawn, the distance marks take a round step, the height scale is refitted to what is visible, and the geometry follows the
  window (`xOf`, `nmOf`, `window`, `top`, plus `strips` and `layers` asked by the Map). The module wires the Map's `createAxisWindow` on its own
  cut: two fingers pinch and slide, Ctrl + wheel, a double tap or "Whole flight" (grip row, only while zoomed, four languages) comes back to the
  whole flight; the window is never stored and is reset when the route changes. E8 pinch / marks / button / reset, E9 sheet drag.

- **The Map: one window for the profile and the weather cut** (`modules/maps/module.js`, manual of the Map x4, `tests/v3` D25 and D25b,
  `modules/maps/INTEGRATION.md` § 8, SPEC § 4 bis, DECISIONS; V3_SPECIFICATION § 7.1 rule 20) — the Map uses the option Atmosphere delivered
  (`drawSection(el, { window: { from, to } })`). The route has **one** window, shared by both drawings: pinch (or Ctrl + wheel, or a mouse drag)
  on the cut, switch to Profile with the chip, and the same part of the flight is there, and back; "Whole flight" (head line, now also in front of
  the cut) or a double tap on either brings everything back; the window is kept for the page, reset with the route, never stored. The cut's
  height scale refits to what the window shows (`geo.top`). The legend now reads `geo.strips` and `geo.layers` (what the cut really drew in the
  window) instead of recomputing the 260 px rule. A sheet drag does not redraw the cut and keeps the window. D25 pinch / marks / scale /
  button x4 / switch / double tap, D25b sheet drag.

- **The weather cut's legend has its symbols** (`modules/maps/module.js`, `tests/v3` D4, `modules/maps/INTEGRATION.md` § 8, DECISIONS) — user 25 Oct
  (iPhone, route LFRS to LFML, Weather chip then "i": "Bug : cf screenshot (légende)"): the six rows of the legend each had an empty grey box.
  Cause: the Map read the cut's legend rows as if their `swatch` were `{ css }` and drew a "band" box from it, while atmosphere's
  `sectionLegend` returns a drawn SVG (28 x 14) per row; the box never got a colour (`--c` empty), whatever the series. The Map now puts the
  SVG of each row in its box as it is (path as a line, planned level dashed, requested level dotted, TOC / TOD a disc, relief a box, route
  points a vertical dash), its labels in the app's language, and asks for the series the cut really draws: the cut and the legend share one
  list of layers, so clouds, isotherms, inversion, icing, wind (and the surface strips when the cut is high enough) are named too. D4 checks
  that every symbol of the cut's and of the profile's legend is painted, in the series' own colour (the one the cut paints), with the shape
  the cut draws.

- **aerodb: DFS licence request ready to send** (`frame/aerodb/DFS_LICENCE_REQUEST.md`, DECISIONS) — recipient, English and German text for the non-commercial
  flight-simulation use of the "ED Procedure" AIXM 5.1 data set, and the steps on receipt of a licence (REST download, converter on the real file,
  source `dfs`, status "official"). Nothing is downloaded or converted before the licence.
- **The sheet is rewritten: nothing blinks and no grey zone when the handle is dragged** (`frame/lib/sheet.js`, `frame/design/primitives.css`,
  `frame/lib/test/sheet.html`, `modules/maps/module.js`, `modules/maps/lib/map_base.js`, `tests/v3` D7 hardened, D20 new, `INTEGRATION.md`
  § 11, SPEC, DECISIONS of the frame and of the map; V3_SPECIFICATION § 7.1 rule 19) — measured first: the blink came from the map, not from the
  sheet (48 of the 50 `map.resize()` of a drag were MapLibre's own observer clearing its canvas at every frame; four observers of the module
  redrew the overlay, the profile and the cut as well). The primitive keeps its API, HTML, classes and tokens: one state (the position), a
  move carried by one CSS variable written once per move, a 200 ms glide at the release, and `onSettle` called once at the end of the glide
  (never while the sheet moves). The map is created with `trackResize: false`, has one size observer that only asks the sheet to settle,
  and is resized, framed and redrawn once, when the size has stopped; its overlay is no longer stretched, and the strip shown when the sheet
  goes down has the map's colour, not the page's grey. The attribution credit is folded and marked compact as soon as the control exists
  (it re-opened at the first resize, and the test that watched it raced the map's `load`). The frame's bench has a "movement" section
  (186 checks).

- **aerodb: the real-OFP test fixture rounded** (`frame/aerodb/test/fixtures/ofp_lfrs_lfml.json`, DECISIONS) — the coordinates of its fixes are rounded to
  2 decimals and the OFP's generation time is removed, the repository being public (decision of the owner).
- **aerodb: EAD Basic access evaluated for the procedures of other States** (`frame/aerodb/EAD_BASIC.md`, DECISIONS) — EAD Basic is a PDF library of
  State AIPs, not a data service, and not for operational use; the code repository being public, no State AIP PDF may enter it. The plan to read
  the AD 2 coding tables of other States (layout registry, `--pdf-dir` mode, status "to be checked") and the checklist for a first real page are
  written; nothing is coded before a real page exists.

- **aerodb: inventory of the open AIP data sets for the rest of the world — step 4, second half** (`frame/aerodb/AIP_OPEN_DATA_INVENTORY.md`) —
  the DFS (Germany) publishes an AIXM 5.1 "SID STAR and IAP" data set with its legs through a public REST API, but its terms forbid storing,
  converting or redistributing it without a licence; ENAIRE's sets do not list procedures; no lead for the UK, Canada, Australia and New Zealand.
  A licence request to DFS is drafted for the owner. Nothing was downloaded into the repository.
- **aerodb: FAA CIFP procedures (United States) — step 4** (`tools/proc_cifp.py`, `tests/v3/cases/aerodb.py` K4, `test/fixtures/cifp/`, `LICENSE.md`;
  aerodb SPEC § 5 quinquies, INTEGRATION, DECISIONS) — an ARINC 424-18 reader (standard library only) turns the FAA's `CIFP_AAMMJJ.zip` into
  `proc/<cycle>/<ICAO>.json` at the common schema, status "official": SID and STAR with their runway and enroute transitions, approaches with their
  transitions, final and missed approach, altitude constraints, speeds, RNP, vertical angles, positions from the same file. Measured on cycle 2610:
  3,070 aerodromes, 51,497 procedures, 274,703 points, 5 seconds. The FAA warranty notice travels with the files; legs without a fix (climb or
  heading to an altitude) are counted, not drawn.
- Tests: I5 (format) skips when the touched sources are all generated files instead of checking the whole tree; `apps/pilot/aujourdhui.html` formatted.
- **aerodb: whole-France run of the eAIP builder, EUROCONTROL assessment — step 3** (`tools/proc_eaip.py`, `tests/v3/cases/aerodb.py` K3,
  `frame/aerodb/EUROCONTROL_REQUEST.md`, INTEGRATION, DECISIONS) — `--all` reads the 141 aerodromes of the eAIP menu (`--delay` between
  two); the publication command is documented. The EUROCONTROL instrument-procedure data sets are assessed (the EAD Agreement route
  has charges and third-party royalties; the AIXM Confluence sets may be open, terms unknown) and a request is drafted for the owner;
  no converter without a real AIXM 5.1.1 sample.
- **aerodb: procedures from the eAIP coding tables — step 2** (`tools/proc_eaip.py`, `frame/aerodb/aerodb.js`,
  `test/procedures.html`, `test/fixtures/eaip/`, `tests/v3/cases/aerodb.py` K2 K3; aerodb SPEC § 5 quinquies, INTEGRATION,
  DECISIONS) — a workstation builder (standard library + optional `pypdf`) reads the SIA eAIP pages "AD 2 <ICAO> DATA … CODE"
  and "DATA 01 / 02" and writes `proc/<cycle>/<ICAO>.json` and `index.json` at the common schema (status "to be checked"):
  SID, STAR and RNP approaches with leg types, turns, courses, distances, altitude constraints, speeds and vertical angles.
  The file also lists the address of every chart of the aerodrome and of its VAC chart, for the app's PDF reader.
  `AeroDB.procedures` places a published point that has no position from the SIA base. Measured on LFBD (38 procedures)
  and LFAV (6); unreadable rows are reported in `warnings`, never guessed. Conventional procedures (ILS, VOR) are not coded in
  the eAIP and stay for the next steps. Checked against a real SimBrief OFP: empty transitions (`{}`) are read as absent.

- **aerodb: procedures (SID, STAR) through one API — step 1, the SimBrief OFP** (`frame/aerodb/procedures.js`, `aerodb.js`,
  `test/procedures.html`, `tests/v3/cases/aerodb.py` K1, `modules/fuel/module.js`, `modules/maps/module.js`, Maps help in four
  languages; aerodb SPEC § 5 quinquies, INTEGRATION, DECISIONS; Fuel and Maps INTEGRATION) — a common procedure schema
  (kind, name, runways, transition, points with coordinates and constraints, source, cycle, status official / to be checked /
  seen in an OFP); `AeroDB.procedures(icao, q)` merges the published cycle (`proc/<cycle>/`, filled by the next steps) with the
  procedures seen in the user's own OFPs (`proc-seen/<ICAO>.json`, synchronised with the private data repository, lowest
  precedence); `procedureFromOfp` / `rememberOfp` read the filed SID and STAR from the navlog. Loading an OFP in Fuel now keeps
  them in the current flight and the map draws them in purple. No call to SimBrief besides Fuel's existing fetch. The OFP of the
  bench is built from SimBrief's documented fields, to be checked on a real one.

- **Frame: on a phone, the module's title is in the header, the "How to use" card has a ✕, and the "?" opens the help at the right
  paragraph** (`frame/app.js`, `frame.css`, `help/help.js`, `lib/markdown.js`, `help/build_help.py`, the Fuel, Report and Flights
  modules and chapters in four languages, `INTEGRATION.md` § 2, `SPEC.md`, DECISIONS; V3_SPECIFICATION § 7.1 rule 16; tests A2, A17,
  A18) — the header of Carburant, Compte rendu and Mes vols says the module's title (`meta.title`, four languages) instead of
  "Pilote", and the page loses its big title row (the `h1` stays for screen readers); fixed modules, the frame's screens and every
  screen wider than 760 px keep the application's name. The "Comment s'en servir" card (drawn by the frame) gets a ✕ that hides it
  for good on the device, per module; the help chapter offers "Revoir les premiers pas" to bring it back. Modules publish the
  anchor of the screen or step they show (`ctx.helpAnchor`), the "?" opens `#help?m=<module>&a=<anchor>`, the manual scrolls to
  that paragraph and highlights it for 1.5 s, once (anchors added to the three chapters, checked by `build_help.py`); the help's
  chapter titles are no longer hidden under the sticky header.
- Atmosphere: the flight-zone limit follows the `edge.show` key written by the Administration card (the former boolean `edge` is still read).
- **Settings: the keys survive a Safari relaunch, and the administration is one button per page** (`frame/store/transport_github.js`,
  `frame/store/frame_data.js`, `frame/app.js` data layer, `frame/settings/**`, `frame/frame.css`, help in four languages; tests A12,
  A19; rule 18 and § 10.16 of `V3_SPECIFICATION.md`) — the GitHub token and the avwx key were in `localStorage` while the identity
  (trigram, IVAO, VATSIM, SimBrief) was in IndexedDB; Safari cleared the first and kept the second, so only the keys were lost
  (nothing in the code erases them: the cause is the store, written up in `frame/settings/DECISIONS.md`). Both now live in
  `device/keys.json`, like the identity (IndexedDB, policy `cache`, never synchronised), left out of every backup of the device
  and kept by a replace; the old `localStorage` values are taken over once. The frame also asks the browser for persistent
  storage and the diagnostics say whether it was granted. The Administration card (Full level) is now one button per
  administrator page — map thresholds, **flight zone limit** (new: show or hide the edge line, shown by default, saved with the
  thresholds as `edge.show` in `airline/map_profiles.json`; contract in `frame/settings/INTEGRATION.md` § 4), export of a
  pilot's configuration (moved from the Access card), roadmap, diagnostics, benches, V2 pages — and nothing of the administrator's
  is on the other cards. Test A19 "Keys survive a relaunch" fails on the previous code exactly as the user saw it.
- **Fuel: an "Auto" button writes the airways between the route's points** (`modules/fuel/module.js`, new library
  `modules/maps/lib/routing.js`, SPEC § 9, INTEGRATION, DECISIONS, manual ×4; bench `modules/maps/test/routing.html`, case F8) —
  next to the route field (44 px, same row at 360 and 390 px): for each pair of named points with no airway between them, V2's
  path finding (`shared/mission_routing.js`, ported to the published base's `AeroDB.airways`) looks for the shortest path over
  the airways open at the planned level (floor − 100 ≤ level ≤ ceiling + 100 ft; 6,500 ft and a notification without a level),
  direct entry and exit within 60 NM, no detour over 40 %. The text becomes `LFRS TSA01 UT460 TSA05 LFML`, the airway's middle
  points are kept in `route.points` (distance, map and profile follow the airway), the quote is redone and a notification says
  "n airways written, d NM" or "no useful airway between X and Y" (four languages). An airway end aerodb does not know no
  longer ends as an "unknown point". Limits: no one-way airways, no fine level restriction, no SID / STAR (V2's). Change from
  V2: a fix whose two segments round differently is one node (V2 split 21 fixes of the France base).
- **Maps: three chips that stay three, in the bare line; the map's controls above the sheet, one "i"** (`modules/maps/module.js`,
  `lib/map_base.js`, help ×4, `INTEGRATION.md` § 7, DECISIONS; V3_SPECIFICATION § 7.1 rule 13 fourth refinement and rule 17; tests D4,
  D19) — the Profile · Weather · "i" chips are always three (a chip with nothing to show — the "i" without a legend, Weather on a
  mission map — is `disabled`, muted, not removed: no more 3 → 2 → 3 while the cut loads) and stand in the head line itself, at its right
  (28 px chips with the primitive's 44 px touch zones on the bare handle, 40 px on the title line): the vertical column is gone and the
  drawing takes the whole width and height under the line. The "double i" under the sheet was MapLibre's attribution button stretched
  to 44 px by the frame's global `summary` rule (its icon repeated, a chevron drawn as a black bar): `map_base` resets it and exports
  `setBottomInset(map, px)`, which moves the bottom controls above the part of the map a sheet covers (Maps calls it at every size
  change and settle; Atmosphere can use it).
- **Frame: one navigation at a time — a change of address that arrives during a mount cancels it** (`frame/app.js`,
  `INTEGRATION.md` § 2, DECISIONS; test A16) — two or three changes of address in the same task (`#fuel`, `#atmosphere`,
  `#fuel?view=sheets`) left one `section[data-module]` per navigation in the view (and as many overlay layers and sheets) because
  each `route()` appended its section after its `import()` and its `mount()` whatever had happened meanwhile. Each navigation now
  takes a token; after each await a stale one writes nothing (no section, no help panel, no pane, no error screen), the next one has
  already unmounted the module and emptied the view. The help and settings screens follow the same token.
- **Fuel: a mount whose address changed writes nothing, and the Quote / Sheets view is in the address** (`modules/fuel/module.js`,
  `INTEGRATION.md`, DECISIONS; tests F7, A7, J1) — changing the address while fuel was still reading (`#fuel` then `#atmosphere`, or
  `#fuel` then `#fuel?view=sheets`) let the first mount draw over the second's state (the Quote screen under a Sheets address) or fail
  on an emptied state; the mount now carries its own state as a token, checked after its reads, and `unmount()` invalidates it. The
  internal Quote / Sheets switch writes `?view=sheets` / removes `view` with `history.replaceState` (no navigation), so the bar's
  Carburant · Fiches popover marks the right row. A field edited while the current flight is still being read (screen inert) is
  ignored instead of written into the waiting flight (the quote could read "Bloc · 0 ft"). Test suite: F7 (new), A7 no longer waits
  for fuel's first screen, `open('fuel')` waits for the end of the mount.
- **Frame: the bar and the header by rule 14 — Météo in the bar, "?" and ⚙ in the header, the status at the top of Settings**
  (`frame/app.js`, `frame.css`, `index.html`, `lib/icons.js`, `settings/settings.js`, help in four languages, `frame/INTEGRATION.md`
  § 9.1 and § 10, `frame/SPEC.md` § 3, `frame/settings/SPEC.md` § 1, DECISIONS; V3_SPECIFICATION § 7.1 rule 14) — the phone's bottom bar is
  Préparer · Carte · CR · Vols · **Météo** (the atmosphere module, `cloud` icon, in four languages); Settings leaves the bar. The
  performance sheets stay a view of Préparer: a tab can list `views` of its module (`APP.tabs[].views`), so the second touch on Préparer
  opens **Carburant · Fiches** (`#fuel?view=sheets`); a tab with one row (Carte, CR, Vols, Météo) still does nothing on the second
  touch, and the landscape rail has the same five entries. The header of a phone is the name (or ←), **"?"** (the help chapter of
  the current screen) and **⚙**; the "i" button and its pop-up are gone on a phone and on a screen. The badge moves to the ⚙ (green:
  a flight started or a report to write; amber on a phone: trigram, pending writes, conflicts, sync error, offline, base), with the
  same rules. Settings opens on a **"Status" block** that carries the former pop-up's lines with the same texts and actions (flight ›
  Map, report to write › Report with its hand-over, data synchronised n min ago / pending writes / conflicts, aeronautical base,
  launcher, offline, position), drawn and kept up to date by the frame (`ctx.status`), each line that pointed to "Settings" now
  scrolling to the card that holds the answer. With Settings open the "?" asks the Settings chapter. Tests A2 A3 A4 A7 A8 (now the
  Status block) A9 A11 A12 A14 A15 E5 G1 J2 J3 J5 follow.
- **Report: uniform fields, one provenance line, a two-line action bar on a phone** (`modules/report/module.js`, `SPEC.md` § 2 bis,
  `DECISIONS.md`, help ×4 and `frame/help/pilot.*.md`, `tests/v3/cases/flightlog.py` G4, `tests/v3/PLAN.md`) — on a 390 px phone the blue source badge of each
  prefilled field was wider than its half column (it overlapped its neighbour and left the screen) and made the fields of a row
  different heights (a date 56 px against 44 for the others). The source is no longer an element of the grid: each card has one muted
  line "Prefilled from: … · …" (four languages) under its title, the "entered 18:30 local" times of an older report too. Grid cells
  never exceed their column (`min-width: 0`), labels are on one line with an ellipsis, every field is 44 px. The save bar is two
  44 px buttons ("Save" filled, "Save and record on the website" outline, same font, never folded) in a bar of 105 px at most; when
  the website address is not set, the reason is the button's `title` and one muted line under the bar, no longer inside the button.
  No design file changed (the design rules were measured: not the cause). New case G4 (five designs, 390 and 360 px, day and night).
- **Frame: the sheet's bare handle** (`frame/design/primitives.css`, `frame/lib/sheet.js`, `frame/lib/test/sheet.html`, `frame/INTEGRATION.md`
  § 11, `frame/design/SPEC.md`, `frame/DECISIONS.md`; V3_SPECIFICATION § 7.1 rule 13 b) — a module that shows a drawing in the sheet
  puts the class `f-sheet-head-bare` on the header (`head.classList.toggle('f-sheet-head-bare', isDrawing)`): the header becomes a
  28 px line (`--f-sheet-head-bare`) with the grip bar, no title, and its buttons (segments, ◀ ▶, ✕) 28 px high at the right with a 44 px
  touch zone; same drag, tap and keys, also at the top of the column in landscape. The collapsed sheet is 29 px high, and the drag stops
  at the measured header instead of a constant. `createSheet`, `labels(pos, rank)` and the positions are unchanged; nothing uses it yet
  (maps and atmosphere adopt it in their own lots). The bench grows from 129 to 177 checks.
- **Atmosphere: the flight zone's edge shown by default, the chips in the grip row** (`modules/atmosphere/lib/weather_map.js`, `module.js`,
  `texts.js`, `help/*.md`, `test/weather_map.html`; atmosphere DECISIONS, INTEGRATION § 6; V3_SPECIFICATION § 7.1 rules 13 and 15) — a thin
  line marks where the flight's fine forecast meets the world synoptic (the two models do not join); the Layers panel and the help name both
  models and their grid (AROME 1.3 km · ARPEGE 0.1°, GFS 5°); the administrator can hide it (`edge: false` in `airline/map_profiles.json`).
  ◀ ▶ and the legend "i" always sit in the grip row (three, disabled when they have nothing to do), the drawing at full width.
  MapLibre's bottom controls stay above the sheet through the maps module's `setBottomInset` (rule 17).
- **Atmosphere: no flicker while dragging the sheet** (`modules/atmosphere/module.js`, `lib/weather_map.js`, `test/weather_map.html`,
  `tests/v3/cases/atmosphere.py` E7; atmosphere DECISIONS, INTEGRATION § 6) — the map and its overlay were resized, cleared and the cut
  redrawn at every frame of a drag (a grey band, flashes). Nothing is redrawn while the finger drags; the map now lies under the sheet at
  the module's whole size, so moving the sheet uncovers map already drawn. A world file that failed is asked again after 30 s, not at every
  frame.
- **Atmosphere: a legend behind an "i" chip, and a help chapter** (`modules/atmosphere/section.js`, `module.js`, `texts.js`, `help/*.md`,
  `frame/help/pilot.*.md`; atmosphere DECISIONS, INTEGRATION § 5; V3_SPECIFICATION § 7.1 rule 14) — the "i" chip, after ◀ ▶, shows over the
  cut or the slice the series really drawn with their symbols, in four languages (`sectionLegend` in `section.js`, for the Map too); a touch
  or Escape closes it. The pilot's manual gains the "Météo" chapter, legend included.
- **Atmosphere: the cross-section fits the sheet, no title over it** (`modules/atmosphere/section.js`, `module.js`, `texts.js`; atmosphere
  DECISIONS, INTEGRATION § 5; V3_SPECIFICATION § 7.1 rule 13) — the cut and the slice are drawn at the sheet body's exact height (`minHeight`,
  default 0, in `drawSection` for the Map too): fewer level labels on a low chart, the distance axis always visible (on a 390 × 664 phone
  window the body was 95 px and the axis hidden; now 112 px and visible). Over a drawing the grip row is bare (28 px, ◀ ▶ ✕ kept) in the
  sheet's default position only: the "Profile · …" line repeated what the chart shows; expanded, collapsed and in landscape the title stays.
  The slices' ◀ ▶ stand in a 44 px column at the right of the drawing with the bare head, in the title row whenever it shows (expanded,
  collapsed, landscape: the drawing keeps its whole width), as the map's chips; the cut's and the
  slice's left gutter is measured from their level labels (54 → 33 px), for the map too.
- **Atmosphere: the flight's grid no longer shows as a rectangle; 10× cheaper frames; an optional limit line** (`modules/atmosphere/lib/weather_map.js`,
  `texts.js`, `test/weather_map.html`, `test/weather_map_perf.html`; atmosphere DECISIONS, INTEGRATION § 6) — at a flight level the cloud fill
  came from AROME inside the grid (dry, clear) and from GFS outside (moist, grey): the fills (clouds, temperature, jet, convection) now come
  from the world synoptic on both sides, the lines and barbs from the grid blended into it. Only what the view holds is projected: a frame
  with every layer drops from 76 ms to 8 ms with the CPU slowed ×4. New `edge` option (default off, the administrator's setting to come)
  drawing the grid's limit as a hairline, with `info().zones` naming both sides. DECISIONS records the measurements and what GFS costs against
  Open-Meteo.
- **Map: a legend ("i" chip) over the profile, a drag on the weather cut moves the cursor, the airspaces list on one line per airspace** (`modules/maps/module.js`, `profile.js`, `lib/vertical_profile.js`, manuals ×4, `tests/v3/` D4 / D11; maps SPEC, DECISIONS; V3 spec § 7.1.14) — the last chip opens a translucent legend of what the profile draws (its own list, four languages); the cut has none yet. Dragging on the weather cut moves the common cursor like on the profile (the map's point follows). The airspaces list is "1 · TMA NANTES 4 · FL055|FL065 · D" on one line each, at body size, with a narrower level graph.
- **Map: the Profile · Weather chips are a column only beside the bare handle** (`modules/maps/module.js`, `tests/v3/` D4; maps SPEC, DECISIONS; V3 spec § 7.1.13) — with the title line (expanded, collapsed, landscape column) they are back in that line, at the right, in a row, and the drawing takes the whole width; the row above the drawing in landscape is gone.
- **Map: Layers' Complexity slider on one line; airway names above the strokes** (`modules/maps/module.js`, `render.js`, `tests/v3/` D17 / D18; maps SPEC, DECISIONS) — the slider block was 73 px plus a 51 px help sentence (about 120 px): label, value and slider are now one 44 px line in the five designs, the help stays in the tooltip and for screen readers. The airways' strokes are all drawn before their names, so a later airway no longer crosses an earlier name.
- **Map: the profile and the weather cross-section fit the sheet, with no title above them** (`modules/maps/module.js`,
  `lib/vertical_profile.js`, manual in four languages, `tests/v3/` D4 and the cases that read the sheet's title; maps SPEC § 4, DECISIONS;
  V3 spec § 7.1.13) — the distance axis was still off screen on a phone (the cut had a 140 px floor in a 103 px body): both drawings are now
  drawn at the exact height of the body, without box or padding for the cut, the profile dropping level labels (one in two under 160 px, one
  in four under 110 px) and shrinking its foot before it would drop its axis. The Profile · Weather chips are a column at the right of the drawing (a row above it in the landscape column) and the drawing starts at the left edge of the body. Over a drawing at the default position the head is a bare handle (expanded, collapsed and in the landscape column it keeps its title; the grip bar and the
  Profile · Weather chips, `.f-sheet-head-bare`, 28 px): the "Weather · FL160 · 370 NM" line is gone, the handle's label says "Vertical
  profile" / "Weather cross-section" and the flight summary. At 390 × 844 the default drawing gains 17 px (profile, 174 → 191) and 39 px (cut,
  152 → 191).
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

- **Map studio, Flight maps, vertical profile: "800 ASFC" read as 0 ft** (`shared/carto/aero_symbols.js`,
  `shared/carto/vertical_profile.js`, `shared/carto/vprof_editor.js`) — the limit reader tested "SFC" before the number,
  and "ASFC" contains "SFC": an R area "800 ASFC – 1800 ASFC" became surface to surface (zero thickness in the cut, from
  the surface to the ceiling in the filters). New `SiaAero.limitRead(text, top)` → `{ ft, rel, unl, ok }`, the reading
  of the V3 map: the number first, FL × 100, metres, `rel` for ASFC / AGL / AAL / SFC / GND (never with AMSL / MSL), `unl`
  for UNL or 66,000 ft and more, `ok` false when empty or unreadable; `limitFt` and the "relative to the ground" tests of
  the vertical profile and its editor use it. The area is now drawn from 800 to 1,800 ft above the ground.

- **Map studio and Flight maps: every town name twice on an OpenFreeMap or VersaTiles background**
  (`apps/cpco/map_parser.html`, `apps/planner/map_planner.html` rebuilt) — with "Town labels" ticked, the studio wrote its
  own names over the place names of the vector background. The background's place layers (`place`, `place_labels`) are
  now hidden while "Town labels" is ticked, and shown again when it is not.

### Livraison

- Archive de livraison : `xplane-web-suite-6.0.0-alpha.2.zip` — SHA-256 `c3b262d74812ee4ece2233053cc68c3cfc73310a458bbb8da9a86cf007a1b9c7` (code seul, hors dépôt : dossier `dist/`).
- Module package: `dispos-module-6.0.0-alpha.2.zip` — SHA-256 `a1bd93c26a95aeccbc13c0220bf30916447fcb84c3b0da28e616d0c6e26aedb3` (outside the repository: `dist/` folder).

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
