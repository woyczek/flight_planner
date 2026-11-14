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
  set panel driven by SETS with the base as one entry (keeping `data-build` for the tests; **done, R-S7, 31 Oct**: `setInner` / `choiceHtml` / `verbsHtml` draw the base, `PANEL_UI`, `panelId`), one job follower with one ending,
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
R-S8 module.js then model.js split by responsibility (done: module.js, then model.js); R-S9 settings.js `render` split and shared texts (done: `render` split into `cards.js` and `actions.js`, then `render` in pieces and one row per meaning). Added 31 Oct: R-S10 (done, reduced: the rule, the table of states and the guard case I29, since R-S8 already left one
writer per field) one writer per shared field of the Data
module's state (`run`, `result`, `chain`), after R-S9 — a change of logic, not a split (the L cases as the guard); R-S8 only
moves code, `S` itself replaced through `setState` alone.
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
- **31 Oct 2026 — R-S9 (1/2), the one HTML difference left** (6105be2ba). In the before / after comparison of the screen, with
  a launcher, the diagnostic's « dernière erreur de lecture » names another file (`device/help.json` before, `device/join.json`
  after). It was already so before: two runs on the old tree differ the same way. A race in an error the test environment
  produces, not a difference in what the screen draws.
- **31 Oct 2026 — R-S9 (2/2), the service screens read the shared texts from `kit.js`** (`frame/app.js` `APP.screens`). `devices.js` and
  `pilot_tokens.js` have a table of their own, loaded alone; seven of their rows were the same text in four languages as a row of the
  Settings (`revoke`, `expires`, « dernier usage », « Trigramme du pilote », the trigram refusal, « Copier », « Jetons des pilotes »,
  « Appareils appairés », « code de console »). They now read them from `window.SogSettingsKit.T`, so the two screens load `settings/kit.js`
  first (`script()` loads a file once: opening Settings before or after changes nothing). Only the two `scripts` lists of those screens
  changed in `frame/app.js`.
- **31 Oct 2026 — Debt from R-S9 (2/2): two rows written twice in one table, the losing text was the better one.** The lot kept the
  winner (the screen unchanged) and removed the losing row; to correct apart, as a `:bug:` with its case:
  - `settings.js` `ivao`: the identity field reads it, so the VID field is labelled « Compte IVAO » / « IVAO account » / « IVAO-Konto » /
    « Cuenta IVAO » (the IVAO account card's title) where « VID IVAO » / « IVAO VID » / « IVAO-VID » / « VID IVAO » was meant: give the field its
    own key. **Corrected** (31 Oct, A58): `kit.js` `ivaoVid`, read by the identity field, its refusal and Join.
  - `access.js` `tokenSet`: the line under a saved token reads « Jeton enregistré sur cet appareil (jamais réaffiché) : le remplacer, le coller
    de nouveau ci-dessus. »; the lost row (« jeton enregistré — vide : inchangé ») was the field's placeholder: check which place used which
    meaning before choosing.
- **31 Oct 2026 — R-S9 (2/2), left apart on purpose**: four nested pairs equal in four languages (`access.queue` / `dg.pending`,
  `access.lastError` / `dg.lastError`, `admin.admin` / `groups.admin`, `settings.identity` / `groups.identity`) are read by a dynamic lookup
  (`T.dg[k]`, `T.groups[g]`); merging them would be a change of logic (R-S10 if wanted).
- **2 Nov 2026 — The Synchronisation card is the sync summary; what it reads from data/ is text** (the user: « je ne sais pas quelles fiches appareil sont synchro et lesquelles ne le sont pas, pas plus que les missions »;
  security audit, line 157: data/ files are written by any pilot). **Rule for a Settings reader**: whatever it reads from data/ (a title given by a module's `titleOf` from a document's content, a path, an error) is
  shown through `esc` and nothing else, a path is displayed as text and never becomes a link or an attribute that runs, the counts it computes are bounded (200 paths, 1000 waiting writes, totals at 10^6),
  and the keys of an answer are read with `Object.hasOwn` (a hostile key named like a member of Object.prototype). **Why not a link**: a path opening the file would hand a hostile name the click. **One reader**: `settings/sync_summary.js`
  holds the two reads (`FrameData.pendingList()`, `GET sync-status`) and the titles; the cards and the modules' marks use it. **Titles**: the value is the device's own copy, read only for the seven items shown, never the network
  (a file the device does not have is shown by its path); Settings cannot list the modules of the other applications, so it names `aircraft`, `fuel` and `missions` itself (to replace by a frame list if one is given). Case A85.

## 5 November 2026 — what has just left, on the Synchronisation card (SOG-0029, lot E3)

- **Rule**: the card reads `FrameData.lastPushed()` once per drawing (with the other reads) and says one line; nothing is read from the
  network, no pass is launched. A refusal is a result that is not `'ok'`; its reason is shown as text, bounded.
- **Reversible details chosen** (the user is away): the list is **folded under the line** (one line by default, even for few files; « repliée
  au-delà de sept » read as: the list is folded, seven shown at most, the rest said); the refusals come first so that a reason is never in the
  « … et n de plus »; the line counts per kind like the head (« Fiches d'appareils : 2 · Missions : 1 ») rather than naming files; the card
  is shown when something has just left even if nothing waits. To unfold by default under seven files: set `open` in `pushedHtml` when
  `items.length <= MAX_VISIBLE`.

## 6 November 2026 — conflicts on data/ (SOG-0043)

- **Measure** (data repository, 14 days, read only): 7 merges, 2 with a file changed on both sides, both `pilot/RBR/current_flight.json`
  (28–29 Oct); 3 copies in `_conflits/`, all that file; none since 30 Oct; the last pass reports no conflict. The file has 927 commits
  (two clients, « RBR » 809 and « Gaétan RYCKEBOER (asr) » 117) and its sections `quote`, `profile`, `wind`, `windSource`, `isaDev`, `route`
  are recomputed by the fuel module on both sides (`by: fuel`). The mass arrival of missions (SOG-0036) and the YAML registries are not
  involved (no conflict, not written since 28 Oct).
- **Done in data_sync** (the smallest): a divergence that is only the stamp or the formatting is not a conflict (`same_content`).
- **Not done, on purpose**: a merge by key of `current_flight.json` in `data_sync`. Its sections are derived from `route`; taking `route`
  from one side and `profile` from the other would give an inconsistent state (git already does it silently when the blocks do not
  overlap, not observed). The levers are in the frame and the modules: an instance should not rewrite the document when nothing changed
  for the user, and `frame_data` `merge.record` (≈ l. 126, `mergeText` ≈ l. 238) counts a conflict for any file changed on both sides
  although `doc.base` is known. Reported to the coordinator, not touched.
- **Not measurable from here**: the browser's `conflicts` store (IndexedDB) and the launcher's console.

## 6 November 2026 — the company card and the migration (SOG-0039, § 10.38 step 1)

- **Which side the migration lives on**: a regen verb `airline/migrate` (`tools/regen/airline.py`), not `data_sync`: it is a one-shot with a plan, like `base/move-sources`, and `data_sync` stays the
  one writer of git. It writes files in the pool (`data/airline/`); the next synchronisation sends them.
- **Reversible details chosen** (the user is away): the code is **proposed** from the first word of the name (`DEFA Virtual` → `defa`) and must be passed back by the caller to be used for another;
  `fleet.json` is **empty and said** (`fleet: 'empty'`): today's fleet lives in the « personal » box of the sheets (`aircraft_personal.js`) and the V2 Centre, out of this lot's reach; the
  index is **completed** (not replaced) and capped at twenty; the destination is never overwritten (a second run says `exists`).
- **The card**: in `access.js` (the part `airline`), not in a new file: a new file would be one more line in `frame/app.js`'s list (the frame's file). Shown at the Full level or by
  `#settings?card=company`. Four elements per line (name, code, networks, fleet count); the logo (an address read from an untrusted file, to be drawn only by a reader that checks it) and the missions
  count (no per-airline missions yet) wait. The list is the frame's own (`FrameData.airlines()`, V3 Frame 837f2d2fa: the index, or `default` — today's airline at the root of `data/airline/` — before the migration, then `perso`), read from the index here only for a frame without it; the choice is feature-detected (`FrameData.setAirline`, `FrameData.airline`): an old frame greys the buttons and says so (A95 checks the real frame, an old one and a stub).
- **Not done**: a button that calls `airline/migrate` (the verb and its case exist; the gesture, plan then confirmation like `Ranger les sources brutes`, is the next lot), the airline's map
  profiles beyond the copy, `categories.json` (SOG-0041), the personal airline under `pilot/<tri>/airline/perso/`.

## 10 November 2026 — the « Migrate » gesture (follow-up of SOG-0039)

- **Two steps, like « Ranger les sources brutes »**: the plan (dry, nothing written) then the migration with the code the plan gave; the user may type a code first (empty = proposed).
- **Where it shows**: only on the launcher's computer (the verb is local to the workstation) and only while the frame's list still has `default`; once `index.json` is there the block is gone by itself.
- **Calls**: by the frame's own client (`ctx.launcherRequest('regen/job', …)`, then `regen/job?id=` every 400 ms, at most 16 s), no new route declared; the answer is read as a closed list (audit 157).
- **Not done**: filling the fleet (still the « personal » box of the sheets), `categories.json` (SOG-0041), the personal airline folder.

## 10 November 2026 — mission categories: the file and its reader (SOG-0041, user rank 2 of alpha.5)

- **What is delivered** (this lot, the frame's side of the two lots of § 10.38): `frame/lib/mission_categories.js`, pure, with the **common base** of the suite (`BASE`: `commercial` = cargo, passengers, VIP, training, transit, test
  flights, positioning; `virtuel` = the airline's own, empty), the **filter** of `data/airline/<code>/categories.json` (`clean`: ids `^[a-z0-9][a-z0-9-]{0,23}$`, six groups and forty categories at most,
  names in four languages of 40 characters without control characters, a missing language takes the French name, `load` in `freight | passengers` or dropped, own keys only), `kindOf(airline)` and
  `forAirline(doc, airline)` → `{ groups, all }`, and `nameOf(list, id, lang)`. Bench `frame/lib/test/mission_categories.html`, case A104.
- **No file = the base** (§ 10.38: « a common base ships with the suite and is the default of every airline and of "personnel" »): nothing is written for an airline that does not customise; the migration and « Ajouter une
  compagnie » therefore do not write `categories.json`. A file that is present **replaces** the base (a group list of zero entries means « this airline has no category »).
- **Kinds**: `commercial` carries `kinds: ['va', 'perso']`, so it is **inactive for a squadron** (`settings.kind: 'sog'`) and for an airline that does not say its kind (nothing is assumed commercial: today's airline has no `kind`);
  the personal airline is `perso`. `virtuel` has no `kinds`: active for all.
- **Readers**: a module reads the airline's `categories.json` with its own adapter (`FrameData.airline().root` + `categories.json`, reads `airline/`), passes the content to `forAirline` and escapes the names it draws; **Missions** (a
  mission says its `category`, the filter) and the **report** (the `load` kind says what a commercial flight carries: freight in kg, passengers; nothing is invented) are Features SOG's lots — no reader here, no change to `frame_data.js`.
- **Not done here** (needs a decision or belongs to the readers): a place in Réglages › Compagnie to set the airline's `kind` and to edit its categories (without a `kind` the commercial group is inactive for a non-personal airline).

## 10 November 2026 — the airline's kind and its mission categories in Réglages › Compagnie (SOG-0041, part b)

- **Why now**: without a `kind` there is no commercial category (`frame/lib/mission_categories.js`), and the user has two airlines to create quickly. The coordinator confirmed the lot after SOG-0125.
- **Two elements per line, not a new card**: the kind (two toggle buttons) and a fold of the categories: the line stays at seven elements (name, code, networks, fleet, choice, kind, categories). « Choisir » stays the first button of the line (cases A95 and A102 tap it).
  « Personnel » has neither: it is commercial by nature (`kindOf` says `perso`) and its folder is under `pilot/<tri>/airline/perso/`, which the airline adapter does not reach; its categories stay the base's.
- **What is editable**: the airline's **own** group `virtuel` only (add, remove). The suite's `commercial` group is the common base and is not edited per airline (a different list of commercial categories would defeat « common »); it can only be inactive (kind).
  Editing the base per airline is not asked for; if it is, it is a new lot.
- **Writing**: the first edit writes the whole file (the base's commercial group + the airline's `virtuel`) because a file that exists replaces the base; later edits change `virtuel` only. Same adapter and prefix as `settings.json` / `fleet.json`
  (`airline/<code>/`, `airline/` for `default`), author and time stamped like them. The kind is written into the file as it was read (`...settings`), never a rebuilt one.
- **The id of a category** is its name without accents, in lower case with dashes (24 characters); a duplicate of any group (« Fret ») is refused rather than renamed, so a mission that says `fret` keeps meaning the base's.
- **Counter-test**: without the duplicate check A105 is red (« Fret » would be added). Readers of the categories (Missions, report) are Features SOG's.

## 10 November 2026 — Réglages › Compagnie: radio list, sheet of the chosen airline, no redraw (SOG-0041, step A)

- **Refused at the recipe (10/11, 11 h 23)**: « plutôt qu'un bouton « choisir », un bouton radio. ergonomie ! on ne sait pas si c'est un sog, ou une compagnie commerciale. En plus, ça clignote au choix. Où est « catégorie de missions » ? ». My earlier decision (« two elements per line, seven at most ») kept the rule and lost the path: the kind was two toggle buttons that said nothing in words, the categories a fold per line, the whole list redrawn at each choice.
- **A list of radio buttons**: one line = radio, name, code, grey line (kind in words, networks, fleet). The choice applies at the tap. **No redraw**: lines are reconciled by key (`paintRows`: same HTML → same node); the current state is set on the nodes (`markCurrent`), not in the HTML, so a choice changes no text. Counter-test: A105 marks every line node, chooses another airline and asks that none was replaced; red on the former card (no radio, the lines were rebuilt).
- **The sheet of the chosen airline only** (kind radios with one sentence each, then the categories of the kind, visible): the other airlines have no sheet, so the list stays one line per airline and the user sees where to set the kind. The kind can no longer be cleared (a radio cannot; a company is one or the other).
- **Messages**: the category refusals are said under the sheet (`data-fiche-msg`), the migration's in its own block (`[data-mig] [data-msg]`): they used to go to the message of « Ajouter », a fold that is closed.
- **Nouns with their number** (ergonomist, 10 Nov): the company assistant writes « 1 appareil », « 0 appareil », « 2 appareils », « 7 catégories », « 3 opérateurs » with `TA.noun` (two forms per language) and `plural` of `frame/lib/plural.js` (loaded with the categories module); no « (s) ». The language of the card is read from the screen's own text (`t(['fr','en','de','es'])`), the context does not always give a `lang()`: the names of the categories were drawn in French in the other languages until then.
- **The marks of the other Settings texts** (« {k} fichier(s) », « {c} commit(s) »…) are not rewritten one by one: `SogSettingsKit.agreeT` (kit.js) wraps the context's `t` and resolves each mark by the `{key}` number before it, with the same module (`plural.js`); `render` waits once for the module (`plReady`). Counter-test: A135.
- **Words** (ergonomist, 10 Nov): the own group of an airline's categories is titled « Vos catégories » (it was « Virtuel », which says nothing to a pilot; the id `virtuel` is unchanged); the words of the kind (Commerciale, Escadrille SO, Personnel, Genre à choisir) are read from `KIND_NAMES` of `frame/lib/mission_categories.js` (SOG-0181 put them there for the report and « Mes vols »): one source, `access.js` keeps no copy.
- **Step B1 (« Créer une compagnie »)**: the former one-shot form is a stepper (design accepted at § 10.38 bis). The panes are built once and shown or hidden so a typed value is never lost and the block can keep its height; the code is proposed from the name (as `airline/migrate` does) until touched; the index is written **last** so a half-created airline is never in the list; « Reprendre » replaces a second « Créer » (a second Create would refuse the existing folder, which is the point of the refusal « dossier déjà présent » on a first creation). Counter-test: A125 is red on the former form (no stepper).
- **Step B2 (categories)**: the base categories of the kind come ticked; an unticked one is not written, so `categories.json` is the base minus those plus the airline's own group; with nothing unticked and nothing typed **no file is written** (the base stays the suite's, a later improvement of the base reaches this airline). The sheet of step A still edits only the own group afterwards (the base is not edited per airline there): choosing among the base is a creation-time gesture, as the ergonomist asked. A squadron has no commercial category to tick, only the field. Counter-test: A126 (none of it exists on the B1 stepper).
- **Step B3 (fleet)**: « la base » = the aircraft sheets (accepted by the ergonomist: one source, § 10.35), read through aerodb (`aircraft().sheets.list()`, bounded to 500 sheets, names cut at 60, all drawn as text); the airline types the registration (a sheet is a type, a fleet is a list of registrations). The list is in the DOM (like the categories) so « Retour » loses nothing; « Plus tard » is a button, not a link, and is only there while the list is empty. The registry of real aircraft of V2 is a later lot. Counter-test: A127.
- **Step B4 (« Rejoindre une compagnie »)**: the page is parsed by the Website module's parser (never a second one), on this device, and shown before any write (counts, name, code, kind); an airline already listed is refused rather than merged (updating a fleet is the Website screen's paste, unchanged); the site address is stored only if https. The page is untrusted: bounded size and count, bounded text fields, drawn by `esc` / `textContent`. **Not done**: reading the page through the launcher from an address (`ctx.net`) — the settings screen declares no `net` host and the user pastes anyway; and the missions count, which depends on Missions' rule for squadrons (a mission without `airline` is seen by every squadron), owned by Features SOG. Counter-test: A128 (none of it exists before).

## 10 November 2026 — the settings screen is drawn at once (SOG-0133)

- **User's words (5th pull)**: « plusieurs secondes de sleep avant d'afficher l'écran des settings, alors que la version du git est un paramètre accessoire ».
- **Cause found**: `render` awaited `P.launcher.readRemote()` (`GET /__setup/sync-remote`) before drawing anything. On the workstation that route runs git: `data_sync.remote_info(data/)` took **1.43 s** (then `rewritten()` 0.15 s) on the user's `data/` (E:\DEFA\data, measured the same day; `status()` 0.65 s then 0.22 s). Everything else the first
  drawing awaits is local (device store, frame status, profiles). The launcher's own cost is the root cause (a subprocess per read, none cached); it is not touched here (the launcher is not Réglages'): to hand to its owner, `remote_info` could read `.git/config` instead of running git.
- **Measure** (case A106, a launcher whose read takes 1.5 s): time from `sog-settings-start` to `sog-settings-first` **1 516 ms before, 136 ms after** (headless, 390 px). With a fast launcher nothing changes (the read finishes inside the 120 ms the screen is willing to wait).
- **What the first drawing shows**: everything it knows; the Access card gets a line « Dépôt des données : » of **fixed height** (`1.6em`, one line, ellipsis, the whole address in its title): « … » then `address (branch)` — « aucun dépôt distant » when none. What depends on the repository
  (the remote-repository panel of Administration, the door « clone / adopt » of a data/ that is not a repository) is not drawn while the state is `pending` (no door shown by mistake) and appears at the arrival, in **one** more drawing, skipped when an input has the focus and when the answer equals the last known state (so a second visit does not redraw).
- **The frame's reserve is used** (V3 Frame a03fa6a08, § 7.1 rule 22): while the state is `pending` the line carries `f-hold` + `aria-busy` + `--f-hold:1.6em` (the frame draws the « … »), the value releases `aria-busy` and keeps the height; A106 reads the layout shifts with the frame's `CLS_PROBE` (< 0.1 over the whole load, repository included). Settings is the first module to adopt it.
- **Why 120 ms and not nothing**: the many cases and the usual fast launcher read it in a few ms; waiting that little keeps the screen identical for them (no flash of « … », no extra drawing) and costs a slow launcher 120 ms.
- A20's regex of source ids now accepts `_` (the catalogue gained `eurocontrol_rad`; the case was red since AeroDB's SOG-0081 and not for this lot).

## 10 November 2026 — « a new barrowful of sync conflicts while I am alone »: the survey (SOG-0136, with SOG-0043) — **no code yet**

Read-only survey of the workstation's `data/` (E:\DEFA\data, shared by E:\DEFA and E:\DEFA-dispos), 10 Nov 16:30:

- **Git level: no conflict today, nor in the last four days.** `git log --merges`: none; every `merge origin/main` of the reflog since 2 Nov is a fast-forward; `rerere` (enabled) holds 3 resolutions, the last of **30 Oct**; `data/local/sync.json` (last pass 9 Nov 15:23Z): `conflicts: []`, `refused: []`; no `<<<<<<<` in the tree.
- **`_conflits/` copies: three, all `pilot/RBR/current_flight.json`, all old** (28 Oct 17:37, 29 Oct 19:02 and 21:27: « distante » copies). Nothing since SOG-0043's `same_content` (6 Nov).
- **Who writes**: 210 commits in 4 days (129 in 3 days), **one author (RBR)**. Two kinds by subject: the launcher's own (`:card_file_box:` base builds, procedures, RAD import: 47 rewrites of `sia/base/index.json`, 5 of `proc/manual/index.json`, 2 of `route/rad.json.gz` in 3 days) and the synchronisation of what the browser wrote (`RBR : n fichier(s) — …`: 66 rewrites of `pilot/RBR/current_flight.json` in 3 days, 7 of `pilot/RBR/fuel.json`, the company files `airline/index.json` + `airline/itf/*` 15 commits between 15:11 and 15:46 today).
- **Files touched by both kinds in 3 days: none (0).** Browser and launcher already write different files; the hypothesis « browser against launcher on the same file » is **not supported by the git history**. The registries the launcher rewrites (`sia/base/index.json`) are written by it only.
- **What could still be counted as a « conflict » without git seeing one**: the Synchronisation card counts the frame's `conflicts` store of the **browser** (IndexedDB), which also receives `side: 'refused'` entries (a write the transport refuses for good — forbidden path or `.js` outside the data format — is kept there, `refuseWrite`) and merges between the page's pending copy and a newer remote. That store is on the user's device and **cannot be read from here** (the browser pane's own store is empty: 0 conflicts). `git status` of data/ shows three files modified and never committed (`references/aircraft_fleet.js`, `references/defa_reference.js`, `sia/mora.csv`): `.js` files of that kind are what `data_guard` refuses to send.
- **Conclusion for the fiche**: the cause cannot be fixed on the evidence of the data repository, which is clean. **What is needed first: the list the user sees** (Synchronisation card › Conflits: path, side `local` / `distante` / `refused`, date, count). If they are `refused`: the cause is a path or a type the transport refuses (a candidate for a rule before the write, not a merge); if `distante`: two devices (phone and computer) writing `current_flight.json` whole (the 3 old copies), and the mitigation is a merge by key for that file (today « a whole file », frame DECISIONS); if `local`: the page's pending copy against a newer launcher commit of the same file, none seen today.
- **First candidate, not started**: the coordinator's (browser and launcher never write the same file; JSON registries merge by key) is already true for the files above; it would only matter with a second launcher. The candidate the evidence points to, if the list shows `distante` on `current_flight.json`: merge by key for the current flight (the page owns it).

## 10 November 2026 — the time of the synchronisation on the card (SOG-0149)

- **The user's words** (via the coordinator): the sync is slow and nobody knows where the time goes; `data_sync.run` now measures it (settle, commit, prepare, receive, untrack, push, git commands, bytes sent; V3 Frame 12cad5326). The card shows **the last pass and the longest of today, in seconds**, step by step, in the Synchronisation card (no new screen).
- **The longest is kept on the device, not asked of the launcher**: `sync.json` keeps the last pass only; a record in `device/sync_timings.json` (cache policy, never synchronised) holds today's longest, replaced by a longer pass and forgotten when the day changes (UTC, like the pass's `at`). A layer without storage still shows the last pass.
- **Untrusted input**: `last.timings` comes from the launcher, which anyone could stand in front of; only bounded numbers are read, the steps by a closed list, no string from the answer is shown.
- Counter-test: `ms` taking any value turns A112 red (« commit 9 s » shown for a step written `'9000'`).

## 10 November 2026 — the V2 buttons leave Administration (SOG-0166, rest)

- The user: « je passe mon temps à cliquer dessus par erreur ». V3 Frame delivered `#legacy` (« Anciennes pages (V2) ») and its entry at the foot of each navigation column; the three direct buttons of the Administration card (Maintenance V2, First launch, Map studio) are removed (`admin_links.js`, help ×4). The suite update that the V2 maintenance page offered has its V3 button in the same card (`update`). **One link stays**, said as it is: the « première installation » link of the Données result when `pypdf` is missing (a V3 journey that needs the V2 assistant): its text now says it is a page of the old version. Case A120.

## 10 November 2026 — the second drawing of Settings touches only what changed (SOG-0172)

- **Hypothesis checked, and true**: since SOG-0133 the screen is drawn at once, then `render()` ran again when the repository answered (`late`), and `placePage` replaced the whole screen with `view.innerHTML`: every card and group was a new node (A123 before: 20 nodes lost, 0 kept). The trigger also compared the whole `sync-remote` answer, so a field that changes at each reading (a timestamp, a counter) redrew the screen for nothing.
- **Fixed**: (1) `placePage` builds the HTML in a container and **reconciles** it (`reconcile` / `merge` in `settings.js`): a block whose built HTML is the same keeps its node — and what the live painters wrote in it —; a group keeps its node (its open state) and its cards are compared one by one; only the changed blocks (access, usages, the Administration card) are replaced. (2) The trigger compares only what the screen deduces from the repository (`remoteKey`: url, branch, state, repo, default, rewritten, remote).
- **Measured** on the user's launcher (port 8000, read only, the in-app browser's own profile): Settings opens with **one** drawing and a layout shift of **0**; Données opens with a shift of **0**; at rest only the status block repaints (once, at 2.6 s). The flicker the user sees therefore needs a slow answer of the repository (the harness: 1.5 s) or a changed field: that is what A123 reproduces.
- **Case A123**: with a repository answering in 1.5 s, the cards that do not depend on it and the groups keep their nodes through the second drawing; the shift of the arrival stays under 0.1. Not covered by it: the opening itself draws the groups once at the default level then once at the saved level in the harness (a 0.125 shift at 390 px, A110's ground); the real opening shows one drawing.
- Données: nothing to change beyond SOG-0164 — `load()` runs once at the opening, the late parts (sync-status, states, world, route) repaint their own block.

## 11 November 2026 — the list of airlines is drawn from the index (SOG-0218)

- **User's words** (recipe): « « compagnie de cet appareil » met 8" à s'afficher. c'est lent. »
- **Measured first** (the user's launcher, port 8000, read only): the card opened in about 0.9 s warm and 1.05 s on a fresh origin, every data read 6 ms or less. The 8 s could not be reproduced on the laptop; it is the cost of a **chain** of round trips, each cheap here and slow on a phone or through the relay: the index, then the three files of each airline, then `FrameData.airline()`, then the categories module, then the places module (the plural module is imported as soon as the kit loads: awaiting it at the first drawing is nearly free and keeps « (s) » from flashing, so it stays).
- **Done**: (1) (the plural module is not touched, see above); (2) the card reads **the index alone** and draws the list at once (radio, name, code: the grey line is an empty line of the same height, `[data-co-meta]:empty::before`); (3) the details of every airline (settings, fleet, categories) and the two modules are read **at the same time**, never one after the other, and the grey lines are **replaced in place** (`textContent` of the line; the node, its radio and its focus are kept: rule 22); (4) the current airline (`FrameData.airline()`, which reads that airline's settings) is read alongside but **the list does not wait for it**: the radio of the previous drawing, or the one the frame already knows (`ctx.airline.code`), is checked at once, the answer confirms it.
- **Counter-test**: A140 (a device whose files of each airline arrive 2.5 s late: the four lines and their radios are there in 1.5 s at most, every node, height and place kept when the details arrive, layout shift under 0.1). Red against the previous `access.js` (3.2 s), green after. A105 now expects the line whose kind changes to **keep its node** (its grey text is replaced in place).
- **Not done**: nothing is cached across openings (the page reads the repository's files as before); a real measurement on a phone is the user's, the case simulates the lateness.

## 11 November 2026 — the sheet and the creation step show the mission THEMES (SOG-0202 T3a)

- **User's words** (via the ergonomist, SOG-0202): « airlift et special sont des thèmes militaires. « commercial » est un grand thème. dedans, on « devrait » trouver : cargo, passagers, rapatriement vide, etc. » and « « vos catégories ». ok, mais il n'y a pas de recouvrement avec l'existant ? … on ne refait pas la roue. »
- **Done** (T1 is Features SOG's, dd5f51751): the **Mission categories** block of the airline's sheet and step ② of « Créer une compagnie » are replaced by the seventeen themes of `frame/lib/mission_themes.js` — one box each (acronym, name), COMMERCIAL first — ticked from the airline's `themes.json` or, without a file, from the kind (`defaultChosen`). Ticking writes `themes.json` (`chosen` in the table's order, `added` kept, at least one theme); the stepper writes `themes.json` only when its ticks differ from the kind's default, between the settings and the fleet. « Vos catégories » and « Ajouter une catégorie » are gone (the user's own categories were the overlap he refused: added themes and series come in T3b, with the same bounds as the file: 8 themes, 20 series per theme, 40 characters).
- **Not read any more**: `categories.json` (the ids migrate to themes in Features SOG's T2; nothing is deleted).
- **Counter-tests**: A105 (the sheet: seventeen boxes, the defaults per kind, a hostile `themes.json` is text, ticking writes the file in the table's order, the last box refuses), A126 (the stepper: ticked in advance, kept on « Retour », `themes.json` only when different), A125/A127/A95 renamed to the themes step; A104 (the pure module bench) is Features SOG's.
- **Touch-ups after the ergonomist's reading of the captures** (11 Nov): COMMERCIAL is shown FIRST (the table carries it 17th; only `themes.json` keeps the table's order), no bullet before a box, two columns from 700 px (`.f-themes`, one at 390). Case A105 reads the first theme, the list style and the columns; capture `A105_standard_<w>_themes_delivered.png`.
- **T3b: one label, copied four times** (the ergonomist agreed, 11 Nov): the pilot types a theme or series name once, in the language of the screen; the file keeps it in the four languages (`labels` ×4) so that the other screens read it in any language, and it can be edited by removing and adding. The series value is the name without accent because the file's permitted form (`SERIES_ID`) has none; the label keeps them. Counter-test: A142 (the file, the four refusals, the removal, no `<`, no horizontal scroll).
- **B4: the missions at the code, from the registry** (Features SOG's rule, 540b06d05 and SOG-0223): « Rejoindre » no longer says that the missions are in Missions: it counts those the registry already puts at the proposed (or typed) code, with the rule of the module (`MS.missionsFor`), and says where to change a mission's airline when there is none. Read-only, on this device; nothing is written to the registry. Counter-test: A128 (two of five at « so »: the organisation, the personal one and the other airline's are not counted; one at « other »; none at an unused code).
- **T3b touch-up** (the ergonomist, after reading A142 at 390 px; the user asked for « un moyen d'en ajouter au besoin, mais le minimum »): the two forms were always displayed, stacked, five fields with no visible label. They are now two folded `details` (« Ajouter un thème… », « Ajouter une série… ») whose fields carry a visible label, folded again once the addition is written (the sheet is redrawn); a refusal does not redraw: the form stays as typed. A142 reads the folded state, the labels and the refolding; A105 expects the two folded blocks and none in the list.

## 11 November 2026 — « Reprendre cette compagnie » (SOG-0235, assistant side)

- **User's words (10 Nov evening)**: « defa a (encore ?) sauté. mais si je veux la recréer : « Un dossier existe déjà pour ce code : choisissez-en un autre. » » The index served by the data layer was older than its own tree (V3 Frame's part); here, whatever the cause, a code whose folder exists and which the list lacks is **offered back**, not refused.
- **Done**: the refusal text says what is true and what to do; the button writes the index entry only (name from the folder, bounded, no `<` `>`), never the folder, then the list is read again. Counter-test A144 (the folder zed exists, the index lacks it: the message, the button, nothing written by the refusal, then only `airline/index.json` is written, the airline is listed).

## 11 November 2026 — « Famille / Série » (SOG-0202, the user's word: « famille / série »)

- **Done in Settings**: « Thèmes de missions » → **« Familles de missions »**, « Ajouter un thème… » → **« Ajouter une famille… »**, the step « Thèmes de vols » → « Familles de vols », the kind sentences, the refusals, the counts (« 1 famille »), ×4 languages (family / Familie / familia), the help ×4; **« série » stays**. `themes.json` keeps its name and its shape (`chosen`, `added.themes`, `added.series`): only the words changed. Cases A105, A126, A142 read the texts from the file; the nouns of the cases follow.

## 11 November 2026 — the R-S9 debt `tokenSet` paid

- The token field of the Access card used the long sentence `tokenSet` as its placeholder, the lost row (« jeton enregistré — vide : inchangé ») being the right placeholder; the line under the field is the long text. Two meanings, two keys: `tokenKept` (short, the field's placeholder) and `tokenSet` (the line). Counter-test: A58's neighbour in the access case (the Access card again, with a token saved).
- **A144 retouch** (the ergonomist, after the 390 px capture): « Un dossier existe déjà pour ce code mais… » is an OFFER, not an error: the message is neutral (no `data-kind`, not red) and « Reprendre cette compagnie » is the main (`primary`) action while « Suivant » goes secondary, as long as the code is that of an existing folder; A144 reads the neutral text and the two roles.
- **A128 unstable at 390 px** (the ergonomist's full pass: « never true within 8000 ms: joined »): the state captured at the failure was `step: read`, the message of the PREVIOUS refusal (« Adresse refusée… ») still there, nothing written, the fields as typed: `joinGo` never ran (it clears the message first) — the touch that follows a fill and a check was lost, a test-environment effect, not a defect of the screen (a pilot taps again). The case now scrolls the button to the middle, closes the floating notes and taps again until the button has acted. Sixty runs at 390 and ten at 1280 (four languages each) without a failure.
- **11 Nov 2026 — A letter for the added families** (user: « oui, avec anti recouvrement », SOG-0202; library by Features SOG,
  507a028ea): « Ajouter une famille » carries a « Lettre » field proposed as `freeLetters(doc)[0]`, refused in words when
  `takenLetters(doc)` has it (the seventeen of the table, M, D, X, another added family) and written in
  `added.themes[i].letter`; the rule is re-checked inside `writeThemes` on the file just read (another pilot may have taken the
  letter meanwhile). A family added before the letters gets a free letter proposed beside its name (one per family, distinct),
  written only on « Fixer la lettre ». No letter is invented silently: the report falls back to « X » until it is set.
- **11 Nov 2026 — « aéronef » for an aircraft** (user, SOG-0242; ergonomics' list): read one by one, not a global replace — the
  fleet count, the fleet step of the assistant, « Rejoindre », « Base des aéronefs », « Fiches d'aéronefs », « Références aéronefs »,
  the data group and the French help; « cet appareil », « Appareils connectés », « appareil photo » stay. Case A150 forbids
  the lower-case word in the fleet keys. « depuis Appareils » (the module's label, not mine) stays until its owner renames it.

## SOG-0320 (13 Nov 2026): the blank under « Compagnie de cet appareil » and the bar's mark

- **The blank** (the user's capture of Settings inside Maintenance): `.f-fiche:empty { min-height: 620px }` (380 px from 700 px) and `.f-cos:empty` in
  `frame/frame.css` reserve the place of the airline sheet and of the list before their read (rule 22: nothing moves under them). With no airline
  chosen on the device (none of the radios checked) the sheet stays empty and the place was never given back. `airlineLive` now sets
  `data-settled` on the list and on the sheet once the read is done, and the reservation applies only to `:empty:not([data-settled])`.
- **The mark**: the bar marked the entry whose address is `#settings?card=admin` for EVERY Settings screen (same route), so the gear of the header
  showed « Réglages » with « Administration » highlighted. An entry that names a card is now marked only when the address names that card
  (`cardOk` in `frame/app.js`, `renderMenu`). Case A183 (red before: 620 px, `['admin']`). The rest of SOG-0320 (the rearrangement by frequency of
  use) waits for the user's answer to the mockup `frame/settings/maquette/reglages_usage.html` (Q-0049).

## SOG-0320, the rearrangement by frequency of use (13 Nov 2026)

- The user's answer to the mockup (Q-0049, 13 Nov, 14 h 58): « Oui ». ALWAYS VISIBLE: status, display, airline; SOMETIMES, folded: Data, Synchronisation,
  Device; IN A PAGE: Administration (a row `a.f-grow` to `#settings?card=admin`, which also carries the IVAO application card); ONCE, folded, at the bottom:
  « Mise en route » (Identity, Access, and the new card `onboard` = « Créer / Rejoindre une compagnie » taken out of the airline card, whose
  `#settings?card=company` page still shows it); About flat, last. Level 1 (Discovery) keeps its seven flat cards in the old order. `groups.js`
  (`GROUPS`, `START`, `FLAT`, `ORDER1`, the frequency hints `T.groupHint`), `access.js` (`onboardHtml`, `TA.moreLine`), `settings.js` (the second
  `show`). Cases A184 (the order, the folds, the hints, the row, the page and its way back; captures 390 and 1 280) and A183; the cases that
  named the old groups or the inline Administration card were adapted (A12, A20, A32, A43, A49, A55, A67 to A69, A73, A75, A84, A120, A123: they open
  `settings?card=admin` or look in « Mise en route »). Known difference from the mockup: the chosen airline's sheet (kind radios, mission families) stays
  open under the list (A105 requires it), so the Company card is longer than drawn.

## SOG-0320, the retouches of 13 Nov (16 h 41): the part that is always visible is compact

- The ergonomist, on his captures against the validated mockup: the order was right, but « toujours visible » took more than 4 000 px at 390 instead of about
  900. (a) **« Affichage » is ONE card** (`cards.js` `display`, key `display`, replaces the cards `level` and `design`): the usage level in three pills (the
  sentence of the chosen level only under them; its menu is the tooltip), the appearance in pills of names (`[data-design-pick]`), the tone in three pills
  (« Automatique », « Jour », « Nuit », the long label cut at its parenthesis), the design previews (`.f-design`, `[data-design-preview]`) behind the closed
  fold « Voir les aperçus ». (b) **« Comment s'en servir »** (the frame's help panel) goes under « Mise en route » (`settings.js`, `placePage`). (c) **The airline
  sheet** (kind, mission families) is ONE closed line « Genre et familles de missions · n sur m » (`access.js`, `airlineFicheHtml(…, open)`); the page
  `#settings?card=company` shows it open (the cases of that page are unchanged). (d) The measure that decides: **A185** (red before: 2 000 px at 1 280, more
  than 4 000 at 390): at 390, « État » + « Affichage » + « Compagnie » take 1 000 px at most (1 017 → 997 px in German, the longest). Adapted: A12, A26, A184 (the
  card `display`). Known difference: the status block (the frame's) wraps its two lines on a phone.

## SOG-0324, « Repartir de zéro sur cet appareil » (13 Nov 2026)

- The user (Q-0049): « sur l'état du poste, prévoir un bouton de purge pour recommencer ce qui semble bizarre »; the ergonomist's frame (accepted): nothing that the
  device alone carries may go (a waiting send, a draft, a setting), nor the compiled data; ONE gesture, ONE confirmation, the waiting sends offered first, figures
  before acting, no second « Purger ». Survey: nothing existed in Settings to empty the device; the base's « Purger » (Données) acts on the WORKSTATION; FrameData has
  `cached(prefix)` (the copies with their policy and size), `evict(path)` (removes only a `reference` copy that has no write waiting) and a test-only `reset()` that
  erases the whole IndexedDB (waiting writes included): never offered. Done: the card « Repartir de zéro sur cet appareil » (`cards.js` `reset`, in the folded group
  Device, not inside the frame's « État » block, which the frame draws), the gesture in `actions.js` (`resetDevice`): list the `reference` copies and the waiting
  writes, say in figures what goes (« n copies relues du dépôt (x Mo) seront vidées puis relues… ») and what stays, ask ONCE, send the waiting writes first
  (`FrameData.sync`; if one does not go, nothing is emptied, said), `evict` each copy, then `sync` to read the tree again; the copies come back on demand. The documents,
  the settings of the device (`cache` policy) and the pending writes are never touched. Case A186 (red before: no card; the documents and the device settings
  stay, the `reference` copies go). The ergonomist (13 Nov, 20 h 19) kept the card in « Device » AND asked for ONE line in the « État » block that leads to it: the
  status item `reset` (`frame/app.js`, `T.info.reset`, « Quelque chose semble bizarre ? Repartir de zéro », `go: 'card:reset'`, from level 2 where the card exists); it
  opens Device on the card. Case A187 (red before: no line). The flicker of the same fiche is c9ff785e4 and the chain hold is in `modules/data/DECISIONS.md`.
  **Audit 206 of Sécurisation (13 Nov, 21 h 22) on 182818739: the gesture emptied OFFLINE** — the only test of the network was on the waiting sends; with none waiting it evicted every
  `reference` copy then started the re-read without waiting for it, and without a network the device lost its bases until the network came back (a pilot in flight, a device
  without launcher). Now: offline, it is refused BEFORE the question; after the answer the pass `FrameData.sync()` (which also sends what waits, then reads the tree: it is the test of
  the network) must be ok with no error and no warning, else « Rien n'a été vidé : pas de réseau pour relire les fichiers du dépôt » and nothing is emptied; a send that did not go
  still stops it. Case A188 (red before: the copies are gone after a failed pass; green after: the copies stay, offline and with a failed pass). The rest of the audit stands
  (never what the device alone carries, never `reset()`).

## SOG-0133 again, the first drawing at the Full level (14 Nov 2026)

- The ergonomist re-listed SOG-0133 as refused (the user on 10 Nov: « oui pour git, non pour compagnie »; the company list was SOG-0218). Survey with the launcher of the user's
  workstation (read only): the screen is drawn in 0.67 s from the navigation, `sog-settings-start` → `sog-settings-first` 134 to 240 ms; nothing slow there. On a slow link
  (a relay, a phone) the case A189 makes every data route of the launcher answer 2 s late while `status` answers: the first drawing took **1.8 s** at the Full level — `readProfiles`
  awaited `airline/map_profiles.json` (`FrameData` read with `wait: true`, so a read of the repository tree through the transport) for the Administration card, which the list no longer
  shows (a row since SOG-0320). Now the file is read only for the Administration page (`#settings?card=admin`); the list draws at once (134 ms with the same delays). A189 red before
  (1 883 ms), green after; A106, A140, A183, A184 stay green.
- Not mine, found by the same measure: the frame's own boot (`frame/app.js`, `launcher.detect()` → `GET /__setup/status`) waits for the launcher's first answer before routing, so on a
  relay answering in 2 s nothing is drawn for 2 s whatever the screen is (measured: first card at 4.1 s with every route 2 s late, 2.3 s with only `status` late). Handed to V3 Frame.
  Also seen: `sync-remote` and `sync-status?fresh=1` are each asked twice by a settings opening (two drawings) — harmless here, noted.
