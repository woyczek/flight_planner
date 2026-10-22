# maps — decisions

Memory of the V3 maps module: every choice, dated, with its reason. Chat history is never needed. Separate from
aerodb's memory (`frame/aerodb/DECISIONS.md`), although the same session holds both roles.

- **22 Oct 2026 — role taken** by the aerodb session, at the ergonomics session's request.
  - Worktree `E:\DEFA-v3-maps`, local branch `v3-maps` from `origin/v3` (c83590c6a).
  - Port 8794, the role's port, was found taken by another process; 8798 is used instead.
- **22 Oct 2026 — lot 1, reading** ([READING.md](READING.md)), from the V2 studio (`apps/cpco/map_parser.html`,
  `shared/carto/*`), the mission generator (`apps/cpco/mission_editor.html`, `mission_skeleton.js`), fuel's
  `INTEGRATION.md` and the frame's contract.
  - The studio's core is portable once `el()` / `profileForMap()` take a profile object instead of reading the page.
  - Mission maps cannot redraw themselves today: their display profile exists only in a browser's localStorage.
- **Proposals awaiting the ergonomics session's answer**:
  1. The studio and the generator write, per map, `profile_def` (copy of the profile), the resolved `bbox` and the
     `cycle`; the same goes for `vertical_profile.profile_def`. Older missions use the built-in profile of their type.
  2. Fuel writes the climb and descent figures with the flight (`profile: { climbFpm, climbKt, descentFpm, descentKt,
     tocNm, todNm }`), rather than maps computing them a second time.
  3. The frame allows the tile hosts (OpenFreeMap, VersaTiles) and the terrain tiles, and offers a "cache on first
     use" list so that MapLibre (1 MB) is not precached by every phone.
  4. Without tiles (offline, or refused), the map is drawn on a plain background with the country outlines of
     `aero_zones_geo.js`.
  5. Lots: 2 the route map of the planned flight, 3 the vertical profile with the common cursor, 4 the mission maps
     redrawn.
