# Toolkit refactoring (common framework of the suite)

> **Announcement**: an upcoming major version of the suite will bring a **big change to the toolkit** (common core of
> `shared/`: header, side bar, blocks, designs, decorations, icons). The pages will keep working the same way, but
> their appearance in the material designs (Cabinet, Flight log, Rugged, Aqua) may shift slightly. This
> document describes the findings, the plan and the progress.

Scope: the common core of `shared/` — `repository_nav.js`, `app_framework.js`, `block_icons.js/.css`,
`design_deco.js`, `designs.css`, `designs_skeuo.css`, `repository_nav.css`, `appearance_page.js`, `browser_store.js`,
`file_access.js`, `suite_update.js` — and the generator `tools/build_skeuo_icons_css.py`. The business code of the
applications (reporting, CR, planner, studio…) is only touched where it depends on the core.

## Findings (September 2026)

1. **Designs described in five places**: `repository_nav.js` (automatic palette and relief of the charts, icon
   set → folder, logo), `design_deco.js`, `build_skeuo_icons_css.py`, `appearance_page.js`, and the CSS (list of the
   four material designs copied 63 times). Adding a design or a setting touched five files.
2. **`designs_skeuo.css`: stacked exceptions** — 695 lines, 262 `!important` (719 in all the core's CSS),
   ~160 rules per design that often say the same thing again (`.repo-block` overridden 77 times, `.repo-block-tools` 32,
   `.repo-header` 22); tokens little used.
3. **Page rules in the core**: 63 selectors `.mc-*` (Mission Core), `.ap-*`, `.fp-*`, “CR” and
   “Planner” sections in `designs_skeuo.css`; 6 pages have their own `:root` palette that the core has to counter
   (failed contrasts of the ODV planning).
4. **Copied utilities**: HTML escaping (21 copies), translation of a `[fr, en, de, es]` row (20 files),
   protected `localStorage` (~25), luminance and WCAG contrast (3 implementations).
5. **Compacted code**: 944 lines of more than 200 characters in `shared/`.

## Plan — four independent workstreams

| Workstream | Content | Risk | State |
|---|---|---|---|
| **D. Common toolkit** | `shared/kit.js` (`window.RepositoryKit`): `esc`, language (`lang`, `langIndex`, `t`), protected storage (`store`), colours (`color`: reading, hex, luminance, WCAG contrast, HSL, hue / saturation, lightness). Loaded by each page just before `repository_nav.js`; the core modules use it instead of their copies. Compacted code reformatted along the way, file by file. | low, no visual effect | **done** (core); application modules as we go |
| **A. Single design registry** | `REPOSITORY_TREE.designs.list` becomes the only source: `skeuo` (material design), `chart` (automatic palette), `icons` (default set, images in `shared/icons/skeuo/<design id>`), `emblem`, `css`. Read by `repository_nav.js` (charts, logo, icon folder, attribute `html[data-skeuo]`), `appearance_page.js` (`appearance.iconFolder`), `build_skeuo_icons_css.py` (icon sets). The CSS shared by the material designs is written `html[data-skeuo]` instead of the list of the four designs. | low | **done** |
| **B. Token-based CSS** | Set of component variables per design (`--sk-*`: surfaces, ink, borders, buttons, bars, block); components written once for all material designs; per design, only what is unique (textures, rivets, frames). Goal: `designs_skeuo.css` < 400 lines, < 60 `!important`. | high (visual) | **done** (first pass, see below) |
| **C. Move the page exceptions out** | Rules `.mc-*`, `.fp-*`, CR, planner in the CSS of their application, on the core's tokens; the pages drop their colour `:root` for the shared tokens. | medium | **in progress** — rules moved (see below); `:root` palettes of the pages still to do |

Order: D, A (done), then B design by design with C page by page. Each step: one commit on `develop`, checked on
the reference pages (reporting, CR, studio, planner, ODV planning, Appearance; light and dark tones; console without
errors, before / after screenshots). No published version before the end of B.

## Progress of B and C (30 September 2026)

Verification: bench `tools/skeuo_regression.html` (computed styles of ~60 components, pseudo-elements included, on six
reference pages, four designs, two tones) — **no difference** after each step, except the intended fix below.

- **Tokens `--sk-*`** (103) defined in each design and tone; **shared components** written once
  (`html[data-skeuo]`): header, menu and language buttons, menus, blocks, subtitles, sub-cards, drop
  zones and their “Choose” button, notices, fields, buttons (hover, disabled), link-buttons, side bar,
  footer, action bar, block tools, Appearance window. The Aqua buttons carry their tokens on themselves (local
  gel: red of the “danger” buttons).
- **Moved out of the core**: Mission Core rules → `shared/mission_core/core.css`; mission editor cards →
  `mission_editor.html`; charts, dials and sliders → `flight_performance_planner.html`; Aqua thumbnails of
  the Appearance page → `appearance_page.js`. The core keeps the tokens (`--sk-hb*`, `--sk-pop*`, `--sk-card*`, `--sk-chart-*`…).
- **Fix**: a comment without an opening neutralised the rule for Rugged's screws (cross-head screws cut out of
  the sheet: now applied).
- **Registry**: `frame` (stitched frame: Cabinet, Flight log, Rugged → `html[data-skeuo="frame"]`) and `base`
  (variant: Flight log → Cabinet, `html[data-design-base="cabinet"]`) replace all the lists of designs
  in the CSS; title plates and their screws, text colours of the blocks, status bars: shared components of the
  framed designs (tokens `--sk-plate-*`, `--sk-screw`, `--sk-label-ink`, `--sk-status-*`).
- **Figures** (`designs_skeuo.css`, before → after): design lists `:is(…)` 96 → 0; `!important` 551 → 318;
  98.8 → 90.8 KB; 119 tokens; rules targeting a specific design: Cabinet 104 → 9, Flight log 125 → 28, Rugged
  111 → 74, Aqua 87 → 43; 723 lines (the tokens at the top of each design; 400-line goal not reached:
  the materials remain very detailed).
- **Remaining** (deliberately design by design, little overlap): segmented selectors, code badges;
  `:root` palettes of the 6 pages that have one (workstream C).

## Phase 2 — remove the exceptions (ideas, 30 September 2026)

Principle: a material design = tokens and images with agreed names; no more rules or JS settings that
name a design, except the materials themselves. State: rules targeting a specific design in `designs_skeuo.css`:
Rugged 77, Aqua 43, Flight log 30, Cabinet 9 (+ 54 through the Cabinet base); `!important` 320.

### Code

1. **Missing tokens** (Rugged above all, then Aqua, Flight log): text colours of blocks and cards, links,
   focus ring, table backgrounds, code badges, segmented selectors, warn / ok / err states, chart axis;
   Rugged's condensed font repeated in 8 rules → `--sk-font-display`. Goal: Rugged ≤ 15 own rules.
2. **Surface tonality**: Rugged is “light” by its page but its blocks are dark; hence exceptions (veil of the
   panels, ink of the sheet, darkened panels). Declare the tonality of the block surfaces per design and per tone
   (`surface:"dark"` in the registry → `html[data-surface]`) and write these rules once against it.
3. **CSS layers** (`@layer base, page, skin`): the core, the page styles and the material designs in three
   ordered layers; the designs win without `!important` (320 → a few). The most profitable workstream, but
   it touches every page (page styles to be placed in `@layer page`): to be done with the regression bench.
4. **Ledger sheet**: default values of the `--sh-*` tokens (header, stamp, accessory, margin: absent) on the
   shared rule; a design only declares what it has. `cut_register_sheet.py` writes the token block itself
   (imported file `shared/deco/<design>/sheet.css`, or rewritten tagged section) instead of displaying it.
5. **Notebook of map previews**: the rule is in the Studio page; make it a shared component
   (`.repo-notebook`, tokens `--nb-*`) reusable by other galleries (Reporting, ODV planning).
6. **Declarative page decoration** (`design_deco.js`): Rugged's frieze (radar, plate, indicator light) is HTML specific to the
   design; the backup indicator light is a real function → shared component styled by each design; friezes described
   by a list of elements (`strip`, `radar`, `plate`, `status`). Rugged's side handles (`body::before/after`,
   `overflow-x:clip`) → ordinary margin objects (`SETS.sides`) or removed.
7. **Panels**: `PANELS.field.dir:''`, `only`, `clair.alias` (7 themes of light Cabinet mapped to 3 panels)
   disappear if each design has the 9 themes × 2 orientations in `shared/deco/<design>/panels/` (see assets).
8. **Image check** (`tools/check_assets.py`, called by `bump_versions.py`): actual format = extension
   (`chart.webp` was a 2.9 MB PNG), maximum weight and dimensions per family, expected transparency.
9. **Flight log inherits from Cabinet** (`base:"cabinet"`): it now has its sheet, its notebooks and its backgrounds;
   review what still goes through the base (54 rules) and keep only what is really shared (frame, plates, screws).

### Assets to provide or redo

Detailed tracking (generation instructions, integration): [ASSETS_A_FOURNIR.md](ASSETS_A_FOURNIR.md); current state:
`python tools/assets_status.py`.

| Design | Missing | Effect |
| --- | --- | --- |
| Aqua | ledger sheet, open / closed notebook, page device, panels per theme, objects | Aqua joins the shared families (no more specific BG) |
| Flight log | panels per theme (9 themes, landscape + portrait); page device (2 objects) | end of the `BG` backgrounds and of the plans (blueprint) specific to the design |
| Cabinet (light tone) | ivory panels: aerodrome, operations, families, awards, equipment, radio, time; “instruments” in portrait | end of the aliases |
| Rugged | “awards” and “families” panels in landscape | end of `only` |
| All | sheet **without a printed table** (blank paper), header and stamp as transparent pieces, straight edges (no perspective) | cutting without erasing or straightening (`erase`, `shear` removed) |
| Rugged | footer frieze as a single image (like Cabinet and Flight log) | end of the frieze HTML specific to Rugged |

Asset tracking (specifications, generation instructions, integration): `docs/ASSETS_A_FOURNIR.md` (in progress).

### Progress of phase 2

- **Done (30 September 2026)**:
  - **4. Ledger sheet** — header, stamp, accessory, left margin and order of the accessory optional
    (absent by default in the shared rules: Rugged no longer declares zeros); each design has a tagged “cut”
    block in `designs_skeuo.css`, rewritten by `tools/cut_register_sheet.py <design> --write` (identical after
    rewriting the three designs), and a hand-written “settings” block.
  - **5. Notebook of previews** — component `.repo-notebooks` (gallery) / `.repo-notebook` (map) of
    `designs_skeuo.css`, tokens `--nb-*`; the Studio only keeps the classes and its action (click = refresh).
  - **8. Image check** — `tools/check_assets.py` (actual format, weight > 400 KB, missing images, orphans),
    run at the end of `bump_versions.py` (report only); state: 181 images, no errors.
  - Outside the plan: unified page device (between blocks 3 and 4 for all, `DEVICE_AT`, movable), shared long
    tasks (`AppFramework.task`), uniformly dimmed panels.
- **Done (30 September 2026, continued)**:
  - **1. Missing tokens (first pass)** — Cabinet / Rugged twin rules merged into one rule for the framed
    designs (`html[data-skeuo="frame"]`) and tokens: step badge (`--sk-step-*`), titles and subtitles of the
    sub-cards (`--sk-card-title-*`, `--sk-card-sub-ink`), drop zones (`--sk-drop-ink`, `--sk-drop-state-ink`,
    `--sk-pick-case` / `-spacing`), notice icon (`--sk-notice-icon`), focus ring (`--sk-focus`),
    footer (`--sk-footer-link`, `--sk-footer-shadow`), aligned figures of the fields, segmented selector (`--sk-segs-*`,
    `--sk-seg-*`; Flight log only overrides what differs from its base). Dead code removed: colours of the
    “choose” link of the drop zones (covered by the shared rule), first rule of Rugged's handles.
    Rules targeting a design: Rugged 74 → 57, Cabinet base 52 → 37, Flight log 29 → 27, Cabinet 9 → 8;
    `!important` 327 → 308. Regression bench: no difference (48 combinations).
  - **1 (continued) and 2. Surface tonality** — code badges, fonts of the buttons and of the link-buttons through tokens;
    `html[data-surface]` set by `repository_nav.js` (`designs.list[id].surface`, otherwise the page's tone; follows every
    change of tone or design): status boxes written for “dark surface”. Bench: no difference.
  - **1 (continued) and 9** — Aqua's segments (`--sk-seg-bg`, `--sk-segs-radius`) and current entry of the side bar
    (`--sk-nav-on-*`, base rule); header title (`--sk-title-*`); Flight log's title plate through the
    `--sk-plate-*` tokens instead of two `!important` overrides (the second covered the first); dead rule of
    Rugged removed (uppercase of the tool buttons, which have no text). Bench (fresh reference): only the expected difference.
  - **1 (continued), 6** — side bar, notices, sub-cards, body text and label font, emblem,
    “choose” link, footer, reporting charts, page frame, corner screws: twin rules replaced
    by a shared rule and tokens, values taken from the current rendering when only one design had them (default
    = rendering of the others). Declarative footer frieze (`foot: ['strip']`, `['plate', 'radar', 'status']`).
    Bench extended to 9 pages (72 combinations): no difference at any step.
    Rules targeting a design: Rugged 74 → 39, Cabinet base 52 → 19, Flight log 29 → 20, Aqua 41 → 28, Cabinet 9 → 5;
    `!important` 327 → 271.
- **Buttons** (decided on 30 September 2026): shared convention — 1st button of the header primary, the following ones
  secondary, secondary links and “Add files” secondary; what remains specific to each design is its
  material (wood, leather, steel, glass, screws, plans, radar).
- **Ledger sheet, continued**: rules shared by the three sheet designs through the tokens `--sheet-ink`, `--sheet-ink-2`,
  `--sheet-text`, `--sheet-label-ink`, `--sheet-card-bg`, `--sheet-pin` (placed card = pinned paper). Progress
  bars and notifications dressed through tokens (`--sk-prog-*`, `--sk-menu-*`), without `!important`.

### Phase 3 — CSS layers

- **Finding (trial on 9 pages, “all” bench)**: within a layer, an `!important` wins over that of a rule
  outside any layer (reversed order). Putting the page styles in a layer without removing their `!important` puts them
  in front of the designs (660 differences: page frame, CR block backgrounds…). `repository_nav.css` in a layer loses against
  the styles set by the scripts (outside any layer): tool icons and Menu button broken. Trial withdrawn (set aside with
  `git stash` “couches CSS”).
- **Chosen order**: (1) remove the `!important` from the page styles, outside any layer, page by page on the bench; (2) put
  the core in a layer with the styles set by the scripts, and remove the core's `!important`; (3) page styles
  in a layer; (4) remove the designs' `!important`.
- **Done (1, first pass)**: bench per page (`?pages=…`, the pages' own selectors recorded) and
  “standard” design; `tools/strip_page_important.py` (spares `@media`, `display: none`, design rules, `garder`);
  52 `!important` removed (studio, generator, performance planner, ODV planning, Landing): no difference.
  Remaining on the page side: `mission_core/core.css` (24), `maintenance.css` (2), Settings (3) — they win over the
  core (CR backgrounds and buttons, table buttons in the standard design): they will go at step (2).
- **“app” model (1 October 2026)**: a single `app` layer for the core, the page styles and those set by the
  scripts (order and specificity among them unchanged: with `base < page`, a generic page rule — `button {…}` —
  would pass in front of the core's components), `lib` below (MapLibre), designs outside any layer. Tools:
  `tools/layer_app.py` (core stylesheets and pages; design rules kept outside any layer) and guard in `kit.js` (every
  `<style>` set by a script joins `app`). Full bench (52 pages × 5 designs × 2 tones, own selectors as
  fingerprint): **30,914 differences** halfway through — the core's `!important`, once in a layer, win over those of the
  designs (transparent background of the ☰ button in front of Cabinet's leather, headers, tool buttons of the blocks). Trial set
  aside (`git stash` “couches CSS modèle app”).
- **Lesson**: putting a file in a layer and removing its `!important` go together; an `!important` of the
  core only serves to beat another rule of the application (same layer once layered: specificity
  is enough, or a more precise selector) or a design (useless: the designs will be above).
- **Done (2 and 3, 1 October 2026)**: core (`repository_nav.css`, `core.css`, `maintenance.css`, `block_icons.css`),
  page styles and styles set by the scripts in the `app` layer; `@layer lib, app;` at the top of `repository_nav.css`.
  - **The application's `!important` converted, not removed**: removing them broke all the rules they made
    win over another rule of the application (tool buttons of the blocks, sticky header, “×” of the paste panel…).
    `strip_page_important.py --bump` (stylesheets, before `layer_app.py`) and the guard in `kit.js` (styles set by the
    scripts) turn them into a following rule, with the selector reinforced by `:not(#imp)` (specificity + 1-0-0): in front of the ordinary
    rules of the application as before, order unchanged between converted rules, behind the designs outside any layer.
    Still `!important`: `display: none`, `@media` blocks, and `/* garder */`;
  - `/* garder */` (“keep”): an `!important` that has to beat **the designs' dressing** (previews and badges of the
    Appearance page) — inside the layer, it wins over the designs, as before;
  - design rules **with deliberately low specificity** (`:where(…)` block positioning, default weight of the
    buttons `--sk-btn-weight`): placed in `@layer app` of `designs_skeuo.css` (they yield to the pages, as before);
  - appearance settings `html[data-icons…]`: treated like the designs (outside any layer) by `layer_pages.est_design` and
    by the guard in `kit.js`, which splits a `<style>` set by a script (design rules outside any layer, untouched).
- **Bench method**: an initial *snap* on the full panel (“Reference” button, list of more than 20 pages: remembered
  as snap, `benchSnap`); iterations on a reduced but representative panel (`?pages=`: CR, table, Settings,
  Appearance, Maintenance, Landing, studio, ODV planning, registry), compared with the snap (fingerprints compared
  fingerprint by fingerprint); full panel at the end, against the same snap. Detail of a fingerprint difference: targeted reading, or
  comparison of the computed styles against a reference working tree served alongside (`/_ref/`, local junction).
- **Done (4, 1 October 2026)**: the designs' `!important` converted in the same way (`strip_page_important.py --bump
  --designs`: design rules included), wherever there are design rules — `designs.css` 29 → 0,
  `designs_skeuo.css` 279 → 32, and the design rules of the core and of the pages (`core.css` 30, `block_icons.css` 78,
  `repository_nav.css` 4, `maintenance.css` 3, studio, registry, planner 22): the order between design rules is
  unchanged. `build_skeuo_icons_css.py` writes its section already converted.
  Still `!important`: `@media` blocks (printing), `display: none`, and `/* garder */` against an **inline style**
  (only an `!important` beats a `style` attribute) — `body` background set by the pages (framed designs, Aqua), secondary
  links of the CRs (inline `color: inherit`), route fields of the studio (inline `background: transparent`),
  size of the side bar icons (inline `--rs`). Bench (reduced then full panel, against the snap): remaining
  differences identical to HEAD.
- **C, page palettes (2 October 2026)**:
  - **Dark-background tools** (Landing, planner, ODV planning, operations reporting): a shared palette
    `:root[data-tool="dark"]` (`repository_nav.css`, app layer) with the names of the light palette of `core.css` (`--bg`,
    `--card`, `--card-2`, `--field`, `--ink`, `--muted`, `--line`, `--soft`, `--accent`, `--accent-2`, `--ok`,
    `--warn`, `--bad`); each page requests it through `<html data-tool="dark">` and its variables are renamed
    (`--panel`→`--card`, `--text`→`--ink`, `--p`→`--card`, `--b`→`--line`, `--mut`→`--muted`, `--good`→`--ok`…):
    the designs reach them. `color-scheme: dark` stays with the page (ODV, planner: Landing and the operations
    reporting did not have it). Values: those of ODV and of the planner (identical); Landing and the
    operations reporting change by a few units (`#0f1115`→`#101317`…), expected differences on the bench.
  - **Fire / HEMS CRs unified**: the standalone legacy pages (`fire_cr.html`, `fire_reporting.html`,
    `hems_medevac_cr.html`, `hems_medevac_reporting.html`, with their own palette and script) are replaced, **at the same
    address**, by the Mission Core pages (formerly `*_core_*`, “validation”) — steps 2a / 2b of the plan
    (`mission_report_core_audit.md`, §F–G): same fields, old ledgers importable from the page
    (“Import the old ledger … (CSV)” (« Importer l'ancien registre … (CSV) »)). CR ⇄ reporting links (`families/*.js`), prefixes in `vocab.js`, template
    of `new_family_pages.py`, tree and bench reference pages updated; scripts of the legacy pages only removed
    (`gaar_reporting.js`, `hems_reporting.js`, `hems_mission_sync.js`). All CR families go through the Core.
  - **Orphans** (sweep of `shared/`: no `.js` / `.css` without a page or script that loads it): translations of the
    legacy pages (`gaar_i18n.js`, `hems_i18n.js` — loaded by no page, only mentioned in a comment),
    `aircraft_directory.js`, and three dead phrases of `reporting_i18n.js` (period “shared with HEMS / GAAR”)
    removed.
- **Useless boosters merged** (`:not(#imp)`, 2 October 2026): `tools/imp_audit.html` removes, in the CSSOM, the
  booster of each boosted rule (same place in the stylesheet), on the 48 pages of the tree × 5 designs × 2
  tones, and records before / after the properties it declares on the elements it targets (pseudo-elements included).
  Useless = seen somewhere, never a difference, and no stateful rule (`:hover`, `:focus`, `[open]`…) competes for its
  properties on its elements (state not recorded: booster kept). `tools/merge_imp_rules.py` (JSON of the audit) gives its
  declaration back to the original rule when it follows it (rule reconstituted), otherwise removes the booster from the selector:
  113 rules (43 merged, 70 boosters removed) in `designs_skeuo.css`, `block_icons.css`, `repository_nav.css`,
  `core.css`, `designs.css`; 187 boosters remain (difference recorded, stateful rule, or rule never seen). Bench (reference pages,
  reference taken just before): no difference. The rules set by the scripts (guard in `kit.js`) are not
  concerned (sources in `!important`).
- **Next**: 7 as the assets are delivered ([PROMPTS_ASSETS_PHASE2.md](PROMPTS_ASSETS_PHASE2.md)); remaining boosters
  case by case (specificity of a more precise selector rather than a fictitious id), if readability calls for it.

## Using the toolkit (D)

```js
const K = window.RepositoryKit;
K.esc(texte);                         // HTML échappé
K.t(['Bonjour', 'Hello', 'Hallo', 'Hola']);   // langue courante, typographie française appliquée
K.store.get('cle', 'défaut'); K.store.json('cle', {}); K.store.set('cle', 'v'); K.store.setJson('cle', obj);
K.color.contrast('#fff', '#1d3557');  // rapport WCAG
```

New module: no longer copy these utilities; a page that loads `repository_nav.js` loads `kit.js` before it
and before any module that uses it (at the top of the `<head>` if modules are loaded early; generated pages
take it from their template).

- **Application modules, escaping (1 October 2026)**: the 24 copies of `esc` (Mission Core, mission registry and
  generator, studio, map planner, Landing, ODV, Maintenance, icons…) replaced by
  `RepositoryKit.esc` (all were subsets: `'` in addition, with no effect in HTML); `kit.js` placed at the top of the
  four pages that loaded these modules before it (studio, generator, map planner, operations
  reporting) and added to the icon tool. Next: translation of a row and protected `localStorage`.

## Adding a design (A)

Declare the design in `repository_tree` (`designs.list`); for a material design: `css:"designs_skeuo.css"`,
`skeuo:true`, `chart:"…"` (optional), `icons:"<set>"` with its images in `shared/icons/skeuo/<id>/`, logo
`shared/icons/defa/<id>.webp`, decorations in `design_deco.js`. Then `python tools/build_skeuo_icons_css.py` and
`python tools/bump_versions.py`.
