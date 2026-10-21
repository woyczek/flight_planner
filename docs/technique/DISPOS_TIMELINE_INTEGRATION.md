# Availability timeline — integration into a single-page HTML application

This guide explains how to put the availability timeline (`dispos_timeline.js`, with its formats in `dispos_formats.js`)
into another HTML page that holds its whole application in one file. It can be followed by hand, or given whole as a
prompt to a language model working on that page. The component itself is described in
[DISPOS_TIMELINE_SPEC.md](DISPOS_TIMELINE_SPEC.md); this guide only says how to connect it.

**How to use this document as a prompt.** Give it whole, together with the target page and the two script files, and
ask the model to connect the component following the rules below. Adapt the storage and the format to the page. Leave
the component's code unchanged: anything the page needs comes through its options, events and CSS variables.

## 1. Loading the scripts

- The component is two classic scripts, with no dependency and no build step. Load `dispos_timeline.js` first, then
  `dispos_formats.js`, which needs it. Do not use `type="module"`.
- When the page may sit next to files, use `<script src="…">` tags pointing to the two files. When the page must stay a
  single file, paste each file's whole content into its own inline `<script>` element, in the same order, unchanged.
- The component defines `window.DisposTimeline`, and the formats define `window.DisposFormats`. Loading either twice
  is harmless: the second copy does nothing.
- The scripts can run before or after the page's own code, as long as the code that mounts the component runs after
  both of them.

## 2. The container

- Give the component one empty block element, such as a `<div>`, and nothing else. The component fills it, and
  `destroy()` empties it again.
- Choose the density with the `density` option. `compact`, the default, takes about 200 px of height for the grid,
  with rows of 22 px and hour cells like a timetable. `comfortable` has rows twice as high. At about 800 px of width,
  short rectangles show their letter only; their times are in the hover text.
- Do not style the component's inner classes (`dt-…`). Use the CSS variables (section 6) instead. When the page's theme
  styles every `<button>`, pass `buttonClass` with the class that exempts a button from it, or the palette chips lose
  their colours.
- The page keeps its own controls outside the container: person picker, Undo / Redo buttons, Clear, Save. When it has
  its own week navigation or entry form, pass `nav: false` or `period: false`, then lay its ranges with `api.add`.
  `api.slot("palette")` gives it a line under the palette; `dispos-brush` says which category is chosen.
- The component shows a "How to use" panel under the grid. Choose it with the `help` option: `true` (open), `"collapsed"`
  (folded; good for a page people use every week) or `false` (none, when the page has its own help).

## 3. Minimal configuration

- With no `config`, the default categories are used: four kinds of unavailability and eight kinds of availability, in
  English. Pass a configuration only when the page has its own categories. The rules for it are in section 3 of the
  specification: each category needs an id, a label, a colour and a layer.
- Category ids are what the data stores. Never rename an id once data exists; change its label instead.
- With no `labels`, the texts are English. To use another language:
  - pass `lang` (for example `fr`) for dates and day names;
  - pass `labels` (`{ key: text }`, keys from `DisposTimeline.DEFAULT_LABELS`, plus `cat.<id>`, `group.<id>` and
    `short.<id>` for the configuration's labels and the short palette labels), or `t(key, defaultText)` when the page
    already has a translation function.
  - Missing keys fall back to English.

## 4. Reading and writing the data

The component never stores anything itself. It hands the data to the page, one person and one week at a time.

- **Load**: before mounting, read the week's data and pass it as `data`. When the person or the week changes, read the
  new data and call `api.set(data)`. The component fires `dispos-week` when the person browses weeks with its own
  buttons: listen to it, read that week, then call `set`.
- **Import**: to replace the week with data the person pasted or picked, call `api.replace(data)`. It is one history
  step, so Ctrl+Z undoes it. Data of another week: call `api.week(id)` first, and let the `dispos-week` handler load
  that week.
- **Save**: `onChange(data)` and the `dispos-change` event fire after every change, with the whole week. Save it there.
  Debounce the save when it goes over the network; the component does not wait for it.
- **Other weeks**: the repeating period box can reach weeks other than the one shown. Pass `store: { read(week),
  write(data) }`, both synchronous, working on the same storage as the load and the save. Without `store`, those weeks
  are reported as not saved.
- **Mounting again**: to change the language, destroy the component and mount it again with the new `lang` and
  labels. Keep one `Map` in the page and pass it as `undoStore` to both mounts: Undo still works on the person's
  earlier gestures. Clear that `Map` when the categories or the person change.
- **Storage choices**:
  - `localStorage`: one key per person and week, holding the JSON text. Wrap every access in try/catch: storage can be
    full or disabled.
  - `fetch`: load before mounting, save in `onChange`. For `store`, keep a cache of the weeks already loaded, because
    `store.read` must answer at once. A week not in the cache can be read as `null`, which means empty.
  - The page's own function: call it from the same three places.
- **Key the data by person and week**, using the ISO week id the component gives (`2026-W42`), and never by a date
  computed locally.

## 5. Choosing the format

- Schema 3, the native format, is what `data`, `get()` and `onChange` use. `ranges` is the declaration, the truth.
  `background` is an editing convenience: keep it when storing schema 3, or ignore it when only the availability
  matters.
- When the page stores another format, convert at the edges with `DisposFormats`:
  - after reading, `DisposFormats.read(name, json, { config })`;
  - before writing, `DisposFormats.write(name, data, { config, base })`, where `base` is the stored document, whose
    other fields are kept.
- The X-Plane Web Suite weekly declaration is the `schema2` format. The example page (`example.html`) registers a
  third one, `flat`, to show how: one line per range and per day, `{ day, start, end, category }`. For any other format, register a reader and a
  writer once with `DisposFormats.register(name, { read, write })`.
  - `read` returns schema 3 data for one week; `write` takes schema 3 data and returns the page's JSON.
  - Build them on `DisposTimeline.model` (for example `model.toData` and `model.fromData`) rather than rewriting the
    layer rules.
- Pass the same `config` to the component and to the formats, so that category ids and their layers agree.

## 6. Events and theme

**Events**: listen on the container.

- `dispos-change`: the data changed.
- `dispos-select`: an availability (rectangle) was selected; detail `{ start, end, cat, layer }`, or `null`.
- `dispos-week`: the person browsed to another week.
- `dispos-history`: detail `{ undo, redo }`, the counts, to enable or grey Undo and Redo buttons. The page calls
  `api.undo()` and `api.redo()`. Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z already work inside the page.

**Theme**: set CSS variables on the container or an ancestor. Each has a default, so set only what differs.

- `--dt-font`: the font shorthand.
- `--dt-ink`: the text colour (by default the component inherits the page's colour, so it reads on light and dark pages alike).
- `--dt-accent` and `--dt-accent-soft`: selection, outlines, the selection rectangle.
- `--dt-row-bg`: empty rows. `--dt-line` and `--dt-line-half`: the hour and half-hour lines.
- `--dt-edge`: the gutters above the first row and below the last one.
- `--dt-btn-bg` and `--dt-btn-ink`: palette buttons.
- `--dt-tip-bg` and `--dt-tip-ink`: the hover tooltip.

**Several instances**: one page may mount several components, one per container. Call `destroy()` on an instance
before removing its container.

## 7. Known pitfalls

- **UTC everywhere.** The axis, the data and the week boundaries are UTC. Do not convert to local time before handing
  data to the component. When the page shows local times elsewhere, say clearly that this view is UTC.
- **ISO weeks.** Weeks run Monday to Sunday and are numbered by ISO 8601. Around 1 January, the week's year can differ
  from the calendar year (31 December 2029 is in `2030-W01`). Always use `DisposTimeline.weekId`, `weekMonday` and
  `addWeek`, never a homemade week number.
- **No native dialogs.** The component never calls `alert`, `confirm` or `prompt`, and the integration must not add
  any around it. Report errors in the page's own message area.
- **Keyboard.** The component listens to the document for Delete, the arrows, Escape, Ctrl+Z and Ctrl+Y. It ignores
  keys typed in form fields. If the page uses the same shortcuts for something else, handle them outside the
  component's container, or stop them first.
- **Hidden containers.** The component measures rows when the pointer moves, so it can be mounted in a hidden tab. While
  hidden, rectangles cannot measure their width and show their letter only, until the next change or `api.set` call
  after the tab is shown.
- **Pointer capture.** A drag continues outside the container while the button is held. Do not cancel `pointermove`
  on the window.

## 8. Complete minimal example

The one piece of code in this guide: a single page, with the two scripts next to it, saving to `localStorage`.

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Availability</title></head>
<body>
  <p><label>Person <input id="who" value="ABC" size="5"></label>
     <button id="undo" disabled>Undo</button> <button id="redo" disabled>Redo</button> <span id="msg"></span></p>
  <div id="timeline"></div>
  <script src="dispos_timeline.js"></script>
  <script src="dispos_formats.js"></script>
  <script>
    const T = window.DisposTimeline, host = document.getElementById('timeline');
    const who = () => document.getElementById('who').value.trim().toUpperCase() || 'ABC';
    const key = week => `availability:${who()}:${week}`;
    const read = week => { try { return JSON.parse(localStorage.getItem(key(week)) || 'null'); } catch { return null; } };
    const write = data => {
      try { localStorage.setItem(key(data.week), JSON.stringify({ ...data, pilot: who() })); }
      catch (e) { document.getElementById('msg').textContent = `Not saved: ${e.message}`; }
    };
    const empty = week => ({ schema: 3, pilot: who(), week, ranges: [] });
    const week = T.weekId(Date.now());
    const ui = T.mount(host, { week, data: read(week) || empty(week), onChange: write, store: { read, write } });
    const load = () => ui.set(read(ui.week()) || empty(ui.week()));
    host.addEventListener('dispos-week', load);
    document.getElementById('who').addEventListener('change', load);
    host.addEventListener('dispos-history', e => {
      document.getElementById('undo').disabled = !e.detail.undo;
      document.getElementById('redo').disabled = !e.detail.redo;
    });
    document.getElementById('undo').onclick = () => ui.undo();
    document.getElementById('redo').onclick = () => ui.redo();
  </script>
</body></html>
```

To store the X-Plane Web Suite format instead, change two places: read with
`DisposFormats.read('schema2', json)`, and write with `DisposFormats.write('schema2', data, { base: json })`.
