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

## What is missing, by kind

- **Designated points and airways, all other zones**: the same gap everywhere: openAIP carries neither. Sources by kind: EUROCONTROL FRA book (points only, FRA airspaces: Sweden, Denmark, Finland, Norway, Poland… are there), each State's eAIP ENR 4.4 and 3.x (the readers `airnav_eaip.py` and `lfv_eaip.py` are templates for the HTML layout; licence to check per State), X-Plane (local layer, points and airways, proprietary), FAA NASR (the US, done).
- **Where it matters first**: the zones of the user's routes (ESSB → LEMO crosses `se`, `dk`, `de`, `nl`, `be`, `fr`, `es`).
