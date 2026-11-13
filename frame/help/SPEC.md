# help — specification (regeneration prompt)

The help of a V3 application: one manual per application assembled from the modules' own chapters, the folded
in-page "How to use" panel at the top of each module, and the help screen. Reading of V2: [READING.md](READING.md);
decisions: [DECISIONS.md](DECISIONS.md); how a module gets its help: [INTEGRATION.md](INTEGRATION.md).

**As a prompt**: give this document with `frame/SPEC.md`, and ask for `frame/help/help.js` (classic script,
`window.SogHelp`) and `frame/help/build_help.py` (standard library). Every rule below is a requirement.

## 1. Sources

- **A module's chapter**: `modules/<id>/help/<lang>.md` for `fr`, `en`, `de`, `es`. Written in French by the module's
  agent; translated and reviewed by the help agent. One `# Title`, first; then sections `## …`.
- **The first section is the in-page help** ("Comment s'en servir", "How to use", "So geht’s", "Cómo usarlo"): a few
  paragraphs, one idea each, in the order of use, each opening with its subject in bold ("**The route.** …"). The
  sections after it are for the manual only.
- **A translation** ends with `<!-- fr: <fingerprint> -->`, the first 12 characters of the SHA-1 of the French file it
  translates.
- **A frame screen's chapter**: the same, in the screen's folder — today `frame/settings/help/<lang>.md` (Settings),
  written and translated by the help agent; listed in `FRAME_CHAPTERS` of the build, placed after the modules.
- **The application's introduction**: `frame/help/intro.<lang>.md` (what the application is, first start, data and
  synchronisation).
- **The tutorials**: `frame/help/tutorial/<id>.<lang>.md`, listed in `TUTORIALS` of `help.js` (§ 6).
- `SPEC.md` of a module is a developer document; it is never shown.

## 2. Build (`python frame/help/build_help.py [--check]`)

- Writes one manual per application, `frame/help/<app>.<lang>.md` (`pilot`, `maintenance`; 31 Oct 2026): a
  generated-file comment, the application's introduction (`intro.<lang>.md` for Pilot, `intro-<app>.<lang>.md` for the
  others), then the chapter of each of its modules in the order of `APPS.<app>.modules` in `frame/app.js`, then the frame
  screens' chapters (Settings), each preceded by `<!-- chapter: <id> -->`. The help screen and the modules' panels read
  the manual of the application shown (`c.app`); Pilot's tutorials are listed in Pilot's manual only.
- **Refuses**, writing nothing, when a module that has a `help/` folder misses a language, when a chapter does not start
  with its single `# ` title, or has no `## ` section; when an introduction is missing.
- **Reports** without refusing: a module with no chapter yet; a translation whose fingerprint is absent or differs from
  the French file ("to translate again").
- **Tutorials** (§ 6): refuses a missing English or French file, a file without its single `# ` title first, an image
  that is not in `tutorial/img/`; reports a translation whose `<!-- en: … -->` fingerprint differs from the English
  file, and a missing German or Spanish file (English is shown).
- `--check`: checks and says which files would change.

## 3. In-page panel

- Drawn by the frame **after** the module's element when the module's chapter exists (and `meta.help` is not `false`);
  the module writes no code. Below the content, never above (30 Oct 2026, Simplification): the panel arrives after the
  module's first drawing, and above it pushed the whole page down — a tap just after the opening hit the wrong row (M2,
  M3). The welcome card of the tutorials goes there too, before the panel. The header's « ? » stays the direct way in.
- A folded `<details>` card: its summary is the first section's title (at least 44 px high), its body the section's
  paragraphs, then "Read the whole chapter" → `#help?m=<id>`.
- Open or folded is remembered per module on the device (`device/help.json`, cache policy).
- **Dismissed once** (rule 16): a ✕ in the summary (44 px, "Hide" ×4, a button inside the `<summary>`: it neither folds nor
  unfolds) removes the card and writes `hidden: { <id>: true }` in `device/help.json`; `panel()` then returns nothing for that
  module. The chapter on the help screen carries "Show the first steps again" under its title (only for a module whose card is
  hidden): it clears the flag, sets the card open, puts the card back at once if the module is still drawn under the help, and
  goes to `#<id>`. The panel's anchors (`<a id>` of its paragraphs) become `data-a` there: the manual is the only owner of an
  id, and `ctx.help.open('<anchor>')` also finds a paragraph by it.
- `ctx.help.open(subject)`: opens the panel and scrolls to the paragraph whose bold subject starts with `subject`
  (case-insensitive), or to the panel; false when the module has no panel. `ctx.help.link(id)`: `#help?m=<id>`.

## 4. Help screen (`#help`)

- The whole manual rendered in one pass (unique anchors across chapters) with the frame's copy of V2's renderer
  (`frame/lib/markdown.js`).
- **Text first**: `#help?m=<id>` scrolls to the module's chapter, `#help?a=<anchor>` to a heading; without either, the
  introduction.
- **Contents**: a folded "Contents ▾" card after the introduction (open on a screen wider than 760 px), chapter and
  section titles; "↑ Contents" at the end of each chapter opens it.
- Every link inside the help (contents, heading permalinks, `#anchor` links of the text) becomes `#help?a=…`, so the
  router keeps the hand; outside links open in a new tab.
- **Phone**: no horizontal scroll at 375 px; tables become lists, each cell preceded by its column title.
- **French typography** as in the frame's texts: a narrow no-break space before `: ; ! ? »` and after `«`.
- **Language**: the application's; a missing language falls back to French. Offline: the four manuals and the scripts
  are in the frame's service worker list.
- The header's **?** button opens `#help?m=<current module>`, or `#help?m=settings` from the settings screen. When the module
  published an anchor (`ctx.helpAnchor`), the address is `#help?m=<id>&a=<anchor>`: the screen scrolls to that anchor (under
  the sticky header: `scroll-margin-top`) and highlights its paragraph (`p`, `li` or title that holds the `<a id>`) with the
  class `f-hl` for 1.5 s, once; `a` alone (contents, permalinks) and `m` alone never highlight, an anchor that is not in the
  manual falls back on the chapter.
- **Anchors**: `<a id="<module>-…"></a>` at the start of a paragraph, or anywhere in a `##` title (the renderer takes it out
  of the title's text and makes it the title's id); the same ids in the four languages, prefixed by the module id, unique in the
  manual. `build_help.py` refuses a language whose anchors differ from the French one, a wrong prefix, a duplicate, and an anchor
  that `module.js` cites in `helpAnchor(...)` but the chapter lacks (a template `fuel-step-${n}` needs one anchor of that prefix).
- The settings screen shows its own folded panel under its introduction (`helpPanel` of its context).

## 5. Roadmap (`#roadmap`, `frame/help/roadmap.js`)

- **Source**: `frame/help/roadmap.json`, schema `sog-roadmap/1`, kept by the ergonomics session: `note` (what is
  delivered must work, a gap is a bug; in progress, planned or later is not), `states` (`done`, `doing`, `planned`,
  `later`), `apps` (id, label, state), `lanes` (one per module or block: id, app, label, `items` of `{ state, fr, en,
  de, es }`), `updated`. Every text is in the four languages; the build's check refuses a missing one or an unknown
  state.
- **Screen**: the title, the note first (a card), the update date and a link to the help, the applications with their
  state, then the lanes.
  - On a screen: a table, one row per lane (its label and application), four columns Delivered, In progress, Planned,
    Later, items as short cards.
  - On a phone (760 px or narrower): one card per lane, items grouped by state under the state's name, empty states
    left out.
  - Colour per state with the frame's tokens only: delivered `--sog-ok`, in progress `--sog-accent`, planned
    `--sog-warn`, later `--sog-muted` (a coloured left border).
- **Schema 2** (`sog-roadmap/2`, SOG-0062; the data is built by the ergonomics session's `tools/roadmap_build.py`, this screen reads it):
  the schema 1 plus, per item, `kind` (`feature` by default, or `bug`), an optional `id` (SOG-0045), `milestone`, `since`, `delivered`; at
  the top `generated` and `milestones` (`id`, `label`, `date`, `state` among the four states, `items`). Backward compatible: **a schema 1 file
  is drawn exactly as before** (case A97); an item without `kind` is a feature; a file without `milestones` has no strip. Five elements
  from top to bottom, all state in the screen except the one remembered choice:
  1. the **strip** of milestones (name, date, state colour; the current one, the first « doing » else the first « planned », is
     marked); a touch filters the kanban on its items (`milestone` of the item, or the milestone's `items`), touched again it goes; on a
     phone it is one line that scrolls by itself;
  2. two **tabs** Features | Bugs, the count in brackets = what the tab shows with the other choices;
  3. the **application filter**: All, then the file's `apps` in their order (a lane shows only for the chosen application);
  4. the **« Hide delivered »** box, checked by default, remembered per device in `device/roadmap.json` (`{ hideDone }`); the
     delivered cards leave the kanban and the lane header says « 24 delivered » (a chosen milestone beats the hiding);
  5. the **kanban**: the four state columns as before; a card carries its identifier in small and its milestone.
  Texts: the language, else English, else French; every text escaped. `build_help.py` checks `kind`, the milestones (state, texts, items
  cited that exist) and the lanes' applications for a schema 2 file. Cases A96 (schema 2 at 390 and 1280, four languages), A98 (the build's check), A97 and A99 (the shipped file)
  (schema 1 unchanged).
- **Two views: « Par thème » (the default) and « Priorités » (a mode you choose, kept on the device — SOG-0160 refused as « par défaut »: « c'est un « mode priorités », pas un default »)** (SOG-0160; case A114; the user, 10 Nov 2026: « les cartes sont bloquées par les swimlanes »). A bar under the strip chooses the view, remembered in `device/roadmap.json` (`view`). **« Priorités »**, once chosen and kept (`device/roadmap.json` `view`): **three columns** drawn from the milestones — « En intégration » (the milestone in progress, the first `doing`), « En développement » (the next one, the first `planned`) and « Backlog » (everything else: no milestone, a later one) — and a fourth, « Livrées » (read only), when delivered cards are shown; the cards are **flat, by rank** whatever their theme, the theme being a label on the card (`[data-theme]`). The tabs, the application filter, « Hide delivered » and the strip still apply. A card is dragged **above or below any card of any column**, or **onto a column** (it goes to its end): the rank is written, and a card that changes column takes the **milestone of that column** (`place`: one gesture, one write; a column without milestone takes nothing); dropped on the strip it takes that milestone as before. The column of a card is derived on the page from the file's `milestones[].state` and the card's milestone (the user's or the file's): no field is added to the file. On a **phone** one column at a time (a bar of three buttons with their counts, the last one kept per device in `col`), and the drag is replaced by **Monter**, **Descendre** and **Envoyer vers…** on each card (44 px). **« Par thème »** is today's lanes (kanban by state, folding lanes), **read only**: no drag (a long touch still copies).
- **The Recette screen** (SOG-0167; `#recette`, `frame/help/recette.js`, `SogRecette`; cases A115, K123; the user, 10 Nov 2026: « une page avec tous les tests manuels que je dois faire quotidiennement… avec mes commentaires et le statut validé / refusé »). A frame screen beside the roadmap (Settings › Administration lists it). Source: `frame/help/recette.json` (`sog-recette/1`, generated by `tools/recette_build.py` from the organisation folder: `{ apps, tests: [{ id, app, title, test, since, state: todo | known | ok | ko, comment?, at? }] }`, one functional test per delivered card written in the pilot's words). Top to bottom: a summary (« n à valider · n validés · n refusés · n en cours »), the filter by application, then the sections — **« Tests du jour »** (delivered after the last recette, i.e. after the day of the last verdict made before today; every test while there is no verdict), **« Plus anciens »**, **« En cours : ne pas retester »** (`known`: the defect is already known, said on its test, no verdict button: it is not reported twice) and **« Déjà vus »**; all but the first folded (kept per device in `device/recette.json` `open`); **seven tests visible per section**, then « Voir les n autres ». A test carries its identifier, its title, its text, a **comment** field and **« Validé » / « Refusé »**; **a refusal needs a comment** (empty: the line « Un refus demande un commentaire » is shown, nothing is sent); a seen test can be **put back to test** (« Remettre à tester »). **Written by the launcher**: `regen/job { set: 'recette', verb: 'verdict', args: { action: 'get' | 'set', items } }` (`tools/regen/recette.py`, same shape and refusals as `roadmap/priorities`) reads and replaces `organisation/RECETTE.json` — `{ schema: 'sog-recette/1', updated, items: { 'SOG-nnnn': { verdict: 'ok' | 'ko', comment (2000 signs — 600 before SOG-0303 —, required for `ko`), at (ISO UTC) } } }`, 1000 entries at most, `set` refuses a bad entry for the whole set (`bad-items`), `no-organisation` without the folder; once the launcher's file is read it **is** the truth (a generated state is only the first look). Without a launcher the verdicts stay in `device/recette.json` (`pending`, `unsent`; a removal is `null`) and the test says « non envoyé »; what the device kept is sent at the next opening with a launcher. Everything read (the file, the answer, the store) is untrusted: identifiers `SOG-nnnn`, bounded texts, escaped.
- **Folding lanes** (SOG-0069; case A103): a lane's title is a button (`aria-expanded`): a touch folds or unfolds its columns, the number of
  cards of the view stays in the title (`(n)`, with « n delivered »). A lane is **folded by default** when it has no undelivered card in the current
  view (tab, application filter, milestone); a touch makes the choice explicit, kept per device in `device/roadmap.json` (`fold`: lane id → folded,
  200 lanes at most, booleans only).
- **Priorities** (SOG-0066, the user's way to reprioritise; case A101, launcher verb case K96):
  - the card starts with its **identifier** in clear (`SOG-0046`, the text's size, bold); a **right click**, or a **long touch** released
    without moving, copies `SOG-0046 — <title>` and says « Copied » (a notification);
  - **dragging** (mouse after 6 px; touch after a 450 ms hold, the card then outlined, the page no longer scrolls): in a column, a card
    dropped above or below another card of that column takes its place in the **global priority order** (every identified card gets its rank
    1…n, 500 at most); dropped onto a point of the strip it takes that **milestone**. A card without a `SOG-nnnn` identifier cannot be moved;
    near the top or bottom edge the page scrolls by itself. The result shows at once, before anything is written;
  - **written by the launcher**: `regen/job { set: 'roadmap', verb: 'priorities', args: { action: 'get' | 'set', items } }`
    (`tools/regen/roadmap.py`) reads and replaces `organisation/PRIORITES.json` at the suite's root: `{ schema: 'sog-priorities/1', updated,
    items: { 'SOG-0046': { milestone?, rank? } } }`; ids `SOG-nnnn`, milestones of this file, integer ranks 1…99999, 500 entries at most;
    `set` refuses a bad entry for the whole set (`bad-items`), a missing `organisation/` folder is `no-organisation`; `tools/roadmap_build.py`
    reads it at each regeneration (milestone forced, rank). The screen reads it at the opening (`get`) and lays it over the generated
    file; everything read is filtered again (identifier, known milestone, integer rank);
  - **without a launcher** (a device on GitHub Pages, a paired device, an old launcher, a failed write): the order is kept in
    `device/roadmap.json` (`pri`, `unsent`), the moved card says « not sent », and a failed write is told once; at the next opening with a
    launcher what the device kept is sent and forgotten. The frame gives the screen `ctx.notify` and `ctx.launcher()` (the client limited to
    `regen/job`; `null` without launcher).
- **Reached** from the top of the manual (\"Roadmap: what is delivered, in progress, planned\") and from Settings ›
  About. Offline: the script and the JSON are in the frame's service worker list.

## 6. Tutorials (`#help?t=<id>`)

- **What**: one short page per first task, telling what to do, step by step; the chapters say how it works, so nothing
  is said twice. Today, in the order of use: `join-airline` (the assistant's seven steps), `prepare-flight` (the five steps of Fuel: Flight, Route with the map and
  its Edit mode, Weather, Quote and density altitude, Departure) and `write-report` (from the started flight or the
  last IVAO flight to "Save and record on the website", then My flights).
- **Sources**: `frame/help/tutorial/<id>.<lang>.md`, written in English first, then French; German and Spanish later.
  A translation ends with `<!-- en: <fingerprint> -->` (first 12 characters of the SHA-1 of the English file). One
  `# Title`, an italic line (what and how long), "Before you start", then one `## n. Step` per step: one capture, then
  a few paragraphs, one idea each, subject in bold, the screen's labels in quotes; links to the chapters at the end.
- **Captures**: `tutorial/img/<id>-<n>.<lang>.png`, one per step, 375 × 812 px, 256 colours; produced by
  `frame/help/tutorial/capture.py` (Chrome without a window, a fresh profile per language) on a test data folder only
  — a fictional airline (`https://example.invalid`), the published French aeronautical base and the published types,
  trigram TST, no network ID; the script refuses another folder.
- **Screen**: "← The manual", the tutorial (images at most 300 px wide, centred), then "Next tutorial: … →" and
  "← The manual". A language without its file shows the English one, marked "(in English)" in the lists.
- **Reached** from the top of the manual (a "Start with…" card after its first paragraph, listing the tutorials) and
  from the **welcome card** drawn by the frame above the first module opened on the device: "First time here? Start
  with a short tutorial:", the tutorials, ✕, and "Joining an airline? Start here" (`#settings?join=1`, the assistant of
  frame/settings/SPEC.md § 7). Closing it or opening a tutorial stores `welcomed` in
  `device/help.json`; it never comes back on that device.
- Offline: the English and French texts are in the frame's service worker list; the captures are kept at their first
  view.
