# aircraft — decisions

- **30 Oct 2026 — the module, the fleet first** (§ 10.34 lot A2, Features SOG; SPEC agreed by Simplification). Order: the
  schema field `maxCrosswindKt` (586a25b0f, in frame/aerodb/sheets.js since the AeroDB session is closed), then this shell and
  the Flotte view, then the sheets, the imports, and the removal of Fuel's editor. The editor opens in place of the list,
  not in the frame's sheet primitive (the map's draggable panel). Every write of the fleet reads the file just before and
  changes one aircraft (the website module writes the same file from a pasted page; `record` on both sides). A type the
  base does not know is kept and said (« Type absent de la base »), never refused; the registration is the key and must
  be unique. Seven rows then « N autres » (seven elements per screen). Cases M1–M5 (area M, reserved by V3 Frame).
