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
