# Carburant et niveau

Préparer le carburant d'un vol et choisir son niveau : un appareil, une route, un niveau, et le devis tombe — roulage,
délestage, réserve, carburant bloc, temps de vol et début de descente.

## Comment s'en servir

<a id="fuel-quote"></a>La préparation suit cinq pas, dans l'ordre où on prépare un vol : **1 Vol, 2 Route, 3 Météo, 4 Résultat, 5 Départ**. Sur
un téléphone, la barre du haut montre un pas à la fois (touchez un numéro pour y aller, « Suivant » en bas de chaque
pas) ; sur un écran large, les cinq pas sont les uns sous les autres. Tout se recalcule à chaque changement : corrigez
la route, la météo, le devis et le vent suivent, sans bouton à presser. Le résultat (carburant bloc, délestage, temps,
début de descente) reste visible en bas de l'écran à chaque pas, avec d'où vient le vent (« vent : METAR LFRS »,
« vent : prévision ICON FL060 », « vent saisi »). Sur un téléphone, cette barre tient en trois lignes : le contexte
(« Bloc · FL060→090→110→070 · vent ARPEGE FL060 », en entier si on le touche), le carburant bloc, puis trois tuiles
« Étape », « Temps » et « TOD » (début de descente). L'écran s'ouvre toujours sur l'onglet « Devis » ; les fiches
s'ouvrent par l'onglet « Fiches ». Un ✓ marque un pas rempli. Les niveaux s'écrivent partout de la même
façon : en FL à partir de 5 000 ft (FL060), en pieds en dessous (3 500 ft).

<a id="fuel-step-1"></a>**1 Vol.** Le départ, l'arrivée et le dégagement (codes OACI), la date du vol si vous voulez la prévision (TAF) plutôt
que l'observation, l'appareil et le niveau de croisière (en FL). Sous chaque code, une ligne fixe donne le nom du terrain pour vérification (« LFPO — Paris-Orly » ; « inconnu » si le code ne correspond à rien). Dès deux caractères, un code ou un début de nom (« LFP », « orly »), le champ propose sept terrains au plus : ↑ ↓ pour choisir, Entrée pour valider, Échap pour fermer, ou un toucher ; la liste se ferme quand on quitte le champ, et taper le code en entier à la main marche toujours. Le nom peut se taper en entier (« toulouse ») : seul un code choisi ou tapé entre dans la route, et un champ quitté sans choix revient au terrain enregistré. La date du vol (saisie à l'heure locale de l'appareil) est une seule valeur, gardée dans le vol courant : la météo du devis (TAF des terrains, vents et températures en altitude) est lue à cette date, l'ETA de la Carte en part tant que le vol n'est pas démarré, et le curseur de Météo part d'elle ; vide, c'est maintenant. L'appareil tient sur une ligne : l'appareil retenu, son immatriculation, son indicatif et d'où il vient. Un nouveau vol reprend le dernier
appareil choisi sur cet appareil ; sans choix, le devis attend. La loupe ouvre la recherche (le dernier choisi en tête) : tapez une fiche, une immatriculation, un indicatif ou un type. Les résultats viennent dans
cet ordre : vos fiches de performances, les appareils de la compagnie (sa flotte, puis ceux connus par son journal),
les types publiés, et en dernier le code tapé tel quel. Un appareil de la compagnie prend sa propre fiche s'il en a une,
sinon celle de son type, sinon une estimation du type — le devis le dit alors « approché ». L'immatriculation et
l'indicatif choisis suivent le vol jusqu'au compte rendu. La ligne « Croisière » dit d'où vient la consommation.

À côté de la date, l'horloge « +30 » pose le vol dans 30 min (arrondi aux 5 min ; chaque appui ajoute 30 min) et « Maint. » revient à l'heure courante : la météo des terrains (le TAF s'il couvre cette heure) et les vents en altitude sont relus aussitôt.

<a id="fuel-step-2"></a>**2 Route.** Tapez la route dans le champ « Route » (Entrée la valide),
toujours visible : les points, les voies aériennes et les niveaux, comme dans un plan de vol (« LFBO TOU UN460
NTS/F280 LFRN »). Vous pouvez aussi y coller un plan de vol OACI ou la liste d'un OFP. Quand vous quittez le champ, la
route est remise au propre : en majuscules sur une ligne, sans DCT ni groupes vitesse-niveau, le départ et l'arrivée
aux bouts, un changement de niveau écrit « /F280 » après le point où il commence. Les voies aériennes restent écrites
(le devis suit les points). Les points inconnus restent à leur place et sont signalés juste dessous ; des coordonnées
s'écrivent à la façon OACI (« 4530N00030E »). La ligne suivante donne la distance et la route vraie, et d'où elles
viennent (la route, l'OFP SimBrief). Si la route ne se résout pas, « Saisir à la main » ouvre les deux champs. Avec
votre identifiant SimBrief réglé (⚙), « Dernier OFP SimBrief » reprend d'un coup la route, le niveau, le vent moyen et
l'appareil de votre dernier plan.

Le bouton « Auto » à côté du champ « Route » inscrit les voies aériennes entre les points : pour chaque paire de points
nommés qui se suivent sans voie entre eux, il cherche le plus court chemin sur les voies de la base publiée, ouvertes au
niveau prévu (plancher et plafond de chaque tronçon, à 100 ft près ; sans niveau prévu, 6 500 ft, et une notification le
dit), avec une entrée et une sortie directes à 60 NM au plus et sans détour de plus de 40 %. Le texte devient « LFRS
TSA01 UT460 TSA05 LFML » ; les points intermédiaires de la voie, que le texte n'écrit pas, sont gardés dans les points
(la distance, la carte et le profil les suivent). Une notification donne le résultat (« 3 voies inscrites, 254 NM »)
ou « aucune voie utile entre X et Y ». Limites : les voies sont prises dans les deux sens (la base ne porte pas encore le
sens unique), sans restriction fine de niveau ni SID / STAR ; la route reste à vérifier.

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

**Piste, SID, STAR et approche.** En bas du pas Route, une carte « Procédures » porte un côté Départ et un côté Arrivée. Chacun a un titre (« Départ LFPO Paris-Orly », avec « Sur la carte » : la Carte s'ouvre sur les procédures du terrain, une famille à la fois ; un toucher sur un tracé ou une ligne choisit, et l'on revient ici avec le choix fait et dit), une seule ligne discrète (« lu le 29/10 16:53Z · Relire · 3 non lues », puis « Source » : la page codée de la procédure choisie, chez le SIA, dans un nouvel onglet) et une grille fixe, la même des deux côtés : piste · SID · transition au départ ; piste · STAR · transition à l'arrivée, puis, dessous, approche · transition d'approche (une transition n'apparaît que si la procédure choisie en a). Sur un téléphone, une seule colonne ; aucun libellé n'est coupé. Chaque liste vient d'aerodb et montre toutes les procédures du terrain dans une seule liste classée par piste puis par nom (la piste n'est dans le libellé que si aucune piste n'est choisie et que la procédure n'en dessert qu'une : « OPALE 2E » quand la piste est choisie). Rien n'est interdit : une procédure en conflit avec votre choix est marquée ⚠ (une SID, une STAR ou une approche qui ne dessert pas la piste choisie ; sans piste choisie, une STAR qui ne dessert aucune piste de l'approche choisie ; la raison est dans l'infobulle — une STAR qui ne rejoint pas l'approche n'est pas un conflit : la Carte raccorde en tireté) et vous pouvez quand même la choisir — le ⚠ et l'infobulle suffisent, aucune notification ne le répète. ⌛ (gris) veut dire périmée, ⚠ (orange) en conflit. Dans chaque liste, ce qui est compatible avec votre choix vient en tête, les ⚠ ensuite ; dans la liste des pistes, celles de la SID ou de l'approche déjà choisie passent d'abord. Une procédure que la source n'a pas su lire correctement (sans nom, ou douteuse) n'est jamais proposée : la ligne discrète du côté dit combien ne sont pas lues (« 3 non lues » : les pages non lues et les procédures à vérifier du fichier lu). Si les données du terrain ne portent aucune fiche de piste, les pistes proposées sont celles que nomment ses procédures. Choisir une STAR ou une approche qui ne dessert qu'une piste pose cette piste ; une STAR propose ses transitions, une approche ses transitions d'approche. Le premier choix, « — », veut dire « pas choisi » ; « aucune » est un vrai choix (un départ direct, sans SID). Une procédure du repli X-Plane du poste passe en dernier, marquée « X-Plane, local » ; une procédure lue sous un cycle antérieur est marquée ⌛ (à relire). Sur un terrain sans procédure publiée, la ligne discrète le dit (« aucune procédure publiée · Lire les procédures de LFXX ») : un terrain par geste, jamais en silence. Un terrain qui a déjà des procédures montre, sur cette même ligne, la date de sa dernière lecture (« lu le 29/10 16:53Z », ⌛ si elle date d'un cycle passé) puis « Relire » : le même geste, qui remplace le fichier lu. Un terrain français se lit dans l'eAIP du SIA, sans compte ; un État dont l'AIP publie des tables de procédures, dans EAD Basic (identifiants réglés sur le poste) ; pour tout autre État, le message dit qu'aucune table n'est publiée. Sans lanceur, ou sur un appareil appairé au poste, la lecture se fait sur le poste — le message le dit — et l'OFP SimBrief reste la source du vol. Une fois la SID et la STAR choisies, le devis court sur le chemin « route + procédures » (la distance de la SID et de la STAR comprise) et la Carte les trace avec leurs altitudes et leurs vitesses ; leurs contraintes d'altitude n'entrent pas dans les paliers du devis, elles se lisent sur le profil vertical, qui garde la croisière jusqu'à ce que la descente doive commencer et ne remonte plus une fois commencée. « Dernier OFP SimBrief » propose sa SID et sa STAR pour les seuls côtés que vous n'avez pas encore choisis (« aucune » est un choix) : il ne remplace jamais votre choix, et dit ce qu'il a rempli, une ligne par côté (« Arrivée : STAR — → LERG1R »). Des choix faits à la suite sont écrits une seule fois, un instant après le dernier.

<a id="fuel-step-3"></a>**3 Météo.** Le vent (direction et force) et l'écart ISA. Sans direction, ou sans vent du tout, le carburant bloc est
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

<a id="fuel-step-4"></a>**4 Résultat.** Le dessin montre, pour chaque niveau, le carburant du trajet (trait plein) et sa durée
(tirets). Le rond vert marque le niveau le plus économe, le carré orange le plus rapide ; la zone grisée, les niveaux
qu'on ne peut pas tenir sur ce trajet. Chaque niveau est chiffré comme le devis, avec le vent prévu à ce niveau quand
la météo réelle est retenue : au niveau choisi, la courbe et le devis disent le même chiffre. Sur une route à paliers, tous les points de la courbe sont un vol à plat à leur niveau, sans paliers : le losange noir marque le devis réel du plan (avec les paliers de la route et le vent du plan), détaillé sous le dessin (« Plan : FL160, 856 kg, 0:54 »), et l'écart avec la courbe est le coût des paliers. L'axe du carburant suit l'unité choisie (kg ou lb). Touchez la courbe pour choisir un niveau, ou utilisez les deux boutons. « Montée » choisit la façon de monter : économique,
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

<a id="fuel-step-5"></a>**5 Départ.** Un récapitulatif d'une page : l'appareil, la route telle qu'elle sera déposée, le niveau (et ses
paliers), le vent et sa source, le carburant bloc. « Démarrer le vol » lance le plan de vol (mise en route,
repoussage, roulage…). La préparation peut dater de plusieurs jours : il commence donc par tout refaire à l'heure
réelle — la date du vol revient à maintenant, la météo des terrains et les vents en altitude sont relus, le devis
refait — et dit en une ligne ce qui a changé (« vent 273°/35 kt → 284°/44 kt · bloc 684 → 644 kg · arrivée prévue
15:03Z (17:03) ») ; hors ligne, il le dit et démarre avec le dernier devis. Il note ensuite l'heure de départ, qui devient la
mise en route du compte rendu. Sur un téléphone il ouvre la Carte, sur un grand écran il reste ici avec la Carte à
droite.
Changer le terrain de départ ensuite, c'est préparer un autre vol : l'heure de départ est effacée. Changer l'arrivée
après le départ est un déroutement : l'heure est gardée et le déroutement noté.

Plan de vol pour le simulateur : sous le récapitulatif, trois boutons — « .fms (XP 11/12) », « .fms (XP 10) » et « .pln (MSFS) » — téléchargent la route et les procédures choisies (piste, SID, STAR, approche et leurs transitions) pour X-Plane ou Microsoft Flight Simulator, dans un fichier nommé « LFPO-EIDW_2026-10-30.fms ». Il faut une route d'au moins deux points placés. Copiez ensuite le fichier dans le dossier « Output/FMS plans » de X-Plane (l'envoi direct viendra avec le lanceur).

Une fois le vol démarré, ce pas porte une carte « Procédures » : rien n'est verrouillé : les côtés Départ et Arrivée restent modifiables à tout moment (un autre départ est un nouveau départ). Un changement ne refait pas le devis : le carburant bloc, le délestage et les réserves restent ceux du départ ; seuls les points horaires, le profil vertical et la distance restante suivent le nouveau chemin. Le bouton « Changer » de la Carte ouvre Carburant sur la ligne Arrivée (`#fuel?focus=arr`) : le pas Route avant le départ, le pas Départ après.

Une fois le vol démarré, le résultat en bas d'écran dit « Vol démarré à 11:14Z (13:14) · depuis 1 h 10 ». Les heures sont en UTC (« Z ») ;
l'heure de l'appareil s'ajoute entre parenthèses au départ, au décollage et à l'arrivée prévus. Un vol démarré se
termine en écrivant son compte rendu : à l'enregistrement, Carburant revient en préparation et Mes vols retire « en
cours ». Pour revenir en préparation sans compte rendu, « Annuler le départ » (après confirmation). La carte « Progression prévue » montre
où le vol devrait en être, en théorie : l'heure prévue de passage à chaque point (roulage, montée, croisière tronçon par
tronçon avec son vent, descente), le prochain point surligné, la distance parcourue et restante et le carburant restant
prévu. Elle suit l'heure, minute par minute, jusqu'au compte rendu ou à l'annulation, et part à la Carte avec le
vol. Le vol préparé ici — appareil, route, niveau, profil de montée et de
descente — est partagé : Carte et Compte rendu l'ont déjà.

## Les fiches de performances <a id="fuel-sheets"></a>

L'onglet « Fiches » rassemble les fiches de la compagnie, partagées avec tous ses appareils. Elles sont rangées par
catégorie (hélicoptères, turbopropulseurs, réacteurs, pistons, autres) ; chaque type utilisé par la compagnie (flotte,
référence) qui n'a pas encore de fiche y figure aussi, « performances à renseigner », avec « Créer la fiche ». Chaque
fiche dit ce qui lui manque, par famille (« À compléter : régimes, vitesses, croisière, roulage, piste ») ; « complète » quand
rien ne manque.

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
  confirmation. La cellule (avion, hélicoptère, planeur…) et la propulsion (pistons, turbopropulseur, turbomoteur,
  réacteur…) viennent de la base OACI du type : laissez « auto », sauf si la base se trompe ou ne connaît pas le type ;
  elles ne sont alors ni comptées comme manquantes ni demandées à ChatGPT.

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
