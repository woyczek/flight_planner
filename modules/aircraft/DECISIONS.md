# aircraft — decisions

- **30 Oct 2026 — the module, the fleet first** (§ 10.34 lot A2, Features SOG; SPEC agreed by Simplification). Order: the
  schema field `maxCrosswindKt` (586a25b0f, in frame/aerodb/sheets.js since the AeroDB session is closed), then this shell and
  the Flotte view, then the sheets, the imports, and the removal of Fuel's editor. The editor opens in place of the list,
  not in the frame's sheet primitive (the map's draggable panel). Every write of the fleet reads the file just before and
  changes one aircraft (the website module writes the same file from a pasted page; `record` on both sides). A type the
  base does not know is kept and said (« Type absent de la base »), never refused; the registration is the key and must
  be unique. Seven rows then « N autres » (seven elements per screen). Cases M1–M5 (area M, reserved by V3 Frame).
- **30 Oct 2026 — the sheets editor, moved from Fuel** (§ 10.34 lot A2, step 3). The « Fiches » view is Fuel's code moved to
  `modules/aircraft/sheets.js` (`createSheetsView(host)`) and `sheets_texts.js`, **not rewritten**: the logic stays aerodb's
  (`AeroDBSheets`, `sheets.put` / `remove`), Fuel's globals became the closure state, the `fu-` CSS classes became `ac-`. Fuel is
  untouched (its editor is removed in a later commit, SPEC § 5), so the two editors coexist for now. Added: the origin and
  date under each filled field (`sheets.origins`; a field without a value shows none; an unstamped field shows aerodb's
  fallback « base V2 »), a search on the list, the tabs Flotte / Fiches kept in `cache/aircraft/ui.json`,
  `#aircraft?sheet=<id>` (consumed once), and the status line `cache/aircraft/status.json`. The cards of the two views carry
  `data-pane`, the tabs `data-view` (the M1–M5 selectors follow). Left out: « Utiliser » and « Depuis le dernier OFP »
  (a flight and an OFP are Fuel's, not Maintenance's). Cases M6–M11.
- **30 Oct 2026 — Fuel's editor removed** (step 5). Fuel keeps its « Fiches » list read-only, with « Utiliser » and links to
  `?app=maintenance#aircraft?sheet=<id>`; `perf_prompt.js` moved here (`git mv`). Details in modules/fuel/DECISIONS.md.
