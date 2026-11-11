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
    `#settings?offline=1` entry, and `#settings?import=1` (which now opens the assistant of § 7).
- **A card reached by its address is shown whatever the level; the level only filters the list** (ergonomics session,
  28 Oct 2026): `#settings?card=<name>` (a `data-card` name: `offline`, `backup`, `wx`, `lan`, `lnmperf`, `admin`…) and
  `#settings?offline=1` (the joining assistant's last button) draw that card alone, at the top, under a "← Settings" link
  to `#settings` (`[data-settings-back]`); no status block, no help panel. The address stays as it is, so a redraw (after
  an action) keeps the card. An unknown name draws the ordinary list. `&panel=<name>` with `card=admin` also unfolds that
  panel of the Administration card and brings it into view (an unknown or absent panel: nothing more).
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
6. **Data access** (always): on a launcher, one sentence (no token here) and a second that says where the repository and its
   provider are, « Dépôt et fournisseur (GitHub ou GitLab) : Administration › Dépôt distant de data/ », a link to
   `#settings?card=admin&panel=remote` (user, 31 Oct 2026: the provider is no setting, and was not found); the panel's own
   sentence says the provider is read from the address. The **remote repository of `data/`** is a panel
   of the Administration card (Full level, rule of 28 Oct 2026: what is the administrator's goes behind Administration),
   `[data-card="remote"]` inside `[data-adminpanel="remote"]`, shown when `data/` is a git repository
   (`GET /__setup/sync-remote`: `repo`, `remote`, `url`, `branch`, `default`): the current address and branch (a
   branch that is not a branch name is left out), or "no remote repository: nothing leaves this workstation"; an
   address field (current address, else the configuration's default), "Check" (`POST { url }`: does it answer) and
   "Save" (`POST { url, save: true }`; another repository than the current one is confirmed in a window the launcher
   opens on the computer, as in V2's first start). Never blocking: the check's report stays in the card after a save.
   The provider of a *configuration* is chosen, never deduced (see § 5); the remote panel only *reads* a git address, which has no
   provider field: a line `[data-provider="github|gitlab|other"]` at the top of the panel (`SogConfig.providerOf(url, known)` →
   `{ provider (github | gitlab | null), web, project }`). Recognised: the public hosts of the table (github.com; gitlab.com and
   framagit.org: the only deduction admitted, a closed frozen list compared by host equality, ergonomics session 31 Oct), or a host the device's configuration gives with a provider of the table (`SogConfig.knownProviders(joined config,
   device access)`: a self-hosted GitLab is known there, same host); anything else: "provider not recognised" (a case of the panel,
   no entry in the table). The project is a link when `web` is https; GitLab adds the "Pilots' tokens" link (`#pilot-tokens`) and a
   sentence; GitHub a sentence suggesting a GitLab project (the page only proposes, the change still goes through the launcher's window).
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
   **The token of a GitLab project says what it is** (§ 10.36 part 3, without a launcher): « Test » and « Save » ask the instance who the token is
   (`whoami`, § 7) and put what they learn in the card's message, in warning colour, never blocking: a personal token (it works for all the
   user's projects; the user alone with their own repository needs one), an expiry missing or beyond 365 days, rights beyond the transport's;
   after « Save » the warning is said once the card is drawn again. A failed reading changes nothing of the test or the save (the branch read
   already says its failures). Case A72.
7. **Synchronisation, the sync summary** (an exchange ticked, or something waiting — the card follows the state; no new screen: the
   card both apps' status block leads to is the summary; `settings/sync_summary.js`, `window.SogSyncSummary`; the user, 1 Nov 2026: « je ne
   sais pas quelles fiches appareil sont synchro et lesquelles ne le sont pas, pas plus que les missions »), kept live through `onStatus`:
   - **Head**: one line, one count per kind (« En attente : Fiches d'appareils : 3 · Missions : 0 · Vols : 1 · Flotte : 0 », « Autres »
     only when not zero). The kind is the path's prefix: `aircraft/sheets/` sheets (and their mirror `planner/flight_performance_database_merged.fpdb.json`,
     which aerodb writes with every saved sheet: counted with the sheets and named « Base des fiches (copie des fiches enregistrées) »,
     never an « Autres » line nothing explains; case A86), `missions/` missions, `pilot/<TRI>/` flights,
     `airline/fleet.json` fleet, anything else « Autres ». Then last success, network, last error, and the hint that says when the next
     try is (at start, every 10 minutes online, when the network comes back).
   - **« Tout envoyer »** (primary, the frame's `syncNow`: the gesture the card always had, with or without a launcher), and the link to the
     conflicts screen when there are some.
   - **A folded list per kind** (`details[data-kind-list]`) of what waits: its readable title, its date (the time when today), ✕ for a
     deletion, and the reason when an error holds the queue (`FD.pendingList().error`: the last run's failure holds the whole queue; a write
     refused for good goes to the conflicts instead). **Seven items visible at most in all** (one budget over the kinds, in the head's order);
     the rest is « … et n de plus » under its kind.
   - **The reads**, each once, here: without a launcher `FrameData.pendingList()` (`[{ path, module, at, deletion, error }]`, newest first, never
     the text); with a launcher also `GET /__setup/sync-status?fresh=1` (`changed`: modified here, not committed, and `toPush`: the paths of the
     commits to send, names only, 200 at most, with `changedTotal` and `toPushTotal`; read at most every 5 s, never during a synchronisation,
     at once when one ends; paths counted but not named go to « Autres »). A path in several lists is one item (the device's wait first, then
     « modifié ici », then « à envoyer »; a path in both of the last two says both).
   - **What has just left** (SOG-0029, `FrameData.lastPushed()`, V3 Frame 536ea9ec5; `div[data-pushed-box]` under the lists): one line
     « Parti à 18:04 : Fiches d'appareils : 2 · Missions : 1 (dont 1 refusé(s))» (« Parti le <date> » when it is not today) in the
     `summary` of a folded `details[data-pushed]`; unfolded, the files one by one (title by the same `titleOf`, the path otherwise), the
     refusals first with the reason the transport gave (text, 200 characters at most), seven at most, « … et n de plus ». It is the last
     send, not a journal: a pass that sent nothing leaves it, nothing is shown before the first send, and a layer without `lastPushed` says
     nothing. The card is shown when something has just left. `SogSyncSummary.pushedItems` reads the list bounded (a path once, a result
     that is not `'ok'` is a refusal, `'?'` when no result). Case A87.
   - **How long it took** (SOG-0149, `data_sync.run` timings, V3 Frame 12cad5326; `div[data-sync-timings-box]` under the head): with a launcher whose `sync-status` gives `last.timings`, two lines — « Dernière synchronisation » and « La plus longue aujourd'hui » — in seconds (one decimal under 10 s): the total, then the steps in the closed order `settle, commit, prepare, receive, untrack, push` (a step under 50 ms is not said), the number of git commands with their time, the bytes sent. The last pass is read from `sync-status`; **the longest of the day is kept on the device** (`device/sync_timings.json`, one record `{ day (UTC), at, totalMs, steps, gitCalls, gitMs, sentBytes }`) because the launcher keeps the last pass only: a longer pass of today replaces it, a shorter one does not, a record of another day is ignored. An older launcher without timings: no « last » line. Read as untrusted input (`SogSyncSummary.timingsOf`): numbers only, bounded, steps by a closed list with `Object.hasOwn`, nothing from the answer becomes text but those numbers. Case A112.
   - **The title**: `meta.titleOf(path, value)` → `[fr, en, de, es]` or null, declared by the module that owns the kind (Carburant: flights and
     the quote settings; Appareils: sheets and the fleet; Missions). Settings imports the `module.js` of the application's modules
     (`ctx.modules()`) and of `aircraft`, `fuel`, `missions` (the other applications' modules, which the frame does not list for Settings), and
     asks each. The value is the device's own copy (the pending write or the cache; never the network), read only for the items shown. Null,
     failing or absent: the path, as text.
   - **Security** (audit 157; `DECISIONS.md`, 2 Nov 2026): data/ is written by any pilot, so every text read (a title, a path, an error) goes through
     `esc`; a path is text, never a link; counts are bounded; the launcher's keys are read with `Object.hasOwn`.
   - **For the modules' mark** (« non synchronisé » on a sheet or a mission line): `SogSyncSummary.marks({ pending, status })` gives a `Map path →
     { state: 'pending' | 'changed' | 'toPush', deletion, error, flags }` from the same two reads, whoever supplies them (cases A85).
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
   the end (review of 2a02aedde, line 103). « Mettre à jour » sends back the target « Vérifier » showed
   (`{ channel, target: <sha> }`, 40 lowercase hex digits, 400 otherwise): a plan whose target is no longer that sha —
   after the fetch, then again without fetch just before writing — is refused (`reason: 'changed'`, with the sha found),
   nothing written; the panel then says the channel's version changed and asks to check again (review of 99b4c2a25, line
   105). Without `target`, as before. On `suivi` the branch is fast-forwarded to the commit the plan read itself
   (`rev-parse`), never to the name `origin/<branch>`, which another check's fetch could move meanwhile (line 107). The target is not verified (no
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
   `airline/map_profiles.json`; shown by default; the contract is `INTEGRATION.md` § 4), "Add a pilot" (folds the panel of § 5 open: the one path of enrolment — the file, the link and the QR code, the administrator's steps, the
   message to send; shown on a workstation with a launcher or a device set up on a repository), on a launcher "Remote repository
   of data/" and "Airline API keys (IVAO, EAD Basic)" (panels, § 3 items 6 and 9), then the roadmap, the diagnostics
   and the benches and V2 pages of § 6. There is no separate « Export a configuration » (1 Nov 2026, the user: « deux chemins pour le QR code, le JSON et le
   lien »): « Add a pilot » is the only way to make a configuration; the pilot's single entry, "Join the airline…", is in the Access card.

Under the screen's introduction, the folded "How to use" panel of the Settings chapter (`frame/settings/help/`,
`frame/help/SPEC.md`).

12. **Administrator's assistant** (`#settings?card=assistant`; § 10.36, user, 1 Nov 2026: « il manque une page d'assistant, qui
   prend par la main l'admin »). A card reached by its address, shown alone under « ← Réglages », at any level; reached
   again from a line of the Administration card and from the help. The Maintenance application opens on it as long as the
   airline is not installed — installed = `data/` is a git repository with a remote (the launcher's status) AND
   `airline/settings.json` has a name; the landing is the frame's (V3 Frame), this card only draws. It writes nothing.
   - **At most seven steps and nothing else**: one introductory sentence, then one line per step — a state, one sentence
     saying what the step brings, one button to the existing card (never a copy of a card). The highest step « to do » has
     the primary button.
   - **States**, each read from the real state, never typed: « fait » (`data-state="done"`), « à faire » (`todo`),
     « facultatif » (`optional`, a step that may stay undone), « inconnu » (`unknown`, the state cannot be read here: no
     launcher, a reading refused).
   - **The steps**:
     1. *The data repository* — done when `data/` has a remote (sync-remote) and, for a GitLab repository, the
        administrator's token is set on the workstation (`GET /__setup/secrets`, `gitlab`); button → Administration ›
        Remote repository of data/. The data branch closed to Developers (`GET
        /__setup/gitlab/admin` → `branch.open === false`, V3 Frame c6f3bc38b): to do, said (« les jetons des pilotes ne pourront pas
        écrire »), and the button leads to the pilots' tokens screen, where it opens; the assistant writes nothing.
     2. *The airline* — done when `airline/settings.json` has a name; button → the Website module (Pilot application,
        `./#website`), where the name and the site are set; the administrator's trigram is the device identity (Settings
        › Identity), said in the sentence.
     3. *The aeronautical base* — done when aerodb publishes at least one zone (the status block's « base » line); button
        → `?app=maintenance#data` (zones, Download · Build · Publish).
     4. *The first pilot* — done when at least one project token is active (the count the frame exposes; never a value
        or a name beyond the trigram); the workstation's `GET /__setup/gitlab/tokens/count` (V3 Frame): `{ ok: true, active }` — an
        active token is « fait », none is « à faire »; a refusal or no launcher is « inconnu » with the sentence « quand un pilote arrive »
        (reason `secret`: the sentence says the administrator's token is missing, the first step's matter); button →
        Administration › Add a pilot.
     5. *The devices* — optional; done when a device is paired (the workstation's own access, `c.lan().state().devices`); the relay is
        not readable from the page (no state), so only the paired devices count; button → the workstation's access card
        (`#settings?card=lan`) when the page has one, else the devices screen (`?app=maintenance#devices`).
     6. *The airline's keys* (IVAO, EAD) — optional; done when set (`secrets`); button → Administration › Keys.
     7. *Done* — the status block (`ctx.status.html()`), nothing more.
   - Case A on an empty airline and on a filled one, at 390 and 1280.
7b. **First drawing and the data repository** (SOG-0133, 10 Nov 2026): the screen is drawn **at once**; the read of the data repository (`GET /__setup/sync-remote`: address, branch, state, history rewritten — git on the workstation) does not hold it back. `render` starts
   the read, waits for it **120 ms at most** (`REMOTE_WAIT_MS`: a fast launcher gives the screen as it was), otherwise draws with the last known state (`remoteLast()`, else `gitState = 'pending'`: no door, no remote-repository panel) and, when the answer arrives, paints
   the Access card's line « Dépôt des données : » (fixed height, one line with an ellipsis: the frame's reserve `f-hold` / `aria-busy` shows « … » (rule 22), then the address and branch, nothing moves) and draws the screen once more **if what it deduces changed**, unless an input has the focus (the typed text is not lost: the
   next drawing reads the new state). The join assistant (`join`, `config`, `card=assistant`) decides its access from that repository: it waits for it. Measured by `performance.mark` (`sog-settings-start` → `sog-settings-first`). Case A106.
8. **Company** (SOG-0039, V3_SPECIFICATION § 10.38 step 1; `access.js` part `SogSettingsParts.airline`, case A95): shown at the Full level or by
   `#settings?card=company`. The airlines of `data/airline/index.json` (`{ airlines: [{ code, name }] }`) then « Personnel » (`perso`), each
   line: name, code, networks (the booleans `networks.ivao / vatsim / offline` of its `settings.json`, closed list), fleet count (`fleet.json`
   `aircraft.length`, bounded); four elements, under the seven permitted (the logo and the missions count wait for the readers of the
   other lots). The radio calls `FrameData.setAirline(code)`; the current one (`FrameData.airline().code`) is the checked one;
   **feature-detected**: without `setAirline` every radio is grey and the card says why. « Créer une compagnie » (name ≤ 60 characters, code
   `^[a-z0-9]{2,8}$`, not `perso`, not taken, twenty airlines at most, networks) writes `airline/<code>/settings.json`, an empty `fleet.json`
   and the index (merged by code); a taken code writes nothing. Every file of `data/airline/` is untrusted (§ 10.36): codes by the rule, names
   by `esc`, at most twenty lines. The one-shot migration of today's single airline is the launcher verb `airline/migrate` (`tools/regen/airline.py`,
   case K95), called from this card (below).
   **The card is « Compagnie de cet appareil »** (SOG-0041, step A, § 10.38; case A105; the first version, a « Choisir » button and two toggle buttons per line, was refused at the recipe): a **list of radio buttons**, one line = radio, name, code and a grey line that says the
   **kind in words** (« Commerciale », « Escadrille SO », « Personnel », or « Genre à choisir »), the networks and the fleet count; three elements, no button. The choice applies at the tap (`FrameData.setAirline`) and **nothing of the list is redrawn**: `paintRows` keeps the node of
   a line whose HTML is unchanged (the HTML says nothing of the current state), `markCurrent` moves the checked radio and `data-current`; a line whose words changed (the kind) is the only one replaced. A refused choice (`false`) reads the state again.
   Under the list, the **sheet of the CHOSEN airline** (the others have none), open, nothing to unfold: the **kind** (two radio buttons, « Commerciale » / « Escadrille SO », a sentence each; `va` / `sog`; written in the airline's `settings.json`, the rest of the file kept, same adapter as the other files, `airline/` before the migration for `default`; a kind is
   chosen, never cleared) and the **mission themes** (SOG-0202 T3, § 10.48; `frame/lib/mission_themes.js`, title « Thèmes de missions (n sur 17) »): one box per theme (the acronym and the name), COMMERCIAL first, ticked from the airline's `themes.json` (`cleanThemes`, untrusted) or, without a file, from the kind (`defaultChosen`: va → COMMERCIAL, sog → the sixteen military, no kind and « Personnel » → all seventeen; the sheet says to choose the kind when there is none). Ticking or unticking writes `themes.json` `{ schema: 1, chosen: [ids in the table's order], added (the file's, kept), updated_at, by }`; the last ticked theme cannot be unticked (`themeOne`, nothing written, the box comes back). « Personnel » has nothing to set. The old `categories.json` is no longer read by Settings (the migration of its ids is Features SOG's T2). **Added themes and series** (T3b; case A142): under the list, two **folded** blocks « Ajouter un thème… » and « Ajouter une série… » (`details`, closed at first, each field with its visible label, folded again after the addition; a refusal keeps the form as typed): « Ajouter un thème » (an acronym of 2 to 8 letters or digits, a letter first, which is the id; a name of 1 to 40 characters typed in the language of the screen and copied into the four; eight at most, never an acronym already taken by a theme; **a letter** (SOG-0202, the user: « oui, avec anti recouvrement »; case A149): one A–Z letter proposed by default, `freeLetters(doc)[0]`, refused in words (`themeLetterTaken`, naming the free ones, or `themeLetterNone`) when `takenLetters(doc)` has it — the table's seventeen, M, D, X, another added family — written in `added.themes[i].letter`, the rule re-checked on the file read at the time of writing; a family added before the letters shows a free letter proposed next to its name and « Fixer la lettre », nothing written without that gesture) and « Ajouter une série » (a theme of the list, a name of 1 to 40; the value is the name without accent in the permitted form, the label the name as typed; twenty per theme, never twice in a theme); the added themes come after the table's, ticked on adding and removable (« Retirer », with their series and their place in the choice), the added series are listed under their theme with « Retirer »; every write goes through `writeThemes(env, code, edit)` (the file read and filtered, or the kind's themes; `added` kept), a refusal is said under the sheet and writes nothing; what is typed is text (no `<` `>`).
   **The list is drawn from the index alone, the details after** (SOG-0218; case A140): the lines (radio, name, code) come from `airline/index.json` at once, the grey line (kind, fleet) is an empty line of the same height until each airline's `settings.json`, `fleet.json` and `themes.json` are read (all together, never one after the other) and is then replaced in place; the current airline (`FrameData.airline()`) does not hold the list back.
   **« Rejoindre une compagnie » is an assistant of two steps and an end** (SOG-0041 B4, § 10.38 bis use case 2; case A128), built once like the creation stepper: **the page** (a field « Collez la page de la flotte » + « Lire le presse-papiers », the HTML of what is copied kept when there is some) then **what was read**, shown before anything is written: « n appareils · m opérateurs » (read on this device by the Website module's own parser, `modules/website/model.js` `parseFleet`; the page is cut at 2 MB, 2000 aircraft at most, every field reduced to bounded text), the name (the operator with most aircraft) and the code (from it) proposed and editable, the kind (« Escadrille SO » by default), the networks, the address of the site (optional, https only, kept in `settings.json` so the Website module can refresh later). « Rejoindre » checks as the creation does (an airline **already in the list is not joined again**: the message points to the paste of the Website screen) and writes `settings.json` (kind, site), `fleet.json` (the aircraft read) and the index last, never over an existing file; an interruption says what is done and offers « Reprendre ». The end: « Voler pour cette compagnie » / « Rester ici ». **The count of missions** (B4, SOG-0202; case A128): the step « ce qui a été lu » says how many missions of the registry (`missions/mission_registry.yaml`, read on this device through a read-only adapter) are already at the code typed — `MS.missionsFor(MS.readRegistry(doc), code)` of `frame/lib/mission.js`, Features SOG's rule (a named `airline`, else personal; organisations apart) — « Registre : n mission(s) déjà à ce code », or, with none, where to change a mission's airline (Missions); it follows the code as it is typed (250 ms); a registry that does not read keeps the old line (the missions are in Missions). **Not done**: « Lire par le lanceur » (the page asked by `ctx.net` from an address).
   Below the sheet, **three gestures in this order**: « Créer une compagnie » (the former « Ajouter », a fold), « Rejoindre une compagnie » (the joining assistant, step B4, below), the migration when it applies (below). Everything read is untrusted (the module filters ids, bounds and names; the names are drawn by `esc`).
   **« Créer une compagnie » is a stepper** (SOG-0041 step B1, V3_SPECIFICATION § 10.38 bis; case A125): one block on the same screen, built once (`wizardHtml`), a pane per step shown and hidden, its height never shorter from one step to the next (rule 22), the steps named in its header; the steps are **Identité** (name, code proposed from the first word of the name until it is touched, kind as two radio buttons « Commerciale » preselected, networks), **Catégories de vols** (B2: the base categories of the kind as ticked checkboxes, `wizardCatsBuild`, rebuilt only when the kind changes; a field « Ajouter une catégorie » for the airline's own, same rules as the sheet — 1 to 40 characters, id without accents, never the duplicate of a base category or of one already typed, forty at most — each with « Retirer ») and **Résumé** (« name · kind · networks · n catégories » in words); **Flotte** (B3: « Flotte · n appareils » in its title and its dot; a search over the aircraft sheets of the base, `aerodb aircraft().sheets.list()`, by type or name, eight rows at most; a type chosen then the registration typed — 2 to 10 letters, digits or dashes, once, 200 at most — added to a running list with « Retirer »; « Plus tard » at the same level while the list is empty) and the summary, which also counts the aircraft. The aircraft are written in `fleet.json` normalised by `modules/aircraft/fleet.js` (registration, type of the sheet, variant = its name). « Suivant » checks the step (name ≤ 60, code rule, not `perso`, not taken, no folder already at `airline/<code>/`, twenty airlines at most, a kind) and says the refusal in the block; « Retour » keeps every value. **Nothing is written before « Créer la compagnie »**, then in this order `settings.json` (name, networks, `kind`), `categories.json` **only when it differs from the base** (an unticked category, or an own one: the base without the unticked ones plus the group `virtuel`), the empty `fleet.json`, and **the index last** (an airline is listed only when complete); a file already there is never written again. An interruption says what is done (« les réglages, la flotte ») and what is left, and offers « Reprendre » (never a second « Créer »), which writes only what is missing. The end offers « Voler pour cette compagnie » (`FrameData.setAirline`, then `#missions`) and « Rester ici ». The words of the kind are `KIND_NAMES`.
   **Migrate** (follow-up of SOG-0039; case A102): on the launcher's computer (not a paired device), while the frame's list has `default` (the airline is still at
   the root of `data/airline/`), the card adds a block: an optional code field (`^[a-z0-9]{2,8}$`, empty = proposed from the name), « See what would be done »
   (`regen/job { set: 'airline', verb: 'migrate', args: { dry: true, code? } }`: the name, the code, the files and their size, the fleet said empty, the
   old files kept as a copy), then « Migrate to <code> » (`dry: false`, the code the plan gave). The answer is read as a closed list (code by the rule, file
   names among settings/map_profiles/fleet, sizes as integers, reason among the verb's); a plan without a valid code offers no button; no block without launcher.

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
  { recordFlight, log, fleet, aircraft } }` (from `airline/settings.json`), `data { host, repo, branch, provider, ownerType? }`
  (`ownerType`: `User` or `Organization`, read at export from GitHub's public `users/<owner>`; the repository without its
  credentials: from the remote of `data/` on a launcher, or the device's access), `identity { trigram }`, `usages { devices: true }`, `howto { token { fr, en, de, es } }`.
- **A repository address typed in the Access card is normalised before anything is written** (bug, 31 Oct 2026:
  « framagit.org/asr/flight_planner » typed on a phone was taken for a GitHub repository and the synchronisation failed):
  `SogConfig.normalizeRepo(input, known)` reads « host/account/repo », « https://host/account/repo », « ….git »,
  « git@host:account/repo.git » and ssh:// as one canonical `https://host/path.git`; « account/repo » alone is a GitHub
  repository (a GitHub account has no dot: a first segment with a dot is a host). The provider follows `providerOf` (github.com
  → GitHub; gitlab.com, framagit.org or a GitLab the device's configuration names → GitLab); an incomplete address or an
  unknown provider is refused with its reason, nothing written. The line under the field (`[data-repo-provider]`) says the
  provider and the canonical address while typing; after saving, « Synchroniser maintenant » is the button of the « saved »
  note (never a blocking question: a modal there broke A19's flow). A GitLab host outside the table's public hosts (gitlab.com,
  framagit.org) is accepted and warned under the field (`[data-repo-warn]`): the page without a launcher reaches only the hosts
  its policy allows (`tools/csp_policy.py` CONNECT, 48fc586c2), another GitLab works through the launcher or the relay. Case A61.
- **The provider is chosen, never deduced** (`data.provider`, `github` | `gitlab`, the closed list of `SogConfig.PROVIDER_TABLE`; a
  self-hosted GitLab is `gitlab` with its own `host`). `validate` refuses a configuration without it unless the host is `github.com`
  (the legacy of the configurations exported before 48079d78f, which had no field) and any value outside the list, ×4 "unknown provider:
  github or gitlab", before anything else reads it. The export (`build`, the Administration card) always writes it and never writes
  "other": an unknown source (a remote the device's configuration does not name) is refused with the same message. This aligns Settings
  with the transport (`frame/store/transport_github.js` `clean()`), which knows two cases only: github.com is GitHub; any other
  `https://<host>/…` is a GitLab instance with API `https://<host>/api/v4`, the token going to that host only (the address protection of
  `parseRepo` is unchanged). Without a launcher, a GitLab configuration is therefore applied on the device like a GitHub one (join step 5
  tests the token against the instance's API and saves the access with `provider: gitlab`).
- **A configuration never carries an API address** (security review, line 118: a forged « Join » link would otherwise send the pilot's
  token to another host, or to a service of the pilot's workstation). The API comes from the provider alone: GitHub is
  `api.github.com`; GitLab is `https://<host>/api/v4`, recomputed from `data.host`. `validate`: for GitHub, a `data.api` other than
  `https://api.github.com` — a local address included — refuses the configuration (`field`, `data.api`, "Configuration refused:
  data.api is invalid"); for GitLab, any `data.api` is ignored; nothing is kept in either case. `build` (the export) never writes
  `api`; Join (step 5, without a launcher) passes no received `api` to the transport. A bench that needs a local API sets the device's
  access by its own path, never through a configuration. The transport keeps its own guard (`clean()`, V3 Frame). Case A56.
- **How-to of the token**, from a template per host: GitHub, an **organisation's** repository — a fine-grained token
  limited to the repository (resource owner the organisation, Contents read and write, one year), the organisation
  allowing such tokens; GitHub, a **user's** repository or an unknown owner — a **classic** token, the only kind an
  invited pilot can make for it: prefilled link `https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote`,
  one year, scope `repo` only, with the plain warning that it opens every repository of the account (hence an account
  dedicated to flying); GitLab /
  a GitLab instance — the pilot creates nothing and needs no account: the administrator creates a project access token
  named with the pilot's trigram, role Developer, scope `api` (`write_repository` is for git over HTTP only; the transport
  uses the REST API), 90 days advised and 365 at most, and sends it apart from the configuration link (§ 10.36, 31 Oct
  2026); the pilot pastes it once. A phone reaches gitlab.com directly since the page's policy lists it (48fc586c2); other hosts —
  ask the administrator. Each with the repository's exact address.
- **Export** (the one path, 1 Nov 2026), in the Administration card (Full level) of a workstation (launcher) or of a device set up on a repository: the
  button "Add a pilot" (below) opens a panel that asks the pilot's trigram and the address of the published app (this one when it is published
  over https, else the last one given, kept in `localStorage` `sogFrame:appUrl`), then "Prepare" (the three forms of one configuration, said as such above them):
  `sog-config-<TRI>.json` is downloaded, and the link `<app>#settings?config=<z + base64url of the deflate-raw JSON>`
  (`j` + base64url of the JSON where the browser cannot compress) is shown with "Copy the link". A local address is
  flagged: it opens only on that workstation.
- **Administrator's steps** (GitHub; the GitLab steps are those of « Add a pilot »), listed under the three forms: invite the pilot's account on the repository
  (GitHub: Write role, link to `https://github.com/<repo>/settings/access`; GitLab / framagit: Developer role, link to
  the project's members page), export, then send the link or the file, or show the **QR code** of the link
  (`frame/lib/qr.js`, below the link). The link carries the configuration without its how-to (rebuilt from the template
  at import), so the code stays small (about version 15).
- **Import** (the one entry, 1 Nov 2026): "Join the airline…" at the top of the Access card (always: there is no separate "Import a configuration…"),
  the link (`#settings?config=…`, or the QR code, which the phone's camera reads and which opens that link), and the welcome card of the first
  opening (`#settings?join=1`; `#settings?import=1` opens the same screen). The assistant without a configuration (§ 7) offers, on one screen, a
  field to paste the link (the whole address, or only its `config=` value) and "Choose the file…". The file or link is read
  (256 KB at most, decompressed too) and checked: another schema, a missing trigram or an invalid field is refused with
  a message, nothing changed; only the known fields are kept. A valid one starts the assistant (§ 7).
- **Access the configuration would set**: on a launcher, `data/` already following that repository — nothing (no token
  asked); another repository — not changed, said; no `data/` or a folder without git — clone or take-over by the
  launcher (`/__setup/clone` or `adopt`, user `x-access-token` for GitHub, `oauth2` otherwise, the token as secret,
  remembered; the launcher may ask for confirmation in its window); without a launcher — the device's GitHub transport
  for a GitHub repository ("Test" first; another access already set is replaced only after a question), nothing for
  another host (said: apply it on a workstation).
- **The token a GitLab pilot pastes** is a project access token the administrator created (§ 3 « Add a pilot »: role Developer, scope `api`,
  90 days advised, 365 at most). Before it is accepted (Join, Access card) the page asks the instance who it is (`whoami`): a personal token,
  an expiry missing or beyond a year, rights beyond the transport's are said (§ 7); the token never goes in a configuration, a link or a message.
- **The how-to** of the token starts with the account sign-up (`https://github.com/signup`, or
  `https://<host>/users/sign_up`) and, for GitHub, the invitation to accept (`https://github.com/<repo>/invitations`);
  it is shown wherever the token is asked, in the device's language, falling back to French.

- **Add a pilot** (§ 10.36, the Administration card, `panel: addPilot`, `admin.js` `addPilotPanel`; shown where the export is, same
  `env.xsrc`). For a beginner administrator whose pilot has nothing: one panel from the trigram to the message. Fields: the trigram
  (2–5, A–Z0–9), the pilot's name (optional, only to greet), the language of the message (a select fr / en / de / es, the
  screen's by default) and the app address (as the export). « Préparer » draws, on the same panel: (a) **the configuration link and
  file** of the export, the same function (`makeConfig`, `SogConfig.build`; its outputs: the file, the link, « Copier le lien », the
  QR code), the provider the real repository's, never forced; (b) **the administrator's steps**. For a GitLab repository
  (`SogConfig.kind(xsrc) === 'gitlab'`): with a launcher, a link « Créer son jeton » to `#pilot-tokens?tri=<TRI>` (the
  launcher creates the project access token with the administrator's own, and the screen says when that token is missing; the screen
  fills its trigram field from the address) and, folded, « À la main, sans le lanceur »; without a launcher, the manual steps, open:
  the direct link `<project>/-/settings/access_tokens` (`SogConfig.webUrl`), the values to type (Token name = the trigram;
  Expiration date = today + 90 days, written as a date, 365 days at most, never without one; Role = Developer; Scopes = `api`,
  not `write_repository`: the transport uses the REST API), « Create project access token » then copy the token at once (GitLab shows
  it once), the data branch must let Developers push (Protected branches: « Developers + Maintainers », force push off, else 403),
  how to revoke (Settings › Access tokens › Revoke, on the trigram's line), and the token is sent apart from the message, never
  with the link. For a GitHub repository the steps are today's export steps (invite, create, send), unchanged; (c) **the message to
  send**, in the chosen language (a read-only text and « Copier »): the greeting (with the name if given), the app address, the
  configuration link, « open this link, then paste the token I send you separately ». **Never the token**, in the link or in the
  message. The panel writes nothing more than the export (no document of its own, no token handled); the message rows are read
  by the language chosen, not the screen's. Cases A67 (GitLab, no launcher), A68 (GitLab, a launcher: the link, the screen's
  trigram), A69 (GitHub).

## 6. Administration links (`frame/settings/admin_links.js`, `window.SogAdminLinks`)

- **A declared list**, depending on no module: `{ id, href | act | panel, primary, where, title, text }`, texts in four
  languages. **Every entry is drawn as one button** (rule 18): `href` a link styled as a button, `act` an action of the card,
  `panel` a button that folds open the panel of its line (`edge`, `addPilot`, `remote`, `keys`, written by the settings files;
  a line whose panel is empty is not drawn), `primary` the accent
  colour of the administrator's own pages. `where`: `app` (everywhere), `bench` (a bench or demonstration page served by the launcher: a link only on a
  workstation with a launcher, otherwise a greyed button; its sentence ends with "workstation with launcher
  only"), `v2` (a V2 page of the workstation: shown only when a launcher serves the page), `launcher` (a setting of
  this computer's launcher: shown only when a launcher serves the page).
- **Today**: "Map threshold tuning" `#maps?tune=1` (read only on a phone), "Flight zone limit" (`panel: edge`), "Export a
  configuration for a pilot" removed (1 Nov 2026), "Add a pilot" (`panel: addPilot`), "Remote repository of data/" (`panel: remote`, `where: launcher`), "Airline
  API keys (IVAO, EAD Basic)" (`panel: keys`, `where: launcher`), "Data sources" `#sources` (aerodb's Sources screen, links only; `copyLink`: under its link the absolute address of the screen built from `location`, and "Copy the link"; it replaced the data laboratory `#datalab` on 28 Oct 2026), roadmap `#roadmap`, diagnostics (`act:
  diagOpen`: opens the folded diagnostics of the About card and scrolls to it); benches (`labs/design_primitives.html` left on 11 Nov 2026: `labs/` is archived, SOG-0152)
  `frame/aerodb/bench.html`, `frame/aerodb/offline_bench.html`, `frame/store/test/`, `modules/maps/test/render.html`;
  **no V2 page any more** (SOG-0166, 10 Nov 2026: `maintenance.html`, `premier_lancement.html` and `map_parser.html` buttons removed; the « Anciennes pages (V2) » screen `#legacy` lists them; case A120).
- Paths are relative to the root of the suite; pages outside the app open in a new tab, the app's own addresses in place.
- The Settings chapter's section "Administration" writes the same addresses out.

## 7. Join the airline (`frame/settings/join.js`, `window.SogJoin`)

- **Without a configuration** (the one entry of the Access card, `#settings?join=1`, `#settings?import=1`): the assistant says to paste the link received
  or to choose the file, on one screen — a field for the link (`#settings?config=…`, the whole address, or its `config=` value: read by the same
  reader as an address, `SogConfig.unpack` then `validate`) with "Start", and "Choose the file…". A link that is nothing starts nothing and says so. The QR
  code needs nothing here: the phone's camera reads it and opens the link, which lands in the assistant. Case A73.
- **One screen per step**, "Step n of m", "← Back" / "Next →": (1) the configuration received — airline, repository,
  trigram; (2) the account — "Do you already have a GitHub account?" Yes / No; No lists creating it (sign-up link, a
  simple username, verifying the email); then the username (needed to go on); (3) the invitation — give the username to
  the administrator ("Copy my name"), accept the email invitation (`https://github.com/<repo>/invitations`), a box
  "Invitation accepted" (the access can only be checked once the token exists); GitLab / framagit: added as Developer;
  (4) the token, step by step — GitHub, user's repository: the prefilled classic-token link, one year, `repo` only, copy
  at once, and the warning on its account-wide reach (also said at step 2); organisation's repository: the fine-grained
  token page, the organisation as owner, only the repository, "Contents: Read and write"; GitLab: personal token with
  `api`; the airline's how-to folded below; a box "Token copied"; (5) paste and "Test" — 404: invitation not accepted or repository not chosen in the token; 401:
  copied wrongly or expired; 403: no right — `repo` box (classic) or Contents (fine-grained); both token forms
  accepted; offline said; checked: the access is saved (another one
  replaced only after a question); on a workstation, "Clone with the token" (launcher); (6) IVAO, VATSIM, SimBrief,
  optional, saved with the trigram; (7) "Finish and synchronise" — usages, first synchronisation, airline if the
  repository has none — then "Offline data", "Prepare a flight" and the tutorial.
- **A GitLab configuration** (`SogConfig.kind(cfg.data) === 'gitlab'`, any access: the device's `github` transport, or a launcher's `clone` / `adopt`;
  § 10.36 part 3): the steps are **1, 5, 7** (`stepsFor(access, data)`). The pilot has no GitLab account and creates nothing: the
  administrator made a project access token (« Ajouter un pilote », § 5) and sent it apart from the link. No account, no invitation, no
  token to create (the GitHub steps 2 to 4, their GitLab variants are gone), no IVAO / VATSIM / SimBrief step (the pilot fills them later in
  Settings › Identity). Step 1 is unchanged. **Step 5 « paste the token received from the administrator »**: the trigram read from the
  configuration (shown, never typed), the token field, then « Test » (the device) or « Clone with the token » (a workstation), exactly as for
  GitHub. When it succeeds the step writes what step 6 wrote of the identity — `device/identity.json`, the configuration's trigram —
  and nothing else (IVAO, VATSIM and SimBrief stay the device's). Step 7 finishes as before. **The token says what it is** before it is
  accepted, on both accesses: `FD.gitlab(…).whoami()` → `{ bot, username, scopes, expiresAt }` from the page to the instance (the CSP
  allows gitlab.com and framagit.org; on a workstation the clone itself is the launcher's). `bot !== true` (a personal token) is a QUESTION,
  « Personal token: it works for all your projects; prefer a project token asked from the administrator. Continue anyway? » — No keeps
  nothing, Yes goes on. An expiry missing or more than 365 days away, and scopes beyond `api`, `read_api`, `read_repository`,
  `write_repository`, are warning lines in the step's message, not blocking. A failed reading says what a failed test says (offline,
  401, 403, 404). The same function (`tokenWarnings`, kit.js) serves the Access card (§ 3): there a personal token is a warning, never a
  question (the user alone with their own repository needs one). Cases A70, A71, A72; the GitHub steps are those of A56.
- **Kept on the device** (`device/join.json`, cache policy): the configuration (no secret), the step, the boxes, the
  account answer and the username — never the token. A settings card offers to resume; "Give up" (asks) stops it
  without undoing anything.
- **Steps skipped**: 2 to 5 (2 to 4 for a GitLab configuration: the token is pasted) when the access is not set here — the launcher's `data/` already follows this repository
  (or another one), or a host the device cannot reach without a launcher (GitLab / framagit on a phone, said at step 1).
- No screenshots of the host's own pages: the steps give its direct links and exact labels.

## 8. Files of the screen (refactor R-S9)

Card builders stay apart from their actions; no rule changes place without the case that pins it, every text stays the same
and the order of the cards does not change. Classic scripts, loaded in order by the frame (`frame/app.js` `LAZY.settings`)
and kept by its service worker (`frame/sw.js`), each one registered in `window.SogSettingsParts`.

- `settings.js`: the screen. `render` reads the context once (`env`: identity, usages, launcher, access, preferences, the
  remote of `data/`, level, card asked by the address), routes to « Rejoindre la compagnie » when the address asks it, puts
  the cards in their order, places the page, paints the live state and hands every gesture to `actions.js`; it builds no card
  of its own.
- `cards.js`: the device's cards, one builder per card (`(env) → html`, empty when the card is not shown at that level or for
  that address): refused configuration, join to resume, V2 import, identity, level, design, usages, backup, the import row
  of a configuration (placed at the head of the Access card), offline data, IVAO account, weather key, Little Navmap sheets. It draws only: no listener, no write, no call to the launcher.
- `actions.js`: the gestures of the screen. The click dispatcher and the field listeners (design, tone, level, usages,
  files), the backup's export and import, a configuration file picked; it draws nothing but messages and asks `render` again.
- **`render` in pieces (lot 2)**: the configuration and Join routing (`?config=`, `?join=`, `?import=`), the placing of
  the page and the live painting of the offline zones (`paintZones`) are functions of their own in `settings.js`, called by
  `render` in the same order; the card builder of the V2 settings is `v2Import`, no longer the name of `env.v2`.
- **Shared texts (lot 2)**: one key per meaning. A row used by two files or more lives once in `kit.js` (`T`, the shared
  table `window.SogSettingsT`) and the files read it from there; `join.js`, `devices.js` and `pilot_tokens.js`, which have
  their own table, read the shared rows from the kit too. Two keys are one meaning when their rows are equal in the four
  languages (checked by a script); equal in French only, they stay apart (« Reprendre » the assistant is not « Reprendre »
  the V2 settings in English). A key of the shared table is defined in one file only: today a key defined twice is decided by
  the load order (the last file wins), so the merged row keeps the text the screen shows now. The cases that read a text
  with `tx(file, key)` follow it to its file and key.
- The other parts are unchanged by this lot: `kit.js` (helpers and shared texts), `launcher.js`, `access.js`,
  `diagnostic.js`, `admin.js`, `groups.js`, `config.js`, `join.js`, `admin_links.js`.

   **« Reprendre cette compagnie »** (SOG-0235; case A144): when the code typed at step ① has its folder (`airline/<code>/settings.json`) but the airline is missing from the list, the message says so and a button « Reprendre cette compagnie » (`companyAdopt`) puts it back in `airline/index.json` — **only the index is written** (the name read from the folder's `settings.json`, as text, 60 characters), the folder is left as it is — instead of « choisissez-en un autre ».
