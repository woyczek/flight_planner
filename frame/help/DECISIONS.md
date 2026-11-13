# help — decisions log

The help agent's memory: every choice, dated, with its reason. Newest last. Project-wide decisions are in
`docs/technique/V3_SPECIFICATION.md` § 8; the frame's in `frame/DECISIONS.md`.

- **23 Oct 2026 — Role taken** by the settings agent, in addition to settings (ergonomics session's request), in the
  settings worktree (`E:\DEFA-v3-settings`), with this separate decisions log.
- **23 Oct 2026 — Lot 1 (reading)**: [READING.md](READING.md). Proposed, awaiting the ergonomics session's go:
  - one manual per application (Pilot), one chapter per module, four languages, French first; tutorials first, kept;
  - one source per module, `help/<lang>.md`, whose first section "How to use" is also the in-page help; `SPEC.md`
    stays a developer document and is never shown;
  - the frame draws the folded panel from `meta.help`, `ctx.help` for more; a `#help` screen with its own bundle;
  - the phone page: text first, contents folded, tables as lists at 375 px;
  - the state today: no module has user help yet; the chapters are to be written once, by each module's agent.
- **23 Oct 2026 — Lot 1 validated; lot 2** (ergonomics session's go): the help screen, the in-page panel, `ctx.help`,
  the build step and the fuel chapter ([SPEC.md](SPEC.md), [INTEGRATION.md](INTEGRATION.md)):
  - rule: chapters are written in French by the module's agent, translated and reviewed by help; one idea per
    paragraph, subject in bold, order of use;
  - `frame/help/help.js` (classic script) and a copy of V2's renderer in `frame/lib/markdown.js` (V2 frozen; the
    frame's service worker keeps only `frame/` and `modules/`);
  - the panel is drawn by the frame's `route()` before the module's element (after it since 30 Oct 2026, see below), without delaying the mount; a module has
    a panel as soon as its chapter is in the manual (`meta.help: false` hides it) — no change to any module's meta;
  - `#help` is routed apart from the frame's other screens (`renderConflicts(view, all)` takes another second
    argument), with the address's query;
  - one rendering pass for the whole manual: anchors stay unique across chapters (each chapter has a "How to use"
    section); chapters found by the order of their `#` titles, so a chapter has exactly one (checked by the build);
    V2's `<!-- page: … -->` marker only takes `.html` names and is not used;
  - every link inside the help is rewritten to `#help?a=…` (contents, heading permalinks, text anchors): the hash is
    the router's;
  - scrolling waits for a `setTimeout`, not `requestAnimationFrame`, which does not run in a background tab;
  - translations carry the fingerprint of the French file; the build says which ones to translate again;
  - French typography applied to the manual as to the frame's texts;
  - the panel uses only the frame's tokens and a 44 px summary (frame / design session's request, for its common style
    of folded sections in design lot 2).
- **23 Oct 2026 — Fuel chapter**: written in French by the fuel agent (`modules/fuel/help/fr.md`), reviewed (rule
  followed: seven "How to use" paragraphs in the order of use; screen labels exact), translated into English, German
  and Spanish with the module's own labels for each language.
- **23 Oct 2026 — Tests of lot 2** (fake GitHub serving the repository, 375 px and screen, French and English): build
  refused with a language removed, then four manuals written with no "translate again" note; the fuel panel folded
  before the module, its state kept after a reload, absent for a module without chapter (report); the ? button opens
  `#help?m=fuel` at the chapter; contents folded on a phone, "↑ Contents" opens it, contents and permalinks stay on
  the help screen; `ctx.help.open('La route')` opens the panel; English panel "How to use"; narrow no-break spaces in
  French; no horizontal scroll, no JavaScript error.
- **23 Oct 2026 — Lot 3** (ergonomics session's go): the chapters received in French translated and assembled —
  Report, My flights, Website, Map, and Fuel again (the "Open in" paragraph) —, plus a Settings chapter written here:
  - translations of report, flightlog, website and maps made by helper agents under the same rules (structure kept,
    screen labels taken from each module's `[fr, en, de, es]` rows, “…” / „…“ / «…», fingerprint), then reviewed here:
    same number of titles, sections and bold subjects in the four languages; one correction: in the website chapter,
    « Enregistrer mon vol » names a field of the Airline card, whose label is translated on screen ("Record my flight"),
    while « Log des vols » and « Flotte » are the website's own French page names, kept in French;
  - English quotes made consistent (“…”) in the fuel chapter;
  - Settings chapter (`frame/settings/help/`), placed after the modules (`FRAME_CHAPTERS` of the build): its "How to
    use" says plainly what a device with no access and no launcher sees — no aeronautical and no aircraft base — and the
    two ways in (set the access, even without an exchange; or publish from a workstation with the launcher). The
    question came from the user on the GitHub site;
  - the settings screen shows the Access card without an exchange too when no launcher serves the page (it then only
    reads the bases), and "Offline data" says what to do when nothing can provide them; the ? button opens the
    Settings chapter from the settings screen, whose own folded panel sits under its introduction.
- **23 Oct 2026 — Roadmap** (the user's request, through the ergonomics session, which owns the content):
  - `#roadmap` screen from `frame/help/roadmap.json` (sog-roadmap/1): a table on a screen (one row per lane, four state
    columns, short cards), one card per lane on a phone; colours by state from the frame's tokens; the rule "delivered
    must work, the rest is not a bug" shown first;
  - German and Spanish added to the JSON by a helper agent with the app's terms, reviewed here; one term aligned with
    the fuel screen ("devis" → Kraftstoffberechnung / cálculo, not "Kostenvoranschlag" / "presupuesto");
  - the build's check now refuses a roadmap text missing a language or an item with an unknown state (tested on a
    modified copy);
  - entry points: a link at the top of the manual, and Settings › About (new card: help, roadmap, and the folded
    diagnostics moved into it);
  - tested: 11 lanes, 37 cards, screen and 375 px, French and German, entry points, no JavaScript error.
- **23 Oct 2026 — Lot 4: the two tutorials** (ergonomics session's request; [SPEC.md](SPEC.md) § 6):
  - "Prepare a flight" in the order of Fuel's five steps, "Write a report" from the started flight (or the last IVAO
    flight) to "Save and record on the website" and My flights; English first, French translated; German and Spanish
    later — until then the English text is shown, marked "(in English)";
  - read against the chapters: the tutorial says what to do and links to the chapter for how it works; the chapter's
    details (route tidying, wind sources, ISA formula, the website bookmark…) are not repeated;
  - captures: one per step at 375 px, taken by a script (`tutorial/capture.py`, Chrome DevTools protocol, standard
    library, Pillow to reduce to 256 colours: 7 to 60 KB each) so that German and Spanish can be shot the same way;
    test data only — a fictional airline, published bases, trigram TST, no network ID — and the script refuses a data
    folder whose airline is not the fictional one, since it removes the test flight and reports (`pilot/`, `cr/`)
    between languages;
  - entry points: "Start with…" at the top of the manual (drawn by `help.js`, so the "(in English)" mark follows the
    files), and a welcome card above the first module opened (`SogHelp.welcome`, one line in the frame's `route()`);
    the card is removed as soon as a tutorial opens, also the copy left under the help screen (the module stays below
    it);
  - help links written `#help?t=…` / `#help?m=…` are kept as they are by the renderer, other `#anchor` links still
    become `#help?a=…`; a tutorial's heading permalinks stay on the tutorial (`#help?t=<id>&a=…`);
  - tested at 375 px with the launcher on the test data, French, English and German: welcome card, ✕ and its storage,
    tutorial screen and images, next tutorial, "Start with…", no horizontal scroll, no JavaScript error.
- **23 Oct 2026 — Chapters brought up to date** during lot 4 (`--check`): Fuel (the five steps), Map (layers, six modes,
  Edit mode, winds aloft), Report (the started flight first, with its start time and fuel) and My flights (the flight in
  progress) in English, German and Spanish, by helper agents, reviewed here; the report tutorial follows ("Use" also
  fills the engine start time and the departure fuel).
- **23 Oct 2026 — Tutorial "Join the airline"** (en, fr; de and es later): first in the list, as joining comes before
  everything else; seven captures of the assistant at 375 px, taken by `capture.py --only join` against the fake GitHub
  (in-memory repository emptied before each language, a token that is not one), so the run needs no launcher, no real
  account and no real data. The welcome card's link now opens the assistant.
- **23 Oct 2026 — `SogHelp.files(lang)` (added by the V3 frame session, lot 21)**: the help's files for one language,
  relative to `frame/help/`: the manual, and each tutorial in that language, plus English when the language is
  neither French nor English (the tutorials' own fallback). The frame now keeps only those at installation, instead of
  the four manuals and every tutorial in the service worker's shell. `help.js` and `markdown.js` are injected by the
  frame on demand: after a module mounts (its panel), or when `#help` opens.

## 30 October 2026 — the in-page panel below the module's content

Features SOG traced M2 / M3's instability to the panel: drawn above the module once the module had drawn, it pushed the whole
page down, and on a slow phone a pilot's tap just after the opening hit the wrong row (another aircraft edited). Rule
(Simplification): no layout shift after a module's first drawing without a gesture. The panel and the welcome card of the
tutorials now go **after** the module's element (the welcome card first, then the panel): the help follows the content, it
does not precede it; the header's « ? » stays the direct way in. Reserving the room above before the mount was the other
way, not taken (an empty band on every screen while the help loads). noreg A52.

- **31 Oct 2026 — One manual per application** (Simplification, the user's capture: the help opened in Maintenance showed
  « Pilote — manuel » with Pilot's tutorials). `build_help.py` assembles each application of `APPS` from its own modules
  (Pilot: fuel, maps, report, flightlog, website, atmosphere; Maintenance: data, aircraft) plus the Settings chapter, with
  its own introduction (`intro-maintenance.<lang>.md`, four languages). Pilot's manual no longer carries the Data and
  Aircraft chapters, which no Pilot screen shows.
- **10 Nov 2026 — Roadmap screen at `sog-roadmap/2`** (SOG-0062, ergonomics session's brief; SPEC § 5). Reversible details decided
  while the user was away: the **schema 1 keeps its exact screen** (no tab, filter or strip: its items have no `kind`, so a Bugs tab would
  be an empty promise); in schema 2 the application **filter replaces the applications list** (same data, one place; the chip carries the
  application, the state is no longer drawn); the **tab counts follow every other choice** (application, hiding, milestone) so a count never
  disagrees with the cards under it; **a chosen milestone beats « Hide delivered »** (touching « alpha 4 » to see what it delivered must not
  give an empty page; the box stays as it was and applies again when the milestone is released); only the box is remembered (the tab, the
  application and the milestone start fresh); the lane header's « n delivered » counts the delivered items of the current tab; the strip
  is one scrolling line on a phone rather than a collapsed block (nothing to open, nothing hidden). The CSS is in `frame/frame.css` beside
  the existing roadmap block (additive). The manual does not describe the screen (it only links to it), so no help text changed.
- **10 Nov 2026 — Priorities on the roadmap** (SOG-0066, from the user's « how do I reprioritise? »; SPEC § 5). Reversible details decided
  while the user was away: **one verb, two actions** (`roadmap/priorities`, `get` / `set`, like `stats/output`) rather than two verbs; `set`
  **replaces** the whole file (the page sends what it read plus the gesture: no merge on the launcher, one user, one writer); a drop writes
  **every identified card's rank** (1…n) rather than one number, so the order is explicit and survives a regeneration that adds cards; a rank
  is global (the roadmap's single priority list), a drop is allowed only inside the card's own column; a milestone drop leaves the rank alone;
  the **desktop gesture is a right click** and the **touch gesture is the long press** (released without moving = copy, moved = drag), the two
  never competing; a card without an identifier is not draggable; the device keeps the unsent order and sends it **by itself** at the next
  opening with a launcher (the user's own earlier gesture, nothing to confirm). Not done: a keyboard way to reorder, and a sticky strip (the
  page scrolls by itself near the edges instead). `frame/app.js`'s `helpCtx` gained `notify` and `launcher` (additive; V3 Frame told).
  Races closed (found by A101 at 390): the opening's read of `PRIORITES.json` never redraws the screen under a drag in progress (it waits for the
  drop), and a write waits for that first read, so a gesture made within the first second cannot overwrite what the file already held; the sends
  are queued one after the other, and a send clears only what it sent (a gesture made during it stays pending).
- **10 Nov 2026 — Folding lanes** (SOG-0069). A folded lane keeps its cards in the page, only hidden (`display: none` on its columns), so nothing is
  rebuilt by a touch; the default fold looks at the cards the view shows, delivered ones included when they are shown (a milestone view of delivered work
  opens nothing by itself); the hand-made choice beats the default and is kept per lane id, forever (a lane the file no longer has is simply never read).

## 10 November 2026 — the roadmap opens on priorities, three columns (SOG-0160)

- **The user's words**: « toujours pas de tri des cartes (bloquées par les swimlanes) : un mode priorités où les swimlanes s'effacent… et les replanifier dans la prochaine alpha ou la prochaine beta ». The coordinator's challenge, kept: not one more mode, the **default view**: « Priorités » (three columns, flat cards) and « Par thème » (the lanes, read only) as the secondary one.
- **The column is derived, not stored**: from `milestones[].state` (`doing` → integration, the first other `planned` → development, the rest → backlog) and the card's effective milestone; the file gets no new field (the coordinator offered `column`; not needed). Moving a card to a column writes **the milestone of that column** in PRIORITES.json through the existing verb, with the ranks; a column with no milestone in the file (no `planned` one yet) takes no card.
- **Read only « Par thème »**: dragging there would hide the new order behind lanes again; the one place to order is « Priorités ».
- **Phone**: a drag is a poor gesture on a small screen; each card carries Monter, Descendre, Envoyer vers… and the screen shows one column at a time.
- Cases: A114 (new: theme B above theme A, sent to development, held after a reload, « Par thème » read only; at 390 with the buttons, at 1280 by dragging); A101 moved to the backlog column; A96 and A103 open « Par thème ».

## 10 November 2026 — the Recette screen and the verb recette/verdict (SOG-0167)

- **The user's words**: a page of the manual tests to do every day, with his comments and a passed / failed status, because « tant que tous mes bugs ne sont pas corrigés, je risque de remonter plusieurs fois le même bug ». Generated list from the coordinator (`recette.json`, one test per delivered card); the screen and the verb are ours.
- **Schema confirmed with the coordinator before coding**: `organisation/RECETTE.json`, `{ schema: 'sog-recette/1', updated, items: { id: { verdict, comment, at } } }`, what `tools/recette_build.py` already reads (600-sign comments, 1000 entries). **A refusal requires its comment** — in the page (nothing is sent without) and in the verb (a `ko` without comment is a `bad-items` refusal of the whole set): a refusal the ergonomist cannot act on is noise.
- **The launcher's file is the truth once read**: the generated state (`ok`/`ko`) is the first look only; taking a verdict back (« Remettre à tester ») writes a set without the id, which a stale generated file must not resurrect.
- **« Du jour » is relative to the last recette**: the day of the last verdict made *before today*; a verdict made today must not turn today's other tests into « plus anciens ».
- Counter-test (A115 / K123): the verb absent makes K123 fail on the registry; A115 fails at the first « Refusé » without comment if the page sends it.
- **A test delivered again after its verdict is no longer « Refusé »** (10 Nov 2026, SOG-0167; the user: « Je ne vois pas de màj de la page de recette, normal ? » — eleven tests
  refused that morning had been delivered again and the screen kept them « Refusé »; the first design took the launcher's or the device's verdict without asking whether the card
  had been delivered since; V3 Frame, the generator being the ergonomist's `tools/recette_build.py`, 33dabad38). Each test carries `delivered` (UTC, « AAAA-MM-JJThh:mm:ssZ »,
  the last commit the card cites) and, when the generator replaced a verdict, `previous: { verdict, comment?, at }`. **On the screen** (`recette.js`): a verdict — generated,
  the device's, the launcher's — whose `at` is **earlier than `delivered`** (instants, `Date.parse`, never text) is not in force; the test goes back to « à tester », in the day's section,
  **first of its application**, with one line above the buttons, « Relivré depuis votre refus du <date> : « <commentaire> » » (« … depuis votre validation du <date> » for a pass; without a
  comment, « … refus du <date> »), the comment read from the old verdict in force on the launcher's or the device's side, else from `previous`; a verdict **later** than `delivered`
  is in force as usual; the summary counts these tests as to test; the « last recette » day is computed from verdicts in force only. `delivered` (format checked) and `previous`
  (verdict, comment bounded to 600, `at` checked) are untrusted: a `delivered` that is not a date is ignored. A refusal without comment is kept when the generator says it
  (`previous`), unlike the verdicts one can write. Noreg A124 (generated, device and `previous` cases; a later verdict stays; hostile and long entries; the summary; the
  screenshots at 390 and 1280 are written by the case), red on the previous recette.js.

## 10 November 2026 — « Par thème » by default; « Priorités » is a mode (SOG-0160 refused)

The user, on the first delivery: « oui, mais par thème par défaut. c'est un « mode priorités », pas un default. » My reading was wrong: the roadmap opens **« Par thème »** (the lanes); **« Priorités »** (three columns, drag to rank) is a mode the
user chooses, and the device keeps it (`device/roadmap.json` `view`: `'priorities'`; anything else reads as `'themes'`). The manuals of the three applications (×4 languages) say so. Noreg A114 rewritten: opens on the lanes, chooses Priorités, a reload keeps it.

## 11 November 2026 — the Recette screen, tab « À trancher » and the verb recette/decision (SOG-0241)

The user, on the evening review: « comme pour la recette, un qcm + choix libre des points à trancher (dans la page recette ?) ». Yes, in the recette: a second tab **« À trancher (n) »** (n = the questions without an answer), the same loop as the verdicts.
- **The contract** (the ergonomist's generator and questions, my screen and verb): `frame/help/recette.json` gains `decisions: [{ id 'Q-nnnn', fiche 'SOG-nnnn', app, question, context, options [2 to 6], recommended, since, state todo | answered, choice?, text?, at? }]`; every text is untrusted (escaped, bounded: 300 / 500 / 200 signs, six options at most, 200 questions).
- **The screen** (`frame/help/recette.js`): a card per question — the fiche (copiable), its context, the answers as radio buttons (the recommended one says « proposé par l'ergonome »), a free field, « Répondre »; an answered one shows its answer and « Modifier »; the unanswered first. An empty answer is refused, said. Same template and classes as the tests (`f-rc-item`), `f-rc-opt` for one answer per line.
- **The verb** (`tools/regen/recette.py`, `recette/decision`, next to `recette/verdict`, same guards): `get` / `set { items }` of `organisation/DECISIONS_REPONSES.json` (`sog-decisions/1`; `{ 'Q-0001': { choice: 0..9 | null, text, at } }`, one of choice / text at least, 600 signs, no control character, 1000 entries, atomic write, nothing else written; the launcher only, no organisation folder → said, nothing created).
- **Without the launcher** (or when the job fails): the answer stays on the device (`device/recette.json` `dpending`), « non envoyé », sent at the next opening, like the Roadmap's priorities. The file the launcher holds wins over the generated `answered` once read (as for the verdicts).
- Noreg A147 (4 languages, 390 and 1280, `A147_decisions_*_delivered.png`) and K171 (the verb), red before.

## 11 November 2026 — the answers kept on the device are seen and leave by themselves (SOG-0241 fix)

The user answered 14 questions with a launcher started before `recette/decision` existed: the job did not start (400 « unknown operation »), the answers stayed in `device/recette.json › dpending`, and nothing told him.
- **Said on the card and at the head of the tab**: each kept answer shows « Non envoyé : le lanceur de ce poste ne connaît pas encore ce geste, relancez-le » (or « aucun lanceur ne répond sur ce poste », or the plain « non envoyé »); the head of the tab says « n réponse(s) gardée(s) sur cet appareil, pas encore envoyée(s) » with the reason. The mark comes from the kept answers themselves (the keys of `dpending`), no longer from a separate `dunsent` list that could be empty.
- **They leave by themselves**: when the launcher comes back (the `frame-launcher` event, state `up`, while the screen is open) and at each opening of the screen (the get, then the send of what is kept). The user's 14 answers in `dpending` will therefore leave at his next opening after restarting the launcher; he does not click again.
- Noreg A148 (a launcher without the verb: the card and the head say it with the count; the event sends them; an opening sends the kept ones even with `dunsent` empty), red before (`non envoyé` only).

## 11 November 2026 — the answers already written are never lost; the typing survives a redraw (SOG-0241, the ergonomist's two defects)

- **`set` completes, it no longer replaces** (`recette/decision` **and** `recette/verdict`, `tools/regen/recette.py`): the verb merges the entries sent into those the file already holds, by identifier; an entry leaves the file only through `drop` (a list of identifiers, optional, 1000 at most), which the screen sends for an answer or a verdict the user takes back. Cause of the loss: the 14 answers of the morning (09:11) were not on the screen (their questions were closed) and the screen, whose read of the file had failed, sent only its own 7 of noon: the file was replaced. Two guards, one on each side: the launcher merges whatever it receives, and the screen **never writes without having read the file** (a failed read is redone before the send; if it fails again the answer stays on the device, « non envoyé », and leaves at the launcher's return). The screen still sends the whole map (read + its own), so a launcher older than this change, which replaces, loses nothing either.
- **A redraw keeps the typing** (`draw` in `frame/help/recette.js`): the screen redraws itself when the launcher answers; the textarea where the user was typing lost its focus and what followed went nowhere, so a free answer could leave empty (A147 once, at 390 px). `draw` now gives the focus and the cursor position back to the field (`data-dtext`, `data-comment`).
- Noreg A153 (14 answers in the file, a failing read: nothing written, then the read, then the merge; red before: only `Q-0001` left in the file), A154 (typing across a redraw; red before: no focus), K123 and K171 (merge, `drop`, shape of `drop`; red before).

## 12 November 2026 — roadmap, priorities: the whole column lights, the drop goes to the head, « To the top » (SOG-0257)

The user's finding: on 11 November he sent seven cards to the next milestone; they took the ranks 237 to 243 (the END of the column), and bringing them up meant a very long drag.
- **The column is found by the pointer's x, at any height** (`colAt`): the nearest column within 80 px horizontally, as long as the pointer is in the board's zone (± 40 px): a lateral move of 30 px, the gap between two columns, the space beside a short column are enough. **The column lights as a whole** (`data-dropcol`: dashed outline and a tint), the card under the pointer keeps its before / after line (a precise place stays possible). The column « Delivered » is not a target.
- **Dropped on a column (no card under the pointer) the card goes to its HEAD** (`headOf`), no longer to the end; dropped on a card, its exact place.
- **« To the top », « Up », « Down » on every card**: the phone shows the three words (as before, plus « To the top »); the computer shows three small glyphs (⤒ ▲ ▼, the words in the tooltip and the accessible name) over the top right of the card **on hover and by keyboard** (`:hover`, `:focus-within`), never during a drag. They are narrow on purpose: wide buttons over the card hid the grip (A101 and A114 caught it, the drag did not start).
- **The page scrolls while the pointer stays near its edge**, even immobile (a 30 ms timer, faster near the edge), and the target is recomputed under the pointer after each scroll; before it only reacted to a pointer move.
- Noreg A156 (45 cards: « To the top » on the last one; a card dragged 30 px into the next column, far from its cards, lights the column and goes first; dropped on a card, right after it; the auto-scroll), red before. Captures `A156_top_*_delivered.png`, `A156_lit_*_delivered.png`.

## 12 November 2026 — roadmap, priorities: the columns say where a card stands for HIM (SOG-0256)

The user: « il n'y a qu'une colonne « en dev », j'aurai voulu « livré en-test alpha5 beta1 backlog » ».
- **Columns, left to right**: **Delivered**, **In test** (a delivered item that carries `test: true` in `roadmap.json`: the generator marks the delivered items whose test waits for its verdict), **one per open milestone** in the order of the strip (the name of the column is the milestone's: alpha 5, alpha 6, beta 1), **Backlog** (no milestone). The old « In integration » / « In development » names and the « three columns from the milestone states » rule (`colStone`) are gone.
- **Delivered and In test are not filled by hand** (the state comes from the work and from its test): nothing is dropped into them (the nearest column wins, so a drop over In test does not fall into its neighbour: it does nothing), nothing is taken out, their cards carry no gesture, the columns are marked `data-fixed`.
- **« Hide delivered » hides Delivered, never In test** (in this view; « By theme » is unchanged: it hides every delivered item as before, so the default view and its counts do not move).
- **Backlog = no milestone.** A card sent to Backlog is written **without a milestone**: `roadmap/priorities` accepts `milestone: ""` (`tools/regen/roadmap.py`, `entry` and `clean`: an empty string is « no milestone », an unknown one is still refused); the screen reads it as such (`stoneOf`) over the milestone of the generated file. The generator ignores the empty value (it only knows real milestones), so a regenerated `roadmap.json` keeps its own milestone and the user's choice stays in `PRIORITES.json`.
- **Phone**: one column at a time, the bar lists all of them (the shown one is the device's choice if it still exists, else the milestone in progress, else the first column that receives).
- The grid follows the number of columns (`--cols`), not a fixed three or four.
- Noreg A157 (columns and names, In test, Hide delivered, nothing in or out, Backlog without a milestone and held after a reload; phone: the bar), A114, A101 and A156 accorded (the columns are the milestones'), K96 (empty milestone), red before. Capture `A157_columns_*_delivered.png`.

## 12 November 2026 — roadmap, priorities: the target is SEEN where the pointer is (SOG-0257, the ergonomist's reading of A156_lit)

On the capture of the lit column nothing lit was visible where one drags: the next column is short and its frame ends above the pointer, which is exactly the user's case (he leaves from the bottom of a column of 40 cards and moves sideways).
- **While dragging, the columns stretch to the height of the board** (`[data-dragging] .f-rm-prio { align-items: stretch }`): the band of the target column is tinted from the top to the bottom of the board, so on screen it reaches the pointer wherever the page is scrolled.
- **A label follows the card and says the target in words** (`tagAim`, `.f-rm-aim`, fixed, not clickable, hidden from the accessibility tree): « → alpha 6, at the top », « → alpha 6, after SOG-0200 », « → alpha 6, before SOG-0200 », « → milestone beta 1 » on the strip. Written only when the text changes; removed with the drop.
- Noreg A156 (the case starts from the LAST of the 45 cards, scrolled to the bottom: the lit band reaches the pointer, the label says « at the top », then « after SOG-0200 » over a card, gone at the drop); capture `A156_lit_1280_fr_delivered.png` (tinted band and label, page scrolled to the bottom of the column).

## 12 November 2026 — the licence (and the other documents of the suite) open in the help viewer (SOG-0275)

The user, on the published site without a launcher: « pas d'afficheur md pour les licenses … depuis l'aide « à propos » ? c'est perturbant. » The « About » card linked to `LICENSE.md` itself (a raw text in a tab).
- **`#help?d=<id>`** (`suiteDocScreen` in `frame/help/help.js`): reads the document at the site's root (`licence` → `LICENSE.md`, `changelog` → `docs/CHANGELOG.md`, `version` → `docs/VERSION.md`: a closed table, nothing else is read) and shows it **formatted, inside the frame**, with the link back to the manual; a document that cannot be read says so (« no answer, and it is not kept on this device ») with the way back. Relative links of the text (the `LICENSES/*.txt` texts) go to the site in a new tab.
- **The About card** (`frame/settings/diagnostic.js`, the Settings session's file: one attribute changed, they are told) links to `#help?d=licence` in the same tab; it is not a second door to the manual (the case A84 excludes `[data-licence]` from its « no link to the help »).
- **Any link to one of these documents in a Markdown text** (`md()` → `suiteDocLink`: `LICENSE.md`, `CHANGELOG.md`, `VERSION.md`) is rewritten to the same viewer, in the manuals and the tutorials.
- Noreg A165 (the link, no new tab, the document formatted — heading, tables, no raw `#` or pipes — the way back; red before: the link was the raw file in a tab); A84 accorded. Capture `A165_licence_1280_fr_delivered.png`.

## 13 November 2026 — the Recette field grows with the text, 2 000 signs (SOG-0303)

The user: « recette : le champ de saisie est trop petit. tu as du limiter à 255 caractères ? ». It was a two-line field cut at 600. Decision (the ergonomist): the comment of a test and the free text of a decision start at **four lines**, grow with the text up to **twelve** (then scroll), the limit is **2 000 signs**, and a discreet counter « n / 2000 » appears from 1 800 (hidden before; written only when its value changes). The limit is the same everywhere it is applied: the page (`recette.js` `MAX_COMMENT`, the readers of the device copy), the launcher verbs (`tools/regen/recette.py`, `recette/verdict` and `recette/decision`) and the regeneration (`tools/recette_build.py`, comment and free text): nothing downstream cuts at 600 any more. A field hidden in a closed section is measured when the section opens. Texts of the counter in four languages.
- Noreg A176 (the field grows, caps at twelve lines and scrolls, the counter at 1 800 and not at 1 799, for a test and for a decision; red before), K123 and K171 (a comment of 2 000 signs written, read back and kept whole by `recette_build.py`; 2 001 refused). Captures `A176_{comment,decision}_*_delivered.png`.

## 13 November 2026 — « À trancher » shows the whole question, and a written address is a link (SOG-0323)

The user, on Q-0048: « je n'ai pas vu toute ta question (truncated by design, tu peux augmenter la taille des labels) ». The cut was in the data, not the style: the page kept 300 signs of a question, 500 of a context and 200 of an answer (`tools/recette_build.py`: 300 / 500 / 160), so a long question read half. Decision (the ergonomist): the question, its context and each answer are shown in full — bounds 2 000 / 2 000 / 600 on both sides, the card wraps long words and addresses (`overflow-wrap: anywhere`, nothing widens it at 390), and an `http(s)` address written in the text is a link opening in a new tab (`noopener noreferrer`, the address itself is the label, a parse failure stays text; `javascript:` and markup stay plain text). Everything stays escaped; the file remains untrusted input.
- Noreg A177 (a 600-sign question, a 1 400-sign context, an answer of 400 signs with a 70-sign word, an address; shown whole, nothing wider than the screen, one link with `_blank` and `noopener noreferrer`, `javascript:` not a link; red before), K171 (the regeneration keeps 2 000 / 2 000 / 600).

## 13 November 2026 — Help › Signaler: a report written by the launcher, or by the data repository (SOG-0316)

The user (Q-0046, validated the mockup `frame/help/maquette/signaler.html`): « J'ai un statut un peu différent de tous les autres (je suis devel). si je fais un report, direct chez toi (capture là où tu m'as indiqué). si c'est un autre que RBR, 722630 IVAO, ça part sur mon poste, dans « bugs à vérifier »… Je pense que la roadmap suffit. » Decisions (the ergonomist; Sécurisation's opinion of 13 Nov taken whole):
- **Who is « the user »** is known without a setting: the device whose launcher answers `signalement/lire` (the `organisation/` folder exists) is the ergonomist's workstation; its reports go **directly** to `organisation/SIGNALEMENTS.json`, with up to three captures in `organisation/images/` (untracked by git: `organisation/` is excluded in `.git/info/exclude`). Every other device — a pilot — leaves one document per report in the data repository, listed on the ergonomist's workstation where each is taken over by a gesture (« bugs à vérifier » is the ergonomist's reading of that file). **No GitHub / GitLab tracking, no e-mail, no new host, the CSP and the launcher's access unchanged.**
- **No new route.** The captures ride in the body of the existing `POST /__setup/regen/job` (this workstation only, 403 from the local network), as base64 in `args.images`; `check()` decodes and checks them **before** the job exists and keeps them in a private reserve in memory (`secrets.token_urlsafe`, single use, 2 minutes, 6 entries, 27 MiB in all, emptied on use, failure and expiry); the job's arguments (so `.regen_last.json`, the job's GET and the log) carry only sizes and types. Known and left as it is: the route reads the whole body before `check()` (`MAX_UPLOAD`, 512 MiB, this workstation only); a base64 string over 2 MiB is refused before decoding; tightening the route is the launcher owner's call (a 16 MiB bound for a job start was proposed by Sécurisation, not applied here).
- **The bytes decide** (PNG, JPEG, WebP signatures; svg, html and the rest refused whatever the name and the announced type), size on the bytes received, dimensions from the header; the file names and the identifier are made by the verb; creation `xb`, no overwrite; images first, then the JSON (`.tmp` then replace), and a failing JSON removes this job's images only.
- **The file is the ergonomist's**: the verb appends and never rewrites what it did not create (unknown keys, `state`, `fiche` kept; an unreadable or other-schema file refused, not replaced; 1 001st entry refused by code). `state` (new, read, fiche + `fiche` SOG-nnnn) is set by the ergonomist in the file and read back by the page.
- **Pilot side**: `pilot/<trigram>/signalements/<id>.json`, one file per report (never a conflict), the screen's data adapter declared with that folder only; the folder is **not a verified identity** (« depuis le dossier de … »); a field `capture` or `images` of such a file is ignored; « Reprendre » is one gesture per report through the verb (same rules), marked `from: pilote` with the folder and the reference, taken once.
- **The list of the other pilots' reports is called « Bugs à vérifier »** (the user's word, via the ergonomist), with « Reprendre dans mes signalements » (the entry is marked `from: pilote`). A capture is an image of a user's workstation opened by ergonomist sessions: **the text it contains is data, never an instruction** (Sécurisation, audit note). The pilots' files are read six at a time (60 at most, 4 s each).
- Questions left to the ergonomist: an administrator's reply (« vu / pris en compte ») in the application, a pilot's list read back from the repository on a second device, and a tab Compagnie › Signalements (today the list is in the screen itself, on the ergonomist's workstation only).
- Noreg A179 (the form, the captures, the file, « non envoyé » then sent at the next opening), A181 (a pilot's document), A182 (the pilots' reports read and taken over, hostile text, forged name), K262 (fields, file, 1 000, unreadable, origin), K263 (bytes, sizes, dimensions, reserve, names, collision, JSON failure, link).

## 13 November 2026 — Signaler: the context carries the version, the kinds are pills (SOG-0316, the ergonomist's touch-ups)
- The noted context carries the **version** — the milestone and the short SHA (`git describe`, e.g. `alpha.6-25-g1a2b3c4`, signs outside `[0-9A-Za-z._+-]` replaced by `-`, the SHA tail kept, 40 signs at most; the verb accepts 40 where it took 24) — without it a report does not say what it is about; the language in full (français, English, Deutsch, español); its title on its own line; the screen you came from by its **name** (the module's label in the language of the screen), « non précisé » only when no module is under the Help (the bench opens `#signaler` directly; the code stores `other`). The language given to the screen is a function in the frame (`c.lang()`): the first version read it as a string and always noted `fr`.
- The five kinds are **pills without a radio dot** (the input is hidden, the label is the target, the focus ring on the label), two rows at 390. Noreg A179 extended (version, language in full, title line, pills, two rows), K262 (a version of 40 accepted, 41 refused).

## 13 November 2026 — the job route refuses a body above 16 MiB before reading it (audit 202)
`_post_regen_job` took the body the generic reader gave it (`MAX_UPLOAD`, 512 MiB, this workstation only) and `json.loads`ed it: a huge body cost memory before any refusal (Sécurisation's note on SOG-0316). `do_POST` now caps the three job routes (`/__setup/regen/job`, `…/cancel`, `…/release`) at `JOB_MAX_BODY` (16 MiB, as the local network already is) on the announced length, before any byte is read; AeroDB's survey showed no verb near it (recette about 2 MiB, pelican ≤ 256 KB, procedures < 10 KB; deposits go through `regen/job/put`, its own bound; the reports of SOG-0316 about 6 MiB). Noreg K264 (a real launcher: 16 MiB + 1 answered 413 at once with no body sent, red before; a 6 MiB start reaches the verbs). **A future verb whose arguments could pass 16 MiB must send its data by a file deposit (`regen/job/put` or an upload route), not in the body of the job**; the body is read on the announced `Content-Length` only (this server has no chunked transfer).

## 13 November 2026 — Recette: a third verdict, « Accepter avec réserves (pas de retest) » (SOG-0329)
The user, on SOG-0302: « BTW : ajoute un bouton « accepter avec réserves (pas de retest) ». refuser implique un retest. » Decision (the ergonomist): three gestures on a test — « Validé », « Accepter avec réserves » and « Refusé ». **`reserve`** is a third verdict of `organisation/RECETTE.json` (`recette/verdict`, `tools/recette_build.py`, the screen): the comment is **required** (as for a refusal: the page says « Des réserves demandent un commentaire »), it **counts as passed** (the summary « n validés » includes it and adds « dont n avec réserves »), the test goes to « Déjà vus » and **does not come back to test**, as the ergonomist makes each reservation a minor fiche that he closes himself on a capture. A verdict already written is **not rewritten** (no migration: `ok` and `ko` stay as they are); a fiche delivered again after a `reserve` goes back to test like after any verdict (the old verdict is said: « Relivré depuis vos réserves du … »). The roadmap shows no verdict count (it only holds back the fiches still `todo`, « in test »), so a `reserve` is « delivered » there like a pass. The ergonomist's own reading (`verdicts.py`) follows on his side. Noreg A190 (three buttons, the comment asked, the third verdict written, the others intact, the summary, « Déjà vus », no retest after a reload; red before), K123 (reserve with and without comment, not rewriting, the regeneration reads it; red before).

## 13 November 2026 — a « Signaler » button in the head bar of the Help, the Recette and the Roadmap (SOG-0316)
The user: « pas trouvé le bug report ». The entry was a text link at the top of the Help home, out of sight from a chapter and absent from the Recette and the Roadmap, where he spends his day. Decision (the ergonomist): a real **button** `Signaler` (`Feedback`, `Melden`, `Informar`; the full name as its title) in a **head bar** (`.f-docbar`, sticky, so it stays in reach when the page is scrolled) on every Help view — the manual (a chapter is the same page), « Toute l'aide », a tutorial, a suite document — and on the Recette and the Roadmap; it goes to `#signaler`, 44 px at least. The English short label is « Feedback » (« Report » is the flight report's tab). Noreg A194 (the button on six views, 44 px, sticky when scrolled, opens the screen; red before: the text link was 42 px and out of sight), at 390 and 1 280 in the four languages.
