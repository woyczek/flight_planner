# DEPRECATED - 2026-11-11

This folder is the former `labs/` of the suite, archived on 11 November 2026 (SOG-0152, the user: « archiver »).

- It is **kept for reference only**: nothing in the suite loads it, it is not published (`tools/build_pages.py`, `SKIP`) nor shipped in a version archive
  (`tools/publish_dist.py`, `EXCLUS`).
- Its pages open from their old place (`../frame/…`, `../shared/…` are relative to `labs/`): moved here they no longer find their scripts and style sheets.
  To read one, copy the folder back to the root of the suite under its old name.
- `design_primitives.html` — the demonstration of every primitive in every design (replaced by the frame's own screens and their cases).
- `dispos_timeline.html` — the example page of the stand-alone availability timeline; the module package still ships it
  (`tools/publish_dist.py` reads it from here).
- `atmosphere/` — the first mock-up of the Atmosphere module (now `modules/atmosphere/`).
- `tests_mobile_github/` — the old mobile-test pages of the GitHub transport.

The V2 pages are not here: they stay under `apps/`, `shared/` and the root until their own removal.
