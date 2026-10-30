# fuel — decisions log

The memory of the V3 fuel module: every choice, dated, with its reason. Never rely on chat history.

## 22 October 2026 — reading (lot 1) and lot 2a

- **30 Oct 2026 — refactoring R-F1 (§ 10.33): one wind rule.** `wind.runwayAxis` replaces two rules for a runway's true
  bearing (Fuel: `true`, else QFU / number + variation; the Map's `runwayBearing`: `true`, else threshold geometry, else QFU); the
  merged order is the Map's, decided by the ergonomics session on 29 Oct, with Fuel's number fallback last. `wind.bestRunwayEnd`
  replaces `weather.js runwayWind` (the weather card's main runway end), built on `components`. One visible change, explained: on
  an aerodrome whose runway records carry both thresholds and a QFU but no `true`, Fuel now takes the geometry — the invented LFML
  of the tests gives 134° where its QFU says 130°, F65 reads « 13R · ↑ 12 kt · ← 1 kt ». Bench wind (23). The Map switches
  `runwayBearing` to `runwayAxis` on its side (BUGS SOG).
- **30 Oct 2026 — the sheets editor leaves Fuel** (§ 10.34 lot A2, step 5; decided by Simplification and the user: one editor,
  in Maintenance › Appareils, `modules/aircraft/`, which has had it since step 3). Removed from `modules/fuel/module.js`
  (4973 → 4417 lines, 601 deleted, 45 added): `renderEditor`, `readEditor`, `review`, `applyReview`, `storeSheet`, the
  import / paste / OFP / ChatGPT / EUROCONTROL / fill-from / export / remove gestures and their helpers (`importFiles`,
  `importText`, `readText`, `proposeIncoming`, `mergeInto`, `uniqueId`, `rpmKey`, `rpmEditable`), `fieldLabel`, `plain`, the
  text tables `FIELD_TX` / `OPTION_TX` / `PATH_TX`, 45 `TX` rows and the `fu-txt` rule; Fuel never wrote a sheet except
  from this editor (no other `sheets.put` caller), so no writing path was kept. Kept: the « Fiches » list read-only
  (families, what each lacks, the airline's types without a sheet), « Utiliser » (Fuel's own gesture), the sheet of the
  flight marked « utilisée pour ce vol », and plain same-tab links « Modifier / Créer dans Maintenance ». `perf_prompt.js`
  (ChatGPT texts) moved with `git mv` to `modules/aircraft/perf_prompt.js` (Fuel no longer uses it; `tools/build_perf_prompt.py`
  writes it there). Cases: F25 (paste) and F76 (crosswind field) deleted, covered by M9 and M7; F79 added (read-only list,
  links, « Utiliser »); F7 and F10 follow the new markers and the new prompt path.

- **30 Oct 2026 — the .fms export, APP and CYCLE; a shared rule for the Map** (BUGS SOG's walk). `APP` is the ARINC 424
  identifier (`PR.arincApp`: the name when it already is one, « I13R »; else derived from the published name, ILS → I, LOC → L,
  RNP / RNAV / GNSS → R, VOR → V, VOR/DME → D, NDB → N, NDB/DME → Q, the SIA letter after a dash, « R06-Y »), else the name without
  spaces. `CYCLE` is the published base's cycle when Fuel knows it (`aerodb.status()`: the open zones, else the latest published),
  then the records' cycle, then the date. In `compatible({ star })`, an approach transition fits when its IAF is a point of the
  STAR (its end included), else it is not proposed with that STAR (for the Map's pane). Records of the SAME name serving
  different runways (« AMB 9E » of 02, 06, 07 at LFPO) are a family too (`siblingsOf`, `familiesOf`: one row, the runways as tags),
  besides the suffix families (ABLI4L / ABLI4R). Benches fms (36), procedures (60).
- **30 Oct 2026 — anomalies 9 to 13 of BUGS SOG's walk.** 13: one distance — the route line gives the extended path's distance
  when the chosen procedures are read (the quote's and the profile's), « d'après la route, procédures comprises »; the TOD tile says
  « TOD avant l'arrivée » (another quantity). 12: « · » separators with spaces. 10: the change line « SID → AMOLO 7A » when nothing
  was chosen (no « — → »); its placement over Fuel's bottom bar is the frame's (.f-notes, asked to V3 Frame). 11: records of the
  same name for several runways make ONE option « AMOLO 7A · 14L/14R » whose value is the record chosen, else the one serving the
  chosen runway: never two identical labels. 9: `adLabel` writes an all-caps base name as a name (« Toulouse Blagnac »), and the
  side's title is a baseline-aligned flex row (the ellipsis kept). Fixtures « LFRS TEST » now read « Lfrs Test » (F34, F44, F47).
  Case F78; F19 follows the new line.
- **30 Oct 2026 — the route text repeated the SID at each return from the Map** (BUGS SOG's walk on the real base: « LFBO AMOLO
  7A AMOLO 7A AMOLO DCT AMB … »). The eAIP writes the names with a space (« AMOLO 7A »); the text rules compared whole words, so a
  two-word name was never recognised: inserted again at each return, never read back (the SID cleared on an edit), and « AMOLO »
  read as a point beside the departure (Auto: « pas de voie près de LFBO »). Fix: `RT.glueProcWords` (a « 7A » word after a word of
  letters is the second half of a designator) in both readers of route_text.js, `RT.compactName` for every name Fuel compares; the
  text carries the ICAO designator « AMOLO7A ». Auto never routes the departure → first point leg when a SID is chosen, nor the last
  point → arrival leg with a STAR. Bench F69 (idempotence from a spaced text), case F77 (two returns, at 390 px too).
- **30 Oct 2026 — the route field completes at the cursor** (§ 10.31 part 4). A module of its own (`routecomplete.js`) on the
  pattern of `adnames.js` rather than a generalised component: the two share the CSS (`.fu-sug`, `.fu-sugitem`) and the gestures,
  not the sources (aerodromes only there; procedures, airways, points here). Airways are proposed by name around the previous
  point (the base has no airway name index; a bbox query is cheap once the zone is open). Case F75. To merge into one component
  in the inventory if a third field needs it.
- **30 Oct 2026 — A34 « pas de voie près de LACOU » was a wrong reason** (user's answer 1 of § 10.31). Diagnosed on the real base
  (read only): A34 is complete (AGN LACOU RUMEL BUGUS PERIG MAVAC LMG …, 91.3 NM along it for 91.4 NM direct), every segment from
  6 500 ft to FL195; the user's flight is at FL260, so A34 (and G39, T258 at LACOU) are closed for that leg. The base is not at
  fault. Rule agreed: the line names the airway joining the two points and its open band (`RG.joiningAirway`), the leg stays
  direct; no heuristic that follows a closed airway (it would write a route that cannot be filed). Case F74 on invented segments.
- **30 Oct 2026 — the points list groups the procedures** (the user confirmed the objection recorded in § 10.31: « une procédure
  pourrait être un point comme un autre » in the text, never in the point list). One folded `<details>` row per chosen procedure,
  in the Map's hue (copied from modules/maps/render.js PALETTE: sid, star, app — a shared token would be better, noted for the
  inventory); the exit / entry the text now carries are shown in their group. The aerodrome name in the summary line keeps an
  ellipsis on a phone (Simplification). F26 made deterministic (set_icao waits for the field on screen). Case F73.
- **30 Oct 2026 — the procedure card opens folded** (§ 10.31, user's answer 2): two summary lines, one side unfolded at a time.
  Folded rows are hidden with `visibility: hidden; height: 0`, not `display: none`: the grid keeps the columns of both sides (F34's
  « one grid ») and the selects stay out of reach. A side without data is never folded (the reading is its only gesture). The
  tests open a side before a pick (`unfold`, `pick_proc`, `wait_rows`); F35 keeps the focus on the open side while the folded one
  changes. The AD name stays in the line (the user asked for it on 29 Oct). Case F72.
- **30 Oct 2026 — the aerodrome name rule moves to frame/lib/adnames.js** (Simplification: the Map needs « LFPO Paris-Orly » at the
  pin, § 10.30 fourth reading). The pure part only (`adLabel`, `adTitle`, `adLine`); the completion and the drawing stay in
  modules/fuel/adnames.js, which imports it, as does the procedure card's title. The base has no city field: the rule takes one when
  a record carries it, and invents nothing; the elevation is not part of the label. Bench F71.
- **30 Oct 2026 — § 10.31 parts 2 and 3, the text is a view of the procedures** (user: « on doit pouvoir modifier le FPL après
  sélection SID / STAR »). The text follows the model at every settled choice and once the records are drawn; it is read back when
  the pilot leaves the field (not while typing: no choice flickers). The names are matched on the main records of the two
  aerodromes (a waypoint never ends with a digit and a letter the way a procedure does). The exit / entry is written only when no
  point of the procedure (transition included) is on the route: the join is then at the first common point (expandedPath, § 10.20).
  DCT is opt-in in `textFromTokens` (Fuel's field), so routing.js keeps its « PT1 UN460 PT2 » texts. A chosen SID whose name the
  pilot deleted is cleared — the old flights get the names written at their first drawing, so an edit never clears a choice the
  text did not show. The Map's ranking of SIDs by exit uses `compatible({ route })`. Cases F69 (bench), F70; F28 adapted.
- **30 Oct 2026 — a typed airway is never a point** (user: « LFBO … GILUX A3 MOTAL J18 KOTAP LFPO » gave 1 871 NM and a trace to
  Gibraltar, « transitoire et inexplicable »). Diagnosis on the user's flight (read only): `route.points` held { id: 'A3', 36.05 N
  5.30 W }: routePoints asked `aerodb.coords()` for every name-shaped word, and some point of the base carries the identifier A3. The
  ergonomics reading (an expansion along A3 into Spain) was not the cause: routing.js never expands a typed airway. Rule agreed with
  Simplification: an airway-shaped word between two named points is an airway when the base has one of that name near A; a point
  of the base never wins against it; without such an airway the identifier stays a point. A typed airway is followed along its
  own nodes in the leg's corridor (`RG.along`), else the leg is direct with one line. No « follow the airway anyway » heuristic (it
  would write a route that cannot be filed). Case F68 with the user's exact text on invented positions; it fails without the fix.
- **30 Oct 2026 — § 10.31 part 1, Auto idempotent** (user, LFBO → LFPO: successive Autos made a loop through Spain, and « LACOU
  LMG n'est toujours pas trouvée »). Two causes. (1) The SID exit was inserted right after the departure, before the SID's name
  (« LFBO LACOU LACOU7B LMG »): the leg LACOU → LMG was never adjacent, never routed. It is now written after the name. (2) Every
  word of a previous Auto stayed a constraint, and a stale `via` on a pinned point blocked its leg: Autos stacked. The provenance
  is now kept with the route (`route.auto.seq`, aligned by longest common subsequence in `route_text.js provenance`, so a word the
  pilot adds or removes shifts nothing); generated words are dropped before routing, `via` is re-derived from the pinned airway
  words, the intermediate points of a generated airway go with it. Rejections: a loop (a node already on the route), then the
  most stretched legs while the chain exceeds `detourPct`. The reason of a direct leg is in the line (four texts). The text keeps
  no « DCT » for now: the ICAO rendering with DCT comes with part 2 (the text as a view of the model). F8 updated (a second Auto
  recomputes and says so), F28 extended (SID name in the text), F67 new.
- **30 Oct 2026 — § 10.30 fourth reading, the SIA's initial approach segments** (user at LFPO: six identical rows « INA RNAV RWY
  06 »): an APP record that never reaches a runway threshold, or named « INA », is a transition (`isAppTransition`). A segment named
  like a final stays that final's own (the CIFP way: ILS09 via VA201); a segment no final names is shared by every final serving its
  runway (the SIA way). Consequence: entry records that loop without a runway are segments, no longer rows (bench updated). Labels:
  the type and the runway; the SIA letter only when two finals collide, then the first point. The junction rule moves into
  `chainOf` for appTrans → app only (BUGS SOG agreed not to touch it meanwhile). No AIP data in the repository: the benches and the
  fixture LFVE are invented records of the same shape as LFPO's. Cases F66, F26 (« via IC301 »); benches procedures (55), current_flight (81).
- **30 Oct 2026 — § 10.30 third reading, the wind arrows turned and three colours** (user: « on atterrit toujours à contre-vent, la
  flèche vers le bas ; vert / orange / rouge »): `label()` now says where the wind blows in the runway's frame (↓ head, ↑ tail, ←
  from the right, → from the left), which reverses the arrows of 25b887349. `severity()` and `LIMITS` join wind.js, the Map reads
  the same call. In Fuel the option and the summary's runway take `wind-ok | wind-warn | wind-alert` on `--sog-ok / --sog-warn /
  --sog-err` (no hard-coded colour, the fallbacks removed); the reasons: a tail wind (any, then over 5 kt), a crosswind over 10 kt,
  over 20 kt or over the sheet's limit. A sheet limit replaces only `cross`, never `crossWarn`. F64, F65, benches F62 and F32.
- **30 Oct 2026 — the side's title reads summaryOf** (§ 10.30, second reading): one `.fu-procsum` line under the title, one span per
  part (runway with its wind, procedure via its transition, approach via its transition), separated by space, not by a character
  (the wind label already holds « · »). The wind is `runwayWind` of the chosen runway (it now returns the components `c` too). The
  title is patched at every paint, so the summary follows each choice. F34 leaves the summary out of the title it compares; F65
  checks it.
- **30 Oct 2026 — § 10.30 second reading, the rules first** (Simplification, after the user's test of af261d3e3; BUGS SOG waits for
  them): `familyOf`, `siblingsOf`, `familiesOf`, `compatible`, `summaryOf` in frame/lib/procedures.js, pure, benched (F32). A family
  needs two suffixes among the aerodrome's records (`familyOf` alone is only a form). A STAR joins an approach when it serves one of
  its runways, never by point continuity (§ 10.23). `summaryOf` keeps « Aucune » to the caller (null) and joins with « via », the same
  word in the four languages; the wind is the label of wind.js. Fuel's side title reading summaryOf comes next.
- **30 Oct 2026 — § 10.30, the Map's return in one trip and the wind on each runway** (Simplification, keys confirmed with BUGS SOG):
  the address keys are `rwy sid star app apptrans`, lower case, only those (no SID / STAR transition): `trans` and `appTrans` are
  no longer consumed; `apptrans` is mapped to the field `appTrans`. `applyProposal` makes its choices quietly (`choose(k, v, true)`:
  route.procedures changed, nothing drawn), then draws once and arms the single deferred write (`settleSoon`); one change line for
  the side. Nothing admitted → nothing written, nothing said. Wind: `frame/lib/wind.js` gains `label()` so that the Map and Fuel print
  the same text (arrows where the wind comes from: ↑ head, ↓ tail, ← / → crosswind). The METAR is the one of the Départ step
  (`WX.station(metar, null)`: never the TAF of the flight time), taken from `S.wx` through the card's host (`wind(icao)`); the true
  axis is the runway record's `true`, else `qfu` (or the number × 10) + the aerodrome's `magVar` (`wxAd`). Orange: tail over 5 kt;
  crosswind over the sheet's `maxCrosswindKt` — no sheet carries this field and the editor does not offer it: the rule is ready,
  the field is for a later lot. The card is drawn again when the weather arrives (`S.P.render()` after `renderWx()`). Cases F63, F64.
- **30 Oct 2026 — § 10.30, the rules first** (the Map's pane depends on them): `runwayOf` and `firstServing` added to
  frame/lib/procedures.js; frame/lib/wind.js `components()` (head / tail and cross wind on a runway, true directions, rounded to the
  knot; null for a missing or variable wind). Benches procedures.html (F32) and wind.html (F62); wind.js in frame/sw.js. Fuel's
  consumption of several keys in one trip and the wind suffix of its runway list come next.
- **30 Oct 2026 — control characters out of the .pln** (security review of 99d28acd0): `escText` of frame/lib/fms.js removes the
  characters XML 1.0 forbids (U+0000–U+0008, U+000B, U+000C, U+000E–U+001F) before escaping, so a damaged aerodrome or point
  name never makes a file MSFS refuses (`escAttr` goes through it). Bench fms.html: one more check (fails without the change).
- **29 Oct 2026 — flight plan export to the simulators, first step: the download** (V3 § 10.28, user: « Prévoir un export .fms à
  minima (deux formats pour xplane), voire le pousser direct dans le dossier ad hoc sur X-Plane. Prévoir un export msfs2024/2020 »).
  Pure writers in `frame/lib/fms.js` (`toFmsV3`, `toFms1100`, `toPln`, `fileName`, `exportOf`, `airacOf`, `lla`; bench
  `frame/lib/test/fms.html`, case F60); in step 5 Departure a card « Plan de vol pour le simulateur » with three text buttons
  (« .fms (XP 11/12) », « .fms (XP 10) », « .pln (MSFS) », 44 px, disabled with the reason as title when the route has fewer than two
  placed points) that download the file by a Blob and a temporary `<a download>`, named `LFRS-LFML_2026-10-30.fms` (case F61). The
  card sits in step 5, not in the sticky result (which must stay under 120 px, F2) and not near the Vol / Départ aerodrome lines
  another session is editing. **Sending the file straight into X-Plane's `Output/FMS plans/` is not in this lot**: it will be a
  verb of the launcher (workstation only); the download is the first step and the only one that works in a browser. What the
  files contain and what was a choice:
  - **Path.** Fuel gives the writers `CF.expandedPath(flight, procs)` (route + chosen procedures, read by `CF.loadProcedures`
    when not yet read) and `{ procs, names, kinds }`. `.fms` version 3 has no field for procedures, so it gets the whole flown path
    (SID and STAR points included, no runway threshold, no missed approach). `.fms` 1100 and `.pln` get the route's points only
    (`origin === 'route'`) plus the procedures by name: X-Plane and MSFS expand them themselves; writing both would draw them twice.
  - **Altitude.** Airports 0 (or the elevation when the path carries one); a route point the planned level, or its own `alt_ft`
    step, which then holds for the following points; a procedure point (version 3 only) its constraint when it has one, else 0.
  - **Point types.** Departure and arrival are airports (type 1); otherwise the point's `kind` / `type`, then `opts.kinds[id]`
    (Fuel asks `aerodb.find` for ids of at most four letters: a navaid whose name starts « NDB » is 2, any other navaid 3), then
    28 for an id that is a written coordinate (`4830N`, `N48E002`…), else 11. **Not sure**: the route points do not carry their kind,
    so a VOR or an NDB that aerodb does not find is written as a fix (11), which X-Plane resolves by identifier and position.
  - **`.fms` version 3.** `I`, `3 version`, `1`, count minus one, then `type ident alt lat lon`; altitude and coordinates with six
    decimals and a dot, as X-Plane writes them. Line ends are **CR LF** in every file (X-Plane and MSFS read both; Windows is where
    these files live).
  - **`.fms` 1100.** Header `I`, `1100 Version`, `CYCLE`, then `ADEP`, `DEPRWY RWnn`, `SID`, `SIDTRANS`, `ADES`, `DESRWY`, `STAR`,
    `STARTRANS`, `APP`, `APPTRANS`, each line omitted when it has no value; `NUMENR n` counts every following line, the ADEP and ADES
    lines included (as X-Plane writes it); lines `type ident via alt lat lon`, `via` = `ADEP`, `ADES`, the airway that reaches the
    point, else `DRCT`. **Cycle**: the AIRAC ident (`2611`: year, then the cycle's number in the year, counted from the cycle that
    starts in the first 28 days of January) of the chosen records' `source.cycle` (either `2610` or a date), else of the flight's day
    (`airacOf`: 2601 starts 22 Jan 2026). **Not sure**: names are `nameOf(record)` without spaces or dots, so an approach named
    « ILS Z RWY 25L » is written `ILSZRWY25L`, whereas X-Plane's own navdata calls it `I25L`; X-Plane may not match it, and the
    runway and the transition are what it reliably reads. A transition is the record's `transition`, else the fifth field of its
    identifier; `NONE` and `ALL` are not written.
  - **`.pln`** (AceXML). Document, `Descr`, `FlightPlan.FlightPlan` with Title « DEP to ARR », `FPType` IFR, `RouteType` HighAlt
    above 18 000 ft else LowAlt, `CruisingAlt` (`35000.000`), `DepartureID` / `DepartureLLA`, `DestinationID` / `DestinationLLA`,
    `Descr`, `DepartureName` / `DestinationName` (only when aerodb knows the name), `AppVersion`, then one `ATCWaypoint` per route
    point: type Airport / Intersection / VOR / NDB / User, `WorldPosition`, `ATCAirway` on a point reached by an airway, `ICAO`
    with `ICAOIdent` (none for a User point). On the airports: `RunwayNumberFP` (`7`, no leading zero) and `RunwayDesignatorFP`
    (`LEFT` `RIGHT` `CENTER` `NONE`), `DepartureFP` (SID) / `ArrivalFP` (STAR) / `ApproachTypeFP` (ILS, LOCALIZER, RNAV, GPS, VOR,
    NDB, from the approach's name: « ILS Z RWY 25L », or CIFP's « I25L ») / `SuffixFP` (the letter of « ILS Z »). DMS format
    `N48° 43' 22.80",E2° 22' 44.40",+000291.00`, seconds rounded once so that a minute is never 60, no zero padding of degrees,
    minutes or seconds, altitude on nine characters. XML special characters escaped in texts (`& < >`) and attributes (and quotes).
  - **2020 and 2024 differ only by `AppVersion`**: 2020 writes `11` / `282174`, 2024 writes `12` / `282174`. **Not sure**: the real
    build numbers and whether 2024 changed anything else in the document; MSFS does not check them on reading as far as we know, and
    reads a 2020 file. The Fuel button writes the 2020 variant (`pln2020`), which both versions open; `exportOf('pln2024', …)` is
    there for the day it matters. **Not sure either**: whether MSFS wants the SID's transition (it has no field here, only
    `DepartureFP`), the padding of minutes and seconds in the DMS strings, and the order of the airport's children (the usual order
    is followed; the reader should ignore it).
  - Checked by the bench on an invented flight (LFXA to EIXB, invented procedures and fixes: no AIP data), not in a simulator.
- **29 Oct 2026 — the Map's proposal waits for the complete screen** (noreg red on efbb97f49, F41: « Aucune » said but not written):
  since the rows are drawn during `refsPending` (636a05179), a proposal could be applied while the aircraft registry was still
  loading and its deferred write was lost; `applyProposal` now waits for `!host.pending()` (the next render applies it). F41 also
  makes each trip go through the Map, as a real one does (the frame mounts Fuel again on the way back).
- **29 Oct 2026 — the aerodrome field is a search** (Simplification, after 842ac149b): `maxlength=4` lifted; while the field has the
  focus nothing is written but a 4-character code aerodb knows (`AD.known`, written once the field still holds it) or a pick of the
  list (`isPicking`); emptying the field to search writes nothing. On leaving the field (`revertAd`): empty → the aerodrome is
  removed; a 4-character code aerodb does not know and that proposed nothing → written (an aerodrome typed on purpose, absent from
  the base); any other text (a name, « orly » when it proposed aerodromes) → the field goes back to the saved code. A typed name
  never reaches `route.dep / arr / altn`. The name line reads the field, not the route. `setAd` holds the former write path
  (started flight: other departure = other flight, other arrival = diversion; route text and weather follow). Case F48.
- **29 Oct 2026 — the aerodrome's name where its code is, and progressive completion** (user, V3 § 10.27; decided by the ergonomics
  session): new file `modules/fuel/adnames.js` (`createAdNames(host)`, like the procedures block: ctx, body, flight, gone) so that
  `module.js` only gets the markup and four calls. The name is `aerodb.coords(code).name`, the very source of the procedures card's title, kept per
  code until aerodb's next `change` (answers, unknown ones included, so a refresh never asks again); a line keeps its text while the answer for the
  same code is awaited and is emptied for another code, so it never shows a stale name. The completion uses `aerodb.find(q, 40)` filtered to
  aerodromes with a four-character code, seven at most (`find` ranks code, names starting, towns, then the rest: forty are asked so that seven aerodromes remain
  when towns and points come first). The list is one `[data-adsug]` of the fields' container (`position:absolute`, the container is `relative`),
  placed under the field's label from `offsetTop`; `pointerdown` and `mousedown` are cancelled on it so the field keeps the focus and
  the click registers (no timer); `focusout` closes it. A pick sets the value and dispatches `input`, with a flag so that this event does not
  reopen the list. The fields stay at `maxlength=4`: a typed name is its first four letters (« orly », « toul »); lifting the
  limit would write a name into `route.dep` and the route text. The three columns are 12 em wide (were 8) so the names read. Step 5:
  Departure and Arrival rows in the summary plus the names beside the first and last time of the list. Cases F44-F47.
- **29 Oct 2026 — a flight dated in the past says so** (user, V3 § 10.28): a flight not started whose `planned_at` is more than a
  minute behind now shows « Vol daté du 26/10 14:00Z, dans le passé : météo et NOTAM ne valent plus. » under the level and the
  date (step Vol) and on the plan (the sticky result), as `f-warn` lines; never blocking (the quote and every gesture stay). Case F43.
- **29 Oct 2026 — « Source »** (V3 § 10.25; aerodb d88463e51 sets `source.url` on every eAIP record it serves): `sourceHtml` fills
  the slot of the secondary line with one link per chosen SID / STAR / approach that has an `https://` `source.url` (new tab,
  no opener, the page's name in the title, the kind added when there are two); `sourceTitle` puts the document of a record without
  a public address in the line's title. Fuel builds no address. The invented fixture LFML gets a `charts.base` on
  an invented path under the SIA host (the only host aerodb links to since 97bf5577f) and a page name for MEN1A. Case F42.
- **29 Oct 2026 — « Sur la carte » and the Map's proposal** (V3 § 10.23; frame/INTEGRATION § 6.1): a text button in each side's
  title (not for an aerodrome without data) sets `#maps?choose=…&icao=…`; at mount Fuel consumes `focus` with the proposal keys
  (`rwy sid star trans app appTrans`, `none` = null), and `propose(side, fields)` applies them after the first draw of the side
  (its records must be known for a single-runway procedure to set the runway), field by field through `choose`, then
  `changeLines` says it. Also: the reading's progress callback escapes the aerodrome code in its selector (`CSS.escape`; security
  review of the refactoring). `isDoubt` (a doubtful or nameless record, never listed) moves to frame/lib/procedures.js, so that the
  Map's choice mode stops re-implementing it (bench procedures.html). **Security of the proposal** (security review): the address
  can be edited by any link and carries no ICAO, so only « none », a runway offered for the flight's aerodrome on that side
  (`^\d{2}[LRC]?$`), or a record of that aerodrome of the right kind and not doubtful is admitted, and the value written is the
  record's or the runway's, never the received string; anything else is ignored. Case F41 (a SID of the other aerodrome as a
  STAR, an unknown runway and a raw string change nothing).
- **29 Oct 2026 — the card beside the Map, the failure's counts, the phone's picker** (Simplification, user on a phone: « le choix
  d'une procédure réaffiche immédiatement le popdown »): the three-column grid starts at 480 px of container (the dual view at 1280
  gives about 515 px) and falls back to one column (`fu-one`, `fitGrid`, refitted by a ResizeObserver) whenever it would overflow —
  never cut wins; a failed reading shows the translated counts alone when `stats` has pages, the launcher's English message only
  without them; on a coarse pointer the card never gives the focus back to a select after a change (a rebuilt box or a replaced
  region), since the native picker reopens on focus — on a computer the select that had it keeps it. Cases F34 (no overflow beside
  the Map), F35 (focus by pointer kind), F38 (no English message with counts), F40 (touch: no list focused after a choice; fails
  without the change).
- **29 Oct 2026 — refactoring (h) and (i): one time format, pure benches, fixtures in one place, waits on a state** (V3_SPECIFICATION § 10.29 h, i).
  (h) `fmtDayZ(iso)` in `frame/lib/time.js` (« 29/10 16:53Z », UTC, the same in every language) is the only writer of the « lu le … » date; the
  hand-made format of the card is gone (`frame/lib/test/time.html`, case F39). (i) The vertical path has its bench,
  `modules/fuel/test/vertical.html` (shape: strictly growing distance, no jump, never rising once the descent has started, constraints at / min /
  max / between held, runway thresholds, short flights, empty cases): case F23 runs it instead of opening the page. The invented procedures of the
  cases (`proc_docs`, `rec`, `file`, LFRS, LFML, LFVA–LFVD, the hand-read index) moved to `tests/v3/fixtures/procedures.py`. The fixed `c.wait(...)`
  of `cases/fuel.py` wait on a state: `Ctx.quiet(expr)` (a value unchanged for a while: the result bar, the aircraft list, the number of
  notifications), the flight record written, a notification said, the late reads of a slow mount counted (`window.__slow.pending`); two polling
  loops over the record stay. F15 and F17 already waited on the record and the focus; the « nothing new was said » checks (F19, F21, F26) wait for
  a quiet count, then count.
- **29 Oct 2026 — refactoring (f) and (g): one write per series of choices, and the challenge decisions applied** (V3_SPECIFICATION § 10.29 f, g;
  § 10.20, § 10.23; the code landed with the extraction because it lives in the functions that moved). (f) `choose()` redraws the lists in
  place at once and defers the rest: 400 ms after the last choice of a series `settled()` writes the flight once and refreshes once; the quote
  waits for the chosen procedures to be read (`ensureProcs`) and the write goes with it (`writeAfterProcs`), so a series is one write whatever the
  order (case F36); an unmount writes a pending series at once. (g) **No departure lock** (`depPassed`, `procPassed`, `rowsKey`'s third term
  removed; nothing is locked after the start, case F16). **No conflict notification** (⚠ and the title are enough; cases F21, F26). « Lire » and
  « Relire » are one code path (`read`, the same `data-do="procfetch"`; case F27). **The OFP proposes**: « Charger mon OFP » fills only the
  sides with no choice (`null` is a choice) and lists only what it filled (case F19). **`legsAt` kept, one state**: set after the start, only when
  the legs or `profile.path` really change, kept while they do not. `focus` is read once with `ctx.consume('focus')` (the frame removes it from the
  address). The launcher is never called by Fuel: its refusals reach it through aerodb's `{ reason, wait, message }`, read as they are. A failed
  reading says its `stats` after the reason (« 0 page lue sur 31 », `procCountRead`). `coverage(icao).partial { pages, doubt }` (aerodb
  567b94440) gives « N non lues » (case F37); `coverage().level` is never used to know whether an aerodrome holds procedures.
- **29 Oct 2026 — refactoring (d) and (e): the procedures block is `modules/fuel/procedures.js`, and the card is redone** (V3_SPECIFICATION
  § 10.29 d, e; § 10.23, § 10.27 for the title; user: « c'est moisi »). Out of `module.js` (4 900 → 4 345 lines): the whole block of the chosen
  procedures' display, choice, on-demand reading and OFP lines, with its texts in `procedures_texts.js` (the `proc*` rows ×4; `dep` / `arr` copied,
  `procTitle` stays on the screen). `createProcedures(host)` → `{ sync, render, reset, choose, read, onChange, focus, applyFocus, snapshot, applyOfp,
  afterRead, stop }`; `host` gives what the block needs from the screen and nothing else (ctx, flight(), route(), body(), plan(), key() = `procsKey`,
  gone(), save(), settled(), drop(), refresh()). The state is one object per aerodrome (`ads`), moved with it; the reading in progress (`reading`,
  was `procReadingNow`) is module-level in `procedures.js` and its end goes to the live instance. `module.js` keeps the step flow, the quote (the
  path of the chosen procedures: `procsKey`, `fpNow`, `ensureProcs`, `quoteNm`), the progress and the write of the flight. The stylesheet of the card
  (`PROC_STYLE`) is exported and included in the screen's. **Rendering in place**: a redraw replaces only the options of the existing selects and the
  text of the title and the line, each only when it changed; the box is rebuilt only when its structure changes (aerodrome, with or without data, a
  transition list appearing or disappearing, started or not); the focus is never moved (case F35). **The new form**: title with the aerodrome's name,
  one secondary line « lu le … · Relire · N non lues », a fixed grid identical on both sides (subgrid), no label cut, one column under 600 px,
  no runway in a label when a runway is chosen (cases F34, F35; the single write, F36). Interface kept small: nothing of the card reads `S`.
- **29 Oct 2026 — refactoring (c): the rules of the procedures in `frame/lib/procedures.js`** (V3_SPECIFICATION § 10.29 c; no visible
  change). Pure ES module, no state, no text, no DOM: `rwNum`, `sameRwy`, `servesAll`, `servesRwy` (they were in `module.js`, `rwNum` also in
  the flight library), `nameOf(rec, id)` (the record's name, else the id's third field; null for none or `NONAME` — Fuel adds its
  « STAR sans nom »), `conflictsOf` and `orderProcedures` (moved from `flight_path.js`, which re-exports them during the transition, and so
  does `current_flight.js`), `transitionsOf(recs, id)` (SID and STAR), `appChoices(apps)` → `{ list, transitionsOf(id) }` (the approach
  given by its entries listed once, its transitions the records that lead to its final record: the logic of `procRowHtml`),
  `runwayChoices(known, all, ad)` (the three sources; `ad`, the aerodrome's base record, is passed in: Fuel asks aerodb for it only when
  the first two sources give nothing, `runwayChoicesOf`). Fuel's local copies and its `dedupProcs` are gone (`CF.loadProcedures` applies
  `dedupProcs` since § 10.29 a). `frame/sw.js` and the `meta.files` of fuel, maps and report list the new file. Bench
  `frame/lib/test/procedures.html` (32 checks: the ones that were in `current_flight.html` moved, plus the new functions), noreg case F32.
- **29 Oct 2026 — the reasons of doubtful records are codes** (aerodb 72ca8b2fa): `TX.procWhy` gets the six codes ×4 (`geometry`,
  `unresolved`, `name`, `repeat`, `zigzag`, `unread`), so a reading's notification never shows a bare code; the French phrases of
  the pages not read stay until aerodb gives their codes, then the table holds codes only (refactoring (d), V3 § 10.29).
- **29 Oct 2026 — the procedure rows no longer wait for the aircraft registry** (user: « vue Carburant + Carte : très long à charger
  (10 s ?) avant de faire apparaître les procédures »). Measured in the test environment on the user's real files (LFPO 309, EIDW
  196 records): rows at 0.3–0.5 s, one render, departure and arrival read in parallel, rowsKey 0.2 ms — but drawn only after
  `refsPending` (aerodb.aircraft() then the sheets), which the rows never need; on the workstation the real registry through the
  launcher can take seconds. `refresh()` now draws the rows while `refsPending` (not while `flightPending`: the flight is not read
  yet). Case F33 holds aircraft() back 6 s and expects the rows within 4 s (it fails without the change).
- **29 Oct 2026 — the reading's reasons come from aerodb's catalogue** (aerodb bf540e3c2, V3 § 10.29 c): `stats.reasons` carries
  codes only (7 for pages, 6 for doubtful records); their labels ×4 are `AeroCatalogue.READ_REASONS`, read through
  `aerodb.sources()` when a reading ends. `TX.procWhy` (the tool's French phrases) is removed; an unknown code is shown as is. A
  failure always shows the launcher's message after the reason, « aucune procédure lue » included (it says the documents and
  pages seen).
- **29 Oct 2026 — refactoring (a) and (b) of V3 § 10.29: aerodb is the only cache, one state per aerodrome**: `procMemo` and
  `S.procCache` removed — every draw asks aerodb (`procedures(icao)`, `runways(icao)`, `aerodromes`, `coverage`), which memoises
  per revision since cdbeb5c29; the « empty list after a reading » class of bugs had its cause there. `S.procRecs` and
  `S.procStats` become `S.ads` (one object per ICAO: `recs`, the records shown at the last draw; `stats`, the counts of its last
  reading on demand), read through `adOf` / `procRecsNow`; `dropAd(icao)` is the one function that forgets an aerodrome on
  aerodb's `change { procedures: ICAO }` (all aerodromes on `changed` / `refreshed`) and drops the flight's read procedures when
  it is its departure or arrival. No behaviour change.
- **29 Oct 2026 — the reading on demand is never silent** (user, EIDW: « aucun log. est-ce que ça a marché ? » — the job ran
  3 min 30 and answered `failed`, « no procedure could be read », 31 warnings; nothing was shown): the start is said (`procStarted`),
  every end is said through the context of the mount that started it, even after an unmount (a module-level `procReadingNow`
  replaces `S.procFetch`; the unmount no longer aborts the job); `failed` carries the launcher's message and the number of
  warnings, « aucune procédure lue » ×4 when nothing was read; a second tap during a reading says « déjà en cours »; the button's
  text (source, i/n) is kept in that state and redrawn with the rows. Case F14 checks the start notification.
- **29 Oct 2026 — the date field after « Maintenant »** (user: the field showed « dd/mm/yyyy » while « +30 » worked): planned_at
  stays null (the flight leaves now), but the field shows the present time (`whenField`) instead of an empty `datetime-local`, which
  the browser draws as its pattern. Case F6.
- **29 Oct 2026 — Auto routes from the end of the chosen SID** (user: « un départ FINOT depuis LFBO, premier point GOSAD, ne sort
  pas GAI via G36 en Auto »; Simplification, BUGS SOG 1ee2673a5): `autoAirways` passes the chain of its tokens to
  `CF.routingChain(flight, procs, chain)` when the chosen procedures are read; the points it inserts (end of the SID after the
  departure, start of the arrival before the arrival) become tokens and points, so they are written in `route.text`
  (« LFBO FINOT G36 GOSAD … »; expandedPath joins the SID on FINOT), and the leg between the aerodrome and such a point is never
  routed (the procedure covers it). Without procedures read, as before. Case F28 (invented airway from the seeded SID's end).
- **29 Oct 2026 — compatible first; one shared rule; the part not read** (Simplification, V3_SPECIFICATION § 10.23 and § 10.26).
  (1) `conflictsOf(key, rec, choice, byId)` moves to `frame/lib/current_flight.js`, pure, returning data (`{ kind: 'rwy', rwy }`,
  `{ kind: 'starApp', app, appId }`; same rule as before: the runway only, and without a runway a STAR that serves no runway of the
  chosen approach); Fuel only turns the data into its ×4 texts (`conflictsOf` here is that wrapper). `orderProcedures(list, key,
  choice, byId)` is next to it: compatible first then ⚠, in each group X-Plane records last, then runway (all-runway records first),
  name, transition; for `key: 'rwy'` the runways served by the chosen SID (Departure) or approach (Arrival) lead. The Map calls the
  same two functions in its choose mode (BUGS SOG's lot). Existing exports untouched; bench `frame/lib/test/current_flight.html`
  (+14 checks, D38). (2) Records with `status: 'doubt'`, and until aerodb sets it records without a name (`name` empty or id
  `….NONAME.…`), are filtered out of everything (lists, `S.procRecs`, runway names); the muted line under each side's row counts
  them (`m.unread`) — since fe04ed8b8 aerodb keeps `doubt` records out of `procedures()` (Fuel never asks `{ doubt: true }`), so the
  count is the nameless records that still reach Fuel, `stats.doubt` of the last reading of that aerodrome in this session
  (`S.procStats`) and `coverage().doubt` if aerodb gives it one day: **a persistent per-aerodrome count (and pages `ok: false`) needs
  aerodb to expose it**, reported. `data-source-slot` is the hook of § 10.25. `TX.procUnnamed` stays: a stored choice that is nameless is still named
  « STAR sans nom » in the cell kept outside the list. (3) aerodb's `runways()` now also derives runways from every record's
  `runways` and does not skip doubtful or nameless ones: Fuel drops a position-less runway that only unread records name
  (`runwayChoices`) — reported to AeroDB (`runways()` should ignore `doubt` and nameless records). Cases F22, new F31.
- **29 Oct 2026 — « Relire » on a row that has procedures** (user: « il manque un bouton “rafraîchir” les procédures (avec une date
  pour le dernier fichier) »; Simplification, § 10.20): the reading on demand existed only without data, so LFPO could not be read
  again after aerodb's fixes. `procFileHtml`: the date from `coverage(icao).read_at` (aerodb's lot of 17:00; null → the button
  alone), ⌛ when `coverage().outdated`, then « Relire » with the same `data-do="procfetch"` (fetchProcs unchanged). Case F27. The
  lists' order (compatible first, then ⚠) and moving `conflictsOf` to frame/lib/current_flight.js come in the next commit.
- **29 Oct 2026 — procedure rows in step Route** (user: « star et sid sont “route”, pas “vol” »): before the start the Departure and
  Arrival rows leave step 1 Flight (after the aerodromes) for a card « Procédures » at the end of step 2 Route, after the route
  text, the points and the SimBrief / OFP row (`data-block="procrows"`, box `data-procbox="route"` instead of `"vol"`;
  `renderProcRows` fills it before the start and empties it after, the card is then hidden). After « Start the flight » nothing
  changes: the rows stay in the « Procédures » card of step 5 Departure. `#fuel?focus=arr` opens step 2 before the start and 5
  after (it was 1). `focus=dep` is not handled by the module (only `route` and `arr`): not added. Changing an aerodrome (step 1) and
  choosing its procedures (step 2) are now two steps, as the route already is. Cases F11 (rows in step 2, none in step 1, the card is
  last), F14-F26 (the helper `to_step`, `set_icao` goes back to step 2).
- **29 Oct 2026 — ⚠ for the runway only** (Simplification, § 10.23, after f3354a593 marked almost every real STAR: LFPO's STAR
  of runway 20 ends at a hold, the RNP 20 records start elsewhere): `conflictsOf` keeps the runway (a SID, STAR or approach that
  does not serve the chosen runway; with no runway chosen, a STAR serving no runway of the chosen approach, `procConflictStarApp`)
  and drops the STAR → approach and transition → STAR-end continuity (`procConflictStar`, `procConflictTrans`, `sameFix`,
  `firstFix`, `lastFix` removed). F21 and F26 adjusted.
- **29 Oct 2026 — conflicts marked ⚠, not forbidden; flat lists** (user, 29 Oct, capture of the approach list with no runway
  chosen: five one-line groups « Piste 02 … Piste 20 », « on doit pouvoir choisir quand même, mais c'est affiché “conflit” avec la
  RWY ou la STAR ; si gris est périmé, orange serait en conflit »; V3_SPECIFICATION § 10.23): this reverses the pruning of the
  28 Oct entries (the lists cut by the runway, the choice removed when another made it incompatible). (1) The lists are never cut
  by the runway and `procChosen` removes nothing but the transition of a changed procedure; a procedure serving a single runway
  still sets it when none is chosen. (2) Each option is marked by `conflictsOf(key, rec, o)` against the side's current choice `o`:
  the runway (SID, STAR, approach); a STAR whose last fix is not where the chosen approach transition starts (else no point of the
  chosen approach, nor the first fix of one of its transitions — a STAR may end at an IAF that is the start of a transition);
  an approach transition that does not start at the STAR's last fix. Fixes: same identifier, or within 0.5 NM; no point, no
  conflict. The label ends with ` ⌛` then ` ⚠`, the option has `class="outdated"` and/or `class="conflict"` (`--sog-warn`) and a
  title joining the reasons ×4. (3) ONE `ctx.notify` ×4 when a conflict appears (`conflicts` before and after the choice,
  keyed by kind, id and reasons): « ⚠ MEN1A : Ne dessert pas la piste 31L ; I13R : … », nothing at the next redraw, nothing for a
  choice without conflict; `TX.procReset` is gone. (4) Flat lists: no `<optgroup>`; sorted X-Plane last, then by runway (the
  records serving all first), then name, then transition; the runway is in the label only when the record serves exactly one and
  its name does not contain it (« MAN1A · 07 », « RNP RWY 02 »). Note: with real data nearly every STAR is marked once an approach
  is chosen, because the eAIP STAR ends at an IAF the approach record does not start at; the mark says « no common point », it
  does not forbid. Cases F11, F13, F20-F22, new F26.
- **29 Oct 2026 — ⌛ instead of « périmé »; `too-soon`; synchronised procedures** (user: « plutôt que “périmé”, un symbole court,
  peut-être une couleur (gris ?) »; Simplification): an outdated procedure ends with ` ⌛` (`PROC_OLD`) in the lists, its
  transitions and the change notifications (`procNameOf`), with `class="outdated"` (`color: var(--sog-muted)`; a phone's native
  picker ignores it, the symbol carries the meaning) and the title ×4 « Lue sous un cycle antérieur : à relire »; `TX.procOutdated`
  is gone. aerodb's `too-soon` refusal (f9f66de6f, `wait` in s) gets its text ×4. aerodb's `change { procedures: ICAO, coverage:
  true }` (cce670d28, a proc/ file arrived by synchronisation) was already covered by `onProcChange` (any `procedures` key empties
  the whole cache; the flight's aerodrome reads its procedures again): checked, no code change. Case F13 checks the symbol, the
  class and the title.
- **29 Oct 2026 — a procedure without a name** (Simplification): a record read with `name: null` (id `….STAR.NONAME.…`) is
  labelled by its kind, « STAR sans nom » / « SID sans nom » / « Approche sans nom » ×4 (`TX.procUnnamed`), never « NONAME »
  taken from the id.
- **29 Oct 2026 — the reading's counts in the success notification** (aerodb 636a020f4, `stats`; Simplification): « {n} procédures
  lues sur {p} pages », then « {r} pages non lues (motif le plus fréquent : …) » when `rejected` > 0 and « {d} procédures écartées
  par le contrôle de géométrie » when `dropped` > 0; `n` is the answer's `procedures.length` (right on the first reading). The
  tool's five reason phrases are translated ×4 (`TX.procWhy`), an unknown one is shown as given. Without `stats` (older
  launcher), the former « {n} procédures lues ».
- **28 Oct 2026 — the vertical path folded back on the user's flight LFBO → LFPO** (user's report: 524 NM, the profile drops to
  1,600 ft around 400 NM, jumps back up around 520 NM). Reproduced from the user's own saved flight and files (read only; no
  procedure content is kept here). Causes: (1) the saved choice had the SAME record as approach and as approach transition, so
  `expandedPath` chained its fixes twice (524 NM for a 327 NM route, the chain's fixes flown twice); (2) that record, which has no
  `missed` mark, went on after the final approach to a climb to 7,000 ft (the Map's fix 7606aec4b stops a final without a
  `missed` point at the point nearest the threshold); (3) `verticalPath` applied each constraint at its own point: a ceiling
  4 NM after the cruise dropped the path 24,000 ft in 4 NM, and an `at` later lifted it back. Fuel's part: the list offered every
  record of an approach that the eAIP gives by entry (one record per initial fix) as an approach and as the transition of every
  other; now such an approach lists its final record once (the one no other record leads to), its transitions are the records
  whose last fix is the first fix of the final, and a transition equal to the approach is shown as not chosen and ignored by the
  path (`dedupProcs`), so a stored choice like the user's heals itself. `verticalPath` is rewritten on a gradient-limited
  envelope: nodes at the base's breaks and the points' `nm`, plus where each ceiling's gradient meets the cruise; ceilings in the
  descent hold from the model's descent gradient taken back from them, ceilings in the climb are flat up to them; the slope never
  exceeds the model's climb or descent; once the descent has started (first node past the top of climb that a ceiling pulls under
  the base) the path never rises. A floor that the gradient or the monotony cannot hold is not held (no vertical jump wins).
  Cases F23, F24.
- **28 Oct 2026 — no runway could be chosen at LFPO (nor LFBO): fuel offers the runways its procedures name** (user's report).
  Measured in a page with the user's files (`proc/manual/LFPO.json`, `LFBO.json`, read only): `aerodb.runways('LFPO')` and
  `aerodb.runways('LFBO')` both answer `[]`. The files carry no `runways`, and the `RWnn` points that aerodb would deduce the
  runways from are there (one per runway) but without position
  (`lat: null`: « coordonnées introuvables… à résoudre à la lecture par aerodb »), and `runways()` skips a point without `lat`.
  Fuel now offers, in this order: aerodb's runways; the union of the `runways` of the aerodrome's procedures (« 20 »,
  « 14L »…); the two ends of the axis in the base (`aerodromes({ icao }).bearing`, true, and `magVar`, east positive, giving the
  magnetic numbers), numbers without side. Fuel reads only. A runway chosen this way has
  no threshold for `CF.loadProcedures` (it looks the runway up in `aerodb.runways`): the path shows no `RWnn` point until aerodb
  gives one. Reported to AeroDB: `runways()` should answer the ids of `RWnn` points without position (`approx: true`, no
  `lat`/`lon`), or the union of the procedures' `runways`.
- **28 Oct 2026 — the runway, the STAR and the approach filter one another** (user's report, same session as the previous
  entry): `procChosen` now decides in both directions. A runway chosen removes the SID / STAR / approach (and its transition)
  that does not serve it — « serves » = the record names that runway, names none, or names `ALL` / `RWALL`; a bare number
  (« 14 ») matches « 14L » / « 14R » — to « not chosen » (absent, never `null`), with one `ctx.notify` line (×4: « Retiré du
  choix (ne dessert pas la piste 31L) : STAR MEN1A, approche I13R. »). The records come from the new `S.procRecs`, which holds
  ALL the records of both aerodromes (before, only the filtered lists: a record already out of the list could not be judged).
  Decision taken: a SID, STAR or approach chosen while no runway is, and serving ONE runway only, sets that runway (the select
  shows it; the other lists follow; a choice that the new runway does not serve is removed as above). A record serving several
  runways (parallel ones) sets nothing. The transition of a STAR / SID / approach follows its procedure as before (another
  procedure drops it, silently: it is not an incompatibility).
- **28 Oct 2026 — the procedure rows show every procedure of the aerodrome, grouped by runway** (the user's report: LFBO, 18
  approaches installed in `proc/manual/`, and the Departure row said « aucune procédure publiée » with the reading button):
  the cause was in `sideModel`, which asked aerodb for the kinds of the side only (SID for the departure) and called an
  aerodrome « without data » when that kind was empty, although it had approaches (no SID, no STAR, no `runways` in the file).
  Now one question per aerodrome, `aerodb.procedures(icao)` (all kinds), sorted by kind and filtered by the runway in fuel;
  « without data » means no procedure of any kind and no runway. Without a runway chosen a list shows ALL its procedures
  (the approach list does not wait for a STAR) in one `<optgroup>` per runway ("Piste 14L"; a procedure serving all runways
  — none named, or `ALL` / `RWALL` — comes first, ungrouped); a runway chosen gives a flat list of the procedures that serve it.
  The memo of aerodb's answers no longer keeps an empty answer, and is dropped when aerodb says `change` with `procedures`
  (`fetchProcedures` installed files), `changed` or `refreshed` (`onProcChange`): the lists are read again without another
  gesture. aerodb does not watch `proc/` (a file synchronised after the first question is not announced): reported to AeroDB.
- **28 Oct 2026 — reading on demand dispatched by State** (aerodb 82eeef3b5; Simplification, the user's report: « Lire les
  procédures de LFPO » answered « mise en page inconnue »): aerodb now reads France from the SIA eAIP and the States with coding
  tables from EAD Basic, and refuses every other State with `no-tables`. Fuel: the reason `unknown-layout` and its text are
  removed; `no-tables` gets its text ×4, with the Little Navmap hint when `lnm` is true; the button shows the source announced
  by `onProgress` (`source: 'eaip' | 'ead'`) instead of the aerodrome alone; `no-credentials` keeps its EAD wording (France
  needs no account). Case F14 checks the texts statically (the test page has no launcher: the live answer is `no-launcher`).
- **28 Oct 2026 — runway, SID, STAR and approach in the preparation (§ 10.20)** (the user's decision relayed by the ergonomics
  session; lot `v3-fuel-proc`, with `frame/lib/current_flight.js` of the Map's owner and aerodb's `procedures` / `runways`):
  - `route.procedures` is v2 (`{ dep: { rwy, sid, trans }, arr: { rwy, star, trans, app, appTrans }, by, at }`, identifiers,
    `null` = none, absent = not chosen); fuel is the only writer and reads it through `proceduresOf`. Nothing is written at
    mount: fuel's next ordinary write (`saveFlight`) puts v2 and drops a side whose aerodrome changed.
  - Rows in the step Flight (departure: runway · SID · transition; arrival: runway · STAR · transition · approach · approach
    transition), selects filled by aerodb and filtered by the runway; the X-Plane local record last, the outdated one marked;
    "aucune" for SID, STAR and approach (transitions only have "—"). No data: one reading button per aerodrome, refusal shown.
  - "Load my OFP" **replaces** the pilot's choice by the OFP's SID and STAR (a side the OFP has no procedure for is kept) and
    says what changed, one line per side. The whole side is replaced (the approach and transitions of the previous choice go).
  - **The quote runs on the flown path** when procedures are chosen and read: distance = the last `nm`; `quote.legs` one per
    flown point with its `origin`; `quote.distanceNm` (new) = the length the quote ran on; `profile.path` = the planned
    vertical path with the constraints applied where tighter. **The constraints do not go through the level-step machinery**
    (`levels.js` / `alt_ft` steps model cruise levels reached by a climb or descent of the aircraft; a STAR's restrictions are
    inside the descent, so feeding them as steps would invent level flights at 3 000 ft): fuel and time count the procedures'
    distance, the constraints are drawn in `profile.path` only. To revisit if the Map's profile needs them in the figures.
  - **After the start**: arrival row always editable, departure row until the end of the SID (last `'sid'` point of the path,
    position = `progress.actual` if younger than two minutes, else `plannedPositionAt`); a change rewrites
    `route.procedures`, `quote.legs`, `profile.path`, the progress length and `quote.legsAt` only. To keep the figures still,
    the quote's distance is held (`quoteNm`: seeded from the stored `quote.distanceNm` at mount, kept while the route's points
    and distance do not change) — so a change of level or wind after the start still redoes the figures, as before. Nothing is
    made newly editable after the start. **What is editable after the start today and was left as it is**: every field of the
    Plan (aerodromes — another departure ends the flight, another arrival marks a diversion —, level, date, aircraft, route
    text and points, Auto, wind, ISA, settings); only the quote settings and the stored figures follow. The spec's `quote.at`
    does not exist in the code (no `at` in `quote`), so there is nothing to keep still there.
  - `#fuel?focus=arr` (the Map's "Change"): step Flight before the start, step Departure after, first select focused (same
    mechanism as `focus=route`).
- **28 Oct 2026 — airframe and propulsion replace engineType** (the user's decision; lot `v3-fuel-sheets`, with aerodb's
  `sheets.js`, see its DECISIONS of the same day):
  - The sheet's `engineType` (jet | turboprop | piston | auto) is replaced by `airframe` (aeroplane, helicopter,
    gyroplane, glider, balloon, airship) and `propulsion` (piston, turboprop, turboshaft, jet, electric, none, other). A
    ChatGPT guess of `engineType` had made an EC45 a turboprop; the ICAO base knows better.
  - Both are deduced from the ICAO catalogue (`catalogFacts`), the sheet's own value winning when the user set one. What
    the catalogue gives is never counted empty and never asked of ChatGPT; a ChatGPT reply loses those keys. **Pressurised**
    follows the same rule, but no catalogue carries a boolean `pressurized` today: the hook is there, nothing is deduced.
  - **The RPM fields stay counted and asked** (user's decision). Example given: the Caravelle III has 7,950 rpm max
    continuous, 7,800 climb, 7,750 cruise, 5,000–5,780 transient only, 2,800–3,250 ground idle, 4,600 approach — a sheet
    with a single "nominal" number would lose all of that, so the nominal RPM per phase and the engine map are still
    requested.
  - **Addendum (same day, the user): the critical altitude `engineCriticalAltFt` is counted and asked for a piston
    propulsion only** (the value in force: the sheet's, else the catalogue's); an unknown propulsion still counts it. Jet,
    turboprop, turboshaft, electric, none and other: neither counted nor asked, so the "aircraft" family and the missing
    prompt follow. The prompt's rule 7 says it too (null for any other propulsion).
  - **The sheets list names what is missing by family** instead of a count: "To complete: rpm, speeds, cruise, taxi,
    runway" (rpm, speeds, cruise, rates, fuel flows, taxi, runway, fuel, aircraft, other; the same set of empty paths as
    before, minus the deduced ones). "complete" is unchanged.
  - `performance_model.js` reads `propulsion` first (jet → jet, turboprop and turboshaft → turboprop, piston and electric
    → piston; none and other fall through), then the legacy `engineType` (old sheets not re-read by aerodb), then the base
    and the cruise TAS. The note asking to set the engine type now names "Propulsion".
  - The prompt (`docs/technique/PROMPT_PROFIL_PERFORMANCES.md`): schema keys `airframe` and `propulsion`; rule 7 became a
    selection rule (what carries the aircraft, what drives it, turboprop vs turboshaft, none, other, copy the known
    powerplant). **The V2 planner's copy is frozen**: `tools/build_perf_prompt.py` no longer writes
    `apps/planner/perf_prompt.js` (V2 lives on `v2-maintenance`).
  - Benches: `sheets.html` (new checks, stub catalogue; its V2 reference file now carries `propulsion` and the pounds of
    the `.lnmperf` export — both deliberate V3 differences; the bench had two stale checks since the kg → lb fix), the
    other two use `propulsion`, `quote.html` keeps a legacy `engineType` check. Case F10 runs the sheets bench.
- **28 Oct 2026 — ETA and planned position no longer written** (the recoded Map, 4dd3e232b, derives them; Simplification):
  `updateProgress` writes `{ at, fuelRemainingKg, remainingNm, phase }` for a started flight only; `plannedPos` and `eta`
  are set `undefined` in the next write so that `merge` removes what an earlier version left (JSON drops them), and the
  ETAs of a flight that is only dated are gone with `plannedEtas` — both debts of 28 Oct lifted. Readers use
  `frame/lib/current_flight.js` (`etaOf`, `plannedPositionAt` from `quote.legs` / `taxiMin`); My flights and Report
  show neither, nothing to change there. `FUEL_PROGRESS` keeps `plannedPos` and `eta` so that a cancelled start or a
  saved report still clears an old record. Case F6 now checks that a dated flight has no `progress` and that `etaOf`
  gives its four ETAs (the first at the date plus the taxi time).
- **28 Oct 2026 — fuel reads the frame's weather layer** (frame lot 26, INTEGRATION § 14; Simplification): winds and
  temperatures aloft through `ctx.weather.aloft(samples, when, { cacheOnly, stale })` (same shape as `winds.js` gave),
  METAR / TAF of the corridor through `ctx.weather.metar` / `taf` (TAF only with a flight date, as before), `cacheOnly`
  offline. `winds.js` loses `forecastUrl`, `profiles`, `hourlyVars`; its `modelFor` delegates to the layer's (Atmosphere
  still imports it from here). `cache/fuel/weather.json` and `aloft.json` are no longer written and removed once; fuel no
  longer imports `frame/lib/metar.js`. **Measured** (built-in browser, network on, fresh origin, the suite's seeded
  flight LFRS LUGEN NEPIX LFML, C-130J FL270, real weather): before, wind 317°/25 kt, ISA +1, block 4,148 kg, trip
  3,112 kg, 84 min, the layer's count absent (fuel was not counted); after, 317°/24 kt, ISA +1, 4,153 kg, 3,117 kg,
  85 min, "Weather: 38 calls today" (one Open-Meteo request of 9 cells × 42 variables = 37.8); a reload asks nothing
  (the layer's reserve), same figures. The 1 kt / 5 kg difference is the layer's: it reads Open-Meteo at the centre of
  its 0.1° cell (47.150 for LFRS's 47.157), not at the exact point; the run shown moved from 06:00Z to 03:00Z because
  the layer reads the AROME HD metadata where fuel read ARPEGE's (reported to the frame). Bench `test/winds.html` 35/35.
- **28 Oct 2026 — `quote.taxiMin`** (Simplification, with `quote.legs`): the taxi minutes the quote counts are written
  beside `legs` (which starts at brake release), so the frame's ETA helpers need not guess them (their fallback: 10
  min). Checked on 8804: `taxiMin: 10` with the legs.
- **28 Oct 2026 — the `h1` follows `ctx.titled`** (frame lot 25, INTEGRATION § 6): while the phone's header carries
  the module's title (`ctx.titled`), the module's `h1` gets `f-sr` (screen readers only), toggled again on every
  `frame-titled` event; the listener goes at unmount. Checked on 8804 at 375 px.
- **28 Oct 2026 — `quote.legs` for the recoded Map** (its lot 0, through Simplification): every quote writes
  `quote.legs = [{ id, min }]`, the minutes from brake release to each route point (taxi apart), from the quote's own
  timetable (`progressPlan` → `PG.etas(P, 0)` minus `taxiMin`, to a tenth). `shareProfile` already rewrites `quote`
  when it changes, so `legs` follows every quote change. INTEGRATION § 3: `legs`, maps as a writer of `route` and
  `level` (its Edit mode), and the announced debt: ETA and planned position derived by `frame/lib/current_flight.js`
  (`etaOf`, `plannedPositionAt`) at the recoded Map's delivery, fuel then stops writing `progress.eta` / `plannedPos`.
- **28 Oct 2026 — after the relay: one flight date; `progress` is a started flight's** (review of the relay's work,
  Simplification's decisions): (2) the level decision's flat basis for every level with the "Plan" diamond (relay,
  24 Oct) is confirmed: it **replaces** the 23 Oct decision "at the chosen level, curve and quote give the same
  figure" (that basis put the route's steps on one point only and made a spike). (3) fuel no longer writes
  `weather.when`: `planned_at` is the only value ("one source per subject"); a flight written before it gets its
  `planned_at` from `weather.when` and the copy is dropped in memory, so the next write removes it — a stale copy would
  mislead. Still reading it: the current Map (`module.js`, the weather cut's departure time, `f.weather.when`), which
  falls back on now; Atmosphere already reads `planned_at` first. (4) the rule is written in INTEGRATION § 3:
  `progress` is a started flight's, readers test `started.at`, never the presence of `progress` (it closes the
  end-to-end pass's bug 2 on the readers' side). The ETAs fuel writes for a flight only dated stay for now — **debt
  dated 28 Oct 2026**, lifted when the recoded Map (BUGS SOG, `v3-maps-recode`) computes them from `planned_at`; removing
  them before would take the ETAs off the map in production. (8) the field's label says "device's local time" ×4 (the
  picker is the system's; every time shown elsewhere is UTC), the manual too.
- **25 Oct 2026 (relais cloud) — the "Auto" button writes the airways** (lot `v3-route-auto`; the user: "Oui pour auto"; state of
  play: `docs/technique/V3_ROUTES_PROCEDURES_ETAT.md` § 1). **Where the code lives**: the path finding is V2's
  (`shared/mission_routing.js`: `airwayGraph`, `shortest`, `leg`, `expand`) ported to the published base's segments
  (`AeroDB.airways({ bbox })`) in a new library **`modules/maps/lib/routing.js`** (maps' property, created by this lot; maps'
  own files untouched). This supersedes "airway expansion belongs to maps" (22 Oct, route resolution kept small) for the
  *writing* of airways: the typed airway is still not expanded when reading a route; the button is the only place that
  computes a path. **Judgement calls**: (a) the button writes the airways **once**, into `route.text` and `route.points`;
  nothing recomputes them later (a changed level or aircraft does not move the route: pressing Auto again only fills the
  legs that still have no airway); (b) the airway's middle points are kept **in `route.points`** (`awy: true`, `via`: the
  airway) but not in the text (`PT1 UN460 PT2`): the distance, the map's line and the profile follow the airway, the text stays
  readable, and a reload keeps them (`routePoints` takes the chain back from the flight's own points when the text still holds
  the same airway between the same two points; the position of a point reached by an airway is its segment's, since aerodb does
  not know every RNAV end: no "unknown points"); (c) the level is the flight's (`level.ft`), else the quote's, else 6 500 ft
  (V2's `ifrMinFt`), said in a notification; a point's own level (`alt_ft`) is used from that point on; (d) a leg of 40 NM or
  less stays direct and is not an error; a leg that touches an airway already written (its entry or exit) is retried but its
  failure is silent, so a second tap says "nothing to fill in" instead of complaining about the router's own DCT legs; (e) DCT
  is not written (the normalised text has none); (f) no one-way airways, no fine level restriction, no SID / STAR (the base does
  not carry them: a later republication). **Changes from V2**: nodes are one per identifier within 2 NM (V2 rounded
  coordinates to 0.001°, which split a fix in two when its segments rounded differently: 21 fixes of the 1,498 nodes of the
  published France base, some of them on upper airways); a composite designator (`G54-R66`, a segment shared
  by two airways) is read as the airway one was following (`R66 … G54`, not five airways); the search uses a binary heap. **Real
  data** (published France base, cycle 2026-10-01, 3,517 segments): LFRS → LFML at 6 500 ft gives `LFRS DCT BOBRI R66 ABSIE G54
  POI R66 SINPO B25 LESPI A3 MTL A6 MTG DCT LFML`, 426.7 NM (364 NM direct, +17 %); at FL270 and FL350 **no path** (nor
  for LFPG → LFMN or LFBO → LFPO above FL195, while LFRS → LFPG finds `UN741 ANG UL976 TSU` at FL270): the snapshot's upper airways
  are in regional pieces (the direct legs of the free route airspace are not airways), so the button says "no useful airway
  between LFRS and LFML" rather than invent a direct leg. **Layout**: the route field and the button share one
  row (`.fu-rrow`), the button 44 px; no overflow at 360 and 390 px (F4). **Tests**: bench `modules/maps/test/routing.html`
  (41 checks), case F8 (synthetic segments in the published base: `lib.synthetic_airways`, `aero_docs(airways=…)`).
- **24 Oct 2026 (relais cloud) — a mount that lost its address writes nothing; the view is in the address; the J1 "0 ft"**
  (lot `v3-fuel-mount`). **Cause of the race**: `S` is a module global and `mount()` awaited its reads (libraries, seven
  `ctx.data.read`) before touching it, then wrote `S.…` and called `show('plan')` without asking whose `S` it was. The frame
  calls `unmount()` on any address change, even while the mount is still reading: `#fuel` then `#atmosphere` nulled the
  first `S` (the late mount then threw on `S.refsPending`), and `#fuel` then `#fuel?view=sheets` let the first mount, when its
  reads came back after the second's, run `show('plan')` on the second mount's `S` and `S.body` (the Quote screen drawn over a
  Sheets address). **Fix**: the mount's token is its own state object, `const self = S = {…}` taken before the first `await`;
  `if (gone(self)) return` after the reads (`gone = s => S !== s`, already used by `completeMount` and every later
  continuation); `unmount()` sets `S = null`, which invalidates it. No timer, no observer. **The view in the address**:
  `show(view)` calls `viewInAddress`, which writes `?view=sheets` (Fiches) or removes `view` (Devis) with
  `history.replaceState` (no event, no navigation, no new mount; `with`, `from`, `focus` stay; nothing is written once the
  address is no longer `#fuel`), so the frame's popover (`currentRow` reads the address when it opens) marks the right row.
  At mount `?view=sheets` opens the Sheets, anything else the Quote (F1: never the Sheets by default; `focus=route` wins).
  **J1 "Bloc · 0 ft" under load** (not a race of the quote): the module keeps the screen `inert` while the current flight of
  a new device is being read (`flightPending`), and `completeMount` then replaces the waiting flight by the one read
  (the last state read wins; the typed values would otherwise erase a stored flight). A finger cannot type in an inert screen,
  but Playwright's `fill` does (it sets the value and fires `input`): J1 typed the level during that window, the level went
  into the waiting flight, was replaced, and the quote read `levelFt = 0`. Reproduced with a delayed read of `pilot/` (F7). Two
  changes: `onPlanInput` ignores a field edited while `flightPending` (nothing written into the waiting flight; the fields are
  redrawn from the flight read), and the suite's `ready('fuel')` waits for the body to be no longer inert, as a pilot does.
  Tests: F7 (both directions of the race, with a delayed read; the Quote/Sheets switch writes the address and the popover
  marks Fiches; a quote typed after a slow read names FL270, never "0 ft"); A7 no longer waits for fuel's first screen (the
  wait was the workaround of this race). **Not fixed, not fuel's**: the frame does not serialise navigations; two address
  changes within one task (`#atmosphere` then `#fuel?view=sheets`) leave one `section[data-module]` per navigation in
  `#fView` (seen: three `fuel` sections after `#fuel`, `#atmosphere`, `#fuel?view=sheets` without waiting). To tell the frame.

- **23 Oct 2026 — the weather corridor reads aerodb's light index** (aerodb's ae427b934, read again here): the
  corridor asks `aerodromes({ bbox, lite: true })`; the light index (one compact line per ICAO aerodrome: code,
  name, position, elevation, runway axis, declination) holds everything the corridor and the aerodromes' cards use
  (`wxAd`: elevation for the ISA proposal, runway axis for the crosswind). A base published before the index is
  read as before. Nothing to change on fuel's side.
- **23 Oct 2026 — weight, step 2: fuel draws before the references** (frame weight audit, measure 4): the mount
  draws at once with what the device already has — the libraries and `ctx.data.read(path)` without `wait` (the
  kept copy, or null for a file never read) — then `completeMount` (not awaited by the frame) brings aerodb's
  registry, the sheets, and the current flight or the quote settings never read on this device
  (`read(path, { wait: true })`: `get` gave null at once on a new device). Meanwhile: "Loading aircraft and
  sheets…" in the aircraft line and the quote bar (`data-loading`), nothing computed nor written (`refresh` stops
  there; the quote, the progress and the profile wait); if the flight itself was never read, "Loading the
  flight…", the screen `inert` and `saveFlight` refused (an empty flight would erase the stored one); a flight
  written elsewhere during the wait is kept and taken up at the end (`adoptForeignFlight` waits for the registry:
  it quotes). Measured with the frame's kit (CPU ×4, Fast 3G, 375 px, real tree; same base, two passes each):
  first GitHub pass on `#fuel`, without step 2 the screen at 5.62 / 5.53 s all at once (9 API calls, 381 KB
  before the first sync ends); with it the fields at 3.40 / 3.33 s and the full quote at 5.56 / 5.45 s (4 calls,
  116 KB). Traced inside: the frame calls `mount` at 3.44 s, fuel draws 59 ms later; the 2.8 s between the menu
  (0.69 s) and the mount are the frame's, reported to it (target < 1 s). First local opening 7.4 s (the files'
  download), offline 0.20 s. Bench: a new device (cleared profile) with a flight in the repository shows
  "Loading the flight…" then LFRS, and the repository receives no write.
- **23 Oct 2026 — weight, step 1: the mount's reads together** (frame weight audit, measure 1): the mount waited in
  turn for the four libraries, `aerodb.aircraft()`, the sheets then the airline's types, and seven `ctx.data.get`.
  Now the libraries (they only use each other when called), the registry and the seven reads start together
  (`Promise.all`), and the sheets with the airline's types. Measured with the frame's audit kit (copied, my ports:
  fake GitHub 8805 on this repository, Chrome 9338, test profile; CPU ×4, Fast 3G, 375 px, real tree of
  `E:/DEFA/data` read only, 927 files): first GitHub pass on `#fuel`, module drawn at 7.87 s and 5.47 s before,
  5.52 s and 5.52 s after; first local opening 7.35 / 7.36 s before, 7.44 / 7.41 s after; offline 0.18 / 0.23 s.
  No measurable gain: in GitHub mode every read waits for the first pass of the tree (9 API calls, 381 KB, ~5.5 s
  under Fast 3G), not for the other reads; locally the time is the files' download. Kept (no cost, and it removes
  the waits in turn when the reads are slow one by one); step 2 draws before them.
- **23 Oct 2026 — "Show the map" hidden beside the map** (end-to-end pass, Simplification's decision (b), frame
  lot 22): drawn hidden when `ctx.layout.with === 'maps'`, and toggled on the frame's `frame-layout` event (pane
  opened or closed, without remounting fuel). Checked on 8804 at 1280 px: hidden in `#fuel?with=maps`, shown after
  "Close the Map pane", hidden again when the button reopens the pane.
- **23 Oct 2026 — times in UTC** (suite rule, Simplification's decision (c), `frame/lib/time.js` of frame lot 22):
  every time fuel shows is UTC with "Z" (`fmtZ`): the planned times of the route points, the taxi end, the forecast
  aloft ("for 17:00Z (12:00Z run), read on 23/10/2026 16:57Z"), the cached weather; the device's time in brackets
  only at the departure ("Flight started at 16:57Z (18:57)", the cancel question), the planned take-off (first
  point) and the planned arrival (last point, the start note) (`fmtZLocal`). The flight date field stays a
  `datetime-local` (device time), like the browser's picker. Checked on 8804.
- **23 Oct 2026 — no default aircraft; the last chosen is taken again** (end-to-end pass, Simplification's
  decision (a)): an empty flight took the first sheet of the list (King Air 350) before the pilot chose anything.
  `currentSheet` no longer falls back on it: the quote stays empty until a choice. Every choice is kept on the
  device (`cache/fuel/last_aircraft.json`), shown first in the empty search ("last chosen") and taken at mount by
  a flight without aircraft. Checked on 8804: flight set without aircraft by another module → "No aircraft" and
  "No sheet…"; reload → EC45 F-ZBQK back, quote back.
- **23 Oct 2026 — the level decision gives the quote's figures** (end-to-end pass, Simplification's go): the curve
  came from the performance model's own trip (`levels.js` `m.trip`, one mean wind for every level) while the quote
  uses `M.quote` (climb law, cruise legs, the sheet's descent): at FL060 the quote said 534 kg / 2:23, the curve
  546 kg / 2:28 and "least fuel: 2 000 ft (553 kg)" — more than the plan. Now `requoteDecision` re-quotes every
  holdable level with `M.quote`, with the forecast wind at that level when the real weather is on (`aloftMeanAt`,
  Open-Meteo pressure levels). Checked on 8804 (EC45 F-ZBPD, LFRS NTS LMG LFML, ARPEGE): "least fuel: FL220
  (489 kg)", and the quote at FL220 gives 489 kg, 2:02. The EC45's levels up to FL230 come from aerodb's type
  estimate (ceiling 27,926 ft), not from this change.
- **23 Oct 2026 — texts of the start** (end-to-end pass): "For now: nothing changes; planned arrival 09:15 PM."
  (was "… changes. planned arrival …"); the taxi line says until when ("taxiing at departure until 06:52 PM", the
  planned take-off); the progress hint says the real position comes from this computer's simulator, the GPS or the
  network and shows on the map (it said "will come from the map"); the flight state is no longer repeated next to
  "Cancel the start" (the quote bar under the steps already says it).
- **23 Oct 2026 — copying works on a tablet served over http** (frame lot 18: the launcher serves the app to a
  tablet, a non-secure context without `navigator.clipboard`): new `frame/lib/clipboard.js` (owner fuel; report,
  website and the frame may use it): `copyText(text, { box, near })` tries the clipboard, then a hidden field and
  `execCommand('copy')`, then shows the text selected (in `box`, or a read-only field after `near`) and the module
  says "copy it"; `canPaste()`. The ChatGPT request goes through it (shown selected in its box as a last resort).
  Checked on 8804 with `navigator.clipboard` removed: real click → copied by `execCommand`; without a gesture →
  shown selected.
- **23 Oct 2026 — quick flight date** (user's request through Simplification): next to the flight date, a clock
  "+30" (44 px, label in the tooltip and `aria-label`) sets now + 30 min rounded up to 5 min; a press while the
  date is still ahead adds 30 min to it (a past date restarts from now); "Now" empties the date (the observation,
  as the start of the flight does). The aerodromes' weather (TAF when it covers that time) and the winds aloft are
  read again 0.7 s after the last press (several presses, one reading). On a phone the date goes under the level
  (flex wrap) so the field and both buttons fit in 375 px. The Departure step does not show the date (the start
  resets it to now): no button there.
- **23 Oct 2026 — `keepScroll` from the frame** (frame lot 17, `frame/lib/dom.js`): the module's copy is gone, and
  so is `renderPlan`'s own restoring of the field being typed (value, focus, selection by `data-k` / `data-i`):
  the frame's helper does both (frame INTEGRATION § 6: a render never changes the scroll nor what is typed).
  Checked on 8804: two map writes at 600 px, the page stayed at 600.
- **23 Oct 2026 — `progress.actual` belongs to the frame** (Simplification's bug: fuel rewrote the current flight
  every 10 to 35 s without `progress.actual`, erasing the real position). `frame/lib/current_flight.js` `merge`:
  the record is read just before every write, fuel replaces only `FUEL_FIELDS` and, in `progress`, only
  `FUEL_PROGRESS`; `progress: null` clears only those keys. A frame write no longer triggers a fuel write: the
  watch re-reads without redoing the quote when the plan (route, level, aircraft, start) is unchanged, the
  progress is compared on fuel's keys only, and written at most once a minute (the planned position moves at every
  render). Report ends a flight through the same merge. Bench `test/current_flight.html` 11/11; on 8804, four
  frame writes 3 s apart: no fuel write, then fuel's minute write with `actual` intact.
- **23 Oct 2026 — the page no longer jumps to the top** (user's bug): a full `renderPlan()` — the current flight
  written by the map, report or another device while nothing has the focus — replaced the screen, which shrank for
  a moment, and the browser pulled the page up (900 → 517 px on 8804; to the top on a short page). `keepScroll`
  keeps every scrolling container's position and the block's height during the render, puts the positions back
  after it and on the next frame; the focus given back to a field no longer scrolls (`preventScroll`). The
  periodic updates (progress every minute, weather) were already partial (`refresh`) and did not move the page (85 s
  observed). Checked on 8804: two writes by the map at 900 and 500 px, no movement.
- **23 Oct 2026 — no silent fallback, an estimated ceiling said so** (end-to-end pass on the real base, items 5 and 6):
  a changed route fell back silently to the METARs' surface wind while the new forecast aloft loaded (284°/44 → 271°/15
  kt, the block jumping); the previous wind aloft now stays, marked "forecast loading…", and only a failed reading
  hands over to the METARs, said in the result and under the wind fields. The density altitude chart says "Estimated
  ceiling" when the ceiling is not a sheet's (no `ceilingFt`, a type estimate). Checked on 8804 with the real base: route
  changed → 284/44 kept with "forecast loading…", then 285/47 from the new forecast; Open-Meteo answering 503 → METAR
  wind 271/15 with "forecast aloft unavailable"; EC45 "Estimated ceiling 27,805 ft".
- **23 Oct 2026 — lot H rectified by the user**: there is no "End the flight" — writing the report is the normal end of
  a started flight (report sets `started` and `progress` to null on saving), "Cancel the start" the other one; the
  button and `started.endedAt` are removed (report no longer takes the shutdown from fuel). "Start the flight" is the
  launch of the flight plan, and the planning may be days old: it first sets the flight date to now, reads the
  weather, the winds aloft and the ISA again, redoes the quote and says what changed, then writes `started`. The line
  of changes is kept outside the module state (`startNote`), since opening the dual view may remount the module.
  Checked on 8804 with the real base and services (copy of the data's SIA base, references, sheets and fleet in the
  session's scratch folder, served by the launcher with `--data`; the user's data/ untouched): EC45 F-ZBPD, LFRS NTS
  LMG LFML 365 NM, flight date in three days → start: "wind 273°/35 kt → 284°/44 kt · block 684 kg → 644 kg · planned
  arrival 17:03", date back to now; cancel with the frame's confirmation → planning again.
- **23 Oct 2026 — lot H, ending a flight and its planned progress** (two questions of the user: how is a started
  flight stopped, where should it be in theory): "End the flight" and "Cancel the start" on the Departure step; the
  progress is computed from the start time and the quote — the cruise is split by leg with that leg's forecast wind
  (as the map's arrows show it) but scaled to the quote's cruise time, so the arrival ETA and the result's flight time
  agree; taxi comes first because the start time is the engine start. `progress` is written only when something else
  than its `at` changes (once a minute in flight), to keep writes low. Checked on 8793: start → "End the flight" and
  "Cancel the start", "Flight started at 14:24 · for 0 min"; a start 70 min earlier → "123 NM from departure, between
  LUGEN and NEPIX · 251 NM to go · planned fuel remaining 380 kg", NEPIX highlighted, ETAs 13:24 to 15:54; end →
  "Flight ended at 14:24 · block 0 min"; cancel, confirmed in the frame's dialog → `started` and `progress` null.
  Bench 14/14.
- **23 Oct 2026 — the level changed by the decision** (seen by the help session): "Use FL220" kept the wind of
  FL280 — `setLevel` did not re-apply the forecast aloft. It now does, like the level field and a flight changed on the
  map: wind, ISA at the level and their source are redone, then the quote, the sticky result and the Departure step.
  Help and the TAF message name the settings card as it is: "Weather key (TAF, avwx.rest)".
- **23 Oct 2026 — the quote in the current flight**: Report fills "fuel at start" with the block fuel (arbitration 15),
  so fuel writes `current_flight.quote = { block, trip, unit, minutes, levelFt, approx }` with the profile, only when it
  changes.
- **23 Oct 2026 — arbitrations of the end-to-end pass** (ergonomics session): `started` cleared when the departure
  changes, kept and marked `diverted` when the arrival changes after the start — and cleared with `null`, because a
  deleted key came back from the stored record through the write's merge (seen in the check); the wind's source in
  the sticky result and on the Departure step; the ISA deviation at the planned level from the forecast, proposed and
  taken with "Real weather"; one level notation (`formatLevel` in `frame/lib/route_text.js`, FL from 5,000 ft, feet
  below; maps will use it); "Read the aerodromes' weather" busy while reading; "Start the flight" keeps the dual view
  on a wide screen; the Flight step's fields at their useful width (codes 8 em, level, date). Found while checking:
  changing the departure or arrival added the new aerodrome in front of (behind) the old one in the route text —
  repeated changes stacked "LFRS LFBO LFRS…", 2,451 NM; the old aerodrome is now replaced (free text) or its entry
  removed (OFP list). The aircraft picker shows every origin of a merged line (aerodb 94e7feb54: one line per
  registration), `fleet-v2` read as the fleet. Checked on 8793 at 375 and 1280 px: busy button, "wind: ARPEGE forecast
  FL060", "3 500 ft" at FL035, "ISA −2 at FL060 from the ARPEGE forecast", start → `#fuel?with=maps`, diverted noted,
  `started` null after a departure change, route text kept clean over two departure and two arrival changes; route
  text bench 20/20.
- **23 Oct 2026 — an aircraft without its own sheet took the first sheet** (found during the end-to-end pass): a fleet
  aircraft with no sheet (`sheetId` empty, the type estimate in the picker) fell back to the first sheet of the list —
  a turboprop for the H145, so FL240 and 1,636 kg over 374 NM, under "Cruise: sheet's cruise fuel flow". The first
  sheet is now only a default when no aircraft is chosen; otherwise the type estimate (approximate) serves, as the
  picker said. Checked: the H145 gives 616 kg, 2:19, "type estimate (approximate)".
- **23 Oct 2026 — airways survive a points change** (ergonomics decision after maps 6a, 867d71217): rebuilding the
  text from the points alone dropped the airways typed (UN869). The route text code moved to shared pure code,
  `frame/lib/route_text.js` (fuel owns it, maps uses it): `tokenize` is the former reading of fuel's `routePoints`
  (resolution by aerodb stays in fuel), `textFromTokens` the former normalisation, and `textFromPoints` keeps the
  words between two consecutive points that were already neighbours in the previous text and are unchanged (same
  name, same position within 0.5 NM when the caller gives the previous points — maps does after a drag; fuel's list
  only reorders, removes, adds or sets levels, so names suffice). An airway between two points is a property of
  that pair: insert a point inside a direct leg and both airways stay; move a point and the airways touching it drop.
  Bench `test/route_text.html` 14/14; on 8793 the normalisation gave the same text as before, and moving LUGEN down
  the list dropped UN460 only.
- **23 Oct 2026 — answers after unmount** (bug seen by the frame: "Cannot set properties of null (setting 'wx')" in
  `wxFetch`, Fuel then Map quickly): every asynchronous path keeps the mount it started from and stops when `S` has
  changed meanwhile (`gone(s)`) — weather, corridor, Open-Meteo, aircraft search, point lookup, route reading,
  SimBrief, sheets dialogs and imports, aerodb and current-flight re-reads; the pending weather timer is cleared at
  unmount. Nothing is ever written into another mount's state. Reproduced on 8793 with 1.5 s slow answers, Fuel →
  Map three times: the former code threw three times, the new one never.
- **23 Oct 2026 — lot F, winds and temperatures aloft** (user's question through the ergonomics session: wind arrows
  at the planned level, inversions in the density altitude): METARs only give the surface wind, so a forecast by
  pressure level is needed — Open-Meteo, no key, added by the frame (7eb6aa2c0). A flight level is a pressure, so the
  interpolation is in ln(p) between pressure levels, not on geopotential heights. One call for up to 24 places along
  the route; the hour nearest to the flight date is kept (a date change refetches: the full hourly set would weigh
  hundreds of KB in the cache). The METARs' surface wind stays as the fallback of "Real weather". The ISA proposal
  stays the departure METAR's (the user's request, lot D); the real atmosphere at departure is shown beside the ISA
  chart rather than replacing it. Checked on 8793: a real answer (the module read Open-Meteo at mount: Météo-France
  model, 00:00 UTC run, three points at FL080 with wind, temperature and ISA deviation written into
  `route.points[].wind`, "Real weather" taking the mean aloft), then a mocked answer with a ground inversion
  (364 to 1,061 ft, +3 °C) drawn and listed at 375 px; bench 29/29.
- **23 Oct 2026 — typing is never rewritten** (user's bug, "the route text keeps being rewritten"): the rule is that the
  route is normalised only on leaving the field (or Enter), and no render touches a field being typed in. Not
  reproduced on 8793 (ten slow keystrokes, alone and in the dual view with the Map), but two holes were closed: a late
  watch echo of one of fuel's own writes (older `updated_at` than the last write) replaced the flight in memory with an
  older route text while typing — such echoes are now ignored, and when a field is being typed in the watched
  record keeps the field's text; and a full `renderPlan()` (watch while nothing has the focus, unit change, OFP)
  recreated the field from the stored text — it now gives the focused field back its value, focus and selection.
  Enter in the route field leaves it (normalises), Shift+Enter makes a new line. Checked: a stale fuel echo ("OLD
  TEXT", older date) and a newer foreign write ("MAPS TEXT") while typing left the field as typed and the typed text
  was written back by fuel.
- **23 Oct 2026 — lot E, weather without a launcher** (frame lot 12, 8ea83b6c6: metar.vatsim.net and avwx.rest
  direct): aviationweather.gov is tried first (one 503 from the frame when there is no launcher, at no cost), then
  the direct sources. The METAR decoder is shared pure code in `frame/lib/metar.js` (maps or report may read a
  METAR later) and gives exactly aviationweather's form, so `weather.js` and the card did not change; its flight
  category uses the same FAA rules. TAFs are asked one station per call (avwx), so only when a flight date makes them
  useful, at most twelve, and the first 503 (no key) stops the loop. Bench `test/metar.html`, 61/61: ten raw METARs
  of the vatsim kind (gusts, CAVOK, VRB and variable sector, three layers, CB / TCU, vertical visibility, US units
  and fractions, MPS, haze with NSC, trends and remarks ignored), the month rollover, an avwx METAR (CB, inHg / SM)
  and an avwx TAF read by `station()` at 15Z (TEMPO TSRA with CB warned, BECMG VRB). Two of my first expected values
  were wrong (9,000 m is 5.59 SM, VFR; A3001 is 1016.3 hPa), the decoder right. The avwx JSON shape was written from
  its documentation without a live answer to compare: to check with a real key. Checked on 8793 with mocked answers:
  no date → METAR only from vatsim; date, no key → one avwx call then the warning; date with a key → one TAF per
  station, the card on TAF.
- **23 Oct 2026 — lot G, Plan in five steps** (ergonomics session, from the user's own way of preparing a flight):
  the blocks are regrouped by step rather than by data — the level goes with the flight (step 1), wind and ISA with the
  weather (step 3), the climb goal with the level decision (step 4). Narrow module (phone, pane): one step at a time,
  the bar shows numbers only except the current step (five names did not fit in 375 px: "1 Fligh…"); wide module: all
  steps visible, as Report does, by `@container` (900 px) so that a 506 px pane steps through. "Start the flight"
  writes `started` and navigates 350 ms later, after the 300 ms write of the current flight. `TX.steps` already named
  the quote's "Steps" row: the step names are `TX.stepNames`. Checked on 8793: 375 px — bar 44 px high, "3 Weather"
  current with numbers around, summary on step 5, sticky result on every step, `#fuel?from=maps&focus=route` → step 2
  with the route field focused, "Show the map" → `#maps?from=fuel`, "Start the flight" → `started { at, by: 'fuel' }`
  then the Map; 1280 px — full screen (1,023 px) all five steps, no bar; dual view (506 px) one step; "Show the map"
  from full screen → `#fuel?with=maps`, pane opened.
- **23 Oct 2026 — a flight changed elsewhere** (contract with maps for its lot 6, through the ergonomics session):
  when the current flight's `by` is not `fuel`, fuel adopts it — keeps `points` and `text` as written (normalising
  maps' text would overwrite what it just wrote), derives distance and track from the points, redoes the quote and
  writes `profile` with `by: 'fuel'`, on the plan or the sheets screen, live (watch) or at the next mount. Checked on
  8793 through the data layer (an adapter declaring `pilot/` as maps does): live, a 5-point route with FL140 at PT2
  gave 301 NM, "FL100 → FL140", TOD 38.9 NM in `profile`, maps' OFP text untouched; with fuel unmounted (on #report),
  a 3-point route was adopted on returning to #fuel (297 NM, profile rewritten).
- **23 Oct 2026 — the route text first** (users' feedback arbitrated by the ergonomics session: the route string is
  what pilots work with all the time): the text field is always visible and normalised on leaving it; the points list
  becomes secondary (folded, "Points (n)"); distance and track are read with their source, typed only when nothing
  resolves. Normalising keeps airways and unknown words in place rather than deleting what the pilot typed (airways
  carry information, an unknown point is shown, not dropped); positions live in `points`, and a name aerodb does not
  know is found there again on reading — otherwise a point placed by coordinates (or one from an OFP) would be lost
  once the text no longer carries coordinates. A known name is tried before the airway pattern (a fix called PT1 would
  otherwise be read as an airway). Checked at 375 px on 8793 (aerodb's `coords` mocked): `lfbo n0450f350 dct tou
  un460 LUGEN/n0450f280 xyzzz nts lfrn` → `LFBO TOU UN460 LUGEN/F280 XYZZZ NTS LFRN`, XYZZZ named under the field,
  301 NM "from the route"; an unresolved route showed "Type them by hand", 120 NM typed → "typed by hand"; an OFP list
  with PT1 / PT2 → `LFBO PT1 PT2/F140 LFRN`, read back with no unknown point; `LFBO 4530N00030E 4630N00048W LFRN` → 4
  points.
- **23 Oct 2026 — weather along the route's corridor** (user's correction through the ergonomics session): no more
  "intermediate aerodrome" field — the first feedback found it too big, the correction removed it. The aerodromes come
  from the route: aerodb's aerodromes by leg box widened by a radius (quote settings, 10 NM), filtered by their
  distance to the route, sorted along it; those without a report are dropped from the card and the wind. The real
  wind averages, leg by leg, every aerodrome that has one (two at least), no longer requiring all of them. Calls go by
  40 stations. An empty corridor is not kept (aerodb may not have loaded the area yet). Checked at 375 px on 8793 with
  aerodb's aerodromes and the METAR mocked: route LFLS → LUGEN → LFMN, 10 NM: LFNC, LFNA, LFNS kept and folded, LFMX
  (no METAR) dropped, LFLE (off the corridor) out; wind from the five; a 3 NM radius redid the corridor.
- **23 Oct 2026 — lot C, editable route points and steps** (asked through the ergonomics session): the points become a
  list (up, down, remove, add); the level is one optional field per intermediate point, read as "from this point on"
  (as an OFP or an item 15 writes it, and as maps' missions use `route_points.alt_ft`); first and last points never
  carry one, so the plan's level stays the single start and the decision chart keeps its meaning. Levels read from a
  text are kept only where they change: an OFP repeats its level at every entry, which would otherwise pin the cruise
  at the first waypoint once the plan's level is changed. Editing rewrites `route.text` (OFP form) instead of keeping
  an item 15 next to diverging points — airways typed in an item 15 are lost then, the points are what the quote and
  the map use. `quote` takes `steps` and splits the cruise into legs; without steps every value is the former one (the
  bench's three V2 cases unchanged, 8 step checks added: 58/58). The current flight is written 300 ms after the last
  change (800 before). Checked at 375 px on 8793 (aerodb's `coords` mocked, the sandbox resolves no aerodrome): a
  4-point route with FL120 from LUGEN gave "FL100 → FL120", TOD from FL120, `alt_ft` in `current_flight.json`;
  item 15 `LFLS N0120F080 DCT LUGEN/N0120F120 DCT LFMN` gave FL120 on LUGEN only; add by name and by coordinates, an
  unknown name warned; the rows stay on one line (the level field kept short against the frame's card input width).
- **23 Oct 2026 — lot D, ISA deviation and density altitude** (user's request, for helicopters): the deviation is
  proposed from the departure METAR (temperature − (15 − 1.98 × elevation kft)), not applied by itself — the pilot may
  plan for another hour; it is kept in `fuel.json` as the next flight's start. The density altitude chart first drew
  density altitude against pressure altitude: the lines for each deviation were nearly on top of one another at
  375 px, so it became the classic chart (deviation across, one line per pressure altitude), where the flight's
  deviation and the ceiling cross at a readable point. The departure point uses the METAR's own deviation at its
  pressure altitude, not the flight's. Checked at 375 px on 8793 with a mocked METAR (LFLS 30 °C, Q1008, aerodb
  elevation 1,302 ft): ISA +18 proposed, "Use" wrote the field and the settings; departure 1,444 ft pressure, 3,484 ft
  density; a 25,000 ft ceiling reached at 23,000 ft pressure altitude; the 3 designs day and night, no horizontal
  scroll.
- **23 Oct 2026 — lot B, aircraft through aerodb** (user's decision: every aircraft datum in aerodb, one API): fuel
  keeps the screen only. The picker is aerodb's `search` (the prototype kept in a stash matched its result order and
  origins, then was dropped); the Aircraft block is one line with a search button. Sheets are read with
  `sheets.list()` and written with `sheets.put(sheet, { source })` / `remove` — the review's origin becomes the source
  (eurocontrol, chatgpt, lnmperf, ofp, import, edit); aerodb stamps `updated_at` and `updatedAt` (the gap noted in
  lot 4a is closed there) and writes the V2 mirror. `modules/fuel/sheets.js` removed (aerodb's `sheets.js` is the same
  code plus registration and callsign fields); `modules/fuel/perf_prompt.js` stays (ChatGPT texts, read by aerodb's
  logic as `window.PERF_PROMPT`). The sheets bench now loads `frame/aerodb/sheets.js`: it found that aerodb's two new
  fields made `.lnmperf` export refuse sheets without them (reported to the aerodb session, fixed there in 264a73727;
  the bench is 18/18). Checked at 375 px on 8793: empty search → sheets then fleet; "hand" → F-HAND (type estimate) and the free
  code; the choice wrote `{ sheetId, type, registration, callsign, name, source: 'fleet' }`; an edited cruise TAS went
  through the review into `aircraft/sheets/TEST_TP.json` stamped `edit`, and into the V2 mirror.
- **23 Oct 2026 — aerodrome weather** (user's request through the ergonomics session, lot A; TEMSI left for the
  roadmap): METAR / TAF of aviationweather.gov through `ctx.net` (the service sends no CORS header: a direct call from a
  page fails, the launcher relays it; checked with curl that the JSON gives `fltCat`, clouds with bases and types,
  `fcsts` with `fcstChange`). The runway is the main runway's end closest to the wind, from aerodb's aerodrome
  `bearing` and `magVar` (no runway list in the SIA base): said under the components, since the runway in use is not
  known without ATIS. "Real weather" averages wind vectors weighted by leg length, a stand-in assumed and shown.
  `weather.js` pure; the weather card is open by default and its folded state kept. Checked on 8793 with answers copied
  from a real reading behind a simulated relay: TAF chosen for a flight date 3 h ahead with its TEMPO (IFR), METAR for
  the other aerodrome, CB warnings, wind 244° / 5 kt from LFBO (TAF) and LFML (METAR); the network refused → last values
  with their time; components on LFBO 32 checked by hand (260° / 10 kt → 5 kt head, 9 kt from the left); 375 px and the
  three designs, day and night.
- **23 Oct 2026 — design lot 2 primitives** (asked by the design session): result bar, tabs, grids, columns, tables, figures, warnings, sheet list and "Open in" links moved to `f-bar` (block layout, no own shadow), `f-tabs`, `f-grid` (`--f-min: 96px`), `f-cols`, `f-scroll` / `f-table` / `f-num`, `f-tiles` (h3-sized figures in the sticky result), `f-warn`, `f-list` / `f-item`; the drawings' colours from `--sog-chart-1…5`, `--sog-chart-grid` and `--sog-fg` (they follow the design without a redraw); "Open in" lost its own "▾" (the frame's summary has a chevron). The module's own `<style>`
  only places things now; checked at 375 px and on a screen in standard, cabinet and field, day and night (no white
  at night, square corners in cabinet and field, no target under 44 px).
- **Scope kept from V2 Fuel**: one aircraft (picker with search), one route (field, point list, coordinate helper), the
  SimBrief OFP read whole (`shared/simbrief_ofp.js` as is), level and wind, the quote, the climb instructions, the
  level decision chart (two scales), "Open in" (`shared/external_links.js` as is); performance sheets as a sub-module.
- **Moved out**: vertical profile and route map → maps; landing CSV import → landing; sheet merge, diff and folder
  writes (FileAccess) → the frame's data layer; `.lnmperf` export, RPM table and engine map editor → sheets
  sub-module, desktop only.
- **V2 `flight_planner.js` sorted** (6,939 lines, 235 top-level functions, by script): ~107 pure functions (~2,000
  lines) to take as they are; ~48 tied to the page state (~1,450 lines) to rewrite as functions of their inputs; ~72
  page functions (~3,360 lines) dropped. `calculate` mixed the page and the quote: the quote is taken out as
  `FuelModel.quote` (inputs → quote), with `cruiseSource` and `modelProfile` (`modelSheet`) whose page reads became
  parameters.
- **`shared/flight_performance_model.js` copied unchanged** to `modules/fuel/performance_model.js` (V2 stays
  untouched). Its notes still read the page language through `RepositoryNav`; texts move to `ctx.t` when the module
  screen exists (lot 2b).
- **`shared/fuel_reference.js` dropped**: `aerodb.aircraft().estimate(codes)` has the same rules and the same answer
  shape (`kgPerHour`, `tasKt`, `basis`, `cls`, `wtc`, `src`).
- **Bench on a known case**: a fictitious complete turboprop sheet (no ICAO or EUROCONTROL data in the repository),
  three flights (known wind; unknown wind, ±25 kt; speed only, ±40 kt) run through the V2 page `calculate` with
  EUROCONTROL, Poll-Schumann, the chosen climb and the pin neutralised; `modules/fuel/test/quote.html` finds every
  displayed value again (block or range, taxi, trip, climb, cruise, descent, contingency, reserve, TOD, time): 30/30.
- **Decisions of the ergonomics session (22 Oct)**: sheets are module data, read and written by fuel at the V2 path
  `planner/flight_performance_database_merged.fpdb.json`, merged sheet by sheet (newest wins), aerodb only completes
  them; the current flight shared with maps is a record `pilot/<tri>/current_flight.json` whose schema fuel writes
  (INTEGRATION § 3); the last OFP goes to a frame cache document (never synchronised), not to a store of the module;
  SimBrief is called through the frame, the identifier comes from the identity, never typed in fuel; phone screen:
  aircraft, route, level and wind, level decision, sticky result visible, the rest folded.
- **Sheet dates**: V2 sheets carry `updatedAt` (camelCase) and other dates (import, SimBrief snapshot, calibration;
  V2 `profileWhen` takes the latest), while the frame's merge decides on `updated_at`. On every write the module sets
  both to the latest of those dates, so V2 pages and the frame agree; to confirm with the frame agent that
  `keyed:profiles:id` compares `updated_at` per sheet.
- **Lot 3a, the level decision in pure code** (`modules/fuel/levels.js`): from V2 `shared/flight_perf_view.js`, the
  calculations are taken out of the view (2,235 lines of drawing, panels and sliders): `extendSeries`, `rpmRows`,
  `rpmForFF`, `ffForRpm`, `ensureManual` (`manualSettings`), `manualLaw`, `goalLaw`, `goalNow`, `tripLaw`,
  `climbGuide`, `decisionSeries`, `buildCache` (`levelCurves`), `minDistance`. What they read in the view's state
  (`S.manual`, the active profile, the goal remembered in `localStorage`, `modelProfile` of the page) became
  parameters. The SVG drawing stays to be rewritten with the module screen (lot 2b + 3, on the frame).
- **Bench of the level decision** (`modules/fuel/test/levels.html`): the V2 view's state read after a calculation with
  the quote bench's sheet (300 NM, FL200, 30 kt tailwind, goal "sheet's climb IAS"): model ceiling and minimum-drag
  speed, manual settings, decision series (step, bounds, least fuel FL250, fastest FL140, five levels), curves
  (highest level, optimums, plan, cruises), climb to FL200 row by row; every value found again to 0.001: 24/24.
- **23 Oct 2026 — "Open in ▾"** (asked by the user in V2, kept by the Pilot application): the pure part of V2's
  `shared/external_links.js` (route entries, SimBrief and SkyVector points, normalised flight, menu entries) copied into
  `frame/lib/external_links.js` (owner fuel; maps and report may use it), translation passed in. No request is needed:
  every entry is a plain link opened in a new tab; the V2 popup menu became a folded block under the result (one tap,
  phone-sized rows, the reason of a greyed entry under it). `meta.files` now lists fuel's calculation files and the
  shared one, kept offline from the first visit.
- **23 Oct 2026 — vertical profile for maps** (asked by maps, through the ergonomics session): the current flight
  carries `profile { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` from the quote's climb and descent
  (rate = level ÷ minutes, ground speed = distance ÷ time), written only when it changes (redraws and resizes do not
  write). `todNm` is the quote's descent distance, consistent with the descent rate and speed; the result's "top of
  descent" keeps the V2 gradient rule.
- **Small lot after the first screen** (23 Oct 2026, the user trying the module on a phone; no new work before
  feedback):
  - **"2,400" fixed** (`gptNumberText` in `sheets.js`): V2 read a ChatGPT value "2,400" as 2.4. The number is now read
    by its form (thousands commas, European form, otherwise decimal comma). The sheets bench keeps the V2 capture and
    states the one value that differs (2,400), plus nine number cases: 18/18. V2 keeps its behaviour.
  - **RPM table edited on a computer screen only** (the editor is wide; the phone keeps it read only). An empty cell
    of a row that never had the field adds no key, so an untouched row is not shown as replaced; a removed row is
    previewed and can be kept.
  - **Offline from the first visit**: the five calculation files are imported at every first mount, before the first
    drawing; fuel is the Pilot application's first verb, so the first visit mounts it. Requests made before the frame's
    service worker controls the page escape it, so the module fetches the five files once more at `controllerchange`.
    (The service worker does not register in the desktop app's built-in browser, so this was not tried offline here.)
- **Lots 2b, 3b and 4b, the screens on the frame's loader** (`modules/fuel/module.js`, 23 Oct 2026, after
  `6ce25009b`): one ES module with two screens inside (Plan, Sheets) rather than two modules, so the Pilot application
  keeps one verb for fuel; the pure files are loaded with `import()` (they are plain scripts that set `window.*`, which
  works as module scripts) and only once per page. The module's style is a `<style>` inside its own element, every rule
  prefixed by `[data-module="fuel"]`, on the frame's tokens; no global sheet.
- **Writes declared on `pilot/`** (merge `record`) and not on `pilot/<trigram>/…`: a declared prefix cannot hold the
  trigram, and the example module already declares `pilot/` with the same rule; the device's own documents (OFP, last
  screen, folded blocks) go under `cache/fuel/` with the cache policy.
- **Route resolution kept small**: "ID lat lon" entries are taken as they are; otherwise each identifier of item 15 is
  asked of aerodb (`coords`), speed-level groups, `DCT`, airways and procedures left out; the distance is the sum of the
  legs, the track the departure-to-arrival initial track (as V2's quote). Distance and track can be typed when nothing
  resolves. Airway expansion belongs to maps.
- **Sheet editor**: the V2 field list (`PROFILE_FIELDS`, labels in French) with labels translated in the module
  (`FIELD_TX`, `PATH_TX`); the RPM table is read only here (it comes from imports, ChatGPT or the OFP calibration). An
  unticked box of a field never filled stays empty (no invented `false`). Sheets are written without their working keys
  (`_rowId`…), so a save does not change every RPM row of every sheet for the record-by-record merge.
- **Checked at 375 px** in `frame/index.html` served on port 8793 (static server, local transport: the test sheets stay
  in the browser's cache, nothing reaches `data/`): fictitious sheet TEST_TP, 300 NM, track 090, FL200, wind 270/30 →
  block 1,416 kg as on the bench and the V2 page, least fuel FL250 and fastest FL140 as in `test/levels.html`; a tap on
  the drawing sets FL150; speed only → a range; CSV pasted → new sheet previewed then written; a field edited →
  one line previewed. No horizontal scroll. Then on a wide screen: the first three blocks side by side.
- **Lot 4a, the sheets in pure code** (`modules/fuel/sheets.js`, 1,758 lines): 66 declarations of V2
  `flight_planner.js` copied verbatim by an extraction script (a small JavaScript lexer: strings, templates and their
  nested expressions, comments, regex literals) — CSV (simple and enriched), RPM tables, JSON, `.lnmperf` read and
  written, SimBrief OFP sheet and calibration, EUROCONTROL proposals, SimBrief type sheet, gaps filled, merge (dates,
  differences, choices, sources), ChatGPT prompts and replies. Only the V2 globals were replaced by the module's
  environment: `AIRCRAFT_PERF`, `AIRCRAFT_DB` and `AircraftCatalog` read through `aerodb.aircraft()` (perf, record,
  related, classify), `state.profiles` and `active` given by the module, texts and language by `ctx`, the prompts by
  `modules/fuel/perf_prompt.js` (now also written by `tools/build_perf_prompt.py`, so both copies stay identical).
- **Out of the module**: sheets of aircraft known only from the Landing dashboard (`_landingOnly`) belong to the
  landing module; their origin text has no estimate here.
- **Bench of the sheets** (`modules/fuel/test/sheets.html`): the same inputs passed to the V2 functions on the V2 page
  (`.lnmperf` written and read back, enriched CSV, a messy ChatGPT reply, two sheets compared, gaps filled, a sheet's
  date, its values flattened, missing fields), results kept in `sheets_v2.json` (random ids, dates and the `.lnmperf`
  creation date left out): 9/9.
- **V2 defect kept, to fix with its own test**: a ChatGPT value "2,400" (thousands separator) is read as 2.4; the copy
  keeps the V2 behaviour so the bench proves the extraction; the fix (a comma followed by exactly three digits is a
  thousands separator) comes as a separate lot.
- **Lot 2 split**: 2a (this commit) = the pure model, its bench and the module documents, independent of the frame;
  2b = the module skeleton on the frame's loader (`mount(el, ctx)` / `unmount`) with the quote screen, once the frame
  pushes its lot 3.

## 22 October 2026 — display units for speed, altitude and distance (decided by the user and the ergonomics session)

- **What**: next to "kg / lb" in the Plan screen's settings fold, three more display units: speed kt / km/h, altitude
  ft / m, distance NM / km / SM (1 kt = 1.852 km/h, 1 ft = 0.3048 m, 1 NM = 1.852 km = 1.150779 SM). Settings
  `displaySpeed`, `displayAlt`, `displayDist` live in `pilot/<trigram>/fuel.json` beside `displayUnit` and are saved by
  `saveSettings()`; defaults kt, ft, NM. Four selects on one grid row (`fu-grid3`, wraps at 390 px, no new CSS).
- **Invariant 3 kept and widened**: the model (`FuelModel`, `FuelLevels`), the current flight, `fuel.json` entries and the
  sheets stay in kt, ft, NM, ft/min and the sheet's fuel unit; conversion is the screen's, both ways. The pure
  arithmetic is `FuelModel.convertSpeed / convertAlt / convertDist` next to `convertFuel` (same behaviour: a value is
  returned unchanged when the units are equal, absent or unknown, or when it is not finite), benched in
  `test/quote.html` (conversions, exact round trips kt → km/h → kt, NM → SM → NM, ft → m → ft, km → SM → km).
  The screen has one set of helpers per quantity (`speedTxt`, `altTxt`, `distTxt`, `vsTxt` and their `Num`, `Field`,
  `Parse`, `Label` counterparts); the helper reads the setting at each call, so a label and its number cannot disagree.
- **Flight levels are kept** (FL120 = hundreds of feet, whatever the altitude unit): the level field, the decision chart's
  axis, legend, buttons and "Above FLxxx" message, the sticky result and the climb drawing's target label. The altitude
  unit applies where an altitude is a value: the climb table's altitude column, the vertical rate (ft/min, m/min), the
  level in metres in brackets next to the FL in the sticky result when the unit is not ft.
- **Rounding**: displayed values are rounded to the whole number (as before for NM, kt and ft/min); a typed value is
  converted to the model unit and rounded to 0.01 of it when the unit differs (otherwise kept as typed, as before), so
  a whole number typed in the displayed unit comes back unchanged: 100 km → 54 NM → 100 km. Proven for every whole
  number 1 to 5,000 km and SM, 1 to 1,500 km/h and 1 to 20,000 m in the bench, and on the screen (390 and 1280 px).
  A typed value is never "corrected" to a nicer NM figure: 56 km/h is stored as 30.24 kt, not 30.
- **Inventory of the Plan screen** (`grep "NM\|kt\b\|ft\b\|km"`, 73 lines): converted or labelled by the helpers —
  the distance field label and value, the wind speed field, the manual IAS and rate fields (label and parse), the top of
  descent in the sticky result, the distance column of the quote details, the climb table's IAS, rate and altitude
  columns (headers carry the unit), the climb drawing's IAS labels, the "rate under 20 ft/min" message. Kept: the
  FL texts above; fuel flow `kg/h` (a fuel unit, entry kept in kg/h as in the sheet); the fuel and time axes of the
  decision chart; the sheet editor and the preview of changes (Sheets screen: the sheet's own stored fields in
  kt, ft, NM, with the field labels of V2); `ft: null` and similar code identifiers. The ceiling is not shown as a value
  anywhere on the Plan screen, so nothing to convert.
- **Judgement calls**: the vertical speed follows the altitude unit (m/min, the unit that goes with metres on a climb
  table; m/s would hide the sub-metre values); the climb table's altitude column stays flight levels while the unit is
  ft (today's display, and flight levels are the rule) and shows metres otherwise; the fuel select's label "Unité
  affichée" became "Carburant" under a "Unités affichées" heading, as four selects need one heading rather than one
  label on the first of them; no helper for typed altitudes (the level is typed as FL, nothing else is).
- **Bug caught on the way**: a field changed and still focused fires its `change` while the unit select redraws the
  screen, which would have read its text in the new unit (100 km read as 100 SM); the unit change first validates the
  active field in the old unit.
- **Help chapter**: no V3 user manual for fuel exists yet (the help block `frame/help/` is not started); the module's
  SPEC § 9 carries the rule.
- **23 Oct 2026 — helicopters on the Sheets screen (user: "j'ai des hélicoptères en base côté V2, mais toujours pas en
  V3").**
  - **Cause**: nothing was lost in V3. The aircraft base (`aircraft_db.js`, 126 types, EC45, AS65… with their aliases) is
    read and classified (EC45: family H, category `helico`; `search('EC45')`, `search('H145')`, `search('BK117')`
    find it). The V2 screen shows, besides the sheets, every type the airline uses that has no sheet
    (`landingOnlyAircraft`: fleet, reference, missions), "perfs à renseigner", grouped by category. No helicopter has a
    sheet in the shared base (`flight_performance_database_merged.fpdb.json`: 19 sheets, none rotary), so in V2 the
    helicopters were those company types; V3's screen listed real sheets only.
  - **Fix**: the same company types (aerodb `fleetTypes()`) shown "to fill in" with "Create the sheet", and the list
    sorted by category as in V2. Bench (aerodb launcher): "Helicopters" with 11 company types (AS32, AS55, AS65, EC35,
    EC45, TIGR, EC25, GAZL, H160, NH90, PUMA), then turboprops, jets, pistons, others; "Create the sheet" on EC45 →
    new sheet "EC-145" (EC45) in the review. 375 px: no error.
  - **In passing**: the route's delayed reading wrote the "unresolved points" line of the Plan screen even when the
    Sheets screen had replaced it (TypeError at load when the device's last screen was Sheets); now written only when
    the line exists and changes.

## 24 October 2026 — opens on the Plan; compact result bar on a phone (the user's feedback on an iPhone)

- **Always open on the Plan.** `show(S.focusRoute || S.ui.view !== 'sheets' ? 'plan' : 'sheets')` reopened the Sheets
  screen when it was the last one used; the user comes to this module to change the plan or the quote, rarely to edit
  an aircraft. Now `show(ctx.query.view === 'sheets' && !focusRoute ? 'sheets' : 'plan')`: the Sheets screen opens by
  its tab or by `#fuel?view=sheets` (documented in INTEGRATION § 3). **Judgement call**: the last view is no longer
  remembered at all (`show` does not write `cache/fuel/ui.json` any more, the stale `view` key of an older file is
  dropped in memory at mount) rather than remembered and ignored: a value nobody reads is a trap. Inside a mount the
  tabs work as before; a remount (dual view, language) goes back to the Plan.
- **Result bar about half as high** (192 px → 104 px at 390 px, measured on a fictitious TEST_TP flight, route
  `LFRD REN/F090 BALNI BAKUL/F110 NTS DIXAD TUPAR/F070 CGC LFBD`, wind ARPEGE FL060): context on one line (nowrap,
  ellipsis, full text in `title`) written by `resultContext(q, range, short)` — short "Bloc · FL060→090→110→070 · vent
  ARPEGE FL060" / full "Carburant bloc · FL060 → FL090 → FL110 → FL070 · vent : prévision ARPEGE FL060", from new `TX`
  rows (`blockS`, `windByS`, `windRangeS`; `windShort(short)` picks the short wind texts); the figure at `--sog-h2`
  under 760 px by a container query on the module (`@container (max-width: 759px)`); three tiles on one row, label
  (`--sog-size-xs`) above value (`--sog-h3`), one line each, "Étape / Trip / Reise / Etapa", "Temps / Time / Zeit /
  Tiempo", "TOD" in the four languages, TOD's value without "avant"/"before" and the full name plus the old phrase in
  the `title`. Bar padding 8 × 12 px, tiles 3 × 8 px. The details table keeps "Délestage", "Début de descente"...
  (`TX.trip`, `TX.tod` stay). Module-scoped CSS on `.fu-result` and `.f-tiles`; the frame's primitives untouched.
- **Judgement calls**: "label and value on one line each" read as the label on one line and the value on another
  (two lines per tile, none wrapping), since label and value side by side do not hold in 110 px with "1 280 kg"; the
  compact layout applies at every width (the dual view pane is itself under 760 px), only the figure's size depends
  on the container; the "flight started … for 1 h 12" line above the context is unchanged (it adds a line only after
  the start); the wind range reads "vent inconnu" in the short form (the full form keeps "vent inconnu : fourchette").
- **Checked** (Chromium 1194, port 8803, fictitious sheet seeded through `FrameData`, 390 × 844 and 1280 × 800 dual
  view with the Map beside): bar 192 → 104 px, ellipsis at 320 px in the context line, four languages, METAR/TAF source,
  typed wind, unknown wind (range), no `pageerror`; first open Plan, after a visit to Sheets and a reload Plan, the
  tab opens Sheets, `#fuel?view=sheets` opens Sheets, `focus=route` unchanged; 44 px tabs and steps. Benches quote 58,
  levels 24, route_text 20, metar 61, winds 29, progress 14, current_flight 11 pass; `sheets.html` shows 2 failures
  (`.lnmperf` written / read back) that do not involve this change (the bench does not load `module.js`).
- **Seen, not mine**: at 390 px in Chromium the Flight step's date row (`.fu-when`, label "Date du vol (facultatif : TAF)",
  field and the two buttons) is 24 px wider than the screen (document scroll width 414, 402 in English), before and
  after this lot; to look at on the iPhone itself, where the date control differs.

## 24 October 2026 — level decision without a spike: one basis for every level (the user's bug on an iPhone)

- **The user's words**: "l'artefact de pic est un bug, qui génère de faux niveaux". Route "FL160→090→110→070", plan level
  FL160: the fuel and time curves spiked at FL160, "fastest FL155" sat right beside the spike and "least fuel FL175"
  above it. Two rows of `docs/technique/BUGS.md` (24/10), closed here.
- **Cause**: `requoteDecision` re-quoted every level as a flat flight at that level with the forecast wind at that level,
  except the plan's own, quoted with the route's steps and the plan's wind (`wind: h === levelFt ? qIn.wind : …`,
  `steps: h === levelFt ? qIn.steps : null`). A stepped route costs more than a flat flight: a spike at exactly that
  level. Measured before the fix (fictitious TEST_TP, 300 NM, ceiling 20,000 ft so the series goes by 500 ft, wind 270/30,
  route steps FL090 / FL110 / FL070): fuel 826 kg at FL155, **856 kg at FL160**, 823 kg at FL165; time 51.9, **54.1**,
  51.9 min. After: 826, **825**, 823 kg; 51.9, **51.9**, 51.9 min.
- **Decisions (relay, holding the ergonomics role)**: (1) one basis for every point of the series, the plan's level
  included (`wind: aloftMeanAt(h) || qIn.wind`, `steps: null`): no point of the curve is computed differently from its
  neighbours. (2) The plan's real quote (the route's steps, the plan's wind) becomes its own marker: a diamond
  (`fu-planpt`) on each curve at the plan's level and a legend line "Plan: FL160, 856 kg, 0:54" in the four languages,
  with a tooltip saying that the curves are a flat flight at each level; the dashed vertical "plan" line stays. Without
  steps the diamond is drawn too (consistency), smaller (radius 4 instead of 6.5). (3) "Least fuel" and "Fastest" stay the
  minima of the flat series, the "Use FLxxx" buttons are unchanged, the result bar keeps the plan's real quote. (4) The
  chart's fuel axis and its unit label use the displayed fuel unit, not `sheet.unit`.
- **How**: pure code first. `requoteDecision` left `module.js` for `FuelLevels.requoteSeries(D, quoteAt, { h, quote })`
  (`levels.js`), which rewrites the series from `quoteAt` and returns `D.plan = { h, fuel, minutes, stepped }`; the
  screen only draws. The axis: new `fuelUnitOf(unit)` (the displayed unit, else the sheet's; `fuelTxt` uses it too), and
  the chart converts the series to that unit with `FuelModel.convertFuel` before choosing its round ticks, so the
  ticks are round in the displayed unit (800 / 850 / 900 kg; 1,800 / 1,900 / 2,000 lb), not in the sheet's. The plan's
  values are included in the axes' ranges, so a stepped plan far above the curve stays on the drawing.
- **Judgement calls**: (a) the plan marker shows the **trip** fuel (`q.trip`, as the curve does), not the block; the block
  stays in the result bar. (b) No "re-scale the steps around each candidate level" (the other option of the bug row): the
  steps of a route are the pilot's own levels, scaling them per candidate level would invent routes; the flat series
  answers "which cruise level is best for this distance", the diamond shows what the actual route costs on top. (c) At the plan's level the curve takes `aloftMeanAt(h) || qIn.wind`, like every other level; with the real weather on
  that is the same forecast as the wind already written in the flight (`applyRealWind`, at the plan's level), so the flat
  point and the plan's marker differ by the steps only.
- **Checked**: benches `levels.html` (36, new: stepped route, series at FL160 = the flat quote and on the line of its
  neighbours within 1 %, FL160 between its neighbours, marker = stepped quote, minima of the flat series, no steps →
  marker on the curve, no quote → no marker, and a control showing that the former basis fails the same criterion) and
  `quote.html` (58) pass. Screen (Chromium 1194, port 8814, 390 x 844 and 1280 x 800, `FrameData` seeding of TEST_TP and
  a flight on "LFRD REN/F090 BALNI BAKUL/F110 NTS DIXAD TUPAR/F070 CGC LFBD" at FL160): no spike, two diamonds and the
  legend line "Plan: FL160, 856 kg, 0:54", axis "kg" with 800 / 850 / 900, then "lb" with 1,800 / 1,900 / 2,000 and
  "Plan: FL160, 1,888 lb, 0:54" when the display unit is lb; no `pageerror`, no horizontal scroll.

## 24 October 2026 — the first tab is called "Quote" (the user, through the relay)

- **What**: the module's first tab, "Préparer / Plan / Planen / Preparar" (`TX.plan`), becomes "Devis / Quote / Berechnung /
  Cálculo", because "Préparer" now also names the frame's bottom tab (two things with one name on the same screen). Also
  changed: the "No OFP on this device" message (it named the tab), the comments naming "écran Préparer", the opening
  sentence of the help in four languages (the screen opens on the "Quote" tab, the sheets on the "Sheets" tab), SPEC § 9,
  INTEGRATION. The screen's concept keeps its name "Plan screen" in the documents (history in this log untouched).
- **Judgement call**: step 4 of the plan is already called "Quote / Devis / Kalkulation / Cálculo" (de "Kalkulation"
  there, "Berechnung" for the tab, as decided); a tab and a step with the same name in fr, en and es is a small
  ambiguity (the tab holds the five steps, step 4 is one of them), reported to the ergonomics session.
- **Checked**: tab labels read on the screen in the four languages (see the report of the lot).

- **24 Oct 2026 — `winds.js samples` across the date line** (lot of the maps session, relay cloud; the only change in fuel). The
  intermediate places were `a.lon + (p.lon − a.lon) × f` on raw longitudes: from UHMA (177.7°) to PAOM (−165.4°) they went
  round the world and the winds aloft were read there. `samples` now unrolls the points (`unwrapLons`, `frame/lib/geo.js`) and
  returns each place wrapped (`wrapLon`, except a longitude already in [-180, 180[, kept as written: no float noise on an
  ordinary route; the points keep the value written in the flight). `meta.files` lists `frame/lib/geo.js`. Bench `test/winds.html`
  gained 7 checks (count, range, short arc, monotonic, ends as requested, reverse direction, ordinary route).

## 24 October 2026 — the flight date belongs to the shared flight (relay cloud; user: "prévoir un slider « date du vol »… utiliser au max les données gratuites")

- **What**: the module's "Flight date" field (`wxdate`, `weather.when`, quick buttons "+30" / "Now") now writes
  `current_flight.planned_at`, ISO 8601 UTC, optional (absent or `null` = now; schema number and merge rule unchanged:
  `planned_at` is in `FUEL_FIELDS`, `frame/lib/current_flight.js`). **One value**: `planned_at` is the truth;
  `weather.when` stays as its copy in the device's local time (the datetime-local field's format, and what Atmosphere reads
  until its session reads `planned_at`), set together by `setPlanned` and brought back in line by `syncPlanned` whenever a flight is
  read (mount, watch, completion): `planned_at` wins, a flight written before it gets its `planned_at` from `weather.when`.
  Reading from another device changes the field, the aerodromes' weather and the winds aloft (`whenChanged`).
- **Label**: "Date du vol / Flight date / Flugdatum / Fecha del vuelo" (the "(optional: TAF)" is gone: the date now also drives
  the winds aloft and the Map); the field's tooltip and the manual say that the quote's weather and the Map are read at this date.
- **Already the case, now documented**: the aerodromes' weather (TAF chosen by `WX.station(…, wxWhen())`) and the winds and
  temperatures aloft (`aloftKey`, `aloftFetch`: the forecast hour nearest to it) read `wxWhen()`, which now reads
  `planned_at`. Found on the way: a date **typed** in the field refreshed the display of the aerodromes only, without reading
  the forecasts again for the new hour (only "+30" / "Now" did); both now go through `whenChanged` (700 ms of calm, then the
  weather, the winds aloft and the quote).
- **Start**: "Start the flight" still redoes everything for now: it sets `planned_at` to `null` (as it emptied `weather.when`).
  A started flight is read from `started.at`.
- **ETA of the Map for a flight that is not started** (SPEC § 12, INTEGRATION § 3): fuel writes `progress = { at, eta }` from
  `planned_at` (the timeline counted from it as a started flight's from `started.at`: `progressPlan` shared by `progressCalc` and
  `plannedEtas`), with `plannedPos`, `fuelRemainingKg`, `remainingNm`, `phase` at `null`; the Map (`withEta`, one condition) draws the
  labels also when the flight is not started, if the last ETA is still in the future. **Judgement calls**: (a) the Map does not
  compute times itself, it draws what fuel wrote (one calculation, same function as the started flight's); (b) a flight without a date
  has no ETA (now is not a date to promise, it would drift), and so has a flight whose arrival is past — no ETA for a flight date
  forgotten in the past, which would show yesterday's times on the map after a report; (c) the date of a finished flight is not
  cleared by fuel (report writes `started`, not `planned_at`): it is the pilot's to clear with "Now", reported.
- **F4 (width, known failure fixed)**: the date row overflowed at 390 px (414 measured: the label as a flex item kept its
  `min-content`, the date input and the two buttons side by side). `min-width:0` on the field, `flex-wrap` on the row (input
  first at `flex:1 1 11em`, the 44 px buttons below when the room is short): no element beyond `innerWidth` at 360 and 390 px in
  the five designs (case F4 passes; it was listed in `tests/v3/cases/known_failures.py`, removed).
- **F5 (step name, known failure fixed)**: step 4 of the plan is renamed "Résultat / Result / Ergebnis / Resultado" (what it
  holds: the result bar, the level decision, the density altitude, "Open in", the details); "Devis" stays the first tab's
  name only. Manual in four languages, SPEC § 9 and the comments updated. Closes the "Judgement call" of the entry above.
- **Atmosphere**: its code is not touched; INTEGRATION § 3 carries the sentence its session reads ("the slider's origin is
  `planned_at` of the current flight").
- **Checked**: see the report of the lot (suite `--changed`, Playwright at 390 and 360 in the five designs, smoke).

- **30 Oct 2026 — R-F4b, the ends of the procedures computed once** (refactoring § 10.33, Simplification's decision (a)–(d)):
  `PR.endsOf(procs, points, { dep, arr })` gives the SID's exit and the arrival's entry to both the route text (`procsToText`,
  `RT.withProcedures` still decides whether to write them) and Auto, which first brings the text up to date; the exit and the
  STAR's entry are then placed points of the text for Auto (`knownPoints` lends them their record's position when the base lacks
  them; the field's own reading, `resolveRoute`, keeps such a word as before), so
  Auto adds only the start of an approach chosen without a STAR (a generated word, as before: the approach is not in a flight
  plan). `CF.routingChain` is removed (BUGS SOG: no other caller). **A wanted fix, not a regression**: with a point of the SID
  already in the text but not its exit, Auto inserted the exit right after the departure and routed backwards (LFBO EXIT MIDPT…)
  while the text joined at the common point — two rules for one fact; the text's wins. Bench `procedures.html` (endsOf).

- **30 Oct 2026 — R-F4c, one writer of the route text** (refactoring § 10.33; BUGS SOG agreed: « one ICAO form for the same route,
  wherever it was written »): `RT.textFromPoints` (the Map's edit, Fuel's `routeEdited`) builds its tokens and writes them through
  `textFromTokens({ dct: true })`; a kept airway stays an airway, two points that follow each other with nothing between them get
  « DCT », as in Fuel's field. Visible on the Map only (Fuel normalised the text right after anyway). The old bench
  `modules/fuel/test/route_text.html`, run by no case, is merged into `frame/lib/test/route_text.html` (F69), on invented points.

- **30 Oct 2026 — R-F5, one completion list** (refactoring § 10.33): `modules/fuel/suggest.js` `createSuggestList(o)` holds the list
  once — drawing under the field, ↑ ↓ Enter Esc, tap, closed on blur, the pick handed back as an `input` event, the last request
  only. The aerodrome fields (`adnames.js`: aerodb.find, aerodromes with a four-character code, the code written in the field) and
  the route field (`routecomplete.js`: procedure names, nearby airways, points, the word written at the cursor) keep their sources
  and their `write`. The DOM is unchanged (`[data-adsug] [data-code]`, `fu-sug-n`; `[data-rtsug] [data-token]`, `fu-rtsug-n`).
  Cases F44–F47, F75.

- **30 Oct 2026 — R-F6, one state for the procedure card's sides** (refactoring § 10.33): in `procedures.js`, `wantFocus` and
  `openSide` become one object `cardState = { open, focus }` (the side unfolded; the side whose first list takes the focus once
  drawn, emptied when given); in `module.js`, `S.focusArr` and `S.focusRoute` become one `S.focus`, what the address asked at mount
  (`'route' | 'dep' | 'arr' | ''`). Same behaviour (F41, F63, F72).

- **30 Oct 2026 — the SPEC as a state, part 3a** (refactoring § 10.33; Simplification: sections in order, each rule cites its case or
  says « no case », dates and readings here). Sections 1 to 12 in order (10, 11, 12 came before 6); the header lists the files as they
  are (`sheets.js` left Fuel for aerodb; `procedures.js`, `adnames.js`, `routecomplete.js`, `suggest.js` and the shared `frame/lib/`
  files were missing); § 5 says Fuel reads the sheets and never writes them (the V2 `planner/` file is aerodb's); § 8 is aerodb's
  `aircraft().lib` as Fuel's quote reads it; § 10 and § 11 keep Fuel's rules and point at the frame's weather layer for its sources,
  models, cells and call count (frame INTEGRATION § 14); § 11's level of a place is the profile's altitude (F29), not the plan's
  level then the steps' as the old text said; the dates, lots and readings left (lot 3, lot 4, lot C, lot F, lot H, « 23 / 24 /
  28 Oct 2026 », « rectified by the user »), their entries being here already. New case F80 runs the pure benches the sections cite.
  **No case** (code, but no check; to write when one of them moves): the corridor of the weather card, the card's order and folding,
  the surface-wind mean of « Real weather », the « forecast loading » state, the aloft table and the atmosphere drawing, the line of
  what changed at the start, the « Planned progress » card, the redraw on a change written elsewhere, invariants 2 and 5 (rules of
  the repository). § 9 follows in part 3b.

- **30 Oct 2026 — the SPEC as a state, part 3b: § 9 by screen and step** (refactoring § 10.33). The old § 9 was one list in the order
  things arrived (lot G, « block 0 » before 1 to 5, dated paragraphs, « second / fourth reading »); it is now 9.1 the five steps, 9.2
  Flight, 9.3 Route, 9.4 the procedure card, 9.5 Weather, 9.6 Result, 9.7 Departure, 9.8 Sheets, each rule with its case. Every F case
  is cited at least once. Where each old paragraph went: the screens and the opening → § 9 and 9.1 (F1, F5, F17); names and completion
  → 9.2 (F44–F48; « the field takes four characters » dropped: the field is a search since 29 Oct, F48); plan in five steps → 9.1;
  flight date and past date → 9.2 (F6, F43); the simulator export → 9.7 (F60, F61; the direct send to X-Plane's `Output/FMS plans`
  stays a debt, see 29 Oct); « block 0 » (the procedure card) → 9.4, split into folded line, secondary line, grid, lists, runways and
  wind, a choice and its conflicts, approaches, reading on demand, Source, Sur la carte, the quote on the procedures path, after the
  start; « Load my OFP replaces the choice » → 9.3, as F19 checks it (fills only the sides not chosen); aircraft → 9.2; route, points,
  OFP → 9.3; completion, groups, fold, text as a view, typed airway, Auto → 9.3 / 9.4; level and wind, density altitude → 9.5 / 9.6;
  level decision, result, Open in, details, units → 9.6; Sheets → 9.8; writes and phone → § 9 and § 4. Dropped as no longer true: « no
  sheet carries `maxCrosswindKt` » (Maintenance edits it), « no SID / STAR » among Auto's limits (it routes from the SID's exit), the
  `compatible(route)` axis (the Map's, frame INTEGRATION). Left to this log: the old names of the tabs, « star et sid sont route », « c'est
  moisi », `depPassed`, the 190 px result bar of before (now about 100 px at 390 px), V2's `mission_routing.js` as the source of Auto's
  limits. **No case** (debts): the ✓ marks of the steps, « Show the map », the aircraft line and its search, the points list's editing,
  « Cancel the start », the ISA proposal, the density altitude chart, the decision drawing, « Open in », the details, the climb
  instructions and the settings fold, Auto's limits.

- **30 Oct 2026 — debts « no case », first: « Cancel the start » is F81** (Simplification's order: a flight state that, broken, leaves a
  flight started with no way back). The question, « No » changes nothing, « Yes » writes `started = null` and `progress = null` (null,
  not removed), « Start the flight » offered again. The code does what the SPEC says: no gap.

- **30 Oct 2026 — debts « no case », second: the surface-wind mean of « Real weather »** (`weather.js` `routeWind`), four checks in
  the METAR bench (F80): the same wind at both ends, each leg weighted by its length, opposite winds cancel, one aerodrome or a
  variable wind gives no mean. **A gap found, not fixed** (Simplification's rule: said here, asked before fixing): a missing direction
  (`wdir: null`) is read as 0° — `Number.isFinite(+null)` is true — so `routeWind` returns a mean (284° / 10 kt for null/5 kt and
  270°/20 kt) where its comment says « null s'il manque un vent », and the screen's filter (`wxStations` … `Number.isFinite(+x.st.wdir)`)
  lets such a station through the same way. The fix would test `w.wdir != null` (and the same in the filter): a mean drawn from fewer
  aerodromes, or none, for a METAR without a wind group.

## Inventaire du 30/10 : à refondre

Read-only inventory (Features SOG, 30 Oct, for the user's challenge « supprimer les faire et défaire, le code mort, les
empilages »), modules/fuel and frame/lib (procedures, wind, routing, route_text, fms, adnames, current_flight, flight_path) from
802e6856f to 40f834eb7 (24 commits). Per zone: history, what is left doubled or dead, the target in one sentence. Nothing changes here.

**1. The Map's return, keys** (`module.js` mount, `procedures.js` propose / applyProposal). d4f683475 one key per trip (`rwy sid
star trans app appTrans`) → fe3d33c5c wait for the full screen → 25b887349 several keys, `apptrans`, `trans` dropped. Left: `admit`
still maps `trans` / `appTrans` keys no longer consumed; four write paths for one side (lists `choose`, quiet `choose` of the
proposal, `applyOfp`, `textToProcs`). Target: one `writeSide(side, values, why)` used by the four, the change line said once there.

**2. Route text and Auto** (`module.js` routePoints / resolveRoute / autoAirways / writeAuto / procsToText / textToProcs;
`route_text.js`; `routing.js`; `flight_path.js` routingChain). Auto 25 Oct → routingChain (SID end inserted, 29 Oct) →
5a374c189 provenance, exit after the SID name, rejections → d34ad04fb typed airway checked, `along` → 79993b1ea text as a view
(withProcedures writes the exit) and Auto turning an exit word into a point → 1bade3bc8 `joiningAirway`. Left: the SID exit enters
three ways (CF.routingChain in Auto, RT.withProcedures in the text, expandedPath's join in the drawing); intermediate airway nodes
two ways (routePoints copies kept `r.points` between two points; `RG.along` for a typed airway) plus Auto's `pend` re-attachment;
two text writers (`textFromPoints` for the Map's edit, no DCT; `textFromTokens({ dct })` in Fuel); routePoints (~200 lines) reads,
detects airways, validates and smooths levels; autoAirways (~250 lines) filters provenance, inserts, routes, rejects and writes.
Target: one pure `routeModel(text, base)` in frame/lib (tokens → pinned points, typed airways by `along`, procedures by name) and
one `routeText(model)`; Auto = routing over the pinned legs of that model; routingChain and the chain copy removed.

**3. Procedures and transitions** (`frame/lib/procedures.js`, fuel `procedures.js`). conflictsOf / orderProcedures (⚠, § 10.23)
→ compatible (filter, § 10.30) → transitionsOf (same name) → appChoices (entries feeding a final) → isAppTransition (SIA segments,
e5a97c23d) → labelOf, transitionLabelOf, summaryOf. Left: two compatibility rules written twice (runway, STAR ↔ approach: marks in
conflictsOf, filters in compatible); three notions of an approach transition in appChoices, and its « no final recognised »
fallback is unreachable since entries that never reach a runway are segments; five name renderers (PR.nameOf, labelOf, summaryOf's
`name`, Fuel's `procLabel` and `nameOfId`); flight_path.js still re-exports conflictsOf / orderProcedures « for the Map », which
imports procedures.js directly: dead. Target: `compatible` the only rule (a mark = not compatible, with its reason),
`approachModel(apps)` → { finals, transitionsOf } with one notion, `labelOf` the only renderer.

**4. Wind** (`wind.js`, fuel `weather.js`, fuel `procedures.js`, maps `procs.js`). bf5599e21 components → 25b887349 label (where it
comes from) → 094e7a891 arrows reversed (where it blows), severity. Left: `weather.js runwayWind` (the weather card's main-runway
components, own maths and texts) beside `components`; the runway's true axis computed twice (Fuel `runwayWind`: record `true`, else
qfu + magVar; the Map's `runwayBearing`). Target: `wind.runwayAxis(rec, magVar)`, the weather card on components / label / severity.

**5. Procedure card** (fuel `procedures.js`, `module.js`). 636a05179 rows before the registry → struct / in-place patch → summary
in the title (b7cf7bc5a) → fold (61948bfb3) → point-list groups (512902c66). Left: focus and fold state in four flags over two
files (`wantFocus`, `openSide`, `S.focusArr`, `S.focusRoute`); the group hues copied from the Map's palette. Target: one side
state { open, focus } in procedures.js; the procedure hues as design tokens shared with the Map.

**6. Names and completion** (`adnames.js` ×2, `routecomplete.js`). 842ac149b names + completion → 26d47f149 search field →
1e36c7570 the rule in frame/lib → 40f834eb7 route completion. Left: two completion lists with the same list / keyboard / tap /
blur code (~120 lines each). Target: one completion component, sources injected.

**7. Export** (`fms.js`). 99d28acd0, d18a739b4: nothing doubled.

**8. Cases and docs.** F28 rewritten three times, F41 and F63 overlap (one key, several keys), F8 and F67 overlap (Auto, then
idempotent Auto); fuel SPEC's procedures paragraph is one line of « since § x » additions; twenty DECISIONS entries on 30 Oct.
Target: the SPEC's procedures and route sections rewritten as the current state; F41 into F63, F8 into F67.

**Order proposed** (after the stabilisation): 4 (small), 3 with its benches (the rules the Map and Fuel share), then 2 on top of
3 (the biggest, cases F8 F28 F67 F68 F70 F74 as the net), 1 inside 2, then 5 and 6, docs and cases last. One commit per zone,
--touched before, the full noreg after.
