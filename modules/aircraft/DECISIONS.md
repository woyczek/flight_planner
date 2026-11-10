# aircraft — decisions

- **31 Oct 2026 — the SPEC on § 10.35** (the user: « pas d'imat dans la fiche de base, c'est un type / variante ; l'ajout d'appareil,
  on doit pouvoir choisir ; créer un appareil lazy depuis les vols passés ; flotte perso et flotte partagée, les deux sur le git ; pas de
  paramètres moteur sur les appareils »; Simplification's counter-proposals and Features SOG's objections settled in § 10.35). Written
  before L1 as the state to reach, each rule still to build tagged with its lot (L0 AeroDB, L1–L5 here), today's rules with their case.
  Settled with Simplification for schema 2 of `fleet.json`: « Retirer » sets `state: 'retired'` and keeps the aircraft (hours, history,
  registration kept, so never re-proposed as seen in the flights), folded under « Retirés (n) »; « Supprimer de la flotte » is a second
  gesture for a typing error, refused for an aircraft with logged flights; schema 1 `operational: false` reads as `maintenance`, `true` or
  missing as `service`, `retired` only from a gesture; the site's `type` / `variant` kept as given; `sheetId` the type's sheet when one
  exists, else empty. M4 changes with L1. Objections answered (§ 10.35): the aerodb half is L0 (AeroDB's); registration-keyed sheets read as
  variants, converted only by a gesture; ids `C30J` / `C30J-<VARIANT>`; hours counted once per (registration, date, off-block), from `cr/`
  for the shared fleet and the pilot's own log for the personal one, never another pilot's log; the flight-plan identity of an airframe
  later on the aircraft, never in a sheet; a sheet-alone flight is `flight.aircraft = { sheetId, type }`, no new key; the shared fleet wins
  over a personal duplicate; both writers of `fleet.json` move to schema 2 together.
- **31 Oct 2026 — history, two kinds of maintenance, costs (the user's second and third requests; § 10.35 L6, L7)**: `events[]` holds
  what a person types in Maintenance (acquisition — the counter's hours when the aircraft joined, not a fake flight, which would count in a
  pilot's hours, the reports and the statistics —, check, overhaul, state change) with their cost; the « hours before the log » field of
  the first text became the acquisition event. Features SOG's objection, accepted: **no pilot terminal writes `airline/fleet.json`**
  (its merge rule is `record`, the newest file wins: events appended by several terminals would erase each other and Maintenance's
  edits); the hard landing is declared in the report (`cr/`) and read into the history, the derogation is computed at reading (at the
  flight's off-block, hours since the last check or overhaul at or above the sheet's threshold, or a hard landing before with no
  overhaul since), shown, never written. Thresholds, `hourlyCost` and `fuelDensityKgPerL` on the sheet (aerodb L0 bis); company defaults,
  the fuel price and the currency in `airline/settings.json`, written by Réglages (a card « Coûts et maintenance »), read here. Only an
  overhaul clears a hard landing; a calendar due date is shown when set, no calendar threshold computed. The fuel of a flight is the
  report's (`fuelUsed`, no new report field), Fuel's trip fuel only for the flight under way or planned (« estimation (plan) »); without
  a density when the units differ, no fuel cost, said. Nothing summed: the balance is a later roadmap item.
- **30 Oct 2026 — the SPEC as a state** (Simplification, the discipline of Fuel's 3a / 3b: each rule cites its case or « no case »,
  what became false removed). Removed as false: the **Registre** view (never built: the Flotte and Fiches tabs only; a registry search
  stays a debt), the type field's **completion** from the registry (it is free text with a line under it, « type absent de la base »),
  `aircraft/` in `meta.reads` (it reads `airline/` and `cache/aircraft/`), the **count** of the fleet's aircraft in the removal question
  (it names the sheet only), the status line linking to the Fiches view (it links to `#aircraft`); the history moved here or dropped:
  « As built », the editor « moved from Fuel, not rewritten », § 5 « Fuel's Fiches view » (done: Fuel's list is read-only, F79), the
  case plan and the order of the steps. New cases for the writes that had none: M12 (new sheet, a company type's sheet), M13 (a file
  imported), M14 (completion from another sheet), M15 (a ChatGPT reply). **No case** (debts): the EUROCONTROL completion (no invented
  APD record in the fixtures yet), the two exports, the RPM table read-only on a phone, a site paste after an edit (website's rule), a
  registry search view.
- **30 Oct 2026 — the module, the fleet first** (§ 10.34 lot A2, Features SOG; SPEC agreed by Simplification). Order: the
  schema field `maxCrosswindKt` (586a25b0f, in frame/aerodb/sheets.js since the AeroDB session is closed), then this shell and
  the Flotte view, then the sheets, the imports, and the removal of Fuel's editor. The editor opens in place of the list,
  not in the frame's sheet primitive (the map's draggable panel). Every write of the fleet reads the file just before and
  changes one aircraft (the website module writes the same file from a pasted page; `record` on both sides). A type the
  base does not know is kept and said (« Type absent de la base »), never refused; the registration is the key and must
  be unique. Seven rows then « N autres » (seven elements per screen). Cases M1–M5 (area M, reserved by V3 Frame).
- **30 Oct 2026 — the sheets editor, moved from Fuel** (§ 10.34 lot A2, step 3). The « Fiches » view is Fuel's code moved to
  `modules/aircraft/sheets.js` (`createSheetsView(host)`) and `sheets_texts.js`, **not rewritten**: the logic stays aerodb's
  (`AeroDBSheets`, `sheets.put` / `remove`), Fuel's globals became the closure state, the `fu-` CSS classes became `ac-`. Fuel is
  untouched (its editor is removed in a later commit, SPEC § 5), so the two editors coexist for now. Added: the origin and
  date under each filled field (`sheets.origins`; a field without a value shows none; an unstamped field shows aerodb's
  fallback « base V2 »), a search on the list, the tabs Flotte / Fiches kept in `cache/aircraft/ui.json`,
  `#aircraft?sheet=<id>` (consumed once), and the status line `cache/aircraft/status.json`. The cards of the two views carry
  `data-pane`, the tabs `data-view` (the M1–M5 selectors follow). Left out: « Utiliser » and « Depuis le dernier OFP »
  (a flight and an OFP are Fuel's, not Maintenance's). Cases M6–M11.
- **30 Oct 2026 — Fuel's editor removed** (step 5). Fuel keeps its « Fiches » list read-only, with « Utiliser » and links to
  `?app=maintenance#aircraft?sheet=<id>`; `perf_prompt.js` moved here (`git mv`). Details in modules/fuel/DECISIONS.md.
- **1 Nov 2026 — an import of several sheets, one review at a time but said** (the user pasted thirteen ChatGPT sheets: « bug », a
  review titled « Changements proposés » with no sheet, the English note proposed for replacement by a reply that describes itself).
  Each review of an existing sheet says « Changements proposés : <name> » and its rank i / n; an existing sheet without any change is
  passed without a click; « Passer cette fiche » writes nothing and goes to the next; the end notifies written / unchanged / skipped;
  « Annuler » drops the queue (before, the queue stayed and came back at the next « Appliquer » of anything); an existing `notes` is
  proposed unticked; the field « notes » is named ×4. Case M19.
- **1 Nov 2026 — the type field completes** (Simplification relaying the user: « aucune complétion sur le type », adding an H145): the
  list of Fuel's aerodrome fields (`modules/fuel/suggest.js`, the same component) under the Type field of the fleet editor; sources:
  the types of the base (`searchTypes`, prefix of the code or of a word of the model, case-folded) with « fiche <id> » when a sheet has
  that type, then the sheets whose id, name or type contains the text; seven at most. A choice writes the type code only: the fleet is
  schema 1 (no sheet field, `sheetId` waits for L1). Case M20.

- **2 Nov 2026 — the data read as written by any pilot** (security audit line 157): since § 10.36 (one project token per pilot, push on main) every file of data/ — `airline/fleet.json`, `aircraft/sheets/`, `missions/`, `airline/settings.json` — is read as written by any pilot: numbers bounded, keys by own(), texts through esc, never a path or an address taken as it is, an unreadable file said and ignored. Checked at every new reader. Here: the fleet and the sheets
  are shown through esc, written through `fleet.js` / aerodb (`sheets.put`, ids made safe by `fileOf`); the site's page addresses
  (`modules/website/model.js` `pageUrl`, read from `airline/settings.json`) are now links or readings only when they read as an http(s)
  URL without credentials (case M21; counter-test: without the check, `javascript:alert(1)/log` and `https://u:p@…` came through).
- **5 Nov 2026 — lot D** (Simplification's brief, fiches SOG-0011, 0014, 0023 a): the ChatGPT gesture lost with Fuel's editor
  (4044dc8ba) comes back as in V2: one button copies the request and opens chatgpt.com (copy first: a tab opened before takes the
  focus away and the clipboard refuses), M22. The two fuel fields explained under the field, the density refused out of 0.5–1.0
  (the bound of `PROFILE_FIELDS`, the same that `fuel_units.js density()` applies), M23. The JSON sheet is the only source; the
  module reads no `.lnmperf` but through its import; aerodb's automatic `.lnmperf` follow (`lnmAuto`) is reported to D4 — it may be
  why the user « remet sans cesse ses fiches à jour ».
- **5 Nov 2026 — an RPM curve that goes down is said** (SOG-0015, the ergonomics session): the first pair of RPMs where the flow goes
  down while the RPM goes up (the table's rows without altitude, and the cruise) is said above the table and its row is orange; the
  sheet is never corrected (the S210's 6 700 rpm row stays the user's). M24.
- **6 Nov 2026 — fuel read and typed in kg, lb, l or US gal** (SOG-0032, the ergonomics session's criteria): the editor showed the
  sheet's stored unit only. A choice of four units (mass / volume and their flows) converts at display and at reading through
  `frame/lib/fuel_units.js`; the stored unit never changes, an untouched field is compared with the text it was shown with and keeps
  its stored value (otherwise an lb sheet read in kg and saved would drift by rounding). The review still shows the stored values.
  M25; counter-test on 94849e74b: no unit choice (the case errors on the missing control).
- **6 Nov 2026 — curves per altitude are the rows sharing `altFt`** (SOG-0028, V3 spec § 10.37 C, challenged): the design asked for
  `cruise.curves = [{ altitudeFt, points }]`; the sheet already carries per-altitude rows (`rpmFuelCurve[].altFt`, the « ft » column,
  the ChatGPT template asks for it) and Fuel already interpolates on the rpm within an altitude, then between the two altitudes around
  the level (`FlightPerfModel.mapAt`). A second field would be two sources of one datum, so the curve of an altitude is its rows. Done
  today: the monotony hint of SOG-0015 per altitude (before, only the rows without altitude were checked), kept a hint, not a refusal
  (a sheet read from a file stays readable; SOG-0015's decision). Proposed for later, not done: the editor grouped by altitude, a
  `tasKt` per row, the lnmperf import / export of per-altitude rows (frame/aerodb/sheets.js, AeroDB's). M26; counter-test on b6c95e829
  (sheets.js of the base, texts kept): the 8000 ft curve going down is not said.
- **6 Nov 2026 — « Proposer depuis les mesures », step 1 without the launcher** (SOG-0052, the user: « intégrer l'appli
  fuelperformance en v3 … calculer les paliers, produire les courbes rpm / niveau / consommation, comparer avec la BDD, mettre à
  jour la fiche »). The phases come from the simulator module's CSV (never guessed); the FuelDashboard's reading, eligibility and
  weighted median are ported to `modules/stats/phases.js`, pure; the screen is a button and a ticked list inside the RPM table's card
  (no new card, rule 13), and the ticked points go to the draft only, so the ordinary review stays the one gate (JSON one source,
  SOG-0023). Not ported today: the dashboard's merging of neighbouring rpm groups, climb and descent proposals, the launcher reading
  the Output folder (step 2, AeroDB). M27; counter-test on ae008ef42 (sheets.js of the base): no picker (the case errors on it).
- **9 Nov 2026 — folding groups per altitude and a TAS per row** (SOG-0028 (3) and (4), the ergonomics session's decisions): the
  groups are a view of the same rows (no second field, the inputs keep their row index, so reading the editor is unchanged); one
  curve keeps the flat table, so a sheet without altitudes looks as before. `tasKt` is an optional key of a row, kept by
  `normalize`; Fuel reads it by the flow's rule (F102). The ChatGPT template does not ask for it (its schema unchanged). The lnmperf
  part (5) is a proposal to AeroDB: an .lnmperf has neither rpm nor altitude, so its import creates no row (it fills the cruise
  values, as today); its export takes the curve nearest `cruise.refAltFt` at the cruise rpm when two rows frame it. M28.
- **9 Nov 2026 — the Output folder through the launcher** (SOG-0052 step 2, AeroDB's job `stats/output`, 5f03149b8): called like
  `fetchProcedures` (`ctx.launcher.job('regen/job', { set: 'stats', verb: 'output', args })`), the module declaring the route; the
  status is asked once per editor opened on a computer screen; the texts read go through `measureTexts`, the computation the file
  picker uses too (no second path). File names from the launcher are bounded and checked before they are shown. M29.
- **9 Nov 2026 — « Courbes » in the RPM table's card** (SOG-0055, the ergonomics session's decision: the drawing lives in Appareils,
  the flight tool adjusts the flight, not the data). A fold of the existing card rather than a new card (the editor is already over
  seven elements; rule 13); inline SVG, colours from the frame's chart tokens so the design and the night follow; the measured points
  are the ones on screen (never kept). M30.
- **9 Nov 2026 — the fleet of the current airline** (V3 spec § 10.38 step 1): the path is the airline's `root` + `fleet.json`,
  checked by shape (never a path taken as is from data, audit 157); « Personnel » writes under `pilot/<trigram>/airline/perso/`, so
  the module declares `pilot/` like Fuel. The Fleet view of Maintenance is the « Compagnie › Flotte » of the lot (no company module).
  M32.
- **9 Nov 2026 — provenance as a mark, sources per card, explanations in the help** (SOG-0057, V3 spec § 10.43, the ergonomics
  session's decision after looking at the TBM 900 at 1280): twenty « base V2 · 11/01 » lines under the fields were the noise. The
  mark keeps the information one tap away; the card's « Sources » line says what the card is made of; the five-line explanations
  of SOG-0011 moved to the help with an anchor each. The warnings (monotony, measured deviation, « À compléter ») stay where they
  are. M33; counter-test on a18ffd53f: six provenance lines under the fields.
- **9 Nov 2026 — « Compléter depuis une autre fiche… » chooses nothing in advance** (SOG-0073, the user: « on choisit de modifier la
  caravelle, et c'est « douglas dc-3 » qui apparaît »): the select showed its first option as if it were the open sheet. A button and,
  on demand, the aircraft search (the Flight step's), the open sheet excluded. M34.
- **9 Nov 2026 — the unit in the module's sticky head, not in the frame's header** (SOG-0074, challenged and half accepted): the unit
  belongs to a sheet or a quote, not to the application; the editor's head stays at the top with the unit. M35.
- **10 Nov 2026 — whose fleet, and the name as the button** (SOG-0190, user: « dans la page de flotte, on ne sait pas de quelle compagnie on
  parle. … le bouton est à droite, la souris est à gauche… un simple titre cliquable suffirait »): the Fleet head says the airline and its
  kind (the source of SOG-0181); in Fiches the sheet's name opens it (the whole line too), the lone « Modifier » / « Créer la fiche » at
  the end of the line removed; « Ajouter » no longer pushed alone to the right (the 390 capture showed it on a line of its own). M37;
  counter-test on origin/v3: « Flotte » alone.
