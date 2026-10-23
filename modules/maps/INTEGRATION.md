# maps — integration

How the frame mounts the map module and what it needs from the frame, aerodb and fuel. Specification:
[SPEC.md](SPEC.md). Decisions: [DECISIONS.md](DECISIONS.md).

## 1. Declaration

```js
export const meta = {
  id: 'maps', apps: ['pilot'], level: 1,
  reads: ['pilot/', { prefix: 'missions/', policy: 'reference' }, 'cache/maps/'],
  writes: [{ prefix: 'cache/maps/', policy: 'cache' },                        // map mode and layers, per device
    { prefix: 'pilot/', merge: 'record' }],                                   // the current flight, edited on the map
  files: ['render.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/outlines.js?v=0', 'lib/profiles.js?v=0', '../../frame/lib/js-yaml.min.js?v=0'],  // kept at installation
  lazy: ['lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0'],                 // kept at first use
  net: ['tiles.openfreemap.org', 'tiles.versatiles.org', 's3.amazonaws.com/elevation-tiles-prod']  // called by MapLibre itself
};
```

## 2. What the frame must provide

- **The menu entry**: `{ id: 'maps', label: ['Carte', 'Map', 'Karte', 'Mapa'], icon: '⌖' }` in `APP.modules` of
  `frame/app.js`, after fuel (added by the module itself in lot 3, as the other modules did). `tools/csp_policy.py`
  reads `meta.net` from it. `modules/maps/test/index.html` also mounts the module on its own.
- **`meta.lazy`** (frame lot 8): files kept by the service worker at their first use, not at installation. MapLibre
  (1 MB) is only needed with tiles.
- **`meta.net`** (frame lot 8): the public hosts that a module's library calls directly, added to `connect-src` with
  and without a launcher. `worker-src blob:` (MapLibre's worker) is already in the CSP.
- `ctx.data` (read `pilot/`, `watch`), `ctx.aerodb`, `ctx.t`, `ctx.identity.trigram`.

## 2 bis. Missions (V2 studio and generator)

- The module reads `missions/<l>_<FAMILY>/<ID>/mission<ID>.yaml` on demand ("reference": never pulled ahead; the
  folders hold PNG files, received texts and versions). It writes nothing there.
- Since develop ea077ae36 (v3 f799f8429), the studio writes the drawing fields: `maps[].profile_def`,
  `resolved_bbox`, `cycle`; `vertical_profile.profile_def`, `cycle`, `route_points`. The registry ignores them when it
  compares versions, and carries them over to a new version map by map.
- Built-in profiles: `modules/maps/lib/profiles.js`, generated from the studio by `tools/build_maps_profiles.py`. Run
  it again when `defaultProfiles` changes (`BASE_PROFILES_VERSION`).

- **Icons**: `frame/lib/icons.js` (`svg`), imported by the module; `wand-sparkles` added there for the map modes
  (owner: design, the frame session told).

## 3. What it asks of aerodb

`airspaces`, `aerodromes`, `navaids`, `airways`, `moraCells` and `obstacles` by `bbox`; `coords` (the alternate);
`status().published` and `status().cycle`; `on('change')`. For mission maps also `vrp`, `points` and `cities`, by
`bbox`. Everything is read only for the area shown or the route's corridor.

## 4. What it reads from fuel

`pilot/<trigram>/current_flight.json`: `route.points` (resolved positions, optional `alt_ft`), `route.dep / arr /
altn`, `level.ft`, `aircraft.type`, and `profile: { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` for the
vertical profile (drawn as fuel computed it; without it, the profile computes its own). "Edit the route" opens
`#fuel?from=maps&focus=route`: fuel shows its Route step with the text field focused (in the dual view, the frame
keeps the module and fuel scrolls to that step).

- `route.points[].alt_ft` follows fuel's INTEGRATION § 3 (fuel lot C): the level held from that point on, never on
  the first or the last point; the flight leaves at `level.ft`; a point without it keeps the previous level. The
  profile then draws the steps and computes TOC and TOD per segment.
- Missions keep the studio's meaning for `route_points[].alt_ft`: the altitude reached at the point (`mission.js`).
- Every write of the file redraws the map and the profile (debounced 300 ms).
- **Maps writes the record** when the route is edited on the map (lots 6a and 6b): `route.points`, `route.text`
  (`textFromPoints` of `frame/lib/route_text.js`, owned by fuel: airways of unchanged segments kept), `level.ft` when
  the first segment's level changes, `distanceNm`, `trackDeg`, `from: 'points'`, `manual: false`, `by: 'maps'`,
  `updated_at`, on the latest version read; every other field is kept. Fuel requotes on `by` ≠ `fuel`; until then
  maps draws its own TOC and TOD.
- `frame/lib/route_text.js` is imported by the module and kept at installation (`meta.files`).
- `route.points[].wind` (fuel lot F) is drawn as barbs; absent, nothing is drawn.

## 5. Costs (measured, see DECISIONS.md)

- **Code**: core, profile and symbols about 145 KB, outlines 350 KB (kept at installation); MapLibre 1 MB at the first
  tiled map.
- **Terrain**: 7 to 20 Terrarium tiles for a 100 to 370 NM route (zoom 9).
- **Data**: France IFR route LFRS → LFML: France's meta, airspaces (2.8 MB), aerodromes, navaids, airways and MORA,
  plus about 100 KB of Spain and Switzerland (no airspaces): 3.64 MB, then from the frame's cache.
