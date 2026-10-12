## Pass of 8 October 2026 (night, `develop`)

**Measurement.** `tools/perf_audit.html`, server mode, one run before (`runs/2026-10-08_avant.json`) and one after
(`runs/2026-10-08_apres.json`), tab in the foreground. Comparison over the six pages common to both routes (My
missions, Planning, registry, generator, studio, Maintenance); the route now also covers the report, reporting,
Today, the Board and the home page (report pages renamed: the old route opened two pages returning 404). A single
run on each side: the counters are exact, the timings are read as trends.

| | before | after |
|---|---:|---:|
| JSON parses | 1,525 | 400 (−74%) |
| long tasks | 942 ms | 50 ms (−95%) |
| timer delay (page blocked) | 1,995 ms | 411 ms (−79%) |
| design decorations | 43 passes, 670 ms | 31 passes, 255 ms |
| block icons | 434 ms | 291 ms |
| largest DOM (Maintenance) | 11,300 elements | 4,563 |

**What was done.**

- Aeronautical zone settings parsed once as long as they do not change (1,122 parses when opening
  Maintenance, `aero_zones.js`).
- Editable database tables paginated by 100 rows, choice lists computed once per column
  (`data_admin.js`).
- Automatic backup of browser data: when leaving a page, a quick fingerprint of the raw texts instead of
  parsing everything and rebuilding the YAML; nothing is built without an authorised folder (`browser_store.js`).
- Zone activations: table of imported zones built when its panel is opened, zone list on the first entry
  into a field (`odv_activations_editor.js`).
- Decoration: the full-load pass merged with the height-change passes, the one-second pass only if the layout
  has changed (`design_deco.js`); icons: `refresh(racine)` limited to the root
  (`block_icons.js`).
- In parallel ("Simplification" session): Planning without a burst of 404s, Studio completion lists built on
  focus (13,000 fewer options), SIA base cities kept separate.

**What remains.** The remaining 404s come from the test bench (missing files: `aircraft_positions.json`, SIA) and, in
a git workspace set up as a "worktree", from `.git/HEAD` (a file, not a folder); nothing on the user side. Storage
reads (`getItem`, ≈ 8 MB per route, mostly the outbox re-read for every file in the pool) are string copies
without parsing: a few milliseconds. First renders stay under 220 ms on this machine; slowness felt elsewhere is
measured in the profile concerned (same tool, exportable measurements).

## Summary (4 October 2026, branch `feature/perf-audit`)

**What was done.** The seven priority-1 actions of the plan, plus two fixes found by the "after" audit: a
memoised read that read a missing key twice (routing settings: 440 JSON parses each time the registry was
opened) and a search for translation prefixes that went through every known line for each unknown text (now
indexed by first word).

**How it is measured.** Same click route (My missions, ODV, registry, generator, studio, report, Settings), with a
server and without a server (folders simulated as under `file://`). Before and after **alternated** (before, after,
before, after…), three runs each, **median per step**, page visible, same probe on both sides. Timing variations
of the same measurement from one run to the next reach ±30% on this machine: only the counters (requests, parses,
openings…) are exact; the timings are read as trends.

**Route gains** (totals, server / no server):

| | before | after |
|---|---:|---:|
| IndexedDB openings | 213 / 51 | 17 / 19 (−92% / −63%) |
| JSON parses | 690 / 5,296 | 465 / 435 (−33% / −92%) |
| requests | 146 / 129 | 79 / 110 (−46% / −15%) |
| 404 requests | 86 / 9 | 15 / 9 (−83%) |
| translation passes | 236 / 247 | 79 / 84 (−67%) |
| translation time | 709 / 727 ms | 140 / 141 ms (−80%) |
| observer callbacks | 1,365 / 1,831 | 570 / 817 (−58%) |

**What did not change.** Blocking time (long tasks) stays at ≈ 255 ms over the whole route: it comes from the
map studio (≈ 300 ms at load, building the SIA base) and from Settings, which were not touched. Storage
reads (`getItem`) are stable: they remain, but are no longer followed by a JSON parse. Cost of the
observers themselves: 1 → 5 ms over the whole route (the single translator records the modified nodes), negligible.

**Scaling.** Two curves change slope:

- route estimation: 22.8 → 0.9 ms per estimate at 2,400 missions (× 25), and the registry is no longer re-parsed on
  every estimate;
- translation: 290 → 24 ms per pass at 8,000 texts (× 12); extrapolated to 30,000 texts: 0.95 s → 55 ms.

The others are **unchanged** (linear, not addressed) and give the next breaking points:

| Case | Today | At 20,000 | Troublesome threshold |
|---|---|---|---|
| Report registry (a single `missions.yaml`) | 13 ms (100 reports) | ≈ 2.5 s on each report / reporting page | ≈ 3,000 reports (0.5 s) |
| ODV grid (50 pilots × 21 slots) | 7 ms (500 assignments) | ≈ 240 ms per displayed week | ≈ 40,000 assignments |
| Browser registry (≈ 2.7 KB per mission) | 219 KB (73 missions) | — | **browser storage quota** (5 to 10 MB depending on the browser; the measurement panel accepts more, so the bench does not see it): reached between ≈ 1,900 and 3,800 missions, and writing the registry then fails **without any message** |
| Assignment index (My missions) | < 1 ms | 17 ms | not before 100,000 |

**Proposed next** (priority 2 of the plan, to be decided): a lighter browser registry (≈ 0.5 KB per mission instead
of 3 KB, details read from the files — pushes the quota beyond 10,000 missions — and a warning if the
write fails); report registry split by year with an
index; ODV grid indexed by pilot and by day; mission folder signatures written to
`data/missions/` so that another machine benefits from incremental re-reading; and, outside the plan, building the
map studio's SIA base as a background task (the only notable blocking point remaining).
