# Mission file format — the drawers (`phases`)

*[← Technical documentation](README.md)* · What a mission file carries for its **drawers** (« tiroirs »), how the V3 reads
it, and what a V2 mission gives without conversion. Owner: the session « Création de missions ». Decided in
`organisation/SPEC_MISSIONS_TIROIRS.md` (§ 7 and § 10.3) — fiche SOG-0440. The rest of the mission file (aerodromes,
places, zones, route, teams, maps…) is the V2 schema `helo-xp-mission` 2.0, described field by field in
[the generator prompt](PROMPT_GENERATEUR_MISSIONS.md); the reader is `frame/lib/mission.js`.

The contract of the fields below is the one of the user's authoring workshop (« Mission Editor 1.0 », its own FORMAT
document, read on 17 Nov 2026): this reader reads it as it is, with its bounds.

## 1. What a drawer is

A mission has a visible part (A: the rest of the file) and from none to twelve **drawers**, in the order of the file (the
limit of three came from the V2's generator and has no reason of use: the user, 17 Nov 2026). In the file their ids go on
B, C, D … M; **on screen a drawer is said by its rank, « Tiroir 1, 2, 3… »** — letters already name the crews of an
operation. A drawer is one entry of `phases` — the V2 key, kept: **a V2 mission is read as it is, nothing is converted or rewritten**. A
closed drawer opens by its **key**; open, it gives a message, a briefing and, when it has one, the rest of the route.
On screen the word is « tiroir »; `phases` is only the name in the file.

## 2. The fields of a part

```yaml
phases:
  - id: B                          # B to M; without id, the letter of its rank
    title: "Changement de secteur"
    trigger: "au passage du secteur nord"     # the key said in plain words by the author (the V2 prints it)
    message: "« Écho radar dans le secteur nord, descendez voir. »"
    brief: |-
      Ce qui change : nouvelle situation, nouvelle tâche, contraintes.
    route_order: [PT1, TARGET]     # the rest of the route (ids of the mission's places); its first id is the splice

    # ONE key among five:
    trigger_zone: ZONE-1           # 1. a passage zone — an id of `zones`, OR the zone itself (see § 3)
    zone_shown: true               #    shown to the pilot from the departure — ONLY the boolean true; absent (the default),
                                   #    « true » as a text, 1, false: hidden until the drawer opens (SOG-0459)
    trigger_actor: OBJ-2           #    optional: this object (a moving target) crosses the zone, not the pilot
    trigger_object: OBJ-1          # 2. an object to find — an id of `objects`, OR the object itself (see § 3)
    trigger_condition:             # 3. a condition: « arrival », or one of the workshop's 1.1 conditions (§ 4)
      kind: arrival
      point: DESTINATION           #    DESTINATION, ORIGIN, or a place of the mission
      radius_nm: 1
      speed_max_kt: 30
      require_on_ground: true
      required_points: [PT2]       #    optional: stops made before the arrival
      escort_min_sec: 0            #    optional: seconds spent following a target
    trigger_point: RDV-1           # 4. the hour (V2): a place of the mission, or ORIGIN for a delay after take-off
    trigger_delay_min: 10          #    minutes after the estimated passage at trigger_point
                                   # 5. none of these: the pilot's gesture alone (« Ouvrir le tiroir »)
    fallback_delay_min: 60         # keys 1 to 3: the fallback hour, in minutes after take-off
```

- **The pilot's gesture is always there**, whatever the key: a missing position never blocks a mission. A key that looks
  at the aircraft also carries a **fallback hour** (`fallback_delay_min`): without a live position, the drawer opens then.
- **Not a secret**: a pilot who opens the file reads the drawer. It is a game's seal, as the V2's sealed folds are.
- **The route of a drawer** never enters the mission's own route (`route_order` at the top): the pilot takes it by a
  gesture. Its first id is the splice — the trigger point in a V2 part, the last point of the part before in the workshop.
- A private block `x_mission_editor`, `coordination` and `emit_event` (the workshop's) are not read; whoever rewrites the
  file keeps them as they are.

## 3. Zones and objects: two ways of writing them, both read

```yaml
# (a) BY IDENTIFIER — the user's workshop: the zone and the object are at the top of the mission
zones:
  - id: ZONE-1
    name: Secteur nord
    kind: search                   # search | mission | exclusion
    centre: { lat: 44.620000, lon: 1.280000 }
    radius_km: 4                   # a circle … OR  points: [{ lat, lon }, …]  (3 to 100 vertices)
    ceiling_ft: 3000               # optional: the zone only plays below this altitude (above sea level)
objects:
  - id: OBJ-1
    kind: person                   # wreck | raft | person | vehicle | container | ship | smoke | aircraft
    name: Naufragé
    lat: 44.610000
    lon: 1.310000
    altitude_ft: 2500              # optional: the altitude of the object (above sea level)
    detection_range_nm: 0.3
    detection_height_ft: 800       # optional: found within this vertical distance of the object only
    require_confirmation: true     # found within range AND on the pilot's word (default); false: range alone
phases:
  - { id: B, trigger_zone: ZONE-1 }
  - { id: C, trigger_object: OBJ-1 }

# (b) IN THE PART — a hand-written file: the same fields, written inside the part
phases:
  - id: B
    trigger_zone: { centre: { lat: 44.62, lon: 1.28 }, radius_km: 4, ceiling_ft: 3000 }
  - id: C
    trigger_object: { kind: person, lat: 44.61, lon: 1.31, detection_range_nm: 0.3, detection_height_ft: 800 }
```

- **Which one is written** (decision of 17 Nov 2026 on Q-0095): by identifier, at the top — the contract of the user's
  workshop, which the V3 workshop writes too. A drawer references a zone or an object of the mission. **It is the reading
  that keeps the secret of a closed drawer**: the pilot's sheet and the Map show a zone or an object only when the visible
  part cites it, when a drawer that cites it is open, or when the zone is « shown ». Known limit, said: the V2's « Mes
  missions » shows every unknown top-level key on its technical sheet (`apps/pilot/mes_missions.html`: only `phases` is
  hidden there) and draws every zone — a mission with drawers is meant for the V3.
- **A moving target**: an object with `route_order` (ids of the mission's places) and `speed_kt`, or with `motion: axis`,
  `course_deg` and `speed_kt`; `start_delay_min`, `control: ai | user`, `callsign`, `aircraft_type`. It is read and
  bounded; the flight does not follow a target yet.

## 4. What the reader gives

`readMission(doc)` adds to the mission, bounded:

| field | value |
|---|---|
| `drawers` | twelve at most, in the order of the file: `{ id, rank, title, trigger, message, brief, key, keyWhy, condition, emits, route, routeUnknown }` — `rank` is 1 to 12, what the screen says (« Tiroir 1 ») |
| `drawersRefused` | the parts left out: an id out of B to M, a duplicate, a bare value, beyond twelve (or beyond the 20 entries read) |
| `key` | `{ kind: 'time', point, delayMin }` — `point` is a point of the mission or `'ORIGIN'` |
| | `{ kind: 'zone', shape, ceilingFt, zoneId, shown, actor, fallbackMin }` — `shape` is `{ circle: { lat, lon, radiusM } }` or `{ polygon: [[lat, lon], …] }`; `shown` is true only when the file writes `zone_shown: true` (SOG-0459); `actor` is the moving target that crosses the zone (an object, as below), or null: the pilot |
| | `{ kind: 'object', object, fallbackMin }` — `object` is `{ id, kind, name, lat, lon, rangeNm, heightFt, altitudeFt, confirm, hiddenUntil, moving, motion }`; `motion` is null, `{ kind: 'route', route, speedKt, startDelayMin }` or `{ kind: 'axis', courseDeg, speedKt, startDelayMin }` |
| | `{ kind: 'arrival', point, at: { lat, lon }, radiusNm, speedMaxKt, onGround, required: [{ id, lat, lon }], escortMinSec, fallbackMin }` |
| | `{ kind: 'condition', condition, rule \| steps \| event, fallbackMin }` — the workshop's 1.1 conditions: `hover`, `landing`, `overflight` (a `rule`), `sequence` (1 to 10 `steps`, each a rule), `event` (the id of a message between crews) |
| | `{ kind: 'hand', fallbackMin }` |
| `keyWhy` | `''`; `'several'` (several keys written: one is kept, see below); `'zone'`, `'object'`, `'actor'`, `'condition'`, `'point'`, `'delay'` (the key could not be read: the drawer opens by hand, or at its fallback hour) |
| `condition` | the kind of `trigger_condition` written (`arrival`, `hover`…), to say it; `''` without one |
| `emits` | `{ id, to: [recipient, …] }`: the message the drawer sends to the other crews when it opens (`emit_event`, 16 recipients at most); null without one |
| `route` | the rest of the route as resolved points, in the form of `missionFlight` (`{ id, lat, lon, name, lock, hold }`); `[]` without one |
| `routeUnknown` | the number of ids of `route_order` that name no place of the mission |

- **The geometry is always resolved**, whichever way the file writes it: the pilot's screen and the frame's detection
  service read `key.shape`, `key.object`, `key.at`, never the file.
- **A V2 part**: with a `trigger_point`, the key is `time`; without, `hand`. A part that carries a delay and no point
  (the trace the V3 editor leaves when the place of the trigger point is removed) is `hand` too, with no `keyWhy`: it is
  the pilot's gesture, not an unreadable key.
- **Several keys in a hand-written file**: zone, then object, then condition, then hour — and `keyWhy` says `'several'`.
- **The workshop's 1.1 conditions are read and bounded, not judged**: a rule is `{ kind, label, point, at, object, radiusM,
  radiusNm, durationSec, maxGapSec, speedMaxKt, speedToleranceKt, heightMinFt, heightMaxFt, confirmation, confirm }` — the
  fields of its kind, null for the others; it holds on a point (`at`) OR follows an object (resolved). The drawer stays
  closed and opens by the gesture or at its fallback hour.
- **A kind of condition this reader does not know is never an error**: `{ kind: 'hand' }`, `keyWhy: 'condition'`, and
  `condition` names it. The kind is kept only as a short word (`[a-z0-9_]`), never as free text.
- **Not judged in flight yet** — `notJudgedYet(key)` says it, for the pilot's screen (« pas encore jugé en vol — s'ouvre à
  l'heure de repli ou au geste »): a 1.1 condition, a zone crossed by a target (`key.actor`), an object that moves
  (`key.object.moving`), a required following (`key.escortMinSec > 0`).
- `drawerSlots(doc)` → `[{ i, id }]`: which entries of `phases` are drawers (their place in the list, their id) — the one rule of
  acceptance, shared by the reader and by the workshop (`modules/missions/editor_drawers.js`), which keeps the other entries as
  they are.
- `OBJECT_KINDS` is the one closed list of kinds (exported; to extend it, add a word there). A kind the list does not
  know is read `''`: the object is still played.
- `passageMin(mission, pointId)` → `{ nm, min }`: the distance (as `routeNm`) and the estimated minutes from the
  departure to a point of part A — distance at the cruise speed, plus the time on task of the points before (the middle
  of a range); `min` is null without a speed; null when the point is not on the route of part A; `'ORIGIN'` is 0.

## 4 bis. What the pilot may see — `pilotView` (SOG-0448, 18 Nov 2026; SOG-0459, 18 Nov 2026)

The workshop's format writes the target, the zones, the points and the objects at the top of the file: shown as they are, the sheet
of the mission, its Detail and the Map would give away the position a closed drawer hides. And the user, 18 Nov 2026 (SOG-0459,
`organisation/SPEC_MISSIONS_TIROIRS.md` § 11.3): **the very existence of the drawers is hidden by default** — nothing says that a
mission goes beyond its first objective: no count, no badge, no title of a closed drawer. **One rule, written once**, in the
reader: `pilotView(mission, opened, { mine = true })` returns the mission read, **in the same shape**, where

- `drawers` holds the **open drawers only**, whole, in the order of the file, with their `rank`; **a closed drawer is not there at
  all** — no stub, no title, no key said in plain words; a mission whose drawers are all closed has `drawers: []`;
- `drawersRefused` is `0` (a count of the parts left out would say there were some);
- a place, a zone, a rendezvous or the target is kept **only if it is cited** — by the visible part (its route `routeOrder`, the
  centre of one of its maps) or by a drawer that is OPEN (its zone, the point of its key, its required stops, its onward route);
- the passage zone of a closed drawer is also kept when the file writes **`zone_shown: true`** (the boolean; absent, « true » as a
  text, 1 or false: hidden) — kept in `zones` as an ordinary zone, nothing tying it to the drawer;
- `opened` is the letters of the open drawers of MY mission, a bounded input: only the letters of `DRAWER_IDS` count; `mine: false`
  (a mission one browses) gives the visible part alone, whatever `opened` says; **`mine` is read strictly** (the Security session,
  18 Nov): without options, or without `mine`, the mission is mine — the default —, but a `mine` that is not exactly `true` (the text
  « false », 0, null) or options that are not an object mean « not mine »: a closed failure, no drawer is held open;
- **a mission without a drawer has no secret**: it is returned as it is (the V2 missions are shown as before) — only a count of
  refused parts, if any, is returned as 0;
- `pilot: { mine, opened }` is added — **no count** of what is hidden.

Identifiers are compared as the reader reads them (trimmed, upper case; `TARGET` names the target). The mission read is never
modified. **For display only**: the device that follows the keys in flight, and the workshop, read the whole mission
(`readMission`). **The limit, said**: the file stays readable by whoever opens it, and the V2 shows everything — it is a secret of
the screen, not a protection. Who goes through it: the sheet and the Detail of a mission (Features SOG), the Map (BUGS SOG), the
search index, the read-only map of the mission (`modules/missions/mission_map.js`), with the open drawers published on the device
by « Affectation » — none writes a rule of its own. Bench: `frame/lib/test/mission.html` (noreg N1); noreg N103, N113.

## 4 ter. The map of the mission — `mission_map` (SOG-0456, 18 Nov 2026)

The author chooses, in the workshop, how the map of HIS mission opens — in the workshop, in the Brief and in the reader:

```yaml
mission_map:
  base: relief      # « fast » (the default) or « relief » — the topographic background
  airspaces: true   # the layer « Espaces »: the R, D and P zones and the RTBA of the view
```

- **Two closed values and a boolean, nothing else.** The reader gives `mapLook: { base: 'fast' | 'relief', airspaces: bool }`
  (`mapLook(v)`, exported): `base` is « relief » only when the file writes exactly `relief`; `airspaces` is true only for the
  boolean `true`. An absent key, another word, another case, another type (a list, a number, a text) read « fast », layer off.
  **Nothing else comes out of the key**: no address, no style, no name of a host — the backgrounds are those of the map base.
- The workshop writes the key only when the author's choice differs from what the file says (`ED.withMapLook`), with these two
  fields and no other.
- It is a wish of display, never a secret and never a rule of the game: the pilot changes the background and the layer on his
  device, for the sitting. Bench: noreg N110 (the key), N111 (the block in read only).

## 5. An untrusted file

Any pilot can write a mission file. Texts are cut (title 120, `trigger` 200, message 2 000, briefing 20 000 signs); a
route is read up to 60 ids, `required_points` up to 20, `zones` up to 40 and `objects` up to 60 entries; an id is looked
up among the mission's own points only (never `constructor`); a value that is not a list where a list is expected
(`zones: 7`) is read as nothing and no longer fails the whole reading.

**The invisible format characters are removed from every text read** (`visible(v)`, exported; Security review of 18 Nov 2026): a
title, a message or a briefing must not read otherwise than it is written. Removed: U+061C, U+200B, U+200E, U+200F, U+202A to
U+202E, U+2060 to U+2064, U+2066 to U+206F, U+FFF9 to U+FFFB, U+FEFF. Kept on purpose: U+200C and U+200D (scripts and emoji need
them) and U+202F (the narrow no-break space of French typography). An identifier is compared after the same removal. The workshop
(`modules/missions/editor_drawers.js`) uses the same function for what it shows and writes.

**A number out of its bounds is never clamped** — a zone shrunk to fit would be another zone. The key is said
unreadable and the drawer opens by hand:

| value | bounds |
|---|---|
| latitude, longitude | ±90, ±180 |
| `radius_km` | above 0, up to 500 |
| polygon | 3 to 100 vertices, each with a position |
| `detection_range_nm`, `radius_nm` | above 0, up to 100 |
| `speed_max_kt` | 0 to 1 000 |
| `escort_min_sec` | 0 to 3 600 |
| `trigger_delay_min` | 0 to 1 440 |

The 1.1 rules: `radius_m` 0.1 to 10 000, `duration_sec` 1 to 3 600, `max_gap_sec` 0.1 to 60, `speed_max_kt` of a landing 0 to
50 (3 when absent), `speed_tolerance_kt` 0 to 100, `height_min_ft` ≤ `height_max_ft` within 0 to 60 000, `radius_nm` of an
overflight 0.001 to 100; a point AND an object, or neither, is unreadable; a sequence has 1 to 10 steps, never nested; the
id of an event and a recipient are short words (80 signs, `[A-Za-z0-9_.-]`).

An optional value out of its bounds is simply not read (`null`): `ceiling_ft` and `detection_height_ft` (0 to 60 000),
`altitude_ft` (−1 500 to 60 000), `fallback_delay_min` (0 to 1 440); a target whose `speed_kt` (above 0, up to 1 000) or
`course_deg` is out of bounds is read as not moving.

## 6. Open points

- **Ceiling and heights**: `ceiling_ft` is an altitude above sea level; `detection_height_ft` is a vertical distance to
  the object, which needs the object's `altitude_ft`. « Descend to look » over land wants a height above the ground,
  which the live position does not give yet (asked to the frame, with « on the ground » for the arrival key).
- **The object seen in X-Plane**: a feasibility measure is running; the file needs nothing more for the « logical »
  object (a hidden position, found within range and on the pilot's word).
- Decided on 17 Nov: zones and objects by identifier, at the top (Q-0095); one authoring tool (Q-0096).
- **The workshop's 1.1 contract is still moving** (hold, landing, sequence, overflight, event between crews,
  `coordination`): the reader follows its document of 17 Nov; `coordination` (the other crews' missions kept in one file)
  is not read.

## 7. The V2 and these files

- The V2 editor keeps the new keys (its YAML tree has no schema); its Markdown and its PDF ignore them and print
  `trigger`.
- The V2's `MissionExercise` reads a part as a sealed fold opened at an estimated hour; a part without `trigger_point`
  has none (« H+? »).
- Measured on 17 Nov 2026, read-only, on the missions of the user's workstation (112 files read): none carries `phases`
  yet; every one reads exactly as before this reader.
