# Security audit — 7 October 2026

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

Follow-up: the decision on `settle()` and the notes of 1, 2, 4, 5, 7, 9, 10, 12 to 24, 27, 30, 35 and 38 are with V3 Frame, AeroDB, Settings, Fuel and BUGS SOG (18 and 22 settled in 25, 20 in 26, 28 in 30, 29 in 32, 32 in 34, 34 in 36; the blocking point of 27 lifted in 32; 38 blocking before any exposure); the sharing of the track and of the position is the user's decision.

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
