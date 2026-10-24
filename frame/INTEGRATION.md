# V3 frame — how a module plugs in

This guide is for the agent or developer of a V3 module. It says what the frame gives a module and the rules a module
follows. The frame itself is described in [SPEC.md](SPEC.md). Start from the example module, `modules/hello/module.js`
(not in the application's menu: set `localStorage['sogFrame:dev'] = '1'` on a development workstation to open it).

## 1. The rule

A module never reaches the frame, the network, the browser storage or another module directly. Everything it needs
comes through the **adapter** it receives when it is mounted. If it needs more, its agent asks the frame agent, who
extends the adapter and this guide in the same commit.

## 2. The module file

A module is one folder, `modules/<id>/`, whose entry is `module.js`, an ES module:

```js
export const meta = {
  id: 'availability', apps: ['pilot'], level: 1,
  reads: ['disponibilites/', 'utilisateurs/'],
  writes: [{ prefix: 'disponibilites/', merge: 'record' }, { prefix: 'cache/availability/', policy: 'cache' }],
  files: ['timeline.js', 'texts.js']
};
export async function mount(el, ctx) { /* draw into el with ctx */ }
export function unmount() { /* stop watchers, timers */ }
```

- The frame loads it on demand and gives it `ctx` (frame/SPEC.md § 3.2): `data`, `aerodb`, `t`, `lang`, `notify`,
  `ask`, `askText`, `net`, `identity`; a fixed module (§ 9.2) also gets `overlay` (§ 9.3).
- Its verb in the application's rail (and in its group's popover, § 9.1) is set in `frame/app.js` (`APP.modules`): one short verb, seven
  modules at most. Its place in the phone's bottom bar is set in `APP.tabs` (§ 9); a module never writes either.
- `meta.help` (true by default): the frame draws the folded "How to use" panel at the top of the module as soon as
  the module's chapter (`modules/<id>/help/<lang>.md`) is in the application's manual; `false` hides it. Writing the
  chapter: `frame/help/INTEGRATION.md`.
- `meta.fixed` (`true`, absent by default): the fixed, full-height view (§ 9).
- `meta.level` (1 to 3, 1 by default): the menu lists the module only when the device's usage level, chosen in
  Settings, is at least this one (1 discovery, 2 everyday, 3 full); a hidden module stays reachable by `#id`.
- Texts are rows `[fr, en, de, es]` passed to `ctx.t`, French first, every text translated (tooltips, statuses and
  composed sentences included).
- No global style sheet: use the frame's tokens and classes (§ 3.2 of the SPEC).
- `files`: every other file the module imports (scripts, data, images), as paths relative to `module.js`. The frame
  keeps them offline from the first visit, before the module is ever opened. A file left out is kept only once it has
  been loaded, so declare them all; `[]` when there is none.
- `lazy`: heavy files (a map library) that must not be preloaded: kept at their first use only.
- `net`: only when a library you use calls a public host by itself (map tiles): list the hosts (`host` or
  `host/path`), https only. Your own calls still go through `ctx.net`. The page's security policy lets these hosts
  in; any other direct call is blocked.

## 3. Declaring what the module reads and writes

`meta.reads` and `meta.writes` become the module's data adapter (the frame calls
`FrameData.adapter({ id, reads, writes })` for it).

- **`reads`**: path prefixes in the data repository. Give a policy only when it is not `document`:
  `{ prefix: 'sia/base/', policy: 'reference' }` for large read-only files. Read-only services such as aerodb declare
  their own prefixes; a module asks them, never their files.
- **`writes`**: the prefixes the module may write, each with the merge rule for files changed on two devices at once:
  - `record`: one record per file, the newest `updated_at` wins;
  - `journal`: append-only `{ entries }`;
  - `keyed:assignments:mission+pilot`: a list merged record by record;
  - or a function.
- A write outside these prefixes throws an error. That is on purpose: it is the module's contract.
- **Shared prefix**: several modules may declare the same prefix and all write there (`pilot/<trigram>/…`, shared by
  fuel and maps). Agree on the merge rule in both integration guides: the first declaration's rule applies.
- **`policy: 'cache'`**: files of this device only, never synchronised (last OFP, device settings). Use it instead of
  any IndexedDB or localStorage of your own.
- **Dates**: a record carries `updated_at` (ISO date), which decides a conflict; `updatedAt` is read when `updated_at`
  is missing (V2 files).

## 4. Reading

- `await data.get(path)` gives the value at once, from the device: parsed JSON, text, or null.
- `await data.read(path, { wait: true })` waits for the network only the first time a file is needed. Use it on a
  screen that cannot be shown without the file; otherwise call `get` and let `watch` bring the value.
- `await data.list(prefix)` gives the paths. **null** means "not known yet" (first launch offline), which is not the
  same as "empty".
- `await data.cached(prefix)` tells what is on the device, with no network: `[{ path, rev, bytes, at, policy }]`.
  `await data.evict(path)` drops the local copy of a `reference` file (or of a prefix ending with `/`) without
  sending anything; it is read again on demand. Use `remove` only to delete a file from the repository.
- Always design for the cached value first: the network may never come.

## 5. Writing

- `await data.put(path, value)` (JSON for a `.json` path) and `await data.remove(path)` are queued, never sent at once.
  Give records an `updated_at` (ISO date): it decides the winner of a conflict.
- Never write at every keystroke a file you would not want in a commit: the queue keeps only the last value of a path,
  but a pass may start at any time.

## 6. Reacting and the rest of the context

- **Times are in UTC with the suffix Z**, through `frame/lib/time.js`: `fmtZ`, `fmtDateZ`, and `fmtZLocal` (the local
  time in brackets) only for the departure, the planned arrival and the engine start.
- **The airline's settings** (`ctx.airline`) are read in the background at start: a module mounted before they
  arrive sees an empty object. Read `ctx.airline` when you draw, not once at `mount`, and redraw on `frame-airline`
  (on `window`) if what you show depends on it.
- **Dual view**: `ctx.layout.with` names the module shown beside yours (or `null`). Listen to `frame-layout` on
  `window` to follow it, and stop listening at `unmount`.
- **A render never changes the scroll, nor what is being typed.** A module that redraws (a re-read, a watched record,
  a filter) draws through `keepScroll(box, draw)` from `frame/lib/dom.js`:
  `import { keepScroll } from '../../frame/lib/dom.js'`. Give fields a `data-k` (and `data-i` in a list) so that the
  focused field is found again. Only a change of screen that the user asked for (the next step of a form) goes back to
  the top, outside `keepScroll`.
- `ctx.identity` (read only): `trigram`, `ivao`, `vatsim`, `simbrief` of this device; an empty object when not set.
  Never fail on its absence.
- `ctx.airline` (read only): `{ name, site, pages: { recordFlight, log, fleet } }` from the data repository
  (`airline/settings.json`), an empty object when not set. Never write an address of the airline in a module: take it
  from here, and hide the action when it is missing.
- **In a pane** (dual view, wide screen), your module gets `ctx.query.pane === '1'` and half the width. Draw for the
  width you are given. Never reach the other module: react to the shared records with `watch`.
- `ctx.live` (read): the actual position during a started flight, from the device's GPS or the pilot's IVAO / VATSIM
  session: `status`, `source`, `last` `{ at, lat, lon, altFt, gsKt, trackDeg, source }`. A module that wants the GPS
  offers a button that calls `ctx.live.enable()` (the permission needs a gesture). The frame writes
  `progress.actual` in the current flight; read it there with `watch`, never write it.
- `ctx.query`: what follows `?` in the address, as an object (`#report?from=flightlog` → `{ from: 'flightlog' }`).
  Another module or page opens yours with it.
- `ctx.net.fetch(url, init)` for any outgoing call (SimBrief, IVAO, VATSIM, the DEFA website). It never throws:
  - offline, it answers at once with a 503 carrying `x-sog-offline`;
  - with a launcher, SimBrief, IVAO, VATSIM and aviationweather.gov (METAR) are relayed by it, keys and CORS
    included, with the same signature;
  - without one, SimBrief and IVAO are called directly; aviationweather.gov (METAR / TAF) sends no CORS header, so it
    answers a 503 marked `x-sog-unreachable` at once;
  - weather without a launcher: the METAR from `metar.vatsim.net` (raw text, no key), the TAF from `avwx.rest`
    (decoded JSON). For avwx, never pass a key: the frame adds the device's own, and answers 503 without one (the
    table by site is in SPEC § 3.2);
  - the airline's website (`ctx.airline.site`, https) is read the same way, GET only: never send anything to it
    (any other method gets a 503); without a launcher, a direct read works only if the site allows it (CORS);
  - any other outside site gets a 503 carrying `x-sog-unreachable`.
  Never call `fetch` directly. Only string bodies are relayed.
- Offline is normal. The application starts offline once visited, and your module's files (entry point and
  `meta.files`) are kept from the first visit: draw from `ctx.data` first, and treat a 503 from `ctx.net` as "not now", not as an error.
- `ctx.notify(text, kind)`, `ctx.ask(text)`, `ctx.askText(text, { value })`: the frame's notifications and question
  windows.

- `data.watch(prefix, paths => …)`: called after a synchronisation, after a write in this tab or in another tab. Re-read
  what you show; do not assume who changed it.
- `data.onStatus(s => …)`: synchronisation state, for a module that shows it (the frame's own control usually does).
- Conflicts are handled by the frame: the loser is kept and the frame signals it. A module does not ask the user.

## 7. What a module must not do

- No `fetch` at all (use `ctx.net`), no `localStorage` or IndexedDB of its own (use the `cache` policy), no token
  handling, no global style sheet.
- No reading of `sia/base/` or `AircraftDB/`: use `adapter.aerodb` (frame/aerodb/INTEGRATION.md).
- No native dialog (`alert`, `confirm`, `prompt`).

## 8. Trying a module

Add the module to `APP.modules` in `frame/app.js` and open `frame/index.html` (served by the launcher, or by
`python frame/store/test/fake_github.py`, which serves the whole repository on port 8790). With no usage ticked on the
device screen (⚙), everything works on the device and nothing is sent. To try synchronisation, run
`python frame/store/test/fake_github.py` (standard library) and point the github transport at
`http://127.0.0.1:8790/api`, as `frame/store/test/index.html` does.

## 9. Tabs (the phone's bottom bar) and the fixed view

### 9.1 `APP.tabs`

On a phone (760 px or narrower) the frame draws a bottom tab bar instead of a menu; on a screen the left rail lists every
module as before. The bar is declared by the frame, in `frame/app.js`, next to `APP.modules`. **A module never writes
it**; it reads at most `ctx.tab`.

```js
APP.tabs = [
  { id: 'prepare',   label: ['Préparer', 'Prepare', 'Vorbereiten', 'Preparar'], icon: 'fuel', modules: ['fuel'],
    views: [{ id: 'sheets', module: 'fuel', query: 'view=sheets', label: ['Fiches', 'Sheets', 'Datenblätter', 'Fichas'], icon: 'file' }] },
  { id: 'maps',      label: ['Carte', 'Map', 'Karte', 'Mapa'],                  icon: 'map',  modules: ['maps'] },
  { id: 'report',    label: ['CR', 'Report', 'Bericht', 'Informe'],             icon: 'edit', modules: ['report'] },
  { id: 'flightlog', label: ['Vols', 'Flights', 'Flüge', 'Vuelos'],             icon: 'list', modules: ['flightlog'] },
  { id: 'weather',   label: ['Météo', 'Weather', 'Wetter', 'Meteo'],            icon: 'cloud', modules: ['atmosphere'] }
];
```

**Settings is not in the bar** (§ 7.1 rule 14, 24 Oct 2026, 22:15): it is the ⚙ of the header, which also carries the
state badge (§ 10). The bar is Préparer · Carte · CR · Vols · Météo. The `screen` key (a tab that opens a frame screen)
stays supported by the code but no tab uses it today.

- **`id`**: the tab. **`label`**: one word, four languages. **`icon`**: a name of `frame/lib/icons.js` that has a filled
  variant (`svg(name, { filled: true })`; today fuel, map, edit, list, cloud, settings).
- **`modules`** (a group) or **`screen`** (a frame screen, `settings`): a tab is one or the other.
- **`views`** (optional, with `modules`): views of a module of the group, each `{ id, module, query, label, icon }`
  (`query` is the address's query: `view=sheets` gives `#fuel?view=sheets`). A view has **no tab of its own**, only a row
  in the group popover, after its module's row. This is how the performance sheets are reached from Préparer: they are a view of
  the fuel module (its Quote / Sheets switch), not a module.
- **A tab is a group of modules.** It stays selected while any module of its group is shown. Touched, it opens the last
  module of the group shown in this session, otherwise the first one visible at the device's level.
- **A module id that is not registered in `APP.modules` is skipped without a word** (`atmosphere` until its module is
  added; a tab whose modules are all absent or hidden by the level disappears from the bar). The code works with the
  module registered or not.
- **A module in no tab** (`website`, `hello`) selects no tab and stays reachable by its address (`#website`) and in the
  rail on a screen.
- **Group popover (no row of sub-tabs)**: when the group has two or more rows (modules registered at the device's level, and
  their `views`), a **second touch on its active tab** opens a small popover above the tab (`.f-tabpop`; one 44 px row per
  module or view, its icon and the verb of `APP.modules[].label` or of the view, the current one `aria-current="page"`; a
  view row carries `data-view`). Préparer thus lists **Carburant · Fiches**. A touch on a row switches (`#fuel`,
  `#fuel?view=sheets`); a touch elsewhere, Escape, a scroll, a resize or a change of address closes it. The current row is
  read from the address (a module that changes view by a button of its own without writing it in the address, as Fuel's
  Quote / Sheets switch, is not followed). The tab has `aria-haspopup` (and `aria-expanded` while open). On a tab with a
  single row (Carte, CR, Vols, Météo) the second touch does nothing. **There is no
  row of sub-tabs above a module** (it used to take 56 px and a margin above a fixed module's map, 24 Oct 2026): a module
  must not draw a row of its own to reach its siblings; its internal tabs (Fuel's Plan / Sheets) stay its own. Nothing
  about it reaches a module: `ctx.tab` is all it knows. On a screen the rail lists the modules.
- **`ctx.tab`**: the id of the tab that groups the module (`'prepare'` for fuel, `'weather'` for atmosphere), `null` if none. For a
  module that wants to know its group; it never opens or changes a tab.
- **Landscape on a phone (`html.f-land`)**: when the window is wider than high **and** under 1024 px (a phone or a small
  tablet turned; Safari does not honour the manifest's portrait lock), the frame sets `<html class="f-land">` (and
  removes it, one write when the value changes, on `resize` / `orientationchange`; `frame-orientation` is fired on
  `window` after, `detail: { land }`). The bottom bar then becomes a **rail of icons at the left edge**: `--f-rail-w`
  (44 px) wide, full height under the header, the same five entries, **no label** (each `<a>` carries the label as
  `aria-label` and `title`), the same popover on a second touch, opened **to the right of the rail** (first row facing the
  icon, the caret at the left). The header stays (57 px); `--f-tab-space` is `0` and the view takes `100vw − --f-rail-w` at
  the right of the rail; the 210 px rail of a screen is not shown. The device's safe areas (notch at the left or right,
  home indicator) are left free. A module does nothing for it: it never reads the class, it measures its box.

### 9.2 `meta.fixed`: the fixed, full-height view

A module that is a map plus a sheet (maps) declares `fixed: true` in `meta`. The frame then puts `class="f-fixed"` on
`<html>` while the module is shown (and takes it off for another module or a frame screen opened over it):

- the page does not scroll: `html, body { height: 100%; overflow: hidden }`, the body is `100dvh` high, a grid
  `header / view / bar`; the header stays at the top, the view takes all the rest, between the header and the bar (phone)
  or down to the bottom of the window (screen), **with no padding** (the module draws its own margins);
- the module's root (`section.f-module`, the `el` of `mount`) is `height: 100%; min-height: 0; display: flex;
  flex-direction: column`, so a map can take `flex: 1 1 0; min-height: 0` and a sheet a fixed height with
  `overflow: auto` under it. **This rule has no weight** (`:where()`): a module that wants another layout sets its own
  `display` on its root (`[data-module="maps"] { display: grid }`) and wins with no `!important`; a module that sets
  none keeps the column;
- no folded help panel and no welcome card above it (the "?" of the header opens the module's chapter, on a phone as on a
  screen, so a fixed module needs no help button of its own);
- **nothing between the header and the module**: no sub-tabs row, no padding, no margin; the module's top is exactly
  `--f-head-h` (the module draws its own margins);
- nothing else changes: `fixed` absent is today's page.

What the module writes (its own sheet, scoped to `[data-module="<id>"]`):

```css
[data-module="demo"] .map   { flex: 1 1 0; min-height: 0; }          /* the map takes what the sheet leaves */
[data-module="demo"] .sheet { flex: none; height: 34%; overflow: auto; } /* the data block scrolls inside */
```

`modules/hello` is not changed (it stays the plain example); to try `fixed`, copy it to a scratch module whose `meta` has
`fixed: true`, or intercept `modules/hello/module.js` as the frame agent's test did (`frame/DECISIONS.md`, 24 Oct 2026).

**Heights the frame gives** (CSS variables of `:root` in `frame/frame.css`; a module never copies their numbers):

| Variable | What it is | Value |
| --- | --- | --- |
| `--f-head-h` | the header, one row at every width and state | `57px` |
| `--f-vh` | the window's height | `100dvh` (`100vh` where `dvh` is unknown) |
| `--f-view-h` | the height a fixed module may fill | `--f-vh` − `--f-head-h` (− `--f-tab-space`, the bar, on a phone) |
| `--f-split-h` | the main module of a dual view (`#maps?with=fuel`) | `--f-vh` − `--f-head-h` − 2 × 16 px (the view's margins) |
| `--f-pane-h` | the module in the pane (`#fuel?with=maps`) | the pane (`--f-vh` − `--f-head-h` − 29 px) − its 44 px close bar |

`--f-view-h` is **context-aware**: on `.f-view.f-split` it equals `--f-split-h`, inside `.f-pane` it equals `--f-pane-h`.
`height: var(--f-view-h)` is therefore right in the plain fixed view, in the split main and in the pane.

- **The frame already applies them to a module that declares `meta.fixed`**: in the split main (`html.f-fixed .f-view.f-split >
  .f-module`) the root is `--f-split-h` high; in the pane the frame marks the module's root `data-fixed` and
  `.f-pane > .f-module[data-fixed]` makes it `--f-pane-h` high (a flex column, like the plain fixed view). So the pane
  and split cases need no height of the module's own: a module that copied `100dvh − 86 px − 44 px` or `100dvh − 57 px − 32 px`
  can drop both. Its own `height` or `display` still wins (the rules have no weight).
- A module that is not `fixed` gets nothing: its pane has the natural height of its content (the pane scrolls beyond
  `--f-pane-max-h`).
- **A fixed module may import the sheet primitive** (`import { createSheet } from '../../frame/lib/sheet.js'`, § 11): the
  three-position block under the map, with its heights from `--f-sheet-*` as parts of the module's root, so it follows
  `--f-view-h` in the plain view, the split main and the pane with nothing of its own.
- The header is exactly `--f-head-h` in every state, so these numbers hold after Settings, help or a module's "←".
- **Landscape on a phone (`html.f-land`)**: nothing to change in a module. The window is wider than high, so `--f-view-h`
  is `--f-vh` − `--f-head-h` (`--f-tab-space` is `0`: the bar became a left rail, § 9.1), i.e. 333 px on a 390 px high
  window, and the view starts at `--f-rail-w`; `--f-split-h` and `--f-pane-h` are unchanged (split view and pane exist from
  980 px only). A module that uses the sheet primitive (§ 11) gets a **row**: its map (the child that grows) at the left, the
  sheet as a column at the right, both at the height of the view.

### 9.3 Overlay layer (`ctx.overlay`): the buttons over the map

The only controls allowed between the header and the data block of a fixed module are **buttons laid over its map**
(user, 24 Oct 2026, 14:00 and 14:05; `docs/technique/V3_SPECIFICATION.md` § 7.1). No toolbar line, no info line, no
row of tabs above the map. The frame gives every fixed module a layer for them; the module puts its buttons in it and
draws nothing of its own for placement.

```js
// in mount(el, ctx) of a module with meta.fixed
const ov = ctx.overlay;                       // null for a module that is not fixed
ov.button({ icon: 'edit',   label: ctx.t(TX.edit),    onClick: toggleEdit, pressed: false });    // right column (default)
ov.button({ icon: 'target', label: ctx.t(TX.recentre), onClick: recentre });
ov.button({ icon: 'layers', label: ctx.t(TX.layers),  onClick: openLayers, side: 'left' });       // left column
ov.right.append(myOwnElement);                // anything else: a chip, a select (give it .f-ov-btn to get the look)
ov.over(mapEl);                               // optional: the element to cover (see below)
```

**What the module provides**: for each control, an `icon` (a name of `frame/lib/icons.js`) and a `label` (four languages,
through `ctx.t`): the label becomes the button's `title` **and** `aria-label` (icon only, no visible text), `onClick`,
and `pressed` when it is a toggle (written as `aria-pressed`; the module keeps it up to date with
`btn.setAttribute('aria-pressed', …)` and swaps the icon with `btn.innerHTML = svg(name)` or text with
`btn.title` / `aria-label`). `button()` returns the `<button class="f-ov-btn">`. A module that already draws its own button
adds the class `f-ov-btn` to it and appends it to `ov.left` or `ov.right`.

**What the frame does**:

- `ctx.overlay` = `{ left, right, button(opts), over(el), refresh(), full }`: `left` and `right` are the two column elements
  (flex columns, 8 px gaps, 8 px from the edges). The layer (`.f-overlay`) is a sibling of the module's root in the view,
  not a child: a module that rewrites `el.innerHTML` never wipes it. It is removed with the module.
- **Placement**: the layer is laid, in pixels, exactly over the module's map area: by default the first child of its root
  that grows (`flex-grow > 0`, at least 40 px high), otherwise the first visible one; `ov.over(el)` names the element
  instead. It follows that element's size (the sheet moving, the window resizing, the full screen) and the root's children
  (a map added after `mount`); it is hidden while no element qualifies. **The layer is the map's size, so a column never
  overlaps the sheet**; if the right column is taller than a low map it wraps to a second column on its left.
- **`.f-ov-btn`** (`frame/design/primitives.css`): 44 px visible round button (a square in a design with `--sog-radius: 0`),
  the hit area reaches 48 px (the 2 px around it), `--sog-surface` at 92 %, a hairline, a light shadow, `aria-pressed="true"`
  tinted with the accent; the icon is 22 px. Its rules weigh three classes: the designs' button rules do not reach it.
  The layer lets map gestures through; only the buttons take touches.
- **`hidden` is respected**: `.f-overlay button.f-ov-btn[hidden] { display: none }` (`primitives.css`) weighs more than the
  button's `display: inline-flex`, so a module shows and hides a button with `btn.hidden = …`, no rule of its own. Icons a
  module may need beyond the menu's: `cloud`, `undo`, `move4` (four directions; `move` is the vertical double arrow) in `frame/lib/icons.js`.
- **Full-screen button**: the frame appends it itself to the **right** column of every fixed module (not in a pane), and
  keeps it the last one visually (`order`) and in the keyboard order (`button()` inserts before it): § 9.4. A module neither
  draws nor handles it. `ov.full` is `true` while the page is in full screen.
- A module in a **pane** gets the layer too (a pane is a fixed module in a smaller place), without the full-screen button.

What a module keeps: what the buttons do, their icons and labels in four languages, where its map element is (`over`) when
it is not the first growing child, and what its controls become in a very low map (nothing: the frame wraps them).

**Landscape on a phone (`html.f-land`)**: the layer is still exactly the map's box, which is now the whole height of the view
(333 px on a 390 px high window) at the left of the sheet's column. The two columns stay on the map (left: Layers; right: the
module's buttons, the full-screen button last) and **do not double up at this height**: the gap between buttons goes from 8
to 4 px before the column wraps, so **six** 44 px buttons fit in 333 px and a seventh wraps to a second column (Edit mode of
maps shows seven). Nothing to write in a module.

**Moving a module over** (maps, atmosphere; each in its own lot): the toolbar line, the information line and the title row
of the data block leave the column; Edit, Recentre, the mode and Load become `ov.button()`s (right), Layers goes `side: 'left'`,
the flight selector goes inside the Layers panel, the flight summary becomes the sheet's grip text, the Profile · Weather
choice two small icon chips at the right of the grip row (V3_SPECIFICATION § 7.1). A module that still draws a toolbar line
keeps working: the layer then covers its map and the frame's button sits at the right of the map.

### 9.4 Full screen (`html.f-full`)

The full-screen button of § 9.3 toggles `<html class="f-fixed f-full">`:

- **Phone**: the header and the bottom bar are hidden; the view takes the whole window. **Screen**: the header is hidden and
  **so is the rail** (judgement call: not folded to icons, so the map takes all the width); the view takes the whole window.
- **Heights**: `--f-head-h` and `--f-tab-space` are `0px`, so `--f-view-h` = `--f-vh` (less the device's safe areas, which
  the view leaves free: `env(safe-area-inset-top / bottom)`). A module whose root is `height: 100%` or `var(--f-view-h)` follows
  with nothing of its own.
- **Leaving**: the full-screen button itself (now showing `minimize`, label "Quitter le plein écran" / "Exit full screen" /
  "Vollbild beenden" / "Salir de pantalla completa", `aria-pressed="true"`); Escape. **There is no exit chip** (removed on 24 Oct
  2026: it duplicated the column's button since the modules' toolbars left, `frame/DECISIONS.md`); the right column
  starts at the top of the map.
- **Memory**: for the page's life (also while a frame screen is opened over the module, where the header comes back, and
  on closing it the module is full screen again); reset at a module change. Not the browser's Fullscreen API (absent from
  Safari on iPhone): the page itself fills the window.
- **What a module must do**: nothing but follow the size. After every change the frame fires `frame-fullscreen`
  (`detail: { on }`) and then a plain **`resize` event on `window`** (next animation frame), so a map calls `map.resize()` as
  it already does on a window resize; a `ResizeObserver` on the map box works as well. Pointer events, the sheet and the
  overlay buttons keep working; the page never scrolls.
- **Landscape on a phone (`html.f-land`)**: full screen hides the header **and the rail**; **the sheet's column stays** (full
  height, at the right) and the map takes everything else, from `0 / 0` (less the safe areas). Same button, same Escape, same
  `frame-fullscreen` and `resize`.

## 10. What the frame reads from modules' caches

The frame never calls a module; it only reads **cache records** a module publishes (policy `cache`: this device only,
never synchronised), through the data layer, as it reads the current flight. A module that publishes one declares the
prefix in its `meta.writes` with `policy: 'cache'`.

The lines of the **status block** (§ 10.2) and the badge of the ⚙ come from these records, from the sync state and from
`ctx.aerodb.state()`. The "i" button and its pop-up of 24 Oct 2026 (afternoon) no longer exist (rule 14).

### 10.1 `cache/flightlog/pending.json` (written by flightlog, read for the status block)

```json
{ "schema": 2, "updated_at": "2026-10-24T10:00:00Z",
  "flights": [ {
    "date": "2026-10-23", "dep": "LFRS", "arr": "LFML", "registration": "F-ZBMC", "source": "website",
    "handoff": { "family": "AIRBORNE",
      "values": { "metadata.date": "2026-10-23", "aircraft.0.callsign": "…", "aircraft.0.type": "…",
        "aircraft.0.registration": "F-ZBMC", "navigation.dep": "LFRS", "navigation.arr": "LFML" } } } ] }
```

- One entry per flight **a report is still to be written for** (flightlog's own logic: reports saved, website log, network
  sessions; the frame does not duplicate it). `source`: `website`, `ivao` or `vatsim`. Absent file, no `flights` or an empty
  list: no line, no badge.
- Required per entry: `date` (`YYYY-MM-DD`, UTC), `dep`, `arr`. `registration` and `source` are informative. Entries
  without a valid date, `dep` or `arr` are ignored; at most 50 are read.
- **`handoff`** (schema 2) is what flightlog would hand to report for that flight: `{ family, values }` (`values`: mission
  paths as in `modules/flightlog/SPEC.md` § 5). A schema 1 entry has none.
- **What a touch on the line does.** With a `handoff`, the frame writes `pilot/handoff.json` (policy `cache`, the same
  record and policy as flightlog's own hand-over) through its data adapter:
  `{ to: 'report', from: 'flightlog', source: <"My flights" in the device's language>, at: <ISO now>, fresh: true, family,
  values }`, then opens `#report?from=flightlog` (report takes the hand-over at its mount, as for flightlog's own
  "Write the report", and the header shows "← My flights"). Without `handoff`, it opens `#flightlog`. `to: 'report'` is
  required by report (`takeHandoff`), whatever the brief of the day says.
- The frame redraws the badge and the status block when the record changes (`watch` on `cache/flightlog/`).
- The writer republishes the whole file when its list changes (`updated_at`); an empty `flights` when nothing is left.

### 10.2 The status block (top of Settings) and the badge of the ⚙

Rule 14 of § 7.1 replaced the header's "i" button and its pop-up. The same lines are now the **"Status" card that opens
the Settings screen**, and the badge sits on the **⚙ of the header** (`#fDevice`). The header of a phone is the name (or
"←"), "?" (`#fHelp`: the help chapter of the current screen, the Settings chapter when Settings are open) and ⚙; on a
screen `#fSync` and the rest stay as they were, without the "i".

- **Who draws it**: the frame, which has the state (`statusBlock()` in `frame/app.js`); `frame/settings/settings.js` places
  the card first (`ctx.status.html()`), then hands it back (`ctx.status.bind(card)`), after which the frame rewrites it
  when the state changes (one write, only if the content changed: a short signature in `data-sig`) until the card leaves the
  page. A module never draws it and has no part in it.
- **Lines** (`li[data-k]`, a `button.f-status-row[data-go]` when the line leads somewhere), in this order, each only when it
  applies: `flight` (flight started › Map, green), `report` (one per flight to report, "Report to write for the flight of
  <date> <dep>→<arr>", green; the touch writes `pilot/handoff.json` and opens `#report?from=flightlog`, or `#flightlog`
  without `handoff`), `who` (trigram not set, amber; leads to the Identity card), `base` (the three states of the
  aeronautical base, see below; leads to the Access card), `data` (synchronised n min ago · pending writes, or conflicts
  `#conflicts`, error, "on this device, nothing to synchronise"; amber for pending / offline / conflicts / error; leads to
  the Synchronisation card, else Usages), `launcher` (launcher host · sync state; Access card), `offline` (amber), `live` (the
  real position and the GPS switch, **phone only**: a screen keeps its header button). The "Help for this screen" line is gone:
  the "?" of the header is that.
- **Badge** (`#fDevice[data-badge]` green: something new, flight started or report to write, on every width;
  `[data-attn]` amber, **phone only**: trigram, pending writes, conflicts, sync error, offline, base; amber wins). The
  button's `title` / `aria-label` add "something to see" while either shows. The data line and "offline" are a state, not a
  news item: they never turn the badge green. The rules are those of the old "i".
- **Base line** (read from `ctx.aerodb.state()`, not from a module's record): once the base has been asked for, one line says
  its state when it is not ready: "Aeronautical database loading…" (no button), "Data access not set on this device" or
  "Aeronautical database not published in the data repository". It follows aerodb's `state` event (a read starts or ends,
  the access changes); nothing is polled.

## 11. Sheet primitive (`frame/lib/sheet.js`)

A fixed module (§ 9.2) that is a map plus a block under it (maps, atmosphere) gets the block from the frame: **the
three-position sheet**. It is collapsed (its header line only), default or expanded; its header line is the handle. The
frame owns the code (`frame/lib/sheet.js`, pure of module state, no text of its own) and the look (`frame/design/primitives.css`,
neutral: `--sog-surface`, a hairline on top, a grip bar). The sheet **never knows what it contains**: the module draws the
title, the toggles, the ✕ and the content, and passes the texts.

```js
import { createSheet } from '../../frame/lib/sheet.js';

const sheet = createSheet({
  root, panel, head, grip,          // the four elements (below)
  pos: 'default',                   // 'collapsed' | 'default' | 'expanded' (a rank 0, 1, 2 is accepted too)
  ignore: '[data-close], .my-seg',  // what, inside `head`, must not drag or tap
  labels: (pos, i) => `${t('Height')} (${t(NAMES[i])})`,
  locked: () => editing,            // true: the pointer gestures are refused
  onChange: pos => keep = pos,
  onSettle: pos => map.resize()     // 120 ms after the last change
});
// -> { pos, set(pos, instant), settle(), stop() }
```

### The HTML the module provides

```html
<section class="f-module f-sheet" data-module="demo">            <!-- root: the module's root, a flex column -->
  <div class="map"></div>                                       <!-- flex: 1 1 0; min-height: 0 -->
  <div class="f-sheet-panel">                                   <!-- panel: sized by the primitive; direct child of root -->
    <div class="f-sheet-head">                                  <!-- head: the 44 px line, the drag handle -->
      <button type="button" class="f-sheet-grip"><b class="f-sheet-title">Title</b></button>
      <button type="button" class="f-sheet-close" data-close aria-label="Close">✕</button>   <!-- optional -->
    </div>
    <div class="f-sheet-body"> … the content … </div>           <!-- scrolls inside; the page never does -->
  </div>
</section>
```

- `root` carries the class `f-sheet` (the module adds it to the element it was given, `el.classList.add('f-sheet')`). The
  primitive writes `data-sheet="collapsed|default|expanded"` on it and reads the `--f-sheet-*` tokens from it. Its height is
  what the percentages are parts of (its content height, padding taken out): in a fixed view it is `--f-view-h` (§ 9.2),
  so the sheet needs no height of its own in the plain view, the split main or the pane.
- `panel` (`.f-sheet-panel`) is a **direct child** of `root` (`.f-sheet > .f-sheet-panel`): the element whose height the
  primitive sets. It is a flex column with `overflow: hidden`; the header is its first child, whatever else follows it.
- `head` (`.f-sheet-head`, 44 px; 28 px with the bare handle, below) receives the drag (pointer events on it only, `touch-action: none` there: the map keeps all
  its gestures). `grip` (`.f-sheet-grip`) is the handle button inside it: it takes all the width the header's other controls
  leave, shows the grip bar (a `::before`, nothing to draw) and holds the title (`.f-sheet-title`: one line, ellipsed).
  The grip is a `<button>`; a `<div>` works too (the primitive gives it `role="button"` and `tabindex="0"` and handles
  Enter and Space itself).
- `.f-sheet-close` is the 44 × 44 ✕ of a content; anything else in the header (a Profile · Weather toggle) is the module's own
  and goes in `ignore`. Hide a control with `hidden` (`.f-sheet-head [hidden]` is `display: none`).
- `.f-sheet-body` is the scrolling area (`flex: 1 1 0; min-height: 0; overflow: auto; overscroll-behavior: contain`). A module
  that draws something else (a chart that sizes itself) gives it its own `overflow`; a rule of two classes or more wins.
- **Collapsed**, every child of the panel but the header is `display: none` (neither seen nor reached by the keyboard).

### Options and what the primitive does

| Option | Meaning |
| --- | --- |
| `root`, `panel`, `head`, `grip` | the four elements above |
| `pos` | the starting position; **the module keeps the position between two mounts** (`onChange` gives it, `pos` takes it back): the primitive keeps no state of its own |
| `ignore` | selector of what, inside `head`, does not drag or tap (a toggle, the ✕) |
| `labels` | the grip's text by position, `(pos, rank) => string` or `{ collapsed, default, expanded }`; it becomes the grip's `title` and `aria-label`. Without it the grip keeps its own. The texts are the caller's (four languages) |
| `locked` | `() => true` refuses the pointer gestures (drag, tap), for instance in an Edit mode that moves things on the map; the keyboard stays |
| `onChange(pos)` | at every step: a `set()`, the end of a drag, a tap, a key (and once at the start with `pos`) |
| `onSettle(pos)` | 120 ms after the last change of position or size (end of the height transition, end of a drag): the map re-frames there. Not called for the starting placement |

- **Gestures.** A pointer down on the header (button 0, not on an `ignore`d control, not `locked`) captures the pointer. Past
  6 px of travel it is a drag: the panel follows the finger live (transitions cut by the class `f-sheet-nt`), between the
  collapsed and the expanded height. Released, it snaps to the nearest position, or to the next one in the direction of a
  **flick** (faster than 0.8 px/ms). A **tap** on the grip collapses the sheet, or brings it back to default from collapsed
  or expanded: **a tap never expands.**
- **Keyboard** (on the grip): Enter and Space toggle like a tap, Up / Down go one position, Home collapses, End expands.
  The arrows do not scroll the page.
- **ARIA**: `aria-expanded` (false only when collapsed) and `aria-label` from `labels`; `role="button"` and `tabindex` when
  the grip is not a `<button>`. Written only when they change.
- **`set(pos, instant)`**: moves the sheet (a name or a rank); `instant` cuts the transition for that change (the content is
  about to be measured; the height is up to date when it returns). **`settle()`** restarts the 120 ms: call it when the
  view's size changed by other means (a `ResizeObserver` on the map box). **`stop()`** removes the listeners and the timer
  (call it from `unmount`). `pos` is the current position name.

### The CSS it gets (`frame/design/primitives.css`)

Tokens, defined on `.f-sheet` with **no weight** (`:where`): the module overrides them on its root (`[data-module="demo"] {
--f-sheet-default: 50% }`) with no `!important`. Each value is `<n>%` (a part of the root's height) or `<n>px`; the script
reads nothing else (no `calc()`).

| Token | Default | |
| --- | --- | --- |
| `--f-sheet-head` | `45px` | the collapsed height: the header (44 px, `--sog-touch`) and the hairline |
| `--f-sheet-head-bare` | `28px` | the bare handle's line (below); collapsed, the panel is this and the hairline (29 px) |
| `--f-sheet-default` | `30%` (`35%` from 761 px) | the default height |
| `--f-sheet-default-min` | `170px` | its floor |
| `--f-sheet-expanded` | `70%` | the expanded height |
| `--f-sheet-expanded-min` | `260px` | its floor |
| `--f-sheet-side` | `40%` | landscape on a phone (`html.f-land`): the column's default width, a part of the root's width |
| `--f-sheet-side-min` | `280px` | its floor |
| `--f-sheet-side-max` | `60%` | the expanded column's width (with the same floor) |

- Heights: collapsed `--f-sheet-head`; default `max(--f-sheet-default, --f-sheet-default-min)`; expanded
  `max(--f-sheet-expanded, --f-sheet-expanded-min)`; a 200 ms height transition (none under `prefers-reduced-motion`
  nor during a drag or `instant`).
- Look: `--sog-surface`, a 1 px `--sog-border` top line, `--sog-radius` top corners, a soft upward shadow, the grip bar
  36 × 4 px (`--sog-muted` at 55 %), a header at 44 px with the title at `.92em`. Nothing is hard-coded to a design.
- The grip and the ✕ are buttons: their rules weigh three classes so that the designs' button rules (`[data-design] :is(button,
  .f-btn)`) do not reach them.

### The bare handle (`.f-sheet-head-bare`): a drawing needs no title

When the sheet shows **a drawing that describes itself** (the vertical profile, the weather cut: its axes and legend say what
it is), a title line above it only repeats and takes vertical space (V3_SPECIFICATION § 7.1 rule 13 b). The module asks for
the **bare handle** with one class on the header, from the code that builds or changes the header:

```js
head.classList.toggle('f-sheet-head-bare', content === 'drawing');   // true for a drawing; false for a list or a form
```

No option on `createSheet` and no call to the primitive: the class is the whole request, and it can change at any time (the
header changes with the content). What it does (`frame/design/primitives.css`):

- **One line of `--f-sheet-head-bare` (28 px)** instead of 44: the grip bar at the top, **no title** (`.f-sheet-title` is
  `display: none`; the grip's `aria-label` and tooltip still come from `labels`), and the header's buttons (the segments or
  chips, ◀ ▶, `.f-sheet-close`) **on the same line at the right**. The grip takes the space they leave, so the bar is centred in
  it and never touches a button.
- **Buttons**: 28 px high on screen (`button:not(.f-sheet-grip)` inside the bare header gets `height: 28px`, `min-height: 0`,
  `min-width: 28px`, which outweighs a design's 44 px button rule), and a **touch zone of 44 px** by an `::after` centred on
  the button (at least 32 px wide), as `.f-ov-btn` does. The header's 4 px gap keeps neighbouring zones side by side. The top of
  the zone is clipped by the sheet's edge; its bottom bites 8 px into the body, so keep nothing that must be tapped in the first
  8 px of the body. A module's own button rule must not set a height (`!important` apart, the frame's wins by weight).
- **Same gestures**: drag, tap (default ⇄ collapsed), flick, keyboard, `ignore`, `locked`; nothing changes in `createSheet`
  nor in `labels(pos, rank)` and the positions.
- **Heights follow the real header.** Collapsed, the panel is `--f-sheet-head-bare` + the 1 px hairline = 29 px (the CSS
  rule `.f-sheet[data-sheet="collapsed"] > .f-sheet-panel:has(> .f-sheet-head-bare)`); the primitive **measures** the header
  (its box plus the panel's top border) for the drag's floor and the nearest-position choice, so a drag down stops at the line
  that is actually there, bare or not. Default and expanded heights are the panel's and do not change: the body gains the 16 px.
- **Landscape** (`html.f-land`): the bare line stays at the **top of the column**, 28 px, no title, buttons at the right;
  the chevron that shows the way to widen moves to the end of the grip area, next to the buttons.

**When**: above a drawing (cut, profile, chart), where the drawing and its axes say what is shown. **Never above a list**
(layers, details, flight, aerodrome contents): a list needs its title, and a title stays for any content that does not
describe itself. A module that mixes both (maps: Profile · Weather bare, Layers titled) toggles the class when the content
changes; if the map must re-frame, call `sheet.settle()` (the transition of a collapsed sheet is followed by `onSettle` by
itself). Test bench: `frame/lib/test/sheet.html` (the "nue" and "paysage nue" checks).

### Landscape on a phone (`html.f-land`): the sheet is a column

Under `<html class="f-land">` (§ 9.1: wider than high and under 1024 px) the sheet is no longer under the map: the root
becomes a **row**, the map (the child that grows) takes the width the sheet leaves, **full height**, and the panel is a
**column at the right**, as high as the view, its header line (the grip) at the top as the column's title row, the body
scrolling inside. **Two positions**: `default` (`--f-sheet-side`, 40 % of the root's width, never under
`--f-sheet-side-min`, 280 px) and `expanded` (`--f-sheet-side-max`, 60 %); there is **no collapsed position** (a
`set('collapsed')`, the Home key, a sheet that was collapsed in portrait when the phone turns: all give `default`). The
module changes nothing: `onChange` and `onSettle` give the same names (`default`, `expanded`), `labels(pos, rank)` the same
ranks, `pos` and `set()` the same. It measures its boxes as before (`ResizeObserver`, `resize`).

- **Tap** on the grip toggles `default` ⇄ `expanded` (in portrait it toggles `default` ⇄ `collapsed`, never expanding); a
  chevron at the end of the title row shows the way (to the left: widen). A **horizontal drag** is accepted (the column follows
  the finger between the two widths, snaps to the nearest, a flick goes to the next); it is not required. Keyboard on the
  grip: Left or Up = `expanded`, Right or Down = `default`, End = `expanded`, Home = `default`, Enter / Space toggle.
- **Turning the phone**: the frame fires `frame-orientation` on `window` after setting or removing `f-land`; the primitive
  listens and places the sheet again in its new form without a transition (`onChange` is called with the position it has now).
- **Tokens** (on `.f-sheet`, `:where`, a module overrides them on its root): `--f-sheet-side: 40%`, `--f-sheet-side-min:
  280px`, `--f-sheet-side-max: 60%` (parts of the root's width, or px, like the others). The other tokens are not read in
  landscape. The panel gets a 1 px line at its left (no top line, a shadow to the left); the transition is on `width`.
- **For maps and atmosphere** (read-only here, they ask for nothing): the root, the map and the panel keep their own rules; the
  frame's `html.f-land .f-sheet` rules (a flex row, `min-width: 0` on the children, the panel's width and `height: auto`) weigh
  more than the `[data-module]` rules of a module that sets `display: flex; flex-direction: column` on its root, so those
  rules need no change. What a module must not do: give its map or its panel a fixed height or a `%` height of its own (use
  `flex`), or assume the sheet is under the map (read the rect of the map and of the panel).

### What a module still owns

The content and the header's texts (title, toggles, ✕ shown or hidden), the position kept between mounts, what follows a size
change (`onSettle`), and the lock. The first user is `modules/maps` (the data sheet: profile, weather cross-section,
airspaces, aerodrome content, behind `openData`, `modules/maps/INTEGRATION.md` § 6).

### Moving from a module's own copy

A module's former copy of maps' sheet block (atmosphere had one until 24 Oct 2026; both now import the primitive) maps one to one: `data` → `panel`; the `--<prefix>-head`,
`-p1`, `-p2`, `-m1`, `-m2` tokens → `--f-sheet-head` (44 + 1 px), `-default` / `-default-min`, `-expanded` / `-expanded-min` (the
frame's defaults are those numbers: delete the module's tokens); `title(pos)` (the grip's tooltip) → `labels(pos, rank)`; `skip` →
`ignore`; `prefix` and the `<prefix>-nt` class → `f-sheet-nt` (the primitive's); `data-sheet="0|1|2"` → `"collapsed|default|expanded"`;
the grip bar element → nothing (a `::before`); positions are names, not 0, 1, 2; the starting position is the caller's
(`pos`, with `onChange` to keep it); the initial `set(pos, true)` and `gestures()` calls disappear (done by `createSheet`).

## 12. Shared geometry (`frame/lib/geo.js`)

Longitudes around the date line (the antimeridian, ±180°). A flight from Siberia to Alaska (UHMA 177.7° E → PAOM 165.4° W)
goes from 177.7° to −165.4°; for an interpolation, a bounding box or a drawing it goes from 177.7° to 194.6°. Three pure
functions, no state, no text:

```js
import { wrapLon, nearLon, unwrapLons } from '../../frame/lib/geo.js';
```

| Function | Does |
| --- | --- |
| `wrapLon(lon)` | the longitude in `[-180, 180[` (195 → −165; 180 → −180) |
| `nearLon(lon, ref)` | the copy of `lon` (± whole turns) within 180° of `ref`: a datum at −170° drawn on a map centred on 190°, or compared with a point at 185° |
| `unwrapLons(points)` | a route with continuous longitudes: each point takes the copy nearest the previous one. Accepts `{ lat, lon }` (other fields kept) and `[lon, lat]` pairs; a point already continuous is returned as is (same object), so an ordinary route is unchanged |

The rule for a module: **unwrap the route first** (`unwrapLons`), before any distance, interpolation, bounding box or
drawing; **wrap at the door** (`wrapLon`) every longitude it hands to a service, a cache or a store (Open-Meteo, aerodb, the
weather store's cells, a file written for another module): none of them ever sees a value outside `[-180, 180[`; **compare
modulo 360** (`nearLon`) a longitude that comes from elsewhere (a tap on the map, an airspace polygon, an aerodrome) with a
route that may run past 180°. MapLibre accepts longitudes outside `[-180, 180]` (centre, bounds, `project`), with world
copies on. Distances by the haversine formula are already periodic and need nothing. The poles are out of scope.

`modules/atmosphere/atmo.js` has the same three functions (its own copy, kept identical so that the weather cache cells are the same);
the module switches to this helper in its next lot. Bench: `frame/lib/test/geo.html`. A module that loads it from another
folder lists it in its `meta.files` (`'../../frame/lib/geo.js?v=0'`).
