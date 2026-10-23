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
