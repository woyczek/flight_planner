# Manuel utilisateur

Ce manuel décrit la suite SO Group Virtual (Virtual Special Operation Group) pour les **pilotes** : un chapitre par page, une section par onglet ou par
bloc, dans l'ordre où ils apparaissent. Dans la suite, l'entrée **« Aide »** de la barre latérale ouvre ce manuel au
chapitre de la page en cours. Le Centre et l'administration de la suite sont décrits dans le
[manuel administrateur](MANUEL_ADMINISTRATEUR.md) ; pour un premier compte rendu pas à pas, voir le
[tutoriel](TUTORIAL.md). Index de toute la documentation : [index documentaire](README.md).

## Prise en main
<!-- page: index.html -->

La suite « SO Group Virtual » rassemble dans le navigateur tout ce dont le pilote a besoin : missions affectées par le Centre, disponibilités, cartes de vol, carburant, comptes rendus (CR), atterrissages et reportings.
Toutes les pages partagent les mêmes repères : une barre latérale à gauche, un en-tête en haut, parfois des onglets, puis des blocs.
Ce chapitre décrit ces éléments communs ; les chapitres suivants détaillent chaque page.
La page d'accueil (`index.html`) liste les applications sous forme de cartes et affiche la version de la suite.

### La barre latérale

La colonne de gauche donne accès aux applications. L'entrée de la page affichée est mise en évidence.

| Entrée | Ce qu'elle ouvre |
|---|---|
| « Mes missions » | Missions affectées par le Centre et disponibilités (avec une pastille rouge : nombre de missions non lues) |
| « CR » | Saisie d'un nouveau compte rendu de mission |
| « Cartes de vol » | Cartes de vol : route, topo, approche, rendez-vous, destination |
| « Carburant » | Planificateur de performances et de carburant |
| « Atterrissages » | Tableau de bord des atterrissages |
| « Reporting » | Reportings des missions (CR) |

- Le groupe **« Centre »** (« Missions », « Registre », « ODV ») n'apparaît que si le Centre est déverrouillé dans ce navigateur (Paramètres › Centre). Pour un pilote, il reste normalement caché.
- En bas de la colonne : « Apparence » (ouvre les réglages d'affichage dans une fenêtre, au-dessus de la page en cours), « Paramètres » (Mon profil et les autres pages de réglage) et **« Aide »**. Ces trois entrées restent fixées en bas de l'écran : seule la liste du haut défile quand il y a trop d'icônes (fenêtre de moins de 460 px de haut : toute la barre défile).
- « Aide » ouvre la documentation dans une fenêtre, au-dessus de la page en cours, directement au chapitre de cette page. La fenêtre se ferme par ✕, Échap ou un clic à côté ; rouverte, elle reprend là où vous en étiez. « ↗ » l'ouvre en page entière (Ctrl-clic sur « Aide » : dans un nouvel onglet). Elle remplace l'ancienne entrée « Menu ». Elle fonctionne aussi quand la suite est ouverte depuis le disque, sans le lanceur : les documents sont intégrés à la page.
- Le logo en haut de la colonne ouvre le site de la compagnie virtuelle dans un nouvel onglet.
- La barre est masquée sur un écran étroit (moins de 760 px) et à l'impression. On peut la masquer ou l'afficher toujours : Apparence › Icônes › « Barre latérale ».

### L'en-tête

L'en-tête porte le titre de la page et son sous-titre. À droite se trouvent les outils, qui n'apparaissent que lorsqu'ils servent :

| Élément | Rôle |
|---|---|
| Pli cacheté (enveloppe rouge avec un nombre) | Des missions qui vous sont affectées ne sont pas encore lues. Un clic ouvre « Mes missions ». |
| « Synchroniser (n) » | Échange les données partagées avec le dépôt commun. N = modifications à envoyer + mises à jour à recevoir. |
| « Sauvegarder dans le dossier (n) · dernière : … » (bouton rouge) | Rappel de sauvegarde des données locales, affiché à partir de 10 modifications non sauvegardées. |
| « ⚠ n » | Alertes de la page déjà effacées de l'écran : un clic les relit. |
| Drapeau « Langue » | Choix de la langue : « Auto » (langue du navigateur), Français, English, Deutsch, Español. |
| ☰ | Menu complet de la suite. |

**« Synchroniser »** n'existe que si la suite est ouverte avec le lanceur et que le dossier `data/` est un dépôt git.
- Un clic écrit d'abord les fichiers gardés dans le navigateur, puis envoie vos modifications (signées de votre trigramme), récupère celles des autres et les fusionne.
- En cas de conflit sur une même fiche, la version la plus récente est gardée ; l'autre est copiée dans `_conflits/` et une notification le signale.
- L'infobulle donne le détail (modifications à envoyer, éléments à recevoir, dernière synchronisation). L'état est revérifié toutes les 5 minutes.
- Sans trigramme réglé, la synchronisation refuse de partir : réglez-le dans Paramètres › Mon profil. Voir [l'architecture de la synchronisation](technique/SYNCHRONISATION.md).

**« Sauvegarder dans le dossier »** copie toutes les données gardées par le navigateur (brouillons, profil, préférences…) dans le fichier `defa_local_store.yaml` du dossier de sauvegarde.
- Le premier clic demande de choisir ce dossier ; sans dossier possible, la sauvegarde est téléchargée.
- Quand le dossier est autorisé, la sauvegarde se fait aussi toute seule au départ de la page et toutes les 5 minutes.
- Les réglages d'affichage (design, langue, disposition des blocs…) sont sauvegardés mais ne comptent pas dans le rappel.

**Le menu ☰** contient, de haut en bas :
- les boutons « Apparence » et « Paramètres » ;
- la liste des pages de la suite, puis les pages de réglage (Mon profil, Centre, Installation, Maintenance, Apparence, Premier lancement) ;
- le groupe « Profil pilote » (trigramme, ID IVAO, ID VATSIM, SimBrief), repris par toutes les pages ;
- le groupe « Données locales » : « Sauvegarder dans le dossier », « Restaurer / resynchroniser », « Dossier de sauvegarde… », « Télécharger la sauvegarde », « Restaurer depuis un fichier… », et la date de la dernière sauvegarde ;
- le groupe « Page », quand la page propose ses propres actions.

La restauration fusionne : pour chaque donnée, la plus récente l'emporte. Elle sert aussi à retrouver ses données dans un autre navigateur ou sur un autre poste.

### Les onglets en tête de page

Certaines entrées de la barre latérale regroupent plusieurs pages sœurs, présentées en onglets sous l'en-tête :

| Entrée | Onglets |
|---|---|
| « Mes missions » | « Mes missions », « Mes disponibilités » |
| « Paramètres » | « Mon profil », « Centre », « Installation », « Maintenance » |
| « Missions » (Centre) | « Générateur de mission », « Studio cartographique » |

Un clic sur un onglet ouvre la page correspondante. Un clic avec Ctrl (ou Maj) l'ouvre dans un nouvel onglet du navigateur.

### Les blocs

Le contenu des pages est découpé en blocs titrés. Chaque titre de bloc porte deux commandes :
1. « Masquer » / « Afficher » : replie ou déplie le bloc (dans les designs à matières, seule l'icône est visible ; le libellé apparaît en infobulle).
2. ↕ « Déplacer » : saisissez cette poignée et faites glisser le bloc avant un autre bloc de la même colonne.

La disposition (ordre, blocs masqués) est mémorisée **par page et par navigateur**. Elle est reprise à chaque visite.
Certains blocs sont masqués d'office tant que vous ne les avez pas affichés une première fois.

### Les notifications flottantes

Les messages de la suite (succès, avertissements, erreurs) s'affichent en bas de l'écran, au centre, dans de petites bulles.
- Elles s'effacent seules : environ 5 s pour une information, 8 s pour un avertissement, 12 s pour une erreur.
- Le pointeur posé dessus suspend l'effacement ; la croix « × » ferme la bulle tout de suite.
- Quatre messages au plus restent à l'écran.
- Les avertissements et erreurs effacés restent consultables par le témoin « ⚠ n » de l'en-tête : « ACK » acquitte une alerte, « Tout acquitter » les acquitte toutes, « Vider » efface la liste. Ce journal est perdu au changement de page.
- Une tâche longue (lecture, génération…) affiche une barre de progression dans la même pile. Quitter la page pendant la tâche demande une confirmation.
- Les questions (« Effacer… ? ») s'ouvrent dans une petite fenêtre avec « Confirmer » et « Annuler ».

### Connexion, mode develop ou production, usurpation

La compagnie fonctionne dans l'un de ces deux modes, réglé par un administrateur du Centre :

| Mode | Effet pour le pilote |
|---|---|
| develop (par défaut) | Trigramme libre (celui du profil pilote), connexion facultative. |
| production | Connexion exigée pour « Mes missions » et « Mes disponibilités » ; le trigramme est celui de la connexion et ne se modifie plus. |

- En mode production, ces pages affichent « Mode production : connectez-vous pour voir vos missions. » avec les champs « Trigramme » et « Mot de passe », et le bouton « Se connecter ».
- Un mot de passe provisoire (donné par un administrateur) doit être changé : Paramètres › Mon profil › « Connexion et mot de passe ».
- Un administrateur peut agir à la place d'un pilote (usurpation). Un bandeau le rappelle sur toutes les pages : « Usurpation : utilisateur … (par …, écritures signées « … pour … ») », avec le bouton « Terminer l'usurpation ».
- Les contrôles se font dans le navigateur : ils ne remplacent pas une vraie vérification par un serveur.

### Les designs

La suite propose plusieurs designs. Ils changent la forme des pages, pas les informations.

| Design | En bref |
|---|---|
| Standard, Aéro, Opérationnel, Console | Designs « plats » : arrondis, densité, titres, barre latérale. |
| Cabinet, Carnet de vol, Durci, Aqua | Designs à matières (cuir, bois, laiton, aluminium, acier, verre). Aqua est le design d'une nouvelle installation. |

- Dans les designs à matières, le dossier de mission de « Mes missions » devient un véritable livre, avec ses animations.
- Le choix se fait dans Apparence : chaque design y est montré en vignette et s'applique aussitôt. Voir le chapitre [Apparence](#apparence).

## Mes missions
<!-- page: apps/pilot/mes_missions.html -->

Cette page réunit les missions que le Centre vous affecte, le dossier de chacune, vos disponibilités et votre trigramme.
On y arrive par l'entrée « Mes missions » de la barre latérale, par le pli cacheté de l'en-tête ou par l'onglet « Mes missions ».
Mise en page : la liste des missions et le dossier ouvert côte à côte (le dossier prend les deux tiers de la largeur), « Mes disponibilités » en dessous, sur toute la largeur. Sans dossier ouvert, la liste occupe toute la largeur. Sur un écran étroit (moins de 1100 px), tout passe sur une seule colonne : missions, dossier, disponibilités.
En mode production, la page demande d'abord de se connecter.

### Mes missions de la semaine

La liste des missions qui vous sont affectées pour la semaine affichée, triées par heure de décollage (UTC).

- **Barre de semaine** : « ‹ » semaine précédente, champ de date (aller à la semaine d'une date), « › » semaine suivante, « ⟲ » retour à la semaine en cours (visible hors de la semaine en cours). Elle est commune à la liste et aux disponibilités : changer de semaine ici change les deux blocs.
- **Colonnes** : « Décollage (UTC) » (ou « astreinte » et l'heure à laquelle être prêt), « Mission », « Titre », « Appareil », « Terrain », « Indicatif ».
- Un point ● en tête de ligne signale une mission **nouvelle, pas encore ouverte**.
- Une mention « convoyage » indique que vous convoyez un appareil pour un autre pilote : seul l'ordre de convoyage vous est remis, pas le brief de la mission.
- Un clic sur une ligne ouvre la mission dans le bloc « Mission ».
- Case « afficher aussi les missions passées » : par défaut, une mission disparaît quelques heures après son décollage. Le choix est mémorisé.
- Sans trigramme réglé, la liste indique « Aucun trigramme réglé. » ; le bouton « Pilote » mène à la rubrique où le saisir.
- **Pilote**, **Appareils maîtrisés**, **Simulateurs** : trois boutons sous la liste, vers Paramètres › Mon profil (rubrique « Identité et réseaux » pour le trigramme ; rubrique « Appareils et simulateurs », à la carte des appareils ou à celle des simulateurs). Le bouton « Pilote » affiche le trigramme utilisé pour trouver vos missions et vos disponibilités. En mode production ou pendant une usurpation, c'est le trigramme de la connexion.

### Mission

Le dossier de la mission choisie, en lecture seule. Ce bloc n'apparaît qu'après un clic sur une mission.

**Couverture et sceau**
- Une mission non lue arrive sous scellés : couverture fermée avec l'étiquette « CONFIDENTIEL » (numéro, titre, appareil, indicatif, décollage).
- Pour l'ouvrir : cliquez sur la couverture ou sur « Ouvrir la mission » (« briser le sceau »). La mission est alors marquée lue : le point ● de la liste, la pastille de la barre latérale et le pli de l'en-tête se mettent à jour.
- Une mission déjà lue s'affiche fermée avec « Ouvrir le dossier », ou directement ouverte.
- Tant que la mission est scellée, les boutons d'action restent grisés.

**Contenu du dossier** (dans l'ordre) :
1. L'ordre de mission : « Appareil attribué », « Indicatif », « Terrain de départ », « Décollage demandé » (ou « Prêt à » pour une astreinte), convoyage éventuel, « Statut », équipiers (« Avec »), introduction et résumé.
2. Le détail : « Cible / secteur », « Description détaillée », « Risques et points d'attention », « Équipes engagées », « Route fournie » (tableau des points et plan).
3. Les « Cartes fournies » : un clic agrandit une carte dans une visionneuse (fermeture par la croix ou Échap).
4. La fin : « Objectifs », « Remarques », « Fiche technique », « Historique des affectations », et la signature du Centre.
5. Les « Plis et messages en vol », s'il y en a (voir plus bas).

**Le livre** (designs Cabinet, Carnet de vol, Aqua et Durci, écran d'au moins 760 px)
- Le dossier ouvert se présente en double page. Le contenu trop long passe à la page suivante ; les cartes sont posées deux par page.
- Pour tourner : le coin corné en bas à droite (page suivante) ou en bas à gauche (page précédente). Un clic sur la page fait la même chose.
- À la première double page, le coin de gauche referme le dossier.
- Le **signet** saute à la fin du dossier ; de là, il ouvre les plis scellés (s'il y en a), sinon il revient au début.
- Une page « intentionnellement laissée blanche » peut apparaître : elle est voulue, pour que la fin du dossier tombe à gauche.
- Les plis sont rangés derrière le signet, après une page « Informations complémentaires ».
- Dans les autres designs, ou sur écran étroit, le dossier s'affiche en présentation ordinaire, d'une seule colonne.

**Plis d'exercice scellés**
- Dans un exercice, certains plis ou messages ne doivent être lus qu'à une heure donnée. Chacun est présenté comme une enveloppe : « Pli scellé », « Message radio attendu » ou « Message à transmettre », avec la mention « À ouvrir : » suivie de l'heure (UTC) et du moment prévu.
- À l'heure dite, le pli s'ouvre seul ; une notification l'annonce (« … : heure d'ouverture atteinte. »).
- Avant l'heure, « Briser le scellé » demande une confirmation : le bouton devient « Confirmer : ouvrir avant l'heure » pendant 5 secondes.
- Un pli ouvert peut être refermé par « Resceller ».
- Chaque geste (ouverture à l'heure, avant l'heure, rescellé) est noté au journal ; le CR s'en servira.

**Boutons sous le dossier**

| Bouton | Effet |
|---|---|
| « Ouvrir dans les Cartes de vol » | Ouvre les Cartes de vol avec cette mission (appareil attribué en tête). |
| « Carburant (planificateur) » | Ouvre le planificateur carburant dans un nouvel onglet, avec la route, la distance, le niveau de croisière et l'appareil. |
| « Créer le CR » | Ouvre le compte rendu de la famille de la mission, prérempli. |
| « Refermer le dossier » | Referme le dossier (la mission reste lue). |

Ces boutons sont grisés si la mission ne fournit pas ce qu'il faut (fichier de mission absent, route trop courte).
Le bouton « ⤢ Pleine largeur » du titre du bloc étale le dossier sur toute la largeur, au-dessus de la liste ; « ⇥ À côté de la liste » le remet à côté. Le choix est mémorisé.

**Animations** (désactivées si le système demande moins d'animations)
- Cabinet : la liasse sort du range-dossier, qui s'ouvre, puis la page tourne.
- Carnet de vol : le carnet sort de son enveloppe, puis s'ouvre comme un livre.
- Aqua : le dossier s'agrandit en livre.
- Durci : la fermeture résiste, puis cède ; la couverture s'ouvre lourdement.
- Autres designs : simple fondu.
- Changement de mission : le dossier ouvert se referme, part vers la gauche, le nouveau arrive par la droite et s'ouvre si le précédent l'était.

**Langue** : si la page n'est pas en français et que la mission n'apporte pas sa traduction, le contenu peut être traduit par le navigateur (Chrome ou Edge récents), avec une mise en garde « à lire avec prudence ». Sinon, il reste en français.

### Mes disponibilités

Vos disponibilités de la semaine affichée, en heures UTC. Le Centre s'en sert pour vous affecter des missions. C'est le même éditeur que sur la page Mes disponibilités (chapitre suivant) ; ici, la semaine est celle de la barre de semaine de la liste.

**Palette** : les catégories sont rangées par groupe (« Disponible », « Exercice SOG », « Occupé », « Indisponible »). Chaque pastille porte la lettre de code ODV et un libellé court ; l'infobulle donne le libellé complet. La catégorie choisie est mémorisée.

Catégories par défaut (le Centre peut modifier cette liste) :

| Groupe | Catégories (code ODV) |
|---|---|
| Disponible | Disponible pour tout (O), Disponible sécurité civile (SC), Disponible défense (D+), Sécurité civile personnalisée (SC-), Défense personnalisée (D-) |
| Exercice SOG | Vol en exercice SOG (S), Contrôle SOG (AM) |
| Occupé | Vol hors SOG (IVAO / VATSIM) (G), DCS (DC), Contrôle hors SOG (IVAO / VATSIM) (AT) |
| Indisponible | Indisponible (IN), Congés (V), Récupération (Q), Activité réelle (IR) |

**Grille heure par heure** : une ligne par jour (aujourd'hui mis en évidence), une colonne par heure de 0 à 23 UTC.
1. Choisissez une catégorie dans la palette.
2. Cliquez sur une case, ou tracez un rectangle en maintenant le bouton enfoncé : les cases prennent la couleur et la lettre de la catégorie.
3. Un nouveau clic (ou rectangle) commençant sur une case déjà de cette catégorie l'efface.

Une case partagée entre plusieurs catégories est rayée ; une heure couverte en partie (saisie au quart d'heure) est pâlie. Chaque retouche est enregistrée aussitôt.

**« Plage précise »** (au quart d'heure) : « Groupe », « Catégorie », cases des jours (Lun à Dim), « de » et « à » (UTC), puis « Ajouter ». Horaires vides = journée entière. Sous le formulaire, une ligne rappelle les thèmes de mission ouverts par la catégorie ; pour une catégorie personnalisée, le lien « Mes types de missions… » mène aux préférences de Mon profil.

**Autres boutons**
- « ⧉ Semaine précédente » : recopie les plages de la semaine précédente (remplace la semaine affichée, après confirmation).
- « Tout effacer » : vide la semaine affichée (après confirmation).
- « Écrire dans le dossier des données (n) » : n'apparaît que si des semaines sont restées dans le navigateur ; les écrit dans le dossier partagé.

Le message sous le bloc indique où la saisie est partie : « Enregistré dans le dossier des données. », ou « Gardé dans ce navigateur, le Centre ne le voit pas : … » si le dossier des données n'est pas autorisé (voir [Premier lancement](#premier-lancement), étape 3).
Une ancienne grille horaire existante est importée automatiquement dans la semaine.
Le lien « Ouvrir la saisie des disponibilités seule » mène à la page Mes disponibilités.

## Mes disponibilités
<!-- page: apps/pilot/disponibilites.html -->

Cette page présente seule l'éditeur des disponibilités, en plus grand. Elle sert à saisir rapidement plusieurs semaines.
On y arrive par l'onglet « Mes disponibilités » (sous l'entrée « Mes missions » de la barre latérale) ou par le lien « Ouvrir la saisie des disponibilités seule » de Mes missions.
Le pilote est celui du trigramme de travail (profil pilote, connexion ou usurpation). En mode production, la page demande d'abord de se connecter.

### Mes disponibilités

Le bloc unique de la page. Il fonctionne exactement comme le bloc du même nom de Mes missions (chapitre précédent) : palette, grille heure par heure, « Plage précise », « ⧉ Semaine précédente », « Tout effacer ».

**Navigation de semaine** (propre à cette page) :
- « ‹ » et « › » : semaine précédente ou suivante ;
- champ de date : saute à la semaine qui contient cette date ;
- « Semaine en cours » : visible hors de la semaine en cours, y revient.

Astuces et limites :
- Toutes les heures sont en UTC. La grille travaille à l'heure ; « Plage précise » au quart d'heure.
- Chaque retouche est enregistrée tout de suite : il n'y a pas de bouton « Enregistrer ».
- Sans trigramme, le bloc affiche « Trigramme non réglé : le régler dans Paramètres › Mon profil (ou ☰ › Profil pilote). »
- Une adresse de la forme `disponibilites.html?semaine=2026-W41` ouvre directement une semaine donnée.
- Si la semaine est encore en cours de lecture, une retouche est refusée avec « Semaine en cours de lecture : réessayer dans un instant. »

Pour la façon dont le Centre exploite ces déclarations, voir [disponibilités et réorganisation](technique/DISPOS_ET_REORGANISATION.md).

## Mon profil
<!-- page: apps/settings/profil.html -->

Cette page regroupe les réglages propres à chaque pilote : identité, connexion, préférences de missions, appareils et simulateurs, altitude sans oxygène.
On y arrive par l'entrée « Paramètres » de la barre latérale (premier onglet, « Mon profil ») ou par ☰ › « Paramètres ».
La colonne de gauche liste les rubriques par groupe ; un clic en affiche une à droite, avec son titre, sa présentation, ses boutons et un message d'état.
Si une rubrique contient des modifications non enregistrées, changer de rubrique ou quitter la page demande une confirmation.

### Identité et réseaux

Votre identité dans la suite, reprise par toutes les pages (☰ › Profil pilote, comptes rendus, reportings).

| Carte | Champs |
|---|---|
| « Pilote » | « Trigramme », « ID VATSIM (CID) », « ID IVAO (VID) », « SimBrief (utilisateur ou ID) » |
| « Site de la compagnie » | « Identifiant », « Mot de passe » |
| « Langue » | « Langue de la suite » : Automatique (langue du navigateur), Français, English, Deutsch, Español |

1. Remplissez les champs.
2. Cliquez sur « Enregistrer ». Le message d'état confirme « Profil enregistré dans ce navigateur ».

- Le trigramme compte 2 à 4 lettres ou chiffres ; il sert à retrouver vos missions affectées.
- Les identifiants du site de la compagnie restent dans ce navigateur seulement : ils ne sont jamais écrits dans un fichier ni dans une sauvegarde.
- La langue s'applique dès qu'on la choisit, sans « Enregistrer ».
- En mode production, le trigramme est celui de l'utilisateur connecté et ne se modifie pas ici.

### Connexion et mot de passe

Votre fiche utilisateur partagée : rôle et mot de passe (conservé sous forme d'empreinte, jamais en clair).

- En tête, le mode de la compagnie (develop ou production) et votre état : « Connecté : … (rôle) » ou « Non connecté. ».
- **Non connecté** : carte « Se connecter » avec « Trigramme », « Mot de passe » et le bouton « Se connecter ». En mode develop, une fiche sans mot de passe se connecte sans mot de passe : définissez-en un ensuite.
- **Connecté** : carte « Changer de mot de passe » avec « Mot de passe actuel », « Nouveau mot de passe (8 caractères au moins) », « Confirmation », puis « Changer le mot de passe ».
- Le bouton « Se déconnecter » apparaît une fois connecté.
- Un mot de passe provisoire est signalé (« mot de passe provisoire, à changer ») : changez-le dès la première connexion.
- Mot de passe oublié : demandez une réinitialisation à un administrateur du Centre.

### Types de missions

Cette rubrique précise les thèmes de mission ouverts par vos catégories de disponibilité **personnalisées** (« Sécurité civile personnalisée », « Défense personnalisée »).

Pour chaque domaine (« Sécurité civile », « Défense ») :
1. Choisissez un mode : « Tous les thèmes du domaine », « Liste blanche : seulement ces thèmes » ou « Liste noire : tous sauf ces thèmes ».
2. Cochez les thèmes concernés (par exemple HEMS, SAR, FIRE… ou COMBAT, ISR, AAR…).
3. La ligne du bas montre aussitôt le résultat : « « Sécurité civile personnalisée » ouvre : … ».
4. Cliquez sur « Enregistrer ».

Les préférences sont gardées dans votre fiche utilisateur, partagée avec le Centre par la synchronisation. Sans trigramme, la rubrique demande de le régler d'abord dans « Identité et réseaux ».

### Appareils et simulateurs

Les types de la flotte que vous possédez et maîtrisez, et vos simulateurs. Le Centre s'en sert pour vous affecter un appareil et pour réunir des pilotes sur un simulateur commun. (Ces réglages étaient auparavant dans Mes missions.)

**Carte « Appareils »** : un résumé (« … type(s) maîtrisé(s), … possédé(s) sur … types de la flotte. »), puis une sous-carte par catégorie d'appareils, avec un tableau :

| Colonne | Contenu |
|---|---|
| « Type » | Modèle et désignateur OACI |
| « Variantes de la flotte » | Variantes présentes dans la flotte |
| « Appareils » | Nombre d'appareils en service (sur le total) et leurs bases |
| « Possédé » | Vous avez ce type dans votre simulateur |
| « Maîtrisé » | Vous le pilotez avec aisance |

- Cocher « Maîtrisé » coche aussi « Possédé » ; décocher « Possédé » décoche « Maîtrisé ».

**Carte « Simulateurs »** : cochez les simulateurs et outils installés.

Il n'y a pas de bouton « Enregistrer » : chaque coche est gardée aussitôt dans ce navigateur, puis recopiée dans vos semaines de disponibilités déjà déclarées, à partir de la semaine en cours. Le message du bas indique combien de semaines ont été mises à jour.

### Altitude sans oxygène (avions non pressurisés)

Cette rubrique (groupe « Planificateur carburant ») règle le seuil au-dessus duquel le graphique d'altitude optimale du planificateur affiche « oxygène requis » pour un avion non pressurisé.

1. Saisissez « Altitude maximale sans oxygène (ft) » : entre 1 000 et 30 000 ft, par pas de 500.
2. Cliquez sur « Enregistrer ».
3. « Valeur par défaut (10 000 ft) » rétablit la valeur d'origine.

Repères rappelés sous le champ : 10 000 ft (usage courant, EASA NCO), 12 500 ft (FAA, équipage au-delà de 30 minutes), 14 000 ft (FAA, équipage en permanence).
C'est une information seulement : le calcul n'est pas limité. Le réglage est gardé dans ce navigateur.

## Apparence
<!-- page: apps/settings/apparence.html -->

Cette page règle l'aspect de toute la suite : design, graphiques, icônes, barre latérale et couleurs.
L'entrée « Apparence » de la barre latérale (ou le bouton « Apparence » du menu ☰) l'ouvre dans une fenêtre au-dessus de la page en cours : vous voyez l'effet tout de suite. Fermeture : « ✕ », Échap ou clic hors de la fenêtre.
La même interface existe en page entière (☰ › liste des pages de réglage › « Apparence »).
Les réglages sont mémorisés dans ce navigateur et s'appliquent à toutes les pages ; ils ne comptent pas dans le rappel de sauvegarde.

### Design

La forme des pages : arrondis, densité, titres, barre latérale.

- Chaque design est présenté par une vignette dessinée dans son style, avec son nom et sa description : Standard, Aéro, Opérationnel, Console, Cabinet, Carnet de vol, Durci, Aqua.
- Un clic sur une vignette applique le design aussitôt. La vignette choisie est encadrée.
- Cabinet, Carnet de vol, Durci et Aqua ajoutent leurs matières ; les couleurs d'information restent celles du thème.

**« Décor (designs à matières) »** :
- « Complet » (par défaut) : panneaux illustrés des blocs, feuilles de registre, vis, radar ;
- « Sobre » : matières et plaques seulement, sur toutes les pages.

**« Couleur Aqua »** : couleur des boutons et icônes du design Aqua (Bleu, Turquoise, Vert, Graphite, Violet, Orange, Rouge, Rose), ou « Couleur de chaque application ». Les icônes d'état gardent leurs couleurs d'origine.

### Graphiques

Palette de couleurs et style des graphiques (reportings, indicateurs).

- Palettes : « Automatique » (suit le design), « Vives (couleurs des pages) », « Ardoise », « Laiton et cuir », « Kaki et olive ». Chaque rangée montre un échantillon de couleurs.
- « Style » : « Automatique », « Aplats » ou « Relief ».

Le choix s'applique aussitôt aux graphiques des pages.

### Icônes

L'épaisseur du trait des icônes, ou pas d'icônes du tout. Chaque rangée montre un aperçu du jeu.

| Choix | Rendu |
|---|---|
| « Selon le design » | Le jeu prévu par le design choisi |
| « Trait fin », « Trait normal », « Trait épais » | Icônes au trait |
| « Laiton (médaillons) », « Acier (plaques) », « Gel (bulles) », « Avionique (cadrans) » | Jeux à matières |
| « Aucune icône » | Pas d'icônes |

**« Barre latérale »** : « Selon le design », « Toujours » ou « Jamais ». Par défaut, elle est toujours affichée (sauf écran étroit et impression). « Taille des icônes » : « Petite », « Moyenne » (par défaut) ou « Grande ». « Affichage » : « Icône et libellé » (par défaut), « Icône seule » (barre plus étroite, nom de l'entrée en infobulle) ou « Libellé seul ».

### Couleurs des thèmes

Chaque page de la suite a un thème de couleurs (bandeau, texte du bandeau, accent). Pour chaque thème, vous choisissez une famille de couleurs et un ton ; les couleurs en sont calculées, avec un contrôle de lisibilité.

Les thèmes sont présentés en cartes, en deux groupes : « Applications » (Carburant, Atterrissages, Centre, CR) et « Familles de comptes rendus ».

Sur chaque carte :
1. L'aperçu montre un « Titre » sur le bandeau, un « Bouton » et un « Lien, icône ».
2. Les pastilles de couleur choisissent la famille (Rouge, Brique, Orange… Ardoise, Graphite) ; « ↺ » revient aux couleurs d'origine.
3. Le curseur « Ton » (de sombre à clair) règle la clarté. Il est inactif sur les couleurs d'origine.
4. Les pastilles de contraste indiquent ✓ ou ✗ pour « texte / bandeau » et « accent / page » (4,5:1 au moins) et pour « accent / carte » (3:1 au moins).
5. « Voir sur cette page » prête les couleurs du thème à la page en cours, pour juger ; un second clic (ou la fermeture de la fenêtre) l'annule.

Chaque changement est enregistré aussitôt.

**En bas de la page** :
- « Démonstration complète » ouvre une maquette : générateur, catalogue d'icônes et contrastes de tous les thèmes.
- « Tout réinitialiser » rétablit tous les réglages d'Apparence par défaut (design Aqua, icônes du design, barre latérale toujours affichée, décor complet, couleurs d'origine).

## Premier lancement
<!-- page: apps/settings/premier_lancement.html -->

Cette page règle la suite en quatre étapes lors de la première installation. Le lanceur (`lancer.cmd` sous Windows, `sh lancer.sh` sous macOS ou Linux) l'ouvre de lui-même.
Pour y revenir : Paramètres › onglet « Installation » › « Premier lancement » › « Ouvrir le premier lancement ».
Une fois la suite réglée, la page renvoie vers l'accueil, sauf si elle est ouverte par ce bouton.
Le numéro de chaque étape passe au vert quand elle est faite.

### 1 Données

Cette étape installe les données de la compagnie (missions, références…). Elle passe par le lanceur : sans lui, la page affiche « Pour cette étape, ouvrez la suite avec le lanceur… ».

Trois possibilités :

| Carte | Marche à suivre |
|---|---|
| « Jeu d’essai » | « Installer le jeu d’essai » : données fictives livrées avec la suite (missions dont un exercice, pilotes, flotte, disponibilités et affectations de la semaine en cours), pour découvrir la suite ; à remplacer plus tard par les données de la compagnie. Refusé si des données sont déjà là. |
| « Dépôt de données » | Saisissez « Adresse du dépôt » (donnée par votre compagnie : `https://…` ou `git@…`), au besoin « Identifiant (facultatif) » et « Mot de passe ou jeton (facultatif) », cochez au besoin « mémoriser dans le gestionnaire d’identifiants de Git », puis « Récupérer les données ». Le premier téléchargement prend quelques minutes. |
| « J'ai reçu les données par mail » | « Archive des données… » : choisissez l'archive `.zip` reçue (elle contient `data_tree.js`). |
- Aucune adresse n’est préremplie. Dépôt privé en HTTPS : identifiant et mot de passe, ou un jeton d’accès en lecture si le compte a la double authentification ; en SSH (`git@…`), la clé SSH de l’ordinateur.
- Si Git n'est pas installé : jeu d’essai ou archive (ou installez Git, puis relancez).
- **« Dépôt git de synchronisation des données »** : l'adresse du dépôt distant de `data/`, qui partage les données
  entre les postes (bouton « Synchroniser »). Adresse SSH `git@hôte:compte/dépôt.git` (clé SSH de l'ordinateur) ou
  HTTPS `https://hôte/compte/dépôt.git` (identifiants enregistrés dans Git). La carte affiche le dépôt actuel ;
  « Vérifier » dit s'il répond depuis ce poste (30 s au plus), « Enregistrer » en fait le dépôt distant de `data/`
  (sans données encore, l'adresse sert à les récupérer). Rien n'est bloquant : un dépôt qui ne répond pas est signalé,
  la suite fonctionne sans partage. Détails : [synchronisation](technique/SYNCHRONISATION.md).
- Une fois les données présentes, la carte facultative « Journal des vols » propose « Journal (.html)… » : la page « Log des vols » du site de la compagnie, enregistrée, remplit les pilotes et appareils de la référence (aide à la saisie).

### 2 Profil

Votre profil pilote, repris par toutes les pages (☰ › Profil pilote).

1. Remplissez la carte « Pilote » : « Trigramme », « ID IVAO (VID) », « ID VATSIM (CID) », « SimBrief ».
2. Cliquez sur « Enregistrer le profil ».

Les identifiants du site de la compagnie, le mot de passe et les préférences se règlent ensuite dans [Mon profil](#mon-profil).

### 3 Dossiers

Le navigateur demande de désigner chaque dossier une fois ; il s'en souvient ensuite.

- **« Dossier de l'application »** : « Choisir le dossier de l'application », puis désignez le dossier qui contient `lancer.cmd` et `lancer.sh`. Les autres dossiers (données, registre, missions, SIA, performances, sauvegarde locale) en sont déduits ; le message indique combien ont été réglés.
- **« Classeur ODV »** : « Dossier OneDrive… » désigne le dossier synchronisé où l'escadrille dépose le classeur (le Planning ODV ouvre le plus récent). Sans OneDrive : « ou le fichier Excel… », gardé dans ce navigateur.

Cette étape est importante : sans dossier des données autorisé, vos disponibilités restent dans le navigateur et le Centre ne les voit pas.

### 4 Données SIA

Cartes et missions utilisent les données AIRAC du SIA (cycle de 28 jours).

1. Cliquez sur « Terminer et mettre à jour les données SIA ». La suite est notée « réglée » et la page Maintenance s'ouvre sur les données aéronautiques (carte des zones ; la France est active par défaut).
2. Suivez les étapes guidées : sur le site du SIA (compte gratuit), « Ajouter au panier » le produit du cycle (0 €), puis « Passer commande » en acceptant la licence.
3. Reprenez le ZIP téléchargé avec « Récupérer le ZIP téléchargé ».

Le lien « Accueil » ramène à la page d'accueil sans terminer.

### Recommencer

Pour reprendre le premier lancement de zéro, et seulement dans ce cas.

- « Nettoyer et recommencer… » efface, **dans ce navigateur**, les dossiers mémorisés (application, données, registre, missions, SIA, ODV, X-Plane, performances, sauvegarde locale), la copie du classeur ODV, les identifiants du site de la compagnie, le profil (trigramme, IVAO, VATSIM, SimBrief) et l'indicateur « suite réglée ».
- Une confirmation est demandée, puis la page se recharge à l'étape 1.
- Les fichiers sur le disque ne sont pas touchés : dossier `data/`, registres, sauvegarde `defa_local_store.yaml`.

## Nouveau compte rendu
<!-- page: apps/cr/mission_cr.html -->

Cette page est la porte d'entrée de tout compte rendu (CR) de mission : vous y choisissez la famille de
mission, puis la page de CR de cette famille s'ouvre. Elle s'adresse à tous les pilotes.
Pour y aller : barre latérale › **CR**, ou le bouton « Nouveau compte rendu » de l'en-tête du
reporting général. Un CR peut aussi s'ouvrir directement, déjà rempli, depuis une mission qui vous a été
affectée (voir plus bas). Pas à pas complet : [tutoriel](TUTORIAL.md).

### Famille de mission

Le bloc affiche une tuile par famille (16 familles : HEMS, FIRE, SAR, AIRLIFT, AAR, MARITIME, HADR,
AIRBORNE, FI, SURVEY, LE, ISR, COMMAND, COMBAT, SOF, SPECIAL). Chaque tuile porte le code de la famille
et son nom ; le survol affiche sa description.

1. Repérez la famille de votre mission.
2. Cliquez sa tuile : la page de CR de la famille s'ouvre, avec une mission vierge.

Astuces :

- la dernière famille utilisée apparaît toujours en premier, encadrée, avec la mention « Continuer avec » ;
- vous pourrez changer de famille plus tard, depuis la pastille « famille · sous-type ▾ » de l'en-tête de
  la page de CR ;
- la page s'affiche à chaque fois : elle ne vous renvoie pas d'office vers la dernière famille.

### Rechercher la famille d'après la mission

Le champ de recherche (exemple affiché : « évasan hélico », « ravitaillement de Rafale », « largage
para »…) trouve la famille à partir d'une description libre.

1. Tapez quelques mots : type de mission, appareil, organisme (« feu de forêt », « canadair »,
   « parachutistes »…). Les accents et les débuts de mots suffisent (« ravito », « para »).
2. Les familles sont classées : la meilleure est encadrée, celles qui ne correspondent pas sont estompées.
   Sous le champ, « Suggestion (Entrée pour ouvrir) : » rappelle la famille proposée.
3. Appuyez sur **Entrée** pour ouvrir la première, ou cliquez une autre tuile.

Si rien ne correspond, le message « Aucune famille ne correspond : SPECIAL couvre les autres missions. »
s'affiche : SPECIAL (transport spécial, essais, formation) accueille toutes les autres missions.

### Reprendre une mission affectée

Quand le Centre vous a affecté une mission, inutile de passer par le choix de la famille : le CR
s'ouvre directement dans la bonne famille, déjà rempli.

| D'où | Bouton |
|---|---|
| **Mes missions** (dossier de la mission ouvert) | « Créer le CR » (grisé si la mission n'a pas de fichier de mission) |
| **Registre** des missions (Centre) | « Créer le CR », ou « Nouveau CR (vol n) » si la mission a déjà des CR |
| **Générateur de mission** (Centre) | bouton de l'en-tête « Créer le CR → » |

Ce qui est repris : nom de l'exercice / opération (titre de la mission), identifiant de la mission (champ
« Mission »), objectif et instructions (bloc Tâche), terrains de départ et d'arrivée, points tournants et
coordonnées, zone, appareils (type OACI, immatriculation, indicatif), organisme, et un rappel de la mission et de la charge
dans les Remarques. Les aides habituelles s'appliquent ensuite (appareil connu, terrain, météo).

- La famille est déduite du type de mission (MEDEVAC → HEMS, TRAINING → SPECIAL…).
- Si un brouillon est en cours dans cette famille, la page demande « Remplacer le brouillon en cours par
  la mission générée (SIA XML) ? ».
- Depuis le Registre, une mission « générée » ou « planifiée » passe à l'état « volée ».
- Le n° de CR est calculé d'après la mission : `CRM-016-1`, puis `CRM-016-2` si la mission est rejouée.

## Compte rendu d'une famille
<!-- page: apps/cr/AAR/aar_cr.html -->
<!-- page: apps/cr/AIRBORNE/airborne_cr.html -->
<!-- page: apps/cr/AIRLIFT/airlift_cr.html -->
<!-- page: apps/cr/COMBAT/combat_cr.html -->
<!-- page: apps/cr/COMMAND/command_cr.html -->
<!-- page: apps/cr/FIRE/fire_cr.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_cr.html -->
<!-- page: apps/cr/HADR/hadr_cr.html -->
<!-- page: apps/cr/HEMS/hems_medevac_cr.html -->
<!-- page: apps/cr/ISR/isr_cr.html -->
<!-- page: apps/cr/LE/le_cr.html -->
<!-- page: apps/cr/MARITIME/maritime_cr.html -->
<!-- page: apps/cr/SAR/sar_cr.html -->
<!-- page: apps/cr/SOF/sof_cr.html -->
<!-- page: apps/cr/SPECIAL/special_cr.html -->
<!-- page: apps/cr/SURVEY/survey_cr.html -->
<!-- page: apps/cr/MissionCore/demo_cr.html -->

Toutes les familles partagent la même page de saisie : mêmes blocs communs, plus quelques blocs propres
à la famille. Vous y rédigez le CR d'un vol réalisé, puis l'enregistrez dans le registre des missions.
On y arrive par la page « Nouveau compte rendu », par une mission affectée, ou en cliquant une mission
dans un reporting ou une fiche (la mission s'ouvre alors en modification). La page `demo_cr.html` est une
démonstration du moteur, hors liste des familles.

### En-tête et barre d'outils

L'en-tête reste collé en haut de page. De gauche à droite :

| Entrée | Rôle |
|---|---|
| « SAR · SAR terrestre ▾ » (famille · sous-type) | popup « Famille de mission » (ouvre la page de l'autre famille) et « Sous-type de mission » |
| « Ajouter au registre » / « Enregistrer les modifications » | range la mission dans le registre |
| « Envoyer le CR » | transmet le CR au webservice de la compagnie (en pointillés tant qu'il n'est pas paramétré) |
| « Analyser / importer… » ▾ | coller un plan de vol, une page de tracker, un METAR ; importer un fichier |
| « Suivi réseau » ▾ | suivi en direct IVAO / VATSIM, historique VATSIM |
| « Mission » ▾ | « Nouvelle mission », « Exporter la mission (YAML) », « Supprimer cette mission » (en modification) |
| « Registre des missions » ▾ | « Voir le reporting », « Dossier du registre… », « Paramétrer l'envoi des CR (webservice)… », « Paramétrage — bases de données… » |

À droite, un message d'état indique le dernier enregistrement (« Brouillon enregistré dans le
navigateur · heure »). Chaque bloc a dans son titre **↕** (glisser pour le déplacer) et **Masquer /
Afficher** ; la disposition est mémorisée. Les blocs qui contiennent une liste ont un **+** dans leur
titre pour ajouter un élément.

### Modification d'une mission du registre

Ce bandeau n'apparaît que lorsque vous modifiez une mission déjà enregistrée (ouverte depuis un reporting,
une fiche ou juste après « Ajouter au registre »). Il rappelle le n° de CR et sa place dans le registre
(ex. `CRS-004-1 — missions.yaml #12`).

- Le bouton principal devient « Enregistrer les modifications ».
- « Mission ▾ › Supprimer cette mission » apparaît (confirmation : « Supprimer définitivement cette
  mission du registre ? »), puis la page revient au reporting de la famille.
- Si la mission a été déplacée ou supprimée entre-temps, la page le signale et ouvre une nouvelle mission.

### Identification & organisation

Numéros, date, série, exercice ou opération réelle, organisation.

| Champ | À savoir |
|---|---|
| « Mission (identifiant) » | identifiant de la mission volée (`M-016`, `S-002A`) ; vide : CR sans mission. Un lien « voir la mission dans le registre ↗ » s'affiche dessous, avec le nombre de CR de cette mission et l'écart avec le vol estimé |
| « N° de CR » | calculé, non modifiable : `CRM-016-1`, `CRM-016-2` si rejouée ; sans mission : `CRM-A01-0` |
| « Série » / « Sous-type » | type de mission de la famille ; la série est aussi dans la pastille de l'en-tête |
| « Date », « Heure locale », « Heure UTC » | date du jour par défaut ; l'heure locale remplit l'heure UTC et inversement ; l'heure du briefing les remplit si elles sont vides |
| « Exercice / opération réelle » | « Exercice / simulation » ou « Opération réelle » |
| « Nom de l'exercice / opération », « Organisme », « Unité » | vos valeurs déjà saisies sont proposées |
| « Autorité demandeuse », « Autorité de contrôle » | reprises de la dernière mission du même indicatif ou du même organisme |

Selon la famille, d'autres champs s'ajoutent ou disparaissent : « N° de série », « Classification »
(familles non civiles), « Référence ordre de mission », « Détachement ». Une date dans le futur est
signalée : un CR porte sur un vol réalisé.

### Résultat

Résultat de la mission et suites à donner (bloc placé en 2e position pour la lecture du CR).

1. Choisissez le « Résultat » : Succès, Succès partiel, Interrompue, Annulée, Déroutée, Pas de contact,
   Objectif non trouvé, Météo, Technique, Opérationnel, Autre.
2. Pour tout résultat autre que Succès ou Autre, les champs « Motif d'interruption » et « Causes » apparaissent ; cochez toutes les causes (météo, technique, simulateur, pilote absent, contrôle absent, réseau, zone non activée, ravitailleur absent, manque de temps…) : elles remontent sur la plaquette de l'ordre de vol (MNE).
3. Complétez si besoin « Résultat détaillé », « Incidents » et « Anomalies techniques ».

Ce résultat alimente le taux de réussite et le graphique « Résultats » des reportings.

### Appareil(s) +

Une carte par appareil engagé ; il y en a toujours au moins un. Le « + » du titre ajoute un appareil.

1. Tapez l'immatriculation (`F-ZB…`) : les appareils connus sont proposés avec type, indicatif, opérateur
   et base. Choisissez-en un : type, catégorie, indicatif, exploitant OACI, base et équipements se
   remplissent.
2. Ou partez de l'indicatif : `ctm58` dans « Indicatif » donne la série, le numéro, l'indicatif complet
   et l'« Indicatif plan de vol (7 car. max) ».

| Bouton / champ | Rôle |
|---|---|
| « Fiche appareil ↗ » | ouvre la fiche de l'appareil (dès que l'immatriculation est saisie) |
| « ⟲ Effacer » | vide l'appareil pour relancer la recherche (mauvais appareil ou mauvais type) |
| « Exploitant OACI (OPR/, case 18) » | déduit de l'organisme ou de l'appareil connu |
| « Base de départ », « Base de retour », masses, « Endurance disponible (min) », « Configuration mission » | à compléter si utile |
| « Équipements / capacités techniques de l'appareil » | replié ; repris de l'appareil connu ou du plan de vol |

Les champs se filtrent entre eux (voilure, type, série). Choisir un autre appareil remplace ce qui avait
été repris automatiquement, jamais ce que vous avez saisi. Un type inconnu sera ajouté à la base locale
à l'enregistrement.

### Équipage +

Membres d'équipage et leurs fonctions ; il y a toujours au moins une ligne. Le « + » du titre ajoute un
membre, la croix « × » en bout de ligne le retire.

| Colonne | Contenu |
|---|---|
| « Rôle » | fonction à bord, liste propre à la famille |
| « Nom / indicatif » | trigramme ou nom ; les noms déjà saisis sont proposés |
| « Appareil n° » | numéro de la carte appareil (1 par défaut) |
| « Remarque » | texte libre |

Le nom saisi sert de clé à la [fiche équipage](#fiche-équipage) : écrivez-le toujours de la même façon.

### Tâche / ordre de mission

Objectif et consignes de la mission : « Objectif », « Instructions particulières », « Priorité ».
Pour une mission affectée, l'objectif et les instructions sont déjà remplis depuis la mission. Ces
textes figurent dans la section « 5. Tâche » du compte rendu.

### Capacités / techniques employées

Techniques et moyens employés en vol, à cocher dans des groupes (treuil, largage, NVG, vol de nuit…).

- Ce bloc est **masqué par défaut** : cliquez « Afficher » dans son titre pour l'ouvrir.
- À la création d'une mission, les cases sont reprises de la dernière mission de la même série : il
  suffit de les régler une fois.
- Les capacités cochées font apparaître certains blocs propres à la famille (ex. SAR : treuillage si
  l'appareil est un hélicoptère et que le treuil est coché).

### Chronologie

Heures clés du vol, de cales à cales, en heure locale (HH:MM) : « Briefing », « Mise en route », « Départ
des cales », « Décollage », « Entrée zone », « Début mission », « Fin mission », « Sortie zone »,
« Atterrissage », « Arrivée aux cales », « Arrêt moteurs ».

1. Saisissez les heures, ou cliquez le bouton « maintenant » à côté du champ (heure locale du terrain
   de départ ; à défaut, heure de Paris).
2. Les durées se calculent seules dans « Calculs automatiques ».

Chaque heure crée et tient à jour l'événement horodaté correspondant. Une heure incohérente (sortie de
zone avant l'entrée, heure invalide, chronologie de plus de 20 h) est surlignée et listée sous les
calculs. Le suivi réseau et l'import d'une page de tracker remplissent aussi ces heures.

### Carburant (appareil principal)

Carburant embarqué, consommé et restant de l'appareil n° 1.

- Choisissez l'« Unité » (kg, lb, L, US gal), puis saisissez « FOB départ », « Roulage », « Au
  décollage », « À l'atterrissage », « Aux cales », « Réserve », « Carburant de dégagement ».
- Pour les familles qui travaillent sur zone : « Arrivée sur zone », « Carburant sur zone », « Départ de
  zone ».
- « Carburant consommé » et « Carburant sur zone » se calculent dans la colonne de droite.
- Un carburant final supérieur au carburant de départ est signalé.

### Blocs propres à la famille

Ils se placent après le Carburant et avant les Événements. Leur liste figure dans le tableau
[Blocs propres à chaque famille](#blocs-propres-à-chaque-famille). Certains n'apparaissent que pour une
série, une catégorie d'appareil ou une capacité cochée : la ligne « Contexte d'affichage », sous les
calculs, rappelle la série, les types d'appareil et les capacités pris en compte.

### Événements horodatés +

Événements notables, avec leur heure, en tableau compact (une ligne par événement, la description sur
une 2e ligne).

1. « + » dans le titre (« + Ajouter un événement ») ajoute une ligne.
2. Renseignez « Heure locale » (l'heure « UTC » se calcule), « Type », « Position », puis si utile
   « Altitude », « Vitesse », « Cap », « Carburant », « Description », « Résultat ».
3. « × » en bout de ligne retire l'événement.

Les types proposés comprennent les événements communs (décollage, déroutement…) et ceux de la famille
(SAR : début / fin de recherche, balise détectée, survivant localisé, survivant récupéré, kit SAR
largué…). Les événements créés par la chronologie suivent ses heures ; un événement complété à la main
n'est jamais retiré.

### Étapes / sorties / rotations +

Étapes, sorties et rotations du vol, une ligne chacune : « De », « À », « Décollage », « Atterrissage »,
« Passagers », « Fret (kg) », « Remarque ». Le « + » du titre ajoute une étape.

- Les terrains sont proposés d'après la base des aérodromes.
- Les étapes comptent dans les sorties, passagers et fret des reportings.
- La famille HEMS n'a pas ce bloc : elle a son propre bloc « Destinations / étapes ».

### Remarques

Observations libres et enseignements : « Observations » et « Enseignements (lessons learned) ». Ils
forment les sections « 13. Remarques » et « 14. Enseignements » du compte rendu. Une mission affectée y
dépose un rappel de la mission d'origine et de sa charge.

### Trace réseau IVAO / VATSIM

Trace du vol sur IVAO ou VATSIM.

| Champ | Rôle |
|---|---|
| « Réseau » | « Hors réseau / non renseigné », IVAO ou VATSIM |
| « ID IVAO (VID) », « ID VATSIM (CID) » | repris de votre profil pilote (menu ☰ › Profil pilote) |
| « URL de la trace » | lien vers la trace ; il apparaît dans le CR (« Ouvrir la trace ») et dans les reportings |

Le réseau renseigné alimente le graphique « Réseau » et l'indicateur « En réseau » du reporting.

### Navigation

Terrains, route, points et zone de travail. Le bloc commence par la barre **Plan de vol déposé** :

| Bouton | Source |
|---|---|
| « Dernier OFP SimBrief » | votre identifiant SimBrief du profil pilote |
| « Plan de vol IVAO (vol en cours) » | votre VID |
| « Plan de vol VATSIM (en cours ou déposé) » | votre CID |

Ces boutons remplissent **seulement les champs vides** : appareil, équipements OACI, route, points
tournants, niveaux, terrains, METAR / TAF et masses et carburant prévus (SimBrief).

Champs : « Départ (ADEP) », « Destination (ADES) », « Dégagement (ALTN) », « Route » (seules les routes
déjà utilisées pour le même trajet sont proposées), « Points tournants (un par ligne) »,
« Coordonnées », « Altitude / FL », « Altitude minimale », « Vitesse (kt) », « Distance (NM) ». Selon la
famille : « Zone d'opération », « Rayon (NM) », « Corridor », « Attente / orbite ».

### Environnement / météo

Conditions météo et d'environnement rencontrées. En général, **rien à faire** : dès que le terrain de
départ, la date et l'heure sont connus, la page calcule un METAR à l'heure du vol (modèle Open-Meteo), le
vent, la température, le QNH, la visibilité, le plafond, l'« Altitude densité (ft) », le lever et le
coucher du soleil et la « Phase jour / nuit ».

- Ce que vous saisissez vous-même n'est jamais remplacé.
- Les boutons « METAR actuel du terrain de départ (VATSIM) », « METAR calculé à l'heure du vol
  (Open-Meteo) » et « Calculer lever / coucher du soleil » refont le calcul à la demande.
- Un METAR collé dans « METAR » est analysé (vent, T°, QNH, visibilité, plafond).
- « État de mer » n'apparaît que pour une mission maritime, embarquée ou sur amphibie ;
  « Illumination (lune…) » que pour un vol de nuit ou sous NVG.

### Calculs automatiques

Colonne de droite, mise à jour pendant la saisie : « Temps bloc », « Temps de vol », « Transit aller »,
« Temps sur zone », « Transit retour », « Temps mission », « Carburant consommé », « Carburant sur zone ».

- Dessous, les anomalies éventuelles commencent par ⚠ (heure invalide, heure avant l'étape précédente,
  chronologie de plus de 20 h, date future, carburant incohérent). Un clic amène au champ concerné.
- « Contexte d'affichage » rappelle la famille, la série, les types d'appareil et les capacités, qui
  décident des blocs affichés.

### Compte rendu

Aperçu du compte rendu, sous les calculs, actualisé pendant la saisie et à chaque changement de langue.
Il compte 14 sections (identification, résumé rédigé automatiquement, appareils, équipage, tâche,
météo, chronologie, exécution, données spécifiques, résultats, carburant, incidents, remarques,
enseignements).

| Bouton | Rôle |
|---|---|
| « Générer / actualiser le CR » | refait l'aperçu à la demande |
| « PDF / Imprimer » | imprime **seulement** le compte rendu (ou l'enregistre en PDF) |
| « Version publique (données sensibles masquées : CR, impression, export) » | case visible pour les familles à données sensibles (COMMAND, ISR, LE, SOF, SPECIAL) |

La version publique s'applique aussi à l'export YAML (fichier suffixé `_public`) et à l'envoi.

### Analyser / importer…

Menu de l'en-tête pour remplir le CR à partir d'un texte collé. **Seuls les champs vides sont remplis.**

1. Ouvrez le menu, puis collez (Ctrl+V) dans la zone : l'analyse est immédiate. Ou cliquez « Coller
   depuis le presse-papiers » (Chrome demande l'autorisation une fois).
2. Textes reconnus : plan de vol OACI « (FPL-…) », page du tracker IVAO (détails d'un vol ou liste des
   connexions), page d'un vol StatSim (VATSIM), historique VATSIM (JSON), METAR.
3. Le résultat indique la source reconnue et les champs remplis ; le bouton devient « ✓ Valider ».

Les liens « ↗ Tracker IVAO (mes connexions) » et « ↗ Mes vols StatSim (VATSIM) » ouvrent vos pages. Le
lien « → CR », à glisser dans la barre des favoris, copie la page du tracker en un clic. En bas,
« Importer (YAML / ancien JSON) » charge un fichier de mission. Détails : [tutoriel](TUTORIAL.md), § 6.

### Suivi réseau

Menu de l'en-tête pour relever les heures pendant le vol.

- « Démarrer le suivi en direct » avant la mise en route, puis **gardez la page ouverte** jusqu'à
  l'arrêt moteur. Toutes les 20 s, la page lit les données publiques IVAO / VATSIM et remplit mise en
  route, décollage, atterrissage et fin de mission. « Arrêter le suivi » l'interrompt.
- Après un vol VATSIM sans suivi : « Récupérer l'historique VATSIM » ouvre l'historique dans un onglet ;
  copiez tout (Ctrl+A, Ctrl+C) et revenez : les heures de connexion sont reprises (à vérifier).
- Il faut votre ID IVAO ou VATSIM (bloc Trace réseau ou profil pilote).

### Brouillon, registre et export

**Brouillon.** Chaque saisie est gardée dans le navigateur (« Brouillon enregistré dans le
navigateur »). Vous pouvez fermer la page et revenir : le brouillon de la famille est rouvert. Quitter
sans avoir enregistré dans le registre affiche un avertissement.

**Enregistrer dans le registre.**

1. La première fois : « Registre des missions ▾ › Dossier du registre… » et choisissez le dossier
   `data/cr` des données (autorisation du navigateur, valable pour toutes les familles).
2. Cliquez « Ajouter au registre » : la mission est écrite dans le registre unique `missions.yaml`
   (toutes familles). Si ce n° de CR existe déjà, la page propose de l'ajouter quand même (doublon) ou
   d'annuler pour corriger.
3. La page passe en modification : « Enregistrer les modifications » range les corrections suivantes.

Sans dossier autorisé, la mission est enregistrée dans le navigateur seulement ; « Télécharger le
registre (YAML) » apparaît alors dans le menu « Registre des missions ». Le menu rappelle le fichier, le
nombre de missions de la famille et le dossier.

**Autres actions.**

| Action | Effet |
|---|---|
| « Mission ▾ › Nouvelle mission » | repart d'un CR vierge (confirmation si le brouillon n'est pas enregistré) |
| « Mission ▾ › Exporter la mission (YAML) » | télécharge un fichier de cette seule mission |
| « Envoyer le CR » | envoie mission, CR (HTML et texte) et calculs au webservice ; la bulle du bouton rappelle le dernier envoi. Une mission non enregistrée demande confirmation |
| « Registre des missions ▾ › Voir le reporting » | ouvre le reporting de la famille |

Tant que le webservice n'est pas réglé, « Envoyer le CR » propose d'ouvrir son paramétrage
(« Paramétrer l'envoi des CR (webservice)… »).

### Blocs propres à chaque famille

Les blocs conditionnels ne s'affichent que si la condition indiquée est remplie. La dernière colonne
donne les indicateurs propres à la famille, repris dans les reportings.

| Famille | Blocs spécifiques (dans l'ordre de la page) | Indicateurs de la famille |
|---|---|---|
| HEMS | Service et statut · Mission médicale · Horaires HEMS · Destinations / étapes (remplace « Étapes / sorties / rotations ») | patients transportés, missions terminées, alerte → décollage (moyenne, ≤ 15 min) |
| FIRE | Ordre de vol · Horaires feux de forêt · Largages et rechargements | largages incendie, recharges / écopages, consommation moyenne (/h) |
| SAR | Alerte et coordination SAR · Personnes recherchées · Zones et schémas de recherche · Contacts détectés · Localisation et récupération · Treuillage (hélicoptère + treuil coché) · Largage de kit SAR (avion ou amphibie + largage coché) | zones de recherche, personnes localisées, personnes secourues, treuillages, kits SAR largués |
| AIRLIFT | Origine, destination et escales · Manifeste de fret · Passagers et chargements particuliers · Piste et opérations au sol · Livraison | passagers, fret (t), charge livrée (t), rotations |
| AAR | Rôle, zone et rendez-vous · Ravitaillés et carburant transféré · Bilan carburant et incidents | ravitaillés, carburant transféré (t), contacts, breakaways |
| MARITIME | Zone maritime et conditions · Contacts navires · Pollutions observées · Transmission du compte rendu | navires détectés, navires identifiés, anomalies, pollutions observées |
| HADR | Catastrophe et contexte · Points d'enlèvement, d'évacuation et abris · Évacués et personnels · Fret de secours · Largage de ravitaillement (série « Ravitaillement par largage » ou largage coché) | évacués, personnels de secours, fret de secours (t), sorties de secours |
| AIRBORNE | Zone de largage (DZ) · Passages de largage | parachutistes, largages, charge larguée (kg), largages sur DZ |
| FI | Installation contrôlée · Passes / runs · ILS (séries ILS, LOC, Glide path) · VOR / DME / TACAN / NDB (séries correspondantes) · Validation de procédure (séries « Validation de procédure », RNAV / GNSS) · Aides visuelles / balisage (séries PAPI / VASI, « Balisage aéroportuaire ») · Conclusion du contrôle | installations contrôlées, passes, anomalies / hors tolérances, en service, hors service |
| SURVEY | Projet et zone de levé · Lignes de levé · Acquisition et données · Points de mesure météo (séries « Reconnaissance météo » et « Recherche atmosphérique ») | heures de levé, lignes réalisées, surface couverte (km²), jeux de données |
| LE | Autorité et coordination · Objectif · Positions successives | suivis, durée de suivi, identifications positives |
| ISR | Tâche de collecte · Capteurs employés · Contacts / pistes · Observations émetteurs / communications (séries SIGINT, ELINT, COMINT) · Couverture et diffusion | contacts, images collectées, enregistrement, couverture moyenne (%) |
| COMMAND | Interception (série « Police du ciel / interception (QRA, MASA) ») · Station et autorité · Unités coordonnées · Fréquences et réseaux · Journal de coordination · Efficacité de la mission | temps sur station, unités coordonnées, relais, coupures de communication |
| COMBAT | Dispositif et zone · Interception (série « Interception / identification (VID) ») · Engagements · Bilan de la séance | engagements, victoires, tirs valides, arrêts de sécurité (KIO) |
| SOF | Unité appuyée · Zones (PZ / LZ / DZ) · Profil et méthodes · Personnels | personnels déposés, personnels récupérés, zones utilisées, missions de nuit sous NVG |
| SPECIAL | Transport VIP / gouvernemental (séries VIP) · Convoyage (séries convoyage) · Essai en vol et Points d'essai (séries essai) · Formation et Exercices (séries formation) | passagers VIP, convoyages, points d'essai conformes / réalisés, exercices réalisés |
| DEMO (démonstration) | Treuillage (hélicoptère + treuil coché) · Largage (avion ou amphibie + largage coché) | cycles de treuil, personnes treuillées, charge larguée (kg) |

Les familles HEMS et FIRE peuvent reprendre leur ancien registre CSV : voir
[Reporting d'une famille](#reporting-dune-famille).

## Fiche appareil
<!-- page: apps/cr/appareil.html -->

La fiche rassemble tout ce qui est connu d'un appareil, repéré par son immatriculation : identité,
statut, activité, vie, performances et missions. Elle sert aux pilotes et au Centre pour suivre un
appareil. On l'ouvre en cliquant une ligne de « Synthèse par appareil » du reporting général, le lien
« Fiche appareil ↗ » d'une carte appareil du CR, une immatriculation dans une fiche équipage, ou depuis
le Flight Planner. Rien n'y est obligatoire : la fiche se remplit au fil des CR.

### En-tête : statut et position

Le titre affiche l'immatriculation, le type et le modèle. Dessous, trois pastilles :

- le **statut** (Disponible, Indisponible, En maintenance, Retiré du service), en couleur ;
- « 📍 Actuellement à » : dernier terrain connu (arrivée de la dernière mission ou du dernier vol du
  journal) ;
- « 🏠 Terrain de rattachement ».

La barre de **période** des reportings (préréglages, dates, ◀ − ▶) est dans l'en-tête : activité,
graphique et tableau la suivent. Un appareil inconnu des bases affiche « Inconnu dans les bases : la
fiche se remplira au fil des CR ».

### Identité

| Élément | Modifiable | Contenu |
|---|---|---|
| « Statut » | oui | liste ci-dessus |
| « Terrain de rattachement » | oui | code OACI, en majuscules |
| « Mise en service » | oui | date |
| « Type », « Variante », « Voilure », « Turbulence de sillage », « Opérateur » | non | repris de la flotte et de la base des types |
| « Fiche flotte » | non | lien vers la fiche de l'appareil sur le site de la flotte |
| « Indicatifs utilisés », « Équipements » | non | relevés dans les missions, avec leur nombre |
| « Notes » | oui | texte libre |

Cliquez « Enregistrer la fiche » : la fiche est gardée **dans ce navigateur** (incluse dans la sauvegarde
locale). L'identité est calculée sur tout l'historique, quelle que soit la période.

« Fusionner avec… / renommer » : choisissez une autre immatriculation puis « Fusionner ». Les missions du
registre qui portent l'ancienne valeur prennent la nouvelle (après confirmation, avec une trace dans
chaque mission) ; la fiche complète celle de la cible.

### Activité

Cartes de la période : « Missions / vols », « Heures de vol », « Heures bloc », « Premier vol »,
« Dernier vol ». Dessous, un graphique des heures de vol par période, empilées par famille.

- Glissez sur le graphique ou cliquez une barre pour zoomer sur cette période.
- Double-cliquez pour dézoomer.

### Vie de l'appareil (maintenance, inspections, incidents…) +

Journal des événements de l'appareil.

1. Le « + » du titre ajoute une ligne en tête, datée du jour, de nature MAINTENANCE, au terrain actuel.
2. Corrigez « Date », « Nature » (MAINTENANCE, INSPECTION, INCIDENT, MODIFICATION, CONVOYAGE, AUTRE),
   « Terrain » et « Description ».
3. « × » supprime la ligne.

Chaque modification est enregistrée aussitôt dans le navigateur.

### Performances et consommation (Flight Planner)

Profil de performance du Flight Planner pour ce type d'appareil.

- Cartes « Montée », « Croisière », « Descente » : consommation horaire et vitesse vraie (et
  vario), plus « Réserve » si elle est connue.
- Courbe RPM / puissance → consommation, quand le profil en contient une (survol pour les valeurs).
- « Ouvrir dans le Flight Planner ↗ » ouvre le planificateur sur ce type.

Sans profil, le bloc affiche « Pas encore de profil de performance pour ce type : le créer dans le
Flight Planner. »

### Missions et vols

Tableau des missions et vols de l'appareil sur la période : date, famille, n°, indicatif, départ →
arrivée, équipage, heures de vol, source (« registre » ou « journal »).

- Cliquez un titre de colonne pour trier.
- Cliquez une mission du registre pour ouvrir son CR en modification ; les vols du journal sont en
  lecture seule.
- Sous le tableau, quand une période est choisie : boutons pour voir les missions avant ou après la
  période, et zoom − / +.

## Fiche équipage
<!-- page: apps/cr/equipage.html -->

La fiche d'un membre d'équipage, repéré par le nom ou le trigramme saisi dans les CR : identité,
qualifications, activité et missions. On l'ouvre en cliquant une ligne de « Synthèse par membre
d'équipage » du reporting général (adresse : `equipage.html?name=PLN`). La période des reportings est
dans l'en-tête, comme pour la fiche appareil.

### Identité

| Élément | Modifiable | Contenu |
|---|---|---|
| « Nom » | oui | nom complet, ajouté au titre de la fiche |
| « Terrain de rattachement » | oui | base du pilote |
| « Fonctions tenues » | non | rôles tenus dans les CR, avec leur nombre |
| « Qualifications (une par ligne) » | oui | texte libre |
| « Notes » | oui | texte libre |

« Enregistrer la fiche » la garde dans ce navigateur. « Fusionner avec… / renommer » réunit deux
écritures d'un même pilote (ex. GRR → RBR) : les missions du registre prennent la nouvelle valeur, avec
une trace, après confirmation.

### Activité

Cartes de la période : « Missions / vols », « Heures de vol », « Premier vol », « Dernier vol ». Puis
« Par type » : heures de vol par type d'appareil. Le graphique empile les heures par famille ; glisser
ou cliquer zoome, double-cliquer dézoome.

Pour un pilote sans mission au registre, les chiffres viennent de la référence si elle le connaît.

### Missions et vols

Même tableau que la fiche appareil, avec en plus la colonne « Immat. » (lien vers la fiche de
l'appareil) et le type. Tri par titre de colonne ; clic sur une mission du registre : CR en
modification ; vols du journal en lecture seule.

## Reporting
<!-- page: apps/cr/mission_operations_reporting.html -->

Le reporting général présente l'activité de **toutes les familles** à partir du registre unique
`data/cr/missions.yaml` : indicateurs, graphiques, synthèses et tableau des missions. Il sert aux pilotes
pour leur bilan et au Centre pour le suivi. Pour y aller : barre latérale › **Reporting**.

### En-tête : période, familles, regroupement, mesure

L'en-tête reste visible en haut de page.

| Élément | Rôle |
|---|---|
| « Nouveau compte rendu » | ouvre la page de choix de la famille |
| Période | préréglage (Toutes les dates, Aujourd'hui, 7 derniers jours, 30 derniers jours, Mois en cours, Année en cours, Période personnalisée), dates de début et de fin, ◀ reculer, − zoom arrière ×2, ▶ avancer |
| « Familles » | une puce colorée par famille : clic pour masquer / afficher, Ctrl + clic pour n'en garder qu'une, « Toutes » pour tout basculer |
| « Regroupement » | Automatique, Jour, Semaine, Mois, Trimestre, Année |
| « Mesure » | Missions, Heures de vol, Heures bloc, Temps sur zone, Heures de mission, Sorties, Distance (NM) |
| « Données » | « Mes missions (registre) », « Journal (vols réalisés) » (lecture seule) ou « Charger / mettre à jour le journal… » |

La période est partagée avec les reportings de famille et les fiches. Familles, regroupement et mesure
sont mémorisés.

### Cartes d'indicateurs

En tête de page : missions, réussite (%), heures de vol, bloc et sur zone (avec la moyenne sur les
missions renseignées), sorties, distance, carburant par unité, personnes / fret, vols de nuit /
crépuscule, en réseau (IVAO / VATSIM), opérations réelles (et exercices), appareils (et types),
équipage. Une carte sans donnée n'est pas affichée.

### Contrôle des données

Ce bloc n'apparaît que s'il y a des missions à corriger. Il liste la famille, le n° de mission, la date
et les anomalies (⚠ heure invalide, chronologie inversée, plus de 20 h, date future, carburant
incohérent, durée déclarée sans heures). Cliquez une ligne pour ouvrir le CR et corriger.

### Activité par période

Barres empilées par famille, selon le regroupement et la mesure choisis (rappelés à côté du titre).

- Survolez une barre pour le détail.
- Glissez sur plusieurs barres, ou cliquez une barre, pour ne garder que cette période : tout le
  reporting suit.
- Double-cliquez pour dézoomer.

### Répartitions

Neuf graphiques, tous calculés selon la mesure choisie (survol pour le détail) :

| Bloc | Contenu |
|---|---|
| « Répartition par famille » | anneau, une couleur par famille |
| « Résultats » | succès, interrompues, déroutées… |
| « Séries (types de mission) » | famille · série |
| « Types d'appareil » | type OACI de l'appareil principal |
| « Capacités employées » | cases cochées dans les CR |
| « Terrains de départ » | ADEP ou base de départ |
| « Jour / nuit » | jour, nuit, crépuscule / aube, non renseigné |
| « Réseau » | IVAO, VATSIM, hors réseau |
| « Exercice / opération réelle » | exercice / simulation, opération réelle |

### Synthèse par famille

Un tableau, une ligne par famille : missions, sorties, réussite (%), heures de vol, vol moyen, bloc, sur
zone, distance, carburant, « Indicateurs de la famille » (largages, personnes secourues, alerte →
décollage…). Cliquez une ligne pour ouvrir le reporting de la famille ; la colonne « Reporting » porte le
même lien (↗).

### Synthèse par appareil

Une ligne par immatriculation : type, indicatifs, familles, missions, heures de vol, bloc, dernière
mission. Cliquez une ligne pour ouvrir la [fiche appareil](#fiche-appareil). Tri par titre de colonne.

### Synthèse par membre d'équipage

Une ligne par nom : fonctions, familles, missions, heures de vol, dernière mission. Cliquez une ligne
pour ouvrir la [fiche équipage](#fiche-équipage).

### Missions (tri, clic pour modifier, suppression)

Tableau de toutes les missions retenues : famille, n° de mission, date, série, type, immatriculation,
indicatif, départ → arrivée, résultat, vol, bloc, sur zone, jour / nuit, trace réseau.

1. Cliquez un titre de colonne pour trier.
2. Cliquez une ligne : le CR s'ouvre en modification dans la page de sa famille.
3. « Supprimer » en bout de ligne retire la mission du registre (avec confirmation).

**« ✎ Modifier dans le tableau »** (dans le titre) rend modifiables date, n° de mission, série,
immatriculation, indicatif, départ / arrivée, résultat, vol et bloc. Chaque cellule est enregistrée
aussitôt dans le registre, avec une trace dans la mission ; « ✓ Terminer » revient à l'affichage normal.
Une durée saisie sans heures est « déclarée » (≈), comptée, et signalée au contrôle des données jusqu'à
la saisie des heures dans le CR.

Sous le tableau, quand une période est choisie : « ◀ n avant la période », « − / + », « m après la
période ▶ ». Les vols du journal sont en lecture seule.

### Registre des missions

| Bouton | Effet |
|---|---|
| « Exporter le registre (YAML) » | télécharge tout le registre |
| « Exporter en CSV (tableur) » | export pour un tableur |
| « Dossier du registre… » | choisit le dossier `data/cr` où écrire `missions.yaml` |
| « PDF / Imprimer » | imprime la page |
| « Importer un ancien registre CSV » | reprend un ancien registre HEMS ou FIRE / GAAR, sans doublon (même n° et date) |

La ligne d'information rappelle le fichier, le nombre de missions et le dossier (ou « navigateur
uniquement »).

## Reporting d'une famille
<!-- page: apps/cr/AAR/aar_reporting.html -->
<!-- page: apps/cr/AIRBORNE/airborne_reporting.html -->
<!-- page: apps/cr/AIRLIFT/airlift_reporting.html -->
<!-- page: apps/cr/COMBAT/combat_reporting.html -->
<!-- page: apps/cr/COMMAND/command_reporting.html -->
<!-- page: apps/cr/FIRE/fire_reporting.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_reporting.html -->
<!-- page: apps/cr/HADR/hadr_reporting.html -->
<!-- page: apps/cr/HEMS/hems_medevac_reporting.html -->
<!-- page: apps/cr/ISR/isr_reporting.html -->
<!-- page: apps/cr/LE/le_reporting.html -->
<!-- page: apps/cr/MARITIME/maritime_reporting.html -->
<!-- page: apps/cr/SAR/sar_reporting.html -->
<!-- page: apps/cr/SOF/sof_reporting.html -->
<!-- page: apps/cr/SPECIAL/special_reporting.html -->
<!-- page: apps/cr/SURVEY/survey_reporting.html -->
<!-- page: apps/cr/MissionCore/demo_reporting.html -->

Le reporting d'une famille ne montre que les missions de cette famille, avec ses indicateurs propres.
On y arrive par « Registre des missions ▾ › Voir le reporting » dans un CR, par une ligne de « Synthèse
par famille » du reporting général, ou par la popup de l'en-tête d'une autre page de reporting.

### En-tête

| Élément | Rôle |
|---|---|
| « famille · sous-type ▾ » | change de famille (ouvre son reporting) ou filtre sur un sous-type (« Tous les sous-types » par défaut) |
| « + Nouveau compte rendu » | ouvre directement la page de CR de la famille |
| Période | même composant et même période que le reporting général |
| « Regroupement », « Mesure » | réglages du graphique d'activité (Missions, Temps de vol, Temps bloc, Temps sur zone), partagés avec le reporting général |
| « Données » | registre ou journal, comme au reporting général |

### Registre des missions

| Bouton | Effet |
|---|---|
| « Exporter le registre (YAML) » | télécharge les missions |
| « Exporter en CSV (tableur) » | export pour un tableur |
| « Importer des missions (YAML) » | ajoute au registre une ou plusieurs missions exportées |
| « Dossier du registre… » | choisit le dossier `data/cr` |
| « PDF / Imprimer » | imprime la page |
| « Importer l'ancien registre HEMS (CSV) » / « Importer l'ancien registre FIRE / GAAR (CSV) » | HEMS et FIRE seulement : reprend l'ancien registre, sans doublon (même n° et date) |

La ligne d'information rappelle le fichier, le nombre de missions et le dossier.

### Synthèse

Cartes de la période et du sous-type choisis : missions, sorties, réussies, heures de vol, bloc, de
mission, temps sur zone, distance, carburant, personnes et fret transportés, puis les **indicateurs
propres à la famille** (voir le tableau [Blocs propres à chaque famille](#blocs-propres-à-chaque-famille)).

### Activité par période

Barres empilées par **sous-type** de la famille, selon le regroupement et la mesure. Même zoom qu'au
reporting général : glisser ou cliquer pour zoomer, double-clic pour dézoomer.

### Répartition détaillée

Quatre listes à barres (les 8 premières valeurs) : « Par série », « Par résultat », « Par type
d'appareil », « Par capacité employée ».

### Missions (tri, clic pour modifier, suppression)

Colonnes : n° de mission, date, série, appareil, immatriculation, indicatif, résultat, vol, bloc, sur
zone, trace, « Contrôle » (⚠ nombre d'anomalies, détail au survol).

- Clic sur un titre de colonne : tri.
- Clic sur une ligne : le CR s'ouvre en modification.
- « Supprimer » en bout de ligne, avec confirmation.
- « ✎ Modifier dans le tableau » : mêmes règles qu'au reporting général.

## Cartes de vol
<!-- page: apps/planner/map_planner.html -->

Cette page sert à préparer vos propres cartes de vol : cheminement, carte de la route, approche, rendez-vous, terrain de destination et profil vertical.
Elle est ouverte à tous les pilotes. Pour y aller : barre latérale « Cartes de vol », bouton « Ouvrir dans les Cartes de vol » d'une mission dans Mes missions, ou bouton « Cartes de vol » du planificateur carburant.
Elle reprend le moteur du studio cartographique du Centre, mais travaille dans un espace propre à votre navigateur : vos réglages ne modifient jamais la mission du Centre.
Chaque bloc se replie (« Masquer » / « Afficher ») et se déplace (poignée ↕). La base SIA doit être lue une fois dans ce navigateur (voir le dernier bloc).

### Réception d'une mission (« Ouvrir dans les Cartes de vol »)

La page n'affiche pas de bloc « Mission » : la mission arrive toute seule depuis Mes missions.

1. Dans Mes missions, ouvrez le dossier de la mission.
2. Cliquez sur « Ouvrir dans les Cartes de vol ». L'appareil qui vous est attribué est repris en tête de la mission.
3. La page s'ouvre avec le cheminement et le niveau de la mission dans le bloc « Cheminement », et toutes les cartes prévues par la mission dans « Cartes à produire » (plus `profil_vertical.png`).
4. Réglez au besoin chaque carte, puis générez le ZIP dans « Aperçus et génération ».

Le pied de page indique le nombre de cartes du ZIP (« … carte(s) dans le ZIP + carte d'assemblage »), ou « Aucune mission chargée ».
Mission reçue : « Tracer » et « Carburant » travaillent sur la mission chargée sans la remplacer. « Créer les cartes » demande confirmation avant de la remplacer par un vol libre « Vol départ → destination » construit à partir du cheminement ; sans mission chargée, les cartes sont créées directement.

### Cheminement

Ce bloc relie trois vues : le plan de vol (texte), la carte et la coupe verticale. Le survol d'un point dans l'une éclaire les deux autres. Certains messages de la page appellent ce bloc « Route ».

- Champ de route : case 15 du plan de vol OACI, ou liste à virgules (par exemple `LFBO N0160A055 DCT TOU UN460 NTS DCT LFRN`). Vide : route de la mission.
- « Niveau » : niveau de croisière (« FL65 » ou « 6500 »).
- Menu « Voies aériennes » / « RTBA (basse hauteur) », puis « Chercher » : calcule une route entre les points du champ. Le résultat remplace le champ.
- « SimBrief » : reprend la route du dernier OFP. L'identifiant SimBrief se saisit dans ☰ › Profil pilote.
- « Tracer » : dessine la coupe verticale. « Carburant » : ouvre le planificateur carburant avec cette route (distance, niveau, route vraie, appareil).
- « Copier OACI » : copie le plan de vol OACI strict (points non publiés en coordonnées).
- « Syntaxe et utilisation » : rappel des formes acceptées (balises, points de report VFR « MM-CV », « REN300010 », coordonnées « 4330N00125E », niveaux « /A035 », « VFR »…).

Sur la carte : glissez un point pour le déplacer (il s'aimante sur balises, points de report et terrains), cliquez sur la route pour insérer un point, clic droit pour en supprimer un. Sur la coupe : clic pour ajouter un point à cette altitude, glisser pour changer l'altitude, clic droit pour supprimer.

### Carte de contrôle et cadrage (bloc Cheminement)

Sous le champ de route, une carte de contrôle montre la carte choisie avec son profil d'affichage. Elle se redessine à chaque réglage.

| Commande | Effet |
|---|---|
| « Carte » | Carte affichée (par défaut : la carte générale de la route). |
| « Profil » | Profil d'affichage de cette carte (même réglage que dans « Cartes à produire »). |
| « ZIP » | Mettre ou non cette carte dans le ZIP. |
| « Actualiser » | Redessiner l'aperçu. |
| « Garder ce cadrage » | La carte générée reprendra exactement le cadre affiché (zoom et déplacement à la souris). |
| « Recentrer » / « Cadrage automatique » | Revenir au cadrage enregistré / l'oublier pour un cadre calculé d'après la mission. |
| « ⧉ Fenêtre » / « ⤢ Agrandir » | Ouvrir la carte dans une fenêtre séparée / l'agrandir (Échap pour revenir). |

« Réglages du profil : coupe, appareil, vario, sorties » règle la coupe verticale : plancher et plafond (0 = auto), appareil (profils du planificateur carburant) ou taux de montée et de descente, image `profil_vertical.png` dans les sorties, tracé du cheminement sur les cartes.

### Réglages du profil : fond de carte, zones, symboles OACI, éléments

Ce panneau repliable, placé sous la carte de contrôle, règle le profil d'affichage de la carte choisie. Les profils (IFR, VFR détaillé, AIRWAYS…) sont communs à toutes vos missions et gardés dans le navigateur.

- En tête : « Nom du profil », « Fond de carte » (OSM standard, OpenTopoMap, fonds vectoriels…), boutons « Sauvegarder », « Nouveau », « Dupliquer », « Supprimer ».
- Onglet « Fond de carte » : couches OSM (sol, hydrographie, routes, relief, courbes de niveau, sommets…), villes en symboles OACI et seuil de population, libellés de villes, surfaces bâties.
- Onglet « Zones » : familles d'espaces (R / D / P, CTR, TMA, CTA, SIV, TRA, RMZ, TMZ, PJE), symbologie OACI, tranche d'altitude affichée, opacité. « Sélection des zones » : liste blanche ou noire (bouton « Liste blanche » pour basculer), saisie avec complétion (« R 45 A », « @RTBA »…), « Coller une liste… », « Tout supprimer ». « Zones retenues » montre le résultat.
- Onglet « Symboles OACI » : aérodromes (par catégorie, contrôlés ou non, liste blanche), radionavigation, voies aériennes basses et hautes, points de report VFR, survol interdit, parcs et réserves, obstacles.
- Onglet « Éléments » : points tournants, méridiens et parallèles, grille MORA, libellés des villes, hippodrome de ravitaillement, zones de mission et de recherche.

Pensez à cliquer sur « Sauvegarder » pour garder un profil modifié.

### Cartes du vol

Ce bloc crée les cartes d'un vol à partir du cheminement, sans mission du Centre.

1. Saisissez le cheminement et le niveau dans le bloc « Cheminement » (au moins un départ et une destination connus de la base SIA).
2. Facultatif : « Rendez-vous (facultatif) », un point ou des coordonnées « 44.2, 0.6 ».
3. Cochez les cartes voulues : « route (vue d'ensemble, IFR) », « approche », « rendez-vous », « destination ».
4. Cliquez sur « Créer les cartes ».

La page fabrique une mission « Vol départ → destination » avec les cartes cochées et le profil vertical. La carte de rendez-vous n'est créée que si un rendez-vous est saisi.
Ensuite, toute modification du cheminement, du niveau ou du rendez-vous met les cartes à jour automatiquement.
Arrivée depuis le planificateur carburant (bouton « Cartes de vol ») : les cartes sont créées seules dès que la base SIA est chargée.
Messages d'erreur possibles : « Base SIA absente de ce navigateur », « Route : inconnu(s) dans la base SIA », « Aucune carte choisie ».

### Cartes à produire

La liste « Cartes de la mission » donne une ligne par carte :

| Élément de la ligne | Usage |
|---|---|
| Nom du fichier | Clic : afficher la carte dans la carte de contrôle (✎ : cadrage personnalisé). |
| Profil | Profil d'affichage de la carte, ou « Désactivé ». |
| Tracé | « Sans tracé », « Brief : cheminement », « Organisation : route probable », « Cheminement + route probable ». |
| Destinataire | Seulement pour les missions d'exercice : brief, organisation, chiffon ou équipage. |
| « ZIP » | Décocher pour ne pas générer la carte. |
| « × » | Supprimer la carte de la mission. |

Pour ajouter une carte : saisissez un nom (« nouvelle_carte.png »), choisissez le type (générale, cible, détail, zone), puis « + Carte ». Son emprise est la vue affichée.
Sans mission ni cartes créées, la liste indique « Aucune carte : ajoute-en une ci-dessous. »

### Aperçus et génération

1. « Afficher toutes les cartes » : dessine un aperçu de chaque carte avec son profil. Les aperçus ne créent aucun fichier. Clic sur un aperçu : agrandissement.
2. Chaque aperçu garde sa case « ZIP ».
3. « Générer les cartes et le ZIP » (aussi dans le pied de page) : télécharge un ZIP avec chaque carte, la carte d'assemblage et `profil_vertical.png` si cette sortie est cochée.

La « Carte d'assemblage » s'affiche d'elle-même sous les aperçus ; elle reprend le profil de la carte générale.
Formats : menu ☰ › Sorties des cartes (PNG, SVG éditable, largeur PNG de 400 à 5000 px ; 1600 px par défaut).
Si une carte échoue (fond indisponible, délai dépassé), le ZIP contient `rapport_generation.txt` et la liste propose « Réessayer seule ».
Les boutons restent grisés tant qu'aucune carte n'est à produire.

### Base de données SIA

Ce bloc est masqué par défaut : cliquez sur « Afficher ». Il lit le dossier SIA (AIXM) et le garde dans le navigateur. Sans lui, la page ne reconnaît ni terrains, ni balises, ni espaces.

- Bouton « Dossier SIA : … » : choisir le dossier `data/sia` (le navigateur demande l'accès), puis lecture.
- « Reconstruire la base aéronautique » : à faire après chaque mise à jour AIRAC ; lit les zones actives de Paramètres › Maintenance › Données aéronautiques. Une jauge suit la lecture ; « Annuler » l'interrompt sans toucher à la base gardée.
- « Purger le cache » : efface la base gardée (elle sera reconstruite à la prochaine relecture).
- La ligne d'état indique la base gardée, son cycle AIRAC et sa date ; « cycle périmé » s'affiche si un cycle plus récent est en vigueur. « Fichiers analysés » liste les fichiers lus.

C'est le même bloc que Paramètres › Maintenance › Données aéronautiques. La même base sert au profil vertical du planificateur carburant. Détails : [missions SIA](SIA_MISSIONS.md).

## Carburant
<!-- page: apps/planner/flight_performance_planner.html -->

Le planificateur carburant (titre « Flight Performance & Fuel Planner ») calcule le carburant d'un vol à partir du profil de performances de votre appareil. Il trace aussi les altitudes et lois de montée optimales.
Pour y aller : barre latérale « Carburant », bouton « Carburant (planificateur) » d'une mission dans Mes missions, ou bouton « Carburant » des Cartes de vol. La route, la distance, le niveau et l'appareil sont alors repris.
En-tête : menu « Avion », bouton « Récupérer dernier FPL SimBrief », « Unités : kg / lbs ». Les imports et exports sont dans le menu ☰. Détails techniques : [planificateur](FLIGHT_PLANNER.md).

### Choisir l'avion et enregistrer le profil

1. Cliquez sur le bouton d'avion de l'en-tête (« Aucun avion » au départ).
2. Choisissez un profil dans la liste, groupée par catégorie (hélicoptères, jets, monomoteurs, turboprops…).
3. Un type marqué « flotte, sans profil » crée un profil vide : ses performances sont à renseigner.

La barre en bas de page indique « Profil enregistré — … » ou « Modifications non enregistrées — … ». Elle porte « Recharger la base locale », « Enregistrer le profil » et « Supprimer cet avion ».
Si vous changez d'avion avec des modifications non enregistrées, la page propose « Rester », « Abandonner et changer » ou « Enregistrer et changer ».
Menu ☰ : importer profils / CSV / JSON (dont `.lnmperf` de Little Navmap), importer un airframe SimBrief, choisir le dossier performances, exporter le profil `.lnmperf` ou JSON, enregistrer la base locale, restaurer la sauvegarde précédente, exporter ou importer les préférences.

### Devis carburant

1. « Plan de vol (case 15) » : saisissez la route. C'est le même plan que les Cartes de vol (le plus récent l'emporte). La distance, la route vraie et le niveau en sont déduits.
2. Complétez ou corrigez les champs : « Distance (NM) », « Niveau (FL) », « Route vraie (°) », « Taxi (min) », « Vent de (°) », « Vent (kt) », « Réserve (min) », « Contingence (%) ».
3. Facultatif : « Masse au décollage prévue », comparée à la MTOW du type ; « Écart ISA (°C) », ou « Température sol (°C) » avec « Altitude terrain (ft) », ou « Température au niveau (°C) ».
4. Cliquez sur « Calculer ».

Vent laissé vide : la page l'indique (« Vent inconnu : fourchette ±25 kt… ») et donne le carburant en fourchette.
Le bouton « Cartes de vol » ouvre les Cartes de vol avec ce plan de vol ; les cartes et le profil y sont créés à l'arrivée.
« Syntaxe du plan de vol » rappelle les formes acceptées. Sans base SIA dans le navigateur, seuls les points en coordonnées sont reconnus.

### Courbes du devis (altitude et montée optimales)

Après « Calculer », le bloc « Devis carburant » affiche, dans l'ordre :

| Titre | Ce qu'il montre |
|---|---|
| « Altitude optimale — carburant et vitesse » | Trajet entier volé à chaque niveau : plus la courbe est haute, moins on consomme par mille. |
| « Montée optimale — vario et carburant » | Vario disponible et carburant par 1000 ft selon l'altitude. |
| « Vitesses de montée — Badin et TAS selon l'altitude » | Vy, montée rapide, montée économique, loi réglée, Vx. |
| « TAS selon le niveau — croisière et montée » | Vitesse vraie en croisière et en montée. |
| « Comparaison des lois de montée » | Durée, distance et carburant de chaque loi ; ★ : meilleur de la colonne. |
| « Montée par altitude — régimes RPM / N1 » | Table à Vy avec cumuls depuis le sol. |

Survolez une courbe pour lire les valeurs à cette altitude ; cliquez pour épingler un niveau (trait blanc sur toutes les courbes). Le devis est alors calculé à ce niveau.
Les deux curseurs verticaux (vario à gauche, Badin à droite) règlent votre propre loi de montée (« loi réglée »).
La zone grisée « inaccessible » se trouve au-dessus du plafond de l'appareil.

### Résultat

Ce bloc, dans la colonne de droite, suit la page pendant que vous faites défiler les courbes.

- « Block fuel » (en fourchette si le vent est inconnu), « Temps de vol », « TOD ».
- Base du calcul : niveau et loi de montée retenus.
- Détail : taxi, montée, croisière, descente, contingence, réserve ; masse au décollage prévue et MTOW si vous l'avez saisie (en rouge si elle est dépassée).
- Fiche du curseur (⌖ au survol, 📌 épinglé) : carburant et temps du trajet à ce niveau, vario max, vitesses de montée ; « désépingler » retire l'épingle.
- Groupe repliable « Régimes de vol — profil ↔ cartographie » : Badin, vario, régime moteur et débit par phase, comparés à la cartographie moteur. Il contient aussi le champ « SimBrief Airframe Internal ID » et les liens vers les fiches des appareils de ce type.

« Épingler » garde le bloc entier quand il suit la page ; sinon, il se replie. Sous le bloc, un panneau par courbe donne les optimums, les limites (plafond, niveau demandé) et une aide à la lecture. Une colonne d'instruments reprend Badin, vario, altitude, carburant et temps de vol.

### Performances moteur — RPM / puissance / consommation

Ce bloc (titre d'origine « Fiche performance moteur ») donne la consommation pour un régime moteur.

1. Saisissez « RPM / N1 ». Les champs « Altitude (ft) » et « Phase » complètent la fiche.
2. Cliquez sur « Interpoler ».
3. Lisez le « Débit total » et sa fourchette min.–max. (interpolation linéaire dans la table).

Sous la fiche, la « Courbe RPM / puissance → consommation » trace les débits min., nominal et max. selon le régime. Survolez-la pour lire les valeurs à un régime donné. Le point interpolé y est marqué.
Sans table RPM dans le profil, la page affiche « Courbe RPM absente du profil. » ou « Aucune cartographie chiffrée ».

### Table RPM / puissance → consommation

Cette table liste les points de la cartographie moteur du profil actif : « RPM / N1 », « Min. », « Nominal », « Max. », « Régime de vol », « Commentaire ».
Cliquez sur un titre de colonne (↕) pour trier.
Elle est en lecture seule : pour la modifier, utilisez le bloc « Cartographie moteur — édition RPM / puissance → consommation ».
Sans données, elle affiche « Pas de courbe RPM dans ce profil. »

### Données du profil — JSON ⇄ Little Navmap

Ce bloc montre tous les champs du profil, exportés tels quels dans le fichier `.lnmperf` de Little Navmap.

- Groupes : « Identité et format », « Carburant et opération », « Piste et alternat », « Montée », « Croisière », « Descente », « Régime et consommation ».
- Le carburant s'affiche dans l'unité choisie (kg ou lbs).
- Quand le type a une fiche EUROCONTROL APD, une étiquette « APD … » apparaît à côté des champs comparables : un clic reprend cette valeur. Rien n'est écrit sans clic. Sinon : « Aucune donnée EUROCONTROL APD pour ce type ».

Une case vide reste vide et bloque l'export `.lnmperf` : aucune valeur n'est inventée.
Après modification, cliquez sur « Enregistrer le profil » dans la barre du bas.

### Cartographie moteur — édition RPM / puissance → consommation

Ce bloc sert à saisir ou corriger la table régime → consommation, point par point.

1. « Ajouter un point » crée une ligne.
2. Remplissez « RPM / N1 », « Min. », « Nominal », « Max. », « Régime de vol » et « Commentaire ».
3. Enregistrez le profil (barre du bas).

Astuce : une plage écrite dans le commentaire, par exemple « 1 000–1 300 kg/h total », remplit min., nominal et max. à l'enregistrement.
Sans avion choisi, le bloc affiche « Choisis ou importe un profil. »

### Calibration SimBrief depuis OFP

Ce bloc recale le profil actif sur un plan de vol SimBrief réel.

1. Cliquez sur « Récupérer dernier FPL SimBrief » (en-tête). L'identifiant se saisit dans ☰ › Profil pilote. À défaut, téléchargez l'OFP JSON sur simbrief.com et utilisez « Importer OFP JSON ».
2. L'OFP remplit le devis et le plan de vol ; le profil de l'appareil est créé et calibré. Le message indique une calibration complète ou partielle (phases mesurables).
3. « Calibrer le profil actif » applique la calibration du dernier OFP au profil choisi.
4. « Exporter audit JSON » télécharge l'audit.

« Traçabilité de calibration » (dans ce bloc) rappelle la dernière calibration appliquée ; sinon « Pas de calibration OFP ».

### Profil vertical

Ce bloc dessine une coupe le long du plan de vol du devis : relief, espaces aériens, obstacles, trajectoire (TOC, TOD).

1. Vérifiez le plan de vol dans « Devis carburant ».
2. Choisissez le « Profil d'affichage (studio) » : ce sont les mêmes profils que dans les Cartes de vol.
3. Réglez « Plancher (ft) » et « Plafond (ft, 0 = auto) ».
4. Cliquez sur « Tracer le profil ».

La montée suit le modèle de performances de l'avion actif ; la descente suit son vario. Un plan sans niveau (VFR) n'a pas de trajectoire.
Un OFP SimBrief importé remplit la route et trace le profil tout seul.
Il faut la base SIA de ce navigateur, lue dans les Cartes de vol (bloc « Base de données SIA ») ou dans Paramètres › Maintenance. Sans elle, seuls les points en coordonnées sont reconnus, sans espaces aériens.

### Audit OFP — valeurs brutes et calculées

Ce tableau compare, phase par phase, les valeurs lues dans l'OFP et les valeurs recalculées : « Temps », « Distance », « Carburant », « FF calculé », « TAS / GS », « Vario ».
Il se remplit après un import d'OFP (« Récupérer dernier FPL SimBrief » ou « Importer OFP JSON »).
Sans OFP : « Aucune donnée OFP. »
Utile pour comprendre une calibration partielle ou un écart avec SimBrief.

### JSON importé / SimBrief

Ce bloc affiche le contenu brut du dernier fichier importé (OFP SimBrief ou JSON).
- « Copier JSON » : copie le contenu dans le presse-papiers.
- « Effacer » : vide l'affichage (le profil n'est pas touché).

Sans import : « Aucun JSON chargé. »

## Atterrissages
<!-- page: apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html -->

Ce tableau de bord (titre « Landing Performance — Synthèse ») analyse la qualité de vos atterrissages à partir des fichiers exportés du simulateur : score, taux de chute, G, par appareil et dans le temps.
Pour y aller : barre latérale « Atterrissages ». Le fichier est lu dans le navigateur ; rien n'est envoyé.
Le dernier fichier chargé est gardé et rechargé à l'ouverture. Ses appareils sont aussi proposés dans le menu « Avion » du planificateur carburant. Détails : [tableau de bord des atterrissages](LANDING_DASHBOARD.md).

### Chargement du fichier

1. Cliquez sur « Choisir un fichier » (« Fichier de données ») ou sur ☰ › « Choisir les fichiers CSV / LOG ». Vous pouvez aussi déposer les fichiers sur la page.
2. Choisissez un ou plusieurs fichiers CSV ou LOG (ou déposez-les ensemble) : ils sont réunis en un seul jeu de données, nommé « premier.csv + n » ; les colonnes sont associées par leur nom, et un atterrissage présent dans deux fichiers n'est compté qu'une fois.
3. La page indique le format reconnu : « Format riche détecté » (score, FPM, G, vitesse sol…) ou « Format historique allégé détecté » (progression estimée sans score ni G final).

Avant tout fichier, la page affiche « Choisis ou dépose un fichier CSV ou LOG. »
La ligne d'état rappelle le fichier, le nombre de mesures utilisées, l'appareil, les filtres actifs et la période.

### En-tête : appareil, période, tendance

- « Appareil » : « Tous », ou un type (avec son icône).
- « Période » : « Toutes les dates », « Aujourd'hui », « 7 derniers jours », « 30 derniers jours », « Mois en cours », « Année en cours », « Période personnalisée », avec boutons pour reculer, élargir ou avancer. La période est mémorisée pour chaque fichier.
- « Méthode de tendance » : « Absolu / Asymptote », « Premiers 25 % ↔ Derniers 25 % » ou « Moyenne glissante » (avec « Lissage » : 5 ou 10).
- « Imprimer / PDF » : imprime la page.

Options de l'analyse (menu ☰) : « exclure les mesures manifestement aberrantes », « 95P — exclure les 5 % d'atterrissages accidentels les plus forts », « Crash — exclure les atterrissages déclenchés » (seuils FPM ≤ et G ≥, logique « FPM ou G », « FPM et G », « FPM seul », « G seul »), « Utiliser les champs manquants estimés ».

### Synthèse de la période

En haut du tableau de bord, des cartes donnent les chiffres clés : « Atterrissages », « Score moyen », « Score min / max », « FPM moyen », « FPM min / max », « G moyen », « G min / max », « Butter / Very Good ».
Les boutons « − » et « + » changent la taille de ces cartes.
Dessous, la conclusion de tendance : progression ou régression probable, légère, « Aucune progression nette », ou « données insuffisantes » (il faut au moins quatre mesures exploitables).
Le texte explique la méthode choisie (par exemple asymptote estimée et gain restant).

### Évolution

Ce bloc trace les indicateurs dans le temps, avec leur tendance : score, taux au toucher (FPM), force G, vitesse de rotation du nez, et le nuage « FPM × G — distribution des touchers ». En format allégé : indice technique relatif, landing rate brut, float.

- Survolez un point : date, appareil, score, évaluation, arrondi.
- Glissez horizontalement sur un graphe pour sélectionner une période.
- La bande « Historique complet — glisser pour sélectionner », sous chaque graphe, permet de choisir une période sur tout l'historique.

La période choisie s'affiche dans l'en-tête ; ses boutons permettent de revenir en arrière.
L'indice technique relatif n'est pas un score officiel.

### Synthèse par appareil

Ce tableau donne une ligne par appareil : « Appareil », « Type », « N » (nombre d'atterrissages), « P95 score », « σ score », « Min », « Max », « P95 FPM », « σ FPM », « P95 G », « σ G », « Pente score », « ρ », « Conclusion ».
Cliquez sur un titre de colonne pour trier (▲ / ↕).
La colonne « Conclusion » reprend la tendance de chaque appareil.
Choisissez un appareil dans l'en-tête pour n'analyser que lui.

### Qualité des données

Ce bloc montre ce que les filtres ont retenu ou écarté :

| Ligne | Sens |
|---|---|
| « Mesures totales » | Lignes lues dans le fichier. |
| « Jugées plausibles » | Mesures conservées par le filtre de plausibilité. |
| « Partielles / estimées » | Mesures complétées par estimation. |
| « Signalées comme aberrantes » | Mesures physiquement impossibles. |
| « Exclus comme crash » | Atterrissages écartés par le filtre crash (s'il est actif). |

Les règles appliquées sont rappelées dessous (par exemple vitesse sol < 25 ou > 250 kt, |FPM| > 5000, G < 0,10 ou > 12).

### Atterrissages

Ce tableau détaille chaque atterrissage retenu : « Date », « Appareil », « Score », « Évaluation », « FPM », « G », « Vitesse sol kt », « Float s », « Nez °/s », « Arrondi », « Tangage », « Inclinaison », valeurs « log estimé », « Source », « Champs estimés », « Qualité donnée ».
Cliquez sur un titre de colonne pour trier. Par défaut, le tableau est trié par date.
Le tableau défile dans son cadre quand la liste est longue.
Il suit l'appareil, la période et les filtres choisis.
