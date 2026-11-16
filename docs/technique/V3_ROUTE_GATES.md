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

## 12. After L2a (252194e91), 16 November

The profile corrected § 11 on one point. On EIDW → KJFK, 20 s out of 25 under the profiler were spent in
`recovery.propose`: 41.6 million calls of `block_hit`, every edge tested against every RAD block. The blocks are now
indexed once (`recovery.usable_graph`, the same graph word for word); the proposals were not bounded, they were made
exact and cheap.

| Flight | Before | After | Route |
|---|---|---|---|
| EIDW → KBOS | 15.0 s | 8.1 s | proposal |
| EIDW → KJFK | 15.0 s | 7.9 s | proposal |
| LFPO → KLAX | 15.6 s | 9.7 s | proposal |
| LFOE → KTPA | 7.8 s | 6.7 s | the same, 4 734 NM |
| EGLL → KDEN | 7.1 s | 6.9 s | the same, 4 578 NM |

**The cost per state of the ocean was not reduced, and should not be the target**: a state is not slow, it is wide —
about fifty edges relaxed per state. The lever is the number of edges, that is the corridor of § 5, point 2. The head
searches that fail still take 3 to 4 s, their bound.

L2b therefore goes in three steps, one at a time, each judged on this table: (1) the corridor; (2) the reader of
`PFR_SEG` and of the conditions of the published routes, with fixed-sentence errors for a hostile file, reviewed by
Sécurisation; (3) gates, skeleton, lazy resolution and section cache, behind a request option, shown to the user on
EIDW → KBOS and EIDW → KJFK before it becomes the default.

### 12.1 L2b (3): what was built (AeroDB, 16 November)

Behind `sections: true` of the request, `tools/route_engine/sections.py`. **Gates**: only the entry and the exit of the
NAT tracks of the day (the other gates of § 3 — a FIR border on the corridor — were not needed: the European and the
American sections are searches of 260 and 16 states). **Skeleton**: the departure, the arrival and, for each track valid
in the direction of the flight, its entry and its exit; the cost of « departure → entry » is a lower bound (the smallest
cost per NM of the graph times the great-circle distance), the track is exact. **Lazy resolution**: the tracks are
resolved in the order of their bound and the loop stops when the next bound exceeds the best cost found; each section is
one `Nav.search`, the final altitude band of a section being the initial band of the next (`initial_band`), a section
that ends at a gate asking no arrival level (`gate`). **The answer** carries `sections: { candidates, tried, chosen, cost,
sections: [{ name, from, to, nm, cost, expanded, seconds, proof: computed | published }] }` for the screen of § 7.
**Not done**: the sections kept by cycle (the searches are 15 ms: it would not pay today); L4 (the Canadian gap is not yet
a labelled « direct » section: the American section is a search to the arrival); the option is not the default.

| Flight (cold, FL370, the form of the screen) | whole search | `sections` | Route |
|---|---|---|---|
| EIDW → KBOS | 9.3 s | **2.0 s** | the same, 2 850.1 NM (NAT E, N260B–N271B) |
| EIDW → KJFK | 8.3 s | **2.1 s** | the same, 3 022.7 NM |
| LFOE → KTPA | 2.2 s | 3.3 s | the same, 4 734.3 NM |
| EGLL → KDEN | 2.2 s | 2.6 s | the same, 4 578.3 NM |
| LFPO → KLAX | no route | no route | the base, not the engine |
| LFPO → LIRF (Europe) | 3.2 s | 3.2 s | identical, 627.0 NM: not applicable, the whole search runs |
| EGLL → LEMD (Europe) | 2.4 s | 3.3 s (noise: not applicable) | identical, 702.7 NM |

The five routes that cross the ocean are the SAME as the whole search's; the option costs 0.4 to 1.1 s more where the
whole search was already quick (the enumeration of the tracks), and divides by four where it was not. For EIDW → KBOS all
five tracks of the day were resolved (the bounds, 2 626–2 661 NM, are far below the best real cost, 2 880 NM): the time
of the flight is now the context (1 s) and the graph (1 s), not the searches. What the option is not: the best flight
BY a track, not the best of all flights.

## 13. Lot L5 — a North Atlantic route that is reliable and bounded (the user's priority, 16 November)

*"mes points clef, actuellement : sécuriser et fiabiliser le calcul des routes. je préfère passer du temps sur l'algo
de création de route nord atlantique, et s'assurer que tout se charge en temps contraint."* This lot comes before
everything else of this note. Four requirements; each is a case, and the matrix of 13.3 is the proof.

### 13.1 Reliable: a track is taken only when it is valid for this flight

- **Direction**: the track's direction is the flight's.
- **Time**: the estimated time at the track's entry point (the departure time of the request plus the time of the section before
  the ocean) is inside the validity of the track message: the validity of a NAT track is read at the PASSAGE of the entry (decision
  of the ergonomics session, 16 November: a flight that leaves at 07:00 and passes the entry at 09:32 may not take a track valid
  until 08:00; the bench of K237 therefore asks at 04:30). **A request that GIVES no
  departure hour is not checked for the hour** (decision of the ergonomics session, 16 November, which reconciles this with
  the user's rule of 13 November, « même si on n'a pas la bonne nat, on essaie tout de même de les utiliser, on raffine après »):
  the track is taken, the direction and the level still apply, and the answer says `depart.basis: 'none'` with the sentence
  « heure de départ non donnée : validité horaire des routes NAT non vérifiée » — nothing is supposed, no « now ». A message of a
  past day stays used and is said stale (rule of 13 November, unchanged), and its hours are NOT checked (K237: a stale message is
  taken at any hour). A route read with no level list and no window (the old shape of the file) is valid at any level and any hour.
- **Level**: the requested level is one of the track's levels for that direction — the LIST of the levels, kept in the metadata of
  the track (`levels_east`, `levels_west`): a minimum and a maximum are not a list (a track that offers FL350 and FL390 does not offer
  FL370). *(Accepted objection of AeroDB, 16 November: `nat_layer` kept only the minimum and the maximum.)*
- A track that fails one of the three is not a gate, and the answer names the reason once per track ("track E: not
  valid at 0340Z", "track E: FL370 not offered"). Never a silent omission.

### 13.2 Complete: when no track of the day fits, the engine creates a random route

Outside the hours of the track system, at a level no track offers, or on a day whose message is not read, the crossing
is a **random route**, created, not proposed:

- one point at each ten degrees of longitude between the oceanic entry and exit, on the shortest path between them,
  its latitude rounded to the whole degree (the form `54N030W`, written `54/30`);
- the entry and the exit are the published points nearest to that path on each side of the ocean, among the ENTRIES and the
  EXITS of all the routes of the day (both directions), read from the message already loaded — no memory of the season, no file
  written (accepted objection of AeroDB: the message of the day is all that the launcher keeps); when none is known, the answer
  says "no oceanic entry point known" — it does not invent one;
- the section is labelled `source: random` and said on the screen "route libre, créée" with its points; the message of
  the day, when read, is still shown so the pilot can see why no track was taken.

The user decides nothing here: the route is always given, and always says how it was made.

**Done (L5 2 bis, 16 November, case K297)** — the free route no longer loses its tries on entries that the departure cannot reach (found while measuring the west coast: LFPO → KLAX and LFPG → KLAX had no route, the first three pairs by great-circle bound all had an entry that Paris does not reach at FL370, 1 s each; LFPG took 20.1 s). Now the entries are searched by PACKS of five (the nearest to the path first) with `Nav.search(goals=…, need=2)` — the search stops as soon as two are reached: a search to all the entries goes through all the states as soon as one is unreachable (EIDW → KJFK, 13 entries, 31 000 states, 4.8 s instead of 260 states) —, the pairs are made only among the entries REACHED and ranked with the real European cost, at most three tries, and an exit whose America section failed is not taken again. Measured on the real base, read only: LFPO → KLAX 3.1 s, 5 624 NM, ATSUR 52/20 54/30 55/40 5530/50 NICSO N264B-N275B TOPPS Q913 … ANJLL4; LFPG → KLAX 2.9 s, 5 630 NM (before: no route); EIDW → KJFK at 03:00 2.0 s, 2 839 NM, unchanged; KJFK → EIDW 1.9 s; LFPG → KJFK 3.1 s, 3 224 NM.
**Done (L5 3, 16 November, case K296)** — the answer carries `timing: { context_s, tracks_s, graph_s, skeleton_s, sections: [{ name, seconds, bound_s, hit, … }], total_s }` (also in the view): `context_s` the navigation data and the RAD of the day (kept from a request to the next, so about 0.01 s the second time), `tracks_s` the reading and placing of the tracks of the day (when the context was built), `graph_s` the routing graph of the request (0 when kept), `skeleton_s` the time outside the searches, `sections` every search with its seconds, its bound (the cap of one search brought down to what remains before the bound of the phase) and `hit` (the bound cut it); the one European search is `shared: true` with `goals` / `reached`. `engine.GRAPH_MIN_S` (5 s for a flight across the ocean, set by every plan): a graph that is not built yet is refused with « Budget de recherche atteint : la construction du graphe n'est pas commencée … » when less than that remains before the bound — the budget message that the screen already reads (so the alternatives, which would each rebuild a graph, are not started). `sections` is the DEFAULT of a flight across the Atlantic in calculation (`plan.plan`: no `sections` key = on; `sections: false` refuses it, a check keeps the entered route). Measured on the real base, read only: EIDW → KJFK 1.9 s (context 0.84, graph 0.77, sections 0.07 of which the one European search 0.03 s); the second request 0.3 s; with `sections: false` 6.7 s then 4.9 s, the same route; LFPO → KLAX (no route on this base) 13.9 s in all (bound 20 s), the free route making its three European attempts of about 1 s each (the entries are not reachable).
**Not done**: « a section that is a labelled direct when the graph is not begun »: when the graph is refused the answer is the budget message and the fallback proposals as for any other budget; to decide if a direct leg must replace it.

**Done (L5 1 bis, 16 November, cases K295 and K290/K293 updated)** — `Nav.search(goals=[…])`: ONE A* from the departure to ALL the track entries (heuristic = the distance to the nearest goal, consistent: the first pop of a goal is its cheapest; each goal is noted when first popped and the search goes on until all are noted; a goal that is not reached is missing; a budget that cuts returns what was reached). `sections.solve` makes that one search (`_europe`), takes from it the REAL cost, path and altitude band of the European section of every entry, checks the hour at the entry with the REAL distance, builds the skeleton with exact European costs and resolves the track and the America section of the tracks that the best chain does not exclude (`sections._resolve(first=…)`); an entry that the search does not reach sets its track aside, said (`network`, with « budget de recherche atteint » when the budget cut). Measured on the real base, read only: EIDW → KJFK five entries in 400 states (0.03 s, the same five costs as five searches), 1.9 s in all, the same route (3022.7 NM); EIDW → KBOS 2.1 s, 2850.1 NM; EGLL → KDEN 1.0 s against 2.3 s for the whole search (before: slower than the whole search), the same route (4578.3 NM). **LFOE → KTPA at 12:00 changes, and the reader must know why**: none of the entries of the tracks that go west is reachable at FL370 without a track that is set aside (the five goals: 0 reached in 20 143 states) — the whole search reached them through NATR, an EAST track that it used against its direction; since L5 (1) a track set aside is not taken by the search either, so the answer is the free route of 13.2 (ELSOX 51/20 50/30 49/40 46/50 42/60) of 4060.8 NM, 0.8 s, against 4734.3 NM of the whole search. A decision for the ergonomics session if the tail of a track set aside may serve as an ordinary connector.

**Done (L5 2, 16 November, case K294)** — `tools/route_engine/free_route.py`. The ends of all the routes of the day (the first and the last point of each route of the message, kept in `nav.nat['ends']`) are the entries and the exits of the free route; the side of the ocean is told by the longitude (35°W, as for the crossing); the pairs (entry, exit) are tried in the order of their lower bound (cost per NM × the distances at both ends + the length of the free route), three at most; the simulation links (DCT, `nat_link`) from the high network to the entry and from the exit to the network are added on a copy of the graph; the three sections are resolved by the same `sections._resolve` (the middle one is one published path of created points, `proof: created`). It runs when no track is valid for the flight (`Aucune route NAT valable pour ce vol`) AND when no chain by a valid track has succeeded. The answer: `sections.source: random`, `sections.free: { source, label: « route libre, créée », ok, entry, exit, points, nm }` or `ok: false` with « aucun point d'entrée océanique connu » (nothing is invented; the whole search follows); the legs carry `origin: random` and the control says « Route libre océanique, créée » (review). Measured on the real base, read only: EIDW → KJFK at 03:00, before: no route in 15 s; now 1.9 s, DOGAL 54/20 53/30 51/40 48/50 NICSO (1441.7 NM oceanic), 2839 NM in all; KJFK → EIDW the same points the other way, 3001 NM, 1.9 s; EGLL → KDEN 03:00 3.2 s (RESNO, 56/20 57/30 57/40 56/50). At 12:00 EIDW → KJFK still takes the track E (3022.7 NM, 2.0 s).

### 13.3 Proven: a matrix of flights, on the real base, kept and replayed

Six aerodromes in Europe (EIDW, EGLL, LFPG, EHAM, EDDF, LEMD) × six in North America (KJFK, KBOS, KIAD, KORD, CYYZ,
CYUL), both directions, two departure times (one inside the track system for that direction, one outside): 144
requests. For each: route or not, total time, and the proof of each section (`computed`, `published`, `random`,
`direct`). Run by AeroDB read-only on the user's base — in ONE process, sequential, at low priority, by packs of 12, outside the user's
working hours and only on the word of the ergonomics session (the load of the workstation: up to 144 × 20 s); the table goes to
`frame/aerodb/INTEGRATION.md`; a reduced set on
fixtures becomes a case replayed at every change of the engine. Accepted when: every request returns a route or a
named reason; none returns a "proposal"; no direct over 200 NM without its reason.

**Done (L5 4, 16 November, case K298)**: `tools/route_matrix.py` and the first run on the real base (11 minutes, 20:04 to 20:15): 144 requests, 110 with a route (median 1.4 s, maximum 2.3 s), 34 « proposals » of 10.6 to 14.5 s (none over 20 s), no direct over 200 NM without a reason outside a FRA zone. The acceptance (« none returns a proposal ») is NOT met: 24 of the 34 are the requests that have EHAM as an end (elevation -10 ft: the vertical profile is judged impossible), 8 are eastbound « out » to EDDF / LFPG, 2 are LEMD → KBOS (RAD LF2096). The table and the five defects are in `frame/aerodb/INTEGRATION.md`; nothing was corrected during the pass. Two departures are made for each pair: the passage at the entry of the ocean inside the window of the message of that direction, and twelve hours away from it.

**Done (L5 4, defect 1, 16 November, case K299)**: an aerodrome below the sea level (EHAM -10 ft) is normal data. The floor 0 of a published leg is the ground of the lowest aerodrome of the flight (`min(0, departure, arrival)`), in the vertical profile and in the search; the elevation of an aerodrome has a bound (-1 500 to 30 000 ft), outside it the request is refused and says which aerodrome, which value, which bound. It concerned every flight that has such an aerodrome as an end (not only the ocean).

**Done (L5 4, defect 2, 16 November, case K300)**: a retry at a lower level is made only when the reason of the first failure is a matter of level (`plan.level_matters`); otherwise the answer leaves at once with its reason (`level_retry`). `sections` and `timing` describe the requested level, the retries are listed apart (`timing.retries`). A request with no route: 4.2 s on the real base (14.5 s before).

**Done (L5 4, defect 3, 16 November, case K302)**: the pairs of the free route are tried without a fixed number, until the bound of the next exceeds the best cost found or the time of the section (3 s) is used up; `sections.free.tried` says how many. CYYZ → EDDF « out » answers a route (4.4 s).

**Done (L5 4, defect 4, 16 November, case K303)**: a RAD finding « X compulsory for the traffic via Y » (LF2096: ETIKI for REGHI) is corrected first by passing X next to Y (the free route reaches Y by X); Y is set aside only if that fails, and the answer says the detour with both distances; a RAD retry that imposes nothing new is never played. LEMD → KBOS: 3 267 NM by KORUL ETIKI REGHI, no error (3 219 NM via REGHI with two errors; 4 812 NM by the next entry).

**Done (L5 4, second run of the matrix, 16 November, 21:12-21:23)**: after the four fixes, the whole matrix once on the real base: 144 requests, 144 with a route, none a proposal, none in error, median 2.2 s, maximum 8.2 s, none over 20 s, 17 over 5 s (EIDW « out » free-route European search; the RAD retries of LEMD and LFPG). The acceptance of 13.3 (« none returns a proposal ») is met; the target of 5 s for a request with no route is met (there is none); the 17 requests over 5 s are in `frame/aerodb/INTEGRATION.md` with where the time goes.

**Done (L5 4 d1, 16 November, case K304)**: the free route makes ONE European search to all its candidate entries (`need = 2`), not one per pack of five: a goal that cannot be reached no longer makes the search go through the whole space. EIDW « out » (6 requests of the matrix, 6.2 to 8.2 s) answers in 1.4 to 2.5 s.

**Done (L5 4 d2 A, 16 November, case K305)**: a RAD finding on a rule whose target is a POINT excludes the point, not only the segments of the route found: LEMD → KBOS needs one RAD retry instead of two (7.4 → 4.2 s).

**Done (L5 4 d1 bis, 16 November, case K306)**: the free route makes another European search to the entries that remain while their lower bound (NM) is below the best chain, within 3 s, and keeps the SHORTEST chain: KBOS → EDDF « out » is back to 3 244.6 NM (d1 alone: 3 415.2), the 17 requests of the matrix over 5 s all answer in 4.66 s at most.

**Done (L5 4 d1 bis (d), 16 November, case K307)**: the bound of an extra search of the free route is a number of states (7 000), not a time: the same request gives the same route whatever the load of the workstation (the whole free route keeps a safety time of 3 s).

**Done (L5 4 d1 ter, 16 November, case K308)**: the budget of the whole free route is 60 000 states (the same request gives the same route on any load), the time of 3 s is only a last-resort safety, and the answer says when the free route was cut (`sections.free.cut`). The real America section of an exit replaces the great circle in the estimate of the pairs: KBOS → EHAM « out » 74 tries → 15, 3 119.6 NM in 2.5 s.

### 13.4 Bounded: every step has its bound and says it

| Step | Bound | When it is exceeded |
|---|---|---|
| context (base loaded) | 2 s cold, 0 s warm | the answer says the base is loading and how long it took |
| tracks of the day (already read) | 0.2 s | the crossing is a random route, said |
| skeleton | 0.5 s | — (it is arithmetic) |
| each section | 3 s | the section is a labelled direct with its reason |
| whole answer, transatlantic, cold | 5 s target, 20 s hard | nothing is ever returned after 20 s |

A graph build (about 4 s, not interruptible) is not begun when less than 5 s remain: the section is then a labelled
direct and `timing.sections[].hit` says it (accepted objection of AeroDB).

The answer carries `timing: { context_s, tracks_s, skeleton_s, sections: [{ name, seconds, bound_s, hit }], total_s }`
so the screen and the matrix read the same numbers. The loading of the launcher's state (SOG-0384) follows the same
rule: a read is bounded, said, and never blocks another.

### 13.5 Safe

The text of the tracks of the day and the text of the route are untrusted inputs (bounds already reviewed: one letter,
forty points, finite numbers). A created point is computed, never read from a text. Any new reader of a deposited
file goes through the security review before its push.

### 13.6 Order

(1) validity of a track; (2) the random route; (3) `timing` and the bounds; (4) the matrix. One report per point. The
reader of `PFR_SEG`, the Canadian reading (L4) and the published-direct NAR come after.
