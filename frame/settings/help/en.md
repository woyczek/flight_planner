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
the network; “Synchronise now” sends and receives at once. Otherwise it runs by itself at start, every 10 minutes
online and when the network comes back.

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
GitHub, unfold “Export a configuration for a pilot…” in the “Data access” card. Type the pilot's trigram and the address
of the published app, then “Create the file and the link”: the file sog-config-<TRI>.json is saved and the link is
shown, ready to copy. They hold the airline, the data repository, the trigram and how to create the token, never a token
or a secret.

**Applying the configuration (pilot).** Tap the link you received, or “Import a configuration…” in the “Data access”
card (the welcome card of the first opening leads there too). The “Configuration received” card shows the airline, the
repository and the trigram. Add your IVAO, VATSIM and SimBrief IDs if you wish, then the token: the how-to, folded
below, says how to create it on the repository's host. “Test” checks the access; “Apply” checks it again, sets the
identity, the usages and the access, then runs a first synchronisation. Then keep the area of your flights offline (“Go
to offline data”).

**Nothing more than the file.** Only what the configuration holds is set, and nothing is written if the token is
refused; a file in another format is refused with a message. The airline is written to the repository only if it has
none yet. On a workstation whose data/ already follows this repository, the access does not change. Without a launcher,
the app only reaches a GitHub repository: for a framagit or GitLab repository, apply the configuration on a workstation
with the launcher.

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

<!-- fr: dcfd5f72ab89 -->
