# settings — specification (regeneration prompt)

The settings screen of the V3 frame: everything a device needs to know about itself. It is part of the frame, not a
module, because it sets the transport and the device token, which modules never touch. Reading of V2:
[READING.md](READING.md); decisions: [DECISIONS.md](DECISIONS.md); how the frame mounts it:
[INTEGRATION.md](INTEGRATION.md).

**As a prompt**: give this document, `frame/SPEC.md` and `frame/INTEGRATION.md`, and ask for one classic script
`frame/settings/settings.js` defining `window.SogSettings.render(view, context)`. Every rule below is a requirement.

## 1. Screen

- Address `#settings` (the old `#device` shows the same screen); opened by the ⚙ button of the header.
- One column of short cards, phone first: no horizontal scroll at 375 px, touch targets of the frame (44 px).
- **Each card is saved on its own** (its own button, or at once for a checkbox); no global "Save".
- A wrong value is said inside its card, never in a native dialog; questions use the frame's `ask`.
- Texts are `[fr, en, de, es]` rows through the frame's `t` (French typography included).
- Seven cards at most on screen; the diagnostics are a folded block at the bottom.

## 2. Device files (policy `cache`, never synchronised)

| File | Content |
|---|---|
| `device/identity.json` | `trigram` (2–5 letters or digits, upper case), `ivao` (digits), `vatsim` (digits), `simbrief`, `updated_at` |
| `device/level.json` | `level`: 1 (discovery), 2 (everyday, the default), 3 (full); `updated_at` |
| `device/usages.json` | `devices`, `users`, `backend` (booleans), `single` (true when none of them is ticked), `updated_at` |
| `device/settings.json` | `v2`: `taken` or `declined` once the V2 take-over was answered |

After each write the frame's `reload` is called: the transport and `ctx.identity` follow at once.

## 3. Cards

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
6. **Data access** (always): on a launcher, one sentence (no token here), then the **remote repository of `data/`**
   (`GET /__setup/sync-remote`: `repo`, `remote`, `url`, `branch`, `default`): the current address and branch (a
   branch that is not a branch name is left out), or "no remote repository: nothing leaves this workstation"; an
   address field (current address, else the configuration's default), "Check" (`POST { url }`: does it answer) and
   "Save" (`POST { url, save: true }`; another repository than the current one is confirmed in a window the launcher
   opens on the computer, as in V2's first start). Never blocking: the check's report stays in the card after a save.
   When `data/` is not a git repository: one sentence (nothing leaves this workstation) and a link to the help section
   "A git repository for data/". On the Usages card, "Several users" ticked with no remote shows a warning pointing to
   this card, and the state sentence says "a git repository with no remote: nothing goes elsewhere". Without an exchange, a hint says the access then only reads the aeronautical and aircraft bases published in
   the data repository, nothing is sent (the frame's local transport with the GitHub repository as reference source). Otherwise repository, branch and
   token; the token field is always empty, its placeholder says a token is saved, an empty field keeps it. Hint: a
   fine-grained token on this repository only, Contents read and write, 90 days at most, never pasted in a message.
   "Save", "Test" (the branch head through the transport; offline said as such) and "Cut access" (asks, then
   the context's `cutAccess`; pending writes stay queued).
7. **Synchronisation** (an exchange ticked): last success, pending writes, network, last error, kept live through
   `onStatus`; "Synchronise now" (the frame's `syncNow`); a link to the conflicts screen when there are some.
8. **Offline data**: aeronautical bases (`aerodb.status()`: published zones, zones open on this device, cycle), the
   browser storage (`navigator.storage.estimate`), then one row per published zone through `aerodb.offline`
   (`frame/aerodb/INTEGRATION.md` § 4): its name in the application's language, its state on this device (not here,
   partly here, kept offline, unknown), cycle, kept and published sizes; "Keep offline" (progress shown in the row, a
   notification with the size read or the files not read) when the zone is not complete, "Free" when it has copies and
   the frame can evict; a last row for the aircraft base (state, number of types). A hint says keeping downloads the
   whole zone, preferably on Wi-Fi. With no launcher and no access set, a warning says the device has no base and
   gives the two ways in: set the access above, or publish the bases from a workstation with the launcher.
9. **Launcher keys** (page served by a launcher only): the IVAO API key's state (`GET /__setup/secrets`: saved with
   its last characters, given by the launcher's environment, or missing), a new key (empty: unchanged), "Save",
   "Test" (`/__setup/secrets/test?service=ivao`), "Erase" (asks). The key goes to the launcher's `secrets/` folder,
   never to the browser nor to the data.
10. **Diagnostics** (folded): transport, status, usages, launcher, repository (never the token), aerodb state,
   storage, network, browser; "Copy".

Under the screen's introduction, the folded "How to use" panel of the Settings chapter (`frame/settings/help/`,
`frame/help/SPEC.md`).

## 4. Invariants

1. No token or key is ever shown, written to a file, exported or put in the diagnostics.
2. "Alone on this device" is never a box that contradicts another one.
3. A device setting is never synchronised.
4. Nothing on this screen blocks: offline, every card still draws from the device.
