# X-Plane Web Suite — DEFA Virtual

*[English version: README.md](README.md)*

Un ensemble de pages web statiques pour les opérations aériennes virtuelles (X-Plane,
IVAO, VATSIM) : comptes rendus de mission pour 14 familles de missions, reporting et
statistiques, bases de la flotte et des aéronefs, analyse des atterrissages, préparation
des performances et du carburant. Ni serveur, ni compte, ni compilation : les pages
fonctionnent dans le navigateur et gardent leurs données dans des fichiers locaux (YAML)
et dans le navigateur.

- Dépôt : <https://framagit.org/asr/flight_planner>
- Installation : [INSTALL.md](INSTALL.md)

## Trois applications, un framework commun

| Application | Pages | Rôle | Documentation |
|---|---|---|---|
| **CR DEFA** (Mission Report Core) | `CR DEFA/` — ☰ › Reporting missions, Nouveau compte rendu, Paramétrage | Comptes rendus de mission de 14 familles, registre unique, reporting et graphiques, bases de la flotte et des indicatifs, envoi des CR | [Tutoriel](docs/TUTORIAL.md) · [Manuel d'exploitation](docs/MANUEL_EXPLOITATION.md) · [Notes de conception](docs/mission_report_core_audit.md) |
| **Landing Performance Dashboard** | `LandingPerformanceDashboard/LandingPerformance_Dashboard_MultiCSV_i18n.html` | Analyse des atterrissages (score, FPM, G) à partir des journaux CSV / LOG, tendances, filtres | [docs/LANDING_DASHBOARD.md](docs/LANDING_DASHBOARD.md) · [mise à jour de la base d'aéronefs](LandingPerformanceDashboard/README.md) |
| **Flight Performance & Fuel Planner** | `flight_performance_planner.html` | Profils de performance par avion, devis carburant, altitude optimale, calibration SimBrief, échange Little Navmap | [docs/FLIGHT_PLANNER.md](docs/FLIGHT_PLANNER.md) |
| **Framework commun** | `repository_tree`, `shared/`, `AircraftDB/`, `tools/` | Bandeau et menu ☰, langues, blocs, période et zoom (TimePeriod), graphiques, tableaux, profil pilote, données locales, bases d'aéronefs | [docs/FRAMEWORK.md](docs/FRAMEWORK.md) |

Les trois applications se parlent par le framework : même profil pilote (IVAO, VATSIM,
SimBrief), même composant de période (zoom par glisser sur les graphiques, boutons ◀ 🔍− ▶
dans l'en-tête), même base de types d'aéronefs ; le Planner reprend les avions du dernier
fichier du Landing Dashboard.

### Mission Report Core — l’application « CR DEFA »

Toutes les pages et tous les registres de l’application sont dans le dossier `CR DEFA/` ;
le code commun reste dans `shared/`, `AircraftDB/` et `assets/`.

Un moteur unique (`shared/mission_core/`) anime les pages de CR et de reporting de toutes
les familles : HEMS / MEDEVAC, FIRE / GAAR (lutte contre les feux de forêt), SAR,
AIRLIFT, MARITIME, HADR, AIRBORNE, CONTRÔLE EN VOL, LEVÉS, POLICE / DOUANE, ISR,
COMMANDEMENT / GUET AÉRIEN, OPÉRATIONS SPÉCIALES, SPÉCIAL (essais / formation). Chaque
famille a une page de CR (`CR DEFA/<DOSSIER>/<famille>_cr.html`) et une page de reporting
(`CR DEFA/<DOSSIER>/<famille>_reporting.html`) ; la popup de l'en-tête change de famille et de
sous-type de mission.

Points forts :

- **Modèle commun** (identification, appareils, équipage, tâche, capacités, météo,
  navigation, chronologie, carburant, événements, étapes, résultat, trace réseau) et blocs,
  champs et événements propres à chaque famille ; les champs sans objet sont masqués.
- **Aide à la saisie** : valeurs déjà saisies proposées dans chaque champ ; immatriculation,
  indicatif, type OACI et variante se filtrent mutuellement et se complètent quand il ne
  reste qu'une possibilité ; flotte DEFA (205 appareils) ; indicatif = série + numéro, avec
  sa forme plan de vol OACI de 7 caractères (DRAGON76 ↔ DRAGO76, PELICAN31 ↔ PCAN31) et
  l'exploitant OACI (OPR/).
- **Import du plan de vol déposé** : SimBrief, IVAO (vol en cours), VATSIM (en cours ou
  déposé à l'avance).
- **Météo et soleil** : renseignés automatiquement dès que le terrain de départ, la date et
  l'heure sont connus — METAR calculé à partir du modèle Open-Meteo à l'heure du vol (marqué
  `RMK CALC OPEN-METEO` ; METAR réel VATSIM pour un vol du jour, dans l'heure), lever /
  coucher du soleil (Open-Meteo, calcul local à défaut) et phase jour / nuit. Seuls les
  champs vides ou remplis automatiquement sont écrits.
- **Indicatif intelligent** : `ctm58` saisi dans l'indicatif donne COTAM / 58 / CTM58,
  OPR/ CTM et l'organisme de la série.
- **Envoi du CR** : bouton « Envoyer le CR » (POST JSON) vers un webservice dont l'adresse et
  la clef se règlent dans Paramétrage (la clef reste dans le navigateur, hors sauvegardes).
- **Suivi réseau en direct** (IVAO / VATSIM) : mise en route, décollage, atterrissage, fin de
  mission ; import de l'historique VATSIM.
- **Registre unique** : toutes les familles dans un seul fichier YAML (`CR DEFA/missions.yaml`),
  écrit dans le dossier `CR DEFA` autorisé une fois (Chrome / Edge), export CSV simplifié ;
  anciens registres par famille repris automatiquement. Import des anciens registres CSV
  HEMS / GAAR.
- **Champs de texte simple en majuscules** (indicatifs, terrains, points tournants,
  équipage…), anciennes saisies converties à la lecture ; zones de texte libre inchangées.
- **Page de CR** : barre d'en-tête de sept entrées (famille · série, enregistrer, envoyer,
  importer, suivi réseau, mission, registre), aperçu du compte rendu dans la colonne de droite, navigation et météo
  en bas de page.
- **Compte rendu** en 14 sections, généré en quatre langues (FR / EN / DE / ES), imprimable
  en PDF, avec une version publique masquant les données sensibles quand il y a lieu.
- **Sauvegarde des données locales** : tout ce que garde le navigateur peut être copié dans
  `defa_local_store.yaml` et restauré (menu ☰ › Données locales).

### Framework commun (résumé — détail : [docs/FRAMEWORK.md](docs/FRAMEWORK.md))

- `repository_tree` : arborescence des pages, libellés, thèmes, favicons (fichier JavaScript
  sans extension).
- `shared/repository_nav.js` / `.css` : bandeau, menu ☰, langue (FR / EN / DE / ES), profil
  pilote (ID IVAO / VATSIM, identifiant SimBrief), sauvegarde des données locales.
- `shared/app_framework.js` : blocs déplaçables / masquables (disposition mémorisée par page,
  blocs masqués par défaut quand c'est pertinent).
- `AircraftDB/` : base des types d'aéronefs OACI (`aircraft_db.js`) et son script de mise à
  jour (`update_aircraft_db.py`), mise à jour de la flotte (`update_fleet.py`).
- `shared/time_period.js` : période d'analyse commune (préréglages, dates, ◀ zoom arrière ▶,
  zoom par glisser sur les graphiques) — reportings et Landing Dashboard.
- `shared/mission_core/charts.js`, `shared/mission_table.js` : graphiques SVG, tableaux triables.
- `tools/` : scripts de maintenance (nouvelle famille de missions, version de cache).

## Démarrage rapide

1. Récupérer le dépôt (clone ou archive) — voir [INSTALL.md](INSTALL.md).
2. Le servir localement, par exemple `python -m http.server 8000` à la racine du dépôt, puis
   ouvrir <http://127.0.0.1:8000/CR%20DEFA/mission_cr.html> dans Chrome ou Edge.
3. ☰ › Profil pilote : saisir ses ID IVAO / VATSIM (et l'identifiant SimBrief).
4. Suivre le [tutoriel](docs/TUTORIAL.md).

## Confidentialité

Rien n'est envoyé à un serveur du projet (il n'y en a pas), hormis les CR que vous envoyez
vous-même par « Envoyer le CR » au webservice configuré. Les pages n'appellent des
services publics que lorsque vous utilisez la fonction correspondante : flux publics IVAO /
VATSIM, METAR VATSIM, SimBrief (votre identifiant), Open-Meteo (coordonnées du terrain et
date), jsDelivr (liste mondiale des aérodromes). Les données des missions restent dans
votre navigateur et dans les fichiers que vous choisissez.

## Licence et crédits

CC RBR — DEFA Virtual. Code tiers inclus : js-yaml 4.1.0 (MIT,
`shared/mission_core/vendor/`). Données des aérodromes : github.com/mwgg/Airports (MIT),
chargées à la demande.
