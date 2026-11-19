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
- **12 Nov 2026 — SOG-0262, lot B: the gestures of the country sheet and « ce qui reste à faire »** (+ the ergonomist's retouches
  of lot A): the sheet is where one acts — « Mettre à jour ce pays » (`startUpdate([zone])`, the line under it says what it will
  do, grey with its reason written), for a hand-taken source « Prendre le fichier téléchargé » primary when a file is seen
  (`hand.inDownloads` / `pickup-waiting`) with « Choisir un autre fichier… » as a link under it, « Choisir le fichier… » alone
  when nothing is seen; per-file vu / manquant re-read after each gesture; the SOG-0245 card on the sheet. `todo.js` /
  `model_todo.js`: « Cycle AIRAC 2611 : n faits sur m » from `base/cycle`, one line per undone source (regime badge, three ticks,
  a button to the country sheet), done ones folded, `unavailable` apart and not counted. Retouches: « construit » / « publié »
  are facts of the country (once, at the top), a file = three lines (what / Où … + one link label / Fichier … vu|manquant),
  « Fermer » at wide width and « ← Retour » on the phone, the map bounded to 45vh at wide width, the legend on one line with the
  rest behind a « ? », selection wording removed. Reads of the launcher go through `serial()` (one job at a time). DIRCAM:
  `zipmember.js` reads the single member `PDF/MIAM/MIAM_OACI_ENR 5.7.pdf` of the SIA zip by `File.slice` (central directory,
  zip64, stored or `deflate-raw`, CRC checked, bounded) and uploads only that PDF; the launcher (`tools/base_upload.py`)
  answers `unrecognised` for any PDF except `ENR-5-2.pdf` and pdf.js + `AarTracks.parseEnr57` are not wired in V3: launcher gap
  routed to AeroDB. NAT routes, Publier, cycle suivant, « quand ça change », « vu, pas encore lu », « Ajouter à ma couverture »
  are lot C.
- **12 Nov 2026 — SOG-0262, lots D1 to D4: the redesigned screen, one push** (the user: « effet tunnel nécessaire », « le placement
  retenu est celui de la maquette »; the validated mockup `modules/data/maquette/` is the visual contract, the fiche the content):
  D1 behaviours — map zoom / pan / pinch restored (`mapview.js`, `touch-action: pan-y`: one finger scrolls the page, two fingers
  pan and pinch, Ctrl + wheel), « Mettre à jour ce pays » = progress in place then the country's one-line bilan (chain pickup →
  download → build, no question), THE busy card (SOG-0245) on every « busy » exit, the thread of the last operation of THIS
  country kept on the sheet (a failed step stays with its reason and « Réessayer »; never a floating note alone; the reason
  why the country stays not up to date), to-do lines carry their gesture (« pris par le lanceur »), computed / local sources
  (MORA, X-Plane…) never a to-do line (they live under « Quand ça change » and as a fact on the sheet), four tick signs
  (✓ done, ○ to do, ✗ failure only, — not applicable). D2 form — header with title + bar + the one button + its sentence, small-caps
  headings, map left, sheet as a sticky card on the right, groups as a two-column grid with a blue open panel and tiles, framed
  folded « À faire ce mois-ci · n ». D3 — the thread from `base/last` (survives a reload), « Quand ça change » from
  `base/cycle.local`, `natEnsure` busy = the card. D4 — every other set is ONE folded line with its state (nothing unfolded by
  default); ONE « Tout mettre à jour (n) », in the header, that does everything (the base, then the other sets that have
  something to do, the chain's single question and single publication; « Seulement la base (n) » limits it; no second card with
  the same name); the map ≥ 320 px at 1280×800 with the folded to-do line and the first row of groups on screen; an open group
  frames the map on it (overseas territories out of the frame, `mainBox`); groups with something to do first; the three cells
  of a country = short word, the long detail on a full-width line under them; Shift + click / Shift + drag / two fingers held half
  a second select several countries (`select.js`) with a banner « Ajouter à ma couverture (n) » / « Mettre à jour (n) » /
  « Annuler »; the two-column layout uses a container query on the screen's own width (the frame's icon rail). Known limits:
  « n faits sur m » counts the base's sources only (base/cycle does not describe the other sets); the sub-title zone names
  (`partNames`) and « POURQUOI À LA MAIN » (`steps.why`) need two catalogue / aerodb fields that do not exist yet (nothing is
  shown without them); the coverage frame at opening includes overseas territories of fr / gb; the container-query layout was not
  checked against the real frame rail (this worktree was behind).
- **12 Nov 2026 — SOG-0262, D5: three AeroDB contracts on the redesigned screen**: `base/cycle.datasets` (K206) feeds the folded
  lines of the other sets (« à faire — plus ancien que le cycle · le 05/10 », `n/a` = no deadline = done) and the header count
  « n faits sur m » (base sources + one per set); `AeroCatalogue.partNamesOf(zone)` gives the sheet sub-title zones
  (« PT · paquet Europe du Sud · 3 zones : continent, Madère, Açores »); `stepsOf(id).why` gives the « POURQUOI À LA MAIN »
  block, shown for any source whose catalogue entry has a `why` (no key = no block, nothing invented); `registry_fr` of
  `base/cycle.local` is one more generic line under « Quand ça change ». Case L111 was stale (DIRCAM has a known reason since
  AeroDB 6e27a6a8a): it reads the real catalogue now. Not done: the datasets are not counted in the « À faire ce mois-ci » list
  itself; their `counts` / `run` / `cycle` / `validUntil` fields are parsed and shown nowhere.
- **12 Nov 2026 — SOG-0262, D6: DIRCAM, the datasets in the to-do block, the dates on the folded lines**: the launcher (K192) takes the
  DIRCAM ENR 5.7 only as a PDF (`%PDF` + name hint `MIAM_OACI_ENR 5.7.pdf`, answer `{ ok, source:'dircam', zone:'fr', name, size,
  replaced, sha256 }`, kept as it is in `data/local/upload/`, nothing read) and not the 1.3 GB zip: the page keeps reading only the
  member `PDF/MIAM/MIAM_OACI_ENR 5.7.pdf` of the SIA archive client-side (`zipmember.js`), refuses a member that is not a PDF or a
  PDF with another name, and sends that PDF only; the line says what was chosen and what the launcher received, never more
  (nothing parses the PDF into `miam-enr-5-7-tracks.xml` on this screen yet: page-side step to wire later). The header count and the
  « À faire ce mois-ci » block now count the same thing: a dataset the launcher says `todo` is a line of the block with its
  reason and its existing gesture (« Reprendre les routes NAT », « Refaire la météo du monde », « Relire les procédures »…), `n/a`
  has no line (counted done in the header), `up-to-date` is among the done. The folded line of a set shows its useful date
  (`validUntil`, `run`, `cycle` + `counts`). Selectors built from internal ids use `CSS.escape` (audit note, case L122).
- **13 Nov 2026 — SOG-0285, the map of the Données screen** (the user after his trial of the redesign: « toujours pas de molette sur
  les pays », « le shift-clic ne surligne pas les pays ? régression », « un survol sur le périmètre serait bienvenu »). (1) The
  wheel was lost EVERYWHERE on the map, not only over a country: `mapWheel` took a plain wheel only when the page had nothing to
  scroll (`pageScrolls`), and the real screen always scrolls, so the page scrolled under every point of the map (L96 even asserted
  it). The map now takes the wheel wherever the pointer is on it; it gives it back to the page only when the zoom cannot go
  further (no scroll trap: at the end of the zoom the wheel scrolls the page); with Ctrl it is always taken. (2) A picked country
  wore a dark dashed outline, invisible at the scale of a world map, and an open-group blue rule (declared later) hid it; it now
  wears the SAME blue as the open group (`--sog-accent`, solid, 2.6 px) and a fuller fill, declared in the same rule as `data-grp`
  / `data-hl`; the banner under the map already says « n pays ». (3) A group of the grid carries its countries (`data-zones`,
  validated) and the mouse hover outlines them on the map through the existing `highlightZones` (`data-hl`, the open group's blue);
  nothing is framed (the framing stays with the click); touch has no hover (the touch handler of the old rows is not reused).
  Cases L123 (a REAL wheel over a country, the sea and the margin, the page does not scroll; the wheel goes back to the page at the
  end of the zoom), L124, L125; L96 adapted (a plain wheel is taken) and L113 (the mark is solid blue).
- **13 Nov 2026 — SOG-0315, item 4: the French aircraft register has a place on the Données screen** (the user: « « registre français non
  déposé sur ce poste - le déposer ». je clique, et je retourne sur « ma compagnie ». BTW, je n'ai pas trouvé où le déposer dans
  maintenance »). Two causes. (a) The link of the aircraft screen (`#data`, in the Company application) names a module that application
  does not have: the frame falls back to its first screen (« Ma compagnie »); the right address is the Maintenance application's,
  `?app=maintenance#data?registry=1` (to Features SOG, who own that screen). (b) The register had NO place to be deposited in Données: the
  launcher recognises the CSV by its header (`base/upload` → source `registry_fr`, K202 / K203) but the screen only said it in a line of
  « Quand ça change », without a gesture. New fold « Registre français des aéronefs » under « Vu par le poste, pas encore lu » (`registry.js`,
  `later.js`): its state (« déposé le … » from `base/cycle.local` or from the deposit just made, « pas déposé »), the DGAC page as a real link
  (a new tab, no referrer: the address is written in the code, never taken from the launcher), « Choisir le fichier… » (the same hidden input
  and the same `ctx.launcher.upload` as the country sheets; one upload at a time; grey with its reason when no launcher or another operation
  runs), the answer in words (« Immatriculations lues : n, données du … ») and a refusal in words (the launcher's own text is never shown).
  `#data?registry=1` (read once with `ctx.consume`) opens the fold and holds it in view for the first fifteen seconds, even while the screen
  fills in above it or the frame puts the page back at the top; a wheel, a touch, a key or a pointer press gives the hand back. Cases L126, L127.
  Items 1 and 2 of the same fiche: the Material rail (88 px) cut « Administration » as « Administratio / n » (`overflow-wrap: anywhere`, 12 px) —
  the label is now whole (11 px, 84 px available, no cut inside a word); the button « Réglage des seuils de la carte » of the Administration
  card, opened inside Maintenance, pointed to `#maps?tune=1` which Maintenance does not have (it fell back to Données): an entry may now name
  the application that has its page (`app: 'pilot'`) and the button opens that application, in the same tab (case A180).
- **13 Nov 2026 — SOG-0315, item 3: « Ma couverture » becomes « Pays définis »** (the user: « « ma couverture » n'est pas adapté,
  mauvaise traduction »; his word, relayed by the ergonomist: « Pays définis »). Interface only: « couverture » / « coverage » stay the
  words of the specs, the code and the launcher. The labels: the fold « Pays définis » (en Defined countries, de Festgelegte Länder, es
  Países definidos); « Ajouter ce pays » / « Retirer ce pays » on a sheet; « Ajouter ces pays (n) » on the banner of the map; « Recentrer sur
  mes pays définis »; « non défini » where the screen said « hors de votre couverture » (the legend, the group counts, the sheet); the
  sentences that named the coverage say « vos pays définis » (the map label, the confirmations, the grey reasons); the Administration line
  « Maintenance » says « les pays définis et les États ». The texts that describe the Données-side coverage by State of aerodb and the table
  « Couverture par pays » (a table of what the base holds per country) keep « couverture »: it is not the user's list of countries. Help
  ×4 (the quoted labels and one sentence that defines the term), no change of behaviour, no change of key (the cases read the texts by key).
- **13 Nov 2026 — SOG-0229, lot 4 (screen part): one fold « Détail de la base »** (the ergonomist, after the user's validation of the
  redesign: « OUI au « Détail » replié unique »). The three cards that closed the screen — « Couverture par pays », « Inventaire des données »
  and « Journal » — were three more things to look at; they are now the content of ONE closed fold, the last thing of the screen
  (`baseDetailHtml` in `screen.js`, state `S.baseDetailOpen`, class `d-lc d-bdetail`, `data-base-detail`). Each keeps its own fold and its
  own read at opening (nothing is read while the outer fold is closed, as before). Nothing else moved. Case L128; L2 and L107 adapted
  (the journal and the tail of the page), and `_open` / `_l102_open` of the cases open the fold by default (`detail=True`) as they open
  « Ma couverture ». The specs / inventory part of the lot is a separate commit (no code).
- **13 Nov 2026 — SOG-0229, lot 4 (specs and inventory, no code)**: `SPEC.md` § 3 is rewritten from the screen as it is (the redesign SOG-0262,
  validated by the user the same day), with **the six rules of the proposal** written once (a failure never stops the others; a state is said
  once; every number leads to what it counts; nothing is grey without its reason; a zone with no state is counted; what the launcher cannot do
  alone always has the same card) and the notices-are-information rule (SOG-0260). The sections that describe gestures the screen no longer
  offers as such (§§ 5.1, 5.5, 5.8, 5.10, 5.11) keep their logic with a reading note instead of being deleted: the code under them (gates, plans,
  models) is still used. `INVENTAIRE_FONCTIONNEL.md` gets a banner (a survey of the screen BEFORE the redesign) and § 6: what became of each
  block and of each of its ten gaps. Nothing in the code changed.
- **13 Nov 2026 — SOG-0260, the refusal of 13 Nov (« c'est toujours le cas »): the amber of the map says why, and a state not read is neutral.**
  Replay of the REAL state (AeroDB's base/status of 84 zones on the user's tree: 76 up to date — 73 of them with the notice `no-points` —, five
  waiting for the personal-use tick, three to rebuild with the old reader) on the current screen: 76 green, 8 amber, the sentence right, the notice
  colouring and counting nothing: the reported defect does not reproduce with that launcher and this screen. What remained wrong is that eight amber
  countries among seventy-six green ones said nothing, and that every country the read state did not mention (a read under way, a failed chunk) was
  painted AMBER like a fault. (a) Under the state sentence, one line per kind not up to date names its countries (six at most, « et n autres »)
  with the reason when all share it (`stateNamesHtml`, `data-state-names`, texts `TX.sn`); (b) the tooltip of an amber or red country gives its
  reason; (c) a country the launcher's state does not mention, or whose state is not read yet while a launcher answers, is NEUTRAL (tone `unread`:
  grey, dashed outline, « état non lu », a fourth legend item when there is one) — not hidden (SOG-0180 stands), not a fault. Without a launcher the
  publication tone is kept. Cases L129 (the real state: names, tones, tooltips) and L130 (four zones not answered for).
  The line of names is ONE compact paragraph (kinds separated by « · ») after the unfolded list of a number, so it takes at most one line at 1280:
  the cases L102 and L108 now ask that the TITLE line of the first row of groups (not its whole height) is on the first screen of 800 px — one line
  of height traded for the names; the ergonomist can reverse it by lowering the minimum height of the map.
- **13 Nov 2026 — SOG-0119, the lines of the other sets read the launcher's state verbs** (the ergonomist; AeroDB 345ad3c15: `proc/status`,
  `vfr/status`, `aircraft/status`, read only, no network, nothing written; « up to date » = what the workstation PUBLISHED for the cycle in
  force). Until now only the base had a launcher state: the folded line of procedures, VFR points and aircraft, and « Tout mettre à jour »,
  deduced « à jour » from the publication the page read (or from `base/cycle.datasets`), which could say « à jour » for a set downloaded and
  never built. New `setstate.js` (the reads, through the screen's `serial()` lane, never during another operation, once at the opening and after
  each operation, a refusal retried like the other reads, a failed read never retried in a loop) and `model_setstate.js` (the pure part: closed
  lists of states and reason codes, integers bounded, the launcher's text never shown). The launcher's state REPLACES the deduction in
  `chain.js` `setStateOf` (so « Tout mettre à jour » and the line agree) and in `screen.js` `foldView`, with the reasons in words (`TX.ss`: « LF :
  téléchargé, pas construit », « incomplet : 28 sur 454 »); `n/a` (an EAD State, one aerodrome at a time) falls back to the old line; a launcher
  without the verb is not asked and keeps the old deduction. `proc/status` is asked for the States ticked, else for all those of the list (60 at
  most). Case L131 (red before: the lines said the datasets' words). Not done: the weather and the sources lines (no verb for them), and the part
  of the SOG-0119 title that is not the launcher's (suite update, workstation backup, folders, fleet in Maintenance: the user's question).
- **13 Nov 2026 — SOG-0318: the sheet of a country says ONE thing to do now and nothing under it contradicts it** (the user, the real shape of
  « c'est toujours le cas »: Portugal said « À reconstruire », its source « ✓ fait » and « Prise seule par le lanceur : rien à déposer », then « Ce
  pays attend un fichier : prenez-le d'abord »). Cause: the launcher lists NAV Portugal as `kind: download` (it reads the site), so `base/cycle`
  says `regime: auto` and the edition of 1 Oct « done »; the catalogue says the ISO of the next edition is taken by hand (`fetch.pick`), and the
  state says `pickup-waiting` (a file is in Downloads). The page believed the launcher's regime: no hand-taken source, so no inventory, no
  « Prendre le fichier téléchargé » (`seenAny` only counted hand sources), the update button grey with « prenez-le d'abord », and a badge that
  said nothing was to be deposited. Fixes: (1) `regimeOf`: a source the launcher calls `auto` that the catalogue marks `fetch.pick` is a
  hand-taken source on the screen; (2) one decision, `nowOf` (`countries.js`), read by BOTH the new head line of the sheet (`data-sheet-now`,
  texts `TX.now`: take the file seen · deposit the expected file · tick « Je certifie… » · update · nothing to do) and the update button, so they
  cannot disagree. Case L132 (red before: no head line, `regime=auto`, the gesture absent). Not done: the « ✓ fait » of a source whose OLDER
  edition is downloaded while the next one waits says « done » for the edition in force (it is true); AeroDB may want to call the source `hand`
  too (`tools/regen/base_sources.py`, navpt `_src('download'…)`): asked in the state report.
- **13 Nov 2026 — SOG-0324, the flicker green → brown → green during a rebuild** (the user: « le clignotement vert-marron-vert à la reconstruction »).
  Survey: `toneOf` mapped the state « en cours » (`building`, tone `accent`) to `warn` (comment: « en cours dit ambre »), so a country that was up to date
  went amber while it was being rebuilt, then green again; and the run of the sheet (`S.zop`, « Mettre à jour ce pays ») was not counted as running, so between
  its steps the refreshed state (downloaded, not built yet) painted amber too. Now: a run is its own tone `busy` (blue, « en cours », a legend item when
  there is one, `sumBusy` in the summary of a group), held while `S.run` covers the country or `S.zop` is its own; cases L133 (red before: no `busy`).
  The chain « Tout mettre à jour » (ergonomist, 13 Nov evening): between two of its verbs `S.run` is empty for an instant, so `tone()` also asks `chainHolds(id)`
  (`S.chainHold`, the ids of the base runs of the chain, set at its start and cleared once the state is read again after its end — the publication step and the final read
  are held too); the tone without a read state (publication fallback) is `busy` too, no longer amber. Case L136 (red before: busy while a verb runs, amber between the verbs and
  during the publication). The « Repartir de zéro sur cet appareil » gesture of the same fiche is in
  Settings (`frame/settings/DECISIONS.md`).
- **13 Nov 2026 — SOG-0253: the user's VFR circuits XML has a place to be deposited** (the ergonomist: « la page de dépôt accepte le `.xml` des tracés de tours de
  piste, reconnu par le lanceur (34c24550e) et dit ce qui est reconnu ou refusé »). New fold « Tours de piste VFR (extracteur) » under « Vu par le poste », next to the
  French register (`tours.js`, `model_tours.js`, `later.js`): « Choisir le fichier… » (the same hidden input and the same route `base/upload` as the register: no route
  is new), then the page reads what the launcher kept (`vfr/circuits`, read only, through the screen's `serial()` lane) and says it — « Tracés lus : n tours de piste
  sur m terrains », the terrains whose VAC chart changed (`counts.obsolete`) left out, the malformed items (`warnings`) left aside — or refuses in words (a file the
  launcher does not recognise by its root, or keeps but cannot read: its own text is never shown). The result is kept in memory for the pill only; the Map reads the verb
  itself. Case L134 (red before: no fold); L94 lists the new fold.
- **13 Nov 2026 — SOG-0318, the rest: the download tick says both** (the ergonomist: « la ligne « ✓ fait » d'une source dont l'édition suivante attend dit les deux »).
  Since AeroDB 1e99374c8 a source with a package of the next edition in Downloads is `steps.download.state: waiting` (`why: newer-in-downloads`, `hand.inDownloads`), so the
  tick says « un fichier attend dans Téléchargements »; the layer the workstation ALREADY took (status `download.sources`, present, dated) was no longer said. `downloadTick`
  (`countries.js`) now adds « déjà pris le {date} » to the waiting tick (text `TX.cw.dlTaken`). The page-side rule of SOG-0318 (a source the launcher calls `auto` that the
  catalogue marks `fetch.pick` is a hand-taken source) stays: the catalogue is the user's view. Case L137 (red before: the date is missing).
- **14 Nov 2026 — SOG-0340: the wheel zooms the map only when the pointer is ON it** (the user: « la roulette de souris, sur page maintenance, est active sur toute la page, pas seulement au survol de la carte »).
  `mapWheel` (`mapview.js`) asked `mapOf(e.target)`, which falls back on the first map of the page when the target is not inside one (that fallback is for the zoom buttons), so a wheel anywhere in the
  screen zoomed the map and was swallowed. It now answers only a wheel whose target is inside `[data-wmap]`; everywhere else the page scrolls. Case L138 (red before: the wheel on another
  element is swallowed); L96 and L123 (the wheel on the map, plain or with Ctrl) stay green. Help ×4.
- **14 Nov 2026 — SOG-0352, the NAT tracks leave the screen at the rhythm of the cycle** (the user: « les nats c'est comme la météo, ça se fait tous les jours, pas tous les mois » — the reminder is the line of the Route step of Fuel, Features SOG c762f8e26).
  Two places held them: the block « À faire ce mois-ci » (the launcher's `nat` dataset with « Reprendre les routes NAT ») and the line of « Quand ça change » (`natOpen`: validity read AND `natEnsure` called when the fold opens, with its
  busy card and its « reprise à la fin » sentence). Now: (1) `datasetsOf` (`model_countries.js`) drops `nat`: never « à faire », never « fait », never counted in « n faits sur m » nor planned by « Tout mettre à jour »;
  the weather fold no longer names it; its gesture, gate and texts (`actNat`, `natValid`, `natExpired`, `natDeferred`) are gone. (2) The line of « Quand ça change » stays as INFORMATION: the validity read by `natRead` (aerodb.natState,
  nothing asked to the network), the number of tracks and where they are read (« se lisent à l'étape Route d'un vol transatlantique »); no `natEnsure` from here, no button, no busy card, no retake sentence (`refreshing`,
  `refreshed`, `failed` gone). Cases L94, L98, L116, L117, L120, L121 adapted (L94, L98, L116, L120, L121 red before); L105 (the busy card at the NAT line) retired with its feature. Help ×4, SPEC.
- **14 Nov 2026 — SOG-0358, the sheet says the size alert of the builder** (the ergonomist, 14 Nov 13 h 12, after audit 214; AeroDB 19e48c4c9). `base/build` answers `big: [{ file, bytes, cap, message }]`, `readCap` and
  `zones[zone].big`: every published file above half of the frame's read cap (32 MiB). The journal of the launcher (`base/last`, K191) keeps that result, so `bigOf(last, zone)` (`model_thread.js`) reads it from there: the most recent
  build (`base/build` or `base/update`) that mentions the zone decides, so a later build without `big` removes the line; at most 5 rows, the sentence bounded to 300 characters, the name to 120, numbers checked, a row without a
  readable sentence dropped. The sheet (`zoneop.js` `bigHtml`, after the thread) shows ONE calm line (`f-muted`, `data-sheet-big`) per file, the sentence of the launcher AS IT IS and escaped (text only), no button, no link, no alert dot, and
  the tone of the country on the map and in its group does not change. Nothing when `big` is empty or absent. Case L139 (red before: no line; the markup of the sentence stays text; an empty `big`; a build without `big` clears it after a
  reload; hostile values bounded). Not done: the page's own publication path (`SiaBase.publish`: AeroDB's note says it is not covered by the builder).
- **16 Nov 2026 — SOG-0370, the sheet of a country says ONE step; an ocean zone has a short sheet** (the user's capture of Portugal and of the North Atlantic; the ergonomist's sentences of 16 Nov 9 h 14). Survey first (sent to the ergonomist): the badge, the STATE cell and BUILT were three copies of `status.zones.pt.state = stale`, whose real reason is `pickup-waiting` (not buildable, base_state.py): `waitingFileOf(id)` (status.js) now gives the step that blocks, `TX.zst.waiting` « Un fichier à prendre » is written by the badge and the STATE cell; BUILT of such a zone is « ✓ <date> · édition précédente » (`TX.cw.builtPrevEdition`, or `builtPrevCycle` for a source with an AIRAC cycle; `M.EDITION_SOURCES` = `navpt`, the same list as `aero_cycles.EDITION_SOURCES`) and the « cycle » is not written for an edition source; PUBLISHED reads `z.publish` whatever the state (« sans objet » only for a zone never built); the download tick of a source whose next edition waits is ONE phrase (« édition prise le … · une plus récente attend dans Téléchargements »). `seenNamesOf` (the names of the files seen: the cycle list and the `pickup-waiting` zip) feeds `handSeen`, the inventory and `renameOf`; for a source taken by content (`fetch.pick` of the catalogue) « vu » = a file is there and the line says « vu : « <name> » » (escaped), so « manquant » never sits beside « un fichier attend ». THE BUG: `pickupSplit` (model_results.js) called « blocked » every entry whose source is not in `PICKUP_DEST` (sia, nats, lfv) and the page wrote « renommez … sans espace ni accent » (`blocked` is made by the PAGE, not by the launcher), although the name rule accepts spaces. `PICKUP_BY_CONTENT = ['navpt']` (model_sets.js): such an entry is ready, its zone is run, and NO zip is put in `zips` (`check_pickup` of the launcher answers 400 for a source outside its table: adding `navpt` to `PICKUP_DEST` would have broken the real taking). `M.pickupNameOk` is the name rule; `renameOf` (countries.js) says « renommez… » only for a source of sets whose every seen name the rule refuses; the line then replaces the button (`data-hand-rename`). A zone that is no country (`offCountry(id)`: every source the catalogue gives it is outside the group `base`; the NAT source sits in `weather`): short sheet — « Mettre à jour cette zone » / « Retirer cette zone », the sources listed (catalogue and cycle view) each with the age of what is read (the NAT validity: `natAge` in later.js, read on opening the sheet by `readNatFor`; `data-off-age`) and « copie publiée du … », no BUILT / PUBLISHED, no « Procédures », no top line, and `tone()` gives « non lu » without a state of the launcher instead of falling back on the publication (« ✓ à jour » from the publication alone). An inert button is never the primary one (`updateBlockHtml`). Cases: L140 (the plan; red before: Portugal blocked, a zip sent for it), L141 (the sheet of Portugal in four languages; red before: « À reconstruire », « (à faire) », « sans objet », « manquant »), L142 (the ocean zone; red before: « à jour », « aucune source », primary grey button); L132 adapted (the line says the newer EDITION). Not done: the name `EAIP ISO.zip` stays in the catalogue as the file to fetch; the tick « Téléchargé » of a hand source other than Portugal is unchanged.
- **16 Nov 2026 (9 h 42) — SOG-0370, five retouches of the ergonomist.** (1) The DOWNLOADED cell of a source whose file is SEEN says « (à prendre) » (`TX.zx.twTake`, 4th argument of `tickHtml`), not « (à faire) ». (2) « 1 vu » with no « · 0 manque »: a zero is not written. (3) The tile of a country in its group says the step in short (« un fichier à prendre », `TX.zst.waitingShort`), same tone. (4) A zone that is no country says in its badge and its STATE what it READS (`natStateWord`, later.js: « routes du 16/11, valides jusqu'à 19:00Z » / « routes du 14/11 : périmées » / « routes pas lues », the tone ok / warn), never « état non lu »; the map and the groups keep « non lu » without a state of the launcher. (5) The button of the NAT zone is named after what it does (« Lire les routes NAT du jour », `TX.cwb.updateNat`; the gesture is still `base/update` of the zone: the launcher downloads the tracks), with no « Ce que fait ce bouton » line; the group counts « 1 zone » when all its known members are no country. « Procédures : non » (answer to the ergonomist): `data-sheet-proc` says whether the procedures set of the suite (SID, STAR, approaches, read at the Procedures group) holds procedures for this country; « non » = none published for it yet.
- **16 Nov 2026 — SOG-0368, the card of a source whose taking failed** (the user's capture of Iceland; AeroDB 94b18b2b4). The catalogue gives Avians `fetch.pick`, so the card is already a hand source (« Choisir le fichier… », steps, the link of the page). Added on the page: `fetchFailHtml` (countries.js) under the DOWNLOADED cell — the reason of the launcher (`failedLine` + `sourcesWhy`), the detail the launcher gives (`message`: the address tried, `pages` { read, of, missing }: « 29 pages lues sur 31 », `stopped`: the host's sentence) and the link to the source; everything is TEXT (`esc`), bounded to 240 characters and stripped of control characters by `failDetail` (model_results.js), read for the live `base/fetch` and for the journal of the launcher (`M.fetchFailOf`, model_thread.js: the most recent taking that mentions the zone; a later success clears it). A file deposited by hand has no edition: `base/cycle` `download.datedBy: 'file'` + `deposited` (`itemOf`) makes the tick say « déposé le …, édition non connue » (neutral, `TX.zx.twDeposit`), the card amber, and `stepsState` count the download « to do » — never « fait » nor « à jour ». Case L143 (hostile markup and a control character in the message stay text; red before: no card line, a green « fait »). Not done / waiting for AeroDB: `message`, `pages` and `stopped` are not yet copied into the entry of `base/fetch` (base_sources.py `_fetch_source` copies only edition, from, datedBy, future, older_than_cycle, skipped, refused, deposited) — asked through the ergonomist; `datedBy` / `deposited` on the item of the cycle list likewise. Until then the card shows what the launcher already says (the code of the failure, the link, the hand deposit).
- **16 Nov 2026 — SOG-0369, page part: a secondary source never alerts; contents, not sources, are judged** (the user: « toujours du rouge sur OpenAIP », « DIRCAM pas à jour »; AeroDB bba9390ae). Survey (16 Nov 8 h 31): no red by rule — the brown « en retard » came from `base/cycle` comparing the date of the FILE of a source with no cycle to the start of the AIRAC cycle. Now `itemOf` reads `rank` (primary | secondary), `rhythm` (airac | editions | daily | none), `content` (closed vocabulary `CONTENTS`) and `download.ageDays`, and `zoneViewOf` the state PER CONTENT (`zoneView.contents`: done | late | waiting | unavailable | missing | secondary-only, with `by` and `secondary`); everything bounded, nothing else read. Page rules: a SECONDARY source is a DONE line of « À faire ce mois-ci » whatever its state (`todoOf`), its tick is « ✓ date · 40 jours » in neutral (`downloadTick`; `todo.js` `downloadStep` never says « en retard » for it), its card is calm (`data-src-tone`: ok, or muted when nothing was taken) — also for an old launcher that still says `late` (L144: red before `todo kind: 'late'`); the sheet of a country writes ONLY the contents that are not up to date (`contentsHtml`): « espaces : openAIP seulement, du 16/11 » when no primary gives it, « points : en retard (NATS) » otherwise; an up-to-date or unknown content is not written. Not done here: the two places of one content (DIRCAM: the DIRCAM site or the CD DIRCAM of the SIA site) belong to the steps of the catalogue (AeroDB / ergonomist); the rhythm `editions` of NAV Portugal (« édition du 1er oct., en vigueur ») waits for `edition` on the sheet; no « exemption » for Portugal (refused by the ergonomist).
- **16 Nov 2026 (9 h 56) — SOG-0368, retouches of the ergonomist: the WHOLE sheet says one thing.** The card was right but the sheet around it said « ✓ à jour » and « Rien à faire » above a failed taking. (A) `takingStepOf` (countries.js) gives the step of the TAKING for the country — `fetch-failed` (last taking failed, country not up to date: badge, STATE and line « {source} : la prise sur le site a échoué. Réessayez, ou déposez les pages à la main. », red), `edition-unknown` (up to date on a hand deposit, `datedBy: file`: amber « Édition non connue », BUILT « ✓ le … · sur un dépôt du 16/11, édition non connue », line says it) or `kept` (up to date from an EARLIER taking, the last failed: « Ce pays reste à jour (construit le …) ; la dernière prise a échoué, rien n'a changé. »; the badge stays green: it is true); it replaces « Rien à faire » and ignores the gate. Cases L145, L146, L147 (red before: « à faire / Jamais construite », « à jour / À jour », line `fresh`). (B) Avians is NOT « à prendre à la main »: the field **`handMode`** of the line of the cycle (`base/cycle`, AeroDB 4a7664621: `only` | `fallback` | `none`; read by `itemOf`, used by `regimeOf`) makes it `auto` when `fallback` with « Prise par le lanceur — dépôt à la main possible si elle échoue. »; its hand part (why, inventory, « Choisir le fichier… ») opens only after a failure or while no taking succeeded (`handUi`). The cases give `handMode: 'fallback'` to the Avians line. (C) The failure is said once: the « Dernière opération » block keeps « ✗ téléchargé : … » and « Réessayer », the « Arrêté à l'étape … » bilan is gone for a failed step (L99, L103 adapted: no bilan, retry still there).
- **16 Nov 2026 (10 h 19) — SOG-0368 / SOG-0369, four more retouches.** (1) A country NEVER built writes nothing about « une construction précédente » (`buildFact`). (2) On a country built from a hand deposit « Mettre à jour ce pays » stays ACTIVE (`data-retake="1"`; `zoneUpdate(zone, { retake })` adds the download step although the plan says up to date: the gesture to retake from the site and get a real edition); its reason line stays (`depositReason`). (3) PUBLISHED older than the build shown (`z.publish.at` < `z.builtAt`): « le 30/10 · avant cette construction », neutral, not green (`publishFact`; same rule wherever the cell is drawn). (4) The top line names the hand files that WAIT (`needs`: a hand source whose download is late or missing and of which nothing is seen) — « NATS : 3 fichiers du cycle en vigueur à prendre à la main, puis « Prendre le fichier téléchargé » », never « Rien à déposer » above them. Also: the badge says the word of the STATE cell for stale / never-built (« À reconstruire », « Jamais construite »), the tile of a country in its group says the step in short (`tileWord`: « un fichier à prendre », « à reconstruire », « jamais construit »). Test jeu d'essai corrected: each country's reason names its OWN source (the United Kingdom sheet said « Source SIA France »: only the fixture, the page writes the source the launcher names); openAIP has `handMode: fallback` in L144. L144 / L145 / L146 / L148 red before.
- **16 Nov 2026 (10 h 31) — « Des fichiers à prendre ».** The state exists as such at the launcher: a hand source with no file of the cycle in force makes the country `stale` with the reason `source-old` (or `source-missing`), NOT buildable (base_state.py: `BUILDABLE` excludes them) — the earlier fixture mixed it with `source-newer`. `needsFileOf` (status.js: first reason `pickup-waiting` | `source-old` | `source-missing`) names the step that blocks: badge, STATE and tile say « Des fichiers à prendre » / « fichiers à prendre » (`pickup-waiting` keeps « Un fichier à prendre »: a file IS seen), BUILT is « ✓ date · cycle précédent ». L144 on the real reason (red before « À reconstruire »).
- **16 Nov 2026 (14 h 44) — SOG-0378: a click is never a drag, outside the map the page captures nothing.** `mapOf` (mapview.js) falls back to the FIRST map when the target is not in one (that is for the buttons « + » / « − »), and `mapDown` used it: every press anywhere in the page started a gesture on the map — a drag over the text moved the map, Shift + press drew a selection rectangle and was prevented (no selection of the text), two fingers pinched the map. `mapDown` now starts nothing unless the press is IN the map (`closest('[data-wmap]')`). A mouse whose release was never seen (it left the page while pressed) left the gesture alive: its next movements, no button pressed, dragged the map — a mouse press now replaces the previous one (`pts.clear()`) and a mouse movement with no button pressed ends the gesture. Case L149 (red before: mouse drag on the text moved the map; with the buttons guard off: the view moves with no button pressed), mouse and finger; L96 and L113 still green. SOG-0368, the card of a failure: when the launcher gives its sentence (`message`) the title is « Le téléchargement de cette source a échoué » (`cwb.failedBare`) and nothing else — the sentence says the reason; « fichier illisible » stays only without a sentence (L143 red before: « … : Avians (eAIP d’Islande) : fichier illisible »; L150 without sentence). The « Dernière opération de ce pays » block (journal) still writes its own « ✗ téléchargé : Avians … : fichier illisible » line: not the card, left as it is, noted to the ergonomist.
- **16 Nov 2026 (15 h) — SOG-0368, two retouches of the ergonomist.** (a) The « Dernière opération de ce pays » line (`whyOf`, zoneop.js) and the failed block of the sheet follow the card's rule: when the launcher gave its sentence (`message`) `sourcesWhy` is told (`sentence`) and writes « Avians (eAIP d'Islande) : a échoué » (`fetchError.failed`), never « fichier illisible »; without a sentence the code's reason stays (L143, L150; red before). (b) The TILE of a country in its group said « ✓ à jour » (green) above a sheet saying « Édition non connue » (amber): the tone came from the launcher's status alone. `depositOnly(id)` (countries.js) says that the OPEN country is up to date on a hand deposit (`takingStepOf` → `edition-unknown`, from the cycle list read for its sheet); `tone(id)` then returns `warn` (tile, group counts and map follow) and `tileWord` says « édition non connue » (L146, red before). Limit, by design of the launcher: the cycle list is read country by country, so only the OPEN country knows it; the other countries stay as the status says until `base/status` gives `datedBy` per zone (a request to AeroDB through the ergonomist).
- **16 Nov 2026 (15 h) — SOG-0376: the state of the PDF libraries, said in Données (verb `pdf/status`, AeroDB 52bef1144, read only).** One line « Lecture des PDF » under the cycle line of the head (`pdfLibsHtml`, setstate.js; the state is read once at the opening with the other state verbs: `SET_STATE_VERBS.pdf`, `pdfOf` in model_setstate.js). `ready.text && ready.vectors` → « prête »; otherwise the package(s) of the `pdf` GROUP that are not `ok` (3 at most: « pypdf 6.21.3, il faut 6.21.4 au moins », « pypdf manque », « trop récente ») then « lancez <script>, dans le dossier de la suite, puis relancez le lanceur » — `script` is the NAME the launcher gives (never `command`, no pip command anywhere). `error: 'bounds'` (the bounds file is refused) says nothing is ready and never « prête ». The `ocr` group is NOT required: half a grey line, never an alert. Everything the launcher says (names, versions, script) is bounded by a CLOSED form in the model (a text outside it is dropped; the line then names both scripts) and written with `esc` into text nodes, never an attribute (L155, red without the closed form: `<b>evil</b>` on the screen). The sentence « pypdf manque — l'assistant de première installation l'installe » (`vfrSum.noPypdf`) was false — nothing installs it: it names the two scripts and the link to `premier_lancement.html` is gone (L17). New cases L151–L155. The line is redrawn when the read arrives (`redrawPdfLibs`: `renderBuild` redraws the panels, not the head). Without the verb (an older launcher) no line is written.
- **16 Nov 2026 (15 h 40) — SOG-0376, three retouches of the ergonomist.** (1) A GOOD state is silent: when `ready.text && ready.vectors` there is NO line (« Lecture des PDF : prête » in the head all the time was noise, above all on a phone); the line exists only when there is something to do. (2) The optional OCR group is not in the head, whatever its state (the script offers it, the gesture that needs it says so): the half-line and its texts are gone. (3) A refused bounds file is NAMED, a pilot does not know « le fichier des bornes »: « le fichier tools/requirements-optional.txt de la suite a été modifié et n'est plus lisible — remettez celui de la suite (une mise à jour le remet), puis relancez le lanceur ». L151 is now « ready: no line » (red before: [1, 1, 3] lines), L154 asserts the file name.
- **16 Nov 2026 (16 h) — SOG-0368, the limit of b740841c9 falls.** AeroDB 1e8ac887f: `base/status` gives per zone `datedBy: 'file'` and `deposited` (AAAA-MM-JJ) when the country is built on a hand deposit. `zoneStateOf` (model_status.js) reads both (bounded: `datedBy` only `'file'`, `deposited` a day); `depositOnly(id)` (countries.js) says yes from the STATUS, without the cycle list of an open sheet (it stays as the fallback for an older launcher). So the tile « ! édition non connue » (amber), the counters of its group and the map are right for EVERY country of the list, with no sheet open. L156 (red before: tile `ok`, map `ok`).
- **16 Nov 2026 (16 h 30) — SOG-0376, the line with several libraries at fault.** The user's capture (design Metro, 15 h 57) showed the amber line with three libraries at fault cut on the right before the name of the script. The cause is the WORDING, not the CSS: the line wraps in every design (checked: L157 measures at 740 points, in the five designs, that the text stays in its box and in the window, and with a sentence three times longer); the capture was a crop of a wider window, but a 190-character sentence is unreadable anyway. With more than one package at fault the line says it short: « 3 bibliothèques à installer ou à mettre à jour (pypdf, pdfplumber, Pillow) — lancez installer_bibliotheques.cmd, … » (`pdfl.several`); with one, the sentence naming its version stays. L157 (red before: the long sentence).

- **17 Nov 2026 — the world synoptic build: found again by the page, read steps kept by the launcher (SOG-0429)**: measured — the loop lives in the launcher (`tools/regen/weather.py` runs `tools/build_world_weather.py`: 25 forecast times read one after the other from NOMADS, a 1 s pause each, 900 s at most; « environ 2 minutes »), the page only follows; leaving the page does not stop the job (the client detaches, never cancels) but `world.js` never found it again (only `status` was read, the start was refused as « busy », no progress, no end); and the tool held the 25 steps in memory and wrote them at the end, so a failure, the 900 s limit, a cancel or a closed launcher lost every step already read (a `.world-*` folder could be left). Decision (the ergonomist's rule: a long job belongs to the launcher, the page finds it, what is downloaded is kept, the job resumes where it was and says so): (1) the page finds the job at the mount (`follow.js` → `worldView`/`worldEnd`); (2) the tool keeps each step when read in `data/local/weather_work/run-<run>-<step>/` (`--work`), reads them back validated as untrusted input, prints `@reprise k/n` (ASCII: a Windows pipe is not UTF-8), the job logs « reprise : k échéances sur n déjà là » and returns `resumed`/`of`; (3) publishing removes the kept folder, a new run removes the old one, stale `.world-*` folders are removed, status says `partial`; (4) a data/local that is a link is refused; no network access more (less). What a phone sees: the world layer of the Atmosphere map reads the published pages through the data layer; `frame/lib/weather_store.js` reads the pages from the origin of the page (`<root>/weather/world/`, else `<root>/data/weather/world/`), index kept 6 h on the device: a phone paired to the workstation loads the app from the launcher, so it reads `data/weather/world/` there — the LAST build made on the workstation, never built on the phone, and only while the launcher answers; a phone far from the workstation, on the site, reads the copy the site's workflow publishes (every 6 h), with the index kept 6 h in its cache; it never asks anything of Open-Meteo for the world layer. Not done: « Arrêter » is unchanged (a gesture of the user). L50, A256, I46, I47.

- **17 Nov 2026 — one truth per State for the procedures (SOG-0428)**: measured on the user's real data (read-only call of the launcher's verbs): `proc/status` said LF `missing` / `not-built` (14 files in the eAIP cache, no cycle folder holding an LF aerodrome), `base/cycle`'s `procedures` row said `up-to-date` (the newest cycle folder is the current one — the US CIFP, 3 069), `coverageByState` counted `held` 14 (the aerodromes read by hand in `data/proc/manual/index.json`, all of the cycle in force), and the map of the States took its tone from the single published proc cycle (`pub.proc.inForce`): four readings, four answers. Decision (the ergonomist, 17 Nov): the record of each State of `proc/status`, extended with `held`, is the single truth; a State that has only hand-read aerodromes, current, is up to date (nothing is expected of the user) and the line says what is not built; to do = stale (a built cycle in the past, or hand-read aerodromes of a past cycle: `held-older`) or downloaded and not built, and then the State is ticked. `tools/regen/proc.py` `state_records` carries it; `base/cycle`'s `procedures` row is derived from it; the page reads it for the line, the list and the map, with the NAME of the State (`bulkName`, the one table of names). Names stay on the page (four languages, one table), the launcher says prefixes. « En échec » (a failed build) is not a state of a State: `base/last` keeps the failures — not read here. Partial State on the map without a sixth colour (the ergonomist chose, on a capture, option C, with an exception for `maps/lib/map_base.js`, BUGS SOG's file, as its own commit): a State read by hand and current keeps the green of « up to date » but is HATCHED (`partial` property of the feature; a fill-pattern layer over the same source, an 8 px stripe image in the `ok` tone, redone when the design changes the tone; the fill is almost clear so that the stripes carry it); the legend says « à jour, lu à la main seulement » and `data-partial` lists the States (« LF ») for readers without the canvas. A257, I48, L131.

- **18 Nov 2026 — the local X-Plane folder, set once from the personal-use block (Q-0108, choice A of Sécurisation; route `__setup/xplane`, `xplane.js`)**: one line « X-Plane (personnel, local) » under the list of personal sources (`xplaneRowHtml`, called by `choiceHtml`): a field « Dossier d'X-Plane » (260 signs at most, `autocomplete="off"`), « Enregistrer » (and « Effacer » once a folder is configured), and a state line in a NEUTRAL tone (`f-muted`; « Non configuré » when `configured` is false, « Enregistré — X-Plane, cycle 2610 », « Dossier introuvable », « Ce n'est pas un dossier X-Plane », « Dossier illisible »: states read by the GET, not failures of a gesture; nothing for `configured` with no state). It is drawn ONLY when the personal-use box is ticked (`S.certified`) AND the launcher answers `GET __setup/xplane` with `ok: true` (a 404, a 403, an older launcher, a paired device: no line, nothing said). The contract (AeroDB, final): GET → `{ ok, configured, state: 'ok' | 'missing' | 'not-xplane' | 'unreadable' | null, cycle: 'AAMM' | null, zones: n | null }` (recomputed at each GET); POST `{ path }` (strict body, 260 signs at most) → 200 `{ ok: true, configured, state, cycle }` or 400 `{ ok: false, reason }`, `reason` ∈ `bad-body`, `too-long`, `refused`, `not-a-folder`, `not-xplane`, `not-personal`; `{ path: '' }` clears. **The rule: the path is written NOWHERE on the page side.** The LAUNCHER controls the path, the page controls only its length. The field is emptied before the answer (`sendPath`: the path lives in that function for the time of the call, nothing keeps it); never in a `value` attribute, a `data-*`, a `title`, the page's storage or a console message; **a failure is a floating notification, never a box in the page** (the user's rule on warnings): `S.ctx.notify(tt(sentence), 'err')` with one of the closed sentences of `TX.xp.reason` (a `reason` outside the list is said as `refused`, an unreadable answer or an exception as « Demande refusée », an over-long path as « Chemin trop long » without any call; never the error's text, never the path), and no duplicate in the page (no message element); a success writes nothing more, the state line — read again by the GET — is what changes. What the field holds while the panel is redrawn is carried over by `redrawPanel` for that draw only. The model is `xplaneOf` / `xplaneReason` in `model_setstate.js` (pure, bounded: states and codes from a closed list, cycle `/^\d{4}$/`, zones an integer 0..100000 — the count is never shown). The read (`wantXplane`, with the state reads of `setstate.js`; again after each « Enregistrer » / « Effacer » and each change of the box) never runs during an operation (`busyNow()`: it stays « to read », `setStatesIdle` takes it again), never throws, and reads nothing without the box. New cases L158 (the line only with the box and an answering launcher, the states said, the captures), L159 (SECURITY, red without the guard: strict body, field emptied, a sentinel path on no surface of the page — text, attributes, storage, IndexedDB, console, notifications —, every refusal by its closed sentence in a notification, 261 signs never leave, « Effacer » posts an empty path), L160 (a hostile GET is bounded to nothing). Help: a paragraph in the personal-sources chapter, four languages. Remaining: the button « Lire le réseau X-Plane » (verb `xplane/build`, AeroDB) comes when the verb is pushed.

- **18 Nov 2026 — the X-Plane network is read by « Enregistrer » and re-read by « Mettre à jour », no separate button (decision of the ergonomist; verb `xplane/build`, AeroDB; `xplane.js`, `model_setstate.js`, `update.js`)**: the line « X-Plane (personnel, local) » has no button « Lire le réseau X-Plane ». A successful « Enregistrer » starts the job `{ set: 'xplane', verb: 'build', args: {} }` at once (`startXpBuild`, through the screen's `serial` queue — the launcher holds one job at a time; no panel of the sets: `xplane` is not in `SETS`). « Mettre à jour » asks for it again at its end (`xplaneAfterUpdate`: after the normal end of its build — never after a stop or an interruption — with the personal-use box ticked only) when the folder is configured, in state `ok`, its cycle known, and the network built is not of that cycle: `built !== cycle` when the GET says `built` (`'2610'` or null; AeroDB may add it, not confirmed), else `zones === null` (`xplaneStale`, pure; `xplaneOf` keeps `built` only in its valid shape). The failure of that reading never changes the verdict of « Mettre à jour » (its sentence and its journal entry stay; the X-Plane line says the failure alone). Nothing is started when `regen/verbs` does not list `xplane/build` (an older launcher): the line says nothing more. The reading is an operation: `busyNow()` is true while it runs (buttons and panels grey, nothing else starts) and a reading asked during another operation is `waiting` — `setStatesIdle` starts it when the screen is free; one at a time. State `S.xp.build = { state: idle | waiting | running | ok | fail, cycle, segs, reason }`. The line says « Lecture du réseau X-Plane… », « Réseau lu — cycle 2610, 12 tronçons » (the sum of `counts[zone].airways`: at most 100 keys of `/^[a-z0-9_-]{2,12}$/`, each an integer 0..1e7 else 0; the cycle four digits or none) or ONE closed sentence per code of the contract (`not-personal`, `not-configured`, `missing`, `not-xplane`, `refused`, `unreadable`, `too-big`, `nothing`, `no-zones`; any other code is `refused`); a failure is also a floating notification (`warn`), never a box in the page, and a success says nothing more than the line. Never a text of the launcher, never the path (nothing new is written anywhere). « Effacer » and a new « Enregistrer » forget what the previous reading said; unticking the box clears a finished reading with the line. Cases L161 (the job, exactly once, `args {}`, the line in four languages, captures; a reading asked during another operation waits then starts), L162 (the rule: `built` / no `built` / `zones` null / folder not ok / no box / a failure that leaves the verdict alone; a real update then the reading), L163 (SECURITY: the nine codes, an unknown code, hostile bodies, bounded segments, no verb no job). **A choice of mine, to confirm**: the reading is also asked when « Mettre à jour » finds nothing to rebuild (a new X-Plane installation changes the cycle of the folder without touching the base); the brief said « after the end of the build ». Help: the personal-sources paragraph, four languages.

- **18 Nov 2026 — the coverage table sorts through the common block `frame/lib/sortlist.js` (SOG-0498; the user, Q-0115 / Q-0116; `covtable.js`)**: the headings are the block's (`headHtml`: a 44 px button per column, `aria-sort`), the bar is the block's (`barHtml`: « Trier : … » in a pane of 700 px or less, « Remettre l'ordre » at both widths, hidden at the default), the order is `sortRows`, the gestures are `bind` (put once on the body of the screen, so that a redraw of the block or of the whole screen never undoes them); **the table keeps its rows** (one `<tr>` per country, the unfold, « Relire », one detail function `detailBody` shared by the table and the list). Columns: the country (text, its name in the language) then the six of `COV_COLS` (number, `emptyLast`); **the default order is explicit: the country, ascending** (as before). **A count of 0 (« non ») is a known value, not an empty one: it sorts as the number 0** (ascending puts the « non » first, as before, which finds what a country lacks; the « empty last in both directions » rule of the block is for the unknown — null, absent — and the coverage contract has no unknown in a count; the relay's ruling, 18 Nov). The order is **kept on the device**: `cache/sort/coverage.json` (`{ key, dir }`, policy `cache`, declared in `meta.writes` beside `cache/data/`), read once at the mount (`initCovSort`, kept in `S.covSort`: it survives the closing of the block, which drops the rows, and the re-reading); the default order is written only when it comes back by « Remettre l'ordre » (the file then says it), never at the opening; the file is an untrusted input (`stateOf`: own `key` naming a column, `dir` asc | desc, else the default; cases L164–L168). **On a phone** (container of 700 px or less) the wide table is hidden (`.f-sortwide` on `.d-covscroll`) and a list is shown (`.f-sortnarrow`): one line per country in the same order, the name an unfold button (same `data-cov-row`, same gesture) and the six numbers with their short label; no sideways scroll. The unfolded countries stay unfolded through a sort (only the rows are redrawn, with `keepScroll`; the header and the bar follow in place by `refresh`). **Removed**: the `[data-cov-sort]` handler of `covClick`, `head()` of `tableHtml`, `S.cov.sort`, `sortCoverage` of `model_coverage.js` (nothing else used it), the CSS of the old sort buttons (`.d-covtab thead button`, the `::after` arrows, the 480 px media rule that shrank the seven columns: the table is no longer drawn there). The text of the introduction and the help (four languages) say the new gestures.
- **19 Nov 2026 — Données goes through the common fold, first round (SOG-0468 (3); `frame/lib/fold.js`, `frame/INTEGRATION.md` § 12f)**: the `<details>` of the screen that keep a state or run an effect (thirteen builders) are built by `fold()` (`screen.js`: the five groups `f-group d-fold`, `d-bdetail`, `d-journal`; `panels.js`: `d-moreverbs`, `d-mycov`; `packs.js`: `d-pack-countries`, the theme `d-pack`, `d-packs-fold`; `later.js`: the five `d-lc`; `todo.js`: `d-todo`, in its two states, through one local `wrap`; `covtable.js`; `inventory.js`), each keeping its class and its own `data-` attribute (passed by `attrs`: the cases select them) and gaining `data-fold` only. **The keys** (unique on the screen): `group:<id>`, `journal`, `bdetail`, `moreverbs`, `packs`, `mycov`, `todo`, `lc:<id>`, `pack:<id>` (a theme), `packfold:<key>` (the « Pays » fold of a region, `<key>` being `c:<pack>`: the entry of `S.packOpen` is the same as before, the prefix is only the kind), `covtable`, `inventory`. **`onToggle` is replaced by `wireFolds(S.body, onFold)`**: `onFold` cuts the key at its first `:` and runs the effect of that kind from the table `FOLD_EFFECT` (the same assignments, the same `toggleLc`, `openCovTable` / `closeCovTable`, `openInventory` / `S.inventory = null`, `S.cw.todoOpen` only with `S.cw`), then, when the fold opens, `attachMaps(el)`. The returned `off()` is pushed on `S.stops`, so the listener is now removed at the unmount (it was not before: the body was dropped). **No `get`**: it is all or nothing for a listener, and the effects of the coverage table, the inventory and « Quand ça change » must run at each toggle as before (the assignments are idempotent, the reads are guarded by their own state). **`attachMaps` is kept for the folds that open and is exact**: a zone map (`[data-zone-map]`) is drawn only by `zoneMapHtml`, which only the panels of the groups call, so only a group can hold one; the folds without a key never held one, and their former call of `attachMaps` on opening was a no-op. **Stay by hand, no key** (no state, no effect in `onToggle`): the lines of the sets (`details.f-card[data-set]` of `screen.js`, `route.js`, `world.js`), the two `d-more` (« n autres ») and `d-todo-done` (« Déjà faits »: its state is kept by the click on its summary, `toggleDone`, not by the toggle event). **Differences in the text drawn**, all without effect on the DOM that the cases or the CSS read: the whitespace between `<details>` and `<summary>` of a theme is gone (`fold()` writes them joined); in `d-todo` (ready, reading in progress) `aria-busy` comes before `open` in the tag, the attribute order only; no value needing an escape is written differently (the module's `esc` and the fold's are the same function). The wrapper of each constructor was compared with the original text of the old template on hostile titles and on every open / closed state (a script of the session; case L169 holds the screen side: every fold of the list carries its key, opens and closes by hand, and does what it did). `meta.files` lists `frame/lib/fold.js` (case I26). `later.js`'s local `fold` and `screen.js`'s are kept (imported as `foldTag`); `focusStates`'s local `fold` became `grp`.
- **19 Nov 2026 — « Tout est à jour. » and « cycle dépassé » no longer contradict each other (SOG-0505; the ergonomist; `chain.js` `zonesLeft` / `chainBelowHtml`, `panels.js` `stateHeadHtml`, `texts.js` `staleDone`, case L170)**: the screen made two independent readings — the state per zone of the launcher (`updateScope`: every zone up to date, which gave « Tout est à jour. » in `stateHeadHtml`) and `S.attn.base`, the cycle PUBLISHED by the set (`staleGroups`, `screen.js`) — and said both, « Tout est à jour. » beside « Cycle 2610 dépassé : téléchargez les sources du cycle 2611, puis reconstruisez » (capture of L164/L169). When the zones are rebuilt at the cycle in force the advice to download and rebuild is wrong: what is left is to publish. **The rule**: zones at the cycle in force AND the published cycle behind → ONE line, `<p class="f-warn" data-stale="base" data-stale-publish>` with `TX.staleDone` (« Les zones sont au cycle {y}, la publication reste au cycle {x} : publiez la base »; the verb is the one of `TX.publish` and of the neighbouring « publiez » sentences, no new word, no `staleBy()` which speaks of sources; the advice to publish needs publishing to be possible: when `publishGate().reason === 'nothing'` (sync-status sees nothing to send) the former line stays, alone, and still no « Tout est à jour. ») and no `[data-all-fresh]` (the action of the update row is empty: the line below the button is the only message). **One predicate**: `zonesLeft(sc, plan)` of `chain.js` gives `{ lone, none, fresh }` — the condition that `stateHeadHtml` held inline (`sc.known && sc.n === 0 && !plan.runs.length`, and no zone left to the hand of the user), moved, not copied; `panels.js` reads `lone` and `none` from it, `chainBelowHtml` reads `zonesFresh()` (`fresh = none && !lone`). **What stays**: zones up to date and nothing behind → « Tout est à jour. » as before; zones NOT up to date (to rebuild, failed, waiting, unknown) and a published cycle behind → « Cycle X dépassé : téléchargez … puis reconstruisez » with `staleBy()` as before (also when only another set — procedures, VFR, aircraft — still has something to run: the chain button is there and ends with the publication); `S.attn.proc` (procedures) unchanged; the attention dot of the buttons (`attnDot`) unchanged. Cases: L170 (new: the coherent state, the stale-zone witness, the up-to-date witness; captures `L170_{width}_{lang}_{coherent,witness}.png`); L83 and L87 asserted « Tout est à jour. » on the default fixture, whose France is published one cycle behind, so for that step they now publish France at the cycle in force (`_FRESH_JS` with `sessionStorage.__freshFr`, removed right after) and keep their intention: nothing to do left, no button.
- **19 Nov 2026 — the one main action sits at the head of a country's sheet (SOG-0509; the user's report, decision of the relay; `countries.js` `sheetHtml` / `updateBlockHtml` / `handHtml`, case L171)**: « Mettre à jour ce pays » was white and at the very bottom of the sheet while « Prendre le fichier téléchargé » was blue and in view, yet the update is the real action: `zoneUpdate` (`zoneop.js`) takes the file seen in Downloads, downloads what is missing, then builds, with no question. **Now**: `updateBlockHtml(id, seenAny, step)` is always the primary button when it is live (the `primary` parameter is gone; grey, it has no class), and its block — the button with its `doLine`, or its progress `[data-running]` — is drawn ONCE, right under the state sentence (`d-now`), before the contents and the sources (the two former calls at the bottom are removed; the block itself is unchanged, only its place). **What « Prendre le fichier téléchargé » does more, and why it stays**: it first makes a dry plan of the pickup and asks one question that lists the files it will take (SOG-0197, `follow.js`), then takes THAT source alone and does not build; so it is the secondary gesture (white, in the source's card, with « Choisir un autre fichier… » as a link) — it does not disappear. The other states of `handHtml` (none, rename) are unchanged; no text changed. Cases: L171 (new: the button is in view without scrolling at 390 and 1280, primary and the first button of the sheet, one single `button.primary`, the pickup after it and white; witnesses: a country to update with no file seen, a country up to date); L89 (the seen-file country: « Mettre à jour » primary, the pickup no longer) and L102 (Portugal: the pickup keeps its card's full width, « Mettre à jour » is above the sources) follow the new order.
- **19 Nov 2026 — a rebuilt country no longer reads « Parseur ancien » while it waits to be published (SOG-0510; the user's report after an update — France and the United Kingdom still said « Parseur ancien »; decision of the relay; `model_screen.js` `rowOf` / `localFresh` / `pickState`, `screen.js` `groupsOf` / `refreshRows`, `model_status.js`, `texts.js` `TX.state.unpublished`, case L172)**: **The cause, measured**: the label of a row of the base compares the builders' constant (`AeroCatalogue.PARSER_VERSION`) with the `parserVersion` of the PUBLISHED zones (`publication()`); an update rebuilds on the workstation (the launcher then says the zone `up-to-date` with `parserVersion` = the constant) but nothing is published until « Publier », so the row kept saying the published base was old. **The rule**: when the flag `parser` would be true, if EVERY fed zone whose published version is old (`parserOld`, or the whole format) is `localFresh(env.local, zone, constant)` — the launcher's state for that zone exists, is `up-to-date`, and its `parserVersion` is a number at least the constant — the row reads the new state `unpublished` (level `warn`, right after `parser` in `STATE_ORDER` and in `pickState`, the same pill, attention and order as `parser`) and `parser` is false; otherwise `parser` as before. The word is `TX.state.unpublished`, the four words of the zone state « à publier » already on the screen (« À publier », « To publish », « Zu veröffentlichen », « Por publicar »): no new word. **What stays**: no `env.local` (the status is not read yet, an older launcher without `base/status`) or a zone without a read state → « Parseur ancien » as before; a local zone built with an older parser (`stale` + `parser-old`, or `parserVersion` below the constant) → « Parseur ancien »; a current published parser → « À jour ». **Plumbing**: `zoneStateOf` now reads the per-zone `parserVersion` of `base/status` (integer, bounded, null without), `screen.js` builds the groups through `groupsOf()` with `local: S.status?.zones`, and `status.js` calls `refreshRows()` when the status arrives or changes: the groups are recomputed and the screen is redrawn only if a row's state changed (the rows are not redrawn by `renderBuild`). No existing case changes: the new state exists only where a status says the zone is rebuilt.
