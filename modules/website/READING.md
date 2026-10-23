# website — reading of the DEFA Virtual website as V2 uses it (lot 1)

*23 October 2026. From `shared/defa_site.js`, `shared/mission_core/defa_log.js`, the hand-off in
`shared/mission_core/core.js` (now `modules/report/website_handoff.js`), `AircraftDB/update_fleet.py`,
`tools/defa_reference.py`, `tools/launch.py` (`/__setup/defa-site`). No code. Pages saved by the user are data, read
only with `python -I` from a folder of their own. Decisions: [DECISIONS.md](DECISIONS.md).*

## 1. The site as it is (no API)

| Page (path under the site) | Access | What it holds | V2 use |
|---|---|---|---|
| Fleet `/flotte.php` | public | one row per aircraft: operator, type, variant, registration, tactical number, number, callsigns, base, operational, location (and its date) | launcher download once a day, or paste / saved page → `AircraftDB/update_fleet.py` → `data/references/aircraft_fleet.js` |
| Flight log `/log_vols.php` | public | table of 9 columns: date, duration, trigram, callsign, registration, aircraft, departure, arrival, mission | paste, "→ Journal" bookmark, saved page or CSV → `defaFlightLog:v1` (browser); aggregates → `data/references/defa_reference.js` (`tools/defa_reference.py`, no flight rows) |
| Aircraft page `/appareil.php?id={id}` | public | one aircraft, link "Add a flight" | the "→ Vol" bookmark follows it |
| Record a flight `/selection_appareil.php` → `add_flight.php` | **pilot's session** | aircraft list (links `?id=`, text = registration), then the form: `reg`, `nom_appareil`, `callsign1` (select), `callsign2`, `date`, `hdv`, `mission`, `depart`, `arrive` (some read-only) | report opens it with `#defa=` (base64url JSON, never sent to the server); "→ Vol" fills by field name, compares read-only fields, never submits |
| Home, maintenance, statistics | public | not used | — |

Site address and page paths: `config/repository_tree` (`va.pages`, `sources.defa.url`), overridable per browser
(`suiteVA:v1`). The site's aircraft ids are not stored: the bookmark finds the link by registration.

## 2. What the module keeps and where

- **Airline setting** `airline/settings.json` (record, data repository, airline-wide): `{ name, site, pages: {
  recordFlight, log, fleet, aircraft } }`, the frame's `ctx.airline`. Edited on a workstation in the module's settings
  screen (address and paths only; never a login).
- **My flight log** `pilot/<trigram>/site_log.json` (flightlog SPEC § 3): the module reads a **pasted** log page (HTML
  from the clipboard first, tab-separated text fallback — V2's parser), keeps the rows of my trigram, writes the record
  whole. Never fetched from the site by the browser (another origin, no CORS); a launcher may download the public page
  later through the frame's relay.
- **Airline fleet** `airline/fleet.json` (record: `{ schema, updated_at, aircraft: [ { registration, type, variant,
  operator, tacticalNumber, number, callsigns, base, operational, location, locationAt } ] }`): pasted fleet page,
  V2's merge rules (page rows replace same registration, extra callsigns kept, absent aircraft kept). Read by report
  (registration → type, callsign series), maps and CPCO; `references/aircraft_fleet.js` stays V2's until the bridge
  or CPCO switches.
- **"Record the flight"**: the function report calls, `recordUrl(airline, fields)` with `flightFields(mission)`, the
  copy line and the "→ Vol" bookmark — `modules/report/website_handoff.js` today, moved to `frame/lib/website.js`
  (owner website) since a module never imports another; report keeps one button.

## 3. Rules

No POST from the suite to the site; never the pilot's authentication (the pilot logs in on the site, the bookmark
never submits); no address in the code (airline setting); downloaded pages and exports are data, parsed by the
module's pure functions, by `python -I` in a folder of their own when a tool reads them.

## 4. A future PHP web service, as a frame transport, by lots

1. **Read-only**: `GET /api/fleet`, `GET /api/log?pilot=…&since=…` (JSON of the two public tables) — replaces pasting.
2. **Records for one pilot**: `POST /api/flights` from the site's own session (the pilot logged in on the site): the
   suite would still never post; the site would read a hand-over the pilot carries (the `#defa=` fragment), so "→ Vol"
   becomes a button of the site.
3. **Data transport** of the frame: `head`, `tree`, `read`, `commit` (frame SPEC § 2.6) on the airline's data
   repository, behind a device token — when the site's owner opens it; reports, flight logs and CPCO data in batches,
   never per click.
