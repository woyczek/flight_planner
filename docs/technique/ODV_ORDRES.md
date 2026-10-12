# Board (Centre) — data model and wiring

Centre page `apps/cpco/odv_orders.html` (side bar › Schedule, ☰ › Centre — Board): the weekly editor
of flight orders (flight strips placed on a timeline, areas, control, miscellaneous, notes). Chain: **mission →
flight order (ODV) → execution → mission report (CR)**. The page **produces** the flight order; the ODV planning (`apps/cpco/odv_planning.html`,
`docs/MANUEL_PLANIFICATEUR.md`, chapter “Planning ODV”) **analyses** it (common slots, likely missions). Origin: the standalone tool “Tableau
V0” (single-file HTML, `localStorage`), taken over into the suite's model; its file format is not imported
(provisional format).

**Page structure (v2)**: six blocks, no choice of view (no more Day / Week / Statistics buttons); minimum
usage level set by `data-min-level`, block titles set at the source by `odv_orders.js` (4 languages).

| Block (`data-block-id`) | Content | Level |
|---|---|---|
| Order of the day (`jour`) | week bar (◀ ▶, This week, days, Duty officer, ↶ Undo, Briefing), palette and timeline | 1 |
| Crew of the week (`equipe`) | former Week view: members' availability day by day, DLO and deadlines, availability changes | 2 |
| Areas (`zones`) | activations by network (`odv_activations_editor.js`), then reservation requests | 2 |
| Common slots (`slots`) | 7 days × 3 slots matrix of the ODV page; click: slot window (missions × posts) | 4 |
| Likely missions (`missions`) | compatible families per slot, rules, “Full ODV page” link | 4 |
| Statistics (`stats`) | former Statistics view | 2 |

- Read-only (level 1, Centre locked, account without rights; `odvo-ro` class): the Order of the day block alone; the page
  then draws neither the crew nor the statistics.
- Common slots and Likely missions are the native blocks of the ODV page, served **within the page** by
  `apps/cpco/odv_planning.js` (loaded by `odv_orders.html`; no more frame or `?blocks=`). Without the grid of the ODV
  page (`#odvGrid`), the script only starts at the Expert level; the elements specific to the ODV page (workbook, grid,
  export) that are absent are ignored. The week is that of the Board: `odv_orders.js` calls
  `OdvPlanning.setMonday('AAAA-MM-JJ')` (Monday of the week shown) at each change of week, which recalculates
  slots and missions.
- Styles of the ODV blocks (slots, missions, grid, filters…) shared by both pages: `apps/cpco/odv_blocks.css`
  (versioned `?v=` by `bump_versions`); the rules specific to each page stay in its own stylesheet.
- The ODV page no longer has a tab: the “Full ODV page: workbook, grid, export…” link of the Likely missions block
  opens it (as does ☰ › Centre — ODV planning).

Status: **model partly validated (batch L2)**; open questions in § 7.

## 1. Principles

- **Adapt to the existing model**, only change it where it does not fit.
- Everything goes through the `data/` pool (`MissionAssignments.readData` / `writeData`): synchronised by git today, by the
  web service tomorrow, same format (`docs/technique/INDEX_DONNEES.md` § 9). No other export (no HTML, PNG or PDF).
- **Availability: that of the suite** (`data/disponibilites/<TRI>/<AAAA>-W<nn>.json`, `shared/dispos.js`). The ODV
  keeps no copy of the availability; an availability changed from the ODV (including **time off**, `recup` category) is written to
  the member's declaration (`SuiteDispos.saveWeek`, signed `by` the planner).
- **Members: those of the suite** (`SuiteUsers.list()`, availability index, reference). The ODV only adds
  display settings (Staff / Others group, colour, order).
- **Flights linked to a mission: the suite's assignments** (`data/missions/affectations.json`, `writeAssignment`) — My
  missions, the areas to activate (`OdvAirspace.missionZones`) and the registry see them without going through the ODV.
- **UTC times (z)**, to the quarter hour for availability (existing rule), to 5 min for the items of the order.
- Assignment **at free times**, display **in three periods**: the morning / afternoon / evening limits of the ODV planning
  (`odvPlanning:v1`, 08-12z, 12-18z, 18-23z by default) are drawn on the timeline.
- No pixel positions in the data: the items of a section stack automatically (lanes);
  free placement without snapping: technical debt.
- Rights: editing = Centre unlocked (`cpcoAccess:v1`) and, in production mode, `admin_centre`; otherwise read-only.
  A member changes their availability in My missions, as today. The V0 tool's own authentication is
  abandoned.

## 2. Availability categories and assignability

The 12 types of the V0 tool correspond to the categories of `data/config/disponibilites.json`:

| V0 (`urTypes`) | V0 label | Suite category | Assignable to |
|---|---|---|---|
| exo | Available all (« Disponible tout ») | `tout` (O) | flight, control, miscellaneous |
| nuke | Civil security (« Sécurité civile ») | `secu` (SC) | flight, control, miscellaneous |
| po | FAF fighter (« Chasse FAF ») | `defense_perso` (C) | flight, control, miscellaneous |
| pld | Transport | `defense_perso` (T) | flight, control, miscellaneous |
| opssol | FNY | `defense_perso` (N) | flight, control, miscellaneous |
| opsvol | IVAO SO exercise (« Exercice IVAO SO ») | `exercice_vol` (S) | flight, control, miscellaneous |
| stage | IVAO SO control (« Contrôle IVAO SO ») | `exercice_ctrl` (AM) | control |
| tache | IVAO civil control (« Contrôle IVAO civil ») | `ctrl_hors` (AT) | — |
| volivaohorss | IVAO flight outside SO (« Vol IVAO hors SO ») | `vol_hors` (G) | — |
| dispouniquem | Available on the ground only (« Dispo uniquement sol ») | `sol` (new) | miscellaneous |
| dv | Unavailable (« Indisponible ») | `indispo` (IN) | — |
| recup | Time off (« Récup ») | `recup` (Q) | — |

- Rule (`SuiteDispos.affectable(catégorie)`): `affectable` field of the category (`vol`, `controle`, `divers`), otherwise
  based on the type — `dispo`: everything; `atc`: control; `occupe` group (flight, control outside SOG, DCS): never;
  `indispo`: never. **A control is never assignable, except to control.**
- Category `sol` (“Available on the ground only”, `occupe` group, `affectable: ["divers"]`) added to the default
  categories (`DEFAULT` of `shared/dispos.js`); `data/config/disponibilites.json` is generated for the user from
  them (`affectable` field kept by the editor in Settings › Centre, which copies unknown fields).
- A member is in **conflict** on an item if they are not covered, over the whole duration, by a range of a category
  assignable to that item (not declared = conflict).

## 3. Items of a flight order

| Item | Section | Storage |
|---|---|---|
| **Mission flight** (including tanker) | flights | assignments (crew, callsign, aircraft, take-off, duration) + presentation in the week file |
| **Training** (BLUE, RED… without a registry mission) | flights | week file; areas chosen by hand (optional) |
| **Miscellaneous** (ground school, meeting) | miscellaneous | week file |
| **Control** | control | week file (SOG positions); network sessions: `data/atc/` (SuiteAtc) |
| **Note** | free | week file (plain text) |
| Time off | — | the member's availability (`recup` category) |
| Areas | areas | calculated: RTBA active per network, areas of the mission, areas open to control, areas in conflict (`OdvAirspace`, batch L4); activations entered: `data/atc/activations/<AAAA>-W<nn>.json` (`OdvActivationsEditor`) |

- **Flight order vocabulary** (specified by the squadron on 6 October 2026): **PTA** (principal training audience)
  = members that an item trains as a priority, circled on the order; **DLO** (desired learning objectives) = what a
  member must work on, in general or on a mission (“RBR : CAS, AAR”, “RAKI : GCI dépendant”, “RBR : FULL COMMS
  no L16”); **KNON**, **TALIOS** = configurations loaded on an aircraft (gun, pod) — the “Conf. Avions” (`cavTpls`)
  of V0; **deadline** (« butée ») = a member's due date.
- **Team**: a mission flight strip carries a flying team of the mission (`equipe` = callsign of the registry
  team); BLUE / RED of V0 = two teams (sides) of a mission; mission chosen from a list sorted by estimated
  duration (`estimate.block`), ⚠ beyond 15 min or 15 % difference from the requested duration.
- **AAR**: a tanker mission of the registry, often implied by another mission (complex missions); its
  strip is a mission flight with `axe` and `offload`; the refuelled flights attach to it (`ravitaillements`).
- Removed from V0: area strips and LL entered by hand as the main source (`ll` fallback kept), markers and
  NLT (route sheet), PTA, priority P1-P5, checklist (route sheet), unused keys (`extSqDefault`,
  `cavTpls`, `showSim`, `simAnchorGap`, `tzDefault`, `prepText`, `dutyText`, `recur_refuels`, `auth`, `dayStart` /
  `dayEnd`).

## 4. Files

### 4.1 `data/config/odv.json` — flight order settings (shared)

```json
{
  "schema": 1, "va": "SOG", "updated_at": "…", "by": "TRI",
  "terrain": "LFOA", "reseau": "IVAO", "crDelaiHeures": 48,
  "jours": { "1": { "debut": "04:00", "fin": "22:00" }, "…": {} },
  "nbJours": 7,
  "personnel": { "ABC": { "groupe": "staff", "couleur": "#EF4444", "ordre": 0 } },
  "modeles": {
    "vols":   [{ "id": "…", "libelle": "BLUE", "duree": 105, "couleur": "#1a5898", "fond": "#1a5898", "parIndicatif": false }],
    "divers": [{ "id": "…", "libelle": "COURS AU SOL", "duree": 60, "couleur": "#8a6010", "fond": null }],
    "controle": [{ "id": "…", "libelle": "CONTRÔLE", "duree": 120, "couleur": "#7300ff" }]
  },
  "indicatifs": { "MASTIFF": { "fond": "#a49ea0", "contour": "#cd030d" } },
  "configs": [{ "texte": "KNON", "couleur": "#9a3010" }, { "texte": "TALIOS", "couleur": "#1a5898" }],
  "ll": [{ "nom": "RTBA Lorraine", "debut": "11:30", "fin": "15:00", "jours": [1], "couleur": "#4ADE80", "sia": null }],
  "recurrences": [{ "id": "…", "element": { "type": "divers", "…": "…" }, "rythme": "hebdo", "jour": 2, "debut": "2026-10-12", "fin": null }]
}
```

- `reseau`: default network of a flight (VATSIM | IVAO), for the status of the activations (`OdvAirspace.check`).
- `crDelaiHeures`: delay after the end of the flight beyond which a mission flight without a report switches to MNE (§ 5).
- `indicatifs`: strip colours by callsign prefix (the `MISSION_CALLSIGNS` table stays unchanged; the longest
  prefix contained in the callsign entered wins).
- `ll`: fallback for RTBA / LL slots by day of the week (`OdvAirspace.rtba(date, { ll })`, `sia` takes priority over the
  name).
- `recurrences`: `rythme` `quotidien` | `hebdo` | `bimensuel` (even weeks), `debut` **mandatory** (a recurrence
  no longer fills past weeks), applied the first time a week is opened.

### 4.2 `data/odv/<AAAA>-W<nn>.json` — the flight order of a week

What has no place in the existing model: trainings, miscellaneous, SOG control, notes, duty officer, and the
presentation of mission flights.

```json
{
  "schema": 1, "va": "SOG", "semaine": "2026-W42", "updated_at": "…", "by": "TRI",
  "permanence": "TRI",
  "elements": [
    { "id": "…", "type": "vol", "date": "2026-10-13", "debut": "09:30", "duree": 105,
      "mission": "A-001C", "libelle": "BLUE", "indicatif": "MASTIFF45", "reseau": "IVAO", "couleur": "#1a5898", "fond": null,
      "equipe": "MERCURE31",
      "avions": [{ "pilote": "ABC", "nav": null, "annule": false, "config": ["KNON"] }],
      "pta": ["ABC"], "dlo": { "ABC": "GCI dépendant" },
      "taches": [{ "nom": "Leader", "pilote": "ABC" }],
      "zones": [{ "id": "<id base>", "nom": "R 45 A" }],
      "axe": null, "offload": null,
      "ravitaillements": [{ "vol": "<id du vol ravitailleur>", "heure": "10:15", "offload": 5 }],
      "infos": "", "etat": "prevu", "cr": null, "causes": [], "recurrence": null }
  ]
}
```

| `type` | specific fields |
|---|---|
| `vol` | see the example; `mission` null = **training**; up to 8 aircraft (pilot + navigator) |
| `divers` | `libelle`, `equipage: [TRI]`, `notes`, `etat`, `motif`, `pta`, `dlo` |
| `controle` | `libelle`, `position`, `equipage: [TRI]`, `etat`, `pta`, `dlo` |
| `note` | `texte` (plain text: no more HTML, V0's injection risk removed) |

- Mission flight: the crew, the callsign and the take-off are authoritative **in the assignments**; `avions` is the
  presentation copy of them (navigators, cancellations), rewritten at each save.
- `etat`: `prevu` | `fait` | `non_fait` | `annule`; `cr`: `ME` | `BACHE` | `MNE` | null; `causes`: causes of an MNE
  (several possible). **Raw** values; mapping to the report ledger: batch L5.
- An item does not go past midnight (`debut` + `duree` ≤ 24:00), as in V0.
- `permanence`: duty officer of the week; its display outside the page is done by Features SOG.

## 5. Rules

- **Conflicts**: member not assignable (§ 2), overlap with another flight, control or miscellaneous item not cancelled on the same day,
  same member twice on an item; required area without an “active” activation on the flight's network over its whole range, or
  P area (`OdvAirspace.check`).
- **Report**: the report is authoritative (`etatFromLedger`, batch L5). Success → `ME`, `fait`. No report `crDelaiHeures` after the end of the
  flight → `MNE`, `non_fait`, `causes` to be filled in. `BACHE` (cancelled) set by the planner. Training without a
  mission: `cr` set by hand.
- **P badge**: no crew member available in the hour and a half before the flight.
- **Availability together**: ranges where at least two members are assignable to a flight.
- **Aeronautical day and night**: `sunTimes` (`shared/mission_core/assist.js`) and coordinates of the airfield (the suite's
  aerodrome database); “now” in UTC (V0: local time).
- **Statistics**: flights planned, duration, done, cancelled, AAR, ME / Bâchés / MNE; per member: availability (over the
  duty hours `jours`) and load (flight minutes / available minutes).
- **Availability changes**: declarations whose `updated_at` is later than the last time they were taken into account (local
  read mark) — replaces V0's `avLog` log.

## 6. Batches

| Batch | Content | Who |
|---|---|---|
| L2 | this model; `sol` category and `SuiteDispos.affectable`; `shared/odv_orders_store.js` (reading, writing, recurrences, conflicts) | Ordres de vols |
| L3 | page `apps/cpco/odv_orders.html`: Order of the day block (timeline, drag and drop, briefing), Crew of the week and Statistics blocks (former Week and Statistics views), Areas; Common slots and Likely missions through `odv_planning.js` (v2); Settings › Centre › Board section | Ordres de vols |
| L4 | `shared/odv_airspace.js` (`OdvAirspace`), `shared/odv_activations_editor.js` — done | Features SOG |
| L5 | `etat` / `cr` ↔ report ledger, MNE delay; linked tanker missions; duty officer outside the page | Features SOG |
| L6 | manuals (4 languages), CHANGELOG; then stabilisation | everyone |

## 7. Open questions

1. Done since: permanent DLO per member and deadlines (`data/odv/dlo.json`), posts, aircraft and ferry as in the
   ODV planning (generated ferry strip, “to be assigned”), standby, qualification on the type as a signal.
2. **NLT**: time marker of the day (route sheet with the markers).

## 8. ODV workbook (Planning ODV): reading rules

`apps/cpco/odv_core.js` (`OdvCore`) reads the squadron workbook `ODV_Snn_XXX.xlsx` in the browser (`ZipStore.read` +
`DOMParser`); labels are located, not fixed addresses; anything missing is reported (notification + reading report),
never fatal.
- Week: number right of the "S" in row 1, else D1, else the file name (`S39`). Days: LUNDI…DIMANCHE row, 3 columns per
  day (morning, afternoon, evening), else D4:X.
- Pilots: 3-letter text boxes in columns A:C; row = the one containing the shape's vertical centre; duplicate trigram →
  first row kept.
- Codes: normalised text (`in` → IN) matched against the "Code couleur" legend (built-in defaults + codes read); the code
  text decides, never the colour. Categories `dispo` (O SC C T N S), `atc` (AT AM), `occupe` (G DC), `indispo`
  (IR IN V Q), `suivi` (I, A alone), `inconnu`, `hors_legende`; an I/A/Q suffix ("OI") is accepted, the code wins.
- Group rows (IVAO FR, IVAO SO, DEFA): background colour + comments; a row coloured on all 7 days of a slot is ignored
  (setting).
- Timeline ("VOLS" blocks, hours 0–23, read to ±15 min): flight = shape `DEP-ARR | aircraft | purpose`, crew = trigram on
  its left, callsign = nearby shape (heuristic); CONTRÔLE and DIVERS lanes.
- FLOTTE sheet: trigram text boxes (col. A), "Avions disponibles" rich text green/orange/red, threaded comment by
  headings (TRANSPORT: …), simulators (crosses); roles inferred from keywords (indicative).
- Privacy: cell comments shown without author; settings `odvPlanning:v1` hold no trigram; the last workbook is kept as a
  browser copy (`FileAccess` `__odvFile`) until "Clear the data"; no real workbook or trigram in the repository (tests
  use AAA, BBB…). Displayed name: the trigram; a full name only when the local reference
  (`data/references/defa_reference.js`, optional `name` of a pilot) holds one.
