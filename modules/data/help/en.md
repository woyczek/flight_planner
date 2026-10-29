# Data

What the airline publishes for the app — the aeronautical base, the procedures, the aircraft, the weather — and the state of each data set. This screen is for reading, and offers two actions: Build the aeronautical base, then Publish it; it downloads nothing.

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

<a id="data-build"></a>**Build the base.** At the top of the Aeronautical base group, the "Build the base" panel rebuilds the base of the ticked zones on this workstation's launcher: a windowless browser (Edge, else Chrome) builds the zones one after the other, and each one is saved to the data repository as soon as it is ready. Every zone of the coverage is ticked at the start; untick the ones you do not want to redo. The button is grey with its reason written below: "The workstation launcher is needed", "Another operation is running", "Tick at least one zone", "Offline".

<a id="data-build-personal"></a>**Personal-licence sources.** ENAIRE (Spain), NATS (United Kingdom) and the X-Plane data are offered only when a ticked zone uses them, and are never ticked by default: tick them only if the data repository is used by you alone. With X-Plane ticked, the build runs in the page, which is not yet possible here: it will stop with that reason.

<a id="data-build-run"></a>**While it builds.** A bar, "n of m zones", the step and the elapsed time; one line per zone says waiting, building (n / m sources), built, failed with its reason, or cancelled. "Stop" asks for the stop: the zone in progress finishes, the zones already built are kept. You can leave the screen: the build goes on in the launcher and is found again when you come back. If the launcher stopped on the way, the screen says "Build interrupted" with the last state of each zone: start again, unticking the zones already done if you like.

<a id="data-build-end"></a>**At the end.** A notification gives the counts ("Base built: 3 zones; 1 failed (gb)") and the summary stays in the panel with what to do: a failed zone (the reason is written on its line: windowless browser, time limit, invalid output, could not write…), a stopped build, no browser found ("Neither Edge nor Chrome was found on this workstation: install one of them."). The state of the lines is read again afterwards.

<a id="data-publish"></a>**Publish the base.** Under "Build", the "Publish the base" panel sends what was built on this workstation to the data repository. It first says where the workstation stands: "3 files changed · 2 commits to send", the date of the last pass and, if there is one, the merge waiting in data/ (publishing concludes it first). Tap "Publish": one question recalls the files and the commits, then the pass runs; an endless bar shows that it is working. Meanwhile "Build" is grey, and "Publish" is grey during a build: one operation at a time.

<a id="data-publish-end"></a>**At the end of the publication.** A notification gives the counts and the result stays in the panel: what was sent (files committed, files received); the files of the base kept on the workstation because a build was under way; the conflicts (the most recent is kept, see Settings › Conflicts); the files refused because they are not in the format of a data file. A failure says so in one sentence, with what the launcher answers: nothing is lost, the files stay on the workstation. The button is grey with its reason written below: "The workstation launcher is needed", "A build is running: publish when it is finished", "Nothing to publish", "The frame cannot publish the base yet: update the app", "Offline".

<a id="data-journal"></a>**The journal.** At the foot of the screen, the last 50 operations of this device: UTC time, verb, zones, result.

## Special cases

- **Without a launcher**: the screen reads the same way; it shows what is published.
- **A read that fails**: the section says so in one line, the rest of the screen is drawn.

<!-- fr: 3fb8c32d95cd -->
