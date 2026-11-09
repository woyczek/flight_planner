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
