# Data

What the airline publishes for the app — the aeronautical base, the procedures, the aircraft, the weather — and the state of each data set. This screen is read only: it downloads, builds and publishes nothing.

## How to use it

<a id="data-cycle"></a>**The cycle in force.** At the top, the current AIRAC cycle (for example 2610), its dates and the number of days before the next one. Below, "Launcher of this workstation" or "No launcher: read only" says whether this computer has a launcher.

<a id="data-coverage"></a>**The coverage.** The list of zones (countries, regions) this workstation follows. On the first opening it holds every zone the airline publishes; the list is kept on this device.

<a id="data-states"></a>**The States.** Under the coverage, the States are sorted by colour: green, procedures are already published; orange, they can be read on demand; red, nothing is readable. The reason is written on each line, the colour is never alone. Beyond seven lines, "n more" unfolds the rest.

<a id="data-group-base"></a>**Aeronautical base.** One line per source that feeds a zone of the coverage: its cycle, its age ("published 3 days ago"), the number of zones published and a state badge. Tap a line to see the source's link with its address, its licence, the zones it feeds and what each zone has published.

<a id="data-group-proc"></a>**Procedures.** The procedures of France (SIA eAIP) and of the United States (FAA CIFP), with the number of aerodromes published.

<a id="data-group-aircraft"></a>**Aircraft.** The aircraft types and their performance: the edition date, the number of types and of files. After 28 days the badge turns orange.

<a id="data-group-weather"></a>**Weather.** The world weather and the NAT tracks are published with the website: these lines have neither a cycle nor a badge.

<a id="data-states-pill"></a>**The badges.** "Up to date": nothing to do. "Cycle out of date": the published cycle is older than the cycle in force (orange, red after a week). "Old parser": published by an older version of the builders. "Over 28 days old": a set without a cycle, published more than 28 days ago. "Not in the repository": nothing is published. A group opens by itself when one of its lines needs attention.

<a id="data-more"></a>**The other data sets.** At most seven lines per group; "n more data sets" unfolds the rest and the sources that are only considered or set aside (their link, licence and status).

## Special cases

- **Without a launcher**: the screen reads the same way; it shows what is published.
- **A read that fails**: the section says so in one line, the rest of the screen is drawn.

<!-- fr: 71da719b10a1 -->
