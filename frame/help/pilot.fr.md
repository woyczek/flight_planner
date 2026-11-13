<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilote — manuel

L'appli Pilote rassemble les outils de préparation et de suivi d'un vol : carburant et niveau, carte, compte rendu,
mes vols, passage au site de la compagnie. Elle marche sur un téléphone comme sur un ordinateur, avec ou sans réseau.

## Premier démarrage

- **Les verbes.** Sur un téléphone, la barre du bas donne cinq entrées : Préparer, Carte, Météo, CR, Vols. Touchez de
  nouveau un onglet déjà choisi quand il groupe plusieurs écrans : une petite liste s'ouvre au-dessus de lui (Préparer :
  Carburant et Fiches de performances). Sur un écran, chaque outil est un verbe de la colonne de gauche. L'adresse d'un outil
  (`#fuel`, `#report`…) suffit à y revenir. Les Réglages sont le bouton ⚙ de l'en-tête. Le nom de l'application, en haut à gauche, ouvre la liste
  des applications : Pilote, Compagnie (les missions de la compagnie) et, au niveau Complet, Maintenance (le même
  avion en rouge) ; un toucher y passe.
- **Votre identité.** Dans ⚙ Réglages, réglez votre trigramme et vos identifiants IVAO, VATSIM et SimBrief : les
  outils s'en servent pour préremplir.
- **Le niveau.** Toujours dans les Réglages, « Niveau » choisit ce que le menu montre : Découverte, Courant ou Complet.
  Un outil caché reste joignable par son adresse.
- **L'aide.** Chaque outil a, sous son contenu, un volet replié « Comment s'en servir » ; le bouton ? de l'en-tête (sur un téléphone
  comme sur un écran) ouvre ce manuel au chapitre de l'écran où vous êtes.
- **L'état, sur le bouton ⚙.** Dans l'en-tête, le bouton ⚙ porte une pastille : verte quand quelque chose vous attend (un
  vol démarré, un compte rendu à écrire), orange (sur un téléphone) quand il faut y prêter attention : pas de trigramme,
  écritures en attente, conflits, erreur de synchronisation, hors ligne. Les Réglages s'ouvrent sur le bloc « État », qui dit
  le détail : le vol en cours (touchez pour aller à la Carte), les comptes rendus à écrire pour vos vols passés (touchez pour
  ouvrir le compte rendu prérempli), le trigramme manquant (touchez pour le régler), l'état des données (dernière
  synchronisation, écritures en attente, moyen d'échange utilisé), la base aéronautique tant qu'elle n'est pas prête, le
  lanceur, « Hors ligne » quand il n'y a pas de réseau, le nombre d'appels météo du jour (prévisions
  Open-Meteo, 10 000 permis par jour), la fin de cycle AIRAC quand la base aéronautique ou les procédures publiées sont
  en retard sur le cycle en vigueur, et, sur un téléphone, la source de la position pendant un vol. Sur
  un téléphone, l'en-tête se réduit au nom, au bouton ? et au bouton ⚙.
- **Plein écran.** Sur la carte (outils à vue fixe), un bouton rond en bas de la colonne de boutons, sur la carte, masque
  l'en-tête et la barre du bas pour laisser toute la place à la carte ; le même bouton ou Échap reviennent.
- **Téléphone en paysage.** Tourné sur le côté, le téléphone range la barre du bas en un rail d'icônes à gauche (les mêmes
  cinq entrées ; un second appui sur Préparer ouvre ses outils à droite du rail), garde l'en-tête, pose le bloc de données de la
  carte en colonne à droite (touchez sa première ligne, ou tirez-la vers la gauche, pour l'élargir ou la rétrécir) et donne à la
  carte toute la hauteur restante. En plein écran, la colonne reste.

## Données et synchronisation

- **Position et trace du vol.** Avec l'usage « à plusieurs », la position réelle et la trace de votre vol en cours
  (un point par mille nautique ou par minute, à environ 100 m près) sont partagées avec le groupe et restent dans l'historique
  du dépôt ; elles ne partent jamais vers un service extérieur sans un geste de votre part.
- **Hors ligne d'abord.** Tout ce que vous faites est gardé sur l'appareil et marche sans réseau.
- **Seul sur cet appareil.** Sans échange coché dans les Réglages, rien ne part ailleurs : exportez de temps en temps
  la sauvegarde de l'appareil (un fichier), c'est la seule copie.
- **Plusieurs appareils, ou à plusieurs.** Cochez l'usage dans les Réglages et réglez l'accès (dépôt GitHub et jeton
  personnel, ou le lanceur d'un poste). Vos écritures partent ensemble à la synchronisation : au démarrage, toutes les
  10 minutes en ligne, ou par le bouton d'état en haut de l'écran.
- **Conflits.** Un fichier changé ici et ailleurs en même temps garde sa version la plus récente ; l'autre reste
  consultable (bouton d'état, puis « Conflits ») et peut être reprise ; « Vu » écarte un conflit de la liste et du compte, « Tout
  marquer comme vu » le fait pour tous d'un coup.

<!-- chapter: fuel -->
# Carburant et niveau

Préparer le carburant d'un vol et choisir son niveau : un aéronef, une route, un niveau, et le devis tombe — roulage,
délestage, réserve, carburant bloc, temps de vol et début de descente.

## Comment s'en servir

<a id="fuel-quote"></a>La préparation suit cinq pas, dans l'ordre où on prépare un vol : **1 Vol, 2 Route, 3 Météo, 4 Résultat, 5 Départ**. Sur
un téléphone, la barre du haut montre un pas à la fois (touchez un numéro pour y aller, « Suivant » en bas de chaque
pas) ; sur un écran large, les cinq pas sont les uns sous les autres. Tout se recalcule à chaque changement : corrigez
la route, la météo, le devis et le vent suivent, sans bouton à presser. Le résultat (carburant bloc, délestage, temps,
début de descente) reste visible en bas de l'écran à chaque pas, avec d'où vient le vent (« vent : METAR LFRS »,
« vent : prévision ICON FL060 », « vent saisi »). Sur un téléphone, cette barre tient en trois lignes : le contexte
(« FA50 · F-GXXX · Bloc · FL060→090→110→070 · vent ARPEGE FL060 » : l'aéronef du devis d'abord, « estimation du type » quand aucune fiche ne sert, et une tape sur lui ouvre le choix de l'aéronef ; puis l'unité du carburant, « lb · lb/h » ; en entier si on touche la ligne), le carburant bloc, puis trois tuiles
« Étape », « Temps » et « TOD » (début de descente). L'écran s'ouvre toujours sur l'onglet « Devis » ; les fiches
s'ouvrent par l'onglet « Fiches ». Un ✓ marque un pas rempli. Les niveaux s'écrivent partout de la même
façon : en FL à partir de 5 000 ft (FL060), en pieds en dessous (3 500 ft).

**La mission.** Un vol préparé depuis une mission porte, en haut de l'écran, la puce « Mission <ID> » : elle ouvre la fiche de la mission par-dessus l'étape (les risques d'abord, puis le résumé, les objectifs, les équipes et les zones, chacune sur la carte), sans quitter l'étape ; la croix la referme.

**Points imposés par la mission.** Les rendez-vous, la cible et la source (écopage) d'une mission sont des points imposés de la route : dans la liste des points, ils portent « imposé par la mission » et ne se montent, descendent ni retirent ; si le texte de la route en perd un, il y est remis à la sortie du champ. Les autres points (transit) sont les vôtres : ajoutez ou retirez librement les vôtres entre eux.

**Nouveau vol.** Le bouton « Nouveau vol », en haut de l'écran, efface le vol en préparation (départ, arrivée, route, procédures, niveau, OFP), après une question s'il porte déjà quelque chose ou s'il est démarré ; l'aéronef reste. Changer de terrain pour un autre à plus de 150 NM, ou changer le départ et l'arrivée, fait aussi un nouveau couple : la route, les procédures et l'OFP de l'ancien vol sont effacés, et l'écran le dit. Un terrain proche (une correction) remplace seulement l'ancien dans la route.

<a id="fuel-step-1"></a>**1 Vol.** L'aéronef vient en tête de l'étape : rien ne se calcule sans lui. Le départ, l'arrivée et le dégagement (codes OACI), la date du vol si vous voulez la prévision (TAF) plutôt
que l'observation, l'aéronef et le niveau de croisière (en FL) ; « Auto », à côté du niveau, prend celui qui brûle le moins de carburant sur la route parmi les niveaux de la règle semi-circulaire (jusqu'au plafond de la fiche), dit « auto » et le temps de vol sous le champ, et le suit quand la route, l'aéronef ou le vent changent — jusqu'à ce que vous saisissiez un niveau. Sous chaque code, une ligne fixe donne le nom du terrain pour vérification (« LFPO — Paris-Orly » ; « inconnu » si le code ne correspond à rien). « ⇄ », entre le départ et l'arrivée, les inverse : c'est un nouveau couple de terrains, la route, les procédures et l'OFP de l'aller sont effacés. Dès deux caractères, un code, un début de nom, une ville ou un pays (« LFP », « orly », « stockholm », « suède », « usa »), le champ propose sept terrains au plus : ↑ ↓ pour choisir, Entrée pour valider, Échap pour fermer, ou un toucher ; la liste se ferme quand on quitte le champ, et taper le code en entier à la main marche toujours. Le nom peut se taper en entier (« toulouse ») : seul un code choisi ou tapé entre dans la route, et un champ quitté sans choix revient au terrain enregistré. La date du vol (saisie à l'heure locale de l'appareil) est une seule valeur, gardée dans le vol courant : la météo du devis (TAF des terrains, vents et températures en altitude) est lue à cette date, l'ETA de la Carte en part tant que le vol n'est pas démarré, et le curseur de Météo part d'elle ; vide, c'est maintenant. L'aéronef tient sur une ligne : l'aéronef retenu, son immatriculation, son indicatif et d'où il vient. Un nouveau vol reprend le dernier
aéronef choisi sur cet appareil ; sans choix, le devis attend. « Changer », juste après l'aéronef, ouvre la recherche (le dernier choisi en tête) : tapez une fiche, une immatriculation, un indicatif ou un type. Les résultats viennent dans
cet ordre : vos fiches de performances, les aéronefs de la compagnie (sa flotte, puis ceux connus par son journal),
les types publiés, et en dernier le code tapé tel quel. Un aéronef de la compagnie prend sa propre fiche s'il en a une,
sinon celle de son type, sinon une estimation du type — le devis le dit alors « approché ». L'immatriculation et
l'indicatif choisis suivent le vol jusqu'au compte rendu. La ligne « Croisière » dit d'où vient la consommation ; lue dans la table régime / débit de la fiche, elle dit les deux régimes et, quand la table a plusieurs altitudes, les deux courbes entre lesquelles le niveau est interpolé (« 2400 rpm entre 2300 et 2500 rpm, entre les courbes de 4000 et 8000 ft »). La table ne sert que si deux de ses lignes chiffrées encadrent le régime de croisière (ou si une ligne est à ce régime) : sinon, c'est le débit de croisière saisi dans la fiche qui compte, jamais la ligne la plus proche prolongée.

À côté de la date, l'horloge « +30 » pose le vol dans 30 min (arrondi aux 5 min ; chaque appui ajoute 30 min) et « Maint. » revient à l'heure courante : la météo des terrains (le TAF s'il couvre cette heure) et les vents en altitude sont relus aussitôt.

<a id="fuel-theme"></a>**Famille et série.** Sous la date, « Famille » et « Série » disent ce que vous allez faire : un vol de fret, de passagers, d'essais, une mission SAR… Facultatives, elles sont remplies par la mission que vous préparez et ne proposent que les familles de votre compagnie (une compagnie commerciale : CAT · Transport aérien commercial). Le compte rendu les reprend et peut les changer : oubliées ici, elles se choisissent là.

<a id="fuel-step-2"></a>**2 Route.** Tapez la route dans le champ « Route » (Entrée la valide), Un tronçon direct se vole au compas : sa distance et son cap sont ceux de la loxodromie, la ligne droite de la carte. Quand un direct au compas dépasse de plus de 2 % le grand cercle (un long trajet en un seul tronçon), une ligne sous la route le dit : ajoutez des points intermédiaires, par exemple avec « Calculer A → B ». Chaque point de la liste peut porter un temps sur zone (⏱, en minutes) : le devis le compte, une ligne par point, au débit d'attente de la fiche (sinon à la croisière du niveau du point), et les heures des points suivants glissent d'autant. Préparé depuis une mission, le temps sur zone de ses points est repris ; une fourchette (« 5 à 40 min ») compte son maximum par défaut, et vous changez la valeur ; une durée que la mission écrit autrement est dite (« durée non lue »).
toujours visible : les points, les voies aériennes et les niveaux, comme dans un plan de vol (« LFBO/32L TOU UN460
NTS/F280 LFRN/28 »). Vous pouvez aussi y coller un plan de vol OACI ou la liste d'un OFP. Quand vous quittez le champ, la
route est remise au propre : en majuscules sur une ligne, sans DCT ni groupes vitesse-niveau, le départ et l'arrivée
aux bouts, un changement de niveau écrit « /F280 » après le point où il commence. Les voies aériennes restent écrites
(le devis suit les points). Les points inconnus restent à leur place et sont signalés juste dessous ; des coordonnées
s'écrivent à la façon OACI (« 4530N00030E »). La ligne suivante donne la distance et la route vraie, et d'où elles
viennent (la route, l'OFP SimBrief). Si la route ne se résout pas, « Saisir à la main » ouvre les deux champs. Avec
votre identifiant SimBrief réglé (⚙), « Dernier OFP SimBrief » reprend d'un coup la route, le niveau, le vent moyen et
l'aéronef de votre dernier plan.

**Calculer et contrôler la route.** Sur un poste dont le lanceur porte le calcul de route, deux boutons s'ajoutent sous le champ (si le lanceur s'est arrêté depuis, l'appui le dit, « Disponible avec le lanceur du poste (il ne répond pas) », avec « Réessayer ») : « Calculer A → B » propose des itinéraires d'un terrain à l'autre (les points que vous avez tapés sont des passages imposés), avec leur longueur, le FL tenu et le nombre d'écarts aux règles ; un appui sur un itinéraire le montre (surligné ici et sur la Carte, son détail déplié) sans le prendre ; « Choisir » écrit sa route, sa SID et sa STAR. « Contrôler » analyse la route tapée telle quelle : les segments fautifs passent en rouge dans la liste des points avec leur raison (RAD, FRA, plancher, plafond…), et leur nombre s'affiche dans la barre de résultat ; « N écarts aux règles » se déplie en une ligne par écart : le segment, la règle (l'identifiant RAD ou FRA) et la phrase du moteur. Un itinéraire dont le contrôle est incomplet faute de données est marqué « contrôle incomplet » : il n'est ni validé ni en écart. Chaque itinéraire dit aussi sa part contrôlée : « contrôlé 22 % · incomplet 65 % · repli 14 % » (« repli » : un tronçon que le moteur a relié sans pouvoir le contrôler), et un pli liste ses tronçons par couche (SID, FRA, voies, STAR). Quand aucun itinéraire ne peut être calculé, les pistes que le moteur a trouvées viennent à part, sous « Propositions non validées » : jamais dites contrôlées, à vérifier si vous en prenez une. Chaque tronçon dit sa nature avec le trait de la Carte : voie (trait plein), DCT (tirets), FRA (pointillé), SID, STAR, approche ; « Légende », sous la liste, les montre toutes. Les itinéraires se dessinent sur la Carte : à côté du Carburant sur un grand écran, ou par « Sur la carte » ; toucher un tracé le montre aussi, la liste reste. Votre saisie n'est jamais remplacée sans « Choisir ». Sans RAD importé sur le poste, un lien mène à sa ligne dans Données pour l'importer. C'est un précontrôle de simulation, pas une validation IFPS. « Choisir » prend l'itinéraire et modifie la route : les autres propositions disparaissent aussitôt, ici et sur la carte, et une ligne dit l'itinéraire pris. Dès l'appui, les deux boutons sont occupés et « Calcul en cours… » compte les secondes au-delà de deux ; un second appui ne relance rien. Un calcul de plus de 3 s le dit sous la liste, avec sa plus grande part (« Calculé en 7,4 s — dont 6,8 s chez le lanceur ») et « Copier le diagnostic » : les durées, en millisecondes, à joindre à un signalement.

Le bouton « Auto » à côté du champ « Route » inscrit les voies aériennes entre les points : pour chaque paire de points
nommés qui se suivent sans voie entre eux, il cherche le plus court chemin sur les voies de la base publiée, ouvertes au
niveau prévu (plancher et plafond de chaque tronçon, à 100 ft près ; sans niveau prévu, 6 500 ft, et une notification le
dit), avec une entrée et une sortie directes à 60 NM au plus et sans détour de plus de 40 %. Le texte devient « LFRS
TSA01 UT460 TSA05 LFML » ; les points intermédiaires de la voie, que le texte n'écrit pas, sont gardés dans les points
(la distance, la carte et le profil les suivent). Une notification donne le résultat (« 3 voies inscrites, 254 NM »)
ou « aucune voie utile entre X et Y ». Limites : les voies sont prises dans les deux sens (la base ne porte pas encore le
sens unique), sans restriction fine de niveau ni SID / STAR ; la route reste à vérifier. « Auto » repart toujours des points posés — le départ, la sortie de la SID choisie, les points que vous avez tapés, l'entrée de la STAR, l'arrivée — et remplace ce qu'un « Auto » précédent avait écrit : deux « Auto » de suite donnent le même texte, jamais une route qui s'allonge en boucle. Un tronçon qui repasserait par un point, ou qui rallongerait trop l'ensemble, reste direct, et la notification dit pourquoi (« pas de voie près de LACOU », « détour de plus de 40 % »). Quand le nom de la SID est dans le texte, sa sortie s'écrit après lui (« LFBO LACOU7B LACOU … ») et le tronçon de la sortie au premier point est routé. Une voie que vous tapez entre deux points (« GILUX A3 MOTAL ») est toujours lue comme une voie, jamais comme un point du même nom pris ailleurs ; elle n'est suivie que si elle relie vraiment ces deux points, sinon le tronçon reste direct et une ligne le dit (« A3 ne relie pas GILUX à MOTAL : tronçon direct »). Le texte de la route suit vos procédures, en forme OACI : le nom de la SID puis sa sortie après le départ, l'entrée puis le nom de la STAR avant l'arrivée, « DCT » entre deux points sans voie (« LFRS NTS1A NT102 DCT LUGEN … MEN01 MEN1A LFML ») ; l'approche n'y figure jamais. Quand la sortie de la SID n'est pas sur votre route, une ligne dit la jonction par un direct (« NTS1A sort à NT102 : NT102 DCT LUGEN »). Dans l'autre sens, le texte se relit : taper le nom d'une SID du départ ou d'une STAR de l'arrivée la choisit, l'effacer retire le choix. Dans la liste « Points (N) », chaque procédure choisie est une seule ligne repliée, dans sa couleur de la carte (« SID NTS1A · 2 points », « STAR MEN1A via NEPIX · 4 points ») : ses repères s'affichent d'une tape, jamais au rang des points que vous avez tapés ; le nombre compte vos points et ces lignes. Quand une voie relie bien deux points mais n'est pas ouverte au niveau du tronçon, la ligne la nomme avec sa plage ouverte, pour que vous décidiez (« A34 relie LACOU à LMG, fermée au FL260 (ouverte de 6 500 ft au FL195) : tronçon direct ») ; « Auto » ne la suit jamais quand même. En tapant dans le champ, dès deux caractères du mot sous le curseur, une liste propose (sept au plus) les SID du départ et les STAR de l'arrivée, les voies autour du point qui précède, les points et balises de la base : ↑ ↓ et Entrée, ou une tape, écrivent le mot au curseur ; Échap ferme la liste. Les listes de l'étape restent, pour le clavier et les lecteurs d'écran.

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

**Piste, SID, STAR et approche.** En bas du pas Route, une carte « Procédures » porte un côté Départ et un côté Arrivée. Chacun a un titre (« Départ LFPO Paris-Orly », avec « Sur la carte » : la Carte s'ouvre sur les procédures du terrain ; ce qui y est choisi — piste, procédure, approche — revient ici en une fois, appliqué comme un choix fait ici et dit en une seule ligne ; une famille que la Carte ne touche pas reste telle quelle), une seule ligne discrète (« lu le 29/10 16:53Z · Relire · 3 non lues », puis « Cartes » : la page du terrain dans l'AIP officiel de son État — eAIP du SIA, ENAIRE, AirNav Ireland — où sont ses cartes, dans un nouvel onglet ; rien pour un État dont la base ne connaît pas l'AIP ; quand la base connaît la carte officielle d'un choix, un lien « Carte 13R », « Carte SID », « Carte STAR » ou « Carte APP » ouvre son PDF dans un nouvel onglet, et « Cartes » reste tant qu'un choix n'a pas de carte connue ; la même ligne une fois le vol démarré, au pas Départ) et une grille fixe, la même des deux côtés : piste · SID · transition au départ ; piste · STAR · transition à l'arrivée, puis, dessous, approche · transition d'approche (une transition n'apparaît que si la procédure choisie en a). Sur un téléphone, une seule colonne ; aucun libellé n'est coupé. Chaque liste vient d'aerodb et montre toutes les procédures du terrain dans une seule liste classée par piste puis par nom (la piste n'est dans le libellé que si aucune piste n'est choisie et que la procédure n'en dessert qu'une : « OPALE 2E » quand la piste est choisie). Rien n'est interdit : une procédure en conflit avec votre choix est marquée ⚠ (une SID, une STAR ou une approche qui ne dessert pas la piste choisie ; sans piste choisie, une STAR qui ne dessert aucune piste de l'approche choisie ; la raison est dans l'infobulle — une STAR qui ne rejoint pas l'approche n'est pas un conflit : la Carte raccorde en tireté) et vous pouvez quand même la choisir — le ⚠ et l'infobulle suffisent, aucune notification ne le répète. ⌛ (gris) veut dire périmée, ⚠ (orange) en conflit. Dans chaque liste, ce qui est compatible avec votre choix vient en tête, les ⚠ ensuite ; dans la liste des pistes, celles de la SID ou de l'approche déjà choisie passent d'abord. Une procédure que la source n'a pas su lire correctement (sans nom, ou douteuse) n'est jamais proposée : la ligne discrète du côté dit combien ne sont pas lues (« 3 non lues » : les pages non lues et les procédures à vérifier du fichier lu). Si les données du terrain ne portent aucune fiche de piste, les pistes proposées sont celles que nomment ses procédures. Chaque piste porte le vent du METAR connu du terrain (celui du pas Départ) : « 13R — ↓ 12 kt · ← 6 kt » : la flèche montre où souffle le vent, la piste vue vers le haut comme en finale (↓ de face, ↑ arrière, ← un vent de droite, → un vent de gauche). En vert un vent de face ; en orange un vent arrière jusqu'à 5 kt ou un travers de plus de 10 kt ; en rouge un vent arrière de plus de 5 kt ou un travers de plus de 20 kt (ou de la limite de la fiche de l'aéronef quand elle en a une) ; la raison en infobulle. Sans METAR, rien n'est affiché. Le titre de chaque côté se termine par le résumé du choix, le même texte que le volet de la Carte : « 13R · ↑ 12 kt », « MEN1A via NEPIX », « I13R » (« SID aucune » pour un départ sans SID). Choisir une STAR ou une approche qui ne dessert qu'une piste pose cette piste ; une STAR propose ses transitions, une approche ses transitions d'approche. Une approche se lit en court, son type et sa piste (« ILS 06 », « RNP 06 » ; le nom publié dans l'infobulle). Une approche ILS dit, sous la liste, l'aide que la base porte : « ILS 25 · DO 109.35 · axe 246° · DME » (indicatif, fréquence, axe) ; rien quand la base ne la porte pas ; le résumé replié de l'arrivée en garde l'indicatif et la fréquence (« I13R · TST 110.30 »). Les segments d'approche initiale que le SIA publie à part (« INA RNAV RWY 06 ») ne sont jamais des lignes : ce sont les transitions de toutes les finales de leur piste, « via ODILO 1A » (l'IAF puis le nom publié), et « — » reste le direct vers l'IF. Le premier choix, « — », veut dire « pas choisi » ; « aucune » est un vrai choix (un départ direct, sans SID). Une procédure du repli X-Plane du poste passe en dernier, marquée « X-Plane, local » ; une procédure lue sous un cycle antérieur est marquée ⌛ (à relire). Sur un terrain sans procédure publiée, la ligne discrète le dit (« aucune procédure publiée · Lire les procédures de LFXX ») : un terrain par geste, jamais en silence. Si l'État ne publie pas ses procédures en tables (images, étiquettes seules…), la ligne le dit et propose Navigraph et ChartFox plutôt qu'une lecture vouée à l'échec ; un État lisible à la demande offre « Lire à la demande ». Quand c'est la zone de la base qui manque (non installée, à reconstruire, ou sans points ni voies), la même ligne le dit, offre « Ajouter » ou « Mettre à jour » dans Données, et cite les replis du poste : Little Navmap s'il y est, Navigraph, ChartFox. Un terrain qui a déjà des procédures montre, sur cette même ligne, la date de sa dernière lecture (« lu le 29/10 16:53Z », ⌛ si elle date d'un cycle passé) puis « Relire » : le même geste, qui remplace le fichier lu. La même ligne dit où en est le sol du terrain (voies de circulation et parkings, lus avec ses procédures, pour la Carte) : « Lecture du sol en cours… », « Sol lu », ou « Sol non lu » et pourquoi, avec « Réessayer », qui relit le sol seul ; ce sont les mots du panneau Sol de la Carte. Un terrain français se lit dans l'eAIP du SIA, sans compte ; un État dont l'AIP publie des tables de procédures, dans EAD Basic (identifiants réglés sur le poste) ; pour tout autre État, le message dit qu'aucune table n'est publiée. Sans lanceur, ou sur un appareil appairé au poste, la lecture se fait sur le poste — le message le dit — et l'OFP SimBrief reste la source du vol. Une fois la SID et la STAR choisies, le devis court sur le chemin « route + procédures » (la distance de la SID et de la STAR comprise) et la Carte les trace avec leurs altitudes et leurs vitesses ; leurs contraintes d'altitude n'entrent pas dans les paliers du devis, elles se lisent sur le profil vertical, qui garde la croisière jusqu'à ce que la descente doive commencer et ne remonte plus une fois commencée. « Dernier OFP SimBrief » propose sa SID et sa STAR pour les seuls côtés que vous n'avez pas encore choisis (« aucune » est un choix) : il ne remplace jamais votre choix, et dit ce qu'il a rempli, une ligne par côté (« Arrivée : STAR — → LERG1R »). Des choix faits à la suite sont écrits une seule fois, un instant après le dernier. La carte s'ouvre repliée, pour se lire sans défiler : une ligne de résumé par côté (« Départ LFRS · 03 · NTS1A », avec « Sur la carte ») ; une tape sur la ligne, ou sur ▸, déplie ses listes et sa ligne discrète (« Relire », « Cartes »), un côté à la fois. Un côté sans procédure reste déplié : sa ligne propose la lecture. Avec un METAR à vent dirigé (3 kt et plus), la piste du plus fort vent de face est dite en tête — « Piste probable : 31L (METAR 1230Z, vent 310/12) » — avec « Prendre la piste probable » ; elle n'est jamais posée d'office, et rien n'est dit par vent calme ou variable. Quand la compagnie vole sur IVAO ou VATSIM et que vous avez votre identifiant de ce réseau, l'ATIS du terrain est lue en ouvrant l'étape (et sur « Lire la météo des terrains ») : « Piste en service : 25 (ATIS VATSIM, information F, 1655Z) » se lit en tête, avec « Prendre la piste de l'ATIS » ; la ligne du METAR suit quand elle dit autre chose. Seules la piste, la lettre et l'heure sont reprises, et seulement d'une tournure reconnue (« ARR RWY 25 », « RWY IN USE 25 »…) pour une piste qui existe ; une ATIS de plus de 90 min, ou qui se contredit, n'est pas dite. La route se colle aussi au format des plans de vol des outils, piste comprise : « LFPO/07 OPAL2E OPALE DCT … LFML/31R » pose la piste de départ, la SID, la STAR et la piste d'arrivée ; une piste choisie s'écrit de même après son terrain. Une piste que le terrain n'a pas est dite, et rien n'est choisi ; effacer « /07 » retire la piste, et c'est dit. Un groupe vitesse et niveau en tête (« N0450F350 ») est ignoré, et dit : le niveau reste celui de l'étape Vol.

**Approches à vérifier.** Une approche dont la lecture est douteuse (lignes de la table non lues, géométrie qui ne colle pas…) est quand même proposée, marquée « ⚑ à vérifier », sa raison dans l'infobulle : vous pouvez la choisir à la main, rien ne la choisit à votre place. Les approches que l'AIP ne donne qu'en carte (sans table de codage) sont dites sous les listes, « Carte seulement dans l'AIP », chacune avec sa carte. Choisie, une approche à vérifier dit sa raison sur une ligne sous la liste, et le résumé replié de l'arrivée porte « ⚑ ». Après les approches codées, chaque approche que l'AIP ne donne qu'en carte a sa ligne (« NDB RWY 13L — carte seulement dans l'AIP · carte ») : elle se lit sur sa carte, elle ne se choisit pas. Une approche dont la base n'a que la finale (FAF et seuil) est dite « — finale seule ». « Aucune approche publiée » n'est dit que lorsque l'AIP n'en publie vraiment aucune.

**Procédures lues de Little Navmap.** Une procédure lue dans la base de Little Navmap de ce poste porte « Little Navmap, lue sur ce poste ». Elle reste sur ce poste : le vol n'en garde que le nom, aucun de ses points. Les fichiers pour X-Plane et MSFS, eux, la portent comme les autres procédures.

**Lire depuis Little Navmap.** Pour un terrain dont la base n'a aucune procédure (KDEN, par exemple), sur un poste où le lanceur a trouvé une base de Little Navmap, « Lire depuis Little Navmap » lit ses procédures dans cette base, par le lanceur. Il faut d'abord avoir coché l'usage personnel dans Données › Sources sous licence personnelle ; sinon, une ligne le rappelle et rien n'est lu.

**Niveaux et points des procédures.** Quand les points de la route portent un niveau (« /F180 ») et le plan un autre, une ligne sous le niveau le dit avec la montée et la croisière qu'il en résulte (« Points à FL180, plan à FL320 : 0:36 de montée pour 0:09 de croisière ») ; « Aligner les points sur le plan » retire les niveaux des points. Dans la liste des points, chaque point d'une SID, d'une STAR ou d'une approche choisie a son champ de niveau : un niveau posé est suivi par le profil (et la Carte) ; au-dessus du plafond de la fiche, ou trop raide pour être rejoint, il est refusé et l'écran dit pourquoi. Un nom de la route qu'aucune base ne connaît mais que la procédure choisie porte (BEPAN de la BEPA4E) prend la position de la procédure ; s'il reste inconnu près d'un terrain dont la base n'a aucun point publié, la ligne le dit. Un nom porté par plusieurs points (homonymes) prend le plus proche du point précédent (un code de terrain reste le terrain), et la ligne sous la route le dit, comme un saut de plus de 1 000 NM d'un point au suivant. Un nom dont le seul lieu connu est très loin de la route (plus de deux fois la distance directe, plus 400 NM) n'est pas placé : la ligne le dit, et la base de sa zone est peut-être incomplète. Un point inconnu dit l'état de sa zone : base non installée (« Ajouter »), fichier du cycle absent (« Mettre à jour »), ou source sans points ni voies. Une STAR publiée une fois par piste suit la piste choisie.

**Un terrain n'est jamais un point de la route.** Si le texte de la route commence encore par l'ancien départ après un changement de terrain (ou finit par l'ancienne arrivée), ce terrain n'est ni listé, ni routé par « Auto », ni réécrit : le vol part toujours de son départ. Un autre terrain au milieu de la route reste (une route VFR peut en passer un). Dans la liste des points, un nom de la route qu'aucune base ne connaît reste à sa place, sans position, avec sa raison (« inconnu de la base », ou « aucun point publié autour de EIDW » quand la zone manque) : la liste montre toute la route, jamais moins.

<a id="fuel-step-3"></a>**3 Météo.** Le vent (direction et force) et l'écart ISA. Sans direction, ou sans vent du tout, le carburant bloc est
donné en fourchette. Le vent est compté tronçon par tronçon, au cap de chacun (le vent prévu à ses deux bouts quand il est lu, sinon celui du vol), avec la dérive : un fort vent de travers ralentit aussi ; la barre de résultat le dit « vent par tronçon ». « Lire la météo des terrains » affiche le départ, l'arrivée, le dégagement et
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
est l'écart du vol, le trait horizontal le plafond de la fiche ; leur croisement dit à quelle altitude pression l'aéronef
atteint son plafond ce jour-là (droite en gras). Un point marque le départ d’après le METAR (température et QNH).
Important pour les hélicoptères : par forte chaleur ou en altitude, le plafond réel peut tomber bien sous celui de la
fiche.

Sous l'abaque, « Atmosphère réelle au départ » montre la température prévue à chaque altitude au-dessus du départ
(trait plein) face à l'atmosphère type (tirets) : là où la courbe s'en écarte, l'écart ISA change avec l'altitude, et
les couches d'inversion (la température qui monte avec l'altitude) sont surlignées et dites dessous. La ligne de
lecture donne, au niveau planifié, la température, l'écart ISA et l'altitude-densité réelles.

Le titre de « Consignes de montée » dit le régime de montée de la fiche (« Montée : 8000 rpm »), quand elle en a un. Dépliez-les pour suivre la montée jusqu'au niveau : gaz, régime, badin, vario, débit,
Mach, temps et carburant cumulés aux paliers, avec le profil dessiné. Le résultat donne carburant bloc, délestage, temps de vol et distance du début
de descente avant l'arrivée. « Détail du devis » le décompose phase par phase.

« Ouvrir dans » prépare le même vol ailleurs, dans un nouvel onglet : SimBrief
(options du vol préremplies, connexion SimBrief requise), SkyVector (la route tracée, avec vitesse et niveau),
Navigraph et ChartFox (les cartes des terrains de départ et d'arrivée, connexion requise). Une entrée grisée dit ce
qui lui manque (terrain, type d'aéronef). Rien n'est envoyé qui ne soit déjà dans le vol. Les réglages du devis (roulage, réserve, marge, couloir météo, unités, débit de ce vol) sont le premier pli du pas Résultat, replié, son titre dit l'unité du carburant (« Réglages du devis · lb/h »).

<a id="fuel-alternate"></a>**Carburant de dégagement.** Le carburant bloc compte maintenant le dégagement : roulage + étape + contingence + dégagement + réserve finale. Sa ligne, au « Détail du devis », dit la distance de l'arrivée au dégagement, le niveau, d'où vient le chiffre (le débit de dégagement de la fiche, ou le modèle de l'étape) et le vent (celui de la route près de l'arrivée, ou « vent inconnu »). Sans dégagement saisi, ou sans sa position, la ligne le dit et rien n'est ajouté. Le bloc d'un vol avec dégagement est donc plus élevé qu'avant : c'est voulu.

<a id="fuel-step-5"></a>**5 Départ.** Un récapitulatif d'une page : l'aéronef, la route telle qu'elle sera déposée, le niveau (et ses

**Direct vers un point.** Sur un vol démarré, quand le contrôle donne un direct, tapez le nom du point dans « Direct vers… » de l'étape Départ (ou touchez « Direct vers ce point » sur la Carte) puis « Préparer le direct ». Le panneau dit d'où part le direct (votre position de moins de deux minutes, sinon la position prévue, sinon le dernier point passé), les points sautés et l'écart (distance, temps et carburant estimés) ; rien n'est écrit avant « Appliquer le direct ». Un point hors de la route est inséré, la route reprend au point suivant (un autre se choisit). Un point imposé par la mission sauté est dit en rouge et demande une seconde confirmation ; son temps sur zone est retiré du devis, et le compte rendu dira « non survolé : direct du contrôle ». Un point déjà passé, ou plus loin que le reste de la route, est refusé. « Annuler le direct » remet la route d'avant tant que rien d'autre n'a changé.

**Envoyer ce vol à mes appareils.** Le vol en cours est enregistré tout de suite sur cet appareil, mais il ne part pas avec l'envoi groupé des données (toutes les cinq minutes au plus) : vos autres appareils (téléphone, tablette) ne le reçoivent qu'à son envoi. Tant qu'il attend, le résumé le dit et propose « Envoyer ce vol à mes appareils » ; il part aussitôt, et la ligne dit « Vol envoyé à vos appareils à 17:52 ». « Synchroniser » l'envoie aussi. S'il ne part pas (hors ligne), une note le dit : il reste sur cet appareil.

**Aides radio.** Sous le résumé, « Aides radio » donne d'un coup d'œil l'ILS de l'approche choisie (piste, indicatif, fréquence, axe, DME), puis, replié, les VOR / DME de la route dans l'ordre du vol, chacun avec sa fréquence et le tronçon où il sert. Rien n'est inventé : sans aide dans la base, la carte le dit.
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
vol. Le vol préparé ici — aéronef, route, niveau, profil de montée et de
descente — est partagé : Carte et Compte rendu l'ont déjà.

## Les fiches de performances <a id="fuel-sheets"></a>

L'onglet « Fiches » commence par la même recherche d'aéronef que le pas Vol (le champ « Fiche, immatriculation, indicatif ou type » : un résultat touché devient l'aéronef du vol). Il liste ensuite les fiches de la compagnie (celles des types de la flotte de la compagnie courante d'abord, les autres dans « Autres fiches », repliées ; la recherche donne aussi ses immatriculations d'abord), partagées avec tous ses aéronefs, **en lecture seule** : elles se
modifient dans Maintenance › Aéronefs, onglet « Fiches ». Elles sont rangées par catégorie (hélicoptères, turbopropulseurs,
réacteurs, pistons, autres) ; chaque type utilisé par la compagnie (flotte, référence) qui n'a pas encore de fiche y figure
aussi, « performances à renseigner », avec « Créer dans Maintenance ». Chaque fiche dit ce qui lui manque, par famille
(« À compléter : régimes, vitesses, croisière, roulage, piste ») ; « complète » quand rien ne manque ; celle du vol porte
« utilisée pour ce vol ».

- **Utiliser** : choisit cette fiche pour le vol et revient au devis.
- **Modifier dans Maintenance** : le nom de la fiche et ce bouton ouvrent son éditeur dans le même onglet. C'est là que
  se font l'import (fichier, texte collé, réponse de ChatGPT), les compléments EUROCONTROL, l'aperçu champ par champ avant
  toute écriture, l'origine et la date de chaque champ, les exports `.lnmperf` et JSON et la suppression.

## Réglages et unités

Dans « Réglages du devis » : minutes de roulage et de réserve, pourcentage de contingence, et un débit de croisière
propre à ce vol (il remplace celui de la fiche), saisi dans l'unité du devis que son libellé dit (« lb/h »). « Unités affichées » change le carburant (kg ou lb), la vitesse, les
altitudes et les distances à l'écran ; les niveaux restent des niveaux de vol, et rien ne change dans les fiches. Les unités affichées et le rayon de la météo sont des réglages de cet appareil : ils ne suivent pas sur vos autres appareils (un téléphone peut afficher des km, l'ordinateur des NM).

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
de dégagement en tirets gris. La piste, la SID, la STAR et l'approche choisies dans Carburant sont tracées par-dessus la route (SID en vert, STAR en orange, approche en bleu), nommées comme dans Carburant (« ROYAN6P », « ILS 06 »). Son résumé (niveau, distance, vol prévu ou en cours) n'est pas écrit au-dessus du dessin (le dessin le montre) : l'infobulle de la poignée du bloc de données sous la carte le donne, avec départ et arrivée, dégagement et type d'aéronef. Quand le vol change dans Carburant, la carte suit d'elle-même.

**La carte et ce qu'elle montre.** Autour de la route : les espaces aériens qu'elle traverse ou frôle (zones
réglementées, dangereuses, interdites, espaces contrôlés), les voies aériennes basses ou hautes selon votre niveau,
les terrains et les balises, et dans chaque carré d'un degré l'altitude minimale de sécurité (le chiffre brun, en
milliers et centaines de pieds : « 3⁵ » veut dire 3 500 ft). Les petits chiffres violets le long de la route sont les
distances depuis le départ, en milles nautiques. Faites glisser la carte avec un doigt, écartez deux doigts pour
zoomer (pendant le geste, la carte se réduit à ses traits — espaces, voies, route avec la SID et la STAR choisies, terrains et balises en petits ronds, ceux-là mêmes qu'elle montre au repos — et ses
noms reviennent dès qu'elle s'arrête) ; « Recentrer » (la cible, en haut à droite de la carte) revient sur toute la route. La carte reste où vous l'avez mise, même quand la route change :
seul « Recentrer » (ou un autre vol) la recadre. En revenant sur la carte (depuis Carburant, ou après « Terminer »), vous retrouvez
votre cadrage tant que la route et les procédures choisies n'ont pas changé ; sinon le vol est recadré, procédures comprises. Tant que « Autour du vol seulement » est cochée (Couches),
les espaces et les voies ne sont lus que près du vol, de loin ; décochez-la ou rapprochez-vous pour tout voir.

**La route orthodromique.** Dès que le départ et l'arrivée sont connus, la carte trace le plus court chemin entre eux (le grand cercle) en pointillé fin, dans la teinte atténuée de la route et sous elle : l'écart avec votre route se lit d'un coup d'œil. Passez la souris ou touchez le pointillé : la bulle donne sa longueur en NM.

**Les itinéraires proposés.** Quand Carburant calcule ou contrôle une route (« Calculer A → B », « Contrôler »), la carte dessine les itinéraires proposés : celui qui est pris en plein, les autres estompés, celui que vous survolez dans la liste épaissi, les tronçons fautifs en rouge. Touchez un tracé (ou sa ligne dans la petite liste, sur une carte seule) pour le prendre : Carburant le reprend comme son bouton « Prendre ». La carte d'un autre vol ne dessine rien. Quand le moteur dit ce qu'il a vérifié d'un tronçon, le tracé le montre : plein = contrôlé, tireté = incomplet, pointillé = repli, rouge = erreur ; la petite liste donne la clef. Le trait a l'épaisseur de la route du vol : le choisi en plein, les autres estompés. Il dit la nature du tronçon quand Carburant la donne : une voie en plein avec son nom le long du trait, un direct (DCT) en tirets, une route libre (FRA) en pointillé, une SID, une STAR ou une approche dans la teinte des procédures, une faute en rouge, et un trait plus fin quand le tronçon n'est pas contrôlé en entier. Les points de l'itinéraire choisi sont marqués et nommés (l'entrée, la sortie et les changements de voie toujours, les autres quand la place le permet). Une légende repliable est dans la liste, et dans la légende de la carte ; survoler un tracé sur la carte le surligne.

<a id="maps-procs"></a>**La piste et les procédures choisies.** Ce que vous avez choisi dans Carburant (piste, SID, STAR, approche) se trace par-dessus la route : la SID en vert, la STAR en orange, l'approche et son approche interrompue en bleu, depuis le seuil de la piste de départ jusqu'au premier point de la route, et du dernier point de la route jusqu'au seuil de la piste d'arrivée. Les transitions et l'approche interrompue sont en tirets ; un tronçon sans point (une montée sur un cap, par exemple) est un court trait le long de son cap, puis des tirets jusqu'au point suivant ; un virage à rayon constant est un arc. Quand la SID ne rejoint pas un point de la route, un tireté droit la raccorde à la route (de même pour la STAR). Une procédure que vous n'avez pas choisie n'est jamais dessinée, et la liste des couches n'a pas de case pour elle. Le nom de la procédure s'écrit sur son tracé, suivi de l'origine de ses données quand elles viennent de X-Plane ou de Little Navmap (« X-Plane, local ») puis du symbole ⌛ (en gris) quand elles ont été lues sous un cycle antérieur ; la légende (puce « i ») le rappelle. Dès la vue régionale (réglable dans la page des seuils), chaque point porte ses contraintes ; le nom de la procédure s'écrit à toutes les échelles, par-dessus le reste, comme sur les cartes de procédures : l'altitude **soulignée** veut dire « au moins », **surlignée** « au plus », les deux « exactement », « 5000–7000 » « entre les deux » ; « ≤ 220 kt » est la vitesse à ne pas dépasser. Le profil vertical suit le même chemin et montre ces contraintes comme des paliers (flèche vers le haut : au moins, vers le bas : au plus, point : exactement, barre : entre deux altitudes) ; leur texte prend une place libre ou se tait, jamais par-dessus le nom d'un espace, TOC / TOD ou un palier ; les distances, les heures estimées et le curseur sont mesurés sur ce chemin. La carte ne modifie jamais ce choix : touchez un terrain de la route, sa fiche donne la piste et les procédures choisies, avec un bouton « Changer » qui ouvre Carburant sur la ligne à modifier ; un lien « Source » ouvre dans un nouvel onglet la page publiée de la procédure (eAIP du SIA), et pour une procédure lue ailleurs le nom de son document s’affiche au survol de la ligne.

<a id="maps-rwy"></a>**Les pistes.** De près, chaque piste de chaque terrain dessiné se dessine en petit vecteur depuis son seuil, et le terrain porte son nom à côté de son code (« LFPO Paris-Orly ») ; chaque vecteur part dans le sens de la piste, son numéro en queue, derrière le seuil : la piste choisie dans Carburant en gras dans la couleur de son côté, les autres fines. Elles n’apparaissent qu’à partir du zoom réglé par la compagnie (Réglages › Administration, « Zoom des seuils de piste », 11 sans réglage) ; en dessous, rien. Dans « Choisir sur la carte », toutes les pistes du terrain se dessinent ainsi, la choisie en gras ; les dessins du choix passent au-dessus des étiquettes du fond, estompées.

**Le sens d’une voie.** Un tronçon de voie aérienne à sens unique porte une petite flèche dans le sens permis, à partir d’un zoom moyen (à côté du nom de la voie) ; un tronçon à double sens, ou dont la source ne dit rien, n’en porte pas. L’infobulle du nom de la voie dit « sens unique LMG → NEPIX » ou « double sens ».

<a id="maps-choose"></a>**Choisir sur la carte.** Le bouton « Sur la carte » d’un côté de Carburant (départ ou arrivée) ouvre la carte sur ce terrain — de même que « Choisir sur la carte » sur la fiche du terrain de départ ou d’arrivée (touchez sa pastille ; pleine largeur sur un téléphone) : la feuille s’ouvre dépliée (« Terminer » reste au pied, toujours visible), le fond de carte et les couches s’estompent, la vue se cale sur le terrain et ses procédures compatibles avec votre choix, à 40 NM autour de lui, le terrain au centre (les entrées lointaines restent hors cadre ; une procédure choisie qui sort de la vue l’élargit à elle seule) ; dès l’entrée, les procédures compatibles de la première famille sont dessinées, estompées : touchez-en une sur la carte pour la choisir, comme sa ligne. En tête du bloc de données, votre sélection en une ligne par famille (« Piste 31 · ↑ 12 kt », « OKRI5L », « I31 via IAF1 »), chacune avec ✕ pour la remettre à « Aucune » ; toucher le nom d’une famille (« Piste », « STAR », « Approche ») mène à son groupe et le déplie. Dessous, les trois familles à la fois — la piste, la SID (au départ) ou la STAR, l’approche (à l’arrivée) — en lignes serrées : trois touchers dans l’ordre qui vous convient. Chaque choix réduit les deux autres familles à ce qui lui est compatible ; le reste est replié sous une ligne fine « N autres · Toutes », qui le déplie marqué ⚠ (on peut toujours le choisir). Les SID qui sortent et les STAR qui entrent sur la route que vous avez tapée viennent d’abord, sous « Vers votre route » ; les autres suivent, marquées « sortie LACOU » ou « entrée OKRIX ». Sur une route directe (aucun point ni aucune voie entre les deux terrains), rien de tel : elles se classent par leur direction vers l’autre terrain, « Vers LFPO » au-dessus des mieux orientées (à moins de 60°), une petite flèche dans le sens du vol sur chaque ligne. « Aucune » est toujours la première ligne. Les procédures qui ne diffèrent que par la piste (OKRI5L, OKRI5R) forment une seule ligne « OKRI5 » avec ses pistes en petites étiquettes : la toucher choisit la famille et réduit les pistes, toucher une piste choisit la procédure. Les approches se lisent par leur libellé court (« ILS 06 », « RNP 06 », sans étiquette de piste puisque le libellé la dit, le même sur la carte ; le nom publié au survol) ; sous l’approche choisie, « Sans transition » puis ses transitions, dont les segments d’approche initiale que le SIA publie pour toute la piste (« via ODILO 1A »), dans la teinte de leur finale ; une STAR choisie ne laisse que les transitions qui partent d'un de ses points (sinon la transition revient à « Aucune ») ; une transition qui ne rejoint pas la finale sur un point commun s’y raccorde en tireté. Chaque procédure a sa teinte (huit, reprises en cycle), la même sur sa ligne, son cartouche et son tracé ; sur la carte, un petit cartouche par famille et par point (« NIMER 9 »), et la procédure survolée ou touchée passe au-dessus de tout, avec son nom complet ; survoler une ligne de n’importe quelle famille surligne son tracé, survoler un tracé surligne sa ligne ; ⌛ (gris) : lue sous un cycle antérieur. Le code du terrain reste écrit par-dessus les procédures ; les numéros de piste prennent leur place avant les balises, qui leur cèdent ; un numéro qui tomberait sur un cartouche n'est pas écrit (la flèche reste). Chaque piste porte le vent du METAR déjà connu : « ↓ 12 kt » de face, « ↑ » arrière, puis le travers (← vent de droite, → vent de gauche : la flèche dit où il souffle, la piste dessinée vers le haut, comme dans Carburant), en vert, en orange ou en rouge selon le vent arrière et le travers ; sans METAR, rien. Un toucher sur une ligne ou un tracé ajoute ce choix et le laisse sur la carte (la piste en gras, la procédure dans sa teinte, les autres de sa famille estompées) ; rien n’est encore écrit. Une procédure qui ne sert qu’une piste la choisit si aucune ne l’est ; sinon une ligne sous le groupe propose la correction, d’un toucher : « OPAL2E sert la 25 — Passer en 25 », ou « OKRIX5A ne sert pas la 07 — Choisir OKRIX5B ». « Terminer », la croix ✕ ou Échap vous ramènent à Carburant avec tout ce que vous avez choisi ; Carburant l’écrit et dit ce qui a changé ; la carte n’écrit rien. Pour renoncer sans rien rendre : « ← Carburant » en haut.

<a id="maps-ground"></a>**Le sol d’un terrain.** Le bouton « Sol » de la fiche du terrain, ou la loupe « Sol : chercher une voie de circulation, un poste, une attente » de la colonne de boutons de la carte (elle apparaît quand la vue montre le départ ou l’arrivée du vol, à partir du zoom 11), ouvre la liste de ses voies de circulation, de ses postes de stationnement et de ses points d’attente : un champ filtre par nom (sans casse ni accent), des puces choisissent la nature, et survoler ou toucher une ligne la surligne sur la carte (le toucher la cadre). Sur la carte, un toucher sur une voie ou un poste ouvre sa ligne. La couche se dessine de près (voies et leurs noms à partir du zoom 13, attentes (cartouche rouge à lettres blanches) à 15, postes à 16) ; un nom qui n’a pas trouvé de place est marqué « non dessiné » dans la liste. Le sol se lit avec les procédures du terrain : tant qu’elles ne sont pas lues, le panneau le dit et renvoie vers les procédures ; une fois lu, il indique la date de lecture. Données © contributeurs d’OpenStreetMap, ODbL. Si la lecture du sol a échoué, le panneau le dit avec sa raison et propose « Réessayer » (la lecture du sol seule, sans relire les procédures).

<a id="maps-coverage"></a>**La couverture.** La couche « Couverture » (la liste des couches, éteinte au départ, allumée seulement par sa case) colore les terrains selon ce que cet appareil sait donner de leurs procédures : **vert**, elles sont détenues (publiées, saisies à la main ou lues sur ce poste) ; **orange**, elles sont détenues mais lues en partie (des pages non lues, des fiches à vérifier : la fiche du terrain dit combien) ou elles se lisent à la demande (la France par l'eAIP du SIA, un État dont les tables sont lisibles, un terrain de la base locale de Little Navmap) ; **rouge**, rien de lisible (images seules, texte en prose, rien sur ce poste). La légende (la pastille « i » du bloc de données) donne une ligne par couleur tant que la couche est montrée. Seuls les terrains visibles sont interrogés. Touchez un terrain : sa fiche ajoute une ligne avec la pastille, le niveau et la raison (⌛ si les procédures détenues datent d'un cycle antérieur, puis le nombre de SID, de STAR et d'approches détenues). Quand l'appareil ne sait pas donner cette information, la couche n'est pas proposée.

<a id="maps-weather"></a>**Le profil et le curseur.** Dans le bloc de données sous la carte, le profil vertical coupe la route de bout en bout : le relief, les espaces
aériens où vous entrez à l'altitude prévue, et la trajectoire du vol en violet. Faites glisser le doigt sur le profil :
un curseur bleu le suit, et le même curseur se place sur la carte. Touchez la route sur la carte pour le placer là. La
ligne sous le profil dit ce qu'il y a sous le curseur : distance depuis le départ, altitude prévue et altitude du relief (toutes deux au-dessus de la mer, AMSL), hauteur au-dessus du sol (leur différence),
et l'espace aérien où vous êtes à ce moment-là. Sous la carte, ce bloc de données montre le profil ; la liste des
espaces d'un point ou les points de report d'un terrain s'y ouvrent à sa place quand vous les demandez, et le profil
revient à leur fermeture. La pastille en forme de nuage, (les trois pastilles — profil, nuage, « i » — sont toujours dans la ligne du haut, à droite ; celle qui n'a rien à montrer est seulement grisée) le remplace (la pastille du profil le ramène) par la coupe météo le long de la route
(vent, température, nuages, givrage) à l'altitude du vol ; la coupe suit le même curseur, et un toucher dessus le déplace. Le bouton « Météo de la route » est le seul geste : il montre la prévision déjà gardée, sinon il la lit, puis nomme le modèle choisi par le milieu de la route (« Météo de la route · AROME 12 h ») ; dès l'appui, la feuille dit « Lecture de la météo de la route… » avec les secondes écoulées et le bouton est occupé (dix appuis font une seule lecture) ; la lecture s'arrête au bout de 20 s ; la fin est toujours dite : la coupe, ou la raison (hors ligne, limite du jour, plus de 20 s, réponse HTTP, rien reçu, vol sans niveau) avec « Réessayer ». La dernière pastille, « i » (grisée tant que le dessin n'a pas de légende), ouvre par-dessus le profil sa légende (ce que sont chaque trait, bande et repère) ; glisser le doigt sur la coupe déplace le curseur comme sur le profil. Le profil et la coupe sont dessinés à la hauteur exacte du bloc, leur axe des distances toujours visible : sur un bloc bas ils suppriment des étiquettes de niveaux, jamais l'axe.

<a id="maps-profile-spaces"></a>**Les espaces du profil.** Le profil ne montre que les espaces où entre le chemin vertical prévu (à 500 ft près) ; des secteurs d'une même famille qui se recouvrent (les CTA de Dublin) n'y font qu'une enveloppe, nommée par la famille ; la route libre (FRA) et les zones W ou de recherche météo n'y paraissent que si la couche « Autres espaces » est allumée ; au plus sept espaces y sont nommés, les autres dans la liste du dessous. Les voies aériennes que la route suit y sont des blocs nommés (« UN460 », plancher – plafond) : là où un espace de classe plus haute (A à D) les recouvre, c'est lui qui est dessiné, pas la voie ; un espace de classe F ne recouvre rien. Les espaces de classe E, F et G sont dessinés en fond léger et nommés en dernier, pour ne pas cacher le reste.

**Les espaces selon le zoom et la complexité.** L'affichage ne dépend que du zoom et du cran de complexité : les grandes familles (FIR et UIR, TMA et CTA, CTR) se lisent sur toute la vue ; R, D, P, TSA et les autres, dans le couloir du vol tant que « Autour du vol seulement » est cochée (les notes le disent, et comment en voir plus) ; chaque famille apparaît à son seuil de zoom, qu'un cran de complexité décale d'un niveau. La taille de la feuille ne change rien. Les FIR n'existent dans les bases publiées que pour la France.

**La fiche d'un espace.** Touchez un espace — son bloc dans le profil, ou sa ligne dans la liste des espaces d'un point de la carte (pas de survol : un doigt n'en a pas, et des conditions tiennent sur plusieurs lignes) — et sa fiche s'ouvre : nom et type (un P dit « interdit »), limites, activation publiée (AZBA, NOTAM), horaires et conditions de l'AIP quand la base les porte, organisme et fréquence, source et date. Une ligne franche reste pour les zones R, D, TSA et TRA : « activité réelle non connue : horaires publiés seulement (ni NOTAM ni AZBA lus) ». Sept lignes, puis « n autres ». La base actuelle du SIA ne porte pas encore les horaires ni les remarques : la fiche le dit. Dans le profil, un premier appui sur un bloc le choisit (il est surligné, son nom et ses limites s'affichent sur le profil avec un bouton « Fiche ») ; un second appui sur ce bloc, ou le bouton, ouvre la fiche ; un appui ailleurs ne choisit rien : le profil n'est jamais remplacé sans geste explicite. La fiche garde la pile des espaces du point : des blocs plancher → plafond sur l'échelle des niveaux, cadrée sur leurs limites (jamais vide), le choisi surligné ; un appui sur un bloc change la fiche. Elle est à côté de la pile en vue large, dessous au téléphone, où la pile reste en haut pendant que la fiche défile.

<a id="maps-profile-zoom"></a>**Zoomer le profil.** Pour lire le profil avec précision, resserrez-le sur une partie du vol : pincez-le à deux doigts (le milieu des doigts reste en place) et glissez à deux doigts pour déplacer la fenêtre ; un seul doigt reste le curseur de lecture. L'échelle des altitudes se recale sur ce que la fenêtre montre (c'est là que vient la précision), les repères de distance (NM) se resserrent avec elle, et les points hors fenêtre ne sont pas posés. Un double toucher revient au vol entier, tout comme le bouton « Vol entier », qui apparaît dans la ligne du haut tant que le profil est zoomé. Sur un écran : la molette zoome autour du pointeur (avec Ctrl, toujours ; sans Ctrl, sauf si le profil défile avec la page ; le panneau latéral de Carburant reste en place, la molette y zoome aussi), la molette horizontale déplace la fenêtre resserrée, un glisser aussi (vol entier : le glisser est le curseur de lecture), Maj + glisser trace un rectangle sur les distances et le zoome, un double clic revient au vol entier. Le zoom se garde tant que la page reste ouverte et que la route ne change pas ; il n'est jamais enregistré. La coupe météo se zoome de la même façon (mêmes gestes, même bouton « Vol entier ») et la fenêtre est la même pour les deux : zoomez sur l'un, passez à l'autre avec la puce, vous retrouvez la même portion du vol ; la coupe recale aussi son échelle de hauteur sur ce qu'elle montre.

**Un écran fixe.** Rien entre l'en-tête et la carte : la carte et le bloc de données remplissent l'écran, et rien ne défile que le contenu du bloc. Les boutons sont posés sur la carte : à droite, de haut en bas, « Modifier la route » (le crayon), « Recentrer », le mode de carte, « Modifier sur la carte » (les quatre flèches) et, en dernier, le plein écran (Échap en sort). « Couches » est sur la ligne de la feuille, à gauche de sa poignée, à côté de ce qu'il ouvre ; sans rien à dessiner, la feuille se réduit à cette ligne. Le bloc est une feuille : tirez sa ligne du haut (la petite barre ; à sa hauteur normale la ligne ne porte pas de titre au-dessus d'un profil ou d'une coupe, seulement les trois pastilles) vers le haut pour
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
carte suit, et votre choix est gardé pour ce réglage sur cet appareil. « Tout remettre » revient au choix d'origine. En
tête, « Autour du vol seulement (plus rapide) », cochée d'origine en IFR, limite les espaces et les voies au voisinage
du vol : le titre du volet finit alors par « autour du vol », et la puce « i » dit que rien n'est lu hors du couloir ;
décochée (« sinon toute la vue »), toute la vue est lue, à la même densité partout, filtrée par la seule complexité —
sauf une vue de plus de 3 000 NM de large, lue autour du vol quand même (la case le dit, avec sa raison). Décocher la case baisse d'un coup la Complexité si la vue est large (une ligne le dit) ; vous la remontez si vous voulez, et recocher rend celle d'avant. Vue de près, tout est
dessiné de toute façon.
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
14:32Z ») et où vous êtes (avion plein, orienté à votre route, avec la trace volée en pointillé, depuis le départ, gardée au changement d’onglet). Dans les notes du bloc de données, sous le profil, une ligne dit l'écart : en avance ou en retard (minutes et NM), à combien de NM de la route, et
votre altitude contre celle prévue ; le profil montre les deux altitudes. De près, chaque point porte son heure
estimée (ETA) sous son nom, sans jamais couvrir un terrain, en UTC (« 14:52Z »), l'heure locale entre parenthèses au départ et à l'arrivée. « Suivre » garde la carte sur votre position ; un déplacement de la carte l'arrête. Sans position (GPS
ou réseau non activés), une notification le dit une fois, la ligne reste dans les notes avec un bouton « Activer la position » ; une position de plus de 2 minutes est grisée.
La ligne finit par la source de la position : GPS, réseau, IVAO, VATSIM, X-Plane ou Little Navmap. Les heures estimées sont aussi montrées pour un vol daté dans Carburant, avant son départ. Vol arrivé : la note « Arrivé » remplace la ligne et « Suivre » disparaît ; un déroutement est dit dans les notes.

**Les vents en altitude.** Quand Carburant a la prévision du vent au niveau du vol, la carte la montre en barbules
le long de la route : à chaque point, et tous les 50 NM entre deux points. La hampe pointe d'où vient le vent ; un
fanion vaut 50 kt, une barbe 10 kt, une demi-barbe 5 kt. Touchez une barbule (ou passez dessus à la souris) : la bulle
donne la direction, la force, la température, le niveau et l'heure de la prévision. La couche « Vents en altitude »
les cache.
Les barbules sont lues dans la même prévision que la coupe météo (rien de plus n'est demandé) : si la coupe a du vent, la carte en a. Là où le modèle choisi ne couvre pas la route (le milieu de la route le choisit), il n'y a pas de flèche : la bulle dit « Pas de vent ici (hors ARPEGE) » ; jamais la même flèche répétée. Le geste « Météo de la route » lit alors le modèle qui couvre (GFS) pour ces trous, et chaque barbule dit son modèle dans la bulle. Sur une vue de plus de 3 000 NM de large (une route vers un autre continent), les barbules sont masquées et les notes le disent : zoomez pour les voir.

**Les paliers.** Si la route fixe un niveau à certains points dans Carburant, le profil dessine les paliers : montée,
palier, nouvelle montée ou descente, avec la fin de montée et le début de descente recalculés. Les points tournants
de la route sont aussi repérés sur le profil.

**Montée et descente.** Les losanges violets marquent la fin de la montée (TOC) et le début de la descente (TOD),
sur la carte comme sur le profil. Ils viennent du calcul de Carburant ; sans lui, la carte les estime avec des taux
de montée et de descente courants. Quand la place manque, la carte écrit d'abord le nom du terrain, puis les numéros de
piste, les balises, les procédures, la route (noms, heures, TOC / TOD), enfin le reste ; une heure estimée ou le nom
de TOC / TOD glisse le long de la route avant de se taire (le losange reste).

**Un vol qui nomme une mission.** La carte reste celle du vol, avec tout ce qu'elle sait faire (météo, procédures, édition de la route, cases des Couches, itinéraires proposés) ; la mission est dessinée par-dessus : ses zones, ses points à rôle (départ, arrivée, cible…) et, en haut à gauche, une fenêtre qui donne son titre, son identifiant, sa famille et deux listes : « Carte fournie » (« Vol » d'abord, puis les cartes de la mission : en choisir une la montre sur place, Carburant reste à côté, « Vol » revient au vol) et « Vue ».

**Les cartes de mission.** Une mission s'ouvre depuis Missions (« Voir sur la Carte »), ou depuis la fenêtre d'un vol qui la nomme ; une fenêtre en haut à gauche de la carte est le seul endroit où choisir la mission, sa carte fournie (vue d'ensemble, cible, détail…) et sa vue ; l'onglet Couches ne règle que ce qui s'affiche.
Chaque carte est redessinée comme dans le studio : même cadre, même réglage d'affichage, avec les points de la
mission, ses zones hachurées et son cheminement. Le profil vertical montre alors celui de la mission.
Une carte fournie (choisie dans la fenêtre d'un vol, ou « Voir sur la Carte » depuis Missions) donne : un bandeau en haut donne son titre, son identifiant, sa famille, la carte fournie montrée et, s'il y en a plusieurs, leur choix (sept au plus). Les zones sont un aplat léger avec leur nom, les points portent leur rôle (départ, arrivée, cible…), et la légende (« i ») les nomme. La croix du bandeau le retire : on revient au vol et à toutes ses couches ; choisir une autre mission se fait dans la liste des couches. La carte s'ouvre dans la vue de son usage : le profil que porte le YAML de la carte l'emporte ; sinon les cartes cible, détail, rendez-vous et zone d'une mission opérationnelle (SAR, MEDEVAC, FIRE, LE, ISR, COMBAT, MARITIME, AAR, AIRLIFT, COMMAND : tout sauf le commercial) s'ouvrent en VFR topo (relief, obstacles, VRP, terrains VFR, espaces bas), la carte générale et une mission commerciale gardent la vue du vol. Le bandeau offre « Vue » : VFR topo, IFR ou Fond seul ; le choix est retenu pour cette carte sur l'appareil, et retirer le bandeau rend la vue du vol.

<a id="maps-edit"></a>**Modifier la route sur la carte.** Touchez « Modifier sur la carte » (les quatre flèches, à droite de la carte ; un pli « Comment faire », en haut à gauche de la carte, donne l'aide du mode) : les points tournants
s'entourent d'un cercle. Faites glisser un point jusqu'à un fixe, une balise ou un terrain : il s'y pose (lâché
ailleurs, il devient un point libre, nommé par ses coordonnées, comme 4530N00030E). Pour ajouter un point, touchez « + » (dans la même colonne), puis touchez
l'endroit voulu (ou restez appuyé une demi-seconde) : sur un fixe, une balise ou un terrain il s'y pose, ailleurs c'est
un point libre ; il s'ajoute au tronçon le plus proche. Un simple toucher n'ajoute rien : il montre l'infobulle. Touchez un point de la route : sa carte donne son niveau et propose « Retirer ». Un point que la mission impose (rendez-vous, cible, source ; carré plein, « imposé par la mission » sur sa carte) ne se déplace ni ne se retire : le pilote garde ses autres points. Le départ et l'arrivée ne
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

<!-- chapter: atmosphere -->
# Météo

L'atmosphère le long du vol préparé dans Carburant : une carte météo au niveau choisi, la coupe verticale de la route,
la tranche d'un point, à l'heure du départ ou plus tard.

## Comment s'en servir

<a id="atmosphere-flight"></a>**Le vol.** Météo montre toujours le vol préparé dans Carburant (route, niveau, date du vol). Sans vol prévu, la page le
dit et mène à Carburant ; « Voir l'exemple » montre un vol de démonstration, marqué comme tel dans la poignée.

<a id="atmosphere-load"></a>**Charger la prévision.** Le bouton de chargement (la flèche vers le bas, à droite de la carte) lit la prévision le long
de la route et autour d'elle. Rien n'est demandé à l'ouverture : la page montre ce que l'appareil a déjà gardé, et le bouton dit d'avance ce que
coûterait le chargement (« Charger (≈ 120 appels) », ou « déjà sur l'appareil »). Hors de la
zone du vol, la carte montre le synoptique mondial publié avec l'application, sans rien demander.

<a id="atmosphere-map"></a>**La carte météo.** Isobares, isothermes, nuages, vent, courant-jet et convection, au niveau choisi par la pastille du
niveau (« Sol », le niveau demandé, la trajectoire calculée ou une altitude fixe). La puce Couches, à gauche de la poignée de la
feuille, ouvre un volet posé sur la carte, juste au-dessus de la feuille : il choisit ce qui est dessiné sur la carte et dans le profil, et la coupe reste visible en
bas, redessinée à chaque case ; la croix ou Échap le ferme. Touchez un point de la carte pour ouvrir sa tranche.

<a id="atmosphere-zones"></a>**La zone du vol et le monde.** Un trait fin entoure la zone du vol : dedans, la prévision fine chargée pour le vol
(Météo-France AROME 1,3 km et ARPEGE 0,1° sur la France, ICON en Europe) ; dehors, le synoptique mondial (GFS de la
NOAA, publié avec une maille de 5°). Les deux modèles ne disent pas tout à fait la même chose : un saut des lignes au
passage du trait est normal. Le panneau des couches nomme les deux modèles et leur maille. Sans synoptique monde, ou avec un synoptique de plus de 12 h, la première ligne du volet du bas le dit et propose « Construire (2 min) » : le lanceur de ce poste le calcule (GFS de la NOAA, sans clé) et la couche arrive sur la carte ; sans lanceur, la ligne dit où le faire.

<a id="atmosphere-date"></a>**La date du vol.** Le curseur sous la poignée avance l'heure de 0 à 72 heures à partir du départ prévu : la carte, la
coupe et les tranches suivent. Quand une partie du curseur sort de la prévision lue (un départ prévu déjà passé, des
jours pas encore chargés), une bande sous le curseur montre les heures couvertes ; ailleurs, l'heure la plus proche est
montrée, ⚠ le dit sur la ligne du curseur et dans la poignée, et une alerte s'affiche.

<a id="atmosphere-cut"></a>**La coupe et les tranches.** Sous la carte, la coupe montre la route de bout en bout, du sol au-dessus du niveau du vol.
Touchez-la pour ouvrir la tranche du point le plus proche (le profil vertical de l'atmosphère à cet endroit) ; ◀ et ▶
passent à la tranche voisine, ✕ revient à la coupe. Le dessin tient toujours dans le bloc, son axe des distances visible ;
agrandissez le bloc pour plus de détails.

<a id="atmosphere-zoom"></a>**Zoomer la coupe.** Pincez la coupe à deux doigts (ou Ctrl + molette) pour n'en montrer qu'une partie, et faites-la
glisser à deux doigts ; les distances, les points, les vents et l'échelle des hauteurs suivent la partie montrée. Un doigt
seul garde son rôle (ouvrir une tranche, déplacer le bloc). « Vol entier », dans la ligne de la poignée, un double toucher
ou un double clic reviennent à la route entière ; un changement de route y revient aussi.

<a id="atmosphere-details"></a>**Les détails.** Le bouton de la liste, à droite de la carte, montre dans le bloc le résumé du vol
(distance, profil, montée, vent moyen et écart à l'atmosphère type en croisière, isotherme 0 °C), les terrains (METAR et
TAF) et le tableau le long de la trajectoire calculée ; touchez une ligne du tableau pour ouvrir la tranche de ce lieu.

<a id="atmosphere-settings"></a>**Vol et réglages.** Le bouton de l'avion, à droite de la carte, ouvre le vol montré : sa
source (le vol courant de Carburant, l'exemple, un fichier `current_flight.json` ou une route écrite), le départ (UTC), le
niveau demandé, la vitesse de croisière, les données (prévision Open-Meteo ou démonstration hors ligne) et la grille de la
carte. Un second toucher sur le bouton revient à la coupe.

<a id="atmosphere-legend"></a>**La légende.** La pastille « i », dans la ligne de la poignée à droite (après ◀ et ▶), montre la légende de ce qui est
dessiné ; un toucher sur la légende, la pastille ou Échap la ferme.

- Coupe : trajectoire calculée (trait plein : montée, croisière, descente), niveau planifié (tirets), niveau demandé
  (pointillés), fin de montée et début de descente (TOC, TOD), nuages (gris, plus sombre : plus couvert), isothermes
  tous les 5 °C (0 °C en bleu épais), inversions et givrage (hachures), vent (barbules : demi 5 kt, plume 10, fanion
  50), base des cumulus estimée (pointillés gris), relief, points de la route (traits verticaux) ; sur un bloc haut, les
  bandes du bas : nébulosité basse, moyenne, haute, précipitations, visibilité inférieure à 8 km.
- Tranche : température (rouge), point de rosée (vert), atmosphère type (tirets), les trois niveaux du vol à cet
  endroit, inversions, nuages (colonne à droite), vent, relief.

## Bon à savoir

- La prévision vient d'Open-Meteo (Météo-France AROME et ARPEGE sur la France, ICON en Europe, GFS ailleurs) ; le
  synoptique mondial vient de GFS (NOAA), toutes les 3 heures jusqu'à 72 heures.
- Ce qui est chargé reste sur l'appareil et sert hors ligne, dans la réserve météo partagée par Carburant, la Carte et
  Météo ; la Carte en reprend la coupe météo. Les appels du jour à Open-Meteo sont comptés dans le bloc d'état des
  Réglages.

<!-- chapter: report -->
# Compte rendu

Écrire le compte rendu d'un vol en quelques touchers, avec ou sans mission : le module reprend ce qu'il sait déjà
de votre vol, vous complétez, vous enregistrez — et, si vous le voulez, le vol s'inscrit sur le site de la compagnie
dans le même geste.

## Comment s'en servir

<a id="report-steps"></a>**Trois pas.** Sous le titre, « Compte rendu pour … » dit la compagnie et son genre ; tant que le compte rendu n'est pas enregistré, « Changer » à côté propose les compagnies et « Personnel » : le choix se fait sur place, le brouillon reste tel quel ; une fois enregistré il garde la sienne, et l'en-tête dit « AAA ≠ BBB » quand la compagnie courante n'est pas la sienne. Le compte rendu se remplit en trois pas : Vol, Mission, Résultat. Sur un téléphone, un pas à la fois
(« Suivant » en bas) ; sur un ordinateur, les trois côte à côte. Rien n'est obligatoire : ce qui manque est dit au
dernier pas, sans jamais bloquer l'enregistrement.

<a id="report-step-1"></a>**Le dernier vol.** Si votre identifiant IVAO (ou VATSIM) est réglé (⚙) et que l'appareil est en ligne, une carte
propose votre dernier vol sur le réseau : « Utiliser » remplit l'avion, l'indicatif, le trajet et les heures tirées
de la trace. Le vol préparé dans Carburant ou Carte est proposé de la même façon (« Vol en cours ») ; s'il a été
démarré dans Carburant (« Démarrer le vol »), il vient en premier, « Vol démarré à hh:mm ». La carte dit en une ligne
tout ce qui sera repris, même ce qu'un type de mission n'a pas de case pour montrer (distance, niveau). « Utiliser »
remplit aussi l'heure de mise en route (l'heure du départ dans Carburant) et le carburant au départ (le carburant
bloc du devis), le tout rappelé dans la ligne « Prérempli depuis : … » sous le titre de la carte. Enregistrer le compte rendu termine le vol démarré : Carburant revient en
préparation, Mes vols retire « en cours », et le vol n'est plus proposé.

**Le vol d'une autre compagnie.** Un vol préparé pour une compagnie et repris quand l'appareil est passé sur une autre garde la sienne : l'en-tête la dit, la liste des familles est la sienne, et le compte rendu est enregistré pour elle. Sa famille et sa série viennent de l'étape Vol de Carburant (remplies par la mission) ; si elles ont été oubliées au départ, choisissez-les ici : le compte rendu a le dernier mot.

**Les autres sources.** Dépliez « Autres sources » pour reprendre votre dernier vol IVAO ou VATSIM, votre plan de vol
SimBrief, ou un texte collé : un plan de vol OACI, la page d'un vol du tracker IVAO ou de StatSim, un METAR. Seuls les
champs vides sont remplis ; la ligne « Prérempli depuis : … » sous le titre de la carte dit d'où ils viennent. Si une source donne autre chose pour des champs déjà saisis,
un bouton propose de les remplacer.

<a id="report-step-2"></a>**La mission.** Au deuxième pas : la famille, dite par son sigle puis son nom (« SAR · Récupération de personnel », proposée d'après votre dernier compte rendu), la série, l'identifiant de
la mission si le vol en suit une, puis les blocs propres à la famille. Certains blocs n'apparaissent que pour une
série (par exemple VIP ou convoyage pour les missions spéciales). Tant que vous n'avez pas ouvert ce pas, il est
marqué « à voir » au lieu du ✓ : la famille et la série d'un compte rendu neuf sont reprises par défaut. La série par défaut est la première de la famille, sauf pour Commercial : « Passagers ». Une famille ajoutée par la compagnie numérote ses comptes rendus avec la lettre qu'elle a reçue dans Réglages.

<a id="report-step-3"></a>**Le résultat.** Au dernier pas : le résultat, vos observations, l'équipage (vous d'abord, comme commandant de bord) et
le carburant au départ et à l'atterrissage. Les incohérences — heures dans le désordre, date future, carburant qui
augmente — sont signalées.

<a id="report-load"></a>**Charge.** « Utiliser » reprend la famille et la série du vol ; vous pouvez les changer, le compte rendu a le dernier mot. Une série qui transporte (Fret, Passagers, VIP) ajoute, au dernier pas, la carte « Charge » avec un seul champ : le fret embarqué en kg, ou le nombre de passagers. Une autre série n'ajoute rien.

<a id="report-measures"></a>**Mesures.** À la fin du dernier pas, « Mesures » lit les journaux du Fuel Phase Monitor (« Choisir des journaux », ou « Depuis le dossier Output » sur le poste) et propose le vol parti du terrain de départ et arrivé au terrain d'arrivée de ce compte rendu, à ses heures UTC à une heure près — jamais d'après l'immatriculation, celle d'une livrée X-Plane n'étant pas la vôtre ; plusieurs vols conviennent : ils sont listés, vous choisissez ; « Garder ce vol » met son carburant consommé, sa durée et ses phases dans le compte rendu, enregistrés avec lui. Rien d'autre du journal n'est gardé.

<a id="report-save"></a>**Enregistrer.** Le bouton en bas enregistre le compte rendu et lui donne son numéro au premier enregistrement. Tant
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
  saisie dans la ligne sous le titre de la carte (« Décollage saisi 18:30 locale ») ; il n'est réécrit en UTC que si vous l'enregistrez.
- **SimBrief** : votre dernier plan (identifiant réglé dans ⚙) — aéronef, route, niveau, vitesse, carburant prévu,
  METAR et TAF.
- **Depuis Mes vols** : « Écrire le CR » d'un vol ouvre un compte rendu neuf, déjà rempli avec ce vol et sa date ;
  « Ouvrir le CR » rouvre celui qui existe.

## Les numéros de compte rendu

Avec un identifiant de mission, le numéro suit la mission et compte les essais (CRM-016-1, CRM-016-2…). Sans mission,
chaque famille a sa suite (CRM-A01-0, CRM-A02-0… pour HEMS). Les numéros déjà pris, y compris par les comptes rendus
de la suite complète, ne sont jamais réutilisés.

## Le favori « → Vol »

Dépliez « Sur le site de la compagnie » au dernier pas et glissez le lien « → Vol » dans la barre des favoris de
votre navigateur. Il ne sert que sur le site : sur la liste des aéronefs, il ouvre celui de votre vol ; sur sa page,
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

<a id="flightlog-totals"></a>**Les totaux.** En haut, trois cases : le nombre de vols, les heures de bloc et les vols qui n'ont pas encore de
compte rendu, pour la période choisie. Juste dessous, les trois types d'aéronefs que vous avez le plus volés.

<a id="flightlog-filters"></a>**Les filtres.** Choisissez la période (7 jours, 31 jours, un an, tout), cherchez un indicatif, un type, une
immatriculation, un terrain, une mission ou un numéro de compte rendu, ou cochez « Sans CR » pour ne voir que les vols
qui en attendent un. Vos choix restent sur l'appareil : à la visite suivante, une puce les rappelle (« 1 an · LFRS ✕ »)
et les retire d'un appui. Un « — » à la place du bloc : compte rendu sans heures.

<a id="flightlog-list"></a>**La liste.** Une ligne par vol : la date, l'indicatif, la route et le temps de bloc ; quand vous volez pour plus d'une compagnie, la compagnie de chaque compte rendu. Un point orange marque un vol
sans compte rendu. Sur un ordinateur, la ligne montre aussi l'aéronef et le numéro du compte rendu.

<a id="flightlog-detail"></a>**Le détail d'un vol.** Touchez une ligne pour la déplier : d'où vient le vol (compte rendu, journal du site, réseau
IVAO ou VATSIM), son heure, l'aéronef, la mission et les remarques.

<a id="flightlog-report"></a>**Écrire ou ouvrir le compte rendu.** Sur un vol qui n'en a pas, « Écrire le CR » ouvre un compte rendu neuf, déjà
rempli avec ce vol — date, aéronef, indicatif, terrains — et une famille de mission proposée. Sur un vol qui en a un,
« Ouvrir le CR » le rouvre pour le modifier.

<a id="flightlog-current"></a>**Le vol en cours.** Un vol démarré dans Carburant (« Démarrer le vol ») et pas encore rapporté apparaît en tête, « En
cours — démarré à hh:mm » (déroutement signalé), avant même que le journal du site ne le connaisse. « Écrire le CR »
ouvre le compte rendu, qui propose ce vol en premier ; une fois le compte rendu enregistré, la ligne disparaît.

<a id="flightlog-more"></a>**Plus.** Dépliez « Plus » pour exporter la liste filtrée en CSV (tableur) ou relire vos connexions IVAO et VATSIM.

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

**L'état.** L'écran s'ouvre sur le bloc « État », avec la même pastille que le bouton ⚙ de l'en-tête (verte : une nouvelle ;
orange : de l'attention). Une ligne par chose, touchez-la pour agir : le vol en cours (vers la Carte), les comptes rendus à
écrire (vers le compte rendu prérempli), le trigramme manquant (vers « Identité »), la base aéronautique tant qu'elle n'est
pas prête (vers « Accès aux données »), l'état des données et le moyen d'échange (vers « Synchronisation », ou les conflits),
le lanceur, « Hors ligne » et, sur un téléphone, la position pendant un vol.

**Les groupes.** Au niveau Découverte, l'écran montre sept cartes au plus, l'une sous l'autre : Identité, Accès aux
données, Synchronisation (quand elle sert), Usages, Niveau, Design et À propos. La sauvegarde, les données hors ligne, la
clé météo, les fiches Little Navmap et l'accès du poste arrivent au niveau Courant. Aux niveaux Courant et Complet, les
cartes sont rangées sous sept titres, dans l'ordre où l'on règle les choses : Identité, Accès, Données, Appareil,
Affichage, Administration (niveau Complet) et Aide. Chaque titre est replié ; touchez-le pour l'ouvrir. Un groupe qui
demande de l'attention (un avertissement, une erreur, ou la carte visée par une ligne orange de l'état) s'ouvre seul,
avec une pastille orange ; une ligne du bloc « État » ouvre le groupe de sa carte. Un groupe ouvert à la main le reste
tant que la page est ouverte. Les cartes de circonstance (réglages de la V2 trouvés, configuration reçue, reprise de
l'adhésion) viennent en tête, à tous les niveaux, et disparaissent une fois traitées. Une carte ouverte par son adresse
(le bouton « Données hors ligne » de l'assistant « Rejoindre la compagnie », par exemple) s'affiche seule, quel que soit
le niveau ; « ← Réglages » ramène à la liste.

**Votre identité.** Dans « Identité », tapez votre trigramme et vos identifiants VID IVAO, CID VATSIM et SimBrief, puis
« Enregistrer ». Les outils s'en servent pour préremplir ; à plusieurs, le trigramme est nécessaire.

**Le niveau.** « Niveau » choisit ce que le menu montre : Découverte, Courant ou Complet, d'un toucher. Sous chaque
choix, la ligne « Menu : » dit quels outils il montre ; un outil caché reste joignable par son adresse.

**Le design.** « Design » montre une vignette par habillage — Standard, Cabinet, Durci — et le ton : Automatique
(comme le système), Jour ou Nuit. Un toucher l'applique aussitôt, sur cet appareil seulement. Un design réservé à
l'ordinateur ne s'applique pas sur un téléphone : la carte dit lequel est montré à la place, et sa vignette est marquée ;
toucher une vignette remplace ce choix.

**Les usages.** La phrase en tête de « Usages » dit comment les données sont échangées. Sans case cochée, vous êtes
« Seul sur cet appareil » : rien ne part ailleurs. Cochez « Seul, sur plusieurs appareils » ou « À plusieurs (dépôt git
des données) » pour échanger. Sur un poste servi par le lanceur, l'appli lit et écrit déjà le dossier `data/`
du lanceur, même sans case cochée ; un usage d'échange le partage en plus par git.

**L'accès aux données.** Sur un téléphone ou sur le site, réglez dans « Accès aux données » le dépôt (compte/dépôt), la
branche et votre jeton personnel, puis « Tester » et « Enregistrer ». Sur un poste servi par le lanceur, pas de jeton ;
tant que `data/` n'est pas un dépôt git, la carte ouvre la porte pour le récupérer ou le reprendre ; son dépôt distant se
règle dans la carte « Administration » (voir « Un dépôt git pour data/ »). Sur le poste du lanceur, la carte « Accès aux données » commence par une ligne « Dépôt des données : » qui donne l'adresse et la branche du dépôt distant : l'écran ne l'attend pas (le lanceur peut mettre plusieurs secondes à la lire), la ligne affiche « … » puis sa valeur, sans bouger ; ce qui dépend du dépôt (le volet « Dépôt distant » de l'Administration, par exemple) apparaît à son arrivée.

**Sans accès ni lanceur, pas de bases.** Un appareil sans accès réglé et sans lanceur — le site ouvert sur un téléphone
pour la première fois, par exemple — n'a ni base aéronautique (espaces, terrains, balises) ni base des appareils :
« Données hors ligne » le dit. Deux portes : réglez l'accès au dépôt des données, même sans cocher d'échange (il sert
alors seulement à lire les bases) ; ou, sur un poste avec lanceur, publiez les bases dans le dépôt (V2 : Paramètres ›
Maintenance › Données aéronautiques et Types d'aéronefs), puis synchronisez. Trois états distincts quand la base manque : « Base aéronautique en cours de chargement… » (la lecture n'est pas finie : patientez), « Accès aux données non réglé sur cet appareil » (réglez l'accès ci-dessus ; une appli ajoutée à l'écran d'accueil a son propre stockage, rien de ce que vous aviez réglé dans Safari n'y est) et « Base aéronautique non publiée » (l'accès marche, rien n'est publié dans le dépôt).

**La synchronisation.** La carte « Synchronisation » est la synthèse de ce qui n'est pas encore parti : en tête, un compte par sorte (fiches d'appareils, missions, vols, flotte ; « Autres » seulement
s'il y en a), puis la dernière réussie, le réseau et la dernière erreur. Une liste repliée par sorte donne ce qui attend : le titre lisible (par exemple « Fiche A320 Navy », « Vol LFPO → LFBO du 3/11 »),
la date, ✕ pour une suppression et, s'il y en a une, l'erreur qui retient la file ; sept éléments visibles au plus, « … et n de plus » pour le reste. Avec le lanceur du poste, « modifié ici » (pas encore
enregistré dans les données) et « à envoyer » (enregistré, pas encore parti) s'y ajoutent. « Tout envoyer » envoie et reçoit tout de suite ; sinon la synchronisation se fait seule au démarrage, toutes les
10 minutes en ligne et au retour du réseau. La carte se montre dès qu'un échange est coché ou que quelque chose attend. Dessous, une ligne dit ce qui vient de partir (« Parti à 18:04 : Fiches d’aéronefs : 2 · Missions : 1 », avec « dont 1 refusé(s) » s’il y en a) ; dépliée, elle donne les fichiers un à un par leur titre lisible, les refus d’abord avec la raison que le transport a donnée, sept au plus. C’est la dernière synchronisation qui a envoyé quelque chose : un passage à vide la laisse telle quelle, et rien n’est dit avant le premier envoi. Sur un poste avec lanceur, deux lignes disent **combien de temps a pris la synchronisation** : la dernière et **la plus longue d’aujourd’hui** (gardée sur cet appareil), en secondes, étape par étape (mise au net, commit, réception, envoi…), avec le nombre de commandes git et ce qui est parti (« 8 s — commit 1 s · réception 2 s · envoi 4 s · 12 commandes git (1 s) · 38 Ko envoyés ») ; un passage plus court ne remplace pas la plus longue, un autre jour l’efface.

**La sauvegarde.** Seul sur cet appareil, « Exporter (un fichier) » garde toutes vos données dans un fichier : c'est la
seule copie. « Importer (fusion)… » la reprend sans rien perdre d'ici ; « Remplacer par un fichier… » efface d'abord ce
qui est sur l'appareil.

**Les données hors ligne.** Chaque zone publiée a sa ligne : son état sur cet appareil, son cycle et sa taille.
« Garder hors ligne » la télécharge entière (de préférence en Wi-Fi) ; « Libérer » rend la place.

## La clé météo

Le METAR marche sans clé. Le TAF, sur un appareil sans lanceur (téléphone, site), demande une clé personnelle et
gratuite d'avwx.rest : « Créer une clé sur avwx.rest ↗ » ouvre la page du fournisseur. Collez-la dans « Clé météo (TAF,
avwx.rest) », puis « Enregistrer » ; « Tester » demande le TAF d'un terrain, « Effacer » la retire. La clé reste sur cet
appareil seulement (rangée avec votre identité : elle survit à la fermeture du navigateur), jamais dans le dépôt ni dans
une sauvegarde, et n'est jamais réaffichée. Sur un poste servi par le
lanceur, elle est inutile : le lanceur fournit le TAF.

## Les fiches Little Navmap

Sur un poste servi par le lanceur, la carte « Fiches Little Navmap (.lnmperf) » exporte vos fiches de performances
vers les fichiers .lnmperf d'un dossier. La fiche JSON est la seule source : choisissez le dossier (celui de Little
Navmap est proposé quand il est trouvé), « Enregistrer », puis « Exporter les fiches » quand vous le voulez ; rien ne se
fait en arrière-plan. Une fiche sans fichier en reçoit un, une fiche changée réécrit le sien ; un fichier changé dans
Little Navmap, ou venu de Little Navmap seul, n'est jamais repris en silence ni écrasé : la carte le liste, et il
s'importe par Appareils › « Importer un fichier », qui montre la fiche avant de l'écrire. Un fichier n'est jamais
effacé : celui d'une fiche retirée est rangé dans le sous-dossier `_removed`. « Arrêter » coupe le lien. Les fiches à
qui il manque une valeur demandée par Little Navmap sont listées et ne sont pas écrites. Sur un téléphone, Carburant
télécharge la fiche en .lnmperf.

## Les clés d'API de la compagnie

Sur un poste servi par le lanceur, au niveau Complet, le bouton « Clés d'API de la compagnie (IVAO, EAD Basic) » de la carte
« Administration » déplie le réglage de la clé de l'API IVAO : elle reste dans le dossier `secrets/` du lanceur, jamais
dans le navigateur ni dans les données. « Tester » vérifie qu'IVAO répond ; « Effacer » la retire.

Sous la clé IVAO, le bloc « EAD Basic (EUROCONTROL) » reçoit l'identifiant et le mot de passe de votre compte EAD Basic : vous les donnez une seule fois au lanceur de cet ordinateur (dossier `secrets/`), qui les garde ; la page ne les réaffiche jamais, elle dit seulement s'ils sont enregistrés et quand. Ils servent à « Lire un terrain depuis EAD » (un terrain par geste). EAD Basic est un outil de démonstration, aux données non opérationnelles, à n'utiliser qu'en simulation (l'avertissement reste affiché). « Effacer » les retire du lanceur.

<a id="settings-ivao-app"></a>Sous le bloc EAD Basic, un lien mène à l'assistant « Application IVAO (connexion des pilotes) » (carte du même nom, groupe « Administration », ou `#settings?card=ivaoapp`). C'est lui qui permet aux pilotes de se connecter à IVAO par le relais de la compagnie ou par ce poste : il vous guide chez IVAO (`https://developers.ivao.aero/create` : Name = le nom de la compagnie, App Type = Third Party, Active = Enabled), liste les adresses de retour à déclarer par « + Add Redirect URL » (celle de ce poste, et celle du relais si son adresse publique est réglée ; « Copier » les donne telles quelles), puis reçoit le Client ID et le Client Secret qu'IVAO affiche. Le lanceur les écrit dans `secrets/ivao_oauth.json` : vous n'éditez aucun fichier, et la page ne les réaffiche jamais (elle dit seulement si l'application est enregistrée, et quand). « Tester » joint le document de découverte OpenID d'IVAO ; « Effacer » retire l'application. La clé API de l'application (`secrets/ivao.json`) est un autre réglage : celle d'une nouvelle application se reporte dans « Clé IVAO ».

## La tablette à côté du simulateur

Vous volez sur le poste (X-Plane) et voulez la carte sur une tablette ou un téléphone : sur le poste servi par le
lanceur, « Accès du poste » ouvre l'appli Pilote aux appareils du même réseau local (ou lancez `lancer.cmd --lan`).

1. **Ouvrir aux appareils du réseau local** : la carte montre l'adresse à ouvrir sur l'appareil, son code QR et un
   code d'appairage à 8 chiffres (6 jusqu'au 30 octobre 2026). Windows peut demander d'autoriser Python : acceptez pour les réseaux privés
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
  « Oublier », à côté d'un appareil (avec sa date d'appairage, en UTC), retire celui-là seulement.
- Seule l'adresse principale du poste est ouverte ; les autres (VPN, machines virtuelles) seulement par « Les ouvrir
  aussi ». Une adresse qui ne peut pas s'ouvrir est nommée dans la carte ; la fenêtre du lanceur dit pourquoi.

## Un dépôt git pour data/

**GitHub ou GitLab ?** Ce n'est pas un réglage : le fournisseur est lu de l'adresse du dépôt distant et s'affiche en tête de « Administration › Dépôt distant de data/ » ; la carte « Accès aux données » y mène.

Sur un poste servi par le lanceur, au niveau Complet, le bouton « Dépôt distant de data/ » de la carte
« Administration » montre le dépôt distant de `data/` : son adresse et sa branche. Pour le régler ou en changer, tapez l'adresse (`git@hôte:compte/dépôt.git` ou `https://…`, sans mot de passe
ni jeton dedans) : « Vérifier » dit si le dépôt répond, « Enregistrer » le règle. Vers une autre adresse que celle de la configuration, une fenêtre Oui / Non s'ouvre sur l'ordinateur, pas dans la page : la carte le dit avant le clic ; répondez-lui (elle peut être derrière les autres fenêtres), puis revenez. Refusée, fermée ou déjà ouverte : la carte en donne la raison et `data/` reste tel quel. C'est voulu : une page piégée ne doit pas pouvoir envoyer vos données ailleurs. Rien ne bloque : un dépôt qui ne répond pas est
seulement signalé.

- **L'accès au dépôt** se règle sur l'ordinateur : clé SSH pour une adresse `git@…`, identifiants enregistrés dans Git
  pour une adresse `https://…`.
- **Le fournisseur** d'une configuration se choisit (github ou gitlab), il ne se devine pas ; le volet ne fait que lire l'adresse du dépôt distant (GitHub, gitlab.com, framagit.org, ou un GitLab auto-hébergé que la configuration de l'appareil nomme avec le même hôte ; sinon « Fournisseur non reconnu »). En tête du volet, « Fournisseur : GitLab · projet groupe/projet » (le projet est un lien vers sa page) ; pour GitLab, le lien « Jetons des pilotes » mène à la création des jetons d'accueil ; pour GitHub, le volet propose de saisir l'adresse d'un projet GitLab, car l'accueil par jeton de projet le demande. La page ne fait que proposer : changer de dépôt passe, comme toujours, par la fenêtre Oui / Non du lanceur. La configuration exportée porte toujours le fournisseur (github ou gitlab ; un dépôt inconnu est refusé, jamais exporté comme « autre »), et le côté du pilote s'ouvre dessus. Une ancienne configuration sans fournisseur n'est acceptée que pour github.com. Sans lanceur, une configuration GitLab s'applique sur l'appareil comme une configuration GitHub.
- **À plusieurs par git**, ce dépôt distant est nécessaire : sans lui, la case « À plusieurs » ne mène nulle part, et
  la carte « Usages » le rappelle.
- **data/ absent ou sans git** : la carte « Accès aux données » ouvre une porte, à tous les niveaux. `data/` est un dossier ignoré par le dépôt du code ; il
  devient son propre dépôt git, relié au dépôt des données (pas un sous-module). Tapez l'adresse du dépôt des données,
  et au besoin un identifiant et un mot de passe ou jeton (jamais gardés par la page ; « Se souvenir » les confie à Git
  sur cet ordinateur). Sans `data/`, « Récupérer les données » le clone ; avec un `data/` sans git (données d'exemple
  ou archive), « Reprendre data/ dans ce dépôt » le relie au dépôt. La carte suit le travail et relit l'état à la fin ;
  un échec est expliqué, rien n'est perdu.
- **Historique du dépôt réécrit** (par exemple pour en purger de gros fichiers) : la synchronisation de ce poste refuse
  alors toute fusion et le dit ; rien n'est perdu. Ici, « Reprendre le nouvel historique » montre d'abord ce qui
  repartira (vos commits, les fichiers des données reportés), pose une question, garde l'ancien état dans une référence
  locale, reporte vos fichiers des données sur le nouvel historique, puis synchronise. Un fichier hors des données
  synchronisées n'est jamais renvoyé.

## Configurer un pilote

**Préparer la configuration (administrateur).** Dans la carte « Administration » (niveau « Complet »), « Ajouter un pilote » prépare la configuration d'un pilote (voir « Ajouter un pilote (administrateur) » plus bas). Elle donne **trois formes de la même configuration** : le fichier sog-config-<TRI>.json, le lien et son code QR ; envoyez celle que vous voulez. Le pilote scanne le code QR avec l'appareil photo de son téléphone : il ouvre le lien, qui mène à l'assistant. Elles contiennent la compagnie, le dépôt des données, le trigramme et le mode d'emploi du jeton, jamais de jeton ni de secret ; le propriétaire du dépôt (utilisateur ou organisation) y est noté, il décide du jeton à créer. Pour un dépôt GitHub, invitez d'abord le nom GitHub du pilote sur le dépôt, avec le droit Write (le lien mène à la page des collaborateurs du dépôt).

**Rejoindre la compagnie (pilote).** Le code QR (scanné avec l'appareil photo du téléphone : il ouvre le lien), le lien, « Rejoindre la compagnie… » (carte « Accès aux données » : l'assistant sans configuration demande de coller le lien reçu, ou de choisir le fichier) et la carte d'accueil de la première ouverture ouvrent l'assistant « Rejoindre la
compagnie », un écran par pas : la configuration reçue ; le compte (le créer s'il n'existe pas, avec le lien
d'inscription) et le nom d'utilisateur ; l'invitation à accepter ; le jeton, pas à pas (classique pour le dépôt d'un
utilisateur, à grain fin pour celui d'une organisation) ; le jeton collé et testé ; les identifiants réseau ; enfin «
Terminer et synchroniser », puis les données hors ligne. Les cases cochées restent sur l'appareil : une carte des
réglages propose de reprendre là où vous en étiez. Le tutoriel « Rejoindre la compagnie » suit les mêmes pas.

**Rejoindre pour un projet GitLab (pilote).** Quand la configuration reçue est un projet GitLab, vous n'avez rien à créer : ni compte, ni invitation, ni jeton. L'assistant n'a que trois écrans : la configuration lue (compagnie, projet), puis « Coller le jeton » — collez le jeton que l'administrateur vous a envoyé à part (jamais dans le lien) ; votre trigramme est lu de la configuration, vous ne le tapez pas — puis « Terminer et synchroniser ». Vos identifiants VID, CID et SimBrief se renseignent plus tard dans Réglages › Identité. Avant d'accepter le jeton, l'appli demande à GitLab de quel jeton il s'agit. Un jeton personnel (qui vaut pour tous vos projets) donne une question : préférez le jeton de projet demandé à l'administrateur ; si vous répondez « Non », rien n'est enregistré. Un jeton sans date d'expiration (ou à plus d'un an), ou qui a plus de droits que nécessaire, est signalé par une ligne d'avertissement, sans vous bloquer. La carte « Accès aux données » dit la même chose d'un jeton personnel, sans question : seul avec votre propre dépôt, un jeton personnel est le bon.

**Rien de plus que le fichier.** Seul ce que contient la configuration est réglé, et l'accès n'est enregistré qu'une
fois le jeton testé ; « Tester » dit ce qui ne va pas : invitation pas encore acceptée, jeton mal copié ou expiré, jeton
sans droit sur le contenu. Un jeton classique ouvre tous les dépôts du compte : pour le dépôt d'un utilisateur, un
compte GitHub dédié au vol est conseillé. Un fichier d'un autre format est refusé avec un message. La compagnie n'est
écrite dans le dépôt que s'il n'en a pas encore. Sur un poste dont data/ suit déjà ce dépôt, l'assistant saute le compte
et le jeton. Sans lanceur, l'appli joint un dépôt GitHub ou un projet sur une instance GitLab (gitlab.com) :
collez l'adresse du projet (https://gitlab.com/groupe/projet) et le jeton d'accès de projet que l'administrateur vous a
donné ; le jeton n'est envoyé qu'à cette instance. Quand la configuration reçue ou l'accès de l'appareil est un projet GitLab, la carte « Accès aux données » attend l'adresse du projet et décrit le jeton de projet (rôle Developer, `write_repository`).

## Administration

**Les pages d'administration.** Au niveau « Complet » (carte « Niveau »), la carte « Administration », sous « À propos
», réunit les pages d'administration et d'essai, **un bouton par page**, chacun avec une phrase ; aux autres niveaux, elle
n'apparaît pas, et rien de l'administrateur n'est sur les autres cartes. Dans l'appli : le bouton « Réglage des seuils de la carte » (`#maps?tune=1`, en lecture seule sur un téléphone ; il ouvre la page de réglage : pour chaque élément de la carte et chaque mode, les zooms où il apparaît, enregistrés pour la compagnie, `airline/map_profiles.json` ; un mode que vous n'avez jamais enregistré reprend les seuils d'un mode réglé, la page le dit ; le curseur « Complexité » de la carte ne fait que décaler le zoom), retour par la flèche de retour ; le bouton « Limite de la zone du vol »,
qui déplie une case « Afficher le filet de la limite de la zone du vol » (enregistrée aussitôt pour la compagnie, avec les seuils, dans
`airline/map_profiles.json`, clé `edge` ; le filet est affiché tant que vous n'avez rien réglé) ; le bouton « Seuils de piste sur la carte », qui déplie une liste de 8 à 16 : le zoom à partir duquel la carte dessine les seuils de piste (enregistré aussitôt pour la compagnie, même fichier, clé `runwayZoom` ; 11 tant que vous n'avez rien réglé) ; le bouton « Ajouter un pilote » (voir plus bas) ; sur un poste servi par le lanceur, les boutons
« Dépôt distant de data/ » et « Clés d'API de la compagnie (IVAO, EAD Basic) », qui déplient leur réglage (voir « Un dépôt git pour
data/ » et « Les clés d'API de la compagnie ») ; la feuille de route (`#roadmap`, qui s'ouvre sur « Priorités » : des colonnes Livré, En test, une par jalon ouvert, Backlog, où glisser les cartes (en tête de la colonne où on les lâche ; « En tête », « Monter », « Descendre » sur la carte) ; « Par thème » les montre par voie) ; la recette (`#recette`) : un test fonctionnel par fiche livrée, avec « Validé », « Refusé » et un commentaire (obligatoire pour un refus), écrits par le lanceur dans `organisation/RECETTE.json` ; un défaut déjà connu est dit « en cours, ne pas retester » ; un second onglet « À trancher (n) » pose les points à décider en QCM avec un champ libre (réponses écrites par le lanceur dans `organisation/DECISIONS_REPONSES.json`) ; et le diagnostic de la carte « À propos ».

**L'assistant de l'administrateur.** Le bouton « Assistant de l'administrateur » (carte « Administration », ou l'adresse `#settings?card=assistant`) prend l'administrateur par la main : six étapes, dans l'ordre, chacune avec son état lu sur l'installation (fait, à faire, facultatif, inconnu), une phrase et un bouton vers la carte qui règle l'étape. La première étape à faire a le bouton coloré. Le dépôt des données (un dépôt distant pour data/ et, pour GitLab, votre jeton d'administrateur sur ce poste), la compagnie (son nom, dans le module Site ; votre trigramme est dans Réglages › Identité), la base aéronautique (au moins une zone publiée), le premier pilote (« Ajouter un pilote »), puis, facultatifs, les aéronefs et les clés (IVAO, EAD). L'état de l'installation, tel que le cadre le donne, est en bas. L'assistant n'écrit rien : chaque bouton ouvre la carte qui existe déjà.

**Ajouter un pilote (administrateur).** Au niveau « Complet », le bouton « Ajouter un pilote » de la carte « Administration » (là où l'export est possible) prépare tout pour un pilote qui n'a encore rien. Tapez son trigramme, son nom si vous voulez le saluer, la langue du message et l'adresse de l'appli publiée, puis « Préparer » : vous obtenez le fichier, le lien et le code QR (trois formes de la même configuration), vos gestes, et un message prêt à copier, dans la langue choisie. Pour un dépôt GitLab, vos gestes sont : créer le jeton de projet du pilote (un par pilote, nom = son trigramme, rôle Developer, portée `api`, date d'expiration à 90 jours conseillés et 365 au plus, jamais sans date), le copier tout de suite (GitLab ne le montre qu'une fois), vérifier que la branche des données laisse pousser les Developers, et savoir révoquer (Settings › Access tokens › Revoke). Avec le lanceur, « Créer son jeton » ouvre l'écran « Jetons des pilotes » avec le trigramme déjà tapé : le lanceur crée le jeton avec celui de l'administrateur ; les gestes à la main restent repliés dessous. Sans lanceur, ils sont ouverts. **Envoyez le jeton à part du message** (un autre canal, ou collez-le devant le pilote) : il ne figure jamais dans le lien ni dans le message. Pour un dépôt GitHub, les gestes sont ceux de l'export.

<a id="settings-sources"></a>**Sources des données.** Le bouton « Sources des données » (`#sources`, niveau Complet) liste les sources des données aéronautiques que la suite utilise, envisage ou a écartées : pour chacune, ce qu'elle donne, sa licence, son statut et un lien qui s'ouvre dans un nouvel onglet ; pour celles qui changent à chaque cycle AIRAC (SIA, VAC, eAIP, CIFP), le lien est celui du cycle en vigueur, écrit en haut de l'écran. L'écran ne télécharge rien. Sous le bouton de la carte Administration, l'adresse absolue de l'écran, à ouvrir ou à mettre en favori (« Copier le lien »). Il remplace le laboratoire des données, retiré le 28 octobre 2026.

**Les bancs, sur un poste.** Servis par le lanceur, ils ne s'ouvrent que sur un poste avec lanceur (ailleurs, ils sont
nommés sans lien) ; chemins relatifs à la racine de la suite : `frame/aerodb/bench.html` et `frame/aerodb/offline_bench.html` (base aéronautique, en ligne et hors ligne),
`frame/store/test/` (couche de données, contre le faux GitHub) et `modules/maps/test/render.html` (rendu de la carte).

**Les pages V2.** Plus aucun bouton dans cette carte : toutes les pages de l'ancienne version (Paramètres › Maintenance, Premier lancement, studio cartographique…) sont rangées dans l'écran « Anciennes pages (V2) » (`#legacy`), dernière entrée de la colonne de navigation de chaque application.

## Bon à savoir

- **Compte IVAO** : la carte « Compte IVAO » relie cet appareil à votre compte IVAO par le relais de la compagnie (ou
  le lanceur du poste) : « Se connecter à IVAO » ouvre la page d'IVAO, puis revient ici. Le relais garde le secret de
  l'application de la compagnie ; votre jeton reste sur cet appareil, renouvelé de lui-même, jamais dans une sauvegarde.
  « Délier » l'efface et demande à IVAO de retirer l'accès ; si IVAO ne le peut pas, la suite vous dit de le retirer
  dans votre compte IVAO. Sans application IVAO réglée, le bouton est éteint et la carte dit où elle manque : sur ce poste,
  Administration › « Application IVAO » la règle (elle donne l'adresse de retour à déclarer chez IVAO) ; sur le relais,
  l'administrateur la règle.
- **Appareils** : un seul écran, Maintenance › « Appareils connectés », pour tous les appareils des pilotes, qu'ils viennent du
  réseau local ou du relais de la compagnie (quand le lanceur tourne en relais, derrière le proxy inverse du NAS, en
  https). Un pilote appaire chaque appareil une fois avec un code à 8 chiffres que l'administrateur demande là pour son
  trigramme (une fois, 10 minutes, sur l'un ou l'autre canal) ; ses écritures sont signées de ce trigramme. Chaque ligne
  dit le canal de l'appareil ; celle d'un appareil appairé par le code de la console dit « code de console », et
  « Nommer » lui pose un trigramme. Un appareil perdu, ou tous ceux d'un pilote qui part, s'y révoquent.
- **Mise à jour de la suite** (Administration, avec le lanceur) : choisir un canal — stable, préversions, ou suivi du
  développement —, « Vérifier » dit ce qui changerait sans rien toucher, puis « Mettre à jour » (après une question). Jamais de
  retour en arrière ; refusé si des fichiers de la suite ont été modifiés sur ce poste, et pendant un travail du module
  Données ou une synchronisation (réessayez quand il est fini). Les données ne sont pas touchées. La version prise est celle
  que le dépôt de la suite annonce : ses étiquettes ne sont pas signées, la confiance est la même qu'une mise à jour faite à
  la main par git. C'est celle que « Vérifier » a montrée : si le canal a changé entre-temps, rien n'est écrit et le volet
  demande de vérifier à nouveau.
  Ensuite, fermez la fenêtre du lanceur et relancez lancer.cmd.
- **Dossiers du poste** (Administration, avec le lanceur) : où sont la suite, les données, les téléchargements, les
  bases et les fiches de Little Navmap sur ce poste, chemin en lecture seule et d'où il vient ; « Ouvrir » montre le
  dossier dans l'explorateur. Un chemin se change là où il est dit, jamais ici ; X-Plane est inconnu du lanceur.
- **Jetons des pilotes (GitLab)** : dans l'application Maintenance, sur le poste du lanceur, « Jetons des pilotes »
  crée un jeton d'accès de projet par pilote (à son trigramme, rôle Developer, un an au plus) et le révoque. Après
  « Créer le jeton », l'écran ne montre que lui, en haut : copiez-le aussitôt (il ne sera plus affiché), avec ce qu'il
  faut dire au pilote et le lien vers son message (« Ajouter un pilote ») ; la liste « Jetons existants » est repliée
  dessous, le nouveau y est « créé à l'instant ». Le lanceur s'y sert du jeton de l'administrateur, qu'il ne montre jamais : un jeton d'accès personnel
  de votre compte GitLab (Préférences › Jetons d'accès), portée api, avec une expiration (un an au plus), ce compte étant
  Maintainer ou Owner du projet. Collez-le dans « Jeton de l'administrateur », sous la liste ; « Tester le jeton de
  l'administrateur » dit le compte, son rôle, ses portées et son expiration ; le titre du bloc dit si un jeton est posé (sa date, l'instance, le
  projet, l'heure du dernier test), jamais sa valeur. Un refus de GitLab est dit par sa cause :
  jeton refusé (absent, expiré ou sans api), compte qui n'est pas Maintainer, projet introuvable. La branche des
  données doit être protégée, ouverte au rôle Developer et sans poussée forcée (sur gitlab.com, la branche par défaut
  est réservée aux Maintainers) :
  l'écran le vérifie, et « Ouvrir la branche aux Developers » le fait après une question, posée aussi avant le premier
  jeton. Un pilote dont le jeton est refusé à l'écriture lit « la branche main du projet n'est pas ouverte aux
  Developers ».
- **Expiration des jetons (GitLab)** : la liste « Jetons existants » dit pour chaque jeton « expire le … · dans 12 jours » (orange sous 30 jours, rouge sous 7, « a expiré le … » une fois la date passée) ; la date est relue chez GitLab à chaque ouverture, rien n'en est gardé. Sur le poste du lanceur, le bloc « État » des Réglages dit « 2 jetons de pilote expirent bientôt (le plus proche : …) » : le nombre et la date la plus proche, relus au plus une fois par jour, jamais un nom. Pour son propre jeton, l'appareil garde seulement la date d'expiration que GitLab donne (jamais le jeton), la relit au plus une fois par jour, la dit dans le bloc « État » et, sous 30 jours, une fois par jour dans une notification. Un jeton refusé ne se dit « expiré le … » que si cette date connue est passée : GitLab répond de la même façon à un jeton expiré, révoqué ou inconnu. Avec GitHub, aucune date n'est lue (le navigateur ne peut pas lire l'en-tête qui la porte).
- **Le jeton** : sur github.com, un jeton à grain fin, sur le seul dépôt des données, « Contents » en lecture et
  écriture, 90 jours au plus ; sur GitLab, un jeton d'accès de projet (un par pilote, à son trigramme), créé par
  l'administrateur. Il n'est jamais réaffiché ; ne le collez dans aucun message.
- **Vos réglages restent après la fermeture du navigateur** : l'identité, le jeton et la clé météo sont rangés au même
  endroit de l'appareil, jamais synchronisés ni dans une sauvegarde. Si Safari vous les a quand même fait perdre (il
  efface le stockage d'un site peu visité), ajoutez l'appli à l'écran d'accueil : elle y est mieux gardée. Le diagnostic
  (« Copier ») dit si le navigateur a promis de ne pas effacer (`storage.persisted`).
- **Couper l'accès** : efface le jeton de cet appareil ; vos écritures en attente restent et partiront quand l'accès
  sera de nouveau réglé. Téléphone perdu ou volé : supprimez aussi le jeton chez l'hébergeur (github.com, gitlab.com…).
- **Réglages de la V2** : si ce navigateur a déjà servi à la V2, la carte « Réglages de la V2 trouvés » propose une fois
  de reprendre votre identité et votre accès.
- **À propos** : liens vers cette aide et la feuille de route (ce qui est livré, en cours, prévu), puis le
  diagnostic, replié : transport, dernière synchro, erreurs, arbre du dépôt, bases de référence et base aéronautique,
  ligne par ligne ; « Copier » met le tout dans le presse-papiers, à coller dans votre message pour signaler un
  problème. Le
  jeton n'y figure jamais.

**La compagnie.** Au niveau Complet (ou par #settings?card=company), la carte « Compagnie » liste les compagnies de data/airline/index.json et « Personnel » : le nom, le code, les réseaux (IVAO, VATSIM, hors ligne) et le nombre d’aéronefs de la flotte. La carte s’appelle « Compagnie de cet appareil » : une liste à boutons radio, une ligne par compagnie (le nom, le code, le genre dit en toutes lettres — « Commerciale », « Escadrille SO » ou « Personnel » —, les réseaux et la flotte). Toucher une ligne en fait la compagnie courante de cet appareil (le choix est propre à l’appareil) : seuls les boutons radio changent, la liste ne se redessine pas. Tant que le cadre ne sait pas encore enregistrer ce choix, les boutons sont gris et la carte le dit. Dessous, la fiche de la compagnie choisie (les autres n’en ont pas), dépliée : le **genre** (deux boutons radio, une phrase chacun) puis les **familles de missions** (une case par famille : le sigle et le nom), cochés d’après le genre tant que rien n’a été coché ; cocher ou décocher écrit themes.json, une famille au moins reste cochée. **Ajouter une famille** (un sigle de 2 à 8 lettres ou chiffres, un nom de 1 à 40 caractères ; huit au plus ; une **lettre** libre est proposée pour numéroter les comptes rendus de la famille, refusée avec ses raisons si une famille de la table, M, D, X ou une autre famille ajoutée l'a déjà ; une famille ajoutée avant les lettres reçoit une lettre libre proposée, écrite seulement quand on la fixe) et **Ajouter une série** (une famille de la liste, un nom ; vingt par famille) : le nom saisi dans la langue de l’écran est recopié dans les quatre langues ; la famille ou la série s’enlève avec « Retirer ». Trois gestes suivent, dans cet ordre : « Créer une compagnie » ouvre un **assistant sur le même écran** : le pas **Identité** (le nom ; le code, proposé d’après le nom et modifiable, 2 à 8 lettres minuscules ou chiffres, jamais déjà pris ; le **genre**, Commerciale ou Escadrille SO, Commerciale préchoisie ; les réseaux), puis le pas **Familles de vols** (celles du genre, cochées d’avance : décochez ce que vous ne volez pas ; rien n'est écrit pour les familles si vous n'y touchez pas), puis le pas **Flotte** (« Flotte · 2 aéronefs » : cherchez un type dans la base des fiches, tapez l’immatriculation, « Ajouter l’appareil » ; « Retirer » ; « Plus tard » si vous préférez ajouter les aéronefs depuis Appareils), puis le **Résumé** en mots (« Rennes Motoculture · Commerciale · IVAO · 1 famille · 2 appareils »). « Retour » garde tout ce qui est saisi. **Rien n'est écrit avant « Créer la compagnie »** : alors les réglages, la flotte (vide) puis, en dernier, l'inscription dans la liste (une compagnie n'est listée que complète) ; un fichier déjà là n'est jamais écrasé. Si la création est interrompue, le message dit ce qui est fait et « Reprendre » finit sans rien écraser. À la fin, « Voler pour cette compagnie » la choisit et ouvre Missions. Si le code saisi a déjà son dossier mais que la compagnie manque à la liste, l’assistant le dit et propose **« Reprendre cette compagnie »** : elle est remise dans la liste, rien d’autre n’est écrit. Vingt compagnies au plus ; tout ce qui est lu de data/airline/ est traité comme du texte non fiable. « Rejoindre une compagnie » ouvre un autre assistant : collez la page « Flotte » du site de la compagnie (ou « Lire le presse-papiers »), puis « Lire la page » ; l’écran montre **ce qui a été lu** (« 4 aéronefs · 3 opérateurs »), le nom et le code proposés, le genre (« Escadrille SO » par défaut), les réseaux et l’adresse du site (facultative, en https) **avant que rien ne soit écrit** ; « Rejoindre » écrit alors les réglages, la flotte lue et, en dernier, l’inscription dans la liste. Le pas « ce qui a été lu » dit aussi **combien de missions du registre sont déjà à ce code** (« Registre : 2 missions déjà à ce code »), et s’adapte au code que vous tapez. Une compagnie déjà dans la liste n’est pas rejointe de nouveau : sa flotte se met à jour par le collage de l’écran du site de la compagnie. Sur le poste du lanceur, tant que votre compagnie est encore à la racine de data/airline/, la carte propose de la **migrer** : un code facultatif (proposé d’après le nom), « Voir ce qui serait fait » (le nom, le dossier data/airline/<code>/, les fichiers et leur taille, la flotte qui y sera vide), puis « Migrer vers « <code> » ». Rien n’est supprimé ni écrasé : les fichiers actuels restent en place comme copie. Dans la fiche : sans genre, toutes les familles sont cochées d’avance et la fiche invite à choisir le genre ; une commerciale a la famille Commercial (fret, passagers, rapatriement à vide, VIP, entraînement, transit, essais en vol), une escadrille les seize familles militaires. « Personnel » (toutes les familles) n’a rien à régler.
