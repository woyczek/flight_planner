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
  - **Quick pass** with a transport local to the workstation (the launcher and its `data/`, `T.quick`): a write goes
    2 s after the last one, without the git exchange, which keeps its own rhythm.
  - A frequent write that does not matter much (`put(…, { quiet: true })`: the actual position of a flight every
    10 s) waits for the background pass, so that `data/` does not get a commit every 10 s.
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
- **Without a trigram, nothing leaves the device**:
  - `pilot/ANON/…` (what modules write when the identity has no trigram) always takes the `cache` policy, whatever
    the module declares.
  - An entry queued under it before this rule is moved into the cache at the next pass.
  - Removing such a file that the repository already holds still queues its deletion.
  - With no trigram, a pass pulls but sends nothing: neither the batch (`result.held` gives the writes kept back)
    nor the launcher's git exchange, since a commit needs an author. The writes wait on the device.
  - The launcher refuses a batch without a valid author (`[A-Z0-9]{2,5}`, never `ANON`) and any write under
    `pilot/ANON/`; a deletion there is accepted.

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
  fine-grained device token (contents read and write on that repository only). The token is kept like the identity, in
  `device/keys.json` (IndexedDB, policy `cache`, never synchronised), left out of backups (`frame/settings/DECISIONS.md`,
  25 Oct 2026; it was in `localStorage` `githubData:frame`, which Safari cleared).
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
    - The tree leaves out `.git`, `local/`, conflict and pre-restore copies, regenerated indexes (`_index.json`), and
      the launcher's marker.
    - Under `sia/`, only two folders are exposed: `sia/base/` (the published aeronautical base) and `sia/vfr/` (the
      VFR reporting points taken from the VAC charts: one file per aerodrome and `index.json`). The raw SIA sources
      (eAIP, AIXM, downloads and any other folder) are never in the tree. A write to a path left out of the tree is
      refused with 400 (`FRAME_SKIP` in `tools/launch.py`).
    - A new folder under `sia/` reaches the frame only when it is added to that rule and to this list.
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
  their source). Never a token or an access setting (they are not in this database), never the transport state, never
  the weather cache (`cache/weather/`, its ledger included: it can be read again, and its count belongs to this device;
  `load` drops it from a backup and `replace` keeps this device's).
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
- On a screen (wider than 760 px), the verbs sit in a column on the left (the **rail**): every module that has a screen,
  the current one marked. On a phone (760 px or narrower) there is **no menu button and no drawer**: a **bottom tab
  bar** replaces them (below).
- **Bottom tab bar** (phone only, `APP.tabs`, five tabs at most): **Préparer · Carte · CR · Vols · Météo** (Prepare · Map ·
  Report · Flights · Weather; Vorbereiten · Karte · Bericht · Flüge · Wetter; Preparar · Mapa · Informe · Vuelos · Meteo).
  It is the user's "option A" of 24 Oct 2026 (the flight's path, in the order of a day; `docs/technique/V3_SPECIFICATION.md`
  § 7.1), whose last tab, Réglages, gave way to **Météo** by rule 14 (24 Oct, 22:15: the atmosphere screen is the richest and
  was hidden behind a second touch). **Settings is the ⚙ of the header**, which carries the state badge.
  - **Shape.** The last row of the page grid, sticky at the bottom of the window, on `--sog-surface` with a top
    hairline. Each tab is an icon above a one-word label, at least 44 px wide and high; the bar is 56 px (`--f-tab-h`)
    plus the hairline plus the device's safe area (`padding-bottom: env(safe-area-inset-bottom)`, the viewport has
    `viewport-fit=cover`). `--f-tab-space` (bar + hairline + safe area) is what anything stuck at the bottom of the
    window must clear: the sticky result bar `.f-bar` (`bottom: var(--f-tab-space, 0px)`) and the notifications. The
    view is above the bar in the grid, so nothing hides under it.
  - **The selected tab changes form, not only colour**: its icon switches from the outline to the **filled variant**
    (`frame/lib/icons.js`: fuel, map, edit, list, cloud, settings) on a soft rounded pill (12 to 14 % of the accent mixed into
    the surface); its label takes the link colour and a heavier weight; the others are outline icons in `--sog-muted`.
  - **A tab is a group of modules or a frame screen** (`tabs`, `frame/INTEGRATION.md` § 9). The tab stays selected
    while any module of its group is shown (`#atmosphere`, a module id that is not registered, is skipped without a
    word). Touching a tab opens the last module of its group shown in this session, otherwise the first one at the
    device's level. Over Settings (the ⚙) no tab is selected. A module in no tab (`website`, `hello`) selects none and stays
    reachable by its address and in the rail. A tab may also list **views** of a module of its group (`views`: Préparer lists
    the fuel module's Sheets view, `#fuel?view=sheets`): they have no tab, only a popover row.
  - **Group popover, no sub-tabs row** (24 Oct 2026, 14:05: "no group sub-tabs row above a fixed module"; rule 14 kept the
    principle "a second touch = more buttons" for every tab with several entries). When a tab has two or more rows (its
    registered modules at the device's level and their views: **Préparer lists Carburant · Fiches**), a **second touch on
    the active tab** opens a small popover above that tab (`.f-tabpop`, a pointer on the tab, 44 px rows, the group's modules
    and views with their icon and verb, the current one marked `aria-current`); a touch on a row switches (a menu choice: no
    "←"); a touch elsewhere, Escape, a scroll, a resize or a change of address closes it; a third touch on the tab closes it
    too. The tab carries `aria-haspopup` (and `aria-expanded` while open). On a tab with a single row (Carte, CR, Vols, Météo)
    the second touch does nothing: it neither reloads the view nor drops what follows `?` in the address. While a frame screen is
    open over the module, a touch on the tab is the ordinary first touch (it closes the screen). No module knows its
    siblings; a module's own tabs (Fuel's Plan / Sheets) stay inside it. On a screen the rail lists the modules as before and
    nothing else is drawn.
  - **Landscape on a phone** (24 Oct 2026, 17:45, `docs/technique/V3_SPECIFICATION.md` § 7.1 rule 7, `frame/INTEGRATION.md`
    § 9.1): `<html class="f-land">` is set by the frame when the window is wider than high and under 1024 px (one write when
    the value changes, on `resize` and `orientationchange`; `frame-orientation` fired after; the screen's orientation must
    not be portrait, so an on-screen keyboard does not flip a portrait phone). The bar becomes a **rail of icons at the left
    edge** (`--f-rail-w`, 44 px, full height under the header, no label: the label is the `aria-label`; the same popover on a
    second touch, opened at the right of the rail); the 210 px rail is not shown; the header stays at 57 px; `--f-tab-space`
    is 0; the view takes the rest of the width. The designs' bar rules apply to the rail at any width (they no longer wait for
    760 px: the bar is displayed only on a phone and in landscape). The safe areas of the device (notch, home indicator) are
    left free on every side.
  - **A computer** (28 Oct 2026, for the Aqua design, `frame/INTEGRATION.md` § 9.1): `<html class="f-desk">` is set by the
    frame when the window is wider than 760 px with a precise, hovering pointer (`(pointer: fine) and (hover: hover)`) and
    not `f-land`; before the first paint by `index.html`, then on `resize`, `orientationchange` and a change of pointer, one
    write when the value changes; `frame-desk` fired after. Designs only: no layout of the frame depends on it.
- **The status block and the badge of the ⚙** (rule 14, 24 Oct 2026, 22:15, which replaces the header's "i" button and its
  pop-up, themselves a replacement of the Préparer status line). The state of the application is read in two places only:
  - **The badge on the ⚙ of the header** (`#fDevice`; `data-badge`, `data-attn`): **green** (`--sog-ok`) when something is
    new (a flight is started, a report is to write), on every width; **amber** (`--sog-warn`) when attention is needed (no
    trigram, writes pending, conflicts, a synchronisation error, offline, the aeronautical base not ready), **phone only**
    (a screen keeps its sync dot and its trigram pastille); amber wins when both apply; no dot when neither. The data line
    and the offline line are a state, not news: they alone never turn it green. The button's name adds "something to see".
  - **The "Status" card that opens the Settings screen** (`data-card="status"`, drawn by the frame, placed first by
    `frame/settings`; `frame/INTEGRATION.md` § 10.2), 44 px lines, a chevron on a line that leads somewhere, a dot (green or
    amber) on the lines that count. The lines, in this order, each when it applies: **"Flight in progress › Map"** (the
    current flight record has `started` not null; touch → `#maps`); **"Report to write for the flight of <date> <DEP>→<ARR>"**,
    one per entry of `cache/flightlog/pending.json` (contract: INTEGRATION § 10; touch → the entry's `handoff` is written to
    `pilot/handoff.json` and `#report?from=flightlog` opens; no `handoff`: `#flightlog`); **"Trigram not set: your
    documents stay on this device"** (touch → the Identity card); the **aeronautical base** while it loads, has no access or is
    not published (touch → the Access card); **the data state**, always ("Data: synchronised 4 min ago · 2 writes pending",
    "on this device, nothing to synchronise", "synchronising…", "n conflict(s) to review", the error), under it "Transport:
    this device / launcher / GitHub" (touch → the Synchronisation card, else Usages; `#conflicts` when there are
    conflicts); **"Launcher: <host> · <state>"** on a launcher (touch → the Access card); **"Offline: working on this
    device's copy"** when `ctx.net.online()` is false; **"Weather: n calls today"** when the weather layer has called
    Open-Meteo today (weighted calls of the UTC day, read from `cache/weather/ledger.json`; under it the limit, 10,000 a
    day; INTEGRATION § 14); and, **on a phone only**, **"Position: <source>"** while a flight is
    started (touch toggles the device's GPS like the header's badge on a screen). The "Help for this screen" line no longer
    exists: the "?" of the header is that. The block follows the state while it is on screen. Four languages.
  - There is **no "i" button and no pop-up** any more.
- **Fixed, full-height view** (`meta.fixed: true`, a module's choice, for a map plus a sheet). The frame puts
  `class="f-fixed"` on `<html>`: no page scroll (`html, body { height: 100%; overflow: hidden }`, the body `100dvh`), the
  header stays at the top, the view takes the grid row between the header and the bar (phone) or the bottom of the window
  (screen), without padding; the module's root `section.f-module` is `height: 100%; min-height: 0; display: flex;
  flex-direction: column`. A fixed module gets neither the folded help panel nor the welcome card (no room; the "?" of the
  header opens its chapter, on a phone as on a screen). A frame screen opened over it (Settings, help,
  conflicts) scrolls as a page. Without `fixed`, nothing changes. **Nothing sits between the header and the module**: no
  sub-tabs row, no padding, no margin (the module's top is `--f-head-h`, measured at 57 px in `maps` and `atmosphere`, 390 and
  1280 px).
  - **Overlay layer** (24 Oct 2026, `frame/INTEGRATION.md` § 9.3): the only controls allowed between the header and the
    module's data block are buttons drawn *over the map*, in a layer the frame gives every fixed module (`ctx.overlay`): a
    left column and a right column of round 44 px buttons (`.f-ov-btn`, 48 px hit area), laid on the module's map area (the
    child of its root that grows) and never on the sheet. Where a column is too long for a low map it wraps to a second
    column on its left. In landscape on a phone the gap between buttons is 4 px (six buttons fit a 333 px map before the column
    wraps).
  - **Full screen** (24 Oct 2026, § 9.4): the frame appends a button to the right column of every fixed module (not in a
    pane) that toggles `<html class="f-full">`: the header and the bar (phone) or the rail (landscape phone), the header and
    the rail (screen) are hidden and the view takes the whole window (`--f-view-h` = `--f-vh`, less the device's safe
    areas); **no exit chip** (removed 24 Oct: the column's button, which then shows "minimize", and Escape leave); it is
    remembered while the page lives (also under a frame screen opened over the module) and reset at a module change; the
    window gets a `resize` event after each change. **Judgement call: on a screen the rail is hidden too** (not folded to
    icons), so the map gets all the width. In landscape on a phone the sheet's column stays and the map takes the rest.
  - **Heights given to modules** (`frame/frame.css`, `:root`): `--f-head-h`, `--f-vh`, `--f-view-h`, `--f-split-h`,
    `--f-pane-h` (INTEGRATION § 9.2). In a dual view the frame itself gives a fixed module its height: the split main
    (`html.f-fixed .f-view.f-split > .f-module`) `--f-split-h`, the module of the pane (`.f-pane > .f-module[data-fixed]`)
    `--f-pane-h`.
  - **Low specificity**: the fixed layout of the module root (`display: flex` column, `height: 100%`) is under `:where()`,
    so any rule of the module (`[data-module="x"] { display: grid }`) outweighs it with no `!important`.
- The address `#<module>` is enough to come back to a screen. What follows a `?` is given to the module as
  `ctx.query`, an object: `#report?from=flightlog` opens report with `{ from: 'flightlog' }`.
- **Usage level**: the device's level (`device/level.json`, 1 to 3, 2 by default, chosen in Settings only) filters
  the menu: a module is listed when its `meta.level` (1 by default) is at most the device's level. A hidden module
  stays reachable by its address. The frame reads each module's `meta.level` once at start.
- **Header on a phone** (760 px or narrower, rule 14, 24 Oct 2026; the name is the module's title for a non-fixed module, rule 16 below): **name · "?" · ⚙ and nothing else**, never wider than
  the window (no menu button; the "←" back button takes the name's place after a passage). "?" (`#fHelp`) opens the help
  chapter of the current screen (the Settings chapter when Settings are open), ⚙ (`#fDevice`) the Settings screen and carries the
  state badge. The synchronisation dot, the trigram pastille, the position and the launcher badges are not drawn: their state
  is the colour of the ⚙ badge and the lines of the Settings status block (above). Above 760 px the header keeps all of them,
  as before, without an "i".
  - **One row, always**: the header is exactly `--f-head-h` (57 px = 6 + 44 + 6 + the 1 px rule) high, at every width and in
    every state, in the five designs (`height: var(--f-head-h)`, no wrapping, children with no vertical margin). The "back"
    button used to make it 73 px: it shares the class `f-back` with the help's "←" paragraph, whose 4 px + 12 px margin
    added 16 px (DECISIONS, 24 Oct 2026); that rule is now `p.f-back`.
  - The page grid's columns are `minmax(0, 1fr)`, so content never widens the page.
  - The header hides its overflow. The back button shows its arrow only.
  - Each button is a 44 px target that shrinks only when the header is crowded; the page stays at 375 px.
- **Non-fixed modules on a phone** (rule 16, 25 Oct 2026, user's proposal): three rules.
  - **The module's title is the header's name.** A module that is not fixed and declares `meta.title` shows it in `#fName` under
    760 px, in place of the application's name; `<html class="f-titled">` then clips the module's own `h1` to 1 px (it stays for
    screen readers), so the page starts at its content. Fixed modules, the frame's screens (Settings, help) and every width above
    760 px keep the application's name and the visible `h1`. The name follows the viewport (a media-query listener, no timer). When
    the "←" back button is shown, the name is hidden as before, except the module's title, which stays (it is the screen's name).
  - **The "How to use" card has a ✕** (44 px, "Hide" ×4); dismissed, it stays hidden on the device, per module
    (`device/help.json`, `hidden: { <id>: true }`, cache policy), and comes back from the module's chapter in the help
    ("Show the first steps again", under the chapter title, shown only for a dismissed module; it clears the flag, unfolds the
    card and returns to the module). The "Première fois ?" card keeps its own ✕ and its own state (`welcomed`).
  - **The "?" lands on the right paragraph.** `ctx.helpAnchor` (`frame/INTEGRATION.md` § 2) gives the anchor of the current
    screen or step; the address is `#help?m=<module>&a=<anchor>` (a link of the contents is `#help?a=…`: no highlight, the
    highlight is the mark of a contextual arrival). The paragraph is scrolled under the sticky header and highlighted 1.5 s
    (class `f-hl`, accent at 20 %, fades out), once. Fuel: Quote (`fuel-quote`, the whole quote on a wide module), steps
    `fuel-step-1` … `fuel-step-5` (the step shown), Sheets (`fuel-sheets`); Report: `report-step-1` … `report-step-3`
    (`report-steps` on a wide module); Flights: `flightlog-list`, `flightlog-detail` (a line unfolded), `flightlog-current`
    (a flight started). Test A17; A18 for the card; A2 for the header.
- **Times**: every time the application shows is in UTC with the suffix Z (`frame/lib/time.js`). The device's local
  time is added in brackets only next to the departure, the planned arrival and the engine start.
- The frame has three screens of its own: `#help` (`frame/help/SPEC.md`; the header's ? opens it at the current
  module's chapter), `#conflicts` and `#settings` (`#device`, its former name, opens it too;
  `frame/settings/SPEC.md`); and the service screens declared in `APP.screens` (INTEGRATION § 13), drawn by a service and
  loaded on demand: today `#sources` (aerodb's data sources, Full level, links only, `frame/aerodb/SPEC.md` § 5 sexies), which
  replaced the data laboratory `#datalab` on 28 Oct 2026.
- **Start**: the frame mounts the first module as soon as the shell, the device's settings and the transport are
  there. It never waits for a first synchronisation or for the airline's settings.
  - Over a repository's first pass, reading the airline's settings costs the whole ref → commit → tree chain (2.8 s
    at Fast 3G). The frame reads them in the background, and `ctx.airline` always gives the latest.
  - When they arrive or change, `frame-airline` is dispatched on `window`.
  - The relay waits for that first reading only for a host it does not otherwise know (it may be the airline's site).
  - The launcher is looked for only over http: a launcher never serves https, so GitHub Pages saves a round trip.
- **Loaded on demand**: the scripts of Settings (`settings/admin_links`, `config`, `join`, `lib/qr`,
  `settings/settings`), of the help (`lib/markdown`, `help/help`) and of the roadmap (`help/roadmap`) are not in
  `index.html`. The frame injects them, in order, the first time their screen opens (`need`).
  - A screen left while its scripts load draws nothing: the address is checked after loading.
  - A module's help (its folded panel, the welcome card) loads after the module has mounted, never before.
  - `ctx.help.open()` opens the panel already drawn; `ctx.help.link()` is an address.
  - So the menu and the first module never wait for them. The service worker keeps them like the frame's other
    files, so they open offline.
- **The frame's screens** (help, roadmap, settings, conflicts) opened from a module show in the module's area, over
  it. The module stays mounted, only hidden, with its pane.
  - The rail (screen) or the bar (phone) stays in place, with the current module still marked; over Settings, no tab of
    the bar is selected (the ⚙ is the pressed button).
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
  - Choosing a module in the rail or a tab from a frame screen closes it and opens that module.
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
  - `meta`: `{ id, title, apps, level, reads, writes, files, lazy, net, fixed }`; `id` must match its folder; `fixed: true` asks for
    the fixed, full-height view (§ 3.1); `title` (four texts) is the title a non-fixed module puts in the phone's header (§ 3.1,
    rule 16);
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
| `weather` | the device's weather layer (INTEGRATION § 14): `aloft`, `grid`, `metar`, `taf`, `world`, `modelFor`, `run`, `spentToday`, all asynchronous; one cache `cache/weather/`, one count of the calls to Open-Meteo |
| `query` | read only: the part of the address after `?`, as an object (empty when there is none) |
| `live` | the actual position during a started flight (on a device of the local network, the computer's simulator, never the device's GPS): `{ status ('off', 'waiting', 'tracking'), source ('xplane', 'lnm', 'gps', 'ivao', 'vatsim', ''), last ({ at, lat, lon, altFt, gsKt, trackDeg, source }), gps, enable(), disable() }` (below) |
| `help` | `open(subject)` opens the module's folded "How to use" panel at that paragraph; `link(id)` gives `#help?m=<id>` (`frame/help/SPEC.md`) |
| `helpAnchor(anchor)` | the anchor of the paragraph of the module's chapter that describes the screen or step shown (an id, a function returning one, or `null`); the header's "?" opens `#help?m=<id>&a=<anchor>` and the manual highlights that paragraph once (rule 16) |
| `airline` (event) | `frame-airline` on `window` when the airline's settings arrive (read in the background at start) or change; `ctx.airline` then gives them |
| `tab` | the id of the bottom-bar tab (`APP.tabs`) that groups this module (`'prepare'` for fuel), `null` if it has none (§ 3.1) |
| `overlay` | a fixed module only (`meta.fixed`), `null` otherwise: the overlay layer over its map, `{ left, right, button({ icon, label, onClick, pressed, side }), over(el), refresh(), full }`; the frame adds the full-screen button to `right` (not in a pane) and fires `frame-fullscreen` then `resize` on `window` when it changes (§ 3.1, `frame/INTEGRATION.md` § 9.3, § 9.4) |
| `layout` | the dual view: `{ with }`, the module shown beside this one (the pane for the current module, and the other way round), or `null`. The frame dispatches `frame-layout` on `window`, with `{ main, pane }`, each time the pane opens or closes (Fuel hides "Show the map" while Maps is beside it) |

- **Actual position during a flight** (`ctx.live`, a frame service):
  - **When**: it runs while `pilot/<trigram>/current_flight.json` has `started` (set back to null when fuel cancels the
    flight or report saves the report), whatever module is open. It never runs for a flight started more than 24 h
    ago: a forgotten flight does not keep the GPS on.
  - **Sources, in order**:
    0. **This computer's flight simulator**, when a launcher serves the page: `GET /__setup/sim/position` every 5 s.
       - The launcher (`tools/sim_position.py`) asks X-Plane 12's web API (port 8086), then Little Navmap's web
         API (port 8965, `/api/sim/info`). It answers `{ lat, lon, altFt, trackDeg, gsKt, source: 'xplane' | 'lnm',
         at }`, or 204 when no simulator gives a position.
       - The two ports can be changed in `tools/.sim.json` (`{ "xplane": 8086, "lnm": 8965 }`, local, never
         versioned). The host is always the local machine, and the launcher makes at most one pass a second.
       - X-Plane: the datarefs' ids are resolved once by name and again after a restart. Altitude comes from
         `elevation` (MSL), and track from `hpath`, or `true_psi` below 1 m/s. No flight loaded, or a position at
         0° / 0°, means no position.
       - Little Navmap: `indicated_altitude`, `ground_speed`, and the magnetic `heading` as track (it gives no track).
       - The badge shows "X-Plane" or "Little Navmap". While the simulator has given a position in the last 15 s, the
         GPS and the network wait. At start, the simulator is asked first, before the GPS.
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
    - **Cleared** (`actual: null`) when the service stops, whatever stopped it: report saved, departure cancelled, flight
      older than 24 h, here or on another device.
    - Cleared too at a new departure when it is older than `started.at`.
    - So a new flight never shows the previous one's position. Maps also ignores an `actual.at` older than
      `started.at`. It goes through the shared `merge` of
    `frame/lib/current_flight.js`, on the record re-read just before.
    - This is the form maps reads: `at` is ISO, `source` is `xplane`, `lnm`, `gps`, `ivao` or `vatsim`, and `trackDeg` / `gsKt` may be
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
  - It is entered on the device in Settings › Weather key and kept with the GitHub token in `device/keys.json` (IndexedDB,
    policy `cache`, like the identity; it was in `localStorage` `githubData:avwx`). `FrameData.dump()` leaves that file
    out, a backup never carries it, and it is never in the repository.
  - The frame adds it to the call itself; no page or module ever reads it back.
  - The settings screen gets `weatherKey { has(), save(key), clear(), test(icao) → { ok, status, message } }`.
- A module loads no global style sheet. It uses the frame's tokens (`--sog-*`) and primitives (classes `f-…`): the
  list, the designs (standard, cabinet, field), day / night and print are in `frame/design/SPEC.md`, the module's
  rules in `frame/design/INTEGRATION.md`.
- Day / night follows the system, and Settings may force either.
- `modules/hello/` is the example module, for developers only. It shows a shared prefix, a cache file, `watch` and
  the texts. It is not part of the Pilot application (no menu entry, no cached copy, no help). On a development
  workstation, `localStorage['sogFrame:dev'] = '1'` adds it to the menu as "Example", and it is kept for offline
  use like the other modules.

### 3.3 Synchronisation control

- The header button shows one state at a time, in this order:
  - in progress;
  - n conflicts;
  - on this device (local transport, nothing pending);
  - offline, with the number of pending writes;
  - synchronisation error;
  - n pending;
  - up to date, n minutes ago.
- Its tooltip gives the transport, the last success, the pending count and the last error, then the pending writes:
  path, module that wrote it, time (five at most). `FrameData.status().queue` gives the same list
  (`[{ path, module, at, deletion }]`, newest first) to the settings screen's synchronisation card.
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
- **A write refused for good** (`side: 'refused'`): the transport refused that file itself, not the batch's timing
  (the launcher: a path or file type it never accepts, answered 400 with that `path`).
  - The data layer takes the write out of the queue, so the next writes leave and the button no longer shows a
    permanent error.
  - The screen says "Write refused: <path> — take it back or set it aside", with the transport's reason and what was
    to be written (a deletion says so).
  - "Take this version back" queues it again (after, for instance, setting the trigram); "Seen" sets it aside.
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
- **No trigram yet**:
  - A header button "Trigram?" opens Settings, with the tooltip "until then, your documents stay on this device and
    nothing is sent". A notification says the same once per device (`localStorage` `sogFrame:trigramAsked`).
  - Once the trigram is set (on loading the device, and after each successful pass, which may have read a
    `pilot/ANON/` already in the repository), every document of `pilot/ANON/` moves to `pilot/<TRI>/`:
    - absent there: copied;
    - present on both sides: the newer `updated_at` wins and the other is kept in the conflicts (`side: 'anon'`);
      identical: nothing;
    - then the `pilot/ANON/` document is removed, which sends its deletion when the repository held it;
    - a notification says how many were taken over.
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
- The GitHub token is entered on the settings screen, kept in `device/keys.json`, and never shown again; "Cut
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
  - The page (`frame/`) is kept as `frame/index.html` and checked again at that same address. The launcher stamps
    `index.html` but not the folder address, so comparing the two would always find a change.
  - Without a copy, the file comes from the network and is kept. Offline with no copy: a 503 marked
    `x-sog-offline`.
- **Installation**: the frame's files are kept. The page then sends every file of every module of its application
  (message `precache`): each entry point and the files its `meta.files` declares (paths relative to `module.js`). So
  every module opens offline after the first visit, even one never opened. A file a module imports without declaring
  it is kept the first time it is loaded; a module that fails to load sends its entry point only.
- **Help**: only in the application's language at installation. The page adds to `precache` the files that
  `SogHelp.files(lang)` gives: the manual `pilot.<lang>.md`, and each tutorial in that language, plus English when the
  language is neither French nor English. Another language, and the tutorials' captures, are kept the first time
  they are read.
- **New version**:
  - when a background check finds a changed file, all copies are fetched again, so the new version arrives whole;
  - then the open pages receive `sog-frame-update` and the frame shows "A new version of the app is ready" with a
    "Reload" button.
  - "Reload": if a service worker is waiting, the page asks it to take over (`skip-waiting`) and waits for
    `controllerchange`. Otherwise it asks the active worker to fetch every copy again without the browser cache
    (`refresh`, answered on a message port). Then it reloads. It waits 8 s at most, then reloads anyway.
  - A launcher clears its site's browser cache at its first page (`Clear-Site-Data`), so after a launcher restart the
    new version is simply served.
- **No storage for copies** (private browsing, quota, failure): the service worker installs anyway and lets requests
  through to the network. The application works, without offline.
- **Manifest**: name "SOG — Pilote", start and scope `./`, standalone display, colours, SVG icon.
- **Orientation**: locked to portrait for now (`orientation: portrait` in the manifest, `screen.orientation.lock`
  attempted when the application runs installed; a browser page cannot be locked and the call's failure is ignored).
  The Capacitor shell of the V3 frame, when it is built, sets `UISupportedInterfaceOrientations` to portrait on iPhone
  (iPad keeps every orientation) and `screenOrientation="portrait"` on Android. The landscape layout is to decide
  (`docs/technique/V3_SPECIFICATION.md` § 7.1); the lock goes when it exists.
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

A module never imports from another module. Code that two modules need goes to `frame/lib/<name>.js`. It is owned by
one module (or the frame), which alone changes it; the others import it as it is. Such code is pure functions (no
page, no storage, calls through the `ctx.net` or reader they are given), or, for `dom.js`, rendering helpers that
touch only the element they are given.

| File | Owner | Used by | What it does |
|---|---|---|---|
| `frame/lib/last_flight.js` | report | report, flightlog | "my last flight" on IVAO and VATSIM (the V2 launcher's route in JavaScript): the flights of the last 7 days, then one flight's details |
| `frame/lib/js-yaml.min.js` | flightlog | flightlog | js-yaml 4.1.0, a copy of V2's vendored library, to read V2's YAML registry |
| `frame/lib/external_links.js` | fuel | fuel | "Open in" links (SimBrief, SkyVector, Navigraph, ChartFox): the pure part of V2's `shared/external_links.js`, translation passed as a parameter |
| `frame/lib/current_flight.js` | fuel | fuel, report, maps, the frame | `merge(stored, mine, { fields, progressKeys, by })`: each author of the current flight (`pilot/<trigram>/current_flight.json`) re-reads it and replaces only its own fields; `progress.actual` belongs to the frame (its position service writes it with `progressKeys: ['actual'], by: 'frame'`) |
| `frame/lib/clipboard.js` | fuel | fuel, report, website, settings | `copyText(text, { box, near })` → `'clipboard'` \| `'exec'` \| `'shown'`, and `canPaste()`: copies also over http (a paired tablet has no `navigator.clipboard`), falling back to `execCommand` and then to a selected field shown next to the button |
| `frame/lib/time.js` | frame | the frame, fuel, maps, report | the application's times: all in UTC with the suffix Z. `fmtZ(iso)` → "16:30Z"; `fmtZLocal(iso)` → "16:30Z (18:30)", the device's local time in brackets, only next to the departure, the planned arrival and the engine start; `fmtDateZ(iso, lang)` → "23/10/2026 16:30Z", the UTC date in the language's writing. The frame uses it for its own times (sync button, conflicts, position badge) and gives it to Settings (`time`) |
| `frame/lib/dom.js` | frame | any module (fuel, report, flightlog first) | `keepScroll(box, draw, { focus })`: draws without moving the scroll and without losing the field being typed in. It keeps the scroll position of every scrolling container above `box` (the page included) and holds `box`'s height during the draw. It puts the positions back after the draw and on the next two frames. It finds the focused field again (by `data-k` / `data-i`, or by `id`) and restores its value, its focus (`preventScroll`) and its selection. It replaces the three copies made in fuel, report and flightlog |
| `frame/lib/icons.js` | design | frame, any module | the line icon set (V2's 53 icons plus `menu` and `wand-sparkles`), `svg(name)` |
| `frame/lib/markdown.js` | help | the frame's help screen | the Markdown rendering of the help, copied as it is from V2 (`apps/aide/markdown.js`); a classic script loaded with the frame |
| `frame/lib/metar.js` | fuel | fuel | the raw METAR decoder to the JSON form of aviationweather.gov, and the conversion of avwx's METAR / TAF to that form (weather without a launcher) |
| `frame/lib/weather_store.js` | frame | the frame (`ctx.weather`); fuel and atmosphere through it | the weather layer: one cache by model, cell and UTC day, Open-Meteo only for what is missing, the weighted count and its limits, METAR / TAF, the published world forecast (INTEGRATION § 14); bench `frame/lib/test/weather_store.html` |
| `frame/lib/route_text.js` | fuel | fuel, maps | the route text, pure: `tokenize`, `textFromTokens` (normalised "DEP PT1 UN869 PT2/F280 … ARR"), `textFromPoints` (the text rebuilt from edited points, airways kept between two unchanged neighbouring points), `icaoCoord` |
| `frame/lib/geo.js` | maps, atmosphere (its own copy until its next lot) | maps, fuel (`winds.js`), atmosphere | longitudes around the date line, pure: `wrapLon(lon)` ([-180, 180[), `nearLon(lon, ref)` (the copy within 180° of `ref`), `unwrapLons(points)` (a route on continuous longitudes: `{ lat, lon }` or `[lon, lat]`, the same object back for a point already continuous). A module unrolls its route first, wraps what it sends to a service or a cache, compares modulo 360. Bench `frame/lib/test/geo.html`. Contract: INTEGRATION § 12 |
| `frame/lib/sheet.js` | frame | maps, atmosphere (any fixed module) | the three-position sheet under a map (collapsed / default / expanded): `createSheet({ root, panel, head, grip, pos, ignore, labels, locked, onChange, onSettle })` → `{ pos, set(pos, instant), settle(), stop() }`. The header line is the drag handle (pointer capture, live follow by one CSS variable written once per move, a 200 ms glide to the nearest position, flick above 0.8 px/ms to the next one, a tap collapses or restores and never expands; **while the sheet moves a module redraws nothing and `onSettle` is called once, when the size has stopped**: V3 spec § 7.1 rule 19), the keyboard and the ARIA of the grip are done; heights are the frame tokens `--f-sheet-*` read from the root, the look is `.f-sheet*` in `primitives.css`. **Under `html.f-land` (landscape on a phone) the sheet is a column at the right of the map**, as high as the view, two positions (`default` 40 % of the root's width, 280 px at least; `expanded` 60 %; tokens `--f-sheet-side`, `-side-min`, `-side-max`), no collapsed position, a tap toggles the two, a horizontal drag is accepted; `onChange` / `onSettle` give the same names, `frame-orientation` makes it re-place itself. It writes no text (the caller passes `labels`) and keeps no state (the caller keeps the position). Contract: INTEGRATION § 11 |
| `frame/lib/website.js` | website | report, website | the flight's fields for the airline website, the `#defa=` address, the line to copy, the "→ Vol" bookmark (moved from `modules/report/website_handoff.js`) |

### 3.10 Devices of the local network (`tools/lan_access.py`, `tools/launch.py`)

A pilot flies on the computer (the launcher, X-Plane) and wants the Pilot application on a tablet or a phone. The
launcher can serve that device over the local network, so the device works as the computer does: the computer's
`data/` (launcher transport), the simulator's position, and the launcher's network relay.

- **Opening**: only on an explicit choice, until the launcher stops.
  - Either `lancer.cmd --lan` (`launch.py --lan`), or the computer's own Settings, through `POST /__setup/lan
    { open: true | false }` (settings context: `lan()`, below).
  - The launcher then also listens on the computer's **private IPv4 address of the default route** (10/8,
    172.16/12, 192.168/16), on the same port. Its other private addresses (VPN, WSL, Hyper-V, Docker) are opened
    only on request (`{ open: true, all: true }`, "Open them too" in Settings); on an access already open this adds
    the addresses and leaves the code as it is: it never issues one, nor reopens a pairing closed by wrong codes (only
    "New code" does, 28 Oct 2026). It never listens on `0.0.0.0`, so
    no public interface is opened, and the port never clashes with 127.0.0.1.
  - The console shows the address of the Pilot application (`http://<ip>:<port>/frame/`) and the pairing code.
- **Every request from the local network**:
  - It must come from a private address (or loopback) and name the exact host (`<ip>:<port>`). A domain name that
    points here ("DNS rebinding") is refused with 403.
  - It must carry the pairing cookie. Without it, a page request gets the pairing page (401), anything else a 401,
    files of `data/` included. Over http outside the computer the browser sends no `Sec-Fetch-Site`, so the strict
    cookie is what keeps other websites out.
  - Then only the Pilot application's launcher routes are open: `GET status, changes, sim/position, lnmperf,
    lnmperf-folder`, and `POST batch, sync, net`. They still need `X-SOG-Setup`. Everything else (keys, clone,
    adopt, imports, maintenance, relax, `/__setup/lan`) answers 403 "reserved to the computer". A `PUT` is never
    open.
- **Pairing** (`/__lan/pair`, a form without script, in the browser's language):
  - The 6-digit code is shown in the console and in the computer's Settings. It works **once** and lasts
    **10 minutes**: after a pairing, or past that time, there is no code until the computer asks for a new one
    (`POST /__setup/lan { code: true }`, "New code"). Opening the access issues the first.
  - Once the code is right, the device gets a long random token as a cookie (`sog_lan_<port>`, so two launchers on
    one computer keep their devices apart; `HttpOnly`, `SameSite=Strict`, one year), then goes back to the page it
    asked for (a path of this server only).
  - Only the token's SHA-256 is kept, in `tools/.lan.json` (local, git-ignored), so a device pairs **once**: it stays
    paired when access is closed and reopened, or the launcher restarted, as long as the computer keeps its address.
  - 5 wrong codes from one address: a one-minute wait (429). 30 wrong codes in an hour, all addresses together:
    pairing **closes** (403) until the computer asks for a new code.
  - A device is forgotten on its own (`{ forget: '<id>' }`, "Forget" next to it), or all of them (`{ forget: true }`,
    "Forget the devices"). A forgotten device must enter a code again.
- **`GET /__setup/lan`** (computer only): `{ on, urls (opened, the main first), available (every private address),
  code, expires (s), closed, devices (count), paired ([{ id, label, at }]: a short name from the browser, never the
  hash), host }`.
- **A paired device is a trusted member**, as the computer itself for the Pilot application's data: it reads and
  writes all of `data/` (records, `utilisateurs/`, `airline/settings.json`…) through the batch, and triggers the git
  exchange. Pair only your own devices.
- **Writes** (every page, the computer's included; `frame_batch`, `data_file()` in `tools/launch.py`):
  - A path is taken as it is, never normalised. A path with `\`, `:`, a control character, an empty, `.` or `..`
    component, a component ending with a dot or a space, a Windows device name (`CON`, `NUL`, `COM1`…), a hidden
    component or an excluded folder is refused (400). Then the real path (links, junctions) must stay under `data/`.
  - Only data files may be written: `.json`, `.yaml`, `.yml`, `.md`, `.txt`, `.csv`, `.geojson`, `.fms`, and `.js` in
    the data format (`tools/data_guard.py`). A page, a vector image or an XML, which the browser would run from the
    same origin as `/__setup/`, is refused. A deletion may name any data file.
  - At most 5,000 changes a batch. A request body from the local network is 16 MB at most (413).
  - The tree of `data/` follows neither links nor junctions. A device of the local network gets the tree computed
    less than 2 s ago again (a batch clears it).
- **Relay** (`POST /__setup/net`, every page): https only, to the application's hosts or the airline's site. The
  address really reached must be public, checked before TLS and at every hop (a name that points to 192.168.x or
  127.0.0.1 is refused, 403). A redirect is followed only to such a host over https, and the IVAO key never follows
  to another host; otherwise the redirect is given back to the page as it is.
- **`GET /__setup/status`** also gives `host` (the computer's name) and `lan` (the request came from the local
  network). `FrameData.launcher.detect()` returns `{ data, dataGit, host, lan }`.
- **The page on the device** is not a secure context (http, not localhost), so:
  - there is **no service worker**, so no offline use. The application works without it, and the Diagnostic says so
    (`page: { secure, offline, launcher }`);
  - there is no `crypto.subtle`, so the data layer computes git blob hashes with its own SHA-1;
  - the device's GPS is not offered: the badge says why. The simulator's position comes from the computer;
  - the clipboard (`navigator.clipboard`) is missing, so modules' "Copy" buttons must cope with its absence.
- **Header badge**: "Launcher on <computer>" while the page comes from another device of the local network (muted,
  truncated when narrow). Its tooltip says the data, simulator and relay are the computer's, and that offline use
  is not available.
- **Settings context** (computer only; `null` on a paired device): `lan()` returns `{ state(), open(), close(),
  forget() }`, each resolving to the `GET /__setup/lan` state. The card "Computer access" (code, addresses, QR code
  through `SogQR`, open / close, forget) belongs to `frame/settings/`.

## 4. To come in the frame

Usage levels, a language choice, designs taken from V2, the backend transports.

**Debts, dated**:
- 28 Oct 2026: Settings' `setup()` and `aerodb/lnmperf.js` call the launcher with `fetch` (the data laboratory, removed the same day, did too). They move
  onto `ctx.launcher` in the frame lot after the weather layer (INTEGRATION § 7).
- 28 Oct 2026: the frame still reads flightlog's `pending.json` (schema 2) until flightlog publishes its
  `status.json` (INTEGRATION § 10.0).
- 28 Oct 2026: fuel's own request for the winds aloft (`aloftFetch`, `cache/fuel/aloft.json`) and Atmosphere's store
  (`modules/atmosphere/weather_store.js`) stay until their readers' lots move them onto `ctx.weather` (INTEGRATION § 14);
  their calls are not in the weather line's count until then.
