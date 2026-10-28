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
