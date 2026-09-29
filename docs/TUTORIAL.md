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
2. Choisir **FIRE** dans la grille — ou le trouver en décrivant la mission dans le champ de
   recherche (« feu de forêt », « canadair », « ravitaillement de Rafale »… : familles classées,
   Entrée ouvre la première). La dernière famille utilisée apparaît toujours en premier
   (« Continuer avec … »).
3. La page de CR s'ouvre. En haut, la pastille **« FIRE · GAAR ▾ »** : un clic ouvre la popup
   qui permet de changer de famille ou de **sous-type** de mission (GAAR, GAAR avec déroutement, intervention, entraînement).

Repères sur la page :

- chaque bloc a deux boutons dans son titre : **↕** (glisser pour déplacer) et
  **Masquer / Afficher**. La disposition est mémorisée. Le bloc « Capacités / techniques
  employées » est masqué par défaut : il est repris de la dernière mission de la même série ;
- à droite, **Calculs automatiques** : temps bloc, temps de vol, transits, carburant… mis à
  jour pendant la saisie ; en dessous, les **anomalies** éventuelles (⚠ heure invalide, heure
  avant l'étape précédente — ex. sortie de zone avant l'entrée —, chronologie de plus de 20 h,
  carburant final supérieur au départ) : clic pour aller au champ, surligné en orange ;
- dans la **barre d'en-tête**, sept entrées de gauche à droite :
  **famille · série ▾** (changer de famille ou de sous-type), **Ajouter au registre** /
  **Enregistrer les modifications**, **Envoyer le CR**, **Analyse / import… ▾** (texte collé,
  trackers, fichier de mission), **Suivi réseau ▾** (● rouge pendant le suivi), **Mission ▾**
  (nouvelle, export YAML, suppression) et **Registre des missions ▾** (reporting, dossier,
  téléchargement, **paramétrage de l'envoi des CR**, Paramétrage) ;
- à droite, sous les calculs, l'**aperçu du compte rendu**, mis à jour pendant la saisie ;
- en bas de page, les blocs **Navigation** et **Météo** ;
- les champs de texte simple s'écrivent en **majuscules** (indicatifs, terrains, équipage…).

Le brouillon est enregistré dans le navigateur à chaque saisie : vous pouvez fermer la page
et revenir plus tard.

## 3. Identification

Champ **Mission** : l'identifiant de la mission volée (registre des missions, ex. `F-004`) ; le **n° de CR** est
calculé (`CRF-004-1`, `CRF-004-2` si la mission est rejouée ; sans mission : `CRF-A01-0`). La **date** est celle du jour.
Renseigner si besoin le nom de l'exercice, l'organisme (**Sécurité civile**), l'unité : dans
chaque champ, les valeurs déjà saisies dans vos missions sont proposées.

### Saisie rapide

- **Appareils, équipage, événements, étapes** : « **+** » dans le titre du bloc pour ajouter
  un élément ; il y a toujours au moins un appareil et un membre d'équipage.
- Chaque **date / heure** a son bouton **⏱ maintenant** (📅 aujourd'hui) : heure locale du
  terrain de départ (à défaut, heure de Paris, CET / CEST) ou UTC selon le champ.
- **Heure locale ⇄ UTC** : l'une remplit l'autre (fuseau du terrain de départ à la date de la
  mission, changement d'heure compris ; à défaut Europe/Paris). La date et l'heure du bloc
  Identification sont celles de la mission : l'heure du **briefing** les remplit si elles sont
  vides.
- **Événements, étapes, équipage, points…** : un tableau compact, une ligne par élément (les
  champs longs — description, notes — sur une 2e ligne).
- **Route** (navigation) : seules les routes déjà utilisées pour le même trajet sont proposées —
  départ → destination, ou tout couple de terrains dans l'ordre des étapes saisies.
- **Altitude densité** (météo) : calculée au terrain de départ (altitude du terrain, QNH,
  température).
- Les heures de la **chronologie** (briefing, mise en route, cales, décollage, entrée / sortie de
  zone, début / fin de mission, atterrissage, arrêt) créent et tiennent à jour les
  **événements horodatés** correspondants (un événement complété à la main n'est jamais retiré).
- **Autorités** (demandeuse, de contrôle) : reprises de la dernière mission du même indicatif ou
  du même organisme ; pour les séries numérotées par département (DRAGON74, CHOUCAS74) :
  préfecture du département et CODIS / CORG / SAMU du département.
- Contrôle : une date de mission dans le futur est signalée (un CR porte sur un vol réalisé).
- Le bloc **Résultat** est en 2e position, sous l'identification.

## 4. L'appareil

Deux façons, au choix :

- (si la **base DEFA** est chargée — ☰ › Paramétrage › Base DEFA — les appareils, indicatifs,
  trigrammes et terrains des vols réalisés sont aussi proposés) ;
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
  du plan de vol ;
- « **Fiche appareil ↗** » (en tête de la carte de l'appareil) ouvre sa fiche ;
- mauvais appareil ou mauvais type ? « **⟲ Effacer** » (en tête de la carte de l'appareil)
  vide l'appareil — et l'organisme repris de la flotte — pour relancer la recherche.

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
3. **Barre d'en-tête › Suivi réseau ▾** : « **Démarrer le suivi en
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

1. La première fois : **Registre des missions ▾ › Dossier du registre…** et choisir le dossier
   `CR DEFA` du dépôt (autorisation du navigateur, une fois pour toutes les familles).
2. « **Ajouter au registre** » : la mission est écrite dans le registre unique `data/cr/missions.yaml`. Si le
   n° existe déjà, une alerte le signale.
3. La page passe en mode modification : le bouton devient « Enregistrer les modifications »,
   et « Supprimer cette mission » apparaît.

**Mission ▾ › Exporter la mission (YAML)** crée un fichier de cette seule mission ;
**Mission ▾ › Nouvelle mission** repart d'un CR vierge.

« **Envoyer le CR** » transmet le compte rendu (mission, CR en HTML et en texte, calculs) au
webservice de la DEFA, une fois celui-ci réglé : **Registre des missions ▾ › Paramétrer
l'envoi des CR (webservice)…** (ou ☰ › Paramétrage › Envoi des comptes rendus). Tant qu'il ne
l'est pas, le bouton est en pointillés et propose d'ouvrir ce paramétrage. La bulle du bouton indique le dernier envoi de cette mission.

## 9. Le reporting

**Toutes familles** : ☰ › **Reporting missions** (registre unique `missions.yaml`).

- Dans l'**en-tête** (toujours visible) : **période** — préréglage, dates de début / fin,
  **◀ reculer · 🔍− zoom arrière · ▶ avancer** —, **familles** (puces colorées : clic pour
  masquer / afficher, Ctrl + clic pour n'en garder qu'une), **regroupement** (automatique,
  jour, semaine, mois, trimestre, année) et **mesure** des graphiques (missions, heures de
  vol, bloc, sur zone, mission, sorties, distance).
- **Zoom depuis le graphique « Activité par période »** : glisser sur plusieurs barres, ou
  cliquer une barre, pour ne garder que cette période (tout le reporting suit) ; double-clic
  pour dézoomer. La période est partagée avec les reportings de famille — et le même
  composant sert au Landing Performance Dashboard.
- Indicateurs : missions, réussite, heures de vol / bloc / sur zone (moyennes sur les missions
  renseignées), distance, carburant par unité, personnes / fret, vols de nuit, en réseau
  (IVAO / VATSIM), opérations réelles, appareils, équipage.
- Graphiques : activité par période (barres empilées par famille), répartition par famille,
  résultats, séries, types, capacités, terrains de départ, jour / nuit, réseau, exercice /
  réel — survol pour le détail.
- Synthèses par famille (avec les indicateurs propres : largages, délai alerte → décollage…),
  par appareil et par membre d'équipage ; tableau des missions (clic = CR en modification).
- Clic sur une ligne : **Synthèse par famille** → reporting de la famille ; **par appareil** →
  **fiche appareil** ; **par membre d'équipage** → **fiche équipage** (voir ci-dessous).
- Sous le tableau des missions, quand une période est choisie : **◀ n avant la période**,
  **− / +** (zoom arrière / avant), **m après la période ▶**.
- **Données** (en-tête) : « Mes missions (registre) », « Journal DEFA (vols réalisés) » —
  historique complet, en lecture seule — ou **« Charger / mettre à jour le journal DEFA… »** :
  ouvrir « Log des vols » sur le site de la DEFA (lien dans la fenêtre), **Ctrl+A, Ctrl+C**, puis
  **Ctrl+V** dans la fenêtre (ou choisir la page enregistrée par Ctrl+S). « Mettre à jour »
  ajoute les nouveaux vols et garde l'historique (seules les lignes identiques sont fusionnées) ;
  à refaire régulièrement.
- **✎ Modifier dans le tableau** (titre du tableau des missions, reporting général ou de
  famille) : date, n° de mission, série, immatriculation, indicatif, résultat, départ / arrivée,
  temps de vol et bloc se corrigent directement ; chaque cellule est enregistrée dans le registre
  unique (les reportings restent cohérents) avec une trace dans la mission. Durées : si les
  heures existent, la fin est déplacée (l'atterrissage suit) ; si une seule heure existe, l'autre
  est créée ; sans heures, la durée est « déclarée » (≈), comptée, et signalée au contrôle des
  données jusqu'à la saisie des heures dans le CR.
- **Contrôle des données** (en tête, seulement s'il y a lieu) : missions à corriger, avec
  l'anomalie ; clic pour ouvrir le CR.
- Anciens registres CSV HEMS / GAAR : « Importer un ancien registre CSV » (bas de page).

**Une famille** : période, regroupement et mesure dans l'en-tête (même zoom), mêmes cartes
et répartitions, graphique **activité par période** empilé par série (regroupement et mesure partagés avec le reporting général), colonne **Contrôle**
(⚠ nombre d'anomalies, détail au survol) dans le tableau.

1. « **Voir le reporting** » (ou la popup d'en-tête).
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

## 12. Fiches appareil et équipage

**Fiche appareil** (`apps/cr/appareil.html?reg=F-ZBPN`, depuis la synthèse par appareil, la fiche
équipage ou le Flight Planner) :

- en tête : **statut** (disponible, indisponible, en maintenance, retiré), **📍 actuellement à**
  (dernier terrain connu : arrivée de la dernière mission ou du dernier vol du journal),
  **🏠 terrain de rattachement** (modifiable) ;
- identité : type, variante, voilure, turbulence de sillage, opérateur, fiche de la flotte DEFA,
  **mise en service** (modifiable), indicatifs utilisés (avec leur nombre), équipements, notes ;
- activité : missions / vols, heures de vol et bloc, premier / dernier vol, graphique par période ;
- **vie de l'appareil** : maintenance, inspections, incidents, modifications, convoyages (« + ») ;
- **performances** : profil du Flight Planner pour ce type (consommations et vitesses par phase,
  courbe RPM / puissance → consommation), bouton « Ouvrir dans le Flight Planner » ; dans le
  Planner, les appareils DEFA du type actif renvoient à leur fiche ;
- missions et vols (clic : CR en modification pour les missions du registre).

Les fiches ont la **période** des reportings dans leur en-tête (préréglages, dates, ◀ zoom − ▶,
zoom par glisser sur le graphique) : cartes, graphique et tableau suivent la période ;
l'identité reste calculée sur tout l'historique.

**Fiche équipage** (`apps/cr/equipage.html?name=PLN`) : nom, rattachement, qualifications,
notes (modifiables) ; fonctions tenues, heures par type, activité, missions et vols.

**Fusionner avec… / renommer** (dans chaque fiche) : deux appareils ou deux pilotes n'en font
plus qu'un (ex. GRR → RBR) — les missions du registre prennent la nouvelle valeur (trace dans
chaque mission), la fiche complète celle de la cible, et l'équivalence est mémorisée pour le
journal DEFA rechargé et le catalogue (`missionMergeMap:v1`).

Base « lâche » : tout ce qui est connu est repris (flotte, référence DEFA, missions, journal),
rien n'est obligatoire ; ce qui est saisi dans une fiche reste dans le navigateur
(`missionAircraftSheets:v1`, `missionCrewSheets:v1`, inclus dans la sauvegarde locale).

## 13. Préparer une mission SIA : brief, cartes, compte rendu

Exemple : `examples/missions/Mission 02.md` (ravitaillement en vol sur l'axe SIMONE). Détail :
[SIA_MISSIONS.md](SIA_MISSIONS.md).

1. **Données** (une fois par cycle AIRAC) : ☰ › Centre — Studio cartographique › bloc 1 ›
   « Dossier SIA XML » → choisir `apps/cpco/` (voir [INSTALL.md](../INSTALL.md)).
2. **Brief** : ☰ › Centre — Générateur de mission › « YAML et/ou Markdown » → `Mission 02.md`.
   Le fichier n'a ni résumé ni description : ils sont **proposés** (type, cible, zone,
   participants MISTRAL 41/42 et VAILLANT 31, axe SIMONE 010°, 48 NM, 14 NM, virages par la
   gauche, points, rendez-vous, consignes) — relire et compléter.
3. **Cartes** : « Transmettre au studio cartographique → ». Dans le studio :
   - bloc 3, onglet **Fond de carte** : choisir un profil (IFR, VFR détaillé…) et un fond ;
   - onglet **Zones** : familles à afficher ; ajouter par exemple « @RTBA » ou « R 166 »
     (complétion) ; les zones retenues s'affichent à côté ;
   - onglet **Éléments** : points tournants, quadrillage, grille MORA ; « Axe de la mission :
     Automatique (SIMONE) » trace l'hippodrome exact ;
   - la **carte de contrôle** (à droite, ⤢ pour l'agrandir) suit chaque réglage ;
   - bloc 5 : un profil par carte (ou « Désactivé »), puis **Générer les cartes et le ZIP**.
4. **Dossier final** : retour au générateur (« ← Retour ») › « Cartes ou ZIP livré par le
   générateur » → le ZIP ; **Exporter le PDF final** (`M02_TRAINING_VAILLANT_31_Axe_SIMONE.pdf`).
5. **Après le vol** : « Créer le CR DEFA → » ouvre un nouveau compte rendu de la bonne famille
   (TRAINING → SPECIAL), déjà rempli (nom, objectif, points, appareils) ; compléter comme aux
   § 3 à 8.
