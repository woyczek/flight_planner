# V3 — journal of the cloud session (for the ergonomics session to catch up)

*Journal de la session cloud « mobile » (session de passage, `.claude/agents/README.md`) : chaque décision et chaque
action depuis le dernier point d'étape de la session **Simplification interface et ergonomie**, pour qu'elle rattrape
le retard à son réveil et conteste ce qui doit l'être. Le document est en anglais (règle du dépôt), la consigne en tête
est en français.*

## Consigne à la session ergonomie, à son réveil

1. **Point d'étape de référence** : `66cc22dab` sur `v3` (Framagit, 23 octobre 2026, « V3 : feuille de route — livrés :
   sélecteur d'appareil, points VAC et balises fusionnées, registre unique ; ajoutés : premier écran sans attendre le
   réseau, cartes qui restent, noms de lieux du fond et ETA, heures du CR en UTC »). C'est ton dernier commit avant que
   la session cloud ne reprenne la main sur demande de l'utilisateur.
2. **Fais le diff des actions réalisées depuis** : pour chaque branche du tableau ci-dessous, `git fetch github <branche>`
   puis `git diff 66cc22dab..github/<branche> --stat` et `git log 66cc22dab..github/<branche>` ; lis l'entrée du journal
   des décisions du module concerné (`modules/<module>/DECISIONS.md`, `frame/design/DECISIONS.md`) qui date du lot.
3. **Conteste chaque décision** listée ici (colonne « Decision ») : tu peux la **confirmer**, la **mitiger** (reformuler,
   réduire, conditionner) ou l'**annuler** (ne pas intégrer la branche, ou l'intégrer puis revenir dessus par un commit).
   Tu dis à l'utilisateur ce que tu as fait de chacune, avec ses mots.
4. **Intègre** ce que tu confirmes en avance rapide sur `v3` (rebase de la branche sur `origin/v3`, `docs_bundle.js`
   régénéré en cas de conflit, marqueurs vérifiés), puis pousse Framagit. La session cloud ne peut pas pousser sur
   Framagit (clé en lecture seule) : ses branches sont sur GitHub (`github` remote, `Woyczek/flight_planner`).
5. **Mets ce journal à jour** : une ligne « reviewed » par entrée, puis archive ou supprime le fichier quand tout est
   intégré ou annulé.
6. **`v3` sur GitHub a été avancée par la session cloud** (24 octobre, sur demande de l'utilisateur, pour qu'il teste
   sur `https://woyczek.github.io/v3/frame/`) : elle vaut `66cc22dab` + les commits de ce journal (dette du module
   Carte, quatre maquettes de design, journal, lot Carburant, correctif de la carte des espaces), repris par
   cherry-pick dans cet ordre. **Framagit `v3` n'a pas bougé** (`66cc22dab`). Retour arrière possible à tout moment :
   `git push github 66cc22dab:v3 --force` (Pages reconstruit la V3 d'avant), ou un `git revert` du ou des commits
   contestés une fois la branche intégrée sur Framagit. Aucun autre poste ne doit avoir rebasé sur cette `v3` GitHub
   avant ta relecture : vérifie `git log github/v3` avant de forcer.

## Log (newest last)

Every entry: date, branch on GitHub, commit, what was done, the decisions taken by the orchestrator (cloud session)
or by the user, and the question left to the ergonomics session. "User" means a decision the user stated in chat:
confirm it with him before cancelling.

| Date | Branch (GitHub) | Commit | Action | Decision | Who | For the ergonomics session |
|---|---|---|---|---|---|---|
| 22 Oct | `v3-unites-carburant` | `86f87a354` | Fuel module: display units speed (kt, km/h), altitude (ft, m), distance (NM, km, SM) next to kg / lb; conversions at the screen only; FL kept as FL; bench 50/50 | Feature asked by the user ("au moins dans fuel"); placed in V3 fuel rather than V2 (develop is corrections only) | user + orchestrator | `v3` now has the same helpers (`distTxt`…): check the lot is integrated in substance and drop the branch |
| 23 Oct | `v3-dette-carte` | `7097d0595`, `df0b7ee75` | `docs/technique/DETTE_TECHNIQUE.md`, section "V3 — map module": antimeridian; airspaces card hidden under the buttons / unclosable / 90 % of the map on a phone; SFC–UNL volumes drawn; tap on an empty spot does not close the card; VFR text over the map | Written as technical debt, as the user asked, with causes read in the code | user | The airspaces card entry is being fixed (see 24 Oct): close it when integrated |
| 23 Oct | `v3-metro` | `7d3b90635` | Design mock-up **Metro**: token set, landmark colour per module (`--sog-module*`, `data-landmark`), frame rules behind `[data-design="metro"]`, demo page `frame/design/demo_metro.html` | User: "une maquette métro ; une fois le cadre amendé, on tranchera les jetons" | user | Seven frame amendments listed in `frame/design/DECISIONS.md` and in `V3_SPECIFICATION.md` § 10.3 (1–7): decide each |
| 23 Oct | `v3-metro` | `57d750a8d` | `V3_SPECIFICATION.md` § 10.3: designs retained and open points | User: Swiss and Cupertino retained with Metro; `cabinet` dropped, `field` may stay; nothing skeuomorphic on a phone | user | — |
| 23 Oct | `v3-metro` | `6ecab884a` | Design mock-ups **Swiss** and **Cupertino** (same pattern) | Orchestrator: system fonts only; Swiss night red lighter with black ink; Cupertino keeps Apple's blue although it fails 4.5:1 | orchestrator | § 10.3 points 11–13: Apple blue vs `#0066cc`; Swiss cards as a top rule vs hairline box; rules repeated across designs to promote to tokens |
| 23 Oct | `v3-metro` | `8fecdd7aa` | § 10.3 updated: Material 3 added to the retained designs | User: "tu peux aussi lancer material design 3" | user | — |
| 23 Oct | `v3-metro` | `c816ac81a` | Design mock-up **Material 3**: tonal surfaces, two elevation levels, pills, drawer and 88 px rail | Orchestrator: primary blue-violet `#5359c6` (the fleet blue fails contrast on card and field); base text kept at 15 px; header buttons keep a frame (no fourth copy of the frameless rule) | orchestrator | Promote the shared rules to tokens before any fifth design; choose the primary hue |
| 24 Oct | `v3-fuel-ergo` | `4f7d622ea` | Fuel screen opens on the Plan, never on the Sheets at mount; sticky result bar compact on a phone: one context line (ellipsed), smaller figure under 760 px, three one-line tiles "Étape / Temps / TOD" | User: "la vue fiches ne devrait pas être active par défaut… le bloc de calculs prend trop de place… abréger (TOD)"; orchestrator chose the labels and the one-line rule | user + orchestrator | Labels (Étape / Trip; TOD in four languages); the last view is no longer remembered at all (`cache/fuel/ui.json` no longer written); bar 192 → 104 px at 390 px. Found, not fixed: the Flight step's date row overflows at 390 px in Chromium (`.fu-when`), `sheets.html` bench has 2 failures on `.lnmperf` (not from this lot) |
| 24 Oct | `v3-maps-espaces` | `b3fb216d5` | Fix of the airspaces card: own layer above the buttons (z-index 7), bounded to the lower 45 % of the frame on a phone with a capped chart and a scrolling list, closed by a tap on an empty spot (✕, Escape kept; drag and wheel never close), ✕ always reachable | User: "fix le bug"; orchestrator: the "cards that stay" rule of 23 Oct is **reverted for the airspaces card only**; the aerodrome card keeps it | user + orchestrator | This reverts part of your lot "cards that stay": confirm, or keep both cards sticky and add a pin gesture instead (debt entry "tap on an empty spot", `DETTE_TECHNIQUE.md`). The agent writing the code was lost with its session; the cloud session finished the documents and ran the bench (44.8 % of the frame at 390 px, ✕ on top, closed by an empty tap) |
| 24 Oct | `v3` (GitHub) | *(this integration)* | `V3_SPECIFICATION.md` § 7.1: the user's phone ergonomics target (iVAC): bottom tab bar of five items with Settings, no hamburger, selected icon filled on a soft pill, back-to-top arrow, "i" badge for a pop-up, sync control in Settings, chips and segmented controls; "keep the path in mind even when features are added" | User's target, written as a spec section, nothing coded | user | Cut into frame and design lots (navigation on a phone, primitives); the five-verb limit with Settings needs one verb moved or folded |
| 24 Oct | `v3` (GitHub) | integration | GitHub `v3` advanced from `66cc22dab` with, in this order: `v3-dette-carte` (2), `v3-metro` (5), the journal, `v3-fuel-ergo`, `v3-maps-espaces`, then this entry (§ 7.1 target, debt entry closed); conflicts only in `docs/CHANGELOG.md` (both sides kept) and `apps/aide/docs_bundle.js` (regenerated); this journal now lives in `v3` (the branch `v3-journal-cloud` is superseded) | User: "pousse v3 dès que prêt", designs included ("ok pour les maquettes") | user | Framagit `v3` untouched: rebase/ff from GitHub `v3` or roll back (consigne 6) |
| 24 Oct | `v3` (GitHub) | `1e280efcd` | `.claude/agents/relais-cloud.md`: the cloud session's role as backup of the ergonomics session, row in the README, line in `CLAUDE.md` | User: "on formalise ton rôle de backup dans la liste des agents" | user | Review the role's wording; it binds every future cloud session |
| 24 Oct | `v3` (GitHub) | *(this commit)* | `V3_SPECIFICATION.md` § 8 and § 9.8: weather cache layer in the frame (local cache, one reader API, Open-Meteo quota counted and shown, relay server later); answer sent to the `labs/atmosphere` session (schema 1 of the current flight unchanged, aerodb through `ctx.aerodb`, reuse fuel's `winds.js` and `cache/fuel/aloft.json`, module rules) | User: "une couche de cache météo est souhaitable… bien évaluer le quota… bien sûr un cache local" | user | A frame lot to cut; the quota accounting of Open-Meteo to measure before design |
| 24 Oct | `v3-maps-bloc` | `986a263e0` | Map view fixed: airspaces list and an aerodrome's VFR content open in the data block under the map in place of the vertical profile (profile back on close); overlay cards removed; VRP labels on the map are the short code only; display thresholds corrected by the frame size (`effectiveZoom` = zoom + log2(mean(w,h)/900)); tuning page shows the effective zoom; debt entries "VFR text over the map" closed and "tap on an empty spot" partly settled | User: "la vue carte doit être fixe… on vient afficher sur le bloc de données… on n'affiche que le nom compressé… seuils dépendants de la taille d'écran, moyenne H+L"; orchestrator/agent: header line of 30 px shown for the profile too, ICAO-only title, airspaces release a pinned aerodrome, reference 900 px and k = 1, former "one step less under 600 px" removed (phone correction −1.17 instead of −0.75), starting thresholds not retuned, raw-pixel rules (obstacle heights, ETA labels, corridor) left on raw pixels | user + relais | Challenge: the 30 px header on the profile; thresholds to retune on the tuning page (CTR, D and names appear later on a phone); whether raw-pixel rules should follow the effective zoom; the pin gesture of the aerodrome content |

## Method notes

- Every lot was done by a cheaper agent (Sonnet) in the role of the module's V3 agent, on a branch cut from
  `framagit/v3` at `66cc22dab`, reviewed by the orchestrator, pushed to GitHub only.
- Other designs are checked pixel-identical on each design lot (Playwright, 390 and 1280 px, day and night); contrasts
  are computed and listed in `frame/design/DECISIONS.md`.
- No module file was touched by the design lots; no frame file by the fuel and maps lots.
