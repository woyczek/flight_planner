# Zones of the user's base without points or airways (10 Nov 2026)

Survey of the base published on the user's workstation (`data/sia/base/index.json`, cycle 2026-10-29): **83 zones built, 76 have neither `points.json` nor `airways.json`**.
Every one of them is built from **openAIP only** (airspaces, aerodromes, navaids, VFR points: no designated point, no airway) except `ca` (also NavCanada, same gap) and `nat` (oceanic tracks).

What exists today without a new reader: the **EUROCONTROL FRA book** of the workstation (`route/fra-points`, 8 206 points in cycle 2026-10-29, FIR by FIR) answers an identifier near a route (`coords(id, { near })`, SOG-0142) but is not a published zone; the openAIP **navaids** are in the zone (column `navaids`).

| zone | name | aerodromes | navaids | sources today | FRA-book points (FIR prefix) | ICAO prefixes |
|---|---|---:|---:|---|---:|---|
| ad | Andorra | 2 | 0 | openaip | shared prefix | LF |
| af | Afghanistan | 63 | 9 | openaip | 0 | OA |
| al | Albania | 6 | 1 | openaip | 32 | LA |
| at | Austria | 197 | 14 | openaip | 129 | LO |
| ax | Åland | 2 | 0 | openaip | shared prefix | EF |
| az | Azerbaijan | 35 | 10 | openaip | 0 | UB |
| ba | Bosnia and Herzegovina | 22 | 16 | openaip | 65 | LQ |
| be | Belgium | 161 | 16 | openaip | 33 | EB |
| bg | Bulgaria | 92 | 15 | openaip | 132 | LB |
| bt | Bhutan | 2 | 0 | openaip | 0 | VQ |
| by | Belarus | 26 | 13 | openaip | shared prefix | UM |
| ca | Canada | 1452 | 22 | navcan, openaip | 0 | CB,CC,CH,CM,CR,CY,CZ |
| ch | Switzerland | 162 | 13 | openaip | shared prefix | LS |
| cn | People's Republic of China | 291 | 27 | openaip | 0 | VH,VM,ZB,ZG,ZH,ZJ,ZL,ZP,ZS,ZU,ZW,ZY |
| cy | Cyprus | 12 | 6 | openaip | 69 | LC |
| cz | Czech Republic | 272 | 28 | openaip | 97 | LK |
| dk | Denmark | 129 | 21 | openaip | shared prefix | EK |
| dz | Algeria | 55 | 49 | openaip | 1 | DA |
| ee | Estonia | 30 | 5 | openaip | 93 | EE |
| eg | Egypt | 71 | 16 | openaip | 0 | HE |
| fi | Finland | 102 | 35 | openaip | shared prefix | EF |
| fj | Fiji | 23 | 5 | openaip | 0 | NF |
| fo | Faroe Islands | 9 | 2 | openaip | shared prefix | EK |
| ge | Georgia | 19 | 10 | openaip | 46 | UG |
| gl | Greenland | 77 | 21 | openaip | 0 | BG |
| gr | Greece | 167 | 77 | openaip | 137 | LG |
| hr | Croatia | 62 | 29 | openaip | 93 | LD |
| hu | Hungary | 100 | 33 | openaip | 116 | LH |
| id | Indonesia | 286 | 1 | openaip | 0 | WA,WI,WR |
| il | Israel | 33 | 8 | openaip | 0 | LL |
| im | Isle of Man | 1 | 0 | openaip | 0 |  |
| in | India | 245 | 1 | openaip | 0 | VA,VE,VI,VO |
| iq | Iraq | 74 | 0 | openaip | 0 | OR |
| ir | Iran | 138 | 81 | openaip | 0 | OI |
| is | Iceland | 84 | 20 | openaip | 0 | BI |
| it | Italy | 583 | 94 | openaip | 644 | LI |
| je | Jersey | 0 | 0 | openaip | 0 |  |
| jo | Jordan | 16 | 4 | openaip | 0 | OJ |
| kh | Cambodia | 9 | 0 | openaip | 0 | VD |
| kz | Kazakhstan | 98 | 27 | openaip | 0 | UA |
| lb | Lebanon | 4 | 0 | openaip | 0 | OL |
| li | Liechtenstein | 1 | 0 | openaip | shared prefix | LS |
| lt | Lithuania | 40 | 7 | openaip | 108 | EY |
| lu | Luxembourg | 11 | 1 | openaip | shared prefix | EL |
| lv | Latvia | 24 | 8 | openaip | 59 | EV |
| ly | Libya | 69 | 60 | openaip | 0 | HL |
| ma | Morocco | 56 | 11 | openaip | 16 | GM |
| md | Moldova | 9 | 1 | openaip | 39 | LU |
| me | Montenegro | 7 | 8 | openaip | shared prefix | LY |
| mk | North Macedonia | 14 | 6 | openaip | 14 | LW |
| mm | Myanmar | 76 | 0 | openaip | 0 | VY |
| mt | Malta | 2 | 2 | openaip | 63 | LM |
| nat | North Atlantic (oceanic, NAT) | 0 | 0 | nat | 0 |  |
| nl | Netherlands | 186 | 12 | openaip | 54 (FIR EHAA) | EH |
| no | Norway | 194 | 101 | openaip | 724 | EN |
| np | Nepal | 42 | 0 | openaip | 0 | VN |
| ph | Philippines | 106 | 31 | openaip | 0 | RP |
| pk | Pakistan | 122 | 28 | openaip | 0 | OP |
| pl | Poland | 431 | 73 | openaip | 355 | EP |
| ps | Palestine | 1 | 0 | openaip | 0 |  |
| pt | Portugal | 189 | 26 | openaip | 245 | LP |
| ro | Romania | 77 | 30 | openaip | 253 | LR |
| rs | Serbia | 101 | 22 | openaip | shared prefix | LY |
| ru | Russia | 807 | 280 | openaip | shared prefix | UE,UH,UI,UL,UM,UN,UO,UR,US,UU,UW |
| si | Slovenia | 32 | 8 | openaip | 43 | LJ |
| sk | Slovakia | 105 | 15 | openaip | 49 | LZ |
| sy | Syria | 23 | 0 | openaip | 0 | OS |
| th | Thailand | 127 | 11 | openaip | 0 | VT |
| tj | Tajikistan | 12 | 9 | openaip | shared prefix | UT |
| tm | Turkmenistan | 20 | 16 | openaip | shared prefix | UT |
| tn | Tunisia | 15 | 16 | openaip | 1 | DT |
| tr | Turkey | 115 | 99 | openaip | 646 | LT |
| ua | Ukraine | 115 | 12 | openaip | shared prefix | UK,UP,UR |
| va | Vatican City | 0 | 0 | openaip | 0 |  |
| vn | Vietnam | 31 | 0 | openaip | 0 | VV |
| xk | Kosovo | 1 | 0 | openaip | 0 | BK |

## The Netherlands (`nl`): official sources of points and airways (SOG-0142, « PAM est bien un point en Europe »)

State: 186 aerodromes, 12 navaids (openAIP), **no point, no airway**; the FRA book of the workstation holds 54 points of the Amsterdam FIR (EHAA). PAM (Pampus VOR/DME, 52.33°N 5.09°E) is a navaid of the zone and a point of the FRA book (EHAA); it was invisible to the page only because `coordsAll(id, { near })` read the FRA book when no published zone had the identifier (fixed, K161).

- **Official source**: the AIP of the Netherlands, published by **LVNL (AIS Netherlands)** as an eAIP (`eaip.lvnl.nl`; the pages EH-ENR 4.1 radio navigation aids, EH-ENR 4.4 name-code designators of significant points, EH-ENR 3.x ATS routes exist as PDF and, in the usual EUROCONTROL layout, as HTML). The official version is an XML dataset kept by AIS Netherlands (contact ais@lvnl.nl).
- **Terms**: the publication belongs to LVNL: « no part … may be reproduced … without written permission from LVNL » (GEN 0.1, as read in a search result; the page itself could not be fetched). The same class as the Danish AIP (`frame/aerodb/NAVIAIR_LICENCE_REQUEST.md`): a reader that stores or publishes the points needs that permission; reading on the workstation only is the cautious reading.
- **Access**: `eaip.lvnl.nl` answered **HTTP 403** to an automated fetch of the survey (pages and the old PDF paths 404). The launcher declares itself as it is and does not pose as a browser: the file would have to be **chosen by hand** (as for the NASR and the UK Mil AIP), or an XML dataset obtained from LVNL.
- **No reader without a sample**: the page layout of EH-ENR 4.4 / 3.x could not be seen from here; a reader (like `tools/airnav_eaip.py`, `tools/lfv_eaip.py`) is written from a real page, so it waits for a copy of the pages in a browser or of the dataset.
- **Meanwhile**: the points near the route come from the FRA book (`coords` with `near`), the navaids from openAIP; the **airways** of the Netherlands have no source on the workstation (X-Plane's `earth_awy.dat` carries them: an X-Plane airways layer like the points one, SOG-0153 e, is the available fallback; its data are Navigraph's: local only).

## Where to find points and airways, State by State: first survey (11 Nov 2026, SOG-0240)

The user's order (« trouver des sources. fouille internet pour avoir les AIP, sinon eurocontrol ») and the rule: official sources first; the launcher declares itself as it is; a host that refuses automated access is not worked around (a file taken by hand, as for LVNL). **Europe first, then North America; the rest of the world is not surveyed yet** (af, bt, cn, dz, eg, fj, id, il, in, iq, ir, jo, kh, kz, lb, ly, ma, mm, np, ph, pk, ps, sy, th, tj, tm, tn, vn).

**How this was made, and what it is worth.** Desk research by four cheaper-model agents (web search and page reading only, no login, no download, about 6 calls per zone), one per region, on 11 Nov 2026. *Evidence*: **read** = the page was opened by the agent; **extract** = a search snippet or a URL pattern only (the format is then *presumed*); the pages were **not re-opened** afterwards. Most ENR 4.1 / 4.4 / 3.x pages were **not seen**: a family marked « presumed » must be confirmed on a real page before any reader is written. Where a host answered 403 or a captcha, that is recorded and nothing was tried to get round it.

Format families: **F1** eAIP in the EUROCONTROL / ICAO Annex 15 HTML layout (one folder per AIRAC cycle, one HTML file per section: `…-ENR-4.4-en-GB.html`); **F2** one PDF per section; **F3** one large PDF; **F4** structured data (AIXM, CSV); **F5** closed (login, subscription, captcha); **F6** unknown or other.

| zone | provider | entry | family | access | licence (paraphrase) | evidence |
|---|---|---|---|---|---|---|
| is | Avians (Isavia before 2026) | `eaip.avians.is` (cycles on `eaip.isavia.is`) | F1 | free, no login | no terms on the page | read |
| fi, ax | Fintraffic ANS (Åland in the Finnish AIP) | `ais.fi/eaip/…/eAIP/EF-GEN 0.1-en-GB.html` | F1 | free | copyright Fintraffic; resale needs an agreement; data may be used for refining and research without a fee (GEN 0.1 § 5) | read |
| no | Avinor | `partner.avinor.no/en/ais/aip/`, cycles on `aim-prod.avinor.no` | F1 | an accept page and a login link: whether it gates the content is not confirmed | Norwegian copyright; use beyond the law needs Avinor's written permission | read (notice), extract (cycle URL) |
| dk, fo, gl | Naviair AIM | `aim.naviair.dk` (AIP Faroe Islands and AIP Greenland on the same site) | F2 (ENR 4.1 and 3.2 PDFs seen; 4.4 only in amendments) | free, no login | not found (see `NAVIAIR_LICENCE_REQUEST.md`) | read (landing), extract (PDFs) |
| ee | EANS | `eaip.eans.ee/<cycle>/html/eAIP/` | F1 | unknown (constructed URLs 404) | not seen | extract |
| lv | LGS | `ais.lgs.lv/eAIPfiles/<cycle>/data/<date>/html/eAIP/EV-ENR-4.3-en-GB.html` | F1 | unknown (empty bodies, no 403) | not seen | extract |
| lt | Oro navigacija | `oronavigacija.lt/a1/aip/<cycle>/html/eAIP/` and `/pdf/EY-ENR-5.1.pdf` | F1 | **403** on the HTML (not worked around; the PDF route was not tried) | not seen | extract |
| be, lu | skeyes (joint Belgium-Luxembourg AIP) | `ops.skeyes.be/services-aip`, tree `…/belgocontrol_static/eaip/eAIP_Main/html/eAIP/` | F1 | **403** on the entry and on ENR 4.4 | not read | extract |
| ch, li | Skyguide (Liechtenstein in the Swiss AIP) | `aip.skyguide.ch` did not resolve from the agent's network; the AIM page orders the annual AIP at `aimshop-skyguide.ch` | unknown | unknown (a DNS failure is not a block) | not read | read (AIM page) |
| at | Austro Control | `austrocontrol.at/…/aim_produkte/aip`, digital AIP `eaip.austrocontrol.at` | F2 provisional (PDF; offline ZIP 23 MB without charts) | free | content copyrighted by ACG; commercial reproduction or use, even partial, needs prior written consent | read (product page) |
| pl | PANSA | `ais.pansa.pl/en/publications/aip-poland/`; eAIP IFR `docs.pansa.pl/ais/eaipifr/default_offline_<date>.html` | F1 provisional | free (entry) | copy or print unchanged, for operational use only; **conversion or alteration not allowed**; other use, redistribution, commercial use need PANSA's permission | read (entry, policy) |
| cz | ANS CR | `aim.rlp.cz/ais_data/www_main_control/frm_en_aip.htm`; ENR 4.4 `…/aip/data/valid/e4-4.pdf`; eAIP `aim.rlp.cz/eaip/html/index.html` | F2 (PDF per section; eAIP HTML also linked) | free | personal use; **providing the content or any part of it inside another product or service is barred without consent**, commercial or not | read (terms), extract (PDF) |
| sk | LPS SR | `aim.lps.sk` | probably F1 | **403** | not read | extract |
| hu | HungaroControl | `ais.hungarocontrol.hu/aip/<date>/<date>-AIRAC/html/eAIP/LH-ENR-4.4.1-en-HU.html` (4.4.1: FRA significant points) | F1 | free | not read | **read** (the 2024 cycle) |
| pt | NAV Portugal | `ais.nav.pt/wp-content/uploads/AIS_Files/eAIP_Current/eAIP_Online/eAIP/html/eAIP/LP-menu-en-PT.html`; `LP-ENR-4.1`, `4.4`, `3.1`–`3.3` named in the menu | F1 | free | reproduction and redistribution only by prior agreement with NAV Portugal (GEN 0.1 item 5) | **read** (menu, GEN 0.1; ENR pages not opened) |
| ro | ROMATSA | `aisro.ro` is a PHP frameset with the word « testare »: the current AIP was not located | unknown | unknown | not seen | read (root only) |
| bg | BULATSA / CAA Bulgaria | PDFs `LB_ENR_1_8_en.pdf` on `caa.bg` | F2 presumed | unknown | not seen | extract |
| hr | Croatia Control | `crocontrol.hr/UserDocsImages/AIS%20produkti/eAIP/<cycle>-AIRAC/html/eAIP/` | F1 presumed | unknown (404 on the tested pages) | not seen | extract |
| si | Slovenia Control | `aim.sloveniacontrol.si/aim/eAIP/Operations/history-en-GB.html` | F1 presumed | TLS certificate error (not worked around) | not seen | extract |
| rs, me | SMATSA (one joint AIP Serbia and Montenegro; Kosovo's airspace is not shown to share it) | `smatsa.rs/en/aip` | F1 presumed (also printed binder, CD) | a subscription order form; price not stated | all rights reserved | read |
| ba | BHANSA | `eaip.bhansa.gov.ba` (linked, not opened) | unknown | free presumed | all rights reserved | read (home page only) |
| mk | M-NAV | `ais.m-nav.info/eAIP/Start.htm` (`current/index.htm`) | F1 presumed | no login on the start page | not stated | read (start page) |
| al | ANSA / Albcontrol | `ais.albcontrol.al/aip/<cycle>/<cycle>-AIRAC/html/eAIP/LA-menu-en-GB.html` | F1 presumed | **403** | not seen | extract |
| xk | Kosovo CAA | `caa.rks-gov.net/wp-content/uploads/2022/07/AIP-ENR.pdf` (ENR 4.4 of 2019: stale) | F2 | free | not seen | extract |
| gr | HCAA | no official URL seen (third-party copies only) | unknown | unknown | not seen | extract |
| cy, mt | DCA Cyprus; Malta ATS | nothing found | unknown | unknown | not seen | none |
| it, va | ENAV (the Vatican probably in the Italian AIP) | `aip.enav.it` did not resolve from the agent's network; free registration per a third party | unknown | a registration step per a snippet | not seen | extract |
| ad | ENAIRE (Spain) for the aerodrome LESU; Andorra's ENR not confirmed | `aip.enaire.es` | F1 (Spanish AIP, `LE_` files) | unknown | not seen | extract |
| md | MOLDATSA (regulator `caa.md`, whose site says CC BY-SA 4.0: not said to cover the AIP) | not found | F1 presumed | unknown | unknown | read (regulator page) |
| ua | UkSATSE; `aisukraine.net` | answered with an empty body | unknown | unknown | not found | extract |
| by | Belaeronavigatsia; a 2021 copy at `ban.by/AIP/…/html/index.html` is now 404 | not located | F1 presumed (2021 path) | unknown | not found | read (404) |
| ru | CAICA / Rosaeronavigatsia | `caica.ru/ANI_Official/Aip/` | F5 presumed | **captcha** on the landing page; customer registration | all rights reserved | read |
| tr | DHMI | `dhmi.gov.tr/Sayfalar/aipturkey.aspx`; per-section PDFs exist (`LT_ENR_3_2_en.pdf`) | F5 (subscription login and captcha) | **login and captcha** | not on the page | read |
| ge | Sakaeronavigatsia | `airnav.ge/eaip/<cycle>/html/eAIP/UG-ENR-4.1-en-GB.html`, `4.4`, `3.1`, `3.2`, `3.5`, `3.6` (3.3 and 3.4 nil) | F1 | free, per-section HTML read without login | no terms on the page | **read** (ENR 0.6; the other pages linked) |
| az | AZANS | said to be in the EUROCONTROL AIP library | unknown | unknown | not seen | extract |
| im, je | the Isle of Man inside the UK AIP (NATS) in part; Jersey not located | — | unknown | unknown | not seen | extract |
| ca | NAV CANADA | the DAH (free PDF) at `navcanada.ca/en/dah<date>.pdf`; CFS and CAP are paid products | F6 (DAH one PDF; the rest paid) | DAH free; CFS / CAP paid | own use only; **derivative works prohibited**; aeronautical data sold under a commercial licence | read (terms), extract (DAH) |

### What this survey says

- **Format is not the obstacle; the licence is.** Every State for which a text was read says the same thing in different words: copying, converting or putting the content into another product needs the publisher's permission (Norway, Poland, Czech Republic, Austria, Portugal, Canada, Serbia / Montenegro; Finland alone allows « refining and research » without a fee, and forbids resale). None grants a reuse licence. This is the position already met with the Danish and Dutch AIPs (`NAVIAIR_LICENCE_REQUEST.md`, `DFS_LICENCE_REQUEST.md`). The rule held so far for such sources: **a manual source, read on the user's workstation, the output kept in `data/local/`, never in the published base**, with its licence line.
- **Family F1 is the one reader that would serve the most zones**: the eAIP in the Annex 15 layout, one HTML file per section. **Read** (opened) in is, fi (+ ax), hu, pt, ge — and the Swedish and Irish ones already read by `tools/lfv_eaip.py` and `tools/airnav_eaip.py`; **presumed** (URL pattern, 403, 404 or not opened) in no, ee, lv, lt, be (+ lu), pl, hr, si, rs (+ me), mk, al, sk, md, by and the Spanish AIP (ad). That is **6 zones read (is, fi, ax, hu, pt, ge) + 17 presumed (no, ee, lv, lt, be, lu, pl, hr, si, rs, me, mk, al, sk, md, by, ad) = 23 zones** of the 46 surveyed.
- **F2 (PDF per section)**: dk (+ fo, gl), cz, at (provisional), bg, xk. The Czech and Danish PDFs came back undecodable to the agent (to be read with `pypdf`, as the other PDF readers do). **7 zones** (dk, fo, gl, cz, at, bg, xk).
- **F5 (closed): tr, ru**: a login and a captcha; not tried. For these the EAD of EUROCONTROL (the survey of 28 Oct, 47 States, `frame/aerodb/EAD_BASIC.md` § 8; identifiers only through `secrets/ead.json`) is the route, and only the AD 2 pages were read there so far, not ENR.
- **Hosts that refuse automated access** (recorded, not worked around): lt, be / lu, sk, al (403), ru and tr (captcha / login). Their files would be **taken by hand**, as for LVNL.
- **Not found or not reachable from the agents' network**: ro, ba, gr, cy, mt, it / va, ch / li, ua, az, je, im: to look at from a browser; no format can be claimed.
- **What the FRA book already gives** (counts in the first table): the designated points of most of these European zones, near a route (`coords(id, { near })`). The airways (ENR 3) have no source on the workstation for any of them.

## What is missing, by kind

- **Designated points and airways, all other zones**: the same gap everywhere: openAIP carries neither. Sources by kind: EUROCONTROL FRA book (points only, FRA airspaces: Sweden, Denmark, Finland, Norway, Poland… are there), each State's eAIP ENR 4.4 and 3.x (the readers `airnav_eaip.py` and `lfv_eaip.py` are templates for the HTML layout; licence to check per State), X-Plane (local layer, points and airways, proprietary), FAA NASR (the US, done).
- **Where it matters first**: the zones of the user's routes (ESSB → LEMO crosses `se`, `dk`, `de`, `nl`, `be`, `fr`, `es`).
