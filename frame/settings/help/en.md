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
your personal token, then “Test” and “Save”. On a workstation served by the launcher there is nothing to set: the
launcher takes care of it.

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

## Good to know

- **The token**: a fine-grained token from github.com, on the data repository only, “Contents” read and write, 90 days
  at most. It is never shown again; never paste it in a message.
- **Cut access**: erases the token from this device; your pending writes stay and will leave once access is set again.
  Lost or stolen phone: also delete the token on github.com.
- **V2 settings**: if this browser was already used for V2, the “V2 settings found” card offers once to take over your
  identity and your access.
- **Diagnostics**: folded at the bottom of the screen; “Copy” puts it on the clipboard to report a problem. The token is
  never in it.

<!-- fr: 69c8dc337c1f -->
