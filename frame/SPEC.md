# V3 frame — specification (regeneration prompt)

This document describes the frame of the V3 suite well enough to rebuild it without its code. It grows lot by lot;
today it covers the **data layer** (`frame/data/`). The decisions behind it are in [DECISIONS.md](DECISIONS.md), the
way a module plugs in is in [INTEGRATION.md](INTEGRATION.md), the project brief is
`docs/technique/V3_SPECIFICATION.md`.

**As a prompt**: give this document whole and ask for plain JavaScript files (classic scripts, no build, no ES module
syntax) defining `window.FrameData` and its transports. Every rule below is a requirement; section 2.8 (invariants)
always wins.

## 1. Purpose

The frame is what every module of every V3 application stands on: data, navigation, texts, notifications, module
loading. Its heart is the data layer: **disconnected mode is the normal state**. Every device works on its own copy;
exchange happens in batches, explicitly or periodically, through a transport the device's usages select.

## 2. Data layer (`frame/data/frame_data.js`)

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

### 2.5 Merging a file changed on both sides

- **Trivial cases first**:
  - same text on both sides: keep it;
  - the remote equals the base: keep the local text;
  - the local text equals the base: take the remote.
- **Otherwise, the rule declared for the prefix** (the longest declared write prefix):
  - `record` (default), one record per file: the newest `updated_at` wins, the local one on a tie. The loser is
    stored in `conflicts` and an event `frame-data-conflict` is fired. Never a blocking question.
  - `journal`, an append-only `{ entries }`: union, sorted by `at`. No loss.
  - `keyed:<field>:<key>[+<key>]`, a list of records in `<field>` identified by those keys: merged record by record
    (added on one side: kept; removed on one side and unchanged on the other: removed; changed on both sides: the
    newest, the loser kept).
  - A function `(base, local, remote) → { value, lost }`.
- **Non-JSON text, or JSON that does not parse**: the local text wins and the remote one is kept.

### 2.6 Transports

A transport is `{ id, kind }`, plus, when its kind is `remote`, four methods: `head()`, `tree(head)` → `{ path: rev }`,
`read(path, rev)` → text, and `commit(changes, message, parent, remote)` → new head.
- A network failure throws `offline`.
- A refused fast-forward throws `conflict`.
- A refusal (token, rights) throws a readable message.

The transports:

- **`local`** (only "single user" ticked): no exchange. A pass applies the queue to the cache, and the cache is the
  truth.
- **`github`** (`frame/data/transport_github.js`): the data repository through the GitHub git data API, with a
  fine-grained device token (contents read and write on that repository only). The token is kept in `localStorage`
  `githubData:frame`, excluded from browser backups.
  - `head` is a conditional request on the branch ref: a 304 costs no rate limit.
  - `tree` gets the commit, then its recursive tree.
  - `read` reads a blob (immutable).
  - `commit` makes one tree on the parent's tree (content for written files, `sha: null` for removed ones; a removal
    of a file absent from the tree is skipped), one commit, then a non-forced ref update.
  - A truncated tree is an error.
- **To come**, same interface: `launcher` (workstation: the `data/` folder and git through the launcher, one commit per
  batch), web service, the PHP site.
- **Usages to transports**: single user → local; one user on several devices → github, or launcher and git; several
  users → github, or launcher and git; backend → web service. The interface shows only what the ticked usages need.

### 2.7 The data part of a module's adapter

`FrameData.adapter(declaration)` registers what the module reads and writes and returns:

| Method | Rule |
|---|---|
| `get(path, opts)` | the value (parsed JSON or text), or null |
| `read(path, { policy, wait })` | `{ value, text, rev, cached, pending, at }` or null. `wait`: for a file never fetched, wait for the network; without it, null now and the value comes through `watch` |
| `list(prefix)` | the paths, from the last known tree plus pending writes; null if no tree was ever read (the local transport lists the cache) |
| `put(path, value)` / `remove(path)` | queued; refused outside the module's declared writes |
| `watch(prefix, fn)` | fn(paths) on changes; returns the unsubscribe function |
| `status()` / `onStatus(fn)` | `{ transport, online, syncing, lastSync, lastError, pending, conflicts }` |
| `sync()` | asks for a pass now |

The declaration has the form `{ id, reads: [prefix | { prefix, policy }], writes: [prefix | { prefix, merge }] }`.

### 2.8 Invariants

1. No read and no write ever waits for the network, except a first read with `wait`.
2. A write is never lost: it stays queued until a pass has sent it, whatever fails in between.
3. One pass sends one commit, whatever the number of writes.
4. A version is never overwritten without being kept: a losing version goes to `conflicts`.
5. A module writes only under its declared prefixes.
6. No key or token is ever written to a file, a backup or the repository.

## 3. To come in the frame

Module loader (adapter: data, texts, notify, ask, identity, `aerodb` service), navigation and usage levels,
translation, notifications and confirmations, the synchronisation control, designs taken from V2.
