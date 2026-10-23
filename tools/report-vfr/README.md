# Report VFR — VFR reporting points and routes from the VAC charts

A workstation tool of the suite: it reads the VAC PDFs of the French aerodromes (SIA) and compiles, for each aerodrome,
its reporting points, the sequences and routes between them, the written instructions of the charts and the state of
their analysis. The result, `vfr-compiled.json`, is imported into the data repository from the app (Settings ›
Maintenance › Aeronautical data, "Import a VFR compilation (VAC)…"), which checks it and writes `sia/vfr/`; the map
then shows the points of an aerodrome when it is hovered or pinned (modules/maps SPEC § 4 septies, frame/aerodb SPEC
§ 5 quater).

Everything it produces is **extracted from the VAC, to be checked**: never a published route; the VAC chart prevails.

## Dependency

Python 3.10 or later and **`pypdf`**, an optional dependency of this folder only (`requirements-vfr.txt`):

```
python -m pip install -r tools/report-vfr/requirements-vfr.txt
```

Nothing in the app or the launcher imports it (the launcher and the other tools keep to the standard library); without
it, the scripts stop with a clear message.

## Use

At each new VAC cycle:

1. put the new VAC PDFs (`AD-2.<ICAO>.pdf`) in a folder and set `sourceDirectory` in `config.json`;
2. `python refresh_vfr.py --config config.json` (or `refresh.ps1`): fingerprints, cache of unchanged PDFs, compilation,
   manual analyses still valid (`interpretations/<ICAO>.json`), reports; the result is `data/vfr-compiled.json`;
3. in the app, Settings › Maintenance › Aeronautical data, "Import a VFR compilation (VAC)…", and choose that file.

`compile_vfr.py` compiles directly; `audit_vac.py` inventories the PDFs and compares two inventories; `tests_vfr.py`
checks the engine (`vfr_core.py`); `affichage-vfr.html` is a standalone viewer of a compilation.

## Files kept in git, files not kept

- Kept: the scripts, `config.json`, the manual analyses `interpretations/*.json` (the source of truth of the analyses,
  each tied to the fingerprint of the PDF it read), the notes.
- Not kept (`.gitignore`): what the scripts produce — `data/` (compilation, GeoJSON, reports, history), `cache/`, the
  other `*.json` of this folder (`audit-vac-local.json`…) — and `reviews/*.png`, crops of the VAC charts used for the
  analyses (SIA documents, not published with the code).

## Notes (in French, by the author of the analyses)

- `MODE-D-EMPLOI.md` — instructions, statuses per aerodrome, update procedure;
- `FORMAT-DONNEES.md` — data model, version 2.0;
- `README-vfr.md`, `constats-vac.md` — first notes and the findings on the local corpus;
- `reviews/ANALYSES.md` — the manual analyses of 23 October 2026 (LFBD, LFBO, LFCD, LFCH, LFMA, LFML, LFMN).

The importer accepts the formats 1.x (first prototype) and 2.x (`tools/vfr_import.py`).
