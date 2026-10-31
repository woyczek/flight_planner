# maps — specification (regeneration prompt)

This document describes the V3 map module completely enough for a developer or a language model to rebuild it without
seeing its code. It states the final behaviour only; why each rule exists is in [DECISIONS.md](DECISIONS.md), how the
frame mounts the module and what it needs from the frame, aerodb, fuel and atmosphere is in
[INTEGRATION.md](INTEGRATION.md), the reading of the V2 studio in [READING.md](READING.md). The phone rules this module
follows are `docs/technique/V3_SPECIFICATION.md` § 7.1 (rules 1–21).

## 1. Purpose and files

The Pilot application's map, fast on a phone:
- the route map of the planned or started flight, with its vertical profile, the weather cross-section and a common
  cursor;
- the route edited on the map (points and levels);
- the mission maps redrawn from what the mission stores;
- the administrator's tuning page of the zoom thresholds.

| File | Role |
|---|---|
| `module.js` and the files it imports | the screen (§ 4–14), split by concern (INTEGRATION § 1): `state.js`, `texts.js`, `style.js`, `screen.js`, `draw.js`, `data.js`, `layers.js`, `sheet_view.js`, `profile_view.js`, `procs.js`, `choose.js`, `coverage.js`, `tips.js`, `lv.js`, `vfr.js`, `flight_time.js`, `mission_view.js`, `weather.js`; on demand (`meta.lazy`) `edit.js` (§ 12) and `tune.js` (§ 14); no file above 60 KB |
| `render.js` (`window.MapsRender`) | the rendering core (§ 3), no interface text: design tokens, display profile, geometry, background, aerodromes and navaids, obstacles, fixes, VRP, cities, mission, grid and MORA, zoom logic, `draw()` |
| `render_airspace.js`, `render_route.js` | its two parts, classic scripts loaded after it (split on 29 Oct 2026 to stay under 60 KB): airspaces (choice along the route, shapes and labels), airways, AAR and NAT, the airspaces and airways at a point; the route's labels and trace. They read the core's helpers in `MapsRender.kit` (frozen) and expose their drawing as frozen namespaces, `MapsRender.parts.airspace` and `.route`, which `draw()` calls with a frozen `env = { theme, placer, pal }`; the theme lives for the drawing only (V3 § 10.29 e); the public functions stay on `MapsRender` |
| `profile.js` (`window.MapsProfile`) | the vertical profile (§ 8) |
| `mission.js` (`window.MapsMission`) | a mission's maps (§ 15) |
| `contours.js` (`window.MapsContours`) | contour lines (§ 6.10) |
| `lib/map_base.js` | MapLibre and the plain background, shared with atmosphere (INTEGRATION § 7) |
| `lib/axis_window.js` | the window on a distance axis, shared with atmosphere (INTEGRATION § 10) |
| `lib/aero_symbols.js`, `lib/vertical_profile.js` | copies of the V2 studio's code (`SiaAero`, `SiaProfile`), diverging where this document says so |
| `lib/profiles.js`, `lib/outlines.js` | generated: the studio's built-in display profiles, the country outlines |
| `lib/maplibre-gl.js`, `.css` | MapLibre |

The routing over the airways is a frame library (`frame/lib/routing.js`, INTEGRATION § 9); the ETA and the planned
position are derived by the frame's `frame/lib/flight_time.js` (§ 13; re-exported by `current_flight.js` during the transition, § 10.29 b).

## 2. What is read and written

### 2.1 Read

- **The current flight**: `pilot/<trigram>/current_flight.json` (schema: `modules/fuel/INTEGRATION.md` § 3). Used:
  `route.points` [{ id, lat, lon, alt_ft?, via?, awy?, wind? }], `route.dep`, `route.arr`, `route.altn`,
  `route.procedures` (v2: `{ dep: { rwy, sid, trans }, arr: { rwy, star, trans, app, appTrans }, by, at }`, read through
  `proceduresOf`), `route.text`, `level.ft`, `aircraft.type`, `profile` { climbFpm, climbKt, descentFpm, descentKt, tocNm,
  todNm, `path` [{ nm, ft }] (the planned vertical path under the procedures' constraints) }, `quote` (`minutes`, `legs`
  [{ id, min, origin }], `taxiMin`), `planned_at`, `started`
  (`at`, `diverted`), `progress` (`actual`, `phase`, `fuelRemainingKg`, `remainingNm`), `by`, `updated_at`.
  - `alt_ft` is the level held from that point on, never on the first or the last point; the flight leaves at
    `level.ft` and a point without `alt_ft` keeps the previous level. It becomes the point's level for the profile
    (steps, TOC and TOD per segment; fuel's single-level `tocNm` / `todNm` are then not used) and is written next to the
    point's name ("LMG · FL280").
- **The device's settings**: `cache/maps/ui.json` `{ preset, layers: { <mode>: { <key>: bool, detail, zoom } } }`
  (§ 6.7, § 14).
- **The airline's display profiles**: `airline/map_profiles.json` (§ 14), followed with `watch`.
- **The pilot's units**: `pilot/<trigram>/fuel.json` `displayAlt` (contour interval).
- **The airline's settings**: `ctx.airline` (`transitionFt` for `formatLevel`).
- **Missions**: `missions/<l>_<FAMILY>/<ID>/mission<ID>.yaml` (§ 15), on demand.
- **Weather**: the frame's weather layer `ctx.weather` (grid, world; cache only: the map never asks Open-Meteo), frame
  INTEGRATION § 14 (§ 9).
- **Aeronautical data**: `ctx.aerodb`, by area only (INTEGRATION § 3), and, for the procedures the flight chose, the records
  `aerodb.procedure(id)` and the runways `aerodb.runways(icao)` through `loadProcedures` of `frame/lib/flight_path.js`, read
  once per change of `route.procedures` (§ 5).
- **Terrain**: Terrarium elevation tiles (zoom 9, about 300 m), fetched through `ctx.net` from the host declared in
  `meta.net`, never with `fetch`: the module hands the bricks a `load(url)` built on `ctx.net` (profile relief, contour
  lines; `lib/vertical_profile.js` and `contours.js` diverge from the studio there). The Topo hillshade is a MapLibre source,
  fetched by MapLibre like the base map's tiles.
- **Base map**: OpenFreeMap (and VersaTiles) tiles drawn by MapLibre; MapLibre calls the tile hosts itself (declared in
  `meta.net`).

### 2.2 Written

| Path | Policy | When |
|---|---|---|
| `pilot/<trigram>/current_flight.json` | record merge | the route edited on the map (§ 12) |
| `cache/maps/ui.json` | cache | mode, layers, complexity step, device thresholds |
| `airline/map_profiles.json` | record merge | "Save for the airline" of the tuning page (§ 14) |

Nothing else is written; missions, aerodb's files and the frame's records are never written.

## 3. Rendering core (`render.js`, `window.MapsRender`)

Everything is a parameter; nothing is read from a page or a data global. The projection is given:
`toC(lat, lon) → { x, y }` (MapLibre's `map.project`, or the Mercator projection of the plain background).

- `routeProfile(levelFt)` → the built-in "IFR route" display profile, in the studio's profile shape (`zones`,
  `zoneList`, `zoneMode`, `corridorNm`, `elements`):
  - airspaces R, D, P, TRA, CTR, TMA, CTA within 10 NM of the route;
  - below FL195 low airways and airspaces below 19,500 ft; from FL195 high airways and airspaces above;
  - aerodromes (public and state), VOR / TACAN / DME / NDB, MORA, graticule.
- `selectAirspaces(list, profile, route)`: kept by family, floor and ceiling (`SiaAero.limitFt`) and the white or
  black list, then by the corridor (a route sample inside the airspace, or an edge within `corridorNm`).
- `bboxOf(points, marginNm)`, `distances(points)` (great circle, NM), `marks(points, stepNm)` (every 10 NM, every 50 NM
  beyond 150 NM), `mercator(bbox, W, H, pad)` → `{ toC, shown }`.
- `drawBackground(ctx, toC, W, H, rings)`: sea, land, borders.
- `draw(ctx, { toC, W, H, scale, bbox, profile, data, route, marks, hideVrp, zoom, lines, reserve })`, where `lines` are the
  polylines of the route's points that the route itself traces (null: all of them; § 5, Procedures) and `reserve(placer)` is
  called right after the route's labels so that the screen reserves its own (the chosen procedures' names and constraints), drawing order:
  1. every label of every layer gets its place from **one collision pass** (below), whatever the layer's drawing order;
  2. airspace shapes (ICAO symbology, `SiaAero.drawAirspaces`);
  3. airways (all strokes, then all names, so that no stroke crosses a name);
  4. aerodromes and navaids (`SiaAero.drawPoints`, § 3.2);
  5. airspace labels;
  6. graticule and MORA (the highest MORA of 2, 4… degree groups when a degree is narrower than 70 px);
  7. the route on top: line, points, NM marks and their labels;
  8. over the route's line, the boxed names of the airways that route legs follow (§ 3, airways).
  **Colours** (V3 § 10.29 f): every cartographic colour of the map (route, NM marks, plan, airways and their level, AAR, NAT, the
  procedures SID / STAR / approach, terrain, MORA, alternate, actual position, winds, VFR, mission zones) comes from one palette,
  `MapsRender.palette(dark)`, day and night, read by the renderer and the screen (procedures, legend, position, barbs); the
  "paper" colours stay the design tokens (`tokens`, `themed`).
  In the code (V3 § 10.29 d) this order is **one list of layers** in `draw()`, each `{ id, reserve(), paint(ctx), bare }`: every
  `reserve()` first (`screenLabels`, `routeLabels`, `missionPoints`), then every `paint(ctx)`; the order of the calls no longer
  decides any place (V3 § 10.30: **one collision pass** per drawing, by the closed priority list below; a label without room
  slides along its anchor or is left out; the base map's own labels do not move):
  `zoneShapes`, `airways`, `points` (aerodromes, navaids, airway fixes), `aar`, `nat`, `airwayNames`, `vrp`, `zoneLabels`,
  `gridMora`, `missionZones`, `missionPoints`, `cities`, `route`, `dim` (the choose mode: `dim` option, 0 to 1, the share by which what is
  already painted fades), `screenTraces` (the screen's `overRoute`: the chosen
  procedures), `airwayOver` (the boxes over the path), `screenTop` (the screen's `top`: the procedures' labels, last).
  It returns the frames it drew for the tooltips and the gestures: `airways [{ x, y, r, g }]`, `labels`, `barbs`,
  `navaids [{ n, x, y, merged }]`, `aerodromes [{ a, x, y }]`, `vrps`, `tocTod`, and `zoom { shifted, effective, tier,
  kept }` (`kept.byKey` per family).
- **Target form of the labels (refactor R-M2 + R-M5, § 10.33).** Three lots, pushed apart:
  - **(a) one boxed-label primitive** in the render kit, `MapsRender.cartouche(ctx, r, { runs, hue, swatch, full, alpha })`
    (a frame, a halo, text runs `{ text, color, weight }`, an optional hue swatch, the full or faded look), the only drawer of
    the procedure labels (`procs.js`), the choose mode's labels (`choose.js`) and the airway boxes (`render_airspace.js`); the
    procedures' hues `PALETTE.sid / star / app` read the design tokens `--sog-map-sid / -star / -app` (Features SOG, R-F3), the
    hex values staying only as the fallback when a token is missing.
  - **(b) every layer declares its labels** instead of taking the placer itself: `{ layer, prio, key, anchor, boxes: [rect, …],
    paint(ctx, rect) }` — `boxes` the candidate rectangles in the layer's own order of preference (its sliding along the anchor),
    `paint` writes the label in the rectangle the pass gives; `many()` of `data.js` deduplicates the answers of aerodb **by a key
    per kind** (`keyOf`: airspace `type|key|name|lower|upper|first ring point`, airway segment `route|a|b`, aerodrome `icao`,
    navaid / point / VRP `id@lat,lon`, town `name@lat,lon`) instead of by object identity (which frozen copies defeat), so
    `drawAirways` no longer deduplicates for it. **The SIA key does not identify an airspace**: in the published bases one key
    can name several airspaces (LF600 is both a SUR and a PRN; 74 such keys in the French base), so an airspace is the whole of
    its type, key, name, limits and first ring point (unique in the fr, es, de and gb bases); the label requests of the airspaces
    use the same rule (`zone:type|key|name|lower|upper`).
  - **(c) one collision pass**, `SiaAero.pass(ctx, run, rankOf)` (`lib/aero_symbols.js`), replaces the placements in the order
    of the calls. The drawing `run(ctx, pl, first)` is played **twice**: a mute round on a context that paints nothing **by
    construction** — a local object of the Map's own (`muted`, one per canvas: every drawing method a no-op, `measureText` on a
    measuring canvas of its own), never a Proxy over the real context, so no stroke of the first round can reach the screen; the
    `bare` layers, strokes only, are skipped. Its one link to the real context is `canvas`, the real element, for reading:
    **no drawing code of the Map writes through `ctx.canvas`** (width, height, style, `getContext`), else the mute round would
    touch the real canvas; the day one needs to, the mute context exposes a canvas of its own (Securisation, audit line 110) —
    lists every request `pl.ask(req)` and every
    symbol reservation `pl.add(rect, rank)`; the pass then places them in the order of `rankOf` (stable inside a rank: the order
    in which the layers asked), each taking its first free candidate or none; the painting round replays the drawing, each
    request finding its decision by layer, key and occurrence (a request the first round did not see, its code having taken
    another path, takes a place still free without moving anything). Rules of the pass:
    - **one box per key**: requests sharing a non-empty `key` get one box, the best rank's; a navaid, airway fix or VRP that is
      also a route point (`id@lat,lon`, four decimals) is written once, by its own box — the route adds none, its ETA stays;
      **an aerodrome of the route** likewise (sixth reading, gap 4) — its ends, a stop on the way, the alternate (`onRoute`): the
      route's label of that point is keyed by the aerodrome's code, the aerodrome's name is that one box, at rank 1, in the
      aerodrome's style, always written (`force: 'paint'`, as the route's ends were), and the alternate's grey code is not written
      again beside it. The merge happens only when the map draws an aerodrome of that code; otherwise the route's label stays — a
      4-letter route point that is not a drawn aerodrome is never swallowed. The key is
      the ICAO code alone: the route's point and the base's aerodrome are rarely the same position to four decimals (LFBO
      43.6293, 1.3638 in a route, 43.6351, 1.3679 in the base);
    - a request with a `parent` (a key) is left out when its parent is: the true tracks of an airway ("097°") go with its box;
    - `force: 'paint'` (the route's ends, the procedures' names) paints at the first candidate without reserving when nothing is
      free; `force: 'reserve'` (the choose mode's aerodrome code, a mission point, TOC / TOD in the profile) reserves it anyway;
    - the pass hides nothing because of a zoom: what a zoom hides is the zoom rule's (below).
    The map's list is `RANK` of `render.js`; the vertical profile goes through the same pass (`profile_view.js`, the profile's
    canvas and its own placer) with its own list `PROFILE_RANK`: TOC / TOD, the chosen procedures' constraints, the cruise levels,
    the airspaces' names, the obstacles' elevations, the airway points; its "+n" box is reserved before them.
  - **The closed priority list** (the user's arbitration of 30 Oct 2026; no number scattered in the layers), `RANK` of
    `render.js`: aerodrome symbols (reserved, not written); 1. the aerodrome's name (code, and name from `runwayZoom`; the choose
    mode's code first); 2. the runway numbers at the threshold; navaid symbols (the symbol of a DME standing on a threshold gives way
    to the runway number: without it « 32L » vanished under TBN at LFBO); 3. the navaids' boxes; 4. the procedures' labels (in the order the screen asks: the highlighted procedure,
    the chosen ones, the touched family, the others; in flight, the names, then the points and constraints); 5. the route: its
    points (names, levels, ETA), NM marks, TOC / TOD, the cartouches of the airways the path follows, and on a mission map its
    points; 6. the rest, in this order: airway boxes off the path and their true tracks, AAR and NAT names, airway fixes, VRP,
    obstacles, airspace names, MORA, graticule, towns, mission zones.
  - **Sliding before silence.** At a terminal the aerodrome and its navaids win over the route; the route's ETA then tries, after
    its four places around the point (under the name, above, left, above left), places beside the trace 16, 32, 48 and 64 px
    along the next and the previous legs; TOC and TOD try their four corners, then the same corners around a point of the trace
    16 to 64 px on either side (following the profile's path, `MapsProfile.posAt`); never off the trace, and silent when nothing
    is free (the diamond stays).
  - **What a zoom hides is said by the zoom rule**: a label left out at a zoom because of its kind is the profile's threshold of
    that element (`map_profiles.json`, `runwayZoom`, the tuning page's thresholds § 14), never a pixel or zoom threshold hidden in
    a layer; what remains in a layer is geometry (a label longer than its segment is not written).
- **Overview rule** (under 120 px per degree): only aerodromes and VOR / TACAN within 15 NM of the route, airways whose
  middle is within 30 NM, no obstacles. Closer views show everything the profile allows.
- **Density** (`tierOf(px per degree)`: far under 80, mid under 300, near beyond, computed on the effective zoom § 6.6;
  `densify(data, tier, profile)`; mission maps are drawn in full; with `vfrDensity`, VRP at every tier):
  - far: large aerodromes only, no navaids, airways with their boxed names;
  - mid: plus the airway points and the minimum level under each name ("F195");
  - near: everything, plus each segment's distance (NM) with the level on one line under the name ("22 · F065"), the true
    tracks near both ends ("097°"), VRP and obstacles.
  An airway segment is drawn and labelled **once** (keyed by its route and both ends: the corridor's several boxes give the
  same segment as distinct objects, and the second used to slide its label further along the same line), only when the
  segment is longer on screen than its label; the longer segments are placed first (two labels that would overlap: the
  longer segment's stays).
- **Airways** (`drawAirways`), as en-route charts: low airways solid blue, high airways dashed purple, the name in a
  filled box laid on the segment (readable left to right), at its middle; when that place is taken (the route's labels are
  placed first by rank) the box slides along the segment, never beside it, and is left out if no place is free; a segment shorter
  than its box asks for nothing. The box of an
  airway that a route leg follows (the leg's two points are the segment's ends) is painted after the route's line, over it,
  with a background edge that interrupts the line; its place does not depend on the route (no jump when a leg is added).
  In Edit mode the dragged point and its ring stay above everything (the screen draws them last). Segment ends after them
  (`drawFixes`: a triangle and the id; a navaid at the same place is drawn with its own symbol instead).
- **AIP notation** (`sia(airspace)` → [main line, activation · information]; `siaLimit`): "TMA 8 AQUITAINE 2000|FL145 D":
  SFC, FL### (FL999 → UNL), ASFC, plain feet AMSL. Airways: `awLimit(ft)` (FL from 5,000 ft, UNL from 66,000 ft).
- `airspacesAround(list, lat, lon, more)` → `{ shown, also }` and `airspacesAt` (its `.shown`), `airwaysAt(hits, x, y)`:
  what is under a point (§ 10).
- `sortAirspacesTopDown(list)`, `vrpCode(id)`, `vrpRotary(v)`, `vrpColor(v)`, `dedupeVrp(list)`, `effectiveZoom`,
  `detailZoom`, `atZoom`, `byZoom`, `zoomOf`, `pxOfZoom`, `tokens()`, `themed(ctx, tokens)`: below.

### 3.1 Airspace limits

- **One reading of a vertical limit**, `SiaAero.limitRead(text, top)` → `{ ft, rel, unl, ok }`: the number is read
  before the word ("ASFC" contains "SFC" and is not the ground); FL × 100; metres converted; `rel` for ASFC, AGL, AAL,
  SFC and GND, never with AMSL / MSL; `unl` for UNL or 66,000 ft and over; `ok` false when the text is empty or
  unreadable (`ft` is then 0 for a floor and infinity for a ceiling). `limitFt` is its value in feet. Filters, the list's
  graph and the vertical profile read limits with this function and no other.
- **No space from the surface to the ceiling in the vertical views**: `SiaAero.surfaceToCeiling(space)` is true for the
  types SIV, FIR, UIR and CTL, and for any space from the surface (SFC / GND, or an unreadable floor) to the ceiling (UNL,
  or an unreadable or empty ceiling). Such a space is neither in the airspaces list nor in the vertical profile; the map
  itself keeps its thresholds by type.

### 3.2 Beacons in the same place

- `SiaAero.drawPoints` takes places from the highest rank to the lowest: TACAN, VOR, DME, NDB, ILS / LOC (a DME paired
  with an ILS comes after its ILS; the ILS symbol carries "(D)"); an ILS's place includes its feather. A beacon without
  place is attached to the nearest kept one; close up (300 px per degree and more) every beacon is drawn except one whose
  symbol would fall on a kept one. Drawing goes from the lowest rank to the highest, so an ILS stays underneath.
- Over a beacon (within 9 px) the tooltip gives "VOR BZH 110.65" and either "also here: ILS 25L BG 109.9" (the
  attached ones) or its name.

## 4. The screen

- **Fixed view** (`meta.fixed: true`, frame INTEGRATION § 9.2): the module root is a flex column at the height of the
  frame's view, `overflow: hidden`, `isolation: isolate`; nothing scrolls but the sheet's body.
- **Layout: header · map · sheet · bar.** Nothing between the frame's header and the map. The root's children are an
  invisible `h1` (1 px, clipped, at the root's top-left corner), the map box (`flex: 1 1 0; min-height: 0`, full width,
  the aeronautical layer on a canvas over MapLibre) and the sheet (§ 7).
- **Buttons over the map**, all in the frame's overlay layer (`ctx.overlay`, frame INTEGRATION § 9.3), 44 px round,
  name in `title` / `aria-label`, `aria-pressed` for the toggles, hidden with `hidden`, icons from `frame/lib/icons.js`
  (the module draws none). **Right column**, from the top: Edit the route (`route`, opens `#fuel?from=maps&focus=route`),
  Recentre (`fit`), the map mode (`mode`, the current mode's icon), Edit on the map (`edit`, toggle, icon `move4`),
  Follow (`follow`, toggle, icon `plane`, started flight only), then in Edit mode only Add a point (`add`, toggle, icon
  `plus`) and Undo (`undo`, icon `undo`, disabled with nothing to undo); the frame's full-screen button is the last one.
  **In Edit mode** only Edit (pressed), Add, Undo, Recentre and the full-screen button are visible: Edit the route, the
  mode and Follow are hidden while editing (they do not apply), so the column keeps five buttons.
  **Layers** (`[data-mp=layers]`, pressed while its content is open; named "Map to show" on a mission map) is a chip of the
  sheet's head, left of the grip (30 Oct 2026: a button and the pane it opens are neighbours, phone and computer alike); the
  map's top left corner holds nothing. With nothing to show (no flight, a mission without map) the sheet is its head line
  alone (collapsed, portrait; the landscape column has no collapsed position); a map waiting for its profile keeps the rule
  of before (the sheet comes with the profile).
  Route, mode and edit buttons are hidden on a mission map.
- **The modes panel** is in the overlay layer too (appended to the layer of `ctx.overlay`, which `over(el)` lays over the map
  box): six icon buttons in a row, anchored to the
  left of the mode button at its height, placed when it opens (the column may have wrapped, the map may be low); each with
  its name and help as tooltip and `aria-label`, the current one pressed (accent ring and inset shadow; red for CAM);
  closed by a choice, a tap on the map or the sheet, or Escape. Nothing is drawn over the map outside the frame's
  overlay layer except the light tooltip and the route point's card (§ 11, § 12), inside the map box.
- **Messages**: a floating notification (`ctx.notify`) for what must be seen once (the base's state at mount, the
  Edit mode's help when entering it, the "+" armed hint, GPS not enabled); the sheet's notes (§ 7.6) keep what stays
  true. Never a line over the map.
- **Empty states**, written only when they change:
  - no flight (or a mission without maps, or an unreadable mission): the sheet is hidden, so are Recentre, the mode,
    the route and the Edit buttons; a card in the middle of the map area says it ("No planned flight", "Open Fuel");
    the Layers button stays (its content holds the selector);
  - the aeronautical base's state, from `aerodb.state()` (and `on('state')`): `loading` "Aeronautical base loading…",
    `noaccess` "Data access not set on this device" with a button to Settings, `unpublished` "Aeronautical base not
    published" (only when the access works), `offline` "Offline, without this zone's data" with "Offline data"
    (`#settings`). Said once per mount by a notification and kept in the notes; the route is drawn alone. The alternate
    never blocks the route.
- **Texts**: four languages through `ctx.t`; data labels (codes, names, levels) are not translated.
- **Contextual help**: the header's "?" opens the map's chapter (`help/<lang>.md`); the module gives the paragraph of what is
  shown through `ctx.helpAnchor(() => anchor)`: `maps-edit` (Edit mode), `maps-layers` (Layers content), `maps-weather`
  (weather cut), `maps-airspaces` (airspaces at a point), `maps-vfr` (an aerodrome's points), `maps-profile-zoom` (the profile
  zoomed), `maps-started` (a started flight), else none (the chapter's top). The anchors exist in the four languages.
- **Levels** are written by `formatLevel(ft, ctx.airline.transitionFt)` of `frame/lib/route_text.js` ("FL060" from the
  transition altitude, "3 500 ft" below): route labels, the point card, the level being dragged, the planned altitude in
  the strip. Heights (relief, MORA, obstacles) stay in feet.
- **Escape** closes one thing per press, the nearest first: the legend overlay, the modes panel, the sheet's content
  (Layers, airspaces, aerodrome; the weather cut goes back to the profile), the route point's card, the armed "+", the
  Edit mode. Taken in the capture phase on `document`; `preventDefault()` only when something was closed, so that the
  frame does not also leave the full screen; with nothing to close the key goes to the frame.
- **Full screen** (frame INTEGRATION § 9.4): nothing of the module's own; the size change reaches `onSettle` (§ 7.5).
- **Outside the fixed view**: in the dual-view pane the root takes the frame's `--f-pane-h` (420 px at least), on the
  left of a pane `--f-split-h`; on the test page (`test/index.html`, no overlay layer) the module builds the same two
  columns (`.f-overlay`) inside the map box with the same classes.

## 5. The map

- Pan and pinch, no rotation, no pitch, Mercator, north up. During a gesture, a light drawing at most every 120 ms (lines
  only: airspaces, airways, route; `light.js`), the last image copied in between; a light drawing over 8 ms leaves the rest of
  the gesture to the copy; the full drawing (labels, collisions, vectors, readings) at rest — end of the gesture or 150 ms
  without movement.
- **The light drawing shows what the full one drew** (sixth reading, 31 Oct 2026, gap 7): the aerodromes and beacons whose symbol
  the last full drawing drew (`SiaAero.drawPoints` gives them after the thinning of the symbols: the zoom rule and the thinning
  choose, never the drawing mode), each as a ring of its symbol's colour and size (an aerodrome 6 px, red for a State one, else
  blue; a beacon 4 px, blue) on the paper colour; no label. The picture keeps its look at the start and the end of a gesture.
- **One scheduler, three states** (`draw.js`, refactor R-M3): `rest` (a full drawing per animation frame when asked:
  `schedule()`), `move` (a gesture: the requests for a full drawing wait; one animation frame at a time draws light or copies),
  `settle` (end of the gesture: back to `rest` with one full drawing, the requests made during the gesture included). One
  slot of `requestAnimationFrame` for every kind (a full request outranks a light one). A full drawing only notes its two
  geographic corners (`markFrame`, two `unproject`); its bitmap is copied once, at the first move of a gesture (`copyFrame`),
  and after each light drawing — no longer after every full drawing at rest.
- **Base map**: MapLibre loaded at the first map (`lib/map_base.js`); the mode's base style (OpenFreeMap `positron` by
  default, `liberty` in VFR and Topo; VersaTiles styles when a profile names one); `dark` at night (VersaTiles
  `eclipse`). With no network, no WebGL, an error, or no style after 10 s, the plain background: sea, land and borders
  from `lib/outlines.js` (loaded at the first plain background, `meta.lazy`), fitted to the route and static; the note
  "Base map unavailable: plain background" is in the sheet's notes.
- **The base map's place names** (symbol layers whose `source-layer` is `place`, or `place_labels` for Shortbread
  styles) are hidden while our towns are drawn (Towns layer on, one `cities*` key in range, towns loaded), shown again
  otherwise; only the layers visible in the style are touched, on a change only; the list is read again at every
  `style.load`.
- **The attribution** is MapLibre's compact control, folded on its "i" button as soon as it exists (`map_base`), with
  the SIA note ("SIA: published database, not certified") before the sources: one credit text. MapLibre's controls sit
  above the sheet (`setBottomInset`, § 7.5).
- **Map size**: MapLibre is created with `trackResize: false`; `mapSize()` (`resize()` only when the canvas differs from
  its box) runs in the sheet's `onSettle`, at `load` and `style.load`, on the page's return (`visibilitychange`,
  `pageshow`, `resume`) and at each draw; never while the sheet moves.
- **Camera**: before any move of the user the module frames the route (`fitMap`) and a live update frames it again when
  it leaves the view; once the user has moved or zoomed (a move that is not the module's own framing nor `mapSize`'s
  resize, `isOwnResize`), every redraw keeps the user's camera — an Edit gesture, the live view, fuel's requote, a new
  `updated_at`. Only Recentre or another flight (departure or arrival changed) frames the route again.
- **Framed return** (sixth reading, 31 Oct 2026, § 10.30): opening the Map from Fuel, or coming back after « Terminer »,
  frames the flight with its procedures (`S.fit`), as the first opening does; the framing the user gave this same flight
  during the page (`keep.cam` { sig, center, zoom }, kept at the end of each gesture of the user's, never in the choose mode)
  is given back instead, and no further: the flight's signature (`flightSig`: departure, arrival, route text, the chosen
  procedures without their date) differs — another route, another choice of procedures — and the flight is framed again;
  Recentre and Follow forget it. **One writer of the framing**: `frameFlight(animate)` (`screen.js`), the view's own model,
  called at mount (when the map loads), after a reading of the flight, at the sheet's settle, by Recentre and by the choose mode
  (which frames its own `S.fit`); no other code moves the camera to frame (`fitMap` is its private step).
- **Data area**: in overview (view at least 90 % as wide as the route's area), the route's area; closer, the view widened
  by 15 %, read again only when the view leaves it. Airspaces and airways are read for the route's corridor only
  (`corridorNm` + 2 NM), leg by leg (one rectangle around a diagonal route would touch neighbouring zones). With "Around
  the route only" off (§ 6.7), the data area follows the view and everything in it is read and drawn; in a close view
  (300 px per degree and more) everything in the view is read whatever the layer says.
- **The alternate**: a grey dashed line from the arrival, a grey dot and its code.
- **TOC and TOD**: purple diamonds; their label goes north-east of the diamond, else south-east, north-west, south-west,
  then slides along the trace (§ 3, the collision pass, rank 5), silent without room (the diamond stays).
- **Procedures** (V3_SPECIFICATION § 10.20): the runway, SID, STAR and approach the pilot **chose in Fuel** (`route.procedures` v2,
  read through `proceduresOf`: a side whose aerodrome is not the route's is read as not chosen; the map never writes it, not even
  in Edit mode, which keeps it as it is). The records come from `aerodb.procedure(id)`, the runways from `aerodb.runways(icao)`
  (`loadProcedures`, once per change of the choice, without waiting: the route is drawn first and redrawn when they arrive); without
  `aerodb`, without a choice or without a record the path is the route and nothing changes. **One path**: `expandedPath(flight,
  procs)` gives the points "route + procedures" in flight order (kept in the state as `S.route.path`), `flownPath(path)` the points
  flown with their cumulative NM (`S.route.flown`: the only measure of distances, for the profile, the NM marks, the cursor, the
  times and the header's distance). Drawn over the route, thinner, with a background edge, one hue per kind (`procs.js` `colOf`, day / night; user, 29 Oct: "des couleurs de contraste autres que violet"): SID green, STAR orange, approach and missed approach sky blue — neither the route's and high airways' violet nor the low airways' dark blue; the constraints and point names take their procedure's hue; the airway boxes of the legs the procedures follow are painted over their trace, as for the route (`MapsRender.draw` `legs`, `overRoute`):
  - the SID from the **threshold** of the chosen runway, the STAR and the approach to the threshold; the leg between the aerodrome
    and its threshold is not drawn; **`phase` `trans` (transition) and the missed approach are dashed**;
  - a **leg without a fix** (VA, CA, VM, FM: `lat` and `lon` null) is a 2 NM stroke along its course (`crs`, taken as the true
    course: the error over 2 NM is a few tenths of a NM), then a dashed line to the next point; never an invented point;
  - an **RF leg** with `arc { centre, radius }` is an arc (centre and end points projected, left or right by `turn`, else the shorter
    one); without `arc`, a segment;
  - **join with the route**: when the SID's last point (or its transition's) is a route point, the leg aerodrome → that point is
    the SID's alone (the route does not draw it again: the route is drawn only between its consecutive points of the path); when
    it is not, the SID ends at its last point and a **dashed direct** goes to the first route point; the arrival is symmetric (a
    dashed direct from the last route point to the STAR's first, or the STAR's own leg when the route point is one of its fixes);
  - **labels** (sixth reading, gap 5): the procedure's name as the choose pane and Fuel write it — `displayName` / `labelOf` of
    `frame/lib/procedures.js`: « AMOLO 7A », « AMB 9E », a final by its short label « ILS 06 », a transition by its transition —
    never the base's raw name (« ILS CAT I or CAT II or CAT III RWY 06 ») nor a kind before it (its hue says the family; the
    aerodrome's card, a list, keeps « SID AMOLO 7A »); a procedure label of the collision pass (rank 4) that slides along its
    trace — the middle of its longest leg, then along it and along the other legs, the longest first — and is forced at the first
    place only when none is free (never lost); the state of the source follows: "· X-Plane, local" (status `xplane`),
    "· Little Navmap, local" (`lnm`), "· outdated" (a hand-read file whose cycle is past); the texts are in `texts.js`;
  - **names, fixes and constraints by zoom thresholds** of the tuning page (§ 14; user, 29 Oct: "ils disparaissent trop tôt en zoom arrière"): `procNames` (the procedures' names, [0, 24] to start: every scale) and `procCons` (their fixes and constraints, [6.25, 24]: from the regional view, about 110 px per degree); the names have a fallback anchor (the middle of the longest leg of the procedure's fixes, its threshold included when it has fewer than two) and all procedure labels are painted last, over the airway boxes (`MapsRender.draw` `top`);
  - **the runways as threshold vectors** (V3 § 10.30, replacing the full-length arrow of § 10.24, "pas convaincante", hidden by its
    label; `procs.js` `runwayArrows`, `arrowOf`, `drawRunways`): every runway of the departure and arrival aerodromes (read with
    the flight even without a chosen procedure) is a **24 px screen vector** (never geographic) from its threshold along its
    **true** bearing — `runwayAxis` of `frame/lib/wind.js`, the one rule shared with Fuel: the record's `true`, else threshold to
    opposite threshold, else `qfu` + the aerodrome's `magVar`, else the number × 10 + `magVar` —, a small head at its end, the
    designator at its tail, behind the threshold (never on the vector); the runway of
    `route.procedures` bold in its side's hue (SID; approach, else STAR), the others thin and muted. Only from the airline's
    `runwayZoom` (`airline/map_profiles.json`, integer 8 to 16, 11 by default; read once with the profiles, `readSettings`, which
    holds the only default; redrawn on the watch of that file), compared with the real zoom of the view (`MapsRender.zoomOf`);
    below it nothing is drawn. The tuning page's `procRwy` threshold is gone. From the same zoom, every aerodrome drawn (`S.adHits`
    of the last drawing) has its runways read on demand and drawn thin with their numbers. **One store** (refactor R-M4):
    `S.runways`, a Map ICAO → records of `aerodb.runways` (`undefined` while asked, `[]` when none), filled by **one path**,
    `wantRunways(icaos)` (one batch per call, the map redrawn when it arrives): the departure and arrival with the flight
    (`loadProcs`), the aerodromes drawn from `runwayZoom` (`wantDrawnRunways`); the aerodrome's `magVar` comes from its record
    (the drawn aerodromes, else the data read); `arrowOf(toC, rw, list, magVar, col)` has no side (`runwayArrows` tags the
    departure's and arrival's own);
    the vectors and numbers are painted by the screen's `runways(ctx, pl)` callback right after the aerodromes, in the one
    collision pass with the aerodromes' priority (a number without room is not written, its vector stays); the aerodromes'
    labels read code and name (`adName`: `adTitle` of `frame/lib/adnames.js`, "LFPO Paris-Orly", the name rule of § 10.27 shared with Fuel). In the choose mode every runway of the aerodrome is a vector, the one in force
    bold; while the Map is dimmed the airway boxes go under the dim veil (`render.js`: `airwayOver` before `dim`), so the
    mode's traces, vectors and labels are above every label of the base;
  - **constraints**, as on the AIP charts, written after the fix's name: altitude **underlined** = at or above
    (`min`), **overlined** = at or below (`max`), both = exactly (`at`), "5000–7000" for `between` (the lower underlined, the higher
    overlined), "≤ 220 kt" for the speed; altitudes as `formatLevel` writes them (FL from the transition altitude, else the feet).
    They are reserved in the placer **after** the route's labels (a label without room is not written); fixes are dotted
    from the same zoom;
  - **not chosen = not drawn**: the Layers content has no box for the procedures.
  The aerodrome's card (§ 16) shows the choice with a "Change" button to `#fuel?focus=arr` (`dep` for the departure).
- **The common cursor** on the map: a blue ring (`--sog-accent`); a tap within 32 px of the route sets it to the nearest
  profile sample (§ 8.4).

### 5.1 Choosing on the map (`choose.js`; V3_SPECIFICATION § 10.23, § 10.30)

Fuel's "Sur la carte" button opens `#maps?choose=dep|arr&icao=LFXX`. The Map reads the request at mount with `ctx.consume('choose',
'icao')` (the address becomes `#maps`) and, with a flight and an aerodrome, shows the **choose mode** (`S.choose`): nothing else
of the Map is offered (the buttons but "Recentre" are hidden, the sheet's content is the list), a mission map or the tuning page never
enters it.

- **It starts on the map** (sixth reading, 31 Oct 2026, gap 6): at entry, before any touch, the aerodrome is framed at the centre
  (the model's frame made symmetric around it: an arrival's procedures come from one side, the aerodrome does not stay at the edge)
  and the candidates of the first family not chosen are drawn — the runways with their numbers, then, while only runways are
  touched, the compatible procedures of the next family (SID at departure, STAR at arrival), faded and without cartouches, as
  « N others ». A faded trace is a trace like the others: touching it chooses it as its row would, and its row is marked (one
  writer, the choice's state); the gesture of § 10.23 is unchanged (a row or a trace chooses, the selection adds up, hovering
  highlights); nothing is written before « Done ». The sheet is half the view at most (§ 7.1).

The **second entry** is the aerodrome card of the departure or the arrival (ergonomics, 29 Oct 2026: the user did not find the
entry on a phone): next to "Changer" (→ `#fuel?focus=<side>`), "Choisir sur la carte" (`[data-choose]`, full width under 768 px)
runs `chooseOpen(side, icao)`, the same code path as the address without a reload: the card is released, the mode loads, the
view fits the procedures (`frameFlight`). Closing the pane from there with nothing chosen gives back the flight and its frame (`chooseClose`, its branch without a key:
`applyFlight`, then `frameFlight`).

**"Source"** (V3 § 10.25): each chosen procedure of the side (SID; STAR and APP) whose record carries an `https://` `source.url`
(aerodb, the SIA's eAIP page) gets a link "Source" in its row (`a.mp-ad-src`, new tab, `rel="noopener noreferrer"`; "Source STAR"
/ "Source APP" when both have one); any other address is never a link. A record without a public page (EAD, OCR, manual) has
none, its document's name (`source.file`, else `ref`, `name`) in the row's `title`.

- **What is read**: `aerodb.procedures(icao)` (the published records; never a doubt record: `PR.isDoubt`, status `doubt`, no
  name or `NONAME`, the rule of Fuel's lists), `aerodb.runways(icao)`, `aerodb.aerodromes({ icao })` (the axis, when nothing else
  names a runway), the flight's `route.procedures` through `proceduresOf`, and the aerodrome's METAR already known to the suite
  (`ctx.weather.metar([icao], { cacheOnly: true })`: nothing is asked to the network). Every rule is `frame/lib/procedures.js`
  (`runwayChoices`, `appChoices`, `transitionsOf`, `orderProcedures`, `conflictsOf`, `servesRwy`, `nameOf`, `runwayOf`,
  `firstServing`) and the wind `frame/lib/wind.js` (`components`): the mode only displays.
- **One pane, the whole side at once** (§ 10.30, replacing one family per trip): the groups of the side in its order —
  departure `rwy`, `sid`; arrival `rwy`, `star`, `app`, then `appTrans` folded under the approach when the approach in force has
  transitions. Each group: **"Aucune" first**, the rows in `orderProcedures` order on the choice in force (compatible first, then
  ⚠), **seven rows at most** ("Aucune" and six), the rest folded under "N more…" which unfolds it in place (a row highlighted from
  the map unfolds its group); the sheet is the only surface that scrolls, no list scrolls by itself (never two scrollbars); then
  "Terminer" (full width).
- **The selection adds up**: a tap on a row, a label or a trace (the nearest within 14 px) sets that family's choice in `S.choose.sel`
  (absent = untouched, `null` = "Aucune", else the id; the runway without "RW"); the choice in force is the flight's with the pane's
  over it. Nothing is written and the address does not change until the pane is closed. A procedure that serves one runway
  (`runwayOf`) sets it when none is in force; another approach puts its transition back to "Aucune" when the old one does not
  follow it.
- **Second reading** (§ 10.30, 30 Oct, the user after af261d3e3: "en trois clics … qu'on ne voie que les compatibles … condenser"):
  the three lists are always visible, any order; each group shows only the rows compatible with the choice in force
  (`PR.compatible(list, { rwy, sid, star, app }, byId)`, the chosen row always), six at most, the rest folded under one thin
  line "N more · All" (`.mp-ch-fold`, toggles; unfolded rows that do not fit carry ⚠, "does not fit the choice" when no
  runway conflict says why). SID / STAR records differing only by their runway suffix are one row (`PR.familiesOf`, id
  `fam:<name>`, its runways as `.mp-ch-tag`): a tap with a runway in force resolves the record (`PR.firstServing`), without
  one it sets `S.choose.pend[fam]` (the runway list narrows to the family's runways; a runway tap resolves it; no key is
  returned for an unresolved family). The chosen approach's transitions are sub-rows under it ("No transition" first; key
  `apptrans`). Rows are 36 px, no gap; the group headers thin labels. The selection reads at the top of the pane, one line per
  family (`PR.summaryOf`, the text Fuel shows), each with ✕ setting that family to "Aucune".
- **Third reading** (§ 10.30, 30 Oct): the highlighted procedure (hovered, touched or chosen) is drawn last, over every trace and
  label of the mode, with its own label and its full name (placed first); the other traces, from below, ⌛, ⚠, compatible,
  chosen. One small faded label per family and point, under the family's name ("NIMER 9", `familyOf`: stem, space, digit), the
  families meeting at a point stacked one line each; a label without room is left out (its trace stays). Hovering any row of
  any family highlights its trace and label (drawn even outside the family touched last), leaving it gives the previous state
  back; a tap chooses and leaves the row highlighted; hovering a trace highlights its row (unfolded and scrolled into view).
  Runway rows: the wind text of `wind.label` (↓ head, ↑ tail, ← wind from the right, → from the left) coloured by
  `wind.severity` (ok, warn, alert: the design's green, orange, red), the reason in the row's title. The summary at the top is
  the pane's table of contents: three lines always ("—" when not chosen), a tap on a family's label scrolls to its group and
  unfolds it, ✕ (chosen families only) clears.
- **Approaches** (§ 10.30 fourth reading): the rows are the finals (`appChoices(apps).list`) by `labelOf(app, list)` ("ILS 06",
  unique within the list), the published name in the row's title; the sub-rows of the chosen final are `transitionsOf(id)`,
  the SIA's initial segments ("INA … RWY 06", shared by every final of the runway) among them, by `transitionLabelOf` ("via
  ODILO 1A" when the name starts with the IAF, else "via ABC1 · ABC 1A"), in the final's hue; a chosen transition sharing no point with its final is joined to the final's first
  point by a dashed line (`join`).
- **Towards your route** (§ 10.31): a second axis beside the runway for SIDs and STARs — among the rows that fit the choice, those
  whose exit (SID, `exitOf`) or entry (STAR, `entryOf`) is on the typed route (`compatible({ …, route })`, the ids of
  `route.points`) come first under a thin label "Towards your route" ×4 (only when other rows follow), the others after, marked
  "exit LACOU" / "entry OKRIX" ×4; what does not fit stays folded under "N more · All".
- **Runway and procedure correct each other** (one line under the procedure's group, one tap, never silently): the procedure just
  chosen serves one other runway → "OPAL2E sert la 25 — Passer en 25"; otherwise (the runway changed, or the procedure serves
  several) → "OKRIX5A ne sert pas la 07 — Choisir OKRIX5B", the first of the group that serves it (`firstServing`); the row keeps ⚠.
- **Wind on every runway row**: `components(true bearing, METAR wdir, wspd)` → "↑ 12 kt · ← 6 kt" (↑ head, ↓ tail, orange above
  5 kt of tail; the arrows say where the wind comes from, `label` of `frame/lib/wind.js`, the text Fuel prints too); the true bearing is `runwayAxis` of `frame/lib/wind.js`; no METAR, a variable wind
  or no bearing → no wind, nothing invented. The crosswind limit of the aircraft sheet is not read yet.
- **Closing** ("Terminer", ✕, Escape: `chooseClose`, the one exit) returns once: `location.replace('#fuel?focus=<side>&rwy=25&star=ID&app=ID&
  apptrans=none')` — one key per family touched (`rwy`, `sid`, `star`, `app`, `apptrans`; `none` for "Aucune"), a key absent =
  that family untouched; nothing touched → `#fuel?focus=<side>`. Fuel consumes the keys together (`ctx.consume`), writes once and
  says what changed; the Map never writes. Giving up without handing anything back is the frame's "← Fuel".
- **View**: `S.fit` (`viewOf`) is the box of the side's runways and procedures and the aerodrome (3 NM margin); the base map's box
  takes the class `mp-choosing` (opacity), and `MapsRender.draw({ dim })` fades every Map layer, the route's and the airspaces'
  included, by `DIM` (.6) before the screen paints its own (the `dim` layer, between `route` and `screenTraces`); the flight's own
  procedures, runway arrows, VFR points, winds, TOC / TOD and position are not drawn.
- **Map, the selection in force**: every runway (`arrowOf`, `drawRunways`; the one in force bold); the **family touched last**
  (`S.choose.focus`; at opening the first the flight lacks) drawn whole, its other procedures dimmed as soon as one is chosen; the
  procedure chosen in each other family in its hue; the chosen approach transition dashed; the transitions of the highlighted
  procedure dashed. **One label per exit point (SID) or entry point (STAR, approach)** stacking the names that meet there,
  reserved in the placer and kept inside the map.
- **Hues**: one per procedure, `MapsRender.palette(dark).procHues` (eight, cycled by the procedure's rank in its group), the same on
  the row, the label and the trace. ⌛ (grey, symbol only) = read under an earlier cycle; ⚠ (orange) = `conflictsOf`, the reason in
  the row's `title`.
- Texts `TX.ch*` (×4); help anchor `maps-choose`; cases D60, D62.
- **Target form (refactor R-M1, § 10.33; no change of behaviour).** The pane's whole meaning is one pure function of the frame,
  `paneModel(input, state)` in `frame/lib/pane_model.js` (no DOM, no translation, no Map state), with its bench
  `frame/lib/test/pane_model.html`:
  - `input` — read once when the mode opens, never changed: `{ side, icao, records, runways, ad, at, cur, route, wind }`:
    the aerodrome's procedure records (doubtful ones already out), its runway records, its aerodrome record (`magVar`, axis),
    its position, the flight's choice for the side (`route.procedures` v2 through `proceduresOf`), the flight's route points
    (`[{ id, lat, lon }]`, the other aerodrome's position included) and the METAR wind `{ dir, kt }` or null;
  - `state` — the only state of the pane, `{ sel, pend, open, hl }`: `sel` the families touched in the pane (absent = the
    flight's, `null` = "None", else the id; the runway without "RW"), `pend` the SID / STAR family put before its runway
    (`{ sid?: name, star?: name }`), `open` `{ focus, more: { [family]: true } }` (the family in front and the groups unfolded),
    `hl` the highlighted row id or null;
  - result `{ choice, groups, subs, summary, focus, frame }`: `choice` the choice in force (`cur` overlaid by `sel`); `groups`
    per family of the side (`rwy`, `sid` | `star`, `app`) `{ rows, shown, folded, head, fix }` — `rows` every row
    `{ id, fam, rec, members?, family?, hi, label: { kind, … }, tags, chosen, why: [codes], off: code | null,
    dir: { deg, off } | null, wind: { k, sev } | null, old, pts, anchor }`, `shown` the ids shown (compatible first, then on
    the route or towards the other aerodrome, six at most unless `more`), `folded` how many are folded, `head` the sub-heading
    code (`toRoute` / `{ toward: icao }` / null), `fix` the correction line as data (`{ kind: 'serves' | 'notServes', p, r,
    fam, val }`); `subs` the transitions under the chosen approach (compatible with the chosen STAR); `summary` the three
    lines as data (`PR.summaryOf`, the pending family with its runways); `frame` the points to frame (aerodrome, runways,
    compatible points within 40 NM, chosen procedures whole). Every text is a code: `choose.js` writes it with `TX.ch*`.
  - `choose.js` keeps only `S.choose = { side, icao, fromCard, input, state, model }`: `input` loaded once (`chooseLoad`),
    `state` changed by the gestures (`choosePick`, the fold, the highlight, ✕ of the summary), `model` = `paneModel(input,
    state)` recomputed only when `sel`, `pend` or `open` change (the highlight does not recompute it); it renders the pane's
    HTML and the map's layout (`chooseLayout`, its hit boxes per drawing) from `model`, nothing else.
  - **One exit**, `chooseClose()` (Done, ✕, Escape): the keys of `sel` (`#fuel?focus=<side>&rwy=…&star=…&app=…&apptrans=…`,
    `none` for "None") through `location.replace`; nothing touched: back to Fuel on that side, or, opened from the aerodrome
    card, back to the flight's map without a reload (its branch without a key; `chooseExit` and `chooseFinish` are gone).

## 6. Map contents

### 6.1 Map modes

Six modes, the current one kept in `cache/maps/ui.json` (`preset`); each has its own layers. Hidden for mission maps
and when there is no map.
- Auto (`wand-sparkles`, the flight's level: High IFR from FL195), Low IFR (`routeProfile(5000)`), High IFR
  (`routeProfile(30000)`), VFR (`map`, the studio's `vfr-detail` profile on `liberty`, plus beacons and `vfrDensity`; its
  families from the layers: TMA / CTR and D / R / P whole), Topo (`liberty` with a hillshade of the Terrarium tiles drawn in
  CSS, contour lines on the canvas, aerodromes, towns and close-up obstacles only), CAM / OAT (red `plane`: the flight
  level's IFR plus refuelling and NAT tracks, R / D / P, TSA / TRA / CBA and the low-flying network at all levels, state
  aerodromes).
- Colours: the accent for the choice, `--sog-err` for CAM; corners from `--sog-radius`.

### 6.2 Obstacles

The studio's symbols, grouped on screen (the highest represents its group), without their label; in a close view (300 px
per degree and more), "434 AGL (771)" beside the symbol — height above ground, top elevation in brackets — where there is
room.

### 6.3 Refuelling and NAT tracks

Layers "Air refuelling tracks (AAR)" and "NAT tracks" (`aarTracks`, `natTracks` elements), on by default in CAM only and
on mission maps whose profile asks for them; read after the zones of the view from `aerodb.aarTracks()` and
`aerodb.natTracks()` (INTEGRATION § 3). Racetrack dashed dark green with a light tint, outbound leg IP → CP as an arrow,
the track's name beside it; heavy tracks as their two arrowed legs; NAT tracks dashed slate through their points,
"NAT A FL350–400" at the first point.

### 6.4 Winds aloft

Layer "Winds aloft", on by default, not on mission maps: from `route.points[].wind` (`{ dirDeg, kt, tempC, levelFt, at }`),
a barb at each point that has one and every 50 NM between two such points, interpolated by components (temperature
linearly). Staff 30 px towards where the wind comes from, feathers on the low-pressure side (left with the wind at one's
back in the northern hemisphere, right in the southern): pennant 50 kt, barb 10 kt, half barb 5 kt, a circle under 3 kt,
a 5 px background edge under it. Tooltip: "Wind 290° / 65 kt", then temperature, level and forecast hour.

### 6.5 Towns

The towns of aerodb by size (`citiesBig` 200,000 and more, `citiesMid` 30,000, `citiesSmall`), each within its zoom
range; the base map's own names hidden while ours are drawn (§ 5).

### 6.6 Zoom thresholds and the effective zoom

- Every element of a flight map has a range of MapLibre zoom (512 px tiles; `zoomOf(px per degree)`, `pxOfZoom(z)`) in
  which it is shown, per mode: `profile.elements.zoom = { key: [min, max] }` (max 24: no upper limit; a key without a
  range is always shown). Keys (`ZOOM_KEYS`): `asFir` (FIR, UIR, UTA, LTA, OCA, FRA), `asTma`, `asCta`, `asCtr`, `asR`,
  `asD`, `asP`, `asTsa` (TSA, TRA, CBA), `asOther`; `zoneLabels`; `awLow`, `awHigh`, `awLabels` (segment distance and
  tracks); `navaids`, `fixes`, `vrp`, `obstacles`, `mora`; `citiesBig`, `citiesMid`, `citiesSmall`; `graticule`, `aar`,
  `nat`, `wind`, `contours`.
- `atZoom(profile, z)` cuts the elements out of their range; `byZoom(data, profile, z, tier)` keeps the data shown
  (families, beacons, VRP, obstacles, MORA, towns); from afar (tier far) only the large aerodromes. Mission maps are not
  concerned.
- **The effective zoom** compared with the thresholds: the view's zoom, shifted by one level per step of the Complexity
  slider (`MapsRender.detailZoom(step)`, `DETAIL_ZOOM = 1`, `DETAIL_MAX = 4`, steps −4 to +4, clamped), then corrected by
  the size of the map frame: `effectiveZoom(zoom, w, h) = zoom + log2(((w + h) / 2) / 900)` (`FRAME_REF_PX = 900`). The
  one function serves the ranges, the VRP layer, labels, contour lines, the towns' place-name switch and the density tier.
  What needs real room stays in raw pixels per degree: obstacle heights, ETA labels, the "everything in the view is read"
  switch, the overview rule.
- **The Complexity slider is a zoom shift and nothing else**; what each zoom shows is the administrator's (§ 14). The step
  is kept per mode on the device (`layers[mode].detail`; an older value is clamped).
- **Starting values** (`ZOOM_IFR`, `ZOOM_VFR`): in IFR (Auto, Low, High IFR, CAM) the overview shows the route, the winds,
  the aerodromes and the shapes of TMA, CTA, R and TSA / TRA; CTR, D and airspace names from 4.75, airways from 5, P from
  5.25, other airspaces and MORA from 5.5, beacons and airway points from 5.75, segment labels from 7.75, obstacles from
  8.5, VRP from 9.25, medium towns from 6.5, small towns from 8.5, contours from 9. In VFR and Topo: FIR up to 7, TMA and
  CTA from 6, R, D and TSA from 6.5, CTR from 7, P from 7.5, others from 8, names from 6.
- **Precedence**: the built-in values, then the airline's (`airline/map_profiles.json`), then the device's
  (`layers[mode].zoom`), then the values being tuned (`#maps?tune=1`).
- **A mode the airline never tuned follows a tuned one** (`repoZoom`): the ranges of a mode with no `elements.zoom` of its
  own come from another mode of its family (IFR: Auto, Low, High, CAM; VFR: VFR, Topo), then, for an IFR mode only, from
  the VFR family; only the ranges are inherited, the boxes stay per mode.
- The map element states the effective zoom and what the thresholds kept (`data-zoom-eff`, `data-kept`, § 18).

### 6.7 The Layers content

Opened in the sheet by the Layers button (`openData('layers', …)`, § 7.4), not as a panel over the map; title "Layers ·
<flight summary>"; ✕ brings the profile back. In order:
1. **the Complexity slider**, first of all: label "Complexity", the value beside it and the slider on one 44 px line
   (block ≤ 56 px at 390 px); the help sentence (four languages: it acts as if the zoom were different, what each zoom shows
   is set by the administrator) is the label's tooltip and the slider's `aria-describedby`, out of the page;
2. **the layer boxes**, a grid of two columns on a phone: airspace families (TMA / CTR: TMA, CTR, CTA, TMZ, RMZ; D / R /
   P: R, D, P, TRA, TSA, CBA, PJE, TRVL, TRPVL, ZIT; FIR: FIR, UIR, UTA, LTA, OCA, FRA; others: every other type present),
   airspace names, lower and upper airways, airway names, beacons, airway points, VRP, obstacles, MORA, towns, graticule,
   alternate, AAR, NAT, winds aloft, contour lines, aerodrome procedures (§ 6.11; only when aerodb can say the coverage);
   "Reset all"; "Around the flight only (faster)" heads the content (above Complexity, sub-label "otherwise the whole
   view");
3. **the flight selector**, last (rarely used): a `select` "Planned flight" with every mission of the repository, and for a
   mission with two maps or more a second `select` with its maps (description, else file name); choosing changes the
   address (`#maps?mission=<ID>&map=<file>`), the frame mounts the module again. On a mission map the content holds only
   the selector.
- Defaults come from the mode's profile (a family is on when the profile names one of its types) and the airline's
  `profiles[mode].layers`; the device's choices are kept per mode in `cache/maps/ui.json`, only where they differ from the
  defaults; "Reset all" removes them.
- **Around the flight only** (30 Oct 2026): on by default when the mode's profile has a corridor (IFR), off in VFR; ticked,
  the pane title ends "· around the flight" and the "i" chip says nothing is read outside the corridor; unticked, the whole
  view is read (complexity filters by class and size, never by place), except a view wider than `WIDE_NM` = 600 NM where
  the corridor is imposed (`corridorFor`, said in the chip).
- The effective profile (`effectiveProfile()`) is the mode's with the layers applied: elements, `zones` (whole
  families), `otherZones`, `corridorNm`.
- The content is one element the module keeps (the boxes keep their focus between two writes).

### 6.8 Live view

Every write of the flight file redraws the map and the profile (debounced 300 ms, `performance.mark('maps:live')`) if
its `updated_at` is newer than the version shown (an earlier write of the module's own, coming back after newer gestures,
is ignored); no zone is read again unless the data area changes; a write that changes only the progress (same points,
level and start) redraws without reading the zones nor building the profile again. `aerodb.on('change')` with a zone or a
changed file reads the data again (an `aircraft` change is ignored).

### 6.9 Date line

A flight across the date line (UHMA 177.7° E → PAOM 165.4° W) runs from 177.7° to 194.6°. The route is unrolled first
(`frame/lib/geo.js`: `wrapLon`, `nearLon`, `unwrapLons`): distance marks, TOC / TOD, profile, cursor, ETA, barbs and
framing interpolate linearly in the unrolled longitude; written back the route is in [-180, 180[. MapLibre runs with world
copies (`startTiles({ worldCopies: true })`); the screen's projection takes a longitude to the copy nearest the view's
centre and shifts the route by one common number of turns; the plain background draws its own copies. aerodb boxes are cut
in two at 180°, relief tiles and MORA are read at the wrapped longitude, the weather cut asks atmosphere for the wrapped
points, a tap is wrapped before the airspace test, flat distances use `dLon`. Not handled: airspace polygons that
straddle 180°, a mission map across the line, the poles.

### 6.10 Contour lines

`contours.js`: marching squares on each Terrarium tile's elevation grid (a cell every 2 tile pixels), segments kept per
tile and interval, projected at each drawing; tile zoom from the view (8 to 12, 16 tiles at most); in memory only (48
tiles). Interval 500 ft (100 m when the pilot's `displayAlt` is metres), every fifth an index contour, thicker and
numbered. Drawn on the canvas under the aeronautical layer, in VFR and Topo, within the `contours` range and with the
"Contour lines" layer. Loaded on demand (`meta.lazy`).

### 6.11 The aerodrome procedures layer (`coverage.js`; V3_SPECIFICATION § 10.22)

A layer "Aerodrome procedures" colours the aerodrome pins by what the device can give of their procedures, as `aerodb.coverage(icao)`
says (`{ level: 'green' | 'orange' | 'red', reason, state, here, … }`, `null` for a malformed code; green carries `source`,
`outdated`, `counts { SID, STAR, APP }`). It is not part of the display profile (no element, no data re-read): a box of the
Layers content like the others, **off by default**, kept per mode on the device like the others, and **offered only when
`aerodb.coverage` exists** (else no box, nothing else changes). Never on a mission map.
- **The pins**: the aerodrome symbols already drawn (`SiaAero.drawAerodrome`, which takes `ad.cov { main, pale }`) are drawn in
  the design's `--sog-ok` / `--sog-warn` / `--sog-err` (green, orange, red; the drawing context's contrast rule keeps them
  readable by day and night; the pale fill is the colour mixed 25 % into the drawing's background) and their code label too. An
  aerodrome whose answer has not come yet, or whose code is malformed, keeps its usual colours. Only the aerodromes drawn inside
  the frame are asked.
- **Requests**: `covLevel(icao)` returns the cached level or nothing and queues the code; at the end of the drawing the queue
  leaves as one batch (`Promise.all` of `aerodb.coverage`), the answers are kept in `S.cov.cache` (one per code, for the page's life)
  and the map is drawn once more when the batch arrives. `aerodb.on('change')` with `coverage` or `refreshed` asks again every code
  known (one batch, the old answers staying in place until the new ones arrive, so the layer does not blink); an answer of a batch
  that left before the change is dropped.
- **Lit by its box only** (V3 § 10.29 h, the challenge of 29 Oct 2026, replacing the automatic lighting of 28 Oct): the layer "Coverage" ×4 is shown when its box is ticked (or by the airline's choice), never by itself.
- **Legend**: while the layer is shown, the "i" panel of the profile gets three rows after the profile's own (pin in the level's
  colour, then "Aerodrome whose procedures are held" / "… are partly read or read on demand" / "Aerodrome with no readable procedure");
  the chip is enabled by them even if the profile has no other row.
- **The pinned aerodrome's card** (§ 16), always when `aerodb.coverage` exists (the card is already a detail view), after the
  runway / procedure rows: a pin in the level's colour, the level in bold ("Procedures: held" / "readable on demand" / "none"),
  then " · the reason" (`AeroCatalogue.COVERAGE[reason]`, four languages, read from `aerodb.sources()`; absent: the level alone),
  " · outdated" and, for green, " · SID n · STAR n · APP n". Partly read (orange, reason `partial`, V3 § 10.26: procedures held,
  part not read): the level "Procedures: partly held", the reason, " · n pages not read" and " · n records to check" (from
  `partial { pages, doubt }`, a zero left out, singular or plural), then the counts as for green. The card is made again when the
  answer, or the texts, arrive.

## 7. The sheet

The data block under the map is the frame's sheet primitive (`frame/lib/sheet.js`, frame INTEGRATION § 11). It holds one
content at a time: the vertical profile (default), the weather cut, the Layers content, the airspaces at a point, an
aerodrome's VFR reporting points. A content replaces the profile while open; closing it brings the profile back, redrawn
to its size. A new content replaces the open one; opening the airspaces list releases a pinned aerodrome.

### 7.1 Positions

- **Portrait**: collapsed (the head line only), default and expanded, the frame's tokens (`--f-sheet-head`, `-default`,
  `-default-min`, `-expanded`, `-expanded-min`) read from the root; the module has no value of its own. At 390 × 844 (view
  730 px) the sheet is 45 / 219 / 511 px and the map 685 / 511 / 219 px.
- **The height of what it shows** (sixth reading, 31 Oct 2026): in portrait the sheet is never taller than what it shows nor
  than half the view (the root's height); the map takes the rest; no blank under the content, at 1280 as at 390. A drawing
  (profile, weather cut) fills the body at every position, with no maximum height of its own, the expanded position being half
  the view; a content (Layers, airspaces at a point, aerodrome, the choose pane) makes the expanded position its head plus its
  content's own height, capped at half, and the default position the smaller of the frame's default and that. `sheetFit()`
  (`sheet_view.js`) writes `--f-sheet-default`, `-default-min`, `-expanded`, `-expanded-min` on the root in pixels, only when they
  change: after a content is built or closed, after the profile is drawn, at every settle. The choose mode opens the sheet
  expanded and gives the position it found back at its exit (§ 5.1).
- **Landscape** (`html.f-land`): a right column with two positions, default and expanded (`--f-sheet-side`, `-side-min`,
  `-side-max`), its head at the top as the title row; the height rule above does not apply.
- The drag, the flick, the glide, the keyboard and the ARIA are the primitive's; the position is kept while the page lives
  (`sheetKeep`, through `onChange`), not on the device. A content opened while the sheet is collapsed opens it to the
  default position, without sliding; the weather chip or the "i" chip on a collapsed sheet does the same.

### 7.2 The head

- **Over a drawing (profile, weather cut) at the default position the head is bare** (`.f-sheet-head-bare`, 28 px): the
  grip bar, then at its right the three chips (§ 7.3), the "Whole flight" text button when the window is tight (§ 8.6), no
  title; the grip's `title` / `aria-label` says "Vertical profile" or "Weather cross-section", then the flight summary, then
  the height hint.
- **Expanded, collapsed, in the landscape column, and for every content that is not a drawing** the head carries its
  title (one line, ellipsed, `label` the full text for the tooltip and the reader), the chips at its right in the same
  row for a drawing, the ✕ for a content (Layers, airspaces, aerodrome); the Layers chip first, left of the grip, always.
- Title over a drawing: "Profile · FL065 · 427 NM · planned flight" (or "flight in progress"; a mission map: "Profile ·
  I-001A · title · map"), "Weather · FL065 · …"; tooltip: the whole summary ("Vertical profile · LFRS → LFML · alternate
  LFMT · FL065 · 427 NM · C30J · planned flight"). A content's own title: "n airspaces at this point", "LFMN: VFR
  reporting points", "Layers · <summary>".
- **One distance** (sixth reading, 31 Oct 2026, gap 3): the distance of the title (and of its tooltip) is the flown path's —
  the route with its chosen procedures, the last `nm` of `flownPath(expandedPath(flight, procedures))` of
  `frame/lib/current_flight.js` — the one Fuel shows (« procedures included ») and the profile's axis ends on; the title is
  written again whenever the path changes (`afterPath`: the procedures read after the first drawing), never left on the route
  alone. A distance typed by hand in Fuel (`route.manual`) is Fuel's own; the Map measures the path.
- Bare or titled switches only in `onChange` / `onSettle` (a position reached, a rotation), never during a drag. Texts are
  written only when they change.
- The head's buttons (chips, ✕, "Whole flight") are in the primitive's `ignore` list: they never start a drag.

### 7.3 The three chips: Profile · Weather · "i"

- **Always three**, in that order, in the head row at its right (bare head: 28 px chips with the primitive's 44 px touch
  zone; titled head: in the row, 40 px), icons `chart` / `cloud` / "i" with a hairline and the accent when pressed,
  `aria-pressed`, their names in `title` / `aria-label` ("Vertical profile", "Weather cross-section", "Legend", four
  languages). The drawing takes the whole width and the whole height under the head.
- A chip with nothing to show is `disabled` + `aria-disabled` and muted, **never hidden nor removed**: Profile without a
  profile (fewer than two route points), Weather when the cut cannot be drawn (a mission map, no route), "i" while the
  drawing has no legend. They are written only when their state changes.
- Profile and Weather choose the drawing; the choice is kept for the life of the page (also across a content opened and
  closed in between), not on the device, and not replayed on a sheet that comes back collapsed. The cut has no ✕: the
  Profile chip or Escape brings the profile back.
- **"i"** opens the **legend** over the drawing: a translucent panel on the drawing's surface, closed by the chip, a tap
  on it or Escape. Its rows are the series actually drawn, each with its symbol and name in four languages, produced by
  the drawing code: for the profile `geo.drawn` of `vertical_profile.js` (planned path, TOC / TOD, relief or MORA, the
  airspace types crossed with their colours, route points) plus what the sheet adds (NM marks, airway points); for the cut
  atmosphere's `sectionLegend()` (§ 9); the aerodrome procedures layer adds one row per level while it is shown (§ 6.11). One column; the expanded sheet shows it whole, the default sheet scrolls it.

### 7.4 Contents API

`openData(kind, key, title, build, label = title)`, `closeData()`, `endData(kind)` (INTEGRATION § 6): `kind` `layers`,
`lv` (airspaces), `ad` (aerodrome), `weather`; a new key opens fresh (scrolled to the top), the same key redraws and
keeps the scroll; `build(w, h, el)` returns HTML (written only if changed) or draws into `el`.

### 7.5 The map follows, once

While a finger drags the sheet, and while it glides, the map box changes size and **nothing is redrawn or resized**: the
MapLibre canvas and the overlay keep their bitmap, the strip the box shows when it grows has the map style's background
colour (`--mp-base`). When the size has stopped (the end of the glide, a rotation, a pane resized, full screen) the sheet's
`onSettle` runs `mapSize()`, sizes the overlay, sets the map's bottom inset (`setBottomInset`: the part of the box the sheet
covers, so MapLibre's controls stay above it), frames the route again if the user has not moved the map, and redraws the
profile and the cut. One `ResizeObserver` (the root, the map box, the sheet's body, the profile frame) only calls
`sheet.settle()`.

### 7.6 Inside the sheet

- **At the default position the body holds the drawing alone**, at its exact height (§ 8.5, § 9).
- **Expanded**: the drawing filling what the strip under the profile (two lines, § 8.4) and the notes leave, at half the view
  (§ 7.1).
- **The notes** (two lines of `--sog-size-xs` at most, scrolling beyond), in this order: the progress line of a started
  flight (§ 13.2); what is missing (the base's state § 4, a mission's notes, a cycle different from aerodb's); what is
  only information (plain background, terrain unavailable). A note that must be seen at once is also a notification.
- Other contents scroll in the body (`overscroll-behavior: contain`).
- The sheet is absent when there is neither profile nor content.

### 7.7 Closing

✕, Escape, and for the airspaces list a tap on an empty spot of the map; a drag or the wheel on the map leave a content
open; the aerodrome's content stays until ✕, Escape or another aerodrome. Nothing scrolls the page.

## 8. The vertical profile (`profile.js`, `window.MapsProfile`)

### 8.1 Cut

`SiaProfile.build` (copy of the studio's code): 100 to 800 samples along the route; terrain is the highest point on the
line and 1 km either side; airspaces crossed are the sample intervals inside their rings. **Airspaces**: those of the route
profile's types along the route (2 NM boxes, leg by leg), without the floor and ceiling filter, without
`surfaceToCeiling` spaces; only those the planned trajectory enters are kept (all of them without a trajectory); limits
relative to the ground are raised by the terrain of each sample.

### 8.2 Trajectory

- The cut follows the **flown path** (§ 5, Procedures): the route and the chosen procedures, so its length is the path's, its
  NM marks and its cursor are on it, and the points of the procedures draw the line without being named under it.
- With fuel's **`profile.path` [{ nm, ft }]** (the planned vertical path under the procedures' constraints, written by fuel; a record
  last written by the map's Edit mode (`by: 'maps'`; the frame's `by: 'frame'` for the live position does not count) or a path that does not cover the cut's length to 3 NM or 3 % is stale and ignored): that path is
  drawn, the altitude of each sample read on its polyline; TOC and TOD are the first and last reach of its highest level.
- **Constraint steps**: at each flown point that carries an altitude constraint, a bar at that altitude on the profile, an arrow
  up (at or above), an arrow down (at or below), a dot (exactly) or a vertical bar (between two altitudes), the constraint written
  beside it in the AIP notation when 40 px are free; the legend says what is drawn.
- Without `profile.path`, with fuel's `profile` and a level, and a record written by fuel (`by` absent or `fuel`): linear climb from the
  departure's terrain to the level over `tocNm`, cruise, linear descent to the arrival's terrain over `todNm`.
- Otherwise (no `profile`, steps from `alt_ft`, or a record written by the map): `SiaProfile`'s own plan with fuel's rates
  if given, else 1,000 ft/min at 140 kt up and 800 ft/min at 160 kt down.
- TOC and TOD are the ends of the cruise.

### 8.3 Terrain unavailable

Offline, or the first tile refused: no terrain; the MORA of each 1° cell crossed (`aerodb.mora`) is drawn as a dashed
brown step line, and the notes say so.

### 8.4 Drawing and cursor

- `SiaProfile.draw`: axes in ft / FL, airspace bands and labels, terrain, points with their distances, trajectory with
  TOC / TOD and the cruise level; scale 0.78 under 500 px. Labels use `strictLabels`: the airspaces the trajectory enters
  first (then the widest), each label against its own band only, never over another label, TOC / TOD or the bottom 18 px;
  a label without room is not drawn and counts in "+n" at the top right. Then the NM marks of the map as ticks at the
  bottom, the airway points and beacons within 3 NM of the route (small triangle and id, at least 30 px apart, skipped
  where a label of a higher rank sits: the profile's collision pass, § 3), and the cursor on its own canvas (a vertical line and a dot at the planned
  altitude, `--sog-accent`).
- **Fit to the body**: the canvas is drawn at the body's exact height, the x axis always visible, nothing to scroll; level
  labels thin first (one in two under 160 px, one in four under 110 px, never two closer than 13 px, grid lines with them),
  the foot shrinks to one row when the points do not overlap (under 200 px), the airways' extra points go under a 90 px
  plot.
- **Common cursor**: a finger or the mouse on the profile sets the distance; a tap on the map within 32 px of the route
  sets it to the nearest sample; a drag on the weather cut too (§ 9). The map shows it as a blue ring.
- **The strip** (expanded only): distance (NM) · planned altitude · terrain or MORA · the airspaces under the cursor (type,
  name, limits, highest first), or "outside the airspaces shown"; empty without a cursor.
- **Tooltip of the profile**: the airspaces crossed at the cursor, two lines, 5 s after the finger is lifted.
- **API**: `build(points, { levelFt, profile, airspaces, elevation, mora })`, `draw(ctx, cut, { W, H, scale, window })` →
  geometry, `xOf(geo, s)`, `sOf(geo, x)`, `at(cut, s)`, `posAt(cut, s)`, `nearest(cut, toC, x, y, maxPx)`; distances in
  metres, altitudes in feet.

### 8.5 Window on the distance axis

`draw(…, { window: { from, to } })` in NM (none: the whole flight). Only that part is drawn; the vertical axis refits to
what is visible: the top follows the highest of relief, obstacles, airspaces' floors, trajectory and points' levels in the
window (margin 1,500 ft, rounded up to 1,000 ft, at least 2,500 ft), the bottom rises under the lowest visible relief and
trajectory when both are above 2,500 ft; distance marks take a round step (1, 2, 5, 10, 20, 25, 50, 100… NM) keeping two of
them 40 px apart; what lies outside is not drawn, bands, terrain and trajectory are clipped. `geo.drawn` and `geo.taken`
say what was drawn; `geo.w0`, `geo.w1` (metres) and `geo.zoomed` say the window, and `xOf` / `sOf` read them; `at`,
`project`, `nearest`, `posAt` work along the route and do not depend on the window.

### 8.6 The gesture

`lib/axis_window.js`, written once for the profile and the cut: two fingers pinch to zoom around their middle and slide to
move the window (at least 5 NM visible, never outside the flight); a double tap or double click goes back to the whole
flight; **one finger is never taken**: it is the reading cursor. On a screen: Ctrl + wheel zooms around the pointer (the
wheel alone stays the page's), a mouse drag moves the window when it is tight (whole, the drag is the cursor's), a click
places the cursor. Disarmed in Edit mode and while another content is open. A finger left after a pinch does not move the
cursor until all fingers are up.
- **One window per route** for the profile and the cut (two helpers, one per container, handing each other the window;
  the profile's is the source); kept for the life of the page with the route's signature (the points' ids and
  positions), reset when the points differ, never stored. The profile and the cut each refit their own height (two
  drawings, two data): their vertical scales may differ.
- The head shows the text button **"Whole flight"** (four languages; 28 px with a 44 px zone in the bare head, 44 px in
  the titled one) only while the window is tight and a drawing is shown; it resets the window. A sheet drag neither changes
  the window nor redraws under the finger.

## 9. The weather cross-section

- Drawn by atmosphere's pure renderer `drawSection` (INTEGRATION § 8) against the flight's level, at the body's exact
  size (`minHeight: 0`, no padding, no box of its own), with the shared cursor and the shared window. The data come from the
  frame's weather layer `ctx.weather` (frame INTEGRATION § 14), cache only: what is already kept for this flight (same route
  points, level, model and days); the map never asks Open-Meteo and writes no weather file. Departure time: `started.at` if
  started, else `planned_at`, else now.
- Atmosphere's files are loaded at the first "Weather" (`meta.lazy`), not at mount; the model is computed once per flight
  and passed.
- A drag on the cut moves the common cursor like the profile (pointer events with capture, one redraw per animation
  frame, `geo.nmOf`; `touch-action: none` on its body); a tap places the cursor and opens nothing.
- Redrawn when the sheet settles, the design or the night tone changes, the cursor or the window moves, the flight changes.
- **Legend**: `sectionLegend({ kind: 'cut', layers, strips, cloudRgb, t })` with the `layers` passed to the drawing
  (`WX_LAYERS`) and the `strips` the drawing returned (`geo.strips`, `geo.layers`); each row's SVG placed as is
  (`.mp-lg-svg`, `data-key`).
- **Without a forecast**: one 44 px line "No forecast for <DEP> → <ARR>: open Weather" (four languages; the plain words
  when departure or arrival is unknown) with a link to `#atmosphere`; atmosphere's files not loadable (offline, never
  cached): one muted line says so.

## 10. Airspaces at a point

- **Opening**: a tap or a click on the map, when no barb nor airway box is under the finger (an airspace label does not
  count), opens the list in the sheet if at least one airspace is there (`MapsRender.airspacesAround(list, lat, lon,
  data.flat)`); another tap replaces it; ✕, Escape or a tap on an empty spot close it.
- **Title**: "1 airspace at this point" / "n airspaces at this point", n after the `surfaceToCeiling` filter.
- **Order**: `sortAirspacesTopDown`: ceiling descending (UNL first), then floor descending (ASFC counted from 0), then the
  name; an unreadable ceiling is ranked as if the ceiling were its floor, after the known ceilings of the same value; an
  unreadable floor counts as 0. Number 1 is the highest, at the top of the list and in the leftmost column.
- **The graph** (`levelsHtml(list, w, h)`, scale 1): altitude axis from SFC to the highest finite ceiling with a nice step,
  "UNL" above (66,000 ft and more counted as UNL); one numbered column per airspace from floor to ceiling, coloured by type
  as in the profile, ASFC counted from 0; an unreadable ceiling (or one under the floor) is a dotted column from the floor
  to the top marked "?", never the UNL column. Columns are 14 px at least, 22 px at most; the graph takes the width its
  columns ask for, at most 60 % of the body, except when the 14 px floor needs more (the floor wins). It stays at the top
  while the list scrolls.
- **The list**: one entry per airspace, "1 · TMA NANTES 4 · FL055|FL065 · D", at 0.95 of the body size; when the line is
  too short the entry takes two lines (the name, then the levels and the class under it); a name keeps at least 8
  characters by wrapping, never by narrowing the graph; when 8 characters do not fit beside the graph the list goes under
  it at full width. Activation and information in the tooltip.
- **"Aussi ici"**: every space on the point that `surfaceToCeiling` leaves out is named, never drawn: after the list a
  folded `<details class="f-card mp-lv-also">`, a 44 px `summary` "Aussi ici (n)" (n names, four languages), the names in a
  muted paragraph separated by " · " — "TYPE NAME" as the base gives it, the type not repeated when the name starts with
  it ("FIR PARIS", not "FIR FIR PARIS"), once per name, FIR, UIR, SIV first then by name. Read in `data.flat`, so an
  unticked family does not hide it; folded at every write; absent when empty; absent on a mission map (no `data.flat`).
- **Hover bubble** (mouse, screen, on an airspace label only): the label's space, then the others under the pointer, at
  most three lines, ending with a muted line "Aussi ici : FIR PARIS · SIV POITIERS" (without the hovered space); no SIV /
  FIR among the named spaces; not added to a touch.

## 11. Tooltip

A light `.mp-tip` (class `mp-hover`: `--sog-chart-bg` at 65 %, `--sog-fg`, thin border, 11.5 px, three lines at most) in
the map box or the profile box. What is under the pointer, in this order: a wind barb, an airway box, an airspace label,
a beacon. A tap or click on one of these takes priority over placing the cursor on the route; on nothing it closes the
tooltip. It follows the pointer 12 px away (never under it, kept in the box) while on the target, stays 5 s at its last
place, gives way to the next one, closes with a tap elsewhere or a move of the map. The compatibility mouse events that
follow a touch are ignored (`sourceCapabilities.firesTouchEvents`, or within 1 s of a touch).

## 12. Editing the route on the map

Hidden for mission maps. The Edit toggle enters the mode; entering it says its help once per page (notification).
- **Moving a point**: a press within 22 px of a waypoint (not departure nor arrival) drags it; the press is caught before
  MapLibre (`pointerdown` in the capture phase, `mousedown` / `touchstart` / `touchmove` stopped while dragging), so the map
  does not pan; elsewhere the map pans. While dragging: rubber band from the previous to the next point, the anchor under
  the finger (navaid, aerodrome, airway point, RNAV point, VRP of the data read, within 20 px) ringed with its id. Released
  on it: the point takes its id and position and keeps its `alt_ft`; elsewhere a free point named by its ICAO coordinates
  (`icaoCoord`, "4530N00030E").
- **Adding**: the "+" button arms one insertion (pressed while armed, hint by notification), the next tap adds the anchor
  under the finger (else a free point) where it lengthens the route least, then disarms; a press held 500 ms without moving
  (8 px) does the same at once (the browser menu is suppressed in the mode). A simple tap never inserts: on a route point it
  opens its card, elsewhere the tooltip; the click that follows a drag is ignored.
- **The point's card** (in the map box): id, departure / arrival or the level held from it with "−" / "+" (FL10), "Remove"
  for a waypoint.
- **Levels**: a vertical drag on the profile (more than 6 px) sets the level held on the segment under the finger, in steps
  of 1,000 ft, shown as a dashed line with its level while dragging; a tap places the cursor as usual. The level applies
  from the point that opens the segment: on the first segment it is `level.ft`, elsewhere the point's `alt_ft`, removed when
  it equals the previous segment's level. In the mode the profile has `touch-action: none`.
- **Undo** restores the points and the flight level before the last gesture (20 kept, in memory).
- **Writing**: each gesture is shown at once; 400 ms after the last one the record is written through
  `frame/lib/current_flight.js` `merge`, on the latest version read, with `by: 'maps'` and a fresh `updated_at`. The module
  writes `level.ft` when the first segment's level changed, and **merges into `route`** (never replaces it):
  `route.points` (rounded to 1e-6°, wrapped to [-180, 180[), `route.text` from `textFromPoints(points, previousText,
  previousPoints)` of `frame/lib/route_text.js` (airways of unchanged segments kept, ICAO coordinates for a point without a
  usable name), `distanceNm`, `trackDeg`, `from: 'points'`, `manual: false`; the other keys of `route` are kept, with
  `procedures` kept as it is (it is Fuel's choice: the map never writes it nor removes it; Fuel sets to "none" the side whose
  aerodrome no longer matches at its next write, and every reader checks the aerodrome), `wind` removed from the points that moved,
  `via` / `awy` kept on the points left intact. The profile's level drag finds the segment under the finger by projecting the route's
  points on the cut (the cut follows the flown path, longer than the route). Nothing outside `route` and `level` is touched (`progress`, `quote`,
  `profile` are fuel's or the frame's). Fuel requotes on `by` ≠ `fuel`; until then the profile computes its own TOC and TOD.
  Without a trigram the record is `pilot/ANON/current_flight.json`, as for fuel: the frame keeps it on the device, sends
  nothing, and moves it under the trigram once one is set (frame SPEC § 3.5).

## 13. The flight in time: ETA, planned position, started flight

### 13.1 Derived values

The ETAs and the planned position are **derived**, never read from `progress`: `frame/lib/flight_time.js` provides
`etaOf(flight)` and `plannedPositionAt(flight, now)`, shared by every reader (the map, the frame's status block, Flights).
- Reference time: `started.at` when the flight is started (`started` not null and `started.at` set — never the presence of
  `progress`), else `planned_at`, else none (no ETA, no planned position).
- Times: the taxi (`quote.taxiMin`, written by fuel with `quote.legs`; 10 minutes without it), then `quote.legs` [{ id, min,
  origin }] (minutes from brake release at each point of the flown path, written by fuel with every quote; the map passes `{ path }`
  = the flown path to `etaOf` and `plannedPositionAt`, so the NM, the times, the planned position and the progress line are those of
  the route and its procedures); without `quote.legs`, minutes computed from the route: climb at `profile.climbKt` to `tocNm`,
  descent at `descentKt` from `todNm`, cruise over what is left of `quote.minutes` (one mean speed without a profile);
  without a quote, none.
- `etaOf` → `[{ id, at }]` (ISO UTC), none once the arrival is past for a flight not started.
- `plannedPositionAt` → `{ lat, lon, legIndex, nmFromDep, phase }` (`taxi` at the departure, then `climb`, `cruise`,
  `descent`, `arrived`), interpolated on the same times.

### 13.2 What the map shows

- **ETA** labels: "ETA 14:52Z" for each route point in a close view (300 px per degree and more), in the accent colour, a request
  of rank 5 of the collision pass (§ 3), after the aerodromes and navaids: under the point's name, else above the point, else on
  its left, then sliding along the point's legs, silent without room; departure and arrival add the device's local time, "ETA 16:10Z (18:10)". Shown for a
  started flight and for a dated one. Times come from `frame/lib/time.js` (`fmtZ`, `fmtZLocal`).
- **Started flight** (`started` set; fuel sets it back to null when the start is cancelled, Report when the report is saved):
  - **planned position**: hollow aircraft in the accent colour, turned to the route's track there, labelled "planned
    14:32Z"; on the ground at the departure while taxiing; on the profile a circle at the planned distance and altitude;
  - **actual position** (`progress.actual`, the frame's; one older than `started.at` is the previous flight's and is
    ignored, trail included): filled red aircraft turned to `trackDeg` (else the bearing from the previous position), the
    trail dotted: the frame's trail, the only source (`ctx.live.trail()`, `[lat, lon, altFt, s since started.at]`, the whole
    flight, frame/lib/trail.js; refactor R-M6), read again at each reading of the flight (a change of tab no longer loses it),
    joined to the actual position when it is newer than its last point; the Map keeps no position of its own (`S.trail` is
    derived at each reading); older than 2 minutes: greyed,
    "Position from n min ago"; the source labelled (`gps`, `network`, `ivao`, `vatsim`, `xplane` "X-Plane", `lnm` "Little
    Navmap"; any other value: no label); on the profile a filled dot at the actual distance and altitude;
  - **the progress line** (first of the notes): ahead or late in minutes and NM (both positions projected on the route;
    time at `actual.gsKt`, else 250 kt), cross-track distance and side, actual altitude against the planned one; without an
    actual position "GPS or network not enabled" with a button that calls `ctx.live.enable()` (also said once by
    notification);
  - **Follow** (overlay toggle, shown only while started): keeps the map centred on the actual position at each update (a
    move of the module); any move of the user stops it.
  - **Arrived** (`phase` `arrived`): route and actual trail kept, Follow hidden, the note "Arrived".
  - **Diverted** (`started.diverted` set): the diversion aerodrome marked as the arrival, a note says so; nothing else.

## 14. Tuning page and the airline's profiles

- **Address** `#maps?tune=1`, reached from Settings › Administration ("Map threshold tuning (administrator)") or by its
  address. The page scrolls (the root scrolls by itself, `overflow: auto`, grid from 1000 px), the map box is 52 vh, the
  sheet is locked.
- A panel beside the live map from 1000 px, above it otherwise, read only on a phone: the current zoom line ("Current zoom:
  6.01 · effective 4.85 (frame of 403 px on average) · 18 NM per cm of screen"), where the mode on screen takes its
  thresholds from (the airline's own, taken from another mode, or built-in), the six mode tabs, one line per key with a
  double slider "from … to …" (zoom 0 to 18, step ¼; 18 means no upper limit) labelled in zoom and NM per cm, the effective
  zoom marked on each slider, and in front of each line a "drawn" box: the Layers content's layer for that line in this
  mode (`LAYER_OF`: one box per airspace family — TMA / CTA / CTR share "TMA / CTR", R / D / P / TSA share "D / R / P" —,
  the three town sizes share "Towns"; airspace and airway names are their own layers); unticked, never drawn whatever the
  range, the sliders greyed. The map is redrawn at every move.
- Buttons: "Reset the boxes", "Reset the sliders", "Keep on this device" (`cache/maps/ui.json`), "Save for the airline"
  (`airline/map_profiles.json`: the thresholds in `profiles[mode].elements.zoom`, the boxes in `profiles[mode].layers`, for
  the mode on screen only). "Save for the airline" writes for every pilot: it is reserved to the Full level (`ctx.level`
  3, the level of the Administration card that leads here) and refused by the module itself below it, whatever the address
  that opened the page, with a notification that says why (four languages); "Keep on this device" works at every level.
- **`airline/map_profiles.json`** (record merge, the newest `updated_at` wins):
  `{ schema: 1, updated_at, by, edge: { show }, profiles: { auto, low, high, vfr, topo, cam } }`; `profiles[mode]` is a
  display profile in the studio's `profile_def` format (`base`, `layers`, `cities`, `population`, `zones`, `zoneList`,
  `zoneMode`, `corridorNm`, `elements`), complete or partial: what it carries replaces the built-in profile's fields, its
  `elements` (and `elements.zoom`, key by key) are merged into the built-in ones. Extensions: `elements.zoom`,
  `elements.vfrDensity`, `hillshade`, `elements.fixes`, `elements.awLabels`. Written also by the V2 studio ("Save for the
  app", a partial profile). Followed with `watch`: the map takes a change at once.

## 15. Mission maps (`mission.js`, `window.MapsMission`)

- **Address** `#maps?mission=<ID>&map=<file>`: without `map`, the mission's first map; without `mission`, the planned
  flight. The choosers are in the Layers content (§ 6.7); the Layers button is named "Map to show".
- **Missions**: listed from the data layer's tree (`list('missions/')`, nothing read to list them); only the chosen
  mission's YAML is read (policy `reference`), parsed with `frame/lib/js-yaml.min.js`, read again on `watch`.
- **Parsing** (`parseMissionYaml`, the studio's rules): points (origin, destination, target, alternate, turning points,
  rendezvous); zones (circle or polygon; kind search, exclusion or mission); `maps[]` (file, type, description, centre
  `centre_ref` or `center`, `bbox` / `range_km` / `width_km` / `height_km`, `view`, `profile`, `trace`; profile `off` left
  out); `vertical_profile` (route, cruise, rates).
- **Drawing fields written by the V2 studio**: `profile_def` (the full display profile, used as is), `resolved_bbox` (the
  extent drawn), `cycle` (AIRAC; a cycle different from aerodb's is said in the notes); in `vertical_profile`:
  `profile_def`, `cycle`, `route_points` [{ name, lat, lon, alt_ft }].
- **Without them**: the built-in profile of the same id, else of the type (detail, target and rdv → `vfr-detail`;
  approach → `vfr-simple`; anything else → `ifr-simple`; said in the notes); extent from `view`, else `bbox`, else by type
  (general: points and zones, 12 % margin; zone: the zone, 20 %; detail 8 × 5 km; target 100 × 62 km; others 220 × 140 km;
  widened to the studio's 1.6 ratio); route from `vertical_profile.route` (or origin, turning points or target,
  destination) through `SiaProfile.parseRoute`, names resolved against the mission's points and zones, then aerodb's
  `coords`, levels of the text kept; `route_points[].alt_ft` is the altitude reached at the point (the studio's meaning).
- **Drawing**: the map's profile decides everything (base style: OpenFreeMap and VersaTiles styles; the studio's own style,
  OSM and OpenTopoMap become `positron`; airspaces, airways, aerodromes, navaids, obstacles, VRP and RNAV points, towns, MORA,
  graticule, AAR and NAT when asked), then the mission's zones (hatched, dashed outline, name), its points (dot and name,
  labels reserved first), the route when `trace` is `route` or `both` or by default. No overview declutter, no density tier,
  no thresholds.
- **Vertical profile**: the mission's route with its levels and rates; airspaces from the `vprof` profile (copy, else
  built-in: every type); the common cursor as for the flight. The Weather chip is disabled.
- **Not drawn**: probable route and exercise tracks, operation maps, built-up areas, summits, relief and contour layers.

## 16. VFR reporting points of an aerodrome (VAC)

- **The flight's choice at the top of the card**: for the aerodrome that is the flight's departure and / or arrival, a row per side
  (`.mp-ad-proc[data-proc=dep|arr]`) — "Departure : runway 03 · SID XX1A · transition TRA", "Arrival : runway 31 · STAR … · APP …"
  with the source's state, "none" when the pilot chose none, "not chosen yet" otherwise — and a **Change** button, `data-go` =
  `fuel?focus=dep` or `fuel?focus=arr` (the module's own link handler sets the address). The map writes nothing.

- **Data**: the reporting points of the published base (`aerodb.vrp({ lat, lon, radiusNm: 30 })`: those whose id carries
  the aerodrome's prefix, "MN-" for LFMN, otherwise those within 15 NM), deduplicated by `MapsRender.dedupeVrp` (same code
  within 0.5 NM: the richest description, then the prefixed id); then the VAC compilation when imported
  (`aerodb.vfrRoutes(icao)`, `sia/vfr/<ICAO>.json`): its sequences, instructions, manual vertices and the points the base
  does not have. Both read once per aerodrome and kept for the session.
- **One point, one row, one drawing**: VAC points merged by code (case-insensitive); a VAC point joins the base point given
  by `vrp`, else the base point of the same code within 5 NM, else the nearest base point within 0.6 NM; it is drawn once,
  at the base's position with the base's name; "VAC position n NM away" (four languages) when the VAC's position differs by
  more than 0.5 NM; the VAC code in its tooltip when it differs; restrictions kept. Only unmatched VAC points and manual
  vertices are added. While an aerodrome is shown, `render.draw({ hideVrp })` leaves its VRPs out of the VRP layer.
- **Codes and colours**: each point is labelled with its short code only (`MapsRender.vrpCode`: "BD-EA" → "EA",
  "MN-H-HE" → "HE"), the long name in the tooltip, the list and the preview; fixed wing in `--sog-fg`, rotary wing ("-H-"
  in the base's id, `vrpRotary`) in green `#2e7d32`; sequences and tracks from the VAC in teal.
- **Which aerodrome**: `render.draw()` returns the aerodromes drawn with their screen position; one is under the pointer
  within 12 px. Tap targets (22 px): first a reporting point (the highlighted ones, then those of the VRP layer: the
  aerodrome of their prefix within 30 NM, else the nearest within 5 NM), when nearer than an aerodrome — its aerodrome is
  pinned, the point first and in bold in the list; a VRP without aerodrome gives its own tooltip (code, name); then an
  aerodrome. Both before the tooltips and the airspaces list.
- **Hover** (mouse; barb, airway box and airspace label first): preview of the aerodrome's points and sequences, tooltip
  "LFMN NICE COTE D'AZUR · 21 reporting points · 5 VAC sequences: tap to see them", or "… · VAC sequences: not imported".
- **Tap or click** (not in Edit mode, not on a mission map): the aerodrome is pinned; when its points span less than 160 px
  the map fits them (aerodrome included, zoom 11 at most, room left for the sheet; the user's camera then); its content in
  the sheet, title "LFMN: VFR reporting points": "Reporting points (n)" with "(black: aeroplanes; green: helicopters)" when
  both kinds are there, one line per point (coloured code, name, restrictions); without the compilation "VAC sequences: not
  imported" and nothing else; with it the warning "Extracted from the VAC charts, to be checked: this is not the published
  route, the VAC chart prevails", the counts, the sequences in text ("LFBD – NA – NE (page 6)", identical ones once, "(some
  may be only part of a route)" when any is `fragment`), the instructions one folded block per page; the analysis line and
  notes, each route with its name, codes and pages, runways, default altitude, minimum visibility and "one way" when read,
  the omission note, the count of manual vertices ("…, accuracy not guaranteed", or "within n m"), the points with a
  restricted use with their restrictions (drawn with a dashed ring). A first-format file is read the same way. Points and
  sequences stay highlighted while the content is open.
- **Drawing**, on top of the route (teal): a route with an interpreted geometry follows it (long dashes, manual vertices as
  small dots), the others short dashes between their known points; never a line to the aerodrome's centre; an arrow at the
  end of a route only when `direction: 'forward'`; each point ringed and named with its short code; "VAC, to be checked" in
  italics under the aerodrome; the aerodrome's reference point not drawn.
- **Coverage line** (§ 6.11): when `aerodb.coverage` exists, the content opens with a line saying what the device holds of the aerodrome's
  procedures (pin, level, reason, outdated, counts), after the runway and procedure rows of the flight.
- **VFR mode**: departure and arrival (four-letter codes) are shown anyway, drawing only.

## 17. Designs, day and night

- The module's own style only places things; colours come from the frame's tokens: `--sog-bg` (map box), `--sog-chart-bg`
  (profile, tooltip), the frame's primitives for buttons, cards and the sheet.
- **Canvas**: `MapsRender.tokens()` reads `--sog-chart-bg`, `--sog-bg`, `--sog-fg`, `--sog-muted`, `--sog-chart-grid` and
  `--sog-accent` on `document.documentElement`; night is a chart background darker than 45 % luminance.
  `MapsRender.themed(ctx, tokens)` wraps the 2D context: white (backgrounds, halos, label boxes, any alpha) →
  `--sog-chart-bg`; ink → `--sog-fg`; greys → `--sog-muted`; rules → `--sog-chart-grid`; at night a dark cartographic
  colour is lightened by 45 % toward white, alpha kept; other cartographic colours pass unchanged. The cursor is
  `--sog-accent`. The plain background: sea `--sog-bg`, land `--sog-chart-bg`, borders `--sog-chart-grid`.
- A change of `data-design`, `data-tone` or `prefers-color-scheme` reads the tokens again; a change of night switches the
  base style; then the map and the drawings are redrawn.

## 18. Addresses and DOM contract

**Addresses** (`ctx.query`): `#maps` (the current flight); `#maps?mission=<ID>&map=<file>` (§ 15); `#maps?tune=1`
(§ 14); `#maps?choose=dep|arr&icao=<ICAO>` (§ 5.1, consumed at mount); `#maps?view=<west>,<south>,<east>,<north>` (the initial camera, degrees; tests and links). The dual view
(`?with=fuel`) is the frame's. Links out: `#fuel?from=maps&focus=route`, `#atmosphere`, `#settings`.

**DOM contract** (read by the tests and the frame; class and attribute names are part of the module's interface):

| Element | Contract |
|---|---|
| root | `section.f-module[data-module="maps"]`, class `f-sheet`, `data-sheet` = `collapsed` / `default` / `expanded` (the primitive's), `.mp-tuning` on the tuning page |
| map box | `.mp-box` holding the MapLibre container `.mp-map` and the aeronautical canvas `canvas.mp-over`; `.mp-map` carries `data-zoom-eff` (effective zoom), `data-kept` (counts kept), `data-cursor-nm` (cursor distance, NM) |
| overlay buttons | `.f-ov-btn[data-mp=route\|fit\|mode\|edit\|follow\|add\|undo\|layers]`; modes panel `#mp-mode-opts`, its buttons `[data-mode]` |
| sheet | `.f-sheet-panel`, `.f-sheet-head` (`.f-sheet-head-bare` when bare), `.f-sheet-grip`, `.f-sheet-title`, `.f-sheet-close`; contents body `.f-sheet-body.mp-dbody` with `data-kind` = the content's kind (`layers`, `lv`, `ad`, `weather`) |
| chips | `.mp-chip[data-view=profile\|weather]` and `.mp-chip[data-legend]`; legend overlay `.mp-legend`, rows with `.mp-lg-sw` / `.mp-lg-svg[data-key]`; "Whole flight" `.mp-whole` |
| profile | `.mp-dprof` (the sheet's drawing area) > `.mp-prof` (`role="img"`) > `canvas.mp-pc` (the drawing) and `canvas.mp-pcur` (the cursor); `canvas.mp-pc` carries `data-axis="1"` (last distance row inside), `data-marks` (route points drawn), `data-window` (`from,to` NM), `data-scale` (`bottom,top` ft), `data-plot` (left, right px), `data-ticks` (NM) |
| weather cut | body `data-axis="1"`, `data-window`, `data-top` (ft), `data-strips` |
| strip, notes | `.mp-strip`, `.mp-notes` (not shown at the default position) |
| airspaces | `.mp-lv` (content), `.mp-lv-col` (graph column), `.mp-lv-list`, `.mp-lv-n`, `.mp-lv-name`, `.mp-lv-lim`, `.mp-lv-unk` (unreadable ceiling), `details.mp-lv-also` |
| choose mode | `.mp-box.mp-choosing` (the base map dimmed); body `.mp-dbody[data-kind=choose]` > `.mp-ch[data-family]` > `.mp-ch-chips` (`.mp-ch-chip[data-rwy]`, `aria-pressed`) and `.mp-ch-list` of `.mp-ch-row[data-id]` (`data-id=none` first; `data-hl`; `--c` the hue) |
| tooltip | `.mp-tip.mp-hover`, its "Aussi ici" line `.mp-also` |
| Layers | `.mp-layers` (the content, kept by the module), the complexity block `.mp-l-detail` (value `[data-detail-v]`), help `#mp-detail-help`, boxes `[data-layer=<key>]`, "Around the flight only" `.mp-l-main` (first), the selectors `select.mp-pick` and `select.mp-mappick` (last) |
| VFR, point card | `.mp-vfr-pts` (points list); the chosen runway and procedures of the flight's aerodrome `.mp-ad-proc[data-proc=dep\|arr]` with its `[data-go="fuel?focus=dep\|arr"]` button; the route point's card `.mp-tip.mp-pcard` (`role="dialog"`) |
| empty state, links | `.mp-empty` (card in the map area); buttons `[data-go=fuel\|settings]` |
| tuning | `.mp-tune`, rows `.mp-tune-row` |

## 19. Invariants

1. The module writes only what § 2.2 lists; `airline/map_profiles.json` only at the Full level (§ 14).
2. A module file is never read from outside `modules/maps/`, the frame's libraries or the files `meta` declares (the
   service worker keeps only those); V2 files are copied into `lib/` with their origin in a header line and their
   divergences stated here.
3. No interface text in `render.js`.
4. The plain background always works offline once seen.
5. Longitudes: the route is unrolled before any calculation or drawing; no service, cache or file ever sees a longitude
   outside [-180, 180[.
6. Nothing of the map is redrawn or resized while the sheet moves; MapLibre never resizes itself.
7. Nothing is drawn between the frame's header and the map, nor over the map outside the frame's overlay layer, the light
   tooltip and the route point's card.
8. A chip is never hidden; the head's chips are always three.
9. The ETA and the planned position are derived (§ 13), never read from `progress`; "started" is `started.at`, never the
   presence of `progress`.
