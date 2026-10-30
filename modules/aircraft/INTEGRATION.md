# aircraft — integration

What the module reads and writes, and how the other modules meet it. The rules are in [SPEC.md](SPEC.md).

## Files

| Path | Who writes | Rule | Read by |
|---|---|---|---|
| `airline/fleet.json` | aircraft (one aircraft per write, the file read just before), website (the pasted « Flotte » page, its V2 merge) | `record` on both sides (frame/INTEGRATION.md § 3, shared prefix) | aerodb's registry (fleet), report, maps, CPCO |
| `aircraft/sheets/<id>.json` | aerodb only (`aircraft().sheets.put`), called by this module from step 3 | aerodb's `mergeSheets` | aerodb, Fuel (quote), lnmperf |
| `cache/aircraft/` | aircraft | cache (this device) | aircraft |

- The fleet's record is `{ schema: 1, updated_at, by, aircraft: [{ operator, type, variant, registration, tacticalNumber,
  number, callsigns, base, operational, location, locationAt }] }` (website SPEC § 3). The editor carries registration,
  type, variant, operator, callsigns, base, tactical number and « en service »; the other fields (location, its date, the
  site's number) are kept as they are on an edit.
- `modules/aircraft/fleet.js` holds the rules (normalize, changed, upsert, retire, matches), pure.

## Addresses

- `?app=maintenance#aircraft` opens the module; `#aircraft?sheet=<id>` will open a sheet's editor (step 3), the link Fuel's
  « Fiches » list gives for any change (SPEC § 5).
