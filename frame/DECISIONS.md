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
