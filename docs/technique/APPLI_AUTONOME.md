# Stand-alone app (no launcher): GitHub Pages + GitHub data repository

Plan of 20 October 2026, for the first phone test. Hosting: **GitHub Pages** of `Woyczek/flight_planner`. Data: the
private repository **`Woyczek/flight_planner_data`**, a copy of the company data repository
(`framagit.org/defa-virtual/missions-defa`, the git repository of `data/`; since 21 October 2026 the GitHub repository is the only data repository). Scope of the first test: the phase-1
phone pages (Today, My missions, report, My flights, availability, Fuel, Fleet, aircraft sheet, My profile,
Appearance), **read and write**.

Storage and access map: `DONNEES_ET_ACCES.md`.

## 1. What the pages need from the launcher today (survey of 20 October)

- **No launcher endpoint is required by the phase-1 pages**: every `/__setup/…` call already degrades on a null
  result (sync button hidden, "launcher absent" notices, last-flight import falls back to pasting).
- **Pool JSON** (`utilisateurs/`, `config/`, `disponibilites/`, `missions/…json`): one read (`store.read`,
  `shared/assignments.js`) and one write sink (`writeFile`), behind `readData` / `readIndexed` / `writeData` /
  `flushData` and the outbox (`suiteDataOutbox:v1`).
- **Report ledger** (`data/cr/missions.yaml`): its own pair in `shared/mission_core/ledger.js` (`fetchStatus` read,
  folder-handle write after a three-way merge).
- **Reference scripts** (`data/references/aircraft_fleet.js`, `defa_reference.js`, `callsigns.js`, `data/data_tree.js`):
  synchronous `<script>` tags written by `shared/data_files.js` — a private repository cannot feed them.
- **Folder indexes** (`disponibilites/_index.json`, `utilisateurs/_index.json`): rebuilt by the launcher, excluded from
  data commits (`tools/data_sync.py`), so absent from the data repository.
- **Not in git at all**: `AircraftDB/aircraft_db.js`, `aircraft_perf.js` (built per machine by the launcher), mission
  maps (`missions/**/*.png`).
- **Git LFS** binaries (icons, textures, fonts) and the extensionless `config/repository_tree` (served as
  `text/javascript` by the launcher).

## 2. Design

1. **Data backend "GitHub"** (`shared/github_data.js`, new): repository, branch and a fine-grained personal token
   (contents read/write on the data repository only), entered once per browser in Settings › Installation and kept
   in this browser only. Contents API: reads with `If-None-Match` (a 304 costs no rate limit), writes with the file
   `sha` (a conflict is detected, never overwritten); one tree listing (`git/trees?recursive=1`) gives every path and
   blob sha in one request — the folder indexes are rebuilt from it in the browser.
2. **Plug points**: `store.read` / `readFile` / `writeFile` / `dataDir` in `shared/assignments.js` (the outbox stays:
   offline queue), the read and the write of `ledger.js` (its three-way merge reused on a `sha` conflict),
   `missionFile` (blob → object URL), `shared/data_files.js` (fetch, then inject the reference scripts before the
   page scripts run: the pages wait on a promise instead of `document.write`).
3. **"Synchronise"**: with the GitHub backend each write is already a commit (message: trigram, file); the button
   shows the outbox and replays it.
4. **Build and publication** (GitHub Actions → Pages): checkout with LFS, `?v=` stamps through
   `tools/publish_dist.py` (`version_stamps.serve`), `config/repository_tree` copied as `repository_tree.js`
   alongside, aircraft database from a snapshot committed in the data repository (`AircraftDB/` folder), no `data/`
   (it comes from the API).
5. **Installable app (PWA)**: `manifest.webmanifest` (start page: Today), icons, a service worker caching the code
   for offline use (data stay in the existing browser copies and outbox).

## 3. Order of work

1. Data backend and its settings card (testable with the sample data set on a test branch of the data repository).
2. Reference scripts loader, folder indexes rebuilt from the tree, ledger read / write.
3. Pages workflow, manifest and service worker; first install on a phone.
4. Real data: copy of `missions-defa` into `flight_planner_data` (by the user: `git clone --mirror` then
   `git push --mirror`, LFS objects included), then the test.

## 4. State (20 October 2026)

- **Done and checked** (fake GitHub serving the real data, `flight_planner_data` @ main; the built site served
  statically under `/flight_planner/`, as on Pages): data access setting, service worker, reads of every phase-1 page
  (fleet 205 aircraft and map, Today, My flights 14 flights, availability, report ledger 19 reports, Fuel, aircraft
  sheet), availability written (two commits: week and index; one commit since 21 October, the folder indexes are no longer written), report ledger written, two simultaneous reports merged.
- **Build**: `tools/build_pages.py <out>` (tracked files without `data/`, real `?v=` stamps, `config/repository_tree.js`
  copy, `config/build.js`, `.nojekyll`); workflow `.github/workflows/pages.yml` (LFS checkout, home-screen icons drawn
  from `assets/favicon-flight.svg` with `rsvg-convert`, deploy).
- **Install**: `manifest.webmanifest` (start page: Today) and the home-screen tags set by `config/repository_tree`.
- **Aircraft database**: served by the service worker from `AircraftDB/aircraft_db.js` and `aircraft_perf.js` at the
  root of the data repository (© ICAO, EUROCONTROL: never published with the public site); to be copied there from a
  launcher workstation.

- **Desktop browser test, fixes of 21 October** (same fake GitHub): the remembered folders (`FileAccess`) are ignored in
  GitHub mode at one decision point (`FileAccess.get()` returns none when `GitHubData.on()`; header of
  `shared/file_access.js`), so no page warns about “another copy” any more; the performance sheets are read from, and
  written back to, `planner/flight_performance_database_merged.fpdb.json` of the data repository (newer sheet wins,
  `sha`-checked write); every page was loaded without `AircraftDB/` in the data repository (no JavaScript error; one
  notification per page, empty type base) and with it; Settings › Maintenance keeps versions, the SIA sentence, browser
  caches and space, browser backup (downloaded) and journal.
- **Still needing a workstation with the launcher**: assignments written by the Centre (`missionsDir()`), reading or
  filing mission folders (missions registry), rebuilding the SIA base (the base itself is published by zone into
  `sia/base/` of the data repository by the workstation that rebuilds it, and read by the app: `DONNEES_ET_ACCES.md`
  § 2), type base completion, git updates. Mission maps (`missions/**/*.png`) are not in the repository: “map not
  available”.

### One-time settings (repository owner)

1. `Woyczek/flight_planner` › Settings › Pages › Source: **GitHub Actions**.
2. Settings › Environments › `github-pages` › Deployment branches: add `feature/mobile` (later `develop`).
3. Each tester: a fine-grained token (github.com › Settings › Developer settings › Fine-grained tokens) limited to
   `Woyczek/flight_planner_data`, permission Contents: read and write; then My profile › Data access in the app.

## 5. Open points

- **Organization: migration to come.** Until the data repository moves into a GitHub organization, only its owner can
  create a fine-grained token for it (`APPLI_AUTONOME_SECURITE.md` § 0): **one tester**. Publish no other GitHub Pages
  site on the account: they would share the origin `woyczek.github.io`, hence the token.
- **Tokens**: each tester creates a fine-grained token limited to `flight_planner_data` (contents: read and write, 90
  days at most);
  never written to a file or a backup. A real multi-user deployment needs a server (roadmap). Study of the options
  (signed accounts, write relay, token risks, GitHub organization): `APPLI_AUTONOME_SECURITE.md`.
- **Maps of the missions** (`missions/**/*.png`) are not in the data repository: shown as "map not available" in
  the app until they are published somewhere.
- **IVAO last-flight import** needs the launcher (IVAO key): pasting from the tracker remains.

## 6. iOS app (Capacitor)

### Why a bundled app

Running the suite as a Safari page or a home-screen PWA on an iPhone hit the limits of the platform (storage that
iOS may purge, restricted background behaviour, no real install channel for testers). A bundled app wraps the same
static site in a native shell: the code is shipped inside the app, installed through TestFlight, and keeps working
as in the browser. The web code is unchanged: data still goes through `shared/github_data.js` to the private data
repository (token entered in the app); api.github.com allows CORS from any origin, so the app origin
`capacitor://localhost` needs nothing on the server side.

### What `mobile/` holds

- `package.json`: Capacitor CLI, core, iOS platform (6.1.2) and `@capacitor/assets` (3.0.5), exact versions, no
  lockfile; scripts `build` (`tools/build_pages.py` into `../_site`), `ios:add`, `ios:sync`.
- `capacitor.config.json`: app id `org.sogvirtual.flightplanner`, name `Flight Planner`, web folder `../_site`,
  `server.hostname` `localhost`, automatic content inset, background `#f5f6f8`.
- `README.md`: the local build on a Mac (`npm install`, `npm run build`, `npx cap add ios`, icons with
  `@capacitor/assets` from `assets/logo.png`, `npx cap sync ios`, `npx cap open ios`).
- `.gitignore`: `node_modules/`, `ios/` and `assets/` are generated, never versioned (as is `_site/` at the root).

### The workflow `.github/workflows/ios.yml` ("iOS (appli)")

Runs on `macos-14` (free on a public repository) on pushes to `feature/mobile` touching `mobile/`, the workflow, the
web code (`shared/`, `apps/`, `config/`, `index.html`, `manifest.webmanifest`) or `tools/build_pages.py`, and on
demand.

1. **`build`**: builds the site, installs Capacitor, draws a 1024 x 1024 icon from `assets/favicon-flight.svg`
   (`rsvg-convert`), runs `cap add ios`, generates icons and splash screens (`@capacitor/assets`), `cap sync ios`,
   sets the display name, then makes an **unsigned simulator build** (`xcodebuild`, no signing) that validates the
   generated project. Output: artifact `FlightPlanner-simulator` (zip of `App.app`).
2. **`testflight`**: runs only if the secret `ASC_KEY_ID` is set (a tiny `secrets` job exposes this as an output,
   because a job-level `if` cannot read secrets). Same preparation, then a signed Release archive with automatic
   signing driven by an App Store Connect API key, export with an `ExportOptions.plist` (method `app-store-connect`),
   and upload with `xcrun altool`. The build number is the workflow run number (TestFlight rejects duplicates), and
   the encryption-exemption key is set so that builds do not wait for the export-compliance question.

Repository secrets: `ASC_KEY_ID` (API key id), `ASC_ISSUER_ID` (issuer id), `ASC_API_KEY_P8` (the `.p8` file,
base64-encoded), `APPLE_TEAM_ID` (10-character team id).

One-time Apple prerequisites: Apple Developer Program membership; an App Store Connect API key with the **App
Manager** role; the app record created in App Store Connect with the bundle id `org.sogvirtual.flightplanner`.

### How testers install

Add the tester in App Store Connect (internal testing group: up to 100 members of the team, no review; external
testers need a first beta review), who installs the TestFlight app on the iPhone and accepts the invitation. Each
new build uploaded by the workflow then appears in TestFlight after Apple's processing (a few minutes). Each tester
still enters their own fine-grained GitHub token in My profile > Data access (section 4).

### Known unknowns

- **Never built by us yet**: the first run on the macOS runner will tell. Likely first failures: CocoaPods or the
  `webDir` outside the project folder in `cap add ios`, the asset generator options, signing on the runner.
- **Origin `capacitor://localhost`**: the pages were checked on `http://127.0.0.1` (launcher) and on the built site
  served statically under a sub-path (as on Pages), never yet under the Capacitor scheme; anything
  keyed on the origin (storage, URL parsing, `location.protocol` tests) must be checked in the app.
- **Synchronous XHR**: `shared/data_files.js` reads the reference files with synchronous requests. WKWebView accepts
  them for the app scheme in principle, but this has to be confirmed on a device; if it fails, the loader must go
  asynchronous.
