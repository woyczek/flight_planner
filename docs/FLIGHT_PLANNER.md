# Flight Performance & Fuel Planner

Page : `flight_performance_planner.html` (racine du dépôt) — ☰ › Flight Performance & Fuel
Planner. Application autonome de la suite : profils de performance par avion et devis
carburant, calibrés sur les OFP SimBrief, échangés avec Little Navmap.

Code : la page elle-même, `shared/flight_ui.js` (actions du menu ☰, préférences),
`shared/flight_i18n.js` (traductions FR / EN / DE / ES), et les composants du framework
(bandeau, menu ☰, blocs déplaçables / masquables — voir [FRAMEWORK.md](FRAMEWORK.md)).
Bases partagées : `AircraftDB/aircraft_db.js` (types OACI) et `AircraftDB/aircraft_icons.js`.

## 1. Profils avion

- **Choisir l'avion** : la popup d'en-tête liste les profils de la base locale (icône du type
  OACI). Les avions connus du Landing Performance Dashboard (dernier fichier chargé, lu dans
  sa base IndexedDB `LandingPerformanceDashboardCache`) apparaissent aussi : « connu du Landing
  Performance, pas encore de profil » — le choisir crée un profil vide à compléter.
- **Profil actif** : unité carburant (kg, lb, gal), montée / croisière / descente (TAS,
  consommation horaire, vitesse verticale), roulage, réserve, vent typique, niveau de
  référence, table RPM / puissance → consommation.
- **Données du profil — JSON ⇄ Little Navmap** : édition champ par champ, ou du JSON brut ;
  « Masquer les champs » pour ne garder que le JSON.
- Import : `.lnmperf` (Little Navmap), JSON (profil ou base complète), CSV de performances
  (colonnes phase / RPM / consommation), OFP SimBrief, airframe SimBrief (Internal ID).
  Un import complète le profil existant sans écraser ce qui est déjà renseigné
  (unités converties si besoin) ; les courbes RPM sont fusionnées.
- Export : profil `.lnmperf` (Little Navmap : les champs manquants sont signalés), profil
  JSON, base complète.
- « Supprimer cet avion » retire le profil de la base locale.

## 2. Devis carburant

Entrées : distance (NM), niveau (FL), route vraie, roulage (min), vent (direction / force),
réserve (min), contingence (%).

- Montée et descente d'après les vitesses verticales et consommations du profil ; croisière
  = distance restante / vitesse sol × consommation de croisière.
- **Vent connu** (direction et force) : composante de face / arrière sur la route.
  **Vent inconnu** : fourchette ± vent typique du profil (25 kt par défaut) sur la
  composante — le carburant bloc est donné en fourchette.
- Résultat : roulage, délestage (montée + croisière + descente), contingence, réserve,
  **carburant bloc** ; affichage en kg ou lb (bouton « Affichage »).
- **Altitude optimale** : courbe de rendement selon le niveau (atmosphère standard, TAS
  d'après l'IAS et le niveau de référence du profil) ; lecture au survol.
- « Récupérer dernier FPL SimBrief » : distance, niveau, vent moyen… repris du dernier OFP
  de l'identifiant SimBrief du profil pilote commun (☰ › Profil pilote ; à défaut, celui de
  la base du planificateur).

## 3. Fiche performance moteur

- **Table RPM / puissance → consommation** : interpolation pour un régime et une altitude
  (« Interpoler »), par phase.
- **Cartographie moteur** : édition des points (ajout, suppression, identifiant stable par
  ligne — supprimer une ligne vide ne supprime jamais une autre ligne).

## 4. Calibration SimBrief

- « Importer OFP JSON » ou « Récupérer dernier FPL SimBrief » : le navlog de l'OFP (altitudes,
  temps, carburant, distances) est découpé en montée / croisière / descente ; consommation,
  TAS et vitesses verticales mesurées remplacent celles du profil actif (« Calibrer le
  profil actif »). Une calibration partielle est signalée.
- **Traçabilité de calibration** : date, source, valeurs retenues par phase.
- **Audit OFP** : valeurs brutes et calculées côte à côte ; « Exporter audit JSON ».
- Airframe SimBrief : liste publique `inputs.airframes.json`, sinon lien de partage de
  l'airframe (Internal ID) — sans garantie, l'API publique ne permet pas de lire un airframe
  privé par son seul identifiant.

## 5. Données et sauvegardes

- Base locale persistante dans le navigateur (`flightPerfState`) : profils, réglages du
  devis, dernier avion. La version précédente est gardée (`flightPerfState.backup`) :
  ☰ › « Restaurer la sauvegarde locale précédente » ; le bouton « Recharger la base locale » (barre d’état) relit la
  base enregistrée.
- « Enregistrer / exporter la BDD locale » : `flight_performance_database.fpdb.json` dans le
  **dossier performances** autorisé (☰ › « Choisir le dossier performances », Chrome / Edge),
  sinon téléchargement.
- Préférences (disposition et ordre des blocs, unités) persistantes ; export / import JSON
  (☰ › « Exporter / Importer les préférences »).
- Comme toutes les pages, la base est incluse dans la sauvegarde locale commune
  (☰ › Données locales, `defa_local_store.yaml`).

## 6. Menu ☰ (actions de la page)

Importer profils / CSV / JSON · Importer un airframe SimBrief · Choisir le dossier
performances · Exporter le profil `.lnmperf` · Exporter le profil JSON · Enregistrer /
exporter la BDD locale · Restaurer la sauvegarde locale précédente · Exporter / Importer les
préférences.

## 7. Services externes

SimBrief (dernier OFP de l'identifiant saisi dans le profil pilote, liste publique des
airframes). Rien d'autre ne quitte le navigateur.
