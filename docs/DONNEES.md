# Données de la suite — provenance, mise à jour, sauvegarde

Depuis la v3, les données (tout ce qui est, saisi ou recalculé) sont **hors du dépôt de l'application**, dans le
dépôt de données (privé) cloné dans `data/` : `references/`, `cr/`, `missions/`, `sia/`, `planner/` (voir [INSTALL.md](INSTALL.md),
`tools/data_template/README.md`). Le dépôt de l'application ne garde que le code, les bases OACI / APD générées et des
exemples fictifs (`examples/`).

Règle : **aucune donnée ne reste seulement dans le navigateur.** Chaque base est :

- soit une **référence importée** d'une source fiable, par un outil (scrapper / import) qui la reconstruit ;
- soit une **donnée utilisateur**, sauvegardée (fichier du dépôt, ou sauvegarde des données locales) ;
- soit un **cache** reconstructible depuis l'une des deux premières.

Une correction de référence passe par un outil (surcharge traçable, ou correction du scrapper), jamais
par une valeur écrite dans le code. Exemple : les codes de la flotte E2C et RQ9P sont des alias vers les
désignateurs OACI E2 et Q9 dans `aircraft_overrides.json` ; les 20 types militaires autrefois écrits dans
`aircraft_catalog.js` viennent désormais de la liste OACI.

## 1. Références importées (fichiers du dépôt)

| Base | Fichier | Source | Outil de mise à jour | Corrections |
|---|---|---|---|---|
| Types d'aéronefs OACI | `AircraftDB/aircraft_db.js` (non publié, complété sur chaque poste) | OACI Doc 8643 (liste officielle JSON, doc8643.icao.int), EUROCONTROL (aile), Wikidata (repli, filtré) | Paramètres › Maintenance › Références et dépendances (type par type), ou `python update_aircraft_db.py --only CODE…` (dans `AircraftDB/`) | `aircraft_overrides.json` (alias et fiches, appliqués par l'outil) ; page Paramétrage |
| Performances par type | `AircraftDB/aircraft_perf.js` (non publié, complété sur chaque poste) | EUROCONTROL Aircraft Performance Database | même carte, ou `python update_aircraft_db.py --apd CODE…` | aucune : on corrige le parseur |
| Flotte | `data/references/aircraft_fleet.js` | page « Flotte virtuelle » de flotte.defa-virtual.fr (enregistrée) | `python AircraftDB/update_fleet.py Flotte.html` | page Paramétrage (conservées par l'outil) |
| Référence (pilotes, appareils, terrains) | `data/references/defa_reference.js` | journal des vols (page enregistrée, non committée) | `python tools/defa_reference.py "Log des vols.html"` | page Paramétrage (conservées par l'outil) |
| Base SIA (espaces, aérodromes, obstacles…) | cache du Studio (IndexedDB `sia-map-parser`, cycle `airac`) | export officiel du SIA (dossier choisi dans le Studio ; seul le cycle le plus récent est lu) | Paramètres › Maintenance › Données aéronautiques (zone France, source SIA) | — (source officielle) |
| Grille MORA | `data/sia/mora.csv` (cycle des obstacles dans `source`) | relief Terrarium + sommets OSM + obstacles de l'AIXM | Studio › bloc 5 (complet) ; Maintenance › Données aéronautiques › MORA (recalcul simple : obstacles d'un nouveau cycle ; calcul par zone) | — |
| Axes de ravitaillement en vol | lus par `shared/aar_tracks.js` | MILAIP France ENR 5.7 (XML de coordonnées) | chargement du XML (Studio / CR AAR) | — |

## 2. Données utilisateur

| Donnée | Où | Sauvegarde |
|---|---|---|
| Registres de missions (CR) | `data/cr/missions.yaml` (dossier choisi) + navigateur | fichier du dossier ; données locales |
| Registres historiques FIRE / HEMS | CSV du dossier | fichiers (copie de secours `data/cr/mission_ledger_defaults.js` pour `file://`) |
| Indicatifs, organismes → OPR/ | `data/references/callsigns.js` | dépôt (édité dans Paramétrage) |
| Appareils des missions, types ajoutés, indicatifs appris, aérodromes | navigateur (`missionAircraft…`, `dataOverride:*`) | données locales ; intégration dans les fichiers du dépôt par Paramétrage |
| Profils d'appareils du planificateur | navigateur (`flightPerfState`) | données locales ; « Exporter BDD locale » (fichier) |
| OFP SimBrief, calibrations, airframes | navigateur (IndexedDB `FlightPerfCache`) | **données locales** (section `indexed`) |
| Journal d'atterrissages chargé | navigateur (IndexedDB `LandingPerformanceDashboardCache`) | **données locales** (section `indexed`) ; fichier d'origine du plugin |
| Profils d'affichage du Studio, alias de zones, sorties | navigateur (`sia*`) | données locales |
| Profil pilote, préférences | navigateur | données locales |
| Registre des missions générées (statuts, dates de vol, notes, commandes) | navigateur (`missionRegistry:v1`) + `data/missions/mission_registry.yaml` | données locales ; fichier du dossier Missions |
| Missions générées (YAML, Markdown, cartes, PDF) | `data/missions/<lettre>_<FAMILLE>/<identifiant>/` ; une mission reçue dans le générateur y est rangée si le dossier est autorisé, sinon elle reste dans le navigateur (`siaMissionShared:v1`, `siaMissionBatch:v1`) | dépôt de données (git) |
| Canal et mode des mises à jour | navigateur (`suiteUpdate:v1`) ; canal appliqué par git : `git config suite.channel` | données locales |
| Journal des sauvegardes et rechargements | navigateur (`suiteBackupLog:v1`) | données locales (non compté comme modification) |

**Sauvegarde totale** (Paramètres › Maintenance) = les données locales ci-dessous **et** les fichiers connus des
dossiers autorisés (registres des CR, `data/missions/`, profils de performance, configuration du dépôt dont
`flight_performance_database_merged.fpdb.json`, `aircraft_overrides.json`, CSV du Landing Dashboard, `mora.csv`…, et
tout dossier ajouté) dans une archive ZIP avec `manifest.json` (tailles, dates, SHA-256), écrite dans
`<dossier de sauvegarde>/sauvegardes/` ; rechargement fichier par fichier, tracé dans le journal.

**Données locales** = `defa_local_store.yaml` (`shared/browser_store.js`) : tout le `localStorage` et les
bases IndexedDB de données utilisateur, écrits dans le dossier autorisé (automatique toutes les 5 minutes et au
départ de la page ; bouton rouge « 💾 Sauvegarder » après 10 modifications) ; restauration par fusion (la valeur
la plus récente l'emporte).

## 3. Hors sauvegarde, volontairement

| Donnée | Raison |
|---|---|
| Base SIA (IndexedDB `sia-map-parser`) | relue depuis le dossier SIA officiel (son cycle : `airac`, résumé `siaBaseInfo:v1`) |
| Résultat du contrôle de mise à jour, état git lu (`suiteUpdateCheck:v1`, `suiteGitInfo:v1`) | recalculés à la demande |
| Autorisations de dossiers (IndexedDB `missionCore / handles`) | non exportables par le navigateur ; redemandées |
| Journal des vols (`defaFlightLog:v1`) | rechargé depuis sa page ; seule la référence agrégée est committée |
| Clef du webservice d'envoi des CR (`missionSendKey:v1`) | secret : jamais dans un fichier |
| Suivi réseau en cours (`networkWatch:*`) | propre à l'onglet, éphémère |
| Cache HTTP du scrapper (`AircraftDB/aircraft_http_cache.json`) | cache de pages publiques, ignoré par git |
