# aircraft — specification

The company's aircraft and the pilots' own, edited in the Maintenance application (and, for a pilot's own aircraft, on the pilot's
terminal): the fleets and the performance sheets. Level Complet (3); one module, `modules/aircraft/`. The rules of V3_SPECIFICATION
§ 10.35. Why each rule is so, with its date: [DECISIONS.md](DECISIONS.md). Each rule names its case of `tests/v3` (area M,
`tests/v3/cases/aircraft.py`), or says « no case »; a rule still to build names its lot (« L2 ») and its case is written with it. A rule
with neither a case, nor code, nor a lot is a debt in DECISIONS.

**Vocabulary.** A **terminal** is a phone, a tablet or a computer. An **aircraft** (« appareil ») is a registered airframe. A **sheet**
(« fiche appareil ») is a generic type + variant, instantiated to make an aircraft.

**Files**: `module.js` (the screen, the fleets), `fleet.js` (the fleet's pure rules: normalise, match, upsert, retire, changed fields,
schema 1 read), `sheets.js` and `sheets_texts.js` (the Fiches view), `perf_prompt.js` (the text of the ChatGPT request). The sheets'
pure code (formats, completion, merge, schema `PROFILE_FIELDS`) and the registry are aerodb's (`aircraft().lib`, `frame/aerodb/`, its lot
L0).

## 1. Scope

- **In**: the shared fleet `airline/fleet.json` and the personal fleet `pilot/<TRI>/fleet.json` (L3) — list, add, edit, retire; the
  performance sheets `aircraft/sheets/<id>.json`, edited in a form built from the schema, with their sources always previewed before a
  write. **The one editor of the sheets**: Fuel's Sheets screen is a read-only list that links here (fuel SPEC § 9.8, F79).
- **Out**: engine or performance values on an aircraft; V2's « types appris » and « fusions »; users and rights; the airline's fleet
  page, pasted in the website module.

## 2. One screen, two views

`meta = { id: 'aircraft', apps: ['maintenance'], level: 3, title }`, « Appareils » in Maintenance's rail. Two views in one row of tabs
(`f-tabs`, `data-view="fleet" | "sheets"`, `aria-pressed`): **Flotte** and **Fiches**; the last one is kept on the terminal
(`cache/aircraft/ui.json`) (M6). `#aircraft?sheet=<id>` opens the Fiches view on that sheet's editor (M10). A row opens its editor in
place of the list (one card, « Retour » goes back), one editor at a time; the cards are marked `data-pane`.

| View | What it shows |
|---|---|
| **Flotte** | a search; the aircraft (one row each: registration, sheet, callsigns, base, state), seven then « N autres », « Ajouter » (M1); the personal ones marked (L3); the retired folded under « Retirés (n) » (L1); « Vus dans vos vols » (L4) |
| **Fiches** | a search; the sheets by family (helicopters, turboprops, jets, pistons, others), what each lacks, then the company's types without a sheet; « Importer un fichier », « Coller un texte », « Nouvelle fiche » (M6) |

## 3. The aircraft (an instance of a sheet)

- **Fields** (schema 2 of `fleet.json`, L1): `registration` (the key, unique in its fleet), `sheetId` (the sheet it instantiates; empty:
  the type's estimate), `type` and `variant` (as the site or the report gave them, read-only text), `callsigns` (a list, cleaned:
  capitals, no duplicates), `base`, `operator`, `tacticalNumber`, `number`, **`state`** (`service`, `maintenance`, `retired`),
  **`maintenance`** `{ status, due, note }` (a text, a calendar due date shown when set, a note), **`events`** (the history, § 3 bis),
  `location` / `locationAt` (read-only: the site gives them). No performance field: an airframe that differs from its type is another
  variant, another sheet. Later, never in a sheet: the flight-plan identity of the airframe (equipment of item 10, transponder, PBN,
  SELCAL, item 19) (§ 10.35; not yet).
- **Schema 1 read** (L1): `operational: false` reads as `state: 'maintenance'`, `true` or missing as `service` (`retired` only comes from
  a gesture); `type` and `variant` kept as given; `sheetId` the type's sheet when one exists, else empty (the type's estimate); the file
  is written in schema 2 at its next write, by either writer.
- **Hours** (L5): not typed — the hours of the acquisition event plus the block minutes of the logged flights with this registration
  after the acquisition date, a flight counted once per (registration, date, off-block time). A shared aircraft's flights come from the
  airline's reports (`cr/`) only; a personal aircraft's from its pilot's own log (`pilot/<TRI>/`). Maintenance never reads another
  pilot's log.

## 3 bis. History, maintenance and costs (L6, L7)

- **History** (L6): `events[]` `{ kind, date, hours, note, cost }` holds only what a person types in Maintenance (or, for a personal
  aircraft, on the pilot's terminal): `acquisition` (the hours on the counter when it joined: not a flight, so it never counts in a
  pilot's hours, a report or the statistics), `check` (light inspection), `overhaul` (major inspection), `state` (a change of state).
  The history is the only writer of the counters. **No pilot terminal writes `airline/fleet.json`**: its writers stay Maintenance and the
  website's paste.
- **Derived, never written** (L6): a **hard landing** is declared by the pilot in the report (a box and a note in the report form; `cr/`,
  or the pilot's log for a personal aircraft) and read into the history like the hours; a **derogation** is computed at reading: a flight
  is derogatory when, at its off-block time, the hours since the last check (or overhaul) are at or above the sheet's threshold, or a hard
  landing came before it with no overhaul since. Shown in the history and in Flotte, never stored.
- **Due** (L6): hours since the last check / overhaul = hours − the counter of the last event of that kind; thresholds on the **sheet**
  (`maintenance: { checkEveryH, overhaulEveryH }`, aerodb L0 bis), company defaults in `airline/settings.json` (`maintenance.defaults`,
  written by Réglages › Administration « Coûts et maintenance »; read here). A check is due at its threshold, an overhaul at its
  threshold or at once after a hard landing; only an overhaul clears a hard landing. Flying beyond is allowed and said: Flotte's row says
  « révision dépassée de n h » (orange), Fuel's aircraft choice says it under the aircraft; no blocking, no right. A calendar due date is
  shown when set; no calendar threshold is computed.
- **Costs, data only** (L7): `cost` on an event; `hourlyCost` on the sheet (aerodb L0 bis; company default in settings); the fuel price
  `fuel.price { value, per: 'L' | 'kg', currency }` in settings. A flight's cost = block hours × hourly cost + fuel × price, where the fuel
  is the report's (`fuelUsed` from `fuel.start` and `fuel.block` or `fuel.landing`, in the report's unit; when it is not the price's, the
  sheet's `fuelDensityKgPerL` (aerodb L0 bis), else the company default for that fuel in settings, else no fuel cost, said, never guessed) or, for the flight under way or planned only, Fuel's trip fuel, shown as « estimation
  (plan) ». Nothing is summed; the financial balance is a later roadmap item.
- **Editor**: registration, the sheet (L2: chosen in a list, § 4), callsigns, base, operator, tactical number, state, maintenance, the
  history (L6); today the type is free text with its line « type absent de la base » (M2), and « En service » a box (M3; becomes
  the state, L1).
- **Edit**: the changed fields are listed before the write (« 2 champs changés : … »); the fields the editor does not carry are kept;
  one aircraft changes, the others are untouched; « {r} enregistré… » once written (M3).
- **Retire** (L1): « Retirer » asks, then sets `state: 'retired'`; the aircraft stays in the file with its hours and history (the shared
  fleet keeps its registration, so it is never proposed again as « seen in your flights »), folded under « Retirés (n) ». « Supprimer de
  la flotte » (a typing error) asks, then takes it out of `aircraft[]`, and refuses an aircraft that has logged flights (« a des vols :
  retirez-le plutôt »; the flights of the reports `cr/` for the shared fleet, of the pilot's log for the personal one). Today « Retirer »
  takes it out after a question, its sheet kept (M4, which changes with L1).

## 4. Adding an aircraft: choose, then fill

- **Today**: an empty editor; « Enregistrer » writes; a registration already in the fleet is refused and said (M2).
- **L2**: step 1, choose the sheet in the list (a search; « Nouvelle fiche » when the type is missing, then back to step 1); step 2, the
  aircraft's own fields; « Enregistrer ». From a sheet's editor, two gestures: « Créer un appareil » (step 2 with this sheet chosen) and
  « Utiliser pour un vol » (Fuel with the sheet alone, § 7).

## 5. The fleets

- **The shared fleet** `airline/fleet.json`, edited in Maintenance › Appareils. Two writers, aircraft (one aircraft at a time) and the
  website's paste; both declare `{ prefix: 'airline/fleet.json', merge: 'record' }`, and both move to schema 2 together (L1). Each write
  here reads the file just before, changes one aircraft and stamps `updated_at` and `by` (M2, M3). A site paste after an edit keeps what
  the page does not carry (website's rule; no case here).
- **The personal fleet** `pilot/<TRI>/fleet.json` (L3): the pilot's own aircraft, the same editor on the pilot's terminal; the box
  « personnel » chooses where an aircraft lives. An aircraft lives in one fleet; moving it is a retire + add, said. The same registration
  in both: the shared one wins for reading, the personal duplicate is flagged « déjà dans la flotte partagée — retirer de la mienne ».
  Said limit: readable by every pilot of the airline, as every file of the repository. Fuel's aircraft list shows both, the personal
  ones marked.
- **Seen in your flights** (L4, « lazy » as in V2): in Flotte, the registrations of the logged flights that are in no fleet, with the type
  the report named, each with « Ajouter » (step 2 pre-filled: the registration, the sheet guessed from the type when one exists; the
  personal fleet by default on a pilot's terminal, the shared one in Maintenance). Nothing is written before « Enregistrer »; the
  flights keep their registration as text.

## 6. The sheets (`aircraft/sheets/<id>.json`)

- **A sheet is a type + variant, without registration** (L0, aerodb): its id is the type (`C30J`) or the type and a variant
  (`C30J-<VARIANT>`, capitals `[A-Z0-9-]`, unique); the variant's label is free; it holds the performance and nothing of an airframe.
  « Immatriculation » and « Indicatif » are not in `PROFILE_FIELDS`. An existing sheet keyed by a registration is read as a variant
  « TYPE · F-XXXX », nothing lost nor hidden; « Convertir en variante » is an explicit gesture (L2). The V2 mirror keeps being written
  as is until V2 is off.
- **One writer**: every write goes through `aerodb.aircraft().sheets.put(sheet, { source })`: the changed fields are stamped (`_fields`:
  source and date), the old values kept (`_kept`), the V2 mirror follows. The module never writes `aircraft/sheets/` itself (M8).
- **Every write is reviewed**: whatever the source, the result is shown field by field (old → new, ticked; a field already filled that
  a completion would replace is unticked); nothing is written before « Appliquer »; an unticked field keeps its value; one sheet at a
  time (M8, M9, M13).
- **The form follows the schema**: `PROFILE_FIELDS` gives the groups and fields, `maxCrosswindKt` included; the RPM / fuel-flow table is
  its own block, editable on a computer, read on a phone; under each filled field its origin and date (`<small data-origin="<path>">`,
  « source · dd/mm », the kept values in its title); the fuel fields carry the sheet's unit; airframe and propulsion that aerodb's
  types base gives show « auto · … » and stay empty in the sheet (M7).
- **Sources**: an edit, stamped `edit` (M8); « Importer un fichier » (`.csv`, `.json`, `.lnmperf`, `.xml`, `.txt`) and « Coller un
  texte », stamped `import` (M13, M9; the formats: F10); a ChatGPT reply under the request (`perf_prompt.js`), stamped `chatgpt` (M15);
  « Compléter depuis une autre fiche », the empty fields only (M14); « Compléter (EUROCONTROL) », stamped `eurocontrol` (no case).
- **New sheet**: « Nouvelle fiche » asks a code, written in capitals; « Créer la fiche » of a company type takes its code without asking;
  a type the registry does not know is a sheet with that id, nothing more; then the review (M12).
- **Remove**: a question, then `sheets.remove(id)` (M11). **Export**: « Exporter .lnmperf » (refused with the empty fields Little
  Navmap needs) and « Exporter JSON », as downloads (no case).

## 7. A flight with an aircraft or a sheet alone

`flight.aircraft` is `{ registration, … }` (its sheet read through the fleet) or `{ sheetId, type }` without registration — the shape Fuel
already reads as « other type »; no new key in `current_flight`, shared with the Map and the Report. « Utiliser pour un vol » writes the
second (L2, with Fuel). The report keeps a registration as typed when it is in no fleet.

## 8. Rules of the frame

- `meta.reads`: `airline/`, `cache/aircraft/` (and `cr/` for the flights of an aircraft, L1 and L5; `pilot/<TRI>/` for the personal
  fleet and its pilot's log, L3); the sheets and
  the types through `ctx.aerodb` only. `meta.writes`: `{ prefix: 'airline/fleet.json', merge: 'record' }`, `{ prefix: 'cache/aircraft/',
  policy: 'cache' }` (and the personal fleet, L3); the sheets through aerodb. `meta.files` lists every file it imports (I26).
- Texts `[fr, en, de, es]`; 44 px targets; `ctx.ask` for every removal; no native dialog (M4, M11).
- **On a phone**: no horizontal overflow at 390 px; the fleet's rows are 44 px, the list shows its seven rows with search, « Ajouter » and
  « N autres », nothing else; the sheet form has two columns at most (150 px a cell), each field at its own height, a checkbox at its
  size; a row of the sheets list gives its text the width, its actions go under it below 480 px of module (M5, standard and cupertino).
- A status line in `cache/aircraft/status.json` (frame INTEGRATION § 10.0): « N appareils, M fiches[, K types de la flotte sans fiche] »,
  shown in Maintenance's status block, linked to `#aircraft`; written only when it changes (M6).
- Help chapter `modules/aircraft/help/{fr,en,de,es}.md`, anchors `aircraft-…` (the help's own cases).
