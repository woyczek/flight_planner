# Sources and licences of the test fixtures

The code repository is public: every file here says where it comes from and why it may be published (security review of
28 October 2026, `docs/technique/AUDIT_SECURITE_2026-10-07.md`, point 6).

| File | Origin | Why it may be published |
|---|---|---|
| `eaip/<ICAO>/` — one **page set** per French aerodrome, see the list below (`AD_2_<ICAO>_DATA_*.rows.txt`, `FR-AD-2.<ICAO>.AD-2.12.html`, `manifest.json`) | Lines of text read from the first page of every data and coding PDF of the French eAIP (AD 2 pages), published by the SIA, content unchanged; the AD 2.12 extract is the section's heading and first table of the aerodrome's page | The SIA's open licence (*Licence ouverte*, SIA, March 2020, <https://www.sia.aviation-civile.gouv.fr/pub/media/news/file//l/i/licenceopendata-vf_2.pdf>, read on 28 October 2026): free reuse, commercial or not, including reproduction, extraction and redistribution, on condition of naming the source (at least the SIA and the date of the last update) and not altering the information or its meaning. The rows are the page's lines, content unchanged; the rest of the AD 2 page is not kept. |
| `stream/AIXM4.5_sample.xml` | **Synthetic**: fictitious aerodromes ("AERODROME D ESSAI …", codes LF00…), navaids ("VOR FICTIF V00…") and points, written in the shape of the SIA's AIXM 4.5 export; the header (`origin="Sia-France"`, effective date) copies the shape of the export only | No SIA data |
| `stream/XML_SIA_sample.xml` | **Synthetic** ("TERRAIN FICTIF"), in the shape of the SIA's XML SIA export | No SIA data |
| `cifp/KSEA_subset.arinc` | FAA CIFP (Coded Instrument Flight Procedures), subset for KSEA | A work of the United States Government: public domain |
| `ofp_lfrs_lfml.json` | Built from SimBrief's documented OFP fields: route only (fixes, levels, rounded positions) | No pilot, user id or key |

**Attribution of the SIA extracts** (as the licence asks): « Service de l'Information Aéronautique — Données originales
téléchargées sur https://www.sia.aviation-civile.gouv.fr, mise à jour du 1er octobre 2026 (AIRAC 2610) ». The mention gives no
official character to their use here: tests of a flight-simulation suite, **not for navigation**.

A new fixture from a State's AIP other than France's does not come here (each State's copyright: `frame/aerodb/EAD_BASIC.md` § 4);
synthetic data in the same format instead.
- **eAIP page sets** (V3 § 10.29 (e); constraint: real fixtures for France only, the SIA's open licence — every other State's pages stay invented, `ead/` below). Each set is regenerated, and checked, by `tools/make_eaip_fixtures.py`; its `manifest.json` gives `{ icao, cycle, source: 'SIA eAIP', generated_at, pages: [{ file, pages, rows, sha256 of the PDF }] }`. Attribution as above (« mise à jour du 1er octobre 2026 (AIRAC 2610) » or « du 29 octobre 2026 (AIRAC 2610-29) »); tests of a flight-simulation suite, **not for navigation**.
  - `eaip/LFPO/` — Paris-Orly, cycle 2026-10-01, the 60 data and coding pages and the AD 2.12 extract. `python tools/make_eaip_fixtures.py LFPO --cache <data/local/eaip/2026-10-01> --ad2 <FR-AD-2.LFPO-fr-FR.html>` (`--check` to compare, `--fetch` to download the missing PDF).
  - `eaip/LFBO/` — Toulouse-Blagnac, cycle 2026-10-01, 21 pages and the AD 2.12 extract. Same command with `LFBO`.
  - `eaip/LFPG/` — Paris-Charles de Gaulle, cycle 2026-10-29, 90 pages (85 coding pages, whole) and the AD 2.12 extract. `python tools/make_eaip_fixtures.py LFPG --cache <data/local/eaip/2026-10-29> --ad2 <FR-AD-2.LFPG-fr-FR.html>`.
  - `eaip/LFBD/` (Bordeaux-Mérignac, 5 pages) and `eaip/LFAV/` (Villeneuve-sur-Lot, 3 pages) — cycle 2026-10-01, kept as they were before the sets existed (the PDF are not in the cache of this workstation); **not regenerable: source PDF not cached** (the manifest says so; `python tools/make_eaip_fixtures.py LFBD --adopt --cycle 2026-10-01` rewrites it). To make them regenerable, download their PDF into a cache and run the command as for LFPO.
- `ead/EI_SYNTH_SID_dublin_style.rows.txt`, `ead/EI_SYNTH_STAR_dublin_style_reversed.rows.txt`, `ead/EI_SYNTH_RNP_dublin_style.rows.txt`: **synthetic** (invented waypoints, positions and dates, tracks and distances computed from the positions), written in the layout of the
  Irish AIP pages of Dublin as read through EAD Basic on 29 Oct 2026 (column orders, text-layer faults: spaced digits, split names, reversed text order, `RNP / row / APCH`). No Irish AIP text is kept (the Irish AIP is a State's document: `EAD_BASIC.md` § 4); used by K26.
