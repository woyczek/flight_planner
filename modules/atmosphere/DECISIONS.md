# atmosphere — decisions log

The memory of the V3 atmosphere module: every choice, dated, with its reason. Never rely on chat history.

## 25 October 2026 — the flight zone's edge by default; the chips in the grip row, always three

- **The edge** (user, rule 15 amended: "il y a un saut entre météo et gfs (normal). Donc je tranche : on affiche le cadre
  (filet fin) avec un mot dans l'aide contextuelle et/ou la légende pour indiquer la différence de modèle entre AROME et
  GFS. Et la précision du modèle."): `edge` is on by default in the library; this module reads the administrator's key
  `edge` in `airline/map_profiles.json` (watched; `false` hides the line). The Layers panel names both sides with the
  model and its grid ("Zone du vol · Météo-France AROME 1,3 km · ARPEGE 0,1°", "Monde · NOAA GFS 1° (NOMADS), maille
  de 5°" — the world's grid is the published one, read from the index), and the help chapter gains a paragraph on the
  line and the jump across it. The line takes the design's border colour.
- **The chips** (user, rule 13, fourth refinement: "le i sur la ligne de titre est bien plus lisible que le bouton i, il
  permet de gagner de la place" and "ils doivent rester 3, pas faire d'aller-retour entre 2 et 3"): no more column;
  ◀ ▶ « i » always sit in the grip row at its right, before ✕ (the frame's bare head gives them 28 px and a 44 px touch
  zone); the drawing takes the full width; the three are always there over a drawing, ◀ ▶ disabled off a route slice,
  « i » disabled without a drawing. Checked: 390 × 664 bare row, chips at 28 px, body 390 × 111; 844 × 390 titled row,
  chips at 44 px.
- **The map's controls above the sheet** (rule 17): MapLibre's bottom controls are lifted by the maps module's
  `setBottomInset(map, px)` (`map_base.js`, the same call as the map), with the height the sheet covers, at each settle;
  in landscape the sheet hides the right side, so `--at-hide-r` still moves the bottom-right control left of the
  column. Checked: 390 × 664 default and expanded, 844 × 390: the control's box ends where the sheet begins.

## 24 October 2026 (night) — two regressions: flicker while dragging the sheet; "only the frame around the flight"

- **Flicker** (user: "Déplacer le volet par la poignée fait clignoter et apparaître une zone grise. Ça a fonctionné,
  c'est maintenant fragile."). Measured during one slow drag: 29 resizes of MapLibre's canvas (blank until it renders
  again: the grey), 27 resets of the overlay canvas (which clears it), 26 rewrites of the cut. The cut now follows the
  body's exact height, so its size changes at every frame, and the sheet's `onSettle` (120 ms after the last change)
  fired at each pause of the finger: `settled()` resized and re-fitted the map and redrew the cut mid-drag. **Fixed**:
  nothing happens while the finger drags (the frame marks the panel `f-sheet-nt`), everything once at the release; and
  the map and its overlay now have the module's whole size, under the sheet, so a move of the sheet only uncovers map
  already drawn — MapLibre is resized with the module (window, rotation), never with the sheet. Fitting the route pads
  the hidden part; MapLibre's controls stay above the sheet; the "outside the flight's grid" test reads the visible part
  (`view.visible`). Case E7 of the suite: nothing redrawn during a drag (fails on the previous code: 47 events).
- **"Est-ce que gfs s'affiche encore ? Je n'ai plus que le cadre autour du vol."** Not reproduced: on the published site
  (run 12Z, 24 steps, the pressure-level files there), the synoptic draws outside the grid at the surface and at FL270,
  phone and desktop sizes; no WebKit in the session. What matches the words: the world fields of the level shown are
  missing (its pressure-level file not read on the device), so only the grid draws, its fills fading at its border.
  Made robust: a world file that did not come is asked again after 30 s rather than at every frame; bench case "the
  world synoptic is drawn outside the flight grid". To check on the iPhone after this lot; if it persists, the title
  says "Synoptique monde…" (reading) or "non publié", which tells which.

## 24 October 2026 (night) — the legend behind an "i" chip; the help chapter

- **The request** (user, relayed, rule 14 of V3_SPECIFICATION § 7.1: "On devrait voir la légende quelque part… on voit
  un graphe le plus étendu possible, mais on ne sait pas ce que sont les données représentées"). **Done**: an "i" chip
  ("Légende" ×4), last after ◀ ▶ (in the column with the bare head, in the title row otherwise), `aria-pressed`, shows
  over the drawing a translucent panel of the series really drawn — the cross-section with its layers (and the surface
  strips when shown), or the slice — each with its symbol drawn in the drawing's own colours; a touch on it, the chip or
  Escape closes it. The rows come from `section.js` (`sectionLegend`), so the map's cut shows the same legend. With
  three chips the column starts under the bare head, beside the slider row (both narrowed by 44 px), so it fits a 111 px
  body (390 × 664). On a low body the legend scrolls inside its panel; expanded, it shows whole.
- **The help chapter** ("Météo", four languages, `help/<lang>.md`): the flight, loading, the map, the flight date, the
  cut and the slices, and the legend in full; built into the pilot's manual. The translations are mine; the help
  session may review them.
- **Not changed here** (relay's decision): Atmosphere becomes the fifth tab "Météo" of the bottom bar — a frame lot; to
  check at its integration that the module opens from the tab.

## 24 October 2026 (night) — the drawing fits the sheet; no title over a drawing

- **The report** (user, iPhone, relayed, rule 13 of V3_SPECIFICATION § 7.1): "c'est toujours le même souci, les
  abscisses invisibles" and "Toujours la ligne « météo fl160 »… Info redondante donc, qui prend de l'espace vertical".
  The cross-section kept a 140 px readability floor; in Safari's window (390 × 664 with its bars) the body was 95 px, so
  the distance axis sat under the fold (measured: hidden).
- **Done**: `sectionSvg`, `soundingSvg` and `drawSection` take `minHeight` (default 0; 60 px is the least they draw):
  the drawing is made at the body's exact height and drops level labels first (one in two under 160 px of plot, one in
  four under 110), never the distance axis nor the waypoint names. Over the cut and the slice the grip row is **bare**
  (`.f-sheet-head-bare`, 28 px: the handle, the source badge when the flight is not the current one, ◀ ▶ ✕ with a
  44 px touch zone; the content named for screen readers, "Coupe météo" or the slice's place); Flight, Details, Layers
  and the texts keep their titled head. The slider row stays under the bare head. Until the frame ships the primitive,
  a rule marked `TEMP` in `module.js`.
- **Refined** (user, on the version with the bare head: "toujours la ligne d'en-tête superfétatoire au niveau moyen.
  Utile en volet agrandi ou réduit et paysage."): the head is bare **in the default position only**; expanded,
  collapsed and in the landscape column it keeps its title (there is room, and it is then the only thing that says what
  is shown). Reviewed at every stop of the sheet (`onSettle`). The published page did show the bare head in the
  default position (checked on woyczek.github.io at 390 × 664, title hidden): the user's line was likely a copy still
  in the browser's cache. Checked: 390 × 664 default bare (27 px), collapsed and expanded titled (44 px); 844 × 390
  titled in both positions; the distance axis visible in all.
- **Second refinement** (user, on the maps module's cut: "supprimer espace jaune et texte rayé rouge, aligner boutons
  verticalement à droite (horizontalement en paysage)"; the same template for both sheets, relay): the slices' ◀ ▶
  leave the grip row for a 44 px column at the right of the drawing in portrait (40 px round buttons 4 px apart, aligned
  at the top, the drawing narrowed by 44 px), a 44 px row above the drawing in the landscape column; ✕ stays in the grip
  row, as on the map ("the bare grip keeps the bar and ✕ only"). The "yellow space" was the cut's fixed 54 px left
  gutter: it is now measured from the level labels drawn (33 px for "FL350"), in the cut and in the slice, for the map
  too. The slice's temperature labels go one in two when they would touch (the 319 px landscape column). Checked:
  390 × 664 and 390 × 844 (column at x 346, no overlap with the drawing), 844 × 390 (row above), ▶ moves on.
- **Third refinement** (user: "Les icônes passent en horizontal quand la ligne du haut apparaît (objectif : maximiser
  la largeur dispo)"): the ◀ ▶ column exists only with the bare head (default position, portrait); whenever the titled
  head shows (expanded, collapsed, the landscape column), ◀ ▶ go back into the title row at its right and the drawing
  takes the whole width (no 44 px margin, no row above it in landscape). Moved at every stop of the sheet with the
  head. Checked: 390 × 664 default column, body 346 px; expanded in the row, body 390 px; 844 × 390 in the row, body
  319 × 259 px.
- **Measured** (real AROME data, LFRD → LFBD FL160, default position): 390 × 664: body 95 → 112 px, distance axis
  hidden → visible; 390 × 844: 144 → 161 px; 844 × 390 (the right column): 259 → 276 px, so the surface strips come
  back (their labels now widen the left margin instead of being cut). The slice fits its body (112 / 112 px, no
  scroll).

## 24 October 2026 (night) — one source per fill; the limit as an option; performance; GFS against Open-Meteo

- **The report** (user, iPhone, relayed: "Toujours pas.", LFRD → LFBD at FL160, 19:00Z): after the rings fix the grid's
  rectangle was still visible — clear inside, a uniform grey outside, lines and barbs continuous. **Found by drawing
  the layers one by one** on that view (the real AROME grid recorded from Open-Meteo, the published NOAA synoptic):
  the **cloud** fill (and, fainter, the temperature fill). At FL160 the grid's cloud is AROME's humidity (dry: clear)
  and the world's is GFS's (moist: grey); the blend band is a quarter of the grid, one cell on a 5 × 9 grid, so the
  change reads as an edge. Same variable, two models that disagree: a fill taken from each draws the rectangle.
  **Fixed at the source** (rule § 7.1.12 for fills): the four fills (clouds, temperature, jet, convection) come from the
  world synoptic on both sides; the grid draws its own only when there is no synoptic (launcher, nothing published).
  The lines and barbs stay the grid's, blended (their values join where the models agree, and the blend hides the
  rest). The fine model stays in the cross-section and the slices, where it counts. Bench: luminance either side of the
  limit, the field's slope removed, layer by layer — v3 before: cloud 25.7, temperature 52.2; now 0.2 and 0.7.
- **The limit as an option** (user: "Pas de bord, si ça ne se justifie pas, ou alors en option avancée (dans les
  paramétrages au même niveau que les sliders de zoom)"): `edge` in `attach` / `update` (default off) draws the
  grid's limit as a hairline in the border colour, contour labels kept 24 px from it on both sides, and `info().zones`
  names both sides for the host's legend ("Flight area · Météo-France AROME / ARPEGE", "World · NOAA GFS 1° (NOMADS),
  5° grid"). The setting itself (threshold page `#maps?tune=1`, `airline/map_profiles.json`) is the maps module's lot;
  this module will pass it once it exists.
- **Performance** (relay's request; `test/weather_map_perf.html`, Playwright, 390 × 844 at 3×, **CPU slowed ×4**, one
  job; the LFRD → LFBD grid, 5 × 9 places, 7 levels; the real NOAA publication; a flat Mercator background 390 × 520 at
  zoom 6):
  - **cost of a frame while panning**, all seven layers: **76 ms before** (every contour segment and barb of the whole
    world projected at each frame: about 13 frames/s), **7.9 ms now** (p95 12.5 ms) at FL160 and 9.5 ms (p95 13.1) at the
    surface, since only what the view holds is projected. Per layer alone at FL160: isobars 4.7 ms, isotherms 3.6,
    barbs 2.3, clouds 2.0, temperature 1.9, convection 1.7, jet 1.7. Unthrottled: 1.6 ms. **The 30 frames/s target is
    met with every layer**, no degraded mode needed. The page's own frame rate through `attach` cannot be measured
    here: headless Chromium composites a 1170 × 1560 canvas in software (frames of about 270 ms even unthrottled, the
    main thread idle) — a phone's GPU does not have that cost; to check on a device.
  - **first draw after `attach`** (FL160): 3.9 s cold (the publication read from the server: 673 KB raw, about 220 KB
    as Pages serves it gzipped), 2.4 s warm (device cache, 1.27 MB of JSON read); at the surface 3.2 s and 2.3 s
    (162 KB, about 43 KB gzipped). Unthrottled: 1.0 s and 0.7 s. The time goes into building the world at the level
    (2,409 columns, contours, images), once per step and level; candidates if it must shrink: a worker, or the builder
    publishing the fields at fixed flight levels.
  - **changing step** (+3 h): 670 KB with the `-alt` file (159 + 511 KB raw; 43 + 178 KB gzipped, measured on Pages),
    159 KB without it (surface); 4.4 s at ×4, 1.0 s unthrottled.
  - **memory**: the overlay canvas 1170 × 1560 (7.1 MB at 3×, the largest item); the field images 591 KB (8 images,
    the largest 289 × 129, the world's); the publication kept on the device about 670 KB per step read.
- **What GFS costs against Open-Meteo** (relay's question; measured where stated):
  - **resolution**: the publication is GFS 1° from NOMADS, **sampled at 5°** (2,376 places, 25 steps: 17 MB in all,
    measured) so a phone can read the whole world; GFS's native 0.25° would be 400 times larger and would need tiles.
    Open-Meteo's models are fine (AROME France HD about 1.5 km, ARPEGE Europe 0.1°, ICON-D2 about 2 km), but the map
    samples them at the flight's grid (here 5 × 9 places, about 0.7° apart) and the cross-section every 50 NM: the
    fine model's gain on the map is the grid's spacing, not the model's.
  - **time**: every 3 h up to +72 h against hourly (AROME to about +48 h, ARPEGE about +100 h). **Run latency**: GFS
    06Z published at 10:13Z (4.2 h, measured from the index), and rebuilt every 6 h, so up to about 10 h old; AROME HD
    on Open-Meteo: run 03Z available at 05:40Z (2.7 h), and still the latest at 18:26Z (measured, `meta.json`).
  - **variables**: the publication has 11 levels (1000–200 hPa: height, temperature, humidity, wind) against 14 for the
    grid (975, 950 and 900 hPa more), no hourly steps, no 2 m dew point, no per-level cloud cover (both sides derive it
    from humidity anyway); it adds what Open-Meteo does not give here: tropopause height, the maximum wind (jet) and its
    level, cloud by layer and CAPE on a world grid.
  - **quota**: none on the device (static files on the same origin) against Open-Meteo's free 10,000 calls a day per
    IP (a "Load" weighs about 295; the session's IP met the limit once).
  - **building it**: a step of the Pages workflow on a GitHub runner, NOMADS' GRIB filter and a GRIB2 decoder in the
    standard library (`tools/grib2_lite.py`), the previous publication reused when the run is the same; its duration
    on a fresh run is not measured in this session (the workflow runs that reused it took 1–2 min in all).
  - **on the device**: files read once per step and kept for offline use (6 h), against calls per flight and per day;
    the world view works with no flight and no credit.

## 24 October 2026 (night) — rings round the flight's grid: the world of another level

- **The report** (user, iPhone, relayed: "Screenshot : Qu'est-ce que c'est !?", LFRD → LFBD at FL160): round the
  flight's grid a thick dark frame of concentric blue and red dashed rings, temperature labels stacked on its sides
  (12°, 14°, 0°, −6°), the world outside still at the surface (1008…1022 hPa). **Cause**: while the world step's
  pressure-level file was read (520 KB, seconds on a phone), the world fields of the previous view — the surface — were
  kept and blended into the grid at FL160: 1015 hPa against 549 hPa across the band gave hundreds of isobars (the dark
  frame) and 14 °C against −6 °C ten isotherms. Reproduced with real Open-Meteo data and the published synoptic, the
  pressure-level file held back. Not a divergence between the models: at the same level they join (checked, FL160 and
  the surface).
- **Fixed at the source**: the previous world fields are kept only at the same level (a slider move); the blend refuses
  two fields of different levels or hours more than 2 h apart; contour labels of the flight's grid are never placed on
  the band; and when there is nothing to blend into (the file still on its way, no publication) the grid's fills fade
  out over the same band instead of ending in a rectangle. `info().blended` says which case is drawn. Bench: the case
  fails on the previous code, passes now. The "whole map in GFS" fallback is not needed for this report.

## 24 October 2026 (night) — the weather map as a library

- **The request** (relay, V3_SPECIFICATION § 7.1.8, after the user's "Où est passée la carte météo ?"): the map
  module's Météo chip also draws the weather on the map, from the same renderer as this module. **Done**: the map
  drawing moved to `lib/weather_map.js` (`createWeatherMap` for a host that draws into its own canvas, as this module
  does; `attach(target, opts)` with its own canvas over a MapLibre map or a flat background), and this module now draws
  through it: one code, one picture on both screens. Contract accepted by the relay, with `legend()` added (the layer
  rows and their four-language labels) so the map's Layers panel needs no copy of the texts.
- **Never a call to Open-Meteo from the library**: the flight's grid is read from the cache only, with a network that
  answers offline (no `meta.json` either); `gridRequest` is the one computation of what the grid asks, so the reader
  finds what the loader wrote. The slider, the slices and the tooltips stay with the host (this module keeps them).
- The "(monde)" suffix of the jet and convection layers went: since the shared computation they are drawn everywhere.

## 24 October 2026 (evening) — landscape: the cross-section scrolls; the flight date from the shared flight

- **The report** (user, iPhone in landscape, full screen): "Le bug : le bas du graphe est hors écran (pourtant
  screenshot full screen)." In a 844 × 390 window the sheet's body is 95 px under the handle and the slider; the
  cross-section keeps its legibility floor (140 px: axes, levels, strips) and the body did not scroll
  (`overflow: hidden`), so its bottom was cut. **Fixed**: the profile and the slice are drawn at the body's real height
  (as before) with that floor, and the body scrolls when they are taller; Details and Flight already scrolled. The
  landscape layout itself (the sheet as a right column, § 7.1.7) is a frame lot first.
- **The flight date from the shared flight** (Fuel lot `5a6797db`): `current_flight.json` carries `planned_at`; it is
  the slider's origin, then `weather.when`, then now; a change of it in Fuel re-reads the flight (watched). The
  slider's line shows the flight's departure as soon as the flight is read, forecast or not.

## 24 October 2026 (evening) — no border between the flight's grid and the world

- **The report** (user, iPhone, relayed: "Léger bug :", a screenshot — LFRD → LFBD at FL170, slice 7/10 TUPAR, slider
  +20 h): a vertical purple band with a sharp edge along the map. **Cause**: the jet stream shading (250 hPa, purple)
  exists only in the world synoptic, which was drawn outside the flight's grid only — so the shading stopped at the
  grid's limit. Deeper: at an altitude (FL170) the flight's grid showed isobars at constant true altitude while the world
  only knew the surface — the two sides did not even show the same thing. Then (user): "Il y a probablement une
  divergence de prévision entre OpenMeteo et NOAA, surtout dans les horaires lointains."
- **One computation for both sides**: the publication gains, per step, a second file of pressure levels (11 levels,
  1000 to 200 hPa: geopotential, temperature, humidity, wind; read only when the map shows an altitude) and the surface
  pressure and height; `worldLocs` shapes every world place like an Open-Meteo place and `fieldsOf` (the flight grid's
  own code, `mapFields` factored out) computes both, with the flight grid's true altitude for the isobars. The steps of
  isobars and isotherms follow the map's scale and are the same on both sides; wind barbs 44 px apart on both.
- **Jet and convection everywhere**: drawn under the clouds and lines over the whole map, inside the grid too.
- **The models' divergence: a relaxation zone**, as limited-area models are nested in global ones: over the outer
  quarter of the flight's grid its values (pressure, temperature, cloud, wind as components) pass progressively into
  the world's; at its edge they are the world's (the lines meet), at its centre the fine model's. For the map only: the
  cross-section and the slices keep the flight's values. Images and the world's cut-out aligned on whole pixels (no
  one-pixel line at the junction). Checked with Open-Meteo stood in by the same GFS data (no visible border at the
  surface nor at FL180) and with a deliberate divergence (+4 hPa, +3 °C): no border, but a constant bias draws a ring of
  isobars in the relaxation zone — the honest trace of two models that disagree.

## 24 October 2026 (late) — NOAA GFS for the world, the flight date slider

- **The requests** (user): "NOAA approuvé. Idem, compilation vers le même format pour unifier l'api. Quitte à augmenter
  la granularité ou le niveau de paramètres du fichier (avec des infos non renseignées par openmeteo)"; then "prévoir un
  slider « date du vol » pour ajouter x heures à la planification (et la carto). Utiliser au max les données gratuites."
- **NOAA instead of Open-Meteo for the world**: NOMADS's OPeNDAP text access is retired (checked: "OpenDAP format has
  been retired"), so the GRIB filter and a GRIB2 reader in standard-library Python (`tools/grib2_lite.py`: GFS 1° uses
  complex packing with spatial differencing, template 5.3; checked against plausible values — Paris 1017 hPa, the
  Icelandic low 986 hPa). No call quota: the grid goes from 15° to **5°** (2,376 places) and the variables from 5 to
  **15** (cloud layers, CAPE, 0 °C isotherm, tropopause, 250 hPa jet, precipitation, visibility). Same schema for any
  source; the Open-Meteo builder is gone (and with it the shared-runner quota risk).
- **One file per step, to +72 h** (25 steps, ≈ 38 KB compressed each, 3.5 MB in all on the pages): one file for 72 h
  would be ≈ 1 MB compressed on every phone; a device reads only the steps it shows. The previous publication is
  downloaded again and republished while it comes from the latest run (each deployment replaces the whole site).
- **World view decluttered** after the first look at real data: highs and lows must dominate 15° around and be 2 hPa
  deep, then 70 px apart on screen (the deepest first); world isotherms every 10 °C; jet and convection shading light.
- **Slider in the sheet, not over the map** (rule § 7.1: only buttons over the map): a 30 px line under the handle,
  for every content (the details and the slices follow it too). 0 to +72 h: the last published step of the world.
  Moving it recomputes from the device only; "Load" reads every day it can reach in the same request (Open-Meteo counts
  places and variables, not days, up to two weeks): what the user asked, "au max les données gratuites". Kept for the
  visit only, as the other tries (example, text, file).
- The steps kept in memory (six) so that going back and forth reads nothing twice; the handle's title follows the step
  actually drawn.
- **Round the world on the map** (user: "Est-ce qu'on fait un tour avec la carte, si on décolle vers la droite ou la
  gauche ? Spoiler : je le veux."): the shared base (`modules/maps/lib/map_base.js`) creates the map with
  `renderWorldCopies: false`; the maps module's antimeridian lot (`77d0672d`) gave it the option `worldCopies`, used here
  (an `onCreate` hook was the first try, before that lot). The flight, its grid, the slice markers and the
  world synoptic are drawn on every visible copy (`copiesFor`), the grid test compares with the copy nearest the view.

## 24 October 2026 (late) — across the date line

- **The request** (user): "On se souvient qu'on veut voler de Sibérie à l'Alaska en passant par la ligne de changement
  de date."
- **Fixed here**: `atmo.js` gets `wrapLon`, `nearLon`, `unwrapLons`; the flight's points are unwrapped as they are read
  (record, file, route text), and `A.grid`, `sectionPlaces`, `sectionModel` unwrap on their own (a reader with raw
  points finds the same cells); the model is chosen on the wrapped longitude; taps, tooltips and the local slice's
  nearest point compare longitudes modulo 360; displayed coordinates are wrapped. Map grid latitudes capped at ±80°
  (Mercator). Checked with UHMA → PAOM (FL190, stubbed Open-Meteo): one continuous route and grid, the requests'
  longitudes within [−180, 180[, no error.
- **Highs and lows need a real difference** (0.5 hPa to a neighbour): on a flat field every point was marked "L".
- **No seam at 180° either** (user: "Il n'y a pas de coupure franche entre Lavrentya et Nome. La Terre est ronde… ce
  découpage est artificiel. Un avion n'a pas de frontières…"): the [−180, 180[ range is only the data sources' indexing
  (Open-Meteo, the GFS grid, the cache cells), used at the moment of asking them; everything the pilot sees is
  continuous. One real trace of the cut was found and removed: the world synoptic's highs and lows were not searched on
  the 180° column — the search now wraps round the world (a low centred on the line is marked, checked at 180°, 55° N).
  The map wraps both ways; the world grid's last column copies the first, so contours meet across the line.
- **Then shared** (maps lot `77d0672d`): the three functions moved to `frame/lib/geo.js`, same logic; `atmo.js` now
  re-exports them from there (no copy). Fuel's `samples` returns wrapped longitudes since: `sectionPlaces` unwraps them
  again so that the cross-section, its markers and the map stay on the route's side of the line.
- **Seen outside this module, reported to the relay** (both fixed by that lot): the maps module draws UHMA → PAOM the long way round (through
  Europe, distance marks wrong) and hides its Weather chip (its known debt, `DETTE_TECHNIQUE.md`); Fuel's `samples`
  (`modules/fuel/winds.js`) interpolates longitudes linearly, so its winds aloft for such a flight are read round the
  world. `unwrapLons` is the fix for both; a candidate for `frame/lib`.

## 24 October 2026 (late) — the world synoptic, nothing asked outside the flight's grid

- **The request** (user): "si on zoom out la carte météo, on n'a pas les infos. Quelles infos minimales sont dispo sans
  cramer des crédits pour afficher le monde entier (ce qui arrivera inévitablement, users are dumb)". **Decided by the
  relay** (`V3_SPECIFICATION.md` § 8): a global synoptic file built by the repository's workflow and published with the
  pages, 15° grid, no extra button, the handle's title says what is shown; carried by this module (script, job, format,
  drawing).
- **Built** (SPEC § 4): `tools/build_world_weather.py` (standard library), a step of `.github/workflows/pages.yml` and
  a schedule every 6 h; 264 places (11 × 24, not the ≈ 288 estimated); Open-Meteo read once per GFS run, the published
  file taken again otherwise (each push to develop or v3 would otherwise cost 264 calls); never a failed deployment.
- **Checked from the session**: Open-Meteo answered "Daily API request limit exceeded" for the session's own address
  (shared): the quota is per IP, and GitHub's runners are shared too. The script falls back on the published file; if
  the runner is refused day after day, NOAA GFS (no quota) or a key as a repository secret — the user's choice, noted
  in the ROADMAP. The real file could not be produced here: the module was checked with a synthetic world file of the
  same format (the script's paths — same run, new run, refusal — with a simulated network).
- **Device**: same-origin read (`/v3/weather/world.json` is outside what the frame's service worker keeps: no false
  "new version"), kept 6 h in `cache/weather/world.json`. **Map**: the field images are resampled in Mercator (a 150°
  latitude span stretched linearly would be wrong); the synoptic is clipped out of the flight's grid; the world's copies
  are drawn when zoomed out; wind barbs thinned to 30 px on screen. **Title** only when the view is mostly outside the
  grid (grid < 40 % of the view, or its centre outside): the fitted view's margins go beyond the grid at every
  opening, and the profile's title must stay then. **A tap outside the grid** opens the synoptic values at that point
  (it opened a local slice, ≈ 10 calls: against the rule). **No flight**: the map shows the world synoptic.
- `pages.yml` must stay identical on `develop` and `v3` (its header): the relay carries it to `develop` (the schedule
  runs from the default branch only).

## 24 October 2026 (late) — always the current flight; the altitude pill without workaround

- **The request** (user): "Pas de contournement, fix. Même si c'est plus long." and "Un double bouton « carte / météo »
  sur la vue cartes, qui affiche « pas de vol chargé » et renvoie au module météo… qui a un vol chargé (!?)".
- **Cause, found here**: with no current flight, Atmosphere fell back silently on the schema's example (C30J F-RAJA,
  LFRS → LFML) and **kept that choice** in its UI file: once a current flight existed, Atmosphere still showed the
  example as if it were the planned flight, while the maps module looked for the forecast of the real current flight —
  hence "no forecast: open Weather", Weather showing "a flight". Second, smaller cause: a level changed in Flight was
  the only one read, while the maps module reads the cross-section at the flight's own level.
- **Fixed**: Atmosphere always opens on the current flight (the one Fuel and the maps module read); another flight
  (example, text, file) is a try of the visit, never kept, and marked in the handle (Example, Typed route, File, Demo).
  With no current flight nothing is drawn: the block says "No planned flight: prepare it in Fuel" with **Prepare in
  Fuel** and **See the example** (read from the cache only, like an opening). "Load" on the current flight reads the
  variables of the chosen level **and** of the flight's level, so the maps module's cross-section is always in the
  shared cache after a load. Checked end to end (no flight → example → a current flight LFPO → LFLL at FL110, loaded at
  FL090 → the maps module's Weather shows the cross-section).
- **Altitude pill**: back to a one-line pill ("FL270 ▾", 14 px) now that the frame aligns its right column
  (`89496a41`); the round two-line chip was a workaround of the frame's alignment.

## 24 October 2026 (evening) — the relay's review: nothing written over the map, no status in the title

- **The relay's review after integration** (asked by the user: "Toi, l'ergonomie, tu vérifies"): the template header ·
  map · sheet · bar is right; to remove: the hint pill over the map, a status message in the handle's title, an
  altitude chip showing only "▾" before the forecast. The MapLibre attribution is the maps lot's (`map_base.js`).
- **The hint is a notification** (`ctx.notify`, once per page, when a profile is first drawn), never over the map;
  what the map shows (time, level, lines) or "Load to read the grid" heads the Layers content.
- **The title says the content and its context, never a state**: the flight in brief is computed as soon as the flight
  is read (before any forecast: aircraft, route, level, departure, model, then the run once known); the reading's state
  stays in the body of the block and in Flight.
- **The altitude chip is hidden until the map's grid is read** (nothing to choose before).
- The frame aligned its right column (`align-items: flex-start` under `wrap-reverse`, `89496a41`); the round chip is
  kept: same size as the other buttons.

## 24 October 2026 (evening) — buttons on the map, the flight in the sheet's title

- **The request** (user, relayed): "Visuellement, le volet fonctionne, mais pas les boutons. Maximiser l'espace alloué à
  la carte", then "Techniquement, ça fonctionne. Mais ce n'est pas du tout ni ergonomique, ni utile pour un
  utilisateur. C'est un souci d'interface, pas de code. -> design, donc session maître." Measured on a 390 × 664 phone
  view: 184 px above the map (header 57, Préparer sub-tabs 44, margin 12, tools row 48, information line 23), a map of
  235 px. **Decided by the relay** (`V3_SPECIFICATION.md` § 7.1, rules 1–5): nothing between the header and the map;
  the buttons in the frame's overlay layer; the sub-tabs become a pop-over of the Préparer tab (frame); the default
  sheet at 30 % on a phone (frame token, nothing here).
- **Applied with the frame's contract** (`frame/INTEGRATION.md` § 9.3, § 9.4): Layers on the left, Flight, i, Load and
  the altitude chip on the right, full screen added by the frame. The tools row and the information line are gone; the
  flight in brief is the context of the sheet's title (profile, **i**), the demonstration badge in the handle line, the
  profile's note (time of passage, places, pressure altitude) in the title's tooltip. The map: 380 px (465 px in full
  screen).
- **Altitude chip as a 44 px round button** (two lines at 11 px, "FL270" over "▾"): a wider pill was aligned against
  the column's left side by the frame's right column (`flex-wrap: wrap-reverse` swaps `flex-end`), the other buttons then
  stood off the edge. Reported to the relay; a round chip keeps the column even whatever the frame does.
- **User's review of the same evening** (iPhone screenshots of the version before this lot): "Le sélecteur de couche
  (commun au volet et à la carte) passe par-dessus. Les blocs résumé du vol, trop gros, pas assez synthétiques. Le
  double bouton « i » sert à quoi ? Toi, l'ergonomie, tu vérifies, c'est assez fouillis." What was done here:
  **Layers** is a content of the bottom block like Flight and Details (it served both the map and the profile but sat
  over the map, cut by a low map); **the summary** is a compact list, one line per value (name, value, note) instead of
  tiles (≈ 30 px a line instead of ≈ 75 px a tile); **the module's "i" becomes Details** with the list icon (the frame's
  header keeps the only "i"). The overall review ("fouillis") is the ergonomics session's: asked to the relay.
- **Map level of a planned step** read by its index in the trajectory's steps (the list was filtered before being
  numbered: a step at the requested level shifted the others).

## 24 October 2026 (evening) — the frame's sheet, touch on the map alone

- **`maps_copy_sheet.js` replaced by `frame/lib/sheet.js`** (relay: "tu peux faire cette migration dès maintenant",
  `frame/INTEGRATION.md` § 11): the frame's classes on the panel, its head, handle, title, ✕ and body; the positions are
  names (`collapsed`, `default`, `expanded`); the ◀ ▶ and ✕ buttons are left out of the handle's gestures (`ignore`);
  the position is kept between two mounts. What stays in the module: `settled` (map size, reframing, redraw).
- **"Le volet glissant fonctionne, mais pas les boutons"** (user, iPhone, relayed): not reproduced with touch events in
  an emulated iPhone 13 (Chromium; WebKit is not available in the session): Layers, the map tap, ✕, the handle, the
  profile tap and ◀ ▶ all answer, and the element under the finger is the button. No `preventDefault` on `touchstart`
  in the frame or the module; the header is in the grid's flow (no overlap by the safe area). Suspected: the
  `touch-action: none` set on the whole map box (buttons included) — on Safari it can swallow the tap of a control
  inside it. Hardened: `touch-action: none` on the map canvas alone, `manipulation` on the module's controls. The
  user's screenshot and the names of the buttons that do not answer are asked through the relay.
- **Buttons stay in the tools row for now** (relay): they go onto the map with the frame's overlay layer; "too many
  elements in the header" is answered there.

## 24 October 2026 (afternoon) — the shared map base

- **`maps_copy_base.js` replaced by `modules/maps/lib/map_base.js`** (maps lot `316ab3aa`, relay): `startTiles`,
  `styleFor`, `mapSize`, `isOwnResize`, `loadRender`, `loadOutlines`, `plainView`, `drawPlain`. Two differences accepted
  with the copy: an error before `load` always gives up (the copy gave up only when the map was not loaded), and
  Mercator is forced at every style. `mapSize` now runs on every size change, after a settle, and on return of a hidden
  tab (`visibilitychange`, `pageshow`); `movestart` counts as the user's only when it is not the base's own resize.
  Only the sheet was still a copy (`maps_copy_sheet.js`, until `frame/lib/sheet.js`; replaced the same evening).
- **`drawSection` takes a precomputed `model`** (maps' request: its sheet redraws at every drag step), documented in
  INTEGRATION § 5, with what reading from the cache only implies (the run kept in `cache/weather/<model>/meta.json`).

## 24 October 2026 (afternoon) — the screen redone on the maps module's template

- **The request** (user): "Rien ne va en termes d'ergonomie. C'est parfait en mode large, hormis les bugs d'affichage,
  épouvantable en mode téléphone. On retravaille, sous la forme d'un module dédié (pour v3) derrière une icône et on
  réinclura plus tard. Template : module « carte ». En haut : la vue carte. En bas, soit la vue du profil global, soit si
  on clique sur la carte, les tranches locales. Le tableau ne peut avoir sa place que derrière un bouton du header « i ».
  Pas de scroll sur la map, plein cadre de l'écran du téléphone." Bugs named: "carte pas synchro avec les couches,
  profil météo vertical rasterisé".
- **Fixed view** (`meta.fixed`, the frame's contract delivered the same day): tools row, map (flex), bottom block (40 %,
  scrolling inside); the table and the settings are contents of the block behind **i** and **Flight** (relay: in the
  block, not over the map). **The maps module's three-position sheet, copied** (relay: copy it rather than invent one):
  same tokens (head 44 px; default 38 % of the view on a phone, 35 % on a screen; expanded 70 %; floors 170 / 260 px),
  same handle and gestures (tap: collapse or bring back; drag: nearest position, a flick the next one; arrow keys), a
  content opened while collapsed opens it, the map with no minimum height so the expanded sheet stays above the tab bar;
  the block is redrawn once the size has settled (and only when it differs from the last drawing), nothing is drawn
  while collapsed. Its code is internal to `modules/maps/module.js`: a copy until the shared base below.
- **Level 1**, still in the Préparer group (relay): "behind an icon" is the Atmosphere sub-tab of Préparer on a phone
  and its own entry in the rail on a screen — the later re-inclusion is already in place.
- **Portrait locked** for now; nothing in the module (frame and shells: manifest `orientation`, `screen.orientation.lock`
  once installed, Capacitor). Landscape target to submit to the ergonomics session: map on the left (~60 %), the block
  narrow on the right, a small info line under it, buttons as a vertical rail on the right edge.
- **Map out of sync — the maps module's technique** (user: "le module cartes utilise MapLibre et ajoute des vecteurs.
  Utiliser la même technique (mutualiser !)"): the overlay is a canvas redrawn on every frame of the movement, as in
  maps; the lag came from computing the refined grids and contours inside each draw. Now the geometry is computed once
  per data set and only projected per frame. A first try with native MapLibre layers (GeoJSON, image sources) was set
  aside for this reason: one technique for both modules. Shared without touching the maps module's files (its agent is
  mid-lot): `render.js` (`MapsRender.mercator`, `drawBackground`, `tokens`), `lib/outlines.js`, MapLibre and its
  styles. Proposed to the relay: extract the maps module's base (`loadMapLibre`, `startTiles`, `styleFor`, `mapSize`,
  plain background) and its sheet (`setSheet`, `sheetGestures`, `settle`) into shared files used by both. **Decided by
  the relay** (`V3_SPECIFICATION.md`, 24 Oct): the map base goes to `modules/maps/lib/map_base.js` (a maps lot, imported
  here like `render.js`), the sheet becomes a frame primitive (`frame/lib/sheet.js`, rules in
  `frame/design/primitives.css`); until those two lots land, the copies stay here, isolated and marked: two files,
  `maps_copy_base.js` (`loadMapLibre`, `STYLE_DAY`, `STYLE_NIGHT`) and `maps_copy_sheet.js` (`createSheet({ root, data,
  head, grip, prefix, title, skip, onSettle })`), each headed "COPIE DE MAPS, À REMPLACER PAR …"; the module keeps only
  what is its own (`settle`: what to redo after a change of size).
- **Rasterised profile → SVG** (`section.js`): vector lines, text and barbs; the continuous fields (cloud, temperature,
  humidity, density altitude, icing and inversion masks) are images of the 200 × 120 computing grid drawn enlarged and
  smoothed, so no steps; hatches through SVG patterns masked by those fields. On a narrow block: barbs every ~34 px
  and every other level, point names that would overlap left out, surface strips only above 260 px.
- **Toolbar like the maps module's** (its SPEC § 4, relay): one line of 44 px controls — the map's altitude selector
  taking what is left, then three icon buttons named in `title` / `aria-label` (plane: flight and settings; info: the
  information; download: load) — an invisible `h1`, then an information line in `--sog-size-xs`, one line, ellipsed, the
  full text in its `title`; the Layers button at the top left of the map, the map's hint at the top beside it (it covered
  the base map's credits at the bottom).
- **The cross-section offered to the maps module as `drawSection(el, { width, height, route, levelFt, profile, depTime,
  locs, cursorM, … })`** (its INTEGRATION § 6): the model's computation moved from `module.js` into `section.js`
  (`sectionModel`, `sectionPlaces`, `sectionVars`), which the module now uses too — one computation for both screens.
- **Local slice at any point of the map**: the column of the tapped point's cell from the weather cache, else one place
  from Open-Meteo (≈ 10 weighted calls), at the time the flight passes nearest; a tap on the profile or a table row opens
  the slice of a reading place (no call).

## 24 October 2026 — from mock-up to module

- **The request** (user): a graph of the atmosphere along the flight — clouds, inversions, density… — in slices along
  the route and at the surface, at the requested, planned and computed altitudes; on the map, isobars, temperature,
  clouds. First a standalone mock-up page (`labs/atmosphere`, `f3a05818`).
- **Quota first** (user: "limiter les appels / quotas"): nothing asked when the screen opens; device cache; only what
  is missing asked; a tally of the calls. Measured on the bench (Open-Meteo answered from the demonstration): opening
  0 forecast request, "Load" 2 requests, again or page reloaded 0, another level only its missing variables.
- **A module, through the frame** (user: "Interface et mutualisation : bien sûr ! C'est inscrit dans les règles de la
  v3. Module : bien sûr."): `modules/atmosphere/`, everything through `ctx` (data, net, aerodb, t); four languages;
  `--sog-*` tokens and the frame's primitives; the lab page forwards to `#atmosphere`.
- **Schema checked with the maps / mobile session** (relay of the ergonomics session): current flight schema 1
  unchanged, read only; names of a route text through `ctx.aerodb.coords`; the avwx key is the frame's; METAR by
  `metar.vatsim.net`.
- **Shared weather cache by model, cell and hour** (user's decision of the same day, `V3_SPECIFICATION.md` § 8;
  "Cases demandées par cartes : oui. Ses décisions sont à suivre systématiquement"): `cache/weather/`, written here
  until the frame lot `frame/weather` takes it.
- **One file per UTC day** (relay, answer to this module): the logical key stays (model, cell, hour), the file holds a
  day's 24 hours — one file per hour would have meant ~3,000 IndexedDB writes, `changed()` notices and backup entries
  per load. A file of another run is replaced whole; a day already there is never asked again, only its missing
  variables.
- **Cell at the model's resolution, 0.1° floor** (relay): Météo-France (AROME brought to 0.1°) and ICON 0.1°, GFS
  0.25°. The bigger the cell, the fewer calls; a finer model would be a second prefix, not a rewrite.
- **Sampling as Fuel** (relay): one place every 50 NM, 24 at most (the mock-up read every 25 NM): a 370 NM flight reads
  9 places instead of 17.
- **Place in the application** (relay): an entry in `APP.modules` with `meta.level: 3`, `#atmosphere` at any level, no
  developer mode, so the user can try it on GitHub Pages. **Reserve**: the phone target is "bottom bar, five items at
  most, Settings included" (`V3_SPECIFICATION.md` § 7.1); Atmosphere is not a lasting sixth verb — its likely place is
  a tab or a screen of Map or Fuel, for the ergonomics session to decide. Icon `layers` (no cloud icon in the frame's
  set).
- **Its lasting place is decided** (user, 24 Oct 2026, 11:00, `V3_SPECIFICATION.md` § 7.1, option A): Atmosphere is
  **not a verb**; it becomes the **Météo tab of Préparer** (a group of modules: fuel + atmosphere) and a content of the
  map's data block (the cross-section); it stays reachable by its address. Until the frame's lot (bar, groups of
  modules) lands, the level-3 entry in `APP.modules` is the transition: the frame's router only opens modules listed
  there, and level 3 keeps it out of the default menu.
- **No Open-Meteo key in the module**: a key is the frame's business (`ctx.net` does not know `customer-api`); the
  free API is enough with the cache. The CSP line added for the lab page's key was removed. If the quota ever needs a
  key: a frame lot (key kept on the device like avwx's, `ctx.net` switching to `customer-api`).
- **Tally in `cache/weather/ledger.json`** until the per-day counter of Settings › Diagnostics (frame lot § 8).
- **TAF kept 30 min** in `cache/atmosphere/taf/` (avwx.rest has its own quota).
- **Past days removed** once a day (`prune`): without it the cache grows by ~15 KB per cell and day for ever.
- **Help chapter not written yet** (`meta.help: false`): the module is still a mock-up; the chapter comes with its
  lasting place.

- **25 Oct 2026 (relay cloud, at integration of the settings lot `v3-settings-admin`)** — the Administration card writes the flight-zone
  limit as `edge.show` (an object, extensible) in `airline/map_profiles.json` (`frame/settings/INTEGRATION.md` § 4); the module read
  `edge === false` only. `readEdge` now reads both forms: `d?.edge !== false && d?.edge?.show !== false` (absent means shown, rule 15).
  Atmosphere session informed; the boolean form may be dropped when nothing writes it any more.
