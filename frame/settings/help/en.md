# Settings

The settings of this device (⚙ at the top of the screen): your identity, what the app shows you, how data are
exchanged, and what the device keeps offline. They stay on the device, never synchronised.

## How to use

**Your identity.** In “Identity”, type your trigram and your IVAO VID, VATSIM CID and SimBrief IDs, then “Save”. The
tools use them to prefill; with several users, the trigram is needed.

**The level.** “Level” chooses what the menu shows: Discovery, Everyday or Full, with one tap. Under each choice, the
“Menu:” line says which tools it shows; a hidden tool stays reachable by its address.

**The design.** “Design” shows one thumbnail per look — Standard, Cabinet, Rugged — and the tone: Automatic (as the
system), Day or Night. One tap applies it at once, on this device only.

**The usages.** The sentence at the top of “Usages” says how data are exchanged. With no box ticked you are “Alone on
this device”: nothing goes elsewhere. Tick “Alone, on several devices” or “Several users (git data repository)” to
exchange. On a workstation served by the launcher, the app already reads and writes the launcher's `data/` folder, even
with no box ticked; an exchange usage also shares it through git.

**Data access.** On a phone or on the website, set in “Data access” the repository (account/repository), the branch and
your personal token, then “Test” and “Save”. On a workstation served by the launcher there is no token: the card
shows the remote repository of `data/` (see “A git repository for data/”).

**No access and no launcher, no bases.** A device with no access set and no launcher — the website opened on a phone
for the first time, for instance — has neither the aeronautical base (airspaces, airfields, beacons) nor the aircraft
base: “Offline data” says so. Two ways in: set the access to the data repository, even without ticking an exchange (it
then only reads the bases); or, on a workstation with the launcher, publish the bases to the repository (V2: Settings ›
Maintenance › Aeronautical data and Aircraft types), then synchronise.

**Synchronisation.** With an exchange ticked, the “Synchronisation” card gives the last success, the pending writes and
the network; “Synchronise now” sends and receives at once. Otherwise it runs by itself at start, every 10 minutes online
and when the network comes back. While writes are waiting, the card lists them, newest first: path, module and time, ✕
for a deletion, with the last error if there is one.

**The backup.** Alone on this device, “Export (one file)” keeps all your data in a file: it is the only copy. “Import
(merge)…” takes it back without losing anything here; “Replace from a file…” first erases what is on the device.

**Offline data.** Each published zone has its row: its state on this device, its cycle and its size. “Keep offline”
downloads it whole (preferably on Wi-Fi); “Free” gives the space back.

## The weather key

METAR works without a key. TAF, on a device without a launcher (phone, website), needs a personal and free avwx.rest
key: “Create a key on avwx.rest ↗” opens the provider's page. Paste it in “Weather key (TAF, avwx.rest)”, then “Save”;
“Test” asks for the TAF of an airfield, “Erase” removes it. The key stays on this device only, never in the repository
nor in a backup, and is never shown again. On a workstation served by the launcher it is not needed: the launcher
provides the TAF.

## Little Navmap sheets

On a workstation served by the launcher, the "Little Navmap sheets (.lnmperf)" card links your performance sheets
with the .lnmperf files of a folder, both ways. Choose the folder (Little Navmap's is offered when found), then
"Save". After that, nothing to do: a sheet changed in Fuel rewrites its file, a file changed in Little Navmap updates
the sheet, a new file becomes a sheet. If the same value changed on both sides, the newest wins and the other stays
kept in the sheet; the synchronisation button says so. A file is never deleted: the file of a removed sheet goes to
the `_removed` subfolder. "Synchronise now" runs a pass at once, "Stop" cuts the link. Sheets missing a value that
Little Navmap requires are listed and not written. On a phone, Fuel downloads the sheet as a .lnmperf file.

## Launcher keys

On a workstation served by the launcher, “Launcher keys” sets the IVAO API key: it stays in the launcher’s `secrets/`
folder, never in the browser nor in the data. “Test” checks that IVAO answers; “Erase” removes it.

## The tablet next to the simulator

You fly on the computer (X-Plane) and want the map on a tablet or a phone: on the computer served by the launcher,
“Computer access” opens the Pilot application to devices of the same local network (or start `lancer.cmd --lan`).

1. **Open to devices of the local network**: the card shows the address to open on the device, its QR code and a
   6-digit pairing code. Windows may ask to allow Python: accept for private networks only.
2. On the tablet, scan the QR code with the camera (or type the address), then enter the code. It is asked only
   **once per device**.
3. The tablet then sees the computer's data, the simulator's position in the flight badge, and “Launcher on
   <computer>” at the top.

- **Trusted network only**: everything goes over http, unencrypted. At home, yes; on public or hotel wifi, never.
- Access closes with the launcher, or with “Close access”. A paired device stays paired; “Forget the devices” asks
  them all for a code again (a lost tablet, for instance).
- On the tablet, the application does not work offline and does not use its GPS: the browser grants them only over
  https. The position comes from the computer's simulator.
- A code works only once and lasts 10 minutes: “New code” gives another. 5 wrong codes from one device: a
  one-minute wait; 30 in an hour: pairing closes until the next “New code”. “Forget”, next to a device, removes
  that one only.
- Only the computer's main address is opened; the others (VPN, virtual machines) only through “Open them too”.

## A git repository for data/

On a workstation served by the launcher, “Data access” shows the remote repository of `data/`: its address and its
branch. To set or change it, type the address (`git@host:account/repo.git` or `https://…`, with no password or token
in it): “Check” says whether the repository answers, “Save” sets it. Towards another address than the configured one, a Yes / No window opens on the computer, not in the page: the card says so before the click; answer it (it may be behind other windows), then come back. Refused, closed or already open: the card gives the reason and `data/` stays as it is. This is on purpose: a malicious page must not be able to send your data elsewhere. Nothing blocks: a repository that does not answer is
only reported.

- **Access to the repository** is set on the computer: an SSH key for a `git@…` address, credentials stored in Git for
  an `https://…` address.
- **Several users through git** need this remote repository: without it, the “Several users” box leads nowhere, and
  the “Usages” card says so.
- **data/ missing or without git**: the card opens a door. `data/` is a folder ignored by the code repository; it
  becomes its own git repository, linked to the data repository (not a submodule). Type the address of the data
  repository, and if needed a username and a password or token (never kept by the page; “Remember” hands them to Git on
  this computer). Without `data/`, “Fetch the data” clones it; with a `data/` without git (example data or archive),
  “Take data/ into this repository” links it to the repository. The card follows the work and reads the state again at
  the end; a failure is explained, nothing is lost.

## Configuring a pilot

**Preparing the configuration (administrator).** On a workstation served by the launcher, or on a device set up on
GitHub, unfold “Export a configuration for a pilot…” in the “Data access” card: it lists your steps in order. First
invite the pilot's GitHub name to the repository, with the Write role (the link leads to the repository's collaborators
page). Then type their trigram and the address of the published app, and “Create the file and the link”: the file
sog-config-<TRI>.json is saved, the link and its QR code are shown. They hold the airline, the data repository, the
trigram and how to create the token, never a token or a secret; the repository's owner (user or organisation) is noted
in them, and decides which token to create. Send the link or the file, or have the pilot's phone scan the QR code.

**Joining the airline (pilot).** The link, the QR code, “Import a configuration…” or “Join the airline…” (“Data access”
card) and the welcome card of the first opening open the “Join the airline” assistant, one screen per step: the
configuration received; the account (create it if needed, with the sign-up link) and the username; the invitation to
accept; the token, step by step (classic for a user's repository, fine-grained for an organisation's); the token pasted
and tested; the network IDs; and last “Finish and synchronise”, then the offline data. Ticked boxes stay on the device:
a settings card offers to resume where you left off. The “Join the airline” tutorial follows the same steps.

**Nothing more than the file.** Only what the configuration holds is set, and the access is saved only once the token is
tested; “Test” says what is wrong: invitation not accepted yet, token copied wrongly or expired, token without the right
on the contents. A classic token opens all the repositories of the account: for a user's repository, a GitHub account
dedicated to flying is advised. A file in another format is refused with a message. The airline is written to the
repository only if it has none yet. On a workstation whose data/ already follows this repository, the assistant skips
the account and the token. Without a launcher, the app only reaches a GitHub repository: for a framagit or GitLab
repository, set the access on a workstation with the launcher.

## Administration

**The administration pages.** At the “Full” level (“Level” card), the “Administration” card, below “About”, gathers the
administration and test pages, each with a sentence; at the other levels, it does not appear. In the app: the map
threshold tuning (`#maps?tune=1`, read only on a phone), the roadmap (`#roadmap`) and the diagnostics of the “About”
card.

**The benches, on a workstation.** Served by the launcher, they only open on a workstation with a launcher (elsewhere
they are named without a link); paths relative to the root of the suite: `labs/design_primitives.html` (primitives and
designs), `frame/aerodb/bench.html` and `frame/aerodb/offline_bench.html` (aeronautical base, online and offline),
`frame/store/test/` (data layer, against the fake GitHub) and `modules/maps/test/render.html` (map rendering).

**The workstation's V2 pages.** Shown only when a launcher serves the page: Settings › Maintenance
(`apps/settings/maintenance.html`), First launch (`apps/settings/premier_lancement.html`) and the map studio
(`apps/cpco/map_parser.html`).

## Good to know

- **The token**: a fine-grained token from github.com, on the data repository only, “Contents” read and write, 90 days
  at most. It is never shown again; never paste it in a message.
- **Cut access**: erases the token from this device; your pending writes stay and will leave once access is set again.
  Lost or stolen phone: also delete the token on github.com.
- **V2 settings**: if this browser was already used for V2, the “V2 settings found” card offers once to take over your
  identity and your access.
- **About**: links to this help and to the roadmap (what is delivered, in progress, planned), then the
  diagnostics, folded: transport, last sync, errors, repository tree, reference bases and aeronautical base, line by
  line; “Copy” puts it all on the clipboard, to paste in your message to report a problem. The token is
  never in it.

<!-- fr: 690a6cb3e469 -->
