# Carburant et niveau

Préparer le carburant d'un vol et choisir son niveau : un appareil, une route, un niveau, et le devis tombe — roulage,
délestage, réserve, carburant bloc, temps de vol et début de descente.

## Comment s'en servir

La préparation suit cinq pas, dans l'ordre où on prépare un vol : **1 Vol, 2 Route, 3 Météo, 4 Devis, 5 Départ**. Sur
un téléphone, la barre du haut montre un pas à la fois (touchez un numéro pour y aller, « Suivant » en bas de chaque
pas) ; sur un écran large, les cinq pas sont les uns sous les autres. Tout se recalcule à chaque changement : corrigez
la route, la météo, le devis et le vent suivent, sans bouton à presser. Le résultat (carburant bloc, délestage, temps,
début de descente) reste visible en bas de l'écran à chaque pas, avec d'où vient le vent (« vent : METAR LFRS »,
« vent : prévision ICON FL060 », « vent saisi »). Un ✓ marque un pas rempli. Les niveaux s'écrivent partout de la même
façon : en FL à partir de 5 000 ft (FL060), en pieds en dessous (3 500 ft).

**1 Vol.** Le départ, l'arrivée et le dégagement (codes OACI), la date du vol si vous voulez la prévision (TAF) plutôt
que l'observation, l'appareil et le niveau de croisière (en FL). L'appareil tient sur une ligne : l'appareil retenu, son immatriculation, son indicatif et d'où il vient. Un nouveau vol reprend le dernier
appareil choisi sur cet appareil ; sans choix, le devis attend. La loupe ouvre la recherche (le dernier choisi en tête) : tapez une fiche, une immatriculation, un indicatif ou un type. Les résultats viennent dans
cet ordre : vos fiches de performances, les appareils de la compagnie (sa flotte, puis ceux connus par son journal),
les types publiés, et en dernier le code tapé tel quel. Un appareil de la compagnie prend sa propre fiche s'il en a une,
sinon celle de son type, sinon une estimation du type — le devis le dit alors « approché ». L'immatriculation et
l'indicatif choisis suivent le vol jusqu'au compte rendu. La ligne « Croisière » dit d'où vient la consommation.

À côté de la date, l'horloge « +30 » pose le vol dans 30 min (arrondi aux 5 min ; chaque appui ajoute 30 min) et « Maint. » revient à l'heure courante : la météo des terrains (le TAF s'il couvre cette heure) et les vents en altitude sont relus aussitôt.

**2 Route.** Tapez la route dans le champ « Route » (Entrée la valide),
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
part du dernier niveau. Chaque changement réécrit le champ « Route » et est aussitôt transmis à la carte ; une voie
aérienne tapée reste écrite tant que les deux points qui l'encadrent restent voisins et à leur place.

« Afficher la carte » montre le vol sur la carte : sur un téléphone la Carte s'ouvre (le bouton de l'en-tête ramène
ici) ; sur un écran large elle s'ouvre à côté, et suit chaque changement. « Modifier la route » sur la carte ramène à
ce pas, le champ de la route prêt à la frappe.

**3 Météo.** Le vent (direction et force) et l'écart ISA. Sans direction, ou sans vent du tout, le carburant bloc est
donné en fourchette. « Lire la météo des terrains » affiche le départ, l'arrivée, le dégagement et
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

« ISA ± » est l'écart de température à l'atmosphère standard, en °C : il change la puissance disponible, la vitesse
vraie et le plafond. Une fois la météo lue, la ligne dessous le calcule d'après le METAR du départ — sa température
moins la température standard du terrain (15 − 1,98 × altitude du terrain en milliers de pieds) — et « Utiliser ISA … »
le reporte dans le champ. L'écart retenu est gardé dans vos réglages : le vol suivant part du même. Une fois la
prévision en altitude lue, une seconde ligne propose l'écart au niveau planifié, moyenné le long de la route
(« ISA −5 au FL060 d'après la prévision ARPEGE ») ; avec « Météo réelle », le devis prend celui-là, comme le vent.
« Lire la météo des terrains » dit « Lecture… » pendant les appels.

« Lire la météo des terrains » lit aussi la prévision en altitude (Open-Meteo, sans clé, avec ou sans lanceur) aux
points de la route : la carte « Vents et températures en altitude » donne, pour chaque point, le niveau planifié (ses
paliers compris), le vent, la température et l'écart ISA à ce niveau, avec le modèle (Météo-France AROME / ARPEGE sur
la France, ICON ailleurs en Europe, GFS au-delà), l'heure visée (la date du vol, sinon maintenant) et l'heure du run.
Avec « Météo réelle », le vent du devis devient la moyenne de ces vents au niveau planifié, le long de la route, à la
place du vent au sol des METAR ; la ligne sous les champs le dit. Les mêmes vents vont à la Carte, qui les dessine en
flèches. Hors réseau, la dernière prévision lue reste. Quand la route ou l'heure change, le vent en altitude d'avant
reste, marqué « prévision en cours… », jusqu'à la nouvelle prévision ; si elle ne vient pas, le vent au sol des METAR
prend le relais et c'est dit (« prévision en altitude indisponible »).

**4 Devis.** Le dessin montre, pour chaque niveau, le carburant du trajet (trait plein) et sa durée
(tirets). Le rond vert marque le niveau le plus économe, le carré orange le plus rapide ; la zone grisée, les niveaux
qu'on ne peut pas tenir sur ce trajet. Chaque niveau est chiffré comme le devis, avec le vent prévu à ce niveau quand
la météo réelle est retenue : au niveau choisi, la courbe et le devis disent le même chiffre. Touchez la courbe pour choisir un niveau, ou utilisez les deux boutons. « Montée » choisit la façon de monter : économique,
meilleur vario, rapide, au badin de la fiche, ou manuelle (vous donnez badin et vario).

Le pli « Altitude-densité » montre, pour l'écart ISA en abscisse, l'altitude-densité de chaque altitude pression (une
droite par millier de pieds) : c'est l'altitude « ressentie » par le rotor, les hélices et le moteur. Le trait vertical
est l'écart du vol, le trait horizontal le plafond de la fiche ; leur croisement dit à quelle altitude pression l'appareil
atteint son plafond ce jour-là (droite en gras). Un point marque le départ d’après le METAR (température et QNH).
Important pour les hélicoptères : par forte chaleur ou en altitude, le plafond réel peut tomber bien sous celui de la
fiche.

Sous l'abaque, « Atmosphère réelle au départ » montre la température prévue à chaque altitude au-dessus du départ
(trait plein) face à l'atmosphère type (tirets) : là où la courbe s'en écarte, l'écart ISA change avec l'altitude, et
les couches d'inversion (la température qui monte avec l'altitude) sont surlignées et dites dessous. La ligne de
lecture donne, au niveau planifié, la température, l'écart ISA et l'altitude-densité réelles.

Dépliez « Consignes de montée » pour suivre la montée jusqu'au niveau : gaz, régime, badin, vario, débit,
Mach, temps et carburant cumulés aux paliers, avec le profil dessiné. Le résultat donne carburant bloc, délestage, temps de vol et distance du début
de descente avant l'arrivée. « Détail du devis » le décompose phase par phase.

« Ouvrir dans » prépare le même vol ailleurs, dans un nouvel onglet : SimBrief
(options du vol préremplies, connexion SimBrief requise), SkyVector (la route tracée, avec vitesse et niveau),
Navigraph et ChartFox (les cartes des terrains de départ et d'arrivée, connexion requise). Une entrée grisée dit ce
qui lui manque (terrain, type d'appareil). Rien n'est envoyé qui ne soit déjà dans le vol. Les réglages du devis (roulage, réserve, marge, couloir météo, unités) sont dans le dernier pli.

**5 Départ.** Un récapitulatif d'une page : l'appareil, la route telle qu'elle sera déposée, le niveau (et ses
paliers), le vent et sa source, le carburant bloc. « Démarrer le vol » lance le plan de vol (mise en route,
repoussage, roulage…). La préparation peut dater de plusieurs jours : il commence donc par tout refaire à l'heure
réelle — la date du vol revient à maintenant, la météo des terrains et les vents en altitude sont relus, le devis
refait — et dit en une ligne ce qui a changé (« vent 273°/35 kt → 284°/44 kt · bloc 684 → 644 kg · arrivée prévue
17:03 ») ; hors ligne, il le dit et démarre avec le dernier devis. Il note ensuite l'heure de départ, qui devient la
mise en route du compte rendu. Sur un téléphone il ouvre la Carte, sur un grand écran il reste ici avec la Carte à
droite.
Changer le terrain de départ ensuite, c'est préparer un autre vol : l'heure de départ est effacée. Changer l'arrivée
après le départ est un déroutement : l'heure est gardée et le déroutement noté.

Une fois le vol démarré, le résultat en bas d'écran dit « Vol démarré à 13:14 · depuis 1 h 10 ». Un vol démarré se
termine en écrivant son compte rendu : à l'enregistrement, Carburant revient en préparation et Mes vols retire « en
cours ». Pour revenir en préparation sans compte rendu, « Annuler le départ » (après confirmation). La carte « Progression prévue » montre
où le vol devrait en être, en théorie : l'heure prévue de passage à chaque point (roulage, montée, croisière tronçon par
tronçon avec son vent, descente), le prochain point surligné, la distance parcourue et restante et le carburant restant
prévu. Elle suit l'heure, minute par minute, jusqu'au compte rendu ou à l'annulation, et part à la Carte avec le
vol. Le vol préparé ici — appareil, route, niveau, profil de montée et de
descente — est partagé : Carte et Compte rendu l'ont déjà.

## Les fiches de performances

L'onglet « Fiches » rassemble les fiches de la compagnie, partagées avec tous ses appareils. Elles sont rangées par
catégorie (hélicoptères, turbopropulseurs, réacteurs, pistons, autres) ; chaque type utilisé par la compagnie (flotte,
référence) qui n'a pas encore de fiche y figure aussi, « performances à renseigner », avec « Créer la fiche ».

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
- **Météo sans lanceur** (un téléphone, une tablette) : les METAR viennent alors de metar.vatsim.net, sans rien à
  régler. Les TAF (utiles quand vous donnez une date de vol) viennent d'avwx.rest, avec votre clé météo personnelle,
  saisie une fois sur l'appareil dans Réglages, carte « Clé météo (TAF, avwx.rest) » ; sans clé, la carte le dit et le METAR répond à la place. La
  carte météo dit d'où viennent les messages. Sans réseau du tout, elle montre la dernière météo gardée, avec son
  heure.
