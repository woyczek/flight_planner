# V3 — long routes: gates, proven sections, regional search (SOG-0354, 16 November 2026)

*Design note by the ergonomics session, asked by the user ("il faut trouver un moyen de fractionner un long trajet en
trajets plus facilement testables, que l'on sait valides […] il y a probablement bien mieux que ce cache heuristique,
pour décomposer une problématique de graphes"). SOG-0161 ("chercher une meilleure route, plus vite, plus efficace, en
modifiant l'algo") is merged here by his verdict of 16 November. Decision Q-0059: now, before alpha 5. Nothing in this
note is coded yet; the lots are in § 9.*

## 1. What is measured today

One search for the whole flight: `Nav.search` (`tools/route_engine/engine.py`) is an A* over one graph, with
non-dominated altitude labels, bounded to 6 s or 100 000 states; `plan.py` bounds the head route to 5 s and the whole
answer to 15 s; `nat_layer.py` adds the tracks of the day; `layered.py` already classes every leg of the result
(`controlled`, `incomplete`, `fallback`, `error`) and groups them in sections; `results_cache.py` keeps a whole answer
for an identical request.

Five flights measured by AeroDB on the user's real base (14 November, FL370, cache off):

| Flight | Time | What comes back |
|---|---|---|
| EIDW → KBOS | 35.6 s (15 s since SOG-0371) | no route: a fallback proposal, directs after the ocean |
| EIDW → KJFK | 35.2 s (15 s since SOG-0371) | same |
| LFOE → KTPA | 1.7 s | a route; low airways after New York (fixed since: 34 NM only, at the arrival) |
| EGLL → KDEN | 2.0 s | a plausible chain of high airways |
| LFPO → KLAX | 2.4 s | a plausible chain of high airways |

What breaks is not the algorithm first. The base has **no Canadian point or airway** (the ocean exit is a 398 NM
direct), and towards Boston and New York the budget is spent before the search finds a way out of the ocean. The
user's reading on the screen (16 November): "toujours des tracés directs entre Dublin et JFK".

## 2. The data, as surveyed (AeroDB, 16 November, no code, nothing downloaded)

| Need | Source | State |
|---|---|---|
| Preferred routes of the FAA, coded departure routes | NASR 28-day subscription (`PFR_BASE`, `PFR_SEG`, `PFR_RMT_FMT`, `CDR`), public domain | **already in the full subscription the user deposited**; the launcher reads only `FIX_BASE`, `AWY_SEG_ALT`, `NAV_BASE`: a reader is missing, not data |
| North American Routes (NAR) | a field of the preferred routes (`NAR_TYPE`), American side | same file; content of the field **not verified** |
| Canadian points and airways | AIP Canada ENR 3 / 4.1 / 4.4: free PDF, all rights reserved | personal reading at best, never published to the group |
| | NAV CANADA AIXM | commercial licence |
| | Designated Airspace Handbook (already taken) | airspaces only |
| | openAIP | points only, coverage not verified, CC BY-NC |
| Ocean | NAT message of the day | already read (`nat_layer.py`) |

Consequence: the American side can be **published** routes; the Canadian side has no publishable data.

## 3. Principle

A long route is a chain of **sections** joined at **gates**. Each section is solved inside its own region, by the
cheapest means that proves it, and says how it is proven. A flight that stays in one region is not touched: today's
engine answers it as it does now.

**Regions** — what the base can affirm differs by region, so the means differ:

| Region | Means | Proof said |
|---|---|---|
| Europe (built base, RAD, FRA) | today's A* | computed and controlled / computed, control incomplete (FRA) |
| Ocean | the track of the day, read as a published sequence of points | published (NAT track, day) |
| United States | a preferred route when one joins the two gates; else today's A* on the NASR airways | published (FAA preferred route) / computed |
| Canada | a named route (NAR) whose points may not be located | published, not located — or direct, for want of data |

**Gates** — the only places where two sections meet:

- the first and the last point of each NAT track valid for the direction and the time of the flight;
- the first point of a preferred route or NAR that starts at, or after, a track's last point;
- the departure and the arrival (with their SID / STAR or free join, as today).

No gate is invented inside Europe or inside the United States: the regional graph is good there and splitting it
would only lose the optimum. The user's example (a vertical of KJFK on the way to Boston) is not kept: an aerodrome
overhead lengthens the route and is not a route point; the published ends of the ocean are.

## 4. The search: a skeleton first, sections on demand

1. **Classify** the flight: which regions does it cross (the zones of the base along the great circle, with a
   margin)? One region: today's path, unchanged.
2. **Skeleton**: a small graph whose nodes are the departure, the arrival and the gates, and whose edges are candidate
   sections. The cost of an edge is the exact length when the section is published (a track, a preferred route) or
   already in the section cache; otherwise the great-circle distance between its ends, which never overestimates. A
   shortest-path search on a few hundred nodes takes milliseconds and gives the best chain of gates.
3. **Resolve** the sections of that chain, each with its own time bound: a published section is a table lookup; a
   computed one is today's `Nav.search` from gate to gate. A resolved section replaces its estimate by its real cost;
   if another chain of gates is now cheaper, it is resolved in turn, inside the total bound. (This is shortest path
   with lazy edge evaluation: the expensive searches are only run on edges that a best chain actually uses.)
4. A section that cannot be solved in its bound is kept as a **direct, labelled as such**, with the reason (no data,
   bound reached). It never passes for a route.
5. **Assemble** and class with `layered.py` as today; each section also carries `source`: `nat`, `pfr`, `nar`,
   `airway`, `fra`, `dct`.

**Section cache.** A solved section is kept by its two gates, its level band, the options that change the answer and
its cycle — a track section by its day. EIDW → the ocean entry then serves Boston as well as Tampa, and the second
request of the evening only solves what changed. It extends `results_cache.py` (whole requests) and follows the user's
rule of 13 November: it expires at the AIRAC change, or with the tracks of the day.

## 5. A faster search (SOG-0161), measured before it is changed

`Nav.search` already reports `expanded` and `seconds`. Lot L0 records, for the five flights, the time to build the
graph, the states expanded and the time of each search; every change below is kept only if that table improves and no
route gets worse.

1. **Shorter searches**: the cost of A* grows faster than the distance; three sections of 800 NM cost less than one
   search of 2 400 NM. This comes with § 4 at no extra code.
2. **Corridor**: a regional graph only admits the points whose detour stays small — distance from the first gate plus
   distance to the second, at most 15 % over the direct distance, widened once to 35 % when nothing is found. The
   graph (1 to 3 s to build today) and the search both shrink.
3. **A bound per section** instead of one bound for the whole flight: a hard section no longer eats the time of the
   others.
4. **No altitude labels in a cruise section**: the labels serve the climb and the descent; between two gates flown in
   one level band, a plain A* (one state per point) may do. To be proven by the L0 table, not assumed.

Not proposed: contraction hierarchies or landmark heuristics (a preprocessing per cycle, more code than gain at this
graph size) and a bidirectional search (the altitude labels make its stopping rule fragile).

## 6. Canada, honestly

Three levels, in this order; the screen always says which one applies.

1. **Named, not located.** The preferred route or NAR names Canadian points. A section whose points are not all
   located is kept as text; its length is the great-circle distance between its located ends, said "estimated"; the
   Map draws it as an unlocated section, not as a flown line.
2. **Located on this workstation only.** The positions come from the user's X-Plane folder, in memory, never written
   with the flight (SOG-0375, his decision of 16 November): the workstation sees the real line, another device sees
   level 1.
3. **Personal reading of AIP Canada** (ENR 4.4, then ENR 3), under the personal-use box, like ENAIRE: never published
   to the group. This is a licence decision of the user (Q-0062); nothing is coded before his answer.

## 7. On the screen

No new screen: the list of sections that Carburant already shows. Each line says its proof in pilot's words —
"publiée : route NAT G du 16/11", "publiée : route préférentielle FAA", "calculée et contrôlée", "calculée, contrôle
incomplet (FRA)", "directe, faute de données (Canada)", "nommée, non localisée : distance estimée". The distance and
the fuel follow the sections as they are drawn; an estimated distance is said estimated in the total.

## 8. Accepted when

On the user's real base, read-only, by AeroDB, with the table of L0 before and after:

- EIDW → KBOS and EIDW → KJFK: an answer in 8 s at most cold, 1 s with the sections cached; Europe computed, the ocean
  published, the American side published when a preferred route exists; no direct over 200 NM that is not labelled
  with its reason; never "route" over a fallback.
- LFOE → KTPA, EGLL → KDEN, LFPO → KLAX: no slower than today by more than 10 %, the same route or a shorter one.
- A flight inside Europe: the same answer as today, byte for byte.

## 9. Lots, one at a time

| Lot | Who | What | Guard |
|---|---|---|---|
| L0 | AeroDB | the table of § 5 on the five flights; no behaviour changes | — |
| L1 | AeroDB | reader of `PFR_*` and `CDR` in the full NASR subscription already deposited; what `NAR_TYPE` really holds; how many Canadian points `FIX_BASE` carries | reads a deposited file: reviewed by Sécurisation before the push |
| L2 | AeroDB | gates, skeleton, lazy resolution, section cache; behind a request option until § 8 is met, then the default for a flight that crosses regions | single-region flights unchanged (case) |
| L3 | Features SOG, BUGS SOG | the proof on each section line; the Map's style for an unlocated section | the validated mock-up of the Route step stays the contract |
| L4 | AeroDB | personal reading of AIP Canada | only after Q-0062 |

## 10. Not known yet

- The content of `NAR_TYPE`, and whether a NAR can be followed end to end from the American file alone.
- Flights that cross the ocean without a track (random routes, southern crossings): the base has no list of oceanic
  entry and exit points. Until one is found in an official source, such a flight keeps today's single search.
- Level and time validity of a track against the flight (a track is a gate only when the requested level is one of
  its levels at the crossing time).
- The share of the 35 s that was the missing data and the share that was the search: L0 says it.

## 11. After the measures (L0) and the reading of the FAA files (L1), 16 November

AeroDB measured the five flights and read the preferred routes on the user's real deposit (read-only). Its objections
to this note are accepted; where they contradict a paragraph above, this section wins.

**L0 — where the 15 s go** (FL370, the request of the screen: alternatives and proposals, cache off):

| Flight | Total | Graph | Searches | `recovery.propose` | Result |
|---|---|---|---|---|---|
| EIDW → KBOS | 15.0 s | 0.8 s | 438 calls; two large ones cut short (3.3 s / 5 376 states, 0.9 s / 2 816) | 9.9 s | proposal |
| EIDW → KJFK | 15.0 s | 0.8 s | 4.1 s / 6 144 states cut short, 0.4 s / 1 664 | 10.0 s | proposal |
| LFOE → KTPA | 7.8 s | 1.0 s | six of 0.5 to 0.7 s, 13 400 to 18 600 states | — | route, 4 734 NM, three alternatives |
| EGLL → KDEN | 7.1 s | 1.2 s | thirteen of 0.4 to 0.5 s, 9 500 to 14 600 states | — | route, 4 578 NM, three alternatives |
| LFPO → KLAX | 15.6 s | 1.1 s + 4.2 s | 0.8 s / 21 617 states, not found | 9.0 s | proposal |

What this changes:

- **The cost per state comes first** (§ 5). On the ocean the search expands about 1 500 states a second, against
  30 000 in Europe: the oceanic graph (track edges, free joins) is twenty times dearer per state. It is profiled and
  fixed before the corridor and before the lazy resolution; shorter searches do not help while each state costs this.
- **The fallback proposals eat 60 to 65 % of the time** of the three flights that fail (9 to 10 s out of 15). The
  8 s of § 8 cannot be met unless `recovery.propose` is bounded for a flight that crosses regions; with sections, a
  section that fails is already a labelled direct (§ 4, point 4), so the proposal search has nothing left to add there.
- **LFPO → KLAX is no longer a control flight.** It was a route on 14 November and is not one today; bisected on the
  code of 14 November, which finds none either: the cause is the base (United States of 1 October, Canada with
  airspaces only), not this week's engine. § 8 keeps LFOE → KTPA and EGLL → KDEN as the two control flights, and
  LFPO → KLAX is measured again once the user has rebuilt the United States at the cycle in force.

**L1 — what the FAA files really hold** (`PFR_BASE` 13 197 lines, `CDR` 41 916, read in 0.5 s, no line refused):

- NAR "common" (765 lines): a coastal point, an inland point, a designator (`N503B`) and a direction — **no chain of
  points**. NAR "non-common" (617 lines): from an inland point to an aerodrome, with the chain. The line of a common
  NAR is in `PFR_SEG` (74 181 lines), which L1 does not read: it is read in L2b.
- **The Canadian points are located.** `FIX_BASE` carries 359 Canadian fixes and `NAV_BASE` 30 navaids; all 275
  points named by the NAR segments have a position. What is missing is the Canadian *airway* (six only in the NASR).
- Preferred routes and coded departure routes carry conditions (hours, aircraft, equipment) that a section must
  respect before it is called published.

What this changes:

- **§ 6, level 1 ("named, not located") is almost empty for points.** A Canadian stretch outside a NAR is said
  "direct between published points", not "not located". Levels 2 and 3 (X-Plane on this workstation, personal reading
  of AIP Canada) are no longer needed for the ocean exit; Q-0062 is put back to the user with that fact, and nothing
  of L4 is coded unless L2b shows a gap.
- **Lots.** L2 is split: **L2a** — profile and reduce the cost per state of the oceanic graph, bound
  `recovery.propose` for a flight that crosses regions; accepted on the L0 table, no route worse. **L2b** — reader of
  `PFR_SEG` and of the conditions, then gates, skeleton, lazy resolution and section cache, behind a request option.
  L3 after L2b. L1 (the reader, wired to nothing) is reviewed by Sécurisation before its push.
