# settings — decisions log

The settings agent's memory: every choice, dated, with its reason. Newest last. Project-wide decisions are in
`docs/technique/V3_SPECIFICATION.md` § 8; the frame's in `frame/DECISIONS.md`.

- **23 Oct 2026 — Role taken** by the session that wrote V2's data access (GitHub mode), the keys card, identity and
  networks and the signed accounts S1–S2. No signed accounts in the Pilot application: V2's code stays dormant on
  develop (V3 spec § 8).
- **23 Oct 2026 — Lot 1 (reading)**: [READING.md](READING.md). Proposed, awaiting the ergonomics session's go:
  - settings is a frame screen (`frame/settings/`, `#settings` replacing `#device`), not a module, because it sets the
    transport and the device token, which modules may not touch;
  - V2 cards kept: identity (without the website login), access, keys (launcher only), offline data, about,
    diagnostics; the rest goes to the modules that use it, to CPCO, to the design block, or is dropped;
  - one-tap take-over of V2's identity and access on the same origin;
  - cards saved one by one, phone first.
- **23 Oct 2026 — Lot 1 validated** by the ergonomics session; answers to the three questions (the user may reverse
  them):
  - "Alone on this device" is not a box: it is the state shown when no exchange is ticked; ticking an exchange
    replaces it. No boxes that contradict each other;
  - export and import of the device's data for single use: yes, one file — the only backup of disconnected mode;
  - the usage level is chosen in Settings only; the frame's menu stays verbs.
- **23 Oct 2026 — Lot 2, the settings screen** (`frame/settings/settings.js`, [SPEC.md](SPEC.md),
  [INTEGRATION.md](INTEGRATION.md)):
  - a classic script loaded by `frame/index.html`, routed by `frame/app.js` (`#settings`, `#device` kept as an alias);
    the frame's `#device` screen is removed;
  - a wider context than a module's (`FD`, `own`, `reload`, `launcher`, `transport`, `aerodb`, `syncNow`): settings
    sets the transport and the token;
  - `usages.single` is still written (true when nothing is ticked) so that older readers keep working;
  - export / import without a frame change: an adapter with no read prefix and the write prefix `''` reaches every
    path for writing without changing what the synchronisation pulls (reads are declared, writes without merge or
    policy are not); reference bases are left out, device files other than the identity too (the usages of another
    device must not switch this one's transport);
  - "Cut access" uses `FrameData.github.clear`, already in `transport_github.js`;
  - V2 take-over: identity always, access only when the frame has none, answer kept in `device/settings.json`;
  - keys: the V2 launcher routes (`/__setup/secrets`, `/__setup/secrets/test`), IVAO only, never a value shown;
  - offline data: aerodb's `status()`, the browser's storage estimate, and aerodb's lot 4 (`aerodb.offline`, arrived
    during the lot): one row per zone with "Keep offline" and "Free"; "Free" only when `offline.supported().evict`.
    Until the frame's adapter offers `cached` and `evict` (asked by aerodb), states read "unknown" and no zone can be
    freed; "Keep offline" already works.
- **23 Oct 2026 — Tests of lot 2** (`frame/index.html` in the built-in browser, 375 px and screen, French and
  English):
  - through `frame/store/test/fake_github.py`: V2 take-over (identity and access copied, card gone), "several
    devices" ticked → GitHub transport, access and synchronisation cards, "Test", "Synchronise now", "Cut access"
    (token erased, transport back to local with the "no way to exchange" sentence), identity checks, export (two
    files, references left out) and import (paths outside the data and reference bases refused, identity and file
    restored);
  - through the launcher (`tools/launch.py` on a copy of test data): keys card shown, a fictitious key saved then
    erased (the IVAO API was not called);
  - zones card with a simulated `aerodb.offline` handed to the screen from the console (no published SIA base on this
    workstation): rows, keep with progress, free, aircraft row, notifications, 375 px without horizontal scroll;
  - not testable here: a refused token (the frame's fake GitHub does not check tokens), keep / free on a real
    published base.
- **23 Oct 2026 — Lot 3, the Level card** (ergonomics session's go):
  - three levels at most: Discovery (1), Everyday (2, the default), Full (3), in `device/level.json` (device cache);
  - the frame's menu shows the modules whose `meta.level` is at most the device's; a hidden module stays reachable by
    its address; the first visible module is the default screen;
  - done by settings in `frame/app.js` (ergonomics session's request), told to the frame agent through the ergonomics
    session: `readLevels()` imports each entry point once at start (as the service worker's precache already does)
    and keeps `meta.level`; the menu is redrawn only when its list changes; `loadDevice` reads the level with the
    identity and the usages, so a change (here or in another tab) applies at once;
  - one tap per level, no "Save": the card's "Menu:" lines say what each level shows.
- **23 Oct 2026 — Tests of lot 3** (fake GitHub serving the repository, 375 px, French): with the example module set
  to level 3 for the test only (not committed), the menu shows fuel and report at levels 1 and 2 and the three verbs
  at level 3; `#hello` still opens at level 1; the card's lines match; no JavaScript error.
- **23 Oct 2026 — Lot 4, on the frame's lot 6** (ergonomics session's go):
  - the backup uses `FrameData.dump()` / `FrameData.load()`; the provisional adapter with the write prefix `''` is
    gone. Two import buttons rather than one question with two answers: "Import (merge)…", the safe one, and
    "Replace from a file…", whose question says what is erased;
  - "Cut access" calls the context's `cutAccess` (the frame owns the token and the transport);
  - zones: the frame's adapter now has `cached` and `evict`, so `aerodb.offline.supported()` is true and the card shows
    real states and "Free" with no change in settings; the aircraft row hides an unknown number of types;
  - sizes are written with the units of the application's language.
  - Known by the frame's design, told to the ergonomics session: a merge also takes the device files of the backup
    (`device/…`, cache policy) when they are newer, so the usages of the saved device may come back with them.
- **23 Oct 2026 — Access without an exchange** (help lot 3, the user's question on the GitHub site): a device with
  neither launcher nor access has no aeronautical and no aircraft base. The Access card now shows without an exchange
  when no launcher serves the page, with a hint that it then only reads the bases; "Offline data" says what to do when
  nothing can provide them. Checked: alone with an access set, the transport stays local and the warning goes.
- **23 Oct 2026 — Remote repository of data/ on a launcher** (the user's question, through the ergonomics session):
  - the Access card is always shown; on a launcher it reads `GET /__setup/sync-remote` and sets the address with
    `POST /__setup/sync-remote` (check, then save), the V2 first start's routes and rules: another repository than the
    current one or the configured one is confirmed in a window the launcher opens on the computer, which a page can
    neither see nor answer; never blocking;
  - the check's report stays shown after a save (only the "Current" line changes), so an unreachable repository is
    seen even when saved;
  - without git: a sentence and a link to the help section "A git repository for data/" (anchors checked in the four
    manuals); "Several users" without a remote: a warning on the Usages card;
  - tests on isolated copies of the test data whose remote was first pointed to `https://example.invalid/…` (the copy
    still pointed to the real data repository): current address, check ("unreachable host"), save of the same address
    (no window), no remote, no git. Saving another address was not tried here: it opens a confirmation window on the
    user's computer.
- **23 Oct 2026 — Tests of lot 4** (fake GitHub serving the repository, 375 px, French): export (dump format, counts),
  merge keeping this device's newer record, replace bringing the backup's record back, both questions; "Cut access"
  (GitHub → local, setting erased, "no way to exchange" sentence); `cached` / `evict` present on the adapter; real
  aerodb state for the aircraft base; no JavaScript error. Zones with a real published base: aerodb's bench.
- **23 Oct 2026 — A door for data/ without git** (the user: "data/ cannot simply become a git repository"):
  - on a launcher, the Access card now offers "Fetch the data" (`/__setup/clone`, the V2 first start's route) when
    `data/` is missing, and "Take data/ into this repository" (`/__setup/adopt`, added to the launcher on develop by BUGS
    SOG) when `data/` has no git; the launcher's `state` field is used when present, else deduced from `/__setup/status`
    and `sync-remote`;
  - the frame's launcher detection treated a launcher without `data/` as no launcher: settings now keys the card on the
    launcher itself, and `redetect()` (settings context) detects it again after a clone or an adoption;
  - username and secret are optional (Git's own credentials otherwise) and the secret field is emptied before the
    call; "remember" is the launcher's (`git credential approve`);
  - tested: absent `data/` (door shown; clone towards an unresolvable address reported; clone of a local test
    repository served over dumb HTTP succeeded, launcher detected again, card redrawn with its remote and branch),
    `data/` without git (door shown; the launcher of this worktree has no `adopt` yet: "restart it up to date"); 375 px.
    To check when the route is there: the adoption itself.
- **23 Oct 2026 — Design card** (design lot 2, through the ergonomics session):
  - thumbnails are real previews: the design is put on a small block (`[data-design][data-tone]`, allowed by the
    design tokens), so each shows its own background, surface, border and accent; the tone shown is the one in use;
  - settings only calls `ctx.saveDesign` and reads `ctx.design()` / `ctx.designs()`; the frame applies and keeps the
    mirror and `device/design.json`;
  - the help panel's and contents' summaries take the frame's common style (44 px, chevron): the `.f-help>summary`
    rules are gone from `frame.css`;
  - "About" card added in the same week (help, roadmap, folded diagnostics); the Settings chapter says so;
  - tested: cabinet then night applied on `<html>` and on the thumbnails, back to standard / automatic; no JavaScript
    error.
- **23 Oct 2026 — Adoption checked on the launcher's route** (v3 010a41d87, `state` absent | plain | repo):
  - test copies only, with a local repository served over dumb HTTP; the airline's repository never used. Another
    repository than the configured one opens a confirmation window on the computer, which a page must never answer:
    the first attempt waited on it and the launcher was stopped (the window closed with it); the tests then set the
    local repository as the configured one in this worktree only (not committed);
  - test data set (`jeu_essai: true`): set aside in `data_avant_<date>/`, then cloned; a copy with a record of its own
    (`ZZZ`): kept and committed locally ("Reprise du poste ZZZ"), one file replaced and copied aside, nothing pushed;
  - the card now sends the device's trigram as `author` (the launcher used "POSTE" otherwise), and keeps the launcher's
    report visible in the redrawn card after a success (it says nothing is sent until "Synchronise").
