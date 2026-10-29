# Données

Ce que la compagnie publie pour l'appli — la base aéronautique, les procédures, les appareils, la météo — et l'état de chaque jeu de données. Cet écran se lit, et des actions y sont offertes sur la base aéronautique : Télécharger ses sources, la Construire, Purger les sources, puis la Publier.

## Comment s'en servir

<a id="data-cycle"></a>**Le cycle en vigueur.** En haut, le cycle AIRAC du moment (par exemple 2610), ses dates et le nombre de jours avant le suivant. Dessous, « Lanceur de ce poste » ou « Sans lanceur : lecture seulement » dit si cet ordinateur a un lanceur.

<a id="data-coverage"></a>**La couverture.** La liste des zones (pays, régions) que ce poste suit. À la première ouverture, ce sont toutes les zones publiées par la compagnie ; la liste est gardée sur cet appareil. « Ajouter un pays » met dans la couverture une zone que la suite connaît, même si personne ne la publie encore : elle est cochée pour « Construire ».

<a id="data-states"></a>**Les États.** Sous la couverture, les États sont rangés par couleur : vert, des procédures sont déjà publiées ; orange, elles se lisent à la demande ; rouge, rien n'est lisible. Le motif est écrit à chaque ligne, la couleur n'est jamais seule. Au-delà de sept lignes, « n autres » déplie le reste.

<a id="data-group-base"></a>**Base aéronautique.** Une ligne par source qui nourrit une zone de la couverture : son cycle, son âge (« publié il y a 3 jours »), le nombre de zones publiées et une pastille d'état. Touchez une ligne pour voir le lien de la source avec son adresse, sa licence, les zones nourries et ce que chaque zone a publié.

<a id="data-group-proc"></a>**Procédures.** Les procédures de la France (eAIP du SIA) et des États-Unis (CIFP de la FAA), avec le nombre de terrains publiés.

<a id="data-group-aircraft"></a>**Appareils.** Les types d'appareils et leurs performances : la date de l'édition, le nombre de types et de fichiers. Plus de 28 jours, la pastille passe à l'orange.

<a id="data-group-weather"></a>**Météo.** La météo mondiale et les routes NAT sont publiées avec le site : ces lignes n'ont ni cycle ni pastille.

<a id="data-states-pill"></a>**Les pastilles.** « À jour » : rien à faire. « Cycle dépassé » : le cycle publié est plus ancien que le cycle en vigueur (orange, rouge au-delà d'une semaine). « Parseur ancien » : publié par une version plus ancienne des constructeurs. « Plus de 28 jours » : un jeu sans cycle, publié il y a plus de 28 jours. « Absent du dépôt » : rien n'est publié. Un groupe s'ouvre de lui-même quand une de ses lignes demande attention.

<a id="data-more"></a>**Les autres jeux.** Au plus sept lignes par groupe ; « n autres jeux » déplie le reste et les sources seulement envisagées ou écartées (leur lien, leur licence, leur statut).

<a id="data-build"></a>**Construire la base.** En tête du groupe Base aéronautique, le panneau « Télécharger, construire, purger » agit sur les zones cochées avec trois boutons, dans cet ordre : Télécharger · Construire · Purger. « Construire » refait la base des zones cochées sur le lanceur de ce poste : un navigateur sans fenêtre (Edge, sinon Chrome) construit les zones l'une après l'autre, chacune est enregistrée dans le dépôt de données dès qu'elle est prête. Toutes les zones de la couverture sont cochées au départ ; décochez celles que vous ne voulez pas refaire. Les trois boutons sont grisés ensemble, avec leur raison écrite une seule fois dessous : « Il faut le lanceur du poste », « Une autre opération est en cours », « Cochez au moins une zone », « Hors ligne ».

<a id="data-build-personal"></a>**Sources sous licence personnelle.** ENAIRE (Espagne), NATS (Royaume-Uni) et les données X-Plane ne sont proposées que si une zone cochée les utilise, et ne sont jamais cochées d'office : cochez-les seulement si le dépôt de données n'est utilisé que par vous. X-Plane coché, la construction se fait dans la page, ce qui n'est pas encore possible ici : elle s'arrêtera avec ce motif.

<a id="data-build-run"></a>**Pendant la construction.** Une barre, « n zones sur m », l'étape et le temps écoulé ; une ligne par zone dit en attente, construction (n / m sources), construite, échec avec son motif, ou annulée. « Arrêter » demande l'arrêt : la zone en cours se termine, les zones déjà construites sont gardées. Vous pouvez quitter l'écran : la construction continue sur le lanceur et se retrouve à la réouverture. Si le lanceur s'est arrêté en route, l'écran dit « Construction interrompue » avec le dernier état de chaque zone : relancez, en décochant les zones déjà faites si vous voulez.

<a id="data-build-end"></a>**À la fin.** Une notification donne les comptes (« Base construite : 3 zones ; 1 en échec (gb) ») et le résumé reste dans le panneau avec ce qu'il y a à faire : zone en échec (le motif est écrit sur sa ligne : navigateur sans fenêtre, délai dépassé, sortie invalide, écriture impossible…), construction arrêtée, aucun navigateur trouvé (« Ni Edge ni Chrome n'ont été trouvés sur ce poste : installez l'un des deux. »). Les états des lignes sont relus ensuite.

<a id="data-download"></a>**Télécharger.** Le bouton « Télécharger » récupère, sur le lanceur de ce poste, les sources brutes des zones cochées (openAIP, FAA, UK Mil AIP, NAV CANADA, tracks NAT du jour ; ENAIRE seulement si elle est cochée parmi les sources sous licence personnelle). Une ligne par zone dit où elle en est (« téléchargement (2 / 3 sources) ») et, dessous, une ligne par source : téléchargée (n fichiers), inchangée, échec avec son motif et son code HTTP (« HTTP 404 »), ignorée (licence non déclarée) ou manuelle. Ce qui n'a pas changé n'est jamais réécrit. À la fin, une notification donne les comptes (« Téléchargé : 2 zones changées, 1 inchangée ; 1 échec ») ; les sources que le lanceur ne télécharge pas (le SIA, par exemple) sont listées avec leur nom, avec un lien seulement si leur adresse est en https, « à déposer à la main » ; si des fichiers de sources suivis par git ont été modifiés, l'écran le dit (« n fichiers de sources modifiés, hors des données synchronisées »). « Rien à télécharger pour ces zones » : aucune des zones cochées n'a de source téléchargeable. Deux téléchargements ne peuvent pas se suivre à moins de 30 s : l'écran dit « Réessayez dans n s ».

<a id="data-purge"></a>**Purger.** Le bouton « Purger » retire du poste les sources brutes des zones cochées (celles qu'on retélécharge) et leurs caches. Il calcule d'abord le plan sans rien effacer, puis pose une seule question : « Purger 15 fichiers (14,3 Mo) des sources de Espagne, France ? ». Si les fichiers du SIA (France) en font partie, la question rappelle qu'ils servent aussi les contours des autres zones à la construction ; les fichiers suivis par git sont toujours gardés et comptés. Non : rien n'est retiré. Oui : la purge se fait et l'écran dit « Purgé : n fichiers, x Mo », avec les chemins refusés (laissés en place). Rien à retirer : « Rien à purger », sans question.

<a id="data-publish"></a>**Publier la base.** Sous « Construire », le panneau « Publier la base » envoie vers le dépôt des données ce qui a été construit sur ce poste. Une zone construite est commitée entière sur le poste et part aussi à la synchronisation suivante : « Publier » l'envoie tout de suite. Il dit d'abord où en est le poste : « 3 fichiers modifiés · 2 commits à envoyer », la date du dernier passage et, s'il y en a une, la fusion qui attend dans data/ (la publication la conclut d'abord). Touchez « Publier » : une seule question rappelle les fichiers et les commits, puis le passage se fait ; une barre sans fin montre qu'il travaille. Pendant ce temps les boutons du panneau « Télécharger, construire, purger » sont grisés, et « Publier » l'est pendant une opération de ce panneau : une opération à la fois.

<a id="data-publish-end"></a>**À la fin de la publication.** Une notification donne les comptes et le résultat reste dans le panneau : ce qui a été envoyé (fichiers commités, fichiers reçus) ; les fichiers de la base gardés sur le poste parce qu'une construction était en cours ; les conflits (le plus récent est gardé, voir Réglages › Conflits) ; les fichiers refusés parce qu'ils n'ont pas le format d'un fichier de données. Un échec le dit en une phrase, avec ce que répond le lanceur : rien n'est perdu, les fichiers restent sur le poste. Le bouton est grisé avec sa raison écrite dessous : « Il faut le lanceur du poste », « Une construction est en cours : publiez quand elle est finie », « Rien à publier », « Le cadre ne sait pas encore publier la base : mettez l'appli à jour », « Hors ligne ».

<a id="data-journal"></a>**Le journal.** Au pied de l'écran, les 50 dernières opérations de cet appareil : heure UTC, verbe, zones, résultat.

## Cas particuliers

- **Sans lanceur** : l'écran se lit de la même façon ; il montre ce qui est publié.
- **Une lecture qui échoue** : la section le dit en une ligne, le reste de l'écran s'affiche.
