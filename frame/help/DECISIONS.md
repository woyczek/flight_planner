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
