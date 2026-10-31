# missions — integration

What the module will read and write, and how the other modules meet it. The rules are in [SPEC.md](SPEC.md).
**Status: lot 2 reduced built (31 Oct 2026): the module reads `missions/mission_registry.yaml`, the mission files and
`cr/reports/`; it writes nothing. The two `cache/missions/` files below are not written yet (§ 5–6).** The module's
`meta.reads`: `missions/`, `cr/`. « Préparer ce vol » is the address `#fuel?mission=<id>` (frame INTEGRATION, the table of
addresses).

## Files

| Path | Who writes | Rule | Read by |
|---|---|---|---|
| `missions/mission_registry.yaml` | the CPCO (V2 today) | the list of the airline's missions, read once per mount | missions |
| `missions/<LETTER>_<FAMILY>/<ID>/mission<ID>.yaml` (+ `summary<ID>.md`, `cartes/`) | the CPCO (V2 today) | one mission, read when opened; **never written by this module** | missions, maps (drawing), fuel (through `missionFlight`) |
| `missions/affectations.json`, `missions/<…>/<ID>/affectations.yaml` | the CPCO (V2 today) | the assignments; the crew's rendezvous of SPEC § 6 is added here, by the CPCO | missions, flightlog |
| `cache/missions/read.json` | missions | `{ <id>: read_at }`, the device's own "lu" (policy cache) | missions |
| `cache/missions/status.json` | missions | one status line (assigned missions with a rendezvous in the next seven days), `go: '#missions'` | frame (status block) |

- Pure rules in `frame/lib/mission.js` (reader of the three V2 shapes, `missionFlight(mission, assignment?)`, `pagesOf`),
  benched without a browser.

## Addresses

- `#missions` opens the list; `#missions?id=<ID>` opens one mission; `#missions?id=<ID>&p=<n>` the reader at page n (the
  page is part of the address, SPEC § 5). `?id=` is not consumed: it is the module's own state, kept on reload.
- "Préparer ce vol" hands the flight to Fuel through Fuel's own door "Nouveau vol : depuis une mission" (`#fuel?mission=<ID>`,
  consumed by Fuel with `ctx.consume('mission')`, frame/INTEGRATION.md § 6.1); the module writes no flight.

## Contracts with the other modules

- fuel: consumes `missionFlight(mission, assignment)` (SPEC § 4) and writes the flight with `flight.mission = <ID>`.
- maps: draws a mission's points, zones and rendezvous from the same reader (SPEC § 8, lot 4); no event between modules.
- flightlog / report: a report carrying `mission: <ID>` makes the mission "volée" for this pilot (SPEC § 3).
- frame/design: `envelope()` and `book()` primitives (SPEC § 5), used by this module and later by the CPCO's registry.
