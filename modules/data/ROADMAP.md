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
| **D1** Read-only module | data, aerodb | `modules/data/` mounted at level 3: head (cycle in force, runner), coverage (`cache/data/coverage.json`, every published zone ticked at the first opening), the four groups, rows with cycle, state and gap computed from aerodb's `publication()`, `zones()` and `sources()` (INTEGRATION § 2.1; delivered by
aerodb, d4cec61b9) and, with a launcher, `GET /__setup/regen/state`; every verb grey with its reason; help ×4; **the Sources screen replaced**: `sources_data.js` becomes the module's catalogue (rows = link, licence, status, state; considered and set-aside sources in each group's fold), the screen `#sources`, its `APP.screens` entry and the Administration card's button removed | L1 states, gaps and cycle arithmetic as pure functions on fixtures (static); L2 the screen at 390 and 1280, no horizontal scroll, 44 px, seven rows per group, grey reasons ×4 | was a frame screen `#data`; now a module, which also replaces the Sources screen |
| **D2** Jobs and Télécharger | frame (launcher), data | the `download` verbs of `regen/job` (the runner is D0's), the journal, « Arrêter »; Télécharger for openAIP, ENAIRE, FAA ADDS, UK Mil, NAV CANADA, the pick-ups of SIA and NATS | K: the runner in `--essai` mode (fake server, a job, cancel, lock); L3 a row runs, progress, stop, journal, with a fake launcher | NAT removed (read on the site, D9) |
| **D3** Télécharger the procedure sources | frame (launcher) | `eaip` and `cifp` providers (address and file name from the cycle; « rien à télécharger encore ») | K: derivation against the verified 2610 values, a fake HTTP server | unchanged |
| **D4** Construire, Publier, Purger of the Python sets | frame (launcher), data | builds of eAIP, CIFP, VAC points, aircraft (subprocess; « pypdf manque » with the pointer to the first-install assistant), `regen/publish` and `regen/purge` (plans, three cycles, `proc` committed by the route) | K: publish plan on a temporary repository with a bare remote (new, changed, removed; no commit when unchanged), purge keeps three cycles | pypdf installed by the first-install assistant, not by this module (user, 28 Oct) |
| **D5** The base built without the page | aerodb, data | `frame/aerodb/build/` pure builders in a Worker (SIA + towns + index + manifest; other sources; MORA; DIRCAM PDF), inputs through `ctx.launcher.read` or a picked file, outputs through `regen/put`; X-Plane / Navigraph dropped from what is published, a local-only build kept under `data/local/`; the publication service without launcher (INTEGRATION § 1.3) | K: golden test (V2 `SiaBase.build` and the builders give byte-identical JSON on the fixtures), a zone alone equals the whole (G9), a published build carries no X-Plane input; bench time and memory | X-Plane rule added (user, 28 Oct) |
| **D6** Purger everywhere | data, frame (launcher) | the plans of SPEC § 5.1 for every set; three cycles for the base and the cycle-built `proc/`; `proc/manual/` never in the plan, « Retirer » one aerodrome as its own asked call | K: plans on a temporary tree | « three cycles » settled (user) |
| **D7** « Mettre à jour », « Tout mettre à jour », end of cycle | data, frame | the chains of SPEC § 5.2 / 5.3 in the order of § 4.5, one grouped publication; the end-of-cycle line of the Status block (INTEGRATION § 1.4): amber on a phone, leading to the module on a workstation | L4 « Tout mettre à jour » with a fake launcher (order, a set waiting skipped, summary); A: the Status line from a published cycle older than the cycle in force | replaces D9's Actions (user: no write token in Actions) |
| **D8** What V3 still lacks from V2 | data, the ergonomics session | **a list, no removal**: every feature of `apps/settings/maintenance.html`, `data_admin.js`, the studio pages (`apps/cpco/map_parser.html`, the planner) that V3 has no equivalent for, with a proposed V3 home; porting lots follow, one per feature; among them the first-install assistant's prerequisite step (pypdf), to which the grey reason points while the V2 page exists | — | was « remove V2 on v3 »; the user: V2 is not used from V3, list what is missing, port what must be |
| **D9** NAT tracks on the site | site, aerodb | the FAA NAT message published with the site like the world weather (Actions, public domain, no secret), aerodb reads it there; the Météo group shows its time | the site's build test; K: aerodb reads the site's file | was « unattended sources »: CIFP by Actions dropped (no write token) |
| **D10** « Lire un terrain depuis EAD » | frame (launcher), aerodb, settings, data | the EAD line (SPEC § 4.3): one ICAO code, the launcher's login with the credentials of the Keys panel, *Charts* documents to `data/local/`, coding tables read with the known layouts (pypdf, OCR), installed by
`tools/proc_manual.py` into `proc/manual/<ICAO>.json` (« remplacer ou fusionner » asked when another source has the
aerodrome); « Périmé » and « Relire » for an aerodrome whose cycle of origin has passed, « Retirer » on the owner's order; the EAD entry of the Keys panel (Settings) | K: the layout registry on the pages the owner provides (kept out of the public repository); L: the line greyed without credentials | new (ergonomics session, 28 Oct); its parser waits for real pages (`EAD_BASIC.md` § 2) |

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
