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
- **Terms that already apply**, whatever the pages say: each State's AIP is that State's copyright (the DFS notice, read on
  25 October: use "by the organisation to which it was issued", no storage or redistribution without permission), and EAD Basic's
  own text excludes operational use. A private, non-commercial, **simulation** use is not operational navigation, but it is not
  granted either: the owner decides whether to ask (a short question to `ead.service` at eurocontrol.int, the address the login
  page gives for operational use).

- **Automated access, to be checked by the owner before keeping `tools/proc_ead.py`** (security review of 28 October 2026): EAD
  Basic is a personal account; whether its terms (registration form, terms of use) allow a script to log in and search for the
  account holder is **not known here** and must be read by the owner on the registration form or asked to EUROCONTROL. Until then
  the probe stays a one-off manual run, never scheduled.

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

## 3. What `tools/proc_eaip.py` would become (not written before a real page)

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
   hand (fastest for the first parser), then the click replaces him; (b) the session writes a read-only **probe** (`tools/proc_ead.py --probe`:
   asks for the password at the prompt, never stores it, logs in, opens the AIP Library, saves the **page structure only** (HTML with form
   state, cookies and the user name removed, no PDF) and a list of States and file names) which the owner runs once and whose sanitised output
   he sends back, so that the session can write the search and download calls without ever holding a credential. The session never logs in.
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

It asks for the EAD Basic user name and the password (typed, hidden, **never stored, shown or sent anywhere but `www.ead.eurocontrol.int`**;
`EAD_USER` / `EAD_PASSWORD` can stand in for the prompts). It then, read-only: logs in through the login page's own form, follows the home page to
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

**Next** (nothing to download again): look inside the PDF for coding tables with `python tools/proc_eaip.py --scan-pdf ead_probe/cache/EG_AD_2_EGLL_en.pdf` (needs `pypdf`). It reports, page
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
`python tools/proc_eaip.py --scan-pdf FILE --page 40` prints that page's text rows (numbered, 160 characters, 90 rows), the very rows the analysers would read; the owner pastes pages 40 and 41 here (a UK AIP
excerpt in the session only, never in the repository). The UK layout parser, a second entry of the layout registry (§ 3), is then written on them.
