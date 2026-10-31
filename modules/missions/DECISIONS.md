# missions — decisions

- **30 Oct 2026 — specification first, no code** (V3_SPECIFICATION § 10.32; ergonomics session). The user's objection
  accepted: the code waits for the stabilisation and the refactoring (§ 10.33); the SPEC is written from the survey of
  the V2 mission files of the same day. Owner of the code: to be named.
- **30 Oct 2026 — the group mode is alive.** What was dropped on 21 Oct is the signed accounts, not playing missions as a
  crew. This module is the first step towards the crew module: choose a mission, or draw one at random.
- **30 Oct 2026 — the missions are read as they are.** The V2 files of the data repository (`missions/`), the author's
  numbering as the key, `former_id` kept, a tolerant reader (minimal, complete and organisation shapes); the module never
  writes a mission.
- **30 Oct 2026 — one reader, two skins.** The page-by-page reader is rebuilt simplified (pages by sections, controls,
  address) as a light component tested first; V2's realistic gestures (turning leaf, seal, moving bookmark, images) come
  back as an optional visual layer per design, never as a second component (the user wanted two versions; the ergonomics
  session's counter-proposal was retained).
- **31 Oct 2026 — the initial module, minimal, before the 6 Nov freeze ends** (the user: « il est urgent d'avoir le module
  initial, même minimaliste »; the only new code allowed until 6 Nov). Lot 2 reduced: list, search, family filter, Choisir, Tirer
  au sort, « Préparer ce vol »; the mission shown as a flat summary. Left for later: the envelope and the reader (§ 5), the
  assignment and « affectée » (§ 6), the filter by aircraft category. Owner of the code: Features SOG.
- **31 Oct 2026 — the mission's points go to Fuel as ICAO coordinates.** The SPEC wanted the ids kept as point names; the route
  text of Fuel looks a name up in aerodb first and keeps the flight's own position only as a fallback, and its normalisation
  rewrites « PT1 lat lon » as « PT1 »: an invented name of a mission (PT1, TARGET, RDV-1, the last not even a valid name) could
  then land on a real point elsewhere. Coordinates to the minute (≈ 1 NM) are exact enough for a mission's turning points; the
  names come back with the Map's drawing of a mission (lot 4).
- **31 Oct 2026 — `flight.mission` is a field of Fuel's** (`CF.FUEL_FIELDS`), written by Fuel's door only; the report and the
  flight log may read it later (no consumer yet: a debt, not a rule).
- **30 Oct 2026 — the rendezvous belongs to the assignment.** Dated rendezvous and the crew's channels (Discord, SRS,
  JoinFS…) are assignment data written by the CPCO, shown with Ouvrir / Copier, readable by every pilot of the airline
  (the fleet's access model); a session password is a known limit, said in the help.
