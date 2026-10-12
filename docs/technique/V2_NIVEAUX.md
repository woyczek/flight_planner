# V2 — a suite with progressive complexity

*Branch `feature/v2-niveaux` · proposal of 8 October 2026 · [Technical contents](README.md)*

The current suite has two settings, “with or without the Centre (CPCO)”. The pilot who only wants to
receive their missions and write their mission report today sees some fifteen entries. The v2 starts from
**what the person does**, and not from what the suite can do: four levels, each complete for its use,
the first three simple.

## 1. Rules

1. **At most 7 items** per bar, menu, page or group. Beyond that, items are grouped or collapsed (“More…” (« Plus… »)).
2. **One page = one task.** A title that states the task, **one** visible main action, the rest in the background.
3. **Progressive disclosure**: the advanced option exists, but collapsed; it does not get in the way of level 1.
4. **Always a status**: what is happening (loading, sending, calculating) is visible, can be stopped, and states clearly
   what failed and what to do (no error code alone).
5. **Nothing to retype**: what the suite already knows (profile, mission order, IVAO/VATSIM tracking) pre-fills the page.
6. **Typography serving the content**: sans serif for the interface; deliberate departures allowed
   (typewriter for the mission order, serif for a document to be read).
7. **Same functions as today**: nothing is removed; what goes beyond the chosen level is put away, not deleted.

## 2. The four levels

| Level | For whom | What you do there | Access |
|---|---|---|---|
| **1 · Crew** | every pilot | receive their missions, see the schedule of the orders, write their mission report | open |
| **2 · Planning** | duty officer | level 1 + plan the orders (editable Board, availability, flight order (ODV) planning) | Centre (password, later role) |
| **3 · Design** | mission writer | level 2 + generate, edit and register the missions | Centre |
| **4 · Expert** | cartographer, analyst | level 3 + advanced maps, profiles, studio, analyses | Centre |

The level is chosen in Settings (and at first run); it replaces “with or without the Centre”. A level
above the authorised role remains offered read-only (like the Board today).

**Optional modules**, to be ticked whatever the level (hidden by default at levels 1 and 2): Fuel
(flight planner), Flight maps, Landings, Mission analysis (reporting).

## 3. Navigation per level (≤ 7 entries)

| Level 1 | Level 2 | Level 3 | Level 4 |
|---|---|---|---|
| Today | Today | Today | Today |
| My missions | My missions | My missions | My missions |
| Report | Report | Report | Report |
| Schedule (read-only) | **Plan** (Board, ODV) | Plan | Plan |
| — | — | **Missions** (generator, registry) | Missions |
| — | — | — | Missions + **map studio** |
| Settings · Help | Settings · Help | Settings · Help | Settings · Help |

Settings and Help form the bottom group (2 items). The optional modules that are ticked are added under a
single “Tools” item so as never to exceed 7. Appearance moves into Settings.

## 4. Pages, from the simplest to the most complete

- **Today** (new, home page): my next mission (time, aircraft, briefing), the pending mission
  report, my week as a timeline. Three cards, one action each.
- **My missions**: list of the orders received; the order is shown as a document (typewriter font).
  Availability as a tab.
- **Report**: level 1 = a short page pre-filled from the order and the network tracking (times, airfield,
  result, remarks); “Detailed report” opens the full form of the mission family.
- **Schedule / Plan**: level 1 = timeline of the week, read-only, with one's own flights highlighted; level 2 =
  the current Board, pared down (palette collapsed, ≤ 7 visible controls), the ODV as a tab.
- **Missions** (level 3): generator as a step-by-step wizard (≤ 7 steps), registry as a tab.
- **Tools**: flight maps, fuel, landings, mission analysis — optional, all at level 4; nothing from the
  Centre. The **map studio** (advanced maps, profiles) is a tab of Missions, at level 4.
- **Settings**: profile, level and modules, appearance, Centre, installation, maintenance; each page ≤ 7 blocks,
  technical blocks collapsed.

## 5. Batches

| Batch | Content | Visible to the user |
|---|---|---|
| L0 | level and modules (setting, first run), navigation filtered by level | the side bar only shows its level |
| L1 | “Today” page, home page of levels 1-2 | a useful landing page |
| L2 | pared-down My missions, order as a document, short pre-filled report | the complete pilot journey in 3 pages |
| L3 | read-only Schedule (level 1), pared-down Board (level 2) | planning without getting lost |
| L4 | generator as a wizard | designing a mission step by step |
| L5 | Settings: ≤ 7 blocks per page, technical blocks collapsed | readable settings |
| L6 | sober v2 look (one common stylesheet, current designs kept as an option); framework overhaul if needed | consistent interface |

Each batch can be used on its own and is tested in the four languages before the next one.

## 6. Open questions

- The material designs (Cabinet, Flight log, Rugged, Aqua…): kept as themes on top of the v2 look,
  or reserved for level 4?
- “Planning” in the list of optional pages: understood here as the flight planner (Fuel); the
  schedule of the orders stays visible from level 1.
