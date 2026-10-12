# Data index: IndexedDB, replication, expiry, conflicts

Proposal of 5 October 2026 (branch `feature/index-idb`). Follow-up to the performance audit
([perf/PLAN_PERF_2026-10-04.md](perf/PLAN_PERF_2026-10-04.md)): the breaking points under growing load are the
browser registry (storage quota, ≈ 2,000 to 4,000 missions), the report registry read in full (≈ 2.5 s at
20,000 reports) and the ODV grid.

## 1. Principle: the files are authoritative, the index is rebuilt

| Role | Where | Rule |
|---|---|---|
| **Source** | files in `data/` (YAML, JSON), shared through git | the only truth; readable, comparable, mergeable text |
| **Index** | IndexedDB, database `defaIndex` | **derived**: an organised copy for fast reading; can be discarded and rebuilt at any time (Settings › Maintenance › Caches) |
| **Outbox** | IndexedDB, store `outbox` | what exists so far only in this browser (unsaved availability, report drafts, writes refused for lack of a folder); never mixed with the index |
| **Preferences** | localStorage | small interface settings (language, design, filters): unchanged |

Consequence: an index never creates a conflict on its own. Conflicts only exist between **two file
writes**; the index merely follows.

## 2. What is indexed (where it is relevant)

| Store | Key | Secondary indexes | Source | Replaces | Why |
|---|---|---|---|---|---|
| `missions` | `id` | `family`, `status`, `folder`, `generatedAt` | `data/missions/**/mission*.yaml` + tracking (§ 6) | `missionRegistry:v1` (230 KB, growing) | storage quota; the estimate and the lists read a mission by its id |
| `reports` | `key` (family\|id\|date) | `family`, `year`, `missionId`, `date`, `pilots` (multiEntry) | `data/cr/missions.yaml` then `data/cr/<année>.yaml` (§ 7) | `missionCoreLedger:v2` (whole text) | reporting by period, mission → report link without re-reading everything |
| `assignments` | `[mission, pilot, role]` | `pilot`, `day` (yyyy-mm-dd), `mission`, `[pilot, day]` | `data/missions/affectations.json` | full read on every page | My missions: a pilot's week; ODV: grid by day (end of the pilots × slots × assignments cost) |
| `availability` | `[pilot, week]` | `week` | `data/disponibilites/<TRI>.json` | `pilotAvailability:v1` | ODV grid by week |
| `readMarks` | `[mission, pilot, at]` | `takeoff` | local | `assignmentsRead:v1`, `pilotPlis:v2` (never purged) | expiry (§ 4) |
| `files` | `path` | — | metadata of the files read | `missionRegistryScan:v1` | signature of each source (§ 3) |

**No index** for: preferences, hand-overs between pages (handoffs), the SIA database (already in IndexedDB, database
`sia-map-parser`), performance profiles (60 KB, read in full by a single page).

## 3. Replication: file → index, one way only

- **Reading**: for each source file the index keeps its **signature** (`lastModified:size` via the authorised folder;
  `Last-Modified`/`ETag` via the launcher, with a conditional request → 304) and the hash of its content. A page reads
  the index straight away, then **revalidates**: if the signature has changed, only that file is re-read and re-indexed
  (like today's incremental re-reading of the registry, generalised).
- **Writing**: the **file is written first** (under a lock, § 5), then it is re-indexed from what was written.
  The index is never written "ahead" of the file.
- **Revalidation triggers**: page opening, return to the tab (`visibilitychange`), message from another
  tab (BroadcastChannel `defa-data`, already in place for assignments, extended to the registry and to reports),
  "Re-read" button.
- **Without a server** (`file://`): same rules, the signature comes from the authorised folder (File System Access).

### 3.1 Pool files read by signature (done)

The folder indexes carry the signature of each file: `data/disponibilites/_index.json` (`at`: week →
`updated_at` of the week's file; `legacy_at`: old `<TRI>.json` file) and `data/utilisateurs/_index.json`
(`updated_at` of each card). The launcher rebuilds them **on every request** (files changed by git, another workstation
or an editor: the signature tells the truth); a page that writes updates the entry of the file written. The page reads
the folder index (one request), then `MissionAssignments.readIndexed(fichier, signature)`: the copy in the `files` store
(path, signature, content) is used without a request as long as it has the same signature; otherwise the file is re-read
and its copy replaced. No copy is used for a file from the outbox, a "fresh" read, or without a signature
(old launcher). Without the launcher, the folder index is kept up to date only by the pages' writes: after an
external change (git without the launcher), Settings › Maintenance › Caches › Data index (Purge).

## 4. Expiry

- **No lifetime for correctness**: an index entry is valid as long as its file's signature has not
  changed, no more and no less. The current 60 s delay for assignments becomes a mere **revalidation step** (at
  most one check per file every N seconds); it no longer decides whether the data is correct.
- **Purging what grows without end**: read marks and envelope state erased 6 months after take-off;
  assignment log: index over 12 months (the file keeps everything); report drafts: 90 days without
  modification, with a notification before erasure.
- **Format change**: the database version (`defaIndex` v1, v2…) and a schema version per store; an unknown
  schema → store emptied and rebuilt (never a hazardous migration of a cache).
- **Tombstones** (§ 5): kept for 90 days, then purged.

## 5. Conflicts: three levels, three answers

| Level | Example | Answer |
|---|---|---|
| **Two tabs** of the same browser | registry opened twice, report saved in one tab while another is open | Web Locks lock per file (`defa:<chemin>`) + BroadcastChannel message after writing: the other tab updates itself. **Today the report registry has neither a lock nor a re-read**: a tab left open overwrites the reports saved by another (fixed first, step 1). |
| **Two workstations** on the same folder (Synology, OneDrive) or two launchers | two people from the Centre assign at the same time | **conditional write**: the file's signature is remembered at read time; under the lock, the signature is re-read just before writing. Unchanged → write. Changed → **record-level merge** (below), then write. |
| **Two copies** brought together by git | two pilots pushing `data/` | finely split files (one file per mission, per pilot and per week, per report year) so that git merges on its own; records written one per line or per stable block; append-only logs. |

**Record-level merge** (three versions: *base* = what I had read, *mine*, *theirs* = the current file):

1. each record carries `id`, `updated_at`, `by` (and `rev`, a counter) — **to be added to reports**, which today
   only have one date for the whole file;
2. record modified on one side only → that side is kept; added on both sides with different ids → both
   are kept;
3. **same record modified on both sides** → a real conflict: no silent overwrite. The most recent version
   is written, the other is kept in `data/<…>/_conflits/<id>_<date>.yaml` and a floating notification offers
   to compare and choose;
4. deletion → **tombstone** (`deleted: true`, `deleted_at`, `by`) instead of removal: without it, a
   deleted record would come back through the other copy.

The merge base (the version read) is kept in the index (`files.base`), which allows the three-way merge without
git history.

## 6. Centre fields on missions (status, notes, flight, linked reports)

Today they only exist in the browser (`missionRegistry:v1`) and in `mission_registry.yaml`, **written but
never re-read**: a cleared browser loses them, another workstation does not see them. Proposal: a small file
`suivi.yaml` in each mission's folder (like `affectations.yaml`), re-read and indexed; `mission_registry.yaml`
remains a readable export.

## 7. Splitting by year (by the end of the year)

- `data/cr/missions.yaml` → `data/cr/<année>.yaml` (year of the report date) + `data/cr/_index.json` (years present,
  number of reports, signature); only the displayed period is read; the old file is read as long as it exists.
- Same principle for `affectations_log.json` (`affectations_log_<année>.json`) and availability (one file per
  pilot and per week: `data/disponibilites/<TRI>/<année>-S<nn>.json`).
- Switch-over done by a tool (`tools/split_by_year.py`, preview then write), reversible.

## 8. Steps

1. **Fix**: report registry under a lock, re-read before writing, message to the other tabs (data loss
   possible today).
2. `RepositoryKit.idb` → module `shared/data_index.js`: database `defaIndex`, stores, signatures, revalidation,
   rebuilding, purging.
3. Mission registry in the index (end of the quota); warning if a write fails.
4. Assignments and availability indexed; My missions and the ODV read by pilot / week / day.
5. Reports indexed (year, family, mission); reporting by period.
6. Conditional write + record-level merge + tombstones (assignments, reports, mission tracking).
7. Splitting by year (tool + reading), before 31 December.

Each step: audit `tools/perf_audit.html` and bench `tools/perf_scale.html` before / after, report regenerated.

## 9. Synchronisation: git on the folder, or a web service to a central engine

Decision of 5 October: availability, missions (and their assignments, their tracking, their reports),
users and the shared configuration form a **synchronised pool**, centralised (web service) or decentralised
(git). Display preferences remain specific to each browser.

### 9.1 One interface, two transports

`shared/sync.js` exposes `status()`, `pull()`, `push(chemins)`, `onChange(cb)`; the index (§ 3) subscribes to the changes
received, writes (§ 5) call `push` after the file. The transport is chosen in Settings › Installation.

| | **Git on the folder** (decentralised) | **Web service** (centralised) |
|---|---|---|
| Where | `data/` is a git clone; the launcher does `pull` / `commit` / `push` (`/__sync/*`) | HTTPS API of a central engine "on the other side" |
| When | at start-up, every N minutes, after each write (grouped commit), "Synchronise" button | stream of changes since a cursor (`GET /v1/changes?since=`), then on each write |
| Conflict | `pull --rebase`; file in conflict → record-level merge (§ 5, base = git common ancestor), commit of the merge | `PUT` with `If-Match: <ETag>` → `412` if the file has changed → record-level merge, new attempt |
| Identity | commit author = trigram of the logged-in user | session token; roles checked **by the server** |
| Without the launcher | impossible (no git in the browser): conditional write only (Synology / OneDrive shared folder) | possible (the browser talks directly to the server) |

### 9.2 Minimal central engine

`tools/defa_server.py` (Python, standard library):

- **storage**: the files, arranged like `data/` (one can always go back to git), and **SQLite** for the index and the
  change log (a single process writes: this is where SQLite is the right tool);
- **API**: `POST /v1/login` (trigram + password → token), `GET /v1/changes?since=`, `GET /v1/file/<chemin>`
  (`ETag`), `PUT` / `DELETE` (tombstone) with `If-Match`, role checks (`admin_centre` for the Centre's
  writes, the user for their own availability and reports);
- **maintenance** (`/admin`, reserved for `admin_centre`): status, log, accounts (reset a password), purging of
  tombstones, ZIP backup, export to a git repository; started with `python tools/defa_server.py --data <dossier>
  --port <n>`, HTTPS behind a proxy (Caddy, nginx);
- same file format as `data/`: a workstation can switch from git to the web service (and back) without conversion.

### 9.4 Git transport: what has been done (step 8, decisions of 5 October)

- **Triggering**: "Synchronise (n)" button in the header (`shared/sync.js`), no automatic sending; n =
  changes on this workstation + commits to send and to receive (remote repository re-read every 5 minutes). Shown when
  the suite is served by the launcher and `data/` is a git repository.
- **One pass** (`tools/data_sync.py`, launcher routes `GET /__setup/sync-status`, `POST /__setup/sync`): the browser's
  outbox written to the folder, commit of the pool files (`disponibilites`, `utilisateurs`, `config`,
  `missions`, `cr`, `atc`; without the regenerated `_index.json` files or the `_conflits/` copies) **in the name of the logged-in trigram**,
  `fetch` then **merge** (merge, not rebase: history never rewritten), `push`. Report in notifications.
- **Conflicts, card by card**: one card per file (a pilot's week, user, mission…) → the most recent
  (`updated_at`) wins, the other is kept in `<dossier>/_conflits/<nom>.<locale|distante>.<date>` (not
  synchronised) and flagged; `missions/affectations.json` merged per assignment (mission, pilot, role) with three
  versions; `missions/affectations_log.json` (append-only log) combined. Failure in the middle of a merge: merge
  aborted, repository never left half-merged.
- **Known limitation**: `cr/missions.yaml` groups all the reports — in a conflict, the most recent wins and the other is
  kept in `_conflits/` (to be merged by hand); splitting by year (step 7) will reduce these conflicts.
- **Tests**: `python tools/data_sync.py --essai` (remote repository and two temporary copies: crossed changes,
  conflict, merge, receipt); `python tools/launch.py --port 8774 --data <copie>` serves a copy of `data/` to
  try the button without touching the real repository.

### 9.3 Steps (after § 8)

8. `shared/sync.js`, git transport (launcher routes `/__sync/*`), button and status in the header.
9. Minimal central engine: API, SQLite, accounts; web service transport; `/admin` page.
10. `production` mode: login required for missions and the Centre, checked by the server.

## 10. Progress (branch `feature/index-idb`)

| Step | Status |
|---|---|
| 1. Report registry under a lock, merge per report, tabs notified | done (`a33c7f84`, race fixed `c1ffb070`) |
| 2. `shared/data_index.js` (database `defaIndex`) | done (`72be400c`) |
| 3. Mission registry in the index (end of the quota), compatibility copy < 2 MB | done (`72be400c`, `ec676adb`) |
| 4. Assignments and availability indexed | done: declarations (weeks and old files) and user cards read by signature (§ 3.1) — ODV, 2nd opening: 11 requests instead of 114, data at 1.6 s instead of 7.2 s; assignments: a single file (≈ 23 KB, ≈ 40 ms), not indexed (nothing to gain) |
| 5. Reports indexed, re-read only if a file has changed (signature, 304) | done (`c1ffb070`) |
| 6. Mission tracking in `suivi.yaml` (field-by-field merge) | done (`eabd0a6f`); assignments: replacement per mission under a lock (existing) |
| 7. Splitting by year | filed as technical debt (docs/DETTE_TECHNIQUE.md), kept by the "background" session: before 31 December 2026 |
| 8. Git synchronisation through the launcher | done (§ 9.4): "Synchronise" button in the header, author = logged-in trigram, card-by-card merge; tests on copies (`python tools/data_sync.py --essai`, launcher `--data <copie>`) |
| 9. Minimal central engine and web service transport | to do |
| 10. `production` mode | to do |
