# settings — specification (regeneration prompt)

The settings screen of the V3 frame: everything a device needs to know about itself. It is part of the frame, not a
module, because it sets the transport and the device token, which modules never touch. Reading of V2:
[READING.md](READING.md); decisions: [DECISIONS.md](DECISIONS.md); how the frame mounts it:
[INTEGRATION.md](INTEGRATION.md).

**As a prompt**: give this document, `frame/SPEC.md` and `frame/INTEGRATION.md`, and ask for one classic script
`frame/settings/settings.js` defining `window.SogSettings.render(view, context)`. Every rule below is a requirement.
The repository splits that script into parts of at most 60 KB loaded before it (INTEGRATION § 1: kit, launcher, access,
diagnostic, admin); the split is a matter of size, not of behaviour, and a regenerated single script is valid.

## 1. Screen

- Address `#settings` (the old `#device` shows the same screen); opened by the ⚙ button of the header, which is also where
  the state badge sits (`docs/technique/V3_SPECIFICATION.md` § 7.1 rule 14: Settings left the phone's bottom bar).
- **The screen opens on a "Status" block** (rule 14, which takes over the lines of the header's former "i" pop-up), before
  the other cards: `[data-card="status"]`, a title and one 44 px line per thing, with the dot of the ⚙ badge (green: news;
  amber: attention). Flight started › Map; report to write › Report with the hand-over of `pending.json`; trigram not set ›
  the Identity card; the aeronautical base while it is not ready › the Access card; the state of the data (synchronised n min
  ago, pending writes) › the Synchronisation card (the Usages card when that one is hidden), or `#conflicts`; launcher › the
  Access card; offline; the position and the GPS switch (phone only). **The frame draws it** (it has the state) and gives it
  through the context (`ctx.status = { html(), bind(card) }`): settings places `ctx.status.html()` first among the cards, then
  calls `ctx.status.bind(card)` once the card is in the page, and the frame rewrites it when the state changes. Settings
  neither reads that state nor draws its lines. Without `ctx.status` the block is simply absent.
- One column of short cards, phone first: no horizontal scroll at 375 px, touch targets of the frame (44 px).
- **Each card is saved on its own** (its own button, or at once for a checkbox); no global "Save".
- A wrong value is said inside its card, never in a native dialog; questions use the frame's `ask`.
- Texts are `[fr, en, de, es]` rows through the frame's `t` (French typography included); the status block's texts are the
  frame's.
- **Seven cards at most, then groups** (ergonomics session, 28 Oct 2026; `frame/settings/groups.js`):
  - **Discovery** (level 1): no groups; seven cards at most, flat, in the order of the path: Identity, Access,
    Synchronisation (when shown), Usages, Level, Design, About. Backup, Offline data, Weather key, Little Navmap sheets
    and Computer access are not drawn at this level (they start at Everyday).
  - **Everyday and Full**: the cards under seven titles at most, in the order of the path (what is set once comes
    first): **Identity** (Identity), **Access** (Access, Synchronisation), **Data** (Usages, Offline data, Little Navmap
    sheets), **Device** (Backup, Weather key, Computer access), **Display** (Level, Design), **Administration** (Full
    only), **Help** (About). Each title is a fold (`details.f-group[data-group]`), closed by default, except a group that
    carries an attention: a warning or an error in one of its cards, or the card an amber line of the status block leads
    to; it is open and its title carries the amber dot. A group opened or closed by hand stays so when the screen is
    drawn again (for the page's life). A group with no card is not drawn.
  - At every level, the status block and the **cards of circumstance** (V2 settings found, configuration received,
    joining resume) come first, outside groups and outside the count; they go once dealt with.
  - A line of the status block that leads to a card opens that card's group first (listened to in the capture phase,
    before the frame brings the card under the header); so do "Diagnostics" of the Administration card, the
    `#settings?offline=1` and `#settings?import=1` entries.
- **A card reached by its address is shown whatever the level; the level only filters the list** (ergonomics session,
  28 Oct 2026): `#settings?card=<name>` (a `data-card` name: `offline`, `backup`, `wx`, `lan`, `lnmperf`, `admin`…) and
  `#settings?offline=1` (the joining assistant's last button) draw that card alone, at the top, under a "← Settings" link
  to `#settings` (`[data-settings-back]`); no status block, no help panel. The address stays as it is, so a redraw (after
  an action) keeps the card. An unknown name draws the ordinary list.
- The diagnostics are a folded block of the About card.
- **Nothing of the administrator's on the ordinary cards** (rule 18 of `docs/technique/V3_SPECIFICATION.md` § 7.1): every
  administrator page is one button of the Administration card (§ 3.11), Full level only.

## 2. Device files (policy `cache`, never synchronised)

| File | Content |
|---|---|
| `device/identity.json` | `trigram` (2–5 letters or digits, upper case), `ivao` (digits), `vatsim` (digits), `simbrief`, `updated_at` |
| `device/level.json` | `level`: 1 (discovery), 2 (everyday, the default), 3 (full); `updated_at` |
| `device/usages.json` | `devices`, `users`, `backend` (booleans), `single` (true when none of them is ticked), `updated_at` |
| `device/settings.json` | `v2`: `taken` or `declined` once the V2 take-over was answered |
| `device/keys.json` | the device's keys, kept **like the identity** (same store, same policy, same file family): `github` (`{ repo, branch, token, api? }` or null), `avwx` (the weather key or `''`), `updated_at`. `FrameData.dump()` leaves it out and a `replace` load keeps it: a backup never carries a key. Read into memory by the frame at each `reload()` (`FrameData.github.config()` and the weather key stay synchronous), written by `FrameData.github.save/clear` and `weatherKey.save/clear`. The old `localStorage` places (`githubData:frame`, `githubData:avwx`) are taken over once, when the file does not exist yet, then erased |

After each write the frame's `reload` is called: the transport and `ctx.identity` follow at once.

## 3. Cards

0. **Join the airline, resume** (§ 7), first, while the assistant is in progress: the step reached and "Resume"; a
   configuration refused (link or file) shows its message here instead.

1. **V2 settings found** (once): shown when this origin holds V2 settings — identity in `missionReportingConfig:v1`
   (`trigram`, `ivaoId`, `vatsimId`, `simbriefUser`), access in `githubData:v1` (`repo`, `branch`, `token`) — and
   `device/settings.json` has no answer yet. It lists what it found (the token is never shown). "Take over" writes the
   identity and, if no access is set yet, copies the access to the frame's setting (`FrameData.github.save`); "No
   thanks" only records the answer. V2's own settings are left untouched.
2. **Identity**: the four fields; with "several users" ticked and no trigram, a warning says the trigram is needed.
3. **Level**: three choices, one tap each (radio buttons, saved at once): Discovery ("the essentials, to get
   started"), Everyday ("day-to-day use", the default), Full ("everything, advanced tools included"). Under each, the
   verbs of the menu at that level, computed from the modules' `meta.level` once the frame has read them. A hint
   says a hidden module stays reachable by its address. The frame's menu follows at once.
3b. **Design**: one thumbnail per set of the frame (`designs()`: id, label in four languages, textured), each a small
   block carrying that design and the current tone (`[data-design][data-tone]`, the frame's tokens), the current one
   outlined; the tone Automatic (as the system), Day, Night. One tap calls `saveDesign({ design, tone })`: the frame
   applies it and keeps `device/design.json`; settings never writes it. When the design applied is not the one chosen
   (`design()` → `{ design, tone, applied }`, `applied !== design`: Aqua is for the computer only and `designs()` leaves it
   out elsewhere), one line under the thumbnails says so: "Aqua, chosen on this device, only applies on a computer: Standard
   here. Touching a thumbnail replaces this choice." (×4, `[data-design-applied]`), and the thumbnail of the design applied
   (`applied`, else `design`) is the one marked `aria-pressed="true"`; the screen is drawn again on the frame's `frame-desk` event while the Design card is on screen. The thumbnails keep `[data-design-pick="<id>"]` (Aqua's tests H5, H6).
4. **Usages**: one sentence first — "Alone on this device: nothing is exchanged" when no exchange is ticked (it is a
   state, not a box), otherwise how data are exchanged: through this workstation's launcher (`data/` folder, git or
   not), through the GitHub repository, or "no way to exchange here: set the access below". Then three boxes:
   alone on several devices, several users, server (disabled, "to come").
5. **Backup of this device** (no exchange only), through the frame's `FrameData.dump()` and `FrameData.load()`:
   "Export (one file)" downloads the dump (`{ name, text, counts }`: copies, pending writes, conflicts; never a token;
   reference bases left out) and says how many files, pending writes and bytes. "Import (merge)…" asks, then loads
   in `merge` mode: nothing of this device is lost, only what is missing here or older here is taken. "Replace from a
   file…" asks, saying that this device's copies, pending writes and conflicts will be erased, then loads in `replace`
   mode. A file that is not a device backup is refused with a notification; the result says added, updated, kept
   and conflicts.
6. **Data access** (always): on a launcher, one sentence (no token here); the **remote repository of `data/`** is a panel
   of the Administration card (Full level, rule of 28 Oct 2026: what is the administrator's goes behind Administration),
   `[data-card="remote"]` inside `[data-adminpanel="remote"]`, shown when `data/` is a git repository
   (`GET /__setup/sync-remote`: `repo`, `remote`, `url`, `branch`, `default`): the current address and branch (a
   branch that is not a branch name is left out), or "no remote repository: nothing leaves this workstation"; an
   address field (current address, else the configuration's default), "Check" (`POST { url }`: does it answer) and
   "Save" (`POST { url, save: true }`; another repository than the current one is confirmed in a window the launcher
   opens on the computer, as in V2's first start). Never blocking: the check's report stays in the card after a save.
   The provider is not a setting: a line `[data-provider="github|gitlab|other"]` at the top of the panel reads it from the remote's address
   (`SogConfig.providerOf(url)` → `{ provider, web, project }`, the one host classification, `SogConfig.kind`): the project as a link when
   `web` is https; GitLab adds the "Pilots' tokens" link (`#pilot-tokens`) and a sentence; GitHub a sentence suggesting a GitLab project
   (the page only proposes, the change still goes through the launcher's window); other: "provider not recognised". The exported
   configuration carries `data.provider`; the pilot's Access card (no launcher) shows GitLab's field and hint when the device's access
   (`provider`) or the received configuration says gitlab.
   When `data/` is not a git repository, a door rather than a warning (state from the launcher's `state`, `absent` |
   `plain` | `repo`, else deduced): one sentence saying that `data/` is a folder ignored by the code repository that
   becomes its own git repository (not a submodule); the address (the configuration's default), an optional username
   and password or token (never kept by the page: the secret field is emptied before the call), "Remember these
   credentials in Git, on this computer"; then **"Fetch the data"** (`data/` absent: `POST /__setup/clone { url, user,
   secret, remember }`) or **"Take data/ into this repository"** (`data/` without git: `POST /__setup/adopt`, same
   body). Progress and report in the card, buttons disabled meanwhile, never blocking; on success the frame detects the
   launcher again and plugs the transport, and the card is drawn again from the new state. A launcher that does not
   know the route is told to restart up to date.
   **The launcher's Yes / No window**: taking `data/` into another address than the configured one, or saving another
   remote address than the current or configured one, opens a confirmation window on the computer, never in the page.
   Before the click, a sentence under the button says so (shown as the address is typed, debounced: the
   launcher's answer to `POST /__setup/adopt { url, dry: true }`, which does nothing and returns `needsConfirm`; the
   current remote address never asks; without an answer, compared with `default`, ignoring a final `/` or `.git`; an
   empty or invalid address announces nothing); while waiting, the card says to answer it, maybe behind other windows; after a refusal, the launcher's own
   message (already open / refused / closed / impossible), plus "look for it behind the other windows" when one was
   already open (`confirm: 'open'`, or the message). A link to the help section "A git repository for data/" stays. On the Usages card, "Several users" ticked with no remote shows a warning pointing to
   Administration › "Remote repository of data/" (Full level), and the state sentence says "a git repository with no remote: nothing goes elsewhere". Without an exchange, a hint says the access then only reads the aeronautical and aircraft bases published in
   the data repository, nothing is sent (the frame's local transport with the GitHub repository as reference source). Otherwise repository, branch and
   token; the token field is always empty, its placeholder says a token is saved, an empty field keeps it. Hint, by the
   repository's owner (§ 5): a **classic** token with the `repo` box for a user's repository, a **fine-grained** token
   (this repository only, Contents read and write) for an organisation's; one year at most; never pasted in a message.
   "Save", "Test" (the branch head through the transport; offline said as such) and "Cut access" (asks, then
   the context's `cutAccess`; pending writes stay queued).
7. **Synchronisation** (an exchange ticked, or writes waiting — the card follows the state): last success, pending
   writes, network, last error, kept live through `onStatus`; then the **pending writes** themselves
   (`FD.status().queue`, newest first, 20 at most then "… and n more"): path, module (its menu label), time (the date
   too when not today), ✕ for a deletion; "Synchronise now" (the frame's `syncNow`); a link to the conflicts screen when there are some.
8. **Offline data**: aeronautical bases (`aerodb.status()`: published zones, zones open on this device, cycle), the
   browser storage (`navigator.storage.estimate`), then one row per published zone through `aerodb.offline`
   (`frame/aerodb/INTEGRATION.md` § 4): its name in the application's language, its state on this device (not here,
   partly here, kept offline, unknown), cycle, kept and published sizes; "Keep offline" (progress shown in the row, a
   notification with the size read or the files not read) when the zone is not complete, "Free" when it has copies and
   the frame can evict; a last row for the aircraft base (state, number of types). A hint says keeping downloads the
   whole zone, preferably on Wi-Fi. With no launcher and no access set, a warning says the device has no base and
   gives the two ways in: set the access above, or publish the bases from a workstation with the launcher.
8b. **Weather key (TAF, avwx.rest)**, with or without a launcher, when the frame gives `weatherKey` (`has`, `save`,
   `clear`, `test(icao)`): METAR works without a key; TAF without a launcher needs a personal avwx.rest key. The frame
   keeps it in `device/keys.json` with the GitHub token (like the identity), never in a backup nor in the repository, and never
   gives it back; `ctx.net` adds it to calls to avwx.rest. The card shows whether a key is saved (never the key), a
   password field emptied on save, "Test" (`test('LFPG')`: the launcher's or provider's status and message), "Erase"
   (asks), a link to the provider's sign-up page; on a launcher, a sentence says it is not needed (the launcher
   provides the TAF).
9. **Airline API keys** (page served by a launcher only): a panel of the Administration card (Full level, rule of
   28 Oct 2026), `[data-card="keys"]` inside `[data-adminpanel="keys"]`, its title and sentence in `admin_links.js`; the IVAO API key's state (`GET /__setup/secrets`: saved with
   its last characters, given by the launcher's environment, or missing), a new key (empty: unchanged), "Save",
   "Test" (`/__setup/secrets/test?service=ivao`), "Erase" (asks). The key goes to the launcher's `secrets/` folder,
   never to the browser nor to the data.
   Below it, a second block `[data-card="ead"]`, **EAD Basic (EUROCONTROL)**: the notice "demonstration tool,
   non-operational data, for simulation use" (×4, always visible), a sentence saying the credentials are given once, never
   shown again and used by "Read an aerodrome from EAD", the state ("saved on <date>" or "missing", from
   `GET /__setup/secrets` `app.ead.{user,password}` = `{ set, at }`, never a character of the values), a user name field
   and a password field (`type=password`), "Save" (both required; the fields are emptied before the call) and "Erase"
   (asks). `POST /__setup/secrets { scope: 'app', service: 'ead', values: { user, password } }` writes
   `secrets/ead.json` (`{ user, password, savedAt }`), read by `tools/regen_jobs.py` for the verb `proc/ead-fetch`; never
   synchronised (`secrets/` is outside the data repository). No "Test" button: signing in to EAD belongs to the EAD line.
   Under it, one line links to the **IVAO application assistant** (`#settings?card=ivaoapp`), a card of its own in the
   Administration group (launcher, Full level, or reached by its address; `launcher.js` `ivaoAppHtml`): the steps at
   `https://developers.ivao.aero/create` (Name, App Type = Third Party, Active = Enabled, "+ Add Redirect URL", Submit), the
   return addresses to declare (`GET /__setup/secrets` `ivaoRedirects`: this workstation's, plus the relay's when `RELAY['host']` is
   set; one "Copy" button each; an older launcher without the field gets one line saying to update it), the state
   (`app.ivao_oauth.{clientId,clientSecret}` = `{ set, at }`, blind like EAD), Client ID and Client Secret fields (the
   secret is `type=password`), "Save" (both required; fields emptied before the call;
   `POST /__setup/secrets { scope: 'app', service: 'ivao_oauth', values: { clientId, clientSecret } }` writes
   `secrets/ivao_oauth.json`), "Test" (`/__setup/secrets/test?service=ivao_oauth`: the OpenID discovery document is read again,
   no secret in the answer) and "Erase" (asks). Read once with the keys panel (a single `GET /__setup/secrets`).
9a. **Folders of this computer** (page served by a launcher, Full level; V3 § 10.34 A3, 30 Oct 2026): a panel of the
   Administration card, `[data-card="folders"]` inside `[data-adminpanel="folders"]`, its title and sentence in
   `admin_links.js`. One row per folder the launcher knows (`GET /__setup/folders` → `{ folders: [{ id, path, exists, from }] }`,
   ids `suite`, `data`, `downloads`, `lnmdb`, `lnmperf`, `xplane`): its name, its path in `<code>` (read only: no field;
   « non réglé » when empty, « absent de ce poste » when missing), where it comes from (`from`: the suite's folder, `data/` or
   `--data` at start, the system's Downloads, Little Navmap's own, Settings › Little Navmap sheets, unknown to the launcher
   for X-Plane) and « Ouvrir » for a folder present: `POST /__setup/folders/open { id }`, the id only, the launcher takes the
   path itself and opens it in this computer's file explorer. A path is changed where it says, never here.
9a-bis. **Update the suite** (page served by a launcher, Full level; V3 § 10.34 A3, 30 Oct 2026): a panel of the Administration
   card, `[data-card="update"]` inside `[data-adminpanel="update"]`. A channel (`stable`: the latest version vX.Y.Z; `early`: the
   highest version, pre-releases included; `suivi`: the head of the development branch, named once in the launcher), « Vérifier »
   (`GET /__setup/update?channel=…`: fetched, then the plan, nothing changed: the installed version, the target, the number of
   changes, or the refusal in words — local changes, a checkout that is not the channel's, a step back, no version, no git,
   the repository not answering) and « Mettre à jour », on only when the plan has something to do, after a question
   (`POST /__setup/update { channel }`: the tag checked out detached, or the branch fast-forwarded). The running launcher keeps
   its code: the panel says to close its window and run `lancer.cmd` again. The data repository is never touched.
   « Mettre à jour » is refused (`reason: 'busy'`) while a job of the Data module or a synchronisation of data/ runs: the
   checkout changes `tools/` while a child process may still import a module from it (Sécurisation's review of
   4fc473e5d). The plan and its `git fetch` come first, outside any lock; then job starts are held (`Jobs.hold`: a start
   answers 409 `updating`, while the job state, « Arrêter » and the windowless page keep answering) and `SYNC_LOCK` is
   taken for the writing alone (plan again without fetch, then the checkout or the fast-forward); both are given back at
   the end (review of 2a02aedde, line 103). The target is not verified (no
   `git verify-tag`: the tags are not signed): the same trust as the manual `git pull` it replaces, said in the help; to be
   tightened if the tags are signed one day.
9b. **Little Navmap sheets (.lnmperf)** (page served by a launcher, when `aerodb.lnmperf` exists): an empty, hidden
   `[data-card="lnmperf"]` block that settings places after the launcher keys; its content and states (folder, Little
   Navmap folders found, "Save", "Synchronise now", "Stop", last pass, sheets not written) are drawn by aerodb
   (`frame/aerodb/lnmperf.js`, `card(el, { t, notify })`), and the block is shown once aerodb has filled it. A failure
   leaves it hidden. Settings neither reads nor writes the folder or the sheets.
9c. **Computer access** (the computer that serves the page only: the frame's `lan()` is `null` elsewhere, a paired
   device included; `frame/SPEC.md` § 3.10):
   - Shows the state ("open until the launcher closes", or "closed: only this computer opens the application"), then,
     while open: the address to open on the device (the main one, the others below), its QR code (`SogQR.svg`), the
     6-digit pairing code with the minutes it has left, or "no code in progress", or "pairing closed"; "New code"
     (works once, 10 minutes; reopens pairing closed after 30 wrong codes in an hour); the paired devices, each with
     its pairing date (`c.time.fmtDateZ`, UTC) and "Forget" (asks; "Device "…" forgotten."; without an answer the state
     shown stays and the card says the launcher does not answer); the computer's other private addresses (VPN, virtual
     machines), closed, with "Open them too" (an address still closed afterwards is named in the card).
   - A warning "trusted network only" (http, unencrypted).
   - "Open to devices of the local network" / "Close access", and "Forget the devices" (asks; disabled with none
     paired). A computer with no private address says there is nothing to open.
   - The state is read again every 5 s while the card is on screen, and drawn only when it changes. A new code or a
     newly paired device thus appear by themselves.
   - The help section "The tablet next to the simulator".
10. **About**: links to the help (the Settings chapter) and to the roadmap (`#roadmap`), then the **diagnostics**,
   folded inside the card: transport, status, usages, launcher, repository (never the token), aerodb state,
   storage, network, browser; the page (`d.page`: secure context, offline use active / not yet / impossible over http
   outside the computer, the launcher's computer and whether through the local network); "Copy".
11. **Administration** (level Full only; absent otherwise), after About: **one button per administrator page** (§ 6), each
   with its sentence under it, 44 px high: "Map threshold tuning" (`#maps?tune=1`), "Flight zone limit" (folds a panel open under
   its button: a box "Show the edge line of the flight zone limit", saved at once, for the airline, as the key `edge` of
   `airline/map_profiles.json`; shown by default; the contract is `INTEGRATION.md` § 4), "Export a configuration for a pilot"
   (folds the export of § 5 open; absent when the device has no repository to export), on a launcher "Remote repository
   of data/" and "Airline API keys (IVAO, EAD Basic)" (panels, § 3 items 6 and 9), then the roadmap, the diagnostics
   and the benches and V2 pages of § 6. The export used to be a fold of the Access card; the import ("Join the airline…",
   "Import a configuration…") stays there, it is the pilot's.

Under the screen's introduction, the folded "How to use" panel of the Settings chapter (`frame/settings/help/`,
`frame/help/SPEC.md`).

## 4. Invariants

1. No token or key is ever shown again, synchronised, put in a backup (`dump()` leaves `device/keys.json` out, a `replace`
   load keeps it), exported in a pilot's configuration or put in the diagnostics. It lives in `device/keys.json` on the
   device only (§ 2).
2. "Alone on this device" is never a box that contradicts another one.
3. A device setting is never synchronised.
4. Nothing on this screen blocks: offline, every card still draws from the device.
5. A pilot's configuration never carries a token or a secret, and its import sets nothing it does not hold.

## 5. Configuring a pilot (`frame/settings/config.js`, `window.SogConfig`)

- **Schema `sog-config/1`** (JSON): `schema`, `created_at`, `by` (the exporter's trigram), `airline { name, site, pages
  { recordFlight, log, fleet, aircraft } }` (from `airline/settings.json`), `data { host, repo, branch, ownerType?, api?
  }` (`ownerType`: `User` or `Organization`, read at export from GitHub's public `users/<owner>`; the
  repository without its credentials: from the remote of `data/` on a launcher, or the device's GitHub setting, `api`
  then kept), `identity { trigram }`, `usages { devices: true }`, `howto { token { fr, en, de, es } }`.
- **How-to of the token**, from a template per host: GitHub, an **organisation's** repository — a fine-grained token
  limited to the repository (resource owner the organisation, Contents read and write, one year), the organisation
  allowing such tokens; GitHub, a **user's** repository or an unknown owner — a **classic** token, the only kind an
  invited pilot can make for it: prefilled link `https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote`,
  one year, scope `repo` only, with the plain warning that it opens every repository of the account (hence an account
  dedicated to flying); GitLab /
  framagit — a project access token, role Developer, scope `write_repository` (Maintainer needed, otherwise a personal
  token with the same scope), and the note that a phone reaches it only through a workstation's launcher; other hosts —
  ask the administrator. Each with the repository's exact address.
- **Export**, in the Administration card (Full level) of a workstation (launcher) or of a device set up on GitHub: the
  button "Export a configuration for a pilot" opens a panel that asks the pilot's trigram and the address of the published app (this one when it is published
  over https, else the last one given, kept in `localStorage` `sogFrame:appUrl`), then "Create the file and the link":
  `sog-config-<TRI>.json` is downloaded, and the link `<app>#settings?config=<z + base64url of the deflate-raw JSON>`
  (`j` + base64url of the JSON where the browser cannot compress) is shown with "Copy the link". A local address is
  flagged: it opens only on that workstation.
- **Administrator's steps**, listed at the top of the export panel: invite the pilot's account on the repository
  (GitHub: Write role, link to `https://github.com/<repo>/settings/access`; GitLab / framagit: Developer role, link to
  the project's members page), export, then send the link or the file, or show the **QR code** of the link
  (`frame/lib/qr.js`, below the link). The link carries the configuration without its how-to (rebuilt from the template
  at import), so the code stays small (about version 15).
- **Import**: "Join the airline…" and "Import a configuration…" at the top of the Access card (always), the link
  (`#settings?config=…`), and the welcome card of the first opening (`#settings?join=1`). The file or link is read
  (256 KB at most, decompressed too) and checked: another schema, a missing trigram or an invalid field is refused with
  a message, nothing changed; only the known fields are kept. A valid one starts the assistant (§ 7).
- **Access the configuration would set**: on a launcher, `data/` already following that repository — nothing (no token
  asked); another repository — not changed, said; no `data/` or a folder without git — clone or take-over by the
  launcher (`/__setup/clone` or `adopt`, user `x-access-token` for GitHub, `oauth2` otherwise, the token as secret,
  remembered; the launcher may ask for confirmation in its window); without a launcher — the device's GitHub transport
  for a GitHub repository ("Test" first; another access already set is replaced only after a question), nothing for
  another host (said: apply it on a workstation).
- **The how-to** of the token starts with the account sign-up (`https://github.com/signup`, or
  `https://<host>/users/sign_up`) and, for GitHub, the invitation to accept (`https://github.com/<repo>/invitations`);
  it is shown wherever the token is asked, in the device's language, falling back to French.

## 6. Administration links (`frame/settings/admin_links.js`, `window.SogAdminLinks`)

- **A declared list**, depending on no module: `{ id, href | act | panel, primary, where, title, text }`, texts in four
  languages. **Every entry is drawn as one button** (rule 18): `href` a link styled as a button, `act` an action of the card,
  `panel` a button that folds open the panel of its line (`edge`, `cfg`, `remote`, `keys`, written by the settings files;
  a line whose panel is empty is not drawn), `primary` the accent
  colour of the administrator's own pages. `where`: `app` (everywhere), `bench` (a bench or demonstration page served by the launcher: a link only on a
  workstation with a launcher, otherwise a greyed button; its sentence ends with "workstation with launcher
  only"), `v2` (a V2 page of the workstation: shown only when a launcher serves the page), `launcher` (a setting of
  this computer's launcher: shown only when a launcher serves the page).
- **Today**: "Map threshold tuning" `#maps?tune=1` (read only on a phone), "Flight zone limit" (`panel: edge`), "Export a
  configuration for a pilot" (`panel: cfg`), "Remote repository of data/" (`panel: remote`, `where: launcher`), "Airline
  API keys (IVAO, EAD Basic)" (`panel: keys`, `where: launcher`), "Data sources" `#sources` (aerodb's Sources screen, links only; `copyLink`: under its link the absolute address of the screen built from `location`, and "Copy the link"; it replaced the data laboratory `#datalab` on 28 Oct 2026), roadmap `#roadmap`, diagnostics (`act:
  diagOpen`: opens the folded diagnostics of the About card and scrolls to it); benches `labs/design_primitives.html`,
  `frame/aerodb/bench.html`, `frame/aerodb/offline_bench.html`, `frame/store/test/`, `modules/maps/test/render.html`;
  V2 pages `apps/settings/maintenance.html`, `apps/settings/premier_lancement.html`, `apps/cpco/map_parser.html`.
- Paths are relative to the root of the suite; pages outside the app open in a new tab, the app's own addresses in place.
- The Settings chapter's section "Administration" writes the same addresses out.

## 7. Join the airline (`frame/settings/join.js`, `window.SogJoin`)

- **One screen per step**, "Step n of m", "← Back" / "Next →": (1) the configuration received — airline, repository,
  trigram; (2) the account — "Do you already have a GitHub account?" Yes / No; No lists creating it (sign-up link, a
  simple username, verifying the email); then the username (needed to go on); (3) the invitation — give the username to
  the administrator ("Copy my name"), accept the email invitation (`https://github.com/<repo>/invitations`), a box
  "Invitation accepted" (the access can only be checked once the token exists); GitLab / framagit: added as Developer;
  (4) the token, step by step — GitHub, user's repository: the prefilled classic-token link, one year, `repo` only, copy
  at once, and the warning on its account-wide reach (also said at step 2); organisation's repository: the fine-grained
  token page, the organisation as owner, only the repository, "Contents: Read and write"; GitLab: personal token with
  `write_repository`; the airline's how-to folded below; a box "Token copied"; (5) paste and "Test" — 404: invitation not accepted or repository not chosen in the token; 401:
  copied wrongly or expired; 403: no right — `repo` box (classic) or Contents (fine-grained); both token forms
  accepted; offline said; checked: the access is saved (another one
  replaced only after a question); on a workstation, "Clone with the token" (launcher); (6) IVAO, VATSIM, SimBrief,
  optional, saved with the trigram; (7) "Finish and synchronise" — usages, first synchronisation, airline if the
  repository has none — then "Offline data", "Prepare a flight" and the tutorial.
- **Kept on the device** (`device/join.json`, cache policy): the configuration (no secret), the step, the boxes, the
  account answer and the username — never the token. A settings card offers to resume; "Give up" (asks) stops it
  without undoing anything.
- **Steps skipped**: 2 to 5 when the access is not set here — the launcher's `data/` already follows this repository
  (or another one), or a host the device cannot reach without a launcher (GitLab / framagit on a phone, said at step 1).
- No screenshots of the host's own pages: the steps give its direct links and exact labels.
