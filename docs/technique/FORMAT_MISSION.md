# Mission file format — the drawers (`phases`)

*[← Technical documentation](README.md)* · What a mission file carries for its **drawers** (« tiroirs »), how the V3 reads
it, and what a V2 mission gives without conversion. Owner: the session « Création de missions ». Decided in
`organisation/SPEC_MISSIONS_TIROIRS.md` (§ 7 and § 10.3) — fiche SOG-0440. The rest of the mission file (aerodromes,
places, zones, route, teams, maps…) is the V2 schema `helo-xp-mission` 2.0, described field by field in
[the generator prompt](PROMPT_GENERATEUR_MISSIONS.md); the reader is `frame/lib/mission.js`.

The contract of the fields below is the one of the user's authoring workshop (« Mission Editor 1.0 », its own FORMAT
document, read on 17 Nov 2026): this reader reads it as it is, with its bounds.

## 1. What a drawer is

A mission has a visible part (A: the rest of the file) and up to three **drawers**, B, C and D, in that order. A drawer
is one entry of `phases` — the V2 key, kept: **a V2 mission is read as it is, nothing is converted or rewritten**. A
closed drawer opens by its **key**; open, it gives a message, a briefing and, when it has one, the rest of the route.
On screen the word is « tiroir »; `phases` is only the name in the file.

## 2. The fields of a part

```yaml
phases:
  - id: B                          # B, C or D; without id, the letter of its rank
    title: "Changement de secteur"
    trigger: "au passage du secteur nord"     # the key said in plain words by the author (the V2 prints it)
    message: "« Écho radar dans le secteur nord, descendez voir. »"
    brief: |-
      Ce qui change : nouvelle situation, nouvelle tâche, contraintes.
    route_order: [PT1, TARGET]     # the rest of the route (ids of the mission's places); its first id is the splice

    # ONE key among five:
    trigger_zone: ZONE-1           # 1. a passage zone — an id of `zones`, OR the zone itself (see § 3)
    zone_shown: true               #    shown to the pilot on the Map (default), or hidden
    trigger_actor: OBJ-2           #    optional: this object (a moving target) crosses the zone, not the pilot
    trigger_object: OBJ-1          # 2. an object to find — an id of `objects`, OR the object itself (see § 3)
    trigger_condition:             # 3. a condition; this reader reads « arrival »
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

# (b) IN THE PART — the V3 editor: the same fields, written inside the part
phases:
  - id: B
    trigger_zone: { centre: { lat: 44.62, lon: 1.28 }, radius_km: 4, ceiling_ft: 3000 }
  - id: C
    trigger_object: { kind: person, lat: 44.61, lon: 1.31, detection_range_nm: 0.3, detection_height_ft: 800 }
```

- **Why the V3 editor writes in the part** (decision of 17 Nov 2026): the V2's « Mes missions » shows every unknown
  top-level key of a mission on its technical sheet (`apps/pilot/mes_missions.html`: only `phases` is hidden there), and
  the mission's `zones` are shown by the sheet, the Map and the proposed maps. A hidden zone in `zones`, or an `objects`
  list at the top, shows before take-off the very thing the drawer hides. Where the workshop should write them is the
  user's open question (Q-0095); the reader does not depend on the answer.
- **A moving target**: an object with `route_order` (ids of the mission's places) and `speed_kt`, or with `motion: axis`,
  `course_deg` and `speed_kt`; `start_delay_min`, `control: ai | user`, `callsign`, `aircraft_type`. It is read and
  bounded; the flight does not follow a target yet.

## 4. What the reader gives

`readMission(doc)` adds to the mission, bounded:

| field | value |
|---|---|
| `drawers` | three at most, in the order of the file: `{ id, title, trigger, message, brief, key, keyWhy, condition, route, routeUnknown }` |
| `drawersRefused` | the parts left out: an id out of B / C / D, a duplicate, a bare value, beyond three (or beyond the 20 entries read) |
| `key` | `{ kind: 'time', point, delayMin }` — `point` is a point of the mission or `'ORIGIN'` |
| | `{ kind: 'zone', shape, ceilingFt, zoneId, shown, actor, fallbackMin }` — `shape` is `{ circle: { lat, lon, radiusM } }` or `{ polygon: [[lat, lon], …] }`; `actor` is the moving target that crosses the zone (an object, as below), or null: the pilot |
| | `{ kind: 'object', object, fallbackMin }` — `object` is `{ id, kind, name, lat, lon, rangeNm, heightFt, altitudeFt, confirm, moving, motion }`; `motion` is null, `{ kind: 'route', route, speedKt, startDelayMin }` or `{ kind: 'axis', courseDeg, speedKt, startDelayMin }` |
| | `{ kind: 'arrival', point, at: { lat, lon }, radiusNm, speedMaxKt, onGround, required: [{ id, lat, lon }], escortMinSec, fallbackMin }` |
| | `{ kind: 'hand', fallbackMin }` |
| `keyWhy` | `''`; `'several'` (several keys written: one is kept, see below); `'zone'`, `'object'`, `'actor'`, `'condition'`, `'point'`, `'delay'` (the key could not be read: the drawer opens by hand, or at its fallback hour) |
| `condition` | the kind of `trigger_condition` written (`arrival`, `hover`…), to say it; `''` without one |
| `route` | the rest of the route as resolved points, in the form of `missionFlight` (`{ id, lat, lon, name, lock, hold }`); `[]` without one |
| `routeUnknown` | the ids of `route_order` that name no place of the mission |

- **The geometry is always resolved**, whichever way the file writes it: the pilot's screen and the frame's detection
  service read `key.shape`, `key.object`, `key.at`, never the file.
- **A V2 part**: with a `trigger_point`, the key is `time`; without, `hand`.
- **Several keys in a hand-written file**: zone, then object, then condition, then hour — and `keyWhy` says `'several'`.
- **A condition this reader does not read** (the workshop's 1.1 `hover`, `landing`, `sequence`, `overflight`, `event`, or
  any other word): `{ kind: 'hand' }`, `keyWhy: 'condition'`, and `condition` names it — the drawer stays closed and opens
  by the gesture or at its fallback hour. The kind is kept only as a short word (`[a-z0-9_]`), never as free text.
- **Not judged in flight yet**, to be said on the pilot's screen: a zone crossed by a target (`key.actor`), an object that
  moves (`key.object.moving`), a required following (`key.escortMinSec > 0`).
- `OBJECT_KINDS` is the one closed list of kinds (exported; to extend it, add a word there). A kind the list does not
  know is read `''`: the object is still played.
- `passageMin(mission, pointId)` → `{ nm, min }`: the distance (as `routeNm`) and the estimated minutes from the
  departure to a point of part A — distance at the cruise speed, plus the time on task of the points before (the middle
  of a range); `min` is null without a speed; null when the point is not on the route of part A; `'ORIGIN'` is 0.

## 5. An untrusted file

Any pilot can write a mission file. Texts are cut (title 120, `trigger` 200, message 2 000, briefing 20 000 signs); a
route is read up to 60 ids, `required_points` up to 20, `zones` up to 40 and `objects` up to 60 entries; an id is looked
up among the mission's own points only (never `constructor`); a value that is not a list where a list is expected
(`zones: 7`) is read as nothing and no longer fails the whole reading.

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

An optional value out of its bounds is simply not read (`null`): `ceiling_ft` and `detection_height_ft` (0 to 60 000),
`altitude_ft` (−1 500 to 60 000), `fallback_delay_min` (0 to 1 440); a target whose `speed_kt` (above 0, up to 1 000) or
`course_deg` is out of bounds is read as not moving.

## 6. Open points

- **Ceiling and heights**: `ceiling_ft` is an altitude above sea level; `detection_height_ft` is a vertical distance to
  the object, which needs the object's `altitude_ft`. « Descend to look » over land wants a height above the ground,
  which the live position does not give yet (asked to the frame, with « on the ground » for the arrival key).
- **The object seen in X-Plane**: a feasibility measure is running; the file needs nothing more for the « logical »
  object (a hidden position, found within range and on the pilot's word).
- **Where the workshop writes zones and objects** (Q-0095) and **one authoring tool or two** (Q-0096): the user's.
- **The workshop's 1.1 conditions** (hold, landing, sequence, overflight, event between crews): named, not read yet.

## 7. The V2 and these files

- The V2 editor keeps the new keys (its YAML tree has no schema); its Markdown and its PDF ignore them and print
  `trigger`.
- The V2's `MissionExercise` reads a part as a sealed fold opened at an estimated hour; a part without `trigger_point`
  has none (« H+? »).
- Measured on 17 Nov 2026, read-only, on the missions of the user's workstation (112 files read): none carries `phases`
  yet; every one reads exactly as before this reader.
