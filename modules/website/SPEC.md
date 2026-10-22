# website — specification (regeneration prompt)

This document describes the V3 website module ("Website", level 2) completely enough to rebuild it without seeing its
code. Reference implementation: `modules/website/module.js` (the screen) and `modules/website/model.js` (pure); the
"record the flight" hand-off used by report is `frame/lib/website.js` (owned by this module). How the frame mounts it:
[INTEGRATION.md](INTEGRATION.md). Choices: [DECISIONS.md](DECISIONS.md). The site as V2 uses it: [READING.md](READING.md).

**As a prompt**: ask for ES modules for the frame's loader; section 6 always wins.

## 1. Purpose

Everything between the suite and the airline's website, which has no API: its flight log and its fleet brought in by
pasting their public pages, the airline setting (site address and pages), and the "record the flight" hand-off.

## 2. My flight log (`pilot/<trigram>/site_log.json`)

- Paste the website's "Log des vols" page (the clipboard's HTML first — table cells and aircraft links —, else the
  copied text with tabs, else CSV with recognised headers, else JSON); "Paste from the clipboard" reads it directly.
- Rows (V2 `defa_log.js` rule): `{ date, time, durationMin, trigram, callsign, registration (with the nationality
  dash), type, variant, dep, arr, mission, siteId }` (`siteId`: the aircraft id of the site's link, when the HTML has it).
- Only my trigram's rows are kept (no trigram: said, nothing read). Key: date, time, callsign, registration, trigram;
  a pasted row replaces the same kept row; kept rows absent from the page stay (the page shows part of the log).
- **Preview before writing**: new, changed, unchanged rows and the other pilots' rows ignored, the new rows listed;
  "Save" writes the record whole `{ schema: 1, updated_at, by: 'website', entries }` (flightlog SPEC § 3), "Cancel"
  writes nothing.

## 3. Airline fleet (`airline/fleet.json`)

- Paste the "Flotte" page (HTML: operator headings and rows; text: an operator alone on its line, columns by tabs).
- Aircraft (V2 `data_admin.js` / `update_fleet.py` rules): `{ operator (spelling fixed), type, variant (A332 MRTT →
  A330 MRTT Phénix…), registration (F-XXXX), tacticalNumber, number, callsigns [], base, operational, location,
  locationAt }`; site headers and menus never taken for an operator.
- Merge: a page aircraft replaces the kept one with the same registration, keeping its extra callsigns and, same
  location, its location date; aircraft absent from the page are kept; a new location is dated now.
- Preview: new aircraft, aircraft on the page and how many change, kept outside the page, the new or changed ones
  listed; "Save" writes `{ schema: 1, updated_at, by, aircraft }`.

## 4. Airline setting (`airline/settings.json`)

`{ schema: 1, updated_at, by, name, site, pages: { recordFlight, log, fleet, aircraft } }`: the site address without
a final "/", each page a path under the site (a leading "/" added) or a full address; `aircraft` may hold `{id}`.
Edited on a computer screen (980 px and wider) in the Airline card; read only on a phone. The frame reads it and
gives it to every module as `ctx.airline` (re-read when it changes). The log and fleet cards link to their pages.

## 5. Record the flight (`frame/lib/website.js`)

`flightFields(mission)`, `recordPage(airline)`, `recordUrl(airline, fields)`, `copyLine(fields)`, `BOOKMARKLET`
("→ Vol"): report SPEC § 3 bis. Self-contained (its own time helpers).

## 6. Invariants

1. Never a request from the suite to the site (no POST, no download by the browser); never the pilot's login.
2. No address in the code: the airline setting only.
3. Nothing is written without its preview being accepted.
4. Pasted pages are data: parsed by pure functions, never executed.
