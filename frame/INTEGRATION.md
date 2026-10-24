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
  `ask`, `askText`, `net`, `identity`.
- Its verb in the application's rail (and its sub-tab, § 9) is set in `frame/app.js` (`APP.modules`): one short verb, seven
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
  { id: 'prepare',   label: ['Préparer', 'Prepare', 'Vorbereiten', 'Preparar'], icon: 'fuel',
    modules: ['fuel', 'atmosphere'] },
  { id: 'maps',      label: ['Carte', 'Map', 'Karte', 'Mapa'],                  icon: 'map',  modules: ['maps'] },
  { id: 'report',    label: ['CR', 'Report', 'Bericht', 'Informe'],             icon: 'edit', modules: ['report'] },
  { id: 'flightlog', label: ['Vols', 'Flights', 'Flüge', 'Vuelos'],             icon: 'list', modules: ['flightlog'] },
  { id: 'settings',  label: ['Réglages', 'Settings', 'Einstellungen', 'Ajustes'], icon: 'settings', screen: 'settings' }
];
```

- **`id`**: the tab. **`label`**: one word, four languages. **`icon`**: a name of `frame/lib/icons.js` that has a filled
  variant (`svg(name, { filled: true })`; today fuel, map, edit, list, settings).
- **`modules`** (a group) or **`screen`** (a frame screen, `settings`): a tab is one or the other.
- **A tab is a group of modules.** It stays selected while any module of its group is shown. Touched, it opens the last
  module of the group shown in this session, otherwise the first one visible at the device's level.
- **A module id that is not registered in `APP.modules` is skipped without a word** (`atmosphere` until its module is
  added; a tab whose modules are all absent or hidden by the level disappears from the bar). The code works with the
  module registered or not.
- **A module in no tab** (`website`, `hello`) selects no tab and stays reachable by its address (`#website`) and in the
  rail on a screen.
- **Sub-tabs**: when the group has two or more modules registered at the device's level, the frame draws above the
  module a row of sub-tabs (the primitives' `.f-tabs`), one per module, with the verb of `APP.modules[].label`, the
  current one marked, 44 px high; a touch switches the module (`#fuel`, `#atmosphere`). The module does nothing for
  it and must not draw a row of its own to reach its siblings; its internal tabs (Fuel's Plan / Sheets) stay its own.
- **`ctx.tab`**: the id of the tab that groups the module (`'prepare'` for fuel and atmosphere), `null` if none. For a
  module that wants to know its group; it never opens or changes a tab.

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
- no folded help panel and no welcome card above it (the ? button opens the module's chapter);
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
- The header is exactly `--f-head-h` in every state, so these numbers hold after Settings, help or a module's "←".

## 10. What the frame reads from modules' caches

The frame never calls a module; it only reads **cache records** a module publishes (policy `cache`: this device only,
never synchronised), through the data layer, as it reads the current flight. A module that publishes one declares the
prefix in its `meta.writes` with `policy: 'cache'`.

### 10.1 `cache/flightlog/pending.json` (written by flightlog, read for the "i" button)

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
- The frame redraws the badge and the pop-up when the record changes (`watch` on `cache/flightlog/`).
- The writer republishes the whole file when its list changes (`updated_at`); an empty `flights` when nothing is left.
