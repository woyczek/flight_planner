# data — integration (what the module asks)

What the module **Données** needs from the frame, from aerodb and from Settings. The module never reaches the network, the
launcher, the browser storage or the data repository directly (`frame/INTEGRATION.md` § 1, § 7): everything below is a
**request** to the agent who owns the piece, who writes the contract into its own guide in the same commit. Nothing here is
built yet; where a shape is proposed, it is a proposal from the inventory (`docs/technique/V3_DONNEES_REGENERATION.md`
§ 2.7, § 2.8), not an invented contract: the owner decides it.

## 1. From the frame

### 1.1 `ctx.launcher` — the frame's service for the workstation's launcher

Already planned by the frame (`frame/INTEGRATION.md` § 7, debt of 28 Oct 2026: Settings' `setup()` and
`frame/aerodb/lnmperf.js` move onto it). The module needs, whatever the final names:

| Need | Proposed shape (V3_DONNEES_REGENERATION § 2.8) |
|---|---|
| know whether a launcher serves the page, and which | `available()` → bool; `info()` → `{ host, data, dataGit, lan }` or null (the frame's existing detection) |
| one JSON call to a route, never an exception | `call(route, body)` → the route's JSON, or `{ ok: false, offline \| status \| message }` |
| a long job with progress and cancellation | `job(route, body, { onProgress, signal })`: start, poll about once a second, cancel on `signal`, resolve with the result; polling stops at `unmount` |
| read a raw source file of `data/` as a stream (for the JavaScript builders, § 2.2) | `read(dataPath, { signal, onBytes })` → a `ReadableStream`, same origin |

- Only the workstation's own page gets it (null on a paired device of the local network, on the site and in an app), like
  `ctx.lan()` in Settings: every `/__setup/regen/*` route is refused from the local network (`lan_access.ROUTES`).
- A refusal names the route, so that the module can show « le lanceur de ce poste ne connaît pas encore cette
  opération : relancez-le à jour ».

### 1.2 The launcher's routes (`tools/launch.py`, the frame's)

**Existing, reused**: `GET /__setup/status`, `GET /__setup/sia-zip`, `GET /__setup/downloads?glob=`, `POST /__setup/aero-fetch`
(behind the job runner), `GET|POST /__setup/aircraft-db`, `POST /__setup/aircraft-publish`, `POST /__setup/vfr-import`,
`GET /__setup/sync-status`, `POST /__setup/sync` (checked in `tools/launch.py` on 28 Oct 2026).

**To build** (V3_DONNEES_REGENERATION § 2.7, renamed to the module's verbs; the frame names them):

| Route | Does |
|---|---|
| `GET /__setup/regen/state` | for every data set: the cache (files, dates, sizes by cycle), the local outputs (counts, `parserVersion`, newest `updated_at`, inputs fingerprint), commits not pushed scoped to the output paths; `pypdf` importable; free disk space; EAD credentials present (yes / no, never the values) |
| `POST /__setup/regen/job { set, verb, args }` → `{ job }`, `GET …/job?id=`, `POST …/job/cancel` | one job at a time in a thread, `{ state, step, done, total, unit, log[-200:], result }`; `set` and `verb` from a fixed list, `args` validated (cycle, ICAO code, zone ids); the builders run as modules or as subprocesses with `sys.executable` and a fixed script list, isolated for anything that reads a downloaded file; a reloaded page finds the running job again |
| `POST /__setup/regen/put` | writes the outputs of the JavaScript builders (`{ path, text }`), only under `sia/base/`, `sia/vfr/`, `proc/`, `sia/mora.csv`, `.json` / `.csv`, atomic replace, unchanged content not rewritten; no commit |
| `POST /__setup/regen/publish { sets, author, apply }` | plan (new, changed, removed, bytes), then `git add` of the explicit output paths, one commit under the trigram, `data_sync`; generalises `aircraft-publish` and `vfr-import` |
| `POST /__setup/regen/purge { sets, apply }` | plan, then removal, inside the output and cache roots only; never the cycle in force; never a published zone outside this workstation's coverage |
| providers `eaip`, `cifp` | downloads with the address and the file name derived from the cycle |
| `POST /__setup/regen/job { set: 'ead', args: { icao } }` | the EAD line: one aerodrome, credentials from the launcher's secrets store, AD 2 pages into `data/local/` (never committed), coding tables read with the known layouts, `proc/<cycle>/<ICAO>.json` status `check` |
| local-only outputs | a build marked local (X-Plane / Navigraph) writes under `data/local/`, never committed, read by the workstation's devices through the launcher |

Security, as the inventory's § 2.13: the workstation's routes only, no path or URL from the page, downloads from the
declared hosts only, the GitHub token never reaches the launcher (the push is git with the workstation's credentials).

### 1.3 Publishing without a launcher

Without a launcher the module builds from files the user picks and publishes through the **device's GitHub access**. A
module has no GitHub transport today (only service screens get `github()`, `frame/INTEGRATION.md` § 13). Request: a
publication service for this module, e.g. `meta.github: true` giving `ctx.github()` (`head` / `tree` / `commit`, the token
never leaves the transport), or a narrower `ctx.publish({ files, removed, message })` that commits generated files outside
the data layer's batch (whose limits — 5,000 changes, text, a copy in the device's cache — make it unfit for 20–60 MB of
outputs). The frame chooses.

### 1.4 The end-of-cycle line of the Status block

A phone never mounts this module (level 3, and the phone has no launcher), so the warning of SPEC § 6.3 cannot come from
it. Agreed by the ergonomics session (28 Oct), asked by it to the frame: the frame computes it from `aerodb.publication()`
(§ 2.1: published cycle of the base and of `proc/` against the AIRAC cycle in force) and shows it in the Status block on
every device, the phone included; amber on a phone (nothing to press); on a workstation with a
launcher and at the Full level, the line leads to `#data`. The module's own status lines (`cache/data/status.json`,
`frame/INTEGRATION.md` § 10.0) carry only what this workstation is doing (a job running, « n publications à envoyer »).

### 1.5 The module's place

- `APP.modules` / the Pilot application's rail: `data`, verb « Données », level 3. At the Full level the Pilot rail has five
  verbs today (Préparer, Carte, CR, Vols, Météo; `frame/app.js`, 28 Oct 2026): « Données » is the sixth.
- **Workers**: the base's builders run in a Worker created from the module's (or aerodb's) files; the page policy must allow
  it (`worker-src 'self'`, to check in `tools/csp_policy.py`). No outside host is added: the module calls none.

## 2. From aerodb

### 2.1 The published state, without loading the data

The module needs, for every data set, what is published, without reading the base itself: a call such as
`aerodb.publication()` → `{ base: { zone: { cycles: [..], parserVersion, at, by } }, proc: { cycles: [..], count },
vfr: { at, count }, aircraft: { at, types }, weather: { run }, nat: { at } }` (the manifest `sia/base/index.json`, the zones'
`meta.json`, `proc/<cycle>/index.json`, `sia/vfr/index.json`, the `AircraftDB/` listing; the site's `weather/world/index.json`
and the NAT tracks once they are read on the site). Plus the zone table with names in four languages and the sources of
each zone (today `offline.zones()` gives the published ones; the zones nobody publishes yet are needed for « Ajouter un
pays »). The cycle helpers and the sources' links are those of `frame/aerodb/sources_data.js` (`cycleOf`, `cycleDate`,
`eaipBase`, `cifpName`, `urlOf`).

### 2.2 The builders (`frame/aerodb/build/`, lot D5 of the roadmap) — for aerodb's review

The base's compilation leaves `shared/sia_base.js` for **pure builders** that run in a Worker, the same code with or
without a launcher. Proposed contract, for aerodb to correct:

- `build({ zone, cycle, sources, inputs, publish }) → { files: [{ path, text }], counts, warnings, parserVersion, fingerprint }`:
  `inputs` are streams (`AeroZipStream.stream`, `AeroXmlStream.pump` — the bricks kept from the laboratory, K8 / K9),
  read through `ctx.launcher.read` on a workstation, from a picked `File` without one.
- `publish: true` drops every X-Plane / Navigraph input (SPEC invariant 1); `false` builds the local fallback.
- One zone at a time; the French outlines (priority rule) are an input of every other zone; a zone built alone equals the
  same zone in a whole build (G9 of the inventory: to prove by a test).
- `parserVersion` and the `COMPAT` range stay aerodb's; the module only compares numbers.
- Golden test: the same fixtures through `SiaBase.build` (V2, the reference until it leaves) and through the new builders
  give byte-identical JSON.
- **SPEC § 6 invariant 1 of aerodb** ("aerodb never builds the base") must be amended by aerodb: the builders build, in a
  Worker, on the owner's command from this module; the reader still never writes.

### 2.3 The catalogue of the sources, and the end of the Sources screen

- **The Sources screen is replaced by the module at lot D1** (ergonomics session, 28 Oct 2026): `sources_data.js`
  (`window.AeroSources`: name, link by cycle, licence, status, the cycle helpers) becomes the module's catalogue — kept by
  aerodb or moved into `modules/data/`, to settle with aerodb at D1. In the same lot the screen `#sources` (`sources.js`,
  `sources.css`), its entry in `APP.screens` (frame) and the « Sources des données » button of the Administration card
  (Settings, `admin_links.js`) go. Until then both coexist.
- aerodb's reading API is otherwise unchanged; the module never reads `sia/base/` itself.

## 3. From Settings

- The launcher's keys panel of the Administration card gains an **EAD Basic** entry (agreed 28 Oct): user name and
  password given once to the launcher (Administration, launcher only, never synchronised), kept in its secrets store, never
  read back by the page; « Tester » the login; for the EAD line (SPEC § 4.3).
- At D1, the « Sources des données » button of the Administration card goes with the Sources screen (§ 2.3). The module is
  reached from the rail.

## 4. Files (planned)

`module.js` (mount, groups, rows), `texts.js` (every text `[fr, en, de, es]`), `state.js` (states, gaps, cycles: pure
functions, tested without a page), `runner.js` (the runner contract: `state()`, `can(set, verb)` → `{ ok, reason }`,
`run(set, verb, args, { onProgress, signal })` → `{ ok, files, bytes, unchanged, warnings, errors }`; one runner on
`ctx.launcher`, one without launcher on picked files and the publication service), `help/<lang>.md`.
