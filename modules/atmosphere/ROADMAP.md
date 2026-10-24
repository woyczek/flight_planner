# atmosphere — roadmap

For whoever works on the module next. It replaces the first session's handover note (24 October 2026) and is kept up
to date with each lot. Decisions and their reasons are in DECISIONS.md; what the module does in SPEC.md; how it plugs
in, and the weather cache's API, in INTEGRATION.md.

## Origin of the request (24 October 2026, summarised)

A graph of the atmosphere along the flight — clouds, temperature inversions, density, etc. — first as a standalone
mock-up page on a dedicated branch. The route comes from the flight plan (the current flight). The weather is shown
**in slices along the route** and **at the surface**, at the requested, planned and computed (climb / descent)
altitudes; the map shows isobars, temperature and clouds. Then: spare the Open-Meteo quota; make it a V3 module
through the frame's interfaces, with a weather cache shared by every reader; testable on GitHub Pages.

## Where things are

- `modules/atmosphere/` on `v3` (GitHub); `labs/atmosphere/index.html` forwards to `frame/index.html#atmosphere`.
- Try it: <https://woyczek.github.io/flight_planner/v3/frame/#atmosphere> (`#atmosphere?donnees=demo` for the
  offline data). On a phone: Préparer, sub-tab Atmosphere; on a screen: Atmosphere in the rail.
- Rules: `CLAUDE.md`, `frame/INTEGRATION.md`, `.claude/agents/README.md`; the relay cloud session's decisions are to be
  followed (user, 24 Oct 2026) until the ergonomics session is back.

## Done

1. Mock-up (`f3a05818`): cross-section, map at the chosen altitude, vertical slice, table, aerodromes, offline
   demonstration.
2. Quota spared (`27ba0f59`): nothing at opening, device cache, missing variables only, tally.
3. Module (this lot): `ctx` everywhere, four languages, `--sog-*` tokens, the shared weather cache
   `cache/weather/<model>/<cell>/<day>.json` (cells at the model's resolution, 0.1° floor), sampling as Fuel (50 NM,
   24 at most), past days removed, bench `test/weather_store.html` (22 checks). Checked in the frame (headless
   Chromium, Open-Meteo answered from the demonstration): opening 0 forecast request, "Load" 2 requests (≈ 295
   weighted calls), reload 0, FL390 only the missing map levels; demonstration, English, night; the old lab address
   forwards.
4. Screen redone on the maps module's template (fixed view, map on top, profile or local slice below, **i** and
   **Flight** in the block, the maps module's three-position sheet), the map overlay with the maps module's technique (no lag), the profile and the slice in SVG.
   Checked at 390 × 844 and 1280 × 800: no page scroll, no JavaScript error, the overlay follows a drag.
5. Shared bases: the map's (`modules/maps/lib/map_base.js`) and the frame's sheet (`frame/lib/sheet.js`); the copies
   removed. Touch kept on the map alone. Checked with touch events (iPhone 13 emulated in Chromium): Layers, the map
   tap, ✕, the handle, a tap on the profile and ◀ ▶ all answer.
6. Buttons on the map (frame overlay layer, § 9.3): no tools row nor information line any more, the flight in brief in
   the sheet's title, full screen by the frame. On a 390 × 664 phone view the map went from 235 px to 380 px high
   (465 px in full screen).
7. World synoptic from NOAA GFS published with the pages (5°, +72 h, 15 variables), nothing asked outside the
   flight's grid; routes across the date line; the flight date slider (0 to +72 h, nothing asked).
8. The weather map as a library (`lib/weather_map.js`, INTEGRATION § 6): this module draws through it, the maps
   module's Météo chip will call `attach(map, …)`; bench `test/weather_map.html` (14 checks, no Open-Meteo call).

## Not checked yet

- A real Open-Meteo load in the frame (the session's network cut Open-Meteo at times), a TAF with a real avwx key
  through `ctx.net`, the current flight synchronised from the private data repository on Pages, a route text resolved
  by aerodb on a device with the SIA base, a phone width by eye, Safari on an iPhone (WebKit is not in the session).

## Next

1. **Review** by the user on Pages.
2. **World synoptic — to watch on the first runs**: the workflow's log ("synoptique monde : 2376 lieux, 25 échéances",
   "même run : publication reprise", or "lecture impossible"). The schedule (every 6 h) runs only once `pages.yml` is on
   `develop` (default branch); until then the publication is rebuilt at each push. On the launcher, no world layer until
   `frame/weather` (a relay or the publication's host). Next free data, each a decision (host in `meta.net` and the
   CSP): satellite clouds (NASA GIBS) and radar (RainViewer), both with CORS; GFS upper levels (FL100…FL390 winds and
   temperatures) to give the world view the map's altitudes; a longer slider (GFS goes to +384 h).
3. **Landscape** (later lot): map left, narrow block right, buttons as a rail on the right edge — for the ergonomics
   session.
4. **`frame/weather`** (frame lot, `V3_SPECIFICATION.md` § 8): move `weather_store.js` there unchanged, expose it as
   `ctx.weather`, show the tally in Settings › Diagnostics; then Fuel reads its winds aloft through it
   (`cache/fuel/aloft.json` retired), so the quota is paid once.
5. Times of passage with the wind. (The help chapter is written: `help/<lang>.md`, "Météo".)
6. Ideas not done: skew-T with parcel and CAPE, clear-air turbulence (shear), departure time as an animation, PNG
   export of the briefing.

## Environment of a cloud session

Hosts (environment settings, then a new session), one per line:

```
api.open-meteo.com
metar.vatsim.net
avwx.rest
aviationweather.gov
tiles.openfreemap.org
```

Tokens as environment variables only (never in the repository nor in a message): `AVWX_TOKEN`, `IVAO_TOKEN`,
`FRAMAGIT_TOKEN` (read only). In the frame, the avwx key is the device's (Settings), added by `ctx.net`. The private
data repository (`woyczek/flight_planner_data`) must be added to the session to read real current flights.
