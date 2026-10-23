# V3 frame — specification (regeneration prompt)

This document describes the frame of the V3 suite well enough to rebuild it without its code. It grows lot by lot;
today it covers the **data layer** (`frame/store/`) and the **application skeleton** (`frame/index.html`,
`frame/app.js`, `frame/frame.css`: navigation, module loader, synchronisation control, conflicts, device). The decisions behind it are in [DECISIONS.md](DECISIONS.md), the
way a module plugs in is in [INTEGRATION.md](INTEGRATION.md), the project brief is
`docs/technique/V3_SPECIFICATION.md`.

**As a prompt**: give this document whole and ask for plain JavaScript files (classic scripts, no build, no ES module
syntax) defining `window.FrameData` and its transports. Every rule below is a requirement; section 2.8 (invariants)
always wins.

## 1. Purpose

The frame is what every module of every V3 application stands on: data, navigation, texts, notifications, module
loading. Its heart is the data layer: **disconnected mode is the normal state**. Every device works on its own copy;
exchange happens in batches, explicitly or periodically, through a transport the device's usages select.

## 2. Data layer (`frame/store/frame_data.js`)

### 2.1 Vocabulary

- **File**: a file of the data repository, named by its path relative to the repository root
  (`disponibilites/RBR/2026-W43.json`). JSON files are parsed; any other file is text.
- **Cache**: one IndexedDB database, `sogFrame`, on the device. Four stores: `docs` (the copy of each file: text,
  `base` = the text received at the last synchronisation, `rev`, date, policy), `pending` (writes not yet sent:
  text, or null for a removal, date, author), `meta` (last known head and tree of the repository, status), `conflicts`
  (losing versions kept).
- **Revision** (`rev`): the git blob sha of a file's text, computed locally as SHA-1 of `blob <bytes>\0<content>`, so
  it is comparable with the repository tree. A revision is compared, never interpreted.
- **Transport**: the object that talks to the outside. **Policy**: how a path prefix is read (2.4).

### 2.2 Reads and writes never touch the network

- A read answers from the device: the pending write if there is one, otherwise the cached copy.
- A write goes into the cache's queue only.
- The only read that may wait for the network is the first read of a file that was never fetched, and only if the
  caller asks for it (`wait`).

### 2.3 Synchronisation

- **When**: at start, on the synchronisation button, and in the background every 10 minutes while the device is
  online, plus when the network comes back. One pass at a time across all tabs (Web Locks, `sog-frame-sync`).
  - **On wake**: when the page becomes visible again (phone switched back on, tab brought back) or is restored from
    the back-forward cache, the status is broadcast again, and a pass runs if a write is pending or the last success
    is older than 10 minutes.
  - **After an offline pass**: a new attempt runs after 1 minute, then the delay doubles at each failure, up to 10
    minutes. No action from the user is needed.
- **Pull**: the transport gives the repository head; if it changed since the last pass, it gives the tree (every path
  with its revision). For each path whose revision changed:
  - a path read by no mounted module is skipped;
  - a reference path is fetched again only if it is already in the cache;
  - otherwise the new text replaces the cached copy;
  - if a write is pending on that path, the pending text becomes the three-way merge of base, pending and remote
    (2.5).
  - A path gone from the tree is removed from the cache unless a write is pending on it.
- **Push**: all pending writes leave in **one commit** on top of the head just pulled, never one per write. If the
  branch moved in between (refused push), the layer pulls again and pushes again, at most three times.
- **After a push**: each sent text becomes the cached copy and its base, its revision is the locally computed git
  sha, and the queue is emptied. A write redone during the push stays queued.
- **Result**: `{ ok, pulled: [paths], pushed, conflicts, error }`. A network failure gives `error: 'offline'` and
  loses nothing.
- **Watchers**: they are called with the changed paths after each pass, after each local write, and when another tab
  writes (BroadcastChannel `sog-frame-data`).

### 2.4 Policies

- A module declares the prefixes it reads, each with a policy. The longest matching prefix wins.
- **`document`** (the default) is for the records of the pool (availability, profiles, reports, assignments). Changed
  documents are pulled at every pass.
- **`reference`** is for large, read-only files (the SIA base by zone and cycle, the aircraft base):
  - fetched at the first read only;
  - kept while their revision does not change;
  - fetched again during a pass when the tree shows a new revision;
  - never queued.
  - **Arrival signalled**: a reference that appears or changes in the repository and was never read is not fetched
    by the pass, but its path is signalled to the watchers. So a service that lists them (aerodb's published zones)
    lists again without a reload.
  - **Live tree before the first pass**: until a pass has compared the kept tree with the repository's head in this
    page, the kept tree may come from a previous session (an app resumed on a phone).
    - A read that does not find its file there, and `list`, use the tree of the moment (head read again, tree read if
      it moved), kept in memory only.
    - The kept tree stays the one of the last pull, which thus still knows what changed.
- **Diagnostic** (`FrameData.diagnostic()`, no network), for a report copied from Settings:
  - the state (transport, last success, last error, pending, conflicts);
  - the kept tree (head, date, number of files, compared or not in this page);
  - the reference paths known in the tree (all, `sia/base/`, `AircraftDB/`) and those cached;
  - the last read that failed.
- A module declares the prefixes it writes. Several modules may declare the same prefix: the prefix is **shared** and
  each of them writes there (for example `pilot/<trigram>/current_flight.json`, written by fuel, read and written by
  maps). The merge rule of a shared prefix is the one of the first module that declares it, so the modules sharing a
  prefix agree on it in their integration guides.
- **`cache`** (a write policy, `{ prefix, policy: 'cache' }`, or `put(path, value, { policy: 'cache' })`) is for files
  of this device only: the last SimBrief OFP, the device's own settings (`device/…`).
  - Written straight into the cache, never queued, never sent.
  - Untouched by pulls, listed with the other paths, removed locally.
  - A module keeps no IndexedDB of its own: it uses this policy.

### 2.5 Merging a file changed on both sides

- **Trivial cases first**:
  - same text on both sides: keep it;
  - the remote equals the base: keep the local text;
  - the local text equals the base: take the remote.
- **Otherwise, the rule declared for the prefix** (the longest declared write prefix):
  - `record` (default), one record per file: the newest `updated_at` wins, the local one on a tie. A record without
    `updated_at` is dated by `updatedAt` (V2 files not yet rewritten). The loser is stored in `conflicts` and an event
    `frame-data-conflict` is fired. Never a blocking question.
  - `journal`, an append-only `{ entries }`: union, sorted by `at`. No loss.
  - `keyed:<field>:<key>[+<key>]`, a list of records in `<field>` identified by those keys: merged record by record
    (added on one side: kept; removed on one side and unchanged on the other: removed; changed on both sides: the
    newest by `updated_at`, else `updatedAt`, the loser kept). Example: `keyed:profiles:id` for the performance
    sheets.
  - A function `(base, local, remote) → { value, lost }`.
- **Non-JSON text, or JSON that does not parse**: the local text wins and the remote one is kept.
- **Taking a version back**: `FrameData.restore(id)` makes a kept loser the pending write of its file again (sent at
  the next pass) and marks the conflict seen.

### 2.6 Transports

A transport is `{ id, kind }`, plus, when its kind is `remote`, four methods: `head()`, `tree(head)` → `{ path: rev }`,
`read(path, rev)` → text, and `commit(changes, message, parent, remote)` → new head.
- A network failure throws `offline`.
- A refused fast-forward throws `conflict`.
- A refusal (token, rights) throws a readable message.

The transports:

- **`local`** (a page with no launcher, no exchange ticked): no exchange. A pass applies the queue to the cache, and
  the cache is the truth.
  - **Taking up local copies.** The first successful pass with a repository (launcher or GitHub) after local passes
    takes up the copies written here (`adoptLocal`):
    - a copy absent from the repository becomes a pending write;
    - present on both sides with another value: the usual merge with no common base (records: the newest `updated_at`
      wins, the other is kept in conflicts);
    - the same value (whatever the formatting): nothing.
    - The device cache and the references are never taken up.
    - The kind of the last successful pass is kept (`meta.mode`), so this happens once.
  - **Reference source.** `reference` files (the SIA and aircraft bases) still need a source, which
    `configure({ references })` gives: a read-only transport (`head`, `tree`, `read`). The frame passes the launcher
    that serves the page, otherwise the configured GitHub repository, otherwise nothing (the public website never
    carries these bases).
  - Reference files are read from it at the first read, and `list` adds its tree's reference paths to the cache.
  - A local pass revalidates the cached references against it. A failure (offline) leaves the pass successful, with a
    `warning`.
  - Nothing is ever written to the source.
  - The background pass runs when such a source exists.
- **`github`** (`frame/store/transport_github.js`): the data repository through the GitHub git data API, with a
  fine-grained device token (contents read and write on that repository only). The token is kept in `localStorage`
  `githubData:frame`, excluded from browser backups.
  - `head` is a conditional request on the branch ref: a 304 costs no rate limit.
  - `tree` gets the commit, then its recursive tree.
  - `read` reads a blob (immutable).
  - `commit` makes one tree on the parent's tree (content for written files, `sha: null` for removed ones; a removal
    of a file absent from the tree is skipped), one commit, then a non-forced ref update.
  - A truncated tree is an error.
- **`launcher`** (`frame/store/transport_launcher.js`, workstation): the `data/` folder of the workstation is the
  repository, served by `tools/launch.py`. Every route requires the `X-SOG-Setup` header.
  - `GET /__setup/changes?since=<head>`: the head (a hash of the tree), and the tree `{ path: git blob sha }` when the
    head differs from `since`.
    - The tree leaves out `.git`, `local/`, conflict and pre-restore copies, regenerated indexes, the launcher's
      marker, and the SIA sources (only `sia/base/` is shared).
    - Hashes are kept by size and date, so a file is hashed again only when it changes.
  - `read` gets the served file `data/<path>`.
  - `POST /__setup/batch { parent, message, author, changes }`: the whole queue at once.
    - Refused with 409 if `data/` changed since `parent`, so the layer pulls and pushes again.
    - Refused with 400 for a path outside `data/` or excluded, or a `.js` file not in the data format
      (`tools/data_guard.py`).
    - The files are written, then one local commit in the author's name if `data/` is a git repository.
  - **Little Navmap sheets** (aerodb, `frame/aerodb/lnmperf.js`), on a workstation with a launcher:
    - `GET` / `PUT /__setup/lnmperf-folder`: the folder of `.lnmperf` files, kept in `tools/.lnmperf.json` (local,
      ignored by git). It must exist, and the data folder is refused.
    - `GET /__setup/lnmperf`: the list of `*.lnmperf` files (name, size, date, sha). `GET ?name=` reads one, and
      `PUT ?name=` writes one at once (temporary file, then replace).
    - `POST ?name=&action=retire` moves a file to `_removed/`; nothing is ever deleted.
    - Names are a single file name, never a path. A `PUT` anywhere else gets a 405. Same header and size limit as a
      `POST`.
  - `exchange()`, when the usages ask for an exchange and `data/` is a git repository: `POST /__setup/sync`, the
    workstation's git pass (commit of the pool, record-by-record merge, push). It runs at the start of a pass, to
    receive, and after a push, to send. A failure is reported as a warning and blocks nothing local.
- **To come**, same interface: web service, the PHP site.
- **Usages to transports**: single user → local; one user on several devices → github, or launcher and git; several
  users → github, or launcher and git; backend → web service. The interface shows only what the ticked usages need.

### 2.7 The data part of a module's adapter

`FrameData.adapter(declaration)` registers what the module reads and writes and returns:

| Method | Rule |
|---|---|
| `get(path, opts)` | the value (parsed JSON or text), or null |
| `read(path, { policy, wait })` | `{ value, text, rev, cached, pending, at }` or null. `wait`: for a file never fetched, wait for the network; without it, null now and the value comes through `watch` |
| `list(prefix)` | the paths, from the last known tree plus pending writes; null if no tree was ever read (the local transport lists the cache) |
| `cached(prefix)` | the local copies under a prefix, with no network: `[{ path, rev, bytes, at, policy }]` (pending writes are counted by `status`) |
| `evict(path)` | removes the local copy of a `reference` file (or of all those under a prefix ending with `/`): nothing queued, nothing sent, read again on demand; other copies are never evicted; returns the count |
| `put(path, value, opts)` / `remove(path)` | queued (or written to the cache for the `cache` policy); refused outside the module's declared writes |
| `watch(prefix, fn)` | fn(paths) on changes; returns the unsubscribe function |
| `status()` / `onStatus(fn)` | `{ transport, online, syncing, lastSync, lastError, pending, conflicts }` |
| `sync()` | asks for a pass now |

The declaration has the form `{ id, reads: [prefix | { prefix, policy }], writes: [prefix | { prefix, merge | policy }] }`.

**Device backup** (`FrameData.dump()`, `FrameData.load(backup, { mode })`), the only backup when the device is
used alone:

- `dump({ references })` returns `{ name, text, counts }`: one JSON file (`sog-frame-export/1`) with the copies,
  the pending writes and the conflicts. Reference bases only with `references: true` (they can be read again from
  their source). Never a token or an access setting (they are not in this database), never the transport state.
- `load(file | text | object, { mode })`:
  - `merge` (default): nothing of this device is lost. A file absent here, or newer in the backup (`updated_at`),
    becomes a pending write (a device cache file or a reference copy is written directly). A pending write here
    always wins; a pending deletion of the backup is never taken. The device's own settings (`device/`: usages,
    identity, level) are never taken: a backup restores data, not this device's transport or identity.
  - `replace`: copies, queue and conflicts of this device are replaced by the backup's, `device/` included (never the
    GitHub access: the token is not in a backup).
  - Returns `{ added, updated, kept, pending, conflicts }`. A file that is not an export is refused.

### 2.8 Invariants

1. No read and no write ever waits for the network, except a first read with `wait`.
2. A write is never lost: it stays queued until a pass has sent it, whatever fails in between.
3. One pass sends one commit, whatever the number of writes.
4. A version is never overwritten without being kept: a losing version goes to `conflicts`.
5. A module writes only under its declared prefixes.
6. No key or token is ever written to a file, a backup or the repository.

## 3. Application skeleton (`frame/index.html`, `frame/app.js`, `frame/frame.css`)

### 3.1 Navigation

- An application (today: Pilot) lists its modules, one short **verb** each, seven at most.
- On a screen, the verbs sit in a column on the left. On a phone (760 px or narrower), they sit in a drawer opened by
  the menu button, and choosing a verb closes it.
- The address `#<module>` is enough to come back to a screen. What follows a `?` is given to the module as
  `ctx.query`, an object: `#report?from=flightlog` opens report with `{ from: 'flightlog' }`.
- **Usage level**: the device's level (`device/level.json`, 1 to 3, 2 by default, chosen in Settings only) filters
  the menu: a module is listed when its `meta.level` (1 by default) is at most the device's level. A hidden module
  stays reachable by its address. The frame reads each module's `meta.level` once at start.
- The frame has three screens of its own: `#help` (`frame/help/SPEC.md`; the header's ? opens it at the current
  module's chapter), `#conflicts` and `#settings` (`#device`, its former name, opens it too;
  `frame/settings/SPEC.md`).
- **The frame's screens** (help, roadmap, settings, conflicts) opened from a module show in the module's area, over
  it. The module stays mounted, only hidden, with its pane.
  - The menu stays in place, sticky under the header at any scroll, with the current module still marked.
  - Their header buttons are toggles: "?" for help and roadmap, "⚙" for settings, the sync button for conflicts. Each
    is pressed while its screen is open (background tinted with the accent, accent border).
  - A second click on the same button, Escape (unless a dialog is open) or the browser's back closes the screen. The
    module comes back exactly as it was: same address with its query, same step, same scroll. Exception: if what a
    module reads when it mounts changed meanwhile (identity, usages, level, language, transport: a change made in the
    settings), the module is mounted again with it.
  - Closing uses `history.back()` when only one frame screen was opened, otherwise it puts the module's address back
    (`replaceState`).
  - The "←" back link is not shown: this is not a passage between modules.
  - The dual view belongs to modules only: on a frame screen the "Map" toggle is neither shown nor active, and the
    screen takes the whole area. An open Map pane comes back with the module.
  - Choosing a module in the menu from a frame screen closes it and opens that module.
  - A frame screen opened directly by its address, with no module behind, shows alone as before.
- **Back to the origin module**: a module opened by a passage from another shows "← <origin module>" in the header.
  - A passage is either an explicit `?from=<module>` (`#report?from=flightlog`), or an address set by the previous
    module (the Map's "Edit the route" → Fuel, "Write the report" of My flights through `pilot/handoff.json`).
  - It is not a passage when the user chose the menu, used the back button itself, or came back to an entry of the
    history already seen (back or forward of the browser).
  - The button goes back with `history.back()` when the origin is the previous page of this session, otherwise to the
    origin's address.
  - It disappears at the next change of module. On a phone it takes the place of the application's name. With the
    dual view it is not needed, but it stays.
- **Dual view** (tablet and wide screen, from 980 px): the frame may mount a second module beside the current one.
  - The current module is on the left, a pane on the right, sticky under the header.
  - A module offers a pane through `APP.modules[].pane`: Fuel and Report offer the Map.
  - The header button is a toggle: the pane's icon and its verb ("Map"), 44 px high, never clipped.
    - Pressed while the pane is open: the background tinted with the accent (15 %), an accent border, the page's text.
      Contrast is at least 4.5:1 in the three designs, by day and by night.
    - It shows only above 980 px, decided at once (`matchMedia`, no transition): never half drawn while the window is
      resized.
  - The pane has its own "×", which closes it like the toggle.
  - **Opening by itself**: from 1200 px, a module that offers a pane (Fuel, Report) opens it the first time. Between
    980 and 1200 px it opens only on demand. When the user opens or closes it, the choice is kept for that module, and
    a closed pane stays closed at every width.
  - The address carries it (`#fuel?with=maps`): opening or closing updates the address without remounting the module
    (`history.replaceState`).
  - The open pane is kept per module in `device/layout.json` (`{ panes: { fuel: 'maps' } }`, cache policy).
  - Each pane is an ordinary `mount()` with its own `ctx`; the pane gets `ctx.query = { pane: '1' }`. The two never
    call each other: they are linked only by the records they share, through `watch` (fuel writes
    `pilot/<trigram>/current_flight.json`, the map redraws).
  - The pane is unmounted when the module changes, and when the window gets narrower than 980 px (it comes back when
    it widens). On a phone nothing changes.
- Touch targets are at least 44 px high. There is no horizontal scroll at 375 px.

### 3.2 Module loader and context

- A module is `modules/<id>/module.js`, an ES module loaded on demand with `import()` (never a synchronous script).
- It exports:
  - `meta`: `{ id, apps, level, reads, writes, files, lazy, net }`; `id` must match its folder;
    - `files` lists the other files the module imports, as paths relative to `module.js`, so that they are kept
      offline from the installation (§ 3.6);
    - `lazy` lists heavy files (a map library, about 1 MB) kept by the service worker at their first use, never
      preloaded; a file in both lists is lazy;
    - `net` lists the public hosts a library of the module calls by itself (MapLibre fetches its own tiles:
      `tiles.openfreemap.org`, `tiles.versatiles.org`, `s3.amazonaws.com/elevation-tiles-prod`), `host` or
      `host/path`. This is the one exception to "every outgoing call goes through `ctx.net`": such calls never go
      through `ctx.net` nor the launcher, https only, GET by nature (tiles). The launcher's header and the
      `build_pages.py` meta tag add them to the page's `connect-src` (`tools/csp_policy.py`, read from the meta of the
      application's modules); a local or numeric address is ignored. Images are not restricted by the policy, so
      nothing is added to `img-src`;
  - `mount(el, ctx)`;
  - `unmount()`.
- Before mounting a module, the frame unmounts the previous one and empties its element.
- The context `ctx` is everything the module may use:

| Field | What it is |
|---|---|
| `data` | the module's part of the data layer (2.7), limited to the prefixes of its `meta` |
| `aerodb` | the aeronautical service, one instance for all modules (`frame/aerodb/INTEGRATION.md`); its data adapter is declared by aerodb itself (`AeroDB.declaration()`: SIA base, aircraft base, references, airline, planner, the aircraft registry and its sheets) |
| `t(row, vars)`, `lang()` | texts as `[fr, en, de, es]` rows, `{name}` filled in, French typography; the language of the application |
| `notify(text, kind)` | floating notification (`info`, `ok`, `warn`, `err`), closed by itself or by its ✕ |
| `ask(text)`, `askText(text, { value })` | the frame's own question windows (never a native dialog); promise of true / false, of the text or null |
| `net.fetch(url, init)`, `net.online()` | outgoing calls through the frame, never an exception: offline or on a network failure, an immediate 503 marked `x-sog-offline`; same origin: direct; SimBrief, IVAO, VATSIM, aviationweather.gov (METAR / TAF): relayed by the launcher when the page is served by one (`POST /__setup/net`), otherwise direct for the sites that allow it (SimBrief, IVAO; aviationweather.gov sends no CORS header, so without a launcher it gets the 503); the airline's website (`airline.site`, https): the same, GET only (any other method: 503); any other site: 503 marked `x-sog-unreachable` |
| `identity` | read only: the identity record of the device (`trigram`, `ivao`, `vatsim`, `simbrief`), an empty object when there is none |
| `airline` | read only: `{ name, site, pages: { recordFlight, log, fleet } }` from `airline/settings.json` of the data repository (a document, pulled ahead and followed with `watch`; text fields only), an empty object when there is none; no address is written in the code |
| `query` | read only: the part of the address after `?`, as an object (empty when there is none) |
| `live` | the actual position during a started flight: `{ status ('off', 'waiting', 'tracking'), source ('gps', 'ivao', 'vatsim', ''), last ({ at, lat, lon, altFt, gsKt, trackDeg, source }), gps, enable(), disable() }` (below) |
| `help` | `open(subject)` opens the module's folded "How to use" panel at that paragraph; `link(id)` gives `#help?m=<id>` (`frame/help/SPEC.md`) |

- **Actual position during a flight** (`ctx.live`, a frame service):
  - **When**: it runs while `pilot/<trigram>/current_flight.json` has `started` (set back to null when fuel cancels the
    flight or report saves the report), whatever module is open. It never runs for a flight started more than 24 h
    ago: a forgotten flight does not keep the GPS on.
  - **Sources, in order**:
    1. **The device's GPS** (`watchPosition`, plus a reading every 10 s): position, altitude, track, ground speed.
       - Permission is asked only by a gesture: the header badge, or `ctx.live.enable()`; never at start.
       - The choice is kept on the device (`device/live.json`); once the browser grants it, the GPS resumes by itself.
    2. **The network**, when the GPS has given nothing for 30 s: the pilot's online session, IVAO (public `whazzup`,
       VID of the identity), then VATSIM (data feed, CID).
       - Every 15 s through the launcher's relay, every 60 s in a direct call (0.7 to 1.7 MB a call on a phone).
       - A position at 0° / 0° (a pilot still connecting) is ignored.
    3. Nothing.
  - **Offline**: the GPS only.
  - **Writing**: only `progress.actual = { at, lat, lon, altFt, gsKt, trackDeg, source }` in the current flight (the
    record, `by: 'frame'`), never fuel's or maps' fields.
    - This is the form maps reads: `at` is ISO, `source` is `gps`, `ivao` or `vatsim`, and `trackDeg` / `gsKt` may be
      null.
    - `trail` is optional and the frame does not write it: the map keeps its own 30-minute trail, and greys a position
      older than 2 minutes.
    - At most once every 10 s, and only when the position moved (30 m, or 50 ft of altitude). A position that comes
      too early is written at the end of the delay.
    - No synchronisation is forced: the local queue and the usual pass carry it.
  - **Badge**: during a flight, a header badge shows the source ("GPS", "IVAO", "VATSIM", "—" while waiting), the time
    of the last position in its tooltip, and switches the device's GPS on or off (pressed while on).
- **Outgoing calls (`ctx.net`), by site.** The launcher's relay comes first when the page is served by one.

| Site | With a launcher | Without a launcher | Key |
|---|---|---|---|
| SimBrief, IVAO | relayed (IVAO: the launcher's API key) | direct | — |
| VATSIM `data.vatsim.net` (data feed) | relayed | direct (CORS `*`) | — |
| VATSIM (`api`, `my`) | relayed | 503 `x-sog-unreachable` | — |
| aviationweather.gov (METAR / TAF, decoded JSON) | relayed | 503 (no CORS header) | — |
| metar.vatsim.net (METAR, raw text, several airports `id=A,B`) | relayed | direct | — |
| api.open-meteo.com (forecasts: winds and temperatures by pressure level, JSON) | relayed | direct | — |
| avwx.rest (TAF and METAR, decoded JSON) | direct | direct | the device's own, added by the frame (`Authorization: BEARER …`); without one, 503 `x-sog-unreachable` |
| the airline's website (`airline.site`) | relayed, GET only | direct, GET only | — |
| any other site | 503 `x-sog-unreachable` | 503 | — |

- **The weather key** (avwx.rest, for the TAF without a launcher):
  - It is entered on the device in Settings › Keys and kept in `localStorage` (`githubData:avwx`), like the GitHub
    token. It is never in `device/` nor in the IndexedDB that `FrameData.dump()` exports, and never in the
    repository.
  - The frame adds it to the call itself; no page or module ever reads it back.
  - The settings screen gets `weatherKey { has(), save(key), clear(), test(icao) → { ok, status, message } }`.
- A module loads no global style sheet. It uses the frame's tokens (`--sog-*`) and primitives (classes `f-…`): the
  list, the designs (standard, cabinet, field), day / night and print are in `frame/design/SPEC.md`, the module's
  rules in `frame/design/INTEGRATION.md`.
- Day / night follows the system, and Settings may force either.
- `modules/hello/` is the example module. It shows a shared prefix, a cache file, `watch` and the texts.

### 3.3 Synchronisation control

- The header button shows one state at a time, in this order:
  - in progress;
  - n conflicts;
  - on this device (local transport, nothing pending);
  - offline, with the number of pending writes;
  - synchronisation error;
  - n pending;
  - up to date, n minutes ago.
- Its tooltip gives the transport, the last success, the pending count and the last error.
- On a phone (760 px or narrower), it shows only its dot and a short state: "✓" up to date, the number of pending
  writes, "⟳" in progress, "✕" offline or error, "! n" conflicts, nothing for "on this device".
  - The whole label stays in the tooltip and in the button's accessible name, and the details are in Settings.
  - So the header never makes the page wider than the window, in any of the four languages.
- A click synchronises and says what happened: received and sent counts, conflicts, offline, error. When there are
  conflicts, a click opens the conflicts screen instead.
- With the local transport, a write is applied to the cache at once.
- The button is written only when its state changes. It refreshes every 30 s, and when the network comes or goes.

### 3.4 Conflicts screen (`#conflicts`)

- Each unseen conflict shows the file and its date, the version set aside (this device's or another device's) and the
  version kept.
- Two actions: "Take this version back" (`FrameData.restore`) and "Seen".
- **Conflicts found outside a pass** (a file of the workstation, such as a Little Navmap `.lnmperf` sheet read by
  aerodb): `FrameData.noteConflict({ path, kept, lost, side })` keeps the losing version in the same form.
  - `path` is the record in the data repository (`aircraft/sheets/<id>.json`), so "Take this version back" makes the
    lost version the pending write of that record.
  - It is counted on the sync button and announced (`frame-data-conflict`), like the conflicts of a pass.
- Conflicts already seen can be shown too.
- Never a blocking question.

### 3.5 Device: usages, identity, transport

- The device's settings are cache files, never synchronised:
  - `device/usages.json`: `single`, `devices`, `users`, `backend`;
  - `device/identity.json`: `trigram`, `ivao`, `vatsim`, `simbrief`.
  - The settings screen (`frame/settings/`) writes them, with `device/settings.json` for its own answers.
  - They cannot live in the shared repository: they decide how the repository is reached.
- **Transport**:
  - **On a page served by a launcher** (`__setup/status`), its `data/` is the device's storage. The transport is the
    launcher whatever the usages: reads and writes go to `data/`, one local commit per batch.
    - The git exchange (`/__setup/sync` before and after a pass) happens only if "several devices" or "several users"
      is ticked and `data/` is a git repository.
    - So V2 and V3 see the same files on that workstation.
  - Without a launcher:
    - no exchange ticked → local ("alone on this device");
    - otherwise GitHub when a repository and a device token are set;
    - otherwise local, with a warning that nothing can be exchanged.
  - Changing the settings switches the transport at once.
- The GitHub token is entered on the settings screen, kept in `githubData:frame`, and never shown again; "Cut
  access" erases it (`FrameData.github.clear`).
- **Cut access** keeps the copies and the pending writes; the transport switches at once, in the other tabs too.

### 3.6 Installable and offline application (`frame/sw.js`, `frame/manifest.webmanifest`)

- **Service worker**: registered by the frame for its own folder (scope `frame/`) when the page is served over http(s);
  a native shell already carries the code. It keeps the application files only: the frame (`frame/…`), the modules
  (`modules/…`, tests excluded) and the icon.
- **Not kept**: data (`data/…`, the GitHub API) go through the data layer and its own cache; the launcher's routes
  (`/__setup/…`) and the V2 pages go to the network.
- **Serving**:
  - A file is served from its copy at once and checked again in the background.
  - A copy is keyed by its path without the `?v=` stamp, so it is one copy whatever the stamp.
  - Without a copy, the file comes from the network and is kept. Offline with no copy: a 503 marked
    `x-sog-offline`.
- **Installation**: the frame's files are kept. The page then sends every file of every module of its application
  (message `precache`): each entry point and the files its `meta.files` declares (paths relative to `module.js`). So
  every module opens offline after the first visit, even one never opened. A file a module imports without declaring
  it is kept the first time it is loaded; a module that fails to load sends its entry point only.
- **New version**:
  - when a background check finds a changed file, all copies are fetched again, so the new version arrives whole;
  - then the open pages receive `sog-frame-update` and the frame shows "A new version of the app is ready" with a
    "Reload" button.
  - A launcher clears its site's browser cache at its first page (`Clear-Site-Data`), so after a launcher restart the
    new version is simply served.
- **No storage for copies** (private browsing, quota, failure): the service worker installs anyway and lets requests
  through to the network. The application works, without offline.
- **Manifest**: name "SOG — Pilote", start and scope `./`, standalone display, colours, SVG icon.
- **Offline start**: on the data already cached, the frame, the module and the synchronisation control are drawn with
  no error. The transport falls back as § 3.5 says. When the network comes back, the launcher is looked for again
  and the transport follows.

### 3.7 Publication (GitHub Pages) and the iOS shell

- **One site for two branches**: a repository has one Pages site, and each deployment replaces it whole.
  `.github/workflows/pages.yml` (the same file on develop and on v3) runs on a push to either branch, checks out both,
  and builds each with its own `tools/build_pages.py`:
  - V2 (develop) at the root of the site;
  - V3 (v3) under `/v3/`: the Pilot application is `/v3/frame/`, and its service worker's scope stays `/v3/frame/`.
- **Start page** (`tools/build_pages.py --start frame/index.html`): the root `index.html` of the built site becomes a
  redirect to that path, query and anchor kept; the path must be part of the site. It is for the Capacitor shell,
  which opens `index.html` at the root.
- **Capacitor shell** (`mobile/`): name "SOG Pilote", same app id, opening on the Pilot application. It runs without a
  launcher and without a service worker (no http(s) origin); data go through the `github` transport.
  `.github/workflows/ios.yml` is paused and unchanged: when it resumes, it needs `--start frame/index.html` and the v3
  branch.

### 3.8 Registry bridge (launcher side, `tools/report_bridge.py`)

V3 reports (`cr/reports/<year>/<CR number>.json`, `sog-report/1`, `modules/report/SPEC.md` § 4) are replayed into the
V2 registry `cr/missions.yaml`, so that V2 and CPCO see them. Never the other way.

- **When**: at every batch the launcher receives (`/__setup/batch`, the registry joins the batch's commit) and at every
  exchange (`/__setup/sync`: before the pass, so the registry leaves with it; after, when files were received, the
  registry leaves at the next pass). Without a launcher, the registry is updated at the next pass of a workstation
  that has one.
- **How**: the V2 entry is the record without `schema`, `updated_at` and `by`; its identity is V2's key
  `family|metadata.missionId|metadata.date`. An absent key is added at the end; a present one is replaced when the
  record brings a different value (keys that V2 added alone, its defaults, do not count). Nothing is ever removed.
- Only the replaced or added entries are rewritten, in V2's exact format (`M.toYaml`: every string double-quoted,
  indent 2); the rest of the file keeps its text. `updatedAt` becomes the newest `updated_at` replayed, at least the
  old value plus 1 ms, so two workstations replaying the same records write the same file.
- The text is read back and checked before it is written; an unreadable registry is never rewritten (the reason is
  shown in the launcher's console).

### 3.9 Shared pure code (`frame/lib/`)

A module never imports from another module. Code that two modules need (pure functions: no page, no storage, calls
through the `ctx.net` or reader they are given) goes to `frame/lib/<name>.js`, owned by one module, which alone changes
it; the others import it as it is.

| File | Owner | Used by | What it does |
|---|---|---|---|
| `frame/lib/last_flight.js` | report | report, flightlog | "my last flight" on IVAO and VATSIM (the V2 launcher's route in JavaScript): the flights of the last 7 days, then one flight's details |
| `frame/lib/js-yaml.min.js` | flightlog | flightlog | js-yaml 4.1.0, a copy of V2's vendored library, to read V2's YAML registry |
| `frame/lib/external_links.js` | fuel | fuel | "Open in" links (SimBrief, SkyVector, Navigraph, ChartFox): the pure part of V2's `shared/external_links.js`, translation passed as a parameter |
| `frame/lib/icons.js` | design | frame, any module | the line icon set (V2's 53 icons plus `menu` and `wand-sparkles`), `svg(name)` |
| `frame/lib/markdown.js` | help | the frame's help screen | the Markdown rendering of the help, copied as it is from V2 (`apps/aide/markdown.js`); a classic script loaded with the frame |
| `frame/lib/metar.js` | fuel | fuel | the raw METAR decoder to the JSON form of aviationweather.gov, and the conversion of avwx's METAR / TAF to that form (weather without a launcher) |
| `frame/lib/route_text.js` | fuel | fuel, maps | the route text, pure: `tokenize`, `textFromTokens` (normalised "DEP PT1 UN869 PT2/F280 … ARR"), `textFromPoints` (the text rebuilt from edited points, airways kept between two unchanged neighbouring points), `icaoCoord` |
| `frame/lib/website.js` | website | report, website | the flight's fields for the airline website, the `#defa=` address, the line to copy, the "→ Vol" bookmark (moved from `modules/report/website_handoff.js`) |

## 4. To come in the frame

Usage levels, a language choice, designs taken from V2, the backend transports.
