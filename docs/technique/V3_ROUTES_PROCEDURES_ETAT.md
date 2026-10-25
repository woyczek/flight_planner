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

## 4. Procedure sources, researched on 25 October (user: "idéalement pas X-Plane ni Navigraph, mais en fallback")

Facts found on the web; nothing verified by a download yet. "Free" means no fee; the licence is stated separately.

| Source | What it gives | Access | Licence / reuse | Cost for the suite |
|---|---|---|---|---|
| **SIA eAIP (France)** | Every SID / STAR / IAC as PDF charts, plus the per-aerodrome **"AD 2 … DATA" PDF pages** that list the procedure points with coordinates; AIRAC cycle, the same as the base's | Free download, no account | Official, reusable with the source named | A PDF extraction per aerodrome on the VAC model (`tools/report-vfr/`), a "to verify" status, a new base kind `sia/proc/<ICAO>.json`; effort and reliability to measure on two aerodromes first. **No procedure in the SIA AIXM 4.5 / XML exports**; the SIA's AIXM 5.1 sample is a 2017 experiment, no longer maintained; a full AIXM 5.1.1 (SEPIA) is announced, no date |
| **EUROCONTROL EAD** | AIXM 5.1 converted from the national AIXM 4.5 (so no more than the SIA export) and a separate **"instrument flight procedure data sets" in AIXM 5.1.1** page (snapshots, checksums, REST) | Needs the EAD User Agreement; the procedure page's access rules are not published | To ask EUROCONTROL (a virtual airline is not an AIS client) | Unknown until asked; if granted, the cleanest structured source for Europe |
| **SimBrief OFP** (already used for the quote) | The **navlog of the generated plan**: every fix of the filed SID and STAR with coordinates, altitude, airway, a SID/STAR flag | Free account, API already wired in fuel (`xml.fetcher`, `json=v2`) | SimBrief's terms; data derived from Navigraph but served per flight by SimBrief, nothing copied into the data repository | **Smallest lot**: draw the planned SID / STAR of the OFP on the map and the profile for the current flight; no database, no procedure library, only the filed ones |
| **FAA CIFP** | Full ARINC 424 coded procedures | Free, public domain | Free reuse | United States only (useful for the Alaska legs); a parser of ARINC 424 to write (GPL tools exist for FlightGear) |
| **ENAIRE (Spain)** | AIP data sets in CSV and AIXM 5.1 | Free from the ENAIRE AIP site | Official | Procedures not confirmed in the sets (the EUROCONTROL sample has SID/STAR "high level without legs"); Spain only |
| **Network sector files** (VATSIM France EuroScope `.ese`, IVAO Aurora) | SID / STAR as point sequences, community-coded from the AIP | Free with the network's tools | Usually "property of the network", reuse outside the network not granted | Legal grey, outside the networks' scope: not retained |
| **X-Plane CIFP, Navigraph** | Full coded procedures, worldwide | Local on the workstation (X-Plane) or subscription | Personal licence, never copied nor published (`LICENSE.md`) | **Fallback**: read locally by the launcher only; nothing on Pages or the phone without the launcher relay |

**Relay's reading, for the user to decide**: (1) now, the **SimBrief navlog** gives the planned SID / STAR of each flight with no new data source: draw them on the Carte and the profile; (2) for a procedure library covering France, the **eAIP "DATA" pages** are the only free official source: a measured extraction trial on two aerodromes before committing; (3) ask **EAD** whether the instrument procedure data sets are open to a non-AIS user; (4) **FAA CIFP** for the American legs; (5) X-Plane / Navigraph stay the local fallback.

Sources: [EUROCONTROL AIXM Confluence — France](https://ext.eurocontrol.int/aixm_confluence/display/aix/france), [SIA eAIP AD 2 DATA page example](https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_01_OCT_2026/FRANCE/AIRAC-2026-10-01/html/eAIP/Cartes/LFAV/AD_2_LFAV_DATA_01.pdf), [DSNA / EUROCONTROL 2025 presentation](https://www.eurocontrol.int/sites/default/files/2025-04/20250423-flyai-forum-session3-jumelle-varon-blentai-dsna.pdf), [FAA CIFP](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/), [flightgear-star-sid-manager](https://github.com/jojo2357/flightgear-star-sid-manager), [EAD](https://www.eurocontrol.int/service/european-ais-database), [EUROCONTROL AIXM inventory](https://ext.eurocontrol.int/aixm_confluence/display/AIX/Inventory), [SWIM AFOD service](https://eur-registry.swim.aero/services/eurocontrol-aeronautical-feature-demand-200), [EUROCONTROL AIXM Confluence — Spain](https://ext.eurocontrol.int/aixm_confluence/display/AIX/Spain), [SimBrief API (Navigraph developers)](https://developers.navigraph.com/docs/simbrief/introduction), [SimBrief navlog fix fields (MSFS SDK)](https://microsoft.github.io/msfs-avionics-mirror/docs/api/framework/interfaces/SimbriefNavlogFix), [EuroScope sector files](https://www.euroscope.hu/wp/?p=819).
