# Carburant et niveau

Préparer le carburant d'un vol et choisir son niveau : un appareil, une route, un niveau, et le devis tombe — roulage,
délestage, réserve, carburant bloc, temps de vol et début de descente.

## Comment s'en servir

**L'appareil.** Une seule ligne en haut : l'appareil retenu, son immatriculation, son indicatif et d'où il vient. La
loupe ouvre la recherche : tapez une fiche, une immatriculation, un indicatif ou un type. Les résultats viennent dans
cet ordre : vos fiches de performances, les appareils de la compagnie (sa flotte, puis ceux connus par son journal),
les types publiés, et en dernier le code tapé tel quel. Un appareil de la compagnie prend sa propre fiche s'il en a une,
sinon celle de son type, sinon une estimation du type — le devis le dit alors « approché ». L'immatriculation et
l'indicatif choisis suivent le vol jusqu'au compte rendu. La ligne « Croisière » dit d'où vient la consommation.

**La route.** Tapez le départ, l'arrivée et le dégagement (codes OACI), puis la route dans le champ « Route »,
toujours visible : les points, les voies aériennes et les niveaux, comme dans un plan de vol (« LFBO TOU UN460
NTS/F280 LFRN »). Vous pouvez aussi y coller un plan de vol OACI ou la liste d'un OFP. Quand vous quittez le champ, la
route est remise au propre : en majuscules sur une ligne, sans DCT ni groupes vitesse-niveau, le départ et l'arrivée
aux bouts, un changement de niveau écrit « /F280 » après le point où il commence. Les voies aériennes restent écrites
(le devis suit les points). Les points inconnus restent à leur place et sont signalés juste dessous ; des coordonnées
s'écrivent à la façon OACI (« 4530N00030E »). La ligne suivante donne la distance et la route vraie, et d'où elles
viennent (la route, l'OFP SimBrief). Si la route ne se résout pas, « Saisir à la main » ouvre les deux champs. Avec
votre identifiant SimBrief réglé (⚙), « Dernier OFP SimBrief » reprend d'un coup la route, le niveau, le vent moyen et
l'appareil de votre dernier plan.

Le pli « Points » liste les points reconnus, du départ à l'arrivée. Les flèches montent ou
descendent un point dans la liste, la croix le retire ; le champ du bas en ajoute un avant l'arrivée : un identifiant
(balise, point, terrain) ou « NOM latitude longitude ». Chaque point intermédiaire a un champ de niveau facultatif, en
FL : c'est le niveau tenu à partir de ce point, pour une montée ou une descente par paliers. Un point sans niveau
continue le précédent (affiché en grisé) ; le vol part au niveau du plan. Le devis compte chaque palier (sa montée ou
sa descente, puis la croisière à ce niveau), le résultat affiche la suite des niveaux (FL100 → FL120), et la descente
part du dernier niveau. Chaque changement réécrit le champ « Route » (les points seuls) et est aussitôt transmis à
la carte.

**Le niveau et le vent.** Indiquez le niveau de croisière (en FL) et le vent : direction et force. Sans direction, ou
sans vent du tout, le carburant bloc est donné en fourchette. « Montée » choisit la façon de monter : économique,
meilleur vario, rapide, au badin de la fiche, ou manuelle (vous donnez badin et vario).

« ISA ± » est l'écart de température à l'atmosphère standard, en °C : il change la puissance disponible, la vitesse
vraie et le plafond. Une fois la météo lue, la ligne dessous le calcule d'après le METAR du départ — sa température
moins la température standard du terrain (15 − 1,98 × altitude du terrain en milliers de pieds) — et « Utiliser ISA … »
le reporte dans le champ. L'écart retenu est gardé dans vos réglages : le vol suivant part du même.

Le pli « Altitude-densité » montre, pour l'écart ISA en abscisse, l'altitude-densité de chaque altitude pression (une
droite par millier de pieds) : c'est l'altitude « ressentie » par le rotor, les hélices et le moteur. Le trait vertical
est l'écart du vol, le trait horizontal le plafond de la fiche ; leur croisement dit à quelle altitude pression l'appareil
atteint son plafond ce jour-là (droite en gras). Un point marque le départ d’après le METAR (température et QNH).
Important pour les hélicoptères : par forte chaleur ou en altitude, le plafond réel peut tomber bien sous celui de la
fiche.

**La météo.** Sous « Niveau et vent », « Lire la météo des terrains » affiche le départ, l'arrivée, le dégagement et
les terrains le long de la route : tous ceux à moins de 10 NM de part et d'autre de la route (rayon réglable dans les
réglages du devis) qui ont un METAR ou un TAF ; les autres sont ignorés. Chaque terrain dit sa distance depuis le
départ (le dégagement, depuis l'arrivée) ; au-delà de deux, les terrains intermédiaires sont repliés sous le départ,
l'arrivée et le dégagement. Pour chacun, ce qui compte pour le vol : la catégorie (VFR, MVFR, IFR, LIFR, en couleur), le vent et ses
composantes de face et de travers sur la piste principale du terrain (le sens le plus proche du vent), le plafond, la
visibilité, la température et le QNH, et un avertissement quand des CB ou des TCU sont annoncés ; le message brut est
replié. Avec une date de vol, c'est le TAF qui répond s'il couvre cette heure (et ses passages temporaires), sinon le
METAR. Cochez « Météo réelle » pour que le vent du devis devienne la moyenne des vents des terrains de la route
(départ, terrains intermédiaires, arrivée), tronçon par tronçon et pondérée par leur longueur — une approximation à
partir du vent au sol, dite sous les champs. Hors réseau, les dernières valeurs lues restent
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
