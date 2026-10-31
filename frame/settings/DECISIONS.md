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
- **23 Oct 2026 — Administration card** (the user's request, through the ergonomics session; [SPEC.md](SPEC.md) § 6):
  a card after About, only at the Full level, from a declared list (`admin_links.js`) so a link is added without
  touching the screen; benches are always named, but linked only on a workstation with a launcher (they are files of
  the suite served by it), V2 pages are shown only with a launcher; "Diagnostics" is an action that opens the About
  card's folded diagnostics rather than an anchor, the hash being the router's. Checked: absent at Everyday, present at
  Full with the launcher (eleven links, every page answering 200) and without (benches without links, no V2 page).
- **23 Oct 2026 — How-to always shown; sign-up first** (user's feedback): the "Configuration received" card hid the
  token's how-to when the workstation's `data/` already followed the repository — the case of an administrator trying
  his own export; it is now always there when the file has one (folded, with its title, in the device's language,
  falling back to French). Each how-to now starts with creating the account (`https://github.com/signup`, or
  `https://<host>/users/sign_up` for GitLab / framagit) and, for GitHub, accepting the invitation
  (`https://github.com/<repo>/invitations`). A link opened now wins over a file chosen before it.
- **23 Oct 2026 — Join the airline** (the user's request, through the ergonomics session; [SPEC.md](SPEC.md) § 5,
  § 7): the import was not turnkey for a pilot without a GitHub account, so it became an assistant, one screen per step,
  its progress kept on the device (never the token) and resumable:
  - the "Configuration received" card is replaced by the assistant; link, file, Settings and the welcome card all lead
    to it (`#settings?join=1`);
  - the invitation cannot be checked before the token exists (the API needs the token), so step 3 is a box, and step 5
    turns GitHub's answers into sentences (404: invitation not accepted or repository not in the token; 401: token
    wrong or expired; 403: no Contents right);
  - no screenshots of GitHub's own pages: taking them needs a signed-in account, which this agent does not use; each
    step gives the direct link and the exact labels instead, and the tutorial shows the assistant's screens;
  - the token is valid one year in the assistant's steps (GitHub's "Custom"), against 90 days in the older how-to;
  - the administrator's side lists their steps (invite with the Write role — link to the collaborators page —, export,
    send) and shows a QR code of the link, generated by `frame/lib/qr.js` (pure JavaScript, byte mode, versions 1 to
    40, owner settings). It was checked with an independent decoder written for that (`frame/lib/test/qr_check.py`:
    format and version BCH, Reed-Solomon syndromes per block, text read back), the Reed-Solomon reference example of the
    standard and the standard's capacities; no external library. The link drops the how-to (rebuilt at import) to keep
    the code small;
  - tested on the fake GitHub at 375 px, French: the seven steps, "Test" required to go on, the 404 sentence, resume
    card, empty state from the welcome card, file import (short path 1–6–7 for an unknown host), first synchronisation
    and airline written; the QR of a real export decoded back to the link.
- **Later (idea): GitHub sign-in by the "device flow"** — the app would show a short code to type on github.com, and
  receive a token without the pilot creating or copying one. It needs a relay (the airline website's web service, or the
  launcher): GitHub's device-flow endpoints do not answer browsers (no CORS), so a phone without a relay cannot use it.
  To take up once such a relay exists.
- **23 Oct 2026 — Token by repository owner** (the user's finding): a fine-grained token can only target repositories
  its owner holds, or those of an organisation they belong to; a pilot invited to another user's private repository
  cannot create one for it. So the export reads the owner's type (`GET users/<owner>`, public API → `data.ownerType`
  `User` or `Organization`, absent when unknown) and the how-to and the assistant take the matching way:
  - a user's repository (or unknown owner): a **classic** token — direct prefilled link
    `https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote`, one year, scope `repo` only — and
    said honestly: it opens every repository of the account, hence an account dedicated to flying when the pilot has
    others (said at steps 2 and 4);
  - an organisation's repository: the fine-grained token as before (resource owner the organisation, only this
    repository, Contents read and write), the organisation having to allow them;
  - later, sign-in without a token (OAuth or a GitHub App, like the device flow above) once a relay exists.
  "Test" accepts both forms (`ghp_…`, `github_pat_…`: the transport sends `Bearer` either way); its 403 sentence names
  both rights. The how-to's prefilled link is now linked whole (escaped `&` kept in the address).
- **23 Oct 2026 — Copies that work on a paired tablet** (frame lot 18: the app served over http by the workstation's
  launcher has no `navigator.clipboard`): the diagnostics, the configuration link and the assistant's username are
  copied through fuel's `frame/lib/clipboard.js` (loaded on demand, settings being classic scripts): the clipboard, else
  a hidden field and `execCommand`, else the text shown selected — in the link's own field, or in a field after the
  button — with "Cannot copy here: the text is selected, copy it yourself". `lib/clipboard.js` is in the service
  worker's list. Checked with the clipboard removed, then `execCommand` failing too.
- **23 Oct 2026 — Card "Computer access" (written by the V3 frame session, lot 18, while the settings session was
  closed)**:
  - Through the frame's `lan()` context (`frame/SPEC.md` § 3.10), only on the computer that serves the page.
  - It shows the state, the main address with its QR code (`SogQR.svg`, as for a pilot's configuration), the pairing
    code and its limits, the paired devices, and "Forget the devices" (asks).
  - A "trusted network only" warning stays visible.
  - The state is read every 5 s while the card is connected: a code renewed after too many wrong tries, and a new
    device, appear without reloading. It is drawn only when it changes.
  - The Diagnostic gains three rows from `d.page`: secure context, offline use, and the launcher's computer (and
    whether through the local network).
  - Help section "The tablet next to the simulator" ×4.
  - Tests:
    - on the computer: open, then code, address and QR shown; close; reopen with a new code; forget (asked);
    - on the device: no card; the Diagnostic says offline is impossible and gives the computer through the local
      network;
    - 375 px fits; no JavaScript error.
- **23 Oct 2026 — Card "Computer access" after the security review (lot 20, written by the V3 frame session)**:
  - The code's minutes left, "no code in progress" or "pairing closed", and "New code" (the launcher no longer
    renews a code by itself).
  - Paired devices listed by their short name, each with "Forget" (asks).
  - The computer's other addresses, closed by default, with "Open them too".
  - The state key holds the minutes left, not the seconds, so the card is drawn again only when something shown
    changes.
  - The help's last bullet ×4 is updated, with the fingerprints.
- **23 Oct 2026 — Times of the Synchronisation card in UTC (written by the V3 frame session, lot 23, the settings
  session being unreachable)**: following the rule "every time in UTC with Z" (`frame/lib/time.js`), "Last sync" goes
  through the frame's `c.time.fmtDateZ`, and each pending write shows `c.time.fmtZ` the same UTC day, otherwise
  `c.time.fmtDateZ`. Nothing else changed in `frame/settings/`.
- **24 Oct 2026 — "No SIA base" in an app added to the home screen (relais cloud; the user: « j'ai un « pas de base Sia » dans les
  applis web « sur l'écran d'accueil » », then « La base finit par arriver. Background ? Fausse alerte donc. »)**:
  - **Scope change during the lot.** The first reading was "the home-screen app has a storage of its own (iOS: no token, no
    trigram, no cached zones; WebKit's storage notes, recalled, not re-read: this container has no outside access)". The user
    then said the base does arrive: so the message is a **false alarm during the load**, not a missing setting. The first-launch
    opening of Settings, the "Home-screen app" card and the standalone detection were dropped (not written to the repository).
  - **Why "not published" appeared while the base was coming** (read in the code):
    1. Maps tested `!st.published || no zone` on `aerodb.status()`. `published` is empty both for "read nothing" and "read a
       repository with nothing published": the two were one message.
    2. `published()` kept its answer for the page's life. An answer given **before the reference tree was readable** (first
       launch, network not ready, access set after the first question) stayed "empty" until a synchronisation pulled a changed
       file: `FrameData.list()` swallows a failed tree read and returns only the cache, so aerodb read `{ zones: {} }`. The base
       "finished by arriving" when the background synchronisation, or the next launch, filled the cache.
    3. While the read was in progress nothing was said, and worse the map stayed blank: `readFlight()` awaited the alternate's
       coordinates from the same base, so the route and the note waited for the whole read.
  - **Done.** aerodb tells three states apart without reading (`aerodb.state()`, `on('state')`, `refresh()`, option `access`):
    `loading`, `noaccess` (no launcher and no repository + token), `unpublished` (the access works, nothing published); an empty
    list is read again after 30 s at the next question, and the frame calls `refresh()` when the access changes
    (`dataAccess().key`) or the network comes back. Maps' sheet note says "Aeronautical database loading… (zones)", or "Data access
    not set on this device" with a "Settings" button, or the previous message only for the third state; the alternate no longer
    blocks the map; the "i" pop-up has one line `base` for the same three states (no amber). Four languages everywhere.
  - **Tests.** A15 "Aerodb loading state" (fake GitHub held, then released: loading note and "i" line, note gone; access cut:
    "access not set" with the button), D5 (no access) and D5b (access set, nothing published). Not testable here: a real iPhone.
  - **Not done.** Serving the base from the public pages: `frame/aerodb/DECISIONS.md`, two lines.
- 24 Oct 2026 — the map threshold tuning link of the Administration card is now a button "Map threshold tuning (administrator)" (`btn: true` in `admin_links.js`, `f-btn primary`) with a sentence saying what the page is for; nothing else changes (Full level only). Asked by the maps relay lot; case D16.
- **24 Oct 2026 — The status block opens the screen** (relais cloud, branch `v3-cadre-barre`; `V3_SPECIFICATION.md` § 7.1 rule 14, which
  removes the header's "i" button and its pop-up; written by the V3 frame session).
  - **What**: a first card `[data-card="status"]`, titled "Status" / "État" / "Status" / "Estado", that carries the lines of the
    old pop-up with the same texts and the same actions; the "Help for this screen" line is gone (the header's "?" is that).
    The screen's folded help panel moves under it.
  - **Who draws it**: the frame. The state belongs to it (current flight, the pending reports of flightlog, the sync state,
    aerodb's state, the launcher, the position) and is shared with the badge of the ⚙; settings would have to read all of it
    again and keep it in step. Settings is an "over" of the frame but draws its content in one `innerHTML` and redraws it
    by `again()`, so the card could not be prepended once by the frame. Contract: `ctx.status = { html(), bind(card) }`;
    `html()` is the card at the value of the moment (a string, placed first), `bind(card)` hands it to the frame, which
    rewrites it only when its content changes (signature in `data-sig`) and lets it go when it leaves the page. Documented in
    `frame/INTEGRATION.md` § 10.2.
  - **Rows that pointed to "Settings"** (trigram, base, data, launcher) now scroll to the card that holds the answer
    (`card:identity`, `card:access`, `card:sync,usages`) and focus its first field: a hash that does not change does nothing.
  - Not changed: the other cards, their order, their saving rule.
- **25 Oct 2026 — Settings lost after a Safari relaunch: the cause, and the keys now persist like the identity**
  (relais cloud, branch `v3-settings-admin`; `V3_SPECIFICATION.md` § 10.16; user: "les settings ont tous sauté cette nuit sur
  les clefs avwx et github. A priori relance de Safari. En revanche, RBR et IVAO sont restés").
  - **Diagnosis, from the code** (no browser of the user's was available; what follows is what the code proves, and one
    inference marked as such). Two different stores held the device's settings:

    | Setting | Where it was | Store |
    |---|---|---|
    | trigram, IVAO VID, VATSIM CID, SimBrief id | `device/identity.json` | IndexedDB `sogFrame`, store `docs`, policy `cache` |
    | level, usages, design | `device/level.json`, `usages.json`, `design.json` | same |
    | GitHub access (repo, branch, **token**) | `localStorage['githubData:frame']` (`frame/store/transport_github.js`) | `localStorage` |
    | avwx.rest key | `localStorage['githubData:avwx']` (`frame/app.js`, `weatherKey`) | `localStorage` |

    "RBR" and IVAO are fields of the identity: they stayed because IndexedDB stayed; the token and the avwx key went because
    `localStorage` went. Nothing in the code erases them: no `localStorage.clear()`, no purge at start, no `sessionStorage`
    (only the status block's dismissal uses it), no memory-only copy, no other policy; the only `removeItem` calls are the
    user's "Cut access" and "Erase". So the loss happened outside the code: Safari (iOS / macOS) evicts the script-writable
    storage of a site it considers unused, and **the two stores are not evicted together** (inference, consistent with the
    observation: the identity survived the very relaunch that cleared the keys). The code had put the two secrets in the
    store the browser gave up first.
  - **The reason the keys were in `localStorage`** is written (`frame/DECISIONS.md`, 23 Oct 2026, weather key; the header of
    `transport_github.js`; `frame/SPEC.md`): *not* a security reason but a backup one — `FrameData.dump()` exports the
    IndexedDB `docs`, and the keys must stay out of a backup (invariant 1), whereas `localStorage` `githubData:*` was already
    outside V2's browser backups. The security audits (`AUDIT_SECURITE_2026-10-07.md`, `APPLI_AUTONOME_SECURITE.md` § 4) say
    only that a token in the browser is readable by an injected script — equally true of IndexedDB — and plan an iOS
    Keychain (not done). **No written rule forbids IndexedDB for the keys**, so the relay's decision applied.
  - **Decision (relais cloud)**: the keys persist **like the identity** — same store (IndexedDB `sogFrame`, `docs`), same policy
    (`cache`), never synchronised — in one file `device/keys.json` (`SPEC.md` § 2).
  - **What changed**:
    - `frame/store/transport_github.js`: the access is held in memory (`config()` stays synchronous), `save` / `clear` call the
      function the frame gave through `persist(fn)`; `hold(cfg)` loads it; `legacy()` returns and erases the old
      `localStorage` value. `frame/store/frame_data.js`: `dump()` leaves `device/keys.json` out, `load()` ignores it in a
      backup and a `replace` keeps it (the keys are not in a backup; a replace must not cut the access).
    - `frame/app.js`, data layer only: `loadKeys()` (new; first line of `loadDevice()`), `keepKeys()` (new), the `avwx` variable
      in place of `avwxKey()`'s `localStorage` read, `weatherKey.save` / `clear` (now asynchronous), and the `storage` event
      listener on `githubData:frame` replaced by the existing `own.watch('device/')`. `loadKeys()` takes over the old
      `localStorage` values **once** (when `device/keys.json` does not exist), so nobody has to type them again, then erases
      them. A save is memory first, then file; a read waits for the last write and does not overwrite a newer save.
    - The frame asks the browser for persistent storage (`navigator.storage.persist()`, once, at the first touch — asked at start
      it shifted the map's attribution folding and made test D7 fail one run in two) and the diagnostic
      "Copy" now says `storage.persisted`; a granted request is the one thing Safari honours against eviction, and the next
      report will say whether it was.
  - **Still possible**: if Safari clears IndexedDB too (its seven-day rule for a site not used, outside a home-screen app),
    everything goes, identity included; a key lost that way must be typed again. Adding the app to the Home Screen is the
    remedy the manual now gives.
  - **Test**: A19 "Keys survive a relaunch" (a persistent browser context closed and opened again: the trigram, the token and
    the key are set from Settings, then there after a relaunch, then there after a relaunch that cleared `localStorage`). It
    fails on the code of `82a8f61be` at that last step exactly as the user saw it (`trigram` kept, token and key gone).
- **25 Oct 2026 — Administration behind buttons** (rule 18; user: "Tous les settings admin vont sur un bouton, comme celui des
  réglages de seuils"; the word is an intention, here applied as asked):
  - the Administration card (Full level; absent below, test A12) shows **one button per administrator page**, each with its
    sentence: "Map threshold tuning" (`#maps?tune=1`), "Flight zone limit", "Export a configuration for a pilot", then the
    roadmap, the diagnostics, the benches (greyed without a launcher) and the V2 pages (with a launcher). The "(administrator)"
    in the first title is dropped: the card says it.
  - **"Flight zone limit"** is a button that folds a panel open on its line, not a new route (nothing else is needed for one
    box, and the page stays one column): a box "Show the edge line of the flight zone limit", saved at once into
    `airline/map_profiles.json` as `edge: { show }`, shown by default. The contract for the modules is
    `INTEGRATION.md` § 4; settings touches no module.
  - **The export of a pilot's configuration** moved from a fold of the Access card to the Administration card (it is the
    administrator's steps: invite, export, send). The import stays on the Access card, it is the pilot's. Not moved: the
    launcher-only cards (data remote, keys, computer access, Little Navmap), which set up a workstation rather than administer
    the airline; the roadmap and diagnostics are also reachable from About, as before.

## 26 October 2026 — a "Data laboratory" button on the Administration card (aerodb lab P0, relay of the cloud)

User, 26 Oct: « Go. Tu inclus toi-même les injecteurs et mesures dans le lab. » The Administration card (Full level, test A12) gets **one more button**,
"Data laboratory" (`id: 'datalab'`, `href: '#datalab'`, `where: 'app'`, not `primary`: it is a measuring tool, not a setting), with its sentence in four
languages; the screen itself is aerodb's (`frame/aerodb/lab.js`, `frame/aerodb/DECISIONS.md` of the same day) and the frame's `ROUTES` / `SCREENS` carry its
address. Absent below the Full level (the address alone shows "reserved to the Full level"): tests A20, A12. Temporary: it goes with the laboratory. The Settings
manual says it in one paragraph per language, anchor `settings-datalab`, identical in the four.


## 27 October 2026 — the laboratory entry shows its absolute address (aerodb lab pass 2, relay of the cloud)

User, 27 Oct: « Ajouter un lien direct vers le labo depuis la page admin ; pour tester via github. » The entry was already a real `<a class="f-btn" href="#datalab">`
(44 px); what was missing is the address to open on the phone. `admin_links.js` gets an optional `copyLink`; `adminCard` then writes, under the sentence, "Address to open
or bookmark on the phone:" and the absolute address `new URL(href, location.href)` (on GitHub Pages `https://<owner>.github.io/<repo>/v3/frame/index.html#datalab`, locally the local
address: nothing is written in the code), with a "Copy the link" button (`act: adminCopy`, the shared `copy()`, notification "Link copied."). Same level as before (Full,
rule 18); only the lab entry has it. The lab screen starts with a "Settings › Administration" link (`#settings`) to come back. Test A20. Two small rules for `frame.css`
(`.f-admin-url`, `.f-admin li > .f-row`).
- **28 Oct 2026 — Keys in `device/keys.json`: replaces the rule of 23 October** (ergonomics session's decision; security
  review of 28 October favourable). The rule of 23 October kept the weather key (and the GitHub token) out of `device/` and
  out of the IndexedDB cache, in `localStorage` only. Since the cloud relay's change of 25 October (Safari evicted
  `localStorage` without IndexedDB, so the keys were lost while the identity stayed), both keys live in `device/keys.json`
  like the identity, and that rule is withdrawn. What still holds: the file is never synchronised, left out of `dump()` and
  kept by a `replace` load, so no backup carries it; never shown again, never in the diagnostics nor in a pilot's
  configuration. The protection against reading it from the page is the content security policy and, for GitHub, a token
  of the narrowest reach the repository allows (§ 3.6, § 5). SPEC § 4 invariant 1 rewritten accordingly; § 3.6 gives the
  token advice decided on 23 October (classic `repo` for a user's repository, fine-grained for an organisation's, one
  year); INTEGRATION § 1 lists the scripts loaded on demand.
- **28 Oct 2026 — `settings.js` split into parts** (ergonomics session's answer 5, a lot of its own, no change of
  behaviour): 122 KB became `settings.js` (57 KB: `render()`, identity, usages, offline data, export / import, joining)
  and five parts loaded before it, each under 60 KB and by concern: `kit.js` (helpers and the shared text table),
  `launcher.js` (launcher cards), `access.js` (access and transport without a launcher, synchronisation),
  `diagnostic.js` (about, diagnostics), `admin.js` (Administration, publication edge, pilot configuration). Each part
  exposes `acts` (the button actions it answers), `run(env, act, button, event)`, its HTML builders and `live(env)`;
  `render()` builds one `env` (view, context, identity, preferences, launcher state…) and passes it to all. Parity
  checked by a snapshot of the screen before and after (launcher / no launcher × fr / en × levels 2 / 3: cards, texts,
  buttons, fields, links): no difference; no JS error at levels 1 to 3.
- **28 Oct 2026 — Seven cards, then groups; the launcher's administration behind Administration** (ergonomics session,
  answers 2 and 4; question 6 of the relay closed):
  - Discovery shows seven cards at most, flat, in the order of the path (Identity, Access, Synchronisation, Usages,
    Level, Design, About); Backup, Offline data, Weather key, Little Navmap sheets and Computer access start at
    Everyday. Everyday and Full: seven folded groups (Identity, Access, Data, Device, Display, Administration, Help),
    open only when they carry an attention (warning, error, target of an amber status line), with the amber dot on
    their title. Cards of circumstance (V2 found, configuration received, joining resume) come first at every level,
    outside the count. My first reading ("more than seven visible cards → groups, at every level") was corrected: the
    "Simple" level of the rule is Discovery.
  - The launcher's cards that are the administrator's — remote repository of `data/`, the airline's API keys (IVAO) —
    became two panels of the Administration card (`admin_links.js`: `where: 'launcher'`), so they are seen at the Full
    level only. What a pilot uses on the workstation stays in place and at its level (Computer access, Little Navmap
    sheets, the clone / take-over door of `data/` in Access), drawn only when the launcher answers.
  - A line of the status block, the Administration card's "Diagnostics" and the `?offline` / `?import` entries open the
    group of their card first: the frame's `goStatus` (frame/app.js) is left as it is, settings listens in the capture
    phase.
  - `groups.js` is a part of its own (settings.js would have gone over 60 KB).
  - Same lot, review of the Computer access card (points 2 and 3, the ergonomics session's go): pairing date in UTC
    (`c.time.fmtDateZ`), "Device "…" forgotten." for one device, a failed Forget keeps the state shown and says the
    launcher does not answer, "Open them too" names an address still closed. Point 1 (`lan_open(every)` touching the
    pairing code) is the frame's (`tools/launch.py`).
- **28 Oct 2026 — Design card and Aqua** (ergonomics session; the frame's contract `design()` → `{ design, tone,
  applied }` of origin/v3-aqua b13cffe73): when the design applied is not the one chosen (Aqua chosen, a device that is
  not a computer), one line ×4 under the thumbnails says so and that touching a thumbnail replaces the choice; the
  thumbnail marked as set is the applied one (Standard). `designs()` already leaves Aqua out there. Test A26 (phone,
  Aqua remembered) skips itself while the frame does not give `applied`.
- **28 Oct 2026 — A card reached by its address, whatever the level** (ergonomics session, answering the joining
  assistant's "Offline data" button, which led nowhere at Discovery): `#settings?card=<name>` and `#settings?offline=1`
  draw that card alone, under "← Settings"; the level only filters the list, which stays at seven at Discovery. Not
  chosen: moving the pilot to Everyday, an eighth card. `?offline=1` no longer scrolls to the card nor clears the
  address (the address is what keeps the card through a redraw). Test A27.
- **28 Oct 2026 — EAD Basic credentials in the launcher's keys panel** (ergonomics session's notice, EAD line's
  `proc/ead-fetch`): a second block under the IVAO key (`[data-card="ead"]`): the owner gives the EAD Basic user name and
  password once; the launcher stores them in `secrets/ead.json` and the page only learns whether they are set and when
  (`secrets_view` gives `{ set, at }` for `ead`, no `hint`: not a character of either value reaches the page). Both
  fields are emptied before the call, so the page keeps no secret; saving needs both, erasing asks. The notice (EAD Basic
  is a demonstration tool, non-operational data, simulation use) is always visible, wording from the ergonomics session.
  Not chosen: a "Test" button (logging in to EAD is a gesture of the EAD line, not of Settings); showing the last
  characters of the user name (the IVAO `hint` rule is for keys, an EAD user name is a personal identifier). The routes
  stay refused to a paired device of the local network. Test A32. The panel's title in `admin_links.js` still reads "(IVAO)":
  to be widened by the frame's owner of that file.
- **30 Oct 2026 — « Dossiers du poste » in the Administration card** (V3 § 10.34 A3, the first card of the lot; V3 Frame):
  - The folders the launcher really knows: the suite (its root), `data/` (or `--data`), the system's Downloads, Little
    Navmap's databases and its sheets folder (the one set for `.lnmperf`), and X-Plane, which the launcher does not know
    (it reads the simulator's position on 127.0.0.1): the row says so instead of guessing a path.
  - Not as written in § 10.34 (« changed only in the launcher's config file »): the launcher has no config file; each row
    says where its path is set (at start, in Little Navmap, in Settings) and the panel changes none.
  - « Ouvrir » sends an id from a fixed list (`FOLDER_IDS`), never a path; the launcher opens its own path (`os.startfile`
    on Windows, `open` / `xdg-open` with the jobs' reduced environment elsewhere); an unknown id 400, a missing folder 409;
    the workstation only. noreg A47 (×4), I23.

## 30 October 2026 — Inventaire du 30/10 : à refondre (V3 § 10.33; frame/settings and modules/data)

Written after two days of lots by several agents (28–30 Oct), read at 33912e247. Rules of the refactoring: no behaviour change,
the target in the SPEC before the code, dead code deleted (never commented out), `--touched` before the push and a full pass
after, CHANGELOG « refactor, no behaviour change », `:recycle:`, one lot at a time.

**Found, by zone**
- **modules/data/model.js** (≈1 290 lines, 61 KB): `viewVerb`, `isBuildView`, `isDry`, `buildState` are dead in the source (the
  module uses `viewOp`, `opDry`, `setGate`) and only pinned by L6, L14, L16 (done: R-S1); `countOf` and `listLen` are the same helper; the
  outcome functions (`outcome`, `fetchOutcome`, `purgeOutcome`) and the journal entries (`journalEntry`, `fetchEntry`,
  `purgeEntry`, then `setEntry` renaming `zones` to `items`) repeat one chain per verb. **Target**: one outcome reader and one
  entry builder per verb, no pre-SETS leftover. **Done (R-S5, 31 Oct)**: `kindOf` (the shared end-of-job chain) in every outcome reader, `entryHead` / `jobOf` (the shared header) in every journal entry.
- **modules/data/module.js** (≈2 070 lines, 99 KB): the base panel (`buildInner`, `buildZones`) duplicates the generic set panel
  (`setInner`, `choiceHtml`), the verbs' markup is written twice, `redrawPanel` / `opOf` branch on `[data-build]` vs
  `[data-set-panel]`; (**Done, R-S6, 31 Oct**: `finishOp` / `finishPlan`, one `summary` table `SUM_KINDS`) four endings (`endBuild`, `endFetch`, `endPurge`, `endSheets`) copy « result, render, notify, journal,
  reload », `endPlan` / `endSheetsPlan` are twins; two summary tables (`summary` / `setSummary`, `TX.sum*` / `TX.setSum.*`);
  same-meaning texts under several keys (`TX.build…` vs `opVerb`, group names vs `setLabel`, the waiting / failed / cancelled
  phrases per verb); small repeats (`linkHtml` re-writes `M.isHttps`, the catalogue lookup three times). **Target**: one generic
  set panel driven by SETS with the base as one entry (keeping `data-build` for the tests), one job follower with one ending,
  one summary table, texts keyed by meaning, the file split by responsibility (screen, panels, follower, chain).
- **frame/settings/admin.js**: `readEdge` / `writeEdge` / `readRunwayZoom` / `writeRunwayZoom` are one pattern on one file, and
  settings.js reads that file twice. **Target**: one profile reader / writer by key. **Done (R-S2, 30 Oct)**: `readProfiles` / `writeProfiles`, one read in settings.js.
- **Provider and host knowledge in five places** (config.js `kind` / `providerOf` / `webUrl`, join.js links, admin.js invitation
  link, access.js `/api/v4` trimmed by hand, launcher.js `providerHtml`). **Target**: one provider table in `SogConfig`, read by all. **Done (R-S4, 31 Oct)**: `SogConfig.PROVIDER_TABLE` (frozen), `links`, `repoField`; `link` / `fill` in the kit.
- **frame/settings/launcher.js**: the secrets cards (IVAO key, EAD, IVAO application) repeat one « fields emptied, call, paint
  the state » pattern. **Target**: one secrets helper. **Done (R-S3, 31 Oct)**: `saveSecret` / `paintSecretState`.
- **frame/settings (texts)**: the same meaning under several keys across files (trigram prompts, revoke / expires, copy link /
  copied, pending / online / last error). **Target**: shared texts in the kit, one key per meaning; tests that scrape `tx(file,
  key)` move with them.
- **Size**: settings.js `render` (≈510 lines, card builders mixed with actions), launcher.js `run` (≈210), join.js `render` (≈280).
  **Target**: card builders apart from their actions.

**Not dead** (checked): the `edge` and `runwayZoom` readers, the `sources` screen link (pinned by A20; the Data module did not
remove it, D1b), the single readers of `regen/verbs`, `sync-status`, `sync-remote`, `secrets`; no `rail: false` left in code.

**Not refactoring, fixed apart**: `T.ivaoAppLink` is defined twice in the shared `T` (settings.js and launcher.js) with different
texts, the later loaded wins — a text bug, its own `:bug:` commit. The `ivao` card is in no settings group (groups.js): to ask the
ergonomics session. The launcher's LAN card still lists paired devices next to the Devices screen (R-C2): to ask V3 Frame.

**Order of the lots** (smallest risk first): R-S1 dead helpers of model.js and small repeats (L5, L13, L15 move to `viewOp` /
`setGate`); R-S2 one profile reader / writer (A12); R-S3 one secrets helper (A32, A43); R-S4 one provider table (A12, A49);
R-S5 one outcome reader and entry builder (L7, L13–L18); R-S6 one job ending and one summary table; R-S7 the base as a SETS entry;
R-S8 module.js then model.js split by responsibility; R-S9 settings.js `render` split and shared texts.
- **30 Oct 2026 — « Mise à jour de la suite » in the Administration card** (V3 § 10.34 A3, the second card; V3 Frame):
  - A channel is a version selector, not a branch to follow blindly: `tools/suite_update.py` reads the tags and the
    development branch after a `git fetch`, and only moves forward (`merge-base --is-ancestor`): a target that does not contain
    the installed version is refused, never merged nor reset. `early` takes the highest version, pre-releases included,
    rather than « the latest pre-release »: once a stable is out, an older beta is never offered.
  - Refused before anything is written: tracked local changes (the suite's own files), a checkout that is not the channel's
    (a version channel wants a detached tag, `suivi` the development branch), as the administrator settles them by hand.
  - The launcher is not restarted for itself: the result says so and the panel asks to close its window and run
    `lancer.cmd`; the launcher's own update stays the documented manual step. noreg I25 (a trial repository: plans, a
    refusal for local changes, a step back, the branch's fast-forward), A51 (×4).

- **30 Oct 2026 — « Mettre à jour » waits for nothing, it refuses** (Sécurisation on 4fc473e5d). While a job of the Data module
  or a synchronisation runs, the update is refused with `busy` rather than queued: the administrator sees why and tries again;
  queuing would change `tools/` at a moment nobody chose. During the update the jobs' lock and the synchronisation lock are
  held, so neither can start halfway. The target is taken as the suite's repository announces it, without `git verify-tag`:
  the tags are not signed today; the help says so, and the check comes with signed tags.

- **30 Oct 2026 — The update holds job starts, not the jobs' lock** (Sécurisation on 2a02aedde, line 103). Holding
  `jobs.lock` through `apply()` also held `view`, `cancel`, `claim` and `put`, which take the same lock: during a fetch
  of up to 120 s the Data module's polling and « Arrêter » hung. Now the plan and its fetch run outside any lock, a flag
  (`Jobs.hold('updating')`) refuses new starts while the lock is held only to set it, and `SYNC_LOCK` covers the writing
  alone.

- **30 Oct 2026 — The update writes the version the check showed** (Sécurisation on 99b4c2a25, line 105; the same form as
  base/pickup's `zips`). The question names a version; without the sha, the writing went to whatever origin served at the
  time of the POST. The panel keeps the sha of the last « Vérifier » and sends it back; the launcher compares it twice
  (after its own fetch, and on the plan made again under `SYNC_LOCK`) and refuses `changed`. A channel changed in the
  panel forgets it.
- **31 Oct 2026 — A configuration never imports an API address** (security review, line 118; 375803a86). A forged « Join » link
  with `data.api` could send the pilot's token to another host, or to a service of the pilot's workstation (the transport still admits
  a local API for its own benches). Chosen form: for GitHub, any `api` other than `https://api.github.com`, a local one included,
  refuses the configuration (`data.api` named); for GitLab, any `api` is ignored (the API comes from `data.host`); the export never
  writes it; Join passes none to the transport. `benchApi` was written, then removed the same day when the review asked for no local
  exception: a bench sets its API by its own path. **Counter-test kept as a rule for security cases**: A56 was run with the old
  `join.js` and failed (the token went to the received API) before the guard was put back; a guard's case is shown to fail
  without the guard.
