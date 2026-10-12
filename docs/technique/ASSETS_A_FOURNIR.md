# Assets to supply — material designs

Tracking document for the images to produce (ChatGPT) so that each material design (Cabinet, Flight log (Carnet de vol) = `flightlog`,
Rugged (Durci) = `field`, Aqua) is nothing more than tokens and images with agreed names: see
[REFACTORING_TOOLKIT.md › Phase 2](REFACTORING_TOOLKIT.md#phase-2--remove-the-exceptions-ideas-30-september-2026).
Each delivered asset removes an exception from `shared/design_deco.js` or from `shared/designs_skeuo.css`.

**Up-to-date status: `python tools/assets_status.py`** (table by family and by design, list of missing items; `--new`: images
dropped since the last survey, `--mark`: record the survey). The boxes in this document date from 30 September 2026 and are
no longer kept up to date: the tool is authoritative. This document keeps the generation and integration instructions.

Delivered since: mission folders of the four designs (“My missions”); Cabinet and Flight log bookmarks; page device
of the Flight log (closed logbook + DME); panels of the Flight log **light tone** (parchment, blue engravings:
`shared/deco/flightlog/clair/`, `PANELS.flightlog.clair`) — 17 out of 18, aircraft in landscape missing. Light-tone panels of
Cabinet: 18 out of 18 (2 October 2026; `PANELS.cabinet.clair` without alias, old `ships` / `instruments` removed). Deliveries arrive
as they come, with improvements and duplicates: sorting (best version, replacement) is done at
integration; the sources stay in the drop folder.

## How to use

**State of an asset**: two boxes per asset. None ticked = to do; `livré` (delivered) = source PNG dropped in the target folder;
`intégré` (integrated) = WebP produced, code changed, page checked, exception removed.

**Generation (ChatGPT)**:

- attach to the request one or two existing images of the same design (paths given for each asset) as a style
  reference, and say so: « même matière, même lumière, même palette que l'image jointe »;
- ask for the closest native format (landscape 1536 × 1024, portrait 1024 × 1536, square 1024 × 1024): cropping
  to the final ratio is done at conversion;
- for a cut-out object: « fond transparent (PNG avec canal alpha), objet entier, rien de coupé au bord, ombre portée
  légère intégrée ou aucune »; if transparency fails, a plain neutral grey background to be cut out afterwards;
- never any readable text, logo, brand or real insignia, except the inscriptions required below;
- light coming from the top left for all designs (consistent with the objects already in place);
- drop the PNG as is in the target folder (ChatGPT's original name accepted); **source PNGs and sheets are
  never deleted** (neither those already present nor the new ones).

**Conversion to WebP** (ImageMagick 7, at the root of the repository):

```bash
# panneau paysage (w) : 1100 × 550, opaque
magick "source.png" -resize 1100x550^ -gravity center -extent 1100x550 -quality 86 shared/deco/<design>/<dossier>/panel-<thème>-w.webp
# panneau portrait (t) : 550 × 1100, opaque
magick "source.png" -resize 550x1100^ -gravity center -extent 550x1100 -quality 86 shared/deco/<design>/<dossier>/panel-<thème>-t.webp
# objet détouré : rogné à son contenu, plus grand côté limité (ici 480 px)
magick "source.png" -trim +repage -resize "480x480>" -quality 86 -define webp:alpha-quality=92 shared/deco/<design>/<nom>.webp
# frise de pied de page : 1394 px de large, opaque
magick "source.png" -resize 1394x -quality 86 shared/deco/<design>/footer.webp
```

Cutting from a sheet with several objects: `tools/icons_from_sheets.html` (local server, see `tools/README.md`).
After any new image: `python tools/bump_versions.py` (cache versions), then a check in a page of the
design, full decoration, light and dark tones, looking for console errors.

**Image families** (reminder from `design_deco.js`):

| Family | Role | Format | Files |
| --- | --- | --- | --- |
| `PANELS` | background of a block chosen by theme | opaque, 1100 × 550 (`w`) and 550 × 1100 (`t`) | `panel-<thème>-<w\|t>.webp` |
| `SHEETS` | register sheet under the tables of the registers (light tone) | pieces cut by `tools/cut_register_sheet.py` | `sheet-*.webp` |
| `PROPS` | object placed in the bottom right corner of a block | transparent, ≈ 300 to 450 px | free name, cited in `PROPS` |
| `SETS.between` | objects between the blocks | transparent, ≈ 150 to 480 px | free name, cited in `SETS` |
| `SETS.sides` | margin objects (large screens) | transparent, ≈ 250 to 450 px | free name, cited in `SETS` |
| `SETS.device` | page device (two objects side by side, movable) | transparent, 700 to 1000 px wide | free name, cited in `SETS` |
| `SETS.foot` | footer frieze | opaque, 1394 × 74 to 108 | `footer.webp` |
| Studio notebooks | map previews (`apps/cpco/map_parser.html`) | transparent | `notebook-closed.webp`, `notebook-open.webp` |

**Panel themes** (codes imposed by the program, `THEMES` array of `design_deco.js`, in this order):

| Code | Blocks concerned (patterns recognised in the title) | Subject of the panel |
| --- | --- | --- |
| `aircraft` | aircraft, aeroplane, fleet, performance, mass, balance | aircraft |
| `airfield` | aerodrome, airfield, runway, landing, SIA, ICAO | airfields and runways |
| `time` | day, night, hour, date, period, planning, ODV, weather | time, clocks, sky |
| `radio` | network, radio, frequency, sync, backup, import, export | communications |
| `nav` | map, route, navigation, profile, flight, fuel, wind, target | navigation |
| `gear` | equipment, materiel, cargo, medical, capabilities, load | equipment and payload |
| `awards` | results, success, assessment, summary, statistics, breakdown | awards, assessments |
| `families` | families, series, types, missions, categories | mission families |
| `ops` | everything else (default) | operations, work table |

**Panel composition rule** (common to all designs): the panel is shown as the block background, aligned right,
with a fade that erases it towards the left (`.repo-deco-panel`, mask from 12 % on the left to 100 % at 85 % of the width) and
a veil under the tables. The visual interest is therefore placed **in the right third and along the edges**; the centre and the
left half stay calm, low in contrast, without fine detail (text sits on them). Front view or slight top-down view, no
strong perspective, no frame or white margin around the image. The portrait (`t`) is not a crop of the
landscape: same subject recomposed vertically, the interest at the top and at the bottom right.

---

## 1. Aqua

Material: light brushed metal, frosted glass, translucent “gel” buttons, water, specular reflections, light blue to deep
blue; aesthetics of the desktop interfaces of the early 2000s. References: `shared/deco/aqua/bg-water.webp`
(water and glass), `shared/deco/aqua/gauge-case.webp` (chromed dial case), `shared/textures/brushed-light.webp`.
Aqua currently has only two images: it joins the common families only with the deliveries below.
Aqua has no stitched frame (`frame` absent from its entry in `repository_tree`): some common rules are
reserved for `html[data-skeuo="frame"]` (see 1.2).

### 1.1 Panels by theme (18 images)

- Target folder: `shared/deco/aqua/panels/`
- Files: `panel-<thème>-w.webp` and `panel-<thème>-t.webp` for the 9 themes (`aircraft`, `airfield`, `time`, `radio`,
  `nav`, `gear`, `awards`, `families`, `ops`)
- Format: landscape 1100 × 550 (`w`), portrait 550 × 1100 (`t`); opaque; source 1536 × 1024 / 1024 × 1536
- Style: light and bright background (the Aqua block is white glass in the light tone, a 35 % veil softens it), water and glass
  in layers, dominant blue (the Aqua accent colour is chosen by the user: stay within neutral blues,
  without any other strong hue); the theme's subject treated as glass silhouettes, reflections or light engraving, never as a busy
  realistic photo; same family as `bg-water.webp`

| Theme | Landscape `w` | Portrait `t` |
| --- | --- | --- |
| `aircraft` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `airfield` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `time` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `radio` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `nav` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `gear` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `awards` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `families` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `ops` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |

ChatGPT instruction (one request per theme, both orientations in a row):

> Fond décoratif pour un panneau d'interface, style « Aqua » des bureaux informatiques du début des années 2000 : verre
> dépoli, eau claire, reflets spéculaires, métal brossé clair, dominante bleu clair, même matière et même lumière que
> l'image jointe. Sujet : **<sujet du thème, voir le tableau des thèmes>**, traité en silhouettes de verre translucide ou
> en reflets dans l'eau, sans réalisme photographique. Composition : tout l'intérêt dans le tiers droit et sur les bords ;
> centre et moitié gauche très calmes, clairs, sans détail (du texte sera posé dessus). Vue de face, sans perspective,
> sans cadre, sans texte, sans logo. Format paysage 1536 × 1024. Puis la même scène recomposée en portrait 1024 × 1536,
> l'intérêt en haut et en bas à droite.

Integration:

1. Convert (commands from “How to use”) into `shared/deco/aqua/panels/`.
2. `design_deco.js`: add `aqua: { dir: 'panels', only: {} }` to `PANELS` (or `{ dir: 'panels' }` once `only` becomes
   optional, Phase 2 item 7).
3. Remove `BG.aqua` (four `aqua/bg-water` entries); `bg-water.webp` stays in the repository.
4. `designs_skeuo.css`: the Aqua-specific opacities of the `.repo-deco-bg-cover` backgrounds (`html[data-design="aqua"]` 35 % and
   50 % in dark) become the opacity of the Aqua panel; adjust the `--repo-veil` veil of the light tone and the dark tone.
5. **Exception removed**: `BG.aqua`. Together with 2.1 (Flight log), the `BG` family no longer has any user: `BG`, step 1
   of `backgrounds()` and the `data-deco-bg` attributes of the pages (`map_parser.html`, `mission_editor.html`,
   `flight_performance_planner.html`, `map_planner.html`, `global_reporting.js`) can go.

### 1.2 Studio notebooks (2 images)

- [ ] livré · [ ] intégré — `shared/deco/aqua/notebook-closed.webp`: closed notebook, portrait, transparent, source
  1024 × 1536, delivered ≈ 600 × 880
- [ ] livré · [ ] intégré — `shared/deco/aqua/notebook-open.webp`: notebook open flat, landscape, transparent, source
  1536 × 1024, delivered ≈ 900 to 1000 px wide

Constraints: same framing and proportions as `shared/deco/flightlog/notebook-*.webp` and `shared/deco/field/notebook-*.webp`
(top view, whole notebook, light shadow or none); open pages **blank and light** (the map is placed
on them), very light ruling or none; closed notebook fitting within the height of the open notebook. Aqua material:
cover in bluish translucent plastic or brushed aluminium, gel-button clasp, chromed binding.

ChatGPT instruction:

> Carnet de notes vu exactement de dessus, style « Aqua » début des années 2000 : couverture en plastique translucide
> bleu clair et aluminium brossé, fermoir en bouton gel, reliure chromée ; même matière que l'image jointe. Carnet entier,
> fond transparent, aucune inscription. 1) Fermé, format portrait. 2) Le même ouvert à plat, deux pages blanches vierges
> (réglure à peine visible), format paysage, pages bien dégagées sans objet posé dessus.

Integration:

1. Convert (cut-out object, without `-resize` if the size is suitable); note the ratio of the open notebook (width / height).
2. `apps/cpco/map_parser.html` (notebook rules): add
   `html[data-design="aqua"]{--nb-closed:url(".../aqua/notebook-closed.webp");--nb-open:url(".../aqua/notebook-open.webp");--nb-ratio:<L>/<H>;--nb-pad:<haut> <droite> <bas> <gauche>}`
   (margins of the map on the pages, in %).
3. The notebook rules are reserved for `html[data-skeuo="frame"]`: Aqua has none. Either they switch to the presence
   of the tokens (common component `.repo-notebook`, Phase 2 item 5), or Aqua receives `frame:true` (to be ruled out: the stitched
   frame is not part of its material). Recommended choice: the common component.
4. **Effect**: no Aqua-specific rule; the notebook becomes a component common to all material designs.

### 1.3 Register sheet (1 board + pieces)

- [ ] livré · [ ] intégré — source board in `shared/deco/aqua/` (free name, cited in `CONFIGS['aqua']['src']`)
- [ ] livré · [ ] intégré — (optional) `shared/deco/aqua/sheet-head.webp`, transparent header
- [ ] livré · [ ] intégré — (optional) `shared/deco/aqua/sheet-stamp.webp`, transparent stamp
- [ ] livré · [ ] intégré — (optional) `shared/deco/aqua/sheet-string.webp`, accessory placed on the left edge,
  transparent, portrait (≈ 170 × 650)

Board: portrait, source 1024 × 1536, opaque; **follow the common rule of chapter 5** (blank paper, straight edges,
separate pieces). Object: a white sheet held in an Aqua clipboard (tray of bluish translucent plastic
or brushed aluminium, chromed clip with a gel button at the top), regular edges on all four sides, distinct corners. The
frame must be cuttable into four corners + four repeatable edges: no unique element in the middle of a side
(the clip goes in a corner, or is delivered separately like the header).

ChatGPT instruction:

> Porte-documents vu exactement de face, parfaitement à plat, sans perspective : plateau de plastique translucide bleu
> clair aux bords arrondis, pince chromée à bouton gel dans le coin supérieur gauche, style interface « Aqua » début des
> années 2000, même matière que l'image jointe. Il tient une feuille de papier blanc **entièrement vierge** (ni tableau,
> ni ligne, ni texte). Bords du plateau parallèles aux bords de l'image, épaisseur régulière, éclairage uniforme ; le
> plateau occupe toute l'image avec une marge de 40 px. Format portrait 1024 × 1536.

Integration:

1. `tools/cut_register_sheet.py`: add an `'aqua'` configuration to `CONFIGS` (coordinates measured on the board:
   `tl`, `tr`, `bl`, `br`, `top`, `bot`, `left`, `right`, empty `pieces`, `paper`) without `erase` or `shear`; run
   `python tools/cut_register_sheet.py aqua`.
2. `design_deco.js`: `SHEETS.aqua = SHEET_BLOCKS` (or `SHEETS` extended to all designs that have pieces, Phase 2).
3. `designs_skeuo.css`: block `html[data-design="aqua"]{--sheet-*…;--sh-*…}` with the tokens displayed by the script
   (or written by it, Phase 2 item 4); `--sheet-head`, `--sheet-stamp`, `--sheet-string` set to `none` if not delivered.
4. `python tools/bump_versions.py`, check a register (“Mission registry”, light tone).
5. **Effect**: Aqua receives the common sheet; no additional exception.

### 1.4 Page device (2 objects)

- [ ] livré · [ ] intégré — `shared/deco/aqua/<objet-principal>.webp` (descriptive name in English, e.g. `radio`), transparent,
  ≈ 700 to 1000 px wide
- [ ] livré · [ ] intégré — `shared/deco/aqua/<objet-compagnon>.webp`, transparent, ≈ 500 to 700 px wide

Selection rule: a main device related to air operations (reception, transmission, navigation, weather) and a
smaller companion object related to it (cable, headset, notebook, stand); both seen from the front at the same eye
level, placed on the same plane, at the same apparent scale; Aqua material (coloured translucent shell, brushed aluminium,
gel keys, screen with reflections). Framing models: `shared/deco/cabinet/radio.webp` + `notebook.webp`,
`shared/deco/field/radio.webp` + `cable.webp`.

ChatGPT instruction:

> Deux objets séparés, vus de face à hauteur d'œil, sur fond transparent, style « Aqua » début des années 2000 (coque en
> plastique translucide bleu, aluminium brossé, boutons gel, reflets spéculaires, même matière que l'image jointe) :
> 1) un appareil d'opérations aériennes de ton choix (poste radio, récepteur de navigation, station météo…), large ;
> 2) un objet compagnon plus petit qui l'accompagne naturellement. Même lumière, même échelle, sans texte ni logo.

Integration: `design_deco.js`, `SETS.aqua.device = [['<principal>', <hauteur px>], ['<compagnon>', <hauteur px>, <inclinaison>]]`,
`deviceAt: 3`. **Effect**: Aqua receives the common page device.

### 1.5 Objects (between the blocks, margins, block corners)

- [ ] livré · [ ] intégré — 3 block-corner objects (`PROPS`): `order.webp`, `tag-secret.webp`, `dossier.webp`
  (same names and same roles as Cabinet: mission order, restricted-distribution label, reports folder;
  common names will allow a single `PROPS` list), transparent, ≈ 320 × 440 or 440 × 175
- [ ] livré · [ ] intégré — 4 to 6 objects between the blocks (`SETS.between`), transparent, 150 to 480 px, rather flat and
  elongated (they sit in the gap between two blocks)
- [ ] livré · [ ] intégré — 5 to 8 margin objects (`SETS.sides`), transparent, 250 to 450 px, silhouettes readable at
  small size
- [ ] livré · [ ] intégré — (optional) `footer.webp`, footer frieze 1394 × ≈ 90, opaque

Selection rule: each object evokes a field of the airline (navigation, communications, weather, documents, cockpit
instruments) and stays within the Aqua vocabulary (glass, aluminium, gel, water); no duplicate subject between `between` and
`sides`; variety of shapes (round, elongated, square) for alternation. One sheet of 4 to 6 objects per request, cut
afterwards in `tools/icons_from_sheets.html`, keeps scale and light consistent.

ChatGPT instruction:

> Planche de 4 à 6 objets séparés, bien espacés, sur fond transparent, style « Aqua » début des années 2000 (verre
> translucide bleuté, aluminium brossé, boutons gel, reflets spéculaires), même matière et même lumière que l'image
> jointe. Chaque objet évoque un domaine différent des opérations aériennes (navigation, transmissions, météo, documents,
> instruments) ; formes variées ; vus de face ou de dessus ; sans texte ni logo.

Integration: `design_deco.js`, entries `PROPS.aqua` (same patterns as Cabinet), `SETS.aqua.between`, `SETS.aqua.sides`,
and `SETS.aqua.foot` if the frieze is delivered. **Effect**: Aqua has all the common families; no Aqua decoration
is a special case any more.

---

## 2. Flight log (`flightlog`)

Material: navy leather, fine gold lines (plans, compass roses, relief), riveted aluminium, cockpit dials, flight plan
on cream paper. References: `shared/deco/flightlog/bg-aircraft.webp`, `bg-aerodromes.webp`, `bg-families.webp` (style
of the current backgrounds, to be reused for the panels), `footer.webp`, `notebook-*.webp`.

### 2.1 Panels by theme (18 images)

- Target folder: `shared/deco/flightlog/panels/`
- Files: `panel-<thème>-w.webp` and `panel-<thème>-t.webp`, 9 themes
- Format: 1100 × 550 and 550 × 1100, opaque; source 1536 × 1024 / 1024 × 1536
- Style: dark navy leather or canvas, subject in fine gold or ivory lines in the manner of an engraving, like the current `bg-*` backgrounds;
  a single set for both tones (the current backgrounds already serve both); the aircraft plans `blueprint-*.webp`
  can serve as a model for `aircraft`

| Theme | Landscape `w` | Portrait `t` |
| --- | --- | --- |
| `aircraft` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `airfield` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `time` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `radio` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `nav` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `gear` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `awards` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `families` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `ops` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |

ChatGPT instruction:

> Fond décoratif pour un panneau d'interface : cuir bleu marine sombre, dessin au trait fin doré et ivoire façon gravure
> technique aéronautique, même style, même palette et même grain que l'image jointe. Sujet : **<sujet du thème>**.
> Composition : l'intérêt dans le tiers droit et le long des bords, centre et moitié gauche presque unis (du texte clair
> sera posé dessus). Vue de face, sans perspective, sans cadre, sans texte lisible, sans logo. Paysage 1536 × 1024, puis
> la même scène recomposée en portrait 1024 × 1536.

Integration:

1. Convert into `shared/deco/flightlog/panels/`.
2. `design_deco.js`: `PANELS.flightlog = { dir: 'panels', only: {} }`; remove `BG.flightlog`.
3. `designs_skeuo.css`: remove the ten plan rules (`html[data-design="flightlog"][data-decor="full"] .repo-block::before`
   and the `data-deco-n` / dark-tone variants, `blueprint-*.webp`); the specific opacity `html[data-design="flightlog"] .repo-deco-bgimg.repo-deco-bg-cover`
   becomes that of the panel; adjust the `--repo-veil` veil.
4. The `bg-*.webp` and `blueprint-*.webp` files stay in the repository (reusable as objects or references).
5. **Exceptions removed**: `BG.flightlog`, the design-specific plans (`::before` numbered by `data-deco-n`).

### 2.2 Page device (2 objects)

- [ ] livré · [ ] intégré — `shared/deco/flightlog/<objet-principal>.webp`, transparent, ≈ 700 to 1000 px wide
- [ ] livré · [ ] intégré — `shared/deco/flightlog/<objet-compagnon>.webp`, transparent, ≈ 400 to 600 px wide

Selection rule: cockpit or navigation equipment from the 1940s to the 1960s (dismounted instrument panel, cockpit set,
navigation bag, headset and microphone…), riveted aluminium, black Bakelite, navy leather, brass; the companion object
relates to the main one; both seen from the front, same light, same scale. Do not reuse the objects of Cabinet
(`radio.webp`, `notebook.webp`) or of Rugged. References: `gauge-case.webp`, `footer.webp` (instrument panel on the left).

ChatGPT instruction:

> Deux objets séparés, vus de face à hauteur d'œil, fond transparent, aviation des années 1940 à 1960 : aluminium riveté,
> bakélite noire, cadrans à fond noir, cuir bleu marine, laiton ; même matière et même lumière que l'image jointe.
> 1) un appareil de bord ou de navigation de ton choix, large ; 2) un objet compagnon plus petit qui l'accompagne.
> Sans texte lisible ni logo.

Integration: `design_deco.js`, `SETS.flightlog.device = [[…], […]]`, `deviceAt: 3`. **Effect**: Flight log joins
Cabinet and Rugged (common page device).

---

## 3. Cabinet, light tone (`shared/deco/cabinet/1930/clair/`)

**Delivered and integrated on 2 October 2026** (9 themes × 2): this chapter now only serves as a model for a light “1800” set.

Material: ivory parchment, pale blue watercolour coastal charts, brass instruments, engravings of ships; see
`1930/clair/panel-ships-w.webp`, `panel-instruments-w.webp`, `panel-nav-w.webp`. The light set has only four subjects
(`aircraft`, `nav`, `ships`, `instruments`): `PANELS.cabinet.clair.alias` maps seven themes to them and
`only: { instruments: 'w' }` records the absence of a portrait.

Possible reuse (copy, without deleting the original): `panel-ships-*` → `panel-ops-*` and `panel-instruments-w` →
`panel-gear-w`. In that case only the five other themes and `panel-gear-t` (= “instruments” in
portrait) remain to be produced.

- Format: 1100 × 550 and 550 × 1100, opaque; source 1536 × 1024 / 1024 × 1536
- Style: plain ivory background over at least the left half, subject in fine engraving and pale watercolour, brass objects at the
  edges; same paper grain and same palette as the four existing light panels (the 82 % ivory veil partly
  covers them)

| Theme | Landscape `w` | Portrait `t` | Remark |
| --- | --- | --- | --- |
| `airfield` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `ops` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | or copy of `panel-ships-*` |
| `families` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `awards` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `gear` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | `w`: or copy of `panel-instruments-w`; `t`: the portrait “instruments” |
| `radio` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `time` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |

ChatGPT instruction:

> Fond décoratif pour un panneau d'interface, cabinet de navigation des années 1930 en version claire : parchemin ivoire,
> gravure fine à l'encre sépia et aquarelle bleu pâle, instruments de laiton posés sur les bords ; même papier, même
> palette et même lumière que l'image jointe. Sujet : **<sujet du thème>**. Composition : moitié gauche et centre en
> parchemin presque uni ; l'intérêt dans le tiers droit et aux coins. Vue de dessus, sans perspective, sans cadre, sans
> texte lisible. Paysage 1536 × 1024, puis la même scène recomposée en portrait 1024 × 1536.

Integration:

1. Convert into `shared/deco/cabinet/1930/clair/` (and copy `ships` / `instruments` under the theme names if that choice
   is made).
2. `design_deco.js`: `PANELS.cabinet.clair = { dir: '1930/clair', only: {} }` (no more `alias`).
3. **Exceptions removed**: `PANELS.cabinet.clair.alias` and the content of `PANELS.cabinet.clair.only`.

Outside generation: the “1800” set (`shared/deco/cabinet/1800/`, PNGs already dropped) awaits its conversion; once its
18 panels are converted, replace `'1930'` with `'1800'` in `PANELS.cabinet.dir` and `clair.dir` (a light “1800” set
would then have to be produced on the same model as this chapter).

---

## 4. Rugged (`field`)

Material: chipped olive paint, riveted steel, cables, indicator lights, stencils; references `panel-awards-t.webp`,
`panel-families-t.webp`, `panel-radio-w.webp`, `radar.webp`, `plate-defa.webp`.

### 4.1 “awards” and “families” panels in landscape (2 images)

- [ ] livré · [ ] intégré — `shared/deco/field/panel-awards-w.webp`
- [ ] livré · [ ] intégré — `shared/deco/field/panel-families-w.webp`

Format: 1100 × 550, opaque, source 1536 × 1024. Style: same olive sheet metal, same lighting and same density of objects as
the other Rugged `panel-*-w.webp`; the panel is darkened on display (`brightness(.72)`): no very
dark area in the centre. Subject: take that of the portraits `panel-awards-t.webp` / `panel-families-t.webp` (attach them) and
recompose it in width.

ChatGPT instruction:

> Même panneau que l'image jointe (tôle peinte olive, acier riveté, équipements militaires de terrain, même lumière et
> même usure), recomposé en paysage 1536 × 1024 : l'intérêt dans le tiers droit et sur les bords, centre et moitié gauche
> en tôle presque unie. Vue de face, sans perspective, sans texte lisible.

Integration: convert; `design_deco.js`, `PANELS.field = { dir: '', only: {} }`. **Exception removed**: the content
of `PANELS.field.only`. (Moving the Rugged panels into `field/panels/`, Phase 2 item 7, is a move of
files, not an asset.)

### 4.2 Footer frieze as a single image (1 image)

- [ ] livré · [ ] intégré — `shared/deco/field/footer.webp`

Format: 1394 × ≈ 100 (very elongated strip, ratio ≈ 14 : 1), opaque; source 1536 × 1024 from which a strip is kept, or
better a landscape sheet where the frieze takes up the whole width. Models: `shared/deco/cabinet/footer.webp`,
`shared/deco/flightlog/footer.webp` (objects of the material placed side by side, edge to edge).

Content: olive console seen from the front with, from left to right, a green radar screen (off or frozen, taken from `radar.webp`),
the plate (`plate-defa.webp`: the only inscription allowed, copied from the attached image), then console elements
(switches, grilles, indicator lights); **leave on the right an area of plain sheet metal of about 220 × 90 px** where the
backup indicator will be placed (common component, not in the image).

ChatGPT instruction:

> Bande décorative horizontale très allongée (rapport 14 : 1) : pupitre de console militaire de terrain vu de face, tôle
> peinte olive, acier riveté ; de gauche à droite un écran radar vert à fond noir, une plaque gravée identique à l'image
> jointe, des interrupteurs à capot et des grilles d'aération ; l'extrémité droite reste une tôle unie sans objet. Même
> matière et même lumière que les images jointes, sans autre texte.

Integration:

1. Convert; `design_deco.js`, `SETS.field.foot` identical to Cabinet and Flight log (`<img class="repo-deco-strip">`),
   backup indicator moved out into a common component (Phase 2 item 6: `state()` and the `.repo-deco-status` button serve
   all designs, styled by tokens).
2. Remove the Rugged frieze HTML, the computation of the radar delays in `render()`, and in `designs_skeuo.css` the
   rules `.repo-deco-radar*`, `.repo-deco-plate-img`, the grid `html[data-design="field"][data-decor="full"] .repo-deco>…`.
3. **Exception removed**: the Rugged-specific HTML frieze.

Decision to take before integration: the radar animation (sweep and blips) disappears with the frieze as an image, unless
it is made into an optional common element placed on the frieze (area in % declared by tokens).

---

## 5. All sheet designs: “clean” register sheet boards

Today the source boards have a table printed, a header and a stamp in the paper, and sometimes a flared
edge: `tools/cut_register_sheet.py` erases the inside of the corners (`erase`), straightens the edges (`shear`), punches out the
header pieces and filters the paper (median) to remove the lines. Clean boards remove these settings.

| Design | Blank board | Header `sheet-head` | Stamp `sheet-stamp` |
| --- | --- | --- | --- |
| Cabinet | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| Flight log | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| Rugged | [ ] livré · [ ] intégré | not applicable (`none`) | not applicable (`none`) |
| Aqua | see 1.3 | see 1.3 | see 1.3 |

Common rule (board):

- portrait, source 1024 × 1536, opaque;
- same object as the design's current board (“Aéronautique navale” folder of Cabinet, canvas-bound flight logbook,
  olive pouch of Rugged): attach the current board (`CONFIGS[<design>]['src']` in the script);
- **seen exactly from the front, without perspective**: frame edges parallel to the image edges, regular thickness on
  each side (no flared edge);
- **entirely blank paper**: no table, no lines, no header, no stamp, no text; regular grain and tint,
  uniform lighting (no vignetting);
- repetitive edges (top, bottom, left, right): no unique element in the middle of a side, the unique elements
  (tabs, clip, dog-eared corner, fastener) in the corners;
- the left-edge accessories are still delivered separately (`sheet-string.webp`, unchanged).

Common rule (pieces): transparent PNG, sharp edges, without paper around (the ink alone, or the stamp alone), flat,
at the same scale as the board: header ≈ 745 × 185 for Flight log, ≈ 300 × 270 for Cabinet; stamp ≈ 500 × 300.
Required inscriptions: reproduce identically those of the current pieces (`sheet-head.webp`, `sheet-stamp.webp` of the
design, to be attached).

ChatGPT instruction (board):

> Même objet que l'image jointe, redessiné vu exactement de face et parfaitement à plat, sans perspective : bords
> parallèles aux bords de l'image, épaisseur régulière. Le papier est **entièrement vierge** : aucun tableau, aucune
> ligne, aucun texte, aucun tampon ; teinte et grain réguliers, éclairage uniforme. Même matière, mêmes coins, même
> couleur. Format portrait 1024 × 1536, marge de 40 px autour de l'objet.

ChatGPT instruction (piece):

> Reproduis uniquement **l'en-tête imprimé** (ou : **le tampon**) de l'image jointe, à l'identique, vu à plat, sur fond
> transparent, sans le papier autour, encre légèrement usée.

Integration:

1. Drop the board and the pieces into `shared/deco/<design>/`; convert the pieces directly into
   `sheet-head.webp` / `sheet-stamp.webp` (cut-out object).
2. `tools/cut_register_sheet.py`: new `src`, coordinates measured on the board, `pieces: {}`, no `erase` or
   `shear`; the `paper` area can be taken directly from the blank interior.
3. Rerun `python tools/cut_register_sheet.py <design>`, carry over the `--sh-*` tokens (and `--sh-head-*`,
   `--sh-stamp-*` according to the size of the pieces), `python tools/bump_versions.py`, check a register in the light tone.
4. **Exceptions removed**: once the three designs are redone, the functions `erase()` and `sheared()`, the options
   `erase` / `shear` / `y0` and the punching of the pieces disappear from the script; the median filter of the paper becomes unnecessary.

---

## 6. All designs: page tabs (`shared/deco/<design>/tabs/`)

The tabs at the top of the page (the four Settings pages, generator ⇄ studio, and any page grouped later in
`REPOSITORY_TREE.tabs`) are a framework component (`repository_nav.js`) dressed per design in `designs_skeuo.css`
(section “ONGLETS DE PAGE” (page tabs)): while waiting for the images, engraved screwed plates (Cabinet, Rugged), dark push buttons
ringed with brass with an amber indicator (Flight log), glass and gel (Aqua). Three images per design, optional:

| File | Content | Shape |
|---|---|---|
| `tabs/rail.webp` | rail or engraved tinplate plate that carries the tabs, screws at both ends | horizontal strip, ~1200 × 56, transparent background outside the rail |
| `tabs/tab.webp` | released push button (page not displayed), **without text** | ~240 × 44, transparent around |
| `tabs/tab-on.webp` | same push button pressed and lit (current page), **without text** | same size and same framing as `tab.webp` |

- **Without text**: the labels (4 languages, variable lengths) are placed by the page, engraved or printed by the
  style sheet (ink, drop shadow of the design). Leave in the centre a plain, readable area of at least 60 % of the
  width.
- **9-slice cutting** (`border-image`): the corners and the ends (screws, rivets, end caps) stay at their size, the
  middle stretches in width. Keep the ends within the ~24 px of each side (rail: ~40 px), the middle uniform
  (no pattern that would betray the stretching).
- `tab.webp` and `tab-on.webp` exactly superimposable: only the state changes (pressing, light, indicator).
- **Board**: one image with a transparent background with the released push button, the pressed push button and the rail (plus, if
  desired, an assembled preview), stored under `docs/planches/onglets_<design>.webp`; `tools/cut_tabs.py` extracts the three
  images from it according to its framings (`CONFIG` table, measured when the board arrives), then the section “onglets en
  images” (tabs as images) of `designs_skeuo.css` assembles them (`border-image`) — without touching the pages. Two assemblies:
  “plates” (Flight log: the plate from the board placed on the rail, which runs across the whole width) and
  “cells” (Cabinet: windowed rail — each tab is a cell of the rail with the push button inside, the cells
  placed side by side rebuild the bar, closed by its end caps).
- Third assembly, “assembled bar” (Rugged: bar delivered in one piece): cells taken as they are from one canvas opening to
  the next, indicator of the lit cell cut out separately (`tabs/led.webp`, placed back in the centre of the current
  tab: it does not stretch) and erased from the cell, strap extended across the whole width.
- **Border**: frame with rounded corners (`docs/planches/lisere_laiton.webp`, `lisere_acier.webp`) placed around the block that
  follows the tab bar (`.repo-tabs + main`) to designate it as the page of the tabs — brass for Cabinet,
  steel (aluminium) for Flight log, Rugged and Aqua (`tabs/lisere.webp`, `LISERE_OF` table of `cut_tabs.py`).
- Done: Cabinet (windowed brass bar, push buttons with amber indicator), Flight log (labels in an aluminium
  frame on a bare bar; swapped on 6 October 2026: the brass goes to Cabinet, the aluminium to Flight log), Rugged (canvas strap, screwed frames, indicator), borders of the four designs. To come: Aqua tabs
  (meanwhile: glass and gel drawn by the tokens, rail across the whole width of the page).
- Status: `python tools/assets_status.py` (family “Onglets de page” (page tabs)).

---

## Recommended order

From the largest number of exceptions removed to the smallest (the effort is given in brackets):

1. **Flight log, panels** (18 images) — removes `BG.flightlog` and the ten plan rules of `designs_skeuo.css`.
2. **Aqua, panels** (18 images) — removes `BG.aqua`; together with item 1, the whole `BG` family and the
   `data-deco-bg` attributes of the pages disappear.
3. **Rugged, frieze as a single image** (1 image, plus the common component of the indicator) — removes the HTML frieze, the radar code
   and about ten Rugged-specific CSS rules.
4. **Light Cabinet** (5 to 7 themes × 2, or copies) — removes `alias` and the missing orientations of the light set.
5. **Rugged, two landscape panels** (2 images, quick win) — empties `PANELS.field.only`; together with 1, 2 and 4, `only` disappears
   from `PANELS` and from `panelOf()`.
6. **Clean sheet boards** (3 boards + 4 pieces) — removes `erase`, `shear` and the punching of the pieces from the script.
7. **Aqua, sheet, notebooks, objects** — removes no exception but brings Aqua into the common families
   (`SHEETS`, `PROPS`, `SETS`, notebooks).
8. **Page devices** of Flight log and Aqua (2 × 2 objects) — same page device for all material designs.
