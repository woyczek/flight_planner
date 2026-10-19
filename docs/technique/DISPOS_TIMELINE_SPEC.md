# Availability timeline — full specification (regeneration prompt)

This document describes the availability timeline component completely enough for a developer or a language model to
rebuild it without seeing its code. The reference implementation is `shared/dispos_timeline.js`, with its formats in
`shared/dispos_formats.js` and an example page in `labs/dispos_timeline.html`. To put the component into a page, read
[DISPOS_TIMELINE_INTEGRATION.md](DISPOS_TIMELINE_INTEGRATION.md) instead.

**How to use this document as a prompt.** Give it whole to the model and ask for one plain JavaScript file that defines
`window.DisposTimeline`, with no dependency, no build step and no ES module syntax. Every rule below is a requirement:
when two rules seem to meet, the more specific one wins, and section 7 (invariants) always wins.

## 1. Purpose and vocabulary

The component lets one person declare when they are available during one week, on a continuous time axis, to the
minute, in UTC. It replaces grids of fixed cells: a declaration is a set of time ranges, not ticked boxes.

- **Week**: an ISO 8601 week, written `YYYY-Www` (for example `2026-W42`), from Monday 00:00 UTC to the next Monday
  00:00 UTC. Every time inside the component is a number of minutes since that Monday, from 0 to 10 080.
- **Category**: what a range means (unavailable, leave, available for anything, exercise flight…). Categories come from
  the configuration (section 3). Each category belongs to one of two layers.
- **Background layer**: the nature of the unavailability (unavailable, leave, rest, real-life activity). A background
  range is drawn as a full-height **band**, colour only, no text.
- **Foreground layer**: the availabilities and activities, drawn as **rectangles** with a letter.
- **Shape**: a band or a rectangle. **Brush**: the category the next drawing will use, picked in the palette.
- **Gutter**: the gap between two day rows.

## 2. Data model

### 2.1 The two layers, in memory

The state of a week is two lists of ranges `{ s, e, cat }` (start and end in minutes of the week, end excluded): `bg`
for the background, `fg` for the foreground. Within one layer, ranges are sorted and never overlap. The two layers may
overlap each other: the background may stay under a rectangle.

**One state per minute.** At any minute, the person has one state: the foreground rectangle if there is one, otherwise
the background band if there is one, otherwise "unavailable by default". The background under a rectangle does not
count, in the export or in the hover text, but it stays in memory. So when a rectangle is moved or deleted, the
background chosen before shows again. The part of a background range that is not under any rectangle is its **visible
part**; only visible parts are drawn and exported.

### 2.2 Native format (schema 3)

```json
{
  "schema": 3,
  "pilot": "ABC",
  "week": "2026-W42",
  "tz": "UTC",
  "ranges": [
    { "start": "2026-10-14T00:00", "end": "2026-10-14T05:30", "cat": "IN" },
    { "start": "2026-10-14T05:30", "end": "2026-10-14T10:30", "cat": "SC" },
    { "start": "2026-10-14T10:30", "end": "2026-10-15T00:00", "cat": "IN" }
  ],
  "background": [
    { "start": "2026-10-14T00:00", "end": "2026-10-15T00:00", "cat": "IN" }
  ]
}
```

- `ranges` is **the declaration, the truth**: the foreground rectangles and the visible parts of the background,
  sorted, with no overlap. A reader that only wants to know when the person is available reads `ranges` and nothing
  else.
- `background` is the background as laid, including under rectangles. It is an editing convenience, so that the
  background comes back after a reload. A reader can ignore it; a writer that does not have it may omit it.
- Dates are `YYYY-MM-DDTHH:MM` in UTC, end excluded. A range may cross midnight. The value `T00:00` of the next day is
  the end of a day.
- Reading: when `background` is present, the background layer comes from it and the foreground from the foreground
  categories of `ranges`. When it is absent, both layers come from `ranges`, split by the layer of each category.
  A category unknown to the configuration goes to the foreground.
- Data is stored **one document per person and per week**.

### 2.3 Other formats

Other JSON formats are converted by separate readers and writers (`shared/dispos_formats.js`), never inside the
component. A format is an object `{ read(json, options) → schema 3, write(schema 3, options) → json }`, registered under
a name. The format of the people's data is not fixed yet, so new formats must be addable without touching the
component.

The provided `schema2` format is the weekly declaration of the X-Plane Web Suite: `{ schema: 2, semaine, pilote,
dispos: { "YYYY-MM-DD": [{ debut, fin, categorie }] } }`, times `HH:MM` on the quarter hour, `null` and `null` for a
whole day, categories by their `legacy` code. Its rules:

- Reading puts each item in the layer of its category; inside a layer, when items overlap, the later one wins.
- Writing outputs the declaration (`ranges`), split by day and rounded to the quarter hour. A day with nothing at all
  is written as unavailable for the whole day, with the first background category. Time with nothing in a day that
  has other entries gets no entry, since it is unavailable by default. Fields of an existing document passed as
  `base` are kept.

## 3. Configuration

```json
{
  "schema": 1,
  "groups": [
    { "id": "indispo", "label": "Unavailable", "layer": "background" },
    { "id": "dispo", "label": "Available", "layer": "foreground" }
  ],
  "categories": [
    { "id": "IN", "label": "Unavailable", "letter": "", "color": "#BFBFBF", "layer": "background", "group": "indispo", "legacy": "indispo" },
    { "id": "O", "label": "Available for anything", "letter": "O", "color": "#00B050", "layer": "foreground", "group": "dispo", "legacy": "tout" }
  ]
}
```

- `id` is the code stored in the data. `letter` is shown in the rectangle; background categories have none.
- `color` is the fill. The text colour on a fill is black or white, chosen from the fill's luminance.
- `layer` is `background` or `foreground` and decides every behaviour of the category.
- `group` orders the palette, one line per group, in the order of `groups`. `legacy` is the category's code in the
  schema 2 format.
- The first background category is the default "unavailable" of the schema 2 writer.
- The default configuration has four background categories (unavailable, leave, rest, real-life activity) and eight
  foreground ones (available for anything, civil security, defence, exercise flight, exercise control, other flight,
  DCS, other control), with the colours of the original grid.

## 4. Rendering

- **Navigation bar**: previous week, this week, next week, and the title "Week n — first day to last day (UTC)".
- **Palette**: one line per group, in the order of the configuration, its label on the left, then one button per
  category. The active brush is marked (`aria-pressed`). The background line ends with an "Erase background" brush.
- **Repeating period box** (section 5.9), above the grid, folded or open.
- **Grid**: two columns. The left column holds the day names, with the date under each name. The right column holds an
  hour axis and one row per day, Monday to Sunday.
  - The axis is labelled every two hours, from 00 to 24. Faint lines mark the half hours, stronger lines the hours.
  - Rows are separated by a gutter, and a gutter of about 8 px also runs above the first row and below the last one.
    Gutters are part of the drawing area, so a selection rectangle can start above Monday or below Sunday.
- **Bands**: full row height. Only visible parts are drawn. No text, except while being drawn.
- **Rectangles**: a little shorter than the row, square corners.
  - The start time is on the left, the letter is centred, the end time is on the right.
  - One letter per rectangle, never one per hour cell, and its times. When the full times do not fit (about 96 px,
    80 px in compact), short times are shown ("8 O 12", "8:30 O 12"). Below about 44 px, only the letter is shown, and
    the times are in the hover text. While dragging, the full times are always shown.
  - A rectangle that crosses midnight is drawn in each row, with its times shown only on its first and last pieces.
- **Edges and delete button**: on hover or selection, a shape shows a grip on each of its real edges and a small ✕
  delete button.
- **Hover**: outside a gesture, a tooltip follows the pointer and gives the range in words.
  - It names the day, the times and the category, for example "Wednesday 14 October, 00:00 to 05:30: Unavailable".
  - A multi-day range reads "from … to …". Empty time reads "Unavailable (default)", bounded to the day hovered.
  - It describes visible parts only.
- **While dragging**:
  - The preview is the final shape itself, already snapped, in its row, with its times updated live. There is no
    floating ghost and no separate tooltip.
  - A drawing across several rows also shows one selection rectangle over the grid, covering the rows crossed,
    gutters included. It is labelled "category from–to, first day → last day".
- **Density**, a mount option; it changes sizes only, never a rule.
  - `compact`, the default, keeps the look of a cell grid. Rows are about 22 px high with gutters of 3 px. The axis
    labels each hour from 0 to 23 in the middle of its cell, in 10.5 px type. The day column is narrow, with the short
    day name and the date on one line ("Mon 12/10").
  - In compact, the palette shows short chips in the category's own colour: the letter, then a short label, for
    example "O For anything". The short label is the label without the group name in front and without a trailing
    parenthesis, with words longer than 6 letters cut when it exceeds 12 characters. A `short.<id>` text or a
    `short` field in the configuration overrides it. The repeating period box starts folded. Help and messages are
    11–12 px.
  - `comfortable` uses rows about 44 px high, gutters of 11 px, axis labels every two hours, and full day names with
    the date under them. Palette buttons show a swatch with the letter and the full label.
  - In both densities, an hour line and a fainter half-hour line run over the whole height of every row, above the
    bands and under the rectangles.
- **Theme** through CSS custom properties, each with a default: `--dt-font`, `--dt-ink`, `--dt-accent`,
  `--dt-accent-soft`, `--dt-row-bg`, `--dt-line`, `--dt-line-half`, `--dt-btn-bg`, `--dt-btn-ink`, `--dt-tip-bg`,
  `--dt-tip-ink`, `--dt-edge` (the gutters above and below the rows). The component injects
  its own style sheet once.

## 5. Gestures and their rules

### 5.1 Where a gesture starts decides what it does

This rule does not depend on the brush or on the layer:

- A gesture that starts **on a shape**, a rectangle or a band, takes that shape.
  - A click selects it. A drag moves it (section 5.3). A grip resizes it (section 5.4).
  - Shift+drag draws over it instead (section 5.2). It is the way to draw an availability on a day already covered by
    a band.
- A gesture that starts **beside the shapes**, on empty row space or in a gutter, draws with the brush. The brush only
  says what to draw.
- A gesture never starts on a day name, the axis or a delete button.
- A pointer that moves less than 3 px between press and release is a click.

### 5.2 Drawing

- The anchor is the half hour nearest to the starting point, not the pixel. The other end is the half hour nearest to
  the pointer. A drawing is at least 30 min long and stays within 00:00–24:00 of a day.
- When the drag stays in one row, it draws one shape. When it crosses several rows, it is a **selection rectangle**.
  - The rows covered are those the drag crosses, from the starting point to the pointer, gutters included. A drag that
    stays inside one gutter takes the nearest row.
  - On release, the same time range is laid on each day covered: one shape per day, never one continuous range
    through the nights.
- The pointer is captured once the gesture starts, so a drag that leaves the grid keeps going, bounded to the grid.
- **The last shape wins.** A foreground drawing cuts the rectangles it covers, and their remaining pieces stay. A
  background drawing replaces the background it covers and also cuts the rectangles there: an unavailability laid
  over an availability splits it. The cut is shown live during the gesture.
- The "Erase background" brush removes the background over its range and leaves the rectangles.
- Pieces shorter than 5 min disappear. Adjacent ranges of the same category in a layer merge.

### 5.3 Moving

- The shape keeps its length.
- Horizontal moves go by steps of 5 min.
- Vertical moves go to another row: the same times, on another day. The preview follows the row under the pointer.
- The move is bounded to the week.
- A moved rectangle keeps its category and cuts what it lands on in its layer, like a drawing.
- A moved band changes only the background: the rectangles stay on top.
- After the move, the shape stays selected.

### 5.4 Resizing

A grip moves one edge by steps of 5 min. A shape keeps at least 5 min. A resize follows the same layer rule as a move.

### 5.5 Selection and keyboard

- One shape at most is selected. It shows an outline and its grips.
- Clicking beside the shapes clears the selection. A long press of about 500 ms with a finger selects.
- With a selection:
  - Delete or Backspace deletes it. Escape clears it.
  - ← and → move it by 5 min; ↑ and ↓ move it by one day.
  - Deleting a rectangle gives back the background under it.
- Anywhere, except in a form field: Ctrl+Z undoes; Ctrl+Y or Ctrl+Shift+Z redoes.

### 5.6 Palette

- **Click** selects the brush. It must not re-render the palette, or the second click of a double click is lost.
- **Double-click** on a background entry replaces the background of the whole week. Rectangles stay.
- **Drop an entry on a shape** (drag the entry from the palette onto the grid): the target is outlined during the
  drag, and the shape changes its nature over its own extent.
  - A foreground entry on a rectangle changes the rectangle's category.
  - A background entry on a rectangle replaces it with that background.
  - A background entry on a band changes the band's category.
  - A foreground entry on a band lays a rectangle over it.
  - "Erase background" on a band erases that band.
- **Drop an entry on a day**, on the empty part of its row or on its name: the whole day.
  - A background entry changes only the background of that day: rectangles stay, and the day becomes that background
    wherever there is no rectangle.
  - A foreground entry lays one rectangle over the whole day.
- A drag that ends outside the grid does nothing. A drop is never also a click: the brush does not change.

### 5.7 Double-click in the grid

- On a band: the band's category replaces the background of that day.
- On empty space with a background brush: that brush replaces it.
- Rectangles are never removed by a double-click.

### 5.8 History

- Each gesture that changes the data is one step: a drawing, move, resize, delete, double-click, palette drop,
  keyboard move, clear, or the repeating period.
- A gesture that changes nothing adds no step.
- The history keeps up to 50 steps per week shown. Undo and redo clear the selection.
- The host page can offer Undo and Redo buttons, greyed when there is nothing to undo or redo.

### 5.9 Repeating period

The repeating period box lays one category over a date span:

- Fields: a category, a date from and a date to (by default the week shown), a box per weekday, and optional start
  and end times on a 5 min step.
- With no times, it lays whole days. An end before the start runs until the next day.
- The box checks its fields and says what is wrong in its message line. It never uses a native dialog.
- It lays every matching day like a drawing.
  - Weeks other than the one shown are read and written through the `store` option.
  - Without `store`, the message counts the weeks that were not saved.

## 6. API and events

```text
DisposTimeline.mount(host, {
  config, week, data, lang, labels, t, density, help, nav, period, buttonClass, onChange, store
}) → api
api: get(), set(data), replace(data), add(ranges), week(id?), brush(id?), slot(name), clear(), undo(), redo(),
     history(), destroy()
```

### 6.1 `mount` options

- `config`: the categories (section 3). Default: `DisposTimeline.DEFAULT_CONFIG`.
- `week`: the week shown. Default: the current week.
- `data`: schema 3 data for that week.
- `lang`: the locale of dates and day names, through `Intl`. Default: `en`.
- `density`: `compact` (default) or `comfortable` (section 4).
- `help`: `true` (default), `"collapsed"` or `false`. It controls the "How to use" panel under the grid, open,
  folded or absent. The panel holds one short paragraph per idea, in the order of use: the two layers and the one
  state per minute; the palette, which says what to draw; drawing; taking a shape; cutting; drops and double-clicks;
  correcting; the repeating period; what is saved. Its texts are labels like any other: `help.title`, then
  `help.layers`, `help.palette`, `help.draw`, `help.grab`, `help.cut`, `help.drop`, `help.fix`, `help.period` and
  `help.saved`.
- `labels` and `t`: the texts (section 6.4).
- `nav` and `period`: `false` hides the component's own week bar, or its repeating period box. A host page that has its
  own week navigation or its own entry form uses them. Without the period box, the help leaves out its paragraph.
- `buttonClass`: a class added to the component's own buttons (palette chips, ✕), for a host page whose theme styles
  every button: the host's way to leave a button unstyled (`repo-plain` in the X-Plane Web Suite).
- `onChange(data)`: called with schema 3 data after every change.
- `store: { read(week) → data | null, write(data) }`: used by the repeating period for weeks other than the one
  shown.

### 6.2 Methods

- `get()` returns the data of the week shown. `set(data)` replaces it, without a history step: use it to load.
- `replace(data)` replaces it as one history step, which can be undone: use it to import. It returns false and
  changes nothing when the data belongs to another week.
- `week(id)` shows another week, empty, and fires `dispos-week`. The host then loads that week with `set`.
- `week()` without an argument returns the week shown.
- `brush(id)` sets the brush and fires `dispos-brush`; without an argument it returns the brush. `clear()` empties the
  week, as one history step.
- `add(ranges)` lays schema 3 ranges (`[{ start, end, cat }]`) with the drawing rule, as one history step. It returns
  how many were laid. A host page's own entry form uses it, for example a precise range to the minute.
- `slot("palette")` returns an empty element right under the palette, for the host page's own line (for example the
  mission themes opened by the chosen category).
- `undo()` and `redo()` return false when there is nothing to do. `history()` returns `{ undo, redo }`, the counts.
- `destroy()` removes the listeners, the tooltip and the content.

### 6.3 Events, fired on `host`

- `dispos-change`: detail is the schema 3 data, after every change, together with `onChange`.
- `dispos-select`: detail is `{ start, end, cat, layer }`, or `null`, whenever the selection changes.
- `dispos-week`: detail is `{ week }`.
- `dispos-history`: detail is `{ undo, redo }`.
- `dispos-brush`: detail is `{ id }`, when the brush changes.

### 6.4 Texts

- Every text has an English default in `DisposTimeline.DEFAULT_LABELS`, keyed by name. `{name}` placeholders are
  filled in.
- The host overrides texts with `labels` (`{ key: text }`) or with `t(key, defaultText)`. Keys `cat.<id>`,
  `group.<id>` and `short.<id>` translate the configuration's labels and the short labels of the compact palette.
- Dates and day names come from `Intl` in the `lang` locale.

### 6.5 Exports

`DEFAULT_CONFIG`, `DEFAULT_LABELS`, `weekId(date)`, `weekMonday(id)` (milliseconds), `addWeek(id, n)`, and `model`. The
`model` holds the pure functions the formats need: cut, tidy, paint, the layer setters, the visible background, and
the read and write of schema 3.

## 7. Invariants

These hold after every gesture, every read and every undo:

1. Within one layer, no two ranges overlap.
2. No range is shorter than 5 min.
3. In `ranges`, no two ranges overlap: one state per minute.
4. Every time is in UTC and inside the week.
5. A background change never removes a rectangle, except where a background is drawn over it.
6. Data is read and written one week at a time.

## 8. Accessibility

- Palette buttons are real buttons with `aria-pressed`. Shapes are `role="button"`, with `aria-pressed` for the
  selection and the hover text as `aria-label`. Rows carry the full date as `aria-label`.
- The keyboard edits a selected shape (section 5.5). Creating a shape needs a pointer or the repeating period box.
- Touch works like the mouse, through pointer events, with a long press to select and `touch-action: none` on the rows.
- Colours are never the only information: rectangles carry a letter, and every shape has its text in the tooltip.

## 9. Out of scope

- Several people at once.
- Time zones other than UTC on the axis.
- Recurring rules stored as rules: the repeating period box writes plain ranges.
- Server storage and conflict handling (that is the host page's `store` and `onChange`).
- Printing.
- Native browser dialogs: none are used.
