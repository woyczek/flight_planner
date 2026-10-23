# V3 design — decisions log

The design agent's memory: every choice, dated, with its reason. Newest last. Project-wide decisions are in
`docs/technique/V3_SPECIFICATION.md`; the frame's in `frame/DECISIONS.md`.

- **23 Oct 2026 — Role taken** by the frame agent, on top of the frame (asked by the ergonomics session), in the frame's
  workspace; this file is its own memory, apart from the frame's.
- **23 Oct 2026 — Lot 1 (reading)**: [READING.md](READING.md). Proposed, awaiting the go:
  - one token set `--sog-*` (colours with `link`, `focus`, `surface-2`, overlays, type scale, space, shape, density,
    chart colours); a design sets tokens and nothing else, a module never overrides one;
  - V2's flat and textured designs become token sets (textured: `--sog-radius: 0`, their fonts); phone skins are
    dropped, V3 being phone-first in every design; no after-the-fact DOM decoration;
  - day / night from `prefers-color-scheme`, overridable in Settings; print in the frame;
  - V2's line icons as `frame/lib/icons.js`, instead of the menu's emoji;
  - the primitives that modules built by hand (headings, folded section, tabs / steps, field grid, columns, sticky bar,
    table, tiles, row list, dot / badge, toolbar, callout) move into the frame; duplicates go back to `f-warn`,
    `f-dl`, `f-muted`; `f-btn` is defined;
  - 44 px targets everywhere and 16 px field text on touch screens (iOS zooms below that).
- **23 Oct 2026 — Survey method**: 7 screens × 2 widths × day / night × 2 token sets (today's, and a Cabinet set applied
  over the tokens for the survey only), captures in a dedicated Chrome. Hard-coded colours are found by replacing every
  token twice and keeping the colours that do not move. Canvas colours are not seen by that probe: they are read in
  the code.
- **23 Oct 2026 — Lot 1 validated** by the ergonomics session:
  - designs `standard`, `cabinet`, `field` first, the others later;
  - tokens only in lot 2 (textures as images later, if the user asks for them);
  - **44 px targets everywhere**: this corrects the role file's 40 px;
  - print: the mission report first.
- **23 Oct 2026 — Lot 2, tokens and designs** (`frame/design/tokens.css`):
  - The proposed set, every token in every design, day and night; the radius is 0 in `cabinet` and `field`.
  - Night sets are wrapped in `@media screen`, so print always takes the day's ink without a second palette.
  - Every set declares all its colours, fonts and radii, so a block can carry `[data-design][data-tone]` (the demo
    page shows six panels side by side).
  - `field` has a day set (khaki plate) and a night set (olive steel); in V2 it was always dark.
- **23 Oct 2026 — One entry point**: `frame/frame.css` imports `design/tokens.css` and `design/primitives.css`.
  - Any page that already loads `frame.css` (the Pilot application, maps' test page) gets everything with no change.
  - The imports carry no `?v=` stamp: the launcher stamps only HTML, scripts and V2's design sheets, and a constant
    stamp would let the browser keep a stale copy. Without one they are revalidated; the service worker keeps them.
- **23 Oct 2026 — Primitives moved up** (`frame/design/primitives.css`):
  - new: headings, `summary` for every `details` (44 px, the frame's chevron), `f-tabs`, `f-steps`, `f-grid` /
    `f-full`, `f-cols`, `f-bar`, `f-table` / `f-scroll` / `f-num`, `f-tiles`, `f-list` / `f-item`, `f-dot` /
    `f-badge`, `f-tools`, `f-callout`, `f-btn`, `f-ok` / `f-err`, links, focus ring;
  - existing (cards, fields, checks, `f-dl`, messages) moved from `frame.css`;
  - `frame.css` keeps the chrome, with its shadows, veil and note text on tokens and 44 px note buttons.
  - Buttons keep their default display: only `.f-btn` is a flex box, so full-width buttons aligned left stay so.
- **23 Oct 2026 — Fields at 16 px everywhere**, not only on touch screens: one rule, and iOS no longer zooms on focus.
- **23 Oct 2026 — Icons**:
  - `frame/lib/icons.js` (owner: design) is an ES module with V2's 53 line icons plus `menu`;
  - the frame loads it at start, draws the menu verbs with it (`APP.modules[].icon` is now an icon name) and puts
    icons on the header's menu, help and settings buttons;
  - the header's icon buttons are 44 px squares, and the sync label stays on one line, shortened if needed (the help
    button had made the header wrap at 375 px).
- **23 Oct 2026 — Design choice**:
  - `device/design.json` (`{ design, tone: auto | day | night }`, cache policy), written by the Settings card through
    `ctx.saveDesign`;
  - `applyDesign` writes an attribute only when it changes, mirrors the choice in `localStorage` (`sogFrame:design`)
    and sets `theme-color` from `--sog-surface`;
  - an inline line in `frame/index.html` applies the mirror before the first paint;
  - the file stays the truth: the mirror alone is replaced by it at start.
- **23 Oct 2026 — Print**: `@media print` in the primitives (day ink, white, no chrome, bars or buttons, one column,
  cards not cut). The frame opens folded sections on `beforeprint` and closes them on `afterprint`: a reaction to an
  event, not an after-the-fact rewrite.
- **23 Oct 2026 — Corrections left to the modules**, sent to their agents through the ergonomics session:
  - fuel and report: their own sticky-bar shadow `#0002` (→ `.f-bar`);
  - maps: canvas colours (white profile and halos at night, light accent copied by value) → tokens;
  - report: the bookmarklet chip under 44 px;
  - every module: its own headings, tabs, grids, tables, `xx-warn`, `dl`, `xx-muted`, to replace by the primitives
    (they keep working until then).
  - The frame fixed what was its own: `summary` at 44 px everywhere (fuel's "Detailed route" included), links, fields.
- **23 Oct 2026 — Tests of lot 2**:
  - `labs/design_primitives.html`: six panels, 54 icons, folded sections 44 px, fields 16 px, no horizontal scroll;
  - the survey again: 7 screens × 375 / 1280 px × day / night × three designs (84 captures), no JavaScript error,
    no horizontal scroll;
  - every DOM colour follows the tokens (probe on every colour token), except fuel's and report's own bar shadow;
  - radii 0 in `cabinet` and `field`, except maps' credit (3 px, the module's).
- **23 Oct 2026 — Container queries for the widths of a pane** (user bug: "maps + three blocks side by side do not
  work" in the dual view):
  - The cause: `f-cols` and the modules' own rules were `@media (min-width: 980px)`, decided on the window. In the
    dual view Fuel had half of a 1280 px screen and squeezed three blocks into 506 px.
  - Now `.f-view` and every `.f-module` are containers. `f-cols`, the help tables and the roadmap (`.f-doc`, `.f-rm`)
    use `@container`. The threshold of `f-cols` is a 900 px wide pane: at 1280 px full screen a module is about
    1020 px wide (three columns), in the dual view 506 px (one column).
  - Audit of every width `@media`:
    - device, kept: the header (back link instead of the name), hiding the pane and its button under 980 px, the
      phone layout and drawer;
    - pane, moved to `@container`: `f-cols`, `.f-doc` tables, `.f-rm` roadmap; report's and flightlog's own
      `@media (min-width: 980px)`, sent to their agents.
    - `f-grid` and `f-tiles` were already intrinsic (auto-fit).
  - No module uses `position: fixed`, which a container would capture.
  - Tests:
    - Fuel and Report at 1280 px full screen: three columns;
    - in the dual view: one column, and the Map keeps its half (506 px each);
    - at 375 px: one column;
    - no horizontal scroll, no JavaScript error.
- **23 Oct 2026 — Icon added by maps** (lot 5d, `13b32160b`): `wand-sparkles`, for the Auto mode of the map modes
  selector. It follows the set's rules: paths only on the 24 px grid, no colour or stroke of its own. `map`, `plane`
  and `chevron-down` were already there.
- **23 Oct 2026 — "Metro" mock-up, on the user's request** ("on a branch, propose a Metro mock-up; once the frame is
  amended, we will decide the tokens"). Branch `v3-metro`, nothing pushed. **Mock-up, pending decision.**
  - What it is: a design `metro` (`tokens.css`, day and night, `DESIGNS` in `frame/app.js`, so it appears in the Settings
    Design card and persists like the others); its frame rules in `frame/design/metro.css` (all behind
    `[data-design="metro"]`, screen only); a demo page, `frame/design/demo_metro.html`, to open first.
  - What it does: flat colour blocks, square corners, no shadow, system fonts (`Segoe UI` first, no web font); page title
    (the module's `h1`) twice as large, light, left-aligned, in the module's colour, no card; section headings (`h2`)
    as pivot headings; small headings in discreet capitals; flat 2 px-outlined buttons, the primary one filled with the
    module's colour; fields on a flat grey with a 2 px bottom rule (the module's colour while typing); numbers tiles as
    colour blocks; table header ruled in the module's colour.
  - **One landmark colour per module**: `--sog-module`, `--sog-module-ink`, `--sog-module-text`, in **every** design (equal
    to the accent, link-coloured as text, so a module can use them later); only `metro` makes them visible. The frame
    posts `data-landmark` on `<html>` (`paintModule`, only when it changes; the inline line of `index.html` also reads
    the address, so the first paint has the colour), on each pane and on each menu link, **not** `data-module`: modules
    write selectors such as `[data-module="maps"] …`, which would have spread over the header and the menu (seen on the
    first try: the Map verb turned into a column).
  - Contrast (computed): white on the module colours 5.37 to 7.38 : 1 (WCAG AA 4.5); module colour as text on the
    day's white page 5.37 to 7.38, on a grey card 4.79 to 6.60; at night the lighter text variants 5.20 to 11.03 on
    the night surfaces. Orange had to go dark (`#b34700`): the usual Metro orange fails with white text.
  - **Frame amendments proposed for decision** (each: what, why, cost):
    1. **The page title belongs to the frame**: it writes the verb as the page's `h1` and modules drop their own (today
       each module writes its own `h1`: "Fuel and level", "Mission report", "Map"). Why: a Metro title is the verb,
       identical everywhere, and a single place sets its size, colour and position. Cost: one line in the frame, one
       line out of each module (`fuel`, `report`, `flightlog`, `maps`, `website`), their `DECISIONS.md`; maps' `h1`
       sits in its toolbar. The mock-up styles the existing `h1` and changes no module.
    2. **`data-landmark` and the three module tokens in the frame's contract** (`INTEGRATION.md`): modules may read
       `--sog-module*` for their own accents (a map layer, a chip), never write them. Cost: a paragraph; no behaviour.
    3. **A tint on the header and on the system bar** (`theme-color` now follows the header's real colour, not
       `--sog-surface`): the colour of the module on screen. Cost: `paintBar` in the frame; identical in the other
       designs (the header is still the surface colour).
    4. **Verb blocks in the drawer** (two per row, 104 px, icon and verb; the last odd one full width) and a rail on a
       screen. Why: the verbs become the application's home on a phone, with the colours learned by sight. Cost: CSS
       only; it needs the menu to stay at seven verbs or fewer (an eighth makes a fifth row; the drawer scrolls).
    5. **Title tokens**: `--sog-title-size` and `--sog-title-weight` (every design: 1.25rem and 700, today's look,
       checked pixel for pixel); `--sog-h1` stays the size of figures (`fu-big`, tiles), not of the page title. Cost: two
       tokens, one rule.
    6. **Flat buttons and bottom-ruled fields** are tokenless rules in `metro.css`. If Metro is chosen, either they stay
       in that file (a design owns its rules), or the primitives take tokens (`--sog-btn-border`, `--sog-field-rule`) so
       that every design can use them. Cost of the second: ten lines of primitives, nothing for a module.
    7. **Tiles of numbers** as colour blocks (`.f-tiles`) change the meaning of that primitive: a coloured tile reads
       as a button. Open: keep them, or use a left rule only.
  - **Left open**:
    - the palette (the exact hues, orange in particular; an alternative is dark text on light fills, which breaks the
      "white on colour" rule) and the night fills (the day's, with light text variants);
    - whether the sticky bar (`.f-bar`) takes the module's colour as a block: not done, because its content carries
      status colours (`f-warn`, `f-err`) that would lose their contrast on a colour block; it has a 6 px rule in the
      module's colour instead;
    - titles in lower case (Metro style) and the Segoe UI Light face: on a device without it, the system font at weight
      300 may fall back to regular (the capture machine had no light face);
    - the settings card keeps the grey of `settings`; help and conflicts take it too;
    - no module was changed. Noted for their agents if Metro is chosen: fuel's `+30` / `Now` row overflows its card by
      a few pixels on a phone (also in `standard`); maps' canvas colours are not tokens yet.
  - Checks: `standard`, `cabinet`, `field` identical to the commit before, pixel for pixel (Fuel, Report, Map,
    My flights, menu, 390 and 1280 px, day and night; only the Settings page differs, by the new Metro thumbnail);
    no JavaScript error; no horizontal scroll at 390 px; every target at least 44 px.
