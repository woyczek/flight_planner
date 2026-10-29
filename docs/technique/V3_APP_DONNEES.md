# V3 — the dedicated data application "Données" (iOS, Android): project file

*Project file of 26 October 2026 (relay of the cloud, aerodb role). A **separate project**: no lot is open, nothing is
coded. It opens when the user says "go". It is the second step of `V3_SPECIFICATION.md` § 10.19; the first step is the
screen on the workstation, [V3_DONNEES_REGENERATION.md](V3_DONNEES_REGENERATION.md) (§ 10.18). Facts were read in the
code of `v3` at `84c6ddb06` or measured on 26 October; what could not be verified is marked **to check** or **to
measure**, with what it decides.*

User, 26 Oct: « L'appli est en bonne voie. On peut imaginer une appli dédiée au parsing et à la compilation de toutes ces
données : iOS, android. Chantier dédié. »

## 0. In short

- **Goal**: fetch, parse, compile and publish the aeronautical data from a phone or a tablet, so that the AIRAC day
  (every 28 days; the next, 2611, takes effect on 29 October 2026) no longer needs the workstation.
- **Idea**: the application is **the Data screen on another runner**. The screen and its contract
  ([V3_DONNEES_REGENERATION.md](V3_DONNEES_REGENERATION.md) § 2.8) do not change; the launcher runner (Python, the
  workstation's disk and git) is replaced by a *device runner*: fetch by the native shell, compile by the pure
  JavaScript builders of lot D5, push by the frame's `github` transport and the device's token.
- **What decides the project** (§ 2, in this order): (1) the **builders in JavaScript** and their memory on a phone — the
  base's compile is JavaScript already but tied to a page, and 71 MB of XML must pass through a phone; (2) the **network**:
  the sources send no CORS header (verified for two), so a web view cannot read them — only a native shell can — and the SIA
  ZIP needs an account, a cart and a licence: a human gesture; (3) the **PDF rows** (eAIP, VAC) have no JavaScript twin
  proven, and the **publication** of 47 MB of procedures through the GitHub API has limits to measure.
- **Proposal**: measure before building (§ 5, lot P0 needs next to no new code), start **inside Pilote** behind the Administration
  button to get real numbers with no new chain, then split into a dedicated shell if the numbers or the audience ask for
  it. Question 2 to the user.
- **v1 scope proposed**: the SIA base (fr, then the zones that need no PDF), NAT, FAA CIFP. Renounced on a phone: the
  aircraft types, the VAC extraction, the eAIP — shown as "computed on the workstation", with their published state.

## 1. Purpose and scope

**Who**: the owner and the administrators of the data repository — a handful of people, not the pilots. Distribution to
that group only (TestFlight internal testing on iOS; internal testing or an APK on Android); no public store listing is
planned.

**A day with the application** (the same screen as on the workstation): the owner orders the SIA ZIP in the phone's
browser (Safari or Chrome: account, cart, 0 €, licence), opens the application, sees "AIRAC 2611 in force: base 2610,
procedures 2610", presses **All**: the application asks for the ZIP (file picker), fetches the FAA file and the NAT
message, compiles the zones, publishes to the data repository with the device's token, reports counts and warnings. The
Pilot application on any phone reads the new cycle at its next synchronisation.

**Out of scope for v1**: anything that needs `pypdf` (§ 2.4), the aircraft types (scrapers, caches: 1,495 lines of Python),
GeoNames towns, the world weather (Actions own it), the MORA *full* computation of large zones (tens of thousands of
terrain tiles from a phone), zone contours and code generators. Each of these keeps its place on the workstation and its
row on the screen, greyed with the reason.

## 2. Implications to study first

For each: what the code already says, what is to measure, what it decides. The first column of the tables is the order of
the measurements of § 5.

### 2.1 Python builders to carry to JavaScript

| Builder (lines) | What it reads → writes | JavaScript twin today | To port | Phone verdict, to confirm |
|---|---|---|---|---|
| `tools/proc_cifp.py` (298) | `FAACIFP18` ARINC 424-18, 132-column records, 396,924 records → 3,071 files, 47 MB | none | all of it (offsets are in `frame/aerodb/DECISIONS.md` 25 Oct) | yes, if the 53 MB inflated text streams (§ 2.2); golden test = the 2610 tree produced by the Python (3,071 files) |
| `tools/aero_fetch.py` (361) + `ukmil_aip.py` (255) + `navcan_dah.py` (402) | HTTP, paging of the ArcGIS service, page scraping, hand-written PDF stream readers → GeoJSON, XML, JSON | none (the page never downloads these) | the fetchers; the two PDF readers use `zlib`, whose twin is `DecompressionStream` | fetchers: yes with native HTTP (§ 2.3); UK Mil and NAV CANADA: low priority |
| `shared/sia_base.js` (2,711), `aero_sources.js` (1,147), `carto/aero_symbols.js` (1,139), `aar_tracks.js` (577), `zip_store.js` (183), `airac.js` (169), `aero_zones.js` (550) | SIA XML, AIXM 5.1, GeoJSON, OpenAir, X-Plane, ZIP → the zone files | **they are the JavaScript** | cut the page out (`window`, scripts injection, IndexedDB, folder handles) and keep the parsers: lot D5 of the screen document | yes in principle; the cost is memory (§ 2.2) |
| `tools/vfr_import.py` (263) | `vfr-compiled.json` → `sia/vfr/` (check, plan, write) | none | all of it (JSON in, JSON out) | importer yes, **compiler** (`tools/report-vfr`, 531 lines + pypdf) no |
| `tools/proc_sia.py` (420) | the eAIP pages and PDF coding tables (141 aerodromes, ≈ 100 MB of pages) → `proc/` | none | the parsers of the rows of text (pure); `rows_from_pdf` needs a PDF text reader | see § 2.4 |
| `AircraftDB/update_aircraft_db.py` (1,495), `update_fleet.py` (92) | Doc 8643, APD pages, SimBrief list, Airframe DB, Wikidata → the aircraft base | none | not in v1 | no |
| `tools/data_sync.py` (1,002) | git: commit the pool, fetch, merge card by card, push | the frame's `github` transport does the *push* side | nothing to port: the application writes published files only, never pool cards | replaced (§ 2.4) |
| `tools/build_world_weather.py` (321) + `grib2_lite.py` (161) | GFS GRIB → site files | none | no: GitHub Actions | no |

### 2.2 Reading the SIA ZIP in the browser: sizes, stream, memory

- **Sizes** (26 Oct): the ZIP of AIRAC 10/26 is **5.6 MB** (the SIA product page); it holds `XML_SIA_2026-10-01.xml` 27 MB
  and `AIXM4.5_all_FR_OM_2026-10-01.xml` 44 MB (`SIA_XML_INTEGRATION.md` § 1, same cycle): 71 MB inflated, a ratio of about
  13. The FAA CIFP ZIP is 9.1 MB (measured), its `FAACIFP18` 53 MB.
- **What the code does**: `ZipStore.read` holds the whole archive as one `Uint8Array` and inflates **one entry at a time
  into one buffer** (`DecompressionStream`, then `arrayBuffer()`): 5.6 MB then 44 MB for the biggest entry; the parsers then
  work on a **string** of that size. Most of them cut strings by tag (`parseXmlSiaAirspaces` documents ≈ 40 ms for 27 MB,
  `parseAixmObstacles`, `parseAixm`); the exceptions are `parseAixmAirspaces` — a `DOMParser` on the whole 44 MB AIXM 4.5
  text (`sia_base.js`, in `build`) — and the AIXM 5.1 reader (`aero_sources.js` `aixm5`, also a DOM, for the ENAIRE sets).
  A DOM of 44 MB of XML is the expensive step.
- **To measure** (M1, M2): time and heap of each step on two real phones, at the ZIP of 2610: `ZipStore.read` + inflate,
  decode, each parser, the DOM step alone, the whole build; peak heap; whether the web content process survives (iOS may
  end it silently under memory pressure — **to check** the limit on the phones the owner uses). Reference points: the desktop
  base build "a few seconds" (`MANUEL_ADMINISTRATEUR.md`); a base of ≈ 60 MB "read in 3 s" (`DONNEES_AERO_ETRANGER.md`); the
  aerodb benches use a CPU ×4 throttle as "phone-like" (a question on Paris: 30 ms → 120 ms).
- **Options if it does not fit**: (a) replace the DOM step by tag splitting like its siblings (a test: same airspaces as
  the DOM reader on the real file); (b) stream: `DecompressionStream` piped through a `TextDecoder` in chunks, cut at
  `</Rsg>`, `</Obs>`, `</Rwy>`, `</EspaceS>` boundaries, never holding the whole text; (c) split by zone: only France needs
  the 71 MB — the other zones read small files.
- **Where it runs**: a Web Worker (the page stays responsive, the heap is the worker's); `File`/`Blob` from the picker, never
  copied into IndexedDB (5.6 MB, kept only if the user asks to resume).

### 2.3 The network from a phone: CORS, CSP, accounts, background

- **CORS** (a request with an `Origin` header, 26 Oct): `aeronav.faa.gov` (CIFP) and the SIA eAIP answered **with no
  `Access-Control-Allow-Origin`**; `s3.amazonaws.com/elevation-tiles-prod` answers `*`. `api.github.com` is known to allow
  any origin (`APPLI_AUTONOME.md` § 6). The other sources (openAIP's S3, `nms.aim.faa.gov`, GeoNames, `aidu.mod.uk`,
  NAV CANADA, ENAIRE, DIRCAM) are not reachable from the container: **to check** from a browser.
- **In a native shell** the request can leave through the platform's HTTP stack instead of the web view's, which has no
  CORS rule — Capacitor documents a native HTTP option (**to check** in the pinned version, `@capacitor/core` 6.1.2: setting,
  behaviour with binary bodies and streaming, redirects, size). If it holds, the project's biggest obstacle is lifted on
  the phone, and only there: a Safari home-screen page keeps every limit.
- **CSP**: the application inherits the page policy (`tools/csp_policy.py`, `connect-src` is a fixed list of origins, a meta
  tag added by `build_pages.py`). Every source host would be added: a security decision per host, recorded in
  the audit documents' way (`AUDIT_SECURITE_2026-10-07.md` M2).
- **Accounts and gestures**: the SIA ZIP is an order (account, cart, licence). The application can only open the right page
  (`donnees-aeronautiques-xml-airac-<nn>-<yy>.html`, answers 200 before the cycle, 26 Oct) and take the file. **To check**
  on iOS and Android: the store's pages and the download of a ZIP in the phone's browser, then the file picker of the
  application (iOS Files, Android document picker) finding it.
- **Background**: a job needs the foreground and a screen that stays on. **To check**: a keep-awake plugin for both
  platforms; that the phone's lock during a job leaves a resumable state (§ 3: each file is its own step).
- **Cost**: the eAIP for 141 aerodromes is ≈ 100 MB of pages (2.3 MB menu + 0.7 MB a page + PDFs); the FAA zip 9.1 MB; a
  cellular plan matters: the screen shows the volume before "All" on a phone.

### 2.4 Publishing through the GitHub API, and the PDF rows

**Publishing**

- **What exists**: the frame's `github` transport (`frame/store/transport_github.js`) reads the head and the recursive tree,
  and commits **a whole batch in one commit**: one `POST git/trees` with every file's text inline, a commit, a
  fast-forward of the branch without force; a branch that moved gives a conflict the data layer resolves by pulling and
  pushing again. The token is the device's fine-grained token (`device/keys.json`, never synchronised, never in a backup).
- **What a publication weighs**: the 13-zone base 17–19 MB a cycle, `proc` 47 MB for the FAA alone, `sia/vfr` 2.3 MB. **To
  measure and to read in GitHub's documentation** (M5): the largest request the tree creation accepts; whether to create
  blobs first (one request each: 3,071 files for the CIFP alone, against the per-minute and per-hour limits on
  content-creating requests) or one tree per few hundred files; the recursive listing's ceiling (the transport already
  throws on `truncated`, `proc` adds ≈ 3,200 paths a cycle: the lot D6 clean is part of the answer); the largest single
  file (a zone's `airspaces.json`, a few MB, is far below the documented file limit).
- **Publish only what changed**: the launcher computes the git blob hash of every file of `data/` (`frame_tree`); a phone can
  compute the same with `crypto.subtle` and compare with the tree it already has: unchanged files are not sent. **To
  measure**: the share of unchanged files between two cycles — the FAA CIFP of 2610 and 2611 (available from 29 October),
  and the base between two cycles. The packed cost of the FAA tree in git is small (3.64 MiB for 47 MB, measured), the
  *transfer* is what matters on a phone.
- **Two publishers**: the workstation and a phone may both publish. The manifest `sia/base/index.json` keeps the zones it
  does not rebuild (`...prev`), so the phone must re-read it after pulling; `data_sync` already takes the newest
  `updated_at` on a card conflict. **To test** with the fake GitHub API (`frame/store/test/fake_github.py`).
- **The token**: the same kind as a pilot's (Contents read and write on the data repository). Nothing in the token limits it
  to `sia/base/`: the separation between pilots and publishers is a convention of the code (`meta.writes`), not of the
  repository. A separate repository for published reference data, read-only for the pilots, would make it a rule; that changes
  the frame's transports and is a decision for the user (question 5).

**The PDF rows (eAIP, VAC)**

- The builders read the text of PDF pages with **pypdf**, placing fragments by their text matrix (`rows_from_pdf`), and
  reconstruct rows; their tests are the text rows kept as fixtures (`frame/aerodb/test/fixtures/eaip/<ICAO>/*.rows.txt`, regenerable by `tools/make_eaip_fixtures.py`, cases K2,
  K3). pdf.js (already a pinned script source of the CSP, used for the DIRCAM PDF) returns text items with transforms.
  Options: (a) **port `rows_from_pdf` to pdf.js** and compare, on the same real PDFs, the rows with pypdf's — the measure is
  the share of equal rows, and the warnings it adds (M6); (b) **renounce on the phone**: the rows show their published state
  and a note "computed on the workstation"; (c) **a cloud runner**: the application triggers a GitHub Actions workflow
  (`workflow_dispatch`) that runs the Python builders on a runner and commits to the data repository — the phone is the
  remote control; it needs a token with the right to run workflows and the workflow's secret to write to a private
  repository (question 7 of the screen document is the same decision).
- The **VAC** extraction also needs the 417 VAC PDFs of the SIA atlas and the owner's manual analyses
  (`tools/report-vfr/interpretations/*.json`): the workstation's job in every option.

### 2.5 Compute time, storage, sleep

- **Compute**: the Python references — CIFP 4.3 s for the whole of the United States (measured), the eAIP about 15 s for two
  aerodromes including the downloads, the base "a few seconds" on a desktop — say nothing about a phone; **to measure** with
  the same files (M3, M4). The limit is more likely memory and the network than CPU.
- **Storage**: the application keeps no raw file (the picker's `Blob` is read in place), no output (published at once);
  it keeps the state, the journal (`cache/aerodb/regen-journal.json`), the settings and the last published manifest. **To
  check** the web view's storage persistence on both platforms (`frame/DECISIONS.md`: IndexedDB eviction in WKWebView is an
  open item for Pilote already).
- **Sleep and resume**: a job is a list of steps, each ends in a recorded state (fetched, parsed, written, sent); a restart
  continues at the next step. The 25 Oct incident (Safari cleared `localStorage` keys, V3_SPECIFICATION § 10.16) is the reason
  to keep the token in IndexedDB like the identity, and to test it in the shell.

### 2.6 Shells, signing, distribution

- **iOS**: `mobile/` exists (Capacitor 6.1.2, bundle `org.sogvirtual.flightplanner`, `webDir ../_site`); the workflow
  `.github/workflows/ios.yml` is **paused and still builds the V2 site** (it needs `--start frame/index.html` and the `v3`
  branch, `mobile/README.md`); the 20 Oct plan listed as unknowns the first macOS run, the `capacitor://localhost` origin
  and the synchronous XHR of `data_files.js` (V2). The user "holds a TestFlight key" (24 Oct, `V3_SPECIFICATION.md` § 7.1);
  the four secrets are listed as pending in `V3_DECISIONS_RELAIS_2026-10-24_27.md`. **To check**: whether a TestFlight build of
  Pilote has ever run.
- **Android**: nothing exists (`mobile/package.json` lists `@capacitor/ios` only). To add: `@capacitor/android`, a Gradle
  build on an Ubuntu runner (cheaper than the macOS one), a signing key, distribution by internal testing or by APK.
- **Plugins to evaluate** (**to check** each in the pinned Capacitor): file picker for ZIP and PDF, native HTTP, keep-awake,
  secure storage for the token (Keychain, Keystore) against IndexedDB, local notifications for "AIRAC in n days".
- **One shell or two**: a second bundle id for the data application, or the same Pilote application with the Administration
  screen (§ 4). A second shell doubles the signing and release chain; the same shell puts the builders' code in every
  pilot's phone (a few hundred KB, **to measure**) and the memory-hungry work in Pilote's web view.

### 2.7 Licences and the rules that stay

ICAO and EUROCONTROL data never reach the public site (they are not in this project's scope anyway); the SIA export is
under a licence of use (the product page says so: read it before the application stores or republishes anything beyond the
private repository); openAIP CC BY-NC (attribution kept in the files), FAA CIFP notice kept in the files
(`proc_cifp.py` `NOTICE`); the X-Plane/Navigraph content is never part of a phone's publication (the source has no
phone runner; question 5 of the screen document).

## 3. Proposed architecture

```
Pilot application ─┐                                       ┌─ launcher runner  (workstation: Python jobs, git)
                   ├─ frame ── aerodb ── Data screen ──────┤
Data application ──┘  (data layer, github transport,       └─ device runner    (phone: native HTTP, builders in a
                       settings, help, designs, status)                         worker, github transport, journal)
```

- **A fourth application profile** in the frame (`APP` of `frame/app.js`, today `pilot`): `data`, name « Données » ×4, one
  module (a thin wrapper that mounts the Data screen full-height), the frame's Settings (the access card: repository and
  token — the only configuration), Help and Status. **To check with the frame agent**: how an application is chosen at
  start (one `APP` in `app.js` today; the build's `--start` page, or a second entry page, or a query).
- **Shared with Pilote**: the whole frame; aerodb (reader, manifest, zones, `regen.js`); the access card of Settings and the
  `github` transport; the designs and the four languages; the tests harness; the Capacitor chain if one shell.
- **New**:
  - `frame/aerodb/build/` — the pure builders (lot D5 of the screen document): `siaXml`, `aixm5`, `geojson`, `openair`,
    `xplane`, `zones`, `publishSplit` (as functions from text to files), a version constant; a Worker entry;
  - `frame/aerodb/build/cifp.js` — the port of `proc_cifp.py`; later `eaip_rows.js` and `vfr_import.js`;
  - `frame/aerodb/regen_device.js` — the device runner: `state()`, `can()`, `run()`; fetchers (native HTTP), pickers, job steps
    with recorded state, the "publish only what changed" comparison, the journal;
  - `FrameData.github.publish(files, message)` (frame agent) — a bulk mode of the transport: hashes, blobs or chunked
    trees, progress, resumable;
  - `mobile/` generalised to two projects if two shells; a workflow for Android;
  - tests: the golden tests of D5 are the same; K15… the device runner against `fake_github.py` and a fake fetcher; A23… the
    application profile at 390 px.
- **Who does what**: aerodb writes the builders, the runners and the screen; the frame agent the application profile, the bulk
  publication and `ctx.launcher`; settings nothing new (the access card exists); a `mobile` lot the shells.

## 4. Where it lives first: inside Pilote or a shell of its own

| | Inside Pilote (Administration › Data, device runner) | Dedicated application |
|---|---|---|
| Chain | none new | second bundle id, signing, store listing, workflow, Android from zero |
| Audience | every pilot carries admin code and a token field that can write | the owners only |
| Memory | Pilote's web view runs the heavy jobs | its own web view |
| Size | builders shipped to every phone | only to the owners |
| Time to first real number | days after D5 | weeks (shell, signing) |
| Risk | a pilot's token field becomes a publisher's (convention only) | the token lives in an application nobody else installs |

Proposal: **measure first (P0), run the device runner inside Pilote as a lab behind the Full level**, decide the dedicated shell
with the numbers. The user's word is a dedicated application; nothing here removes that target.

## 5. Plan of lots

Each lot ends with tests and its documents; none starts before the user's "go". The screen document's lots D1–D5 are the
prerequisites of P2.

| Lot | Scope | Tests |
|---|---|---|
| **P0 Measurements** | no application: on two real phones (owner's iPhone, an Android) with the real 2610 files: M1 inflate + decode of the SIA ZIP, M2 each parser and the DOM step (V2's `SiaBase.build` already accepts `File` objects, and the studio's panel has a native-folder fallback, `webkitdirectory`: try `apps/cpco/map_parser.html` through Pages or the launcher on the local network; whether a phone's browser offers that picker is itself the first result, otherwise a throwaway page with a multi-file input), M3 CIFP (a throwaway page), M4 a worker with heap readings, M5 GitHub limits with a throwaway repository, M6 pdf.js rows against pypdf's, M7 CORS of every host from a browser, M8 native HTTP in a throwaway shell. Output: a table in this document. | the numbers |
| **P1 Pure builders** | = D5 of the screen document (golden tests against V2's output); the DOM step replaced if M2 says so; the CIFP port | K11, K12, K16 (CIFP tree equals the Python's) |
| **P2 Device runner in a page** | `regen_device.js`, pickers, bulk publication in the frame, journal; runs in a desktop browser against `fake_github.py` | K15, K17 (resume after a cut), A23 |
| **P3 Inside Pilote** | the Data screen at Full level on a phone with the device runner, the greyed reasons for the workstation-only rows | A24 |
| **P4 Native fetching** | after M7/M8: the fetchers for CIFP, NAT, openAIP, ENAIRE, FAA ADDS, keep-awake, the CSP additions, resumable jobs | K18 (fetchers against a fake server) |
| **P5 The shell of its own** (if decided) | application profile `data`, second bundle id, workflow, TestFlight internal group | A25, the iOS build |
| **P6 PDF rows** | per M6: the pdf.js port, or the cloud runner, or the renunciation written in the screen's reasons | K2/K3 fixtures against the port |
| **P7 Android** | Gradle workflow, signing, internal testing; the same tests on a Chromium device profile | — |
| **P8 Roles** | which publisher is the reference (workstation or phone), the manifest race, the end of the manual commands | K19 two publishers on the fake API |

## 6. Questions for the user

1. **v1 scope**: SIA base + NAT + FAA CIFP on the phone, the rest "computed on the workstation" (§ 1) — right?
2. **Inside Pilote first, or the dedicated shell from the start?** (§ 4: proposal, measure then split.)
3. **iOS first, Android later?** Is there an Android device to test on, and is a store account wanted (internal testing) or
   an APK enough? Has a TestFlight build of Pilote ever been produced from the paused chain?
4. **The SIA order stays a human gesture on the phone** (account, cart, download in the browser, file picker in the
   application): acceptable?
5. **Token and repository**: the same fine-grained token as a pilot's, or a dedicated one — or a **separate repository for
   the published reference data**, read-only for the pilots (changes the frame's transports)? The licence question about the
   X-Plane content (question 5 of the screen document) must be answered before a phone publishes any zone.
6. **A cloud runner** for the PDF rows and for unattended CIFP and NAT (question 4 of the screen document): yes or no?
7. **Cellular data**: is a 100 MB eAIP run on a phone acceptable (Wi-Fi only by default)?

## 7. Risks

| Risk | Why | Answer |
|---|---|---|
| Memory | 71 MB of XML on a phone; a DOM of 44 MB; the web content process killed without a message | M1/M2 first; tag splitting or streaming; per-zone jobs |
| No CORS | verified for two hosts | native HTTP (M8), else a cloud runner, else the file is picked by the user |
| GitHub limits | 47 MB and 3,071 files in one cycle; request size; content-creation limits; the tree listing's ceiling | M5; publish only what changed; chunked trees; clean old cycles |
| The PDF rows | no JavaScript twin proven | M6; renounce or cloud runner |
| A job cut by the phone | the system suspends a backgrounded app | foreground and keep-awake; resumable steps |
| A write token on a phone | lost phone, Safari storage clearing (25 Oct) | device lock, revocable token, 90 days at most, test the storage in the shell |
| Two publishers | the workstation and the phone race on the manifest | re-read after pull; the transport's conflict path; P8 |
| The iOS chain was never run | paused, still building V2, "never built by us yet" | P5 starts by making Pilote's own build run |
| Scope creep | 17 sources on a phone | v1 = 3 sources; the rest greyed with a reason |
| Licences | SIA licence of use, openAIP non-commercial, X-Plane content | § 2.7; question 5 |

## P0 results, measured on the user's iPhone (27 October 2026)

Device: iPhone, iOS 18.7, Safari 26.6 in a browser tab, 4 cores, 375 × 667, no memory API, `DecompressionStream`,
`Worker` and `DOMParser` present. Report copied from the laboratory screen (`#datalab`, lot `v3-donnees-lab`).

| Measure | Result |
|---|---|
| SIA zip 2026-10-01 (5,6 MB → 71 MB) read from the picker | 14 ms (400 MB/s) |
| Mode c (worker, streamed) | **0,41 s** total (AIXM 222 ms, XML_SIA 97 ms), twice |
| Mode b (worker, zip in memory) | 0,37 s |
| Mode a (main thread as V2, DOMParser) | 2,7 s (DOMParser 0,8 s, VFR regex 1,2 s) |
| Survival | the three modes finished twice; counts identical between modes and with the workstation (1 817 airspaces, 2 344 rings, 124 627 points, 1 098 VRP, 1 859 AIXM airspaces, 808 aerodromes, 406 navaids, 4 276 points, 13 836 obstacles) |
| FAA CIFP 261001 (8,7 MB → 51 MB) | 121 ms streamed, 396 923 records, 13 309 airports |
| openAIP `fr_asp.geojson` (3,9 MB, from a file) | parse 16 ms, 1 806 features |
| GeoNames FR.zip (7 MB, from a file) | 24 MB inflated, read |
| Publication by the GitHub API (device token) | 107 B in 2,8 s; 2,0 MB in 3,2 s; the 5,3 and 10 MB blocks are **not in the report** (stopped or lost: to ask) |
| Cross-origin reads allowed | AWS terrarium tiles, ENAIRE AIP index (955 KB), FAA ArcGIS Special Use Airspace (CORS on) |
| Blocked by CORS | SIA (product page, VAC PDF, eAIP menu), FAA aeronav CIFP, NOAA NOMADS, openAIP S3, GeoNames, DIRCAM, NAV CANADA, NATS, NAT tracks |
| Unreachable | UK Mil AIP (aidu.mod.uk) |
| VAC PDF, GRIB | recognised by magic bytes; text not readable without pypdf / pdf.js |

**Reading.** Parsing and compiling the whole French base on the phone is a non-issue (0,4 s, no crash, exact counts): the
only obstacle is the download, which a web page cannot do for 9 of 15 sources. Two ways: in the web page, a **direct link
per source** (Safari: long press › "Download Linked File" saves any type into Files, which also answers the user's "JSON
saved as PDF") followed by the import from Files; in the dedicated application, Capacitor's native HTTP, which ignores
CORS. Publication through the GitHub API works at the size of a zone (2 MB in 3 s); the larger blocks remain to measure.
User (27 Oct): "Un certain nombre de fichiers json récupérés mais téléchargés en pdf (impossible de sauvegarder un json
depuis safari). Prochaine passe du labo : lien direct sans Copy/paste en cas d'échec." → lot `v3-donnees-lab2`.

### GitHub API size limits (read in GitHub's documentation, 27 October 2026; pass 2 of the laboratory)

The frame writes the data repository through the **git data API** (`POST git/trees` with each file's `content` inline in UTF-8, then a commit, then the ref), not through the
contents API. What the documentation (the REST API's OpenAPI description and the `github/docs` sources) says:

| Endpoint | Limit written |
|---|---|
| Create a blob / create a tree (inline `content`) | **no maximum request size is documented** |
| Get a blob | "supports blobs up to 100 megabytes" |
| Get a tree (recursive) | `truncated: true` beyond **100,000 entries or 7 MB** (the transport turns it into an error) |
| Contents API (not used by the frame) | create / update takes the file in **Base64** (+33 %: 10 MB become 13.3 MB), no maximum written; reading: 1 MB with all features, 1-100 MB only as `raw` / `object`, above 100 MB unsupported |
| Repository files | warning above **50 MiB**, push **blocked above 100 MiB** per file, **25 MiB** by browser upload |

So a zone of 5.3 MB is far below everything that is written. What can stop a 5.3 or 10 MB write is not a documented API cap but the phone: the connection and Safari's handling of a
large `fetch` body. That is what the buttons "Publish 5.3 MB" / "Publish 10 MB" of the laboratory measure (their result, or "no answer after 120 s", goes in the report). The first run's
missing 5.3 and 10 MB lines are not explained by a documented limit. Also in pass 2: a direct link per source with the long-press gesture (Safari saves a JSON through "Download Linked File"
instead of displaying it; **not yet tested on the phone**), "Save the result" by the share sheet where `navigator.canShare({ files })` is true (**not measured on an iPhone**: the report's
device block now says it), a ten-line summary at the top of the report, and a line for EAD Basic (login page, the login call with empty fields, files imported by hand).

## P0, pass 2, measured on the user's iPhone (28 October 2026) — and the user's verdict

Same iPhone, this time the **home-screen app** (standalone), report of 09:32. Parsing unchanged (mode c 0,39 s, b 0,45 s,
a 2,6 s, counts identical, three runs); publication 0,5 MB in 3,55 s (2 / 5,3 / 10 MB not tried); Web Share with files
available (`canShare` true, the sheet closed by the user); 16 sources tested: 3 readable cross-origin (AWS tiles,
ENAIRE, FAA ArcGIS), **12 blocked by CORS** (SIA ×3, GeoNames, NAV CANADA, openAIP, NATS, EAD Basic login page, NAT,
CIFP, NOMADS, DIRCAM), 1 unreachable (UK Mil); 7 files imported by hand (SIA zip, GeoNames, openAIP, an ENAIRE
amendment zip fed to the HTML chain: 0 links — the row expects a page). A wrong file on the SIA row (GeoNames) passed
the name check warning and gave undefined counts: the row should refuse it (moot if the laboratory goes).

**User (28 Oct)**: « Beaucoup de liens ne passent pas entre l'appli et safari, ou difficultés d'enregistrement, ou encore
fichier enregistré, mais non reconnu en lecture. Bref, ce process est obscur et long, je ne suis même pas sûr qu'il soit
utile. »

**Relay's reading.** P0 answered its question: compiling the base on a phone is trivial (0,4 s, exact counts, no crash)
and publishing works; **fetching is the obstacle**, and on a web page it cannot be solved: 12 of 15 sources refuse a
cross-origin read, the fallback (link → Safari → Files → picker) is long and brittle from a home-screen app. A phone
data application is therefore worth building **only as a native shell** (Capacitor HTTP ignores CORS), never as a web
page; and the SIA zip stays a human gesture even then. Recommendation: retire the laboratory (screen, `renderDatalab`,
the twelve `connect-src` hosts, the launcher patterns), keep its measurements here and its **streaming XML reader and
worker modes as the base builder of the workstation module** (lot D5 of `V3_DONNEES_REGENERATION.md`), and put the
dedicated application to sleep until the iOS chain resumes and native HTTP can be tried. The user decides.

**User's decision (28 Oct, after the pass-2 report)**: « oui pour le retrait. Du moins, la transformation du lab en
« sources » avec les liens vers les différents AIP ou sources qu'on utilise ou utiliserait. » → the laboratory
(`#datalab`: probes, parsing modes, publication trials, `renderDatalab`, the twelve `connect-src` hosts, the launcher
patterns) is retired and replaced by a plain **« Sources » screen**: one row per source used or candidate (the 16 rows of
`lab_sources.js` plus EAD Basic and the free national AIPs of `AIP_OPEN_DATA_INVENTORY.md`), with its link, what it
gives, its licence and its status (used in the base / candidate / abandoned), no fetch, no parser, no publication; the
streaming XML reader and the worker modes are kept for the workstation builder (lot D5). Lot for the local sessions
(frame + aerodb), dispatched by the ergonomics session. **Done on 28 Oct** (aerodb): the screen `#sources` (`frame/aerodb/sources.js`,
`sources_data.js`); the bricks kept are `frame/aerodb/xml_stream.js` (was `lab_xml.js`) and `zip_stream.js` (was `lab_zip.js`), each with
its bench (K8, K9); the worker modes (`lab_run.js`, `lab_worker.js`) went with the laboratory: they were a measuring harness around these two
readers, rebuilt in a few lines when the Data module needs a Worker.

