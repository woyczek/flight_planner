# EAD Basic: what the owner's access gives, and how it could feed the procedures (25 October 2026)

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
