# Changelog — X-Plane Web Suite (DEFA Virtual)

Toutes les évolutions notables de la suite (CR DEFA, Landing Performance Dashboard, Flight
Performance & Fuel Planner, Missions SIA, framework commun). Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation `majeur.mineur.correctif`.
La version affichée en pied de page de chaque page (lien vers ce fichier) vient de
`repository_tree` (`release`).

Dépôt : <https://framagit.org/asr/flight_planner> — demandes de fusion : `!n`.

## [Non publié]

- **Scrapper des types (update_aircraft_db.py)** : la source OACI Doc 8643 était hors service (PDF en 404) —
  remplacée par la liste officielle JSON de l'OACI (7 262 entrées, nom représentatif par désignateur) ;
  position d'aile cohérente avec la classe OACI (plus de « rotor » pour le Rafale ou le MQ-9) ; option
  `--only`. Les 20 types militaires écrits en dur dans `aircraft_catalog.js` viennent maintenant de la base
  (E2C → E2, RQ9P → Q9 en alias dans `aircraft_overrides.json`).
- **Données — inventaire et sauvegarde** : `docs/DONNEES.md` recense chaque base (référence importée par un
  outil, donnée utilisateur sauvegardée, ou cache reconstructible). Les sauvegardes des données locales
  incluent désormais les bases IndexedDB de données utilisateur (OFP / calibrations du planificateur, journal
  d'atterrissages chargé), restaurées par fusion.
- **Base des types — passe EUROCONTROL APD** (252 types) : 173 fiches de performances dans
  `AircraftDB/aircraft_perf.js` (comparées aux profils dans le planificateur), 141 noms de modèle réparés dans
  `aircraft_db.js` (« Aircraft Performance Database », « Skip to aircraft details »), 79 types sans fiche APD.
- Code : carte et spécification des fonctions du planificateur (`flight_performance_planner.html`) et de
  `flight_ui.js` (commentaires seulement).
- **Planificateur** : aide au survol de chaque champ du profil (contenu et usage par le modèle, 4 langues,
  `shared/flight_profile_help.js`) ; Vx partout où figure Vy (fiche du curseur, panneaux, relevés, courbe
  des vitesses en pointillés fins).
## [2.2.4] — 2026-09-25

- **CR DEFA — description de famille dans l'en-tête** : elle était posée mais masquée (règle CSS qui cachait le
  sous-titre quand l'en-tête porte la barre d'outils) ; affichée sur toutes les pages de CR et de reporting,
  anciennes pages FIRE et HEMS / MEDEVAC comprises, même texte qu'au survol des tuiles de « Nouveau compte rendu ».
- **Planificateur — vue des courbes robuste** : chaque courbe et table est dessinée isolément ; une erreur
  n'emporte que sa courbe (cause affichée dans son panneau, détail en console). Sans niveau atteignable, les
  courbes de montée restent affichées et la cause est précisée (plafond sous 1000 ft, trajet trop court).
- **Landing dashboard — traducteur commun** : libellés statiques (titres, options, menus) traduits par
  `content_i18n.js` à partir des dictionnaires de la page, typographie commune partout ; zones calculées
  (cartes, courbes, tables, état) en `data-no-i18n`. Traducteur : conteneur `[data-i18n]` traduit même
  rangé dans le menu ☰.
- **Typographie** (`content_i18n.js`, toutes les pages traduites) : en français, espace fine insécable (U+202F)
  avant « : ; ! ? » » et après « « » — le retour à la ligne ne rejette plus la ponctuation en début de ligne ;
  en anglais, allemand et espagnol, plus d'espace avant « : ; ! ? ». Appliquée à l'affichage (textes et
  attributs, outils d'en-tête compris), jamais aux sources. Planificateur : scripts partagés versionnés (cache).
- **Framework — `sticky_frame.js`** : cadres semi-mobiles (`StickyFrame.stick` / `follow`), repris par le
  Studio cartographique (colonne d'aperçu, même comportement) et le planificateur.
- **Planificateur — vue des courbes réorganisée** (`shared/flight_perf_view.js`, fonctions documentées) :
  courbes à gauche ; à droite le bloc Résultat (compact une fois collé) et un panneau d'explications par
  courbe qui la suit au défilement ; loi réglable en **curseurs verticaux** (vario à gauche, Badin à
  droite) sur chaque courbe, courbe violette aussi sur l'altitude optimale ; couleur au libellé seulement,
  une taille de texte ; définitions au survol ; groupe Régimes de vol repliable.
- **Planificateur** : fiche curseur (⌖ survol, 📌 épinglé) dans le bloc Résultat, suivie du groupe **Régimes de vol**
  (ancien bloc « Profil actif ») ; le bloc Résultat **reste fixe au défilement** jusqu'à la rangée moteur / RPM ; **loi de montée réglable**
  (Badin et vario visé, en violet sur les courbes, dans la table et la fiche) ; croisière d'un réacteur
  **limitée par la poussée** au lieu d'un niveau « inatteignable » ; montée au Badin du profil **puis en Mach**
  (un Badin constant dépassait Mach 0,9 en altitude) ; croisière économique jamais plus rapide que celle
  du profil ; jauges : un seul enregistrement par courbe redessinée.
- **Base des types — EUROCONTROL APD** : `update_aircraft_db.py --apd` lit le tableau de performances de
  chaque type → `AircraftDB/aircraft_perf.js` et répare les noms de modèle mal lus (143 entrées) ;
  écritures atomiques réessayées si un client de synchronisation verrouille le fichier. L'éditeur de
  profil compare les champs aux valeurs APD (étiquettes identique / différent / vide, reprise au clic).

## [2.2.3] — 2026-09-25

- **Planificateur — courbes de performance plus lisibles** : bloc « Comment lire ces courbes » (marche à suivre
  de graphe en graphe, définitions Vy / Vx / Badin / TAS / TOC / TOD, 4 langues) ; les trois courbes en altitude
  ont une **jauge commune** (survol) et un **clic épingle un niveau** (trait blanc sur les trois + fiche 📌 :
  croisières, vario, vitesses à tenir) ; vocabulaire explicite (« croisière du profil », « croisière économique »,
  « vitesse de montée du profil »). Ligne **Limites** : plafond retenu et sa source (champ « Plafond max » du
  profil ou modèle), niveau demandé, niveau le plus haut possible sur la distance ; chaque « inatteignable »
  donne sa cause (trajet trop court, plafond, poussée) et le champ à modifier.
- Correctif : un commentaire `//` dans `content_i18n.js` minifié cassait la traduction de toutes les pages.
- **CR DEFA — nouvelle famille AAR / ravitaillement en vol** : rôle (ravitailleur / ravitaillé),
  hippodrome du MIAM ENR 5.7 ou autre zone, niveau, type de rendez-vous, système (perche, panier,
  nacelles), ravitaillés (indicatif, type, carburant prévu / transféré, contacts, résultat), bilan
  carburant, breakaways, incidents ; statistiques et synthèse ; pages `CR DEFA/AAR/`. Les missions
  « ravitaillement / refuelling / tanker » (brief SIA, journal DEFA) y sont rangées (auparavant
  transport / spécial).
- CR DEFA : **police du ciel / interception (QRA)**, nouveau sous-type de COMMAND (aéronef intercepté,
  motif, délai alerte → décollage, mesure prise, déroutement ; événements scramble, interception,
  identification) ; libellés plus clairs (« Commandement / police du ciel / guet aérien », « Contrôle en
  vol des aides radio ») ; **description de chaque famille** (4 langues) en sous-titre des pages de CR /
  reporting et au survol dans « Nouveau compte rendu ». Recherche de famille dans les 4 langues.
- Traduction : morceaux de texte composés (« Types d’appareil : aucune », « Dossier : navigateur
  uniquement », liste des familles de l’en-tête) désormais traduits en entier.
- « Nouveau compte rendu » : **champ de recherche** de la famille — la description de la mission
  (« évasan hélico », « ravito », « police du ciel »…) est comparée aux mots-clés de chaque famille
  (synonymes FR / EN, appareils et indicatifs typiques, expressions) ; familles classées, les autres
  estompées, Entrée ouvre la première. Recherche locale, sans service en ligne.
- Planificateur : **triangle des optimums de montée** (Vy, montée rapide — temps de bloc, montée
  économique — carburant, gaz compris pour une hélice), lois de Badin selon l'altitude, table
  comparative montée / trajet ; altitude optimale : un optimum par courbe (profil, économique, vitesse)
  au lieu d'un minimum mélangé, relevé de jauge coloré ; textes du planificateur dans les 4 langues.
- Planificateur : jauges déplaçables et valeurs sous les courbes de montée et RPM / consommation ;
  légendes aux couleurs des courbes.
- **Flight Performance & Fuel Planner — Profil vertical** : bloc de coupe le long d'une route
  saisie ou reprise de l'OFP importé en en-tête (paliers compris) ; trajectoire prévue aux taux
  de montée / descente du profil avion actif, **TOC** et **TOD** ; profil d'affichage du studio SIA
  (par défaut celui choisi dans le studio) et base SIA mémorisée par le studio.
- Profil vertical (studio et planificateur) : **groupes vitesse / niveau** du plan de vol
  (`N0450F350`, K / M, F / A / S / M), **VFR**, case 15 (DCT, voies aériennes, coordonnées
  `4630N00130E`) ; trajectoire tracée sur la coupe.
- **Flight Performance & Fuel Planner — modèle de performances** (`shared/flight_performance_model.js`) :
  mécanique du vol calibrée sur le profil (polaire, poussée / puissance selon la densité et la
  motorisation, consommation) ; **altitude optimale** carburant et vitesse (régime économique et régime
  du profil, montée et descente comprises), **montée optimale** (Vy, Vx, vario et carburant par 1000 ft
  selon l'altitude, régimes RPM / N1) ; devis carburant au niveau du plan par le même modèle.
  Correctif : l'optimum ne dépend plus du niveau saisi (il servait de référence quand le profil n'en
  avait pas) ; la calibration OFP enregistre le niveau de croisière et le Badin moyen de chaque phase ;
  champ « Motorisation ».
- Profil vertical : montée selon le modèle de l'appareil (planificateur : avion actif ; studio : appareil
  choisi parmi les profils du planificateur), taux saisis en secours.
- Surfaces bâties : contour **orange** autour des agglomérations des villes ≥ 100 000 hab.,
  **jaune** autour des autres.
- Studio SIA : **plancher** de la coupe réglable (en plus du plafond) ; points « NOM lat lon ».
- Module `SIA XML/vertical_profile.js` partagé : sélection des espaces d'un profil, résolution
  des points, relief (le studio s'en sert aussi).

## [2.2.2] — 2026-09-25

Studio cartographique (Missions SIA) : symboles OACI.

- Onglet **Aérodromes et radionav** renommé **Symboles OACI**.
- **Survol interdit** (installations portant une marque distinctive) : les symboles ⊗ ne se
  recouvrent plus (les plus grands sites d'abord).
- **Parcs et réserves naturels** de nouveau affichés : 117 des 143 de l'AIXM ne sont qu'un point
  et étaient écartés ; ils ont maintenant un symbole vert (base à relire une fois).
- **Agglomérations** dans l'onglet Symboles OACI : surfaces bâties dessinées par le studio sur tous
  les fonds (raster compris), au choix **aucune / contour / remplissage / contour + remplissage**
  (orange / jaune OACI), seulement autour des villes d'au moins **N habitants** (réglable, 20 000
  par défaut) ; polygones OpenMapTiles, visibles dès l'échelle régionale, contour sans coutures de
  tuiles. Villes en symboles OACI (grande ville tache orange, ville jaune, localité point jaune),
  affichées même sans « Libellés de villes » (symbole seul).
- Correctif : le contour orange des surfaces bâties s'affichait même couche décochée ; les surfaces
  bâties n'apparaissaient pas à l'échelle régionale sur le fond vectoriel par défaut.
- Libellés courts, détails en sous-titre (villes OACI, parcs et réserves).
- Onglet Fond de carte : cadre **Villes et agglomérations** (libellés, population, symboles OACI,
  surfaces bâties) ; onglet Symboles OACI : **obstacles** regroupés avec survol interdit et parcs.
- Correctif : surfaces bâties absentes quand la carte se chargeait en arrière-plan (source intégrée au style).
- **Profil vertical** (nouveau) : cheminement (points de la mission, aérodromes, balises,
  coordonnées, altitude prévue « /3000 » ou « /FL65 »), coupe relief / obstacles / espaces traversés
  en second aperçu, image `profil_vertical.png` dans le ZIP (facultative) et dans le brief PDF ;
  réglages enregistrés dans le YAML de la mission (`vertical_profile`). Cheminement fait de tous
  les points connus : brief, aérodromes, balises, points RNAV de l'AIXM, radiale / distance
  « REN300010 » ; tracé sur les cartes (aperçu et PNG).
- Le profil vertical est une **carte comme les autres** : entrée `profil_vertical.png` dans la liste
  des cartes, avec son profil d'affichage (nouveau profil par défaut **Profil vertical** : toutes
  les familles d'espaces, aucune autre case) ; espaces et obstacles de la coupe selon ce profil ;
  libellés de **tous** les espaces traversés (place libre, sinon trait de rappel) ; plafond
  automatique couvrant leurs planchers (jusqu'au FL 195).
- Case **Noms abrégés** (onglet Zones) : nom seul, sans le type de zone (cartes et coupe).
- Villes : curseurs de population logarithmiques dès 1 000 habitants, seuils séparés pour les
  symboles, les libellés et les surfaces bâties ; villes de l'aperçu dessinées sur le canvas
  (placement accéléré par grille : des milliers de villes).
- Correctif : colonne de l'aperçu plus haute que la fenêtre (bas inaccessible). Le fond de
  l'aperçu interactif qui s'efface au défilement reste un bug connu.
- Tour de commentaires dans le code (en-têtes de fichiers, sections) ; section **Bugs connus**.

## [2.2.1] — 2026-09-25

Corrections du studio cartographique (Missions SIA).

- **Outre-mer** : toutes les zones, aérodromes et balises sont de nouveau sélectionnables (Nouméa,
  Polynésie…) ; seul le dessin est limité à l'emprise affichée (rien de l'autre côté du globe).
- **Aérodromes** : ne sont plus masqués par leurs propres balises (LFRN restait invisible derrière
  le DME et l'ILS de Rennes) ; priorité aux plus grands et aux contrôlés ; liste blanche opérante.
- **Radionavigation** : TACAN visibles (au-dessus des symboles de bases aériennes) ; priorité
  TACAN > VOR > DME > NDB > ILS > DME d'ILS (bout de piste) ; libellés rétablis (ils se rejetaient
  eux-mêmes) ; cases « libellés » séparées pour les aérodromes, les balises et les espaces.
- Nouvel onglet **Aérodromes et radionav** (devenu **Symboles OACI** en 2.2.2) ; **installations portant une marque distinctive**
  (survol interdit < 1000 m / 3300 ft, 198 sites de l'AIXM, symbole ⊗) et parcs / réserves.
- Espaces : **opacité réglable** (50 % par défaut) ; libellés de villes et de points tournants
  réservés avant les cartouches de zones (plus de recouvrement).
- **Libellés de villes** sans recouvrement : les villes les plus peuplées d'abord, une ville dont le
  libellé recouvrirait un autre n'est pas écrite (PNG, SVG, carte de contrôle).
- Blocs : 1. Mission (avec « Afficher toutes les cartes » et « Générer »), 2. Profils, 3. Cartes.
- Fenêtre séparée : synchronisée aussi pour le profil de chaque carte et les cartes ajoutées ;
  carte agrandie (⤢) et fenêtre séparée réduites à la carte et à ses commandes.

## [2.2.0] — 2026-09-25

Nouvelle application **Missions SIA** (générateur de mission et studio cartographique), corrections
de la suite.

### Suite

- **Fusions / renommages** (pilotes, appareils) : une fusion faite dans un sens puis renommée dans
  l'autre créait une boucle (A → B et B → A) qui échangeait les deux noms (cas GRR / RBR) et
  empêchait tout nouveau renommage. Le renommage retire l'équivalence contraire, les chaînes sont
  suivies sans boucle ; Paramétrage › **Fusions et renommages** liste les équivalences, signale
  les boucles et permet de les supprimer.
- **Rappel de sauvegarde** : bouton rouge « Sauvegarder dans le dossier (n) · dernière : … » après
  10 modifications des données du navigateur ; il disparaît après la sauvegarde.
- En-têtes des pages Missions SIA alignés sur ceux des autres applications (bandeau pleine largeur,
  titre, boutons, menu ☰ à droite) ; sorties des cartes (PNG, SVG, largeur) dans le menu ☰ comme
  le profil pilote.

### Missions SIA (nouvelle application, dossier `SIA XML/`)

- **Documentation** : [docs/SIA_MISSIONS.md](docs/SIA_MISSIONS.md) (générateur de mission et studio :
  données, format des missions, profils, zones, MORA, hippodromes, stockage, services) ; README
  EN / FR (quatre applications), INSTALL (données SIA), tutoriel (§ 13, mission SIMONE), manuel
  d'exploitation (§ 9.1 : cycle AIRAC, MORA, axes ENR 5.7), FRAMEWORK (`aar_tracks.js`,
  passerelle mission → CR, dossier `__sia`).

- **Générateur de mission** et **studio cartographique** intégrés à la suite : bandeau et menu
  communs (thème et favicon SIA), blocs masquables / déplaçables, pied de page de version,
  js-yaml commun ; historique du dépôt d'origine repris.
- Studio : **hippodromes de ravitaillement** (MILAIP ENR 5.7) tracés exactement pour les axes
  de la mission (cap, longueur, largeur, côté ; côté non publié en pointillés) ;
  `miam-enr-5-7-tracks.xml` nommé et corrigé depuis le PDF (`shared/aar_tracks.js`).
- Studio : choix de **fonds vectoriels** (OSM Shortbread réglable, OpenFreeMap Liberty / Bright /
  Positron, VersaTiles Colorful / Graybeard / Shadow / Eclipse), relief et courbes ajoutés aux
  fonds publiés.
- Studio : **profils d'affichage** (ajout, duplication, suppression) regroupés dans le bloc 3
  avec les zones, et **carte de contrôle** en colonne de droite (carte de la mission au choix,
  profil en cours, actualisée à chaque réglage) ; bouton « Retour » / « Transmettre » dans la
  barre d'en-tête, menu ☰ à droite.
- Studio : les **autres éléments** (points tournants, hippodromes, cercle de zone, quadrillage,
  MORA, tailles et couleurs des libellés) font partie du profil, comme les zones et les couches ;
  chaque carte est dessinée avec les réglages de son profil. Bloc 4 : données complémentaires
  (import MORA, calibration du fond local).
- Studio : **couches OSM sur tous les fonds vectoriels** (OpenFreeMap, VersaTiles : couches du
  style regroupées par source ; POI et numéros masqués) ; seuls les fonds raster les désactivent.
- Studio : collage de mission dans la fenêtre de copier-coller commune.
- **Passerelle vers CR DEFA** : « Créer le CR DEFA » (générateur de mission) ouvre un nouveau CR de
  la famille du type de mission (MEDEVAC → HEMS, TRAINING → SPECIAL…), pré-rempli : nom et numéro,
  objectif, terrains (OACI du nom), points et coordonnées, appareils (type OACI du catalogue,
  indicatif ; à défaut, équipes dotées d'un aéronef), exploitant, charge.
- Studio : **grille MORA calculée** (1° × 1°) : point le plus haut — relief Terrarium (z9 puis
  z12 autour des maxima), sommets OSM, obstacles de l'AIXM SIA (13 836) — + 1000 ft (2000 ft
  au-delà de 5000 ft), arrondi à la centaine ; relief majoré de 100 m si les sommets OSM sont
  indisponibles. Remplace l'import PDF : la carte ENR 6.1 n'a pas de grille (ses valeurs sont
  celles de zones irrégulières), l'ancien `mora.csv` était faux. `mora.csv` régénéré (150
  cellules, 1000 à 18 100 ft). Valeurs non certifiées.
- Studio : grille MORA affichée en **valeurs seules** (le quadrillage fait la grille), centrées dans
  les carrés ; en zoom arrière, cellules fusionnées par 2 × 2 puis 4 × 4 (valeur la plus haute),
  seuil réglable (« espacement minimal des valeurs »), blocs calés sur le quadrillage.
- Studio, sélection des zones : groupes « R 166 — 4 zones (A1, A2, B, C) » dans la complétion
  (identifiant de base : numéro de tête, ou nom sans son numéro final) ; zones
  déjà ajoutées retirées des choix.
- Studio, sélection des zones : tri par famille (R, P, D, CTR, TMA, SIV) puis par numéro (12 avant
  118) ; « Tout supprimer » ; collage d'une liste (une zone par ligne) ; complétion sur toutes les
  familles avec limites verticales ; **alias** modifiables communs aux profils (« @RTBA », proposé
  d'après les zones AZBA de la base SIA).
- Studio : libellés des zones avec leurs limites verticales (« 800 ft ASFC – 2700 ft ASFC ») ;
  libellés des zones, quadrillage et MORA lisibles sur la carte de contrôle (échelle écran).
- Studio, bloc « Profils d'affichage » compact : barre de profil, onglets Fond de carte / Zones /
  Éléments, colonnes 60 / 40 réglables par une barre de redimensionnement (double-clic : 60 / 40),
  carte de contrôle agrandissable (⤢, Échap).
- Studio : **hippodrome choisi explicitement** par mission (Automatique — axe détecté et raison —,
  Aucun, ou l'un des 31 axes) ; axes ENR 5.7 mémorisés avec la base (fonctionne sans relire le
  dossier, y compris en `file://`) ; base mémorisée d'une version précédente relue automatiquement.
- Studio : valeurs MORA lisibles (12 pt, opacité 90 %, halo non atténué).
- Studio : **symbologie des cartes OACI** (légende SIA / IGN) : espaces contrôlés par classe,
  R / D hachurées, P quadrillées, RTBA, croix des petites zones, cartouches nom / plafond /
  plancher ; **tranche d'altitude** affichée (plancher / plafond).
- Studio : **aérodromes** (type de piste, orientation, CAP / restreint / État), **radionavigation**
  (VOR, VOR-DME, VOR-TACAN, TACAN, DME, NDB, rose magnétique), **obstacles** (hauteur minimale,
  balisage, groupes, éoliennes) lus dans l'AIXM SIA (`SIA XML/aero_symbols.js`).
- Studio : colonne de droite = carte de contrôle, commandes (Refresh, **Reprendre le cadre**,
  ⌂, Rétablir, Appliquer, ⧉, ⤢), liste des cartes, **profil de la carte choisie** (plus de liste
  déroulante de carte ni de profil) ; cases à cocher de taille fixe ; champ d'ajout de carte élargi.
- Studio : **ILS** ; priorité des balises (TACAN > VOR > DME > aérodrome > NDB > ILS, élément
  recouvert masqué) ; libellés des grandes zones prioritaires ; MORA décalée pour ne rien
  recouvrir ; taille de la rose des VOR ; **listes** d'aérodromes et de balises (blanche / noire) ;
  croix des petites zones cochée par défaut.
- Studio : erreurs de fond expliquées, secours OSM standard, rapport d'erreur à copier ; course
  entre deux rafraîchissements corrigée (« reading 'layers' »).
- **Mission partagée** générateur ⇄ studio (`SIA XML/mission_store.js`) : un seul document avec
  révision, enregistré à chaque modification et relu par l'autre page ; lecture Markdown / YAML
  commune. Studio : **emprise** de chaque carte modifiable (zoom, déplacement, vue affichée),
  **Appliquer** l'écrit dans la mission (`bbox`), valeurs d'origine gardées jusque-là ; cartes
  **ajoutées / supprimées** ; position de la carte conservée au rafraîchissement, ⌂ pour revenir
  à la position définie.
- Studio : blocs réordonnés (Mission, Sorties, Profils, Base SIA, Données complémentaires) ; liste
  des cartes et profils sous la carte de contrôle ; type de sortie et largeur PNG dans le menu ☰.
- Studio : lecture AIXM corrigée — **arcs** dans le bon sens (du sommet porteur au suivant) et
  **cercles** (185 espaces, dont CTR RENNES absente et CTR NANTES tronquée) ; familles CTA, TRA,
  RMZ, TMZ, PJE ; **territoire** de la mission (plus d'espaces ni d'aérodromes d'outre-mer sur une
  mission en métropole) ; filtres des aérodromes (CAP, restreints, État, hélistations, bandes ;
  contrôlés / non contrôlés) et des balises (VOR, TACAN, DME, NDB) ; libellés sans recouvrement
  (centre puis contour) ; taille des libellés des espaces et altitudes facultatives dans l'onglet
  Zones ; bande OACI uniforme, croix des petites zones facultative.
- Studio : plusieurs hippodromes à la fois (liste à cocher) ; carte de contrôle dans une
  **fenêtre séparée synchronisée** (⧉) ; colonnes redimensionnables jusqu'à 25 / 75 sans
  débordement du bloc de sélection des zones.
- Studio : « Autres éléments » regroupés par élément (case à cocher en titre, réglages grisés
  quand l'élément est décoché).
- Studio : **quadrillage** au pas adapté à l'emprise (1′ à 5°), libellés en degrés et minutes ;
  quadrillage et MORA aussi sur la carte de contrôle dynamique.
- Studio : **sélection des zones** refaite : liste de zones (puces supprimables, nombre de contours
  reconnus), champ d'ajout avec complétion (« R 45 A », « CTR BEZIERS 2 »), mode **liste blanche /
  liste noire**, liste des zones retenues à côté ; comparaison sans espaces, tirets ni accents
  (l'ancienne liste ne reconnaissait pas « LF-R 45 A »).
- Studio : coche globale « toutes » pour les zones R / D / P et les espaces contrôlés ; profil
  « Désactivé » par carte (carte ni générée, ni prévisualisée, ni sur l'assemblage).
- Générateur de mission : nom des exports `S1-M11_AIRLIFT_Pont_logistique_vers_Solenzara`
  (série-numéro, type, titre ou cible) ; résumé et description proposés depuis les données quand
  le fichier n'en contient pas (points, rendez-vous et participants, zone, consignes, axe de
  ravitaillement ENR 5.7 : route, longueur, largeur, sens des virages).
- **Dossier SIA XML mémorisé** (`FileAccess`, clef `__sia`) : « Relire le dossier » après une
  mise à jour AIRAC ; sélecteurs de fichiers des pages SIA ouverts dans ce dossier.
- Supprimés : générateur Python en ligne de commande (`generate_operational_map.py`, son README,
  son exemple de demande et sa carte de vérification), remplacé par le studio ; pdf.js (import
  MORA abandonné).
- Corrections : image vide « carte de contrôle » affichée à côté de la carte dynamique ; un fond
  lent (OpenTopoMap) n'empêche plus les surcharges (points tournants,
  zones) ; une carte en échec n'arrête plus la génération (ZIP des cartes réussies,
  `rapport_generation.txt`, bouton « Réessayer seule ») ni la galerie d'aperçus.

### Demandes de fusion

!48 Missions SIA (générateur, studio, symbologie OACI, MORA, hippodromes), mission partagée,
corrections de la suite.

## [2.1.0] — 2026-09-24

Application **CR DEFA** (Mission Report Core), bases DEFA, reportings unifiés, framework enrichi.

### CR DEFA — comptes rendus

- 14 familles de missions sur un noyau commun (HEMS, FIRE/GAAR, SAR, AIRLIFT, MARITIME, HADR,
  AIRBORNE, FI, SURVEY, LE, ISR, COMMAND, SOF, SPECIAL) ; pages dans `CR DEFA/`, page
  « Nouveau compte rendu » (choix de la famille).
- Registre **unique** `CR DEFA/missions.yaml` (toutes familles), anciens registres HEMS / GAAR
  importés ; lecture robuste (un registre illisible n'est jamais remplacé par une copie
  partielle).
- Saisie assistée : valeurs connues, appareils connus (flotte DEFA, référence DEFA, missions),
  filtrage croisé immatriculation / indicatif / type, indicatif intelligent (`ctm58` → COTAM 58,
  CTM58, OPR/ CTM), table de correspondance des indicatifs (forme plan de vol, autres formes),
  terrains (base mondiale), plan de vol SimBrief / IVAO / VATSIM.
- Analyse de textes collés : plan de vol OACI, pages du tracker IVAO (favori « → CR DEFA »),
  StatSim (VATSIM), historique VATSIM, METAR.
- Suivi réseau en direct (IVAO / VATSIM) : mise en route, décollage, atterrissage, fin de mission.
- Météo : METAR réel ou **METAR calculé** à l'heure du vol (Open-Meteo), lever / coucher du soleil,
  jour / nuit, **altitude densité** ; renseignement automatique dès que terrain, date et heure
  sont connus.
- Saisie : « + » dans le titre des collections, **tableaux compacts** (événements, étapes,
  équipage, points…), bouton **maintenant** sur chaque date / heure, heure locale ⇄ UTC (fuseau
  du terrain, heure d'été), événements créés depuis la chronologie, autorités (historique ou
  département), bloc Résultat en 2e position, lien vers la fiche appareil, routes proposées pour
  le même trajet uniquement.
- Contrôles de cohérence : heures invalides ou inversées, chronologie > 20 h, carburant, date
  future, durées déclarées.
- Barre d'en-tête à 7 entrées (famille · série, enregistrer, envoyer, importer, suivi réseau,
  mission, registre) ; aperçu du CR dans la colonne de droite ; version publique (données
  sensibles masquées) ; champs texte en majuscules.
- **Envoi du CR** à un webservice JSON (adresse et clef paramétrables, clef hors sauvegarde).

### Reportings

- Reporting général « Reporting missions — CR DEFA » et reportings de famille sur le registre
  unique : indicateurs, **graphiques** (activité par période, répartitions), synthèses par
  famille / appareil / équipage, contrôle des données.
- **Période et zoom** : composant commun (préréglages, dates, ◀ zoom − ▶, glisser / cliquer sur
  un graphique), période partagée entre les reportings ; repères « avant / après » sous les
  tableaux.
- **Modification dans le tableau** (date, n°, série, immatriculation, indicatif, résultat,
  terrains, temps de vol / bloc) avec trace ; durées sans heures « déclarées ».
- **Données** : « Mes missions (registre) » ou « Journal DEFA (vols réalisés) » — chargement /
  mise à jour par copier-coller de la page « Log des vols » ou page enregistrée, fusion sans
  doublon (historique cumulé).
- Clic : famille → reporting de la famille ; appareil → **fiche appareil** ; équipage → **fiche
  équipage**.

### Fiches appareil et équipage

- Fiche appareil : statut (disponible, maintenance…), « actuellement à », terrain de
  rattachement, mise en service, indicatifs utilisés, équipements, vie de l'appareil
  (maintenance, incidents…), performances du Flight Planner (courbes), activité **par période**
  (graphique avec zoom).
- Fiche équipage : qualifications, fonctions, heures par type, activité par période.
- **Fusionner / renommer** deux appareils ou deux pilotes (ex. GRR → RBR) : missions mises à jour,
  fiches fusionnées, équivalence appliquée au journal DEFA rechargé.

### Bases DEFA

- Flotte DEFA (205 appareils) importée depuis le site de la flotte.
- **Référence DEFA anonymisée** (`shared/defa_reference.js`, committée) : pilotes (trigrammes),
  appareils, indicatifs utilisés, terrains — sans les vols ; `tools/defa_reference.py`.
- **Journal DEFA** (non committé) : base du navigateur, analyse des séries d'indicatifs
  (≈ 50 séries 2025-2026 ajoutées à la table de correspondance).
- Page **Paramétrage › Bases de données** : flotte, types d'aéronefs, indicatifs, référence et
  journal DEFA, données du navigateur, registres, envoi des CR, dossiers paramétrés.

### Landing Performance Dashboard

- Période : composant commun (préréglages, dates, navigation, zoom par glisser), mémorisée par
  fichier ; types militaires et types locaux reconnus (catalogue commun).

### Flight Performance & Fuel Planner

- Tous les types employés par la DEFA proposés, même sans profil ; ouverture depuis une fiche
  appareil (`?aircraft=`) et liens vers les fiches des appareils du type ; identifiant SimBrief
  du profil pilote commun ; dossier performances mémorisé.

### Framework commun

- `time_period.js` (période et zoom), `charts.js` (graphiques SVG), `file_access.js` (dossiers
  paramétrés affichés, sélecteur de fichiers ouvert dans le dossier paramétré, fenêtres de
  copier-coller avec × / Fermer / Charger → Valider), `aircraft_catalog.js` (types et appareils
  communs aux trois applications), profil pilote, sauvegarde locale avec **rappel de sauvegarde**
  (bouton après 10 modifications), blocs masqués par défaut, lien de version vers ce changelog.

### Documentation

- README (EN / FR) : trois applications et un framework ; INSTALL ; tutoriel ; manuel
  d'exploitation ; `docs/FRAMEWORK.md`, `docs/FLIGHT_PLANNER.md` (reprise de la section d'origine),
  `docs/LANDING_DASHBOARD.md` ; notes de conception (`docs/mission_report_core_audit.md`).

### Demandes de fusion

!35 StatSim · !36 indicatif, METAR calculé, envoi du CR · !37 reporting général et graphiques ·
!38 barre d'en-tête · !39 contrôles de cohérence · !40 période et zoom unifiés, documentation ·
!41 base DEFA · !42 saisie, dossiers, rappel de sauvegarde · !43 référence DEFA, catalogue
commun, journal alternatif · !44 fiches appareil / équipage · !45 modification en grille,
fusions, journal DEFA depuis les reportings, tableaux compacts · !46 fenêtres de copier-coller ·
!47 période sur les fiches, version 2.1.0 et changelog.

## [2.0.7] — 2026-09-21

Première version publiée de la suite réunie dans un seul dépôt.

- CR et reporting GAAR (sécurité civile) ; Flight Performance & Fuel Planner (profils,
  devis carburant, courbe de montée optimale, calibration SimBrief, Little Navmap).
- Landing Performance Dashboard (analyse multi-CSV, tendances, filtres).
- Bandeau et menu communs, arborescence `repository_tree`, thèmes, icônes d'aéronefs,
  traduction FR / EN / DE / ES.
