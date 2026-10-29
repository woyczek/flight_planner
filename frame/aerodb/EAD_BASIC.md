# EAD Basic: what the owner's access gives, and how it could feed the procedures (25 October 2026)

*Status on 28 October 2026 (user): « EAD eurocontrol, pour le moment, on garde le status-quo. il faudrait probablement un accès payant, on se débrouillera avec un basic pour le moment (et les AIP libres des différents pays) ». No access request; the probe (§ 6) is run by the user when they wish; procedures abroad come from the SimBrief OFP of each flight (step 1) until a free national AIP gives coding tables.*

*The owner has a free **EAD Basic** account. This session connected to nothing: it read only the public pages (help, login page) and
never saw a credential. Facts are marked **read** (public page opened today) or **not known** (visible only after logging in).*

## 1. What EAD Basic is, from the public pages

- **Read** (EAD Basic login page): "EAD Basic is an *advertisement tool* showing the capabilities and functionalities of the EAD
  operational system (EAD Pro). This tool is not connected to the EAD operational database and does not display the latest available
  information for a specific service. Consequently, the information displayed **shall not be used for operational purposes**."
  Operational use means EAD Pro (an EAD Agreement, charged: see `EUROCONTROL_REQUEST.md` § 1).
- **Read** (online help, "Searching for AIPs"): the **AIP Library** filters by *authority* (State), authority type (civil), language
  (EN), AIP type (**AIP, AMDT, SUP, AIC, Charts**), AIP part (**AD, ENR, GEN**) and, in the advanced search, effective date, document
  name and document heading; the result list opens the details of an AIP and its **PDF file**. So the access is a **library of PDF
  documents**, not data sets: no AIXM, no ARINC, no download of a whole eAIP package is described.
- **Not known** until logged in: which States the library holds, how fresh each document is (the login page warns it is not the
  latest), whether the AD 2 pages come as one PDF per aerodrome or per page, and the terms shown on the registration form and
  in the site's terms of use (`eurocontrol.int/articles/terms-of-use` answers 404 from here).
- **Terms of EAD Basic, read by the user and decided (28 October 2026)**: « EAD Basic is an advertisement tool showing the capabilities and
  functionalities of the EAD operational system (EAD Pro). This tool is not connected to the EAD operational database and does not display the
  latest available information for a specific service. Consequently, the information displayed shall not be used for operational purposes. »
  **The user's decision**: a **simulation** use is admitted; the data are **not operational**, and every procedure file read through EAD Basic
  carries that mention (`notice`, written by `proc_records.ead_notice()`, as the CIFP files carry the FAA's); the access is **manual**:
  - the **survey** (the list of documents per State, one sample each, `--survey`) is admitted, run by hand, at least one second between requests;
  - an **aerodrome is read one at a time, on an explicit gesture of the user**: `--fetch <ICAO>` typed by hand today (it refuses a list), a
    gesture in the screens later — **in Fuel** (« Lire les procédures de LFXX », when an aerodrome has none; § 10.20 of the
    specification), then **in the Données module** (its EAD line, « Relire » for an outdated one) — through
    `aerodb.fetchProcedures(icao)`, never in Settings › Maintenance (amended 28 Oct 2026, the ergonomics session). **Wired on 28 Oct 2026**: the gesture
    goes through the launcher job `proc/ead-fetch` (`tools/regen/proc.py`, one four-character code, nothing else accepted); the account is read on the
    workstation only, from `secrets/ead.json` (`{ "user", "password" }`) or `EAD_USER` / `EAD_PASSWORD`, never shown, never logged (every message is
    cleaned of both values) and never sent to a page; the request spacing is the library's one second;
  - **never scheduled, never in bulk**.
- **Rights of the States' AIPs**: each State's AIP stays that State's (the DFS notice, read on 25 October: use "by the organisation to which it
  was issued", no storage or redistribution without permission). What is read through EAD Basic is for personal use, kept in the airline's
  **private** data repository only, never in the public code repository (`LICENSE.md` § 5).

## 2. Can the AD 2 pages of other States feed the procedures?

Same lead as the SIA's eAIP: a page of an aerodrome's part AD 2 that carries the **coding tables** of its RNAV / RNP procedures
(procedure, path terminator, fix, fly-over, course, distance, turn, altitudes, speed). **Nothing below was seen on a real page**;
"suspected" is an inference from the ICAO PBN / Doc 8168 practice and the EU's PBN rules, not a finding.

| State (authority) | Coding tables in AD 2? | What to check on a real page |
|---|---|---|
| France (SIA) | **yes, verified** (lot 2): `AD 2 <ICAO> DATA … CODE` pages | done |
| Germany (DFS) | suspected: its AIXM set carries the legs, the PDF AIP probably codes RNAV procedures in tables | title of the pages, one table per procedure or per runway |
| Belgium (skeyes), Netherlands (LVNL), Switzerland (Skyguide), Italy (ENAV), Spain (ENAIRE), United Kingdom (NATS) | suspected, uneven | whether a table of legs exists at all or only a chart and a text description; whether coordinates are given |
| Others (ECAC) | unknown | same |

What to look for on a first real page (the checklist that decides everything):
1. **Is there a table of legs** (column headers such as *Path terminator*, *Waypoint*, *Fly over*, *Turn*, *Altitude*, *Speed*,
   *Navigation accuracy*) or only a chart with a text description? Text descriptions ("climb straight ahead to 3000 ft, then turn
   right to…") cannot be read reliably and stay out.
2. **Text or image?** pypdf extracts text only; a scanned page is out of reach (no OCR in the suite).
3. **Layout**: one procedure per page or many, page rotated or not, the procedure name above its rows or in a column, one page per runway.
4. **Fix positions**: in the table, in a separate "waypoint list / coordinates" page, or only by reference to the en-route list
   (the SIA's "REF ENR 4.4" case, solved by `AeroDB.coords`).
5. **Amendment date** of the page (the SIA's pages date from 2022 to 2024 inside a 2026 cycle).

## 3. What `tools/proc_sia.py` would become (not written before a real page)

The SIA code is split in two parts that already have the right seam: *rows of text from a PDF* (`rows_from_pdf`) and *table parsers*
(`parse_code_table`, `parse_data01`) producing an intermediate table `{ kind, runways, title, groups: [{ label, legs }] }` that
`records()` turns into the common schema. Adding States means:

- a **layout registry**: one small parser per layout, each returning the same intermediate table, chosen by a **detector** that
  looks at the header words of the page's rows (e.g. the SIA's "Path Terminator / Waypoint Identification / Fly Over");
  an unrecognised page is reported (`warnings: layout not recognised`) and never guessed;
- an input mode `--pdf-dir <folder> --state <XX>` reading PDFs already downloaded (by hand, with the owner's own EAD Basic access),
  instead of the SIA's web addresses; files named by aerodrome (`<ICAO>/…`), the aerodrome's state given or taken from the ICAO prefix;
- the same outputs (`proc/<cycle>/<ICAO>.json`, `index.json` merge), status **`check`**, `source.kind: 'ead-basic'`, `source.ref:
  'ead-basic/<State>/<file>'`, `source.at` = the page's amendment date, and a **notice** in each file naming the State's AIP as the
  source ("not for navigation");
- fixtures = the **text rows** of one page per layout (as for the SIA), and one K case per layout; **no PDF in the repository**.

Order of work once a real page exists: read it, write the detector and the parser for that one layout, test on its rows, publish
nothing until the owner has settled the terms.

## 4. What the owner can do now (the code repository is public: no State PDF goes into it)

The repository `woyczek/flight_planner` is **public** (GitHub Pages is on): an AIP PDF is a State's copyrighted document and
**must not be committed there** — not in `frame/aerodb/test/fixtures/` either (the relay's first suggestion, corrected here). The
data repository is private but outside this session's reach. The way that respects both:

1. On a workstation, with the owner's own EAD Basic login, open **AIP Library**, choose **one State** and **one aerodrome with RNAV
   SID / STAR** (the owner's most flown), filters: *Authority* = the State, *Language* = EN, *AIP Type* = AIP, *AIP Part* = AD.
2. Download, for that one aerodrome: (a) the **AD 2 part of the aerodrome** (all its pages, the whole PDF if it is one file);
   (b) any page whose heading contains **SID, STAR, RNAV, RNP, PBN, coding, waypoint**; (c) the page listing **AD 2.24 charts** (index).
   Do not download charts of other aerodromes.
3. Keep them **on the workstation** (e.g. `ead/<ICAO>/`, not in a clone of the suite).
4. Tell the session the State, the aerodrome and which pages have a table of legs (question 1 of § 2). The session then asks for the
   **text rows of one such page only** (a short excerpt of one table, produced by `rows_from_pdf` on the workstation), the minimum
   needed for a fixture; the owner decides whether quoting it is acceptable under the State's terms.

Sources: [EAD Basic login page](https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/login/ead-basic/), [EAD Basic help — Searching for AIPs](https://www.ead.eurocontrol.int/fwf-eadbasic/public/help/topic/using_aip/searching_for_aips.htm), [EAD (EUROCONTROL)](https://www.eurocontrol.int/service/european-ais-database), [DFS AIP datasets notice](https://aip.dfs.de/datasets/).

## 5. Making it a one-click job (design, 26 October 2026; the owner prefers EAD to DFS and wants "1 click and automation behind")

**What the public login page shows (read):** the login is a plain AJAX form: `POST /fwf-eadbasic/ajaxlogin/ajax_security_check.jspx` with
`j_username` and `j_password`, answered by a small JSON (`loggedIn`, `redirect`); no captcha on the page. A script can therefore open a
session with the standard library (`http.cookiejar`). **Not known** (visible only after login): the AIP Library itself is a JSF / PrimeFaces
screen (form state, partial requests), the one part that needs reverse-engineering, and the file names.

**The click.** In Settings › Maintenance › Aeronautical data (Expert level, launcher only, like "Import a VFR compilation"), a button
**"Update the procedures of other States (EAD)"**. It calls `POST /__setup/proc-ead` on the launcher (the owner's workstation); the launcher
(Python standard library + optional `pypdf`) does, with no console and no file to place:

1. **Log in** with the owner's EAD Basic user name and password, kept in the launcher's **secrets store** (the "Keys and external services"
   card; stored on the workstation only, never served to a page, never in a repository, never in a message or a log).
2. **Search the AIP Library** for each State chosen in a setting (default: the States of the owner's recent flights and home bases),
   AIP part AD, and **download the AD 2 PDFs of the aerodromes** that matter (the owner's aerodromes first; "all" as an option), keeping
   the PDFs in the launcher's local cache only (`data/local/`, never committed, never synchronised).
3. **Read the coding tables** with the layout registry of § 3 (pypdf), write `proc/<cycle>/<ICAO>.json` into the data repository's
   working copy, status `check`, source `ead-basic/<State>`, with each page's own amendment date and a notice naming the State's AIP.
4. **Show the plan, then the result** as the VFR import does: a summary (aerodromes, procedures, pages not understood, files changed),
   and the existing synchronisation publishes. One tap to start, one to confirm; nothing else.
5. Only files that changed (page hash) are rewritten; a page whose layout is not recognised is listed, never guessed.

**Automation later**: the same job at the launcher's start once per AIRAC cycle, with a notification; the phone gets the result through
the usual synchronisation (it never logs in anywhere).

**What blocks it, in the order to lift it:**
1. **EAD Basic's terms on automated access** are unknown (the site calls itself an advertisement tool not for operational use; its terms
   of use page is not reachable from here). A script that logs in and downloads documents is not "browsing". **Ask EUROCONTROL first**
   (`ead.service` at eurocontrol.int, the address the login page gives): draft below. Without an answer the job can still be built, but the
   owner would run an automated login knowingly outside a granted permission.
2. **Layouts**: no State's AD 2 coding table has been seen yet (§ 2). The registry needs one real page per layout, so the job starts with
   the owner's **one State** and grows State by State.
3. **The AIP Library screens**: written against real pages. Two ways, to be chosen by the owner: (a) the owner downloads the § 4 pages once by
   hand (fastest for the first parser), then the click replaces them; (b) the session writes a read-only **probe** (`tools/proc_ead.py --probe`:
   asks for the password at the prompt, never stores it, logs in, opens the AIP Library, saves the **page structure only** (HTML with form
   state, cookies and the user name removed, no PDF) and a list of States and file names) which the owner runs once and whose sanitised output
   they send back, so that the session can write the search and download calls without ever holding a credential. The session never logs in.
4. **Where the click runs**: a workstation with the launcher (and `pypdf`). A phone cannot run it, but receives the result.

**Draft of the question to EUROCONTROL (English):**

> Dear Sir or Madam, I hold an EAD Basic account. I run the private tools of *[name of the virtual airline]*, a non-commercial virtual
> airline. Is it permitted to use my EAD Basic access, with a small script that logs in with my own credentials and downloads, for my own
> use, the AD 2 pages of the AIPs of a few States from the AIP Library, to extract the published procedure tables for a **flight-simulation
> application** (private, not for operational use, shown with the State's name and the label "not for navigation")? If it is not
> permitted, may I ask what would be, short of an EAD Agreement? Kind regards, *[name, e-mail]*

**What I need from the owner to go on** (see the message of 26 October): (1) send or not the question above; (2) probe (b) or manual
pages (a); (3) which State and which aerodrome first.

## 6. The probe (`tools/proc_ead.py --probe`, 26 October 2026: "Sonde, UK, EGGL" — read as the UK and **EGLL**, London Heathrow)

**Run it** on the workstation, from a clone of the suite (Python standard library only, no pypdf, nothing to install):

```
python tools/proc_ead.py --probe --state "United Kingdom" --icao EGLL
```

It asks for the EAD Basic user name and the password (typed, hidden, **never shown or sent anywhere but `www.ead.eurocontrol.int`**;
`EAD_USER` / `EAD_PASSWORD` can stand in for the prompts). The probe and `--fetch` never keep the password: it is typed at the prompt or read from `EAD_PASSWORD`; it is kept, in clear, only in `secrets/ead.json` when the user chose so (the launcher's `proc/ead-fetch` job reads it there), and that folder is git-ignored and must never sit inside a synchronised folder (Synology Drive, OneDrive). It then, read-only: logs in through the login page's own form, follows the home page to
the **AIP Library**, reads its form (lists, buttons), chooses *United Kingdom* / part *AD* / type *AIP* / language *EN* in the lists it
recognises, tries the search (JSF partial request, then a classic submit) and lists the documents found, noting those for EGLL. **It downloads no
PDF and writes nothing outside `ead_probe/`.**

**What it leaves** in `ead_probe/`: `report.txt` (what to send back) and the sanitised pages it received (`01_accueil.html`, `02_bibliotheque.html`,
`03_recherche_*.html`) — kept on the workstation, sent only if the session asks. The sanitising removes the password, the user name, cookies (never
written), the page-state token (`ViewState`), session ids, e-mail addresses and any long token. **Read `report.txt` before sending it**: it contains
the home page's menu, the library's lists (the States offered, with their option values) and the documents' names.

**Send back**: paste `report.txt` in the session (it is text). If the probe stops early ("NON", "lien introuvable", "aucun formulaire"), the
report says at which step and the session adapts; that is expected, the probe was written without seeing the connected screens, and was
tested only against a local copy built from the public login page (case K6). The cost of a failure is a second round, not a risk.

**What the session does with it**: the search and download calls of the one-click job (§ 5, step 2), against the real shapes; then the layout of
EGLL's coding tables once the owner has downloaded that aerodrome's pages by hand (§ 4) or the job fetches them.

## 6 bis. The probe, second round (28 October 2026)

First real run by the owner (United Kingdom / EGLL): login, home page, AIP Library (`aip_overview.faces`, form `mainForm`) and its lists were read; the
partial search answered (56 kB) but the result table was not analysed, and the report printed `ViewState` values. Changes:

- the sanitising also blanks `ViewState` in printed dictionaries and any `number:number` page-state token, and the report masks state fields;
- **the result table is read**: the partial JSF answer's `<update>` fragments are split and every table row (`<tr data-ri>` with its cells) is listed
  with its direct links and the PrimeFaces command-link sources (`PrimeFaces.ab({s:"…"})`) — the shape of the table is assumed from PrimeFaces,
  not seen: the saved sanitised answer `03_recherche_ajax.html` is the fallback;
- `--name EGLL` fills the document-name filter (advanced search) when the form has one and ticks the advanced-search box, reporting what it found;
- `--download` downloads **one** document of the aerodrome (a direct link) into `ead_probe/cache/` — local cache, never committed (`ead_probe/` is
  ignored) — and reports its size and whether it is a PDF; a command link (no direct address) is reported with its source id for the next round.

```
python tools/proc_ead.py --probe --state "United Kingdom" --icao EGLL --name EGLL --download
```

Send back the same way (`report.txt`, read first). Tested on a hand-built partial answer and a local fake (case K6): it checks the probe's logic, not
EAD's real screens, which is what this round settles.

## 6 ter. The probe, third round (28 October 2026): the real screen, as described by the owner

What the owner's two captures showed (relayed): the search *United Kingdom / AD* returns **1,155 documents on 16 pages** (PrimeFaces datatable, no
"show all", and the page numbers move while navigating: **the probe never walks the pages**). The *Advanced Search* box
(`mainForm:enableAdvancedSearch_input`) opens three fields: *Effective Date* (`dd/MM/yyyy`), **Document Name** and *Document Heading*. With Document
Name = `EG_AD_2_EGLF_8-1_en.pdf`, a single row: "AD 2 EGLF 8 INSTRUMENT APPROACH CHART ILS/DME RWY 06 - ICAO", effective 2026-01-22, eAIP column empty,
AIRAC = NON-AIRAC, and one ▶ button per row (the download). File names follow `<prefix>_AD_2_<ICAO>_<section>-<n>_en.pdf` (6-x SID, 7-x STAR
presumed, 8-x IAC, 2-x aerodrome charts, 4-x zones, 5-x MSA).

What the probe now does with `--name EG_AD_2_EGLL`:

1. ticks Advanced Search through a JSF partial request (event `valueChange`, then `change`) and reads the fields that appear by their **labels**
   (not by guessed ids): Document Name is the field labelled so;
2. searches that name, then the same without its two-letter prefix (`AD_2_EGLL`): it **says whether the field means "contains" or "starts with"**;
3. if the prefix finds nothing, it **enumerates exact names** `EG_AD_2_EGLL_<s>-<n>_en.pdf` (s 1 to 8, n 1 to 9, stopping at the first empty one in each
   section: at most about 8 + the number found requests);
4. lists the rows (date, name, eAIP, AIRAC, title, the ▶ button's id and name) and the pager text, and writes the `<table>` of the results, sanitised,
   to `ead_probe/tables.html` (what to paste if the session asks for the exact HTML);
5. with `--download`, presses the ▶ button of the first EGLL row (a classic form submit carrying that button, as a PrimeFaces download button does) and keeps
   **one** PDF in `ead_probe/cache/` if the answer starts with `%PDF-`; otherwise it reports the beginning of the answer (sanitised).

The page state (`ViewState`) is renewed from each answer, as JSF requires. A defect found by the test of this round, present since the second round:
the loop over the lists reused the variable holding `--name`, so the filter silently took the name of the last list; fixed.

```
python tools/proc_ead.py --probe --state "United Kingdom" --icao EGLL --name EG_AD_2_EGLL --download
```

## 6 quater. The probe, fourth round (28 October 2026): the third run's report

**Read in the owner's report** (EAD Basic account, United Kingdom): the AIP Library is `…/restricted/user/aip/aip_overview.faces`; its form `mainForm` has the lists
`selectAuthorityCode` (47 States by ICAO prefix; **EG = United Kingdom**), `selectAuthorityType` (Civil), `selectLanguage` (EN), `selectAipType` (AIP, AMDT, SUP, AIC, Charts),
`selectAipPart` (GEN, ENR, AD), the box `enableAdvancedSearch_input` and the buttons `querySearch` and `reset`. The plain search (State + AD) answered 56,682 bytes and
**65 table rows**. The advanced-search box **opened by partial request** and revealed, found by label: `effectiveDate_input`, **`documentName`**, `documentHeader`.

**What failed**: every search by Document Name (`EG_AD_2_EGLL`, `AD_2_EGLL`, the eight exact names) answered 200 with **0 rows and no pager**, while the same name typed in the
browser gives one row. The probe's request differs from the browser's in a way it could not name: it printed neither the answer nor what it had sent.

**Fourth round** (read-only as before): for the plain search and for every name search that finds nothing, the report now prints the **answer's anatomy** (size, each
updated component with its size, errors, redirection, messages shown, or its first 160 characters) and the **names of the parameters sent**; a **control** (search with
no name, after the box was opened) tells whether opening the box itself broke the form; and the probe tries **four request shapes** in turn — execute and render `@all`
(the previous one), execute `@form`, execute the fields + button and render only the component(s) that carry the rows (identified in the plain search), and the whole form
— keeps the first that returns rows and uses it for the prefix test and the exact-name enumeration.

**If it still finds nothing — the most reliable help** is the browser's own request, once, for the same search: in the browser's developer tools (F12), tab *Network*, keep
the log, fill *Advanced Search / Document Name* with `EG_AD_2_EGLL`, press *Search*, click the `aip_overview.faces` request (method POST) and copy its **Form Data** (the
list of `name: value`), **replacing the value of `javax.faces.ViewState` by `x`**; no cookie, no header, no password is needed. That list is what the probe must reproduce.

## 6 quinquies. The probe, fifth round (28 October 2026): what the fourth run's report proved

**The "65" and "68 rows" were not results.** They were the `<tr>` of the page's own layout tables (the lists' options: "Albania (LA)", "Armenia (UD)"…, the labels
"Effective Date", "Document Name"…). The real answer, at the end of the same report: **"Number of search results: 0 — No data found."** So no search of the previous runs
ever ran as the browser's does, the plain one (State + AD) included; and opening the advanced box with `execute=@all` ended in the server's error page
(`error.faces?msg=http.error.unknown`). What the report did prove: the data table is `mainForm:searchResults` (its parameter `searchResults_selection` is sent), and the
request shape `execute=@form` is accepted (it answered a full page where `@all` answered an error).

**Changes, from that evidence:**
- **results are read only from the data table** (`<tbody id="…searchResults_data">`) and the announced count ("Number of search results: N" / "No data found.") is printed
  with every search: a layout table can no longer pass for results, and the enumeration of exact names now runs when the count is zero;
- **every list is sent, as the browser does**: those the probe does not choose get their default (or *Civil* for the authority type; the previous requests lacked
  `selectAuthorityType_input`); the first request shape is now `execute=@form` (PrimeFaces' default for a command button);
- **the State selection's own event is replayed** (`valueChange`, then `change`) before searching, since the lists are linked server-side, and its answer is described.

**Still asked of the owner if this fails**: the browser's own requests, as in § 6 quater, for the three steps — choosing *United Kingdom*, ticking *Advanced Search*, then *Search*
with a Document Name — each request's Form Data (`javax.faces.ViewState` replaced by `x`). They settle what the probe cannot guess.

## 6 sexies. First success (28 October 2026): the document of EGLL, downloaded

**Result of the owner's run on the fourth-round probe** (United Kingdom, EGLL): the search by Document Name `EG_AD_2_EGLL` returned **one document, "AD 2 EGLL"**, and `--download`
fetched it: `EG_AD_2_EGLL_en.pdf`, a **PDF of 3,038,627 bytes** (the whole AD 2 part of the aerodrome in one file), kept in the owner's `ead_probe/cache/` only. Established:

- **The request shape that works** is the whole form: `javax.faces.partial.execute=mainForm`, `javax.faces.partial.render=mainForm`, `javax.faces.source=mainForm:querySearch`, with every list sent
  (authority `EG`, authority type `C`, language `EN`, AIP type `AIP`, part `AD`), `mainForm:enableAdvancedSearch_input=on` and `mainForm:documentName=<name>`. The other shapes
  (`@all`, `@form`, targeted) found nothing or an error page. It is now the probe's first shape.
- **Document Name is a "contains" filter** (`EG_AD_2_EGLL` and `AD_2_EGLL` both give the one row).
- **The download is a direct link** of the row, `/fwf-eadbasic/aip/redirect?link=…`, fetched with the session (no button press needed).
- **The AIP type matters**: with type *AIP* the aerodrome has this one document; the charts seen in the owner's captures (`EG_AD_2_EGLF_8-1_en.pdf`, "INSTRUMENT APPROACH CHART") are
  listed under type **Charts** (not searched yet).
- The row's "eAIP" cell carries the text "IB-903: File not found" (no eAIP link for this document): harmless.

**Next** (nothing to download again): look inside the PDF for coding tables with `python tools/proc_sia.py --scan-pdf ead_probe/cache/EG_AD_2_EGLL_en.pdf` (needs `pypdf`). It reports, page
by page, **titles and keywords only** (Path Terminator, Fly Over, Coding, Waypoint Identification, SID, STAR, RNAV, RNP, Approach), copies no content, and lists the pages that probably carry a table of legs. The owner
pastes that report; the session decides from it whether this document holds coding tables (then the layout parser follows, on text rows of one page) or only charts (then the *Charts* type is searched).

**Branches** (owner's request, 28 October): all further work on this topic goes onto **one branch**, `v3-aerodb-proc-15`; the older ones are deleted when GitHub lets the session do it.

## 6 septies. First scan of the EGLL document (28 October 2026)

`--scan-pdf` on the downloaded `EG_AD_2_EGLL_en.pdf` (41 pages, UNITED KINGDOM AIP, AD 2.EGLL-1 to -41): **no page has "Path Terminator", "Fly Over" or "Waypoint Identification"** (0 each), so
this part holds **no table of legs in the SIA's form**. The word "Coding" appears on pages 40 and 41 only (with SID, STAR, RNAV, RNP, Approach); pages 26–30 and 11–13 mention approaches and
procedures (the textual AD 2.22 "flight procedures" section). The scan now also prints the few lines with a coding word on those two pages, which decides whether they describe a coding
table, name the document where the coded data is published, or only state a rule. Charts (SID / STAR / IAC drawings) are a separate document type, *Charts*.

## 6 octies. The UK document does hold coding tables (28 October 2026)

The scan's coding lines on pages 40 and 41 of `EG_AD_2_EGLL_en.pdf`: **"STANDARD INSTRUMENT ARRIVAL CODING TABLES"** (the STARs, e.g. OTMET 1H, ROXOG 1H, ALESO 1H, TANET 1Z, SIRIC 1H…),
**"RNAV HOLD CODING TABLES"** (BIG, BNN, BRASO, FITBO, HON, LAM, LOGAN…) and **"INSTRUMENT APPROACH PROCEDURE CODING TABLES - RNP RWY 09L/R and 27L/R"**. So EGLL's AD 2 carries
STAR and RNP coding tables, but **not under the SIA's header words** (no "Path Terminator"): its layout is its own. No SID table was seen (the SIDs are in the charts). The layout is now read page by page:
`python tools/proc_sia.py --scan-pdf FILE --page 40` prints that page's text rows (numbered, 160 characters, 90 rows), the very rows the analysers would read; the owner pastes pages 40 and 41 here (a UK AIP
excerpt in the session only, never in the repository). The UK layout parser, a second entry of the layout registry (§ 3), is then written on them.

## 6 nonies. Pages 40–41 of the UK document, read (28 October 2026): the coding tables are separate *Charts* documents

The owner put `EG_AD_2_EGLL_en.pdf` in the session; pages 40 and 41 are **the index of the charts of AD 2.24** (a list of chart titles with their numbers), not tables. It tells where
the coding tables are — **each one is a document of its own**, of type *Charts*, numbered `AD 2.EGLL-<section>-<n>`:

| Number | Title (as listed) |
|---|---|
| 7-13 to 7-17 | STANDARD INSTRUMENT ARRIVAL CODING TABLES (OTMET 1H, ROXOG 1H, ALESO 1H, LAM 1X · TANET 1Z, OCK 1Z, NUGRA 2H, LAM 1Z · HON 2H, BARMI 1H, LOGAN 2H, TOBID 1X · HAZEL 1H, BIG 1Z, LAM 1Y, FITBO 2H · SIRIC 1H, SIRIC 1Z) |
| 7-18, 7-19 | RNAV HOLD CODING TABLES |
| 8-13 | INSTRUMENT APPROACH PROCEDURE CODING TABLES - RNP RWY 09L/R and 27L/R |
| 6-1 to 6-6 | the SIDs: charts only ("RNAV SUBSTITUTION ONLY"), **no SID coding table** |

By the library's naming, these are `EG_AD_2_EGLL_7-13_en.pdf` … `EG_AD_2_EGLL_8-13_en.pdf`. The probe reaches them with the AIP type *Charts*:

```
python tools/proc_ead.py --probe --state "United Kingdom" --icao EGLL --aip-type Charts --docs EG_AD_2_EGLL_7-13_en.pdf,EG_AD_2_EGLL_7-14_en.pdf,EG_AD_2_EGLL_7-15_en.pdf,EG_AD_2_EGLL_7-16_en.pdf,EG_AD_2_EGLL_7-17_en.pdf,EG_AD_2_EGLL_8-13_en.pdf
```

(`--docs` searches each exact name and downloads its row's document into `ead_probe/cache/`, named after it; nothing else is downloaded.) Then `python tools/proc_sia.py --scan-pdf ead_probe/cache/EG_AD_2_EGLL_7-13_en.pdf` and
`--scan-pdf … --page 1` show what those pages look like, and the UK layout (a second entry of the registry, § 3) is written on that evidence.

## 6 decies. Checking the format of the pages by script (the owner's request, 28 October 2026)

« On voit les limites de ces parsers : les formats peuvent changer. Il faudra prévoir une vérification du format des pages par script. » Done for the SIA's layout, and the frame every future layout enters:

- **Before reading** a page, `detect_layout` names its layout (`sia-code` today) from its header words, wherever they fall on the page; no known layout → the page is **not read** (never guessed) and reported.
- **After reading** it, `verify_page` checks that the parser took what the page carries: at least **85 % of the leg rows** were read, groups and a kind (SID / STAR / APP) were found. A column added, a header reworded to the point of
  breaking the cells, a page turned the other way: refused and listed (`page NON lue, format à vérifier`) instead of giving wrong legs.
- **Header fingerprint** (`fingerprint`): the words of the header lines, hashed. The three fingerprints of the pages seen (LFBD SID / STAR, LFBD RNP, LFAV RNP) are known; a different one is reported as *info: en-tête inconnu*
  (not blocking when every leg was still read): the early sign that a format moved.
- **Each aerodrome file** now carries `formats`: [{ file, layout, fingerprint, ok, problems }] next to `pages`; the builder prints a line per page and a summary of the refused ones.
- **`--check`** runs the whole reading without writing anything and exits with 1 if a page is refused: to run **before each publication** (every AIRAC cycle), since the eAIP changes under it.
- Tests (K3): the five real pages pass; a reworded header is *info* only; a widened table is refused; a page without a header is refused; an aerodrome file with a refused page has no procedure and says so.
Not caught by design: text lost from a page (the parser cannot know what is missing); the guard catches a layout that moved, not a page that was cut.

## 6 undecies. The five coding documents uploaded by the owner (28 October 2026)

The owner uploaded `EG_AD_2_EGLL_7-13` … `7-17` (STAR coding tables) and `8-13` (RNP approach coding tables) to the session; they stay out of the repository.

**8-13 — readable, and read.** It has a real text layer (243 text operations). Layout of the UK coding table: designator, sequence number, path terminator, waypoint name, fly-over, turn direction, level
constraint, speed constraint, co-ordinates, remarks (and distance to the MAPt), course/track °M (°T); a leg's **latitude and magnetic course are on the line before it, its longitude and true course on the line after**.
The new reader (`parse_uk_app`, layout `uk-app`) takes the four RNP approaches (09L via ABAVI, 09R via BENPA, 27L via NEKSA, 27R via IVLAR): IF, FAF, MAPt (`RW…`) and the `CA` leg (course to altitude, no fix: left out, reported).

**7-13 … 7-17 — not readable by a script.** They are one page each whose table is **drawn as vector outlines**: about 40,000 path operations and **4 text operations** (only the header and the
footer); no text layer, no image. `pypdf` returns three lines. The page is plainly legible to a human (and to a model reading the picture): designator, sequence, path terminator, waypoint, co-ordinates, fly-over,
course °M (°T), magnetic variation, distance, turn direction, level, speed, navigation performance (RNAV1 / RNAV5). The probe's page check reports it as *very little text: drawn in vectors or an image?*.

**The geometry check** (`check_geometry`), the answer to "formats change, check by script" for any table, whoever read it: for each TF leg the **true course and the distance recomputed from the two fixes' co-ordinates must equal
what the page prints** (tolerance 0.25° and 0.2 NM). Tried on the first STAR table (OTMET 1H, read from the picture): six legs, courses within 0.1° and distances within 0.05 NM of the printed values. An error in a digit of
a co-ordinate, whether made by OCR, by a person or by a model, moves a course or a distance and is caught; a table that fails is **not kept**.

**What to do about 7-13 … 7-17** (three ways, the owner chooses):
1. **OCR on the workstation** (optional dependency, like pypdf): reads any page drawn as outlines or images, fully automatic and one click, the geometry check catching the misreadings. It is a *new* dependency beyond
   `pypdf` (CLAUDE.md allows only `pypdf`): needs the owner's word and an amendment. Candidates: Tesseract (a program to install) or a pure-pip engine.
2. **One-off transcription** of EGLL's seventeen STARs from the pictures by the session, every table passing the geometry check, kept as a *manual interpretation* file in the private data repository with the hash of the page it
   came from (when the page changes, the file is flagged obsolete, as the VAC interpretations are). No dependency, but not automatic: redone by hand at each amendment of those pages.
3. **Leave the UK STARs out**: for a flight the STAR of the SimBrief OFP already gives its fixes (lot 1), and 8-13's RNP approaches are read.

`python tools/proc_sia.py EGLL --pdf-dir <folder of the downloaded PDFs> --cycle 2026-10-01 [--check]` reads every PDF of a folder: a known layout is read, an unknown or text-less one is reported (`NON`), never guessed;
`--check` writes nothing and exits 1 if a page is refused. (Tested here on 8-13 and 7-13 together: 4 procedures read, 7-13 reported.)

## 6 duodecies. The UK STARs of EGLL, read from the page images (28 October 2026)

The owner's aim for now: **show the chain of fixes and the speed / level constraints, as the airways are shown** (a polyline of named points), not the full leg model. The turn direction is kept as information only: on a TF
(track-to-fix) leg the line is straight between the two fixes whatever the turn, so it does not change the drawing; it matters only for legs that curve (DF, RF), which the UK STAR tables do not use.

The five STAR documents (7-13 to 7-17) have no text layer, so the session **read the 18 tables from the page images** (OTMET 1H, ROXOG 1H, ALESO 1H, LAM 1X · TANET 1Z, OCK 1Z, NUGRA 2H, LAM 1Z · HON 2H, BARMI 1H, LOGAN 2H, TOBID 1X ·
HAZEL 1H, BIG 1Z, LAM 1Y, FITBO 2H · SIRIC 1H, SIRIC 1Z) and checked each with the geometry check: **all 61 legs agree** (true course within 0.25°, distance within 0.2 NM, the printed values recomputed from the co-ordinates).
With the four RNP approaches read from `8-13`, that is **22 procedures, 91 points**: `EGLL.json`, status `check`, source `ead-basic/UK/<file>`, level constraints "at" (the tables print levels without a sign), speeds as maximum IAS
(the tables print "-250", "-220"), turn direction `L` / `R`, `nav` RNAV1 / RNAV5.

`tools/proc_manual.py EGLL.json --out <data repository>/proc` re-runs the geometry check, refuses any procedure that fails, writes `proc/2026-10-01/EGLL.json` and merges the cycle's index. The file is **not in this public repository**
(it carries the UK AIP's data): the session sends it to the owner, who installs it in the private data repository. aerodb reads it unchanged (checked: 18 STAR, 4 approaches, index entry, every point placed).
When the UK reissues pages 7-13 to 7-17 the file must be redone: the page's amendment date (`source.at`, 2025-12-25) tells whether it is out of date. OCR (§ 6 undecies, option 1) would make this automatic.

### 6 terdecies. Automation: per-State survey and on-demand fetch (28 Oct 2026)

The owner's question: how to automate the retrieval of these documents aerodrome by aerodrome (on demand), and do the exercise for every EAD authority. Two commands now sit on the proven request shape
(`EadLibrary` in `tools/proc_ead.py`: login, AIP Library, advanced search, State list replayed, name and heading filters, ViewState renewed, download from the row link):

- `python tools/proc_ead.py --survey all --out ead_survey` (or `--survey EG,ED,LF`): for each State, the number of AD documents and charts, the number of charts whose heading says CODING / DEPARTURE / ARRIVAL / APPROACH,
  and **one** coding document (else a STAR, else a SID) downloaded and classified (`text` / `vector` / `image` / `sparse`, layout, fingerprint). Output: `survey.txt` (one line per State, to paste back) and `survey.json`.
  Requests are spaced by `--delay` (default 1 s); the password is asked at the prompt or read from `EAD_PASSWORD`; it is kept, in clear, only in `secrets/ead.json` when the user chose so (git-ignored; that folder must never sit inside a synchronised folder such as Synology Drive or OneDrive).
- `python tools/proc_ead.py --fetch EGLL --out proc_work [--manual-dir DIR]`: the on-demand job for one aerodrome: charts named `AD_2_<ICAO>_` per heading keyword, coding documents downloaded to the local cache, each
  one read when its layout is known (format and geometry guards), reported when it is not (nothing guessed), a hand-read `<ICAO>.json` from `--manual-dir` added for vector pages. Result: `<ICAO>.json` with `procedures`,
  `formats`, `warnings` and `documents` (chart names and headings, for the PDF reader).

Not done yet: the Settings › Maintenance button that launches `--fetch` from the page (§ 5), the layouts of States other than FR / UK, OCR for vector pages. The survey tells which layouts exist before any parser is written.
Whether EAD Basic's terms allow automated access is still unanswered; the owner kept the status quo (a Basic account, spaced requests, read-only).

**Paging, seen on the real screen (29 Oct 2026).** The PrimeFaces page change (`mainForm:searchResults_pagination=true`, `_first`, `_rows=15`, `_skipChildren=true`, `_encodeFeature=true`, source / execute / render = the table, the whole form sent, ViewState renewed) is accepted and answers with an `<update id="mainForm:searchResults">` holding only the bare `<tr data-ri=…>` rows of that page (no table body): `page_rows` reads them; the walk stops at the announced count, on an error or redirect, or after 50 pages, 1 s between pages (EIDW: 22 approach documents in 2 pages).

## 6 quaterdecies. Probe run by the user on the workstation (28 October 2026, United Kingdom / EGLL)

Login page 200; login **yes** (200, `home.faces`); home page read with its links (Pre-Flight Briefing, AIP Library,
SDO Reporting, Prepare my Flight, User Profile, Help); AIP Library reached (`aip_overview.faces`, 200) and its form
read: `mainForm` with the lists *Authority* (47 States, ICAO prefix: EB, ED, EG, EH, EI, LE, LF, LI, LS… and non-ECAC
ones such as OJ, RP, UA), *Authority type* (Civil), *Language* (EN), *AIP type* (AIP, AMDT, SUP, AIC, Charts), *AIP part*
(GEN, ENR, AD), buttons Search / Reset; the partial JSF search answered 200 with 56 KB; **documents found: 1, EGLL not
identified** in it: the result rows are not parsed yet (the next iteration of the probe needs the structure of the result
table: a `--dump` of the sanitised result page). The report printed the JSF `ViewState` values: the sanitiser must blank
them too. Conclusion: the one-click chain is feasible with the standard library and the Basic account; next steps, in
order: parse the result list, list the AD 2 pages of one aerodrome, download **one** page into the local cache only,
then the layout registry on it.

### 6 quaterdecies.1 What the user saw in the AIP Library (28 October, two screenshots)

- « United Kingdom / AD » returns **1 155 documents on 16 pages** (PrimeFaces datatable, no « show all »); the page numbers
  shift while browsing: a probe must not page through the list.
- **Advanced Search** (checkbox) adds *Effective Date* (`dd/MM/yyyy`), *Document Name* and *Document Heading*. With
  *Document Name* = `EG_AD_2_EGLF_8-1_en.pdf` the search returns one row: « AD 2 EGLF 8 INSTRUMENT APPROACH CHART ILS/DME
  RWY 06 - ICAO », effective 2026-01-22, eAIP column empty, AIRAC = NON-AIRAC, a ▶ button per row (the download).
- Naming seen: `<prefix>_AD_2_<ICAO>_<section>-<n>_en.pdf` (2-x aerodrome charts, 4-x zones, 5-x MSA, 6-x SID,
  7-x STAR presumed, 8-x IAC). The probe can therefore **index by document name** (prefix `EG_AD_2_EGLL`, or the sections
  enumerated) instead of paging. The user kept the saved results page (`Downloads\EDA Basic - EUROCONTROL…`) with its linked
  files, if the table's HTML is needed.


## 7. OCR for drawn pages (28 Oct 2026)

Some EAD Basic AIP pages are drawn as vector outlines or images: they have no text layer and `pypdf` returns nothing. Owner decision of 28 October 2026, "OCR inclus": OCR becomes an optional dependency of the workstation builders only (never the launcher, never a page), like `pypdf`, with a clear message when it is missing.

`tools/proc_ocr.py` does three things. `render_page` rasterises a page with `pypdfium2` (300 dpi by default). `ocr_words` reads the image with one of two backends, detected at run time: `tesseract` (the program on `PATH`, word boxes from its TSV output) or `rapidocr-onnxruntime` (`python -m pip install rapidocr-onnxruntime`; it gives line boxes, each kept as one "word"). `rows_from_words` groups the words into text rows by vertical centre and sorts them by x, producing the same kind of rows as `proc_pdf.rows_from_pdf`, so the layout detection and the parsers are shared. `--deps` tells which backends are present.

Both engines are supported; since 28 October 2026 `pypdfium2` and `rapidocr-onnxruntime` are installed in the workstation Python (`tools/proc_ocr.py --deps` reports both present, Tesseract absent).

The geometry check: OCR output is never trusted. `document_from_rows` runs the usual layout detection and parser, then drops every table whose printed true course and distance disagree with its own co-ordinates (a misread digit), reports it as "NON retenue", and marks the file `via: 'ocr'`, status `check`. The written `<ICAO>.ocr.json` is installed only through `python tools/proc_manual.py <file> --out <data repo>/proc`, which repeats the geometry check. The SIA coding layout is read by the eAIP builder, not by OCR; an unknown layout is reported, never guessed.


### 7.1 Real trial and layouts read through OCR (28 Oct 2026)

- **Trial** on the owner's workstation, in a scratch virtual environment (nothing installed in the system Python): `rapidocr-onnxruntime` 1.2.3 + `onnxruntime` 1.31.1 + `pypdfium2` 5.14.0 work on Python 3.14.7 (the package name `rapidocr` >= 3 is also accepted). Tesseract was not tried (not installed). Cost: about 5-10 s per page at 300 dpi, engine load included.
- **Control**: the UK approach coding page already read through the text layer (`uk-app`) gives, through OCR at 300 and 400 dpi, the same 4 tables and 12 legs, geometry check clean; at 200 dpi one table is lost. Use 300 dpi or more. Only the fly-over flag ("Y") is not read: it stays `None`, with one warning per table.
- **Row grouping**: words are grouped by vertical centre, tolerance 0.4 x the median word height. Per-layout normalisers repair known defects: a missing sequence number, and letters O / I read as 0 / 1 in co-ordinate cells only (never elsewhere).
- **Output**: a manual-interpretation document `<ICAO>.ocr.json` (points with `trk` and `nm`); only `tools/proc_manual.py` installs it, after its geometry check (status `check`, source reference prefixed `ocr:`). Every table failing the geometry check is dropped and listed in `formats.problems`.
- **CLI**: `--deps`, `--page`, `--dpi`, `--engine`, `--icao` / `--cycle` / `--out`. Case K14 (fake word boxes; the backend-missing message is tested).
- **Layouts only reachable through OCR**:
  - `uk-star` (`parse_uk_star`): the UK "Standard Instrument Arrival Coding Tables", vector pages. Three-line leg form as in `uk-app` (latitude and magnetic course before; leg row with designator, sequence, path terminator, waypoint, distance, magnetic variation, turn direction in words, level, speed, RNAVn; longitude and true course after). On the five EGLL STAR documents: 18 tables, 79 legs (18 IF + 61 TF), 0 rejected by the geometry check - the same 61 TF legs as the hand transcription of § 6 duodecies, now automatic. Case K16 on an invented page.
  - `at-coding` (`parse_at_coding`): Austria, "RNAV Transition Coding Table of ..." on the RNAV arrival charts, vector pages; compact co-ordinates (hemisphere letter + digits and decimals), fly-over yes / no. On the LOWG chart pages 2-3: 2 tables per page (7 and 6 legs), 0 rejected. Runways come from the page's "TRANSITION to RWY ..." line (whole page, not per table). Case K17 on an invented page.

- **Installation and multi-resolution re-read (owner: « Oui, OCR EB et UG »)**: `python -m pip install pypdfium2 rapidocr-onnxruntime` in Python 3.14.7. `proc_ocr.read_document` re-reads a page at 300, then 500, then 200 dpi while it is not fully read and keeps the best reading (at 300 dpi one runway-point line of the Belgian list was lost and the geometry check rejected the table; 500 dpi read both tables). `OCR_LAYOUTS` lists the layouts readable through OCR: `uk-app`, `uk-star`, `am-coding`, `at-coding`, `ei-coding`, `be-coding`, `ge-coding`. `tools/proc_ead.py --fetch` runs `ocr_pass` on documents whose pages are all unknown and drawn, writes `<ICAO>.ocr.json` and prints what was read, what the geometry check dropped and the `proc_manual.py` command; without an engine it prints the install message and goes on (K12).
  - `be-coding` (Belgium, IAC page): ARINC coding table drawn in vectors; columns sequence, path terminator, waypoint, role, fly-over, true course, turn, altitude constraint, speed, vertical path angle; no distance nor magnetic course. A "WAYPOINTS COORDINATES" list in degrees and decimal minutes is read by `be_coords` (also used by `waypoint_coords` for text pages). On the EBBE sample: 2 APP tables, 10 legs each, 20 of 20 points resolved from the list, geometry check clean.
  - `be-coding` SID / STAR variant (EBBE SID chart): the page prints a true course for only some TF legs and no distance, so a SID table is kept, with the warning "cap non imprimé : géométrie non contrôlable", only if every point is resolved from its own co-ordinate list (a point listed twice on the page must have identical co-ordinates), the first leg is IF or CF, all legs are IF / TF / CF / DF and every course that is printed passes the geometry check; otherwise it is dropped. On the real EBBE page the three IAC / SID documents give 6 tables, 5 kept; the one dropped (IAC 21, RWY 22L approach) is a printed value (40.0 deg) that the printed co-ordinates contradict (38.8 deg), read identically at 200, 300, 400 and 500 dpi, so it is a print inconsistency, not an OCR error: the geometry check tolerance is never widened.
  - `ge-coding` (Georgia, "RNAV Transition Coding Tables - RWY nn - ILSz"): one-line legs with degrees-minutes-seconds co-ordinates. On the UGKO sample: 2 APP tables (one per transition), 2 legs each, geometry check clean; the holding table is left out by design.
  - Limits: single-letter cells (fly-over Y/N, turn L/R) are lost by the OCR, so `over` and `turn` stay `None` on OCR-read pages; the geometry check verifies true courses and printed distances only, altitude and speed constraints are not verified; points come from the OCR, not from an official base. K14 covers a Belgian invented page, a list in degrees-minutes and a corrupted list co-ordinate (table dropped).

Out of scope: OCR of chart drawings (image-only charts such as Albania's). Only tables are read.

## 8. Layouts seen per State (28 Oct 2026)

Survey of all 47 authorities run by the owner (one sample per State, delay 1 s).

| Group | States | Sample and reading |
|---|---|---|
| Read, known layout | UD, ED, EG, BI, EY, LI, LD, LA, RP, EI, LO, LZ, LU, LP, EP, EB, UG (17); EB `be-coding` via OCR (IAC page, ARINC table, list in degrees-minutes); UG `ge-coding` via OCR (RNAV transition coding tables, degrees-minutes-seconds) | UD `am-coding`; ED `de-route`; EG text `uk-app` + vector `uk-star` via OCR; BI `icao-tab` (6+5 STAR tables, kind carried from page 1 to 2); EY `icao-tab` (4 tables, 18 legs, co-ordinates from the list on page 3); LI `icao-tab` (page 3, 4 tables, 11 legs, list on the same page); LD vector page 1, text pages 2-4 `icao-tab` with a Route column, list on page 5; LA image page 1, page 2 shifted-glyph font decoded, `icao-tab`; RP vector page 1, pages 2-3 shifted-glyph font decoded, route table + list + `icao-tab`; EI `ei-coding` (page 2, 7 blocks, 6 read, 32 legs, geometry check clean, 1 rejected for a name split by the text layer); LO `at-coding` (pages 2-3, 2 tables per page, 7 and 6 legs); LZ `at-coding` (pages 2-4, 3+3+1 tables, 28 legs, geometry check clean); LU, LP, EP `de-route` widened (page 2; 5, 7 and 4 STAR tables, no co-ordinates) |
| Charts only, no table in the sample | UB, EK, EE, XX, BG, LH, LJ, EH, ES, EV, LY, UK, LK, LM, LR, EF (16) | XX: files named EK_, label recorded; LK: VFR chart, 686,000 path operations (pypdf stream limit raised); LM: VFR strings; LR: aeronautical data tabulation, waypoint list only; EF: omnidirectional departures and obstacles only |
| Image only | LQ, LG (2) | not readable |
| Prose route descriptions, no table, no co-ordinates | EN, OJ, LE (bilingual), LC, LW, LS, BG Greenland (7) | not parsed by design: nothing the geometry check can check |
| Outdated edition | LF (1) | EAD sample is a 2015 SIA "PRECODING" edition (older `sia-code`, "Leg sequence / P/T / ID" header, chart text in a /MTnn glyph font): not parsed; France comes from the SIA's own eAIP through `tools/proc_sia.py` |
| Nothing obtained | BK (no files), LB and LT (no coding / SID / STAR headings, IAP charts only), UA and UC (download failed: rows without a direct link) (5) | |

### 8.1 One State per line, and what follows (ergonomics session's decision, 28 Oct 2026)

| State | Outcome | Reading |
|---|---|---|
| UD | read | `am-coding` |
| ED | read | `de-route` |
| EG | read | `uk-app` (text) and `uk-star` (OCR) |
| BI | read | `icao-tab` |
| EY | read | `icao-tab`, co-ordinates from the list |
| LI | read | `icao-tab` |
| LD | read | `icao-tab` with a route column |
| LA | read | `icao-tab` (shifted-glyph font decoded) |
| RP | read | route table + list + `icao-tab` (shifted-glyph font decoded) |
| EI | read | `ei-coding` |
| LO | read | `at-coding` |
| LZ | read | `at-coding` |
| LU | read | `de-route` |
| LP | read | `de-route` |
| EP | read | `de-route` |
| EB | read | `be-coding` (OCR) |
| UG | read | `ge-coding` (OCR) |
| LQ | charts as images | no text to read |
| LG | charts as images | no text to read |
| UB | scattered labels | charts only: labels, no table |
| EK | scattered labels | charts only: labels, no table |
| EE | scattered labels | charts only: labels, no table |
| XX | scattered labels | charts only: labels, no table |
| LH | scattered labels | charts only: labels, no table |
| LJ | scattered labels | charts only: labels, no table |
| EH | scattered labels | charts only: labels, no table |
| ES | scattered labels | charts only: labels, no table |
| EV | scattered labels | charts only: labels, no table |
| LY | scattered labels | charts only: labels, no table |
| UK | scattered labels | charts only: labels, no table |
| LK | VFR only | VFR charts or strings only |
| LM | VFR only | VFR charts or strings only |
| LR | points only | lists of points, no procedure table |
| EF | points only | lists of points, no procedure table |
| EN | prose | route descriptions in text, no co-ordinates |
| OJ | prose | route descriptions in text, no co-ordinates |
| LE | prose | route descriptions in text, no co-ordinates |
| LC | prose | route descriptions in text, no co-ordinates |
| LW | prose | route descriptions in text, no co-ordinates |
| LS | prose | route descriptions in text, no co-ordinates |
| BG | prose | route descriptions in text, no co-ordinates |
| LF | from the SIA | France comes from the SIA's own eAIP (`tools/proc_sia.py`), never from EAD (EAD's sample is a 2015 edition) |
| BK | nothing | no file, or no coding / SID / STAR document, or a failed download |
| LB | nothing | no file, or no coding / SID / STAR document, or a failed download |
| LT | nothing | no file, or no coding / SID / STAR document, or a failed download |
| UA | nothing | no file, or no coding / SID / STAR document, or a failed download |
| UC | nothing | no file, or no coding / SID / STAR document, or a failed download |

- **A State without coding tables**: the per-flight source stays the SimBrief OFP (status `ofp`, `proc-seen/`). An aerodrome of such a State is
  read only on demand, by the owner's manual gesture, through the geometry check, status `check`.
- **No model reads chart drawings or prose** without an explicit request for that aerodrome.
- **France comes from the SIA** (`tools/proc_sia.py`), never from EAD.
- **Reserve**: one sample per State only; another form of the same State's pages is caught by the format check (`formats`, `ok: false`), never
  guessed.

Tooling of the lot: `build_pdf_dir` reads every page of every PDF; `classify_pdf` reports `table_page` and `page_kinds`; shifted-glyph fonts are decoded by font (`chr(c+29)`, fragile, guarded by the format and geometry checks); `waypoint_coords(rows)` reads co-ordinate lists in five printed forms and `build_pdf_dir` fills points with `lat` `None` from them (`coords_from: 'liste'`) before the geometry check; `check_geometry` also checks a leg without a printed true course when it has a magnetic course (within 30 degrees) or a distance (within 0.55 NM); `survey.json` records the authority label; `kind_hint` is carried between pages of a document. New layouts: `icao-tab` (K18), `ei-coding` (K19), `at-coding` text order (K17 extended), `de-route` widened to LU / LP / EP (K15 extended), waypoint lists (K20). `python tests/v3/run.py --grep K`: 19 cases pass.

**`de-route`** (`parse_de_route`): the German AIP's textual SID / STAR route tables (Designator / Significant points / Mag track / Distance / Minimum altitude); one STAR page seen through EAD. The page carries no co-ordinates: points keep `lat` / `lon` `None` with the warning "to be resolved by aerodb from the points base", so the geometry check has nothing to check; instead the counts are checked (fixes = legs + 1) and a table that disagrees is rejected. Case K15 on an invented page. The parsers are now chosen through the `PARSERS` dispatch dictionary in `build_pdf_dir`.

**Survey changes**: records carry `rows_head` (first 30 text rows of the sample's first page; local `survey.json` only, git-ignored), `alt_keys` / `sample_alt` (second keyword set SID, STAR, IAC, RNAV, CODAGE, ARRIVEE, DEPART, APPROCHE, tried when CODING / DEPARTURE / ARRIVAL / APPROACH all count 0, e.g. France, whose headings are not in English) and `sample_any` (first 5 rows of a plain Charts search for `AD_2_`); the `survey.txt` line gets the alternative hits. Console output is UTF-8; private-use characters are dropped like control characters (such a page crashed `--scan-pdf` on a cp1252 console). Case K12 extended.

## 9. Layout families and what remains (28 Oct 2026)

Families read: `sia-code` (France, eAIP), `uk-app` / `uk-star`, `am-coding`, `de-route`, `at-coding`, `icao-tab`, `ei-coding`, `be-coding`, `ge-coding`, plus waypoint lists for co-ordinates. Of 47 authorities: 17 read (2 of them through OCR), 16 charts only, 2 image only, 7 prose, 1 outdated edition, 5 nothing obtained.

Owner decisions still open:

- installing the UK and Austrian OCR files in `data/proc` and committing `data/proc` in the data repository;
- the Settings › Maintenance button (not done);
- unsigned altitudes in `de-route` tables typed "min" when the header says Minimum altitude (session choice, to confirm).

## 10. Ireland, Dublin (EIDW): the second layout of `ei-coding` (29 October 2026)

**Reported** (the user, on the workstation): « Lire les procédures » for EIDW (Dublin; `EAD_STATES` EI, outcome `read`) ran 3.5 minutes and ended `{ ok: false, reason: 'failed', message: 'no procedure could be read for this aerodrome' }`:
`CODING: 0 document(s)`, 31 chart documents downloaded (SID 12, STAR 4, IAP 22 of which 15 listed), every one « disposition non reconnue ». Nothing was shown in Fuel during the reading or after it.

**Cause 1 — the layout was not recognised.** `detect_layout` asked for the words `terminator` and the phrase `magnetic track`; Dublin prints `Term` and `Mag track` (the initial-approach pages print `performance descriptor` and no terminator at all, and one
page splits `WPT` in `W PT`). The rule now asks for the stable words (path, latitude, longitude, name, upper, lower, speed, limit, true, track), one of `wpt` / `w pt`, one of `terminator` / `term` / `descriptor`, `mag` or `magnetic`, a `Fly - By`,
**and at least one co-ordinate row** (`DDMMSS.s / DDDMMSS.s`, digits possibly spaced): the header alone is no longer enough.

**Cause 2 — the columns are not in the order of the 28 October page.** Two orders are read now, told apart **by the line itself** (a row that both patterns could read is ambiguous and is not read):

| | order A (28 October) | order B (Dublin, 29 October) |
|---|---|---|
| row | `RNAV 1 TF GIVOL lat / lon Fly - By 29.5 311.6 / 315 - / 6000 - -` | `RNAV1 DW682 530541.9 / 0061715.9 TF Fly - By 200.2 / 203 11.2 - - Turn R` |
| cells | nav spec, **terminator**, name, lat / lon, fly-by, **distance**, true / mag track, limits, speed, remarks | nav spec, name, lat / lon, **terminator**, fly-by, true / mag track, **distance**, limits, speed, [VPA / TCH], remarks |
| seen on | the page of 28 October; the *initial approach* pages with a `Navigational Path` header (`KERAV 1T INITIAL APPROACH CAT A/B/C/D ILS RWY16`) | SID, STAR, RNP and ILS pages of Dublin |

Other things the Dublin pages do, each handled:

- **First leg of a departure without a point**: `RNAV1 RWY28 - CA - 275.2 / 278 - - / A750 + - -` (some pages: `RNAV 1 - - CA - 275.3 / 277 - - / + A750`). It becomes a **CA leg with `id: null`**, the runway course (`crs` 278, `true` 275.2) and the altitude
  (`A750 +` = at or above 750 ft: `min`). `RWYnn` must be the runway of the block title, else the block is not read. No « co-ordinates to resolve » warning for a point-less leg.
- **Limits**: columns `Upper limit / Lower limit` read as everywhere (**upper = maximum, lower = minimum, equal = at**): `A 4000 / -` = at or below 4000 ft, `- / A750 +` = at or above 750 ft, `FL080 / FL080` = at FL080, `-FL170 / +FL150` = between. The printed sign
  must be the column's (`-` upper, `+` lower), possibly apart from the level (`- FL240 / -`, `+ A3000`); a contrary sign rejects the block. Levels are `A 4 000` / `A 30 00` / `FL 19 0` (digits spaced by the text layer), `A750+`, `+A3000`, `FL90`. A level that is
  not a usual step (a multiple of 50 ft, of 5 FL) is a digit lost or swallowed: the row is not read.
- **Turn**: `Turn L`, `Turn R`, `Turn R , VOR`, `Turn R, IAF`, and a lone `L` / `R` (ILS and RNP pages) → `turn`, the direction of the turn onto that leg (as in the SIA tables).
- **Digits spaced by the text layer**: `52284 3 . 7` (lat), `007232 8 . 6` (lon), `15 7` (magnetic track), `092. 6`, `1 0.6` (distance), `2 2 0` (speed) are joined (on the digit counts: 6 + decimals, 7 + decimals, 3, 3).
- **Names cut in two** (`DW0 24`, `OLONO 1B`): a **point** name is joined only if the **same co-ordinates** carry the whole name elsewhere in the aerodrome's pages (`DW024` appears whole in the 2020 pages; the 2022 pages call the same point `ATGOW`: both
  names are admitted); otherwise the block is rejected (« nom coupé non confirmé »). Block titles and short designators are read as they come (`OLONO 1B`, `OLON 1B`, `BAMLI 1NCAT A/B`).
- **STAR pages whose text comes backwards**: the text layer gives the lines of each block, then its header, its short designator (`NIMA4L`) and its title (`NIMAT 4L STAR RWY 28L/R`), the whole page being in reverse reading order. A page where a leg row precedes the first
  title is read from the end. `RWY 28L/R` gives two runways.
- **RNP pages**: the navigation specification is cut around the row (`RNP` / `DUB 532957.8 / … IF …` / `APCH`): the three lines are joined; a VPA / TCH column (`3 / 54`: `vpa` −3.0). The missed approach after the runway point `RWnn` is marked `phase: 'missed'`
  (existing rule of `records_uk_app`).
- **Incomplete rows**: `… 3.8 - / A950` (three RNP blocks of RWY 34) and `… 23.5 - FL230 / - Turn R` (a SID) lack their last cells (the text layer lost them): read with no speed, said in a warning. Anything else that does not parse rejects the block.
- **Skipped on purpose**: a *missed approach table alone* (`Dublin ILS RWY 28L MISSED APP`, 4 of them): it is not a procedure (the ILS final and the interruption are not coded together), said in a warning; the holding tables (`Hold Identification`); the
  `Descent Angle … Fix Coordinates` tables of the ILS / LOC / VOR pages and the `SBAS FAS Data Block` pages (no legs).
- **Naming**: a SID / STAR is named by its **coded designator** (`ABID1B`, `NIMA4L`: the line under the title), as before; an approach by its title without the aerodrome (`RNP RWY 28L via DUB`, `KERAV 1T INITIAL APPROACH ILS RWY16`). The `ILS … via <fix>` pages
  and the `INITIAL APPROACH` pages code the initial and intermediate segments only: those are the legs read.

**Measured on the 31 documents of the user's run** (offline, `build_pdf_dir` on the text of the downloaded PDF; the old code: 0 page recognised, 0 procedure):

| | |
|---|---|
| documents / pages | 31 / 80 |
| pages recognised and read | **43** (`ei-coding`; before: 0) ; 2 documents (the two VOR approaches, `Fix Coordinates` tables) stay « mise en page non reconnue » |
| pages not recognised, not tables of legs | 31 chart pages (page 1), 4 `SBAS FAS Data Block` pages, the 2 VOR pages |
| procedures read | **196**: 115 SID, 43 STAR, 38 APP (RNP and initial approaches); 0 nameless, 0 in doubt, 0 removed |
| leg rows / legs kept | 1 012 / 999 (the other 13 are the rows of the 4 missed-approach tables left out) |
| geometry check (`check_geometry`: true track and distance against the printed co-ordinates) | 659 TF legs checked, **0 table rejected** ; `proc_manual.verify` finds nothing |
| rows read without speed | 4 (NEVRI of NEVR1N; DW033 in the three RWY 34 RNP blocks) |

**Fixtures**: three **synthetic** pages in `frame/aerodb/test/fixtures/ead/` (invented points and positions computed to agree, the layout and the text-layer faults of the real pages reproduced: SID with two blocks, STAR in reverse order, RNP with the missed approach
table alone). The real rows are not committed (§ 4: a State's AIP does not go into the public repository). Bench: K26 (new), K19 (adjusted), K22, K12.

**Pagination of the survey** (`EadLibrary.search(all_pages=True)`, written on 28 October, untested without EAD): the IAP search found 22 documents and read 15. The code asks for the second page with the PrimeFaces data-table parameters (`mainForm:searchResults`,
`…_pagination=true`, `…_first=15`, `…_rows=15`, `…_skipChildren`, `…_encodeFeature`, `execute` and `render` on the table, no `javax.faces.partial.event`); the names were not seen on the real screen. When the answer to page 2 is an error or has no result table, it stops
with `« 15 ligne(s) lue(s) sur 22 : la page 2 a répondu par une erreur ou sans tableau de résultats »` and goes on with what it has. The first paging request logs once what was sent and the anatomy of the answer (`pagination (noms de paramètres non vus…`): that
line is in the job log. Not changed. The numbering of the documents read (AD 2.24-10 … 42) lacks 24-31 and 24-34: charts of the missing seven could be among them.
