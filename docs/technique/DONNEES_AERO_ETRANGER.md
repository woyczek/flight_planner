# Aeronautical data outside France — possible sources

*[← Technical documentation](README.md)* · Research of 6 October 2026: equivalents of the SIA data (AIXM 4.5 “all
FR”, XML_SIA) and DIRCAM / MILAIP data (RTBA, AZBA, ENR 5.7) for the United Kingdom, the rest of Europe and the United States.
**[V]** = verified on the website; **[?]** = not confirmed, to be checked before developing.

## In the suite (6 October 2026)

Done: AIXM 5.1, GeoJSON (openAIP, FAA ADDS, generic), OpenAir and X-Plane readers (`shared/aero_sources.js`),
read by the SIA database (`shared/sia_base.js`, version 16); sources enabled or not in “Settings › Maintenance ›
Aeronautical data”; downloads from ENAIRE, FAA (zones, MTR routes, classes) and openAIP by
`tools/aero_fetch.py` (launcher: `POST /__setup/aero-fetch`). Trials: Spain (520 airspaces, 147 navaids, 901 segments),
United States (1,542 zones, 3,654 MTR segments), Belgium and Luxembourg (openAIP), with the SIA of cycle 2026-10-01.
X-Plane 12 (cycle 2606 of “Custom Data”): `airspace.txt` is a worldwide OpenAir file (≈ 25,800 airspaces; kept:
R, Q = D, P, CTR, classes B, C, D — 18,000 outside France); `earth_mora.dat`: per line, latitude of the southern edge, longitude
of the western edge, then 30 values in hundreds of feet (one one-degree cell each, going east); 86,000 waypoints,
7,800 navaids, 112,000 airway segments; database of about 60 MB with the SIA (read in 3 s). Navigraph / Jeppesen data
under personal licence: read on the user's machine, never copied into the repository. Within the French FIRs (XML_SIA
outlines), the airspaces from the other sources are discarded: the SIA alone (same zones cut and named differently).
To do: United Kingdom (NATS file to be dropped in by hand; low-flying areas of the Mil AIP to be extracted from the
PDFs, like ENR 5.7).

## United Kingdom

- **Civil — NATS for the CAA** (<https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/>):
  “UK ICAO AIP Dataset” per AIRAC cycle, obstacles, VRP, SRD, UAS zones; **AIXM 5.1** (plus KML, XLS, CSV) **[V]**.
  Download after registration **[V]**, probably free; reuse conditions not read **[?]**.
- **Military — UK Mil AIP (No 1 AIDU)** (<https://www.aidu.mod.uk/aip/aipVolumes.html>): free access, **Open Government
  Licence v3.0** (redistribution with attribution) **[V]**; **PDF only** — ENR 5.2 (exercise areas), ENR 6-15 / 6-16
  (Low Flying Areas day / night) **[V]**. Digital data reserved for military use **[?]**. To be extracted from the PDF,
  like our ENR 5.7. The British low-level network is made of areas, not of routes like the RTBA.

## Rest of Europe

- **EUROCONTROL EAD**: EAD Basic free (AIP PDFs only); AIXM 5.1 reserved for signatories of an agreement, EAD Pro
  under annual licence **[V]** — out of reach for a hobby suite.
- **Germany (DFS)**: AIP viewable free of charge (<https://aip.dfs.de/basicAIP/>) **[V]**; AIXM 5.1.1 datasets reported
  by EUROCONTROL, access and licence unknown **[?]**.
- **Spain (ENAIRE)** (<https://aip.enaire.es/AIP/DatosDigitales-en.html>): AIXM 5 (airspace, en route,
  aerodromes, obstacles, terrain) and CSV, per AIRAC cycle **[V]**; reuse regulated **[?]**.
- **Italy (ENAV)**: eAIP after free registration **[V]**; AIXM feed (SWIM) probably under contract **[?]**.
- **Netherlands (LVNL)** (<https://geoportaal.lvnl.nl/datasets>): free CSV, KML, GeoJSON **[V]**.
- **Military**: R / D / TRA / TSA zones in the civil datasets; no public digital equivalent of the RTBA found **[?]**.

## United States (FAA) — public domain

- **NASR** (28-day subscription, no account): AIXM 5.1, special use airspace (SAA) in AIXM 5.0, CSV, shapefile;
  **military training routes (MTR IR / VR / SR)** in CSV **[V]**. Manual download (the website rejects robots).
- **CIFP** (ARINC 424) free, 28-day cycle **[V]**.
- **ADDS — ArcGIS Open Data** (<https://adds-faa.opendata.arcgis.com/>): special use airspace (MOA, R, W, A, P),
  MTR segments, airspace classes, navaids and points, in **GeoJSON**, CSV, KML, shapefile **[V]**; CORS likely **[?]**.

## Aggregators

- **openAIP**: **CC BY-NC 4.0** (non-commercial, attribution) **[V]**; daily exports per country in GeoJSON / OpenAir
  (`https://s3.openaip.net/openaip-system-exports/{cc}_{layer}.geojson`), MTA, MTR, TRA, TSA types included **[V]**;
  uneven quality (community data); CORS not tested **[?]**.
- **OurAirports** (<https://ourairports.com/data/>): public domain, aerodromes, runways, navaids; no airspaces **[V]**.
- **X-Plane**: the simulator's navigation data (earth_nav, fix, awy, **earth_mora.dat**: worldwide MORA grid) —
  to be read on the user's machine only, licence not specified **[?]**.
- **Navigraph / Jeppesen**: personal licence, no redistribution; reading on the user's machine only **[V]**.

## Recommendation

- Keep the current model: the file is **downloaded by the user** and imported (remembered folder), with no
  request from the page to the official websites.
- Add a generic **AIXM 5.1 reader**: United Kingdom, Spain, Germany (if accessible), United States in part.
- **United States**: the simplest and most complete — ADDS GeoJSON (SUA, MTR, classes) and NASR; the **MTRs** are
  the closest equivalent of the RTBA; public domain: extracts can even be shipped with the suite.
- **United Kingdom**: AIXM 5.1 from NATS; military in PDF (OGL), to be extracted.
- **Rest of Europe**: **openAIP** per country (non-commercial use, attribution), supplemented by the national AIXM when it
  is free; military: R / D / TRA / TSA zones only.
- **MORA grid**: computed as today, or read from X-Plane's `earth_mora.dat` on the user's machine.
- **To check before developing**: NATS reuse conditions, CORS of ADDS and openAIP, DFS licence.
