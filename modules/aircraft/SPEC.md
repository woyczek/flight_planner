# aircraft — specification (V3 § 10.34, lot A2)

The company's aircraft, edited in the Maintenance application: the fleet, the performance sheets, the aircraft registry
read-only. Level Complet (3). One module, `modules/aircraft/`, Features SOG. Agreed with Simplification on 30 Oct 2026 (§ 5
decided: one editor, here).

## 1. Scope

- **In**: the fleet `airline/fleet.json` as a list with add / edit / retire; the performance sheet of each type or
  aircraft `aircraft/sheets/<id>.json` edited in a form built from the sheet's schema, with the imports of § 10.21 (OFP,
  `.lnmperf`, CSV, JSON, a ChatGPT reply) as sources and a preview before any write; the aerodb registry (types,
  registrations, callsigns) read-only with one search.
- **Out** (the user's decision, § 10.34): V2's « types appris » and « fusions »: a type unknown to the registry is a
  sheet with its own id, nothing else is learned. Users and rights, the Centre. The fleet page of the airline's site
  stays pasted in the website module (§ 3 below).

## 2. One screen, three views

`meta = { id: 'aircraft', apps: ['maintenance'], level: 3, title }`, verb « Appareils » in Maintenance's rail. Three views
in one row of tabs (`f-tabs`), the last one kept on the device (`cache/aircraft/ui.json`):

| View | What it shows (≤ 7 things at a time) |
|---|---|
| **Flotte** | a search, the list of aircraft (one row each: registration, type, callsigns, base, « hors service »), « Ajouter » |
| **Fiches** | a search, the sheets by family (helicopters, turboprops, jets, pistons, other), what each lacks (`sheetMissingFamilies`), « Nouvelle fiche », « Importer » |
| **Registre** | a search over the registry (`A.search`, `A.searchTypes`): types, registrations, callsigns, each with its source; read-only, a « Fiche » link when one exists |

A row opens its editor in place of the list (one card, « Retour » goes back), one editor at a time. The frame's sheet
primitive (§ 11 of frame/INTEGRATION.md) is the map's draggable panel: too much for a form in Maintenance. **As built**
(30 Oct 2026, step 3): the row of tabs (`f-tabs`, `data-view="fleet" | "sheets"`, `aria-pressed`) shows Flotte and Fiches; the
Registre view comes with its step. The cards of the two views are marked `data-pane`, the tabs `data-view`.

## 3. The fleet (`airline/fleet.json`)

- **Schema** (website SPEC § 3, unchanged): `{ schema: 1, updated_at, by, aircraft: [{ operator, type, variant,
  registration, tacticalNumber, number, callsigns: [], base, operational, location, locationAt }] }`.
- **Editor**: registration (F-XXXX, unique, the key), type (completion from the registry's types, a free code allowed:
  « type absent de la base » said, never refused), variant, operator, callsigns (a list), base, tactical number,
  « en service » (operational). `location` / `locationAt` are read-only here (the site gives them).
- **Add**: an empty editor; « Enregistrer » writes. **Edit**: the same editor; the changed fields are listed before the
  write (« 3 champs changés »). **Retire**: `ctx.ask` (« Retirer F-RAJA de la flotte ? »), then the aircraft leaves
  `aircraft[]`; its sheet, if it has one of its own, stays (said in the question).
- **Writers**: two modules write this file, website (the pasted page, its V2 merge) and aircraft (one aircraft at a
  time). Both declare `{ prefix: 'airline/fleet.json', merge: 'record' }` (frame/INTEGRATION.md § 3, shared prefix);
  each write reads the file just before, changes one aircraft and stamps `updated_at` and `by`. A paste after an edit
  keeps the edit for the fields the page does not carry (website's rule: extra callsigns, location date).

## 4. The sheets (`aircraft/sheets/<id>.json`)

- **One writer**: every write goes through `aerodb.aircraft().sheets.put(sheet, { source })` (aerodb SPEC § 5 bis):
  the changed fields are stamped (`_fields`), the old values kept (`_kept`), the V2 mirror follows. The module never
  writes `aircraft/sheets/` itself.
- **The form is built from the schema**: `A.lib.PROFILE_FIELDS` (group, label, path, type: text, number, bool, select,
  textarea) gives the groups and fields; the RPM / fuel-flow table (`rpmFuelCurve`) is its own block. Each field shows its
  origin and date (`sheets.origins(id)`: « édité le 30/10 », « lnmperf », « OFP ») and, folded, its kept values. Units:
  the sheet's `unit` (kg / lb) on the fuel fields. Values that aerodb's types base gives (airframe, propulsion) show as
  « auto : … » and stay empty in the sheet.
- **Fields Fuel reads and the schema lacks**: `maxCrosswindKt` (§ 10.30, the crosswind limit of the wind colours) is
  added to `PROFILE_FIELDS` (group « Piste et alternat », number, kt) — a change in `frame/aerodb/sheets.js`, agreed with
  AeroDB before this lot codes it. Any other field Fuel reads that the schema lacks is listed in the case A2-F (§ 7).
- **Imports as sources**: « Importer » takes a file (`.csv`, `.json`, `.lnmperf`, `.xml`, a SimBrief OFP) or a pasted text
  (a ChatGPT reply too); `A.lib` reads it (the same readers as today, `AeroDBSheets`); the result is a **preview**: per
  sheet, new or existing, and per field old → new with the source; nothing is written before « Enregistrer » for that
  sheet; a field the user unticks keeps its value. One sheet saved at a time.
- **New sheet**: an id asked (`ctx.askText`, a type code or a registration); a type the registry does not know is a
  sheet with that id, nothing more. **Remove**: `ctx.ask`, then `sheets.remove(id)`; aircraft of the fleet that used it
  fall back on their type's sheet (said in the question with their count).
- **Export**: « Exporter .lnmperf » and « JSON » of the sheet in the editor (download), as Fuel does today.
- **As built** (30 Oct 2026, step 3, `modules/aircraft/sheets.js` + `sheets_texts.js`): the code was **moved from Fuel, not
  rewritten** (`renderSheets`, `sheetGroups`, `onSheetsClick`, `renderEditor`, `readEditor`, `review`, `applyReview`,
  `importFiles`, `readText`, `download`, the text tables). Fuel's globals became the closure state of
  `createSheetsView(host)`; host = `{ ctx, body(), gone(), back(), changed() }`, api `{ load, render(id?), onClick, onInput,
  onChange, counts, editing, stop }`. Fuel's copy stays until its own commit (§ 5). Left behind on purpose: « Utiliser »
  (Fuel's flight choice) and « Depuis le dernier OFP » (no OFP in Maintenance; the pasted OFP still imports). Added: the
  origin line under each filled field (`<small data-origin="<path>">`, `source · dd/mm` from `sheets.origins`, the kept
  values in its tooltip), a search on the list, the tabs, `#aircraft?sheet=<id>`, and the status line (§ 6). The ChatGPT
  prompt text is `perf_prompt.js`, moved here from Fuel in step 5 (`meta.files`).

## 5. Fuel's « Fiches » view (decided 30 Oct 2026: one editor, here; **done**, step 5)

Fuel already has a sheets editor (list, form, imports, preview, export: `modules/fuel/module.js`, about 900 lines). Two
editors of the same files is the duplication the 30/10 inventory asks to remove. Proposed: the editor lives in
`modules/aircraft/` only; Fuel's « Fiches » tab keeps the list (which sheet the flight uses, what it lacks) and opens
`?app=maintenance#aircraft?sheet=<id>` for any change; a pilot below the Complet level sees the list read-only. Fuel's
editor code is removed in a commit of its own once the cases of the new one pass. A pilot who needs a sheet of his own opens
the same Maintenance application on his device: no second path.

## 6. Rules of the frame

- `meta.reads`: `airline/`, `aircraft/` (documents); the registry and the sheets through `ctx.aerodb` only.
- `meta.writes`: `{ prefix: 'airline/fleet.json', merge: 'record' }`, `{ prefix: 'cache/aircraft/', policy: 'cache' }`;
  sheets through aerodb (its own declaration).
- Texts `[fr, en, de, es]`; ≤ 7 controls visible per view; 44 px targets; `ctx.ask` for every removal; no native dialog.
- On a phone (user, 30 Oct 2026): the sheet form has two columns at most (150 px a cell), each field at its own height, a checkbox at
  its size; a row of the sheets list gives its text the width, its actions go under it below 480 px of module (the cupertino
  chevron with them). The same rule for Fuel's read-only list. Case M5 (and F79), standard and cupertino.
- A status line in `cache/aircraft/status.json` (§ 10.0): « N appareils, M fiches, K types de la flotte sans fiche »,
  shown in Maintenance's status block; the « sans fiche » count links to the Fiches view.
- Help chapter `modules/aircraft/help/{fr,en,de,es}.md`, anchors `aircraft-…`.

## 7. Cases (a new area, letter to agree with V3 Frame)

Fleet: list and search; add, edit (changed fields listed), retire (question, sheet kept); a free type said; the write
reads the file just before (a paste between two edits kept). Sheets: the form follows `PROFILE_FIELDS` (every path has a
field), origin and date per field, `maxCrosswindKt` present; import of each format → preview → only the ticked fields
written, through `sheets.put` (stamps checked); new sheet with an unknown type; removal. Registry: search returns types,
registrations and callsigns with their sources, nothing editable. Layout: ≤ 7 controls per view at 390 px, no overflow.

## 8. Order

1. This SPEC agreed (and § 5 decided). 2. The module shell, the Flotte view and its cases. 3. The Fiches view (form from
the schema, origins, `maxCrosswindKt` with AeroDB). 4. The imports and their preview. 5. The Registre view. 6. § 5 if
decided. Each step: help ×4, `--touched` before the push, the full pass after (lock).
