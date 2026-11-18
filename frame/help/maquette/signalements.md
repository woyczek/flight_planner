# Mock-up: « Signalements », the list (SOG-0410)

Files: `signalements.html` (stand-alone; four buttons at the top: the list, a search, the sheet of one report, the pilot side) and the captures
`signalements_{liste,recherche_texte,fiche,pilote}_{390,1280}.png`. Address on the workstation:
`http://127.0.0.1:8000/frame/help/maquette/signalements.html` (the launcher serves the repository). The reports shown are invented, modelled on real ones.

## What it shows
- **The list**: ONE search field; groups **Maintenant / Ensuite / Plus tard / À classer**, seven rows at most per group, « Voir les n suivants » for the rest. A row: kind, title, state
  (colour AND words: yellow « Sans fiche », blue « Fiche SOG-nnnn », green « Fait », red « Refusé » — the colours the user asked for in his report of 14 Nov, SIG-18c25190d3), date, screen, priority.
- **The search**: case- and accent-blind, every word must be found (as a beginning of a word), in the title, the text, the screen and the title of the linked card (`SOG-0409` also works);
  result in two groups, « Signalements » and « Fiches », the found words marked. A search that finds nothing says « 0 sur 53 » (the list was read).
- **The sheet of a report**: kind, state, title, the noted context (screen, size, design, language, version), the text, the **linked card** (state, link to the Roadmap), the **priority** and the **comments**.
- **Priority in two simple axes** (the user's double choice, SOG-0410): *Gravité* (Bloquant / Gênant / Mineur) and *Fréquence* (Toujours / Souvent / Rare), two rows of three buttons, the result in words.
  The group follows from them (the table is question 2 below); a report with no choice is in « À classer ».
- **Pilot side**: « Mes signalements » only (his own, from the device and from the company repository), no priority, no one else's; his comment leaves with the next grouped send.

## What is read from where
| What | Where | Who writes |
|---|---|---|
| the workstation's reports (text, kind, screen, context, `state`, `fiche`, images) | `organisation/SIGNALEMENTS.json` through the launcher verb `signalement/lire` (to extend: the whole list, paged, searched on the launcher's side) | the ergonomist's file: **read only** here (`signalement/ajouter` appends, never rewrites) |
| a pilot's reports | `pilot/<tri>/signalements/<SIG-…>.json` of the data repository (already read by `signaler.js`, `loadPilots`) | the pilot, one file per report |
| the linked card (title, state) | `frame/help/roadmap.json` (already loaded by `roadmap.js`) through `state: 'fiche'` + `fiche: SOG-nnnn` of the report | the ergonomist |
| the priority (gravité, fréquence) and the comments | **new** `organisation/SIGNALEMENTS_NOTES.json` `{ items: { SIG-…: { gravity, frequency, comments: [{ id, at, by, text }] } } }` | a new launcher verb (`signalement/noter`, `signalement/commenter`), same guard as `signalement/ajouter`: closed lists, 2 000 signs, no control character, atomic write, 1 000 entries at most |

A comment is written **where the report is written**: from the workstation, by the verb; from a pilot's device, as a report linked to the first one (`about: SIG-…`, a closed shape) under his own
`pilot/<tri>/signalements/` — so no new path, no new right, no conflict (one writer per file).

## Third-party text
Every text of a report or a comment (title, text, comment, pilot's folder, card title) is an **untrusted input**: bounded (80 / 2 000 signs), control characters removed, shown by `esc()` as text only
(`textContent` or escaped), never as HTML, never as a link; the screen and the kinds are closed lists; a linked card is found by its `SOG-nnnn` in the roadmap, its title comes from `roadmap.json`, not from the report.
The search runs on the launcher's side on the stored text and returns bounded excerpts (240 signs).

## The latency the user was looking for
It is **SOG-0409** (his report of 14 Nov, SIG-02d3670a2b, « bugs : lenteur »), **delivered and validated by him on 17 Nov** (« c'est bon. c'était quoi ? »). The cause: the draft was written to the device at EVERY
keystroke, and the frame, which watches that folder, ran its whole device loading again each time (19 reads, the menu redrawn, the transport chosen again; 200 characters = 3 800 reads and 200 writes).
Now a key press changes the memory, two counters and the Send button; the draft is written 800 ms after the last key (A253, A214). It is **not** still there: the only latency left on that screen comes from the page's
own work, which a long task of the page (`SogFrame.longTasks`) would show. Why he could not find it: the report has no card in the file (all 53 reports are `state: new` — the card link exists in the schema and is empty today)
and his own word « latence » is not in it (« réactive », « refresh à chaque caractère »). The search above finds it by « tape », « refresh », « réactive », and by the title of the card « lente à la frappe ».

## Questions
1. A page of its own (Aide › Signalements), or the same list inside the Roadmap (where each card already shows its origin)? The mock-up is a page of its own, linking to the Roadmap card; the search covers both.
2. The table priority → group: Bloquant → Maintenant; Gênant+Toujours → Maintenant too? Proposal: Bloquant (any frequency) and Gênant+Toujours → Maintenant; Gênant+Souvent, Mineur+Toujours → Ensuite; the rest → Plus tard.
3. Who sets the `state` and the `fiche` of a report? Today nobody: 53 reports are `new`. Proposal: the ergonomist's session writes them with the verb (`signalement/etat`) when it makes the card, once, and the list shows the colours from that day on.
4. A pilot's comment: written as a linked report (`about`), seen by the administrator in Compagnie › Signalements; does the pilot see the administrator's answer?
