# Route atmosphere — roadmap

A standalone mock-up (`README.md`) meant to become a V3 module **later**. This file replaces the first session's
handover note (24 October 2026); it is kept up to date by whoever works on the mock-up.

## Origin of the request (24 October 2026, summarised)

A graph of the atmosphere along the flight — clouds, temperature inversions, density, etc. — as a standalone mock-up
page on a dedicated branch. The route comes from the flight plan module (the current flight). The weather is shown
**in slices along the route** and **at the surface**, at the requested, planned and computed (climb / descent)
altitudes; the map shows isobars, temperature and clouds.

## Where things are

- Branch `feature/atmosphere-route`, from `develop` (= `v3`) at `66cc22da`. Nothing on `develop`, `v3` or `master`.
- Rules: `CLAUDE.md` (gitmoji, French commit messages, CHANGELOG in English under « Unreleased »,
  `tools/format_sources.py` then `tools/verify_format.html`, `?v=0`), `.claude/agents/README.md` (roles, who pushes
  what), `.claude/agents/v3-fuel.md` and `v3-maps.md` (owners of the weather and of the maps).
- Reused without change: `modules/fuel/winds.js`, `modules/fuel/weather.js`, `frame/lib/metar.js`,
  `frame/lib/route_text.js`, MapLibre of `modules/maps/lib/`.
- Deliberate departures from `CLAUDE.md` while it is a mock-up: French only; a local toast instead of
  `AppFramework.notify` (the page is outside the frame).

## Done

- First mock-up (`f3a05818`): cross-section, map at the chosen altitude, vertical slice, table, aerodromes, offline
  demonstration. Checked in headless Chromium (demonstration, and one real Open-Meteo load end to end).
- **Sparing the Open-Meteo quota** (second session): nothing asked at opening, device cache per model and places,
  variable by variable, valid for the model run; route levels up to the cross-section top; loads of the same places
  shared; local tally (600 / min, 10,000 / day); calls spent shown. Checked in headless Chromium with Open-Meteo
  answered from the demonstration data: opening = 0 forecast request; « Charger » = 2 requests (≈ 373 weighted
  calls); « Charger » again, page reload, another level = 0 request.

## Not checked yet

- TAF through avwx.rest, an Open-Meteo customer key, the current flight served by the launcher, dark mode by eye,
  other models (ICON, GFS) on a route outside France, a real day with the new cache (run change after a few hours).

## Next, at the user's choice

1. **Review** by the user (branch link) and their feedback.
2. **Publication on Pages** (see below).
3. **V3 data model** — checked on 24 October 2026 with the maps / mobile session (« Carte interactive flotte
   aérienne », standing in for the ergonomics session), against `v3` `47e3bb58`:
   - current flight: still `schema: 1` (`modules/fuel/INTEGRATION.md` § 3, `frame/lib/current_flight.js`), no
     schema 2 planned; every field the mock-up reads exists as is. Also there since 23 Oct: `route.points[].wind`
     `{ dirDeg, kt, tempC, levelFt, at }` (fuel's forecast wind at the point), `windSource`, `started`, shared
     `progress` (`progress.actual` is the frame's). Read only, nothing breaks; if the module ever writes, it goes
     through `merge(stored, mine, { fields, progressKeys, by })` with its own fields and `by`. Missions'
     `route_points` (maps, studio) are another object, same meaning of `alt_ft`;
   - environment access is gathered in one adapter, `IO` in `page.js` (`read` / `fetch` / `cache`), to be replaced by
     `ctx.data.read`, `ctx.net.fetch` and the `cache` policy of `ctx.data` — in V3 a module never calls `fetch`, nor
     keeps its own localStorage / IndexedDB / Cache API store; the Cache API `labs-atmosphere` and the local tally are
     for the mock-up only;
   - point names of a route text: `frame/lib/route_text.js` stays pure (tokens `coord | name | group | word`);
     resolution through the frame, `ctx.aerodb.coords('LFBO')` → `{ lat, lon, name, kind }`, `ctx.aerodb.find(text,
     n)`; never keep a copy past a `change` event. No frameless equivalent: coordinates only until the mock-up is
     mounted as a module;
   - Open-Meteo: read `cache/fuel/aloft.json` (key = route + hour) through `ctx.data` first and reuse
     `modules/fuel/winds.js` as is, so the quota is not paid twice; a shared `cache/weather/…` held by the frame
     would be the frame's choice — **decided the same day** (`docs/technique/V3_SPECIFICATION.md` § 8, lot
     `frame/weather`): one store `cache/weather/<model>/<grid cell>/<hour>`, one reader API (`ctx.weather.aloft(samples,
     when)`, `ctx.weather.metar(icao)`…), calls counted on the device; the module will read through it, and this
     mock-up's cache and tally show what it needs (variables by level, merge of what is missing, validity by model run);
   - avwx key: in V3 the frame adds the device's key itself and refuses one passed by a module (today: the page reads
     `localStorage['githubData:avwx']`);
   - METAR: `metar.vatsim.net` without launcher, aviationweather.gov relayed by the launcher — the frame's table
     (`frame/SPEC.md` § 3.2);
   - levels always written with `formatLevel` (already so);
   - a map in the module follows the user's decision of 24 Oct: fixed « map, then data block » view, airspaces and
     VFR points in the block, VRP short codes only, display thresholds by the frame's size (`effectiveZoom`);
   - four languages, `--sog-*` tokens, 44 px targets, and the three documents SPEC / INTEGRATION / DECISIONS.
4. **Integration as a V3 module** (with the ergonomics session and `v3-fuel` / `v3-maps`): a module or a step of
   Fuel, four languages through `K.t`, times of passage with the wind, `meta.net` hosts declared.
5. Ideas not done: skew-T with parcel and CAPE, clear-air turbulence (shear), departure time as an animation, PNG
   export of the briefing.

## Publication on Pages

To try it: <https://woyczek.github.io/flight_planner/v3/labs/atmosphere/> (from `v3`), and
<https://woyczek.github.io/flight_planner/labs/atmosphere/> once `develop` has moved to `v3`; `?donnees=demo` for the
offline data.

The suite is published by `.github/workflows/pages.yml` (GitHub Pages): on every push of `develop` or `v3`, both
branches are built by their own `tools/build_pages.py` — `develop` at the site root, `v3` under `/v3/`. Every tracked
file except `data/` and `.github/` is published, so the mock-up appears at `labs/atmosphere/` (and `/v3/labs/atmosphere/`)
as soon as it is on those branches. Points to settle first:

- the content security policy written into every page (`tools/csp_policy.py`) already allows `api.open-meteo.com`,
  `metar.vatsim.net`, `avwx.rest`, `tiles.openfreemap.org`, and `customer-api.open-meteo.com` (customer key) since
  this lot;
- « Vol courant (servi par le lanceur) » reads `../../data/pilot/…`, absent from Pages (data come from the private
  data repository through `shared/github_data.js`, which the mock-up does not load): on Pages, the example, a file or
  a route text only, until the module reads through the frame;
- the Cache API needs https (Pages) or localhost (launcher): fine in both.

Environment of a cloud session (settings of the environment, then a new session) — hosts, one per line:

```
api.open-meteo.com
customer-api.open-meteo.com
metar.vatsim.net
avwx.rest
aviationweather.gov
tiles.openfreemap.org
```

Tokens as environment variables only (never in the repository nor in a message): `AVWX_TOKEN`, `IVAO_TOKEN`. In the
page, the avwx key is the device's (`localStorage['githubData:avwx']`, set by the suite's Settings).
