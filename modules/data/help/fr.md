# Données

Ce que la compagnie publie pour l'appli — la base aéronautique, les procédures, les appareils, la météo — et l'état de chaque jeu de données. Cet écran se lit, et une seule action y est offerte : Construire la base aéronautique ; il ne télécharge ni ne publie rien.

## Comment s'en servir

<a id="data-cycle"></a>**Le cycle en vigueur.** En haut, le cycle AIRAC du moment (par exemple 2610), ses dates et le nombre de jours avant le suivant. Dessous, « Lanceur de ce poste » ou « Sans lanceur : lecture seulement » dit si cet ordinateur a un lanceur.

<a id="data-coverage"></a>**La couverture.** La liste des zones (pays, régions) que ce poste suit. À la première ouverture, ce sont toutes les zones publiées par la compagnie ; la liste est gardée sur cet appareil.

<a id="data-states"></a>**Les États.** Sous la couverture, les États sont rangés par couleur : vert, des procédures sont déjà publiées ; orange, elles se lisent à la demande ; rouge, rien n'est lisible. Le motif est écrit à chaque ligne, la couleur n'est jamais seule. Au-delà de sept lignes, « n autres » déplie le reste.

<a id="data-group-base"></a>**Base aéronautique.** Une ligne par source qui nourrit une zone de la couverture : son cycle, son âge (« publié il y a 3 jours »), le nombre de zones publiées et une pastille d'état. Touchez une ligne pour voir le lien de la source avec son adresse, sa licence, les zones nourries et ce que chaque zone a publié.

<a id="data-group-proc"></a>**Procédures.** Les procédures de la France (eAIP du SIA) et des États-Unis (CIFP de la FAA), avec le nombre de terrains publiés.

<a id="data-group-aircraft"></a>**Appareils.** Les types d'appareils et leurs performances : la date de l'édition, le nombre de types et de fichiers. Plus de 28 jours, la pastille passe à l'orange.

<a id="data-group-weather"></a>**Météo.** La météo mondiale et les routes NAT sont publiées avec le site : ces lignes n'ont ni cycle ni pastille.

<a id="data-states-pill"></a>**Les pastilles.** « À jour » : rien à faire. « Cycle dépassé » : le cycle publié est plus ancien que le cycle en vigueur (orange, rouge au-delà d'une semaine). « Parseur ancien » : publié par une version plus ancienne des constructeurs. « Plus de 28 jours » : un jeu sans cycle, publié il y a plus de 28 jours. « Absent du dépôt » : rien n'est publié. Un groupe s'ouvre de lui-même quand une de ses lignes demande attention.

<a id="data-more"></a>**Les autres jeux.** Au plus sept lignes par groupe ; « n autres jeux » déplie le reste et les sources seulement envisagées ou écartées (leur lien, leur licence, leur statut).

<a id="data-build"></a>**Construire la base.** En tête du groupe Base aéronautique, le panneau « Construire la base » refait la base des zones cochées sur le lanceur de ce poste : un navigateur sans fenêtre (Edge, sinon Chrome) construit les zones l'une après l'autre, chacune est enregistrée dans le dépôt de données dès qu'elle est prête. Toutes les zones de la couverture sont cochées au départ ; décochez celles que vous ne voulez pas refaire. Le bouton est grisé avec sa raison écrite dessous : « Il faut le lanceur du poste », « Une autre opération est en cours », « Cochez au moins une zone », « Hors ligne ».

<a id="data-build-personal"></a>**Sources sous licence personnelle.** ENAIRE (Espagne), NATS (Royaume-Uni) et les données X-Plane ne sont proposées que si une zone cochée les utilise, et ne sont jamais cochées d'office : cochez-les seulement si le dépôt de données n'est utilisé que par vous. X-Plane coché, la construction se fait dans la page, ce qui n'est pas encore possible ici : elle s'arrêtera avec ce motif.

<a id="data-build-run"></a>**Pendant la construction.** Une barre, « n zones sur m », l'étape et le temps écoulé ; une ligne par zone dit en attente, construction (n / m sources), construite, échec avec son motif, ou annulée. « Arrêter » demande l'arrêt : la zone en cours se termine, les zones déjà construites sont gardées. Vous pouvez quitter l'écran : la construction continue sur le lanceur et se retrouve à la réouverture. Si le lanceur s'est arrêté en route, l'écran dit « Construction interrompue » avec le dernier état de chaque zone : relancez, en décochant les zones déjà faites si vous voulez.

<a id="data-build-end"></a>**À la fin.** Une notification donne les comptes (« Base construite : 3 zones ; 1 en échec (gb) ») et le résumé reste dans le panneau avec ce qu'il y a à faire : zone en échec (le motif est écrit sur sa ligne : navigateur sans fenêtre, délai dépassé, sortie invalide, écriture impossible…), construction arrêtée, aucun navigateur trouvé (« Ni Edge ni Chrome n'ont été trouvés sur ce poste : installez l'un des deux. »). Les états des lignes sont relus ensuite.

<a id="data-journal"></a>**Le journal.** Au pied de l'écran, les 50 dernières opérations de cet appareil : heure UTC, verbe, zones, résultat.

## Cas particuliers

- **Sans lanceur** : l'écran se lit de la même façon ; il montre ce qui est publié.
- **Une lecture qui échoue** : la section le dit en une ligne, le reste de l'écran s'affiche.
