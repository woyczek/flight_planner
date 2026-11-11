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
   ticked), the personal-licence sources (unticked the first time, then **remembered**, see below, with their line) and **Télécharger · Construire · Purger**, then the
   panel **Publier**; the rows below keep their cycle, state and detail, without buttons.
   **One panel for every set** (R-S7): the base is an entry of `SETS` like the others, and its panel is drawn by the same set panel as the procedures, the VAC points and the aircraft,
   driven by that entry (its items, its verbs, the extra verb « Prendre le fichier téléchargé » that only the base has); the base panel keeps its attribute `data-build`, the others
   `data-set-panel`. **One gate for every set, the base included**: before the gesture, `setGate` (model.js) gives each verb its
   grey reason (no launcher, another operation running, offline, no item ticked, a verb the launcher does not know); after it,
   the launcher's refusals (409 `updating` or another operation, 429 too soon, 404, 400 refused arguments) go through `refusal`
   and a job's end such as `merge-pending` through the one summary table, with no branch of the base's own.
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
- **The sets are independent** (SOG-0239, the user: « on continue »): a failure stops the steps of that set only (no build
  without its download), never the others, like « Mettre à jour » on zones. Only « Arrêter » or a set waiting for the
  user (a file to pick) stops the whole chain, said as such. What was built before a failure stays committed on the
  workstation.
- **The end summary lists the failures**, each with its reason and « Réessayer »: that set alone is run again (download
  then build, then the publication); the other sets keep their result.
- **One Publier at the end** (the frame's gesture sync, INTEGRATION § 1.3), as soon as one set succeeded: what failed adds
  nothing to publish (a partial build may have committed part of its files, those go too); no set succeeded → nothing is
  published. No purge in the chain (Purger stays its own gesture, plan first).
- Journal: one entry for the chain, `{ set: 'all', verb: 'update', items: [{ set, result }], result }`, written as a marker
  (`result: 'running'`) at the start and replaced at the end; a marker found without its end at the opening is said
  « chaîne interrompue par le rechargement » (the chain itself does not survive a reload, its running job does). The sets'
  own entries are not written during the chain.

> **Reading again after an operation** (SOG-0072): the real end of a build, download, purge, sheets publication, publication and of the chain calls `load(true)`: `ctx.aerodb.refresh()` (aerodb keeps its list of published zones until told), then the openings' reads. Case L31.

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

**The map of the zones** (Base and Procédures panels; redone 31 Oct after the user's phone test: « je m'attendais à une carte
scrollable avec tous les éléments fonctionnels de la carte en V2 ; c'était efficace » — the SVG of 30 Oct was a stamp, the
United States a rectangle, the islands dots).
- **The shared map base**, never a copy: `modules/maps/lib/map_base.js` (maps INTEGRATION § 7), as the Map and the Weather use
  it. MapLibre loaded on demand (`loadMapLibre`, `startTiles`, `styleFor` by the design's tone, `mapSize` on every size
  change), the same base; the zones drawn from `ctx.aerodb.zoneOutlines()`. It pans and zooms with the finger like the Map.
- **Each zone a filled polygon** in the tint of its state (the design's tokens, never the colour alone: its name and its state
  in words beside it, in the one-line legend and in the list), a thick outline when ticked, dashed and said « contour
  approximatif » while aerodb has only its frame (no ring, or a ring equal to its box: known from the data, never from an id).
  The word stays defined; on 31 Oct it applies to no zone (AeroDB checked: every zone has its real rings).
- **A tap on a zone ticks or unticks it**: the same selection as the list, one writer, the module's state (unchanged); a drag
  or a pinch ticks nothing. **A country outside the coverage is drawn too** (SOG-0070: every zone `zones()` knows and whose outline is known, grey
  « not in the coverage ») and a tap on it **adds it** to the coverage, ticked, exactly like « Ajouter un pays » (`addZone`, handed to the map by
  `S.addZone`: the map file cannot import the screen's); a tap on a country of the coverage only ticks or unticks it, never a purge. The first view and
  « Recentrer » frame the countries of the coverage, not the world the known ones draw. Case L30. The polygons tappable by id come from the base (asked of the Map's owner when missing, never
  rewritten here).
- **The first view frames every zone of the panel**; « Recentrer » brings it back after the pilot moved. The frame is the base's:
  `zonesLayer.fit()` without bounds, which reads each zone's **main ring** (the largest: metropolitan France, the 48 States) and
  unites them, never aerodb's boxes: one rule, in one place, nothing of it rewritten here. The rings drawn are aerodb's `framed`
  (shifted by ±360° into the zone's `box`, aerodb fed1c6f4a), else its `rings`; `unwrapRing` still reads each drawn ring in one
  piece (a no-op on framed rings). The other rings (the islands, Alaska, overseas France) stay drawn and tappable, reached by
  panning.
- **Size**: about 45 % of the view's height on a phone; at 1280, the map in its own column beside the list.
- **The one-line legend stays; the list stays under the map** and is the fallback: no map when the base does not come
  (MapLibre or the tiles missing, offline without them in the cache) or the outlines are missing; then the list alone. The
  map is shown as soon as the base loads: no size rule (the 44 px rule of the SVG is gone), a zone small at the first view
  (Gibraltar) is touched after a pinch, and the list is always there.
- **The aerodromes held** (the Procédures panel, user, 1 Nov 2026: « on ne voit pas les terrains déjà téléchargés ? »). Each State line says its
  aerodromes held: « France — 3 069 terrains, cycle 2611 » (the cycle of the published procedures in force, `M.cycleName` of
  `pub.proc.inForce`), « n terrains relus » for the other States; the count is `coverageByState()[prefix].held`, the table the screen already
  reads once per load and again after `{ coverage: true }` (no second read). On the map of the States, **above the base's `COVER_ZOOM`**, the aerodromes
  held are points, drawn by the base's `pointsLayer` (`MB.pointsLayer`, read by name: a base without it gives no points, the counts stay): the
  view is read from the local base with `aerodromes({ bbox, lite })` (the box split in two across the antimeridian, `M.viewBoxes`), each
  `coverage(icao)` decides — held and up to date: green (`ok`); held of a past cycle (`outdated`) or partial: orange (`warn`); red and orange
  readable-on-demand are not downloaded, so not drawn (`M.coverTone`) — redone on `moveend`, nothing read and nothing drawn below the zoom. **It is a
  read, of the local base: never a download, never a write.** A tap on a point says its code, its state in words and its cycle (published
  procedures: the cycle in force; a hand or local reading: the date read) in a line under the map (`[data-point-info]`, never a window) and does
  not tick the State below it. Cases L21–L23.
- **Cases**: L20 — a tap on a polygon ticks the zone (the list's box follows), a drag or a pinch ticks nothing, « Recentrer » frames the
  zones again, no base → the list alone. Screenshots at 390 and 1280, before and after, in DECISIONS.

### 5.7 The route row: « Route (RAD, points FRA) » (SOG-0125)

The launcher's job `route/import-rad` (`tools/regen/route.py`, `frame/aerodb/INTEGRATION.md` « Route computation ») reads the EUROCONTROL workbooks `RAD_<cycle>_v….xlsx` and `eurocontrol-airac-<cycle>-fra-points-….xlsx` of Downloads and compiles them into
`data/route/rad.json.gz` and `fra.json.gz`. The RAD and the FRA points are **a source of data like NATS**: one more row, in the **procedures** group after its rows (`route.js`, `routeRowHtml`), with the same template
(summary: name, text, state pill; fold: link, licence, button).

- **State**: the same pills as the other sets (`routeState` over `pickState`): `absent` without any imported RAD, `stale-cycle` (amber, then red) when the latest RAD precedes the cycle in force, `ok` otherwise. The cycles present come from
  `cache/data/route.json` (`{ rad: [dates], fra: [dates], at, commit }`, written by this module after a real import, read once per opening) **and**, when the reader gives it, `publication().route` (`{ rad, fra, at }`): the two add up.
- **The gesture** (like « Prendre le fichier téléchargé », base/pickup): « Importer de Téléchargements » → the **dry plan** (`dry: true` sent explicitly; nothing written) → **a question that names the workbooks** (kind, cycle, size; the unreadable ones of Downloads
  said apart, never taken) and says the licence (EUROCONTROL Network Manager documents, use by the company, private repository only) → « Importer » sends `dry: false` with **only the books the plan showed** (`books: [{ name, size }]`, never a plan
  read again: the launcher refuses a file that is no longer the one shown, `changed`) → the end says what was taken (cycles), the cycles present and the commit. « Annuler » sends nothing. No workbook in Downloads: said, no question.
- **The address** `?app=maintenance#data?source=eurocontrol_rad` (the link of Fuel's Route step, Features SOG; `ctx.query.source`, `route` accepted too) opens the procedures group and the row and brings it on screen, once per opening. Case L35.
- **Grey button**: no launcher, another operation running (the route's own phase counts: `busyNow`), the launcher does not know `route/import-rad` (`regen/verbs`).
- **Everything the launcher or the file says is read as untrusted** (`model_route.js`: workbook names in a closed pattern, sizes and dates checked, kinds in a closed list, a name shown only if the plan showed it). Cases L33, L34.

### 5.8 Three verbs and the selection gestures of the base (SOG-0071, time 1; V3_SPECIFICATION § 10.44)

The base panel's row is **Mettre à jour · Télécharger · (Prendre le fichier) · Tout recalculer · Purger**; above the zones list, a row **Seulement les périmés · Tout désélectionner** and the line **Sélection : n zones · taille**.

- **Mettre à jour** (`update.js`, `startUpdate`): the download of the whole selection (the ordinary `base/fetch`, its own result and notification), then **the launcher's state** (`base/status`, § 5.9) for the selection, then — if some zone is not up to date and
  buildable — **one question** that names the count (« 1 des 5 zones cochées »), the size (sum of `publishedKb` of those zones, « + » when a size is unknown) and why: the first reason of each zone, **one sentence per reason when it is shared by more than three zones**
  (« 45 zones : construites avec un ancien analyseur (v21, actuel v22) »), « Cela peut être long » from ten zones; the zones that wait for a file of Downloads (`pickup-waiting`, `source-old`: not buildable) are named and left out (« Prendre le fichier téléchargé » first);
  then `base/build` on the buildable zones only (the personal sources ticked go with them). Nothing to rebuild: one sentence, no question, no build. A download that fails or is stopped stops the verb; **an unreadable state stops it too, and says so: never a build in the dark**.
  The page composes the verb (download, state, question, build) instead of the launcher's one-job `base/update`: that job cannot ask between the state and the build, and the question must name what the download just changed.
- **Tout recalculer** is the build as it was (`data-verb="build"`, no new question: its cost shows in the *Sélection* line before the tap), on the whole selection whatever its state. **Purger** is unchanged (its plan and its question).
- **Seulement les périmés**: reads the state (`base/status`) for the coverage, then the selection becomes the zones that are not up to date and buildable (no download); none: said, the selection stays; state unreadable: said. Grey without `base/status` in `regen/verbs`. **Tout désélectionner**: nothing ticked (the verbs grey). The selection is `S.ticked`, in the page's state: never written to `data/`.
- **The rectangle** (`zonemap.js`, `installRect`): **Shift + drag** on the base map (the map's own Shift-zoom is off), or **two fingers held 400 ms** within 14 px of where they landed (the rectangle runs from one finger to the other; the map's pan and pinch are
  suspended for the gesture and given back after); fingers that move earlier are an ordinary pinch (nothing drawn). The zones of the **coverage** whose frame (`box`) touches the rectangle (longitudes tried at ±360°) are counted live (« 14 pays », in the rectangle's corner)
  and ticked **at the release** (added to the selection, never replacing it); a zone outside the coverage is never added by a rectangle. Cases L36 (verbs), L37 (selection gestures), L38 (rectangle, mouse), L39 (rectangle, two fingers, 390 px capture).

- **Agreement, no more « (s) » on screen** (ergonomist, 10 Nov 2026): `tt(row, vars)` (state.js) resolves the marks `(s) (x) (es) (en) (n) (e)` stuck to a word by the number `{key}` that precedes them in the text (`agree`, `frame/lib/plural.js`: fr 0 and 1 singular, en / de / es only 1; no number before a mark: plural), then the frame substitutes the `{key}`; `count(unit, n)` takes its noun with the same rule (« 0 zone », « 1 zone », « 2 zones »). The texts keep their marks as the convention of the data module; a text with a count and a noun that must agree carries the mark. The pack notes say what they mean (« Pays de ce paquet pas encore dans la suite : n », « Pays en partie seulement dans ce paquet : n »). Bench `frame/lib/test/plural.html` (case A131).
- **SOG-0191 and SOG-0189 (10 Nov 2026): « en partie à jour », and the step-by-step on the line.** (1) `publication().vfr = { cycle, at, count, cycles: { 'AAAA-MM-JJ': n } | null, unknown, partial }` (AeroDB): when `partial` is true the row of the set (`vac`) is in the new state **`partial`** (« En partie à jour », amber, ahead of « Cycle dépassé » in `STATE_ORDER`/`pickState`: a set is up to date only if all its parts are) and its line says **« en partie à jour : n en 2611, m en 2610 »** (the cycles by date, newest first, ten at most, integers bounded; `unknown` as « n de cycle inconnu »), never « à jour ». `cycles: null` (an older index): `partial` is false, nothing more is said. (2) On the line of a zone that waits for a file (`zoneActionHtml`), under « Prendre le fichier téléchargé », the **step-by-step of its source** from `AeroCatalogue.stepsOf(source, cycle)`: ① « Ouvrez la page de la source » (the DIRECT link, https only, new tab, `noopener`; the home page of the site as the fallback « si ce lien ne répond plus »), ② « Téléchargez <exact file name> » for each file (its direct link when it has one) with what it brings, ③ « Puis touchez le bouton « Prendre le fichier téléchargé » ». No link is checked by the page; none is shown without https. Case L69.
- **SOG-0199 (11 Nov 2026): « Choisir le fichier… »** (`upload.js`; `ctx.launcher.upload`, frame INTEGRATION § 15.1; the launcher's `POST /__setup/base/upload`, AeroDB INTEGRATION « Envoi d'un fichier choisi à la main »). On the line of a zone that waits for a file, beside « Prendre le fichier téléchargé »: the system chooser (a hidden `input[type=file]` of the screen), the file sent **as raw bytes** (name as an encoded hint, 1.5 GB at most checked before sending), progress on the line (bar, « n % », « Annuler » which aborts), **one operation at a time** (`S.upload` is part of `busyNow`: every other gesture is grey). The launcher recognises the file by its content (SIA, NATS, LFV, openAIP; a PDF, a lone XML or a workbook is not taken by this first batch) and puts it where `base/pickup` reads (`data/local/upload/`); the answer `{ ok, source, zone, name, replaced }` is said (« reconnu : NATS UK, Royaume-Uni. La prise suit. », or « déjà là, rien n'est réécrit »), then **the usual path follows**: `startPickup(zone)` — the plan, the question, the pickup, the build of the zone. A refusal is said in words from the closed list (`too-large`, `empty`, `type`, `unrecognised` with the sources the upload takes, `busy`, `merge-pending`, `disk`, `refused`), an old launcher (404) says it does not know uploads yet, a cut network and a cancel are said; nothing follows a refusal. Case L70.
- **SOG-0180 reopened (10 Nov 2026): « Mettre à jour » only does what is not up to date** (`update.js` `startUpdate`, `planText`; `model_status.js` `downloadPlan`; `panels.js` `sourcesWhy`; `status.js` `zoneActionHtml`). The state (`base/status`) is read **before** anything is downloaded: per zone, up to date → skipped; `download.done` (AeroDB's field: every downloadable source has a file written since the start of the cycle in force) or `download.sources` empty → no download, the build only; otherwise, and when the launcher does not say (`download` absent: an old launcher), the zone is downloaded; a zone waiting for a file of Downloads is not. A line says what is going to be done (« 1 zone à télécharger, 3 à reconstruire, 2 déjà à jour »; empty parts are not said, nothing when all is green). Then the download of those zones alone (`runChunks` beyond 60), the state again, ONE question, the build — unchanged. A download that fails for a zone (the real shape: zone `failed`, `error: 'http'`, `sources.<id>.status: 403`, `result.reason: 'partial'` even when nothing was taken) never stops the others (`chunkVerdict` → `failed`): the zone says which source and what it answered (« FAA : téléchargement refusé (403) », « UKMIL : HTTP 404 », « openAIP : le réseau ne répond pas », three at most) in the result of the download and on its own line with « Réessayer » (`retry-fetch`: `startUpdate([zone])`, its download then its build); the bilan counts zones, not sources. « Tout recalculer » (under « Détail ») stays the gesture that redoes everything. **The state is read with the build's personal sources** (L75): `fetchStatus` sends `personal` = what the build sends (the box « Je certifie… » ticked: the personal sources of the zones asked; unticked: none), because the launcher compares the build with the sources it is told may be read — without it a zone built with LFV, NATS, ENAIRE or AirNav was « inputs-changed » (« à reconstruire ») for ever; the box re-reads the state, a read under way with the other value is waited for. **The state is read by runs of 60** (`status.js` `fetchStatus`: `M.chunksOf`, merged): it used to be `ids.slice(0, 60)`, so on a coverage of 78 zones the last 18 had no pill and were never proposed for the rebuild (`updatePlan` counts an absent zone as `unknown`). **The FAA refusing** (`failed` with source `faa` / `faaclass`): the line of the zone also offers « Choisir le fichier… » (SOG-0199's upload; the launcher recognises the three NASR sets) and the direct link to the NASR subscription page. **The NASR sets chosen by hand** (AeroDB K153): the NASR layer is produced by `base/fetch` (it reads the three files put in `data/local/upload/`, named as the FAA names them: `29_Oct_2026_FIX_CSV.zip`…), not by the build; after each recognised upload of source `faa` (`upload.js` `faaSet`) the screen counts the sets of the cycle (the launcher does not say it in the view): before the third it says what is missing (« NASR de la FAA : reçu FIX, il manque AWY, NAV »), at the third it chains `follow.js` `fetchThenBuild('us')` — the download of the zone, then its build unless its `faa` source failed (`faaclass` alone failing does not stop it). Cases L71, L72, L73, L74.: « Mettre à jour (n) » on a pack** (`packs.js` `packUpdateHtml`, `update.js` `startUpdate(zones)`, `panels.js` `selectionOf`): the row of a pack — region or theme — of which n countries are in the coverage carries a button « Mettre à jour (n) » (`data-verb="update-pack"`; none when no country of the pack is in the coverage, none on an empty pack; grey for the reason of the gesture: an operation running, no launcher, `base/status` unknown). It runs the same path as the main « Mettre à jour » — fetch, `base/status`, then **at most one question** about the zones to rebuild — on **the pack's countries in the coverage only**, with the « personnel » box applied to those countries; **the ticked selection of the list is not touched**. The fold « Pays (n) » (SOG-0186) lists its countries one step in (28 px) under their pack. Cases L68, L66, L44.
- **SOG-0197 (10 Nov 2026): the question of « Prendre le fichier téléchargé » is a list, not a paragraph.** `pickupAsk(out)` (panels.js) returns `{ text, sections, note }` for `ctx.ask`: the sentence « Dans Téléchargements : » and up to three titled groups, **one line per file** — **Sera pris (n)** (`pk.takeZip`: country · file · size; openAIP: country · source · n files · size, with the converted ones), **Ignoré (n)** (`pk.skipFormat` / `pk.skipLayer`: country · file : short reason), **À corriger (n)** (country · source : what to do — `fixRename` « renommez X sans espace ni accent », `fixMissing` « déposez E dans Téléchargements », `fixUnread` « cochez … puis Mettre à jour », and the failures of a replan) —; **no nested parenthesis** (the source name is the short one, without the catalogue's parenthesis), an empty group is not there, the sentence about `data/sia/…` is in the help, not in the question. Seven lines per group show, the rest scrolls in the group; the old « … et n autres » is gone. `finishPlan` takes either a sentence or this object. Cases L19, L28, L57.
- **SOG-0180, second lot (10 Nov 2026): independent zones, the balance, the actions on the line.** (1) `runChunks` no longer stops at a run that failed or half failed: `M.chunkVerdict` says `ok`, `failed` (the next run starts; the worst end stays in `S.lastOp`), `nothing`, or `stop` (a stop asked, an interruption, a reason that concerns the whole work); « Mettre à jour » goes on after a download that failed or half failed (it reads the state and asks about the zones that can be built). (2) **The balance** (`status.js` `balance()`, `M.balanceOf`): one line under the selection, « n à jour · n à reconstruire · n en échec · n attend un fichier » (only the non-zero ones), each number a button (`data-act="zone-filter"`, `aria-pressed`) that shows only its zones in the list below; the same button, or « Tout afficher », gives the list back; the filter falls by itself when no zone is left of that kind. A zone **waits for a file** when it is not up to date and the launcher says it is not buildable. (3) **On the line of a zone** (`zoneActionHtml`, `.d-zact`): a failed zone has « Réessayer » (`retry-zone`: `buildAfterPickup([zone])`, the build of that zone alone); a zone waiting for a file says what it waits for (its first reason) and has « Prendre le fichier téléchargé » (`pickup` with that zone: the plan, the question, the pickup, then the build of the zone, lot 1). The buttons are grey during an operation. (4) The folded group of the fine verbs is called « Détail » (it was « Plus »). Cases L63, L64, L65; L62 knows the two new names.
- **Time 3 (SOG-0071, 10 Nov 2026): one primary per screen** (rule 13). The verbs row of the base panel (`div[data-verbs-row]`) shows « Mettre à jour » **alone** and primary; the other verbs are under a **folded « Plus »** (`details.d-moreverbs[data-verbs-more]`, `S.verbsOpen` keeps it open between two draws): « Télécharger », « Prendre le fichier téléchargé », « Tout recalculer » (never primary any more) and « Purger ». The « Sélection » line is unchanged. **Exception**: when a manual cycle is missing (`miss`), « Prendre le fichier téléchargé », which must come before any rebuild, stays in view and takes the primary from « Mettre à jour ». The other panels (procedures, VFR points, aircraft) keep their flat row.
- **« Purger » over 60 zones** (`follow.js` `purgeChunks`; `M.mergePurge`): `base/purge` takes 1 to 60 zones like the other verbs, so the selection is cut into runs of 60 (`M.chunksOf`): **one plan (dry) per run**, one after the other (the launcher holds one job), kept in `S.planSink` (the plan of a run that is not `done` stops there and is said as a single purge's plan is); then **one question** with the sum of the plans (`mergePurge`: files and bytes added, zones united, « shared » if one run says it, kept and refused paths added) followed by the sentence of the runs (`purgeChunksAsk`); No: nothing is sent; Yes: the real purges run by run (`runChunks`), each with its own result and journal line. Progress says « Tranche i sur n » (`chunkPurge`). Case L56.

- **The cause of a failed publication** (SOG-0155, AeroDB 8482c891e): `frame_data.js` `exchange()` keeps, next to `message` and `code`, **`cause`** (`remote-refused`, `push-rejected`, `lfs-hook`, `auth`, `network`, `conflict`, `busy`, `timeout`, `launcher-error`, `other`) and **`step`** (`settle`, `commit`, `prepare`, `receive`, `untrack`, `push`) of the launcher's report — closed lists, anything else is dropped (`''`). `publishOutcome` reads them again (`PUBLISH_CAUSES`, `PUBLISH_STEPS`) and `publishLines` says « La publication a échoué : <cause in the pilot's words> (étape <step>). Rien n'est perdu, les fichiers restent sur le poste. » (`pubFailedCause`, `pubCause`, `pubStep`, ×4). Without a known cause (an older launcher, an unknown code) the sentence says the launcher did not say why (`pubFailed`) — never « fix the cause » without the cause; the launcher's own message stays under it as text. Case L59 (three causes, three sentences; a hostile cause dropped).
- **The pickup carries the « personnel » box** (SOG-0150, AeroDB 22e24fe20): `base/pickup` is sent `personal` (the sources the box declares, `selection('base').personal`, `[]` when none — never absent, the launcher does not guess), in the plan, the replan and the real run (`S.pickupPlan.personal`). It answers, next to `taken`, **`inPlace`** `[{zone, source, sets}]` (sets already in place) and **`unread`** `[{zone, source, why: 'personal', cycle, sets}]` (there, but the build ignores them: the box does not declare the source). Read as untrusted input (`pickupOutcome`: source in `PICKUP_DEST`, `why` = personal, bounded lists). The end of a pickup that takes nothing says « n jeu(x) NATS déjà pris : rien de nouveau à prendre » (`pickupSum.inPlace`) instead of « Rien à prendre », and each unread source gets a line « n jeux NATS présents… la case « personnel » ne déclare pas NATS » (`pickupUnread`, in the result lines and in the question). « Mettre à jour » and « Construire » already carry the box (`setArgs`); case L58 proves it for the download and the build.
- **The pickup's question is bounded** (SOG-0151): the zips found and the problems (missing, skipped, to rename, failed) are listed seven at most, then « … et n autres » (`pickupAsk`, `capLines`); the frame's window scrolls whatever is left (frame SPEC, question windows). Case L57.

- **Opening cost** (SOG-0164): the first draw does not wait for `GET sync-status` (`S.pub.reading`, line « Lecture… » in `[data-publish]`, replaced by the answer) and the zones maps start when their host is within 400 px of the screen (`whenVisible`, IntersectionObserver): no MapLibre, no tile before. Case L60.

### 5.9 The state per zone, drawn (SOG-0071, time 2)

`base/status` (`status.js`, `model_status.js`; contract in `frame/aerodb/INTEGRATION.md` « The state per zone »): a launcher job, `{ zones: [ids ≤ 60] }`, nothing written, refused (409) while a build runs (so never asked then: the page knows it is building).
Read at the opening and **again after every real operation** (`load(true)`): that is how the orange country of SOG-0072 turns green on the launcher's answer, not on a reload. One call at a time; an answer that does not read (`M.statusOf`: closed lists of states and codes,
bounded texts and numbers, hostile ids dropped) leaves the previous state and draws nothing new.

- **On the list**: each zone line carries a pill — `À jour` (green), `À reconstruire` (orange), `Jamais construite` (grey), `En échec` (red), `En cours` (blue, the page's own: a build of the zone is running). The pill of a zone that is not up to date is a button (44 px): a touch opens its
  **reasons**, a second folds them (`S.whyOpen`, page state). Each reason is a **code** translated in four languages (`TX.zr`: never-built, failed, pickup-waiting, source-newer, inputs-changed, parser-old, files-missing, source-old; an unknown code says it is unknown) with its parameters filled
  (source name from the catalogue, dates, parser versions, counts).
- **On the map**: the same states as tones (`STATE_TONE`: green, orange, grey, red, accent); a zone without a known state keeps the tone of the publication, as before. The legend names the five.
- **« Mettre à jour » and « Seulement les périmés »** read this state (§ 5.8). Without `base/status` in `regen/verbs`: no pill, both grey (`unknown-verb`), « Tout recalculer » unaffected. Cases L36, L37, L40–L43.

### 5.10 Country packs (SOG-0065, V3_SPECIFICATION § 10.42)

Packs come from aerodb: **`await ctx.aerodb.packs()`** → `{ generated, source, regions: [pack], themes: [pack] }`, `pack = { id, names: [fr, en, de, es], zones: [ids], partial?: [ids], empty?: 'no-zone-no-source', basis }` (frame/aerodb/INTEGRATION.md « Country packs »; `null` when unreadable). The page was written first against `{ packs: [{ id, kind: 'region' | 'theme', … }] }`; **it reads both** (`packsOf`), the kind being the list (`regions` / `themes`) or the pack's own field (L46). Read with `zones()` at each load (`M.packsOf`: ids `^[a-z0-9-]{1,40}$`, a closed list of kinds,
four bounded names, zone ids `^[a-z0-9]{2,8}$`, sixty packs at most, anything else dropped). **Without `packs()`, or with an unreadable answer, nothing is drawn** (no block, no empty title).

- **Where** (SOG-0147): in the **choice** of the base panel (`.d-choice`), beside the map and with the zones list — under the selection line, above the list; on a phone under the map. « Paquets de pays », then the region rows, then « Thèmes ». **A region row is a switch « the whole pack in the coverage »** (`input[type=checkbox][role=switch][data-pack-switch]`): **on** when every zone the suite knows of the pack is in the coverage, **half** (`indeterminate`) when some are, off otherwise; name, number of countries, size (sum of `publishedKb` of the known zones, « + » when one lacks), « n déjà dans la couverture » when half, « n en partie » (`partial`), « n inconnue(s) de la suite, ignorée(s) ».
  Turning it **on** = `addZones(missing)` (screen.js, which « Ajouter un pays » and the map's tap also use): the coverage written **once**, the zones ticked, **no duplicate, nothing downloaded or built**. Turning it **off** = one question that **names the zones** (`removeAsk`: the pack, the zones, « unticked, they leave this workstation's list, nothing is purged, their files stay »), then `removeZones(ids)`: the zones leave the coverage of **this workstation** and the selection, `coverage.json` written once — **never a purge** (a purge is a launcher verb with its own question; a zone another workstation publishes stays published); No: the switch comes back.
  An empty pack (`empty`, or no zone) shows its reason (`no-zone-no-source`, `no-zone`, `no-source`, a generic word otherwise) and no switch. **Hovering a row** (mouse) or **pressing it** (touch: lit until the next press elsewhere) **lights its zones on the map** (`highlightZones`, tone `accent`; only the map is redrawn).
- **A fold « Pays (n) » on each region row** (SOG-0186; the user at the recipe of SOG-0065: « ce n'était pas si mal de choisir un pays parmi un package… replié, ça pourrait être bien ? »): a region keeps its switch (« tout le paquet ») and gains `details.d-pack.d-pack-countries[data-pack-fold]`, **folded by default** (`S.packOpen`, key `c:<pack id>`, kept between draws), listing its known countries in the grid of the zones list, one tick each (ticked = already in the coverage; `data-pack-cov`, the same handler as a theme's): ticking adds that country alone (`addZones`), unticking removes it after the question of the themes (never purged); nothing is downloaded or built; « en partie » follows (`syncPackSwitches` now runs after every full draw, which the pack switches lacked). Open, the list is bounded (`max-height: min(40vh, 260px)`) and scrolls inside itself. An empty pack has no fold. Case L66.
- **Regions and themes in ONE block with two tabs** (SOG-0165; the user: « le bouton Ajouter est beaucoup trop gros par rapport au texte »): « Régions » | « Thèmes » (`[data-pack-tabs]`, `S.packTab`, each with its count; one list shown, the other `hidden`). **A theme** (`kind: 'theme'`) is a fold whose countries are rows of **the same grid as the zones list** (`.d-zrow` > `label.d-opt`: a box, the name): **a tick per country** (`[data-pack-cov]`, ticked = in the coverage); ticking adds the zone to the coverage (as « Ajouter un pays »), unticking removes it after one question (`togglePackZone`; never a purge); at the head of the grid a « Tout le thème » switch (the region switch, `[data-pack-switch]`). **No button in a row**: the rule is that in a list row the action is the row or a box, a drawn button lives only in a row of buttons. The state of a country of the coverage is said once, in the zones list. The fold stays open across a redraw (`S.packOpen`).
- Seven elements per row at most. Cases L44 (rows, switch half/on, the two tabs, the ticks of a theme in the grid of the list, add and remove by tick, the empty pack, the duplicate guard, hostile packs dropped; 390 and 1280 captures), L45 (invisible without packs()), L46 (both shapes), L53 (the switch off with its question, No and Yes, nothing purged; hover and press).

### 5.11 The world synoptic row and the zone link (SOG-0138, SOG-0143)

- **« Synoptique monde (GFS) »** (`world.js`, `model_world.js`), in the **Météo** group, same template as the other sets: the launcher's job `weather/world` (frame/aerodb/INTEGRATION.md): **`{ action: 'status' }`** at the opening (no network: `exists`, `run`, `built`, `steps`, `files`, `bytes`) and **`{ action: 'build' }`** under « Construire » (about 128 s the first time, 13 s when the run is already there: `kept`; 15 minutes at most, one start per ten minutes). State pill: `absent` (nothing published or unknown), `old` (more than 12 h), `ok`. The publication is **local to the workstation** (`data/weather/world/`): the row says it, nothing is synchronised or committed. End: the run, the steps, the weight and the seconds, or the reason (`no-run`, `invalid`, `timeout`, `cancelled`, `failed`; the old publication stays). The button is grey without a launcher, while another operation runs (a running build counts in `busyNow`) or when `regen/verbs` lacks `weather/world`. Cases L50, L51.
- **More reasons of `base/status`** (AeroDB c849f397c): `index-orphan`, `source-unbuilt`, `source-unread` (the file is there, the « personnel » box does not declare it: **not buildable** until it is ticked), `source-missing` (not buildable: to drop); and **notices** per zone (`no-points`) that are shown under the zone and **never make it stale**. The update's « cannot be built yet » sentence names each zone with its reason. Case L48.
- **`#data?zone=<id>`**: opens the base, **ticks that zone alone**, brings « Mettre à jour » on screen and says it; a zone outside the coverage is said (« Ajouter un pays »); an unknown id changes nothing. Once per opening. Case L48.

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

- **The cycle of each zone, and what blocks a build** (aerodb `294ffc1b8`, 1 Nov 2026; the module words it, aerodb's `tools/aero_cycles.py` computes it):
  - **A zone's cycle is its own dated source's**: `fr` the SIA, `gb` NATS, `es` ENAIRE. A zone without a dated source
    (openAIP, GeoNames, relief, UK Mil…) has no cycle (`cycles[zone]: null`) and is **never said to be out of date**.
    The result's `cycle` is the SIA files' cycle, which the page checks: the screen **never shows it as the cycle of every
    zone** (the former « Construit pour le cycle X » line is gone).
  - **The result of a build** (`outcome`) reads `cycles` (zone → date | null), `blocking` (`[{ zone, source, cycle }]`: the
    built zones whose dated source is of a past cycle), `sources`, `current`; `stale` is true when `blocking` is not empty.
    Malformed values are dropped (a blocking entry without zone, source or date; a source that is not an object).
  - **When `blocking` is not empty**, ONE warning line (`[data-blocking]`) after the summary names each blocking source
    once (« Sources d'un cycle passé : SIA France 2610 (France), NATS UK 2610 (Royaume-Uni) — téléchargez d'abord le cycle
    2611 »): the name is a link to the source's page (the catalogue's `url`, https only) and the expected file is its
    tooltip (`fetch.name`). Otherwise nothing extra is shown. Building a past cycle is never refused.
  - **The sources held** (`sources`: `{ sia | nats | enaire: { cycle | null, current, stale } }`, only the dated ones) come
    in `base/fetch`'s view **from the start (the plan)** and its result, and in `base/build`'s result. The journal's
    download and build entries keep them (`sources`, and `blocking` for a build).
  - **A manual dated source missing the cycle in force**: for each source with `stale: true` or `cycle: null` that the
    catalogue (`ctx.aerodb.sources()`, the one table) says is `fetch.how === 'pick'` and `cycled` (today the SIA), and
    whose zone is ticked, a warning line `[data-missing-source="<id>"]` under the base buttons says « SIA France 2611
    manquant : téléchargez export_xml_bd_SIA_<date>-v<nn>.zip sur le site du SIA » (the catalogue's `fetch.name` with the
    date of `current`; the link is the catalogue's `url(current)`, the product page, never a file). While one is missing,
    **« Prendre le fichier téléchargé » is the primary button and « Construire » is not** (a build would redo the old
    cycle); the pickup button of a download's manual list follows.
  - **Where it shows**: wherever the sources are known: the plan and the end of a download, the end of a build, then, at
    rest, the last known ones (`S.srcKept`, set by `follow.js` at the end of a base download or build; else the journal's
    last base download or build entry that carries them). **A launcher job is never started to read them.** A real pickup
    that took a source drops that source from `S.srcKept` (its cycle is to be read again by the next download or build).
  - **The openAIP exports of a pickup** (SOG-0027, AeroDB lot C f089178f5): not a zip. A `taken` entry of source `openaip` has `zip: null` and
    `from` / `files` / `converted` / `unchanged` (names read as plain file names, 120 characters, 40 at most: audit 157); `skipped[]` says
    each export the suite does not read (`why`: `format` for an openAIP XML, `layer` for the « hot » layer; any other value is dropped);
    `shown.openaip` is what the plan showed, sent back **as it is** in `zips.openaip` (`{ name: 'openaip', size }`, size a whole number ≥ 0;
    anything else sends nothing for openAIP, the launcher would refuse it « not-shown »). An openAIP entry is neither sendable by zip nor
    « blocked ». Case L28.
  - **« Cycle X dépassé »** (`staleCycle`, on « Tout mettre à jour » and the dot of « Construire ») adds « — à cause de
    SIA France 2610 » when the stale sources are known (each once, never per zone line); without that knowledge, the
    present phrase.

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

**Which zones date a base line** (SOG-0026, AeroDB lot C f089178f5, 5 Nov 2026). GeoNames, the relief and openAIP feed every zone and
carry no AIRAC cycle: the oldest folder of all the fed zones made the base line « dépassé » everywhere. `publication().base[zone]` now
gives `cycleSource` (`sia` France, `nats` United Kingdom, `enaire` Spain, `null` otherwise). The stale-cycle state compares **only the fed
zones whose `cycleSource` is not null**, each against the cycle in force; the line names the oldest dated source once (« à cause de SIA
France »). A line none of whose fed zones is dated reads « datée du <at> », never « dépassée » (`baseOf` gives `dated`, `cycle`,
`oldestSource`). A reader older than lot C gives no field: no zone is dated, nothing is said stale. An unknown or hostile source name
reads as « not dated ». Case L27.
### 6.3 End of cycle

When the published base or `proc/` is older than the cycle in force, or the cycle ends within 3 days with nothing
published for the next: **on every device**, an amber line of the Status block, drawn by the frame (« Base aéronautique :
cycle 2610 dépassé, à reconstruire pour 2611 », or « … : le cycle 2611 se termine le 25/11, rien de construit pour 2612 »;
INTEGRATION § 1.4): nothing to press on a phone; **on a workstation** with a launcher at the Full level it leads to
`#data`, whose head shows « Reconstruire pour le cycle 2611 », which is « Tout mettre à jour » (its line « Cycle 2610 dépassé… » adds « — à cause de SIA France 2610 » when the late source is known, § 5.4). On a phone the module
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
- **Writes through `ctx.data`** (policy `cache`, never synchronised, never in a backup): `cache/data/personal.json` (`{ certified, sources, updated_at }`: the personal-use
  certification box ticked on this workstation, SOG-0162 (SOG-0079 before: one box per source); written at each tap, read once per opening, an old `{ sources }` document migrates), `cache/data/coverage.json`
  — **with a launcher the box is HELD by it** (SOG-0238, AeroDB 3dcc5e780; `data/local/personal_use.json`, `GET` / `POST /__setup/personal`, declared in the module's `launcher.routes`): at the opening the box shows the launcher's file (`readLauncherTick`); once, when it has no file and the cache of the page is ticked, `POST { certified: true, migrated: true }`; each click posts the strict body `{ certified }` and the launcher's answer is the truth (a refusal puts the box back, `tickRefused`); an older launcher (404) or a paired device (403): the page's own setting, as before. `base/fetch` and the other jobs still carry `personal: [sources]` from the page (the launcher side is not done). Limit: a script of the same origin can call the write route too.
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

**One certification box unlocks every personal-licence source** (SOG-0162, user: « on a besoin d'une seule coche « je certifie utiliser les données pour mon usage personnel », et ensuite tu déverrouilles tout » — replacing the box per source of SOG-0079): « Je certifie utiliser les données pour mon usage personnel » (`input[data-certify]`, `S.certified`) heads the personal-licence block of the build panel; the sources it unlocks (ENAIRE, NATS, AirNav, X-Plane… — those a ticked zone uses, `PERSONAL`) are listed below it as lines (`[data-personal-row]`, with `data-xplane-hint` for X-Plane), not as boxes. Ticked, `base/fetch`, `base/build` and `base/pickup` receive **every** personal source of the ticked zones in `args.personal` (`personalPicked`); it is a setting of the workstation, written at once in `cache/data/personal.json` (`{ certified, sources, updated_at }`; `sources` is kept for an older page), found ticked at the next opening, and the line « Mémorisé » (`data-personal-kept`) says so. **Migration**: a document of before (`{ sources: [...] }`, no `certified`) with one known source ticked reads as the box ticked (`keptPersonal`). **Guard, not negotiable by the box**: what is proprietary (X-Plane, EUROCONTROL) stays read on this workstation only — never in the published base nor an export, ticked or not; the « Sources et licences » page says it per source (frame/aerodb SPEC § 5 sexies). Case L32.

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

## 11. Files (refactor R-S8)

The module is split by responsibility; no rule changes place without the case that pins it, and every file is listed in
`meta.files` (case I26: a pilot offline before ever opening the screen can still load it).

- `module.js`: the entry. `meta`, `mount` / `unmount`, the event handlers (click, change, input, toggle, key, aerodb change)
  and the operation picked by a click (`opOf`); nothing is drawn here.
- `state.js`: the state of the mounted screen (`S`, one writer: `setState` at mount and unmount; the other files change its
  fields, never `S` itself), and the small kit every file uses (`esc`, `tt`, `lang`, `li`, `count`, `kind`, `ask`, `frozen`,
  `busyNow`, `catSource`).
- `screen.js`: the read-only screen and what it reads. `load` (what aerodb publishes) and the launcher's verbs, head,
  coverage and its States, « Ajouter un pays », the rows of the groups, the journal (drawn and written), `render`.
- `panels.js`: draws the set panels and never starts a job. Selection, choices, verbs, the running line, results and their
  summaries (`SUM_KINDS`, the pickup's lines included), `redrawPanel`, `renderBuild`.
- `zonemap.js`: the map of the zones to tick, on the shared map base (the frame, the persistent MapLibre host of each panel, tones,
  « Recentrer »); writes nothing but the module's selection.
- `follow.js`: follows the launcher's jobs and draws nothing. Start, follow, settle, refusals, the one end (`finishOp`), the
  one plan (`finishPlan`), the pickup of a downloaded file.
- `publish.js`: the shared « Publier » panel and the state of `data/` it reads (`sync-status`).
- `chain.js`: « Tout mettre à jour » (plan, one question, the chain, its end); starts its operations through follow.js and
  draws its own card only.
- `texts.js`: the texts `[fr, en, de, es]`, one table.
- **One writer per shared field** (R-S10): the other files only read them; case I29 fails when another file of the module
  writes one (an assignment or a mutation of one of its fields).

  | Field | Written by | States and passages |
  |---|---|---|
  | `S` | `state.js` (`setState`) | `null` → the mounted screen (mount) → `null` (unmount) |
  | `S.run` | `follow.js` | absent → `{ phase: 'running', t0, ctrl, set, verb, dry, args }` (a start) → `phase: 'stopping'` (« Arrêter ») → absent (its end, or a refusal) |
  | `S.result` | `follow.js` | `null` (a start, a plan stopped or asking) → `{ set, verb, out }` (an end) or `{ set, verb, refused }` (a refusal), or a plan's result |
  | `S.chain` | `chain.js` | `null` → `{ phase: 'asking', runs, rows }` (the question) → `{ phase: 'running', runs, i, verb, stopped, rows, t0, job }` → `phase: 'stopping'` (« Arrêter ») or `'publishing'` → `null` (its end) |
- `model.js`: the façade of the pure functions, `export * from` the files below and nothing else; the screen files import
  it as `M` and the cases import `/modules/data/model.js`, both unchanged. The files under it hold no state, no DOM and no
  call out, and never import a screen file:
  - `model_screen.js`: cycles and dates, the state of a row, coverage and zones, the rows and groups of the screen, the
    State lines;
  - `model_sets.js`: `SETS` and the verbs (known verbs, `setGate`, the arguments of a job, a job's view read and
    normalised), the bulk States, `own` and `num`;
  - `model_results.js`: the end of a job read for every verb (outcomes, `refusal`, the pickup's split and zips, the
    sheets' plan) and the journal entries and list;
  - `model_chain.js`: « Tout mettre à jour » (its sets and verbs, a verdict, the stale groups, its entry);
  - `model_map.js`: the zones map (tones, approximate outline, the rings read in one piece, the features for the base);
  - `model_publish.js`: « Publier » (state, counts, outcome, entry).
  - `model_kit.js`: the private helpers shared by several of these files; the façade does not export it, so the
    names `model.js` exports stay those of before the split (one name, one file).
  - `model_inventory.js`: the data inventory (§ 12): the launcher's answer read through closed lists, seven rows, a total; not
    re-exported by the façade (its names are its own).
  - `inventory.js`: the folded card of § 12: draws it, reads the launcher once when it is opened, and carries « Ranger les sources brutes » (§ 12.1); it writes nothing itself.

### 5.11 The coverage table by country (SOG-0174)

A folded block « Couverture par pays » (`details.d-covtable`, `covtable.js`, pure part `model_coverage.js`), under the groups and above the inventory; **it reads nothing until opened** (`launcher.job('regen/job', { set: 'base', verb: 'coverage', args: {} })`, the contract of `frame/aerodb/INTEGRATION.md`: no argument, one answer for every zone, about 1 s, read-only, refused with a 409 while another job runs → « occupé » and « Relire »; unreadable → « n'a pas pu être lu » and « Relire »; closing the block drops the read, opening reads again). Without a launcher, or with one that does not list `base/coverage` in `regen/verbs`, the block says so. **Seven columns at most on screen**: the country (a button that unfolds it) and **Points, Voies, Espaces, FIR, Procédures, Sol**, each a number (the count of the last published cycle; for procedures and ground, the aerodromes held) or « non » for 0 — the contract has no « unknown » in a count; each heading is a sort button (`aria-sort`; the same button reverses; the country goes up first, the numbers down first; ties by country name); at 480 px and under the font is reduced so the seven columns fit without sideways scroll. **The detail of a row** (a country unfolded, `aria-expanded`): the cycle and the parser version, « n terrains · n balises · n points VFR », the **sources read** (`sources.present`) each with the catalogue's licence, publisher and credit (`catSource`: `lic`, `pub`, `credit`), and the sources declared but **not read yet** (X-Plane and MORA, declared for every zone, are not listed as missing). **Untrusted**: zone ids `^[a-z0-9_-]{2,12}$` and 90 at most, source ids from the closed list of the contract (others ignored, ten per array), counts integers ≥ 0 bounded (anything else is 0), cycles `YYYY-MM-DD`, booleans strict; everything is drawn by `esc`. Case L67.

## 12. The data inventory (SOG-0010, lot E2)

What « data » covers on this workstation, in one folded card at the foot of the screen (before the journal), for the administrator
(`frame/settings/DATA_MAP.md` is the reading it comes from).
- **Seven lines, in this order**, each with its size, its tracking and its writer: the data repository (`data/`), `data/local/`,
  the raw SIA sources (`data/sia/*.xml`, `*.zip`), the device's copy (in the browser: no size here), the suite's working folders,
  Downloads, the backups left at the root (`data_avant_…`, counted).
- **Tracking** is git's answer, never a guess: « suivi » (tracked), « local » (inside `data/` but ignored: never published),
  « hors dépôt » (outside the repository), « état inconnu » (git did not answer). A size cut short says « au moins ».
- **Read once, when opened**: `GET data/inventory`, a workstation route (declared in `meta.launcher.routes`; refused for a paired
  device and for the relay); a card folded is never read. Opened again after a closing, it reads again. An answer that is refused,
  absent (an old launcher, 404) or unreadable says « inventaire illisible » and invents no line.
- **Read only, text only**: the launcher answers names of places, numbers and closed words (`tools/data_inventory.py`): never a
  file path, a file name or a content. Every field is read through a closed list (audit 157): an unknown state reads « inconnu »,
  an unknown id is dropped, a hostile text is never markup. The reading has no link and no write; the only action is § 12.1.
### 12.1 « Ranger les sources brutes » (SOG-0030)

The launcher's verb `base/move-sources` (`{ dry?: true, undo?: false }`, `tools/regen/base_sources.py`, DATA_MAP § 4 and § 6.2) from the card.
- **Shown only if the launcher knows the verb** (`regen/verbs` lists `base/move-sources`: the reading of the verb list lets a hyphen through, `^[a-z]+/[a-z-]+$`);
  otherwise the card stays read only. Two buttons: « Ranger les sources brutes » and « Remettre à leur place » (undo: the launcher's manifest is read backwards;
  with no manifest the plan says « rien à remettre »). Workstation only: a paired device or the relay is refused by the launcher (403), said.
- **Always the plan first** (`dry: true`, sent explicitly): ONE question with the number of files, the total size and the files by **name**, size and cycle
  (eight at most, « … et n autre(s) »), never a path. Nothing to move: said, no question. No: nothing runs. Yes: the same verb with `dry: false`, then the
  result: moved (count, size), already in place, kept (git tracks the old one: kept, never deleted for every workstation), refused (conflicts and failures,
  each with its reason from a closed list: `present`, `different`, `missing`, `unsafe-path`, `too-large`, `sha-mismatch`, `write-failed`, else « raison inconnue »),
  and the reason of a partial / cancelled run. The inventory is then read again: the line of the raw sources changes place.
- **Refused**: while an operation runs (`busyNow()`, which counts the plan and the question: one operation at a time, the buttons go grey and say why), while a
  merge is pending in `data/` (`GET sync-status`, `merging`; checked before the plan and again before the run: no job starts), and by the launcher (403 paired
  device, 409 another job, 400 / 404 / 501 verb unknown, else failed). The launcher's own text is never shown.
- **Read through closed lists** (audit 157): `moveView(final)` keeps names by a character rule (`^[A-Za-z0-9_ .()+-]{1,120}$`, else « ? »), a cycle by a short rule, bytes
  as bounded whole numbers, forty files at most; no path, no free text. Cases: L29 (every state, with its counter-test).
- **Cases**: K67 (the Python inventory on a test repository), I36 (the route: the workstation only, seven places, nothing written),
  L26 (the card: folded, one read when opened, the seven lines, unreadable said, a hostile answer).

- **SOG-0186 retaken + SOG-0228 (d) (10 Nov 2026, 17:25 refusal: « mettre le chevron d'ouverture sur la ligne même, et réduire le bouton, voire le remplacer par une url ! »)**: a pack's line is its `summary` — the chevron on the line itself, the switch (a box alone: the name is not its label, so a tap on the name unfolds instead of adding the whole pack), the name and the counts, and « Mettre à jour (n) » as a **discreet link** at the right (`.d-link`, no filled button; it wraps below the name at 390 px); a theme's line is the same. No more « Pays (n) » line nor `.d-packact` line below the pack. Cases L66, L68.

- **SOG-0228 (10 Nov 2026), the minimum before the redesign (SOG-0229)**: (a) « Paquets de pays » is a `details` (`.d-packs-fold`, `S.packsOpen`) folded when the screen opens, kept as the pilot leaves it, the themes and the « Pays » folds folded as before; (b) a tap on a number of the balance (`setZoneFilter`) that is to rebuild or failed **ticks those zones** (`S.ticked` = the group), reduces the list to them, scrolls to « Zones de la couverture » (`scroll-margin-top`, after the redraw) and writes one line under the title (`TX.balLine`: « 3 zones à reconstruire, cochées ci-dessous : « Mettre à jour » s'en charge. »; waiting, up to date: the line only, nothing ticked); (c) under « Zones de la couverture (n) » a note says what the number counts (`TX.zonesNote`: the zones the base covers on this workstation, n of the m the suite knows); (d) see SOG-0186 above. Case L76.

- **SOG-0230 (10 Nov 2026), « Publier » after a build**: with nothing to send (no change, no commit ahead) and a last pass that pushed, the state line says **« Tout est déjà publié : les commits de la construction sont partis à {d} »** (`data-publish-state="clean"`, instead of a bare « Rien à publier » and a « Dernière publication » line); a publication whose commits were already made by the build (`committed: 0`, `ahead` > 0 before the pass) says **« Envoyé : n commit(s) déjà fait(s) par la construction. Fichiers reçus : r »**, never « Fichiers commités : 0 » alone (`out.sent` = what was to send before the pass). Case L77.

- **SOG-0237 (11 Nov 2026), EUROCONTROL workbooks by hand** (case L78; AeroDB 6dc9c5a1e): the « Route (RAD, points FRA) » row has « Choisir le fichier… » (`data-zone=route`); the launcher recognises `RAD_AAMM_v<n>_<m>.xlsx` and `eurocontrol-airac-AAMM-fra-points-<texte>.xlsx` by their content (source `eurocontrol_rad`, kind `rad`|`fra`, no zone) and puts them where `route/import-rad` reads as Downloads; the screen then chains **the import of the row** (`startRoute`: the plan, the inline question), never a zone job. The row also says where to create the free account (EAD Basic page, direct link).
