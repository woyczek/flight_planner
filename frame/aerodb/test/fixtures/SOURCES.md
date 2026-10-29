# Sources and licences of the test fixtures

The code repository is public: every file here says where it comes from and why it may be published (security review of
28 October 2026, `docs/technique/AUDIT_SECURITE_2026-10-07.md`, point 6).

| File | Origin | Why it may be published |
|---|---|---|
| `eaip/AD_2_LFAV_*.rows.txt`, `eaip/AD_2_LFBD_*.rows.txt`, `eaip/AD_2_LFBO_*.rows.txt`, `eaip/AD_2_LFPO_*.rows.txt` (the LFPO ones include `DATA_02`, the list of the aerodrome's procedure points) | Lines of text read from the coding tables of the French eAIP, AD 2 pages of LFAV, LFBD, LFBO and LFPO (some pages cut to a few procedures), AIRAC cycle 2610 (effective 1 October 2026), published by the SIA | The SIA's open licence (*Licence ouverte*, SIA, March 2020, <https://www.sia.aviation-civile.gouv.fr/pub/media/news/file//l/i/licenceopendata-vf_2.pdf>, read on 28 October 2026): free reuse, commercial or not, including reproduction, extraction and redistribution, on condition of naming the source (at least the SIA and the date of the last update) and not altering the information or its meaning. The rows are the page's lines, cut by page, content unchanged. |
| `eaip/FR-AD-2.LFBO.AD-2.12.html`, `eaip/FR-AD-2.LFPO.AD-2.12.html` | The section « AD 2.12 Caractéristiques physiques des pistes / Runway physical characteristics » (heading and first table: runway numbers, bearings, dimensions, threshold positions and elevations) of the AD 2 pages `FR-AD-2.LFBO-fr-FR.html` and `FR-AD-2.LFPO-fr-FR.html` of the French eAIP, AIRAC cycle 2610, published by the SIA; the rest of the page (and of the section: slopes, strips, remarks) is not kept | The SIA's open licence, as above: the section is cut out of the page, its content unchanged. |
| `stream/AIXM4.5_sample.xml` | **Synthetic**: fictitious aerodromes ("AERODROME D ESSAI …", codes LF00…), navaids ("VOR FICTIF V00…") and points, written in the shape of the SIA's AIXM 4.5 export; the header (`origin="Sia-France"`, effective date) copies the shape of the export only | No SIA data |
| `stream/XML_SIA_sample.xml` | **Synthetic** ("TERRAIN FICTIF"), in the shape of the SIA's XML SIA export | No SIA data |
| `cifp/KSEA_subset.arinc` | FAA CIFP (Coded Instrument Flight Procedures), subset for KSEA | A work of the United States Government: public domain |
| `ofp_lfrs_lfml.json` | Built from SimBrief's documented OFP fields: route only (fixes, levels, rounded positions) | No pilot, user id or key |

**Attribution of the SIA extracts** (as the licence asks): « Service de l'Information Aéronautique — Données originales
téléchargées sur https://www.sia.aviation-civile.gouv.fr, mise à jour du 1er octobre 2026 (AIRAC 2610) ». The mention gives no
official character to their use here: tests of a flight-simulation suite, **not for navigation**.

A new fixture from a State's AIP other than France's does not come here (each State's copyright: `frame/aerodb/EAD_BASIC.md` § 4);
synthetic data in the same format instead.
- `eaip/AD_2_LFPO_DATA_STAR_RWY20_RNAV_CODE_02.rows.txt`, `eaip/AD_2_LFPO_DATA_SID_RWY07_RNAV_CODE_04.rows.txt`, `…_05.rows.txt`: first-page rows of the SIA eAIP coding tables of Paris-Orly, cycle 2026-10-01 (Licence ouverte du SIA), read 29 Oct 2026.
- `eaip/AD_2_LFPG_DATA_SID_RWY09L-09R_RNAV_CODE_01.rows.txt`, `…SID_RWY26L-26R_RNAV_CODE_04…`, `…SID_RWY27L-27R_RNAV_CODE_02…`, `…STAR_RWY27L_RNAV_CODE_01…` / `_05…`, `…STAR_RWY08L_RNAV_CODE_01…`, `…RWY08L_INA_RNAV_CODE_01…`, `…RWY26L_FNA_ILS_CAT123_LOC_CODE…`, `…RWY26L_FNA_RNP_CODE…`, `…RWY27R_FNA_RNP_CODE…` (all `AD_2_LFPG_DATA_…`): first-page rows of the SIA eAIP coding tables of Paris-Charles de Gaulle, AIRAC cycle 2026-10-29 (several pages cut at a procedure boundary; Licence ouverte du SIA, attribution as above, « mise à jour du 29 octobre 2026 (AIRAC 2610-29) »), read 29 Oct 2026 for the point-merge and guard bench (K25).
- `ead/EI_SYNTH_SID_dublin_style.rows.txt`, `ead/EI_SYNTH_STAR_dublin_style_reversed.rows.txt`, `ead/EI_SYNTH_RNP_dublin_style.rows.txt`: **synthetic** (invented waypoints, positions and dates, tracks and distances computed from the positions), written in the layout of the
  Irish AIP pages of Dublin as read through EAD Basic on 29 Oct 2026 (column orders, text-layer faults: spaced digits, split names, reversed text order, `RNP / row / APCH`). No Irish AIP text is kept (the Irish AIP is a State's document: `EAD_BASIC.md` § 4); used by K26.
