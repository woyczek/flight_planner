# What « data » means today, and one place for each piece of data (SOG-0010, reading only)

Reading done on 5 Nov 2026 on the administrator's workstation (read only: `E:\DEFA`, its `data/`, the launcher's code, the data layer).
Nothing was moved or written. The user's words: « c'est la foire dans data : récupérer les dernières infos, remplir avec les
précédentes, un seul emplacement ». The proposal at the end is to be challenged; no code until the go.

## 1. Seven places called « data »

| # | Place | What it is | Written by | Synchronised |
|---|---|---|---|---|
| 1 | `data/` of the workstation (the git repository `flight_planner_data`, on gitlab.com) | the airline's data: the aeronautical base, procedures, missions, the fleet and the sheets, the pilots' files | the launcher (builds, pickups, downloads), the pilots (any pilot, since § 10.36), the frame's publication | yes, through git |
| 2 | `data/local/` | local to the workstation: raw procedure sources (`cifp/`, `ead/`, `eaip/`), `sync.json` | the launcher's downloads | never (`.gitignore`) |
| 3 | `data/sia/*.xml`, `*.zip`, `_archives/` | the raw SIA sources of each AIRAC cycle (about 80 MB each) | the pilot's hand (the SIA zip, « Prendre le fichier téléchargé ») | never: untracked, reloaded at each cycle |
| 4 | The device's IndexedDB (`FrameData`: `docs`, `pending`, `meta`, `conflicts`) | the copy of the repository files the app reads, the writes waiting to leave, the conflicts | the app (every module through `ctx.data`) | `docs` by the sync; `pending` leaves with it; the `cache` policy never leaves |
| 5 | The suite's folders at the root of `E:\DEFA`: `AircraftDB/`, `icao_doc8643_cache/`, `ead_probe/`, `ead_survey/`, `git-config/`, `dist/` | V2 leftovers and working copies (`AircraftDB/` still feeds `data/AircraftDB/`) | the suite's scripts, the launcher | no |
| 6 | The Downloads folder | where the user drops the SIA / NATS / CIFP zips | the user, then `base/pickup` reads from it | no |
| 7 | `data_avant_2026-10-23_100032/` at the root | a copy kept before a restoration (565 KB), **not ignored by git** | the restoration of 23 Oct | no |

Sizes on this workstation: `data/sia` 479 MB (773 tracked files), `data/proc` 60 MB (3 077 tracked), `data/local` 46 MB (never tracked),
`data/AircraftDB` 35 MB, the rest under 3 MB. `dist/` 650 MB is outside `data/`.

## 2. Who writes what, in `data/`

| Folder | Content | Written by | Reader |
|---|---|---|---|
| `sia/base/<zone>/<cycle>/` | the built aeronautical base, one folder per zone and cycle | the launcher (`base/build`) | aerodb |
| `proc/<cycle>/`, `proc/manual/` | the procedures per cycle; hand and OCR readings (`manual/`, never purged) | the launcher (`proc/*`), « Relire » | aerodb |
| `airline/settings.json`, `airline/fleet.json` | the airline's name, site, logo, map profiles; the fleet | **any pilot** (the Site module, Appareils) | frame, modules |
| `aircraft/sheets/<id>.json` + `planner/…fpdb.json` | the aircraft sheets and their mirror | **any pilot** (Appareils, aerodb `put`) | aerodb, Fuel |
| `missions/` | the missions, maps and PDFs (maps ignored by git) | **any pilot**, the studio | Missions |
| `pilot/<TRI>/` | a pilot's flight and fuel | that pilot | Fuel, the CR |
| `cr/`, `utilisateurs/`, `disponibilites/`, `atc/`, `odv/`, `references/`, `lab/` | V2 data still used by the V2 pages | V2 pages, the launcher | V2 |
| `AircraftDB/` | `aircraft_db.js`, `aircraft_perf.js`: copied from the suite's `AircraftDB/` by « publier » | the launcher | aerodb |

## 3. What is wrong (the « foire »)

1. **The same data lives in two places.** The aircraft types and performances exist in the suite's `AircraftDB/` (V2, 35 MB, the source of
   the build) and are copied to `data/AircraftDB/`. The sheets exist as `aircraft/sheets/<id>.json` AND in the mirror `fpdb.json`
   (SOG-0023): two files for one saved sheet, which the Synchronisation card now counts together (A86).
2. **« The latest, filled with the previous ones » has no rule.** Nothing says which cycle wins: `sia/` keeps two XML cycles side by side
   (2610 and 2611), the build dates a whole base by the most recent SIA file (hence the user's « toujours périmé »), the procedures keep
   one folder per cycle. The freshness order is implicit in each builder.
3. **Raw sources and compiled data share a folder.** `sia/*.xml` (raw, untracked) sit beside `sia/base/` (compiled, tracked).
4. **`data/local/` is in the repository's folder but not in its content.** A restoration or a copy of `data/` that skips `.gitignore`
   loses or leaks it.
5. **A copy left at the root**, `data_avant_2026-10-23_100032/`, is not ignored by git: one `git add -A` away from the repository.
6. **Pilots write the files the others read** (since § 10.36): every reader treats them as untrusted (audit 157); the places where a
   file is both written by a pilot and trusted by a builder are to be listed.
7. **The device cache is a fourth copy**, with its own policies (`reference`, `document`, `cache`), invisible to the administrator; the
   Synchronisation card is its first window.

## 4. Proposal: one place per piece of data

The rule: **one source, derived copies marked as such, raw inputs apart.**

| Piece | The one place | Derived copies (never edited by hand) | Rule |
|---|---|---|---|
| The aeronautical base | `data/sia/base/<zone>/<cycle>/` | the device's cache | the cycle is the folder's name, and a zone's cycle is its own source's (aerodb 294ffc1b8) |
| Raw dated sources (SIA, NATS, ENAIRE, CIFP, EAD) | `data/local/sources/<source>/<cycle>/` (moved from `sia/*.xml` and `local/*`) | none | never tracked, never published; kept for the last 2 cycles, the older ones in `_archives/` |
| Procedures | `data/proc/<cycle>/` and `proc/manual/` | the device's cache | unchanged |
| Aircraft sheets | `data/aircraft/sheets/<id>.json` (**the sheet JSON is the only source**, SOG-0023) | the mirror `fpdb.json` (generated), the `.lnmperf` (explicit import or export) | the mirror is written by one function and carries a marker « généré » |
| The aircraft types and performances | `data/AircraftDB/` | the suite's `AircraftDB/` becomes the build's input only | one direction: the suite → `data/` |
| The airline's settings and fleet | `data/airline/` | none | read with the audit 157 rules |
| Missions, pilots' flights | `data/missions/`, `data/pilot/<TRI>/` | maps and PDFs (ignored, regenerable) | unchanged |
| Working copies (`ead_probe`, `ead_survey`, `dist`, `data_avant_*`) | **outside** the suite's tree, in a `data/local/work/` or deleted | none | added to `.gitignore` at once for `data_avant_*` |

**Freshness rule (the « latest, filled with the previous ones »)**: for each source, the entry of the newest cycle wins; a source that has no
entry for the cycle in force keeps its previous cycle's, **said in the result** (« construit avec 2610 ») and never silently. This is the
rule the build already follows by accident, written down and shown.

## 5. Migration and restoration

1. **Inventory first, no move**: a read-only launcher verb (`data/inventory`, names, sizes, tracked or not, last writer) that fills the
   table of § 1–2 from the real folders, so that the administrator sees « data » as it is. (One route, no write.)
2. **Safety net before any move**: a full copy of `data/` (git bundle of the tracked files + a zip of `local/` and the raw sources) into a
   dated folder **outside the repository**, with its SHA written in a manifest; the existing `data_avant_*` shows the manner and its flaw
   (inside the tree, not ignored).
3. **Moves by group, each one verifiable and reversible**: (a) raw sources to `local/sources/`; (b) working copies out of the tree; (c) the
   sheet mirror marked generated. Each group: a manifest of old path → new path, the move, a check that every reader finds its file
   (`--touched`, then the builders' own benches), and the manifest kept for the undo.
4. **Restoration**: the manifest read backwards, and the safety net's SHA verified. A restoration never overwrites a newer tracked file
   (the existing rule of `_avant_restauration`).
5. **Order of the work**: § 5.1 and `data_avant_*` in `.gitignore` can go at once (no risk). § 5.3 (a) touches D4 (aerodb's builders) and
   needs its agreement; (c) is D3's (Features SOG, SOG-0023).

## 6. To decide (the coordinator)

1. Is `data/local/sources/` the right home for the raw sources, or `data/_sources/` (visible next to the repository's own folders)?
2. May D4 move the SIA XML out of `sia/`? The user's « toujours périmé » is exactly this folder's mix.
3. The suite's `AircraftDB/` (V2): kept as the build input, or retired with the V2 aircraft pages?
4. Where does the safety net live by default (a sibling folder of `E:\DEFA`, or the Synology)? The user's disk layout decides.
