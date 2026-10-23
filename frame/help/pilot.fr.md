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

**La décision du niveau.** Le dessin montre, pour chaque niveau, le carburant du trajet (trait plein) et sa durée
(tirets). Le rond vert marque le niveau le plus économe, le carré orange le plus rapide ; la zone grisée, les niveaux
qu'on ne peut pas tenir sur ce trajet. Touchez la courbe pour choisir un niveau, ou utilisez les deux boutons.

**Le résultat.** En bas de l'écran, toujours visible : carburant bloc, délestage, temps de vol et distance du début
de descente avant l'arrivée. « Détail du devis » le décompose phase par phase.

**Les consignes de montée.** Dépliez-les pour suivre la montée jusqu'au niveau : gaz, régime, badin, vario, débit,
Mach, temps et carburant cumulés aux paliers, avec le profil dessiné.

**Ouvrir dans.** Sous le résultat, « Ouvrir dans ▾ » prépare le même vol ailleurs, dans un nouvel onglet : SimBrief
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
- **Hors ligne** : tout se calcule sur l'appareil, à partir des fiches déjà reçues. Seul l'appel à SimBrief attend le
  réseau ; le dernier OFP reste gardé sur l'appareil.

<!-- chapter: maps -->
# Carte

Voir son vol sur une carte aéronautique et son profil vertical, ou les cartes d'une mission : espaces aériens,
terrains, balises, voies aériennes, altitudes minimales. La carte se consulte seulement : elle ne modifie rien.

## Comment s'en servir

**Le vol prévu.** La carte montre le vol préparé dans Carburant : départ, points de la route, arrivée, et le terrain
de dégagement en tirets gris. En haut, une ligne le résume : départ et arrivée, dégagement, niveau, distance, type
d'appareil. Quand le vol change dans Carburant, la carte suit d'elle-même.

**La carte et ce qu'elle montre.** Autour de la route : les espaces aériens qu'elle traverse ou frôle (zones
réglementées, dangereuses, interdites, espaces contrôlés), les voies aériennes basses ou hautes selon votre niveau,
les terrains et les balises, et dans chaque carré d'un degré l'altitude minimale de sécurité (le chiffre brun, en
milliers et centaines de pieds : « 3⁵ » veut dire 3 500 ft). Les petits chiffres violets le long de la route sont les
distances depuis le départ, en milles nautiques. Faites glisser la carte avec un doigt, écartez deux doigts pour
zoomer ; « Recentrer » revient sur toute la route. Vue de loin, la carte ne montre que ce qui est près de la route ;
rapprochez-vous pour tout voir.

**Le profil et le curseur.** Sous la carte, le profil vertical coupe la route de bout en bout : le relief, les
espaces aériens où vous entrez à l'altitude prévue, et la trajectoire du vol en violet. Faites glisser le doigt sur le
profil : un curseur bleu le suit, et le même curseur se place sur la carte. Touchez la route sur la carte pour le
placer là. La ligne sous le profil dit ce qu'il y a sous le curseur : distance depuis le départ, altitude prévue,
hauteur du relief, et l'espace aérien où vous êtes à ce moment-là.

**Montée et descente.** Les losanges violets marquent la fin de la montée (TOC) et le début de la descente (TOD),
sur la carte comme sur le profil. Ils viennent du calcul de Carburant ; sans lui, la carte les estime avec des taux
de montée et de descente courants.

**Les cartes de mission.** La première liste en haut choisit ce que montre la carte : le vol prévu, ou une mission
de la compagnie. Pour une mission, une seconde liste choisit parmi ses cartes (vue d'ensemble, cible, détail…).
Chaque carte est redessinée comme dans le studio : même cadre, même réglage d'affichage, avec les points de la
mission, ses zones hachurées et son cheminement. Le profil vertical montre alors celui de la mission.

**Modifier la route.** La carte ne change pas la route : « Modifier la route » ouvre Carburant, où vous la reprenez.
En revenant sur la carte, le nouveau vol est déjà là.

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
de la trace. Le vol préparé dans Carburant ou Carte est proposé de la même façon (« Vol en cours »).

**Les autres sources.** Dépliez « Autres sources » pour reprendre votre dernier vol IVAO ou VATSIM, votre plan de vol
SimBrief, ou un texte collé : un plan de vol OACI, la page d'un vol du tracker IVAO ou de StatSim, un METAR. Seuls les
champs vides sont remplis ; à côté de chacun, sa source. Si une source donne autre chose pour des champs déjà saisis,
un bouton propose de les remplacer.

**La mission.** Au deuxième pas : la famille (proposée d'après votre dernier compte rendu), la série, l'identifiant de
la mission si le vol en suit une, puis les blocs propres à la famille. Certains blocs n'apparaissent que pour une
série (par exemple VIP ou convoyage pour les missions spéciales).

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
- **Les heures** sont écrites à l'heure de votre appareil.
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
qui en attendent un. Vos choix restent sur l'appareil.

**La liste.** Une ligne par vol : la date, l'indicatif, la route et le temps de bloc. Un point orange marque un vol
sans compte rendu. Sur un ordinateur, la ligne montre aussi l'appareil et le numéro du compte rendu.

**Le détail d'un vol.** Touchez une ligne pour la déplier : d'où vient le vol (compte rendu, journal du site, réseau
IVAO ou VATSIM), son heure, l'appareil, la mission et les remarques.

**Écrire ou ouvrir le compte rendu.** Sur un vol qui n'en a pas, « Écrire le CR » ouvre un compte rendu neuf, déjà
rempli avec ce vol — date, appareil, indicatif, terrains — et une famille de mission proposée. Sur un vol qui en a un,
« Ouvrir le CR » le rouvre pour le modifier.

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

**Les usages.** La phrase en tête de « Usages » dit comment les données sont échangées. Sans case cochée, vous êtes
« Seul sur cet appareil » : rien ne part ailleurs. Cochez « Seul, sur plusieurs appareils » ou « À plusieurs (dépôt git
des données) » pour échanger.

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
démarrage, toutes les 10 minutes en ligne et au retour du réseau.

**La sauvegarde.** Seul sur cet appareil, « Exporter (un fichier) » garde toutes vos données dans un fichier : c'est la
seule copie. « Importer (fusion)… » la reprend sans rien perdre d'ici ; « Remplacer par un fichier… » efface d'abord ce
qui est sur l'appareil.

**Les données hors ligne.** Chaque zone publiée a sa ligne : son état sur cet appareil, son cycle et sa taille.
« Garder hors ligne » la télécharge entière (de préférence en Wi-Fi) ; « Libérer » rend la place.

## Les clés du lanceur

Sur un poste servi par le lanceur, « Clés du lanceur » règle la clé de l'API IVAO : elle reste dans le dossier
`secrets/` du lanceur, jamais dans le navigateur ni dans les données. « Tester » vérifie qu'IVAO répond ;
« Effacer » la retire.

## Un dépôt git pour data/

Sur un poste servi par le lanceur, « Accès aux données » montre le dépôt distant de `data/` : son adresse et sa
branche. Pour le régler ou en changer, tapez l'adresse (`git@hôte:compte/dépôt.git` ou `https://…`, sans mot de passe
ni jeton dedans) : « Vérifier » dit si le dépôt répond, « Enregistrer » le règle. Vers un autre dépôt que l'actuel, le
lanceur demande confirmation dans une fenêtre sur l'ordinateur. Rien ne bloque : un dépôt qui ne répond pas est
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

## Bon à savoir

- **Le jeton** : un jeton à grain fin de github.com, sur le seul dépôt des données, « Contents » en lecture et
  écriture, 90 jours au plus. Il n'est jamais réaffiché ; ne le collez dans aucun message.
- **Couper l'accès** : efface le jeton de cet appareil ; vos écritures en attente restent et partiront quand l'accès
  sera de nouveau réglé. Téléphone perdu ou volé : supprimez aussi le jeton sur github.com.
- **Réglages de la V2** : si ce navigateur a déjà servi à la V2, la carte « Réglages de la V2 trouvés » propose une fois
  de reprendre votre identité et votre accès.
- **Diagnostic** : replié en bas de l'écran ; « Copier » le met dans le presse-papiers pour signaler un problème. Le
  jeton n'y figure jamais.
