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
    - *Not done*: the sheet is not in `labs/design_primitives.html` (the design agent's page); no print rule for it (a
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
interface, written side by side: `b64`, the auth header, the 409/422 conflict; the redirect refusal
(`redirect: 'error'`) is in the GitLab one only. Target: a shared base (`transport_git.js`) and two thin adapters (URLs, auth header, tree paging).

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
