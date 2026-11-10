# Données screen: functional inventory (for a redesign from the specifications)

Read-only survey of `modules/data/` at the state of the `v3-settings` worktree (verified in the code, 11 Nov 2026). Sources: `SPEC.md` (cited `SPEC § n`; the SPEC has two sections numbered 5.11: « world » and « coverage table »), `DECISIONS.md` (cited by SOG number or dated bullet), `*.js`, `texts.js` (cited `TX.key`, fr text shortened; every text exists in fr/en/de/es), `tests/v3/cases/data.py` (cases `L1`…`L78`; `—` = no case found). « Launcher verb » = a job `regen/job { set, verb, args }` unless written otherwise. « Unverified » = not checked in a case or not checkable by reading.

## 1. What the screen is, and its blocks in screen order

« Données » is the module `modules/data/` (`meta.level 3`, not fixed: it scrolls like a page), the heart of the Maintenance application (`/frame/?app=maintenance`, `#data`; SPEC § 1, L3). On a workstation with a launcher the administrator regenerates the published data (aeronautical base per country zone, procedures, VAC points, aircraft types, weather synoptic, EUROCONTROL route workbooks): download, build, publish, purge; without a launcher it only shows what is published (all actions grey). Compiling is separate from using; the module only orders jobs (launcher), reads aerodb (`sources, publication, zones, coverageByState, packs`), writes its own `cache/data/{coverage,personal,journal,route}.json` through `ctx.data`, and publishes through the frame's `ctx.data.sync({gesture:true})`. One operation at a time (`busyNow`, state.js:45). Order of `renderBody` (screen.js:532-547):

1. Hidden file chooser `input[data-upload-input]` (SOG-0199).
2. **Head** `[data-data-head]`: AIRAC cycle in force, its dates, next cycle in n days, runner line (`data-runner="launcher|none"`); `data-error="catalogue"` line when the catalogue is unreadable (screen.js:307).
3. **Couverture** card `[data-coverage]`: zone names line, « Ajouter un pays » select, then « Procédures par État » (lines green/orange/red, max 7 then « n autres », legend).
4. **Tout mettre à jour** card `[data-update-all]`: stale-cycle warnings, primary button « Tout mettre à jour (n jeux) », grey reason, chain progress / end (chain.js).
5. **Four groups** `details.f-group[data-group=base|proc|aircraft|weather]` (open when a row needs attention; seven rows max, rest under « n autres jeux »):
   - **base** (Base aéronautique): (a) panel « Mettre à jour la base » `[data-build]`: zones map (+ Recentrer, rectangle hint), choice column = row « Seulement les périmés · Tout désélectionner », selection line, balance line, fold « Paquets de pays » (tabs Régions | Thèmes, region switches with fold « Pays (n) », themes, « Mettre à jour (n) » links), title « Zones de la couverture (n) » + note, zone list (box, state pill with reasons, per-zone actions), personal-licence block (« Je certifie… », source lines); verbs row = « Mettre à jour » (primary) + fold « Détail » (Télécharger, Prendre le fichier téléchargé, Tout recalculer, Purger); one grey reason; missing-source lines; run bar or last result. (b) panel « Publier la base » `[data-publish]`. (c) panel VFR points `[data-set-panel=vfr]` (cycle, 3 verbs). (d) catalogue rows (SIA, cities, MORA, openAIP, ENAIRE… as `<details data-set>`), then « n autres jeux ».
   - **proc** (Procédures): panel `[data-set-panel=proc]` (States ticked: LF, K; map; 3 verbs; EAD note), rows, **route row** « Route (RAD, points FRA) » (route.js), « n autres jeux ».
   - **aircraft** (Appareils): panel `[data-set-panel=aircraft]` (ICAO types field, 3 verbs), panel « Fiches publiées de la compagnie » `[data-set-panel=sheets]` (Publier), rows.
   - **weather** (Météo): rows (status only, « publié avec le site ») + **world row** « Synoptique monde (GFS) » (world.js).
6. **Couverture par pays** fold `[data-covtable]` (lazy read, 7 columns, sortable).
7. **Inventaire des données** fold `[data-inventory]` (lazy read, 7 places, « Ranger les sources brutes »).
8. **Journal** fold `[data-journal]` (last 50 operations).

Not on the screen although specified: the EAD line, « Relire »/« Retirer » aerodromes, per-row verb buttons, « Modifier » coverage fold, journal « Copier » (see Gaps).

Verbs of the launcher used: `regen/verbs`, `sync-status?fresh=1` (GET), `data/inventory` (GET), `base/{fetch,status,build,purge,pickup,coverage,move-sources}`, `POST base/upload`, `proc|vfr|aircraft/{fetch,build,purge}`, `aircraft/publish`, `weather/world {action}`, `route/import-rad`. Grey-reason keys (closed lists): `TX.greyReason` = `no-launcher, busy, no-zone, no-set, bad-codes, no-state, unknown-verb, offline`; `TX.pubReason` = `publishing, building, no-gesture, nothing` (+ greyReason's); chain gate = `no-launcher, busy, offline, no-set`; route/world gate = `no-launcher, busy, unknown-verb`; coverage table gate = `noLauncher, unknownVerb`; move gate = `noLauncher, unknownVerb, gateBusy`.

## 2. TABLE A: gestures

Common gate for the verbs of a set panel: `M.setGate` (model_sets.js:243): `no-launcher` > `busy` (`busyNow()`: run, other job, question open, publish, chain, route, world, update, upload, move) > `offline` > `no-zone`/`no-state` (nothing ticked) > `unknown-verb` (verb absent from `regen/verbs`; an old launcher knows only `base/fetch|build|purge`). The grey reason is written once under the buttons of the panel (`[data-reason]`). Choices (boxes, select, pack switches, field) are `disabled` while `frozen()` (run or chain) with no text.

| Gesture | Where | Precondition / grey reasons | What it does | Messages | Spec § | Cases |
|---|---|---|---|---|---|---|
| Open the screen | whole | none (read-only without launcher) | mount: reads `journal.json`, `regen/verbs`, aerodb (sources, publication, zones, coverageByState, packs), `coverage.json`, `personal.json`, `route.json`; `base/status` by runs of 60; `GET sync-status` (non blocking, `TX.pubReading`); `weather/world status`; resumes a running job (`follow`); first opening ticks all published zones and writes `coverage.json` once | `TX.chainReload` (warn) if a chain marker has no end | § 3, § 5.8 (SOG-0164), § 5.3 | L2, L4, L10, L13, L60 |
| Open via `#data?zone=<id>` | base | zone in coverage, else only said | opens base group, ticks that zone alone, scrolls to « Mettre à jour » | `TX.upd.zoneLink` (info) / `zoneLinkOut` (warn) | § 5.11 (SOG-0143) | L48 |
| Open via `#data?source=eurocontrol_rad` (or `route`) | proc / route row | none | opens proc group and the route row, scrolls to it once | none | § 5.7 | L35 |
| « Ajouter un pays » (select) | Couverture | `frozen()`; hidden if all zones known are in coverage or `zones()` missing | `addZones([id])`: coverage + selection, writes `cache/data/coverage.json`; nothing built | none | § 3 | L13, L2 |
| Tap a zone on the base map | base map | `frozen()` | in coverage: toggles its tick; outside coverage (grey): adds it to coverage ticked (never a purge); drag/pinch ticks nothing | none | § 5.5 map (SOG-0070) | L20, L30 |
| Pan / zoom / « Recentrer » | base & proc maps | map base loaded (MapLibre, lazy when within 400 px of screen); else list alone | `recenterMap(kind)`: re-frame the coverage | `TX.mapRecenter` | § 5.5 map | L20 |
| Shift+drag or two-finger hold 400 ms (rectangle) | base map | map shown; fingers < 14 px drift | counts live, at release ticks (adds to selection) the coverage zones whose box touches; never adds outside zones | count in corner (`TX.upd.rectHint` hint) | § 5.8 | L38, L39 |
| Tap a held-aerodrome point | proc map | zoom ≥ `COVER_ZOOM`; base without `pointsLayer` → none | says code, state, cycle in `[data-point-info]`; ticks nothing; read of the local base only | `TX.ptInfo`, `TX.ptInfoRead` | § 5.5 | L21, L22, L23 |
| Tick / untick a zone (list) | base list | `frozen()` | edits `S.ticked` (page state, never written); redraws | none | § 3 | L7, L15, L20, L52 |
| « Seulement les périmés » | base choice | no launcher or no `base/status` in verbs, or busy: grey (no reason text, see Gaps) | reads `base/status`, selection = zones not up to date and buildable | `TX.upd.noStatus` (err), `TX.upd.noStale` (ok) | § 5.8, § 5.9 | L37, L43 |
| « Tout désélectionner » | base choice | grey without launcher or while busy (no reason text) | `S.ticked = ∅` | none | § 5.8 | L37, A36 (frame.py) |
| Tap a balance number (« 3 à reconstruire ») | base choice | state known (`base/status` known) | filters the list; for `rebuild`/`failed` ticks those zones, scrolls to « Zones de la couverture », writes one line | `TX.balLine.*` | § 12 (SOG-0228), § 5.8 | L63, L76 |
| « Tout afficher » / same number again | base choice | filter active | list back to whole | `TX.balShowAll` | § 5.8 | L63, L76 |
| Tap a zone state pill (reasons) | base list | pill is a button only if reasons exist (not up-to-date, not building) | opens/closes reasons (`S.whyOpen`); notices shown always | `TX.zr.*` | § 5.9 | L40, L48, L52 |
| Open/close « Paquets de pays » | base choice | `packs()` answered, else block absent | `S.packsOpen`, folded at opening | `TX.packs.title` | § 5.10 (SOG-0228) | L44, L76 |
| Tabs « Régions » / « Thèmes » | packs | both kinds present | `S.packTab` | `TX.packs.regions/themes` | § 5.10 (SOG-0165) | L44 |
| Region switch on / off | packs | `frozen()`; empty pack has no switch | on: `addZones(missing)`; off: ask then `removeZones` (coverage only, never purge) | ask `TX.packs.removeAsk`; ok `TX.packs.added/removed` | § 5.10 (SOG-0147) | L44, L53 |
| Tick a country in a pack fold / theme | packs | `frozen()` | tick: add that zone; untick: ask then remove from coverage | `TX.packs.removeAsk`, `removed` | § 5.10 (SOG-0165, 0186) | L44, L66 |
| Hover (mouse) / press (touch) a pack row | packs | none | lights the pack's zones on the map (tone accent) | none | § 5.10 | L53 |
| « Mettre à jour (n) » on a pack | packs | `updateGate(zones)` (verbs fetch+build known, `base/status` known, not busy) | same path as « Mettre à jour » on the pack's coverage countries; selection untouched | as « Mettre à jour » | § 5.8 (SOG-0188) | L68 |
| Box « Je certifie utiliser les données pour mon usage personnel » | base choice | `frozen()`; shown only if a ticked zone has a personal source | `S.certified`, writes `personal.json`, re-reads `base/status`; X-Plane never sent | `TX.certifyHint`, `TX.personalKept` | § 9 (SOG-0162), § 1 | L32 |
| « Mettre à jour » (base) | base verbs row (primary) | `updateGate`: fetch & build gates + `base/status` known | status first; fetch only the zones needing it (`runChunks` > 60); status again; ONE `ctx.ask` naming count, size, reasons; `base/build` on buildable zones; zones waiting for a file named and left out | plan info `planText`; ask `TX.upd.ask`; ok/err `TX.upd.none`, `noStatus`; end `TX.sumDone/…` | § 5.8 | L36, L41, L42, L65, L71, L72, L73, L75 |
| « Télécharger » (base) | base « Détail » fold | setGate | `base/fetch {zones, personal}` (runs of 60); no question; no commit | `TX.fetchSum*` (+ `fetchOutside`) | § 5.1, § 5.5 | L15, L7(zones/lines) |
| « Prendre le fichier téléchargé » | « Détail » fold; primary and in view if a manual cycle is missing (`miss`); also on a waiting zone line | setGate for verb `pickup` (`unknown-verb` on old launcher) | `base/pickup` dry (plan, `personal` always sent), ask with groups « Sera pris / Ignoré / À corriger », real run with `zips` shown; then builds the taken zones | ask `TX.pk.*`; `TX.pickupSum.*`, `pickupHint` | § 4.1, § 5.8 (SOG-0197, 0150) | L19, L28, L57, L58, L25 |
| « Relancer le plan » | base result | a zip changed since the plan | re-runs the dry plan on those zones | `TX.pickupChanged/NotShown` | § 5.5 | L19 |
| « Tout recalculer » | « Détail » fold | setGate | `base/build` on the whole selection (runs of 60), no new question | `TX.sumDone/Partial/Failed/…`; `TX.srcBlocking` | § 5.1, § 5.8 | L7, L10, L49, L64 |
| « Purger » (base and others) | « Détail » fold / flat row | setGate | dry plan first (`dry:true`), ONE ask with files and MB, then real purge; > 60 zones: one plan per run, ONE summed ask (`purgeChunks`); never commits | ask `TX.purgeAsk`/`purgeAskSet`; `TX.purgeDone…` | § 5.1, § 5.8 | L15, L17, L56 |
| « Arrêter » | running line of any panel | run phase `running` | aborts; waits for the real end of the job (`resume`) | `TX.stopping` | § 3 rules | L9, L7, L15, L17, L19 |
| « Réessayer » (failed zone) | zone line | zone state `failed`; grey when busy or no launcher | `buildAfterPickup([zone])` = `base/build` on that zone | build end messages | § 5.8 (SOG-0180) | L63 |
| « Réessayer » (download failed) | zone line | last fetch result has a failure for the zone | `startUpdate([zone])`: its download then its build | `TX.fetchError.refused/srcWhy` | § 5.8 | L71 |
| « Prendre le fichier téléchargé » (line) | zone line | zone not buildable and (stale or never built) | `startPickup(zone)` then build | as pickup | § 5.8 | L63, L69 |
| « Choisir le fichier… » | zone line (waiting or FAA refused), route row | `uploadOff()`: no launcher, busy, upload in progress | system chooser, `POST base/upload` raw bytes (≤ 1.5 GB, name encoded), progress bar; then `startPickup(zone)`, or FAA: counts FIX/AWY/NAV then `fetchThenBuild`, or EUROCONTROL: `startRoute()` | `TX.up.done/same/why.*/nasrWait/…` | § 5.8 (SOG-0199, 0237) | L70, L71, L74, L78 |
| « Annuler » (upload) | upload line | upload running | aborts the XHR | `TX.up.aborted` (err) | § 5.8 | L70 |
| Open links of a waiting zone (step ①②③) | zone line | https only | external page, new tab, `noopener` | `TX.steps.*` | § 5.8 (SOG-0189) | L69 |
| « Publier » (base panel) | Publier panel | `M.publishState`: `no-launcher`, `publishing`, `building`, `busy`, `no-gesture`, `nothing`, `offline` | re-reads `sync-status`, ONE ask (files + commits), `ctx.data.sync({gesture:true})`, result, journal, `load(true)` | ask `TX.pubAsk/pubAskOne`; `TX.pubDone/pubLocal/pubFailedCause…` | § 5.1, § 5.8 (SOG-0155, 0230) | L11, L12, L59, L77 |
| Proc panel: tick States (LF, K) | proc | `frozen()` | edits `S.picked` | none | § 5.5 | L17, L21 |
| Proc / VFR / aircraft « Télécharger / Construire / Purger » | their panels | setGate; VFR needs cycle in force; aircraft: invalid ICAO codes refused before any call | `proc|vfr|aircraft/{fetch,build,purge}` (purge dry first); VFR `no-pypdf` link to first-install assistant | `TX.setSum.*`, `TX.vfrSum.*`, `TX.codesBad` | § 5.5, § 6.5 | L16, L17, L15 |
| Type ICAO codes (field) | aircraft | `frozen()` | stores `S.codes` without redraw; clears error | `TX.codesBad` (err) | § 5.5 | L17 |
| « Publier » (sheets) | sheets panel | setGate for `aircraft/publish` | dry plan, ONE ask (copy n, remove n, MB), real run (trigram required) | ask `TX.sheetsAsk`; `TX.sheetsDone/NoAuthor…` | § 5.5 | L17, L18 |
| « Importer de Téléchargements » | route row | `no-launcher`, `busy`, `unknown-verb` (`route/import-rad`) | dry plan, inline question naming workbooks and licence, then « Importer » (sends only shown `books`) or « Annuler »; writes `route.json`; `load(true)` | `TX.route.ask/done/none/partial…` | § 5.7 | L33, L34, L35 |
| « Construire » (world) | world row | `no-launcher`, `busy`, `unknown-verb`; grey while reading | `weather/world {action:'build'}`; local only, not in chain nor journal | `TX.world.done/why.*` | § 5.11 (SOG-0138) | L50, L51 |
| « Tout mettre à jour » | chain card | `no-launcher`, `busy`, `offline`, `no-set` (nothing selected / verb unknown: set skipped with reason) | plan, ONE ask, per set fetch then build (order base, proc, vfr, aircraft), stops at first failure, then ONE Publier; journal marker | ask `TX.chainAsk`; `TX.chainDone/Failed/Stopped/NotPublished` | § 5.3 | L18 |
| « Arrêter » (chain) | chain card | chain not asking | stops current job then the chain | `TX.chainStopped` | § 5.3 | L18 |
| Open a catalogue row (summary) | group rows | row status `used` (others are flat cards) | shows link, licence, status, fed zones, published zones | `TX.link/licence/status…` | § 3.5 | L2, L47 |
| Open/close a group, « n autres jeux », journal | groups, journal | none | `S.manual`, `S.journalOpen`; manual choice kept between draws | none | § 3 | L2, L15 (group state); journal open: unverified |
| Open « Couverture par pays » | covtable | `noLauncher`, `unknownVerb` | `base/coverage` once, drops on close | `TX.cov.*` | § 5.11 (SOG-0174) | L67 |
| Sort by column / unfold a country / « Relire » | covtable | rows read | local sort (`aria-sort`); unfold detail; `Relire` re-reads (busy: `TX.cov.busy`) | `TX.cov.busy/unread/reload` | § 5.11 | L67 |
| Open « Inventaire des données » | inventory | launcher needed (rows); read once per opening | `GET data/inventory` | `TX.inventory.loading/unread/total` | § 12 | L26 |
| « Ranger les sources brutes » / « Remettre à leur place » | inventory | `noLauncher`, `unknownVerb`, `gateBusy`; merge pending checked before plan and run | `base/move-sources {dry:true}`, inline question (≤ 8 files) with « Ranger / Remettre » or « Annuler », real run, inventory re-read | `TX.inventory.move.*` | § 12.1 (SOG-0030) | L29, L54, L55 |
| Help « ? » of the frame | frame header | module registers `ctx.helpAnchor` (open group, else `data-cycle`) | opens help chapter at the group paragraph | help `modules/data/help/<lang>.md` | § 3 | —  |
| Online / offline event, window resize | whole | none | redraw (offline reason); maps resize/retry | `TX.greyReason.offline` | § 3, § 5.5 | L52 (resize); offline: unverified |

## 3. TABLE B: states

| State | Where shown | Source of truth | How drawn | Spec § | Cases |
|---|---|---|---|---|---|
| Cycle in force / next cycle | Head | `airac.cycleOf(now)` (`M.cycleHead`) | `data-cycle-now`, dates line, « prochain cycle dans n jours » | § 3, § 6.1 | L1, L2 |
| Launcher present / absent | Head, all grey reasons | `ctx.launcher.info()` | `data-runner` line (`TX.runnerLauncher/None`) | § 3, § 8 | L2, L7, L8 |
| Launcher old (no `regen/verbs` or older) | grey reasons | `knownVerbs` (answer or `OLD_VERBS`) | verb grey, `unknown-verb` reason | § 5.5 | L16, L17, L43, L51, L55 |
| Catalogue / publication / zones / States unreadable | top of screen / groups / coverage | `ask()` returns null | `data-error` lines (`TX.catError/pubError/zonesError/statesError/headError`) | § 7 | L4 |
| Coverage (zone set of this workstation) | Couverture, base list | `cache/data/coverage.json`, else published zones | names line; first opening all ticked | § 3.2 | L2, L13 |
| Procedure States green / orange / red | Couverture | `coverageByState()` | dot + reason label + names, 7 lines max, legend, refreshed on aerodb `{coverage:true}` | § 3.2 | L1, L2, L5 |
| Row state `absent`, `partial`, `stale-cycle` (amber, red after end + 7 d), `parser`, `outdated`, `stale-age`, `ok` | catalogue rows | `publication()` through `M.rowOf` / `pickState` | pill (`f-badge`) + meta line (cycle, age, counts, « à cause de SIA France »); `data-state` | § 6.2 | L1, L2, L27, L69 |
| Row without state (considered, set aside, weather, publication unreadable) | rows | catalogue status / `unknown` | flat card with status badge, link, licence; or no pill | § 3.5 | L2, L47 |
| Row `attention` | group summary dot, group open | any used row not `ok` | `f-status-dot[data-attn]`, group open by default | § 3.4 | L18, L25 |
| Stale published cycle (base / proc) | chain card, button dot title, verbs « Tout recalculer » dot | `M.staleGroups` + known dated sources | warning line `[data-stale]` « Cycle 2610 dépassé… — à cause de … » | § 5.4, § 6.3 | L18, L25 |
| Zone state `up-to-date`, `stale`, `never-built`, `failed` | zone list pill, map tone | launcher `base/status` (runs of 60, `personal` sent) | dot + word (`TX.zst.*`); pill is a button when reasons exist | § 5.9 | L40, L42, L43, L73, L75 |
| Zone `building` (page-owned) | zone list, map | `S.run` base non-purge and zone in `S.ids` | blue pill | § 5.9 | L40 |
| Zone without known state | list, map | no `base/status` | no pill; map keeps tone of publication | § 5.9 | L43 |
| Zone reasons / notices | under the pill | `TX.zr` codes (never-built, failed, pickup-waiting, source-newer, inputs-changed, parser-old, files-missing, source-old, index-orphan, source-unbuilt, source-unread, source-missing, unknown); notice `no-points` | `d-zwhy` lines; notices never make a zone stale | § 5.9, § 5.11 | L40, L48 |
| Zone waiting for a file | zone line | state not up-to-date and `buildable` false | first reason + « Prendre le fichier téléchargé » + « Choisir le fichier… » + steps ①②③ | § 5.8 (SOG-0180, 0189) | L63, L69, L70 |
| Zone download failed | zone line | last `base/fetch` result `failed[]` | source + answer (`TX.fetchError.*`), « Réessayer »; FAA: « Choisir le fichier… » + NASR link | § 5.8 | L71, L74 |
| Balance (upToDate / rebuild / failed / waiting) and active filter | choice column | `M.balanceOf(status, zones)` | line of buttons `aria-pressed`; filter note `TX.balLine.*` | § 5.8, § 12 | L63, L76 |
| Selection | choice column | `S.ticked` (page only) | « Sélection : n zones · size » or « Aucune zone cochée » | § 5.8 | L36, L37 |
| Map zone tone ok / warn / muted / err / accent; approximate outline; in/out of coverage | base & proc map | `STATE_TONE`, publication, `zoneOutlines()` | filled polygon + thick outline when ticked, dashed if approximate, legend line | § 5.5 map | L20, L40 |
| Map unavailable | map slot | `mapFail`, no MapLibre / tiles / outlines | list alone | § 5.5 | L20 |
| Pack switch on / half / off; empty; partial; unknown zones | packs | `M.packState(pack, zones, coverage)` | `role=switch`, `indeterminate`, notes `TX.packs.*`; block absent without `packs()` | § 5.10 | L44, L45, L46, L66 |
| Personal-licence box remembered | base choice | `cache/data/personal.json` | checked box + `TX.personalKept`; X-Plane line « lu sur ce poste seulement » | § 9 | L32 |
| Verb grey with reason | each panel | `setGate` / `updateGate` / `publishState` | `disabled` + one `[data-reason]` line under the buttons | § 6.5 | L8, L16, L17, L43 |
| Running (step, n / m, elapsed, bar, per zone / source lines) / stopping | active panel | job view (`regen/job`, found again by `resume`) | `[data-running]`: count, `TX.chunk` « Tranche i sur n », `TX.inputsCount`, bar (indeterminate without total), « Arrêter » | § 3, § 5.4 | L7, L9, L10, L49 |
| Other job running (not ours) | panel | `S.other` view | `TX.otherRunning`, buttons grey | § 3 | L8 |
| Build end: `done`, `partial`, `failed`, `cancelled`, `interrupted`, `no-browser`, `xplane-in-page`, `no-codes`, `no-script`, `no-pypdf`, `no-cache`, `invalid`, `merge-pending`, refused | panel result | `M.outcome` of the job end | bold sentence + advice + blocking line + zone lines | § 5.1 | L6, L7, L10, L16, L17 |
| Fetch end: `done`, `nothing`, `cancelled`, `interrupted`, `no-base`, `not-published`, manual sources list | panel result | `M.fetchOutcome` | summary, `fetchOutside`, manual list (+ pickup button), per source lines | § 5.1 | L14, L15 |
| Purge: planning (dry), asking, done / partial / failed / nothing | panel | dry result then real result | question, then summary + notes (shared SIA, git-tracked kept, unsafe paths) | § 5.1 | L14, L15, L56 |
| Pickup: planning, asking, done, partial, failed, blocked (rename), in place, nothing | base panel, notification | `base/pickup` dry then real | question groups, summary, hint, replan button | § 5.8 | L19, L28, L57, L58 |
| Update in progress (`S.updating`: status, fetch, asking, build) | base panel buttons | page state | all buttons grey (`busyNow`) | § 5.8 | L36 |
| Dated source missing the cycle in force / blocking sources | under base verbs; after build | `knownSources()` (view, `S.srcKept`, journal) | `[data-missing-source]` line (primary becomes pickup), `[data-blocking]` line | § 5.4 | L24, L25 |
| Publish: reading / unread / changes / clean / merge pending / last sent or kept | Publier panel | `GET sync-status?fresh=1` (`M.publishCounts`) | `[data-publish-state=reading|unread|changes|clean]`, merge warning, last line | § 3, § 5.8 | L11, L12, L60, L77 |
| Publish phases asking / running; end `done`, `local`, `no-exchange`, `failed` (+ cause of 10, step of 6) | Publier panel | `ctx.data.sync` result (`M.publishOutcome`) | bar, lines (held, conflicts, refused), launcher message as text | § 5.8 (SOG-0155) | L11, L12, L59 |
| Chain: asking, running (verb, i / m), stopping, publishing; set rows `done, nothing, failed, cancelled, skipped, notrun, running, waiting`; end `done / failed / cancelled` | chain card | `S.chain`, `S.chainEnd`, journal marker | `[data-chain]` list + count + « Arrêter »; end summary | § 5.3 | L18 |
| Chain marker found without its end | chain card + notification | journal entry `running` | `TX.chainReload` (result `interrupted`) | § 5.3 | L18 (and L10 for builds) |
| Route row: `absent`, `stale-cycle`, `ok`; phases planning / asking / running; results `none, failed, cancelled, refused, done, partial, not-shown` | proc group | `route.json` + `publication().route`; job views | pill, cycles meta, inline question, result + cycles + commit | § 5.7 | L33, L34, L35 |
| World row: `absent`, `old` (> 12 h), `ok`; phases reading / running; results done / kept / failed / refused | weather group | `weather/world status|build` | pill, meta (run, steps, MB, age), local-only note | § 5.11 | L50, L51 |
| Upload: running (name, %), ok / same / fail | zone line | `ctx.launcher.upload` | `progress` + « Annuler »; notification | § 5.8 | L70, L74 |
| Coverage table: closed, loading, ready, busy (409), unread, no launcher, unknown verb | covtable | `base/coverage` | table + sort state, or state line + « Relire » | § 5.11 | L67 |
| Inventory: closed, loading, ready (7 places), unread; Move: planning, asking, nothing, done, refused, running | inventory | `GET data/inventory`, `base/move-sources` | list `data-place` (state suivi / local / hors dépôt / inconnu), total, move box | § 12 | L26, L29, L54, L55 |
| Journal: empty / entries (time UTC, set, verb, items, result); chain entry `running` replaced at the end | Journal | `cache/data/journal.json` (50, newest first on screen) | `<li data-op>`; no per-entry unfold | § 3.7, § 7 | L2, L7, L12, L18 |
| Offline | grey reasons | `navigator.onLine` | `greyReason.offline`; failed maps retried | § 6.5 | L5 … (unverified) |

## 4. TABLE C: messages

`notify` = `ctx.notify` (auto-fading floating note, levels info/ok/warn/err); `ask` = `ctx.ask` (one question, 44 px buttons); `line` = text in the panel. Only the main families; every key exists in 4 languages.

| Key | fr text (shortened) | When | Level | Kind |
|---|---|---|---|---|
| **Head / coverage** | | | | |
| `TX.runnerLauncher` / `runnerNone` | « Lanceur de ce poste » / « Sans lanceur : lecture seulement » | head | – | line |
| `TX.headError`, `catError`, `pubError`, `zonesError`, `statesError` | « … n'a pas pu être lu » | aerodb call failed | warn | line |
| `TX.legend` | Vert : publiées ; orange : lisibles à la demande ; rouge : rien de lisible | States list | – | line |
| **Update path** | | | | |
| `planText` (`upd.planDl/planBuild/planOk/planWait`) | « 1 zone à télécharger, 3 à reconstruire, 2 déjà à jour » | before download in « Mettre à jour » | info | notify |
| `TX.upd.ask` (+ `whyMany`, `long`, `waiting`, `chunksAsk`) | « Mettre à jour : reconstruire n des t zones cochées (size). reasons » | after state | – | ask |
| `TX.upd.none` | « Rien à reconstruire : les n cochées sont à jour » | nothing to build | ok | notify |
| `TX.upd.noStatus` | « L'état des zones n'a pas pu être lu au lanceur : rien n'est reconstruit » | `base/status` unreadable | err | notify |
| `TX.upd.noStale` | « Aucune zone périmée : la sélection reste telle quelle » | « Seulement les périmés » | ok | notify |
| `TX.upd.zoneLink` / `zoneLinkOut` | « {z} : prête à être mise à jour… » / « n'est pas dans la couverture » | `#data?zone=` | info / warn | notify |
| `TX.balLine.rebuild/failed/waiting/upToDate` | « 3 zones à reconstruire, cochées ci-dessous : « Mettre à jour » s'en charge » | tap on balance number | ok | line |
| `TX.zr.*` | « Construite avec un ancien analyseur (v21, actuel v22) »… | zone reasons | – | line |
| **Verb ends** | | | | |
| `TX.sumDone/sumPartial/sumFailed/sumCancelled/sumInterrupted` (+ `setSum.*`, `vfrSum.*`) | « Base construite : n zones » … | end of build | ok / warn / err | notify + line |
| `TX.advice.*` / `setAdvice.*` | « Les zones construites sont gardées ; … relancez » | partial/failed/cancelled/interrupted build | – | line |
| `TX.fetchSum`, `fetchSumStopped`, `fetchNothing`, `fetchOutside`, `fetchManual` | « Téléchargé : n zones changées, m inchangées ; k échecs » | end of fetch | ok / warn | notify + line |
| `TX.fetchError.refused/srcWhy/httpN` | « FAA : téléchargement refusé (403) » | failed source on a zone line | warn | line |
| `TX.purgeAsk` / `purgeAskSet` (+ `purgeShared`, `purgeKept`, `purgeChunksAsk`) | « Purger n fichiers (13,8 Mo) des sources de France ? » | after dry plan | – | ask |
| `TX.purgeDone/purgePartial/purgeFailed/purgeStopped/purgeNothing` | « Purgé : n fichiers, s » / « Rien à purger » | end of purge | ok / warn | notify + line |
| `TX.pk.title/take/ignore/fix` + `takeZip`, `fixRename`, `fixMissing`, `fixUnread` | « Dans Téléchargements : » Sera pris / Ignoré / À corriger | pickup plan | – | ask (titled groups) |
| `TX.pickupSum.done/partial/failed/cancelled/blocked/inPlace/nothing` + `pickupHint` | « Pris : n fichiers (size) » / « Rien à prendre dans Téléchargements » | pickup end | ok / warn | notify + line |
| `TX.srcMissing` / `srcBlocking` / `staleBy` / `staleCycle` | « SIA France 2611 manquant : téléchargez export_xml_bd_SIA_… » ; « Sources d'un cycle passé… » ; « Cycle 2610 dépassé : téléchargez les sources du cycle 2611 » | cycle in force not in the cache | warn | line |
| `TX.refused.busy/updating/tooSoon/unknown-route/bad-args/offline/refused/failed` + `refusedWhy` | « Une autre opération est en cours » / « Mise à jour de la suite en cours… » / « Réessayez dans n s » | launcher refused a start (409, 429, 404, 400…) | err | notify + line |
| `TX.greyReason.*` | « Il faut le lanceur du poste », « Cochez au moins une zone », « Hors ligne »… | disabled verb | – | line |
| `TX.codesBad` | « Codes refusés : … Un code OACI fait 2 à 4 lettres ou chiffres » | aircraft codes | err | notify + line |
| `TX.mergePending` | « Une fusion attend dans data/ : synchronisez d'abord » | job end `merge-pending` | err | line |
| `TX.firstInstall` | « Ouvrir l'assistant de première installation » | `no-pypdf` | err | link |
| **Packs** | | | | |
| `TX.packs.removeAsk` | « Retirer n de la couverture (pack) : zones. … rien n'est purgé » | switch off / untick | – | ask |
| `TX.packs.added` / `removed` | « n ajoutée(s) à la couverture : cochées, rien n'est construit » | after add / remove | ok | notify |
| **Upload** | | | | |
| `TX.up.done/same/doneRoute` | « {name} reconnu : NATS UK, Royaume-Uni. La prise suit » | file recognised | ok | notify |
| `TX.up.why.too-large/empty/type/unrecognised/busy/merge-pending/disk/refused`, `aborted`, `offline`, `unknownRoute`, `failed` | « Fichier trop gros : 1,5 Go au plus » … | refusal | err | notify |
| `TX.up.nasrWait` / `nasr` | « NASR de la FAA : reçu FIX, il manque AWY, NAV » | FAA sets | warn | notify |
| **Publier** | | | | |
| `TX.pubAsk` / `pubAskOne` | « Publier n fichiers et m commits vers le dépôt des données ? » | before sync | – | ask |
| `TX.pubDone/pubLocal/pubDoneCommits/pubClean/pubNoExchange` | « Envoyé. Fichiers commités : c ; reçus : r » / « Tout est déjà publié : … » / « Rien n'est parti : cet appareil ne synchronise pas… » | end of publish | ok / warn | notify + line |
| `TX.pubFailedCause` (+ `pubCause.*` ×10, `pubStep.*` ×6) / `pubFailed` | « La publication a échoué : le serveur a refusé l'envoi (étape push). Rien n'est perdu » | failed sync | err | notify + line |
| `TX.pubReason.*`, `pubReading`, `pubUnread`, `pubMerge`, `pubHeld`, `pubConflicts`, `pubRefused` | « Une construction est en cours : publiez quand elle est finie », « Rien à publier »… | gate and state lines | – / warn | line |
| `TX.sheetsAsk`, `sheetsDone`, `sheetsNothing`, `sheetsNoAuthor`, `sheetsFailed` | « Publier les fiches : copie de n, retrait de m (size) ? » | sheets | ok / err | ask + notify |
| **Chain** | | | | |
| `TX.chainAsk` (+ `chainSkipped`) | « Tout mettre à jour, cycle AIRAC 2611 : sets… aucune purge. Puis une seule publication » | start | – | ask |
| `TX.chainDone/chainFailed/chainStopped/chainNotPublished` | « Tout mettre à jour terminé : n jeux. » / « … arrêté (set) : reason. Ce qui est déjà construit est gardé ; rien n'est publié » | end | ok / err / warn | notify + line |
| `TX.chainReload` | « Chaîne interrompue par le rechargement : relancez « Tout mettre à jour » » | marker without end | warn | notify + line |
| **Route / world** | | | | |
| `TX.route.ask` / `go` / `cancel` | « Importer n classeurs de Téléchargements dans data/route/ ? » + licence | route plan | – | inline question |
| `TX.route.done/partial/none/failed/cancelled/notShown`, `why.*` | « Importé : RAD du 8 oct. 2026 » / « Aucun classeur… déposez-les » | route end | ok / err | notify + line |
| `TX.route.hint` / `account` | where to put workbooks; where to register (EAD Basic) | row detail | – | line |
| `TX.world.done/kept/why.*`, `hint`, `local` | « Construit : run …, 25 étapes, 17,1 Mo (128 s) » | world end | ok / err | notify + line |
| **Read-only blocks** | | | | |
| `TX.cov.busy/unread/noLauncher/unknownVerb/loading` | « Le lanceur a un autre travail en cours : relisez » | coverage table | warn | line |
| `TX.inventory.unread/loading/total`, `move.ask/askUndo/nothing/done/kept/refused/refusal.*` | « Ranger n fichier(s) (size) ? … » / « Rien à ranger » | inventory | ok / warn | inline question + lines |
| `TX.journalEmpty` | « Aucune opération pour le moment » | journal | – | line |

## 5. Gaps

1. **EAD line and procedures read by hand are not on the screen** though specified (SPEC § 4.2, § 4.3, § 9: `[data-set=ead]`, `[data-f=icao]`, « Lire un terrain », « Relire », « Retirer », `[data-aerodrome]`, « Remplacer ou fusionner »). The code only has the hint `TX.eadNote` / `TX.itemError.ead-per-aerodrome` (texts.js:1269, 1275; panels.js:699). No case.
2. **Row-level gesture model of the SPEC was replaced by group panels** (SPEC § 3.5 / § 9: per-row Télécharger/Construire/Publier/Purger/Mettre à jour, `[data-gap]` « identique au dépôt »/« ce poste est en avance » (§ 6.4), row states `new-cycle`, `source-newer`, `unpushed`). `STATE_ORDER` lists them (model_screen.js:14) but `pickState` (:108-118) never returns them and `TX.state` has no such keys; no gap line exists. Rows only show a pill and a detail. No case.
3. **A single zone cannot be removed from the coverage directly**: `removeZones` is called only by pack switches/ticks (packs.js:137, 160); the list boxes only edit the selection (`S.ticked`). SPEC § 3.2 « Modifier » fold with a checkbox per published zone does not exist. Zones in no pack cannot leave the coverage (unverified in a case; `—`).
4. **Grey « Mettre à jour » (no `base/status` in `regen/verbs`) shows no reason**: the written reason comes from `gateOf(fetch|build|purge)` (panels.js:728, 735); `updateGate`'s `unknown-verb` is never rendered, nor for « Seulement les périmés » / « Tout désélectionner ». L43's title says « grey with its reason » but asserts only `disabled` (data.py:4170-4180). SPEC § 3 rule « a button is never missing, it is grey with its reason ».
5. **Journal**: SPEC § 3.7 (each entry unfolds to its log, « Copier ») is not in the code (screen.js:551-563: plain `<li>`); route, world, upload, move and pickup plans are outside the journal by decision (DECISIONS 10 Nov, SOG-0125/0138) while SPEC § 5.5 says every operation is journalled. Route and world have no « Arrêter ».
6. **Head vs SPEC § 3.1**: no « n publications à envoyer » and no `[data-cycle-alert]` in the head (screen.js:307-320); the count lives in the Publier panel (publish.js:77); the end-of-cycle line is the frame's (§ 6.3) and no data case covers it. Runner text differs from the SPEC (« Lanceur de ce poste », « lecture seulement » vs « Lanceur de <poste> », « lecture et publication seulement »).
7. **Duplicated information**: the stale cycle is said in 5 places (chain card line, button dot title, group dot, row pill, « à cause de » in meta); a zone's state in 3 (list pill, map tone, balance); the zones appear in the map, the pack folds and the list; « Télécharger / Construire / Purger » exist in 4 panels and the chain, with two different update paths (« Mettre à jour » = status + download-if-needed + one question; chain = fetch + build per set, no status, no pickup, stops at the first failure); two « Publier » buttons (base, sheets). Three question styles: `ctx.ask` (7 callers), inline « Importer / Annuler » (route), inline « Ranger / Annuler » (inventory) against SPEC § 3 « ask once (`ctx.ask`) ».
8. **SPEC contradicts itself**: § 3 rules (« A failure never stops the others in « Tout mettre à jour » », SPEC.md:122) vs § 5.3 (« Stop at the first failure », SPEC.md:232); the code stops (chain.js:237-247, `chainVerdict`), while « Mettre à jour » on zones continues after a failure (`chunkVerdict`, SOG-0180). A redesign must pick one rule per path.
9. **Behaviours only in code / decisions, not in a gesture-level SPEC section**: pack « Mettre à jour (n) » link, the zone-list actions (Réessayer, Choisir le fichier…), the balance filter that also ticks zones (SOG-0228 b), « Détail » fold, certify box, `#data?zone=` and `?source=` links, FAA NASR three-set flow (upload.js:123-145) are specified only as dated bullets of § 5.8 (long paragraph), not in the § 3 screen description or § 9 DOM contract (which still lists the removed row verbs).
10. **No case found**: help anchor (module.js:363), group/journal fold persistence (`S.manual`, `S.journalOpen`: only L15 touches group state), offline/online redraw (module.js:375-380), `TX.refused.updating` text itself (L8 sends 409 generally), seven of ten `pubCause` keys (L59 plays three), « Tout afficher » is only in L63 by name, zone link text `zoneLinkOut` (L48 unverified). L62 only checks quoted button names, not message wording.
