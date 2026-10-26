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
(fuel, with its Sheets view), Carte, CR, Vols, Météo (atmosphere); Réglages is the gear of the header (rule 14).

## A. Frame — layout and chrome (rules: `V3_SPECIFICATION.md` § 7.1, `frame/INTEGRATION.md` § 9)

| Id | Case | Expected | Rule |
|---|---|---|---|
| A1 | Every module loads | For each of the five modules, at 390 and 1280, in five designs: no `pageerror`, `document.documentElement.dataset.design` equals the design asked, no horizontal page scroll (`scrollWidth <= innerWidth`), the module root `[data-module=<name>]` (or the frame's view) is non-empty | smoke, § 7.1 rule 1 |
| A2 | Phone header | At 390: the header is 57 px high (`--f-head-h`), shows exactly the name (`#fName`), the "?" (`#fHelp`) and the gear (`#fDevice`); `#fSync`, `#fWho`, `#fLive`, `#fHost` are not displayed; there is no `#fInfo`; "?" and gear are at least 44×44; **rule 16**: on `#maps` (fixed) the name is the application's; on `#fuel`, `#report`, `#flightlog` (non-fixed) it is the module's title in the language (`meta.title`), `html` has `f-titled`, the page's `h1` is kept but clipped to 1 px, and over Settings the name is the application's again | § 7.1 rules 14, 16 (amends 3) |
| A3 | Screen header | At 1280: `#fHelp` and `#fSync` are displayed (nothing changes above 760 px), and there is no `#fInfo` either | same |
| A4 | Bottom bar | At 390: `#fTabs` is displayed, has five entries (Préparer, Carte, CR, Vols, Météo), each at least 44 px high, labels translated **×4 langs**, no Settings entry; at 1280 the bar is hidden and the rail `#fNav` is shown | § 7.1 option A, rule 14 |
| A5 | Fixed module fills the view | For `maps` and `atmosphere` at 390: `html` has class `f-fixed`; the module root's top is exactly at the header's bottom (gap 0 px); its bottom is at the bar's top; `document.scrollingElement.scrollHeight <= innerHeight` (no page scroll) | § 9.2, user "la vue carte doit être fixe" |
| A6 | Non-fixed module scrolls normally | For `fuel` at 390: `html` has no `f-fixed`; the page may scroll; the header stays visible after scrolling 400 px (sticky) | § 9.2 |
| A7 | Group popover | On `#fuel` at 390: a second tap on the active tab "Préparer" opens a popover with rows Carburant and Fiches (×4 langs), each ≥ 44 px high, within the window and above the bar; the current row has `aria-current`; tapping Fiches goes to `#fuel?view=sheets` (fuel on its Sheets screen, no "←") and closes it; reopened there, Fiches is the current row, and Carburant goes back to `#fuel`. The Météo tab opens `#atmosphere`, is selected there, and a second tap on it does nothing (one row). Escape closes the popover; a tap outside closes it. On `#maps` (single-module tab) a second tap does nothing and keeps the hash and query (`#maps?x=1` stays) | frame lot, § 7.1 rules 4 and 14 |
| A8 | Status block at the top of Settings | At 390 with no trigram and a flight to report: the gear opens `#settings` whose first card is `[data-card=status]` titled "État" / "Status" / … (**×4 langs**); its rows are report, trigram, data, in that order, none is "Aide de cet écran"; each row ≥ 44 px; the trigram row is worded as the frame words it; tapping the data row brings the Usages card to the top (the hash stays `#settings`); tapping the trigram row puts the cursor in the trigram field; Escape returns to `#fuel` and the block is gone | § 7.1 rule 14 (replaces the "i" pop-up) |
| A9 | Gear badge | On `#fDevice`: with nothing seeded and no trigram, the badge is amber (`data-attn`); with a seeded identity and a seeded pending flight: green (`data-badge`), amber wins when both; at 1280 no badge logic is required (just no error) | frame lot ("pastille verte et orange"), rule 14 |
| A10 | Night tone | `standard` at 390 with `tone:'night'`: `dataset.tone` (or the attribute the frame uses) is `night`, body background luminance is below 0.2 (dark), no error | design |
| A11 | Help screen | The "?" (`#fHelp`, at 390 as at 1280) opens `#help?m=maps` from `#maps`: the manual of the module is shown in the current language, non-empty, **×4 langs**; Escape or the back button returns to `#maps`; over Settings the "?" opens `#help?m=settings` | help block, rule 14 |
| A12 | Settings screen | `#settings` at 390: opens, no error, opens on the Status block, contains the trigram field; the back control returns to the previous module; at the Everyday level no Administration card and nothing of the administrator's on the other cards; at the Full level one Administration card with one 44 px button per page (map thresholds `#maps?tune=1`, flight zone limit, roadmap, diagnostics, greyed benches, no V2 page and no export without a launcher or access), no horizontal scroll; the flight zone limit button opens a panel whose box is ticked by default, a tap writes `edge.show` false (then true) in `airline/map_profiles.json` and leaves `profiles` untouched | settings block; V3_SPECIFICATION 7.1 rule 18 |
| A15 | Aerodb loading state | At 390 with a GitHub access set (`githubData:frame`), a planned flight, nothing of the base in the cache and the API of the data repository **held** (a fake GitHub that answers when released): the sheet note says "Aeronautical database loading…" (**×4 langs**) and no note nor notification says "not published" or "access not set"; the Status block of Settings has the `base` row with the same words; once released, the loading note is gone and so is the row (the base is there); with the access removed and the cached base forgotten, the note says "Data access not set on this device" with one button "Settings" and the Status row says it too | P5; settings 24 Oct 2026 (relais cloud) |
| A14 | Landscape on a phone | At 844×390 (touch) on `#maps` and `#atmosphere`: `html.f-land`; `#fTabs` is the rail (left 0, 44 px wide, top 57, 333 px high, five entries ≥ 44×44 — Préparer, Carte, CR, Vols, Météo, the one of the module shown selected —, no visible label, an `aria-label` each), `#fNav` hidden, header 57 px, `--f-tab-space` 0, `--f-view-h` 333; map at left 44 / top 57, 333 px high; the sheet panel is a column at the right edge, full height, 40 % of the view (≥ 280 px, 320 here), its handle line at its top, content inside it; the map takes the rest; no page scroll; the right overlay buttons share one x (no double column); no `.f-ov-exit`; a tap on the handle: 60 % (480 px), a second tap: back; full screen: header and rail hidden, root 844×390 at 0/0, the column stays, map from 0/0, Escape leaves; back to 390×844: `f-land` gone, bar at the bottom, sheet under the map | § 7.1 rule 7; frame/INTEGRATION § 9.1–9.4, § 11 |
| A19 | Keys survive a relaunch | At 390, a persistent browser context: the trigram, a GitHub access (`sog/data` + token) and a weather key are set from Settings, the context is closed and opened again with its storage: the three are there (trigram field, "Cut access" present with the repository, weather "Test" enabled); closed again after `localStorage.clear()` (what Safari did on 25 Oct 2026) and opened: the three are still there; the backup of the device (`FrameData.dump()`) holds neither the token, nor the key, nor `device/keys.json`; no JavaScript error | V3_SPECIFICATION 10.16; settings DECISIONS 25 Oct 2026 |
| A16 | One module in the view | From `#atmosphere` at 390 (planned flight), with the reads of `pilot/` and `cache/` delayed by 700 ms: `#fuel`, `#flightlog`, `#maps` set in the same task, then (once the late reads are back) exactly one `section[data-module]` in `#fView` (`maps`), none elsewhere in the page, one `.f-overlay`, one `.f-sheet-panel`, the address `#maps`, the map drawn, no JavaScript error; then `#fuel`, `#flightlog`, `#atmosphere` one per task, same delay: only `atmosphere` is in the view, with one overlay | `frame/INTEGRATION.md` § 2; frame/DECISIONS 24 Oct 2026 (relais cloud) |
| A17 | Help lands on the right paragraph | At 390 in **×4 langs**: from `#fuel` on step 3, from `#report` on step 2 and from `#flightlog`, the "?" asks `#help?m=<module>&a=<anchor>` (`fuel-step-3`, `report-step-2`, `flightlog-list`); the manual draws the anchor, its paragraph carries the class `f-hl` on arrival, starts inside the window under the header, and loses the class within 1.5 s (once); an unknown anchor, and a chapter asked without an anchor, highlight nothing | § 7.1 rule 16; `frame/INTEGRATION.md` § 2 (`ctx.helpAnchor`) |
| A18 | How-to card dismissed once | On `#fuel` at 390: the "Comment s'en servir" card (`[data-help=fuel]`) has a ✕ of at least 44×44; a tap removes the card at once and `device/help.json` keeps `hidden.fuel`; after a reload the card is still absent while the one of `#report` is drawn (per module); the help chapter `#help?m=fuel` offers "Revoir les premiers pas" (`[data-howto-show]`, only for the dismissed module, ≥ 44 px), which returns to `#fuel` with the card back and unfolded and `hidden.fuel` false | § 7.1 rule 16 |

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
| C1 | Bench | Load `frame/lib/test/sheet.html` at 390 and 1280: the page's own assertions all pass (read its result element or console summary; the bench reports 186/186 at 390, 1280 and 844×390: its last part plays the landscape column; its section "mouvement" (25 Oct, rule 19) checks the move: no `onSettle` during a drag, one style write per move carried by `--f-sheet-live`, one `onSettle` at the end of the glide, nothing left inline, a finger put on a gliding sheet) | § 11 |
| C2 | Default height on a phone | On `#maps` at 390: the sheet panel `.f-sheet-panel` is at its default position: height = max(30 % of the view height, 170 px) ± 2 px, where view height = 844 − 57 − bar height | user decision of 24 Oct (30 % on phone) |
| C3 | Default height on a screen | At 1280: 35 % of the view (or the layout the module uses at that width: if the sheet is a side column at 1280, assert that instead and say so) | § 11 |
| C4 | Three positions | Drag the grip up: the panel reaches the expanded height; drag down: the head-only height (grip visible, ≥ 44 px); the grip's `aria-expanded` follows; the map box shrinks/grows accordingly (its height + panel height = view height ± 2) | § 11 |
| C5 | Grip row is the title | On `#atmosphere` at 390 (on `#maps` the head over the profile is bare, § 7.1.13: no visible title, the handle's label starts with "Profil vertical"): `.f-sheet-head` holds a `.f-sheet-title` with non-empty text that starts with "Profil" (fr) / "Profile" (en) **×4 langs**, and contains no state wording ("non chargée", "not loaded", "chargement", "loading"); no second title row below the head before the content; no segmented control row (`.mp-seg` absent) | § 7.1.6 (user "J'aime la proposition de volet de la part de météo") |
| C6 | Close returns to the profile | After opening a content (maps: Layers; atmosphere: Details), `.f-sheet-close` is shown; tapping it restores a title starting with "Profil"; the close button is then hidden | § 11 |

## D. Maps (`modules/maps/SPEC.md`, lot of 24 Oct)

| Id | Case | Expected | Rule |
|---|---|---|---|
| D1 | Buttons | Right column in order: Modifier la route (`title` **×4 langs**), Cadrer, mode, Modifier (toggle, `aria-pressed`), then the frame's full screen; Follow is hidden without a started flight; "+" and Undo hidden outside Edit mode | maps lot point 2 |
| D2 | Edit mode | Tap Modifier: `aria-pressed="true"`, "+" and Undo appear in the right column (Undo disabled), all buttons still right-aligned; a notification appeared once (the Edit help) and not again on a second toggle; Escape leaves the mode | maps lot points 2, 6, 8 |
| D3 | Layers in the sheet | Tap Couches: the sheet title starts with "Couches" (**×4 langs**), the content holds the flight selector (`select`) first and the layer checkboxes; the Couches button is `aria-pressed="true"`; ✕ returns to the profile and the button is released | amendment of 24 Oct (user "le sélecteur de couche passe par dessus") |
| D4 | Profile · Weather chips | **Three icon chips, always** (Profile, Weather, "i"; V3 spec § 7.1.13 fourth refinement: never 2 ↔ 3 — a chip with nothing to show is `disabled` + `aria-disabled` and muted, never `hidden` or removed: checked with the cut's `sectionLegend` removed from the served `section.js` and with no kept forecast), 28 px with the bare handle (touch zone ≥ 34 px high, the primitive's 44 px clipped by the sheet's edge), 40 px with the title line, `aria-pressed`, labels **×4 langs**; the last chip is the "i" legend: pressed state, an overlay with ≥ 3 entries each with a symbol, the first worded in the run's language, closed by Escape and by a tap; a drag on the weather cut moves the common cursor (`data-cursor-nm` of the map, the cut's dashed line follows)), **inside the head line, at its right, on one row, in every position** (no column, no row above the drawing): the bare line (28 px) at the default position, the title line elsewhere; the drawing takes the whole width, starts ≤ 8 px from the left edge and right under the line; the Profile one pressed by default. With a seeded forecast (`open(forecast=True)`): **bare head over a drawing at the default position** (V3 spec § 7.1.13 b and its refinement): `.f-sheet-head-bare`, 28 ± 2 px, no visible `.f-sheet-title`, the handle's title / aria-label names the drawing ("Profil vertical" / "Coupe météo", **×4 langs**); collapsed, expanded and in the landscape column the head has its title (no `.f-sheet-head-bare`); at the default position the profile canvas takes ≥ 90 % of the body and `.mp-strip` / `.mp-notes` are not shown (§ 7.1.9); **the drawing fits the body** (§ 7.1.13 a): profile canvas and weather cut are as high as the body (± 2–3 px), their bottom inside the body, nothing scrolls, `data-axis="1"` (canvas / body), `data-marks` ≥ 2 (profile) and the departure / arrival labels in the cut's text — in portrait 390 × 844, landscape 844 × 390 (the column) and a short window 390 × 520 (body 142 px); expanded: notes under the drawing, strip under the profile | maps lot point 4; relay 24 Oct (cut clipped, drawing alone, rule 13); the "i" chip is shown over the cut too and its legend comes from atmosphere's `sectionLegend()` (≥ 3 entries with symbols, Escape closes); **every symbol of the cut's legend and of the profile's is painted** (computed colour, not transparent, not the text colour; user 25 Oct "Bug : cf screenshot (légende)": six empty boxes), the cut's are atmosphere's own SVGs, each `--at-*` token painting as in the cut (dashes `7 4` / `2 4` found in the cut, a disc for TOC / TOD, a box for the relief, a vertical line for the route points), and in `standard` none is grey |
| D5 | Status as notification + note | At mount without a launcher and without an access (nothing set): exactly one notification "Accès aux données non réglé sur cet appareil…" (the cause, since 24 Oct 2026; was "Base aéronautique non publiée…") (count `.f-notes` children with that text) and the same text present in `.mp-notes` with a link to the settings; reloading the module (navigate to `#fuel` then back) shows it once again, not twice in the same page life | maps lot point 5 |
| D5b | Status: access set, base not published | Same as D5 with a GitHub access set on the device (`githubData:frame` seeded; the suite's network answers nothing, so nothing is published): the notification and the note say "Base aéronautique non publiée…", still once per mount, with the link to the settings | settings 24 Oct 2026 |
| D6 | Modes panel | Tap the mode button: a panel with six mode choices opens next to it, inside the window; choosing one sets `aria-pressed` on it and closes the panel; Escape closes it | maps lot point 2 |
| D7 | Attribution folded | MapLibre's attribution control is compact and folded **from the moment it exists** (the case holds the base style's request: control built, map not loaded, `maplibregl-compact`, not open), after the load, and after a resize of the window (MapLibre re-opens an unmarked control at each resize); width ≤ 40 px; exactly one credit text on the map (no `.mp-credit`); every wait is on a state, none on a delay (25 Oct: the 500 ms raced the map's `load`) | amendment of 24 Oct |
| D8 | Started flight | With `seed_flight(started=True)`: the title contains "vol en cours" (**×4 langs**), Follow is shown and pressed, the GPS notification fired once | maps lot point 4/5 (SKIP if seeding impossible) |
| D9 | No flight | With no flight seeded (if the demo flight can be disabled): a centred card in the map area says there is no flight and the Layers content is still reachable | maps lot "choices" (SKIP if the demo flight cannot be disabled) |
| D10 | Mission map | `#maps?mission=<id>` without data: no error, the Layers button is named "Carte à montrer" and route-edit buttons are hidden | maps lot (SKIP with reason if no route to a mission without data) |
| D14 | Complexity slider | Tap Couches: the controls of the content start with the flight selector then the Complexity range input, before any checkbox; label = the "Complexité" row (**×4 langs**, no "(trial)"), help sentence = the `detailHelp` row (**×4 langs**); range at least −3 … +3; on a phone zoomed out on Europe (`#maps?view=-12,40,16,58`) step −2 lowers `data-zoom-eff` by 2.0 (± 0.1), the minimum keeps 0 airspaces (`data-kept`) and an effective zoom at or below 0, the maximum keeps at least what step 0 keeps; the step is back after a reload | user 24 Oct: slider first, "Complexité", acts only as a zoom shift, goes low enough |
| D15 | Tuned thresholds applied | With `airline/map_profiles.json` served (the 23 Oct file's P 5…10 and D 7.75…10): in VFR a P and a D zone are drawn exactly inside those ranges at four views (effective zoom ≈ 3.5, 5.5, 7.1, 8.1; both sides of each bound seen); without the file the built-in VFR values (P 7.5, D 6.5) apply; IFR low with a file that holds VFR only follows VFR's ranges, without the file its built-in ones (P 5.25, D 4.75) | user 24 Oct: "trop laxes"; the file holds one mode, the others follow it |
| D16 | Tuning page reachable from Settings | Settings at level 2 has no Administration card; at level 3 the card has the button "Map threshold tuning (administrator)" (**×4 langs**, `f-btn`); a tap opens `#maps?tune=1` with its rows; Back returns to `#settings` | user 24 Oct: the page was "in the very advanced settings" |
| D17 | Complexity block is one compact line | In the Layers content at 390 (**five designs, ×4 langs**): label, value and slider on one row, the whole `.mp-l-detail` block ≤ 56 px high, the slider ≥ 40 px high and ≥ 90 px wide, the help sentence (`#mp-detail-help`, `aria-describedby`) out of the page (≤ 2 px), the first checkbox ≤ 12 px under the block | user 24 Oct ("Réduire l'espace jaune") |
| D18 | Airway names above the strokes | On the render bench page (`modules/maps/test/render.html`), `MapsRender.draw` with two airways far from the route and each other, a recording context: every airway stroke (`#1f6fb2` / `#6a3fa0`) is recorded before the first airway name | user 24 Oct ("les noms des AWY au-dessus des traits") |
| D19 | Map chrome above the sheet | In `standard`, `metro`, `cupertino` at 390: every visible MapLibre control (`.maplibregl-ctrl`) ends above the sheet's top — at the default position, then with the map stretched 110 px under the sheet (`.mp-box` negative margin: the module's `setBottomInset` follows) at default, expanded and collapsed; in the landscape column (844 × 390) no control touches the column; one `.maplibregl-ctrl-attrib`; its `summary` button is ≤ 26 px high (one "i" icon, not repeated under itself) and carries no `::before` chevron | V3 spec § 7.1 rule 17 (user 25 Oct: "le double i, invisible. Masqué par le volet") |
| D20 | Still during a sheet drag | In `standard`…`material` at 390 (portrait) and 844 × 390 (landscape column): finger down on the grip, 20 moves to both ends and back, pauses longer than 120 ms. During the drag: no `map.resize()`, no reset of the MapLibre / overlay / profile canvas, no rewrite of the sheet's body; the MapLibre canvas and the overlay bitmap keep their size; the map's frame stays against the sheet; the sheet's size is monotone with the finger (±1.5 px); the strip the frame shows beyond the map is the map's colour (pixels of a screenshot), not the page's grey. After the release: at most one `map.resize()` and one resize of the overlay bitmap, the canvas fills the frame. Symmetric of E7 | V3 spec § 7.1 rule 19 (user 24-25 Oct: "fait clignoter et apparaître une zone grise") |
| D21 | Profile window: pinch | On `#maps` at 390 with the seeded flight (planned FL270, climb over 62 NM): the profile is whole (`data-window` 0 to its 366 NM, no "Whole flight" button); a synthetic two-finger pinch (CDP touch events) around 12 NM, fingers 24 then 192 px apart: the window is under a fifth of the flight and at least 5 NM, inside the flight, the distance under the fingers' centre is still 12 ± 1.5 NM; the vertical scale (`data-scale`) reaches the planned altitude at the window's end, is at least 1,000 ft lower than the whole flight's and no more than that + 1,500 ft + rounding; at least three regular distance marks (`data-ticks`), all inside the window; a one-finger tap in the middle of the window puts the common cursor there (`data-cursor-nm` ± 0.6 NM) and the strip under the profile reads the same distance; the "Whole flight" button (**×4 langs**: label and title) is shown, its touch zone at least 34 px high (44 px zone clipped by the sheet's edge) and 44 px wide; a tap on it brings the whole window and scale back and hides it; a second pinch then a double tap on the profile does the same | V3 spec § 7.1 rule 20 (user 25 Oct 14:30: "zoomer (pour être précis) le profil vertical"), rule 13 (no chip) |
| D22 | Profile window: a sheet drag | At 390 (standard, cupertino), the profile zoomed: finger down on the grip, the D20 drag (both ends and back): no canvas reset, no `map.resize()`, no rewrite of the sheet body, **no paint of the profile canvas** under the finger; after the release the window is the same | rules 19 and 20 |
| D23 | Profile window: kept, then reset with the route | The profile zoomed, Map → Fuel → Map in the same page: the same window; nothing about it in `localStorage`; another route (two points, shorter) written to the current flight through the data layer: the profile is drawn whole for the new route and the button is hidden | rule 20 |
| D24 | Profile window on a screen | At 1280: a plain wheel leaves the profile whole; Ctrl + wheel (three notches) tightens the window around the pointer (the distance under it kept ± 2 NM) and shows the button; a mouse drag moves the window (same width, toward the departure when the pointer goes right); a double click brings the whole flight back | rule 20 |
| D25 | One window for the profile and the cut | On `#maps` at 390 with the seeded flight and forecast, the Weather chip: the cut is whole (`data-window` of the sheet body 0 to its 366 NM, no "Whole flight" button); the legend lists the surface strips exactly when `data-strips` says the cut drew them; a synthetic two-finger pinch on the cut: the window is under a fifth of the flight, at least 5 NM, inside the flight; the distance marks of the cut are inside it; the height scale (`data-top`) is at least 1,000 ft lower than the whole cut's; the "Whole flight" button (**×4 langs**: label and title) is shown with a 44 px zone clipped by the sheet's edge (34 px at least) and 44 px wide; the legend still agrees with `data-strips`; the Profile chip: the profile's `data-window` is the cut's (±0.15 NM) and the button stays; the Weather chip again: the same window; a pinch on the profile then the Weather chip: the cut follows; a tap on the button: the whole cut (window and scale) and the whole profile, the button hidden; a pinch then a double tap on the cut: whole again and the sheet still shows the cut (no slice) | rule 20 (the same gesture on the cut; Atmosphere `d785ec7c6`) |
| D25b | One window: a sheet drag on the cut | At 390 (standard, cupertino), the cut zoomed: finger down on the grip, the D20 drag (both ends and back): no canvas reset, no `map.resize()`, no rewrite of the sheet's body (the cut is not redrawn under the finger); after the release the cut's window is the same and the button is still shown | rules 19 and 20 |
| D27 | One line per VFR reporting point | LFQN as the real files have it (the published base lists each VRP twice, `QT-N` with its description and `N` bare with the code for name; the aerodrome's own prefix `QN` is not the VRPs' `QT`; the VAC file `sia/vfr/LFQN.json` has the code twice, `NA` and `na`, a point `W` 1.2 NM from the base's and a point `X` the base does not have), VFR mode, a tap on the aerodrome: the card counts **five** lines (N, NA, W, WA, X) in the order of the base, the heading says 5 (**x4 langs**), each of the four base points keeps its description and no row repeats its code as its description, only W says "VAC position 1,2 NM away" (**x4 langs**, the number in the language of the run), WA keeps its VAC restriction, and the last overlay frame holds **one** text per point (a hook on the canvas's `fillText`, frames cut at `clearRect`); verified red on the previous code (ten lines: `N N`, `NA NA`, `W W`, `WA WA`, W twice) | user 25 Oct: "Bug LFQN. Points de report VFR doublonnés" |
| D26 | Airspaces graph and profile read the limits alike (**×4 langs**) | On `#maps` at 390 (IFR low), the reading table of `SiaAero.limitRead` (SFC, GND, UNL, FL065, FL 065, 3500, 3500 AMSL, 1500 ASFC, 800 AGL, 2500 FT AMSL, lower case, no space, metres, empty, unreadable); a tap under R 57 "800 ASFC\|1800 ASFC", TMA "SFC\|FL065", CTA "FL065\|UNL", D "1500 ASFC\|ABC" and five flat ones (SIV, FIR, CTL with no limits, R SFC\|UNL, D with empty limits): the sheet counts 4 (title in the language), the list holds none of the flat ones, the graph has one column per entry; the R 57 column is 1,000 ft high on the scale of the SFC-FL065 column, starts 800 ft above the ground line, its top is under the TMA's; only the UNL column reaches the top; the unreadable ceiling is a dotted column with one "?"; the list keeps the SIA notation (ASFC). The vertical profile (`MapsProfile.build` / `draw` at 1,200 ft): the R 57 band is drawn between Y(800) and Y(1,800), R 57 and TMA 6 are crossed, none of the flat ones. Thirteen readable spaces on one point: 13 lines, 13 columns, all inside the graph | user 25 Oct ("La R57 est affichée plus haut que sa hauteur plafond indiquée"; "Retour, dans certains cas, des espaces UNL"; rule "pas d'espace de la surface au plafond") |

## E. Atmosphere (`modules/atmosphere/SPEC.md`, lots of 24 Oct)

| Id | Case | Expected | Rule |
|---|---|---|---|
| E1 | Buttons | Left: Couches; right: Vol, Détails, Charger, (altitude chip only once a grid is read — assert hidden without network), then full screen; labels **×4 langs** | atmosphere lots |
| E2 | Nothing written on the map | No text element of the module over the map area (no hint pill): every visible descendant of the module root inside the map box is a canvas, the MapLibre container, or an `.f-ov-btn` | relay's review of 24 Oct |
| E3 | Title | Sheet title "Profil · <aircraft> · <from> → <to> · FL<level> · <HH:MM>Z…" pattern: starts with Profil/Profile, contains "→" and "FL" | § 7.1.6, review |
| E4 | Details and Flight contents | Tap Détails: the title changes, the content is a compact list (`dl` or rows: each row = name, value); ✕ returns to the profile. Tap Vol: same pattern, contains the forecast-not-loaded message in the body, not in the title | user "trop gros, pas assez synthétique"; review |
| E5 | One "i" only | No button in the module labelled "i" / "Infos" doubles another: at most one "i" on the page, and not the frame's (`#fInfo` is gone, rule 14; the legend chip is the one that may come) | user "le double bouton i sert à quoi ?" |
| E6 | Hint once | The "toucher la carte" hint appears as a notification at most once per page life, never as an element over the map | review |

## F. Fuel (`modules/fuel/SPEC.md`, lot `v3-fuel-ergo`)

| Id | Case | Expected | Rule |
|---|---|---|---|
| F1 | Opens on the Plan | `#fuel` at 390: the "Devis" view (plan) is active at mount, not the Sheets (Fiches) view: the segmented control's first button `aria-pressed="true"` | user "la vue fiches ne devrait pas être active par défaut" |
| F2 | Compact result bar | At 390 after a computed quote (seed or fill the form with the demo values the module offers): the sticky result bar is one context line (ellipsed, `white-space: nowrap`/overflow hidden), three one-line tiles "Étape / Temps / TOD" (**×4 langs**); its height ≤ 120 px | lot `v3-fuel-ergo` |
| F3 | Units | The display units selector offers kt/km/h, ft/m, NM/km/SM; switching distance to km changes the distance figures' unit text in the result bar and keeps FL as FL | lot `v3-unites-carburant` |
| F4 | Width | No horizontal page scroll at 390 and 360 (known follow-up: `.fu-when` row overflowed to 402 px on 24 Oct — the case must **fail** until it is fixed, and say so) | CLAUDE.md "pages sans débordement" |
| F8 | Auto airways | `#fuel` at 390, Route step, the base holds synthetic airways (`lib.synthetic_airways()`: UT460 FL195–FL460, UZ99 from FL330, UL9 a detour): the Auto button is a 44 px target in the route field's row, titled in the run's language; on `LFRS LFML` at FL270 it writes `LFRS TSA01 UT460 TSA05 LFML`, seven points (the middle ones `via` UT460), a distance above the straight line, no "unknown points", the notification "1 airway written, d NM" (**×4 langs**); a second tap changes nothing ("nothing to fill in"); at FL100 only the low UL9 is open, a detour: "no useful airway between LFRS and LFML" and the text unchanged | user 25 Oct "Oui pour auto" |
| F9 | Routing bench | `modules/maps/test/routing.html` reports no failed check: path found, floor and ceiling within 100 ft, detour over 40 % rejected, short leg direct, text grouped "A AIRWAY B", composite designators, corridor asked of aerodb, `RoutingError` when the base is missing | `modules/maps/lib/routing.js` |
| F5 | Step tab wording | The tab labelled "Devis" and the step 4 "Devis" do not both appear in the same view (known wording follow-up: assert and let it fail if both present) | journal follow-up |

## G. Flightlog and report (`modules/flightlog`, `modules/report`)

| Id | Case | Expected | Rule |
|---|---|---|---|
| G1 | Pending record | `seed_pending(1)`: `cache/flightlog/pending.json` schema 2 is read by the frame: the gear's badge is green and the Status block of Settings has a flight row whose tap goes to `#report` with the handoff (hash or query carries it); `pilot/handoff.json` (or the frame's equivalent) is written (SKIP if no seeding) | `frame/INTEGRATION.md` § 10 |
| G2 | Flightlog loads | `#flightlog` at 390: no error, filters and totals present, empty-state text translated **×4 langs** when nothing is seeded | module |
| G3 | Report three steps | `#report` at 390: the three steps are shown, the first active, next/previous controls ≥ 44 px; without data the form is empty and no error | module |
| G4 | Report screen uniform, no overflow | `#report` with the current flight taken (`seed_flight`, "Use"), 390 and 360 px, day and night, **×4 langs**, the three steps: `scrollWidth ≤ innerWidth`, no shown element of the module past the right edge, no `f-badge` in the field grids, the fields of one card within 2 px of one height (≥ 44 px), at most two computed font sizes in the grids (label, value), one `h2` size, the save bar ≤ 112 px with its buttons on one line (≤ 48 px high) in one font size and weight, a provenance line "Prefilled from: …" exists, no `font-size` in `modules/report/module.js` outside `--sog-size-*` | `modules/report/SPEC` § 2 bis |

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
| L1 | Airspaces card hidden under the map buttons, unclosable, 90 % of the map on a phone (23 Oct, maps) | Screenshot at 390 + box measurement | **new D11**: open an airspaces list (tap the route at a point, or the ✕-closable content): the content is in the sheet, ✕ reachable (inside the window, not covered: `elementFromPoint` at its centre is the ✕), the map keeps ≥ 50 % of the view; the list is in the body's font size (±1 px) and one line per airspace ("1 · name · levels · class", levels kept) at 390 and in the landscape column (24 Oct, "texte trop gros") |
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
| `frame/help/**`, `apps/aide/**`, `modules/*/help/**`, `docs/**`, `*.md` | I (+ A11 A17 A18 when a manual or the help code changed) | documents only |
| `modules/maps/lib/map_base.js` | D E B I | shared map base: both map modules |
| `modules/maps/**` (other) | D B C I | the map module and the primitives it uses |
| `modules/atmosphere/**` | E B C I | same for atmosphere |
| `modules/fuel/**` | F I (+ A7 popover: fuel is in the Préparer group; A2 A17 A18: title in the header, help anchors, how-to card) | fuel |
| `modules/flightlog/**`, `modules/report/**` | G I (+ A8 A9: the Status block and the gear read flightlog's pending file; A2 A17 A18: title, anchors, card) | flightlog and report |
| `frame/settings/**` | A8 A12 A19 D5 I | settings screen, its Status block and the keys of the device; aerodb warning on maps |
| `frame/store/**` | A12 A15 A19 I | data layer: settings, access states, keys of the device |
| `frame/aerodb/**` | A12 D5 I | settings screen; aerodb warning on maps |
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

Sources: `V3_SPECIFICATION.md` § 7.1 (the bar is the order of a day: Préparer · Carte · CR · Vols · Météo, rule 14; Réglages is the gear),
`modules/fuel/SPEC.md` § 4 (`pilot/<trigram>/current_flight.json`) and § 12 (started flight), `modules/flightlog/SPEC.md`
(`cache/flightlog/pending.json`, `pilot/handoff.json`), `modules/report/SPEC.md` § 2, 3 bis, 6, `frame/settings/SPEC.md`.

| Journey | Steps (in order) | Files that carry it (globs) | Guard cases | End-to-end case |
|---|---|---|---|---|
| **P1 Préparer un vol** | Préparer › Devis: aircraft, departure, arrival, alternate, load → quote (block, trip, time, TOD) → level decision (Fiches / levels) → `current_flight.json` written as *planned* → Carte shows the route, the profile and the title "Profil · FL · NM · vol prévu" → Météo (atmosphere) reads the same flight, "Charger" is the user's one shot → back on Carte the Météo chip draws the cut | `modules/fuel/**`, `modules/maps/**`, `modules/atmosphere/**`, `frame/app.js` (navigation, records), `frame/lib/sheet.js`, `frame/design/primitives.css`, `frame/aerodb/**`, `frame/weather/**` | F1 F2 F3, D1 D3 D4 D7, C2 C5, E1 E3, B1–B4 | **J1**: on a phone, fill the quote with the module's demo values (or seed the inputs), read the result bar, open Carte (`#maps`) and assert the title carries the same FL and distance as the quote (±1 NM), open `#atmosphere` and assert its title names the same flight (from → to, FL); the "Charger" step is **not** clicked (one shot per user, network blocked): assert the button exists and the message "not loaded" is in the body, then return to Carte and assert the Météo chip is present (hidden or shown, no error) |
| **P2 Voler** | Préparer: "Démarrer le vol" (fuel § 12) → `started = {at, by}` → gear badge green, Status row "Vol en cours › Carte" → Carte: title "vol en cours", Follow shown, position from GPS or none (notification once), progress block in the sheet notes → full screen → end: "Annuler le démarrage" or the report | `modules/fuel/progress.js`, `modules/fuel/module.js`, `modules/maps/**`, `frame/app.js` ("i", position, `frame-fullscreen`), `frame/lib/geo.js` | A8 A9, D8, B5 B7 B8 | **J2**: seed a planned flight, start it from fuel (the button, or `seed_flight(started=True)` if the button needs the network, and say which), assert the "i" badge is green and its row leads to `#maps`, the maps title says "vol en cours" (×4 langs), Follow is shown, full screen works, then cancel the start from fuel and assert the title is back to "vol prévu" and the badge is off |
| **P3 Rendre compte** | Vols lists a flight without a report → `pending.json` (schema 2, `handoff`) → gear badge green, Status row "CR à écrire" → tap → `pilot/handoff.json` written → `#report` prefilled (family, values) → three steps → save (`sog-report/1`) → record on the website (same gesture; offline: queued, said so) → `started = null`, pending cleared, Vols shows the report | `modules/flightlog/**`, `modules/report/**`, `modules/website/**`, `frame/app.js` (§ 10 pending, handoff), `frame/settings/join.js` | G1 G2 G3, A8 A9 | **J3**: seed one flight without a report, assert the badge and the row, tap it, assert `#report` opens on step 1 with the handoff values in the form (at least from, to, date), walk the three steps with the minimum required fields, save; the website recording is **SKIPped inside the case** with the reason "no website in the suite" and the case asserts the report is in the local cache, the pending record is empty and the badge is off |
| **P4 Relire ses vols** | Vols: list, filters (period, aircraft, without report), totals, export; the website log and the network sessions (IVAO / VATSIM) merged when the access is set | `modules/flightlog/**`, `modules/website/**` | G2 | **J4**: seed three flights (two with reports, one without), assert the totals (count, hours ±1 min) and the "Without report" filter gives one, export produces a file (download event) with three rows |
| **P5 Installer et synchroniser** | first launch without trigram → amber badge → Réglages: trigram, data access (GitHub mode or launcher), join the airline → sync dot (header on a screen, Status line on a phone) → offline: amber, writes pending → conflicts screen → design and language choice → help | `frame/app.js` (data layer, sync, conflicts), `frame/settings/**`, `frame/design/**`, `frame/help/**`, `frame/manifest.webmanifest`, `frame/sw.js` (if any), `frame/index.html` | A2 A3 A8 A9 A10 A11 A12 A15 A19, H1–H3 | **J5**: start with nothing seeded, assert the amber badge and the trigram line, open Réglages, set the trigram `ABC`, assert the badge turns off (or green if something else applies), switch the language to `en` and the design to `metro` from Réglages and assert the header and bar follow without reload, go offline (`context.set_offline(True)`), assert the amber badge and the "i" line say offline, back online, assert it clears |
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
