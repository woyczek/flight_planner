# V3 design — specification (regeneration prompt)

The design block of the V3 frame: tokens, designs, primitives, icons, density, day / night, print. Owner: the design
agent (`.claude/agents/v3-design.md`). Memory: [DECISIONS.md](DECISIONS.md). Reading of V2: [READING.md](READING.md).
Module side: [INTEGRATION.md](INTEGRATION.md).

## 1. Files

| File | Role |
|---|---|
| `frame/design/tokens.css` | the `--sog-*` tokens and the designs, day and night |
| `frame/design/primitives.css` | base elements and the layout primitives given to modules, print |
| `frame/design/metro.css` | the rules of the `metro` design that tokens cannot carry (mock-up, pending decision), all behind `[data-design="metro"]` |
| `frame/design/swiss.css` | the rules of the `swiss` design that tokens cannot carry (mock-up, pending decision), all behind `[data-design="swiss"]` |
| `frame/design/cupertino.css` | the rules of the `cupertino` design that tokens cannot carry (mock-up, pending decision), all behind `[data-design="cupertino"]` |
| `frame/design/material.css` | the rules of the `material` design that tokens cannot carry (mock-up, pending decision), all behind `[data-design="material"]` |
| `frame/design/aqua.css` | the matter of the `aqua` design (computers only): its skin tokens (gel buttons, glass cards, sunk fields, brushed header and rail) and its textures, all behind `html.f-desk[data-design="aqua"]`; no rule on a selector another design styles |
| `frame/design/aqua/` | Aqua's images: `brushed.webp` (header and rail), `day/<module>.webp` and `night/<module>.webp` (one panel per module); fetched only on a computer in Aqua, kept offline once seen; sources in [aqua/CREDITS.md](aqua/CREDITS.md) |
| `frame/design/demo_metro.html` | the mock-up page of the four designs (`?design=metro` by default, `swiss`, `cupertino`, `material`): scenes (phone and screen, day and night) of the real frame markup and primitives; the file kept its name, the link is known |
| `frame/frame.css` | the application's chrome (header, rail, bottom tab bar, view, notes, dialogs); imports the two files above, so a page that loads `frame.css` has everything |
| `frame/lib/icons.js` | the line icon set (ES module, owner: design) |
| `labs/design_primitives.html` | every primitive in every design, day and night, side by side; the icons; the chart colours |

## 2. Tokens

A design sets tokens and nothing else; a module reads them and never redefines one.

| Family | Tokens |
|---|---|
| Colours | `bg`, `surface`, `surface-2` (fields, callouts), `fg`, `muted`, `border`, `accent`, `accent-ink`, `link`, `focus`, `ok`, `warn`, `err`, `on-status` (text on ok / warn / err) |
| Overlays | `shadow` (notes, dialogs), `shadow-up` (sticky bottom bars), `veil` (dialog backdrop) |
| Charts | `chart-1` … `chart-6`, `chart-grid`, `chart-bg` |
| Type | `font` (shorthand), `font-title`, `font-mono`, `title-case`, `title-spacing`, `title-size` (page title, 1.25rem), `title-weight` (700), `size-s` (.9em), `size-xs` (.8em), `h1` (1.25rem: figures, not the page title), `h2` (1rem), `h3` (.95rem) |
| Space | `gap` (12px), `gap-s` (6px), `gap-l` (20px) |
| Shape | `radius` (6px), `radius-s` (3px); both 0 in textured designs |
| Density | `touch` (44px), `field-text` (16px) |
| Design-private (`material` only, mock-up) | `outline` (field and button outline, 3 : 1 on every surface), `shadow-card` (the 1 dp card shadow); read by `material.css` only, not part of the module contract |
| Skin (optional, 28 Oct 2026) | `btn-bg`, `btn-ink`, `btn-border` (shorthand), `btn-shadow`, `btn-text-shadow`; `btn-primary-bg`, `btn-primary-ink`, `btn-primary-border` (colour), `btn-primary-text-shadow` (also the selected tab or step and the current verb of the rail); `field-shadow`; `card-bg`, `card-border` (shorthand), `card-shadow`; `bar-bg`, `bar-radius` (sticky bar); `head-bg`, `head-border` (shorthand), `head-shadow`, `head-text-shadow`; `nav-bg`, `nav-border` (shorthand). **No design has to set them**: unset, each falls back to today's value (`surface`, `border`, `accent`… or no shadow). They let a design change the material of a button, a card, the header or the rail without a rule of its own (first user: `aqua`). Colours and gradients only, never `url()`: a relative address in a custom property resolves against the sheet that uses it in Chrome and the sheet that declares it in Firefox |
| Landmark colour (mock-up, pending decision) | `module` (colour of the module on screen), `module-ink` (text on it), `module-text` (the colour as text on the page); equal to `accent`, `accent-ink`, `link` in every design but the four mock-ups (`metro`, `swiss`, `cupertino`, `material`: their `--sog-mod-<module>` palettes) |

All are prefixed `--sog-`. The breakpoints are not tokens: CSS media queries cannot read custom properties. They are
**760 px** (phone / screen) and **980 px** (dual view), both for the device (`@media`). A third, **landscape on a phone**
(window wider than high and under 1024 px), is a class the frame sets on `<html>` (`f-land`), not a media query: a script
decides it (the screen's orientation counts too), the stylesheets read it. Its measures are frame tokens, not design tokens:
`--f-rail-w` (44px, the rail of icons at the left), and, on `.f-sheet` with no weight, `--f-sheet-side` (40 %),
`--f-sheet-side-min` (280px), `--f-sheet-side-max` (60 %) for the sheet turned into a column (§ 4).

**Widths of a pane** (columns, grids, tables) are decided on the pane, not on the window: `.f-view` and every
`.f-module` are containers (`container-type: inline-size`), and the primitives use container queries. `f-cols` turns to
columns from a **900 px** wide pane. In the dual view, a module in half a screen behaves like on a narrow tablet. Only
what depends on the device stays in `@media`: the bottom tab bar (the rail on a screen), the header, hiding the pane button.

## 3. Designs, day and night

- **Designs**: `standard` (default; V3's look), `cabinet` (V2 "Cabinet": parchment, ink, navy, brass, Palatino),
  `field` (V2 "Rugged": khaki plate and olive steel, Bahnschrift, uppercase titles). The textured ones keep square
  corners. Images (textures) are not used; they may come later if the user asks.
- **`metro`** (**mock-up, pending decision**, 23 Oct 2026): flat colour blocks, square corners, no shadow or texture, system
  fonts (`Segoe UI` first), a page title twice as large and light (`title-size`, `title-weight` 300), pivot-style section
  headings. Day: white page, grey flat cards (`#f2f2f2`), fields with a 2 px bottom rule. Night: black page. See
  [DECISIONS.md](DECISIONS.md) for the frame amendments it shows and what stays open.
  - **One landmark colour per module**: the frame sets `data-landmark` (the module's id; a frame screen takes
    `settings`) on `<html>`, on each module's pane, on its rail link and on its tab of the bottom bar (the tab takes the colour of the first module of its group, `settings` for Réglages). A design reads it through `--sog-module`
    (`--sog-module-ink`, `--sog-module-text`). The token exists in every design (it equals the accent); `metro` shows
    it (header band, verb blocks, primary buttons, titles, tiles), `swiss` only as the rule of the current verb, `cupertino`
    only as the icon of each verb in the rail (its own palette, white glyph on the colour 4.85 : 1 to 5.99 : 1), `material`
    only as the tint of the active indicator in the bottom bar and the rail (the `metro` palette; its "text" variant, lighter at night). `data-module`, which modules use in their own
    selectors, is not used for this.
  - Palette (white text on the colour, day: 5.4 : 1 to 7.4 : 1): Fuel `#0067b8`, Map `#007589`, Report `#b34700`,
    My flights `#107c10`, Website `#6b3fa0`, Settings `#5d5a58`; as text at night: `#4cb0ff`, `#3cc8de`, `#ff9a4d`,
    `#5fd35f`, `#b48be0`, `#c0bbb7`.
  - A module still brings no colour of its own: it reads the tokens.
- **`swiss`** (**mock-up, pending decision**, 23 Oct 2026): the International Typographic Style. Strict grid and a lot of
  air (`gap` 16 px, `gap-l` 28 px), black / white / greys, **one signal red** (`#e30613`, 4.88 : 1 as text on white and with
  white on it; at night `#ff3b47` with black ink, 5.63 : 1 as text on the page, 5.97 : 1 with its ink), radius 0, thin
  rules instead of cards, Helvetica / Arial (system fonts only), page title large and bold (`title-size` up to 2.75rem,
  weight 700, tight tracking), section titles (`h2`, `h3`) as small spaced capitals (the capitals are a rule of
  `swiss.css`: `title-case` is one token for the three heading levels), figures tabular. The landmark colour exists
  (the `metro` palette, as `--sog-mod-*`) but is shown only as the rule of the current verb in the rail. Night: near-black
  (`#0a0a0a`), light grey text, the same red lightened. Frame rules and open points: [DECISIONS.md](DECISIONS.md).
- **`cupertino`** (**mock-up, pending decision**, 23 Oct 2026): the iOS Settings look. Very light grey page (`#f2f2f7`) with
  white grouped cards of radius 10, no shadow, system blue (`#007aff` day, `#0a84ff` night, links `#0066cc` by day) for
  actions and links, hierarchy by spacing, rules and the muted grey, 44 px controls, system fonts (SF where it exists),
  page title large, 16 px text. Night: black page, `#1c1c1e` cards. Buttons are blue text or a filled blue
  rectangle (radius 10, never a full pill); tabs and steps are a segmented control; row lists are one rounded group with
  hairlines and a chevron; the rail on a screen is a plain list whose icons take the module's colour, the bottom bar the iOS tab bar (§ 3.1). Frame rules and open points: [DECISIONS.md](DECISIONS.md).
- **`material`** (**mock-up, pending decision**, 23 Oct 2026): Material Design 3. Tonal surfaces: page `surface` (`#fbf8ff`),
  cards `surface-container` (`#f3f0fa`), fields `surface-container-high` (`#e9e6f1`); one muted blue-violet primary (`#5359c6`:
  as text 5.53 : 1 on the page, 5.16 on a card, 4.72 on a field; white on it 5.81; at night `#b9bdff` with ink `#1c2170`, 7.39 to
  9.61 as text, 7.85 with its ink); `on-*` inks (`#1b1b21`, muted `#47464f`); radius 12 (cards), 4 (fields), buttons as pills
  (a frame rule: half the 44 px target); base text 15 px, Roboto when installed, otherwise the system sans, titles in sentence
  case at weight 500, page title 1.75rem. **Two elevation levels only**: 1 dp on cards (`--sog-shadow-card`), 3 dp on the sticky
  bar, notes and dialogs (`--sog-shadow`, `--sog-shadow-up`). Outlined secondary buttons, the primary filled; fields with a
  1 px outline that becomes 2 px primary on focus; tabs with a 3 px primary indicator; steps as tonal chips; the header is a top
  app bar on the page surface; the bottom bar is a Material navigation bar (64 px, a 64 × 32 pill behind the active icon) and the rail on a screen a navigation rail (88 px column, icon above the label, a 56 × 32 indicator); the
  landmark colour tints the active indicator only. Night: `#1c1b1f` page, `#26242b` cards, `#312f38` fields, primary lightened.
  Frame rules and open points: [DECISIONS.md](DECISIONS.md).
- **`aqua`** (**retained by the user**, 28 Oct 2026; **computers only**): the Aqua desktop of the early 2000s. Brushed light
  metal for the header and the rail, white glass cards (94 % opaque, light rim, soft drop shadow), gel buttons (a light gel;
  the primary button, the selected tab or step and the rail's current verb in the accent's blue gel, white text 5.3 : 1),
  sunk fields, fine horizontal stripes on the page, Lucida Grande (Segoe UI where it is missing), radius 8 (bars square).
  **One panel per module** behind the view (`data-landmark`): a desk scene set at the right, faded towards the left where the
  text sits, at 50 % (night 60 %); fuel = gear, maps = navigation, report = operations, flightlog = aircraft, website = awards,
  atmosphere = time, settings (and the frame's screens) = radio. Night: dark brushed metal, dark glass, the accent lightened
  with a dark ink (6.3 : 1).
  - **Computers only.** The frame marks a computer with `html.f-desk` (wider than 760 px, a precise hovering pointer, not a
    phone in landscape; frame INTEGRATION § 9.1). `aqua.css` only acts under `html.f-desk`. Elsewhere Aqua is **neither offered
    nor drawn**: `designs()` leaves it out, and a device whose saved choice is `aqua` keeps that choice but the frame applies
    `standard` (`design().applied`), at first paint too (`index.html`). A tablet with a mouse or a trackpad passes for a
    computer, and that is accepted (no device sniffing).
  - **Tokens only on shared selectors**: everything Aqua changes on a button, a card, a field, the bar, the header or the rail
    goes through the skin tokens (§ 2); its own rules only touch elements no other design styles (the header's and rail's
    `::before`, `body`, `body::before`).
  - **Weight**: `aqua.css` is in the shell (small); the images never are. Only the current module's panel is fetched (about
    60 KB), and only on a computer in Aqua; the service worker keeps it once seen. On a phone: not one byte of Aqua's images
    (test H6).
  - Measured (test H5): header name over the header, and page text (outside the cards) over the panel, worst pixel: 12.1
    (fuel, day), 14.1 (fuel, night), 5.0 (settings, day, muted text), 8.0 (settings, night).
  - Open: objects inside the modules (V2's notebooks, register sheet) — "to see later" (user), they are part of the interest of
    a skeuomorphic design; the dual view shows the main module's panel only.
- **Bottom tab bar** (phone, `frame/frame.css`; the frame draws the markup, `APP.tabs`, frame SPEC § 3.1). Markup:
  `nav.f-tabbar > ul > li > a[data-tab][data-landmark]` holding `span.f-tab-ico` (the line icon and the filled one, the
  stylesheet shows one) and `span.f-tab-lbl`; the selected tab has `aria-current="page"`. Default (`standard`, `cabinet`,
  `field`): `--sog-surface`, a top hairline, 56 px (`--f-tab-h`) plus the safe area, line icons in `--sog-muted`; the
  selected tab shows the **filled icon** on a 56 × 30 pill (`--f-tab-pill`, 14 % of the accent into the surface), its label in
  `--sog-link` at weight 600. Each mock-up gives its own, in its own sheet (tokens first, minimal rules):
  - `metro`: flat blocks side by side (2 px apart) on the page colour, each with a 4 px rule in its module's colour; the
    selected block is filled with that colour, ink `--sog-module-ink`, no pill;
  - `swiss`: the page colour, a 1 px rule of the text colour on top, labels at 10 px; the selected tab bold, filled icon, no pill,
    and a 2 px rule in the signal red under its label;
  - `cupertino`: the iOS tab bar: surface at 94 % over a 20 px blur, hairline on top, 10 px labels, filled icon and label in the
    system blue for the selected tab, no pill;
  - `material`: a navigation bar of 64 px (`--f-tab-h`), 3 dp shadow, a 64 × 32 pill tinted with the module's colour (24 %) behind the
    filled icon, labels in the ink (weight 600 when selected).
  The same bar's rule `.f-bar { bottom: var(--f-tab-space, 0px) }` keeps the sticky result bar above it. The bar and the status
  line are hidden in print.
  - **Landscape on a phone** (`html.f-land`, set by the frame: window wider than high and under 1024 px; V3_SPECIFICATION § 7.1
    rule 7): the same bar is a **rail of icons at the left edge**, `--f-rail-w` (44 px) wide, full height under the header, no
    label (`.f-tab-lbl` hidden, the `<a>` has `aria-label` and `title`), 44 × 44 cells, the active pill 36 × 36, the line on its right
    inside (`box-shadow: inset`), `--f-tab-space` 0. The designs' bar rules above apply to the rail unchanged at any width (they
    are no longer inside `@media (max-width: 760px)`: the bar is displayed on a phone and in landscape only); the pill of
    `material` becomes 36 × 36, the border-top of `swiss` and the shadow of `material` give way to the inside line.
- **Applied by attributes**: `html[data-design]`, and `html[data-tone]` = `day` | `night` (absent: automatic).
- **Night**: when the system asks for it (`prefers-color-scheme: dark`), unless `data-tone="day"`; always with
  `data-tone="night"`. Night sets are for the screen only (`@media screen`): print keeps the day's ink.
- **Every set declares every colour, its fonts and its radii.** So a block can carry its own
  `[data-design][data-tone]` (the demo page).
- **Choice**:
  - The user chooses in Settings (a Design card, owned by the settings session).
  - The choice is written to `device/design.json` (`{ design, tone }`, cache policy, never synchronised) through
    `ctx.saveDesign`.
  - The frame applies it at once, writing an attribute only when it changes, mirrors it in `localStorage`
    (`sogFrame:design`), and sets the system bar colour (`theme-color`) from `--sog-surface`.
  - An inline line at the top of `frame/index.html` reads the mirror and sets the attributes before the first paint.
  - The settings screen's context gets `designs()` (id, labels in four languages, textured, `desktop` for a design kept for
    computers; on another device those are left out) and `design()` (`{ design, tone, applied }`: `design` is the saved
    choice, `applied` the one on `<html>`; they differ when the choice is a computer's design on another device).

## 4. Primitives

| Primitive | Markup | Rule |
|---|---|---|
| Buttons | `button`, `button.primary`, `.f-btn` (a link or a button with an icon) | 44 px high; disabled at .55 opacity |
| Fields | `input`, `select`, `textarea`; checkboxes and radios | 44 px, text at 16 px, background `surface-2`; checkboxes 20 px, inside a 44 px `f-check` label |
| Links, focus | `a`, `:focus-visible` | `link` colour; 2 px `focus` outline |
| Headings | `h1`–`h3` inside `.f-view` | title font, case and spacing of the design, the `h1`–`h3` sizes |
| Card | `.f-card`, `.f-card.f-accent` | |
| Row, field, check | `.f-row`, `.f-field`, `.f-check` | fields fill their cell |
| Text | `.f-muted`, `.f-ok`, `.f-warn`, `.f-err`, `.f-msg[data-kind]` | |
| Term / value | `dl.f-dl` | |
| Folded section | `details` (`.f-card` or not) with `summary` | the summary line is the target (44 px), the frame's chevron |
| Tabs, steps | `.f-tabs`, `.f-steps` around buttons | active: `aria-pressed="true"`, `aria-selected="true"` or `aria-current`; a done step: `data-done` (✓) |
| Field grid | `.f-grid` (`--f-min`, default 130px), `.f-full` | auto-fit columns |
| Columns | `.f-cols` (`--f-cols`, default 3) | columns from a 900 px wide pane (container query), one column below |
| Sticky bar | `.f-bar` | bottom of the view, accent border, `shadow-up` |
| Table | `.f-table` in `.f-scroll`, numbers `.f-num` | |
| Tiles | `.f-tiles` with a `b` per tile | |
| Row list | `.f-list` of `.f-item` (a button or a link) | 44 px rows, text and an end column |
| Dot, badge | `.f-dot`, `.f-badge`, with `data-kind` = `ok`, `warn`, `err`, `accent` | |
| Toolbar | `.f-tools` (a title, then buttons) | |
| Callout | `.f-callout` | accent left rule on `surface-2` |
| Sheet | `.f-sheet` (the module's root) > `.f-sheet-panel` > `.f-sheet-head` (`.f-sheet-grip` with `.f-sheet-title`, `.f-sheet-close`) + `.f-sheet-body`, driven by `frame/lib/sheet.js` | three positions from the tokens `--f-sheet-head` (45px), `--f-sheet-head-bare` (28px, the bare handle below), `--f-sheet-default` (30 %, 35 % from 761 px; floor `-default-min` 170px), `--f-sheet-expanded` (70 %; floor `-expanded-min` 260px), set with no weight on `.f-sheet` so a module overrides them on its root; neutral: `--sog-surface`, a `--sog-border` hairline on top, `--sog-radius` top corners, a grip bar of `--sog-muted` at 55 %; header 44 px, body `overflow: auto; overscroll-behavior: contain`; collapsed shows the header only; no transition during a drag or under `prefers-reduced-motion`. **Landscape on a phone** (`html.f-land`): the panel is a column at the right of the map, width `max(--f-sheet-side, --f-sheet-side-min)` (40 % of the root, 280 px; `expanded`: `--f-sheet-side-max`, 60 %), full height, a hairline and a shadow on its left, `--sog-radius` on its top-left corner, a chevron at the end of the grip row; two positions, no collapsed. **Bare handle** (`.f-sheet-head-bare` on the header, set by the module over a drawing, never over a list): a line of `--f-sheet-head-bare` (28 px; collapsed panel 29 px with the hairline), the grip bar, no title, the header's buttons (chips, ◀ ▶, `.f-sheet-close`) 28 px high on the same line at the right with a 44 px touch zone by `::after`, a 4 px gap; same gestures; the primitive measures the header. Contract: frame/INTEGRATION.md § 11 |
| Overlay layer | `.f-overlay` > `.f-ov-col.f-ov-left` / `.f-ov-right` > `button.f-ov-btn`, made by the frame (`ctx.overlay`) | round 44 px buttons (48 px hit) on `surface` at 92 % over a map; square where `--sog-radius` is 0; `aria-pressed` tinted with the accent; the column gap is 8 px, 4 px in landscape on a phone (`html.f-land`); no exit chip (the full-screen button shows `minimize`; `frame/INTEGRATION.md` § 9.3, § 9.4) |
| Group popover | `.f-tabpop` > `button.f-tabpop-row`, made by the frame | 44 px rows on `surface`, a hairline, a pointer on the tab; the current row `aria-current` (accent at 12 %) |
| Icons | `frame/lib/icons.js` → `<svg class="f-icon">` | `currentColor`, 20 px |

## 5. Icons

- `frame/lib/icons.js` holds the 53 line icons of V2 plus `menu`, `wand-sparkles` (maps: the Auto map mode) and `minimize` (full screen; `maximize` was already there): a 24 px grid, stroke 2, `currentColor`. **Filled variants** (24 Oct 2026) of the tab icons (`fuel`, `map`, `edit`, `list`, `settings`, and `cloud` for the Météo tab, § 7.1 rule 14): the same drawings and grid, shapes filled with `currentColor` (cut-outs and gaps in the shape, no second colour); `svg(name, { filled: true })`, marked `data-filled`; `hasFilled(name)`.
- API: `svg(name, { size, title })`, `has`, `names`. An icon is decorative unless it has a `title`.
- The frame draws the rail verbs (`APP.modules[].icon` is an icon name), the tabs (`APP.tabs[].icon`, line and filled) and the header's buttons with them.
- The textured V2 sets (brass…) are not carried over.

## 6. Density, print

- Every target is at least 44 px. Exception: a text link inside a sentence.
- Fields write at 16 px: iOS no longer zooms on them.
- One column under 760 px; `f-cols` from a 900 px wide pane. There is no design for phones: every design is one.
- **Print** (`@media print`):
  - the day's ink, white background;
  - no header, menu, notes, dialogs, sticky bars, tabs, steps or buttons;
  - cards not cut;
  - one column;
  - the frame opens the folded sections while printing (`beforeprint` / `afterprint`).
  - The mission report comes first.
