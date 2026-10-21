# Sessions de travail sur la suite SOG — rôles et synchronisation

Un fichier par rôle dans ce dossier (`.claude/agents/<rôle>.md`, en-tête `name` / `description`, puis les consignes du
rôle). Une session Claude Desktop ouverte sur ce dépôt prend le rôle de son nom ; une session sans fichier ici est
une session de passage, qui suit `CLAUDE.md` et demande à la session **ergonomie** avant de toucher aux pages.

| Rôle (nom de session) | Fichier | Espace | Port d'essai |
|---|---|---|---|
| Simplification interface et ergonomie | `ergonomie.md` | `E:\DEFA-fable`, branche `v2-fable` (= develop) | 8774 |
| Features SOG | `features-sog.md` | `E:\DEFA-dispos` | 8772 |
| BUGS SOG | `bugs-sog.md` | son worktree, branche de travail rebasée | 8773 |
| Sécurisation API key en HTML/JavaScript | `securisation.md` | `E:\DEFA-secu` | 8776 |
| Messages score d'atterrissage X-Plane | `landing.md` | `E:\DEFA-landing` | 8775 |
| Analyse HTML/JSON pour intégration DEFA | `analyse-defa.md` | `E:\DEFA-odv` | 8777 |
| (utilisateur) | — | `E:\DEFA`, `develop-local` | 8000 |

## Synchronisation (ce que chaque session fait, sans exception)

1. **Une seule ligne de temps.** `develop` n'avance qu'en avance rapide : `git fetch`, rebase de son travail sur
   `origin/develop`, puis push. Jamais de commit de fusion, jamais de `git pull` sans rebase. Si `origin/develop` a été
   réécrit (c'est arrivé), rebase sur la nouvelle tête (`git rebase --onto origin/develop <ancienne base>`).
2. **Qui pousse quoi.** Chaque session pousse ses commits sur `origin/develop` (framagit). `v2-fable` et `github/develop`
   sont avancés par la session ergonomie seulement ; `master` et les tags ne bougent qu'à une release, sur demande de
   l'utilisateur, par la session ergonomie (procédure : manuel d'exploitation § 6, puis `develop` ramené sur `master`).
3. **`apps/aide/docs_bundle.js` ne se résout jamais à la main** : en cas de conflit, `python tools/build_docs_bundle.py`,
   `git add`, et le rebase continue.
4. **Avant chaque push** : marqueurs de conflit absents (`git grep -l -E "^(<<<<<<<|>>>>>>>) "` vide), `?v=0` partout,
   pages touchées rechargées sans erreur, `tools/format_sources.py` passé, CHANGELOG en anglais sous « Unreleased ».
5. **Un lot = un commit**, la documentation dedans (manuels ×4, tutoriels, CHANGELOG, paquet de l'aide régénéré).
6. **Compte rendu de fin de lot** : message à la session ergonomie, première ligne « poussé » + SHA, puis ce qui a été
   fait, ce qui a été vérifié dans le navigateur, et les écarts avec la consigne. Une consigne reçue directement de
   l'utilisateur est appliquée, puis annoncée à la session ergonomie avec ses mots.
7. **Fichiers partagés sensibles** (`shared/mission_core/core.js`, `apps/planner/flight_planner.js`, `shared/dispos_*.js`,
   `shared/aircraft_*.js`, `shared/repository_nav.js`) : prévenir la session qui y travaille avant d'y toucher ;
   la session ergonomie annonce les gels.
8. **Jamais** : dialogue natif du navigateur, clé ou jeton dans le dépôt ou dans un message, push sur `master`,
   `gitnet` ou `hg`, modification des remotes, suppression d'un fichier déposé par l'utilisateur.

Les règles de codage et de documentation sont dans `CLAUDE.md` à la racine ; ce dossier ne les répète pas.
