# Bug log

Bugs reported (by the user or found while working): open ones first, then closed ones, newest first. Kept by the
"BUGS SOG" session; one line per bug, the cause in a few words, the commit of the fix. Features and technical debt are
not listed here (CHANGELOG, `docs/technique/perf/SYNTHESE.md`). Dates are day/month (2026); UI labels are quoted as the
English interface shows them.

## Open

| Reported | Area | Bug | Status |
|---|---|---|---|
| 07/10 | First run | "villes_geonames.csv not found: no city names" while building the aeronautical database | Not reproduced. Since 079ca0af: two attempts, then address and reason (HTTP code, network, folder) in the report — to be captured if it happens again. |
| 08/10 | All pages | About 4 s before the page responds, in the user's Chrome profile | Not reproduced on the development machine (first paint < 220 ms). To measure in the profile concerned: `tools/perf_audit.html`, "Export the measurements (JSON)". |

## Closed

| Reported | Area | Bug | Cause | Fix |
|---|---|---|---|---|
| 12/10 | Registry (mission card), en / de / es | "Estimated time": texts left in French | Estimate panel hard-coded in French; calculation phrases stored in French in the registry | Panel texts in 4 languages, calculation phrases translated on display (`mission_estimate.js`) |
| 12/10 | Header (localhost:8000) | "Save (38)" does nothing | Remembered backup folder ("local") no longer authorised, or gone: the browser's access request and the errors were only reported in the closed ☰ menu | Notifications: access request, backup written, fallback download, folder not found, errors (`browser_store.js`) |
| 12/10 | Mission registry | Still "missing files" artefacts (index already filled, never purged) | "Missing file" only set by re-reading an authorised folder; "Clean up the registry" restricted to Expert and re-reading that folder first | Present folders read from the launcher on opening, clean-up without an authorised folder, button shown as soon as there is something to clean; page robust to incomplete entries (`mission_registry.js`) |
| 09/10 | Settings › Maintenance (databases), de / es / en | The French label "Base" had two meanings (an aircraft's home airfield column, the "Base" menu group) and a single translation ("Datenbank") | Translation keyed on the exact French text | Labels split by the Simplification session: group "Reference and log", column "Home base" |
| 09/10 | Header (Landings, Aqua, 1,400 px) | "Print / PDF" covered "Choose files" | Shared header tools (Synchronise, "Save to folder (184) · last: …", language, ☰) could not shrink, line without wrapping | Page fixed (Simplification); shared header: short backup label, first line wraps (`browser_store.js`, `repository_nav.css`) |
| 09/10 | First run | Sends back to the home page, in a loop (DEFA-fable) | After "Finish", any opening without `?force` (Settings › First run link) went back to the home page | Redirect only for the page opened by the launcher (`?t=`) (`premier_lancement.html`) |
| 09/10 | Mission registry | Many artefacts with missing files; the index did not show in the caches | Outdated served registry (55 of 67 folders missing) taken as is on first start; cache row named "Data index" | Missions taken only if their folder exists (`/__setup/mission-folders`, `data_index.js`); label and number of missions in Caches |
| 09/10 | Aeronautical data | "Download ✗ unknown provider: nat" | Launcher started before the provider was added: old `aero_fetch.py` in memory | Module reloaded when its file changes (`launch.py`, `fresh`) |
| 09/10 | Launcher (data on another drive) | Data files never received ("Failed to fetch") | Version-stamp check: no relative path between two drives, exception, response cut | File outside the suite served as is; no error of the check cuts a response (`version_stamps.py`, `launch.py`) |
| 09/10 | Aircraft types | A400M without performance | Alias "A400 → A4M" (in-house code) diverted the ICAO designator A400: performance looked up under A4M | Alias turned the right way (A4M, A400M → A400); `update_aircraft_db.py` reverses any alias that diverts an official designator — 3652f13dd (Features SOG) |
| 09/10 | Aircraft types | "A330" classed as "other" (default icon) | Family name, neither designator nor alias | "A330" → A332 (the missions' A330 is the MRTT, an A330-200) in `AircraftCatalog.codeOf` |
| 09/10 | Aircraft types ("Where things stand") | "A330 MRTT Phénix", "C-130J-30 Super Hercules", "H225M Caracal", "Rafale B — Patrouille de 2": ICAO sheet missing | Usage names without code or alias in the machine's database; three partial resolvers in the suite | Shared resolver `AircraftCatalog.codeOf` (`aircraft_catalog.js`) |
| 09/10 | First start (registry, Maintenance…) | "0 / no mission" although the registry is full | Browser mission index only filled by re-reading the "Missions" folder | Empty index: served registry (`data/missions/mission_registry.yaml`) taken over (`data_index.js`) |
| 09/10 | Aircraft types (sample missions) | "Missing" ICAO codes: "MIR2 Mirage 2000B", "A400M Atlas" | Mission name (code + name, or name only) compared as is with the codes; H225M alias missing | Name brought back to its code (`alias`, `maintenance_page.js`); aliases H225M / EC725 / Caracal → EC25 |
| 09/10 | Studio, Flight maps | Editing the map profile: the preview no longer refreshed automatically | Not a deliberate removal: in 4.2.0 (4285e9f6), "Profile settings" moved under the Route block preview, outside `#profileEditor` whose `change` listener refreshed the preview | Listening at document level, filtered on both containers (`map_parser.html`, `map_planner.html` regenerated) |
| 09/10 | Aeronautical data (DIRCAM) | After importing the MILAIP ENR 5.7, the XML was not saved without one more click | Writing reserved to the "Write miam-enr-5-7-tracks.xml" button | Written straight after the import, button kept only if writing fails (`maintenance_page.js`) |
| 09/10 | Launcher, all pages | Textures of the material designs gone after a clone (seen on 2aa52752) | Clone made without Git LFS: images, textures and fonts left as pointers | Checked at every launch: `git lfs pull`, or instructions in the launcher window and on the first-run page (`launch.py`, `update_suite.py`) |
| 09/10 | First run → My profile | IVAO ID entered at first run missing from "Identity and networks" | "Pilot" card saved only by "Save the profile": entry lost when moving on | Saved whenever a field is left (`premier_lancement.html`) |
| 09/10 | Aeronautical data | X-Plane "Choose the folder…" still in "Actions to do" once the folder is chosen | Line due to a permission to renew or an old "Custom Data" cycle, always with the same useless button | "Re-authorise the folder…" or plain information on the cycle (`aeroTodo`, `maintenance_page.js`) |
| 09/10 | First run, aeronautical data | "X-Plane folder not chosen" when recomputing the MORA; unnatural sequence (the user does not choose an X-Plane folder, they move on to ICAO types) | X-Plane source, optional for a zone with a computed MORA, treated as missing; "X-Plane MORA" button active without a folder, chaining nothing | X-Plane "optional" (required only for a zone that is too large), button chaining folder, database, MORA (`maintenance_page.js`) |
| 09/10 | Planning, Board (zones block) | VATSIM / IVAO columns of the activations turned into untitled nested blocks (reported by Features SOG) | Columns written as `<section>`, which the framework takes for blocks | `<div>` in `odv_activations_editor.js` |
| 09/10 | Settings › Maintenance | The "Aircraft types" section shows for an instant on opening, then disappears | The database editor opened its first section before the page opened "Updates" and hid it | Maintenance page without `?base=`, or block requested (`?m=`): no section rendered by the editor (`data_admin.js`) |
| 08/10 | Board | Ferry strip reset (computed time, "to be assigned") when a mission is edited | The recalculation removed any strip it could not recompute at that moment (mission missing from the registry, airfield without coordinates), then recreated it | 3ca27ab5 |
| 08/10 | Board | Strip pilot erased when its window is saved | Pilot not in the member list: no option in the list | 3ca27ab5 |
| 08/10 | Blocks (all pages) | Blocks could not be reordered; target block not highlighted outside the Metro design | Order remembered per container badly read back, highlight hidden by the material designs | d38232a6, 2a36c5d4 |
| 08/10 | All pages | Page slow to respond (1 to 3 s) | Synchronisation state read through git on every page, twice | 0c5c9aa9, 9dd9859d |
| 08/10 | First run | "Suite launched from …, declared folder …/planner/" although the folder is right | Performance profiles folder of another copy kept from one installation to the next | 531ff3cf |
| 08/10 | Settings | Frozen pages ("page unresponsive") with an airline other than SO Group Virtual | Renaming by an observer rewriting texts identically, in a loop | de7c4788 |
| 08/10 | Settings › Maintenance | Update check: "behind" although the local commit is ahead | Local commit read from a remembered record instead of the served commit | 4c1301a8 |
| 08/10 | Aeronautical data | Wrong number of MORA cells for a zone (France 133 instead of 74) | Small islands counted | 6d33ad10 |
| 08/10 | First run | `data/` folders not derived when the data arrive after the folder is chosen | Derived only once | 842f8dad, 0bfa90af |
| 07/10 | First run | Index page instead of the first run; data installed before the application folder was chosen | Order of the steps | 56746f5a |
| 07/10 | MORA | Spurious terrain spikes (south Réunion 20,100 ft) | Aberrant terrain pixels | 5046f77f |
