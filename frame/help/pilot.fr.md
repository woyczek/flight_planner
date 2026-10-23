<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilote — manuel

L'appli Pilote rassemble les outils de préparation et de suivi d'un vol : carburant et niveau, carte, compte rendu,
mes vols, passage au site de la compagnie. Elle marche sur un téléphone comme sur un ordinateur, avec ou sans réseau.

## Premier démarrage

- **Les verbes.** Chaque outil est un verbe du menu (☰ sur un téléphone, colonne de gauche sur un écran). L'adresse
  d'un outil (`#fuel`, `#report`…) suffit à y revenir.
- **Votre identité.** Dans ⚙ Réglages, réglez votre trigramme et vos identifiants IVAO, VATSIM et SimBrief : les
  outils s'en servent pour préremplir.
- **Le niveau.** Toujours dans les Réglages, « Niveau » choisit ce que le menu montre : Découverte, Courant ou Complet.
  Un outil caché reste joignable par son adresse.
- **L'aide.** Chaque outil a en tête un volet replié « Comment s'en servir » ; le bouton ? ouvre ce manuel au chapitre
  de l'outil.

## Données et synchronisation

- **Hors ligne d'abord.** Tout ce que vous faites est gardé sur l'appareil et marche sans réseau.
- **Seul sur cet appareil.** Sans échange coché dans les Réglages, rien ne part ailleurs : exportez de temps en temps
  la sauvegarde de l'appareil (un fichier), c'est la seule copie.
- **Plusieurs appareils, ou à plusieurs.** Cochez l'usage dans les Réglages et réglez l'accès (dépôt GitHub et jeton
  personnel, ou le lanceur d'un poste). Vos écritures partent ensemble à la synchronisation : au démarrage, toutes les
  10 minutes en ligne, ou par le bouton d'état en haut de l'écran.
- **Conflits.** Un fichier changé ici et ailleurs en même temps garde sa version la plus récente ; l'autre reste
  consultable (bouton d'état, puis « Conflits ») et peut être reprise.

<!-- chapter: fuel -->
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
15:03Z (17:03) ») ; hors ligne, il le dit et démarre avec le dernier devis. Il note ensuite l'heure de départ, qui devient la
mise en route du compte rendu. Sur un téléphone il ouvre la Carte, sur un grand écran il reste ici avec la Carte à
droite.
Changer le terrain de départ ensuite, c'est préparer un autre vol : l'heure de départ est effacée. Changer l'arrivée
après le départ est un déroutement : l'heure est gardée et le déroutement noté.

Une fois le vol démarré, le résultat en bas d'écran dit « Vol démarré à 11:14Z (13:14) · depuis 1 h 10 ». Les heures sont en UTC (« Z ») ;
l'heure de l'appareil s'ajoute entre parenthèses au départ, au décollage et à l'arrivée prévus. Un vol démarré se
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

<!-- chapter: maps -->
# Carte

Voir son vol sur une carte aéronautique et son profil vertical, ou les cartes d'une mission : espaces aériens,
terrains, balises, voies aériennes, altitudes minimales. La route du vol se modifie aussi sur la carte.

## Comment s'en servir

**Le vol prévu.** La carte montre le vol préparé dans Carburant : départ, points de la route, arrivée, et le terrain
de dégagement en tirets gris. En haut, une ligne le résume : départ et arrivée, dégagement, niveau, distance, type
d'appareil. Quand le vol change dans Carburant, la carte suit d'elle-même.

**La carte et ce qu'elle montre.** Autour de la route : les espaces aériens qu'elle traverse ou frôle (zones
réglementées, dangereuses, interdites, espaces contrôlés), les voies aériennes basses ou hautes selon votre niveau,
les terrains et les balises, et dans chaque carré d'un degré l'altitude minimale de sécurité (le chiffre brun, en
milliers et centaines de pieds : « 3⁵ » veut dire 3 500 ft). Les petits chiffres violets le long de la route sont les
distances depuis le départ, en milles nautiques. Faites glisser la carte avec un doigt, écartez deux doigts pour
zoomer ; « Recentrer » revient sur toute la route. La carte reste où vous l'avez mise, même quand la route change :
seul « Recentrer » (ou un autre vol) la recadre. Vue de loin, la carte ne montre que ce qui est près de la route ;
rapprochez-vous pour tout voir.

**Le profil et le curseur.** Sous la carte, le profil vertical coupe la route de bout en bout : le relief, les
espaces aériens où vous entrez à l'altitude prévue, et la trajectoire du vol en violet. Faites glisser le doigt sur le
profil : un curseur bleu le suit, et le même curseur se place sur la carte. Touchez la route sur la carte pour le
placer là. La ligne sous le profil dit ce qu'il y a sous le curseur : distance depuis le départ, altitude prévue,
hauteur du relief, et l'espace aérien où vous êtes à ce moment-là.

**Six modes de carte.** Le bouton en haut à gauche de la carte montre le mode choisi ; touchez-le pour voir les six
modes. « IFR bas » : voies aériennes basses, espaces aériens, altitudes minimales et balises. « IFR haut » : voies
hautes (UN…, UM…), espaces au-dessus du FL195. « VFR » : fond topographique avec les villes, espaces utiles en VFR,
points de report et obstacles. « Topo » : le relief et, de près, les courbes de niveau (tous les 500 ft ou 100 m selon votre unité, les
maîtresses chiffrées), avec seulement les terrains, les villes et les obstacles.
« CAM » : vol militaire, l'IFR de votre niveau plus les axes de ravitaillement, les tracks NAT du jour, les zones R, D, P,
TSA, TRA, CBA et le RTBA à tous les niveaux.
« Auto » choisit selon le niveau de votre vol (IFR haut à partir du FL195). Le mode est gardé sur cet appareil.

**Plus vous zoomez, plus elle en dit.** De loin, la carte ne montre que les grands terrains, les voies et leurs noms.
En vous rapprochant : les points des voies (triangles et balises), le niveau minimal de chaque voie (« F195 »), puis
la distance du tronçon, sa route (« 097° »), les points de report et les obstacles. De près, chaque obstacle porte sa hauteur au-dessus du
sol, et l'altitude de son sommet entre parenthèses (« 434 AGL (771) »).

**Les couches.** Le bouton aux calques, sous le réglage de la carte, ouvre la liste de ce qu'elle dessine : familles
d'espaces (TMA / CTR, D / R / P, FIR, autres), voies basses et hautes, balises, points des voies, points de report
VFR, obstacles, altitudes minimales, villes, canevas, dégagement, noms des espaces,
noms des voies. Cochez ou décochez : la carte suit, et votre choix
est gardé pour ce réglage sur cet appareil. « Tout remettre » revient au choix d'origine. « Autour de la route
seulement », cochée d'origine en IFR, limite les espaces et les voies au voisinage de la route ; décochée, toute la
carte visible est dessinée, pour regarder ailleurs. Vue de près, tout est dessiné de toute façon. Tout en bas, le curseur « Complexité (essai) » montre moins de détails vers la
gauche, plus vers la droite, à tous les zooms. Chaque élément de la carte a sa plage de zoom : les points de report
VFR n'apparaissent que tout près, les CTR de près, les TMA en vue moyenne, les FIR de loin.

**Toucher ou survoler pour en savoir plus.** Touchez, cliquez ou survolez le nom d'une voie, le libellé d'un espace
ou une barbule de vent : une petite bulle donne l'essentiel en deux lignes — pour une voie, le tronçon (point →
point), sa distance, ses routes, son plancher et son plafond ; pour un espace, son nom et ses limites en notation SIA
(« TMA 8 AQUITAINE 2000|FL145 D »). Touché ailleurs dans un espace, une carte montre les espaces sous le doigt,
un ou plusieurs : un bloc de niveaux, comme le profil vertical (une colonne numérotée par espace,
de son plancher à son plafond), puis la liste numérotée avec leurs limites. Elle reste ouverte : la croix ✕ ou Échap la ferment, un autre toucher la
remplace. Elle suit
le pointeur, reste 5 secondes, laisse la place à la suivante, et se ferme par un toucher ailleurs ou un déplacement de
la carte. Sur une balise, la bulle donne son type, son indicatif et sa fréquence ; quand
plusieurs balises sont au même endroit, la carte garde la plus utile (VOR, TACAN ou DME, puis NDB, puis ILS) et la bulle
nomme les autres (« aussi ici : ILS 25L BG 109.9 »). Sur le profil, le doigt ou la souris donnent de même les espaces traversés.

**Les points de report VFR d'un terrain.** Passez la souris sur un terrain : ses points de report et les séquences
tirées de ses cartes VAC s'allument (cercles verts nommés, tirets entre les points). Touchez-le : la carte se rapproche
de ses points s'ils sont serrés, et sa carte donne les séquences (avec la page de la VAC) puis les consignes de la VAC,
repliées page par page. Elle reste ouverte pendant que vous déplacez la carte : la croix ✕ ou
Échap la ferment, un autre terrain la remplace. Toucher un point de report ouvre de même la carte de son terrain, ce point
en tête. En mode VFR, les points du terrain de départ et de celui
d'arrivée sont montrés d'office. Ces données sont extraites automatiquement des VAC : elles sont marquées « à vérifier »,
ne sont pas l'itinéraire publié ; la carte VAC fait foi. Quand le terrain a été
analysé à la main, la carte le dit, les routes portent leur nom, leurs pistes et leurs conditions, un tracé relu suit
la carte VAC (tirets longs) et une flèche marque un sens unique. Les points de report de la base sont toujours là, en noir pour les avions et en vert pour les
hélicoptères ; les séquences et les consignes des VAC s'y ajoutent une fois importées. Elles apparaissent une
fois importées par l'administrateur (Paramètres › Maintenance).

**En vol.** Une fois le vol démarré dans Carburant, la carte montre où vous devriez être (avion creux, « prévu
14:32Z ») et où vous êtes (avion plein, orienté à votre route, avec la trace des 30 dernières minutes en pointillé). Au-
dessus de la carte, une ligne dit l'écart : en avance ou en retard (minutes et NM), à combien de NM de la route, et
votre altitude contre celle prévue ; le profil montre les deux altitudes. De près, chaque point porte son heure
estimée (ETA) sous son nom, sans jamais couvrir un terrain, en UTC (« 14:52Z »), l'heure locale entre parenthèses au départ et à l'arrivée. « Suivre » garde la carte sur votre position ; un déplacement de la carte l'arrête. Sans position (GPS
ou réseau non activés), la ligne le dit et ouvre les réglages ; une position de plus de 2 minutes est grisée.
La ligne finit par la source de la position : GPS, réseau, IVAO, VATSIM, X-Plane ou Little Navmap.

**Les vents en altitude.** Quand Carburant a la prévision du vent au niveau du vol, la carte la montre en barbules
le long de la route : à chaque point, et tous les 50 NM entre deux points. La hampe pointe d'où vient le vent ; un
fanion vaut 50 kt, une barbe 10 kt, une demi-barbe 5 kt. Touchez une barbule (ou passez dessus à la souris) : la bulle
donne la direction, la force, la température, le niveau et l'heure de la prévision. La couche « Vents en altitude »
les cache.

**Les paliers.** Si la route fixe un niveau à certains points dans Carburant, le profil dessine les paliers : montée,
palier, nouvelle montée ou descente, avec la fin de montée et le début de descente recalculés. Les points tournants
de la route sont aussi repérés sur le profil.

**Montée et descente.** Les losanges violets marquent la fin de la montée (TOC) et le début de la descente (TOD),
sur la carte comme sur le profil. Ils viennent du calcul de Carburant ; sans lui, la carte les estime avec des taux
de montée et de descente courants.

**Les cartes de mission.** La première liste en haut choisit ce que montre la carte : le vol prévu, ou une mission
de la compagnie. Pour une mission, une seconde liste choisit parmi ses cartes (vue d'ensemble, cible, détail…).
Chaque carte est redessinée comme dans le studio : même cadre, même réglage d'affichage, avec les points de la
mission, ses zones hachurées et son cheminement. Le profil vertical montre alors celui de la mission.

**Modifier la route sur la carte.** Touchez « Modifier » en haut à droite de la carte : les points tournants
s'entourent d'un cercle. Faites glisser un point jusqu'à un fixe, une balise ou un terrain : il s'y pose (lâché
ailleurs, il devient un point libre, nommé par ses coordonnées, comme 4530N00030E). Pour ajouter un point, touchez « + » à côté de « Modifier », puis touchez
l'endroit voulu (ou restez appuyé une demi-seconde) : sur un fixe, une balise ou un terrain il s'y pose, ailleurs c'est
un point libre ; il s'ajoute au tronçon le plus proche. Un simple toucher n'ajoute rien : il montre l'infobulle. Touchez un point de la route : sa carte donne son niveau et propose « Retirer ». Le départ et l'arrivée ne
bougent pas ici. Sur le profil, glissez un palier vers le haut ou le bas : le niveau change à partir du point qui
ouvre ce tronçon, par pas de FL10 (sur le premier tronçon, c'est le niveau du vol) ; dans la carte d'un point, « − »
et « + » font de même. « Annuler » reprend le dernier geste. Chaque changement est enregistré aussitôt dans le vol, et
Carburant refait le devis ; le profil suit. « Terminer » ferme le mode, et la carte se déplace de nouveau au doigt.
Pour taper la route en texte, « Modifier la route » ouvre l'étape Route de Carburant.

## Sans réseau

**Ce qui marche sans réseau.** La carte, les espaces aériens, les terrains, les balises et le profil restent
disponibles hors ligne pour les zones déjà consultées, et pour celles gardées dans Réglages › Données hors ligne.
Gardez-y la zone de votre vol avant de partir : tout y sera, même sans réseau.

**Le fond de carte.** Le fond (routes, villes, relief en couleur) vient d'Internet. Sans réseau, la carte se dessine
sur un fond uni avec le contour des pays, et une ligne le signale ; tout le reste est là.

**Le relief du profil.** Le relief du profil vient aussi d'Internet. Sans réseau, le profil montre à la place
l'altitude minimale de sécurité de chaque carré traversé (en tirets bruns), et une ligne le signale.

## Cas particuliers

**Pas de vol.** Sans vol préparé, la carte est cachée et propose « Ouvrir Carburant ». Les cartes de mission restent
accessibles par la liste du haut.

**Base aéronautique absente.** Si la base aéronautique n'a pas encore été publiée par un poste de la compagnie, la
carte ne montre que la route, et le dit.

**Zone non gardée.** Hors ligne, au-dessus d'une zone jamais consultée ni gardée, la carte n'a rien à montrer ; le
bouton « Données hors ligne » ouvre les réglages pour la garder la prochaine fois.

**Cycle différent.** Chaque carte de mission retient le cycle des données avec lequel elle a été faite. Si la base
actuelle est d'un autre cycle, une ligne le dit : les espaces aériens ont pu changer depuis.

**Mission ancienne.** Une mission enregistrée avant cette version ne porte pas son réglage d'affichage. La carte prend
alors le réglage habituel du type de carte (détaillé pour une cible ou un détail, simplifié sinon) et le signale.
Ouvrir la mission dans le studio et l'enregistrer suffit pour qu'elle garde ensuite le sien.

<!-- chapter: report -->
# Compte rendu

Écrire le compte rendu d'un vol en quelques touchers, avec ou sans mission : le module reprend ce qu'il sait déjà
de votre vol, vous complétez, vous enregistrez — et, si vous le voulez, le vol s'inscrit sur le site de la compagnie
dans le même geste.

## Comment s'en servir

**Trois pas.** Le compte rendu se remplit en trois pas : Vol, Mission, Résultat. Sur un téléphone, un pas à la fois
(« Suivant » en bas) ; sur un ordinateur, les trois côte à côte. Rien n'est obligatoire : ce qui manque est dit au
dernier pas, sans jamais bloquer l'enregistrement.

**Le dernier vol.** Si votre identifiant IVAO (ou VATSIM) est réglé (⚙) et que l'appareil est en ligne, une carte
propose votre dernier vol sur le réseau : « Utiliser » remplit l'avion, l'indicatif, le trajet et les heures tirées
de la trace. Le vol préparé dans Carburant ou Carte est proposé de la même façon (« Vol en cours ») ; s'il a été
démarré dans Carburant (« Démarrer le vol »), il vient en premier, « Vol démarré à hh:mm ». La carte dit en une ligne
tout ce qui sera repris, même ce qu'un type de mission n'a pas de case pour montrer (distance, niveau). « Utiliser »
remplit aussi l'heure de mise en route (l'heure du départ dans Carburant) et le carburant au départ (le carburant
bloc du devis), chacun marqué de sa source. Enregistrer le compte rendu termine le vol démarré : Carburant revient en
préparation, Mes vols retire « en cours », et le vol n'est plus proposé.

**Les autres sources.** Dépliez « Autres sources » pour reprendre votre dernier vol IVAO ou VATSIM, votre plan de vol
SimBrief, ou un texte collé : un plan de vol OACI, la page d'un vol du tracker IVAO ou de StatSim, un METAR. Seuls les
champs vides sont remplis ; à côté de chacun, sa source. Si une source donne autre chose pour des champs déjà saisis,
un bouton propose de les remplacer.

**La mission.** Au deuxième pas : la famille (proposée d'après votre dernier compte rendu), la série, l'identifiant de
la mission si le vol en suit une, puis les blocs propres à la famille. Certains blocs n'apparaissent que pour une
série (par exemple VIP ou convoyage pour les missions spéciales). Tant que vous n'avez pas ouvert ce pas, il est
marqué « à voir » au lieu du ✓ : la famille et la série d'un compte rendu neuf sont reprises par défaut.

**Le résultat.** Au dernier pas : le résultat, vos observations, l'équipage (vous d'abord, comme commandant de bord) et
le carburant au départ et à l'atterrissage. Les incohérences — heures dans le désordre, date future, carburant qui
augmente — sont signalées.

**Enregistrer.** Le bouton en bas enregistre le compte rendu et lui donne son numéro au premier enregistrement. Tant
que vous n'avez pas enregistré, votre saisie est gardée sur l'appareil et reprise à la prochaine ouverture.

**Inscrire sur le site.** « Enregistrer et inscrire sur le site » enregistre et ouvre, dans le même geste, le
formulaire « Ajouter un vol » du site de la compagnie avec votre vol. Connectez-vous sur le site si besoin, lancez le
favori « → Vol » : il remplit le formulaire sans le valider ; relisez, puis validez sur le site. Le bouton est grisé
tant que l'adresse du site n'est pas réglée (module Site).

**Mes derniers CR.** Repliés à la fin du premier pas, une ligne par compte rendu : touchez-en un pour le rouvrir et le
modifier. « Nouveau CR » repart d'un compte rendu vierge.

## Le préremplissage en détail

- **IVAO et VATSIM** : les vols des sept derniers jours de votre identifiant. Un vol coupé par des déconnexions
  compte pour un seul vol. La mise en route et l'arrêt correspondent à la connexion et à la déconnexion quand la trace
  commence et finit au sol ; le décollage et l'atterrissage viennent de la trace.
- **Les heures** sont en UTC, notées « (Z) » sur les champs ; la reprise du vol démarré et celles du réseau les
  remplissent en UTC. Un compte rendu plus ancien, saisi à l'heure de l'appareil, est montré converti avec l'heure
  saisie dessous (« saisi 18:30 locale ») ; il n'est réécrit en UTC que si vous l'enregistrez.
- **SimBrief** : votre dernier plan (identifiant réglé dans ⚙) — appareil, route, niveau, vitesse, carburant prévu,
  METAR et TAF.
- **Depuis Mes vols** : « Écrire le CR » d'un vol ouvre un compte rendu neuf, déjà rempli avec ce vol et sa date ;
  « Ouvrir le CR » rouvre celui qui existe.

## Les numéros de compte rendu

Avec un identifiant de mission, le numéro suit la mission et compte les essais (CRM-016-1, CRM-016-2…). Sans mission,
chaque famille a sa suite (CRM-A01-0, CRM-A02-0… pour HEMS). Les numéros déjà pris, y compris par les comptes rendus
de la suite complète, ne sont jamais réutilisés.

## Le favori « → Vol »

Dépliez « Sur le site de la compagnie » au dernier pas et glissez le lien « → Vol » dans la barre des favoris de
votre navigateur. Il ne sert que sur le site : sur la liste des appareils, il ouvre celui de votre vol ; sur sa page,
« Ajouter un vol » ; sur le formulaire, il remplit les champs et signale les écarts. Sur un téléphone, où les favoris
sont malcommodes, « Copier les champs » met la ligne du vol dans le presse-papiers.

## Cas particuliers

- **Hors ligne** : tout s'écrit et s'enregistre sur l'appareil ; le compte rendu part à la prochaine synchronisation.
  Seules les sources réseau (IVAO, VATSIM, SimBrief) attendent le réseau.
- **Sans lanceur** : IVAO et VATSIM ne sont joignables qu'à travers le lanceur d'un poste ; ailleurs, collez la page du
  vol (tracker IVAO, StatSim) dans « Autres sources ».
- **Sans trigramme** : le compte rendu s'écrit quand même ; réglez votre trigramme (⚙) pour qu'il soit à votre nom.

<!-- chapter: flightlog -->
# Mes vols

Tous vos vols passés au même endroit, une ligne par vol, du plus récent au plus ancien : vos comptes rendus, le
journal du site de la compagnie et vos connexions IVAO ou VATSIM, sans doublon.

## Comment s'en servir

**Les totaux.** En haut, trois cases : le nombre de vols, les heures de bloc et les vols qui n'ont pas encore de
compte rendu, pour la période choisie. Juste dessous, les trois types d'appareils que vous avez le plus volés.

**Les filtres.** Choisissez la période (7 jours, 31 jours, un an, tout), cherchez un indicatif, un type, une
immatriculation, un terrain, une mission ou un numéro de compte rendu, ou cochez « Sans CR » pour ne voir que les vols
qui en attendent un. Vos choix restent sur l'appareil : à la visite suivante, une puce les rappelle (« 1 an · LFRS ✕ »)
et les retire d'un appui. Un « — » à la place du bloc : compte rendu sans heures.

**La liste.** Une ligne par vol : la date, l'indicatif, la route et le temps de bloc. Un point orange marque un vol
sans compte rendu. Sur un ordinateur, la ligne montre aussi l'appareil et le numéro du compte rendu.

**Le détail d'un vol.** Touchez une ligne pour la déplier : d'où vient le vol (compte rendu, journal du site, réseau
IVAO ou VATSIM), son heure, l'appareil, la mission et les remarques.

**Écrire ou ouvrir le compte rendu.** Sur un vol qui n'en a pas, « Écrire le CR » ouvre un compte rendu neuf, déjà
rempli avec ce vol — date, appareil, indicatif, terrains — et une famille de mission proposée. Sur un vol qui en a un,
« Ouvrir le CR » le rouvre pour le modifier.

**Le vol en cours.** Un vol démarré dans Carburant (« Démarrer le vol ») et pas encore rapporté apparaît en tête, « En
cours — démarré à hh:mm » (déroutement signalé), avant même que le journal du site ne le connaisse. « Écrire le CR »
ouvre le compte rendu, qui propose ce vol en premier ; une fois le compte rendu enregistré, la ligne disparaît.

**Plus.** Dépliez « Plus » pour exporter la liste filtrée en CSV (tableur) ou relire vos connexions IVAO et VATSIM.

## D'où viennent les vols

- **Vos comptes rendus** : ceux que vous avez écrits, y compris ceux de la suite complète. Un compte rendu de la suite
  complète s'ouvre dans la suite complète.
- **Le journal du site** : vos lignes du « Log des vols » de la compagnie, reprises par le module Site (collage, ou
  lecture par le lanceur).
- **Le réseau** : vos connexions IVAO et VATSIM des sept derniers jours (identifiants réglés dans ⚙). Elles sont
  montrées, jamais enregistrées comme vols.
- **Sans doublon** : un même vol (même date, même indicatif, même immatriculation) n'apparaît qu'une fois. Le compte
  rendu passe avant le journal, le journal avant le réseau ; un compte rendu sans heures reprend le temps de bloc du
  journal.

## Cas particuliers

- **Hors ligne** : les comptes rendus et le journal déjà reçus s'affichent ; le réseau attend la connexion.
- **Sans lanceur** : IVAO et VATSIM ne se relisent qu'à travers le lanceur d'un poste.
- **Sans trigramme** : réglez-le (⚙) ; c'est lui qui choisit vos comptes rendus et vos lignes du journal.

<!-- chapter: website -->
# Site de la compagnie

Le lien entre l'appli et le site de la compagnie, qui n'a pas d'interface pour les applications : son journal des
vols et sa flotte arrivent par copier-coller (ou par le lanceur d'un poste), et l'adresse du site se règle ici, une
fois pour toute la compagnie.

## Comment s'en servir

**Mon journal des vols.** Sur le site, ouvrez la page « Log des vols » (le lien « Ouvrir la page » y mène), tout
sélectionner, copier, puis collez dans la zone de la carte et « Lire ». Seules vos lignes, celles de votre trigramme,
sont gardées ; elles nourrissent Mes vols.

**La flotte de la compagnie.** Même geste avec la page « Flotte » du site : les appareils, leurs indicatifs, leur base
et leur emplacement. Le compte rendu et la carte s'en servent.

**Rien n'est écrit sans vous.** Après « Lire », un aperçu dit ce qui change : lignes ou appareils nouveaux, modifiés,
inchangés (et, pour le journal, les lignes des autres pilotes, ignorées). « Enregistrer » écrit, « Annuler » laisse
tout comme avant.

**Lire depuis le lanceur.** Sur un poste où l'appli est servie par le lanceur, « Lire depuis le lanceur » va chercher la
page du site pour vous, sans collage, puis montre le même aperçu. Là où le site n'est pas joignable (téléphone sans
lanceur), le bouton s'efface et le collage reste la porte.

**La compagnie.** La carte Compagnie donne le nom, l'adresse du site et le chemin de ses pages (« Enregistrer mon vol »,
journal, flotte, page d'un appareil). Elle se modifie sur un écran d'ordinateur et s'affiche en lecture sur un
téléphone. Ce réglage est commun à toute la compagnie ; c'est lui qui active « Enregistrer et inscrire sur le site »
dans le compte rendu.

## Bon à savoir

- **L'appli n'écrit jamais sur le site** et ne connaît jamais votre mot de passe : vous vous connectez sur le site
  vous-même, et le favori « → Vol » du compte rendu remplit le formulaire sans le valider.
- **Coller le HTML** : copier la page depuis le navigateur garde les liens des appareils ; « Coller depuis le
  presse-papiers » les lit directement quand le navigateur le permet.
- **Le journal se complète** : les lignes que la page du site ne montre plus (pages précédentes) restent gardées.
- **La flotte se fusionne** : un appareil de la page remplace celui déjà connu (ses indicatifs en plus sont gardés) ;
  ceux qui ne sont pas sur la page restent.

## Cas particuliers

- **Sans trigramme** : le journal ne peut pas choisir vos lignes ; réglez-le (⚙).
- **Adresse non réglée** : les liens vers les pages et l'inscription du vol attendent la carte Compagnie.
- **Hors ligne** : le collage marche toujours ; ce qui est enregistré part à la prochaine synchronisation.

<!-- chapter: settings -->
# Réglages

Les réglages de cet appareil (⚙ en haut de l'écran) : votre identité, ce que l'appli vous montre, comment les données
sont échangées, et ce que l'appareil garde hors ligne. Ils restent sur l'appareil, jamais synchronisés.

## Comment s'en servir

**Votre identité.** Dans « Identité », tapez votre trigramme et vos identifiants VID IVAO, CID VATSIM et SimBrief, puis
« Enregistrer ». Les outils s'en servent pour préremplir ; à plusieurs, le trigramme est nécessaire.

**Le niveau.** « Niveau » choisit ce que le menu montre : Découverte, Courant ou Complet, d'un toucher. Sous chaque
choix, la ligne « Menu : » dit quels outils il montre ; un outil caché reste joignable par son adresse.

**Le design.** « Design » montre une vignette par habillage — Standard, Cabinet, Durci — et le ton : Automatique
(comme le système), Jour ou Nuit. Un toucher l'applique aussitôt, sur cet appareil seulement.

**Les usages.** La phrase en tête de « Usages » dit comment les données sont échangées. Sans case cochée, vous êtes
« Seul sur cet appareil » : rien ne part ailleurs. Cochez « Seul, sur plusieurs appareils » ou « À plusieurs (dépôt git
des données) » pour échanger. Sur un poste servi par le lanceur, l'appli lit et écrit déjà le dossier `data/`
du lanceur, même sans case cochée ; un usage d'échange le partage en plus par git.

**L'accès aux données.** Sur un téléphone ou sur le site, réglez dans « Accès aux données » le dépôt (compte/dépôt), la
branche et votre jeton personnel, puis « Tester » et « Enregistrer ». Sur un poste servi par le lanceur, pas de jeton : la
carte montre le dépôt distant de `data/` (voir « Un dépôt git pour data/ »).

**Sans accès ni lanceur, pas de bases.** Un appareil sans accès réglé et sans lanceur — le site ouvert sur un téléphone
pour la première fois, par exemple — n'a ni base aéronautique (espaces, terrains, balises) ni base des appareils :
« Données hors ligne » le dit. Deux portes : réglez l'accès au dépôt des données, même sans cocher d'échange (il sert
alors seulement à lire les bases) ; ou, sur un poste avec lanceur, publiez les bases dans le dépôt (V2 : Paramètres ›
Maintenance › Données aéronautiques et Types d'aéronefs), puis synchronisez.

**La synchronisation.** Avec un échange coché, la carte « Synchronisation » donne la dernière réussie, les écritures en
attente et le réseau ; « Synchroniser maintenant » envoie et reçoit tout de suite. Sinon, elle se fait seule au
démarrage, toutes les 10 minutes en ligne et au retour du réseau. démarrage, toutes les 10 minutes en ligne et au retour
du réseau. Tant que des écritures attendent, la carte les liste, les plus récentes d'abord : chemin, module et heure, ✕
pour une suppression, avec la dernière erreur s'il y en a une.

**La sauvegarde.** Seul sur cet appareil, « Exporter (un fichier) » garde toutes vos données dans un fichier : c'est la
seule copie. « Importer (fusion)… » la reprend sans rien perdre d'ici ; « Remplacer par un fichier… » efface d'abord ce
qui est sur l'appareil.

**Les données hors ligne.** Chaque zone publiée a sa ligne : son état sur cet appareil, son cycle et sa taille.
« Garder hors ligne » la télécharge entière (de préférence en Wi-Fi) ; « Libérer » rend la place.

## La clé météo

Le METAR marche sans clé. Le TAF, sur un appareil sans lanceur (téléphone, site), demande une clé personnelle et
gratuite d'avwx.rest : « Créer une clé sur avwx.rest ↗ » ouvre la page du fournisseur. Collez-la dans « Clé météo (TAF,
avwx.rest) », puis « Enregistrer » ; « Tester » demande le TAF d'un terrain, « Effacer » la retire. La clé reste sur cet
appareil seulement, jamais dans le dépôt ni dans une sauvegarde, et n'est jamais réaffichée. Sur un poste servi par le
lanceur, elle est inutile : le lanceur fournit le TAF.

## Les fiches Little Navmap

Sur un poste servi par le lanceur, la carte « Fiches Little Navmap (.lnmperf) » relie vos fiches de performances aux
fichiers .lnmperf d'un dossier, dans les deux sens. Choisissez le dossier (celui de Little Navmap est proposé quand il
est trouvé), puis « Enregistrer ». Ensuite, rien à faire : une fiche changée dans Carburant réécrit son fichier, un
fichier changé dans Little Navmap met la fiche à jour, un nouveau fichier devient une fiche. Si une même valeur a
changé des deux côtés, la plus récente gagne et l'autre reste gardée dans la fiche ; le bouton de synchronisation le
signale. Un fichier n'est jamais effacé : celui d'une fiche retirée est rangé dans le sous-dossier `_removed`.
« Synchroniser maintenant » fait le passage tout de suite, « Arrêter » coupe le lien. Les fiches à qui il manque une
valeur demandée par Little Navmap sont listées et ne sont pas écrites. Sur un téléphone, Carburant télécharge la fiche
en .lnmperf.

## Les clés du lanceur

Sur un poste servi par le lanceur, « Clés du lanceur » règle la clé de l'API IVAO : elle reste dans le dossier
`secrets/` du lanceur, jamais dans le navigateur ni dans les données. « Tester » vérifie qu'IVAO répond ;
« Effacer » la retire.

## La tablette à côté du simulateur

Vous volez sur le poste (X-Plane) et voulez la carte sur une tablette ou un téléphone : sur le poste servi par le
lanceur, « Accès du poste » ouvre l'appli Pilote aux appareils du même réseau local (ou lancez `lancer.cmd --lan`).

1. **Ouvrir aux appareils du réseau local** : la carte montre l'adresse à ouvrir sur l'appareil, son code QR et un
   code d'appairage à 6 chiffres. Windows peut demander d'autoriser Python : acceptez pour les réseaux privés
   seulement.
2. Sur la tablette, scannez le code QR avec l'appareil photo (ou tapez l'adresse), puis saisissez le code. Il n'est
   demandé qu'**une fois par appareil**.
3. La tablette voit alors les données du poste, la position du simulateur dans la pastille du vol et la mention
   « Lanceur de <poste> » en haut.

- **Réseau de confiance seulement** : tout passe en http, sans chiffrement. À la maison, oui ; sur un wifi public
  ou d'hôtel, jamais.
- L'accès se ferme avec le lanceur, ou par « Fermer l'accès ». Un appareil appairé le reste ; « Oublier les
  appareils » leur redemande à tous un code (tablette perdue, par exemple).
- Sur la tablette, l'appli ne marche pas hors ligne et n'utilise pas son GPS : le navigateur ne les accorde qu'en
  https. La position vient du simulateur du poste.
- Un code sert une seule fois et dure 10 minutes : « Nouveau code » en donne un autre. 5 codes faux d'un même
  appareil : une minute d'attente ; 30 en une heure : l'appairage se ferme jusqu'au prochain « Nouveau code ».
  « Oublier », à côté d'un appareil, retire celui-là seulement.
- Seule l'adresse principale du poste est ouverte ; les autres (VPN, machines virtuelles) seulement par « Les ouvrir
  aussi ».

## Un dépôt git pour data/

Sur un poste servi par le lanceur, « Accès aux données » montre le dépôt distant de `data/` : son adresse et sa
branche. Pour le régler ou en changer, tapez l'adresse (`git@hôte:compte/dépôt.git` ou `https://…`, sans mot de passe
ni jeton dedans) : « Vérifier » dit si le dépôt répond, « Enregistrer » le règle. Vers une autre adresse que celle de la configuration, une fenêtre Oui / Non s'ouvre sur l'ordinateur, pas dans la page : la carte le dit avant le clic ; répondez-lui (elle peut être derrière les autres fenêtres), puis revenez. Refusée, fermée ou déjà ouverte : la carte en donne la raison et `data/` reste tel quel. C'est voulu : une page piégée ne doit pas pouvoir envoyer vos données ailleurs. Rien ne bloque : un dépôt qui ne répond pas est
seulement signalé.

- **L'accès au dépôt** se règle sur l'ordinateur : clé SSH pour une adresse `git@…`, identifiants enregistrés dans Git
  pour une adresse `https://…`.
- **À plusieurs par git**, ce dépôt distant est nécessaire : sans lui, la case « À plusieurs » ne mène nulle part, et
  la carte « Usages » le rappelle.
- **data/ absent ou sans git** : la carte ouvre une porte. `data/` est un dossier ignoré par le dépôt du code ; il
  devient son propre dépôt git, relié au dépôt des données (pas un sous-module). Tapez l'adresse du dépôt des données,
  et au besoin un identifiant et un mot de passe ou jeton (jamais gardés par la page ; « Se souvenir » les confie à Git
  sur cet ordinateur). Sans `data/`, « Récupérer les données » le clone ; avec un `data/` sans git (données d'exemple
  ou archive), « Reprendre data/ dans ce dépôt » le relie au dépôt. La carte suit le travail et relit l'état à la fin ;
  un échec est expliqué, rien n'est perdu.

## Configurer un pilote

**Préparer la configuration (administrateur).** Sur un poste servi par le lanceur, ou sur un appareil réglé sur GitHub,
dépliez « Exporter une configuration pour un pilote… » dans la carte « Accès aux données » : il rappelle vos gestes dans
l'ordre. Invitez d'abord le nom GitHub du pilote sur le dépôt, avec le droit Write (le lien mène à la page des
collaborateurs du dépôt). Tapez ensuite son trigramme et l'adresse de l'appli publiée, puis « Créer le fichier et le
lien » : le fichier sog-config-<TRI>.json est enregistré, le lien et son code QR s'affichent. Ils contiennent la
compagnie, le dépôt des données, le trigramme et le mode d'emploi du jeton, jamais de jeton ni de secret ; le
propriétaire du dépôt (utilisateur ou organisation) y est noté, il décide du jeton à créer. Envoyez le lien ou le
fichier, ou faites scanner le code QR par le téléphone du pilote.

**Rejoindre la compagnie (pilote).** Le lien, le code QR, « Importer une configuration… » ou « Rejoindre la compagnie… »
(carte « Accès aux données ») et la carte d'accueil de la première ouverture ouvrent l'assistant « Rejoindre la
compagnie », un écran par pas : la configuration reçue ; le compte (le créer s'il n'existe pas, avec le lien
d'inscription) et le nom d'utilisateur ; l'invitation à accepter ; le jeton, pas à pas (classique pour le dépôt d'un
utilisateur, à grain fin pour celui d'une organisation) ; le jeton collé et testé ; les identifiants réseau ; enfin «
Terminer et synchroniser », puis les données hors ligne. Les cases cochées restent sur l'appareil : une carte des
réglages propose de reprendre là où vous en étiez. Le tutoriel « Rejoindre la compagnie » suit les mêmes pas.

**Rien de plus que le fichier.** Seul ce que contient la configuration est réglé, et l'accès n'est enregistré qu'une
fois le jeton testé ; « Tester » dit ce qui ne va pas : invitation pas encore acceptée, jeton mal copié ou expiré, jeton
sans droit sur le contenu. Un jeton classique ouvre tous les dépôts du compte : pour le dépôt d'un utilisateur, un
compte GitHub dédié au vol est conseillé. Un fichier d'un autre format est refusé avec un message. La compagnie n'est
écrite dans le dépôt que s'il n'en a pas encore. Sur un poste dont data/ suit déjà ce dépôt, l'assistant saute le compte
et le jeton. Sans lanceur, l'appli ne joint qu'un dépôt GitHub : pour un dépôt framagit ou GitLab, faites l'accès sur un
poste avec le lanceur.

## Administration

**Les pages d'administration.** Au niveau « Complet » (carte « Niveau »), la carte « Administration », sous « À propos
», réunit les pages d'administration et d'essai, chacune avec une phrase ; aux autres niveaux, elle n'apparaît pas. Dans
l'appli : le réglage des seuils de la carte (`#maps?tune=1`, en lecture seule sur un téléphone), la feuille de route
(`#roadmap`) et le diagnostic de la carte « À propos ».

**Les bancs, sur un poste.** Servis par le lanceur, ils ne s'ouvrent que sur un poste avec lanceur (ailleurs, ils sont
nommés sans lien) ; chemins relatifs à la racine de la suite : `labs/design_primitives.html` (primitives et designs),
`frame/aerodb/bench.html` et `frame/aerodb/offline_bench.html` (base aéronautique, en ligne et hors ligne),
`frame/store/test/` (couche de données, contre le faux GitHub) et `modules/maps/test/render.html` (rendu de la carte).

**Les pages V2 du poste.** Montrées seulement quand un lanceur sert la page : Paramètres › Maintenance
(`apps/settings/maintenance.html`), Premier lancement (`apps/settings/premier_lancement.html`) et le studio
cartographique (`apps/cpco/map_parser.html`).

## Bon à savoir

- **Le jeton** : un jeton à grain fin de github.com, sur le seul dépôt des données, « Contents » en lecture et
  écriture, 90 jours au plus. Il n'est jamais réaffiché ; ne le collez dans aucun message.
- **Couper l'accès** : efface le jeton de cet appareil ; vos écritures en attente restent et partiront quand l'accès
  sera de nouveau réglé. Téléphone perdu ou volé : supprimez aussi le jeton sur github.com.
- **Réglages de la V2** : si ce navigateur a déjà servi à la V2, la carte « Réglages de la V2 trouvés » propose une fois
  de reprendre votre identité et votre accès.
- **À propos** : liens vers cette aide et la feuille de route (ce qui est livré, en cours, prévu), puis le
  diagnostic, replié : transport, dernière synchro, erreurs, arbre du dépôt, bases de référence et base aéronautique,
  ligne par ligne ; « Copier » met le tout dans le presse-papiers, à coller dans votre message pour signaler un
  problème. Le
  jeton n'y figure jamais.
