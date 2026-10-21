# Manuel utilisateur

Ce manuel décrit la suite SO Group Virtual (Virtual Special Operation Group) pour les **pilotes** : un chapitre par page, une section par onglet ou par
bloc, dans l'ordre où ils apparaissent. Dans la suite, l'entrée **« Aide »** de la barre latérale ouvre ce manuel au
chapitre de la page en cours. Le Centre et l'administration de la suite sont décrits dans le
[manuel administrateur](MANUEL_ADMINISTRATEUR.md) ; pour un premier compte rendu pas à pas, voir le
[tutoriel](TUTORIAL.md). Index de toute la documentation : [index documentaire](README.md).

Captures réalisées le 12 octobre 2026 dans l’interface française. Les valeurs affichées, les rubriques disponibles et le design peuvent varier selon votre profil et vos réglages.

## Prise en main
<!-- page: index.html -->

La suite « SO Group Virtual » rassemble dans le navigateur tout ce dont le pilote a besoin : missions affectées par le Centre, disponibilités, cartes de vol, carburant, comptes rendus (CR), atterrissages et reportings.
Toutes les pages partagent les mêmes repères : une barre latérale à gauche, un en-tête en haut, parfois des onglets, puis des blocs.
Ce chapitre décrit ces éléments communs ; les chapitres suivants détaillent chaque page.
La page d'accueil (`index.html`) liste les applications sous forme de cartes et affiche la version de la suite.
Ouvrez la suite par le lanceur ou un favori : une page de la suite ouverte depuis un lien d'un autre site (messagerie web, forum…) est refusée, pour que ce site ne puisse rien y lire ni y déclencher.

### La barre latérale

La colonne de gauche donne accès aux applications. L'entrée de la page affichée est mise en évidence.

Ce qu'elle montre dépend de votre **niveau d'utilisation** (Mon profil › « Niveau d'utilisation ») : au plus sept entrées, jamais plus que ce que votre usage demande.

| Entrée | Ce qu'elle ouvre | Niveau |
|---|---|---|
| « Mes missions » | Page d'entrée : prochaine mission, comptes rendus à écrire, disponibilités ; dossiers des missions affectées (pastille rouge : missions non lues) ; première entrée à tout niveau | 1 |
| « Compte rendu » | Saisie d'un compte rendu de mission ; onglet « Flotte » : où sont les appareils (carte, filtres, dernier vol) | 1 |
| « Planning » | Planning des ordres de la semaine (Tableau, en lecture seule au niveau 1 ou sans le Centre) ; au niveau 4, créneaux communs et missions probables de la page ODV | 1 |
| « Missions » | Générateur de mission et registre, en onglets ; studio cartographique au niveau 4 | 3 |
| « Outils » | Cartes de vol, carburant, atterrissages, analyse des missions (outils cochés dans Mon profil, tous au niveau 4) | 1 à 4 |

- Le niveau range l'interface, il ne donne aucun droit : les pages du Centre (Missions, Planning ODV, modification du Tableau) demandent toujours le Centre activé.
- En bas de la colonne : « Paramètres » (Mon profil, Apparence, Centre, Installation, Maintenance, Premier lancement, en onglets) et **« Aide »**. Ces deux entrées restent fixées en bas de l'écran : seule la liste du haut défile quand il y a trop d'icônes (fenêtre de moins de 460 px de haut : toute la barre défile).
- « Aide » ouvre la documentation dans une fenêtre, au-dessus de la page en cours, directement au chapitre de cette page. La fenêtre se ferme par ✕, Échap ou un clic à côté ; rouverte, elle reprend là où vous en étiez. « ↗ » l'ouvre en page entière (Ctrl-clic sur « Aide » : dans un nouvel onglet). Elle remplace l'ancienne entrée « Menu ». Elle fonctionne aussi quand la suite est ouverte depuis le disque, sans le lanceur : les documents sont intégrés à la page. Sur téléphone, le texte vient d'abord : le sommaire (recherche, index, plan du document) est replié derrière « Sommaire ▾ » en tête de page, et « ↑ Sommaire » à la fin de chaque chapitre le rouvre.
- Le logo en haut de la colonne ouvre le site de la compagnie virtuelle dans un nouvel onglet.
- La barre est masquée sur un écran étroit (moins de 760 px) et à l'impression. On peut la masquer ou l'afficher toujours : Apparence › Icônes › « Barre latérale ».

### L'en-tête

L'en-tête porte le titre de la page et son sous-titre. À droite se trouvent les outils, qui n'apparaissent que lorsqu'ils servent :

| Élément | Rôle |
|---|---|
| Pli cacheté (enveloppe rouge avec un nombre) | Des missions qui vous sont affectées ne sont pas encore lues. Un clic ouvre « Mes missions ». |
| « Synchroniser (n) » | Échange les données partagées avec le dépôt commun. N = modifications à envoyer + mises à jour à recevoir. Aux niveaux 1 et 2, une pastille remplace le nombre (il reste en tête de l'infobulle) ; le compteur « (n) » s'affiche aux niveaux 3 et 4. |
| « Sauvegarder dans le dossier (n) · dernière : … » (bouton rouge) | Rappel de sauvegarde des données locales, affiché à partir de 10 modifications non sauvegardées. |
| « ⚠ n » | Alertes de la page déjà effacées de l'écran : un clic les relit. |
| Drapeau « Langue » | Choix de la langue : « Auto » (langue du navigateur), Français, English, Deutsch, Español. |
| ☰ | Menu complet de la suite. |

**« Synchroniser »** n'existe que si la suite est ouverte avec le lanceur et que le dossier `data/` est un dépôt git.
- Un clic écrit d'abord les fichiers gardés dans le navigateur, puis envoie vos modifications (signées de votre trigramme), récupère celles des autres et les fusionne.
- En cas de conflit sur une même fiche, la version la plus récente est gardée ; l'autre est copiée dans `_conflits/` et une notification le signale.
- L'infobulle donne le détail (modifications à envoyer, éléments à recevoir, dernière synchronisation). Le bouton montre le dernier état connu ; il est revérifié à la fréquence réglée dans Paramètres › Maintenance › Versions et synchronisations (toutes les 30 minutes par défaut ; aussi à chaque page, 3 fois par jour ou une fois par jour, et « Vérifier maintenant »).
- Sans trigramme réglé, la synchronisation refuse de partir : réglez-le dans Paramètres › Mon profil. Voir [l'architecture de la synchronisation](technique/SYNCHRONISATION.md).

**« Sauvegarder dans le dossier »** copie toutes les données gardées par le navigateur (brouillons, profil, préférences…) dans le fichier `defa_local_store.yaml` du dossier de sauvegarde.
- Le premier clic demande de choisir ce dossier ; sans dossier possible, la sauvegarde est téléchargée.
- Quand le dossier est autorisé, la sauvegarde se fait aussi toute seule au départ de la page et toutes les 5 minutes.
- Les réglages d'affichage (design, langue, disposition des blocs…) sont sauvegardés mais ne comptent pas dans le rappel.

**Le menu ☰** contient, de haut en bas :
- les boutons « Apparence » et « Paramètres » ;
- la liste des pages de la suite, puis les pages de réglage (Mon profil, Centre, Installation, Maintenance, Apparence, Premier lancement) ;
- le groupe « Profil pilote » (trigramme ; ID IVAO, ID VATSIM et SimBrief affichés en lecture, avec « Modifier dans Mon profil ↗ »), repris par toutes les pages ;
- le groupe « Données locales » : « Sauvegarder dans le dossier », « Restaurer / resynchroniser », « Dossier de sauvegarde… », « Télécharger la sauvegarde », « Restaurer depuis un fichier… », et la date de la dernière sauvegarde ;
- le groupe « Page », quand la page propose ses propres actions.

La restauration fusionne : pour chaque donnée, la plus récente l'emporte. Elle sert aussi à retrouver ses données dans un autre navigateur ou sur un autre poste.

### Les onglets en tête de page

Certaines entrées de la barre latérale regroupent plusieurs pages sœurs, présentées en onglets sous l'en-tête :

| Entrée | Onglets |
|---|---|
| « Mes missions » | « Mes missions », « Mes disponibilités » |
| « Paramètres » | « Mon profil », « Apparence », « Premier lancement » (dès le niveau 1) ; « Centre », « Installation » (niveau 2) ; « Maintenance » (niveau 4) |
| « Missions » (Centre) | « Générateur de mission », « Studio cartographique » |

Un clic sur un onglet ouvre la page correspondante. Un clic avec Ctrl (ou Maj) l'ouvre dans un nouvel onglet du navigateur. Les onglets suivent le niveau d'utilisation (Mon profil › « Niveau d'utilisation ») ; une adresse directe vers une rubrique l'ouvre toujours.

### Les blocs

Le contenu des pages est découpé en blocs titrés. Chaque titre de bloc porte deux commandes :
1. « Masquer » / « Afficher » : replie ou déplie le bloc (dans les designs à matières, seule l'icône est visible ; le libellé apparaît en infobulle).
2. ↕ « Déplacer » : saisissez cette poignée et faites glisser le bloc sur un autre : lâché sur sa moitié haute, il se place avant lui, sur sa moitié basse, après ; il peut changer de colonne. Le bloc visé s'éclaire, et la page défile quand on approche du bas de la fenêtre ou de l'en-tête.

La disposition (ordre, blocs masqués) est mémorisée **par page et par navigateur**. Elle est reprise à chaque visite. Menu ☰ › « Réinitialiser l’ordre des blocs » remet l'ordre d'origine de la page (les blocs masqués le restent).
Certains blocs sont masqués d'office tant que vous ne les avez pas affichés une première fois. Les champs de texte (route, remarques…) s'agrandissent avec leur contenu, dans la limite des trois cinquièmes de l'écran (Chrome et Edge).

### Les notifications flottantes

Les messages de la suite (succès, avertissements, erreurs) s'affichent en bas de l'écran, au centre, dans de petites bulles.
- Elles s'effacent seules : environ 5 s pour une information, 8 s pour un avertissement, 12 s pour une erreur.
- Le pointeur posé dessus suspend l'effacement ; la croix « × » ferme la bulle tout de suite.
- Quatre messages au plus restent à l'écran.
- Un rappel répétitif (par exemple « Base SIA absente de ce navigateur… » du Studio cartographique et des Cartes de vol) ne s'affiche qu'**une fois par session** du navigateur. Certains messages sont réservés aux niveaux d'utilisation supérieurs : en dessous, ils ne s'affichent pas, mais les avertissements et erreurs restent au journal du témoin « ⚠ n ».
- Les avertissements et erreurs effacés restent consultables par le témoin « ⚠ n » de l'en-tête : « ACK » acquitte une alerte, « Tout acquitter » les acquitte toutes, « Vider » efface la liste. Ce journal est perdu au changement de page.
- Une tâche longue (lecture, génération…) affiche une barre de progression dans la même pile. Quitter la page pendant la tâche demande une confirmation. Quand la tâche peut être interrompue, la barre porte un bouton **« Arrêter »** : l'étape en cours se termine, les suivantes ne sont pas lancées, puis la bulle dit « Annulé. ». Le bouton existe pour la génération et les aperçus des cartes (Studio cartographique et Cartes de vol : arrêt entre deux cartes), le calcul de la MORA (d'une zone, de la grille complète ou par blocs), l'import de la MILAIP ENR 5.7 et la mise en place des zones (Maintenance), et la lecture du dossier des missions (Registre).
- Une tâche arrêtée dit ce qui reste partiel. Cartes : une génération arrêtée ne télécharge aucun ZIP (studio du Centre) ou n'affiche aucune image (Cartes de vol) et ne range rien dans le dossier de la mission (un lot de missions dit combien sont terminées) ; les aperçus déjà affichés restent. MORA par blocs (bouton « Arrêter (reprise plus tard) ») : les blocs déjà calculés sont écrits dans `mora.csv` (grille partielle), « Reprendre le calcul complet… » poursuit plus tard. MORA d'une zone, grille MORA et import de la MILAIP : rien n'est écrit. Lecture du dossier des missions : le registre reste inchangé.
- Les messages d'erreur disent ce qui a échoué et quoi faire, au lieu d'un code seul. Exemples : « le serveur ne répond pas — vérifier que la suite est ouverte par le lanceur (lancer.cmd / lancer.sh), le relancer au besoin, puis réessayer » ; « fichier absent — vérifier qu'il est bien dans le dossier attendu (ou le recréer), puis réessayer » ; « espace du navigateur saturé — libérer de la place (Paramètres › Maintenance › Espace disque), puis réessayer ». Autres cas : service en ligne muet, erreur du serveur, accès refusé par le navigateur, délai dépassé ; une erreur inattendue s'affiche « échec » suivi du détail technique entre parenthèses.
- Les questions (« Effacer… ? ») s'ouvrent dans une petite fenêtre avec « Confirmer » et « Annuler ».
- « Connexion bloquée vers … » : la suite n'a contacté que les sites prévus (politique de sécurité du lanceur). Pour un site voulu (webservice des CR, autre dépôt), « Autoriser ce site… » puis « Oui » dans la fenêtre du lanceur ; la liste se revoit dans Paramètres › Installation › Sources et dossiers.
- « ⚠ Protection réduite — rétablir » (bouton rouge de l'en-tête) : les pages de la suite peuvent être ouvertes depuis un autre site ou une extension, réglage choisi dans Paramètres › Installation ; un clic rétablit la protection (elle revient aussi à la fermeture du lanceur).

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
| Cabinet, Carnet de vol, Durci, Aqua, Tactique | Designs à matières (cuir, bois, laiton, aluminium, acier, verre) ; Tactique : nuit, verre fumé, accent cyan, titres Orbitron, sans image. Aqua est le design d'une nouvelle installation. |

- Dans les designs à matières, le dossier de mission de « Mes missions » devient un véritable livre, avec ses animations.
- Le choix se fait dans Apparence : chaque design y est montré en vignette et s'applique aussitôt. Voir le chapitre [Apparence](#apparence).

## Mes missions
<!-- page: apps/pilot/mes_missions.html -->

Page d'entrée du pilote : elle dit d'abord ce qu'il y a à faire — la prochaine mission, les comptes rendus à écrire, les disponibilités de la semaine — puis donne accès au dossier de chaque mission. Elle remplace l'ancienne page « Aujourd'hui » (ses anciens liens mènent ici).
On y arrive par la première entrée de la barre latérale, « Mes missions », par le pli cacheté de l'en-tête ou par l'onglet « Mes missions ».
Aux niveaux Équipage (1) et Planification (2), la page tient sur un écran : « Ma prochaine mission », « Comptes rendus à écrire », « Mes disponibilités » (résumées) et, en bas, une ligne de liens. À partir du niveau Conception (3), la liste complète de la semaine s'ajoute sous les comptes rendus.
Le dossier d'une mission s'ouvre sous les comptes rendus : sur toute la largeur aux niveaux 1 et 2 ; à partir du niveau 3, à côté de la liste (il prend les deux tiers de la largeur). Sur un écran étroit (moins de 1100 px), tout passe sur une seule colonne.
Ligne de liens : « Mes vols », puis, à partir du niveau Planification (2), **Pilote**, **Appareils maîtrisés** et **Simulateurs**, vers Paramètres › Mon profil (rubrique « Identité et réseaux » pour le trigramme ; rubrique « Appareils et simulateurs »). Le bouton « Pilote » affiche le trigramme utilisé pour trouver vos missions et vos disponibilités ; au niveau Équipage (1), il n'apparaît que tant que le trigramme n'est pas réglé.
En mode production, la page demande d'abord de se connecter ; le trigramme est alors celui de la connexion. La page se relit toute seule quand vous changez de langue, de trigramme, de session ou de niveau.
Selon le niveau d'utilisation (Mon profil › « Niveau d'utilisation »), le dossier de mission montre plus ou moins de rubriques (voir « Mission ») ; quelques boutons et liens n'apparaissent qu'à partir du niveau Planification (2) ou au niveau Expert (4).

### Ma prochaine mission

- La mission qui vous est affectée la plus proche (à venir, ou décollée depuis moins de six heures) : heure en UTC, mission et titre, appareil (type et immatriculation), terrain, indicatif ; « convoyage » ou « astreinte, prêt à … » le cas échéant, et « ● nouvelle » tant que vous ne l'avez pas ouverte.
- **« Ouvrir le dossier »** ouvre le dossier sur place, dans le bloc « Mission ». **« Cartes de vol »** et **« Carburant »** ouvrent le dossier puis l'outil avec cette mission, comme les boutons du dossier ; ils ne sont proposés que si l'outil l'est (niveau Expert, ou outil coché dans Mon profil), et pas pour un convoyage. **« Créer le CR »** ouvre le dossier et commence le compte rendu.
- Dessous, « Ensuite, dans les sept jours » : les missions suivantes des sept jours à venir, une ligne chacune (sept au plus) ; un clic ouvre leur dossier.
- Sans trigramme réglé, ce bloc le demande sur place : le champ « Trigramme » (deux à quatre lettres) et le bouton « Enregistrer ». Le trigramme est enregistré dans le profil pilote et la page se relit aussitôt, sans passer par Paramètres › Mon profil. En mode production ou pendant une usurpation, le bloc indique « Aucun trigramme : connectez-vous pour voir vos missions. »
- Sans mission à venir, une seule ligne : « Aucune mission à venir. »

### Comptes rendus à écrire

- Les missions qui vous ont été affectées, déjà décollées depuis moins de 21 jours, pour lesquelles le registre des comptes rendus ne contient aucun CR. La plus récente est en tête ; sept lignes au plus.
- Un CR est connu s'il est issu d'un ordre de mission : le registre (`missions.yaml`) le rattache à l'affectation par sa référence d'ordre (mission, pilote, décollage). Un CR commencé autrement, famille choisie à la main, ne compte pas : la mission reste dans la liste.
- Chaque ligne donne la mission, son titre, l'heure, l'appareil et le terrain, avec deux boutons.
- **« Écrire le compte rendu »** ouvre le dossier de la mission sur place et commence le CR dans la famille de la mission, rempli depuis l'ordre de mission.
- **« Pas de CR »** écarte la mission de la liste (mission annulée, non volée…). Le choix est mémorisé dans ce navigateur seulement ; le registre n'est pas touché.
- Si tout est rendu, une seule ligne : « Aucun compte rendu en attente. »

### Mes missions de la semaine

À partir du niveau Conception (3) : la liste des missions qui vous sont affectées pour la semaine affichée, triées par heure de décollage (UTC).

- **Barre de semaine** : « ‹ » semaine précédente, champ de date (aller à la semaine d'une date), « › » semaine suivante, « ⟲ » retour à la semaine en cours (visible hors de la semaine en cours). Elle va avec celle des disponibilités : changer de semaine ici change les deux blocs.
- **Colonnes** : « Décollage (UTC) » (ou « astreinte » et l'heure à laquelle être prêt), « Mission », « Titre », « Appareil », « Terrain », « Indicatif ».
- Un point ● en tête de ligne signale une mission **nouvelle, pas encore ouverte**.
- Une mention « convoyage » indique que vous convoyez un appareil pour un autre pilote : seul l'ordre de convoyage vous est remis, pas le brief de la mission.
- Un clic sur une ligne ouvre la mission dans le bloc « Mission ».
- Case « afficher aussi les missions passées » : par défaut, une mission disparaît quelques heures après son décollage. Le choix est mémorisé.
- Une adresse `?mission=…` (blocs de tête, « Nouveau compte rendu », anciens liens d'« Aujourd'hui ») ouvre le dossier de cette mission et montre sa semaine (missions passées au besoin) ; avec `?do=cr`, `?do=maps` ou `?do=fuel`, le CR, les Cartes de vol ou le Carburant suivent l'ouverture du dossier.

<!-- capture-manuels: utilisateur-mes-missions -->
![Mes missions : décollage en UTC, titre, appareil, terrain et indicatif de la mission affectée.](images/captures-manuels/utilisateur-mes-missions.png)

*Figure 1 — Mes missions : décollage en UTC, titre, appareil, terrain et indicatif de la mission affectée.*

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

**Selon le niveau d'utilisation** :
- Équipage (1) : l'ordre de mission, le résumé, la route fournie, les cartes, les objectifs, la signature et les plis ;
- Planification (2) : en plus, l'introduction, la cible, la description détaillée, les risques, les équipes engagées, les remarques et les autres rubriques du résumé ;
- Conception (3) : en plus, la fiche technique et l'historique des affectations ;
- Expert (4) : tout le dossier ; sur le canal develop des mises à jour, « Resceller » remet la mission sous scellés (non lue).

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
« Ouvrir dans les Cartes de vol » et « Carburant (planificateur) » n'apparaissent que si l'outil correspondant est coché dans Mon profil › « Niveau d'utilisation » (toujours au niveau Expert). Sans les Cartes de vol, « Créer le CR » devient le bouton principal.
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

Vos disponibilités de la semaine affichée, en heures UTC, à la minute. Le Centre s'en sert pour vous affecter des missions.

- **Barre de semaine** du bloc, à tout niveau : « ‹ », date, « › », « ⟲ » (on saisit souvent la semaine suivante). Au niveau 3, elle va avec celle de la liste.
- **Résumé** : une case par jour (lundi à dimanche, UTC), chaque plage avec la pastille de sa catégorie et ses heures, par exemple « D+ 17:00–22:00 » ; « — » pour un jour sans rien. Semaine vide : une ligne, « Aucune disponibilité saisie cette semaine. »
- **« Modifier ma semaine »** déplie sur place la saisie décrite ci-dessous (palette, grille, plage précise, boutons) ; un nouveau clic la replie. Elle est dépliée d'office quand la semaine est vide, puis reste comme vous l'avez laissée. Le résumé suit chaque retouche.

C'est la même saisie que sur la page Mes disponibilités (chapitre suivant). L'ancienne grille horaire et le lien « Ouvrir la saisie des disponibilités seule » n'apparaissent qu'au niveau Expert.

**Palette** : les catégories sont rangées par groupe, une ligne par groupe (« Disponible », « Exercice SOG », « Occupé », « Indisponible »). Chaque pastille porte la lettre de code ODV et un libellé court ; l'infobulle donne le libellé complet. La catégorie choisie est mémorisée. Sous la palette, une ligne rappelle les thèmes de mission ouverts par la catégorie choisie ; pour une catégorie personnalisée, le lien « Mes types de missions… » mène aux préférences de Mon profil.

Catégories par défaut (le Centre peut modifier cette liste) :

| Groupe | Catégories (code ODV) |
|---|---|
| Disponible | Disponible pour tout (O), Disponible sécurité civile (SC), Disponible défense (D+), Sécurité civile personnalisée (SC-), Défense personnalisée (D-) |
| Exercice SOG | Vol en exercice SOG (S), Contrôle SOG (AM) |
| Occupé | Vol hors SOG (IVAO / VATSIM) (G), DCS (DC), Contrôle hors SOG (IVAO / VATSIM) (AT) |
| Indisponible | Indisponible (IN), Congés (V), Récupération (Q), Activité réelle (IR) |

**La grille** : une rangée par jour, un axe de temps continu de 0 à 24 h UTC, un trait par heure et un trait fin à la demi-heure. Le cadre « Comment s'en servir », replié sous la grille, reprend les règles suivantes.

- **Deux couches.** Le fond dit la nature d'une indisponibilité (groupe « Indisponible ») : la couleur seule, sur toute la hauteur de la rangée. La première couche porte les dispos, exercices et occupations : des rectangles avec leur lettre au centre, l'heure de début à gauche et l'heure de fin à droite (en abrégé, « 8 O 12 », sur un rectangle étroit). Une minute n'a qu'un état : là où un rectangle est posé, le fond dessous ne compte pas, mais il reste en place et revient quand le rectangle s'en va. Le temps sans rien est indisponible.
- **La palette.** Cliquer sur une pastille choisit le pinceau : il dit seulement quoi tracer.
- **Tracer.** Glissez dans le vide d'une rangée, sur une bande de fond ou dans l'espace entre deux rangées : la forme s'aimante à la demi-heure et montre ses horaires pendant le geste. Sur plusieurs jours, un rectangle de sélection pose la même plage horaire sur chaque jour traversé.
- **Saisir une dispo.** Un geste qui part sur un rectangle le saisit, quel que soit le pinceau : un clic le sélectionne, un glisser le déplace (pas de 5 min ; vers le haut ou le bas : même horaire, autre jour), ses bords le redimensionnent ; Maj+glisser trace par-dessus. Les bandes de fond ne sont pas des objets : autour d'une dispo, elles remplissent le reste du jour et ne se déplacent pas ; un geste qui part sur une bande trace.
- **Découper.** La dernière forme gagne : un rectangle tracé sur un autre le découpe, un fond tracé à travers un rectangle aussi. La découpe se voit pendant le geste.
- **Déposer, double-cliquer.** Glissez une pastille de la palette sur une forme : la forme prend cette nature. Déposée sur le vide d'une rangée ou sur le nom du jour, elle couvre toute la journée ; une pastille de fond ne change alors que le fond, les rectangles restent. Double-clic sur une bande : sa couleur devient le fond de toute la journée ; sur une pastille de fond : de toute la semaine.
- **Corriger.** Le ✕ d'une dispo, ou Suppr sur la sélection, l'efface ; les flèches la déplacent (← → 5 min, ↑ ↓ un jour) ; Échap désélectionne. Ctrl+Z annule une retouche, Ctrl+Y ou Ctrl+Maj+Z la rétablit (50 retouches par semaine affichée).
- **Ce qui est enregistré.** Chaque retouche est enregistrée aussitôt (dossier des données, sinon ce navigateur) : il n'y a pas de bouton « Enregistrer ». Au survol, une infobulle donne la plage en clair, par exemple « mercredi 14 octobre, de 00:00 à 05:30 : Indisponible ».

**« Plage précise »** (repliée : un clic sur son titre l'ouvre) : « Groupe », « Catégorie », cases des jours, « de » et « à » (UTC, à la minute), puis « Ajouter ». La plage est posée sur chaque jour coché, avec la règle de la dernière forme. Horaires vides = journée entière ; sans fin, jusqu'à minuit ; une fin avant le début est refusée. Ctrl+Z annule l'ajout.

**Autres boutons**
- « ⧉ Semaine précédente » : recopie la semaine précédente dans la semaine affichée (après confirmation si elle n'est pas vide) ; Ctrl+Z l'annule.
- « Tout effacer » : vide la semaine affichée ; Ctrl+Z l'annule.
- « Écrire dans le dossier des données (n) » : n'apparaît que si des semaines sont restées dans le navigateur ; les écrit dans le dossier partagé.

Le message sous le bloc indique où la saisie est partie : « Enregistré dans le dossier des données. », ou « Gardé dans ce navigateur, le Centre ne le voit pas : … » si le dossier des données n'est pas autorisé (voir [Premier lancement](#premier-lancement), étape 3).
Une ancienne grille horaire existante est importée automatiquement dans la semaine.
Le lien « Ouvrir la saisie des disponibilités seule » mène à la page Mes disponibilités. Ce lien n'apparaît qu'au niveau Expert.

**Sur téléphone** : les blocs se suivent sur une colonne ; le résumé des disponibilités passe sur deux colonnes. Un appui sur une mission amène son dossier à l’écran, et ses actions (« Créer le CR », « Refermer le dossier »…) restent collées au-dessus de la barre du bas pendant la lecture. Les tableaux du dossier (points de la route) défilent dans leur cadre.

## Mes vols
<!-- page: apps/pilot/mes_vols.html -->

Cette page (barre latérale « Mes vols », sous « Mes missions » ; dès le niveau Équipage) est le registre de vos vols
passés, du plus récent au plus ancien, un vol par ligne. Elle réunit deux sources, sans doublon (même date, même
indicatif, même immatriculation : le compte rendu l'emporte) :

- vos comptes rendus, dans le registre des CR (ceux que vous avez rédigés ; ceux qui n'ont pas d'auteur noté sont
  gardés) ;
- le journal des vols de la compagnie importé du site (carte « Journal des vols » du Premier lancement), filtré sur votre trigramme. Sans trigramme
  (Paramètres › Mon profil), seuls les comptes rendus de ce navigateur sont listés.

En tête : « Période » (7 ou 31 derniers jours, 12 derniers mois — par défaut —, tout), la recherche (indicatif, type,
immatriculation, terrain, mission), « Exporter (CSV) » (la liste affichée, mêmes colonnes) et « Analyse détaillée ↗ »
(Outils › Analyse des missions). Dessous, les totaux : nombre de vols, heures de bloc, les trois types les plus volés.
Période et recherche sont gardées dans ce navigateur.

| Colonne | Contenu |
|---|---|
| « Date » | jour du vol |
| « Indicatif » | indicatif du vol |
| « Appareil » | silhouette, immatriculation, type |
| « Trajet » | départ → arrivée (OACI) |
| « Durée » | heures de bloc (sinon de vol) |
| « Mission » | famille, type et opération du CR, ou mission du journal |
| « CR » | n° du compte rendu (lien), ou « sans CR » |

Un clic sur une ligne ouvre son compte rendu ; un vol « sans CR » déplie son détail (source, heure, appareil,
mission) avec « Rédiger le CR », qui ouvre le compte rendu de la famille déjà rempli : date, indicatif, appareil,
immatriculation, départ et arrivée, durée de bloc déclarée. Relisez, complétez, puis « Ajouter au registre » : le vol
apparaît alors avec son CR. Les colonnes se règlent en glissant le bord des titres (double-clic : largeurs par défaut).
Sous 800 px de large, seules la date, l'indicatif, le trajet et la durée restent ; un clic déplie le reste.

On y arrive aussi par « Mes vols ↗ » dans Mes missions (à côté de « afficher aussi les missions passées ») et dans le
menu « Envoyer » d'un compte rendu.

**Sur téléphone** : les totaux passent en tuiles (vols, heures de bloc, vols sans CR, types les plus volés) et chaque vol en carte (date et indicatif en tête) ; un appui déplie son détail, avec « Ouvrir le CR » ou « Rédiger le CR ».

## Mes disponibilités
<!-- page: apps/pilot/disponibilites.html -->

Cette page présente seule la saisie des disponibilités, en plus grand. Elle sert à saisir rapidement plusieurs semaines.
On y arrive par l'onglet « Mes disponibilités » (sous l'entrée « Mes missions » de la barre latérale) ou par le lien « Ouvrir la saisie des disponibilités seule » de Mes missions. Ce lien n'apparaît qu'au niveau Expert.
Le pilote est celui du trigramme de travail (profil pilote, connexion ou usurpation). En mode production, la page demande d'abord de se connecter.

### Mes disponibilités

Le bloc unique de la page. Il fonctionne exactement comme le bloc du même nom de Mes missions (chapitre précédent) : palette, grille, « Comment s'en servir », « Plage précise », « ⧉ Semaine précédente », « Tout effacer ».

**Navigation de semaine** (propre à cette page) :
- « ‹ » et « › » : semaine précédente ou suivante ;
- champ de date : saute à la semaine qui contient cette date ;
- « Semaine en cours » : visible hors de la semaine en cours, y revient.

Astuces et limites :
- Toutes les heures sont en UTC. Un tracé s'aimante à la demi-heure ; déplacer et ajuster vont au pas de 5 min ; « Plage précise » va à la minute.
- Chaque retouche est enregistrée tout de suite : il n'y a pas de bouton « Enregistrer ». Ctrl+Z l'annule.
- Sans trigramme, le bloc affiche « Trigramme non réglé : le régler dans Paramètres › Mon profil (ou ☰ › Profil pilote). »
- Une adresse de la forme `disponibilites.html?semaine=2026-W41` ouvre directement une semaine donnée.
- Si la semaine est encore en cours de lecture, une retouche est refusée avec « Semaine en cours de lecture : réessayer dans un instant. »

Pour la façon dont le Centre exploite ces déclarations, voir [disponibilités et réorganisation](technique/DISPOS_ET_REORGANISATION.md).

<!-- capture-manuels: utilisateur-disponibilites -->
![Mes disponibilités : palette des catégories, grille horaire en UTC et saisie d’une plage précise.](images/captures-manuels/utilisateur-disponibilites.png)

*Figure 2 — Mes disponibilités : palette des catégories, grille horaire en UTC et saisie d’une plage précise.*

**Sur téléphone** : la saisie passe en vue « un jour » (bascule « Jour » / « Semaine » sous la barre de semaine ; la vue choisie est gardée). En tête, le jour affiché avec « ‹ » et « › » (ou un balayage du doigt ; au-delà du dimanche ou du lundi, la semaine voisine est relue), puis les sept jours de la semaine (un point sous ceux qui ont une disponibilité). Choisissez une catégorie dans la palette, appuyez sur l’heure de début dans la colonne des heures, puis sur l’heure de fin : la plage est posée à la demi-heure, fin comprise ; « Journée entière » la pose sur tout le jour, « Annuler » abandonne un début. Les plages du jour sont listées au-dessus de la colonne : « ✕ » retire une disponibilité entière, ou le fond sur ce jour seulement ; « ↶ Défaire » annule la dernière retouche. La colonne s’ouvre une heure avant la première disponibilité du jour (sinon à 07:00) et défile dans son cadre. « Plage précise » reste là pour la minute.

## Mon profil
<!-- page: apps/settings/profil.html -->

Cette page regroupe les réglages propres à chaque pilote : identité, connexion, préférences de missions, appareils et simulateurs, altitude sans oxygène.
On y arrive par l'entrée « Paramètres » de la barre latérale (premier onglet, « Mon profil ») ou par ☰ › « Paramètres ».
La colonne de gauche liste les rubriques par groupe ; un clic en affiche une à droite, avec son titre, sa présentation, ses boutons et un message d'état.
Si une rubrique contient des modifications non enregistrées, changer de rubrique ou quitter la page demande une confirmation.
Selon le niveau d'utilisation : « Appareils pilotés (CR) » apparaît à partir du niveau Planification (2) ; « Altitude sans oxygène » seulement si l'outil Carburant est coché (toujours au niveau Expert) ; dans « Identité et réseaux », les cartes « IVAO — client OAuth » et « Langue » sont au niveau Expert.

### Niveau d'utilisation

Ce que la suite vous montre, selon votre usage. Quatre cartes, une par niveau (numéro et nom, ce que le niveau montre, « Demande le Centre » pour les niveaux 2 à 4) ; la carte choisie est en évidence et la ligne « Niveau actuel » le rappelle. Un clic suffit : la page se recharge et la barre latérale suit.

| Niveau | Pour | Ce qui s'ajoute |
|---|---|---|
| 1 · Équipage | tout pilote | Mes missions, Compte rendu, Planning (lecture) |
| 2 · Planification | officier de permanence | planifier les ordres : Tableau modifiable, Planning ODV (Centre activé) |
| 3 · Conception | rédacteur de missions | Missions : générateur et registre (Centre activé) |
| 4 · Expert | cartographe, analyste | tous les outils, studio cartographique |

« Outils facultatifs » : Cartes de vol (route, cartes topographiques, approche), Carburant (performances et devis carburant), Atterrissages (tableau de bord des atterrissages), Analyse des missions (reporting des comptes rendus) ; ils se cochent à n'importe quel niveau et se rangent sous « Outils » dans la barre latérale ; au niveau 4, « Tous inclus au niveau Expert ». Par défaut : niveau 4 si le Centre est activé dans ce navigateur, sinon niveau 1. Le niveau ne donne aucun droit : le Centre garde son accès.

<!-- capture-manuels: utilisateur-profil -->
![Mon profil : les quatre niveaux d’utilisation et les outils facultatifs.](images/captures-manuels/utilisateur-profil.png)

*Figure 3 — Mon profil : les quatre niveaux d’utilisation et les outils facultatifs.*

### Identité et réseaux

Votre identité dans la suite, reprise par toutes les pages (☰ › Profil pilote, comptes rendus, reportings).

| Carte | Champs |
|---|---|
| « Pilote » | « Trigramme », « ID VATSIM (CID) », « ID IVAO (VID) », « SimBrief (utilisateur ou ID) » |
| « Site de la compagnie » | « Identifiant », « Mot de passe » |
| « IVAO — client OAuth (personnel) » | « Identifiant du client (client ID) », « Secret du client », « Adresse de redirection à déclarer chez IVAO » (à recopier sur developers.ivao.aero) ; bouton « Enregistrer le client IVAO » : gardé par le lanceur de ce poste, le secret n'est jamais réaffiché |
| « Langue » (niveau Expert) | « Langue de la suite » : Automatique (langue du navigateur), Français, English, Deutsch, Español |

1. Remplissez les champs.
2. Cliquez sur « Enregistrer ». Le message d'état confirme « Profil enregistré dans ce navigateur ».

- Le trigramme compte 2 à 4 lettres ou chiffres ; il sert à retrouver vos missions affectées.
- Les identifiants du site de la compagnie restent dans ce navigateur seulement : ils ne sont jamais écrits dans un fichier ni dans une sauvegarde.
- La langue se choisit d'ordinaire par le drapeau « Langue » de l'en-tête ; la carte « Langue » (niveau Expert) s'applique dès qu'on la choisit, sans « Enregistrer ».
- En mode production, le trigramme est celui de l'utilisateur connecté et ne se modifie pas ici.

### Accès aux données

Pour l'appli sans lanceur (téléphone, suite publiée sur GitHub Pages) : les données de la compagnie sont lues et écrites dans un dépôt GitHub (copie du dépôt des données), avec votre jeton personnel. Sur un poste qui utilise le lanceur, cette rubrique est inutile.

| Champ | Contenu |
|---|---|
| « Dépôt (compte/dépôt) » | le dépôt GitHub des données, par exemple `Woyczek/flight_planner_data` |
| « Branche » | `main` par défaut |
| « Jeton personnel » | jeton à grain fin créé sur github.com › Settings › Developer settings › Fine-grained tokens : accès au seul dépôt des données, permission « Contents » en lecture et écriture, expiration de 90 jours au plus ; gardé dans ce navigateur seulement, jamais réaffiché, à ne coller dans aucun message |

- « Tester » vérifie que le dépôt est lisible, que la branche existe et que le jeton peut écrire.
- « Enregistrer » vérifie, puis active l'accès et ouvre « Mes missions » ; dès lors, toutes les pages de la suite lisent leurs données dans le dépôt (gardées aussi pour le hors ligne).
- Chaque enregistrement (compte rendu, disponibilités, fiche) devient un commit à votre trigramme. Si quelqu'un d'autre a changé le même fichier entre-temps, il est relu et fusionné avant d'être écrit.
- « Couper l'accès » efface le jeton et les copies des données de ce navigateur ; les pages reviennent aux données du lanceur.
- Téléphone perdu ou volé : supprimez aussi le jeton sur github.com (Settings › Developer settings › Fine-grained tokens) ; il ne vaut alors plus nulle part.
- Sur un site publié en `….github.io`, la carte rappelle que tout autre site GitHub Pages du même compte partage la même origine et pourrait lire le jeton : n'en publiez pas d'autre sur ce compte.

### Connexion et mot de passe

Votre fiche utilisateur partagée : rôle et mot de passe (conservé sous forme d'empreinte, jamais en clair).

- En tête, le mode de la compagnie (develop ou production) et votre état : « Connecté : … (rôle) » ou « Non connecté. ».
- **Non connecté** : carte « Se connecter » avec « Trigramme », « Mot de passe » et le bouton « Se connecter ». En mode develop, une fiche sans mot de passe se connecte sans mot de passe : définissez-en un ensuite.
- **Connecté** : carte « Changer de mot de passe » avec « Mot de passe actuel », « Nouveau mot de passe (8 caractères au moins) », « Confirmation », puis « Changer le mot de passe ».
- Le bouton « Se déconnecter » apparaît une fois connecté.
- Un mot de passe provisoire est signalé (« mot de passe provisoire, à changer ») : changez-le dès la première connexion.
- Mot de passe oublié : demandez une réinitialisation à un administrateur du Centre.
- **Mode groupe** (registre signé) : votre mot de passe est dans le registre ; un administrateur du Centre le change pour vous. À la première ouverture après le passage en mode groupe, une notification montre l'empreinte du fondateur avec « Confirmer » et « Refuser » : comparez-la avec celle que l'administrateur vous a envoyée (Discord, SMS, courriel) avant de confirmer.

### Types de missions

Cette rubrique précise les thèmes de mission ouverts par vos catégories de disponibilité **personnalisées** (« Sécurité civile personnalisée », « Défense personnalisée »).

Pour chaque domaine (« Sécurité civile », « Défense ») :
1. Choisissez un mode : « Tous les thèmes du domaine », « Liste blanche : seulement ces thèmes » ou « Liste noire : tous sauf ces thèmes ».
2. Cochez les thèmes concernés (par exemple HEMS, SAR, FIRE… ou COMBAT, ISR, AAR…).
3. La ligne du bas montre aussitôt le résultat : « « Sécurité civile personnalisée » ouvre : … ».
4. Cliquez sur « Enregistrer ».

Les préférences sont gardées dans votre fiche utilisateur, partagée avec le Centre par la synchronisation. Sans trigramme, la rubrique demande de le régler d'abord dans « Identité et réseaux ».

### Appareils et simulateurs

« Mes appareils » : vos appareils, flotte comprise — ceux que vous possédez dans votre simulateur et ceux que vous maîtrisez —, et vos simulateurs. Le Centre s'en sert pour vous affecter un appareil et pour réunir des pilotes sur un simulateur commun. C'est la même liste que le tableau de la page « Fiches de performances », qui en montre les performances : mêmes appareils, même ordre, même nom.

**Carte « Mes appareils »** : un résumé (« … type(s) maîtrisé(s), … possédé(s) sur … types de la flotte. »), puis une sous-carte par catégorie (hélicoptères, turbopropulseurs, réacteurs, pistons), avec un tableau :

| Colonne | Contenu |
|---|---|
| « Appareil » | Silhouette, nom en gras, désignateur OACI et classe en petit |
| « Variantes de la flotte » | Variantes présentes dans la flotte |
| « Appareils » | Nombre d'appareils en service (sur le total) et leurs bases |
| « Performances » | Pour un appareil possédé : un lien — la source de sa fiche, qui ouvre la page « Fiches de performances » sur cet appareil, ou « aucune » et les façons d'en créer une, qui ouvrent cette même page |
| « État » | Pastille : vide, non possédé ; rouge, NQ — possédé, non qualifié (vous avez ce type dans votre simulateur) ; orange, à qualifier — néophyte ; vert, maîtrisé (vous le pilotez avec aisance). Mêmes couleurs et même sens que la feuille FLOTTE du classeur ODV. Un appui la fait tourner dans cet ordre, puis revient à vide |
| « ⋯ » | Menu de la ligne : ses actions (créer la fiche de performances, retirer une variante, chercher le type ou la fiche, corriger ou supprimer) ; sur téléphone, aussi les colonnes masquées |

- Néophyte et maîtrisé valent possédé pour le Centre ; « néophyte » est enregistré à part dans vos disponibilités déclarées.
- Sur téléphone, le tableau ne garde que l'appareil, la pastille et « ⋯ » : variantes, appareils de la flotte et performances passent dans le menu.
- « Chercher un appareil », au-dessus des cartes, filtre à la frappe sur le nom, la variante, le désignateur, la classe et la source des performances : les cartes qui ont une correspondance restent dépliées, les autres se replient, et « n appareil(s) » donne le compte ; champ vide : tout.
- Variantes : un désignateur partagé par plusieurs modèles (CL2T : CL-215T et CL-415) a une ligne par variante déclarée, sous son nom (« Canadair CL-415 », « Canadair CL-215T ») ; « Retirer la variante », dans le menu « ⋯ », retire une variante. Sans variante déclarée, l'appareil porte le nom de la fiche et de ses variantes connues (« Canadair CL-215T / CL-415 »). Le profil de performances reste celui du désignateur : « performances communes aux variantes ». À l'ajout, la liste propose chaque variante (modèle de la fiche, variantes de la flotte, noms d'usage de la base), ou gardez votre propre texte ; la variante est enregistrée dans votre déclaration.

**Carte « Autres appareils (hors flotte) »** : les appareils que vous possédez sans qu'ils soient dans la flotte. On les ajoute toujours par un nom, jamais par un code obligatoire : tapez ce que vous connaissez (« CL-415 », « Canadair 415 », « PC-12 », « Caravelle »). Pendant la frappe, une liste déroulante avec recherche (silhouettes, ↑ ↓ Entrée, Échap) propose, groupés par provenance, les types de la flotte, de la base des types de ce poste avec leurs noms d'usage et de la liste OACI publiée ; ce calcul est local, sans réseau. Le désignateur est trouvé pour vous : « CL-415 », « Canadair 415 » et « CL415 » donnent CL2T, affiché « Canadair CL-415 » (le nom de la variante est gardé). Un type de la flotte est simplement coché dans la carte « Mes appareils ». Si plusieurs types sont possibles, le plus proche est repris dans le champ — « Ajouter » pour le confirmer, ou choisissez dans la liste. Si rien ne correspond, l'appareil est gardé sous son nom, marqué « type OACI à confirmer » ; « Chercher le type », sur sa ligne, le rattache plus tard à un désignateur. Pour corriger ou supprimer un appareil ajouté, cliquez sur sa ligne : son code ou son nom passe dans le champ et « Ajouter » devient « Remplacer » (son état est reporté), à côté de « Supprimer » et « Annuler » (ou Échap). La base de ce poste n'est complétée par le lanceur qu'au clic sur « Ajouter », pour un désignateur qui lui manque : la ligne affiche « complétion de la base en cours… » le temps d'une passe courte, une seule passe à la fois (un type demandé pendant une passe est mis en file) ; quitter la page ne l'interrompt pas. Un type retiré que les sources officielles ne connaissent plus est cherché en dernier recours sur Aviation Fanatic ; s'il n'y est pas, la note « introuvable (OACI, EUROCONTROL, Aviation Fanatic) » l'indique. Ces appareils partent avec vos disponibilités déclarées : le Centre les voit pour les affectations, et les autres pilotes les retrouvent dans cette carte, colonne « Aussi déclaré par » — il leur suffit d'un appui sur la pastille.

**Carte « Simulateurs »** : cochez les simulateurs et outils installés.

Il n'y a pas de bouton « Enregistrer » : chaque coche est gardée aussitôt dans ce navigateur, puis recopiée dans vos semaines de disponibilités déjà déclarées, à partir de la semaine en cours. Le message du bas indique combien de semaines ont été mises à jour.

### Ajouter un appareil et ses performances

Pour voler sur un appareil que la suite ne connaît pas encore, par exemple un CL-415 sans performances :
1. Ajoutez-le par son nom : Paramètres › Mon profil › Appareils et simulateurs, carte « Autres appareils », ou bouton « Ajouter un appareil » de la page « Fiches de performances » (la même fenêtre d'ajout). Il rejoint « Mes appareils ».
2. Sa ligne affiche « Performances : aucune » et trois boutons, dans cet ordre : « Créer depuis SimBrief » (seulement si SimBrief connaît le type), « Demander à ChatGPT » (profil vide et panneau ChatGPT ouvert dessus), « Estimer par la classe » (profil minimal tiré de la classe OACI du type : consommation, TAS et plafond, marqués « estimé » ; un appareil sans désignateur n'a pas de classe : rattachez-le d'abord à son type).
3. La fiche créée est rattachée à l'appareil et la page « Fiches de performances » s'ouvre dessus (depuis Paramètres, le bouton ouvre cette page). Complétez-la ensuite (montée, descente), fusionnez-la avec une autre fiche ou remplacez-la par un import. Le Carburant la propose ensuite dans son menu « Avion ».

### Altitude sans oxygène (avions non pressurisés)

Cette rubrique (groupe « Planificateur carburant ») règle le seuil au-dessus duquel le graphique d'altitude optimale du planificateur affiche « oxygène requis » pour un avion non pressurisé. Elle n'apparaît que si l'outil Carburant est coché dans « Niveau d'utilisation » (toujours au niveau Expert).

1. Saisissez « Altitude maximale sans oxygène (ft) » : entre 1 000 et 30 000 ft, par pas de 500.
2. Cliquez sur « Enregistrer ».
3. « Valeur par défaut (10 000 ft) » rétablit la valeur d'origine.

Repères rappelés sous le champ : 10 000 ft (usage courant, EASA NCO), 12 500 ft (FAA, équipage au-delà de 30 minutes), 14 000 ft (FAA, équipage en permanence).
C'est une information seulement : le calcul n'est pas limité. Le réglage est gardé dans ce navigateur.

### Appareils pilotés (CR)

Les appareils que vous avez pilotés ou reportés : ceux des comptes rendus où votre trigramme figure dans l'équipage, ou que vous avez rédigés (CR enregistrés depuis cette version) (l'appareil de votre poste quand le CR le précise), avec type, variante, indicatifs, exploitant, nombre de vols et dernier vol. La coche grisée « Flotte » indique si l'appareil appartient à la flotte (cochée) ou non (décochée, indicatif compris) ; elle ne se modifie pas ici. La liste complète, avec la case « personnel », est dans Paramètres › Centre › Flotte (réservée au Centre). En tête, le décompte du journal : CR au total, CR à vous, CR sans équipage saisi (ils ne comptent pour personne). Rubrique visible à partir du niveau Planification (2).

## Apparence
<!-- page: apps/settings/apparence.html -->

Cette page règle l'aspect de toute la suite : design, graphiques, icônes, barre latérale et couleurs.
L'entrée « Apparence » de la barre latérale (ou le bouton « Apparence » du menu ☰) l'ouvre dans une fenêtre au-dessus de la page en cours : vous voyez l'effet tout de suite. Fermeture : « ✕ », Échap ou clic hors de la fenêtre.
La même interface existe en page entière (☰ › liste des pages de réglage › « Apparence »).
Les réglages sont mémorisés dans ce navigateur et s'appliquent à toutes les pages ; ils ne comptent pas dans le rappel de sauvegarde.
Selon le niveau d'utilisation : aux niveaux 1 à 3, la page montre le design, le jeu d'icônes courant, la barre latérale, la taille des icônes et « Tout réinitialiser » ; le décor, la couleur Aqua, l'affichage de la barre, les autres jeux d'icônes, Graphiques, Couleurs des thèmes et « Démonstration complète » s'ajoutent au niveau Expert.

### Design

La forme des pages : arrondis, densité, titres, barre latérale.

- Chaque design est présenté par une vignette dessinée dans son style, avec son nom et sa description : Standard, Aéro, Opérationnel, Console, Cabinet, Carnet de vol, Durci, Aqua, Tactique.
- Six vignettes s'affichent d'emblée (avec le design courant s'il n'en fait pas partie) ; les autres sont sous « Plus de designs », à déplier.
- Un clic sur une vignette applique le design aussitôt. La vignette choisie est encadrée.
- Cabinet, Carnet de vol, Durci et Aqua ajoutent leurs matières, Tactique son verre fumé sur fond de nuit ; les couleurs d'information restent celles du thème (Tactique : liseré en haut des blocs).

**« Décor (designs à matières) »** (niveau Expert) :
- « Complet » (par défaut) : panneaux illustrés des blocs, feuilles de registre, vis, radar ;
- « Sobre » : matières et plaques seulement, sur toutes les pages.

**« Couleur Aqua »** (niveau Expert) : couleur des boutons et icônes du design Aqua (Bleu, Turquoise, Vert, Graphite, Violet, Orange, Rouge, Rose), ou « Couleur de chaque application ». Les icônes d'état gardent leurs couleurs d'origine.

<!-- capture-manuels: utilisateur-apparence -->
![Apparence : choix du design, du décor et de la couleur ; le design Aqua est sélectionné.](images/captures-manuels/utilisateur-apparence.png)

*Figure 4 — Apparence : choix du design, du décor et de la couleur ; le design Aqua est sélectionné.*

### Graphiques

Palette de couleurs et style des graphiques (reportings, indicateurs). Rubrique du niveau Expert.

- Palettes : « Automatique » (suit le design), « Vives (couleurs des pages) », « Ardoise », « Laiton et cuir », « Kaki et olive ». Chaque rangée montre un échantillon de couleurs.
- « Style » : « Automatique », « Aplats » ou « Relief ».

Le choix s'applique aussitôt aux graphiques des pages.

### Icônes

L'épaisseur du trait des icônes, ou pas d'icônes du tout. Chaque rangée montre un aperçu du jeu. Aux niveaux 1 à 3, seul le jeu courant est proposé ; tous les jeux au niveau Expert.

| Choix | Rendu |
|---|---|
| « Selon le design » | Le jeu prévu par le design choisi |
| « Trait fin », « Trait normal », « Trait épais » | Icônes au trait |
| « Laiton (médaillons) », « Acier (plaques) », « Gel (bulles) », « Avionique (cadrans) » | Jeux à matières |
| « Aucune icône » | Pas d'icônes |

**« Barre latérale »** : « Selon le design », « Toujours » ou « Jamais ». Par défaut, elle est toujours affichée (sauf écran étroit et impression). « Taille des icônes » : « Petite », « Moyenne » (par défaut) ou « Grande ». « Affichage » (niveau Expert) : « Icône et libellé » (par défaut), « Icône seule » (barre plus étroite, nom de l'entrée en infobulle) ou « Libellé seul ».

### Sur téléphone

Sur un écran étroit (téléphone, fenêtre réduite), la suite passe en **mode mobile** : en-tête sur une ligne, barre de
navigation en bas de l'écran à la place de la barre latérale, onglets sur une ligne qui défile, blocs en pleine largeur,
boutons et champs plus grands, tableaux qui défilent dans leur bloc ou présentés en cartes.

- **Barre du bas** : jusqu'à six entrées, toutes affichées avec un libellé court (Missions, Vols, CR, Planning…) ; au-delà,
  les cinq premières et « Plus », qui ouvre les autres entrées, Paramètres et Aide.
- **Téléphone en paysage** : la barre passe en rail à gauche de l'écran (icône, libellé dessous) et l'en-tête n'est plus collé, pour garder la hauteur au contenu ; les courbes du Carburant tiennent avec leur curseur de niveau.
- **En-tête** : il se range quand vous descendez dans la page et revient dès que vous remontez.
- **Mode mobile** : « Automatique (écran étroit) », « Toujours » ou « Jamais ». En automatique, un téléphone tourné en paysage reste en mode mobile.
- **Cette page sur téléphone** : « Sur téléphone » vient en tête. Sous un skin de téléphone, design, icônes, barre latérale et couleurs des thèmes (réglages de l'ordinateur, sans effet sous ce skin) ne sont pas affichés ; skin « Mon design » pour les retrouver.
- **Skin du téléphone** : « Mobile » (par défaut, plat et léger), « Swiss » (noir et blanc, angles droits, accent rouge)
  ou « Mon design » (le design choisi ci-dessus). Appliqué au prochain chargement d'une page sur un écran tactile.
- **Jour / nuit** : « Suit le téléphone » (réglage clair ou sombre du téléphone), « Jour » ou « Nuit ».
- Sur un écran tactile, les pages conçues pour un grand écran (cartes de vol, fiches de performances, pages de
  préparation du Centre, réglages d'installation) sont retirées de la barre et des onglets ; ouvertes quand même, elles
  portent un bandeau. Une fenêtre d'ordinateur réduite garde toutes ses pages.
- **Aperçu mobile sur ordinateur** (niveau Expert) : une page de la suite dans des cadres de téléphone et de tablette,
  avec le skin et le jour / nuit choisis, pour vérifier le rendu sans téléphone.

### Couleurs des thèmes

Chaque page de la suite a un thème de couleurs (bandeau, texte du bandeau, accent). Pour chaque thème, vous choisissez une famille de couleurs et un ton ; les couleurs en sont calculées, avec un contrôle de lisibilité. Rubrique du niveau Expert.

Les thèmes sont présentés en cartes, en deux groupes : « Applications » (Carburant, Atterrissages, Centre, CR) et « Familles de comptes rendus ».

Sur chaque carte :
1. L'aperçu montre un « Titre » sur le bandeau, un « Bouton » et un « Lien, icône ».
2. Les pastilles de couleur choisissent la famille (Rouge, Brique, Orange… Ardoise, Graphite) ; « ↺ » revient aux couleurs d'origine.
3. Le curseur « Ton » (de sombre à clair) règle la clarté. Il est inactif sur les couleurs d'origine.
4. Les pastilles de contraste indiquent ✓ ou ✗ pour « texte / bandeau » et « accent / page » (4,5:1 au moins) et pour « accent / carte » (3:1 au moins).
5. « Voir sur cette page » prête les couleurs du thème à la page en cours, pour juger ; un second clic (ou la fermeture de la fenêtre) l'annule.

Chaque changement est enregistré aussitôt.

**En bas de la page** :
- « Démonstration complète » (niveau Expert) ouvre une maquette : générateur, catalogue d'icônes et contrastes de tous les thèmes.
- « Tout réinitialiser » rétablit tous les réglages d'Apparence par défaut (design Aqua, icônes du design, barre latérale toujours affichée, décor complet, couleurs d'origine).

## Premier lancement
<!-- page: apps/settings/premier_lancement.html -->

Cette page règle ce dont la suite a besoin pour travailler. Le lanceur (`lancer.cmd` sous Windows, `sh lancer.sh` sous macOS ou Linux) l'ouvre de lui-même ; on y revient à tout moment par Paramètres › onglet « Premier lancement », ou par la carte « Premier lancement » de l'accueil, affichée tant qu'il reste quelque chose à régler.
Le lanceur ne ramène au premier lancement que si le dossier de l'application ou les données manquent. Une fois « Terminer » cliqué, l'accueil rappelle ce qui reste à faire dans un cadre gris discret, sans alerte.

En tête, un **rail des six étapes** (1 Dossiers · 2 Données · 3 Compagnie · 4 Profil · 5 Données aéronautiques et types · 6 Centre, puis « Terminer » : « à la fin », « prêt » et cerclé quand tout est fait ; l'étape Centre ne s'allume pas pour un pilote) donne l'état de chacune : ✓ faite, ○ à faire, – facultative, 🔒 verrouillée sans l'étape 1, ✗ à refaire ; l'étape courante est cerclée, un clic ouvre une étape. Le bilan détaillé, **« Où en est la suite »**, est dans un volet replié : chaque ligne mène à son étape (✓ réglé, ○ à faire, – facultatif, ? inconnu : lanceur absent).
- Pour tous : données, dépôt git de synchronisation (facultatif), dossier de l'application, compagnie et site, clé d'API IVAO (facultative), pilote (trigramme et au moins un réseau), identifiants du site de la compagnie, données aéronautiques.
- Centre : activation (administrateurs) ; une fois le Centre activé, flotte et journal du site, missions du registre, utilisateurs et droits (au moins un administrateur), envoi des CR (facultatif).

Au-dessus du bilan, « 📘 Tutoriel d’installation, pas à pas » ouvre dans l'Aide le [tutoriel d'installation](tutorial/installation.fr.md), dans la langue de la suite.

Le même état est en pastille dans le titre de chaque étape (le numéro passe au vert quand elle est faite), avec dessous une ligne « ✓ Fait : … » ou « ○ À faire : … ». L'étape courante est ouverte, les autres repliées ; chaque étape finit par « Suivant → ».

### 1 Dossiers

Le navigateur demande de désigner chaque dossier une fois ; il s'en souvient ensuite.

- **« Dossier de l'application »** : « Choisir le dossier de l'application », puis désignez le dossier qui contient `lancer.cmd` et `lancer.sh`. Les autres dossiers (données, registre, missions, SIA, performances, sauvegarde locale) en sont déduits ; le message indique combien ont été réglés.
- Le dossier de l'application est ouvert **en lecture seule** : aucune page ne peut modifier le code de la suite. Juste après, la page demande « Autoriser l'écriture des données » : cliquez, puis acceptez la demande du navigateur, pour que vos disponibilités, missions et comptes rendus s'écrivent dans `data/`. Après un redémarrage du navigateur, « Autoriser » redemande les deux.
- Le dossier doit être celui de la suite servie par le lanceur : s'il appartient à une autre copie de la suite, l'étape reste à faire (✗ dans le bilan) avec le message « Suite lancée depuis …, dossier déclaré … » ; rechoisissez le bon dossier.
- **« Classeur ODV (facultatif) »** : « Dossier OneDrive… » désigne le dossier synchronisé où l'escadrille dépose le classeur (le Planning ODV ouvre le plus récent). Sans OneDrive : « ou le fichier Excel… », gardé dans ce navigateur.

Cette étape est importante : sans dossier des données autorisé, vos disponibilités restent dans le navigateur et le Centre ne les voit pas.

### 2 Données

Cette étape installe les données de la compagnie (missions, références…). Elle passe par le lanceur : sans lui, la page affiche « Pour cette étape, ouvrez la suite avec le lanceur… ».

Tant que le dossier de l'application (étape 1) n'est pas choisi, ou s'il appartient à une autre copie de la suite, cette étape et les suivantes (compagnie, profil, données aéronautiques, Centre) sont grisées et inactives, la raison en tête de chacune, et « Terminer » aussi ; le bilan reste lisible.

Trois possibilités :

| Carte | Marche à suivre |
|---|---|
| « Jeu d’essai » | « Installer le jeu d’essai » : données fictives livrées avec la suite (missions dont un exercice, pilotes, flotte, disponibilités et affectations de la semaine en cours), pour découvrir la suite ; à remplacer plus tard par les données de la compagnie. Refusé si des données sont déjà là. |
| « Dépôt de données » | Saisissez « Adresse du dépôt » (donnée par votre compagnie : `https://…` ou `git@…`), au besoin « Identifiant (facultatif) » et « Mot de passe ou jeton (facultatif) », cochez au besoin « mémoriser dans le gestionnaire d’identifiants de Git », puis « Récupérer les données ». Le premier téléchargement prend quelques minutes. |
| « J'ai reçu les données par mail » | « Archive des données… » : choisissez l'archive `.zip` reçue (elle contient `data_tree.js`). |
- Aucune adresse n’est préremplie. Dépôt privé en HTTPS : identifiant et mot de passe, ou un jeton d’accès en lecture si le compte a la double authentification ; en SSH (`git@…`), la clé SSH de l’ordinateur.
- Si Git n'est pas installé : jeu d’essai ou archive (ou installez Git, puis relancez).
- **« Dépôt git de synchronisation des données (facultatif) »** : l'adresse du dépôt distant de `data/`, qui partage les données
  entre les postes (bouton « Synchroniser »). Adresse SSH `git@hôte:compte/dépôt.git` (clé SSH de l'ordinateur) ou
  HTTPS `https://hôte/compte/dépôt.git` (identifiants enregistrés dans Git). La carte affiche le dépôt actuel ;
  « Vérifier » dit s'il répond depuis ce poste (30 s au plus), « Enregistrer » en fait le dépôt distant de `data/`
  (sans données encore, l'adresse sert à les récupérer). Rien n'est bloquant : un dépôt qui ne répond pas est signalé,
  Vers un autre dépôt que celui en place, le lanceur ouvre une fenêtre de confirmation sur l'ordinateur (adresse actuelle
  et nouvelle, « Non » par défaut) : répondez « Oui » pour changer ; aucune page ne peut y répondre à votre place. Jamais de mot de passe ni de jeton dans l'adresse.
  la suite fonctionne sans partage. Détails : [synchronisation](technique/SYNCHRONISATION.md).
- Une fois les données présentes, la carte facultative « Journal des vols » propose « Journal (.html)… » : la page « Log des vols » du site de la compagnie, enregistrée, remplit les pilotes et appareils de la référence (aide à la saisie).

### 3 Compagnie

La compagnie virtuelle dont la suite porte le nom, et l'adresse de son site (liens, flotte, journal des vols) ; réglage de ce navigateur.

1. Carte « Compagnie virtuelle » : « Nom », « Sigle », « Nom long », « Site de la compagnie » (`https://…`).
2. Carte « Clé d’API IVAO (facultatif) » : état de la clé de l'installation (« Clé IVAO : enregistrée ✓ » ou « absente »). Elle se saisit, se teste et se remplace à un seul endroit, Paramètres › Installation › Clés et services externes (lien de la carte).
3. « Enregistrer la compagnie ».

Les autres champs (centre, pages du site, sources externes) sont dans Paramètres › Installation › Sources et dossiers.

### 4 Profil et identifiants

1. Carte « Pilote » : « Trigramme », « ID IVAO (VID) », « ID VATSIM (CID) », « SimBrief ». Le trigramme est figé en mode production (il vient du compte).
2. Carte « Site de la compagnie » : « Identifiant » et « Mot de passe » de votre compte sur le site, gardés dans ce navigateur seulement (jamais dans un fichier ni une sauvegarde).
3. « Enregistrer le profil ».

La suite ne demande jamais vos mots de passe IVAO ni VATSIM : vos identifiants (VID, CID) suffisent. Le compte de la suite (mot de passe, mode production), le client IVAO personnel et les préférences se règlent dans [Mon profil](#mon-profil).

### 5 Données aéronautiques et types d’aéronefs

Cartes, missions et planification utilisent les données aéronautiques (AIRAC) et la base des types d’aéronefs. L'étape montre les mêmes blocs que Paramètres › Installation :

1. ① « Types d’aéronefs » d'abord : la ligne d'état nomme les types à compléter et porte elle-même « Compléter automatiquement » (types OACI et performances EUROCONTROL) ; pendant la passe, « Téléchargement en cours (étape, n s) : la page se recharge à la fin de la tâche. », puis la page se recharge d'elle-même et montre le bilan (« Terminé : 8 fiche(s) OACI, 1 performance(s). »), de même après « Tout installer ». Un type sans performances EUROCONTROL (militaires, hélicoptères) est estimé : « ≈ 2 000 kg/h, 480 kt (type connu) » ou « (classe OACI L2J) », comme dans le planificateur carburant ; un type sans fiche OACI ne bloque pas l'étape.
2. ② « Données aéronautiques », précédées de leurs lignes d'état (base : AIRAC, espaces, date de construction ; MORA ; X-Plane, facultatif) : la France est active par défaut, un clic sur la carte choisit d'autres zones, chaque source garde son bouton (ZIP du SIA : lien vers la boutique, compte gratuit, produit du cycle à 0 €, puis « Récupérer le ZIP téléchargé » ; MORA ; PDF MILAIP ; jeux des autres pays). Un seul bouton principal, **« Tout installer pour <zones> »**, enchaîne la complétion des types puis l'activation des zones, attend la fin de chaque tâche et dit ce qui reste ; ce qui est déjà installé n'est pas refait. Les cartes expertes (base aéronautique, MORA, cohérence) sont repliées sous « Outils avancés » (aussi dans Paramètres › Maintenance).

### 6 Centre (administrateurs)

Réservé aux administrateurs du SO Group : les pilotes passent cette étape et cliquent « Terminer ». Chaque lien de l'étape dit ce qu'on y fait et s'ouvre dans un nouvel onglet.
- Carte « Activer le Centre » : « Mot de passe du Centre » (affiché à côté du bouton, `DEFA` par défaut), puis « Activer le Centre ». Le bilan indique le mode du Centre (autonome : mot de passe).
- Une fois le Centre activé :
  - « Flotte et journal des vols » : dernière lecture du site par le lanceur (flotte, emplacement des appareils, journal), « Mettre à jour maintenant », et le lien vers la flotte (Paramètres › Centre).
  - « Missions » : « ✓ n missions au registre : rien à faire », sinon d'où elles viennent (données de l'étape 2, sinon Centre › Générateur de mission), et le lien vers le registre.
  - « Réglages du SO Group » : liens vers les rubriques de Paramètres › Centre — utilisateurs et droits (nombre, administrateurs, mode), catégories de disponibilité, Planning ODV, Tableau, envoi des CR, calcul des routes.

« Terminer » (dernier point du rail ; bloc de fin toujours visible sous les étapes) demande seulement les étapes 1 et 2 ; les étapes 3 à 5 sont recommandées (s'il en reste, une confirmation le rappelle au clic) ; il note la suite « réglée » et ouvre l'accueil. Le lien « Accueil » y ramène sans terminer.

### Recommencer

Pour reprendre le premier lancement de zéro, et seulement dans ce cas. Le bloc est replié par défaut.

- « Nettoyer et recommencer… » efface, **dans ce navigateur**, les dossiers mémorisés (application, données, registre, missions, SIA, ODV, X-Plane, performances, sauvegarde locale), la copie du classeur ODV, les identifiants du site de la compagnie, le profil (trigramme, IVAO, VATSIM, SimBrief) et l'indicateur « suite réglée ».
- Une confirmation est demandée, puis la page se recharge à l'étape 1.
- Les fichiers sur le disque ne sont pas touchés : dossier `data/`, registres, sauvegarde `defa_local_store.yaml`.

## Nouveau compte rendu
<!-- page: apps/cr/mission_cr.html -->

Cette page est la porte d'entrée de tout compte rendu (CR) de mission : vous y choisissez la famille de
mission, puis la page de CR de cette famille s'ouvre. Elle s'adresse à tous les pilotes.
Pour y aller : barre latérale › **Compte rendu**, ou le bouton « Nouveau compte rendu » de l'en-tête du
reporting général. Un CR peut aussi s'ouvrir directement, déjà rempli, depuis une mission qui vous a été
affectée (voir plus bas). Pas à pas complet : [tutoriel](TUTORIAL.md).

### Mes missions à rendre

Premier bloc de la page : les missions qui vous ont été affectées, déjà passées (21 jours au plus) et sans CR dans le registre, comme dans le bloc « Comptes rendus à écrire » de la page « Mes missions » (sept lignes au plus).

- **« Écrire le compte rendu »** ouvre le dossier de la mission dans « Mes missions » et commence le CR dans la famille de la mission, rempli depuis l'ordre de mission (voir « Reprendre une mission affectée »).
- **« Pas de CR »** écarte la mission de la liste (mémorisé dans ce navigateur).
- Sans trigramme réglé, le bloc le demande sur place (champ « Trigramme », bouton « Enregistrer »). Le choix de la famille, plus bas, reste pour une mission hors affectation.

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

<!-- capture-manuels: utilisateur-nouveau-cr -->
![Nouveau compte rendu : recherche d’une famille et choix parmi les familles de missions.](images/captures-manuels/utilisateur-nouveau-cr.png)

*Figure 5 — Nouveau compte rendu : recherche d’une famille et choix parmi les familles de missions.*

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

Toutes les familles partagent la même page de saisie : mêmes blocs communs, plus quelques blocs propres
à la famille. Vous y rédigez le CR d'un vol réalisé, puis l'enregistrez dans le registre des missions.
On y arrive par la page « Nouveau compte rendu », par une mission affectée, ou en cliquant une mission
dans un reporting ou une fiche (la mission s'ouvre alors en modification).

**Trois étapes.** Le formulaire se lit en étapes, repérées par la barre « 1 Vol · 2 Mission · 3 Résultat » en tête
(un clic ouvre l'étape et y mène) :
1. **Vol**, les faits : Identification, Appareil(s), Chronologie, Équipage, Carburant (et Trace réseau à partir du
   niveau 3).
2. **Mission**, ce que vous saisissez : les blocs propres à la famille (FIRE : ordre de vol, horaires feux de forêt,
   largages ; HEMS : service, mission médicale, horaires, destinations ; SPECIAL : le bloc de la série), précédés de
   « Tâche / ordre de mission » pour les familles qui n'ont pas leur propre bloc d'ordre.
3. **Résultat** : le bloc « Résultat et remarques ». La barre « Ajouter au registre » / « Envoyer » termine le CR.

Chaque étape se replie par son titre, qui dit son état : « ✓ » quand l'essentiel est là (Vol : appareil, décollage et
atterrissage, équipage, carburant au départ et à l'atterrissage ; Mission : au moins un champ rempli dans chaque bloc
de la famille ; Résultat : le résultat choisi), sinon « à compléter ». Une quatrième étape, **Détails du vol**, repliée,
rassemble les autres blocs : Navigation, Environnement / météo, Événements horodatés, Étapes / rotations, Capacités ;
ouverte, elle les montre à tous les niveaux (c'est l'ancien « CR détaillé »), chacun résumé en une ligne avec sa
pastille, « Modifier » pour ses champs.

**Les résumés.** Un bloc dont l'essentiel est rempli tient en une ligne : Identification (date · opération ·
organisme), Appareil(s) (« MILAN74 · DH8D F-ZBMD »), Chronologie (« bloc 13:07 → 15:13, vol 13:21 → 15:02 », avec le
lien de la trace), Équipage (les noms), Carburant (« 1200 → 650 kg »), Trace réseau. Sa pastille de provenance
(« ↧ IVAO — dernier vol ») dit d'où viennent ses valeurs. « Modifier » déplie les champs, « Résumé » les replie. Un
bloc vide, incomplet ou en anomalie de cohérence reste déplié, comme celui où vous travaillez ; après un
préremplissage, les blocs complétés repassent en résumé.

**Selon le niveau d'utilisation.** Aux niveaux 1 (Équipage) et 2 (Planification), un bloc déplié montre ses champs
essentiels (identification : mission, n° de CR, date, série ; appareil : immatriculation, type, indicatif, terrains ;
quatre heures ; carburant au départ et à l'atterrissage) ; « Tous les champs », sous son titre, montre les autres,
« Champs essentiels » revient. Aux niveaux 3 et 4, tous les champs sont là. Les valeurs de champs masqués (import, plan
de vol, suivi réseau) restent dans le compte rendu. Un clic sur une anomalie de cohérence, sous les calculs, ouvre
l'étape, le bloc et, s'il le faut, tous ses champs, puis place le curseur dans le champ.

**Sur téléphone** : une seule étape est ouverte à la fois — à l’arrivée, la première à compléter ; ouvrir une étape replie les autres et la ramène en haut de l’écran. La barre « 1 Vol · 2 Mission · 3 Résultat » reste collée en haut pendant la saisie et marque l’étape ouverte ; l’en-tête de la mission défile avec la page. « Ajouter au registre » flotte au-dessus de la barre du bas ; « Envoyer » et « Préremplir » restent dans l’en-tête, en haut de page.

<!-- capture-manuels: utilisateur-formulaire-cr -->
![Compte rendu FIRE / GAAR : formulaire à gauche, calculs automatiques et aperçu du compte rendu à droite.](images/captures-manuels/utilisateur-formulaire-cr.png)

*Figure 6 — Compte rendu FIRE / GAAR : formulaire à gauche, calculs automatiques et aperçu du compte rendu à droite.*

### En-tête et barre d'outils

L'en-tête reste collé en haut de page. De gauche à droite :

| Entrée | Rôle |
|---|---|
| « SAR · SAR terrestre ▾ » (famille · sous-type) | popup « Famille de mission » (ouvre la page de l'autre famille) et « Sous-type de mission » |
| « CRF-A01-0 · 17/10/2026 » | n° du CR et date du vol, en lecture ; un clic ouvre le champ de la date |
| « Ajouter au registre » / « Enregistrer les modifications » | range la mission dans le registre |
| « Envoyer » ▾ | « Envoyer le CR » : transmet le CR au webservice de la compagnie (en pointillés tant qu'il n'est pas paramétré) ; « Site de la compagnie » (si son adresse est réglée) : « Enregistrer le vol sur le site ↗ », le favori « → Vol », « Copier les champs » (voir plus bas) |
| « Préremplir » ▾ | tout ce qui remplit le CR : nouveau CR depuis un ordre de mission, un vol passé ou un fichier ; compléter ce CR depuis mon dernier vol IVAO / VATSIM, un plan de vol déposé ou un collage (voir « Préremplir ») |
| « Suivi réseau » ▾ | suivi en direct IVAO / VATSIM, historique VATSIM |
| « Mission » ▾ | « Nouvelle mission », « Exporter la mission (YAML) », « Supprimer cette mission » (en modification) |
| « Registre des missions » ▾ | « Voir le reporting », « Dossier du registre… », « Paramétrer l'envoi des CR (webservice)… », « Paramétrage — bases de données… » |

À droite, un message d'état indique le dernier enregistrement (« Brouillon enregistré dans le
navigateur · heure »). Chaque bloc a dans son titre **Masquer / Afficher** (choix
mémorisé) ; l'ordre des blocs est celui des étapes (les dispositions changées avec ↕ avant les étapes ne s'appliquent
plus). Les blocs qui contiennent une liste ont un **+** dans leur
titre pour ajouter un élément.

Aux niveaux 1 et 2, « Mission » et « Registre des missions » n'apparaissent pas (ils viennent au niveau 3) ; « Préremplir » est là dès le niveau 1, sauf l'import d'un fichier (niveau 3). Une nouvelle mission s'ouvre par ☰ › Missions › « Nouveau compte rendu ».

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

### Résultat et remarques

Résultat de la mission, observations et suites à donner, en un seul bloc (placé en 2e position pour la lecture du CR).

1. Choisissez le « Résultat » : Succès, Succès partiel, Interrompue, Annulée, Déroutée, Pas de contact,
   Objectif non trouvé, Météo, Technique, Opérationnel, Autre.
2. Pour tout résultat autre que Succès ou Autre, les champs « Motif d'interruption » et « Causes » apparaissent ; cochez toutes les causes (météo, technique, simulateur, pilote absent, contrôle absent, réseau, zone non activée, ravitailleur absent, manque de temps…) : elles remontent sur la plaquette de l'ordre de vol (MNE).
3. Notez vos « Observations », puis, si besoin, « Résultat détaillé », « Incidents », « Anomalies techniques » et
   « Enseignements (lessons learned) ». Observations et enseignements forment les sections « 13. Remarques » et
   « 14. Enseignements » du compte rendu ; une mission affectée y dépose un rappel de la mission d'origine et de sa
   charge.

Ce résultat alimente le taux de réussite et le graphique « Résultats » des reportings.

### Appareil(s) +

Une carte par appareil engagé ; il y en a toujours au moins un. Le « + » du titre ajoute un appareil.

1. Tapez l'immatriculation (`F-ZB…`) : les appareils connus sont proposés avec type, indicatif, opérateur
   et base. Choisissez-en un : type, catégorie, indicatif, exploitant OACI, base et équipements se
   remplissent. Un clic dans le champ ouvre une liste déroulante avec recherche (silhouettes, par catégorie) ; la
   frappe la filtre (immatriculation, type, indicatif, opérateur), ↑ ↓ Entrée, Échap. Le « Type (OACI) » a la même
   liste.
2. Ou partez de l'indicatif : `ctm58` dans « Indicatif » donne la série, le numéro, l'indicatif complet
   et l'« Indicatif plan de vol (7 car. max) ».

| Bouton / champ | Rôle |
|---|---|
| « Fiche appareil ↗ » | ouvre la fiche de l'appareil (dès que l'immatriculation est saisie) |
| « ⟲ Effacer » | vide l'appareil pour relancer la recherche (mauvais appareil ou mauvais type) |
| « Exploitant OACI (OPR/, case 18) » | déduit de l'organisme ou de l'appareil connu |
| « Base de départ », « Base de retour », masses, « Endurance disponible (min) », « Configuration mission » | à compléter si utile |
| « Terrain d'atterrissage réel (OACI) » | terrain où l'appareil s'est vraiment posé, jamais prérempli ; dans un CR ouvert depuis « Mes missions » (ordre de mission ou de convoyage), il place l'appareil à ce terrain pour les convoyages suivants. Un CR hors ordre de mission ne déplace pas l'appareil |
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
textes figurent dans la section « 5. Tâche » du compte rendu. Aux niveaux 1 et 2, ce bloc est affiché pour les familles
qui n'ont pas leur propre bloc d'ordre (FIRE, ISR et LE l'ont : « Tâche / ordre de mission » n'y vient qu'au niveau 3).

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

### Trace réseau IVAO / VATSIM

Trace du vol sur IVAO ou VATSIM.

| Champ | Rôle |
|---|---|
| « Réseau » | « Hors réseau / non renseigné », IVAO ou VATSIM |
| « ID IVAO (VID) », « ID VATSIM (CID) » | repris de votre profil (Paramètres › Mon profil) |
| « URL de la trace » | lien vers la trace ; il apparaît dans le CR (« Ouvrir la trace ») et dans les reportings |

Le réseau renseigné alimente le graphique « Réseau » et l'indicateur « En réseau » du reporting.

### Navigation

Terrains, route, points et zone de travail. Le plan de vol déposé (SimBrief, IVAO, VATSIM) se reprend par « Préremplir ▾ › Plan de vol déposé » (voir « Préremplir »).

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
- Aux niveaux 1 et 2 (CR court), trois calculs seulement : « Temps bloc », « Temps de vol », « Carburant consommé » ; « Contexte d'affichage » et les calculs de zone et de mission viennent au niveau 3. Un clic sur une anomalie ouvre l'étape et le bloc du champ concerné, et ses autres champs s'il est masqué.

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

### Préremplir

Le menu « Préremplir ▾ » de l'en-tête (dès le niveau 1) rassemble tout ce qui remplit le CR ; les blocs ne gardent que
la saisie. C'est un menu court, une entrée par ligne, en deux groupes ; l'entrée choisie ouvre ensuite sa fenêtre (liste
des vols, zone de collage…), dont l'aide est repliée sous « Aide ». Échap ou un clic à côté referme le menu comme la
fenêtre.

**Nouveau CR depuis…** (le brouillon en cours est remplacé, après confirmation s'il n'est pas vide) :
- « Un ordre de mission » : vos 7 affectations récentes (21 derniers jours) sans CR, une ligne chacune (date et heure
  UTC, indicatif, trajet, mission) ; un clic ouvre le CR prérempli depuis l'ordre, comme « Créer le CR » dans Mes
  missions. Dernière ligne : « Ouvrir Mes missions ↗ ».
- « Un de mes vols » : vos 7 vols récents du journal de la compagnie sans CR (date, indicatif, trajet, type) ; un clic
  ouvre le CR prérempli, comme « Rédiger le CR » dans Mes vols. Dernière ligne : « Ouvrir Mes vols ↗ ».
- « Un fichier (YAML / JSON) » : un fichier de mission (niveau 3).

Les deux listes demandent votre trigramme (Paramètres › Mon profil).

**Compléter ce CR depuis…** (**seuls les champs vides sont remplis**) :
- **« Mon dernier vol IVAO »**, **« Mon dernier vol VATSIM »**. Il faut la suite ouverte par son lanceur et votre ID
  IVAO ou VATSIM dans Mon profil (sans ID, l'entrée est grisée ; son infobulle dit ce qui manque, « VID IVAO absent —
  Mon profil ») ; pour IVAO, la clé d'API de la suite (Paramètres › Installation).
  - Vos vols des 7 derniers jours (UTC), quels que soient la famille et la date du CR. Un seul vol : le CR est rempli
    aussitôt ; plusieurs : la fenêtre les liste (indicatif, trajet, date et heures UTC, « en cours » si vous êtes
    encore connecté), choisissez-le ; chaque ligne a son lien ↗ vers le tracker IVAO.
  - Vol coupé par des déconnexions : les sessions qui se suivent (même indicatif, reprise moins de 30 min plus tard là
    où la précédente s'est arrêtée, la précédente n'ayant pas fini au parking) forment un seul vol, « 3 sessions
    (reconnexions) » ; plan de vol de la dernière session, traces mises bout à bout.
  - Rempli : indicatif, terrains, plan de vol déposé (appareil, équipements, route, niveau, vitesse, dégagement,
    remarques, immatriculation `REG/`, autonomie), lien de la trace, heures tirées de la trace (mise en route,
    décollage, atterrissage, arrêt) et distance. Non rempli : ce que le réseau ignore (mission, équipage, carburant,
    résultats, incidents). Un vol « en cours » donne des heures provisoires : relancez après la déconnexion.
  - VATSIM : même principe, mais VATSIM ne publie pas de trace : les heures sont celles de connexion et de
    déconnexion (à corriger), le plan est celui déposé pour cette connexion.
  - Sans vol, la fenêtre dit pour quel ID et quelle période. Dès qu'un vol IVAO est retenu ou collé, « Voir sur le
    tracker IVAO ↗ » apparaît à côté du champ « URL de la trace » (bloc Trace réseau).
- **« Plan de vol déposé (SimBrief / IVAO / VATSIM) »** : la fenêtre propose « Dernier OFP SimBrief » (votre
  identifiant SimBrief du profil pilote), « Plan de vol IVAO (vol en cours) » (votre VID), « Plan de vol VATSIM (en
  cours ou déposé) » (votre CID) : appareil, équipements OACI, route, points tournants, niveaux, terrains, METAR / TAF,
  masses et carburant prévus (SimBrief). Les points tournants suivent la route : quand l'import remplit la route, ils
  sont remplacés par ceux du plan de vol (navlog de l'OFP SimBrief), même si le champ en contenait déjà.
- **« Coller un plan de vol, une page du tracker ou un METAR »** : collez (Ctrl+V) dans la zone, l'analyse est
  immédiate ; ou « Coller depuis le presse-papiers » (Chrome demande l'autorisation une fois). Textes reconnus : plan
  de vol OACI « (FPL-…) », page du tracker IVAO (détails d'un vol ou liste des connexions), page d'un vol StatSim
  (VATSIM), historique VATSIM (JSON), METAR. Les liens « ↗ Tracker IVAO (mes connexions) » et « ↗ Mes vols StatSim
  (VATSIM) » ouvrent vos pages.
- **« Favori « → CR » »** : le lien « → CR », à glisser une fois dans la barre des favoris, copie la page du tracker en
  un clic.

**Le même résumé pour toutes les sources**, en notification (10 s), la fenêtre refermée : la source et la date du vol
(« Plan de vol OACI, vol du 19/10 »), le nombre de champs remplis et les blocs touchés (appareil, chronologie, route,
météo…), le nombre de champs déjà saisis gardés, et ce que la source n'a pas donné (« absents de la source : décollage,
atterrissage »). Deux boutons l'accompagnent : « Annuler » remet le CR tel qu'il était avant le préremplissage ;
« Remplacer les champs déjà saisis (n) », quand des champs déjà saisis ont été gardés, réapplique la même source en les
remplaçant. La source la plus explicite gagne : l'aide « appareil connu » (flotte) ne remplit que le vide, elle ne
remplace ni un champ posé par la source ni un champ déjà saisi, même si l'immatriculation change dans le même geste ;
le résumé le dit (« indicatif de la flotte MILAN74 non appliqué (CFN12 vient de la source) »). Détails du collage :
[tutoriel](TUTORIAL.md), § 6.

**Provenance.** Le titre de chaque bloc rempli par une source porte une pastille « ↧ » qui la nomme : « Plan de vol
OACI, vol du 19/10 », « IVAO — dernier vol », « Ordre de mission M-016 », « Journal de la compagnie », « Suivi réseau
IVAO »… ; son infobulle dit combien de champs du bloc en viennent. Un champ corrigé à la main perd sa provenance (la
pastille disparaît avec le dernier). « Annuler » remet aussi les pastilles d'avant. La provenance est gardée avec le
brouillon, dans ce navigateur ; elle n'entre pas dans le registre.

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
| « Envoyer ▾ › Envoyer le CR » | envoie mission, CR (HTML et texte) et calculs au webservice ; la bulle du bouton rappelle le dernier envoi. Une mission non enregistrée demande confirmation |
| « Envoyer ▾ › Enregistrer le vol sur le site ↗ » | ouvre la page « Enregistrer mon vol » du site de la compagnie avec les champs du vol (voir ci-dessous) |
| « Registre des missions ▾ › Voir le reporting » | ouvre le reporting de la famille |

Tant que le webservice n'est pas réglé, « Envoyer le CR » propose d'ouvrir son paramétrage
(« Paramétrer l'envoi des CR (webservice)… »).

**Déclarer le vol sur le site de la compagnie.** Le site s'ouvre dans un autre onglet, où vous êtes connecté. La suite ne
s'y connecte pas et ne valide rien à votre place : elle prépare le formulaire « Ajouter un vol », vous le relisez et le
validez.

1. Une fois, glissez le favori « → Vol » (menu « Envoyer ») dans la barre des favoris du navigateur.
2. CR enregistré, « Envoyer ▾ › Enregistrer le vol sur le site ↗ » ouvre la page « Enregistrer mon vol » du site, avec
   les champs du vol dans l'adresse (après « # » : jamais envoyés au serveur). Un CR non enregistré demande confirmation.
3. Connectez-vous si le site le demande, puis cliquez le favori « → Vol » : il ouvre la page de votre appareil
   (reconnu par son immatriculation), puis « Ajouter un vol » ; cliquez-le encore sur ce formulaire.
4. Le favori remplit l'indicatif (choisi dans la liste du site par son nom, CARAFON, ou son code, CFON), le numéro de
   vol, la date de fin du vol (date du CR et heure de fin bloc, sinon d'atterrissage, en heure locale comme la chronologie du CR ; le lendemain si le vol
   passe minuit), la durée (bloc, sinon vol), la mission (famille, type, opération) et l'arrivée. Ce qui est rempli
   s'entoure de vert, ce qui manque de rouge. L'immatriculation et le départ, que le site impose (position actuelle de
   l'appareil), ne sont pas modifiés : un écart avec le CR est signalé.
5. Relisez, complétez, puis « Valider » sur le site.

Si les champs se perdent (connexion demandée en route), relancez « Enregistrer le vol sur le site ↗ ». Sans le favori,
« Copier les champs » copie une ligne (immatriculation, type, indicatif, date, durée, départ → arrivée, mission) à
reporter à la main. Le menu « Site de la compagnie » n'apparaît que si l'adresse du site est réglée (Paramètres ›
Installation › Sources et dossiers).

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

Les familles HEMS et FIRE peuvent reprendre leur ancien registre CSV : voir
[Reporting d'une famille](#reporting-dune-famille).

## Flotte
<!-- page: apps/cr/flotte.html -->

Où sont les appareils de la flotte : onglet « Flotte » du bouton « Compte rendu » de la barre latérale, à côté de
l'onglet « Compte rendu ». La page est en lecture seule et ouverte à tous ; Centre activé dans ce navigateur, le bouton
« Modifier la flotte » mène au tableau éditable (Paramètres › Centre › Flotte).

- **Carte** : chaque appareil est à son terrain actuel (emplacement donné par le site de la compagnie, ou terrain
  d'atterrissage d'un CR issu d'un ordre de mission, sinon sa base), sur un fond OpenStreetMap. Vue d'ensemble : une
  pastille par terrain avec le nombre d'appareils ; des terrains trop proches pour être distingués à ce zoom sont
  réunis en une seule pastille (« LFMI +2 ») avec le nombre total d'appareils. En zoomant (boutons « + » / « − »,
  Ctrl + molette, double-clic), les appareils d'un terrain se rangent un par un sur une aire de stationnement ;
  « Toute la flotte » recadre la carte.
- **Survol** : d'une pastille de plusieurs appareils, leur nombre par indicatif (série) et type ; d'une pastille de
  plusieurs terrains, en plus le nombre par terrain ; d'un appareil (ou d'une pastille d'un seul), sa fiche courte :
  indicatifs, opérateur, terrain actuel et depuis quand, base, date et heure du dernier vol (journal des vols de la
  compagnie et comptes rendus : le plus récent).
- **Sélection** : clic sur un appareil ; clic sur une pastille : ses appareils, et zoom dessus ; Ctrl ou Maj + clic :
  ajouter ou retirer ; Maj + glisser : rectangle ; Échap ou « Effacer la sélection ». La liste sous la carte mène à la
  fiche de chaque appareil, et les lignes sélectionnées sont surlignées dans le tableau.
- **Filtres** (en tête de la carte, cumulés) : opérateur, type, indicatif (série), terrain, statut, origine de la
  position (site, ordre de mission, base), dernier vol (moins de 7, 30, 90 jours, plus de 90 jours, aucun vol connu) et
  recherche libre (immatriculation, indicatif, type…). Chaque liste donne le nombre d'appareils par valeur ;
  « Réinitialiser les filtres » les efface. Les choix sont gardés dans ce navigateur.
- **Tableau** « Appareils de la flotte » : les appareils retenus par les filtres (immatriculation, type, variante,
  indicatifs, opérateur, terrain actuel et origine, base, dernier vol, statut), triables par colonne. Survol d'une
  ligne : sa position est surlignée sur la carte ; clic : l'appareil est sélectionné et la carte centrée sur son
  terrain ; l'immatriculation ouvre la fiche appareil.
- « n sans terrain connu » (infobulle) liste les appareils sans terrain, ou dont le terrain est introuvable.

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

**Se déplacer** : la fiche est sous l'onglet « Flotte » (Compte rendu › Flotte), qui ramène à la liste et à la carte. En tête de fiche, la liste de la flotte (par type) ouvre un autre appareil ; « ‹ » et « › » passent à l'appareil précédent ou suivant du même type.

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

Les champs modifiables sont en tête du bloc ; chacun est enregistré dès qu'il change, **dans ce navigateur** (inclus dans la sauvegarde
locale) : l'heure du dernier enregistrement s'affiche sous les notes. L'identité est calculée sur tout l'historique, quelle que soit la période.

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

Chaque champ est enregistré dans ce navigateur dès qu'il change. « Fusionner avec… / renommer » réunit deux
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
pour leur bilan et au Centre pour le suivi. Pour y aller : barre latérale › **Outils**, onglet « Analyse des missions » (outil facultatif, coché dans Mon profil).

### Familles et période

Premier bloc de la page (l'en-tête ne garde que le titre et le sous-titre) : il se replie et se déplace comme les autres ; à l'impression, seule la période paraît.

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

Le reporting d'une famille ne montre que les missions de cette famille, avec ses indicateurs propres.
On y arrive par « Registre des missions ▾ › Voir le reporting » dans un CR, par une ligne de « Synthèse
par famille » du reporting général, ou par le menu « famille · sous-type » du bloc « Famille et période » d'une autre page de reporting.

### Famille et période

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
Elle est ouverte à tous les pilotes. Pour y aller : barre latérale « Outils », onglet « Cartes de vol », bouton « Ouvrir dans les Cartes de vol » d'une mission dans Mes missions, ou bouton « Cartes de vol » du planificateur carburant.
Elle reprend le moteur du studio cartographique du Centre, mais travaille dans un espace propre à votre navigateur : vos réglages ne modifient jamais la mission du Centre.
Chaque bloc se replie (« Masquer » / « Afficher ») et se déplace (poignée ↕). La base SIA doit être lue une fois dans ce navigateur (voir le dernier bloc).
Aux niveaux 1 à 3 (Mon profil › « Niveau d'utilisation »), la page se limite à deux blocs : « Cheminement » (champ de route, « Niveau », « SimBrief », carte de contrôle avec « ⤢ Agrandir ») et « Cartes », avec son unique bouton « Générer les cartes ». Les autres commandes décrites ci-dessous n'apparaissent qu'au niveau 4 (Expert).

<!-- capture-manuels: utilisateur-cartes-vol -->
![Cartes de vol : cheminement, profil cartographique, cadrage et choix des cartes à préparer.](images/captures-manuels/utilisateur-cartes-vol.png)

*Figure 7 — Cartes de vol : cheminement, profil cartographique, cadrage et choix des cartes à préparer.*

En tête de page, « Ouvrir dans ▾ » ouvre la route du bloc « Cheminement », son niveau et l'avion choisi dans SimBrief, SkyVector, Navigraph Charts ou ChartFox (cartes des terrains de départ et d'arrivée), dans un nouvel onglet ; même menu que dans le Carburant (voir « Ouvrir dans ▾ » au chapitre Carburant).

**À l'ouverture : le vol en cours.** La page reprend le vol préparé dans le Carburant (bloc « Profil vertical » et devis) :
route, niveau de croisière, fiche de l'appareil et dégagement (celui du dernier OFP SimBrief quand il porte le même trajet).
Le plus récent l'emporte entre ce vol et ce qui a été saisi ici. Dès la base SIA chargée, la carte de la route et la
coupe verticale s'affichent d'emblée, sans autre clic. La carte de la route prend le profil « IFR bas » (vol jusqu'au
FL195 : voies aériennes basses) ou « IFR haut » (au-dessus : voies hautes, tracks NAT), avec la symbologie OACI et les
zones R, D, P, TRA, CTR, TMA et CTA de la tranche qui passent à moins de 10 NM du cheminement ; départ, destination et
dégagement y sont nommés. Une mission reçue de Mes missions est gardée telle quelle.

### Réception d'une mission (« Ouvrir dans les Cartes de vol »)

La page n'affiche pas de bloc « Mission » : la mission arrive toute seule depuis Mes missions.

1. Dans Mes missions, ouvrez le dossier de la mission.
2. Cliquez sur « Ouvrir dans les Cartes de vol ». L'appareil qui vous est attribué est repris en tête de la mission.
3. La page s'ouvre avec le cheminement et le niveau de la mission dans le bloc « Cheminement », et toutes les cartes prévues par la mission dans « Cartes à produire » (plus `profil_vertical.png`). La liste « Cartes à produire » n'est visible qu'au niveau Expert.
4. Réglez au besoin chaque carte (niveau Expert), puis cliquez sur « Générer les cartes » : dans le bloc « Cartes » aux niveaux 1 à 3, au pied de page au niveau Expert.

Le pied de page indique le nombre de cartes à générer (« … carte(s) à générer »), ou « Aucune mission chargée ».
Mission reçue : « Tracer » et « Carburant » travaillent sur la mission chargée sans la remplacer. Aux niveaux 1 à 3, « Générer les cartes » génère ses cartes telles quelles. Au niveau Expert, « Préparer les cartes » demande confirmation avant de la remplacer par un vol libre « Vol départ → destination » construit à partir du cheminement ; sans mission chargée, les cartes sont créées directement.

### Cheminement

Ce bloc relie trois vues : le plan de vol (texte), la carte et la coupe verticale. Le survol d'un point dans l'une éclaire les deux autres. Certains messages de la page appellent ce bloc « Route ».

- Champ de route : case 15 du plan de vol OACI, ou liste à virgules (par exemple `LFBO N0160A055 DCT TOU UN460 NTS DCT LFRN`). Vide : route de la mission.
- « Niveau » : niveau de croisière (« FL65 » ou « 6500 »).
- Menu « Voies aériennes » / « RTBA (basse hauteur) », puis « Chercher » : calcule une route entre les points du champ. Le résultat remplace le champ.
- « SimBrief » : reprend la route du dernier OFP, point par point (chaque point du navlog avec sa position, points des
  voies aériennes et des procédures compris), son niveau et, dans les Cartes de vol, son dégagement ; la ligne sous le bloc dit ce qui a été lu (même résumé que dans le Carburant, « Voir le JSON »). L'identifiant SimBrief se saisit dans Paramètres › Mon profil.
- « Tracer » : dessine la coupe verticale. « Carburant » : ouvre le planificateur carburant avec cette route (distance, niveau, route vraie, appareil).
- « Copier OACI » : copie le plan de vol OACI strict (points non publiés en coordonnées).
- « Syntaxe et utilisation » : rappel des formes acceptées (balises, points de report VFR « MM-CV », « REN300010 », coordonnées « 4330N00125E », niveaux « /A035 », « VFR »…).
- Coordonnées écrites autrement : tapez-les comme vous les avez (« 44.18N 00.038W », « N44,18-W00,034 »,
  « 44°19'52"N 00°59'59"W », « +44.18,-0.038 », « 4418N0003W »…) ; à la sortie du champ, elles sont mises au format du plan
  de vol, à la minute (« 4411N00002W ») si la position y tombe juste, sinon à la seconde (« 441048N0000217W ») ; une
  notification dit ce qui a été réécrit. « Copier OACI » arrondit toujours à la minute.
- Aux niveaux 1 à 3 restent le champ de route, « Niveau », « SimBrief » et « Syntaxe et utilisation » ; le menu « Voies aériennes » / « RTBA », « Chercher », « Tracer », « Carburant » et « Copier OACI » sont au niveau Expert.

Sur la carte : glissez un point pour le déplacer (il s'aimante sur balises, points de report et terrains), cliquez sur la route pour insérer un point, clic droit pour en supprimer un. Sur la coupe : clic pour ajouter un point à cette altitude, glisser pour changer l'altitude, clic droit pour supprimer.

Carte et coupe vont ensemble. Survoler la coupe pose un repère bleu au même endroit de la route sur la carte ; survoler la route sur la carte trace un trait bleu à la même distance dans la coupe. L'infobulle de la coupe donne l'altitude, la hauteur sol, le relief, la distance depuis le départ (NM) et l'espace survolé à cette altitude, qui est surligné sur la carte. Un clic sur un point de la coupe, sans le déplacer, recentre la carte sur lui. La carte porte aussi les repères TOC (fin de montée), TOD (début de descente) et des graduations en NM le long de la route.

### Carte de contrôle et cadrage (bloc Cheminement)

Sous le champ de route, une carte de contrôle montre la carte choisie avec son profil d'affichage. Elle se redessine à chaque réglage. Le cheminement y est le trait rouge de l'éditeur de route (points déplaçables) ; le tireté violet ne figure que sur les cartes générées. Aux niveaux 1 à 3, seule « ⤢ Agrandir » est proposée ; les autres commandes du tableau et les « Réglages du profil : coupe, appareil, vario, sorties » sont au niveau Expert.

| Commande | Effet |
|---|---|
| « Carte » | Carte affichée (par défaut : la carte générale de la route). |
| « Profil » | Profil d'affichage de cette carte (même réglage que dans « Cartes à produire »). |
| « Générer » | Générer ou non cette carte. |
| « Actualiser » | Redessiner l'aperçu. |
| « Garder ce cadrage » | La carte générée reprendra exactement le cadre affiché (zoom et déplacement à la souris). |
| « Recentrer » / « Cadrage automatique » | Revenir au cadrage enregistré / l'oublier pour un cadre calculé d'après la mission. |
| « ⧉ Fenêtre » / « ⤢ Agrandir » | Ouvrir la carte dans une fenêtre séparée / l'agrandir (Échap pour revenir). |

« Réglages du profil : coupe, appareil, vario, sorties » règle la coupe verticale : plancher et plafond (0 = auto), appareil (fiches de performances, liste déroulante avec recherche) ou taux de montée et de descente, image `profil_vertical.png` dans les sorties, tracé du cheminement sur les cartes.

### Réglages du profil : fond de carte, zones, symboles OACI, éléments

Ce panneau repliable, placé sous la carte de contrôle, règle le profil d'affichage de la carte choisie. Les profils (IFR, IFR simplifié, VFR détaillé, VFR simplifié, AIRWAYS…) sont communs à toutes vos missions et gardés dans le navigateur. Profil par défaut d'une carte : AIRWAYS pour la carte de la route des Cartes de vol ; IFR simplifié pour la carte principale d'une mission et les vues d'ensemble ; VFR détaillé pour les cartes cible, détail et rendez-vous ; VFR simplifié pour l'approche. Panneau du niveau Expert.

- En tête : « Nom du profil », « Fond de carte » (OSM standard, OpenTopoMap, fonds vectoriels…), boutons « Sauvegarder », « Nouveau », « Dupliquer », « Supprimer ».
- Onglet « Fond de carte » : couches OSM (sol, hydrographie, routes, relief, courbes de niveau, sommets…), villes en symboles OACI et seuil de population, libellés de villes, surfaces bâties.
- Onglet « Zones » : familles d'espaces (R / D / P, CTR, TMA, CTA, SIV, TRA, RMZ, TMZ, PJE), symbologie OACI, tranche d'altitude affichée, opacité. « Sélection des zones » : liste blanche ou noire (bouton « Liste blanche » pour basculer), saisie avec complétion (« R 45 A », « @RTBA »…), « Coller une liste… », « Tout supprimer ». « Zones retenues » montre le résultat.
- Onglet « Symboles OACI » : aérodromes (par catégorie, contrôlés ou non, liste blanche), radionavigation, voies aériennes basses et hautes, tracks NAT du jour (tireté magenta, « NAT A » ; zone Atlantique Nord active), points de report VFR et points RNAV en route (triangle bleu), survol interdit, parcs et réserves, obstacles.
- Onglet « Éléments » : points tournants, méridiens et parallèles, grille MORA, libellés des villes, hippodrome de ravitaillement, zones de mission et de recherche.

Pensez à cliquer sur « Sauvegarder » pour garder un profil modifié. Les listes de suggestions de la saisie (zones, aérodromes, balises) ne se remplissent que lorsque vous cliquez dans le champ concerné : la page s'ouvre ainsi plus vite, et la liste apparaît dès le clic ou la première frappe.

### Cartes

Ce bloc crée les cartes d'un vol à partir du cheminement, sans mission du Centre ; aux niveaux 1 à 3, il les génère aussi.

1. Saisissez le cheminement et le niveau dans le bloc « Cheminement » (au moins un départ et une destination connus de la base SIA).
2. Facultatif : « Rendez-vous (facultatif) », un point ou des coordonnées « 44.2, 0.6 » ; « Dégagement (OACI,
   facultatif) », repris du Carburant s'il y est connu ; un dégagement absent de la base SIA est signalé et les
   cartes sont faites sans lui.
3. Cochez les cartes voulues : « route (vue d'ensemble, IFR) » (profil IFR bas ou haut selon le niveau, voir plus haut),
   « approche », « rendez-vous », « destination ».
4. Cliquez sur « Générer les cartes » (niveaux 1 à 3) : les cartes sont créées puis générées, la progression (avec
   « Arrêter ») et le compte rendu s'affichent juste dessous. Les images (chaque carte et `profil_vertical.png`)
   s'affichent ensuite dans le bloc : un clic agrandit, « Télécharger » enregistre l'image, « Imprimer » l'imprime,
   « Tout imprimer » imprime toutes les images, une par page. Il n'y a plus de ZIP. Au niveau Expert, « Préparer les
   cartes » les crée seulement : réglages dans « Cartes à produire », génération au pied de page.

La page fabrique une mission « Vol départ → destination » avec les cartes cochées et le profil vertical. La carte de rendez-vous n'est créée que si un rendez-vous est saisi.
Aux niveaux 1 à 3, la page n'a ni pied de page ni bloc « Aperçus et génération » : tout part du bouton de ce bloc.
Ensuite, toute modification du cheminement, du niveau ou du rendez-vous met les cartes à jour automatiquement.
Arrivée depuis le planificateur carburant (bouton « Cartes de vol ») : même ouverture sur le vol en cours, cartes créées seules dès que la base SIA est chargée.
Messages d'erreur possibles : « Base SIA absente de ce navigateur », « Route : inconnu(s) dans la base SIA », « Aucune carte choisie ».

### Cartes à produire

Bloc du niveau Expert. La liste « Cartes de la mission » donne une ligne par carte :

| Élément de la ligne | Usage |
|---|---|
| Nom du fichier | Clic : afficher la carte dans la carte de contrôle (✎ : cadrage personnalisé). |
| Profil | Profil d'affichage de la carte, ou « Désactivé ». |
| Tracé | « Sans tracé », « Brief : cheminement », « Organisation : route probable », « Cheminement + route probable ». |
| Destinataire | Seulement pour les missions d'exercice : brief, organisation, chiffon ou équipage. |
| « Générer » | Décocher pour ne pas générer la carte. |
| « × » | Supprimer la carte de la mission. |

Pour ajouter une carte : saisissez un nom (« nouvelle_carte.png »), choisissez le type (générale, cible, détail, zone), puis « + Carte ». Son emprise est la vue affichée.
Sans mission ni cartes créées, la liste indique « Aucune carte : ajoute-en une ci-dessous. »

### Aperçus et génération

Bloc du niveau Expert ; aux niveaux 1 à 3, le compte rendu de la génération (cartes générées, échecs et « Réessayer seule ») s'affiche sous le bouton du bloc « Cartes ».

1. « Afficher toutes les cartes » : dessine un aperçu de chaque carte avec son profil. Les aperçus ne créent aucun fichier. Clic sur un aperçu : agrandissement.
2. Chaque aperçu garde sa case « Générer ».
3. « Générer les cartes » (bouton du pied de page) : les images de chaque carte et `profil_vertical.png` s'affichent
   dans le bloc « Cartes », à télécharger ou imprimer une à une (pas de ZIP).

La « Carte d'assemblage » s'affiche d'elle-même sous les aperçus (aperçu seulement) ; elle reprend le profil de la carte générale.
Formats : menu ☰ › Sorties des cartes (PNG, SVG éditable, largeur PNG de 400 à 5000 px ; 1600 px par défaut).
Si une carte échoue (fond indisponible, délai dépassé), le compte rendu le dit et propose « Réessayer seule », qui remplace son image.
Gardez l'onglet visible pendant la génération : le navigateur ralentit les onglets en arrière-plan, et une carte peut échouer (« Délai dépassé pendant le chargement du fond de carte ») ; « Réessayer seule » la relance.
Les boutons restent grisés tant qu'aucune carte n'est à produire. Pendant les aperçus et la génération, la barre de progression porte un bouton « Arrêter » : la carte en cours s'achève, les suivantes ne sont pas faites. Une génération arrêtée n'affiche aucune image (elles seraient incomplètes) ; les aperçus déjà affichés restent. Relancez « Générer les cartes » pour toutes les cartes.

### Base de données SIA

Ce bloc est au niveau Expert et masqué par défaut : cliquez sur « Afficher ». Quand la base manque dans ce navigateur, il s'ouvre de lui-même, quel que soit le niveau. Il lit le dossier SIA (AIXM) et le garde dans le navigateur. Sans lui, la page ne reconnaît ni terrains, ni balises, ni espaces.

- Bouton « Dossier SIA : … » : choisir le dossier `data/sia` (le navigateur demande l'accès), puis lecture.
- « Reconstruire la base aéronautique » : à faire après chaque mise à jour AIRAC ; lit les zones actives de Paramètres › Maintenance › Données aéronautiques. Une jauge suit la lecture ; « Annuler » l'interrompt sans toucher à la base gardée.
- « Purger le cache » : efface la base gardée (elle sera reconstruite à la prochaine relecture).
- La ligne d'état indique la base gardée, son cycle AIRAC et sa date ; « cycle périmé » s'affiche si un cycle plus récent est en vigueur. « Fichiers analysés » liste les fichiers lus.
- Sans base, la page le signale : « Base SIA absente de ce navigateur : bloc « Base de données SIA », « Reconstruire la base aéronautique », ou Paramètres › Maintenance. »

C'est le même bloc que Paramètres › Maintenance › Données aéronautiques. La même base sert au profil vertical du planificateur carburant.

## Carburant
<!-- page: apps/planner/flight_performance_planner.html -->

Le planificateur carburant (titre « Carburant ») calcule le carburant d'un vol à partir du profil de performances de votre appareil. La consommation de croisière vient, dans l'ordre, de votre saisie pour ce vol, du profil enregistré, du modèle de Poll et Schumann (avions de ligne à réaction, selon la masse, le niveau et le Mach), de SimBrief, puis d'une estimation par type ou classe OACI ; une valeur approchée est marquée ≈. Pour un type sans fiche EUROCONTROL ni SimBrief (militaires, hélicoptères), l'estimation reprend la TAS de croisière et le plafond publiés par Airframe DB quand il les connaît. Il aide aussi à choisir le niveau de vol et la façon d'y monter.
Pour y aller : barre latérale « Outils », onglet « Carburant », bouton « Carburant (planificateur) » d'une mission dans Mes missions, ou bouton « Carburant » des Cartes de vol. La route, la distance, le niveau et l'appareil sont alors repris.
En-tête : bouton « Avion », liste déroulante avec recherche (les fiches de performances existantes : « Mes appareils » en tête, puis par catégorie ; tapez un nom, un type ou un désignateur pour filtrer, ↑ ↓ Entrée, Échap), bouton « Récupérer dernier FPL SimBrief », « Unités : kg / lbs ». Le Carburant fait le devis et seulement le devis : les fiches se créent et se modifient dans « Fiches de performances » (chapitre suivant), les appareils se déclarent dans « Mes appareils » (Paramètres › Mon profil › Appareils et simulateurs).
Selon le niveau d'utilisation : aux niveaux 1 à 3 (Équipage, Planification, Conception), la page montre l'avion, le plan de vol (et « Récupérer dernier FPL SimBrief »), le repli « Paramètres du vol », « Calculer » et le Résultat, sur deux colonnes ; le menu ☰ n'y garde qu'exporter et importer les préférences. Courbes, panneaux, instruments et profil vertical s'ajoutent au niveau Expert, où la page est complète.
Sur écran large, au niveau Expert, la page a trois colonnes (saisie et courbes | Résultat et panneaux | instruments) : glissez les poignées entre colonnes pour régler leur largeur ; double-clic : largeurs par défaut.

<!-- capture-manuels: utilisateur-carburant -->
![Carburant : paramètres du trajet, consignes de montée et résultat du devis pour un DHC-8-400 / Q400.](images/captures-manuels/utilisateur-carburant.png)

*Figure 8 — Carburant : paramètres du trajet, consignes de montée et résultat du devis pour un DHC-8-400 / Q400.*

### Ouvrir dans ▾ (services externes)

Le bouton « Ouvrir dans ▾ », sous le plan de vol, ouvre le vol de la page dans un autre service, dans un nouvel
onglet : départ, arrivée, route, niveau et avion actif ; dégagement, indicatif et immatriculation du dernier OFP
SimBrief s'il porte le même trajet. Rien d'autre n'est envoyé (ni identifiant personnel, ni clé). Échap ou un clic
ailleurs referme le menu.
- « SimBrief — préparer ce vol » : options du vol préremplies (connexion SimBrief requise) ; grisé sans départ,
  arrivée ou type d'appareil.
- « SkyVector — la route » : plan de vol tracé sur la carte ; grisé sans départ ou arrivée.
- « Navigraph Charts » et « ChartFox » — départ, arrivée : cartes du terrain (connexion requise ; page de l'aérodrome
  si le site la garde).
Une entrée grisée donne son motif au survol.

### Choisir l'avion

1. Cliquez sur le bouton d'avion de l'en-tête (« Aucun avion » au départ) : la liste ne montre que les appareils qui ont une fiche de performances, ceux de « Mes appareils » en tête, puis les autres par catégorie (icône, nom, type, source de la fiche, état).
2. Choisissez un appareil à la souris, ou avec les flèches puis Entrée ; Échap ferme la liste. « Gérer les fiches de performances ↗ », en bas de la liste, ouvre la page des fiches.
3. Ouvert sur un appareil sans fiche (bouton d'une mission, adresse `?aircraft=`), le devis affiche « Pas de fiche de performances pour … — ouvrir les Fiches de performances ↗ » : le lien ouvre la page des fiches sur cet appareil, où la créer.

La fiche choisie reste visible en lecture seule dans le Résultat (groupe repliable « Régimes de vol — profil ↔ cartographie »), avec « Modifier cette fiche dans les Fiches de performances ↗ ». Une fiche enregistrée dans les Fiches de performances ouvertes dans un autre onglet est reprise aussitôt, et le devis refait.

### Devis carburant

1. « Plan de vol (case 15) » : saisissez la route. C'est le même plan que les Cartes de vol (le plus récent l'emporte). La distance, la route vraie et le niveau en sont déduits. Sous le champ, les points de la route s'affichent un par un (terrains en gras, points des voies aériennes atténués, niveau après le point où il change ; survol : position). Après « Récupérer dernier FPL SimBrief », une ligne dit ce qui a été lu, par exemple « OFP du 19/10 · LFRS → LFML · 11 points · FL270 · dégagement LFPG · S210 F-BHHH » (aussi en notification), avec « Voir le JSON » (fenêtre du JSON de l'OFP, « Copier »). Un OFP sans route point par point le dit (« navlog vide… ») : la route se réduit alors aux terrains.
2. Réglez « Niveau (FL) », seul paramètre toujours affiché, puis complétez ou corrigez les champs du repli « Paramètres du vol » (déplié d'emblée au niveau Expert sur ordinateur, replié sinon et sur téléphone ; les valeurs par défaut suffisent pour un devis rapide) : « Distance (NM) », « Route vraie (°) », « Taxi (min) », « Vent de (°) », « Vent (kt) », « Réserve (min) », « Contingence (%) ».
3. Facultatif, dans le même repli : « Masse au décollage prévue », comparée à la MTOW du type ; « Écart ISA (°C) », ou « Température sol (°C) » avec « Altitude terrain (ft) », ou « Température au niveau (°C) ». « Consommation de croisière (kg/h) » : préremplie par le profil ; sans profil, la page dit quelle valeur elle utilisera et d'où elle vient (par exemple « ≈ 4 000 kg/h, estimation type A400 ») ; « Utiliser cette valeur » la reprend dans le champ, « Mémoriser pour ce type » la garde pour les prochains vols. « Montée choisie » (vue détaillée) : trois curseurs, « Vitesse indiquée », « Vario » et « Gaz (%) » (RPM ou N1 si le profil a une cartographie moteur), chacun précédé d'une case « fixé » ; deux sont fixés, le troisième est calculé et grisé ; « plein gaz » s'affiche sous le vario ; la ligne du dessous donne débit, TAS et gaz à mi-montée. C'est cette montée que le devis compte.
4. Cliquez sur « Calculer ».

Vent laissé vide : la page l'indique (« Vent inconnu : fourchette ±25 kt… ») et donne le carburant en fourchette.
Avec un écart ISA, un encart « Météo » du Résultat compare à l'atmosphère standard : trajet au niveau du plan (temps, carburant), niveau optimal et plafond. Le QNH n'entre pas dans le calcul (les niveaux de vol sont des altitudes pression).
Le profil reste calibré en atmosphère standard ; le devis vole dans l'atmosphère du jour : un air plus chaud, moins dense, donne une TAS plus grande à badin égal, mais moins de poussée ou de puissance, un vario et un plafond plus faibles, et une consommation plus forte pour un réacteur.
Le bouton « Cartes de vol » (niveau Expert) ouvre les Cartes de vol avec ce plan de vol ; les cartes et le profil y sont créés à l'arrivée.
« Syntaxe du plan de vol » rappelle les formes acceptées. Sans base SIA dans le navigateur, seuls les points en coordonnées sont reconnus.

### Décision du niveau de vol

Après « Calculer », en tête du devis (vue simple comme vue détaillée), un graphe donne pour chaque niveau le carburant (échelle de gauche, courbe pleine) et le temps (échelle de droite, courbe fine) du trajet entier : montée selon l'objectif choisi dans « Consignes de montée », croisière du profil, descente. Chaque échelle a la couleur et le titre de sa courbe ; la fiche donne les deux valeurs dans les mêmes couleurs. Le niveau du plan est un trait plein, le curseur un trait pointillé.
- Au-dessus du graphe, deux pastilles : « Le plus économe » et « Le plus rapide », avec niveau, carburant et temps ; un clic y met le curseur. En vue détaillée, avec l'objectif « Éco », une troisième donne la croisière économique.
- Grisé : niveau non tenable — au-delà du plafond, trajet trop court (monter puis redescendre prend plus que la distance) ou poussée insuffisante ; la raison et le champ à modifier s'affichent dans la fiche du curseur.
- Survolez le graphe, cliquez-y ou réglez la réglette dessous : la fiche est un tableau, toujours le même, à trois colonnes — « Plan », le niveau du curseur et « Écart » (carburant et temps du trajet, montée, TOD). Ses lignes : carburant et temps du trajet, TAS de croisière, montée (temps, carburant, distance), badin et vario de montée, début de descente (TOD), descente (temps, carburant, distance), badin et vario de descente (badin du profil s'il est saisi dans Descente › Badin). Curseur sur le niveau du plan : la colonne du curseur est estompée, sans écart. Le bloc « Consignes de montée » suit le niveau choisi (clic, réglette, pastille ou ligne du tableau), pas le simple survol.
- « Utiliser ce niveau » fait du curseur le nouveau niveau du plan (« Niveau (FL) ») et refait le devis ; la comparaison se referme d'elle-même.
- Le tableau « Niveaux », dessous, reprend les niveaux ronds (tous les 1000 ft ; 2000 ft pour un plafond au-delà de 20 000 ft), triable par niveau, carburant ou temps ; un clic sur une ligne choisit ce niveau ; un niveau non tenable affiche « — » et sa cause.

### Montée (vue détaillée)

En vue détaillée (bouton « Vue détaillée » / « Vue simple » du Résultat ; détaillée par défaut au niveau Expert), sous les consignes de montée :
- « Montée — vario, carburant et vitesses selon l'altitude » : trois panneaux sur le même axe et avec le même curseur que la décision du niveau — vario (tirets : vario max à Vy), carburant par 1000 ft, badin à tenir (trait) et TAS (tirets), pour l'objectif choisi dans les consignes de montée. Avec une cartographie moteur, « par altitude » / « par régime » montre aussi le vario selon le régime à mi-montée.
- « Objectifs de montée » : un objectif par ligne (« Éco », « Vy », « Rapide », « Profil », « Réglée ») — temps, carburant, badin et vario, toujours jusqu'au niveau du plan ; ★ : meilleur temps et meilleur carburant ; un clic sur une ligne choisit l'objectif.
- « Régimes de montée — cartographie moteur » (seulement s'il y en a une) : vario et carburant par 1000 ft à mi-montée pour chaque régime ; ★ : le plus économe.

Les curseurs « Montée choisie » du devis règlent l'objectif « Réglée ».
Au-dessus du niveau où le Mach du profil n'est plus tenable, un réacteur vole à la plus grande vitesse permise par 92 % de sa poussée (« poussée max. » dans la fiche) ; le niveau n'est refusé qu'au-delà du plafond.
Sans « Altitude de référence (ft) » ni « Plafond max (ft) » dans le profil, le modèle les estime (badin et TAS de croisière, fiche EUROCONTROL, débit de montée, sinon valeur type de la classe) et l'indique dans le panneau de la décision du niveau. Renseignez ces deux champs, ou calibrez sur un OFP SimBrief : c'est plus fiable.

### Consignes de montée

Ce bloc, sous « Calculer », dit comment monter, à tout niveau d'utilisation.
- Cinq objectifs, chacun avec son temps et son carburant jusqu'au niveau : « Éco », « Vy », « Rapide », « Profil » (vitesse de montée du profil), « Réglée » (montée choisie). Le choix est gardé dans ce navigateur.
  « Vy » : vario maximal (niveau atteint au plus tôt) ; « Rapide » : temps de bloc minimal ; « Éco » : carburant du trajet minimal. Pour ces deux dernières, la distance de montée est retranchée de la croisière, le vario reste au moins à 50 % du maximum, et un réacteur est limité à 250 kt sous le FL100.
- Une consigne en trois temps : « Régler » (gaz, hélice, RPM ou N1), « Tenir » (l'instrument qui porte la consigne, le plus souvent le badin), « Attendu » (vario à voir, niveau atteint, temps et carburant).
- Un tableau par tranche d'altitude (sol, 2 000 ft, FL050, FL100… jusqu'au niveau du plan, ou au niveau étudié dans « Décision du niveau de vol », nommé dans le titre) : gaz, RPM ou N1 si le profil a une cartographie moteur, badin à tenir, vario attendu, temps cumulé.

Les consignes guident le pilotage ; le devis compte la montée choisie. Elles viennent du modèle de performances du profil (atmosphère du devis, masse non modélisée) : à confronter au manuel de vol.

### Résultat

Ce bloc, dans la colonne de droite, suit la page pendant que vous faites défiler les courbes.

- « Block fuel » (en fourchette si le vent est inconnu), « Temps de vol », « TOD ».
- Ligne d'état « Calculé pour <avion> à <heure> : <distance> NM au FL…, temps de vol, TOD. Consommation de croisière : … », puis base du calcul : niveau, montée retenue et origine de la consommation de croisière (« profil enregistré », « saisie pour ce vol », « Poll-Schumann, 70 t à mi-croisière, FL350, M0,78 », « SimBrief », « estimation… »). Sans consommation connue, « Carburant bloc » affiche « — » : saisissez la consommation dans le devis.
- Détail : taxi, montée, croisière, descente, contingence, réserve ; masse au décollage prévue et MTOW si vous l'avez saisie (en rouge si elle est dépassée).
- Groupe repliable « Régimes de vol — profil ↔ cartographie » (niveau Expert) : la fiche de l'appareil en lecture seule — Badin, vario, régime moteur et débit par phase, comparés à la cartographie moteur, liens vers les fiches des appareils de ce type — et « Modifier cette fiche dans les Fiches de performances ↗ ».

« Épingler » garde le bloc entier quand il suit la page ; sinon, il se replie. « Vue simple » masque les courbes et les instruments, « Vue détaillée » les montre (choix gardé dans ce navigateur). Au niveau Expert, sous le bloc, un panneau par graphe (décision du niveau, montée) donne l'essentiel en trois lignes ; « En savoir plus » déplie la lecture et les hypothèses du modèle. Le bandeau d'instruments (niveau Expert) reprend badin, altimètre, vario, chronomètre (temps de montée), carburant et temps de vol.
Dans les panneaux et les messages, un nom de champ souligné désigne un champ de la fiche (à modifier dans les Fiches de performances). Un niveau « inatteignable » donne sa cause et le champ à corriger (bloc « Limites »).
Un clic sur le cadran carburant (ou son bouton) change la courbe lue, dans sa couleur : montée choisie, profil, croisière économique, montée rapide, Vy, montée économique ; choix gardé dans ce navigateur.

### Profil vertical

Ce bloc dessine une coupe le long du plan de vol du devis : relief, espaces aériens, obstacles, trajectoire (TOC, TOD). Bloc du niveau Expert.

1. Vérifiez le plan de vol dans « Devis carburant ».
2. Choisissez le « Profil d'affichage (studio) » : ce sont les mêmes profils que dans les Cartes de vol.
3. Réglez « Plancher (ft) » et « Plafond (ft, 0 = auto) ».
4. Cliquez sur « Tracer le profil ».

La montée suit le modèle de performances de l'avion actif ; la descente suit son vario. Un plan sans niveau (VFR) n'a pas de trajectoire.
Un OFP SimBrief importé remplit la route et trace le profil tout seul.
Il faut la base SIA de ce navigateur, lue dans les Cartes de vol (bloc « Base de données SIA ») ou dans Paramètres › Maintenance. Sans elle, seuls les points en coordonnées sont reconnus, sans espaces aériens.
Le relief vient d'un modèle de terrain d'environ 150 m : les limites ASFC suivent ce modèle, pas le sol réel.

**Sur téléphone** : la page passe sur une colonne (devis, puis Résultat, puis les autres blocs) ; après « Calculer », le Résultat est amené à l’écran. La table des courbes défile dans son cadre.

## Fiches de performances
<!-- page: apps/planner/performance_sheets.html -->

Cette page (barre latérale « Outils », à partir du niveau Conception) gère les fiches de performances de vos appareils : c'est d'elle que partent toutes les actions qui créent ou modifient une fiche. Le Carburant s'en sert pour le devis ; « Mes appareils » (Paramètres › Mon profil › Appareils et simulateurs) dit quels appareils vous possédez. Les deux pages lisent la même base de ce navigateur et le même dossier performances : une fiche enregistrée ici est reprise aussitôt par un Carburant ouvert dans un autre onglet.

- En-tête : le sélecteur « Appareil », liste déroulante avec recherche (tapez un nom, un type ou un désignateur), découpée comme le bouton « Avion » du Carburant (« Mes appareils » en tête, puis par catégorie ; un type sans fiche y figure avec « aucune fiche »), qui choisit la fiche qu'on modifie et l'appareil du panneau ChatGPT.
- Barre du bas : « Ajouter un appareil » et « Importer… » ; « Sélection (n) ▾ », le menu des actions sur les lignes cochées (« Fusionner », « Exporter », « Enregistrer dans le dossier », « Renseigner les champs manquants », « Supprimer ») ; l'état de la fiche, « Enregistrer la fiche » et « Abandonner les modifications », ou, pour un appareil sans fiche, « Créer la fiche : depuis SimBrief, Demander à ChatGPT, Estimer par la classe ». Sous 800 px de large, « Importer… » passe dans le menu ☰.
- « Fiches de performances » : sous la présentation, la ligne du dossier (« Mes appareils ↗ », l'état du dossier performances, « Relire » et « Dossier… ») ; puis la recherche, le tri et « Demander à ChatGPT » au-dessus du tableau de vos appareils et de vos fiches, par groupes ; un appareil sans fiche n'y montre que « aucune ». Un clic sur une ligne choisit cet appareil, avec ou sans fiche, comme le sélecteur de l'en-tête (ligne surlignée) ; plusieurs lignes cochées : aucun appareil choisi.
- Sous le tableau, quatre cartes : « Fiche en cours » (régimes de vol et champs de la fiche, dès le niveau Conception), « Moteur » (cartographie, table RPM, interpolation), « SimBrief » (airframe, calibration OFP, traçabilité, audit) et « Fichier » (dernier JSON importé, replié), décrites ci-dessous.
- Une fiche enregistrée ici est reprise aussitôt par un Carburant ouvert dans un autre onglet (la fiche qu'il affiche, et son devis).

### Barre du bas et menu ☰

La barre du bas indique « Fiche enregistrée — … », « Modifications non enregistrées — … », « Pas de fiche pour … » (appareil choisi sans fiche, avec les boutons de création) ou « Aucune fiche en cours. ». « Enregistrer la fiche » l'écrit dans la base locale ; « Abandonner les modifications » (seulement s'il y en a) relit la base locale et rouvre la fiche telle qu'elle était enregistrée. Pour supprimer la fiche : « Supprimer » (sa ligne cochée). Les notifications s'affichent au-dessus de la barre.
Si vous choisissez un autre appareil (clic sur sa ligne, sélecteur de l'en-tête) avec des modifications non enregistrées, la page propose « Rester », « Abandonner et changer » ou « Enregistrer et changer ».
Menu ☰ : importer profils / CSV / JSON (dont `.lnmperf` de Little Navmap ; la même fenêtre que « Importer… »), importer un airframe SimBrief, choisir le dossier performances, exporter le profil `.lnmperf` ou JSON, enregistrer la base locale, restaurer la sauvegarde précédente, exporter ou importer les préférences. Ces actions sont du niveau Expert, sauf exporter et importer les préférences.
« Enregistrer la base locale » écrit `flight_performance_database.fpdb.json` dans le dossier performances (sinon, téléchargement) ; « Restaurer la sauvegarde précédente » reprend l'état d'avant le dernier enregistrement.
Un import (fichier ou texte collé) qui retombe sur une fiche existante — même type, alias compris, ou même nom — ne crée rien sans demander : « Une fiche « … » existe déjà pour … » propose « Compléter la fiche existante » (par défaut : seuls ses champs vides sont remplis, cartographie moteur reprise si elle n'en a pas, résumé des champs avant validation), « Fusionner » (l'aperçu de fusion, champ par champ, le plus récent gagne, données à cocher) ou « Créer une seconde fiche » (nom suivi de « (2) »). Avec plus de deux doublons, « Même choix pour les doublons suivants », cochée d'avance, évite de répondre à chaque fois ; deux entrées pour la même fiche s'y ajoutent l'une après l'autre. Sans doublon, la fiche est créée. À la fin, la dernière fiche s'ouvre et « Annuler » (10 s) remet la base comme avant l'import.

### Fiches de performances (tableau)

Ce bloc (à partir du niveau Conception), le premier de la page, est la face performances de « Mes appareils » (Paramètres › Mon profil › Appareils et simulateurs) : mêmes appareils, même ordre, même nom. Sous la présentation du tableau, « Mes appareils ↗ » ouvre cette liste dans Paramètres ; la même ligne dit l'état du dossier performances (« n profil(s) lu(s) dans le dossier « … » à … », ou « Aucun dossier performances choisi. »).
- Une ligne par appareil, groupées par catégorie (hélicoptères, turbopropulseurs, réacteurs, pistons) avec un en-tête de groupe repliable ; « Trier par » : catégorie, nom ou source. Viennent ensuite les profils enregistrés hors de « Mes appareils », marqués « pas dans « Mes appareils » ». Sans « Mes appareils » (trigramme non réglé, rien de déclaré), le bloc montre les profils et les types de la flotte.
- Colonnes : « Appareil » (silhouette, nom en gras, désignateur et classe en petit, comme dans Paramètres), « Performances » (source du profil : `.lnmperf`, SimBrief, ChatGPT, JSON, saisie, estimé par la classe ; ou « aucune »), « Carto. » (cartographie moteur), « Conso. croisière » et son origine, « Plafond », « Manques ». Un clic sur une ligne coche cet appareil seul et le choisit (fiche ouverte dans l'éditeur, ligne surlignée ; sans fiche : « Créer la fiche » dans la barre du bas) ; Ctrl ou Maj + clic, ou les cases, en cochent plusieurs, et alors aucun appareil n'est choisi.
- « Ajouter un appareil » ouvre la même fenêtre d'ajout que Paramètres (voir « Ajouter un appareil et ses performances ») ; l'appareil ajouté arrive avec « aucune ». Cliquez sa ligne (ou choisissez-le dans le sélecteur de l'en-tête) : la barre du bas propose « Créer la fiche : depuis SimBrief » (si SimBrief connaît le type), « Demander à ChatGPT », « Estimer par la classe » (type classé).
- Un désignateur déclaré sous plusieurs variantes (CL2T : « Canadair CL-415 », « Canadair CL-215T ») n'a qu'une ligne, au nom du type : les performances sont celles du type, les variantes ne changent rien ici. Un appareil qui a plusieurs profils a une ligne par profil, chacune sous le nom du profil.
- La case en tête de colonne coche ou décoche toutes les lignes affichées ; la case de chaque rubrique (devant « Hélicoptères (n) »…) coche ou décoche toutes ses fiches, rubrique repliée comprise ; toute la cellule d'une case la coche ou la décoche (un clic à côté de la case ne remplace pas la sélection) ; les bords des titres se glissent pour régler la largeur des colonnes (double-clic : largeurs par défaut).
- « Chercher un appareil », avant « Trier par », filtre de même (nom, variante, désignateur, classe, source) : groupes avec correspondance dépliés, autres repliés, « n appareil(s) ».
- « Importer… » (barre du bas) ouvre une fenêtre à deux voies : « Choisir un ou des fichiers… » (`.lnmperf`, JSON, CSV, plusieurs à la fois), ou coller un texte — une fiche JSON, une réponse ChatGPT (avec son texte et ses blocs de code), un `.lnmperf` ou un CSV de performances (séparé par « ; », « , » ou tabulation) — puis « Importer le texte collé ». Le texte collé suit le chemin d'un fichier ; une réponse ChatGPT devient une fiche « … — ChatGPT ». Un JSON à plusieurs entrées (un tableau, ou une liste « sheets », « profiles »…) donne autant de fiches : chacune est rapprochée des fiches existantes par son identifiant, puis son type (alias compris), puis son nom ; une entrée illisible n'arrête pas les autres. À la fin, un seul résumé : « n fiche(s) complétée(s), m fusionnée(s), k créée(s) », avec les entrées illisibles. Un texte vide ou illisible est signalé dans la fenêtre, qui reste ouverte ; Échap ou « Fermer » la ferme. Une fiche qui existe déjà se complète, se fusionne ou se double (voir « Barre du bas et menu ☰ »).
- « Dossier… » (choisir le dossier performances) et « Relire », sur la ligne du dossier. Le dossier est relu de lui-même quand il change ailleurs (Paramètres, autre onglet). En mode GitHub (appli sans lanceur), il n'y a pas de dossier : les fiches sont lues dans `planner/flight_performance_database_merged.fpdb.json` du dépôt des données (à l'ouverture de la page et par « Relire »), « Dossier… » n'est pas proposé et « Enregistrer dans le dossier (n) » devient « Enregistrer dans le dépôt (n) » : les fiches cochées sont reportées dans ce fichier (un commit). Une fiche du dépôt ne remplace la fiche du navigateur que si elle est plus récente. « Supprimer (n) » la retire aussi de ce fichier (un commit) : elle ne revient plus à la relecture ; « Annuler » la remet dans le dépôt.
- Dans la fiche du profil actif, « Mettre à jour depuis SimBrief » reprend la fiche SimBrief du type (consommation de croisière, masses, plafond, vitesse) en gardant vos saisies ; face à un profil perso, il propose « Mettre à jour les champs vides », « Fusionner » (la fiche compte comme un profil daté de sa récupération : le plus récent gagne champ par champ, les vides sont comblés), « Remplacer » (valeurs SimBrief à la place, le reste gardé) ou « Nouveau profil ». Quand des champs changent, un aperçu les montre avant de valider.
- Les cases devant les noms sélectionnent des profils pour le menu « Sélection (n) ▾ » de la barre du bas (ouvert vers le haut ; Échap ou un clic ailleurs le ferme) : « Fusionner (n) » (deux profils au moins du même type, ou un seul quand SimBrief connaît le type : la case « Inclure la fiche SimBrief du type », cochée d'avance, l'ajoute aux sources ; nom choisi, celui du plus complet par défaut ; le plus récent gagne champ par champ, les autres comblent ses manques, la cartographie moteur réunit leurs lignes ; la fenêtre montre d'abord les changements — valeur actuelle, valeur retenue et sa source, champs inchangés repliés, lignes de cartographie ajoutées ou remplacées ; une case par donnée qui change (décochée : la valeur actuelle est gardée), « Tout reprendre » / « Ne rien reprendre », et le bouton dit ce qui sera repris, « Fusionner (7 champs, 1 ligne de cartographie) » ; la note de fusion ne liste que ce qui a été repris ; la notification dit ce qui a été repris de chaque source, « Annuler » 10 s), « Exporter (n) » (un fichier téléchargé par profil : `.lnmperf` si le profil est complet, sinon JSON), « Enregistrer dans le dossier (n) » (un fichier JSON par profil dans le dossier performances, nommé d'après le profil) et « Supprimer (n) » (une confirmation, un seul message pour le lot avec « Annuler » pendant 10 s ; un profil du dossier performances en est aussi retiré : base exportée réécrite sans lui, fichier d'un seul profil renommé .bak ; « Annuler » remet aussi les fichiers ; si le dossier n'est pas accessible en écriture, le profil reviendra à la prochaine relecture). « Dossier… » et « Relire » reprennent tout ce que le dossier contient ; tant qu'un profil supprimé y reste (CSV à plusieurs profils, écriture refusée), une ligne « n profil(s) retiré(s) encore dans le dossier — Restaurer » le signale.
- « Demander à ChatGPT » (au-dessus du tableau, et fiche du profil actif) ouvre un panneau pour l'appareil choisi (sélecteur de l'en-tête ou clic sur sa ligne) : « Copier le prompt et ouvrir ChatGPT » (un seul onglet ChatGPT, où coller le prompt). Le panneau suit l'appareil choisi. Le prompt, dans la langue de la page, demande de compiler toutes les sources (manuels, constructeur, autorités, Wikipédia, forums de simulation), en kt, ft, ft/min et kg/h, valeurs estimées marquées, cartographie moteur comprise ; il donne aussi ce que la suite sait déjà (EUROCONTROL, SimBrief, Airframe DB, profil actuel) pour que ChatGPT complète plutôt que répète. « Voir le prompt » le montre. Coller la réponse (le JSON, ou un CSV de performances) sous le bouton, puis « Importer comme nouveau profil » (« <nom> — ChatGPT ») ou « Fusionner avec « … » » (la réponse est datée du jour : elle gagne champ par champ, les vides sont comblés ; aperçu des changements d'abord, données à cocher). Les clés inconnues et les valeurs illisibles ou hors plage sont écartées et signalées ; les valeurs estimées apparaissent sous « Données manquantes » (« estimé : … ») et ne le sont plus dès que vous les changez à la main (fiche ou cartographie). Le type et le nom viennent de la réponse (l'appareil choisi n'est qu'un repli) ; si la réponse décrit un autre type, une question tranche : importer comme l'un ou l'autre, ou, pour une fusion, nouveau profil ou fusionner quand même. Un CSV à virgules ou à points-virgules est accepté.
- « Renseigner les champs manquants (n) » (menu « Sélection », barre du bas) complète les fiches cochées par une seule question à ChatGPT : le panneau ChatGPT s'ouvre sur ces fiches (nom et nombre de champs vides), « Copier le prompt et ouvrir ChatGPT » copie la question — pour chaque fiche, ce que la suite sait déjà et ses champs vides, cartographie moteur comprise si la fiche n'en a pas. Collez la réponse de ChatGPT (une entrée par fiche), puis « Renseigner les champs manquants » : seuls les champs vides sont remplis, rien de déjà saisi n'est remplacé, les valeurs estimées restent marquées ; un résumé par fiche précède la validation, puis « Annuler » pendant 10 s.

### Fiche en cours

Cette carte (dès le niveau Conception), sous le tableau, montre la fiche de l'appareil choisi.

#### Régimes de vol — profil ↔ cartographie

Badin, vario, régime moteur et débit de chaque phase (montée, croisière, descente, roulage, dégagement), comparés à la cartographie moteur, et les liens vers les fiches des appareils de ce type.

#### Champs de la fiche

Tous les champs de la fiche, exportés tels quels dans le fichier `.lnmperf` de Little Navmap.

- Groupes : « Identité et format », « Carburant et opération », « Piste et alternat », « Montée », « Croisière », « Descente », « Régime et consommation ».
- Le carburant s'affiche dans l'unité choisie (kg ou lbs).
- Quand le type a une fiche EUROCONTROL APD, une étiquette « APD … » apparaît à côté des champs comparables : un clic reprend cette valeur. Rien n'est écrit sans clic. Sinon : « Aucune donnée EUROCONTROL APD pour ce type ».
- Couleur de l'étiquette : verte = identique (±3 %), orange = différente, bleue = champ vide ; « remplir les champs vides » reprend toutes les valeurs APD des champs vides.

Une case vide reste vide et bloque l'export `.lnmperf` : aucune valeur n'est inventée.
Après modification, cliquez sur « Enregistrer la fiche » dans la barre du bas.

### Moteur

Carte du niveau Expert : la cartographie moteur à éditer, la table RPM et sa courbe, l'interpolation du débit.

#### Cartographie moteur — édition RPM / puissance → consommation

Saisir ou corriger la table régime → consommation, point par point.

1. « Ajouter un point » crée une ligne.
2. Remplissez « RPM / N1 », « Min. », « Nominal », « Max. », « Altitude (ft) » (facultative : une ligne par altitude publiée), « Régime de vol » et « Commentaire ».
3. Enregistrez la fiche (« Enregistrer la fiche », barre du bas).

Astuce : une plage écrite dans le commentaire, par exemple « 1 000–1 300 kg/h total », remplit min., nominal et max. à l'enregistrement.
Sans appareil choisi, la carte affiche « Choisis ou importe un profil. »

#### Table RPM / puissance → consommation

Cette table liste les points de la cartographie moteur du profil actif : « RPM / N1 », « Min. », « Nominal », « Max. », « Altitude (ft) » (facultative : une ligne par altitude publiée), « Régime de vol », « Commentaire ».
Cliquez sur un titre de colonne (↕) pour trier. Glissez le bord droit d'un titre pour régler la largeur de la colonne (double-clic sur le bord : largeurs par défaut) ; le réglage est gardé dans le navigateur. Un commentaire long tient sur une ligne, points de suspension compris : le texte entier est en infobulle, un double-clic sur la cellule le déplie.
Elle est en lecture seule : pour la modifier, utilisez « Cartographie moteur — édition », au-dessus.
Sans données, elle affiche « Pas de courbe RPM dans ce profil. »

#### Interpolation moteur

Cette partie donne la consommation pour un régime moteur.

1. Saisissez « RPM / N1 ». Les champs « Altitude (ft) » et « Phase » complètent la fiche.
2. Cliquez sur « Interpoler ».
3. Lisez le « Débit total » et sa fourchette min.–max. (interpolation dans la table, par altitude quand la colonne « Altitude (ft) » est remplie).

Au-dessus de la table RPM, la courbe trace les débits min., nominal et max. selon le régime. Survolez-la pour lire les valeurs à un régime donné. Le point interpolé y est marqué.
Sans table RPM dans le profil, la page affiche « Courbe RPM absente du profil. » ou « Aucune cartographie chiffrée ».

### SimBrief

Carte du niveau Expert : l'airframe SimBrief, la calibration sur un OFP réel, sa traçabilité et l'audit.

#### Airframe SimBrief

Collez l'« Internal ID » d'un airframe SimBrief (ou son adresse de partage), puis « Importer airframe SimBrief » : l'airframe est lu (liste publique de SimBrief, sinon son lien de partage) et la fiche qui en est tirée s'ouvre. Si SimBrief ne publie pas l'airframe, l'Internal ID est gardé seul, utilisable comme type par SimBrief Dispatch. Le message sous le bouton dit ce qui a été repris ; sans performances dans l'airframe, complétez avec un `.lnmperf`.

#### Calibration SimBrief depuis OFP

Recaler la fiche sur un plan de vol SimBrief réel.

1. Cliquez sur « Récupérer dernier FPL SimBrief », le premier bouton de cette partie. L'identifiant se saisit dans Paramètres › Mon profil. À défaut, téléchargez l'OFP JSON sur simbrief.com et utilisez « Importer OFP JSON ».
2. L'OFP remplit le devis et le plan de vol ; le profil de l'appareil est créé et calibré. Le message indique une calibration complète ou partielle (phases mesurables).
3. « Calibrer le profil actif » applique la calibration du dernier OFP au profil choisi.
4. « Exporter audit JSON » télécharge l'audit.

« Traçabilité de calibration », dessous, rappelle la dernière calibration appliquée ; sinon « Pas de calibration OFP ».

#### Audit OFP — valeurs brutes et calculées

Ce tableau compare, phase par phase, les valeurs lues dans l'OFP et les valeurs recalculées : « Temps », « Distance », « Carburant », « FF calculé », « TAS / GS », « Vario ».
Il se remplit après un import d'OFP (« Récupérer dernier FPL SimBrief » ou « Importer OFP JSON »).
Sans OFP : « Aucune donnée OFP. »
Utile pour comprendre une calibration partielle ou un écart avec SimBrief.

### Fichier

La carte « Fichier » (niveau Expert) garde, repliée sous « JSON importé / SimBrief », le contenu brut du dernier fichier importé (OFP SimBrief ou JSON) ; un clic la déplie.
- « Copier JSON » : copie le contenu dans le presse-papiers ; grisé quand il n'y a rien à copier.
- « Effacer » : vide l'affichage (la fiche n'est pas touchée).

Sans import : « Aucun JSON chargé. »

## Atterrissages
<!-- page: apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html -->

Ce tableau de bord (titre « Landing Performance — Synthèse ») analyse la qualité de vos atterrissages à partir des fichiers exportés du simulateur : score, taux de chute, G, par appareil et dans le temps.
Pour y aller : barre latérale « Outils », onglet « Atterrissages ». Le fichier est lu dans le navigateur ; rien n'est envoyé.
Le dernier fichier chargé est gardé et rechargé à l'ouverture. Ses appareils sont aussi proposés dans le menu « Avion » du planificateur carburant.

<!-- capture-manuels: utilisateur-atterrissages -->
![Atterrissages : filtres de période et d’appareil, tendance et graphiques d’évolution du score et du taux au toucher.](images/captures-manuels/utilisateur-atterrissages.png)

*Figure 9 — Atterrissages : filtres de période et d’appareil, tendance et graphiques d’évolution du score et du taux au toucher.*

### Chargement du fichier

1. Cliquez sur « Choisir un fichier » (« Fichier de données ») ou sur ☰ › « Choisir les fichiers CSV / LOG ». Vous pouvez aussi déposer les fichiers sur la page.
2. Choisissez un ou plusieurs fichiers CSV ou LOG (ou déposez-les ensemble) : ils sont réunis en un seul jeu de données, nommé « premier.csv + n » ; les colonnes sont associées par leur nom, et un atterrissage présent dans deux fichiers n'est compté qu'une fois.
3. La page indique le format reconnu : « Format riche détecté » (score, FPM, G, vitesse sol…) ou « Format historique allégé détecté » (progression estimée sans score ni G final).

Avant tout fichier, la page affiche « Choisis ou dépose un fichier CSV ou LOG. »
La ligne d'état rappelle le fichier, le nombre de mesures utilisées, l'appareil, les filtres actifs et la période.

### En-tête : appareil, période, tendance

- « Appareil » : « Tous », ou un type (avec son icône) ; liste déroulante avec recherche, par catégorie.
- « Période » : « Toutes les dates », « Aujourd'hui », « 7 derniers jours », « 30 derniers jours », « Mois en cours », « Année en cours », « Période personnalisée », avec boutons pour reculer, élargir ou avancer. La période est mémorisée pour chaque fichier.
- « Méthode de tendance » : « Absolu / Asymptote », « Premiers 25 % ↔ Derniers 25 % » ou « Moyenne glissante » (avec « Lissage » : 5 ou 10).
- « Imprimer / PDF » : imprime la page.

Options de l'analyse (menu ☰) : « exclure les mesures manifestement aberrantes », « 95P — exclure les 5 % d'atterrissages accidentels les plus forts » (par appareil), « Crash — exclure les atterrissages déclenchés » (seuils FPM ≤ et G ≥, logique « FPM ou G », « FPM et G », « FPM seul », « G seul »), « Utiliser les champs manquants estimés ».
« Utiliser les champs manquants estimés » complète score, G ou FPM manquants par un modèle calibré sur les vraies paires CSV + LOG ; ces valeurs, marquées « ◇ estimé », ne sont jamais écrites dans le fichier.

### Synthèse de la période

Un bandeau fixé en bas de la fenêtre, après l'icône de tendance, donne les chiffres clés : « Atterrissages », « Score moyen », « Score min / max », « FPM moyen », « FPM min / max », « G moyen », « G min / max », « Butter / Very Good ».
Les boutons « − » et « + » changent la taille de ces cartes.
Dessous, le bloc de lecture réunit à gauche la conclusion de tendance : progression ou régression probable, légère, « Aucune progression nette », ou « données insuffisantes » (il faut au moins quatre mesures exploitables), avec la méthode choisie (par exemple asymptote estimée et gain restant).
À droite, en petit, la légende : format lu, losange « ◇ estimé », pastilles des notes, estimation activée ou désactivée. Sur un écran étroit (moins de 800 px), la légende passe sous la conclusion.

### Évolution

Ce bloc trace les indicateurs dans le temps, avec leur tendance : score, taux au toucher (FPM), force G, vitesse de rotation du nez, et le nuage « FPM × G — distribution des touchers ». En format allégé : indice technique relatif, landing rate brut, float.

- Survolez un point : date, appareil, score, évaluation, arrondi. La même mesure s'allume sur les cinq graphes (point agrandi et cerclé, les autres estompés) ; l'infobulle reste dans la fenêtre, à gauche ou au-dessus du pointeur près des bords.
- Cliquez sur un point pour figer l'infobulle : elle ajoute la ligne complète de la mesure (date, appareil, aérodrome et piste s'ils existent, FPM, G, nez, score, source), garde la mesure allumée sur tous les graphes et met en évidence sa ligne dans le tableau « Atterrissages ». Pour la fermer : la croix, un second clic sur le même point, un clic hors des points ou Échap. Un seul point figé à la fois ; un simple clic ne sélectionne pas de période.
- Glissez horizontalement sur un graphe pour sélectionner une période.
- La bande « Historique complet — glisser pour sélectionner », sous chaque graphe, permet de choisir une période sur tout l'historique.

La période choisie s'affiche dans l'en-tête ; ses boutons permettent de revenir en arrière.
L'indice technique relatif n'est pas un score officiel : 45 % landing rate brut, 25 % qualité d'arrondi, 20 % vitesse de nez, 10 % float, normalisés par appareil.

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
