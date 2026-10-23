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
- `SPEC.md` of a module is a developer document; it is never shown.

## 2. Build (`python frame/help/build_help.py [--check]`)

- Writes `frame/help/pilot.<lang>.md`: a generated-file comment, the introduction, then each module's chapter in the
  order of `APP.modules` in `frame/app.js`, then the frame screens' chapters, each preceded by
  `<!-- chapter: <id> -->`.
- **Refuses**, writing nothing, when a module that has a `help/` folder misses a language, when a chapter does not start
  with its single `# ` title, or has no `## ` section; when an introduction is missing.
- **Reports** without refusing: a module with no chapter yet; a translation whose fingerprint is absent or differs from
  the French file ("to translate again").
- `--check`: checks and says which files would change.

## 3. In-page panel

- Drawn by the frame before the module's element when the module's chapter exists (and `meta.help` is not `false`);
  the module writes no code.
- A folded `<details>` card: its summary is the first section's title (at least 44 px high), its body the section's
  paragraphs, then "Read the whole chapter" → `#help?m=<id>`.
- Open or folded is remembered per module on the device (`device/help.json`, cache policy).
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
- The header's **?** button opens `#help?m=<current module>`, or `#help?m=settings` from the settings screen.
- The settings screen shows its own folded panel under its introduction (`helpPanel` of its context).
