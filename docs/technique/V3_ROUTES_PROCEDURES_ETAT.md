# V3 — routes, airways and procedures: what the repository holds (25 October 2026)

*Read-only exploration asked by the user ("trouver un moyen (regarder dans la V2) de récupérer les routes. Idéalement,
un bouton « auto » à la saisie, pour inscrire les AWY (vérifier plafond/plancher). Mais surtout, comment ajouter les
traces des STAR/SID/APPR"). Facts with their files; the lot comes after the user's decision (§ 3).*

## 1. Airways (AWY): everything needed for an "auto" button exists, in pieces

- **Source**: SIA AIXM 4.5 `<Rsg>` (1 493 segments, 429 routes): designator, both ends (fix / VOR / DME / NDB with
  coordinates), lower / upper limits (FL), RNAV, RNP, level code (L / B / U), reporting points, tracks, length.
  `XML_SIA` `<Segment>` also carries `Circulation` (direction codes such as "(2=1)", "(X-1)"), **read by no code** and
  undocumented in the repository, plus MOCA.
- **Parser**: `modules/maps/lib/aero_symbols.js` (copy of `shared/carto/aero_symbols.js`) keeps only `{ route, a, b,
  lower, upper, nm }`; direction, class, MOCA, level code and RNP are dropped. `shared/aero_sources.js` (AIXM 5.1 ENAIRE,
  X-Plane `earth_awy.dat`) gives the same shape.
- **Published base**: kind `airways` (`frame/aerodb/SPEC.md` § 2): `fr/airways.json` = 3 517 segments with exactly
  those keys; `es`, `gb`, `de`, `be` likewise. Both directions are assumed open. API: `AeroDB.airways({ bbox })`
  (cell index); `AeroDB.coords(ident)` resolves aerodromes, navaids, points and VRPs, **not airway ends** (RNAV ends
  may stay "unknown points").
- **Drawing**: done. `modules/maps/render.js` `drawAirways` (low in blue, high in dashed purple, name cartouche, floor
  "Fnnn"), tooltip with both directions and limits, airway points on the vertical profile, display options per mode
  profile.
- **Path finding**: done in V2 only. `shared/mission_routing.js`: `airwayGraph()` (undirected), `shortest(graph, a,
  b, alt, reach)` (Dijkstra, keeps an edge when `alt` is within its floor − 100 ft and ceiling + 100 ft, direct entry /
  exit to the eight nearest nodes within 60 NM), `leg()` (rejects a detour over 40 %), `expand()`; each point carries
  `via` (airway name or `DCT`). Limits written in its header: no SID / STAR, no one-way airways, no fine level
  restrictions. It reads `window.SiaBase` (V2 global), not aerodb.
- **Route text today**: fuel's `routePoints()` tokenises with `frame/lib/route_text.js` (airway and procedure tokens
  kept as is, no alert), resolves names with `ctx.aerodb.coords`, sums straight legs: a typed airway changes neither the
  points nor the distance. Maps' `vertical_profile.js parseRoute` walks a **named** airway between two points
  (`alongAirway`, 2 NM snap) without a level check. `modules/fuel/DECISIONS.md`: "airway expansion belongs to maps".

**What the "auto" button needs**: port `shortest` / `leg` to V3 on `AeroDB.airways` over the departure–arrival
corridor, with the planned level; group consecutive points of the same `via` into "PT1 UN460 PT2" (`route_text.js`
already keeps an airway between two neighbours); write `route.text` and `route.points`; a button next to the route
field in fuel. Later, extend the parser and republish the base to carry the direction (`Circulation`) and the level
code, so that one-way airways are honoured.

## 2. Procedures (SID / STAR / approach): no source in the repository today

- The SIA exports (AIXM 4.5 and `XML_SIA`) hold **no procedure element** (counted: no Sid / Star / Iap / Pdg); "SID /
  STAR" only appears in free-text remarks. Only ILS / localizer / glide path exist as navaids.
- No parser, renderer or trace of procedures anywhere (V2 or V3). The mission maps' "approach" type is a display
  profile. Routing, profile, FPL and assist code skip SID / STAR tokens.
- Sources named in the repository: **FAA CIFP** (ARINC 424, public domain, 28-day cycle, **United States only**:
  `docs/technique/DONNEES_AERO_ETRANGER.md`, `LICENSE.md`); **X-Plane CIFP** per aerodrome and **Navigraph** (read
  locally on the workstation only, personal licence, never copied nor published: `LICENSE.md`; `shared/sia_base.js`
  reads X-Plane's `earth_nav / fix / awy / mora`, not the `CIFP/` folder); **eAIP** as PDF; **OpenAIP** (no
  procedures).
- A precedent for traces with geometry and a "to verify" status: VFR routes extracted from the VAC PDFs
  (`sia/vfr/<ICAO>.json`, `tools/report-vfr/`, drawn dashed with the label "extrait des VAC, à vérifier").

**What the traces need**: a source for France, a new kind of the published base (or `sia/proc/<ICAO>.json`), a reader in
`aerodb.js` like `vfrRoutes`, and a drawing on the map and the profile. Three candidates, all with a cost:
(a) X-Plane / Navigraph CIFP read **locally** by the launcher only (licence: never published, so Pages and the
phone have nothing unless the launcher relays); (b) extraction of the eAIP procedure charts (PDF) on the VAC model
(effort and reliability unknown, "to verify" status); (c) FAA CIFP for the United States only. The AIRAC cycle of a
procedure source may differ from the SIA export's.

## 3. For the user to decide

1. Start the **"auto" airway button** now (fuel + maps, data already published), one-way airways in a second step?
2. Which **procedure source** for France: local CIFP through the launcher (never published), eAIP PDF extraction, or
   wait for an open source? The answer sets the size of the lot.
