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
  [fr, en, de, es], rings: [[[lon, lat], …]], box: [w, s, e, n], parts, framed } }`, frozen, one load for the page (bench K21). `box` is
  never wider than 180° of longitude (31 Oct 2026; SPEC § 5): the whole zone when it fits, else its main group (France without the
  overseas), its `west` or `east` possibly beyond ±180 (the United States from −187.5); `parts` the frames of its groups of rings, main
  first; `framed` the rings moved by ±360° into that frame. A map that frames on zones (the Data module's `fit()`) draws `framed`;
  a world map (the Map's plain background) keeps `rings`. A module
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
// j.zones  = { fr: { state: 'waiting'|'building'|'built'|'failed'|'cancelled', done?, total?, error, commit?, warning?, files?, seconds? }, … }
// j.inputs = { done, total }: the sources of the whole build, read / to read (once, for the head of the panel)
// r.result = { ok, cycle, cycles: { fr: '2026-10-01', de: null, … }, folders: { fr: '2026-10-01', de: '2026-10-29', … }, current: '2026-10-29',
//              stale: true, blocking: [{ zone: 'fr', source: 'sia', cycle: '2026-10-01' }], sources: { sia: { cycle, current, stale }, nats: {…}, enaire: {…} },
//              builtOn: '2026-11-01', built: ['fr', …], failed: [{ zone, error }], commits: [{ zone, commit }], instances, seconds, reason? }
```

- **The raw SIA files and where the build reads them** (5 Nov 2026, DATA_MAP § 4): `data/local/sources/sia/<cycle>/` (the cycle is the date of the file), then, as a fall-back for
  the time of the move, the root of `data/sia/`; a name at both places is read at the new one. The claim gives the page `inputs` (the entries of `data/sia/`) and `sources: [{ source: 'sia',
  cycle, name }]` (the new place; the page checks each: source `sia`, a date, a name of the SIA's rule, nothing else, and reads `/data/local/sources/sia/<cycle>/<name>`). The result adds
  `builtWith: { sia, nats, enaire, airnav: cycle | null }`, `previous: [{ source, cycle, current }]` (a source with no file for the cycle in force keeps the previous one, said) and
  `siaFrom: { new: [names], legacy: [names] }`. **`base/move-sources`** `{ dry?: true, undo?: false }`: each raw SIA file of the root of `data/sia/` is **copied** to its cycle's folder, checked (SHA-256)
  and the old one removed — except one **git tracks** (kept, `kept: [{ name, why: 'tracked' }]`); the manifest `data/local/sources/sia/_manifest.json` (`{ from, to, size, sha256, at }`)
  lets `undo` bring the files back, never over a file now at the old path (`conflicts: [{ name, why: 'present' | 'different' | 'missing' }]`). Result `{ ok, dry, undo, moved, already, kept, conflicts,
  failed, manifest }`. **Nothing is purged** (no old cycle, no different duplicate); `base/pickup` now writes the SIA there; `base/purge` of `fr` reaches the new folder.
- **For which cycle, zone by zone** (1 Nov 2026; `tools/aero_cycles.py`): a zone's cycle is **its own dated source's** — `fr` the SIA
  (`XML_SIA_…`, `AIXM4.5_…`, `sia-airspaces-…`), `gb` NATS (`zones/gb/EG_…_AAAAMMJJ.xml`), `es` ENAIRE (`aixm5/LE_Amdt_A_AAAA_NN_…`, the
  AIRAC amendment NN read as cycle AANN) — never the SIA's for every zone. A zone without a dated source (openAIP, GeoNames, relief, UK Mil…)
  has **no cycle** (`cycles[zone]: null`: never « out of date », built on `builtOn`) and is written under the cycle in force (`folders`).
  `blocking` names each built zone whose source is of a past cycle (« fr : SIA France 2610 »), `stale` says there is one; building a past
  cycle is never refused. `sources` gives the cycle the workstation holds per dated source (`null` without a file). `cycle` stays the SIA
  files' cycle, which the page checks against them.

- **One window-less browser builds every requested zone** with the page's own functions (output identical to the page's, byte for byte), and hands
  each zone back as soon as it is ready; the job writes and **commits it alone** (the page's trigram as author, no push) while the next ones come; the
  module lets `aerodb` read the new files and sends the commits with « Synchroniser ». A zone that fails publishes nothing; the others go on. The job
  goes on if the page closes (`resume`).
- **Per-zone line**: `state` `'waiting'` (« en attente »), `'building'` (with `done` / `total` only when the builder gives a count of the zone's
  own; never the build's global count, never `0 / 0`), `'built'`
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
- **The browser never outlives the launcher (SOG-0038, 6 Nov 2026)**: the verb starts it through `base.launch_browser` — on Windows suspended, put in a job object
  with `KILL_ON_JOB_CLOSE`, then resumed — so that a launcher stopped by force (no `finally` runs) takes the browser and its children with it; `build()`'s `finally`
  still ends it and removes its profile in every ordinary case (end, failure, timeout, Stop) and says in the job log when a profile could not be removed. At load,
  the launcher says and removes the `sog-base-*` profiles older than an hour **and stops the headless browsers still holding them** (`purge_stale`; a recent
  profile, and its browser, is a running job and is never touched). Tests: K77 (launcher killed in the middle of a build), K78 (the sweep), K50 and K51 (nothing left).
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
  (`error`: `network`, `http` with `status`, `parse`); the zone is `failed` when one of its sources failed. The cancel is looked at between two files.
- **An openAIP export a country does not have is absent, never a failure** (1 Nov 2026, the user's log: some thirty « [sortant] échec … HTTP 404 »
  lines for `kh_asp`, `iq_*`, `vn_*`… at every pass): a 403 / 404 on a per-country layer is asked quietly (`aero_fetch.get(…, absent_ok=True)`,
  nothing in the launcher's console), listed in the result (`absent: ['kh_asp', …]`) and said in **one** line of the job's log for the pass
  (« openAIP : pas d'export pour iq (apt, asp, nav, rpp), kh (asp, nav, rpp) »); a country with no export at all, or a zone without a
  two-letter code (`cyn`, `kas`, `sol`), gives the source `{ state: 'skipped', error: 'absent' }` and the zone stays `done`. The absent
  layers are remembered for the AIRAC cycle in `tools/.openaip_absent.json` (the workstation's, never versioned, never in `data/`) and
  not asked again until the next cycle. A 5xx, a time-out or an unreadable answer stays a failure, said per file.
- **The cycle held per dated source** (1 Nov 2026): the view from the start (the plan) and the result carry `sources: { sia | nats | enaire:
  { cycle: 'AAAA-MM-JJ' | null, current, stale } }`, read from the dates the present files carry (`tools/aero_cycles.py`); a source without
  AIRAC is not in it. The links and expected names of the manual sources are in `catalogue.js` (`fetch.how 'pick'`).
- **Ireland, the zone `ie`** (lot C2, 5 Nov 2026): the source `airnav` (AirNav Ireland's eAIP, `aero_fetch.airnav` → `tools/airnav_eaip.py`; **personal licence**: no reuse licence
  found, the compiled data stay in the owner's private data repository) gives the zone its **points** (ENR 4.4, 167 on the 29 Oct 2026 issue) and its **RNAV routes** (ENR 3.3, ten routes, 31
  segments) — no procedures: the Irish eAIP gives SIDs, STARs and approaches on charts only. The address of the issue in force is read on the AIM page and checked (https, `www.airnav.ie`,
  `/…/html/index.html`), the two section pages are read, and the file `data/sia/zones/ie/airnav_ie_enr_AAAAMMJJ.geojson` is written (the date of the edition is its cycle; the previous edition
  is removed). `AeroSources.geojson` reads it: Features `sog: 'point'` → `aero.points`, `sog: 'airway'` (a two-position LineString) → `aero.airways` (limits in feet, `UNL` as infinity).
- **`chartsUrl(icao)`** (SOG-0024): see SPEC § 5 (service). France, Spain, Ireland; `null` elsewhere.
- **A 304 Not Modified is « unchanged »** (1 Nov 2026, the user's log after 822a0ffbb: « [sortant] échec … de_asp.geojson : HTTP 304 »): the
  answer to a conditional request (`If-Modified-Since`, the date of the local copy) keeps the copy, counts as a success (`unchanged`) and is
  never written in the launcher's console (`aero_fetch` asks through `outbound.opener(quiet=(304, …))`). A 304 with no copy behind it (no
  condition sent, or the copy gone meanwhile) is asked again once without condition (`Cache-Control: no-cache`); a second 304 is an error.
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
  plan). Result `{ ok, dry, taken: [{ zone, source, zip, size, files, bytes }], missing: [{ zone, source, expected }], failed: [{ zone, source, error }],
  reason? }`. **The file shown is the file taken** (Sécurisation's note on c62d555e6, audit line 95): the real pickup may carry
  `zips: { <source>: { name, size } }` from the plan (and `openaip`, below); a source whose latest zip is no longer that one (another arrived during the
  question) is refused, `error: 'changed'` with the zip now found, and nothing is written for it; with `zips`, a source it
  does not name (missing at the plan, its zip arrived since) is refused too, `error: 'not-shown'`, and `zips: {}` shows
  nothing (Sécurisation, line 109); without `zips`, as before. `base/fetch` marks such a source in its `manual` list with `pickup: true` and the `expected` name, for the button « Prendre le fichier
  téléchargé ». Not under `data/local/<source>/` as first asked: the build does not read there (Simplification informed).
- **`base/pickup`: one zip per NATS set** (10 Nov 2026, SOG-0126): NATS sends three sets at different times (`EG_AIP_DS_<date>_XML.zip`, `EG_OBS_DS_AREA1_FULL_<date>_XML.zip`, `EG_UAS_…_XML.zip`); the pickup took ONE zip (the latest of all) and said nothing of the others, so gb stayed at the 1 Oct cycle while the AIP of 29 Oct waited in Downloads. Now **the latest zip of each set** is taken (by the date in its name, then the file's: an old download repeated does not pass the newest), and **a cycle published in advance does not pass the cycle in force** (the 26 Nov AIP is left, said `later: '2026-11-26'`, unless nothing else is there). The `taken` entry of the source stays ONE entry in the form the page reads (`zip` = the zip names put end to end with `+`, `size` = their sum, `files`, `bytes`, `cycle`) with `sets: [{ set, zip, size, cycle }]` inside; `zips: { nats: { name, size } }` is checked against today's plan (the same two values): another zip, or a set that arrived after the plan, refuses the source (`changed`, `not-shown`), nothing taken. **New**: `missing[]` carries `set`, `expected` and `have` (the cycle in place); the result carries `zones: { gb: { before, cycle, sets: [{ set, state, zip?, size?, have, cycle, later? }] } }`: `before` is the cycle in place (the AIP dates the zone, SOG-0077), `cycle` the one that results (a dry run says it before it is taken), `state` is `taken` | `waiting` (a dry run: it would be taken) | `in-place` (already there as it is: nothing written) | `missing`. This is what the zone's state (« AIP 29 OCT dans Téléchargements, non repris ») reads; `base/status` itself is not built (the spec of § 10.44 is the page's, the verb is the next lot).
- **`base/pickup` and the openAIP exports** (5 Nov 2026, SOG-0027): after the sources above, the exports of openAIP that the user downloaded
  from openaip.net into Downloads are taken for the requested zones that have a country code (`<country>_<layer>.<format>`, layer `asp`,
  `apt`, `nav` or `rpp`). The suite reads the **GeoJSON** export (`<cc>_<layer>.geojson`, what `aero_fetch` fetches): a GeoJSON file is
  written **as it is** under `data/sia/openaip/` (where `aero_fetch` writes, raw source, never committed); the **JSON** export (an array
  of objects, the geometry in each object) is **converted** to the same GeoJSON (geometry on the Feature, the rest as properties; the
  user's real `ci_rpp.json` gives its six VFR points); the **XML** export (openAIP 1.1, `OPENAIP DATAFORMAT="1.1"`) is another format
  that the suite does not read: it is **said** (`skipped: [{ zone, source: 'openaip', name, why: 'format' }]`, as is the `hot` layer,
  `why: 'layer'`) and the user is told to export GeoJSON or JSON. A copy named `kh_apt (1).geojson` is a duplicate: one file per country
  and layer, the latest. Refused, each with its code in `failed`: a file that is not JSON (`unreadable`), not a FeatureCollection
  (`not-geojson`) or not an array (`not-openaip-json`), over 200 MB, over 400 000 objects, or whose objects name another country than
  the file (`wrong-country`). `taken` gets `{ zone, source: 'openaip', zip: null, from: [files taken], files: [files written],
  converted: [files converted], unchanged: [already there], size, bytes }`. **No `missing` line** when there is no export: openAIP is the
  fallback behind the official sources, never something to drop by hand. **The plan shows what the real run takes**: the dry result
  carries `shown: { openaip: { name: 'openaip', size } }` (the total of the files it would take), to send back in `zips` (the key `openaip`
  is allowed); the real run refuses with `error: 'changed'` (a file arrived or changed) or `'not-shown'` (the plan showed none) otherwise.
- **The cycle of ENAIRE's sets is read in the file** (5 Nov 2026, SOG-0025): `LE_Amdt_A_2026_10_…_EnRoute.xml` is ENAIRE's 10th AIRAC
  amendment of 2026, **not** cycle 2610 — it is valid from 29 Oct 2026, cycle 2611. `tools/aero_cycles.py` reads the latest
  `gml:validTime › gml:beginPosition` (up to today) of the Airspace and EnRoute sets; `sources.enaire` is the newest of the two.
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

### Route computation: the jobs `route/compute` and `route/import-rad` (SOG-0081, alpha.5)

The route calculator of RouteSim 2 (E:/DEFA/rad: engine, FRA graph, procedures, vertical profile) runs on the workstation behind two launcher jobs; **the page never computes a route**. The engine is `tools/route_engine/` (copied from RouteSim 2 without change of substance, see its README: the lines that differ carry `SOG-0081`, so that the user's diffs apply as they are). Called like every job: `launcher.job('regen/job', { set: 'route', verb: 'compute', args })`, the result is `job.result`.

**`route/compute`** (≈ 2–10 s on the workstation: the base and the RAD are read at each call, nothing is cached between two calls). The request is **closed**: any other field, a wrong type, a bad code or a date that is not ISO 8601 is refused (400). Measured on the workstation (Windows, one process, base of 10 zones + the SIA procedures read at each call): LFPO → EIDW FL350, **3.5–5 s** for the proposed route alone, **≈ 7 s** with the alternatives; LFPG → LFMN with alternatives **8–9 s** (10 Nov 2026, noreg-independent measure, scratch script).

| field | type | meaning |
|---|---|---|
| `dep`, `arr` | string (1–4 signs) | aerodromes; **the aerodromes at the ends of `route` win** over these two fields |
| `route` | string (≤ 600) | the request: `LFPO SITET KEPAD EIDW`; the intermediate points are **mandatory passages**, in that order; in `mode: 'validate'` it is the route to check |
| `via` | string[] (≤ 8) or string | mandatory passages when `route` is not given |
| `fl` | integer | cruise level, FL010–FL660 |
| `date` | ISO 8601 | the day the cycles are taken at (default `2026-11-09T12:00`: **always send it**) |
| `mode` | `'calculate'` (default) \| `'validate'` | complete the request, or check the route as entered |
| `radius` | number | connection radius to the aerodromes, 1–100 NM (default 40) |
| `dep_runway`, `arr_runway` | string | imposed runways (empty: the engine compares the connected procedures) |
| `use_procedures` | boolean | use the coded SID / STAR of `data/proc` |
| `speed_kt`, `terminal_speed_kt` | number | ground speed in route (450) and on procedures (220) |
| `climb_fpm`, `descent_fpm` | number | rates (2000, 2000) |
| `allow_levels` | boolean | step changes allowed (default true: the strategy `adapt`) |
| `level_strategy` | `'natural'` \| `'adapt'` | vertical strategy |
| `alternatives` | boolean | ask for alternatives even when the first plan is accepted (they are always searched when it is rejected) |
| `alternative_levels` | integer[] (≤ 12) or `'190, 210'` | levels to try first (default: FL−020 by steps down to −200) |
| `enable_fra` | boolean | FRA links (default true) |
| `objective` | `'distance'` (default) \| `'fastest'` \| `'economical'` | what the calculation minimises (RouteSim 4: `planning.py`); `economical` needs `aircraft` with a fuel flow or the three `fuel_*` |
| `traffic` | `'IFR'` (default) | VFR (`vfr.py` of RouteSim 4) is **not ported**: refused (400) |
| `require_fra`, `unable_rnav` | boolean | force a route through an FRA / forbid the RNAV-only structures (incompatible together) |
| `fra_preference` | number 0–0.5 | weight of the FRA links in the cost (default 0.10) |
| `aircraft` | string (≤ 20) | an aircraft code of `AircraftDB/aircraft_perf.js` in the data folder (its fuel flow and ceiling) |
| `fuel_climb`, `fuel_cruise`, `fuel_descent` | number (kg/h) | fuel flows when no aircraft is given |

Result: `{ ok: true, plan, rad: { title, start } | null, fra: { start } | null }` or `{ ok: false, reason, message }` with `reason` `'invalid'` (the engine refuses the request: unknown point, level, speed…; `message` is the sentence to show), `'no-rad'` (no RAD imported: offer `route/import-rad`), `'failed'`.

`plan` = `{ primary, alternatives[≤ 3], alternative_message, alternative_failures[≤ 40], automatic_alternatives (the primary was rejected), alternative_attempts[≤ 40] { fl, strategy, route, errors[] }, input_route, via, dep, arr }`. `primary` and each alternative are the same shape (`assess` of the engine):

- `ok` (false: `status: 'CALCUL IMPOSSIBLE'` and `error`, **the imposed passages are never removed**), `status`, `generated`, `route` (text), `fl`, `date`, `dep`, `arr`, `distance_nm`, `via`, `via_checks[{ point, passed }]`;
- `issues[≤ 300]` `{ level: 'ERREUR' | 'REVUE' | …, text }`: a plan is **accepted** when `ok` and no issue has level `ERREUR`; the first errors are the ones to show;
- `legs[≤ 800]`: `{ start {id, lat, lon}, end, via ('DCT', an airway, a procedure token), kind ('AIRWAY' | 'DCT' | 'FRA' | procedure…), nm, lower, upper (ft), index, distance_start_nm, distance_end_nm, altitude_start_ft, altitude_end_ft, altitude_min_ft, altitude_max_ft, phase, speed_kt, speed_limit_ias, planned_speed_kt, node_constraints, direction, fra_area, from_role, to_role, fra_rows, procedure_id, procedure_name, runways, source_zone, source_cycle, compatible (bool), vertical_errors[], alerts[] }` — **the segments responsible for an error carry `compatible: false` and the exact reason in `alerts` / `vertical_errors`**;
- `profile`: `{ strategy, feasible, duration_min, max_altitude_ft, speed_kt, climb_fpm, descent_fpm, departure_ft, arrival_ft, climb_nm, descent_nm, holds[{ start_nm, end_nm, altitude_ft, fl }], points[…], note }`;
- RAD: `rad_source { file, title, start, end_exclusive, sha256 }`, `rad_atomic_rules`, `rad[≤ 100]` mentions `{ sheet, row, id, change, reason, validity, values[], strike_removed, assessment }` (**documentary leads, never established violations**), `rad_count` (the total when cut);
- `fra_source { file, start, sha256, points }`, `procedures_used[]`, `procedure_coverage`, `coverage[{ zone, cycle, segments }]`, `counts`, `checked[]` (what was checked), `gaps[{ name, reason }]` (**what is not checked: to be shown, « no incompatibility detected » only covers `checked`**), `limitation` (the sentence to show with the plan), `report` (the plain-text report, ≤ 120 000 signs), `truncated[]` (`'legs'`, `'issues'`, `'rad'` when cut).

**The cycles present** (SOG-0125, 10 Nov 2026): `route/import-rad` also writes **`data/route/index.json`** `{ rad: [cycles], fra: [cycles], at }` (read back from the compiled files, one date per workbook, sorted; `at` = the time of the import, UTC; committed with the books), and `aerodb.publication()` gives it as **`route: { rad, fra, at } | null`** (dates only, sorted, no duplicate, at most 60; `null` without the file, empty lists when it is damaged) — the page never opens the `.gz`. Books compiled before this change have no index until the next import.

Size: about 100–300 kB per plan (the profile points and the RAD mentions weigh most). The launcher keeps the last job in `tools/.regen_last.json`: the plan stays there until the next job.

**`route/import-rad`** `{ dry?: true (default), books?: [{ name, size }] }`: like `base/pickup`. The **plan** (`dry`) reads the EUROCONTROL workbooks of Downloads that follow `RAD_<cycle>_v….xlsx` and `eurocontrol-airac-<cycle>-fra-points-….xlsx` and answers `{ files: [{ name, size, kind: 'rad' | 'fra', cycle, title? }], failed: [{ name, error }] }`, writing nothing; the **run** takes only the `books` the plan showed (a file that is no longer the one shown is refused: `failed` `'changed'`; no `books`: `reason: 'not-shown'`) and compiles them into `data/route/rad.json.gz` and `data/route/fra.json.gz` (the same cycle is replaced, the other cycles stay: compiled data are never purged), one commit by the page's author; `{ ok, dry, files, taken, failed, rad: [cycles], fra: [cycles], commit, reason? }`. The workbooks are not copied. **Licence**: EUROCONTROL Network Manager documents, use by the company, published in its private repository only (terms of reuse to be confirmed): the source is in the catalogue (`eurocontrol_rad`, the Données Sources card says so); the page says it before the run.

**The form of the Fuel screen (`action`, 10 Nov 2026, request of Features SOG)**. When `args.action` is present, `route/compute` takes the screen's vocabulary and answers in the screen's shape (`tools/route_engine/view.py`); without `action` it is the engine's form above, unchanged (other callers). The request is closed in the same way (400 otherwise); FL is in hundreds of feet as above; `date` is **always sent**.

| field | meaning |
|---|---|
| `action` | `'compute'` (A → B with the imposed passages `via`) or `'check'` (the typed `route` as it is) |
| `adep`, `adest` | aerodromes (→ `dep`, `arr`) |
| `fl` | cruise level (hundreds of ft); **absent or `null`: 180** (the default of the engine, made explicit) |
| `rwyDep`, `rwyArr` | imposed runways (→ `dep_runway`, `arr_runway`; absent: the engine compares the connected procedures; the procedures are always on) |
| `date` | ISO 8601 |
| `via` | compute only: string[] (≤ 8) of ids, the **mandatory passages**, in order |
| `route` | check only: the text typed (≤ 600), controlled as it is (the engine's `validate`) |
| engine's fields | `radius`, `speed_kt`, `terminal_speed_kt`, `climb_fpm`, `descent_fpm`, `allow_levels`, `level_strategy`, `alternative_levels`, `alternatives`, `enable_fra` keep their meaning; `raw: true` adds the engine's own `plan` to the answer |

Answer: `{ ok, alternatives, segments, issues, rad, fra, report, message, gaps, limitation }` (or `{ ok: false, reason, message }` as above):

- `alternatives[≤ 3]` — compute: the proposed route first when it is accepted, then the engine's alternatives; check: **one** alternative, the typed route. Each: `{ id ('alt1'…), name, route (text), distanceNm, fl, profile: [{ nm, ft }] (thinned to ≤ 200 points), sid: { id, name, runway } | null, star: idem, faults, segments }`. `id` of `sid` / `star` is the AeroDB identifier of the procedure (`LFPO.SID.ELCOB2Q.RW24`); `faults` = the number of segments in error (or of engine errors when more); `name` is **built from the legs**: « Via N160 · A34 » (two airways at most), « Direct FRA », « Direct », followed by « · FL… » when the level differs from the one asked.
- `segments` — those of the first alternative (the proposed or the typed route): `{ from, to, via ('DCT', an airway, a procedure token), state: 'ok' | 'error', reasons: [{ kind, text, ruleId?, deltaFt? }] }`. The `text` is the engine's own (French); `kind` is **read from that text**, nothing is invented: `RAD` (with `ruleId`: the rule of the book), `floor` / `ceiling` (profile under the floor / over the ceiling, `deltaFt` = the gap), `FRA`, `direction` (a one-way segment flown against its direction), `continuity` (not in AeroDB), and `altitude` for everything else (procedure constraint, level…).
- `issues[≤ 300]` — `{ level: 'error' | 'review', text, kind? }` (the engine's `ERREUR` is `error`, everything else `review`). When the engine finds **no plan** (imposed passages impossible), `alternatives` is `[]` and the first issue says why.
- `rad`, `fra`, `gaps`, `limitation`: as in the engine's form: **always show `limitation` with a plan**.

**Procedure ids**: `sid.id` / `star.id` are the `id` of the procedure record of `data/proc` **verbatim** (never shortened: the transition suffix, if the record's id has one, is kept), the same string as the procedure sheets of AeroDB. **Reasons**: `vertical_errors` and `alerts` of a leg are the same list at the start (a ceiling or floor error is in both), the RAD and direction texts are added to `alerts`: reading `alerts` loses nothing.

**Deviation from the screen's spec** (to settle with Features SOG, nothing blocks): `check` makes the engine run **without** limiting the entered route (`via` is empty in validate mode: the engine's previous behaviour refused a typed route of more than 8 non-airway points, which a route typed by a pilot often is); the controlled route is the typed text.

**RouteSim 4 port (10 Nov 2026, 15 h)**: the engine, `fra.py`, `procedures.py` and the new `planning.py` are RouteSim's of 14 h 45, copied as they are (only the lines marked `SOG-0081` / `SOG-0078` differ: relative imports, the data paths, the airway direction); `plan.py` follows the new `server.plan()` (forced FRA candidate, search budget 25 s, objective sort, `search`). What changed for the screen: **nothing in the shape of `alternatives`, `segments`, `issues`** (the view reads `legs`, `issues`, `profile`, `procedures_used`, which keep their form). What was added to `assess()` and the plan, **ignored by the screen's view** unless it asks (`raw: true`): `fra_stats { segments, distance_nm, areas, bands[] }`, `planning { objective, traffic, require_fra, unable_rnav, fra_preference… }`, `estimate { duration_min, fuel_kg (null without flows), phase_minutes, fuel_model }`, `objective_score`, the leg's `procedure_airport`, an alternative of kind `FRA · <area>` (a forced-FRA candidate is searched first), the plan's `search { algorithm, last { expanded, seconds, found, truncated }, total_seconds }`. The search is an A* with non-dominated altitude labels: **6 s or 100 000 states per search, 25 s per plan**, then the plan says that the search is not exhaustive. When no route exists the message is « Aucune route trouvée sur le réseau disponible à ce niveau… Aucun DCT intermédiaire n'a été inventé » (the imposed passages are still never removed). Not ported, out of the engine: `vfr.py` (VFR planning), `web/modes.js`, `server.py` routes.

**What the engine reads**: `data/sia/base/*/<cycle>/{aeroindex, points, navaids, airways}.json` (every zone whose cycle is at most `date`: the airways of the zones that have none are absent from the network, said in `coverage`), `data/proc/manual/<ICAO>.json` and `data/proc/<cycle>/` (SID / STAR, `status: 'doubt'` excluded), `data/route/rad.json.gz` and `fra.json.gz`. Nothing is written by `route/compute`.

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

### Loading positions of the pelicandromes: the job `pelican/import` (SOG-0083, alpha.5)

The user's file `pelicandromes_positions.yaml` (schema `pelicandromes` v1, WGS84; per site `nom`, `oaci`, `categorie`, `latitude`, `longitude`, `statut`, `source`; « position de chargement uniquement si vérifiée manuellement, ne pas utiliser pour la navigation réelle ») is imported from Downloads into **`data/pelicandromes/<country>.json`**, published in the data repository (one commit by the page's author, only the compiled file; the YAML is not copied). Called like every job: `launcher.job('regen/job', { set: 'pelican', verb: 'import', args })`.

`args` (closed): `{ dry?: true (default), country?: 'fr' (2 letters, default 'fr'), file?: { name, size } }`. The file is found **by the pattern** `pelicandromes_positions*.yaml` in Downloads (the latest; a `.yaml.pdf` copy does not match), never by a path from the page. The plan (`dry`) reads and checks it and answers without writing; the take needs the `file` the plan showed (`not-shown`, `changed` otherwise).

Result: `{ ok, dry, file: { name, size, sha256 } | null, sites, categories: { <category>: n }, rejected: [{ index, error }], written, commit, reason?, message? }`; `reason`: `no-file` (with `expected`: the pattern), `invalid` (not a readable pelicandromes file: `message` says why), `not-shown`, `changed`, `failed`. On this workstation's file: 32 sites, 26 `principal`, 2 `temporaire`, 1 `mobile`, 1 `projet`, 1 `outre-mer`, 1 `à confirmer`, none rejected.

**The compiled file**: `{ schema: 'pelicandromes', version: 1, country, datum: 'WGS84', note, source: { name, size, sha256 }, sites: [{ name, icao, category, lat, lon, status, source, country }] }`. `country` is on the file **and on each site** (the next countries come as `<country>.json` with the same shape). Nothing is timestamped: the same file gives the same bytes, a second take writes nothing and makes no commit. `category` and `status` are free short texts (the categories of the file are not a closed list); a site is rejected, with its index, when its name is missing, its position is missing, not a number or out of range, or its OACI code is not 2–4 letters or digits.

**The file is the user's, so untrusted like everything in `data/`**: at most 256 kB (before it is read), UTF-8 text, at most 500 sites; a reduced YAML grammar of the standard library (one document, scalars, **one list of flat records**: anchors, tags, `{ }` / `[ ]`, `|` / `>` blocks, tabs, nesting and duplicate keys are refused with the line); numbers finite and bounded (latitude ±90, longitude ±180, 7 decimals), booleans and `NaN` are not numbers; texts without control characters, **without `<` or `>`**, blanks collapsed, 200 signs at most. **The consumer sets the texts with `textContent`, never as HTML.** The positions are loading positions checked by hand: the note travels with the file, to be shown wherever they are.

The Map layer (beta.1) is BUGS SOG's: it reads `data/pelicandromes/fr.json` through the data repository like the other published data; no AeroDB API reads it yet.

### The state per zone and « Mettre à jour »: the verbs `base/status` and `base/update` (SOG-0071, V3 § 10.44, alpha.5)

Both are launcher jobs like the others (`launcher.job('regen/job', { set: 'base', verb, args })`, `job.result`). The launcher holds ONE job at a time: **`base/status` is refused (409) while a build runs**; the state `building` is the page's (it reads `job.data.zones` of the running job), never in this answer.

**`base/status`** `{ zones?: [ids] (1–60; default: the zones the base publishes), personal?: [sources] }` — one call, nothing written, under a second:
`{ ok, current (the cycle in force), parserVersion (what the build page builds with), counts: { <state>: n }, zones: { <zone>: { state, reason, reasons, buildable, builtCycle, expectedCycle, parserVersion } } }`.

- `state`: `up-to-date` | `stale` | `never-built` | `failed`. A zone with no folder in `data/sia/base/<zone>/` is `never-built` (a zone the pilot ticked and never built).
- `reasons`: `[{ code, … }]` in this order, `reason` = the first (`null` when up to date); `buildable`: a build would change something. The codes and their parameters:

| code | parameters | buildable | meaning (the page's words, four languages below) |
|---|---|---|---|
| `never-built` | — | yes | no built folder |
| `failed` | `error` | yes | the last build of this zone failed (kept until the next one succeeds) |
| `pickup-waiting` | `source`, `set?`, `cycle?`, `zip` | **no** | a file of Downloads is not taken yet (`base/pickup` takes it, the plan first): NATS one set at a time (AIP, OBS, UAS), the SIA zip whose cycle is newer than the one held |
| `source-newer` | `source`, `cycle`, `built` | yes | the dated source (SIA, NATS, ENAIRE) is of a cycle newer than the build |
| `inputs-changed` | `count`, `names` (3 first) | yes | a source file of the zone changed (by hash) since the build read it |
| `parser-old` | `built`, `current` | yes | built by an older parser (`parserVersion` of its `meta.json` under the build page's) |
| `files-missing` | `count` | yes | files missing in the built folder |
| `source-old` | `source`, `cycle`, `current` | **no** | the dated source is older than the cycle in force: a newer file is to be fetched or dropped |

A zone **without a dated source is never stale by the cycle** (openAIP-only countries: an AIRAC change is nothing for them). `up-to-date` has no reason at all. On this workstation (10 Nov): 45 zones built, all `parser-old` (built at parser 21, current 22: the direction of the airways); gb `pickup-waiting` (AIP and OBS of 29 Oct) then `source-old`.

**What the build read** is kept apart: **`data/local/build/<zone>.json`** (local to the workstation, never published, written by `base/build` after each zone): `{ zone, cycle, builtAt, parserVersion, personal, inputs: { <name>: { size, mtime, sha256 } }, failed?: { error, at } }`. `inputs-changed` compares hashes (a file is hashed again only when its size or date moved), so a file rewritten with the same content is not a change. A zone built **before** this record exists is judged on its cycles, parser and files only (no `inputs-changed` until its next build).

**`base/update`** `{ zones, personal?, fetch?: true }` — « Mettre à jour »: (1) `base/fetch` of the zones (only what changed), (2) the state, (3) `base/build` of **the zones that are not up to date and buildable**, (4) the state again. Result: `{ ok, fetched: { ok, fetched, unchanged, failed, manual } | null, before, upToDate: [zones], waiting: [{ zone, reasons }], notBuildable: [zones], built, failed, build: { ok, reason?, cycle, cycles, folders, commits, seconds }, after, nothing, reason? }`. **Idempotent**: when nothing moved `nothing` is `true` and no browser starts. **The pickup is not done by the update**: a file in Downloads is shown (`base/pickup` plan) then taken by the pilot's answer, so the file shown is the file taken (Sécurisation's rule); a zone that waits for it is in `waiting`. The job's `phase` (`fetch`, `status`, `build`, `done`) is in `job.data.phase`; the build's per-zone progress is in `job.data.zones` as for `base/build`. **« Tout recalculer »** stays `base/build` on the whole selection.

**The reasons in the pilot's words** (the page writes them with `K.t`; `{…}` are the parameters, dates written as « 29 OCT »):

| code | fr | en | de | es |
|---|---|---|---|---|
| `never-built` | Jamais construite | Never built | Noch nie erstellt | Nunca construida |
| `failed` | Dernière construction en échec | Last build failed | Letzter Build fehlgeschlagen | La última construcción falló |
| `pickup-waiting` | {set} {cycle} dans Téléchargements, non repris | {set} {cycle} in Downloads, not taken yet | {set} {cycle} in Downloads, noch nicht übernommen | {set} {cycle} en Descargas, sin tomar |
| `source-newer` | Source {source} du {cycle} plus récente que la construction du {built} | {source} source of {cycle} newer than the build of {built} | Quelle {source} vom {cycle} neuer als der Build vom {built} | Fuente {source} del {cycle} más reciente que la construcción del {built} |
| `inputs-changed` | {count} fichier(s) source modifié(s) depuis la construction | {count} source file(s) changed since the build | {count} Quelldatei(en) seit dem Build geändert | {count} archivo(s) fuente modificado(s) desde la construcción |
| `parser-old` | Construite avec un ancien analyseur (v{built}, actuel v{current}) | Built with an older parser (v{built}, current v{current}) | Mit einem älteren Parser erstellt (v{built}, aktuell v{current}) | Construida con un analizador antiguo (v{built}, actual v{current}) |
| `files-missing` | {count} fichier(s) manquant(s) | {count} file(s) missing | {count} Datei(en) fehlen | faltan {count} archivo(s) |
| `source-old` | Source {source} du {cycle}, cycle en vigueur {current} : un fichier plus récent est à déposer | {source} source of {cycle}, cycle in force {current}: a newer file is to be dropped | Quelle {source} vom {cycle}, gültiger Zyklus {current}: neuere Datei ablegen | Fuente {source} del {cycle}, ciclo vigente {current}: falta un archivo más reciente |

### The ground read after the procedures (SOG-0135) and the world forecast job `weather/world` (SOG-0138)

**Ground after the procedures** (10 Nov 2026): « on ne va pas créer un bouton en plus: si on décolle ou qu'on se pose, on va devoir rouler ». When `AeroDb.fetchProcedures(icao)` succeeds, the ground layer of the same aerodrome is read **right after**, in the background (`fetchGround`, the same OpenStreetMap reading, about 30 s), **only if** `proc/ground/<ICAO>.json` is missing or dated before the cycle in force. The procedures' answer does not wait for it and is never changed by it: a ground read that fails (launcher busy, too soon, nothing in OpenStreetMap) is silent. The end of the ground read is announced as before, `on('change', { ground: icao })`; `ground(icao)` then returns it. `fetchProcedures(icao, { ground: false })` skips it. The panel's own ground button is not needed any more (BUGS SOG removes it); `fetchGround(icao)` stays for a direct gesture.

**`weather/world`** `{ action?: 'build' (default) | 'status' }` (launcher job, `launcher.job('regen/job', { set: 'weather', verb: 'world', args })`): the world synoptic forecast of the Atmosphere module is made on the workstation. Until now `tools/build_world_weather.py` ran only in the Pages workflow at deployment: on the workstation nothing ran it, so the map had no world layer.
- **What the tool reads**: NOAA GFS 1° through NOMADS (the GRIB filter, no key, no quota), decoded by `tools/grib2_lite.py`, brought to a 5° mesh (2 376 places), one file per 3-hour step from the current step to +72 h (25 steps) plus a second file of the pressure levels per step. **Weight of a publication: 17.1 MB, 51 files** (an index of 2.9 kB, 25 step files and 25 pressure-level files), measured on 9 Nov 2026 (run 06Z).
- **Where**: **`data/local/weather/world/`** (`index.json` and the step files, same layout as the Pages publication): under `data/local/`, which is local to the workstation, **never synchronised nor committed** (a 17 MB publication every six hours has no place in the git history; it is regenerable and served under `/data/local/weather/world/` by the launcher). The frame's `weatherStore.world()` reads `<root>/weather/world/` today: it must also try `<root>/data/local/weather/world/` when the first is absent (a one-line change of `frame/lib/weather_store.js`, not made here).
- **`build`**: runs the tool in a work folder under `data/local/weather/`, **checks** what it wrote (an index of schema 1 and model `gfs`, at most 25 steps, file names of the tool's own pattern only, no sub-folder nor link, every file the index names present, at most 51 files and 40 MB), then replaces the publication in one move; the previous publication is given to the tool (`--keep`): **the same GFS run is not asked of the NOAA again** (second call on the same run: 13 s instead of 128 s). 15 minutes at most. One start per ten minutes (`too-soon`, 429).
  Result `{ ok, kept (the previous publication was reused), exists, run (ISO, the GFS run), built, step, times: [first, last step], steps, files, bytes, age, seconds }`; `reason`: `no-run` (no run published or the NOAA unreachable: the old publication stays), `invalid` (the folder is not a valid forecast: nothing replaced), `timeout`, `cancelled`, `failed`.
- **`status`**: the same fields from the publication in place (`exists: false` without one); no network.
- **For Données** (the line « Synoptique monde (GFS) »): `status` for the run, the age and the weight, `build` for the gesture. The map shows the layer as soon as a publication exists.

### Country packs and thematic filters: `AeroDb.packs()` (SOG-0065, V3 § 10.42, alpha.5)

`frame/aerodb/packs.json` (11 kB, made by `python tools/build_aero_packs.py`, from Natural Earth v5.1.2, public domain, and hand lists) and **`await aerodb.packs()`**, read once, frozen: `{ generated, source, regions: [pack], themes: [pack], packs: [pack] }` — **`packs` is the contract with Réglages' rows: one list, regions then themes, `kind: 'region' | 'theme'`, `date` and `source` on each pack** (`regions` and `themes` are the same packs by kind) — with `pack = { id, kind, date, source, names: [fr, en, de, es], zones: [zone ids], partial?: [zone ids], empty?: 'no-zone-no-source', basis }`. Zones the list of zones does not know are dropped, names cleaned (no control sign, no `<` `>`), 60 packs and 250 zones each at most; `null` when the file cannot be read (the next call tries again). Nothing is built or published by a pack.

- **Two levels, never mixed.** **A pack is a list of zone ids**, static, many-to-many (Turkey is in `middle-east` and `mediterranean`; `fr`, which carries its overseas territories, is in several). **A theme is a filter**: the zones that touch an object; it shows which zones to add and adds none.
- **The 22 packs (`regions`)**: 18 from Natural Earth's `SUBREGION` (`north-america` 5 zones, `central-america` 26 with the Caribbean, `south-america`, `europe-north`, `europe-west`, `europe-south`, `europe-east`, `africa-north`, `africa-west`, `africa-central`, `africa-east`, `africa-south`, `middle-east` 19, `asia-central`, `asia-south`, `asia-east`, `asia-southeast`, `oceania`), 3 hand lists (`mediterranean`, the riparian states; `australia-indonesia`; `arctic`, whose `partial` says the zones that are whole countries only partly inside the circle: ca fi no ru se us) and **`antarctica`, empty** with `empty: 'no-zone-no-source'` (no zone and no data source today: Données lists it as empty with its reason). Every zone is in at least one pack except the oceanic `nat`.
- **The 6 themes**: `islands` (37 zones: the island states, a hand list), `himalaya` (bt cn in np: the zones that Natural Earth's HIMALAYAS polygon touches), `deserts-steppes` (46: the Natural Earth « Desert » regions of scale rank 3 and above, without PUNJAB and CAATINGAS which it classes as deserts but are not, plus the Kazakh and Pontic steppes), `forests-jungles` (23: sets of countries by hand: Amazon basin, Congo basin, Borneo and Sumatra, boreal belt: Natural Earth has no forest layer), `lakes-rivers` (44: the 24 largest lakes and the 13 main rivers of Natural Earth 110 m crossed with the zone outlines), `megacities` (29: the cities of the base's `cities_major.json` of 5 million and more, **the city without its agglomeration** (Tokyo 9.7 M, Cairo 9.6 M), so 5 M is what gives the agglomerations of more than ten million; Kinshasa is given to `cd` by hand, the two capitals face to face on the river overlap in the simplified outlines). **Each list says its `basis`**; what is a desert or a jungle is the choice of that file, to be reviewed by the user once.
- **For Données**: the rows (a pack: its name, its size = the sum of the published sizes of its zones, « Ajouter tout » = `addZone()` on each id, then the ordinary download and build, a zone already added is said and never duplicated; a theme: a filter that ticks the zones) are Réglages'. Regenerate the file after a change of the zone list (`tools/build_aero_zones.py`) or of the base's cities.

### Airways by country: what is published, from which source, and who has none (SOG-0077, answer of 10 Nov 2026)

The question (the user): « a-t-on les AWY pour d'autres pays que la France et l'UK ? Si non, il faut trouver une source ». **Measured** on this workstation's `data/sia/base/<zone>/<cycle>/airways.json` (218 zones known, 45 built):

| zone | source | segments / routes | cycle of the folder | state |
|---|---|---|---|---|
| `fr` | SIA, AIXM 4.5 (`Rsg`) | 1 493 / 425 | 2026-10-29 (and 2026-10-01) | published, with the direction `dir` after the next build |
| `gb` | NATS, AIXM 5.1 (`EG_AIP_DS`) | 1 217 / 220 | **2026-10-01 only**: the 2026-11-26 folder has 0 (built without the NATS file declared « personnel ») | needs the AIP of 29 Oct taken from Downloads (SOG-0126) and a build with « personnel » |
| `es` | ENAIRE, AIXM 5.1 (`LE_…_AIP_DS_FULL_EnRoute.xml`) | **903 / 153** | **2026-10-01 only**: the 2026-10-29 folder has 0 | published once; the file is not on the workstation any more, so the current cycle has none |
| `ie` | AirNav Ireland, eAIP ENR 3.3 (geojson, `tools/airnav_eaip.py`) | 0 | — | the reader exists (K70, K71), no airways built yet |
| the other 41 built zones | — | 0 | — | **no airways source is read for them** |

So **yes, Spain** (903 segments, 153 airways, built on 1 Oct) as well as France and the UK; Ireland is readable but not built; **nowhere else**. Readers exist for four dated sources (SIA, NATS, ENAIRE, AirNav) and for X-Plane's `earth_awy.dat` (global, read by the page only: the X-Plane folder is a handle held by the page, and the launcher build refuses it). openAIP and the FAA files the suite reads carry no airways.

**Candidate sources for the countries that have none** (research of 9 Nov 2026; « opened » = fetched; what could not be opened is said unverified, never assumed):
- **United States**: the FAA **NASR 28-day subscription** (cycle 2026-10-29 opened: `AWY.zip`, `ATS.zip`, the CSV set with `AWY_BASE.csv` and `AWY_SEG_ALT.csv`, and `aixm5.1.zip` with the airways, under `nfdc.faa.gov/webContent/28DaySub/`; the zips answer, I did not unzip them). No licence wording on the page (US government data: public domain is an inference to confirm). A CSV reader is small. **Best candidate.**
- **Germany**: **DFS « AIP Datasets »** (`aip.dfs.de/datasets`), dataset **ED Routes** in **AIXM 5.1** (Route, RouteSegment, StandardLevelColumn), **CC BY 4.0** for DFS's own data (credit DFS; free; the terms PDF opened). The AIXM 5.1 reader that reads NATS and ENAIRE should read it with little change; the download path is in DFS's REST documentation (not decoded). **Second candidate.**
- **Norway**: Avinor announces an AIXM 5.1 service with ATS routes; today the eAIP HTML is open, the AIXM data is for subscribers (not live). **Italy** (ENAV, eAIP after a free registration; an AIXM 5.1.1 WFS is mentioned in a search result only) and **Turkey** (DHMI: AIXM 5.1 datasets mentioned in a third-party presentation): **unverified**.
- **eAIP HTML or PDF with the route pages (ENR 3) opened, no machine-readable file**: Portugal (HTML; copying and redistribution only by prior agreement with NAV Portugal), Thailand (HTML), Denmark (PDF, not read), Iceland, Canada (NAV CANADA AIP Part 2 ENR is a PDF; the ENR file of the page answered 404 today), Nepal, Jordan: a table reader per State (the suite reads the SIA eAIP pages for aerodromes only).
- **Unverified or nothing found**: Belgium, Netherlands, Sweden, Switzerland, Morocco, Algeria, Philippines (portals that blocked the fetch or did not resolve), Cyprus, Egypt, Lebanon, Tunisia, Israel, Indonesia, Fiji, Cambodia, Myanmar, Pakistan, Vietnam, India (no ENR 3 page located).
- **Consolidated or default datasets**: EUROCONTROL's route network data is free for R&D only, after an account and its terms (no redistribution); ICAO: nothing found; **X-Plane `earth_awy.dat`** is a global airway file (the page already reads it) but its redistribution terms for X-Plane 12 are unconfirmed (the legacy format specification speaks of a GPL freeware header derived from DAFIF, for X-Plane 10 and earlier): read the first line of the file for its source and copyright before publishing anything derived from it.

**Proposal** (to be decided by the ergonomics session and the user): (1) the **DFS** AIXM 5.1 « ED Routes » (CC BY, the reader exists) and the **FAA NASR** CSV (a small reader) as new sources of the catalogue, in that order: they cover Germany and the United States, the two largest airway networks after France and the UK; (2) rebuild `gb` and `es` for the current cycle (the NATS AIP of 29 Oct is in Downloads: SOG-0126; the ENAIRE file has to be downloaded again); (3) AirNav Ireland: build `ie` (the reader exists); (4) for the rest, the global X-Plane file as a **personal local** source only, until its terms are read.
