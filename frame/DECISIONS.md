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
- **23 Oct 2026 — Lot 4, offline for real: the frame's own service worker** (`frame/sw.js`, scope `frame/`):
  - it keeps the application files (frame, modules, icon), never the data, which have their own cache in the data
    layer;
  - copies are served at once and checked in the background, keyed by path without the stamp;
  - a changed file refreshes all copies before the pages are told, so a version never arrives half;
  - it installs even without CacheStorage (the test Chrome with a long profile path had none): the application works,
    without offline.
- **23 Oct 2026 — Version without a build step**: the service worker detects a new version by comparing what it serves
  with what the server sends, so no version number has to be maintained. A launcher restart already clears its site's
  browser cache, so the new version is served directly then.
- **23 Oct 2026 — `ctx.net` relay**:
  - `POST /__setup/net` on the launcher, for an allow-list of sites (SimBrief, IVAO with the launcher's API key,
    VATSIM); https, GET or POST, 8 MB at most; the response is passed through, and an unreachable site gives a 502
    marked offline;
  - without a launcher: a direct call to the sites that allow CORS (SimBrief, IVAO), a 503 otherwise;
  - never an exception, so modules have one code path.
- **23 Oct 2026 — Background synchronisation without the user**: a retry after an offline pass (1 minute, doubled,
  capped at 10), and a pass on wake (visibility, back-forward cache) when one is due; one tab at a time.
- **23 Oct 2026 — Tests of lot 4**:
  - `frame/store/test/`: 49 checks (automatic retry added);
  - the application on a real launcher in a dedicated headless Chrome (short profile path):
    - after a first visit, reloaded with the launcher stopped, then with the browser network cut: frame, module and
      synchronisation control drawn, no JavaScript error;
    - `net.fetch` gives 503 offline;
    - the SimBrief relay answers through the launcher; a site not relayed gets a 503; the route needs its header;
    - a changed frame file gives the "new version" notification with "Reload".
- **23 Oct 2026 — Lot 5, one Pages site for V2 and V3** (option 1A): a repository has a single Pages site, so
  `pages.yml` builds both branches into one: V2 at the root, V3 under `/v3/`. The same workflow file lives on develop
  and on v3; either push redeploys the whole site.
- **23 Oct 2026 — Capacitor shell on the Pilot application**: `build_pages.py --start frame/index.html` turns the root
  page into a redirect, rather than a second build or a copy of the frame; name "SOG Pilote", same app id so the
  installed app is updated, not doubled. `ios.yml` stays paused and unchanged; it needs `--start` and the v3 branch
  when it resumes.
- **23 Oct 2026 — `meta.files`**: a module lists the files it imports, relative to `module.js`; the frame reads them at
  installation and sends them with the entry points in the `precache` message, so every module is complete offline
  from the first visit. Proposed by the fuel module, which declares its own.
- **23 Oct 2026 — Waiting**: the "take over the V2 setting" button waits for the settings module.
- **23 Oct 2026 — To check on a device** (not testable here):
  - CORS of the IVAO API from the `capacitor://localhost` origin;
  - IndexedDB data kept by WKWebView on iOS (eviction, storage pressure).
- **23 Oct 2026 — Where the service worker is tested**: it does not register in Claude's built-in browser ("unknown
  error when fetching the script"). Offline tests are run in a dedicated Chrome with a short profile path (a long one
  had no CacheStorage).
- **21 Oct 2026 — Reference source for the local transport** (asked by the user, made by the aerodb session):
  - The problem: with the local transport (single user, the default), the data layer read no `reference` file, so
    aerodb (and fuel through it) had no SIA base and no aircraft base, even on a page served by the launcher.
  - `configure({ references })` now takes a read-only source for those files only. `frame/app.js` gives the launcher
    that serves the page, otherwise the configured GitHub repository. The exchange choice (usages) is unchanged.
  - Test: a scenario in `frame/store/test/` (read from the source, revalidated, nothing sent, offline pass still
    successful, no read without a source). `frame/index.html` served by the launcher with no usage ticked: aerodb
    reads the 13 reference zones, and whole-world counts are identical.
- **22 Oct 2026 — Lot 6, review of `d2a36a4c0`** (reference source for the local transport, made by the aerodb
  session): taken over as it is. The source is keyed by the transport's `id`, so switching between the launcher and
  GitHub reads the tree again; an offline revalidation stays a warning on a successful pass.
- **22 Oct 2026 — Address with a query**: `#module?key=value` opens the module and gives it `ctx.query` (an object);
  before, `#report?from=flightlog` opened the first module.
- **22 Oct 2026 — `ctx.airline` from the data repository**: `airline/settings.json`, a `reference` file read by the frame
  (waited for 2.5 s at most at start, then followed by `watch`), text fields only, frozen. No address of the airline in
  the code; the input will come with the website / settings work.
- **22 Oct 2026 — Settings screen**: the settings session made `#settings` (`frame/settings/settings.js`,
  `SogSettings.render(view, ctx)` with its own privileged context, `#device` kept as an alias). Its contract is the
  one in `frame/settings/INTEGRATION.md`; the frame's first proposal (an ES module with a `ctx.device` object) was
  dropped at the rebase so that there is one contract only. The frame adds `cutAccess` to that context.
- **22 Oct 2026 — Cut access**: `FrameData.github.clear()` (it already existed) is wired in the frame (`cutAccess`): the
  transport switches at once, in the other tabs too (`storage` event); copies and pending writes stay.
- **22 Oct 2026 — Shared pure code in `frame/lib/`** (rule set with report): a module never imports from another
  module; shared pure code goes to `frame/lib/<name>.js` with one owner, listed in SPEC § 3.9.
- **22 Oct 2026 — `cached` and `evict`** (asked by aerodb): the state of the cache without network, and a way to drop a
  reference copy that queues nothing (`remove` would send a deletion to the repository). Only `reference` copies can
  be evicted: a document or a device cache file may be the only copy.
- **22 Oct 2026 — Device backup: `FrameData.dump()` / `load(file)`, merge by default** (named as the ergonomics
  session asked; settings switches to it from its prefix-less adapter). `load` merges unless asked to replace, because a backup
  taken on another device or earlier must never erase what this device holds: a pending write here wins, a newer copy
  here wins, a pending deletion of the backup is never taken. `replace` exists for "this device becomes the saved
  one". The export holds no token and no transport state; reference bases only on request (they are large and can be
  read again). Settings will choose the buttons.
- **22 Oct 2026 — METAR**: aviationweather.gov added to the launcher's relay and to the direct calls (it allows CORS).
- **22 Oct 2026 — Registry bridge in the launcher** (`tools/report_bridge.py`, SPEC § 3.8):
  - Python's standard library has no YAML: the bridge reads the subset V2 writes (block style, double-quoted strings,
    null, booleans, numbers, `[]`, `{}`) and rewrites only the entries it changes, in V2's exact format. On the real
    registry (21 entries) every entry read and written again gives its text back byte for byte.
  - Replayed every time, records win: a V2 edit of an entry that came from a V3 report is overwritten when the record
    brings a different value. Keys V2 added alone do not trigger a rewrite. Edit a V3 report in V3.
  - `updatedAt` is computed from the records, not from the clock, so two workstations write the same file and git
    merges them without a conflict.
- **22 Oct 2026 — Tests of lot 6**:
  - `frame/store/test/`: 74 checks (cache state, eviction, export, merge and replace import added);
  - `python tools/report_bridge.py --essai` (13 checks), and the real registry read and written again identically;
  - the launcher: a batch with a report adds the entry to `cr/missions.yaml` in the same commit, the other entries
    untouched; a second batch leaves the registry as it is; the METAR relay answers;
  - the application: `#report?from=flightlog` opens report, `ctx.airline` read from the repository (unknown fields
    dropped), cut access switches to local and keeps copies.
- **23 Oct 2026 — Tests of lot 5**: a locally built site served as Pages would (`/flight_planner/`): V2 at the root with
  no JavaScript error, the Pilot application at `/v3/frame/` with its service worker limited to that scope; the
  Capacitor-style build redirects from its root to `frame/index.html`, anchor kept; the modules' declared files are
  in the service worker's copies after the first visit.
