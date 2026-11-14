# Security audit — 7 October 2026

> **Commit identifiers cited here.** The history of the code repository was squashed three times; the commits reviewed
> stay reachable through these tags, pushed on `origin`:
> - before v6.0.0-alpha.2: tag `backup/develop-avant-squash`;
> - before the rewrite of `v3` on 28 October 2026 (`2665371bf`, `7cb8303ef`, `0345a5688`): tag
>   `backup/v3-avant-reecriture-2026-10-28`;
> - before the squash of 30 October 2026 (every other identifier of the reviews of 22 to 30 October): tag
>   `backup/v3-avant-squash-2026-10-30`.
>
> `git show <identifier>` works once these tags are fetched (`git fetch origin --tags`).

Follow-up to the [audit of 2 October](AUDIT_SECURITE_2026-10-02.md). Four questions:

1. which flaws can let **data get out** (exfiltration);
2. what is the **local attack surface** (what listens or runs on a pilot's machine);
3. how to keep the suite from turning the machine into a **zombie** (foreign code executed, machine controlled from outside);
4. how to prepare a **client/server mode**, with personal data behind an authenticated web service.

Scope: `develop` at commit `e230773a`, plus the redesigned first run (`43a33d89`) for credentials
(pages `apps/`, scripts `shared/`, launcher `tools/launch.py`,
synchronisation `tools/data_sync.py`, update `tools/update_suite.py` and `shared/suite_update.js`, `lancer.cmd` /
`lancer.sh`). Method: code reading, tracing untrusted sources down to the HTML insertion points, tests of the
launcher on a test data set (forged requests, hostile page served from another origin). No real data read.

## Summary

The launcher and the Python tools are sound on the classic points: listening on the loopback only,
`Host` header check (DNS rebinding), `/__setup/` interface closed to other sites, no shell command,
no `eval`, TLS never disabled, Python installed by winget without elevation.

The main risk lies elsewhere. **Shared data is code**. `data_tree.js`, `references/*.js` and
`cr/mission_ledger_defaults.js` are loaded by `<script>`. These scripts run in the suite's origin, which:

- reads all the secrets of the browser and of the `secrets/` folder;
- calls the whole launcher interface;
- holds write permissions on the application folder and on the X-Plane folder.

Anyone who can write to the data repository can therefore read everything a pilot sees, and end up executing
native code on their machine. That can be a member, a stolen framagit account, an archive “received by email” or an
XSS flaw at a pilot who synchronises.

On top of that comes a direct, **proven** leak: any website visited while the suite is running can read the
`data/*.js` files with a simple `<script src>`.

| # | Severity | Finding | Axis |
|---|---|---|---|
| [C1](#c1) | Critical | Repository data executed as JavaScript in the suite's origin | exfiltration, zombie |
| [C2](#c2) | Critical | `data/*.js` files readable by any website (cross-site script inclusion) — **proven** | exfiltration |
| [C3](#c3) | Critical | Data archive: `.git/` extracted as is → command run by git (`core.fsmonitor`) | zombie |
| [E1](#e1) | High | `secrets/`, `.git/`, directory listings served in clear — **proven** | exfiltration |
| [E2](#e2) | High | `/__setup/downloads`: free pattern → the whole Downloads folder — **proven** | exfiltration |
| [E3](#e3) | High | Remote of `data/` changeable by the page, then “Synchronise” pushes everything | exfiltration |
| [E4](#e4) | High | Write folder handles on the application root and on X-Plane | zombie |
| [E5](#e5) | High | Remote version injected without escaping into the header of every page | zombie |
| [E6](#e6) | High | Suite updates without signature | zombie |
| [E7](#e7) | High | Accounts: hashes and roles in the shared repository, rights checked by the pages alone | exfiltration |
| [M1](#m1) | Medium | XSS: category colour and mission status (shared repository), performance profile (SimBrief, `.lnmperf`), help (external `?doc=` and `javascript:` links) | exfiltration |
| [M2](#m2) | Medium | No CSP, no framing protection | exfiltration |
| [M3](#m3) | Medium | `127.0.0.1:8000` origin shared with any other local server | exfiltration, zombie |
| [M4](#m4) | Medium | Third-party code: pdf.js from jsDelivr without integrity, js-yaml 4.1.0, jsPDF 2.5.2 | zombie |
| [M5](#m5) | Medium | Executables looked up in the current folder (`lancer.cmd`, `git`) | zombie |
| [M6](#m6) | Medium | Secrets in clear (files, localStorage), credentials possible in the repository address | exfiltration |
| [F](#faible) | Low | SSH `accept-new`, missing `--` before addresses, global `git lfs install`, help using `postMessage('*')`… | — |

## Status of the fixes

**Batches 1 to 3 done on 7 October** (details: [changelog](../CHANGELOG.md), Security section of “Unreleased”).
Verified with the same hostile page, forged requests and loading the 60 pages of the suite.

| Finding | Status |
|---|---|
| C2, E1, E2, E3, E5, M5 | **fixed** |
| M1 | **fixed** (colours, status, performance profile, help, density altitude, ODV colours) |
| C1 | **stopgap**: `.js` files of `data/` served and committed only in the data format (`tools/data_guard.py`); the underlying fix (data in JSON, batch 6) remains to be done |
| C3 | **fixed** at extraction (neither `.git` nor executable); git hardened (`core.fsmonitor`, `ext::`, submodules) |
| M2 | **fixed** (batch 4a, 9 October): launcher CSP — `connect-src` as a list (fixed, configuration, websites confirmed in the launcher window), restricted `script-src` (suite, inline, pinned pdf.js and acorn), `worker-src`, `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors`; images and navigation stay open (a leak through `<img src>` or a link is still possible) |
| M6 | **partial**: no more password or token in the repository address, `secrets/` no longer served; secrets still in clear on disk and in browser storage (batch 8) |
| E4 | **fixed** (batch 4b, 9 October): application, X-Plane, ODV workbook and backup sources read-only (`FileAccess.modeOf`); write access to `data/` asked separately (`grantData`), one-off write on click (`FileAccess.writable`); checked by permission simulation (OPFS), test in Chrome with the native picker still to do |
| E7 | **partial** (signed accounts L3, 19 October): in group mode, roles, state and password hashes come from the signed registry, verified by every browser (a user file edited in the repository no longer grants a role); enrolment of a second admin (L4) and signed assignments (L5) still to do; standalone mode unchanged |
| E6, M3, M4 | to do (batches 5, 7, 9) |

Choices made while fixing:

- **Git hooks kept.** `core.hooksPath` is not neutralised: the Git LFS hooks need it to
  send the files. The danger came from the `.git/` received in an archive, which is no longer extracted.
- **Navigations coming from another site refused.** The launcher renders an explanatory page with a link to the home page,
  never to the requested address.
  Can be switched off to work with an extension (Claude in Chrome sends its navigations as coming from another
  site): HTML pages only, confirmed in the launcher window, until it closes, red button in the header.
- **Remote repository change confirmed outside the browser.** For a repository other than the current one or the one in the
  configuration, the launcher opens a system Yes / No window. It shows the current and the new address,
  with “No” as default. A confirmation in the page would protect nothing, since an injected script would validate it
  itself. After a “No”, no new request for 30 s.

## Who attacks

| Attacker | What they control | Findings that serve them |
|---|---|---|
| **Any website** visited while the suite is running | requests from their browser to `127.0.0.1:<port>` | C2, M2 (framing), M3 |
| **Member of the data repository** (or their stolen framagit account) | the content of `data/` at every pilot, at the next synchronisation or the next launch (`git pull`) | C1, M1, E7 → E1, E2, E3, E4 |
| **IVAO or VATSIM user** (anyone) | callsigns, remarks, texts of the public feeds displayed by the suite | none: feeds written with `textContent` or validated ([appendix C](#appendix-c--inventory-of-html-insertions)) |
| **Author of a shared profile** (SimBrief airframe, Little Navmap profile) | name, callsign, comments of the pasted or imported profile | M1 (performance planner) |
| Stolen **framagit maintainer account** | the suite's code, the `repository_tree` read by the update check | E5, E6 |
| **Attachment** (data archive by email) | the content extracted into `data/` | C3, C1 |
| **Other program on the machine** | any loopback port | M3, M5 |

Once a script runs in the suite's origin (C1, C3, E5, M1 or an XSS), everything else follows:

- it reads localStorage, IndexedDB, `/secrets/` and Downloads;
- it changes the remote repository and pushes;
- it rewrites the application files;
- it sends it all wherever it wants, for lack of a CSP.

**Fixing the entry points is not enough; what the origin is allowed to do must also be reduced.**

## 1. Data exfiltration

### <a id="c2"></a>C2 — Cross-site script inclusion (proven)

The launcher serves any file to whoever sends `Host: 127.0.0.1:<port>`. That is the case of **any web page** that
loads `<script src="http://127.0.0.1:8000/data/references/defa_reference.js">`. The `Host` protection of 2 October
targets DNS rebinding, not this case.

The data files declare global variables (`window.DATA_TREE`, `window.DEFA_REFERENCE`,
`window.DEFA_FLEET`, `window.MISSION_CALLSIGNS`), which the hostile page then reads.

**Test**: suite on port 8790 (test data set), hostile page served from `localhost:8791`. The page read
`DATA_TREE` (data organisation), `DEFA_REFERENCE` (trigrams, first and last flights, number of flights, types)
and `REPOSITORY_TREE` (configuration, repository addresses). The JSON files remain unreadable: without a CORS header,
`fetch` is blocked.

The port is predictable (8000, then 8001…). The “local network access” filter of recent Chrome versions may ask for
permission, but neither all browsers nor all profiles apply it.

**Fix (launcher, a few lines)**: refuse any request whose `Sec-Fetch-Site` is `cross-site` or
`same-site`. Only `same-origin` and `none` (typed address, bookmark, opening by the launcher) go through. All
supported browsers send these headers.

Navigations coming from another site are refused too. No use case needs them, and they open the door to
booby-trapped links. Example: the help accepts an external document (`aide.html?doc=https://…`, appendix C).

### <a id="e1"></a>E1 — `secrets/`, `.git/` and directory listings served (proven)

The static server serves the whole root of the suite (`launch.py:376`), with the directory listings of
`SimpleHTTPRequestHandler`.

**Test**: `GET /secrets/ivao.json` returned the IVAO key in clear, and `GET /secrets/` listed its content. The code
(`launch.py:630`) nevertheless says “never read back by the page”; the `/__setup/secrets` route respects this principle (last 4
characters only), the static server bypasses it.

Served in the same way:

- `secrets/users/<TRI>.json` (IVAO clientSecret of each user);
- `/.git/` and `/data/.git/` (full history, `config` with the repository address, and a possible token if the address
  contains one, see M6);
- `data/local/defa_local_store.yaml` (snapshot of the localStorage);
- `tools/.defa_site.json`.

This is restricted to the same origin (no CORS), but any script of the suite has access to it.

**Fix**:

- 403 on `/secrets/`, any path one of whose segments starts with a dot (`.git`, `.defa_site.json`…), and `data/local/`;
- no more directory listings (`list_directory` → 404);
- `.git/`: only `HEAD` (commit number in the footer) may be given, through a dedicated route.

### <a id="e2"></a>E2 — Downloads readable by pattern (proven)

`/__setup/downloads?glob=…` accepts any pattern of 3 to 80 characters containing `*`.

**Test**: `*.*` returned the listing of the user's Downloads folder, and `&name=` returns any one of
these files. Any script of the suite can therefore read the whole Downloads folder.

**Fix**: closed list, on the launcher side, of the useful patterns (aeronautical sources declared in `aero_sources.js`).
The page sends a source identifier, no longer a pattern.

### <a id="e3"></a>E3 — Remote repository change, then push

Two routes chain together:

- `POST /__setup/sync-remote {url, save: true}` replaces the address of the remote repository of `data/` (`data_sync.set_remote`);
  `REMOTE_RE` accepts any `https://` or SSH address;
- `POST /__setup/sync` then pushes the whole history of the pool: user records with hashes, availability, reports, ODV,
  assignments.

No outgoing request is visible on the page side: git does the sending.

**Fix**:

- change the remote repository only after confirmation outside the browser (Yes / No window opened by the launcher), or towards a host from a list
  fixed in `config/repository_tree` (framagit.org);
- at synchronisation, refuse to push to a host other than that of the original clone.

### <a id="e7"></a>E7 — Accounts and roles in the shared repository

`data/utilisateurs/<TRI>.json` contains:

- the **role**;
- the **password hash** (PBKDF2-SHA256, 310,000 iterations, salted: correct in itself).

These records are synchronised to all members. It follows that:

- anyone can try to crack the others' passwords offline, dangerous if they are reused elsewhere;
- anyone can grant themselves `admin_centre` by editing their record;
- the session (`suiteSession:v1`) can be forged in the localStorage.

The limitation is known and documented (`users.js:13`, administrator manual, roadmap step 3). It can only be
fixed by a server (§ 4).

**Until then**, tell pilots clearly that this password protects nothing and must not be reused anywhere.

### Other exit routes

- **Reports sent to a configurable web service** (`mission_core/core.js:1255-1297`): full report, IVAO and
  VATSIM identifiers, Bearer token. The address is a localStorage setting: an injected script can divert it silently.
- **Third-party providers**: they receive identifiers or geographic areas, which is expected but worth
  knowing ([appendix A](#appendix-a--hosts-contacted)). Nothing is sent to audience analytics or
  translation services: automatic translation uses the API built into the browser.

## 2. Local attack surface

### What listens

A single program listens: the launcher (`tools/launch.py`).

| Element | Status |
|---|---|
| Addresses | `127.0.0.1` and `::1` only, first free port from 8000: not reachable from the local network |
| `Host` | required to be local on GET, HEAD, POST (DNS rebinding) ✔ |
| `/__setup/*` | `X-SOG-Setup` header required; no response to `OPTIONS` → no other origin can send it ✔ |
| Static files | **the whole root**, directory listings included (E1), readable by script inclusion from any site (C2) |
| Upload size | 512 MB at most ✔ (read into memory: saturation possible by a script of the suite, not serious) |
| Headers | `nosniff`, `Cache-Control`; **neither CSP nor `frame-ancestors`** (M2) |
| Authentication | none: the loopback is enough. Any program on the machine (other Windows user, tool, extension) can call `/__setup/*` by adding the header |

### What the launcher interface allows

The interface has 21 routes, listed in [appendix B](#appendix-b--launcher-routes). The sensitive routes, for a
script running in the suite's origin:

| Route | Effect | Current guard |
|---|---|---|
| `GET /__setup/downloads` | read the Downloads folder | free pattern (E2) |
| `GET /secrets/…` (static) | read the secrets | none (E1) |
| `POST /__setup/sync-remote` + `/sync` | send all of `data/` elsewhere | none (E3) |
| `POST /__setup/clone` | clone a chosen repository into `data/` (if empty) | address validated by `REMOTE_RE` |
| `POST /__setup/upload?kind=data` | extract an archive into `data/` (if empty) | outgoing paths refused, `.git/` accepted (C3) |
| `POST /__setup/aircraft-db`, `aero-fetch`, `defa-site` | run Python scripts with filtered parameters | ✔ (code lists, no shell) |
| `POST /__setup/secrets` | write the secrets | fields in a closed list ✔ |

### What the browser is allowed to do

This is the widest part of the surface. With folder permissions (File System Access API, handles
kept in IndexedDB `missionCore/handles`), the `http://127.0.0.1:8000` origin can write to:

- `__repo`: application root (`file_access.js:18-22`, `readwrite` mode by default `:340`);
- `__data`, `__ledger`, `__missions`: the data, which is expected;
- `__xplane`, `__xpnav`: X-Plane folder (`maintenance_page.js:158,492`);
- `__store`: local backup, at the root by default (`file_access.js:332-335`).

See E4 for the consequences.

### Files read and executed at startup

`lancer.cmd` → Python → `launch.py`:

- `git pull --ff-only` of `data/` at every launch;
- extraction of any `*.zip` at the root that contains `data_tree.js` (if `data/` is missing);
- `git lfs install` (global git configuration modified, not serious).

## 3. Not becoming a zombie

A machine becomes a zombie when foreign code runs on it and stays there. Five paths lead there today, from most to
least likely.

### <a id="c1"></a>C1 — Data is code

- **Mechanism**: `shared/data_files.js:31,35` writes `<script src="data/…">` tags (`data_tree.js` on every page,
  `callsigns.js` on 42, `aircraft_fleet.js` on 31, `defa_reference.js` on 28). `mission_reporting_config.js:9-12`
  loads `data/cr/mission_ledger_defaults.js`.
- **Propagation**: these files arrive by `git pull` at launch or through “Synchronise”. `cr/` and `config/` are
  part of the pool pushed by each pilot (`data_sync.py:22`): an XSS at one pilot can rewrite
  `cr/mission_ledger_defaults.js` and propagate it to everyone. It is a worm.
- **Access gained**: the script reads the browser's secrets, calls `/__setup/*` and, through the folder handles
  already granted (E4), rewrites `tools/launch.py` or `lancer.cmd`. It can also drop a `.xpl` plugin (a DLL)
  into X-Plane. At the next double-click or the next flight, it is native code.
- **Underlying fix**: no more executable data files at all. Pages read JSON (`fetch` then
  `JSON.parse`). The current synchronous loading (`document.write`) becomes a promise awaited before rendering, which
  affects about forty pages: a project in its own right.
- **Immediate fix**, without touching the pages:
  - the launcher serves a `data/**/*.js` only if it follows the template of `AircraftDB/datafile.py`: comments,
    `let data = <JSON>;`, then `window.NOM = data.clé;` exports from a closed list. Otherwise, 403 and a warning in the
    console;
  - `data_sync.py` refuses to commit or merge a `.js` that does not follow the template.
- **On the framagit side**: protected branch on the data repository, mandatory review of the `.js` files.

### <a id="c3"></a>C3 — Archive “received by email”

- **Mechanism**: `extract_data` (`launch.py:74-96`) does refuse outgoing paths, but extracts `.git/` as is.
  A booby-trapped archive can therefore contain a `.git/config` with `core.fsmonitor = <commande>` or a `core.hooksPath`.
  The command runs at the first `git status`, called by every page (`/__setup/sync-status`), then at every `git pull`
  at launch.
- **Without `.git/`**, the archive reproduces C1.
- **Fix**:
  - extract nothing under a `.git` segment;
  - extension allowlist (`.json`, `.yaml`, `.md`, `.csv`, `.xml`, `.js` following the template);
  - harden every git command of the suite with `-c core.fsmonitor=false -c core.hooksPath=<dossier vide>
    -c protocol.ext.allow=never -c protocol.file.allow=user -c submodule.recurse=false`;
  - eventually, SHA-256 hash of the archive announced through another channel.

### <a id="e4"></a>E4 — Write folder handles too broad

- **Mechanism**: the suite does not ask for write access when it needs it: it asks for the application root
  and X-Plane in `readwrite` once and for all.
- **Risk**: if Chrome keeps the permission (“Allow on every visit”), an injected script needs no user
  gesture to rewrite the code. This point was not tested in a browser.
- **Fix**:
  - `__repo`, `__xplane`, `__xpnav` in `read`;
  - writing reserved to `data/`;
  - for the rare writes elsewhere (texture CSS, `save_textures`…), one-off request on click.

### <a id="e5"></a>E5 — XSS through the update check

- **Mechanism**: `suite_update.js:108` reads `version: "([^"]+)"` in the remote `repository_tree`. `:401` inserts it
  without escaping into the header of every page (`title` attribute and text). It is stored in the localStorage,
  so displayed again even offline.
- **Reach**: a stolen framagit account reaches every machine that checks for updates, **without them
  updating**, archive installations included. The source address can also be changed (`suiteRepo`, `:27-34`).
- **Fix**: validate `^\d+\.\d+\.\d+(-[\w.]+)?$` on reading, and `esc()` on display.

### <a id="e6"></a>E6 — Updates without signature

- **Mechanism**: `update_suite.py:150` does `merge --ff-only origin/<canal>`, without `verify-tag`. The SHA-256 hash from
  `publish_dist.py` is published in the same repository, so it proves nothing.
- **Positive point**: the update is manual, no route triggers it.
- **Fix**:
  - signed tags (SSH or GPG key of the maintainers, pinned in the suite);
  - `git verify-tag` before merging;
  - update to a tag, not to a branch;
  - two-factor authentication required on framagit for the maintainers and for the data repository.

### <a id="m5"></a>M5 — Executables taken from the current folder

- **Mechanism**:
  - under Windows, `cmd` looks for `py`, `python` in the current folder before the `PATH` (`lancer.cmd:10-12`);
  - `data_sync.py` calls `git` without a path;
  - a `git.exe` or a `py.cmd` dropped at the root (archive, C1 via `__repo`) would be executed.
- **Fix**:
  - `set NoDefaultCurrentDirectoryInExePath=1` at the top of `lancer.cmd`;
  - `git` resolved once by `shutil.which` after removing the root from the `PATH`, then called by its absolute
    path.
- **Same rule for every program a workstation tool starts** (review of 28 October, on-demand reading chain): under
  Windows `shutil.which` searches the current folder before the `PATH` unless `NoDefaultCurrentDirectoryInExePath` is set.
  `tools/proc_ocr.py` looks up `tesseract` that way: a `tesseract.exe` left in the current folder (archive, data folder)
  would be run. Any new tool that starts a program sets `os.environ['NoDefaultCurrentDirectoryInExePath'] = '1'` (as
  `tools/data_sync.py` does) and calls it by the absolute path found.

### <a id="m4"></a>M4 — Third-party code

| Library | Where | Problem | Fix |
|---|---|---|---|
| pdf.js 4.10.38 | `maintenance_page.js:1984,2015` | `import()` from jsDelivr: no integrity check possible, code executed in the origin | ship pdf.js in `shared/vendor/` |
| js-yaml 4.1.0 | `shared/mission_core/vendor/` | prototype pollution through the `<<` merge key, fixed in 4.1.1 (advisory of November 2025); reads the YAML of the shared repository | move to 4.1.1 |
| jsPDF 2.5.2 | `apps/cpco/jspdf.umd.min.js` | denials of service fixed in 3.0.x; only processes local data | update when convenient |
| acorn (cdnjs, without SRI) | `tools/verify_format.html` | development tool only | SRI or local copy |
| `airports.json` (GitHub, `master` branch) | `mission_core/assist.js:162` | data only; aerodrome names to escape on display | pin a commit |

### Anti-zombie hygiene — the project rule

1. **Never execute data.** A file that comes from another machine is JSON, YAML or text, not a
   script.
2. **The fewest rights possible for the origin**: write access to `data/` only, the rest read-only; a CSP that
   closes the exits.
3. **Serve nothing that serves no purpose**: no `secrets/`, no `.git/`, no directory listings, nothing for
   other sites.
4. **Git in distrust**: hardening options on every call, `--` before addresses, no credentials in
   addresses, `.git/` never received from an archive.
5. **Verifiable updates**: signed tags, verified before merging.
6. **Escape everything that comes from elsewhere** (shared repository, networks, framagit, CDN) before `innerHTML`, including in
   the `style` and `class` attributes.
7. **On the pilot side**:
   - up-to-date Chrome or Edge;
   - up-to-date Git;
   - do not run any other server on the suite's port;
   - do not grant “Allow on every visit” on the root.

## 4. Client/server mode

The roadmap (step 2, [ROADMAP.md](ROADMAP.md#step-2--the-minimal-web-server-central-engine)) already plans a
“central engine” (`tools/defa_server.py`, SQLite, HTTPS behind Caddy, `GET/PUT /v1/file/<chemin>` with ETag and
If-Match, `/v1/changes`). What follows takes up its framework and sets the security requirements that the audit brings out.

### 4.1 What goes behind the server

| Class | Content | Where today | Server mode |
|---|---|---|---|
| **Reference** (public) | SIA, aero areas, MORA, type catalogue, mission templates, availability categories | `data/sia`, `AircraftDB`, `examples/`, `data/config/disponibilites.json` | can stay local or be served without login |
| **Personal** | user records, IVAO/VATSIM/SimBrief identifiers, availability, assignments, ODV (personnel, crews), ATC sessions, reports (crew, remarks), aircraft positions, DEFA log and reference, personal aircraft, generated missions (author, crews) | `data/utilisateurs`, `disponibilites`, `missions`, `odv`, `atc`, `cr`, `references/defa_reference.js`, `aircraft_personal.js`; localStorage `missionReportingConfig:v1`, `defaFlightLog:v1` | **server only**, filtered by rights |
| **Secrets** | password hashes, suite IVAO key, users' IVAO secrets, report sending key, DEFA site credentials, git credentials | `data/utilisateurs/*.json` (hashes), `secrets/`, localStorage | hashes and suite keys: server, never transmitted; a user's secrets: their machine (system keychain) |

### 4.2 Switch-over point in the code

The right point already exists: `MissionAssignments.store` / `readData` / `writeData` (`shared/assignments.js:61,235,278`).
Conditional read, `updated_at` signature, writing through File System Access or outbox. Through it go
`users.js`, `dispos.js`, `odv_orders_store.js`, `atc_sessions.js`, `aircraft_positions.js`, `odv_airspace.js`.

Replacing `store.read` with `GET /v1/file/<rel>` (ETag) and `writeFile` with `PUT` (If-Match) is enough for this whole
scope.

**To converge beforehand**: the direct writes outside this point.

- assignments: `assignments.js:1659,1779,1836`;
- report ledger: `mission_core/ledger.js:226,241,547,565`;
- mission registry: `mission_registry.js:173,207,430,631`;
- reference files: `data_admin.js:137`.

**And two format prerequisites**:

- **end of data `.js` files** (C1): a server must never serve code produced by its users;
- **split reports** (per report, at least per year: already planned before 31 December): the server cannot apply a
  “this report is mine” right on a single ledger `cr/missions.yaml`.

### 4.3 Where the session token lives

This is the decision that conditions the rest, because the suite is served by `127.0.0.1` and the server would be on another
domain.

| Option | Principle | For | Against |
|---|---|---|---|
| **A. The launcher relays** (recommended to start with) | the page talks to the launcher (`/__setup/api/…`), the launcher talks to the server with the token, kept in the system keychain | token never in the browser, same model as the IVAO keys today; no CORS, no third-party cookie; the page keeps its local origin | the launcher remains necessary; C2, E1 and E3 must be closed first (the launcher becomes the gatekeeper) |
| **B. The server also serves the suite** | `https://suite.sog…/` serves pages and API, same origin | `HttpOnly; Secure; SameSite=Strict` session cookie, strict CSP, no launcher | no more access to local folders (X-Plane, Downloads, SIA) without the launcher; two modes to maintain |
| C. Bearer token in the localStorage, direct call | the page calls the server (CORS) | simple | any injected script reads the token: exactly what the audit seeks to avoid |

Recommendation: **A** first, then **B** if a “no installation” use is wanted. **C** is to be ruled out.

### 4.4 Requirements for the server

- **Accounts**:
  - `scrypt` hashes (Python standard library, `hashlib.scrypt`) or PBKDF2 ≥ 600,000 iterations, on the server side
    only;
  - **reset of all passwords at the switch-over**, since the current hashes have circulated to all
    members;
  - rate limiting of attempts (per account and per address), temporary lockout.
- **Sessions**:
  - short access token (15 min) and revocable refresh token, per device;
  - logout = revocation;
  - impersonation by an admin logged and reported to the user.
- **Rights per resource**, checked by the server on the file path. Starting matrix; `L` = read,
  `E` = write.

  | Resource | Pilot (self) | Pilot (others) | Centre | Admin |
  |---|---|---|---|---|
  | User record | L, E (except role and active) | L: trigram and name | L | L, E, reset |
  | Availability | L, E | — (or aggregated common slots) | L | L |
  | Assignments | L (their own), mark as read | L: crew of their missions | L, E | L, E |
  | ODV, ATC, activations | L | L | L, E | L, E |
  | Reports | L, E (author = self) | L if in the crew | L, status | L, E |
  | DEFA log and reference | — | — | L | L, E |
  | Missions (generator, registry) | L (assigned) | — | L, E | L, E |
  | Configuration, users, categories | — | — | L | L, E |

- **The server filters what it sends**: a page never receives what it is not allowed to see. The users index
  carries neither the hash nor the role of anyone else.
- **Validated writes**:
  - schema per file type, bounded size;
  - text only: any executable content refused;
  - `by` and `updated_at` fields set by the server, not by the page.
- **Log** (SQLite): who read or wrote what, when; viewable by the admin; limited retention.
- **Transport**: HTTPS only (HSTS), Caddy or nginx in front; Python server on its machine's loopback.
- **Suite secrets** (IVAO key): on the server, which relays the IVAO calls as the launcher does today.
- **Browser cache**: IndexedDB `defaIndex` and the outbox contain personal data; to be cleared on
  logout.
- **Personal data (GDPR)**: an association that keeps the names, identifiers and activity of its members must
  be able to say what, why and for how long.
  - Record of processing activities, retention period (reports, log, past availability), right of access and erasure.
  - The git export planned by the roadmap copies everything: to be reserved to the admin, encrypted, or pseudonymised.

### 4.5 Proposed steps

1. **Prerequisites on the suite side** (useful even without a server): C1 (data in JSON), split reports, writes converged towards
   `readData` / `writeData`.
2. **Read-only server**: accounts, sessions, `GET /v1/file` filtered by rights, relay through the launcher (option A).
   Git synchronisation continues for writing.
3. **Writing through the server**: `PUT` with If-Match, `/v1/changes`, end of git for the personal pool (admin export
   only).
4. **Switch-over**: reset of passwords, removal of the hashes and personal files from the git repository.
   The git history keeps a copy of them: new repository, or history rewrite and rotation of everything that has
   appeared in it.

## <a id="faible"></a>Remaining medium and low findings

- **<a id="m1"></a>M1 — XSS through synchronised data** (traces verified):
  - **Category colour**: `data/config/disponibilites.json` › `categories[].couleur` →
    `dispos.color()` (`dispos.js:346`) → `RepositoryNav.chartColor()`, which returns the value as is if it is not
    a colour → `style="--c:${…}"` (`dispos_editor.js:62,242`) → `innerHTML`.
    - Payload: `"couleur": "red\"><img src=x onerror=…>"`.
    - Affects every pilot who opens their availability.
    - Fix: accept only `^#[0-9a-f]{3,8}$` in `dispos.color()`.
  - **Mission status**: `data/missions/<dossier>/suivi.yaml` › `status` → `pill(level, …)`
    (`mission_registry.js:1041`, `class="rg-pill rg-${level}"` not escaped), via `:1235` and `:1356`. Centre pages.
    - Fix: `esc(level)`, or fixed class if the status is not in `STATUS`.
  - **Performance profile card** (`apps/planner/flight_performance_planner.html:1673`):
    - Sources: `name`, `callsign`, `registration`, `simbriefAirframeId` of the active profile. They come from a shared
      SimBrief airframe (`airframe_name`, `airframe_comments`, `callsign`, `registration`, pasted by link, `:2598`),
      from an OFP (`:2622`), from a `.lnmperf` (`<Name>`, `:2524`) or from an imported JSON or CSV.
    - The profile is stored: the payload replays every time the page is opened.
    - Same defect at `:3036` (`ofpTimestamp`, `airframeId`) and `:2810` (typed identifier, without consequence).
    - Fix: `esc(x[1])`.
  - **Help** (`apps/aide/aide.js:79,88-94`, `markdown.js:30-33`):
    - `aide.html?doc=https://…` loads a document from another site (if that site responds with CORS);
    - `link()` lets `javascript:` through (`new URL(href).href`), and a click executes the link in the suite's origin
      (`:220`, `window.top.location.href` in the help window).
    - A link sent to the pilot and one click are enough.
    - Fix: `doc` limited to relative `.md` paths of `docs/`; `link()` limited to `http(s)`, `mailto`, `#` and
      `?doc=`; cross-site navigations refused (C2).
  - **Density altitude** (`mission_extensions.js:261`): typed field or reloaded from an archive CSV, not escaped. Low.
  - The rest of the inventory is in [appendix C](#appendix-c--inventory-of-html-insertions).
- **<a id="m2"></a>M2 — Neither CSP nor framing protection.**
  - A CSP sent by the launcher would limit data exfiltration even with inline scripts:
    `connect-src 'self'` plus the hosts of appendix A, `form-action 'self'`, `base-uri 'self'`,
    `frame-ancestors 'self'`.
  - `script-src 'self'` will come once the inline scripts have been moved out (and C1 done).
  - Without `frame-ancestors`, a site can frame the suite and get the pilot to click “Synchronise” unknowingly.
- **<a id="m3"></a>M3 — Shared origin.**
  - Any server started later on `127.0.0.1:8000` (`python -m http.server`, development tool) inherits the
    localStorage, the IndexedDB and the folder handles of the suite.
  - Fix: a dedicated host name, for example `sog.localhost:<port>`. Browsers resolve it to the
    loopback; to be added in `_local_host`. Otherwise, an uncommon fixed port.
- **<a id="m6"></a>M6 — Secrets in clear.**
  - `secrets/*.json` (plain JSON, copied with the folder: Synology, “DEFA - Copy”); a backup source placed
    on the root carries it away too (`maintenance_page.js:129` does not exclude `secrets/`).
  - localStorage: `missionSendKey:v1`, network profile.
  - **DEFA site login and password**: `defaCredentials:v1` is again written in clear since the
    redesigned first run (`43a33d89`, `premier_lancement.html`, step 4). The site has no API (roadmap,
    step 4), so this password is of no use today, and any script of the origin can read it. To stop
    keeping, or to entrust to the launcher (`secrets/users/<TRI>.json`, then keychain) the day an API exists.
  - `REMOTE_RE` accepts `https://utilisateur:jeton@…`, which ends up in `data/.git/config` (served, E1).
  - `INSTALL.md` suggests the framagit **password** rather than a token limited to the project.
  - Fixes:
    - system keychain (DPAPI under Windows) or folder outside the served root;
    - refuse credentials in the address;
    - recommend an access token for the data repository only, with repository read/write only.
- **Low**:
  - SSH `StrictHostKeyChecking=accept-new` (`data_sync.py:36`): server key accepted without check on the first
    connection;
  - addresses passed to git without `--` (`launch.py:132`, `data_sync.py:60,90`): to be added, and refuse a leading `-`;
  - `git lfs install` modifies the global configuration;
  - the help sends its address by `postMessage(msg, '*')` (`apps/aide/aide.js:26`): to be addressed to `location.origin`;
  - restoring a local backup (`browser_store.js:510-519`) rewrites all the keys, `suiteSession` and
    `dataOverride:*` included;
  - the ChatGPT prompt goes out in the address (`mission_order.js:231`): mission parameters, no personal data found.

## Remediation plan

In batches, from the most cost-effective to the heaviest. Each batch is independent. Batch 1 touches the launcher headers: to
be tested on port 8000 with the usual browser (old cache) and on the 50 pages of the index.

| Batch | Content | Findings | Size |
|---|---|---|---|
| **1. Launcher locked down** | `Sec-Fetch-Site`, 403 on `secrets/`, dot segments and `data/local/`, no more directory listings; Downloads patterns in a closed list; remote repository change confirmed in a launcher window; `frame-ancestors` / `X-Frame-Options`; template required for `data/**/*.js` | C2, E1, E2, E3, C1 (stopgap), M2 (partial) | small |
| **2. Git and archives hardened** | `-c` hardening options on every call, `--`, `.git/` and extensions refused at extraction, credentials refused in the address, `NoDefaultCurrentDirectoryInExePath`, git by absolute path | C3, M5, M6 (partial), low | small |
| **3. Escaping** | `suite_update.js` (version), `dispos.color()`, `mission_registry` `pill`, performance profile, help (`?doc=`, link schemes), ODV template colours, density altitude | E5, M1 | small |
| **4. Browser rights** | `__repo` / `__xplane` / `__xpnav` handles read-only, writing on click; `connect-src` CSP sent by the launcher | E4, M2 | medium |
| **5. Libraries** | pdf.js shipped locally, js-yaml 4.1.1, jsPDF 3.x, `airports.json` pinned | M4 | small |
| **6. Data in JSON** | end of data `.js` files, asynchronous loading in the pages | C1 (underlying) | large |
| **7. Signed updates** | signed tags, `verify-tag`, framagit two-factor authentication | E6 | medium (mostly organisation) |
| **8. Secrets** | system keychain, exclusion from backups | M6 | medium |
| **9. Server** | § 4.5 | E7, M6 | large |

## Follow-up of the 2 October audit

| Point of 2 October | Today |
|---|---|
| `Host` required (DNS rebinding) | in place ✔; does not cover cross-site script inclusion (C2) |
| Upload size bounded, line breaks refused in identifiers, `nosniff` | in place ✔ |
| “HTML insertion: texts passed through `esc`” | true for texts; **false for the `style` and `class` attributes** (M1) and for the remote version (E5) |
| “Opened files treated as data, never as code” | true for opened files; **false for the data repository** (C1) |
| “The suite loads no script from elsewhere” | no longer true: pdf.js from jsDelivr (M4) |
| Accepted risk: `.git` served “limited to the machine” | to be reviewed: served to any script of the origin, with a possible token in the address (E1, M6) |
| Accepted risk: no CSP | to be reviewed: the CSP serves first to close the exits (`connect-src`), without waiting for the inline scripts to be moved out (M2) |
| New since: `secrets/` (IVAO key), `/__setup/downloads` | served or readable without restriction (E1, E2) |

## <a id="review-1028"></a>Review of 28 October (V3, `origin/v3` 2665371bf)

Read-only review of the work of the cloud relay session (24–27 October). Classification: **blocking**, **to fix**,
**acceptable**. No token was handled during the review.

| # | Subject | Verdict |
|---|---|---|
| 1 | CSP: 13 hosts of the data laboratory in `connect-src` | to fix |
| 2a | Test hook `sogLab:urls` | acceptable |
| 2b | Trial publication through the device's GitHub transport | to fix |
| 2c | Files read from Downloads (`/__setup/downloads`) | acceptable (one note) |
| 3 | `#datalab`: a frame screen drawn by a service, `fetch` exception | to fix (scope) |
| 4 | `tools/proc_ead.py --probe` (EAD Basic login) | to fix |
| 5 | Keys moved to `device/keys.json` (IndexedDB) | acceptable |
| 6 | Fixtures published in the public repository | to check (licences) |

**1. CSP — to fix.**
- The 13 laboratory hosts (`tools/csp_policy.py`, `CONNECT`) are added to the policy of **every page**, not only
  `#datalab`: `connect-src` is what limits exfiltration after an injection (`script-src` keeps `'unsafe-inline'`).
- `https://services6.arcgis.com` is a **multi-tenant** host (ArcGIS Online): anyone can create a feature service there
  and receive data by POST. It is an exfiltration channel. Restrict it to the path of the service actually measured
  (`https://services6.arcgis.com/<organisation id>/`); CSP accepts a path.
- `https://www.ead.eurocontrol.int` is a login service: only the probe's empty form test needs it; nothing in a page
  should send credentials there (see 4).
- Give the block an end date in the code (with the laboratory's removal) rather than « temporary » alone.

**2a. `sogLab:urls` hook — acceptable.** Read only when the page itself is served from `localhost`, `127.0.0.1` or
`[::1]`, and replacement addresses are limited to https or local http (`lab_sources.js` `isLocalPage`, `testUrl`). A
page on GitHub Pages cannot be steered by a planted localStorage value.

**2b. Trial publication — to fix.**
- Each button writes a 0.5 to 10 MB filler block (`lab/essai-….json`) **to the real data repository**, on its working
  branch, with the device's token; confirmation is asked (`askPub`) and « Clean » only lists and deletes `lab/essai-*`.
- But a deletion does not remove the blob from Git history: every run adds up to about 18 MB to the data repository for
  good (clones, phone transport, GitHub size limits).
- Publish to a dedicated branch (`lab/…`, deleted afterwards) or a scratch repository, never the data branch.

**2c. Downloads — acceptable.** `/__setup/downloads` stays restricted to the page served by the launcher (`_allowed`), and
to the patterns declared in code (`download_patterns`: `export_xml_bd_sia_*.zip`, `EG_*_DS_*_XML.zip`, `CIFP_*.zip`), never
« *.* », without a path. Note: the file is read whole into memory (`f.read()`); a SIA ZIP of several hundred MB should be
streamed.

**3. `#datalab` — to fix (scope).**
- The exception is documented (`frame/INTEGRATION.md` § 13): the screen calls `fetch` itself, the token stays in the
  transport, and the data adapter is limited (`sia/base/` read, `cache/lab/` written).
- The `github()` transport handed to the laboratory has full write rights (`commit` on any path), whereas it only needs
  `lab/`. Hand it a transport restricted to the `lab/` prefix, so that an error or a compromised laboratory script
  cannot write elsewhere in the data repository.

**4. `tools/proc_ead.py --probe` — to fix.**
- Good: password through `getpass` or `EAD_PASSWORD`, never on the command line; only `www.ead.eurocontrol.int` (or
  `http://127.0.0.1` for local tests); report and saved pages sanitised.
- The sanitising only replaces the secret **as typed**. A password echoed URL-encoded or HTML-escaped (redirect address,
  reflected form) stays in the saved pages: also replace `quote()`, `quote_plus()` and `html.escape()` of each secret.
- Redirects are followed without checking the host (`call` only checks the first address). Cookies are domain-scoped,
  but the report then records pages from another host: refuse a redirect that leaves `HOST`.
- The output folder `ead_probe/` (default, in the current folder) is **not** in `.gitignore`: run from the repository
  root, the saved pages can be committed. Ignore it, or default to a folder outside the repository.
- Automated access to EAD Basic: check its terms of use before keeping the tool (personal account, no robot).

**5. Keys in `device/keys.json` — acceptable.**
- The GitHub token and the avwx key live in the frame's IndexedDB base, `cache` policy, under the `device/` prefix.
  They are excluded from synchronisation and from backups (`frame_data.js`: `device/` filtered out of documents and
  pending writes).
- It does not protect against an injection in the page (same origin, readable like localStorage before). The protection
  remains the CSP (point 1) and a fine-grained token limited to the data repository.

**6. Fixtures in the public repository — to check.**
- `ofp_lfrs_lfml.json`: route only (fixes, levels, rounded positions), no pilot, user id or key: fine.
- `lab/XML_SIA_sample.xml`: synthetic (« TERRAIN FICTIF »): fine.
- `cifp/KSEA_subset.arinc`: FAA CIFP, a work of the US government, public domain: fine.
- `eaip/AD_2_LF*_DATA_*.rows.txt` and `lab/AIXM4.5_sample.xml` (« Sia-France »): extracts of the French eAIP and SIA
  data. Check the SIA's reuse conditions before publishing them; otherwise replace them with synthetic data in the same
  format, like `XML_SIA_sample.xml`.

Follow-up: none of these points is a direct remote attack; the most urgent are 1 (exfiltration host) and 2b
(irreversible growth of the data repository).

**Fixes checked (`origin/v3` 0345a5688; commits 7cb8303ef and 0345a5688).**
- **1 — checked.** The laboratory hosts are in `LAB_CONNECT`, added by `lab_hosts()` only until `LAB_UNTIL`
  (31 December 2026). ArcGIS is reduced to the exact query path of the measured service. *Remains:* the site without the
  launcher writes its policy into a `meta` tag when the pages are built (`tools/build_pages.py`), so the published pages
  keep the hosts until they are rebuilt after that date; rebuild them, or have K9 check the built pages too.
- **2b — checked.** Trial blocks go to the throwaway branch `lab/<trigram>`, created from the head of the main branch
  and deleted by « Clean »; one block at a time, 10 MB per session. *Remains:* the blocks already published on the main
  branch are still in its history; the purge is documented (`frame/aerodb/INTEGRATION.md`) but not run.
- **3 — checked, with a reservation.** Only the `datalab` screen declares `github: 'scratch'`, and the frame hands it
  `FrameData.github.scratch('lab/<trigram>')`. That transport refuses any path outside `lab/`, has no generic commit and
  never touches the main branch; the laboratory scripts do not call `FrameData` themselves. *Reservation:* it is a
  boundary of the API, not an isolation. `window.FrameData.github` (the whole transport) and `github.config()` (with the
  token) stay global to the page, so any script of the same origin can still reach them. A real barrier would need the
  token outside the page's reach (modules in a sandboxed frame or worker, or no getter returning the token).
- **4 — checked.** The encoded forms of each secret are replaced (`quote`, `quote_plus`, `html.escape`); a redirect that
  leaves `HOST` is refused (`StayOnHost`); `ead_probe/` is ignored at any level of the repository.
- **6 — checked.** `frame/aerodb/test/fixtures/SOURCES.md` gives each file's origin. The eAIP extracts are covered by
  the SIA's open licence, with the attribution it asks for. `lab/AIXM4.5_sample.xml` is synthetic (fictitious
  aerodromes and navaids; only the header copies the export's shape), which corrects the review above.

## <a id="review-regen"></a>Review of 28 October, evening (V3, `origin/v3` cf7574973): on-demand reading chain

Read-only review of four pieces of the data module and the launcher. Classification: **blocking**, **to fix**,
**acceptable**. No credential was handled during the review.

| # | Subject | Verdict |
|---|---|---|
| 1 | `tools/proc_ocr.py` (OCR of drawn pages: pypdfium2, Tesseract or rapidocr) | to fix |
| 2 | `tools/regen_jobs.py` (verbs `proc/ead-fetch`, `proc/eaip-fetch`) | to fix |
| 3 | `frame/settings` launcher keys, EAD service (ffb026685) | acceptable |
| 4 | `/__setup/status`: kinds of the Little Navmap databases (82eeef3b5) | acceptable |

**1. `tools/proc_ocr.py` — to fix.**
- `tesseract` is found by `shutil.which` without `NoDefaultCurrentDirectoryInExePath`: the current folder comes first
  under Windows ([M5](#m5), extended).
- Acceptable: engines imported on demand, no model committed; only `<out>/<ICAO>.ocr.json` is written, the ICAO code
  checked (`^[A-Z0-9]{4}$`); rendering and OCR run in a separate process under `OCR_TIMEOUT` (600 s,
  `proc_eaip.limited`).
- Notes: the display mode (a file without `--icao`) renders and reads outside `limited`, so without a time limit;
  `--dpi` has no ceiling, and a large page at a high resolution exhausts memory, which a time limit does not bound
  (cap it, e.g. 600).

**2. `tools/regen_jobs.py` — to fix.**
- `Jobs._run` logs `error: {e}` and returns `str(e)` to the page without `sanitize`; only `say()` of `_ead_fetch`
  cleans. An exception carrying an address with a session id, or the user name, would reach the job's log served by
  `/__setup/regen/job`. Both outputs go through `proc_ead.sanitize` with the job's credentials.
- Acceptable:
  - verbs from a fixed list, ICAO code checked;
  - credentials read from `secrets/ead.json` (ignored by Git) or `EAD_USER` / `EAD_PASSWORD`, never returned:
    `state()` only says present or not;
  - cache under `data/local/`, outside the code repository and excluded from synchronisation (`data_sync.py`
    `:(exclude)local/**`, data template `local/`);
  - `_ead_commit`: `git add` and `git commit -- <paths>` on `proc/manual/<ICAO>.json` and `index.json` only, no push;
  - eAIP address computed in Python from a checked AIRAC date, fixed SIA host: no request forgery;
  - routes refused to devices of the local network, POST under `_allowed`.
- Note: « never in bulk » only holds through « one job at a time »: a page script could chain aerodromes one after the
  other. A minimum delay between two `ead-fetch`, enforced by the launcher, makes the rule real, which matters while
  EAD Basic's terms on automated access are not settled (`frame/aerodb/EAD_BASIC.md`).

**3. Launcher keys, EAD service — acceptable.** `secrets_view` sends only `{ set, at }` for `ead`, no hint; the fields are
emptied after sending; nothing comes back to the page. Note: the personal EAD Basic password is now kept in clear in
`secrets/ead.json`, where `EAD_BASIC.md` said « never kept »: align the document, and say that `secrets/` must not sit in a
synchronised folder (Synology, OneDrive).

**4. `/__setup/status`, Little Navmap databases — acceptable.** Kinds only (« navigraph », « userdata »), filtered by a
pattern, never a path or a content. Note: `status` is also open to paired devices of the local network; they receive
these kinds, the computer name and `root` (the absolute path of the installation), which is of no use to a device:
remove `root` from the answer on the local network.

## <a id="review-1029"></a>Review of 29 October (V3, launcher batch 3a d6f31448a, frame 2c87a031b)

Read-only review. Classification: **blocking**, **to fix**, **acceptable**. No blocking point.

| # | Subject | Verdict |
|---|---|---|
| 1 | Loading of the verb files `tools/regen/<set>.py` (`load_verbs`) | acceptable, one fix |
| 2 | `commit_outputs(ctx, author, paths, message)`, the single commit of outputs in `data/` | to fix |
| 3 | `tools/.regen_last.json` (last job, last starts) | acceptable |
| 4 | `FD.revalidate(paths)` (frame data layer) | acceptable, two notes |

**1. `load_verbs` — acceptable, one fix.**
- Every `tools/regen/<set>.py` (except `_…`) is **executed** when the launcher creates the jobs: it is code of the suite,
  with the same trust as `tools/launch.py`. Only whoever writes to `tools/` of the code repository can add one; no path
  of the page or of the local network writes there (`frame_batch` is bound to `data/`, which is outside `tools/`).
- A file that fails is named in the console and left aside; the launcher goes on. `VERBS` is checked before it is merged.
- *To fix*: a set could overwrite an existing verb (`REGISTRY.update`) and above all lower a delay (`MIN_GAP.update`).
  The minimum delay of `proc/ead-fetch` matters for EAD Basic's terms: a delay is never lowered (keep the maximum), a
  verb already defined by another file is refused and said in the console.

**2. `commit_outputs` — to fix.**
- Good: `\` brought back to `/`; `..`, a leading `/` and `:` (pathspec magic) refused; only paths under `OUTPUTS`;
  `git add`, then `git commit -- <paths>` (never the index or another path); no push; git errors cleaned
  (`clean_error`).
- *To fix*:
  - the author must match `^[A-Z]{3}$` while the rest of the suite admits `^[A-Z0-9]{2,5}$` (`users.js`,
    `secrets_view`, the frame's flight path): a trigram of 2, 4 or 5 signs, or with a digit, silently never commits;
    use the common rule;
  - the paths reach git as **pathspecs**, that is patterns (`*`, `?`, `[`): nothing can leave the outputs, but
    `proc/*` would commit the whole of `proc/` at once. Set `GIT_LITERAL_PATHSPECS=1` in the environment of these
    commands (or refuse those signs), so that a commit only carries the named files.
- Note: the author is given by the page. It is an attribution, not a proof of identity (any script of the page can give
  any trigram); acceptable while the page is trusted, written in `frame/DECISIONS.md`.

**3. `tools/.regen_last.json` — acceptable.** Ignored by Git (the file and its `.tmp`), written atomically. It holds the
last job (set, verb, arguments — an ICAO code —, author, log and result, already cleaned by `clean_error` and `say()`)
and the times of the last starts: no credential. It reaches the page only through `/__setup/regen/job`, workstation
only.

**4. `FD.revalidate` — acceptable, two notes.**
- Only the keys of the repository's tree are read (`src.read(path, rev)` with the tree's revision): an absent or
  invented path is not read; a `reference` copy gone from the repository is removed, a `record` copy is kept; a pending
  write and the `cache` policy are never touched; offline, nothing is touched and the caller sets its copies aside.
- Notes:
  - like `get` and `read`, the adapter's `revalidate` is not bound to the module's declared `reads`: any module can
    revalidate any path of the repository (the existing reading model, not a regression); an unknown path revalidated is
    stored as `reference` by default, which can fill IndexedDB;
  - « never throws » only holds for the head and the tree: the `idb()` calls of the loop are not protected, so an
    IndexedDB error (quota) would throw. A `try` around each path, recorded in `errors`, keeps the promise.

Follow-up: the four fixes (delays never lowered and verbs not overwritten, common trigram rule, literal pathspecs, `try`
per path) and the note on the author are with V3 Frame.

**Fixes checked (frame batch 3b, 824acfa38).**
- `load_verbs`: a verb already defined (by the core or another set) makes the file refused and said; a delay is never
  lowered (the longest wins). Checked.
- `commit_outputs`: trigram on the common rule `^[A-Z0-9]{2,5}$`; `*`, `?`, `[`, `]` and `\` refused (after `\` is
  brought back to `/`); `GIT_LITERAL_PATHSPECS=1` in the environment of git. Checked.
- `FD.revalidate`: one `try` per path, a storage error recorded in `errors`. Checked.
- The note on the author (an attribution) is in `frame/DECISIONS.md`. Checked.
- New in 3b, acceptable:
  - `ctx.consume(keys)`: only the requested keys of the module's own query are returned; `with`, `from` and `pane` stay
    with the frame; the address is rewritten by one `history.replaceState` only when it is the main module's (never in a
    pane), from `URLSearchParams` (values re-encoded): no injection into the address, no remount;
  - single refusal shape (`frame/lib/launcher.js`): of an error body, only `message`, `reason` (40 signs) and `wait` are
    passed on; a route outside the declaration is refused without a call;
  - aerodb declares its launcher routes (`declaration().launcher.routes = ['regen/job']`) instead of `frame/app.js`; the
    frame gives no launcher client on a paired device of the local network.

## <a id="review-1029-split"></a>Review of 29 October, evening (V3, AeroDB readers split, 09654dde9)

Read-only review of the split of `tools/proc_eaip.py` into `proc_pdf.py`, `proc_sia.py`, `proc_layouts.py`,
`proc_records.py` and `tools/ead_probe.py`. Classification: **blocking**, **to fix**, **acceptable**. No blocking point;
the move kept the rules below, the point to fix and the notes already existed before the split.

| # | Subject | Verdict |
|---|---|---|
| 1 | [M5](#m5): programs found by an absolute path, current folder excluded | acceptable (kept) |
| 2 | Reading in a separate process under a time limit | acceptable (kept) |
| 3 | Caches under `data/local/` only | acceptable, one note |
| 4 | EAD credentials never as an argument or in a log; `ead_probe` inert in production | acceptable (kept) |
| 5 | Names of the SIA PDF files written into the cache | to fix |

**1. M5 — kept.** `proc_ocr.tesseract_path()` sets `NoDefaultCurrentDirectoryInExePath` before `shutil.which`; the new
files start no program (no `subprocess`).

**2. Isolation — kept.** Every PDF reading goes through `proc_pdf.limited` (`PDF_TIMEOUT` 60 s, `OCR_TIMEOUT` 600 s):
`pdf_pages`, `pdf_some_pages`, `pdf_kind`, `first_page_rows`; `proc_sia` and `proc_records` import these functions and
no longer open PDFs themselves; both OCR modes run under `limited`.

**3. Caches — acceptable, one note.** The launcher's jobs pass `data/local/eaip/<cycle>/` and `data/local/ead/`
(never published). Note: run by hand, `proc_sia.py` without `--cache` writes into `.proc_cache/<cycle>/` of the current
folder, which Git does not ignore; from the root of the code repository a `git add -A` would take the PDFs. Default to
`data/local/eaip/` or ignore `.proc_cache/`. The codes given on the command line are not checked either (they go into
the address and into `<out>/<ICAO>.json`): reuse `^[A-Z0-9]{4}$` as `proc_ead` does. The launcher's verb checks its
code (`_eaip_args`: a code of `_ead_args` beginning with `LF`).

**4. EAD credentials, `ead_probe` — kept.** `ead_probe.py` takes only `--user` (default `EAD_USER`), the password from
`getpass` or `EAD_PASSWORD`; its outputs go through `proc_ead.sanitize` and into `ead_probe/` (ignored by Git). Neither
`tools/launch.py` nor `tools/regen_jobs.py` imports it: a tool run by hand, nothing in production. `_ead_fetch` keeps
`clean()` (`sanitize` with the job's credentials) on the log and the warnings; `_eaip_fetch` handles no credential.

**5. File names of the SIA cache — to fix.** `pdf_names` takes the names from the aerodrome's HTML page with
`[^"'<>]+?\.pdf`, which admits `/`, `\` and `..`; `read_aerodrome` then writes `cache / name`. A page (or a redirect:
`urllib` follows them to any host) carrying `Cartes/LFxx/../../../x.pdf` would write a file ending in `.pdf` outside the
cache. The SIA host is fixed and served over HTTPS, so the risk is low, but the fix is one line: keep only
`[A-Za-z0-9._-]+\.pdf` without `..`, or check that `(cache / name).resolve()` stays under `cache.resolve()`.

Follow-up: point 5 and the two notes of point 3 are with V3 Frame.

**Fixes checked (bf540e3c2).** `proc_pdf.safe_path` is used by the eAIP and EAD readers: pattern
`^[A-Za-z0-9._-][A-Za-z0-9._ -]*\.pdf$` (an inner space for two real LFBO charts; never a leading space, never `:`), a
name made only of dots refused, the resolved path kept under the folder; names refused by `pdf_names` are said. EAD's
`SAFE_NAME` is stricter. Default cache `data/local/eaip`, else `.proc_cache/` (ignored by Git). ICAO codes checked on the
command line, in the single-aerodrome mode and in `read_aerodrome`. Checked.

## <a id="review-1029-evening"></a>Review of 29 October, late evening (V3: frame 3c-1, procedure job, data sync)

Read-only reviews. Classification: **blocking**, **to fix**, **acceptable**. No blocking point.

| # | Subject | Verdict |
|---|---|---|
| 1 | Launcher 3c-1 (cf65c4e86): `/__setup/status` reduced to detection, `/__setup/workstation` | acceptable, two notes |
| 2 | Procedure job `tools/regen/proc.py` (2ba4e64e7) | acceptable, two notes |
| 3 | Fuel: read reasons from the catalogue (cba2fb00c) | acceptable |
| 4 | Data synchronisation fix (8e694e469) | to fix, three notes |
| 5 | `sia/base` committed only on the user's gesture (1c2506a41) | acceptable, one note |
| 6 | Overlaps of one family in the base's build stats (6e50698e3) | acceptable |
| 7 | Data synchronisation, fixes (2bf0021be) | acceptable, one integrity point, two notes |
| 8 | Fuel: procedure rules in `frame/lib/procedures.js` (48afe2544) | acceptable |
| 9 | Launcher: one route table with its audience `lan` / `poste` (3073048c7) | acceptable, one older point to fix |
| 10 | `POST /__setup/regen/job/put` for the base builder (5e785599c) | acceptable, two notes |
| 11 | Data synchronisation: building seen by file times, settle names files, realpath (97e052251) | acceptable |
| 12 | Flown track `progress.actual.trail` (ff51be774) | acceptable in code; privacy decision for the user, one note |
| 13 | Data module D2, read-only screen (1ce6fcc1b) | acceptable, two notes |
| 14 | Fuel: procedures card refactored (3c98b564b, aa74300b4, 5dc40f465) | acceptable, one note |
| 15 | Repository address without any user part in https; put once per zone (16734c42f) | acceptable, one note |
| 16 | `FD.list` by key range, IndexedDB v2, parsed references shared (cf52ad2a2) | acceptable; shared values are mutable |
| 17 | Flown track at ~100 m, `trailFrom`, privacy sentence (127e0b721) | acceptable, one note |
| 18 | AeroDB D5: base built on the workstation by a headless browser (8755aad9c) | acceptable; one design point settled, four notes |
| 19 | Data module « Construire » panel (8990b3ab7) | acceptable, one note |
| 20 | Map: choosing a procedure on the map (5b713f77e) | acceptable, one note for Fuel |
| 21 | Fuel layout (918ce4010), Atmosphere layers panel (d36f4be70) | acceptable |
| 22 | AeroDB: `source.url` of the eAIP records (d88463e51) | acceptable, one point to fix |
| 23 | Data module « Publier » (3355c5e24) | acceptable, one note on the result's shape |
| 24 | Frame: claim, `/cancel`, sync on gesture, named applications, frozen references (56ab4fd94, f70eba426, a215d47bd, e3870b354, 802e6856f) | acceptable, two notes |
| 25 | AeroDB path B (2dbfea12a) and `source.url` host check (97bf5577f) | acceptable; points of 18 and 22 settled |
| 26 | Fuel « Sur la carte » and the map's proposal (d4f683475) | acceptable; note of 20 settled |
| 27 | Frame G1: GitLab transport (a0f3854d9) | **blocking** (token reused for a new host), one to fix, one note |
| 28 | AeroDB `base/fetch` and `base/purge` (ac84d562e); Data module corrections (6330c5133) | acceptable, two older points to fix, one note |
| 29 | Map: track from `progress.actual.trail`, « Choisir sur la carte » button (a158edbe5) | acceptable, one note |
| 30 | AeroDB: the points of 28 in `aero_fetch` (38a9d39b7) | acceptable; points of 28 settled, one note |
| 31 | Fuel: « Source » link (c540c3efd), past-date warning (9d9d2f686) | acceptable |
| 32 | Frame: GitLab fix (02a096440), Maintenance level and `_run` state (9d64081c9); Map « Source » link and track (f7bad9970) | acceptable; **the blocking point of 27 is lifted**; one note |
| 33 | Fuel: aerodrome names and completion (842ac149b) | acceptable |
| 34 | Frame G2: « Pilots' tokens » (241eec6c0) | acceptable, one point to fix, two notes |
| 35 | Data module « Télécharger » and « Purger » (0d2f031d3) | acceptable, one note |
| 36 | Frame G2 fix (efbb97f49) | acceptable; the point of 34 is settled |
| 37 | Fuel: an aerodrome field is a search (26d47f149), proposal after the flight is read (fe3d33c5c) | acceptable |
| 38 | Frame R1a: the airline's relay (7ca73448c) | **blocking before any exposure** (fails open if the proxy rewrites Host), two to fix, four notes |
| 39 | Flight plan export, X-Plane `.fms` and MSFS `.pln` (99d28acd0) | acceptable, one note |
| 40 | R1a fix (1e573d782); `escText` (d18a739b4) | the blocking point of 38 lifted for the case described; one residual case to close before exposure |
| 41 | Frame R1b: IVAO OpenID through the relay (a9840bd19) | acceptable, four notes |
| 42 | Frame: a port dedicated to the relay (ee6044e8b) | acceptable; **the residual case of 40 is closed**; one note |
| 43 | Frame: R1b retouches and start-up order (b27cae045) | acceptable; notes of 41 and 42 settled |
| 44 | Data sync: resuming a rewritten history (6ba742877) | acceptable, one small point to fix, one note |
| 45 | Frame: the flown track kept on the device (0bbe7ebbb) | acceptable |
| 46 | Map: an airspace's bounds kept in a `WeakMap` (0f5891d4c) | acceptable |
| 47 | Map: choose mode over three families, one return (af261d3e3) | acceptable; one functional note |
| 48 | Resumption retouches (add1e78a3), frozen test base (94515ca99) | acceptable; point and note of 44 settled |
| 49 | Map left right after mounting (94ce646e8) | acceptable |
| 50 | Fuel: the map's proposal in one pass, runway wind (25b887349) | acceptable; note of 47 settled |
| 51 | Frame: local-network pairing from the same origin, literal pathspecs everywhere, GitHub without redirects (c60c52f35) | acceptable |
| 52 | Fuel: the route batch (5a374c189, d34ad04fb, 79993b1ea, 40f834eb7, 1bade3bc8, 512902c66) | acceptable |
| 53 | Tests: K49 and the noreg lock (6673bc93f, 13763c136, 28a914d36, 2bb9162e1) | acceptable |
| 54 | Map: nine display commits (83c31fed9 to 43df712ef) | acceptable |
| 55 | Settings: « IVAO application » assistant (b98589ae4) | acceptable, one note |
| 56 | Frame: IVAO account without an application, one source of return addresses (e13964b44) | acceptable, one remark |
| 57 | Launcher: the « aircraft » job set, `regen/verbs`, IVAO retouch (d8919b0e6) | acceptable, two notes |
| 58 | Launcher: the « vfr » job set, common rules for children and purges (ab0258453) | acceptable; notes of 57 settled; three notes |
| 59 | Data module: a panel per group (2456bf289) | acceptable |
| 60 | Fuel two-word procedure name (bae413f55), Map TOC / TOD (3ed39a3e4) | acceptable |
| 61 | Launcher: procedures by State (622936805) | acceptable; notes of 58 settled; one note |
| 62 | Fuel anomalies 9–13 (c5f771b7a), Map framing and heading order (e54c0b00e, 1367d3523) | acceptable |
| 63 | Aircraft module: sheets editor (224d3cdbe), fleet view (86fa1c5ff) | acceptable, one note |
| 64 | Fuel `.fms` with ARINC approach (232f85dfe), approach labels (e315c2e0b) | acceptable |
| 65 | Fuel: the sheets editor removed (4044dc8ba) | acceptable |
| 66 | Launcher: one User-Agent, outbound failures logged (37b043e68) | acceptable, one small point to fix |
| 67 | openAIP runways (abf143819) and its fix (4802818a2) | acceptable |
| 68 | Refactor R-F1: runway wind in `frame/lib/wind.js` (552e0889d) | acceptable, no change of behaviour |
| 69 | Refactor R-F2a: one approach-transition rule (30cf56414) | acceptable, no change of behaviour |
| 70 | Session id cut from the log, zip ceilings, same host by default (423ae3f98) | acceptable; points of 66, 61 and 30 settled |
| 71 | Data module: VAC and Procedures panels on the launcher's verbs (3b6df2ada) | acceptable |
| 72 | Map: « around the flight only » layer switch (4f9dca4c3), test D31 (422ed8b3f) | acceptable |
| 73 | Refactors R-F2b (4ae61e552) and R-F3 (fd959f911) | acceptable, no change of behaviour |
| 74 | Frame: the application switcher and per-application identity (1d11ae81c) | acceptable |
| 75 | Map: light drawing during a gesture (c3eed56db) | acceptable |
| 76 | Refactor R-C2: one pairing for both channels (4e83fc50a) | acceptable, no guard lost; two notes |
| 77 | Frame: « Workstation folders » card; R-C2 notes (36f571e40) | acceptable; notes of 76 settled; one note |
| 78 | Refactor R-F4a: the route model in `frame/lib/route_model.js` (7cd47db8d) | acceptable, no change of behaviour |
| 79 | Refactor R-C3: IVAO's return in one place (7426e127d) | acceptable; no guard lost, surface reduced; notes of 77 and 41.4 settled |
| 80 | Map: Layers chip (a314a352c), approach transitions filtered by the STAR (c884c8b3d) | acceptable |
| 81 | Refactor R-F4b: procedure ends computed once (ddf10e3b8) | acceptable |
| 82 | Data module: « Update everything » chain (3a908fa44) | acceptable |
| 83 | Refactor R-C4: the launcher publishes its route table (d3fa3614a) | acceptable; no route changed audience |
| 84 | Map choose pane (c47470399); data repository's provider read from its address (48079d78f) | acceptable |
| 85 | Map: labels in the collision pass (ccedbd6c6, 1d137874f) | acceptable |
| 86 | Refactor R-F4c (81ff938e2), status lines that lead somewhere (232e92bb3) | acceptable |
| 87 | Refactors R-C1 (one Relay identity, 68b2f4dbe) and R-F5 (one completion list, f7183950a); 39a28c9b0 | acceptable; no guard lost |
| 88 | Refactor R-M4: one runway store on the Map (0422d2d2a) | acceptable |
| 89 | `base/pickup` from Downloads (25beba925); refactor R-C5 (29db3a2fb); 64e5f2d98 | acceptable, two notes |
| 90 | Refactor R-S1: the Data module (567cfe7ff) | acceptable, no change of behaviour |
| 91 | Refactor R-M6: the frame's track as the Map's only source (e0cabb221) | acceptable |
| 92 | Zone outlines (d6011f983), Fuel offline files (6379d2b18), a test (7691a3397), sheets on a phone (7fc062bd1) | acceptable |
| 93 | Refactors R-M3 (70e63c907) and R-F6 (d734c3572); 83e75ad89, 5590b5f72 | acceptable, no change of behaviour |
| 94 | Fuel test cases (d24772b8a, bb9076aca, ad2f8330c); Map plain background from aerodb (bb9c98570) | acceptable |
| 95 | Data module, “take the downloaded file” (c62d555e6, `base/pickup` of 89) | acceptable, one note (closed in 104) |
| 96 | Refactor R-M1: the Map's choose pane on one model (5e4b9433f, 7112b1b3b, e70eacb38) | acceptable, no change of behaviour |
| 97 | Suite update by channel, `/__setup/update` (4fc473e5d); the two notes of 89 closed | acceptable, two notes |
| 98 | Refactor R-M2 + R-M5 (a): one cartouche, procedure hues from the theme tokens (3e65a0465) | acceptable, no change of behaviour |
| 99 | Data module, the zone map to tick (4b201ca99); noreg locks (b939f4051) | acceptable |
| 100 | Help panel and welcome card placed under the module (09c9cacb4) | acceptable |
| 101 | Refactor R-M2 + R-M5 (b): every Map label through one request, aerodb answers deduplicated by key (87748d47a) | acceptable, no change of behaviour |
| 102 | Refactor R-C6: one base for the GitHub and GitLab transports (72ba695a8) | acceptable, no guard lost |
| 103 | Suite update refused while a job or a sync runs; trust stated (2a02aedde): the notes of 97 closed | acceptable, one note (closed in 105) |
| 104 | The take bound to the zip shown in the plan (79aaed096, 1e7a06443): the note of 95 closed; approximate outlines on the zone map | acceptable, one note (closed in 109) |
| 105 | Suite update: fetch outside the locks, job starts held during the write (99b4c2a25): the note of 103 closed | acceptable, one note (closed in 107) |
| 106 | Refactor R-S2: one read and one write of the airline's map profiles (b4e76634e) | acceptable, no change of behaviour |
| 107 | Suite update bound to the version shown (513f6fb5b): the note of 105 closed | acceptable, one note (closed in 108) |
| 108 | Suite update, `suivi` channel: fast-forward to the plan's own commit (bad15045f): the note of 107 closed | acceptable |
| 109 | Data module: only the sources whose zip can be checked are taken (23e56bc9f): the note of 104 closed | acceptable, one optional hardening (done in 111) |
| 110 | Refactor R-M2 + R-M5 (c): one collision pass over a closed list of ranks (9f703190c) | acceptable |
| 111 | `base/pickup` with `zips` takes only the sources shown (8965e8c47): the hardening of 109 done | acceptable |
| 112 | Refactor R-S3: one function saves the launcher's secrets (77264918e); `not-shown` in the Data module | acceptable, one note (closed in 114) |
| 113 | Map: the sheet as high as what it shows, at most half the view (06dcd175b) | acceptable |
| 114 | Refactor R-S4: one frozen table of providers (e8aa8dab3); the note of 112 closed | acceptable |
| 115 | Frame: a side pane closed before its module arrives (d6e7fa27a) | acceptable |
| 116 | Map: one writer of the framing, the user's framing kept for the same flight (3d2346411) | acceptable |
| 117 | Refactor R-S5: one end-of-job chain and one journal header in the Data model (89dd17934) | acceptable, one note (closed in 118) |
| 118 | Own keys only in the Data module's tables (8acd4976e); the provider carried by the configuration (540393e28); a configuration's `api` sends the GitHub token anywhere (since ca75625f39) | acceptable; **to fix** (older, fixed in 119) |
| 119 | The GitHub token sent to GitHub only: transport (683af2b8d) and configuration (375803a86); the point of 118 fixed | acceptable |
| 120 | Refactor R-S6: one end of operation, one dry plan, one table of summaries in the Data module (794f6ac60) | acceptable, no change of behaviour |
| 121 | Refactor R-S7: the base drawn by the common set panel of the Data module (317d8d46c) | acceptable, no change of behaviour |
| 122 | Map, choose pane: aerodrome centred, first family's candidates drawn faded (6a8403466) | acceptable |
| 123 | Map: the light drawing of a gesture paints the points of the full one (696fb035f) | acceptable |
| 124 | Refactor R-S8 (1/2): the Data module split into seven files (435f70e44) | acceptable, a move only |
| 125 | Map: the profile built without waiting for the relief, then completed (f28b33257) | acceptable |
| 126 | Refactor R-S8 (2/2): the Data model split into six pure files behind a facade (bdb072221) | acceptable, a move only |
| 127 | Refactor R-S9 (1/2): the Settings screen's cards and actions in two files (6105be2ba) | acceptable, a move only |
| 128 | Frame: `ctx.net.fetch` waits at most 3 s for the airline's first read, then refuses (aabaa0f3b) | acceptable |
| 129 | aerodb: a zone part's read bounded, the shared read abandoned at the bound (80a355157) | acceptable, one note (closed in 130) |
| 130 | An abandoned read writes nothing to the cache (a90e431e3): the note of 129 closed | acceptable |
| 131 | Refactor R-S9 (2/2): the Settings' shared texts in `kit.js`, `render` in parts (3fe9628ca) | acceptable, no change of behaviour |
| 132 | The Weather module rewritten on the frame's weather layer (0e1631995, cf6238b10, baa91389f, 6c1da70c6, 61778a14d) | acceptable |
| 133 | Weather layer: `cost()` of a request, from the cache only (d9609bd7f) | acceptable |
| 134 | Map base: `zonesLayer`, zones drawn and tapped on a MapLibre map (1a519954f) | acceptable |
| 135 | Frame: one marked tab, Help and Settings in the bar, one manual per application (cc6503ee0) | acceptable |
| 136 | aerodb: a zone's frame computed around its main ring (fed1c6f4a) | acceptable |
| 137 | Frame: `fuel_units.js`, fuel densities and conversions (85b1300e4) | acceptable, two notes (closed in 139) |
| 138 | aerodb: a sheet describes a type or variant, the fleet names it (130048967) | acceptable |
| 139 | Fuel units: own keys only, strict numbers (78cf63f65): the notes of 137 closed | acceptable |
| 140 | Group of 1 November: zone map on `zonesLayer` (9f637a970), mission reader (96ff67873), Missions module and `#fuel?mission=` (879816763) | acceptable |
| 141 | IVAO return: a same-origin hop page instead of a redirect, refusals logged (2812c0689) | acceptable |
| 142 | Group of 1 November evening: transport errors told apart (fe6713570), repository address normalised (0ea44bd45) | acceptable |
| 143 | CSP: `connect-src` opened to `gitlab.com` and `framagit.org` exactly; CSP refusals told (48fc586c2) | acceptable |
| 144 | Service worker: the next version read whole into a separate cache, taken at once (ed34c5a1b) | acceptable |
| 145 | Group of 1 November night: GitLab `whoami()` (cbac9face), CSP refusals in the diagnostic (3f84b21f4), texts of § 10.36 (6bd060c0f), `core.safecrlf=false` (25bc3e625) | acceptable |
| 146 | § 10.36, GitLab by default with one project token per pilot: “Add a pilot” (804e1992f), Join and the token's check (22d126964) | acceptable |
| 147 | Group of 1 November morning: openAIP exports absent for a country remembered per cycle (822a0ffbb); texts (ccb66b466) | acceptable |
| 148 | Launcher: the administrator's GitLab token set and tested from the screen, `/__setup/gitlab/admin` (ceda4da6c) | **to fix** (fixed in 149) |
| 149 | A changed GitLab instance needs its own token (ca9e23445): the point of 148 fixed; pilot tokens' count (01b6f511f) | acceptable |
| 150 | Group of 1 November noon: one enrolment path (7272b0414), the administrator's assistant card (9d0700ad3) | acceptable |
| 151 | Group of 1 November afternoon: the pilot token just created shown alone (6b90f3463) | acceptable |
| 152 | Launcher: the data branch opened to Developers by the administrator's token, `/__setup/gitlab/admin/branch` (c6f3bc38b) | **to fix** (fixed in 153) |
| 153 | The data branch: no force push, protected when it was not, the restore checked (d74d4431d): the points of 152 fixed | acceptable |
| 154 | Group of 1 November evening: bounded aerodb reads extended (c78b26df4), bounded waits in Fuel (f3d4e82a9), Map base and canvas (eb9111d3f, 40532a1cc), assistant (946881d5f) | acceptable |
| 155 | The administrator's GitLab token: where and since when, without its value (57f581209) | acceptable |
| 156 | Frame: the airline's logo read from the data repository and shown by a `blob:` address (02538ab1a) | **to fix** (fixed in 157) |
| 157 | The airline's logo in PNG or WEBP only, never SVG (a9d29f446): the point of 156 fixed | acceptable |
| 158 | Data-repository files as untrusted input: mission registry paths (4ac930efa), the site's page links, Missions apps (a15c17d0a) | acceptable, one note |
| 159 | Review of 10 November (before the refactoring day): file upload `/__setup/base/upload` (3f101da7b, 1805057c5, 0a99d0738, 42aab1ae8, 870408de6), Little Navmap verb and `fetchLnm` (801c90c2b, eaf75ea65), per-page Esri CSP (e60e412d1), relay limits (4c75c1df3), `repair_ledger_defaults.py` (6f23e1a50), UK Mil TLS fallback (d86b81d6d), `personal-undeclared` (e293f3741) | acceptable, four notes |
| 160 | Little Navmap records kept on this device: no position in the flight, left out of the FMS / PLN files (4eaf79a59): the note 2 of 159 closed | acceptable, one note |
| 161 | Fuel “Read from Little Navmap” gesture, the read of `cache/data/personal.json` (d4e807cdf) | acceptable, one note |
| 162 | Review of 11 November: Little Navmap procedures in the simulator files (af3c60e9f), `recette/decision` verb and its generator (ed9080347, 7126fb750), clean-up of the hand-deposited files (f8bbdda36, d7cb8b9ca) | one to fix (clean-up), the rest acceptable |
| 163 | The personal-use tick held by the launcher (3dcc5e780), the notes of 159 and 162 fixed (a5f6dd6ab, 6606df07c, d69a96d8c, 607dc8819) | acceptable, one to fix (zip64) |
| 164 | The zip64 directory check follows the locator (5fe013431): the point to fix of 163 closed | acceptable |
| 165 | Review of 12 November: ISO reader (f10dff198), NASR subscription read in place (48cc3811c), file deposit (zip carrying an ISO, FRA archive: f10dff198, 971fe40e6), job release (8494deb47, 8ec252fb7), persistent journal and `base/last` (476074e7b), `base/publish` (77ad22f6d), `base/cycle` (d370bc220, 5cb9dc776), `zipmember.js` | two to fix, one to harden, the rest acceptable |
| 166 | The zip guard, the FRA cap and the ISO page cap (24144e4c4): the points of 165 closed | acceptable, two notes |
| 167 | The follow-ups of 166: the older zip openings through the guard, 600 ENR pages, FRA archive two workbooks, ISO reading time (72afa5864, bfce4aa0e) | acceptable |
| 168 | The French aircraft register reader: five columns by header name, original never kept, code-only refusals (7c6ec44ae, f6f5874d9, acac33c67, bcb60f834) | one to fix, fixed (builders' names in CONSTRUCTEUR) |
| 169 | The Data screen rebuilt (044ece8cf to 90a3d43bd: country groups, country sheet and its gestures, what is left to do, Publish with the plan first, multiple selection, `zipmember.js`, the last operation's thread from `base/last`), `sendNow` (03a8c1813), the version guard (d303565f8) | acceptable, two notes |
| 170 | The evening of 12 November: Fuel direct to a point (be836ed83), ATIS runway (616a86f69), flight-plan route text (9bdf17bcc, 2633fb837), route timing and diagnostic (53c265b03); glyph-name PDF decoding and the SIA parser (9ec05bd67, 72cc16492); the second push of the Data screen (c08a6dd92) | acceptable, one to harden |
| 171 | The glyph-name digits and the radius bounded (3799bd678): the point to harden of 170 closed | acceptable |
| 172 | The DIRCAM lot of the Data screen: one zip member read on the device and sent, the lines of the datasets to do (1eafcd087) | acceptable |
| 173 | `current_flight.airline` written by Fuel and read by the report (a2bb9cfc4, SOG-0041): the families, the heading and the saved record follow the company of the flight taken | acceptable, one functional note |
| 174 | The night of 13 November: the Map's Weather layer (163722b25, SOG-0092) and the weather store's `cacheOnly` (01b1538f8); the mission Registry, one line per mission (db091c505, SOG-0286); the GeoNames extract for Portugal and Ireland (0114f9cdb, SOG-0102); the Data map's wheel and hover (6889a1d7b) and the editor mock-up (7c3b8e4bb) | acceptable, two notes |
| 175 | Little Navmap sheets: "Export the sheets" writes only (e6811d642, SOG-0023); the report's families follow the company of the opened report (fec39491b, SOG-0041) | acceptable |
| 176 | The registry reader bounded and "not read" beyond 500 files (81148257a, audit 174 notes) | the 500-file limit acceptable; one defect to fix (identifier cut to 12 against the 40 of the plan) |
| 177 | The registry identifier kept at 40 characters, shortened on screen only (ae9df7beb): the fix of 176 | closed |
| 178 | The morning of 13 November: the Missions sheet's summary and the family / subtype lists (67e2e93ac SOG-0291, 7709e99b1 SOG-0292); the V2 registry index attaching an entry under a former number (1db36bcb8, 3dafa9d33, SOG-0289) | acceptable for the display; one defect proved (absorption loses data) |
| 179 | The V2 registry's “Open in the generator” notifications, the guard delays and “Copy the diagnostic” (7e02b1204, SOG-0290) | acceptable, one note |
| 180 | The fix of the defect of 178 (eba9923ce) and the search in the content of the missions (c83592c6a, SOG-0288: `modules/missions/search.js`, the index built at the first keystroke) | fix verified, defect closed; search acceptable, two notes |
| 181 | The V2 registry: the missions kept by the browser, counted and exported in one downloaded archive (025bd7651, SOG-0293 a, b) | acceptable; one defect proved (the header of an exported file) |
| 182 | The V3 mission editor: the frame step (3ace1a58f, SOG-0287; `modules/missions/editor.js`, new) and the teams step (c138087b3) | paths and display acceptable; two defects proved (the teams step loses data, a dump of a file with aliases) |
| 183 | The V2 registry, group B continued: the reports under a former number (a78fa30b0), “Compare with the folder” / “Store in the folder” / “Keep the file” (ec6c6ee02, SOG-0293 c), the texts received in a batch kept per mission (d46aee7c1, SOG-0294) | acceptable; one defect proved (the comparison of a served file with aliases), three notes |
| 184 | The fix of the defect of 181 (337e3c177: header of an exported or stored YAML, names in the archive) and the comparison extended to the shared mission and the draft of the generator (22dbe6d04, SOG-0293 c) | fix verified, defect closed; extension acceptable |
| 185 | The fix of the defect of 183 (b8e3048ef: `loadYaml`, a budget of expanded nodes, one `try` per item, the three notes) and the button emphasis of the comparison (d140b1358) | fix verified, defect closed; one note |
| 186 | The fix of 182 (ef0772f71) and the V3 editor's places and story steps (6dc8740f5, ce72c9c25, 923807228); the V2 comparison's header and criteria (cc8dfc3b1) | defects 1 and 2 of 182 closed for the editor; two defects proved (a single-object rendezvous is deleted; the registry's own dump is not guarded) |
| 187 | The fix of 186 (d1f544bfe: `shapeOf` in the frame, single objects read as one entry, the guards of the registry, `add.js` and `move.js`), the editor's risks step (92906e900), `aerodb.navaidsOf` (7667e5c6c) and the stop-point names of `ground.py` (62cc7ce8f) | defects of 186 closed; one defect proved (the risks step deletes a risk whose danger is under `title`); AeroDB acceptable, two notes |
| 188 | The morning of 13 November, second group: the recette's comments and free texts raised to 2,000 characters in the page and in the launcher's verbs (45cba6733, SOG-0303); the two notes of 187 on `navaidsOf` (1cb71c46c); the Map's display commits (8b73c9944, 2d80e2c7d, 8f6a17c01, 36a3300bf) | acceptable, one note |
| 189 | The V2 registry: every YAML read through the guarded function (29fe8ec28, the note of 185) | note closed |
| 190 | The fix of 187 (779654075: risks under `title`, translations aligned, the registry's node ceiling), the editor's timeline and maps step (2dfa0aeca) and the commercial family (57c8cb17a) | defect of 187 closed; one defect proved (a `timeline` that is a list loses its events), three notes |
| 191 | The published site's root: one added step in `pages.yml` and `build_pages.py --root-only` (93258d646, SOG-0278 / Q-0039), read before the push | accepted, three notes |
| 192 | The Map alone: “Choose this route” is never a dead button (edbe901be, SOG-0224) | acceptable, display only |
| 193 | The publication of the site's root (78053845b on v3, 027747a83 on develop), the Map's “around the flight only” (b4efa222d), Fuel's proposals after a choice on the Map (dd7c3f8d2, 95d0a34f2), the stop points' runway and the ENV charts (e79e56dd1), the wording of the recette verbs (001b4aa56) | acceptable, one note |
| 194 | The fix of 190 (ac9489a17: the timeline where the file keeps it, every tolerated shape kept) | defect of 190 closed, its three notes taken; one note |
| 195 | The V2 missions folder that does not answer (1a5d7e6ac), the Map's ground signs and arcs (593e6d6c9, bed86e5b4), Fuel's METAR before “On the map” (a78c17066) and its Little Navmap mention (1f3dfe6a6), the read-only status verbs `proc`, `vfr`, `aircraft` (345ad3c15) | acceptable, three notes |
| 196 | The two remarks of 195 (823cfe506) and the Map's runway choice by wind (135b1b755, SOG-0306) | remarks taken; display acceptable |
| 197 | The French aircraft register fold in Data (336344f75, SOG-0315) and the administration button of the Map's thresholds; Fuel's “Start” and direct to a point off the route (75fd4f6be, SOG-0088) | acceptable, one note |
| 198 | Display and links: the airspace chart's room (1ebf19404, SOG-0307), the “Defined countries” labels (b264626ca), the link to the register fold (2e397622b) | acceptable, display only |
| 199 | Advice before the code on SOG-0294 (“Store the copies” of `recu/`); the Map's mission window (eecfa3bd0, 4e37bbb01, SOG-0311 / 0312) and the other display commits of the day | advice given; acceptable, one note |
| 200 | “Store the copies” of the V2 `recu/` folders (a436f3099 and the guard 6c5c3fa09, SOG-0294) and the abandon question in the Map's mission window (34bfa4fc4) | accepted with the guard; the note of 199 closed |
| 201 | The OpenTopoMap base of the Map's topographic view: the `meta.net` declaration (dac136e87, SOG-0300 T1) and the wording of the “Store the copies” question (a2ed9890f) | accepted, no note |
| 202 | “Report a problem or a request” (1eb316b28, SOG-0316): the `signalement` verbs of the launcher, the reserve of the screenshots' bytes, the pilots' reports in the data repository | accepted, three notes taken |
| 203 | The 16 MiB cap on the body of a job POST (42c68e94a) and the reader of the user's VFR circuits XML (34c24550e, SOG-0253) | accepted; one defect proved in the first version of the reader, fixed before the push |
| 204 | The Iceland source read by the launcher (688b0f238, SOG-0240), the `aircraft` field of the VAC interpretations (ccf5bcd11), the “waiting in Downloads” state (1e99374c8, da1c44b14), the `route-point-hover` window event (6db4e07cc, ce3fd0f63) and six commits without surface | accepted, two notes |
| 205 | The cache of the route calculation's results, `data/local/route-cache/` (89738c128, SOG-0296), read after the push | acceptable; two small defects on a hostile file, one note |
| 206 | “Start again from scratch on this device” (182818739, SOG-0324) and the “VFR circuits” fold of Data (3818191f6, SOG-0253), read after the push | the first never touches what the device alone carries; one defect (it empties while offline); the second accepted |
| 207 | The Map opens a launcher route to draw the user's VFR circuits (4752a85b0, SOG-0253), read after the push | accepted: one route already given to another module, one read-only verb, local only, the answer sanitised; one note |
| 208 | Reporting a bug from the phone (SOG-0335: d2a1d2756, dbe0959f8, a0565e169, bcbd6bf39, fb1f1301d) and the closing of the defects of 205 (a5e860af0) and 206 (da1e1ea61), read before and after the push | accepted, notes only; both defects closed with a counter-test |
| 209 | The PDF libraries as an option: `pdf/status` and the reading guard `tools/pdf_guard.py` (a96bead62, c1a5ed984; Q-0053), read before the push | accepted; the three notes of the first read closed by the second commit |
| 210 | The rate-limit guard of the repository transports (dc49ecd1c, ef9bc330c, SOG-0337) and the incremental tree read (0727fca71), read after the push | accepted; two small notes; no secret kept or shown |
| 211 | The launcher's write lock (e9d5f02dc, SOG-0339), the one-report-per-tap guard (ea32c4a86), the named repository (2d8fccb3c), “My assigned missions” (0f7361539), the places sketch of the editor (9422d3925), the arrival data kept in the flight (61878e580, f791073a7; SOG-0325) and two missions fixes, read after the push | accepted, two notes |
| 212 | The history of the verdicts of the acceptance sheet (9fa8575bf, SOG-0351: `recette/verdict`, `recette_build.py`, the sheet), read after the push | accepted; two small notes |

**1. Launcher 3c-1 — acceptable, two notes.** `/__setup/status` has one shape everywhere (`server`, `data`, `dataGit`,
`host`, `lan`, `lnm`; `lnm: []` for a paired device). The workstation's settings (`root`, `git`, `dataRepo`, `lfs`, `csp`,
`relaxNav`) are only in `/__setup/workstation`, refused twice to a paired device (`_lan()` in the handler, and the route is
not in `lan_access.ROUTES`). The pages fall back safely on a 403 (no badge; `sog_registry` reads `csp` as false and refuses
the group mode, as before). Notes: `data_repo_url()` returns the address as written in the configuration, so a
`user:token@` written there reaches the workstation's page (strip the user part, or refuse it at first launch); the
Maintenance page says « without launcher » on a paired device (wording only).

**2. `tools/regen/proc.py` — acceptable, two notes.**
- Credentials only from `regen_jobs._ead_credentials` (`secrets/ead.json` or the environment); `check_icao` refuses any
  field but `icao`, so no credential can reach `args` or `tools/.regen_last.json`. `Env.clean` (`sanitize` with both
  secrets) covers the progress, the log, the failures and the warnings; the job base cleans again (`clean_error`).
- ICAO checked once at the entry (`^[A-Z0-9]{4}$`, and `LF` for `eaip-fetch`); `read_aerodrome` repeats the same rule.
- Outputs: `proc_manual.install` writes `proc/manual/<ICAO>.json` and `index.json`; `commit_outputs` receives these two
  fixed paths, with the common trigram rule, literal pathspecs, no push. 30 s between two `ead-fetch` starts.
- Notes: `install` names the file after `doc['icao']`, not the checked argument (today always equal): refuse a
  document whose code differs; `ead-fetch` accepts an `LF` code although France is never read through EAD: exclude it
  in the table of sources (fewer needless EAD accesses).

**3. Fuel, read reasons — acceptable.** Reasons are codes translated by `AeroCatalogue.READ_REASONS`; an unknown code
and the workstation's message (which may carry a server's document name) go through `notify()`, which escapes its text.

**4. Data synchronisation (`tools/data_sync.py`) — to fix, three notes.**
- Good: `git()` returns stdout alone when git succeeds; files in conflict read from the index (`ls-files -u -z`);
  `resolve()` refuses `/`, `..` and `:`; any exception cancels the merge; the launcher's commits check `MERGE_HEAD` first
  (`commit_outputs` before its `add`, the VFR import before writing); `_journal` writes only git's `warning:` lines (300
  signs, 20 lines) to the launcher's console, never a repository address.
- *To fix*: `settle()` concluded a pending merge with `commit --no-edit`, that is with **the whole index**. Files staged
  before the interruption went into the merge commit and were pushed, without `pool_changes` or `data_guard`. Realistic
  case: under the old code, the data writes, the aircraft database publication, the VFR import and `commit_outputs` ran
  `git add`, then their commit failed on `MERGE_HEAD`, leaving `AircraftDB/` and `sia/vfr/` (outside the pool) staged.
  Decision: `settle()` always cancels (`merge --abort`, which keeps the workstation's changes) and the pass redoes the
  merge.
- Notes:
  - `/__setup/sync` is open to paired devices: `_why()` gives « type : text » of a launcher error, where an `OSError`
    carries the absolute path of `data/` (removed from `/__setup/status`); so can the 800 signs of git's output. Give
    a paired device a generic message, or remove the installation's path from the text;
  - strip `user:…@` from any git text returned to the page or written to the console (git hides it in its own
    « unable to access » and « Authentication failed » messages, the launcher cleans nothing itself);
  - `resolve()` does not refuse `\` (a separator for `os.path.join` under Windows; git normally refuses such paths there):
    reuse the rule of `data_file`; the aircraft database publication copies its files into `data/` before checking
    `MERGE_HEAD`: check first, as the VFR import does.

**5. `sia/base` on gesture only — acceptable, one note.** `GESTURE_ONLY` paths are taken out of the changes before
`data_guard` and `git add`; the start-up pass (`update()`) has no gesture; the launcher takes `gesture` only when it is
`true`; the frame sends it only for a `manual` pass; the number of files kept is said, never their paths. Note: the flag
is given by the page, like the author: an intention, not an authorisation (any script of the page, or a paired device,
`/__setup/sync` being open to them, can send it). It guards against background passes, not against a deliberate call.
Decision: `sia/base` is kept on the workstation while a build job of the base runs, gesture or not (with V3 Frame).

**6. Overlaps of one family — acceptable.** A local computation on the base's airspaces (no network, no `eval`, no DOM).
The family pattern `(\s+(\d+[A-Z]?|[A-Z]))+$` needs a blank at each repetition, so no catastrophic backtracking on a
name from a source; pairs are compared inside a family only; `meta.overlaps.families` is capped at 50. The names it
carries (`ovl`, `members`) come from the source: the Map must insert them escaped when it reads them (with BUGS SOG).

**7. Data synchronisation, fixes (2bf0021be) — acceptable for security, one integrity point, two notes.**
- Checked:
  - `settle()` never concludes: `_own_staged` unstages what the workstation staged after the interruption (literal
    pathspecs), then `merge --abort`; a new file becomes untracked, nothing is erased; if `merge-base` fails, the whole
    index is unstaged (the safe side). Files outside the pool no longer leave: `_commit_local` takes the pool only,
    after `data_guard`;
  - `clean_text` removes `user:…@` from any address and replaces the paths of `data/` and of the suite (both separators,
    any case), in failed `git()` calls, the journal, `_why`, `ls-remote` and the clone;
  - a paired device gets a generic message on failure, the detail stays in the launcher's console;
  - `data_path` (paths in conflict) takes the rule of `data_file` (`\`, `:`, control characters, empty, `.` and `..`
    components, a trailing dot or space, Windows device names, real path under `data/`);
  - the aircraft database publication checks `MERGE_HEAD` before writing.
- *Integrity point (not a vulnerability)*: `sync_gesture` only saw the launcher's jobs (`REGEN.view()`), while the base
  is built in the page (`shared/sia_base.js`, written by `/__setup/batch`), so the guard was inert for the case it aims at.
  Decision (V3 Frame): building batches marked `building: true / false`, a launcher state that expires 10 minutes after
  the last write, read by `sync_gesture`; a note in `frame/DECISIONS.md` until the build moves to the launcher (D5).
- Notes: `merge --abort` (`reset --merge`) fails on a file touched by the merge and then changed in the folder: nothing
  is lost or committed, but the synchronisation stays blocked, and the message should say what to do; `clean_text`
  replaces `os.path.abspath(base)`, so add `os.path.realpath(base)` for a `data/` reached through a junction.

**8. `frame/lib/procedures.js` (48afe2544) — acceptable.** Pure functions (no DOM, network, storage, `eval` or global
state; fixed patterns without dangerous backtracking); the runway options Fuel adds are escaped (`esc` on value and
text); `frame/sw.js` precaches the file.

**9. One route table (3073048c7) — acceptable, one older point to fix.**
- Survey: the 43 `/__setup/` paths cited in `tools/launch.py` are the same before and after; 48 routes are declared
  (27 GET, 21 POST). Audience `lan`: exactly the 8 of before (GET `status`, `changes`, `sim/position`, `lnmperf`,
  `lnmperf-folder`; POST `batch`, `sync`, `net`). PUT and the POST `?action=retire` of `lnmperf` are not declared, so the
  gate refuses them to devices, as before; HEAD goes through the same gate as GET; every GET handler keeps its
  `_allowed()`, the workstation's ones their `_lan()` refusal; POST keeps the global `_allowed()`. An undeclared route is
  `poste` by default; a route declared twice stops the launcher (assertion). No route changed audience.
- *To fix (older than the batch)*: `data_repo_url` only removed `account:token@` (a colon required), while a GitHub
  token is commonly given as the user name alone (`https://ghp_…@github.com/…`); `data_sync.REMOTE_RE` admits
  `https://name@host`, so `check_remote` lets that address into `data/.git/config`, and `remote_info()` returns it as is
  to the page (`GET /__setup/sync-remote`; `git()` only cleans on failure). Refuse or remove any user part of an https
  address (ssh `git@` stays), and pass `remote_info`'s address through `clean_text`. With V3 Frame.

**10. `POST /__setup/regen/job/put` (5e785599c) — acceptable, two notes.** Workstation only (table and `_lan()`); only
the running job (409 otherwise); a `token_urlsafe(32)` token compared by `hmac.compare_digest` (403), kept outside
`job.data` (never in `view()`, `tools/.regen_last.json` or a log); zone `^[a-z0-9_-]{1,32}$` and one of the job's
arguments; names `^[a-z0-9_.-]{1,64}\.json$`; size bounded (64 MB; 400 / 413); the route writes nothing, `take()`
returns `None` after its delay or on cancel. A put cannot reach any job but the one waiting. Notes:
- for the D5 builder verb (with AeroDB): write `zone/name` through `data_path` (or a checked join under
  `sia/base/<zone>/`); never put the address carrying `#…&t=<token>` in the console, nor on the command line of a browser
  it starts (visible to other accounts);
- `_inbox` is only emptied by `take()`: a put after a take, or zones never taken, keep up to 64 MB each in memory while the
  job stays the last one; empty it when the job ends and refuse a put of a zone already taken (with V3 Frame).

**11. Synchronisation, follow-up (97e052251) — acceptable.** `building(data)` reads the times of the uncommitted files
of `sia/base` (10 minutes), whoever wrote them, and `sync_gesture` combines it with the launcher's job; a deleted file is
skipped, a file time in the future keeps the base on the workstation (the safe side). A `settle()` that cannot cancel
names up to 20 relative paths; a paired device still gets the generic message. `clean_text` also replaces the real path
(`realpath`), both separators.

**12. Flown track (ff51be774) — acceptable in code; a privacy decision for the user; one note.**
- `frame/lib/trail.js` is a pure rule; the frame writes the track inside `progress.actual` of the current flight, which
  goes to the data repository with it; `pilot/ANON/` stays local (`LOCAL_ONLY`).
- **More than before:** `progress.actual` carried one point (the last position), and the repository's history only kept
  the positions present at each synchronisation. Each version now carries the whole track of the flight: up to 500
  points (one per NM or per minute, turns kept), latitude and longitude to 1e-5 (about 1 m), the altitude, and the
  seconds since `started.at`, so the absolute time of each point. « Erased when the flight stops » only holds for the
  file: the track stays in the data repository's Git history, read by the whole group.
- Decision for tonight (V3 Frame): precision 1e-3 (about 100 m); the track resumed only when `actual.trailFrom` equals
  `started.at` exactly; a privacy line in the help and in `frame/DECISIONS.md` (the track of the current flight is shared
  with the group, like the position, and stays in the repository's history). The choice between keeping it shared and
  keeping it on the pilot's workstation only (as `pilot/ANON/`, the position alone published) is put to the user on
  30 October. In every case, no track is sent to an outside service (site, IVAO / VATSIM) without an explicit gesture.
- Note: the resumption compared `prev.at >= cur.started.at` as strings; two ISO forms (`+02:00` against `Z`,
  milliseconds) can mislead it and resume the track of another flight, whose seconds count from another start. Fixed by
  the exact `trailFrom` comparison above.

**13. Data module D2 (1ce6fcc1b) — acceptable, two notes.** One declared write only: `cache/data/coverage.json`
(policy `cache`, the workstation's copy, never the repository), written once at first opening when `zones()` answered and
a zone is published. Everything that comes from the data is escaped (names of States and reasons, zone names, a zone's
author, licences, source names, counts by status, addresses in `href` and in the text); the only interpolations left
unescaped are fixed vocabulary of the code (state and level, group ids, numbers). The launcher declaration is empty;
`ctx.launcher.info()` only picks one of two sentences. `rail: false` keeps the entry out of the menu (reachable by `#data`).
Notes (with Settings, for D3 / D4): escape `data-state` and the level too, so that the attribute is already safe the day a
state comes from a published file; the addresses come from the catalogue (code) today: if it becomes published data,
accept only `https://` in `href` (`esc` does not stop `javascript:`).

**14. Fuel, procedures card (3c98b564b, aa74300b4, 5dc40f465) — acceptable, one note.** Labels from the records
(procedure names, transitions, runways) are escaped in the options' text, `value` and `title`; the reading button's text
goes through `textContent`, the launcher's message and the change lines through `notify()`. The current flight is still
written only by `saveFlight` (read just before, `CF.merge` bounded to `FUEL_FIELDS` and `FUEL_PROGRESS`, `progress.actual`
and its track left to the frame); the card changes `route.procedures`, then `quote` / `profile` by computation. The
`focus` taken from the address (`ctx.consume`) is only compared with `route` and `arr`. The fixtures are invented; the
bench page calls neither the network nor the launcher. Note: the button is looked up with `[data-icao="${icao}"]` from the
flight's code (synchronised by the group): a quote in it throws in the progress callback (not an injection, the display
stops); use `CSS.escape` or check `^[A-Z0-9]{4}$` first.

**15. Fixes of points 9 and 10 (16734c42f) — acceptable, one note.** In https, `REMOTE_RE` admits no user part any more
(ssh keeps `git@`); `data_repo_url` removes `[^/@\s]+@`, the token alone included; `remote_info` passes the address
through `clean_text`. A zone is delivered once per job (`_given`, then 409), and `drop()` empties the box when the job
ends. Note: `job.drop()` runs after `_run`'s `try / except Exception`, not in a `finally`: a `BaseException` escaping a
verb would skip it.

**16. Shared parsed references (cf52ad2a2) — acceptable; shared values are mutable.** `valueFor` gives the same parsed
object to every reader of a `reference` (not pending), without `Object.freeze`: read-only is only a written contract
(INTEGRATION § 4). An in-place `sort()` or `splice()`, or a computed field added to a record, by a module or by aerodb
itself, would be seen by every other reader until the revision changes or the value is evicted. Not a security
boundary (modules are code of the suite, same origin and trust), but a silent integrity risk; records and pending writes
are always parsed anew, so nothing leaks into a write. Proposed: a deep freeze once at parsing (paid once per revision
thanks to the cache, to be measured on the largest zone), or at least in the noreg runs, so that a mutation throws in
the cases. The rest is acceptable: IndexedDB version 2 creates the `policy` index in the upgrade transaction,
`onversionchange` closes the base (another tab does not block); `list` reads keys only (`IDBKeyRange`), never the texts;
absent references are remembered 30 s; parsed values are capped at 48 MB, the oldest evicted.

**17. Flown track, fixes (127e0b721) — acceptable, one note.** Points at 1e-3 (about 100 m), the distance threshold
corrected for the rounding; the track resumed only when `prev.trailFrom === cur.started.at` (a rewritten `started.at`
starts a new track: the safe side); the privacy sentence in four languages, in the information panel (several users) and
in the help. Note for the user's choice: the current position of `progress.actual` (latitude, longitude) stays exact, as
before, so the repository's history keeps exact positions at each synchronisation; only the track is rounded. The choice
« shared or local » should cover both.

**18. AeroDB D5, headless build (8755aad9c) — acceptable; one design point settled; four notes.**
- Checked:
  - browser found by **absolute paths only** (`_abs_file`: a file, not a link): Edge under Program Files (x86) / Program
    Files, then Chrome under Program Files / (x86) / `%LOCALAPPDATA%` (the per-user install, writable by the user: the
    user's own trust), the variables themselves absolute; no `PATH`, no current folder; the test hooks come from the
    launcher's context, never from the arguments;
  - arguments: `zones` (from the list of zones, 1 to 60, no duplicate), `personal` (pattern, 10 at most, `xplane` refused,
    empty by default), `parallel` (boolean); no path, address or command from the page; Chromium's sandbox kept;
  - temporary profile: `mkdtemp` under the user's temporary folder (real path checked), `start.html` created with
    `O_EXCL` and mode 0600, removed as soon as the page says « started »; the profile removed in a `finally` with retries;
    the browser killed with its children (`taskkill /T /F`);
  - the job's token is never on a command line (only the file address of `start.html`) nor in the log (stderr is read
    for `SOGB` lines only; console lines are logged in debug only, cut at `#`); `headless.js` removes the fragment at once;
  - writes: `validate` requires the exact names (12 kinds, the manifest entry, the major cities), JSON and the header
    (zone, cycle, kind); `target_of` goes through `data_path` then the real path under `sia/base/<zone>/` (or `index.json`,
    `cities_major.json`); one `commit_outputs` per zone under a lock;
  - network: a dead proxy (`127.0.0.1:9`), `<-loopback>` removing the implicit bypass of local addresses, only the
    launcher's address bypassed, every host name mapped to « not found »; the inputs are parsed data, never executed.
- *Design point (settled before the frame's exception)*: the start page is a `file://` document, and its navigation to
  the launcher arrives with `Sec-Fetch-Site: cross-site`, exactly what any web site produces with a link or
  `window.open`. An exception of `_same_origin()` for « a document navigation to `headless.html` » would have opened the
  page to every site, in the user's ordinary browser (no dead proxy), with a fragment of the site's choosing: no token,
  so `put` refused and nothing returned to the site, but `/data/sia/<rel>` read for any given name (`fetchInput` encodes
  each component, yet `..` stays `..` and the browser normalises `/data/sia/../../__setup/x` into `/__setup/x`: GET
  requests on the launcher's routes from its own origin), and a 1.3 GB build in a tab. **Decision (path B):** no
  exception in `_same_origin()`. The browser is started on `http://127.0.0.1:<port>/frame/aerodb/build/headless.html#job=<id>`
  without a token (`Sec-Fetch-Site: none`, already admitted); the page claims the token once by a launcher route (V3
  Frame), accepted only before « started », workstation only; `headless.js` then checks `job`, `cycle`
  (`^\d{4}-\d{2}-\d{2}$`), the zones and every `rel` (the `SAFE_NAME` rule of `list_inputs`: no `..`, no empty part)
  before any read (AeroDB). The remaining risk, a local program winning the claim, is no worse than today: any local
  program already reaches the launcher's routes (no `Sec-Fetch-Site`, `X-SOG-Setup`).
- Notes (with AeroDB): force `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` (WebRTC's UDP does not go
  through the proxy; defence in depth, the page's code being the suite's); take `taskkill` from `GetSystemDirectoryW`
  rather than `%SystemRoot%`; purge the `sog-base-*` profiles left in the temporary folder by a launcher killed before
  « started » (a token without value by then, and disk space); validate the fragment's parameters before use.
- Follow-up: the claim route (V3 Frame) and the start by `http` address with the checks of `headless.js` (AeroDB) are to
  be reviewed when pushed.

**19. Data module, « Construire » (8990b3ab7) — acceptable, one note.** The page sends only
`ctx.launcher.job('regen/job', { args: { zones, personal } })`: the ticked zones of the coverage and the ticked personal
sources (none by default); no path, no address, no `parallel`. The declaration lists `regen/job` and `regen/job/cancel`
only; « Arrêter » calls the latter; the resumption reads the job's view (no token in it). The launcher checks again
(`base.check`). What comes from the job's view is escaped (zone ids, in attributes and names) or goes through closed
sets (zone states and error codes through `zonePhrase`, `outcome().kind`, `refusal().key`, `journalResult`; numbers
through `num()`); a zone's free message is never shown; the focus selectors use `CSS.escape`. Writes: only
`cache/data/journal.json` (the last 50 operations) and `coverage.json`, policy `cache`; the journal read back is escaped.
Note: `base.check` still admits `parallel: true`; the page does not send it, but any script of the page could (bounded by
`can_start`: cores − 1 and free memory). Write it in DECISIONS as an internal mode reachable through the API, or refuse
it at the launcher if it only serves the measurements. Decision: `parallel: true` is refused by the launcher (with
AeroDB's path B commit); the option stays for the benches only.

**20. Map, choosing on the map (5b713f77e) — acceptable, one note for Fuel.** The request is taken from the address
once (`ctx.consume`): `choose` is `dep` or `arr`, `icao` matches `^[A-Z0-9]{4}$`, otherwise nothing happens; a mission or
tuning map ignores it. Names in the list and on the labels (procedure, transition, runway, reasons) are escaped; the
only unescaped values are the family and the hue, both from the code; the chip selector uses `CSS.escape`. Doubtful
records, records without a name and `NONAME` ones are never shown (Fuel's rule). A choice replaces the address with
`#fuel?focus=<side>&<family>=<id>`, side and family from the code, the value through `encodeURIComponent`. The Map
writes nothing to the flight in this mode; its route editor (`edit.js`) merges only `route` and `level`, with a route
object that has no `procedures` key, so `route.procedures` is kept. Note (for the Fuel commit that will read the key):
the address can be edited by the user or set by any link, and it does not carry the aerodrome; accept only `none`, a
runway (`^\d{2}[LRC]?$`) that `runwayChoices` proposes, or an id present among the records of the flight's aerodrome for
that side (the flight may have changed aerodrome meanwhile); otherwise ignore it and write nothing, never the raw string.

**21. Fuel layout (918ce4010) and Atmosphere layers panel (d36f4be70) — acceptable.** Layout and focus only: no write,
no network, no address read. Atmosphere's panel is rewritten only when its lines change; labels and the map's note are
escaped, the keys and swatches come from the weather map library's constants.

**22. AeroDB, `source.url` (d88463e51) — acceptable, one point to fix.** The address is built by `aerodb.js` at reading
(`withSourceUrl`): `charts.base` of the aerodrome's file + `Cartes/<ICAO>/` + the page's name, only for an `eaip` source;
from the record, only the name counts (`source.file`, else `source.ref`), which must match `^[A-Za-z0-9._ -]+\.pdf$` and is
encoded; no address comes from a free field of a record. *To fix*: the base is checked as `https://` only, any host.
`charts.base` is written from the SIA's fixed host by the launcher's job, but the command line (`proc_sia.py --eaip`) writes
the base it is given, and the aerodrome's file sits in the synchronised data repository, editable by any member of the
group: a « Source » link could lead to another site behind a trusted label (no injection: https, encoded name,
`rel=noopener` on the pages). Admit only bases under the SIA's host (the same constant as `proc_sia.eaip_url`), otherwise
no link. Note: the ICAO key is inserted as is in the path; check `^[A-Z0-9]{4}$` or encode it.

**23. Data module, « Publier » (3355c5e24) — acceptable, one note.** The module never posts to `/__setup/sync`: its
declaration adds only `sync-status` (read with GET), and publishing goes through the frame, `ctx.data.sync({ gesture:
true })`; the button is active only when the frame declares `ctx.data.sync.gesture === true`. The module writes no author
(the trigram stays with the frame's transport); the launcher still keeps `sia/base` while a build runs, gesture or not.
The report shows numbers only (`num()`), never a path or a conflict; the launcher's message is escaped (and already cleaned
by `clean_text`); the attributes take closed sets; the journal stays in `cache/data/`. Note (with the frame's « sync on
gesture » commit): the frame's `exchange()` discards what `T.exchange` returns, so `r.exchange` does not exist yet; and
`data_sync.run` returns `conflicts` and `refused` as lists, which `num()` turns into 0 — the report would say « no
conflict » when there are some. Return counts, or count lists in `publishOutcome`.

**24. Five frame commits — acceptable, two notes.**
- `POST /__setup/regen/job/claim` (56ab4fd94): refused to paired devices (`_lan()`, not in the `lan` table), behind
  `_allowed()` (`Sec-Fetch-Site` same-origin, none or absent, `X-SOG-Setup`): a page of another site cannot reach it. The
  token is given to the running job only, once, after the verb's `offer()`, then 409; the offer refuses the reserved keys
  and must be JSON. « Before started » is not checked by the route: the rule is « once after offer », equivalent while
  the page claims as it starts. A local program winning the claim makes the build fail visibly (see 18).
- `<route>/cancel` (f70eba426): `allowed()` adds only `<declared route>/cancel`; `routeOf` admits
  `^[a-z0-9][a-z0-9/_-]*$` (no dot, so no `.` or `..`) and `under` is an exact match except for a declared prefix ending
  in `/`: no other route can be reached that way.
- Sync on gesture (a215d47bd): `result.exchange` keeps numbers only (lists counted), a message cut to 300 signs and strict
  booleans; `sync.gesture === true` is declared; a gesture becomes a `manual` pass (the launcher still keeps `sia/base`
  during a build). This settles the note of 23.
- Named applications (e3870b354): `?app=` picks an entry of an object literal through `Object.hasOwn` (prototype keys
  name nothing), an unknown name gives `pilot`; an application only chooses lists of the code (modules, links, tabs);
  the V2 link (`launcher: true`) is hidden without a launcher and on paired devices. « Maintenance without a guard » is
  acceptable: a grouping of screens, not a boundary; protections stay at the launcher (`poste` routes, `_lan`) and in the
  modules. No guard must ever rest on `?app=` (to write in DECISIONS).
- Frozen references (802e6856f): a deep freeze at parsing, once per revision, always (not only in the noreg runs); `drop()`
  in a `finally`. This settles 16 and the note of 15.
- Notes: a script in sloppy mode that writes into a frozen value fails **silently** (no `TypeError`): ES modules are
  strict, but classic scripts that read references (`aerodb.js`, `sia_base.js`) need `'use strict'` for a mutation to
  show; in `_run`, a `BaseException` crossing the verb leaves `state` at `running` and no `ended` (the `finally` empties
  the box only): set `error` and `ended` there when the state is still `running`.

**25. AeroDB path B (2dbfea12a) and `source.url` (97bf5577f) — acceptable; the points of 18 and 22 are settled.**
- The browser receives `<launcher>/frame/aerodb/build/headless.html#job=<id>` and nothing else (no token, no parameter, no
  start file); `job.offer()` is made before the browser starts and the claim is single (24); `_same_origin()` is unchanged,
  with no exception: a site that navigates to the build page is refused.
- `headless.js` removes the fragment first, checks the job id before claiming, then checks the whole answer before any
  read: same job, token shape, cycle, zones (pattern, 60 at most, known to the zone list), personal sources (pattern, 10
  at most), inputs (5000 at most, each part under the `SAFE_NAME` rule: no `.`, `..`, `\` or `:`, 400 signs at most).
- No token in the command line or the log; WebRTC limited to the proxy; `taskkill` found through `GetSystemDirectoryW`;
  `parallel` refused and the per-zone mode removed; `purge_stale()` at loading removes only `sog-base-*` folders of the
  temporary folder older than one hour, never a link or a junction; `'use strict'` at the head of `sia_base.js`
  (`aerodb.js` already had it).
- `source.url`: the base must be under `https://www.sia.aviation-civile.gouv.fr/` (no `..`), the ICAO key
  `^[A-Z0-9]{4}$`, the name a simple PDF name; otherwise no link.

**26. Fuel, « Sur la carte » (d4f683475) — acceptable; the note of 20 is settled.** The proposal is taken from the
address once (`ctx.consume` of `focus` and the six keys); `focus` must be `dep` or `arr`. It is applied only once the
flight is read and the records of the flight's own aerodrome for that side are loaded (a flight that changed aerodrome
receives nothing). `admit()`: `none` gives « None » (the runway stays unchanged); a runway must match `^\d{2}[LRC]?$`
and be one of the proposed runways, and the list's value is written; a procedure must be a record of that aerodrome, of
the right kind (SID, STAR or APP; a transition must carry one) and not doubtful (`isDoubt`, now shared in
`frame/lib/procedures.js`), and its `id` is written; anything else writes nothing, the raw string never. The write goes
through `choose()` (the lists' path, `saveFlight` bounded to `FUEL_FIELDS`); the report through `notify()`. The button's
ICAO is escaped and encoded in the Map's address (which checks it again); the `procfetch` selector uses `CSS.escape`.

**27. Frame G1, GitLab transport (a0f3854d9) — blocking, one point to fix, one note.**
- **Blocking — the saved token leaves for a new host.** The access card keeps the stored token when the token field is
  left empty (`token: val('token', r) || gh?.token`), even when the pasted address names another project, another
  instance or another provider; the field even shows « token set » as a placeholder, which invites leaving it empty. A
  malicious invitation link (`https://gitlab.attacker.example/x/y`), pasted and saved, sends the GitLab token, or a
  GitHub token, in `PRIVATE-TOKEN` to that host. Keep the old token only when the provider, the API's origin and the
  project are those of the previous setting; otherwise require a new token and say « new host: <host> — paste the token
  for this host ». The check belongs to the saving (`clean`), not only to the card.
- *To fix — redirects followed with the token.* `call()` fetches with the default `redirect: 'follow'`; on a redirect to
  another origin, Fetch removes `Authorization` but not a custom header such as `PRIVATE-TOKEN`: a 30x towards a host that
  accepts CORS would receive the token. Use `redirect: 'error'`. The pagination's « next » link is already bound to the
  instance's API.
- Note — https not enforced by the transport: `clean` infers https only from a pasted `https://` address; a setting
  `{ provider: 'gitlab', api: 'http://…' }` (an imported `keys.json`, a future invitation link) goes through as is, and
  `FD.gitlab()` does not check `api`. Require `^https://[^/\s]+/api/v4$` in the transport and ignore any other `api` in
  `clean`.
- Acceptable: the token only in the `PRIVATE-TOKEN` header (never in an address, the console or an error message, which
  repeats the server's message only, 300 signs); an atomic commit on the head read just before (conflict otherwise);
  the author under the common trigram rule; publishing bounded upstream by the frame (`meta.publish` and `dataPathOf`,
  for both transports), module writes by their declarations; `secrets/gitlab.json` in `SECRET_FIELDS` and
  `SECRET_BLIND` (never a character to the page).

**28. `base/fetch` and `base/purge` (ac84d562e), Data module corrections (6330c5133) — acceptable, two older points to
fix, one note.**
- Purge: arguments `zones` (from the list), `what` (sources, caches), `dry`. The root of `sia/` is read flat (files only),
  then `openaip/`, `aixm5/`, `geojson/` and `zones/<zone>/`; `sia/base/` and `proc/` are never walked; caches are
  `local/eaip` for fr only. Each candidate is attributed to the zone (`file_source`), `_walk` never descends a link or a
  folder (junction included) that resolves outside the base, `_inside` (real path, common path, not a link) is checked
  again just before `os.remove`; a file tracked by git is kept (`ls-files -z`, literal pathspecs, any case), and a git
  failure removes nothing for the zone; `os.rmdir` removes empty folders only.
- Fetch: arguments `zones` and `personal` (from the catalogue); the providers write under `data/sia/` with fixed names; no
  commit; `outside_sync` counts the tracked files touched; 30 s between two starts. The manual sources' addresses are
  constants of the code, returned only when they start with `https://`: no free host.
- *To fix (older, in `tools/aero_fetch.py` and `tools/navcan_dah.py`, now started from the page):* ENAIRE takes the file
  name from the server's page (`rsplit('/')` leaves `\` under Windows: a name with `\..\` would write, then later remove,
  outside `sia/aixm5`): pass it through `proc_pdf.safe_path` with
  `^LE_[A-Za-z0-9._-]+_AIP_DS_FULL_(Airspace|EnRoute)\.xml$`; NAV CANADA's `current_url` accepts any `http…` link of
  the page (any host, plain http, a local-network host): require the host of `BASE` in https.
- Note: `get()` reads the whole answer in memory (`r.read()`) with no ceiling; cap it (e.g. 200 MB per file).
- 6330c5133: `addZone` accepts only a zone known to `zones()` and not covered yet, outside a running build, and writes
  `cache/data/coverage.json` (local); the selector's options are escaped; the publish question goes through `ctx.ask`.

**29. Map, track and « Choisir sur la carte » (a158edbe5) — acceptable, one note.** The track read from the flight (the
group's data) keeps only arrays whose latitude, longitude and seconds are finite numbers, converted to numbers; times are
computed from `started.at`, nothing from the previous flight, only newer positions are added; it is drawn on the canvas,
never put in HTML; the result is capped (`TRAIL_MAX + 400`). The airport card's button goes through `askOf`, the same rule
as the address (`dep` / `arr`, `^[A-Z0-9]{4}$`), with an escaped ICAO and a side from the code; refused on a mission map.
Note (with BUGS SOG): the filter walks the whole received track before capping it; cut first (`slice(-TRAIL_MAX)`) and
check the bounds (|lat| ≤ 90, |lon| ≤ 180).

**30. `aero_fetch` fixes (38a9d39b7) — acceptable; the points of 28 are settled; one note.** ENAIRE: the name is taken
only under `contenido_Datasets/` with the pattern `LE_[A-Za-z0-9._-]+?_AIP_DS_FULL_<kind>.xml` (no `/`, `\` or `:`), then
`safe_path` (pattern, path resolved under `sia/aixm5`) for the write and for each removal of an older amendment; the
requested address is rebuilt from the name, never the page's link. NAV CANADA: `current_url` keeps an absolute link, or a
relative one on `BASE`, only if it starts with `https://www.navcanada.ca/` (`//host`, `http://`, look-alike hosts and other
schemes set aside). `get()`: a `Content-Length` over 200 MB is refused, then the body is read in 1 MB parts and stopped at
the ceiling even without a declared size; `TooLarge` is an `OSError`, nothing is written. Note: `urllib` follows redirects
to any host, plain http included; the host checks cover the page's links, not a server's redirect. Acceptable while the
starting hosts are fixed and in https; an opener that refuses a redirect leaving the starting host would close the rule
for every source.

**31. Fuel, « Source » link and past-date warning (c540c3efd, 9d9d2f686) — acceptable.** A link is set only when
`source.url` starts with `https://` (aerodb already binds the host to the SIA's, 25), escaped, in a new tab with
`rel="noopener noreferrer"`; only the chosen records of the side are looked up by id; other sources' document names go into
the line's `title` as a DOM property. The past-date warning is text only (`textContent`, `esc`), never blocking, no write.

**32. GitLab fix and companions (02a096440, 9d64081c9, f7bad9970) — acceptable; the blocking point of 27 is lifted.**
- 02a096440: an empty token field no longer brings anything back by itself; `resolve()` reuses the saved token only when the
  target is the same (provider, API origin in lower case, project), otherwise saving is refused with « New host or new
  repository: {h} — paste the token for it », shown through `textContent`; `save()` refuses any setting without a token.
  For a pasted GitLab address, `clean` always recomputes the API from the pasted host (never an earlier one) and empties an
  API outside `^https://[^/\s]+/api/v4$`; the transport throws on any other form; `call()` uses `redirect: 'error'`. The
  user's real test on gitlab.com may proceed.
- 9d64081c9: Maintenance opens at the Complete level (a display level; the guards stay at the launcher, as DECISIONS now
  says about `?app=`); no Pilot welcome; `_run`'s `finally` sets `error` and `ended` when the state is still `running`;
  strict mode in the classic scripts.
- f7bad9970: the Map's « Source » link requires `https://` (aerodb already binds the SIA's host), escaped, new tab,
  `rel="noopener noreferrer"`; document names escaped; `isDoubt` shared; the track cut (`slice(-TRAIL_MAX)`) before the
  filter, then bounded (|lat| ≤ 90, |lon| ≤ 180). This settles the note of 29.
- Note (no sending risk): the host pattern admits `@`: `https://gitlab.com@attacker.example/x/y` yields an API
  `https://gitlab.com@attacker.example/api/v4` and the message shows « gitlab.com@attacker.example », misleading to the
  eye; `fetch()` refuses an address carrying credentials, so nothing leaves, but the user may believe they paste a token
  « for gitlab.com ». Refuse `@` (anything outside `[A-Za-z0-9.-]` and `:port`) in the host.

**33. Fuel, aerodrome names and completion (842ac149b) — acceptable.** The fixed line shows the name through
`textContent`; the suggestion list escapes the code and the name; ids and ARIA attributes are indexes or keys of the code.
Only places of kind `aerodrome` whose code passes `CODE` are kept, without duplicates, seven at most; an older request is
dropped. Choosing writes only the code into the field, then raises `input`: the same path as typing (the flight written by
`module.js`, bounded to `FUEL_FIELDS`); the name is never written.

**34. Frame G2, « Pilots' tokens » (241eec6c0) — acceptable, one point to fix, two notes.**
- *To fix — the administrator's token follows redirects.* `gitlab_call` puts `PRIVATE-TOKEN` in the headers of a
  `urllib.request.Request`; `HTTPRedirectHandler.redirect_request` copies those headers (except content headers) into the
  redirected request, to any host, plain http included. A 30x from the instance, or from whatever stands before it, would
  send the project **owner's** token elsewhere. Use `req.add_unredirected_header('PRIVATE-TOKEN', tok)` (never copied on a
  redirect) or an opener without redirects; it is the launcher's counterpart of the transport's `redirect: 'error'`.
- Checked: `GET /__setup/gitlab/tokens` behind `_allowed()` and `_lan()`, the two POST routes behind `do_POST`'s
  `_allowed()` and `_lan()`, all `poste`; `secrets/gitlab.json` requires an https instance, a project and a token; the
  token is never returned (the list gives id, name, scopes, level, states and dates), messages go through `clean_text`
  then the token is replaced by « … »; no request logging, `Cache-Control: no-store`, `SECRET_BLIND`. Creation: trigram
  `^[A-Z0-9]{2,5}$`, 1 to 365 days, access level 30 (Developer), named after the trigram, the value returned once and
  never written by the launcher. Revocation: an integer id of the configured project only. The page escapes everything,
  stores nothing (no `data.put`, no `localStorage`), copies on a gesture, and shows a message only without a launcher or
  on a paired device. The screen declares its two launcher routes (`launcher.routes`), served by the modules' client,
  `null` away from the workstation. `transport_github.js` now refuses a host with `@` or any character outside
  `[A-Za-z0-9.-]` (and `:port`): the note of 32 is settled.
- Notes: the `api` scope is broad (with Developer, a pilot's token may also start pipelines, create branches, issues,
  merge requests): disable CI/CD and unused features on the data project, so that a stolen pilot token cannot run code
  on a runner; `revoke` accepts any token id of the project (bind it to names matching the trigram rule), and the new
  token's value stays in the page until the next drawing (clear it when the screen is left).

**35. Data module, « Télécharger » and « Purger » (0d2f031d3) — acceptable, one note.** Manual sources get a link only
when the address is `https://` (escaped, new tab, `rel="noopener noreferrer"`), otherwise the name alone; the addresses are
the launcher's constants. Purge runs a dry pass first, then asks (counts, the shared SIA files, the tracked files kept),
the buttons grey during the question; « no » removes nothing; the real purge covers the same zones; the launcher's rules
of 28 apply (never `sia/base` or `proc`, tracked files kept, paths contained and checked again). No commit by fetch or
purge; the page sends zone ids only (`regen/job` with `{ zones, personal }` or `{ zones, dry? }`), never a path; one
operation at a time (greyed buttons, and the launcher refuses a second job). States and codes go through closed lists,
numbers through `num()`, names are escaped; the journal (`cache/data/`) keeps zones, counts and results only. Note: the
launcher recomputes the candidates between the dry pass and the real purge, so a file that arrived meanwhile (attributed
to the zone, not tracked) would be removed without having been shown; a purge restricted to the dry pass's list
(returned by the launcher, then checked again) would close that, if wanted.

**36. G2 fix (efbb97f49) — acceptable; the point to fix of 34 is settled; the real GitLab test may proceed.** The
launcher's GitLab opener has a redirect handler that returns nothing, so a 30x becomes an error and no request leaves for
the target host; `PRIVATE-TOKEN` is also set with `add_unredirected_header`; every call goes through `_gitlab_request`.
Revocation reads the token's name **at GitLab** (`GET /access_tokens/<id>`), never from the page's request, and refuses
any name outside `^[A-Z0-9]{2,5}$` (403). The new token's value is removed from the page on `hashchange` and `pagehide`.
The CI/CD note (and merge requests, issues, wiki) is in the four languages. Residual note: a service token that the
administrator would name with two to five letters or digits stays revocable here; name service tokens otherwise.

**37. Fuel, aerodrome fields (26d47f149, fe3d33c5c) — acceptable.** Free text is never written as such into
`route.dep`, `arr` or `altn`: `setAd` is called only for a `^[A-Z0-9]{4}$` code known to aerodb (and only if the field still
holds it when the answer comes), for a choice of the list (already filtered), or on leaving the field (empty to remove the
aerodrome, or a four-character code when no suggestion exists, an aerodrome unknown to aerodb, wanted by the rule); any
other text is put back to the saved value. Names are shown through `textContent` and escaped in the list. Nothing is
written at mounting; writes go through `saveFlight` (`FUEL_FIELDS`). The map's proposal waits for the flight to be read.

**38. Frame R1a, the airline's relay (7ca73448c) — blocking before any exposure, two points to fix, four notes.** Nothing
is exposed today.
- **Blocking before exposure — the relay fails open if the proxy does not keep `Host`.** `_relay()` recognises a relay
  request only by `Host` equal to the public host. If the NAS's reverse proxy rewrites `Host` to `127.0.0.1:<port>` (a
  common setting, or a forgotten « keep the host »), a request from the Internet arrives on 127.0.0.1 with a local
  `Host`: `_relay()` is false, so `_relay_gate` does nothing, `_local_host()` is true and `_same_origin()` too (a client
  without `Sec-Fetch-Site`, with `X-SOG-Setup`): the request is treated as the **workstation** (secrets, GitLab token
  creation, clone, adopt, relay pairing codes…). Fix (fail closed): in relay mode, any request from 127.0.0.1 or ::1
  that carries a proxy header (`X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, `Forwarded`, `X-Real-IP`)
  with a `Host` other than the public host gets 403 (the workstation's browser never sends them); a case for a proxy
  that rewrites `Host`; the installation guide says « keep the Host header », checked at start-up.
- *To fix:* `safe_next` takes a value decoded from the form: `/<TAB>/attacker.example` passes (starts with `/`, not
  `//`) and the browser removes the tab in `Location`, giving `//attacker.example`, an open redirect right after pairing
  (refuse any blank or control character; the same rule for the local-network pairing); `POST /__relay/pair` does not
  require the same origin, so a third-party site can submit a code of its own in the pilot's browser (login CSRF: the
  pilot's device bound to the attacker's trigram): require `Sec-Fetch-Site: same-origin` or the public host's `Origin`.
- Checked: listening on 127.0.0.1 only, `--lan` refused with `--relay`, the local network's opening answers 409, the
  public host validated; `X-Forwarded-Proto: https` required; pairing required for everything but `/__relay/pair`; GET,
  HEAD, POST only; `/__setup/` limited to `relay=True` routes (status, changes, batch, sync, net), « relay implies lan »
  asserted; `X-Forwarded-For` read only in relay mode, its last address. Codes: `secrets.randbelow` over 8 digits,
  `compare_digest`, single use, 10 minutes; 5 wrong per address give a minute's wait, 30 wrong per hour (any address)
  close pairing: at most 30 tries an hour over 10^8 codes. Tokens: `token_urlsafe(32)`, only the SHA-256 kept in
  `tools/.relay.json` (hidden, never served); cookie `Path=/; HttpOnly; Secure; SameSite=Strict`, no `Domain`, one year,
  expiry checked, revocation by device or by pilot. The author of `batch` and `sync` comes from the token, never the
  page; a failure gives a generic message. `net`: `NET_HOSTS` only, never the airline's site. Served files: `secrets/`,
  `data/local/`, `.git` and hidden files refused. The pairing page has no script (`default-src 'none'`,
  `frame-ancestors 'none'`, `X-Frame-Options: DENY`, no-store, no-referrer), escaped. The « Relay devices » screen:
  workstation only, never a fingerprint, the code shown once then cleared, everything escaped.
- Notes: `batch` stays open to the whole of `data/` (but `local/`), like a local-network device or a GitLab Developer
  token: a stolen relay token can rewrite other pilots' files under its own trigram (bind the relay to the pilot's
  prefixes one day); `net` adds the airline's IVAO key for `api.ivao.aero`, so every paired device (or stolen token) uses
  it (to write in DECISIONS, with revocation as the answer); the global cap of 30 wrong codes an hour lets a stranger keep
  pairing closed (a new code reopens it), and `state['fails']` grows without bound with rotating addresses (purge entries
  older than an hour); `SameSite=Strict` means a pilot opening the relay from a link arrives without the cookie (the
  pairing page; a reload works): `Lax` would do, since POST routes already require the same origin and `X-SOG-Setup`.

**38, decisions on the notes (Simplification interface et ergonomie).** 1: a debt written in DECISIONS (bind the relay to
the pilot's prefixes later); 2: the shared IVAO key written in DECISIONS, with revocation as the answer; 3: entries of
`state['fails']` older than an hour purged in the fix; 4: `SameSite=Lax` kept for usability (POST routes already require
the same origin and `X-SOG-Setup`; no GET route of the relay may change state).

**39. Flight plan export (99d28acd0) — acceptable, one note.** `fileName` keeps only `[A-Z0-9]` of the departure and
arrival codes (else `FLIGHTPLAN`), an ISO date and an `[a-z0-9]` extension: no path, no separator. In the `.pln`, every
value goes through `tag()` (text escaped) and the waypoint `id` through `escAttr`; route type and headers are constants,
positions formatted numbers; names, idents, airways, SID, STAR and approaches from aerodb or the OFP are all escaped. In
the `.fms`, idents go through `ident()`, which removes every blank (line breaks included): no line can be injected;
altitudes and positions are numbers. `frame/lib/fms.js` is pure (no DOM, network or storage). The download happens only on
a click (Blob, object URL, `<a download>`, revoked after a second); a service worker never intercepts a `blob:` address.
Note: `escText` keeps the control characters that XML 1.0 forbids; a damaged name would give a `.pln` MSFS refuses
(robustness, not a vulnerability): remove them in `escText`.

**40. R1a fix (1e573d782) and `escText` (d18a739b4) — the blocking point of 38 is lifted for the case described; one
residual case to close before any exposure.**
- Checked: in relay mode `_relay_gate` runs first in `do_GET`, `do_HEAD` and `do_POST`, before pages, files and
  `/__setup/`; a request from 127.0.0.1 or ::1 carrying a proxy header (`X-Forwarded-For`, `-Proto`, `-Host`,
  `Forwarded`, `X-Real-IP`) without the public host gets 403. At start-up `relay_probe` asks
  `https://<public host>/__relay/whoami` through the opener without redirects and says the result in the console.
  `safe_next` is `re.fullmatch(r'/[^\s\x00-\x1f\x7f\\]*')` without `//` or `/__`, the same for the local network and
  the relay: the open redirect is closed. `POST /__relay/pair` requires `Sec-Fetch-Site: same-origin`, else
  `Origin` equal to the public host: the login CSRF is closed. `SameSite=Lax`, with the relay's GET routes listed in
  DECISIONS (the only write on a GET: « last use », once an hour). Failures older than an hour are forgotten; the
  prefixes' debt is written.
- *Residual, to close before exposure:* a proxy that rewrites `Host` **and** adds no proxy header is indistinguishable
  from the workstation, so such a request would still be treated as the workstation; the probe sees it (`whoami` answers
  404 as a file) but only warns. Preferred: a port dedicated to the relay (every request on it is a relay request,
  whatever `Host` says; the workstation's interface keeps its own port), which removes the whole class; otherwise, a
  probe that did not answer `{ relay: true }` closes the relay for good, and the guide also says « the proxy must add
  `X-Forwarded-For` ».
- `escText` (d18a739b4): the control characters XML 1.0 forbids are removed before escaping (tab and line breaks kept);
  `escAttr` goes through it. The note of 39 is settled (detail: `\uFFFE`, `\uFFFF` and lone surrogates are also
  forbidden in XML).

**40, decision on the residual case.** A port dedicated to the relay (a second listening on `127.0.0.1:<port + 1>` or
`--relay-port`, where every request is a relay request whatever `Host` says; the proxy-header guard kept as a second
belt; the workstation alone on its own port), in a commit of its own after R1b.

**41. Frame R1b, IVAO OpenID through the relay (a9840bd19) — acceptable, four notes.**
- Checked: the `state` (`token_urlsafe(24)`) is kept only at the relay with the PKCE verifier (`token_urlsafe(48)`),
  bound to the device (the relay token's id, empty for the workstation) and to the return address, removed on return
  (single use), valid ten minutes; another device or the workstation cannot finish a device's request. PKCE S256; a code
  read in a proxy log is useless without the verifier. The `redirect_uri` is fixed (`https://<public host>/__relay/ivao/callback`
  in relay mode) and checked again at the exchange. The client secret sits in `secrets/ivao_oauth.json` (`SECRET_FIELDS`,
  `SECRET_BLIND`), sent as `client_secret_basic` with `add_unredirected_header`; discovery and token calls use an opener
  without redirects and require https endpoints. The callback is a GET of the relay that changes state, but only after
  pairing (the `Lax` cookie carried by IVAO's redirect), written in DECISIONS. Tokens leave once, through the fragment of a
  303 (`no-store`, `Referrer-Policy: no-referrer`; a fragment never goes into a `Referer` nor to the server); the frame
  reads it and replaces the history entry. On the page, the token is kept with the device's keys (`device/keys.json`,
  outside backups, never synchronised, like the GitHub token), never in the shared repository; `status()` never returns it.
- Notes: sign-out erases the token on the device only, the refresh token stays valid at IVAO (call IVAO's revocation
  endpoint through the relay if discovery gives one, or tell the pilot to remove the application in their IVAO account);
  on the workstation, IVAO's return (a cross-site GET) goes through `_refused()` first and is refused as « another site »
  (fails closed: either relay-only, to write down, or a narrow exception for this path, a document GET, workstation only,
  with a pending state); the pending requests are capped at 100 in all, so one paired device can fill them in ten minutes
  (cap per device, e.g. 3); `refresh` renews any refresh token a paired device presents, with the relay's secret (wanted;
  a stolen one is cut by revocation at IVAO).

**41, decisions on the notes.** 1: revocation at IVAO through the relay (`revocation_endpoint`); a notification after the
attempt also tells the pilot to remove the access in their IVAO account; 2: a narrow exception on the workstation (this
path only, a document GET, the workstation, a pending state) so that the route can be tried without the relay; 3: three
pending sign-ins per device; 4: written in DECISIONS. In a small commit after the dedicated port.

**42. A port dedicated to the relay (ee6044e8b) — acceptable; the residual case of 40 is closed.** The relay listens on
`127.0.0.1:<--relay-port, else the interface's + 1>` only, a server marked `relay`; `_relay()` is now that mark (with the
public host set), never inferred from `Host`: every request on that port goes through the relay's gate (https seen by the
proxy, pairing, `relay=True` routes), and no page or route of the workstation is served there, even with a local `Host`;
a proxy that rewrites `Host` and adds no header is still a relay request. On the interface's port, the proxy-header
guard stays as a second belt. Start-up refuses (exit code 2) an invalid host, a relay port equal to the interface's, out
of range or busy (`--lan` with `--relay` was already refused); the probe expects the answer through the relay port. Note:
the relay server starts serving before `RELAY` gets its host, so during that instant a request on it would be an ordinary
one (still refused: `_local_host` expects the interface's port); set `RELAY` before serving, make `_relay()` true on that
server whatever happens, and answer 503 in `_relay_gate` when the host is not set.

**43. R1b retouches and start-up order (b27cae045) — acceptable; the notes of 41 and 42 are settled.** `RELAY` is set
before the relay server listens; `_relay()` is the server's mark alone; a relay server without a public host answers 503
before any guard. The workstation's exception for IVAO's return runs in `_refused()` after `_local_host()` and holds only
when everything is true: the exact path in GET, `Sec-Fetch-Dest: document` and `Sec-Fetch-Mode: navigate`, neither the
local network nor the relay, a pending state of the workstation with its return address (checked without consuming it,
then consumed by the callback); otherwise « another site » stays the rule, and nothing else is opened. Revocation uses
discovery's `revocation_endpoint` (https only), `client_secret_basic` with `add_unredirected_header` and an opener
without redirects; the device erases its token in every case and tells the pilot when revocation was not possible.
Pending sign-ins: 100 in all, three per device. The workstation's return address is now `http://127.0.0.1:<port>`,
consistent with `_local_host` (to register as such in IVAO's application).

**State of the relay (R1a, R1b, dedicated port), 30 October.** No open point in the code. Before any exposure: the proxy's
configuration (aim at the relay port, keep `Host`), a green probe at start-up, and IVAO's application registered with the
two return addresses.

**44. Resuming a rewritten history of the data repository (6ba742877) — acceptable, one small point to fix, one note.**
`GET` and `POST /__setup/sync-rewritten` are workstation routes (`_allowed()`, `_lan()`, not open to the relay), under the
synchronisation lock. No path comes from the page: the files come from `git diff --name-only` between the common state and
the saved branch, filtered by `in_pool`; the page gives a trigram and a name only. Nothing is deleted in git: the old
branch is kept in `refs/sog/avant-reecriture-<date>` before `reset --keep` (which refuses to overwrite a changed file of the
workstation; a failure puts everything back); uncommitted files stay. The old history is never pushed (only
`HEAD:<branch>` is pushed), and a synchronisation never merges two histories without a common ancestor. Messages carry
counts and the reference's name; git errors go through `clean_text`. *To fix:* `git checkout <ref> -- <path>` and
`git rm -- <path>` take paths as patterns: a pool file whose name holds `*`, `?` or `[` would bring other files of the old
state over the new history, then send them; set `GIT_LITERAL_PATHSPECS=1` for the resumption. Note: `reset --keep` removes
from the folder the files outside the pool added since the common state (and puts the others back to their common
version): they stay in the reference, no longer on disk; the plan should say so (« they leave `data/`; recoverable with
`git checkout <ref> -- <path>` »).

**45. The flown track kept on the device (0bbe7ebbb) — acceptable.** The track is written to the device's own store
(`device/trail.json`), excluded from backups; `progress.actual` carries the position only, so the next write of the
flight removes the track from the shared file (the repository's history keeps the older ones); the privacy sentence now
says « your position is shared; the track of your flight stays on this device », in the four languages. This applies
the user's choice « local only » for the track (12).

**46. Map, bounds in a `WeakMap` (0f5891d4c) — acceptable.** `ringBox` no longer writes `_mb` on a frozen aerodb record:
the bounds live in a `WeakMap`, which accepts a frozen record and drops it with it. No other write on aerodb records was
found in `modules/maps` (the arrow written by `choose.js` is a fresh object). The deep freeze of 24 did its work: a
mutation that used to be silent became a visible error, then was fixed.

**47. Map, choose mode over three families (af261d3e3) — acceptable; one functional note.** The return address takes
keys from a closed table and values through `encodeURIComponent` (a record's id, a runway or `none`); Fuel checks them
again on receipt (26). Names, ids, reasons, titles and the wind text are escaped; family names and hues come from the
code; selectors use `CSS.escape`. The wind comes from the METAR already cached, read only. The Map writes nothing; the
selection stays in local state until `location.replace`. Functional note: the Map sends the approach transition as
`apptrans` while Fuel consumes `appTrans`; the parameters being case-sensitive, that choice is silently ignored.

**48. Resumption retouches (add1e78a3) and frozen test base (94515ca99) — acceptable; the point to fix and the note of
44 are settled.** `checkout` and `rm` run with `GIT_LITERAL_PATHSPECS=1` (`[ab].json` is a name); names are read with
`diff -z --name-only` (an accented name is found as it is). Files outside the pool committed by the workstation since the
common state are copied back into `data/` byte for byte from the reference, each path through `data_path`, never
committed (the plan says so, in the four languages). Minor note: such a file stays a changed file of the folder; a later
launcher publication on the same prefix (`git add -A -- <prefix>`) would carry it, so « never sent » means « never by the
resumption nor by synchronisation ». 94515ca99: a reference copy without a revision (a seeded test base, a restored
backup) is frozen too, at each reading, so that a write on a record fails in the noreg runs rather than at the user's.

**49. Map left right after mounting (94ce646e8) — acceptable.** Checks of the module's state after each `await`; no new
write, network or HTML (one added read of the pilot's own `fuel.json`); the choose mode left from outside no longer sends
an address back to Fuel by itself.

**50. Fuel, the map's proposal in one pass and runway wind (25b887349) — acceptable; the note of 47 is settled.** The keys
`rwy`, `sid`, `star`, `app` and `apptrans` are read once (`ctx.consume`) and mapped to `appTrans`; `admit()` checks each of
them as before; the choices are applied quietly, then one drawing and one write; with no admitted key nothing is written
or said, and without keys nothing happens at mounting. The wind of each runway option comes from the known METAR (never
the TAF), turned into numbers and arrows by `frame/lib/wind.js`, escaped in the option's text and title.

**51. c60c52f35 — acceptable.** `POST /__lan/pair` requires `Sec-Fetch-Site: same-origin`, else `Origin` equal to
`http://<Host>` (the host already checked exactly): the local network's login CSRF is closed, as for the relay.
`data_sync.lit()` puts `GIT_LITERAL_PATHSPECS` on every git command that receives file paths (adopt, resolve,
`_commit_local`, `untrack_indexes`, `settle`, the resumption, the frame's batch); what remains without it are wanted
patterns (`POOL`, `EXCLUDE`, `INDEXES`, `OUTPUTS`) or fixed paths. The GitHub transport refuses redirects.

**52. Fuel route batch — acceptable.** The only new write is `saveFlight` on the Auto gesture; nothing at mounting; the
route text stays the pilot's input, its points resolved by aerodb. The completion list escapes its token and label, ids
are indexes, the chosen token is written at the cursor and parsed again like typing, the typed text only feeds
`aerodb.find`. The « Points (N) » groups escape their labels and fixes, the point's id goes through `esc`, positions are
numbers. No network of its own.

**53. Tests (K49, noreg lock) — acceptable.** Test infrastructure only.

**54. Map display commits — acceptable.** No `data.put`, `fetch`, `location` or `localStorage` added; unescaped
interpolations are family names, booleans, numbers, the palette's hue and already-escaped fragments; selectors use
`CSS.escape`. Defence in depth: `data-sev` could go through `esc` too.

**55. Settings, « IVAO application » assistant (b98589ae4) — acceptable, one note.** `GET secrets` returns only
`{ set, at }` for `ivao_oauth` (`SECRET_BLIND`); the fields are emptied after sending, never shown again;
`secrets_test('ivao_oauth')` returns only success or the error's name after reading the discovery document again. Writing
goes only through `POST /__setup/secrets`, a workstation route, limited to `clientId` and `clientSecret`; the discovery
address cannot be set from the page. The return addresses are computed by the launcher (`ivaoRedirects`, the same as
`_ivao_redirect`) and only shown, escaped, with « Copy ». Note: the relay's address appears only when the launcher runs
with `--relay`; the page could say so.

**56. IVAO account without an application (e13964b44) — acceptable, one remark.** `GET /__setup/ivao/oauth` returns
only two booleans (an application is set, the request came through the relay): no secret, no change of state.
`ivao_redirects(port)` is the single source of the return addresses (start, return, the 409 answer, `GET secrets`). IVAO's
refusal is reduced to `[a-z0-9_]`, 40 signs, returned as `ivao:<code>` in the encoded fragment and shown through
`notify()`; no token is issued and the pending state is consumed first; on the workstation the narrow exception still
requires a pending state, on the relay a paired device. Remark: a third-party link to the relay's callback with
`?error=xyz`, followed by a paired pilot, shows « IVAO refused: xyz » in a closed character set (a false message without
effect); show IVAO's code only when the device had a pending state.

**57. The « aircraft » job set (d8919b0e6) — acceptable, two notes.** Workstation routes; `regen/verbs` returns names
only. Codes match `[A-Z0-9]{2,8}` (no `-`, so no option slipped to the script), 200 at most, else the airline's fleet
under the same rule; `dry` is true unless `false` is given; no path from the page. The suite's own script runs with
`sys.executable`, as an argument list, no shell; `fetch` works on copies thrown away; outputs and caches are ignored by
git; the data files are written with `json.dumps` (no script injection from a source's answer). Purge: the caches only,
links skipped, tracked files kept (`ls-files -z`, literal pathspecs), a git failure removes nothing, `dry` by default.
Publish goes through the launcher's `aircraft_publish` (pending-merge check first) and requires the job's author. The
IVAO retouch shows IVAO's code only when the device had a pending sign-in: the remark of 56 is settled. Notes: `_run`
passes the whole environment to the script (`EAD_PASSWORD` or other secrets if the launcher has them): a reduced
environment is enough; the purge does not check the real path before `os.remove` (`os.walk` descends a junction under
Windows): reuse `_inside` as `base/purge` does.

**58. The « vfr » job set and common rules (ab0258453) — acceptable; the notes of 57 are settled; three notes.**
`regen_jobs.child_env()` keeps a short allow-list (path, system, temporary folders, profile, language, proxy): no EAD
credentials nor tokens for a job's child process; `git_child_env()` serves the purges' `ls-files`; `inside()`,
`files_under()` and `prune_empty()` are one rule for every purge (no link or junction descended, the real path checked
again just before removal). VFR: cycle `\d{4}-\d{2}-\d{2}`, codes `^LF[A-Z0-9]{2}$` (800 at most); the chart address built
on the SIA's fixed host, the body required to start with `%PDF`, written atomically under `data/local/vac/<cycle>/`; a
pause between requests and 30 s between starts; build goes through `vfr_import`'s strict check, then `commit_outputs` on
`sia/vfr/` with the trigram. Notes: `build` writes `sia/vfr/` before `commit_outputs` checks for a pending merge (the
`/__setup/vfr-import` route checks first): check `merge_pending` before writing; `vfr._get` reads without a ceiling and
follows redirects (reuse the 200 MB ceiling of `aero_fetch.get`); two children still get the full environment
(`base_sources._git`, the headless browser of `base.py`): use `child_env()` / `git_child_env()` there too.

**59. Data module, a panel per group (2456bf289) — acceptable.** The declaration lists `regen/job`, `regen/verbs` and
`sync-status` only; a verb unknown to the launcher is greyed with its reason. The page sends identifiers only (zones and
personal sources, States, a cycle, codes; `dry` for a plan), never a path, and every verb checks them again (25, 28, 57,
58). Publishing records runs a dry plan, asks, then runs the real job with the same arguments, the trigram being the
job's author. One operation at a time. Names, identifiers, manual addresses (https only) and report lines are escaped;
states, verbs and outcomes go through closed lists; selectors use `CSS.escape`; the journal keeps counts and results.

**60. Two small commits (bae413f55, 3ed39a3e4) — acceptable.** No write, network or new HTML.

**61. Procedures by State (622936805) — acceptable; the notes of 58 are settled; one note.** States match
`^[A-Z]{1,2}$` (1 to 40); only LF (the SIA's eAIP) and K (the FAA's CIFP) have a source, any other State gives
`no-source`, and an EAD State is refused without any call. `regen_jobs.download` reads in parts up to a ceiling and
follows a redirect only to the same host (never from https to http); addresses are computed by the launcher; the CIFP
must start with `PK`, the SIA's PDF names go through `safe_path`, files are written atomically under
`data/local/<eaip|cifp>/<cycle>/`. Build checks for a pending merge first (now in every job set), writes under
`data/proc/<cycle>/` and commits that folder with the trigram. Purge: `inside()` before walking and before removal,
tracked files kept, `dry` by default. The headless browser and the base set's git run with the reduced environment.
Note: the CIFP zip is opened without a ceiling on its uncompressed size; sum the members' sizes before reading.

**62. Three small commits (c5f771b7a, e54c0b00e, 1367d3523) — acceptable.** No new write or network; Fuel's procedure
labels go through `opt()`, which escapes; the Map pane's values come from the code.

**63. Aircraft module, sheets and fleet (224d3cdbe, 86fa1c5ff) — acceptable, one note.** Pasted content (OFP, lnmperf,
CSV, JSON, a ChatGPT answer) is never read as HTML: preview, fields, labels with their unit, origins and kept values,
names and options are all escaped; field paths come from the code. Sheets are written only through aerodb's
`sheets.put` / `sheets.remove` (prefix `aircraft/sheets/`), removal after `ctx.ask`; exports download on a gesture under
the sheet's id; `#aircraft?sheet=<id>` is consumed once and looked up among the sheets; no network. The fleet view reads
`airline/fleet.json` again just before writing and merges per aircraft (unknown fields kept), registrations upper-case
and unique, retirement after `ctx.ask`, everything escaped. Note (access model, not a defect): the fleet is shared data
of the airline; the Maintenance application and the Complete level are an interface guard only, so any pilot whose device
writes to the repository (GitLab Developer token, relay) can change it, as for other shared data; to keep in mind for
invitations (R2) and for the relay's prefixes debt (38).

**64. Two pure commits (232f85dfe, e315c2e0b) — acceptable.** No write, network or new HTML.

**65. Fuel, the sheets editor removed (4044dc8ba) — acceptable.** No `sheets.put` or `sheets.remove` is left in Fuel;
« Use » only picks the flight's sheet through the flight's usual path. The links to the Aircraft module are relative,
the sheet id through `encodeURIComponent`; names and units are escaped.

**66. One User-Agent and a log of outbound failures (37b043e68) — acceptable, one small point to fix.**
`outbound.opener()` keeps the handlers given to it (no redirects for GitLab and OpenID, same host for the jobs, stay on
host and cookies for EAD, the relay's redirect rule and TLS context for `net`); the download ceiling and the unredirected
credentials are unchanged; the User-Agent is set only when a request has none (EAD keeps its browser prefix). The log line
carries the host, the path (160 signs) and the code or the kind of error: never the query, a header, a body or a token;
messages to the page carry the HTTP code only. *To fix:* `where()` keeps the path, and EAD Basic carries its session id
in it (`…;jsessionid=…`, kept in `path` by `urlsplit`): a failed EAD request would write it to the launcher's console,
against the rule of 4; cut each path segment at its first `;`.

**67. openAIP runways (abf143819, 4802818a2) — acceptable.** A reading of the local GeoJSON only; headings and
declination through `Number.isFinite`, lengths converted and rounded, surface from a closed table (own keys only, else
`unknown`), the runway designator cut to 8 signs; displayed escaped by the Map.

**68. Refactor R-F1 (552e0889d) — acceptable, no change of behaviour.** The runway wind moves to `frame/lib/wind.js`
(pure); Fuel's old copy is gone and no longer called; the one changed case (the heading taken from the thresholds before
the QFU) is explained in the commit. No guard involved.

**69. Refactor R-F2a (30cf56414) — acceptable, no change of behaviour.** One rule for approach transitions in
`frame/lib/procedures.js` (pure); the removed re-export of `flight_path.js` is imported by no one. No guard involved.

**70. 423ae3f98 — acceptable; the point of 66 and the notes of 61 and 30 are settled.** `where()` cuts each path
segment at its first `;`, so a session id never reaches the console. `zip_check` caps the announced uncompressed size at
2 GB before any reading (`zipfile` never returns more than an entry's announced size; a false size ends in a CRC error),
limits the CIFP to the archive's root, and also covers the first run's data archive. `outbound.opener` adds a same-host
redirect rule (never https to http) unless a redirect handler is given (no redirects for OpenID and GitLab, the relay's
rule, EAD's stay-on-host); `aero_fetch`, the SIA and the jobs' downloads now benefit from it.

**71. Data module, VAC and Procedures panels (3b6df2ada) — acceptable.** No write, network or new route; arguments stay
identifiers (a cycle, States) checked again by the launcher (58, 61); `merge-pending` and `unsafe-path` join the closed
lists; text goes through `esc` or the translations.

**72. Map, « around the flight only » (4f9dca4c3, 422ed8b3f) — acceptable.** The switch is kept in the device's own
setting (`cache/maps/ui.json`, policy cache); no network or other write; layer keys and hues come from the code; names
composed as « type + name » are text only (drawn on the canvas, escaped in the pane). The second commit only touches a
test.

**73. Refactors R-F2b and R-F3 (4ae61e552, fd959f911) — acceptable, no change of behaviour.** R-F2b keeps
`frame/lib/procedures.js` pure (one name rule, private reasons behind unchanged signatures); the two edge differences only
change displayed or compared text, and Fuel still escapes the names. R-F3 adds three colour tokens (no `url()` or
`@import`) that Fuel reads instead of hard-coded colours.

**74. Application switcher (1d11ae81c) — acceptable.** The list is built from the code's `APPS` table, escaped;
Maintenance greyed below the Complete level (a display guard; the real ones stay at the launcher, 24). Navigation goes only
to an entry of `APPS`, the address made of the current path, the query updated through `URLSearchParams` and the
application's first module. The favicon reads the suite's own SVG and only sets the path's `fill` to the token's computed
colour, as an encoded `data:` URL (an SVG favicon runs no script).

**75. Map, light drawing during a gesture (c3eed56db) — acceptable.** Canvas only (paths, transforms): no HTML,
network, write or storage.

**76. Refactor R-C2, one pairing for both channels (4e83fc50a) — acceptable; no guard lost; two notes.**
`tools/device_access.py` replaces the two former modules. The relay's gate keeps every guard (fail closed on proxy headers
outside the relay port, 503 without a public host, https seen by the proxy, pairing on the `relay` channel, GET / HEAD /
POST only, `relay=True` routes only), and `POST /__relay/pair` still requires the same origin; the local network's gate
keeps the private address, the exact host, pairing on the `lan` channel and `lan` routes only, and `POST /__lan/pair` the
same origin. A token opens only its row's channel; the migration puts each former row under its own channel, so a
local-network token never opens the relay; a relay row always has a trigram, and the console code (no trigram) is valid
for the local network only. « Name » (`POST /__setup/devices/name`) is a workstation route, takes a trigram matching the
rule and applies only to a row without one: it creates or widens no access. Codes: 8 random digits, `compare_digest`,
single use, 10 minutes; a new code reopens closed pairing but no longer lifts an address's wait; only SHA-256 fingerprints
are kept, in a hidden file. Notes: the shared counter (30 wrong codes an hour) now closes pairing on **both** channels, so
a stranger on the Internet can close local-network pairing too (a new code reopens it; separate counters per channel if
it bothers); expired rows are refused but never purged from the list.

**77. « Workstation folders » and the R-C2 notes (36f571e40) — acceptable; the notes of 76 are settled; one note.**
`GET /__setup/folders` and `POST /__setup/folders/open` are workstation routes (`_allowed`, `_lan`, not open to the relay);
absolute paths are shown to the workstation only. The page sends only an id, looked up in a fixed list (unknown: 400;
missing folder: 409); the launcher opens its own path, and only a directory (`os.path.isdir`); elsewhere than Windows,
`open` / `xdg-open` as an argument list with the reduced environment. R-C2: one bucket of wrong codes per channel (closing
one channel only, and removing it from pending codes), the per-address wait still shared, a new code reopening only its
channels; expired rows removed at reading. Note: under Windows `os.startfile(path)` with the default verb would run an
executable or a shortcut if the path changed between `isdir()` and the call (a local account only); `os.startfile(path,
'explore')` forces the file explorer.

**78. Refactor R-F4a (7cd47db8d) — acceptable, no change of behaviour.** Fuel's route reading moves (not copied) to
`frame/lib/route_model.js`, pure (no DOM, network, storage, `eval` or pattern built from data); the flight is still written
by Fuel's bounded save.

**79. Refactor R-C3, IVAO's return in one place (7426e127d) — acceptable; no guard lost; the surface is reduced.**
`ivao_oauth_finish` is unchanged: state bound to the device and the return address, single use, ten minutes, IVAO's code
shown only with a pending sign-in. Discovery, token, revocation, GitLab and the relay probe use one opener without
redirects. The callback is a declared route open to the relay; the local network's gate lets it through (it filters
`/__setup/` only), but `_ivao_return` refuses the local network (a navigation from IVAO is « another site ») and the handler
answers 403 to a same-origin local-network request. One guard, `_ivao_return`, runs in `_refused()` after `_local_host()`:
through the relay, a GET of this path after the device's gate; on the workstation, a document navigation with a pending
state of the workstation. Removed: the page's `ivao.token()` (no reader), the `ivao/oauth/refresh` route (so the note
of 41 on renewing any presented refresh token no longer applies), the former opener names. `os.startfile(path, 'explore')`
settles the note of 77.

**80. Map, Layers chip and transitions under the approach (a314a352c, c884c8b3d) — acceptable.** Layout, and a local
selection rule (`PR.compatible({ star })`, reset to « None »); no network, write or storage; new templates insert the
code's texts and constant attributes; the return to Fuel is still checked by `admit()`.

**81. Refactor R-F4b (ddf10e3b8) — acceptable.** `PR.endsOf` is pure; `routingChain` is removed from `flight_path.js` and
its re-export, with no caller left; Fuel's Auto adds no write (still the flight's bounded save), no network or HTML; the
intended fix (the exit followed in the right direction) only concerns the route's computation.

**82. « Update everything » (3a908fa44) — acceptable.** No new route: the chain runs `regen/job` (fetch then build per
set) and publishes through `ctx.data.sync({ gesture: true })`; arguments stay identifiers. One question at the start (cycle,
sets, skipped sets, the publication). The publication skips its own question only after **every** set succeeded (the first
failure or a stop ends the chain without publishing), and the publish gate is evaluated again just before (a build
running, no gesture, nothing to publish). Display through closed lists and escaped text; a chain cut by a reload is said,
never resumed by itself.

**83. Refactor R-C4, the route table published (d3fa3614a) — acceptable; no route changed audience.** The only
difference among the route declarations is the new `GET /__setup/routes` (workstation, `_allowed`, `_lan`, not open to
the relay), which returns method, path, audience and relay flag of each route: no path of the workstation, no secret. A
screen's or module's declaration stays its allow-list; a missing route only shows a message. Recommended for I10 (R-C1):
freeze the relay's routes as they are today — `GET status`, `GET changes`, `GET ivao/oauth`, `GET /__relay/ivao/callback`,
`POST batch`, `POST sync`, `POST net`, `POST ivao/oauth/start`, `POST ivao/oauth/revoke` — so that any other route marked
`relay=True` fails the case; and justify each `lan` route that is not open to the relay (the Little Navmap sheets, the
simulator's position).

**84. Choose pane (c47470399) and the data repository's provider (48079d78f) — acceptable.** `providerOf` goes through
`parseRepo`, which drops any user part (https, ssh, git, and the user of `git@host:`), requires a plain host and project,
and rebuilds the web address from those two only: a `user:token@` can never come back. The provider is a closed list;
the project and its link are escaped (a link only for https, `noopener`); the « Pilots' tokens » link is internal. The
exported configuration carries the repository and the provider, never a token. The map commit is layout only.

**85. Map, labels in the collision pass (ccedbd6c6, 1d137874f) — acceptable.** Placement on the canvas only (aerodrome
code, runway numbers, the profile's constraint texts): no HTML, write, network or storage.

**86. R-F4c and the status lines (81ff938e2, 232e92bb3) — acceptable.** R-F4c writes the edited route's text through
one pure rule (`textFromTokens`), the bench moved into `frame/lib/test`; no write, network or HTML. The status lines now
lead to internal Settings cards only (fixed `card:` targets from the code); the CSS change loads nothing.

**87. R-C1, R-F5 and a text (68b2f4dbe, f7183950a, 39a28c9b0) — acceptable; no guard lost.** R-C1: a `Relay` class
replaces the former dictionary; `start()` sets the host and port before listening; `_relay()` stays the server's mark;
the relay's gate still runs first: off the relay port, `_proxy_belt()` answers 403 to a proxied request from the
loopback; on it, 503 without a host, then https, pairing on the `relay` channel, GET / HEAD / POST, `relay=True` routes;
`POST /__relay/pair` still requires the same origin; no former dictionary access is left. The noreg (I10) now freezes the
nine relay routes and the three local-network-only routes (Little Navmap sheets and folder, the simulator's position), as
recommended in 83. R-F5: one completion list (`modules/fuel/suggest.js`), its values, labels and data attributes escaped,
its options from the code; the cursor insertion and the filtered choice are unchanged. 39a28c9b0: a text defined once.

**88. Refactor R-M4 (0422d2d2a) — acceptable.** One runway store read from aerodb, the bearing from the common rule of
R-F1; three helpers removed with no caller left; canvas only, no write, network or HTML.

**89. `base/pickup`, R-C5 and a card move (25beba925, 29db3a2fb, 64e5f2d98) — acceptable, two notes.** `base/pickup`
takes zones and `dry` (true by default) only; the zip is the newest file of the workstation's Downloads folders whose name
follows a pattern of the code (links and folders skipped), refused over 500 MB before opening, then `zip_check` before any
reading; each entry is taken by its final name alone (an ASCII pattern, no separator or `:`), so `../../evil.xml` becomes
`evil.xml` in the target folder; the target (`data/sia/` or `data/sia/zones/gb/`) is checked again with `inside()`; files
are written atomically; nothing runs and nothing is committed. Notes: pass the final name through `data_path` too (Windows
device names, a trailing dot or space); NATS's filter keeps any `.xml`, so an entry named like another source's file of
the same folder would overwrite it (start the filter with `^EG_`). R-C5: the workstation's resumption now commits through
`_commit_local` (the `.js` check, literal paths, the pool only), the same guards it used to write by hand; each
resumption keeps its backup reference, its plan and the pending-merge check.

**90. Refactor R-S1, the Data module (567cfe7ff) — acceptable, no change of behaviour.** Dead helpers removed and
repetitions factored; every external link still goes through `M.isHttps` (otherwise the address is shown as text), the
only other link being an internal constant; no new argument to the launcher, no write or network added.

**91. Refactor R-M6 (e0cabb221) — acceptable.** The Map reads the track only from the frame (`ctx.live.trail()`, for
the flight's own start), still cut to `TRAIL_MAX` before reading and bounded to real coordinates (32); it keeps no
position of its own; no write, network or HTML.

**92. Four small commits (d6011f983, 6379d2b18, 7691a3397, 7fc062bd1) — acceptable.** `zoneOutlines()` loads a file of
the suite's code (same origin, allowed by the CSP), not repository data, and returns a recomposed, frozen shape; the zone
names it carries are escaped where modules show them. The other commits add files to Fuel's offline list, adjust a test
and change CSS.

**93. R-M3, R-F6 and two small commits (70e63c907, d734c3572, 83e75ad89, 5590b5f72) — acceptable, no change of
behaviour.** R-M3 rewrites the Map's drawing scheduler (canvas and timers only); R-F6 reduces Fuel's procedures-card state
to two flags (pure); a file added to the Report's offline list; a test. No write, network or HTML added; no guard involved.

**94. Test cases and the Map's plain background (d24772b8a, bb9076aca, ad2f8330c, bb9c98570) — acceptable.** The three
Fuel commits touch the test cases only (two merged, a new case finally running Fuel's six pure benches). The Map's plain
background now reads the zone outlines through `aerodb.zoneOutlines()` (a file of the code, 92), the former outline file
kept as a fallback; offline file lists completed; no write, network or HTML.

**95. The Data module's “take the downloaded file” (c62d555e6) — acceptable, one note.** The module sends only
`{ zones, dry }` to `base/pickup` (the launcher's check refuses any other key; `dry` is sent explicitly for the plan, then
`false` after the one question); zones from the button's attribute are filtered against the known identifiers; the zip
name, the expected name, the file names and the failure reasons come from the launcher and are always escaped, in the
panel as in `ctx.ask` and `notify`; the destination shown is a label only, the real path stays the launcher's (`inside()`,
89); never part of “Update all”; the plan is never logged. Note: the real take reads Downloads again and takes the
newest matching zip, so a zip arriving while the question is open would be taken without having been shown; pass the
name (and size or date) of the zip shown in the plan and let the launcher refuse when it no longer matches.

**96. Refactor R-M1, the Map's choose pane (5e4b9433f, 7112b1b3b, e70eacb38) — acceptable, no change of
behaviour.** The pane's rules move to a pure model (`frame/lib/pane_model.js`: no DOM, network or storage); the return to
Fuel is still built by `paneReturn` from a closed table of keys with `encodeURIComponent` values and the side validated at
opening, and Fuel checks it again before writing; every name from the model is shown through the Map's escaped texts; (c)
merges the three exits into `chooseClose()` (Done, ✕, Escape), the only `location.replace`, with no caller of the removed
functions left. The Map still writes nothing.

**97. Suite update by channel (4fc473e5d) — acceptable, two notes.** `GET` and `POST /__setup/update` are for this
workstation only (`do_POST` applies the LAN and relay gates and `_allowed()` to all of `/__setup/`, the handlers refuse
`_lan()` again). The channel is checked against a closed list (400 otherwise); the tag comes only from `git tag --list`
filtered by a strict version pattern, then `refs/tags/<name>^{commit}`; the development branch is a constant; git runs
with an argument list, never through a shell, and without prompts; failure messages go through `clean_text` and are shown
as text. Nothing is written when tracked files are modified, the checkout is not the channel's, or the target does not
contain the current version; the branch only moves by `merge --ff-only`; `data/` is never touched. The same commit closes
the two notes of 89: each final name of `base/pickup` goes through `data_path` (and the destination is taken from it), and
NATS only takes `EG…` files. Notes: refuse the update while a regeneration job or a sync runs (the checkout changes
`tools/` under a running child process); the target is not verified (no signed tags), so the suite runs what `origin`
serves at the next start — the same trust as today's manual pull, to be stated in the documentation and tightened if tags
are ever signed. The `GET` runs a `git fetch` (remote references only), acceptable behind `_allowed()` on this workstation.

**98. Refactor R-M2 + R-M5 (a) (3e65a0465) — acceptable, no change of behaviour.** One cartouche primitive in the
rendering core draws the procedure labels, the choose-pane cartouches and the airway boxes (identical canvas hashes on four
scenes). The procedure hues now read `--sog-map-sid`, `-star` and `-app`: they come from `frame/design/tokens.css` (the
suite's code; nothing sets them at run time) and reach the canvas only, where an invalid string is ignored; the hues placed
in a `style` attribute of the choose pane are still the palette's hex constants. Rule kept: a colour read from the theme
that ever goes into HTML passes through `cssColor` with a hex fallback.

**99. The Data module's zone map and the noreg locks (4b201ca99, b939f4051) — acceptable.** The map draws the outlines
of `ctx.aerodb.zoneOutlines()` only (92); the SVG path, view box and size are made of numbers alone (rounded with
`Math.round`, never a string from the data); the zone identifier, the name and the state go into `data-*`, `aria-label` and
`<title>` escaped; the tone comes from a closed list; a tap or a key ticks only an identifier the panel's list offers, in
the same selection, and nothing while an operation runs. No network or write added. The noreg locks live at constant paths
in the temporary folder, are created exclusively, are removed when stale only if their process is gone, and only by their
owner otherwise; no path comes from an argument.

**100. Help placed under the module (09c9cacb4) — acceptable.** Only the insertion points change in `frame/app.js`
(after the module instead of before it); the same nodes built by `SogHelp.panel` and `SogHelp.welcome`, from the same help
bundle, under the same guards; no new HTML or text source.

**101. Refactor R-M2 + R-M5 (b) (87748d47a) — acceptable, no change of behaviour.** Every label of the Map is a
request passed through `SiaAero.ask` and painted on the canvas only (`paint` receives the context and a rectangle); no HTML,
attribute, network, storage or navigation added. The deduplication key of aerodb answers is a string used by a `Set` and the
placer only, never in the DOM; airspace limits are strings (`shared/sia_base.js`), so two airspaces with different limits
keep different keys. The `--sog-map-*` tokens now pass `CSS.supports('color', …)` with the hex fallback, and the rule of 98
(a theme colour going into HTML passes through `cssColor`) is written in the Map's DECISIONS.

**102. Refactor R-C6, the transports' common base (72ba695a8) — acceptable, no guard lost.** `frame/store/transport_git.js`
holds the only `fetch` of the three files, still with `cache: 'no-store'` and `redirect: 'error'`, so neither `Authorization`
nor `PRIVATE-TOKEN` follows a redirect to any host; each transport supplies its own headers, never through the address; the
refusal messages are built from the status and the server's message only, never the token; the base logs nothing. GitLab's
pagination is unchanged and checked before the call (the `next` link is kept only when it starts with `${api}/`); the
publishing loop (cancellation, 100 MB per file, progress, failed rank, resumption) is the former one, written once, and each
commit still reads the head just before. The base loads before both transports in the page and the service worker list, and
each transport stands down without it.

**103. The notes of 97 (2a02aedde) — acceptable, one note.** `update_suite` refuses with `busy` while a regeneration
job runs (read under the jobs lock) or while `SYNC_LOCK` is taken (a non-blocking acquire, so no deadlock with a sync taking
the locks in the other order); both locks are held during the update and released on every exit (`with`, `finally`); the
help and the SPEC state that the target is not verified (unsigned tags, the same trust as a manual pull). Note (operation,
not security): the jobs lock is held during the whole update, `git fetch` included, while `view`, `cancel`, `claim` and
`put` take the same lock, so the Data module's polls and “Stop” hang until the update ends; plan with the fetch outside
the locks and hold them for the writing phase only, or raise an “update running” flag that `start()` refuses.

**104. The note of 95 (79aaed096, 1e7a06443) — acceptable, one note.** `base/pickup` takes an optional `zips` key
(`{ <source>: { name, size } }`, a closed shape: a known source, a simple file name, a whole size of zero or more, 400
otherwise); `name` and `size` are only compared with the zip the launcher finds, never used to build a path; a source whose
newest zip no longer matches is refused (`changed`) before anything is opened or written. The module builds that key from
the plan's `taken` entries alone, keeps it in its state, sends nothing else for the real take, and shows the refused zip's
name escaped with “Run the plan again”. The zone map draws a zone without its own outline (no ring, or a ring equal to its
box, recognised from the data) dashed and says so; its fallback path is made of the box's numbers. Note: the launcher finds
the zip by its pattern without restricting the rest of its name, so a zip whose name falls outside the simple-name rule
(an accent, a bracket, over 150 characters) is shown in the plan but left out of `zips`, and the real take then picks the
newest file unchecked for that source; the module should not start the real take (or ask to rename the file) when a taken
source has no entry.

**105. The note of 103 (99b4c2a25) — acceptable, one note.** The plan and its `git fetch` run outside every lock;
`Jobs.hold` raises a flag under the jobs lock and releases the lock at once (refused while a job runs or another update
holds the flag), so `start()` answers 409 while `view`, `cancel`, `claim` and `put` keep answering; `SYNC_LOCK` is taken
without waiting for the writing phase only (the plan done again without a fetch, then the checkout or the fast-forward);
the lock and the flag are released on every exit. Note: the write goes to the target of the plan this request has just
made, which is not necessarily the one shown on screen (the request fetches again, and another fetch may move the
references before the write); still a strict tag or a fast-forward, on this workstation only. Pass the commit shown
(`target`, 40 hexadecimal characters) with the request and refuse (`changed`) when the plan done again no longer points to it.

**106. Refactor R-S2 (b4e76634e) — acceptable, no change of behaviour.** `readProfiles` and `writeProfiles` replace
the four functions of `edge` and `runwayZoom`; the zoom is still checked against its bounds before anything is read or
written; same file, same data layer, same `put`; the content written is the former one (the rest of the file kept, any
unknown key included, `edge` merged with the existing one).

**107. The note of 105 (513f6fb5b) — acceptable, one note.** The plan returns the target's commit; the panel keeps it
and sends it back as `target` (empty, or 40 hexadecimal characters, 400 otherwise); it is only compared with the plan,
after the fetch and again under `SYNC_LOCK` on the plan done again without a fetch, and a different target is refused
(`changed`) before anything is written; it is never passed to git. Note: on the `suivi` channel the fast-forward still names
`origin/<branch>` rather than the commit just checked, so a check from another tab fetching in between could still move it;
merge the plan's own commit (read by the launcher with `rev-parse`). Tags do not have this window (a fetch without `--force`
does not move an existing tag).

**108. The note of 107 (bad15045f) — acceptable.** On the `suivi` channel the fast-forward is given the commit the
plan read itself with `rev-parse` (40 hexadecimal characters, never a name another fetch could move, never a value of the
request); tags unchanged.

**109. The note of 104 (23e56bc9f) — acceptable, one optional hardening.** From the plan kept in its state only, the
module splits the zips it can send (the launcher's name rule, a whole size) from the others, which are shown with “rename
the file” and never taken; the real take covers only the zones with a sendable zip and none blocked; with nothing
sendable, no question is asked. The 409 `updating` of 105 is told apart; the profile defaults of 106 are frozen. Hardening,
on the launcher's side: a zone may have several sources it can take, so a source missing from the plan whose zip arrives
before the answer is still taken without a check; when the request carries `zips`, take only the sources it names.

**110. Refactor R-M2 + R-M5 (c) (9f703190c) — acceptable.** The Map draws twice: a silent round on a local object
(`measureText` on an off-screen canvas, every other drawing method of the prototype a no-op) collects the label requests,
then the painted round finds each decision by layer, key and order; some winners change on purpose (said in the commit
and the SPEC), nothing of security. The silent object still exposes the real `canvas`; no drawing code of the Map writes
through `ctx.canvas`, and it must stay so. Keys and boxes stay in local maps; no HTML, attribute, network, storage or
navigation added; the help texts come from the bundle.

**111. The hardening of 109 (8965e8c47) — acceptable.** When the request carries `zips`, a source it does not name is
refused (`not-shown`) before any file is looked at, and an empty `zips` now means “nothing shown” instead of “no key”;
without the key the behaviour is unchanged. The take therefore never picks a file the plan has not shown, whatever the
module sends.

**112. Refactor R-S3, the secrets of the launcher's cards (77264918e) — acceptable, one note.** `saveSecret` replaces
three copied blocks (EAD Basic, the IVAO application, the IVAO key): a missing field sends nothing; erasing asks first; the
fields are emptied before the call (now for the IVAO key too); the request is the former one, erasing sending the same keys
empty by the same route; the values live only in the function's argument, never in the module's state or a closure that
outlives the call; a failure shows the launcher's text and asks for the input again; the state line uses only `set` and
`at`. The Data module shows `not-shown` like `changed`, with “Run the plan again”. Note: the IVAO key's field is emptied
through its enclosing `<label>`; if the field ever leaves its label, nothing is emptied and nothing says so; empty the field
itself when no label is found, or pass the fields to empty instead of a box.

**113. The Map's sheet height (06dcd175b) — acceptable.** `sheetFit()` sets or removes four constant custom properties
on the module's root, with pixel values computed from DOM measurements and the frame's tokens (never a string from the
data or the address), and only when they change; the choose pane restores the sheet position it found, an internal state.
No DOM, network or storage added.

**114. Refactor R-S4, the providers' table (e8aa8dab3) — acceptable.** `SogConfig.PROVIDER_TABLE` (github, gitlab,
other) is frozen deeply; the classification of a repository is the former one (a provider lookup that is safe for
prototype names); the links it builds use the host and repository already checked by `parseRepo` (letters, digits, dots
and dashes, no `.` or `..` segment), escaped in `href` and text with `rel="noopener"`; the token's shape is a help text only.
The note of 112 is closed: the secret fields are passed themselves and emptied before the call, and a missing field throws
before anything is sent. “Other” has no write path of its own: the transport knows only GitHub (`github.com`) and a
GitLab instance at the pasted `https` host (its `/api/v4`, the token sent to that host alone, no redirect followed, 102).

**115. A side pane closed before its module arrives (d6e7fa27a) — acceptable.** `closePane` unmounts only a module
that has arrived, and `openPane` mounts nothing once its pane is closed; the module still comes from the frame's closed list
(`APP.modules`); no new path to a mount.

**116. The Map's framing (3d2346411) — acceptable.** `frameFlight` is the only writer of the camera: the user's
framing (centre and zoom, kept after a gesture of the user only) is held in the module's memory (`keep.cam`, never in
storage or the address) with a signature of the flight that is only compared, never shown; another flight drops it. No
HTML, network, storage or write added.

**117. Refactor R-S5 of the Data model (89dd17934) — acceptable, one note.** `entryHead` and `jobOf` build the same
journal entries as before (no plan or path added); the texts are shown through the same escaping. Note: `kindOf` maps a
reason with `r.reason in map`, which also reads the prototype, so a reason named like `toString` or `__proto__` would give a
function or `Object.prototype` as the kind instead of `failed`; the reason comes from the launcher, so nothing is reachable
today, but the kind goes raw into attributes and serves as a key of the texts: use `Object.hasOwn(map, r.reason)`.

**118. Own keys, the configuration's provider, and an older finding (8acd4976e, 540393e28; ca75625f39) — acceptable;
one point to fix.** The note of 117 is closed: `own()` reads a table only for an own string or number key
(`Object.hasOwn`), applied to every table read with a value of a response. The configuration now carries its provider from a
closed list (github, gitlab), refused at `validate` before anything is written, never deduced from the host (an older
configuration without one is accepted only on `github.com`); the known public hosts are frozen with the table and compared
by equality; “other” is gone, matching the transport. **To fix** (found while reviewing, present since ca75625f39 of
23 October): a `github` configuration may carry `data.api`, accepted for any `https` host; Join passes it to the transport,
which sends the pilot's GitHub token as `Authorization: Bearer` to that host. A forged join link showing GitHub's name and
pages, with `data.api` on another host, collects the token the pilot has just created. Accept `api` only as
`https://api.github.com` or the local test address for `github` (GitLab's is already rebuilt from `data.host`), never
export another, and let the transport ignore any other GitHub API.

**119. The point of 118 fixed (683af2b8d, 375803a86) — acceptable.** Two belts. The GitHub transport keeps an API
address only if it is exactly `https://api.github.com` or the local test address, in `clean()`, `target()` and just before
the header for a setting that skipped `clean()`; any other is ignored (one console warning, the host not named), so the
token goes to `api.github.com`. At the source, a received configuration keeps no API address at all: for GitHub only an
absent value or `https://api.github.com` is accepted (any other, local addresses included, refuses the configuration),
for GitLab the address is rebuilt from `data.host`; the export never writes one; Join passes none to the transport, and the
owner lookup asks `api.github.com` only.

**120. Refactor R-S6 of the Data module (794f6ac60) — acceptable, no change of behaviour.** `finishOp`, `finishPlan`
and the table of summaries (read through `own`, 118) replace the copied endings; the lines added hold no markup at all, so
the texts still reach the page through the former escaped renderers; the real runs after a plan send the same arguments as
before (the purge's, the sheets' `dry: false`, the take's zones and `zips` from the plan kept, never read again); no verb or
route added.

**121. Refactor R-S7 of the Data module (317d8d46c) — acceptable, no change of behaviour.** The base panel is drawn by
the common panel: its buttons take the same gate as before (`gateOf('base', number of ticked zones)`, the take with its own
gate), and a click still checks the gate again before anything is launched (`startOp`); the set names in `data-*` come
from the module's closed lists (`SETS`, `PANEL_UI` read through `own`); no verb or route added.

**122. The choose pane's opening view (6a8403466) — acceptable.** The frame is made symmetric around the aerodrome and
the first family's candidates are drawn faded on the canvas; touching one goes through the existing tracing and the same
pane model as its row; nothing is written before Done and the return to Fuel keeps its closed keys (96).

**123. The Map's light drawing (696fb035f) — acceptable.** During a gesture the light drawing paints, as dots, the
aerodromes and beacons the full drawing kept; canvas only, no data read or written beyond what the full drawing already
had, the touch lists unchanged; no HTML, network or storage.

**124. Refactor R-S8 (1/2), the Data module split (435f70e44) — acceptable, a move only.** Read with
`git diff --color-moved`: the lines that are not moved are the SPEC and comments, `meta.files`, imports, and the former
definitions now prefixed with `export`; `S` lives in `state.js` and only `setState` replaces it (an imported binding cannot
be assigned elsewhere); `esc`, `own` and the gates stay where the renderers and `startOp` used them. No verb, route, write or
HTML added; every new file is in `meta.files`.

**125. The profile without waiting (f28b33257) — acceptable.** The vertical profile is built and drawn first without
the relief, then built again when the tiles arrive and swapped in only if the flight has not changed; `showProf` is its
only writer; the same tile hosts as before, nothing written. The test case serves its tile from the browser's request
interception (no file written, neither in `data/` nor elsewhere).

**126. Refactor R-S8 (2/2), the Data model split (bdb072221) — acceptable, a move only.** `model.js` re-exports six
files (`export * from`); read with `git diff --color-moved`, only 78 lines are not moved (`meta.files`, imports, exports,
headers). The model files import only each other and the private `model_kit.js` (not re-exported), never a screen file,
and use no DOM, network or storage; `own` and the escaping are unchanged.

**127. Refactor R-S9 (1/2), the Settings screen split (6105be2ba) — acceptable, a move only.** Read with
`git diff --color-moved`: the card templates of `cards.js` are the former ones (`cards.push(…)` become `return …`, every
value still through `esc`), `actions.js` holds the former click handler, field listeners, configuration file and backup
import or export, attached to the Settings view only; the only logic change is the call of `window.SogSettings.render`
after a join from a file. The configuration's checks (`validate` before anything is written, no `api` imported, 119) and
the secrets' `saveSecret` are not touched.

**128. The bounded wait for the airline (aabaa0f3b) — acceptable.** A call to an unlisted host waits for the
airline's first read 3 s at most; after that the decision is the one without an airline site, so an unlisted host gets
503, never a default permission, and a refused call is not reopened when the site is known later. Hosts of
`DIRECT_PATHS` (the relief tiles) no longer wait, and still pass only as `https` `GET` on their closed list of paths;
`RELAY`, `DIRECT` and the rule that nothing but `GET` goes to the airline's site are unchanged.

**129. Bounded reads of the aerodb parts (80a355157) — acceptable, one note.** A zone part is read with a bound (10 s),
then returns nothing; `abandon(path)` forgets only the shared read of that path (nothing cancelled, no write involved), the
path being one the layer builds itself; a part the repository's list does not name is empty without a read. Note
(correctness, not security): an abandoned read still runs to its end and writes the cache (`idb` put, `changed`), so if the
repository moved in between, an older revision can replace the newer one until the next revalidation; skip the write when
the job is no longer the one registered for its path.

**130. The note of 129 (a90e431e3) — acceptable.** After the read, a job that `abandon` replaced returns its result to
whoever still waits for it, without writing the cache or announcing a change, so an older revision arriving late never
replaces a newer one.

**131. Refactor R-S9 (2/2), shared texts and `render` in parts (3fe9628ca) — acceptable, no change of behaviour.** Read
with `git diff --color-moved`: the lines not moved are text rows moved into `kit.js`, the calls that now read them
(`t(K.…)` in place of `t(T.…)`, always inside `esc`), the two screens loading `kit.js` first, and `render` cut into
`routeJoin`, `placePage`, `paintOffline` / `paintZones` and `focusImport` in the same order. The checks of the
configuration (`validate`, no imported `api`, 119), `saveSecret` and `own` are untouched; no route or write added.

**132. The Weather module rewritten (0e1631995, cf6238b10, baa91389f, 6c1da70c6; 61778a14d) — acceptable.** Read on the
cloud session's branch (ad1965988) and checked identical after the rebase onto `v3`. The module's fifteen files make no
network call, keep no storage of their own and do not navigate; the weather comes only through the frame's weather layer,
whose only change bounds a past start to 92 days. Everything that comes from a flight (point names, labels) is escaped,
the tooltips and panels insert only escaped texts and formatted numbers; a pasted or loaded flight keeps only points with
finite coordinates; the address is read only to compare the demo flag. `meta.files` lists every file. 61778a14d only drops
the module's former store bench from the noreg table.

**133. The weather layer's `cost()` (d9609bd7f) — acceptable.** `cost` builds its request with the same functions as
`aloft` and `grid` (points filtered to finite coordinates, at most `MAX_SAMPLES` or `MAX_PLACES`), then reads only the
layer's cache (the known run from memory or `cache/weather/<model>/meta.json`, the cell files) to count what is missing;
it makes no outgoing call, the paths being built from the model's identifier and the layer's own keys.

**134. The map base's zone layer (1a519954f) — acceptable.** `zonesLayer` draws the caller's polygons as a MapLibre
source and layers; zone identifiers go only into feature properties and `onTap`, colours only into MapLibre paint
properties; no HTML, address, network or data read; its listeners (`style.load`, `styledata`, `click`) are removed by
`remove()`.

**135. The bar and one manual per application (cc6503ee0) — acceptable.** The manual is chosen by the application's
identifier (`c.app`, from the frame's closed list, and checked against `^[a-z]+$` before it names
`frame/help/<app>.<language>.md`), never by the address; `#help?m=` is only used as a selector through `CSS.escape`; the
tab links put a module identifier through `encodeURIComponent`, the badge is set by attributes only. No new help content
outside the bundle.

**136. A zone's frame (fed1c6f4a) — acceptable.** `zoneFrame(rings)` is a pure computation on the numbers of the
outlines (from the suite's code, 92); `zoneOutlines()` keeps its shape and adds `parts` and `framed`; nothing read or
written beyond it.

**137. Fuel units (85b1300e4) — acceptable, two notes.** A pure module (no state, call, DOM or text): densities from the
sheet, then the airline, then the type, refused outside 0.5–1.0 kg/L; conversions between kg, lb, L and USG. Notes:
`density()` ends with `FUEL_DENSITY[kind]`, which gives a function or `Object.prototype` for a kind named like
`constructor` or `__proto__` (use `Object.hasOwn`, as in 118); `num()` accepts booleans and one-number arrays
(`+true`, `+[5]`), so not every unreadable input becomes `null` (accept only numbers and non-empty strings).

**138. Sheets by type and variant (130048967) — acceptable.** The fleet's `sheetId` is only a key into the sheets
already read (an unknown one gives the type's estimate; nothing read or written); the only paths are built by `fileOf`,
which replaces every character outside `[A-Za-z0-9._-]` (no separator can remain), for writes on an identifier the module
chose. A new sheet's identifier passes `checkId` (type, then an optional `-VARIANT` of `[A-Z0-9-]`) and `newId` builds only
from those characters; a `.lnmperf` import keeps its own identifier only when it exists or passes `checkId`, otherwise is
named after its type, and is refused without one. The variant label is result data, escaped by the modules that show it.

**139. The notes of 137 (78cf63f65) — acceptable.** `density()` reads only own keys of an object (`Object.hasOwn`) for
the airline's densities and the defaults, and every fallback passes the plausibility bound; `num()` accepts only a number
or a non-empty string that writes one.

**140. Group of 1 November (9f637a970, 96ff67873, 879816763) — acceptable.** Grouped review from now on (economy
mode until 6 November: only commits with surface). The Data module's zone map uses the shared `zonesLayer` (134). The
mission reader is pure. The Missions module escapes every mission text (title, operation, route, types) and links to
`#fuel?mission=` with `encodeURIComponent`; Fuel consumes the key, looks the identifier up in the registry
(`missions/mission_registry.yaml`) before reading the mission file named there, through the data layer whose reads match
exact repository paths only (no `..` can reach outside), refuses on a started flight, asks before replacing a route, and
writes only the current flight.

**141. The IVAO return's hop page (2812c0689) — acceptable.** A redirect chain that starts on IVAO keeps
`Sec-Fetch-Site: cross-site`, so the frame page itself was refused after the 303. The return now answers with a page of this
origin (`frame_hop_page`, only from the return route): a meta refresh to `/frame/index.html#ivao-return?…`, no script,
the fragment URL-encoded then escaped for the attribute, `Cache-Control: no-store`, no referrer. The tokens stay where
they were, in the fragment that the frame stores and removes. The origin guard is not widened; a return whose state does
not match goes to `#ivao-return?error=state` with nothing exchanged and nothing consumed; a refusal is logged with the
`Sec-Fetch-*` headers and the reason, never the state.

**142. Group of 1 November evening (fe6713570, 0ea44bd45) — acceptable.** The transports say `offline` only when the
browser is offline, otherwise `unreachable: <host>` (the host from `URL().host`, without any user part or path), and the
repository's own refusal (the server's message, truncated, never the token); the last five failures kept for the copyable
diagnostic carry only those messages. `normalizeRepo` turns four input forms into one `https` address that goes through
`parseRepo` (host of letters, digits, dots and dashes, user part dropped, checked path segments) and refuses an unknown
provider, before anything is saved.

**143. Two GitLab hosts in `connect-src` (48fc586c2) — acceptable.** `tools/csp_policy.py` gains exactly
`https://gitlab.com` and `https://framagit.org` (the public GitLab hosts of the providers' table), no wildcard, nothing else;
the pages' meta tags are rebuilt from it, none committed by hand. A self-hosted GitLab stays blocked by the static site's
policy, a second barrier behind the transport. The frame listens to `securitypolicyviolation` and says, for a blocked
`connect-src`, only the host (from `URL().host`).

**144. The service worker's staged update (ed34c5a1b) — acceptable.** The next version is read into a separate cache
(`sog-frame-v1-next`) from the keys of the current cache, which only ever holds same-origin code paths (`ours()`); a failed
read throws the whole stage away; only a complete stage (its `READY` mark) replaces the current cache, at once, on the next
page load or “Reload”, and pages are never served from the stage. The page and the worker exchange only the closed
messages `skip-waiting` and `refresh`; nothing reloads by itself.

**145. Group of 1 November night (cbac9face, 3f84b21f4, 6bd060c0f, 25bc3e625) — acceptable.** `FD.gitlab(c).whoami()`
reads `/user` and `/personal_access_tokens/self` through the same caller (same host, no redirect, 102), writes nothing and
returns `{ bot, username, scopes, expiresAt }` for the Settings' “Test”, which warns on a personal token or an expiry
missing or beyond a year (§ 10.36: a warning, not a refusal, for the user alone with their own repository). The
diagnostic's last failures gain “csp: <host>”, the host only. The texts of § 10.36 ask for a project access token
(Developer, `api`, 90 days advised, 365 at most) created by the administrator, never sent with the configuration link.
`core.safecrlf=false` on the hardened git only silences line-ending warnings.

**146. § 10.36, one GitLab project token per pilot (6bd060c0f, 804e1992f, 22d126964) — acceptable.** The conditions
given before the code are kept: a project access token per pilot, named by the trigram, Developer role, `api` scope (the
transport writes through the API), an expiry (90 days advised, 365 at most), the data branch open to Developers without force
push, revocation explained. “Add a pilot” checks the trigram (`^[A-Z0-9]{2,5}$`) before anything, builds the
configuration link and the message without the token (sent apart, by another channel), and links to the pilots' tokens
screen, which only pre-fills its trigram field from the address after the same check. Join calls `whoami()` on the
configuration's instance before accepting the token: a personal token (`bot` not true) is a question whose “No” writes
nothing (a warning in the Access card, for the user alone with their own repository), a missing or too distant expiry and
scopes beyond the repository's are warned; the field is emptied after saving and nothing is logged.

**147. Group of 1 November morning (822a0ffbb, ccb66b466) — acceptable.** A 403 or 404 on an optional openAIP export is
“absent” through outbound's existing `absent_ok`; 5xx, timeouts and unreadable answers stay failures. The absences
are kept per AIRAC cycle in `tools/.openaip_absent.json`, a file of the workstation ignored by git and never in `data/`,
written atomically by the launcher from names the code builds (country code and a layer of its closed list); on reading,
only names matching `^[a-z]{2,3}_[a-z]{3}$` of the same cycle are kept, used only to skip a request, never as a path. The
second commit changes texts only.

**148. The administrator's GitLab token from the screen (ceda4da6c) — to fix.** `GET` and `POST /__setup/gitlab/admin`
are for this workstation only (`do_POST` applies the LAN and relay gates and `_allowed()`, so another origin is refused);
the instance must be `https://` with a plain host, the project `group/project`; the fields go through `SECRET_FIELDS`; the
data remote is read without its user part; calls use the no-redirect opener and the refusal message is truncated with the
token masked; the value is never returned. To fix: an empty token means “unchanged” even when the instance changes, so
a request with a new instance and no token stores it with the former token, which the test then sends to that host at
once; the rule of 4 and 102 (a token is worth only its own target) asks to refuse a changed instance without a new token.

**149. The point of 148 fixed (ca9e23445, 01b6f511f) — acceptable.** When a token is stored and the instance given differs
from the stored one (compared in lower case, without a final slash) with no new token, the save is refused
(`token-required`) before anything is written or called; another project of the same instance keeps the token.
`GET /__setup/gitlab/tokens/count` (this workstation, `_allowed()`) returns only a number of active pilot tokens.

**150. Group of 1 November noon (7272b0414, 9d0700ad3) — acceptable.** One enrolment path: “Add a pilot” gives the QR
code, the link and the file of the same configuration (the export unchanged, without `api` or token), and Join is the
pilot's only entry. The QR code is read by the phone's own camera, which opens the link: the suite asks for no camera and
the configuration goes through the same `validate` (119) as a pasted link or a file. The administrator's assistant card
only reads (`secrets`, which returns indicators only, and the pilot tokens' count) and links to the existing cards.

**151. Group of 1 November afternoon (6b90f3463) — acceptable.** The token just created is shown alone in a read-only
field with “Copy”, escaped into its `value` attribute (as it was escaped into a `<code>` before), never in the address,
the journal or a `data-*` attribute, and gone at the next drawing; the list of existing tokens carries only the trigram,
dates and state. The other commits of the group have no surface (build cycles, texts, a test case).

**152. Opening the data branch to Developers (c6f3bc38b) — to fix.** The route is for this workstation only, after a
question; the branch name is encoded; the token never goes into a body. To fix: (1) `allow_force_push` applies to everyone
allowed to push, so adding a Developer push rule (or recreating the protection with the former `allow_force_push`) gives
force push to the pilots' tokens when it was allowed to Maintainers; § 10.36 asks for no force push, so the opening must
set it off and “open” must require it off; (2) an unprotected branch is counted as open although a Developer can then
rewrite or delete it: protect it instead (push Developer, merge Maintainer, no force push); (3) in the fallback (delete, then
create again), the restoring create is not checked, so a double refusal leaves the branch unprotected without saying so;
check it and report it clearly. The short window without protection is unavoidable on the free tier and acceptable, as is
the default unprotect level.

**153. The points of 152 fixed (d74d4431d) — acceptable.** “Open” now means protected, push allowed to Developers and
force push off. Opening sets `allow_force_push: false` (alone when Developers already push); an unprotected branch is
protected (push Developer, merge as before or Maintainer, no force push); in the fallback, a refused new protection puts the
former one back and checks it, and a double refusal returns `unprotected` with a clear sentence and a line in the
launcher's log. The default unprotect level is noted in DECISIONS.

**154. Group of 1 November evening (c78b26df4, f3d4e82a9, eb9111d3f, 40532a1cc, 946881d5f) — acceptable.** The bound of
129 now covers aircraft, procedures, VFR, cities, publication and listings: at the bound the answer is “nothing”, the
shared read is abandoned, nothing built after a fallen bound is kept and an empty answer is never remembered as true. The
read before a write stays unbounded, rightly: a bounded read that gave up would let a write replace a file that was never
read. Fuel bounds its waits for the registry and the current flight; the Map's commits are canvas and a map base that reads
and writes nothing; the assistant only reads the branch state of 153.

**155. Where the administrator's token is set (57f581209) — acceptable.** `GET /__setup/gitlab/admin` (this workstation,
`_allowed()`) adds `where`: whether a token is set and when, the instance's host alone when the stored instance matches the
`https` pattern, the project path when it matches `group/project`; never the value. The screen shows it through
`textContent`; the secrets listing stays blind.

**156. The airline's logo (02538ab1a) — to fix.** The file is named by `airline/settings.json` under a strict pattern
(`airline/<name>.png|svg|webp`), read through the transport (same token, same host), 512 KB at most, its type recognised
from its first bytes, never an external address and never inserted as HTML. To fix: an SVG shown through a `blob:` address
is harmless inside `<img>`, but that address belongs to the suite's origin; opened as a document (“open image in a new
tab”, a long press on a phone), the SVG runs its scripts there under the suite's policy, whose `script-src` allows inline
code, and can read the device's tokens in IndexedDB. Since § 10.36 every pilot's token can push to the data repository,
so any pilot (or a stolen token) could plant such a logo for the whole airline. Rasterise the SVG to PNG on a canvas before
showing it (and revoke the SVG address at once), or accept PNG and WEBP only.

**157. The point of 156 fixed (a9d29f446) — acceptable.** The logo's path accepts only `.png` and `.webp`, and the type
is taken from the first bytes (PNG or RIFF/WEBP), so an SVG is refused even under a `.png` name; a file over 512 KB or that
does not decode is refused, said once to the administrator. No `blob:` address of type `image/svg+xml` is created any more;
the tinted plane of the browser tab stays a `data:` address built from the suite's own file (an opaque origin when opened).
Rule kept for every file of the data repository, which any pilot's token can write since § 10.36: treat it as written
by any pilot.

**158. Rule 157 applied (4ac930efa, a15c17d0a) — acceptable, one note.** The mission registry's `folder` and `files[0]`
were joined into a read path as they stood (`../pilot/…` was possible): they now pass `SEGMENT`
(`^[\p{L}\p{N}_][\p{L}\p{N}_.-]*$`, so no `.`, `..`, separator or empty segment), 200 and 120 characters at most, a `.yaml`
or `.yml` name; the default `mission<id>.yaml` goes through the same test, so an id with a separator is refused too, and
Fuel and the Missions module say “path refused” instead of reading. The Site module's page link was built from
`airline/settings.json`; it now goes through `new URL`, accepts `http(s)` only without a user part, and is escaped in `href`
with `target=_blank rel=noopener` (a `javascript:` link is gone). The second commit has no surface. Note: the `site` host of
`airline/settings.json`, which any pilot's token can now write, is allowed by the frame as an `https` `GET` target and is the
source of the log and fleet imports; show the host in the import's preview so a change of site is visible.

**159. Review of 10 November (before the refactoring day) — acceptable, four notes.** *Upload.* `POST /__setup/base/upload`
is declared for this workstation only; `do_POST` applies the LAN and relay gates and `_allowed()` before the stream branch, so
a LAN device or another origin never reaches the handler, and the body is read in a stream (never in memory), 1.5 GB at most,
into a temporary file of `data/local/upload/`. The file is recognised by its content (a zip by its member list, a JSON by its
first sign, a PDF by its signature); the stored name is built only from regex groups (a date, a closed month list, `AIP|OBS|UAS`,
two letters and a fixed layer), never from the page's name or any path, and the hint is reduced to its last component. The
NASR and UK Mil fallbacks read those canonical names back with the same size caps as a download, and the TLS fallback only
adds a message and the deposited PDF: no certificate check is weakened. *Little Navmap.* `proc/lnm` opens the SQLite base
read-only and immutable from the launcher's own folder (never a page path), with closed arguments and parameterised SQL;
the procedures stay in the page's memory, the route is refused to LAN devices. *Esri.* One exact host is added to
`connect-src` for one page path only (a user decision). *Relay.* Two slots per host, four in all, and a deadline on a
successful body. *Repair tool.* It rebuilds the literal from strictly parsed base64 values, checks the result with
`data_guard` (whose line terminators include U+2028) and writes only with `--write`, keeping the original. Notes: (1) the
SQLite URI does not escape `%`; (2) no filter on `lnm` records was found in the FMS/PLN exports or in what a flight saves,
so the “never exported” promise needs checking (a licence question); (3) `zipfile.ZipFile` reads the whole central
directory before the `MAX_MEMBERS` test, and the upload handler lacks the `_lan()` refusal the other handlers repeat; (4)
the relay's error body (`e.read(NET_MAX)`) has no deadline, so a slow-dripping error body from an allowed host holds a slot,
and the four slots are shared between the workstation's own page and paired devices.

**Settled on 11 November (AeroDB, one commit and one red case each):** note (1) — the whole path of the SQLite URI is quoted (`%` first), K167; note (3) — `recognise()` reads the count and the size of the directory in the end-of-directory record (zip64 record included) before building `ZipFile`: over `MAX_MEMBERS` or `CD_MAX` (64 MB) it answers `unrecognised`, and `_post_base_upload` repeats the `_lan()` refusal, K168; note (4) — the body of an error answer of the relay is read by `_read_capped` under the deadline of the relay (one raw read at a time, `read1`: `read(n)` waits for n bytes), the status kept, and one of the four slots is the page of the workstation's (the guests — a paired device, the company relay — hold three), K169; and SOG-0238 (a page code could declare the personal-use tick, `personal: true`) is closed for `proc/lnm`: the launcher holds the tick itself (`data/local/personal_use.json`, `POST /__setup/personal`, K147 and K173), with its limit said (a script of the same origin can call the write route); `base/fetch` still takes `personal: [sources]` from the page.

**160. Little Navmap records stay on this device (4eaf79a59) — acceptable, one note.** Note 2 of 159 is closed for positions.
`pubProcs` turns every record with `status: 'lnm'` or `lnm: true` into `null`; `knownPoints` and `autoAirways` read the chosen
procedures through it, so a typed point no longer takes the position of an lnm point and nothing of it reaches
`route.points`. `exportFms` gives the writers `pubFlight` (a `structuredClone` of the procedures without the lnm identifiers,
so the SID / STAR / APP names leave the file too), `expandedPath(f, pub)` and the filtered `procs`, and says in one line what
was left out. The lists no longer label an lnm record “X-Plane, local”. The new case F143 types an invented point and
checks `current_flight.json` and the `.fms`. *The Map's Edition* cannot take such a point: its anchors are the layers' own data
(navaids, aerodromes, airways, points, VRP), never `S.procs`. Note: `fpNow`, `procsToText` and `procGroups` still read the
unfiltered records, so identifiers (the SID name, its exit and entry, `quote.legs[].id`) and aggregates (`quote.distanceNm`,
`profile.path`) derived from an lnm geometry are written to `data/`; never a latitude or a longitude (the readers rebuild a
planned position from their own path), and F143 covers the typed route but not the text `procsToText` writes. Whether names and
aggregates count as “read from Little Navmap” is the user's licence decision, with the export of those points to the
simulator.

**161. “Read from Little Navmap” in Fuel (d4e807cdf) — acceptable, one note.** `readLnm` takes only an ICAO checked by
`^[A-Z0-9]{4}$`; it reads `cache/data/personal.json` through `ctx.data` and applies `keptPersonal` (a pure module, no state,
no page: only a boolean `certified` or a known source id counts, anything else means “not certified”), and without the tick
it says where to tick it and starts nothing. With it, the call is `aerodb.fetchLnm(icao, { personal: true })` and nothing else:
no path, no option from the page; one airfield at a time (`lnmReading`). A paired device is refused by `fetchLnm` (`paired`),
and the launcher verb stays refused to LAN devices. The reason shown comes from a closed table or a `^[a-z-]{1,30}$` code, the
count is clamped, the label goes through `esc`. `admit` never proposes an lnm record by default. The widening of the module's
reach is one file, read only (`meta.reads` gets `cache/data/personal.json`; `meta.files` two pure modules for offline use);
Fuel never writes it, and `ctx.launcher` is not used, so the module's launcher declaration is unchanged. Note: the tick is a
declaration of the user in the page, not a check by the launcher (`personal: true` is accepted from any page code of the
workstation); it is the same level as before, and the licence promise rests on the paired-device refusal and on the records
staying in memory, so a launcher-side read of the tick would be the stronger form if the user wants one.

**162. Review of 11 November — one to fix, the rest acceptable.** *Notes of 160 and 161 decided by the user.* Names and totals of
a Little Navmap procedure may go into `data/` and the simulator files may carry the procedure (“everything that comes from the
base can go to the simulator”): `exportFms` now passes the unfiltered records, and the file is a local download (`download`),
never a write; `pubProcs` stays on the two paths that can write a position into the flight (`knownPoints`, `autoAirways`), and
F143 still holds “no latitude or longitude in `data/`”. *`recette/decision`.* Same guards as `recette/verdict`: a launcher job,
workstation only, closed arguments (`check`: `get`, or `set` with `items` and nothing else, 1000 entries, keys of 20 characters
at most), then per entry an identifier `Q-nnnn`, a choice 0 to 9 or none, a text of 600 characters without control characters,
an ISO date; a bad entry refuses the whole `set` (`bad-items`) and writes nothing; the path is fixed
(`organisation/DECISIONS_REPONSES.json`), written through a `.tmp` and `os.replace`; `get` discards what is not to the rules and
a file over 2 MB. The generator reads that file as untrusted (`clean`: control characters out, lengths bounded, a choice kept
only inside the options) and the screen escapes every text with `esc`. Minor: `\d` without `re.A` in `recette.py` accepts
non-ASCII digits in an identifier (no path is built from it). *Clean-up of the deposits (`upload_cleanup.py`).* It lists the
folder `data/local/upload/` only; a name must match one of three anchored patterns (`\Z`, ASCII) so no separator or `..` can
come out of it, a directory, a link and a transfer in progress (`.recv-….part`) are never touched, an incomplete NASR set
never counts, and `os.remove` takes the joined name, never a path of the page. **To fix:** for `us`, the cycle read comes from
the `issue` of `data/sia/geojson/faa_nasr.geojson`, a file of `data/` that any pilot's token can now write (or a bad fetch can
leave); only the format is checked. Proved on a scratch folder: with a deposited set of 10 Sep 2026 (current cycle 29 Oct), the
real `issue` removes nothing, a forged `issue` of 2099-01-01 removes the three files. Only local, canonical, re-downloadable
files are at stake, and nothing outside the folder, but it is the rule of 157: take the `issue` as untrusted, for instance never
later than the current cycle (`read = min(issue, current)`), with a case that fails without that bound.

**163. The tick held by the launcher and the fixes of the notes — acceptable, one to fix.** *The tick (3dcc5e780).* `personal_use.py`
writes `data/local/personal_use.json` (never served, synchronised or committed) through `POST /__setup/personal`, declared for
this workstation only and refused to a LAN device or the relay on both routes; the body is strict (`{ certified: bool }`, or
`{ certified: true, migrated: true }` once, 409 when the file exists), the write goes through a `.tmp` and `os.replace`, and
`proc/lnm` reads that file and ignores the `personal` of the page. A change is said on the console. The limit stated by AeroDB
stands: a script of the same origin can call the write route, and `base/fetch` still takes `personal: [sources]` from the page.
*Note 1 of 159 (a5f6dd6ab).* The whole path is percent-encoded in the SQLite URI (`%` included). *Note 4 (d69a96d8c).* The error
body is read under the relay's deadline with `read1` (one socket read at a time), and one of the four slots is kept for the
workstation's own page (guests, a paired device or the company relay, hold three at most). *Note 2 of 162 (607dc8819).* A read
cycle later than the current one never says “the current cycle is built” (b) and is capped for (a); what a forged `issue` can
still do is remove a deposit older than a newer deposit, which the rule already treats as superseded. **To fix, note 3 of 159
(6606df07c).** `_directory` reads the zip64 record at a fixed place, 76 bytes before the end record, whereas `zipfile` follows
the locator's offset and accepts “extensible data” between the record and the locator. Proved on a scratch file of 70,000
entries with 100 bytes of extensible data ending in a forged record of one entry: the helper says 1 entry, `ZipFile` reads
70,000; with more than 200,000 entries the check passes and the directory is loaded whole. Local file chosen by the user, memory
only; fix: follow the locator as `zipfile` does, or refuse a zip64 locator whose record is not just before it, with a case that
fails without it (more than `MAX_MEMBERS` entries, forged record in the extensible data).

**164. The zip64 directory check follows the locator (5fe013431) — acceptable, the point of 163 closed.** `_directory` reads the zip64
record at the offset the locator gives and at the fixed place just before it, keeps the larger count and size of the two (`zipfile`
follows one or the other according to the Python version), and refuses without opening the archive a zip64 whose record is found
in neither place. The scratch file of 163 (70,000 entries, 100 bytes of extensible data ending in a forged record of one entry)
now gives the real 70,000 from the helper; K168 carries the same shape and was red before.

**165. Review of 12 November — two to fix, one to harden, the rest acceptable.** *Acceptable.* `tools/iso9660.py` never writes and
never extracts: a path of the image is only a dictionary key, every extent is checked against the image size, and the depth (12),
the entries (50,000), a directory (4 MB) and a file read (32 MB) are bounded; 20,000 random mutations of a small image gave only
`IsoError`, and a directory that points back at itself stops at the depth limit. The NASR subscription is recognised by a name
pattern (`\Z`, ASCII) AND by its content (`CSV_Data/…_CSV.zip` and `FIX.txt`), the canonical name is rebuilt from the date, and
the inner zip is read in place under `INNER_MAX`. `base/publish` takes a zone checked by `^[a-z0-9_-]{2,12}$` and a trigram checked
by `^[A-Z0-9]{2,5}$`, the plan runs read-only git commands with fixed arguments and never names a user file, and the push is the
“Synchronise” gesture (one push carries every unsent commit, said in the plan). `base/cycle` and `base/last` are read-only and
take closed arguments. The release route is for this workstation only and kills only the processes the job itself declared
(`track`), after five silent minutes. The persistent journal keeps four verbs, trims depth, lists and texts, and runs the texts
through `clean_error` (no secret, e-mail address or session parameter) and the data path; it lives in `data/local/`. `zipmember.js`
bounds the entries, the directory, the member (announced and actually read: a bomb is cut at the announced size) and checks the CRC;
nothing is written or sent from it. *To fix 1 (proved).* `aero_fetch.eaip_manual` opens with `zipfile.ZipFile` every `.zip` up to
1.5 GB of the Downloads folder, whatever its name, before any count of entries: a scratch zip of 250,000 entries (21 MB, above the
`MAX_MEMBERS` that `base_upload` refuses) takes 138 MB of Python memory, so a hostile zip of 1.5 GB with tens of millions of
entries would take several GB. The same unguarded opening is in `eaip_annexe15.read_package` and, for files picked by their name,
in `base_sources` (pickup) and `base_state`: one helper that applies the end-record count of `base_upload._directory` before every
`ZipFile(path)` on a file we did not write. *To fix 2 (proved).* The FRA archive branch of `recognise` has no cap on `take`: a zip of
500 distinct names of the current cycle (84 KB) gives 500 members, each written to `data/local/upload/` up to `TAKE_MAX` (32 MB),
i.e. up to 15 GB from a deflated archive; a real archive has one or two per cycle. *To harden (measured).* An ISO inside a deflated zip
member is read through `ZipExtFile`, whose backward `seek` restarts the decompression: 0.39 s per far read on 80 MB, so about 5 s on
1 GB, and the ISO path has no cap on the number of ENR pages (`PKG_MAX_FILES` applies to zips and folders only), all under the
launcher's “busy” lock; cap the pages (a few hundred) or copy the member to a temporary file first. *Notes.* After `release`, the
abandoned thread is told to stop but nothing proves that a verb stops writing to `data/` once `job.released` is set (the check is only
on its result); and `_trim` cleans the values but not the keys, nor the non-text values turned into text.

**166. The zip guard, the FRA cap and the ISO page cap (24144e4c4) — acceptable, two notes.** `tools/zip_guard.py` keeps the end-record
check of 164 (locator offset and fixed place, zip64 included) and `open_zip` applies it before `zipfile` builds the directory;
`aero_fetch`, `eaip_annexe15`, `base_sources` (pickup), `base_state`, `lfv_eaip` and `faa_nasr` open through it. The scratch zips of 165
now give: 250,000 entries refused with “trop de membres”, the Downloads scan returns nothing in 0.0 s instead of 5 s and 138 MB; the FRA
archive of 500 names is refused (`FRA_TAKE_MAX` = 6); the ISO path stops at 2,000 ENR pages and at four times `PKG_MAX_FILES` files.
Notes: (1) the case K195 checks the refusal, not the memory, which is enough since the refusal is before the directory is built;
(2) a few older openings are still direct, `launch.extract_data` and `proc_cifp.lines_of` (both call `zip_check` after the open) and the
inner zip of the NASR subscription (bounded by `INNER_MAX`), so they could go through `open_zip` too; and 2,000 pages in a deflated
member is still hours in the worst case (about 5 s per far read on 1 GB), a few hundred would be nearer to a real eAIP.

**167. The follow-ups of 166 — acceptable.** `launch.extract_data` and `proc_cifp.lines_of` open through `zip_guard.open_zip` (the guard's
`BadZipFile` is already caught by `extract_data`); `ISO_MAX_PAGES` is 600 (both real Portuguese eAIP still read); the FRA archive takes two
workbooks at most; the ISO pages are read under a total time of 90 s, the bound said when it plays.

**168. The French aircraft register reader (7c6ec44ae, f6f5874d9, acac33c67, bcb60f834) — one to fix, fixed.** The export has 13 columns, eight of them
third parties (owner, lessee, creditor, the person who entered it, and their addresses). `registry_fr.derive` takes five columns by header
name (an allow-list), refuses a header where an allow-listed name is repeated (`names.index` would take the first one, so a third-party column
renamed before the real one would pass), writes only `data/local/registry/fr_immat.json` and removes the original and its temporary file
whether the derivation succeeds or not; every refusal is a code (`size`, `headers`, `line`, `rows`, `empty`, `read`), never a line. Probed on
a copy of origin/v3 with a witness in each of the eight third-party columns, in a quoted field with a newline, in the file name and in the
header lookalikes: no witness in the derived file, the answer, the console, the files left on disk or the persistent journal; the synchronisation
(`data_sync.run`) tracks nothing of `local/` (`:(exclude)local/**`, and every `git add` of the launcher has explicit paths). The verb
`aircraft/registry` answers `reg`, `maker`, `model`, `serial`, `base` only. **To fix (proved, fixed in f6f5874d9).** The allow-list was not
enough: `CONSTRUCTEUR` holds the names of natural persons, the amateur builders (on the real export, 2,276 of 43,260 rows carry a value that
appears once, nearly all of the form “SURNAME FIRSTNAME” on the sample read). The maker is now kept only when at least ten distinct
aircraft carry it (first five in f6f5874d9, ten in acac33c67 and bcb60f834 by the ergonomist's decision), counted in a pass before writing; otherwise it is empty (the screen says “constructeur non précisé”); ten CESSNA and a
builder with two aircraft give CESSNA kept and the builder's name nowhere (file, verb by registration, by type, by word). *Trade-off, settled.* At five,
405 makers of the real export passed, about ten of them individuals with five to eight aircraft; at ten, 293 makers are kept and the real brands are untouched. *Sampled.* The values
seen once of `MODELE` (166 of two or three alphabetic words), `AERODROME_ATTACHE` (144) and `NUMERO_SERIE` (none of that form) were read by hand: no
natural person's name (designer surnames inside type names, communes, fields, a few “lieu-dit”), so only `CONSTRUCTEUR` is thresholded. The original `export.csv` stays in the user's Downloads, which the suite
does not touch.

**169. The Data screen rebuilt, `sendNow` and the version guard — acceptable, two notes.** *Text into markup.* Read by sinks: the module builds
text first and escapes at the HTML boundary (`esc(...)` on every label, reason, `why`, `refused`, file name seen in Downloads (cut to 120
characters), `partNames` (control characters removed, 40 characters, 12 names), `from`, the busy card and the journal); the numbers that
reach an attribute or a style go through `num` / `Math.round` (`progress`), the SVG path data are made of finite numbers only (`pathOf`).
A dynamic probe backed this: every free-text string of the launcher's answers in the 98 Data cases carried a payload that calls
`/__pwn?k=<field>` if it is ever taken as markup (the same payload injected by hand did call it): no call. Its reach is limited (the payload
was shown as text in a handful of states, because tainting free text breaks many flows), so the reading is the main evidence.
*Links.* Catalogue and `where` addresses become a link only through `isHttps` (`^https://[^\s"'<>]+$`), escaped in `href`, with `target=_blank
rel="noopener noreferrer"`, otherwise written as text (a `javascript:`, `data:` or `http:` address is never a link). *Page to launcher.*
Every call goes through the frame's `ctx.launcher` client (declared routes; 403 without a call for any other), the upload name is an encoded
hint of 200 characters, `base/publish`, `base/fetch`, `base/build`, `base/pickup` and `base/cycle` keep their closed arguments on the
launcher's side (zone identifiers by pattern, bounded lists). *`zipmember.js`.* Read in the earlier pass: bounds on the entries (200,000), the
directory (64 MB), the member (128 MB, announced and actually read: a bomb is cut at the announced size), zip64 followed through the locator
and checked, CRC-32 verified, nothing written or sent from it. *The reads loop (90a3d43bd).* A read the launcher refuses as “busy” is tried
again twice at once and then at most every 4 seconds per kind of read (`tries`, `at`): no tight loop. *`sendNow` (03a8c1813).* It applies the
same `allowed(path)` guard as `put` to each path before anything is sent, so a module sends only its declared writes. *Version guard
(d303565f8).* A remote revision counts as “own” only when it equals one of the ten last revisions this browser pushed (at most 200 paths):
content-addressed, so it is that same content coming back; a different remote version is still a conflict. Notes: (1) the selectors
`[data-zone="${z}"]` of `countries.js` (two places) take the identifier without `CSS.escape` (the neighbouring ones use it): a hostile
identifier would raise a selector error, not inject anything; (2) the dynamic probe is a probe, not a case: a permanent case would taint the
fields one family at a time to keep the flows alive.

**170. The evening of 12 November — acceptable, one to harden.** *Direct to a point.* `#fuel?direct=<ID>&lat=&lon=` is consumed once; the name must
match `^[A-Z0-9]{2,11}$`, a position from the address is used only if finite and within ±90 / ±180, the plan is only shown (nothing is written
until the pilot presses the button, with a second question when a mission point is skipped), `direct.js` is pure and every text of the panel
goes through `esc`; `route.directs` keeps 20 entries, the report's observations are bounded (40 characters per name, 20 names). *ATIS.* Two fixed
feeds; only the callsign, the letter, the time and the text lines of the aerodrome asked (`^[A-Z0-9]{4}$`, built into the pattern) are read, the
text is never shown (a runway the aerodrome has, a letter, a time), an ATIS older than 90 minutes is dropped, and the result is a suggestion the
pilot takes by a button; the six phrase patterns run in 2.5 ms at worst on adversarial texts of 4,000 characters (no catastrophic backtracking).
*Route text.* `runwayOfWord` / `withRunways` use anchored linear patterns and touch only the first and the last word. *Timing record.*
`cache/fuel/route_timing.json` and “Copy the diagnostic” carry milliseconds, the instant, the action and `dep → arr`: no address, no token, no
other route data. *Data, second push.* The added interpolations go through `esc` or come from the closed lists of `datasetsOf`; no link or call
added. *SIA / PDF parsers.* Same patterns as before (anchored, bounded). **To harden (proved).** `proc_pdf._glyphs` reads `/g(\d+)` and calls
`int()` on the digits: a fragment with `/g` followed by more than 4,300 digits raises `ValueError` (probed: 5,000 digits), which nothing in the
list comprehension catches, so the page's reading stops; the same family: `Radius` takes `\d+[.,]\d+` and `float()` of a 400-digit number is
`inf`, which `json` writes as `Infinity`. Only a hostile or corrupt PDF reaches it (the user's own deposit, or an official file), and the effect is
a failed zone, not an injection; take `/g(\d{1,3})` and bound the radius. *Note.* `route_timing` copies `route.dep` and `route.arr` as they stand
(flight data written by any device): cut them to 12 characters.

**171. The glyph-name digits and the radius bounded (3799bd678) — acceptable, the point of 170 closed.** `GLYPH` reads `/g` and at most three digits not followed by another digit, so a fragment of 5,000 or 100,000 digits is left as it stands and nothing raises (the probe of 170 now passes; 200,000 glyph names still decode in 0.12 s); the radius of an RF leg is read as `\d{1,2}[.,]\d{1,3}` and kept only in ]0, 50] NM by `_radius()` (a 400-digit number, 99.9 and 0 give no radius, never `inf`), the navigation precision is bounded the same way, and a leg without radius stays in doubt. K215.

**172. The DIRCAM lot of the Data screen (1eafcd087) — acceptable.** The page reads one member of the SIA zip on the device and sends only a PDF. The member name is compared exactly (`name === wanted`, no path built from the archive: a traversal look-alike or a name in a sub-folder is `no-member`), the sent name is the last element and must match `DIRCAM_PDF_NAME` (`^MIAM_OACI_ENR 5\.7(?: \(\d+\))?\.pdf$`, so no `..`, no folder, no second extension), the content must begin with `%PDF` (checked on the member before anything is sent), the size is bounded before any read (an announced size above 128 MB, or a real stream larger than the announced size, is cut: probed on scratch zips, a 200 MB deflate bomb announcing 1,000 bytes and a 300 MB announce are `too-large` in about a millisecond, two members of the same name are `corrupt`) and again by the launcher's ceiling on the blob sent. The launcher's answer is shown after `esc`: the returned name is stripped of control characters and cut to 120, the cycle must be `\d{4}-\d{2}-\d{2}`, the zone message lines go through `esc` (`zoneMsgHtml`), the Downloads name is cut to 80. The new todo lines and the remaining selectors are escaped (`esc`, `CSS.escape`).

**173. `current_flight.airline` (a2bb9cfc4, SOG-0041) — acceptable, one functional note.** The field travels between devices and any pilot's
token can write the data repository, so it is an untrusted input that picks the company whose families the report offers. *Writer.* Fuel
copies `a.code` of its own current company only if it matches `^[a-z0-9]{2,8}$`, and only when the flight is not pending. *Reader.*
`flightAirline(cf)` takes a string matching the same pattern, different from the current company, **and** present in the airline index
(`FrameData.airlines()`); anything else gives `null` and the report behaves as before. The folder is built from the code alone
(`airline/<code>/`, `airline/` for `default`, the pilot's own `pilot/<trigram>/airline/perso/` for `perso`): the pattern leaves no `/`, `.`
or capital, so no path leaves the data folder. `settings.json` is read as an untrusted object and only its `kind` is kept, through
`kindOf` (closed list `va | sog | perso`); the name is cut to 60 characters, then to 40 and escaped by `airlineText` / `esc`. A probe fed
the field with `../../x`, `aaa/../bbb`, `AAA`, `zzz` (unknown), `default`, `12345`, an object and an array: eight times the heading stayed on the
device's company, no error; `perso` shows “Personnel”. *Effect.* The worst a hostile writer obtains is a
report whose heading and family list name another existing company, shown in the heading before the pilot saves (it is the same reach as
writing the flight's route or aircraft). *Note (not security).* `S.flightCo` is cleared on save and replaced at each press of “Vol en
cours”, but not when the pilot opens an already saved report afterwards: the heading and the saved record keep the report's own company
(`S.saved` first, `prev.airline` first), yet `loadCategories` would offer the families of the earlier flight's company until the next press.
Case G20 and N42 green; no counter-test needed.

**174. The night of 13 November — acceptable, two notes.** *Weather layer (163722b25).* `wx.js` posts the drawing of Weather's library
(`weather_map.js`, unchanged, no `innerHTML`, no network call) on the map and writes one line under the box: its two values are the level
(`formatLevel` on a rounded number, text) and the hour (`fmtZ` on an ISO string built from a finite number of seconds: `depTime` is always finite,
`etaOf` is parsed with `Date.parse` and checked), the whole line goes through `esc`, the only link is the constant `#atmosphere`. The Map hands
the library a facade whose `grid` is forced to `cacheOnly: true` and whose `world` answers `null`. A probe fed the kept forecast with strings
(one of them an `onerror` payload), `1e308`, `-1e308`, `null`, an object, an array and a boolean in a fifth of the values and in `elevation`:
state `ok`, no page error, no request but the page's own code; the flight's level and departure time set to `1e300`, `-5`, `"abc"`,
`+275760-09-13`, year 1 and a normal value, then `wxSync()`: no error either. D194 (zero outgoing call when ticked) green.
*Store (01b1538f8).* `cacheOnly` reads `knownRun` (memory, then the reserve's `meta.json`, never the network) and a plan that misses anything
returns `null` before any fetch; an unknown run gives the 30-minute blind validity, a known one is still bounded by the file's own age
(`RUN_TTL`, 6 hours) and, for a stale `meta.json`, by that same age. A forged reserve is the device's own cache (not the data repository), so it
reaches nothing a local writer could not already reach; A25 holds both the empty-reserve and the warm-reserve cases. *Registry (db091c505).*
Every field of a line comes from `readRegistry` (strings, `clean`ed; the path through `safeFolder` / `safeFile`) and goes into markup through
`esc` (identifier, title, `second`, `detail`, the path of a line and of a mission found in the repository, the option values and labels of the
family filter) or a closed set (`data-rstate`, `data-kind`, the numeric `data-rid`); the sign is a constant glyph; the path is shown as text and
never made a link or a call; the new sort uses numbers (`+series`, finite or `1e9`) and `row.id` (a string). The 60-row cap bounds the page.
*GeoNames (0114f9cdb).* 1,561 rows added (PT 1,025, IE 536), parsed as a CSV: six columns everywhere, names of at most 27 characters with no
control, bidirectional or markup character and no leading `=+-@`, latitude/longitude in range, integer population 500 to 517,802, integer
`geonameid`; K217 holds the same bounds, and the consumers already render 71,000 such names. *Data map (6889a1d7b).* The hover reads
`data-zones` of the page's own markup and passes each identifier through `CSS.escape`; the wheel only changes a viewBox. *Mock-up
(7c3b8e4bb).* A static page: no external address, no form, one inline script that builds markup from constants and `location.hash` read as a
key into a fixed list; nothing links to it. **Notes.** (1) The reader of the registry cuts no title or identifier (`clean` only collapses spaces),
so a very long title is a heavy line, not an injection (the line is one `nowrap` ellipsis); cut them to 120 characters in `readRegistry` when
convenient. (2) In `regLoad`, beyond `REG_READ_MAX` (500 files) a line is marked `ok` without having been read although the comment two lines
above says “never there without having read it”: an integrity wording, not a security one (older than this commit).

**175. Little Navmap export and the report's company — acceptable.** *Export (e6811d642).* The claim “no path takes the content of a
`.lnmperf` into a sheet outside the preview of Aircraft” holds, read branch by branch of `run(reason, exportOnly)`. With `exportOnly` set:
(1) a linked file whose sheet is gone and whose digest changed is only listed (`changed`), the `importFile` branch that follows is unreachable;
an unchanged one is moved aside by the launcher (no content read); (2) a linked file with its sheet and a changed digest is listed, the `merge`
branch is unreachable, and a file whose sheet alone changed is rewritten (a write, no read); (3) every file not in the manifest is listed and
skipped, so neither `read(name)` nor `importFile` nor `merge` is reached; (4) a sheet without file is written unless a file of that name
exists in the folder (compared without case), so no existing file is overwritten but the unchanged one of (2). The only callers of the two-way
`sync()` are `start()` (timer, after-sync, folder), which `aerodb.js` calls once under `lnmAuto`, off by default and held by a case, and the
bench. Names shown on the card come from the launcher's list, cut to twenty and passed through `esc`, as the error names. The launcher is not
touched by the commit. K218 (a changed file and a file alone are listed, none enters a sheet, the file named like a sheet is not overwritten)
green. *Report (fec39491b).* `loadCategories` takes the opened report's company through `airlineOfCode` (the same pattern
`^[a-z0-9]{2,8}$`, present in the index, folder built from the code), `savedOf` having checked the code and the kind of the saved report (a data
file); a code the index no longer knows gives `{ code, kind }` without a folder, so the common base and never another company's families; the
folder or the settings of a company are read exactly as in 173. G21 green; no new input, no new sink.

**176. The registry reader bounded, “not read” beyond 500 files (81148257a) — one defect to fix.** *The limit (fine).* Beyond
`REG_READ_MAX` the lines get the status `notread` (sign `?`, last in the order, “500 files read of N” in the count); `planOf` leaves them out
of `noFile`, so the plan never offers to drop a line nobody read; the status is a closed key, and the text goes through `esc` as before. *The
bounds on titles, operations, origins and destinations (fine).* 120 and 80 characters at the reader. **Defect (proved).** `readRegistry` now cuts
the identifier to 12 characters (`reg = clean(x.id).slice(0, 12)`), but `planOf` and `applyPlan` still compare it to `cut(e.raw.id, 40)`.
A line whose identifier has 13 to 40 characters and whose folder name is not of the mission form (`X-001A`, the form that wins over the
registry's identifier) is therefore classed as a “former identifier”, and **applying the plan rewrites its identifier to the first 12
characters** (the old one goes to `formerId`); two such lines that share their first 12 characters become “duplicates” and **the second is
removed from the registry** (`splice` in `applyPlan`). Probed on the real modules (`planOf` / `applyPlan` on four lines: `X-001A`, a 20-character
identifier under `X_CO/old2`, `AAAAAAAAAAAA1` under `X_CO/old3`, `AAAAAAAAAAAA2` under `X_CO/old4`; every status `ok`): plan `former [1, 2]`, `dup [3]`;
after applying: identifiers `ABCDEFGHIJKL` and `AAAAAAAAAAAA`, the fourth line gone. The plan is shown before anything is written and the pilot
confirms it, so this is data loss on confirmation, not a silent one; and any pilot can put such a line in the registry (every line is untrusted
input), which makes the proposal a lure. Not raised by case N44 (it bounds the reader, it does not run the plan). Counter-test to add (red
today): a registry of two lines with identifiers of 14 characters sharing their first 12, folders `X_CO/old1` and `X_CO/old2`, files present;
`planOf` must give `former: []` and `dup: []`, and `applyPlan` must leave both lines as they were. Fix at the owner: cut the identifier at
40 in the reader (the length `registry.js` already uses for `formerId` and its comparisons), or take the same cut in `planOf`, `applyPlan` and
`entryOfMission`; the display may shorten it, the identity may not.

**177. The identifier at 40 characters (ae9df7beb) — defect of 176 closed.** `readRegistry` keeps the identifier at 40, the length that
`registry.js` compares (`formerId`, duplicates), so `cut(e.raw.id, 40) === e.row.id` holds again; the line on screen shortens it to 12 characters
for the eye only (`shown`), the whole identifier in a `title` attribute passed through `esc`. The probe of 176 replayed on the real modules
(the four lines, then with a 52-character identifier): `former []`, `dup []`, `applyPlan` leaves every identifier as it was and removes
no line. Case N45 (two 14-character identifiers sharing their first 12, `X_CO/old1` and `old2`: plan then application) green, N44 green.

**178. The morning of 13 November — display acceptable; one defect proved in the V2 index.** *Summary (67e2e93ac).* `m.summary` is always a string
(`String(d.summary ?? '').trim()` in the reader); the first page shows `sumCut()` of it (600 characters, cut at a word) through `esc`, the
button is a constant, the full text goes through `esc` in the Detail; the old `title` attribute (the whole summary) is gone. *Lists
(7709e99b1).* The family label is the table's letter (`LETTERS`, `themeOf`: keys are upper-case and `String(code).toUpperCase()` can never
reach an inherited property), else one capital taken by `^([A-Z])-\d` from the identifiers, then `familyText` (already escaped on output); the
subtype list is built from the registry's own values (the reader already cuts them to 40, the list to 60), each one `esc`ed in the
`value` and the label, the select's `data-k` is a constant, a chosen value is only compared by `===`; a family change clears the subtype
and redraws one fixed container. *Notes.* (1) The Detail shows a summary whole whatever its length (the reader does not bound it, unlike
the 2,000 characters of the other reader at line 126), a heavy paragraph and not an injection; bound it in `readMission` to the same 2,000
when convenient. (2) `slice(0, 60)` / `slice(0, SUM_MAX)` count UTF-16 units and may cut a surrogate pair: a replacement sign at worst.
Cases N46 and N47 green. *V2 index (1db36bcb8, 3dafa9d33).* The bounded key list per folder (`{ sig, keys }`) and the same-folder rule
are sound (K219, K220 green; an entry of a real folder with another folder is never taken for a former number). **Defect (proved, a
probe on the real page and index).** `attachFormer()` absorbs an old entry when it carries "nothing more", but `FORMER_SKIP` includes
`USER_FIELDS` (status, notes, flight date, `request`), so what the user wrote on the old entry is not counted: the transfer to the line is
done only if the line has no status, notes and flight date of its own, and nothing is kept otherwise. Two proofs: (a) a line `T-085` with
`former_id: 85` and its own note, and an old entry `85` with another note and flight date and nothing else: the old entry is dropped and
its note is lost (the line keeps only its own); (b) a pending order (status `ordered`, no folder, a `request`) whose identifier a mission
file names in `former_id`: the order is absorbed and its `request` is gone, though `cleanup()` keeps pending orders. The identifier of a
mission file is an untrusted input (any contributor to the missions folder), and since this commit the absorption runs at each opening
and after each reading, not at the user's click. **Fix and counter-test.** Treat the user's fields as "more" when they would not be moved
(the line has its own status, notes or flight date, or `request` is set): the entry is then kept, hidden and counted as the others; and
never absorb a pending order (`status === 'ordered'` without files) — skip it before the test. Counter-test (red now): in K219's
harness, seed (a) and (b) above and require that the old entry is still in the index (`supersededBy` set for (a)) and the order's `request` is intact.

**179. “Open in the generator” and the page's diagnostic (7e02b1204, SOG-0290) — acceptable, one note.** *Notifications.* The texts say
which mission was not opened and which skeleton stayed (`m.id`, the shared mission's identifier, both mission data) and go to
`AppFramework.notify`, which writes them with `textContent`; the journal of alerts that records them writes it back through `esc`; the
fallback line under the sheet is `textContent` too. `t()` substitutes through a callback (no `$&` expansion). *Guards.* `within()` races
`FileAccess.status` (8 s) and the reading of the mission's files (20 s) against a timer, clears it on either outcome and leaves the pending
call alone; the error name `Timeout` can only come from it, and the message is a constant in four languages (no folder name, no path). A
timeout on the user's gesture rethrows it, on the quiet path it answers `null` as before. *Diagnostic.* `diagnosticText()` is made of
constants and of shapes: the page's origin (the user copies it by a click; it is not a secret), booleans (`isSecureContext`, picker present,
GitHub mode), the handle as yes / no and the permission state, an entry count, a count of draft keys (only `Object.keys` filtered by a
prefix, the values never read), and the last step of “Open” (`where` from a closed list of the code, `step` a constant, the error's
`name` cut to 40 characters, an age in seconds): no identifier, no path, no folder name, no raw error message. The text goes to the clipboard,
or, if refused, into a read-only `textarea` by `.value` (never markup); `console.error` carries the origin only. K221 green. **Note.** The
last-step record is read back from `localStorage` (`missionRegistryLastGo:v1`) with no bound on `where` and `step`, only the error name is cut
when written; the only writer is this page on this device and the sink is the clipboard, so it is a hygiene point, not a hole: cut the three
strings to 40 characters in `diagnosticText()` when convenient.

**180. The fix of 178 and the search in the content of the missions — fix verified, search acceptable, two notes.** *Fix (eba9923ce).* A pending
order (`status === 'ordered'` without files) is skipped before any test, so a `former_id` written in a mission file can no longer absorb it;
what the user wrote on the old entry and the line cannot take (status other than generated / ordered, notes, flight date, `request`, compared
by value after the transfer has been done) now counts as “more”, so the entry is kept, hidden and counted, never dropped. The two probes of
178 are K219's cases 3 and 4 (green, as are K220 and K221): the old note and flight date stay on the hidden entry, the line keeps its own note,
the order and its `request` are intact. The CR links are recomputed by `linkReports()` at each reading, so they do not need the entry. The
defect of 178 is closed. *Search (c83592c6a).* `search.js` is pure (no page, store or network, no `RegExp` built from the input: `where()` is
two `includes`); the text is folded after being cut to 4,000 characters per field and 16,000 per mission. A forged mission (6 MB title,
summary and subtype, 200,000 entries in each list, an array nested 5,000 deep) went through `readMission` then `missionFields`: 213 ms and
112 ms, six fields, 16,000 characters in all, the longest 3,999; the reader keeps 40 risks, zones and teams. “dans : …” is built from the
closed `KEYS` list through the `TX` table, the words are constants, the whole goes through `esc`, and `data-where` is the keys joined; no
text of a file reaches it. The path of an index entry (`missions/<folder>/<file>`) is only a key into the set of paths that
`data.cached('missions/')` lists, so a forged folder name reads nothing that is not already on the device. *Outgoing reads.* A keystroke
cannot start a burst: `ensureIndex` builds once per state of the rows (`s.idx`, reset only by mount, the unlisted pass and a registry write),
the filter is memoised per search. But the first keystroke after one of those resets reads, by `data.read(path)`, every cached mission file
(8 at a time), and `read` awaits a re-reading from the repository for each copy that `staleCopy` finds older than the known tree
(SOG-0235), so after a tree refresh that changed many mission files the first search can send up to as many requests as there are such
files, once (the copies are then fresh; offline, the old copy is used, and the next reset tries again). It is bounded by the number of
cached mission files and not triggered by typing, so not a defect. **Notes.** (1) Cap the number of stale re-readings of one build (say 40,
the rest counted “non lue”) or read the stale copies when idle, if the repository's rate limit ever shows. (2) `readMission` keeps every
entry of `notes` (the other lists are cut to 40): `join()` builds the whole string before cutting it (112 ms for 200,000 notes); cut the list to
a few hundred in `missionFields` (`arr(m.notes).slice(0, 200)`). N48 and N49 green.

**181. The missions kept by the browser, exported in one archive (025bd7651, SOG-0293) — acceptable; one defect proved.** *Reads and writes.* The
page reads `siaMissionSaved:v1`, `siaMissionShared:v1` and the legacy draft from `localStorage` (device-local, written by the editor), and for each
snapshot sends one `GET` to the launcher's own origin (`data/missions/<folder>/<file>`, each segment through `encodeURIComponent`, `cache:
'no-store'`) whose answer is only parsed (`jsyaml.load` of js-yaml 4, safe by default) and compared with `canon()`: the result is three
counters. Nothing is written to the folder, nothing is sent elsewhere; the archive is a `Blob` given to a constant `download` name. *Status
line.* Numbers and the constant words of `t()` go through one `esc`; the button and its title are constants. *File names.* The name of an entry
is `instantanes/` or `partagee/` or `brouillon/` plus the identifier with every character outside `[A-Za-z0-9_.-]` turned into `_` (`/` and
`\` included) plus `.yaml`: the directory prefix is fixed, so no traversal (probed: `../../x` gives `instantanes/.._.._x.yaml`, `..` gives
`instantanes/...yaml`). K222 green. **Defect (proved).** `dumpYaml(y, id, what)` writes `# Mission ${id} — ${what} — date` with the identifier
**raw**, and the export passes it the key of the snapshot (and `d.yaml.mission.id` for the shared mission and the draft); the editor's
`missionId()` only trims and upper-cases (an inner line break stays, as does any text of the mission file's `id`). A mission file whose `id`
is a quoted scalar with a line break and a second line `airline: x` yields a snapshot key that breaks out of the comment: the exported file
begins `# Mission T-1` then a line `AIRLINE: X — gardée par ce navigateur …`, and `jsyaml.load` of that file gives a top-level key `AIRLINE`
that the mission never had (probed on the vendored js-yaml). The same raw header exists in the two older callers (writing into the folder), so
the fix belongs in `dumpYaml`. The effect is a forged field in a file that the user then drops into the missions folder by hand, or a duplicate-key
refusal when the line repeats a key of the dump: an integrity point on an input that comes from a mission file (untrusted), not a code
execution. **Fix and counter-test.** In `dumpYaml`, reduce `id` and `what` to one line (`String(x).replace(/[\r\n\u2028\u2029]+/g, ' ').slice(0, 80)`).
Counter-test (red now): seed a snapshot whose key is `T-1`, a line break, `airline: injected`; export; read the archive with `ZipStore.read`; the
first line of the entry is the single comment and `jsyaml.load` of the entry has no `AIRLINE` key. **Notes.** (1) Two identifiers that
differ only by characters turned into `_` (`A/1` and `A_1`, `a b` and `a_b`) give the same name twice in the archive: extracting it keeps
one, and the export is the safety net for what exists only in the browser; number the second (`-2`). (2) The name is not bounded: past
65,535 bytes the 16-bit length field of the ZIP header wraps (a 70,000-character identifier in the local storage): cut `safe()` to 60. (3) A
folder segment `..` in an index entry (a restored copy of the device) would make the GET leave `data/missions`; it stays a same-origin read whose
only output is a counter, so only filter `.` and `..` segments when convenient.

**182. The V3 mission editor, frame and teams steps (3ace1a58f, c138087b3) — paths and display acceptable; two defects proved.** *Path of the file written.*
`pathFor(letter, family, id)` accepts a capital letter, a family of `^[A-Z][A-Z0-9_]{1,23}$` and an identifier of `^[A-Z]-\d{3}[A-Z]?$` and
answers `missions/<L>_<FAMILY>/<ID>/mission<ID>.yaml` through `MS.missionPath`, or an empty string (probed: `../X` as a family, `T-086/../../x`
as an identifier, a lower-case letter and a family with a space give an empty string); an edit that keeps its identifier reuses the path read
from the registry line (`RG.pathOf`), and an identifier changed writes a new file without removing the old one. The letter comes from the
table or from one capital taken from the identifiers. Writes go through `data.put` under the declared prefix `missions/` (a wide prefix, but the
path is built as above) and are sent with the grouped send, never `sendNow`. `numbering()` builds a `RegExp` only from a single validated
capital. *Display.* Every value goes through `esc` (attributes included), the heading is `textContent`, the “To complete” keys are the closed
list of `todo()`, the numeric `data-i` comes from an index. `yamlText` writes a constant header and an ISO date: no identifier, so no equivalent
of the defect of 181. *Registry line.* `regEdit` checks that the line at the place still carries the identifier read (`stale` otherwise),
`regAdd` refuses an identifier already taken (as a former number too). N50 and N51 green. **Defect 1 (proved): the teams step loses data
without any edit.** Opening the step sets `e.teams = teamsOf(base)` (40 rows at most, text cut, blank rows kept) and every later save runs
`withTeams(doc, rows)`, which rebuilds `teams` from those rows only. Probe on `editor.js`: a file of 47 teams gives 40 rows and 40 teams
back (the last 7 are gone); an entry carrying none of name, service, type and role (for instance `callsign` and `crew`) is dropped by the
final `filter`; a role of 300 characters is written back at 200 and a type `h145` as `H145`, on rows the user never touched. The reader
already limits itself to 40 teams, so the loss is invisible on the sheet and the editor writes the cut file back. **Fix and counter-test.** A
row that the user did not change keeps its original object as it is (compare the cut values with the cut values of the original); a row
that stays but is blank keeps its original when the original has other keys; the entries past `TEAMS_MAX` are appended unchanged. Counter-test
(red now, a pure one in the style of the editor's): `withTeams(doc, teamsOf(doc))` deep-equals `doc.teams` for a file of 47 teams, one of which
has only other keys and one a role of 300 characters. **Defect 2 (proved): a file with aliases freezes the save.** `edRead` loads with
`jsyaml.load` (anchors are shared, not copied, so it is cheap), `structuredClone` keeps the sharing, and `edSave` calls `Y.dump(doc,
{ noRefs: true })`, which writes every alias out in full: a 389-byte file of nine nested levels (`l1: &l1 [*l0, *l0, *l0, *l0]` …) dumps to
88,546,510 characters in 1.2 s, six levels to 1 MB, and one more level multiplies by four (past the string limit the save fails, in
between it freezes the page for seconds and then hands tens of megabytes to `data.put`). Any pilot can write the file the user opens with
“Modify”. The same `noRefs: true` is in `add.js` (line 112, where the size is tested after the dump) and in `registry.js` (line 184), so the guard
belongs in one shared function. **Fix and counter-test.** After the load, count the nodes of the document with every shared reference expanded
and refuse the file past a budget (say 200,000 nodes) in `edRead`, in `add.js` before its dump and for the registry's own load; or dump
without `noRefs` and refuse a document that has anchors. Counter-test (red now): `edRead` (or the shared function) refuses the nine-level file
above in under a second and does not call `dump`. **Notes.** (1) `duplicate()` keeps `meta.former_id` of the original: a copy of a renumbered
mission then carries the same former number, and the V2 registry pairs a number with the last line that names it (SOG-0289); delete
`meta.former_id` next to `meta.history`. (2) In `blocking()`, an identifier equal to the line's own (`own`) skips the form test: harmless
here because the path is then the one read or an empty string, but keep the order.

**183. The V2 registry: reports under a former number, comparison and storing of the kept missions, received texts per mission — acceptable; one defect proved.**
*Reports (a78fa30b0).* `linkReports` also takes the reports whose mission is the line's former number; it only reads (the reports' own registry
is not touched) and skips a line that is hidden as superseded. A forged `former_id` can only make a line show reports that are not its own, a
display association for a line the contributor could already create. *Store in the folder (ec6c6ee02).* Each “Store” button carries one
identifier, the click is delegated and handled for that row only (no loop over the list, no bulk button); “Keep the file” writes one
choice key and removes nothing; the rows to decide are only the states `diff` and `none`, so a snapshot that could not be compared (`unknown`)
cannot be stored. `storeMission` re-validates the identifier (`checkMissionId`), builds the folder from the identifier alone
(`<letter>_<family found by letter>/<ID>`, the family name stripped to `[A-Z0-9-]`) and, when a file is there and differs, writes it to
`versions/` **before** replacing it (K223 green, on a writable fake folder). The texts shown (dates, counts, the identifier and the target)
go through `esc`; the target is written “old → new” in the row. *Received texts (d46aee7c1).* `receivedOf` keeps for a mission the
texts that cite its identifier or its former one and the texts that cite no mission (copied everywhere, as before): it is strictly narrower than
the former behaviour, and a text forged to cite another mission only lands in that mission's `recu/` when it is in the same batch. The
patterns are anchored and linear. K219 to K224 green. **Defect (proved): the comparison reads a served file with aliases through
`JSON.stringify`.** `refreshKept` runs at each opening of the page; for each snapshot with a line it fetches the mission's file from the launcher
(`jsyaml.load`: anchors are shared, so it is cheap) and then runs `canon()` (a `JSON.stringify` of the whole tree, shared references written out
in full) and, since ec6c6ee02, `leafCount()` (a recursive walk of the same tree). Probed on the vendored js-yaml: a 420-byte file of ten nested
levels takes 0.6 s and 87 MB of JSON, an eleven-level file of 455 bytes takes 2.6 s and 350 MB (and 2.1 s more for `leafCount`), twelve levels
exceed the string limit and the call throws, unhandled, since `refreshKept()` is not awaited. The precondition is a snapshot for that identifier
in the local storage, which the editor creates when the user loads that very mission: so a hostile file in the missions folder, once loaded, makes
the registry page freeze at every opening until the snapshot is gone. The same family as defect 2 of 182 (any `noRefs: true` dump) on another
reader: the guard belongs in one shared function. **Fix and counter-test.** A function that loads a text and refuses the result when
the document, counted with every shared reference expanded, passes a budget (200,000 nodes), used by `fileYaml`, the folder reading, the
`storeMission` reader and the V3 `edRead`; in `refreshKept`, an item whose file is refused is `unknown`, and a failure in one item never
stops the others (a `try` per item). Counter-test (red now): serve the eleven-level file above under a mission with a snapshot; the page answers in
under a second and counts that mission as not compared. **Notes.** (1) `lineWithFiles` falls back to the first line that names the identifier as
its former number: a hostile line that claims a former number the real, renumbered line also claims (or one nobody else claims) receives the
user's snapshot of that old number if the user presses its row's button, after seeing “85 → T-999”; use the fallback only when exactly one line
claims the number and show the target's title in the row. (2) `storeMission` backs up the old file only when it parses (`old` truthy): an existing
file that does not parse leaves status `new` and is overwritten without a copy in `versions/`; copy `oldText` whenever it exists and differs.
(3) `receivedOf` calls `receivedIds` (a YAML parse per text) for every mission of a batch: the work is the number of missions times the number of
texts; compute the cited identifiers once per batch.

**184. The fix of 181 and the comparison of the shared mission and the draft — fix verified, defect closed; extension acceptable.** *Fix (337e3c177).* `dumpYaml`
now writes `oneLine(id)` and `oneLine(what)`: carriage returns, line feeds, NEL and the two Unicode line separators become spaces and the text is
cut to 80, in the one function that all callers share (the export, the storing in the folder and the older writers); the new case in K222 seeds a key
made of `T-1`, a line break and `airline: injected` and checks that the first line of the exported entry is the single comment and that no
other line begins with the injected key. The three notes of 181 are taken: a second entry with the same name is numbered (`-2`), the name is cut to
60, the segments `.` and `..` of a folder are dropped before the address is built, and the last-step record is cut to 40 characters when read.
K222 green; the defect of 181 is closed. *Extension (22dbe6d04).* The shared mission (`siaMissionShared:v1`) and the legacy draft join the
list as two more candidates with their own keys (`partagee:ID`, `brouillon:ID`: the prefix is lower case and identifiers are upper-cased, so a
snapshot cannot take such a key); they come from the device's local storage as JSON (no alias), they are not counted among the snapshots, each
has its own button and its own “keep the file” choice, the identifier shown and the nature of the row go through `esc`, and “Store” runs the same
`storeMission` (identifier checked, folder built from the identifier, old file written to `versions/` first) after one click on that row. K223
green. The point left open in 183 stays open (a loaded file with aliases freezes the comparison, and a failure of one item stops the others),
since the new candidates do not change it. **Notes.** None new.

**185. The fix of 183 and the emphasis of the buttons — fix verified, defect closed; one note.** *Fix (b8e3048ef).* `loadYaml(text)` loads with `jsyaml.load`
and then counts the document with every shared reference expanded, once per object (a `Map` memoises the count, so the work stays linear), stops
adding past the budget of 200,000 nodes and refuses with an error named `TooBig`; a circular reference counts as one and does not loop. It is
now the loader of the served file (`fileYaml`), of the folder reading, of “Add files” (`acceptYaml` drops the refused file and says so in a
notification) and of the old file read by `storeMission`. In `refreshKept` each item has its own `try`: an item that fails is `unknown` and the
others go on. The three notes are taken: a former number is followed only when exactly one line claims it, and the row shows the target's title
after the arrow; the old file is copied to `versions/` whenever it exists and differs, readable or not (`old || oldText`), so a file that does not
parse is no longer overwritten without a copy; `receivedIds` is memoised per received text in a `WeakMap`, one analysis per text and not one per
text and per mission. K225 (the eleven-level file under a mission with a snapshot) and K219 to K224 green; the defect of 183 is closed. *Emphasis
(d140b1358).* Display only: a class chosen among constants from the comparison, and a phrase chosen among constants. **Note.** Six calls to
`window.jsyaml.load` remain: `missionUsage` (the size of a mission), the detail view of a mission (the maps already there),
`showGeneratedMd` (two calls) and the two readers of “Previous versions” (`diffOf` of an old version against the
current file, two calls). They all run on a click or on the opening of one mission's detail, not at the opening of the page, and none writes; use `loadYaml`
there too (a one-word change) so that a file with aliases is refused everywhere the same way. The pasted texts read by `receivedIds` are
only asked for `mission.id`, so they do not walk the tree.

**186. The fix of 182, the places and story steps — the editor's two defects closed; two defects proved.** *Fix (ef0772f71).* `withCadre`, `withTeams`, `withPlaces` and
`withStory` now compare the form with what the file shows and write only the fields that differ: an unchanged entry stays the very object of
the file, the entries past the bounds are kept as they are at the end, and “Nothing to save” writes nothing. The counter-test of defect 1 of 182
passes on the probe (47 teams, one with only other keys, one with a 300-character role): `withTeams(doc, teamsOf(doc))` is identical to the
file's `teams`; editing one team and removing another gives 46 entries, the entry without the four fields and the 47th are kept, and the extra
key of a kept team is kept. `shapeOf` refuses at opening a document in which an object appears twice (an anchor) or that has more than 100,000
nodes, with an iterative walk (no recursion, a `Set`), so that the 20-level file of the probe is refused in 183 ms; N54 holds the counter-test
without `shapeOf`. Defect 2 of 182 is closed **for the editor**. *Places and story (6dc8740f5, ce72c9c25).* Positions go through `coord()`
(a number in range, rounded to six decimals; empty or out of range gives `null`, probed: latitude 95 gives `null`), radius, time and load through
`positive()`, texts through `cut` and `para`, 60 places per kind, 20 objectives; a place keeps its other keys (a zone keeps its polygon, its custom
key, a turning point its `hold`) and an unchanged form gives the file back identical (probed). Every value of the forms goes through `esc`, the
kinds are the constants of `placesOf`, a zone kind outside the three known ones is shown as it is, escaped. N50 to N54 green. 923807228 is style and
three constant labels. cc8dfc3b1: the date comes from `Date.parse` of the `Last-Modified` header of the same-origin answer, a number, shown through
`esc`. **Defect 1 (proved): editing Lieux deletes a single-object rendezvous.** The reader accepts `rendezvous` as one object (`d.rendezvous ?
[d.rendezvous] : []`), `placesOf` lists only arrays, and `withPlaces` runs `rebuild` for every kind at every edit: for `rendezvous` the file's
value is not an array, so `before` is empty, the rebuilt list is empty and `delete out[key]` removes it. Probed: a file with `rendezvous:
{ id: R1, … }` and the edit of the target's latitude alone comes back without `rendezvous`; the same for a `zones` or `turning_points` that is not
a list. It is the same family as defect 1 of 182 (what the form does not show is lost), on a shape the reader tolerates. **Fix and
counter-test.** In `rebuild`, when the file's value is not an array and no row of the kind exists, leave the key as it is; when rows of the kind
exist beside a non-array value, wrap an object as one entry. Counter-test (red now): `withPlaces(doc, placesOf(doc))` with the target's
latitude changed leaves a single-object `rendezvous` equal to the file's. **Defect 2 (proved): only the editor's reading is guarded; the registry's
own dump is not.** `registry.js` (`withHeader`, line 184, used for every write of the registry), `add.js` (line 112, the size tested after the dump)
and `move.js` (line 75) call `Y.dump(doc, { noRefs: true })` on documents that come from the data repository or from a text the pilot pastes. A
333-byte registry file of nine nested levels (`missions: []` plus the anchors) goes through `withHeader` in 6.4 s and 88,546,570 characters.
Any pilot can write the registry file, and every “Save” of the editor, every correction and every update of the registry rewrites it, so one such
file freezes the writes of whoever next saves. **Fix.** `shapeOf` (or the V2's `loadYaml`) at the moment the registry is read in `yamlFile`
(refuse the document and say so, as the editor does), and in `add.js` and `move.js` before their dump; counter-test: the nine-level registry above is
refused in under a second and no write is attempted. **Note.** A legitimate anchor in a mission file is now refused with a message (the rewrite would
expand it): the right trade, but the message should say how to remove it (write the repeated object out).

**187. The fix of 186, the risks step, `navaidsOf` and the stop-point names — defects of 186 closed; one defect proved in the risks step; AeroDB acceptable.**
*Fix (d1f544bfe).* `shapeOf` and `NODES_MAX` now live in `frame/lib/mission.js` and the editor re-exports them. Lists are read the way the
reader reads them (`arrOf`: an array, or one object as one entry), and a kind whose rows did not change keeps its key as the file writes it. Probed on
the fixed code: a `rendezvous` given as one object survives the edit of the target's latitude, a `zones` or a `turning_points` that is not a list is
left alone, the teams and places round trips are identical, and the 20-level alias file is refused in 2 ms by `shapeOf` (iterative, no
expansion). The registry is read through `shapeOf`: a registry or a mission with anchors is “unreadable” and so never rewritten (`regPut` and
`edRegister` do not write a registry that does not read), `withHeader` throws before any dump (probed: the nine-level registry now throws at once instead
of 6.4 s), `add.js` answers `alias` for such a text and `move.js` (`withAirline`) returns `null` before its dump; the message says how to get
out (write the repeated object out in full). N56 green. Defects 1 and 2 of 186 are closed. *Risks step (92906e900).* The same rules as the other steps
(an unchanged risk stays the file's own object, bounds kept, texts cut to 300, escaped on output), and a removed risk is removed from every
`i18n.<language>.risks`. **Defect (proved): editing a risk whose danger is under `title` or `name` deletes it.** The reader and `risksOf` take the danger
from `hazard`, else `title`, else `name`; `withRisks` rebuilds an edited risk from the file's object plus the changed fields and then keeps it only
`if (o.hazard)`, so for `{ title: 'Birds', mitigation: 'old' }` an edit of the mitigation alone leaves no `hazard` and the risk is dropped. Probed: four
risks in, three out, and the `i18n.en.risks` list is left with four entries (no longer in the order of `risks`). Clearing a danger on purpose
also drops the risk (the stated rule) but leaves the translations unaligned. **Fix and counter-test.** Test the danger as `risksOf` reads it
(`hazard ?? title ?? name`) and keep a risk whose danger is shown; drop the matching `i18n` entry for every risk removed by either path (those
absent from the rows and those dropped for an empty danger). Counter-test (red now): `withRisks` with the mitigation of a `title` risk changed keeps
four risks and four translations, and the one-risk-cleared case leaves the lists the same length. *`navaidsOf` (7667e5c6c).* The code must have four
letters or digits; the aerodrome comes from the published base and the aids from `navaids` within 15 NM, kept only when `kind` is `ILS` and `ad`
matches; every field is checked by an anchored pattern (runway `^\d{2}[LRC]?$`, identifier `^[A-Z0-9]{1,5}$`, frequency `^1[01]\d\.\d{1,3}$`, category among
four words, glide slope `^3[23]\d\.\d{1,3}$`, DME channel `^\d{1,3}[XY]$`), the bearing a number from 0 to 360 or `null`, the type from a closed list, duplicates removed,
the sort by runway then identifier; the readers add `cat`, `gs`, `dmeId` and `dmeChannel` from the AIXM with linear patterns. K226 to K228 green. **Notes.** (1) `lat` and
`lon` of an aid are `+n.lat` and `+n.lon` without a check: a missing value becomes `0` and a text `NaN`; test them as finite and in range like the aerodrome's
(and drop the aid otherwise). (2) A `bearing` of `true` passes the numeric test as `1`; test the type. *`ground.py` (62cc7ce8f).* Only `_name` changed:
for a stop point, `NO ENTRY` gives no name and a leading “stop point” label is removed by anchored patterns applied to a text whose white space is
already collapsed to single spaces; no new source, no new network call. (3) The 100,000-node ceiling of `shapeOf` is about two thousand registry lines
(some forty nodes each); the registry has a few hundred today, but a larger one would be refused as unreadable: raise it for the registry only if it ever
approaches.

**188. The recette's 2,000 characters, the notes of 187 on `navaidsOf`, the Map's display — acceptable, one note.** *Recette (45cba6733).* The limit is held
on the launcher's side, where it counts: `recette/verdict` and `recette/decision` **refuse** (not truncate) a comment or a text of more than
`MAX_COMMENT = 2000` characters or with a control character, keep the 1,000 entries at most, the identifier of at most 20 characters and the closed
list of actions, and read a file back with the same bounds (an entry outside the rules is dropped, 1,000 kept); `tools/recette_build.py` cuts what it
reads at 2,000 and flattens the control characters; the page's `maxlength` is a convenience, not the guard. The size of a written file is bounded by
the entry count times that limit (about 2 MB), and the launcher's own body limit applies before the verb. On the page the counter is `textContent`
or an `esc`aped string, the limit a constant, the height computed from `scrollHeight` and capped at twelve lines. K123, K171, A175 and K96 green.
**Note.** The write verbs' rule says “no control character” but the pattern lets tab and line feed through (the textarea is now several lines);
both readers flatten them to spaces, so it is a wording point: say “no control character but tab and line feed”. *`navaidsOf` (1cb71c46c).*
The two notes of 187 are taken: the aerodrome's and each aid's `lat` / `lon` must be numbers (not text, not `null`, so never `0`), finite and
within ±90 / ±180, or the aid is dropped; the bearing must be a number of type `number` (a boolean or a text gives `null`) between 0 and 360. K226 to
K228 green. *The Map (8b73c9944, 2d80e2c7d, 8f6a17c01, 36a3300bf).* The barbs follow the route by a curvilinear abscissa on the on-screen polyline
(arithmetic on finite numbers, a `Math.max/min` clamp at both ends, a guard on a zero-length segment); the ground names and the stop-point signs are
drawn with `fillText` and `measureText` on names that `ground.js` already cleans (controls and angle brackets removed, 24 characters), the search
button is a constant; the weather layer and its `wx.js` are removed with their texts, and no reference to the Map's `wx.js` is left (the Atmosphere
module has its own, unchanged). D178 and D194 green.

**189. Every YAML of the V2 registry through the guarded function (29fe8ec28) — note closed.** The six direct `window.jsyaml.load` calls of the note of 185 (the
usage of a mission, the detail view, the generated Markdown twice, the two readers of the previous versions) and the three others found in the same pass (the reader of a pasted text, the
received texts' identifier reader, the local ledger of the reports) now call `loadYaml`; the only direct call left is the function's own. Each of them
already sits in a `try` (`missionUsage`, `receivedIds`, `loadReports`) or in a click handler whose failure shows nothing and writes nothing, so a refused file
(`TooBig`) never reaches a write. K230 holds the rule statically (no direct call outside `loadYaml`), K219 and K225 green. No note.

**190. The fix of 187, the timeline and maps step, the commercial family — defect of 187 closed; one defect proved in the timeline step.** *Fix (779654075).* The danger of a
risk is read as `risksOf` reads it (`hazard`, else `title`, else `name`); a danger cleared on purpose removes the risk and its translation, and so does any
other removal, at the same place. Probed: the mitigation of a `title` risk edited keeps four risks and four translations; one danger cleared gives three risks
and three translations in the same order; the round trip is identical. `shapeOf(doc, max)` takes a ceiling and the registry is read and written with
`REGISTRY_NODES_MAX = 1,000,000` (note 3 of 187; the walk is iterative and an anchor is still refused at once, whatever the ceiling). N59 green: the defect of 187 is
closed. *Commercial family (57c8cb17a).* The airline is read through `airlineCode` (`^[a-z0-9]{2,8}$`, else empty), written at the first level only when it
matches and is not `perso`, the aircraft type is cut to 60 and upper-cased, only the first aircraft is touched, the proposed title comes from the two places, the
“To complete” list drops the steps a link flight does not use; every value goes through `esc`. N58 green. *Timeline and maps (2dfa0aeca).* Events keep the
bounds (60 events, 20 / 40 / 500 characters), an unchanged event stays the file's own object, `withMaps` only appends (never removes a map, the round trip is
identical, a single-object `maps` is read as one entry). **Defect (proved): a `timeline` that is a list loses its events.** The step reads
`timeline.events`; a file whose `timeline` is a list of events (the earlier form: the previous “To complete” rule counted it and `chronology`) shows no row, the
round trip is identical, but adding one event makes `withEvents` write `timeline: { events: [the new one] }` over the list: probed, a two-event list comes back with
only the added event. It is the family of defects 1 and 2 of 182 again (what the form does not show is lost). **Fix and counter-test.** Read a list-shaped
`timeline` (and `chronology`) as the events, so that they are shown and kept (the new ones are appended to them), or refuse to open the step on that shape with a
message; never replace it. Counter-test (red now): `withEvents(doc, [...eventsOf(doc), one])` on `timeline: [e1, e2]` contains e1 and e2 and the new event. **Notes.** (1) An
event edited whose text is under another key (`description`, `label`) and without a `place` is dropped by the final `text || place` test, as the risks were
(the displayed event shows an empty text); keep an event that has any other key. (2) The names of the proposed maps (`general<ID>.png`, `cible<ID>.png`, …) are built from the
raw `mission.id` (cut to 40, line breaks removed, but `/` and `..` allowed in a file's own identifier; the form refuses them for a new one): build them from the identifier only
when it has the form `^[A-Z]-\d{3}[A-Z]?$` and from nothing otherwise, so that the V2 studio never receives a name with a path in it. (3) `withCadre` on the aircraft keeps
only truthy entries of `aircraft`: a `null` entry disappears, harmless. **Incident reported by Features SOG** (an amend command that touched my commit locally during a
conflicting rebase): the commit “Audit 189” is intact on `origin/v3` (896936de1, my message, the two files of the journal and the bundle).

**191. The published site's root (93258d646, SOG-0278 / Q-0039) — accepted, three notes.** *Workflow.* The whole diff of `pages.yml` is one added step after the two builds and before
the world synoptic: `python v3/tools/build_pages.py --root-only _site --start v3/frame/`. The triggers (`push` on develop and v3, the schedule, the manual
dispatch), the permissions (`contents: read`, `pages: write`, `id-token: write`), the concurrency group, the checkouts and every existing step are
byte for byte as before; no secret, no `curl`, no `rm`, no new action, no third-party address. *Script.* Run on a fake site in a scratch folder (the commit's
own files): it writes only `index.html` at the root (another file of the site is untouched), and each of `../x`, `v3/../x`, an empty value, a value with a
space and `v3/frame/"><script>` is refused before anything is written (the character class `[A-Za-z0-9_][A-Za-z0-9_./-]*` leaves no quote, angle bracket or leading
dot; a leading slash is stripped and the folder must hold an `index.html` of the built site). The page is a constant: a `meta refresh` to a relative address, one
inline script `location.replace(<constant> + location.search + location.hash)`, a visible link; the address begins with the constant, so the query string
and the anchor cannot change the host; the Content-Security-Policy meta (the same one as the other pages, `script-src 'self' 'unsafe-inline'` and the
fixed list of hosts) comes before the script, so the inline script runs and the query and anchor are kept. `main()` only has its policy line moved into
`csp_meta()` (same list, same source). K231 is the commit's own static case. **Notes.** (1) The step reads the code of `v3`: the new `build_pages.py` must be on `v3`
before, or in the same push as, the workflow; with the old script the arguments would be taken as an output folder and the step would most likely fail (the build job fails, the deploy
does not run, the site keeps its previous version) — harmless, but the first run would be lost. Push `v3` first, then `develop` with the same `pages.yml`, so that a push
of either branch publishes the same root. (2) What the user sees: the V2's home page (`index.html` of develop) is no longer served; the V2 manifest's
`start_url` is `apps/pilot/mes_missions.html`, so an installed V2 keeps opening on its own page, and `/v3/` and `/v3/frame/` keep their addresses; the
service worker of a browser that cached the old root may show it until it updates. (3) The page is in French with an English link text only: no issue.

**192. “Choose this route” on the Map alone (edbe901be, SOG-0224) — acceptable, display only.** The first proposed route is shown and taken as the current choice when the window
opens (`S.altShow`, `S.altAuto`), a tap changes the choice instead of removing it, and the row carries `data-shown` (a numeric `data-alt`, `0` / `1` flags, a constant CSS
rule). The route names stay through `esc`, the legend rows are built by `altsLegendRows`, which escapes its labels, and nothing new is read from a file or written. D201 green,
D202 is the known failure the commit declares (Fuel loses its proposals when its screen is left), not a regression. No note.

**193. The published root, the Map's corridor, Fuel's proposals, the stop points' runway — acceptable, one note.** *Publication.* The commit on develop (027747a83, parent 8b6093da7)
changes one file, `pages.yml`, by the two lines of audit 191 and no other; its blob is the one of `origin/v3` (c1c5c597c), so the triggers, permissions and existing steps are unchanged, and
`build_pages.py` of develop is not touched; 78053845b is on `v3` with `--root-only`, so the step finds its code whichever branch is pushed. The run itself was not seen (no access to the runs).
*Map (b4efa222d).* “Around the flight only” now applies the route's corridor to every layer read around the plan; the removed `withBig` and `BIG_TYPES` only added reads, and nothing new
is read or written (a smaller read, not a larger one). *Fuel (dd7c3f8d2, 95d0a34f2).* After a choice on the Map alone Fuel publishes an empty list (`altsClear(true)`); on return without a choice it
takes the proposals from `cache/fuel/route_alts.json` through `raltsOfDoc` (a calculation, the same pair of aerodromes, three at most, texts bounded, procedures in their form). That
document is of the `cache` kind: it stays on the device and is not in the data repository, so no pilot writes it. D202 and F201 green. *AeroDB (e79e56dd1).* `ground.py` splits
`W28@02/20` with an anchored pattern applied to a name that is already one line and an OpenStreetMap tag of at most 255 characters (no backtracking to speak of), and the reader keeps `rwy` only
if it matches `^\d{2}[LRC]?(?:/\d{2}[LRC]?)?$`; the ENV charts leave the approach charts by a word test on the file name. K228 and K229 green. *Recette (001b4aa56).* Wording only: the two verbs' rule
now says “no control character but tab and line feed”, which is what the pattern does (the note of 188 is closed). **Note.** `altsFromDoc` hands `d.alternatives.slice(0, 3)` to the Map as the
list without passing it through the validation `raltsOfDoc` applies to the Fuel list; the document is device-local, so it is hygiene: give the Map the validated list.

**194. The fix of 190 — defect closed, notes taken; the editor's rule is complete.** `eventsHome` finds the events where the file holds them (`timeline` as a list, `timeline.events`, `chronology`
as a list or `chronology.events`; the first that carries some, else `timeline.events`) and `withEvents` writes back there, never replacing the container. Probed on the fixed code:
`timeline: [e1, e2]` plus one new event gives e1, e2 and the new one, still a list (counter-test of 190, and the round trip is identical); a `chronology.events` is shown with the text
read from `text`, else `description`, else `label`, an edit goes back to the key it came from (no `timeline` key appears), clearing the text removes the event; with a `timeline` and a
`chronology` both present only the one holding the events is touched, its extra key (`note`) and the other list are kept. The notes of 190: an event under another text key is
kept and edited in place; the names of the proposed maps carry the identifier only when it has the form `^[A-Z]-\d{3}[A-Z]?$` (probed: `../../x`, a text with a quote and angle bracket, and
a text with a space give `general.png`, `cible.png`, … with no identifier); a `null` entry of `aircraft` stays where it was (clearing the first of three leaves `{}`, `null`, the
third). The same pass also tolerates a `radiusKm`, a `center`, a single participant given as a text and a single secondary objective given as a text, and a string entry of `maps`.
N58 to N60 green. With this, the six steps and the commercial family keep what they do not show: for every shape I probed the round trip is identical, an edit writes only the fields
that changed, and “Nothing to save” writes nothing. **Note.** A `timeline` that is a bare text (neither a list nor an object) is replaced by `{ events: […] }` at the first added event;
no reader takes a text for a timeline, so nothing is lost that the sheet showed, but leave a non-container value alone.

**195. The folder that does not answer, the Map's ground, Fuel's METAR, the status verbs — acceptable, three notes.** *Missions folder (1a5d7e6ac).* The path “dead folder → choice”
exists only when `request` is true (a click: “Store in the folder”, “Open in the generator”, “Duplicate”, “Re-read”); without a gesture the page keeps its 8 seconds, writes the
name of the kept folder (`textContent`, cut to 80, read from `FileAccess.get` in 1.5 s at most) and returns `null`, opening nothing. The dead folder is a `handle: null` state, so it
is never taken for a valid folder; `pickFolder` stores nothing before the user chooses; nothing is created or written before the click on a row's “Store” (the writing is `storeMission`,
read in 183). K235, K219, K223, K225, K230 green. *Map (593e6d6c9, bed86e5b4).* Sign colours are constants, the names are drawn with `fillText` after the cleaning of `ground.js`, the
hold's mark is the text before an `@`; arcs from 45° are arithmetic. D178, D189, D190, D204, D205 green. *Fuel (a78c17066, 1f3dfe6a6).* “On the map” reads the airfield's METAR first only when
the frame's weather layer has not kept it and the device is online, through the same declared layer (`ctx.weather.metar([icao])`, one airfield), waits three seconds at most and opens the Map
with or without it; the button is disabled during the wait; the mention of a Little Navmap procedure is a constant text. F202, F203 green. *Status verbs (345ad3c15).* `proc/status`,
`vfr/status`, `aircraft/status`: read-only (no network, no write, no subprocess); the arguments are checked (`states`: a non-empty list of at most 40 prefixes matching the pattern; the folder
names read are matched by `\d{4}-\d{2}-\d{2}`), files are read only below a size ceiling (`MAX_INDEX` 20 MB, `MAX_DB_BYTES` 5 MB, `MAX_BUILT` 2,000 files of 2 MB) and only names or
sets of identifiers are returned; the paths are built from constants and from validated cycle or state codes. K232 to K234 green. **Notes.** (1) The dead-folder path waits 2.5 s, then up to
1.5 s for the name, so about 4 s pass before the picker, against about 5 s of activation of a click: begin the choice before reading the name. (2) `doScan` called at the opening when
`missionsDir(false)` returned a folder goes through `scan(true)`: if the folder stops answering at that moment, the gesture path runs without a gesture (the picker refuses, a notification
appears, nothing is written); pass `request` false in that automatic call. (3) `a78c17066` hands the icao from the button's `data-icao` to the weather layer, which keeps only `^[A-Z0-9]{3,4}$` before any file or request, so nothing leaves the device with another shape; a test in Fuel too would make the rule readable where the button is.

**196. The two remarks of 195 and the runway choice by wind — taken; display acceptable.** *823cfe506.* In the dead-folder path the choice now begins before the name is read (`keptName` runs beside it,
and its message is dropped if a folder was chosen meanwhile; the name is awaited only for the failure message, after the choice), so the picker opens at once and no longer after about 4 s of a 5 s activation.
The automatic reading at the opening is `doScan(false)`, and the buttons call `doScan()` in an arrow, so a click event is never taken as the `request` argument: a folder that stops answering at the opening
opens nothing and asks for nothing. No other caller passes a non-boolean (probed by a search of the calls). K235 and K236 green; the two remarks are closed. *135b1b755.* The runway rows are ordered by the
head wind then the cross wind of the METAR the layer kept (numbers; a row without wind keeps the model's order), the wind is written with the constant words of `TX` and numbers, the identifiers and
the class values go through `esc` or are constants. D206 green. No note.

**197. The French register fold in Data, the Map's button, Fuel's “Start” and direct off the route — acceptable, one note.** *Register (336344f75).* The commit touches no launcher file: the fold posts the chosen
file's raw bytes to the **existing** `base/upload` route (the library of the country sheets, `ctx.launcher.upload`), with the file name cleaned of control and line characters and cut to 120, a ceiling of
200 MB checked on the page (empty and too large refused before any send), one upload at a time, an abort signal. The rule of the register is held by the launcher, whose code is unchanged and was read for
SOG-0270: the sniff recognises the file, `registry_fr.derive` writes the five columns to `data/local/registry`, the original (owners, addresses) is dropped at once on success and on every refusal
(`finally: _drop(tmp)`), a refusal is a code (`unrecognised`, `too-large`) and never a line of the file, and the answer carries counts, a date and a hash, no content. On the page the launcher's text is never
shown (the refusals are said with the screen's own words), the row count is accepted only as an integer from 0 to 5,000,000, the date only as `YYYY-MM-DD`, everything written goes through `esc` or
`textContent`, and the DGAC address is a constant in the code, opened in a new tab with `noopener noreferrer`. Nothing is published and no journal is written by the page. The Administration entry
that opens an application's page from another (`app: 'pilot'`) builds its address from the current location with the application name checked by `^[a-z]{3,12}$` and a constant hash, same origin. A180,
L126, L127 green. *Fuel (75fd4f6be).* `S.starting` holds the departure during the weather re-reading (the button stays busy, a second gesture does nothing); a direct to a point off the route
is allowed and its distance to the route is said, a point of the route is found by its id or its mission name, an unknown or passed point is refused; all texts through `esc`, the distance is a computed
number. F204, F205 green. **Note.** `S.starting` is set to `true` and put back to `false` at the end of the function, without a `finally`: an exception between the two (in `refresh()` or in the
text of the note) would leave the button busy until the page is reloaded; put the reset in a `finally`.

**198. The airspace chart's room, the “Defined countries” labels, the register link — acceptable, display only.** `bodyRoom()` computes a height from the frame's tokens and the view's size
(numbers, no text from a file) and the chart reads it instead of the height of its own sheet, which ended the redraw loop; no new read or write (D207 green). The new labels are plain
text of the screen's table in four languages (no markup, no address); the two “put it in Data” links of the aircraft list are the constant `?app=maintenance#data?registry=1`, relative to the frame's page, same
tab (M45, L126, L127 green). No note.

**199. Advice on “Store the copies”, the Map's mission window and the day's display commits — advice given; acceptable, one note.** *Advice before the code (SOG-0294).* The plan (a click, a count first, the
calculation redone at the click, nothing deleted whose content does not remain elsewhere) was accepted with these additions: the name never decides alone (the file's name **and** its content, read by the same
`receivedIds`, must cite the same other mission; a content citing the mission itself or no mission is left, as d46aee7c1 keeps those texts everywhere on purpose); the same content is looked for in the target's `recu/`
by the SHA-256 of all its files and not by name (the target has its own time stamps); never an overwrite (another name or no touch), the written file read back and compared before anything is removed, the removal
last and re-checked, `removeEntry` without recursion; the target found by the registry in one way only (an exact identifier, or a former number claimed by exactly one line), its folder from the registry with a last segment equal to
the identifier, never a mission folder created; strict names on both sides, 1 MB per file, a ceiling of files and bytes; a report on the screen and in the clipboard (names, from → to, eight characters of the hash, no content),
never a file written outside `recu/`; one pass at a time (a busy flag reset in a `finally`), only on a click, stop at the first discrepancy; eight bench cases to be red without the guard. The question “can a forged file whose
name cites another mission delete or move something there” is answered by the rule that only the source's own file can be removed, and only when its content already stays elsewhere. *Map's mission window
(eecfa3bd0, 4e37bbb01).* The cross of a flight's window now asks (`ctx.ask`, refusal keeps everything, D210) before `leaveMission` rewrites the flight without its mission, its category, its locks and the points the mission
imposed (`lock === 'mission'`, the departure and the arrival only lose the mark, the pilot's own points stay, the route text and the distance are rebuilt from the points left); the window can be folded and
reopened from the column's button; a flight that names a mission while the Map is open gets its window at once (“Loading”, then the mission). Texts through `esc`, no new read or write beyond the flight the
pilot already owns. D183, D209 to D212 green. **Note.** When `ctx.ask` does not exist (an incomplete page) `abandonMission` calls `leaveMission()` directly, and `leaveMission` now removes the imposed points: the
“gesture of before” did not remove any, so the degraded case deletes points without a question; in that case leave the window only (keep the points) or do nothing. *The rest of the day (read by their files and by every line that reads data, writes, builds markup or opens an address, not line by line).* 08b0ad6f8,
abf78a544, 0fa6bdbd2, 5787a33b0, 2e5cef5f2, b02178db7 (the Map: touch area, VOR rose, contour lines, profile, aircraft, opaque panels) are drawing and arithmetic on numbers; ce1b3d12f (an ATIS reading is ignored
when Fuel is left: every step re-reads the state it received, `gone(s)`) and 67623f7de (a runway that no SID or STAR serves is never the likely one) are state and calculation; 699f2d6b4, a46daac57, 7eb6d2fbd, ce382d00e (aircraft list, Data
fold, SPEC, status sentence) are screen texts through `esc`; 9bd3986de and ae4b25c64 are mock-ups with no code. F206, F207 green.

**200. “Store the copies” of `recu/` and the abandon question — accepted with one guard; the note of 199 closed.** The block follows the nine points of the advice of 199, read in full before the push and replayed on the
local commit (K238, then renamed K240; K219, K223, K230, K235 green). *What it does.* On a click, `missionsDir(true)`, a count first (nothing touched), then a question and the calculation redone after the answer. A copy of mission A's `recu/` is
treated only if its **name** (strict expression, resolved by the registry to exactly one line) **and** its **content** (the same `receivedIds` reading) cite the same other line B, and that line alone; a content citing A, no mission or
several, an ambiguous name (two lines claim the number), a folder without a registry line or whose last segment is not the line's identifier, a file over 1 MB, a name outside the form (`..` included) are left as they are and counted. The
same content is looked for in B's `recu/` by the SHA-256 of all its files, never by name (B has its own time stamps); a content B lacks is written first (a free name over ten tries, never over a file, `createWritable` without
existing data), read back and compared, and the unfaithful file that this pass has just created is removed; the copy of A is removed last, after three readings (its own hash, B's file, both again just before), by `removeEntry` of the exact name, without
recursion. Bounds: 1,500 files per `recu/`, 8,000 per pass, 64 MB read (beyond: nothing is tidied). One pass at a time (`tidying` / `scanning` with a `finally`, a re-reading refused during it), never at the opening. The report (name, A → B, eight
characters of the hash, “removed” or “moved”) is on the screen and in the clipboard and the last one is kept in the local storage, 9,000 lines at most under a `try`; no content, no file written outside `recu/`. *Guard added by this audit (6c5c3fa09).* The hash and the
comparison were made on the decoded text; a file with a byte-order mark or an invalid UTF-8 byte could share the hash of a file with other bytes, so its copy would have been removed with its exact bytes kept nowhere. Now a file is kept in the plan, and counted as
a content held by B, only if `TextEncoder(text).length === size`; otherwise it is left as it is (in `recuFolders` and in `held_of`), with two more fixtures in the bench case, red when the guard is removed. *Abandon question (34bfa4fc4).* The question is
now asked inside the window (“Keep the mission” first and focused, Escape keeps), with no dependency on `ctx.ask`: the degraded case of my note of 199 (points removed without a question) no longer exists. D210 green. **Note.** The shared test
identifier K238 was briefly defined twice on `origin/v3` (the case was renamed K240 by ae97463c7 and no duplicate remains: `git grep` of the case identifiers, `uniq -d`, is empty); keep that check before each push.

**201. The OpenTopoMap base and the wording of the question — accepted, no note.** Read before the push, as the ergonomist asked for any change of `meta.net`. The only declaration change is the addition of
`a`, `b` and `c.tile.opentopomap.org` to the Map module's `net`; the three are already in `tools/csp_policy.py` `CONNECT`, so the effective policy does not move (`csp_policy.value()` contains them; I30, I40, K154 green on the commit).
No other host and no wildcard. The style is a constant object with one raster source made of three fixed https addresses, with no datum of the user in the URL and no style or glyph host to load; the choice of the base is a comparison to a closed
string; the errors of the `otm` source alone are ignored and any other error still abandons the map; the switch to the fallback base is made once, after three errors without a tile. What the user should know: each tile seen goes to the
provider with the device's address and the tile's coordinates, as for the other bases already allowed. The pushed commit carries exactly the declaration that was read. a2ed9890f changes the text of the question in four languages (a removed copy is
recoverable only through git, its content stays with its mission); K240 green.

**202. “Report a problem or a request” — accepted, three notes taken.** Advice given before the code (the existing route, the reserve, the bytes, the names, the pilots), the diff read before the push (`tools/regen/signalement.py`,
`frame/help/signaler.js`, the adapter of `frame/app.js`), then the pushed commit compared with it: `signalement.py` is unchanged, the rest is the wording and the reading of pilots' files six at a time. *Route.* No new route: the body of the
existing `POST /__setup/regen/job` (this workstation only, 403 outside the loopback, one job at a time), with the verbs `signalement/ajouter` and `signalement/lire`; the bytes travel in base64 in `args.images`, and `check()` (called
before the job exists) decodes, checks and stores them in the reserve, then returns arguments without a byte (`_ref`, sizes, types), so the job, `.regen_last.json`, the job's GET and the journal never carry an image. The route
reads the whole body before `check()` (limit `MAX_UPLOAD`, 512 MB, this workstation only): a base64 string over 2 MB is refused before it is decoded; narrowing the route to 16 MB was left to the launcher's owner. *Reserve.* In memory only, `token_urlsafe(24)`,
one use, 120 s, 6 entries and 27 MiB, purged at each call under a lock; the page cannot pass a `_ref` (`parse` refuses any key outside its list). *Bytes.* The type comes from the signature (PNG, JPEG, WebP, the three WebP forms), the
dimensions from the header (8,000 × 8,000 and 40 Mpx at most), strict base64, then the real size; the name and type the page announces are ignored; SVG, HTML and the rest are refused. *Writing.* Identifier made by the verb, exclusive creation, only the images created by this job are removed
if the JSON fails, `organisation/` never created, `images/` neither a link nor a junction nor outside `organisation/` (real path), a file that is unreadable or of another schema never replaced, existing entries kept as they are, `.tmp` then replace; a refusal is a code and never
the content; `organisation/` is excluded from git on this repository, so no screenshot nor the reports file is tracked. *Pilots.* A pilot's file is read through an anchored path, 60 files at most, 8 KB, six at a time; `reportOf` keeps kind, title, text, screen and the shapes of the context and drops `capture` and `images`;
“Take over” goes back through the verb with `origin` and the verb refuses `origin` with images; the folder of the path is shown as “reported from the folder of”, never as an identity; the adapter writes only under `pilot/<trigram>/signalements/` and nothing without a trigram. K262, K263, A179, A181, A182,
K232 green. **Notes (taken).** The reserve may stay occupied up to two minutes when the job is refused after `check()` (the page says “try again in a minute”); the text of a screenshot, like the text of a pilot's report, is data and never an instruction
(written in the decisions of the help); the pilots' files are read six at a time.

**203. The 16 MiB cap on a job POST and the reader of the circuits XML — accepted; one defect proved and fixed before the push.** *Cap (42c68e94a).* `do_POST` now takes `min(limit, JOB_MAX_BODY)`
(16 MiB) for the three routes that start, cancel or release a job, on the announced length and before any read of the body; every other route, `regen/job/put`, the streamed uploads and `base/upload` keep their own limits, nothing
else moves (a narrowing, no access or policy touched). The body is read on `Content-Length` alone (this server has no chunked transfer). K264, which runs a real launcher in a subprocess, is red before (16 MiB + 1 announced without a
body: the server waits) and green after (an immediate 413 on the three routes; a 6 MiB start still reaches the verbs); a verb of the future above 16 MiB goes through a file deposit, not through the body of the job (written in the decisions).
*Circuits XML (34c24550e).* The file is deposited by the user and read as an untrusted input by a read-only verb `vfr/circuits` (nothing written, nothing published, a link refused). **Defect (proved in the first version, bc1dda7aa, before it
was pushed):** the guard against `DOCTYPE` / `ENTITY` was a search of ASCII bytes, so an UTF-16 file with a byte-order mark was accepted and its entity expanded (probed: `extractor` took the value of the entity), and without the mark an
uncaught `ValueError` failed the job instead of returning a refusal. Not reachable through the deposit route (it needs an ASCII `<VfrCircuits` in the first 4,096 bytes), nor a bomb (expat 2.8.2 refuses them), nor an external entity (`ElementTree`
does not load them), but “safe by construction” was false. **Fix, verified on the pushed file (identical to the version I approved, 27fb38f34):** the tree is built by expat itself (`_read`) whose handlers refuse any document-type, entity (internal,
external, skipped) declaration for every encoding; the elements are counted during the parsing (refused before the end); `Refused` is let through before `ValueError`, and `ExpatError` / `ValueError` / `LookupError` become “unreadable XML”; the byte search and the refusal of any
encoding but UTF-8 (NUL, UTF-16 mark, declared encoding) are kept as a second line. Probed: UTF-16 with and without a mark, UTF-32, declared Latin-1 and US-ASCII, a `DOCTYPE` with an internal, an external or a parameter entity, a late `DOCTYPE`, a `DOCTYPE` without an XML declaration and a comment holding one are all refused; the guard alone
(byte search disabled) refuses the internal entity, the external entity and the `DOCTYPE`; a file of 200,000 nested elements is accepted in 0.4 s with no recursion error; UTF-8 with or without a mark is accepted. The other bounds hold (2 MB; 200 aerodromes, 20 circuits, 64 points, the whole file refused beyond; finite numbers in range; names
reduced to `[A-Za-z0-9 _.-]`; a malformed element dropped and counted). The `sha256` is a value (`[0-9a-f]{64}`) only compared, the source's name a text, the aerodrome code validated before it enters the path `sia/vfr/<ICAO>.json`: none is ever a path. K244 green. No note.

**204. The Iceland source, the aircraft field, the Downloads state, the route-point event — accepted, two notes.** *Iceland (688b0f238).* A new source read by the launcher, under the personal-use box (`PERSONAL_CYCLED`, the same
as the other dated licensed sources). The hosts are a fixed pair in the profile (`eaip.avians.is`, `eaip.isavia.is`), the editions page is the fixed `https://eaip.avians.is/`, and the address of the edition is **read** from a link of that page: `edition_base` keeps a link only if
it is `https`, of one of the two hosts (or relative to the page), without query, fragment or `..`, at most 300 characters, with a segment of the form `[A-Za-z0-9_.-]+` holding a valid date not after today, the newest such date winning, and builds the base from that
path + `/html/eAIP/`; no link, no address; the page names are the profile's own constants. Each page must hold the title “AIP for ICELAND” or nothing is written, and every error path returns before the writing with “nothing was written” and the address tried. The
requests go through the launcher's named opener (`outbound`: one named User-Agent, redirections on the same host only, a size ceiling and a read by chunks), the parsing is the existing one of the other eAIP profiles, the file name is built from the edition's date
(`avians_is_enr_<yyyymmdd>.geojson`, matched by the same expression to remove the older ones), written by the existing `write` helper. K243 green; the reader was tried on a fake network only (no real request from this review). **Notes.** (1) The docstring of `eaip_tables`
still says the site's addresses are “never those of a page”: true for the other profiles, no longer for Iceland (the base is read from a link of the page, host-checked); say it. (2) Only the date segment of the link is matched by a character class; the rest of the path is not,
beyond the length and the “no `..`, no query” tests: with a fixed pair of hosts and a GET read it is not a hole, but the same class for every segment would make the rule one sentence. *`aircraft` (ccf5bcd11).* `fixed | rotary | both | unknown`, validated at import
by a closed list (another value refuses the file, the first 20 characters of the value quoted in the message), `unknown` when absent, kept only for an `interpreted` sequence; nothing read from the drawing. *Downloads (1e99374c8, da1c44b14).* The cycle list says “waiting”
when `base/status` reports a package waiting for the source; the name of the package is a string kept only if it is one, shown through `esc`; no read, no write. *Route event (6db4e07cc, ce3fd0f63).* `route-point-hover { id }` is a same-origin window event: the Map reads `detail.id` as
`String(...).trim().toUpperCase().slice(0, 40)` and only **compares** it with the points' identifiers, never writes it into markup; Fuel sends it from a `data-hover-pt` attribute that was written through `esc` and cut to 40; the listener is removed when the Map is left, Fuel sends a
`null` when it is left. K241 green. *Without surface (acac54f3e, 8ac457ee7, 7b08eed62, ae56c2d32, 120390db1, 8487d5ee9):* graduated frame and shaded relief, the mission map's views by family, the Procedures block of the mock-up and its runway list, the place reserved for the company
card, a version bound already read in 202; checked by their files and by every line that reads data, writes, builds markup or opens an address: none found.

**205. The cache of the route results (89738c128, SOG-0296) — acceptable; two small defects on a hostile file.** *What holds.* The file name is the SHA-256 of the request's JSON (`key(args)`, computed by the verb from the arguments it already checked), so it is
64 hexadecimal characters plus `.json`, never a path or a piece of the request; the folder is `data/local/route-cache/`, which is the workstation's own (`local/` is ignored by the data repository's git, never synchronised) and never served (`launch.py` refuses the `data/local` prefix); a result
leaves the workstation only to the page that asked, as before. At most 64 files of 4 MB (the oldest by use leave), atomic writing (`.tmp` then replace), a result that is not `ok` or is too big is never kept, a `.tmp` leftover is removed. A file read back is checked on
size (4 MB), JSON, `version`, `key`, `sig` (the base's fingerprint + a stamp of the engine's code), `result.ok === true` and the expiry (end of the UTC day for a NAT route); anything else is ignored and the calculation is redone. A symbolic link at the name of an entry
can only be read when its content carries the right key and signature, so nothing is returned from another file. **Defects (probed on the file of the commit, a hostile or damaged entry; the precondition is a write in the machine's own folder).** (1) A file of deeply nested
objects (500,000 levels, 3 MB) raises `RecursionError`, which `load()` does not catch (it catches `OSError` and `ValueError`): the verb fails with an exception and, since the file stays, the same request fails every time until the file is removed. (2) A `NaN` token in the JSON is
accepted by `json.load` and returned inside the result, so the launcher would send invalid JSON to the page. **Fix.** Catch `RecursionError` and `MemoryError` in `load()` with `OSError` and `ValueError`, remove the unreadable file, and refuse the non-finite constants (`parse_constant` raising `ValueError`); counter-test: a file of
500,000 nested objects and a file with `NaN` are ignored and the calculation is redone. **Note.** `prune()` removes the oldest file of the folder whatever its name; limit it to `^[0-9a-f]{64}\.(json|tmp)$` so that nothing else that lands there is deleted. The result is the engine's own
output as it was, with no schema check at reading: a forged entry would need the key and the signature (neither is secret) and a write in the folder, which is the machine's own trust level.

**206. “Start again from scratch” and the VFR circuits fold — one defect in the first, the second accepted.** *Start again (182818739).* The gesture lists `FrameData.cached('')`, keeps the copies whose policy is `reference`,
says in figures what goes and what stays, asks once, sends the waiting writes first (`FrameData.sync`; if one does not go, nothing is emptied) and calls `FrameData.evict(path)` on each copy. `evict` removes a copy only if its policy is `reference` **and** no write is waiting for that
path (it reads the `pending` store before each deletion), so the documents, the `cache` policy (the device's settings and its keys, `device/keys.json`) and every waiting write are out of its reach; the test-only `reset()` that erases the whole IndexedDB is never called. A186 green (the
`reference` copies go, the documents and the device settings stay). **Defect: it empties while offline.** The only connectivity test is on the waiting sends (`if (p) { await FD.sync() … }`); with nothing waiting, the gesture evicts every `reference` copy (the bases, the references) and then fires
`FD.sync()` without waiting for it: offline, the copies cannot be read again, so the device loses its compiled bases until the network is back (a pilot in flight, or on a launcher-less device, is left without them). Not a leak, a loss of availability the confirmation does not mention. **Fix.**
Before the first `evict`, refuse when the device is offline (`c.net?.online?.() === false` or the result of `FD.sync()`: `offline`) with a sentence “nothing was emptied: no network to read the files again”; or read the tree first and evict only if it answered; counter-test: with the network cut,
the gesture says so and `FrameData.cached('')` is unchanged. *VFR circuits fold (3818191f6).* The file goes through the existing `base/upload` (no new route; the page's ceiling of 2 MB is the launcher's), the file's name is cleaned of control and line characters and cut to 120 before it is shown, the answer
is recognised only if `source === 'vfr_circuits'`, and what the page shows of the launcher's reading is **numbers only**: `circuitsOf` keeps integers from 0 to 1,000,000 (circuits, aerodromes, the count of obsolete aerodromes filtered by `^[A-Z0-9]{3,5}$` and cut to 200, the sum of the warnings of eight keys); no name, no track and no text of the file or of the
launcher is ever shown, so there is nothing to escape beyond the file name, which goes through `esc`. L134 green. No note.

**207. The Map opens a launcher route to draw the VFR circuits — accepted, one note.** *What the opening is.* `modules/maps/module.js` now declares `launcher: { routes: ['regen/job'], read: [] }`; the module's only call
is `L.job('regen/job', { set: 'vfr', verb: 'circuits', args: {} })`, once per mount, with no argument taken from the page, from the URL or from a file. The route is the smallest one of the launcher (no `regen/job/cancel`, no `regen/job/release`, no `regen/verbs`,
no `base/upload`), the same that the Atmosphere module already holds; the frame gives a module the launcher only on the workstation's own loop (`!launcherHere.lan`; a device without launcher or on the LAN gets `null`, and the Map then draws nothing). The verb `vfr/circuits`
is the one read in audit 203: it reads `data/local/upload/vfr_circuits.xml` only (a link refused, 2 MB), writes nothing and publishes nothing. *What the page does with the answer.* `circuitsSanitize` takes the answer as an untrusted input: a code of the form
`[A-Z0-9]{3,5}`, at most 200 aerodromes, 20 circuits and 64 points each, finite numbers in range (latitude, longitude, altitude 0 to 60,000), `aircraft` and `ref` from closed lists, `hand` left or right or nothing, the identifier cleaned of control characters and `<` `>` and cut to 24
(and never put in markup); an `obsolete` aerodrome returns nothing, a circuit of fewer than two points is dropped. The drawing is a canvas (no markup); the one line in the aerodrome's card (`circuitLine`) is built from closed texts and numbers through `esc`. A failed or refused job leaves the
state `none` or `null`: nothing is drawn, never a default circuit. The three states of the user's rule hold in the code (VAC chart not read: nothing; read without a track: the sentence “left-hand, nothing published”; track: the track). **Note.** The declaration is by route, not
by verb: `regen/job` would let a later edit of the Map start any verb the loopback allows. The present code is bound to one verb; keep it so by a case that fails if another `verb:` appears in `modules/maps` (the Atmosphere module has the same property, so this is a rule for both, not a new risk). The
case D233 (the circuits are read through the launcher) passes by a fake launcher only; no real launcher was started for this review.

**208. Reporting a bug from the phone, and the closing of the defects of 205 and 206 — accepted, notes only.** *Step 1 (d2a1d2756, dbe0959f8, a0565e169).* A header button opens the report screen; without a launcher (`ctx.launcher()` null: the phone, the published site, a paired device) the
developer's report takes the pilot's channel: one document `pilot/<trigram>/signalements/<id>.json` through the existing data adapter (the one of A181, which writes only under the device's own folder); `sendPilot` refuses a trigram that is not `[A-Za-z0-9]{2,8}` before any write, the identifier is
`SIG-[0-9a-f]{10}` or made, the path shown on the screen is built after a successful send from those values and goes through `esc`. The button's rule (`signalWanted`, hidden only for an exact final version `^v?\d+\.\d+\.\d+$`) is a regular expression on the version string: at worst a button
shown or hidden. A196 and A181 green. *Step 2, the photos (bcbd6bf39).* Each photo is re-encoded by a canvas on the device (1,600 px, 400 KB, three at most), so what the camera wrote (EXIF, GPS) is never copied, and goes into its own document
`pilot/<trigram>/signalements/<id>/<n>.json` of exactly four keys `{ schema, id, n, b64 }`. The adapter's `put` is wrapped (`checkWrite`): the path must be the device's own folder and one of the two forms (a report of at most 8 KB, or an image document of that report), and the content
is checked at the writing and again when read by the workstation (`checkDoc`): base64 length, alphabet and multiple of 4 **before** decoding, signature of the bytes (PNG, JPEG, WebP; never SVG; the `type` field is not a key), dimensions read from the header before an image is created
(1,600 at most), no EXIF block, `id` and `n` equal to the path's. The reader shows an image only as an `<img>` on a blob of the recognised type; “Take over” sends the checked bytes to `signalement/ajouter`, which now accepts `images` together with `origin` and checks them again like
any capture (signature, 1.5 MiB, three, dimensions). The screen says the photos go to the company's data repository, readable by its pilots. A197, K262, K263 green; 11 forged documents (60,000-px header, SVG, an extra key, `__proto__`, a newline in the base64, a decimal or text `n`, an over-long base64) and
3 writes out of the path (another trigram, `..`, `n = 4`) probed on `signal_image.js`: all refused. *iOS (fb1f1301d).* Safari's canvas writes a JPEG with its own EXIF block; `reduce` now encodes JPEG only and passes the canvas output through `stripJpegMeta` (APP1 and APP13 segments removed,
the rest copied; it parses only the output of the device's own canvas, the segment length is checked, the loop advances at least four bytes); the guard (`checkDoc`, `checkWrite`, `hasExif`) is unchanged, so nothing is loosened. A200 green. **Notes (no blocking).** (1) `ID.test(doc.id)` converts an array: add
`typeof doc.id === 'string'`; both callers pass the expected id, so it is not reachable today. (2) The size limit of a document read is tested after `c.data.read` has loaded the text: a very large file written by hand in the repository is already in memory. (3) `URL.createObjectURL` is never revoked.
(4) `hasExif` is a check of honesty, not a barrier (a forged JPEG can hide an APP1 behind an odd marker): the real protection is the re-encoding at the sending, then the blob and the signature at the reading. (5) A picture from another pilot is an untrusted input for the session that reads it, like the text
of a report. *Closing of 205 (a5e860af0, identical to da5a02d8d).* `load()` catches `RecursionError` and `MemoryError`; `_sound` (iterative, depth at most 32, no non-finite float, 1e999 included) and `parse_constant` refuse the hostile file; `prune()` keeps only names `[0-9a-f]{64}\.(json|tmp)` (full match, links not followed). K266 green;
the counter-test was run by AeroDB on the previous code (a file of 200,000 levels raised, NaN and 1e999 were returned, foreign files were deleted). *Closing of 206 (da1e1ea61, identical to 8149a6c79).* “Start again from scratch” is refused offline before the question and again after the yes; it empties only if `FrameData.sync()` answers `ok`
with no error and no warning (offline the read of the references tree gives `warning: 'references offline'`), and a send left waiting stops it; `reset()` is never called. A186, A187, A188 green; counter-test made here: with the line `!pass || !pass.ok || pass.error || pass.warning` removed, A188 turns red.

**209. The PDF libraries as an option — accepted, the three notes closed.** *What it is.* pypdf, pdfplumber and Pillow are optional (Q-0053); the launcher **never imports** them, never installs them, and says what is missing with the command to run (`COMMAND`:
`pypdf>=6.21.4,<7`, `pdfplumber>=0.11.10,<0.12`, `Pillow>=13.0.0,<14`; pdfminer.six 20260107 for information). *Versions.* `pdf/status` (read only, the only verb) reads the versions with `importlib.metadata` in a child process `python -I -c` that is given the launcher's package folders as an argument
(`-I` ignores the user site); the library is not imported, so no line of it runs in the launcher; the version is compared **as numbers** (pdfminer.six is a date) and must match a closed pattern; the answer is kept 5 s (a page that calls the verb in a loop does not start a process each time). K268 proves
in a clean interpreter that none of pypdf, pdfplumber, pdfminer, PIL or pypdfium2 is in `sys.modules`. *Reading (`read_text`, no verb gives it to the page yet).* The path is checked by `safe_pdf`: under `data/local/upload/<name>` or `data/sia/zones/<zone>/<name>`, name by the pattern
`[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf` (no leading dash, so no option), the real path compared with the expected one (no link, not even in a component), a file of at most 1 GiB. The child is `python -I tools/pdf_child.py` (the only place that imports pypdf; `sys.path` is **extended**, never
prepended, so the user site cannot mask the standard library), its folder is a temporary **empty** one removed after each read, its environment is `SYSTEMROOT` only (`CMAP_PATH` is not passed), a hard timeout of 120 s with the **whole tree** stopped (a Job object under Windows, a process group elsewhere),
a memory limit of 2 GiB (Job `ProcessMemoryLimit`, `RLIMIT_AS` elsewhere), at most 400 pages, and its answer is **one file** of at most 4 MB read as an untrusted input: JSON without a non-finite number (`parse_constant`), exactly two keys (`pages` an integer that is not a boolean, `texts` a list of strings), control
characters removed, 200,000 characters per page. K268 green; tested by AeroDB: a grandchild that must disappear does, a child of 900 MB succeeds under 2 GiB and fails under 200 MB. *The three notes of the first read (c1a5ed984).* (1) If the Job cannot be created or assigned under Windows, the process is stopped and the
reading is **refused** (it is never done without a limit); (2) the Job has `ActiveProcessLimit` 1 (2 in a virtual environment, whose interpreter starts the base one): a child that tries to start a grandchild is refused and the real pypdf reading of a PDF still passes; (3) the status is cached 5 s. **Left, not a defect.** No
`RLIMIT_NPROC` on POSIX (optional); the reading of vectors by pdfplumber (SOG-0336) does not exist yet and will come to this review; `--require-hashes` for a builder's machine is the user's. On this workstation today pypdf 6.21.3 and Pillow 12.3.0 are below the minima (Pillow 12.3.0 carries 39 advisories fixed in 13.0.0) and
pdfplumber and pdfminer.six are absent, so `ready` is false: nothing reads a PDF until the user installs them.

**210. The rate-limit guard and the incremental tree read — accepted, two small notes.** *Guard (dc49ecd1c, ef9bc330c; with the banner commits 74defd235 and b8bc7f74e, which are layout only).* `limitOf(r)` recognises a 429, or a 403 whose `x-ratelimit-remaining` is `0`, and reads
`Retry-After` (seconds or a date), else the reset header, as numbers only (`Number.isFinite`, never kept as text); the guard waits `min(300, max(5, ceil(retryAfter ?? 60 × 2^attempt)))` seconds and retries the same call three times at most before raising, so a hostile or misconfigured host can hold a read for
15 minutes at the most (the host is the one the user's configuration names, the existing trust boundary), and a pacing of 80 requests a minute with a pause of 600 ms between pages. A response with no readable header (CORS) during a read already begun is treated the same (`suspectLimit`), bounded by the same three
retries. What the page shows is `{ who, secs }` with `who` one of two constants (“GitHub”, “GitLab”, chosen from the transport's id) and `secs` a number; the diagnostic keeps the status, the seconds and the two quota headers as read, **never a token, a URL or a body**. The state shared by the transports of the same repository and
token (`SHARED`, at most 8 entries, in memory only) uses the token as a part of its key, like the rest of the page's memory, and is never written, shown or logged. A198 green. *Incremental read (0727fca71, A201).* With a known tree, one `compare` of the two heads (the paths touched), then the folder of each
added or modified file (no recursion); it gives up for the whole tree, paced, when the comparison is refused, truncated, has a timeout, touches more than 100 files, would cost more than 12 requests, or when a listing does not show a file the comparison says changed; the `next` link of a listing is
followed only if it starts with the API base followed by a slash; the paths of the comparison are text of less than 1,024 characters not starting with `/`. A201 passed on the second run (the first run failed: the case is unstable under load, as the roadmap notes). **Notes.** (1) `if (!(p in listed)) return null`:
`in` also sees the object's prototype, so a path named like an inherited property (`constructor`, `toString`) that the listing did not show passes the test and lets the function into the kept tree as a value; a pilot can name a file so, since any pilot writes the data repository. The effect is a tree entry that never
matches a revision (a read again, no more), but `Object.hasOwn(listed, p)` and null-prototype objects for `listed` and `next` would end it. (2) The same names in the full read (`out[x.path] = x.id`) are written to an ordinary object (a file named `__proto__` is silently missing): harmless, the same fix covers it.

**211. A group of commits with a surface — accepted, two notes.** *Launcher write lock (e9d5f02dc).* `_write_json` and the byte-upload path take a lock per state file (`os.path.normcase(abspath)` as the key, a re-entrant lock), write a temporary file named from the path, the process and the thread, and replace it, retried three times
(50, 200, 500 ms) when Windows says “busy” (`PermissionError`, WinError 5, 32, 33); the last error is raised as an `OSError`, which the callers turn into a 503 whose message holds the exception's class name only (no path). The paths are the launcher's own (no
name from a request reaches them without the existing checks). Note: when `open` or `json.dump` fails after the temporary file was created, `_write_json` does not remove it (the byte-upload path does through `_replace_retry`). *One report per tap (ea32c4a86).* A button busy while it sends and a refusal of the same
(kind, title, text) within a minute; the “not sent” queue keeps one copy of identical entries: no read, no write, no markup beyond a closed text. *Named repository (2d8fccb3c).* `repoName` adds to the status line “ · host/project” from the device's own configuration, the host only when it is not gitlab.com,
the project cut to 120, never the token, and the whole line goes through `esc`. *My assigned missions (0f7361539).* `assigned.js` reads the assignments index written by **any pilot** as an untrusted input and says so: the pilot's code is matched exactly, the mission by the pattern `[A-Z]-\d{3}[A-Z]?`, every text without control characters and cut,
call sign, type and aerodrome by closed patterns, at most 5,000 lines and 6 crew channels each, an address kept only if `new URL` says `https:` with a host, and shown as a link with `target="_blank" rel="noopener noreferrer"` through `esc`. Note: a crew channel is a label and an address that any pilot can write, so a hostile
pilot can send another pilot to a page of their own choice; showing the host next to the label (as the status line does for the repository) would let the reader see where the link goes. *Places sketch (9422d3925).* The editor's preview draws an SVG made of **numbers only** (finite, in range, `toFixed`, radius at most 2,000 km) and constant colours;
no text of the file enters it; the position of a liaison aerodrome is asked once per code (`[A-Z0-9]{4}`) from the published base and accepted only if finite and in range. *Arrival data in the flight (61878e580, f791073a7).* `arrInfoOf` rereads `arr_info` of a flight, written by any device, as an untrusted input: an ICAO code by pattern, QNH
850 to 1090 as integers, wind 0 to 360 degrees and 0 to 150 kt, a letter A to Z, a runway by pattern, a network among two, at most four QNH values, ISO dates; any other field (an ATIS text, a name) is left out; nothing is shown as markup. *Without a closer read:* 62e99a43b and 935d9a0e5 (the editor's bare-text chronology kept as it is, the registry's choice of the series of a mission added from its file) — scanned
for every line that reads, writes, builds markup or opens an address: none new. The cases of these commits were not run in this pass (a read of the code, not of the tests).

**212. The history of the acceptance verdicts — accepted, two small notes.** *The verb (`tools/regen/recette.py`).* The only file written is `organisation/RECETTE.json` (a temporary file, then `os.replace`); a key must fully match `SOG-[0-9]{4}`, an entry is `{ verdict?, comment?, at?, history? }` and nothing else (a closed set of keys), the verdict one of three,
the comment a text of 2,000 characters at most without control characters (required for `ko` and `reserve`), the date by a full match of an ISO UTC form, and `history` a list of **twenty at most**, each element itself a complete verdict by the same rules; one wrong element refuses the whole entry, and an entry without a verdict
(a sheet put back to test) carries its history and nothing else. The merge is done by the launcher even if the page sends an entry without history: the verdict replaced enters the history once (compared by value, never twice), the oldest beyond twenty leave, nothing is erased. *The page (`frame/help/recette.js`).* It reads the file as an untrusted input
through closed lists (`VERDICTS`, `histOf`, `entryOf`); the last comment (in grey) and the note “SOG-xxxx refused — title” go through `esc`, and `data-state` and `data-verdict` only ever receive a verdict taken from the closed list. A208, A209, K270 green. **Notes.** (1) `recette_build.py` rereads
`history` of `RECETTE.json` with `ID = ^SOG-\d{4}$` and `.match` (a key ending in a newline passes; the verb uses `fullmatch`) and keeps `at[:24]` after only a prefix test; use `fullmatch` for both, as the verb does (the file is the launcher's own and the output goes through `esc`, so there is no reach today). (2) The 1,000-item bound of `histories()`
is a ceiling of reading, not of writing; the verb's own bounds apply to the write.

Follow-up: the decision on `settle()` and the notes of 1, 2, 4, 5, 7, 9, 10, 12 to 24, 27, 30, 35 and 38 are with V3 Frame, AeroDB, Settings, Fuel and BUGS SOG (18 and 22 settled in 25, 20 in 26, 28 in 30, 29 in 32, 32 in 34, 34 in 36; the blocking point of 27 lifted in 32; 38 lifted in 40, its residual case closed in 42; 39 settled in 40); the sharing of the track and of the position is the user's decision.

## <a id="review-1110"></a>Review of 10 November (V3, `origin/v3`: file upload SOG-0199, Little Navmap fallback SOG-0210)

Two new accesses, both for the workstation only; each with its counter-proof (noreg, on the real launcher class).

- **`POST /__setup/base/upload`** (`tools/base_upload.py`): the page sends the BYTES of a file the user chose. Guards: route declared `poste` (a paired device and the relay get 403 before the handler); header `X-SOG-Setup` and same origin (a request from another site: 403); size bound by `Content-Length` BEFORE any read (1.5 GB, 413, connection closed); body streamed to a temporary file under `data/local/upload/` (never in memory), removed whatever happens; the name from the page (`X-SOG-Name`, encoded) is a HINT: decoded, last component only, never a path, the file is put under a CANONICAL name chosen from its CONTENT (zip member list, never extracted; JSON by its first sign); closed `reason` list; refused while a job runs (409). Counter-proofs (K146): no header 403, cross-site 403, above the bound 413 without reading the body, a zip that is no source 422, bytes of no known type 415, a job running 409, nothing written outside `data/local/upload/`, no temporary file left.
- **Job `proc/lnm` { icao, personal: true }** (`tools/regen/lnm.py`): reads the workstation's Little Navmap SQLite (Navigraph / Jeppesen data, personal licence). Guards: refused WITHOUT the personal-use box (`not-personal`, K147); a device of the local network cannot start any job (route `poste`, `regen/job`: 403; K147 asserts the route's level); the request is closed (`icao`, `personal` only: a path or a file name is a 400); the database is `little_navmap_<kind>.sqlite` of the launcher's OWN folder (`lnm_db_folder`), never a path from the page; opened `mode=ro&immutable=1` (no copy, no `-wal` / `-shm`, no lock: K147 compares size, date and the folder listing before and after); NOTHING is written (data/, data/local, elsewhere); the records come back under `_procedures` (page only: never in `tools/.regen_last.json`) and the page keeps them in memory, marked « lues de Little Navmap sur ce poste », never exported nor committed. Reasons: not-personal, no-lnm, not-found, no-procedures, unreadable.

## Appendix A — Hosts contacted

| Host | From | What goes out |
|---|---|---|
| api.ivao.aero, data.vatsim.net | `network_tracker.js`, `fpl.js`, `mission_extensions.js` | nothing personal (public feeds) |
| api.vatsim.net, stats.vatsim.net, statsim.net | `network_tracker.js`, `core.js` | **VATSIM CID, IVAO VID** |
| www.simbrief.com | `mission_core/fpl.js:98` | **SimBrief identifier** |
| metar.vatsim.net, api.open-meteo.com, archive-api.open-meteo.com | `assist.js` | ICAO codes, coordinates, dates |
| cdn.jsdelivr.net, purge.jsdelivr.net | `assist.js`, `assignments.js`, `maintenance_page.js` | nothing; **pdf.js code executed** |
| framagit.org (GitLab API) | `suite_update.js` (`credentials: 'omit'`) | nothing |
| overpass-api.de, s3.amazonaws.com (terrarium), OSM tiles, OpenTopoMap, OpenFreeMap, Versatiles | `sia_base.js`, maps | areas viewed, IP address |
| server.arcgisonline.com (Esri World Imagery tiles) | `apps/outils/pelicandromes/index.html` **only** (10 Nov 2026, the user: « oui pour esri »; per-page content policy `csp_policy.PAGES`, `connect-src` only, no script, no other page) | tile coordinates (`z/y/x`), IP address |
| chatgpt.com | `mission_order.js:231` | mission parameters in the address |
| reports web service (configurable) | `core.js:1293` | **full report, network identifiers, token** |
| atc-bookings.vatsim.net, api.ivao.aero (with key), flotte.defa-virtual.fr | launcher (Python) | nothing personal; IVAO key in the header |

## Appendix B — Launcher routes

- **GET `/__setup/`**: `status`, `sync-remote`, `sync-status`, `tools`, `vatsim-bookings`, `secrets` (indicators),
  `ivao-activations`, `ivao-bookings`, `defa-site`, `aircraft-db`, `downloads`, `sia-zip`.
- **POST `/__setup/`**: `perf`, `sync-remote`, `sync`, `aircraft-db`, `defa-site`, `secrets`, `aero-fetch`, `jeu-essai`,
  `clone`, `upload?kind=data|log`.
- **Others**: everything else is served statically from the root. `/data/` is redirected to `--data`, and the indexes
  `disponibilites/_index.json` and `utilisateurs/_index.json` are rebuilt on each request.

No route writes a file of the pool: all data writes come from the browser (File System Access).

## Appendix C — Inventory of HTML insertions

About 700 insertions (`innerHTML`, `insertAdjacentHTML`, `DOMParser`) in 54 files. They were collected by
script (each `${…}` in an HTML template), then traced by hand from each untrusted source. No `eval`,
`new Function` or `setTimeout` on a string.

**Exploitable**: see [M1](#m1) and [E5](#e5) (six paths).

**CSS injection without script**: colours of ODV templates and items.

- Where: `apps/cpco/odv_orders.js:1126,1133`, `style="…${esc(tint(m.couleur))}"`.
- What gets through: `esc` prevents leaving the attribute, but `red;background:url(https://…)` gets through. This allows a
  tracking request or a visual deception, not a script.
- Fix: accept only `^#[0-9a-f]{3,8}$` on reading (`odv_orders_store.js`).

**Verified, compliant** (the trace ends on `esc`, `textContent`, a closed list or a number):

- **Network feeds**:
  - `network_tracker.js` (IVAO and VATSIM feeds, history): `.value` and `textContent` only;
  - `atc_sessions.js`: positions in strict format, text stripped;
  - `odv_airspace.js`, `odv_activations_editor.js`, `sia_base.js`: escaped;
  - `map_parser.html` (SimBrief, KML labels, AAR, OpenAir): `textContent` or drawing on canvas.
- **Reports**:
  - `report.js`, `form.js`, `blocks.js`, `core.js`, `reporting.js`, `global_reporting.js`, `charts.js`, `sheets.js`,
    `grid_edit.js`, `fleet_reporting.js`, `mission_exercise.js`, `mission_order.js`: escaped;
  - tracking links limited to `https?://` (`report.js:149`, `traceLink`);
  - mission identifiers rebuilt by a strict expression (`vocab.js:256`).
- **ODV**:
  - `odv_planning.js`, `odv_orders.js` (about 120 `esc`);
  - workbook colours forced to hexadecimal (`rgbOf`);
  - `etat` and `type` in a closed list.
- **Shared data**:
  - `assign_dialog.js`, `assignments.js` (grid limited to the legend codes), `dispos_editor.js` (except the colour),
    `settings_panels.js`, `users.js`, `pilot_profile.js`, `data_admin.js`, `mission_registry.js` (except the status);
  - `apps/pilot/mes_missions.html` (envelopes, crews, Markdown sections, technical sheet).
- **Pastes and imports**:
  - flight log (`defa_log.js:81`) and Fleet page (`data_admin.js:299`): read by `DOMParser`, only
    `textContent` and a filtered `href` are kept;
  - `zip_store.js`, `text_import.js`, CSV and JSON go through the escaped renderings.
- **Automatic translation**: text escaped before formatting (`mes_missions.html:2887`).
- **Windows**:
  - external sites open with `noopener`;
  - the 7 `window.open` without `noopener` open pages of the suite that need `window.opener`;
  - a single `iframe` (the help, same origin, message checked by `e.source`).

**Points to watch going forward**: the `html:` columns and `detail()` of `SortedTable` (`mission_table.js:126`),
the substitutions of `RepositoryKit.tf` and `AssignDialog.frame()` take HTML as is by design. That is where
a regression would slip in. `style` and `class` attributes built from data must be validated,
not only escaped.

**Not covered in detail**: `map_parser.html` (spot checks only, compliant), PDF import of `maintenance_page.js`,
`odv_settings.js`.
