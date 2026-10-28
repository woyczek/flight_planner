# aerodb — integration (frame and modules)

How the frame mounts aerodb and how a module uses it. The rules of the component itself are in [SPEC.md](SPEC.md).
The frontier below was agreed on 21 October 2026 between the aerodb and frame agents and validated by the ergonomics
session.

## 1. The frontier

- **The frame** reads and caches files of the data repository by path: local cache, revisions, offline, transports
  (launcher folder, GitHub, shells). It knows nothing of aeronautical data.
- **aerodb** owns the schema of the published files, the choice of cycle, the parsing, the indexes and the business
  API. It never reads a file except through the reader the frame gives it.
- **Modules** never read `sia/base/` or `AircraftDB/`; they ask aerodb through their adapter.
- **Publication** stays with the V2 launcher: Settings › Maintenance › Aeronautical data (rebuild, then publish by
  zone) and Aircraft types ("Publish the aircraft database to the data repository").

## 2. What aerodb needs from the frame

The frame's data contract (`adapter.data`), as agreed:

- `data.read(path, { policy: 'reference', wait: true })` → `{ value | text, rev, cached, at }`, or `null` if absent.
  - `policy: 'reference'`: read only, never queued for writing. The file is kept as long as its revision does not
    change, revalidated at synchronisation (conditional request), and not fetched in advance: it is read at the first
    request.
  - `wait`: wait for the network when the file is not cached yet.
  - `rev` follows the transport (ETag on GitHub, blob sha on a tree, timestamp on the launcher): compare revisions
    only with each other, never interpret them.
- `data.list(prefix)` → paths from the last known tree (updated at each synchronisation), or `null` if no tree was
  ever read.
- `data.watch(prefix, fn)` → `fn(changed paths)` after a synchronisation (revalidated references included) or a write
  in another tab.

aerodb's declaration as a service:

```text
reads:  [{ prefix: 'sia/base/', policy: 'reference' }, { prefix: 'AircraftDB/', policy: 'reference' }]
writes: []
```

## 3. Mounting

Services are mounted first, as one instance each, then modules. With the frame's data layer
(`frame/store/frame_data.js`, delivered on 21 October), the data adapter of aerodb already has `read`, `list` and
`watch`, so it is the reader itself:

```js
const aerodb = AeroDB.create({ reader: FrameData.adapter(AeroDB.declaration()) });
// then, for every module: adapter.aerodb = aerodb
```

`AeroDB.declaration()` lists what aerodb reads (SIA base, aircraft base, V2 references, fleet, sheets) and writes
(the sheets and their V2 mirror): SPEC.md § 5 bis.

`frame/app.js` mounts it this way (`ctx.aerodb`). Checked on 21 October with the launcher transport over the 13
reference zones: the listing comes from the frame's tree, only the files asked for are read, the whole world is
identical, and a republished file gives one `change` event and a fresh read of its zone. With the **local**
transport (single user, no exchange), the reference files come from the launcher serving the page, otherwise from the
configured GitHub repository. On the public website with neither, aerodb answers empty. The three states of the base are told apart by `aerodb.state()` (no read): `loading` (the list of published zones or a zone is being read), `noaccess` (no launcher and no repository + token set here: the frame gives `AeroDB.create({ access })`), `unpublished` (the access works, nothing is published), plus `ready`, `offline` and `idle` (never asked). `on('state', fn)` follows them (a read starts or ends, `refresh()`), and `refresh()` makes the list be read again (the frame calls it when the access changes or the network comes back). An empty list is not kept for more than 30 s: it is read again at the next question, so an answer given before the network was ready (first launch of a home-screen app) does not stay for the page's life.

Scripts, in this order: `frame/aerodb/zones.js`, `frame/aerodb/aircraft.js`, `frame/aerodb/aerodb.js`; aerodb loads
`registry.js` and `sheets.js` itself at the first `aircraft()` (the frame's service worker keeps them).

Until the data layer exists, `AeroDB.create()` without a reader uses `AeroDB.fetchReader()`:
- in GitHub mode it goes through `shared/github_data.js`, which must then be loaded first;
- otherwise it reads the files served by the launcher (`data/…`, `AircraftDB/` at the root).
`frame/aerodb/bench.html` shows both.

## 4. Using it from a module

```js
const { aerodb } = adapter;
const near = await aerodb.airspaces({ lat: 43.6, lon: 1.4, radiusNm: 60, types: ['R', 'D', 'P'] });
const lfbo = await aerodb.coords('LFBO');            // { lat, lon, name, kind }
const places = await aerodb.find('TOUL', 10);        // ranked: codes, aerodromes, towns, other places
const ac = await aerodb.aircraft();
ac.classify('A400M').category;                      // 'turboprop'
ac.estimate('TBM9');                                // { kgPerHour, tasKt, basis, … } or null
aerodb.on('change', () => redraw());                // a zone loaded, a published file changed
```

Rules for modules:
- **Ask by area or identifier.** Ask for the area on screen or along the route, never for "France".
- **Draw from the answer.** Never keep a copy that outlives a `change` event.
- **Labels and units are yours.** aerodb returns data only: the module translates and formats.
- **Expect empty answers** (no zone published, offline at first launch); `status()` says why.

### Offline data (Settings screen, "Offline data" card)

The settings module shows and manages what this device keeps, through `ctx.aerodb.offline` only. It never reads
`sia/base/`.

```js
const { offline } = ctx.aerodb;
const can = offline.supported();                     // { cached, evict }: without them, states are 'unknown'
const list = await offline.zones();                  // [{ id, names, prefixes, cycle, publishedKb, cachedKb, state, at }]
await offline.keep('fr', { onProgress: p => bar(p.done / p.total) });
await offline.release('fr');                         // throws when the reader cannot evict
const ac = await offline.aircraft();                 // { files, types, state, cachedKb, at }
```

- Show `names[lang]` (a zone name is data, from the zone table), the size from `publishedKb`, and the state with its
  cycle and `at`.
- `keep` downloads the whole zone (France: about 6.5 MB, 13 files). Ask for it on Wi-Fi only if the card offers that
  choice.
- A zone used normally is `partial`: only the kinds asked for are in the cache.

### Aircraft: one registry (fuel, report, settings)

```js
const A = await ctx.aerodb.aircraft();
const hits = await A.search('A400', 20);            // sheets → fleet → reference → types → free code, with source
const flight = { ...current, aircraft: A.aircraftOf(hits[0]) };  // { sheetId, type, registration, callsign, name, source }
const s = await A.sheets.get(id);                   // with _fields (origin, date) and _kept
await A.sheets.put({ ...s, cruise: { ...s.cruise, tasKt: 335 } }, { source: 'edit' });
const parsed = A.lib.parseLnmperf(text);           // the sheets logic (AeroDBSheets)
```

- fuel edits sheets only through `A.sheets` and stops writing `planner/`. Its picker is `A.search`.
- report reads `aircraft.registration` and `aircraft.callsign` of the current flight.
- The registry's own type search is `A.searchTypes` (the former `search`).

### Little Navmap files (settings, fuel)

```js
const L = await ctx.aerodb.lnmperf();
await L.card(el, { t, notify });   // Settings, launcher page only: folder, state, Synchronise now, Stop
await L.download(sheetId);          // a phone: the sheet as a .lnmperf file (pounds)
L.on(s => …); await L.sync();       // state; a pass now
```

- The frame's Settings screen shows the card on a launcher page (`frame/settings/settings.js`, card `lnmperf`).
- aerodb declares `cache/aerodb/` (cache policy) for its manifest.
- A conflict found here is counted at the frame's button through `FrameData.noteConflict({ path, kept, lost, side })`
  (`frame/store/frame_data.js`, added with this lot); `restore` takes the file's version back.
- `toLnmperf` now writes a kg sheet in pounds (it wrote the kg values as they were): fuel's "Export .lnmperf" is
  right from now on.

- **VFR reporting points of an aerodrome** (maps, pinned aerodrome): `await aerodb.vfrRoutes('LFBD')` → its points
  (with the base's VRP id when matched), sequences and instructions by page, or null; `await aerodb.vfrIndex()` → which
  aerodromes have some. Candidates extracted from the VAC charts: draw them dashed, labelled "extracted from the VAC,
  to be checked", never as published routes (SPEC § 5 quater).

- **Procedures** (maps, fuel): `await aerodb.procedures('LFBD', { kind: 'SID', runway: '23' })` → procedures at the common
  schema (SPEC § 5 quinquies), each with `status` (`official`, `check`, `ofp`) and `sources`; draw `check` and `ofp` ones
  apart from published routes and word them "to be checked" / "seen in an OFP". Fuel hands a SimBrief OFP it has fetched to
  `await aerodb.rememberOfp(ofp)` (the user name stays Fuel's) and writes the returned `{ sid, star }` in the current
  flight (`route.procedures`); Maps draws that, ignoring a procedure whose aerodrome is no longer the route's departure or
  arrival. `aerodb.procedureIndex()` says which aerodromes have some. A published point without position is placed by
  `procedures()` from the SIA base; a point still without `lat` is skipped by the drawing.
- **Publishing the procedures of the eAIP** (workstation, by the owner of the data repository, once per AIRAC cycle):
  `pip install pypdf`, then, from a clone of the suite, `python tools/proc_eaip.py --all --delay 0.3 --eaip
  https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_<DD>_<MON>_<YYYY>/FRANCE/AIRAC-<YYYY-MM-DD> --out <clone of the data
  repository>/proc [--base-dir <clone>/sia/base/fr/<cycle>]`, read the `warnings` in each `<ICAO>.json`, then commit and push the
  data repository (the frame synchronises it like the SIA base). `--all` takes the 141 aerodromes of the eAIP menu (about 0.7 MB of
  page each, then the few PDF pages of each; aerodromes without coding tables are skipped); the old cycle folders can stay (the
  reader takes the latest one in force). The tool downloads from the SIA only and writes nothing outside `--out` and `--cache`.
- **Publishing the FAA procedures** (workstation, by the owner, once per cycle, 28 days): download `CIFP_AAMMJJ.zip` from
  `https://aeronav.faa.gov/Upload_313-d/cifp/` (the file of the cycle in force; its readme gives the dates), then `python
  tools/proc_cifp.py CIFP_AAMMJJ.zip --out <clone of the data repository>/proc` (5 seconds, 47 MB, one file per aerodrome), commit and push the
  data repository. Wherever a module shows procedures with `status: 'official'` and `source.kind: 'cifp'`, it shows the file's `notice`
  (as is, no warranty, not for navigation) and the source "FAA".
- **Charts for the frame's PDF reader**: `procedures(icao)` is not needed; read the aerodrome file of the cycle through the
  reader (`proc/<cycle>/<ICAO>.json`, key `charts`) — the address of a chart is `charts.base + items[].path`, the VAC chart
  `charts.vac` (SPEC § 5 quinquies). A call `aerodb.charts(icao)` can wrap it when the reader exists.

### Republication of the base after a parser change

When `VERSION` of `shared/sia_base.js` rises (17 for "one entry per VFR reporting point"), the published base
(`sia/base/<zone>/<cycle>/*.json`, each file carries `parserVersion`) is rebuilt by the owner of the data repository, on the
workstation with the launcher; there is no tool for the phone and nothing to type or to place by hand:

1. Update the suite on the workstation (git pull of the branch), start the launcher, open the V2 page **Settings >
   Maintenance > Aeronautical data** (`apps/settings/maintenance.html`).
2. Press **"Rebuild the aeronautical database"** (or a zone's "Fetch and recompute everything"). The page reads the SIA folder and
   the other sources ticked for the active zones, rebuilds the base and **publishes every active zone** into the data
   repository (`data/sia/base/<zone>/<cycle>/`): one rebuild covers all the zones, not one run per zone. A file whose content does not change is not
   rewritten; since `parserVersion` is inside every file, all of them change once.
3. Press **"Synchronise"** to send the files (the pending-writes line shows how many). Phones receive them with their next synchronisation.

Until then: a phone keeps reading the base it has, which is valid (`COMPAT` 14 to 17) and shows the duplicates the Map already hides
(`MapsRender.dedupeVrp`); V2 pages that read the published base mark it `outdated` (the notice "re-read the SIA folder for the VFR
reporting points", planner and CPCO map pages). The V3 pages do not read `parserVersion` and show nothing. A base of a parser older
than `COMPAT` would be ignored; this one is not.

### Sources screen (`#sources`)

A frame screen drawn by aerodb (`frame/aerodb/sources.js` and its data `sources_data.js`), not a module: nothing to mount, nothing to
call. The frame declares it in `APP.screens` (`frame/app.js`: Full level, its two scripts, no data adapter, no GitHub transport) and the
Administration card of Settings links to it. It shows links only (`frame/aerodb/SPEC.md` § 5 sexies): no fetch, so no host in the page
policy. It replaced the data laboratory (`#datalab`) on 28 October 2026; the laboratory's stream readers (`xml_stream.js`, `zip_stream.js`)
stay as bricks for the Data module.

#### Purging the trial blocks published on the main branch (before 28 Oct 2026) — on a workstation, not run by the app

Until 28 October 2026 the laboratory wrote its trial blocks (`lab/essai-*.json`, 0.5 to 10 MB each) and its cleaning commits on the
**main branch** of the data repository: "Clean" removed the files, but their blobs stay in the history and every pilot's clone
downloads them. Removing them means rewriting that history, which only the owner does, from a workstation, once:

1. **Before**: every workstation and phone has sent its pending writes (pending-writes line at zero), and nobody publishes during
   the purge. Note the size: `git count-objects -vH` in a fresh clone. If the main branch is protected against force pushes on
   GitHub, allow it for the time of the purge (Settings › Branches).
2. **Rewrite** (git-filter-repo, `pip install git-filter-repo`, the recommended tool):
   ```
   git clone --mirror https://github.com/<owner>/<data-repo>.git data-purge.git
   cd data-purge.git
   git filter-repo --path-glob 'lab/essai-*' --invert-paths
   git remote add origin https://github.com/<owner>/<data-repo>.git
   git push --force --all origin
   git push --force --tags origin
   ```
   The trial commits ("lab: essai (…)", "lab: nettoyage des essais") become empty and are dropped. Without git-filter-repo,
   git alone does the same, more slowly: `git filter-branch --index-filter "git rm -r --cached --ignore-unmatch lab" --prune-empty
   -- --all` in a normal clone, then the two pushes.
3. **After**, on every workstation with a clone of the data (the launcher's data folder): `git status` must be clean, then
   `git fetch origin` and `git reset --hard origin/main` (or a fresh clone). The phones read through the API and need nothing.
   Delete any `lab/*` branch left on GitHub (`git push origin --delete lab/<trigram>`), put the branch protection back, and
   check the size again. GitHub reclaims the unreachable objects on its own schedule; nothing secret is in those blobs (filler
   only), so no support request is needed.

From 28 October 2026 the trials went to a disposable branch `lab/<trigram>` (deleted by "Clean"), and the laboratory itself was
removed the same day: nothing more is written there. A `lab/<trigram>` branch left on GitHub can simply be deleted.

## 5. Costs to know (measured, see DECISIONS.md)

- **Only what you ask for is read.** Asking for the aerodromes around Paris reads France's `meta` and aerodromes
  (and Belgium's, whose frame touches the area): 426 KB, about 30 ms on a phone-like CPU (×4 throttling). The whole
  France file was 5.6 MB and 120 ms. Later questions take a few milliseconds.
- **Loading all 13 zones** of the reference set (`ready` over Europe): about 290–360 ms.
- **Memory**: the JavaScript heap stays around 55 to 75 MB with every index built and the towns loaded.
- **Place search**: `find('TOUL')` with France loaded reads France's navaids, points, VRP and towns (1.1 MB) and the
  world's major towns (430 KB), never the world's towns (4.9 MB): about 100 ms on a phone-like CPU the first time,
  40 ms afterwards.
- **Keeping France offline** (frame's cache, launcher): 13 files, 6.9 MB with the common files, about 180 ms, or 410 ms
  on a phone-like CPU. Afterwards, with the network cut, the questions on France answer from the cache alone (about
  100 ms, or 390 ms on a phone-like CPU, for a first set of questions). Releasing takes 80–200 ms.
