# V3 frame — how a module plugs in

This guide is for the agent or developer of a V3 module. It says what the frame gives a module and the rules a module
follows. The frame itself is described in [SPEC.md](SPEC.md). Start from the example module, `modules/hello/module.js`.

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
- Its verb in the application's menu is set in `frame/app.js` (`APP.modules`): one short verb, seven modules at most.
- `meta.help` (true by default): the frame draws the folded "How to use" panel at the top of the module as soon as
  the module's chapter (`modules/<id>/help/<lang>.md`) is in the application's manual; `false` hides it. Writing the
  chapter: `frame/help/INTEGRATION.md`.
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

- `ctx.identity` (read only): `trigram`, `ivao`, `vatsim`, `simbrief` of this device; an empty object when not set.
  Never fail on its absence.
- `ctx.airline` (read only): `{ name, site, pages: { recordFlight, log, fleet } }` from the data repository
  (`airline/settings.json`), an empty object when not set. Never write an address of the airline in a module: take it
  from here, and hide the action when it is missing.
- `ctx.query`: what follows `?` in the address, as an object (`#report?from=flightlog` → `{ from: 'flightlog' }`).
  Another module or page opens yours with it.
- `ctx.net.fetch(url, init)` for any outgoing call (SimBrief, IVAO, VATSIM, the DEFA website). It never throws:
  - offline, it answers at once with a 503 carrying `x-sog-offline`;
  - with a launcher, SimBrief, IVAO, VATSIM and aviationweather.gov (METAR) are relayed by it, keys and CORS
    included, with the same signature;
  - without one, SimBrief and IVAO are called directly; aviationweather.gov (METAR / TAF) sends no CORS header, so it
    answers a 503 marked `x-sog-unreachable` at once (the weather without a launcher will come through the web
    service);
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
