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
- **23 Oct 2026 — The launcher's confirmation window made visible** (the user did not know what to do with "takeover
  not confirmed"): with an empty `dataRepo`, every address asks for the Yes / No window on the computer. The card now
  says so before the click, tells to answer it while waiting, and passes the launcher's precise reason after a refusal,
  with a pointer to look behind other windows when one is already open; same for saving another remote. Coded against
  the contract (`needsConfirm`, `confirm`) with a local fallback; checked without opening any window: hint shown for
  any address with no configured one, hidden for the current address (also with a final `/` or without `.git`), shown
  for another one.
- **23 Oct 2026 — Checked against the launcher's contract** (v3 97bc12dec): the sentence before the click asks the
  launcher (`adopt` with `dry: true`, cached per address and cleared at each drawing) and falls back to the local
  comparison; the refusal texts ("Reprise non confirmée : <reason> data/ inchangé.", "Une autre fenêtre de confirmation
  est déjà ouverte…") are shown as they are, the "already open" one recognised by its text. Checked without opening any
  window, the configured address set to a dummy one in this worktree only: configured address (with a final `/`):
  hidden; another: shown; empty or invalid: hidden.
- **23 Oct 2026 — Usages on a launcher without an exchange** (frame lot 9: on a page served by the launcher, `data/` is
  the device's storage, launcher transport by default; git exchange only with "several devices" or "several users"):
  the state sentence says "This workstation reads and writes the launcher's data/ folder; tick an exchange usage to
  share it through git"; without a launcher, "Alone on this device" as before. The Settings chapter says the same in
  four languages.
- **23 Oct 2026 — Readable diagnostics** (frame aa9412ffe, `ctx.diagnostic()`): the folded diagnostics of the About card
  show one row per value — transport, online, last sync, pending, last error, repository tree (head, read at, files,
  checked), references (known, SIA, aircraft, cached), last read error, aero base (source, published, open, missing
  zones, error) — labels in four languages, values raw; "Copy" puts the full JSON (the frame's diagnostic plus usages,
  launcher, repository without token, storage, browser) on the clipboard. Checked with the launcher; no token in it.
- **23 Oct 2026 — Weather key** (frame lot 12, contract agreed with the frame session): the key is not a device file —
  `FrameData.dump()` exports `device/` — but lives in `localStorage` `githubData:avwx`, like the GitHub token (outside
  V2 browser backups and outside the IndexedDB cache); the frame reads it, adds `Authorization` to avwx.rest calls in
  `ctx.net`, and gives settings `weatherKey { has, save, clear, test }` only. Card shown with or without a launcher;
  the Settings chapter has a "Weather key" section in four languages.
- **23 Oct 2026 — Little Navmap card written by aerodb** (aerodb lot 5b, v3 642bd45fd): accepted exception to "settings
  draws its own cards". The two-way sync between the performance sheets and a folder of .lnmperf files, its states
  and its launcher routes belong to aerodb; settings only places an empty, hidden block after the launcher keys (launcher
  and `aerodb.lnmperf` present) and shows it once aerodb's `card()` has filled it; a failure leaves it hidden. The
  section "Little Navmap sheets" of the Settings chapter, written by aerodb in four languages, stays in the chapter
  (labels checked against `lnmperf.js`). Checked at 375 px with the launcher: no horizontal scroll, buttons wrap.
- **23 Oct 2026 — Configuring a pilot** (the user's request, through the ergonomics session; [SPEC.md](SPEC.md) § 5):
  - the logic apart, in `frame/settings/config.js` (schema, templates, compression, validation), the screen in
    `settings.js`; no change to `frame/app.js`: settings reads the address's query itself and declares its own adapter
    for `airline/settings.json`;
  - the repository is read from the remote of `data/` without its credentials (an address `https://user:secret@…`
    loses them), so a file never carries a secret; the token's how-to is in four languages in the file, so the pilot
    reads it in theirs;
  - the GitHub transport of a device without launcher speaks only the GitHub API: a GitLab / framagit repository can
    only be joined through a workstation's launcher (clone with the token), and the import says so instead of setting a
    half access; usages are ticked only when an access is set, so a device never exchanges with no repository;
  - the airline is written to the repository only when it has none after the first synchronisation: the repository's
    document stays the reference;
  - the link's base: the app's own address when it is published (https, not local), else an address typed once and kept
    on the device (`sogFrame:appUrl`); the code holds no site address;
  - an optional `data.api` (https, or http on 127.0.0.1 / localhost) keeps GitHub Enterprise possible and made the tests
    possible on the fake GitHub of `frame/store/test/fake_github.py`;
  - tested: export on a launcher (screen, fictional airline committed in a test copy whose remote is
    `example.invalid`: "ask your administrator" how-to) and from a device set on the fake GitHub (GitHub how-to); import
    by link at 375 px in a fresh browser (Test, Apply: identity, usages, access, first synchronisation, airline written
    once — a second import left it), by file from the welcome card, refusal of another schema and of a broken link,
    and on a launcher whose `data/` already follows the repository (no token asked, access unchanged). Clone and
    take-over through the launcher were not run (they open the launcher's confirmation window on this computer).
- **23 Oct 2026 — Pending writes listed** (frame f4c9f7211: `FD.status().queue`): the Synchronisation card lists
  them under its figures, newest first (20 at most), with path, module, time and ✕ for a deletion; the card now also
  shows without an exchange while writes wait — the launcher is the default transport since frame lot 9, and a write
  waiting there was otherwise invisible — and hides again once the queue is empty. "Synchronise now" unchanged. Checked
  with the launcher on the test folder: a write and a deletion listed, then gone 2 s later once sent.
