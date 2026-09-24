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

1. **☰ › Reporting missions**, puis le bouton **+ Nouveau compte rendu** de l'en-tête.
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
- dans la **barre d'en-tête** : les boutons du registre (ajouter / enregistrer, supprimer,
  nouvelle mission, export, import, reporting, dossier) et du suivi réseau — le mode d'emploi
  s'affiche au survol du « ? » ;
- à droite, sous les calculs, l'**aperçu du compte rendu**, mis à jour pendant la saisie ;
- en bas de page, les blocs **Navigation** et **Météo** ;
- les champs de texte simple s'écrivent en **majuscules** (indicatifs, terrains, équipage…).

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
- l'indicatif peut se saisir d'un bloc : `ctm58` dans le champ **Indicatif** devient
  **COTAM** / **58**, indicatif plan de vol **CTM58**, **OPR/ CTM**, et l'organisme de la série
  (et le type, si la série n'en a qu'un) ;
- les équipements de l'appareil (repliés sous l'appareil) sont repris de l'appareil connu ou
  du plan de vol.

## 5. Avant le vol : plan de vol, météo, suivi réseau

1. **Bloc Navigation › Plan de vol déposé** : « **Dernier OFP SimBrief** » (ou « Plan de vol
   IVAO / VATSIM »). Sont remplis — seulement s'ils sont vides — terrains de départ,
   destination et dégagement, route, points tournants, niveau, vitesse, équipements OACI,
   METAR / TAF, masses et carburant prévus.
2. **Bloc Environnement / météo** : **rien à faire**. Dès que le terrain de départ (ADEP ou
   base de départ de l'appareil), la date et l'heure (décollage, sinon mise en route) sont
   connus — saisis, repris de l'appareil connu ou importés — la page calcule un **METAR** à
   l'heure du vol à partir du modèle Open-Meteo (marqué `RMK CALC OPEN-METEO` ; pour un vol du
   jour dans l'heure, METAR réel VATSIM), le vent, la température, le QNH, la visibilité, le
   plafond, le temps présent, le **lever / coucher du soleil** (heure locale du terrain) et la
   phase jour / nuit. Changer d'heure ou de terrain met à jour ces valeurs ; ce que vous avez
   saisi vous-même n'est jamais remplacé. Les boutons du bloc refont le calcul à la demande ;
   un METAR collé est analysé.
3. **Barre d'en-tête › Récupérer les infos (suivi réseau)** : « **Démarrer le suivi en
   direct** » avant la mise en route, et **garder la page ouverte** pendant le vol. Toutes les
   20 s, la page lit le flux public du réseau et remplit mise en route, décollage,
   atterrissage et fin de mission.

## 6. Pendant et après le vol

**Analyser / importer…** (à côté de la pastille famille / sous-type) : coller un texte, les champs vides sont remplis. En haut de la fenêtre, les liens **↗ Tracker IVAO** et **↗ Mes vols StatSim** ouvrent vos pages (identifiants du profil pilote).

- un **plan de vol OACI** « (FPL-…) » : appareil, indicatif, immatriculation (REG/), exploitant
  (OPR/), route et points tournants, niveau, vitesse, terrains, date du vol (DOF/), EOBT, VFR / IFR,
  remarques (RMK/) ;
- une page du **tracker IVAO** (tracker.ivao.aero, connecté) : sur la page « détails » d'un vol,
  Ctrl+A puis Ctrl+C, et coller — plan de vol, connexion / déconnexion (début / fin de mission),
  décollage et atterrissage déduits de la trace (si la connexion commence / finit au sol),
  distance parcourue ; sur la liste des connexions : heures de connexion du jour de la mission ;
- la page d'un **vol StatSim** (VATSIM, statsim.net › mes vols › un vol) : indicatif, appareil et
  équipements, route, niveau, terrains, heures de départ / d'arrivée (décollage / atterrissage),
  table des positions (mise en route / arrêt, distance) — Ctrl+A, Ctrl+C ou favori « → CR DEFA » ;
- l'**historique VATSIM** (JSON ouvert par « Récupérer l'historique VATSIM ») : heures de connexion
  du jour de la mission ≈ mise en route / fin de mission ;
- un **METAR**.

Plus rapide et plus complet : glisser le lien **→ CR DEFA** de la fenêtre dans la barre des
favoris ; sur la page « détails » du tracker, un clic **déplie les sections repliées** (révisions,
« Tracks Table »), charge toute la table des positions et copie la page entière ; au retour sur
le CR (fenêtre ouverte), elle est analysée. Avec un Ctrl+A / Ctrl+C manuel, seules les sections
dépliées sont copiées : déplier « Tracks Table » avant de copier, sinon décollage, atterrissage et
distance ne peuvent pas être calculés.

La première fois, « Coller depuis le presse-papiers » demande à Chrome l'autorisation de lire le
presse-papiers ; une fois accordée, l'analyse au retour est automatique. Ctrl+V dans la zone
fonctionne toujours, sans autorisation.
Les heures du tracker (UTC) sont converties en heure locale du terrain de départ.


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

1. La première fois : « **Dossier du registre…** » (barre d'en-tête) et choisir le dossier
   `CR DEFA` du dépôt (autorisation du navigateur, une fois pour toutes les familles).
2. « **Ajouter au registre** » : la mission est écrite dans le registre unique `CR DEFA/missions.yaml`. Si le
   n° existe déjà, une alerte le signale.
3. La page passe en mode modification : le bouton devient « Enregistrer les modifications »,
   et « Supprimer cette mission » apparaît.

« Exporter la mission (YAML) » crée un fichier de cette seule mission ; « Nouvelle mission »
repart d'un CR vierge.

« **Envoyer le CR** » transmet le compte rendu (mission, CR en HTML et en texte, calculs) au
webservice de la DEFA, une fois celui-ci réglé dans ☰ › Paramétrage › Envoi des comptes
rendus. La bulle du bouton indique le dernier envoi de cette mission.

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
