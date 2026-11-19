# « Mes signalements » — the list, the search, the sheet, the priority (SOG-0410)

Mock-up (accepted by the ergonomist and shown to the user, 18 Nov 2026): `signalements.html` (four buttons at the top: the list, a search, the sheet of one report, the pilot side) and the captures
`signalements_{liste,recherche_texte,fiche,pilote}_{390,1280}.png`. Address on the workstation: `http://127.0.0.1:8000/frame/help/maquette/signalements.html`.
This file is also the **contract** of the code (two coders: the launcher verbs; the screen).

## Decisions (the ergonomist, 18 Nov)
1. **No new entry in the Help**: the list EXTENDS « Mes signalements », in the Signaler screen (`frame/help/signaler.js`), behind the report button that exists. The form stays on top; « Mes signalements » below becomes the list; a report opens as a sheet in the same screen (`#signaler?sig=SIG-…`, « ← Mes signalements »). The search covers the reports AND the cards; the linked card opens in the Roadmap.
2. **Priority = two axes, the user's own choice** (never the ergonomist's). *Gravité*: Bloquant / Gênant / Mineur. *Fréquence*: Toujours / Souvent / Rare. The group follows: **Maintenant** = Bloquant (any frequency) and Gênant + Toujours; **Ensuite** = Gênant + Souvent and Mineur + Toujours; **Plus tard** = the rest; **À classer** = no choice yet.
3. **The link report → card is not written in `SIGNALEMENTS.json`** (the user's file) nor by a launcher verb: the ergonomist keeps it in his own file `organisation/SIGNALEMENTS_FICHES.json` and the roadmap generator copies it into `roadmap.json`. The list draws the state and the colour from it.
4. The **pilot** sees the state, the linked card and the ergonomist's short answer; no priority, no comment (v1).
5. **No explanatory sentence on screen**: a sentence stays only in an empty state, an alert or a confirmation.

## What the screen shows
- **List**: ONE search field; groups Maintenant / Ensuite / Plus tard / À classer, seven rows at most per group (then « Voir les n suivants »). A row: kind, title, state (the colour AND the words: yellow « Sans fiche », blue « Fiche SOG-nnnn », green « Fait · SOG-nnnn », red « Refusé »), date, screen, priority (« Gênant · souvent »).
  State of a report: no card → « Sans fiche » (yellow); card `planned`/`doing`/`later` → « Fiche SOG-nnnn » (blue); card `done` → « Fait · SOG-nnnn » (green); a refused card (`refused: true` in `reports`, or an answer starting the ergonomist's way) → « Refusé » (red). A report not sent yet (pilot) → « Non envoyé » (yellow, as today).
- **Search**: case- and accent-blind, every word is found as the beginning of a word, in the title, the text, the screen, the card id and the answer of the report; the found words are marked (`<mark>`); result in two groups « Signalements » and « Fiches » (the cards of `roadmap.json` whose id or title match, with the number of linked reports). Empty: « Aucun signalement ne contient « xyz » (53 cherchés). ».
- **Sheet** (workstation): kind, state, title, the noted context (screen, size, design, language, version), the text (as text), the images the report has, the **linked card** (id, title, state, « Ouvrir dans la feuille de route » → `#roadmap?...` its card) and the ergonomist's answer if any, the **priority** (two rows of three buttons, the group in words), the **comments** (author « Vous », time; add one: 2 000 signs, « Ajouter »).
- **Sheet** (pilot): the same without the priority and the comments.

## What is read from where, and who writes
| What | Where | Writer |
|---|---|---|
| the workstation's reports | `organisation/SIGNALEMENTS.json` by the launcher verb `signalement/lister` (+ `signalement/detail`) | the user's file: **read only** (`signalement/ajouter` appends, never rewrites) |
| the link and the answer | `organisation/SIGNALEMENTS_FICHES.json`, read by the same verbs | the ergonomist (a file of his own) |
| a pilot's reports | the device (`device/signaler.json`, `mine`) and `pilot/<tri>/signalements/` (read by `loadPilots`) | the pilot |
| link and answer for a pilot | `frame/help/roadmap.json` → `reports` (copied by the generator from `SIGNALEMENTS_FICHES.json`) | the generator |
| the linked card (title, state) | `frame/help/roadmap.json` (already loaded by `roadmap.js`) | the ergonomist |
| priority and comments | **new** `organisation/SIGNALEMENTS_NOTES.json` | **the launcher only**, verbs `signalement/noter`, `signalement/commenter` |

### `SIGNALEMENTS_FICHES.json` (the ergonomist writes it; the launcher and the page only read it)
```json
{ "schema": "sog-signalements-fiches/1", "updated": "2026-11-18T10:00:00Z",
  "items": { "SIG-0123456789": { "fiche": "SOG-0409", "answer": "Short answer, 300 signs at most.", "refused": false } } }
```
`fiche` matches `^SOG-\d{4}$`; `answer` is optional text (300 signs at most, no control character); `refused` optional boolean. A malformed entry is ignored, never fatal. In `roadmap.json` the generator copies it as the top-level `reports: { "SIG-…": { fiche, answer?, refused? } }` (the page reads `reports` for a pilot, the launcher's file for the workstation: both shapes are the same).

### `SIGNALEMENTS_NOTES.json` (the launcher writes it; one writer)
```json
{ "schema": "sog-signalements-notes/1", "updated": "2026-11-18T10:00:00Z",
  "items": { "SIG-0123456789": { "gravity": "annoying", "frequency": "often",
     "comments": [ { "id": "COM-0123456789", "at": "2026-11-18T10:00:00Z", "text": "…" } ] } } }
```
`gravity`: `blocking` | `annoying` | `minor`; `frequency`: `always` | `often` | `rare` (closed lists; either may be absent). `comments`: 200 per report at most, 2 000 signs each. Same guard as `signalement/ajouter`: no control character (tab and newline allowed in a comment), the id is made here (`COM-` + ten hex digits), never received; file at most 4 Mio; 1 000 reports at most; atomic write (`.tmp` then replace); an unreadable file or another schema is refused, not replaced; never rewrites what it does not create (unknown keys kept).

## Launcher verbs (`tools/regen/signalement.py`, this workstation only, same route `POST /__setup/regen/job`, no new route)
- `signalement/lister` `{ q?, offset?, limit? }` → `{ ok, total, searched, items: [ { id, kind, title, excerpt, screen, at, state, fiche?, answer?, refused?, gravity?, frequency?, comments } ] }` — all the reports (newest first) or those matching `q`; `limit` 1…300 (default 300); `excerpt` 240 signs of the text around the first match (or the start); `comments` is a count; `searched` the number of reports looked at (« 53 cherchés »). `{ ok: false, reason: 'no-organisation' }` on a workstation that is not the ergonomist's.
- `signalement/detail` `{ id }` → `{ ok, item: { id, kind, title, text, screen, ctx?, at, state, from?, folder?, images: [names], fiche?, answer?, refused?, gravity?, frequency?, comments: [ { id, at, text } ] } }` or `{ ok: false, reason: 'unknown' }`.
- `signalement/noter` `{ id, gravity?, frequency? }` → `{ ok, gravity, frequency }`; a value not in the closed list is refused (`reason: 'bad-value'`); the id must be a report that exists.
- `signalement/commenter` `{ id, text }` → `{ ok, comment: { id, at, text } }`; `text` 1…2 000 signs; the id must exist; an unknown key of the argument is REFUSED (as in `signalement/ajouter`).
The search (`q`) is done on the launcher's side on the text (accent-blind, lower-cased, NFKD without the combining marks; every word of `q` must start a word of the title, text, screen, card id or answer; 8 words, 60 signs each at most).

## Third-party text
Every text of a report, a comment, an answer or a pilot's folder is an **untrusted input**: bounded, control characters removed, shown by `esc()` as text only, never as HTML, never as a link (`<mark>` is added by the page around a found word, on escaped text); the screen and the kinds are closed lists; a linked card is found by its `SOG-nnnn` in `roadmap.json`, its title comes from there, not from the report. The page never builds a path from a report.

## The latency the user was looking for
It is SOG-0409 (an invented report here, SIG-1000000005, « Recherche : la liste est lente »), delivered and validated by him on 17 Nov. He could not find it because his 53 reports have no card (`state: new`) and his word « latence » is not in it: the search finds it by « tape » or « recharge », and by the title of its card once the link is written.
