# Prompt for a local session: per-State survey, wrappers and OCR (aerodb)

Paste the text below as the first message of a Claude Code session started **on the owner's workstation**, in the `flight_planner` checkout, on branch `v3-aerodb-proc-15`.
It contains no credential: the owner types the EAD Basic password into the tools' prompt (`getpass`) or an environment variable, never into the chat, a file or a commit.

---

You are the **V3 aerodb — procedures** session, running locally. Read first: `CLAUDE.md`, `frame/aerodb/EAD_BASIC.md` (§ 6 to 6 terdecies), `frame/aerodb/DECISIONS.md`
(entries of 25-28 Oct 2026), `tools/proc_ead.py`, `tools/proc_eaip.py`, `tests/v3/cases/aerodb.py` (K6, K10-K13).

## Goal

Procedures (SID / STAR / APP) enter the suite only through aerodb (`proc/<cycle>/<ICAO>.json`, common schema, status `official` / `check` / `ofp`). For every authority of EAD Basic,
find out how its procedures are published and write the **wrapper** that turns one aerodrome's documents into that schema, on demand, in one click (later a Settings › Maintenance button).
Priority of sources: eAIP/EAD tables first, then OFP-seen procedures, then X-Plane / Navigraph as a fallback only.

## What already works

- `python tools/proc_ead.py --survey LA,UD,… --user <name> --out ead_survey` (all: `--survey all`): one line per State, one classified sample (text / vector / image, layout).
- `python tools/proc_ead.py --fetch <ICAO> --user <name> --out proc_work`: one aerodrome, coding documents (or SID/STAR/IAP charts when the State has none) downloaded, layout detected,
  format and geometry guards, `<ICAO>.json`.
- Layouts: `sia-code` (France), `uk-app` (UK 8-xx), `am-coding` (Armenia, split cells; fingerprint to register once seen). Survey of 28 Oct 2026: EG text (STAR tables vector), EB / LO vector,
  LA image, UD text `am-coding`, UB / ED text with unknown layout, LF counts at 0 (headings probably not in English).

## What to do, in this order

1. **Run `--survey all`** (delay 1 s; never faster) and read `ead_survey/survey.txt` / `survey.json`. For each State decide: coding tables in text / only charts / vector / image / nothing; unknown layouts → `--scan-pdf FILE --page 1`.
2. **One wrapper per layout family**, not per State: a function that takes the page rows and returns tables (see `parse_uk_app`, `parse_am_coding`), registered in `detect_layout`, wired in `build_pdf_dir`,
   its fingerprint in `KNOWN_FINGERPRINTS`. Read values **by order and count**, reject a table whose counts disagree, run `check_geometry` (TF legs: recomputed true course ±0.25°, distance ±0.2 NM). Never guess.
3. **OCR for vector / image pages** (decision of the owner, 28 Oct 2026: « OCR inclus »): optional dependency of the workstation builders only, like `pypdf` (never the launcher, never a page), with a clear message
   when missing and a note in `CLAUDE.md` (Python rule) quoting that decision. OCR output is only ever installed through `tools/proc_manual.py`'s geometry gate, status `check`, and every table that fails the gate is dropped and reported.
4. **Tests**: every wrapper gets a K-case in `tests/v3/cases/aerodb.py` built on an **invented** page (invented fixes and co-ordinates, courses computed from them) in the real page's cell order, plus a rejected-table case.
5. **Each lot**: `python tools/format_sources.py <touched files>`, CHANGELOG (English, Unreleased › V3), `frame/aerodb/{EAD_BASIC,DECISIONS}.md`, `python tools/build_docs_bundle.py`,
   `python3 tests/v3/run.py --changed` (replay a failed test alone with `--failed <id>`, then `--failed-scope`), one commit with French gitmoji message and the trailers, `git push` on this branch. **One branch only; do not create others.**

## Hard rules

- The code repository is **public**: never commit AIP PDFs, extracted text, real procedure data, survey outputs (`ead_survey/`, `proc_work/`, caches are git-ignored; keep them so) or screenshots of AIP pages.
  Real data goes only to the private data repository (`proc/<cycle>/`), installed through the tools.
- No credential anywhere: not in a file, a log, a commit message, a test, a fixture. Sanitise outputs before pasting them back (`sanitize` in `proc_ead.py`). The password is typed at the prompt.
- Be gentle with EAD Basic: read-only, spaced requests (`--delay`), no bulk harvesting, one sample per State in the survey, on-demand fetch per aerodrome. Its terms on automated access are unknown; if the site shows a warning, a captcha or blocks, stop and ask the owner.
- No simulated results: if a State cannot be read, say so in the survey and the wrapper's `formats` / `warnings`.
- Never touch `modules/maps/module.js`, `modules/atmosphere`, `frame/aerodb/lab*.js`, `frame/lib/sheet.js` (requests for Maps go in `modules/maps/INTEGRATION.md`). Not develop / master. Never force-push.
- Interface text in four languages through `K.t`; docs in English.

## Report back (short, in this order)

Per State one line (readable / vector / image / none, layout, wrapper done or not); the commits (SHA and summary lines of the V3 gate); what the owner must decide (OCR engine, States to skip).
