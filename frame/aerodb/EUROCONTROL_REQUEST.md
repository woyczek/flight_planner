# EUROCONTROL — instrument flight procedure data sets: assessment and access request (25 October 2026)

*For the owner of the repository to read, adapt and send. The session that wrote it created no account and sent nothing. It could not
open EUROCONTROL's AIXM Confluence (`ext.eurocontrol.int/aixm_confluence`): the site answers HTTP 403 (Cloudflare "Sorry, you have
been blocked") to the cloud container, so the content of its data-set pages is known only from search-engine extracts, and the
pages must be read from a normal browser.*

## 1. What is known (and from where)

| Fact | Source | Certainty |
|---|---|---|
| The AIXM Confluence country pages (e.g. "Germany") list data sets in AIXM 5.1.1, among them an **Instrument Flight Procedures** set called "Procedures", as SNAPSHOT and BASELINE time slices (menu NOW / NEXT / AFTER), with a checklist of checksums and a website with a REST API | search extracts of `ext.eurocontrol.int/aixm_confluence/display/AIX/Germany` | secondhand; the page quoted is the German one, so the pan-European scope is **not** established |
| Sample sets exist with SID / STAR / instrument approaches: Skyguide (Switzerland, AIXM 5.1, 2013, "for testing only", links reported broken), Poland (AIXM 5.1, 2018, SID / STAR "high level" **without legs**) | same, pages "Switzerland" and "Poland" | secondhand; AIXM 5.1, not 5.1.1 |
| The SIA (France) AIXM 5.1 sample is a 2017 experiment, no longer maintained; a full AIXM 5.1.1 data set is announced without a date | `docs/technique/V3_ROUTES_PROCEDURES_ETAT.md` § 4 | from an earlier reading |
| The EAD (European AIS Database) offers the full AIP data (procedures included) to **data users** after signature of an **EAD Agreement**; a data set can be delivered at each AIRAC cycle through the EAD internet filing system; use is **subject to charges**, including **royalty fees applied by the Member States when EAD data is made available to third-party end users**; there is a free public application, **EAD Basic**, for browsing, "not to be used for operational purposes" | `eurocontrol.int/service/european-ais-database` (read in full, 25 Oct 2026) | firsthand |
| The AIXM data of the EAD "converted from national AIXM 4.5" carries no more than the SIA export | `V3_ROUTES_PROCEDURES_ETAT.md` § 4 | from an earlier reading |
| FAA NASR AIXM 5.1 files cover navaids, airports, airways, not procedures | faa.gov NASR subscription pages (search extract) | secondhand |

## 2. Assessment for the suite

- The **EAD Agreement route is not suited**: charges and third-party royalties are written for AIS clients and commercial data
  users; a virtual airline's private tools are neither. Do not sign anything without reading the charges table of the page above.
- The **AIXM Confluence data sets** are the only route that may be open (public pages, checksums, REST). What is **not known**: the
  terms of use, whether a non-AIS, non-commercial, flight-simulation use is allowed, whether the data may be stored in a private
  repository and shown to the airline's own pilots, and which States have a procedures set.
- If a sample is reachable by the owner from a browser (one State, one cycle, AIXM 5.1.1, with `StandardInstrumentDeparture`,
  `StandardInstrumentArrival`, `InstrumentApproachProcedure` and their legs), put it under `frame/aerodb/test/fixtures/aixm/` (or send
  it to the session): the converter is **not written without a real sample** (no simulated input; the Polish set has no legs, the
  model is documented only by `swim-eurocontrol.atlassian.net` "Procedure (overview)").
- Planned mapping, to be checked against the sample: `StandardInstrumentDeparture` → `SID`, `StandardInstrumentArrival` → `STAR`,
  `InstrumentApproachProcedure` → `APP`; `designator` → `name`; the `flightTransition` / runway direction links → `transition` and
  `runways`; each `…SegmentLeg` (`legTypeARINC` → `leg`, `startPoint` / `endPoint` → fix by `xlink:href` to a `DesignatedPoint` /
  `Navaid` / `AirportHeliport`, `upperLimitAltitude` / `lowerLimitAltitude` and `altitudeInterpretation` → `alt`, `course`, `length`,
  `speedLimit`, `turnDirection`) → a point of the common schema (`aerodb/SPEC.md` § 5 quinquies); status `official` only if the
  provider's terms say the data is the State's published AIP data, otherwise `check`; `source.kind: 'eurocontrol'`.

## 3. Draft of the request (to adapt; English)

> **To:** the contact given on the EUROCONTROL AIXM pages (or the EAD helpdesk) — *[to be taken from the page when the owner opens it]*
>
> **Subject:** Use of the AIXM 5.1.1 "Instrument Flight Procedures" data sets — non-commercial flight-simulation / virtual airline
>
> Dear Sir or Madam,
>
> I run the internal tools of *[name of the virtual airline]*, a non-commercial virtual airline whose pilots fly with flight-simulation
> software. We build a small web application that draws the planned route and fuel for a flight, and we would like to show the
> published SID, STAR and instrument approach procedures of the aerodromes of a flight.
>
> I found that your AIXM pages list instrument flight procedure data sets in AIXM 5.1.1 (snapshot and baseline time slices, with a
> REST API). May I ask:
>
> 1. Are these data sets open to a user who is neither an AIS provider nor a commercial data user? If an account or an agreement is
>    needed, which one, and is there a charge for a non-commercial, simulation-only use?
> 2. For which States are the procedure data sets available, and is the data the State's AIP data (authoritative) or a conversion?
> 3. May we download a data set at each AIRAC cycle and keep a converted copy (waypoints, legs, altitude constraints) in a **private**
>    repository used only by the airline's own pilots, with the source and the cycle named, and **never for real navigation**?
> 4. Do you apply the Member States' royalty fees mentioned for the EAD to this use?
> 5. Is a small sample (one State, one cycle) available for development?
>
> The data would be shown with the label "for flight simulation only — not for navigation" and the source and cycle.
>
> Kind regards,
> *[name, role, e-mail]*

## 4. Next steps (owner)

1. Open the AIXM Confluence "Data Sets" pages from a normal browser; note the terms of use and which States list "Procedures".
2. Adapt § 3 and send it (or ask the questions through the contact the pages name).
3. Drop any sample in `frame/aerodb/test/fixtures/aixm/` or tell the session; then step 3's converter is written on it.

Sources: [EAD](https://www.eurocontrol.int/service/european-ais-database), [AIXM Confluence — Germany](https://ext.eurocontrol.int/aixm_confluence/display/AIX/Germany), [Switzerland](https://ext.eurocontrol.int/aixm_confluence/display/AIX/Switzerland), [Poland](https://ext.eurocontrol.int/aixm_confluence/x/Gw8LAQ), [SWIM — Procedure (overview)](https://swim-eurocontrol.atlassian.net/wiki/spaces/AC/pages/212533620/Procedure+overview), [FAA NASR](https://www.faa.gov/air_traffic/flight_info/aeronav/Aero_Data/NASR_Subscription/2026-10-01).
