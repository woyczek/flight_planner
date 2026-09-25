# Données de la suite — provenance, mise à jour, sauvegarde

Règle : **aucune donnée ne reste seulement dans le navigateur.** Chaque base est :

- soit une **référence importée** d'une source fiable, par un outil (scrapper / import) qui la reconstruit ;
- soit une **donnée utilisateur**, sauvegardée (fichier du dépôt, ou sauvegarde des données locales) ;
- soit un **cache** reconstructible depuis l'une des deux premières.

Une correction de référence passe par un outil (surcharge traçable, ou correction du scrapper), jamais
par une valeur écrite dans le code.

## 1. Références importées (fichiers du dépôt)

| Base | Fichier | Source | Outil de mise à jour | Corrections |
|---|---|---|---|---|
| Types d'aéronefs OACI | `AircraftDB/aircraft_db.js` | OACI Doc 8643 (PDF), EUROCONTROL, Wikidata (repli) | `python update_aircraft_db.py [--add CODE…]` (dans `AircraftDB/`) | `aircraft_overrides.json` (appliqué par l'outil) ; page Paramétrage |
| Performances par type | `AircraftDB/aircraft_perf.js` | EUROCONTROL Aircraft Performance Database | `python update_aircraft_db.py --apd [CODE…]` | aucune : on corrige le parseur |
| Flotte DEFA | `shared/aircraft_fleet.js` | page « Flotte virtuelle » de flotte.defa-virtual.fr (enregistrée) | `python AircraftDB/update_fleet.py Flotte.html` | page Paramétrage (conservées par l'outil) |
| Référence DEFA (pilotes, appareils, terrains) | `shared/defa_reference.js` | journal des vols DEFA (page enregistrée, non committée) | `python tools/defa_reference.py "Log des vols.html"` | page Paramétrage (conservées par l'outil) |
| Base SIA (espaces, aérodromes, obstacles…) | cache du Studio (IndexedDB `sia-map-parser`) | export officiel du SIA (dossier choisi dans le Studio) | Studio cartographique › dossier SIA | — (source officielle) |
| Axes de ravitaillement en vol | lus par `shared/aar_tracks.js` | MILAIP France ENR 5.7 (XML de coordonnées) | chargement du XML (Studio / CR AAR) | — |

## 2. Données utilisateur

| Donnée | Où | Sauvegarde |
|---|---|---|
| Registres de missions (CR) | `CR DEFA/…/missions.yaml` (dossier choisi) + navigateur | fichier du dossier ; données locales |
| Registres historiques FIRE / HEMS | CSV du dossier | fichiers (copie de secours `shared/mission_ledger_defaults.js` pour `file://`) |
| Indicatifs, organismes → OPR/ | `shared/mission_core/data/callsigns.js` | dépôt (édité dans Paramétrage) |
| Appareils des missions, types ajoutés, indicatifs appris, aérodromes | navigateur (`missionAircraft…`, `dataOverride:*`) | données locales ; intégration dans les fichiers du dépôt par Paramétrage |
| Profils d'appareils du planificateur | navigateur (`flightPerfState`) | données locales ; « Exporter BDD locale » (fichier) |
| OFP SimBrief, calibrations, airframes | navigateur (IndexedDB `FlightPerfCache`) | **données locales** (section `indexed`) |
| Journal d'atterrissages chargé | navigateur (IndexedDB `LandingPerformanceDashboardCache`) | **données locales** (section `indexed`) ; fichier d'origine du plugin |
| Profils d'affichage du Studio, alias de zones, sorties | navigateur (`sia*`) | données locales |
| Profil pilote, préférences | navigateur | données locales |

**Données locales** = `defa_local_store.yaml` (`shared/browser_store.js`) : tout le `localStorage` et les
bases IndexedDB de données utilisateur, écrits dans le dossier autorisé (automatique toutes les 5 minutes et au
départ de la page ; bouton rouge « 💾 Sauvegarder » après 10 modifications) ; restauration par fusion (la valeur
la plus récente l'emporte).

## 3. Hors sauvegarde, volontairement

| Donnée | Raison |
|---|---|
| Base SIA (IndexedDB `sia-map-parser`) | relue depuis le dossier SIA officiel |
| Autorisations de dossiers (IndexedDB `missionCore / handles`) | non exportables par le navigateur ; redemandées |
| Journal des vols DEFA (`defaFlightLog:v1`) | rechargé depuis sa page ; seule la référence agrégée est committée |
| Clef du webservice d'envoi des CR (`missionSendKey:v1`) | secret : jamais dans un fichier |
| Suivi réseau en cours (`networkWatch:*`) | propre à l'onglet, éphémère |
| Cache HTTP du scrapper (`AircraftDB/aircraft_http_cache.json`) | cache de pages publiques, ignoré par git |
