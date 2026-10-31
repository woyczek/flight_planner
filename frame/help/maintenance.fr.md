<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Maintenance — manuel

L'appli Maintenance sert à l'administrateur de la compagnie : les données qu'elle publie pour les pilotes (module
Données), la flotte et ses fiches de performances (module Appareils), et l'administration de la suite (Réglages, carte
Administration). Elle s'ouvre au niveau Complet. Avec le lanceur du poste, elle écrit ; sans lanceur, ou depuis un appareil
appairé, elle se lit seulement.

## Premier démarrage

- **Les entrées.** Sur un téléphone, la barre du bas donne Données, Administration et Aide : l'en-tête ne les répète pas.
  Sur un écran, ce sont les entrées de la colonne de gauche, avec les pages de service du poste (jetons des pilotes,
  appareils, page de maintenance V2). Le nom de l'application, en haut à gauche, ouvre la liste des applications : un
  toucher passe à Pilote.
- **L'aide.** Elle s'ouvre au chapitre de l'écran affiché ; ce manuel ne parle que de Maintenance, celui de Pilote reste
  dans Pilote.
- **L'état de l'appli.** La pastille de l'entrée Administration (verte : une nouvelle ; orange : une chose demande votre
  attention) mène au bloc « État » en tête des Réglages.

<!-- chapter: data -->
# Données

Ce que la compagnie publie pour l'appli — la base aéronautique, les procédures, les appareils, la météo — et l'état de chaque jeu de données. Cet écran se lit, et des actions y sont offertes sur chaque groupe : Télécharger les sources, Construire, Purger, puis Publier.

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

<a id="data-zone-map"></a>**La carte des zones à cocher.** Au-dessus de la liste des zones (panneau de la base) et des États (panneau des procédures : la France et les États-Unis), une vraie carte (le socle de carte de l'application, comme la Carte et la Météo) dessine les zones remplies de la teinte de leur état : on la déplace et on la zoome au doigt, et le bouton « Recentrer » ramène la vue sur l'ensemble des zones. Toucher une zone la coche ou la décoche, exactement comme sa case dans la liste (une seule sélection : la carte et la liste se redessinent toutes deux depuis elle) ; faire glisser ou pincer la carte ne coche rien. Au clavier, la liste est le chemin : ses cases se cochent à Espace. La couleur suit l'état (à jour, cycle dépassé ou absent, en cours, hors couverture : la légende sous la carte les nomme avec leurs mots) mais n'est jamais seule : une zone cochée a un trait épais et une teinte plus pleine. Pendant une opération, la carte comme la liste est figée. Un contour qui n'est que le cadre de la zone est tireté ; la légende le rappelle. Quand la carte ne peut pas venir (hors ligne sans fond de carte en mémoire, pas de WebGL, ou le cadre ne donne pas les contours), la liste reste seule, sans message d'erreur.

<a id="data-pickup"></a>**Prendre le fichier téléchargé.** Certaines sources ne se téléchargent pas toutes seules (le SIA pour la France, NATS pour le Royaume-Uni) : vous les téléchargez dans votre navigateur, puis « Prendre le fichier téléchargé » (le deuxième bouton du panneau de la base, et sous la ligne « à déposer à la main » d'un téléchargement) va chercher dans le dossier Téléchargements du poste le zip le plus récent au nom attendu (par exemple EG_*_DS_*_XML.zip). Le plan d'abord et une seule question : pour chaque zone le zip trouvé (nom, nombre de fichiers, taille), ce qui manque (avec le nom attendu), où vont les fichiers (data/sia/, data/sia/zones/gb/) ; ce sont des sources brutes du poste, jamais commitées. Rien de trouvé : pas de question, l'écran dit ce qui manque. À la fin : « Pris : n fichiers (x Mo) », les échecs nommés (zip trop gros, rien d'utile dans le zip…) et « Lancez maintenant Construire ». « Tout mettre à jour » ne lance jamais cette prise : elle reste un geste. Le bouton est grisé avec sa raison si le lanceur de ce poste ne connaît pas encore cette opération. La prise n'emporte que le zip montré par le plan (nom et taille) : si un autre zip est arrivé pendant la question, la source concernée est refusée (« le fichier a changé depuis le plan ») et rien n'est pris pour elle ; « Relancer le plan » le remontre. Un zip dont le nom sort de la règle (lettres, chiffres, point, tiret, tiret bas, espace, parenthèses) est montré par le plan mais jamais pris : sa ligne dit « nom de fichier à renommer : lettres, chiffres, . _ - » ; s'il n'y a rien d'autre à prendre, aucune question n'est posée.

<a id="data-purge"></a>**Purger.** Le bouton « Purger » retire du poste les sources brutes des zones cochées (celles qu'on retélécharge) et leurs caches. Il calcule d'abord le plan sans rien effacer, puis pose une seule question : « Purger 15 fichiers (14,3 Mo) des sources de Espagne, France ? ». Si les fichiers du SIA (France) en font partie, la question rappelle qu'ils servent aussi les contours des autres zones à la construction ; les fichiers suivis par git sont toujours gardés et comptés. Non : rien n'est retiré. Oui : la purge se fait et l'écran dit « Purgé : n fichiers, x Mo », avec les chemins refusés (laissés en place). Rien à retirer : « Rien à purger », sans question.

<a id="data-publish"></a>**Publier la base.** Sous « Construire », le panneau « Publier la base » envoie vers le dépôt des données ce qui a été construit sur ce poste. Une zone construite est commitée entière sur le poste et part aussi à la synchronisation suivante : « Publier » l'envoie tout de suite. Il dit d'abord où en est le poste : « 3 fichiers modifiés · 2 commits à envoyer », la date du dernier passage et, s'il y en a une, la fusion qui attend dans data/ (la publication la conclut d'abord). Touchez « Publier » : une seule question rappelle les fichiers et les commits, puis le passage se fait ; une barre sans fin montre qu'il travaille. Pendant ce temps les boutons du panneau « Télécharger, construire, purger » sont grisés, et « Publier » l'est pendant une opération de ce panneau : une opération à la fois.

<a id="data-publish-end"></a>**À la fin de la publication.** Une notification donne les comptes et le résultat reste dans le panneau : ce qui a été envoyé (fichiers commités, fichiers reçus) ; les fichiers de la base gardés sur le poste parce qu'une construction était en cours ; les conflits (le plus récent est gardé, voir Réglages › Conflits) ; les fichiers refusés parce qu'ils n'ont pas le format d'un fichier de données. Un échec le dit en une phrase, avec ce que répond le lanceur : rien n'est perdu, les fichiers restent sur le poste. Le bouton est grisé avec sa raison écrite dessous : « Il faut le lanceur du poste », « Une construction est en cours : publiez quand elle est finie », « Rien à publier », « Le cadre ne sait pas encore publier la base : mettez l'appli à jour », « Hors ligne ».

<a id="data-set-panels"></a>**Les mêmes boutons pour chaque groupe.** Chaque groupe a son panneau « Télécharger · Construire · Purger » : la Base aéronautique, les Procédures, les points VFR des cartes VAC (dans le groupe Base aéronautique, sous « Publier ») et les Appareils. Le principe est le même partout : une seule opération à la fois, tous panneaux confondus (elle se retrouve à la réouverture) ; une ligne par élément pendant la marche, une phrase de fin et une notification, une ligne au journal ; « Purger » calcule d'abord un plan sans rien effacer, puis pose une seule question. Procédures : cochez les États qui se lisent en bloc, la France (eAIP du SIA) et les États-Unis (CIFP de la FAA) ; aucun n'est coché d'office. Les États lus par EAD Basic ne se lisent jamais en bloc : un terrain à la fois, par « Relire » dans Carburant ou sur la Carte. Points VFR : le cycle en vigueur, sans case à cocher ; « Télécharger » récupère les cartes VAC du cycle (« n cartes pas encore publiées » n'est pas un échec) ; « Construire » demande d'abord la base France de ce cycle, les cartes téléchargées et pypdf (l'assistant de première installation l'installe), et dit si rien n'a été commité faute de trigramme ; « Purger » vide le cache des cartes de tous les cycles. Appareils : les types OACI séparés par des virgules ou des espaces (2 à 4 lettres ou chiffres) ; un code refusé est dit sans rien envoyer, un champ vide veut dire les types de la flotte ; les lignes de la marche sont les trois étapes (types, performances, profils SimBrief). La météo n'a pas de panneau : elle est publiée avec le site. Un bouton grisé avec « Le lanceur de ce poste ne connaît pas encore cette opération » : le lanceur de ce poste est plus ancien que l'application, mettez-le à jour. Rien n'est commité par « Télécharger » ni par « Purger ». « Construire » commite ses résultats sur le poste, sauf pour les appareils : le dossier AircraftDB/ de ce poste n'est pas versionné, l'envoi se fait par « Fiches publiées ». Tant qu'une fusion attend dans data/, aucune construction ni publication de fiches n'écrit rien : l'écran dit « Une fusion attend dans data/ : synchronisez d'abord (Réglages › Synchronisation) ». Pendant une mise à jour de la suite, aucune opération ne démarre (base, autres jeux, chaîne, prise du fichier, fiches) : l'écran dit « Mise à jour de la suite en cours : réessayez après le redémarrage du lanceur » ; l'état et le suivi d'un travail déjà lancé continuent.

<a id="data-aircraft-sheets"></a>**Les fiches publiées de la compagnie.** Sous les Appareils, « Publier » copie les fiches de la compagnie vers le dépôt de données. Il calcule d'abord un plan à blanc, puis pose une seule question (fiches à copier, fiches à retirer, taille totale) ; si vous acceptez, la copie, le commit et l'envoi se font d'un seul geste. Il faut votre trigramme (Réglages › Identité) ; sans lui, l'écran le dit et rien n'est envoyé. S'il n'y a rien à copier ni à retirer : « Rien à publier ».

<a id="data-update-all"></a>**Tout mettre à jour.** Sous la couverture, le bouton « Tout mettre à jour (n jeux) » refait d'un geste ce que les panneaux ont choisi : pour chaque jeu, dans l'ordre publié (la base aéronautique, les procédures, les points VFR, les appareils), « Télécharger » puis « Construire » ; jamais une purge, jamais les fiches publiées. Un plan d'abord et une seule question : le cycle AIRAC, les jeux avec ce qu'ils touchent (zones, États, cycle, types ou types de la flotte), la taille des téléchargements (inconnue d'avance) ; un jeu sans rien de coché, aux types refusés ou dont le lanceur ne connaît pas les verbes est ignoré, avec sa raison. Ensuite une ligne de chaîne dit le jeu et l'étape en cours (« 2 / 4 jeux ») avec un seul « Arrêter » pour toute la chaîne ; les autres boutons sont grisés. La chaîne s'arrête au premier échec (même partiel), à l'arrêt demandé ou si une fusion attend dans data/ : ce qui est déjà construit reste commité sur le poste, rien n'est publié, l'écran dit quel jeu et pourquoi. Un téléchargement qui n'a rien de neuf (« rien à télécharger », cartes pas encore publiées) ne l'arrête pas. Si tout a réussi, une seule publication part, sans autre question que le plan ; si elle est impossible (le cadre ne sait pas publier, rien à envoyer), la chaîne le dit. Le journal garde une ligne pour toute la chaîne, avec le résultat de chaque jeu ; une seule notification à la fin. Si la page est rechargée en route, le travail en cours du lanceur se retrouve, mais la chaîne ne continue pas : « Chaîne interrompue par le rechargement : relancez « Tout mettre à jour » ». Un point d'attention marque « Construire » de la base et « Tout mettre à jour » quand le cycle publié est plus ancien que le cycle en vigueur (« Cycle 2610 dépassé, à reconstruire pour 2611 »).

<a id="data-journal"></a>**Le journal.** Au pied de l'écran, les 50 dernières opérations de cet appareil : heure UTC, verbe, zones, résultat.

## Cas particuliers

- **Sans lanceur** : l'écran se lit de la même façon ; il montre ce qui est publié.
- **Une lecture qui échoue** : la section le dit en une ligne, le reste de l'écran s'affiche.

<!-- chapter: aircraft -->
# Appareils

La flotte de la compagnie, telle que les autres écrans la lisent : le compte rendu (immatriculation → type, indicatifs), la carte, le CPCO. Les fiches de performances sont dans le même écran (onglet « Fiches ») ; le registre des types viendra.

## Comment s'en servir

<a id="aircraft-fleet"></a>**La flotte.** Une ligne par appareil : immatriculation, type, indicatifs, base, « hors service » s'il l'est. La recherche filtre sur l'immatriculation, le type, un indicatif ou la base ; sept lignes sont montrées, « N autres » déplie la suite. « Ajouter » ouvre un appareil vide.

<a id="aircraft-edit"></a>**Modifier un appareil.** Une tape sur une ligne l'ouvre : identité (immatriculation, type, variante, exploitant) et exploitation (indicatifs séparés par des virgules, base, numéro tactique, en service). Sous les champs, une ligne dit ce qui va changer (« 2 champs changés : base, indicatifs ») ; « Enregistrer » l'écrit. Un type que la base ne connaît pas est gardé tel quel, et l'écran le dit. L'immatriculation est la clé : deux appareils ne peuvent pas l'avoir. La position donnée par le site reste telle quelle. « Retirer » pose la question, puis l'appareil quitte la flotte ; sa fiche de performances, s'il en a une, est gardée.

<a id="aircraft-sheets"></a>**Les fiches.** L'onglet « Fiches » liste les fiches de performances par famille (hélicoptères, turbopropulseurs, réacteurs, pistons, autres) ; la recherche filtre sur le nom, le type ou l'immatriculation. Chaque ligne dit d'où vient la fiche, ce qui lui manque et sa date ; un type de la flotte qui n'a pas de fiche est proposé « à compléter ». « Importer un fichier » lit un CSV, un JSON, un .lnmperf ou un OFP SimBrief ; « Coller un texte » lit un texte collé, y compris la réponse de ChatGPT ; « Nouvelle fiche » demande le code du type. Rien n'est écrit tout de suite : l'import montre d'abord, champ par champ, ce qui changerait ; décochez ce que vous gardez, puis « Appliquer la sélection ». L'onglet choisi est gardé sur l'appareil, et le lien `#aircraft?sheet=<id>` ouvre directement l'éditeur d'une fiche.

<a id="aircraft-sheet-edit"></a>**Modifier une fiche.** « Modifier » ouvre l'éditeur : les champs par groupe (identité, carburant, piste et dégagement, montée, croisière, descente, régimes), la table régime / débit sur un grand écran, et le complément EUROCONTROL, « compléter depuis une autre fiche » ou la demande à ChatGPT pour remplir les champs vides. Sous chaque champ renseigné, une ligne grisée dit son origine et sa date (« lnmperf · 28/10 », « édité · 30/10 ») ; la survoler montre les valeurs écartées. « Enregistrer » ouvre l'aperçu des changements, qui ne sont écrits qu'après « Appliquer la sélection » ; chaque champ changé garde ainsi sa source, et l'ancienne valeur est conservée. « Exporter .lnmperf » et « Exporter JSON » téléchargent la fiche ; « Supprimer » pose la question avant de retirer la fiche de la base partagée.

## Bon à savoir

- Le module Site met aussi la flotte à jour en collant la page « Flotte » du site : les deux écrivent le même fichier, chaque enregistrement relit le fichier juste avant et ne change qu'un appareil.
- Rien ne part avant la synchronisation suivante.

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
règle dans la carte « Administration » (voir « Un dépôt git pour data/ »).

**Sans accès ni lanceur, pas de bases.** Un appareil sans accès réglé et sans lanceur — le site ouvert sur un téléphone
pour la première fois, par exemple — n'a ni base aéronautique (espaces, terrains, balises) ni base des appareils :
« Données hors ligne » le dit. Deux portes : réglez l'accès au dépôt des données, même sans cocher d'échange (il sert
alors seulement à lire les bases) ; ou, sur un poste avec lanceur, publiez les bases dans le dépôt (V2 : Paramètres ›
Maintenance › Données aéronautiques et Types d'aéronefs), puis synchronisez. Trois états distincts quand la base manque : « Base aéronautique en cours de chargement… » (la lecture n'est pas finie : patientez), « Accès aux données non réglé sur cet appareil » (réglez l'accès ci-dessus ; une appli ajoutée à l'écran d'accueil a son propre stockage, rien de ce que vous aviez réglé dans Safari n'y est) et « Base aéronautique non publiée » (l'accès marche, rien n'est publié dans le dépôt).

**La synchronisation.** Avec un échange coché, la carte « Synchronisation » donne la dernière réussie, les écritures en
attente et le réseau ; « Synchroniser maintenant » envoie et reçoit tout de suite. Sinon, elle se fait seule au
démarrage, toutes les 10 minutes en ligne et au retour du réseau. Tant que des écritures attendent, la carte les liste, les plus récentes d'abord : chemin, module et heure, ✕
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
appareil seulement (rangée avec votre identité : elle survit à la fermeture du navigateur), jamais dans le dépôt ni dans
une sauvegarde, et n'est jamais réaffichée. Sur un poste servi par le
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

**Préparer la configuration (administrateur).** Sur un poste servi par le lanceur, ou sur un appareil réglé sur GitHub,
au niveau « Complet », touchez « Exporter une configuration pour un pilote » dans la carte « Administration » : elle
rappelle vos gestes dans l'ordre. Invitez d'abord le nom GitHub du pilote sur le dépôt, avec le droit Write (le lien mène à la page des
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
et le jeton. Sans lanceur, l'appli joint un dépôt GitHub ou un projet sur une instance GitLab (gitlab.com, framagit…) :
collez l'adresse du projet (https://gitlab.com/groupe/projet) et le jeton d'accès de projet que l'administrateur vous a
donné ; le jeton n'est envoyé qu'à cette instance. Quand la configuration reçue ou l'accès de l'appareil est un projet GitLab, la carte « Accès aux données » attend l'adresse du projet et décrit le jeton de projet (rôle Developer, `write_repository`).

## Administration

**Les pages d'administration.** Au niveau « Complet » (carte « Niveau »), la carte « Administration », sous « À propos
», réunit les pages d'administration et d'essai, **un bouton par page**, chacun avec une phrase ; aux autres niveaux, elle
n'apparaît pas, et rien de l'administrateur n'est sur les autres cartes. Dans l'appli : le bouton « Réglage des seuils de la carte » (`#maps?tune=1`, en lecture seule sur un téléphone ; il ouvre la page de réglage : pour chaque élément de la carte et chaque mode, les zooms où il apparaît, enregistrés pour la compagnie, `airline/map_profiles.json` ; un mode que vous n'avez jamais enregistré reprend les seuils d'un mode réglé, la page le dit ; le curseur « Complexité » de la carte ne fait que décaler le zoom), retour par la flèche de retour ; le bouton « Limite de la zone du vol »,
qui déplie une case « Afficher le filet de la limite de la zone du vol » (enregistrée aussitôt pour la compagnie, avec les seuils, dans
`airline/map_profiles.json`, clé `edge` ; le filet est affiché tant que vous n'avez rien réglé) ; le bouton « Seuils de piste sur la carte », qui déplie une liste de 8 à 16 : le zoom à partir duquel la carte dessine les seuils de piste (enregistré aussitôt pour la compagnie, même fichier, clé `runwayZoom` ; 11 tant que vous n'avez rien réglé) ; le bouton « Exporter une
configuration pour un pilote » (voir « Configurer un pilote ») ; sur un poste servi par le lanceur, les boutons
« Dépôt distant de data/ » et « Clés d'API de la compagnie (IVAO, EAD Basic) », qui déplient leur réglage (voir « Un dépôt git pour
data/ » et « Les clés d'API de la compagnie ») ; la feuille de route (`#roadmap`) et le diagnostic de la carte « À propos ».

<a id="settings-sources"></a>**Sources des données.** Le bouton « Sources des données » (`#sources`, niveau Complet) liste les sources des données aéronautiques que la suite utilise, envisage ou a écartées : pour chacune, ce qu'elle donne, sa licence, son statut et un lien qui s'ouvre dans un nouvel onglet ; pour celles qui changent à chaque cycle AIRAC (SIA, VAC, eAIP, CIFP), le lien est celui du cycle en vigueur, écrit en haut de l'écran. L'écran ne télécharge rien. Sous le bouton de la carte Administration, l'adresse absolue de l'écran, à ouvrir ou à mettre en favori (« Copier le lien »). Il remplace le laboratoire des données, retiré le 28 octobre 2026.

**Les bancs, sur un poste.** Servis par le lanceur, ils ne s'ouvrent que sur un poste avec lanceur (ailleurs, ils sont
nommés sans lien) ; chemins relatifs à la racine de la suite : `labs/design_primitives.html` (primitives et designs),
`frame/aerodb/bench.html` et `frame/aerodb/offline_bench.html` (base aéronautique, en ligne et hors ligne),
`frame/store/test/` (couche de données, contre le faux GitHub) et `modules/maps/test/render.html` (rendu de la carte).

**Les pages V2 du poste.** Montrées seulement quand un lanceur sert la page : Paramètres › Maintenance
(`apps/settings/maintenance.html`), Premier lancement (`apps/settings/premier_lancement.html`) et le studio
cartographique (`apps/cpco/map_parser.html`).

## Bon à savoir

- **Compte IVAO** : la carte « Compte IVAO » relie cet appareil à votre compte IVAO par le relais de la compagnie (ou
  le lanceur du poste) : « Se connecter à IVAO » ouvre la page d'IVAO, puis revient ici. Le relais garde le secret de
  l'application de la compagnie ; votre jeton reste sur cet appareil, renouvelé de lui-même, jamais dans une sauvegarde.
  « Délier » l'efface et demande à IVAO de retirer l'accès ; si IVAO ne le peut pas, la suite vous dit de le retirer
  dans votre compte IVAO. Sans application IVAO réglée, le bouton est éteint et la carte dit où elle manque : sur ce poste,
  Administration › « Application IVAO » la règle (elle donne l'adresse de retour à déclarer chez IVAO) ; sur le relais,
  l'administrateur la règle.
- **Appareils** : un seul écran, Maintenance › « Appareils », pour tous les appareils des pilotes, qu'ils viennent du
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
  crée un jeton d'accès de projet par pilote (à son trigramme, rôle Developer, un an au plus), le montre une seule fois,
  et le révoque. Le lanceur s'y sert du jeton de l'administrateur (secrets/gitlab.json), qu'il ne montre jamais. Réglez
  la branche des données pour que le rôle Developer puisse y pousser.
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
