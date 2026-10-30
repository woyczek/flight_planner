# aircraft — specification

The company's aircraft, edited in the Maintenance application: the fleet and the performance sheets. Level Complet (3); one module,
`modules/aircraft/`. Why each rule is so, with its date: [DECISIONS.md](DECISIONS.md). Each rule names its case of `tests/v3` (area M,
`tests/v3/cases/aircraft.py`), or says « no case »; a rule with neither a case nor code is a debt in DECISIONS.

**Files**: `module.js` (the screen, the fleet), `fleet.js` (the fleet's pure rules: normalise, match, upsert, retire, changed fields),
`sheets.js` and `sheets_texts.js` (the Fiches view), `perf_prompt.js` (the text of the ChatGPT request). The sheets' pure code (formats,
completion, merge, schema `PROFILE_FIELDS`) is aerodb's `aircraft().lib` (`frame/aerodb/sheets.js`).

## 1. Scope

- **In**: the fleet `airline/fleet.json` (list, add, edit, retire); the performance sheet of each type or aircraft,
  `aircraft/sheets/<id>.json`, edited in a form built from the schema, with its sources (a file, a pasted text, a ChatGPT reply,
  another sheet, EUROCONTROL) always previewed before a write. **This is the one editor of the sheets**: Fuel's Sheets screen is a
  read-only list that links here (fuel SPEC § 9.8, F79).
- **Out**: V2's « types appris » and « fusions » (a type unknown to the registry is a sheet with its own id, nothing else is
  learned); users and rights; the airline's fleet page, which stays pasted in the website module (§ 3).

## 2. One screen, two views

`meta = { id: 'aircraft', apps: ['maintenance'], level: 3, title }`, « Appareils » in Maintenance's rail. Two views in one row of
tabs (`f-tabs`, `data-view="fleet" | "sheets"`, `aria-pressed`): **Flotte** and **Fiches**; the last one is kept on the device
(`cache/aircraft/ui.json`) (M6). `#aircraft?sheet=<id>` opens the Fiches view on that sheet's editor (M10). A row opens its editor in
place of the list (one card, « Retour » goes back), one editor at a time; the cards are marked `data-pane`.

| View | What it shows |
|---|---|
| **Flotte** | a search, the aircraft (one row each: registration, type, callsigns, base, « hors service »), seven then « N autres », « Ajouter » (M1) |
| **Fiches** | a search, the sheets by family (helicopters, turboprops, jets, pistons, others), what each lacks, then the company's types without a sheet; « Importer un fichier », « Coller un texte », « Nouvelle fiche » (M6) |

## 3. The fleet (`airline/fleet.json`)

- **Schema** (website SPEC § 3): `{ schema: 1, updated_at, by, aircraft: [{ operator, type, variant, registration, tacticalNumber,
  number, callsigns: [], base, operational, location, locationAt }] }`.
- **Editor**: registration (unique, the key), type (free text; under it, the base's name of the type or « type absent de la base »,
  never refused), variant, operator, callsigns (a list, cleaned: capitals, no duplicates), base, tactical number, « En service ».
  `location` / `locationAt` are shown read-only (the site gives them) (M2, M3).
- **Add**: an empty editor; « Enregistrer » writes; a registration already in the fleet is refused and said (M2). **Edit**: the changed
  fields are listed before the write (« 2 champs changés : … »); the fields the editor does not carry (`number`, `location`) are kept;
  one aircraft changes, the others are untouched; « {r} enregistré… » once written (M3). **Retire**: a question (« Retirer F-RAJA de
  la flotte ? Sa fiche de performances, s'il en a une, est gardée. »), « Non » writes nothing, « Oui » takes it out of `aircraft[]`,
  nothing else (M4).
- **Writers**: two modules write this file, website (the pasted page) and aircraft (one aircraft at a time); both declare `{ prefix:
  'airline/fleet.json', merge: 'record' }` (frame INTEGRATION § 3). Each write here reads the file just before, changes one aircraft
  and stamps `updated_at` and `by` (M2, M3). A paste of the site's page after an edit keeps what the page does not carry (website's
  rule; no case here).

## 4. The sheets (`aircraft/sheets/<id>.json`)

- **One writer**: every write goes through `aerodb.aircraft().sheets.put(sheet, { source })`: the changed fields are stamped
  (`_fields`: source and date), the old values kept (`_kept`), the V2 mirror follows. The module never writes `aircraft/sheets/` itself
  (M8).
- **Every write is reviewed**: whatever the source, the result is shown field by field (old → new, ticked; a field already filled
  that a completion would replace is unticked); nothing is written before « Appliquer »; an unticked field keeps its value; one sheet
  at a time (M8, M9, M13).
- **The form follows the schema**: `PROFILE_FIELDS` (group, label, path, type: text, number, bool, select, textarea) gives the groups
  and fields, `maxCrosswindKt` included (« Piste et alternat », kt); the RPM / fuel-flow table (`rpmFuelCurve`) is its own block,
  editable on a computer, read on a phone. Under each filled field, its origin and date (`<small data-origin="<path>">`, « source ·
  dd/mm » from `sheets.origins`, the kept values in its title). The fuel fields carry the sheet's unit (kg / lb). Airframe and
  propulsion that aerodb's types base gives show « auto · … » and stay empty in the sheet (M7).
- **Sources**:
  - an edit in the form, stamped `edit` (M8);
  - « Importer un fichier » (`.csv`, `.json`, `.lnmperf`, `.xml`, `.txt`) and « Coller un texte », read by aerodb's readers, stamped
    `import` (M13, M9; the formats: the sheets bench, F10);
  - a ChatGPT reply pasted under the request (« Copier la demande ChatGPT », « Demande pour les champs vides »: `perf_prompt.js`),
    stamped `chatgpt` (M15);
  - « Compléter depuis une autre fiche »: only the empty fields, fuel converted to the sheet's unit (M14);
  - « Compléter (EUROCONTROL) »: the type's EUROCONTROL record, stamped `eurocontrol` (no case).
- **New sheet**: « Nouvelle fiche » asks a code (`ctx.askText`), written in capitals; « Créer la fiche » of a company type takes its
  code without asking; a type the registry does not know is a sheet with that id, nothing more; then the review (M12).
- **Remove**: a question (« Supprimer la fiche « {n} » de la base partagée ? »), then `sheets.remove(id)` (M11).
- **Export**: « Exporter .lnmperf » (refused with the list of the empty fields Little Navmap needs) and « Exporter JSON » of the sheet in
  the editor, as downloads (no case).

## 5. Rules of the frame

- `meta.reads`: `airline/`, `cache/aircraft/`; the sheets and the types through `ctx.aerodb` only. `meta.writes`: `{ prefix:
  'airline/fleet.json', merge: 'record' }`, `{ prefix: 'cache/aircraft/', policy: 'cache' }`; the sheets through aerodb. `meta.files`
  lists every file it imports (I26).
- Texts `[fr, en, de, es]`; 44 px targets; `ctx.ask` for every removal; no native dialog (M4, M11).
- **On a phone**: no horizontal overflow at 390 px; the fleet's rows are 44 px, the list shows its seven rows with search, « Ajouter »
  and « N autres », nothing else; the sheet form has two columns at most (150 px a cell), each field at its own height, a checkbox at
  its size; a row of the sheets list gives its text the width, its actions go under it below 480 px of module (M5, standard and
  cupertino).
- A status line in `cache/aircraft/status.json` (frame INTEGRATION § 10.0): « N appareils, M fiches[, K types de la flotte sans
  fiche] », shown in Maintenance's status block, linked to `#aircraft`; written only when it changes (M6).
- Help chapter `modules/aircraft/help/{fr,en,de,es}.md`, anchors `aircraft-…` (the help's own cases).
