# Availability as a tree, Settings and side bar: proposal

Proposal of 5 October 2026 (branch `feature/dispos-reorg`). Airline managed: **DEFA** (the one in the settings);
a single airline per Centre (a pilot may have several later: each configuration file already carries
`va: DEFA`).

## 1. Availability: configurable categories

### 1.1 Today

One flight order (ODV) code per hour and per day (7 × 24 grid, UTC), 14 codes from the ODV workbook: O, SC, C, T, S, N (available),
AT, AM (control), G, DC (busy), IR, IN, V, Q (unavailable). The ODV and assignment rules depend on them
(`FAMILY_ROLES`, `DOMAIN`, `eligible`, “restricted code within its domain”), and the Excel workbook uses them. A
single availability per hour: one cannot be available for both “rescue” and “fighter” at the same time.

### 1.2 Chosen: a few general categories, the detail in the user's preferences

**Themes** = the mission families, arranged by domain:

| Domain | Themes |
|---|---|
| Civil security | HEMS (helicopter rescue, medevac), SAR, FIRE (fires), LE (police, customs), HADR (humanitarian aid) |
| Defence | COMBAT (fighter), ISR (intelligence, surveillance), COMMAND (command), AAR (refuelling), AIRLIFT (transport), AIRBORNE (airdrop), MARITIME (navy), SPECIAL |

**Availability categories** (what the pilot declares, few in number):

| Group (shown in the ODV) | Category | Themes opened | ODV code |
|---|---|---|---|
| Available | everything | all | O |
| | civil security | all those of the domain | SC |
| | defence | all those of the domain | — |
| | **custom civil security** | according to the pilot's preferences | — |
| | **custom defence** | according to the pilot's preferences | C, T, N |
| SOG exercise | SOG exercise flight | exercise | S |
| | SOG control | exercise controller | AM |
| Busy | flight outside SOG (IVAO / VATSIM) | none | G |
| | DCS | none | DC |
| | control outside SOG (IVAO / VATSIM) | none | AT |
| Unavailable | unavailable | none | IN |
| | holidays | none | V |
| | time off | none | Q |
| | real-life activity | none | IR |

**User preferences** (in their profile, synchronised): for each domain, an **allow list** (only
these themes) or a **block list** (all but these themes). “Custom defence” for a pilot who only likes
fighter missions = allow list COMBAT, ISR; for a pilot who refuses fighter missions = block list COMBAT.

**ODV**: the categories are **grouped** (Available, SOG exercise, Busy, Unavailable) so as not to clutter the
grid; the detail (category, themes opened) is in the tooltip and the slot panel.

**ODV workbook**: secondary (import). On import, a pilot without preferences gets default ones based on their codes:
C → defence allow list COMBAT, ISR, COMMAND, AAR; T → AIRLIFT, AIRBORNE, AAR; N → MARITIME (and SAR in civil
security); several codes → union of the themes.

The categories and themes are configurable (Settings › Centre); a category that has been used is **retired**
(hidden from the lists, kept for the history), never deleted.

### 1.3 Format of an availability entry

**Schema 3 (written since 17 October 2026).** A week is written in the native format of the availability timeline
module (`shared/dispos_timeline.js`, [specification](DISPOS_TIMELINE_SPEC.md)), with the suite's fields around it:

```json
{
  "schema": 3, "va": "SOG", "pilot": "RBR", "week": "2026-W41", "tz": "UTC", "updated_at": "…", "by": "RBR",
  "ranges": [
    { "start": "2026-10-06T00:00", "end": "2026-10-06T19:00", "cat": "indispo" },
    { "start": "2026-10-06T19:00", "end": "2026-10-06T22:00", "cat": "secu_perso" },
    { "start": "2026-10-06T22:00", "end": "2026-10-07T00:00", "cat": "indispo" }
  ],
  "background": [{ "start": "2026-10-06T00:00", "end": "2026-10-07T00:00", "cat": "indispo" }],
  "appareils": { "possedes": [], "neophytes": [], "maitrises": [], "variantes": { "CL2T": ["CL-415"] } }, "simulateurs": []
}
```

- `ranges` is the declaration, the truth: to the minute, UTC, end excluded, **one state per minute** (no overlap).
  `background` is the unavailability laid under the availabilities, an editing convenience that readers ignore.
- `cat` is the category identifier of the configuration, as `categorie` was in schema 2. The `indispo` group goes to
  the background layer; the other groups are in the foreground.
- **Reading.** Every reader accepts schema 2 and schema 3. `SuiteDispos.readPilot` reads both through
  `shared/dispos_formats.js` into the same model, and gives each week normalised. The normalised week holds `ranges`,
  `background`, and the per-day view `dispos` (ranges cut by day, to the minute, `null` for a whole day). The ODV and
  the assignments read that view. Coverage is computed to the minute, piece by piece between the instants where the
  declaration changes (`SuiteDispos.cutsBetween`), no longer in quarter-hour steps.
- **Writing.** `SuiteDispos.saveWeek` always writes schema 3. There is no bulk migration: a week moves to schema 3 the
  first time it is written. Old schema 2 weeks stay readable.
- In a schema 2 week, two availability categories over the same time ("rescue AND combat") were possible. Read as
  schema 3, the later one wins. To be available for both, declare "Available for everything" or a custom category.

**Schema 2 (read, no longer written).** Your structure, with a few clarifications:

```json
{
  "schema": 2, "va": "DEFA", "pilote": "RBR", "semaine": "2026-W41", "updated_at": "…", "by": "RBR",
  "dispos": {
    "2026-10-06": [
      { "debut": "19:00", "fin": "22:00", "categorie": "secu_perso" },
      { "debut": "19:00", "fin": "22:00", "categorie": "defense" },
      { "debut": null, "fin": null, "categorie": "conges" }
    ]
  },
  "appareils": { "possedes": [], "neophytes": [], "maitrises": [], "variantes": { "CL2T": ["CL-415"] } }, "simulateurs": []
}
```

- Times in **UTC** (as today), to the quarter hour; `null` = whole day (schema 3: to the minute).
- `categorie`: stable identifier of a category of the configuration; the themes actually opened are calculated on
  reading (category + the pilot's preferences at that moment).
- **Several ranges can overlap** (available for rescue AND combat on the same evening); schema 3 keeps one state per
  minute (see above).
- `appareils.possedes` / `maitrises`: ICAO designators only. `appareils.neophytes` (optional): owned types the pilot is
  still a novice on (orange state in *My profile › My aircraft*); always listed in `possedes` as well, never in
  `maitrises`, so a reader that ignores it sees them as owned. `appareils.variantes` (optional): the variants the pilot
  flies, per designator (`{ "CL2T": ["CL-415"] }`) — several models share one ICAO designator (Doc 8643: CL-215T and
  CL-415 are both CL2T). Proposed from the designator's ICAO models, the fleet's variants, or free text (*My profile ›
  Aircraft*). Qualification stays per designator: a pilot who declared a CL-415 can be assigned a CL-215T of the fleet
  (same type for the simulation, never a block). When several aircraft or pilots are candidates, the matching variant
  comes first (fleet `variant` = declared variant); otherwise the assignment card shows "different variant: CL-415
  declared, CL-215T in the fleet", and the mission order keeps it (`aircraft.declared_variant` in `affectations.yaml`,
  shown in *My missions*). The name shown follows the declared variant when there is one, otherwise the record's common
  name.
- One file per pilot and per week: `data/disponibilites/RBR/2026-W41.json` (few git conflicts, natural archiving by
  year). The current files (`RBR.json`, grid of codes) are converted by a tool (consecutive hours
  of the same code → one range).

### 1.4 Configuration of the tree

`data/config/disponibilites.json` (synchronised, dated, `va: DEFA`), editable in **Settings › Centre ›
Availability categories** (everyday use): groups, categories (labels, colour, themes opened, ODV code),
themes per domain. The ODV and assignment rules read the themes instead of the hard-coded tables
(`FAMILY_ROLES`, `DOMAIN`).

### 1.5 Generic entry page

Same page for all pilots (My missions › My availability, and can be opened on its own):

- week shown (arrows, date, “current week”);
- **adding**: Group ▼ → Category ▼ (depending on the group) → days (boxes from Monday to Sunday) → times (optional)
  → “Add”; for a custom category, reminder of the themes opened and link to one's preferences;
- timeline of the week: one row per day, the ranges in colour (stacked when they overlap), click on a
  range to change or remove it; “⧉ Previous week” kept;
- the old hourly grid remains read-only (overview) until the switchover.

## 2. Settings: four pages instead of one

| Page | For whom, when | Content |
|---|---|---|
| **My profile** | each user, their own data | trigram, **VATSIM, IVAO** identifiers, SimBrief, airline website identifiers (today entered at first run only), password, **theme preferences** (allow / block lists), language, aircraft and simulators |
| **Centre** (CPCO, unlocked) | everyday | **users and rights**, **availability categories**, routing settings, report sending (web service) |
| **Installation** | once | first run, data repository, folders, virtual airline (SO Group Virtual by default), update channel |
| **Maintenance** | from time to time | updates, versions, dependencies, SIA database (28 days), caches (including “rebuild the index”), storage, full backup, log, reference files (fleet, ICAO types, callsigns, database, renames, mission report (CR) ledger) |

Appearance remains a page (and a window from the menu).

### Users and rights

- One file per user `data/utilisateurs/<TRI>.json` (synchronised like the missions): trigram, display name,
  role **`admin_centre`** or **`utilisateur`**, active, password (salted PBKDF2 hash, never in clear text),
  theme preferences, airline (`va: DEFA`).
- **`develop` mode** (today, set in the shared configuration): security is **tested, not enforced**;
  the trigram can be changed freely, sign-in is optional.
- **`production` mode**: sign-in (trigram + password) for the missions, and for the Centre if one is
  `admin_centre`; the rest of the suite stays open; the trigram no longer changes on the fly; password changed by
  knowing the old one, or reset by an admin.
- **Impersonation**: an admin can act as another user; an “Impersonation: user TOTO” banner
  is then shown on every page, and each write carries `by: "ADM pour TOTO"`.
- Limit: as long as everything is checked in the browser, these checks do not really protect; verification
  will move to the server side with the web service (see [INDEX_DONNEES.md](INDEX_DONNEES.md) § 9, synchronisation).

## 3. Side bar

Proposed order, by use (pilot first, then Centre):

1. My missions · 2. Report · 3. Flight maps · 4. Fuel · 5. Landings · 6. Reporting
— *Centre* — 7. **Missions** (generator **and** map studio: one button, two pages, the button stays active
on both; switching from one to the other through tabs at the top of the page) · 8. Registry · 9. ODV
— *bottom* — Appearance · Settings · Menu

The list becomes a `sidebar` key of `config/repository_tree` (today hard-coded in `repository_nav.js`), with
titled separators (“Centre”).

## 4. Decisions (5 October 2026)

1. Few general categories, detail through preferences (allow / block lists); ODV grouped.
2. ODV workbook secondary; preferences created on import for a pilot who has none.
3. Users and roles in a shared and synchronised file; `develop` / `production` mode; impersonation shown.
4. Side bar: pilot first.

## 5. Implementation (branch `feature/dispos-reorg`)

| Topic | Where |
|---|---|
| Side bar (`sidebar` key), tabs at the top of the page (`tabs` key: My missions ⇄ My availability, generator ⇄ studio, Settings) | `config/repository_tree`, `shared/repository_nav.js` |
| Settings in four pages; section → page (`settings` key); old addresses redirected by `parametrage.html` | `apps/settings/{profil,centre,installation,maintenance}.html`, `shared/settings_panels.js`, `shared/data_admin.js`, `shared/maintenance_page.js` |
| Users, develop / production mode, sign-in, impersonation | `shared/users.js`, `data/utilisateurs/`, `data/config/suite.json` |
| Pool files written under lock (data folder, otherwise the browser's outbox `suiteDataOutbox:v1`) | `MissionAssignments.readData` / `writeData` / `flushData` (`shared/assignments.js`) |
| Categories, themes opened, declarations per week | `shared/dispos.js`, `data/config/disponibilites.json`, `data/disponibilites/<TRI>/<AAAA>-W<nn>.json` |
| Entry on a continuous time axis (My missions and standalone page), the availability timeline module; old grid read-only | `shared/dispos_week.js`, `shared/dispos_timeline.js`, `apps/pilot/disponibilites.html` |
| ODV: grouped declarations, likely missions and flight checks by theme, preferences created on workbook import | `apps/cpco/odv_core.js`, `odv_assign.js`, `odv_planning.js` |
| Grid conversion | `python tools/convert_dispos.py` (preview), `--write` |
