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
