# Évolution des objets — proposition 0.2, 18 novembre 2026

Statut : proposition de contrat et d’architecture, distincte du prototype exécutable 0.1. Le prototype actuel reste statique/axe, terrain/eau/MSL et pont local. Cette note NE prétend PAS ajouter une route, l’AGL, un test d’occultation complète ni une synchronisation réseau au Lua déjà généré.

## 1. Un objet visible : quatre conditions distinctes

1. Dans le champ réel de la caméra, en tenant compte de la direction de regard, du zoom et de la projection. Un relèvement devant l’avion ne suffit pas.
2. À une distance plausible : portée maximale de découverte ET taille angulaire/projetée minimale du modèle. Le profil visuel dépend de l’objet (personne, voiture, bateau, avion). Les seuils seront calibrés dans le simulateur ; une portée identique de 1 NM n’est pas une garantie de visibilité pour tous les modèles.
3. Non occulté : état `clear`, `blocked` ou `unknown`, avec la méthode de vérification et son instant. `unknown` ne devient jamais `clear` par défaut. Un échantillonnage de terrain peut établir un masquage géométrique par relief ; il ne prouve pas l’absence d’arbres, bâtiments, cockpit ou autres obstacles. Le SDK de sondage Y est une sonde verticale, pas une API de visibilité des pixels d’un modèle. Le brouillard, l’éclairage et la reconnaissance restent également distincts.
4. Déclaration humaine : le pilote confirme « Objet en vue ». L’application valide alors le contact avec la position autoritaire, la position récente de ce pilote, la portée et la règle métier de la mission.

Le signal automatique reste indicatif tant qu’une vraie méthode d’occultation n’est pas disponible et validée. On transmet séparément `in_camera`, `within_visual_range`, `occlusion`, `occlusion_method` et l’horodatage de mesure. On ne fabrique pas un événement « vu par le pilote » à partir d’une simple projection. Une confirmation humaine peut attester une observation lorsque le système automatique reste `unknown` ; ce n’est pas un constat automatique d’absence de masque. Une contradiction `blocked` appelle une nouvelle mesure et ne doit pas ouvrir silencieusement le tiroir.

Pour une vérification de rendu complète, il faudrait évaluer un greffon avec accès à des informations d’occlusion/profondeur appropriées. Sa faisabilité, sa couverture cockpit/VR et son coût doivent être mesurés dans X-Plane avant d’en faire une condition bloquante. Un test de sommet ou du seul centre de l’objet ne représente pas nécessairement toute sa surface visible.

## 2. Route et passages répétés

Ajout proposé `motion: route`. Les lieux sont des références à la liste existante de points de la mission ; l’éditeur réutilise ses pastilles et son tracé, sans saisie d’identifiants.

```yaml
motion: route
route:
  repeat: loop                  # once | loop | pingpong
  points:
    - point: PT1
      speed_kt: 110
      altitude_mode: agl
      height_agl_ft: 800
    - point: PT2
      speed_kt: 130
      altitude_mode: msl
      altitude_ft: 2500
    - point: PT3
      speed_kt: 110
      altitude_mode: agl
      height_agl_ft: 800
constraints:
  min_speed_kt: 65
  max_speed_kt: 150
  max_climb_ft_min: 800
  max_descent_ft_min: 600
  max_turn_deg_sec: 3
  min_clearance_ft: 300
```

Chaque point peut revenir plusieurs fois dans la séquence ; il ne faut donc pas dédupliquer la liste. Une occurrence est identifiée par son rang et son numéro de tour. La vitesse et le niveau indiqués sont les valeurs à atteindre au passage ; la transition commence avant, en respectant les contraintes de l’objet. Un changement de valeur ne doit jamais téléporter, faire virer instantanément ou faire sauter d’altitude l’objet. Si le segment ne permet pas une transition réalisable, la préparation le signale et ne prétend pas que la consigne sera tenue.

`once` : retrait à la fin de route dans ce premier contrat ; une attente finale devra être explicitement demandée. `loop` : le dernier point rejoint le premier. `pingpong` : parcours inverse de la séquence, avec demi-tour réalisable, sans doublage du point terminal ; le comportement de virage compte dans la durée réelle. Un bateau exige une route sur l’eau ; aucune traversée de terre n’est implicitement corrigée.

Un hippodrome doit être une primitive géométrique propre, non une simple alternance entre deux points avec un demi-tour instantané. Paramètres proposés : point de référence, axe vrai, longueur de branche en NM, rayon de virage en NM, sens gauche/droite, vitesse, référence verticale et nombre de tours ou durée. Deux branches parallèles et deux demi-cercles tangents définissent la trajectoire. Le rayon et la vitesse doivent être compatibles avec les contraintes de virage/banc de l’aéronef. L’auteur peut ensuite convertir cette primitive en tracé éditable. Une attente type hippodrome n’implique pas ici une procédure IFR certifiée ni une branche chronométrée selon le vent.

Bornes proposées avant implémentation : 2 à 100 occurrences de points par route, au plus 32 objets, nombres finis ; hauteur AGL 0 à 30 000 ft ; consignes de vitesse dans les limites du genre et de l’objet ; taux de montée/descente 0 à 10 000 ft/min, virage 0,1 à 30 degrés/s. Les zéros de vitesse dans une route d’aéronef ne sont pas des attentes implicites : un stationnaire exige un type d’aéronef et un mode d’attente compatibles. Le champ AGL et le champ MSL sont exclusifs pour chaque consigne.

## 3. AGL et garde au relief

`altitude_mode: agl` + `height_agl_ft` exprime une hauteur de trajectoire au-dessus du terrain. `altitude_mode: msl` + `altitude_ft` exprime une altitude absolue. `constraints.min_clearance_ft` est une limite de sécurité, distincte de la consigne ; elle n’est pas une autre altitude.

L’autorité résout l’AGL en altitude MSL à partir du terrain : altitude MSL = altitude terrain MSL + hauteur AGL. La garde est contrôlée sur la trajectoire à venir, avec anticipation tenant compte de la vitesse et des capacités de montée, pas seulement sous l’objet à l’instant présent. Un AGL constant n’est pas toujours physiquement réalisable à grande vitesse au-dessus d’une crête. En cas de terrain inconnu ou de profil impossible, l’objet est indisponible ou la mission est mise en attente selon une politique explicite ; aucune altitude de terrain zéro n’est inventée.

Pour les bateaux : référence surface d’eau avec correction du pivot, contrôle du caractère aquatique et absence de navigation terrestre. Pour les objets fixes : pose locale sur terrain, avec contrôle de cohérence de la scène entre participants. Les rayons de découverte sont calculés depuis la position de référence, pas depuis une correction cosmétique du modèle.

## 4. Synchronisation entre joueurs

Architecture proposée :

- Un service d’opération fait autorité sur l’identité des objets, la version de mission, le démarrage, les pauses communes, la route courante et le journal des événements. Il ne s’agit pas d’un nouveau serveur ouvert par ce lot.
- Un seul moteur de trajectoire par objet produit son état. Il peut être situé dans le service, ou sur un poste X-Plane désigné quand la résolution AGL dépend du terrain du simulateur. Dans ce second cas, le service ne reconnaît qu’un seul propriétaire actif avec bail et numéro de génération, et relaie ses états.
- Chaque poste reçoit les états communs et dessine une instance locale du même objet. Il n’exécute pas son propre départ relatif au rechargement de Lua. Les clients sans cet adaptateur ne voient pas automatiquement les objets ; IVAO/VATSIM/JoinFS ne doivent pas être supposés répliquer ces instances arbitraires, notamment les bateaux et les objets au sol.
- Les échanges distants passent par le service d’opération authentifié de l’application, par exemple WebSocket chiffré. Le script Lua continue de parler seulement à son pont local, qui gère la session réseau. Le port UDP du prototype reste lié à 127.0.0.1.

Identité d’un état : identifiant d’opération, identifiant de session d’exécution, empreinte/version de mission, identifiant d’objet stable, génération d’autorité, séquence monotone et instant sur l’horloge commune. Contenu : latitude, longitude, altitude MSL résolue, orientation, vitesse/vecteur, segment, progression, tour et état de présence. Les événements de découverte portent en plus l’identité du pilote observateur et l’identité du vol actif ; le client ne choisit pas seul une identité de pilote crédible.

Les horloges locales sont monotones et leur décalage vers l’horloge d’autorité est estimé par échanges horodatés. L’heure civile du PC et l’heure de démarrage de chaque Lua ne servent pas d’autorité. Une pause locale ne gèle pas le bateau pour les autres ; seule la pause commune d’opération, ordonnée par l’autorité, suspend tous les mobiles. Un joueur qui rejoint en retard reçoit un instantané courant et ne redémarre pas la route depuis le premier point.

Ordre de grandeur à mesurer : états 2 à 5 fois par seconde pour un mobile lent, davantage pour une interception rapide ; affichage interpolé à chaque image avec un petit tampon et des numéros de séquence. Limiter l’extrapolation sur perte de liaison (par exemple 2 secondes), puis signaler un état périmé et refuser toute validation automatique. Ce sont des paramètres de recette, pas des performances réseau promises. Les phases et confirmations utilisent un journal fiable, acquitté, dédupliqué et rejouable, distinct du flux de positions fréquentes.

Une trajectoire déterministe et une origine temporelle commune limitent les écarts, mais ne suffisent pas pour les changements de route, les pauses, les pannes, les objets liés à un pilote et la résolution du terrain : les états de l’autorité restent la référence. Une déconnexion de l’autorité impose une relève explicitement arbitrée avec nouvelle génération ; aucun second poste ne s’autoproclame propriétaire en parallèle.

### 4.1 Le piège de l’AGL partagé

Deux scènes différentes peuvent donner deux terrains différents. Faire recalculer 800 ft AGL par chaque poste déplacerait les objets à des altitudes différentes. L’autorité transmet donc une altitude MSL commune, une source/version de terrain et la consigne AGL demandée. Les clients ne recalculent pas une autre altitude métier. Un conflit avec le relief local est signalé ; il appelle une politique de compatibilité (même scène/mesh, correction du scénario ou refus du placement), pas un déplacement silencieux de la cible. Un éventuel ajustement purement visuel du pivot ne change jamais la position utilisée pour les distances et les découvertes.

### 4.2 Ce qui est commun et ce qui reste personnel

La position du bateau est commune ; le regard et les masques sont propres à chaque pilote. Le Beechcraft peut déclarer « Objet en vue » alors que l’hélicoptère ne voit encore rien. Le service contrôle la déclaration, l’enregistre une seule fois et transmet l’information au destinataire prévu. Il applique ensuite la portée de l’événement choisie dans la mission : découverte commune au groupe et/ou destinataires du relais, sans attribuer fictivement une observation visuelle à tous les pilotes.

Les événements ne doivent pas être transportés uniquement par synchronisation de fichiers/git : ce mécanisme peut conserver le résultat métier, mais pas assurer la cadence des positions d’un mobile. Un aéronef réellement tenu par un autre joueur conserve une seule source de position ; ne pas dessiner un second exemplaire si le client réseau le représente déjà.

## 5. Recette avant activation

Deux postes, même mission et mêmes objets : démarrages décalés, arrivée tardive, différence d’horloge, pause locale/commune, perte de paquets, perte du propriétaire, resynchronisation et absence de doublon. Vérifier le passage des points, le nombre de tours, les variations de niveau/vitesse, l’AGL au-dessus d’une crête et une scène terrain divergente. Tester la visibilité avec un objet dans le champ mais trop petit, derrière une crête, derrière un bâtiment, dans le cockpit et avec zoom. Tant qu’un cas d’occultation n’est pas couvert, le résultat automatique reste `unknown`.

Référence SDK : https://developer.x-plane.com/sdk/XPLMScenery/ — sondage vertical du terrain chargé et coût des sondes ; ne documente pas une preuve d’absence d’occultation par toute la scène.
