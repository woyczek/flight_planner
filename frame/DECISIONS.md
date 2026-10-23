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
- **22 Oct 2026 — Lot 7, the airline's website through `ctx.net`** (asked for the website module: fleet and log in one
  tap on a workstation with a launcher):
  - the host of `airline.site` (from `airline/settings.json`, read again at each call on the launcher side) joins the
    relayed and direct sites, a dynamic list of one;
  - GET only, on both sides: nothing is ever sent to the website through the relay (a form is opened by the user, as
    report does);
  - https only, and never a local or private address (`localhost`, a non-global IP literal): the data repository is
    shared, so its content must not turn the launcher into a way into the workstation's network;
  - without a launcher, a direct read works only if the website allows CORS; otherwise the module gets a 503, as for
    any unreachable site.
  - Tests: launcher relay with a stub `airline/settings.json`: GET relayed, POST refused (405), another host refused
    (403), a private address as site refused; in the page, the site read through `ctx.net` (relayed) and a POST answered
    503.
- **22 Oct 2026 — `device/` out of a merged backup** (decided by the ergonomics session after settings lot 4): `load` in
  merge mode never takes `device/` (usages, identity, level), because the usages of another device would switch this
  device's transport; a backup restores data. In `replace` mode `device/` is taken, never the GitHub access (the token
  is not in a backup). Test: a newer `device/usages.json` in the backup is left out by a merge (`device` count 1) and
  taken by a replace.
- **22 Oct 2026 — Lot 8, `meta.net` and `meta.lazy`** (asked by maps):
  - `meta.net`: the public hosts a module's library calls by itself (MapLibre and its tiles), declared, never through
    `ctx.net` nor the launcher. `tools/csp_policy.py` reads them from the application's modules (`APP.modules` of
    `frame/app.js`, then each `module.js`), for both the launcher's header (computed again when a module changes) and
    the `build_pages.py` meta tag, so a map works with and without a launcher.
  - Only `connect-src` gets them: the policy restricts no image today, and an `img-src` directive would block every
    other image of the suite. Local and numeric addresses are ignored.
  - `meta.lazy`: heavy files kept at their first use (the service worker already keeps every module file it serves);
    the frame only leaves them out of the installation's preloading, even when also listed in `files`.
  - Tests: a module declaring `net` and `lazy` (temporary, in a copy): the launcher's header and the built pages carry
    its hosts in `connect-src`, a local address is ignored; the lazy file is not in the service worker's copies after
    the first visit, and is once loaded.
- **23 Oct 2026 — Lot 9, `data/` is the device's storage on a launcher's page** (user feedback on localhost:8000:
  V2 and V3 showed different bases and sheets).
  - The cause: with no exchange ticked, the frame chose the local transport even on a page served by the launcher. So
    the pilot's documents (`planner/…fpdb.json`, `cr/reports/`, `pilot/<trigram>/…`) stayed in the browser's cache,
    and V3 never saw `data/`, which V2 reads directly.
  - Now the launcher is the transport by default on its pages: `data/` read and written, one local commit per batch.
    The git exchange happens only with "several devices" or "several users". "Alone on this device" is the case of a
    page with no launcher.
- **23 Oct 2026 — Taking up the copies written in local mode** (`adoptLocal`, at the first pass with a repository after
  local passes):
  - Without it, a copy written locally and absent from `data/` would stay in the browser and never be sent. A copy
    present on both sides would be replaced by `data/`'s version without a trace (the pull only compares revisions,
    and only for the prefixes of mounted modules).
  - So each copy is compared with the repository's version:
    - absent there: queued;
    - another value: the usual merge with no base (newest wins, the loser kept in conflicts);
    - same value: nothing, so a different formatting neither sends a file nor makes a conflict.
  - Done before the pull, for every prefix. `meta.mode` remembers the kind of the last successful pass, so it happens
    once; a failed pass retries it.
  - Not taken up: an IndexedDB that had already been used with a repository before this lot (it has a remote tree and
    no `mode`), whose copies came from that repository.
- **23 Oct 2026 — Tests of lot 9**:
  - `frame/store/test/`: 84 checks. From local to a repository: newer here sent, only here sent, newer there kept
    here too, same value untouched, two losers in conflicts, the repository's file pulled, nothing taken up at the
    second pass.
  - The launcher (8794) with no usage ticked: transport `launcher`, a module's write committed into `data/`.
- **23 Oct 2026 — Bug: no aeronautical base on the phone in GitHub mode** (user, with `sia/base/` and `AircraftDB/` in
  the data repository; fine with the launcher).
  - Reproduced with `fake_github.py` filled with the real data tree (513 tracked files, images left out): a first visit
    without `sia/base/`, then a push of `sia/base/` and `AircraftDB/` on the repository side, then a pass. aerodb kept
    0 zones while the data layer listed the 123 `sia/base/` paths. A new page saw the 10 zones.
  - **Cause**: aerodb lists the published zones once, from the kept tree. The pass that brings the new tree skipped
    references never read without signalling them, so aerodb never listed again. On a phone the app is resumed, not
    reloaded, so it stayed without zones. Also, a reference read before the first pass of the page looked only at the
    kept tree, possibly from an older session, and answered "absent".
  - **Fix**:
    - the pull signals a reference that appears or changes, without reading it;
    - a read that misses, and `list`, use the live tree until a pass has checked the kept one (in memory: the pull's
      own tree is not touched, so it still sees every change).
    - Both scenarios now pass: the app open during the push (zones as soon as the pass ends, no reload), and the app
      reopened after the push (zones within 1 s, before the first pass).
  - **Diagnostic**: `FrameData.diagnostic()`, and `ctx.diagnostic()` for the settings screen, which adds what aerodb
    sees (source, zones, loaded, missing), so the user can copy it from the phone.
  - Left to aerodb (sent to its session):
    - on `AircraftDB/`, a path that arrives without having been read should reset the aircraft list too (today only
      a changed revision of a file already read does);
    - on `sia/base/`, a listing that found nothing (`zones: null`) should be redone on arrival.
  - Test artefacts noted: `FrameData.reset()` empties the declarations, and a change of the address anchor does not
    reload a page; a scenario that needs a fresh page opens a new tab.
- **23 Oct 2026 — METAR / TAF only through the launcher**: aviationweather.gov sends no CORS header (checked by fuel with
  curl), so the direct call from a page always failed. It is removed from the direct list and fails fast with the 503
  `x-sog-unreachable`. This corrects the lot 6 entry that said it allowed CORS. The weather without a launcher (a
  phone in GitHub mode) waits for the PHP web service as a relay.
- **23 Oct 2026 — Tests of the fix**: `frame/store/test/` 89 checks (a reference pushed later is signalled, listed,
  counted by the diagnostic, read on demand); the real-tree scenario, twice; the application scenario.
- **23 Oct 2026 — Lot 10, dual view** (asked by the user, to see what a change of the flight plan does):
  - From 980 px, a pane beside the current module: by default the Map for Fuel and Report (`APP.modules[].pane`).
  - A header button opens it; the address `#fuel?with=maps` carries it and is updated with `replaceState`, so the
    module is not remounted.
  - The state is kept per module in `device/layout.json`.
  - Two ordinary mounts, each with its own `ctx`, linked only by the shared records (`watch`); no direct call, no
    shared object.
  - The pane is unmounted with the module, and below 980 px (kept, reopened when the window widens). The map is never
    mounted twice: no pane for the module itself.
  - Tests at 1280 px:
    - Fuel opens the Map; typing a departure and an arrival in Fuel shows the route in the pane;
    - Report does not inherit Fuel's pane, and Fuel gets it back;
    - at 900 px the pane is unmounted and the button hidden, at 1280 px it is back;
    - closing keeps `fuel: ''`; `#report?with=maps` opens it from the address;
    - on a phone nothing changes; no JavaScript error, no horizontal scroll.
- **23 Oct 2026 — Review of aerodb lot 5a** (`26ed9d355`, now the frame's):
  - `frame/app.js` builds aerodb's adapter from `AeroDB.declaration()` instead of a list written in the frame: the
    owner of the prefixes declares them;
  - `frame/sw.js` keeps `aerodb/registry.js` and `aerodb/sheets.js` from the installation.
  - Checked: the page starts with no error and the declaration is complete.
  - Noted: `airline/` is now declared twice, as `reference` by the frame (`ctx.airline`) and as `document` by aerodb. At
    equal length the first declaration wins, the frame's: `airline/` files are read on demand and signalled at the
    pull rather than pulled ahead. Nothing is lost.
- **23 Oct 2026 — `airline/` is a document prefix** (decided by the ergonomics session):
  - `airline/settings.json` and `airline/fleet.json` are written by the website module and must be pulled ahead, for
    the aircraft search offline. So the frame declares `airline/` as `document`, no longer `reference`.
  - `ctx.airline` reads `airline/settings.json` as a document (`get`, waited for 2.5 s at most at start) and follows it
    with `watch`.
  - There is no double declaration any more; aerodb's identical one is redundant and may stay. This replaces the lot 6
    entry that made it a reference file.
- **23 Oct 2026 — Lot 11, back to the origin module** (asked by the user):
  - The frame finds the origin itself, with no change in the modules: `?from=` when it names a module, otherwise the
    previous screen if it was a module and the user did not come through the menu.
  - Each history entry is marked when first shown (`history.state.sogSeen`): a revisited entry (back or forward of
    the browser) shows no back link, so going back never offers to go back to the screen just left.
  - The back button itself counts as a menu choice, for the same reason.
  - `history.back()` when the origin is the previous page of the session (same address, its query included),
    otherwise the origin's address.
  - Tests at 1280 and 375 px:
    - Fuel through the menu: no link;
    - Map → Fuel by passage: "← Map", and back lands on the Map without a link;
    - forward of the browser: no link;
    - a fresh `#report?from=flightlog`: "← My flights", whose return goes by address;
    - on a phone the link replaces the name, with no horizontal scroll; no JavaScript error.
- **23 Oct 2026 — Lot 12, weather without a launcher** (reading measured with curl, decided by the ergonomics session):
  - metar.vatsim.net is in the relay and the direct list (the launcher first): CORS `*`, no key, the real METAR of the
    moment.
  - avwx.rest is direct only, with the device's key added by the frame.
  - Rejected: met.no `tafmetar` (CORS `*`, but about 20 h late), NOAA `tgftp` and aviationweather.gov (no CORS: relay
    only), checkwx (kept for later if needed).
  - The key lives in `localStorage['githubData:avwx']`, not in `device/`: `FrameData.dump()` exports `device/`, and the
    `githubData:` keys are already left out of V2's browser backups. This is the settings session's proposal,
    confirmed.
  - `weatherKey.test()` calls through `ctx.net` and says `ok`, `no key`, `key refused` (401 / 403), `offline` or the
    HTTP status.
  - `connect-src` gets `https://avwx.rest` (`metar.vatsim.net` was already there).
  - Tests:
    - with the launcher, the METAR is relayed; without it, it is called directly;
    - avwx without a key: 503 `x-sog-unreachable`; with a dummy key: the direct call passes CORS and avwx answers 403;
    - the key is not readable from `SogFrame`; the launcher's CSP has both hosts.
- **23 Oct 2026 — Lot 13, open-meteo** (decided by the ergonomics session, for fuel's lot F: the wind at the planned
  level along the route, the real density altitude):
  - `api.open-meteo.com` is in the relay (the launcher first) and the direct list: no key, https, CORS `*` (checked
    with curl, hourly 850 hPa temperature and wind for Toulouse);
  - it was already in `connect-src`.
  - Tests: relayed with the launcher, direct without one, both 200.
- **23 Oct 2026 — Dual view toggle** (user bug: "the Maps button appears but cannot be read when the window widens"):
  - The cause: the design lot 2 rule that squares the header's icon-only buttons (`.f-head button:not(.f-sync)`,
    44 px wide, no padding) also caught the toggle, whose label was clipped. The back button of lot 11 had the same
    defect. Buttons with a label are now left out of that rule.
  - The toggle, as decided by the ergonomics session:
    - pressed: the background tinted with the accent (15 %), an accent border, the page's text;
    - the pane has a "×";
    - from 1200 px, Fuel and Report open the Map by themselves until the user chooses; between 980 and 1200 px only
      on demand; the choice is kept per module (`device/layout.json`, `''` = closed);
    - below 980 px the pane closes and the toggle disappears, the choice is kept.
  - Reproduced and checked: widening from 900 to 1400 px by steps of 50 px:
    - no toggle up to 950;
    - "Map" readable (82 px, not clipped) from 1000;
    - the pane opens by itself at 1200;
    - "×" closes it and keeps `fuel: ''`, and it stays closed at 1000 and 1400;
    - the toggle opens it again.
  - Contrast of the toggle, pressed / not pressed: standard 13.4 / 16.5 by day, 10.5 / 13.5 by night; cabinet
    10.8 / 14.1 and 8.6 / 12.8; field 11.0 / 14.0 and 5.8 / 8.2.
- **23 Oct 2026 — Review of aerodb lot 5b** (`642bd45fd`, now the frame's):
  - `FrameData.noteConflict()` keeps a conflict found outside a pass in the same form as a pass's. aerodb gives the
    sheet's record path, so restoring takes the `.lnmperf` file's version into the sheet: the right direction.
  - `frame/sw.js` keeps `aerodb/lnmperf.js`.
  - The launcher's `/__setup/lnmperf-folder` and `/__setup/lnmperf`, checked:
    - a `PUT` goes through the `POST` path (the `X-SOG-Setup` header, the size limit) and is refused on any other route;
    - names are a single file name;
    - the data folder is refused, with symbolic links resolved;
    - a retired file is moved, never deleted;
    - `tools/.lnmperf.json` is ignored by git.
  - Nothing to change.
- **23 Oct 2026 — Lot 14, the frame's screens over the module, toggle buttons** (two user bugs on a computer):
  - "The help hides the menu": the menu was not hidden but scrolled away. The verbs column was not sticky, and
    `body { height: 100% }` stopped a sticky element at the window's height. It is now sticky under the header, and the
    body has `min-height`. Its current entry stays marked on the frame's screens.
  - The frame's screens open over the current module: it stays mounted and hidden (`.f-view.f-over`), so closing
    restores the exact context with no remount (address, step, scroll).
    - A stack of the screens' addresses tells a browser back between two frame screens from a new one; closing uses
      `history.back()` for a single screen, `replaceState` otherwise.
    - The header buttons are toggles, pressed while open; Escape closes (not while a dialog is open); no "←".
    - Exception to the exact return: if what a module reads when it mounts changed while the screen was open
      (identity, usages, level, language, transport), the module is mounted again. Otherwise a trigram set in the
      settings would leave the module on the old one. Found by the application scenario, which sets the trigram while
      a frame screen is open.
  - Tests at 1280 and 375 px:
    - Report at step 2, scrolled: "⚙" opens settings ("⚙" pressed, Report still marked in the menu); "⚙" again
      brings Report back at step 2 at the same scroll (400 px and 265 px), no back link;
    - "?" then Escape: the same;
    - help, then the roadmap, then "?": back to Report;
    - from settings, Fuel through the menu: Fuel opens;
    - the application scenario: the trigram set while a frame screen is open is taken by the module when it closes;
    - the menu stays at 57 px from the top while the help is scrolled 1500 px;
    - no horizontal scroll, no JavaScript error.
- **23 Oct 2026 — Short sync state on a phone** (bug found by maps: at 375 px in English, "up to date, 0 s ago" made
  the sync button 170 px and the page 389 px wide):
  - Under 760 px the button shows its dot and a short state (✓, n, ⟳, ✕, ! n); the full label is in the tooltip and
    the accessible name.
  - Tests at 375 px in French, English, German and Spanish, with and without the "←" link: the page is 375 px wide,
    the sync button 52 to 55 px. At 1280 px the full label is unchanged.
- **23 Oct 2026 — Tests of lot 5**: a locally built site served as Pages would (`/flight_planner/`): V2 at the root with
  no JavaScript error, the Pilot application at `/v3/frame/` with its service worker limited to that scope; the
  Capacitor-style build redirects from its root to `frame/index.html`, anchor kept; the modules' declared files are
  in the service worker's copies after the first visit.
