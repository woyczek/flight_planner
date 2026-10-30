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
  `pip install pypdf`, then, from a clone of the suite, `python tools/proc_sia.py --all --delay 0.3 --eaip
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

### Procedures chosen in the preparation (§ 10.20 of the specification) — what aerodb gives Fuel and the Map

- **Calls**: `procedures(icao, q)` (lists for the selects: runways in `runways` of each record, transitions in `transition`),
  `procedure(id)` (the record of an identifier kept in `route.procedures`, an OFP one included), `runways(icao)`,
  `procedureIndex()`, `fetchProcedures(icao, { onProgress, signal })` (the on-demand reading; refused with a reason, never
  silent). SPEC § 5 quinquies. Fuel writes `route.procedures`; the Map never does; aerodb never writes the flight.
- **The on-demand reading** (`fetchProcedures`, wired): Fuel's « Lire les procédures de LFXX » button (shown when an aerodrome has none) calls
  `aerodb.fetchProcedures(icao, { onProgress, signal })` and nothing else: no launcher route in Fuel's `meta`, the frame hands `launcher.job` to aerodb.
  One aerodrome per gesture, never a list; aerodb picks the source from the aerodrome's State (France: the SIA eAIP, no account; a State readable in EAD Basic: EAD Basic;
  any other: `no-tables`) — the button is the same, and a module never branches on it. It takes minutes (about one request a second): show `onProgress({ step, done, total, source })` (`source`: `eaip` | `ead`), offer a cancel
  (`signal`). On success `procedures` is the merged list read again (the answer carries `source` too), the files are installed and committed in the data repository of the workstation
  (not pushed: the usual synchronisation carries them). A refusal is `{ ok: false, reason, message? }` and the module words it — never silent:

  | `reason` | What to tell the pilot |
  |---|---|
  | `bad-icao` | not a four-character code (a programming error: the button should not be there) |
  | `no-launcher` | this device has no workstation launcher; the SimBrief OFP stays the source of the flight's procedures |
  | `paired` | the device is paired to a workstation: do the reading on the workstation |
  | `no-tables` | « aucune table publiée pour cet État » (×4): no coding table is published for this State, or the aerodrome's page lists none (`outcome` says why: images, prose, VFR only…). When `lnm` is `true` the workstation has Little Navmap databases: add that they may hold the procedures (a hint only, not a coverage; reading them is planned, § 10.21) |
  | `no-credentials` | (a State read in EAD Basic only, never France) no EAD Basic account is set on the workstation (`secrets/ead.json` or `EAD_USER` / `EAD_PASSWORD`): set it there |
  | `too-soon` | (EAD Basic only) a reading started less than 30 s ago: EAD Basic is read one aerodrome per gesture, never in bulk; `wait` gives the seconds left (« Patientez {n} s avant la lecture suivante ») |
  | `busy` | this aerodrome is already being read, or the workstation is busy with another job: wait |
  | `cancelled` | the pilot cancelled |
  | `failed` | the reading failed; `message` has the cause (login refused, the eAIP folder of the cycle not published yet, nothing read, geometry check failed, another source's file, a launcher older than the page: restart it) |

  `warnings` of a success are the reading's own (a table dropped by the geometry check, coordinates to resolve): show them as floating notifications.
- **`stats` — the counts for the notification** (success, and failure when the job has them; `null` from an older launcher): `{ pages, read, rejected, procedures, dropped, doubt, reasons }` — `pages` the coding pages found, `read` those read,
  `rejected` those not read, `procedures` installed (**the `doubt` ones included**), `dropped` really removed (an untitled block that repeats a named procedure), `doubt` installed with status `doubt` (kept, to be checked), `reasons` the three
  most frequent `[code, count]` over the pages not read, the procedures removed and those in doubt (**a code, never a phrase** since V3 § 10.29 (c): `layout`, `low-read`, `title`, `no-legs`, `counts`, `vector`, `timeout` for a page; `geometry`, `unresolved`, `name`, `repeat`, `zigzag`, `unread` for a procedure in doubt; the dropped untitled blocks count under `name`; **translate with `AeroCatalogue.READ_REASONS[code]`** → `[fr, en, de, es]`, and show the code itself when it is unknown, never a sentence of the tool). The same codes are on the pages of the aerodrome file (`formats[].reason`, present when `ok` is false) and on a procedure in doubt (`doubt`, the codes joined by a comma): Fuel's « N non lues » line and the Map's legend read them the same way. Never answer a bare « 0 procédures » :
  suggested French wording « 18 procédures lues sur 22 pages ; 4 pages non lues (motif le plus fréquent : lignes de tronçon illisibles) » — `procedures.length` of the answer for the first number (it is built from the file the job
  returned, so it is right on the first reading), `stats.pages`, `stats.rejected` and `stats.reasons[0][0]`; with `doubt` > 0 add « · 2 procédures à vérifier (statut doubt, gardées) » and the first reason; with `dropped` > 0 « · 1 bloc sans titre retiré ». Fuel words and translates it; aerodb gives numbers. **EAD Basic readings** (29 Oct): a failure that got as far as the pages (nothing read, geometry check failed, another source's file) carries `stats` too, and the « nothing read » `message` says what was seen (`no procedure could be read for this aerodrome: 31 document(s), 0 of 31 page(s) read (mise en page non reconnue ×31)`): show it after the reason, as Fuel already does for `message`. `onProgress` of an EAD reading has numbers all along (`done` / `total`: the 4 searches, then the documents downloaded, read and analysed, one after the other; the step text changes, the unit is not given to the page): show `done/total`.
- **Runways** (`runways(icao)`): a file built from the SIA eAIP carries every runway of the section AD 2.12 of the aerodrome page, complete (`approx: false`): threshold `lat` / `lon` / `elev`, magnetic bearing `qfu`, `true` bearing, `length`, `width`, `displaced` (the THR → DTHR distance in ft,
  0 without one, as the FAA CIFP's) and `dthr` (`null` or the displaced threshold `{ lat, lon, elev }`). A French aerodrome read before that (an older file) still has runways from the procedures' `runways` lists with `lat` / `lon` null and `approx: true`: select them by `id`, never draw them.
- **ILS from the eAIP**: the final along the localizer is not coded by the SIA. The approach is IF → the final approach fix `FAFnn` (`synthetic: 'faf'`, `leg: 'CF'`, `alt: null`: the position of « FAF LOC RWY nn » on the DATA page, when there is one and it lies on the final; a procedure without one goes straight IF → threshold) → the runway point `RWnn` (`synthetic: 'threshold'`, `leg: 'CF'`, `alt: null`; the landing point: the displaced threshold if there is one) → the missed approach (`phase: 'missed'`,
  first leg `gap: true`). Draw the IF → FAF → threshold segments straight, as for any CF; the FAF and the threshold are not published fixes of the table (`synthetic`), and their altitudes are not coded.
- **The « Source » link** (Fuel's secondary line, the Map's aerodrome card; V3 § 10.25): read **`source.url`**, served by aerodb on every record of source `eaip` (`charts.base` + `Cartes/` + the ICAO + `/` + the page's name: a public https address of the SIA; a file read before `source.file` gives its `source.ref`); absent for any other source (EAD, OCR, manual): show its `source.file` in a `title`, no link.
- **Every leg** carries `phase` (`main` | `trans` | `missed`); a leg without a fix (`id` null: VA, CA, VM, FM…) has no
  position, only its course and constraint: draw it along its course (a 2 NM stroke, then dashes to the next point), never
  invent a point. Hand-read procedures may be `outdated` (show « périmé »).
- **What each source provides** (what a module can count on; a field a source does not give is absent, never guessed):

  | Source (`source.kind`) | Status | Positions | Constraints `alt` / speed `kt` | Course `crs`, `nm`, `turn`, `over` | `phase` | RF `arc` | Legs without a fix | Runways |
  |---|---|---|---|---|---|---|---|---|
  | FAA CIFP (`cifp`) | official | every fix (terminal, enroute, navaid records) | yes / yes | yes (and `vpa`, `rnp`) | main, trans, missed (from the next build; before: defaults) | yes, centre and radius (from the next build) | kept, `id` null, with course (from the next build; before: left out, counted in `warnings`) | complete (PG records, from the next build) |
  | SIA eAIP (`eaip`) | official or check; **`doubt`** for a reading that failed a guard (`doubt` has the reason) | from the DATA pages, en-route fixes placed from the base (`placed: 'base'`) | yes / yes | yes (and `vpa`, `rnp`) | missed after the missed-approach point, else default | no | as printed, without a position | complete, from AD 2.12 of the aerodrome page (`approx: false`); an ILS final is IF → threshold (`synthetic`) |
  | EAD Basic, read by layout (`ead-basic`) | check | from the table or the State's list of points; some to be placed | yes / yes | course and distance (for the geometry check), turn and fly-over when printed | missed after the runway, else default | no | as printed | derived (`approx`) |
  | EAD Basic, through OCR (`ead-basic`, `how: ocr`) | check | as the layout | yes / yes | course and distance; **turn and fly-over lost** (single-letter cells) | as the layout | no | as printed | derived (`approx`) |
  | Manual reading (`manual`, `how: hand`) | check | as written, checked by the geometry check | as written | true course `trk` and `nm` | default | no | — | derived (`approx`) |
  | SimBrief OFP (`simbrief`, `proc-seen/`) | ofp | the navlog's fixes | **no** (only the plan's altitude `planned`) | no | default (`main`) | no | — | none |
  | X-Plane fallback (`xplane`, `proc/local/`, the workstation only, `local: true`) | xplane (lowest) | as the converter writes them (ARINC 424 like the CIFP) | as converted | as converted | as converted, else default | as converted | as converted | as converted, else derived |

  **eAIP, what the reader keeps apart or marks** (LFPG, 29 Oct 2026): the sequencing arcs of a **point merge** (`BIBA1` … `BIBA5`, `LUKI1` … `LUKI5`) are NOT in any STAR's points; the file has them in `point_merge` (`name`, `merge`, `arc`,
  `runways`, `source`), and the STAR goes from its entry fix to the merge point (a `DF`). A nameless record, a record that passes twice through a point outside a holding, a zigzag, a record with a leg row left out, a geometry that
  contradicts the printed courses: written with **`status: 'doubt'`** and a `doubt` reason, never installed as sure and never purged. `procedures(icao, q)` and `procedure(id)` leave them out; a module asks `{ doubt: true }` **only** to show
  them as « à vérifier » (with the reason as title), never to offer them as a normal choice.

  A record with `local: true` comes from the workstation's X-Plane: label it « X-Plane, local » (four languages), never
  copy it into the flight's files or a shared document; keep its identifier only.

### Coverage of the procedures (§ 10.22 of the specification) — what aerodb gives the Map and the Données module

The Map's « Procédures » layer colours aerodrome pins by what this device can give; the Données module shows the same three colours per State.
Neither reads an index or the catalogue: they ask aerodb.

- **`coverage(icao)`** → `Promise<object | null>`, **without loading the base**. `null` for a malformed code (not four characters `A-Z 0-9` after trim and
  upper-casing). Otherwise `{ level, reason, state, here, read_at }`:

  | `level` | `reason` | Meaning | Extra fields |
  |---|---|---|---|
  | `green` | `held` | procedures held: the published cycle, `proc/manual/` or `proc/local/` | `source` (`published` > `manual` > `local`, the best held), `outdated` (true only when the one holding is a hand reading of a past cycle), `counts { SID, STAR, APP }` (and `read_at`, below) |
  | `orange` | `partial` | procedures held, **not all read** (V3 § 10.26): pages of the file not read (`formats[].ok === false`) or records of status `doubt` | the fields of `held`, plus `partial { pages, doubt }` |
  | `orange` | `sia` | readable on demand: State `LF`, the SIA eAIP | |
  | `orange` | `ead` | readable on demand: the State's `EAD_STATES` outcome is `read` (EAD Basic) | |
  | `red` | `images`, `labels`, `points`, `prose`, `vfr`, `none` | nothing to read: the State's `EAD_STATES` outcome says why | |
  | `red` | `unknown` | State absent from `EAD_STATES` (or an unexpected outcome) | |

  `state` is the two-letter prefix. `here` is true when this device can start the reading (a launcher with `job`, not paired): **orange stays orange where `here`
  is false** (the reading is then made on the workstation); the Map words « lire sur le poste » from it, and offers the gesture (`fetchProcedures`) where it is true.
  The closed list of reasons: `held`, `partial`, `sia`, `ead`, `images`, `labels`, `points`, `prose`, `vfr`, `none`, `unknown`. **There is no orange `lnm`** (V3 § 10.29): Little Navmap has no reader yet, so the workstation's databases
  change nothing in `coverage()` and `coverageByState()` (the key stays in `AeroCatalogue.COVERAGE` for the day a reader exists; a module never receives it). The `lnm` hint of `fetchProcedures` (`no-tables`) is not a coverage and stays.
- **`read_at`** (every answer of `coverage()`; ISO 8601 UTC to the second, or `null`): when the aerodrome's file was last read on the workstation, from `updated_at` of the aerodrome's entry in `proc/manual/index.json` (written by
  `tools/proc_manual.py` at install) or in `proc/local/index.json`, the most recent of the two, even where the published cycle gives the counts. **Fuel and the Map**: `read_at` present → the line « lu le … » with « Relire »;
  `null` → the « Lire les procédures de LFXX » button alone, no date (an orange or red aerodrome, a published-only one, or an index entry from before the date existed). The same date is on every record served from `proc/manual/`
  as `source.read_at`; a published record has none.
- **`coverageByState()`** → `{ [prefix]: { level, reason, label: [fr, en, de, es], names: [fr, en, de, es], held } }` for every `EAD_STATES` prefix (France included).
  `held` is the number of aerodromes held in the State (partial ones included): `held > 0` → `green` / `held`; none → the rules of `coverage()` **without a held
  aerodrome** — a State is readable on demand or not (the workstation's Little Navmap databases change nothing). `label` is `AeroCatalogue.COVERAGE[reason]`,
  `names` the State's name in the four languages (`AeroCatalogue.EAD_STATES[prefix].names`). This is the shape agreed with the Données module (29 Oct 2026); that
  module also reads `AeroCatalogue.PARSER_VERSION` (the format version the builders write = `VERSION` of `shared/sia_base.js`) to flag a zone « à reconstruire ».
- **Labels**: `AeroCatalogue.COVERAGE[reason]` → `[fr, en, de, es]` (served by `sources()`), short, for a legend line or a tooltip. A module that words a reason
  differently (a longer sentence) keys on `reason`, never on the label.
- **Cost and cache**: the first `coverage()` builds, once, an in-memory table from `procedureIndex()` (the published cycle index, `proc/manual/index.json` and
  `proc/local/index.json`, already merged with their `manual` / `outdated` / `local` flags) and `EAD_STATES`; concurrent first calls share the one build; every
  other call is a map lookup (hundreds of pins cost nothing). `here` is read at each call, not cached; `read_at` comes from the same indexes (no extra read). An index entry that counts
  no procedure is not « held ».
- **Staying current**: `aerodb.on('change', fn)` receives `{ coverage: true }` when the index may have changed (after a successful `fetchProcedures`, which
  also carries `procedures: icao`; on `refresh()`, which also carries `refreshed`; when a procedure index changes in the data layer: synchronisation, another
  tab; when one aerodrome's file arrives or changes there — a reading made on the workstation and synchronised to this device —, `procedures: icao` comes
  with it, so Fuel re-asks `procedures(icao)` instead of keeping an empty answer; more than 50 at once (a published cycle): one `{ coverage, refreshed }`).
  aerodb has already dropped its table: **ask again, never keep an answer past that event** — the Map redraws its pins, the Données module its State
  list. `coverageByState()` is built from the same table (`held`): ask it again after `{ coverage: true }` too.
- **`partial` for Fuel and the Map**: a partial aerodrome is **orange**, not green, though `source`, `counts`, `outdated` and `read_at` are there as for `held` —
  the Map colours the pin orange and words `COVERAGE.partial` (plus `partial.pages` / `partial.doubt` if it wants numbers); Fuel keeps its « lu le … » line and its « N non lues » line
  (from `stats`) and must not take `orange` for « nothing held » (test `reason`, not `level`, to decide whether the « Lire » button stands alone). The counts exist only for
  files installed after this change (`tools/proc_manual.py`); read an aerodrome again to have them.

### The Données module (`modules/data/`, Full level) — contracts of 28 Oct 2026

What aerodb gives the module that regenerates the published data (its SPEC and INTEGRATION § 2, written with the settings
session, which keeps the module's files):

- **Reading** (lot D1, delivered 28 Oct 2026, bench K21): `aerodb.publication()` (what is published, per zone and cycle, without loading the data),
  `aerodb.zones()` (every known zone, published or not), `aerodb.sources()` (the catalogue: groups, zones fed, fetch and
  build modes, links by cycle, licences, statuses, EAD outcome per State, file-name readers). SPEC § 5. The module reads
  nothing else of aerodb and never `sia/base/`, `proc/` or `AircraftDB/` itself.
- **The zones' outlines** (30 Oct 2026, the Data module's map of zones): `await aerodb.zoneOutlines()` → `{ <zone>: { name:
  [fr, en, de, es], rings: [[[lon, lat], …]], box: [w, s, e, n] } }`, frozen, one load for the page (bench K21). A module
  never loads `shared/carto/aero_zones_geo.js` itself; the Map's plain background reads it here too (its own copy,
  `modules/maps/lib/outlines.js`, goes with the Map's refactor).
- **Cycles**: dates `YYYY-MM-DD` in every answer, the AIRAC id `YYNN` only on screen, converted by `frame/aerodb/airac.js`
  (SPEC § 4). Three cycles kept for the base and `proc/`.
- **Building** (lot D5): with a launcher, the job `base/build` runs the existing builders in one window-less browser for all the requested
  zones and commits each zone alone (below; SPEC § 5 septies); the two-stage plan (pieces per source and an assembler per zone, nothing
  written by them) stays the direction for the sources that leave `sia_base.js`.
- **Procedures**: EAD Basic reads one aerodrome per gesture (*Charts* documents `AD_2_<ICAO>_…`, first page of results only,
  15 rows); its output is installed by `tools/proc_manual.py`, which refuses another source's file without `--replace`:
  the module asks « remplacer ou fusionner » then. Hand-read files (EAD Basic, manual, OCR) live in `proc/manual/<ICAO>.json`,
  outside the cycles: read whatever their age, marked `outdated: true` once their cycle is no longer in force, never purged
  by the module, which lists them « périmé » with « Relire » (SPEC § 5 quinquies). Compiling (workstation) and using
  (devices) stay apart; the compiled JSON live in the private data repository (SPEC § 1). Grey reasons that come from aerodb's side:
  « pypdf manque », « OCR manque » (drawn pages: UK STARs, Belgium, Georgia), « Mise en page inconnue pour cet État ».

### Building on the workstation: the job `base/build` (lot D5, 30 Oct 2026)

What the Données module calls to build the base **with a launcher**; the page's own build does not exist as a fallback in this lot: without a browser the
job answers `reason: 'no-browser'` and the screen says it. Full contract: SPEC § 5 septies, « The job `base/build` ».

```js
const r = await ctx.launcher.job('regen/job', { set: 'base', verb: 'build', args: { zones: ['fr', 'gb', 'es'], personal: [] } },
  { onProgress: j => draw(j.zones, j.step, j.done, j.total), signal });   // after a reload: ctx.launcher.resume('regen/job', …)
// j.zones  = { fr: { state: 'waiting'|'building'|'built'|'failed'|'cancelled', done, total, error, commit?, warning?, files?, seconds? }, … }
// r.result = { ok, cycle, built: ['fr', …], failed: [{ zone, error }], commits: [{ zone, commit }], instances, seconds, reason? }
```

- **One window-less browser builds every requested zone** with the page's own functions (output identical to the page's, byte for byte), and hands
  each zone back as soon as it is ready; the job writes and **commits it alone** (the page's trigram as author, no push) while the next ones come; the
  module lets `aerodb` read the new files and sends the commits with « Synchroniser ». A zone that fails publishes nothing; the others go on. The job
  goes on if the page closes (`resume`).
- **Per-zone line**: `state` `'waiting'` (« en attente »), `'building'` with `done` / `total` (« construction (n / m sources) »), `'built'`
  (« construite »), `'failed'` with `error` (a code: `browser-failed`, `browser-exited`, `timeout`, `page-error`, `invalid-output`, `write-failed`;
  `message` has the detail), `'cancelled'`. The head: `step` « N zones sur M », `done` / `total` in zones. The journal also gets `gb: construite, 13
  fichier(s) écrit(s), commit …`.
- **Refusals**: 400 (unknown zone, extra field), 409 (a job is running), and `ok: false` with `reason` `'no-browser'` / `'no-input'` /
  `'xplane-in-page'` (a build that needs the X-Plane folder, which only the page holds: it stays in the page) at once.
- `args.personal` is a **list of source ids** (`'enaire'`, `'nats'`…) the owner declared for a published build (the line « À cocher seulement si le
  dépôt de données n'est utilisé que par vous »); absent or `[]`, nothing personal is published. Nothing else is an argument: there is no mode in the API.
- **How the page is started (route B)**: the verb offers `{ zones, cycle, personal, inputs }` to the job (`job.offer`), starts the browser on
  `<launcher>/frame/aerodb/build/headless.html#job=<id>` and nothing else (no token, no parameter on the command line); the page makes one
  `POST regen/job/claim` and gets the offer and the token, checks them, and reads. The module has nothing to do with it.
- **Cost, measured on 30 Oct 2026** (24 cores, ten zones `fr gb es de it be ch ie nl nat`): 10 to 12 s through the launcher (the first zone out after 6 to
  8 s, then 0.45 s per zone for the write and the git commit), 1.3 GB private at most; the page's own build of the same zones in one page: 6 s, without the
  commits (DECISIONS 30 Oct 2026).

### Fetching and purging the raw sources on the workstation: the jobs `base/fetch` and `base/purge` (30 Oct 2026)

The raw sources (openAIP, FAA, ENAIRE, UK Mil, NAV CANADA, NAT files in `data/sia/…`) **leave the data repository**: the template `.gitignore` ignores
`sia/openaip/`, `sia/zones/`, `sia/aixm5/`, `sia/geojson/`, `sia/miam-*.xml`, the aircraft HTTP cache and `**/__pycache__/` (DECISIONS 30 Oct 2026). The
Données module fetches and purges them per zone through two more verbs of the set `base` (`tools/regen/base_sources.py`, SPEC § 5 septies « The jobs
`base/fetch` and `base/purge` »). Neither commits anything.

```js
const r = await ctx.launcher.job('regen/job', { set: 'base', verb: 'fetch', args: { zones: ['gb', 'es', 'ca'], personal: ['enaire'] } },
  { onProgress: j => draw(j.zones, j.step, j.done, j.total), signal });
// j.zones = { gb: { state: 'waiting'|'fetching'|'done'|'failed'|'cancelled', done, total, error?, sources: { openaip: { state: 'downloaded'|'unchanged'|'failed'|'skipped'|'manual', files?, bytes?, error?, status? }, … } }, … }
// r.result = { ok, fetched: ['gb'], unchanged: [], failed: [{ zone, source, error, status? }], manual: [{ zone, source, url?, name: [fr, en, de, es] }], outside_sync, warnings: [{ code: 'outside-sync', count }], reason? }
const p = await ctx.launcher.job('regen/job', { set: 'base', verb: 'purge', args: { zones: ['gb'], what: ['sources', 'caches'], dry: true } }, { onProgress });
// j.zones = { gb: { state: 'waiting'|'purging'|'done'|'failed', files, bytes, error? } };  p.result = { ok, removed: { gb: { files, bytes } }, warnings: [{ code, count? }], reason? }
```

- **`base/fetch`**: for each zone, the sources of the catalogue whose `kind` is `download` are fetched by `tools/aero_fetch.py` (nothing copied) where it writes
  today: `openaip` (the zone's country, layer by layer), `faa` and `faaclass` (`us`), `enaire` (`es`, **only if `'enaire'` is in `personal`**: else the
  source is `skipped` with `error: 'personal'`), `ukmil` (`gb`), `navcan` (`ca`), `nat` (`nat`). A `manual` or `pdf` source (`sia`, `nats`, `dircam`) is never
  downloaded: `state: 'manual'`, and the result lists it in `manual` with its `https` address (when the catalogue has one) and its four names, for the
  screen to say what to do by hand. `local` (X-Plane) and `computed` (MORA) sources are not this job's and appear nowhere. A source that fails does not stop the others
  (`error`: `network`, `http` with `status`, `parse`); the zone is `failed` when one of its sources failed. A country with no openAIP export is `failed`,
  `http`, `404`. The cancel is looked at between two files.
  What `aero_fetch` takes from a server is checked before use (security review, 30 Oct 2026): an ENAIRE file name read from its page must match
  `^LE_[A-Za-z0-9._-]+_AIP_DS_FULL_(Airspace|EnRoute)\.xml$` and resolve under `sia/aixm5` (`proc_pdf.safe_path`, for the write and for the removal of the
  previous amendment); the NAV CANADA guide address is requested only in `https` on `www.navcanada.ca`; a response over **200 MB** (announced or read) is stopped,
  nothing is written and the present file is kept (`network`).
- **`outside_sync`**: the number of files **tracked by git** in `data/` that the job modified (a rewritten file, a previous ENAIRE amendment removed): they
  now differ from the repository and will not follow the synchronisation. The screen says it (`warnings: [{ code: 'outside-sync', count }]`).
- **`base/purge`**: removes a zone's raw sources under `data/sia/` (what the catalogue's `fileSource` attributes to the zone, and for France the root AIXM,
  `XML_SIA`, `sia-airspaces` and `miam-*.xml` files) and its caches under `data/local/` (France: `local/eaip/`). **Never** `sia/base/`, `proc/`, **a file tracked
  by git** (kept, counted: `warnings: [{ code: 'kept-tracked', count }]`: it would leave the repository for every workstation), a link or a path that leaves
  `data/sia` and `data/local` (`unsafe-path`). Purging `fr` adds `{ code: 'shared-fr' }`: France's FIR outlines, read in `XML_SIA`, serve the build of every zone.
  `dry: true` gives the same view and result and removes nothing. `what` is `['sources']`, `['caches']` or both (the default).
- **`base/pickup`** (30 Oct 2026, Settings' inventory D8: the V2 page did it, nothing in V3): for each zone, its sources « à déposer à la main »
  that the launcher can take (`PICKUP`: the SIA for `fr`, NATS for `gb`) are taken from the workstation's Downloads: the latest file with the name the
  launcher expects (`export_xml_bd_SIA_*.zip`, `EG_*_DS_*_XML.zip`; never a name from the page), refused over 500 MB, checked before any read
  (`regen_jobs.zip_check`: 2 GB unpacked), its useful entries taken by their names only (SIA: the AIXM and XML_SIA files of a cycle; NATS: the XML
  files named EG…, but the DIFF, DELTA, filters and metadata — never aero_fetch's `ukmil_aara-tracks.xml` of the same folder; an entry's path
  never followed; each final name through `data_sync.data_path`: no Windows reserved name, no final dot or space), written `.tmp` then replaced where the build reads them
  (the root of `data/sia/` for the SIA, `data/sia/zones/gb/` for NATS: raw sources, never committed). Args `{ zones, dry? }` (dry by default: the
  plan). Result `{ ok, dry, taken: [{ zone, source, zip, files, bytes }], missing: [{ zone, source, expected }], failed: [{ zone, source, error }],
  reason? }`. `base/fetch` marks such a source in its `manual` list with `pickup: true` and the `expected` name, for the button « Prendre le fichier
  téléchargé ». Not under `data/local/<source>/` as first asked: the build does not read there (Simplification informed).
- **Refusals**: 400 (unknown zone or source, extra key, `dry` not a boolean), 409 (a job is running), 429 for `base/fetch` (30 s between two starts).

### Sources screen (`#sources`)

A frame screen drawn by aerodb (`frame/aerodb/sources.js`, with `airac.js` and the catalogue `catalogue.js`), not a module: nothing to mount, nothing to
call. The frame declares it in `APP.screens` (`frame/app.js`: Full level, its two scripts, no data adapter, no GitHub transport) and the
Administration card of Settings links to it. It shows links only (`frame/aerodb/SPEC.md` § 5 sexies): no fetch, so no host in the page
policy. It replaced the data laboratory (`#datalab`) on 28 October 2026; the laboratory's stream readers (`xml_stream.js`, `zip_stream.js`)
stay as bricks for the Data module. At the Données module's lot D1 it goes in turn: its data become `catalogue.js`, served
by `aerodb.sources()`.

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
