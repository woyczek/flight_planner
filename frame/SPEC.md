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

- **`local`** (only "single user" ticked): no exchange. A pass applies the queue to the cache, and the cache is the
  truth.
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
| `put(path, value, opts)` / `remove(path)` | queued (or written to the cache for the `cache` policy); refused outside the module's declared writes |
| `watch(prefix, fn)` | fn(paths) on changes; returns the unsubscribe function |
| `status()` / `onStatus(fn)` | `{ transport, online, syncing, lastSync, lastError, pending, conflicts }` |
| `sync()` | asks for a pass now |

The declaration has the form `{ id, reads: [prefix | { prefix, policy }], writes: [prefix | { prefix, merge | policy }] }`.

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
- The address `#<module>` is enough to come back to a screen.
- **Usage level**: the device's level (`device/level.json`, 1 to 3, 2 by default, chosen in Settings only) filters
  the menu: a module is listed when its `meta.level` (1 by default) is at most the device's level. A hidden module
  stays reachable by its address. The frame reads each module's `meta.level` once at start.
- The frame has two screens of its own: `#conflicts` and `#settings` (`#device`, its former name, opens it too;
  `frame/settings/SPEC.md`).
- Touch targets are at least 44 px high. There is no horizontal scroll at 375 px.

### 3.2 Module loader and context

- A module is `modules/<id>/module.js`, an ES module loaded on demand with `import()` (never a synchronous script).
- It exports:
  - `meta`: `{ id, apps, level, reads, writes, files }`; `id` must match its folder; `files` lists the other files
    the module imports, as paths relative to `module.js`, so that they are kept offline from the installation
    (§ 3.6);
  - `mount(el, ctx)`;
  - `unmount()`.
- Before mounting a module, the frame unmounts the previous one and empties its element.
- The context `ctx` is everything the module may use:

| Field | What it is |
|---|---|
| `data` | the module's part of the data layer (2.7), limited to the prefixes of its `meta` |
| `aerodb` | the aeronautical service, one instance for all modules (`frame/aerodb/INTEGRATION.md`) |
| `t(row, vars)`, `lang()` | texts as `[fr, en, de, es]` rows, `{name}` filled in, French typography; the language of the application |
| `notify(text, kind)` | floating notification (`info`, `ok`, `warn`, `err`), closed by itself or by its ✕ |
| `ask(text)`, `askText(text, { value })` | the frame's own question windows (never a native dialog); promise of true / false, of the text or null |
| `net.fetch(url, init)`, `net.online()` | outgoing calls through the frame, never an exception: offline or on a network failure, an immediate 503 marked `x-sog-offline`; same origin: direct; SimBrief, IVAO, VATSIM: relayed by the launcher when the page is served by one (`POST /__setup/net`), otherwise direct for the sites that allow it (SimBrief, IVAO); any other site: 503 marked `x-sog-unreachable` |
| `identity` | read only: the identity record of the device (`trigram`, `ivao`, `vatsim`, `simbrief`), an empty object when there is none |

- A module loads no global style sheet. It uses the frame's tokens (`--sog-bg`, `--sog-surface`, `--sog-fg`,
  `--sog-muted`, `--sog-border`, `--sog-accent`, `--sog-ok`, `--sog-warn`, `--sog-err`, `--sog-radius`, `--sog-gap`,
  `--sog-touch`, `--sog-font`) and the frame's classes (`f-card`, `f-row`, `f-field`, `f-check`, `f-muted`,
  `primary`).
- The dark theme follows the system.
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
- A click synchronises and says what happened: received and sent counts, conflicts, offline, error. When there are
  conflicts, a click opens the conflicts screen instead.
- With the local transport, a write is applied to the cache at once.
- The button is written only when its state changes. It refreshes every 30 s, and when the network comes or goes.

### 3.4 Conflicts screen (`#conflicts`)

- Each unseen conflict shows the file and its date, the version set aside (this device's or another device's) and the
  version kept.
- Two actions: "Take this version back" (`FrameData.restore`) and "Seen".
- Conflicts already seen can be shown too.
- Never a blocking question.

### 3.5 Device: usages, identity, transport

- The device's settings are cache files, never synchronised:
  - `device/usages.json`: `single`, `devices`, `users`, `backend`;
  - `device/identity.json`: `trigram`, `ivao`, `vatsim`, `simbrief`.
  - The settings screen (`frame/settings/`) writes them, with `device/settings.json` for its own answers.
  - They cannot live in the shared repository: they decide how the repository is reached.
- **Transport chosen from the usages**:
  - no exchange ticked → local;
  - otherwise the launcher when the page is served by one (`__setup/status`), exchanging through git if `data/` is a
    git repository;
  - otherwise GitHub when a repository and a device token are set;
  - otherwise local, with a warning that nothing can be exchanged.
  - Changing the settings switches the transport at once.
- The GitHub token is entered on the settings screen, kept in `githubData:frame`, and never shown again; "Cut
  access" erases it (`FrameData.github.clear`).

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

## 4. To come in the frame

Usage levels, a language choice, designs taken from V2, the backend transports.
