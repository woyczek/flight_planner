# Contrast pass and consistency of the textured designs — 2026-10-09

Request: "a contrast pass on every page, every style" and "every element of a design consistent with the others".
Scope of the fixes: `shared/designs_skeuo.css` (Cabinet, Flight log, Rugged, Aqua, Tactical) and
`shared/repository_nav.css` (shared menus). Defects belonging to `shared/designs.css` (Standard, Aero, Operational,
Console) or to page stylesheets are listed (§ 5), not fixed.

## 1. Method

Tool: `tools/contrast_audit.html` (browser standard library, no dependency). For each page × design × decor, it sets
the preferences (`repositoryDesign`, `repositoryDecor`, level 4, Centre access, French) in the browser storage, loads
the page in a 1280 × 900 frame, waits 600 ms without any change to the document (8 s at most), then measures every
visible text (non-empty text node, displayed element, excluding `[aria-hidden]`, `script`, `option`, `svg`) and every
filled field:

- **colour**: `color` (or `-webkit-text-fill-color`), cumulative opacity of the ancestors;
- **effective background**: the element's layer, then the ancestors' up to the first opaque background,
  semi-transparent backgrounds composited; image or gradient: average colour (image reduced on a canvas; gradient:
  average of the stops); filled border images (`border-image … fill`: tabs cut out of the sprite sheets): centre part
  of the image; panels laid under the content (absolutely positioned child at negative `z-index`: `.repo-deco-bgimg`,
  registry sheet `.repo-deco-sheet` and its parts) and covering pseudo-elements; partial, non-repeated images (screws,
  watermarks) ignored, except on a small element (medallion button);
- **WCAG thresholds**: 4.5:1, 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold) and for a lone glyph without letter or
  digit (arrow, ↕: graphical object, 1.4.11); disabled controls ignored (out of scope);
- **menus**: the ☰ menu (groups expanded) and the language menu are opened and measured separately.

Readings: 18 pages (home, Today, My missions, Report, HEMS report and reporting, Flight orders, generator, registry,
Map studio, Flight maps, Fuel, Landings, My profile, Appearance, Installation, Maintenance, Help) × 9 designs × 2 decors
= 324 readings per pass, ~4,100 texts measured per design and decor. The tone (light / dark) is that of each page's
theme: Flight maps, Fuel and Landings give the dark variants (Cabinet "night chart", dark Aqua).

- **Before**: reference stylesheets = `designs_skeuo.css` and `repository_nav.css` from commit `4190dc47`, copied into
  `tools/_verify/ref/` (ignored folder; `url()` addresses rewritten towards `shared/`) and substituted by the tool
  ("Reference stylesheets" field). To recreate the reference:
  `git show HEAD:shared/designs_skeuo.css | sed -E 's#url\("(textures|deco|icons|fonts|panels)/#url("../../../shared/\1/#g' > tools/_verify/ref/designs_skeuo.css`.
- **After**: working stylesheets, re-read without the "immutable" cache (option "shared stylesheets without cache").
- Data: `docs/technique/perf/runs/contrast_2026-10-09.json` (`runs[0]` before, `runs[1]` after; per reading: page,
  design, decor, tone, texts measured, defects grouped by selector × colour × background, 80 at most).

Limits: average of a texture or gradient rather than the local worst case; text drop shadows ignored (engraved plates);
decors made of sibling elements not seen; hover and focus not tested; `index.html` does not apply the design (routing
page, reading `applied: false`). Advice: open the tool on an origin nobody else uses (`http://[::1]:<port>/…`), since
the preferences are those of the browser for the origin.

## 2. Results before / after

Texts below the threshold (sum of occurrences) over the 18 pages; in brackets: in the ☰ and language menus, then on
dark-themed pages.

| Design | Decor | Before | After | Menus before → after | Dark tone before → after |
|---|---|---:|---:|---|---|
| Standard | full / plain | 119 / 119 | 119 / 119 | 0 → 0 | 0 → 0 |
| Aero | full / plain | 114 / 114 | 114 / 114 | 0 → 0 | 0 → 0 |
| Operational | full / plain | 119 / 119 | 119 / 119 | 0 → 0 | 0 → 0 |
| Console | full / plain | 119 / 119 | 119 / 119 | 0 → 0 | 0 → 0 |
| Cabinet | full | 439 | 94 | 252 → 0 | 125 → 0 |
| Cabinet | plain | 729 | 159 | 252 → 0 | 125 → 0 |
| Flight log | full | 444 | 95 | 254 → 0 | 125 → 0 |
| Flight log | plain | 738 | 159 | 252 → 0 | 125 → 0 |
| Rugged | full | 152 | 110 | 0 → 0 | 12 → 3 |
| Rugged | plain | 204 | 162 | 0 → 0 | 12 → 3 |
| Aqua | full | 618 | 83 | 154 → 0 | 69 → 0 |
| Aqua | plain | 583 | 117 | 154 → 0 | 69 → 0 |
| Tactical | full / plain | 247 / 247 | 58 / 58 | 0 → 0 | 0 → 0 |

What remains in the textured designs comes mostly from the Flight orders (white simulator chips on light colours: 684
of the ~1,100 remaining occurrences, § 5) and from three components outside these stylesheets (§ 5).

## 3. The three findings

### 3.1 Cabinet's ☰ menu unreadable

Causes (two, cumulative):

1. `repository_nav.css` coloured the group titles (`.repo-group`, the groups' `summary`), separators, settings and
   profile fields with `--repo-bar-text` (the header's white), meant for a menu on the header's background; the
   textured designs lay a light parchment (`--sk-menu-bg`): white at 66 % on parchment = 1.8:1. The "Local data" and
   "Page" actions (`button.repo-action`) additionally took the design's navy leather of the buttons, under the dark ink
   forced by `.repo-menu :is(a, button, summary)`: 1.1:1.
2. In **dark tone** (dark page theme: Flight maps, Fuel, Landings), `--cab-ink` turns light but `--sk-menu-bg` stayed
   the light parchment: the whole menu, the language menu, the notifications and the footer at 1.2–1.9:1.

Fix at the source: `repository_nav.css` defines `--repo-menu-ink` (the design's `--sk-menu-ink`, else
`--repo-bar-text`), `--repo-menu-ink-2`, `--repo-menu-line`, `--repo-menu-hover`, from which titles, separators, hover
and settings derive; `designs_skeuo.css` (SHARED COMPONENTS) gives a group ink `--sk-menu-ink-2` per design, makes the
menu entries flat (links, actions, languages: same line, same hover), dresses the profile fields like the design's
fields and removes the inline opacity set on the save state; Cabinet and Flight log in dark tone get a dark-parchment
menu and footer. Result: 0 defects in the menus of the five designs, two decors, two tones.

### 3.2 Aqua in dark tone

Finding: dark Aqua only redefined a few colours, hard-coded and element by element: the tab rail stayed the light metal
of light Aqua under dark push-buttons, the tokens `--sk-mbtn-*`, `--sk-lbtn-*`, `--sk-pick-*`, `--sk-tool-*` kept the
light glass under an ink that had turned light (hard-coded catch-up rule for ☰, language and secondary buttons only),
the current entry of the sidebar had a white .55 veil (1.9:1), and the gel (top highlight at 45 % white) gave 3.6:1
under white text in both tones.

Fix: materials as tokens, set once in light Aqua and only redefined by dark Aqua — `--aq-glass`, `--aq-glass-ink`,
`--aq-glass-edge`, `--aq-glass-sep`, `--aq-glass-shine`, `--aq-glass-drop`, `--aq-glass-text-shadow` (clear or smoked
glass), `--aq-slate`, `--aq-slate-edge` (discreet button), `--aq-rail`, `--aq-rail-shadow` (rail metal). Segments and
tabs at rest, ☰, language, secondary and header buttons, link-buttons, block tools, dropdowns, page header buttons
(`--sk-hb*`) in glass; current page, chosen segment and primary action in gel; dark rail in dark tone. Dark Aqua's
hard-coded catch-up rule removed. Gel: highlight brought down to 15 % white and bottom darkened (average ≥ 4.5:1 for
every Aqua hue). Dark sidebar: .14 veil. Result: 0 defects in dark Aqua.

### 3.3 Uneven tab rail ("marker line")

Inventory of the tabs:

| Tabs | Pages | Component |
|---|---|---|
| Shared `pilot` | My missions, My availability | `.repo-tabs` (repository_nav.js) |
| Shared `missions` | Registry, Generator, Map studio | `.repo-tabs` (by level) |
| Shared `tools` | Flight maps, Fuel, Landings, Mission analysis | `.repo-tabs` |
| Shared `settings` | My profile, Appearance, Centre, Installation, Maintenance, First run | `.repo-tabs` |
| Shared `planning` | Board (Flight orders) only | no bar: a single visible tab (intended) |
| Page-specific | Map studio (`map_parser.html`) and Flight maps (`map_planner.html`, generated): Base map, Zones, ICAO symbols, Elements | `.profileTabs` + `.tabPanel` |
| Not tabs | Settings (side menu `.da-nav`), Appearance (`.repo-segs` selectors) | — |

Measured in the five textured designs, full and plain decor: the rail (cut-out image, or `--sk-tabs-rail` token) and
the push-buttons are identical on every page that has `.repo-tabs`, whatever the decor (no decor rule touches them).
The differences came from:

1. **Fuel**: the content following the bar is `div.wrap`, not `main` → no border ("marker line") around the tabbed
   block (`.repo-tabs+main`). Fixed: `.repo-tabs+:is(main, .wrap)`.
2. **Map studio and Flight maps**: their own tabs (`.profileTabs`) kept the page's drawing (blue binder tabs). Fixed:
   the tab rules of the textured designs also target `.profileTabs` (rail) and `.profileTabs>button` (push-button,
   `.on` = current page) — rail, push-buttons, screws, lamps and sprite images of each design, without touching the
   HTML or the generator.
3. **Dark Aqua**: light rail under dark push-buttons (§ 3.2).
4. **Schedule** and low levels: a single visible page in the group → no bar (intended behaviour of
   `repository_nav.js`). **Tactical**: no border (`--sk-tabs-lisere: none`, design without image), intended.

Inks of the image tabs recorded: Flight log (labels) darkened inks (#1c160d, current page #241803), Rugged current page
#0d0d06 on the lit canvas.

## 4. Other fixes (designs_skeuo.css)

- **Cabinet's secondary ink** (`--cab-ink-2`): #5b4a2e → #45361f. The parchment texture's average colour is #c0a883
  (not #efe3c4, the basis of the original computations): 3.7 → 4.9:1 for block subtitles, `.small`, summaries.
- **Page greys** (`--muted`) and small texts (`.small`, `.note`, `.muted`, `.hint`): the design's secondary ink inside
  the blocks of **every** textured design (Aqua and Tactical included: the pages' #6b7280 and #5c6d76 at 3.1–3.7:1); in
  the header, the header's ink dimmed (and the Flight orders' `--odvo-mute`); in buttons, the button's ink; in status
  bars, the bar's ink.
- **Block links**: `--sk-link` token per design (Cabinet's navy, Rugged's lamp, Aqua's blue / light blue, Tactical's
  cyan), shared rule; the sheet's ink on registry sheets and the print ink on the preview.
- **Printable preview** (`.report`, Mission Core): ink tokens redefined on the sheet (Rugged's and Tactical's light
  text fell to 1:1 on the paper); Tactical's paper made light; neutral table headers in the report.
- **Settings side menu** (`.da-nav`): the blocks' surface (`--repo-surface`) laid underneath by a pseudo-element (the
  cards' semi-transparent material let the wood show through: 2.9:1).
- **Page opacities** neutralised in the textured designs: order-form labels (`mission_order.js`, .85), subheadings of
  the Help index (.7).
- **Flight log**: segmented selector in light brushed aluminium (the steel gave 3.8:1). **Rugged**: primary button
  green deepened (4.4 → 5:1), `.secondary` link in the buttons' ink (1:1), card subtitles in full ink. **Aqua**: header
  subtitle and language label in the header's dimmed ink (3.9 → > 7:1).

No rule changed a material: the only `background` values modified are those of the menu entries (flat lines instead of
the buttons' leather), of the Aqua rail and push-buttons (same gradients, moved into tokens), of the Settings menu
(pseudo-element underneath); page, header, block, sidebar and footer textures checked (`backgroundImage`) on My
missions, My profile, Report and Flight orders in Aqua, Cabinet, Flight log and Rugged.

## 5. What remains

Outside the stylesheets fixed here; last column: state after pass G (§ 6).

| Where | Defect | Designs | Ratio | Pass G |
|---|---|---|---|---|
| `apps/cpco/odv_orders.html` (Flight orders) | white simulator chips `.sim-chip` on light colours (green, yellow, cyan) | all | 2.4–4.3 | ink computed by `assignments.js` (`chipInk`, another session); not re-measured (no schedule in the audit origin's storage) |
| `apps/cpco/odv_orders.html` | `.odvo-tpl small` (palette templates), `.odvo-tr span` (gold #7a5c12 on dark), `.odvo-atc-reservation`, `button.repo-plain.low small`; days `.odvo-days button.on` #0b1016 on the accent #7a5c12 (3.1:1) | all | 1.3–4.5 | remains: page reserved to another session (same fix as `odv_blocks.css` to carry over: text on the accent = `var(--repo-page)`) |
| `apps/cpco/odv_blocks.css` | `sup.odv-rank` (ink at 82 %); `button.primary` #0b1016 and `.odv-tri3 i.on` #fff on the accent | all | 3.6–4.3; 3.1 | **fixed**: full ink; text on the accent = `var(--repo-page)` (≥ 4.5:1 by construction) |
| `shared/mission_table.js` (sortable tables) | sort arrows `.st-arrow` (#a9adb5 on #f5f5f6; gold or purple on dark); headers `.st-sortable` #6b7280 on #f5f5f6 | all | 1.3–4.4 | remains (#7a5c12 on #22282e: 2.4:1): file reserved to another session |
| `shared/mission_core/` (HEMS report) | `.mc-kpi .small` #6b7280 on #ececf3; `p.small` of the family choice (Report) 4.47:1 | Standard, Ops, Console | 4.1 | **fixed**: `--muted` #5b6270 (5.2:1 on #ececf3) |
| `shared/designs.css` (Aero) | block title `h2` of the Flight orders #7a5c12 on #181d23 (dark tool page) | Aero | 2.7 | **fixed**: `var(--repo-ink, var(--repo-accent))` → #e2c16b on #181d23 (9.8:1); accent unchanged on light blocks |
| `tools/build_skeuo_icons_css.py` → `block_icons.css` (generated section) | block "move" button in the Gel set: white glyph on a grey tinted bubble, gold (#ffd23f) on the Centre pages | Aqua | 2.0–3.0 | **Centre fixed** (navy bubble, § 6.2); blue bubble: 4.1:1 real, still flagged by the tool (measurement limit, § 6.2) |
| `apps/aide/aide.html`, `apps/cpco/mission_registry.html` | `.small` at opacity .8 on parchment (#483e2d) | Cabinet, Flight log (plain) | 4.48 | Help: 0 defects at reading (already settled); registry: `.mo-small` set by `shared/mission_order.js` (JS, out of scope) |
| Measurement | Rugged: current tab, lit canvas — the average of the centre column includes the steel frame (2.5:1 measured); visually readable, to be confirmed on the sprite sheet | Rugged | — | — |

Note for `designs.css` (another session): Aero's and Operational's menus can now rely on `--repo-menu-ink` /
`--repo-menu-line` if their background changes.

## 6. Pass G: remaining contrasts, Operational and Console made consistent

Scope: `shared/designs.css` (Aero: contrast only; Operational, Console), `shared/block_icons.css` (base Console,
Operational, the Centre's Gel set), `shared/mission_core/core.css`, `apps/cpco/odv_blocks.css`. Rule kept: a design only
changes the shape; no fixed colour added in the designs; every new design rule starts with
`html[data-design="ops"]` or `html[data-design="console"]` (Standard and Aero unchanged, checked by measuring the
computed styles on the five pages below).

### 6.1 Readings before / after (`tools/contrast_audit.html`, 18 pages, level 4, origin `[::1]`)

| Design | Decor | Before | After | Remains (all designs) |
|---|---|---:|---:|---|
| Standard | full / plain | 16 / 16 | 5 / 5 | Flight orders: `.st-arrow` (2.4), current day (3.1), `.odvo-tpl small` ×3 (3.9–4.4) |
| Aero | full / plain | 11 / 11 | 5 / 5 | same |
| Operational | full / plain | 16 / 16 | 5 / 5 | same |
| Console | full / plain | 16 / 16 | 5 / 5 | same |
| Aqua (5 pages: My missions, generator, Flight orders, My profile, HEMS report) | full | 28 | 42 | Gel set bubbles (§ 6.2); Flight orders `.odvo-tr span`, `.odvo-atc-reservation` (1.03, light background measured under light text: reserved page) |
| Cabinet, Flight log (Help, registry) | plain | 2 / 2 | 2 / 2 | registry: `.mo-small` (opacity .8, `mission_order.js`) |

Aqua count discrepancy: the HEMS report counted 3 "move" bubbles at the first reading and 17 at the second (same
measurement, 2.94:1, on every block); no rule of the blue bubble changed — the gap comes from the page's state at the
reading.

Defects fixed (ratios measured by the tool, unless noted):

| Element | Where | Before | After |
|---|---|---:|---:|
| `.mc-kpi .small`, `.mc-tools p.small` (HEMS report) | `core.css` `--muted` #6b7280 → #5b6270 | 4.13 | 5.2 |
| `section#family p.small` (Report) | same | 4.47 | 5.7 |
| `h2` of the Flight orders blocks (Aero) | `designs.css` | 2.72 | 9.8 (#e2c16b on #181d23) |
| `sup.odv-rank` (Cabinet, Flight log, Rugged) | `odv_blocks.css` | 3.6–4.3 (reading of 09/10, `runs[1]`) | the block's full ink (not re-measured: no schedule on the audit origin) |
| `button.primary`, `.odv-tri3 i.on` on the accent | `odv_blocks.css` | 3.1 (same pattern as the Schedule's days) | ≥ 4.5 (accent set on the page) |
| "move" / "hide" button, Gel set, Centre pages | `block_icons.css` | 2.9 real (gold on gold gel #916d12) | 10.2 real (gold on navy #1b2440) |

### 6.2 Gel set bubbles

Real rendering computed on a canvas (gel disc, then the `vierge.gris.webp` bubble in `overlay`, average and worst
pixel of the central square where the glyph sits):

| Bubble | Glyph | Average | Worst pixel |
|---|---|---:|---:|
| blue gel #2473db (Report and other pages) | white | 4.1 | 3.2 |
| Centre, before: gold gel #916d12 (accent) | gold #ffd23f | 2.9 | 2.2 |
| Centre, after: navy gel #1b2440 (that of the Centre's icons) | gold #ffd23f | 10.2 | 9.2 |

The ↕ glyph is a graphical object (3:1 threshold): the blue bubble passes. The tool, though, composites the image in
normal mode (it ignores `background-blend-mode: overlay`): it sees the grey bubble and reports 2.5–2.9. A fix of the
tool is to plan (`layer()`: apply the layer's blend mode), otherwise these lines will stay flagged.

Generator rule to carry over (`tools/build_skeuo_icons_css.py`, loop over the sets, line
`out.append(f'html[data-app-theme="cpco"][data-icons="{key}"] .repo-block .repo-block-tools button:is(.repo-drag,.repo-toggle){{color:{g["centre"]}!important}}')`):
for a tinted set (`g.get('centreGel')`), add to the same rule
`--aq-gel:{g["centreGel"]};background:url("icons/skeuo/{centre}") center/contain no-repeat,{disc({**g, "up": -0.5})} center/contain no-repeat!important;background-blend-mode:overlay,normal!important;`
(the same re-centred disc as the Centre's icons, `CENTRE`).

### 6.3 Operational: inconsistencies and fixes

Pages: My missions, generator, My profile, HEMS report, Fuel (dark tone). Measurement: computed styles of the elements
(radius, margins, height, size, case) in Standard, Operational and Console.

| Element | Page | What differed | Fix |
|---|---|---|---|
| `.repo-tab` tabs | My missions, generator, My profile, Fuel | 7 px rounded (Standard) among sharp 3 px corners | `--repo-round: .4` (every radius written as `calc`); tab 3 px 3 px 0 0, 5/12 px |
| Header | My missions, My profile, Report (18 px margins); generator, Fuel (10 px) | height depending on the page; description 16, 15 or 13 px | 7 px margins; description 12.5 px everywhere |
| Content buttons `.primary/.secondary/.ghost/.danger`, `a.mc-button` | My missions and generator 37 px, Fuel and Report 33 px | not dense, next to 27–31 px fields | vertical margins 5 px → 27 px |
| Link-buttons `a.mc-button`, `a.headerButton` | Report, headers | 7–10 px, outside the buttons' rule | 3 px |
| Sub-cards `.mc-item`, `.mc-tools`, `.mc-kpi>div`, `fieldset`, `.note` | HEMS report | 10 px inside 3 px blocks | 3 px |
| ☰ menu | all | container 3 px; links 6 px, Appearance / Settings 7 px, actions 3 px, design choice 6 px | 3 px |
| Fields, `.repo-notice` banners, drop zones | all | 2 px, against 3 px for buttons, blocks, menus | 3 px |
| Printable preview title (`.report h2`) | HEMS report | set in 12.5 px capitals like a block title (`.repo-block h2`) | capitals limited to `.repo-block-heading h2` and `.card>h2` |

### 6.4 Console: inconsistencies and fixes

| Element | Page | What differed | Fix |
|---|---|---|---|
| Title of a block without icon | Fuel ("Imported JSON / SimBrief") | 15 px, normal case; the others in 1.3 rem 800 capitals (rule limited to `.repo-block-heading-rich`) | `.repo-block-heading h2`, `.card>h2` |
| Header buttons (Synchronise, Save, Create the report, report tools) | all | 40 px next to ☰ and language (32 px) and the report's menus (30 px) | 40 px height reserved to the content |
| Header radii | all | ☰ and language 7 px, buttons 6 px, report menus 8 px and pill, `a.mc-button` 7 px | 6 px |
| ☰ menu | all | actions (Local data, Page) 40 px against links 37 px; menu 9 px, report windows 12 px; Appearance / Settings 7 px | menus outside the 40 px; containers 10 px (the blocks' radius); entries 6 px |
| Icon-only buttons ("now" of the times) | HEMS report (19) | stretched to 40 px high | excluded from the 40 px height |
| Fields inside tables | HEMS report | 40 px in the cells (45 px rows) | excluded (dense entry, like Aero) |
| Sub-cards, field groups, banners, drop zones | HEMS report (10 px), `.repo-card` (8 px) | two sub-card radii | 8 px |
| `.repo-tab` tabs | My missions, generator, My profile, Fuel | Standard drawing (7 px, 7/14 px) in an airy design | 8 px, 9/16 px |
| Header description | all | 16, 15 or 13 px depending on the page | 14 px |

Out of scope (intended or elsewhere): the round close button `fa-x` takes the design's button radius (as in Aero);
tables and sidebar identical to Standard in both designs (table density already set in Operational); no
`.repo-actionbar` on these five pages (studio and Flight maps only).
