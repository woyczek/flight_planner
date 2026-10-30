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

- Writes `frame/help/pilot.<lang>.md`: a generated-file comment, the introduction, then each module's chapter in the
  order of `APP.modules` in `frame/app.js`, then the frame screens' chapters, each preceded by
  `<!-- chapter: <id> -->`.
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
- **Reached** from the top of the manual ("Roadmap: what is delivered, in progress, planned") and from Settings ›
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
