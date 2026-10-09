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
| E6, E7, M3, M4 | to do (batches 5, 7, 9) |

Choices made while fixing:

- **Git hooks kept.** `core.hooksPath` is not neutralised: the Git LFS hooks need it to
  send the files. The danger came from the `.git/` received in an archive, which is no longer extracted.
- **Navigations coming from another site refused.** The launcher renders an explanatory page with a link to the home page,
  never to the requested address.
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
