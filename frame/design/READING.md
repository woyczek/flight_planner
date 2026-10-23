# V3 design — lot 1: reading of V2's designs, and what the Pilot application keeps

The V3 design agent's first page. No code. Sources: `shared/designs.css`, `shared/designs_skeuo.css`,
`shared/block_icons.*`, `shared/mobile.css`, `shared/design_deco.js`, `shared/repository_nav.js`, `config/repository_tree`
(V2), and `frame/frame.css`, `frame/settings/settings.js` and the six modules of the Pilot application (V3).

## 1. What V2 has

- **Eleven designs** in `REPOSITORY_TREE.designs`:
  - flat: `standard`, `aero`, `ops`, `console`;
  - textured: `cabinet`, `flightlog` (based on cabinet), `field`, `aqua`, and `tactique` (textured look with no images);
  - two phone skins: `mobile`, `mobile-swiss`.
- **Applied by attributes on `<html>`** (`data-design`, `data-skeuo`, `data-tone`, `data-surface`, `data-icons`, `data-mobile`…),
  set before first paint by an inline boot script that `document.write`s the style sheets.
- **Tokens**:
  - flat designs have almost none (hard-coded px values);
  - textured designs have about 220 `--sk-*` component tokens (`-bg`, `-ink`, `-border`, `-radius`, `-shadow` per family),
    on top of a palette per design (`--cab-*`, `--fd-*`, `--aq-*`, `--tq-*`).
- **Square corners**: `html[data-skeuo]{--repo-round:0}`, but only for rules written with that multiplier; textured
  blocks keep 10–14 px radii (0 only in flightlog).
- **Day / night**:
  - desktop designs ignore `prefers-color-scheme`: `data-tone="dark"` is deduced from the page colour's luminance;
  - only the phone skins have auto / day / night.
- **Icons**: 53 line icons (24 px grid, stroke 2, `currentColor`) in `shared/icons/repository_icons.js`.
  - Weights: fine / bold / off.
  - Composed textured sets (brass, avio, steel, gel) are drawn over webp blanks.
- **Phone**: `data-mobile` set by script (≤ 760 px, or a coarse pointer in landscape).
  - Layout: a bottom bar of 5 entries plus "More", one column.
  - Sizes: 44 px nav targets, 40 px buttons and fields, 16 px text in fields.
  - Tables scroll sideways or turn into cards.
- **Print**: textures stripped (white, black ink, no shadow); header, footer and block tools hidden.
- **After-the-fact DOM work**: `design_deco.js` inserts friezes, objects and backgrounds, chosen by regexes on French
  block titles, under ResizeObserver and MutationObservers. `block_icons.js` wraps headings and patches
  `AppFramework.refresh`.

## 2. What V3 keeps, and how

| V2 | V3 |
|---|---|
| Designs as attributes on `<html>` | Kept: `html[data-design]` and `html[data-tone]`, set by the frame before first paint |
| Per-component tokens (`--sk-*`) | Kept as an idea, **one token set** `--sog-*` (§ 3). A design is a file that sets tokens and nothing else; a module never overrides one |
| Flat designs `standard`, `aero`, `ops`, `console` | Token sets. `standard` is today's V3 look |
| Textured `cabinet`, `flightlog`, `field`, `aqua`, `tactique` | Token sets with `--sog-radius: 0` (angles stay square) and their fonts. Textures, if any, only on the frame's own chrome (header, menu, card background token), never inside a module, and kept offline by the service worker |
| Phone skins `mobile`, `mobile-swiss` | Dropped as designs: V3 is phone-first in every design (§ 5) |
| `--repo-round` multiplier | Replaced by `--sog-radius` (0 in textured designs) |
| Luminance-guessed tone | Dropped: `prefers-color-scheme`, overridable by the user (auto / day / night); every design defines both |
| Line icon registry | Kept: becomes `frame/lib/icons.js` (owner: design), used for the menu verbs and the frame's buttons |
| Composed textured icons (brass…) | Later, if asked; not in the first lots |
| `design_deco.js`, `block_icons.js` DOM rewriting | Dropped (rule "value at the source"): a decoration, if any, is drawn by the frame when it builds its chrome |
| `document.write` boot, `:not(#imp)` hacks, `!important` palettes, page-specific selectors, CPCO gold | Dropped |

## 3. Tokens (proposal)

Today `frame/frame.css` has 14: `bg`, `surface`, `fg`, `muted`, `border`, `accent`, `accent-ink`, `ok`, `warn`, `err`,
`radius`, `gap`, `touch`, `font`. Proposed set, every one defined by every design, day and night:

| Family | Tokens | Note |
|---|---|---|
| Colours | `--sog-bg`, `--sog-surface`, `--sog-surface-2` (sunken field, table stripe), `--sog-fg`, `--sog-muted`, `--sog-border`, `--sog-accent`, `--sog-accent-ink`, `--sog-link`, `--sog-focus`, `--sog-ok`, `--sog-warn`, `--sog-err`, `--sog-on-status` (text on ok / warn / err) | `link` and `focus` are new: links are the browser's blue today, even at night |
| Overlays | `--sog-shadow` (sticky bars, notes), `--sog-veil` (dialog backdrop) | replaces the `#0002`, `#0004`, `#0007` written in the frame and two modules |
| Type | `--sog-font`, `--sog-font-title`, `--sog-font-mono`, `--sog-size-s` (.9em), `--sog-size-xs` (.8em), `--sog-h1` (1.25rem), `--sog-h2` (1rem), `--sog-h3` (.95rem) | the heading scale is rewritten today in five modules |
| Space | `--sog-gap` (12px), `--sog-gap-s` (6px), `--sog-gap-l` (20px) | |
| Shape | `--sog-radius` (6px; 0 in textured designs), `--sog-radius-s` (3px; 0 likewise) | |
| Density | `--sog-touch` (44px), `--sog-field-text` (16px on touch screens) | see § 5 |
| Chart | `--sog-chart-1` … `--sog-chart-6`, `--sog-chart-grid`, `--sog-chart-bg` | for maps' canvas and fuel's drawings, read once with `getComputedStyle` |

Breakpoints cannot be custom properties in media queries. The frame owns two: **760 px** (phone / screen) and
**980 px** (multi-column). Four modules already use 980 on their own.

## 4. Primitives

**In the frame today:** `button`, `button.primary`, fields, `f-card`, `f-row`, `f-field`, `f-check`, `f-muted`, `f-dl`,
`f-msg`, `f-warn`, `f-zone`, `f-level`, the menu, notes, dialogs, and the synchronisation light.

**Built by hand in the modules, to move up into the frame** (each seen in two modules or more):

| Primitive | Today | Proposed class |
|---|---|---|
| Heading scale | h1 / h2 / h3 in fuel, report, flightlog, website, maps | frame styles for `h1`–`h3` in `.f-module` |
| Folded section | `details.f-card > summary` in fuel, report, flightlog (summary 20–22 px high) | `details.f-card` with a 44 px summary and its chevron |
| Tabs / steps | `.fu-tabs` (fuel), `.rp-steps` (report, done ✓, current) | `f-tabs`, `f-steps` |
| Field grid | `.fu-grid3`, `.rp-grid`, `.ws-grid` | `f-grid` (auto-fit, `f-full` to span) |
| Columns on a wide screen | `.fu-top`, `.rp-cols`, `.ws-cols` at 980 px | `f-cols` |
| Sticky action bar | `.fu-result`, `.rp-bar` (shadow `#0002`) | `f-bar` |
| Table | `.fu-table`, `.ws-table`, with their scroll wrappers | `f-table` in `f-scroll` |
| Stat tiles | `.fu-kv`, `.fl-tiles` | `f-tiles` |
| Row list | `.fu-sheet`, `.fl-row`, `.rp-choice` | `f-list` / `f-item` |
| Dot / badge | `.fu-dot`, `.fl-dot`, `.rp-src` | `f-dot`, `f-badge` |
| Toolbar | `.fl-tools`, `.mp-head` | `f-tools` |
| Callout | `.ws-preview`, `.rp-prefill` | `f-callout` |

**Duplicates of what exists:**
- `.fu-warn`, `.rp-warn` and an inline `color:var(--sog-warn)` in website → `f-warn`;
- the `dl` of flightlog and website → `f-dl`;
- `.mp-muted` → `f-muted`.

**Used but missing:** `f-btn`, used by maps. **Truly module-specific, staying in the module:** fuel's charts, maps'
map and profile, report's bookmarklet chip.

## 5. Density: one rule for screen and touch

- **Phone first, in every design:**
  - one column under 760 px;
  - the menu in a drawer (today's frame);
  - sections folded by default where a screen is long (`details.f-card`).
- **Targets 44 px** for everything tappable:
  - buttons, summaries, checkboxes with their label, row buttons, links that act as buttons.
  - This is above the role file's 40 px, because the frame already uses 44 and Apple's minimum is 44 pt.
  - Today below it: fuel's "Detailed route" summary (20 px), report's bookmarklet chip (32 px), the website's inline
    link (18 px), settings' checkbox inputs (20 px) and summary (22 px), and the frame's own note buttons (28 px).
- **Fields at 16 px text on touch screens**: the frame's 15 px makes iOS zoom into every field it focuses.
- **Wide screens**: `f-cols` from 980 px, with no other change. Density is never a separate design.

## 6. Day / night, print

- **Day / night**: each design defines both sets.
  - `html[data-tone]` follows `prefers-color-scheme` by default.
  - Settings may force day or night.
  - Canvases read the tokens again when the tone changes. Today maps paints a white profile and white halos at night.
- **Print** (`@media print` in the frame, every design):
  - white and black;
  - no header, menu, sticky bar, buttons or notes;
  - folded sections open (`beforeprint`: an event, not a rewrite of text);
  - one column.
  - This matters first for the mission report.

## 7. The user's choice (Settings)

- A **Design** card in Settings (owned by the settings session): thumbnails of each design, tone (auto / day / night)
  and icon weight.
- It is written to `device/design.json` (cache policy, never synchronised).
- It is mirrored in `localStorage` (`sogFrame:design`), so that the frame's inline boot line sets
  `html[data-design]` / `[data-tone]` before first paint, with no flash.

## 8. Survey (23 Oct 2026, launcher, Chrome)

Seven screens (fuel, maps, report, flightlog, website, hello, settings), each at 375 × 812 and 1280 × 800, in day and
in night. Two designs: today's frame tokens, and a Cabinet set (parchment, navy, serif, `--sog-radius: 0`) applied
over the tokens for the survey only. That makes 56 captures, all without JavaScript errors and without horizontal
scroll at 375 px.

| Check | Result |
|---|---|
| Colours of the module pages (probe: every token replaced twice, colours that do not move are hard-coded) | All follow the tokens, except links (browser blue, report and website) and the sticky bars' shadow (fuel, report) |
| Cabinet set | Every module follows: paper, ink, square corners, serif. Not following: the menu's emoji icons (⛽ stays red), links, maps' canvas |
| maps canvas (code) | Its own palette: cartographic colours (fine), but also the light accent `#1d6fd8` copied by value, white profile and halos in night mode |
| Font sizes in use | 10, 11.25, 12, 13.5, 13.8, 15, 15.2, 16, 20, 20.8, 22.5, 30 px: no shared scale |
| Radii | 6 px everywhere, 3 px on maps' credit |
| Targets under 44 px | see § 5 |
| Frame | `theme-color` and the manifest's colours are written by value; notes' `#fff` text; the header height is assumed at 57 px |

## 9. Questions for the go

1. Which V2 designs come first? Proposal: `standard` (today), `cabinet` and `field` (one light textured, one dark
   textured), then the others.
2. Textures (images) on the frame's chrome in the textured designs, or tokens only (colours, fonts, square corners)?
   Proposal: tokens only in lot 2, images later if wanted.
3. 44 px targets everywhere, instead of the role file's 40 px?
4. Print: the report first, the others when asked?
