# Carte

Voir son vol sur une carte aéronautique et son profil vertical, ou les cartes d'une mission : espaces aériens,
terrains, balises, voies aériennes, altitudes minimales. La route du vol se modifie aussi sur la carte.

## Comment s'en servir

**Le vol prévu.** La carte montre le vol préparé dans Carburant : départ, points de la route, arrivée, et le terrain
de dégagement en tirets gris. La piste, la SID, la STAR et l'approche choisies dans Carburant sont tracées en violet par-dessus la route, nommées (« SID ROYAN6P »). Son résumé (niveau, distance, vol prévu ou en cours) n'est pas écrit au-dessus du dessin (le dessin le montre) : l'infobulle de la poignée du bloc de données sous la carte le donne, avec départ et arrivée, dégagement et type d'appareil. Quand le vol change dans Carburant, la carte suit d'elle-même.

**La carte et ce qu'elle montre.** Autour de la route : les espaces aériens qu'elle traverse ou frôle (zones
réglementées, dangereuses, interdites, espaces contrôlés), les voies aériennes basses ou hautes selon votre niveau,
les terrains et les balises, et dans chaque carré d'un degré l'altitude minimale de sécurité (le chiffre brun, en
milliers et centaines de pieds : « 3⁵ » veut dire 3 500 ft). Les petits chiffres violets le long de la route sont les
distances depuis le départ, en milles nautiques. Faites glisser la carte avec un doigt, écartez deux doigts pour
zoomer ; « Recentrer » (la cible, en haut à droite de la carte) revient sur toute la route. La carte reste où vous l'avez mise, même quand la route change :
seul « Recentrer » (ou un autre vol) la recadre. Vue de loin, la carte ne montre que ce qui est près de la route ;
rapprochez-vous pour tout voir.

<a id="maps-procs"></a>**La piste et les procédures choisies.** Ce que vous avez choisi dans Carburant (piste, SID, STAR, approche) se trace en violet, depuis le seuil de la piste de départ jusqu'au premier point de la route, et du dernier point de la route jusqu'au seuil de la piste d'arrivée. Les transitions et l'approche interrompue sont en tirets ; un tronçon sans point (une montée sur un cap, par exemple) est un court trait le long de son cap, puis des tirets jusqu'au point suivant ; un virage à rayon constant est un arc. Quand la SID ne rejoint pas un point de la route, un tireté droit la raccorde à la route (de même pour la STAR). Une procédure que vous n'avez pas choisie n'est jamais dessinée, et la liste des couches n'a pas de case pour elle. Le nom de la procédure s'écrit sur son tracé, suivi de l'origine de ses données quand elles viennent de X-Plane ou de Little Navmap (« X-Plane, local ») ou quand elles sont périmées (« périmé »). De près, chaque point porte ses contraintes, comme sur les cartes de procédures : l'altitude **soulignée** veut dire « au moins », **surlignée** « au plus », les deux « exactement », « 5000–7000 » « entre les deux » ; « ≤ 220 kt » est la vitesse à ne pas dépasser. Le profil vertical suit le même chemin et montre ces contraintes comme des paliers (flèche vers le haut : au moins, vers le bas : au plus, point : exactement, barre : entre deux altitudes) ; les distances, les heures estimées et le curseur sont mesurés sur ce chemin. La carte ne modifie jamais ce choix : touchez un terrain de la route, sa fiche donne la piste et les procédures choisies, avec un bouton « Changer » qui ouvre Carburant sur la ligne à modifier.

<a id="maps-weather"></a>**Le profil et le curseur.** Dans le bloc de données sous la carte, le profil vertical coupe la route de bout en bout : le relief, les espaces
aériens où vous entrez à l'altitude prévue, et la trajectoire du vol en violet. Faites glisser le doigt sur le profil :
un curseur bleu le suit, et le même curseur se place sur la carte. Touchez la route sur la carte pour le placer là. La
ligne sous le profil dit ce qu'il y a sous le curseur : distance depuis le départ, altitude prévue, hauteur du relief,
et l'espace aérien où vous êtes à ce moment-là. Sous la carte, ce bloc de données montre le profil ; la liste des
espaces d'un point ou les points de report d'un terrain s'y ouvrent à sa place quand vous les demandez, et le profil
revient à leur fermeture. La pastille en forme de nuage, (les trois pastilles — profil, nuage, « i » — sont toujours dans la ligne du haut, à droite ; celle qui n'a rien à montrer est seulement grisée) le remplace (la pastille du profil le ramène) par la coupe météo le long de la route
(vent, température, nuages, givrage) à l'altitude du vol ; la coupe suit le même curseur, et un toucher dessus le déplace. Elle ne montre que
la prévision qu'Atmosphère a déjà chargée : sans elle, la ligne « Pas de prévision chargée » mène à Météo, dans Préparer. La dernière pastille, « i » (grisée tant que le dessin n'a pas de légende), ouvre par-dessus le profil sa légende (ce que sont chaque trait, bande et repère) ; glisser le doigt sur la coupe déplace le curseur comme sur le profil. Le profil et la coupe sont dessinés à la hauteur exacte du bloc, leur axe des distances toujours visible : sur un bloc bas ils suppriment des étiquettes de niveaux, jamais l'axe.

<a id="maps-profile-zoom"></a>**Zoomer le profil.** Pour lire le profil avec précision, resserrez-le sur une partie du vol : pincez-le à deux doigts (le milieu des doigts reste en place) et glissez à deux doigts pour déplacer la fenêtre ; un seul doigt reste le curseur de lecture. L'échelle des altitudes se recale sur ce que la fenêtre montre (c'est là que vient la précision), les repères de distance (NM) se resserrent avec elle, et les points hors fenêtre ne sont pas posés. Un double toucher revient au vol entier, tout comme le bouton « Vol entier », qui apparaît dans la ligne du haut tant que le profil est zoomé. Sur un écran : Ctrl + molette zoome autour du pointeur, un glisser déplace la fenêtre, un double clic revient au vol entier. Le zoom se garde tant que la page reste ouverte et que la route ne change pas ; il n'est jamais enregistré. La coupe météo se zoome de la même façon (mêmes gestes, même bouton « Vol entier ») et la fenêtre est la même pour les deux : zoomez sur l'un, passez à l'autre avec la puce, vous retrouvez la même portion du vol ; la coupe recale aussi son échelle de hauteur sur ce qu'elle montre.

**Un écran fixe.** Rien entre l'en-tête et la carte : la carte et le bloc de données remplissent l'écran, et rien ne défile que le contenu du bloc. Les boutons sont posés sur la carte : à droite, de haut en bas, « Modifier la route » (le crayon), « Recentrer », le mode de carte, « Modifier sur la carte » (les quatre flèches) et, en dernier, le plein écran (Échap en sort) ; à gauche, « Couches ». Le bloc est une feuille : tirez sa ligne du haut (la petite barre ; à sa hauteur normale la ligne ne porte pas de titre au-dessus d'un profil ou d'une coupe, seulement les trois pastilles) vers le haut pour
l'agrandir, vers le bas pour la réduire à cette ligne, ce qui laisse toute la hauteur à la carte ; un toucher sur la
ligne la réduit ou la ramène à sa hauteur normale.

**Six modes de carte.** Le bouton du mode, à droite de la carte, montre le mode choisi ; touchez-le pour voir les six
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

<a id="maps-layers"></a>**Les couches.** Le bouton aux calques, à gauche de la carte, ouvre dans le bloc de données, à la place du profil, la liste de ce qu'elle dessine (la croix ✕ ramène le profil). En premier, sous le choix du vol, le curseur « Complexité » : il agit comme si le zoom était différent, d'un niveau de zoom par cran (de −4 à +4) — moins de détails vers la gauche, plus vers la droite. Ce que chaque zoom montre est réglé par l'administrateur (Réglages, carte « Administration »). Puis les familles
d'espaces (TMA / CTR, D / R / P, FIR, autres), voies basses et hautes, balises, points des voies, points de report VFR,
obstacles, altitudes minimales, villes, canevas, dégagement, noms des espaces, noms des voies. Cochez ou décochez : la
carte suit, et votre choix est gardé pour ce réglage sur cet appareil. « Tout remettre » revient au choix d'origine. «
Autour de la route seulement », cochée d'origine en IFR, limite les espaces et les voies au voisinage de la route ;
décochée, toute la carte visible est dessinée, pour regarder ailleurs. Vue de près, tout est dessiné de toute façon.
Chaque élément de la carte a sa plage de zoom : les points de report VFR n'apparaissent que tout près, les CTR de
près, les TMA en vue moyenne, les FIR de loin. La taille de la carte compte aussi : sur un petit cadre (téléphone, volet
de la vue double) elle montre moins d'éléments qu'un grand au même zoom, comme si vous étiez plus loin (le zoom est
corrigé par la moyenne de la hauteur et de la largeur du cadre, 900 px sans correction).

<a id="maps-airspaces"></a>**Toucher ou survoler pour en savoir plus.** Touchez, cliquez ou survolez le nom d'une voie, le libellé d'un espace ou
une barbule de vent : une petite bulle donne l'essentiel en deux lignes — pour une voie, le tronçon (point → point), sa
distance, ses routes, son plancher et son plafond ; pour un espace, son nom et ses limites en notation SIA (« TMA 8
AQUITAINE 2000|FL145 D »). Touché ailleurs dans un espace, le bloc de données sous la carte montre les espaces sous le
doigt, un ou plusieurs, à la place du profil : un graphique de niveaux, comme le profil vertical (une colonne numérotée
par espace, de son plancher à son plafond), puis la liste numérotée avec leurs limites, lue comme l'axe vertical : le plus haut en haut (le numéro 1 est l'espace au plafond le plus haut, à gauche du graphique), le plus bas en bas. Les FIR, UIR, SIV et secteurs de contrôle sans limites, comme tout espace de la surface au plafond, ne sont ni dessinés ni comptés (on ne les traverse pas) : leurs noms se lisent sur une ligne repliée « Aussi ici (n) » sous la liste et sur une dernière ligne grisée de la bulle de survol (« Aussi ici : FIR PARIS · SIV POITIERS »), la FIR ou le SIV à appeler sans colonne. La croix ✕, Échap ou un toucher
sur un endroit vide de la carte le ferment et le profil revient, un autre toucher sur des espaces le remplace ; déplacer
la carte le laisse. La carte ne bouge pas ni ne change de taille. La bulle de survol suit le pointeur, reste 5 secondes,
laisse la place à la suivante, et se ferme par un toucher ailleurs ou un déplacement de la carte. Sur une balise, la
bulle donne son type, son indicatif et sa fréquence ; quand plusieurs balises sont au même endroit, la carte garde la
plus utile (VOR, TACAN ou DME, puis NDB, puis ILS) et la bulle nomme les autres (« aussi ici : ILS 25L BG 109.9 »). Sur
le profil, le doigt ou la souris donnent de même les espaces traversés.

<a id="maps-vfr"></a>**Les points de report VFR d'un terrain.** Passez la souris sur un terrain : ses points de report et les séquences
tirées de ses cartes VAC s'allument (cercles nommés, tirets entre les points). Sur la carte, un point de report ne porte
que son code court (« NA », « E », « SE »…), pour que la carte reste lisible ; le nom long est dans la bulle et dans la
liste. Touchez le terrain : la carte se rapproche de ses points s'ils sont serrés, et le bloc de données sous la carte,
à la place du profil, donne la liste des points (code, nom long, restrictions), les séquences (avec la page de la VAC)
puis les consignes de la VAC, repliées page par page ; il défile si le contenu est long. Il reste ouvert pendant que
vous déplacez la carte : la croix ✕ ou Échap le ferment et le profil revient, un autre terrain le remplace. Toucher un
point de report ouvre de même le contenu de son terrain, ce point en tête. En mode VFR, les points du terrain de départ
et de celui d'arrivée sont montrés d'office. Ces données sont extraites automatiquement des VAC : elles sont marquées «
à vérifier », ne sont pas l'itinéraire publié ; la carte VAC fait foi. Quand le terrain a été analysé à la main, le bloc
le dit, les routes portent leur nom, leurs pistes et leurs conditions, un tracé relu suit la carte VAC (tirets longs) et
une flèche marque un sens unique. Les points de report de la base sont toujours là, en noir pour les avions et en vert
pour les hélicoptères ; les séquences et les consignes des VAC s'y ajoutent une fois importées par l'administrateur
(Paramètres › Maintenance). Un point de report est une seule ligne dans la liste et une seule étiquette sur la carte, même si la base et la
carte VAC le nomment toutes deux : la ligne garde la description de la base et sa position publiée, et dit « position VAC à 1,2 NM » quand la
carte VAC le place à plus d'un demi-mille de là.

<a id="maps-started"></a>**En vol.** Une fois le vol démarré dans Carburant, la carte montre où vous devriez être (avion creux, « prévu
14:32Z ») et où vous êtes (avion plein, orienté à votre route, avec la trace des 30 dernières minutes en pointillé). Dans les notes du bloc de données, sous le profil, une ligne dit l'écart : en avance ou en retard (minutes et NM), à combien de NM de la route, et
votre altitude contre celle prévue ; le profil montre les deux altitudes. De près, chaque point porte son heure
estimée (ETA) sous son nom, sans jamais couvrir un terrain, en UTC (« 14:52Z »), l'heure locale entre parenthèses au départ et à l'arrivée. « Suivre » garde la carte sur votre position ; un déplacement de la carte l'arrête. Sans position (GPS
ou réseau non activés), une notification le dit une fois, la ligne reste dans les notes avec un bouton « Activer la position » ; une position de plus de 2 minutes est grisée.
La ligne finit par la source de la position : GPS, réseau, IVAO, VATSIM, X-Plane ou Little Navmap. Les heures estimées sont aussi montrées pour un vol daté dans Carburant, avant son départ. Vol arrivé : la note « Arrivé » remplace la ligne et « Suivre » disparaît ; un déroutement est dit dans les notes.

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

**Les cartes de mission.** La liste en bas des couches (le bouton aux calques) choisit ce que montre la carte : le vol prévu, ou une mission
de la compagnie. Pour une mission, une seconde liste choisit parmi ses cartes (vue d'ensemble, cible, détail…).
Chaque carte est redessinée comme dans le studio : même cadre, même réglage d'affichage, avec les points de la
mission, ses zones hachurées et son cheminement. Le profil vertical montre alors celui de la mission.

<a id="maps-edit"></a>**Modifier la route sur la carte.** Touchez « Modifier sur la carte » (les quatre flèches, à droite de la carte ; une aide s'affiche à la première entrée dans le mode) : les points tournants
s'entourent d'un cercle. Faites glisser un point jusqu'à un fixe, une balise ou un terrain : il s'y pose (lâché
ailleurs, il devient un point libre, nommé par ses coordonnées, comme 4530N00030E). Pour ajouter un point, touchez « + » (dans la même colonne), puis touchez
l'endroit voulu (ou restez appuyé une demi-seconde) : sur un fixe, une balise ou un terrain il s'y pose, ailleurs c'est
un point libre ; il s'ajoute au tronçon le plus proche. Un simple toucher n'ajoute rien : il montre l'infobulle. Touchez un point de la route : sa carte donne son niveau et propose « Retirer ». Le départ et l'arrivée ne
bougent pas ici. Sur le profil, glissez un palier vers le haut ou le bas : le niveau change à partir du point qui
ouvre ce tronçon, par pas de FL10 (sur le premier tronçon, c'est le niveau du vol) ; dans la carte d'un point, « − »
et « + » font de même. « Annuler » reprend le dernier geste. Chaque changement est enregistré aussitôt dans le vol, et
Carburant refait le devis ; le profil suit. Retoucher le bouton (ou Échap) ferme le mode, et la carte se déplace de nouveau au doigt.
Pour taper la route en texte, le crayon en haut de la colonne de droite (« Modifier la route ») ouvre l'étape Route de Carburant. Pendant le mode, la colonne de droite ne garde que « Modifier sur la carte », « + », « Annuler », « Recentrer » et le plein écran.

## Sans réseau

**Ce qui marche sans réseau.** La carte, les espaces aériens, les terrains, les balises et le profil restent
disponibles hors ligne pour les zones déjà consultées, et pour celles gardées dans Réglages › Données hors ligne.
Gardez-y la zone de votre vol avant de partir : tout y sera, même sans réseau.

**Le fond de carte.** Le fond (routes, villes, relief en couleur) vient d'Internet. Sans réseau, la carte se dessine
sur un fond uni avec le contour des pays, et une ligne le signale ; tout le reste est là.

**Le relief du profil.** Le relief du profil vient aussi d'Internet. Sans réseau, le profil montre à la place
l'altitude minimale de sécurité de chaque carré traversé (en tirets bruns), et une ligne le signale.

## Cas particuliers

**Pas de vol.** Sans vol préparé, la carte est vide et propose « Ouvrir Carburant ». Les cartes de mission restent accessibles par la liste des couches.

**Vol qui passe la ligne de changement de date.** Un vol qui franchit le méridien 180° (de la Sibérie à l'Alaska, par exemple) se dessine d'un seul tenant : la carte se prolonge de l'autre côté de la ligne, les marques de distance, le profil et la coupe météo suivent la route, qui reste enregistrée avec des longitudes entre −180° et 180°.

**Base aéronautique absente.** Si la base aéronautique n'a pas encore été publiée par un poste de la compagnie, la
carte ne montre que la route, et le dit une fois (notification, puis note du bloc de données).

**Zone non gardée.** Hors ligne, au-dessus d'une zone jamais consultée ni gardée, la carte n'a rien à montrer ; le
bouton « Données hors ligne » ouvre les réglages pour la garder la prochaine fois.

**Cycle différent.** Chaque carte de mission retient le cycle des données avec lequel elle a été faite. Si la base
actuelle est d'un autre cycle, une ligne le dit : les espaces aériens ont pu changer depuis.

**Mission ancienne.** Une mission enregistrée avant cette version ne porte pas son réglage d'affichage. La carte prend
alors le réglage habituel du type de carte (détaillé pour une cible ou un détail, simplifié sinon) et le signale.
Ouvrir la mission dans le studio et l'enregistrer suffit pour qu'elle garde ensuite le sien.
