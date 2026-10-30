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

## V3 (branche `v3`, depuis le 22 octobre 2026) — un agent par module, mémoire dans son `DECISIONS.md`

La V2 reste sur `develop` en corrections seulement (sessions ci-dessus). La V3 vit sur `v3` : un cadre (`frame/`) et
des modules (`modules/<nom>/`), chacun avec `SPEC.md`, `INTEGRATION.md` et `DECISIONS.md`. Première application :
Pilote. Cahier des charges et journal des décisions : `docs/technique/V3_SPECIFICATION.md`.

| Rôle (nom de session) | Fichier | Espace | Port |
|---|---|---|---|
| V3 frame (couche de données, navigation, chargeur) | `v3-frame.md` | `E:\DEFA-v3-frame` | 8790 |
| V3 report (compte rendu) | `v3-report.md` | `E:\DEFA-v3-report` | 8791 |
| V3 website (site DEFA, web service) | `v3-website.md` | `E:\DEFA-v3-website` | 8792 |
| V3 fuel (carburant, niveau, fiches) | `v3-fuel.md` | `E:\DEFA-v3-fuel` | 8793 |
| V3 maps (carte vivante, profil vertical) | `v3-maps.md` | `E:\DEFA-v3-maps` | 8794 |
| V3 flightlog (mes vols) | `v3-flightlog.md` | `E:\DEFA-v3-flightlog` | 8795 |
| Atmosphère — modules/atmosphere, session cloud, intégrée par Simplification | — | cloud | — |
| V3 design (jetons, densité, designs) | `v3-design.md` | `E:\DEFA-v3-design` | 8796 |
| V3 aerodb (bases SIA et appareils) | `v3-aerodb.md` | `E:\DEFA-v3-aerodb` | 8797 |
| V3 help (aide, tutoriels, manuels) | `v3-help.md` | `E:\DEFA-v3-help` | 8798 |
| V3 settings (identité, usages, accès, caches) | `v3-settings.md` | `E:\DEFA-v3-settings` | 8799 |
| Relais cloud (backup de la session ergonomie, quand le poste principal est hors d'atteinte) | `relais-cloud.md` | conteneur cloud claude.ai/code, un arbre git par lot | statique 8800+ |

Chaque agent V3 : lit la spécification V3 et `v3-frame.md` (façon de travailler commune), travaille sur `v3` dans son
espace, un lot = un commit avec ses trois documents, « poussé » + SHA à la session ergonomie, jamais de push sur
`develop`, `master` ou `v2-fable`. La session ergonomie tient la spécification, répartit, valide les lectures et
intègre.

**Relais cloud** (`relais-cloud.md`) : quand la session ergonomie et les sessions des modules sont injoignables et que
l'utilisateur le dit, une session cloud prend la main : elle arbitre avec ses mots, instancie des agents moins coûteux
dans les rôles des modules (un arbre git isolé chacun), pousse sur GitHub seulement (branches `v3-<sujet>`, puis `v3`
en avance rapide pour les essais sur Pages), et tient `docs/technique/V3_JOURNAL_SESSION_CLOUD.md` : point d'étape de
référence (dernier commit de la session ergonomie), une ligne par décision, consigne de relecture et de retour arrière.
À son réveil, la session ergonomie relit ce journal, confirme, mitige ou annule, puis intègre sur Framagit.

## Synchronisation (ce que chaque session fait, sans exception)

1. **Une seule ligne de temps.** `develop` n'avance qu'en avance rapide : `git fetch`, rebase de son travail sur
   `origin/develop`, puis push. Jamais de commit de fusion, jamais de `git pull` sans rebase. Si `origin/develop` a été
   réécrit (c'est arrivé), rebase sur la nouvelle tête (`git rebase --onto origin/develop <ancienne base>`).
   Jamais `git reset` sur `origin/develop` : cette référence est partagée entre les worktrees et bouge sous tes
   pieds ; on écrase toujours sur le SHA de sa propre base (incident du 21 octobre : dix fichiers d'un autre lot
   ramenés en arrière, réparés cinq minutes plus tard).
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
9. **`develop` est la ligne V3 depuis le 23 octobre 2026** (les pages V2 y vivent aussi, inchangées). `v3` est la
   même ligne : les sessions V3 poussent sur `origin/v3` comme avant ; la session ergonomie avance `develop` en avance
   rapide sur `v3` à chaque intégration et miroite sur github. Plus de rebase ni de cherry-pick entre `v3` et `develop`.
   Les correctifs V2 se font sur `v2-maintenance` (tirée de `master` 5.4.0), poussés par BUGS SOG ; la session ergonomie
   les reporte sur `v3` (cherry-pick, seule exception à la règle 1) ; une release V2 de maintenance part de
   `v2-maintenance` vers `master`. Les releases V3 (6.x) partent de `develop` vers `master` quand la V2 sera éteinte.

Les règles de codage et de documentation sont dans `CLAUDE.md` à la racine ; ce dossier ne les répète pas.
