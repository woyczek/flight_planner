# maps — reading of the V2 map studio (lot 1)

*22 October 2026. What the V2 map studio draws and stores (`apps/cpco/map_parser.html`, `shared/carto/*`, left
untouched on develop), the minimal rendering core to cut out, what a mission map needs to redraw itself, the weight on
a phone, and what the module asks of aerodb and the frame. No code in this lot. Decisions: [DECISIONS.md](DECISIONS.md).*

## 1. The rendering core to cut out

The studio is one 355 KB page. Its drawing is a MapLibre base map with a canvas overlay on top: everything
aeronautical is drawn on the canvas with `toC = map.project`, in Mercator, north up. Two pipelines call the same
functions in a fixed order:
- the live overlay, `addLiveGridMora` (l. 3672);
- the PNG export, `drawOsmOverlays` (l. 5910).

| Piece | Source | Keep for the phone | Coupling to remove |
|---|---|---|---|
| ICAO symbols, label placer | `shared/carto/aero_symbols.js` (41 KB, `SiaAero`) | as is: `drawAirspaces`, `drawPoints`, `drawCity`, `placer`, `limitFt` | none (no DOM, no globals) |
| Route parser, profile builder and drawer | `shared/carto/vertical_profile.js` (55 KB, `SiaProfile`): `parseRoute`, `build`, `planPath` (TOC / TOD), `draw`, `selectAirspaces` | the pure part | `loadStudio` (studio IndexedDB and localStorage), `aircraftChoice` (`flightPerfState`), `terrainSampler` (AWS tiles, see § 4) |
| Map and profile cursor sync, NM and TOC / TOD marks on the map | `shared/carto/vprof_editor.js` (31 KB) | the sync and `drawDecor` only | editing (drag, insert, delete) stays in the studio |
| Airspaces, aerodromes / navaids / obstacles, airways, VRP / RNAV points, NAT, cities, grid and MORA, route | `drawZonesCanvas` 3976, `drawAeroCanvas` 4156, `drawAirwaysCanvas` 4260, `drawVrpCanvas` 4311, `drawNatCanvas` 4225, `drawCitiesCanvas` 4111, `drawGridMora` 4383, `drawRouteCanvas` 5173 | yes | see below |
| Mission zones, exercise tracks, probable route, operation | `drawMissionZonesCanvas` 5012, `drawTracksCanvas` 5078, `drawProbableCanvas` 4869, `drawOperationCanvas` 6916 | mission maps lot only | `MissionEstimate`, `MissionExercise`, `sharedDoc`, `operationOverlay` |
| Built-up areas | `drawUrbanCanvas` 4509 | no | needs a live vector tile source (`omt`) |

The coupling is the same everywhere:
- **Profile values come from the page.** `el(def, id)` (l. 1893) reads `profileForMap(def).elements[id]`, falling
  back to the page's input of that id. `profileForMap` falls back to the `#activeProfile` select.
- **Data comes from globals.** `aero`, `airspaces`, `cities`, `moraCells`, `natTracks`, `mission`, `sharedDoc` and
  `zoneAliases` are filled by `applyBase`.

The cut-out core takes everything as input: `render(target, { bbox, profile, route, mission? })`.
- `profile` is a complete display profile object, with its 60 `elements` resolved to defaults.
- Data comes from aerodb answers for the bbox.
- `route` is a list of points with levels.
- `mission` holds points and zones.

## 2. What the studio keeps per map, and what the generator must add

- **No standalone map file.** A mission map is an entry of `maps[]` in `missions/<l>_<FAMILY>/<ID>/mission<ID>.yaml`
  (the source of truth) plus PNGs in `cartes/` (regenerable). An entry holds:
  - `filename`, `type` (general, target, detail, zone, approach, rdv);
  - the extent, in one of three forms: `centre_ref` or `center` with `range_km`, `width_km`/`height_km`, or `bbox`
    [w,s,e,n];
  - the studio's `view` (an extent kept by "keep"), `profile` (an id), `trace` (`none|route|probable|both`) and
    `exercise`.
  The `vertical_profile` block holds `route`, `cruise`, `ceiling_ft`, `floor_ft`, climb / descent rates and speeds,
  `profile` (`vprof`) and `aircraft` (a planner profile id). There is no camera: the extent is the framing.
- **The display profile is not in the mission.** Profiles live only in each browser's localStorage
  (`siaDisplayProfiles`; built-ins `ifr`, `ifr-simple`, `vfr-detail`, `vfr-simple`, `airways`, `ifr-low`, `ifr-high`,
  `vprof`). A map names one by id; the generator falls back to its active profile. The same mission therefore draws
  differently on two computers, and cannot be drawn on a phone.
- **To redraw alone**, each map entry needs:
  - `profile_def`: a copy of the full profile object, written by the studio when it saves and by the generator when it
    proposes maps; the same goes for `vertical_profile.profile_def`;
  - `bbox`: the resolved extent (`view`, else `bbox`, else the automatic frame by type, `mapGeoBbox` l. 2994, which is
    studio logic);
  - `cycle`: the AIRAC cycle drawn, so that a later cycle can be signalled.
  Mission points, zones and the route text are already in the YAML. The airspaces shown are chosen again from aerodb
  with the profile's filters (`zones`, `zoneList`, `corridorNm`, floor and ceiling), never frozen.
- **Asked of the V2 owners, through the ergonomics session**: the studio and the generator write `profile_def`,
  `bbox` and `cycle`. Missions saved before that keep working with the built-in profile of their type (detail, target
  and rdv → `vfr-detail`, approach → `vfr-simple`, otherwise `ifr-simple`).

## 3. Weight on a phone

- **Code.**
  - Core: about 130 KB (symbols, profile, cursor sync, the cut-out drawing functions).
  - MapLibre: 1,008 KB (JS and CSS), loaded at the first map only, from a copy declared in `meta.files`. The frame's
    service worker keeps only `frame/` and `modules/` files, so `shared/carto/` copies do not count.
- **Data**, only the zones under the bbox and only the kinds the profile shows. A France IFR map reads `meta`,
  airspaces, aerodromes, navaids, points, airways and MORA: about 3.9 MB the first time, then from the frame's cache.
  - Obstacles (1.5 MB) are read only if shown; VRP only on VFR profiles.
  - A whole-zone keep from Settings › Offline data makes it work with the network cut.
- **Memory**: aerodb's indexes for one zone (55–75 MB for all 13); the studio's 70,000 towns are never loaded.
- **Base map tiles**: online only (OpenFreeMap, VersaTiles; no key). OSM's own tile server forbids this kind of use.
  - Offline, or without the frame's permission, the map is drawn on a plain background, with the country outlines of
    `shared/carto/aero_zones_geo.js` (374 KB, already used to choose zones).

## 4. What is not reproducible on the phone

- **Building the base**: AIXM and XML_SIA files, a folder picked with File System Access, MORA computed from terrain
  and Overpass. The phone reads the published base through aerodb.
- **Terrain under the vertical profile**: Terrarium tiles from AWS, network only. Offline, the profile shows the MORA of
  each crossed cell instead of the terrain line.
- **Built-up areas and summits**: these need live vector tiles and Overpass; dropped.
- **Editing** (drag points, cut the route, profiles, views) and **exports** (1600 px PNG, ZIP): they stay in the studio.
- **Probable route, exercise tracks, operation maps**: heavy mission code (`MissionEstimate`, `MissionExercise`),
  left to the mission maps lot and decided then.
- **Aircraft performance from `flightPerfState`** (localStorage of the planner): replaced by aerodb's aircraft base and
  the fuel module's sheet.

## 5. What the module asks of aerodb and the frame

- **aerodb**: everything it needs exists already, by bbox and kind:
  - `airspaces({ bbox, types })`, `aerodromes`, `navaids`, `points`, `vrp`, `airways`, `obstacles({ minHgt })`,
    `moraCells`, `cities`, `nat`, `aar`;
  - `coords` for the route identifiers, `status().cycle`, `on('change')`.
  One addition would save work on the phone, and the module can do without it: `corridor(points, nm, kinds)`, the
  elements within n NM of a route, for the vertical profile and IFR route maps.
- **Frame**:
  - **reads**: `pilot/` (shared with fuel, merge `record`), `missions/` (read only); **writes**: none, the module is
    read only.
  - `ctx.query` for `#maps?mission=<id>&map=<filename>`.
  - **`ctx.net`**: allow two tile hosts (`tiles.openfreemap.org`, `tiles.versatiles.org`) and, for terrain,
    `s3.amazonaws.com/elevation-tiles-prod`. Today they get `503 x-sog-unreachable`. MapLibre fetches tiles itself, so
    the frame must decide between letting it fetch these hosts directly and a tile route.
  - **Precache**: MapLibre (1 MB) should not be downloaded by every phone at installation. Ask for a "cache on first
    use" list in `meta`, next to `meta.files`.
  - YAML: `frame/lib/js-yaml.min.js`, already used by flightlog.
- **Fuel**: `current_flight.json` has no climb or descent data. TOC and TOD are computed live by
  `FuelModel.quote` / `FuelLevels.climbGuide`. Two options:
  - fuel writes `profile: { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` with the flight (one source of
    truth);
  - maps computes them again with `SiaProfile.planPath`, from aerodb's aircraft performance.
  The first is proposed.

## 6. The phone screen

- **Default**: the IFR map of the planned flight, from `pilot/<tri>/current_flight.json`.
  - It shows `route.points`, `level.ft`, departure, arrival and alternate.
  - The extent is the route's, plus a margin.
  - The profile is a built-in "IFR route" profile (from `ifr-simple`, airways and airspaces in a corridor), held in the
    module, never in localStorage.
  - The map is redrawn when fuel writes the flight (`watch('pilot/')`).
- **Layout**: the map at the top, about 60 % of the height. Below it, the vertical profile: route, planned level,
  TOC / TOD, airspaces crossed, terrain or MORA.
- **One common cursor**: a finger on the profile or on the route moves both. A strip shows the distance from
  departure, the planned altitude and the airspace under the cursor. NM marks (every 10 or 50 NM by length) and
  TOC / TOD are on both views.
- **Read only.** "Edit the route" opens fuel (`#fuel`). Pinch and pan move the map; the extent is not saved.
- **Empty and partial states**:
  - no flight: a message and a button to fuel;
  - zone not published: say so;
  - offline without the zone: a link to Settings › Offline data;
  - tiles unavailable: plain background, said once.
- **Later lots**: the mission maps (a list from `?mission=`, each drawn from its entry); the live position (report's
  reading sends network tracking here).
