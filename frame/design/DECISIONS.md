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
