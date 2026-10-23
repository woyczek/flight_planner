# V3 design — what a module does with it

The rules a module follows so that it looks right in every design, by day and by night, on a phone and on a screen.
The full list of tokens and primitives is in [SPEC.md](SPEC.md); `labs/design_primitives.html` shows each of them.

## 1. The rule

- **A module brings no colour, radius, shadow or font of its own.**
  - It uses the frame's primitives (classes `f-…`) and, for anything it draws itself, the tokens (`var(--sog-…)`).
  - Its own `<style>` (`[data-module="id"] …`) only places things: grids specific to the module, the sizes of its
    drawing.
- **It never redefines a token**, never sets `data-design` or `data-tone`, and loads no style sheet.
- **A drawing** (SVG, canvas) takes its colours from `--sog-chart-1` … `-6`, `--sog-chart-grid`, `--sog-chart-bg`,
  `--sog-fg` and `--sog-muted`.
  - A canvas reads them with `getComputedStyle(document.documentElement)`.
  - It reads them again when the tone or design changes (`matchMedia('(prefers-color-scheme: dark)')` and an
    attribute change on `<html>`), then redraws.
  - Cartographic colours (airspace types, airways) may stay the module's, but never a white background or halo
    written by value.

## 2. Which primitive

| You need | Use | Not |
|---|---|---|
| A title | `h1`, `h2`, `h3` | your own font sizes |
| A section that folds | `<details class="f-card"><summary>…</summary>…</details>` | a summary under 44 px |
| Tabs, steps | `.f-tabs` / `.f-steps` with `aria-pressed` / `aria-current`, `data-done` | your own active colours |
| A form | `.f-grid` of `.f-field`, `.f-full` to span | fixed widths |
| Three columns on a screen | `.f-cols` (`--f-cols: 2` for two) | your own 980 px media query |
| A layout that depends on your width | `@container (min-width: 900px) { … }`: your module is a container | `@media (min-width: …)`, which reads the window: in the dual view your module has half of it |
| A result or save bar | `.f-bar` | your own shadow |
| A table | `.f-scroll > table.f-table`, `.f-num` | |
| Figures | `.f-tiles` | |
| A list of choices or records | `.f-list > .f-item` | small buttons |
| A state | `.f-dot` / `.f-badge` with `data-kind` | coloured text by value |
| A warning | `.f-warn` (`.f-ok`, `.f-err`) | `color: var(--sog-warn)` inline, `.xx-warn` |
| Terms and values | `dl.f-dl` | your own `dl` grid |
| Secondary text | `.f-muted` | `.xx-muted` |
| A link that acts as a button | `a.f-btn` | a small inline link |
| An icon | `import { svg } from '../../frame/lib/icons.js'` | emoji |

## 3. Checking

Before a "poussé", open your module at 375 px and on a screen, by day and by night, in at least two designs.

- Set the design with the Design card of Settings. In a test, write `device/design.json` (`{ design, tone }`) through
  the data layer: the `localStorage` copy alone is replaced by that file at start.
- Nothing may stay white at night, nothing may keep rounded corners in `cabinet` or `field`, and no target may be
  under 44 px.
