# Proposal — block icons, numbers and subtitles, side bar, drop zones

Status: **proposal** accompanied by an **unwired prototype** (no existing page modified).
Starting point: the mock-up of the mission generator (dark side bar, header with mission selector,
numbered blocks with subtitle, sub-cards with icon, drop zones, buttons with icon, information banner).
To be read with [FRAMEWORK.md](FRAMEWORK.md).

Prototype:

| File | Role |
|---|---|
| `shared/icons/repository_icons.js` | registry of line icons (inline SVG, 43 icons, `window.RepositoryIcons`) |
| `shared/block_icons.js` + `.css` | reads `data-step`, `data-icon`, `data-subtitle`; `.repo-card` sub-cards; drop zones `input[type=file][data-dropzone]`; icon colour according to the actual contrast; “Console” design |
| `shared/side_nav.js` | side bar generated from `repository_tree` |
| `docs/demo_design_icones.html` | demonstration: the mock-up rebuilt with the framework, choice of theme / design / side bar, contrast table of all themes, icon catalogue |

The demonstration is opened through the repository's local server (see INSTALL), e.g. `http://localhost:8765/docs/demo_design_icones.html`.
Checked: 4 languages, 5 designs, light (`sia`) and dark (`flight`) themes, drag and drop (file accepted,
file refused), “Hide” / “Show”.

---

## 1. Analysis of the mock-up

| Element of the mock-up | Existing in the framework | Gap |
|---|---|---|
| Dark side bar (Missions, Generator, Maps, Reports (CR), Settings, Help) | ☰ menu (`repository_nav.js`), complete tree of `repository_tree` | new: permanent shortcuts to the applications, in addition to the ☰ |
| Header: icon + title + subtitle | `.repo-header`, `<h1>` of the page | icon and subtitle of the title |
| Mission selector ◀ list ▶ + action buttons | specific to the generator and the studio (mission batches, v2.2.8) | to be factored later (same component in both pages) |
| Numbered block (badge “1”), title in capitals, subtitle, “˄ Hide” | block `.repo-block` + `.repo-block-heading` (`app_framework.js`), number written in the title (“1. Import a mission”) | badge, subtitle, icon; capitals = form (design) |
| Sub-cards: icon + title + subtitle (+ enlarge button) | `.pasteBox`, `<strong>` or `<label>` depending on the pages | common component `.repo-card` |
| Dotted drop zones “Choose files or drag and drop here” | native `<input type="file">`; `file_access.js` opens the picker in the configured folder | common component that wraps the `<input>` |
| Field labels with icon | text `<label>` + field | icon before the text |
| Buttons with icon (before or after) | text only, sometimes an arrow “→” or emoji (💾, 📅, ⏱) | declared SVG icon |
| Information banner at the bottom of the block | `#status.status`, `p.small` | common style `.repo-notice` |

Observation: **everything that changes is declarative** (an icon, a number, a subtitle, a drop zone) and
applies in the same way to all pages. It is therefore up to the framework to render it, as it already renders the
↕ / “Hide” buttons: a page declares, the framework draws.

## 2. Principles adopted

1. **Declaration in the HTML**, read by the framework — in continuity with `data-block-id` and
   `data-default-hidden`. No page writes SVG or JavaScript for its icons.
2. **Structure common to all designs, form specific to each design** (rule of `designs.css`): icons,
   numbers and subtitles exist everywhere; their size, their shape and their density change with the design.
3. **Theme colours only** (`--repo-bar`, `--repo-bar-text`, `--repo-page`, `--repo-accent`) and
   **contrasts checked at run time** on the actual surface of the block (§ 7).
4. **No dependency at launch**: no CDN, no downloaded icon font; everything is in the repository.
5. **Translation does not change**: the texts remain French text nodes in the source, translated by
   `content_i18n.js`; the icon is an element next to the text, never in the text.

## 3. Declaration in a page

### Blocks

```html
<section data-block-id="mission-import" data-step="1" data-icon="upload"
         data-subtitle="Choisissez vos fichiers, générez une mission avec ChatGPT.">
  <h2>Importer une mission</h2>
  …
</section>
```

| Attribute | Effect | Remark |
|---|---|---|
| `data-step="1"` | numbered badge before the title | decorative (`aria-hidden`): the title reads on its own |
| `data-icon="upload"` | icon before the title | name in the registry (§ 4) |
| `data-subtitle="…"` | subtitle under the title, in the block header | remains visible when the block is hidden |
| `<p class="repo-block-subtitle">` right after the `<h2>` | same effect, as an element | at the page's choice (long text, markup) |

The subtitle given as an attribute is converted into a **text node** by the framework: `content_i18n.js` translates it like
any other text (a `[fr, en, de, es]` line in the page's table is enough).

Rendering: `.repo-block-heading` receives `.repo-block-heading-rich` and contains
`.repo-block-lead` (badge, icon) → `.repo-block-titles` (`<h2>`, subtitle) → `.repo-block-tools` (↕, “Hide”).
The “Hide” button receives a chevron (˄ / ˅) in CSS, because its text is rewritten by `app_framework.js`.

**Numbers outside the title.** Today the number is in the text (“1. Import a mission”) and in the
translation lines. It moves into `data-step`; the translation lines lose the number. The framework does **not**
automatically remove a “1.” from the title: `content_i18n` remembers the translated line per text node, and
modifying that text would break re-translation on a language change (found by reading `translate()`).

### Sub-cards

```html
<div class="repo-card" data-icon="file" data-subtitle="Importez un ou plusieurs fichiers de mission (YAML, .md).">
  <h3>YAML et/ou Markdown</h3>
  <span class="repo-card-tools"><button data-icon="maximize" aria-label="Agrandir"></button></span>
  <input type="file" accept=".yaml,.yml,.md" multiple data-dropzone>
</div>
```

`.repo-card` is **not** a block (neither ↕ nor “Hide”): it is a subdivision of a block. Name distinct from `.card`
(already styled by the designs and used by some pages).

### Inline icons (buttons, labels, titles, banners)

```html
<button data-icon="plus">Nouvelle mission</button>
<button data-icon="sparkles" data-icon-end="arrow-right">ChatGPT</button>
<label data-icon="globe">Théâtre<select>…</select></label>
<h1 data-icon="target" data-subtitle="Créez, importez et préparez vos missions">Générateur complet de mission</h1>
<p class="repo-notice" data-icon="info">Aucune mission chargée.</p>
```

- The icon is inserted **next to** the text node, which is not modified (translation keeps following it).
- In a `<label>` (often in a grid: text above the field), the icon and the first text are grouped
  in `.repo-label-line`; the text node is moved, not rewritten.
- Button without text (icon only): `aria-label` and `title` **mandatory** (translated by `content_i18n`).
- The arrows “→” written in the texts become `data-icon-end="arrow-right"` (translation lines
  without the arrow).

### Pages rendered by JavaScript

- **Mission Core** (reports of the 16 families): the blocks come from `shared/mission_core/blocks.js` and are built
  by `form.js` (`section.dataset.blockId = mc-…`). Add `icon` and `subtitle` (array `[fr, en, de, es]`,
  like `title`) to the definitions; `form.js` sets `data-icon` and an already translated
  `<p class="repo-block-subtitle">`. A single change covers all the families.
- **Reportings** (`global_reporting.js`): the subtitle already exists as a `<span class="mcg-sub">` in the
  `<h2>`; it can become `.repo-block-subtitle`.
- Any page that redraws its blocks already calls `AppFramework.refresh()`: the decoration is redone at the same moment.

### Final integration (instead of the prototype's separate file)

The prototype wraps `AppFramework.refresh()` and observes the DOM to remain non-intrusive. In production:

- reading of `data-step` / `data-icon` / `data-subtitle` **in `app_framework.js`**, at the moment it builds
  `.repo-block-heading` (no more wrapping of `refresh`, no more double pass);
- icon registry loaded by `repository_nav.js` (like `designs.css`, `pilot_profile.js`, `file_access.js`),
  hence available on all pages without a new `<script>` tag;
- inline icons and `.repo-card`: a small common pass in `app_framework.js` (idempotent, same lightweight
  observer as the prototype);
- drop zone: in `file_access.js`, which already handles all the `<input type="file">` (§ 6);
- styles: `repository_nav.css` (structure) and `designs.css` (form per design).

## 4. Icon set

### Options

| Option | Advantages | Drawbacks | Opinion |
|---|---|---|---|
| **JS registry of SVG paths** (`repository_icons.js`) | no file to load, works under `file://` and in print, `currentColor`, extensible per page (`RepositoryIcons.add`) | icons in a JS file (≈ 150 bytes per icon) | **adopted** |
| External SVG sprite (`<use href="../icons.svg#x">`) | standard SVG file | blocked under `file://`, one request, no reliable `currentColor` in older browsers | no |
| Local icon font | one CSS tag | blurry rendering, poor accessibility (private-use characters), a single colour, binary file | no |
| Emoji (current state: 💾 📅 ⏱ ✓ ⚠) | nothing to do | rendering differs by system, imposed colours, not themable | to be replaced gradually; ✓ / ⚠ can remain in the texts |

### Source and licence

Common style: **24 × 24 grid, stroke 2, rounded ends, no fill**, colour `currentColor`.

- The 43 icons of the prototype were **drawn for the prototype** in this style (nothing was downloaded).
- For production, **Lucide** (<https://lucide.dev>, **ISC** licence, derived from Feather, MIT licence) is the
  natural reference: same grid, more than 1,500 icons, including those of the mock-up (`map`, `wrench`, `file`,
  `cloud-upload`, `wand-sparkles`, `database`, `bookmark`, `refresh-cw`, `info`, `eye`, `x`, `send`, `settings`,
  `circle-help`, `globe`, `list`, `users`, `box`, `maximize-2`…). ISC and MIT are compatible with the distribution of the
  repository: it is enough to keep the licence text.
- Proposed procedure (manual, once): copy the paths of only the icons used into
  `repository_icons.js`, add `shared/icons/LICENSE` (ISC text of Lucide + MIT of Feather), note the version
  of Lucide at the top of the file. No npm package, no CDN, no loading at launch.

### Usage rules

- Icon name = generic role (`upload`, `database`), never the name of a page.
- Sizes: 1.15 em in a button or a label, 24 px for a block, 28 px for a sub-card, 22 px in the
  side bar (reduced by the Operational design).
- **Decorative** icons (`aria-hidden="true"`): the neighbouring text carries the meaning. Icon alone = `aria-label`.
- One icon per idea, the same everywhere (e.g. `upload` = import, `download` = export, `bookmark` = remember).

## 5. Navigation side bar

Generated by `side_nav.js` from `repository_tree` — a single source for the ☰ menu and the bar:

```js
// repository_tree (proposition)
sidebar:[
  {icon:"target",   path:"apps/cpco/mission_editor.html", label:["Missions","Missions","Missionen","Misiones"]},
  {icon:"map",      path:"apps/cpco/map_parser.html",     label:["Cartes","Maps","Karten","Mapas"]},
  {icon:"clipboard",path:"apps/cr/mission_cr.html", match:"apps/cr/", label:["CR", …]},
  {icon:"chart",    path:"apps/cr/mission_operations_reporting.html", match:"_reporting.html", label:[…]},
  {icon:"fuel",     path:"apps/planner/flight_performance_planner.html", label:[…]},
  {icon:"plane",    path:"apps/landing/…", label:[…]},
  {sep:true},
  {icon:"settings", path:"apps/settings/parametrage.html", label:[…]},
  {icon:"help",     menu:true, label:["Menu", …]}      // ouvre le menu ☰
]
```

- Active entry: the page itself, otherwise `match` contained in the path (all the reports of a family light up
  “CR”).
- Only the pages declared in `pages` are shown; links computed from the root (like the ☰).
- The **☰ remains** the complete navigation (tree, page actions, profile, local data, design); the
  bar is only a shortcut to it.
- Display: preference `html[data-sidenav="on"]` (☰ menu › Design, “Side bar” checkbox) or the
  “Console” design; hidden below 760 px and when printing. The offset is set on `<html>` (`padding-left`), because
  several pages impose `body{margin:0!important;padding:0!important}`.
- The mock-up distinguishes “Missions” and “Generator” (« Générateur »): in the current suite, it is the same page
  (`mission_editor.html`). **To be decided** (§ 11).

## 6. File drop zones

`<input type="file" data-dropzone>` → the `<input>` is **moved into** a `.repo-dropzone` zone, never replaced:

- a **click** in the zone calls `input.click()` → `file_access.js` intercepts as today and opens the
  picker **in the configured folder** (`data-picker-folder` respected);
- **dropping** files filters according to `accept` (extensions, MIME types, `image/*`), respects `multiple`, sets
  `input.files` and emits `change` (bubbling) — **the same event as `file_access.js`**: the code of the pages does not
  change;
- refused files: message “File type not accepted: …” (« Type de fichier non accepté : … ») in the zone (read by screen readers,
  `aria-live`);
- **keyboard**: the `<input>` remains focusable (visually hidden, not `display:none`); focus outline on the
  zone (`:focus-within`);
- texts of the component (“Choose files”, “or drag and drop here”, “No file chosen”) translated
  by the component itself (like “Hide” / “Show”), names of the chosen files displayed;
- zone placed inside a `<label>` (case of the generator): `preventDefault` on the click, no double opening.

To be planned in production: prevent a file dropped **next to** a zone from making the page leave (the browser
opens the file) — `dragover`/`drop` neutralised on `document` as soon as a page contains a zone. Folders
(`webkitdirectory`) remain with the native picker, as today.

## 7. Designs, themes and contrasts

### Coexistence with the four designs

**Recommendation: elements common to all designs + a fifth “Console” design.**

| | Standard | Aero | Operational | Brief | Console (new) |
|---|---|---|---|---|---|
| Number badge | round 28 px, banner colours | + tinted shadow | square 22 px | ringed, serif digit | round 44 px |
| Block / sub-card icon | 24 / 28 px | same | 18 / 20 px | same | 28 / 28 px |
| Subtitle | 0.88 rem | same | 12 px | italic | same |
| Sub-card | thin border, radius 10 | radius 16 | radius 3, compact | bottom rule only | radius 8, airy |
| Drop zone | dotted, 96 px | radius 14 | 60 px | sharp corners | same as Standard |
| Block title | page | page | capitals (already) | serif (already) | capitals, 1.3 rem, bold |
| Side bar | preference | preference | preference | preference | **shown** |

Why not “everything in a new design”: icons, numbers and subtitles are **content** (landmarks,
explanations) useful whatever the graphic taste; reserving them for one design would make two versions of the pages to
maintain. The “Console” design only groups what is a matter of taste: side bar, airy cards,
titles in capitals, tall buttons (40 px).

Adding “Console”: entry `console` in `repository_tree.designs.list` (labels in 4 languages) and rules
`html[data-design="console"] …` in `designs.css` (taken from `block_icons.css`).

### Contrasts (WCAG)

Measurements on the themes of `repository_tree` (complete table in the demonstration, block “Contrast check” (« Contrôle des contrastes »)):

| Pair | Minimum measured | Requirement | Verdict |
|---|---|---|---|
| Banner text / banner (badge, side bar) | 6.47 (hadr) | 4.5 | ✓ all themes |
| Header subtitle (banner text at 84 %) / banner | 4.93 (hadr) | 4.5 | ✓ — at 72 %: 4.31 (sia) ✗, hence 84 % |
| Accent / white surface | **2.12 (flight), 2.45 (landing)** | 3 (icon) | ✗ for these two themes on a light surface |
| Accent / dark surface of these pages | 7.06 (landing), 8.17 (flight) | 3 | ✓ |
| Block subtitle (text at 75 %) / surface | 6.96 (light), 8.72 (dark) | 4.5 | ✓ |

Consequence: a fixed “accent” colour for the icons is not enough (`flight` and `landing` themes on a
light card). The prototype chooses **at run time**, for each block and sub-card, according to the actual background
colour:

- `--repo-icon`: first theme colour (accent, banner, banner text) at **≥ 3:1** (WCAG 1.4.11, graphical
  objects), otherwise the text colour;
- `--repo-ink`: same choice at **≥ 4.5:1** for coloured text (“Choose files”, digit in the Brief design).

Badge: banner text on banner (already validated ≥ 6.47) + inner border, to remain visible when the
banner has the hue of the surface (`flight` theme on a dark surface). Side bar: banner darkened by 14 %
(the light text gains contrast there). Complementary proposal: `tools/check_contrast.py`, which recomputes these
ratios for each theme on every change of `repository_tree`.

## 8. Translation (fr / en / de / es)

- Subtitles, labels, `aria-label` / `title` of icon-only buttons: **`[fr, en, de, es]` lines** of the
  page's table (`sia_i18n.js`, `flight_i18n.js`, `landingI18nRows()`…) — no new mechanism.
- Mission Core blocks: `subtitle` as a `[fr, en, de, es]` array in `blocks.js`, like `title`.
- Texts of the components (drop zone, side bar): translated by the component (internal arrays), re-translated
  on `repository-language-change`. Side bar: labels in `sidebar[].label` or in the `labels` table of
  `repository_tree`.
- Numbers taken out of the titles (`data-step`) → translation lines to be updated without the “1.”; arrows “→”
  taken out of the texts → likewise.
- Capitals: `text-transform` in CSS only (the source text and screen readers keep the case).
- French typography (U+202F): unchanged, applied at display by `content_i18n.js`; texts composed
  by code go through `RepositoryContentI18n.typography()` (the prototype does so for the drop zone).
  Remark: a `[data-no-i18n]` text composed in one language is not recomposed on a language change — the
  code that produces it must re-subscribe to `repository-language-change` (seen in the demonstration).

## 9. Impact on existing pages

| Page | Current structure | Work | Risk |
|---|---|---|---|
| Generator (`apps/cpco/mission_editor.html`) | 6 `section`, numbered titles, `.pasteBox`, `<input type=file>` in `<label>` elements | `data-step/icon/subtitle`, `.repo-card` for the sub-blocks, `data-dropzone`, button icons; `sia_i18n.js` lines | **parallel session in progress on this file**: wait for it to finish |
| Studio (`map_parser.html`) | 5 `section`, sticky preview column (`StickyFrame.stick`) | same; `StickyFrame.refresh()` after decoration (header height modified) | same (parallel session) |
| Reports (Mission Core, 16 families + demo) | blocks generated by `form.js` from `blocks.js`, `core.css`, header tools in `summary` | `icon`/`subtitle` in `blocks.js`, 10 lines in `form.js` | low; check printing (`core.css` already hides the report's `.repo-block-heading`) |
| Reportings (general, families, old HEMS/GAAR) | `section.section` + `h2` with `.mcg-sub` | icons per section, `.mcg-sub` → subtitle | low |
| Planner (`apps/planner/flight_performance_planner.html`) | 13 blocks, `.row>h2` headers with controls, dark theme, `StickyFrame.follow`, `ColumnResize` | icons only (no numbers: no linear path) | rule `.perf-side>[data-block-id=result].is-stuck>:not(.repo-block-heading)`: the header remains a direct child, OK; density |
| Landing Dashboard | dark theme, own dictionary `TR` | icons; subtitles via `landingI18nRows()` | low |
| Settings (Paramétrage), aircraft / crew sheets | simple blocks | icons | low |

No page is affected as long as it declares nothing: without `data-step` / `data-icon` / `data-subtitle`, the block header
remains identical to today (checked in the prototype: the decoration only applies to declared blocks).

## 10. Migration plan

1. **Validation** of the mock-up and of the decisions of § 11 (on the demonstration).
2. **Framework, without visible effect**: icon registry loaded by `repository_nav.js`; reading of the attributes
   in `app_framework.js`; `.repo-card`, `.repo-notice`, inline icons; styles in `repository_nav.css` and
   `designs.css`; FRAMEWORK.md (new section “Icons and block headers”); `tools/bump_versions.py`.
3. **Drop zone** in `file_access.js` (`data-dropzone`, opt-in) + neutralisation of dropping outside the zone.
4. **Pilot page: the generator**, once the parallel work on `mission_editor.html` / `mission_store.js`
   is merged — numbers taken out of the titles, `sia_i18n.js` lines updated.
5. **Map studio** (same components; mission selector ◀ ▶ factored with the generator).
6. **Mission Core**: `icon` / `subtitle` in `blocks.js`, rendered by `form.js` (all the families at once).
7. **Reportings, planner, Landing, Settings**: block and button icons.
8. **Side bar + “Console” design**: `sidebar` and `designs.list.console` in `repository_tree`,
   “Side bar” preference in the ☰ menu; key `repositorySidenav` excluded from the backup counter
   (`browser_store.js`, like `repositoryFramework:`).
9. **Clean-up**: button emoji (💾, 📅, ⏱) replaced by icons; arrows “→” removed from the texts.

Each step: `bump_versions.py`, CHANGELOG, check 4 languages × 5 designs × light / dark themes, printing.

## 11. Risks

- **Parallel work** on the generator, the studio and `mission_store.js`: any integration in these pages
  waits for the end of that session (conflicts otherwise). The prototype does not touch them.
- **Structure of the block header**: the `<h2>` goes from `.repo-block-heading>h2` to
  `.repo-block-heading>.repo-block-titles>h2`. No `…heading>h2` selector found in the repository; the descendant
  selectors (`.repo-block-heading h2`, `.repo-block h2`) remain valid.
- **`AppFramework.refresh()`**: the prototype wraps it; in production the reading is done in
  `app_framework.js` itself (no wrapper).
- **Numbers and reordering**: the user can move the blocks (↕); the numbers remain those of the
  page, hence out of order. Options: fixed numbers (path landmarks), renumbering according to the displayed order,
  or numbers hidden as soon as the order is customised — **to be decided**.
- **Width**: the side bar takes 84 px; the planner (grid with resizable columns) and the
  wide tables suffer from it → bar disabled by default outside the “Console” design.
- **Contrast**: guaranteed by the run-time choice for the icons; a theme added later with a poorly contrasted banner
  text would break the badge and the bar → tooled check (`tools/check_contrast.py`).
- **Backup counter**: the display preferences (`repositoryDesign`, `repositoryLanguageMode`,
  `repositorySidenav`) currently increment the “💾 Save (n)” (« 💾 Sauvegarder (n) ») counter; to be excluded like the layout
  of the blocks.
- **Licence**: none as long as the icons are drawn locally; with Lucide, keep ISC + MIT.
- **Printing**: icons printed (SVG, text colour); side bar and drop-zone badge hidden.

## 12. Decisions to take

1. **Scope**: icons / numbers / subtitles common to all designs (recommended) or reserved for one design?
2. **“Console” design**: add it as the 5th design (recommended); should it be made the default design?
3. **Side bar**: entries (the mock-up separates “Missions” and “Generator”, which are the same page
   today; “Help”: which target — TUTORIAL, manual, or the ☰?); shown by default or by preference?
4. **Icon set**: import the Lucide paths (ISC) or keep our own drawings?
5. **Numbering**: fixed, recomputed according to the displayed order, or hidden if the order is customised?
6. **Numbers and arrows out of the texts**: agreed to update the translation lines accordingly?
7. **Migration order**: generator as pilot as soon as the parallel session ends, then Mission Core?
