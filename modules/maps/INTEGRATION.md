# maps — integration

How the frame mounts the map module and what it needs from the frame, aerodb and fuel. Specification:
[SPEC.md](SPEC.md). Decisions: [DECISIONS.md](DECISIONS.md).

## 1. Declaration

```js
export const meta = {
  id: 'maps', apps: ['pilot'], level: 1,
  reads: ['pilot/'], writes: [],
  files: ['render.js?v=0', 'profile.js?v=0', 'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/outlines.js?v=0'],                                                      // kept at installation
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

## 3. What it asks of aerodb

`airspaces`, `aerodromes`, `navaids`, `airways`, `moraCells` and `obstacles` by `bbox`; `coords` (the alternate);
`status().published`; `on('change')`. Everything is read only for the area shown or the route's corridor.

## 4. What it reads from fuel

`pilot/<trigram>/current_flight.json`: `route.points` (resolved positions), `route.dep / arr / altn`, `level.ft`,
`aircraft.type`, and `profile: { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` for the vertical profile
(drawn as fuel computed it; without it, the profile computes its own). "Edit the route" opens `#fuel`.

## 5. Costs (measured, see DECISIONS.md)

- **Code**: core, profile and symbols about 145 KB, outlines 350 KB (kept at installation); MapLibre 1 MB at the first
  tiled map.
- **Terrain**: 7 to 20 Terrarium tiles for a 100 to 370 NM route (zoom 9).
- **Data**: France IFR route LFRS → LFML: France's meta, airspaces (2.8 MB), aerodromes, navaids, airways and MORA,
  plus about 100 KB of Spain and Switzerland (no airspaces): 3.64 MB, then from the frame's cache.
