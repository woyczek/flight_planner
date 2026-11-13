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
- **10 Nov 2026 — a mission without `airline` is personal** (user, 15 h 50: « toutes les missions sont « ITF », alors qu'en vrai, elles
  sont perso »; his index has « itf » first, no mission names an airline, so the rule of 9 Nov put them all in ITF): `MS.ownerOf(row)`
  is the code the mission names, else `perso`, never the first airline of the index; « Personnel » lists them instead of « pas de
  missions de compagnie ». `MS.missionsFor(rows, code)` is the same rule for Settings' « n missions préparées ». N17 (itf first in the
  index: a mission without the field is under Personnel, not under itf; `airline: defa` under defa); counter-test on origin/v3: the
  mission without the field listed under itf. N8 adapted.
- **10 Nov 2026 — « fichier illisible » on most missions: the registry's first file was a summary** (SOG-0212 (a), user: « beaucoup de
  « fichier illisible » »). Survey of his repository, read only on this machine (the reading chain of the module run in node, nothing
  copied): 153 registry rows, 89 read, 62 « illisible (chemin refusé dans le registre) », 2 missing (G-001, G-002: no `G_SURVEY`
  folder), no YAML error. The 62 rows list `files: [summary<ID>.md, mission<ID>.yaml]` and `readRegistry` took only the first entry,
  a `.md`, refused as a mission file; 50 of them (F-071…, M-011…) list only the summary and keep an old numeric id (« 71 ») that
  does not name the file. Now the first `.yaml` of `files`, else the file named after its folder (`F_FIRE/F-071` →
  `missionF-071.yaml`, the rule of `missionPath`), else `mission<ID>.yaml`: 151 of 153 read, the 2 missing said with their path. A
  YAML error is said at its line (« ligne 12 : … », js-yaml's reason). N18; counter-test on origin/v3: both « illisible ».
- **10 Nov 2026 — « Ajouter des missions » from YAML, without writing the registry** (SOG-0212 b, user: « rajouter rapidement la
  possibilité d'ajouter une mission (ou un pool de missions) depuis un yaml »). The shortest form that works: choose files or paste, see
  what is read and refused, « Ajouter (n) ». The registry (17 000 lines on the user's machine, written by the CPCO) is NOT rewritten,
  against the brief: rewriting it means a full re-dump (comments and layout lost) and a merge conflict with every CPCO export, while
  mission files absent from it are already listed at each display (SOG-0036); the added missions show at once. Existing missions are
  replaced only when ticked, at their own path (never a second copy elsewhere). Untrusted input: bounds, id and family rules, the
  path built from them. N19; counter-test on origin/v3: no « Ajouter des missions ».
- **10 Nov 2026 — the scope of the list: my airline, Personal, all** (SOG-0212 c). A native list above the search, the simplest form;
  the ownership rule is `MS.ownerOf`, the same as the list's; another airline's mission says its airline in a badge and can be prepared
  like any other (the flight is the pilot's). N20; counter-test on origin/v3: no scope list.
- **10 Nov 2026 — one id per mission: the folder's** (Simplification, after SOG-0212 a: 50 registry rows keep an old number « 71 »
  for the mission F-071). `readRegistry` takes the id the folder and the file say (`F_FIRE/F-071` → F-071) when it has the form of a
  mission id and differs from the registry's; the old one stays in `formerId`, found by the search; the registry (the V2 CPCO's data) is
  not touched. N21; counter-test on origin/v3: the list shows « 123 ».
- **10 Nov 2026 — a mission changes airline: on its sheet, in a batch, when adding** (SOG-0223, user: « il faut pouvoir changer une
  mission de compagnie. comme pour les appareils »; his 128 missions are now all personal). Only the `airline` field of the file changes,
  by a line edit checked by reading the result again (a full re-dump only when the check fails), so a CPCO file keeps its comments;
  codes from the index only (§ 10.36: never a typed code); the batch is the list shown (scope, family, search) with boxes, its files read
  before anything is written. The pure part (`move.js`) and the gesture (a list of airlines + « Personnel », said before writing) are
  meant to serve the aircraft later. N22; counter-test on origin/v3: no « Changer ».
- **12 Nov 2026 — the registry screen writes the registry** (SOG-0021 / Q-0021, CONCEPTION § 2 bis; it replaces the 10 Nov choice of never writing it, which held while only « Ajouter » needed it). `registry.js` (pure) + a « Registry » button / `#missions?view=registry` in the module. Choices: (1) the update **never removes a line without a readable file** (the file may not have arrived by synchronisation): it counts them and says « à retirer à la main »; it adds the repository missions, keeps one line per identifier (the one whose id is already the folder's, else the first) and replaces a former id by the folder's (the old one kept in `formerId`); (2) **before any write the registry is read again** and the write is refused (« le registre a changé », read again) if its lines are no longer those shown — another pilot may have written it; (3) the document read is **retouched where we act, everything else kept** (`flownAt`, `teams`, operation counts…), dumped with js-yaml with a short header comment; (4) an **unreadable registry is never rewritten** (update and edits off), an absent one is created from the files; (5) every text comes through `readRegistry` (paths by `safeFolder` / `safeFile`, never taken as written), titles escaped; series and number are whole numbers or empty. Counter-test on origin/v3: no « Registre » button (N27). Entry in Compagnie › Registre: for V3 Frame (a link to `#missions?view=registry`).
- **13 Nov 2026 — the registry, one line per mission: the V2 model** (SOG-0286, the user: « trop de lignes. prendre le modèle de la v2, qui
  était efficace »; the ergonomist's brief): the V2 page (apps/cpco/mission_registry.html, shared/mission_registry.js) is a sortable table,
  one row per mission (Mission, Type, Title, Status, Est. time, CR, Generated), sorted by series then identifier, the family filter (« Type »)
  first, the sheet when a row is opened. The V3 screen now does the same: a folded line (state sign, identifier, title, family · series,
  origin → destination; two lines of text at most at 390, one on a wide screen), the rest at the unfold (state in words, number, operation,
  path, « Corriger », « Retirer »); the lines to check first, then by series and identifier; family filter and search at the head; sixty
  lines before « N autres » (a table, not the seven of a list); the explanation of the screen moves to the tooltip of its title and to the
  help (twenty missions seen at 1 280 × 800). Nothing changes in the data nor in their guards. N43 (red before: 7 lines of 24).
- **13 Nov 2026 — the registry read bounded, and « not read » said** (Sécurisation, audit 174 on db091c505): `readRegistry`
  (frame/lib/mission.js) only folded the spaces; the identifier is now cut at 12 signs (the X-001A form has 6; an old « BFM-001A » or
  « 71 » fits), the title and the operation at 120, origin and destination at 80. Older than SOG-0286: beyond `REG_READ_MAX` (500 files)
  `regLoad` marked the lines « ok » without reading them; they are now « notread » (sign « ? », « fichier non lu (au-delà des 500
  premiers) », listed last), the count says « 500 fichiers lus sur N », and the plan of « Mettre à jour » does not count them as lines
  without a file. N44 (red before on both; counter-test of the limit with the old module.js: 503 « ok »).
- **13 Nov 2026 — the display may shorten, the identity never** (Sécurisation, audit 176 on 81148257a; amends the entry above):
  `readRegistry` cut the identifier at 12 while `planOf` / `applyPlan` compare `cut(raw.id, 40)`; a line of 13 to 40 signs under a folder
  not of the X-001A form became « ancien identifiant » (the plan rewrote its id to 12 signs) and two lines sharing their first 12 became
  doubles (the second removed) — a bait any pilot could set. The identifier keeps 40 signs in the reader (what registry.js compares;
  `entryOfMission` already did, Fuel's `r.id === missionId` follows the reader); the registry line shortens it to 12 for display only,
  whole in the tooltip. N45 (red before: former [0], dup [1], the plan changed the registry).
- **13 Nov 2026 — the summary in full on the first page** (SOG-0291, written by Features SOG): the user read the summary clamped at two
  lines (SOG-0051, `.ms-summary` line-clamp) as « un extrait de la description longue ». The first page now shows `summary` whole under
  its name (« Résumé », an `h3` inside the same block: still seven elements); beyond `SUM_MAX` = 600 signs it is cut at a word with « … »
  and « Lire la suite » opens the Detail, which then carries it in its own « Résumé » section. The Detail's « Description » carries
  `detailed_description` (and the notes) only — the summary is no longer repeated there. N46 (red before: no « Résumé », the text
  clamped); N9 now asks for the summary uncut.
- **13 Nov 2026 — a family is chosen by its letter, and its subtype** (SOG-0292, written by Features SOG): the family lists of Missions
  and of the Registry say « T · AIRLIFT · Transport aérien / logistique » — the letter (`familyLetters`, the table of the themes; for a
  family outside the table, the most frequent letter of its identifiers « X-001A »), then `familyText` — sorted by letter, letterless
  families last. One function (`famFilterHtml`) for both screens; once a family with two subtypes or more is chosen, a second list
  « Sous-type » sits beside it (the theme's series label when known: STRATEGIC → « Transport stratégique »; else the raw value, cut at 60
  for display), and changing the family drops the subtype. « Corriger » edits no family today (title, series, number, operation), so it
  has no list to change; the editor's Famille field (SOG-0287) will take `famChoices`. The report's families (per airline, SOG-0041) are
  untouched. N47 (red before: « SAR · … » sorted by code, no subtype).
