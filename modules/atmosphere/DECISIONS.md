# atmosphere — decisions log

The memory of the V3 atmosphere module: every choice, dated, with its reason. Never rely on chat history.

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
