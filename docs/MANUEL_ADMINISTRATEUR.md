# Manuel administrateur

Ce manuel décrit la suite SO Group Virtual (Virtual Special Operation Group) pour le **Centre** (planification et conduite des opérations) et pour les
**administrateurs** de la suite : un chapitre par page, une section par onglet, rubrique ou bloc, puis la
synchronisation des données et le lanceur. Dans la suite, l'entrée **« Aide »** de la barre latérale ouvre ce manuel
au chapitre de la page en cours (pages du Centre et des paramètres). Les pages des pilotes sont décrites dans le
[manuel utilisateur](MANUEL_UTILISATEUR.md) ; l'exploitation en détail (données, sauvegardes, dépannage, publication)
dans le [manuel d'exploitation](MANUEL_EXPLOITATION.md). Index de toute la documentation :
[index documentaire](README.md).

Captures réalisées le 12 octobre 2026 dans l’interface française. Les valeurs affichées, les rubriques disponibles et le design peuvent varier selon votre profil et vos réglages.

## Accès au Centre

Le Centre de planification et de conduite des opérations (CPCO) regroupe le générateur de mission, le studio cartographique, le registre des missions et le planning ODV. Il est réservé aux administrateurs de la suite.
Deux protections indépendantes s'y appliquent : le **verrou du Centre**, propre à chaque navigateur, et les **droits des utilisateurs** (rôles, mode develop ou production), communs à toute la compagnie.
Les réglages se trouvent dans ☰ › Paramètres, onglet « Centre ».

### Verrou du Centre

Le verrou masque le Centre tant qu'il n'a pas été activé dans ce navigateur.

- Centre verrouillé : la barre latérale, le menu ☰ et l'accueil suivent le niveau d'utilisation, pas le verrou ; une page du Centre ouverte sans lui affiche l'avis « Accès réservé », sauf le Tableau (entrée « Planning »), consultable en lecture seule.
- Une page du Centre ouverte directement (favori, lien) est recouverte d'un avis « Accès réservé » avec les liens « Activer le Centre… » et « Accueil ».
- Dans Paramètres › Centre, seule la rubrique « Accès au Centre et réglages » reste visible ; les autres (« Utilisateurs et droits », « Catégories de disponibilité », « Planning ODV », « Envoi des comptes rendus (webservice) ») sont cachées.
- L'activation est mémorisée dans ce navigateur seulement : à refaire sur chaque poste et après un effacement des données du site.

Limite : c'est un verrou d'usage, pas une sécurité. Le mot de passe est écrit en clair dans `data/config/centre.json`, partagé avec les données (`DEFA` par défaut), et affiché à côté du bouton « Activer le Centre » : c'est le **mode autonome**. Le mode groupe (registre signé, accès par le rôle d'administrateur) se règle dans la rubrique « Mode groupe (registre signé) » ci-dessous ([conception](technique/COMPTES_SIGNES.md)).

### Activer ou verrouiller le Centre

1. Ouvrez ☰ › Paramètres, onglet « Centre », rubrique « Accès au Centre et réglages ».
2. Saisissez le mot de passe affiché à côté du bouton (« Mot de passe : DEFA » par défaut) dans « Mot de passe du Centre » (majuscules et minuscules indifférentes).
3. Cliquez « Activer le Centre » ou appuyez sur Entrée. La ligne d'état indique « Centre activé dans ce navigateur ».

Les entrées du Centre apparaissent aussitôt, sans recharger la page. La rubrique affiche alors « Mode et accès » (mode du Centre ; « Mot de passe du Centre (partagé avec les données) » et « Enregistrer le mot de passe » : écrit dans `data/config/centre.json`, il part au prochain « Synchroniser »), puis les réglages « Calcul des routes de transit » :

| Champ | Rôle |
|---|---|
| « Tronçon routé à partir de (NM) » | Longueur minimale d'un transit pour qu'il soit routé |
| « Voies aériennes à partir de (ft) » | Niveau à partir duquel un avion suit les voies aériennes |
| « Basse hauteur jusqu'à (ft) » | Plafond du routage par le RTBA |
| « Entrée / sortie des voies (NM) », « Entrée / sortie du RTBA (NM) » | Distance maximale pour rejoindre ou quitter le réseau |
| « Détour admis, voies (%) », « Détour admis, RTBA (%) » | Au-delà, le tronçon reste direct |

Boutons : « Enregistrer », « Valeurs par défaut » et « Verrouiller le Centre ». Ces réglages sont gardés dans ce navigateur ; ce sont les mêmes que ceux du bloc « Durée estimée » du générateur.

### Rôles « admin_centre » et « utilisateur »

Chaque utilisateur a une fiche partagée (`data/utilisateurs/<TRI>.json`, synchronisée) : trigramme, nom affiché, rôle, état actif, mot de passe (enregistré sous forme d'empreinte, jamais en clair).

| Rôle | Libellé affiché | Droits |
|---|---|---|
| `admin_centre` | Administrateur du Centre | Accès au Centre en mode production, gestion des utilisateurs, usurpation, changement de mode |
| `utilisateur` | Utilisateur | Pages pilote (« Mes missions », disponibilités) |

Gestion dans Paramètres › Centre › « Utilisateurs et droits » :
- le tableau liste les fiches ; « Nom affiché », « Rôle » et « Actif » se modifient sur la ligne et sont enregistrés aussitôt ;
- « Réinitialiser… » ouvre « Réinitialiser le mot de passe de TRI » : saisissez un mot de passe provisoire (8 caractères au moins), que l'utilisateur devra changer à sa prochaine connexion ;
- « Ajouter un utilisateur » : trigramme, nom affiché, rôle, puis « Ajouter ».

Astuce : si le dossier des utilisateurs est vide, la rubrique crée une fiche par pilote de la référence.

### Mode develop et mode production

Le mode vaut pour toute la compagnie (`data/config/suite.json`). Il se règle dans « Utilisateurs et droits », cadre « Mode de la compagnie », liste « Mode ».

| Mode | Effet |
|---|---|
| develop (par défaut) | Sécurité testée, pas imposée : trigramme libre, connexion facultative. Une fiche sans mot de passe se connecte sans mot de passe. |
| production | Connexion exigée pour « Mes missions » et pour le Centre ; trigramme fixé par la connexion (non modifiable dans Mon profil). |

En production, une page du Centre (ou Paramètres › Centre) sans administrateur connecté affiche une fenêtre « Connexion » (trigramme, mot de passe, « Se connecter »). Un compte sans le rôle `admin_centre` est refusé : « Compte sans droits d'administration du Centre ».

Pour passer en production, il faut au moins un administrateur du Centre actif ayant un mot de passe. Une fois en production, seul un `admin_centre` connecté peut revenir en develop.

Limite : les contrôles se font dans le navigateur ; ils ne protègent pas vraiment tant que la vérification ne passe pas par un serveur. Le verrou du Centre reste indépendant du mode : il faut aussi l'activer sur chaque poste.

### Usurper un utilisateur

Un administrateur peut agir à la place d'un autre utilisateur, par exemple pour corriger ses disponibilités ou ses missions.

1. Dans « Utilisateurs et droits », cliquez « Usurper » sur la ligne de l'utilisateur.
2. Une notification confirme « Vous agissez en tant que TRI ».
3. Un bandeau s'affiche sur toutes les pages : « Usurpation : utilisateur TOTO (par ADM, écritures signées « ADM pour TOTO ») ».
4. Pour finir, cliquez « Terminer l'usurpation » dans le bandeau (ou « Usurper » sur votre propre ligne).

Pendant l'usurpation, le trigramme de travail est celui de l'utilisateur usurpé et chaque écriture est signée « ADM pour TOTO ». En mode production, l'usurpation exige un `admin_centre` connecté ; en develop, il suffit d'avoir réglé son trigramme. Le changement de mot de passe est impossible pendant une usurpation.

## Paramètres › Centre
<!-- page: apps/settings/centre.html -->

Cette page regroupe les réglages courants du Centre : accès, utilisateurs, catégories de disponibilité, planning ODV et envoi des comptes rendus. Elle s'adresse aux administrateurs du Centre.
Pour l'ouvrir : barre latérale › « Paramètres », puis l'onglet « Centre ». Les rubriques s'affichent dans le menu latéral, groupe « Centre (CPCO) ».
Tant que le Centre est verrouillé, seule la rubrique d'accès est visible. En mode production, la page demande en plus une connexion `admin_centre`.

### Accès au Centre et réglages

Cette rubrique active le Centre dans ce navigateur : générateur de mission, studio cartographique, registre et planning ODV.
1. Saisissez le « Mot de passe du Centre », affiché à côté du bouton (`DEFA` par défaut ; sans tenir compte des majuscules).
2. Cliquez sur « Activer le Centre » ou appuyez sur Entrée. Le message « Centre activé dans ce navigateur » confirme l'activation.

Une fois le Centre activé, la rubrique affiche « Mode et accès » (mode, changement du mot de passe partagé), puis « Calcul des routes de transit » :

| Champ | Rôle |
|---|---|
| Tronçon routé à partir de (NM) | distance au-delà de laquelle un tronçon est routé |
| Voies aériennes à partir de (ft) | altitude à partir de laquelle les voies aériennes sont utilisées |
| Basse hauteur jusqu'à (ft) | plafond du vol en basse hauteur |
| Entrée / sortie des voies (NM), Entrée / sortie du RTBA (NM) | distance maximale pour rejoindre les voies ou le RTBA |
| Détour admis, voies (%), Détour admis, RTBA (%) | détour toléré |

Un champ vide reprend la valeur par défaut, affichée en grisé. Boutons : « Enregistrer », « Valeurs par défaut », « Verrouiller le Centre ». Ces réglages restent dans ce navigateur.

<!-- capture-manuels: admin-centre -->
![Paramètres › Centre : navigation entre les rubriques et état « Centre activé dans ce navigateur ».](images/captures-manuels/admin-centre.png)

*Figure 1 — Paramètres › Centre : navigation entre les rubriques et état « Centre activé dans ce navigateur ».*

### Utilisateurs et droits

Cette rubrique gère les fiches des utilisateurs. Il y a une fiche par utilisateur (`data/utilisateurs/<TRI>.json`), synchronisée avec le pool de données.
- **Mode de la compagnie** : `develop` (sécurité testée mais pas imposée : trigramme libre, connexion facultative) ou `production` (connexion exigée pour Mes missions et le Centre, trigramme fixé par la connexion). Ce réglage vaut pour toute la compagnie (`data/config/suite.json`).
- Limite : les contrôles se font dans le navigateur. Ils ne protègent vraiment qu'une fois la vérification assurée par un serveur (webservice).
- **Tableau** : « Trigramme », « Nom affiché », « Rôle » (« Administrateur du Centre » ou « Utilisateur »), « Actif », « Mot de passe » (défini, provisoire ou aucun). Toute modification d'une ligne est écrite aussitôt.
- **« Réinitialiser… »** : saisissez un mot de passe provisoire (8 caractères au moins), puis « Réinitialiser le mot de passe ». L'utilisateur devra le changer à sa prochaine connexion.
- **« Usurper »** : vous agissez au nom de l'utilisateur. Un bandeau le rappelle sur toutes les pages, chaque écriture est signée « ADM pour TOTO », et le bouton « Terminer l'usurpation » y met fin.
- **« Ajouter un utilisateur »** : trigramme, nom affiché, rôle, puis « Ajouter ».
- Si le dossier est vide, une fiche est créée pour chaque pilote de la référence.
- Si des fichiers n'ont pas encore pu être écrits dans le dossier des données, cliquez sur « Écrire dans le dossier des données ».
- En mode production, la réinitialisation d'un mot de passe, l'usurpation et le changement de mode sont réservés à un
  `admin_centre` connecté ; l'ajout d'un utilisateur et la modification d'une ligne (rôle, actif) ne sont protégés que
  par le verrou du Centre (voir la [dette technique](technique/DETTE_TECHNIQUE.md)).

### Mode groupe (registre signé)

Pour une compagnie qui partage `data/` par git : rôles, comptes et mots de passe viennent du **registre signé des
utilisateurs** (`data/utilisateurs/_registre.json`). Chaque navigateur refuse ce qui n'est pas signé par un admin : une
fiche modifiée dans le dépôt (« je me donne le rôle admin ») n'a plus d'effet. Conception :
[comptes signés](technique/COMPTES_SIGNES.md).
- **État** : mode (autonome, groupe en constitution, groupe actif), version acceptée du registre, fondateur confirmé,
  admins et empreintes de leurs postes, clé de secours, empreinte de ce poste.
- **« Passer en mode groupe »** (Centre activé, lanceur à jour : sa politique de sécurité est exigée) : vous devenez le
  premier admin avec la clé de ce poste ; les fiches existantes entrent dans la version 1 du registre. Saisissez deux
  fois le mot de passe de la **clé de secours** : le fichier `sog-cle-secours-<empreinte>.json` est téléchargé, chiffré
  par ce mot de passe. Gardez-le hors ligne (clé USB) et le mot de passe à part. Envoyez votre empreinte aux pilotes par
  un autre canal (Discord, SMS, courriel).
- **Groupe en constitution** : tant qu'il n'y a pas deux admins avec une clé de poste, le Centre reste accessible par
  son mot de passe. Une fois le groupe actif, l'accès au Centre passe par la clé de poste d'un admin du registre.
- **Changer un rôle, un état ou un mot de passe** (Utilisateurs et droits) publie une nouvelle version, signée par la
  clé de ce poste : réservé à un admin du registre ; sinon le message le dit et rien n'est écrit.
- **« Nouvelle clé de secours »** (admin) remplace la clé de secours ; **« Revenir au mode autonome »** (admin) : le
  registre reste dans les données mais n'est plus lu.
- **« Utiliser la clé de secours »** (rubrique ouverte même Centre verrouillé) : fichier, mot de passe et trigramme ;
  ce trigramme devient admin avec la clé de ce poste. Pour les admins qui ont perdu leur poste.
- **« Refonder le groupe »** (dernier recours, toutes les clés perdues) : nouveau registre, nouvelle clé de secours ;
  chaque autre poste devra confirmer votre empreinte.
- **Versions refusées** : une version mal signée, hors chaîne ou plus ancienne est refusée ; le poste garde la sienne,
  une notification et cette rubrique le disent.
- À la première lecture du registre, un poste montre l'empreinte du fondateur avec « Confirmer » et « Refuser » :
  comparez-la avec celle reçue avant de confirmer.
- **Demandes d'accès des postes** : un pilote demande l'accès depuis Mon profil › Ce poste, sur un poste avec lanceur
  comme sur l'appli sans lanceur (téléphone) ; la demande est un fichier signé par la clé de son poste
  (`data/utilisateurs/demandes/`). La rubrique liste trigramme, nom du poste, date et l'empreinte recalculée par votre
  page (« nouvel utilisateur » si le trigramme n'est pas encore au registre ; « demande invalide » si la signature ou
  l'empreinte ne tient pas). Comparez l'empreinte avec celle que le pilote vous a donnée par un autre canal, puis
  **« Approuver »** (nouvelle version du registre avec sa clé, utilisateur créé au besoin avec le rôle utilisateur) ou
  **« Refuser »** (demande retirée). Une demande peut venir de quiconque a accès au dépôt : seule l'empreinte prouve le
  poste.
- **Clés des postes** : chaque clé du registre, par utilisateur ; **« Révoquer »** (admin) publie une version sans elle :
  ses signatures suivantes sont refusées, le poste devra refaire une demande. Désactiver un utilisateur (Utilisateurs et
  droits) révoque toutes ses clés. Le dernier admin à clé ne peut pas perdre la sienne, ni un groupe actif descendre
  sous deux admins à clé.
- **« Activer le groupe »** : la carte n'apparaît qu'une fois deux admins dotés d'une clé de poste (un second admin :
  rôle « Administrateur du Centre » dans Utilisateurs et droits, puis sa demande approuvée). Jusque-là rien ne change
  et rien n'est ignoré. Une fois le groupe actif : le Centre ne s'ouvre plus que par la clé d'un admin (le mot de passe
  ne compte plus) ; les données non signées restent acceptées 30 jours, avec la mention « non signé », puis sont
  ignorées (signature des affectations : lot suivant).
- Appli sans lanceur (mode GitHub) : un nouveau poste suit la chaîne du registre par l'historique du dépôt (API des
  commits) ; demandes, approbations et révocations y sont des commits. Passer en mode groupe ou refonder demande un
  poste avec lanceur.

### Catégories de disponibilité

Cette rubrique définit ce que les pilotes peuvent déclarer comme disponibilités (`data/config/disponibilites.json`, synchronisé).

| Colonne | Usage |
|---|---|
| id | identifiant, figé une fois la catégorie enregistrée ; saisi pour une nouvelle catégorie |
| Groupe | groupe affiché dans l'ODV (Disponible, Exercice SOG, Occupé, Indisponible…) |
| Libellé, Couleur | libellé **en français seulement**, couleur de la case |
| Thèmes ouverts | « tous les thèmes », « aucun », « domaine … », « … selon les préférences, parmi … », ou « liste de thèmes » (champ libre, thèmes séparés par des espaces) |
| Type | disponible, contrôle, occupé, indisponible |
| Codes ODV | codes du classeur lus comme cette catégorie à l'import, séparés par des espaces ; le premier s'affiche dans la grille |
| Retirée | case à cocher : la catégorie est cachée des listes mais gardée pour l'historique |

- Une catégorie déjà utilisée ne se supprime pas : elle se **retire**. Seule une catégorie nouvelle, pas encore enregistrée, peut être supprimée avec « ✕ ».
- « Ajouter une catégorie », puis « Enregistrer ». L'enregistrement est refusé si un identifiant est vide ou en double, ou s'il manque un libellé français.
- Plus bas : « Groupes (ODV) » (libellé, couleur) et « Thèmes par domaine » (familles de mission séparées par des espaces).
- Traductions : si vous modifiez un libellé français, il perd ses traductions anglaise, allemande et espagnole jusqu'au prochain audit des traductions (`tools/audit_i18n.html`).
- « Valeurs par défaut » rétablit les catégories d'origine. Les catégories ajoutées sont gardées, mais retirées.
Voir aussi [disponibilités et réorganisation](technique/DISPOS_ET_REORGANISATION.md).

<!-- capture-manuels: admin-categories -->
![Catégories de disponibilité : identifiant, groupe, libellé, couleur, thèmes, type et codes ODV.](images/captures-manuels/admin-categories.png)

*Figure 2 — Catégories de disponibilité : identifiant, groupe, libellé, couleur, thèmes, type et codes ODV.*

### Planning ODV

Cette rubrique contient les réglages propres à la compagnie pour la page Planning ODV. Ils sont gardés dans ce navigateur et ne sont pas synchronisés. Une page ODV ouverte dans un autre onglet les applique aussitôt.

| Réglage | Défaut |
|---|---|
| Créneaux (heures z) : Matin, Après-midi, Soir | 8 à 12, 12 à 18, 18 à 23 (par demi-heure ; la fin doit suivre le début) |
| Pays préféré (périmètre ATC) | « France métropolitaine » ; sessions ATC (trainings, examens, réservations) importées et montrées pour ce pays seul, Planning ODV et le Tableau (indicatifs OACI du pays : LF hors LFV pour la France) |
| Dates de la semaine | « Semaine ISO (n° de semaine du fichier) » ; sinon « Date saisie sur la frise » |
| Case vide | « Non renseignée » (jamais comptée disponible) ; sinon « Indisponible » |
| Types FLOTTE retenus pour les rôles | « Tous sauf les rouges (NQ : possédés, non qualifiés) » ; « Verts seuls » ; « Tous » |
| Missions montrées par créneau | 3 (de 1 à 10) |
| Ordre de préférence à score égal | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (familles inconnues ignorées, avec un avertissement) |
| Code restreint (SC, C, T, N) : rôles de son domaine seulement | coché |
| Ignorer une ligne de groupe colorée les 7 jours sur un créneau (habillage) | coché |

Chaque modification est enregistrée aussitôt. « Réglages par défaut » rétablit toutes les valeurs ci-dessus.

<!-- capture-manuels: admin-planning-odv -->
![Paramètres › Centre › Planning ODV : créneaux horaires, pays préféré et règles de lecture du classeur.](images/captures-manuels/admin-planning-odv.png)

*Figure 3 — Paramètres › Centre › Planning ODV : créneaux horaires, pays préféré et règles de lecture du classeur.*

### Tableau

Cette rubrique règle la page Tableau (`data/config/odv.json`, synchronisé).

| Réglage | Usage |
|---|---|
| Terrain (OACI) | jour et nuit aéronautiques de la frise |
| Réseau par défaut des vols | IVAO ou VATSIM, pour l'état des activations de zones |
| Délai sans CR avant MNE (heures) | 48 par défaut |
| Jours affichés, heures de service | 7 jours, 06:00 à 23:00 z ; servent à la frise et aux statistiques |
| Modèles de vols, de divers, de contrôle | libellé, durée, couleur, fond plein ; « Couleur de l'indicatif » : la plaquette prend la couleur de son indicatif |
| Couleurs des indicatifs | préfixe (le plus long contenu dans l'indicatif l'emporte), fond, contour |
| Configurations d'avion | texte (KNON, TALIOS…), couleur ; proposées dans le tableau des avions d'un vol |
| Créneaux LL / RTBA (repli) | nom, début, fin, jours, couleur, zone de la base |
| Personnel | groupe Staff ou Membres, couleur, ordre dans la palette |
| Récurrences | éléments répétés ; « ✕ » arrête une récurrence |

« Enregistrer » écrit les réglages ; « Valeurs par défaut » rétablit les réglages d'origine, sauf le personnel, les couleurs des indicatifs, les créneaux LL et les récurrences.

### Envoi des comptes rendus (webservice)

Cette rubrique règle le bouton « Envoyer le CR » des pages de saisie. Il envoie un POST JSON (mission, CR en HTML et en texte, calculs) à l'adresse indiquée.
- Champs : « Adresse du webservice (https://…) », « En-tête de la clef » (`Authorization` par défaut), « Préfixe (Bearer, vide pour la clef seule) », « Clef ».
- L'adresse doit être en `https://`, sauf `http://localhost` ou `127.0.0.1` pour des essais.
- La clef reste dans ce navigateur (`missionSendKey:v1`) et n'entre pas dans les sauvegardes. « Oublier la clef » l'efface.
- Le service doit accepter les appels venant de l'adresse de la suite (CORS).
- La ligne d'état indique le nombre de CR envoyés depuis ce navigateur.
Détails : [Manuel d'exploitation](MANUEL_EXPLOITATION.md), § 10.

## Paramètres › Installation
<!-- page: apps/settings/installation.html -->

Cette page regroupe les réglages faits une seule fois : dossiers locaux, sources externes, compagnie virtuelle, données aéronautiques et types d'aéronefs.
Pour l'ouvrir : barre latérale › « Paramètres », puis l'onglet « Installation ». Cet onglet apparaît à partir du niveau d'utilisation Planification (2) ; une adresse directe vers l'une de ses rubriques l'ouvre à tout niveau.
Le menu latéral comporte un seul groupe, « Dossiers et sources » : « Sources et dossiers » (ouverte d'emblée), « Clés et services externes », « Données aéronautiques » et « Types d’aéronefs ».
Le premier lancement a son propre onglet, « Premier lancement », décrit dans le [manuel utilisateur](MANUEL_UTILISATEUR.md#premier-lancement) ; « Nettoyer et recommencer… » se trouve en bas de cette page-là. Voir aussi [Installation](INSTALL.md), § 1.
Ces rubriques sont attribuées à la page par `config/repository_tree` (clé `settings.sections` : `sources` et `keys` → installation ; `sia` et `types` → installation,maintenance, c'est-à-dire sur les deux pages : la mise en place ici, la mise à jour dans Maintenance, mêmes blocs). Toutes les autres rubriques de maintenance s'ouvrent sur la page Maintenance.

En mode GitHub (appli sans lanceur : site web, appli iOS ; accès aux données réglé dans Mon profil › Accès aux données), Installation se réduit à la seule carte « Accès aux données » : dépôt des données (lien `https://github.com/<dépôt>`) et branche, état de l'accès (essai du jeton), dernière lecture réussie, écritures en attente dans la boîte d'envoi du navigateur (bouton « Synchroniser » pour les envoyer), base des types d'aéronefs lue dans le dépôt, lien vers le site de la compagnie virtuelle et lien vers Mon profil › Accès aux données. Dossiers locaux, clés IVAO et import SIA se règlent sur un poste avec lanceur : les cartes « Sources et dossiers », « Clés et services externes », « Données aéronautiques » et « Types d’aéronefs » ainsi que l'onglet « Premier lancement » ne sont pas proposés. Le mode ne dépend que du réglage de l'accès, pas de l'appareil : la carte est la même sur un navigateur de bureau. Sur la page Maintenance, ce mode ne propose que ce qui marche sans lanceur ni dossier : versions, données aéronautiques (la base publiée dans le dépôt des données par un poste avec lanceur : zones, cycle, « Relire la base publiée »), caches et stockage du navigateur, sauvegarde du navigateur (archive téléchargée, sans dossier de sauvegarde) et journal ; les mises à jour, les références et dépendances et les types d'aéronefs ne sont pas proposés. Les dossiers mémorisés par ce navigateur lors d'un ancien usage avec lanceur sont ignorés : les données viennent du dépôt GitHub. Si la page est servie par le lanceur (mode GitHub réglé dans ce même navigateur), Maintenance montre toutes ses cartes et leurs boutons, avec sur « Données aéronautiques » et « Types d’aéronefs » la phrase « Mode GitHub actif dans ce navigateur : les données lues viennent du dépôt, les publications se font sur ce poste (lanceur). »

### Sources et dossiers

Cette rubrique est le seul endroit où régler les dossiers locaux et les adresses des sources externes.
- **Premier lancement** (arrivée depuis le lanceur) : un encadré demande de choisir la première ligne, « Dossier du dépôt ». Les autres dossiers en sont déduits.
- **Dossiers locaux** : chaque ligne a son bouton de choix et un état (« non choisi », « autorisé », « à ré-autoriser »). Un contrôle signale un dossier qui ne semble pas être le bon (fichier repère absent). Le navigateur mémorise l'autorisation, mais peut demander de la confirmer après un redémarrage.
- **Alerte de dossier** : si la suite ne peut pas vérifier que le dossier des données autorisé est celui de la suite servie, une alerte le signale une fois (lecture et écriture se font alors dans ce dossier) ; si un enregistrement reste dans le navigateur faute de pouvoir l'écrire, l'alerte en donne la raison réelle.

| Dossier | Contenu attendu |
|---|---|
| Dossier du dépôt | racine de l'application (contient `lancer.cmd`, `config/repository_tree`) |
| Dossier des données | `data/` (contient `data_tree.js`) |
| « Dossiers déduits (3) », repliés : registre, missions, SIA | `data/cr`, `data/missions`, `data/sia`, réglés avec le dossier des données |
| Dossier du classeur ODV | dossier synchronisé (OneDrive…) où l'escadrille dépose le `.xlsx` |
| X-Plane (en second plan : « Journaux d'atterrissage : autre dossier… »), Dossier performances, Dossier de sauvegarde locale | dossier d'installation d'X-Plane (données de navigation `earth_*.dat`, Custom Data ; journaux d'atterrissage CSV, sauf autre dossier choisi), profils `.lnmperf` / `.json` (relus par Carburant, bloc « Profils de performances », dès que le dossier change), `defa_local_store.yaml` ; facultatifs, signalés « facultatif, non choisi » (information) tant qu'ils ne sont pas choisis |

- **Sources externes** : l'adresse par défaut s'affiche en grisé. Une valeur saisie ne vaut que pour ce navigateur ; « ↺ » revient à la valeur par défaut et « Ouvrir ↗ » ouvre l'adresse.
- **Clés d'API (services externes)** : renvoi vers la rubrique « Clés et services externes », seule place des clés de la suite.
- **Sites que la suite peut contacter** : liste fixe (cartes, réseaux, météo, SimBrief) et adresses de la configuration, plus les sites autorisés sur ce poste (« Retirer ») ; un site s'ajoute par « Autoriser ce site… » dans la notification de blocage, confirmé dans la fenêtre du lanceur (gardé dans secrets/sites.json).
- **Dossiers en lecture seule** : dossier de l'application, dossiers de X-Plane, classeur ODV et dossiers ajoutés à la sauvegarde sont autorisés en lecture (« autorisé (lecture) ») ; l'écriture n'est demandée qu'au moment d'une action qui en a besoin (restauration, « Enregistrer dans le dépôt » pour AircraftDB). Les données (`data/` et ses sous-dossiers) sont autorisées en écriture.
- **Ouverture depuis un autre site ou une extension** : refusée par défaut (une page de la suite ouverte par un lien d'un autre site, ou par une extension comme Claude in Chrome, affiche « Page de la suite ouverte depuis un autre site : refusée »). « Autoriser jusqu'à la fermeture du lanceur… » la permet après confirmation dans la fenêtre du lanceur ; un bouton rouge « ⚠ Protection réduite — rétablir » reste alors dans l'en-tête de chaque page. Données, scripts et réglages du lanceur restent fermés aux autres sites.
- **Compagnie virtuelle** : « Nom », « Nom long », « Sigle », « Centre (sigle) », « Centre (nom complet) », et les pages du site (« Page d'accueil », « Log des vols », « Flotte », « Fiche d'un appareil »). Un champ vide garde la valeur par défaut. « Revenir à SO Group Virtual » efface tous ces réglages.
- **Premier lancement** : « Rouvrir le premier lancement ». Pour repartir de zéro, « Nettoyer et recommencer… » se trouve en bas de la page du premier lancement (rubrique « Recommencer »).

<!-- capture-manuels: admin-installation -->
![Sources et dossiers : dépôt, données, classeur ODV, X-Plane, performances et sauvegarde locale.](images/captures-manuels/admin-installation.png)

*Figure 4 — Sources et dossiers : dépôt, données, classeur ODV, X-Plane, performances et sauvegarde locale.*

### Clés et services externes

Une seule place pour les clés de la suite, communes à tous ses utilisateurs : une carte par service. Ailleurs (premier
lancement, CR, Tableau, Planning ODV), la suite affiche seulement l'état de la clé et renvoie ici.
- **IVAO** : clé d'API de la suite (developers.ivao.aero). Elle est gardée par le lanceur (`secrets/ivao.json` à la
  racine de l'application, exclu de git, hors des données et des sauvegardes) ; la page n'en voit que l'état :
  « enregistrée le … UTC (…abcd) », « absente », ou « variable d'environnement IVAO_API_KEY » (prioritaire, non
  modifiable ici). « Enregistrer » remplace la clé puis la teste ; « Tester » fait un appel de contrôle (« OK : clé
  acceptée par IVAO, N sessions du tracker lues sur la dernière heure », ou « clé refusée ») ; « Retirer » l'efface
  après confirmation. « Sert à » : CR › Préremplir depuis mon dernier vol, Tableau (activations et sessions ATC IVAO),
  Planning ODV (sessions ATC IVAO).
- **VATSIM**, **SimBrief** : pas de clé (API publiques) ; la carte dit ce qui s'en sert et renvoie à Mon profil pour
  le CID et l'identifiant SimBrief.
- **Site de la compagnie** : pas de clé ni de mot de passe (le lanceur lit les pages publiques) ; adresse dans
  Sources et dossiers, identifiant dans Mon profil.
- **Webservice d'envoi des CR** : sa clef reste dans ce navigateur, réglée dans Paramètres › Centre › Envoi des
  comptes rendus (lien) ; la carte indique si elle est enregistrée.

Une clé absente ou refusée par IVAO (401 / 403) est signalée là où elle sert (« Clé IVAO refusée par IVAO : la
remplacer dans Paramètres › Installation › Clés et services externes ») avec le lien « Ouvrir les clés ↗ ».

## Paramètres › Maintenance
<!-- page: apps/settings/maintenance.html -->

Cette page sert à l'entretien de la suite : mises à jour, versions, données SIA, caches, sauvegardes et bases de référence.
Pour l'ouvrir : barre latérale › « Paramètres », puis l'onglet « Maintenance ». La page s'ouvre sur « Mises à jour ». Cet onglet n'apparaît qu'au niveau d'utilisation Expert (4) ; une adresse directe vers l'une de ses rubriques l'ouvre à tout niveau.
Le menu latéral comporte trois parties :
- le groupe « Maintenance » : Mises à jour, Versions et synchros, Références et dépendances, Données aéronautiques, Types d'aéronefs ;
- le groupe « Stockage et sauvegarde » : Caches, Espace disque, Sauvegarde totale, Journal ;
- les bases de données, rangées dans les groupes « Fichiers du dépôt », « Référence et journal », « Missions » et « Données du navigateur ». Ces groupes n'apparaissent qu'au niveau Expert.

### Mises à jour de la suite

Ce bloc règle d'où viennent les mises à jour du code et quand la suite les cherche.
- **Canal** : `master` (stable, versions publiées) ou `develop` (early bird, dernières évolutions avant publication).
- **Mode** : « Manuel » (bouton « Vérifier maintenant ») ; « Automatique, régulièrement », à chaque ouverture, tous les jours, toutes les semaines, à chaque cycle AIRAC ou tous les mois ; « Désactivée » (aucun contrôle, aucune pastille).
- Le contrôle interroge framagit. Quand une nouveauté existe, une pastille « Mise à jour » s'affiche dans l'en-tête de toutes les pages.
- **Appliquer la mise à jour** : une page web ne peut pas réécrire le dépôt. Copiez les commandes (bouton « Copier ») et lancez-les dans un terminal, à la racine : `python tools/update_suite.py channel <canal>` puis `python tools/update_suite.py update`. Pour un diagnostic : `python tools/update_suite.py doctor`.
- `update` refuse de s'exécuter si des fichiers suivis sont modifiés, n'avance qu'en fast-forward et trace chaque opération.
- **Dépôt git local** : choisissez le « Dossier du dépôt », puis « Lire l'état git ». Le tableau affiche la branche, HEAD, origin, le suivi, master / develop, le dernier fetch et le canal mémorisé par git. Un écart avec le canal choisi est signalé.
- Une installation par archive ZIP n'a pas de `.git` : on la met à jour avec une nouvelle archive.

<!-- capture-manuels: admin-maintenance -->
![Maintenance › Mises à jour : canal, mode de contrôle, état de la version et dépôt local.](images/captures-manuels/admin-maintenance.png)

*Figure 5 — Maintenance › Mises à jour : canal, mode de contrôle, état de la version et dépôt local.*

### Versions et synchronisations

Ce tableau donne la version et la date de mise à jour de chaque élément, avec un état (✓, ⚠, ✗) et la source ou l'outil de mise à jour.
- Code : suite (`repository_tree`), version de cache des scripts, git, canal distant.
- SIA / AIRAC : cycle en vigueur et cycle suivant, base du studio cartographique, dossier SIA XML, `mora.csv`, axes AAR (ENR 5.7).
- Bases de référence : types OACI, performances APD, flotte, référence, indicatifs.
- Données utilisateur : plans de vol SimBrief, profils du planificateur, registre des CR, registre des missions générées, journaux d'atterrissage, données locales, dernière sauvegarde totale.
- « Actualiser » relit l'état git et le dossier SIA.
- Un avertissement s'affiche si les données locales n'ont pas été sauvegardées depuis plus de 7 jours, ou s'il n'y a pas eu de sauvegarde totale depuis plus de 30 jours.

### Références et dépendances

Ce bloc décrit chaque référence de la suite :

| Colonne | Contenu |
|---|---|
| Référence, Fichier | la référence et son fichier |
| Traçage | comment la version est tracée |
| Mise à jour | procédure de mise à jour |
| Dépendants | données qui en dépendent |
| Contrôle | cohérence vérifiée |

Références suivies : XML SIA, base analysée du studio, grille MORA, axes AAR, performances APD, flotte, profils du planificateur et prompt des missions.
Exemples de contrôles : cycles mélangés dans la base SIA, obstacles MORA d'un autre cycle, types de la flotte absents de la base OACI, prompt à régénérer (`python tools/build_mission_prompt.py`).
Le bouton « Vérifier » relance les contrôles.

### Données aéronautiques : zones du monde, sources et cycles AIRAC

**Carte des zones** : une zone par pays (la France regroupe la métropole et l'outre-mer, couverture du SIA), plus une zone océanique, « Atlantique Nord (océanique, NAT) », dont les sources sont X-Plane (points et routes océaniques, hors de tout pays) et les tracks NAT du jour. La survoler affiche ses sources dans le panneau de droite. **Un clic ajoute le pays à la sélection, un autre l'en retire** (pays choisis en bleu cerclé) ; la barre sous la carte les énumère (à activer, à désactiver, « Annuler »). **« Activer »** applique la sélection, puis enchaîne seul, pour tous les pays choisis encore incomplets, tout ce que la suite peut faire : téléchargements de leurs sources, derniers ZIP de Téléchargements (SIA, NATS…), une seule reconstruction de la base, puis la MORA de chaque pays qui n'en a pas — seulement si la base a été reconstruite (double jauge : étape et détail ; une source en échec n'arrête pas les autres ; résumé en notification). Le panneau d'un pays garde « Activer la zone » / « Désactiver la zone » et, pour une zone active, « Tout récupérer et recalculer ». Ce qui reste à faire à la main (commande sur le site du SIA, PDF à importer, dossier d'X-Plane, fichiers à déposer…) est listé sous la carte, « Actions à faire » : une ligne par source, avec son lien et son bouton ; les téléchargements et la MORA, faits par « Activer », y tiennent sur une seule ligne « automatique ».
- Couleurs : contour seul = inactive, sans données ; gris = inactive, avec des données ; orange = active, données incomplètes ; vert = active, toutes les données des sources cochées ; bleu clair = zone survolée ; bleu cerclé de bleu foncé = pays choisi (« Activer » pour appliquer).
- Chaque source se coche ou se décoche pour sa zone ; seules les sources cochées des zones actives entrent dans la base. Une source « lien » (PDF ou site de consultation) n'est pas lue par la suite. **La mise en place ne refait que ce qui manque** : une source à jour n'est pas retéléchargée (« Tout récupérer et recalculer » la revérifie, sans rien réécrire si le serveur n'a rien de nouveau), un fichier identique n'est pas réécrit, et la base n'est relue que si un fichier, une zone ou une source a changé ; relancée sans rien de nouveau, elle ne télécharge, n'écrit et ne recalcule rien. **« Purger la zone… »** (zone qui a des données) supprime, après confirmation, ses fichiers du dossier SIA (pour la France : les XML du SIA et les axes ENR 5.7) et ses cases de `mora.csv` (ancien fichier dans `_archives/`), la désactive et relit la base ; le dossier X-Plane n'est pas touché. Une nouvelle activation réinstalle tout.
- Selon la source, le panneau propose :
  - un téléchargement direct par le lanceur (`tools/aero_fetch.py`) : openAIP (chaque pays), ENAIRE (Espagne), FAA (États-Unis : zones et routes militaires, classes d'espace), AIP militaire britannique (ENR 5.2, PDF officiel lu par le lanceur : zones de vol à basse altitude, VATA, zone d'évitement TVAA, axes de ravitaillement AARA ajoutés à ceux de la DIRCAM), NAV CANADA (Designated Airspace Handbook, édition en vigueur lue par le lanceur : zones dangereuses, réglementées et consultatives du Canada, à retélécharger tous les 56 jours), tracks NAT du jour (zone Atlantique Nord : message de Shanwick et de Gander publié par la FAA, à retélécharger avant chaque vol transatlantique, les tracks changeant deux fois par jour ; « ancien » au-delà de 12 heures ; points nommés placés d'après la source X-Plane de la zone) ;
  - une commande ou une inscription, avec le lien et le mode d'emploi : SIA France (commande à 0 €, à refaire à chaque cycle), NATS (Royaume-Uni, fichier déposé dans `data/sia/zones/gb/`) ;
  - un PDF, avec le lien et le mode d'emploi : DIRCAM / MILAIP ENR 5.7 (axes de ravitaillement) ;
    DIRCAM : « Importer le PDF MILAIP… » lit le PDF de la section ENR 5.7 (pdf.js, réseau au premier import), montre le nombre d'axes et les anomalies relevées, puis « Écrire miam-enr-5-7-tracks.xml » range le fichier dans le dossier SIA (ancien dans `_archives/`) et met la base à jour  (« Arrêter » pendant la lecture : rien n'est gardé ni écrit);
  - un dossier de l'ordinateur : X-Plane (balises, points, voies aériennes, grille MORA, découpés aux contours des zones actives qui l'ont cochée) ;
  - un calcul : la MORA de la zone. Une zone très étendue (plus de 1500 cases d'un degré : États-Unis, Canada…) prend par défaut la MORA d'X-Plane ; « Calcul complet… » la calcule par blocs de 10°, après une confirmation qui annonce le volume (relief des tuiles ouvertes d'AWS majoré de 100 m, sans requête OpenStreetMap) : chaque bloc est écrit aussitôt dans `mora.csv`, « Arrêter » entre deux blocs, « Reprendre le calcul complet… » plus tard.
- SIA France (zone France) : « Récupérer le ZIP téléchargé » (le lanceur le prend dans Téléchargements), « ZIP d'export du SIA… », « Extraire … » s'il est déjà dans le dossier, « Archiver les anciens cycles » (`_archives/`) ; « Contenu du dossier SIA » liste les fichiers du cycle.
- Le SIA garde la priorité : dans les FIR françaises, seuls ses espaces comptent ; ailleurs, un espace, un aérodrome ou une balise déjà lu n'est pas ajouté une deuxième fois. Hors de France, les zones R, D, TRA, TSA, MOA, W, A et les routes MTR recoupées par une mission figurent dans ses espaces à activer.
- Les adresses des sites (SIA, DIRCAM, NATS, AIP militaire britannique, NAV CANADA) se règlent dans Paramètres › Installation › Sources et dossiers › Sources externes ; les dossiers SIA et X-Plane y sont les mêmes qu'ici.

**Base aéronautique : sources, cycles et reconstruction** : cycle en vigueur, cycle suivant et cycle de la base, puis un tableau de toutes les sources cochées des zones actives (zone, source, fichiers, cycle ou date, âge, taille, état). Un clic sur une ligne épingle sa zone et met la source à jour (téléchargement, ZIP du SIA, import du PDF MILAIP, dossier X-Plane, MORA de la zone). En tête du tableau : le nombre de contrôles sans souci, puis les problèmes (sources manquantes) et les avertissements (anciennes) ; « Afficher les problèmes » ne garde qu'eux. Le tableau est trié par état (problèmes d'abord) et se trie par colonne.
« Tout recalculer » reconstruit la base avec toutes les zones actives (quelques secondes ; le navigateur peut demander d'autoriser le dossier) ; « Purger le cache » la vide. C'est le même bloc que dans le studio cartographique.
États du tableau :
- SIA : cycle lu dans le nom des fichiers, « ancien » s'il précède le cycle en vigueur ;
- X-Plane : cycle de « Custom Data » ;
- fichiers téléchargés : « ancien » au-delà de 28 jours (un cycle AIRAC) depuis le téléchargement ou la dernière vérification sans changement.

**Base publiée dans le dépôt des données** : à chaque reconstruction, la base est aussi écrite zone par zone dans le dossier des données, `data/sia/base/<zone>/<cycle>.json` (une zone, JSON en clair : quelques centaines de Ko à environ 5 Mo pour la France), et les villes dans `data/sia/base/cities.json`. Un fichier n'est réécrit que si son contenu change ; les cycles plus anciens de la zone sont retirés. Le compte rendu de la reconstruction dit ce qui a été publié ; « Synchroniser » l'envoie. Il faut que le dossier des données soit autorisé (Installation › Sources et dossiers), sinon le compte rendu dit pourquoi la base n'est pas publiée. Les téléphones et le site (mode GitHub) lisent ces fichiers : ils n'ont ni dossier SIA ni reconstruction, mais la même base que le poste qui l'a publiée. La même publication écrit aussi la base découpée par sorte, lue par la V3 : `data/sia/base/<zone>/<cycle>/` (un fichier par sorte : espaces, aérodromes, balises, points, VRP, voies, obstacles, MORA, villes de la zone…), les grandes villes du monde (`data/sia/base/cities_major.json`, plus de 100 000 habitants) et le sommaire des zones publiées (`data/sia/base/index.json`) ; une page n'y lit que ce qu'elle demande (les aérodromes de la France : environ 400 Ko au lieu de 5,5 Mo). Les deux formats sont écrits pendant la transition.

**MORA** : plusieurs sources.
- La grille calculée (`data/sia/mora.csv`) a la priorité. « Recalcul simple » reprend les obstacles du nouveau cycle (hors ligne) ; « Calcul complet » refait relief et sommets (réseau, environ une minute) pour les théâtres et les missions ; « Calculer la MORA de la zone » (panneau) le fait sur l'emprise d'une zone, les autres cases étant gardées.
- Si des cases changent : « Écrire mora.csv (ancien archivé) », puis committez le dépôt de données.
- Ailleurs, la grille MORA d'X-Plane complète, si la source X-Plane est cochée.

Méthode de la grille calculée : pour chaque case de 1° × 1°, le point le plus haut entre le relief (tuiles d'altitude AWS Terrarium), les sommets OpenStreetMap et les obstacles de l'AIXM du SIA, plus 1000 ft (2000 ft au-delà de 5000 ft), arrondi à la centaine supérieure ; sans les sommets OSM, le relief est majoré de 100 m. Théâtres couverts : métropole, Corse et outre-mer, plus les emprises des missions du registre situées ailleurs (relief et sommets seulement). Sur les cartes, la valeur s'écrit au centre de la case en notation OACI (3⁵ = 3500 ft) ; en zoom arrière, les cases se regroupent par 2 × 2 puis 4 × 4 (valeur la plus haute). La carte ENR 6.1 du SIA ne sert pas de source (zones irrégulières).

**Cohérence** : « Contrôler » vérifie espaces, appareils, flotte, performances et terrains des missions.
Les XML AIRAC (environ 80 Mo par cycle) restent hors dépôt, comme les fichiers des autres sources. Les valeurs MORA sont calculées, pas certifiées.

**Points de report VFR des cartes VAC.** La carte peut montrer, pour chaque terrain, ses points de report, les séquences de passage et les consignes de ses cartes VAC, tirés des PDF par `tools/report-vfr/refresh_vfr.py` (sur ce poste, avec le module Python facultatif `pypdf` : `python -m pip install -r tools/report-vfr/requirements-vfr.txt`). À chaque nouveau cycle VAC : régler `sourceDirectory` dans `tools/report-vfr/config.json` sur le dossier des nouvelles VAC et relancer `python tools/report-vfr/refresh_vfr.py --config tools/report-vfr/config.json` (mode d'emploi dans `tools/report-vfr/`), puis, dans cette section, « Importer une compilation VFR (VAC)… » (niveau Expert) et choisir le `vfr-compiled.json` produit. La page le contrôle (rien n'est écrit à la moindre erreur, la liste des erreurs s'affiche), rapproche ses points des VRP de la base, montre le résumé (terrains, points, points non rapprochés, séquences, pages de consignes, fichiers changés) et demande l'accord ; elle écrit alors un fichier par terrain dans `sia/vfr/` du dépôt des données, puis synchronise. Ces données restent des candidats : la carte les marque « extrait des VAC, à vérifier » et ne les présente jamais comme des itinéraires publiés.

### Caches

Ce bloc purge les données que la suite sait reconstruire. Aucune donnée utilisateur n'est touchée (registres, brouillons, profils, OFP, sauvegardes).

| Cache | Après « Purger » |
|---|---|
| Index des données (IndexedDB `defaIndex`) | effacé, puis reconstruit depuis les fichiers au prochain chargement des pages |
| Aérodromes utilisés | relus dans la base mondiale au prochain usage |
| Base mondiale des aérodromes (jsDelivr) | purge du CDN demandée, puis fichier rechargé |
| Base SIA analysée | à relire depuis le dossier SIA (une confirmation est demandée) |
| Contrôle des mises à jour | relu au prochain contrôle |
| Fichiers de l'application (cache HTTP) | « Recharger sans cache » : fichiers rechargés, puis page rechargée |

Purgez l'« Index des données » quand une page affiche une donnée périmée après un changement de fichiers fait hors de la suite, sans le lanceur.
« Tout purger et recharger » enchaîne toutes les purges, après confirmation.

### Espace disque

Ce bloc n'apparaît que si le Centre est activé.
- « Calculer la place utilisée » mesure le dossier des missions (`data/missions`) : par mission, par type de fichier et au total. Il indique aussi la place utilisée par le navigateur.
- « Données aéronautiques, par zone » : place du dossier SIA par zone (sources et nombre de fichiers ; mora.csv compte pour toutes les zones). Une zone désactivée garde ses fichiers : les supprimer à la main pour libérer la place.
- « Supprimer les cartes surnuméraires » retire les cartes qui ne figurent plus dans la liste de leur mission.
- « Purger toutes les cartes générées » et « Purger les PDF » libèrent de la place ; ces fichiers se régénèrent depuis le YAML.
- Chaque suppression demande confirmation.
- Les versions précédentes et les textes reçus forment l'historique : ils ne sont jamais purgés ici.
- Le dossier des missions doit être autorisé dans Sources et dossiers.

### Sauvegarde totale

Ce bloc produit une archive ZIP de toutes les données locales, avec un manifeste (`manifest.json`, empreintes SHA-256).
- **Contenu** :
  - le navigateur, toujours inclus ;
  - « Dépôt de données (data/ …) » ;
  - les journaux d'atterrissage (dossier X-Plane) ;
  - les profils de performance ;
  - les dossiers ajoutés avec « Ajouter un dossier… » (un nom et un filtre de fichiers).
- Chaque source se coche ou se décoche. L'option « inclure les fichiers lourds » ajoute les cartes PNG, ZIP et PDF ainsi que les XML AIRAC.
- « Créer la sauvegarde totale » écrit l'archive dans `sauvegardes/` du dossier de sauvegarde locale ; si ce dossier n'est pas autorisé, l'archive est téléchargée.
- « Changements depuis » compare les dossiers à la dernière sauvegarde totale.
- **Recharger une sauvegarde totale** : « Choisir l'archive… ». Chaque fichier reçoit un état : identique, absent du disque, plus ancien ou plus récent sur le disque. Cochez les fichiers voulus, puis « Restaurer la sélection ».
- Avant d'être remplacés, les fichiers sont copiés dans `_avant_restauration/` de leur dossier. Les données du navigateur sont fusionnées : la valeur la plus récente l'emporte.
- Volontairement hors sauvegarde : clef du webservice, suivi réseau en cours, base SIA analysée, autorisations de dossiers, journal des vols (rechargé depuis le site), identifiants du site de la compagnie.

<!-- capture-manuels: admin-sauvegarde -->
![Sauvegarde totale : contenu de l’archive, dossiers inclus et commandes de sauvegarde et de rechargement.](images/captures-manuels/admin-sauvegarde.png)

*Figure 6 — Sauvegarde totale : contenu de l’archive, dossiers inclus et commandes de sauvegarde et de rechargement.*

### Journal des sauvegardes et rechargements

Ce tableau trace chaque opération sur les données, avec la date, l'opération (et la page), l'origine et le résultat. Le détail des clés ajoutées (+) ou modifiées (~) se déplie.
Opérations tracées :
- rechargement des données locales (☰ › Données locales › Restaurer) ;
- sauvegarde totale et restauration d'une sauvegarde totale ;
- extraction de l'export SIA et archivage des anciens cycles ;
- recalcul MORA.
Tant qu'aucune de ces opérations n'a eu lieu, le journal est vide.

### Flotte (appareils connus)

Cette base (`data/references/aircraft_fleet.js`) liste les appareils proposés dans les CR : « Opérateur », « Type OACI », « Variante », « Immatriculation », « Code », « Numéro », « Indicatifs » (séparés par des virgules), « Terrain de base », « Opérationnel ». Le « Type OACI » propose la base des types (liste déroulante avec recherche, par le code ou le nom du modèle) ; une saisie libre reste possible.
- **« Coller la page Flotte du site… »** :
  1. ouvrez la page « Flotte virtuelle » du site de la compagnie (lien dans la fenêtre) ;
  2. faites Ctrl+A puis Ctrl+C, et collez dans la zone (Ctrl+V) ; vous pouvez aussi utiliser « Lire le presse-papiers » ou « ou page enregistrée… » ;
  3. cliquez sur « Lire ».
- Un appareil de la page remplace celui du fichier (même immatriculation) mais garde ses indicatifs supplémentaires. Les appareils absents de la page sont conservés.
- La ligne d'état donne le nombre d'appareils mis à jour, ajoutés et conservés. Vérifiez, puis « Enregistrer dans le dépôt ».
- **Boutons communs aux bases du dépôt** : « Enregistrer dans le dépôt » en évidence (écrit le fichier dans le Dossier du dépôt, à committer) ; sous « Plus… », « Appliquer dans ce navigateur » (modifications locales prioritaires), « Télécharger », « Annuler les modifications », « Revenir au fichier du dépôt ». La ligne d'état dit d'où vient le contenu : « État : fichier du dépôt, sans modification dans ce navigateur », ou les modifications locales et leur date.
- **Automatique** : le lanceur lit lui-même les pages publiques Flotte et Log des vols du site (sans connexion), une fois par jour à l'ouverture d'une page, avec les mêmes règles que le collage ; il écrit `data/references/aircraft_fleet.js` et `defa_reference.js`, à envoyer par « Synchroniser ». Réglage et « Mettre à jour maintenant » : sous la liste des appareils du reporting (ci-dessous). Le collage et le script (`python AircraftDB/update_fleet.py Flotte.html`) restent possibles.
- **Où** : Paramètres › Centre › « Flotte (appareils connus) », réservée tant que le Centre est verrouillé (auparavant dans Maintenance).
- **Carte de la flotte** : page à part, pour tous (Compte rendu › Flotte, voir le manuel utilisateur) ; le bouton « Carte de la flotte », au-dessus du tableau, y mène. Elle montre chaque appareil à son terrain actuel, avec filtres, survol (dernier vol) et sélection ; avec le Centre activé, son bouton « Modifier la flotte » ramène ici.
- **Appareils du reporting** : sous la flotte, tous les appareils qui volent dans le journal des missions (type, indicatifs, exploitant, vols, dernier vol). Case « personnel », cochée par défaut : appareil individuel, hors de la flotte du SOG ; la décocher l'ajoute à la flotte (il devient affectable), la recocher l'en retire. Puis « Enregistrer dans le dépôt » : la flotte et l'index des appareils individuels (`data/references/aircraft_personal.js`) sont écrits ensemble. Un appareil de la page Flotte du site revient dans la flotte à la mise à jour suivante.
- **Types et performances** : « Rafraîchir types et performances » complète les types inconnus de la base (flotte et reporting) ; la mise à jour quotidienne depuis le site le fait aussi, en tâche de fond, pour la flotte, le journal et les appareils individuels.
- **Terrain (base) d'un appareil** : il ne change que par la mise à jour depuis le site, ou par un CR issu d'un ordre de mission avec un vrai terrain d'atterrissage ; un CR hors ordre de mission ou un landing report ne déplace pas l'appareil. Un appareil ajouté depuis le reporting entre sans terrain. Le terrain actuel est la colonne « Emplacement » de la page Flotte du site (gardée avec la date de son dernier changement), sauf si un CR issu d'un ordre de mission, plus récent, donne un terrain d'atterrissage réel (`missions/aircraft_positions.json`) ; les convoyages partent de là (affectation, Planning ODV, Tableau, fiche appareil).

### Types d'aéronefs (base OACI)

Cette base (`AircraftDB/aircraft_db.js`) contient deux tableaux :
- « Types » : « Désignateur », « Modèle », « Description OACI », « WTC », « Aile », « Source » ;
- « Alias (nom courant → désignateur) ».
Les modifications sont aussi reportées dans `aircraft_overrides.json`. Les boutons sont ceux des bases du dépôt.
Le « Mode opératoire » donne les commandes du script de rafraîchissement, à lancer depuis `AircraftDB` : `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. La base n'est pas publiée avec la suite (données de l'OACI et d'EUROCONTROL) : la rubrique « Types d'aéronefs » de Paramètres › Maintenance la complète sur ce poste, type par type, sans jamais tout reprendre. Elle se lit en trois temps : « Ce que c’est » (la fiche OACI, qui donne l'icône et la classe 2P, 2T, 4T…, et les performances EUROCONTROL) ; le tableau des types de la flotte, des missions et des CR (silhouette, code et modèle, classe OACI, fiche ✓ ou manquante, performances clés — plafond, croisière, V2, Vat — avec le détail en infobulle et le lien EUROCONTROL, emploi) ; puis « Compléter automatiquement (n) », qui télécharge ce qui manque. Un code libre se saisit sous « Télécharger d’autres types… » (replié) ; « Modifier la base à la main… » (niveau Expert) ouvre cette base. Un seul groupe par avion : les libellés des missions et des CR (« A332 A330 MRTT Phénix », « A330 MRTT PHÉNIX ») sont ramenés au code OACI (flotte, alias, noms d'usage ; chaîne d'alias suivie, par exemple A4M → A400, un code maison ramené au désignateur OACI) ; un type écrit en clair dans un CR est reconnu au lieu de créer un type local. Un type sans performances EUROCONTROL est estimé : « ≈ 2 000 kg/h, 480 kt (type connu) » ou « (classe OACI L2J) », même repli que le planificateur carburant (`shared/fuel_reference.js`). Il faut le lanceur et le réseau ; à la fin de la passe, la page se recharge d'elle-même et montre le bilan. Les fichiers écrits (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) n'appellent rien : les pages les lisent ; non versionnés, ils se complètent sur chaque poste ou se recopient d'un poste à l'autre. La même passe lit aussi la liste publique de SimBrief (une requête, gardée une semaine ; `--simbrief` en ligne de commande) : consommation de croisière (kg/h), masses (vide, sans carburant, atterrissage, carburant maximal), plafond et vitesse de 224 types, rangés dans `aircraft_perf.js` à côté des fiches EUROCONTROL ; une valeur dont SimBrief ne garantit pas la précision est une estimation. Enfin, Airframe DB (`--airframedb`, 40 fiches au plus par passe, cache de 30 jours) ajoute des alias (noms en usage, comme H125 → AS50, et noms des simulateurs → code OACI, sans jamais remplacer un alias existant ni détourner un désignateur officiel) et les caractéristiques publiées (vitesses, plafond, vario, masses, distance franchissable) des types sans fiche EUROCONTROL ni SimBrief, militaires et hélicoptères compris. En dernier recours, un désignateur que ni l'OACI ni EUROCONTROL ne connaissent (type retiré, comme la Caravelle S210) est cherché sur Aviation Fanatic : une page par type, nom, description OACI (L2J…) et turbulence, gardés sur ce poste (source « Aviation Fanatic »).

Pour les téléphones et le site (mode GitHub), qui n'ont pas de lanceur, « Publier la base appareils dans le dépôt des données » (niveau Expert, sous le tableau) copie `aircraft_db.js` et `aircraft_perf.js` dans `AircraftDB/` du dépôt des données, avec leur copie en JSON (`aircraft_db.json`, `aircraft_perf.json`, lue par la V3, qui n'exécute aucun script venu du dépôt), et retire tout le reste de ce dossier (caches, scripts, `__pycache__`), puis synchronise. Avant de rien faire, la page montre la liste de ce qui sera copié (+) et retiré (−) et demande l'accord. Les deux fichiers doivent être de simples valeurs (contrôle de `tools/data_guard.py`, comme les autres fichiers de données). La base n'est jamais publiée sur le site public.
Limite : un type supprimé ici peut revenir au prochain rafraîchissement, s'il fait partie de la liste de base du script.

### Correspondance des indicatifs

Cette base (`data/references/callsigns.js`) relie l'indicatif complet (conservé dans les CR) à sa forme plan de vol (case 7) et à l'exploitant OACI (OPR/, case 18).
- Tableau « Indicatifs » : « Indicatif complet », « Plan de vol », « Autres formes », « Organisme », « OPR/ », « Types », « Fonction », « Générique », « Radiotéléphonie », « Note ».
- Tableau « Organismes → désignateur OACI (OPR/) ».
- Il n'existe pas de script : cette page (ou le fichier, édité à la main) est la source.
- Pour l'alimenter : les formes corrigées dans les CR arrivent dans « Indicatifs appris », et les séries vues dans le journal arrivent par « Ajouter » ou « Compléter ».

### Flotte et pilotes de la compagnie (référence anonymisée)

Cette base (`data/references/defa_reference.js`) recense les pilotes (trigrammes) et les appareils de la compagnie, sans les vols ni les missions. Elle sert d'aide à la saisie et n'est pas exhaustive.
- Tableau « Appareils » : immatriculation, type, variante, statut, rattachement (modifiable), dernier AD connu, mise en service, indicatifs utilisés, premier et dernier vol, vols, fiche flotte, note.
- Tableau « Pilotes » : trigramme, premier et dernier vol, vols, types, note.
- Mise à jour :
  1. chargez le journal des vols (rubrique suivante) ;
  2. cliquez sur « Mettre à jour depuis le journal des vols » (ici) ou « Mettre à jour la référence (anonymisée) » (dans le journal) : rien n'est supprimé, et les saisies manuelles sont gardées ;
  3. « Enregistrer dans le dépôt », puis committez.
- Alternative par script : `tools/defa_reference.py`.

### Journal des vols (vols réalisés)

Cette base est distincte du registre des missions. Elle n'est gardée que dans ce navigateur : hors dépôt et hors sauvegarde locale, car elle contient des trigrammes.
- « Charger / mettre à jour le journal… » accepte la page « Log des vols » copiée ou enregistrée, ou un export CSV / JSON. Les vols sont fusionnés sans doublon.
- « Séries d'indicatifs » : « Ajouter à la correspondance » crée la ligne dans la correspondance des indicatifs (notification avec « Ouvrir la correspondance », filtrée sur la ligne) ; la série passe « Dans la correspondance ✓ » ; « Compléter » y ajoute les formes et les types vus depuis.
- « Vols » : filtre plein texte, 300 lignes affichées au plus.
- Actions :
  - « Mettre à jour la référence (anonymisée) » ;
  - « Exporter en CSV » ;
  - « Exporter en JSON (rechargeable) » ;
  - « Effacer la base de ce navigateur ».

### Fusions et renommages (pilotes, appareils)

Ce tableau liste les équivalences créées par « Fusionner avec… / renommer » depuis les fiches. Colonnes : « Type » (pilote ou appareil), « Ancien », « Devient », « Résultat ».
Ces équivalences s'appliquent au journal rechargé, à la référence et au catalogue.
« Supprimer » retire une équivalence, après confirmation.
Une boucle (A → B et B → A) est surlignée : elle échange les deux noms. Supprimez l'entrée fautive, puis refaites la fusion depuis la fiche.

### Registres des missions (base des opérations)

Le registre unique `data/cr/missions.yaml` regroupe toutes les familles. C'est la source de vérité des reportings.
- Une ligne par famille, avec le nombre de missions et les boutons « Éditer (YAML) », « YAML », « CSV », « Reporting ».
- « Éditer le registre complet (YAML) » ouvre l'éditeur ; « Contrôler et enregistrer » vérifie le YAML avant d'écrire. Dans le registre complet, chaque mission doit avoir sa famille.
- « Dossier du registre… » choisit le dossier où écrire. Sans ce dossier, l'enregistrement reste dans le navigateur.
- « Télécharger le registre (YAML) », « Exporter en CSV (tableur) ».
- Pour corriger une seule mission, passez plutôt par son CR (clic sur la ligne du reporting).

### Appareils des missions enregistrées

Cette base est gardée par le navigateur (`missionAircraftRegistry:v1`). Les appareils y sont mémorisés à chaque enregistrement d'une mission ; la donnée la plus récente l'emporte sur la flotte.
Colonnes : immatriculation, type, variante, catégorie, indicatif, code, opérateur, date.
Boutons : « Enregistrer » (dans le navigateur) et « Annuler les modifications ».

### Types ajoutés localement

Cette base liste les types inconnus saisis dans des missions : désignateur, modèle, catégorie, date d'ajout.
« Intégrer à la base du dépôt » copie ces types dans « Types d'aéronefs (base OACI) » et ouvre cette base. Il reste ensuite à l'appliquer ou à l'enregistrer dans le dépôt.

### Indicatifs appris (formes plan de vol corrigées)

Cette base liste les formes plan de vol corrigées à la main dans les CR : indicatif complet, plan de vol, date.
« Intégrer à la base du dépôt » les ajoute à la « Correspondance des indicatifs » et ouvre cette base. Vérifiez, puis appliquez ou enregistrez.

### Aérodromes utilisés (cache)

Cette base conserve les coordonnées et les fuseaux des terrains déjà utilisés, pour le lever et le coucher du soleil et la météo : OACI, nom, pays, latitude, longitude, altitude (ft), fuseau.
Elle se corrige à la main (« Enregistrer »). Elle se purge aussi dans « Caches » : elle se reconstitue alors depuis la base mondiale.

## Synchroniser les données

Les données partagées (disponibilités, utilisateurs, configuration, missions et affectations, CR, sessions ATC) vivent dans `data/`. Ce dossier est un dépôt git distinct de celui du code. Le bouton « Synchroniser » de l'en-tête l'échange avec les autres postes.

### Le bouton « Synchroniser (n) »

- Le bouton n'apparaît que si la suite est servie par le lanceur et que `data/` est un dépôt git.
- (n) additionne les modifications de ce poste à envoyer et les commits à recevoir. Le dépôt distant est relu à la fréquence réglée dans Paramètres › Maintenance › Versions et synchronisations (toutes les 30 minutes par défaut ; à chaque page, 3 fois par jour, une fois par jour) ; entre deux vérifications, le bouton montre le dernier état connu, gardé par le navigateur, et le lanceur répond avec son dernier relevé. L'infobulle donne la branche et la date de la dernière synchronisation.
- La synchronisation se lance à la main, d'un clic :
  1. les fichiers gardés dans le navigateur sont d'abord écrits dans le dossier ;
  2. le lanceur commite au nom du trigramme connecté (utilisateur usurpé compris) ;
  3. il récupère et fusionne les modifications des autres postes, puis envoie.
- Sans trigramme, la synchronisation est refusée : réglez-le dans Paramètres › Mon profil.
- À la fin, une notification donne le nombre de fichiers envoyés et reçus, et les pages relisent les fichiers changés.
- **Écart avec la sauvegarde** : le bouton passe à l'orange (modification non envoyée depuis plus de 48 h, 20 fichiers ou plus à envoyer, 10 commits à recevoir, commit non envoyé, fichier modifié hors des données synchronisées) ou au rouge (`data/` sans dépôt git ou sans dépôt distant, fusion en cours, seuils hauts : 100 fichiers, 7 jours, 50 commits) ; raisons en infobulle, alerte en notification une fois par session. Sans dépôt git (hors jeu d'essai), un bouton « ⚠ Sauvegarde » le signale. Seuils réglables : `data/config/suite.json`, clé `sync`.

### Première synchronisation

Le premier clic envoie tout ce qui n'a jamais été commité dans `data/`. Si la branche distante n'existe pas, il la crée.
Message « Commit local seulement : pas de dépôt distant » : `data/` n'a pas de dépôt distant, donc rien n'est partagé.
Les identifiants git sont ceux du système (clé SSH, gestionnaire d'identifiants) ; la suite n'en stocke aucun.

### Plusieurs utilisateurs, en attendant le serveur central

- Chaque poste **reçoit** à chaque lancement (le lanceur met `data/` à jour depuis le dépôt, sans rien envoyer) et **envoie** avec le bouton
  « Synchroniser » (commit, fusion avec les autres, envoi).
- Il faut, par poste qui envoie : git, la suite ouverte par le lanceur, un **droit d'écriture sur le dépôt de données**
  (un compte par personne sur l'hébergeur git, ou un compte partagé) et une clé SSH ou des identifiants HTTPS
  enregistrés dans Git.
- L'adresse du dépôt se précise et se vérifie au Premier lancement (étape 1, carte « Dépôt git de synchronisation des
  données ») : jamais bloquant, un dépôt qui ne répond pas est seulement signalé.
- Un poste sans git ni droit d'écriture peut écrire dans un **dossier partagé** (Synology, OneDrive…) qu'un poste
  équipé synchronise. Le serveur central supprimera ces prérequis : un compte suffira
  ([feuille de route](technique/ROADMAP.md), étape 2).

### Conflits et dossier `_conflits/`

Le lanceur résout les conflits fiche par fiche, sans jamais rien perdre :
- **fiche modifiée sur deux postes** : la plus récente l'emporte. L'autre version est gardée dans `<dossier>/_conflits/` et signalée par une notification ;
- **affectations** : fusionnées affectation par affectation ;
- **journal des affectations** : les deux côtés sont réunis ;
- **fichier supprimé d'un côté et modifié de l'autre** : la version modifiée est gardée.
Après une notification de conflit :
1. ouvrez la copie indiquée dans `_conflits/` ;
2. reportez à la main ce qui manque dans le fichier gardé ;
3. synchronisez de nouveau, puis supprimez la copie.
Le registre des CR (`cr/missions.yaml`) se fusionne à la main.
Message « Une fusion ou un rebase est en cours dans data/ » : terminez ou annulez l'opération git (`git -C data merge --abort`), puis recommencez.
Détails, schémas et essais sans risque : [architecture de la synchronisation](technique/SYNCHRONISATION.md).

## Lanceur, données et sauvegardes

La suite est servie par un petit serveur local, fourni avec elle. Les données vivent à trois endroits : le dossier `data/`, le navigateur et le fichier de sauvegarde locale.

### Lancer la suite

- **Windows** : double-cliquez sur `lancer.cmd`. **macOS / Linux** : `sh lancer.sh`. Les deux appellent `tools/launch.py`, qui suit trois étapes :
  1. **Python** : il est cherché, et installé au besoin (version 3.8 au moins).
  2. **Données** : si `data/` est présent, il est mis à jour sans `git pull` : les fichiers du pool modifiés sur ce poste sont d'abord commités (« Modifications du poste <TRI> »), puis la branche distante est fusionnée fiche par fiche comme au bouton « Synchroniser », sans rien envoyer. Un fichier hors du pool modifié (par exemple `sia/mora.csv`) est laissé tel quel ; si la mise à jour devait l'écraser, elle est reportée et la console le nomme. La console dit ce qui a été fait (fichiers commités, reçus, réception reportée et pourquoi) ; jamais bloquant. Sinon, une archive `.zip` déposée à côté du lanceur est extraite ; à défaut, le dépôt de données est cloné.
  3. **Serveur et navigateur** : le serveur démarre sur `http://127.0.0.1`, au premier port libre à partir de 8000, puis le navigateur s'ouvre. Si la suite tourne déjà, seul le navigateur s'ouvre.
- Laissez la fenêtre du lanceur ouverte pendant l'utilisation ; fermez-la (ou Ctrl+C) pour arrêter la suite.
- Options : `--port 8010`, `--page apps/…`, `--no-browser`, `--no-data`, et `--data <dossier>` pour servir une autre copie des données sous `/data/`, sans clone ni mise à jour. L'option `--data` sert aux essais, par exemple de synchronisation.
- Navigateur conseillé : Chrome ou Edge. Pour Brave, voir [Installation](INSTALL.md).

### Le dossier `data/`

- L'application et les données sont séparées. `data/` est un dépôt git à part, privé, placé dans le dossier de l'application ; le dépôt du code l'ignore.
- Sans accès au dépôt de données, la suite démarre sur les exemples d'`examples/`. Vous pouvez aussi demander une archive des données par mail.
- Un dossier synchronisé (Synology Drive, OneDrive…) convient, à condition d'**exclure les dossiers `.git`** de la synchronisation.
- Les fichiers de `data/` font foi : l'index du navigateur se reconstruit à partir d'eux (Maintenance › Caches › « Index des données »).

### Sauvegardes

- **Données du navigateur** : passez par ☰ › Données locales.
  - « Dossier de sauvegarde… » se choisit une fois, idéalement dans un dossier synchronisé.
  - Le fichier `defa_local_store.yaml` est ensuite écrit automatiquement.
  - « Restaurer / resynchroniser » fusionne ce fichier avec le navigateur : la donnée la plus récente l'emporte.
- **Sauvegarde totale** (navigateur et fichiers des dossiers autorisés) : Paramètres › Maintenance › Sauvegarde totale (voir plus haut).
- Ne versionnez pas `defa_local_store.yaml` : il contient des données personnelles.
- Mise à jour du code : Maintenance › Mises à jour, ou `python tools/update_suite.py update`. Une mise à jour du code ne touche pas aux données.
Pour aller plus loin : [Manuel d'exploitation](MANUEL_EXPLOITATION.md), § 2 et § 3 ; [Installation](INSTALL.md).
