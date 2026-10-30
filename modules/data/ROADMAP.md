# data — lots (D1–D9 reviewed) and open questions

The order in which [SPEC.md](SPEC.md) is built. It reviews the plan of `docs/technique/V3_DONNEES_REGENERATION.md` § 4
with the user's answers of 28 October 2026 (its § 5.1) and the ergonomics session's decisions (a module, not a screen of
the frame; the vocabulary of SPEC § 2). One lot = one commit on `v3` with its documents (help ×4, CHANGELOG), its tests
before « poussé ». Zones of tests: **K** (aerodb), **A** (frame and settings), **L** (the module Données, new zone, ergonomics
session 28 Oct). Case numbers are provisional. **Reviews done** (aerodb 20c8d920c and 51a028f48, frame D0 bd4cc5109) **and the two prerequisites delivered**: the
frame's services (D0) and aerodb's calls for D1 (`publication()`, `zones()`, `sources()`, `airac.js`, `catalogue.js`,
d4cec61b9). The module's D1 starts on the ergonomics session's go.

## Lots

| Lot | Owner | Scope | Tests | Changes from the inventory's plan |
|---|---|---|---|---|
| **D0** Frame services — **delivered** (bd4cc5109, `frame/INTEGRATION.md` § 15) | frame | `ctx.launcher` by `meta.launcher` (Settings' `setup()` and aerodb's calls moved onto the same client), the job runner and `regen/state`, the verbs `state/scan` and `proc/ead-fetch`, `ctx.publish` by `meta.publish`, the end-of-cycle line, Workers allowed; the rail's verb comes with `module.js` | frame zone A | new: the module needed the frame first |
| **D1** Read-only module (the ergonomics session's « D2 »; **first part delivered**: the screen without any verb, 29 Oct — see below) | data, aerodb | `modules/data/` mounted at level 3: head (cycle in force, runner), coverage (`cache/data/coverage.json`, every published zone ticked at the first opening), the four groups, rows with cycle, state and gap computed from aerodb's `publication()`, `zones()` and `sources()` (INTEGRATION § 2.1; delivered by
aerodb, d4cec61b9) and, with a launcher, `GET /__setup/regen/state`; every verb grey with its reason; help ×4; **the Sources screen replaced**: `sources_data.js` becomes the module's catalogue (rows = link, licence, status, state; considered and set-aside sources in each group's fold), the screen `#sources`, its `APP.screens` entry and the Administration card's button removed | L1 states, gaps and cycle arithmetic as pure functions on fixtures (static); L2 the screen at 390 and 1280, no horizontal scroll, 44 px, seven rows per group, grey reasons ×4 | was a frame screen `#data`; now a module, which also replaces the Sources screen |
| **D2** Jobs and Télécharger | frame (launcher), data | the `download` verbs of `regen/job` (the runner is D0's), the journal, « Arrêter »; Télécharger for openAIP, ENAIRE, FAA ADDS, UK Mil, NAV CANADA, the pick-ups of SIA and NATS | K: the runner in `--essai` mode (fake server, a job, cancel, lock); L3 a row runs, progress, stop, journal, with a fake launcher | NAT removed (read on the site, D9) |
| **D3** Télécharger the procedure sources | frame (launcher) | `eaip` and `cifp` providers (address and file name from the cycle; « rien à télécharger encore ») | K: derivation against the verified 2610 values, a fake HTTP server | unchanged |
| **D4** Construire, Publier, Purger of the Python sets | frame (launcher), data | builds of eAIP, CIFP, VAC points, aircraft (subprocess; « pypdf manque » with the pointer to the first-install assistant), `regen/publish` and `regen/purge` (plans, three cycles, `proc` committed by the route) | K: publish plan on a temporary repository with a bare remote (new, changed, removed; no commit when unchanged), purge keeps three cycles | pypdf installed by the first-install assistant, not by this module (user, 28 Oct) |
| **D5** The base built without the page | aerodb, data | `frame/aerodb/build/` pure builders in a Worker (SIA + towns + index + manifest; other sources; MORA; DIRCAM PDF), inputs through `ctx.launcher.read` or a picked file, outputs through `regen/put`; X-Plane / Navigraph dropped from what is published, a local-only build kept under `data/local/`; the publication service without launcher (INTEGRATION § 1.3); on the launcher, one process per zone (cores − 1), progress per zone, each zone committed when built (SPEC § 5.4) | K: golden test (V2 `SiaBase.build` and the builders give byte-identical JSON on the fixtures), a zone alone equals the whole (G9), a published build carries no X-Plane input, a parallel build equals a sequential one, a failed zone leaves the others published; bench time and memory | X-Plane rule added (user, 28 Oct) |
| **D6** Purger everywhere | data, frame (launcher) | the plans of SPEC § 5.1 for every set; three cycles for the base and the cycle-built `proc/`; `proc/manual/` never in the plan, « Retirer » one aerodrome as its own asked call | K: plans on a temporary tree | « three cycles » settled (user) |
| **D7** « Mettre à jour », « Tout mettre à jour », end of cycle | data, frame | the chains of SPEC § 5.2 / 5.3 in the order of § 4.5, one grouped publication; the end-of-cycle line of the Status block (INTEGRATION § 1.4): amber on a phone, leading to the module on a workstation | L4 « Tout mettre à jour » with a fake launcher (order, a set waiting skipped, summary); A: the Status line from a published cycle older than the cycle in force | replaces D9's Actions (user: no write token in Actions) |
| **D8** What V3 still lacks from V2 | data, the ergonomics session | **a list, no removal**: every feature of `apps/settings/maintenance.html`, `data_admin.js`, the studio pages (`apps/cpco/map_parser.html`, the planner) that V3 has no equivalent for, with a proposed V3 home; porting lots follow, one per feature; among them the first-install assistant's prerequisite step (pypdf), to which the grey reason points while the V2 page exists | — | was « remove V2 on v3 »; the user: V2 is not used from V3, list what is missing, port what must be |
| **D9** NAT tracks on the site | site, aerodb | the FAA NAT message published with the site like the world weather (Actions, public domain, no secret), aerodb reads it there; the Météo group shows its time | the site's build test; K: aerodb reads the site's file | was « unattended sources »: CIFP by Actions dropped (no write token) |
| **D10** « Lire un terrain depuis EAD » | frame (launcher), aerodb, settings, data | the EAD line (SPEC § 4.3): one ICAO code, the launcher's login with the credentials of the Keys panel, *Charts* documents to `data/local/`, coding tables read with the known layouts (pypdf, OCR), installed by
`tools/proc_manual.py` into `proc/manual/<ICAO>.json` (« remplacer ou fusionner » asked when another source has the
aerodrome); « Périmé » and « Relire » for an aerodrome whose cycle of origin has passed, « Retirer » on the owner's order; the EAD entry of the Keys panel (Settings) | K: the layout registry on the pages the owner provides (kept out of the public repository); L: the line greyed without credentials | new (ergonomics session, 28 Oct); its parser waits for real pages (`EAD_BASIC.md` § 2) |

**D1 in two parts** (ergonomics session, 29 Oct, night before the group tests): **D1a** the screen read-only and *without any
verb button* (head, coverage with the States' list, four groups, rows with cycle, age, counts and state, catalogue rows of
the « n autres jeux » folds), cases L1–L3; **D1b** the coverage's « Modifier », the verbs grey with their reasons, the
launcher's `regen/state`, the Sources screen removed. aerodb adds for D1a `coverageByState()`'s `held` and `names` and
`AeroCatalogue.PARSER_VERSION` (its lot of 29 Oct night); the screen reads them when present.

**Construire of the base** (the ergonomics session's « D3 / D4 », first verb, 29 Oct night): in the Base aéronautique
group, a panel `[data-build]` — the coverage's zones ticked, the personal-licence sources (`enaire`, `nats`, `xplane`, keys of
`shared/aero_zones.js`, a table in `model.js` checked against that file by L1) unticked with their line, « Construire » grey
with its reason (no launcher, another operation, offline, no zone) — wired to aerodb's verb `base/build` (8755aad9c), the
progress per zone, « Arrêter », a job found again at the opening (running, ended, interrupted), the end said with its
counts and its reason (`no-browser`, `xplane-in-page`, `partial`, `failed`, `cancelled`), the journal; cases L6–L10 on a fake
launcher. Next: Télécharger, Publier, Purger as their verbs exist; the X-Plane build in the page.

**Publier of the base** (29 Oct night): the panel `[data-publish]` after the build — what will leave (`sync-status`:
files changed, commits to send, a merge waiting, the last pass), one question « Publier n fichiers et m commits ? », then
the frame's gesture sync `ctx.data.sync({ gesture: true })` (INTEGRATION § 1.3) and its report (sent, received, kept on the
workstation during a build, conflicts, refused); grey with its reason (no launcher, a build, another operation, the frame
without the gesture, nothing to publish, offline); cases L11–L12 on a fake launcher and a fake frame sync. Next:
Télécharger and Purger on aerodb's `base/fetch` and `base/purge` (contract agreed 29 Oct: a dry purge for the plan, no
commit by either).

**Télécharger and Purger of the base** (30 Oct night): on aerodb's `base/fetch` and `base/purge` (ac84d562e,
`tools/regen/base_sources.py`), in the same panel as Construire (one choice of zones): the download per zone and per source
(downloaded, unchanged, failed with its code, licence not declared, manual with an https link only), the files changed outside
the synchronised data said; the purge first run dry, its plan in the one question (files, size, the SIA files shared by
every zone, the tracked files kept), then the real run; one operation at a time whatever its verb, found again at the
opening; journal; cases L14–L15. With them the Base group has its four verbs.

**A1 (V3 § 10.34, 30 Oct)**: the four verbs for every set (SPEC § 5.5) and « Tout mettre à jour » (§ 5.3: plan first, stop at
the first failure, one Publier at the end), one set per commit: Procédures, VAC points, aircraft, the company's sheets, then
« Tout mettre à jour », then the V2 link leaves the Maintenance rail. Launcher verbs asked of V3 Frame (`vfr/*`,
`aircraft/*`) and aerodb (`proc/fetch|build|purge`).

**D8 inventory (30 Oct, after A1)**: every data set has its four verbs (base, proc per State, VAC, aircraft, the company's
sheets) and « Tout mettre à jour » exists, but the V2 page `apps/settings/maintenance.html` still holds verbs with no V3
twin, so **its link stays in the Maintenance rail** until this list is empty:

| V2 (section, launcher route) | V3 twin | Owner |
|---|---|---|
| Données aéronautiques: the SIA France zip and the NATS zip picked up from Downloads (`/__setup/sia-zip`, `/__setup/downloads`) | none: `base/fetch` lists them as « à déposer à la main » with their link, nothing takes the file in | V3 Frame (a `base/pickup` verb or a pick-up step of `base/fetch`), then the module |
| Mises à jour de la suite (channel, check, `update_suite.py`) | « Mise à jour de la suite » (V3 § 10.34 A3) | V3 Frame |
| Sauvegarde totale, its reload and its journal | « Sauvegarde du poste » (A3) | V3 Frame |
| Sources et dossiers: local folders | « Dossiers du poste » (A3, 36f571e40) | delivered |
| Sources et dossiers: websites the suite may contact (`/__setup/sites`, `site-allow`, `site-remove`) and opening from another website or an extension (`/__setup/relax`) | none | V3 Frame, Settings for the card |
| Espace disque, Caches (sizes, clear) | the device's offline zones only (Settings) | Settings, with the launcher's sizes from V3 Frame |
| Premier lancement (the first-install assistant: data folder, repository, pypdf) | none; the grey reason « pypdf manque » still points to the V2 assistant | V3 Frame (launcher), Settings |

Existing guards kept green throughout: K1–K9, A12, A15, A19, A20, I4, I6, I7.

## Answers of the ergonomics session (28 October 2026), applied to SPEC and INTEGRATION

1. **Coverage at the first opening**: every published zone ticked (the screen reflects what the airline publishes;
   unticking is the rare gesture); nothing taken over from V2.
2. **« Tout mettre à jour »**: kept, the main gesture, at the top; the four verbs stay on each row.
3. **pypdf**: the grey reason points to the V2 first-install assistant (served by the launcher) as long as it exists; its
   prerequisite step is a debt of D8, « to port ».
4. **Sources screen**: replaced by the module at D1 (`sources_data.js` becomes the module's catalogue, the screen and its
   button go); until then both coexist.
5. **Test zone**: a new zone **L** (the module Données).
6. **End of cycle**: the frame's, computed from `aerodb.publication()` for the Status block, phone included; asked to the
   frame by the ergonomics session.
7. **EAD credentials**: in the launcher's keys panel (Administration, launcher only, never synchronised), given once to the
   launcher and kept in its secrets store, never read back by the page.
8. **No « Cartes » group**: the VAC reporting points go into « Base aéronautique »; four groups (Base aéronautique,
   Procédures, Appareils, Météo).

No question left open.
