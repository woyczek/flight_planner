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
- **1 Nov 2026 — « sans fichier » was the device, not the data** (the user: « beaucoup de missions sans fichiers »; 57 of the 59
  registry rows have their file, only G-001 and G-002 have none). The module read with `ctx.data.get`, which gives null at once for a
  file not yet on the device, and said « ne se lit pas » for all of them. Now `read(path, { wait: true })`, bounded, and three causes
  said apart (missing, late, unreadable); Fuel's door reads the same way. Case N5.
- **2 Nov 2026 — Missions in the Company application** (the user's decision of 1 Nov, V3 Frame 18e6f2694): `meta.apps: ['company']`;
  « Préparer ce vol » unchanged (`#fuel?mission=<id>`, the frame opens Fuel in Pilot); help ×4 says where each screen is.
- **5 Nov 2026 — the search reads more than the title** (SOG-0009; « code oasis » read as ICAO code by the ergonomics session): the
  registry already carries `type`, `subtype`, `callsigns` and `teams`; `readRegistry` keeps them as texts, bounded (20 entries, 80
  characters: the registry is written by any pilot), and the search reads them, no mission file opened. N6.
- **30 Oct 2026 — the rendezvous belongs to the assignment.** Dated rendezvous and the crew's channels (Discord, SRS,
  JoinFS…) are assignment data written by the CPCO, shown with Ouvrir / Copier, readable by every pilot of the airline
  (the fleet's access model); a session password is a known limit, said in the help.

- **2 Nov 2026 — the data read as written by any pilot** (security audit line 157, relayed by Simplification): since § 10.36 (one project token per pilot, push on main) every file of data/ — `airline/fleet.json`, `aircraft/sheets/`, `missions/`, `airline/settings.json` — is read as written by any pilot: numbers bounded, keys by own(), texts through esc, never a path or an address taken as it is, an unreadable file said and ignored. Checked at every new reader. Here:
  the registry's `folder` / `files[0]` were joined into the path of the mission file as they were (« ../pilot/ABC »…). Now
  `readRegistry` keeps a folder made of segments of letters, digits, `_`, `-`, `.` not starting with a dot, and a `.yaml` / `.yml`
  file; otherwise both are empty and the module says « chemin refusé dans le registre », Fuel's door refuses the mission. Bench N1
  (one check more), counter-test: without `safeFolder` the bench fails (12 / 13).
- **6 Nov 2026 — the registry follows the files** (SOG-0036, the ergonomics session's criteria): measured read-only on the user's
  `data/missions/` (6 Nov): the registry has 104 rows for 102 mission folders (2 rows without folder, G_SURVEY), none missing and no
  mission file newer than it; the 11 extra files are copies under `versions/`. So the « massive arrival » is the device's synchronisation,
  not a registry left behind. The module still lists a mission file no row names, read at the display (only those files: no button,
  no cost when the registry is complete); paths through `missionPath` (two safe segments, the file named after its folder), texts
  bounded (audit 157). « Plus récent que le registre » is not judged: `ctx.data.list` gives no date. N7; counter-test on 94849e74b:
  the 50 files are not listed.
- **9 Nov 2026 — the list follows the current airline** (V3 spec § 10.38 step 1): no filter before the migration (code `default`),
  so nothing changes for a repository without index; a mission without `airline` goes to the first airline of the index (the
  airline of today becomes it at the migration). N8.
- **10 Nov 2026 — categories read by the mission, carried by the flight** (SOG-0041, the readers' lot of § 10.38): the category is an id
  in the mission; its name and its load come from the airline's list (`forAirline`), never from the mission, so a mission cannot invent
  a category or a load. The report does not read the missions: Fuel writes `missionCategory` next to `mission` in the current flight
  (one more field of `CF.FUEL_FIELDS`), and the report reads it when the pilot takes that flight. N11, G7; counter-test on 4d96bf2f4:
  no filter, no load card.
- **10 Nov 2026 — the mission sheet in two levels** (SOG-0051, § 10.45): the second screen of a phone is a `history.pushState` on
  the same address (the frame remounts a module at every hash change, which would read the registry again and lose a draw); the
  browser's back fires `popstate` and the module closes the detail, then the mission. The Map is not in the Company application and
  its `elsewhere` only sends Fuel to Pilot: the links name the application (`?app=pilot#maps?…`), no frame change. The Map has no
  `zone` parameter yet (maps SPEC § 15): a zone link carries `zone=<id>` and, when a map provided is centred on that zone, `map=<file>`;
  `zone` is asked of BUGS SOG. A legacy PNG is read as bytes and shown only with the PNG signature. N9, N10; counter-test on 621aa3720:
  the sheet never opens in two levels.
- **10 Nov 2026 — the summary before the risks** (SOG-0051 refused at acceptance: « oui, mais la description courte, avant les
  risques »): the first page always gives the summary after the category line, two lines at most (`line-clamp`, « … », its whole text
  in the title); to keep seven elements (rule 13) the state « Volée le … » joins the category line; the detailed description stays in
  the detail. N9 checks the order, the two lines and a mission without a summary (no empty line); counter-test on origin/v3
  (85b356775): no summary on a mission with risks.
- **10 Nov 2026 — the acronym first** (SOG-0179, user: « on dirait que le nom abrégé a disparu. c'est pourtant comme ça que l'utilisateur
  mémorise une looooongue catégorie »): it disappeared with the V3 report (lot 2, 8a5a7e3db, and lot 4, 7ca8c5675, which listed
  `familyLabels` alone where the V2's `familyOptions` wrote « ${id} — ${label} »). A family is now « SAR · Récupération de personnel »
  everywhere it is said (report family list, Missions headings and filter), from one function of `modules/report/vocab.js`; the long
  name does not repeat the acronym (« HEMS / MEDEVAC » → « HEMS · MEDEVAC »). The acronym is the family's code; seven codes are words,
  not acronyms (AIRLIFT, AIRBORNE, MARITIME, SURVEY, COMMAND, COMBAT, SPECIAL): shown as they are, proposals sent to the ergonomist.
  N12; counter-test on origin/v3 (a3ac92f10): the code alone in the headings and the filter.
- **10 Nov 2026 — the family of the drawn mission** (SOG-0187, user: « tirer au sort une famille : il n'y a plus que le titre court »): the
  sheet's title kept the family's code alone; it now says « **SAR** · Récupération de personnel » on a line of its own under the title
  (famHtml, the function of the list headings). N15; counter-test on origin/v3: the code alone.
