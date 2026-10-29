# Données

Ce que la compagnie publie pour l'appli — la base aéronautique, les procédures, les appareils, la météo — et l'état de chaque jeu de données. Cet écran se lit seulement : il ne télécharge, ne construit et ne publie rien.

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

## Cas particuliers

- **Sans lanceur** : l'écran se lit de la même façon ; il montre ce qui est publié.
- **Une lecture qui échoue** : la section le dit en une ligne, le reste de l'écran s'affiche.
