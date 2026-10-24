# V3 — non-regression test plan

*Written by the relay (orchestrator) session on 24 October 2026, at `v3` = `822a80312`. The plan is the intelligence:
it says **what must stay true** on every screen of the Pilot application, with the value expected and the rule it comes
from. The tests are written from it by a cheaper agent, and run by a cheaper one still, with one command. A case that
fails names the rule that broke, not a selector.*

## 0. Frame of the suite

- **Where**: `tests/v3/` — `run.py` (runner), `cases/<area>.py` (one file per area below), `lib.py` (shared helpers),
  `report.md` + `report.json` (written by each run, ignored by git), `README.md` (how to run, how to read a failure).
- **How it runs**: `python3 tests/v3/run.py [--grep <id or text>] [--designs a,b] [--widths 390,1280] [--langs fr,en]
  [--keep-server]`. The runner starts a static server itself (`python3 -m http.server`, standard library, a free port
  chosen at start, bound to 127.0.0.1) at the repository root, opens Chromium with Playwright (Python package already
  installed; executable `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `--no-sandbox`), runs every case,
  writes the report, prints one line per case (`PASS`/`FAIL`/`SKIP` + id + title), a summary line, and exits 0 only if
  nothing failed. It never needs the launcher, a data repository, the network, or a token: tiles and CDN are blocked in
  the cloud and must not make a case fail (ignore `net::ERR_*` on tile hosts).
- **Phone and screen**: a *phone* context is 390×844, `device_scale_factor: 2`, `has_touch: true`, `is_mobile` **off**
  (an oversized layout viewport otherwise breaks taps on the Cupertino bar); a *screen* context is 1280×800, mouse.
  Unless a case says otherwise, every case runs on the phone in the five designs `standard`, `metro`, `swiss`,
  `cupertino`, `material` (`localStorage['sogFrame:design'] = JSON.stringify({design, tone:'day'})` as an init
  script), in French; and once on the screen in `standard`. A case marked **×4 langs** also runs in `en`, `de`, `es`
  (`localStorage['sogFrame:lang']`). Night tone is one extra run of area A only (`tone:'night'`).
- **Seeding state**: the frame reads its cache from the browser (IndexedDB / localStorage) when no launcher answers.
  The writer finds the seeding path the module agents used (look at the benches `frame/lib/test/sheet.html`, the
  modules' `test/` folders, `docs/technique/V3_JOURNAL_SESSION_CLOUD.md`, and `frame/app.js` around
  `flightPathOf()`, `PENDING_REPORTS`, `sogFrame:*` keys) and puts it in `lib.py` as `seed_flight(page, started=False)`,
  `seed_pending(page, flights=1)`, `seed_identity(page, trigram='ABC')`. If a module has no seedable state without a
  launcher, its cases that need one are `SKIP` with the reason, never `PASS`.
- **Every case** records `pageerror` and failed console errors (other than blocked network) from page load to its
  end: any JavaScript error fails the case on top of its own assertion (rule: "pages rechargées, sans erreur
  JavaScript").
- **Ids** are stable (`A1`, `B3`…) and quoted in the report; a case may have several assertions, the report lists the
  first failed one with the measured value and the expected one.

Screens and ids: the frame page is `frame/index.html#<module>`; modules on `v3`: `fuel`, `maps`, `atmosphere`,
`report`, `flightlog`; frame screens: `#settings`, `#help?m=<module>`, `#conflicts`. Tabs (phone bar): Préparer
(fuel + atmosphere), Carte, CR, Vols, Réglages.

## A. Frame — layout and chrome (rules: `V3_SPECIFICATION.md` § 7.1, `frame/INTEGRATION.md` § 9)

| Id | Case | Expected | Rule |
|---|---|---|---|
| A1 | Every module loads | For each of the five modules, at 390 and 1280, in five designs: no `pageerror`, `document.documentElement.dataset.design` equals the design asked, no horizontal page scroll (`scrollWidth <= innerWidth`), the module root `[data-module=<name>]` (or the frame's view) is non-empty | smoke, § 7.1 rule 1 |
| A2 | Phone header | At 390: the header is 57 px high (`--f-head-h`), shows exactly the name (`#fName`), the "i" (`#fInfo`) and the gear (`#fDevice`); `#fSync`, `#fWho`, `#fLive`, `#fHelp`, `#fHost` are not displayed; "i" and gear are at least 44×44 | § 7.1 rule 3, frame lot of 24 Oct |
| A3 | Screen header | At 1280: `#fHelp` and `#fSync` are displayed (nothing changes above 760 px) | same |
| A4 | Bottom bar | At 390: `#fTabs` is displayed, has five entries (Préparer, Carte, CR, Vols, Réglages), each at least 44 px high, labels translated **×4 langs**; at 1280 the bar is hidden and the rail `#fNav` is shown | § 7.1 option A |
| A5 | Fixed module fills the view | For `maps` and `atmosphere` at 390: `html` has class `f-fixed`; the module root's top is exactly at the header's bottom (gap 0 px); its bottom is at the bar's top; `document.scrollingElement.scrollHeight <= innerHeight` (no page scroll) | § 9.2, user "la vue carte doit être fixe" |
| A6 | Non-fixed module scrolls normally | For `fuel` at 390: `html` has no `f-fixed`; the page may scroll; the header stays visible after scrolling 400 px (sticky) | § 9.2 |
| A7 | Group popover | On `#fuel` at 390: a second tap on the active tab "Préparer" opens a popover with rows Carburant and Atmosphère, each ≥ 44 px high, within the window and above the bar; the current row has `aria-current`; tapping Atmosphère goes to `#atmosphere` and closes it; Escape closes it; a tap outside closes it. On `#maps` (single-module tab) a second tap does nothing and keeps the hash and query (`#maps?x=1` stays) | frame lot, § 7.1 rule 4 |
| A8 | "i" pop-up | At 390: tapping `#fInfo` opens a pop-up whose rows are ≥ 44 px, whose last row is "Aide de cet écran" (translated **×4 langs**); tapping it opens `#help?m=fuel` (from `#fuel`); Escape closes the pop-up | frame lot |
| A9 | "i" badge | With nothing seeded and no trigram: the badge is amber (`data-attn`); with a seeded identity and a seeded pending flight: green (`data-badge`), amber wins when both; at 1280 no badge logic is required (just no error) | frame lot ("pastille verte et orange") |
| A10 | Night tone | `standard` at 390 with `tone:'night'`: `dataset.tone` (or the attribute the frame uses) is `night`, body background luminance is below 0.2 (dark), no error | design |
| A11 | Help screen | `#help?m=maps` at 390 and 1280: the manual of the module is shown in the current language, non-empty, **×4 langs**; Escape or the back button returns to `#maps` | help block |
| A12 | Settings screen | `#settings` at 390: opens, no error, contains the trigram field; the back control returns to the previous module | settings block |
| A15 | Aerodb loading state | At 390 with a GitHub access set (`githubData:frame`), a planned flight, nothing of the base in the cache and the API of the data repository **held** (a fake GitHub that answers when released): the sheet note says "Aeronautical database loading…" (**×4 langs**) and no note nor notification says "not published" or "access not set"; the "i" pop-up has the `base` row with the same words; once released, the loading note is gone and so is the row (the base is there); with the access removed and the cached base forgotten, the note says "Data access not set on this device" with one button "Settings" and the "i" row says it too | P5; settings 24 Oct 2026 (relais cloud) |
| A14 | Landscape on a phone | At 844×390 (touch) on `#maps` and `#atmosphere`: `html.f-land`; `#fTabs` is the rail (left 0, 44 px wide, top 57, 333 px high, five entries ≥ 44×44, no visible label, an `aria-label` each), `#fNav` hidden, header 57 px, `--f-tab-space` 0, `--f-view-h` 333; map at left 44 / top 57, 333 px high; the sheet panel is a column at the right edge, full height, 40 % of the view (≥ 280 px, 320 here), its handle line at its top, content inside it; the map takes the rest; no page scroll; the right overlay buttons share one x (no double column); no `.f-ov-exit`; a tap on the handle: 60 % (480 px), a second tap: back; full screen: header and rail hidden, root 844×390 at 0/0, the column stays, map from 0/0, Escape leaves; back to 390×844: `f-land` gone, bar at the bottom, sheet under the map | § 7.1 rule 7; frame/INTEGRATION § 9.1–9.4, § 11 |

## B. Overlay layer and full screen (`frame/INTEGRATION.md` § 9.3, § 9.4)

| Id | Case | Expected | Rule |
|---|---|---|---|
| B1 | Layer over the map | On `#maps` and `#atmosphere` at 390: `.f-overlay` exists, is visible, and its box equals the map box (the first growing child of the module root; tolerance 1 px) | § 9.3 placement |
| B2 | Columns | Right column `.f-ov-right`: at least one button and the frame's full-screen button `.f-ov-full` **last** (visually: lowest `top` among the right buttons; in DOM order: last child); every `.f-ov-btn` is 44×44 (±1), the right edge of each is at the layer's right minus 8 px (±1) — including after the wide-element fix; left column `.f-ov-left`: the Layers button (maps: Couches; atmosphere: Couches), 44×44 | § 9.3, fix of 24 Oct |
| B3 | Nothing between header and map | On `#maps` and `#atmosphere` at 390: no visible element of the module (height > 0, not inside `.f-overlay`, not the sheet) whose bottom ≤ map top and top ≥ header bottom | § 7.1 rule 1, user "header, carte, carte, footer" |
| B4 | Buttons do not cover the sheet | On `#maps` at 390: every `.f-ov-btn` bottom ≤ sheet panel top | § 9.3 sheet safety |
| B5 | Full screen on a phone | Tap `.f-ov-full` on `#maps` at 390: `html.f-full`; header and `#fTabs` not displayed; module root is 390×844 at top 0; no exit chip (`.f-ov-exit` is gone); the column's button is still shown, pressed, labelled "Quitter le plein écran" **×4 langs**; a `resize` event was dispatched on `window` (listener installed before the tap); the map canvas height grew; Escape exits (`f-full` gone, header back, root top at 57) | § 9.4 |
| B6 | Full screen on a screen | Same at 1280: header and rail hidden, root 1280×800 at left 0; the column's button exits | § 9.4 |
| B7 | Full screen memory | In full screen on `#maps`, open `#settings` (via gear): header back; close it: `f-full` again. Then go to `#fuel`: `f-full` gone | § 9.4 memory |
| B8 | Escape order | On `#maps` in full screen with the Layers sheet content open: first Escape closes Layers and **keeps** full screen; second Escape leaves full screen | § 9.4, maps lot point 8 |
| B9 | Gestures pass through | `.f-overlay` has `pointer-events: none`; each `.f-ov-btn` has `pointer-events: auto` (computed styles) | § 9.3 |
| B10 | Panes | `#maps?with=fuel` and `#fuel?with=maps` at 1280: no error; the pane's layer (if the pane is fixed) has no `.f-ov-full` | § 9.3 last bullet |

## C. Sheet primitive (`frame/INTEGRATION.md` § 11, `frame/lib/test/sheet.html`)

| Id | Case | Expected | Rule |
|---|---|---|---|
| C1 | Bench | Load `frame/lib/test/sheet.html` at 390 and 1280: the page's own assertions all pass (read its result element or console summary; the bench reports 129/129 at 390, 1280 and 844×390: its last part plays the landscape column) | § 11 |
| C2 | Default height on a phone | On `#maps` at 390: the sheet panel `.f-sheet-panel` is at its default position: height = max(30 % of the view height, 170 px) ± 2 px, where view height = 844 − 57 − bar height | user decision of 24 Oct (30 % on phone) |
| C3 | Default height on a screen | At 1280: 35 % of the view (or the layout the module uses at that width: if the sheet is a side column at 1280, assert that instead and say so) | § 11 |
| C4 | Three positions | Drag the grip up: the panel reaches the expanded height; drag down: the head-only height (grip visible, ≥ 44 px); the grip's `aria-expanded` follows; the map box shrinks/grows accordingly (its height + panel height = view height ± 2) | § 11 |
| C5 | Grip row is the title | On `#maps` and `#atmosphere` at 390: `.f-sheet-head` holds a `.f-sheet-title` with non-empty text that starts with "Profil" (fr) / "Profile" (en) **×4 langs**, and contains no state wording ("non chargée", "not loaded", "chargement", "loading"); no second title row below the head before the content; no segmented control row (`.mp-seg` absent) | § 7.1.6 (user "J'aime la proposition de volet de la part de météo") |
| C6 | Close returns to the profile | After opening a content (maps: Layers; atmosphere: Details), `.f-sheet-close` is shown; tapping it restores a title starting with "Profil"; the close button is then hidden | § 11 |

## D. Maps (`modules/maps/SPEC.md`, lot of 24 Oct)

| Id | Case | Expected | Rule |
|---|---|---|---|
| D1 | Buttons | Right column in order: Modifier la route (`title` **×4 langs**), Cadrer, mode, Modifier (toggle, `aria-pressed`), then the frame's full screen; Follow is hidden without a started flight; "+" and Undo hidden outside Edit mode | maps lot point 2 |
| D2 | Edit mode | Tap Modifier: `aria-pressed="true"`, "+" and Undo appear in the right column (Undo disabled), all buttons still right-aligned; a notification appeared once (the Edit help) and not again on a second toggle; Escape leaves the mode | maps lot points 2, 6, 8 |
| D3 | Layers in the sheet | Tap Couches: the sheet title starts with "Couches" (**×4 langs**), the content holds the flight selector (`select`) first and the layer checkboxes; the Couches button is `aria-pressed="true"`; ✕ returns to the profile and the button is released | amendment of 24 Oct (user "le sélecteur de couche passe par dessus") |
| D4 | Profile · Weather chips | In the grip row, two icon chips (≥ 36 px, `aria-pressed`, labels **×4 langs**) before ✕; the Profile one pressed by default; if the weather cut is unavailable the Weather chip may be hidden — then assert it is hidden, not absent. With a seeded forecast (`open(forecast=True)`): at the default position the profile canvas takes ≥ 90 % of the body and `.mp-strip` / `.mp-notes` are not shown (spec § 7.1.9); the weather cut's bottom (distance axis) is visible or reached by a user scroll of the body (`overflow-y` auto, nothing leaves the sheet) in portrait 390 × 844, landscape 844 × 390 (the column) and a short window 390 × 520 where the body must scroll (140 px floor kept); expanded: no scroll needed, notes under the drawing, strip under the profile | maps lot point 4; relay 24 Oct (cut clipped, drawing alone) |
| D5 | Status as notification + note | At mount without a launcher and without an access (nothing set): exactly one notification "Accès aux données non réglé sur cet appareil…" (the cause, since 24 Oct 2026; was "Base aéronautique non publiée…") (count `.f-notes` children with that text) and the same text present in `.mp-notes` with a link to the settings; reloading the module (navigate to `#fuel` then back) shows it once again, not twice in the same page life | maps lot point 5 |
| D5b | Status: access set, base not published | Same as D5 with a GitHub access set on the device (`githubData:frame` seeded; the suite's network answers nothing, so nothing is published): the notification and the note say "Base aéronautique non publiée…", still once per mount, with the link to the settings | settings 24 Oct 2026 |
| D6 | Modes panel | Tap the mode button: a panel with six mode choices opens next to it, inside the window; choosing one sets `aria-pressed` on it and closes the panel; Escape closes it | maps lot point 2 |
| D7 | Attribution folded | MapLibre's attribution control is compact and folded after load (its details element not open; width ≤ 40 px); exactly one credit text on the map (no `.mp-credit`) | amendment of 24 Oct |
| D8 | Started flight | With `seed_flight(started=True)`: the title contains "vol en cours" (**×4 langs**), Follow is shown and pressed, the GPS notification fired once | maps lot point 4/5 (SKIP if seeding impossible) |
| D9 | No flight | With no flight seeded (if the demo flight can be disabled): a centred card in the map area says there is no flight and the Layers content is still reachable | maps lot "choices" (SKIP if the demo flight cannot be disabled) |
| D10 | Mission map | `#maps?mission=<id>` without data: no error, the Layers button is named "Carte à montrer" and route-edit buttons are hidden | maps lot (SKIP with reason if no route to a mission without data) |
| D14 | Complexity slider | Tap Couches: the controls of the content start with the flight selector then the Complexity range input, before any checkbox; label = the "Complexité" row (**×4 langs**, no "(trial)"), help sentence = the `detailHelp` row (**×4 langs**); range at least −3 … +3; on a phone zoomed out on Europe (`#maps?view=-12,40,16,58`) step −2 lowers `data-zoom-eff` by 2.0 (± 0.1), the minimum keeps 0 airspaces (`data-kept`) and an effective zoom at or below 0, the maximum keeps at least what step 0 keeps; the step is back after a reload | user 24 Oct: slider first, "Complexité", acts only as a zoom shift, goes low enough |
| D15 | Tuned thresholds applied | With `airline/map_profiles.json` served (the 23 Oct file's P 5…10 and D 7.75…10): in VFR a P and a D zone are drawn exactly inside those ranges at four views (effective zoom ≈ 3.5, 5.5, 7.1, 8.1; both sides of each bound seen); without the file the built-in VFR values (P 7.5, D 6.5) apply; IFR low with a file that holds VFR only follows VFR's ranges, without the file its built-in ones (P 5.25, D 4.75) | user 24 Oct: "trop laxes"; the file holds one mode, the others follow it |
| D16 | Tuning page reachable from Settings | Settings at level 2 has no Administration card; at level 3 the card has the button "Map threshold tuning (administrator)" (**×4 langs**, `f-btn`); a tap opens `#maps?tune=1` with its rows; Back returns to `#settings` | user 24 Oct: the page was "in the very advanced settings" |

## E. Atmosphere (`modules/atmosphere/SPEC.md`, lots of 24 Oct)

| Id | Case | Expected | Rule |
|---|---|---|---|
| E1 | Buttons | Left: Couches; right: Vol, Détails, Charger, (altitude chip only once a grid is read — assert hidden without network), then full screen; labels **×4 langs** | atmosphere lots |
| E2 | Nothing written on the map | No text element of the module over the map area (no hint pill): every visible descendant of the module root inside the map box is a canvas, the MapLibre container, or an `.f-ov-btn` | relay's review of 24 Oct |
| E3 | Title | Sheet title "Profil · <aircraft> · <from> → <to> · FL<level> · <HH:MM>Z…" pattern: starts with Profil/Profile, contains "→" and "FL" | § 7.1.6, review |
| E4 | Details and Flight contents | Tap Détails: the title changes, the content is a compact list (`dl` or rows: each row = name, value); ✕ returns to the profile. Tap Vol: same pattern, contains the forecast-not-loaded message in the body, not in the title | user "trop gros, pas assez synthétique"; review |
| E5 | One "i" only | No button in the module labelled "i" / "Infos": the only "i" on the page is `#fInfo` | user "le double bouton i sert à quoi ?" |
| E6 | Hint once | The "toucher la carte" hint appears as a notification at most once per page life, never as an element over the map | review |

## F. Fuel (`modules/fuel/SPEC.md`, lot `v3-fuel-ergo`)

| Id | Case | Expected | Rule |
|---|---|---|---|
| F1 | Opens on the Plan | `#fuel` at 390: the "Devis" view (plan) is active at mount, not the Sheets (Fiches) view: the segmented control's first button `aria-pressed="true"` | user "la vue fiches ne devrait pas être active par défaut" |
| F2 | Compact result bar | At 390 after a computed quote (seed or fill the form with the demo values the module offers): the sticky result bar is one context line (ellipsed, `white-space: nowrap`/overflow hidden), three one-line tiles "Étape / Temps / TOD" (**×4 langs**); its height ≤ 120 px | lot `v3-fuel-ergo` |
| F3 | Units | The display units selector offers kt/km/h, ft/m, NM/km/SM; switching distance to km changes the distance figures' unit text in the result bar and keeps FL as FL | lot `v3-unites-carburant` |
| F4 | Width | No horizontal page scroll at 390 and 360 (known follow-up: `.fu-when` row overflowed to 402 px on 24 Oct — the case must **fail** until it is fixed, and say so) | CLAUDE.md "pages sans débordement" |
| F5 | Step tab wording | The tab labelled "Devis" and the step 4 "Devis" do not both appear in the same view (known wording follow-up: assert and let it fail if both present) | journal follow-up |

## G. Flightlog and report (`modules/flightlog`, `modules/report`)

| Id | Case | Expected | Rule |
|---|---|---|---|
| G1 | Pending record | `seed_pending(1)`: `cache/flightlog/pending.json` schema 2 is read by the frame: the "i" badge is green and the pop-up has a flight row whose tap goes to `#report` with the handoff (hash or query carries it); `pilot/handoff.json` (or the frame's equivalent) is written (SKIP if no seeding) | `frame/INTEGRATION.md` § 10 |
| G2 | Flightlog loads | `#flightlog` at 390: no error, filters and totals present, empty-state text translated **×4 langs** when nothing is seeded | module |
| G3 | Report three steps | `#report` at 390: the three steps are shown, the first active, next/previous controls ≥ 44 px; without data the form is empty and no error | module |

## H. Designs (`frame/design/*`)

| Id | Case | Expected | Rule |
|---|---|---|---|
| H1 | Tokens resolved | For each design at 390: `--sog-surface`, `--sog-ink`, `--sog-accent`, `--sog-radius` computed on `:root` are non-empty | design |
| H2 | Contrast of header text | Header name colour over header background ≥ 4.5:1 in day and night for each design (compute from `getComputedStyle`) | design DECISIONS contrasts |
| H3 | Overlay button shape | `.f-ov-btn` border-radius is ≥ 22 px in `standard`, `cupertino`, `material`, and 0 in `metro`, `swiss` | frame lot judgement call 3 (so the ergonomics session sees it) |
| H4 | Demo pages | `frame/design/demo_metro.html` (and the swiss/cupertino/material demos if present) load without error at 390 and 1280 | design mock-ups |

## I. Repository rules (static, no browser)

| Id | Case | Expected | Rule |
|---|---|---|---|
| I1 | Neutral fingerprints | No `?v=<hash>` other than `?v=0` in `*.html`, `*.js`, `*.css` tracked files (`git grep`) | CLAUDE.md before-commit 2 |
| I2 | No conflict markers | `git grep -l -E "^(<<<<<<<|>>>>>>>) "` is empty | CLAUDE.md 5 |
| I3 | Four languages | Every `TX`-style table in `modules/*/module.js`, `modules/*/texts.js`, `frame/app.js` has four entries per key (a static scan of arrays of strings inside the translation objects: report keys with ≠ 4) | CLAUDE.md four languages |
| I4 | Help bundle fresh | `python3 tools/build_docs_bundle.py` run in a temporary copy produces a byte-identical `apps/aide/docs_bundle.js`; `python3 frame/help/build_help.py` writes 0 files | CLAUDE.md doc in the same commit |
| I5 | Format | `python3 tools/format_sources.py --check <touched js/css>` (or run it on a copy and diff): no change | CLAUDE.md 1 |
| I6 | Module documents | Each `modules/<m>/` has `SPEC.md`, `INTEGRATION.md`, `DECISIONS.md`; `frame/` has its three | CLAUDE.md roles |
| I7 | CHANGELOG | `docs/CHANGELOG.md` has a `## [Unreleased]` section with a `### V3` heading | CLAUDE.md 4 |

## J. Known failures the suite must carry (not hide)

- F4 (`.fu-when` overflow at 390) and F5 (Devis / Devis) are **expected to fail** today: the report marks them
  `FAIL (known: journal 24 Oct)` and they do not change the exit code until the ergonomics session removes the mark
  from `cases/known_failures.py`. Any other failure is a regression.

## K. What the runner's report says

`report.md`: date, `v3` commit, counts (pass / fail / known / skip), then one table per area with id, title, result,
measured vs expected on failure, and the screenshot path (`tests/v3/shots/<id>_<design>_<width>.png`, written only on
failure and for A1). `report.json`: the same, machine-readable. The runner agent (the cheap one) copies the summary
and the failures into its answer, nothing else.

## L. Bugs caught by a test during this session — each becomes a cheap script

User rule (24 Oct): "chaque test échoué ayant intercepté un bug devient un script à passer « à pas cher » avant de dire
qu'une feature est bonne". The list below is what the orchestrator's and the agents' tests caught since `66cc22dab`,
with the case that now guards it. A case marked **new** is not in the tables above and is added to the area's file.

| # | Bug caught (date, where) | How it was caught | Guard case |
|---|---|---|---|
| L1 | Airspaces card hidden under the map buttons, unclosable, 90 % of the map on a phone (23 Oct, maps) | Screenshot at 390 + box measurement | **new D11**: open an airspaces list (tap the route at a point, or the ✕-closable content): the content is in the sheet, ✕ reachable (inside the window, not covered: `elementFromPoint` at its centre is the ✕), the map keeps ≥ 50 % of the view |
| L2 | Map module not fixed: page scroll bar and header artifacts (24 Oct, maps) | `scrollHeight > innerHeight` and a header box check | A5 |
| L3 | Profile peak artifact: two levels drawn, green and orange dots at a step (24 Oct, atmosphere/maps profile) | User's screenshot; then a canvas pixel scan | **new D12**: on the drawn profile canvas, sample the level line: at most one filled level polyline (count distinct level y per x column in the route colour ≤ 1 outside TOC/TOD); no pixel of `--sog-ok`/`--sog-warn` colours on the canvas unless a reporting point is at that x |
| L4 | Frame chrome ate 184 px above the map, sheet at 38 % left the map ~40 % (24 Oct, maps) | Box measurements header→map→sheet | A5, B3, C2 |
| L5 | Maps toolbar line and the frame's full-screen chip overlapped (24 Oct, frame lot) | Screenshot at 390 | B3, B4 |
| L6 | Overlay right column: a wide element pushed the 44 px buttons off the right edge (`wrap-reverse` inverts `align-items`) (24 Oct, atmosphere → frame) | Right-edge measurement with a 90 px element prepended | B2 (**add** the prepended 90 px element step) |
| L7 | Layers panel posed over the map, clipped when the map is low (24 Oct, atmosphere, user's iPhone shots) | User's screenshot | D3, E4 |
| L8 | Two "i" buttons on the atmosphere screen (24 Oct) | User | E5 |
| L9 | Flight summary tiles too big on a phone (24 Oct, atmosphere) | User | E4 (content height ≤ 60 % of the sheet when expanded; rows ≤ 44 px) |
| L10 | Hint pill written over the map; state message used as the sheet title (24 Oct, atmosphere) | Orchestrator's screenshot review | E2, E6, C5 |
| L11 | MapLibre attribution unfolded, a band at the bottom of the map (24 Oct) | Screenshot | D7 |
| L12 | Fuel opened on the Sheets view; result block took a third of the phone screen (24 Oct, fuel) | User; height measurement | F1, F2 |
| L13 | `.fu-when` row overflows the page at 390 (402 px) (24 Oct, fuel) | `scrollWidth` check in the frame lot's sweep | F4 (known failure) |
| L14 | Sheet drag closed on wheel/drag; airspaces card closed by a map drag (23–24 Oct) | Bench `sheet.html` + card test | C1, **new D13**: a drag on the map while a sheet content is open does not close it; a wheel on the sheet does not close it |
| L15 | Help translation fingerprints stale after a manual change (24 Oct, help) | `build_help.py` output "n fichier(s) écrit(s)" ≠ 0 | I4 |
| L16 | Touch emulation with `is_mobile` on broke taps on the Cupertino bar (24 Oct, test harness itself) | Sweep failures on the base commit | § 0 rule: `is_mobile` off; **new A13**: tapping each bar entry in `cupertino` navigates (hash changes) |
| L17 | Metro and Material bar heights differ (728/722 px view instead of 730) — a test assumption, not a bug | Sweep | A5 measures against the bar's real box, never a constant |

## M. Adherence: which cases run for which change

User rule (24 Oct): "pas la peine de faire un test de synchro git si on a fait une modification d'affichage météo".
The runner selects areas from the files changed, so that a module lot runs its own cases and the shared ones it can
break, and nothing else. `tests/v3/domains.py` holds the map; `run.py --changed [<base>]` reads
`git diff --name-only <base>...HEAD` (default base: `origin/v3`, plus the working tree) and `run.py --for <path>…`
takes paths by hand; `--all` runs everything. The report's first line says which areas ran and which paths chose them.

| Changed path (glob) | Areas run | Why |
|---|---|---|
| `frame/app.js`, `frame/frame.css`, `frame/index.html`, `frame/lib/*.js` (not sheet) | A B C D E F G H I | the frame reaches every screen |
| `frame/lib/sheet.js`, `frame/design/primitives.css` | B C D E I | sheet and overlay primitives: the two fixed modules |
| `frame/design/**` (tokens, designs, demos) | A H I + B2/B9 (button look) | designs and chrome |
| `frame/help/**`, `apps/aide/**`, `modules/*/help/**`, `docs/**`, `*.md` | I (+ A11 when a manual changed) | documents only |
| `modules/maps/lib/map_base.js` | D E B I | shared map base: both map modules |
| `modules/maps/**` (other) | D B C I | the map module and the primitives it uses |
| `modules/atmosphere/**` | E B C I | same for atmosphere |
| `modules/fuel/**` | F I (+ A7 popover: fuel is in the Préparer group) | fuel |
| `modules/flightlog/**`, `modules/report/**` | G I (+ A8 A9: the "i" reads flightlog's pending file) | flightlog and report |
| `frame/settings/**`, `frame/aerodb/**` | A12 D5 I | settings screen; aerodb warning on maps |
| `tools/**`, `tests/**`, `.github/**` | I | tooling |
| anything else | A1 I | smoke and static |

A case can also carry tags (`tags=('overlay','sheet')`) so that `--tag overlay` runs across areas. The frame lot and
the module lots say in their reports which command they ran (`run.py --changed` from their branch) and paste the
summary line; a lot is "good" when its selected cases pass and the known failures are the only `FAIL`s.

## N. Journeys (functional scope): which change touches which path of the pilot

User rule (24 Oct, 15:55): "C'est soit à toi soit à la session de tests de déterminer le périmètre fonctionnel, pour
savoir facilement quels modifs impactent tel ou tel parcours." The relay sets it here. A **journey** is a path the
pilot walks through the application, in order, across modules; it is what the user means by "feature". Each journey
names its steps, the **files that carry it** (so that a change is mapped to the journeys it can break), the area cases
that already guard its screens, and **one end-to-end case** (`J<n>`) that walks the whole path in one browser, with
seeded state only where a real backend would be needed (website, GPS, Open-Meteo) and says so in the report.

Sources: `V3_SPECIFICATION.md` § 7.1 (the bar is the order of a day: Préparer · Carte · CR · Vols · Réglages),
`modules/fuel/SPEC.md` § 4 (`pilot/<trigram>/current_flight.json`) and § 12 (started flight), `modules/flightlog/SPEC.md`
(`cache/flightlog/pending.json`, `pilot/handoff.json`), `modules/report/SPEC.md` § 2, 3 bis, 6, `frame/settings/SPEC.md`.

| Journey | Steps (in order) | Files that carry it (globs) | Guard cases | End-to-end case |
|---|---|---|---|---|
| **P1 Préparer un vol** | Préparer › Devis: aircraft, departure, arrival, alternate, load → quote (block, trip, time, TOD) → level decision (Fiches / levels) → `current_flight.json` written as *planned* → Carte shows the route, the profile and the title "Profil · FL · NM · vol prévu" → Météo (atmosphere) reads the same flight, "Charger" is the user's one shot → back on Carte the Météo chip draws the cut | `modules/fuel/**`, `modules/maps/**`, `modules/atmosphere/**`, `frame/app.js` (navigation, records), `frame/lib/sheet.js`, `frame/design/primitives.css`, `frame/aerodb/**`, `frame/weather/**` | F1 F2 F3, D1 D3 D4 D7, C2 C5, E1 E3, B1–B4 | **J1**: on a phone, fill the quote with the module's demo values (or seed the inputs), read the result bar, open Carte (`#maps`) and assert the title carries the same FL and distance as the quote (±1 NM), open `#atmosphere` and assert its title names the same flight (from → to, FL); the "Charger" step is **not** clicked (one shot per user, network blocked): assert the button exists and the message "not loaded" is in the body, then return to Carte and assert the Météo chip is present (hidden or shown, no error) |
| **P2 Voler** | Préparer: "Démarrer le vol" (fuel § 12) → `started = {at, by}` → "i" badge green, pop-up row "Vol en cours › Carte" → Carte: title "vol en cours", Follow shown, position from GPS or none (notification once), progress block in the sheet notes → full screen → end: "Annuler le démarrage" or the report | `modules/fuel/progress.js`, `modules/fuel/module.js`, `modules/maps/**`, `frame/app.js` ("i", position, `frame-fullscreen`), `frame/lib/geo.js` | A8 A9, D8, B5 B7 B8 | **J2**: seed a planned flight, start it from fuel (the button, or `seed_flight(started=True)` if the button needs the network, and say which), assert the "i" badge is green and its row leads to `#maps`, the maps title says "vol en cours" (×4 langs), Follow is shown, full screen works, then cancel the start from fuel and assert the title is back to "vol prévu" and the badge is off |
| **P3 Rendre compte** | Vols lists a flight without a report → `pending.json` (schema 2, `handoff`) → "i" badge green, row "CR à écrire" → tap → `pilot/handoff.json` written → `#report` prefilled (family, values) → three steps → save (`sog-report/1`) → record on the website (same gesture; offline: queued, said so) → `started = null`, pending cleared, Vols shows the report | `modules/flightlog/**`, `modules/report/**`, `modules/website/**`, `frame/app.js` (§ 10 pending, handoff), `frame/settings/join.js` | G1 G2 G3, A8 A9 | **J3**: seed one flight without a report, assert the badge and the row, tap it, assert `#report` opens on step 1 with the handoff values in the form (at least from, to, date), walk the three steps with the minimum required fields, save; the website recording is **SKIPped inside the case** with the reason "no website in the suite" and the case asserts the report is in the local cache, the pending record is empty and the badge is off |
| **P4 Relire ses vols** | Vols: list, filters (period, aircraft, without report), totals, export; the website log and the network sessions (IVAO / VATSIM) merged when the access is set | `modules/flightlog/**`, `modules/website/**` | G2 | **J4**: seed three flights (two with reports, one without), assert the totals (count, hours ±1 min) and the "Without report" filter gives one, export produces a file (download event) with three rows |
| **P5 Installer et synchroniser** | first launch without trigram → amber badge → Réglages: trigram, data access (GitHub mode or launcher), join the airline → sync dot (header on a screen, "i" line on a phone) → offline: amber, writes pending → conflicts screen → design and language choice → help | `frame/app.js` (data layer, sync, conflicts), `frame/settings/**`, `frame/design/**`, `frame/help/**`, `frame/manifest.webmanifest`, `frame/sw.js` (if any), `frame/index.html` | A2 A3 A8 A9 A10 A11 A12 A15, H1–H3 | **J5**: start with nothing seeded, assert the amber badge and the trigram line, open Réglages, set the trigram `ABC`, assert the badge turns off (or green if something else applies), switch the language to `en` and the design to `metro` from Réglages and assert the header and bar follow without reload, go offline (`context.set_offline(True)`), assert the amber badge and the "i" line say offline, back online, assert it clears |
| **P6 Carte de mission** | a mission map (from the studio's YAML) opened from Carte › Couches "Carte à montrer" → route-edit buttons hidden → the trace unrolled → the sheet shows the mission's content | `modules/maps/mission.js`, `modules/maps/module.js`, `modules/maps/lib/map_base.js` | D10 | **J6**: SKIP until a mission fixture exists in `tests/v3/fixtures/` (say so); then open `#maps?mission=<id>` and assert the buttons, the selector name and no error |

Rules for the journey cases:

- Each `J` case runs **once on the phone in `standard`, French**, and once on the screen (`J1`, `J5`); languages
  only where the table says ×4. They are slow by nature: never duplicated across designs.
- A `J` case stops at the first failed step and reports **the step name** ("P3 step 4: `#report` not prefilled:
  `from` empty, expected LFRS"), so that the reader knows where the path broke, not only that it broke.
- Seeding goes through `lib.py` only (`seed_flight`, `seed_pending`, `seed_identity`, `seed_flights(n)`), so that a
  change in the cache schema is fixed in one place.

## O. Adherence to journeys: the runner tells which paths a change touches

`tests/v3/journeys.py` holds the table above as data (`JOURNEYS = {id: {title, steps, paths, cases, e2e}}`).
The runner, with `--changed [<base>]` or `--for <paths>`:

1. maps the changed files to **areas** (§ M) as today;
2. maps them to **journeys** by the `paths` globs, and adds each impacted journey's `J` case to the selection;
3. prints, before the first case, one line per impacted journey: `JOURNEY P1 Préparer un vol — modules/fuel/levels.js,
   modules/maps/module.js`, and writes the same at the top of `report.md` ("Journeys touched: …");
4. a change that maps to no journey prints `JOURNEY none (areas only)`.

`--journey P1,P3` runs those journeys' guard cases and `J` cases; `--list` shows, for a set of paths, the areas and
journeys without running. A lot's report (frame or module) quotes that line: it is the answer to "quels modifs
impactent tel ou tel parcours". When a new screen or record appears in a module, its lot adds the file to the journey
it serves, in `journeys.py`, in the same commit: a file that belongs to no journey is a question for the relay, not a
silent gap.

## P. Replaying a failure: alone, then in its scope

User rule (24 Oct): "Donner une consigne et l'implémenter pour rejouer un test échoué : test unique, ou périmètre complet". The rule,
written as given to the lots:

> A failed case is replayed twice before a lot is called good. First alone, as it failed (`run.py --failed <id>`: same design, width and language), to confirm the fix on the exact failure. Then in its full scope (`run.py --failed-scope`: every area and journey the case belongs to, plus the cases chosen by the files the fix touched), to see what the fix moved around. The lot's report quotes both commands and their summary lines. A fix that passes the first and not the second is not done.

What the two commands do (`tests/v3/run.py`):

1. `--failed [IDS]` replays the cases that are `FAIL` or `ERROR` in the **last `report.json`** (the known failures too, marked as
   such), **exactly in the combinations that failed** (design, width, language, tone read from the report, not the full grid);
   `--failed B2,D5` limits it to those ids. Without a report it says so and exits 2. The new report opens with
   `Replay of <date of the previous report> : <ids>`.
2. `--failed-scope [BASE]` runs the **full scope** of those failures: every area (section M) and every journey (sections N and O,
   guard cases and end-to-end case) the failed cases belong to, in the full grid, **plus** the `--changed` selection of the files the
   fix touched (base `origin/v3`, or the BASE given). The new report opens with
   `Scope of failures B2 D5: areas B D, journeys P1 P2, changed: <files>`. A failed journey case (`J3`) belongs to its journey, not to
   a whole area J.
3. A replay carries the failures it replays in `report.json` (`meta.failed`): the second command still finds them when the first one
   passed, so the routine `--failed <id>` then `--failed-scope` works as written. A normal run replaces them.
4. `--list` works with both and shows the selection (the combinations of `--failed`, the areas, journeys and files of
   `--failed-scope`) without running.
