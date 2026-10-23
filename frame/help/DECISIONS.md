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
  - the panel is drawn by the frame's `route()` before the module's element, without delaying the mount; a module has
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
