# Open AIP data sets for the rest of the world: inventory (25 October 2026)

*Step 4, second half. Facts are marked **read** (the page or file was opened on 25 October 2026 from the cloud session) or **extract** (a
search-engine extract of a page the session could not open). Nothing below was stored in the repository, and no data set was processed.*

| Provider | What it offers | Procedures (SID / STAR / approaches)? | Terms | Status for the suite |
|---|---|---|---|---|
| **FAA (United States)** | CIFP, ARINC 424-18, 28 days | yes, with legs | not copyrighted; warranty notice and error reporting (**read**) | **done**: `tools/proc_cifp.py` (lot 4) |
| **SIA (France)** | eAIP coding pages (PDF) | RNAV and RNP only | reusable with the source named (earlier reading) | **done**: `tools/proc_eaip.py` (lots 2 and 3) |
| **DFS (Germany)** | `aip.dfs.de/datasets` and its REST API (`/datasets/rest/`, JSON catalogue, no account) | **yes**: data set "ED Procedure", AIXM 5.1, "SID STAR and IAP" with "Associated Legs", effective 2026-10-01, published 2026-09-03, file `ED_Procedure_2026-09-03_2026-10-01_revision.xml`, sha512 given; "SegmentLeg data for some procedures might be incomplete" (**read**) | **copyrighted**: "AIS Products may be used for aviation purposes only by the organisation to which they were issued"; no reproduction, storage in a retrieval system, redistribution or republication without prior written permission; "contact DFS to obtain a licence" (**read**) | **blocked by the terms**: no download stored or converted without a licence. Worth asking (draft below) |
| **EUROCONTROL (AIXM Confluence)** | national AIXM 5.1.1 data sets, "Procedures" among them | listed (**extract**); the Germany page lists the DFS sets above | unknown; site blocked from the cloud container | see `EUROCONTROL_REQUEST.md` |
| **ENAIRE (Spain)** | AIP data sets in CSV and AIXM 5.1 (obstacles, airspace, en-route, restricted and temporary aerodromes) | **not among them** in the 2022 listing (**extract**); the AIP site `aip.enaire.es` answers 403 to the container | unknown | nothing to build on yet; ask the owner to open the site and look for a procedures set |
| **Poland (PANSA)** | 2018 AIXM 5.1 sample, SID / STAR "high level", no legs (**extract**) | partial | sample | not useful (no legs) |
| **Switzerland (Skyguide)** | 2013 AIXM 5.1 sample with SID / STAR / IAP (**extract**), links reported broken | yes, old | test only | not useful (2013) |
| **NATS (UK), NAV CANADA, Airservices (Australia), NZ** | no open procedure data set found by the searches (**extract**: nothing returned) | unknown | unknown | to look at from a browser; no lead |
| **X-Plane CIFP, Navigraph** | full coded procedures | yes | personal licence, never copied nor published (`LICENSE.md`) | **fallback, local only**; not read by anything yet |

## What this means

- The only open **and** structured procedure source beyond the two already built is **DFS's AIXM 5.1 set**, and its terms forbid what the
  suite would do with it (store it, convert it, show it to the airline's pilots) without a licence. Same position as EUROCONTROL's:
  the owner decides whether to ask.
- The AIXM 5.1 reader would be the same for DFS, EUROCONTROL's 5.1.1 sets and any other AIXM provider: the mapping is in
  `EUROCONTROL_REQUEST.md` § 2. It stays unwritten until a licensed file is in hand (no converter on a file that may not be stored).
- Everything else for the rest of the world is a lead, not a source.

## Draft of a licence request to DFS (to adapt; English)

> **To:** Aeronautical Information Services of Germany, DFS Deutsche Flugsicherung GmbH (the contact given on `aip.dfs.de`)
>
> **Subject:** Licence request — AIXM 5.1 "ED Procedure" data set, non-commercial flight-simulation use
>
> Dear Sir or Madam, I run the internal tools of *[name of the virtual airline]*, a non-commercial virtual airline whose pilots fly with
> flight-simulation software. We would like to read the "ED Procedure" data set published at aip.dfs.de/datasets (SID, STAR and instrument
> approaches of German civil aerodromes), convert the procedure legs and altitude constraints into our own file format, and show them to
> our pilots on a map inside a private application, with the source ("DFS AIP Germany") and the AIRAC cycle named and the label "for
> flight simulation only — not for navigation". May we do so, under which licence, and at what cost, if any? We would not redistribute
> the original files or the converted data outside our own members. Kind regards, *[name, role, e-mail]*

Sources: [DFS AIP datasets](https://aip.dfs.de/datasets/), [DFS REST catalogue](https://aip.dfs.de/datasets/rest/), [EUROCONTROL AIXM Confluence — Germany](https://ext.eurocontrol.int/aixm_confluence/display/AIX/Germany), [Spain](https://ext.eurocontrol.int/aixm_confluence/display/AIX/Spain), [FAA NASR](https://www.faa.gov/air_traffic/flight_info/aeronav/Aero_Data/NASR_Subscription/2026-10-01).
