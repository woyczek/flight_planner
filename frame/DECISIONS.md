# V3 frame — decisions log

The frame agent's memory: every choice, dated, with its reason. Newest last. Project-wide decisions are in
`docs/technique/V3_SPECIFICATION.md` § 8.

- **22 Oct 2026 — Lot 1 (reading) validated with the user**:
  - one cache (IndexedDB `sogFrame`) serves every read;
  - writes are queued and sent in batches, one commit per synchronisation;
  - transports are interchangeable and selected by the usages checklist;
  - the module contract goes through an adapter only.
- **22 Oct 2026 — Background synchronisation** (user, Q1): at start, on the button, and every 10 minutes while online.
- **22 Oct 2026 — Reference files** (user, Q2): read asynchronously through `get` / `read`, as JSON; no synchronous
  `<script>` loading any more. The heavy bases (SIA, aircraft) go through aerodb on the same cache.
- **22 Oct 2026 — Conflicts** (user, Q3): on a record, the newest `updated_at` wins. The loser is kept (store
  `conflicts`, consultable) and signalled (event `frame-data-conflict`, counted in the status), never a blocking
  question. Journals are united; keyed lists are merged record by record.
- **22 Oct 2026 — Transition** (user, Q4): V2 pages keep their data path; only V3 modules use `frame/store`.
- **22 Oct 2026 — Boundary with aerodb** (agreed with the aerodb agent):
  - the frame reads and caches files by path, with `read(path, { policy, wait })` →
    `{ value, text, rev, cached, pending, at }` | null and `list(prefix)` → paths | null (no tree ever read);
  - the `reference` policy: read-only, fetched at first read, kept while the revision is unchanged, revalidated during
    a pass, never queued, not prefetched;
  - aerodb owns the schema, cycle choice, parsing, indexes and its business API, mounted once as a service and handed
    to modules as `adapter.aerodb`; no module reads `sia/base/` or `AircraftDB/`;
  - revisions depend on the transport and are compared, never interpreted.
- **22 Oct 2026 — Revision = git blob sha computed locally** (SHA-1 of `blob <n>\0<content>`): after a push, the layer
  knows the new revision of each file it sent without re-reading the tree, and compares it exactly with the next tree.
- **22 Oct 2026 — GitHub transport through the git data API**, not the contents API:
  - one commit per batch (tree on the parent's tree, commit, non-forced ref update);
  - the head is read with a conditional request (304: no rate limit);
  - blobs are immutable, so never re-read.
  A refused fast-forward means "someone pushed": pull, merge, push again, at most three times.
- **22 Oct 2026 — Device token key `githubData:frame`**: inside the `githubData` prefix already excluded from browser
  backups by V2 (`shared/browser_store.js`), so no V2 change is needed.
- **22 Oct 2026 — A module writes only under its declared prefixes** (the adapter throws otherwise): the module's
  declaration is its contract and the synchronisation pulls only what mounted modules read.
- **22 Oct 2026 — `list` returns null, not [], when no tree was ever read**: a first launch offline must not look like
  an empty repository.
- **22 Oct 2026 — Tests**: `frame/store/test/index.html` against `frame/store/test/fake_github.py` (standard library; git
  data API in memory, real blob shas, commands to simulate another device, a push race, offline). 37 checks: offline,
  batch, pull and watch, record conflict, journal and keyed merges, race, reference policy, list before the first tree,
  write refused outside declared prefixes, local transport, git sha.
- **22 Oct 2026 — Folder `frame/store/`, not `frame/data/`**: the repository's `.gitignore` ignores `data/` at any
  depth (the data clone of a workstation), so `frame/data/` was silently left out of the first commit. Renamed rather
  than excepted, so that no later folder falls into the same trap; no V3 folder may be named `data`.
- **23 Oct 2026 — Lot 3, application skeleton**:
  - modules are ES modules loaded with `import()`; classic scripts remain only for the frame itself (data layer,
    transports, aerodb, app.js), loaded once;
  - the context is the only door to the frame.
- **23 Oct 2026 — Navigation**:
  - verbs in a left column on a screen, a drawer on a phone (≤ 760 px), opened by a menu button;
  - not a bottom bar: seven verbs do not fit one on a phone, and the drawer keeps one layout for one to seven
    entries;
  - `#module` addresses.
- **23 Oct 2026 — Device settings are cache files** (`device/usages.json`, `device/identity.json`, policy `cache`): the
  usages choose the transport, so they cannot live in the repository the transport reaches. The settings module will
  write them; until then the frame's `#device` screen does. With no usage of exchange: local only.
- **23 Oct 2026 — Shared prefixes** (fuel needs, via the ergonomics session): several modules may declare the same
  write prefix; the merge rule of the first declaration applies.
- **23 Oct 2026 — `cache` write policy**: device-local files, never queued nor sent, kept through pulls. It replaces
  any private IndexedDB in modules.
- **23 Oct 2026 — `ctx.net`**: outgoing calls go through the frame and never throw; offline is an immediate 503 marked
  `x-sog-offline`, so modules have one code path. A launcher relay is left for later.
- **23 Oct 2026 — `ctx.identity`**: read only, from `device/identity.json`, an empty object when absent.
- **23 Oct 2026 — Dates for merges**: `updated_at`, falling back to `updatedAt` (V2 performance sheets), record by
  record in `keyed` lists (`keyed:profiles:id`).
- **23 Oct 2026 — Launcher transport**:
  - the head is a hash of the `data/` tree (git blob shas, rehashed only when a file's size or date changes), so files
    written outside the frame (V2 pages, git pulls) are seen too;
  - a batch is refused (409) when `data/` moved since its parent, then the layer pulls and pushes again;
  - one local commit per batch in the author's name;
  - the git exchange with the remote is the existing `POST /__setup/sync`, called before and after a pass when the
    usages ask for it.
- **23 Oct 2026 — Taking a version back**: `FrameData.restore(id)` queues the kept loser again; nothing is overwritten
  without being kept.
- **23 Oct 2026 — Tests of lot 3**:
  - `frame/store/test/`: 46 checks, adding the cache policy, the shared prefix and restore;
  - the application through the fake GitHub: local by default, then GitHub (one commit per batch), conflict and
    restore, offline, 375 px and screen;
  - the launcher transport on a git copy of the data: headers required, tree without the SIA sources and the indexes,
    batch written and committed, refusal and retry when `data/` changed, path outside `data/` refused.
