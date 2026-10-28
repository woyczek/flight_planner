# Sources and licences of the test fixtures

The code repository is public: every file here says where it comes from and why it may be published (security review of
28 October 2026, `docs/technique/AUDIT_SECURITE_2026-10-07.md`, point 6).

| File | Origin | Why it may be published |
|---|---|---|
| `eaip/AD_2_LFAV_*.rows.txt`, `eaip/AD_2_LFBD_*.rows.txt` | Lines of text read from the coding tables of the French eAIP, AD 2 pages of LFAV and LFBD, AIRAC cycle 2610 (effective 1 October 2026), published by the SIA | The SIA's open licence (*Licence ouverte*, SIA, March 2020, <https://www.sia.aviation-civile.gouv.fr/pub/media/news/file//l/i/licenceopendata-vf_2.pdf>, read on 28 October 2026): free reuse, commercial or not, including reproduction, extraction and redistribution, on condition of naming the source (at least the SIA and the date of the last update) and not altering the information or its meaning. The rows are the page's lines, cut by page, content unchanged. |
| `stream/AIXM4.5_sample.xml` | **Synthetic**: fictitious aerodromes ("AERODROME D ESSAI …", codes LF00…), navaids ("VOR FICTIF V00…") and points, written in the shape of the SIA's AIXM 4.5 export; the header (`origin="Sia-France"`, effective date) copies the shape of the export only | No SIA data |
| `stream/XML_SIA_sample.xml` | **Synthetic** ("TERRAIN FICTIF"), in the shape of the SIA's XML SIA export | No SIA data |
| `cifp/KSEA_subset.arinc` | FAA CIFP (Coded Instrument Flight Procedures), subset for KSEA | A work of the United States Government: public domain |
| `ofp_lfrs_lfml.json` | Built from SimBrief's documented OFP fields: route only (fixes, levels, rounded positions) | No pilot, user id or key |

**Attribution of the SIA extracts** (as the licence asks): « Service de l'Information Aéronautique — Données originales
téléchargées sur https://www.sia.aviation-civile.gouv.fr, mise à jour du 1er octobre 2026 (AIRAC 2610) ». The mention gives no
official character to their use here: tests of a flight-simulation suite, **not for navigation**.

A new fixture from a State's AIP other than France's does not come here (each State's copyright: `frame/aerodb/EAD_BASIC.md` § 4);
synthetic data in the same format instead.
