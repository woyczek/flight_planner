# Common framework

The three applications of the suite — **CR** (Mission Report Core), **Landing Performance
Dashboard** and **Flight Performance & Fuel Planner** — share a framework with no dependencies
and no build step: JavaScript files loaded through `<script>`, which activate themselves
on every page. This document describes each component, its role and its interface.

| Component | File | Used by |
|---|---|---|
| Tree and themes | `config/repository_tree` | all pages |
| Header bar, ☰ menu, language | `shared/repository_nav.js`, `.css` | all pages |
| Appearance (designs, icons, side bar, colours) | `shared/designs.css`, `block_icons.js/.css`, `icons/repository_icons.js`, `side_nav.js`, `appearance_page.js` | all pages; settings on the “Appearance” page |
| Resizable columns | `shared/column_resize.js` | Planner |
| Resizable table columns, clipped cells | `shared/table_resize.js` | Planner (RPM / power table) |
| Blocks (move / hide) | `shared/app_framework.js` | all pages |
| Text translation | `shared/content_i18n.js` | CR, Planner, reporting pages |
| Pilot profile | `shared/pilot_profile.js` | all pages (☰ menu) |
| Local data ⇄ file, backup reminder | `shared/browser_store.js` | all pages (☰ menu, header) |
| Authorised folders, opening files | `shared/file_access.js` | all pages |
| Analysis period (zoom) | `shared/time_period.js` | reporting pages, Landing Dashboard |
| SVG charts | `shared/mission_core/charts.js` | reporting pages |
| Sortable table | `shared/mission_table.js` | reporting pages |
| Editable databases | `shared/data_admin.js` (“Settings” page, `parametrage.html`) | CR |
| Aircraft type database | `AircraftDB/` | the three applications |
| Common catalogue (types, aircraft) | `shared/aircraft_catalog.js` | the three applications |
| Anonymised reference | `data/references/defa_reference.js` | the three applications |
| Updates (channel, check, badges) | `shared/suite_update.js`, `tools/update_suite.py` | all pages; settings in “Settings › Maintenance” |
| AIRAC cycles, SIA folder and database, MORA recomputation | `shared/airac.js` | Maintenance |
| ZIP archives (writing, reading, SHA-256) | `shared/zip_store.js` | Maintenance (full backup, SIA export) |
| Maintenance (versions, dependencies, step-by-step SIA, full backup, log) | `shared/maintenance_page.js` | `apps/settings/maintenance.html` |
| Registry of generated missions | `shared/mission_registry.js` | `apps/cpco/mission_registry.html` |
| Maintenance tools | `tools/` | repository |

## 1. `config/repository_tree` — tree, themes, menu

JavaScript file **with no extension** (to be served as `text/javascript`, see INSTALL), loaded at the top of every page
(`config/repository_tree?v=…`); the application root is deduced from its address (`app_framework.js`). It
defines `window.REPOSITORY_TREE`:

- `release`: suite version (`version`, `date`, `changelog`: link shown in the footer of
  every page, pointing to `CHANGELOG.md`); `defaults`: theme, favicon, shared configuration;
- `themes`: header bar / page / accent colours and favicon per theme (`flight`, `landing`,
  `core`, one per mission family…);
- `designs`: graphic designs offered in the ☰ menu (`list`: key → label and description
  [fr, en, de, es]; `default`) — see § 2 bis;
- `folders`: theme and favicon per folder (key = full path, e.g. `"apps/cr/HEMS"`);
- `pages`: `{ path, label, menu, theme, favicon, files, slot }` —
  `menu: "Group/Label"` places the page in the ☰ menu, `menu: false` hides it (entry
  pages opened from other pages), `slot: "settings"` puts it at the bottom of the menu, before
  “Local data”; `files`: default files of a page (old CSV ledgers).

All links are computed from the repository root: a page can be moved into a
sub-folder without changing its links.

## 2. `repository_nav.js` — common header bar

Turns the page's `<header>` into a header bar stuck to the top (`.repo-header`): title, choice
of **language** (auto, FR, EN, DE, ES — event `repository-language-change`) and **☰ menu**
(tree from `repository_tree`, page actions, pilot profile, local data).
Loads `pilot_profile.js` and `browser_store.js`.

Interface `window.RepositoryNav`: `root` (site root), `page`, `menu`, `settings`,
`getLanguage()`, `getLanguageMode()`, `addAction(label, fn)` (page action in the ☰
menu), `setTheme(name)`.

> A page must never rewrite the whole `<header>` (`innerHTML`) after the header bar has
> loaded: it **adds** its elements to it (otherwise the language and the ☰ menu disappear).

## 2 bis. Appearance — designs, icons, side bar, colours

Set in the **“Appearance” modal window** (opened over the current page from the ☰ menu and the side bar:
`RepositoryNav.openAppearance()`, content mounted by `RepositoryAppearance.mount`), also available as a page (`apps/settings/apparence.html`, built by `shared/appearance_page.js`: thumbnails
of the designs drawn in each design, rows of icons by stroke weight, side bar, one card per theme
with family, tone, preview, WCAG contrasts and “Show on this page”; the “Appearance” button of the ☰ menu and the side bar lead to it), remembered in the browser and applied
on every page by `repository_nav.js` as soon as it loads (`RepositoryNav.appearance`). These settings are
saved with the local data but **do not count** as changes to be saved (`browser_store.js`,
list `DISPLAY`: design, icons, colours, side bar, language, tabs, splitters, columns, dials…).

- **Design** (`repositoryDesign`, `<html data-design>`): Standard (the pages' own styles), **Aero** (rounded,
  soft shadows, gradient header), **Operational** (dense, sharp corners, theme edge, uppercase titles),
  **Console** (side bar, airy blocks, uppercase titles, icons; replaces the former Brief).
  Rules: `designs.css` (shared shapes) and `block_icons.css` (Console, icons, numbers).
- **Material designs**: **Flight log** (`flightlog`, aviation variant of Cabinet: riveted aluminium frame
  around the blocks, brushed aluminium plates, winged-propeller emblem, dials and flight plan as decoration, “Avionics” icons),
  **Cabinet** (navigation cabinet: leather desk pad, wooden frame, navy leather
  header, parchment blocks edged with leather, engraved brass title plates, compass-rose medallion), **Rugged**
  (key `field`: field console, topographic map background, chassis in chipped olive paint, steel panels,
  khaki plates, black fields, green main button with indicator light, radar) and **Aqua** (brushed metal, frosted glass, gel
  buttons). Rules: `designs_skeuo.css`, loaded **on demand** (`designs.list[id].css`); WebP textures from
  `shared/textures/` (≈ 140 KB in all, produced by `tools/textures_generator.html` + `tools/save_textures.py`).
  The **materials** have a palette specific to the design; the **information colours** remain those of the theme
  (Cabinet: darkened header bar; Rugged: unit stripe on the left of the blocks; Aqua: gel of the buttons). Block icons
  as “material”: bronze medallions, screwed steel plates, gel bubbles. Hooks: `<html data-tone>`
  (light or dark theme: Cabinet “night chart”), `<html data-decor>` (**“Decoration”** `repositoryDecor`: full or
  plain; default per page or folder, key `decor` of `repository_tree`: plain on the CRs, the planner and Landing),
  `.repo-header-emblem` (emblem `designs.list[id].emblem`, `RepositoryIcons.emblem`), `<html data-dirty>` (backup
  indicator light of the status bar, `browser_store.js`). Aqua has a dark variant (graphite, smoked glass) on the
  dark themes: charts keep their colours. Illustrations of the full decoration (`design_deco.js`, loaded
  with the stylesheet): Cabinet's desk frieze (leather, rope, spyglass, stamped map), Rugged's panels (DEFA
  plate, rotating radar, backup indicator lights). Textures: CC0 photographs from ambientCG (leather, wood, paper, metals,
  paints; relief baked and re-tinted by `tools/textures_from_photos.html`, credits in `shared/textures/CREDITS.md`)
  and drawn materials (maps, radar: `tools/textures_generator.html`); addresses versioned by
  `bump_versions.py`. **Icons and decorations from the sheets**: icons and elements cut out of the mock-up sheets
  (`tools/icons_from_sheets.html` → `shared/icons/skeuo/<design>/`, `shared/deco/<design>/`); with a material set, the
  placed icons (blocks, sub-cards, side bar, icon-only buttons, drop zones, notices) take the image
  from the sheet (rules generated by `tools/build_skeuo_icons_css.py`, attribute `data-i` of the icons), otherwise a
  drawn medallion, plate or bubble; `design_deco.js` scatters the decorations (footer frieze, between the blocks,
  in the margins of large screens). Class `repo-actionbar`: action bar stuck to the bottom of a page, dressed by the design. Class `repo-plain`: button that keeps its own drawing (thumbnails, selectors). When printing,
  everything disappears.
- **Organisation of the material designs** (see also `docs/REFACTORING_TOOLKIT.md`):
  - **single registry**: `REPOSITORY_TREE.designs.list` holds, per design, `css`, `skeuo` (material design),
    `frame` (stitched frame around the page), `base` (design of which it is a variant: Flight log → Cabinet),
    `chart` (automatic chart palette), `icons` (default icon set), `emblem`; `repository_nav.js`
    deduces from it the attributes `<html data-skeuo>` (`"frame"` for framed designs), `data-design-base`, the palette and
    the relief of the charts, the logo and the icon folder (`appearance.iconFolder`); the icon generator reads
    its sets from the same place;
  - **tokens** `--sk-*` per design and per tone, **shared components** written once (`designs_skeuo.css`); the
    rules of a page (CR, planner, editor, Appearance) are in the page's stylesheet, using these tokens;
    regression bench: `tools/skeuo_regression.html`;
  - **corners**: shared token `--repo-round` (1 rounded, 0 in the material designs); a radius is written
    `calc(<radius> * var(--repo-round, 1))`, never as an exception `html[data-skeuo] … { border-radius: 0 }` per element;
    data surfaces placed on a dressed block: `background: var(--repo-veil, …)` (the design's veil);
  - **a page = blocks**: all content in a `<section>` with an `<h2>` inside `main` (header, move / hide, decoration),
    nothing placed outside a block;
  - **block backgrounds** (`design_deco.js`): **panels per theme** (`PANELS`: Cabinet “1930” navy / ivory depending on
    the tone, Flight log navy / parchment plans, Rugged, Aqua) chosen from
    the title, the icon, then the subtitle of the block; **ledger sheet** (`SHEETS`, Cabinet, Flight log and Rugged, light
    tone: table blocks
    of the ledgers, one sheet per design cut out by `tools/cut_register_sheet.py`, geometry in `--sh-*` tokens);
    **objects placed in a block** (`PROPS`: mission order, “Top secret” label); **page device**
    (`device`: an object next to a station — Cabinet: logbook and radio; Flight log: leather notebook and DME;
    Rugged: cable and radio — in a real slot between blocks 2 and 3, movable sideways); **preview
    notebook** (component `.repo-notebooks` / `.repo-notebook` of `designs_skeuo.css`, tokens `--nb-*`: notebook closed
    as long as the gallery is empty, then open notebook under each map; Map studio);
  - **toolkit** `shared/kit.js` (`window.RepositoryKit`, loaded before `repository_nav.js` and before any module that uses it): escaping,
    language and translations (`t`, `tf`: sentence with `{key}` values), protected storage, colours and WCAG contrast, exercise
    time (`hOffset`, `hText`: a single H, T or M reference, offsets with unit), shared viewer
    (`viewImage`, `viewHtml`: cross, Esc, actual size on click).
- **Settings**: “Appearance” and “Settings” buttons at the top of the ☰ menu; in the side bar, bottom group
  (Appearance, Settings, Menu).
- **Icons** (`repositoryIcons`, `<html data-icons>`): normal, thin, thick stroke; four **skeuomorphic** sets,
  usable in all designs — **Brass** (`brass`, Cabinet), **Steel** (`steel`, Rugged), **Gel** (`gel`, Aqua),
  **Avionics** (`avio`, Flight log); or none. **Composed** sets: blank background of the set
  (`shared/icons/skeuo/<folder>/vierge.webp`) with the glyph from the icon registry on top; pages and Centre entries:
  background `vierge.rouge.webp` (copper) if it exists, otherwise `vierge.gris.webp` (Aqua: grey bubble tinted with the Aqua
  colour); rules generated in `block_icons.css` by `tools/build_skeuo_icons_css.py`. With no remembered choice: the design's set (`designs.list[id].icons`: Brass for
  Cabinet, Steel for Rugged, Gel for Aqua), otherwise normal stroke.
- **Side bar** (`repositorySidenav`, `<html data-sidenav>`): depending on the design (shown in Console),
  always, or never. Entries: `REPOSITORY_TREE.sidebar` if it exists, otherwise the list in `repository_nav.js`, which builds the bar as soon as it runs (styles in `repository_nav.css`,
  loaded in the header); `side_nav.js` then places the icons in it, in fixed-size slots.
- **Theme colours** (`repositoryColors`): for each theme, a **family** (`REPOSITORY_TREE.colorFamilies`:
  hue, saturation) and a **tone** (lightness) rather than absolute values; header bar, header bar text (white
  or black, whichever gives the best contrast) and accent (adjusted until ≥ 4.5:1 on the page background) are computed from them.
  The block shows the preview and the WCAG ratios (text / header bar, accent / page ≥ 4.5:1; accent / card ≥ 3:1).
  Without a setting: colours from `repository_tree`.
- **Demonstration page** (`docs/demo_design_icones.html`, link in the block): the generator's mock-up
  rebuilt with the components, icon catalogue, contrast table of all themes; the design, icons
  and side bar chosen there are the appearance settings.

Rules of a design: it only changes the **shape** (corners, shadows, borders, typography, density) of the shared
elements — header, blocks, `.card`, buttons, menus, fields, tables; the **colours come from the theme**
(`--repo-bar`, `--repo-bar-text`, `--repo-page`, `--repo-accent`). Adding a design: an entry in
`repository_tree.designs.list` and its rules `html[data-design="key"] …`.

### Icons, numbers, subtitles, drop zones (`block_icons.js`, `icons/repository_icons.js`)

Loaded on every page by `repository_nav.js`. A page **declares**, the framework draws:
`<section data-step="1" data-icon="upload" data-subtitle="…">` (badge, icon and subtitle of the block; the title
`<h2>` no longer has a number), `<div class="repo-card" data-icon="file" data-subtitle="…">` (sub-card),
`<button data-icon="plus">`, `<label data-icon="globe">`, `<p class="repo-notice" data-icon="info">`,
`<input type="file" data-dropzone>` (zone “Choose files or drag and drop here”: same
`change` event). Subtitles translated by the page's `[fr, en, de, es]` rows. Icon colour chosen according to
the actual surface of the block (≥ 3:1). Registry: 43 line icons (24 grid), `RepositoryIcons.add` to
add more. Details and migration plan for the pages: [PROPOSITION_DESIGN_ICONES.md](PROPOSITION_DESIGN_ICONES.md)
(pilot page: mission generator).

## 3. `app_framework.js` — blocks

Each `section` / `.panel` of the `<main>` becomes a block with the ↕ (move) and
“Hide” buttons. Order and visibility are remembered per page (`repositoryFramework:<page>`).
`data-default-hidden="1"`: block hidden until the user has shown it.
`data-block-id`: stable identifier (otherwise `id`, otherwise rank). After a new rendering of
blocks: `window.AppFramework.refresh()`.

**Long tasks** (`AppFramework.task`): any operation that takes time (previews and generation of the maps, reading
a folder, MORA computation, SIA import) is declared to the core: floating progress bar in the stack of
notifications (title, `done/total`, step; total 0 = indeterminate) and warning before leaving the page as long
as it is running (closing or reloading: browser dialog; internal link: confirmation that names the task).
`const job = AppFramework.task(title, { total })`; `job.set(done, total, step)`; `job.end(message?, kind?)` in
`finally`; `job.fail(error)` notifies the error (cancellation: plain information). `{ quiet: true }`: the page keeps
its own gauge (SIA import), the task only serves as the exit guard. The pages' errors go through the
`data-status` zones (relayed as notifications) or through `job.fail`. Running tasks: `AppFramework.busyTasks()`.

**Confirmation** (`AppFramework.ask(message, { ok, cancel, danger })`): dialog inside the page, on a block background of the
design, “Confirm” / “Cancel” in 4 languages (Esc, click outside: cancel); promise `true` if confirmed.
Replaces `window.confirm` (blocked in some embedded browsers, outside the design); the click on “Confirm” is
itself a user gesture (opening a tab or a folder is allowed afterwards). Alerts go through
`AppFramework.notify`. Kept native: leaving the page, closings that require an immediate answer.

Option `grow: true` of `StickyFrame.follow`: the anchor takes at least the height of the frame (+ gap), so
that a frame taller than its row does not overflow onto the next frame (planner panels). The anchor only
grows (no back-and-forth during an adjustment); `StickyFrame.resetGrow()` resets it to the measurement after
a complete new content.

## 3 ter. `column_resize.js` — resizable columns

`ColumnResize.attach(grid, { key, defaults, min, media, until, title })` places a handle between each pair
of columns of a CSS grid: dragging shares the width between the two neighbours, double-clicking returns to the
default widths. Widths kept as fractions (`fr`, fluid grid), remembered under `key`; `media`:
query where the grid has its columns (handles hidden elsewhere); `until()`: element whose bottom limits the
height of the handles. Returns: `{ reset(), refresh() }`. Used by the planner (input and curves |
Result | instruments).

## 3 quater. `table_resize.js` — resizable table columns, clipped cells

`TableResize.attach(table, { key, min, title })` puts a handle on the right edge of every header cell but the
last: dragging sets that column's width (`table-layout: fixed`, widths in px kept on the `<th>`, so they survive
a redraw of the body), double-clicking a handle returns to the natural widths. Remembered under `key`. A long cell
gets `class="tbl-clip"` and a `title` with the whole text: one line with an ellipsis, the text in a tooltip, a
double-click unfolds it over several lines. Returns `{ reset(), refresh() }`; a second `attach` on the same table
only refreshes. Used by the planner (RPM / power → consumption table, "Comment" column).

## 3 bis. `sticky_frame.js` — semi-mobile frames

Side-column blocks that stay readable while scrolling (`window.StickyFrame`).

| Call | Behaviour | Used by |
|---|---|---|
| `StickyFrame.stick(el, { top })` | CSS sticky under the header; taller than the window: negative offset, you scroll down to its bottom before it sticks | Map studio (preview column) |
| `StickyFrame.follow(el, { anchor, stack, gap, media })` | follows an “anchor” block of another column: arrives with it, stays stuck under the header (and under the previous `stack` frames), leaves with the bottom of the anchor; no overlap between frames of the same container; class `is-stuck` while it is held (the page can compact it); inactive outside `media` (default: more than 800 px) | Planner: Result block (anchor: Fuel estimate, `stack`) and explanation panels (anchor: row of their curve) |
| `StickyFrame.refresh()` | recomputation after a redraw | views that change heights |
| `StickyFrame.headerBottom()` | bottom of the sticky header (px) | — |

Absolute positioning in the container (made `position: relative`), recomputed on scrolling, on
resizing and when the anchor or the frame changes size.

## 4. `content_i18n.js` — translation

**Typography** (at display time, after translation, on text nodes and the `title` /
`placeholder` / `aria-label` attributes, except `code`, `kbd`, `samp`): in French, narrow no-break space U+202F
before `: ; ! ? »` and after `«`; in the other languages, no space before `: ; ! ?`. In the sources,
write a plain space: the page corrects it. `RepositoryContentI18n.typography(text, language)` for a text
placed outside the DOM (export, clipboard).

**Zones.** `[data-no-i18n]`: text already composed in the current language (tables, charts, states) —
typography only. The tools of the header and of the blocks are translated by the menu, except a
`[data-i18n]` container that a page places there (e.g. Landing dashboard options in the ☰ menu). The Landing
dashboard provides its rows from its own dictionaries (`landingI18nRows()`).

`window.RepositoryContentI18n(rows)`: rows `[fr, en, de, es]`. Text nodes (and
`title`, `placeholder`) whose value is one of the known texts are translated into the language
of the header bar, including those added later (observer). Comparison without the language's typography (space
before `:` removed in English before translation); a known text followed by a free ending (text of at least 8 characters,
or ending with `.` `:` `→`) or by signs alone (sort arrow, asterisk) is also recognised. The menu labels
(page titles) are registered by `repository_nav.js`. Texts composed by the code
are produced directly in the current language (`RepositoryNav.getLanguage()`). The pages
of the Landing Dashboard and of the Planner additionally have their own dictionary (`TR`,
`flight_i18n.js`).

## 4 bis. Virtual airline tokens

The suite's texts do not hard-code the airline's name: they carry **tokens**, resolved when the text
is produced, with the configured airline (“Settings › Installation › Virtual airline”, `suiteVA:v1`), otherwise the one from
`repository_tree.va`. No renaming of the page after the fact (the former observer in `repository_nav.js` has been removed).

| Token | Value | Default |
|---|---|---|
| `{SOG}` | acronym (`va.short`) | SOG |
| `{SOG_NOM}` | name (`va.name`) | SO Group Virtual |
| `{SOG_NOM_LONG}` | long name (`va.fullName`, the name if absent) | Virtual Special Operation Group |
| `{CENTRE}` | acronym of the centre (`va.centre`) | CPCO |

- **Where they are resolved**: `K.t` / `K.tf` (`shared/kit.js`, `K.brand(text)` for a text outside translation: header of a
  PDF, footer) and the translation of fixed texts (`content_i18n.js`: nodes, tooltips, tab title;
  original text kept, resolved again when the airline changes — event `suite-sources-change`).
- **Where to write them**: displayed texts, in all four languages (`'Exercice {SOG}', '{SOG} exercise', '{SOG}-Übung', …`),
  including the fixed HTML of the pages (`<title>{CENTRE} — Studio cartographique</title>`, `<p>{SOG_NOM} — …</p>`).
  The home page (`index.html`, without the toolkit) sets the name itself.
- **Availability categories**: default labels (`shared/dispos.js`) and those of the test dataset
  (`tools/jeu_essai/config/disponibilites.json`) as tokens (“{SOG} exercise”), resolved at display time
  (`SuiteDispos.label` → `K.t`); the editor in “Settings › Centre” shows the token as is. A categories file
  already written with a name in plain text keeps it (data).
- **Where not to write them**: data (missions, files in `data/`, YAML headers), identifiers and fallback values
  (`by: … || 'CPCO'`, `X-SOG-Setup`), texts that quote the default values (“Back to SO Group Virtual”),
  comments, manuals.

## 5. `pilot_profile.js` — pilot profile

☰ › “Pilot profile”: IVAO ID (VID), VATSIM ID (CID), SimBrief identifier. Stored once
(`missionReportingConfig:v1`) and read by every page: network tracking and flight plan import
in the CRs, links to the trackers, latest SimBrief OFP in the Planner.

## 6. `browser_store.js` — local data

☰ › “Local data”: everything the pages keep in the browser (localStorage) is
copied into `defa_local_store.yaml`, in a folder chosen once (ideally the synchronised folder
of the repository) — automatic writing when leaving each page, restoration by
merging (the most recent data wins). Excluded: the network tracking in progress, the key of the
CR submission web service. Event `local-store-restored` after a restoration.

**Saved IndexedDB databases** (section `indexed` of the file): `FlightPerfCache` (OFPs, calibrations,
planner airframes) and `LandingPerformanceDashboardCache` (loaded landing log) — list
`IDB_SAVED`. Not saved: SIA database (re-read from the official folder), folder authorisations.
Full inventory of the data and of its origin: [operations manual § 2](../MANUEL_EXPLOITATION.md).

### Backup reminder

Each change to the local data is counted (at most one per key and per minute;
block layout, period and display preferences excluded). From **10** onwards, a
**💾 Save (n) · date of the last backup** button appears in a contrast colour
in the header: it writes the backup to the authorised folder (otherwise has one chosen, or
downloads the file) and resets the counter to zero. The automatic backup (authorised
folder: every 5 minutes and when leaving the page) also resets the counter to zero.

### Log of backups and reloads

`LocalStore.journal()`: entries (60 at most, localStorage `suiteBackupLog:v1`, most recent first);
`LocalStore.logEvent({ kind, source, … })` adds one (event `local-store-journal`). Each
`restoreText(text, { source })` records the restoration in it: origin, date of the backup read back, keys added and
updated, IndexedDB databases. The Maintenance page adds full backups, reloads, SIA extractions, archivings and
MORA recomputations to it. `LocalStore.toText()`: YAML text of the backup (used by the full backup).

## 6 ter. `suite_update.js` — updates

Settings `suiteUpdate:v1`: `channel` (`master` stable, `develop` early bird), `mode` (`manual`, `auto`, `off`),
`periodDays` (0 = at each opening, at most every hour; 1, 7, 28, 30). `SuiteUpdate.check()` reads the branch of the
channel (commit, date, title) and its `repository_tree` (version) through the GitLab API of framagit (`release.repository` of
`repository_tree`), compares them with the known local commit (read in `.git`, `SuiteUpdate.readGit(folder)`) or with the local
version; result `suiteUpdateCheck:v1`. Header badges: “⬆ Update” and “AIRAC nn/yy” (SIA database of the
studio older than the current cycle, according to `siaBaseInfo:v1`), leading to `apps/settings/maintenance.html`. A web page does not
rewrite the repository: the application goes through `python tools/update_suite.py update` (channel: `git config
suite.channel`).

## 6 sexies. `data_files.js` — data outside the application (v3)

The airline's data and recomputed data live in `data/` (clone of the data repository, ignored by git; marker
`data/data_tree.js`). A page loads a data file with
`<script src="../…/shared/data_files.js?v=…" data-file="references/aircraft_fleet.js"></script>`: the first call reads the
marker, then each file is taken from `data/`, otherwise from `examples/` (synchronous loading, order preserved). API:
`DataFiles.available()`, `DataFiles.url(path)`, `DataFiles.dataUrl(path)`. Ledgers: `data/cr/` (`ledger.js`,
`mission_reporting_config.js`); SIA: `data/sia/` (cities shipped in `shared/carto/`). `FileAccess`:
folder `__data`; ledger (`cr`), missions, SIA are deduced from it, performance (`planner`) and local backup
(`local`) too if they are not set elsewhere.

## 6 quinquies. External sources

`repository_tree.sources`: default addresses (`defa`, `siaData`, `siaCycle` — template `{nn}` / `{yy}` —, `siaEaip`,
`suiteRepo`, `dataRepo`). `RepositoryNav.source(key)`: local override (`suiteSources:v1`, set in
“Settings › Maintenance › Sources and folders”) otherwise default value; `RepositoryNav.setSource(key, value)`
(event `suite-sources-change`). No address or SIA is hard-coded in the pages' code.

## 6 quater. `airac.js`, `zip_store.js`

- `Airac.cycle(date)`, `next()`, `fromDate('2026-10-01')` → `{ date, ident: '2610', label: '10/26', until, url }`
  (28-day cycles since AIRAC 2401 of 25 January 2024; `url`: page of the cycle on the SIA website);
  `inspectFolder(files)`: role and cycle of the files of a SIA XML folder, complete cycles or not, old cycles,
  export ZIP; `base()` / `summarize()` / `baseSummary()`: studio database (read-only); `patchBase(fields)`;
  `moraFromObstacles(csv, obstacleMax, cycle)`: simple recomputation of the MORA grid; `moraCycle(csv)`.
- `ZipStore.build([{ name, data, date }])` → Blob (deflate via `CompressionStream`, otherwise stored; UTF-8 names);
  `ZipStore.read(blob)` → entries `{ name, size, date, bytes(), text() }`; `ZipStore.sha256(data)`.

## 6 bis. `file_access.js` — folders and files

- Remembered folders (IndexedDB `missionCore` › `handles`): **repository** (`__repo`: the application root, which
  contains `config/repository_tree` — choosing it sets `data/` and its sub-folders in one go, and the local backup
  if it has not been chosen: `deriveFromRepo`), **ODV workbook** (`__odv`: OneDrive folder of the workbook; copy of the
  latest workbook kept under `__odvFile`), **ledger** (`__ledger`:
  `Documentation/CR`, which contains `mission_cr.html`), **local backup** (`__store`),
  **performance** (`__perf`, Flight Planner), **SIA XML** (`__sia`: AIRAC data, marker file
  `mora.csv`), **missions** (`__missions`: `Documentation/Missions`, generated series; registry
  `mission_registry.yaml`), **X-Plane** (`__xplane`: CSV logs of the landing plugin, default folder of the
  Landing Dashboard). All are set in “Settings › Maintenance › Sources and folders”.
- `FileAccess.pickFolder(key)`: the picker opens on the current folder; check of the
  expected content (marker file) with confirmation.
- `FileAccess.decorate(button, key)`: the button shows “Ledger folder: CR ✓”
  (✓ authorised, ⚠ to be re-authorised on next access); the tooltip gives the expected folder and
  the state — the explanation on hover rather than on screen.
- **Every** `<input type="file">` of the suite opens the system picker **directly in
  the configured folder**: `data-picker-folder="__ledger"` on the field, otherwise default folder
  of the page (CR application: ledger; Settings: repository; Flight Planner:
  performance; SIA missions: SIA XML), otherwise the last folder used for this button. The pages' code does not
  change (usual `change` event). Browsers without the API: native picker. **Folder**
  pickers (`webkitdirectory`) keep the native picker.

### Copy-paste panels (`FileAccess.pastePanel`)

Every window where text is pasted (CR › Analysis / import, log, VATSIM history of the
network tracking, mission and zone list of the SIA studio, generator mission): **×** at the top right and a **“Close”** button; the load button is
**disabled** as long as the area is empty, becomes **“✓ Confirm”** (green, closes the window) after a
successful load, and becomes “Load” again as soon as the area is filled again.

```js
const panel = FileAccess.pastePanel({ root, area, run, close, runLabel });
panel.done();   // après un chargement réussi
```

## 7. `time_period.js` — analysis period and zoom

Single component to choose the analysed period **and zoom** — general reporting,
family reporting pages, former HEMS / GAAR reporting pages, Landing Performance Dashboard.

Interface:

- presets (all dates, today, last 7 / 30 days, current month, current year),
  start / end dates always visible (changing them = custom period);
- buttons **◀ back**, **🔍− zoom out ×2**, **▶ forward**, bounded by the extent of the
  data; navigation keeps the width of the period;
- **zoom from a chart**: dragging over a chart (or clicking a bar) calls
  `TimePeriod.zoomTo(start, end)`; double-click: `TimePeriod.zoomOut()`.

API:

```js
const ctrl = TimePeriod.mount(element, {
  onChange(state) {},          // { preset, start, end }
  storage: true,               // partagé (défaut) | false : piloté par la page
  bounds: { start, end },      // étendue des données (dates, instants ou ms)
  presets: true, summary: true
});
ctrl.setBounds(debut, fin); ctrl.set(state); ctrl.zoomTo(a, b); ctrl.shift(±1); ctrl.zoomOut();
TimePeriod.filterRows(lignes, 'date');   // lignes de la période (état partagé)
TimePeriod.range(); TimePeriod.rangeMs(state);   // période effective (jours / millisecondes)
TimePeriod.zoomTo(a, b); TimePeriod.zoomOut(); TimePeriod.zoomIn(); TimePeriod.shift(±1);
TimePeriod.edges(conteneur, lignes, 'date');     // repères sous un tableau : ◀ n avant · − + · m après ▶
```

- **Shared mode** (reporting pages): state in `missionReportingPeriod:v1`, synchronised between
  pages and tabs (event `mission-period-change`) — a zoom in the general reporting is
  found again in the family reporting pages.
- **Driven mode** (Landing Dashboard): the page keeps its period (remembered per measurement
  file) and displays it through `ctrl.set()`; zooming by dragging over its charts goes through
  `ctrl.zoomTo()`.
- State: `start` / `end` to the day (`AAAA-MM-JJ`) or to the millisecond
  (`AAAA-MM-JJTHH:MM:SS.mmm`, local time) for a zoom on timestamped events;
  navigation and zoom out rounded to days for a period in days.

## 8. `charts.js` — charts

Self-contained SVG (offline, printing), styles injected and themable through the variables
`--muted`, `--soft`, `--panel`, `--mcg-grid`, `--mcg-base`:

- `MissionCharts.buckets(dates, { start, end, unit, lang })`: continuous periods (unit
  automatic according to the extent, or day / week / month / quarter / year; 400 at most);
- `stackedBars({ buckets, series, value, format })`: stacked bars per period;
- `enableZoom(container)`: zoom by dragging / click / double-click linked to TimePeriod;
- `donut(items)`, `hbars(items)`: breakdowns and rankings.

## 9. `mission_table.js` — sortable table

`SortedTable.render(container, { rows, columns, defaultSortKey, defaultDir, onRowClick,
onDelete, deleteMessage, emptyText, rowTitle })` → `{ setRows, getRows }`. Columns:
`{ key, label, type: 'number', format(v, row), html(v, row), sortValue(row) }`.
Sticky headers, numeric or text sorting, clickable row, confirmed “Delete” button.

## 10. `data_admin.js` — Settings › databases

Page `apps/settings/parametrage.html`: table editing of the repository's JavaScript databases (fleet,
aircraft types, callsigns…) and of the browser data. “Apply in this browser”
writes a dated overlay (`dataOverride:<base>:v1`) that takes priority as long as it is more recent
than the file; “Save to repository” rewrites the file (common format, see
`AircraftDB/datafile.py`) in the authorised repository folder. See the operations manual.

## 11. `AircraftDB/` — aircraft types

`aircraft_db.js` (ICAO types: designator, model, category…), `aircraft_icons.js`
(silhouettes), `aircraft_overrides.json` (local corrections), scripts
`update_aircraft_db.py` (update), `update_fleet.py` (fleet),
`datafile.py` (common format of the data files).

## 11 bis. `aircraft_catalog.js` and `defa_reference.js` — common catalogue

Loaded right after `AircraftDB/aircraft_db.js` in **all** the pages that use it
(CR, Settings, Landing Dashboard, Flight Planner):

- **types**: ICAO database (with the changes made in Settings that are more recent than the file),
  military types missing from the database (`SUPPLEMENT`: RFAL, MIR2, A400, E3CF, H160, TIGR…) and
  types added locally in the CRs (`missionAircraftTypes:v1`), merged into
  `window.AIRCRAFT_DB` — the three applications see the same types;
- **aircraft** (`AircraftCatalog.defaAircraft()`): fleet, reference, aircraft of the
  saved missions and of the loaded log, by registration (the most recent data
  wins): type, variant, callsigns, home base, last known airfield;
  `defaTypes()`: types in use, with their aircraft; `pilots()`: trigrams.
- `defa_reference.js`: committed **anonymised** reference (pilots: trigram, period, flights,
  types; aircraft: registration, type, callsigns used, home base, last airfield,
  status, entry into service) — without the flights or the missions. Generated by
  `tools/defa_reference.py` or Settings › Base, editable in Settings.

“Loose” database: an input aid, never a constraint — a missing value can still be entered.

### Type classification — one answer for the whole suite

Every page that asks “what type or category is this ICAO designator or this aircraft?” calls
`AircraftCatalog` (no local decoding of the ICAO description):

- `canonical(code)`: designator of a code (alias chain followed to the end: A4M → A400M → A400), the normalised code
  otherwise; `record(code)`: its record, `null` if unknown; `related(code)`: equivalent codes (the code, its chain, the
  aliases pointing to the designator) to find data filed under one of them (performance, profiles); `codeOf(text)`:
  designator of a free text (fleet variant, aliases, usage names `USAGE` — Caracal, AWACS, Phénix…, model name);
- `classify(code | record, { description })`: `{ code, rec, icao, fpl, family, kind, engines, power, category, wing,
  wtc }` — `family` L/S/A/H/G/T, or B for a balloon or airship (`kind` airship / balloon, non-ICAO); `engines` (“C”,
  coupled: 2); `power` J/T/P/E/R; `category` (rules decided on 15/10/2026): **helico** for H and G, otherwise by
  power — **jet**, **turboprop**, **piston** (tiltrotors, amphibians and seaplanes included) —, **other** for
  balloons, airships, electric and unknown types; `wing`: rotary (H, G, T), amphibious (A, S), fixed (L), lta; `fpl`:
  flight-plan designator (SHIP, BALL, ZZZZ for a non-ICAO type);
- `CATEGORIES`: display order (helico, turboprop, jet, piston, other); `CATEGORY_LABELS` / `categoryLabel(cat)`: the
  only set of category names (decision of 16/10/2026, short names: Helicopters, Turboprops, Jets, Pistons, Others —
  “Réacteurs” in French), used by assignments and *My aircraft*; `groupLabel(key)`: names of the display groups and
  aircraft labels of `AircraftDBIcons.group` (French keys; groups: Helicopters, Jets, Turboprops, “Pistons, 2 engines
  or more”, “Pistons, 1 engine”, Others), 4 languages;
- wake turbulence category “L/M” (B350, BE20, SW4): kept as given by ICAO (badge “L/M”); icon class `wtc-LM`, size of M
  with a dashed outline (rule set once by `AircraftDB/aircraft_icons.js`); ordered between L and M.

Built on it: silhouettes and groups (`AircraftDB/aircraft_icons.js`: `AircraftDBIcons.visual`, `.group` — by power,
then number of engines for pistons — and `.groupLabel` in four languages), assignment categories
(`MissionAssignments.fleetTypes`), *My aircraft* (`EquipmentEditor.categoryOf`), the CR wing category
(`MissionAircraft.categoryOf`), duration estimates (`mission_estimate.js`), the performance model
(`FlightPerfModel.kindOf`), Maintenance class labels, the Fuel planner (`gptEngines`, groups) and the Landing
dashboard. Designator lookups (*My aircraft*, Maintenance, first run, fleet reporting, Fuel planner and performance
sheets, Landing, CR, duration estimates, fuel reference, assignment fleet index) go through `canonical` / `record` /
`related` / `codeOf` instead of their own single-hop alias lookups. The catalogue is loaded on every page that loads
`aircraft_db.js`.

### Form collections (`form.js`)

Every collection is shown as a **compact table** (one row per item; long fields —
`full`, `textarea` — on a 2nd line), except `layout: 'cards'` (aircraft: one card per
aircraft). `link(item)`: link at the top of the card (aircraft sheet). Adding with the “+” of the title.

## 11 ter. `aar_tracks.js` — refuelling tracks (MILAIP ENR 5.7)

- `AarTracks.parseEnr57(pageTexts)`: reading of the ENR 5.7 PDF (text extracted by pdf.js) —
  points in decimal minutes and in DMS compared, full names of the tracks, footnotes (30 / 40 NM),
  width 14 NM, side given by S2, heavy FOX / ROM patterns; anomalies listed.
- `AarTracks.toXml(result)` → `data/sia/miam-enr-5-7-tracks.xml`; `parseTrackXml(xml)` reads it back.
- `AarTracks.trackRacetrack(track, { defaultSide })` / `racetrack(…)`: exact outline of the
  racetrack (outbound leg IP → CP, offset return leg, semicircles), heading, length, width, side.
- `toGeoJson`, `nearest`: MapLibre / SVG drawings, nearest track to a point.

## 11 quater. Mission → CR bridge

- `MissionVocab.familyForType(type)` (`shared/mission_core/vocab.js`): CR family from
  a free mission type (MEDEVAC → HEMS, TRAINING → SPECIAL…).
- A CR page opened with `?from=sia` reads `localStorage['siaMissionToCr:v1']` (mission
  `helo-xp-mission`), creates a new pre-filled CR (`fromSia` in `core.js`: name, number,
  objective, airfields, points, aircraft with the catalogue's ICAO type, operator, load), then
  applies the usual aids (known aircraft, airfield); confirmation before replacing
  a draft.

## 12. `tools/` — maintenance

- `tools/bump_versions.py`: new cache version number (`?v=`) in all pages
  after a change to shared code (always higher than the previous one); also updates
  the internal loads of `repository_nav.js` (pilot profile, local data, folder
  access, update check) and the scripts specific to `apps/cpco/` (`mission_store.js`, `sia_i18n.js`…).
- `tools/update_suite.py`: git state (`status`), channel (`channel master|develop`), safe update (`update`:
  fast-forward, refusal if files are modified, log `.git/suite-update.log`), diagnosis (`doctor`: remote, branches,
  merged branches, orphan packs, `VERSION.json`, files tracked but ignored, `core.autocrlf`).
- `tools/defa_reference.py "Log des vols.html"`: anonymised reference
  (`data/references/defa_reference.js`) from the flight log (completes it without deleting anything).
- `tools/new_family_pages.py`: creates the pages of a new mission family in
  `apps/cr/`.

## Launcher and first run

- `lancer.cmd` / `lancer.sh` (root): find or install Python, then `tools/launch.py`: data (`data/` up to date,
  `.zip` archive dropped in, or clone of the private repository), local server (`http://127.0.0.1`, first free port from
  8000), browser on `apps/settings/premier_lancement.html`.
- The launcher's server carries a local interface `/__setup/` (state, clone with credentials, upload of the archive or of the
  log), refused outside the pages it serves (host `127.0.0.1:<port>` and header `X-SOG-Setup` required).
- First run: data, profile (`missionReportingConfig:v1`; credentials for the airline's website `defaCredentials:v1`, excluded from
  backups by `browser_store.js`), folders (`__repo`, `__odv` / `__odvFile`), then “Settings › SIA update”;
  `suiteSetup:v1` marks the suite as configured (the launcher then opens the home page), “Clean” (« Nettoyer ») erases it.

## Adding a page to the suite

1. Create the page (a `<header>` with an `<h1>`, a `<main>`).
2. Load `config/repository_tree` at the top (path relative to the page), then at the end of the page `shared/kit.js`,
   `shared/repository_nav.js`,
   `shared/app_framework.js` (and `content_i18n.js` for translation).
3. Declare it in `config/repository_tree` (`pages`), with its theme and its place in the menu.
4. `python tools/bump_versions.py`.

## Common SIA database (`shared/sia_base.js`)

`SiaBase` gathers everything related to the analysed SIA database, for the map studio and “Settings › Maintenance”:
reading of the folder (`build(files)`, `rebuild({ dir })`: most recent cycle, AIXM 4.5, XML_SIA, cities, background, mora.csv,
ENR 5.7 tracks), IndexedDB cache `sia-map-parser` (`get`, `put`, `patch`, `purge`; format `VERSION`), summaries
(`summarize`, `summary`, `info` = `siaBaseInfo:v1`, `previous` = previous database kept by `put`), MORA grid
(`computeMoraGrid` full, `moraFromObstacles` simple, `moraCsv`, `parseMora`, `moraLabel`), and the interface block
`SiaBase.panel(host, { onLoaded, onCached, onPurged })` (folder, Re-read (Relire), Purge (Purger), state, report, files), mounted
identically in the studio (`#sia-base`) and at step 4 of the SIA update. `Airac` (`shared/airac.js`) only keeps
the cycles and the folder inventory. Optional dependency: `SiaAero.parseAixm` (`shared/carto/aero_symbols.js`).

## Missions and maps (Centre): modules and files

- `apps/cpco/mission_store.js`: mission shared by the generator and the studio (`siaMissionShared:v1`, batch
  `siaMissionBatch:v1`, revision + BroadcastChannel), YAML/Markdown reading (schema `helo-xp-mission`; `schema_version`
  1.0 and 2.0 both read; 2.0 = family-letter identifiers, `operation`, `exercise`, `zones.kind`, `route_order`, studio
  settings in `maps[]`, `meta`; `tools/migrate_missions_schema.py` only bumps the marker). Format reference:
  [PROMPT_GENERATEUR_MISSIONS.md](PROMPT_GENERATEUR_MISSIONS.md).
- Markdown input (`SiaMission.fromTexts` / `fromTextsBatch`): the generated `summary<ID>.md` (intro lines `Type :`,
  `Aéronef :`, `Départ :`…, turning-point and team tables, rendezvous list; no coordinates for target and zones), or the
  legacy block format (`TYPE:`, `TARGET:`, `TURNING POINTS:` with `- PT1 | SIMIP | 46.444167 | 1.486000 | role`, `RDV:`,
  `ZONE:`, `MAPS TO PRODUCE:`, `NOTES:`; example `examples/missions/Mission 02.md`). The YAML wins when both are loaded.
  A pasted batch (ChatGPT answer, or YAML and Markdown one after the other) is split per `mission.id` /
  `# Mission <ID>`; text outside missions (intro, VALIDATION, "Mission suivante") and series side files
  (`maps_manifest.md`, `VALIDATION.txt`…) are dropped and reported.
- `shared/mission_registry.js`: registry and mission folder `data/missions/<letter>_<FAMILY>/<ID>/` = `mission<ID>.yaml`
  (source of truth), `summary<ID>.md` (a rendering of the YAML), `suivi.yaml`, `cartes/`, `recu/`, `versions/`; no PDF
  stored.
- `shared/mission_order.js` (order form), `apps/cpco/mission_skeleton.js` (skeleton), `shared/mission_estimate.js` +
  `mission_routing.js` (probable route, durations, transit), `mission_airspaces.js` (areas to activate),
  `mission_exercise.js` (exercise), `mission_i18n.js` (translated brief); each file header documents its rules.
- `apps/planner/map_planner.html` (Flight maps) is GENERATED from `apps/cpco/map_parser.html` by
  `python tools/build_map_planner.py`: never edit it by hand; its mission lives in a separate namespace
  (`SIA_MISSION_NS = 'planner'`).
- Flight performance model: `shared/flight_performance_model.js` (`FlightPerfModel`), shared by the fuel quote, the
  curves and the vertical profiles; its physics (ISA, parabolic polar, thrust / power lapse, calibration on the
  profile, model ceiling) is documented in the file header.
- Landing Dashboard test data: `python apps/landing/generate_test_landings.py` writes a synthetic CSV (thousands of
  landings, 248 types).
