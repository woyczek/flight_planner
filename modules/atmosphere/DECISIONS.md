# atmosphere — decisions log

The memory of the V3 atmosphere module: every choice, dated, with its reason. Never rely on chat history.

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
  plain background) and its sheet (`setSheet`, `sheetGestures`, `settle`) into shared files used by both.
- **Rasterised profile → SVG** (`section.js`): vector lines, text and barbs; the continuous fields (cloud, temperature,
  humidity, density altitude, icing and inversion masks) are images of the 200 × 120 computing grid drawn enlarged and
  smoothed, so no steps; hatches through SVG patterns masked by those fields. On a narrow block: barbs every ~34 px
  and every other level, point names that would overlap left out, surface strips only above 260 px.
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
