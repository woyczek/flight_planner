# Changelog — X-Plane Web Suite (DEFA Virtual)

Toutes les évolutions notables de la suite (CR DEFA, Landing Performance Dashboard, Flight
Performance & Fuel Planner, framework commun). Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation `majeur.mineur.correctif`.
La version affichée en pied de page de chaque page (lien vers ce fichier) vient de
`repository_tree` (`release`).

Dépôt : <https://framagit.org/asr/flight_planner> — demandes de fusion : `!n`.

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
