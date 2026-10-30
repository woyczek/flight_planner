# data — specification (final state)

The V3 module **Données** ("Data") of the Pilot application: the airline's administrator regenerates the published data
(aeronautical base, procedures, aircraft types, VAC reporting points) **without V2**: fetch, build, publish, purge, one
data set at a time or all of them, from one screen. Written on 28 October 2026 from
[`docs/technique/V3_DONNEES_REGENERATION.md`](../../docs/technique/V3_DONNEES_REGENERATION.md) (inventory of the 17
sources, the chains, the launcher's routes) and the user's answers of the same day (its § 5.1). This document describes
the **final state**; the order in which it is built is [ROADMAP.md](ROADMAP.md); what the module asks of the frame and of
aerodb is [INTEGRATION.md](INTEGRATION.md); why, [DECISIONS.md](DECISIONS.md).

**State (30 Oct 2026)**: the module lives in the Maintenance application (`/frame/?app=maintenance`). Delivered: the
read-only screen (cycle, coverage with « Ajouter un pays », States in three colours, four groups), and the **Base
aéronautique** group's four verbs Télécharger · Construire · Publier · Purger on the launcher's `base/*` verbs, cases
L1–L15. **In progress (V3 § 10.34, lot A1)**: the same four verbs for every other set (§ 5.5) and « Tout mettre à jour »
(§ 5.3), so that the V2 maintenance page can leave the Maintenance rail.

**As a prompt**: give this document, `INTEGRATION.md`, `frame/INTEGRATION.md` and `frame/aerodb/INTEGRATION.md`, and ask
for `modules/data/module.js` and its files. Every rule below is a requirement.

## 1. Purpose

- **Compiling is strictly separate from using** (user, 28 Oct 2026): the **builders** compile the raw sources, on the
  workstation, on the owner's order from this module; the **reader** (`frame/aerodb`) uses the compiled files on every
  device and never builds. The compiled JSON files live in the airline's **private data repository**, on the user's side:
  that is admitted (the raw sources are never published, only what is compiled from them, under the licences of § 10).
- **One module** (`modules/data/`, `meta.level: 3`, Full), not a screen of the frame (ergonomics session, 28 Oct 2026). The
  frame is unchanged except for the services the module asks for (INTEGRATION § 1). **It is the heart of the « Maintenance »
  application, not a place of Pilot's rail** (user, 29 Oct: « pour éteindre la V2, il faut les paramétrages admin
  aéronautique sur la V3 […] c'est une appli Maintenance »): Données, administration settings and help, on the workstation
  with a launcher, opened by `/frame/?app=maintenance` and by the line « Maintenance » of Pilot's Settings › Administration
  (Full); until the frame's named applications exist, the module is reached by `#data`, where that line leads.
- **The data are common, the coverage is personal** (user, 28 Oct): every zone published in the data repository can be put
  in a workstation's coverage; what one administrator publishes is everyone's data; the screen shows, for each data set,
  the gap between this workstation and the published repository.
- **Personal-licence data enter the published base only on an explicit declaration** (user, 28 Oct, amended 29 Oct):
  X-Plane, Navigraph, Little Navmap data (and the sources under a personal-use licence: ENAIRE, NATS) are a local fallback by
  default; they enter the base published in the **private** data repository only when the owner ticks their source, with
  the line « À cocher seulement si le dépôt de données n'est utilisé que par vous (données X-Plane, usage personnel) » ×4
  beside the box. Never by default; no blocking and no record of the declaration beyond the box (§ 4.4).
- **Who may publish is decided by the repository**: the git credentials of the workstation, or the device's GitHub token
  without a launcher (user: « droits du poste »). The screen adds no right of its own; `ctx.level` shapes what is offered,
  it is not a right.
- **Not operational**: every published data set is for flight simulation; the EAD row (§ 4.3) says so on its line.

## 2. Vocabulary (French first; texts `[fr, en, de, es]` through `ctx.t`)

| French | English | German | Spanish | Meaning |
|---|---|---|---|---|
| **Couverture** | Coverage | Abdeckung | Cobertura | the countries and regions the airline publishes that this workstation maintains; a personal list kept on the device |
| **Jeux de données** | Data sets | Datensätze | Conjuntos de datos | the sources (one row each) |
| **Télécharger** | Download | Herunterladen | Descargar | bring the source into the workstation's cache |
| **Construire** | Build | Erstellen | Construir | run the builder on the cache, outputs written locally |
| **Publier** | Publish | Veröffentlichen | Publicar | send the outputs to the data repository |
| **Purger** | Purge | Bereinigen | Purgar | remove what is superseded (cycles beyond the three kept, caches); never a procedure read by hand, EAD or OCR |
| **Mettre à jour** | Update | Aktualisieren | Actualizar | the four in a row for one data set |
| **Tout mettre à jour** | Update all | Alle aktualisieren | Actualizar todo | « Mettre à jour » for every data set of the coverage, in order (§ 5.3) |
| **Relire** | Read again | Erneut lesen | Volver a leer | read one aerodrome's procedures again (EAD, OCR or by hand), one aerodrome per gesture (§ 4.3) |
| **Retirer** | Remove | Entfernen | Quitar | the owner's explicit removal of one aerodrome read by hand, EAD or OCR (§ 4.2), asked once; never part of Purger |
| **Périmé** | Outdated | Veraltet | Caducado | the state of a procedure read by hand, EAD or OCR whose cycle is no longer in force: still read, never removed (§ 6.2) |

One verb per button, never two words of action on one button. Four groups: **Base aéronautique** (Aeronautical base,
Luftfahrtdatenbank, Base aeronáutica), **Procédures** (Procedures, Verfahren, Procedimientos), **Appareils** (Aircraft,
Luftfahrzeuge, Aeronaves), **Météo** (Weather, Wetter, Meteorología). French typography (U+202F before « : ; ! ? »), as
everywhere.

## 3. The screen

A non-fixed module (it scrolls like a page), `meta.title` « Données ». From top to bottom:

1. **Head**: the AIRAC cycle in force (its number, its dates, « prochain cycle dans n jours »); the runner (« Lanceur de
   <poste> » or « Sans lanceur : lecture et publication seulement »); the repository state (« n publications à envoyer »
   when the launcher has commits not pushed). The **end-of-cycle notice** (§ 6.3) when it applies.
2. **Couverture**: one line, the zones of the coverage by name (« France, Belgique, Espagne ») and a button « Modifier »
   that folds open the list: every zone published in the repository (from aerodb), each a checkbox, plus « Ajouter un
   pays » (the zones the suite knows but nobody publishes yet, from the zone table). Saved at once in
   `cache/data/coverage.json` (§ 7). A zone ticked here and published by nobody is built and published by this workstation.
   **At the first opening every published zone is ticked** (the screen shows what the airline publishes; unticking is the
   rare gesture); nothing is taken over from V2.
   Under it, **the States of the procedures** (V3 § 10.22), from `aerodb.coverageByState()`: one line per colour and reason,
   green (procedures held, with the number of aerodromes), then orange (readable on demand: the SIA's eAIP, EAD Basic),
   then red (nothing readable: tables in images, prose…), each line its reason's label and the States' names; seven lines at
   most, the others under « n autres »; a legend sentence. The colour is never alone: the reason's words carry it.
3. **« Tout mettre à jour »**: the main gesture, one primary button at the top (§ 5.3), with the count of data sets it will
   touch; the four verbs stay on each row.
4. **The groups**, in this order: Base aéronautique, Procédures, Appareils, Météo. Each group is a fold (`details`), open
   when one of its rows needs attention (stale, gap, failure), like the Settings groups; **seven rows at most visible** in a
   group, the others under « n autres jeux » (a fold inside the group).
5. **A row** (one data set) = **link, licence, status and state**: its name; its **cycle** (or edition); a **state** pill
   (§ 6.2) with its date; the **gap** between the workstation and the repository (§ 6.4) in one short phrase; the buttons
   **Télécharger · Construire · Publier · Purger** and **Mettre à jour**, each 44 px, icon and label on a phone; under a
   tap, a folded detail: the source's link (with its address written beside it), its licence and its status (used,
   considered, set aside) from the catalogue (§ 7), files and sizes, counts, warnings, the zones it feeds, the last lines
   of its log. The catalogue's sources that are **considered or set aside** have no verbs: they are rows of the « n autres
   jeux » fold of their group, with their link, licence and status. This replaces the Sources screen (`#sources`), which
   goes with lot D1.
   **In the Base aéronautique group the verbs act on zones, not on rows** (29–30 Oct, lots Construire to Purger): the base
   is built per zone from all its sources, so one panel at the top of the group carries the zones concerned (the coverage's,
   ticked), the personal-licence sources (unticked, with their line) and **Télécharger · Construire · Purger**, then the
   panel **Publier**; the rows below keep their cycle, state and detail, without buttons.
6. **The EAD line** in the Procédures group (§ 4.3): an ICAO code field and « Lire un terrain ».
7. **Journal**: a fold at the foot, the last 50 operations (time UTC with Z, data set, verb, duration, result), each
   unfolding to its log; « Copier ».

Rules:

- **A button is never missing, it is grey with its reason** (§ 6.5), written under the row once per row (not per button).
- **One operation at a time** on the workstation: a running row shows a bar (determinate when the runner gives a total),
  the step, the elapsed time and « Arrêter »; the other rows' buttons are grey with « une autre opération est en cours ».
- **Idempotent**: downloading what is current downloads nothing, building unchanged inputs rewrites nothing, publishing an
  unchanged tree makes no commit; the result says « rien de nouveau ».
- **Plan before change**: Publier and Purger first show their plan (new, changed, removed, size) and ask once
  (`ctx.ask`); nothing is sent or removed without that answer.
- **Notifications** (`ctx.notify`) at the end of each verb and of « Tout mettre à jour » (counts, the sets that failed or
  wait for the user); none at the start. Errors say what to do (« le site du SIA n'a pas répondu, réessayez plus tard »,
  « ce fichier n'est pas un export du SIA »), the technical text is in the journal.
- **A failure never stops the others** in « Tout mettre à jour »; the summary names it.
- 390 px: no horizontal scroll, buttons wrap; 1280 px: the groups in one column, the journal below. No dual-view
  specifics: in a pane the module draws for its width.
- Help: `modules/data/help/<lang>.md` (four languages, French first), anchors `data-…`; `ctx.helpAnchor` follows the open
  group.

## 4. Data sets and their chains

### 4.1 Base aéronautique (one row per source feeding the zones of the coverage)

The base is built **per zone**, from all the sources of that zone together (`sia/base/<zone>/<cycle>/<kind>.json`, the
manifest `sia/base/index.json`). A source row's **Construire** and **Publier** act on every zone of the coverage that the
source feeds (a zone needs all its sources' caches; a missing one is said, not guessed). The rows shown are those of the
sources that feed at least one zone of the coverage.

| Data set (row) | Télécharger | Construire | Notes |
|---|---|---|---|
| SIA France (XML SIA + AIXM 4.5) | ◐ open the SIA product page of the cycle, then pick up `export_xml_bd_SIA_<date>*.zip` from Downloads (launcher) or a file picker | ● | the order is a human gesture (account, licence); its outlines feed the priority rule of every other zone: built first |
| Villes (GeoNames) | ● launcher (`tools/update_cities_geonames.py`) | ● with each zone | `cities`, `cities_major.json`; a status (edition, date) like the others |
| MORA | ○ computed | ● needs the zone's obstacles and the terrain tiles | `mora` kind, `sia/mora.csv` |
| DIRCAM ENR 5.7 (ravitaillement) | ◐ the PDF, picked | ● | `meta.aarXml` |
| openAIP, ENAIRE, FAA ADDS, UK Mil AIP, NAV CANADA DAH | ● launcher (`aero-fetch` providers) | ● | per zone |
| NATS UK | ◐ pick up `EG_*_DS_*_XML.zip` | ● | zone `gb` |
| Points VFR des cartes VAC | ◐ the VAC PDFs (folder pointed once, or picked) | ● Python + pypdf; publish `sia/vfr/` | the importer matches the base's `vrp.json`: after the fr base (France only) |

● the button does it all; ◐ one gesture of the user is part of it; ○ no such step. A step that needs the user says *what
to do* with one link and one gesture, never a command.

### 4.2 Procédures

| Data set | Télécharger | Construire | Publier | Notes |
|---|---|---|---|---|
| eAIP France (SIA) | ● address derived from the cycle; « rien à télécharger encore » until the source publishes the cycle | ● Python + pypdf; places the en-route fixes from the base of the same cycle | ● `proc/<cycle>/` | needs the fr base of the cycle |
| FAA CIFP | ● file name derived from the cycle | ● Python standard library | ● | independent of the base |
| Navigraph / X-Plane (local) | ◐ the simulator's folder, chosen once | ● local only | ✕ never | SID / STAR where no other source has them; « local, jamais publié » on the row |
| Terrains lus (EAD, OCR, à la main) | — | ● one aerodrome per gesture (§ 4.3), installed by `tools/proc_manual.py` | ● | sources `ead-basic` and `manual` (`how`: `ocr`, `hand`); the row's detail lists the aerodromes, each with its cycle and « Relire »; **never purged, never lost at a change of cycle** |

**Procedures read by hand, EAD or OCR** (user, 28 Oct 2026: they cost a human gesture and computation). They live in
`proc/manual/<ICAO>.json` and `proc/manual/index.json`, **outside the cycle folders**, each procedure with its cycle of origin (`source.cycle`) and its source (`ead-basic` | `manual`, `how`: `ocr` | `hand`) (aerodb SPEC § 5 quinquies). They are **never** in the
Purger's scope, never removed nor lost when the cycle changes: the reader merges `proc/<cycle in force>/`, `proc/manual/`
and `proc-seen/`, and serves an outdated procedure as it is with `outdated: true` (at equal status the one not outdated
wins). The screen lists them **« Périmé »** as soon as their cycle of origin is no longer in force, each aerodrome with
**« Relire »** (one aerodrome per gesture: the EAD line, or the OCR or manual reading again). **Only an explicit removal by
the owner** takes one away: « Retirer » in the aerodrome's detail, asked once (`ctx.ask`), then published like any change;
never part of « Purger » nor of « Tout mettre à jour ». A file built by a cycle's builder (eAIP, CIFP) goes to
`proc/<cycle>/` and never touches `proc/manual/`.

### 4.3 « Lire un terrain depuis EAD » (Procédures, one line)

- A field for **one ICAO code** and the button « Lire un terrain »: one aerodrome per call, an explicit gesture, never a
  list, never scheduled (decision of the data owner of the day, `frame/aerodb/EAD_BASIC.md`).
- The line says, always visible: « EAD Basic : non opérationnel, pour la simulation ; un terrain à la fois ».
- The launcher logs in with the owner's EAD Basic credentials, given once to the launcher in Settings' keys panel
  (Administration, launcher only, never synchronised) and kept in its secrets store (never read back by a page, never in a
  repository or a log), searches the aerodrome's **Charts** documents (`AD_2_<ICAO>_…`, the first page of results only,
  15 rows), downloads them into the workstation's local cache only, reads the coding tables with the known layouts (pypdf,
  OCR for drawn pages), and installs the result through `tools/proc_manual.py` (status `check`, source `ead-basic`, the
  State's notice: not operational); then the result: procedures read, pages not understood (listed, never guessed).
- **« Remplacer ou fusionner »**: when the aerodrome already has a file from another source, `proc_manual` refuses without
  `--replace`; the screen asks once (`ctx.ask`): replace that file, or merge (keep the other source's procedures, add the
  ones read). Publishing is the Procédures group's « Publier ».
- Grey with its reason when there is no launcher, no EAD credentials, « OCR manque » for a State whose pages are drawn, or
  « Mise en page inconnue pour cet État » (the EAD outcome per State is data of the catalogue, `eadStates`).

### 4.4 Appareils, Météo

| Group | Data set | Chain | Notes |
|---|---|---|---|
| Appareils | Types et performances | ● all four, by the launcher (`AircraftDB/`) | Python, pypdf for the Doc 8643 PDFs |
| Météo | Météo mondiale (GFS) | status only: the cycle of the last run from the site | built and published with the site; no button |
| Météo | Pistes NAT du jour | status only: the time of the message from the site | read on the site (user, 28 Oct), not in the base: no rebuild for them |

**X-Plane / Navigraph / Little Navmap** inputs (and the sources under a personal-use licence) enter a published file only
when the owner has ticked their source for the zone, beside the line « À cocher seulement si le dépôt de données n'est
utilisé que par vous (données X-Plane, usage personnel) » ×4; unticked (the default), a published zone's build drops them,
and a workstation may still build them for itself (« local, jamais publié »), into its local cache only.

### 4.5 Order and dependencies

fr base (its outlines feed the priority rule) → other zones → MORA → eAIP (needs the base of the same cycle) → VAC points
(need `vrp.json`) → aircraft (independent) → CIFP (independent) → **one** publication for everything (one commit).

## 5. Verbs

### 5.1 The four verbs

| Verb | Does | Result |
|---|---|---|
| **Télécharger** | brings the source into the workstation's cache: a download by the launcher, or the pick-up of a file the user obtained (Downloads folder, file picker); the expected name is checked and the cycle read from it, a wrong file is refused | files, size, date, « inchangé » |
| **Construire** | runs the builder on the cache, on the launcher, one process per zone (§ 5.4), writes the outputs locally (never a partial output); X-Plane / Navigraph inputs dropped for what will be published | counts, warnings (rows not read), duration, per zone |
| **Publier** | plan, one question, then sends the outputs to the data repository under the device's trigram (commit author) | files changed, « rien à envoyer » |
| **Purger** | plan, one question, then removes what is superseded: base and cycle-built `proc/` cycles beyond the three kept (§ 6.1), never a procedure read by hand, EAD or OCR (§ 4.2), caches of earlier cycles, this workstation's cache of countries no longer in its coverage (never a published zone: another workstation may maintain it), stray files | files and MB freed |

### 5.2 « Mettre à jour » (one data set)

Télécharger → Construire → Publier → Purger for that set, skipping a step with nothing to do; it stops at a step that
waits for the user (a file to pick) and says so. One plan question for Publier and Purger together.

### 5.3 « Tout mettre à jour »

Every data set of the coverage, in the order of § 4.5, the publications grouped into one; a set waiting for the user is
skipped and listed at the end (« 2 jeux attendent votre geste »). It is V2's « Activer » and « Tout récupérer et
recalculer », with the publication and the purge added, its builds run in parallel by zone (§ 5.4).

Rules (V3 § 10.34, 30 Oct 2026):
- **A plan first, one question**: the sets that will run, in order, with what each will change (zones, States, types,
  the AIRAC cycle of what is built), the sizes known (downloads, outputs) and the files a purge would leave; « Tout mettre
  à jour » runs only after the answer.
- **Downloads and builds in the published order** (§ 4.5), each set with its own verbs (§ 5.5), one operation at a time,
  the running set and step shown, « Arrêter » for the whole chain.
- **Stop at the first failure**: the failing set and its reason said; what was built before it stays committed on the
  workstation; nothing is published. A set waiting for the user (a file to pick) is a stop too, said as such.
- **One Publier at the end** (the frame's gesture sync, INTEGRATION § 1.3), only when every set succeeded; no purge in
  the chain (Purger stays its own gesture, plan first).
- Journal: one entry for the chain, `{ set: 'all', verb: 'update', items: [{ set, result }], result }`, written as a marker
  (`result: 'running'`) at the start and replaced at the end; a marker found without its end at the opening is said
  « chaîne interrompue par le rechargement » (the chain itself does not survive a reload, its running job does). The sets'
  own entries are not written during the chain.

### 5.5 The same four verbs for every set (V3 § 10.34, lot A1)

Every group has the panel the Base aéronautique has (§ 3, rule « In the Base aéronautique group… »): **one choice of
items** (zones for the base, States for the procedures, the cycle for the VAC points, types for the aircraft, the
sheets for the company's published sheets), then **Télécharger · Construire · Purger**, then **Publier** (the one gesture
sync of the frame, shared by every group: it sends whatever is committed). The same rules for all: one operation at a
time whatever its set and verb, found again at the opening; the journal; Purger runs dry first and asks once with its
plan; **nothing committed by Télécharger or Purger** (the raw sources are never published, 0d2f031d3); Construire
commits its outputs on the workstation (the launcher's `commit_outputs`); a grey button says its reason once.

| Group | Items | Télécharger | Construire | Purger | Today in V2 |
|---|---|---|---|---|---|
| Base aéronautique | zones | `base/fetch`, and `base/pickup` for the files to drop by hand (the SIA France zip, the NATS zip: taken from Downloads, dry run and one question first, raw sources never committed, never in « Tout mettre à jour »; the real run names the zip shown in the plan per source, `zips: { <source>: { name, size } }`, and a file changed since the plan is refused for that source, « Relancer le plan », 79aaed096; a zip whose name breaks the launcher's rule (letters, digits, `. _ -`, 150 characters) is shown but never taken, « nom de fichier à renommer ») | `base/build` | `base/purge` | delivered |
| Procédures | the States with a bulk source only: LF (the SIA's eAIP) and K (the FAA's CIFP); an EAD Basic State is never fetched in bulk (`frame/aerodb/EAD_BASIC.md` § 1: one aerodrome at a time, « Relire » in Fuel or on the Map) | `proc/fetch` | `proc/build` | `proc/purge` | per aerodrome only (`proc/eaip-fetch`, `proc/ead-fetch`) |
| Points VFR des cartes VAC | the cycle in force (France); Purger clears the cached charts of every cycle | `vfr/fetch` | `vfr/build` | `vfr/purge` | `/__setup/vfr-import` (a compiled file picked in the page) |
| Appareils (types et performances) | ICAO types (the fleet's by default) | `aircraft/fetch` | `aircraft/build` | `aircraft/purge` | `/__setup/aircraft-db` |
| Fiches publiées de la compagnie | the sheets | — | `aircraft/publish` (plan, then the copy) | — | `/__setup/aircraft-publish` |

The launcher's verbs are asked of their owners (V3 Frame: `tools/launch.py`, `tools/regen/`; aerodb: `tools/regen/proc.py`),
each with the base's contract: `regen/job { set, verb, args: { <items> } }`, a view with `<items>` at its root (state,
done / total, error code), a result with what changed, failed, and a reason; `dry: true` for a purge; Télécharger and
Purger never commit. A verb not yet on the launcher: its button grey, « Le lanceur de ce poste ne connaît pas encore
cette opération » — the module reads `GET regen/verbs` once at the opening (`{ verbs: ['base/build', …] }`, frame d8919b0e6);
no answer means an older launcher with `base/*` only. The aircraft verbs follow their launcher (d8919b0e6): the view's items
are three steps (types, apd, simbrief), `aircraft/build` commits nothing (AircraftDB/ is not versioned), the company's sheets
reach the data repository by `aircraft/publish` (dry by default, the trigram required). **The V2 maintenance page link leaves the Maintenance rail when every row of this table has its four
verbs.**

**The map of the zones** (Base and Procédures panels, 30 Oct): `ctx.aerodb.zoneOutlines()` drawn in SVG above the list, one
selection written by the module and read by both; colour by state with its words on hover and keyboard; no map when a zone
would be under 44 px or the outlines are missing. A zone whose outline is only its frame (no ring, or a ring equal to its
box: known from the data, never from an id) is drawn dashed and said « contour approximatif ».

### 5.4 Building on the launcher: one process per zone

The user's request of 29 Oct (V2's « Tout récupérer et recalculer » is slow: built in the browser, on the main thread,
file after file). The rule:

- **The build runs on the launcher**, never in the page when a launcher is there: the module orders it (`regen/job`), the
  launcher runs it and the page only follows.
- **One process per zone**, as many at once as the workstation's cores minus one (at least one); the other zones wait
  their turn. A zone's process runs its sources' pieces then its assembler (INTEGRATION § 2.3); zones share nothing
  but France's outlines, read-only. **A zone's process is the workstation's own browser without a window** (Edge, else
  Chrome) running the existing JavaScript builders, one instance per zone, orchestrated by `tools/regen/base.py`; without
  such a browser, the build falls back to the page; no Python port, no engine downloaded (ergonomics session on aerodb's
  note, 29 Oct; the detail is aerodb's).
- **Progress per zone**: each zone's line says « en attente », « construction (n / m sources) », « construite », or its
  failure; the head shows the count (« 4 zones sur 11 »). Following stops when the page closes, the job goes on and is
  found again (`ctx.launcher.resume`).
- **Published zone by zone**: a zone is written (`regen/put`) and committed alone as soon as it is built, without waiting
  for the others (one commit per zone, § 7); a failed zone publishes nothing and never stops the others (invariant 4).
- **Without the launcher** (§ 8) the Worker path stays: one zone at a time, from the picked files.
- **The V2 page stays as it is**: Settings › Maintenance keeps its build in the browser, unchanged and obsolete; no
  parallel build is added there (a Worker cannot use `DOMParser`, and its readers work file after file). The parallel
  build exists only in this module.

## 6. Cycles and states

### 6.1 Cycles

- **A cycle is stored and exchanged as its effective date** `YYYY-MM-DD` (folders `sia/base/<zone>/2026-10-01/`,
  `proc/2026-10-01/`, every answer of aerodb); it is **shown** as the AIRAC id `YYNN` (« 2610 »). One calculation,
  `frame/aerodb/airac.js` (`cycleOf(date)` → `{ id, date, next, prev }`, `cycleDate(id)`); the module converts only for the
  screen.
- The **AIRAC cycle in force** and the next one come from that calculation (28 days).
- **Three cycles are kept** for the base and for the cycle-built `proc/` (eAIP, CIFP) (user, 28 Oct): the previous, the one
  in force, the next. Purger removes the others; a publication never removes the cycle in force. **Procedures read by
  hand, EAD or OCR are outside this rule**: kept whatever their cycle (§ 4.2).

### 6.2 State of a row (computed, never typed)

Fields: `cycle` (of the thing), `fetched { at, bytes, files }`, `built { at, parserVersion, inputs (fingerprint), counts }`,
`published { cycle, at, parserVersion, by, format }` (read through `aerodb.publication()`, INTEGRATION § 2; `by`, the trigram
of the build, from the zone's `meta.json` once the builders write it; `format: 'whole'` for a zone still in the old whole
format, listed, never read: its row says « format ancien » and Construire rewrites it), `unpushed` (built or committed, not on the
remote). One pill, by priority, the others in the detail:

1. **« Cycle dépassé »** — the published cycle is older than the cycle in force (amber; red past its end + 7 days).
2. **« Nouveau cycle »** — the next cycle's source is available and not built.
3. **« Parseur ancien »** — published `parserVersion` below the builders' current one (`AeroCatalogue.PARSER_VERSION`, equal to
   V2's `SiaBase` version until the builders of D5; read, never written in the module).
4. **« Source plus récente »** — downloaded after the last build, or the inputs' fingerprint changed.
5. **« Non publié »** — built here, not on the repository.
6. **« Périmé »** — a procedure read by hand, EAD or OCR whose cycle is no longer in force (amber, with « Relire »): still
   read by every device, never removed.
7. **« À jour »** (green).

Ages follow V2's rules (AIRAC sources against the cycle in force, anything else after 28 days).

### 6.3 End of cycle

When the published base or `proc/` is older than the cycle in force, or the cycle ends within 3 days with nothing
published for the next: **on every device**, an amber line of the Status block, drawn by the frame (« Base aéronautique :
cycle 2610 dépassé, à reconstruire pour 2611 », or « … : le cycle 2611 se termine le 25/11, rien de construit pour 2612 »;
INTEGRATION § 1.4): nothing to press on a phone; **on a workstation** with a launcher at the Full level it leads to
`#data`, whose head shows « Reconstruire pour le cycle 2611 », which is « Tout mettre à jour ». On a phone the module
opens **read-only** (no verb), by its address `#data` or the line « Maintenance » of Settings › Administration (ergonomics
session, 29 Oct: useful to see the coverage on the road); it has no tab in the phone's bar.

### 6.4 The gap between the workstation and the repository

One phrase per row: « identique au dépôt »; « le dépôt est plus récent (2611, publié par ABC le …) »: Télécharger here is
not needed, the workstation's own outputs are behind; « ce poste est en avance (non publié) »; « absent du dépôt ». A
publication by anyone updates everyone (user, 28 Oct); the gap is what the screen shows instead of a lock.

### 6.5 Grey buttons and their reasons (four languages each)

| Reason | When |
|---|---|
| « Il faut le lanceur du poste » | Télécharger, and any Python build, without a launcher |
| « data/ n'est pas un dépôt git » / « sans dépôt distant » | Publier on a launcher; link to Settings › Accès |
| « Votre trigramme n'est pas réglé » | Publier (the commit author, `[A-Z0-9]{2,5}`) |
| « Accès au dépôt non réglé » | Publier without a launcher and without the device's GitHub access |
| « pypdf manque : l'assistant de première installation l'installe » | Construire of eAIP, VAC points, aircraft; a link to the first-install assistant (`apps/settings/premier_lancement.html`, a V2 page served by the launcher) as long as it exists — to be ported (ROADMAP D8) |
| « Rien à télécharger encore » | the source has not published the cycle |
| « Aucun fichier trouvé dans Téléchargements » | SIA, NATS, CIFP picked up; « Choisir le fichier… » beside it |
| « Une autre opération est en cours » / « hors ligne » / « disque plein » | any |
| « Ne nourrit aucune zone de la couverture » | a base source whose zones were removed |
| « Mise à jour de la suite en cours : réessayez après le redémarrage du lanceur » | any job start during an update of the suite (409 `updating`) |
| « Une construction est en cours : publiez quand elle est finie » | Publier of the base during a build (the launcher would keep `sia/base/` anyway) |
| « Le cadre ne sait pas encore publier la base : mettez l'appli à jour » | Publier when `ctx.data.sync.gesture` is not `true` (never a pass without the gesture) |
| « Rien à publier » | Publier when the workstation has no file changed and no commit to send (`sync-status`) |
| « OCR manque » | Construire of a State whose pages are drawn (UK STARs, Belgium, Georgia), the EAD line and « Relire » |
| « Pas d'identifiants EAD » / « Mise en page inconnue pour cet État » | the EAD line (the outcome per State from the catalogue's `eadStates`) |

## 7. Reads and writes

- **Reads**: aerodb's four calls only (INTEGRATION § 2) — `coverageByState()` (the States' list of § 3.2), `publication()` (what is published, without loading the data),
  `zones()` (every known zone, for « Ajouter un pays »), `sources()` (the **catalogue**: groups, zones fed, how each source
  is fetched and built, links by cycle, licences, statuses, `eadStates`, the file-name readers); never `sia/base/`, `proc/`
  or `AircraftDB/` directly, never aerodb's files; the workstation's state through `ctx.launcher` (INTEGRATION § 1).
- **Writes through `ctx.data`** (policy `cache`, never synchronised, never in a backup): `cache/data/coverage.json`
  (`{ zones: [id], updated_at }`) and `cache/data/journal.json` (`{ ops: [{ at, set, verb, zones (the base) | items (any other set), seconds, result, built,
  failed, job, reason? }], updated_at }`, the last 50 operations, newest first; a job found already ended at the opening is
  written once, by its id). Nothing else.
- **The outputs** (`sia/base/`, `proc/`, `sia/vfr/`, `AircraftDB/`, `sia/mora.csv`) are never written through `ctx.data`
  (its batch is for records, not for 20–60 MB of generated files): on a workstation the launcher writes and commits them;
  without a launcher `ctx.publish` commits them, one commit per zone or per cycle of `proc/` (INTEGRATION § 1.3).
- `meta`: `{ id: 'data', apps: ['pilot'], level: 3, title, reads: ['cache/data/'], writes: [{ prefix: 'cache/data/', policy:
  'cache' }], launcher: { routes: ['regen/'], read: ['sia/', 'proc/', 'local/', 'AircraftDB/'] }, publish: ['sia/base/',
  'proc/', 'sia/vfr/', 'AircraftDB/', 'sia/mora.csv'], files: [… the Worker script included] }` (`frame/INTEGRATION.md`
  § 15). **Until the other verbs exist** the declaration stays the narrowest: `launcher: { routes: ['regen/job',
  'regen/verbs', 'sync-status'], read: [] }` (declaring a job's route declares its cancel, frame f70eba426; `regen/verbs`
  for the verbs this launcher knows; `sync-status` for the count before « Publier »).

## 8. Without the launcher

- **Shown**: everything that is published (cycles, states, gaps), the coverage, the journal.
- **Possible**: Construire from files the user picks (the SIA zip, an openAIP export, the CIFP zip…), in a Worker with the
  base's JavaScript builders; Publier through `ctx.publish` (the device's GitHub access, the token never leaves the frame):
  one commit per zone, a conflict said (« Quelqu'un a publié pendant l'envoi : relancez ») and resumed from where it
  stopped.
- **Not possible**, said on the screen in one sentence under the head: « Sans le lanceur, l'appli ne peut pas télécharger
  les sources (les sites ne le permettent pas à une page web) : choisissez le fichier, ou utilisez le poste. » Télécharger is
  grey with its reason; the Python builds (eAIP, VAC points, aircraft, EAD) too.

## 9. DOM contract (for the tests)

- Head `[data-data-head]`, cycle `[data-cycle-now]`, runner `[data-runner="launcher|none"]`, end-of-cycle notice
  `[data-cycle-alert]`.
- Coverage `[data-coverage]`, its checkboxes `[data-zone="<id>"]`.
- « Tout mettre à jour » `[data-verb="all"]`.
- Group `details[data-group="base|proc|aircraft|weather"]`; its overflow fold `[data-more]`.
- Row `[data-set="<id>"]` with `data-state` (`absent` « Absent du dépôt », `stale-cycle`, `new-cycle`, `parser`, `source-newer`, `unpushed`, `outdated`, `stale-age` « Plus de 28 jours » for a set without a cycle, `ok`),
  `data-cycle`, gap `[data-gap]`, reason `[data-reason]`; buttons `[data-verb="download|build|publish|purge|update"]`
  (`disabled` when grey); running bar `[data-running]`, « Arrêter » `[data-verb="stop"]`.
- EAD line `[data-set="ead"]`, field `[data-f="icao"]`, button `[data-verb="ead"]`.
- An aerodrome read by hand, EAD or OCR `[data-aerodrome="<ICAO>"]` in the detail of its row, `data-state="outdated"` when
  its cycle of origin is no longer in force, buttons `[data-verb="reread"]` and `[data-verb="remove"]` (« Retirer »).
- Journal `[data-journal]`, entries `[data-op]`.

## 10. Invariants

1. Nothing from X-Plane, Navigraph or Little Navmap (nor from a personal-use licence) in a published file **by default**: only
   on the owner's explicit declaration, the ticked source with its line « À cocher seulement si le dépôt de données n'est
   utilisé que par vous » (user, 29 Oct 2026); published to the private repository only.
2. No publication and no purge without its plan and one answer.
3. The cycle in force is never removed; three cycles kept for what a cycle's builder makes; a procedure read by hand,
   EAD or OCR (`proc/manual/`) is never removed by the module's own operations (it turns « Périmé »): only by the owner's
   explicit « Retirer ».
4. One operation at a time per workstation (a build's zones run in parallel inside it, § 5.4); a failure of one set or
   one zone never stops « Tout mettre à jour ».
5. No `fetch`, no storage of its own, no token handling in the module: `ctx.launcher`, `ctx.aerodb`, `ctx.data` and the
   frame's publication service only.
6. No path, URL or command comes from the page to the launcher: data-set ids and verbs from a fixed list, arguments
   validated by the launcher (cycle, ICAO code).
7. ICAO and EUROCONTROL data are published only to the private data repository, never to the public site; a source whose
   licence forbids it has no row (DFS).
8. EAD: one aerodrome per gesture, never scheduled, credentials never leave the launcher.
9. The data are common, the coverage personal: the module never removes a zone another workstation publishes.
10. Compiling and using stay apart: the module orders builds, the reader uses; the builders never publish, they return
   files that the launcher or the frame's publication service writes.
