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
- **23 Oct 2026 — No dual view on the frame's screens** (user bug: on Settings, the "Map" toggle changed the width of
  the settings column without showing the map):
  - The cause: the dual view's two-column grid (`.f-split`) won over the frame screen's `display: block`, and the
    toggle stayed shown.
  - Now the toggle is hidden and inactive while a frame screen is open, and the screen takes the whole area. The
    pane, only hidden with its module, comes back with it.
  - Test at 1280 px: Fuel with the Map → "⚙" (settings 1023 px wide, no toggle) → "⚙" (Fuel with its Map).
- **23 Oct 2026 — Lot 15, actual position during a started flight** (asked by the user: "where are we, in practice,
  on a started flight?"):
  - **Sources measured with curl:**
    - IVAO `whazzup` v2 is public, with no key, and allows a direct call (the origin is echoed back): 682 KB.
    - IVAO `now/pilots` needs authentication (401).
    - The VATSIM data feed has CORS `*`: 1.65 MB, cached 15 s.
    - `slurper.vatsim.net` answers one tiny line per CID, but with no CORS header and no altitude or speed: not used.
  - **Network cadence:** every 15 s through the launcher, but every 60 s in a direct call. At 15 s a phone would load
    160 to 400 MB an hour; the GPS comes first anyway. This departs from the 15 s asked.
  - **When it runs:** while `started` is not null (no `endedAt`), and not for a flight started more than 24 h ago, so
    a forgotten flight does not keep the GPS on.
  - **GPS:**
    - The permission is asked only by a gesture; the device's choice is kept, and the GPS resumes by itself when the
      browser already grants it.
    - `watchPosition` only reports when it has a new fix, so a reading every 10 s keeps the cadence.
    - A fix that comes less than 10 s after the last write is written at the end of the delay. Without that, the
      last movement was lost when the device then stood still: found by the test.
  - **Writing:** only `progress.actual`, with `by: 'frame'` and `updated_at` (the record rule), and only when the
    position moved.
  - **Tests (position simulated through the browser's geolocation override, launcher):**
    - flight started: badge "—";
    - badge clicked: "GPS", first position written;
    - 100 m further: written after 10 s; standing still: not written again;
    - GPS switched off: back to "—";
    - a fresh page with the VID of a pilot really connected on IVAO: "IVAO", position from the relay;
    - 375 px: the page fits;
    - `started` set back to null: the badge disappears;
    - no JavaScript error.
- **23 Oct 2026 — "1 pending" for ever with the launcher** (pass on the real base):
  - The cause: since lot 9 the launcher is the default transport, and its writes waited for the background pass
    (10 minutes). Fuel writes the current flight each time it opens, so a write was almost always waiting. Nothing was
    refused, it was simply not sent yet.
  - Now:
    - the launcher transport says `quick`, and a write goes 2 s after the last one, in a pass without the git exchange
      (`reason: 'write'`); the exchange keeps its rhythm;
    - the actual position (lot 15) writes `quiet`, so `data/` does not get a commit every 10 s;
    - each pending write records the module that made it (`module`);
    - `status().queue` lists them, and the button's tooltip shows them with the last error.
  - Tests:
    - on the launcher, Fuel opened: "1 pending" with "pilot/TST/current_flight.json — fuel" in the tooltip, then
      "up to date" within 5 s, with a local commit in the trigram's name;
    - `frame/store/test/`: 90 checks.
- **23 Oct 2026 — Tests of lot 5**: a locally built site served as Pages would (`/flight_planner/`): V2 at the root with
  no JavaScript error, the Pilot application at `/v3/frame/` with its service worker limited to that scope; the
  Capacitor-style build redirects from its root to `frame/index.html`, anchor kept; the modules' declared files are
  in the service worker's copies after the first visit.
- **23 Oct 2026 — "Reload" after a new version, and no more "Try" page**:
  - The failure, reproduced in a fresh Chrome profile and in one with the old version: the click did reload, and the
    new version was served, but the "new version" notice came back after every load. So "Reload" seemed to do
    nothing, and only Ctrl+Shift+F5 seemed to help.
  - The cause: the service worker keeps the page as `frame/index.html`, re-reads it at that address, but checked
    each navigation at `frame/`. The launcher stamps `?v=` on `index.html` only, so the two always differed: a "new
    version" at every load.
  - Now:
    - a navigation is checked, and the page installed, at the address of its copy (a fresh install no longer shows a
      false notice at its second load);
    - "Reload" lets a waiting worker take over (`skip-waiting`, then `controllerchange`), or else has every copy
      fetched again without the browser cache (`refresh`), then reloads, after 8 s at most.
  - "Try" (`hello`) leaves the Pilot application: no menu entry, no cached copy, no help. `modules/hello/` stays as
    the developers' example, opened with `localStorage['sogFrame:dev'] = '1'`.
  - Tests (a marker added to `frame.css`): in a fresh profile and in a profile holding the old version, the notice
    appears, then one click serves the marker, and no notice comes back; no JavaScript error.
- **23 Oct 2026 — Lot 16, the simulator as the first source of the actual position** (asked by the user, from their
  workstation: X-Plane 12.4.3 with its web API on 8086; Little Navmap with Little Xpconnect and its web server on 8965;
  XPUIPC, Navigraph Simlink, Volanta, JoinFS and vmsACARS have no useful local API):
  - **Launcher**: `GET /__setup/sim/position` (`tools/sim_position.py`, standard library).
    - Asks X-Plane (REST v2), then Little Navmap (`/api/sim/info`, keys read from its source:
      `position.lat/lon`, `indicated_altitude` ft, `ground_speed` kt, magnetic `heading`).
    - Loopback only (127.0.0.1, then [::1]); only the ports can be set (`tools/.sim.json`, git-ignored).
    - At most one pass a second; both simulators are asked in parallel, 0.8 s each. On Windows a closed loopback port
      is refused only after about 2 s, so a simulator that did not answer at all is skipped for 10 s.
  - **Frame**: the simulator comes before the GPS and the network.
    - It is asked every 5 s while a flight is started and a launcher serves the page.
    - The GPS and the network wait while it gave a position in the last 15 s.
    - At start, its first answer comes before the GPS starts. The first test showed a GPS fix written before the
      first simulator answer.
    - `progress.actual.source` is `xplane` or `lnm`, and the badge says "X-Plane" or "Little Navmap".
  - **Tests** (X-Plane and Little Navmap not running: fake servers with the real APIs' shapes):
    - launcher route:
      - X-Plane wins over Little Navmap;
      - a second call within the second is answered from the last pass, without asking X-Plane;
      - no flight loaded, or 0° / 0°: Little Navmap;
      - X-Plane restarted (new ids): resolved again, and at rest the track is the true heading;
      - nothing: 204;
      - a port set in `.sim.json`: used; a closed port: answered in 1.6 s once, then skipped;
      - no `X-SOG-Setup` header: 403.
    - frame, on My flights with the GPS on as well:
      - badge "X-Plane" and `actual.source: 'xplane'`, which follows the simulator;
      - simulators off, then a GPS reading: "GPS";
      - Little Navmap alone: "Little Navmap";
      - 375 px fits; flight ended: badge hidden; no JavaScript error.
    - Lot 15 test (GPS, IVAO): unchanged.
  - **Found on the way, for fuel**: with Fuel open during a flight, fuel rewrites `current_flight.json` (about every
    10 to 35 s) without `progress.actual`. The frame's actual position is then lost at each of fuel's writes. This
    was already true of the lot 15 GPS. Reported to fuel's owner.
- **23 Oct 2026 — Lot 17, `keepScroll` in the frame** (asked by the coordinator):
  - fuel, report and flightlog each had a copy of `keepScroll(box, draw)` (bc4fb7dc0, 54a5297c8, e5639ccfc). Two of
    them also restored the focused field by hand.
  - `frame/lib/dom.js`, owned by the frame, now gives one `keepScroll(box, draw, { focus = true })`:
    - the same scroll keeping as the copies;
    - the focused field found again by `data-k` / `data-i` (fuel's and flightlog's convention), or by `id`, with its
      value, focus (`preventScroll`) and selection;
    - a checkbox or a select keeps the value the render gives it.
  - The frame keeps it for offline use (service worker shell).
  - The modules switch to it at their next pass, and their copies go.
  - INTEGRATION § 6 gains the rule: a render never changes the scroll, nor what is being typed.
  - Test (in the frame page, through an import):
    - a scrolling container and the page scrolled, a field focused with a selection, then the content redrawn;
    - kept: the container's and the page's positions, the focus, the selection, and the value typed during the draw;
    - `{ focus: false }`: the focus is not restored;
    - no JavaScript error.
- **23 Oct 2026 — The actual position written through `frame/lib/current_flight.js`** (fuel's fix b298763bc): fuel and
  report now re-read the current flight and replace only their own fields, so `progress.actual` is no longer lost.
  The frame's position service uses the same `merge` (`progressKeys: ['actual'], by: 'frame'`) instead of its own
  fusion, which did the same thing. The record now also gets `schema: 1`, and `updated_at` is the time of the write.
  The service worker keeps the file with the frame's shell. Test: lot 16's frame test with Fuel open, so that fuel
  and the frame both write: `actual` stays.
- **23 Oct 2026 — What the launcher's tree exposes under `sia/`** (aerodb's aecf6bf2f, VFR reporting points from the
  VAC charts):
  - `FRAME_SKIP` now lets `sia/vfr/` through as well as `sia/base/`. Re-read and checked on edge cases:
    - seen: `sia/`, `sia/base/…`, `sia/vfr/…`, `sia/vfr/index.json`;
    - left out: `sia/vfrx/…`, `sia/vfr_raw/…`, `sia/eAIP/…`, `sia/AIXM.xml`, and an `_index.json` anywhere, by the
      general rule. aerodb's index is `index.json`, so it is served.
  - The same rule refuses writes to a hidden path (400).
  - The rule is now written in SPEC § 2 (launcher transport).
- **23 Oct 2026 — Lot 18, the Pilot application on a tablet through the computer's launcher** (asked by the user: they
  fly X-Plane on the computer and want the map on a tablet or a phone, which no launcher serves):
  - **Design** (frame/SPEC.md § 3.10, `tools/lan_access.py`):
    - an opt-in second listener on the computer's private addresses, the same port, closed with the launcher;
    - a pairing code that is exchanged once for a long token in a strict cookie;
    - only the Pilot application's routes are open to paired devices.
  - **Where the request was changed, and why:**
    - **Not `0.0.0.0`**: one listener per private IPv4 address of the computer. `0.0.0.0` would also open a VPN or a
      public interface, and on Linux it clashes with the 127.0.0.1 listener on the same port.
    - **The code is not the credential**: six digits are short, and the code goes over http. The device gets a
      32-byte random token instead, and only its hash is stored, so "once per device" holds across restarts. A
      cookie (not localStorage) is needed because the files of `data/` must be protected too, and a script cannot
      add a header to an `<img>` or a navigation.
    - **An allow-list of routes**: a paired tablet reads and writes `data/` like the computer, but never reaches the
      keys, clone, imports or maintenance.
    - **No button in V2's Settings**: V2 is develop's code. The opening is `--lan` and, in V3, the settings card,
      handed to `frame/settings/` with the `lan()` context (code, addresses, QR, open / close, forget).
  - **Risks** (written for the user, also on the pairing page and in the console):
    - **A shared local network**: everything goes over plain http. On the same network, someone can read the
      traffic: the pairing code when it is typed, the token, and the data the device shows or writes. So it is for
      a trusted network (at home), never a public or hotel wifi. Brute force is bounded: 5 tries a minute per
      address, and a new code after 20 wrong ones.
    - **A device that is lost**: its token stays valid until "Forget the devices". Access is closed when the
      launcher stops, so a lost tablet reaches nothing until the launcher is opened to the network again.
    - **CSP**: unchanged. `connect-src 'self'` covers the device's own origin. The device's page keeps
      `form-action 'self'` (pairing form), `frame-ancestors 'self'` and `X-Frame-Options`.
    - **Cookies**: the strict cookie is never sent on a request started by another site. It does not protect
      against someone who can read the network (above). It is per address: if the computer's address changes
      (DHCP), the device pairs again.
    - **The router**: a port forwarded from the internet would arrive from a public address, which is refused (403).
    - **Windows firewall**: Windows asks to allow Python. The console says to accept it for private networks only.
  - **What the device lacks** (not a secure context): no service worker (so no offline use, shown in Diagnostic),
    no `crypto.subtle` (the data layer has its own SHA-1, checked equal to `crypto.subtle` on 13 sizes from 0 to
    200,001 bytes), no GPS (the badge says why), no clipboard ("Copy" buttons of fuel, report and website: reported
    to their owners).
  - **Tests** (the computer `Mitth`, 192.168.45.145; the device simulated by a second origin in Chrome,
    `http://192.168.45.145:8794`, with its own cookies, storage and no service worker):
    - HTTP:
      - unpaired: page 401 (pairing page, in German for a German browser), `data/` file 401, routes 401;
      - Host spoofed: 403;
      - wrong code: 401 with the reason; after 5 wrong codes even the right one waits (429);
      - right code: 303 back to a local path (an external `next` is ignored), cookie `HttpOnly; SameSite=Strict`;
      - paired: page, status (`lan: true`) and changes 200;
      - keys, `/__setup/lan` (GET and POST), clone, `PUT lnmperf-folder` and relax: 403;
      - without `X-SOG-Setup`: 403; a made-up cookie: 401; the computer itself (127.0.0.1): unchanged.
    - Unit:
      - private: 10/8, 172.16/12, 192.168/16, loopback, IPv4-mapped;
      - not private: 172.32/16, 100.64/10, public, link-local, ULA, documentation IPv6;
      - a new code after 20 wrong ones: the old code is refused and the new one accepted.
    - Browser:
      - the pairing page, then a wrong code, then the right code: the application opens;
      - on the device: no secure context, no service worker, no `crypto.subtle`; badge "Launcher on Mitth";
      - the launcher transport synchronises with no error and no conflict, so the SHA-1 is right;
      - a flight started from the device: the badge says "X-Plane" (fake X-Plane), and the computer's `data/` gets
        `progress.actual` from xplane;
      - GPS touched: the explanation; Diagnostic `page.offline` says why there is no offline use;
      - from the computer: `lan()` state, close (the address no longer answers), reopen with a new code (the device
        still paired, no code asked), forget (the pairing page again, then a new pairing works);
      - no JavaScript error.
    - Regressions: frame application bench, lot 16 simulator test, `frame/store/test/` 90 / 90.
  - **Known limits**:
    - The page's anchor (`#flightlog`) is lost at pairing: the server never sees it, so the device lands on
      `/frame/`, which is where the QR code leads anyway.
    - A page already open on a device whose token was forgotten gets 401s, and the launcher transport reports an
      error until it is reloaded.
- **23 Oct 2026 — Lot 20, security review of the local-network access** (review by the Analysis session of 1bfd85154,
  read only; fixes and a test per point):
  1. **Blocking: path traversal in `/__setup/batch`.** The check went through `posixpath.normpath` but the write
     through `os.path.join(DATA, *rel.split('/'))`, which Windows reads with `\` as a separator. So
     `x\..\..\tools\launch.py`, `C:\Users\…` or `secrets\..\..\secrets\ivao.json` could write (or erase, with
     `text: null`) any file: code run at the next start.
     - Now `data_file()` takes the path as it is and refuses `\`, `:`, control characters, empty, `.` and `..`
       components, trailing dots or spaces, Windows device names and absolute paths. Then the real path must stay
       under `data/`, which also stops a junction. This applies to every page, the computer's included.
     - The other routes that take a name were checked:
       - lnmperf: a single file name, no `\` `/` `:`;
       - vfr-import: four capital letters;
       - changes: only `since`;
       - data-list: a fixed list.
     - Found by the test: the tree of `data/` followed a junction, so it walked outside and, in the test, looped. It
       now follows neither links nor junctions.
  2. **The pairing code** works once and lasts 10 minutes. After a pairing or past that time, there is no code
     until the computer asks for one ("New code").
  3. **Brute force**: besides 5 a minute per address, 30 wrong codes in an hour close pairing until the next "New
     code" from the computer. The former "new code after 20 wrong ones" is gone: it reopened by itself.
  4. **Relay (SSRF)**: urllib followed redirects, http included, to any host, with the IVAO key. The airline's site
     comes from `airline/settings.json`, which a paired device can write.
     - The relay's opener now follows a redirect only to an allowed host over https, and drops the key when the host
       changes.
     - Its connection checks that the address really reached is public, before TLS and at every hop. A name that
       points to the computer's network is refused with 403.
  5. **Exhaustion**:
     - a body from the local network is 16 MB at most (413, refused before reading);
     - 5,000 changes a batch;
     - a device gets the tree of `data/` computed less than 2 s ago again, and a batch clears it, so a device never
       sees an old head after its own write.
  6. **Interfaces**: by default only the private address of the default route. The others (VPN, WSL, Hyper-V,
     Docker) only through "Open them too".
  7. **File types written**: a white list of data extensions (`.json .yaml .yml .md .txt .csv .geojson .fms`, and
     `.js` checked by `data_guard`), for every page. A `.html`, `.svg` or `.xml` would run from the same origin as
     `/__setup/`. The list covers every extension in the real `data/` and every module's writes. A deletion may name
     any data file.
  8. **Cookie**: named `sog_lan_<port>`.
  11. **Forgetting one device**: through its id (start of the hash), with a short name from its browser.
  12. **SPEC § 3.10**: a paired device is a trusted member, and writes all of `data/` as the computer does.
  - Notes 9 (rebinding) and 10 (no leak of the code) needed nothing.
  - **Settings card** follows:
    - the code with its minutes left, "no code in progress" or "pairing closed", and "New code";
    - the paired devices, each with "Forget";
    - the computer's other addresses, closed, with "Open them too";
    - the help's last bullet is updated in the four languages, with its fingerprints.
  - **Tests**: `t_l20` bench, 76 / 76.
    - The three paths of the review, and 17 other bad ones, are refused: nothing written outside, and a traversal
      erase refused too. A junction inside `data/` is neither followed by the tree nor written through. A good path
      is written then erased.
    - `.html .htm .xhtml .svg .xml` and no extension are refused; `.yaml .md .txt .geojson` accepted; erasing a `.html`
      accepted. 5,001 changes refused.
    - The code: present for 10 min; after a pairing there is no code, and the same code again gets "no code in
      progress"; a new code lets a second device pair.
    - The cookie is `sog_lan_<port>`; the old `sog_lan` name is refused.
    - One device forgotten: it gets 401, the other 200.
    - A 17 MB body from the device: 413 without reading. After a device's batch, its next tree is the new one.
      Traversal and `.svg` from the device: refused.
    - Unit: the code expires; 30 wrong codes from 30 addresses close pairing, after which even the right code is
      refused, and "New code" reopens it; the 6th wrong code from one address waits.
    - Relay: a site leading to 127.0.0.1 gets 403; http and unknown hosts are refused. Redirects to http, to an
      unknown host and to a private address are not followed; to the same host the key is kept; to another
      application host it is dropped. A real IVAO call still works.
    - Addresses: only the main one by default; "all" tries the others (one absent here is reported, not opened).
    - The card: code and minutes, "no code in progress" after a pairing, "New code", "Forget" on one device.
    - The device in Chrome: pairing, launcher transport, X-Plane position, Diagnostic, as in lot 18.
  - `frame/lib/clipboard.js` (fuel, 423840c4f) is in the table of § 3.9. The frame does not load it itself, so it is
    not in the service worker's shell; modules declare it in `meta.files`.
- **23 Oct 2026 — Lot 19, nothing leaves the device without a trigram** (seen in the user's `data/`: an untracked
  `pilot/ANON/`, written while the identity had no trigram):
  - **Where**: in the data layer and the frame, not in each module. Fuel, maps, report and flightlog keep writing
    `pilot/${trigram || 'ANON'}/…`; the layer gives `pilot/ANON/` the `cache` policy, so no module changes.
  - **Without a trigram, a pass sends nothing at all**, not only `pilot/ANON/`. A commit needs an author, so the
    git exchange is skipped too. The launcher refuses a batch without a valid author, as asked.
    - Rejected: sending the other prefixes anonymously. That is what wrote commits "? : …" and the ANON folder.
  - **Old queue**: an entry under `pilot/ANON/` queued before the rule is moved into the cache at the next pass,
    instead of leaving.
  - **Taking over** (frame, `adoptAnon`):
    - the moment the trigram is set, then after each successful pass (once per pass, never at every write, so the
      GitHub transport does not read the tree each time);
    - copy to `pilot/<TRI>/`, or the newer one wins and the other goes to the conflicts;
    - then the ANON copy is removed, and its deletion is sent if the repository held it, so the untracked folder
      empties itself;
    - one notification with the count.
  - **Invitation**: the "Trigram?" button and one notification per device. The settings' Identity card already
    warns when "several users" is ticked.
  - **Tests** (`t_l19`, launcher transport, 21 / 21, twice):
    - without a trigram: the button and its notification, not twice;
    - writes under `pilot/ANON/` stay on the device (`cache` policy, nothing in `data/pilot/ANON/`), and an old queued
      entry is moved there;
    - a `cr/` write is held (pending 1, not in `data/`);
    - trigram set:
      - the button hides and a "3 documents taken over" notification shows;
      - the device copy, the old queue entry and a `pilot/ANON/` already in `data/` are taken over under `TST`;
      - the newer `TST` document is kept, the other goes to the conflicts;
      - `data/pilot/ANON/` is emptied, and the held `cr/` write is sent;
    - launcher: an empty author, `ANON`, and a write under `pilot/ANON/` are refused; a deletion there is accepted;
    - no JavaScript error.
    - Regressions: `frame/store/test/` 90 / 90; the frame application bench, whose first GitHub commit no longer
      carries `pilot/ANON/hello.json`, only `pilot/TST/hello.json`; the simulator test.
- **23 Oct 2026 — Lot 21, screens loaded on demand** (measure 3 of the phone audit, decided by the coordinator):
  - **What**:
    - Settings, help and roadmap leave `index.html`. The frame injects their scripts, in order, the first time
      their screen opens, and checks the address again after loading.
    - A module's help loads after the module has mounted. `ctx.help.open()` and `link()` work without it.
    - The help is kept at installation in the application's language only (`SogHelp.files(lang)`, added to
      `help.js`); the other languages are kept the first time they are read.
  - **Measured before / after** (same script `audit_run.py`, phase 1; fake GitHub serving the files uncompressed;
    Chrome with a cleared profile, 375 px, CPU ×4, Fast 3G; three runs after, identical within 30 ms):
    - DOMContentLoaded: 4.2 s → 2.8 s.
    - menu: 5.4 s → 4.1 s (−1.3 s).
    - first module (Fuel) mounted: 8.8 s → 7.4 s (−1.4 s).
    - files loaded before the module: 29 (989 KB) → 21 (765 KB).
    - installation: 88 files, 2,417 KB → 82 files, 2,249 KB (−168 KB: the help in three other languages).
    - next opening offline: unchanged (menu 0.12 s, module 0.34 s).
    - Over real gzip (Pages), about a third of the bytes: the network share of the gain shrinks, the CPU share stays.
  - **Tests** (`t_l21`, 12 / 12):
    - the menu appears with none of these scripts loaded;
    - after the module, the help is loaded (panel drawn) but not Settings;
    - `#settings` loads and draws, with its help panel; `#roadmap` and `#help` draw;
    - `#settings` left 5 ms after opening draws nothing over Fuel;
    - in German, the cache holds `pilot.de.md` and the English tutorials only;
    - Spanish read afterwards is kept;
    - no JavaScript error.
- **23 Oct 2026 — Lot 22, three bugs from Features SOG's second pass and two additions**:
  1. **Header wider than a phone**:
     - The bug: at 375 px, with "←", the X-Plane badge and "Sync error", the header was 409 px (423 here). Measured
       cause: the page grid's single `1fr` column cannot go below its content's minimum width, so the header widened
       the whole page.
     - Now:
       - columns `minmax(0, 1fr)`, and the header has `overflow: hidden`;
       - on a phone the back button is its arrow only, and the position, launcher and trigram badges are their icon
         only (labels in the tooltips);
       - 44 px targets that shrink only when crowded.
     - Measured: 375 px with back, X-Plane and conflicts, in en, fr and de; all eight items forced visible, still 375
       px.
  2. **The previous flight's position for 1.5 s**: the frame clears `progress.actual` when the service stops (report
     saved, departure cancelled, more than 24 h, here or elsewhere), and at a new departure when it is older than
     `started.at`. Maps is told to ignore an older `actual.at` too.
  3. **A refused write blocked the queue for ever**:
     - The launcher now names the path in its 400 answers (path, type, data format, `pilot/ANON/`).
     - The launcher transport turns that into `refused`. The data layer takes the write out of the queue into the
       conflicts (`side: 'refused'`, with the reason and the transport) and sends the rest at once.
     - The conflicts screen says "Write refused: <path> — take it back or set it aside"; "Take back" queues it again,
       a deletion included.
     - The frame's own error messages (offline, repository moving, no transport, "refused by the server: …") follow
       the application's language. A server's detail is quoted as it is.
  - **Additions**:
    - `ctx.layout.with`, and the `frame-layout` event at each pane opening or closing (for Fuel's "Show the map").
    - `frame/lib/time.js` (`fmtZ`, `fmtZLocal`, `fmtDateZ`), the rule "every time in UTC with Z". The frame uses it
      for the sync tooltip, the pending queue, the conflicts and the position badge, and gives it to Settings as
      `time`.
    - `time.js` is imported in parallel with the start, awaited before the first drawing. It is in the service
      worker's shell.
  - **Tests**:
    - `t_l22` in en, fr and de: 7 / 7 each — header in the window, refused write out of the queue with its conflict
      and its line on the screen, position cleared at the stop and at a new departure, no JavaScript error;
    - time.js: "16:30Z", "16:30Z (18:30)", the date in en and de, empty or unreadable gives "";
    - the sync tooltip in Z;
    - `frame-layout` `{ main: fuel, pane: maps }` then `pane: null`.
    - Regressions: `frame/store/test/` 90 / 90, lot 16 simulator test, lot 19 bench 21 / 21.
- **23 Oct 2026 — Lot 23, `aerodb/lnmperf.js` and `aerodb/aar.js` out of the service worker's shell** (measure 6 of
  the audit). aerodb loads both the first time they are asked for, and the service worker keeps them then. Measured:
  - **static count** (`audit_sizes.py`): installation 2,191 KB → 2,180 KB raw (735 KB gzip), 78 → 77 files. The two
    files weigh 32.5 KB raw (11 KB gzip), not the audit's "−90 KB": that figure also counted `sheets.js`, which stays.
  - **really kept** (fresh service worker, fake GitHub, no launcher): 81 files, 1,915 KB. `aar.js` is no longer kept
    (−6 KB) until the map draws AAR tracks. `lnmperf.js` is kept anyway: aerodb starts the `.lnmperf` follow-up 1.5 s
    after every opening (`lnmAuto`), even with no launcher, so it loads it at once.
    - The real gain for `lnmperf.js` (27 KB) needs aerodb to start it only when a launcher serves the page (it needs
      `/__setup/lnmperf`). That is a line in `frame/aerodb/aerodb.js`, for aerodb.
  - Since lot 21 the installation went from 2,249 KB to 1,915 KB, mostly through maps' lazy `outlines.js`
    (21a742eb8).
- **23 Oct 2026 — Settings' Synchronisation card in UTC** (lot 23, `frame/settings/settings.js`, noted in the settings'
  DECISIONS): "Last sync" and the pending writes' times go through `c.time` ("23/10/2026 16:56Z", "16:56Z" the same
  UTC day). Checked on screen.
- **23 Oct 2026 — Lot 24, the first module never waits for the network** (asked after fuel's a6755394e: Fuel drew 59
  ms after its mount, but the frame called it 2.8 s after the menu):
  - **What blocked**: `await loadAirline()` before the first route. Over a repository's first pass,
    `airline/settings.json` costs the whole ref → commit → tree → blob chain, about 2.8 s at Fast 3G (with a 2.5 s
    cap). No module needs it at mount:
    - fuel reads `transitionFt` when it formats;
    - report reads `ctx.airline` at each render;
    - website reads its own settings.
  - **Now**:
    - the airline is read in the background, with `frame-airline` when it arrives or changes;
    - the relay waits for that first reading only for an unknown host;
    - the launcher is looked for only over http (never on GitHub Pages).
  - **Found on the way, by the same bench**: with Fuel mounted at once, its reference reads started during the
    repository's very first pass. Each read with no tree yet read its own ref → commit → tree chain: 54 calls instead
    of 9, 2.1 MB instead of 381 KB, a first pass of 12.6 s instead of 4.1 s.
    - Now `treeNow()` shares the tree being read between the pass's take-over of local copies (`adoptLocal`) and the
      first file reads.
    - `liveTree()` shares its read of the moment too.
    - Only a read in progress is shared: nothing is kept after it, neither a failure nor an ageing tree.
    - A first version kept the result 2 s. The store bench caught it: after its offline test, the next tests got the
      kept "offline", 43 / 88. `FrameData.reset()` now clears these shared reads.
  - **Measured** (audit kit, first GitHub pass, Fuel, real tree of the data repository, CPU ×4, Fast 3G, 375 px; two
    runs each):
    - menu: 0.69 / 0.67 s → 0.69 / 0.67 s (unchanged);
    - Fuel's fields: 3.44 / 3.40 s → 0.84 / 0.84 s (target 1.5 s);
    - first pass: 4.1 s, 9 calls, 381 KB → unchanged;
    - Fuel's references (now drawn first, filled after) all arrive by 5.8 s, in parallel.
  - **Tests**: `frame/store/test/` 90 / 90 (uncached run); frame application bench (the airline still reaches it,
    step 8); lots 19 (21 / 21) and 21 (12 / 12); no JavaScript error.
  - **Audit kit** (`audit_kit/`, outside the repository): the per-phase counter missed reads that ended during a
    pause, because `cdp.py` stores events only during a call. The map's reads (11 calls, 7.9 MB, including
    `airspaces.json`) were then counted nowhere. The counter now drains the events until the network rests.

- **24 Oct 2026 — Lot: the phone's bottom tab bar, tabs as groups of modules, status line, fixed view** (asked by the relay
  cloud, holding the ergonomics role; the user's decision "option A" of 24 Oct, `docs/technique/V3_SPECIFICATION.md` § 7.1;
  branch `v3-cadre-barre` from `v3` 708264389):
  - **What the relay asked, what I chose.**
    - *The bar*: Préparer · Carte · CR · Vols · Réglages, icon above a one-word label, 44 px targets, ≥ 56 px plus the safe
      area, `--sog-surface` and a top hairline, selected = filled icon on a soft pill: done as asked. No hamburger on a
      phone: the button and the drawer are removed (`#fBurger`, `body.f-nav-open`, the phone rules of the four design sheets).
    - *Sticky, not `position: fixed`*: the bar is the last row of the body grid with `position: sticky; bottom: 0`. Same look
      (it sits at the window's bottom, over nothing), and nothing needs `padding-bottom` on the page nor on the fixed view:
      the view is simply above it. Only what is itself stuck at the bottom clears it through `--f-tab-space`: `.f-bar` (fuel's
      result bar: `bottom: var(--f-tab-space, 0px)` in `primitives.css`) and `.f-notes`.
    - *Tab = group*: `APP.tabs` (frame/INTEGRATION.md § 9). The module list in a tab is by id; an id that is not in
      `APP.modules` is skipped, so `atmosphere` works registered or not (the relay's later `APP.modules` entry needs no
      change here). The group's tab is selected from the module **shown** (`current`), not from the address: `#atmosphere`
      unregistered falls back to the first module as before (Fuel), Préparer selected, no error.
    - *Réglages*: the tab is a `screen` tab; it opens `#settings`, which the frame already shows over the module (same screen
      as ⚙, same toggle behaviour). While Settings is open the tab is the selected one; Help and Conflicts leave the module's
      tab selected.
    - *Rail on a screen*: unchanged (every module that has a screen, level filter, current marked). I did not mark the tab's
      group in it (optional in the brief): the sub-tabs say it better where it matters.
    - *Added by the relay mid-lot* — **group sub-tabs**: when a tab has two or more registered modules at the device's level,
      the frame draws a `.f-tabs` row (one button per module, the module's verb, current marked, 44 px) just above the module,
      phone and screen. With `atmosphere` at level 3 and the device at 2 the row is not drawn (one module only); tested with a
      stub `atmosphere` registered at runtime. Fuel's own "Préparer / Fiches" tabs stay inside Fuel (the word "Préparer"
      now appears twice on Fuel's page, in the bar and in Fuel's own tab: for the ergonomics session to look at).
    - *Status line*: only the first case ("Vol en cours › Carte", `started` not null, no age limit, unlike the live position's
      24 h: a forgotten started flight stays visible, which is what a status line is for). **The second case ("CR à écrire pour
      le vol du <date>") is skipped**: it needs My flights' logic (reports saved, site log, network sessions); the frame must not
      duplicate it. If wanted, flightlog should publish a small record (for instance `cache/flightlog/pending.json`) that the
      frame can read.
      Dismissal: kept in `sessionStorage` per departure date (`sogFrame:statusOff`), a page variable when the storage is
      unavailable. The data comes from `liveCheck`, which already reads the current flight on every change: no new read.
    - *Fixed view*: `meta.fixed` read with the level at start (`moduleFixed`), applied before the module loads (no jump) and
      again from its `meta`. `<html class="f-fixed">`, `100dvh` body, view in the grid row between header and bar (no
      `calc` of heights), no padding. Off while a frame screen is over the module (it scrolls as a page). Judgement call:
      a fixed module gets **no folded help panel nor welcome card** (they would sit above it in a view that cannot scroll).
      `modules/hello` is not touched (the brief forbids touching `modules/*`): the contract is documented in
      INTEGRATION § 9.2 and was tested by intercepting `modules/hello/module.js` with a fixed version (a flex column: a
      striped "map" and a 34 % scrolling sheet).
    - *Designs*: each of the four mock-ups got its counterpart in its own sheet (see `frame/design/DECISIONS.md`).
  - **Measured** (Chromium, 390 × 844, 375, 360; `env(safe-area-inset-bottom)` is 0 there, so the safe-area padding could not
    be seen on a device: it is a rule, not a measurement):
    - bar: **57 px** = 56 px of tabs + 1 px hairline (standard, cabinet, field, swiss, cupertino), **65 px** in `material`
      (`--f-tab-h: 64px`), 60 px in `metro` (blocks: 2 px above, a 4 px rule inside); every tab 78 × 56 px at 390, 75 at 375,
      72 at 360; the bar's bottom is the window's bottom;
    - safe-area rule: `.f-tabbar { padding-bottom: env(safe-area-inset-bottom, 0px) }` (the bar's own colour continues
      under the home indicator) and `--f-tab-space: calc(var(--f-tab-h) + 1px + env(safe-area-inset-bottom, 0px))`;
    - labels: 11 px, 10 px at 400 px and less; the longest ("Einstellungen", "Vorbereiten") fits at 360 px in the five designs
      (checked in four languages); status line 46 px (44 + border); sub-tabs 44 px;
    - fixed view at 390 × 844: header 0–57, view 57–787 (730 px), bar 787–844; `scrollHeight` = 844, the wheel does not
      move the page; at 1280 × 800: view 57–800.
  - **Checked**: five designs (plus cabinet and field for errors), day and night, 390 × 844 and 1280 × 800: five tabs on the
    phone, none on a screen (rail), one selected (filled icon, pill), targets ≥ 44 px, `#atmosphere` / `#website` / `#hello` /
    `#settings`, tap sequences (Carte → Réglages → Préparer returns to Fuel), Fuel's sticky result bar above the bar after
    scrolling to the end, no `pageerror`. **No horizontal scroll from the frame**; the page is 402–405 px wide on `#fuel` at
    390–375 px because of Fuel's own `.fu-when` row (`modules/fuel`, the "Now / +30" button): the same on the base commit
    (measured on a `git archive` of 708264389), not touched here.
  - **Not done / to see**: no iOS device (the bar's safe area and the blur of `cupertino` are untested there); `atmosphere`'s
    own commit (c1ce8886 on GitHub) was not seen; `frame/lib/test` has no test of the bar (tests were Playwright scripts
    outside the repository).
- **24 Oct 2026 — Lot: the "i" status button of the header, a one-row header, heights for modules in the dual view, a weaker
  `display` rule** (asked by the cloud relay, holding the ergonomics role, from the user's decisions of 24 Oct; branch
  `v3-cadre-info` from `v3` 58a43041d; `docs/technique/V3_SPECIFICATION.md` § 7.1, "Answers of the user, 24 Oct (afternoon)").
  - **1. The status line becomes the "i" button.**
    - Removed: the status line of the Préparer tab, `status: true` of `APP.tabs`, `paintStatus` / `hideStatus`, the
      `sessionStorage` key `sogFrame:statusOff`, the `.f-status` rules (also in the print list of `primitives.css`).
    - Added: `#fInfo` (icon `info`, already in `icons.js`), before ? and ⚙; a badge drawn by `#fInfo[data-badge]::after` (a
      `--sog-ok` dot inside the button, so the header's `overflow: hidden` cannot clip it; no extra DOM that `headIcon`
      would wipe); a pop-up that is the frame's question window (`modal()`, now with a class parameter) placed under the
      header on the right (`.f-info-modal`), not a new primitive: Escape and the document-level key handling are the
      existing ones, ✕ and a touch outside close it, a change of address closes it, and it follows the state while open.
    - **Judgement calls.** The badge counts "Vol en cours" and "CR à écrire" only; the data line and the offline line are
      always / often there and are a state, not news, so "no badge when only the data line applies" extends to the offline
      line. The data line is always listed (the pop-up is where the synchronisation state lives on a phone, where the header
      shows only a dot and a figure); with the local transport it says "on this device, nothing to synchronise" instead of
      "synchronised n min ago". Its touch goes to Settings (the synchronisation control), or `#conflicts` when there are
      conflicts. A started flight needs only `started` not null, as the user wrote (the old line also required `started.at`);
      no 24 h limit, as before. The "Flight in progress" line is listed only if the maps module is registered.
    - `ago()` now says the day unit in the language (j / d / T / d): it said "3 j" in English too (also in the header's
      sync label).
    - **The pending record** `cache/flightlog/pending.json` is read through a frame adapter (`frame-info`) that declares
      `reads: cache/flightlog/` (policy cache) and `writes: pilot/handoff.json` (policy cache, the same record and policy as
      flightlog's own hand-over): `data.cached()` first, `get` only if the file is on the device, because a `get` of an
      absent file would send a remote transport looking for it in the tree. `watch('cache/flightlog/')` redraws.
      Contract: INTEGRATION § 10.1. **Schema 2** (the relay's messages of the day, flightlog commit 1f52c19a9): each entry
      has `handoff: { family, values }`; a touch writes `pilot/handoff.json` = `{ to: 'report', from: 'flightlog', source:
      "Mes vols" in the device's language, at, fresh: true, family, values }` then opens `#report?from=flightlog`. **`to:
      'report'` is mine to add: the relay's first message said `{ fresh, values }` only, but report's `takeHandoff` ignores a
      record without it.** An entry without `handoff` (schema 1) opens `#flightlog`. The query carries only `from=flightlog`
      (the earlier brief's `date`, `dep`, `arr` in the address are dropped on the relay's later word: report ignores
      `ctx.query` and reads the hand-over).
    - A touch on a CR line that is already at the same address calls `route()` again (report takes the hand-over at its
      mount); other lines do nothing in that case. An address chosen in the pop-up is a menu choice (no "←" to the screen left),
      except `#report?from=flightlog` (an explicit passage: "← Mes vols").
  - **2. The header height bug (57 → 73 px).**
    - **Cause**: the header's back button is `#fBack.f-back`, and `frame.css` also had a generic rule `.f-back { margin: 4px 0
      var(--sog-gap) }` meant for the "←" paragraph (`<p class="f-back">`) of help and join pages. The 4 + 12 px of margin made
      the button 44 + 16 = 60 px in a row that sized itself to its tallest child: header 6 + 60 + 6 + 1 = 73 px. It showed
      every time the back button was shown: `#report` after the map, `#report?from=maps`, and also `#maps` itself when it
      is reached with a back button (`#maps?from=report`, or a passage from another module), which is the maps lot's "stays so
      on returning to `#maps`". Settings and help have no back button (they open over the module) and kept 57 px; a plain visit
      of `#maps`, the browser's back and the "←" of the header (it hides the button on arrival) give 57 px again.
    - **Fix, in depth**: (a) the help rule is scoped to `p.f-back`; (b) `.f-head > * { margin-top: 0; margin-bottom: 0 }`; (c) the
      header is `height: var(--f-head-h)` (57 px) with `flex-wrap: nowrap` and `overflow: hidden`: a row can no longer grow, whatever
      is put in it. `--f-head-h` replaces the 57, 70 and 86 of the rail and pane rules.
    - **Measured** (Playwright, 390 × 844 touch and 1280 × 800, a `git archive` of `v3` 58a43041d against this tree): **before**
      73 px at `#report` and `#report?from=maps` (back button shown), 57 px at `#maps`, at Settings and after "←" or the
      browser's back; **after** 57 px in all of these, and at 360 px, in the seven designs, also after help opened and closed.
  - **3. Heights for modules in the dual view.** `:root` gets `--f-head-h`, `--f-vh` (dvh), `--f-view-h` (context-aware: the
    plain fixed view; `.f-view.f-split` sets it to `--f-split-h`; `.f-pane` to `--f-pane-h`), `--f-split-h`, `--f-pane-h`
    (INTEGRATION § 9.2 gives the table). **The frame also applies them**: `html.f-fixed .f-view.f-split > .f-module` gets
    `--f-split-h`, and the pane's module gets `data-fixed` (set by `openPane` from `meta.fixed` after the import, before
    `mount`) and `.f-pane > .f-module[data-fixed]` is `--f-pane-h` high, a flex column. So maps can drop both of its copies
    (`100dvh − 86 px − 44 px`, `100dvh − 57 px − 32 px`) in its next lot. The pane keeps its `max-height` (now a variable,
    `--f-pane-max-h`) and its 44 px close bar. A module that is not `fixed` is untouched. Judgement call: I did not change the
    pane's vh to dvh for the sake of it, it comes with `--f-vh` (same on a screen).
  - **4. The `display` rule.** `html.f-fixed .f-view:not(.f-split):not(.f-over) > .f-module` (five classes, which forced
    `!important` on the maps tuning page) is now wrapped in `:where()`: no weight, the same layout for a module that sets no
    `display`. The two new rules (split main, pane module) are weightless too. Checked: `[data-module="maps"] { display: grid }`
    wins without `!important`; without it the root is still a flex column.
  - **Designs.** No sheet needed a change: the header is 57 px and the "i" button fits in all seven (the `.f-head button`
    rules of metro, swiss, cupertino and material give it the same look as ? and ⚙); the pop-up's rows are overridden at
    `.f-info-modal .f-info-row` (two classes) so the flat-button borders of metro and swiss do not hit them.
  - **Checked** (Playwright + Chromium, 390 × 844 touch, 360 and 1280 × 800, seven designs set through `device/design.json`;
    scripts outside the repository): the "i" button 44 × 44 and inside the window at 360 px (back button shown, page 360 px
    wide); no badge with nothing, badge with a seeded started flight (written through `FrameData`) and with a seeded
    `pending.json` of two flights; the pop-up's lines in the four languages; rows of 44 px or more (57 / 58 px for two lines),
    ✕ 44 px, the sheet inside the window; Escape and ✕ close it; touches: flight → `#maps`, CR with a `handoff` → `#report?from=flightlog`
    (report took the hand-over, the record was consumed, "← Mes vols" shown, header 57 px), CR without → `#flightlog`, data →
    `#settings`; the offline line when the browser goes offline; header 57 px in all the cases above; pane module 670 px =
    800 − 86 − 44 and pane 714 px, split main 711 px = 800 − 57 − 32, no page scroll, in standard, metro, swiss, cupertino and
    material; phone fixed view 730 px (844 − 57 − 57); weightless `display` rule; no `pageerror`. `tools/format_sources.py` run;
    syntax trees (acorn) and CSS rules (the browser) before / after identical for the four formatted files.
  - **Not done**: no real flightlog record (the lot of flightlog is parallel: the seeded record follows the contract given by the
    relay); no iOS device (the pop-up under the notch and the badge ring on the blurred cupertino header are untested there);
    the "i" pop-up is a centred-right sheet, not an anchored popover with an arrow (a veil covers the page). `modules/*` untouched:
    maps still carries its copies of the two heights and its `!important`, to drop in its next lot.
  - **Docs**: SPEC § 3.1 (button, one-row rule, heights, weightless rule), INTEGRATION § 9.1 / 9.2 / new § 10, help intro ×4
    (a bullet on the "i" button; `pilot.*.md` regenerated), CHANGELOG, `docs_bundle.js`.
- **24 Oct 2026 — orientation locked to portrait** (user: "en attendant, on verrouille l'orientation"; done by the cloud
  relay, `relais-cloud.md`). `orientation: portrait` in the manifest and `screen.orientation.lock('portrait')` tried
  at start when the application runs standalone (ignored otherwise: a Safari page cannot be locked). Not done in
  `.github/workflows/ios.yml`: that workflow still wraps the V2 site, whose landscape layouts are wanted; the plist
  key is written in SPEC § 3.6 for the V3 shell lot. To remove when the landscape layout (map at the left, block as a
  right column) is decided and built.
- **24 Oct 2026 — Lot: the three-position sheet becomes a frame primitive; maps adopts it and takes the frame's heights**
  (asked by the cloud relay, holding the ergonomics role: `docs/technique/V3_SPECIFICATION.md` § 7.1, "Shared code between maps
  and atmosphere"; branch `v3-cadre-feuille` from `v3` b03bd1883). One exception to "the frame touches no module", granted by
  the relay because the two halves must land together: `modules/maps/module.js` and its documents.
  - **What was built.** `frame/lib/sheet.js` (`createSheet`, `POSITIONS`), the `.f-sheet*` rules and `--f-sheet-*` tokens in
    `frame/design/primitives.css`, `frame/lib/test/sheet.html` (a bench on a bare page), INTEGRATION § 11 and one sentence in
    § 9.2, SPEC § 3.9 and the design SPEC's primitives table. The code is the best of the two copies: maps' (pointer capture,
    live follow, nearest position, flick above 0.8 px/ms, tap, keys, `locked`, the `onChange` / `onSettle` pair and the
    `transitionend` settle) and atmosphere's shape (`ignore`, no module state), with `AbortController` instead of
    never-removed listeners (`stop()` now detaches everything).
  - **Judgement calls.**
    - *Positions are names* (`'collapsed' | 'default' | 'expanded'`, `data-sheet` too), as the relay wrote; a rank 0, 1, 2 is
      still accepted by `set()` and `pos:` to ease a port. The CSS of a module that keyed on `data-sheet="0"` changes.
    - *The `panel` of the options is the whole sheet* (header plus content), not "the scrolling part": it is the element
      whose height changes, as in both copies. The scrolling part is a new class, `.f-sheet-body`; `.f-sheet-panel` stays
      `overflow: hidden` (a header must not scroll away). The brief's "panel `overflow: auto`" is therefore on the body.
    - *Tokens*: `--f-sheet-head` 45 px (header 44 + the hairline, the collapsed height), `-default` 38 % / 35 % from 761 px,
      `-expanded` 70 %, plus the two floors both copies had (`-default-min` 170 px, `-expanded-min` 260 px) as tokens too.
      Values are `<n>%` or `<n>px` and nothing else (the script parses them; no `calc()`), defined with `:where()` so a module
      overrides them on its root with no weight fight. The heights are parts of the root's content height; `panel` must be a
      direct child of the root (`.f-sheet > .f-sheet-panel`).
    - *The grip bar is a `::before`* of the grip (no `<span class="…-pill">` to write) and is drawn with
      `color-mix(in srgb, var(--sog-muted) 55%, transparent)`, **not** `--sog-border` as the brief said: maps' pill is that
      colour and the lot's gate is a pixel-identical Map screen; `--sog-border` (≈ 1.35 : 1 on a white surface, against ≈ 2.4 : 1 for the muted bar) would be visibly
      fainter. The hairline on top is `--sog-border`. To change the bar everywhere, change that one line.
    - *Look kept as it was*: the upward shadow stays `0 -2px 8px #0000001a` (not `--sog-shadow-up`, which is `none` in the flat
      designs and heavier in the others), so no design changes.
    - *`labels` takes a function or an object*, and sets both `title` and `aria-label` of the grip (maps wrote the position
      into `title` only; the screen reader now hears the position as well, the one visible difference).
    - *`set()` schedules `onSettle`* (debounced with the gestures' own), except the starting placement: a caller that
      resizes its map in `onSettle` no longer needs a `ResizeObserver` for a programmatic `set()`. Maps keeps its own
      observer (it also covers rotation); both feed the same timer.
    - *`locked()` refuses the pointer gestures and not the keyboard*, as maps did.
    - *Collapsed hides every child of the panel but the header* (`display: none`), which replaces maps' rule on its three
      blocks; it is generic, the sheet still never knows what is inside.
    - *The grip and ✕ rules weigh three classes*: the first run showed cupertino's `[data-design="cupertino"] :is(button, .f-btn)`
      winning over a two-class rule and turning the title blue; with the third class all seven designs are pixel-identical.
    - *Pointer capture is in a `try`*: a synthetic event (the bench) or a finished pointer throws `InvalidPointerId`.
    - *Not done*: the sheet is not in `labs/design_primitives.html` (the design agent's page; archived on 11 Nov 2026 in `_archives/2026-11-11_labs/`); no print rule for it (a
      fixed module is not printed).
  - **Maps' side** (`modules/maps/DECISIONS.md` has the full entry): the local `createSheet` and its CSS are removed; the pane
    and split height rules and the `!important` too (the frame applies `--f-view-h`, § 9.2); atmosphere is not touched.
  - **Measured** (Playwright + Chromium, the launcher on the synthetic SIA base, tiles stubbed; "before" = `git archive` of
    b03bd1883 on its own launcher): the three positions 45 / 277.4 / 511 px at 390 × 844, 45 / 260 / 520.1 px at 1280 × 800;
    screenshots before / after **identical to the pixel at 390** (4 states), at 1280 the only differences are 88 pixels of at most
    5 / 765 in the frame's header (above the module; not in the sheet), the dual-view pane and split main at 1280 are the same size
    to the tenth of a pixel and differ by 1 to 2 levels on a few anti-aliased edge pixels; seven designs at 390, sheet header
    crops identical; bench 76 / 76 at 390 and at 1280.
- **24 Oct 2026 — Lot: overlay layer and full screen for fixed modules, header slimmed on a phone, group switch by popover**
  (asked by the cloud relay, holding the ergonomics role; branch `v3-cadre-plein` from `v3` eea37db50; the user's words of
  24 Oct, 14:00 and 14:05, `docs/technique/V3_SPECIFICATION.md` § 7.1: "Ce n'était pas le deal. header, carte, carte, footer.
  Les autres infos sont mises ailleurs." / "trop d'éléments sur le header. Prévoir une exemption pour certains boutons communs.
  Prévoir un « full screen » pour supprimer le footer et/ou le header." / "maximiser l'espace alloué à la carte").
  - **1. Overlay layer** (`ctx.overlay`, INTEGRATION § 9.3). Chosen between the two shapes of the brief: the frame creates
    the layer before `mount` and hands the two column elements (`left`, `right`) plus a `button()` helper; the module may say
    which element is its map (`over(el)`). *Why a sibling of the module's root, not a child*: maps and atmosphere write
    `el.innerHTML`, which would wipe a layer put in the root; the layer therefore sits in the view (`.f-view`, or the pane
    `aside`) and is laid in pixels over the map element (a `ResizeObserver` on the root and the map, a `MutationObserver` on
    the root's children only to find a map added after `mount`; both justified in the code, geometry written only when it
    changes). *Why pixels, not CSS*: the map's height moves with the sheet, and the root's layout belongs to the module;
    covering exactly the map makes "never over the sheet" true by construction. Default map element = the root's first child
    that grows (maps' toolbar line is first today, its map `.mp-box` has `flex: 1 1 0`); `over(el)` for any other layout.
    The right column wraps to a second column on its left when the map is too low (`flex-wrap: wrap-reverse`), so no button
    can reach the sheet. `.f-ov-btn`: 44 px visible, 48 px hit (a `::after` of 2 px), `--sog-surface` at 92 %, hairline, light
    shadow; **the radius is `min(50%, --sog-radius × 22)`: round in every design but `cabinet`, `field`, `metro` and `swiss`,
    whose radius is 0 and keep square buttons** (the user said "round"; the angle-free designs are mock-ups to be decided, one
    line to change). Three-class rules, as the sheet's, so the designs' button rules do not reach them. A pane gets the layer
    without the full-screen button.
  - **2. Full screen** (INTEGRATION § 9.4). `html.f-full` (only with `f-fixed`): header, bar (phone), rail (screen) hidden; the
    variables `--f-head-h` and `--f-tab-space` fall to 0 so every height follows (`--f-view-h` = `--f-vh` less the safe areas).
    **Judgement call: on a screen the rail is hidden, not folded to icons** (the brief left the choice): all the width to the map,
    the chip and Escape bring it back; a folded rail would need a rule per design (the Material rail is 88 px with labels).
    Remembered for the page's life, also under a frame screen opened over the module (the header comes back there, as
    `f-fixed` does; closing it returns to full screen), reset at a module change. The exit chip is `position: fixed` at the
    top right of the window (the view is then the whole window; fixed is relative to the view, which is a container) so it
    stays at the corner even while maps still draws its own toolbar line above its map; the right column starts under it.
    Escape order: group popover, frame screen, full screen (never with a question window open or when a module has
    prevented the key). `frame-fullscreen` (`detail.on`) then `resize` on `window` after each change. No Fullscreen API.
    Icon `minimize` added to `icons.js`.
  - **3. Header on a phone**: name · "i" · ⚙ (and "←" in place of the name after a passage). `.f-sync`, `.f-who`, `.f-host`,
    `.f-live` and `#fHelp` are `display: none` up to 760 px (the old phone rules that shrank them, and the `.f-lbl-short` span
    and its code, are deleted: nothing showed them any more). The "i" badge: green `data-badge` = news, amber `data-attn` =
    attention (no trigram once the identity is read, pending writes, conflicts, a synchronisation error, offline), amber wins,
    **amber only on a phone** (on a screen the header keeps its sync button, the badge stays green-or-nothing as before).
    `syncState()` is the one place that classifies the state (button and data line). New lines of the pop-up: the trigram
    line (tap → Settings; before the data line), an error text in the data line (an error was a red dot only), "Position :
    <source>" (live active; **a tap toggles the device's GPS like the badge it replaces**, since the badge's button is gone),
    and "Aide de cet écran ›" last (the "?" handler is now `openHelp()`, a toggle). These last two are `data-phone`: hidden on
    a screen. Rows that need attention have an amber dot. **Not done**: the launcher badge ("Lanceur de <poste>") has no line
    (the data line already names the transport "launcher"; the host name stays in the header on a screen only).
  - **4. Group switch without a row.** `paintSubtabs` / `paintTop` and the `.f-subtabs` click handler are removed. A second tap
    on the active tab opens `.f-tabpop` (a `position: fixed` element on `body`, not inside the bar, so the bar's `a` rules
    of the five designs do not hit its rows; 44 px `button` rows, three-class rules). Closing: a touch elsewhere (pointerdown,
    capture; the tab itself toggles through its click), Escape (focus back to the tab), scroll (capture, from outside the
    popover), resize, hash change. The click on the active tab is `preventDefault`ed (a single-module tab "does nothing" and no
    longer drops `?with=` from the address) except while a frame screen is open over the module. `aria-haspopup` on the tabs of a
    group of two or more. Updated: INTEGRATION § 9.1, SPEC § 3.1.
  - **5. Sheet default 30 %** (relay's addition, "maximiser l'espace alloué à la carte"): `--f-sheet-default` is 30 % up to
    760 px (floor 170 px), 35 % from 761 px; INTEGRATION § 11 and the design SPEC table follow; the bench's assertion changed
    from 38 % to 30 % (76 / 76 at 390 and 1280). `modules/maps` and `modules/atmosphere` documents still say 38 % (not touched).
  - **6. No margin under the header**: with the sub-tabs row gone (it had a 12 px bottom margin), the module's top equals
    `--f-head-h` (57 px): measured on `maps` and `atmosphere`, at 390 and 1280 px, the view and the module have 0 padding and 0
    margin.
  - **Measured** (Playwright + Chromium, touch emulation at 390 × 844 and 1280 × 800, seven designs set through
    `device/design.json`): header children exactly `fName`, `fInfo`, `fDevice` (44 px buttons, 57 px high); badge colours (computed
    colour of `::after` = `--sog-ok` for a seeded flight, `--sog-warn` without a trigram or offline, none with a trigram and no
    flight); pop-up lines, "Aide de cet écran" last, rows at least 44 px; popover rows 44 px above the bar and inside the window,
    switching, closing by outside touch / Escape / scroll / third touch, nothing on `maps`; on `#maps` the layer = the map box, its
    right column above the sheet, the full-screen button 44 × 44; full screen at 390: header and bar `display: none`, view 844 px
    at top 0, chip 44 px at 8 / 8, `resize` heard, no page scroll, Escape and chip and button exit, reset at a module change,
    kept across Settings; at 1280: header and rail hidden, view 1280 × 800; a stub fixed module (intercepted `modules/hello`):
    5 buttons + full, 52 px pitch, `pressed`, clicks reach the module, map gestures pass through, wrap to extra columns on a
    120 px map, four languages.
  - **Not done / to see**: no iOS device (safe areas, the Cupertino blur under the popover); the exit chip covers the last
    button of maps' toolbar line until maps migrates it; `modules/*` untouched (maps and atmosphere still draw their toolbars, their
    docs still say 38 % and "sub-tabs"); the page is 402 px wide on `#fuel` at 390 because of Fuel's own `.fu-when` row (the same on
    the base commit, not the frame's).

- **24 Oct 2026 — `frame/lib/geo.js`: longitudes around the date line** (maps session, relay cloud). Atmosphere had `wrapLon`,
  `nearLon` and `unwrapLons` (commit 5f45e0b18), maps and fuel needed the same: the helper is the frame's (INTEGRATION § 12),
  same logic as atmosphere's so that the weather cache cells are the same (the bench `frame/lib/test/geo.html` compares them).
  `unwrapLons` takes `{ lat, lon }` and `[lon, lat]`; a point already continuous is returned as the same object. No in-range
  shortcut in `wrapLon` (it would change the noise of atmosphere's cells). Atmosphere switches to the helper in its next lot;
  until then its copy and this one stay identical. Users: `modules/maps` (the whole screen), `modules/fuel/winds.js`.

- **24 Oct 2026 — finishing touches asked by the Map and frame lots** (relay cloud, branch `v3-cadre-icones`).
  - **`[hidden]` on overlay buttons**: `.f-overlay button.f-ov-btn[hidden] { display: none }` in `primitives.css`; the Map's
    workaround rule is removed (its `data-mp` attribute stays: the module's other rules hang on it). INTEGRATION § 9.3.
  - **Three icons** in `frame/lib/icons.js`, same grid and stroke: `cloud`, `undo`, `move4` (`move` is the vertical double arrow
    and stays, it is in use). The Map lost `localIcon` and its SVG copies and names the three icons through `ov.button({ icon })`
    / `svg()`. Other modules: no `localIcon`; the only inline `<svg>` found in `modules/*/module.js` are Fuel's charts (data
    drawings, not icons) and the Map's own level profile; Atmosphere draws none in `module.js`. Nothing else touched.
  - **Launcher line of the "i" pop-up** (the lot of 24 Oct had left it "not done"): shown when the transport is `launcher`, text
    "Launcher: {host} · {sync state}" (the state is the one of the sync button), after the data line, opens Settings; shown at
    every width (the header's host pill still appears only for a launcher of another computer on the local network). The host
    is the launcher's own name, else the page's host name. INTEGRATION § 9.3 / § 10, SPEC § 3.1.

- **24 Oct 2026 — Landscape on a phone** (relay cloud, branch `v3-cadre-paysage`; decision `V3_SPECIFICATION.md` § 7.1 rule 7, the
  user's two iPhone shots at 844 × 390: the map 163 px high, the bottom sheet half of the view and cutting its content, the
  buttons doubling up, the "flight date" slider taking a whole line; Safari does not honour the manifest's portrait lock).
  - **Detection**: `html.f-land` when the window is wider than high, under 1024 px, **and** the screen's orientation is not
    portrait (`screen.orientation.type` when the browser gives it). The last condition is mine: on Android Chrome an
    on-screen keyboard shrinks the window of a small portrait phone (360 × 640 → 360 × 320) and a size-only test would flip it
    to landscape while the user types; the screen's own orientation does not move. The class is set by an inline script of
    `index.html` before the first paint (same expression), then kept by `frame/app.js` (`resize`, `orientationchange`), one
    write when the value changes. `frame-orientation` (`detail: { land }`) is fired on `window` after it: the sheet primitive
    listens (it re-places itself without a transition). No observer, no timer.
  - **Rail**: the bar element (`#fTabs`) stays; under `f-land` it is the grid's left column (`--f-rail-w`, 44 px) and sticky
    under the header like the 210 px rail, which is not shown. No label: `display: none` on `.f-tab-lbl` and, **at the
    source**, `aria-label` and `title` on every `<a>` written by `renderTabs` (a hidden label would leave the link nameless).
    The item rules of the bar and the four designs' bar rules left their `@media (max-width: 760px)` (the bar is displayed
    only on a phone and in landscape, so the media condition decided nothing), otherwise a 844 px landscape phone got
    neither the pill nor the design's look (it is above 760 px). The line on the rail's right is an inset shadow, not a border
    (a border made 43 px cells). The popover opens at the right of the rail, first row facing the icon (not centred: the
    group tab is the first one, centring would cover the header).
  - **`--f-tab-space` = 0 and `--f-view-h`**: `html.f-land` sets both (the view loses nothing at the bottom but the device's
    home-indicator inset); 333 px on a 390 px window. `--f-split-h` and `--f-pane-h` do not change (they exist from 980 px
    and a pane in landscape at 980–1023 px would only lose 44 px of width).
  - **The sheet is a column**: `html.f-land .f-sheet` is a flex row, the panel keeps `.f-sheet-panel` and gets a width
    (`--f-sheet-side` 40 %, floor `--f-sheet-side-min` 280 px; expanded `--f-sheet-side-max` 60 %, parts of the **root's**
    width, resolved by CSS and by `sheet.js` with the same `max()`), `height: auto` (stretched). Modules are not touched
    (maps and atmosphere were read, not edited): their root rule `[data-module=…] { display: flex; flex-direction: column }`
    has one class, the frame's has two classes and an element, and the frame's `flex-direction: row` wins; the map was
    already `flex: 1 1 0; min-height: 0`, the frame adds `min-width: 0` to the root's children. Checked: both modules, five
    designs, no error, `ResizeObserver` boxes follow, the canvas follows the map box.
  - **Two positions**: collapsed becomes default (`norm()` in `sheet.js`, so `pos`, `set()`, Home, a sheet collapsed in portrait
    and then turned all say `default`; onChange gets `default` / `expanded` only). Tap toggles default ⇄ expanded (portrait:
    default ⇄ collapsed). Horizontal drag implemented (the same code on the x axis: it was cheap and a column the user cannot
    drag feels wrong), clamped between the two widths, a flick goes to the other one. A chevron at the end of the title row
    (CSS, no text) says which way. `transitionend` listens to `width` too. The portrait rule that hides a collapsed sheet's
    content is behind `:where(html:not(.f-land))` (specificity unchanged).
  - **Overlay**: nothing in `app.js` (the layer is the map's box, which is now 333 px high); `gap: 4px` under `f-land`. Measured:
    five buttons, six (one more shown) in one column, a seventh wraps to a second column on its left (maps' Edit mode has seven:
    left as is, it is "au-delà"; 4 px padding as well would still need 340 px).
  - **Full screen in landscape**: the existing rules already hide the header and the rail (`.f-tabbar` under `html.f-fixed.f-full`
    outweighs the rail's); the view gets the four safe areas. **Exit chip removed** (relay's decision of 24 Oct, journal: it is
    redundant since the modules' toolbars left; the column's button shows `minimize`, Escape also leaves): `.f-ov-exit`, its
    `position: fixed` rules, `html.f-full .f-ov-right { padding-top: 60px }` and the `T.full.exit` comment are gone, `T.full.exit`
    stays (the button's label). Help (fr, en, de, es, intro and Pilot manual), INTEGRATION § 9.4, SPEC, the suite (B5, B6) say
    so.
  - **Safe areas** (`viewport-fit=cover` is set): under landscape the rail's column, the header's side padding, the view's right
    margin and bottom padding (and the left, top and bottom in full screen) take `env(safe-area-inset-*)`; the right one is a
    margin, not a padding, so the view's own padding (16 px, 12 px under 761 px) of a page that scrolls is kept. Tried with Chromium's
    `Emulation.setSafeAreaInsetsOverride` (left 47, right 47, bottom 21): the rail is 91 px (44 + 47), the view 753 px, the
    column 282 px; nothing overlaps. Not tried on an iPhone.
  - **Not changed**: `screen.orientation.lock('portrait')` stays for the installed app (comment updated: Safari ignores it, hence
    this lot). A window of a computer, 761–1023 px wide and wider than high, is in landscape mode too (the rule says width and
    ratio only): the 210 px rail is replaced by the 44 px one; 1024 px and wider are unchanged.
  - **Verified** (Chromium, Playwright, touch 844 × 390; the suite's case A14 for `maps` and `atmosphere` in five designs, the bench
    `frame/lib/test/sheet.html` at 390, 1280 and 844 × 390: 129 / 129): the numbers asked: header 57, rail 44 × 333 at left 0,
    five entries, map at 44 / 57, 333 high, column 320 px (40 % of 800), 480 px expanded, handle at the top, no double column,
    no page scroll, full screen (0 / 0, column 390 high, no chip), Escape, hot rotation 390 → 844 → 390 (classes, boxes, canvas),
    a collapsed sheet turned, popover at the right of the rail; portrait boxes compared with the base commit (header, view,
    module root, map, sheet, bar, layer, `--f-*`) in maps, atmosphere, fuel, report, flightlog in two designs: **identical**,
    except the right column in full screen, which no longer starts 60 px lower.

- **24 Oct 2026 — The bare handle of the sheet** (relay cloud, branch `v3-cadre-poignee`; decision `V3_SPECIFICATION.md` § 7.1
  rule 13 b: no title above a drawing; the user's iPhone shots of the weather cut, "Toujours la ligne « météo fl160 »... info
  redondante, qui prend de l'espace vertical").
  - **Request = a class, not an option**: `.f-sheet-head-bare` on `.f-sheet-head`, one line of module code
    (`head.classList.toggle('f-sheet-head-bare', isDrawing)`). Not an option of `createSheet` or `set`: the header changes with
    the content (maps: Profile · Weather bare, Layers titled), an option would be state the primitive keeps and the module must
    keep in step; a class is what the module already writes on its own header, and the CSS reads it. `createSheet`, `set`,
    `labels(pos, rank)` and the positions are unchanged. Maps and atmosphere use these names.
  - **Token** `--f-sheet-head-bare: 28px` in `primitives.css` (no weight, like the others) and in `frame/design/SPEC.md`. The
    line is 28 px, the collapsed panel 29 (the hairline). `--f-sheet-head` (45 px) stays for the titled header.
  - **Heights follow the real header**: the primitive's floor for the drag and the nearest-position choice was the token
    `--f-sheet-head` read from the root; it is now the header's **measured** box plus the panel's top border
    (`headBox()`; the token only when the header has no box). The collapsed height in CSS cannot read the DOM, so it is
    `.f-sheet[data-sheet="collapsed"] > .f-sheet-panel:has(> .f-sheet-head-bare)`. A header that changes class while collapsed
    animates to the new height and `transitionend` fires `onSettle`.
  - **The grip bar is centred in the grip area** (the room the buttons leave), not on the whole line: with the segments, ◀ ▶
    and ✕ on a 390 px phone the buttons reach about as far as the centre of the line (the bench's five buttons start at the
    middle of 360 px), so a bar centred on the line could sit under the first of them. The cost: with only a ✕ the bar is 14 px off the line's centre. Asked for "centrée en haut"; if the line
    must be exactly centred, the buttons have to be narrower than half the width.
  - **Touch zones**: `::after` of 44 px high, centred, at least 32 px wide, on `button:not(.f-sheet-grip)` in the bare header
    (weight 4 classes + element, above a design's `[data-design] :is(button, .f-btn)`), with a 4 px gap so that zones tile
    without overlapping. Centred by `top: 50%` / `transform` and not by `inset`, so that a module's border on its buttons
    (1 px loses 2 px of height with `inset`) does not shrink it. The upper 8 px are clipped by the panel's `overflow: hidden`
    (the sheet's own edge): the zone is 36 px effective on top, 44 below the 28 px line, and bites 8 px on the body. 44 px
    visible, as the overlay buttons, was not possible on a 28 px line; the user asked for 28 + zone.
  - **Landscape**: the line stays at the top of the column; the chevron (CSS `::after` of the grip) gets `margin-left: auto`
    so that, with no title to push it, it sits at the end of the grip area.
  - **When** (written in INTEGRATION § 11): over a drawing, never over a list.
  - **Bench** `frame/lib/test/sheet.html`: 129 → 177 checks, a bare sheet in portrait (28 px line, no title, five buttons of
    28 px right-aligned and in order, bar centred in the grip and clear of the buttons, zones of 44 px, collapsed 29 px, expanded
    and default unchanged, tap, drag, flick, keyboard, a chip does not drag, the drag floor is 29 px and 45 px again once the class
    is removed) and in the landscape column (28 px, at the top of the column, no title, tap, drag).
    The suite's case C1 gives the bench 30 s and it already took 27 s; the new checks would have crossed it (C1 failed on the first
    run: "never reported done"), so the waits that followed an instant `set()` were cut to 80 ms and the other fixed waits shortened
    to the transition's 200 ms plus a margin: the bench takes 24 s with 177 checks (it took 27 s with 129).
- **24 Oct 2026 — The bar and the header by rule 14** (relay cloud, branch `v3-cadre-barre`; decision
  `V3_SPECIFICATION.md` § 7.1 rule 14, user, 24 Oct, 22:15: "il n'y a plus de bouton d'aide contextuelle en header. Tu vas le
  remettre, et enlever les settings du footer. Pour y mettre soit les fiches de perfo, soit la météo. Tu gardes néanmoins le
  principe de double clic sur le menu pour mettre plus de boutons"). Amends rules 3, 4 and 10.
  - **Bar**: Préparer · Carte · CR · Vols · **Météo**. Settings leaves the bar; the user's alternative (sheets or weather)
    is Météo, and the sheets stay where they are, a view of Préparer. `APP.tabs` loses its `settings` entry and gains a
    `weather` tab (module `atmosphere`, icon `cloud`, label Météo / Weather / Wetter / Meteo). The `screen` key of a tab
    stays supported by the code (nothing uses it). `tabFor` returns no tab over Settings: the pressed button is the ⚙.
  - **Where the sheets are**: not a module. They are the second screen of the fuel module (its Quote / Sheets switch,
    `modules/fuel/module.js`), reached by `#fuel?view=sheets` (`ctx.query.view`, written 24 Oct for exactly this). So a tab
    gets an optional **`views`** list (`{ id, module, query, label, icon }`): a view has no tab, only a popover row after its
    module's. Préparer's popover is **Carburant · Fiches** (a second touch, as before: "the principle of the double touch
    stays"). The popover marks the current row **from the address**: Fuel's own Quote / Sheets switch does not write the
    address, so after using it the mark can be one row behind. Not corrected here (a module's business: fuel could write
    `?view=` with `history.replaceState`; to ask the fuel session if it matters). Atmosphere left the Préparer group (its own
    tab now), so `ctx.tab` for atmosphere is `'weather'`.
  - **Header (phone)**: name (or ←) · **?** · **⚙**; the "i" button and its pop-up are removed from `index.html`, the code and
    the CSS (`#fInfo`, `openInfo`, `infoBox`, `.f-info-*`); on a screen too (the header there is: name, pane, "Trigramme ?",
    sync dot, ?, ⚙). `#fHelp` is no longer hidden on a phone. **Help**: the "?" opens the chapter of the current screen as on a
    screen; one improvement over the screen's code: with **Settings open over a module** it asks the Settings chapter (it asked
    the module's, because the module is still `current`).
  - **Badge on ⚙** (`#fDevice[data-badge]` green everywhere, `[data-attn]` amber on a phone only, amber wins), the same rules
    as the "i": green = a flight started or a report to write, amber = no trigram, pending writes, conflicts, sync error,
    offline, the base not ready. Computed by `paintStatus()` (the old `paintInfo`, same call sites). The button's name adds
    "something to see". Removed texts: `T.info.button` and `T.info.help` (the help row is the "?").
  - **Status block at the top of Settings**: the lines of the old pop-up, same texts and same actions (the rows are built
    by the same function: `statusItems`, the old `infoItems`, minus the help row), in a card `data-card="status"` with the title
    "Status" / "État" / "Status" / "Estado". **Who draws it**: Settings is an "over" of the frame but its content is drawn by
    `frame/settings/settings.js` in one `innerHTML` and redrawn by `again()`; the state (flight, pending reports, sync, base,
    launcher, position) belongs to the frame. So the frame draws the card (`statusBlock()`, a string at the value of the moment) and
    gives it through the settings context (`ctx.status = { html, bind }`); settings places it first and calls `bind(card)`
    once the card is in the page; from then the frame rewrites it when the state changes, **one write only if the content
    changed** (a short signature in `data-sig`), and forgets it once it leaves the page (`isConnected`). No observer, no timer.
    The settings' help panel moved under the card. A card without line is hidden.
  - **Rows that led to "Settings" now lead to the card that holds the answer** (we are already on Settings, a hash that does not
    change does nothing): `go: 'card:identity'` (trigram), `card:access` (base, launcher), `card:sync,usages` (data: the first
    that is visible), scrolled under the sticky header (`scroll-margin-top` on `.f-screen [data-card]`) and its first field
    focused. `#maps`, `#conflicts`, the report hand-over and the GPS switch are as they were.
  - **The rail of a screen**: unchanged. The brief said "Réglages kept at the end of the rail", but the rail (`#fNav`, the
    modules) never had a Settings entry in this tree (on a screen the ⚙ of the header opens it); nothing was added. The
    landscape rail on a phone (`#fTabs`) has the same five entries as the bar, Météo last, and no Settings.
  - **Icon**: `frame/lib/icons.js` (design's file) gets the filled variant of `cloud`, the tab icon needs one (the same
    drawing, filled); `frame/design/SPEC.md` says so.
  - **Tests**: A2 (name · ? · ⚙), A4 (five entries ×4 languages: Météo, no Réglages), A7 (Carburant · Fiches: a view row
    opens `#fuel?view=sheets` on the Sheets screen), A8 replaced by "status block at the top of Settings" (rows, 44 px, last
    action, Escape), A9 and the journeys (badge on ⚙; rows read in the block), A11 / A12 (the "?" opens the chapter), A14 (rail: Météo),
    A15 and flightlog's check (the base row and the report row are read in the block), E5 (no "i" of the frame: at most one "i"
    on a page, and not `#fInfo`; the legend chip of Atmosphere is the one that may come).
  - **Found while testing (not fixed, not the frame's)**: changing the address of fuel while its own `mount()` is still awaiting
    (reading libraries, the shared base) lets that first mount's `show('plan')` run on the state of the second (`S` is a module
    global of `modules/fuel/module.js`): `#fuel` then `#fuel?view=sheets` within milliseconds, on the slower designs, ends on the
    Quote screen. A7 now waits for fuel's first screen before the second tap. To tell the fuel session (a `mount` that checks its
    state is still the current one after its awaits).
- **24 Oct 2026 — Relais cloud: one navigation at a time** (found by the Fuel agent, see `modules/fuel/DECISIONS.md`): two or three
  changes of address in the same task (`#fuel`, `#atmosphere`, `#fuel?view=sheets`) left one `section[data-module]` per
  navigation in `#fView`, and as many overlay layers and sheets.
  - **Cause**: `route()` emptied the view, then awaited `import()` and `mount()` and appended its section in between; nothing told
    a navigation that it had been overtaken, so every one wrote its section when its import came back (the browser fires one
    `hashchange` per change, each reading the final address).
  - **Rule**: a navigation counter (`navSeq`), a token taken by each `route()` once it is past the framework screens; after the
    `import()`, after `mount()` and in the `catch`, a stale token returns without writing (no section, help panel, pane or error
    screen). The next navigation has already called `unmount()` on the module being mounted, emptied the view and dropped the overlay
    layers, so only the live section exists. The help and settings screens (`showDoc`, `renderSettings`) also compare the token.
  - **Not done on purpose**: no queue, no timer, no observer; the last change of address wins. A module's `mount()` may still be
    awaiting when its `unmount()` is called (INTEGRATION § 2 says so); Fuel already guards its own state.
  - **Test**: A16 (three addresses in one task, then one per task, with slow cache reads): one `section[data-module]`, one overlay,
    one sheet, no `pageerror`; it fails on the previous `app.js` (three `maps` sections).
- **25 Oct 2026 — Non-fixed modules on a phone: the title in the header, the how-to card with a ✕, the "?" at the right paragraph**
  (relais cloud, branch `v3-cadre-titre`; decision `V3_SPECIFICATION.md` § 7.1 rule 16, the user's proposal after a capture of
  Carburant on an iPhone: "tu peux laisser le « comment s'en servir » avec une croix de masquage. Une fois lu, ça disparaît, c'est
  redondant avec le bouton aide contextuelle. Bien vérifier que l'aide contextuelle arrive sur le bon paragraphe. Limite le
  surligner"). Three things, one lot.
  - **Who draws the card "Comment s'en servir"**: the frame, not the module: `SogHelp.panel()` (`frame/help/help.js`), called by
    `moduleHelp()` of `frame/app.js` after the module is mounted (a folded `<details>`, the first `##` section of the chapter).
    "Première fois ?" (`SogHelp.welcome()`) is the other card, also the frame's, already with a ✕ and a state (`welcomed`). No module
    code draws either.
  - **Title in the header**: `meta.title` (a row of four texts) read by `readLevels()` with the level, and again at the route (the
    module is imported anyway). `paintName(id)` (called by `paintModule`, so by every navigation, screen and return from a screen)
    writes `#fName` only when it changes, and toggles `html.f-titled`; `frame.css` clips the module's `h1` under that class. Source
    of the value: the module's own row, no copy in the frame. Not for a fixed module, a frame screen or above 760 px (a `matchMedia`
    listener repaints at the breakpoint). The back button used to hide the name on a phone: it now hides it only when it is the
    application's name (the title stays, it is the screen's name). Alternative refused: removing the `h1` from the modules (the
    module agents' files, and a screen reader would lose the heading) or a second text in the frame.
  - **The ✕**: a button in the card's `<summary>` (44 px, "Hide" ×4); it writes `hidden.<module>` in `device/help.json` (the
    file the card already uses for `open` and the welcome card for `welcomed`; cache policy: this device only, never sent) and
    `panel()` returns nothing for that module. **Way back chosen**: "Show the first steps again" under the chapter title in the help
    (only for a module whose card is hidden), not a line in Settings: the person who looks for the card goes to the "?" (which is
    what the card says), and Settings has enough cards. It clears the flag, opens the card, puts it back at once when the module is
    still drawn under the help, and returns to the module.
  - **Anchor of the "?"**: `ctx.helpAnchor(id | () => id | null)`, stored by the frame per module (`helpAnchors`, cleared at the
    next navigation), read by `openHelp()` when "?" is pressed (so a function sees the step as it is then); the address is
    `#help?m=<id>&a=<anchor>` (`&a=`, not a second `#`: the router reads one hash). Chosen over a `meta.help` function: the module
    calls it once, the frame owns the address. `help.js` scrolls to the anchor (a `scroll-margin-top` under the sticky header, which
    the chapter's own title lacked too: "Revoir les premiers pas" was under the header) and gives its paragraph the class `f-hl`
    for 1.5 s, **only** when `m` and `a` come together (a link of the contents has `a` alone: no highlight), and once (the class
    is removed by a timer, no observer). Anchors: `<a id>` at the start of a paragraph or in a `##` title (the renderer of the
    help, `frame/lib/markdown.js`, takes it out of the title and makes it the title's id: the only change to that copy of V2's
    renderer). In the panel the same ids become `data-a` (one owner of an id in the page).
  - **Added to the chapters** (four languages, `modules/<id>/help/*.md`): Fuel `fuel-quote` (the introduction), `fuel-step-1` …
    `fuel-step-5`, `fuel-sheets` (the Sheets title); Report `report-steps`, `report-step-1` (The last flight), `report-step-2` (The
    mission), `report-step-3` (The result), `report-save`; Flights `flightlog-totals`, `-filters`, `-list`, `-detail`, `-report`, `-current`,
    `-more`. `build_help.py` checks that the four languages carry the same anchors, with the module's prefix, unique, and that the
    anchors cited in `helpAnchor(...)` exist.
  - **Tests**: A2 (title in the header of the three modules, application name on the fixed one and over Settings, `h1` clipped), A17
    (from Fuel step 3, Report step 2 and Flights: the address, the paragraph in the window with `f-hl`, the class gone within
    1.5 s, an unknown anchor and a chapter alone highlight nothing; ×4 languages), A18 (✕, still hidden after a reload, per module,
    the way back).
- **25 Oct 2026 — The sheet is rewritten from the fixed rules (V3_SPECIFICATION § 7.1 rule 19; relay cloud, branch `v3-feuille-v2`)**:
  user, 24-25 Oct: "Déplacer le volet par la poignée fait clignoter et apparaître une zone grise" / "il lui arrive de clignoter. C'est le
  signe qu'il faut totalement le reprendre, à partir des specs maintenant fixées. On repart d'une feuille vierge… Le résultat doit
  être le même qu'aujourd'hui fonctionnellement".
  - **Diagnosis, before any code** (Chromium 390 × 844 and 844 × 390, `frame/index.html#maps` with the flight of the D cases and a
    forecast, MapLibre on the runner's empty style; a `MutationObserver` on attributes, `ResizeObserver`s on the map frame, the panel,
    the body and the profile frame, setters of every canvas's `width` / `height`, a wrapper of `maplibregl.Map.prototype.resize` with
    its call stack; the drag is a mouse down on the grip, 4 slow legs of 24 moves every 40 ms, then the same in 6 fast moves every 8 ms;
    the scripts are in the session's scratchpad). **Reproduced.** Portrait, slow drag, 394 frames, 62 height changes of the panel:
    **69 `map.resize()`**, 69 resets of the MapLibre canvas (each one clears it; MapLibre draws again on the next `requestAnimationFrame`, and
    a `ResizeObserver` callback runs after layout and before paint, so the frame in between is painted with an empty canvas and the
    frame's background, the page's grey: the blink and the grey zone), 62 resets of the module's overlay canvas (redrawn at once),
    50 resets and redraws of the profile canvases, 138 toggles of the tooltips, 62 `ResizeObserver` callbacks on the map frame; 9 more
    `map.resize()` and as many resets after the release (the 200 ms height transition keeps the frame moving). Fast drag: 19 resizes for
    16 changes. Landscape column: 35 and 11. **Who calls `resize`**: of 50 calls in a 48-move drag, **48 come from MapLibre's own
    `ResizeObserver`** (`trackResize`, on by default: its stack ends in `maplibre-gl.js … ResizeObserver`), 2 from the module's `mapSize()`
    (the canvas is rarely still at the old size when the module's observer runs, MapLibre has just resized it).
  - **Conclusion: the flicker is the Carte's, not the primitive's.** The primitive wrote one height per `pointermove` (62 writes for 62
    changes; but it also read `getComputedStyle`, `clientHeight` and `getBoundingClientRect` at every move, a forced layout each time, and
    left the 200 ms CSS transition to move the frame for 12 more frames after the release): it changes the frame, it never touches a
    canvas. The Carte's glue answered every size change of its frame by resizing and redrawing everything: MapLibre's own observer
    (`map_base.startTiles`, `trackResize` default), the module's observer of the frame (`mapSize` + overlay resize and redraw), of the
    sheet (`setBottomInset`), of the body (`redrawWeather`) and of the profile frame (`drawProfile`): four observers plus MapLibre's.
    Atmosphere does not flicker for the same primitive because its map container is oversized under the sheet (`--at-full-h`): its frame
    clips it, nothing resizes while the sheet moves, and its observers return while `f-sheet-nt` is on the panel (E7 passes there).
    Measured on the new code: during the same drags 0 `map.resize()`, 0 canvas resets, 0 `ResizeObserver` reactions that act (the
    observers fire, the module's only calls `sheet.settle()`, which does nothing while the sheet moves); after the release, one
    `map.resize()` and one resize of the overlay when the position changed.
  - **`frame/lib/sheet.js` written again**, same API (`createSheet({ root, panel, head, grip, pos, ignore, labels, locked, onChange,
    onSettle }) → { pos, set, settle, stop }`), same HTML, same classes (`.f-sheet`, `-panel`, `-head`, `-grip`, `-title`, `-close`,
    `-body`, `-head-bare`, `f-sheet-nt`), same tokens (`--f-sheet-*`, `--f-rail-w` is the frame's), same landscape column. One state, the
    position; at rest the height is the style sheet's (`data-sheet`, tokens) and nothing else. **A move** (a drag, a glide) is carried by
    one custom property, `--f-sheet-live`, plus `height: var(--f-sheet-live)` (`width` in a column) written once on the panel: the
    measures (the three sizes, from the tokens; the size at the start) are taken **once, when the finger takes the sheet**, then one write
    per move and only if the rounded size changed, no read; `f-sheet-nt` is on the panel under the finger (Atmosphere's `dragging()`
    reads it). At the release the sheet **glides** by a Web Animation (200 ms `ease`, none under `prefers-reduced-motion`) from where it is
    to the size of its position, then the property and the inline height are removed (one layout write, the style sheet's height equal to
    the animation's end) and **`onSettle` is called at once**, in the frame of the last size change (before, `transitionend` + 120 ms: the
    map showed a stale frame for 120 ms). No minuteur de rattrapage, no `transitionend`: the end of the glide is the animation's. `settle()`
    (120 ms timer) stays for a size change that comes from elsewhere and does nothing while the sheet moves. `instant` places the sheet
    without a glide (`f-sheet-nt` for one frame, as before). A finger put on a gliding sheet stops it where it is. `stop()` leaves no inline
    style. The `transition: height .2s` rules of `primitives.css` are gone (the class `f-sheet-nt` has no rule now: it is a marker).
  - **Why not a transform**: tried first (the panel at the height of the expanded position, moved by `translateY`, a negative margin to keep
    the map's frame still, nothing redrawn): it does not reveal the map when the sheet goes down (the strip the frame no longer covers is
    the page's grey) and it breaks Atmosphere, whose oversized map is revealed by the frame growing. The frame must follow the sheet (it
    did, it must keep doing so: the C and D cases measure map + panel = view); what changes is that **no module redraws until `onSettle`**.
  - **Rule of the spec vs § 11**: none contradicted. § 11 said "a 200 ms height transition" and "`onSettle` 120 ms after the last change":
    both are amended in `INTEGRATION.md` (the glide is the primitive's; `onSettle` at the end of the glide, 120 ms for the rest).
  - **Contract**: unchanged for a module that follows § 11 (Atmosphere was not touched and passes E1-E7). New in the documentation, not in
    the API: what a module does while the sheet moves (§ 11 "What a module does while the sheet moves"); `onSettle` can now come
    earlier than 120 ms after the last change (it never came during a move).
  - **Bench** `frame/lib/test/sheet.html`: 177 checks before, 186 now (section "mouvement": no `onSettle` during a drag even with pauses
    longer than 120 ms, at most one style write per move, the height carried by `--f-sheet-live` only, no `onSettle` at the release, one at
    the end of the glide with the position, nothing left inline, a finger put on a gliding sheet takes it where it is).
  - **Tests**: C1 (bench), C2-C6, D20 (new, maps), E1-E7 pass; see `tests/v3/PLAN.md`.
- **28 Oct 2026 — Lot 25, after the review of the relay's frame** (points 1, 5, 6, 7 and 8 of the review, agreed by the
  coordinator):
  - **Service screens** (`APP.screens`). The laboratory's 45 lines leave `app.js` (`renderDatalab`, `LAZY.datalab`, the
    `aerodb-lab` adapter).
    - One declaration (`id`, `scripts`, `level`, `reads` / `writes`, `github`) and one generic `renderScreen()`. The
      frame checks the level and gives the context; the script registers `window.SogScreens[id]` (one line added to
      `aerodb/lab.js`).
    - `app.js` names no service outside the declaration.
  - **`unmount` during `mount`**: now a contract of INTEGRATION § 7, with what a module does about it.
  - **Status lines published by the modules** (`cache/<module>/status.json`, INTEGRATION § 10.0). Each line has a text
    ×4 ready, an address (`#module` or a frame screen, anything else dropped), `news` / `attn`, and an optional
    `handoff` that the frame writes as it is, adding `from`, `source`, `at` and `fresh`.
    - Every module may publish, not only flightlog: value at the source.
    - The frame still reads flightlog's `pending.json` (schema 2) until it switches, and ignores it as soon as
      flightlog's `status.json` exists.
    - Flightlog's switch is briefed to Features SOG by the coordinator.
  - **`ctx.titled`** and the event `frame-titled` (`{ module, titled }`), with a primitive `.f-sr` (screen readers only).
    The module draws its `h1` hidden itself. The CSS rule hiding `.f-module > h1` stays until fuel, report, flightlog and
    website switch (dated debt).
  - **Dated debts** in SPEC § 4: `ctx.launcher` (setup, lnmperf, laboratory), the `h1` rule, `pending.json`.
  - **Tests** (`t_l25`, 9 / 9):
    - `app.js` has no `AeroLab` / `renderDatalab` / `aerodb-lab`, and `'datalab'` only in its declaration;
    - `#datalab` drawn by `SogScreens` at the Full level, refused with the reason at Everyday;
    - a published line shown in French with the green badge;
    - a line whose address is `javascript:` shown without a link, a line without text dropped, the old `pending.json`
      ignored;
    - the touch opens `#report?from=flightlog`; report takes the hand-over (LFRS) and the header says "← My flights";
    - `frame-titled` `{ flightlog, true }` at 375 px, then `false` at 1280 px;
    - no JavaScript error.
    - Also checked: without `status.json`, `pending.json` still gives its "report" line. `frame/store/test/` 90 / 90;
      lot 21 bench 12 / 12. My older application bench stops at the phone's menu button, which the relay replaced with
      the tab bar: a stale bench, not a regression.
  - `tests/v3/run.py` could not run here: Playwright is not installed (the user's decision, coordinator).
- **28 Oct 2026 — Lot 26, one weather layer** (`frame/lib/weather_store.js`, `ctx.weather`; brief of the coordinator,
  V3_SPECIFICATION § 8 and § 9.8):
  - **Written anew** from the specification. Atmosphere's store (`modules/atmosphere/weather_store.js`) was the reference
    of behaviour, not code kept: same cache layout (`cache/weather/<model>/<cell>/<UTC day>.json`), same weights, same
    lifetimes. Its readers switch in their own lots (fuel by Features SOG, Atmosphere rewritten).
  - **The choice of the model by region** moves into the store (`modelFor`, fuel's three boxes, longitudes wrapped by
    `geo.js`). The model of a route is the one of its middle point, as fuel did.
  - **One planning at a time, the requests together**: the missing cells, days and variables are computed under a lock
    and marked in flight, so that two readings of the same cells make one request; the requests themselves run in
    parallel.
  - **Quota with a 10 % margin** (540 a minute, 9,000 a day): the count is this device's alone; other devices behind the
    same address count too at Open-Meteo, which the margin covers in the usual case.
  - **The Status line reads the ledger, not the store**: the frame does not load the store to draw the line; it reads
    `cache/weather/ledger.json` when it changes (`watch`) and counts the UTC day at drawing time, so that the number is
    right after midnight without a timer. The line shows only when the day has calls, so that an unused device keeps an
    empty Status block.
  - **Out of backups**: `dump` / `load` leave `cache/weather/` aside; `load(replace)` keeps this device's weather cache
    and ledger like its keys.
  - **Measure** (real Open-Meteo, LFRS → LFML, fuel's samples: 9 points, 42 variables, model Météo-France):
    - first load: before 1 request, 37.8 weighted calls, 26.4 KB transferred; after 1 request (and the run's metadata,
      not counted), 37.8, 25.8 KB. Same cost: the cells of a first flight are all new.
    - second load of the same flight: before 37.8 and 26.4 KB again (fuel's own cache keeps one route); after 0 and 0.
    - a second flight from the same field (LFRS → LFBD, 4 points): before 16.8, 12.4 KB; after 12.6, 9.4 KB (the LFRS
      cell is shared).
  - **Tests**: bench `frame/lib/test/weather_store.html`, 70 / 70 (cells and the date line, models, weights, aloft's
    shape, missing cells / days / variables only, grouping, concurrent readings, run and lifetimes, refused variable,
    the day's stop and the minute's wait, the sliding 24 h, pruning once a day, METAR / TAF with and without a launcher,
    the world index and steps, offline, GFS cells); case A25 of `tests/v3` (the bench, area A). `tests/v3/run.py` could
    not run here: Playwright is not installed (the user's decision).
- **28 Oct 2026 — `ctx.titled` across a resize; the `h1` rule removed** (report of Features SOG, through the
  coordinator):
  - Reported: from 375 to 1280 px without a reload, `html.f-titled` stayed and no `frame-titled` was sent. Not reproduced
    here: Playwright (with and without touch) and Chrome's device emulation (mobile or not) both see the media query's
    `change`, the class removed and the event `{ fuel, false }`. A safety net is added all the same: `resize` and
    `orientationchange` call the same drawing, which writes and sends the event only when the value changes.
  - The CSS rule that hid `.f-module > h1` under `html.f-titled` is removed: fuel, report, flightlog and website give their
    `h1` the class `f-sr` themselves (website keeps a visible `h1`: the frame does not title it). Dated debt closed
    (SPEC § 4).
- **28 Oct 2026 — `progress.actual` fixed; Escape taken by a module** (lot 0 of the recoded Map, through the coordinator):
  - **`progress.actual`**: the shape the frame writes is now a contract (INTEGRATION § 6): `at`, `lat`, `lon`, `altFt`,
    `gsKt`, `trackDeg`, `source`, with their units, what may be null, when it is null, and how often it is written. The names
    stay those of the code (`altFt`, `gsKt`, `trackDeg`): the unit in the name, value at the source; the brief's short
    names (`alt`, `gs`, `track`) would have meant a second shape for the same record.
  - **Escape** (INTEGRATION § 9.4): the frame now listens on `window` and ignores a key press whose `defaultPrevented` is
    true, whatever it would have closed (popover, frame screen, full screen); before, it listened on `document` from its
    start, so it saw the key before a module's own `document` listener, and only full screen looked at `defaultPrevented`.
    When it uses the key it calls `preventDefault()` too. Order: what the module opened, the popover, the frame screen,
    full screen.
    - Maps already takes the key (`esc0`, capture, `preventDefault`). Atmosphere closes its legend on Escape without
      `preventDefault`, so the same key also leaves full screen: one line for its next lot.
  - **Tests**: new case B11 (a module's `document` listener takes Escape: full screen and the Settings screen stay; the next
    Escape closes them and is marked taken); A7, A14, B5, B7, B8 and B11 pass.
- **28 Oct 2026 — `html.f-desk`, a computer** (for the Aqua design, condition of the coordinator): the frame decides
  whether the device is a computer, as it decides `f-land`; the design session does not touch that logic. Rule: wider
  than 760 px, `(pointer: fine) and (hover: hover)`, not `f-land`. Set before the first paint in `index.html`, then on
  `resize`, `orientationchange` and a change of pointer, one write when it changes, `frame-desk { desk }`. Checked in
  Playwright: 1280 with a mouse → set from the first paint; 375 and 900×600 (`f-land`) → removed, event; back to 1280 →
  set; a touch device at 1280 → never.
- **28 Oct 2026 — Weather layer: the run of the data, the precision of a cell** (fuel's return after switching to
  `ctx.weather`, through the coordinator):
  - **The run shown was not the data's**: for Météo-France the layer read the metadata of AROME HD (run every 3 h,
    surface fields only: 03:00Z), while the winds aloft and the short name "ARPEGE" are ARPEGE's (06:00Z), which fuel
    read. A "seamless" model has no metadata: the layer now reads those of the model that carries its pressure levels —
    `meteofrance_arpege_europe`, `dwd_icon`, `ncep_gfs025` (GFS: the 0.25° grid of the levels; it read `ncep_gfs013`).
    The run kept on the device now says which metadata it came from, and an hour read for another model is not served
    again. A cell kept with the old run is read once more (the run changed): one request per flight, once.
  - Consequence, written: a new AROME run (every 3 h) does not refresh a cell before the next ARPEGE run or its 6 h; the
    surface fields of a grid may lag AROME by up to 3 h. Acceptable while the readers are fuel's winds aloft.
  - **The cell's centre** (LFRS read at 47.150 instead of 47.157: about 1 kt and 5 kg on a quote) is the contract: written
    in INTEGRATION § 14.2 ("Expected precision").
  - Bench 73 / 73 (three checks added: the metadata of ARPEGE Europe and of GFS 0.25°, an hour kept for another model
    ignored).
- **28 Oct 2026 — "Open them too" leaves the code alone** (review of the Settings session, through the coordinator):
  `lan_open(every=True)` on an access already open issued a code when none was running, and so reopened a pairing closed
  after 30 wrong codes, against the rule "closed until the next New code". Now, on an open access, it only adds the
  other private addresses; the code is the business of "New code" alone. Opening the access itself (closed before) still
  issues a code: that is the gesture that starts pairing. Checked in the launcher's process with a fake server and fake
  addresses (nothing opened on the network): open → one address and a code; "Open them too" → two addresses, same code;
  no code running → none issued; pairing closed → stays closed; a fresh open with every → a code.
- **28 Oct 2026 — "Failed to register a ServiceWorker … unknown error when fetching the script"** (coordinator, launcher
  on 8774): not the launcher. The same registration fails in the desktop app's built-in browser on a bare static server
  (no Clear-Site-Data, no CSP, no nosniff; the script fetched by `fetch` answers 200 `text/javascript`), and succeeds in
  Playwright's Chromium, with the launcher's purge page included. The built-in browser does not register service workers
  for these pages: the frame works without one (no offline copy there), nothing to change.
- **28 Oct 2026 — The recoded Map's touches to the frame, reviewed** (BUGS SOG, `c6d69d031`, integrated by the
  coordinator):
  - **`DIRECT_PATHS`** (the Terrarium elevation tiles, `s3.amazonaws.com/elevation-tiles-prod/`): agreed, one path and not
    the host. Narrowed further: https and GET only, like the airline's site. The URL's path is normalised before the test
    (`..` and `%2e%2e` resolved by `URL`), so the prefix cannot be walked out of.
  - **`ctx.level`**: agreed, a getter. Written as what a screen offers, never a right: the data repository decides what is
    written.
  - **`frame/lib/current_flight.js`**: the corrections of the review are in (longitudes by `geo.js`, the same rule as
    `etaOf` for a past unstarted flight, numbers read as numbers, positions along the great circle). Its row in SPEC § 3
    and a paragraph in INTEGRATION § 6.
  - **`frame/lib/routing.js`** (moved from the Map): its row in SPEC § 3.
- **28 Oct 2026 — A store script lost on the way no longer leaves a blank page** (E1 of the Settings gate, Atmosphere at
  390 / material / fr, 1 run in 6: "Cannot read properties of undefined (reading 'detect')"):
  - Cause: not a race in `app.js`. `FD` was there but `FD.launcher` was not: `store/transport_launcher.js` had not run
    (its load lost, the runner's server or a service worker without its copy). Reproduced by aborting the file: the frame
    stopped on the first `FD.launcher.detect()`; with `transport_github.js` lost, on `FD.github.persist` ("reading
    'persist'"), before anything was drawn.
  - Fix at the source rather than a guard on each of the 21 uses: `app.js` checks its three store scripts first; a
    missing one is asked again once (`?retry=`), then `app.js` runs again from scratch. Still missing: a card in the view
    names the file and offers "Reload" (×4, the language of the device or of the browser), no JavaScript error.
  - Checked: each of the three files lost once → the frame starts, the module mounted, no error; lost for good → the
    card, no module, no error. Case A28 (A26 and A27 were taken by the Settings session).
- **28 Oct 2026 — Lot D0: the frame's services for the Data module** (contracts agreed with the coordinator the same day,
  `modules/data/INTEGRATION.md` § 1):
  - **`ctx.launcher`, declared** (`meta.launcher { routes, read }`, as `reads` / `writes`): least privilege, anything else
    refused without a call (403, `refused`). Null without a launcher, on a paired device (`lan`) and without a declaration;
    no `available()`: the null says it, and the survey is done before the first mount. `call` / `job` / `resume` / `read`,
    never an exception. The job protocol is fixed (start, `?id=` about once a second, `/cancel`, `GET` without id for the
    running one); unmount stops following only (the job goes on, `resume` finds it). 404 → « unknown route » (a launcher
    older than the module).
  - **One client** (`frame/lib/launcher.js`) for the frame too: Settings' `setup()` (`kit.js`, bound at the first drawing),
    aerodb's `.lnmperf` sheets (`AeroDB.create({ launcher })`; aerodb's benches keep their direct call when no launcher is
    given), the simulator's position, the local network's access. The debt of 28 Oct (« three pieces call the launcher
    with fetch ») is closed; only the network relay keeps its `fetch` (its answer is the relayed site's).
  - **The jobs' base in the launcher** (`tools/regen_jobs.py`): one job at a time, a fixed list of (set, verb) with
    their argument checks, cancel, the last job readable, an exception ending the job and not the launcher; 410 for an
    unknown job (404 means an unknown route for `ctx.launcher`). `regen/state` and one verb, `state/scan`; the builders'
    verbs in D2.
  - **`ctx.publish`, not `github()`**: the token and the full transport stay in the frame (the debt written this morning
    on the token's reach). One commit per group (a zone), in order, each on the head read just before, blobs one by one;
    a conflict is returned and resumed with `from` (aerodb's point: 20–60 MB in hundreds of files, never one giant
    commit). The `reference` copies of the published paths are dropped after each group. GitHub's limits written
    (INTEGRATION § 15.2).
  - **The end-of-cycle line** is computed at drawing time from `aerodb.publication()`, so it is right on the day the cycle
    changes without a timer; absent until aerodb delivers the call (never a guessed line). Amber; `#data` only on a
    workstation with a launcher at the Full level, once the module exists.
  - **The « Données » verb** waits for `modules/data/module.js` (a verb without a module would lead nowhere). Workers: no
    change, `worker-src 'self' blob:` was already in the policy.
  - **Tests**: bench `frame/lib/test/launcher.html` 32 / 32 (case A29), bench `frame/store/test/publish.html` 12 / 12
    (A30), A31 (the end-of-cycle line ×4, `publication()` simulated), I8 (the jobs' base, a static case). Against the
    real launcher: a `state/scan` job followed to its end by the client, an unknown operation refused (400), a call
    without the frame's header refused (403); Settings at the Full level reach `lan`, `lnmperf-folder`, `secrets`,
    `sync-remote` through the client, no JavaScript error.
- **29 Oct 2026 — Four touches to the frame's files reviewed; « Météo », one word** (coordinator, after 6.0.0-alpha.2):
  - Agreed as they are: the launcher opens the Pilot application (`PAGE = 'frame/'`, 482e87705); the EAD Basic secrets kept
    without any hint towards the page (`SECRET_FIELDS`, `secrets_view`, ffb026685); `proc/ead-fetch` and `proc/eaip-fetch`
    in INTEGRATION § 15.1.
  - Narrowed: `/__setup/status`, open to the paired devices of the local network, gives them only what the frame's
    detection reads (`server`, `data`, `dataGit`, `host`, `lan`, `lnm: []`): no longer the installation's absolute path
    (`root`), the data repository's address, git, LFS, the policy or navigation settings, nor the Little Navmap database
    kinds (82eeef3b5); the workstation's own page gets everything as before. The job the frame gives aerodb (`launcher.job`, daff9f1fb) is null on a paired device, like `ctx.launcher`,
    instead of calling a route refused there.
  - **« Météo »**: the weather module is « Météo » / Weather / Wetter / Meteo everywhere — the computer's rail (it said
    « Atmosphère »), the phone's bar, the group popover, the header's title (`APP.modules` label), the help (fuel's and
    the map's chapters name it so) and the roadmap. The id and the address stay `atmosphere`. « Atmosphère réelle au
    départ » (a card of fuel) and the German help's « Atmosphäre entlang des Flugs » name the physical atmosphere, not the
    module: kept. Translation fingerprints of fuel's and the map's help updated (they were in step before).
- **29 Oct 2026 — Three bugs** (lot (1) of the challenge, § 10.29):
  - **J2's amber flash**: on the local transport a write of fuel stayed « pending » about 25 ms before the queue was
    drained; `syncState` called that « pending », a state of attention, and the ⚙ turned amber for that instant (seen 1
    time in 6 at the start of J2). Rule written in SPEC § 3: the local transport is « on this device » whatever its queue
    holds; it never asks for attention.
  - **The end-of-cycle line never showed**: aerodb's `publication()` (lot D1) gives `cycles` as an object keyed by dates,
    the line read a list. It reads both now. A31 runs on the real `publication()` (a base seeded for the previous cycle,
    then the suite's own base: no line), not on a simulated one.
  - **The suite's seeded base followed no calendar**: `lib.aero_docs()` seeded the cycle `2026-10-15`, in force until
    28 Oct; since the 29th every case seeding a base would have shown the end-of-cycle line. The seed now takes the AIRAC
    cycle in force (or the next one in its last 3 days, published ahead as a workstation would), `lib.AERO_CYCLE`; the
    map's case that printed the date reads it there.
  - **`Job.log` and `Job.step` are cleaned** of secrets (`clean_error` with the context's EAD credentials), whatever the
    verb writes: no verb can put a credential in the journal by mistake (I8 checks it).
- **29 Oct 2026 — `FD.revalidate(paths)`** (lot (2) of the challenge, § 10.29; AeroDB's need: the freshness of `proc/`
  after another device installed procedures):
  - **These paths only**, now: one head and one tree for all of them (shared with any reading in flight, `treeNow`), then
    only the changed files are read. Not a sweep of a prefix: the background pass does that.
  - **What wins**: a write waiting in the queue (the device's own); a `cache` file has no repository; a `reference` gone
    from the repository is dropped (a document gone is left to the pass, which knows deletions from conflicts).
  - **Never throws**: offline stops the reading and touches nothing more (`offline: true`); a file the repository refuses
    (rights, size) is said in `errors` and its copy kept.
  - **Given to**: the data layer (`FrameData.revalidate`), every adapter (`ctx.data.revalidate`, aerodb's reader), and
    `ctx.publish`, which revalidates the published paths instead of dropping their copies (evicted only when offline).
  - **Tests**: bench `frame/store/test/revalidate.html` 14 / 14 (case A33); A30 (publication) unchanged.
- **29 Oct 2026 — Lot (3a): the jobs' base, alone** (challenge § 10.29):
  - **One file per set** (`tools/regen/<set>.py`, its agent's), loaded by the base (`load_verbs`), never registered by
    hand. Loaded when the launcher first needs the jobs, not at import, so a set file may import the base. AeroDB's
    procedure verbs stay where they are until its `tools/regen/proc.py` lands (agreed with it the same day: two verbs kept,
    `MIN_GAP` per verb, so the 30 s of EAD never fall on the eAIP).
  - **One commit path** (`commit_outputs`): the outputs' paths only, `--` paths (HEAD plus those files, never the index),
    the page's trigram as author, never « POSTE ». The frame adds the trigram to every job's start; a module never does.
  - **The state kept** in `tools/.regen_last.json` (git-ignored): a job interrupted by a stop is said so after a restart,
    and a verb's gap survives a restart (time of day, not a monotonic clock).
  - **Tests**: I8 extended (set files loaded and a failing one left aside, `_…` skipped; author kept, a bad one dropped;
    restart: last job found, gap held, a running job read back interrupted; `commit_outputs` on a real repository: outside
    paths and `..` refused, no trigram no commit, one commit with the page's author and only its path, nothing changed no
    commit), A29 extended (the trigram added to a job's start, none without it). Against the real launcher: a
    `state/scan` started with `author: 'ABC'` keeps it, the state file is written and ignored by git.
- **29 Oct 2026 — Lot (3b): the client and the addresses** (challenge § 10.29):
  - **One refusal shape** written in INTEGRATION § 15.1: `{ ok: false, status, route, message, reason?, wait? }`; A29
    checks it field by field (a 429 hands on `reason` and `wait` and nothing else of the body, a refusal without reason
    has neither).
  - **aerodb declares its launcher routes** (`declaration().launcher`, one line in `frame/aerodb/aerodb.js`, told to
    AeroDB) instead of `app.js` writing them for it.
  - **`ctx.consume(...keys)`** and the table of the address keys (INTEGRATION § 6.1): a request taken leaves the address
    in one `replaceState` (no new mount), so a reload or Back never replays it; the frame's keys stay. The example module
    (`modules/hello`) shows it; case A34 (taken once, escaped, `from` kept, not replayed after a reload). Each module that
    reads a key adds its row to the table in the same commit; fuel and the map may move to `ctx.consume` in their next lots
    (they rewrite the address by hand today).
- **29 Oct 2026 — Security review of (3a) and `revalidate`** (no blocker; four corrections, in (3b)):
  - `load_verbs`: a verb already defined is refused, never overwritten; a set never lowers a gap (the longest wins: EAD
    Basic's 30 s are part of its conditions).
  - The trigram follows the common rule `^[A-Z0-9]{2,5}$` (users.js, `secrets_view`, `flightPath`), not `^[A-Z]{3}$`, which
    silently dropped a trigram of 2, 4 or 5 signs.
  - `commit_outputs` gives git literal paths (`GIT_LITERAL_PATHSPECS=1`) and refuses `*`, `?`, `[`: « proc/* » would have
    committed all of `proc/`.
  - `revalidate`: one `try` per path (the device's storage may fail too), the error kept in `errors`: it never throws.
  - **The author given by the page is an attribution, not a proof of identity**: the launcher takes the trigram the page
    sends. Acceptable while the page is trusted (the workstation's own page; a paired device of the local network cannot
    start a job). A relay open to the Internet (§ 10.28) will need a proof: the user's key of the signed registry.
- **29 Oct 2026 — Lot (3c-1): `/__setup/status` is the detection only** (challenge § 10.29):
  - `/__setup/status` gives `{ server, data, dataGit, host, lan, lnm }`, the same shape everywhere (`lnm: []` for a paired
    device), nothing of the workstation; its special LAN filter is gone with it.
  - `/__setup/workstation` (workstation only, refused to a paired device) gives the rest: `root`, `git`, `dataRepo`,
    `lfs`, `csp`, `relaxNav` (and `data`, `dataGit`, `host`). The V2 pages that read them follow: the first launch (`lfs`),
    Settings › Installation and Maintenance (`relaxNav`), the page frame (`relaxNav` badge), `file_access.js` (`root`), the
    signed registry (`csp`). Maintenance's « is a launcher here » probe keeps `status` (it only needs a 200).
  - Checked: the two routes' keys on the real launcher; first launch, Installation and Maintenance reloaded with no
    JavaScript error, calling `workstation`.
  - The route table with each route's public (lan | poste) is lot (3c-2): a mechanical rewrite of about 42 routes, kept apart
    so that this change stays small.
- **29 Oct 2026 — « Météo GFS toujours cassée » (LFPO → EIDW): two stores, two runs** (user, through the coordinator):
  - Cause, mine: on 28 Oct (d8934680f) the frame's weather layer moved Météo-France's run to ARPEGE Europe's metadata
    (and GFS to `ncep_gfs025`), but Atmosphere's own store (`modules/atmosphere/weather_store.js`, until its recoding on
    `ctx.weather`) kept AROME HD's and `ncep_gfs013`. The two write the same files `cache/weather/<model>/<cell>/<day>.json`:
    each judged the other's files stale (« run changed »). The map, which reads through the frame in `cacheOnly`, found
    nothing; each store rewrote a file with only its own variables, so the other lost its, hence cuts and barbs that
    stopped part-way.
  - Not Open-Meteo: `meteofrance_seamless`, `icon_seamless` and `gfs_seamless` serve every variable over the Channel and
    Ireland (checked).
  - Fix: Atmosphere's store reads the same metadata as the frame (two lines in its file, the module's owner told). And the
    map read `.id` on a Promise (`ctx.weather.modelFor` is asynchronous): the model was never passed (`await` added in
    `modules/maps/weather.js`, the map's owner told).
  - Checked: LFPO → EIDW loaded in Atmosphere (real network), every cell of the route filled up to 55° N, the files carry
    ARPEGE's run, the map then draws its weather from the cache (it drew nothing before).
  - Lesson: while two stores share a cache, one rule for the run; it ends when Atmosphere reads `ctx.weather`.
- **29 Oct 2026 — The launcher's exchange carries the gesture** (coordinator's decision, data_sync): `T.exchange({ gesture })`
  — a pass of reason `manual` (the user's « Synchroniser ») sends `gesture: true` to `POST /__setup/sync`; every other
  pass (background, module, interval) does not, and the launcher then keeps `sia/base/` (the aeronautical database being
  rebuilt) on the workstation: a zone half written never leaves by itself. The build job (D5) commits its own zones.
- **29 Oct 2026 — The gesture and the author are intentions, not authorisations** (coordinator's security review of
  1c2506a41): the `gesture` flag of `POST /__setup/sync` comes from the page (a paired device can send it too); while a job
  of the Data module runs on the launcher (a build of the base included), `sia/base/` stays on the workstation whatever the
  flag (`sync_gesture`, noreg I9). Likewise the author of a commit is the trigram the page gives (`author`): it names who
  acted, it proves nothing — the signed registry (comptes signés) is what authenticates.
- **29 Oct 2026 — Lot (3c-2): one table of the launcher's routes, each with its public** (challenge § 10.29):
  - The 48 `/__setup/` routes of `tools/launch.py` were `if path == …` blocks in `do_GET` / `do_POST` and the routes open
    to a paired device a separate list in `tools/lan_access.py`: two places to keep in step. Each block became a method of
    the server, its body unchanged, declared by `@route(method, path…, public='lan' | 'poste')`; the table `ROUTES`
    dispatches and the local network's gate reads it. A mechanical rewrite (`routes_table.py` in the session's scratchpad),
    checked: the same 8 routes open to a paired device, every route answering as before (status and keys of each route,
    before / after, on a launcher).
  - With it: `data_repo_url()` drops a `user:token@` from the configured address; Maintenance says « réglage du poste »
    (not « sans lanceur ») to a paired device refused `/__setup/workstation`; `lib/geo.js` and `lib/launcher.js` join the
    frame's offline shell (`frame/sw.js`).
- **29 Oct 2026 — A job's headless page hands its output back through the launcher** (AeroDB's D5 build):
  - The base is built on the launcher by a headless browser per zone; its page must return the zone's output to the job.
    A second server of the job (ephemeral port, its own token) was the alternative: refused — one local address only, the
    launcher already serves the builder's scripts and `data/` under its CSP.
  - `POST /__setup/regen/job/put`: workstation only, the running job only, its random token (`hmac.compare_digest`), a
    zone of its arguments, bounded names and size; it writes nothing, the verb does (`job.take`, then `commit_outputs`).
    While a Data job runs, a synchronisation keeps `sia/base/` on the workstation whatever the gesture (decided the same
    day): a build and a pass never cross.
- **29 Oct 2026 — A build of the base is seen by its files' time** (coordinator's security review of 2bf0021be):
  - The guard of the gesture saw only the launcher's jobs, but today the base is built by the V2 page, which writes
    `sia/base/` through its allowed folder (File System Access), not through the launcher: a `building` flag on the
    write batches, proposed, would have stayed blind too. `data_sync.building(data)`: an uncommitted `sia/base/` file
    written less than 10 min ago (`BUILD_GAP`) means a build is under way, whoever writes; `sync_gesture` reads it with
    the running job.
  - Limit: a build paused more than 10 min between two zones is no longer seen; the half-written zone would leave on the
    « Synchroniser » gesture. When D5 moves the build to the launcher, the running-job check covers it whole.
  - With it: a pending merge that git refuses to cancel (a file brought by the merge, changed since) names the files to
    set aside; `clean_text` also replaces the real path of `data/` (a junction in the workspaces).
- **29 Oct 2026 — The flown track in `progress.actual.trail`** (the coordinator's go, roadmap of the night):
  - The frame writes it with the position it already writes (no new record, no new write): one point per NM or per
    minute, turns kept (15°), 500 points at most thinned by the least change of shape (first and last kept); a point is
    `[lat, lon, altFt, s]` — arrays, not objects, because the record is written indented (about 22 KB for an 8 h flight
    instead of about 60).
  - Reset: it lives and dies with `progress.actual` (new `started.at`: a track of an earlier start is never carried on;
    the flight stopped: gone with the position).
  - The pure rule is `frame/lib/trail.js` (noreg A35); the Map initialises its track on it (BUGS SOG).
- **29 Oct 2026 — Security review of 3073048c7 and 5e785599c** (coordinator): a https address of the data
  repository carries no credential at all — the common form is the token alone as user name (`https://ghp_…@github.com/…`):
  `REMOTE_RE` refuses any user part in https (ssh keeps `git@`), `data_repo_url()` drops it, `remote_info` hands the
  page a cleaned address; a job takes each zone's output once (a second `put` of a zone: 409) and drops what its verb did
  not take when it ends (up to 64 MB a zone would otherwise stay in memory).
- **29 Oct 2026 — The costs of `list` and `read`** (coordinator, figures from AeroDB: two `list()` were the whole
  0.46 s left of mounting Fuel + Map on a 22 MB cache):
  - `list(prefix)` loaded every copy of the cache with its text (`getAll`, twice) to keep paths: now keys only — a key
    range on the prefix for the local transport, and an index `policy` of the copies (database version 2) for the
    device's cache documents. `read` parsed the JSON at each call: the parsed value of a `reference` file is kept by
    revision (48 MB of text at most, the least recently read go first) and shared by its readers, read-only; documents are
    parsed at each read (a module may change what it read, then write it). A `reference` file absent from the repository
    is not asked again for 30 s.
  - Measured (bench of the session, a cache of 17.8 MB: zones of three countries, 120 procedure files, 40 device
    documents; Chromium, the launcher's transport): `list('sia/base/')` 69 → 0.7 ms, `list('proc/')` 71 → 0.7 ms, a zone
    of 1 MB read again 8.1 → 2.3 ms (what is left: the text read from IndexedDB), a procedure file 0.4 → 0.2 ms.
  - The tests open `sogFrame` without a version (the frame upgrades it).
- **29 Oct 2026 — The flown track and privacy** (coordinator's security review of ff51be774; the user decides
  tomorrow between keeping it so, or on the device only like `pilot/ANON`):
  - The whole track of a flight sits in the repository's history read by the group: by default tonight its points have 3
    decimals (about 100 m; relative seconds kept); « La trace de votre vol en cours est partagée avec le groupe, comme
    votre position, et reste dans l'historique du dépôt. » is said in the Status block (the current flight's row, « several
    users » use) and in the help ×4; the track never goes to an outside service without an explicit gesture.
  - A track is carried on only for the same start: `actual.trailFrom = started.at`, compared exactly (ISO texts of one
    instant in `Z` and in `+02:00` do not compare as strings).
- **29 Oct 2026 — A job's headless page claims its token once** (coordinator's security review of D5, way B): no
  exception to the same-origin check — a document navigation from `file://` to the launcher cannot be told from any
  website's. The browser opens the launcher's http address with `#job=<id>` (Sec-Fetch-Site `none`, already admitted);
  the page claims the token by `POST /__setup/regen/job/claim { job }`, once, after the verb's `job.offer(payload)`
  (what the page must also receive: zones, cycle, inputs), on the workstation only; a second claim, another job, nothing
  offered: 409. Noreg I8.
- **29 Oct 2026 — A job's route covers its cancel** (Sécurisation/Réglages found it): a route declared without a final
  `/` covers itself only, so `regen/job` did not cover `regen/job/cancel` — the cancel the client sends itself on an
  aborted signal was refused (403) and « Arrêter » cancelled nothing on the launcher (aerodb's EAD / eAIP reads too).
  The cancel is part of the jobs' protocol: `<route>/cancel` of a declared route is allowed (`allowed()` in
  `frame/lib/launcher.js`), nothing else under it (bench A29).
- **29 Oct 2026 — A module's « Publier » is the user's gesture** (Sécurisation/Réglages asked, coordinator approved):
  `data.sync({ gesture: true })` runs a `manual` pass (the header button's) and hands back the launcher's report
  (`result.exchange`: numbers and the cleaned message, never paths nor git output), so that a module never posts
  `/__setup/sync` nor writes an author (§ 15); `data.sync.gesture === true` tells a module the frame takes the gesture.
  The launcher still decides (`sync_gesture`: a build under way keeps `sia/base`).
- **29 Oct 2026 — Applications: named sets of modules, chosen by the address** (user's decision, V3 § 2; the
  coordinator agreed the mechanism):
  - `APPS = { pilot, maintenance }`, the same shape each (`modules`, `tabs`, `screens`, `links`, `name`, `launcher`);
    `APP` is the page's, from `?app=` (in the page's query, never in the fragment, which routes the modules; unknown or
    absent: `pilot`; `Object.hasOwn`, so `?app=__proto__` is Pilot). Nothing kept on the device.
  - The application lists its modules, not the module its application: order and the limit of seven in one place, a
    module may serve in two applications without knowing it, INTEGRATION unchanged for modules.
  - `links`: entries of the rail that are not modules (a frame screen `#…` or a page of the suite, same tab), with a level;
    Maintenance's: Administration (`#settings?card=admin`), Aide, the V2 maintenance page.
  - Maintenance opens everywhere, read only without a launcher (first proposed guarded by it: dropped the same evening,
    since the Données module reads without a launcher and its Administration line is meant for a phone); a link needing
    the launcher says so (`launcher: true`: the V2 page). Level Complet like the Données module.
  - The transitional entry `{ id: 'data', rail: false }` of Pilot (Sécurisation/Réglages, waiting for this lot) and its
    filter go; Réglages › Administration's line « Maintenance » opens `frame/?app=maintenance#data` in the same tab
    (`same: true` of an admin link); the L cases open Données in Maintenance (`c.open(…, app=)`).
- **29 Oct 2026 — Security review of 16734c42f, cf52ad2a2 and 127e0b721** (coordinator):
  - A shared `reference` value is deep-frozen when it is parsed (once per revision): a reader that sorted it or added a
    field would have changed it for every reader until the next revision; now it throws. Measured (Chromium): a 1.2 MB
    zone parses in 6.8 ms and freezes in 11.6 ms, a 5.6 MB one (France) 26.6 and 44.1 ms — paid once per revision.
    The full noreg runs with it.
  - `job.drop()` in a `finally` of the job's thread: a `BaseException` no longer skips it.
  - `progress.actual` (`lat`, `lon`) stays exact: only the track is rounded (about 100 m); the user's question of tomorrow
    is about both (keep them shared, or on the device only).
- **29 Oct 2026 — G1: the data repository on GitLab** (the user chose GitLab after the feasibility note; coordinator's
  order: G1 then G2):
  - `frame/store/transport_gitlab.js`, the same form as the GitHub transport, behind the same device setting: a pasted
    project address says the host (`github.com` → GitHub, any other https host → a GitLab instance and its `/api/v4`).
    No new setting, no change for the 15 places of the frame that call `FD.github`.
  - Project access tokens, one per pilot: the onboarding is « the administrator creates, the pilot pastes »; the token
    goes to the pasted instance only (header `PRIVATE-TOKEN`, never in an address, a message or the console; a
    pagination link to another host is not followed). A malicious join link could name another host: the access card
    shows the address it will use, and a token is pasted by hand — said in the security review's scope.
  - The commit is atomic (`POST /repository/commits`); concurrency is checked on the head just before, and after, the
    commit (GitLab has no « advance only from this parent » for a branch): a commit that landed on a moved branch is
    reported as a conflict, the layer pulls and its merge finds its own changes there.
  - The tree comes page by page (100), kept per head; bounding it to the declared prefixes is left for when a
    measurement asks for it.
  - The launcher registers `secrets/gitlab.json` (instance, project, token) like `ead`: the page gets « set » and the date,
    never a character (noreg I11); G2 (« Jetons des pilotes ») will use it.
  - Tested against a GitLab simulated in the page (bench A38, 21 checks); the real gitlab.com only by hand, on the
    coordinator's and the user's go.
- **29 Oct 2026 — Security review of 56ab4fd94 … 802e6856f** (coordinator, acceptable; three notes):
  - **No guard ever rests on `?app=`**: the application of a page is a presentation (rail, bar, name), chosen by anyone who
    edits the address; the protections stay in the launcher's routes (`ROUTES` and their public, the same-origin check)
    and in the modules (a module checks what it is allowed to do, whatever the application around it).
  - The frozen `reference` values throw on mutation only in strict code: the frame's scripts that read them
    (`frame/aerodb/aerodb.js`, `registry.js`, `sheets.js`, `aircraft.js`) and every module (ES modules) are strict
    already; `frame/aerodb/zones.js` (generated data) and `shared/sia_base.js` (V2) read none. A new classic script that
    reads references starts with `'use strict'`.
  - A job's thread stopped by a `BaseException` no longer leaves the job « running » for ever: its `finally` sets
    `error` and `ended` (noreg I8).
- **29 Oct 2026 — An application's level floor and welcome** (seen by Sécurisation/Réglages in `?app=maintenance#data`):
  at the device's default level, Maintenance's rail was empty (Données is level 3) while `#data` mounted it, and Pilot's
  welcome card (« Join the airline · Prepare a flight · Write a report ») showed. An application declares its floor
  (`level`: Maintenance runs at Complet whatever the level chosen for Pilot) and whether it shows Pilot's welcome
  (`welcome: false`; Maintenance's own help line later). Noreg A36.
- **29 Oct 2026 — G1, security review (blocking, fixed before any real trial)**: the access card reused the saved token
  when a new project address was pasted with the token field left empty — an old GitLab or even GitHub token would have
  left in `PRIVATE-TOKEN` for a new host (the malicious invitation link). `FD.github.resolve(cfg)` reuses the saved token
  only for the same target (provider, origin of the API, project), otherwise no token and « new host: <host> — paste the
  token for it »; `save()` refuses a setting without a token (the check is in the transport, not only in the card). The
  GitLab transport never follows a redirect (`redirect: 'error'`: Fetch drops only `Authorization` across origins, not
  `PRIVATE-TOKEN`) and takes an `api` of the form `https://<host>/api/v4` only (`clean` drops any other). Bench A38.
- **29 Oct 2026 — G2: the pilots' GitLab tokens, from Maintenance** (coordinator's order after G1):
  - A service screen of Maintenance (`#pilot-tokens`, level Complet, link with a launcher): list, create, revoke the
    project access tokens. The launcher does the calls (`GET /__setup/gitlab/tokens`, `POST …/gitlab/tokens`,
    `POST …/gitlab/tokens/revoke`, workstation only) with the administrator's token of `secrets/gitlab.json` (an https
    instance only), never handed back nor in a message; a pilot's token is returned once, at its creation, shown in the
    screen until it is drawn again, never kept.
  - The tokens are named after the trigram, scope `api` (the REST API: tree, blobs, commits; `write_repository` is for
    git over HTTP), role Developer (30): a Maintainer token could change the project's settings through the API; the
    data branch must let Developers push (the screen says where to set it). At most 365 days.
  - A service screen may now declare launcher routes (`launcher: { routes }` → `routes()`, the same reduced client as
    a module's `ctx.launcher`). Noreg A39 (the screen against a simulated context) and I12 (the launcher's functions
    against a simulated GitLab: no value in a list, the administrator's token in no refusal).
  - With G2, a consolidation (coordinator): a pasted address whose host holds « @ » or any character outside
    `[A-Za-z0-9.-]` (plus `:port`) is refused at once (empty repository, « Dépôt et jeton nécessaires ») — never a
    misleading host shown (`https://gitlab.com@attacker/x/y`). Bench A38.
- **29 Oct 2026 — G2, security review (before the real trial)**: the launcher put the owner's token in `headers=` of a
  urllib Request, which `HTTPRedirectHandler` copies to any host, even http, on a 30x. Now the token is added with
  `add_unredirected_header` and the launcher's GitLab opener follows no redirect (a 30x is an error) — the launcher's
  side of the transport's `redirect: 'error'` (noreg I12 against a local 302 to another host). With it: the launcher
  revokes only a pilot's token (a name that is a trigram), never another token of the project, whatever the page asks;
  the new token's value is wiped as soon as the screen is left (another address, the page closed), not only at the next
  drawing; the screen tells the administrator to turn off CI/CD and the unused features of the data project (scope
  `api` + Developer could start pipelines, merge requests or issues with a stolen token).
- **29 Oct 2026 — R1a: the launcher as the airline's relay** (coordinator approved the split R1a / R1b; the user chose
  GitLab for the data, the relay stays for IVAO's OpenID and the whitelisted network calls):
  - `--relay <public host>`: on 127.0.0.1 behind the NAS's reverse proxy; a relay request is told by its `Host` and its
    origin (127.0.0.1), must be https for the proxy, its client address from `X-Forwarded-For` (the proxy is the only one
    that can reach 127.0.0.1).
  - Devices: an 8-digit code per pilot's trigram, issued on the workstation, one use, 10 minutes; a long token kept by
    hash, revocable by device or pilot, one year; attempt limits as for the local network but per relay address.
  - A third public in the route table, `relay=True` (a relay route is always a local network route too): status, changes,
    batch, sync, net. The author comes from the device token; `net` loses the airline's site in relay (`frame_net(site_ok=False)`).
  - The workstation's screen: Maintenance › « Appareils du relais » (codes, list, revoke), a service screen like the
    pilots' tokens.
  - Hardening asked by the security review before the push: no local network in relay mode (`--lan` refused with
    `--relay`, `/__setup/lan` open refused: 409); the pairing page never framed, without script (X-Frame-Options DENY,
    CSP `default-src 'none'`); the proxy must append or overwrite `X-Forwarded-For` (the last address is read; a forged
    head does not lift an attempt wait).
  - Security review of 7ca73448c (one blocking point, two fixes, two decisions; nothing was exposed): fail closed when
    the proxy rewrites `Host` (a request from 127.0.0.1 with a proxy header and another host: 403; start check
    `/__relay/whoami`); `safe_next` refuses spaces and control characters (`/<tab>/host` became `//host`); the pairing
    POST needs the same origin (login CSRF). Decided by the coordinator: cookie `SameSite=Lax` (a pilot following a link
    arrives paired; writes already need the same origin and `X-SOG-Setup`); attempts older than an hour forgotten
    (rotating IPv6 addresses). Debt: bound a device's writes to its pilot's prefixes one day.
  - Second review (1e573d782): a proxy that rewrites `Host` and adds no proxy header could not be told from the
    workstation. Decided (way a): a dedicated relay port (`--relay-port`, default interface + 1) on 127.0.0.1, where
    every request is the relay's; `_relay()` is « arrived by the relay port », never deduced from `Host`; the proxy
    header guard stays on the interface's port as a belt. I13: on the relay port, without a header and with the
    workstation's `Host`, a request is the relay's (403 without https, 401 unpaired), never the workstation's; a relay
    port equal to the interface's stops the launcher at start.
  - Review of ee6044e8b (acceptable): the public host is set before the relay port listens, `_relay()` is true on that
    server whatever happens, and a relay server without its public host answers 503 (never served as the workstation).
  - Lax checked: a GET navigation from another site carries the cookie, so no GET open to the relay may change a state.
    They are `status` and `changes` (read the data's head and tree; `changes` keeps a two-second memo of the tree),
    the pages and the data files (read; the pool's indexes rebuilt before being served are derived), `/__relay/pair`
    (the form) and `/__relay/whoami`; `net` is POST only. The only write is the device's « last used » mark, at most once
    an hour. The fail-closed refusal runs first, before the other guards (pages, data files and `/__setup/` alike).
  - Tested on the workstation only: a real launcher `--relay` and requests shaped like the proxy's (noreg I13, 32 checks:
    https only, dedicated relay port, proxy request on the interface's port, start check, pairing page headers, pairing from another site or
    without origin, return path, no local network, pairing, single use, attempt limit, forged X-Forwarded-For,
    workstation routes refused, whitelist, PUT, author from the token, revocation), the screen against a simulated
    context (A40). Nothing exposed.
- **29 Oct 2026 — R1b: IVAO's OpenID through the relay** (coordinator's plan R1a then R1b):
  - The secret of the airline's IVAO application lives on the relay only (`secrets/ivao_oauth.json`, blind to the
    secrets screen like the GitLab token); the device holds the pilot's own tokens, in its keys, never in a backup.
  - Code flow with PKCE S256 and `client_secret_basic`; endpoints from the discovery document (default
    `https://api.ivao.aero/.well-known/openid-configuration`), https only, no redirect followed; state random, bound to
    the device and the callback, 10 minutes, used once, 100 pending at most.
  - The tokens go back to the frame in the fragment of a 303 (`#ivao-return?…`, never in a query string, never logged),
    taken and erased from the address at once; an error comes back as `#ivao-return?error=…`.
  - Tested against a simulated IVAO (I14: discovery, PKCE, Basic, state used once, wrong device, refresh) and the frame's
    return (A41); the real IVAO needs the airline's application, registered by the administrator.
  - The airline's IVAO application serves every paired device (and the workstation): a device that should no longer use
    it is revoked (Maintenance › « Appareils du relais »), which also closes its IVAO routes; the pilot's own IVAO
    tokens stay on the device until « Délier ».
  - The callback `/__relay/ivao/callback` is the relay's only GET that changes a state (it consumes a state and exchanges
    a code): `SameSite=Lax` is what lets IVAO's redirect carry the device's cookie; a callback sent by another site fails
    on its state (bound to the device that started the sign-in, used once).
  - Security review of R1b (acceptable, nothing blocking), three touches: « Délier » revokes the token at IVAO (the
    discovery's `revocation_endpoint`, https, client authenticated, no redirect followed) before erasing it; without a
    revocation endpoint or when it fails, a warning tells the pilot to withdraw the application's access in their IVAO
    account (said after the attempt rather than in the question: only then is it known). The return on the workstation,
    to try the sign-in without the relay: `http://127.0.0.1:<port>/__relay/ivao/callback`, to declare in the airline's
    IVAO application; IVAO's redirect is a navigation from another site, served by one narrow exception in `_refused`
    (exact path, GET, `Sec-Fetch-Dest: document` and `Sec-Fetch-Mode: navigate`, the workstation itself — neither the
    local network nor the relay — on a local host, and a state of the workstation in progress with its return address);
    nothing else is opened. Three sign-ins in progress per device, 100 in all.
  - The relay refreshes with the airline's secret for any paired device: a device that should no longer use IVAO is
    revoked on the relay, and a pilot withdraws the application's access at IVAO (the answer at IVAO's side).
- **30 Oct 2026 — The flown track stays on the device** (the user's decision, relayed by the coordinator; replaces
  « The flown track in `progress.actual.trail` » of 29 Oct):
  - The track is no longer synchronised nor published: `device/trail.json` in the frame's base (policy cache), never in
    a backup (`frame_data.js`, like the device keys), read by the modules with `ctx.live.trail()` → `{ from, trail }`.
  - The shared position is unchanged: `progress.actual` carries the position only; a track written there before is
    removed at the next write, and taken over once on the device when it belongs to the same start.
  - The Map draws the device's track when its `from` is its flight's `started.at` (`modules/maps/flight_time.js`, one
    function; noreg D61). A track already pushed stays in the repository's history (the rewrite of the data repository,
    30 Oct, is the user's).
  - The status line in the group usage says it ×4: the position is shared, the track stays on this device.
- **30 Oct 2026 — A rewritten data repository: refused, then taken up by a gesture** (the user rewrote the history of
  the data repository, raw sources purged, same tree, force-pushed; the coordinator's go):
  - Browser transports (GitHub, GitLab) need nothing: they read the head and the trees by blob, unchanged by the rewrite,
    and commit the queue on the new head.
  - The launcher's git clone: a remote branch without a common ancestor is never merged (`rewritten`, code and alert;
    message ×4 in the frame, once per launch, and in the V2 header); nothing lost.
  - The gesture (Settings › Administration › Remote repository, the workstation only): plan first, one question, then the
    pool changes committed, the old branch kept in `refs/sog/avant-reecriture-<date>`, `reset --keep` onto the last state
    common to both histories (found by identical trees), the pool files changed since carried over in one commit, then a
    normal pass. `reset --keep` rather than the proposed `--soft`: `--soft` would keep the old index, and the next commit
    (which takes the whole index) would push files outside the pool; with `--keep`, only pool files are carried, a file
    outside the pool stays in the reference, never pushed, and the folder's uncommitted files outside the pool are
    untouched.
  - No common state (a workstation that never synced after the raw sources left): refused, `data/` untouched.
  - noreg I15 on a rewritten trial repository (refusal, status, plan, trigram, take-up, next pass, remote content, old
    history never pushed back).
  - Security review of 6ba742877 (acceptable): every path of the take-up is a file name, never a pattern
    (`GIT_LITERAL_PATHSPECS`: a pool file named `[ab].json` deleted here no longer deletes `a.json` and `b.json`); names read
    with `diff -z` (an accented name is no longer quoted with escaped bytes); a file outside the pool that this computer
    had committed since the common state is copied back into `data/` as it was (bytes from the reference), never committed
    — the pilot types no git; the plan says it ×4 (I15: a pattern-like name, an accented name outside the pool).
- **30 Oct 2026 — The trial base frozen like a device's** (the coordinator, after a blocking bug of the tests: the Map
  wrote on an airspace record, `a._mb ??= …`, a `TypeError` on the device since the deep freeze of 802e6856f, unseen by
  the noreg):
  - The frozen value was memoised per revision, and only a copy with a revision was frozen; the noreg seeds its base
    without a tree, so its references were never frozen. Now a `reference` copy without a revision is deep-frozen at each
    read, without the memo (`frame/store/frame_data.js`, `valueFor`); a pending write and the other policies are unchanged.
  - Full noreg with the freeze: the Map's airspace cases (D11, D13, D14, D15, D26, D28, D29) failed on the write BUGS SOG
    fixed in 0f5891d4c (WeakMap, D64); with that fix, no other module writes on a record.
- **30 Oct 2026 — A faster noreg** (the user: « optimiser les noreg pour accélérer le delivery, quitte à paralléliser »;
  the coordinator's lot):
  - Measured before: the full pass in 926 s of wall time with 4 workers (3,164 s of cases), of which 172 s of static
    cases played one after the other in the main process **before** the first browser case.
  - The static cases now run in a thread beside the browser workers; the browser jobs are given out longest first (the
    seconds per run of the last report), so that a slow case never starts last and alone.
  - Workers by default: the physical cores less two (`os.cpu_count() // 2 - 2`, 10 here). Measured on the full pass, all
    green, no flaky failure: 3 workers 982 s, 6 workers 541 s, **10 workers 359 s** (the cases' own seconds grow with the
    load, 3,067 → 3,751 s, but the wall time keeps falling); kept: 10.
  - `--touched [BASE]`: the cases chosen by the changed files (`--changed`) plus a smoke base of twelve quick cases, one
    per area, that open their screen for real (`domains.SMOKE`): the pass before a push. The full pass runs after the
    push, in the background on the pushed head.
  - The report keeps each case's seconds and the 20 slowest (`meta.slowest`, a table in `report.md`): their fixed waits
    are the next target (a wait on a condition, never a delay).
  - The static server was already started once per pass and shared by the workers. The trial base stays seeded per case,
    in a fresh browser context: that is each case's isolation, not a cost worth sharing.
  - K51 (the build page's hostile claim answers, launched in a real headless Edge): « no zone », the last answer, once
    came after the 40 s ceiling under the full pass. The wait is now on a state (the page's first answer, an error or
    « started »), with 120 s only for a browser that never starts, and a failure names the race (seconds waited, the
    browser's exit code, the lines it wrote).

## Inventaire du 30/10 : à refondre

Read-only inventory (V3 frame, 30 Oct, for the user's challenge « supprimer les faire et défaire, le code mort, les
empilages »), frame and launcher from 802e6856f to b44119d88. Per zone: what was done then undone or replaced, what is
left doubled or dead, the target in one sentence, then an order. Nothing is changed by this section.

**1. The relay's identity** (`tools/launch.py`). 7ca73448c a relay request told by its `Host` → 1e573d782 fail closed on
proxy headers with another `Host` → ee6044e8b a dedicated port, `_relay()` = « arrived by the relay port » → b27cae045 the
host set before listening, 503 without it. Undone: the `Host` deduction. Left: three guards for one fact (the port, the
proxy-header belt on the interface's port, the 503 for a host-less relay server), `_local_host()` answering true for the
relay, `RELAY` a dict whose `port` is written in `main` while `PROXY_HEADERS` and `relay_probe` live 300 lines away.
Target: one `Relay` object made in `main` (host, port, server) that the handler asks once; the belt kept, named as such.

**2. Pairing, twice** (`lan_access.py`, `relay_access.py`, `_lan_page` / `_relay_page`, `_lan_pair` / `_relay_pair`,
`LAN_TEXT` / `RELAY_TEXT`). R1a copied the local network's pairing (codes, attempt limits, hashed tokens, cookie, page,
four-language texts) and changed the numbers (6 → 8 digits, per-workstation → per-trigram). The security fixes went in one
copy at a time (1e573d782: `safe_next` shared, but the same-origin check on the relay's pairing POST only — the local
network's pairing POST still has none: the same login CSRF, on the private network).
Target: one pairing module with two policies (local network, relay) and one page renderer; each fix lands once.

**3. IVAO's sign-in** (a9840bd19, b27cae045). The callback is handled in three places: the relay gate, the narrow
exception of `_refused`, and a special case at the top of `do_GET`; two no-redirect openers (`GITLAB_OPENER` once,
`OIDC_OPEN` building a new one per call; `relay_probe` borrows the GitLab one). `ctx.ivao.token()` has no reader yet (the
tracker read still goes through `net.fetch` without it). Target: the callback a declared route of the table (public,
relay, a `nav` guard), one `NO_REDIRECT` opener patched by the tests, `token()` documented as « for the tracker reader ».

**4. Three lists for one route** (`frame/app.js` service screens `launcher: { routes }`, `ROUTES` with `public` / `relay`,
the expected lists of I10). A new route edits three files and the case fails until all agree (I10 was edited at R1a,
R1b, b27cae045). Target: the launcher publishes its table (`GET /__setup/routes`), the frame and I10 read it; I10 keeps
only the security rule (the relay set ⊂ the local-network set ⊂ all).

**5. The data repository's take-overs** (`data_sync.py`: `adopt` / `_fresh` 28 Oct, `rewritten_plan` / `rewritten_resume`
6ba742877 → add1e78a3). Same rules written twice: commit the pool first, keep a copy before touching, never push outside
the pool, literal paths (added to the second only after the review; `adopt` still passes paths as patterns to git).
Target: one `takeover(data, base, keep)` used by both, with the literal pathspecs and `diff -z` once.

**6. The transports** (`transport_github.js` 387 lines, `transport_gitlab.js` 251, G1 a0f3854d9 → 02a096440). Same
interface, written side by side: `b64`, the auth header, the 409/422 conflict, the publication loop; the redirect refusal
(`redirect: 'error'`) was already in both (corrected at R-C6: the inventory said GitLab only). Target: a shared base
(`transport_git.js`) and two thin adapters (URLs, auth header, tree paging). **Done: R-C6, 30 Oct 2026.**

**7. The flown track** (A35 29 Oct in `progress.actual.trail` → 0bbe7ebbb on the device). Left: the one-shot takeover of a
track found in `progress.actual` (dead once no flight started before 30 Oct remains: after 6 Nov), the text key
`T.info.trailShared` that now says the opposite of its name. Target: remove the takeover after 6 Nov; rename the key.

**8. The freeze of references** (802e6856f → 94515ca99). Two paths in `valueFor` (memoised by revision, or frozen at each
read without a revision). Target: one path, memoised by revision or by the text's length and hash.

**9. Settings screens** (`pilot_tokens.js` G2, `relay_devices.js` R1a, the remote card's « hist » block 6ba742877). Same
pattern three times: a list, a value shown once and wiped on leaving, revoke after a question. `launcher.js` has grown to
eight cards' worth of actions in one `run`. Target: one small « shown once / list / revoke » helper; `launcher.js` split
by card.

**10. The noreg runner** (`tests/v3/run.py`, b44119d88). Six overlapping selectors (`--changed`, `--touched`, `--for`,
`--journey`, `--failed`, `--failed-scope`); the one-worker path kept apart from the pool; `DEFAULT_JOBS` assumes two
threads per core. Target: `--touched` and `--failed` as the two daily verbs, the others as options of one selector.

**Order proposed** (smallest risk first, each with its noreg): 7 (a date, a rename) → 3 (one opener, the callback as a
route) → 4 (the route table read by the frame and I10) → 2 (one pairing module: the next security fix lands once) → 1
(the `Relay` object, on top of 2) → 5 (one takeover) → 6 (the transports' base) → 8, 9, 10 when they are touched next.
- **30 Oct 2026 — Three gaps found by the inventory, closed** (coordinator's go; no refactoring, the rules already
  reviewed elsewhere):
  - The local network's pairing POST needs the same origin, as the relay's: `Sec-Fetch-Site: same-origin`, or `Origin`
    equal to `http://<the workstation's host>`; otherwise 403 and « Saisissez le code sur cette page » ×4.
  - Every file path sent to git is literal (`data_sync.lit()`: `GIT_LITERAL_PATHSPECS`): `adopt`, `resolve`, the
    commits of `run`, the untracking of indexes, the frame's batch in `launch.py`; never for `POOL`, `EXCLUDE`,
    `INDEXES`, which are patterns on purpose.
  - The GitHub transport follows no redirect (`redirect: 'error'`, as GitLab's): the token is never copied to another
    host; a moved repository is an error said.
  - noreg I16: the pairing POST from another site or without origin refused, its own page heard; `adopt` with a file named
    `[ab].json` keeps the workstation's newer `a.json` (it failed without the fix); no git call of `data_sync` with file
    paths outside `lit()`; both transports refuse redirects.
- **30 Oct 2026 — K49 follows its own browser profile** (a full pass of Features SOG: expected `sog-base-dzwjlcpo`, got
  `sog-base-pgzysd4j`): the case listed every `sog-base-*` of the computer's temp folder before and after the job, a folder
  shared with other passes, a real build and the job's own purge of old leftovers. It now records the profile the job makes
  (`tempfile.mkdtemp` watched for the `sog-base-` prefix during the job) and checks that this one, and only one, is gone.
  Replayed 4 times under the load of area D on 10 workers: green.
- **30 Oct 2026 — One heavy noreg pass at a time on the computer** (a browser driver crashed, « Connection closed », when two
  full passes at 10 workers ran together; a load test of mine also ended on a Playwright `MemoryError`, and hung until
  stopped):
  - A full pass (no selector, no filter), or any pass of more than 30 cases (the coordinator: an area with `--grep` is
    heavy), takes a lock, `sog-noreg-full.lock`, in the computer's temp folder rather than in
    `tests/v3/` as first asked: each session works in its own worktree, and a lock inside the repository would not be
    seen by the others. It holds the pid, the time and the folder; a second full pass refuses to start and names it (exit
    3), or waits with `--wait`. A lock older than two hours, or whose process is gone, is ignored.
  - Whether the pid lives is asked of Windows (`OpenProcess`, `GetExitCodeProcess`): there `os.kill(pid, 0)` would end
    the process instead of probing it.
  - A heavy targeted pass (a large `--touched` before a push) waits for its turn rather than refusing: a push is not
    blocked, only delayed. A pass of 30 cases or fewer stays free.
- **30 Oct 2026 — One criterion for the layout and the computer's design** (the user, widening a window: phone → Aqua →
  icon rail without texture → Aqua): the phone's landscape (`f-land`: wider than high and under 1024 px) applied to a
  computer's window too, while `f-desk` (Aqua) required a precise pointer and not `f-land` — two criteria that did not
  meet. Now `f-land` needs a pointer that is not precise (a phone or a tablet turned; a computer's window keeps its rail
  with labels), and `f-desk` is exactly the computer's layout: wider than 760 px and not `f-land`. Aqua reads only
  `f-desk`: never on the icon rail nor on the bottom bar (A42: 390, 800 × 600 and 1280 with a mouse, then a window widened
  step by step from 700 to 1300 px; red without the fix). A touch tablet in portrait above 760 px has the rail with labels
  and so Aqua when chosen.
- **30 Oct 2026 — IVAO account without an application: the button off, the place said, the assistant one tap away** (the
  user, on the workstation: the red message read « sur le relais », the button stayed on, the page left and came back with
  « Connexion à IVAO refusée (state) »):
  - `GET /__setup/ivao/oauth` (local network and relay) → `{ app, relay }`, no secret: the « Compte IVAO » card draws its
    button off when the application is missing, its title the reason, and says « sur ce poste » or « sur le relais »; on
    the workstation a link leads to Settings' assistant « Application IVAO » (`#settings?card=ivaoapp`, the Settings
    session's, which shows the return address and writes the file): the procedure lives there only.
  - A 409 at start never navigates and says the same; the launcher's refusal carries the return address and the place.
  - The return addresses are computed in one place, `ivao_redirects(port)` (`launch.py`): the start, the return, the 409
    and the Settings assistant's `ivaoRedirects` (GET `/__setup/secrets`) read it; `GET /__setup/ivao/oauth` carries no
    address, only `{ app, relay }`.
  - IVAO's own refusal (a client unknown at IVAO, a return address not declared, an access denied) of a sign-in in progress
    of this device comes back with IVAO's code (`ivao:<code>`); without such a sign-in, an `error=…` is no proof of IVAO (a
    third-party link to `/__relay/ivao/callback?error=xyz` would show a false refusal; security review of e13964b44): it is
    « state », a return that matches no sign-in in progress (expired, launcher restarted, made elsewhere), said in a
    sentence ×4, never « (state) ».
  - Found on the way, fixed by the Settings session in b98589ae4 (one condition kept, its own): on
    `#settings?card=<one card>` with a launcher, the local network card's refresh started without its card
    (`null.isConnected`, on the very address IVAO's return lands on). noreg A44 (button off, title, link, nothing leaves even forced, on with an application, a stray
    return's sentence), I14 (IVAO's refusal said as IVAO's, a stray return as « state »), I10.
- **30 Oct 2026 — Each application's identity, and a switcher on its name** (the user: « Comment passer d'une appli à
  l'autre ? », « une icône différente, le même avion mais rouge ? »; Simplification's rule):
  - One gesture in the header: the application's name is a button (`#fApp`, its icon and `#fName`) that opens the list of
    `APPS` in the tab bar's popover, pointing down from it (`.f-tabpop.f-down`, shown on every screen; the closing rules
    are the popover's). An application above the device's own level (`device/level.json`, kept apart from the floor
    `APP.level` of the application shown: `deviceLevel`) is greyed with « Au niveau Complet (Réglages) » and never opened.
    A tap replaces the page (`location.replace`, no history entry to come back to the other application) with
    `?app=<id>` and the anchor of its first module; the other keys of the query stay.
  - `APPS` carries `icon` and `tint` (a token: `var(--sog-accent)`, `var(--sog-err)`), set on the header's icon by the code
    that draws it; `tintIcon` recolours the tab's icon: the path of `assets/favicon-flight.svg` takes the tint's computed
    colour, read on that icon, drawn again with the design and written only when it changes. Pilot keeps the file.
  - The name kept the look of the name in every design (`:root .f-head button.f-app`: before the designs' header-button
    rules); on a phone, when the back button takes the name's place, the whole button goes.
  - Not done here, said: a manifest per application (to install Pilot and Maintenance apart on a phone) needs a manifest
    chosen before the page loads, its icon in the service worker's list and its own `id`; more than this lot, kept for later.
  - noreg A46 (×4 languages).
- **30 Oct 2026 — The end-of-cycle line says « rebuild », not « publication »** (the user, Simplification's decision,
  relayed by Settings): « Base aéronautique : cycle 2610 terminé, en attente de publication » next to the Data module's
  « Rien à publier » read as a contradiction; both were true (the repository has no 2611, this workstation has nothing
  built). The line now says « cycle 2610 dépassé, à reconstruire pour 2611 », the near-end form « rien de construit pour
  2612 », ×4, same link to `#data`; the Data module puts its own mark on Build (Settings).
- **30 Oct 2026 — The notes above a view's sticky bar** (Features SOG's request, from BUGS SOG's walk, anomaly 10):
  - On a phone, Fuel's result bar (`.f-bar`) lay under the notes (`.f-notes` cleared the tab bar only). A module must not
    restyle `.f-notes`, so the frame does it: `notesClear` (app.js) measures the visible `.f-bar` stuck in the lower half
    of the window and sets `--f-bar-clear` on `.f-notes`, which `frame.css` takes as `bottom: max(<usual>, var(--f-bar-clear))`.
  - Measured only while a note is shown (on each note added or removed, the bar's size by a ResizeObserver, the window's
    size and the scroll), written only when the value changes, removed with the last note: no observer of the page.
    Asked as « --f-bar-space from the bar's height »; done as the distance from the bar's top, which also holds when the
    bar does not sit right on the tab bar.
  - noreg A45 (a bar drawn as a module would, taller while the note is there, the variable gone with the note).
- **30 Oct 2026 — Launcher jobs for the aircraft set** (V3 § 10.34 A1, the Settings session's request, base/* contract):
  - `tools/regen/aircraft.py` splits the V2 updater's single pass (`AircraftDB/update_aircraft_db.py`, unchanged) into the
    four verbs: fetch runs it with the network into thrown-away copies (only its caches stay), build runs it offline on
    the workstation's base, purge removes its caches (dry first, tracked files kept), publish wraps the launcher's
    `aircraft_publish` (dry: the plan) — handed to the set through the jobs' context rather than moved out of `launch.py`.
  - Not as asked, said to Settings: the view's elements are the three steps (types, apd, simbrief), not the codes (the
    script treats the codes as one batch, its per-code lines are not a contract); build commits nothing (the workstation's
    `AircraftDB/` is not versioned), the commit is publish's.
  - `GET /__setup/regen/verbs`: the loaded « set/verb » list, for the page to grey what the launcher lacks.
  - noreg I17 against a fake updater and a trial folder (no network): fleet codes, fetch leaves the base, build offline,
    the overrides of the served data, purge dry / real with a tracked file kept, publish dry / without author / real.
- **30 Oct 2026 — Launcher jobs for the VFR set; one environment and one path rule for every job** (V3 § 10.34 A1, the
  Settings session's request; security review of d8919b0e6 folded in):
  - `tools/regen/vfr.py`: fetch downloads the cycle's VAC from the SIA's VFR atlas (the address from `proc_sia`, never the
    page's) into `data/local/vac/<cycle>/`, for the aerodromes of the workstation's SIA base of that cycle; build runs the
    existing compiler of `tools/report-vfr` on that cache and the strict check of `tools/vfr_import.py` (the V2 route's work,
    from the cache rather than a file chosen in the page) and commits `sia/vfr/` once; purge empties the cache. One real
    chart fetched by hand to check the address (LFBD, cycle 2026-10-29, 548 KB); the noreg never calls the network (I18).
  - The review's two notes, for the three sets: the job's subprocesses get `regen_jobs.child_env()` (the launcher's EAD
    credentials and tokens no longer reach a third-party script); every purge uses `regen_jobs.inside` (the rule of
    `base/purge`, now shared: `base_sources._inside` is it), `files_under` and `prune_empty`, so that a junction inside a cache
    is neither descended nor emptied (I17, I18 with a real junction).
- **30 Oct 2026 — The noreg's targeted pass runs beside one full pass** (Simplification: a `--touched` before a push waited
  behind another worktree's full pass): two locks in the temp folder, the full passes' and the heavy targeted passes';
  `heavy_slot` lets one targeted pass run beside one full pass at `BESIDE_JOBS` = 4 runs at a time (the crash came from two
  passes at 10), a full pass waits for a targeted one running above that, two full passes stay exclusive. noreg I27.
  - With it: C1 (the sheet's bench) fell once more in a full pass, green alone — its « coup de pouce » up and down measured a
    real speed from 8 ms timers that stretched to 30 under load, below the 0.8 px/ms threshold. The steps are now held at
    2 ms (an active wait, not a timer), and the end of each glide is awaited (`onSettle`) instead of 260 ms. And I26 is green
    on its own (Maps, Atmosphere and Report completed their `meta.files`): its line leaves `known_failures`.
- **30 Oct 2026 — Refactor R-C5: the two take-overs of data/ share their rules** (§ 10.33, the inventory's item 5):
  - `adopt` (a plain `data/` becoming a clone) and `rewritten_resume` (a rewritten history taken up) wrote the same rules
    twice: the author's identity, the commit of the pool files (with the `.js` check of the data format), reading a file
    at a revision. They now share `_identity`, `_commit_local` (the synchronisation's own commit, literal paths: `adopt`
    gives `gesture=True`, every pool file as before) and `_at(data, rev, path)`.
  - Not done as the inventory wrote it (« one `takeover(data, base, keep)` »): the two keep their backup differently —
    the files replaced by `adopt` copied into `data_avant_<date>/` next to `data/` (there is no repository yet to hold a
    reference), the old branch of `rewritten_resume` kept in `refs/sog/avant-reecriture-<date>` — and a single function
    would only hide that fork. The literal pathspecs and `diff -z` were already in both.
  - No behaviour change: noreg I15 (rewritten history), I16 (adopt), and `tools/data_sync.py --essai` on copies.
- **30 Oct 2026 — Refactor R-C1: one identity of the relay** (§ 10.33, the inventory's item 1):
  - The relay was a dict `RELAY` whose host and port were written in `main`, `PROXY_HEADERS` and the start check living
    300 lines away, the listening server built in `main` with its `relay` flag, and its public origin spelt out in four
    places. `class Relay` (`host`, `port`, `server`, `on`, `origin()`, `start(host, port, handler)`) holds them; `start`
    sets the host before listening, as before; the proxy-header check is a named method, `_proxy_belt()` (« the belt »),
    and stays a second net: the relay is still known by its port only (`_relay()`).
  - No behaviour change: the same 503 for a host-less relay server, the same 403 for a proxy aimed at the interface's
    port, the same pairing origin and IVAO return address. noreg I13 (the trial reads the one `Relay`), I14, I10.
  - With it, Simplification's answer on R-C4: I10 pins the relay's set (status, changes, batch, sync, net, the IVAO
    sign-in and its return) against the published table, since the rule « relay ⊂ local network ⊂ all » would not catch a
    workstation route marked `relay=True` by mistake; and the local network's own set (`lan` without the relay: the
    Little Navmap sheets and their folder, the simulator's position) is pinned the same way. A route more or less in
    either fails I10 and is added knowingly; the workstation's routes stay checked by the rule.
- **30 Oct 2026 — Refactor R-C4: one list of routes** (§ 10.33, the inventory's item 4):
  - A new launcher route edited three files (the table `ROUTES`, the screen's `launcher: { routes }`, I10's two fixed
    lists) and I10 failed until all agreed (edited at R1a, R1b, b27cae045, R-C2, R-C3). The launcher now publishes its
    table (`route_table()`, `GET /__setup/routes`, the workstation only); I10 keeps the rules (relay ⊂ local network ⊂
    all, a handler each, nothing outside the table) and checks that every declared route is published, without a copy of
    the table.
  - A screen's or a module's declaration stays: it is the list of what that screen may call (`forModule` refuses the
    rest), not a copy of the launcher's table. The frame reads the table only to say, before drawing a service screen, that
    the launcher is older than the screen (« plus ancien que cet écran », ×4) instead of a « route inconnue » at each
    gesture; a launcher without the table checks nothing (A48).
  - No behaviour change otherwise; the relay and local-network sets are those of R-C3, checked by the rule.
- **30 Oct 2026 — Refactor R-C3: IVAO's return in one place, one no-redirect opener, no `token()` without a reader**
  (§ 10.33, the inventory's item 3; Simplification's wording « ctx.ivao.token() sans lecteur retiré »):
  - The return was handled in three places (a special case of the relay's gate, the narrow exception of `_refused`, a
    special case at the top of `do_GET`). It is now a declared route of the table (`@route('GET', '/__relay/ivao/callback',
    public='lan', relay=True)`, the rule « a relay route is a local-network route » kept; the handler refuses the local
    network, as before), and `_ivao_return` is the one guard that lets IVAO's navigation through the origin check: always
    for the relay's GET of that path (the gate has checked the device), the workstation's conditions unchanged.
  - Two no-redirect openers (`GITLAB_OPENER`, and `OIDC_OPEN` building one per call; `relay_probe` borrowing GitLab's)
    became `NO_REDIRECT` / `NO_REDIRECT_OPEN`, patched by the tests; `outbound.opener`'s `open` takes the service's name
    per call (`what=`), so the console still says IVAO, GitLab or relais.
  - `ctx.ivao.token()` had no reader (the tracker read still goes through `net.fetch` without it): removed, and the
    launcher's `ivao/oauth/refresh`, its only caller, with it; they come back together with the tracker's reader.
  - No behaviour change for a user: the same returns are served and refused (I14 adds the relay's case); a POST to the
    callback through the relay is now refused (only IVAO's GET ever came).
  - With it, the security review of 36f571e40: « Ouvrir » calls `os.startfile(path, 'explore')`, the Explorer imposed
    whatever the path becomes between `isdir()` and the call.
- **30 Oct 2026 — R-C2's security review: one bucket of wrong codes per channel, expired devices purged** (Simplification,
  verdict acceptable on 4e83fc50a, two notes taken with the « Dossiers » commit): the 30 wrong codes an hour closed both
  channels, so a stranger in front of the relay could close the local network; `closed` and `wrong` are now one per
  channel (a closed channel's codes no longer open it, a code of both channels keeps the other), the per-address wait
  stays shared. An expired row (`expires` passed) is removed from `.devices.json` at the reading, so the screen never
  shows it. noreg I22.
- **30 Oct 2026 — Refactor R-C2: one pairing and one list of devices for the local network and the relay** (§ 10.33,
  the user's question « appareils du relais : différent des appareils appairés ? »; target form validated by
  Simplification before the code):
  - `tools/lan_access.py` and `tools/relay_access.py` were two copies of the same machine (code, attempts, hashed tokens,
    a list, revocation) with two files. `tools/device_access.py` is the one machine: one list `tools/.devices.json` with a
    `channel` column (the two old files taken up at the first reading, then removed: a paired device stays paired), one
    code, one counter of attempts, one `forget()`; a token opens its own channel only (cookies unchanged, one per channel).
  - One code: 8 digits for both channels. Simplification's answers: one rule, one length (the local network's 6 digits
    are the only behaviour change, said in the help ×4); a code asked on the screen needs a trigram and works on both
    channels, the row noting the channel used; the console code (`--lan`, « Nouveau code » of the access card) has none
    and works on the local network only, its row says « code de console » and « Nommer » sets a trigram afterwards.
  - Also changed in passing, said: a new code no longer lifts an address's one-minute wait (it did on the local
    network, not on the relay: the stricter rule kept); a local network device's last use is noted, as the relay's.
  - Routes: `/__setup/devices` (GET, POST a code, `/revoke`, `/name`) replace `/__setup/relay` and
    `/__setup/relay/devices[/revoke]`; `/__setup/lan` keeps opening, closing and the console code, its `forget` moved to
    `devices/revoke` (no V2 page read either route, checked). One screen, Maintenance › « Appareils » (`#devices`,
    `frame/settings/devices.js`, which replaced `relay_devices.js`); `#relay-devices` is replaced by `#devices`
    (`MOVED` in app.js); the Pilot's access card keeps the local network's view.
  - noreg I22 (the take-up, the channel binding, the console code, « Nommer », the shared counter, the revocations), A40
    (the screen's bench, the old address), I13 (the relay trial on the new routes), I16 unchanged.
- **30 Oct 2026 — The noreg runner replays a run whose browser crashed** (Simplification's rule, after Features SOG's full
  pass on 552e0889d: four « browser crashed: Target crashed », D4, K52, L15, L17, green alone):
  - `lib.worker_run`: a crash outside the case (a context or a page that cannot open) or inside it (an error naming a
    crashed target, a closed connection or browser) relaunches the worker's browser and plays the run once more; the
    run carries « replayed after a browser crash (<the crash>) »; a second crash is an error « browser crashed twice »,
    with a fresh browser for the next run. A failure of the case itself is never replayed.
  - `run.py` gives the runs out one by one (at most `limit` at a time instead of `imap_unordered`): after more than
    `CRASH_LIMIT` = 3 crashes, `LOW_JOBS` = 6 runs at a time for the rest, said in the console and at the top of
    `report.md`. noreg I21 (a fake browser and a fake `run_one`).
- **30 Oct 2026 — No path parameter in the console; every zip bounded** (security review of 37b043e68 and 622936805):
  - `outbound.where` kept `urlsplit`'s path, which keeps the `;` parameters: an EAD Basic failure would have written its
    `;jsessionid=…` (audit, line 4: never a session identifier or a ViewState in a log). Each segment is now cut at its
    first `;`.
  - The CIFP's zip was opened without a bound on its unpacked size. `regen_jobs.zip_check` sums the entries' announced
    sizes before any read (zipfile never yields more than an entry's announced size; a false one ends in a CRC error),
    2 GB at most, and refuses an entry in a folder when the reader expects a single level (the CIFP); the launcher's
    data archive goes through it too. noreg I20.
  - One redirect rule for every source (AeroDB's pending note on 38a9d39b7, frame/aerodb/DECISIONS « Pending », closed
    here): `outbound.opener` adds `SameHost` (a redirect followed to the same host only, never from https to http) unless a
    redirect handler is given (`_NoRedirect` of OpenID and GitLab, `_RelayRedirect` of `/__setup/net`, `StayOnHost` of
    EAD); `aero_fetch`, the SIA and the jobs' downloads go through it. noreg I20 (a redirect to another host refused).
- **30 Oct 2026 — One named User-Agent for every outgoing request; failures said in the console** (blocking bug of the
  user's IVAO trial, Simplification's rule):
  - « Connexion à IVAO impossible (IVAO discovery: HTTPError) », nothing in the console: `api.ivao.aero` answers 403
    (Cloudflare) to urllib's default User-Agent and 200 to any named one.
  - `tools/outbound.py`: `UA` (« SOG-launcher/<version> (+project) », the version read from `config/repository_tree`),
    `opener(*handlers, what, quiet)` (the launcher's openers: OpenID, GitLab, the relay of `/__setup/net`, the jobs'
    download, EAD) and `urlopen` (the IVAO and VATSIM APIs, the airline's pages, `aero_fetch`, the SIA). The per-call
    User-Agents (`SOG-suite`, `DEFA-suite/1.0`, `SOG-aerodb-builder`, `SOG-vfr-fetch`, `SOG-proc-fetch`) are gone; EAD
    keeps « Mozilla/5.0 (X11; Linux x86_64) » before the launcher's name, its portal not having been tried without it.
  - Each failure: one line `[sortant] échec <service> : <host>/<path> : <HTTP code or network error>`; never the query,
    a header, a body or a token. Left as they are: the loopback calls (`ours()`, the simulator's position, polled every
    second, whose failures are normal) and `AircraftDB/update_aircraft_db.py`, a script of its own run as a child, which
    sends a browser User-Agent on purpose to the sites it reads.
  - noreg I20 (a server that refuses urllib's default: discovery, GitLab, job, aero_fetch, SIA and HEAD get through with
    the named User-Agent; a failure's line without the query or the token), K57 patched on `outbound.urlopen`.
- **30 Oct 2026 — Launcher jobs for procedures per State; merge, download and environment rules for every job** (V3 § 10.34
  A1, the Settings session's request; security review of ab0258453 folded in):
  - `proc/fetch`, `build`, `purge { states }` in `tools/regen/proc.py`, beside `ead-fetch` and `eaip-fetch`: `LF` from the SIA
    eAIP (each aerodrome's page and coding tables, `proc_sia.download_aerodrome`, split from `read_aerodrome`, which now takes
    the reader and the VAC test it is given), `K` from the FAA CIFP; the download fills `data/local/` only, the build works
    offline and commits per State, the index of the cycle merged.
  - Not as asked, said to Settings: an EAD State is refused (`ead-per-aerodrome`) without a single call. EAD_BASIC.md § 1
    allows one aerodrome per explicit gesture, never a whole State, so the EAD States stay with `proc/ead-fetch`; Settings
    agreed and offers only LF and K in its panel.
  - The review's notes, for every set: `regen_jobs.merge_pending` before any write into `data/` (a commit would conclude a
    pending merge, or git would refuse it after the files were written); `regen_jobs.download` caps a response and refuses a
    redirection to another host; the base set's headless browser and its git get the reduced environment as well.
  - noreg I19 (fake eAIP and CIFP, a trial data repository, a real junction, a local server for the cap and the redirection;
    no network), K22 (the new gap), K45 (the fake browser's folder let through the reduced environment in the test only).

- **30 Oct 2026 — Refactor R-C6: the two remote transports on one base** (§ 10.33, the inventory's item 6; no behaviour
  change). `frame/store/transport_git.js` holds the call (no cache, no redirect followed, offline, refusal → error with
  its status), the publication loop and `b64`; `transport_github.js` (390 → 303 lines) and `transport_gitlab.js` (251 →
  164) keep their URLs, access header, refusal reading (GitHub: conflict only on the ref update, 409 / 422; GitLab: 400 /
  409 / 422 with a message saying the repository moved) and their way of landing a commit. The inventory was late on one
  point: `redirect: 'error'` was already in both (I16); the check now looks for it in the base, with the transports'
  only `fetch` there. Each transport returns early without `FD.git`, so the frame's « script lost on the way » path asks
  the base again before them (A28). Kept apart on purpose: the device setting (`clean`, `resolve`, `hold`) stays in
  `transport_github.js`, which both providers share, and `head` / `tree` / `commit`, whose APIs have nothing in common.

- **30 Oct 2026 — A bench no case opens fails I28, it does not go to known_failures** (Simplification, after F80). A known failure
  covers the whole case, so a new orphan would hide behind it. I28 compares the orphans with its own table (bench → owner)
  instead: a new orphan turns it red, and so does a listed bench once a case opens it, until its row goes. The test is static:
  the bench's path in a case, or its file name in a case whose file names its folder (the `_bench(c, 'x.html')` helpers).

- **31 Oct 2026 — A side pane closed before its module arrived** (BUGS SOG, found writing D86; the likely cause of F41's
  hazard). On a wide screen Fuel opens the Map beside it; `openPane` sets `pane.mod` only once the module's import is
  done, and a navigation in between (Fuel left at once, as after the choose pane's « Terminer ») ran `closePane`, which
  read `pane.mod.unmount` on `null`: a logged TypeError, a red case under load. `closePane` now unmounts only a module
  that arrived; `openPane` already saw its pane gone after the import and mounted nothing. The main view needed nothing:
  a navigation during a mount already cancels it, the last address wins (A16); A16 ran at phone width, where there is
  no pane, hence A54 at 1280 with the Map's module held on its way.

- **31 Oct 2026 — ctx.net.fetch waits for the airline 3 s at most, and never for the relief tiles** (Simplification, after
  BUGS SOG's D86 / D87 hazard; **not reproduced**: this closes an endless wait, it is not a proven cause). A call to a host
  outside the same origin, RELAY and DIRECT waited for the airline's first read (that host could be its site), with no
  bound: that read can last the whole first reading of the tree. The relief tiles (DIRECT_PATHS) waited with it. Now a
  DIRECT_PATHS host never waits (its decision does not depend on the airline); any other waits `AIRLINE_WAIT` = 3 s at
  most, then the decision is the one **without** an airline site: an unlisted host is refused (503), never allowed by
  default; the airline's site is recognised by the next calls once its read has come. A57 holds the airline's read.

- **31 Oct 2026 — No push with a FAIL line, and A15's hazard was in the case** (Simplification). No push while the
  `--touched` before it, or the cases replayed after a rebase, show a single FAIL line, known hazard or not; a chained
  command gates the push on « no `^FAIL` line », never on the summary line (80a355157 went out with A15 red that way).
  A15's hazard (P5 step 2, 1 in 4 to 6, German only) was the case's own pattern: `nicht ver`, meant for « nicht
  veröffentlicht », also matched the terrain note « Gelände nicht verfügbar … », which comes when the bench serves no
  relief tile, so the step waited for a note that was not the base's. The step now compares with the three notes of the
  base in the run's language (loading, not published, access not set), by their own texts; nothing in the frame or a
  module changed. Ten runs before: two failures; ten after (forty with the four languages): none.

- **31 Oct 2026 — The weather layer's contract with Atmosphere, settled** (Simplification). (1) `cost(request)`: what a
  request would cost, from the cache and the run already known, asking nothing; Atmosphere says « ≈ n calls » before
  « Charger ». `aloft` and `grid` now compute their request with the same functions `cost` reads (`aloftRequest`,
  `gridRequest`, `missingGroups`): one computation, so the estimate counts what the load would ask. (2) The model of a
  region and its run belong to the frame's layer: `modelFor` was already there, Fuel's `winds.js` relayed it for older
  readers and no longer does; each answer of `aloft` and `grid` carries `run`. (3) Kept as they were: one range of days per
  load (`from`), METAR and TAF with their time, the world forecast (index, step, pressure-level file) by the layer, the
  quota in Settings › Diagnostics. Fuel's behaviour is unchanged (its bench loses the three `modelFor` checks the frame's
  bench already holds).

- **31 Oct 2026 — One active entry, one entry per destination, the help of the shown application** (Simplification, the
  user's three phone captures of Maintenance). The bar marked the last module visited over the help (Données in blue under
  the pressed « ? »), and nothing over Settings; Maintenance's bar repeated the header's « ? » and ⚙. (a) `tabFor` takes the
  tab of the frame screen shown, or none — never the module underneath; the rail follows. (b) An application whose bar
  carries Help and Settings hides the header's « ? » and ⚙ where the bar is shown (`data-in-bar`, CSS), and the state badge
  goes to the Administration entry (`paintBadge`, after each redraw of the bar). (c) One manual per application:
  `build_help.py` writes `pilot.*` and `maintenance.*`, help.js reads the one of `c.app`, Pilot's tutorials stay in Pilot;
  the Help entry opens the chapter of the module the bar follows (`menuActive`: `current` is set only after the mount).
  A59 at 390 in the four languages.

- **31 Oct 2026 — Fuel units in one place** (Simplification, V3 § 10.35). No density existed in the code (only a comment in
  `frame/aerodb/aircraft.js`). `frame/lib/fuel_units.js` holds the typical densities, the fallback rule (type's sheet →
  airline → typical) and the conversions between kg, lb, L and USG, with the price brought to the kg; pure, no text, an
  unreadable input gives `null`. Densities outside 0.5–1.0 kg/L are refused, which keeps a sheet typed in g/L or lb/USG
  from being taken. Its bench is opened by A53 (I28).

- **31 Oct 2026 — « ? » and ⚙ top right in every application; the bar carries the modules only** (the user's return on
  cc6503ee0, relayed by Simplification). « One destination, one entry » made Maintenance's header differ from Pilot's:
  the user wants the help and the settings top right everywhere. So `data-in-bar` and the tab badge go, the state badge is
  on ⚙ again, and Maintenance's bar carries its modules only (Data, Aircraft); over the help or the settings no entry of
  the bar is marked (the pressed « ? » or ⚙ is the active one). One active entry and one manual per application stay.

- **31 Oct 2026 — IVAO's return reaches the frame by a page of this origin** (the user: « page opened from another site:
  refused » on the return, « it ends up passing after 2 or 3 tries »; Sécurisation: no new exception, diagnose). The
  guard's exception for the return was there; but the return answered with a 303 to `/frame/index.html#ivao-return…`, and
  a redirect chain started on ivao.aero keeps `Sec-Fetch-Site: cross-site` to its end, so the guard refused the frame's
  own page (the existing case even said so: `/frame/index.html` in a cross-site navigation is refused); a reload, of this
  origin, passed. The return now answers a small page that opens the frame by `meta refresh` (no script, no referrer, never
  cached). A return refused on its path is said in the launcher's log with its reason (navigation headers, state unknown,
  expired, of another device or return address; never the state itself), and a top-level navigation whose state does not
  match goes to the frame's error (`#ivao-return?error=state`: no token, no code exchanged) instead of the generic page.
  The refusal page links to the V3 frame (`/frame/`). The guard is not widened; the state is still consumed once, by the
  exchange only. Not reproduced against IVAO: if the first arrival is still refused, the log line says which condition.

- **31 Oct 2026 — « Offline » only when the browser says so** (the user's phone: « offline » while online since the day
  before, after switching the data repository to GitLab by hand; two identical notes stacked). The shared call of the
  remote transports turned every exception of `fetch` into `offline` (network, CORS, DNS, a redirect refused by
  `redirect: 'error'`, an unreadable address). Now `offline` only when `navigator.onLine` is false; otherwise
  `unreachable: <host>` (the host only, never the address), said « repository unreachable (host): network, filtering or
  redirect refused ». A setting the transport cannot be built from (a GitLab api without its scheme) gave an exception
  that kept the old transport; it is now a transport whose every call is « invalid repository address », a named
  configuration error whose status line leads to the Access card. A change of the data access (repository, provider,
  token) starts a pass at once, without a reload. The same note (kind and text) replaces the one shown instead of
  stacking. Only `navigator.onLine` false suspends the background loop (it already did; other errors retry at the
  normal interval). The phone's actual cause is not reproduced: the error now says which. The repository's real answer
  (the user: GitLab still failing « without the log of the error »): a refusal is « GitLab <status>: <server's message, 120
  signs> » (GitHub alike, the 401 too; never the token), said in words for the frequent cases — 404 « project not found or
  token without access (scope api, or read_repository and write_repository) », 401 « token refused or expired », 403
  « token without write access », 400 on the branch « unknown branch » — followed by « (GitLab 404) »; an exception
  without status carries its name; the last five failures (date, error) are kept in the copiable diagnostic
  (`FrameData.diagnostic().failures`). The benches that simulate « offline » now also say it through `navigator.onLine`.

- **31 Oct 2026 — The page's connect-src holds the known repository providers** (the user's phone, served by github.io:
  « unreachable: gitlab.com (TypeError) »; Réglages and Sécurisation found it). gitlab.com and framagit.org serve CORS, but
  the page's own policy blocked the call before it left: `CONNECT` had api.github.com only (framagit.org reached the
  launcher's policy through its configuration, never the static site's). `CONNECT` now holds exactly the API hosts of
  `SogConfig.PROVIDER_TABLE` — api.github.com, gitlab.com, framagit.org — exact hosts, no wildcard, cited from both files;
  the meta tags are rebuilt from it, never copied by hand (I30). A self-hosted GitLab stays blocked on the static site
  (wanted); the frame listens to `securitypolicyviolation` on `connect-src` and says « host not allowed by the page (CSP) »
  naming the host only (A64). The « no CORS » sentence first written was wrong and never pushed.

- **31 Oct 2026 — A new version is staged whole, and said until it is taken** (the user: Settings blank after an update,
  « why no message? »; then « I defer the reload during a critical operation, and the note is never offered again »).
  The service worker wrote each re-read file straight into the cache the open page read: the page kept its old `app.js`
  in memory but its next lazy loads (Settings, moved to `cards.js` / `actions.js` / `kit.js` by R-S9) got the new files
  — a blank page; and a re-read cut in the middle left a mixed cache and no notice. Now the next version is read whole
  into `sog-frame-v1-next`, dropped if a read fails, announced only once complete, and swapped in at once at the next
  page load or « Reload ». The bench loads `sw.js` with a fake `self` and network: red on the old service worker (a
  mixed cache, an open page given a v2 file), green now. The notice is a state: a Status line until the reload, the note
  offered again at calm moments (5 minutes apart at most), never an automatic reload.

- **31 Oct 2026 — « ? » and ⚙ stay right when the back button takes the name's place** (the user: « the row of icons
  moves at each selection »). On a phone, a module opened by passage of another shows « ← » in the name's place
  (`.f-app` hidden); the name carried the `margin-right: auto` that pushed « ? » and ⚙ to the right, so they jumped to
  the left on the Map, Weather and Website after a selection. The back button now takes that margin in the same case.
  A66 measures every entry of the left column, the bottom bar and the header across the Pilot modules, in the five
  designs at 390 and in all six (aqua included) at 1280; the rail and the bar did not move, the header did.
- **31 Oct 2026 — No line-ending warning in the launcher's log** (Simplification: the log full of « git add: warning: in
  the working copy of 'pilot/RBR/current_flight.json', LF will be replaced by CRLF the next time Git touches it »). The
  suite writes LF; Windows' git has `core.autocrlf=true` and warned once per file at each `git add`. The simplest single
  policy: the launcher's hardened git (`data_sync.HARDEN`) runs with `core.safecrlf=false` — the conversion is unchanged
  (the repository keeps LF, a checkout gives what the workstation's git gives), only the warning is silent. Not
  `core.autocrlf=false` (files already checked out in CRLF would show as changed) nor a `.gitattributes` in data/ (a
  change of the data repository for a log line). I31.
- **1 Nov 2026 — The administrator's GitLab token is said, tested and saved on « Jetons des pilotes »** (Simplification,
  from the user's capture « GitLab a refusé : 401 Unauthorized » and their question: which rights for the
  administrator's token?):
  - The screen says what the token must be: a personal access token of the administrator's GitLab account (Preferences ›
    Access tokens), scope `api`, with an expiry (one year at most), the account Maintainer or Owner of the project.
  - A refusal of GitLab carries its reason, named by the launcher (`gitlab_refusal`): `secret` (nothing on the
    workstation), `refused` (401), `scope` (403 `insufficient_scope`), `level` (other 403), `project` (404), `offline`;
    the screen says each by its phrase, never the bare « GitLab a refusé : … » for these.
  - « Tester le jeton de l'administrateur » (`GET /__setup/gitlab/admin`): who (`/user`), scopes and expiry
    (`/personal_access_tokens/self`, null when unreadable), role in the project (`/projects/:id` permissions, the higher
    of project and group); a token without `api`, or an account below Maintainer (40), is refused at once and said.
  - Simplification's wording sent the 401 to « Clés de la compagnie »: that card does not exist in V3, the token was a
    file placed by hand (`secrets/gitlab.json`). It is now entered on the screen itself, folded under the list (open
    when a refusal asks for it): instance, project (empty: those of data/'s https remote), token (empty: unchanged);
    `POST /__setup/gitlab/admin` saves it in `secrets/gitlab.json` and tests it; the page never reads it back, the
    field is emptied by the next drawing. Workstation only (`_lan()` refused), as the other two routes. Noreg A39, I32.
- **1 Nov 2026 — Maintenance opens on the administrator's assistant until the airline is installed** (Réglages, § 10.36,
  validated by Simplification): opened without an address, with this workstation's launcher, Maintenance lands on
  `#settings?card=assistant` (the address replaced: going back does not replay it) while the airline is not installed —
  installed is data/ a git repository with a remote (the launcher's `dataGit`, then the address of `GET sync-remote`) and
  a name in `airline/settings.json`. Installed, it opens as before. An address asked for is always served as is; without
  a launcher (the site, a paired device) nothing is said, nothing changes; the airline not read within 3 s counts as
  installed (never a landing on a guess). The assistant stays reachable by its line of the Administration card and by
  the help. Noreg A74.
- **1 Nov 2026 — The count of active pilot tokens, for the assistant's « first pilot »** (Réglages): `GET
  /__setup/gitlab/tokens/count` → `{ ok: true, active: n }` (pilot tokens — named after a trigram — active and not
  revoked), or a refusal with its reason (`secret`: no administrator's token on the workstation); never a name nor a
  value. Workstation only, as the list, which stays the Pilots' tokens screen's. Noreg I32.
- **1 Nov 2026 — The administrator's token is only valid for its instance** (Sécurisation's review of ceda4da6c, « à
  corriger »): an empty token field kept the saved token even when the instance changed, so the test sent it at once to
  the new host (`PRIVATE-TOKEN` on `/user`). Now another instance (compared in lower case, without a final « / ») with
  no token is refused (`reason: token-required`, nothing written, no call), said on the screen; another project of the
  same instance keeps the token; the instance is saved in lower case. The transport's rule, applied to the launcher.
  Noreg I32.
- **1 Nov 2026 — Pilots' tokens: the token just created alone at the top** (Simplification, from the user: « a new token
  shows up in the list as “never used”, which is frightening: we don't know it is the one just created, and the page
  speaks of everything when we only want that token »):
  - After « Créer le jeton », the screen shows one card first: « Jeton de ABC créé », the token in a read-only field with
    « Copier », « copiez-le maintenant : il ne sera plus affiché » with its expiry, what to tell the pilot (paste it in
    Settings › Data access with the project's address) and a link to the pilot's message (« Ajouter un pilote »,
    `#settings?card=admin&panel=addPilot`). Below, « Jetons existants (n) » folded, then « Créer un autre jeton »; no
    form and no administrator's block meanwhile.
  - A row starts with the trigram, then « créé le », the expiry, the state; « jamais utilisé » is a state, last; the
    token just created says « créé à l'instant » (« jamais utilisé » comes at the next drawing).
  - At opening, seven visible elements at most: the title, the introduction, the trigram, the lifetime, « Créer le
    jeton », the list folded, the administrator's block folded when the list reads (the token is set and answers); the
    branch note moves into that block. The form's heading « Nouveau jeton » is dropped (the form says it).
  - The token is still never kept: leaving the screen or drawing again (« Créer un autre jeton ») removes it. Noreg A39.
- **1 Nov 2026 — The data branch opened to Developers from Pilots' tokens** (Simplification, from the user: a pilot's token
  created by the launcher — Developer, `api` — got « Synchronisation failed: token without write access (GitLab 403) »;
  gitlab.com protects the default branch with push for Maintainers only, as Sécurisation had said):
  - The test of the administrator's token (`GET /__setup/gitlab/admin`) gives `branch: { name, protected, open }` — the
    project's default branch, `open` when a push level between 1 and Developer (30) is allowed or the branch is not
    protected. The screen reads it in the background: closed, « Branche main : push réservé aux Maintainers — les
    pilotes ne pourront pas écrire » with « Ouvrir la branche aux Developers » at the top; the same in « Tester ».
  - `POST /__setup/gitlab/admin/branch` (workstation only), after the screen's question: `PATCH protected_branches/<b>`
    with one push rule more (`access_level` 30), read again; an instance that refuses it (several rules are a paid tier
    on gitlab.com) — the protection is made again with push 30, merge level and force push kept; if the new protection is
    refused, the old one is put back (never left unprotected) and the refusal said. Already open: nothing done.
  - The first pilot token on a closed branch: the question before creating (« non » creates it anyway: it reads without
    writing); never an opening without the question.
  - The pilot's side: a GitLab 403 « not allowed to push into this branch » says « jeton sans droit d'écriture : la branche
    main du projet n'est pas ouverte aux Developers — administrateur : Jetons des pilotes › Ouvrir la branche aux
    Developers » (the device's branch); another 403 keeps the plain phrase.
  - Settings' assistant (Réglages) reads the same `branch` of `GET /__setup/gitlab/admin`. Noreg I33, A78, A39.
- **1 Nov 2026 — The data branch for the pilots: protected, Developers, no force push** (Sécurisation's review of c6f3bc38b,
  « à corriger »):
  - Force push applies to whoever may push: opening the branch to Developers kept it for the pilots' tokens when
    Maintainers had it. The opening now sets `allow_force_push: false` (in the PATCH and in the protection made again),
    the question says it, and `open` requires it off.
  - An unprotected branch is no longer `open` (a Developer could force, rewrite or delete it): the screen says « non
    protégée » and « Protéger la branche (Developers, sans poussée forcée) » posts the protection — push 30, merge 40,
    no force push. A branch with force push allowed is said too, and set the same way.
  - The fallback (DELETE then POST, the free tier) keeps its short window without protection; the restoration after a
    refused protection is now checked: refused too, the answer is `reason: unprotected` (« la branche des données n'est
    plus protégée : reposez sa protection dans GitLab, Settings › Repository › Protected branches ») and the launcher's
    log says it. The unprotect level comes back to its default (Maintainers), which the free tier does not let set
    otherwise. Noreg I33, A39.
- **1 Nov 2026 — Pilot's entries follow the pilot's sequence** (Simplification, from the user: « the weather button should
  come right after the map: we look at the weather before writing a report »): the phone bar is Préparer · Carte · Météo ·
  CR · Vols; the left column Carburant, Missions, Carte, Météo, Compte rendu, Mes vols, Site. Missions, in the Préparer
  group of the bar, moves next to Carburant in the column too (it was last). The first module stays Carburant. Help ×4
  (« The verbs »). Noreg A79, A14.
- **1 Nov 2026 — One door named « Aide » per screen** (Simplification, from the user: two « help » pages in Maintenance):
  the « ? » of the header is the door (on every screen, phone included, and contextual): it opens the manual of the
  application at the chapter of the module shown, with at its head « Toute l'aide » and the contents of this manual.
  Maintenance's « Aide » entry of the column goes. « Toute l'aide » (`#help?all=1`) is the index: the manuals of the
  applications the device opens (each at its address, `…#help`) and the tutorials (Pilot's, at Pilot's address from
  Maintenance). The Settings' group « Aide », which holds only « À propos », is Réglages'. Noreg A80, A36.
- **1 Nov 2026 — The administrator's token block says what is set** (Simplification, from the user: the block looked
  « empty » while the token worked — pilot tokens were created): `GET /__setup/gitlab/admin` returns `where: { set, at,
  instance, project }` (`gitlab_where`: the date the token was set, the instance's host, the project path; never the value),
  a refusal included. The block's title reads it at every drawing, or from the answer of a save or a test (drawn at once,
  no later read): « posé le 2026-11-01 · gitlab.com · groupe/projet · testé à 14:05 », or « aucun jeton posé ». The token
  field stays empty by design. The secrets' list (`secrets_view`) stays blind for gitlab; the instance's host and the
  project path now reach the page through this workstation-only route (they are not secret; Sécurisation reviews it).
  Noreg A39, I32.
- **1 Nov 2026 — Two reads for the Synchronisation card** (Simplification, for Réglages' summary of the synchronisation):
  `FrameData.pendingList()` gives the queue without the text (path, module, date, deletion, and the error of the last pass
  when it failed — a pass error holds the whole queue, a write refused for good goes to the conflicts); the launcher's
  `sync-status` also names the paths changed here (`changed`) and those of the commits to send (`toPush`), names only, at
  most 200 each with their totals (`data_sync.PATHS_MAX`). Noreg A53 (store bench), I35.
- **1 Nov 2026 — The suite's version, written once, said in three places** (Simplification, from the user: no « About », no
  footer, no version in Diagnostics): the launcher's status carries `version` (`git describe --tags --always`, the commit
  date; `suite_version()`, cached a minute), `tools/build_pages.py` writes the same in `version.json` for the site without
  a launcher. The frame shows it as the last line of the Status block (« SOG 6.0.0-alpha.2-25-g1a2b3c4 · <date> »), puts it
  at the head of the copyable diagnostic (`suite`), and gives it to the Settings as `ctx.version()` for their « About »
  card (Réglages: version, code repository, licence, roadmap, report link). No footer (height on a phone). The Status block
  is now always shown when a version is known. Noreg A81, I34.
- **1 Nov 2026 — A third application, Company** (Simplification, from the user: « the Missions module is the first, and for
  now only, module of the airline pilot; nothing to do in the Pilot module »): `APPS.company`, « Compagnie / Company /
  Gesellschaft / Compañía » (one word; the airline's name, read from `airline/settings.json`, as a subtitle in the switcher),
  Missions alone in its bar and column, the level of Missions, its manual (`intro-company` ×4 and the Missions chapter),
  its icon the plane tinted with a design token (`--sog-ok`) until the airline's logo (next lot). Missions leaves Pilot's
  column and the Préparer group of its bar. Navigation between applications: `APP.elsewhere` — Company hands `#fuel` to
  Pilot (« Préparer ce vol », the query kept), Pilot hands `#missions` to Company (an old address). The flight in progress
  is common. Features SOG sets Missions' `meta.apps` to `['company']`. Noreg A82 (switcher, bar, manual, handovers), N
  cases opened in Company.
- **1 Nov 2026 — The Company application's icon is the airline's logo** (Simplification, from the user: not a tinted plane
  but the logo): `airline/settings.json` names it once (`logo: "airline/logo.png"`); a file of the data repository, read
  by the data layer like any file (`FrameData.readBytes`, the transports' `readBytes`, kept by revision) — never an
  external address. The frame accepts png, webp (magic bytes) or svg (a text starting with `<svg`), 512 KB at most, and a
  file the browser decodes; it shows it by a `blob:` address (an svg in an `<img>` runs no script) in the header (28 px),
  the switcher (48 px) and the browser tab of Company, `object-fit: contain`, centred, transparent: a wide logo shrinks,
  never cropped nor deformed. None, unreadable or too big: the tinted plane, without an error. Read again with the airline
  (by revision, so a new file is redrawn). Test logos: `tests/v3/fixtures/airline/logo-dalton.png` (its sticker's shadow
  removed, the white kept) and `logo-rm.png`. The administrator will set it through the assistant (roadmap). Noreg A83.
- **2 Nov 2026 — The version carries the code repository's address** (Réglages, for the « About » card: the repository and
  the report link, Simplification): `ctx.version().web` — `release.repository.web` of `config/repository_tree`, read by the
  launcher (`suite_web`) or by `build_pages` into `version.json`; https only, else null (then the card shows neither line).
  Noreg A81, I34.
- **2 Nov 2026 — The airline's logo: png or webp only, never svg** (Sécurisation, line 156, « à corriger »; Simplification
  chose the simplest fix): a `blob:` address is of the suite's origin; an svg opened as a document (« open the image in a
  new tab », a long press, a drag to the address bar) would run its scripts there, where IndexedDB keeps the device's
  tokens — and every pilot's Developer token may push `airline/settings.json` and a file. So the frame takes png and webp
  only (the path's extension and the first bytes), never an svg, whatever its name; no rasterisation by canvas (more code
  for one more surface). A refused logo (svg, another content, more than 512 KB — `readBytes` throws `err.tooBig`, an
  undecodable file) is said once per path to the administrator (Full level, a floating note: « Logo de la compagnie : png
  ou webp, 512 Ko au plus », ×4); the pilot has the tinted plane, without a note; absent or offline without a copy: no
  note. Noreg A83 (an svg, and an svg named .png, never shown nor run).
- **5 Nov 2026 — R-F4, one writer of the route and the level** (Features SOG, lot A; told to V3 Frame): `frame/lib/current_flight.js`
  gains `routeBase`, `changesOf`, `applyChanges`, `setRoute`: a module writes only the route keys and the level it changed since its
  last read (Fuel now; the Map's `saveRoute` next, BUGS SOG). The frame keeps `progress`: its writer of `progress.actual` and
  `clearActual` (app.js) now re-read the record just before writing (they re-wrote a record read before their awaits and brought back
  an old route on a started flight). Cases F88, F16; modules/fuel/DECISIONS.md.
- **5 Nov 2026 — `FrameData.lastPushed()`: what just left, for the Synchronisation card** (SOG-0029, lot E: the card says
  « à pousser » with the name of the sheet but not what has just gone, the layer keeping nothing of the last pass):
  - **Kept by the layer, in meta `lastPushed` `{ at, list: [{ path, result }] }`**, filled by `run()` for each file of a send it
    tried: `'ok'`, or the reason the transport gave — a refused send (a 403 of the repository) names the files of the queue
    with it; a write refused for good (`e.refused`) is named `refused: <why>` and the rest goes on. `lastPushed()` returns
    `[{ path, at, result }]`, `at` the time of the pass.
  - **The last send, not the last pass**: a pass that sends nothing (empty queue, offline before the commit, no trigram, the
    local single-user transport) leaves the list, so « parti à 18 h 04 » is still true after a quiet pass; the next send
    replaces it (the last synchronisation only, never a journal). A pass offline never reached the commit: nothing was
    tried, nothing recorded (the queue is the « to push » side of the card). Never emptied by the layer (the device reset
    clears all, as for every meta).
  - Bounded: 200 files, 120 characters of reason; never the text of a file. Read without effect. Noreg A53 (store bench: two
    files named, never the content, reading without effect, a quiet pass leaves it, a refused send named with its 403, the
    same file then `ok`, an offline pass leaves it; the fake GitHub gains `deny`).
- **6 Nov 2026 — The frame's half of SOG-0013: the position writer's reading, proved** (Simplification, after the review of
  `6c18b6112`; V3 Frame): `onFix` reads the flight again after its waits and writes `progress.actual` alone on that reading
  (done in `6c18b6112`); `clearActual` did too but fell back on its earlier reading (`|| cur`) when the second reading gave
  nothing (record unreadable), writing back what it had read before the wait. It now returns: no position left to remove, nothing
  to write; the next change of the flight starts `liveCheck` again. Noreg A88 (the other writer plays in the frame's wait, the
  route and the level it wrote stay after the position; a flight ended in the wait keeps its end) and A89 (the left-over position
  goes, `progress.phase` stays; the layer answering nothing, the earlier reading is not written back); both fail on the code before
  `6c18b6112` (A89 also on the `|| cur` fallback). Left as debt: `get` then `put` are two operations (a window of one turn of the
  event loop); only an atomic `update(path, fn)` of the data layer would close it (roadmap point of 7 Nov). Not isolated by a case:
  the `flying(fresh)` guard alone (a position left on an ended flight is taken off again by the next `liveCheck`).
- **6 Nov 2026 — A position is compared with the start by instants, not as text** (SOG-0037, found while proving SOG-0013's frame
  half; Simplification; V3 Frame): `liveCheck` decided « a position older than the start is a left-over » by comparing the two
  ISO dates as strings, which only holds while both are written the same way: a start to the second (`…50Z`) sorts after a position
  of that second in milliseconds (`…50.400Z`), and `09:…+02:00` after `07:…Z`, so a good position was removed (and a stale one kept
  the other way round). It now compares `Date.parse` of both, as `flying` already does for the start (one rule for the instants of
  the flight, no helper added: `on` guarantees the start parses, an unreadable position is not a left-over). Noreg A90 (four
  scenes: the start to the second, in +02:00, a position before the start in both forms), red on 6.0.0-alpha.3. Left as debt, same
  kind and not touched: the anonymous-to-trigram migration (`newer`, app.js) and the data layer's `stampOf` (three-way merge,
  `updated_at` compared as text, « the most recent wins ») compare dates as text; it holds while the writers all use `toISOString()`;
  a change of the merge rule is a decision for Simplification.
- **6 Nov 2026 — What counts as a conflict, and one rule for the instants** (SOG-0043, Réglages: the Synchronisation card said « 8 »
  while git had no conflict in `data/` since 30 Oct; Simplification, decision 1.8 of the roadmap point; V3 Frame): the `record` merge
  counted a conflict for every file changed on both sides and kept the whole newest file, even when the two sides touched other keys or
  only `updated_at`. Now, as `tools/data_sync.py` since Réglages' e43cdcf7c: (1) **identical once parsed, `updated_at` / `updatedAt`
  aside** (key order, layout): no conflict, nothing kept (`sameData`, the text of the later one); (2) **by top-level key with the base**
  (`doc.base`, the text of the last pass): a key changed on one side only is taken from that side, a conflict is counted only when the
  same key changed on both sides to two values (the newest wins that key, the loser kept **whole**, because `restore` takes the kept text
  back as a file, with `keys` naming the keys in dispute); no deeper than the first level; the stamp is the newest one's. **Not for
  `current_flight.json`**, which stays a whole file: its plan and the sections derived from the route (`profile`, `quote`, `ofp`,
  `weather`, `progress.plannedPos`, `eta`, `fuelRemainingKg`) would come from two devices and contradict each other (Réglages' own reason
  for not merging by key in data_sync); the test is on the path (`WHOLE`), reversible in one line. Without a base (the first pass that
  takes up local copies, `adoptLocal`) the file rule stays, after rule 1. `journal` and `keyed` rules are unchanged apart from (1) and (3).
  (3) **One rule for the instants**: `instantOf` / `isNewer` / `notOlder` (`Date.parse`, 0 for a missing or unreadable date; equal
  instants: the local one wins) replace the four text comparisons of `stampOf` (record, keyed, import of a backup, taking up local
  copies) and `newer` of the anonymous-to-trigram migration (`app.js`, now `FrameData.isNewer`); `liveCheck` already compared instants
  (a8132a34d). An unreadable stamp no longer orders as text: it counts as the oldest. Noreg A53 (the store bench: five merge scenarios
  and the instants) and A91 (the migration), red on e902fe003. No atomic `update(path, fn)`: no case showed the need.
- **6 Nov 2026 — « Mark all as seen (n) » on the conflicts screen** (SOG-0043; Simplification, on the user's word: eight old conflicts on
  the workstation, only the single « Seen » existed; V3 Frame): a button above the list of `renderConflicts` (`app.js`), `n` = every
  unseen conflict (not only the listed ones: the same count as the status), that calls `conflictSeen` on each (no new data-layer call:
  nothing is deleted, the conflicts stay behind « Also show conflicts already seen », « Take this version back » still works on them).
  Absent when none is unseen. Help ×4 (the `intro` sources, `pilot.*` regenerated). Noreg A92 (eight conflicts → one click → 0, the
  per-conflict buttons unchanged, none left unseen: no button), red without the button.
- **6 Nov 2026 — The current airline in the data layer** (V3_SPECIFICATION § 10.38 step 1; Simplification's contract; V3 Frame):
  `FrameData.airline()`, `airlines()`, `setAirline(code)` and the event `frame-data-airline` (frame INTEGRATION). Decisions: (1) the
  choice is the device's, in the layer's meta store (`airline`), like the other local settings of the layer, never in `data/`;
  (2) `airlines()` is added to the contract because the chooser needs the list, with « personnel » last; (3) every file of
  `data/airline/` is untrusted (§ 10.36): codes `^[a-z0-9]{2,8}$`, `perso` and `default` reserved, names bounded and cleaned, twenty
  airlines at most; (4) no valid index = no index = the airline of today (`default`), also for a malformed file, so a bad
  `index.json` never empties the screen; (5) « personnel » is created empty at the first request, under
  `pilot/<trigram>/airline/perso/` (`pilot/ANON/…` without a trigram, taken up by the usual migration); (6) the event name follows the
  layer's (`frame-data-status`, `frame-data-conflict`), not `frame-airline`, which stays the frame's own event for the settings of
  today's airline; the event fires on `setAirline` only (a chooser or a reader re-reads `airline()` after a pass: the migration
  writing `index.json` is seen at the next read). No screen, no reader moved. Noreg A53 (the store bench: default without index,
  two airlines + perso, the event, the device setting, the untrusted index) and A93 (the real frame: the choice survives a reload).
- **9 Nov 2026 — The frame follows the current airline** (V3_SPECIFICATION § 10.38 step 1, second part of the frame's lot; Simplification;
  V3 Frame): `ctx.airline` is built from `FrameData.airline()` instead of `airline/settings.json` alone (`loadAirline`, `app.js`) and is
  re-read on `frame-data-airline` as well as on a change of the files; name, site, logo, relay and networks follow the choice, no reload.
  (1) `airline()` gains `root` (the airline's folder) so that the logo path is judged in one place: **the logo is taken only in the
  airline's own folder** (`logoPathOf`; a bare `logo.png` or the full path), because `settings.json` is untrusted (§ 10.36) and a settings
  file must not point the frame at another airline's file or elsewhere in the repository; png / webp by magic bytes, 512 KB, decodable,
  as before (audit 157). (2) `ctx.airline.networks`: the simple fields (text, number, boolean) of `settings.networks`, eight at most, text
  cut at 80 — the shape of the networks is Réglages' to fix; nothing richer crosses the frame. (3) `transitionFt` and the other settings
  are still not in `ctx.airline` (the maps read it and get `undefined`, as before): a reader that needs a setting reads `FrameData.airline().settings`.
  (4) The personal airline's own edits are not watched (only `airline/` is): they are seen at the next choice or reload; to settle when its
  editor exists. Noreg A94 (three airlines through a fake launcher: the first of the index, the choice of another with its name, site and
  logo, a logo in another airline's folder refused), red on 8baeb0b2d; A83 (the airline of today) unchanged and green.
- **9 Nov 2026 — The launcher's tree of `data/` read once per load, and not again when unchanged** (SOG-0063, item 1 of the survey: two
  parallel `GET /__setup/changes?since=` of 946 KB each per load, about half of the bytes of a screen, 1.0 to 2.4 s each; Simplification;
  V3 Frame): (1) `transport_launcher.js` keeps one `{ head, tree }` and one request in flight **for the whole page** (module state,
  not per transport: the data layer and the references source each had their own `last`, empty at load, and each downloaded the tree);
  (2) `head(hint)`: the layer passes the head it kept with its tree (meta `remote`) and the transport sends it as `since` when it has
  none of its own, so the launcher answers `same` without the tree; (3) `treeNow` and `pull` take the kept tree when the head is the
  kept one (`liveTree` already did). The result of a synchronisation is unchanged: a changed `data/` has another head and is read in full
  (proved by the third load of the case). The other transports (GitHub, GitLab, git) ignore the hint. Noreg A100 (a fake launcher with a
  600-file tree counts the answers: one full read on the first load; every answer `same` on the next, a few bytes against the tree's 15 KB;
  a remote change still arrives), red on d8c1029b6 (two full reads of the unchanged tree).
- **9 Nov 2026 — A57 and a frame without `airline()`** (alpha.4 full pass: A57 red since the frame reads the airline with `FrameData.airline()`;
  A95 red in Réglages' simulated frame; V3 Frame): not a defect of the 3 s bound on outgoing calls (`AIRLINE_WAIT`, still on the first
  read of the airline): A57 held the first read through the adapter `frame-airline`, which the frame no longer uses for it, so nothing was
  held and the wait never started (0.0 s measured). The case now holds `FrameData.airline` (and the adapter's `get`, for the files it still
  reads). And `loadAirline` reads the setting alone, as before § 10.38, when the `FrameData` it is given has no `airline()` (a simulated frame
  that predates it), tolerating a `get` that answers a plain value: the real data layer always has `airline()`.
- **9 Nov 2026 — Screens that do not move: `ctx.placeholder`** (SOG-0132; the user's fifth pull; Simplification; V3 Frame): the primitive is a CSS
  class (`.f-hold`, `min-height: var(--f-hold, 4rem)`, a « … » in `::before` while `aria-busy`) and `ctx.placeholder(el, height)` that sets
  them and returns `done(keep)`. Decisions: (1) the « … » is a punctuation mark, not a word, so it needs no translation in the four
  languages; (2) `done()` removes the reserved height by default (the content now defines it; the caller reserved the final height, so
  nothing moves), `keep` leaves it; (3) the rule is **22** of § 7.1 (rule 21 is the airspace filter of the vertical views); (4) the
  adoption is the modules': Réglages first (SOG-0133), the others at the ergonomics pass of 11 Nov; the frame's own blocks that fill
  late are not changed in this lot. Noreg A110: a block held at 120 px has its height, the « … » and `aria-busy` at the first render and moves
  nothing under it when its content arrives, while the same block without the reservation moves what is under it by its whole height;
  Settings at load has a cumulative layout shift under 0.1 (measured without a launcher: the slow case, a launcher waiting for the
  repository's version, is Réglages' SOG-0133). Red on 824427537 (`ctx.placeholder` absent).
- **9 Nov 2026 — The world synoptic also under `data/local/weather/world/`** (SOG-0138, the GFS synoptic: AeroDB now writes its pages in `data/local/weather/world/`,
  never synchronised, regenerable, 17 MB every six hours, served by the launcher; Simplification; V3 Frame): `weatherStore.world()` read only
  `<root>/weather/world/`. It now tries `<root>/weather/world/` then `<root>/data/local/weather/world/`, in that order and nothing else
  (`WORLD_BASES`, `worldJson`); the index is looked for in both order each time it is read (every 10 min at most), the steps first where the index
  was found, then the other (a publication can appear later); absent from both: `null`, « no publication » as before. The publication still wins
  when present, so a site's published file is never shadowed by a local one. Noreg A25 (the weather bench: first base absent → the second is read, steps
  too, kept on the device; both absent → `null` after exactly the two asks; the publication present → `data/local/` never asked), red on 7ccea997d.

- **10 Nov 2026 — a conflict entry only when a version differs, and the diff on screen** (SOG-0136, Réglages with the frame's data layer). The user, alone, saw nine entries `pilot/RBR/current_flight.json`, « Version écartée : celle d'un autre appareil », two blocks **empty**, while working in Fuel (a write every few seconds).
  Survey (Settings DECISIONS): no conflict in git, one author, the launcher and the browser write different files. In the page, an entry is made by `mergeText` when the pending text, the base (this device's last write) and the text read back from the launcher are three different **strings**: it compared bytes, so a copy of the device's **own** last write
  that came back with other line endings, another layout or another key order was a « version of another device », and an **empty** read (a file being written, a partial read) was a version too, whose `lost` was empty (`non-JSON branch: kept local, lost ''`). Now: line endings do not count (CRLF = LF), a distant text equal to the base once parsed (key order and layout aside, stamp included) is unchanged and the local edit wins,
  an empty or blank distant text is not a version (the local text stays, and an unchanged local does not take the empty one), and an entry is recorded only when the lost version says something and differs from the kept one. The screen writes `(vide)` for a blank version and shows the lines that differ. Bench cases (A53: CRLF copy, other layout and key order, empty and blank remote, different content), A111 (the screen).
  **Not proved**: which of the three it was on the user's workstation (the entries are in his browser store, unreadable here, and the two blocks were empty, which only the empty-read path explains); the git history of the file shows the bytes the page wrote unchanged (`JSON.stringify(v, null, 1) + '\n'`, LF), so line endings and layout are not what the launcher gives back today. If an entry appears again it now carries a real diff.

## 10 November 2026 — a question never exceeds the screen (SOG-0151)

- **The user's words**: « quand on télécharge puis sélectionne le fichier téléchargé, une énorme popup apparaît, plus grande que l'écran, sans pouvoir cliquer sur le bouton ». The pickup's question (Data) wrote every file found in one paragraph; the window (`.f-modal>div`) had no height limit, so on a phone the buttons were off screen and the page behind did not scroll.
- **Two guards, each with its counter-test** (case L57): (1) the frame's window is a flex column with `max-height: min(70vh, calc(100dvh - 32px))`; its text (`p`, `label`) scrolls inside, the row of buttons never moves — any module's question benefits; without the `max-height` the generic long question measures 6 513 px on an 844 px screen. (2) the pickup's question lists seven files at most, then « … et n autres » (`capLines`, `TX.pickupMore`), for the zips found and for the problems; without it the sixtieth file is written.
- Rule 13 stays the reason: the list is cut at seven, the scroll is the safety net, not the design.

## 10 November 2026 — `exchange()` passes on the cause and the step of a failed pass (SOG-0155)

`result.exchange` now carries `cause` and `step` (closed lists: the ten causes and six steps of `tools/data_sync.py`; anything else is `''`), next to `message` and `code`, for the Données panel (Data SPEC § 5.8). V3 Frame informed by the coordinator. Case L59 through the real adapter and a fake `POST /__setup/sync`.
- **10 Nov 2026 — Opening Maintenance: one call, and the list does not wait** (SOG-0164, « la latence à l'ouverture de la page de maintenance n'est pas
  corrigée »; measured by Simplification on the user's launcher: 170 resources, last answer at 2 475 ms, two `__setup/changes` in a row, 593 ms
  without a head then 703 ms with `since`; V3 Frame): (1) the launcher transport keeps the last head it was answered (`shared.seen`, « same »
  included) and gives it to every read of the same load for 3 s (`HEAD_FRESH`) instead of asking again; `commit()` forgets it; the next pass, later,
  asks again, so a change made by AeroDB in the meantime is seen at the next pass, not later than before. (2) `list(prefix)` returns the tree of the
  last pass at once and verifies the head in the background (`liveTree`, once per load); a published zone that appeared since is signalled by the
  pass as before, so a list drawn at once may miss it until then. The cost of one call (700 ms on 10 339 files) is the launcher's (AeroDB, < 50 ms
  announced); the frame now makes **one** call and nothing waits for it. Measured on a test launcher with a `data/` of 10 339 files (`--data`, 27
  zones with a `meta.json`): the calls at opening fall from two to one when the head changed (A100: `[('full'), ('same')]` → `[('full')]`), and a list
  asked while the repository answers in 1.5 s is answered in 0 ms instead of 1 514 ms (A100, red on 1cd5afe98). **What else is avoidable at the
  first paint of Maintenance › Données** (not in the frame's hands, reported): the 27 sequential `GET /data/sia/base/<zone>/<cycle>/meta.json`
  of `aerodb.published()` (aerodb.js, ~7 ms each, started only when the list is known: ~200 ms in one run of the page), the map library (`modules/maps`,
  1 MB) and the map base tiles (`tiles.openfreemap.org`, 8 requests) loaded for a block that is not the first thing seen, 29 scripts of
  `modules/data` (435 KB) loaded one by one, and the polling of `__setup/regen/job` (4 requests, up to 2 s).
- **10 Nov 2026 — « Anciennes pages (V2) », one last entry** (SOG-0166, the user's fifth pull: « je passe mon temps à cliquer dessus par erreur » on the
  Maintenance column's V2 page; Simplification; V3 Frame). **What the V3 frame linked to V2 pages on 10 Nov** (the list asked for): (1) the
  Maintenance column's entry « Page de maintenance (V2) » (`apps/settings/maintenance.html`, level Complet, launcher only), **removed**; (2) three
  buttons of the Administration card of Réglages (`frame/settings/admin_links.js`: `maintenance` → `apps/settings/maintenance.html`, `firstLaunch` →
  `apps/settings/premier_lancement.html`, `mapStudio` → `apps/cpco/map_parser.html`), **not touched** (Réglages' file; the card is an
  administration page where « V2 » is named in each title); (3) the link of the Données module to `apps/settings/premier_lancement.html`
  (`modules/data/panels.js`), not touched. Nothing else in `frame/`, `modules/` or the launcher menu links a V2 page. **Decision:** `#legacy` is a frame
  screen declared for every application (`LEGACY`), its entry always the last of the column (`li.f-legacy`: filet, `opacity .6`) and, on a phone, the last
  row of the application menu (the column is not shown there; the bottom bar carries the modules only). **The list (`frame/legacy.js`)**, by group, is
  every HTML page of `apps/` that is not the help or a per-category report form: **Carburant** `planner/flight_performance_planner`,
  `planner/performance_sheets`; **Missions** `cpco/mission_registry`, `cpco/mission_editor`, `cpco/odv_orders`, `cpco/odv_planning`, `pilot/mes_missions`,
  `pilot/aujourdhui`, `pilot/disponibilites`, `cr/mission_cr`, `cr/mission_operations_reporting`; **Maintenance** `settings/maintenance` (launcher only: a muted line
  without it), `premier_lancement`, `parametrage`, `profil`, `apparence`, `centre`, `installation`, `cr/flotte`, `cr/appareil`, `cr/equipage`; **Route**
  `planner/map_planner`, `cpco/map_parser`; **Statistiques** `landing/LandingPerformance_Dashboard_MultiCSV_i18n` (stats landing V2), `pilot/mes_vols` (stats
  vol V2); **Canadair** `cr/FIRE/fire_cr`, `cr/FIRE/fire_reporting` (the firefighting reports: my reading of « canadair », **to confirm with the user**).
  **Not in the repository, so not listed:** « rad d'origine » (`E:/DEFA/rad`, archived per SOG-0152; add the path here when it is served). The
  pages of `apps/sia/` are copies of `apps/cpco/` and are left out. Each link opens in a new tab with `noopener`. Noreg A116 (the last entry, no V2 href among
  the column's entries, the hairline, the six groups, each link `_blank`; on a phone the last menu row), red on 77185fe84.
- **10 Nov 2026 — A workstation tests the version the launcher serves** (SOG-0168, « l'utilisateur teste une vieille copie sans le savoir »: « stockholm »
  worked since 3d70ded7a and was said failing the next morning; his port serves origin/v3 byte for byte; the offline copy of the frame kept the old
  one; every fix not seen became « bug pas corrigé »; Simplification; V3 Frame). **When the copy kept the old version** (read in `frame/sw.js`): the first
  load after a fix always (cache first, the new version staged in `sog-frame-v1-next`, taken by the *next* navigation or « Reload »); two loads closer
  than the staging (100–130 files); a changed file the load did not ask for (noticed when asked); a staging cut by a busy launcher, dropped and tried
  again at the next changed file; an open page keeps its own `app.js` (wanted, 31 Oct); the question « Reload » deferred changes nothing (the next
  navigation takes the staging anyway); `skipWaiting` retains nothing. **Decision:** (1) on the loopback (`LOCAL` in `sw.js`) every navigation first
  revalidates all copies with the launcher (`syncLocal`: `If-None-Match`, replaced in place, 4 s at most), so the page is the launcher's at the first
  load, with no question and no staging (`refreshAll` is not started there); the question stays elsewhere, where it protects a flight in progress. A LAN
  device (a phone on the workstation's launcher) keeps the question: it can be in flight. Known limit: a tab left open while the files change may
  mix on a lazy load until it reloads (the same as before for a staged version). (2) The version is readable: the Status block and À propos already give
  the SHA (`git describe`) and the date; the launcher's status now also gives the commit's **time** (`version.time`, `%cI`), shown after the date, and
  **`app`, the stamp it puts on `frame/app.js`**; the page compares it with its own (`OWN_STAMP`, the `?v=` of its script) and, when both are
  known and differ, says « This page is older than the launcher: reload » (`k: 'stale'`, before the version line, `go: 'reload'`). Nothing is said
  without a stamp (an older launcher, a page served without stamps, the site). Noreg A53 (the SW bench: launcher present → the page and every copy are
  the new version at the first load, no announcement; launcher stopped → the copy holds; back → the next load takes the next version; the remote
  origin keeps its scenarios), A117 (the stale line, the time, nothing without a stamp or with the same one), red on 2f9e0cf55.
- **10 Nov 2026 — « Old version · Reload » is a cartouche, not a banner** (SOG-0168; the user: « de la place dans le header pour un bandeau aussi important
  que « version pas à jour », ou un petit label blanc sur cartouche rouge sombre », with the picture of an airway's cartouche; Simplification: the cartouche, a
  banner would push the screen, rule 22; V3 Frame): `#fStale` in the header beside the sync button (`frame/index.html`, `frame.css .f-stale`, `paintStale`
  in `app.js`): square corners, white on `--sog-err` (all the designs' values give a contrast of 5.2 or more, measured 6.5 on the standard one), 28 px
  high with a 44 px touch area (`::after`), on a phone smaller type and two lines at most (7.6 em); text « Version ancienne · Recharger » ×4, the
  full sentence in its `title` and `aria-label`. Shown when the page is older than the launcher (`OWN_STAMP` ≠ the launcher's `app`: a tap reloads) or when
  the next version is ready on a device without launcher (`update.ready`: a tap takes it); `hidden` otherwise, so nothing is reserved and the header
  keeps its height (A118 measures it on and off, and with the cartouche). With the revalidation at each navigation it should almost never be seen on a
  workstation: it is the net. The Status block line stays (A117).
- **10 Nov 2026 — The tree of data/ kept in memory: IndexedDB read a handful of times, not dozens** (SOG-0169, from BUGS SOG's CPU trace of the Map alone on the
  user's launcher: `frame_data.js:78-79` `q.onsuccess` 1 269 ms of own time, `get` 90, `list` 140, `valueOf` 83, ~1.7 s of IndexedDB reads over ~12 s, 520
  requests; V3 Frame). **Cause:** the head and tree of `data/` are one `meta` record, « remote » (10 339 entries on his repository), read from IndexedDB by
  every `list`, read, pass and check — about fifty times a load — and every IndexedDB read clones the whole object (structured clone). **Change:** the two big
  meta records (`remote`, `refs`) are kept in memory (`metaMem`), written through by `setMeta`, forgotten when another tab writes them (`BroadcastChannel`
  `sog-frame-meta`) and at `reset()`/`load()`; callers copy what they change (checked: `{ ...remote.tree }` in `applyPushed`, new objects elsewhere). **Measured**
  with a profile of every `IDBObjectStore` request on a test launcher with a `data/` of 10 339 files (Chrome, two runs each, `#maps` then Maintenance › Données):
  the Map 208 requests / 415–487 ms → 165 / 215–227 ms; Maintenance 273 / 582–917 ms → 226 / 360–428 ms; the reads of « remote »: 50 → 3 on Maintenance.
  A121 counts them in the real frame (3 000-file tree: 21 reads before, 8 at most now, 3 runs stable). **Not done, left to measure on his repository:**
  the `docs.get` + `pending.get` pair per read (82 + 82 on Maintenance, ~120 ms: a « pending is empty » shortcut would save the second, at the price of a
  cross-tab flag), the JSON parse of a cached document at every read (`valueOf`, 83 ms in the trace; a shared parsed copy would need callers that never
  mutate), and `cache/data/coverage.json`, a 121 ms write at every load of Maintenance › Données (the Données module's). The trace of 90 s idle (0 requests,
  0.3 % CPU) says nothing is polling.
- **10 Nov 2026 — One request per navigation, not 130** (SOG-0168; the user: « relecture à chaque chargement, n'est-ce pas faire et défaire ? Tu l'as mis en place
  pour optimisation, non ? »: right in part; Simplification: one fingerprint; V3 Frame). **Measured** (Chrome with the service worker active, a real launcher
  on a `data/` of 10 339 files, loopback, 163 copies in the cache, four reloads each): before SOG-0168 (copy first, revalidation in the background) 101
  service-worker requests, page answered in 3–5 ms, loaded in 34–44 ms; with the conditional revalidation of every copy at each navigation (3511460a7)
  **267 requests (147 conditional), page answered in 267–605 ms, loaded in 298–661 ms**, ten to fifteen times the load time, because the page waited for the
  147 and the copy-first mode still revalidated each file it served; now **1 request** (the fingerprint, 7–29 ms on the launcher), page answered in 10–29 ms,
  loaded in 33–121 ms (reloads 2 to 4; the first navigation after the install reads every copy once: 165 requests, 337 ms). **How:** the launcher answers
  `GET /__setup/frame-stamp` with one fingerprint of what it serves to the frame (`frame_fingerprint`, a `scandir` of `frame/` and `modules/` without
  `test/`, `(path, mtime_ns, size)` hashed, 1 s in memory: a file's date invalidates it); the service worker keeps the fingerprint of its copies
  (`__sog-frame-stamp` in the copies' cache), compares at each navigation, and on a difference reads every copy again (`syncLocal`) before answering; in the
  local mode the copy is served without the file-by-file revalidation. A mute or slow (2 s) launcher leaves the copy. A fingerprint kept only when the whole
  read succeeded. Noreg A53 (the service worker bench: equal fingerprint → one request and no file asked, the copy served; a different one → the page and
  every copy are the new version at that load; launcher stopped → the copy; back with the same fingerprint → the copy; changed → the next version), red on
  f68db9ceb. **Limit:** a file whose date and size do not change (a replaced file with the same size and date) would not show; the launcher's own stamps
  (`?v=`) have the same limit (signature date and size).
- **10 Nov 2026 — The pelican sites tool is the « Canadair et pélicandromes » group of the old pages** (SOG-0083; the user: « la page surnuméraire, comme rad,
  qui permet de positionner les pélicandromes et d'en extraire le yaml »; Simplification; V3 Frame). It replaces my reading of « canadair » (the fire reports, which
  go under **Missions**). **Origin:** the user's own tool, `Downloads/pelicandromes_osm (19).html`, entered **as it came** (13 896 bytes, dated 9 Oct 2026, git blob `7757e1b7`) as
  `apps/outils/pelicandromes/index.html` on 10 Nov 2026; linked from `#legacy` (group « Canadair et pélicandromes », one page). **What it calls**
  (read in full, nothing else leaves): `unpkg.com/maplibre-gl@5.9.0` (the stylesheet and the script), `cdn.jsdelivr.net/npm/js-yaml@4.1.0` (the script),
  `tiles.openfreemap.org/styles/liberty` (the vector style and its tiles, sprites and fonts), `server.arcgisonline.com/ArcGIS/rest/services/World_Imagery`
  (the satellite tiles); its data stays in the browser's `localStorage` (`pelicandromes-osm-v1`, `pelicandromes-basemap`) and leaves only by the YAML file the user
  downloads; 32 sites seeded in the page (aerodromes' reference points). **Known problem, a decision for the user / Sécurisation (not taken here):** the launcher's
  content policy (`script-src 'self' 'unsafe-inline'` + pdf.js and acorn, `connect-src` a fixed list) **blocks both scripts** (`unpkg.com`, `cdn.jsdelivr.net/npm/js-yaml`)
  and the satellite tiles: the page opens but the map and the YAML do not work (checked with the launcher: « violates the following Content Security Policy
  directive »). Widening a policy that is audited is a security decision; the options are the two pinned files and the Esri path for **this page only**
  (a per-page policy in the launcher), or local copies of the two libraries (the page is entered unchanged, so that is an edit of it). A116 pins the hosts the file calls and its
  presence.
- **10 Nov 2026 — The pelican sites tool: the original kept, `index.html` an adapted copy that works under the launcher** (SOG-0083; Simplification: the
  content policy is not widened on a session's decision, option (b) meanwhile; V3 Frame). `apps/outils/pelicandromes/original.html` is the user's file **as it came**
  (git blob `7757e1b7`, not linked, for the record); `index.html`, the page linked from `#legacy`, **differs in four places only**: (1) the stylesheet
  `unpkg.com/maplibre-gl@5.9.0/…/maplibre-gl.css` → `../../../modules/maps/lib/maplibre-gl.css`; (2) the scripts `unpkg.com/maplibre-gl@5.9.0` and
  `cdn.jsdelivr.net/npm/js-yaml@4.1.0` → `modules/maps/lib/maplibre-gl.js` (MapLibre 5.6.0 — the page uses `Map`, `Marker`, `NavigationControl`, `setStyle`, `jumpTo`,
  `panTo`, `addSource`, `addLayer`, which that version has) and `frame/lib/js-yaml.min.js` (js-yaml 4.1.0, the same version, `jsyaml.dump` / `load`); (3) a hidden line
  `<span id="satnote">Fond satellite indisponible sous le lanceur.</span>` beside the background choice; (4) a `securitypolicyviolation` listener that shows it when
  a request to `arcgisonline` is blocked. Nothing else; the policy is untouched. **Checked** against the real launcher: `maplibregl` and `jsyaml` are defined, the
  OpenFreeMap vector style and tiles load, choosing the satellite shows the line instead of a silent empty background. The satellite tiles stay blocked (a decision
  for the user, option (a): a per-page policy). Noreg A116 (the original keeps its four hosts; the page opened has only the tiles' two; with nothing outside reachable
  the page has `maplibregl` and `jsyaml`, lists the sites and its YAML export produces `pelicandromes_positions.yaml`; the line appears), red with the CDN version.
- **10 Nov 2026 — The cartouche in its own cell, shrinking by steps** (SOG-0168 refused by the user at 10 h 42: « le cartouche rouge est mal placé, le texte déborde largement »;
  the capture: the cartouche and the sync button on one another; Simplification; V3 Frame). **Causes found:** (1) the cartouche matched the header rule for icon-only buttons
  (`.f-head button:not(.f-sync)…`: `width: 44px; padding: 0`) so a 190 px text lived in a 44 px box and spilled over the neighbours; I measured the height and the contrast but
  not the width, and A118 did not look at the neighbours. (2) Two sizes of the same text: on a phone it had also `white-space: normal` at 7.6 em. **Change:** the cartouche is
  excluded from that rule (`:not(.f-stale)`), is a `flex: 0 0 auto` cell, always one line; `fitStale` (`app.js`) tries three steps and keeps the first where no rectangle of
  the header cuts another, the header does not overflow, the sync button and every other neighbour show all their text and the application's name is whole: the label,
  « Recharger » (`T.info.staleShort`), a 16 px square dot; the label stays in `aria-label` at every step and the sentence in the tooltip; refit at each paint of the
  sync state and on resize. No `overflow: hidden` (it would cut the 44 px touch area). **Captures** (A122 writes them): `tests/v3/shots/A122_header_390.png` (« Recharger », the
  name whole), `_768.png` and `_1280.png` (the whole label beside « Hors ligne · 11 en attente »). Noreg A122 (at 390, 768, 1280 and 250: the longest sync state, no overlap, no
  neighbour cut, the name whole, square, white, one line, the label in aria-label, a narrow header takes a shorter step), red on f68db9ceb's cartouche; A118 accepts the steps.
- **10 Nov 2026 — The Esri satellite background of the pelican sites tool: a content policy for that page only** (SOG-0083; the user, in this session: « oui pour esri »,
  after « placer un pélicandrome sans photo haute def, c'est jouer aux dés avec un tricheur »; V3 Frame). `tools/csp_policy.py` gains `PAGES = { '/apps/outils/pelicandromes/index.html':
  ['https://server.arcgisonline.com'] }` and `value(extra, meta, page='')` adds the hosts of `PAGES[page]` to `connect-src` **of that page**; `launch.py` sends
  `csp_policy(path)` when the path is in `PAGES`, `csp_policy()` otherwise. **Nothing for `script-src`** (MapLibre and js-yaml are the repository's, 6991120f5); the general
  policy is **unchanged byte for byte** (1 048 bytes, compared with the code of 6991120f5 on the same configuration), and the page's is the general one with the host added in
  `connect-src`. Images are not restricted by the policy today, so none is added. **Checked on a real launcher (Chrome):** from the tool's page a request to
  `server.arcgisonline.com/…/tile/3/2/4` answers 200 with no policy message and choosing the satellite background leaves the line « Fond satellite indisponible sous le lanceur »
  hidden (it only appears when a request is blocked, e.g. on the site); from the frame (another page) the same request is blocked (2 policy messages). **Limit:** the site without
  launcher (GitHub Pages) puts its policy in a `meta` tag per page built by `build_pages.py`, which this does not touch: there the satellite stays blocked and the line says so.
  Noreg I40 (the table is the one page; the general policy has no Esri host; the page's differs only by the host, in `connect-src`; `script-src` identical; the header uses the
  per-page value only for a path of the table), red before (no `PAGES`). One line added to the security audit (Appendix A, hosts contacted). The launcher is to be restarted.

## 10 November 2026 — relayed calls queue in the frame, « busy » is replayed (SOG-0198)

SOG-0178 bounded the launcher's relay (two per host, four in all, the next refused at once: 503, `X-SOG-Reason: busy`, `Retry-After`) so that a slow
outside service never freezes the pages; nothing on the page side read that answer. The Weather grid (several Open-Meteo calls together) was refused
and said « offline » (the user, 14:21, building the synoptic).

- **Queue on the page side** (`relayTake` in `frame/app.js`): the same bounds (`RELAY_PER_HOST` 2, `RELAY_TOTAL` 4), first come first served, a full host
  never holding back another. A caller never sees « busy ». The two bounds must change together with `NET_PER_HOST` / `NET_TOTAL` of the launcher.
- **A « busy » received anyway** (another tab, another workstation) is replayed after `Retry-After` (0.25 to 10 s, 2 s without header), three times at
  most, the slot given back while waiting; then returned as it is (503, `x-sog-reason: busy`, never « offline »).
- **The reason is returned**: `x-sog-reason` on the response (busy, timeout, reset, refused, unreachable, http-<code>); the « offline » response made by
  the frame for a 502 carries it (it lost it before); `x-sog-offline` remains the only sign of « offline ».
- Not done here: the Weather screen still words a failed call itself (`modules/atmosphere/wx.js`, `weather_store.js` `call`); it can now tell « busy »
  from « offline » by `x-sog-reason` (BUGS SOG).
- Counter-proof: noreg A129, red on the previous `ctx.net` (ten calls: more than two at once; busy not replayed; reason lost), green now.

## 10 November 2026 — review of `ctx.ask(…, { sections, note })` (SOG-0197, added by Settings)

Accepted as written, with four corrections in `askSections` (`frame/app.js`): a null or non-object section no longer throws; the texts are bounded
(title 120, line 300, note 500 characters, « … » at the cut) as the groups already were (six, 500 lines); a group that scrolls (more than seven lines)
is focusable and named by its title (a keyboard could not read the rest of the list); the doc comments of `ask` and `askSections` were swapped. Escaping
was right (`esc` on every text and on the group `id`); a question without `sections` has exactly the markup it had. Noreg A130, red before (null section).

## 10 November 2026 — a gesture that needs the launcher is never mute (SOG-0208)

The user pressed « Calculer A → B » and nothing happened; the cause was that no launcher served the page (« trouvé. pas de lanceur. »). The module
tested `ctx.launcher` and returned.

- **What the frame offered** (survey): `ctx.launcher` null in three cases (none, paired device, undeclared) with no way to tell them apart; no state, no event
  when a launcher disappears or returns; the sync button called a stopped launcher « offline ».
- **`ctx.launcherState()` + the event `frame-launcher`**: one state (`up`, `down`, `none`, `lan`), fed by the launcher client (a call that fails by the network
  marks it `down`; any answer finds it again) and by the transport's last error; a launcher that is gone is looked for every 8 s.
- **`ctx.needLauncher({ retry })`**: the module's launcher or null with the one notification (the reason, in four languages; « Retry » for `none` and
  `down` looks again and calls `retry`; not found, the reason comes back with its button). Synchronous, so the handler's flow stays as it was.
- **The header and the Status block**: when it has gone, the sync button reads « Launcher not answering » (state `offline`, before the « on this device »
  label) and the block has a line that retries. When there is no launcher at all, nothing is added to the header: on a site that is normal.
- Counter-proof: noreg A132 (stopping fake launcher, the event, the label, the note, Retry still gone / back, the watch) and A133 (none, lan), red before.

## 10 November 2026 — a forced reload no longer says « old version » (SOG-0204)

Cause: Ctrl+Shift+R bypasses the service worker, so the page is asked of the launcher as the folder (`/frame/`), which `_stamped` did not recognise as a
page (not a file): it was served as is, `app.js?v=0`; the page took « 0 » for its stamp and compared it with the launcher's (A117's rule). Normal loads came
from the service worker's copy of `index.html`, stamped. Fix at the source: `tools/launch.py` `_stamped` serves the folder's `index.html` stamped like
`index.html` (same ETag). The page keeps comparing stamps as before (a page served without any stamp by a launcher is the launcher's fault). Noreg K144, red
before (`folder: '0'`). The launcher must be restarted to take it.

## 10 November 2026 — a loop-breaker for the reloads the frame makes itself (SOG-0209, « refresh en boucle »)

The user, 15:20: « bug en cours : refresh en boucle ». Not reproduced (the ergonomist's tab, Fuel with the Map beside it: no reload in 30 s). Whatever the cause:

- **Survey: the paths of the frame that reload or redirect the page.** `location.reload()`: the cartouche (a click), the « Reload » of the Status line (a click), the
  « Reload » of a new version (`reloadNewVersion`, a click), the error box when the app's files did not load (a click). `location.assign` of another application of
  the frame (a tap). `location.replace`: the application list (a click), and **two without any gesture** in `route()`: `MOVED` (`#relay-devices` → `#devices`, a hash only)
  and `APP.elsewhere` (`#missions` of Pilot → Company, `#fuel` of Company → Pilot: a page load). Nothing else: `sw.js` posts messages and never navigates (no
  `controllerchange` handler either), the `frame-stamp` check only compares and refreshes the service worker's copies, the cartouche only shows. The two tables
  have no cycle today (Pilot → Company for `missions`, Company → Pilot for `fuel`); a cycle would loop. So **the frame has no automatic reload of its own**:
  a series seen by the user comes from a cycle in `elsewhere`, from something outside (browser, another script, a duplicated tab), or from a screen that
  remounts in a loop (a hash redirect between two modules): the last is not a reload, which the diagnostic now lists (`page.reloads.routes`, the last ten routed addresses).
- **Commits of the day**: 9ee030612 (stamp), 93601544f (cartouche), b0dde906a (relay queue) change no navigation: none calls `reload` / `replace` / `assign`.
  A relaunched launcher does not reload an open page (the stamp is read at the start and the service worker serves the copy at the next navigation); a duplicated
  tab copies `sessionStorage` (the breaker's log: at worst a series is seen one tab sooner, for ten seconds).
- **The breaker**: `selfNavigate(cause, go, { auto })` (`frame/app.js`) notes each reload or redirect in `sessionStorage` (`sog-frame-nav`, ten seconds, survives the reload).
  A reload without a gesture (`auto`: the two `route()` redirects) is refused when two were already made in ten seconds — the page stays, a notification says
  « Chain of reloads stopped: <cause> » (four languages), the cause is kept in the page diagnostic (`page.reloads.stopped`, also `window.SogFrame.reloads()`). A gesture of the user always goes
  through. Each page load is noted too (navigation type): three loads in ten seconds not made by the frame (« not the frame (reload navigation) ») are said at the third, and the
  frame refuses its own automatic reloads from then on.
- Counter-proof: noreg A134 (a cycle made on purpose by serving `app.js` with `elsewhere` Company → Pilot for `missions`: three loads, then the note and the cause), red before (it loops).

## 10 November 2026 — the data layer's write guard (SOG-0209: current_flight.json rewritten every 4 to 6 s)

The cause of « refresh en boucle » was not a page reload: two modules (Fuel and the Map beside it) answered each other on `pilot/<trigram>/current_flight.json`, each write
leaving in a synchronisation (50 commits since 14:40, `updated_at` the only difference most of the time, two profile values alternating). The reload breaker stays (small, it costs
nothing); the frame now guards the data layer, whatever the module (`frame/store/frame_data.js`):

1. **`put` of the kept content does nothing** (`sameAsKept`): compared with the queue, then the document, ignoring the top-level `updated_at` / `updatedAt` (`bareOf`, the
   rule `sameData` already used for merges), the order of keys and the layout; no entry, no event, no synchronisation; `{ force: true }` writes anyway. Consequence found by the
   bench: two checks wrote the same record with a newer stamp to prove « the newest wins »; a stamp alone is not an edit, they now change a field too.
2. **Series** (`holdSerial`): a path rewritten without a gesture (`navigator.userActivation.isActive` false) that comes back to a content already written in the window
   (`guard.revisits` 2, window 30 s) or is written `guard.plain` 15 times is held: the last value stays queued, the event and the synchronisation come once per window
   while it lasts. The ping-pong rule (not the bare frequency) is the main one: a user dragging a point writes new values, not old ones, and a gesture exempts the writes it makes.
   Said once in the diagnostic (`serialWrites`) and the console, never a notification. `FrameData.guard` is mutable (the bench shortens the window).
3. **Grouping that existed**: one queue entry per path and a 2 s delay after the last write (launcher transport, `soon`): close writes were already ONE pass; writes 4 to 6 s apart
   were one commit each. Not changed: the delay stays 2 s (a longer one delays what the user did on purpose).
- Counter-proof: bench scenarios of frame/store/test (A53): identical put nothing, ping-pong of two modules (14 writes: at most 7 events and 7 commits, one per window after the third), red before.

## 10 November 2026 — `t()` of the frame agrees with the number (no more « (s) » on screen)

Settings' `frame/lib/plural.js` (`plural`, `agree`) resolves the marks `(s) (x) (es) (en) (n) (e)` from the `{n}` before them. `t(row, vars)` of `frame/app.js` — also the `ctx.t` of every module —
now runs `agree` before replacing the `{keys}`, **only when `vars` holds a number** (a text without a number, or a numeric string, is left as it is: no mark is guessed). The module is
imported at boot (before it loads, `t` behaves as before) and kept by the service worker. `SogSettingsKit.agreeT` stays valid on top (it agrees a text first; the second pass finds no mark). Noreg A136.

## 10 November 2026 — the loop-breaker only stops a chain (regression found by Features SOG: N4, N13, N14 red)

bf27aaec3 counted every automatic redirect of `route()` (`elsewhere`, `MOVED`) in the last ten seconds: Missions → « Prepare this flight » → Fuel is a redirect Company → Pilot, and a test (or a user) doing it
three times within ten seconds had the third refused. A loop is a **chain**: each page is born of the previous redirect and redirects again at its first routing. Now a redirect is « without a gesture »
(`auto`) only when it is made at the first `route()` of a page that was born of a redirect of the frame less than 5 s before (`bootedBySelf`); a change of address made in the page is never refused. The start-up
storm detection counts loads of type `reload` only (a redirect loop is `navigate`; the harness `goto`s several times in one tab). Noreg A137 (Pilot ↔ Company four times in a row, nothing stopped),
red on bf27aaec3; A134 (the real cycle: still three loads then the note), N4, N13, N14 green again.


## 10 November 2026 — a launcher started again is found without Shift + F5 (SOG-0215)

The user: « quand le lanceur revient, il faut shift + f5, alerte cartouche rouge « application dépassée - recharger », et là ça marche enfin ». Two gaps (the first closed by 65aec52a0, his trial probably on a page older than it):
the page did not know the launcher had gone (state `down`, 8 s watch), and, when it found it again, it **kept the old survey** (`launcherHere`) — so a launcher restarted on a newer version never showed the cartouche. Now `probeLauncher`
replaces the survey when the stamp, the version, the host or `data` / `dataGit` / `lan` differ (wiring redone with `loadDevice` only when `data`, `dataGit` or `lan` changed), repaints the status and the version, and is called every
minute and at each return to the foreground (a restart between two passes). Pairing of other devices is the launcher's own state (read from it again, not kept on the page). Noreg A138, red before (the cartouche never appears).


## 10 November 2026 — the launcher's content policy survives a file replaced while it is read (SOG-0219 (2))

`csp_policy()` (`tools/launch.py`) read the dates of the files it depends on with « exists » then « getmtime » (a race) and listed the modules from `frame/app.js`: while an alignment of the folder replaced the file, a
`FileNotFoundError` fell on the request. Now `_mtime` reads once (0 when the file is not there) and the whole read is guarded: a read that fails keeps the previous policy (tried again at the next call); with no previous one, the base policy with
no added site (the strictest). Never a wider policy on a failure. Noreg K154, red before (`FileNotFoundError: config/repository_tree`). The launcher must be restarted to take it.


## 10 November 2026 — « 3 conflits aujourd'hui » (SOG-0136 refused): what they are and how they resolve

The user, 16:07: « 3 conflits ». What the frame keeps and shows:

- **Which files, when**: the conflicts screen (`#conflicts`, the sync button) lists each kept conflict with its file, its time and its side; the page diagnostic (Settings › About › Diagnostic, the JSON he pastes) now has
  **`conflictList`** — path, time, side, seen, the ten latest, never the content — beside `serialWrites` and `page.reloads` (bench A53). The frame cannot read the list from here (it lives in the user's IndexedDB): the three
  lines are in his next diagnostic.
- **Most probable cause**: the current flight rewritten every 4 to 6 s by two modules (SOG-0209, fixed by the write guard 0d78257f0 and the writers' own fix): `current_flight.json` is a *whole* file (never merged by key), so each
  crossing of two writes that both left a pass is one conflict, the newest by instant wins and the other is kept whole. To be confirmed by the paths in `conflictList`.
- **How they resolve without any loss**: nothing is lost at the time of the conflict — the winner is the newest version, the loser is kept entirely (« Reprendre » on its card puts it back as a file, and the next pass sends it). They only count
  until seen: **« Tout marquer comme vu »** (A92) clears the old ones of a device in one tap, « Vu » one by one. Once the writers no longer loop, new ones stop.


## 10 November 2026 — the airline in the header: the user's counter-proposal (SOG-0213)

The first form (airlines in the application selector, the chip always there) was put to the user as a question (« si c'est une mauvaise idée dans l'entête, dis-le »); his answer: « oui pour ta contre-proposition ». Final form: **one control, one role** —
a chip (`#fCo`, a button beside `#fApp`) with the code of the device's airline, **only when at least two airlines exist** (« Personnel » counts: so as soon as an index exists; not for the legacy `default`); a tap on it opens the list of the
airlines as radio buttons (seven at most, name and kind from `frame/lib/mission_categories.js`); a choice is `FrameData.setAirline`, the existing event updates the screens; **nothing in the application selector**. `ctx.workAirline(code)`: the module says which airline its
work is for; when it differs the chip reads `ITF ≠` and the tooltip says which is which — nothing is rewritten (SOG-0181). Space: the cartouche and the sync state come first; `fitStale` shows the chip, tries the cartouche's three steps, and hides the chip only if none fits
(measured: at 390 the sync state is not in the header, the chip sits beside « Recharger »; at 768 it sits before the long « Hors ligne · 11 en attente »). Class names `f-hco*` (`.f-co` is Settings' airline row). Noreg A139 (list, mark, seven at most, no index → no chip; captures 390 / 1280 written by the case) and A141 (cartouche + long sync state, no overlap at 390 / 768 / 1280).

## 11 November 2026 — SOG-0235: airline/index.json served older than the device's own tree

The user's device: `docs['airline/index.json']` = the revision BEFORE the commit of 10/11 11:19 (ITF alone, `at` 22:14:48Z, eleven seconds after a sync commit), `meta.remote.tree` = the new one (ITF and DEFA, read 22:15:09Z), nothing pending:
DEFA gone from the list, the assistant refusing to recreate it.

- **Cause (proved by the bench scenario, red before)**: `fetchOne` — the lazy read of a file not in the cache — reads the revision it finds in the tree known at its START, then writes `docs` with that revision when the (slow) read ends.
  A pass that ran meanwhile has already written the newer copy and the newer tree: the late write put the OLD revision back over it, with `at` = the end of the read. Nothing noticed afterwards: a pass only touches the paths that differ between two trees, and this one did not.
- **Fix 1, at the write** (`fetchOne`): after `T.read`, a copy written since the read started (`at >= startedAt`) with another revision is handed back as it is, never overwritten; a tree that moved while reading makes it read the revision of today (once). The abandoned read keeps its old rule (its own value, nothing written).
- **Fix 2, the invariant at the read** (`staleCopy`, in `read`): a document with nothing pending, of a remote transport, whose revision ≠ the tree's and whose `at` ≤ the tree's `at` (written before the tree was read) is read again — even without `wait` — and the new copy replaces it; offline, the kept copy is served. A copy written after the tree
  (a pass finishing before it stores its tree) is never judged stale. A backup restored by `load` in « replace » mode carries `restored: true` and is the device's own until its next pull.
- **Self-repair**: nothing to run on the device — its next read of `airline/index.json` finds the revision ≠ the tree and reads it again (DEFA is back); the assistant then finds it.
- **« (encore ?) »**: any lazily read document (references, logo, airline files…) could have been put back to an older revision by the same race; the invariant repairs them all at their next read.
- **The 89 conflicts**: the versions kept when two writes of a file crossed (`current_flight.json` rewritten every 4–6 s by two modules, SOG-0209, is the likeliest source; `conflictList` of the diagnostic names the paths). Nothing is lost at the time (the newest wins, the other is kept whole, « Reprendre » puts it back); the count only falls when they are seen
  (« Tout marquer comme vu »). New: the ones SEEN more than 30 days ago are dropped at the first pass of a load.
- Noreg: bench A53 (frame/store/test): the late read, the poisoned copy (healed, a pending write never judged stale), the conflicts purge.


## 11 November 2026 — challenge à rebours of the frame: two proven risks, fixed

(The five risks the file allows are listed in the report; only the two below are proven by a red case.)

- **R1 (data layer): the write guard without `navigator.userActivation`.** `holdSerial` took the gesture from `navigator.userActivation.isActive` only: a browser without the API (Safari before 16.4, old Android WebViews) always counted `act = false`, so a
  user's own A B A B (a box ticked, unticked, ticked) within 30 s became a « series » and its event and synchronisation waited up to 30 s (the Map beside Fuel lagging). Proof: bench A53, scenario « a browser without userActivation » — 3 of 10 writes announced before, 10 of 10 after.
  Fix: `gesture()` = `userActivation.isActive` when the API exists, else the last `pointerdown` / `keydown` / `touchstart` seen by the layer (5 s). No change where the API exists.- **R2 (ctx.net): an abandoned relayed call held its place.** `relayTake` ignored `init.signal`, and the relay `fetch` did not take it: a Weather grid left for another screen kept two places of its host (and up to 15 s of the launcher's four) for calls nobody waited for; the next screen's calls queued behind them or came back « busy ».
  Proof: noreg A145 — the abandoned call answered at 1.5 s (the slow launcher's end) before, at once after, one abandoned while waiting never reaches the launcher. Fix: `relayTake(host, signal)` leaves the queue on abort (null → `offline: aborted`), the relay `fetch` carries the signal (AbortError → `aborted`). The launcher finishes its own call; the next place meets « busy » and replays it as designed (SOG-0198).


## 11 November 2026 — SOG-0231: « Flotte » in Company, « Fiches » alone in Maintenance (navigation only)

The user: « 2 entrées » of Company (no fourth application). Done in the frame (`APPS` in `frame/app.js`) once Features SOG's `modules/aircraft` could open on one view (`meta.apps: ['maintenance', 'company']`, `ctx.consume('view')`, f8e769d9b):
- a module entry of an application may carry a **`query`** that opens its module on a view: the rail's link, the phone bar's target (`tabTarget`) and the bar's menu rows follow it;
- **Company** gets « Flotte » (`#aircraft?view=fleet`, the fleet of the current airline, said in the title; level 3 like the module) and its phone tab; **Maintenance** keeps « Fiches » (`#aircraft?view=sheets`), no longer « Appareils » (which also named the paired devices: « Appareils connectés », A143);
- **« Registre des missions » has no screen** (the registry is a data index, the Missions list is its derived view): nothing coded; the entry waits for the ergonomist's design;
- the intro manuals of Company and Maintenance say it (×4). Noreg A146 (the entry says « Flotte » / « Fiches », opens the module on its view alone, no entry called « Appareils »).
- Found on the way, not mine: `modules/data/follow.js:412` throws « Cannot read properties of null (reading 'ctx') » at the mount of Données in Maintenance in A146's setting (`pageerror`); reported to Settings.

## 11 November 2026 — vocabulary: « aéronef » for an aircraft (SOG-0242)

The user: « 11 aéronefs ». In French an aeroplane or a helicopter is an « aéronef »; « appareil » stays the phone, the tablet or the computer (« Appareils connectés », « sur cet appareil », « Compagnie de cet appareil »). The frame's own texts were read one occurrence at a time
(no global replace: both meanings coexist in `frame/app.js`, all of them the device's): three said « appareil » for an aircraft — the missing aircraft type (`frame/lib/external_links.js`), the V2 page of the aircraft (`frame/legacy.js`) and the introduction of Maintenance. The tutorials and the module chapters
assembled into the manuals (Fuel, Fleet, report) are their sessions' texts (Features SOG). Static case I41.

## 11 November 2026 — `labs/` archived (SOG-0152, « archiver »)

`labs/` (the primitives demo page, the availability timeline example, the first Atmosphere mock-up, old mobile test pages) moved by `git mv` to `_archives/2026-11-11_labs/`, a `DEPRECATED - 2026-11-11.md` in it. Checked: `tools/build_pages.py` publishes the tracked files minus `SKIP` — `_archives/` added; `.github/workflows/pages.yml` calls it
and lists nothing; `tools/publish_dist.py` (version archive) excludes `EXCLUS` — `_archives/` added, and the dispos package, which shipped `labs/dispos_timeline.html` as its example, reads it from the archive (its `../shared/…` script paths are rewritten by the package, not by the page).
The only live reader of `labs/` was the Administration card's « Primitives et designs » link (Settings' `admin_links.js`): removed, with its sentence in the help (×4) and in the Settings SPEC — the page cannot work from a deeper folder (`../frame/…`). The docs that cite it follow (`docs/technique`, `frame/design`, the agents' notes).
Left as history: `docs/CHANGELOG.md`, the cloud journal, the specification, and the Atmosphere module's notes (`modules/atmosphere/DECISIONS.md`, `ROADMAP.md`, a comment of `atmo.js`: BUGS SOG's files). Static case I42.

## 11 November 2026 — one floating note at a time on a phone; the welcome card once (SOG-0131, the user's answers)

- **One floating note at a time on a phone** (`notify` in `frame/app.js`): at 390 px two notes stacked covered a third of the screen (captures D173, L68, A142). Up to 760 px a single note is shown; the others wait in a queue (eight at most, the same key replaces its queued note) and the next appears when the shown one is closed or leaves;
  **an error goes in front of an information**, which takes its place back at the head of the queue. Above 760 px the notes stack as before. Notes with an action stay until the click, as before, **but never block the queue** (the ergonomist's review, 11 November): a note that arrives takes the place of the shown action note (unless it has an action too, then it waits), which comes back when no other note waits, so an information, a success or an alert asked behind it is always shown. The cap of eight drops **an information first, then a success, then an alert — never an error nor an action note** (the queue may exceed eight rather than lose one). The test bench keeps two lists: `window.__notes` (asked) and `window.__shown` (put in the page). Noreg A151 (390 and 1280, `A151_note_390_delivered.png`, `A151_action_390_delivered.png`), red before.
- **The welcome card once** (« Première fois ? Commencez par un tutoriel court », `frame/help/help.js`, placed by `moduleHelp`): it is put on the **first screen opened** and never again on the next ones nor after a reload (it was shown on every module until closed or a tutorial opened); the tutorials stay at the top of the help.
  `SogHelp.seen(ctx)` writes `device/help.json › welcomed` when the card is inserted. It is the frame's card (not a module's): Features SOG has nothing to change. Noreg A152, red before.
- **The log of the cases**: every notification is announced at its call by the window event `frame-note` (`{ text, kind, key, label }`), whether it is shown at once or waits its turn; `tests/v3/lib.py` builds its `window.__notes` from it (it used to watch the DOM, where a note that waits does not appear).
  Cases adapted to the rule, not to a fault: A62 (one note on a phone, the other waits), A65 (the note comes back once the shown one has left: 20 s on a phone), `clear_notes` of the aircraft cases (closes the shown note until the queue is empty).

## 12 November 2026 — `cacheOnly` never goes out (SOG-0092)

`forecast()` (under `grid` and `aloft`) began with `run(model)`, which asks Open-Meteo for `meta.json` when the run time is neither in memory nor in the reserve under 10 min: a `cacheOnly` call (the Map's section, the weather layer) made a network call. In `cacheOnly` it now reads `knownRun(model)` (memory, then reserve, nothing asked); an unknown run gives the blind 30 min validity of `fresh()`. Bench A25: no outgoing call with an empty reserve; a warm reserve in a new process is served without any call.

## 12 November 2026 — the launcher client hands on `running` (SOG-0245)

The Settings session needs the card « another operation is in progress » to say which one: the launcher's 409 « busy » carries `running` (AeroDB contract 8494deb47). `call` and `upload` kept only `reason` / `wait` / `expected` of a refusal, so `running` never reached the page. Their patch is applied (reviewed): `runningOf` returns a **closed set** of fields with bounded types (short words `[a-z0-9_-]`, finite numbers, `alive` among four words, `step` a 120-character text without control characters, `cancelling` strictly `true`, `args` reduced to `zones` (12 at most), `icao`, `action`), and **nothing** when the `id` is not a readable word, when `running` is not an object, or when it is an array. The page cleans it again on its side (`M.runningOf`), so this helper stays narrow. Bench A29 (+6 checks): a good `running`, hostile fields and extra keys, wrong types, text and array instead of an object, a missing or unreadable `id`, and the same through `upload`; red before.

## 12 November 2026 — SOG-0235 (DEFA missing): the display is not at fault

The ergonomist read the user's device on 12 November (read only): `airline/index.json` carries `itf` and `defa`, the settings and the fleet of DEFA exist, nothing pending, no conflict, level 4. Noreg **A155** puts exactly that state (itf « AIR INTER VA » kind `va`, defa « DEFA Virtual » kind `sog` with IVAO only and an empty fleet, perso, level 4) and reads the three places that list the airlines — the header list, Settings › Company, `FrameData.airlines()` — at both widths: **all three show the three airlines**; nothing filters DEFA out (not the kind, not the networks, not an empty fleet). The case is green before and after: it holds the chain, it does not prove a fix. Most probable story of the 11 November evening note: the device then held an `airline/index.json` older than its tree (the defect fixed by 160881cb7, healed on the next read), and the page of that moment still ran the code before the fix (the update reaches a page only at its reload). If DEFA is missing again on a device whose index carries it, the next reading is « Copier le diagnostic » on the Data screen taken **before** any reload.

## 12 November 2026 — a screen that cannot be loaded says why (SOG-0267)

The user: « la roadmap est cassée. « module roadmap impossible à charger ». c'est bien pour le user final, mais moi je ne sais pas comment t'aider à diag. » The ergonomist's reading: nothing was broken, his launcher on port 8000 was **stopped**; the page stayed displayed from its cache and a screen not yet visited could no longer load.
- **`loadFailed(box, id, e, href)`** (`frame/app.js`), used by the three loading failures: the scripts of the help, roadmap and recette screens (`showDoc`) and the import of a module. It asks the address again (`fetch`, no cache) to learn the **answer**: a network error, or the service worker's `503` + `x-sog-offline` (no copy kept and no network) both read « no answer »; any other status is given as it is.
- **The cause is said**: no answer from a page that comes from a local address (`localhost`, `127.0.0.1`, `[::1]`) or while the launcher is known stopped → « The launcher of this computer no longer answers: restart lancer.cmd. The « roadmap » screen will load by itself when it is back. » ; no answer while the device is offline → the network message ; anything else → the former message with the exact error.
- **The card is the page's** (`data-loadfail="launcher|offline|error"`, `role="alert"`), no longer a floating note that left after twelve seconds over an empty page. Behind **« Details »**: screen, requested address, answer, error, launcher state, page, network state, time (no key, no path of the user's files); **« Copy the diagnostic »** copies them; **« Retry »**.
- **It loads by itself**: every five seconds while the card is on screen and the address unchanged, and at the event `frame-launcher` (`up`), the card asks the address again and routes again when it answers. A failed module import is remembered by the browser for that address until a reload: the module is asked again under a new address (`?retry=<time>`).
- **Points 3 and 4 of the file**: (3) the status chip already says « launcher stopped » as soon as a launcher that was known stops answering (SOG-0208, `frame-launcher`, A132/A138); a page opened while the launcher was already stopped does not know one, hence the card above. (4) `help/roadmap.js`, `help/roadmap.json`, `help/recette.js`, `help/recette.json` and `help/help.js` **are** in the service worker's list (`frame/sw.js`, line 33): a worker installed since the roadmap exists keeps them; the stopped launcher met a worker or a copy older than that.
- Noreg A158 (never visited screen cut, card, details, copy, no floating note, loaded by itself; the same for a module), red before.

## 12 November 2026 — SOG-0235 on the PHONE (published site, no launcher, GitLab): what was examined, what the diagnostic now says

The user: « defa disparue sur TÉLÉPHONE, via pages.github ». The data repository does carry DEFA (the ergonomist read it: `airline/index.json`, `airline/defa/settings.json`, `airline/defa/fleet.json` tracked, on `origin/main`); the published site serves the code with 160881cb7. The phone path — GitLab provider with a project token, no launcher, background service — had never been replayed. Examined, in his order:
1. **Is the tree read in full?** The GitLab transport reads `repository/tree` 100 entries at a time by keyset pagination, following the `Link: rel="next"` (on the instance's own API only). Bench A38 now reads **a tree of 10 444 files, as large as his (10 441 on 12 November), in 105 pages** and finds `airline/defa/settings.json`, `airline/defa/fleet.json` and `airline/index.json`: nothing is cut by the frame's reading. What the real GitLab API does beyond that (a limit on the number of entries of a recursive tree, a rate limit answered with 429 in the middle of the pages) is **not provable from here**: a page that fails makes the whole read fail (the device keeps its older tree, and the failure is in the diagnostic's `failures`).
2. **What a pilot's project token sees of `airline/`**: GitLab project tokens have no path scope: a token that reads the repository reads `airline/`. Not provable here either; the diagnostic says what the device actually got.
3. **The kept index on a device that did not reload**: the defect fixed by 160881cb7 (a document older than the tree is read again) lives in the page's code: a phone whose page still ran the previous code (the update reaches a page at its reload) kept serving the old index. A155 holds the chain for the right data.
4. **A155 replayed without the launcher**: the transport bench A38 plays the GitLab provider with no launcher and a paginated tree (above); A155 plays the screens on the exact data.
- **New in the diagnostic** (« Copy the diagnostic », Settings › About, from the phone): `treeRead` (the last read of the tree: commit, pages, entries, files, time) and `airlines` — the index in the kept tree and in the kept document (revisions, pending write, **stale** = the copy is older than the tree), the codes it cites, and, for each, whether its `settings.json` and `fleet.json` are in the tree; never a content. With it a phone that loses DEFA says in one reading whether the tree lacks the files, the index lacks the code, the kept copy is older than the tree, or the tree was read in part.
- Noreg A38 (large tree), A155 (the diagnostic's airlines block).

## 12 November 2026 — SOG-0279, survey and contract: what is written, what triggers a commit, the cadence (no code yet)

The user: « on n'écrit pas 10 commits. un seul, toutes les 5 mn. ou sur demande de synchro. on n'écrit que les modifications (flotte, base, etc.). pourquoi aller écrire le FPL ? ou le statut de la page en affichage ? Ou même, les settings d'affichage ». His answer on Q-0035: **the current flight stays synchronisable, but only on a gesture (« Send this flight to my devices ») and in the grouped send; never at each touch-up again.**

**1. What is written, by whom, how often** (read in the code and in the data repository, 9 to 12 November: 527 commits, 340 of them `pilot/RBR/current_flight.json`, 335 on 10 November alone)

| document | content | writer | rhythm | today |
|---|---|---|---|---|
| `pilot/<tri>/current_flight.json` | the flight (route, level, aircraft, quote, winds, derived sections, progress): **data of the work in progress** | Fuel (`saveFlight`: 35 call sites, 300 ms debounce, merged by `FUEL_FIELDS`), Map (the real position, `quiet`, every 10 s while flying), Report (resets `started` / `progress` when the report of a flight is saved) | every touch-up of route, level, aircraft, quote, date, mission; position every 10 s | synced, one commit per quiet 2 s |
| `pilot/<tri>/fuel.json` | quote settings (`taxiMin`, `reserveMin`, `contingencyPct`, `isaDev`, `goal`, `entries`) **and display settings** (`displayAlt`, `displayDist`, `displaySpeed`, `displayUnit`, `wxRadiusNm`) | Fuel (`saveSettings`, 10 call sites, deferred) | a setting changed | synced, one commit per quiet 2 s |
| `pilot/<tri>/site_log.json`, `pilot/<tri>/hello.json` | the pilot's site log; the hello module's test record | Website, Hello | on use | synced |
| `pilot/<tri>/airline/perso/settings.json`, `fleet.json` | the pilot's personal airline | Settings › Company, Aircraft | a gesture | synced (rare) |
| `pilot/handoff.json` | the hand-over between Report and Flight log | Report, Flight log | a gesture | `cache` policy: never sent |
| `airline/<code>/…`, `airline/index.json` | the airlines and their fleets | Settings, Aircraft | a gesture | synced (rare) |
| `missions/…`, `cr/reports/…` | missions, reports | Missions, Report | a gesture | synced |
| `cache/<module>/…` (Fuel `ui.json`, `last_aircraft.json`, `last_ofp.json`, `route_alts.json`; the caches of Map, Weather, Data, Report, Flight log) | screen state, last choices, proposals | the modules | any | **`cache` policy: on the device, never sent** (already right) |
| `device/*.json` (level, design, layout, help, roadmap, recette, airline choice…) | the device's own choices | the frame | a gesture | device only (already right) |

**2. What triggers a commit and a send today**
- **Page side**: every `put` stores the write in the device's pending queue at once (IndexedDB: durable). The launcher transport is declared `quick: true`: `soon()` then runs a pass `{ reason: 'write' }` **2 seconds after the last write** (`guard.soon`), which posts the pending writes in one `__setup/batch` call.
- **Launcher side**: `__setup/batch` writes the files into `data/` **and commits them** (« RBR : n fichier(s) — paths »): **one commit per batch, i.e. one per quiet 2 seconds of typing**, hence the hundreds of commits of 10 November.
- **The exchange with the remote repository** (pull, merge, push: `__setup/sync`) is separate and slow: every 10 minutes in the background (`EVERY`), on « Synchronize » (a gesture), at start and when the network returns. It is not what multiplies the commits.
- The launcher's own jobs commit their outputs separately (« Procédures LFRS lues… »): not touched here.

**3. Contract proposed** (decided by the user: Q-0035 and his words above)
- **Three classes of document**, by path, **in the frame** (no change in the declarations of the modules: one table in `frame_data.js`):
  1. **Data** (`airline/`, `missions/`, `cr/reports/`, `pilot/<tri>/` except the two below, `sia/`…): written locally at once; sent **grouped**.
  2. **Held** (`pilot/<tri>/current_flight.json`): written locally at once (every module sees it at once: the pending copy is served first), **never sent by the automatic send**; sent by its own gesture « Send this flight to my devices » (`FrameData.sendNow(path)`) and by « Synchronize ».
  3. **Device** (`cache/…`, `device/…`, and the **display settings** moved out of `fuel.json`): never sent (the `cache` policy that exists).
- **Cadence of the grouped send**: the timer starts at the **first** pending change (no longer reset by each write) and fires **five minutes at most** later; it also fires on « Synchronize », when the page is hidden or closed (`visibilitychange` to hidden, `pagehide`: a best-effort send, the queue being durable nothing is lost if it does not leave) and at the next opening. **One commit for everything that changed.** The 2-second `soon()` goes. The pull still runs every ten minutes; a gesture still pulls and pushes at once.
- **Migration without loss**: `displayAlt`, `displayDist`, `displaySpeed`, `displayUnit` and `wxRadiusNm` move from `pilot/<tri>/fuel.json` to `cache/fuel/display.json`: at its first read the device copies the values it finds in `fuel.json` when the device document is absent; Fuel then no longer writes them to `fuel.json`; the keys already in the repository are left and disappear at the next write of `fuel.json` (which is then smaller). No value is lost, none is invented. (Fuel's side: Features SOG, one declaration and the order of reading.)
- **The held flight, three behaviours** (the user chose the gesture; the other two are one table entry each): (a) **gesture only** (chosen); (b) automatic with the grouped send, every five minutes; (c) never (device only).
- **What it costs**: the file in `data/` is up to five minutes older than the device's copy (nothing else reads `data/pilot/<tri>/current_flight.json` from the disk in the suite: no launcher job, no V2 page); a phone sees the flight only after the gesture; a crash loses nothing (the queue is on the device).
- **Order of work** (not started): (1) the table, the grouped timer and the held class in `frame_data.js`, with the test bench and a noreg case (ten writes in a minute: no commit, then one on the timer or on the gesture); (2) `sendNow` and the Fuel gesture (Features SOG); (3) the migration of the display settings (Fuel); (4) the guard of SOG-0136 (the revisions this browser pushed), still useful afterwards.
- **The launcher between the pull and the send** (SOG-0136, point 4): when the launcher commits into the local repository between the page's pull and its send (a procedures job, 14 s before in the 11 November case), `T.commit` refuses (« the branch moved »), the page pulls again and pushes again: the existing loop. It must not make a conflict on a file the launcher did not touch (the remote revision equals the base): the case will be written with the SOG-0136 lot.

## 12 November 2026 — the left bar in three steps (SOG-0274)

The user, seeing the mock-up of the Data screen: « prévoir de réduire la barre de gauche (conserver les icônes uniquement) comme premier niveau de rétrécissement. puis bascule en mode téléphone. »
- **Three steps by the width of the window**: (1) **from 1100 px**: the whole bar, icon and label (210 px, as before); (2) **761 to 1099 px**: a **rail of icons only, 56 px**: the active screen stays marked (the accent background), the label is the **tooltip** (`title`) and the **accessible name** (the text is hidden for the eyes with a clip, not removed), the separators are kept, « Old pages (V2) » is reduced to its icon; (3) **760 px and less**: the phone mode of today (the bar at the bottom).
- **Why 1100 px**: with the whole bar the content has `width − 210 − 32` px (857 px at 1099 px) and a two-column screen (the map and the card of the Data screen, two columns of about 420 px) has no more useful width; with the rail it has 1011 px. Placed on the real screens at 1099 and 1024 px (captures `A159_*_1024_*`): Pilot and Maintenance, no horizontal scroll.
- **The window wider than tall and under 1024 px** is a phone turned (`html.f-land`, SOG-0090-era rule of the landscape rail of the tabs): its own rail (the five tabs), unchanged; the new rail concerns the desktop windows of 1024 to 1099 px and the narrow tall ones (761 to 1023 px, portrait). Said so that nobody looks for the 56 px rail at 900 × 700.
- **Material keeps its own rail** (88 px, the label under the icon: its grammar already is a rail on a screen); the three steps are the other designs'. Noted: the choice is the design's, the phone mode is the same.
- **What the Data screen's session needs to know** (Settings redoes it locally): the markup of the bar entries is `<a … title="label"><svg class="f-icon">…</svg><span class="f-nav-lab">label</span></a>`; the rail sets `--f-nav-w: 56px` on `:root` between **761 and 1099 px** (`@media (min-width: 761px) and (max-width: 1099px)`) and the page grid reads `var(--f-nav-w, 210px)`; nothing else is posed on the frame. A screen of two columns should use **container** queries on its own width (`@container`) rather than window queries, so that it follows the rail by itself.
- No button to force the rail in this batch (the ergonomist: « à voir ensuite »).
- Noreg A159 (Pilot and Maintenance; 1280: 210 px with labels; 1099, 1024, 900 × 1200, 761 × 1200: 56 px, label hidden but in the tooltip and the text, icons in one column, one entry marked, V2 last with its separator; 760: phone mode; no horizontal scroll; the five designs, Material its own 88 px); captures `A159_<app>_1280_<design>_delivered.png`, `A159_<app>_1024_<design>_delivered.png`.

## 12 November 2026 — SOG-0279 (1): the grouped send, the held flight, what the chip says (the ergonomist's GO)

Done as the contract above says, in the data layer:
- **Grouped send** (`frame/store/frame_data.js`): the 2-second `soon()` (one commit per quiet moment of typing) is replaced by a timer started at the **first** change that waits and **not re-armed** by the following ones (`guard.group`, five minutes); it fires `sync({ reason: 'write' })`, which sends everything that changed in **one** commit; it goes out as soon as nothing ordinary waits any more. The page also sends it when it is **hidden or closed** (`visibilitychange`, `pagehide`: best effort, the queue is durable). Only the launcher transport (`quick`) arms it; the background pass every ten minutes is unchanged.
- **Three classes by path** (`isHeld`): data (grouped), **held** (`pilot/<tri>/current_flight.json`: written at once and served first to the modules, **never** sent by the grouped send nor by the background pass), device (`cache` policy, `device/`: never sent). A held document leaves with `FrameData.sendNow(paths)` (« Send this flight to my devices », Features SOG) and with « Synchronize » (reason `manual`).
- **`FrameData.sendPending()`**: sends everything that waits (the held flight apart) and returns when the pass is over, never an exception. **Where it is posed, before a launcher job** (point (a) of the ergonomist): the launcher client (`frame/lib/launcher.js`) takes an option `before`, called and awaited at the start of `job()`; the frame gives it `() => FD.sendPending()` when it builds the client (`launcherClient()` in `app.js`): every job of every module and screen (build, update, publish, imports, any `regen` verb) starts after what waited has left; a send that fails does not block the job (it starts with what `data/` holds). Bench A29 (+2: `before` is called first, a failing `before` does not block).
- **The status chip says it** (`syncState` in `app.js`): « 3 changes to send · in 4 min » (« in a moment » under a minute), redrawn every fifteen seconds while the timer is armed (written only when the text changes); the tooltip adds « Current flight: on this device (sent by “Send this flight”) » when a flight is held. A click is « Synchronize »: everything leaves at once, the held flight too (it is a gesture). `status()` gains `held` (the flight kept) and `nextSendAt` (the instant of the grouped send); `pending` counts what leaves with the group; `queue` rows carry `held`.
- **Noreg**: the bench of the data layer (+1 scenario: ten writes in a moment → no commit, the status says ten waiting and one held with the time, then **one** commit for the ten, the flight not in it, `sendNow` sends the flight in one more commit, `sendPending()` sends what waits at once; the five scenarios that wrote the current flight now ask for its gesture), A160 (the chip, the tooltip, no commit while the writes pile up, the click sends everything in one commit).
- **Still to do** (the contract's order): (2) `sendNow` and the Fuel gesture « Send this flight to my devices » (Features SOG), (3) the migration of the display settings out of `fuel.json`, (4) the guard of SOG-0136 (the revisions this browser pushed).

## 12 November 2026 — Company: the « Registry » entry (Features SOG)

The register screen of the missions is on origin/v3 (`#missions?view=registry`, the module reads `ctx.query`). The Company application carries an entry « Registre / Registry / Register / Registro » (`query: 'view=registry'`, the same module as « Missions ») and, on a phone, a view of the Missions tab (as « Fiches » is a view of Pilot's Prepare tab). Two entries of one module are told apart by the view of the address: only one is marked (`menuView`, `data-view`); a module with a single entry still needs no view. Noreg A161.

## 12 November 2026 — « phone turned » is a phone's HEIGHT, not only a width under 1024 px (SOG-0274, the ergonomist's decision)

The ergonomist: with `f-land` taking every window wider than high under 1024 px, the new icon rail only lived between 1024 and 1099 px for a touch window, and the user's request (« réduire la barre de gauche comme premier niveau de rétrécissement, PUIS bascule en mode téléphone ») was not served. New rule (`landNow` in `app.js`, the same in `index.html` before the first paint): `f-land` = wider than high **and** under 1024 px **and no higher than 500 px** (and no precise pointer that hovers, and a screen orientation that is not portrait, as before). So: **900 × 700 → the 56 px icon rail** and the content in full width; **844 × 390 → the phone turned** (its own rail of tabs, unchanged: A14); **760 × 900 → the phone mode** (the bottom bar). What it moves: `f-land` is read by the landscape rail of the tabs and the sheet column (`frame.css`, `design/primitives.css`), `deskNow` (`f-desk`: the computer's layout is `innerWidth > 760 && !land`, so a touch window of 761 to 1023 px that is higher than 500 px now takes the computer's layout and Aqua's texture instead of the phone's rail), and the popover of the tabs (`app.js`, the landscape branch). A mouse never had `f-land` (a computer's window keeps the left bar), unchanged. Noreg A162; A14, A42 and the landscape cases of the Map unchanged and green.

## 12 November 2026 — SOG-0277: tokens that expire (GitLab only, first batch)

The user: « on envoie un token pour les utilisateurs, et pour soi-même. penser à le renouveler. avoir une alerte ». The suite never keeps a token, so the alert rests on the DATE the provider gives, never on the token.
- **What GitLab gives** (read in its documentation, 12 Nov): `expires_at` (YYYY-MM-DD) at the creation and in the list of a project access token, and in `GET /personal_access_tokens/self` for the token that calls (what `whoami()` already reads). A token stops at 00:00 UTC of its date. A 401 is the same answer for an expired, a revoked and an unknown token: « expired » is said only when the known date is past; otherwise the wording stays « refused or expired ».
- **What GitHub gives**: a `github-authentication-token-expiration` header, absent from the `Access-Control-Expose-Headers` list of its CORS documentation (a page probably cannot read it), and no endpoint for the date. Not in this batch; the only sure way would be a date typed by the pilot, said « declared ».
- **Where the date lives** (`frame/lib/token_expiry.js`): the pilots' tokens screen reads the list from GitLab at each opening, nothing stored; the maintainer's chip keeps `{ soon, expired, nearest, at }` and the pilot's own token `{ expiresAt, at, toldOn }` in the device storage (`sogFrame:tokenExpiry`), read back with distrust (dates and bounded numbers only), never in the data repository (any pilot reads it) and never a name or a token. A refresh is due once a day at most: `whoami()` for the own token (also at « Test », at the saving of the access and at the join), `gitlab/tokens/count` of the launcher for the pilots' tokens (it already holds the administrator's token; the answer is numbers and one date).
- **What is said**: the list, « expires on … · in 12 days », amber under 30 days, red under 7 and once expired; the Status block (`token-own`, `token-pilots-soon`, `token-pilots-expired`) and, for the own token under 30 days, one floating note a day. The pilots' lines only on the workstation. Not in this batch: GitHub, the rotation (`POST …/rotate`, which has to be tried before it is offered).
- Cases: A170 (the module), A39 (the list), A171 to A174 (the Status block, the note, the far date, the 401), I32 (the launcher's counts).

## 12 November 2026 — SOG-0136 (4): the revisions this browser pushed, and what the diagnostic says (the ergonomist's GO)

Conflicts « the version of another device » on `pilot/RBR/current_flight.json` and `fuel.json` while the user is alone: the evidence (one author identity, conflicts at the hour of his own writes, the launcher and the page in the same repository) says the workstation fights with itself; the exact mechanism is not provable from outside the browser's store. Two guards and one instrument, so that it is settled and harmless whatever it is:
- **The revisions this browser pushed** (`notePushedRev` in `applyPushed`): the ten last blob revisions pushed for each path (200 paths at most), in `meta « pushed »`. At the pull, a « remote » version whose revision is **one of them is not another device** — it is this browser's own earlier version coming back: **the local write wins and no conflict entry is made** (`own`); the pass counts it (`ownSeen`: how many, the last path and time) so that nothing is hidden.
- **A real other device still makes a conflict, nothing is lost**: a revision this browser never pushed is foreign; the entry keeps the lost version whole as before and now carries **`lostRev`** (its revision) and **`origin: 'foreign'`** (`'unknown'` for the entries made before this memory).
- **The diagnostic says it** (« Copy the diagnostic »): `conflictList` rows gain `origin` and `lostRev`; `ownVersions` = `{ n, path, at }` — how many of its own earlier versions the browser has seen coming back and ignored. With the next occurrence the reading says whether the conflicts were the browser against itself (`ownVersions.n` grows, no entry) or someone else (`origin: foreign`).
- **The launcher committing between the pull and the send** (the 11 November case: a procedures job 14 s before the page's send): `T.commit` refuses (« the branch moved »), the page pulls again and pushes again; the bench plays it with an unrelated file committed in between: **no conflict on a file nobody touched**.
- Bench (the data layer, +1 scenario, 5 checks): its own earlier version coming back (no conflict, the local write leaves), the diagnostic's count, a foreign version (one conflict, the lost version whole), its revision and origin in the diagnostic, an unrelated commit between pull and send. Red before (4 of the 5), green after.

## 12 November 2026 — SOG-0279 (2): `adapter.sendNow` for the module's gesture

`FrameData.sendNow(paths)` existed in the data layer but the adapter a module receives (`ctx.data`) did not expose it, so Fuel could not put « Send this flight to my devices ». The adapter now has `sendNow(paths)`: **bounded to the module's declared writes** (a path outside them is refused with the same error as a `put`: « may not write … (not in its declared writes) »); for Fuel: `pilot/<tri>/current_flight.json`. It sends the held document(s) at once, together with whatever else waits, in one commit. Bench (+1 scenario): the flight stays on the device through a module pass, `adapter.sendNow(path)` sends it, a path outside the declared writes is refused.

## 12 November 2026 — SOG-0266: one Open-Meteo call at a time, a pause after a 429 (`frame/lib/weather_store.js`)

BUGS SOG's reading of the user's launcher log: fourteen timeouts then six HTTP 429 from the relay to Open-Meteo. Cause: the reads are grouped, but several askers leave together when a route changes (Fuel up to 24 places, the cut of the route, the Weather grid up to 48 places); `spend()` bounds the **weight** per minute and per day, never the **concurrency**, and nothing spaced the retries after a 429.
- **One call at a time** (`omCall`): every Open-Meteo request of the page (the forecasts and the run's `meta.json`) goes through one chain; the next leaves when the previous has answered or failed. A timeout is a failure of the queue like another: the next one goes after it, **not in parallel**.
- **A 429 pauses the queue** — one minute, or what the server's `Retry-After` says (ten minutes at most; `call` now rends `retryAfter` on the marked error). During the pause **no call leaves**: an asker gets at once an error **429 marked `paused`** (with `wait`, the seconds left) and no weight is spent (the check is made before `spend()`); the readers already say a 429 (« limit reached », `status === 429`) and serve their reserve — the cells already kept —, never a retry.
- Bench A25 (+5 checks): four askers at once → one call in flight, all served; a 429 → one call left; during the pause no call, `paused`, nothing spent; a minute later the queue goes on; a `Retry-After` of 120 s keeps the pause past 61 s and ends it after. Red before (four in flight, no pause).

## 12 November 2026 — SOG-0278 / SOG-0249: every V2 page is in « Old pages (V2) » (the V3 part of « V3 by default »)

The user: « on bascule en v3 par défaut. les pages v2 sont toutes accessibles de la v3. » The survey (the V2 pages tracked by git against `frame/legacy.js`, K208 compares them every time):
- **Missing before**: the **fuel performance parser** (`FuelDashboard/index.html`, the « Fuel Phase Monitor » kept at the root: SOG-0249, put in the Fuel group), the **V2 help** (`apps/aide/aide.html`, in Maintenance), the original of the pelican-site check (`apps/outils/pelicandromes/original.html`, in its group), and the **thirty pages of the fifteen mission families** of the V2 report core (`apps/cr/<FAMILY>/…_cr.html` and `…_reporting.html`; FIRE was already in Missions): a new group « Reports by mission family ».
- **Not pages**: `apps/sia/*.html` are address stubs (« Page déplacée », a redirect to `apps/cpco/`): not listed, said so in the case.
- **K208** (static): every `apps/**/*.html` page and `FuelDashboard/index.html` is listed (a stub apart) and every listed page exists; red before (the thirty family pages and the monitor missing).
- **What is not done here, and who owns it** (the file's other points): (1) the root of the published site and the page the launcher opens: the launcher already opens `/frame/`; the published root is `tools/build_pages.py --start frame/index.html` in the publication (the ergonomist's); (3) a link **back to the V3 on the V2 pages**: the V2 navigation is `shared/repository_nav.js` (BUGS SOG's shared layer, not the frame's): a one-line entry « V3 » there serves every V2 page at once; (4) README / install notes saying « V3 »: documents of the ergonomist's release. (5) Nothing is removed from V2.

## 13 November 2026 — the root of the published site sends to the V3 application (SOG-0278, Q-0039)

The user: « La racine renvoie vers /v3/ ; la V3 garde son adresse ; les pages V2 gardent les leurs et restent ouvertes depuis « Anciennes pages (V2) » ». Two facts found while preparing it: the root is the V2 home (the `index.html` of develop) and `/v3/` is the OLD menu of the v3 branch, not the application (which is `/v3/frame/`). The ergonomist's decision: the narrowest form — the root goes straight to `v3/frame/`, `/v3/` is not touched (the user can ask for it later).
- **How**: `tools/build_pages.py --root-only _site --start v3/frame/` writes only the root `index.html` (see SPEC § 3.7), refuses a start that is not a plain relative folder of the built site, erases nothing. `pages.yml` gains ONE step after the two builds (the V2 build empties its folder, so it cannot run earlier); triggers, permissions and the other steps are unchanged.
- **Effects**: the V2 pages and their deep links, `/manifest.webmanifest`, `/sw.js`, `/assets`, `/v3/…` are untouched. The root service worker is network-first with no precache and the installed V2 app starts on `apps/pilot/mes_missions.html`, never on the root: nothing to purge; Pages keeps pages about ten minutes. The installed V3 app (`/v3/frame/`) is intact.
- Noreg K231 (static: a site built in a temporary folder, only the root file changes, the V2 deep page and `/v3/` are byte for byte the same, refusals write nothing, the workflow differs by one step; red before).

## 14 November 2026 — a request limit (429) is waited, said and resumed; the tree is read at a steady pace (SOG-0337)
The user, on his phone: « gitlab 429 sur téléphone. pas de message d'erreur… on réduit donc au minimum. c'est bloquant ». The cause, read in the code: `tree()` read the WHOLE tree again whenever the head moved (10 448 files = 105 pages of 100, back to back); a 429 was recognised nowhere (the screen explained 401, 403, 404; `Retry-After` was not read); the loop threw at the first refusal and started again from page 1 at the next pass — never finished under a limit of fewer than 105 a minute — and `liveTree` swallowed the error: hence the silence. Decisions (T1): (1) **recognised** in the common base (`transport_git.js`, `caller`): a 429, or GitHub's 403 with an empty quota, is `err.rateLimited` with `retryAfter` (the `Retry-After` header, a number or a date, else the reset instant) — `null` when the page cannot read the header (CORS: GitLab exposes `Link`, not necessarily `Retry-After`). (2) **waited and resumed** (`guard`): the transport waits (`Retry-After` when readable, else 60 s doubled each time, between 5 and 300 s) and resumes the SAME call, three times at most before it raises; a response the browser cannot read in the middle of a tree already started (a 429 without a CORS header reads as « network ») is treated the same way, once pages were read. (3) **The tree read resumes** at its page for the same head (`partial`, the « next » link kept) instead of starting from zero; one read at a time per head (concurrent demands share it); and the state (guard, tree read, resume point) is **shared by all the transports of the same repository and token** — the page makes a new transport at each reading of the device's settings, and the wait of one is the wait of all. (4) **Paced**: a pause of 600 ms between two pages of the tree and 80 requests a minute at most (a sliding window) — under the 100 a minute of the free offers. (5) **Said**: the state (`status().rateLimit`: who, seconds left) shows « GitLab limite les requêtes : reprise dans {n} s » in the sync button, its tooltip and the data line of the state block, in the four languages, counting down each second while it lasts (`http429` explains a limit that outlasts the retries); the diagnostic carries the waits, the seconds, the last status, whether `Retry-After` was readable, the quota left and the pace kept, and the tree read says the page it resumed at (`resumedAt`). Noreg A38 (bench: 429 at page 4 waited and resumed, pages 1 to 3 never read again, default wait doubled, a limit that lasts keeps the partial tree and the next read resumes, a cut mid-read waited, a 401 never waited, the pause between pages, the window) and A198 (the frame: the sentence in the four languages counting down, the read resumed, the diagnostic). T2 (reading only what changed between two heads) follows.

## 14 November 2026 — the sentence of the limit is said where one is (SOG-0337, touch-up of T1)
The ergonomist, on the capture of A198 at 390: the sync button is not in the top bar of a phone, so « GitLab limite les requêtes : reprise dans n s » was on no screen one looks at, and Fuel kept saying « les commandes reviennent dans quelques secondes » while the wait is 60 s or more. Decision: while the data layer waits for a limit, the sentence is on **every screen at every width**: a **band under the header** (`#fLimit`, fixed, out of the flow so nothing moves; the warning colour; counting down each second; gone when the wait ends) and **one floating note per wait**; the module's own first-synchronisation line is not touched (Fuel's `waitFlight` can now be shorter or point to the band — Features SOG's file). Noreg A198 (the band right under the header, full width, the note, the band gone at the end).

## 14 November 2026 — T2: with a tree already known, only what changed is read (SOG-0337)
The ergonomist's decision (not « unknown fingerprints » in the core of the layer, not a per-file call): after a **comparison** of the old and the new head (`GET /repository/compare?from&to&straight=true`: the paths touched), list **without recursion the one folder of each added or modified file** (`GET /repository/tree?path=<folder>`: the blob fingerprints); deleted and renamed files are removed by their path; **the kept tree stays complete** (same as a whole read: the bench compares the two). The frame hands the transport the tree it keeps (`knownOf(remote)` at the three places that read it: first read, moment's read, `pull`); a transport that does not know it ignores the argument. **Fall back to the whole tree (paced, resumable)** when the comparison is refused (the old head is gone: rewritten history), truncated (`compare_timeout`), touches more than 100 files, when listing the folders would cost more than 12 requests (the cost of a folder: its known entries, 100 a page — a file changed in a folder of 1 500 is 16 pages, so the whole tree), or when a listing does not show a file the comparison says changed. Criterion: twenty files changed in five folders at most = eight requests at most (here: 1 + the folders). The diagnostic says it (`treeRead.incremental`, `from`, `changed`, `dirs`, `requests`). Noreg A38 (bench: modified, added, deleted, renamed give the same tree as a whole read in three requests; the five fall-backs; one file added in a tree of 1 500 = two requests) and A201 (the frame: the second synchronisation is a comparison and one folder, no recursive listing).

## 14 November 2026 — the band of the limit pushes the view down, it never covers it (SOG-0337)
On the capture of A198 the band covered the first row of buttons of the view. The band stays fixed under the header (it is still on every screen at every width), but `html.f-limited` pushes `.f-view` down by the band's height (`--f-limit-h`, set from its real height: one or two lines depending on the language and the width) and takes it back when the wait ends. Noreg A198 (the view starts below the band, the first row is not covered; the class and the variable are gone at the end).

## 14 November 2026 — the state block names the data repository (SOG-0235)
The user's computer, on the published site, was set to another repository (an old GitHub one) than his phone, and nothing said so: the block said « Échange : GitHub », and « Échange : cet appareil » for a GitLab device (no label for the transport `gitlab`). It now says **the provider and the project**: « Échange : GitHub · acme/data », « Échange : GitLab · grp/data », with the host in front for a self-hosted GitLab (`git.example.test/grp/data`) — never the token. Noreg A203 (the three forms in the four languages, no secret on the screen).

## 14 November 2026 — a module changes of view, the rail follows: `ctx.view` (SOG-0338)
The user, on his phone: « un clic sur « registre » ne met pas à jour le rail gauche. on reste sur mission ». Missions and Registre are two entries of the Company rail for ONE module (`#missions` and `#missions?view=registry`); the page's « Registre » button opened the Registry inside the module without telling the frame, so the address stayed `#missions` and the rail kept « Missions ». Decision: a module that changes of view without changing of page says it by **`ctx.view(name | '')`** (the frame: `setModuleView`): the address becomes `#module?view=name` (a `pushState`, no `hashchange`, so the module stays mounted and the browser's back button returns to the previous screen) and `renderMenu` marks the matching entry — what a click in the rail does. Without effect when that module is not the one shown. The Missions module calls it when it opens (`regopen`) and leaves (`regback`) the Registry (a two-line change in `modules/missions/module.js`, Features SOG's file). Noreg A204 (the rail marks « Registre » after the page's button and « Missions » after the way back; red before; 20 Missions › Registre cases unchanged).

## 14 November 2026 — the launcher's state files: a lock, a temporary of its own, a replacement tried again (SOG-0339)
The user's launcher log: `PermissionError: [WinError 32] The process cannot access the file because it is being used by another process` in `_lnmperf` → `_write_json` → `os.replace` on `tools/.lnmperf.json`, an exception nobody caught: the request fell. Windows refuses a replacement while another process (an antivirus, a reader) holds the file for a fraction of a second, and two requests writing the same state file shared the same `.tmp`. Decisions: `_write_json` takes **a lock per file**, writes **a temporary of its own** (pid and thread in its name), tries `os.replace` **again after 0.05, 0.2 and 0.5 s** when the refusal is « busy » (`PermissionError`, WinError 5, 32, 33), removes the temporary and raises **`OSError`** when it never works (the callers that write secrets and sites already say it); the Little Navmap folder and file routes answer a **readable 503** (« Écriture impossible (fichier occupé ?) … Réessayez dans un instant ») instead of raising; any other error is raised at once, never retried. Not diagnosed, only noted: « [sortant] échec relais : aviationweather.gov/api/data/metar : TimeoutError » (a later try, or the relay's limit?). Noreg K269 (retry then success, spaced tries, never accepted = OSError and no temporary, another error not retried, four threads on one file).

## 14 November 2026 — the frame draws at once with the last known state of the launcher (SOG-0133)
Réglages measured it: `boot()` awaited `launcher.detect()` (GET `/__setup/status`) before routing — with a launcher that answers in 2 s (a relay, a phone) nothing was drawn for 2 s whatever the screen (2.3 s to the first element when only `status` is slow, 4.1 s when every route is). Decision: the **last known answer is kept on the device** (`localStorage` `sog.launcher.seen`: the detection object, or « none », only over http) and **used at once**; the detection (`detectP`) finishes **behind** and, once the first `loadDevice()` is done, only a **difference** (another launcher, stopped, another wiring) sets `launcherHere` again and rebinds the transport (`loadDevice`, `readVersion`, `paintStatus`, `paintStale`). The code stamp the launcher serves (`app`) is **never taken from the past**: the « Old version » cartouche (SOG-0168) rests on the live detection only. A start with nothing known waits for the detection **600 ms at most**, then goes on and the detection finishes behind. Noreg A205 (a launcher answering in 2 s: first start under 1.8 s, second under 1 s, the detection still runs, the answer is kept; red before: 2 251 ms; A118, A122, A138, A141 unchanged).

## 14 November 2026 — the common rule for the points of a map (SOG-0343)
The user, on his phone: « il faut avoir de tout petits doigts pour viser les points météo déjà téléchargés. Ça génère des accès parasites… évaluer la taille d'un doigt, ou la sensibilité d'une souris. Ça peut être mis en settings ». The ergonomist's objection and counter-proposal, taken: the size of a finger is **not a preference, it is a fact the device declares** (a coarse or a fine pointer), so **one rule, not one more setting**, in `frame/lib/hit_target.js` (INTEGRATION § 17): a coarse pointer takes a point of a map in **22 px** (a 44 px target), a mouse in **8 px**; between several points in the radius the **nearest to the press** wins (the first at a tie); a press that takes **nothing** gives `null` and launches **no reading** (no more parasitic access). The module is pure (`radiusFor`, `pick`, `crowded`); the Weather screen applies it first (`modules/atmosphere/screen_map.js`, BUGS SOG's file for this card: `mapTap` took every press), any map after. Noreg A207 (22 / 8 px, the nearest, the tie, the void, bad inputs, the device's pointer by the media query).

## 14 November 2026 — a file read waits patiently for a limit and an abandon cancels it (SOG-0349)
The user, on his phone: the map around the flight ended with 0 data on gitlab.com. The survey (a)(b)(c): a file already read is kept by its fingerprint; but after the three retries of a 429 the read rejected and `read()` turned the error into **null — exactly like an absent file** (aerodb then draws no zone), and aerodb's 10 s bound called `abandon`, which only forgot the shared promise: **the request stayed in the pace queue and counted in the 80 a minute**, then the next question asked again, behind it. Decisions: (1) a file read is **patient** (`opts.patient`): a limit makes it wait (said by the band « GitLab limite les requêtes : reprise dans n s »), never return « absent », however long it lasts (the tree and the commits keep their three retries); (2) a file read is **abandonable** (`opts.signal`, an `AbortController` per read in `fetchOne`): `abandon(path)` **cancels** it — in the pace queue (it takes neither a place nor a share of the cadence) or in the wait of a 429 (the wait ends, the band goes) or in flight (`fetch` aborted; the error `aborted` is not a read error); (3) the next question after an abandon starts one clean read (the shared promise is still one per path). Not done (AeroDB's file, to be said): the 10 s bound of `aerodb.js` still cuts a queue that the 80 a minute makes longer — a bound that waits for the queue, or a priority for what is on screen. Noreg A38 (bench: the same limit without patience raises, with patience is waited to the end, an abandon during the wait ends it at once, an aborted request in the cadence queue takes no place) and A210 (the frame: the read waits, the band says so, the abandon ends the wait and nothing is asked again).

## 14 November 2026 — correction of SOG-0349: no more abandon, shared reads, « unreadable » ≠ « absent », priority to the screen
The ergonomist's decision, replacing the first fix of the same day (an abandon that cancelled): a module's bound must neither cut nor wait without end. (1) **One read per path** (already one promise): `abandon` **no longer cancels nor restarts** — it only counts that one asker stopped waiting; the read goes on, arrives later, is kept by its fingerprint and `changed` tells the screen to repaint; only a request that nobody waits for **and has not left yet** may leave the queue (it takes neither a place nor a share of the cadence). (2) A failure is **not « absent »**: the frame keeps the read **patient** (a 429 is waited and retried by the frame, the band says so) and a module that cannot block asks `read(path, { detail: true })`: after 1.5 s it gets `{ unreadable: true, why: 'limit' | 'queued' | 'offline' | 'error', retryIn? }` (« illisible, reprise dans n s »), `null` stays an absent file for whoever does not ask for the detail; `readState(path)` tells a read in flight (INTEGRATION § 4). (3) **Priority**: the guard's queue serves the highest priority first — the head and the commits (3), the files asked for (2, **the last asked first**: the screen in view), the default (1), the background tree and its comparisons (0) — and a 429 **pauses every request** (nobody hits during the pause, the pause is the host's). (4) The band of SOG-0337 serves the waits of file reads too (the pause is the guard's). AeroDB adapts to the contract in its own commit (`aerodb.js` is not touched here). Noreg A38 (bench: priority order head → last read → first read → tree; patient reads; an asker who withdraws), A210 (the frame: one request per path, `detail` says « limit, retry in n s », abandon removes and restarts nothing, the file arrives later, `watch` is told, kept).

## 14 November 2026 — a cap in bytes on every file read from the repository (Sécurisation, class of defect)
Sécurisation: no cap on a file read of `frame/store` (GitHub / GitLab transports, `FrameData.read`): any pilot can commit a huge file, and since the shared patient read (3794a0024) and the end of the 10 s bound that cut it, a phone would read it to the end, in memory. Decision: **`G.bounded(response, max)`** in the common base — the announced size (`Content-Length`) over the cap **refuses without reading anything**; otherwise the bytes are **counted while reading** (the response is a stream: over the cap the read stops and the stream is cancelled, the memory never follows) → `err.tooBig`. The cap is the **policy's** (`READ_CAP` in `frame_data.js`: a compiled base `reference` 64 MiB, a document or the device's cache 8 MiB; a read without a given cap: 64 MiB, never unbounded; the bytes of a file such as the logo: their own `max`). Over the cap a read is **unreadable** (`why: 'error'` with `detail`, `null` without), never kept; a revision already refused is not read again (`bigRevs`); in `pull`, a tracked file over its cap is skipped, it does not break the pass. Noreg A38 (a fake repository serving 300 MB as a stream: the read stops, the stream is cancelled, at most a few MB read; the announced size refuses at once; 64 MiB by default; the bytes of a file; a file under its cap read whole).

## 14 November 2026 — SOG-0358: ONE cap for the whole frame on a file read, « trop gros » is not « absent »
Sécurisation's note, taken by the ergonomist as an audit defect, completing the cap above. (1) **ONE value for the frame**: `MAX_READ = 48 MiB` (`transport_git.js`) — more than three times the largest legitimate file of today (14.5 MB: the airspaces of a zone) — **proposed by V3 Frame, to be validated by Sécurisation**; every transport applies it, **GitHub, GitLab and the launcher** (`transport_launcher.js` goes through `FD.git.bounded` too); a module can only **lower** it for its own reads (`max`: a document 8 MiB by policy, the logo its own `max`); asking for more opens nothing above 48 MiB. (2) A refusal is **`unreadable` with the reason `toobig`** (`read(path, { detail: true })` → `{ unreadable: true, why: 'toobig' }`), **never « absent »** and never kept; a revision already refused is not read again. (3) **Counter-proof (red without the guard)**: noreg A38 — a fake repository serving 300 MB as a stream: without the cap the read would go to the end (the bench would run out of memory); with it the read stops, the stream is cancelled, at most a few MB are read; the announced size refuses without reading; a module asking for 500 MiB gets 48; a file of 15 MiB passes with its margin.
