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
- **23 Oct 2026 — "Swiss" and "Cupertino" mock-ups, on the user's decision** (three designs kept for V3: `metro`, `swiss`,
  `cupertino`; `cabinet` goes, `field` may stay — `docs/technique/V3_SPECIFICATION.md` § 10 point 3). Branch `v3-metro`,
  nothing pushed. **Mock-ups, pending decision**, built the way Metro was: token sets first, frame rules only where tokens
  cannot carry the look, everything behind `[data-design="swiss"]` / `[data-design="cupertino"]` and `@media screen`, no
  module touched, system fonts only (no web font).
  - **What changed**: both sets in `tokens.css` (day, forced night, system night; every token declared like the others,
    including the `--sog-mod-*` palettes); both in `DESIGNS` of `frame/app.js` (labels "Swiss" / "Cupertino" in the four
    languages, `textured: false`, so they appear in the Settings Design card and persist like the others); `swiss.css`
    (about 130 lines) and `cupertino.css` (about 190), imported by `frame.css` after `metro.css` and added to `sw.js`; the
    inline first-paint line of `frame/index.html` accepts the two names (without it a reload would paint `standard` first);
    the landmark selectors of `tokens.css` now read `:is([data-design="metro"], […"swiss"], […"cupertino"])` (one block per
    module instead of one per design; Metro unchanged); the demo page takes `?design=metro|swiss|cupertino` (default metro,
    same scenes, the file keeps its name).
  - **Swiss**: tokens — white page, cards white on white, `#0a0a0a` ink, grey `#595959` secondary text, `#ccc` hairlines,
    red `#e30613` (link text `#d70010`), radius 0, `gap` 16 / `gap-l` 28, Helvetica / Arial stack, `title-size` up to 2.75rem
    at weight 700, `h2` / `h3` 0.8 / 0.75rem. Night: `#0a0a0a`, `#f2f2f2`, red `#ff3b47` with **black** ink.
    - Frame rules tokens cannot carry (all in `swiss.css`): header on the page colour with a 2 px black rule and the
      name in spaced capitals; header icon buttons without frame; menu as a plain list (the current verb bold with a 4 px
      rule in its module colour; on a phone large 56 px rows with a hairline); page title margins and line height; `h2` / `h3`
      as small spaced capitals (`title-case` is one token for the three levels, so h1 cannot be left alone); card, tiles,
      list item, sticky bar as a top rule or a bottom hairline instead of a box (a rule on `.f-card` also takes the
      `summary` margins); buttons with a black 1 px border and a red primary; tabs as underlined text; table header as
      small capitals under a black rule; tabular figures on the header and the view (`font-variant-numeric`).
    - Shared with Metro (same rule, written twice): the header name in spaced capitals, header buttons without frame, `h3` as
      muted capitals, `.f-pane h1` at 1.6rem, `h1` line height / margin / `overflow-wrap: anywhere`, table header as small
      capitals under a rule, sticky bar border, outlined buttons, list rows as lines.
  - **Cupertino**: tokens — `#f2f2f7` page, white cards of radius 10 (`radius-s` 6), `#eeeef3` field fill, `#6c6c70`
    secondary text, `#c6c6c8` hairlines, `#007aff` accent, `#0066cc` link, 16 px base text (the other designs 15), no shadow,
    `gap` 16 / `gap-l` 24. Night: `#000` page, `#1c1c1e` cards, `#2c2c2e` fields, `#0a84ff`. Landmark palette: its own
    (darkened iOS hues, white on each 4.85 to 5.99 : 1; lighter variants at night, unused in the day's list).
    - Frame rules tokens cannot carry (all in `cupertino.css`): header icon buttons as blue icons without frame; every
      button as blue text without frame or fill (the primary a filled blue rectangle, radius 10), a light grey fill while
      pressed; tabs and steps as a segmented control (grey track, the current one on a card-coloured thumb, lighter at
      night through `light-dark()`); cards, tiles and fields without a visible border (the "accent" card keeps its
      border; a focused field takes the accent); row lists as one rounded group with hairlines and a chevron on every
      `.f-item` (a pseudo-element in a third 12 px column); menu as a grouped list on a phone (icon in a 30 px square of the
      module colour, hairline starting after the icon, chevron, current verb in link colour), a plain list in the rail on a
      screen (module-coloured icon, current verb blue as today); `h3` as muted capitals; page title spacing.
    - Shared with Metro: header buttons without frame, `h3` as muted capitals, `.f-pane h1` 1.6rem, `h1` spacing, card
      border made transparent, `.f-nav` on the page colour.
  - **Candidates for a token or a primitive** (the same rule written for two or three designs; to settle with point 6 of
    the open points in the specification):
    1. **Section label case**: `h3` (and Swiss's `h2`) as small muted capitals is in all three mock-ups. A pair
       `--sog-label-case` / `--sog-label-spacing` (and a `--sog-label-color`) would remove three rules.
    2. **Button chrome**: Metro 2 px black outline, Swiss 1 px black outline, Cupertino no outline and blue text; one
       `--sog-btn-border` (width, colour) and `--sog-btn-ink` would carry all three (plus today's looks) — the token pair
       already named in the specification (`--sog-btn-border`, `--sog-field-rule`).
    3. **Card chrome**: no border (Metro, Cupertino), a top rule (Swiss): `--sog-card-border` (a shorthand per side) would
       carry the three.
    4. **Header buttons without frame** (all three): a primitive modifier or a token (`--sog-head-btn-border`).
    5. **Pane title size** (`.f-pane h1` 1.6rem, all three): a token `--sog-title-size-pane`, or a container query on the
       title size.
    6. Field chrome (Metro bottom rule, Swiss and Cupertino none or a fill) and the tab / step / row-list looks (pivot
       titles, underline, segmented; left rule, hairline, grouped with chevron) are genuinely per design: they stay rules.
  - **Contrast (computed on the final tokens)**, WCAG ratios, forced night and system night checked identical:
    - Swiss day: red as text 4.88 : 1 on the page and cards, 4.56 on a field; link `#d70010` 5.39 / 5.03; white on the red 4.88.
      Night: red as text 5.63 : 1 on the page and cards, 4.95 on a field; the ink is black on the red, 5.97 (white would be 3.52
      — on `#0a0a0a` a red needs a relative luminance of at least 0.189 to reach 4.5 : 1 as text, and at most 0.183 to reach
      it with white on it: no red does both). Secondary text 7.0 (day) / 7.85 (night); status colours 5.08 to 10.49.
    - Cupertino, **below 4.5 : 1 (kept to the user's hexes)**: day, `#007aff` as text 4.02 on a card, 3.60 on the page, 3.47 on a
      field, **white on `#007aff` 4.02** (the filled buttons); night, white on `#0a84ff` 3.65, `#0a84ff` as text 4.66 on a card
      (passes), 3.82 on a field. Passing: link `#0066cc` 5.57 / 4.99 / 4.81, secondary text 4.52 to 7.31, status colours
      4.99 to 10.39. To pass everywhere: day accent `#0066cc` (white 5.57, on the grey page 4.99); night, black ink on `#0a84ff`
      (5.76). Both are one token each.
  - **Open points**:
    - Swiss: red as the only accent (all modules red) or the module hues on the current verb as now (the mock-up shows the
      Metro hues there, a discreet 4 px rule); card as a top rule (shown) or a hairline box (token only, no rule); the night
      red is lighter than the day's (`#ff3b47` against `#e30613`) and its ink black; `h2` at 0.8rem capitals also reaches the
      help and settings headings; tabs underlined but steps kept as outlined boxes with a red current one; fields keep a
      hairline grey box (no bottom rule); `Helvetica Neue` falls back to Arial / Liberation Sans on Windows, Android and
      Linux (no web font, as decided for the mock-ups).
    - Cupertino: the blue and its contrast (above); **fields are an inset fill without border** (a label-above field in an
      auto-fit grid cannot become an iOS row with a hairline without touching the modules' markup; row separators exist
      for lists, tables and the drawer); a chevron on every `.f-item`, also where it is not navigation; the drawer icon as a
      coloured square (the user's "icon tint") against a tinted glyph only; 16 px base text against 15 elsewhere (checked: no
      overflow at 390 px); `light-dark()` for the segmented thumb needs Chrome 123 / Safari 17.5 / Firefox 120 (older: the
      day's card colour also at night); the toast stays the inverted dark / light bar of the frame.
    - Both: the dual view and the rail were checked at 1280 px only with the Map in the pane; `fuel`'s `+30` / `Now` row still
      overflows its card by a few pixels on a phone in every design; the three-design choice itself is the ergonomics
      session's.
  - **Checks**: the real Pilot application (`frame/index.html`) on `#fuel`, `#maps`, `#report`, `#flightlog`, `#settings` and
    the phone drawer, 390 and 1280 px, day and night, both designs (52 captures): no JavaScript error, no horizontal
    scroll at 390 px, every target at least 44 px. Pixel comparison against the previous commit (served from `git archive`):
    `standard` and `metro` (fuel, map, report, my flights, settings, drawer, 390 and 1280 px, day and night, 44 captures),
    then `cabinet` and `field` (fuel, report, drawer, 390 px, day and night): identical except the Settings page, which gains
    two thumbnails. A few captures differ run to run on unchanged code (async loading; seen between two runs of the previous
    commit), so the ones that differed were repeated three times on each side at 390 px: the stable renderings are identical.
- **23 Oct 2026 — "Material" (Material Design 3) mock-up, on the user's decision** (fourth design kept for V3, after `metro`,
  `swiss`, `cupertino`; `docs/technique/V3_SPECIFICATION.md` § 10 point 3). Branch `v3-metro`, nothing pushed. **Mock-up,
  pending decision**, same pattern: token set first, frame rules only where tokens cannot carry the look, all behind
  `[data-design="material"]` and `@media screen`, no module touched, system fonts only (`Roboto` first when installed, no web
  font; the capture machine has none, so every capture shows the fallback sans).
  - **What changed**: the set in `tokens.css` (day, forced night, system night, every token declared; the six landmark
    selectors now list the four mock-ups); `DESIGNS` in `frame/app.js` (label "Material" in the four languages,
    `textured: false`: it appears in the Settings Design card and persists like the others); the first-paint regex of
    `frame/index.html`; `frame/design/material.css` (168 lines, imported by `frame.css` after `cupertino.css`, listed in
    `sw.js`); the demo page takes `?design=material`.
  - **Tokens**: page `surface` `#fbf8ff`, cards `surface-container` `#f3f0fa` (shadow of 1 dp), fields `surface-container-high`
    `#e9e6f1`; ink `#1b1b21`, secondary text `#47464f`, hairline `#c8c5d0` (outline-variant); primary `#5359c6`, a muted
    blue-violet (the standard design's blue `#1d6fd8` gives 4.63 on the page but 4.32 on a card and 3.95 on a field, below 4.5 :
    1; this one passes everywhere), white ink; status colours tonal (`#1b6e3a`, `#8a5100`, `#ba1a1a`). Radius 12 (cards, dialogs), `radius-s` 4 (fields,
    badges, callouts); `gap` 16 / 8 / 24; base text 15 px; `h2` 1.25rem, `h3` .875rem sentence case, page title 1.75rem at weight
    500 (`title-weight` is one token for the three levels, so 500 and not the 400 of Material's headline); tracking 0.
    **Night**: page `#1c1b1f`, cards `#26242b`, fields `#312f38`, ink `#e6e1e9`, primary `#b9bdff` with ink `#1c2170`; the status
    colours lightened; shadows stronger (they barely show on a dark surface). Landmark palette: the `metro` hues (white on each
    5.4 : 1 to 7.4 : 1, lighter text variants at night).
    - **Two design-private tokens** (declared only in the three `material` sets, read only by `material.css`): `--sog-outline`
      (`#777680` day, `#938f99` night: the outline of a field or a button, 3.64 to 4.26 : 1 day and 4.16 to 5.41 night, against
      the 1.4 to 1.6 : 1 of `--sog-border`, which stays the hairline of rules and cards) and `--sog-shadow-card` (1 dp).
      `--sog-shadow` / `--sog-shadow-up` carry the second level (3 dp).
  - **Frame rules tokens cannot carry** (all in `material.css`): header on the page surface (not on the card tone), name at
    22 px / 400; every button a pill (radius = half the target, so 22 px for 44 px: "20 px" of the brief was a 40 px button),
    outline colour, primary-colour text, a state layer while pressed (the primary darkens); written with `:where()` so that a
    module's own button rule wins, and so that list rows (`.f-item`) and the Settings thumbnails (`.f-design`) keep their
    shape; fields with radius 4, outline, and on focus the primary colour plus an inner 1 px ring (2 px, the box does not
    move) instead of the focus ring; card shadow, tonal tiles, a discreet border on the sticky bar; tabs underlined by
    3 px of primary under the current one (equal widths, 1 px rule under the row), steps as tonal chips of radius 8 (the
    current one tinted with the primary); the drawer and the rail: on a phone 56 px rows, icon and label, an active
    indicator in a full pill; from 761 px a rail (the `body` column goes from 210 to 88 px, icon above a 12 px label, a 56 × 32
    pill behind the icon, drawn by a pseudo-element); the indicator is the module's colour mixed 24 % into the card tone,
    from the **text variant** of the colour (the fill variants are too dark to show at night: 1.2 : 1 against 1.5 to 1.7 : 1),
    the text and icon keep their ink.
  - **Rules of the other mock-ups deliberately NOT copied** (each exists in two or three of metro / swiss / cupertino; the
    look loses a little, the duplication does not grow; add them to the candidates below):
    1. **Header buttons without frame** (all three): `material` has outlined round icon buttons and a pill sync chip in the
       app bar (Material's "outlined icon button" and "assist chip": legitimate, but busier than a bare icon). Six lines
       would give frameless buttons.
    2. **Card without a visible border** (metro, cupertino): `material` keeps the hairline (`--sog-border`) round the
       card besides its 1 dp shadow (Material's "outlined card" with elevation, 1.5 : 1 against the page).
    3. **`.f-nav` on the page colour** (metro, cupertino): the drawer and the rail stay on the card tone (Material's own
       drawer is a container tone; its rail sits on the surface).
    4. **`h1` margin, line height and `overflow-wrap: anywhere`** (all three): a very long title word could overflow at 28 px
       on a phone; none of the four languages' module names does today (not checked beyond the Pilot's verbs).
    5. Not needed: `.f-pane h1` at 1.6rem (the 1.75rem title is kept in the pane), `h3` and the table header as capitals
       (titles are in sentence case).
  - **Rules written that echo another mock-up** (one other design, or the same declaration with another value; kept in
    `material.css`): header on the page colour (swiss), underlined tabs (swiss), tonal tile background and sticky bar border
    colour (cupertino, same declaration), button border colour (swiss, `--sog-fg`; metro 2 px; cupertino none): **a fourth
    variant of the "button chrome" candidate**, which makes the `--sog-btn-border` token pair more worth having.
  - **Candidates for a token or a primitive, added by this lot** (with the five of the previous entry):
    1. `--sog-radius-btn` / `--sog-radius-field`: today the buttons and fields take `--sog-radius`; `material` needs a pill
       and 4 px, `metro` and `swiss` 0, `cupertino` 10 (one token each would remove the pill rule).
    2. `--sog-outline` and `--sog-shadow-card` promoted to public tokens (the first is the field / button outline the
       "button chrome" and "field chrome" candidates already ask for; the second would let any design lift its cards).
    3. `--sog-head-bg` (swiss, material: header on the page colour) and a header-buttons token (now four designs).
    4. `--sog-nav-width` (210 px today; `material`'s rail takes 88 px by a `body` rule: the grid column is the only thing a
       design had to override to reshape the menu).
    5. A "tonal fill" (`color-mix` of the accent or module colour into a surface: `material` uses it for the current step and
       the active indicator, `cupertino` for the segmented track, `metro` for pressed header buttons).
  - **Contrast (computed on the tokens as the browser resolves them; forced night and system night checked identical, all 61
    tokens)**, WCAG ratios, page / card / field:
    | | Day | Night |
    |---|---|---|
    | Primary as text (`link`, `focus`: the same colour) | 5.53 / 5.16 / 4.72 | 9.61 / 8.61 / 7.39 |
    | White on the primary | 5.81 | 1.78 (not used: night ink is `#1c2170`) |
    | Ink of the primary (`accent-ink`) on it | 5.81 (white) | 7.85 |
    | Ink / secondary text | 16.30 / 15.22 / 13.92 ; 8.85 / 8.27 / 7.56 | 13.31 / 11.91 / 10.23 ; 10.05 / 8.99 / 7.73 |
    | Status colours as text (ok, warn, err) | 5.11 to 6.14 | 7.40 to 10.09 |
    | Outline against surface (non-text, 3 : 1) | 4.26 / 3.98 / 3.64 | 5.41 / 4.84 / 4.16 |
    | Ink on the active step chip | 10.14 | 5.96 |
    | Ink on the drawer / rail indicator, six modules | 10.56 to 10.90 | 6.99 to 7.85 |
    Every text pair passes 4.5 : 1 (the field is the hardest case; a lighter field would let the primary be brighter).
  - **Judgement calls**: base text 15 px, not Material's 16: at 16 px the `+30` / `Now` row of the Fuel module overflows its
    card by 4 px and the page scrolls sideways at 390 px (as `cupertino` does today); the Settings design card shows the new
    thumbnail; the drawer indicator and the tonal chips use `color-mix` (already used by the frame); the sticky bar keeps its
    12 px radius and floats (Material's bottom bar is square); `:where()` on the button rule gives it zero weight, so a
    module's own selector wins, and the notification's close button keeps the frame's rule.
  - **Open points**: the primary (a fleet blue in place of the blue-violet is possible if darkened (`#1d5fb8`: 5.91 / 5.52 / 5.04
    as text, 6.21 with white)); frameless header buttons (candidate 1 above, the most visible gap); the rail's 88 px column against
    the other designs' 210 px (labels wrap at 12 px: "Compte rendu" takes two lines); Roboto is not bundled (a web font
    costs 150 KB for three weights); the dual view was checked at 1280 px with the Map in the pane only.
  - **Checks**: the real Pilot application (`frame/index.html`) on `#fuel`, `#maps`, `#report`, `#flightlog`, `#settings` and
    the phone drawer, 390 and 1280 px, day and night (22 captures; `app_<module>_material_<tone>_<width>.png`): no JavaScript
    error, no horizontal scroll at 390 px, every target at least 44 px (the toast's close button measures 43 × 44 in every
    design, also before this lot). Pixel comparison against the previous commit (`git archive` served on another port):
    `standard`, `metro`, `swiss`, `cupertino` on `#fuel` and the drawer, 390 px, day and night: identical; three captures
    differ by a 2 to 3 px patch at the toast edge, and the same happens between two runs of the unchanged previous commit
    (async loading), so each was repeated three times on both sides: the stable renderings are identical.

- **24 Oct 2026 — Bottom tab bar per design** (frame lot "barre du bas", asked by the relay cloud; user's option A): the phone's
  drawer is gone, so the four mock-ups lose their phone drawer rules and each gets a tab-bar counterpart in its own sheet, tokens
  first. The frame's default (`frame.css`) is the `standard` look, also used by `cabinet` and `field`: `--sog-surface`, top hairline,
  line icons in `--sog-muted`, the selected tab a filled icon on a 56 × 30 pill (`--f-tab-pill`) and its label in `--sog-link`.
  - `metro`: flat blocks (2 px apart) on the page colour, each with a 4 px rule in the colour of its module (the tab's
    `data-landmark` is the first module of its group), the selected block filled with it and its ink; no pill. It keeps the former
    drawer's idea (blocks of the module colours) in one row.
  - `swiss`: page colour, 1 px rule of the text colour on top, labels at 10 px (the capitals and spacing of the first try made
    "Einstellungen" 90 px wide in a 71 px tab: dropped), selected = bold + filled icon + a 2 px signal-red rule under the label.
  - `cupertino`: the iOS bar: surface at 94 % over a blur (88 % let text show through), hairline, 10 px labels, filled icon and
    label in the system blue, no pill. The module-coloured squares of the old drawer have no counterpart (iOS tab bars have none);
    the rail on a screen keeps its coloured icons.
  - `material`: navigation bar of 64 px (`:root[data-design="material"] { --f-tab-h: 64px }`, so `--f-tab-space` follows), 3 dp
    shadow, a 64 × 32 pill in the module colour at 24 % (the rail's `--mat-indicator` formula), filled icon, ink labels.
  - Icons: `frame/lib/icons.js` gets the filled variants of fuel, map, edit, list, settings (`svg(name, { filled: true })`).
  - Rules not needed: none of the mock-ups' phone drawer rules is kept (they had no user any more). `demo_metro.html` shows the bar
    in its phone scenes (the burger button is gone from its header).
  - Open point: `.f-tabbar a` takes the page's `--sog-link` for the selected label; in `metro` the label is the module's ink on
    its block (contrast = the module palette's 5.4 : 1 to 7.4 : 1, white on the colour).
