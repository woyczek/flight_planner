# data — decisions log

The memory of the module **Données**: every choice, dated, with its reason. Newest last. The inventory and the measures are
in `docs/technique/V3_DONNEES_REGENERATION.md`; the dedicated phone application in `docs/technique/V3_APP_DONNEES.md`.

- **28 Oct 2026 — Specification written, documentation only** (settings session, at the ergonomics session's request): SPEC
  (final state), INTEGRATION (requests to the frame, aerodb and Settings), ROADMAP (lots D0–D10, questions). No code. Built
  from the inventory of 26 Oct and the decisions below.
- **28 Oct 2026 — A module, not a frame screen** (ergonomics session): `modules/data/`, level 3 (Full), the frame unchanged
  but for the services it gives (`ctx.launcher` among them, already its debt). The inventory had proposed a frame screen
  `#data` drawn by aerodb behind the Administration card; a module keeps the frame intact and gives the tool a verb of the
  rail at the Full level.
- **28 Oct 2026 — Vocabulary** (ergonomics session; the user: « la terminologie fr n'est pas bonne »): « Couverture » for
  the zones, « Jeux de données » for the sources, four short verbs one per button (Télécharger, Construire, Publier,
  Purger), « Mettre à jour » for the four in a row; groups Base aéronautique, Procédures, Appareils, Météo, Cartes; seven
  rows at most visible per group.
- **28 Oct 2026 — The user's answers** (inventory § 5.1), as applied here:
  - personal coverage, common data, the gap between the workstation and the repository shown on every row (SPEC § 6.4);
  - pypdf is a prerequisite installed by the first-install assistant, not by this module;
  - NAT tracks read on the site (a status row of the Météo group, lot D9), never a rebuild of the base;
  - no Actions with a write token; an end-of-cycle alert instead: a warning on a phone, a rebuild on a workstation
    (SPEC § 6.3, the line is the frame's);
  - nothing from X-Plane or Navigraph published; a local build as a fallback (SPEC § 4.4, invariant 1);
  - three cycles kept for the base and `proc/` (the previous, the one in force, the next);
  - publication rights are the workstation's (git credentials, or the device's token);
  - V2 pages are not used from V3: lot D8 lists what V3 lacks, nothing is removed by this module.
- **28 Oct 2026 — « Lire un terrain depuis EAD »** (ergonomics session; decision of the data owner of the day,
  `frame/aerodb/EAD_BASIC.md`): one ICAO code, one aerodrome per gesture, never scheduled, labelled non operational; the
  credentials stay in the launcher's secrets store (an entry of Settings' Keys panel).
- **28 Oct 2026 — Without a launcher** (ergonomics session; measured by the laboratory, `V3_APP_DONNEES.md` P0): reading and
  publishing work, downloading does not (12 of 15 sources send no CORS header): said on the screen, building from a picked
  file instead.
- **28 Oct 2026 — Outputs never through `ctx.data`**: the data layer's batch (5,000 changes, text, a copy in the device's
  cache, 409 when `data/` changed) is made for records, not for 20–60 MB of generated files; the launcher commits them, or
  the frame's GitHub transport without a launcher (INTEGRATION § 1.3, the frame's choice).
- **28 Oct 2026 — Coverage not taken over from V2**: V2 kept the zones in `localStorage` (`aeroZones:v1`), which a module
  may not read; the first coverage is an open question (ROADMAP question 1).
- **28 Oct 2026 — The eight open questions answered** (ergonomics session; ROADMAP keeps the list): every published zone
  ticked at the first opening; « Tout mettre à jour » kept as the main gesture; pypdf through the V2 first-install
  assistant while it exists (a D8 debt); the Sources screen replaced by the module at D1, `sources_data.js` its catalogue;
  test zone L; the end-of-cycle line computed by the frame from `aerodb.publication()`; EAD credentials in the launcher's
  keys panel, never read back; no « Cartes » group, the VAC reporting points in « Base aéronautique » (four groups).
  Nothing is coded before the reviews of aerodb and of the frame.
- **28 Oct 2026 — Aligned on aerodb's contracts** (aerodb's review 20c8d920c and 51a028f48, validated by the ergonomics
  session): cycles stored as effective dates, shown `YYNN` through `airac.js`; the module reads only `publication()`,
  `zones()`, `sources()` (the catalogue stays aerodb's, `catalogue.js`, `eadStates` as data); builders in two stages (a
  piece per source, `worker` or `python`; an assembler per zone), nothing written by them, aerodb's invariant 1 amended;
  EAD reads *Charts* documents and installs through `proc_manual` (« remplacer ou fusionner »); towns: a status and
  Télécharger by the launcher; « OCR manque » as a grey reason.
- **28 Oct 2026 — Compiled procedures never purged** (user: « les données coûtent cher à être générées… on doit pouvoir bien
  séparer la compilation des données brutes, et l'utilisation des données compilées »): compiling (builders, workstation)
  stays apart from using (reader, every device); the compiled JSON live in the private data repository, the user's side.
  Procedures read by hand, EAD or OCR live in `proc/manual/` (aerodb's choice), are never in the Purger's scope nor lost at a
  change of cycle, shown « Périmé » with « Relire » (one aerodrome per gesture); only the owner's explicit « Retirer »
  removes one. Replaces the rule « previous kept cycle only » of the same afternoon.
- **28 Oct 2026 — Aligned on the frame's lot D0** (`frame/INTEGRATION.md` § 15, bd4cc5109): `meta.launcher` (`routes:
  ['regen/']`, `read` of the source and output prefixes) and `meta.publish` (the output roots) in the module's `meta`; the
  launcher's operations are verbs of `regen/job` from a fixed registry (the EAD line is `proc/ead-fetch`, delivered);
  without a launcher, `ctx.publish` one commit per zone or per cycle of `proc/`, a conflict returned and resumed, never
  `github()`; the end-of-cycle line is the frame's on every device; the rail's verb comes with `module.js`.
- **28 Oct 2026 — aerodb's D1 as delivered** (d4cec61b9): `publication().proc` gives `byStatus` (not `bySource`); a zone in the
  whole format is listed `format: 'whole'`, never read (« format ancien », Construire rewrites it); `aircraft` also gives
  `files`; `vfr` and `aircraft` are null without a publication; `sources()` returns the catalogue's object as delivered.
- **29 Oct 2026 — Personal-licence data: the box stays, with a declaration** (user: « on garde la coche, et un disclaimer :
  "cocher la case si le dépôt n'est utilisé que par vous" ou approchant »): X-Plane, Navigraph, Little Navmap data and the
  personal-use sources (ENAIRE, NATS) may enter the base published in the private repository when the owner ticks their
  source, beside the line « À cocher seulement si le dépôt de données n'est utilisé que par vous (données X-Plane, usage
  personnel) » ×4; never by default, nothing blocked, nothing recorded beyond the box. Amends the rule of 28 Oct (invariant 1).
  The line is already in the V2 maintenance page (`shared/maintenance_page.js`, sources flagged `personal` in
  `shared/aero_zones.js`).
- **29 Oct 2026 — The build runs on the launcher, in parallel by zone** (user, during a V2 « Tout récupérer et recalculer »,
  asking for multi-threading; relayed by Simplification): V2 cannot do it at a fair cost (build in the browser, main thread,
  file after file, `DOMParser` unavailable in a Worker), so V2's page stays as it is, obsolete. In this module (D5) the
  build runs on the launcher, one process per zone (cores minus one), progress per zone, each zone published as soon as it
  is built (SPEC § 5.4, INTEGRATION § 2.3).
- **29 Oct 2026 — First screen read-only, without any verb** (ergonomics session, for the group tests of 30 Oct): the
  module is mounted at level 3 with what aerodb already gives (`publication()`, `zones()`, `sources()`,
  `coverageByState()`): the cycle in force, the coverage with the States in three colours and their reason, the four groups,
  each row's cycle (`YYNN`), age, counts and state (« Cycle dépassé », « Parseur ancien », « Absent du dépôt », « À jour »;
  « Périmé » when the data carry it). No button of Télécharger, Construire, Publier, Purger, not even grey: they come with
  their lots (D2 onwards), together with the grey reasons of SPEC § 6.5. The size of a row is its counts (zones,
  aerodromes, files, types) until the launcher's state gives bytes.
- **29 Oct 2026 — « Données » in the rail, read-only on a phone** (ergonomics session): the label stays (the rail's places
  are nouns, the short verb is for buttons), the 7th and last place of the rail; no tab in the phone's bar, the module is
  reached there by `#data` and a line of Settings › Administration, read-only (useful to see the coverage on the road).
  Replaces « a phone never mounts this module » (SPEC § 6.3).
- **29 Oct 2026 — D5's runtime: the workstation's browser without a window** (ergonomics session, on aerodb's note): the
  existing JavaScript builders run in Edge (else Chrome) without a window, one instance per zone, orchestrated by
  `tools/regen/base.py`; the build in the page is the fallback without such a browser. Rejected: a Python port of the
  builders (two implementations to keep in step) and an engine downloaded by the launcher. Closes the open point of the
  entry « The build runs on the launcher, in parallel by zone ».
- **29 Oct 2026 — The Maintenance application, not Pilot's rail** (user: « Pour éteindre la V2, il faut les paramétrages
  admin aéronautique sur la V3. Ce n'est pas dans l'appli Pilote, ou alors à très très haut niveau. C'est une appli
  Maintenance. »; relayed by the ergonomics session): the module is the heart of a fourth application, « Maintenance »
  (Données, administration settings, help), on the workstation with a launcher, opened by `/frame/?app=maintenance` and by
  the line « Maintenance » of Pilot's Settings › Administration (Full). Until the frame's named applications exist: an
  entry of Pilot's `APP.modules` with `rail: false`, reached by `#data`, where the Administration line leads. Replaces « the
  7th place of the rail » of the same day (the entry « Données » in the rail, read-only on a phone): the read-only phone
  access stays.
- **29 Oct 2026 — Construire, the first verb** (ergonomics session: « l'appli de construction utilisable demain »): wired to
  aerodb's `regen/job { set: 'base', verb: 'build', args: { zones, personal } }` (D5, one headless instance for all zones,
  each zone committed as it comes out). `personal` carries the ids of `shared/aero_zones.js` SOURCES (not the catalogue's,
  whose `xpcifp` is the procedures' source); the module keeps a three-line table, tested against that file, instead of
  loading it. A ticked X-Plane is said before the start (« la construction se fait dans la page, pas encore possible ici »)
  and the verb's `xplane-in-page` at the end. `meta.launcher.routes` declares `regen/job/cancel` beside `regen/job`: the
  frame's `under()` does not cover a route's children without a trailing `/` (aerodb's own declaration has the same gap,
  told to the frame). After « Arrêter » the frame answers `cancelled` at once; the module asks `resume` for the job's real
  end.
- **29 Oct 2026 — Publier is the frame's gesture sync, never a POST of the module** (ergonomics session, V3 Frame): since
  1c2506a41 `sia/base/` leaves the workstation only on a user's gesture; the module asks the frame for a pass of reason
  `manual` (`ctx.data.sync({ gesture: true })`, same lock and queue as the header's button, the author added by the frame)
  instead of calling `/__setup/sync`, which would bypass the frame's queue and make the module write the author. The frame
  marks the capability (`ctx.data.sync.gesture === true`); without it the button stays grey. The count before the one
  question comes from `sync-status` (workstation route). Télécharger and Purger commit nothing; the raw sources still
  tracked by git (openAIP) are the user's question of 30 Oct.
- **30 Oct 2026 (night) — After the frame's lot**: declaring `regen/job` now declares its cancel (f70eba426): the module
  drops `regen/job/cancel` from `meta.launcher.routes` (the « Construire » entry above described the gap); the provisional
  `rail: false` entry of Pilot is gone, the module lives in the Maintenance application (`APPS`, e3870b354); « Publier »
  checked on the real frame (`ctx.data.sync.gesture === true`, a215d47bd: L12 sees the button live with the real adapter).
- **11 Nov 2026 — « Tout mettre à jour » goes on after a failure** (user: « on continue. », SOG-0239; it replaces the
  « stop at the first failure » of 30 Oct, which contradicted § 3 « a failure never stops the others »): the sets are
  independent, a failure stops the steps of its own set (no build without its download), only « Arrêter » or a merge
  waiting in data/ stops the whole chain. The end summary lists each failure with its reason and a « Réessayer » that runs
  that set alone (`retryChain`, the other rows keep their result). Publication: still ONE, when at least one set succeeded;
  nothing when none did. Open point told to the ergonomics session: a `partial` build may have committed part of its files,
  they leave with the publication.
- **30 Oct 2026 — « Publier » means « send now »** (real trial on `ie`, ergonomics session): a zone built by `base/build` is
  committed whole on the workstation (`commit_outputs`), so it is consistent and leaves at the next synchronisation, even a
  background one; the gesture rule (`sync_gesture`, 1c2506a41) holds back only `sia/base/` files not committed (half written,
  a build under way). « Publier » therefore sends what is committed right away, and says what stayed. Written in the help's
  Publier paragraph.
- **30 Oct 2026 — Every set gets the base's four verbs; « Tout mettre à jour » stops at the first failure** (user: « j'attends
  une carte réellement utilisable, et un module d'admin », V3 § 10.34 lot A1): one panel per group with one choice of items
  and Télécharger · Construire · Purger, Publier shared; the same rules as the base (one operation at a time, journal, dry
  purge with its plan, nothing committed by fetch or purge). « Tout mettre à jour »: a plan and one question first, the
  sets in the published order, stop at the first failure with nothing published, one Publier at the end, no purge in the
  chain. The V2 maintenance page leaves the Maintenance rail when every set has its four verbs.
- **30 Oct 2026 — The end-of-cycle line says « rebuild », not « publish »** (user's feedback, ergonomics session; frame 4cf6f9b5d):
  « Base aéronautique : cycle 2610 dépassé, à reconstruire pour 2611 » (and « … rien de construit pour 2612 » before the end),
  the same for Procédures; it compares the cycle published in the repository with the cycle in force. « Publier » lights only
  once something is built on the workstation (sync-status): the two no longer contradict each other.

## 31 October 2026 — the map of the zones is a real map (user's phone test)

- **The request** (user, from a phone screenshot of the Procédures panel): « je m'attendais à une carte scrollable avec tous les
  éléments fonctionnels de la carte en V2 ; c'était efficace ». The SVG of 30 Oct drew the world's width in 330 px: a stamp, the
  United States small, the islands dots. Read as a bug (a user's return), so done before 6 Nov.
- **Cause of the world-wide frame**: six zones (us, fr, ru, nz, fj, ki) cross the antimeridian and their aerodb box went round
  the world. AeroDB corrected it at the source (fed1c6f4a: `box` never wider than 180°, `parts`, `framed` rings); the map draws
  `framed` when given.
- **Done**: the shared map base of the Map and the Weather (`modules/maps/lib/map_base.js`), imported, nothing copied;
  `zonesLayer` (filled zones tapped by id, `fit` on each zone's main ring) asked of BUGS SOG and written by them (1a519954f). A tap
  ticks, a drag or a pinch ticks nothing, « Recentrer », 45 % of the view on a phone, beside the list from 1024 px, the list as
  the fallback. The 44 px rule is gone (a small zone is reached by a pinch). The SVG code (`zoneMap`, `MAP_MIN_PX`) is deleted.
- **Screenshots** (real outlines; the tile style stubbed to a plain background in the noreg, real tiles on a device):
  before `captures/zonemap_2026-10-31_before_{base,proc}_{390,1280}.png`, after
  `captures/zonemap_2026-10-31_after_{base,proc}_{390,1280}.png`.
- **Known limits, not blocking**: the map host is detached for an instant at each panel redraw (every second during a run), so
  a drag during a run can be cut once; the wheel on a desktop and one finger on a phone go to the map, not the page scroll (the
  base has no cooperative gestures); a change of the design's tone restyles the map from `attachMaps`.

## 5 November 2026 — which zones date a base line (SOG-0026, lot E2)

- **Rule** (AeroDB lot C, f089178f5; coded against its contract, not its code, which was not on origin): `baseOf` counts a fed zone only if
  `publication().base[zone].cycleSource` is `sia`, `nats` or `enaire`; the cycle of the line is the oldest of those zones; no dated zone
  gives no cycle, so `staleLevel` never says stale and the line reads « Datée du <at> ».
- **Reversible detail chosen**: a zone without the field (a reader older than lot C) counts as **not dated** rather than as dated by
  its folder. The other choice (keep the old rule when the field is absent) would show « dépassé » again on a launcher that predates
  lot C; the chosen one shows nothing wrong, at the price of not warning about a really old base until AeroDB publishes the field.
  To reverse: in `baseOf`, treat `cycleSource === undefined` as dated.
- **Not done**: the source of the oldest zone is named from the catalogue (`n` without its parenthesis), not from a table of mine.

## 5 November 2026 — the openAIP exports of a pickup (SOG-0027, lot E2)

- **Rule** (AeroDB contract, not its code): an openAIP entry is shown by files, taken only if the plan carried a well-formed `shown.openaip`
  (sent back as it is); no `shown.openaip`, nothing openAIP is taken; names and reasons outside the rule are dropped.
- **Reversible detail chosen**: a skipped export is said on the question of the plan as a problem line (« n'est pas lu ») rather than in a
  separate block, and a pickup with only skipped exports asks nothing.
- **Found while testing**: SOG-0026 made `baseOf().cycle` null for a zone with no dated source, so the map of the zones drew the United
  States and Canada « nothing published »; the map now reads `published` (a cycle in force, dated or not) and `cycle` (dated) apart.

## 6 November 2026 — « Ranger les sources brutes » in the inventory card (SOG-0030)

- **Rule** (the coordinator's decision of 5 Nov): in the card, plan first, run on confirmation, result, undo; refused while a job or a synchronisation runs.
- **Reversible details chosen** (the user is away): the undo is a second button **always visible** (not only while the manifest exists: the launcher has no verb that reads the
  manifest, and a plan of the undo is the way to know; « rien à remettre » when there is none); the same plan-then-question flow for the undo; the plan list shows eight
  files; the card draws its own states (`S.move`) instead of the build panel's (`S.run`), but counts in `busyNow()` so that nothing else starts during it.
- **« During a synchronisation »** is read from what the page can see: a publication of its own (`S.pub.phase`), and a **merge pending** in `data/` (`sync-status.merging`).
  A background pass of the frame that is running at that instant is not visible from here; the verb moves files outside the synchronised pool (`data/sia/*.xml` to
  `data/local/…`) and never removes a tracked file, so the risk is nil for git. To be strict, the launcher would have to refuse the verb under its own sync lock (a
  launcher change, not done here).
- **Found while testing**: `knownVerbs` kept only `^[a-z]+/[a-z]+$`, so a launcher that listed `base/move-sources` was read as not knowing it; the hyphen is allowed.
- **Manual**: the Données screen is not described in the manuals (docs/MANUEL_*); the help of the module (×4) says it.

## 10 November 2026 — a tap on any country (SOG-0070)

- The base map now draws **every zone the suite knows** that has an outline (grey when outside the coverage); a tap on an inactive one is `addZone` (written, ticked), a tap on an active one only toggles its box:
  never a purge (purging stays a verb of the launcher behind its own question). One gesture for all, the result at once (the screen redraws from the same selection).
- **Framing**: the first view and « Recentrer » fit the coverage's boxes (`activeBounds`), so that the grey countries do not turn the view into a world map.
- **Wiring**: `addZone` lives in `screen.js`, which already imports the map file; the map reaches it through `S.addZone` (set at mount) to avoid a circular import.
- The States map (procedures) is unchanged: every State it can draw is already in its list.

## 10 November 2026 — the screen reads the published state again after a build or a publication (SOG-0072)

- User report: after recomputing, a country stays orange even after publishing, until a hard reload. **Cause found in the module's wiring**: `load()` asks `aerodb.publication()`, and aerodb keeps its list of
  published zones in memory (`published()`) until `refresh()` or its reader's watcher says it changed; files written under it by the launcher are not announced until the data layer's next pass. The end of a real
  build, download, purge, publication of sheets, publication and of the chain now call `load(true)`: `aerodb.refresh()` first, then the same reads as at the opening.
- **If it is still orange after this**, the stale part is below the module (the data layer's tree of the launcher, or the service worker's cache of a data file): a report for V3 Frame, with the file that stays old.
- Case L31 (an aerodb stub that memorises like the real one until `refresh()`; the SIA row leaves « cycle gone by » at the end of a build, no reload), red without the call.

## 10 November 2026 — personal-licence boxes are remembered (SOG-0079)

- The ticked personal-licence sources are a **setting of the workstation**: `cache/data/personal.json` through `ctx.data` (same policy and same place as the coverage and the
  journal: local to the device, never synchronised or backed up; on a workstation the file is read by the module itself, so it works with or without a launcher). The coordinator
  suggested `data/local/` through the launcher; `ctx.data` was kept because it gives the same « this workstation » scope with no launcher dependency and no new verb.
- Why: on Friday (070fd46a4, SOG-0077) the box was forgotten, and a country lost its AWY. An unticked default is right the first time (a licence is an explicit declaration, invariant 1);
  forgetting it at every visit is not.
- The memory belongs to the **box**, not to the zones: unticking a zone does not forget a source (it is not offered nor sent meanwhile), only its own box does. A stored id the table of
  `PERSONAL` does not know is ignored (`keptPersonal`).
- Counter-test: L32 is red when the memory is not read at the opening (the boxes come back unticked).

## 10 November 2026 — the route row: RAD and FRA points as a source (SOG-0125)

- **Decision (the user, via the ergonomics session)**: the RAD and the FRA points are a source of data like NATS, not a feature of Fuel. One row in the procedures group — « Route (RAD, points FRA) » — with « Importer de Téléchargements »;
  Fuel's Route step links to it (Features SOG). The row is **added to the group's rows, not to the catalogue's counted list** (`eurocontrol_rad` has no zone fed, so `matters()` never showed it): rule 13 holds (three rows in the group).
- **Why a module-own flow and not the set machinery** (`SETS`, `follow.js`): that machinery is built around per-zone and per-item runs, a journal and the chain; the import is one short job with a plan and a question. `route.js` follows the
  launcher's job (`ctx.launcher.job`) by itself and takes part in `busyNow()` so that no other operation starts meanwhile; it is **not in the chain** and **not in the journal** (the commit of `route/import-rad` is its trace).
- **The cycles present**: no read of `data/route/*.gz` from the page (gzip, 2 MB, not served as a tree), and `publication()` does not carry them yet. Hence `cache/data/route.json`, written after an import by this workstation — it says what
  **this workstation** imported, not what another workstation published. When AeroDB gives `publication().route` the row uses it too (nothing to change here). **Open point for AeroDB**: expose `{ rad: [cycles], fra: [cycles], at }`.
- **Cases**: L33 (the row, the plan names the workbooks and their cycles, the question, « Non » sends nothing, the import sends the shown books only and writes the memory, the row turns green and is found again at the next opening,
  nothing in Downloads), L34 (an old launcher: grey with its reason). L2, L4 and L5 now count the route row. Counter-test: without the memory read at the opening, L33 is red (« absent » after the reload).

## 10 November 2026 — three verbs and the selection gestures, time 1 (SOG-0071)

- **Kept the download button and the pickup**: the base row is Mettre à jour · Télécharger · (Prendre le fichier) · Tout recalculer · Purger (five, under the seven of rule 13). Télécharger stays because the manual sources (SIA, NATS) are taken one by one
  between a download and a build; « Tout recalculer » keeps `data-verb="build"` (and its place in the chain, `CHAIN_SETS`, which still says « Construire » for the other sets) so that nothing that drives the build changed.
- **« Tout recalculer » asks nothing new**: § 10.44 says a verb's confirmation names the count and the size. Today's build had no confirmation and thirteen cases drive it by one tap; instead of a question the **Sélection line** (count and size) is always on screen
  above the verbs. If the coordinator wants a question on « Tout recalculer » it is one `ask` in `startOp` and thirteen cases to adapt: said, not done.
- **The provisional « stale » criterion (time 1) is gone**: the launcher's `base/status` says the state per zone (time 2, below); `staleZones` was removed, not kept as a fallback (without the verb the update stays grey rather than guess).
- **The rectangle ticks, it does not add zones**: a grey country (outside the coverage, SOG-0070) is not added by a rectangle (one gesture could add two hundred zones); only the coverage's zones are ticked, and a rectangle **adds** to the selection. The count is shown while the gesture is
  under way and nothing is ticked before the release. Two fingers: a hold of 400 ms within 14 px; the pointer events of the touch are read on the map's host, the map's pan and pinch are disabled for the gesture and restored after (a real phone has not been tried: the case dispatches the pointer events).

## 10 November 2026 — the launcher's state per zone, drawn and read (SOG-0071, time 2)

- **Done the day AeroDB's `base/status` landed** (636ab6da2). The page asks for the state of the coverage (≤ 60 zones) at the opening and after each real operation, draws it (pills on the list, tones on the map, the reasons on touch) and « Mettre à jour » / « Seulement les périmés » read it.
- **The page composes « Mettre à jour » instead of calling `base/update`**: the launcher's job does download → state → build in one go; the confirmation (§ 10.44: count, size, reasons) must come **after the download** (it may bring a new cycle, hence new reasons) and **before the build**, and a job cannot ask. So: `base/fetch` → `base/status` → question → `base/build` on the buildable zones. `base/update` stays available to other callers (it does the same without a question).
- **« 45 zones à reconstruire, parseur changé »**: on the user's workstation every built zone is `parser-old` (21 → 22): the question groups the zones by shared first reason and says it once, adds « Cela peut être long » from ten zones; the second update finds nothing and says so (case L41, L36).
- **A zone that waits for a file of Downloads is not buildable** (`pickup-waiting`, `source-old`): named in the question and in the « nothing » sentence, never built, and left out by « Seulement les périmés ». The pickup stays the pilot's gesture (the plan first); the page does not start it by itself.
- **While a build runs the launcher answers 409 to `base/status`**: the page does not ask then (`S.run`), the pill « En cours » is its own (`S.run.set === 'base'`, the zones of the run), and the state is read again at the end.
- **`data-zstate`, not `data-zone-state`**: the latter is already the attribute of the zone lines of a run's result.
- **Counter-tests**: without the launcher's tone on the map L40 is red (« fr: warn, gb: ok, es: ok »); a build on an unreadable state (instead of stopping) turns L42 red.

## 10 November 2026 — country packs, the page's half (SOG-0065)

- **What AeroDB delivered differs from the contract agreed first** (`{ regions, themes }` instead of `{ packs: [{ kind }] }`, `empty: 'no-zone-no-source'`, an extra `basis`): said to the coordinator, and the page reads **both** shapes (the kind from the list or the field) rather than renaming silently; the empty reason `no-zone-no-source` has its sentence in four languages.
- **AeroDB had not delivered `packs()`** (at the time of writing) (no `packs.json`, no function, no script on origin/v3 at the time); the coordinator chose to code this half against the contract proposed here, behind a function detection, and to send it to AeroDB as it stands: `packs() → { packs: [{ id, kind, names ×4, zones, partial?, empty?, source?, date? }] }`. Nothing about the packs' content is invented here: tests use a fake aerodb.
- **Where**: the Couverture card, under « Ajouter un pays » — the one place where zones are added; a pack is another way to add several at once.
- **« Ajouter tout » ticks the zones it adds** (like « Ajouter un pays » and the map): the pilot sees what a following verb would build, and nothing is built. The size the row shows is the **published** size of the zones (what the pilot will download or build, not what is on disk).
- **A zone the suite does not know** (a pack listing an id `zones()` lacks) is said (« 1 inconnue(s) de la suite ») and ignored, never added; a **hostile pack** (bad id, unknown kind) is dropped by `packsOf`.
- **Themes never add by themselves**: a fold with the zones and one « Ajouter » each (§ 10.42: « the filter shows which zones to add; it adds nothing by itself »).
- **Counter-test**: counting the covered zones among those to add (`toAdd: known`) turns L44 red (« Ajouter tout (4) » instead of 2); `addZones` also refuses a zone already covered (a second guard, not alone testable through the button).

## 10 November 2026 — more than 60 zones: runs of 60, and the launcher's reason (SOG-0144)

- The launcher takes **1 to 60 zones** per job (`base/fetch`, `base/build`, `base/purge`, `tools/regen/base.py` and `base_sources.py`); the user's selection reached **78** and « Tout recalculer » answered « arguments invalides » (also the 16:53 failure). The page now cuts the **selection** (not the verb) into runs of 60 at most (`chunksOf`, `runChunks`): the launcher holds one job at a time, so the next run starts when the previous one ends; the first that does not finish well stops the others (its end stays in `S.lastOp`, as for the chain).
  « Tout recalculer », « Télécharger », « Mettre à jour » (its download and its build) and « Tout mettre à jour » use it; each run has its own end and notification and journal line. « Purger » is **not** cut: its plan and its question are one gesture over a selection, and a purge of more than 60 zones is refused by the launcher with its reason (relayed) — to cut it needs a plan per run.
- The progress says « Tranche i sur n (60 au plus par construction) »; the update's question says « 78 zones en 2 constructions de 60 au plus, l'une après l'autre ».
- **A refusal is never « arguments invalides » alone**: `M.refusal` keeps the launcher's `message` (160 characters, no control sign) and `refusedText` writes it after the usual sentence (« Le lanceur dit : … »), in the panel, the notification and the chain. The message is the launcher's own words, not translated.
- Counter-test: with the threshold removed L49 measures one run of 78.

## 10 November 2026 — the synoptic row, the new reasons, the zone link (SOG-0138, SOG-0143)

- **Synoptic row in the Météo group** (the weather sources are published with the site; this one is made on the workstation): a module-own flow like the route row (`world.js`), taking part in `busyNow()` only **while it builds** (a status read is silent and must not grey the screen), and **not in the chain nor the journal**.
  The status is read once at the opening (not after other operations: it moves only by its own build). The button is grey **while the state is being read** (`data-phase`), which is also how the case waits for it.
- **`source-unread` is not buildable and the update says so**: building would give the same zone without points; the cure is the « personnel » box (declared by the pilot, never by the page). The update's second sentence now reads « n ne se construisent pas encore : zone : raison » (it used to say « attendent un fichier de Téléchargements », wrong for these codes).
- **`#data?zone=<id>` sets the selection to that zone alone** (not added to the others): the link's purpose is to rebuild that zone; a zone not in the coverage is only said (nothing is added by a link).

## 10 November 2026 — the build panel with many countries (SOG-0146)

- **What the user saw** (captures of 17:00): « très sale avec beaucoup de pays » — the zone list in two uneven columns, a 44 px framed pill per state, a large empty area right of the map. **Cause**: `choiceHtml('base')` returned five sibling blocks (selection row, selection line, the list, the personal sources…) that all became cells of the two-column grid next to the map.
- **Now**: the grid has **two cells only** — the map and `.d-choice` (the selection row, the line, the list, the personal sources). **Wide** (≥ 1024 px): the map on the left, the choice on the right (1.3 fr / 1 fr), the list scrolling inside (62 vh) so that the panel does not grow with the number of countries. **Phone**: one column, the list under the map.
- **One zone per line, aligned**: a grid of two columns (name with its box | state); the state is a **dot and a short word** with no frame (`.d-st`); when the zone is not up to date the state is the button that opens the reasons (underlined dotted), still 44 px high: **the line is the target**, no pill is drawn. Reasons and notices on touch as before.
- Case L52 (4 widths of reading: structure, alignment, 44 px, wide = list right of the map, phone = under; captures 390 and 1 280). Red before: no `.d-choice`, the lines were not in one column.

## 10 November 2026 — packs: a switch, removal, highlight (SOG-0147)

- **The user's words**: packs could be added but not removed, and one could not see what they cover. **One row = one switch** « the whole pack in the coverage » (on / half / off), replacing « Ajouter tout (n) » (kept for the theme folds only): the same control adds and removes, and its state says what is in.
- **Removal is from the coverage of this workstation, never a purge**: the confirmation names the zones that will be unticked and says nothing is purged. A zone that also belongs to another pack goes too (the question names it): a pack is a list, the coverage is the user's. The data of the zones (published or built) are not touched, whatever the answer.
- **Highlight**: the zones of a hovered (mouse) or pressed (touch) row take the `accent` tone on the map — the map is redrawn on its own (`highlightZones`), the panel is not. On a phone the press **keeps** the zones lit until the next press elsewhere (a finger cannot hover).
- **Placement**: the packs moved from the Couverture card into the choice of the base panel (beside the map, above the list): the user chooses countries in one place.
- Counter-test: removing the question (`yes = true`) turns L53 red (« the question is asked » never true).

## 10 November 2026 — « Ranger les sources brutes » visible read only (SOG-0144, rest)

- The block was **empty** without a paired launcher (and the whole inventory card absent), so the user did not find it. The card now exists without a launcher (title, intro) and the move block is shown **read only with its reason**, the two buttons grey and nothing sent: « Lanceur non appairé : le rangement se fait depuis le poste qui porte le lanceur » (no launcher), « Verbe inconnu de ce lanceur : relancez-le à jour » (`regen/verbs` lacks `base/move-sources`), « Une opération est en cours » (busy, as before). The inventory rows themselves still need the launcher and are not read without one.
- Cases L54 (no launcher), L55 (unknown verb); L29 adapted (the block is now present, every action grey).

## 10 November 2026 — one primary in the base panel; « Purger » by runs of 60 (SOG-0071, time 3)

- **The rule**: one primary button per screen (rule 13). The base panel had up to three (« Mettre à jour », « Prendre le fichier », « Construire »), depending on the state. Now « Mettre à jour » alone is in view and primary; « Télécharger », « Prendre le fichier téléchargé », « Tout recalculer » and « Purger » are under a folded « Plus ». **Our objection, kept**: when a manual cycle is missing, the file to take is the thing the user must do before any rebuild; hiding it would hide the one urgent action, so it stays in view and is the primary in that state (and « Mettre à jour » yields): still one primary. The fold is remembered between draws (`S.verbsOpen`) and a verb tapped under it opens it first in the cases (`tests/v3/lib.py` `tap`), as a finger would.
- **« Purger » over 60 zones**: it was the one base verb the launcher refused with more than 60 zones (SOG-0144 had cut the other two). One plan per run, then **one question that sums them**: the user answers once for the whole selection, never once per run. A run whose plan is not good stops the series, and nothing is purged without the answer.
- Counter-tests: without `purgeChunks` L56 reads « plans: [78] » (one plan of 78 zones, refused by the launcher); without the fold it reads « no verbs row ».

## 10 November 2026 — the pickup says what is already taken and what is there but not read (SOG-0150)

- **The user's case**: « Rien à prendre dans Téléchargements » while three NATS sets of gb were already in place — and ignored by the build, because the « personnel » box did not declare NATS. « Nothing to take » was true and useless.
- **Decision**: the page sends the box (`personal`, always, `[]` when empty) so that the launcher can say `unread`; the end says « déjà pris » (inPlace) and, per source, « présents, non lus : la case « personnel » ne déclare pas NATS ». The remedy is written in the sentence (tick the box); « Mettre à jour » then reads the files (gb `source-unbuilt`, buildable).
- Counter-tests (L58): without `personal` in the plan the launcher gets `None`; without the inPlace sentence the end reads « Nothing to take in Downloads ».

## 10 November 2026 — a failed publication says why (SOG-0155)

- « Corrigez la cause puis relancez » was the whole message: the user never knew the cause. The launcher now reports `cause` and `step` (data/local/sync.json); the frame keeps them (closed lists, like every field read from a report) and the panel says them in plain words and the step, in four languages. A cause the page does not know is dropped, not shown; the sentence then says the launcher did not say why, and to update it.
- Counter-test (L59): `exchange()` without the cause makes every sentence the « did not say why » one.

## 10 November 2026 — evening pass: three escaped defects of the day's lots (L4, L5, A36)

- **L4 and L5**: the « Synoptique monde (GFS) » row (SOG-0138) takes its state from the workstation's `weather/world` status, like the route row (SOG-0125): it is not a state invented without a publication, nor a cycle state. Both cases now leave it out of their count, as they already left out the route row (the tests were wrong, not the page).
- **A36**: « Tout désélectionner » (`select-none`, SOG-0071 time 1) stayed live without a launcher, against the frame's rule « read only without a launcher: every action grey ». It is grey now (like « Seulement les périmés », which already was); the rectangle cases (L38, L39) install a fake launcher. A36 names the live verbs instead of counting them.

## 10 November 2026 — themes: a tick per country, one block with two tabs (SOG-0165)

- **The user's words**: « le bouton « ajouter » est beaucoup trop gros par rapport au texte… si on utilise un bouton et pas une coche, collé à du texte, il ne devrait pas dépasser autant de la ligne ». The coordinator's rule, applied: **in a list row the action is the row or a box; a drawn button lives only in a row of buttons; the 44 px target is never a size of drawing.** A theme's countries are therefore ticks in the grid of the zones list, not « Ajouter » buttons; « Ajouter tout » (a button) is gone, replaced by the « Tout le thème » switch.
- **One block, two tabs** (Régions | Thèmes) instead of two stacked lists: the page is shorter, and the two ways to choose countries sit in one place.
- **Not repeated**: the state pill (a button that opens the reasons) is not drawn on the theme rows — it would double every pill of the zones list a screen below, and be a button inside a row; the coordinator's « (case, nom, état) » is kept for the zones list, the theme grid gives box and name.
- Unticking removes from the coverage **after a question** (as the region switch does); nothing is ever purged.
- Case L44 is the case of this fiche (red before: no tabs, an « Ajouter » button per country). L52, L53 count rows of the zones list only.

## 10 November 2026 — one certification box for every personal-licence source (SOG-0162)

- **The user's words**: « on a besoin d'une seule coche « je certifie utiliser les données pour mon usage personnel », et ensuite tu déverrouilles tout. mais tu collectes bien toutes les licences et les sources, dans la page ad hoc ». One box instead of three or four (ENAIRE, NATS, AirNav, X-Plane): the pilot certifies once; every personal-use source of the ticked zones is then read.
- **Guard (the coordinator's, kept)**: what is proprietary or without a right of redistribution — X-Plane / Navigraph, the EUROCONTROL workbooks — is read on this workstation and **never enters the published base nor an export, box ticked or not**; the box unlocks *reading*, not *publishing*. The page « Sources et licences » says it per source (« Lu sur ce poste seulement », `localOnly` in the catalogue).
- **Migration**: the old boxes lived in `cache/data/personal.json` as `{ sources: [...] }`; one known source ticked = the new box ticked (a pilot who had ticked any had already certified his use); no `certified` field is invented for an empty one. `sources` is still written (the unlocked ids) so an older page reads the same file.
- **The sources of the page**: the list is the AeroDB catalogue; optional fields (`pub`, `credit`, `date`, `localOnly`) are shown when present, the publisher falls back to the start of the name and the date to the AIRAC cycle for the dated sources. AeroDB (D4) fills the catalogue's lines; this page does not guess a credit that the catalogue does not give.
- Cases: L32 (the box, remembered, sent, migrated), L2 / L7 / L10 / L15 / L58 (the box replaces the taps of the boxes), A119 (the page).

## 10 November 2026 — opening Données without waiting for what is not on screen (SOG-0164)

- **The user's aim**: the page usable in under one second. V3 Frame had already made the launcher call single and the list non-blocking (77185fe84); what remained avoidable on our side:
- **(1) The map library and the tiles** (about 1 MB and the style) were asked for at the first draw for a block that is not the first thing seen. `zonemap.js` `whenVisible`: the map starts when its host comes within 400 px of the screen (IntersectionObserver; immediately where it does not exist); the place stays reserved (the slot keeps its size, rule 22), so nothing moves when it arrives. The States map starts the same way, when its group is open and near.
- **(2) The state of data/** (`GET sync-status`, a fresh survey: more than a second on a data/ of 10 000 files) was awaited with the other reads of the first draw. It no longer is: the zones are drawn, the « Publier » line says « Lecture de l'état des fichiers du poste… » (reserved place, `S.pub.reading`) and the answer replaces it; after an operation the old state stays until the new one comes. A button pressed meanwhile reads the state itself (the publication already did).
- **Measured** (test harness, a `sync-status` delayed by 2.5 s, 1280 × 420; not a real 10 000-file data/, which only the user's workstation has): zones drawn **before: after the answer (≥ 2.5 s); after: at once (≈ 0.6 s for the whole opening)**; requests at the opening **after: 76, 1.95 MB, no MapLibre, no tile** (before: MapLibre ≈ 1 MB + the style requested at the opening).
- **Not done — (2) the 29 scripts of `modules/data` loaded one by one, and (3) the four `regen/job` polls.** The scripts form a static import graph (3–4 levels, each level loaded in parallel): cutting it means turning `route.js`, `world.js`, `update.js`, `chain.js`, `inventory.js`, `packs.js` into dynamic `import()`s opened with their group, a refactor of `module.js` and of every handler that calls them — not safe to do blind; **proposal**: a `modulepreload` list at the frame level (V3 Frame: `meta.files` is known only after `module.js` is read, the frame could read it from the module registry before importing) would flatten the waterfall without touching the module. The `regen/job` polls (`resume`, the `base/status` job and its polls) belong to the launcher's single job slot; I did not serialise them without a real launcher to measure.
- Case L60 (red before: the zones waited for sync-status and the library started at the opening). L38 and L39 had flaked since the select-none fix because their fake launcher had no `base/status` answer (an `IndexError` in the fake's handler): fixed with it (`_rect_open`).

## 10 November 2026 — the ergonomist's three retouches on the packs (SOG-0165, after the capture)

- **A visible defect, mine**: at 1280 px the packs block was a scroller of 24 vh (`max-height:24vh`, SOG-0147's layout) and its zones grid inherited the 50 vh cap of the zones list: the unfolded theme was cut in the middle of « Tout le thème » and its countries were out of sight, the zones list seeming to cover it. Both caps are gone for the packs block (`[data-packs]`, `[data-packs] .d-opts`): the unfolded fold shows its switch and all its countries, the zones list follows.
- **Density**: 44 px is a finger target, not a line height for a mouse. With a fine pointer (`@media (pointer:fine)`) a list row (`.d-opt`, `.d-zrow`: the zones list, the themes, the personal-licence box) is 32 px; with a finger 44 px. Buttons keep 44 px. The 44 px checks of L2, L7, L15, L17, L52 now say 44 for a finger and 32 for a fine pointer on checkbox lines, 44 for buttons.
- **The panel title**: « Télécharger, construire, purger » no longer said what the panel does once « Mettre à jour » is its only primary: it is « Mettre à jour la base » (help ×4 follows).
- Case L44: the unfolded theme (switch and three countries in full, no clipping, the zones list after it) and the row height by pointer; red before (4 rows clipped, overlap, rows of 45 px).

- **Last retouch** (the ergonomist, after the capture): the countries of a theme and the zones list of the coverage followed each other with no title, « Espagne » looked listed twice. The zones list now has its title « Zones de la couverture (n) » (`zonesTitle`) and the countries of a theme are one step in (24 px) under their « Tout le thème » switch. Case L44.

## 10 November 2026 — the single box no longer blocks a rebuild (SOG-0162, refused at the recipe, blocking)

- **The failure**: the single certification box sent X-Plane with the other sources; the build answered « La construction avec X-Plane se fait dans la page… : décochez X-Plane et relancez » — and no X-Plane box existed any more: no rebuild was possible with the box ticked (the user's base stayed at parser 23, the current one being 27). My fault: I made the box send *every* personal source and kept the two texts of the old per-source boxes.
- **The rule, now**: a source « lue sur ce poste seulement » (X-Plane; `isLocalOnly`) is **never sent to the verbs** (`personalPicked`) and never stops a build; it stays listed with its mention. The two texts that asked to untick it (`xplaneHint`, the old `sumXplane`) are gone, ×4; an older launcher that still answers `xplane-in-page` is told « X-Plane est lu sur ce poste seulement : il n'entre pas dans cette construction » — nothing to do. AeroDB sets the launcher side (discard with the reason instead of refusing).
- Cases: L7, L10, L15, L32, L58 (the bodies: `['enaire', 'nats']`, never `xplane`), L61 (static: no text asks to untick X-Plane, ×4).

## 10 November 2026 — the update path, surveyed (SOG-0180), first lot

**The path as it was** (« Mettre à jour » then « Prendre le fichier téléchargé »):
1. « Mettre à jour » downloads the sources of the ticked zones (`base/fetch`; a source that only the user can fetch is reported `manual` with its address), reads `base/status`, then asks ONE question naming the zones to rebuild (reason per zone, size, « Cela peut être long ») and, in the same question, the zones that **cannot be built yet** because they wait for a file (« Prendre le fichier téléchargé d'abord »); Yes builds the rebuildable ones (`base/build`, runs of 60).
2. « Prendre le fichier téléchargé » (under « Plus », in view and primary when a manual cycle is missing): plan, one question, the real run, then the summary and the hint **« Lancez maintenant Construire »**.
3. **Orphan messages found** (a quoted button that does not exist on the screen): (a) `pickupHint` « Lancez maintenant Construire » — the button is « Tout recalculer » since SOG-0071 and the user is not meant to click anything; (b) `source-unread` and `pickupUnread` named the box « personnel » — the box is « Je certifie utiliser les données pour mon usage personnel » since SOG-0162; (c) `sumXplane` and `xplaneHint` asked to untick X-Plane (gone, SOG-0162); (d) « relancez » without saying which button (the failed/partial/cancelled build sentences) — left for lot 2. `chainReload` (« Tout mettre à jour ») names an existing button.
4. **Still missing against the decision**: zones independent with a per-line « Réessayer » (a failed run chunk stops the next chunks: `runChunks` → `stop`); « Prendre le fichier » **on the line** of the waiting zone; a one-line balance (« 58 à jour · 2 en échec · 1 attend un fichier ») whose numbers open their lines; the fine gestes under « Détail » (they are under « Plus » today).

**Lot 1 (this one)**: (1) **taking the file builds the zones taken by itself** (`buildAfterPickup`, only when the pickup is `done`: a failure leaves the screen to its gestures, « Relancer le plan »); what is left to say (a file still absent, a name to rename) goes into the notification since the build replaces the panel; the hint now says « La construction de ces zones démarre d'elle-même ». (2) the orphans (a) and (b) are fixed, ×4. (3) **Case L62 (static)**: every name between quotation marks in a message of `texts.js` is the name of a button of the screen (the labels of the buttons read from the same file, four languages): red before on `personnel` / `personal` / `persönlich`. L19 and L28 follow the chain (the notification keeps what the panel no longer shows).
**Lot 2 (next)**: zones independent with « Réessayer », « Prendre le fichier » on the zone line, the one-line balance, « Détail ».

## 10 November 2026 — the update path, second lot (SOG-0180): independent zones, balance, actions on the line

- **Why**: the decision of the ergonomist (« un seul geste : Mettre à jour… les zones sont indépendantes : l'échec d'une zone est une ligne avec sa raison et son « Réessayer », jamais un arrêt des autres ; « Prendre le fichier » SUR la ligne ; bilan en une ligne dont chaque nombre ouvre ses lignes ; gestes fins sous « Détail »).
- **Independence is a rule of the runs, not of the zones inside a job**: the launcher's job already carries on past a failed zone (`partial`, `failed` list); what stopped the others was the page (`runChunks` and `startUpdate` ended at the first run or download that did not end `done`). `M.chunkVerdict` replaces `chainVerdict` there; `chainVerdict` stays for the chain of sets (« Tout mettre à jour »), where a set is not a zone and the first failure still stops (said in its own question). A stop asked by the user or an interruption stop everything: that is the user's word, not a failure.
- **The balance counts what the launcher says** (`base/status`), never a state computed by the page; « attend un fichier » = not up to date and not buildable. It filters the list instead of scrolling to it: the same button, pressed, gives the list back; a filter that has no zone left falls.
- **Buttons on the line, not under the list**: « Réessayer » and « Prendre le fichier téléchargé » reuse the existing paths (`buildAfterPickup`, `startPickup(zone)`), so the question, the plan and the chain of lot 1 stay single. The label is the one of the screen's button (rule of words, L62).
- **Not done here**: the line of the zones of the other sets (procedures, VFR, aircraft) keeps its current form; the sources read on this workstation only (X-Plane, EUROCONTROL) are still said by their lines of the personal box, not as a balance line (the balance counts zones).
- **Counter-tests**: L64 is red with `chainVerdict` in `runChunks` ([60] runs instead of [60, 18]); L65 is red with `chainVerdict` in `startUpdate` (no question after a half failed download); L63 is red without the balance and the actions.

## 10 November 2026 — a fold of countries in each region pack (SOG-0186)

- **Why**: SOG-0165 replaced the buttons of the packs by switches and tabs and removed choosing one country inside a region; the user: « ce n'était pas si mal de choisir un pays parmi un package, tu as complètement tout supprimé. replié, ça pourrait être bien ? ».
- **What**: the switch stays; a folded « Pays (n) » under it lists the countries (one tick each, the grid of the zones list). A theme already had that list as its whole body; a region now has it as an option, so both kinds tick a country the same way (`togglePackZone`).
- **Not a second path**: the ticks reuse `togglePackZone` and `addZones` / `removeZones`; no new write, no verb. The open fold scrolls inside itself so a region of 40 countries does not push the neighbours away.
- **Found on the way**: the « en partie » state of a switch is a property, not HTML; it was set only after a panel redraw, so a country ticked through a full draw left the switch plain. `render()` now sets it too.

## 10 November 2026 — the coverage table by country (SOG-0174)

- **Why**: the user wants aeronautical data for every country; AeroDB gave the verb `base/coverage` (what each zone's base holds, read from its files) and its contract in writing; the ergonomist's brief: a row per country, six columns, source and licence, sortable, seven columns at most.
- **Folded and read on opening**, like the inventory: about a second of reading for 71 zones, no cost for the user who never opens it; closing drops the read so the next opening is fresh (a build may have run).
- **Seven columns**: the country and the six the brief names; the source and licence (several per country) and the counts of aerodromes, navaids and VFR points go to the detail of the row, where there is room for words. « non » is a count of 0 (the contract: no unknown). Licence, publisher and credit are the catalogue's, never the launcher's text.
- **No filter of the user's coverage**: the table shows every zone the launcher knows, not only the zones ticked on this workstation (the point is to see where the data is missing).
- **Counter-test**: L67 (no block before). Not done: a « Mettre à jour » button on a row (it would be the third way to start an update: the zone's own « Réessayer » and the one gesture stay the only ones).

## 10 November 2026 — the question of the pickup is a list (SOG-0197)

- **User's picture** (« Screenshot 2026-11-10 122344 »): one paragraph with nested parentheses (`France (métropole et outre-mer) (SIA France (XML SIA + AIXM 4.5))`), a rule for file names given as a sentence (« nom de fichier à renommer : lettres, chiffres, . _ - ») and the path of the raw sources: unreadable.
- **The frame's `ask` takes titled groups** (a small, backward-compatible option; texts only), not HTML: the module keeps writing sentences and lines, the frame draws and bounds them (seven lines visible per group, the rest scrolls; the window stays within 70 vh).
- **A rename is an instruction**: « renommez X sans espace ni accent ». AeroDB has already accepted Sweden's `AIP_OFFLINE.zip` (the false « à renommer » came from a missing destination, not the name); the instruction remains for the names the launcher really refuses (accents, spaces).
- **Counter-test**: L19 and L28 compare the groups and their lines (red before: the question was a paragraph); L57 checks that sixty lines are sixty lines in a scrolling group of seven.

## 10 November 2026 — « Mettre à jour (n) » on a pack (SOG-0188)

- **User's words**: « pour rafraîchir « europe de l'ouest », on déselectionne tous les pays, on clique europe de l'ouest, une popup nous prévient qu'on accepte, et on resélectionne… ». The update path took the ticked selection only, so refreshing a pack meant rebuilding the selection by hand.
- **One path, a parameter**: `startUpdate(zones)` is the former one with the zones given instead of the selection (`selectionOf` applies the « personnel » box to them); no second update flow, so the question, the chunks over 60 zones and the failures of lot 2 stay single. The selection is neither read nor written.
- **The button is the only one in a pack row** (SOG-0165 forbade a button per country row): its count is the number of the pack's countries in the coverage, the zones it will touch; a pack with none has no button (nothing to refresh; « Ajouter tout » adds).
- **SOG-0186 retouch**: the countries of the open fold are one step in from their pack (the ergonomist's capture at 1280 showed them at the level of the packs).
- **Counter-test**: L68 is red without the button (none exists); L66 checks the indent (18 to 40 px from the switch).

## 10 November 2026 — « en partie à jour » and the step-by-step (SOG-0191, SOG-0189)

- **A mixed set is a state of its own**, `partial`, not a variant of « cycle dépassé »: the VFR build of 10 Nov replaced 418 terrains by 28 and the row read « à jour ». Ahead of the stale state because the sentence the user needs is the parts by cycle, not a date. The pill is amber; the line carries the numbers.
- **The page draws what AeroDB gives and checks nothing**: the step-by-step is `stepsOf` as it is (links only if https, the file name as text in `<code>`), the dead-link fallback is the home page the catalogue provides; no network call is made to test a link.
- **On the line of the zone, not in a help page**: the user who waits for a file is looking at that line; the same steps are not repeated in the pickup question (SOG-0197 keeps it short).
- **Counter-test**: L69 (state `partial` and the numbers; the first link is the catalogue's page link, in a new tab with `noopener noreferrer`; the exact file name; the steps absent on a zone that waits for nothing).

## 11 November 2026 — the survey of the gap between two neighbours on the map (SOG-0201, survey only)

- **User's picture** (« Screenshot 2026-11-10 123159 »): a gap between two outlines at the Belarus / Ukraine border; « toujours la divergence des points entre pays ».
- **Where the outlines come from.** The map of Données draws what `ctx.aerodb.zoneOutlines()` gives (`frame/aerodb/aerodb.js`), which reads `shared/carto/aero_zones_geo.js`, **generated** by `tools/build_aero_zones.py` from Natural Earth 1:50 000 000 (`ne_50m_admin_0_countries`, public domain, v5.1.2). The same file feeds the fallback background of the Map (`modules/maps/lib/outlines.js`). 218 zones, 24 582 vertices, rounded to 0.01°.
- **Why two neighbours do not share a line.** `build_aero_zones.py` simplifies **each country's ring on its own** (Douglas-Peucker, tolerance `TOL = 0.08°`, the ring cut in two halves) and keeps the exterior ring only. A border is one polyline for the two countries, but each simplifies it as a part of a different ring, with a different pair of end points: the two keep **different vertices** of it, so the two lines differ by up to the tolerance on each side. **Measured on the file** (vertices of one country within 0.1° of its neighbour): Belarus / Ukraine 24 vertices, 14 exactly on the neighbour, the others up to **0.081° (about 9 km)** off; France / Spain 11 vertices, worst 0.093° (10 km); Germany / Poland 0.057°; France / Germany 0.063°; Ukraine / Romania 0.015°. At the scale of the screen (a zone ≈ 100 px) that is the visible gap or overlap.
- **Not a data error and not the page**: the page draws the rings it is given, in order. The source (1:50 M) is already one topology (neighbours share their border vertices); the divergence is introduced by the simplification.
- **The fix belongs to the generator (AeroDB)**, not to Données: a **topology-preserving simplification** — cut each ring at the vertices where the neighbour changes (junctions), simplify each shared arc **once** (same end points, the arc taken in one canonical direction) and give the result to both countries; or, cheaper, keep the original vertices of every border that two countries share (simplify only the coastline). Either gives two outlines that coincide exactly on a border. Proposed to AeroDB; nothing is changed here.

## 11 November 2026 — « Choisir le fichier… » (SOG-0199)

- **User's words**: « « prendre dans downloads » automagiquement c'est pas mal, mais pas suffisant. si on n'a pas trouvé automatiquement, proposer de choisir manuellement. par ex, AIP_offline.zip est bien téléchargé pour la suède, mais pas récupéré ».
- **A dedicated route, not a job** (AeroDB): a file of up to 1.5 GB cannot be a job argument and would hold the one job slot for the whole transfer; the frame's `ctx.launcher.upload` (XMLHttpRequest, because `fetch` has no upload progress) sends raw bytes to `base/upload`, declared in the module's `meta.launcher.routes`.
- **Recognised by content, never by name**: the name is a hint; the launcher says what the file is (source, zone) or why not. The page never decides where a file goes.
- **No second pickup path**: the upload puts the file where Downloads is read and the page then runs the same `startPickup(zone)` — the question, the chunking and the build of lots 1 and 2 stay single.
- **Not done**: the PDF, the lone XML and the workbooks (VAC, RAD, DIRCAM) are not taken by the launcher's first batch (said as `unrecognised` with the sources it takes); and the frame hands on only `reason`, `message` and `wait` of a refusal, so the list of expected sources is the one this screen knows until V3 Frame passes `expected` on (asked).
- **Counter-test**: L70 (the request, the encoded name, the progress and the grey buttons, « Annuler », each refusal in words with no pickup after it, the same file already there).

## 10 November 2026 — « Mettre à jour » only does what is not up to date; a failed download says why (SOG-0180 reopened)

- **User's words**: « le téléchargement NASR répond 403, ça bloque la mise à jour qui s'arrête dessus » (16:25) and « la mise à jour, qui a quelques items en échec, reprend de 0 dès qu'on « met à jour », alors que c'est déjà vert. il faudrait un truc pour confirmer que le download a bien été fait, et ne reprendre que la suite de la màj (probablement le recalcul) » (16:55).
- **Reproduced with the real shape** of a 403 (AeroDB's own views): the update did **not** stop in the code — the state is read, the question asked (L71 green from the start). What the user saw was a page still running the module from before the second lot (browser cache) or an end that said nothing about the zone (the others up to date, the failed one not buildable: a sentence without the reason nor a button). Done: the reason on the zone (source named, what it answered), « Réessayer » that replays that download, the bilan counting zones.
- **The state is read first**: « Mettre à jour » used to download the whole selection then read the state; it now reads the state, skips what is green, does not download again what is already there (AeroDB's `download` of `base/status`, 5b3e52773, read-only, no network) and says what it is going to do. A launcher that does not say (`download` absent) keeps the previous behaviour for the zones that are not up to date.
- **Not done**: the progress « not starting from zero » is the consequence (the views list only the zones that are worked on); a download that is done but whose build failed is « Réessayer » of the build as before.
- **Counter-test**: L72 (first update: one zone downloaded of five, the line, the order status → fetch; second: nothing downloaded; all green: said, nothing asked), red against the previous `update.js`; L71 (real 403 shape: the reason on the line, « Réessayer » → fetch of that zone alone, bilan of two zones); L36, L68 adapted (the up-to-date zones are no longer downloaded).

## 10 November 2026 — the real cause of « the 19 zones are not proposed » (SOG-0180 reopened)

- **Facts read on the user's workstation** (relayed by the ergonomist): 59 zones at parser 28, **18 left at parser 23** (al, ba, ch, cy, dz, eg, es, gr, hr, il, it, lb, ly, ma, me, mt, ps, tn), 1 failed (si); a coverage of **78 zones**; the afternoon update « stops » on the FAA's 403 and rebuilds none of the 19.
- **Cause**: `fetchStatus(ids)` read the state of `ids.slice(0, 60)` only. A selection of 78 zones was read for 60 of them: the others had no state, so no pill, and `updatePlan` counts a zone without state as `unknown`, never proposed for the build — whatever the FAA answered (a 403 ends the download as `partial` → verdict `failed`, the update goes on: L71). AeroDB's verb does not stop either (K159). Counter-test **L73** (78 zones, the status of the fake launcher filtered by the zones asked like the real one, 18 stale at the old parser, `us` refused): the question asks to rebuild 19 of the 78 zones; red before (the state of the 78 zones is never fully read), green after.
- **Done**: the state is read by runs of 60 (the launcher holds one job at a time: one after the other) and merged; the opening, « Seulement les périmés » and « Mettre à jour » all go through it.
- **The FAA fallback** (AeroDB's request, 0a99d0738): the line of a zone whose `faa` / `faaclass` source answered 403 offers « Choisir le fichier… » and the direct link of the NASR subscription page; the launcher recognises the three sets (FIX, AWY, NAV) and builds the layer from them.
- **NASR by hand follows the fetch, not the pickup** (AeroDB, f550eb340): the three FAA zips are read by the download of the zone (`faa` NASR layer), which writes the file the build of `us` reads; after each upload the screen counts the sets of the cycle and, at the third, runs `base/fetch { zones: ['us'] }` then the build. Counter-test: L74.
- **The launcher says what is deposited** (AeroDB 42aab1ae8): the answer of `base/upload` for a NASR set carries `deposited` and `missing` (FIX, AWY, NAV; `missing: []` at the third): the screen reads them and keeps its own count only as a fallback for an older launcher. L74 plays both (first answer without the fields).

## 10 November 2026 — « À reconstruire » and « Base construite » at once (the user: « nonsense. qu'est-ce qui est vrai ? »)

- **Proved on his base** (read only, by the ergonomist): `data/local/build/se.json` is built at parser 28 with `personal: ['lfv']`; the state is `up-to-date` with `personal=['lfv']` and `inputs-changed` (zones/se/lfv_se_enr_….geojson) with `personal=[]`. `fetchStatus` sent `zones` only; the build sends the ticked sources.
- **Done**: `fetchStatus` sends `personal` = the build's list (`personalPicked`); the box « Je certifie… » re-reads the state; « Mettre à jour » and each run of 60 inherit it. Counter-test L75 (a launcher that answers stale without `personal`, up to date with ENAIRE; red before: the opening asks with no `personal` key).
- **To decide with AeroDB (not coded)**: with the box unticked and a zone built with a personal source the launcher says `inputs-changed`, whose text (« fichiers source modifiés ») is wrong for this case; the text should say « construite avec une source personnelle que la case ne déclare plus ». The existing code gives the file names (`zones/se/lfv_…`), from which the screen could guess; a dedicated reason code `personal-undeclared` with the source would be cleaner.

## 10 November 2026 — the pack's chevron is on its line, « Mettre à jour (n) » a discreet link (SOG-0186 retaken, SOG-0228 d)

- **User's words**: « non. mettre le chevron d'ouverture sur la ligne même, et réduire le bouton, voire le remplacer par une url ! » and « les gros boutons « mettre à jour » auraient pu être alignés à droite (et beaucoup plus petits) ».
- **Done**: the summary of the pack's fold is the pack's line (chevron, switch, name, counts, link at the right); the switch is a box alone with the name as its accessible name (a tap on the name unfolds; before, it toggled the whole pack under the finger). The 44 px touch height stays (invisible).
- **Counter-test**: L66 (the switch in the summary, the link at the right of a one-line-high line from 700 px, no filled button), L68 unchanged.

## 10 November 2026 — the minimum before the redesign of the base screen (SOG-0228; the redesign is SOG-0229)

- **User's words**: « j'ai « 68 à jour, 7 à reconstruire ». je clique sur le bouton, j'ai l'impression qu'il ne se passe rien […] je ne sais pas quoi faire pour reconstruire ces 7 […] replier « paquets de pays » […] expliquer pourquoi « zone de la couverture » est suivi d'un « 75 ». »
- **Done, nothing more** (the ergonomist's challenge: the whole screen is redone from the specifications; a bigger dressing would be undone): packs folded at the opening; a number of the balance ticks its zones, shows them alone, brings them into view and says what to do; the count of the coverage explained; the update links of the packs small and at the right (SOG-0186).
- **Counter-test**: L76 (folded and kept, the note with its two numbers, the three zones ticked and alone and in view with their line, the second tap back to the whole list); L44, L66, L68 open the fold first.

## 10 November 2026 — « Publier » after a build: what is true (SOG-0230)

- **User's words**: « parfois, on met à jour, on reconstruit, on publie : « 0 fichiers envoyés ». super. par ex. la suède, s'affiche construite, mais rien à publier. »
- **Survey** (read only, the user's `data/`): the build **commits by itself**, one commit per zone, « Base aéronautique se 2026-10-29 construite sur le poste », with the zone's files (`sia/base/se/…`, `sia/base/index.json`); the frame's background pass then pushes them (`data/local/sync.json`: `pushed: true`, `committed: 0`, at the minute after the build); so « Dernière publication » is the minute of the build and « Publier » finds nothing to send. **A zone built with a personal source (LFV) is published like the others** (its commit holds its files); only what AeroDB marks local (X-Plane, EUROCONTROL) stays on the workstation. « 0 fichiers » came from the line « Fichiers commités : 0 » of a publication whose commits had already been made by the build.
- **Done**: the screen says it — « Tout est déjà publié : les commits de la construction sont partis à {d} » when nothing is left and the last pass pushed, and « Envoyé : n commit(s) déjà fait(s) par la construction » for a publication of commits already made — never « 0 » alone. Not done: a per-zone « published at » (the launcher does not say it).
- **Counter-test**: L77 (red before: the first line stayed « Fichiers commités : 0 »); L12 reads the clean line.

## 10 November 2026 (evening) — three cases of the L area that my targeted passes missed

- **L4** (61e3af63a, SOG-0228 c): the note under « Zones de la couverture » read `S.d.zones.length`; with a failing `zones` call (`fail: ['zones']`) the screen threw and never drew. The note is now drawn only when the zones are known.
- **L53** (61e3af63a, SOG-0228 a): « Paquets de pays » is folded when the screen opens; the case hovered a row inside it. The case opens the fold first and hovers the name of the pack (the hover of a row still lights its zones on the map).
- **L62** (24c5e3435 / 870408de6): the quoted « Choisir le fichier… » of the messages (the FAA fallback) is a real button (`up.choose`); the list of the case's button labels did not name that key. It does now.
- **Rule kept**: after a change of the Données screen, the whole L area is replayed (79 cases, both widths, four languages) before the push; targeted cases are not enough.
- **L53 at 390 px** (the ergonomist, 10 Nov evening: unstable, « hover: ok au lieu de accent »): a hover is the gesture of a mouse, so the case hovers only from 700 px and, at 390, plays the touch press that follows (a forced hover there proved nothing); the taps on the switch close the floating notes and centre the pack first (a note covered it: « cannot tap »). Ten runs in a row at 390 (four languages each): green.

## 11 November 2026 — the text under « Je certifie… » says what is true (SOG-0230, the user: « absolument »)

- **Done**: `certifyHint` (and the help, ×4) now say that a zone built with a personal-licence source (LFV, NATS, ENAIRE, AirNav) **is published in the pilot's own data repository**, and that only X-Plane and EUROCONTROL stay read on this workstation, never published. The previous text was right about the second half and silent about the first.

## 11 November 2026 — where to create the EUROCONTROL account (SOG-0237; the facts are AeroDB's)

- **User's words**: « pour eurocontrol, il faut d'ailleurs ajouter un mot, quelque part, pour donner la procédure de création du compte à l'utilisateur. »
- **Done**: one more line on the row « Route (RAD, points FRA) » (after the line that already says what to download — `RAD_<cycle>_v….xlsx`, `eurocontrol-airac-<cycle>-fra-points-….xlsx` — and where: Downloads) and on the two EUROCONTROL lines of « Sources et licences »: « Compte EUROCONTROL gratuit : inscription sur la page EAD Basic d'EUROCONTROL, lien « Registration form (New Users) » ; les accès arrivent par courriel. », the page in a direct link (`https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/ead-solutions/ead-basic`). **No identifier or password is asked or kept.** AeroDB did not verify the direct address of the form (the link is ON that page) nor where the FRA points workbook comes from: the text promises no more, and does not give nm.eurocontrol.int/RAD as a registration page.
- **Counter-tests**: L33 (the link, the name of the form, no field), A119 (the account line on the two EUROCONTROL lines only); L62 knows that « Registration form (New Users) » is EUROCONTROL's own link, not a button of the screen.
- **EUROCONTROL workbooks chosen by hand** (AeroDB's recognition): « Choisir le fichier… » on the route row sends the workbook; the answer carries `source: eurocontrol_rad` and no zone, so the screen does not run a pickup/build of a zone but the import of the row (plan, then the question). Counter-test L78.

## 11 November 2026 — challenge of Réglages: a false « all up to date » (L79) and the inventory of the screen

- **Proved by L79** (red before): when nothing was to rebuild, « Mettre à jour » said « les 5 cochées sont à jour » with n = every ticked zone, even when the launcher had answered for 3 zones only (a zone without a state is neither up to date nor stale). It now counts the zones the launcher said up to date and says apart how many have **no state** (`TX.upd.noState`); the notification is a warning in that case.
- **Not coded, for the ergonomist's sheets** (reported): the balance (« 68 à jour · 7 à reconstruire ») does not count zones without a state either (they are silent); see the gaps of `INVENTAIRE_FONCTIONNEL.md`.
- **`INVENTAIRE_FONCTIONNEL.md`** (SOG-0229 input): the functional inventory of the screen — gestures, states, messages, with their SPEC § and cases — drafted by a cheaper model from the code, the SPEC and the cases, read and spot-checked here; rows it could not settle are marked « unverified »; its « Gaps » section lists what exists in the SPEC and not in the code, the information said in several places, and the gestures or messages without a case.
- **L53, the race found** (the ergonomist, 10 Nov 23:37: « trouve la course au lieu d'allonger le délai »): the case opened the « Paquets de pays » fold with `details.open = true` and went on at once; the `toggle` event that keeps the fold open in `S.packsOpen` arrives after, and a redraw in between (a state read) closed it again — the pack row was then hidden and neither hoverable nor tappable. The case now re-opens the fold in the same wait that scrolls the row into view and checks it is uncovered, and waits for the question to leave the screen before the next tap. Sixty runs (both widths, four languages each) without a failure.

## 11 November 2026 — a screen left while it loads (V3 Frame's report: `Cannot read properties of null (reading 'ctx')` at `follow`)

- **Report**: opening Maintenance on `#data` then `check_errors` showed a page error at `follow` (follow.js:412) called from `mount` (module.js:399): `mount` went on after `await load()` although the module had been unmounted (the state `S` is null), and `follow()` read `S.ctx`.
- **Not reproduced here**: L80 (the recipe as written, then a slow cache and a hash change while the screen loads) passes on the head of v3 before and after. **Protected anyway**, no behaviour change: `mount` checks `S !== me` after `await load()` (as it does after the first reads) and `follow()` returns when there is no state. The case stays as a regression guard; V3 Frame is asked for the exact conditions if the error comes back.
- **Audit of the same shape in `modules/data`** (a module variable read after an await; the ergonomist's brief): a scan of every `await` followed by a use of `S` without a check of `S !== me` found nine places; eight are harmless (the use is the last line, null-safe, or guarded by the next line); one was real and mine: `fetchThenBuild` (follow.js) read `S.lastOp` **before** checking `S !== me`. Fixed (the check first). **No red case could be produced** for it nor for `follow()`: after the screen is unmounted the awaited job promise does not settle in the harness (the frame stops the watch), so the line after the await never runs; L80 (three mounts and two unmounts while the cache is slow) and L81 (the screen left while a chained download runs) stay as regression guards, both green before and after. Reported as such, not as a proven defect.
- **11 Nov 2026 — The launcher holds the personal-use tick** (AeroDB SOG-0238, 3dcc5e780, validated by the ergonomics
  session): the box « Je certifie… » reflects `data/local/personal_use.json` at the opening, each click posts `{ certified }`
  and the launcher's answer is the truth; the cache of the page follows (it is the fallback without a launcher, and the source of
  the one-time migration). A failed migration writes nothing back over the page's tick (the next opening tries again). Limit
  said in the help: a script of the same origin can call the write route; the gain is against forgetting and against page code
  declaring the tick in place of the user. `base/fetch` still takes `personal` from the page (AeroDB's rest).
- **11 Nov 2026 — Redesign of the base panel, lot 1 (SOG-0229; the user: « tout de suite »; « je veux cocher les zones avant »)**:
  the panel opens on a state sentence (cycle in force + effective date, then the non-zero counts: à jour · à reconstruire · en
  échec · attendent un fichier · sans état — a zone without state is counted, a failed zone is not a stale one); each number
  unfolds its zones in place (same rows and same `S.ticked` as the « Zones de la couverture » list, ticking nothing); ONE
  button, the same `update` verb: « Mettre à jour (n) » on the whole coverage (nothing ticked or everything ticked), « Mettre à
  jour la sélection (n) » when the selection is partial; n = what `downloadPlan` says is to fetch or build (a zone waiting only
  for a file by hand is out, said under the button); the progress and the final summary (with « Réessayer ») sit under the
  sentence. The old balance line and its list filter are gone. « Publier » stays its own step: the line under the button says
  « télécharger …, reconstruire … » and does NOT say « puis publier », because `startUpdate` does not publish (the build
  publishing is for a later lot). The confirmation question still says « cochées » (left for the next lot).
- **12 Nov 2026 — SOG-0244 (screen): a hand-taken file always has its reason and its gesture ON THE LINE** (the user's blocker:
  Portugal alone, « Prendre le fichier téléchargé », nothing said, no way to pass the file): replayed first — the pickup
  posted its dry plan, the answer was a fading note and a bilan at the top of the panel, the row stayed bare. Now a per-zone
  message (`S.zoneMsg`, `zoneMsgHtml`, `[data-zone-msg]`) written at the end of a pickup plan, a real run, an upload or a
  refused start, kept until the next attempt: what was found in Downloads, what is missing or refused, the launcher's
  reason; « Choisir le fichier… » stays on the line as soon as it carries a message or waits for a file; a grey pickup says why
  beside it. Limits told to AeroDB: `navpt` is a launcher-download source with no steps in the catalogue and neither the
  pickup nor the upload take an `.iso` / `AIP ISO.zip` (launcher side); no folder variant of the upload exists on the
  page; a stale buildable row has no action before a first attempt (L63, L70 keep that; offering it earlier needs a catalogue
  field `how: 'pick'`).
- **12 Nov 2026 — SOG-0245 (screen): « une autre opération est en cours » becomes a card** (the user's blocker: which
  operation, since when, how far, alive?, how to go back, stop, free a dead lock): on AeroDB's contract 8494deb47 (`running` in
  every busy refusal, `regen/job?id=`, `cancel`, `release`). `model_busy.js` re-sanitises `running` (closed fields, bounded
  numbers, alive in four words); `busy.js` draws the card in the panel that started the gesture: name in plain words from
  set + verb, UTC start, step / count / percentage, « toujours vivante / silencieuse / ne répond plus / processus disparu »,
  « Voir » (follow by id), « Arrêter » (`cancel`, then « arrêt demandé »), « Libérer » ONLY when alive is stuck or gone
  (`release`; 409 alive → « arrêtez d'abord »). An upload refused busy shows the same card. Without `running` the old sentence
  stays. Needs `frame/lib/launcher.js` to hand `running` through (V3 Frame's file: patch asked). `regen/job/release` is
  declared in the module's routes.
- **12 Nov 2026 — SOG-0244 (Portugal, the junction with the launcher)**: the sentence « Sources prises par l'envoi : … » comes
  ONLY from the launcher's `expected` (the page's `TAKEN` list is gone; without `expected` a variant names nobody). A source whose
  catalogue entry carries `fetch.pick` (navpt, AeroDB dc5d615c0) offers « Choisir le fichier… » from the start with its steps
  (`pickSource`); when a file is seen in Downloads (status reason `pickup-waiting` with its zip) « Prendre le fichier
  téléchargé » is the primary gesture and « Choisir un autre fichier… » a link under it. The zone line says the edition read
  (upload `cycle`), `older_than_cycle`, `future`, `skipped.routes_without_name` and each refused file (`refused`), from the
  K177 shape. Open on the launcher side: `base_sources._fetch_source` does not yet copy edition / from / future /
  older_than_cycle / skipped / refused into the `base/fetch` view, and `base/status` emits no `pickup-waiting` for navpt yet.
- **12 Nov 2026 — SOG-0260 / SOG-0261 (screen side; the launcher side is AeroDB ba44d2e2d)**: the screen no longer lies.
  « Tout est à jour. » only when nothing is left (rebuild, failed, waiting, personal, unknown) — else « Rien à mettre à jour
  seul : n zones attendent votre main » (`data-hand-alone`); `notices[]` are an information line, never counted nor coloured;
  the 13 reason codes of the launcher are all texted, an unknown one shown as « Raison du lanceur : <code> » (never « non
  reconnue »); file buttons only on a hand-taken reason (pickup-waiting, source-missing, source-old, `fetch.pick`);
  personal-undeclared / source-unread{personal} get « Cochez « Je certifie… » » with a link to the box and their own part in the
  sentence (`personal`, « attendent la coche »); the map legend has three states (à jour, à faire, en échec); the state word of a
  row says « pourquoi ? » with a chevron and a tap redraws only that row (scroll kept, SOG-0261); the busy sentence is said once
  (the card, not the grey line under the button). Case L87 on the real base/status shape (75 zones). SOG-0260 point 5
  (edition of a State not following the cycle) is the launcher's, done by AeroDB.
- **12 Nov 2026 — SOG-0262, lot A: the map, the country groups and the country sheet REPLACE the flat list** (the user: « la carte
  du monde est l'entrée »; no switch, no duplicate screen): page order = state bar (one button, the whole coverage) → the MAP
  (country outlines, framed on the coverage, three states + hatch for procedures from `procSources`, blue border for the open
  group, hover fills one country; no dots) → the groups (the packs, always visible, summarised state, one open at a time, the
  group's « Mettre à jour ») → the rest of the old panel. The sheet (`countries.js`, `model_countries.js`; right of the map at
  ≥ 900 px, full screen with « ← Retour » on a phone): state and build date, per source the three ticks (téléchargé · construit ·
  publié: date, edition; « publié » omitted when `publish.state` is unknown), the inventory of hand-taken files in three beats
  (what / where / name, from the catalogue `what`, `where`, `link`, `verified` — « chemin à vérifier » when not verified — seen in
  Downloads / missing, from `base/cycle { zone }` K182), sources unavailable at their publisher set apart. Removed: « Zones de la
  couverture » and its checkboxes, « Seulement les périmés », « Tout désélectionner », the selection line, the rectangle
  selection on the map (the selection concept is gone: the top button acts on the whole coverage). Cases removed with their
  subject: L30, L37, L38, L39, L52. Known limits: the « construit » and « publié » ticks are zone-wide and repeat per source;
  gestures of the sheet (« Mettre à jour ce pays », pick/choose) are lot B (today `zoneActionHtml` is shown inside the sheet).
