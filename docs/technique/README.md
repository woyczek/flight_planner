# Documentation technique — Suite SO Group Virtual

*[← Index documentaire](../README.md)* · Conception, architecture, projet, audits et propositions : pour qui développe
ou maintient la suite. Les manuels et guides d'utilisation sont au [premier niveau](../README.md).

## Architecture et données

| Document | Pour |
|---|---|
| [Synchronisation des données](SYNCHRONISATION.md) | architecture de la synchronisation (bouton « Synchroniser », conflits fiche par fiche, plusieurs utilisateurs) |
| [Index des données](INDEX_DONNEES.md) | index du navigateur, réplication, expiration, conflits, étapes |
| [Framework commun](FRAMEWORK.md) | en-tête, menu, blocs, dossiers, données locales |
| [Boîte à outils](REFACTORING_TOOLKIT.md) | designs à matières, couches CSS, banc de non-régression |
| [Intégration SIA XML](SIA_XML_INTEGRATION.md) | lecture des données AIXM du SIA |
| [Données aéronautiques hors de France](DONNEES_AERO_ETRANGER.md) | sources possibles pour le Royaume-Uni, l'Europe et les États-Unis (formats, licences, militaire) |

## Conception des fonctions

| Document | Pour |
|---|---|
| [Affectation des missions](AFFECTATION_MISSIONS.md) | conception de l'affectation des missions aux pilotes et de « Mes missions » |
| [Comptes et données signés](COMPTES_SIGNES.md) | modes standalone et groupe, clés de poste, registre signé, enrôlement, clé de secours, affectations signées (conception) |
| [Disponibilités et réorganisation](DISPOS_ET_REORGANISATION.md) | catégories de disponibilité, paramètres en quatre pages, utilisateurs et droits (décisions du 5 octobre 2026) |
| [Prompt du générateur de missions](PROMPT_GENERATEUR_MISSIONS.md) | prompt de génération des missions (source de `apps/cpco/mission_prompt.js`) |
| [Prompt du profil de performances](PROMPT_PROFIL_PERFORMANCES.md) | prompt « Demander à ChatGPT » de Carburant, 4 langues et schéma de la réponse (source de `apps/planner/perf_prompt.js`) |
| [V2 : niveaux d'utilisation](V2_NIVEAUX.md) | refonte v2 : quatre niveaux, pages et blocs rangés par niveau d'usage |
| [V2-fable : parcours du pilote](V2_FABLE.md) | page « Aujourd'hui », compte rendu guidé, notifications qui se taisent, tâches qu'on arrête, champs qui s'agrandissent |

## Projet

| Document | Pour |
|---|---|
| [Feuille de route](ROADMAP.md) | où va la suite, dans quel ordre, décisions en attente |
| [Dette technique](DETTE_TECHNIQUE.md) | points connus, gardés en l'état, à reprendre |
| [Journal des bugs](BUGS.md) | bugs ouverts et fermés : zone, cause, commit de la correction |

## Designs et images

| Document | Pour |
|---|---|
| [Assets à fournir](ASSETS_A_FOURNIR.md) | images à produire pour chaque design à matières |
| [Prompts phase 2](PROMPTS_ASSETS_PHASE2.md) · [Prompts du livre de mission](PROMPTS_LIVRE_MISSION.md) | prompts des images des designs |
| [Icônes des designs](PROPOSITION_DESIGN_ICONES.md) · [démonstration](demo_design_icones.html) | proposition : icônes, numéros et sous-titres de blocs, barre latérale |
| Planches (`planches/`) | planches de référence et sources des découpes (onglets, liserés, bannières, rubriques) |

## Prototypes (outside the suite)

| Document | For |
|---|---|
| [Availability timeline: specification](DISPOS_TIMELINE_SPEC.md) · [integration](DISPOS_TIMELINE_INTEGRATION.md) | stand-alone module `shared/dispos_timeline.js` (formats: `shared/dispos_formats.js`), not yet in the suite's pages: the full description of the component, enough for a language model to regenerate it (data, rules, gestures, API), and the guide to put it into another single-page HTML application (loading, storage, formats, events, theme, pitfalls, minimal example); both delivered in `dist/dispos-module-<version>.zip` (`tools/publish_dist.py`) |
| [`labs/`](../../labs/dispos_timeline.html) — availability timeline | example page of the module, outside the suite (not linked from its menus): French texts through the `labels` option, data in the browser's localStorage, schema 3 and schema 2 shown side by side |

## Audits et mesures

| Document | Pour |
|---|---|
| [Mission Report Core](mission_report_core_audit.md) | audit et plan d'intégration du socle des comptes rendus |
| [Audit du 28 septembre 2026](AUDIT_2026-09-28.md) | entrées SIA, installation, git |
| [Audit de sécurité du 2 octobre 2026](AUDIT_SECURITE_2026-10-02.md) | pages, scripts, lanceur |
| [Audit de sécurité du 7 octobre 2026](AUDIT_SECURITE_2026-10-07.md) | évasion de données, surface locale, code étranger (« zombie »), préparation du mode client/serveur ; plan de correction par lots |
| [Performances : synthèse](perf/SYNTHESE.md) · [rapport](perf/RAPPORT_PERF.md) · [plan](perf/PLAN_PERF_2026-10-04.md) | audit de performance avant / après, extrapolation |
| [Performances : mesures du 8 octobre](perf/RAPPORT_2026-10-08.md) | Planning et Cartes de vol dans Chrome (onglet visible) : requêtes, DOM, tâches longues, base SIA ; trois lots de correction |
