# Carburant et niveau

Préparer le carburant d'un vol et choisir son niveau : un appareil, une route, un niveau, et le devis tombe — roulage,
délestage, réserve, carburant bloc, temps de vol et début de descente.

## Comment s'en servir

**L'appareil.** Choisissez sa fiche de performances dans la première carte. Sans fiche, prenez « Autre type » et
tapez son code OACI (C30J, EC45…) : le devis part alors d'une estimation du type, signalée « approché ». La ligne
« Croisière » dit d'où vient la consommation retenue.

**La route.** Tapez le départ et l'arrivée (codes OACI) : la distance et la route vraie se calculent seules. Pour une
route détaillée, dépliez « Route détaillée » et collez-la (plan de vol OACI, ou une ligne « point latitude longitude »
par point). Si rien n'est reconnu, tapez la distance et la route à la main. Avec votre identifiant SimBrief réglé
(⚙), « Dernier OFP SimBrief » reprend d'un coup la route, le niveau, le vent moyen et l'appareil de votre dernier
plan.

**Le niveau et le vent.** Indiquez le niveau de croisière (en FL) et le vent : direction et force. Sans direction, ou
sans vent du tout, le carburant bloc est donné en fourchette. « Montée » choisit la façon de monter : économique,
meilleur vario, rapide, au badin de la fiche, ou manuelle (vous donnez badin et vario).

**La météo.** Sous « Niveau et vent », « Lire la météo des terrains » affiche, pour le départ, l'arrivée et un terrain
intermédiaire facultatif, ce qui compte pour le vol : la catégorie (VFR, MVFR, IFR, LIFR, en couleur), le vent et ses
composantes de face et de travers sur la piste principale du terrain (le sens le plus proche du vent), le plafond, la
visibilité, la température et le QNH, et un avertissement quand des CB ou des TCU sont annoncés ; le message brut est
replié. Avec une date de vol, c'est le TAF qui répond s'il couvre cette heure (et ses passages temporaires), sinon le
METAR. Cochez « Météo réelle » pour que le vent du devis devienne la moyenne des vents des terrains le long de la route —
une approximation à partir du vent au sol, dite sous les champs. Hors réseau, les dernières valeurs lues restent
affichées avec leur heure.

**La décision du niveau.** Le dessin montre, pour chaque niveau, le carburant du trajet (trait plein) et sa durée
(tirets). Le rond vert marque le niveau le plus économe, le carré orange le plus rapide ; la zone grisée, les niveaux
qu'on ne peut pas tenir sur ce trajet. Touchez la courbe pour choisir un niveau, ou utilisez les deux boutons.

**Le résultat.** En bas de l'écran, toujours visible : carburant bloc, délestage, temps de vol et distance du début
de descente avant l'arrivée. « Détail du devis » le décompose phase par phase.

**Les consignes de montée.** Dépliez-les pour suivre la montée jusqu'au niveau : gaz, régime, badin, vario, débit,
Mach, temps et carburant cumulés aux paliers, avec le profil dessiné.

**Ouvrir dans.** Sous le résultat, « Ouvrir dans » prépare le même vol ailleurs, dans un nouvel onglet : SimBrief
(options du vol préremplies, connexion SimBrief requise), SkyVector (la route tracée, avec vitesse et niveau),
Navigraph et ChartFox (les cartes des terrains de départ et d'arrivée, connexion requise). Une entrée grisée dit ce
qui lui manque (terrain, type d'appareil). Rien n'est envoyé qui ne soit déjà dans le vol.

**Vers la carte et le compte rendu.** Le vol préparé ici — appareil, route, niveau, profil de montée et de descente —
est partagé : ouvrez Carte ou Compte rendu, il y est déjà.

## Les fiches de performances

L'onglet « Fiches » rassemble les fiches de la compagnie, partagées avec tous ses appareils.

- **Importer** : un fichier (CSV de performances, JSON, `.lnmperf` de Little Navmap, OFP SimBrief) ou un texte collé
  (les mêmes, ou la réponse de ChatGPT). Une fiche tirée d'un OFP est calibrée sur ses temps et sa consommation réels.
- **Rien n'est écrit sans vous** : chaque changement d'une fiche passe par un aperçu, une ligne par valeur, avant et
  après. Décochez ce que vous ne voulez pas prendre, puis « Appliquer la sélection ». Une ligne de la table de régimes
  retirée y figure aussi : décochée, elle reste.
- **Compléter une fiche** : « Compléter (EUROCONTROL) » propose les valeurs connues du type ; celles qui remplaceraient
  une valeur déjà saisie arrivent décochées. « Compléter depuis une autre fiche » ne remplit que les champs vides.
- **ChatGPT** : « Copier la demande » prépare la question pour le type (ou pour les seuls champs vides) ; collez-la dans
  ChatGPT, puis sa réponse telle quelle dans la zone prévue, et « Lire ».
- **Modifier, exporter** : l'éditeur montre les champs par groupe. Sur un écran d'ordinateur, la table régime / débit
  se modifie ligne à ligne ; sur un téléphone elle est en lecture. Exports `.lnmperf` et JSON ; suppression après
  confirmation.

## Réglages et unités

Dans « Réglages du devis » : minutes de roulage et de réserve, pourcentage de contingence, et un débit de croisière
propre à ce vol (il remplace celui de la fiche). « Unités affichées » change le carburant (kg ou lb), la vitesse, les
altitudes et les distances à l'écran ; les niveaux restent des niveaux de vol, et rien ne change dans les fiches.

## Cas particuliers

- **Sans fiche** : le devis repose sur une estimation du type, marquée « approché » ; importez ou créez une fiche dès
  que possible.
- **Sans consommation connue** : le devis le dit plutôt que d'afficher un zéro trompeur.
- **Route inconnue** : les points non reconnus sont listés ; la distance et la route vraie se tapent à la main.
- **Hors ligne** : tout se calcule sur l'appareil, à partir des fiches déjà reçues. Seuls SimBrief et la météo attendent
  le réseau ; le dernier OFP et la dernière météo restent gardés sur l'appareil.
- **Météo sans lanceur** : le service météo n'est joignable qu'à travers le lanceur d'un poste ; ailleurs, la carte
  montre la dernière météo gardée, ou le dit.
