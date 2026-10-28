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
