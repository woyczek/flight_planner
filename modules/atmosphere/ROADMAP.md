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
  offline data). In the menu only at the "full" usage level (Settings).
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

## Not checked yet

- A real Open-Meteo load in the frame (the session's network cut Open-Meteo at times), a TAF with a real avwx key
  through `ctx.net`, the current flight synchronised from the private data repository on Pages, a route text resolved
  by aerodb on a device with the SIA base, a phone width by eye.

## Next

1. **Review** by the user on Pages.
2. **Place in the application** (decided, `V3_SPECIFICATION.md` § 7.1): the **Météo tab of Préparer** once the frame
   has groups of modules (then the `APP.modules` entry becomes a member of the Préparer group, without a verb), and the
   **cross-section in the map's data block** (a lot shared with maps: the drawing of `drawXs` as a component the map can
   mount, reading the same weather cache).
3. **`frame/weather`** (frame lot, `V3_SPECIFICATION.md` § 8): move `weather_store.js` there unchanged, expose it as
   `ctx.weather`, show the tally in Settings › Diagnostics; then Fuel reads its winds aloft through it
   (`cache/fuel/aloft.json` retired), so the quota is paid once.
4. Help chapter in four languages once the place is decided; times of passage with the wind.
5. Ideas not done: skew-T with parcel and CAPE, clear-air turbulence (shear), departure time as an animation, PNG
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
