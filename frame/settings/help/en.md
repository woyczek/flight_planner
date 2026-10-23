# Settings

The settings of this device (⚙ at the top of the screen): your identity, what the app shows you, how data are
exchanged, and what the device keeps offline. They stay on the device, never synchronised.

## How to use

**Your identity.** In “Identity”, type your trigram and your IVAO VID, VATSIM CID and SimBrief IDs, then “Save”. The
tools use them to prefill; with several users, the trigram is needed.

**The level.** “Level” chooses what the menu shows: Discovery, Everyday or Full, with one tap. Under each choice, the
“Menu:” line says which tools it shows; a hidden tool stays reachable by its address.

**The usages.** The sentence at the top of “Usages” says how data are exchanged. With no box ticked you are “Alone on
this device”: nothing goes elsewhere. Tick “Alone, on several devices” or “Several users (git data repository)” to
exchange.

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

## Launcher keys

On a workstation served by the launcher, “Launcher keys” sets the IVAO API key: it stays in the launcher’s `secrets/`
folder, never in the browser nor in the data. “Test” checks that IVAO answers; “Erase” removes it.

## A git repository for data/

On a workstation served by the launcher, “Data access” shows the remote repository of `data/`: its address and its
branch. To set or change it, type the address (`git@host:account/repo.git` or `https://…`, with no password or token
in it): “Check” says whether the repository answers, “Save” sets it. Towards another repository than the current one,
the launcher asks for confirmation in a window on the computer. Nothing blocks: a repository that does not answer is
only reported.

- **Access to the repository** is set on the computer: an SSH key for a `git@…` address, credentials stored in Git for
  an `https://…` address.
- **Several users through git** need this remote repository: without it, the “Several users” box leads nowhere, and
  the “Usages” card says so.
- **data/ is not a git repository** (example data or archive): nothing leaves this workstation. To make it one, run
  V2's first start again with the address of the data repository (it clones `data/`), or, with the launcher closed,
  clone the data repository into `data/` yourself.

## Good to know

- **The token**: a fine-grained token from github.com, on the data repository only, “Contents” read and write, 90 days
  at most. It is never shown again; never paste it in a message.
- **Cut access**: erases the token from this device; your pending writes stay and will leave once access is set again.
  Lost or stolen phone: also delete the token on github.com.
- **V2 settings**: if this browser was already used for V2, the “V2 settings found” card offers once to take over your
  identity and your access.
- **Diagnostics**: folded at the bottom of the screen; “Copy” puts it on the clipboard to report a problem. The token is
  never in it.

<!-- fr: 151f4632fce5 -->
