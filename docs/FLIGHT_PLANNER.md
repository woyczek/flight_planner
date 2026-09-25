# Flight Performance & Fuel Planner

Page : `flight_performance_planner.html` (racine du dépôt) — ☰ › Flight Performance & Fuel
Planner. Application autonome de la suite : profils de performance par avion et devis
carburant, calibrés sur les OFP SimBrief, échangés avec Little Navmap.

Code : la page elle-même, `shared/flight_ui.js` (actions du menu ☰, préférences),
`shared/flight_i18n.js` (traductions FR / EN / DE / ES), et les composants du framework
(bandeau, menu ☰, blocs déplaçables / masquables — voir [FRAMEWORK.md](FRAMEWORK.md)).
Bases partagées : `AircraftDB/aircraft_db.js` (types OACI) et `AircraftDB/aircraft_icons.js`.
Profil vertical : `shared/flight_vertical_profile.js` et le module du studio SIA
(`SIA XML/vertical_profile.js`, `SIA XML/aero_symbols.js`).

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

- Montée et croisière au niveau du plan d'après le **modèle de performances** (§ 2 bis) :
  montée intégrée au Badin de montée du profil (vario et débit selon l'altitude), TAS et
  débit de croisière à ce niveau ; descente au vario et au débit du profil ; croisière =
  distance restante / vitesse sol × débit.
- **Vent connu** (direction et force) : composante de face / arrière sur la route.
  **Vent inconnu** : fourchette ± vent typique du profil (25 kt par défaut) sur la
  composante — le carburant bloc est donné en fourchette.
- Résultat : roulage, délestage (montée + croisière + descente), contingence, réserve,
  **carburant bloc** ; affichage en kg ou lb (bouton « Affichage »).
- **Altitude optimale** et **montée optimale** : voir § 2 bis.
- « Récupérer dernier FPL SimBrief » : distance, niveau, vent moyen… repris du dernier OFP
  de l'identifiant SimBrief du profil pilote commun (☰ › Profil pilote ; à défaut, celui de
  la base du planificateur).

## 2 bis. Modèle de performances — altitude et montée optimales

**Mise en page.** Colonne gauche : saisie, courbes (altitude optimale, vario de montée, vitesses de
montée), comparaison des lois, table par altitude. Colonne droite : bloc Résultat, puis un panneau
d'explications par courbe (optimums, relevé de la jauge, légende, lecture) ; ces cadres suivent leur
courbe (framework `StickyFrame`). Collé, le bloc Résultat se réduit à Block fuel · TOD. Code :
`shared/flight_perf_view.js` (fonctions documentées).

**Lecture.** Chaque panneau dit comment lire sa courbe ; définitions (Vy, Vx, Badin, TAS…) au survol
des termes soulignés. Couleur : une par série, sur le trait et le libellé seulement. Le bloc
**Limites** (panneau de l'altitude optimale) indique le plafond retenu et sa source (champ « Plafond max (ft) » du profil ou calcul du
modèle), le niveau demandé et le niveau le plus haut possible sur la distance ; chaque
« inatteignable » donne sa cause et le champ à modifier. Les trois courbes en altitude partagent une
jauge ; un clic épingle un niveau, résumé dans la fiche ⌖ / 📌 du bloc Résultat.

**Loi réglable (violet).** Deux curseurs verticaux autour de chaque courbe : vario visé à gauche,
Badin à droite (partagés par les trois courbes ; ligne pointillée violette : vario visé). Les gaz sont réduits pour
tenir le vario, plein gaz au-delà (le vario baisse jusqu'au plafond) ; réacteur : Badin puis Mach de
croisière. La loi apparaît sur les deux courbes de montée, dans la table comparative et dans la fiche.

**Croisière limitée par la poussée.** Au-dessus du niveau où le Mach du profil n'est plus tenable,
un réacteur vole à la plus grande vitesse permise par 92 % de la poussée (« poussée max. ») ; le
niveau n'est refusé qu'au-delà du plafond de croisière. La montée au Badin du profil passe en Mach
au-dessus de l'altitude de conjonction.

**Données EUROCONTROL APD.** Si `AircraftDB/aircraft_perf.js` contient le type, l'éditeur de profil
affiche une étiquette APD à côté des champs correspondants (vert : identique à ±3 %, orange :
différent, bleu : vide localement) ; un clic reprend la valeur, « remplir les champs vides » les
reprend toutes. Vario moyen de montée / descente calculé par tranches APD jusqu'à l'altitude de
référence ; altitude de référence déduite du couple TAS / Mach.

`shared/flight_performance_model.js`, commun au devis, aux courbes et aux profils verticaux (planificateur
et studio SIA). Mécanique du vol simplifiée, **calibrée sur le profil** et indépendante du niveau saisi :

- atmosphère type (ISA) ; polaire parabolique (finesse max, vitesse de traînée mini calée sur le Badin de
  montée : montée économique d'un réacteur ≈ 1,38 × traînée mini, Vy d'un avion à hélice ≈ traînée mini) ;
- **réacteur** : débit ∝ poussée × √θ × (1 + 0,8 M), poussée ∝ σ^0,75 puis ∝ σ au-dessus de la
  tropopause ; **turbopropulseur / piston** : débit ∝ puissance, puissance ∝ σ^0,7 ou (1,132 σ − 0,132),
  rendement d'hélice réduit à basse vitesse ; motorisation d'après la base OACI (champ « Motorisation »
  pour la forcer) ;
- calibration : débit par le point de croisière (TAS, débit, **altitude de référence** — écrite par la
  calibration OFP avec le Badin moyen de chaque phase ; sinon Badin / TAS, sinon cohérence du débit de
  montée, sinon valeur type signalée — jamais le niveau du plan) ; poussée / puissance par le vario moyen
  de montée ; débit de montée recalé sur celui du profil ; plafond du modèle (vario 300 ft/min, 100 pour un
  piston) limité par le plafond du profil.

**Altitude optimale** (courbes NM / carburant du trajet selon le niveau, montée et descente comprises) :
régime **économique** (distance max. : ≈ 1,32 × traînée mini pour un réacteur, traînée mini pour une
hélice) et régime **du profil** (Mach de croisière, Badin limité à 290 kt, ou puissance de croisière,
plein gaz au-dessus) ; un optimum par courbe : **carburant au régime du profil** (bleu), **carburant au
régime économique** (vert, avec son écart de carburant et de durée) et **vitesse** (durée, orange) ; la
jauge donne carburant, durée et TAS des deux régimes ; croisière
seule (rendement max., plage à 1 % : la courbe d'un avion à hélice est plate) ; comparaison au niveau du
plan ; plancher pratique 1000 ft.

**Montée optimale** — trois optimums incompatibles : **Vy** (vario max., niveau atteint au plus tôt),
**montée rapide** (temps de bloc minimal) et **montée économique** (carburant du trajet minimal ; pour une
hélice, gaz optimisés) ; pour les deux dernières, la distance parcourue en montée est retranchée de la
croisière, le vario reste ≥ 50 % du vario max., et un réacteur est limité à 250 kt sous FL100. Lois de
Badin selon l'altitude (seconde courbe, jauge), table comparant Badin du profil, Vy, rapide et
économique (montée et trajet entier, meilleur marqué ★). Vx (pente max.), vario, débit et **carburant
par 1000 ft** selon l'altitude (courbe et table, cumuls depuis le sol) ; montée au niveau du plan au Badin du profil ou à Vy
(temps, distance, carburant, et lequel économise sur le trajet) ; **régimes de la table RPM / N1** : gaz,
vario au sol et à mi-montée, carburant par 1000 ft, le plus économique marqué ★.

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

## 5. Profil vertical

Bloc **Profil vertical** : coupe le long d'une **route** — relief (tuiles d'altitude, ± 1 km),
espaces aériens traversés (plancher → plafond, libellés de tous), obstacles, points avec distances
cumulées, et **plan de vol** : trajectoire prévue (montée, paliers, descente) avec **TOC** et **TOD**.

- **Route** : même syntaxe que le studio SIA — OACI, balises, points RNAV, « REN300010 »
  (radiale / distance), « lat lon » ou « NOM lat lon » ; **groupes vitesse / niveau** du plan de
  vol (`N0450F350` : 450 kt au FL 350 ; vitesse N nœuds, K km/h, M Mach ; niveau F niveau de vol,
  A altitude, S niveau métrique, M altitude métrique) après un point ou seuls ; « /3000 » = altitude
  à atteindre au point ; **VFR** = pas de niveau (pas de trajectoire). La **case 15** d'un plan de
  vol (séparée par des espaces : `LFBO N0450F350 DCT TOU UN460 NTS/N0440F370 LFRN`) est acceptée :
  DCT, voies aériennes et SID / STAR sont sautés (tracé direct), coordonnées `4630N00130E`.
- **OFP SimBrief** : l'import d'en-tête (« Récupérer dernier FPL SimBrief » ou OFP JSON) remplit la
  route et trace le profil — départ, groupe vitesse / niveau initial (TAS de croisière, niveau
  initial), points du navlog, paliers de croisière (step climbs), arrivée ; TOC / TOD recalculés.
- **Montée** selon le modèle de performances de l'avion actif (vario et TAS selon l'altitude), à défaut
  ses taux constants (ou 1000 ft/min à 140 kt) ; **descente** au vario et à la TAS du profil ; départ et
  arrivée au sol (altitude du terrain), paliers aux niveaux déposés.
- **Profil d'affichage** : ceux du studio cartographique ; par défaut celui choisi dans le studio
  pour le profil vertical (« Profil vertical » : toutes les familles d'espaces). Il décide des
  espaces, des obstacles et des noms abrégés.
- **Plancher / plafond** de la coupe (0 = automatique).
- **Base SIA** (espaces, aérodromes, balises, points RNAV, obstacles) : celle que le studio
  mémorise dans le navigateur — ouvrir le studio (Missions SIA) et y charger le dossier SIA une
  fois, dans le même navigateur et à la même adresse. Sans elle : points en coordonnées ou
  SimBrief seulement, sans espaces.
- Route, plancher et plafond sont mémorisés (localStorage `flightPerfVerticalProfile`).

## 6. Données et sauvegardes

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

## 7. Menu ☰ (actions de la page)

Importer profils / CSV / JSON · Importer un airframe SimBrief · Choisir le dossier
performances · Exporter le profil `.lnmperf` · Exporter le profil JSON · Enregistrer /
exporter la BDD locale · Restaurer la sauvegarde locale précédente · Exporter / Importer les
préférences.

## 8. Services externes

SimBrief (dernier OFP de l'identifiant saisi dans le profil pilote, liste publique des
airframes). Rien d'autre ne quitte le navigateur.
