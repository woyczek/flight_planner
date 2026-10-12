# Roadmap

Where the suite is going, in what order, and why. Written on 5 October 2026; to be kept up to date at each step completed.
Technical details: [INDEX_DONNEES.md](INDEX_DONNEES.md) (index and synchronisation), [SYNCHRONISATION.md](SYNCHRONISATION.md)
(current architecture), [DETTE_TECHNIQUE.md](DETTE_TECHNIQUE.md) (what remains to be reworked).

## Where we stand

Since 4.7.0 (2 October), on `develop`:

- **Reorganised pages**: “pilot first” sidebar, a single “Missions” button for the generator and the
  studio, Settings in four pages (My profile, Centre, Installation, Maintenance).
- **Users and roles**: shared records, `admin_centre` / `utilisateur` roles, develop / production mode,
  sign-in, impersonation shown on every page.
- **Availability**: configurable categories (Centre), theme preferences per pilot, hour-by-hour grid
  with the colours and the ODV codes; ODV planning linked to these declarations.
- **My missions**: two columns, mission book per design, opening, closing and mission-change animations
  (sequence specific to the Cabinet).
- **Faster data**: index in the browser (missions, reports, signed copies of the shared files) — the ODV
  opens in 1.6 s instead of 7.2 s.
- **Git synchronisation**: “Synchronise” button in the header, conflicts resolved record by record, nothing lost.

## Step 1 — Stabilise and publish 4.8 (now)

**Goal**: a clean version of all of the above, which everyone can install.

- Fixes in progress (stabilisation session).
- **First synchronisation of the real `data/`**: to be launched by you (82 files never committed; creates the remote
  branch `test`).
- **Release 4.8.0** on `master` when you decide: release notes (`VERSION.md`: summary, actions to take,
  notes), changelog.

## Step 2 — The minimal web server (“central engine”)

**Why.** With git, each computer must have git, access to the repository and the launcher; a pilot who simply opens
the suite shares nothing. And the rights (who can assign, who can edit a record) are checked only by the
pages: nothing prevents a computer from pushing anything at all. A small central server solves both: a single place
where the data arrives, and which checks who is allowed to do what.

**What it is, concretely.**

- **A Python program** (`tools/defa_server.py`), with no dependency to install (standard library), which runs on
  **a single machine**: a Centre computer, a Synology NAS or a small rented server. It is started with
  `python tools/defa_server.py --data <dossier> --port <n>`.
- **Same files as `data/`**, arranged the same way: one can go back to git (or start again from it) without converting anything.
- **SQLite** for what must be queried quickly and written by a single program: the change log (who
  changed what, when), the accounts, the sessions.
- **HTTPS**: behind a relay that manages the certificate (Caddy or nginx); never in clear text on the Internet.

**What it does.**

| Function | Detail |
|---|---|
| Sign-in | trigram + password (the same encryption as today, PBKDF2) → session token; password changed by the user (old password) or reset by an admin |
| Read | `GET /v1/file/<chemin>` with a signature (`ETag`): as today, the page only rereads what has changed |
| Follow | `GET /v1/changes?since=<curseur>`: the list of what has changed since last time — no more need for a button to receive |
| Write | `PUT /v1/file/<chemin>` with the signature read (`If-Match`); if someone has written in the meantime → refusal (412), the page merges record by record and tries again; deletion = tombstone |
| Rights | checked **by the server**: `admin_centre` for what falls under the Centre (assignments, categories, users), each pilot for their availability, their profile and their reports |
| Administration | `/admin` page (reserved for `admin_centre`): status, change log, accounts (reset a password, disable), purge of the tombstones, **ZIP backup**, **export to a git repository** |

**On the suite side.** The “Synchronise” button keeps its place; in Settings › Installation, one chooses the
**transport**: *git on the folder* (today) or *central server* (server address). With the server, the page
talks to it directly: no more need for the launcher to share, nor for git on each computer.

**Breakdown.**

1. File server: read, write with signature, change log (SQLite), automated tests.
2. Accounts and sessions: sign-in, token, checked roles, password change and reset.
3. “Server” transport in the suite (`shared/sync.js`): continuous reception of the changes, conditional
   writing, record-by-record merge in case of refusal.
4. `/admin` page: status, log, accounts, ZIP backup, git export.
5. Commissioning: installation documentation (machine, HTTPS relay, backups), switchover of an existing `data/`.

**Decisions to take before starting.**

- **Where the server runs**: Centre computer, Synology NAS, rented server?
- **Address and certificate**: domain name, HTTPS relay.
- **Who administers it** day to day (accounts, backups).
- **Git in parallel**: keep a regular export to the `defa-data` repository (history, safety net), or not.

## Step 3 — Production mode

**Goal**: the suite in real service, no longer in trial mode.

- Sign-in **required** for My missions and for the Centre; trigram set by the account (no more changing it on the
  fly).
- Checking by the central server (step 2): without it, production mode only protects what the pages
  check.
- Impersonation of a user by an admin traced in the server log.
- Return of the data to the reference branch (`main`) and exit from the test set (see the technical debt).

## Step 4 — The DEFA website (online since 5 October 2026)

The website has **no API**: its data is retrieved by **copy-paste** from its pages (`flotte.defa-virtual.fr`).

| Website page | In the suite | Status |
|---|---|---|
| Log des vols (flight log) | Settings › Maintenance › Base › Flight log: “Load / update the log (copied or saved page)”, then reference (pilots, aircraft) updated from the log | done |
| Flotte virtuelle (virtual fleet) | Settings › Maintenance › Fleet: “Paste the website Fleet page…” (same rules as `AircraftDB/update_fleet.py`, without a script), then “Save to repository” | done (5 October) |
| Maintenance, Statistiques (statistics) | — | nothing to take over for now |
| Enregistrer mon vol (log my flight; sign-in required) | — | sending the reports to the website stays manual: no API, and automating a form with a pilot's credentials is out of the question |

If the website one day opens an API: revisit this table (automatic reading, then sending of the reports and of the assignments
with the credentials entered at first launch, never written to a file).

## Board (Centre, in progress)

The weekly flight-orders editor ([ODV_ORDRES.md](ODV_ORDRES.md)), taken over from the standalone tool “Tableau
V0” into the suite's model (availability, assignments, mission areas, reports). Batches L2-L3: “Ordres de vols” session;
L4-L5: “Features SOG” session. Then, on this roadmap:

- **Planner tasks**: list of daily tasks, variable, ticked when done, visible deadline (V0:
  weekly `checkPrep` checklist, IVAO links).
- **Free markers** on the timeline (line, band, NLT: visual cues without calculation).

## Ongoing

- **Technical debt** ([DETTE_TECHNIQUE.md](DETTE_TECHNIQUE.md)), with a firm deadline: **splitting the reports by
  year before 31 December 2026** (taken on by the “fond” session, with the per-report metadata that
  will also allow them to be merged record by record).
- Fixes and small requests as they come (stabilisation session).
- Translations: audit (`tools/audit_i18n.html`) at each addition of text.

## Pending decisions

| Subject | Question |
|---|---|
| First synchronisation of the real `data/` | when to launch it (82 files, creation of the remote branch) |
| `utilisateurs/_index.json` | add it to the `.gitignore` of `data/`? |
| Records of pilots without a record | creation as they come (recommended), or also automatic at first sign-in in develop mode? |
| Release 4.8.0 | when to publish it on `master` |
| Central server | hosting, address, administrator, git export (step 2) |
