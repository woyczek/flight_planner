# Tutoriel — votre premier compte rendu de mission

*[README](../README_fr.md) · [Installation](../INSTALL.md) · [Manuel d'exploitation](MANUEL_EXPLOITATION.md)*

Exemple suivi de bout en bout : une mission **FIRE / GAAR** (guet aérien armé) sur
Canadair, préparée avec SimBrief, volée sur IVAO ou VATSIM, puis enregistrée et retrouvée
dans le reporting. Comptez 15 minutes. Les autres familles fonctionnent de la même façon.

Prérequis : dépôt installé et servi (voir [INSTALL.md](../INSTALL.md)), Chrome ou Edge.

---

## 1. Régler son profil (une seule fois)

1. Ouvrir n'importe quelle page, puis le menu **☰** (en haut à droite).
2. **Profil pilote** : saisir votre **ID IVAO (VID)** et/ou **ID VATSIM (CID)**, et votre
   **identifiant SimBrief** (nom d'utilisateur ou numéro).
3. Choisir la langue avec le drapeau du bandeau (FR, EN, DE, ES ou automatique).

Ces réglages sont repris par toutes les pages.

## 2. Ouvrir un nouveau compte rendu

1. **☰ › Missions › Nouveau compte rendu**.
2. Choisir **FIRE** dans la grille. La dernière famille utilisée apparaît toujours en premier
   (« Continuer avec … »).
3. La page de CR s'ouvre. En haut, la pastille **« FIRE · GAAR ▾ »** : un clic ouvre la popup
   qui permet de changer de famille ou de **sous-type** de mission (GAAR, GAAR avec déroutement, intervention, entraînement).

Repères sur la page :

- chaque bloc a deux boutons dans son titre : **↕** (glisser pour déplacer) et
  **Masquer / Afficher**. La disposition est mémorisée. Le bloc « Capacités / techniques
  employées » est masqué par défaut : il est repris de la dernière mission de la même série ;
- à droite, **Calculs automatiques** : temps bloc, temps de vol, transits, carburant… mis à
  jour pendant la saisie ;
- en bas, le **compte rendu** généré et les boutons du registre.

Le brouillon est enregistré dans le navigateur à chaque saisie : vous pouvez fermer la page
et revenir plus tard.

## 3. Identification

Le **n° de mission** est proposé (`GAAR-001`, puis le suivant), la **date** est celle du jour.
Renseigner si besoin le nom de l'exercice, l'organisme (**Sécurité civile**), l'unité : dans
chaque champ, les valeurs déjà saisies dans vos missions sont proposées.

## 4. L'appareil

Deux façons, au choix :

- **par l'immatriculation** : commencer à taper `F-ZB…` — la liste propose les appareils de
  la flotte avec type, variante, indicatif, opérateur et base. Choisir `F-ZBME` ;
- **par la série** : avec l'organisme « Sécurité civile » et le type `CL2T`, l'indicatif
  **PELICAN** se remplit tout seul ; le champ **Numéro** propose alors les numéros de la série
  (41, 42…). Choisir `44`.

Dans les deux cas, tout se complète : `F-ZBME`, type `CL2T` (Canadair), catégorie
amphibie, indicatif **PELICAN** / numéro **44** / indicatif complet **PELICAN44**, **indicatif
plan de vol `PCAN44`** (7 caractères OACI), exploitant **OPR/ FRU**, base **LFTW**.

À savoir :

- les champs se filtrent entre eux : avec la voilure tournante, pas d'avions ni
  d'hydravions ; avec un type A20N, aucun DRAGON ni F-Z… proposé ;
- choisir un autre appareil remplace les valeurs reprises du précédent — jamais ce que vous
  avez saisi vous-même ;
- une forme plan de vol corrigée à la main est mémorisée pour la suite ;
- les équipements de l'appareil (repliés sous l'appareil) sont repris de l'appareil connu ou
  du plan de vol.

## 5. Avant le vol : plan de vol, météo, suivi réseau

1. **Bloc Navigation › Plan de vol déposé** : « **Dernier OFP SimBrief** » (ou « Plan de vol
   IVAO / VATSIM »). Sont remplis — seulement s'ils sont vides — terrains de départ,
   destination et dégagement, route, points tournants, niveau, vitesse, équipements OACI,
   METAR / TAF, masses et carburant prévus.
2. **Bloc Environnement / météo** : le METAR est analysé (vent, température, QNH, visibilité,
   plafond, phénomènes). Boutons : « METAR actuel du terrain de départ (VATSIM) », « Météo à
   l'heure du vol (Open-Meteo) », « Calculer lever / coucher du soleil » (heure locale du
   terrain ; calcul automatique dès que le terrain de départ est connu, avec la phase
   jour / nuit au décollage).
3. **Bloc Trace réseau IVAO / VATSIM › Récupérer les infos** : « **Démarrer le suivi en
   direct** » avant la mise en route, et **garder la page ouverte** pendant le vol. Toutes les
   20 s, la page lit le flux public du réseau et remplit mise en route, décollage,
   atterrissage et fin de mission.

## 6. Pendant et après le vol

- **Chronologie** : compléter ou corriger les heures (format HH:MM, heure locale). Les durées
  se calculent seules.
- **Blocs GAAR** : ordre de vol (niveau de risque, secteur, base de rechargement, altitude,
  charge), horaires feux de forêt, largages et rechargements.
- **Événements horodatés** : « + Ajouter un événement » — pour le GAAR : largage, alerte feu,
  rechargement, écopage, et les événements communs (décollage, déroutement…).
- **Carburant**, **Résultat**, **Remarques**.
- Après un vol VATSIM sans suivi en direct : « Récupérer l'historique VATSIM » ouvre votre
  historique dans un onglet ; copiez tout (Ctrl+A, Ctrl+C) et revenez : les heures de
  connexion / déconnexion sont reprises.

## 7. Le compte rendu

« **Générer / actualiser le CR** » (il se met aussi à jour pendant la saisie) : 14 sections,
résumé rédigé, tableaux des appareils, de l'équipage, de la chronologie, des événements.
Changer la langue du bandeau traduit le CR. « **PDF / Imprimer** » n'imprime que le compte
rendu. Pour les familles sensibles (police, ISR…), la case « Version publique » masque les
données sensibles.

## 8. Enregistrer dans le registre

1. La première fois : « **Dossier du registre…** » et choisir le dossier `FIRE/` du dépôt
   (autorisation du navigateur, une fois).
2. « **Ajouter au registre** » : la mission est écrite dans `FIRE/fire_missions.yaml`. Si le
   n° existe déjà, une alerte le signale.
3. La page passe en mode modification : le bouton devient « Enregistrer les modifications »,
   et « Supprimer cette mission » apparaît.

« Exporter la mission (YAML) » crée un fichier de cette seule mission ; « Nouvelle mission »
repart d'un CR vierge.

## 9. Le reporting

1. « **Voir le reporting** » (ou la popup d'en-tête, ou ☰ › Missions › Reporting missions
   pour toutes les familles).
2. **Période** : filtre des statistiques et du tableau. **Sous-type** : popup d'en-tête.
3. Cartes de synthèse (missions, heures de vol, temps sur zone, statistiques propres au
   GAAR), répartitions (séries, résultats, types, techniques).
4. Tableau des missions : clic sur un titre de colonne pour trier ; **clic sur une ligne pour
   ouvrir le CR en modification** ; « Supprimer » en bout de ligne (avec confirmation).
5. Exports : « Exporter le registre (YAML) », « Exporter en CSV (tableur) », « PDF /
   Imprimer ». Anciens CR : « Importer l'ancien registre FIRE / GAAR (CSV) ».

## 10. Sauvegarder ses données

**☰ › Données locales › Dossier de sauvegarde…** puis « Sauvegarder dans le dossier ». Tout
ce que le navigateur garde (brouillons, copies des registres, profil, appareils et
indicatifs appris…) est copié dans `defa_local_store.yaml`, puis mis à jour automatiquement.
Sur un autre poste : « Restaurer / resynchroniser ».

## 11. Aller plus loin : compléter les bases

**☰ › Paramétrage › Bases de données** :

- **Correspondance des indicatifs** : ajouter une série (ex. `KETOUPA` → plan de vol `KETOU`,
  Gendarmerie nationale, OPR/ `FGN`, types `EC35`), puis « Appliquer dans ce navigateur »
  (effet immédiat) et « Enregistrer dans le dépôt ».
- **Flotte DEFA** : ajouter ou corriger un appareil, plusieurs indicatifs séparés par des
  virgules.
- **Indicatifs appris**, **Types ajoutés localement** : « Intégrer à la base du dépôt ».
- **Registres des missions** : édition directe du YAML d'une famille, contrôlée avant
  enregistrement.

Le mode opératoire des scripts Python est affiché en bas de chaque base, et détaillé dans
le [manuel d'exploitation](MANUEL_EXPLOITATION.md).
