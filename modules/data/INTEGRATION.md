# data — integration (what the module asks)

What the module **Données** needs from the frame, from aerodb and from Settings. The module never reaches the network, the
launcher, the browser storage or the data repository directly (`frame/INTEGRATION.md` § 1, § 7): everything below is a
request to the agent who owns the piece, who writes the contract into its own guide. The frame's part is **delivered**
(lot D0, `frame/INTEGRATION.md` § 15, 28 Oct 2026) and aerodb's is written (§ 2); this file says what the module uses of
them and what it still needs (marked « to come »).

## 1. From the frame (lot D0, delivered: `frame/INTEGRATION.md` § 15)

### 1.1 `ctx.launcher` — declared in `meta`

```js
launcher: { routes: ['regen/'], read: ['sia/', 'proc/', 'local/', 'AircraftDB/'] }
```

- **null** without a launcher, on a paired device of the local network and without the declaration: the module tests it
  before drawing a launcher button (the grey reason « Il faut le lanceur du poste »).
- Calls (nothing throws): `info()` → `{ host, data, dataGit, lan }`; `call(route, body?)`; `job(route, body, { onProgress,
  signal })`; `resume(route, { onProgress, signal })` (a reloaded page finds the running job again; at unmount the frame
  stops following, the job goes on); `read(path, { signal, onBytes })` → `{ ok, stream, size }` for the Worker builders.
- Anything not declared is refused at once (`{ ok: false, status: 403, refused: true, route }`); a 404 is
  `message: 'unknown route'`, which the module words « le lanceur de ce poste ne connaît pas encore cette opération :
  relancez-le à jour ».
- The job protocol is the frame's (start, poll about once a second, cancel, resume); the module only shows `step`, `done`
  / `total` / `unit` and `log`.

### 1.2 The launcher's routes (`tools/launch.py`, `tools/regen_jobs.py`)

- **Delivered (D0)**: `GET /__setup/regen/state` (local outputs and cycle folders, `local/`, source caches, commits not
  pushed, `pypdf`, free space, EAD credentials present yes / no); `POST /__setup/regen/job { set, verb, args }` with its poll
  and cancel, one job at a time, `set` / `verb` from `regen_jobs.REGISTRY` (400 unknown, 409 busy, 410 no such job); the
  verbs `state/scan` and `proc/ead-fetch` (args `{ icao }`: the EAD line, installed under `proc/manual/` through aerodb's
  `fetchProcedures`).
- **To come, with the builders (D2 onwards)**, as verbs of `regen/job` or routes named by the frame: per data set
  `download` (providers of `aero-fetch`, `eaip`, `cifp`, the pick-ups of SIA, NATS and CIFP files from Downloads),
  `build` (Python pieces; the Worker pieces' outputs written through a `put` that accepts only the output roots, atomic,
  unchanged content not rewritten), `publish` (`regen/publish`: plan, then `git add` of the explicit output paths, one
  commit under the trigram, `data_sync`), `purge` (plan, then removal inside the output and cache roots, **never
  `proc/manual/`**, never the cycle in force), and `manual/remove { icao }` (the owner's « Retirer », planned and asked like
  a publication).
- Security as the frame's § 15.1: the workstation's routes only, nothing from the page is a path, an address or a command.

### 1.3 Publishing without a launcher: `ctx.publish` — declared in `meta`

```js
publish: ['sia/base/', 'proc/', 'sia/vfr/', 'AircraftDB/', 'sia/mora.csv']
```

- `ctx.publish(groups, { onProgress, signal, from })`: **one commit per group, in order** — the module makes one group per
  zone of the base and one per cycle of `proc/`, never one per file (GitHub counts the calls).
- A **conflict** (someone published meanwhile) is returned, never overwritten: the module says « Quelqu'un a publié
  pendant l'envoi : relancez » and calls again with `from: at` (the groups done are not redone).
- Refusals before any call: `trigram` → « Votre trigramme n'est pas réglé », `access` → « Accès au dépôt non réglé »,
  `tooBig` (a blob over 100 MB) → the data set's row in error, nothing sent for that group.
- With a launcher the module publishes through the launcher's route (§ 1.2), never `ctx.publish`.

### 1.4 The end-of-cycle line of the Status block

Delivered by the frame (§ 15.3): computed on every device from `aerodb.publication()`, amber, « Base aéronautique : cycle
2610 terminé, en attente de publication » or « … : le cycle 2611 se termine le 25/11, rien de publié pour 2612 »; it leads
to `#data` only on a workstation with a launcher at the Full level once the module exists; without `publication()`, no
line. The module's own lines (a job running, « n publications à envoyer ») go through `cache/data/status.json`
(`frame/INTEGRATION.md` § 10.0).

### 1.5 The module's place

- The verb « Données » of the Pilot rail, level 3, is added **with `module.js`** (lot D1), the sixth at the Full level.
- **Workers**: allowed by the page policy (`worker-src 'self' blob:`); the module's Worker script is listed in `meta.files`.
  No outside host: the module calls none.

## 2. From aerodb

Written with aerodb (its review of 28 Oct 2026, validated by the ergonomics session); the contract is aerodb's own,
`frame/aerodb/SPEC.md` § 4, § 5, § 5 quinquies to septies and `frame/aerodb/INTEGRATION.md` (« The Données module »). What the
module relies on:

### 2.1 Three calls, and nothing else (lot D1)

| Call | What the module uses |
|---|---|
| `aerodb.publication()` | what is published, **without loading the data**: `{ base: { zone: { cycles: { date: { parserVersion, at, by } }, inForce } }, proc: { cycles: { date: { aerodromes, bySource } }, inForce }, vfr: { cycle, at, count }, aircraft: { at, types } }`; `by` (the trigram of the build) is null until the builders write it (D5). The world weather is the frame's (the site's index), the NAT tracks come after D9 |
| `aerodb.zones()` | every zone the suite knows, published or not: `{ id, names: [fr, en, de, es], frames, published }`, for the coverage and « Ajouter un pays » |
| `aerodb.sources()` | the **catalogue** (`frame/aerodb/catalogue.js`, kept by aerodb): per source `{ id, group: base \| proc \| aircraft \| weather, zones, fetch: { how: launcher \| pick \| none, provider, glob, name }, build: { runtime: worker \| python, id }, publish, cycled, url(cycle), lic[4], status }`; `eadStates` (the EAD outcome per State, which greys « Mise en page inconnue pour cet État »); `siaFileInfo`, `cifpFileInfo` (the cycle read from a picked file's name) |

The module never reads `sia/base/`, `proc/` or `AircraftDB/`, never loads aerodb's files: these three calls are its only
way in.

### 2.2 Cycles

Stored and exchanged as effective dates `YYYY-MM-DD` in every answer; shown as `YYNN` by the module through
`frame/aerodb/airac.js` (`cycleOf(date)` → `{ id, date, next, prev }`, `cycleDate(id)`, `next`, `prev`; anchor AIRAC 2401 =
2024-01-25). The Python tools are aligned on it by a K case. Three cycles kept for the base and the cycle-built `proc/`.

### 2.3 Building (lot D5): two stages, nothing written by the builders

- **A piece per source** (`runtime` `worker`: SIA XML through the stream readers, openAIP / FAA ADDS GeoJSON, AIXM 5.1 of
  ENAIRE and NATS; `python` on the launcher: UK Mil AIP, NAV CANADA, DIRCAM, VAC points, eAIP, CIFP, EAD, OCR) →
  `{ source, zone, cycle, kinds, counts, warnings, parserVersion, inputs (SHA-256) }`. A builder never fetches: MORA's tiles
  and peaks come from a download step of the launcher first.
- **An assembler per zone** (a Worker) merges the pieces with the priority rule into the kind files, `aeroindex.json`,
  `meta.json` (`builtAt`, `builtBy`, `parserVersion`, `inputs`, `sources`) and the manifest entry (several cycles). France's
  outlines are an explicit piece given to every other zone; a zone built alone equals the same zone in a whole build.
- Both return files `{ path, text }`; the launcher (`regen/put`, then its commit) or the frame's publication service
  writes. `publish: true` drops X-Plane / Navigraph inputs.
- Before D5, an aerodb lot « complete readers » (the stream readers keep every field and the arcs), proved by a golden test
  against V2's `SiaBase` on the fixtures.
- aerodb's invariant 1 is amended: the reader never writes the base; the builders produce on the owner's order from this
  module and do not publish.

### 2.4 Procedures read by hand, EAD or OCR

- EAD Basic reads one aerodrome per gesture (*Charts* documents `AD_2_<ICAO>_…`, the first page of results, 15 rows); the
  result is installed by `tools/proc_manual.py` (sources `ead-basic`, `manual`; `how`: `ocr` or `hand`), which refuses a
  file of another source without `--replace`: the module then asks « remplacer ou fusionner ».
- **Never purged, never lost at a change of cycle** (user, 28 Oct 2026; aerodb 51a028f48, its SPEC § 5 quinquies): they
  live in `proc/manual/<ICAO>.json` and `proc/manual/index.json`, **outside the cycle folders**, each procedure with its cycle of origin (`source.cycle`) and its source (`ead-basic` | `manual`, `how`: `ocr` | `hand`); the reader merges `proc/<cycle in force>/`, `proc/manual/`
  and `proc-seen/` and serves an outdated procedure as it is with `outdated: true` (at equal status the one not outdated
  wins); the module shows them « Périmé » with « Relire »; the Purger never has them in its scope; only the owner's explicit
  « Retirer » removes one (this replaces the rule « previous kept cycle only, `stale: true` » of aerodb's first contract).
- The launcher's routes (§ 1.2) need the same: `regen/purge` never lists `proc/manual/`; the removal of one aerodrome is
  its own call (`{ set: 'manual', verb: 'remove', args: { icao } }`), planned and asked like a publication.
- Grey reasons from aerodb's side: « pypdf manque », « OCR manque » (drawn pages: UK STARs, Belgium, Georgia), « Mise en
  page inconnue pour cet État ».

### 2.5 The Sources screen

Replaced by the module at its D1: the catalogue is already `catalogue.js` (was `sources_data.js`, served by `sources()`,
the cycle helpers in `airac.js`; aerodb d4cec61b9); the screen `#sources`, its `APP.screens` entry (frame) and the « Sources
des données » button of the Administration card (Settings) go in the module's D1. Until then both coexist.

## 3. From Settings

- The launcher's keys panel of the Administration card gains an **EAD Basic** entry (agreed 28 Oct): user name and
  password given once to the launcher (Administration, launcher only, never synchronised), kept in its secrets store, never
  read back by the page; « Tester » the login; for the EAD line (SPEC § 4.3).
- At D1, the « Sources des données » button of the Administration card goes with the Sources screen (§ 2.5). The module is
  reached from the rail.

## 4. Files (planned)

`module.js` (mount, groups, rows), `texts.js` (every text `[fr, en, de, es]`), `state.js` (states, gaps, cycles: pure
functions, tested without a page), `runner.js` (the runner contract: `state()`, `can(set, verb)` → `{ ok, reason }`,
`run(set, verb, args, { onProgress, signal })` → `{ ok, files, bytes, unchanged, warnings, errors }`; one runner on
`ctx.launcher`, one without launcher on picked files and the publication service), `help/<lang>.md`.
