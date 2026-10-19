# Manuel du planificateur

Ce manuel décrit les pages du **Centre** qui préparent et suivent les missions : générateur de mission, studio
cartographique, registre des missions, Planning ODV et tableau ; un chapitre par page, une section par onglet ou bloc.
Dans la suite, l'entrée **« Aide »** de la barre latérale ouvre ce manuel au chapitre de la page en cours. Les pages
des pilotes sont décrites dans le [manuel du pilote](MANUEL_UTILISATEUR.md) ; l'accès au Centre, les paramètres et les
données dans le [manuel de l'administrateur](MANUEL_ADMINISTRATEUR.md).

Captures réalisées le 12 octobre 2026 dans l’interface française. Les valeurs affichées, les rubriques disponibles et le design peuvent varier selon votre profil et vos réglages.

## Générateur de mission
<!-- page: apps/cpco/mission_editor.html -->

Le générateur prépare le dossier d'une mission : identification, textes du brief, exercice, durée estimée, zones à activer, puis les PDF à remettre aux équipages. Il sert aussi à commander une mission à ChatGPT et à recevoir sa réponse.
Accès : barre latérale « Missions », onglet « Générateur » (niveau Conception, 3), ou ☰ › « Centre — Générateur de mission ». La création n'a qu'une porte, ce générateur : « Nouvelle mission », « Créer le squelette ici », « Commander à ChatGPT… ». Depuis le registre, « Nouvelle mission » l'ouvre sur une mission neuve (formulaire de commande déplié) et « Ouvrir dans le générateur » charge la mission choisie. Une mission en cours pas encore enregistrée dans le dossier n'est remplacée qu'après confirmation.
Voir aussi [prompt du générateur](technique/PROMPT_GENERATEUR_MISSIONS.md).
Selon le niveau d'utilisation : la page est proposée à partir du niveau Conception (3). À ce niveau, elle montre sept blocs : Mission, Identification, Durée estimée, Zones à activer, Textes de mission, Cartes du dossier final et Documents (plus Opération et Exercice quand la mission en relève). Les brouillons, « Toutes les données YAML » et les paramètres du calcul des routes sont au niveau Expert (4).

### Tutoriel : préparer une mission de bout en bout

Du formulaire de commande au brief PDF, en neuf étapes ; les étapes 10 à 12 font d’une mission seule un exercice coordonné. Aux niveaux 1 à 3, une mission neuve s'ouvre en « Pas à pas » : ses étapes Cadre, Lieux, Récit, Objectifs et risques, Chronologie, Cartes et documents reprennent les étapes 4 à 8 ci-dessous ; « Tout afficher » revient à la page complète. Les noms entre guillemets sont ceux des boutons.
1. **Ouvrir le générateur** : barre latérale « Missions », onglet « Générateur » (niveau Conception), ou « Nouvelle mission » dans le registre.
    ![Ouvrir l’onglet Générateur depuis l’entrée Missions.](images/captures-manuels/tutoriel-onglet-generateur.png)
    *Étape 1 — Ouvrir l’onglet Générateur depuis l’entrée Missions.*

2. **Régler la commande** : « Commander à ChatGPT… » déplie le formulaire. Choisissez « Type », « Sous-type », « Théâtre », « Équipes en vol », « Équipes au sol » et « Durée » ; dans « Plus d'options », « Rendez-vous », « Ravitaillement en vol », « Exercice coordonné » et, au besoin, l'aéronef de chaque équipe (vide = un appareil de la flotte).
    ![Régler le type, le théâtre, les équipes, la durée et les options de la commande.](images/captures-manuels/planif-commande-parametres.png)
    *Étape 2 — Régler le type, le théâtre, les équipes, la durée et les options de la commande.*

3. **Créer la mission**, au choix. Avec ChatGPT : « Commander : copier le prompt et ouvrir ChatGPT », collez le prompt dans ChatGPT et envoyez, puis chargez la réponse (`mission<ID>.yaml` et `summary<ID>.md`) dans « YAML et/ou Markdown », ou « ou coller son contenu… » puis « Lire la mission ». Sans ChatGPT : « Créer le squelette ici » crée aussitôt la ou les missions, vides de récit.
    ![Choisir entre la commande à ChatGPT et la création du squelette dans la suite.](images/captures-manuels/tutoriel-choix-creation.png)
    *Étape 3 — Choisir entre la commande à ChatGPT et la création du squelette dans la suite.*
    ![Charger les fichiers YAML et Markdown, ou ouvrir le collage du contenu reçu.](images/captures-manuels/tutoriel-import-fichiers.png)
    *Étape 3 — Charger les fichiers YAML et Markdown, ou ouvrir le collage du contenu reçu.*
    ![Coller le contenu de la mission, puis utiliser Lire la mission.](images/captures-manuels/tutoriel-lire-contenu.png)
    *Étape 3 — Coller le contenu de la mission, puis utiliser Lire la mission.*

4. **Compléter** : « Identification » (titre), « Textes de mission » (« Résumé », « Description détaillée », puis « Ajouter une rubrique textuelle » : objectif principal, risques, rendez-vous…). Les champs encadrés en pointillés sont encore vides ; la ligne « Squelette : … » compte les points à placer et les textes à écrire. Les points sans coordonnées (départ, cible, points tournants, rendez-vous, zone) se placent au studio, étape 6 ; au niveau Expert, le bloc « Toutes les données YAML » permet aussi de saisir `lat` et `lon` en degrés décimaux. Une opération à plusieurs équipes se parcourt avec ◀ ▶ en tête de page.
    ![Compléter le titre, la famille, le sous-type et l’identifiant de la mission.](images/captures-manuels/planif-identification.png)
    *Étape 4 — Compléter le titre, la famille, le sous-type et l’identifiant de la mission.*

5. **Vérifier** : « Durée estimée » (route probable, aller, temps sur zone, retour) et « Zones à activer » (demandes d'activation à faire).

6. **Produire les cartes** : « Ouvrir au studio » (ou l'onglet « Studio cartographique »), la mission suit. S'il reste des points sans coordonnées, le panneau « Points à placer (n) » du bloc Route les liste : « Cliquer la carte » puis un clic sur la carte de contrôle, ou un terrain, une balise, un point cherché par code ou nom ; un point posé se déplace en le glissant, une zone prend un rayon en km. Dans « Cartes à produire », une ligne par carte attendue : choisissez le profil, cadrez dans la carte de contrôle et « Garder ce cadrage », puis « Générer les cartes et le ZIP » (« Générer les n missions » pour une opération). Les PNG sont rangés dans `cartes/` du dossier de la mission.
    ![Choisir la carte et son profil, puis garder le cadrage retenu.](images/captures-manuels/planif-cadrage.png)
    *Étape 6 — Choisir la carte et son profil, puis garder le cadrage retenu.*
    ![Vérifier les cartes à produire, leur profil et leur inclusion dans le ZIP.](images/captures-manuels/planif-cartes-profils.png)
    *Étape 6 — Vérifier les cartes à produire, leur profil et leur inclusion dans le ZIP.*

7. **Enregistrer** : « Enregistrer dans le dossier » dans le studio (réglages des cartes), puis dans le générateur ; la mission est inscrite au registre (« Ranger dans le dossier des missions… » si la page le demande).
    ![Enregistrer la mission dans son dossier après les réglages du studio.](images/captures-manuels/tutoriel-enregistrer.png)
    *Étape 7 — Enregistrer la mission dans son dossier après les réglages du studio.*

8. **Remettre les documents** : dans le générateur, « Cartes du dossier final » doit dire « prête pour le PDF » pour chaque carte ; « Documents » › « Brief de l'équipage (PDF) », ou « Tous les documents de l'exercice » pour une opération.
    ![Choisir le brief de l’équipage ou les documents de l’opération à remettre.](images/captures-manuels/tutoriel-documents-pdf.png)
    *Étape 8 — Choisir le brief de l’équipage ou les documents de l’opération à remettre.*

9. **Ensuite** : dans le registre, « Affecter… » confie la mission aux pilotes ; « Dupliquer » repart d'une mission existante (identifiant suivant, titre « (copie) »).
    ![Depuis le registre, affecter la mission à un pilote ou repartir d’une copie.](images/captures-manuels/planif-fiche-actions.png)
    *Étape 9 — Depuis le registre, affecter la mission à un pilote ou repartir d’une copie.*

**Du vol seul à l'exercice coordonné** (chemins 1, 4 et 6 de « Six chemins à la main ») :
10. **Mission autonome** : créez la mission avec une seule équipe (étapes 2 et 3, ou « Nouvelle mission ») ; la ligne Opération du bloc Mission dit « Mission autonome (hors opération) ». Au besoin, la rubrique « Chronologie » des textes reçoit les événements horaires du vol.
11. **Ajouter un équipage** : « Ajouter un équipage… » sur la ligne Opération. La page dit ce qu'elle va créer, puis la mission M-016 devient l'équipage A (M-016A) et la mission M-016B est créée avec le même contexte (famille, théâtre, départ, arrivée, cible, zones, rendez-vous), l'indicatif suivant et son propre brief. Écrivez ce brief, placez ses points au studio, puis « Enregistrer dans le dossier » pour chacune des deux missions.
12. **Créer l'organisation** : « Créer l'organisation de l'exercice… » sur la ligne Opération crée M-016Z (heure H, participants repris des missions, brief général proposé). Réglez l'heure H, les chiffons et la chronologie dans le bloc Exercice ; depuis un équipage, « Ouvrir l'organisation » y revient. « Documents » › « Tous les documents de l'exercice (un PDF par destinataire) » remet les briefs, les plis et le dossier de l'organisation.

<!-- capture-manuels: tutoriel-etape-1-1 -->
<!-- capture-manuels: tutoriel-etape-2-2 -->
<!-- capture-manuels: tutoriel-etape-3-3 -->
<!-- capture-manuels: tutoriel-etape-3-4 -->
<!-- capture-manuels: tutoriel-etape-3-5 -->
<!-- capture-manuels: tutoriel-etape-4-6 -->
<!-- capture-manuels: tutoriel-etape-6-7 -->
<!-- capture-manuels: tutoriel-etape-6-8 -->
<!-- capture-manuels: tutoriel-etape-7-9 -->
<!-- capture-manuels: tutoriel-etape-8-10 -->
<!-- capture-manuels: tutoriel-etape-9-11 -->

### Onglets « Générateur de mission » et « Studio cartographique »

Les deux pages partagent un onglet en tête et travaillent sur **la même mission**.
- Passez d'un onglet à l'autre : la mission en cours part avec vous, modifications comprises.
- Toute modification est enregistrée dans ce navigateur et relue aussitôt par l'autre page ouverte (emprises, cartes ajoutées ou supprimées dans le studio, par exemple). Le générateur affiche alors « Mission mise à jour par le studio cartographique ».

L'en-tête propose aussi :
- « Créer le CR → » : ouvre un nouveau compte rendu de la famille correspondant au type de mission, pré-rempli avec la mission ;
- quand une opération compte plusieurs missions : ◀ et ▶ (« Mission précédente », « Mission suivante ») et une liste pour changer de mission du lot ;
- après une ouverture depuis le registre : « ← Registre (M-016) » pour y revenir.

### Mission

Ce bloc montre la mission chargée et réunit l'enregistrement et l'import.

| Bouton | Effet |
|---|---|
| « Nouvelle mission » | Vide le formulaire (date du jour) |
| « Commander à ChatGPT… » | Déplie le formulaire de commande (voir plus bas) |
| « Enregistrer dans le dossier » | Écrit le YAML modifié dans `data/missions/<lettre>_<FAMILLE>/<ID>/` ; l'ancienne version est remplacée, l'historique est gardé dans le YAML |
| « Annuler les modifications » | Actif quand la mission a des modifications non enregistrées : après confirmation, revient à la dernière version enregistrée dans le dossier (ou à la version chargée) ; le studio suit |
| « Dupliquer » | Copie de la mission chargée, prête à modifier : identifiant et série suivants libres de la même famille (lettre d'équipe gardée), références à l'ancien identifiant suivies (cartes attendues, récit), titre « … (copie) », `meta.duplicated_from` ; opération réduite à la copie ; cartes et rendus à refaire au studio. La copie s'ouvre ici ; « Enregistrer dans le dossier » pour la garder |
| « Mémoriser le brouillon » / « Recharger le brouillon » (niveau Expert) | Garde ou relit le texte de la mission dans ce navigateur (les images sont à resélectionner) |

Sous les boutons, deux lignes toujours présentes :
- **Ligne d'état**, avec un point coloré : « Enregistrée dans le dossier (il y a n min) », « Identique à la version du dossier (chargée …) », « Pas encore enregistrée dans le dossier » (squelette, copie, nouvelle mission) ou « Modifications non enregistrées depuis 14:32 (n champ(s)) ». « Enregistrer dans le dossier » est la validation : bouton principal tant qu'il reste du non-enregistré. Le générateur et le studio partagent la mission aussitôt (brouillon de travail commun, gardé dans ce navigateur) : la ligne est la même dans les deux pages, son infobulle le rappelle.
- **Ligne Opération** : « Mission autonome (hors opération) », ou ce que la mission est dans son opération — « Opération BOXING GLOVES (A-001) : équipage B sur 5 · organisation A-001Z · heure H 10:00 » (« organisation absente » tant que l'exercice n'en a pas, avec le bouton « Créer l'organisation de l'exercice… » ; pour la mission …Z : « organisation de l'exercice, n équipage(s) »). Ses actions — « Ajouter un équipage… », « Retirer cet équipage… », « Créer l'organisation de l'exercice… », « Ouvrir l'organisation » — sont décrites dans « Six chemins à la main ».

Le volet « Importer une autre mission : fichiers, texte collé, commande ChatGPT » est ouvert quand aucune mission n'est chargée :
- « YAML et/ou Markdown » : sélectionnez ensemble `mission<ID>.yaml` et `summary<ID>.md`, ou cliquez « ou coller son contenu… » puis « Lire la mission » ;
- « Cartes ou ZIP livré par le générateur » : choisissez directement le ZIP du studio ; les PNG et la carte d'assemblage sont associés automatiquement ;
- « Commander une mission à ChatGPT » : même formulaire que les ordres de vols (type, sous-type, théâtre, série, équipes, aéronefs…). « Commander : copier le prompt et ouvrir ChatGPT » copie le prompt, ouvre ChatGPT dans un nouvel onglet et inscrit la commande au registre (« commandée »). Au niveau Conception, ce repli n'apparaît que lorsque le bouton « Commander à ChatGPT… » l'ouvre ; au niveau Expert, il figure aussi, replié, dans le volet. **« Créer le squelette ici »** (générateur seulement, à côté du bouton de commande) fait la même chose sans ChatGPT : avec les mêmes réglages, il crée la ou les missions complètes mais vides de récit — une par équipe en vol (aéronef et indicatif choisis, ou pris dans la flotte : appareils des catégories du prompt qui conviennent à la famille ; ravitaillement : un ravitailleur puis des receveurs ; rien d'adapté : aéronef à compléter), terrain de départ et d'arrivée à la base de l'aéronef, cible, points tournants, un rendez-vous par équipe si « Rendez-vous » vaut « avec », zone de travail, ravitaillement planifié avec un axe AAR (ARIP, ARCP) si « oui », timing d'après la durée, cartes attendues avec leur description, objectif principal, risques, introduction et chronologie vides ; avec « Exercice coordonné : oui », la mission d'organisation …Z (heure H, participants, événements H, H+15 min…). Les missions s'ouvrent en lot ; la ligne « Squelette : n point(s) à placer, m texte(s) à écrire — puis le studio pour les cartes » compte ce qui reste, chaque champ vide est encadré jusqu'à sa saisie, et « Ouvrir au studio » passe au studio cartographique pour placer les points et générer les cartes. Le théâtre par défaut est celui de la base de l'aéronef de la première équipe (LFQP : métropole) ; l'indicatif vient de la flotte, sinon de la table des indicatifs pour ce type (RAFFUT01, RAFFUT02…), et le nom de chaque équipe le suit.

Une mission reçue est inscrite au registre et rangée dans son dossier si le dossier des missions est autorisé ; sinon, cliquez « Ranger dans le dossier des missions… ». Lien « Ouvrir le registre ↗ ».
Le texte reçu est gardé dans `recu/` ; reçue à nouveau, une mission ne remplace la précédente que si ses données changent : l'ancienne va dans `versions/`, les réglages du studio des cartes de même nom sont repris. Le collage accepte la réponse entière de ChatGPT (plusieurs missions : un lot) ; les fichiers annexes d'une série (VALIDATION.txt, manifeste) sont écartés et signalés. Une mission dont l'opération annonce d'autres missions affiche déjà ◀ ▶ (missions absentes « à charger ») : collées ou ouvertes ensuite, elles rejoignent l'opération. Le lot est commun au générateur et au studio ; chaque mission garde ses modifications quand on passe de l'une à l'autre.

<!-- capture-manuels: planif-mission-actions -->
![Importer, dupliquer ou enregistrer la mission : boutons du bloc Mission et volet d’import.](images/captures-manuels/planif-mission-actions.png)

*Figure 1 — Importer, dupliquer ou enregistrer la mission : boutons du bloc Mission et volet d’import.*

### Pas à pas

Une mission neuve (jamais enregistrée, ou squelette) s'ouvre en saisie guidée aux niveaux 1 à 3 ; au niveau Expert, le bouton « Pas à pas » du bloc Mission l'ouvre. Un rail de six étapes, une seule ouverte à la fois, « Suivant → » en bas ; « Tout afficher » rend la mise en page complète (et « Pas à pas » y ramène). Ce sont les mêmes données que les blocs : rien n'est perdu en passant de l'un à l'autre. Une valeur proposée est posée dans le champ, encadrée en pointillés avec la pastille « proposé ✓ » (cliquer confirme, modifier aussi) ; un avertissement est une ligne sous le champ, avec sa correction en un clic quand elle existe.

| Étape | Ce qu'on saisit | Propositions | Avertissements |
|---|---|---|---|
| 1 Cadre | famille, sous-type, identifiant (bloc Identification), théâtre, durée de vol, aéronef et indicatif, départ et arrivée | théâtre de la base de l'aéronef, indicatif de la flotte, équipe nommée d'après lui, départ = base | théâtre ≠ départ (« Mettre … »), appareil hors famille, pas d'indicatif, départ sans coordonnées |
| 2 Lieux | cible, zones (rayon), points tournants, rendez-vous (participants) ; « + Cible », « + Zone de travail », « + Point tournant », « + Rendez-vous » | recherche de terrains, balises, points et villes ; entrée et sortie à 15 NM de la cible sur la route | lieu sans coordonnées (« Placer au studio »), zone sans rayon, rendez-vous sans participants |
| 3 Récit | titre, résumé, description détaillée | canevas d'après le cadre et les lieux, à réécrire | titre vide, résumé de plus de 600 caractères |
| 4 Objectifs et risques | objectif principal, secondaires, risques dans un tableau (danger, niveau, conséquence, mesure) ; « Coller un tableau de risques » | — | plusieurs objectifs numérotés (« Répartir en secondaires »), risque sans mesure |
| 5 Chronologie | événements H+n (H = décollage prévu) | événements de la route : arrivée à chaque point, fin du travail, retour, aux heures du calcul de durée | événement après la fin du créneau estimé |
| 6 Cartes et documents | cartes attendues, enregistrement, puis cartes au studio et documents | cartes d'après les lieux (générale, cible, détail cible, chaque rendez-vous, chaque zone) | carte centrée sur un lieu sans coordonnées (« Placer au studio ») |

« Coller un tableau de points » (étape Lieux, et bloc « Toutes les données YAML ») : collez un tableau de tableur, de Markdown ou de texte, une ligne par lieu. Le séparateur (tabulation, « | », « ; », « , ») et l'en-tête (nom, lat, lon ou latitude, longitude, coordonnées, type ou rôle, temps, id) sont reconnus ; sans en-tête, les colonnes sont nom, lat, lon, rôle. Coordonnées en décimal, en DMS (48°46'05"N 7°12'18"E) ou en degrés-minutes (N48 46.1 E007 12.3). Une ligne sans coordonnées est cherchée dans les lieux connus (terrains, balises, points, villes ; nom exact). Le type « cible », « zone » ou « rdv » range la ligne, sinon c'est un point tournant ; l'ordre des lignes devient l'ordre de route. Un aperçu (nom, coordonnées trouvées, rangé comme, à placer) précède « Ajouter n points » ; les lieux non trouvés arrivent sans coordonnées et comptent dans les points à placer.

### Commander une mission

Dans le bloc Mission, « Commander à ChatGPT… » déplie ce formulaire (même formulaire que les ordres de vols) ; le registre ne commande plus rien.
1. Réglez « Type », « Sous-type », « Théâtre » (« Pays » pour l'étranger), « Équipes en vol », « Équipes au sol » et « Durée » (XS à XL).
2. Au besoin, dépliez « Plus d'options » : « Second théâtre » (« Pays » pour l'étranger), « Série » (vide = la suivante), « Identifiant » (calculé, en lecture seule), « Rendez-vous », « Traductions », « Ravitaillement en vol », « Exercice coordonné » (oui : mission d'organisation …Z ; non : jamais ; libre : selon le scénario) et l'aéronef de chaque équipe en vol A, B… (vide = automatique). Ce repli est ouvert au niveau Expert ; aux autres niveaux, il s'ouvre de lui-même quand l'un de ses réglages s'écarte du défaut.
3. Cliquez « Commander : copier le prompt et ouvrir ChatGPT », collez dans ChatGPT (Ctrl+V) puis envoyez.

« Traductions » (« en » par défaut ; « en, de, es » ; vide = français seul) : ChatGPT ajoute au YAML le brief traduit
(bloc `i18n`), que « Mes missions » affiche dans la langue du pilote ; un champ non traduit reste en français.

La mission apparaît au registre avec le statut « commandée ». Collez ensuite la réponse de ChatGPT dans le panneau « Réponse de ChatGPT » de sa fiche au registre (ou chargez-la ici), ou enregistrez les fichiers dans le dossier des missions puis « Relire le dossier » : la commande est rapprochée de la mission générée (même série). Les réglages sont mémorisés.

<!-- capture-manuels: planif-commande-parametres -->
![Préparer la commande : type, théâtre, équipes, durée et options ; le bouton du bas copie le prompt et ouvre ChatGPT.](images/captures-manuels/planif-commande-parametres.png)

*Figure 9 — Préparer la commande : type, théâtre, équipes, durée et options ; le bouton du bas copie le prompt et ouvre ChatGPT.*

### Opération

Bloc affiché quand l'opération a plusieurs missions ou une organisation (une mission seule est décrite par la ligne Opération du bloc Mission). Sa première ligne reprend les mêmes mots : « Opération BOXING GLOVES (A-001) : 5 équipage(s) · organisation A-001Z · heure H 10:00 ».
- Chaque mission de l'opération est un bouton : identifiant, indicatif ou « Organisation », heure de décollage. Cliquez pour l'afficher. « non chargée » ou « à créer » signale une mission absente du lot.
- « Créer l'organisation de l'exercice » crée la mission …Z (brief général, heure H, participants, chiffons, chronologie), en reprenant les pistes et injects des missions de l'ancien format.
- « Créer les missions des chiffons joués (n) » : chaque chiffon joué devient une mission de l'opération (base du premier équipage, route de la piste, décollage calculé). Vérifiez ensuite appareil, base et horaire, ouvrez chacune dans le studio, puis « Enregistrer dans le dossier ».

<!-- capture-manuels: planif-operation-equipes -->
![Passer d’une équipe à l’autre dans l’opération et ouvrir la création de son organisation.](images/captures-manuels/planif-operation-equipes.png)

*Figure 2 — Passer d’une équipe à l’autre dans l’opération et ouvrir la création de son organisation.*

### Six chemins à la main

Tout se crée à la main ; chaque cas a son chemin, et ses actions sont sur la ligne Opération du bloc Mission. Une *mission* est un aéronef et son équipage ; une *opération* réunit les missions d'un même radical (lettres A, B…) ; l'*organisation* (lettre Z) porte l'exercice : heure H, participants, chiffons, chronologie.

| Cas | Chemin | Ligne Opération |
|---|---|---|
| 1 — Mission autonome, un aéronef | « Nouvelle mission », ou « Créer le squelette ici » avec une équipe et « Exercice coordonné » non, ou ChatGPT | « Mission autonome (hors opération) » · « Ajouter un équipage… » |
| 2 — Mission autonome, plusieurs aéronefs (une mission et un brief chacun) | Squelette à n équipes, exercice non ; ou le cas 1 puis « Ajouter un équipage… » (n − 1 fois) | « Opération X-016 : équipage A sur 2 · organisation absente » · « Ajouter un équipage… », « Retirer cet équipage… », « Créer l'organisation de l'exercice… » |
| 3 — Mission autonome, un aéronef, événements horaires et points tournants | Le cas 1, puis la rubrique « Chronologie » des textes : événements à H+n (H = décollage prévu) à un point tournant, un rendez-vous ou une zone de la mission, ou en texte libre ; les points tournants gardent leur temps sur zone | Comme le cas 1 |
| 4 — Mission autonome qui devient coordonnée, plusieurs aéronefs | « Ajouter un équipage… » : la mission devient l'équipage A (M-016 → M-016A), la mission B reprend le contexte commun et a son propre brief ; recommencez pour C… | « Opération M-016 : équipage A sur 2 · organisation absente » |
| 5 — Exercice coordonné d'emblée | Squelette à n équipes avec « Exercice coordonné » oui (missions A… et Z), ou ChatGPT | « Opération X-016 : équipage A sur 3 · organisation X-016Z · heure H 10:00 » · « Ouvrir l'organisation » |
| 6 — Missions coordonnées qui deviennent une opération avec organisation | « Créer l'organisation de l'exercice… » : mission Z avec heure H, participants repris des missions, chiffons et chronologie vides, brief général proposé | Comme le cas 5 |

Chaque action dit d'abord ce qu'elle va créer ou retirer, identifiants compris. « Retirer cet équipage… » retire la mission du lot et des listes de l'opération ; s'il ne reste qu'un équipage sans organisation, il redevient une mission autonome (M-016A → M-016). Une mission déjà rangée se supprime depuis le registre (« Supprimer… »). Le studio suit le lot. Après un changement d'opération, enregistrez chaque mission modifiée.

### Identification

| Champ | Contenu |
|---|---|
| « Titre » | Titre de la mission |
| « Famille » | Famille de mission (liste de l'ordre de mission) |
| « Sous-type » | Propositions selon la famille, saisie libre possible |
| « Identifiant » | Lettre de la famille, tiret, numéro sur 3 chiffres, puis lettre d'équipe (A, B…) ou Z pour l'organisation : M-016, S-002A, I-001Z |
| « Série de génération » | Lot de génération dans la famille (une commande ChatGPT = une série) |
| « Auteur », « Date du document » | Signature du dossier |

Le prochain identifiant libre et la série suivante s'affichent en gris dans les champs vides : ce sont des indications, pas des valeurs. Une alerte apparaît si l'identifiant ne commence pas par la lettre de la famille.
Changer l'identifiant d'une mission citée par d'autres (opération, cartes, textes) ouvre une confirmation : acceptez pour migrer tout le lot (l'ancien identifiant est gardé dans `mission.former_id`), refusez pour garder l'ancien.

<!-- capture-manuels: planif-identification -->
![Renseigner le titre, la famille, le sous-type, l’identifiant et la série de génération.](images/captures-manuels/planif-identification.png)

*Figure 3 — Renseigner le titre, la famille, le sous-type, l’identifiant et la série de génération.*

Une ligne signale un théâtre qui ne correspond pas au terrain de départ (code OACI : LF… métropole, LFK… Corse, TFF… Antilles, SO… Guyane, FME… Réunion, FMCZ Mayotte, NW… Nouvelle-Calédonie, NT… Polynésie) : « Théâtre Polynésie, départ en métropole (LFQP). » ; le bouton « Mettre métropole » corrige le théâtre.

### Durée estimée

Estimation du vol d'après la route probable et l'appareil ; recalculée à chaque modification. Masqué pour une mission d'organisation.
- « Transit » : « automatique (selon l'appareil et le niveau) », « voies aériennes (IFR) », « RTBA (basse hauteur) » ou « direct ». Le choix est écrit dans la mission.
- « Paramètres du calcul des routes (communs à toutes les missions) » (niveau Expert) : mêmes champs que Paramètres › Centre, avec « Valeurs par défaut ».
- Affichage : « Vol estimé », « Bloc », aller / sur zone / retour, distance ; options de retour et briefs successifs le cas échéant.
- Les **temps éprouvés** (CR des missions de même départ et mêmes points) remplacent le calcul quand ils existent.
- Un tableau compare l'estimation aux CR déjà faits de la mission (vol réel, écart).
- Case « Afficher la route probable » : croquis et tableau des tronçons.

Règles du calcul :
- Route probable : départ, points dans l'ordre de la mission (sinon le cheminement du studio ; à défaut, points tournants dans l'ordre et chaque point de travail — cible, rendez-vous, zone — là où il allonge le moins la route), puis la destination, sinon le terrain de départ.
- Vitesse et vario : ceux de la mission, sinon le profil du planificateur carburant du même type, sinon la fiche EUROCONTROL, sinon une valeur type (hélicoptère, turbopropulseur, réacteur) ; un tronçon trop court pour atteindre le niveau est volé plus bas.
- Temps sur place : celui des points, sinon une valeur type selon la famille et le rôle (poser, treuillage, recherche, hippodrome…). Bloc = vol + 15 min (5 min pour un hélicoptère).
- Transit automatique : avion en IFR (croisière à partir de 6500 ft) par les voies aériennes ouvertes à son niveau, entrée et sortie directes à 60 NM au plus, direct si le détour dépasse 40 % ; avion à basse hauteur (combat, transport tactique : jusqu'à 1500 ft) par les zones du RTBA raccordées (150 NM, 80 %) ; hélicoptère et VFR en direct. Seuls les transits de plus de 40 NM sont routés. Ce sont les valeurs par défaut des « Paramètres du calcul des routes ». Le bloc dit pourquoi un transit reste direct (hors de la couverture des données, tronçon court, pas de chemin, détour excessif).

Limite : sans base SIA dans le navigateur, les routes restent directes ; un avertissement invite à relire le dossier SIA.

### Zones à activer

Liste des zones R, D, TRA et du RTBA recoupées par la route probable et les zones de travail, avec gestionnaire, limites, mode d'activation et point de recoupement. Les zones P sont signalées « à éviter ».
- Mission d'organisation : zones de toutes les missions des équipages (demandes faites par l'organisation).
- Mission d'un exercice coordonné : liste pour information seulement.
- Mission seule : demandes à faire par l'équipage ; la liste est reprise dans le brief PDF.

Limite : calcul indicatif, qui ne remplace ni les cartes AZBA ni les NOTAM. Sans base SIA, le bloc indique où la lire (Paramètres › Maintenance › Données aéronautiques, ou ligne « Base SIA » du bloc Mission du studio).

### Exercice

Bloc affiché pour une mission d'exercice.

Une opération devient un exercice quand tout n'est pas connu de tous au décollage (pistes à découvrir, messages en vol, plis, situation qui change). L'organisation voit tout ; chaque équipage ne reçoit que les événements qui lui sont adressés (ou à tous) et ne connaît que les pistes qu'ils révèlent ; un chiffon joué reçoit sa route, son heure de départ, ses consignes et sa carte. Heures par rapport à H (H, T ou M : le même instant ; « H+1h30mn », « H-20mn » ; sans unité, des minutes) ; un événement déclenché par un point tombe au décollage du participant + temps estimé jusqu'au point + délai. Un chiffon joué a sa propre mission dans l'opération (rôle chiffon) : registre, affectation et Mes missions comme un équipage.

Sur la mission d'organisation (…Z), éditeur complet :
- « Heure H et participants » : « Heure H (libellé ou heure réelle) », puis une ligne par participant (« Indicatif », « Mission », « Décollage (H-20mn, H+1h) », « Rôle ») ; « + Participant », « Reprendre les missions de l'opération ».
- « Chiffons » : pistes à reconnaître, intercepter ou escorter (nom, « Joué », indicatif, départ, nature, points, niveau, vitesse, ce que les équipages doivent établir, consignes) ; « + Chiffon », « Importer un tableau Markdown de pistes ».
- « Chronologie » : un événement par carte (« Déclencheur » : heure ou passage d'un point ; « Forme » : message radio ou pli scellé ; « Émetteur », « Titre », « Destinataires », « Pistes révélées », texte) ; « + Message radio », « + Pli scellé », « Retirer cet événement ».
- « Ce que reçoit chacun » : résumé par destinataire.

Sur une mission d'équipage, le bloc s'intitule « Exercice : ce que reçoit cet équipage » et se lit seulement. La ligne « Cartes d'exercice » indique les cartes chargées ou à générer dans le studio.

### Textes de mission

« Résumé », « Description détaillée », puis les rubriques : « Ajouter une rubrique textuelle » propose les types que le brief et le CR savent placer (Introduction, Objectif principal, Objectifs secondaires, Équipes engagées, Points tournants, Rendez-vous, Ravitaillement en vol, Risques à prendre en compte, Charge / personnel, Coordination, Chronologie, Cartographie prévue, Notes), chacun avec une ligne qui dit où il apparaît et ce qu'on y écrit, puis « Texte libre ». Chaque rubrique porte son type, choisi dans une liste et modifiable après coup (le contenu suit) ; un type ne sert qu'une fois (déjà pris : grisé), sauf « Texte libre », qui a un titre à saisir, s'ajoute autant de fois que voulu et va à la fin du brief. Objectifs, risques et notes s'écrivent dans le YAML sous leur clé (`objectives.primary`, `objectives.secondary`, `risks`, `notes` ; une valeur par ligne pour les listes) ; les autres complètent dans le brief la section de même nom. Le brief rangé (`summary<ID>.md`) est un rendu du YAML : relu avec le YAML, il ne rend que ces rubriques (marquées dans le fichier par un commentaire invisible), jamais les sections qu'il tire du YAML ; un fichier `.md` seul reste une source complète, d'où le YAML est construit. Chaque rubrique a « Contenu » et « Supprimer ».
Si le fichier reçu n'a ni résumé ni description, ils sont proposés à partir des données : relisez-les.
Sur une mission d'organisation, le bloc devient « Brief général » : situation, objectifs communs, créneaux, critères de fin, remis à tous.

La rubrique « Chronologie » (« Ajouter une rubrique textuelle ») porte aussi les événements horaires de la mission, au-dessus de son texte libre : heure (H+30mn ; H = décollage prévu), lieu de la mission (départ, point tournant, rendez-vous, zone, cible, arrivée) ou texte libre, ce qui se passe ; « + Événement » ajoute une ligne. Le brief les imprime en tête de la section Chronologie, dans l'ordre des heures. Mission d'organisation : la chronologie de l'exercice se règle dans le bloc Exercice.

Risques : un par ligne, colonnes séparées par une tabulation (copie d'un tableau), « — », « | » ou « ; » ; une colonne de niveau (Critique, Élevé, Modéré, Faible, en quatre langues, astérisque gardé) est reconnue où qu'elle soit ; deux colonnes restantes donnent le danger et la mesure, trois le danger, la conséquence et la mesure. Le niveau est imprimé dans le brief et le PDF. Une ligne sans séparateur (« Priorité absolue : … ») n'est pas un risque : en quittant la rubrique, elle va dans Notes. Objectif principal : une phrase ; une liste numérotée y est répartie (le premier item reste, les autres passent en tête des Objectifs secondaires) ; les numéros et puces sont retirés. Une mission ouverte qui ne suit pas ces règles est remise en forme à l'ouverture (la ligne d'état le dit, « Enregistrer dans le dossier » l'écrit).

### Toutes les données YAML

Bloc du niveau Expert, masqué par défaut : cliquez « Afficher » dans son en-tête.
- Éditeur sans schéma imposé : chaque clé du YAML est modifiable, les champs inconnus sont conservés. Le type d'un appareil propose la base des types (liste déroulante avec recherche).
- Listes : « Ajouter un élément », × pour retirer un élément.
- « Nom d'un nouveau champ racine » puis « Ajouter » crée une clé de premier niveau.

À réserver aux corrections que les autres blocs ne permettent pas.

Le nom d'un lieu (départ, arrivée, cible, point tournant, rendez-vous, zone) se cherche en tapant : terrains, balises, points, VRP, puis villes ; un lieu choisi pose ses coordonnées. Départ et arrivée sont par défaut la base de l'aéronef (infobulle). L'indicatif d'un aéronef propose ceux de la flotte pour son type ; le nom de l'équipe (et les participants des rendez-vous) suit l'indicatif.

« Coller un tableau de points » (étape Lieux, et bloc « Toutes les données YAML ») : collez un tableau de tableur, de Markdown ou de texte, une ligne par lieu. Le séparateur (tabulation, « | », « ; », « , ») et l'en-tête (nom, lat, lon ou latitude, longitude, coordonnées, type ou rôle, temps, id) sont reconnus ; sans en-tête, les colonnes sont nom, lat, lon, rôle. Coordonnées en décimal, en DMS (48°46'05"N 7°12'18"E) ou en degrés-minutes (N48 46.1 E007 12.3). Une ligne sans coordonnées est cherchée dans les lieux connus (terrains, balises, points, villes ; nom exact). Le type « cible », « zone » ou « rdv » range la ligne, sinon c'est un point tournant ; l'ordre des lignes devient l'ordre de route. Un aperçu (nom, coordonnées trouvées, rangé comme, à placer) précède « Ajouter n points » ; les lieux non trouvés arrivent sans coordonnées et comptent dans les points à placer.

### Cartes du dossier final

Liste des cartes jointes au PDF, dans l'ordre du dossier : celles déclarées dans le YAML, la carte d'assemblage en tête, le profil vertical à la fin.
Chaque carte affiche son état : « prête pour le PDF » (dimensions en pixels) ou « image non chargée ».
Pour charger les images, utilisez le ZIP du studio dans le bloc Mission. Une mission ouverte depuis le registre lit directement les cartes rangées dans son dossier.

### Documents

| Groupe | Boutons |
|---|---|
| « Cette mission » (ou « Organisation de l'exercice ») | « Brief de l'équipage (PDF) » ou « Dossier organisation (PDF) », « Dossier organisation (PDF) » depuis une mission d'équipage, « Fiches des chiffons joués (un PDF chacun) » |
| « Toute l'opération » (lot de plusieurs missions) | « Tous les documents de l'exercice (un PDF par destinataire) », « Exporter tous les PDF », « Dossier d'opération (un PDF) » |
| « Données » | « Exporter YAML », « Exporter Markdown » |

« Dossier d'opération (un PDF) » : page de garde (opération, missions et équipes, rendez-vous communs, carte de l'opération si le ZIP du studio est chargé), puis le brief de chaque mission à la suite.
Le brief de l'équipage contient ses plis scellés et les cartes ; la ligne d'état liste les cartes non jointes. Chargez les cartes avant d'exporter.
Chaque pli scellé occupe une page après les cartes, suivie de sa carte d'exercice ; la carte d'un message radio a sa propre page « à remettre à réception du message ».

## Studio cartographique
<!-- page: apps/cpco/map_parser.html -->

Le studio produit les cartes du dossier de mission à partir des données du SIA (cycle AIRAC) : route, coupe verticale, cartes en PNG ou SVG, ZIP et carte d'assemblage.
Accès : barre latérale « Missions », onglet « Studio cartographique » (niveau Expert, 4), ☰ › « Centre — Studio cartographique », ou « Ouvrir dans le studio » dans le registre.
Il travaille sur la mission partagée avec le générateur. Détails techniques : [missions et cartes](technique/FRAMEWORK.md).

### Mission

- Ligne d'état de la mission chargée et bouton « Enregistrer dans le dossier » : écrit la mission et les réglages du studio (profil et cadrage de chaque carte, tracés, pistes) dans `mission<ID>.yaml`. Le résultat s'affiche à côté du bouton et en notification. Dessous, la même ligne d'état que dans le générateur, avec « Annuler les modifications ».
- Ligne « Base SIA » : cycle AIRAC, nombre d'espaces et de cellules MORA, lien vers Paramètres › Maintenance › Données aéronautiques. Le studio n'a plus de bloc « Base de données SIA » : son panneau (dossier, relecture, jauge, rapport) n'apparaît sous cette ligne que s'il le faut — « Construire la base maintenant », base absente ou à reconstruire. La base se gère dans Paramètres › Maintenance › Données aéronautiques (« Reconstruire la base aéronautique »).
- « Ouvrir une autre mission : fichier Markdown / YAML ou texte collé » (replié quand une mission est chargée) : choisissez un fichier, ou « ou coller son contenu… » puis « Lire la mission ».

La mission ouverte ici devient la mission partagée avec le générateur. Pour une mission d'exercice, les cartes d'exercice manquantes sont ajoutées d'office : enregistrez la mission pour les garder.

### Route

Plan de vol, carte de contrôle et coupe verticale liés : survolez un point dans l'un, il s'illumine dans les deux autres.
- Champ de route : case 15 du plan de vol OACI ou liste à virgules ; vide = route de la mission. « Syntaxe et utilisation » détaille les formats.
- « Niveau » : niveau de croisière (FL65 ou 6500).
- Liste « Voies aériennes » / « RTBA (basse hauteur) » puis « Chercher » : cherche une route entre les points et remplace le texte.
- « SimBrief » : reprend le dernier OFP (identifiant SimBrief : Paramètres › Mon profil › Identité et réseaux) ; « ↺ Route probable » : reprend la route probable, retour base compris.
- « Tracer » (coupe verticale), « Carburant » (ouvre le planificateur avec cette route), « Copier OACI » (plan de vol strict).
- « Points de la mission » : cliquez un point pour l'ajouter au cheminement.

Carte de contrôle : listes « Carte » et « Profil », case « ZIP », « Actualiser », « Garder ce cadrage » (la carte générée reprendra le cadre affiché), « Recentrer », « Cadrage automatique », « ⧉ Fenêtre » (la même carte interactive dans une fenêtre à part, sans le reste du studio : déplacer, zoomer à la roulette ou au pincement, glisser les points comme ici ; barre « ◀ liste ▶ », « Recentrer », « Actualiser », « Ouvrir au studio », « Fermer » ; clavier ← → + − 0 Échap ; elle suit les réglages du studio), « ⤢ Agrandir » (Échap pour revenir). Sur la carte : glissez un point, cliquez la route pour insérer, clic droit pour supprimer.
« Réglages du profil : coupe, appareil, vario, sorties » : plancher et plafond de la coupe, appareil, montée et descente, image `profil_vertical.png` dans les sorties, tracé par défaut du cheminement.
« Tracer » dessine la coupe sous la carte (clic : agrandir) : relief le long de la route (± 1 km), obstacles à moins de 1 NM et espaces traversés selon le profil de `profil_vertical.png` (planchers ASFC suivant le relief), points avec distances cumulées, trajectoire prévue en violet avec TOC et TOD. La montée suit l'appareil choisi (profils du planificateur carburant), sinon les taux saisis ; sans niveau ni altitude (VFR), pas de trajectoire. Plafond 0 = automatique (relief, obstacles, altitudes prévues et planchers des espaces traversés, jusqu'au FL 195).
Route, niveau, plancher, plafond et sortie sont écrits dans la mission (`vertical_profile`) : le générateur les voit. `profil_vertical.png` est une carte de la liste ; elle va dans le ZIP et à la fin du brief PDF.

<!-- capture-manuels: planif-cheminement -->
![Préparer le cheminement : route, niveau, recherche, tracé et points de la mission.](images/captures-manuels/planif-cheminement.png)

*Figure 4 — Préparer le cheminement : route, niveau, recherche, tracé et points de la mission.*

<!-- capture-manuels: planif-cadrage -->
![Choisir la carte et son profil, puis garder le cadrage, recentrer ou revenir au cadrage automatique.](images/captures-manuels/planif-cadrage.png)

*Figure 5 — Choisir la carte et son profil, puis garder le cadrage, recentrer ou revenir au cadrage automatique.*

### Points à placer

Une mission sans coordonnées (squelette du générateur) affiche dans le bloc Route le panneau « Points à placer (n) » : départ, cible, points tournants, rendez-vous, centres de zones et terrains sans position, dans l'ordre de la route.
- « Cliquer la carte » : la ligne est choisie, le curseur passe en croix ; un clic sur la carte de contrôle pose le point (Échap annule).
- Champ de recherche : terrain, balise, point désigné, point VFR ou axe AAR (« LFLY », « OLIVIA ARIP ») de la base SIA, par code ou nom, ou coordonnées « 45.72, 4.94 ».
- Un point posé se déplace en le glissant sur la carte ; une zone prend un rayon en km. Départ et arrivée identiques sont posés ensemble.
- Les coordonnées vont dans la mission partagée : le générateur voit son compte « points à placer » baisser. Tout posé : « Générer les cartes et le ZIP ».

La recherche propose aussi les villes (noms GeoNames, après les terrains, balises et points) : « Guipry », « Pont-Réan »… ; 40 suggestions au plus, à la frappe.

### Cartes à produire

« Cartes de la mission » : une ligne par carte.
- Clic sur le nom : affiche la carte dans la carte de contrôle (✎ = cadrage modifié).
- Profil d'affichage, ou « Désactivé » (carte ni générée, ni prévisualisée, ni sur l'assemblage).
- Tracé : « Sans tracé », « Brief : cheminement », « Organisation : route probable », « Cheminement + route probable ».
- Destinataire d'exercice (si l'exercice a des pistes) : sans pistes, organisation, un chiffon, ou un équipage après tel message ou pli.
- Case « ZIP » (décochée : carte non générée ; choix non enregistré dans la mission) et × pour supprimer.

Ajout : nom, type (« générale », « cible », « détail », « zone ») puis « + Carte » (emprise = vue affichée) ; « + Cartes d'exercice » ajoute les cartes de l'organisation, des chiffons joués ou de l'équipage.
« Réglages du profil … » (replié) : « Nom du profil », « Fond de carte », « Sauvegarder », « Nouveau », « Dupliquer », « Supprimer », puis quatre onglets : « Fond de carte », « Zones », « Symboles OACI », « Éléments ». Le profil modifié est toujours celui de la carte choisie ; les profils sont communs à toutes les missions et gardés dans ce navigateur. Les listes de suggestions de la saisie (zones, aérodromes, balises : jusqu'à 13 000 entrées d'après la base SIA) ne se remplissent que lorsque vous cliquez dans le champ concerné, pas à l'ouverture de la page.

**Profil proposé** à une carte qui n'en a pas : « VFR détaillé » pour les cartes cible, détail et rendez-vous, « VFR simplifié » pour l'approche, « IFR simplifié » pour la carte principale et les vues d'ensemble (générale, zone…). `profil_vertical.png` prend « Profil vertical », créé d'office (toutes les familles d'espaces, aucun autre élément) ; son emprise suit le cheminement.

**Emprise** d'une carte : le cadrage gardé (« Garder ce cadrage »), sinon le centre et le rayon ou la largeur × hauteur donnés par la mission (polygone de la zone pour une carte de zone), sinon le cadrage automatique, au format des sorties (16/10) : vue générale, tous les points et zones avec 12 % de marge ; carte de zone, la zone avec 20 % ; détail, 8 × 5 km ; cible, 100 × 62 km ; autre carte, 220 × 140 km.

Onglets des réglages du profil :
- « Fond de carte » : OSM standard, OpenTopoMap (relief et courbes), OSM Shortbread, OpenFreeMap Liberty / Bright / Positron, VersaTiles Colorful / Graybeard / Shadow / Eclipse ; couches OSM (sol, hydrographie, routes / rail, bâtiments, frontières, relief ombré, courbes de niveau, sommets). « Villes et agglomérations » : villes en symboles OACI au-dessus d'un seuil de population (≥ 100 000 hab. tache orange, ≥ 20 000 jaune cerclée d'orange, localité point jaune), libellés au-dessus du leur (les plus peuplées d'abord), surfaces bâties (aucune, contour, remplissage, les deux) autour des villes assez peuplées ; les fichiers du SIA ne donnent aucun contour d'agglomération.
- « Zones » : familles R / D / P, contrôlés (CTR, TMA, CTA, SIV), autres (TRA, RMZ, TMZ, PJE) ; « Symbologie des cartes OACI » (classes A rouge, B / C / D bleu, E bleu clair ; R / D hachurées, P quadrillées, RTBA ; croix rouge pour une zone trop petite ; cartouches nom / plafond / plancher) ; tranche affichée (plancher, plafond en ft) ; opacité, libellés, « Noms abrégés » (aussi sur la coupe), altitudes. « Sélection des zones » : liste blanche (seules ces zones ; vide = toutes les zones des familles cochées) ou liste noire (toutes sauf celles-ci) ; espaces, tirets et accents ignorés (« LF-R 45 A » = « R 45 A ») ; « R 166 » propose le groupe de ses sous-zones, un fragment retient toutes les zones qui le contiennent ; « Coller une liste… », « Tout supprimer » ; « Alias » communs à tous les profils (« @RTBA » proposé d'après la base SIA, modifiable). La liste dit quelles zones tracer, pas leur activation.
- « Symboles OACI » : aérodromes (longueur et revêtement de piste, hélistation ; ouverts à la CAP en bleu, restreints en clair, État en rouge ; filtres par catégorie et « Contrôle »), radionavigation (VOR, TACAN, DME, NDB, ILS ; rose des VOR en vue détaillée), voies aériennes basses et hautes, tracks NAT du jour, points de report VFR et points RNAV, survol interdit (⊗ rouge), parcs et réserves (vert), obstacles (≥ 300, 500 ou 1000 ft AGL). Aérodromes et balises ont leur liste blanche ou noire (« LFOJ », « LFR* », nom). Deux balises qui se recouvrent : la plus importante reste (TACAN, puis VOR, DME, NDB, ILS).
- « Éléments » : points tournants (taille, couleurs), méridiens et parallèles, grille MORA (valeurs, opacité, espacement minimal), libellés des villes, hippodrome de ravitaillement, « Zones de mission et de recherche » (recherche en magenta, mission en violet, exclusion en rouge, nom au nord).

Hippodrome de ravitaillement : « Automatique » retient l'axe ENR 5.7 dont des points (ARIP, ARCP, S1, S2) sont à moins de 2 km d'un point de la mission, ou dont le nom figure dans la mission (la raison est affichée) ; d'autres axes se cochent dans la liste ; rien de coché, aucun hippodrome. Branche retour décalée de 14 NM du côté publié ; côté non publié : pointillés.

Les libellés ne se chevauchent pas : points de la mission et villes d'abord, puis symboles OACI, libellés des zones (au centre de la zone, sinon le long du contour, sinon pas écrits), quadrillage et valeurs MORA.

« + Cartes d'exercice » nomme les cartes `organisation_<Z>.png`, `chiffon_<piste>_<Z>.png` (reprise dans la fiche du chiffon) et `exercice_<événement>_<mission>.png`.

<!-- capture-manuels: planif-cartes-profils -->
![Pour chaque carte, choisir le profil, le tracé et le destinataire, puis décider de son inclusion dans le ZIP.](images/captures-manuels/planif-cartes-profils.png)

*Figure 6 — Pour chaque carte, choisir le profil, le tracé et le destinataire, puis décider de son inclusion dans le ZIP.*

### Aperçus et génération

- « Afficher toutes les cartes » : aperçus de toutes les cartes ; ils ne créent aucun fichier.
- « Générer les cartes et le ZIP » (aussi dans le pied de page) : produit chaque carte cochée « ZIP », la carte d'assemblage et, si l'option est cochée, le profil vertical, puis télécharge le ZIP.
- Les PNG sont rangés dans `cartes/` du dossier de la mission (visibles dans le registre). Sinon, utilisez « Ranger les cartes dans le dossier » dans le pied de page.
- Une carte en échec n'arrête pas les autres : le ZIP contient `rapport_generation.txt` et « Réessayer seule » relance la carte. « fond partiel » signale un fond de carte lent.
- Fond de carte en erreur : la carte de contrôle explique la cause, passe sur OSM standard et propose « Copier le rapport d'erreur » (détail technique à transmettre).
- Lot de plusieurs missions : « Générer les n missions » produit un seul ZIP, un dossier par mission, avec la carte de l'opération.
- Lot : « Afficher toutes les cartes (n missions) » groupe les aperçus par mission, avec en tête la carte de l'opération (`carte_operation.png` : points de toutes les missions, rendez-vous communs une fois, trajet de chaque équipe dans sa couleur, légende) ; elle est à la racine du ZIP.
- Gardez l'onglet visible pendant la génération : le navigateur ralentit les onglets en arrière-plan, et une carte peut échouer (« Délai dépassé pendant le chargement du fond de carte ») ; « Réessayer seule » la relance.
- « Arrêter » (barre de progression, aperçus comme génération) : la carte en cours s'achève, les suivantes ne sont pas faites. Une génération arrêtée ne télécharge aucun ZIP et ne range rien dans le dossier de la mission ; un lot arrêté dit combien de missions sont terminées (leurs cartes sont déjà rangées dans leur dossier) ; les aperçus déjà affichés restent.

Type de sortie (PNG, SVG éditable) et largeur des PNG : menu ☰ › « Sorties des cartes ». La carte d'assemblage est toujours incluse ; elle s'affiche en bas du bloc.

## Registre des missions
<!-- page: apps/cpco/mission_registry.html -->

Le registre recense toutes les missions générées ou commandées, avec leur suivi par le Centre : statut, date de vol, notes, comptes rendus.
Il sert à choisir une mission, à l'ouvrir dans le générateur ou le studio, à l'affecter à des pilotes, à créer son CR et à importer la réponse d'une mission commandée.
Accès : barre latérale « Missions », qui s'ouvre sur le registre (onglet « Registre »), ou ☰ › « Centre — Registre des missions ». En tête, « Nouvelle mission » ouvre le générateur sur une mission neuve : la création se fait là. Le registre consulte, range, duplique, supprime et importe ce qui arrive (fichiers, réponse de ChatGPT d'une mission commandée).
Selon le niveau d'utilisation : la page est proposée à partir du niveau Conception (3), avec l'essentiel : « Ajouter des fichiers… » et « Relire le dossier », quatre filtres et « Plus de filtres », un tableau à sept colonnes, une fiche sans le studio et le formulaire de commande simplifié. Le reste est au niveau Expert (4), comme indiqué ci-dessous.

### Missions du registre

En tête : nombre de missions, répartition par statut et date de mise à jour.

| Bouton | Effet |
|---|---|
| « Dossier des missions : … » (niveau Expert) | Choisit le dossier `data/missions` puis le relit |
| « Relire le dossier » | Relit toutes les missions du dossier ; le demande s'il n'est pas encore autorisé |
| « Ajouter des fichiers… » | Ajoute des `mission<ID>.yaml` / `summary<ID>.md` (tout navigateur) |
| « Écrire mission_registry.yaml » (niveau Expert) | Écrit le registre dans le dossier des missions |
| « Nettoyer le registre (n) » (niveau Expert) | Retire les missions « fichier absent » après relecture |

Le dossier est relu automatiquement à l'ouverture s'il est déjà autorisé. La lecture affiche une barre de progression avec « Arrêter » : le registre reste inchangé.
Au nettoyage, le statut, les notes et la date de vol passent à la mission qui remplace une mission renumérotée.

### Choisir une mission

Filtres : « Type », « Statut », « Théâtre », « Recherche » ; les autres (« Sous-type », « Rendez-vous », « Équipes engagées » (min – max), « Type d'équipe / d'aéronef », « Ravitaillement en vol ») sont sous « Plus de filtres », ouvert au niveau Expert ou quand l'un d'eux est actif. Ils sont mémorisés.
- « Tirer au sort (n) » choisit une mission parmi celles qui passent les filtres.
- « Effacer les filtres », « CSV » (export de la sélection).
- Tableau trié par colonne : Mission, Type, Titre, Équipes, RDV, AAR, Théâtre, Statut, « Durée est. », CR (nombre de vols), « Généré ». La barre sous le tableau règle sa hauteur (double-clic : hauteur par défaut). Les colonnes Équipes, RDV, AAR et Théâtre ne sont affichées qu'au niveau Expert.
- ✕ retire une mission du registre sans supprimer ses fichiers.

Cliquez une ligne pour ouvrir la fiche de la mission, décrite ci-dessous. Le lien `?mission=M-016` ouvre directement la fiche.

<!-- capture-manuels: planif-registre-filtres -->
![Retrouver une mission par type, statut, théâtre et recherche ; affiner avec les filtres supplémentaires.](images/captures-manuels/planif-registre-filtres.png)

*Figure 7 — Retrouver une mission par type, statut, théâtre et recherche ; affiner avec les filtres supplémentaires.*

### Fiche de la mission

La fiche affiche le statut, l'itinéraire, les équipes et indicatifs, puis :
- pour une opération : ses membres (cliquez pour les afficher) ; « Ouvrir » charge toute l'opération dans le générateur ou le studio ;
- « Fichiers de la mission » : YAML, « Markdown (lisible) », « PDF (générateur) », « Modifier (générateur) », « Cartes (studio) » (niveau Expert), vignettes des cartes, versions précédentes et textes reçus ;
- état des cartes : « complète », « partielle : cartes à compléter » ou « partielle : cartes non générées (régénérables) » ;
- « Durée estimée » avec la comparaison aux CR.

Boutons : « Ouvrir dans le générateur », « Dupliquer » (copie de la mission, identifiant suivant, ouverte dans le générateur ; voir le générateur), « Ouvrir dans le studio », « Affecter… » (sauf organisation …Z ; voir [affectation des missions](technique/AFFECTATION_MISSIONS.md)), « Créer le CR » ou « Nouveau CR (vol n) », et « Recopier le prompt de cette commande » pour une mission commandée. « Ouvrir dans le studio » et « Recopier le prompt de cette commande » sont au niveau Expert.

<!-- capture-manuels: planif-fiche-actions -->
![Depuis la fiche, ouvrir la mission dans le générateur ou le studio, la dupliquer, l’affecter ou créer son compte rendu.](images/captures-manuels/planif-fiche-actions.png)

*Figure 8 — Depuis la fiche, ouvrir la mission dans le générateur ou le studio, la dupliquer, l’affecter ou créer son compte rendu.*

### Suivi du Centre : statut, date de vol, notes

Le cadre du bas de la fiche porte trois champs : « Statut », « Volée le », « Notes ».

| Statut | Quand |
|---|---|
| commandée | Commande passée à ChatGPT |
| générée | Fichiers reçus |
| planifiée | Mission ouverte dans le générateur ou le studio depuis le registre |
| volée | Date de vol saisie, ou CR créé depuis la fiche |
| CR fait | Un CR du registre des CR cite la mission (automatique) |
| abandonnée | Choix manuel |

Le suivi est écrit dans `suivi.yaml`, dans le dossier de la mission ; il est partagé avec les autres postes. Si deux postes modifient le même champ en même temps, votre saisie est gardée et une alerte le signale.

### Lien avec les comptes rendus

- La fiche liste « Comptes rendus de la mission (n) », du plus récent au plus ancien ; chaque lien ouvre son CR.
- « Créer le CR » ouvre un CR pré-rempli de la famille correspondante. Pour une mission déjà volée, « Nouveau CR (vol n) » prend le numéro de vol suivant (missions récurrentes).
- Dans le CR, sous le champ de la mission, le lien « voir la mission dans le registre ↗ » revient à la fiche, avec la durée estimée et l'écart du vol.
- Dès qu'un CR cite la mission, le statut passe à « CR fait », sauf si la mission est abandonnée.

## Planning ODV
<!-- page: apps/cpco/odv_planning.html -->

La page Planning ODV réunit les disponibilités de la semaine, les créneaux communs, les missions probables et les affectations. Le Centre (CPCO) s'en sert pour planifier les missions et les confier aux pilotes libres.
Pour l'ouvrir : lien « Page ODV complète : classeur, grille, export… » du bloc « Missions probables » du Tableau (niveau Expert), ou menu ☰ (pages du Centre) ; la page n'a pas d'onglet et relève du niveau d'utilisation Planification (2). La page fait partie du Centre : tant que le Centre est verrouillé, un avis renvoie à Paramètres › Centre (voir le chapitre suivant). En mode production, il faut aussi être connecté avec le rôle `admin_centre`.
Le classeur Excel de l'escadrille est facultatif : sans lui, la semaine se construit à partir des disponibilités déclarées par les pilotes dans Mes missions et des affectations déjà enregistrées.
Chaque bloc peut être déplacé (poignée ↕) ou masqué (« Masquer » / « Afficher ») ; la disposition est mémorisée pour la page.
Les blocs « Créneaux communs » et « Missions probables » figurent aussi dans le Tableau, au niveau Expert, calés sur la semaine qu'il affiche (voir le chapitre suivant).

### Classeur ODV

Ce bloc charge le classeur hebdomadaire de l'escadrille (`.xlsx`). Il est **masqué par défaut** : cliquez sur « Afficher » dans son en-tête pour le faire apparaître.
- Choisissez le fichier, ou déposez-le sur le champ de fichier. Il est lu dans le navigateur, rien n'est envoyé sur le réseau.
- À l'arrivée sur la page, la suite rouvre seule le classeur `.xlsx` le plus récent du « Dossier du classeur ODV », s'il est autorisé (Paramètres › Installation › Sources et dossiers). Sinon, elle rouvre la copie du dernier classeur choisi, gardée dans ce navigateur.
- Choisi à la main, le classeur affiche directement sa propre semaine.
- Une fois le fichier lu, un résumé apparaît : « Fichier », « Semaine », « Officier de permanence », « Thème de la semaine », « Pilotes », « FLOTTE », « Frise horaire », « Lecture ». Le « Rapport de lecture (n) » liste les avertissements (⚠) et les remarques. Il est déplié s'il contient au moins un avertissement.
- Les anomalies (code hors légende, trigramme en double, date de la frise décalée…) sont signalées par des notifications flottantes, sans jamais bloquer la lecture.
- Gardez le classeur au format Excel : réenregistré par LibreOffice ou Google Sheets, il peut perdre ses zones de texte, donc ses trigrammes (signalé).
- Si un pilote du classeur n'a pas encore de préférences de types de missions, la suite en crée d'après ses codes (C → chasse, T → transport…) et les écrit dans sa fiche utilisateur.
- « Effacer les données » vide la page. Le bouton reste grisé tant qu'aucun classeur n'est chargé.
- Le lien « Paramètres › Centre › Planning ODV » mène aux réglages des créneaux et de la lecture du classeur.
- Données personnelles : ne publiez pas les exports. Format du classeur et règles de lecture : [règles de lecture du classeur](technique/ODV_ORDRES.md).

### Grille de disponibilité

La grille croise les pilotes avec les jours de la semaine et les trois créneaux de chaque jour (M = matin, A = après-midi, S = soir).
- **Choix de la semaine** : « ◀ Semaine précédente », « Semaine suivante ▶ », « Cette semaine », et « Semaine du classeur » quand un classeur d'une autre semaine est chargé. La source affichée est soit « classeur … », soit « déclarations des pilotes et affectations (pas de classeur pour cette semaine) ».
- **Filtres**, mémorisés dans ce navigateur : « Masquer les grilles vides », « Couleur du trigramme » (couleur de la forme dans le classeur, sans effet sur les règles), « Rôle (FLOTTE) » ou « Rôle (appareils déclarés) » sans classeur, « Simulateur ».
- **Légende** : codes du classeur avec leur nombre de cases, puis le bloc « Déclarations des pilotes », identique à celui de Mes missions.
- **Lecture d'une case** : le code du classeur vient en premier, puis la déclaration du pilote. Un encadré rouge signale un pilote disponible et non affecté. Un numéro de mission signale un pilote affecté.
- **Infobulles** : le commentaire de la case s'affiche au survol, sans le nom de son auteur ; les rôles, les simulateurs et la ligne du classeur s'affichent au survol du trigramme.
- La colonne « Dispo » compte les créneaux disponibles du pilote, avec en petit le nombre de créneaux de contrôle (+n).
- **Clic sur une déclaration** : ouvre la fenêtre « Affecter les pilotes libres » du créneau, ce pilote en évidence (voir « Créneaux communs »).

#### Missions affectées cette semaine

Sous la grille, le tableau « Missions affectées cette semaine (n) » liste les affectations de la semaine affichée.

| Colonne | Contenu |
|---|---|
| Décollage | date et heure Z |
| Créneau | trois cases M / A / S, celle du créneau en surbrillance |
| Mission, Pilote, Indicatif, Appareil, Terrain | mission (numéro et titre), pilote (« à affecter » si personne), indicatif, type et immatriculation, terrain de départ |
| Rôle | « mission », « mission (convoyage dès …Z) » ou « convoyage pour … » |

Cliquez sur une ligne pour rouvrir l'affectation complète et la modifier. Il faut que le Centre soit activé et que la mission figure dans le registre de ce navigateur. Sinon, la fenêtre du créneau s'ouvre ou un avertissement s'affiche. Sans affectation, le message « Aucune mission affectée cette semaine. » s'affiche.

#### Planning heure par heure

Ce planning détaille une journée de la semaine.
- Les onglets en tête ne montrent que les jours qui ont des missions, avec leur nombre entre parenthèses. Par défaut, le planning s'ouvre sur aujourd'hui, ou sinon sur le prochain jour qui a des missions.
- Chaque ligne correspond à un pilote ; une ligne « à affecter » regroupe les postes encore sans pilote.
- Chaque mission forme un bloc coloré qui porte l'indicatif. Un convoyage est marqué « ⇢ ».
- En fond, les trois créneaux sont tracés ; un trait marque l'heure présente.
- Cliquez sur un bloc (ou appuyez sur Entrée) pour modifier l'affectation.
- Plus bas, « Journal des affectations (n) » se déplie et montre les 30 dernières opérations.

<!-- capture-manuels: planif-odv-disponibilites -->
![Choisir la semaine et les filtres, puis lire la disponibilité de chaque pilote par jour et créneau.](images/captures-manuels/planif-odv-disponibilites.png)

*Figure 10 — Choisir la semaine et les filtres, puis lire la disponibilité de chaque pilote par jour et créneau.*

<!-- capture-manuels: planif-odv-affectations -->
![Lire la mission affectée, son pilote, son appareil et son horaire dans le planning heure par heure.](images/captures-manuels/planif-odv-affectations.png)

*Figure 11 — Lire la mission affectée, son pilote, son appareil et son horaire dans le planning heure par heure.*

### Sessions ATC des réseaux

Ce bloc rassemble les trainings, examens, événements et réservations VATSIM / IVAO de la semaine affichée. Ils sont enregistrés dans le pool de données partagé (`data/atc/<année>-W<semaine>.json`).
- **Saisir une session** : renseignez le jour, le début et la fin (heures UTC, par pas de 15 min), la position (ex. `LFBO_APP`, `LFMN_TWR`), le réseau (VATSIM ou IVAO), le type (Training, Examen, Événement, Réservation) et un commentaire facultatif. Cliquez ensuite sur « Ajouter ».
- Les deux heures doivent tomber le même jour : la fin doit suivre le début.
- « Récupérer VATSIM (pays préféré) » importe les réservations VATSIM de la semaine. Les sessions déjà récupérées sont remplacées (annulations comprises) ; les saisies manuelles sont gardées. Seules les positions du pays préféré sont importées (Paramètres › Centre › Planning ODV ; France métropolitaine par défaut) ; le bouton porte son nom.
- « Récupérer IVAO (pays préféré) » importe de même les trainings, examens et réservations IVAO de la semaine, avec la clé d'API IVAO de l'installation (Paramètres › Installation). Ces deux boutons sont l'import commun au Tableau : un seul fichier, mêmes sessions sur les deux pages.
- Le bouton « × » d'une ligne retire la session. La colonne « Source » indique « récupérée » ou « saisie ». Le tableau montre d'abord les trainings, examens et événements (examen et training repérés en marge) ; les simples réservations de position, nombreuses une fois importées, sont repliées sous « n réservation(s) de position ».
- **Effet sur la planification** : une session est comptée dans son créneau (★). Un training ou un examen rend la CTR du terrain indisponible pour les missions de ce créneau ; les TMA qui contiennent le terrain sont à éviter si possible.
- Un « TRAINING » ou un « EXAMEN » suivi d'une position (« EXAMEN LFMN_TWR »), écrit dans un couloir DIVERS de la frise du classeur ou dans le commentaire d'un contrôleur, compte de la même façon.

### Activations des zones par réseau

Ce bloc est celui du Tableau (voir « Zones ») : activations RTBA, R, D, TRA… de la semaine affichée, VATSIM et IVAO côte à côte, mêmes données. Saisie réservée comme au Tableau (Centre activé ; en production, administrateur).

### Créneaux communs

Ce tableau couvre les 7 jours × 3 créneaux. Chaque case donne le nombre de **pilotes libres**, c'est-à-dire disponibles et pas encore affectés.
- Les marques de la case : « +n ctrl » (contrôleurs), « ✎ » (mission déjà affectée), « ★ » (événement ou session ATC). L'infobulle donne aussi l'effectif avant affectations.
- Filtres : « Au moins N pilote(s) », de 1 à 20 (2 par défaut), et « Simulateur commun » (« indifférent » ou un simulateur). Ils sont mémorisés avec les réglages ODV. Une case sous le seuil est atténuée.
- Pilotes pris en compte : codes O, SC, C, T, N, S ; contrôleurs : AT, AM. Une case vide n'est pas comptée.
- **Clic sur une case** : ouvre la fenêtre « … — affecter les pilotes libres ». Elle permet de modifier les missions déjà affectées sur le créneau ou d'en planifier d'autres.

#### Fenêtre « Affecter les pilotes libres »

Conditions d'ouverture : Centre activé, et registre des missions présent dans ce navigateur (sinon, ouvrez le registre du Centre et relisez le dossier des missions).
1. **La journée en trois blocs** (Matin, Après-midi, Soir) occupe le haut de la fenêtre. Chaque bloc donne ses heures, le nombre de pilotes libres et de missions, et « en cours » pour le créneau présent. Le créneau de la fenêtre est en surbrillance. Cliquer sur un autre bloc ouvre ce créneau ; s'il reste des choix non enregistrés, une confirmation est demandée. La fenêtre reste ouverte et passe à ce créneau.
2. Les pilotes libres sont listés avec les types d'appareils qu'ils ont déclarés (en gras : maîtrisés). Choisissez une « Famille » (« toutes » ; « (proposée) » signale la famille proposée pour le créneau). La ligne « À éviter : » rappelle les CTR et TMA fermées par une session ATC.
3. Dans la matrice, cochez une mission (colonne « Planifier »). Choisissez ensuite l'« Appareil » (liste déroulante avec recherche, comme dans la fenêtre d'affectation) : la liste va du plus proche au plus lointain du départ et indique « sur place » ou la durée de convoyage. Choisissez enfin le « Pilote » : en tête viennent les pilotes « Libres jusqu'à la fin, avec l'appareil ».
4. Si l'appareil est basé ailleurs, une ligne « Convoyage » apparaît. Choisissez qui convoie (« par ») : un pilote libre, le pilote lui-même (la mission est alors décalée d'autant) ou « à affecter (mission de convoyage) ».
5. Au besoin, réglez l'heure de « décollage » (ou l'« heure H » d'une opération à plusieurs missions). « + équipier » ajoute un poste à une patrouille, avec l'indicatif suivant. « ✎ détail » ouvre le dialogue d'affectation complet ; son résultat revient dans la matrice.
6. Vérifiez la colonne « État » : pilote en double, appareil en double ou déjà engagé, pilote non libre sur toute la plage.
   Sous chaque mission, une pastille rouge signale une route qui traverse une CTR à éviter, une pastille orange une TMA (base SIA du navigateur).
7. Cliquez sur « Enregistrer (n) ». « Annuler les modifications » revient à l'état d'ouverture ; « Fermer » demande confirmation s'il reste des choix en attente.

Sous la matrice :
- « Convoyages à affecter (n) » permet de confier un convoyage resté ouvert : choisissez le convoyeur, puis « Confier ».
- « En attente (n) » liste les choix pas encore enregistrés.
- « Enregistrées sur ce créneau » propose « Modifier… » pour chaque mission.

Limites :
- La fenêtre se ferme seule quand tous les pilotes libres sont affectés.
- Les missions déjà affectées (cette semaine ou avant) sont masquées.
- Un pilote ne reçoit qu'une mission par créneau.
- Pour enregistrer, le dossier des missions doit être autorisé (Paramètres › Installation › Sources et dossiers).
Règles détaillées : [affectation des missions](technique/AFFECTATION_MISSIONS.md).

### Missions probables

Ce bloc propose, pour chaque créneau qui atteint le seuil « Au moins N pilote(s) », les meilleures familles de missions jouables par les pilotes libres.

| Colonne | Contenu |
|---|---|
| Créneau | jour, date, M / A / S ; rang de la proposition en exposant |
| Famille | SAR, FIRE, HEMS, MARITIME, AAR, ISR, SPECIAL, AIRBORNE, AIRLIFT, TRAINING |
| Affectation proposée, + | pilotes et rôle tenu ; renforts possibles |
| Simulateurs communs, Score, Règle | simulateurs partagés ; score (calcul détaillé au survol) ; règle de la famille |
| Planifier (missions du registre) | « Planifier » ou « Modifier » : ouvre la fenêtre du créneau, filtrée sur la famille |

- Cliquez sur une ligne (en dehors du bouton) pour déplier son résumé : créneau, équipage proposé, renforts, règle, score, contexte (sessions ATC, contrôleurs, événements), simulateurs, missions déjà affectées. Le triangle ▸ fait de même ; une seule ligne est dépliée à la fois.
- Une famille n'est proposée qu'aux pilotes dont la disponibilité ouvre ce thème : thèmes déclarés dans Mes missions, sinon ceux de la catégorie du code du classeur (Paramètres › Centre › Catégories de disponibilité), selon les préférences du pilote. Les rôles tenus viennent des appareils (feuille FLOTTE, ou appareils déclarés sans classeur).
- « Règles des familles et du score » se déplie sous le tableau. Score = nombre de participants, + 2 par pilote employé dans les thèmes restreints de sa disponibilité, + 1 par contrôleur en ligne pour TRAINING (2 au plus). Une famille souvent jouée recule un peu (selon le nombre de CR du registre) pour varier les missions.
- Le nombre de missions montrées par créneau et l'ordre de préférence à score égal se règlent dans Paramètres › Centre › Planning ODV.
- Le tableau se trie par colonne. Les rôles tirés de la feuille FLOTTE restent indicatifs : le planificateur valide.

### Export

Ce bloc enregistre des fichiers sur cet ordinateur. Ils contiennent des données nominatives : ne les publiez pas. Les boutons restent grisés tant qu'aucun classeur n'est chargé.

| Bouton | Résultat |
|---|---|
| « Grille (CSV) » | `<classeur>_grille.csv` : une ligne par pilote, jour et créneau |
| « Toutes les données (JSON) » | `<classeur>_planning.json` : réglages, pilotes, grille, événements, vols, créneaux, missions, anomalies |
| « Récapitulatif texte » | remplit la zone de texte : DISPO MATIN / APREM / SOIR par jour |
| « Copier » | copie ce texte dans le presse-papiers (par exemple pour Discord) ; actif une fois le récapitulatif produit |
| « Récapitulatif (.txt) » | `<classeur>_dispo.txt` |

Si le navigateur refuse la copie automatique, le texte est sélectionné : copiez-le avec Ctrl+C.

## Tableau
<!-- page: apps/cpco/odv_orders.html -->

La page Tableau construit l'ordre de vol de la semaine : plaquettes de vol, contrôle, divers et notes posés sur une frise horaire, avec les conflits de disponibilité et de zones.
Pour l'ouvrir : barre latérale › « Planning » (onglet « Tableau »). Contrairement au reste du Centre, elle se consulte sans lui : au niveau d'utilisation 1, ou sans le Centre activé (ou, en mode production, sans être connecté avec le rôle `admin_centre`), elle s'ouvre en lecture seule : le seul bloc « Ordre du jour », avec la frise du jour et ses lignes vols, contrôle, divers et notes — ni palette, ni zones, ATC, dispos communes, problèmes, journal, ni glisser-déposer ni ordre de mission ; sans le Centre, un avis flottant le rappelle. La modifier demande le Centre activé et, en mode production ou dès qu'un utilisateur est connecté, le rôle `admin_centre` (un compte `utilisateur` reste en lecture seule même Centre ouvert ; de même au Planning ODV : sessions ATC, activations, affectations).

La page compte six blocs, sans choix de vue. Ce que chacun montre dépend du niveau d'utilisation (Mon profil › « Niveau d'utilisation ») :

| Bloc | Contenu | Niveau |
|---|---|---|
| « Ordre du jour » | barre de la semaine, puis la frise du jour (seul bloc en lecture seule) | 1 |
| « Équipage de la semaine » | dispos des membres jour par jour, DLO et butées, modifications de dispo | 2 |
| « Zones » | activations des zones par réseau, puis demandes de réservation | 2 |
| « Créneaux communs » | créneaux où plusieurs pilotes sont disponibles ; un clic ouvre la fenêtre du créneau | 4 (Expert) |
| « Missions probables » | familles de missions compatibles par créneau, lien vers la page ODV | 4 (Expert) |
| « Statistiques » | vols de la semaine et charge des membres | 2 |

- **Masquer les pilotes indisponibles** (case de la palette et du bloc « Équipage de la semaine », reprise de la page ODV) : seuls restent les membres qu'une plage déclarée ce jour-là rend affectables à un vol (même règle que les conflits : sol, récupération, contrôle hors SOG ou contrôle seul ne comptent pas) (la semaine : au moins un jour) ; gardée dans ce navigateur.
Tout est enregistré dans le pool de données partagé : l'ordre de la semaine dans `data/odv/<année>-W<semaine>.json`, les réglages dans `data/config/odv.json`. Les dispos restent celles des pilotes, l'équipage d'un vol de mission celui des affectations.
Les heures sont en z (UTC). Modèle de données : [Tableau](technique/ODV_ORDRES.md).

### Ordre du jour : barre de la semaine

- « ◀ » et « ▶ » changent de semaine, « Cette semaine » revient à la semaine en cours.
- Les onglets des jours portent, en rouge, le nombre d'éléments en conflit du jour.
- « Permanence » désigne l'officier de permanence de la semaine.
- « ↶ Annuler » (ou Ctrl+Z) : revient sur les dix dernières modifications de l'ordre de vol (plaquette déplacée, élément posé ou modifié…), réémissions et enregistrement compris ; vidé au changement de semaine.
- « Briefing » (ou la touche F) passe l'ordre du jour en plein écran ; les flèches ← et → changent de jour.
- La ligne d'état indique « Enregistré », ou « Enregistré dans ce navigateur » si le dossier des données n'est pas autorisé.

<!-- capture-manuels: planif-tableau-semaine -->
![Choisir la semaine et le jour, régler la permanence, ouvrir le briefing et ajuster le zoom.](images/captures-manuels/planif-tableau-semaine.png)

*Figure 12 — Choisir la semaine et le jour, régler la permanence, ouvrir le briefing et ajuster le zoom.*

### Ordre du jour

À gauche, la palette : modèles de vols, de contrôle et de divers, la note, puis les membres (Staff, puis Membres) avec la barre de leurs dispos du jour. À droite, la frise :
- traits pointillés : tranches matin, après-midi et soir du Planning ODV ; trait rouge : heure présente ; zones sombres : nuit aéronautique du terrain réglé ;
- « RTBA · LL » : créneaux d'activité du RTBA (activations saisies ou importées, sinon créneaux des réglages) ;
- « Zones » : zones requises par chaque vol (celles de sa mission, ou celles saisies pour un entraînement), en vert si actives sur le réseau du vol, en orange si demandées, en rouge sinon ;
- « ATC » : sessions ATC du jour dans le périmètre (pays réglé dans Paramètres › Centre › Planning ODV, au survol de l'étiquette) : trainings et examens en violet, événements en bleu, réservations estompées ; une session est encadrée en rouge quand elle gêne un vol de mission (son terrain de départ ou d'arrivée pendant le vol) ;
- « Dispos ensemble » : plages où au moins deux membres sont affectables à un vol ;
- sections « Vols », « Contrôle », « Divers », « Notes » : les éléments s'empilent d'eux-mêmes.

Manipulations :
- glissez un modèle sur sa section : l'élément est créé à l'heure du dépôt (par pas de 5 min) et sa fenêtre s'ouvre ;
- double-cliquez une carte de la palette pour la poser d'office : au créneau de synchro pour un autre équipage d'une mission à plusieurs équipages (décalage de l'exercice de l'opération par rapport à H, sinon heure de la patrouille liée déjà posée ; ravitailleur : 30 min avant le ravitaillement, ou avant la patrouille qu'il sert), sinon au premier créneau cohérent du jour (heures de service, pas avant l'heure présente, équipage affectable et libre, ou assez de membres disponibles ensemble) ;
- glissez un membre de la palette sur une plaquette pour l'y ajouter, ou un trigramme d'une plaquette à une autre pour l'y déplacer ;
- faites glisser une plaquette pour changer son heure, son bord droit pour changer sa durée ; un simple clic ouvre sa fenêtre ;
- dans la palette, « Réserve des vols » garde les plaquettes retirées de la frise (glissées sur la palette, ou « ↩ Réserve » dans leur fenêtre) et « Formations des missions » propose ce que les vols de mission posés appellent : patrouilles des autres missions de la formation, ravitailleurs qui les servent, chiffons de l'opération ;
- « Zoom » règle l'échelle de la frise.

Sur une plaquette : « ⚠ n » compte ses conflits, « P » signale qu'aucun équipier n'est disponible dans l'heure et demie qui précède le vol, « ↻ » une récurrence ; une barre verte (fait) ou orange (non fait) souligne l'état ; une plaquette annulée est barrée. Sous la frise, « Problèmes d'affectation » liste les conflits du jour : un clic montre la plaquette.

<!-- capture-manuels: planif-tableau-creneaux -->
![Lire les vols dans les créneaux et comparer leurs horaires aux zones, à l’ATC et aux disponibilités.](images/captures-manuels/planif-tableau-creneaux.png)

*Figure 13 — Lire les vols dans les créneaux et comparer leurs horaires aux zones, à l’ATC et aux disponibilités.*

### Fenêtre d'un élément

- **Vol** : libellé, indicatif, mission du registre (vide : entraînement), réseau, début, durée, couleur, zones d'un entraînement, axe et offload d'un vol ravitailleur, ravitailleur et heure du ravitaillement, avions (pilote, navigateur, annulé ; huit au plus), tâches (une par ligne, « nom = TRI »), infos, état, motif, CR (ME, Bâché, MNE), partielle, causes de MNE.
- Un indicatif saisi propose la mission de l'affectation qui porte cet indicatif ce jour-là.
- « Mission du registre et équipe » : une ligne par équipe en vol de chaque mission (indicatif, appareil, rôle, famille, terrains, opération, durée estimée), triée par durée ; « ⚠ » et une notification signalent une durée estimée différente de la durée demandée (écart de plus de 15 min ou 15 %). « Entraînement (sans mission) » laisse la plaquette sans mission.
- « Ravitaillement » : une mission ravitailleur (celles de la même opération ou du même axe en tête), dont la plaquette est posée ce jour-là si elle n'y est pas déjà, ou un vol ravitailleur déjà posé ; l'heure du ravitaillement se règle à côté.
- **PTA** (principal training audience) : membres que l'élément entraîne en priorité, cochés dans le tableau des avions (vol) ou dans la liste PTA (contrôle, divers) ; ils sont entourés sur la plaquette. **Configuration** : configurations chargées sur l'avion (KNON = canon, TALIOS = pod…), proposées d'après les réglages. **DLO** (desired learning objectives) : objectifs de chaque membre sur l'élément, une ligne par membre « TRI = objectifs » ; « ◎ » sur le trigramme, objectifs au survol.
- **Avions** : deux places au départ (« + Ailier » en ajoute, huit au plus) ; pour chacune, l'appareil (type de la mission proposé ★, sans être imposé, ou un appareil de la flotte), le pilote et le navigateur. L'indicatif proposé est celui de la mission, sinon ceux de la table des indicatifs pour ce type ; il suit la mission si elle le change. **Ravitaillement** : choisissez l'axe, puis une mission ravitailleur de cet axe ; si sa plaquette n'est pas posée, elle rejoint la palette et le vol s'y accroche quand on la pose. La plaquette montre la mission (titre, famille, terrain), l'axe tenu par un ravitailleur et, pour un receveur, « ⛽ ravitailleur axe heure ».
- **Postes et appareils** (comme le Planning ODV) : pour un vol de mission, une ligne par poste de la mission (indicatif, type) ; l'équipier suivant prend l'indicatif suivant. La liste des appareils (liste déroulante avec recherche) propose les appareils compatibles, sur place d'abord puis du plus proche au plus lointain (« convoyage x h xx ») ; ceux déjà pris pendant le vol sont grisés. Un appareil basé sur un autre terrain que le départ fait apparaître une plaquette de convoyage « ⇢ » (appareil, terrains, « à affecter »), qui arrive 30 min avant le décollage et suit le vol : glissez-y le convoyeur. **Astreinte** : préavis et fin, reportés dans l'ordre de mission. Le trait sous un trigramme signale sa qualification sur le type (vert : maîtrisé ; orange : possédé ou connu ; rouge : non) ; c'est un simple signal.
- **Choix d'une mission** : la liste se limite à l'indicatif ou au libellé saisi (« SAMU » → missions SAMU) ; une fois la mission choisie, la fenêtre de choix de l'ODV s'ouvre et ses lignes (postes, appareils, pilotes, indicatif, convoyeur) remplissent la plaquette ; les pilotes disponibles et qualifiés sur le type sont proposés en premier. La plaquette prend l'heure de décollage de l'affectation (avertissement en cas d'écart) ; « Ordre de mission de l'opération (n)… » enchaîne les ordres de mission des plaquettes de l'opération posées ce jour ; une plaquette reprise de la réserve ou des formations se pose à sa place de synchro. **Ravitaillement** : l'axe choisi limite la liste à ses ravitailleurs ; « Pas de mission spécifique » met dans la réserve un ravitailleur générique sur l'axe. Un convoyage déplacé à la main garde sa place (il suit le vol de l'écart si le vol bouge), allongé ou raccourci à la main il garde sa durée tant que le trajet ne change pas ; il n'est retiré que si le vol ne le demande plus (vol supprimé, appareil changé ou déjà au terrain de départ) — mission momentanément absente du registre ou terrain sans coordonnées : la plaquette reste telle quelle, convoyeur compris ; s'il arrive moins de 30 min avant le décollage, il est signalé. Une dispo dont la catégorie n'ouvre pas la famille de la mission, et un examen ou un training ATC sur le terrain de départ ou d'arrivée pendant le vol, sont signalés. Sous la frise, « Journal des affectations » montre les 30 dernières opérations.
- **Affectations et ordres de mission** : une mission affectée ailleurs (Planning ODV, Registre) apparaît d'office en plaquette sur la frise, à son décollage, avec ses avions, ses pilotes, son astreinte et son convoyage. À l'inverse, un vol de mission qui a un équipage sans affectation est signalé « ordre de mission non émis » (le pilote ne voit rien dans Mes missions), et un équipage différent des affectations « ordre de mission à réémettre ». Déplacer la plaquette d'un vol qui a son ordre de mission (jour, heure, durée) le réémet d'office, sans fenêtre : mêmes pilotes, appareils, indicatifs et convoyeurs à la nouvelle heure ; un pli déjà ouvert redevient cacheté pour que le pilote voie le changement. En cas de conflit d'affectation (pilote, convoyeur ou appareil pris ailleurs) ou si le dossier des missions n'est pas autorisé, l'ordre n'est pas réémis : la plaquette le signale (« ordre de mission non réémis », avec la raison) et garde sa nouvelle heure ; « Ordre de mission… » reste le moyen de changer pilotes ou appareils.
- **Ordre de convoyage** : « Ordre de convoyage… » sur une plaquette de convoyage ouvre l'ordre de mission du vol servi, convoyage compris (heure et durée de la plaquette, même déplacée à la main) ; un convoyeur autre que le pilote de la mission, ou un convoyage à affecter, reçoit son ordre de convoyage dans Mes missions ; fait par le pilote de la mission, le convoyage est une ligne de son ordre de mission.
- Vol de mission : l'équipage vient des affectations de la mission ; « Ordre de mission… » ouvre la fenêtre d'affectation du Centre, préremplie avec les avions de la plaquette (pilote, immatriculation, indicatifs de la patrouille) : les affectations enregistrées sont l'ordre de mission que les pilotes reçoivent dans Mes missions (badge « OM » sur la plaquette). « Commander une mission… » ouvre la commande du générateur, préréglée d'après la plaquette (équipes, types d'appareils, durée, ravitaillement). Le CR de la mission fait foi : à l'ouverture de la semaine, état et CR en sont repris ; sans CR passé le délai réglé, le vol passe en MNE (cause « pas de CR »).
- **Contrôle**, **Divers** : libellé, position (contrôle), début, durée, couleur, état, motif, équipage (cases des membres), notes (divers).
- **Note** : texte libre.
- « Répéter » (chaque jour, chaque semaine, une semaine sur deux) et « Jusqu'au » posent l'élément sur les semaines suivantes à leur première ouverture, jamais avant sa date.
- « Supprimer » retire l'élément.

### Conflits

| Conflit | Signification |
|---|---|
| semaine non déclarée | le membre n'a pas déclaré ses dispos de la semaine |
| pas disponible sur toute la durée | aucune plage ne couvre tout l'élément |
| non affectable (catégorie) | une plage d'une catégorie qui n'ouvre pas ce genre d'élément recoupe l'élément |
| déjà pris à cette heure | le membre est sur un autre élément au même moment |
| deux fois sur l'élément | le même membre occupe deux places |
| zone non activée, demandée, interdite | zone requise sans activation « active » de son réseau sur toute la durée du vol, ou zone P |

Un vol demande une catégorie disponible ; un contrôle, une catégorie disponible ou « Contrôle SOG » ; un divers accepte aussi « Disponible au sol seulement ». Contrôle et vol hors SOG, DCS, indisponible et récupération ne sont jamais affectables.

<!-- capture-manuels: planif-tableau-conflits -->
![Repérer les problèmes d’affectation : disponibilité insuffisante d’un pilote ou zones non activées.](images/captures-manuels/planif-tableau-conflits.png)

*Figure 14 — Repérer les problèmes d’affectation : disponibilité insuffisante d’un pilote ou zones non activées.*

### Équipage de la semaine

Bloc du niveau 2 : une ligne par membre, une case par jour avec la barre des dispos déclarées et le nombre d'éléments où il figure. Un clic sur une case ouvre ses plages du jour : catégorie, début, fin, et « Récup à partir de », qui pose une récupération jusqu'à minuit. Les plages sont écrites dans la déclaration du pilote.
- **DLO et butées** (tableau replié ou ouvert par son triangle, état gardé dans ce navigateur) : objectifs permanents de chaque membre (« ＋ » pour en ajouter, clic pour modifier), avec une butée facultative (date limite : rouge à 3 jours ouvrés ou moins, jaune à 10 ou moins) ; une DLO est fermée d'office par un vol fait qui la contient (DLO de l'élément, libellé, mission) avec le membre dans l'équipage. La palette montre « ◎n » DLO en cours par membre, et la fenêtre d'un élément rappelle celles de l'équipage.
- « Modifications de dispo » liste les déclarations modifiées depuis leur dernière prise en compte ; « Pris en compte » et « Tout prendre en compte » les marquent dans ce navigateur.

<!-- capture-manuels: planif-tableau-equipage -->
![Comparer les disponibilités de l’équipage sur les sept jours et masquer les pilotes indisponibles.](images/captures-manuels/planif-tableau-equipage.png)

*Figure 15 — Comparer les disponibilités de l’équipage sur les sept jours et masquer les pilotes indisponibles.*

### Zones

Bloc du niveau 2, en deux parties : les activations des zones par réseau, puis les demandes de réservation.

**Activations des zones par réseau** : la première partie saisit les activations de zones de la semaine (`data/atc/activations/<année>-W<semaine>.json`), en deux colonnes côte à côte, VATSIM et IVAO : jour, zone, état (active, demandée, refusée), début, fin, remarque, réseau. Une activation « les deux réseaux » paraît dans les deux colonnes ; changer son réseau la déplace. VATSIM ne publie pas d'activations : sa colonne se saisit à la main. Dans la colonne IVAO, « Importer d'IVAO » reprend les horaires publiés par IVAO (clé d'API de l'installation), repliés sous la liste, ainsi que les trainings, examens et réservations IVAO de la semaine (sessions ATC) ; les saisies à la main restent. Les sessions IVAO s'importent aussi d'elles-mêmes à l'ouverture d'une semaine, au plus une fois par heure, si la page peut écrire. Une modification recalcule aussitôt les zones des vols. Le Planning ODV montre le même bloc, sur les mêmes données.

**Demandes de réservation** : la seconde partie liste les zones que traversent les vols de mission de la semaine (route prévue et zones de travail de la mission, zones saisies d'un entraînement) sans activation « active » de leur réseau : jour, zone, réseau, créneau, vols, état. « Inscrire comme demandée » (ou « Tout inscrire comme demandé ») les ajoute aux activations communes ; la demande elle-même se fait sur le site du réseau (« Copier la liste », lien vers les demandes d'activation IVAO). Une zone P est signalée « à éviter ». À l'ouverture d'une semaine, la page importe d'office les sessions ATC IVAO (trainings, examens, réservations), au plus une fois par heure, avec l'import commun au Planning ODV. « Retirer la demande » : une zone inscrite comme demandée par erreur repasse « absente ».

### Créneaux communs

Bloc du niveau Expert, repris de la page ODV et calé sur la semaine affichée par le Tableau : les 7 jours × 3 créneaux, avec le nombre de pilotes libres par case et les filtres « Au moins N pilote(s) » et « Simulateur commun ». Un clic sur une case ouvre la fenêtre du créneau (matrice missions × postes). Détail : chapitre Planning ODV, « Créneaux communs » et « Fenêtre « Affecter les pilotes libres » ».

### Missions probables

Bloc du niveau Expert, calé lui aussi sur la semaine du Tableau : les familles de missions compatibles par créneau, avec le tableau et les règles de la page ODV (voir Planning ODV, « Missions probables »). En bas, le lien « Page ODV complète : classeur, grille, export… » ouvre la page ODV, qui n'a pas d'onglet.

### Statistiques

Bloc du niveau 2 : vols prévus, durée cumulée, faits, non faits, annulés, AAR, ME, Bâchés, MNE ; par membre : temps disponible sur les heures de service, temps de vol, charge (orange au-delà de 70 %, rouge au-delà de 100 % ou sans dispo).
