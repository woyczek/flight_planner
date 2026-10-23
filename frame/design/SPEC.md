# V3 design — specification (regeneration prompt)

The design block of the V3 frame: tokens, designs, primitives, icons, density, day / night, print. Owner: the design
agent (`.claude/agents/v3-design.md`). Memory: [DECISIONS.md](DECISIONS.md). Reading of V2: [READING.md](READING.md).
Module side: [INTEGRATION.md](INTEGRATION.md).

## 1. Files

| File | Role |
|---|---|
| `frame/design/tokens.css` | the `--sog-*` tokens and the three designs, day and night |
| `frame/design/primitives.css` | base elements and the layout primitives given to modules, print |
| `frame/frame.css` | the application's chrome (header, menu, view, notes, dialogs); imports the two files above, so a page that loads `frame.css` has everything |
| `frame/lib/icons.js` | the line icon set (ES module, owner: design) |
| `labs/design_primitives.html` | every primitive in every design, day and night, side by side; the icons; the chart colours |

## 2. Tokens

A design sets tokens and nothing else; a module reads them and never redefines one.

| Family | Tokens |
|---|---|
| Colours | `bg`, `surface`, `surface-2` (fields, callouts), `fg`, `muted`, `border`, `accent`, `accent-ink`, `link`, `focus`, `ok`, `warn`, `err`, `on-status` (text on ok / warn / err) |
| Overlays | `shadow` (notes, dialogs), `shadow-up` (sticky bottom bars), `veil` (dialog backdrop) |
| Charts | `chart-1` … `chart-6`, `chart-grid`, `chart-bg` |
| Type | `font` (shorthand), `font-title`, `font-mono`, `title-case`, `title-spacing`, `size-s` (.9em), `size-xs` (.8em), `h1` (1.25rem), `h2` (1rem), `h3` (.95rem) |
| Space | `gap` (12px), `gap-s` (6px), `gap-l` (20px) |
| Shape | `radius` (6px), `radius-s` (3px); both 0 in textured designs |
| Density | `touch` (44px), `field-text` (16px) |

All are prefixed `--sog-`. The breakpoints are not tokens: CSS media queries cannot read custom properties. They are
**760 px** (phone / screen) and **980 px** (columns).

## 3. Designs, day and night

- **Designs**: `standard` (default; V3's look), `cabinet` (V2 "Cabinet": parchment, ink, navy, brass, Palatino),
  `field` (V2 "Rugged": khaki plate and olive steel, Bahnschrift, uppercase titles). The textured ones keep square
  corners. Images (textures) are not used; they may come later if the user asks.
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
  - The settings screen's context gets `designs()` (id, labels in four languages, textured) and `design()`.

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
| Columns | `.f-cols` (`--f-cols`, default 3) | one column under 980 px |
| Sticky bar | `.f-bar` | bottom of the view, accent border, `shadow-up` |
| Table | `.f-table` in `.f-scroll`, numbers `.f-num` | |
| Tiles | `.f-tiles` with a `b` per tile | |
| Row list | `.f-list` of `.f-item` (a button or a link) | 44 px rows, text and an end column |
| Dot, badge | `.f-dot`, `.f-badge`, with `data-kind` = `ok`, `warn`, `err`, `accent` | |
| Toolbar | `.f-tools` (a title, then buttons) | |
| Callout | `.f-callout` | accent left rule on `surface-2` |
| Icons | `frame/lib/icons.js` → `<svg class="f-icon">` | `currentColor`, 20 px |

## 5. Icons

- `frame/lib/icons.js` holds the 53 line icons of V2 plus `menu`: a 24 px grid, stroke 2, `currentColor`.
- API: `svg(name, { size, title })`, `has`, `names`. An icon is decorative unless it has a `title`.
- The frame draws the menu verbs (`APP.modules[].icon` is an icon name) and the header's buttons with them.
- The textured V2 sets (brass…) are not carried over.

## 6. Density, print

- Every target is at least 44 px. Exception: a text link inside a sentence.
- Fields write at 16 px: iOS no longer zooms on them.
- One column under 760 px; `f-cols` from 980 px. There is no design for phones: every design is one.
- **Print** (`@media print`):
  - the day's ink, white background;
  - no header, menu, notes, dialogs, sticky bars, tabs, steps or buttons;
  - cards not cut;
  - one column;
  - the frame opens the folded sections while printing (`beforeprint` / `afterprint`).
  - The mission report comes first.
