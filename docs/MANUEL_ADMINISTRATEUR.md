# Manuel administrateur

Ce manuel décrit la suite SO Group Virtual (Virtual Special Operation Group) pour le **Centre** (planification et conduite des opérations) et pour les
**administrateurs** de la suite : un chapitre par page, une section par onglet, rubrique ou bloc, puis la
synchronisation des données et le lanceur. Dans la suite, l'entrée **« Aide »** de la barre latérale ouvre ce manuel
au chapitre de la page en cours (pages du Centre et des paramètres). Les pages des pilotes sont décrites dans le
[manuel utilisateur](MANUEL_UTILISATEUR.md) ; l'exploitation en détail (données, sauvegardes, dépannage, publication)
dans le [manuel d'exploitation](MANUEL_EXPLOITATION.md). Index de toute la documentation :
[index documentaire](README.md).

## Accès au Centre

Le Centre de planification et de conduite des opérations (CPCO) regroupe le générateur de mission, le studio cartographique, le registre des missions et le planning ODV. Il est réservé aux administrateurs de la suite.
Deux protections indépendantes s'y appliquent : le **verrou du Centre**, propre à chaque navigateur, et les **droits des utilisateurs** (rôles, mode develop ou production), communs à toute la compagnie.
Les réglages se trouvent dans ☰ › Paramètres, onglet « Centre ».

### Verrou du Centre

Le verrou masque le Centre tant qu'il n'a pas été activé dans ce navigateur.

- Centre verrouillé : les pages du Centre disparaissent du menu ☰, de la barre latérale (séparateur « Centre » et entrées « Missions », « Registre », « ODV ») et de l'accueil.
- Une page du Centre ouverte directement (favori, lien) est recouverte d'un avis « Accès réservé » avec les liens « Activer le Centre… » et « Accueil ».
- Dans Paramètres › Centre, seule la rubrique « Accès au Centre et réglages » reste visible ; les autres (« Utilisateurs et droits », « Catégories de disponibilité », « Planning ODV », « Envoi des comptes rendus (webservice) ») sont cachées.
- L'activation est mémorisée dans ce navigateur seulement : à refaire sur chaque poste et après un effacement des données du site.

Limite : c'est un verrou d'usage, pas une sécurité. Les pages restent des fichiers lisibles par qui a accès au dossier.

### Activer ou verrouiller le Centre

1. Ouvrez ☰ › Paramètres, onglet « Centre », rubrique « Accès au Centre et réglages ».
2. Saisissez le mot de passe dans « Mot de passe du Centre » (majuscules et minuscules indifférentes).
3. Cliquez « Activer le Centre » ou appuyez sur Entrée. La ligne d'état indique « Centre activé dans ce navigateur ».

Les entrées du Centre apparaissent aussitôt, sans recharger la page. La rubrique affiche alors les réglages « Calcul des routes de transit » :

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

## Générateur de mission
<!-- page: apps/cpco/mission_editor.html -->

Le générateur prépare le dossier d'une mission : identification, textes du brief, exercice, durée estimée, zones à activer, puis les PDF à remettre aux équipages. Il sert aussi à commander une mission à ChatGPT et à recevoir sa réponse.
Accès : barre latérale « Missions » (section « Centre ») ou ☰ › « Centre — Générateur de mission ». Depuis le registre, « Ouvrir dans le générateur » charge la mission choisie.
Voir aussi [missions SIA](SIA_MISSIONS.md) et [prompt du générateur](technique/PROMPT_GENERATEUR_MISSIONS.md).

### Onglets « Générateur de mission » et « Studio cartographique »

Les deux pages partagent un onglet en tête et travaillent sur **la même mission**.
- Passez d'un onglet à l'autre : la mission en cours part avec vous, modifications comprises.
- Toute modification est enregistrée dans ce navigateur et relue aussitôt par l'autre page ouverte (emprises, cartes ajoutées ou supprimées dans le studio, par exemple). Le générateur affiche alors « Mission mise à jour par le studio cartographique ».

L'en-tête propose aussi :
- « Créer le CR → » : ouvre un nouveau compte rendu de la famille correspondant au type de mission, pré-rempli avec la mission ;
- quand une opération compte plusieurs missions : ◀ et ▶ (« Mission précédente », « Mission suivante ») et une liste pour changer de mission du lot ;
- après une ouverture depuis le registre : « ← Registre (M-016) » pour y revenir.

### Mission

Ce bloc montre la mission chargée et réunit l'enregistrement et l'import.

| Bouton | Effet |
|---|---|
| « Nouvelle mission » | Vide le formulaire (date du jour) |
| « Commander à ChatGPT… » | Déplie le formulaire de commande (voir plus bas) |
| « Enregistrer dans le dossier » | Écrit le YAML modifié dans `data/missions/<lettre>_<FAMILLE>/<ID>/` ; l'ancienne version est remplacée, l'historique est gardé dans le YAML |
| « Mémoriser le brouillon » / « Recharger le brouillon » | Garde ou relit le texte de la mission dans ce navigateur (les images sont à resélectionner) |

Le volet « Importer une autre mission : fichiers, texte collé, commande ChatGPT » est ouvert quand aucune mission n'est chargée :
- « YAML et/ou Markdown » : sélectionnez ensemble `mission<ID>.yaml` et `summary<ID>.md`, ou cliquez « ou coller son contenu… » puis « Lire la mission » ;
- « Cartes ou ZIP livré par le générateur » : choisissez directement le ZIP du studio ; les PNG et la carte d'assemblage sont associés automatiquement ;
- « Commander une mission à ChatGPT » : même formulaire que le registre (type, sous-type, théâtre, série, équipes, aéronefs…). « Commander : copier le prompt et ouvrir ChatGPT » copie le prompt, ouvre ChatGPT dans un nouvel onglet et inscrit la commande au registre (« commandée »).

Une mission reçue est inscrite au registre et rangée dans son dossier si le dossier des missions est autorisé ; sinon, cliquez « Ranger dans le dossier des missions… ». Lien « Ouvrir le registre ↗ ».

### Opération

Bloc affiché seulement quand la mission appartient à une opération (`operation` dans le YAML).
- Chaque mission de l'opération est un bouton : identifiant, indicatif ou « Organisation », heure de décollage. Cliquez pour l'afficher. « non chargée » ou « à créer » signale une mission absente du lot.
- « Créer l'organisation de l'exercice » crée la mission …Z (brief général, heure H, participants, chiffons, chronologie), en reprenant les pistes et injects des missions de l'ancien format.
- Mission seule : une ligne discrète propose « Ajouter une organisation d'exercice… ».
- « Créer les missions des chiffons joués (n) » : chaque chiffon joué devient une mission de l'opération (base du premier équipage, route de la piste, décollage calculé). Vérifiez ensuite appareil, base et horaire, ouvrez chacune dans le studio, puis « Enregistrer dans le dossier ».

### Identification

| Champ | Contenu |
|---|---|
| « Titre » | Titre de la mission |
| « Famille » | Famille de mission (liste de l'ordre de mission) |
| « Sous-type » | Propositions selon la famille, saisie libre possible |
| « Identifiant » | Lettre de la famille, tiret, numéro sur 3 chiffres, puis lettre d'équipe (A, B…) ou Z pour l'organisation : M-016, S-002A, I-001Z |
| « Série de génération » | Lot de génération dans la famille (une commande ChatGPT = une série) |
| « Auteur », « Date du document » | Signature du dossier |

Le prochain identifiant libre et la série suivante s'affichent en gris dans les champs vides : ce sont des indications, pas des valeurs. Une alerte apparaît si l'identifiant ne commence pas par la lettre de la famille.
Changer l'identifiant d'une mission citée par d'autres (opération, cartes, textes) ouvre une confirmation : acceptez pour migrer tout le lot (l'ancien identifiant est gardé dans `mission.former_id`), refusez pour garder l'ancien.

### Durée estimée

Estimation du vol d'après la route probable et l'appareil ; recalculée à chaque modification. Masqué pour une mission d'organisation.
- « Transit » : « automatique (selon l'appareil et le niveau) », « voies aériennes (IFR) », « RTBA (basse hauteur) » ou « direct ». Le choix est écrit dans la mission.
- « Paramètres du calcul des routes (communs à toutes les missions) » : mêmes champs que Paramètres › Centre, avec « Valeurs par défaut ».
- Affichage : « Vol estimé », « Bloc », aller / sur zone / retour, distance ; options de retour et briefs successifs le cas échéant.
- Les **temps éprouvés** (CR des missions de même départ et mêmes points) remplacent le calcul quand ils existent.
- Un tableau compare l'estimation aux CR déjà faits de la mission (vol réel, écart).
- Case « Afficher la route probable » : croquis et tableau des tronçons.

Limite : sans base SIA dans le navigateur, les routes restent directes ; un avertissement invite à relire le dossier SIA.

### Zones à activer

Liste des zones R, D, TRA et du RTBA recoupées par la route probable et les zones de travail, avec gestionnaire, limites, mode d'activation et point de recoupement. Les zones P sont signalées « à éviter ».
- Mission d'organisation : zones de toutes les missions des équipages (demandes faites par l'organisation).
- Mission d'un exercice coordonné : liste pour information seulement.
- Mission seule : demandes à faire par l'équipage ; la liste est reprise dans le brief PDF.

Limite : calcul indicatif, qui ne remplace ni les cartes AZBA ni les NOTAM. Sans base SIA, le bloc indique où la lire (studio, bloc « Base de données SIA », ou Paramètres › Maintenance › Données aéronautiques).

### Exercice

Bloc affiché pour une mission d'exercice.

Sur la mission d'organisation (…Z), éditeur complet :
- « Heure H et participants » : « Heure H (libellé ou heure réelle) », puis une ligne par participant (« Indicatif », « Mission », « Décollage (H-20mn, H+1h) », « Rôle ») ; « + Participant », « Reprendre les missions de l'opération ».
- « Chiffons » : pistes à reconnaître, intercepter ou escorter (nom, « Joué », indicatif, départ, nature, points, niveau, vitesse, ce que les équipages doivent établir, consignes) ; « + Chiffon », « Importer un tableau Markdown de pistes ».
- « Chronologie » : un événement par carte (« Déclencheur » : heure ou passage d'un point ; « Forme » : message radio ou pli scellé ; « Émetteur », « Titre », « Destinataires », « Pistes révélées », texte) ; « + Message radio », « + Pli scellé », « Retirer cet événement ».
- « Ce que reçoit chacun » : résumé par destinataire.

Sur une mission d'équipage, le bloc s'intitule « Exercice : ce que reçoit cet équipage » et se lit seulement. La ligne « Cartes d'exercice » indique les cartes chargées ou à générer dans le studio.

### Textes de mission

« Summary » (résumé), « Description détaillée », puis des rubriques libres : « Ajouter une rubrique textuelle », chacune avec « Titre de rubrique », « Contenu » et « Supprimer ».
Si le fichier reçu n'a ni résumé ni description, ils sont proposés à partir des données : relisez-les.
Sur une mission d'organisation, le bloc devient « Brief général » : situation, objectifs communs, créneaux, critères de fin, remis à tous.

### Toutes les données YAML

Bloc masqué par défaut : cliquez « Afficher » dans son en-tête.
- Éditeur sans schéma imposé : chaque clé du YAML est modifiable, les champs inconnus sont conservés.
- Listes : « Ajouter un élément », × pour retirer un élément.
- « Nom d'un nouveau champ racine » puis « Ajouter » crée une clé de premier niveau.

À réserver aux corrections que les autres blocs ne permettent pas.

### Cartes du dossier final

Liste des cartes jointes au PDF, dans l'ordre du dossier : celles déclarées dans le YAML, la carte d'assemblage en tête, le profil vertical à la fin.
Chaque carte affiche son état : « prête pour le PDF » (dimensions en pixels) ou « image non chargée ».
Pour charger les images, utilisez le ZIP du studio dans le bloc Mission. Une mission ouverte depuis le registre lit directement les cartes rangées dans son dossier.

### Documents

| Groupe | Boutons |
|---|---|
| « Cette mission » (ou « Organisation de l'exercice ») | « Brief de l'équipage (PDF) » ou « Dossier organisation (PDF) », « Dossier organisation (PDF) » depuis une mission d'équipage, « Fiches des chiffons joués (un PDF chacun) » |
| « Toute l'opération » (lot de plusieurs missions) | « Tous les documents de l'exercice (un PDF par destinataire) », « Exporter tous les PDF », « Dossier d'opération (un PDF) » |
| « Données » | « Exporter YAML », « Exporter Markdown » |

Le brief de l'équipage contient ses plis scellés et les cartes ; la ligne d'état liste les cartes non jointes. Chargez les cartes avant d'exporter.

## Studio cartographique
<!-- page: apps/cpco/map_parser.html -->

Le studio produit les cartes du dossier de mission à partir des données du SIA (cycle AIRAC) : route, coupe verticale, cartes en PNG ou SVG, ZIP et carte d'assemblage.
Accès : onglet « Studio cartographique » du générateur, ☰ › « Centre — Studio cartographique », ou « Ouvrir dans le studio » dans le registre.
Il travaille sur la mission partagée avec le générateur. Détails techniques : [missions SIA](SIA_MISSIONS.md).

### Mission

- Ligne d'état de la mission chargée et bouton « Enregistrer dans le dossier » : écrit la mission et les réglages du studio (profil et cadrage de chaque carte, tracés, pistes) dans `mission<ID>.yaml`. Le résultat s'affiche à côté du bouton et en notification.
- Ligne « Base SIA » : cycle AIRAC, nombre d'espaces et de cellules MORA, lien vers Paramètres › Maintenance › Données aéronautiques.
- « Ouvrir une autre mission : fichier Markdown / YAML ou texte collé » (replié quand une mission est chargée) : choisissez un fichier, ou « ou coller son contenu… » puis « Lire la mission ».

La mission ouverte ici devient la mission partagée avec le générateur. Pour une mission d'exercice, les cartes d'exercice manquantes sont ajoutées d'office : enregistrez la mission pour les garder.

### Route

Plan de vol, carte de contrôle et coupe verticale liés : survolez un point dans l'un, il s'illumine dans les deux autres.
- Champ de route : case 15 du plan de vol OACI ou liste à virgules ; vide = route de la mission. « Syntaxe et utilisation » détaille les formats.
- « Niveau » : niveau de croisière (FL65 ou 6500).
- Liste « Voies aériennes » / « RTBA (basse hauteur) » puis « Chercher » : cherche une route entre les points et remplace le texte.
- « SimBrief » : reprend le dernier OFP (identifiant SimBrief : Paramètres › Mon profil › Identité et réseaux) ; « ↺ Route probable » : reprend la route probable, retour base compris.
- « Tracer » (coupe verticale), « Carburant » (ouvre le planificateur avec cette route), « Copier OACI » (plan de vol strict).
- « Points de la mission » : cliquez un point pour l'ajouter au cheminement.

Carte de contrôle : listes « Carte » et « Profil », case « ZIP », « Actualiser », « Garder ce cadrage » (la carte générée reprendra le cadre affiché), « Recentrer », « Cadrage automatique », « ⧉ Fenêtre » (fenêtre séparée synchronisée), « ⤢ Agrandir » (Échap pour revenir). Sur la carte : glissez un point, cliquez la route pour insérer, clic droit pour supprimer.
« Réglages du profil : coupe, appareil, vario, sorties » : plancher et plafond de la coupe, appareil, montée et descente, image `profil_vertical.png` dans les sorties, tracé par défaut du cheminement.

### Cartes à produire

« Cartes de la mission » : une ligne par carte.
- Clic sur le nom : affiche la carte dans la carte de contrôle (✎ = cadrage modifié).
- Profil d'affichage, ou « Désactivé » (carte ni générée, ni prévisualisée, ni sur l'assemblage).
- Tracé : « Sans tracé », « Brief : cheminement », « Organisation : route probable », « Cheminement + route probable ».
- Destinataire d'exercice (si l'exercice a des pistes) : sans pistes, organisation, un chiffon, ou un équipage après tel message ou pli.
- Case « ZIP » (décochée : carte non générée ; choix non enregistré dans la mission) et × pour supprimer.

Ajout : nom, type (« générale », « cible », « détail », « zone ») puis « + Carte » (emprise = vue affichée) ; « + Cartes d'exercice » ajoute les cartes de l'organisation, des chiffons joués ou de l'équipage.
« Réglages du profil … » (replié) : « Nom du profil », « Fond de carte », « Sauvegarder », « Nouveau », « Dupliquer », « Supprimer », puis quatre onglets : « Fond de carte », « Zones », « Symboles OACI », « Éléments ». Le profil modifié est toujours celui de la carte choisie ; les profils sont communs à toutes les missions et gardés dans ce navigateur.

### Aperçus et génération

- « Afficher toutes les cartes » : aperçus de toutes les cartes ; ils ne créent aucun fichier.
- « Générer les cartes et le ZIP » (aussi dans le pied de page) : produit chaque carte cochée « ZIP », la carte d'assemblage et, si l'option est cochée, le profil vertical, puis télécharge le ZIP.
- Les PNG sont rangés dans `cartes/` du dossier de la mission (visibles dans le registre). Sinon, utilisez « Ranger les cartes dans le dossier » dans le pied de page.
- Une carte en échec n'arrête pas les autres : le ZIP contient `rapport_generation.txt` et « Réessayer seule » relance la carte. « fond partiel » signale un fond de carte lent.
- Lot de plusieurs missions : « Générer les n missions » produit un seul ZIP, un dossier par mission, avec la carte de l'opération.

Type de sortie (PNG, SVG éditable) et largeur des PNG : menu ☰ › « Sorties des cartes ». La carte d'assemblage est toujours incluse ; elle s'affiche en bas du bloc.

### Base de données SIA

Bloc masqué par défaut : cliquez « Afficher » dans son en-tête.
- Dossier `data/sia`, mémorisé comme les autres dossiers de la suite.
- « Reconstruire la base aéronautique » après chaque mise à jour AIRAC ; « Annuler » interrompt sans changer la base mémorisée.
- « Purger le cache » efface la base gardée dans ce navigateur (à relire ensuite).
- La ligne d'état indique la base mémorisée (dossier, cycle AIRAC, date) ; « Fichiers analysés » liste les XML lus.

Si le dossier contient plusieurs cycles, seul le plus récent est lu ; les autres sont signalés, à archiver. C'est le même bloc que Paramètres › Maintenance › Données aéronautiques (« Reconstruire la base aéronautique »), qui lit les zones actives et leurs sources cochées.

## Registre des missions
<!-- page: apps/cpco/mission_registry.html -->

Le registre recense toutes les missions générées ou commandées, avec leur suivi par le Centre : statut, date de vol, notes, comptes rendus.
Il sert à choisir une mission, à l'ouvrir dans le générateur ou le studio, à l'affecter à des pilotes, à créer son CR et à commander de nouvelles missions.
Accès : barre latérale « Registre » (section « Centre ») ou ☰ › « Centre — Registre des missions ».

### Missions du registre

En tête : nombre de missions, répartition par statut et date de mise à jour.

| Bouton | Effet |
|---|---|
| « Dossier des missions : … » | Choisit le dossier `data/missions` puis le relit |
| « Relire le dossier » | Relit toutes les missions du dossier |
| « Ajouter des fichiers… » | Ajoute des `mission<ID>.yaml` / `summary<ID>.md` (tout navigateur) |
| « Écrire mission_registry.yaml » | Écrit le registre dans le dossier des missions |
| « Nettoyer le registre (n) » | Retire les missions « fichier absent » après relecture |

Le dossier est relu automatiquement à l'ouverture s'il est déjà autorisé.
Au nettoyage, le statut, les notes et la date de vol passent à la mission qui remplace une mission renumérotée.

### Choisir une mission

Filtres : « Type », « Sous-type », « Rendez-vous », « Équipes engagées » (min – max), « Type d'équipe / d'aéronef », « Ravitaillement en vol », « Théâtre », « Statut », « Recherche ». Ils sont mémorisés.
- « Tirer au sort (n) » choisit une mission parmi celles qui passent les filtres.
- « Effacer les filtres », « CSV » (export de la sélection).
- Tableau trié par colonne : Mission, Type, Titre, Équipes, RDV, AAR, Théâtre, Statut, « Durée est. », CR (nombre de vols), « Généré ». La barre sous le tableau règle sa hauteur (double-clic : hauteur par défaut).
- ✕ retire une mission du registre sans supprimer ses fichiers.

Cliquez une ligne pour ouvrir la fiche de la mission, décrite ci-dessous. Le lien `?mission=M-016` ouvre directement la fiche.

### Fiche de la mission

La fiche affiche le statut, l'itinéraire, les équipes et indicatifs, puis :
- pour une opération : ses membres (cliquez pour les afficher) ; « Ouvrir » charge toute l'opération dans le générateur ou le studio ;
- « Fichiers de la mission » : YAML, « Markdown (lisible) », « PDF (générateur) », « Modifier (générateur) », « Cartes (studio) », vignettes des cartes, versions précédentes et textes reçus ;
- état des cartes : « complète », « partielle : cartes à compléter » ou « partielle : cartes non générées (régénérables) » ;
- « Durée estimée » avec la comparaison aux CR.

Boutons : « Ouvrir dans le générateur », « Ouvrir dans le studio », « Affecter… » (sauf organisation …Z ; voir [affectation des missions](technique/AFFECTATION_MISSIONS.md)), « Créer le CR » ou « Nouveau CR (vol n) », et « Recopier le prompt » pour une mission commandée.

### Suivi du Centre : statut, date de vol, notes

Le cadre du bas de la fiche porte trois champs : « Statut », « Volée le », « Notes ».

| Statut | Quand |
|---|---|
| commandée | Commande passée à ChatGPT |
| générée | Fichiers reçus |
| planifiée | Mission ouverte dans le générateur ou le studio depuis le registre |
| volée | Date de vol saisie, ou CR créé depuis la fiche |
| CR fait | Un CR du registre des CR cite la mission (automatique) |
| abandonnée | Choix manuel |

Le suivi est écrit dans `suivi.yaml`, dans le dossier de la mission ; il est partagé avec les autres postes. Si deux postes modifient le même champ en même temps, votre saisie est gardée et une alerte le signale.

### Lien avec les comptes rendus

- La fiche liste « Comptes rendus de la mission (n) », du plus récent au plus ancien ; chaque lien ouvre son CR.
- « Créer le CR » ouvre un CR pré-rempli de la famille correspondante. Pour une mission déjà volée, « Nouveau CR (vol n) » prend le numéro de vol suivant (missions récurrentes).
- Dans le CR, sous le champ de la mission, le lien « voir la mission dans le registre ↗ » revient à la fiche, avec la durée estimée et l'écart du vol.
- Dès qu'un CR cite la mission, le statut passe à « CR fait », sauf si la mission est abandonnée.

### Commander une mission

Formulaire commun avec le générateur.
1. Réglez « Type », « Sous-type », « Théâtre » et « Second théâtre » (« Pays » pour l'étranger), « Série » (vide = la suivante).
2. Vérifiez « Identifiant » (calculé, en lecture seule).
3. Réglez « Équipes en vol », « Rendez-vous », « Équipes au sol », « Durée » (XS à XL), « Traductions », « Ravitaillement en vol ».
4. Sous « Aéronef de chaque équipe en vol », saisissez l'appareil des équipes A, B… (vide = automatique).
5. Cliquez « Commander : copier le prompt et ouvrir ChatGPT », collez dans ChatGPT (Ctrl+V) puis envoyez.

La mission apparaît au registre avec le statut « commandée ». Enregistrez ensuite les fichiers dans le dossier des missions puis « Relire le dossier » : la commande est rapprochée de la mission générée (même série). Les réglages sont mémorisés.

## Planning ODV
<!-- page: apps/cpco/odv_planning.html -->

La page Planning ODV réunit les disponibilités de la semaine, les créneaux communs, les missions probables et les affectations. Le Centre (CPCO) s'en sert pour planifier les missions et les confier aux pilotes libres.
Pour l'ouvrir : barre latérale › rubrique « Centre » › « ODV ». La page fait partie du Centre : tant que le Centre est verrouillé, un avis renvoie à Paramètres › Centre (voir le chapitre suivant). En mode production, il faut aussi être connecté avec le rôle `admin_centre`.
Le classeur Excel de l'escadrille est facultatif : sans lui, la semaine se construit à partir des disponibilités déclarées par les pilotes dans Mes missions et des affectations déjà enregistrées.
Chaque bloc peut être déplacé (poignée ↕) ou masqué (« Masquer » / « Afficher ») ; la disposition est mémorisée pour la page.

### Classeur ODV

Ce bloc charge le classeur hebdomadaire de l'escadrille (`.xlsx`). Il est **masqué par défaut** : cliquez sur « Afficher » dans son en-tête pour le faire apparaître.
- Choisissez le fichier, ou déposez-le sur le champ de fichier. Il est lu dans le navigateur, rien n'est envoyé sur le réseau.
- À l'arrivée sur la page, la suite rouvre seule le classeur `.xlsx` le plus récent du « Dossier du classeur ODV », s'il est autorisé (Paramètres › Installation › Sources et dossiers). Sinon, elle rouvre la copie du dernier classeur choisi, gardée dans ce navigateur.
- Choisi à la main, le classeur affiche directement sa propre semaine.
- Une fois le fichier lu, un résumé apparaît : « Fichier », « Semaine », « Officier de permanence », « Thème de la semaine », « Pilotes », « FLOTTE », « Frise horaire », « Lecture ». Le « Rapport de lecture (n) » liste les avertissements (⚠) et les remarques. Il est déplié s'il contient au moins un avertissement.
- Les anomalies (code hors légende, trigramme en double, date de la frise décalée…) sont signalées par des notifications flottantes, sans jamais bloquer la lecture.
- Si un pilote du classeur n'a pas encore de préférences de types de missions, la suite en crée d'après ses codes (C → chasse, T → transport…) et les écrit dans sa fiche utilisateur.
- « Effacer les données » vide la page. Le bouton reste grisé tant qu'aucun classeur n'est chargé.
- Le lien « Paramètres › Centre › Planning ODV » mène aux réglages des créneaux et de la lecture du classeur.
- Données personnelles : ne publiez pas les exports. Format du classeur et règles de lecture : [Planning ODV](ODV_PLANNING.md).

### Grille de disponibilité

La grille croise les pilotes avec les jours de la semaine et les trois créneaux de chaque jour (M = matin, A = après-midi, S = soir).
- **Choix de la semaine** : « ◀ Semaine précédente », « Semaine suivante ▶ », « Cette semaine », et « Semaine du classeur » quand un classeur d'une autre semaine est chargé. La source affichée est soit « classeur … », soit « déclarations des pilotes et affectations (pas de classeur pour cette semaine) ».
- **Filtres**, mémorisés dans ce navigateur : « Masquer les grilles vides », « Couleur du trigramme » (couleur de la forme dans le classeur), « Rôle (FLOTTE) » ou « Rôle (appareils déclarés) » sans classeur, « Simulateur ».
- **Légende** : codes du classeur avec leur nombre de cases, puis le bloc « Déclarations des pilotes », identique à celui de Mes missions.
- **Lecture d'une case** : le code du classeur vient en premier, puis la déclaration du pilote. Un encadré rouge signale un pilote disponible et non affecté. Un numéro de mission signale un pilote affecté.
- **Infobulles** : le commentaire de la case s'affiche au survol ; les rôles, les simulateurs et la ligne du classeur s'affichent au survol du trigramme.
- La colonne « Dispo » compte les créneaux disponibles du pilote, avec en petit le nombre de créneaux de contrôle (+n).
- **Clic sur une déclaration** : ouvre la fenêtre « Affecter les pilotes libres » du créneau, ce pilote en évidence (voir « Créneaux communs »).

#### Missions affectées cette semaine

Sous la grille, le tableau « Missions affectées cette semaine (n) » liste les affectations de la semaine affichée.

| Colonne | Contenu |
|---|---|
| Décollage | date et heure Z |
| Créneau | trois cases M / A / S, celle du créneau en surbrillance |
| Mission, Pilote, Indicatif, Appareil, Terrain | mission (numéro et titre), pilote (« à affecter » si personne), indicatif, type et immatriculation, terrain de départ |
| Rôle | « mission », « mission (convoyage dès …Z) » ou « convoyage pour … » |

Cliquez sur une ligne pour rouvrir l'affectation complète et la modifier. Il faut que le Centre soit activé et que la mission figure dans le registre de ce navigateur. Sinon, la fenêtre du créneau s'ouvre ou un avertissement s'affiche. Sans affectation, le message « Aucune mission affectée cette semaine. » s'affiche.

#### Planning heure par heure

Ce planning détaille une journée de la semaine.
- Les onglets en tête ne montrent que les jours qui ont des missions, avec leur nombre entre parenthèses. Par défaut, le planning s'ouvre sur aujourd'hui, ou sinon sur le prochain jour qui a des missions.
- Chaque ligne correspond à un pilote ; une ligne « à affecter » regroupe les postes encore sans pilote.
- Chaque mission forme un bloc coloré qui porte l'indicatif. Un convoyage est marqué « ⇢ ».
- En fond, les trois créneaux sont tracés ; un trait marque l'heure présente.
- Cliquez sur un bloc (ou appuyez sur Entrée) pour modifier l'affectation.
- Plus bas, « Journal des affectations (n) » se déplie et montre les 30 dernières opérations.

### Sessions ATC des réseaux

Ce bloc rassemble les trainings, examens, événements et réservations VATSIM / IVAO de la semaine affichée. Ils sont enregistrés dans le pool de données partagé (`data/atc/<année>-W<semaine>.json`).
- **Saisir une session** : renseignez le jour, le début et la fin (heures UTC, par pas de 15 min), la position (ex. `LFBO_APP`, `LFMN_TWR`), le réseau (VATSIM ou IVAO), le type (Training, Examen, Événement, Réservation) et un commentaire facultatif. Cliquez ensuite sur « Ajouter ».
- Les deux heures doivent tomber le même jour : la fin doit suivre le début.
- « Récupérer VATSIM (pays préféré) » importe les réservations VATSIM de la semaine. Les sessions déjà récupérées sont remplacées (annulations comprises) ; les saisies manuelles sont gardées. Seules les positions du pays préféré sont importées (Paramètres › Centre › Planning ODV ; France métropolitaine par défaut) ; le bouton porte son nom.
- « Récupérer IVAO (pays préféré) » importe de même les trainings, examens et réservations IVAO de la semaine, avec la clé d'API IVAO de l'installation (Paramètres › Installation). Ces deux boutons sont l'import commun au Tableau : un seul fichier, mêmes sessions sur les deux pages.
- Le bouton « × » d'une ligne retire la session. La colonne « Source » indique « récupérée » ou « saisie ». Le tableau montre d'abord les trainings, examens et événements (examen et training repérés en marge) ; les simples réservations de position, nombreuses une fois importées, sont repliées sous « n réservation(s) de position ».
- **Effet sur la planification** : une session est comptée dans son créneau (★). Un training ou un examen rend la CTR du terrain indisponible pour les missions de ce créneau ; les TMA qui contiennent le terrain sont à éviter si possible.

### Activations des zones par réseau

Ce bloc est celui du Tableau (voir « Activations des zones ») : activations RTBA, R, D, TRA… de la semaine affichée, VATSIM et IVAO côte à côte, mêmes données. Saisie réservée comme au Tableau (Centre activé ; en production, administrateur).

### Créneaux communs

Ce tableau couvre les 7 jours × 3 créneaux. Chaque case donne le nombre de **pilotes libres**, c'est-à-dire disponibles et pas encore affectés.
- Les marques de la case : « +n ctrl » (contrôleurs), « ✎ » (mission déjà affectée), « ★ » (événement ou session ATC). L'infobulle donne aussi l'effectif avant affectations.
- Filtres : « Au moins N pilote(s) », de 1 à 20, et « Simulateur commun » (« indifférent » ou un simulateur). Ils sont mémorisés avec les réglages ODV. Une case sous le seuil est atténuée.
- Pilotes pris en compte : codes O, SC, C, T, N, S ; contrôleurs : AT, AM. Une case vide n'est pas comptée.
- **Clic sur une case** : ouvre la fenêtre « … — affecter les pilotes libres ». Elle permet de modifier les missions déjà affectées sur le créneau ou d'en planifier d'autres.

#### Fenêtre « Affecter les pilotes libres »

Conditions d'ouverture : Centre activé, et registre des missions présent dans ce navigateur (sinon, ouvrez le registre du Centre et relisez le dossier des missions).
1. **La journée en trois blocs** (Matin, Après-midi, Soir) occupe le haut de la fenêtre. Chaque bloc donne ses heures, le nombre de pilotes libres et de missions, et « en cours » pour le créneau présent. Le créneau de la fenêtre est en surbrillance. Cliquer sur un autre bloc ouvre ce créneau ; s'il reste des choix non enregistrés, une confirmation est demandée. La fenêtre reste ouverte et passe à ce créneau.
2. Les pilotes libres sont listés avec les types d'appareils qu'ils ont déclarés (en gras : maîtrisés). Choisissez une « Famille » (« toutes » ; « (proposée) » signale la famille proposée pour le créneau). La ligne « À éviter : » rappelle les CTR et TMA fermées par une session ATC.
3. Dans la matrice, cochez une mission (colonne « Planifier »). Choisissez ensuite l'« Appareil » : la liste va du plus proche au plus lointain du départ et indique « sur place » ou la durée de convoyage. Choisissez enfin le « Pilote » : en tête viennent les pilotes « Libres jusqu'à la fin, avec l'appareil ».
4. Si l'appareil est basé ailleurs, une ligne « Convoyage » apparaît. Choisissez qui convoie (« par ») : un pilote libre, le pilote lui-même (la mission est alors décalée d'autant) ou « à affecter (mission de convoyage) ».
5. Au besoin, réglez l'heure de « décollage » (ou l'« heure H » d'une opération à plusieurs missions). « + équipier » ajoute un poste à une patrouille, avec l'indicatif suivant. « ✎ détail » ouvre le dialogue d'affectation complet ; son résultat revient dans la matrice.
6. Vérifiez la colonne « État » : pilote en double, appareil en double ou déjà engagé, pilote non libre sur toute la plage.
7. Cliquez sur « Enregistrer (n) ». « Annuler les modifications » revient à l'état d'ouverture ; « Fermer » demande confirmation s'il reste des choix en attente.

Sous la matrice :
- « Convoyages à affecter (n) » permet de confier un convoyage resté ouvert : choisissez le convoyeur, puis « Confier ».
- « En attente (n) » liste les choix pas encore enregistrés.
- « Enregistrées sur ce créneau » propose « Modifier… » pour chaque mission.

Limites :
- La fenêtre se ferme seule quand tous les pilotes libres sont affectés.
- Les missions déjà affectées (cette semaine ou avant) sont masquées.
- Un pilote ne reçoit qu'une mission par créneau.
- Pour enregistrer, le dossier des missions doit être autorisé (Paramètres › Installation › Sources et dossiers).
Règles détaillées : [affectation des missions](technique/AFFECTATION_MISSIONS.md).

### Missions probables

Ce bloc propose, pour chaque créneau qui atteint le seuil « Au moins N pilote(s) », les meilleures familles de missions jouables par les pilotes libres.

| Colonne | Contenu |
|---|---|
| Créneau | jour, date, M / A / S ; rang de la proposition en exposant |
| Famille | SAR, FIRE, HEMS, MARITIME, AAR, ISR, SPECIAL, AIRBORNE, AIRLIFT, TRAINING |
| Affectation proposée, + | pilotes et rôle tenu ; renforts possibles |
| Simulateurs communs, Score, Règle | simulateurs partagés ; score (calcul détaillé au survol) ; règle de la famille |
| Planifier (missions du registre) | « Planifier » ou « Modifier » : ouvre la fenêtre du créneau, filtrée sur la famille |

- Cliquez sur une ligne (en dehors du bouton) pour déplier son résumé : créneau, équipage proposé, renforts, règle, score, contexte (sessions ATC, contrôleurs, événements), simulateurs, missions déjà affectées. Le triangle ▸ fait de même ; une seule ligne est dépliée à la fois.
- « Règles des familles et du score » se déplie sous le tableau. Score = nombre de participants, + 2 par pilote à code restreint employé dans son domaine, + 1 par contrôleur en ligne pour TRAINING (2 au plus). Une famille souvent jouée recule un peu (selon le nombre de CR du registre) pour varier les missions.
- Le nombre de missions montrées par créneau et l'ordre de préférence à score égal se règlent dans Paramètres › Centre › Planning ODV.
- Le tableau se trie par colonne. Les rôles tirés de la feuille FLOTTE restent indicatifs : le planificateur valide.

### Export

Ce bloc enregistre des fichiers sur cet ordinateur. Ils contiennent des données nominatives : ne les publiez pas. Les boutons restent grisés tant qu'aucun classeur n'est chargé.

| Bouton | Résultat |
|---|---|
| « Grille (CSV) » | `<classeur>_grille.csv` : une ligne par pilote, jour et créneau |
| « Toutes les données (JSON) » | `<classeur>_planning.json` : réglages, pilotes, grille, événements, vols, créneaux, missions, anomalies |
| « Récapitulatif texte » | remplit la zone de texte : DISPO MATIN / APREM / SOIR par jour |
| « Copier » | copie ce texte dans le presse-papiers (par exemple pour Discord) ; actif une fois le récapitulatif produit |
| « Récapitulatif (.txt) » | `<classeur>_dispo.txt` |

Si le navigateur refuse la copie automatique, le texte est sélectionné : copiez-le avec Ctrl+C.

## Tableau
<!-- page: apps/cpco/odv_orders.html -->

La page Tableau construit l'ordre de vol de la semaine : plaquettes de vol, contrôle, divers et notes posés sur une frise horaire, avec les conflits de disponibilité et de zones.
Pour l'ouvrir : barre latérale › rubrique « Centre » › « Tableau ». Comme le reste du Centre, elle demande le Centre activé ; en mode production, il faut aussi être connecté avec le rôle `admin_centre`. Sinon, la page s'ouvre en lecture seule.
Tout est enregistré dans le pool de données partagé : l'ordre de la semaine dans `data/odv/<année>-W<semaine>.json`, les réglages dans `data/config/odv.json`. Les dispos restent celles des pilotes, l'équipage d'un vol de mission celui des affectations.
Les heures sont en z (UTC). Modèle de données : [Tableau](technique/ODV_ORDRES.md).

### Semaine

- « ◀ » et « ▶ » changent de semaine, « Cette semaine » revient à la semaine en cours.
- Les onglets des jours portent, en rouge, le nombre d'éléments en conflit du jour.
- « Jour », « Semaine » et « Statistiques » changent de vue.
- « Permanence » désigne l'officier de permanence de la semaine.
- « Briefing » (ou la touche F) passe l'ordre du jour en plein écran ; les flèches ← et → changent de jour.
- La ligne d'état indique « Enregistré », ou « Enregistré dans ce navigateur » si le dossier des données n'est pas autorisé.

### Ordre du jour

À gauche, la palette : modèles de vols, de contrôle et de divers, la note, puis les membres (Staff, puis Membres) avec la barre de leurs dispos du jour. À droite, la frise :
- traits pointillés : tranches matin, après-midi et soir du Planning ODV ; trait rouge : heure présente ; zones sombres : nuit aéronautique du terrain réglé ;
- « RTBA · LL » : créneaux d'activité du RTBA (activations saisies ou importées, sinon créneaux des réglages) ;
- « Zones » : zones requises par chaque vol (celles de sa mission, ou celles saisies pour un entraînement), en vert si actives sur le réseau du vol, en orange si demandées, en rouge sinon ;
- « ATC » : sessions ATC du jour dans le périmètre (pays réglé dans Paramètres › Centre › Planning ODV, au survol de l'étiquette) : trainings et examens en violet, événements en bleu, réservations estompées ; une session est encadrée en rouge quand elle gêne un vol de mission (son terrain de départ ou d'arrivée pendant le vol) ;
- « Dispos ensemble » : plages où au moins deux membres sont affectables à un vol ;
- sections « Vols », « Contrôle », « Divers », « Notes » : les éléments s'empilent d'eux-mêmes.

Manipulations :
- glissez un modèle sur sa section : l'élément est créé à l'heure du dépôt (par pas de 5 min) et sa fenêtre s'ouvre ;
- double-cliquez une carte de la palette pour la poser d'office : au créneau de synchro pour un autre équipage d'une mission à plusieurs équipages (décalage de l'exercice de l'opération par rapport à H, sinon heure de la patrouille liée déjà posée ; ravitailleur : 30 min avant le ravitaillement, ou avant la patrouille qu'il sert), sinon au premier créneau cohérent du jour (heures de service, pas avant l'heure présente, équipage affectable et libre, ou assez de membres disponibles ensemble) ;
- glissez un membre de la palette sur une plaquette pour l'y ajouter, ou un trigramme d'une plaquette à une autre pour l'y déplacer ;
- faites glisser une plaquette pour changer son heure, son bord droit pour changer sa durée ; un simple clic ouvre sa fenêtre ;
- dans la palette, « Réserve des vols » garde les plaquettes retirées de la frise (glissées sur la palette, ou « ↩ Réserve » dans leur fenêtre) et « Formations des missions » propose ce que les vols de mission posés appellent : patrouilles des autres missions de la formation, ravitailleurs qui les servent, chiffons de l'opération ;
- « Zoom » règle l'échelle de la frise.

Sur une plaquette : « ⚠ n » compte ses conflits, « P » signale qu'aucun équipier n'est disponible dans l'heure et demie qui précède le vol, « ↻ » une récurrence ; une barre verte (fait) ou orange (non fait) souligne l'état ; une plaquette annulée est barrée. Sous la frise, « Problèmes d'affectation » liste les conflits du jour : un clic montre la plaquette.

### Fenêtre d'un élément

- **Vol** : libellé, indicatif, mission du registre (vide : entraînement), réseau, début, durée, couleur, zones d'un entraînement, axe et offload d'un vol ravitailleur, ravitailleur et heure du ravitaillement, avions (pilote, navigateur, annulé ; huit au plus), tâches (une par ligne, « nom = TRI »), infos, état, motif, CR (ME, Bâché, MNE), partielle, causes de MNE.
- Un indicatif saisi propose la mission de l'affectation qui porte cet indicatif ce jour-là.
- « Mission du registre et équipe » : une ligne par équipe en vol de chaque mission (indicatif, appareil, rôle, famille, terrains, opération, durée estimée), triée par durée ; « ⚠ » et une notification signalent une durée estimée différente de la durée demandée (écart de plus de 15 min ou 15 %). « Entraînement (sans mission) » laisse la plaquette sans mission.
- « Ravitaillement » : une mission ravitailleur (celles de la même opération ou du même axe en tête), dont la plaquette est posée ce jour-là si elle n'y est pas déjà, ou un vol ravitailleur déjà posé ; l'heure du ravitaillement se règle à côté.
- **PTA** (principal training audience) : membres que l'élément entraîne en priorité, cochés dans le tableau des avions (vol) ou dans la liste PTA (contrôle, divers) ; ils sont entourés sur la plaquette. **Configuration** : configurations chargées sur l'avion (KNON = canon, TALIOS = pod…), proposées d'après les réglages. **DLO** (desired learning objectives) : objectifs de chaque membre sur l'élément, une ligne par membre « TRI = objectifs » ; « ◎ » sur le trigramme, objectifs au survol.
- **Avions** : deux places au départ (« + Ailier » en ajoute, huit au plus) ; pour chacune, l'appareil (type de la mission proposé ★, sans être imposé, ou un appareil de la flotte), le pilote et le navigateur. L'indicatif proposé est celui de la mission, sinon ceux de la table des indicatifs pour ce type ; il suit la mission si elle le change. **Ravitaillement** : choisissez l'axe, puis une mission ravitailleur de cet axe ; si sa plaquette n'est pas posée, elle rejoint la palette et le vol s'y accroche quand on la pose. La plaquette montre la mission (titre, famille, terrain), l'axe tenu par un ravitailleur et, pour un receveur, « ⛽ ravitailleur axe heure ».
- **Postes et appareils** (comme le Planning ODV) : pour un vol de mission, une ligne par poste de la mission (indicatif, type) ; l'équipier suivant prend l'indicatif suivant. La liste des appareils propose les appareils compatibles, sur place d'abord puis du plus proche au plus lointain (« convoyage x h xx ») ; ceux déjà pris pendant le vol sont grisés. Un appareil basé sur un autre terrain que le départ fait apparaître une plaquette de convoyage « ⇢ » (appareil, terrains, « à affecter »), qui arrive 30 min avant le décollage et suit le vol : glissez-y le convoyeur. **Astreinte** : préavis et fin, reportés dans l'ordre de mission. Le trait sous un trigramme signale sa qualification sur le type (vert : maîtrisé ; orange : possédé ou connu ; rouge : non) ; c'est un simple signal.
- **Choix d'une mission** : la liste se limite à l'indicatif ou au libellé saisi (« SAMU » → missions SAMU) ; une fois la mission choisie, la fenêtre de choix de l'ODV s'ouvre et ses lignes (postes, appareils, pilotes, indicatif, convoyeur) remplissent la plaquette ; les pilotes disponibles et qualifiés sur le type sont proposés en premier. La plaquette prend l'heure de décollage de l'affectation (avertissement en cas d'écart) ; « Ordre de mission de l'opération (n)… » enchaîne les ordres de mission des plaquettes de l'opération posées ce jour ; une plaquette reprise de la réserve ou des formations se pose à sa place de synchro. **Ravitaillement** : l'axe choisi limite la liste à ses ravitailleurs ; « Pas de mission spécifique » met dans la réserve un ravitailleur générique sur l'axe. Un convoyage déplacé à la main garde sa place (il suit le vol de l'écart si le vol bouge) ; s'il arrive moins de 30 min avant le décollage, il est signalé. Une dispo dont la catégorie n'ouvre pas la famille de la mission, et un examen ou un training ATC sur le terrain de départ ou d'arrivée pendant le vol, sont signalés. Sous la frise, « Journal des affectations » montre les 30 dernières opérations.
- **Affectations et ordres de mission** : une mission affectée ailleurs (Planning ODV, Registre) apparaît d'office en plaquette sur la frise, à son décollage, avec ses avions, ses pilotes, son astreinte et son convoyage. À l'inverse, un vol de mission qui a un équipage sans affectation est signalé « ordre de mission non émis » (le pilote ne voit rien dans Mes missions), et un équipage différent des affectations « ordre de mission à réémettre ». Déplacer la plaquette d'un vol qui a son ordre de mission (jour, heure, durée) le réémet d'office, sans fenêtre : mêmes pilotes, appareils, indicatifs et convoyeurs à la nouvelle heure ; un pli déjà ouvert redevient cacheté pour que le pilote voie le changement. En cas de conflit d'affectation (pilote, convoyeur ou appareil pris ailleurs) ou si le dossier des missions n'est pas autorisé, l'ordre n'est pas réémis : la plaquette le signale (« ordre de mission non réémis », avec la raison) et garde sa nouvelle heure ; « Ordre de mission… » reste le moyen de changer pilotes ou appareils.
- **Ordre de convoyage** : « Ordre de convoyage… » sur une plaquette de convoyage ouvre l'ordre de mission du vol servi, convoyage compris (heure et durée de la plaquette, même déplacée à la main) ; un convoyeur autre que le pilote de la mission, ou un convoyage à affecter, reçoit son ordre de convoyage dans Mes missions ; fait par le pilote de la mission, le convoyage est une ligne de son ordre de mission.
- Vol de mission : l'équipage vient des affectations de la mission ; « Ordre de mission… » ouvre la fenêtre d'affectation du Centre, préremplie avec les avions de la plaquette (pilote, immatriculation, indicatifs de la patrouille) : les affectations enregistrées sont l'ordre de mission que les pilotes reçoivent dans Mes missions (badge « OM » sur la plaquette). « Commander une mission… » ouvre la commande du générateur, préréglée d'après la plaquette (équipes, types d'appareils, durée, ravitaillement). Le CR de la mission fait foi : à l'ouverture de la semaine, état et CR en sont repris ; sans CR passé le délai réglé, le vol passe en MNE (cause « pas de CR »).
- **Contrôle**, **Divers** : libellé, position (contrôle), début, durée, couleur, état, motif, équipage (cases des membres), notes (divers).
- **Note** : texte libre.
- « Répéter » (chaque jour, chaque semaine, une semaine sur deux) et « Jusqu'au » posent l'élément sur les semaines suivantes à leur première ouverture, jamais avant sa date.
- « Supprimer » retire l'élément.

### Conflits

| Conflit | Signification |
|---|---|
| semaine non déclarée | le membre n'a pas déclaré ses dispos de la semaine |
| pas disponible sur toute la durée | aucune plage ne couvre tout l'élément |
| non affectable (catégorie) | une plage d'une catégorie qui n'ouvre pas ce genre d'élément recoupe l'élément |
| déjà pris à cette heure | le membre est sur un autre élément au même moment |
| deux fois sur l'élément | le même membre occupe deux places |
| zone non activée, demandée, interdite | zone requise sans activation « active » de son réseau sur toute la durée du vol, ou zone P |

Un vol demande une catégorie disponible ; un contrôle, une catégorie disponible ou « Contrôle SOG » ; un divers accepte aussi « Disponible au sol seulement ». Contrôle et vol hors SOG, DCS, indisponible et récupération ne sont jamais affectables.

### Semaine et statistiques

- **Semaine** : une ligne par membre, une case par jour avec la barre des dispos déclarées et le nombre d'éléments où il figure. Un clic sur une case ouvre ses plages du jour : catégorie, début, fin, et « Récup à partir de », qui pose une récupération jusqu'à minuit. Les plages sont écrites dans la déclaration du pilote.
- **DLO et butées** : objectifs permanents de chaque membre (« ＋ » pour en ajouter, clic pour modifier), avec une butée facultative (date limite : rouge à 3 jours ouvrés ou moins, jaune à 10 ou moins) ; une DLO est fermée d'office par un vol fait qui la contient (DLO de l'élément, libellé, mission) avec le membre dans l'équipage. La palette montre « ◎n » DLO en cours par membre, et la fenêtre d'un élément rappelle celles de l'équipage.
- « Modifications de dispo » liste les déclarations modifiées depuis leur dernière prise en compte ; « Pris en compte » et « Tout prendre en compte » les marquent dans ce navigateur.
- **Statistiques** : vols prévus, durée cumulée, faits, non faits, annulés, AAR, ME, Bâchés, MNE ; par membre : temps disponible sur les heures de service, temps de vol, charge (orange au-delà de 70 %, rouge au-delà de 100 % ou sans dispo).

### Activations des zones

Ce bloc saisit les activations de zones de la semaine (`data/atc/activations/<année>-W<semaine>.json`), en deux colonnes côte à côte, VATSIM et IVAO : jour, zone, état (active, demandée, refusée), début, fin, remarque, réseau. Une activation « les deux réseaux » paraît dans les deux colonnes ; changer son réseau la déplace. VATSIM ne publie pas d'activations : sa colonne se saisit à la main. Dans la colonne IVAO, « Importer d'IVAO » reprend les horaires publiés par IVAO (clé d'API de l'installation), repliés sous la liste, ainsi que les trainings, examens et réservations IVAO de la semaine (sessions ATC) ; les saisies à la main restent. Les sessions IVAO s'importent aussi d'elles-mêmes à l'ouverture d'une semaine, au plus une fois par heure, si la page peut écrire. Une modification recalcule aussitôt les zones des vols. Le Planning ODV montre le même bloc, sur les mêmes données.

### Demandes de réservation

Ce bloc liste les zones que traversent les vols de mission de la semaine (route prévue et zones de travail de la mission, zones saisies d'un entraînement) sans activation « active » de leur réseau : jour, zone, réseau, créneau, vols, état. « Inscrire comme demandée » (ou « Tout inscrire comme demandé ») les ajoute aux activations communes ; la demande elle-même se fait sur le site du réseau (« Copier la liste », lien vers les demandes d'activation IVAO). Une zone P est signalée « à éviter ». À l'ouverture d'une semaine, la page importe d'office les sessions ATC IVAO (trainings, examens, réservations), au plus une fois par heure, avec l'import commun au Planning ODV.

## Paramètres › Centre
<!-- page: apps/settings/centre.html -->

Cette page regroupe les réglages courants du Centre : accès, utilisateurs, catégories de disponibilité, planning ODV et envoi des comptes rendus. Elle s'adresse aux administrateurs du Centre.
Pour l'ouvrir : barre latérale › « Paramètres », puis l'onglet « Centre ». Les rubriques s'affichent dans le menu latéral, groupe « Centre (CPCO) ».
Tant que le Centre est verrouillé, seule la rubrique d'accès est visible. En mode production, la page demande en plus une connexion `admin_centre`.

### Accès au Centre et réglages

Cette rubrique active le Centre dans ce navigateur : générateur de mission, studio cartographique, registre et planning ODV.
1. Saisissez le « Mot de passe du Centre » (sans tenir compte des majuscules).
2. Cliquez sur « Activer le Centre » ou appuyez sur Entrée. Le message « Centre activé dans ce navigateur » confirme l'activation.

Une fois le Centre activé, la rubrique affiche « Calcul des routes de transit » :

| Champ | Rôle |
|---|---|
| Tronçon routé à partir de (NM) | distance au-delà de laquelle un tronçon est routé |
| Voies aériennes à partir de (ft) | altitude à partir de laquelle les voies aériennes sont utilisées |
| Basse hauteur jusqu'à (ft) | plafond du vol en basse hauteur |
| Entrée / sortie des voies (NM), Entrée / sortie du RTBA (NM) | distance maximale pour rejoindre les voies ou le RTBA |
| Détour admis, voies (%), Détour admis, RTBA (%) | détour toléré |

Un champ vide reprend la valeur par défaut, affichée en grisé. Boutons : « Enregistrer », « Valeurs par défaut », « Verrouiller le Centre ». Ces réglages restent dans ce navigateur.

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

### Planning ODV

Cette rubrique contient les réglages propres à la compagnie pour la page Planning ODV. Ils sont gardés dans ce navigateur et ne sont pas synchronisés. Une page ODV ouverte dans un autre onglet les applique aussitôt.

| Réglage | Défaut |
|---|---|
| Créneaux (heures z) : Matin, Après-midi, Soir | 8 à 12, 12 à 18, 18 à 23 (par demi-heure ; la fin doit suivre le début) |
| Pays préféré (périmètre ATC) | « France métropolitaine » ; sessions ATC (trainings, examens, réservations) importées et montrées pour ce pays seul, Planning ODV et le Tableau (indicatifs OACI du pays : LF hors LFV pour la France) |
| Dates de la semaine | « Semaine ISO (n° de semaine du fichier) » ; sinon « Date saisie sur la frise » |
| Case vide | « Non renseignée » (jamais comptée disponible) ; sinon « Indisponible » |
| Types FLOTTE retenus pour les rôles | « Tous sauf les rouges (non maîtrisés) » ; « Verts seuls » ; « Tous » |
| Missions montrées par créneau | 3 (de 1 à 10) |
| Ordre de préférence à score égal | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (familles inconnues ignorées, avec un avertissement) |
| Code restreint (SC, C, T, N) : rôles de son domaine seulement | coché |
| Ignorer une ligne de groupe colorée les 7 jours sur un créneau (habillage) | coché |

Chaque modification est enregistrée aussitôt. « Réglages par défaut » rétablit toutes les valeurs ci-dessus.

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

Cette page regroupe les réglages faits une seule fois : premier lancement, dossiers locaux, sources externes et compagnie virtuelle.
Pour l'ouvrir : barre latérale › « Paramètres », puis l'onglet « Installation ».
Le menu latéral comporte deux groupes. Le groupe « Installation » contient « Premier lancement » ; le groupe « Dossiers et sources » contient « Sources et dossiers », « Données aéronautiques » et « Types d’aéronefs ».
Ces rubriques sont attribuées à la page par `config/repository_tree` (clé `settings.sections` : `setup` et `sources` → installation ; `sia` et `types` → installation,maintenance, c'est-à-dire sur les deux pages : la mise en place ici, la mise à jour dans Maintenance, mêmes blocs). Toutes les autres rubriques de maintenance s'ouvrent sur la page Maintenance.

### Premier lancement

Cette rubrique indique si le premier lancement est terminé dans ce navigateur, et à quelle date.
- « Ouvrir le premier lancement » rouvre l'assistant (`premier_lancement.html?force`), aussi accessible par l'onglet « Premier lancement » de Paramètres et par la carte de l'accueil tant qu'il reste quelque chose à régler. En tête, « Où en est la suite » fait le bilan ; puis six étapes :
  1. Dossiers : « Choisir le dossier de l'application », puis le classeur ODV, facultatif (« Dossier OneDrive… » ou « ou le fichier Excel… »).
  2. Données : « Récupérer les données » (clone du dépôt de données) ou « Archive des données… » ; dépôt git de synchronisation (facultatif) ; en option, « Journal (.html)… ».
  3. Compagnie : nom, sigle, nom long, site de la compagnie ; clé d'API IVAO de l'installation (facultative, gardée par le lanceur) ; « Enregistrer la compagnie ».
  4. Profil et identifiants : trigramme, IVAO, VATSIM, SimBrief, identifiants du site de la compagnie ; « Enregistrer le profil ».
  5. Données aéronautiques et types d’aéronefs : les blocs « Données aéronautiques » et « Types d’aéronefs » (les mêmes qu'ici).
  6. Centre (administrateurs) : « Activer le Centre », puis flotte et journal du site (« Mettre à jour maintenant »), missions du registre et liens vers les réglages du SO Group (Paramètres › Centre) ; enfin « Terminer ».
- « Sources et dossiers, compagnie virtuelle » ouvre la rubrique suivante.
- « Canal de mise à jour » ouvre Maintenance › Mises à jour.
- Pour repartir de zéro : « Nettoyer et recommencer… », en bas du premier lancement. Cela efface les réglages de ce navigateur, pas les fichiers.
Voir [Installation](INSTALL.md), § 1.

### Sources et dossiers

Cette rubrique est le seul endroit où régler les dossiers locaux et les adresses des sources externes.
- **Premier lancement** (arrivée depuis le lanceur) : un encadré demande de choisir la première ligne, « Dossier du dépôt ». Les autres dossiers en sont déduits.
- **Dossiers locaux** : chaque ligne a son bouton de choix et un état (« non choisi », « autorisé », « à ré-autoriser »). Un contrôle signale un dossier qui ne semble pas être le bon (fichier repère absent). Le navigateur mémorise l'autorisation, mais peut demander de la confirmer après un redémarrage.
- **Alerte de dossier** : si la suite ne peut pas vérifier que le dossier des données autorisé est celui de la suite servie, une alerte le signale une fois (lecture et écriture se font alors dans ce dossier) ; si un enregistrement reste dans le navigateur faute de pouvoir l'écrire, l'alerte en donne la raison réelle.

| Dossier | Contenu attendu |
|---|---|
| Dossier du dépôt | racine de l'application (contient `lancer.cmd`, `config/repository_tree`) |
| Dossier des données | `data/` (contient `data_tree.js`) |
| Dossier du registre, Dossier des missions, Dossier SIA XML | `data/cr`, `data/missions`, `data/sia` (déduits du dossier des données) |
| Dossier du classeur ODV | dossier synchronisé (OneDrive…) où l'escadrille dépose le `.xlsx` |
| Dossier X-Plane (atterrissages), Dossier performances, Dossier de sauvegarde locale | journaux CSV, profils `.lnmperf` / `.json`, `defa_local_store.yaml` |

- **Sources externes** : l'adresse par défaut s'affiche en grisé. Une valeur saisie ne vaut que pour ce navigateur ; « ↺ » revient à la valeur par défaut et « Ouvrir ↗ » ouvre l'adresse.
- **Clés d'API (services externes)** : clés de la suite, communes à tous ses utilisateurs (IVAO : clé d'API pour les activations de zones et les sessions ATC — trainings, examens, réservations — du Planning ODV et des ordres de vols). « Enregistrer » les confie au lanceur (`secrets/` à la racine de l'application, exclu de git, hors des données et des sauvegardes) ; la page n'en voit que l'état et les 4 derniers caractères ; « Effacer » la retire.
- **Compagnie virtuelle** : « Nom », « Nom long », « Sigle », « Centre (sigle) », « Centre (nom complet) », et les pages du site (« Page d'accueil », « Log des vols », « Flotte », « Fiche d'un appareil »). Un champ vide garde la valeur par défaut. « Revenir à SO Group Virtual » efface tous ces réglages.
- **Premier lancement** : « Rouvrir le premier lancement » ; « Nettoyer et recommencer… » efface les dossiers mémorisés, la copie du classeur ODV, les identifiants du site de la compagnie et le profil. Les fichiers sur le disque ne sont pas touchés.

## Paramètres › Maintenance
<!-- page: apps/settings/maintenance.html -->

Cette page sert à l'entretien de la suite : mises à jour, versions, données SIA, caches, sauvegardes et bases de référence.
Pour l'ouvrir : barre latérale › « Paramètres », puis l'onglet « Maintenance ». La page s'ouvre sur « Mises à jour ».
Le menu latéral comporte deux parties :
- le groupe « Maintenance » : Mises à jour, Versions et synchros, Références et dépendances, Données aéronautiques, Caches, Espace disque, Sauvegarde totale, Journal ;
- les bases de données, rangées dans les groupes « Fichiers du dépôt », « Base », « Missions » et « Données du navigateur ».

### Mises à jour de la suite

Ce bloc règle d'où viennent les mises à jour du code et quand la suite les cherche.
- **Canal** : `master` (stable, versions publiées) ou `develop` (early bird, dernières évolutions avant publication).
- **Mode** : « Manuel » (bouton « Vérifier maintenant ») ; « Automatique, régulièrement », à chaque ouverture, tous les jours, toutes les semaines, à chaque cycle AIRAC ou tous les mois ; « Désactivée » (aucun contrôle, aucune pastille).
- Le contrôle interroge framagit. Quand une nouveauté existe, une pastille « Mise à jour » s'affiche dans l'en-tête de toutes les pages.
- **Appliquer la mise à jour** : une page web ne peut pas réécrire le dépôt. Copiez les commandes (bouton « Copier ») et lancez-les dans un terminal, à la racine : `python tools/update_suite.py channel <canal>` puis `python tools/update_suite.py update`. Pour un diagnostic : `python tools/update_suite.py doctor`.
- `update` refuse de s'exécuter si des fichiers suivis sont modifiés, n'avance qu'en fast-forward et trace chaque opération.
- **Dépôt git local** : choisissez le « Dossier du dépôt », puis « Lire l'état git ». Le tableau affiche la branche, HEAD, origin, le suivi, master / develop, le dernier fetch et le canal mémorisé par git. Un écart avec le canal choisi est signalé.
- Une installation par archive ZIP n'a pas de `.git` : on la met à jour avec une nouvelle archive.

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

**Carte des zones** : une zone par pays (la France regroupe la métropole et l'outre-mer, couverture du SIA). La survoler affiche ses sources dans le panneau de droite ; un clic l'épingle : le panneau reste sur elle, le temps de l'activer (« Activer la zone ») et de régler ses sources. Nouveau clic sur la zone, Échap ou « 📌 Libérer » la relâchent. À la première activation d'une zone, la suite enchaîne seule tout ce qu'elle peut faire : téléchargements de ses sources, derniers ZIP de Téléchargements (SIA, NATS…), reconstruction de la base, MORA de la zone (double jauge : étape et détail) ; « Tout récupérer et recalculer », dans le panneau d'une zone active, relance cette mise en place. Ce qui reste à faire à la main (commande sur le site du SIA, PDF à importer, dossier d'X-Plane…) est listé sous la carte, « Actions à faire » : une ligne par source des zones actives, avec son lien et son bouton.
- Couleurs : contour seul = inactive, sans données ; gris = inactive, avec des données ; orange = active, données incomplètes ; vert = active, toutes les données des sources cochées ; bleu = zone survolée.
- Chaque source se coche ou se décoche pour sa zone ; seules les sources cochées des zones actives entrent dans la base. Une source « lien » (PDF ou site de consultation) n'est pas lue par la suite.
- Selon la source, le panneau propose :
  - un téléchargement direct par le lanceur (`tools/aero_fetch.py`) : openAIP (chaque pays), ENAIRE (Espagne), FAA (États-Unis : zones et routes militaires, classes d'espace), AIP militaire britannique (ENR 5.2, PDF officiel lu par le lanceur : zones de vol à basse altitude, VATA, zone d'évitement TVAA, axes de ravitaillement AARA ajoutés à ceux de la DIRCAM), NAV CANADA (Designated Airspace Handbook, édition en vigueur lue par le lanceur : zones dangereuses, réglementées et consultatives du Canada, à retélécharger tous les 56 jours) ;
  - une commande ou une inscription, avec le lien et le mode d'emploi : SIA France (commande à 0 €, à refaire à chaque cycle), NATS (Royaume-Uni, fichier déposé dans `data/sia/zones/gb/`) ;
  - un PDF, avec le lien et le mode d'emploi : DIRCAM / MILAIP ENR 5.7 (axes de ravitaillement) ;
    DIRCAM : « Importer le PDF MILAIP… » lit le PDF de la section ENR 5.7 (pdf.js, réseau au premier import), montre le nombre d'axes et les anomalies relevées, puis « Écrire miam-enr-5-7-tracks.xml » range le fichier dans le dossier SIA (ancien dans `_archives/`) et met la base à jour ;
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
- fichiers téléchargés : « ancien » au-delà de 28 jours (un cycle AIRAC).

**MORA** : plusieurs sources.
- La grille calculée (`data/sia/mora.csv`) a la priorité. « Recalcul simple » reprend les obstacles du nouveau cycle (hors ligne) ; « Calcul complet » refait relief et sommets (réseau, environ une minute) pour les théâtres et les missions ; « Calculer la MORA de la zone » (panneau) le fait sur l'emprise d'une zone, les autres cases étant gardées.
- Si des cases changent : « Écrire mora.csv (ancien archivé) », puis committez le dépôt de données.
- Ailleurs, la grille MORA d'X-Plane complète, si la source X-Plane est cochée.

**Cohérence** : « Contrôler » vérifie espaces, appareils, flotte, performances et terrains des missions.
Les XML AIRAC (environ 80 Mo par cycle) restent hors dépôt, comme les fichiers des autres sources. Les valeurs MORA sont calculées, pas certifiées.

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
- Volontairement hors sauvegarde : clef du webservice, suivi réseau en cours, base SIA analysée, autorisations de dossiers.

### Journal des sauvegardes et rechargements

Ce tableau trace chaque opération sur les données, avec la date, l'opération (et la page), l'origine et le résultat. Le détail des clés ajoutées (+) ou modifiées (~) se déplie.
Opérations tracées :
- rechargement des données locales (☰ › Données locales › Restaurer) ;
- sauvegarde totale et restauration d'une sauvegarde totale ;
- extraction de l'export SIA et archivage des anciens cycles ;
- recalcul MORA.
Tant qu'aucune de ces opérations n'a eu lieu, le journal est vide.

### Flotte (appareils connus)

Cette base (`data/references/aircraft_fleet.js`) liste les appareils proposés dans les CR : « Opérateur », « Type OACI », « Variante », « Immatriculation », « Code », « Numéro », « Indicatifs » (séparés par des virgules), « Base », « Opérationnel ».
- **« Coller la page Flotte du site… »** :
  1. ouvrez la page « Flotte virtuelle » du site de la compagnie (lien dans la fenêtre) ;
  2. faites Ctrl+A puis Ctrl+C, et collez dans la zone (Ctrl+V) ; vous pouvez aussi utiliser « Lire le presse-papiers » ou « ou page enregistrée… » ;
  3. cliquez sur « Lire ».
- Un appareil de la page remplace celui du fichier (même immatriculation) mais garde ses indicatifs supplémentaires. Les appareils absents de la page sont conservés.
- La ligne d'état donne le nombre d'appareils mis à jour, ajoutés et conservés. Vérifiez, puis « Enregistrer dans le dépôt ».
- **Boutons communs aux bases du dépôt** : « Appliquer dans ce navigateur » (modifications locales prioritaires), « Enregistrer dans le dépôt » (écrit le fichier dans le Dossier du dépôt, à committer), « Télécharger », « Annuler les modifications », « Revenir au fichier du dépôt ».
- **Automatique** : le lanceur lit lui-même les pages publiques Flotte et Log des vols du site (sans connexion), une fois par jour à l'ouverture d'une page, avec les mêmes règles que le collage ; il écrit `data/references/aircraft_fleet.js` et `defa_reference.js`, à envoyer par « Synchroniser ». Réglage et « Mettre à jour maintenant » : sous la liste des appareils du reporting (ci-dessous). Le collage et le script (`python AircraftDB/update_fleet.py Flotte.html`) restent possibles.
- **Où** : Paramètres › Centre › « Flotte (appareils connus) », réservée tant que le Centre est verrouillé (auparavant dans Maintenance).
- **Appareils du reporting** : sous la flotte, tous les appareils qui volent dans le journal des missions (type, indicatifs, exploitant, vols, dernier vol). Case « personnel », cochée par défaut : appareil individuel, hors de la flotte du SOG ; la décocher l'ajoute à la flotte (il devient affectable), la recocher l'en retire. Puis « Enregistrer dans le dépôt » : la flotte et l'index des appareils individuels (`data/references/aircraft_personal.js`) sont écrits ensemble. Un appareil de la page Flotte du site revient dans la flotte à la mise à jour suivante.
- **Types et performances** : « Rafraîchir types et performances » complète les types inconnus de la base (flotte et reporting) ; la mise à jour quotidienne depuis le site le fait aussi, en tâche de fond, pour la flotte, le journal et les appareils individuels.
- **Terrain (base) d'un appareil** : il ne change que par la mise à jour depuis le site, ou par un CR issu d'un ordre de mission avec un vrai terrain d'atterrissage ; un CR hors ordre de mission ou un landing report ne déplace pas l'appareil. Un appareil ajouté depuis le reporting entre sans terrain. Le terrain actuel est la colonne « Emplacement » de la page Flotte du site (gardée avec la date de son dernier changement), sauf si un CR issu d'un ordre de mission, plus récent, donne un terrain d'atterrissage réel (`missions/aircraft_positions.json`) ; les convoyages partent de là (affectation, Planning ODV, Tableau, fiche appareil).

### Types d'aéronefs (base OACI)

Cette base (`AircraftDB/aircraft_db.js`) contient deux tableaux :
- « Types » : « Désignateur », « Modèle », « Description OACI », « WTC », « Aile », « Source » ;
- « Alias (nom courant → désignateur) ».
Les modifications sont aussi reportées dans `aircraft_overrides.json`. Les boutons sont ceux des bases du dépôt.
Le « Mode opératoire » donne les commandes du script de rafraîchissement, à lancer depuis `AircraftDB` : `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. La base n'est pas publiée avec la suite (données de l'OACI et d'EUROCONTROL) : la carte « Types d'aéronefs et performances » de Paramètres › Maintenance › Références et dépendances la complète sur ce poste, type par type, sans jamais tout reprendre — un code saisi (« Ajouter / mettre à jour »), les types inconnus, ceux de la flotte ou ceux des missions (ODV, registre) ; il faut le lanceur et le réseau, puis recharger la page (bouton proposé à la fin). La carte est en tête du bloc ; base vide, elle est encadrée, une notification le signale et « Compléter la base » reprend d'un clic les types de la flotte et des missions. Les fichiers écrits (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) n'appellent rien : les pages les lisent ; non versionnés, ils se complètent sur chaque poste ou se recopient d'un poste à l'autre.
Limite : un type supprimé ici peut revenir au prochain rafraîchissement, s'il fait partie de la liste de base du script.

### Correspondance des indicatifs

Cette base (`data/references/callsigns.js`) relie l'indicatif complet (conservé dans les CR) à sa forme plan de vol (case 7) et à l'exploitant OACI (OPR/, case 18).
- Tableau « Indicatifs » : « Indicatif complet », « Plan de vol », « Autres formes », « Organisme », « OPR/ », « Types », « Fonction », « Générique », « Radiotéléphonie », « Note ».
- Tableau « Organismes → désignateur OACI (OPR/) ».
- Il n'existe pas de script : cette page (ou le fichier, édité à la main) est la source.
- Pour l'alimenter : les formes corrigées dans les CR arrivent dans « Indicatifs appris », et les séries vues dans le journal arrivent par « Ajouter » ou « Compléter ».

### Référence (anonymisée, dans le dépôt)

Cette base (`data/references/defa_reference.js`) recense les pilotes (trigrammes) et les appareils de la compagnie, sans les vols ni les missions. Elle sert d'aide à la saisie et n'est pas exhaustive.
- Tableau « Appareils » : immatriculation, type, variante, statut, rattachement (modifiable), dernier AD connu, mise en service, indicatifs utilisés, premier et dernier vol, vols, fiche flotte, note.
- Tableau « Pilotes » : trigramme, premier et dernier vol, vols, types, note.
- Mise à jour :
  1. chargez le journal des vols (rubrique suivante) ;
  2. cliquez sur « Mettre à jour la référence (anonymisée) » : rien n'est supprimé, et les saisies manuelles sont gardées ;
  3. « Enregistrer dans le dépôt », puis committez.
- Alternative par script : `tools/defa_reference.py`.

### Journal des vols (vols réalisés)

Cette base est distincte du registre des missions. Elle n'est gardée que dans ce navigateur : hors dépôt et hors sauvegarde locale, car elle contient des trigrammes.
- « Charger / mettre à jour le journal… » accepte la page « Log des vols » copiée ou enregistrée, ou un export CSV / JSON. Les vols sont fusionnés sans doublon.
- « Séries d'indicatifs » : « Ajouter » crée la ligne dans la correspondance des indicatifs ; « Compléter » y ajoute les formes et les types vus.
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
- (n) additionne les modifications de ce poste à envoyer et les commits à recevoir. Le dépôt distant est relu toutes les 5 minutes tant que la page est visible. L'infobulle donne la branche et la date de la dernière synchronisation.
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

- Chaque poste **reçoit** à chaque lancement (le lanceur fait un `git pull` de `data/`) et **envoie** avec le bouton
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
  2. **Données** : si `data/` est présent, il est mis à jour (`git pull --ff-only`, sans bloquer en cas d'échec). Sinon, une archive `.zip` déposée à côté du lanceur est extraite ; à défaut, le dépôt de données est cloné.
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
Pour aller plus loin : [Manuel d'exploitation](MANUEL_EXPLOITATION.md), § 2 et § 3 ; [Installation](INSTALL.md) ; [données de la suite](DONNEES.md).
