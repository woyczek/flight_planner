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
- Tutoriel — votre premier compte rendu : [docs/TUTORIAL.md](docs/TUTORIAL.md)
- Manuel d'exploitation (données, sauvegardes, bases, maintenance) : [docs/MANUEL_EXPLOITATION.md](docs/MANUEL_EXPLOITATION.md)
- Notes de conception / audit du Mission Report Core : [docs/mission_report_core_audit.md](docs/mission_report_core_audit.md)

## Contenu

| Menu ☰ | Page | Rôle |
|---|---|---|
| Missions › Nouveau compte rendu | `CR DEFA/mission_cr.html` | Choisir la famille de mission, puis rédiger le CR |
| Missions › Reporting missions | `CR DEFA/mission_operations_reporting.html` | Reporting toutes familles, statistiques, tableau des missions |
| Paramétrage › Bases de données | `CR DEFA/parametrage.html` | Éditer la flotte, les types d'aéronefs, les indicatifs, les registres… |
| Landing Performance Dashboard | `LandingPerformanceDashboard/…` | Analyse des atterrissages à partir de journaux CSV |
| Flight Performance & Fuel Planner | `flight_performance_planner.html` | Performances et carburant |

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
- **Météo et soleil** : analyse du METAR, METAR actuel (VATSIM), météo modèle à l'heure du
  vol (Open-Meteo), lever / coucher du soleil et jour / nuit au terrain de départ (heure
  locale).
- **Suivi réseau en direct** (IVAO / VATSIM) : mise en route, décollage, atterrissage, fin de
  mission ; import de l'historique VATSIM.
- **Registres** : un fichier YAML par famille (`CR DEFA/<DOSSIER>/<famille>_missions.yaml`), écrit
  dans un dossier local autorisé une fois (Chrome / Edge), export CSV simplifié. Import des
  anciens registres CSV HEMS / GAAR.
- **Compte rendu** en 14 sections, généré en quatre langues (FR / EN / DE / ES), imprimable
  en PDF, avec une version publique masquant les données sensibles quand il y a lieu.
- **Sauvegarde des données locales** : tout ce que garde le navigateur peut être copié dans
  `defa_local_store.yaml` et restauré (menu ☰ › Données locales).

### Cadre commun

- `repository_tree` : arborescence des pages, libellés, thèmes, favicons (fichier JavaScript
  sans extension).
- `shared/repository_nav.js` / `.css` : bandeau, menu ☰, langue (FR / EN / DE / ES), profil
  pilote (ID IVAO / VATSIM, identifiant SimBrief), sauvegarde des données locales.
- `shared/app_framework.js` : blocs déplaçables / masquables (disposition mémorisée par page,
  blocs masqués par défaut quand c'est pertinent).
- `AircraftDB/` : base des types d'aéronefs OACI (`aircraft_db.js`) et son script de mise à
  jour (`update_aircraft_db.py`), mise à jour de la flotte (`update_fleet.py`).
- `tools/` : scripts de maintenance (nouvelle famille de missions, version de cache).

## Démarrage rapide

1. Récupérer le dépôt (clone ou archive) — voir [INSTALL.md](INSTALL.md).
2. Le servir localement, par exemple `python -m http.server 8000` à la racine du dépôt, puis
   ouvrir <http://127.0.0.1:8000/CR%20DEFA/mission_cr.html> dans Chrome ou Edge.
3. ☰ › Profil pilote : saisir ses ID IVAO / VATSIM (et l'identifiant SimBrief).
4. Suivre le [tutoriel](docs/TUTORIAL.md).

## Confidentialité

Rien n'est envoyé à un serveur du projet (il n'y en a pas). Les pages n'appellent des
services publics que lorsque vous utilisez la fonction correspondante : flux publics IVAO /
VATSIM, METAR VATSIM, SimBrief (votre identifiant), Open-Meteo (coordonnées du terrain et
date), jsDelivr (liste mondiale des aérodromes). Les données des missions restent dans
votre navigateur et dans les fichiers que vous choisissez.

## Licence et crédits

CC RBR — DEFA Virtual. Code tiers inclus : js-yaml 4.1.0 (MIT,
`shared/mission_core/vendor/`). Données des aérodromes : github.com/mwgg/Airports (MIT),
chargées à la demande.
