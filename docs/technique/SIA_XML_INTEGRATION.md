# Integration of the “SIA XML” application — analysis and plan

Design notes for the integration (2026-09-24 / 25). **Documentation of the application:
[SIA_MISSIONS.md](../SIA_MISSIONS.md).** The whole plan of § 2 has been carried out: common header and menu,
blocks, `sia` theme and `assets/favicon-sia.svg`, common js-yaml, remembered SIA folder
(`FileAccess`, `__sia`), pasting of missions and of zone lists (`pastePanel`), racetrack
layer, bridge to CR (`?from=sia`, `siaMissionToCr:v1`,
`MissionVocab.familyForType`, `fromSia` in `core.js`). Later developments: display profiles
(tabs, check map), zone selection (lists, groups, RTBA aliases), computed MORA
grid (import of the ENR 6.1 chart abandoned: it has no grid), Python
generator and pdf.js removed. The table in § 1 describes the **initial** state of the folder.

## 1. What the folder contains

| Item | Role |
|---|---|
| `mission_editor.html` — “Complete mission generator” | YAML (`schema: helo-xp-mission`) / Markdown mission import, identification, texts, schema-less YAML editor, maps of the folder (ZIP delivered by the map generator), Markdown and **PDF** export (jsPDF). Draft: `missionGeneratorDraft`; hand-off to the map generator: `missionGeneratorHandoff`. |
| `map_parser.html` — “SIA aeronautical map studio” | SIA XML folder (folder selection, database remembered in IndexedDB `sia-map-parser`), background (local PNG, OSM raster or MapLibre vector, adjustable layers), mission (MD / YAML), R / D / P zones, CTR, TMA…, MORA (CSV / PDF), cities (GeoNames), **SVG / PNG / ZIP** outputs and assembly map. Settings: `siaMapSource`, `siaOsmLayers`, `siaCities`, `siaPopulation`, `siaDetailLayerProfile`, `siaFolderName`. |
| SIA data (AIRAC 2026-10-01) | `XML_SIA_2026-10-01.xml` (27 MB), `AIXM4.5_all_FR_OM_2026-10-01.xml` (44 MB), `sia-airspaces-2026-10-01.xml` (6 MB), `miam-enr-5-7-coordinates.xml` (MILAIP ENR 5.7: refuelling tracks), `mora.csv`, `villes_geonames.csv`, backgrounds `Carte france vierge*.png`. |
| Libraries | `maplibre-gl.js/.css`, `pdf.min.js` + worker, `jspdf.umd.min.js`, `js-yaml.min.js` (duplicate of `shared/mission_core/vendor/js-yaml.min.js`). |
| Own `.git` | **Nested git repository** (2 commits, PNG in Git LFS) — to be decided before integration (§ 4). |
| Backups `*.backup-20260924-*.html` | Intermediate versions (not to be integrated). |

Test data: `examples/missions/Mission 02.md` (air-to-air refuelling, SIMONE track, patrol
MISTRAL 41/42 + tanker VAILLANT 31), `data/missions/AIRLIFT_serie_1_precomplete/` (missions 11 to 15:
YAML `helo-xp-mission`, summaries, `maps_manifest.md`), `data/missions/MEDEVAC_serie_1..3_OSM/` (maps
produced: general, target, target detail, zone, assembly).

## 2. Integration into the suite (plan — carried out)

1. **Location**: keep `apps/sia/` as the application folder (☰ menu: “SIA missions ›
   Mission generator”, “SIA missions › Map studio”), existing theme and favicon
   (inline SVG favicon of the pages → file in `assets/`).
2. **Framework header**: `<header>` with `<h1>`, `repository_tree` at the top,
   `repository_nav.js`, `content_i18n.js`, `app_framework.js` at the end of the page; the
   “Send to the map generator” (« Transmettre au générateur de cartes ») button and the back link move into the header bar or
   into the actions of the ☰ menu (`RepositoryNav.addAction`).
3. **Hideable / movable blocks**: wrap the `<section>`s in a `<main>` (the framework
   only handles the blocks of a `<main>`), a stable `data-block-id` per section, secondary blocks
   hidden by default (`data-default-hidden="1"`: intermediate backups, analysed XML…).
4. **Shared components** instead of the duplicates: the framework's `js-yaml`; folder picker
   → `FileAccess` (“SIA XML” folder remembered and displayed, files opened in this folder);
   “paste its content” zone → `FileAccess.pastePanel` (× / “Close” / “Load” → “Confirm”);
   local backup (`browser_store`) of drafts and settings.
5. **Refuelling racetracks** (see § 3): in the studio, layer “AAR tracks (ENR 5.7)”
   drawn from `miam-enr-5-7-coordinates.xml` with `AarTracks`; in a mission, the
   designated track (SIMONE, point SIMIP / S1…) is found by proximity and drawn exactly.
6. **Bridges with CR**: the generated mission (`helo-xp-mission`) pre-fills a CR
   (family from `mission.type`, airfields, turning points, aircraft / callsigns); the
   common catalogue provides aircraft and callsigns (VAILLANT, MISTRAL…).
7. Documentation (`docs/SIA_XML.md`, README, changelog) and version.

## 3. Air-to-air refuelling racetracks — exact geometry

`miam-enr-5-7-coordinates.xml`: 126 points of the MILAIP ENR 5.7, by page, in the order of the
document, **without** track **names**. The points of a track follow one another: **IP** (entry), **CP** (end of track),
**S1** (exact middle of the track), then sometimes **S2**, offset **perpendicularly** to the track from S1:
centre of the return leg, hence the **width** and **side** of the pattern.

Verified example — SIMONE (Mission 02): SIMIP 46.444167 / 1.486 → SIMCP 47.231833 / 1.689:
**48 NM on 010°**, S1 in the middle (44.5 km from each end), S2 at **14.1 NM on 280°** →
return leg to the **west**, turns as semicircles of 14.1 NM diameter. S2 falls in the middle
of the computed return leg to within 117 m.

Inventory: 25 tracks recognised (48 NM and 30 NM), 4 of them with a measured width (S2); 47 points
remaining (EPT zones as quadrilaterals on page 5, irregular groups) to be handled separately.

`shared/aar_tracks.js`: `parsePages(xml)`, `groups(pages)` (IP / CP / S1 / S2, tolerances),
`racetrack(track, { defaultWidthNm, defaultSide })` → heading, length, width, side, outline
(polygon), return leg; `toGeoJson(tracks)` for MapLibre / SVG; `nearest(tracks, point)`
to find the track of a mission point.

### XML corrected and named from the MILAIP PDF

As the original XML is incomplete (no names, EPT points mixed in), a second file is produced
from the official PDF (`MIAM_OACI_ENR 5.7.pdf`, AMDT 10/24 of 05 SEP 24, pages 1 to 5):
`data/sia/miam-enr-5-7-tracks.xml` (the original file is kept).

- `parseEnr57(pageText)` (text extracted by pdf.js): named DMS points and decimal minutes,
  **compared**; IP / CP tracks / particular points; full names (table column: SIM →
  SIMONE, SCY → STACY); footnotes shared by all pages (3, 8, 9: 30 NM; 5: 40 NM;
  4: “do not break off to the west” (« ne pas dégager à l'ouest »); 6, 11); “heavy” tracks FOXnn → ROMnn in pairs.
- Rules of the MILAIP: straight legs of **48 NM** unless footnoted (30 NM for page 4), **width
  14 NM** (distance between two particular points); **side** given by S2 — unknown without S2
  (16 tracks: YVETTE, OLIVIA, ZOE, FABIOLA, TANIA, NADIA, KATIA, URSULA, REGINA, VIVIANE, ZORA,
  VALENTINA, TIPHAINE, OCEANE, STEPHANIE, ALOHA).
- `toXml(result)` → XML 2.0 (`miam:Track name kind page lengthNm expectedLengthNm widthNm
  heading side remark`, points with role ARIP / ARCP / S1 / S2 and their two original
  notations, list `miam:issues`); `parseTrackXml(xml)` reads it back; `trackRacetrack(track)` draws it.
- Result: 31 tracks + 6 heavy patterns. **Anomalies in the PDF** found:
  AMEIP (DMS 000°45'43.80W copied from LUCIP; decimal minutes 000°23.87'W kept → AMELIE
  30.1 NM) and A1 (0.3 NM, decimal minutes kept); TANIA, NADIA, KATIA, REGINA, TIPHAINE
  measure 30 NM without a footnote; URSULA 30 NM for a “40 NM” footnote and U at 3.7 NM from the middle;
  LUCIE 36.9 NM for 30 NM (L1 at 2.9 NM from the middle); DIANA 49.5 NM (D1 at 0.7 NM from the middle).

## 4. Answers (2026-09-24)

1. Nested repository: history replayed linearly under `apps/sia/`, nested `.git` removed.
2. AIRAC data outside the repository (`.gitignore`).
3. Incomplete XML: corrected by the named XML above.
4. Width: in the PDF (14 NM); side: only when S2 exists.
5. `*.backup-*` backups and command-line Python generator removed (replaced by the
   studio).
