# help — reading of the V2 help, and what the Pilot application makes of it (lot 1)

*23 October 2026. V2's help (`apps/aide/`, `docs/`, `tools/build_docs_bundle.py`) stays on develop as it is. This
page says what the Pilot application keeps, how a module's documents feed its manual without anything written twice,
the in-page help, the phone help page, and what the delivered modules have today. No code. Decisions:
[DECISIONS.md](DECISIONS.md).*

## 1. V2 today, and what is kept

| V2 | Pilot application |
|---|---|
| Tutorials first (`docs/tutorial/*.en.md`, translated to French), step by step | **Kept**: one tutorial per first task ("prepare a flight: fuel and level", "write a report"), English then French, in `frame/help/tutorial/` |
| Three manuals (user 2,000 lines, administrator, operations) × four languages, one chapter per page (`<!-- page: … -->`) | **One manual per application** (Pilot), one chapter per module, four languages, French first; administration and operations stay V2 / CPCO |
| `apps/aide/` (viewer, `markdown.js`) and `docs_bundle.js` (64 documents, 2.5 MB, every page) | A **help screen of the frame** (`#help`) with its own small bundle: the Pilot manual and tutorials only; `markdown.js` reused as it is |
| Help opened "at the chapter of the current page" | `#help?m=<module>` opens the module's chapter; a help button in the header (to add) links there |

## 2. One source per module, nothing written twice

- A module ships **`help/<lang>.md`** (fr, en, de, es; French written first, the others translated): its manual
  chapter, for the user, in plain words. `SPEC.md` stays the developer's regeneration prompt, in English; it is never
  shown to the user.
- The chapter's first section, **"How to use"** (`## Comment s'en servir`…), is the in-page help: a few short
  paragraphs, one idea each, in the order of use, each opening with its subject in bold (the V2 availability
  panel's pattern: "**The palette.** …"). The sections after it (details, limits, offline) are for the manual only.
- The Pilot manual is **assembled, not written**: `frame/help/pilot.<lang>.md` (what the application is, first start,
  synchronisation, settings) followed by each module's chapter in the order of `APP.modules`. A build step (standard
  library, like `build_docs_bundle.py`) writes the bundle and checks that every module has its four files and its
  "How to use" section.
- Short texts that already live in `module.js` (hints, "paste the website's page here") stay there: they are labels of
  the screen, not help. A paragraph is never copied from `module.js` into the chapter or the other way round.

## 3. In-page help, through the frame's contract

- **`meta.help: true`** (or a path) declares that the module has `help/<lang>.md`; the files go in `meta.files` so they
  are kept offline.
- The frame draws the panel, so every module has it at the same place and the module writes no code: a folded
  "How to use" block at the top of the module's screen, opened state remembered per module on the device; a link
  "Read the whole chapter" to `#help?m=<id>`.
- **`ctx.help`** for the rare module that wants more: `ctx.help.open(section)` (opens the panel at a paragraph) and
  `ctx.help.link(id)` (a link to its chapter).

## 4. The help page on a phone

- Text first: the chapter of the module one came from, or the application's introduction.
- Contents folded behind "Contents ▾" (the V2 phone pattern), "↑ Contents" at the end of each chapter.
- Search in the page, four languages following the application's language, no table wider than 375 px (tables become
  lists), offline from the first visit (the bundle is a frame file).

## 5. What the delivered modules have today

| Module | In-page help | Reusable for a chapter |
|---|---|---|
| fuel | none; folded sections that are part of the screen (details, climb guide, settings, GPT prompt) | 172 text rows, 20 hints; SPEC § 9 (screens) to turn into a chapter |
| report | none; a hint about the website hand-off and the bookmark | SPEC § 2–6 (steps, families, prefill); READING (clicks) |
| flightlog | none | SPEC (sources, filters, totals) |
| maps | one hint line ("drag along the profile…") | SPEC, READING |
| website | paste instructions per page (flight log, fleet) | SPEC, READING (what the website is) |
| hello | none (example module) | — |
| settings, aerodb (frame) | card hints in settings; none in aerodb | settings SPEC § 3 (cards) |

No module has a "How to use" panel or user-facing help file yet; every user text is a `[fr, en, de, es]` row in
`module.js`. Each chapter is therefore to be written once, by the module's agent, in `help/fr.md`, then translated.

## 6. Proposed next lots

1. The frame's `#help` screen and the panel from `meta.help`, with the fuel chapter as the first one (written with the
   fuel agent), and the build step of the bundle.
2. One chapter per module, asked of each module's agent, reviewed here for tone and length.
3. The two tutorials.
