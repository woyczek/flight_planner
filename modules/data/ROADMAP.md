# data — lots (D1–D9 reviewed) and open questions

The order in which [SPEC.md](SPEC.md) is built. It reviews the plan of `docs/technique/V3_DONNEES_REGENERATION.md` § 4
with the user's answers of 28 October 2026 (its § 5.1) and the ergonomics session's decisions (a module, not a screen of
the frame; the vocabulary of SPEC § 2). One lot = one commit on `v3` with its documents (help ×4, CHANGELOG), its tests
before « poussé ». Zones of tests: **K** (aerodb), **A** (frame and settings), a new zone for the module (to be named by
the ergonomics session; « M » below). Case numbers are provisional.

## Lots

| Lot | Owner | Scope | Tests | Changes from the inventory's plan |
|---|---|---|---|---|
| **D0** Frame services | frame | `ctx.launcher` (INTEGRATION § 1.1, moving Settings' `setup()` and `lnmperf.js` onto it), the module's place in the rail (§ 1.5), the Worker in the page policy; the publication service without launcher (§ 1.3) may follow in D5 | frame zone A: the adapter on a fake launcher, refusal from the local network | new: the module needs the frame first |
| **D1** Read-only module | data, aerodb | `modules/data/` mounted at level 3: head (cycle in force, runner), coverage (`cache/data/coverage.json`), the five groups, rows with cycle, state and gap computed from `aerodb.publication()` (INTEGRATION § 2.1) and, with a launcher, `GET /__setup/regen/state`; every verb grey with its reason; help ×4 | M1 states, gaps and cycle arithmetic as pure functions on fixtures (static); M2 the screen at 390 and 1280, no horizontal scroll, 44 px, seven rows per group, grey reasons ×4 | was a frame screen `#data`; now a module; no Administration button |
| **D2** Jobs and Télécharger | frame (launcher), data | the job runner and its routes (`regen/state`, `regen/job`, cancel), the journal, « Arrêter »; Télécharger for openAIP, ENAIRE, FAA ADDS, UK Mil, NAV CANADA, the pick-ups of SIA and NATS | K: the runner in `--essai` mode (fake server, a job, cancel, lock); M3 a row runs, progress, stop, journal, with a fake launcher | NAT removed (read on the site, D9) |
| **D3** Télécharger the procedure sources | frame (launcher) | `eaip` and `cifp` providers (address and file name from the cycle; « rien à télécharger encore ») | K: derivation against the verified 2610 values, a fake HTTP server | unchanged |
| **D4** Construire, Publier, Purger of the Python sets | frame (launcher), data | builds of eAIP, CIFP, VAC points, aircraft (subprocess; « pypdf manque » with the pointer to the first-install assistant), `regen/publish` and `regen/purge` (plans, three cycles, `proc` committed by the route) | K: publish plan on a temporary repository with a bare remote (new, changed, removed; no commit when unchanged), purge keeps three cycles | pypdf installed by the first-install assistant, not by this module (user, 28 Oct) |
| **D5** The base built without the page | aerodb, data | `frame/aerodb/build/` pure builders in a Worker (SIA + towns + index + manifest; other sources; MORA; DIRCAM PDF), inputs through `ctx.launcher.read` or a picked file, outputs through `regen/put`; X-Plane / Navigraph dropped from what is published, a local-only build kept under `data/local/`; the publication service without launcher (INTEGRATION § 1.3) | K: golden test (V2 `SiaBase.build` and the builders give byte-identical JSON on the fixtures), a zone alone equals the whole (G9), a published build carries no X-Plane input; bench time and memory | X-Plane rule added (user, 28 Oct) |
| **D6** Purger everywhere | data, frame (launcher) | the plans of SPEC § 5.1 for every set; three cycles for the base and `proc/` | K: plans on a temporary tree | « three cycles » settled (user) |
| **D7** « Mettre à jour », « Tout mettre à jour », end of cycle | data, frame | the chains of SPEC § 5.2 / 5.3 in the order of § 4.5, one grouped publication; the end-of-cycle line of the Status block (INTEGRATION § 1.4): amber on a phone, leading to the module on a workstation | M4 « Tout mettre à jour » with a fake launcher (order, a set waiting skipped, summary); A: the Status line from a published cycle older than the cycle in force | replaces D9's Actions (user: no write token in Actions) |
| **D8** What V3 still lacks from V2 | data, the ergonomics session | **a list, no removal**: every feature of `apps/settings/maintenance.html`, `data_admin.js`, the studio pages (`apps/cpco/map_parser.html`, the planner) that V3 has no equivalent for, with a proposed V3 home; porting lots follow, one per feature | — | was « remove V2 on v3 »; the user: V2 is not used from V3, list what is missing, port what must be |
| **D9** NAT tracks on the site | site, aerodb | the FAA NAT message published with the site like the world weather (Actions, public domain, no secret), aerodb reads it there; the Météo group shows its time | the site's build test; K: aerodb reads the site's file | was « unattended sources »: CIFP by Actions dropped (no write token) |
| **D10** « Lire un terrain depuis EAD » | frame (launcher), aerodb, settings, data | the EAD line (SPEC § 4.3): one ICAO code, the launcher's login with the credentials of the Keys panel, AD 2 pages to `data/local/`, coding tables read with the known layouts, `proc/<cycle>/<ICAO>.json` status `check`; the EAD entry of the Keys panel (Settings) | K: the layout registry on the pages the owner provides (kept out of the public repository); M: the line greyed without credentials | new (ergonomics session, 28 Oct); its parser waits for real pages (`EAD_BASIC.md` § 2) |

Existing guards kept green throughout: K1–K9, A12, A15, A19, A20, I4, I6, I7.

## Open questions (for the ergonomics session)

1. **Coverage at the first opening**: start with every zone published in the repository ticked, or with none (the
   administrator ticks)? V2's list (`aeroZones:v1` in `localStorage`) cannot be taken over: a module never reads the
   browser's storage, and the user said V2 is not used from V3.
2. **« Tout mettre à jour »**: a fifth label beside the four verbs and « Mettre à jour » — kept, or only « Mettre à jour »
   per set?
3. **pypdf**: the grey reason points to the first-install assistant (`apps/settings/premier_lancement.html`), a V2 page.
   Is that page still the one to open from V3, or does the prerequisite step move to V3 (Settings, or the launcher's own
   start)?
4. **The Sources screen** (`#sources`) and this module show the same links: keep both (the screen for any level-3 device,
   the module for the workstation), or fold the Sources screen into the module's row details?
5. **Test zone** of the module: a new letter, or the K zone of aerodb?
6. **The end-of-cycle line** (INTEGRATION § 1.4) is the frame's: to be agreed with the frame session (it reads aerodb on
   every device).
7. **EAD credentials** in Settings' Keys panel (INTEGRATION § 3): agreed? They are the owner's personal account; the panel
   is at the Full level, launcher only.
8. **« Cartes »** holds one data set today (the VAC reporting points). Keep the group for later charts, or put the VAC
   points under Procédures?
