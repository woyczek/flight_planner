# DFS (Germany): licence request for the "ED Procedure" data set, ready to send (25 October 2026)

*Abandoned on 28 October 2026 (user: « dfs on oublie totalement ») — kept as a record, nothing to send.* *For the owner to send. The session sends nothing, downloads nothing from DFS and writes no converter before the licence is in hand.*

## 1. Who to write to

- **data@dfs.de**: the contact printed on every page of DFS's *REST-API aip.dfs.de/datasets* documentation (`aip.dfs.de/datasets/documentation/rest_api_documentation.pdf`,
  edition 10 January 2023, read on 25 October 2026). The legal notice of the datasets page says to "contact the Aeronautical Information
  Services of Germany (DFS Deutsche Flugsicherung GmbH) to obtain a licence" without giving an address; `www.dfs.de` (where its
  contact page lives) is refused to the cloud session, so the owner may check there whether another address is preferred for licences.
- The terms being asked about (read on `aip.dfs.de/datasets`): "AIS Products may be used for aviation purposes only by the organisation to
  which they were issued. Except as permitted above, no part … may be reproduced, stored in a retrieval system, transmitted, redistributed,
  republished or commercially exploited in any way without the prior written permission of the Aeronautical Information Services of Germany."

## 2. The text (fields in *[brackets]* to fill; both languages say the same)

**Subject / Betreff:** Licence request — AIXM 5.1 data set "ED Procedure", non-commercial flight-simulation use / Lizenzanfrage — AIXM-5.1-Datensatz „ED Procedure“, nicht-kommerzielle Flugsimulation

**English**

> Dear Sir or Madam,
>
> I am *[your name]*, responsible for the internal tools of *[name of the virtual airline]*, a non-commercial virtual airline whose
> members fly with flight-simulation software. We are building a small private web application that shows a pilot the planned route and
> fuel of a simulated flight, and we would like it to draw the published SID, STAR and instrument approach procedures of the German civil
> aerodromes concerned by the flight.
>
> On aip.dfs.de/datasets we found the data set "ED Procedure" (AIXM 5.1, SID, STAR and IAP with associated legs), and we have read the
> copyright notice of the page. We therefore ask for a licence for the following use:
>
> 1. We would download the data set "ED Procedure" through your REST API once per AIRAC cycle (about once every 28 days), and, because the
>    legs refer to fixes, the data sets of designated points and navaids if they are needed to place them.
> 2. We would convert it, automatically, into our own simple file format (procedure name, runway, transition, ordered fixes with
>    coordinates, altitude and speed constraints) and keep the original and the converted files **only in a private repository of the
>    airline**, readable only by its members; **no redistribution, no publication, no commercial use**.
> 3. The application would show the procedures to those members with the mention "Source: DFS Deutsche Flugsicherung GmbH, AIP Germany,
>    AIRAC *[cycle]*" and the label "For flight simulation only — not for navigation", and would never claim the data to be current beyond
>    its AIRAC cycle.
> 4. For automated tests of our converter we would like to keep, in a **public** code repository, a few lines (one procedure) of the
>    data set as a test sample. If you do not allow this, we will not.
>
> May we do so, under which licence, and is there a fee for this non-commercial, simulation-only use? If a different contact or form is
> required, please tell me where to address the request.
>
> Kind regards,
> *[your name, role, e-mail]*

**Deutsch**

> Sehr geehrte Damen und Herren,
>
> ich bin *[Ihr Name]* und verantworte die internen Werkzeuge von *[Name der virtuellen Fluggesellschaft]*, einer nicht-kommerziellen
> virtuellen Fluggesellschaft, deren Mitglieder mit Flugsimulationssoftware fliegen. Wir entwickeln eine kleine, private Webanwendung, die
> einem Piloten die geplante Route und den Kraftstoff eines simulierten Fluges zeigt, und möchten, dass sie die veröffentlichten SID-, STAR-
> und Instrumentenanflugverfahren der betroffenen deutschen zivilen Flugplätze darstellt.
>
> Auf aip.dfs.de/datasets haben wir den Datensatz „ED Procedure“ (AIXM 5.1, SID, STAR und IAP mit zugehörigen Legs) gefunden und den
> Urheberrechtshinweis der Seite gelesen. Wir bitten daher um eine Lizenz für folgende Nutzung:
>
> 1. Wir würden den Datensatz „ED Procedure“ einmal je AIRAC-Zyklus (etwa alle 28 Tage) über Ihre REST-API herunterladen und – da die Legs
>    auf Fixes verweisen – bei Bedarf auch die Datensätze der Designated Points und Navaids, um diese zu verorten.
> 2. Wir würden ihn automatisch in ein eigenes, einfaches Dateiformat umwandeln (Verfahrensname, Piste, Übergang, geordnete Fixes mit
>    Koordinaten, Höhen- und Geschwindigkeitsbeschränkungen) und die Originaldateien wie die umgewandelten Dateien **ausschließlich in einem
>    privaten Repository der Fluggesellschaft** aufbewahren, das nur ihre Mitglieder lesen können; **keine Weitergabe, keine
>    Veröffentlichung, keine kommerzielle Nutzung**.
> 3. Die Anwendung würde den Mitgliedern die Verfahren mit dem Hinweis „Quelle: DFS Deutsche Flugsicherung GmbH, AIP Deutschland, AIRAC
>    *[Zyklus]*“ und der Kennzeichnung „Nur für Flugsimulation – nicht für die Navigation“ anzeigen und die Daten nie über ihren AIRAC-Zyklus
>    hinaus als aktuell darstellen.
> 4. Für automatische Tests unseres Konverters möchten wir in einem **öffentlichen** Code-Repository wenige Zeilen (ein Verfahren) des
>    Datensatzes als Testbeispiel behalten. Sollten Sie dies nicht gestatten, verzichten wir darauf.
>
> Dürfen wir dies tun, unter welcher Lizenz, und fällt für diese nicht-kommerzielle, reine Simulationsnutzung eine Gebühr an? Falls ein
> anderer Ansprechpartner oder ein Formular vorgesehen ist, bitte ich um einen Hinweis.
>
> Mit freundlichen Grüßen
> *[Ihr Name, Funktion, E-Mail]*

## 3. What the owner decides / does

1. Fill the brackets (name, airline, cycle), check the address, send the text (English, German or both in one mail).
2. State clearly in the mail that the use is **private, non-commercial, simulation-only**: it is the whole basis of the request.
3. Forward the answer to the session. **Without a written licence nothing below is done.**

## 4. What will be done on receipt of the licence (in this order, one commit each)

1. **Read the licence** and write its conditions into `LICENSE.md` (DFS row) and into the data files' `notice`: required mention, label,
   cycle limit, what may stay in the public code repository (question 4 of the request).
2. **Download** (by the owner's workstation or an authorised host; `aip.dfs.de` is already reachable): `GET https://aip.dfs.de/datasets/rest/`
   (the metadata JSON, four amendments: 0 now, 1 next, 2 after, 9999 snapshot), pick the leaf **"ED Procedure"**, its AIXM 5.1 release and
   `filename` for amendment 0 (the file name changes at each AIRAC), then `GET https://aip.dfs.de/datasets/rest/{Amdt}/{filename}`;
   **verify the `sha512`** of the metadata; keep the file in the private data repository (never the code repository).
   Today's file: `ED_Procedure_2026-09-03_2026-10-01_revision.xml`, effective 1 October 2026.
3. **Write the converter on the real file** (`tools/proc_dfs.py`, standard library: `xml.etree` streaming, the file may be large): the
   features `StandardInstrumentDeparture`, `StandardInstrumentArrival`, `InstrumentApproachProcedure` and their legs → `SID` / `STAR` /
   `APP` of the common schema (mapping planned in `EUROCONTROL_REQUEST.md` § 2), points placed from the fixes the legs reference
   (`xlink:href` to a designated point or navaid: the DFS data sets for those, or `AeroDB.coords`), `source.kind: 'dfs'`, status
   `official`, `source.ref` = file name, cycle from the effective date, DFS's own warning kept ("SegmentLeg data for some procedures might
   be incomplete": the incomplete ones are reported in `warnings`, not guessed).
4. **Test** with an excerpt only if the licence allows it; otherwise with a hand-built AIXM fragment marked as such and checked once
   by the owner on the real file.
5. **Publish** `proc/<cycle>/ED**.json` by the owner's command (same as the others), the `notice` shown wherever the procedures are shown.
6. The Maps agent draws them like the others (nothing specific to DFS).

Until then: nothing is downloaded, converted or stored.
