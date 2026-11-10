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
10 minutes en ligne et au retour du réseau. La carte se montre dès qu'un échange est coché ou que quelque chose attend. Dessous, une ligne dit ce qui vient de partir (« Parti à 18:04 : Fiches d’appareils : 2 · Missions : 1 », avec « dont 1 refusé(s) » s’il y en a) ; dépliée, elle donne les fichiers un à un par leur titre lisible, les refus d’abord avec la raison que le transport a donnée, sept au plus. C’est la dernière synchronisation qui a envoyé quelque chose : un passage à vide la laisse telle quelle, et rien n’est dit avant le premier envoi. Sur un poste avec lanceur, deux lignes disent **combien de temps a pris la synchronisation** : la dernière et **la plus longue d’aujourd’hui** (gardée sur cet appareil), en secondes, étape par étape (mise au net, commit, réception, envoi…), avec le nombre de commandes git et ce qui est parti (« 8 s — commit 1 s · réception 2 s · envoi 4 s · 12 commandes git (1 s) · 38 Ko envoyés ») ; un passage plus court ne remplace pas la plus longue, un autre jour l’efface.

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
data/ » et « Les clés d'API de la compagnie ») ; la feuille de route (`#roadmap`, qui s'ouvre sur « Priorités » : trois colonnes, En intégration, En développement, Backlog, où glisser les cartes ; « Par thème » les montre par voie) ; la recette (`#recette`) : un test fonctionnel par fiche livrée, avec « Validé », « Refusé » et un commentaire (obligatoire pour un refus), écrits par le lanceur dans `organisation/RECETTE.json` ; un défaut déjà connu est dit « en cours, ne pas retester » ; et le diagnostic de la carte « À propos ».

**L'assistant de l'administrateur.** Le bouton « Assistant de l'administrateur » (carte « Administration », ou l'adresse `#settings?card=assistant`) prend l'administrateur par la main : six étapes, dans l'ordre, chacune avec son état lu sur l'installation (fait, à faire, facultatif, inconnu), une phrase et un bouton vers la carte qui règle l'étape. La première étape à faire a le bouton coloré. Le dépôt des données (un dépôt distant pour data/ et, pour GitLab, votre jeton d'administrateur sur ce poste), la compagnie (son nom, dans le module Site ; votre trigramme est dans Réglages › Identité), la base aéronautique (au moins une zone publiée), le premier pilote (« Ajouter un pilote »), puis, facultatifs, les appareils et les clés (IVAO, EAD). L'état de l'installation, tel que le cadre le donne, est en bas. L'assistant n'écrit rien : chaque bouton ouvre la carte qui existe déjà.

**Ajouter un pilote (administrateur).** Au niveau « Complet », le bouton « Ajouter un pilote » de la carte « Administration » (là où l'export est possible) prépare tout pour un pilote qui n'a encore rien. Tapez son trigramme, son nom si vous voulez le saluer, la langue du message et l'adresse de l'appli publiée, puis « Préparer » : vous obtenez le fichier, le lien et le code QR (trois formes de la même configuration), vos gestes, et un message prêt à copier, dans la langue choisie. Pour un dépôt GitLab, vos gestes sont : créer le jeton de projet du pilote (un par pilote, nom = son trigramme, rôle Developer, portée `api`, date d'expiration à 90 jours conseillés et 365 au plus, jamais sans date), le copier tout de suite (GitLab ne le montre qu'une fois), vérifier que la branche des données laisse pousser les Developers, et savoir révoquer (Settings › Access tokens › Revoke). Avec le lanceur, « Créer son jeton » ouvre l'écran « Jetons des pilotes » avec le trigramme déjà tapé : le lanceur crée le jeton avec celui de l'administrateur ; les gestes à la main restent repliés dessous. Sans lanceur, ils sont ouverts. **Envoyez le jeton à part du message** (un autre canal, ou collez-le devant le pilote) : il ne figure jamais dans le lien ni dans le message. Pour un dépôt GitHub, les gestes sont ceux de l'export.

<a id="settings-sources"></a>**Sources des données.** Le bouton « Sources des données » (`#sources`, niveau Complet) liste les sources des données aéronautiques que la suite utilise, envisage ou a écartées : pour chacune, ce qu'elle donne, sa licence, son statut et un lien qui s'ouvre dans un nouvel onglet ; pour celles qui changent à chaque cycle AIRAC (SIA, VAC, eAIP, CIFP), le lien est celui du cycle en vigueur, écrit en haut de l'écran. L'écran ne télécharge rien. Sous le bouton de la carte Administration, l'adresse absolue de l'écran, à ouvrir ou à mettre en favori (« Copier le lien »). Il remplace le laboratoire des données, retiré le 28 octobre 2026.

**Les bancs, sur un poste.** Servis par le lanceur, ils ne s'ouvrent que sur un poste avec lanceur (ailleurs, ils sont
nommés sans lien) ; chemins relatifs à la racine de la suite : `labs/design_primitives.html` (primitives et designs),
`frame/aerodb/bench.html` et `frame/aerodb/offline_bench.html` (base aéronautique, en ligne et hors ligne),
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

**La compagnie.** Au niveau Complet (ou par #settings?card=company), la carte « Compagnie » liste les compagnies de data/airline/index.json et « Personnel » : le nom, le code, les réseaux (IVAO, VATSIM, hors ligne) et le nombre d’appareils de la flotte. La carte s’appelle « Compagnie de cet appareil » : une liste à boutons radio, une ligne par compagnie (le nom, le code, le genre dit en toutes lettres — « Commerciale », « Escadrille SO » ou « Personnel » —, les réseaux et la flotte). Toucher une ligne en fait la compagnie courante de cet appareil (le choix est propre à l’appareil) : seuls les boutons radio changent, la liste ne se redessine pas. Tant que le cadre ne sait pas encore enregistrer ce choix, les boutons sont gris et la carte le dit. Dessous, la fiche de la compagnie choisie (les autres n’en ont pas), dépliée : le **genre** (deux boutons radio, une phrase chacun) puis les **thèmes de missions** (une case par thème : le sigle et le nom), cochés d’après le genre tant que rien n’a été coché ; cocher ou décocher écrit themes.json, un thème au moins reste coché. **Ajouter un thème** (un sigle de 2 à 8 lettres ou chiffres, un nom de 1 à 40 caractères ; huit au plus) et **Ajouter une série** (un thème de la liste, un nom ; vingt par thème) : le nom saisi dans la langue de l’écran est recopié dans les quatre langues ; le thème ou la série s’enlève avec « Retirer ». Trois gestes suivent, dans cet ordre : « Créer une compagnie » ouvre un **assistant sur le même écran** : le pas **Identité** (le nom ; le code, proposé d’après le nom et modifiable, 2 à 8 lettres minuscules ou chiffres, jamais déjà pris ; le **genre**, Commerciale ou Escadrille SO, Commerciale préchoisie ; les réseaux), puis le pas **Thèmes de vols** (ceux du genre, cochés d’avance : décochez ce que vous ne volez pas ; rien n'est écrit pour les thèmes si vous n'y touchez pas), puis le pas **Flotte** (« Flotte · 2 appareils » : cherchez un type dans la base des fiches, tapez l’immatriculation, « Ajouter l’appareil » ; « Retirer » ; « Plus tard » si vous préférez ajouter les appareils depuis Appareils), puis le **Résumé** en mots (« Rennes Motoculture · Commerciale · IVAO · 1 thème · 2 appareils »). « Retour » garde tout ce qui est saisi. **Rien n'est écrit avant « Créer la compagnie »** : alors les réglages, la flotte (vide) puis, en dernier, l'inscription dans la liste (une compagnie n'est listée que complète) ; un fichier déjà là n'est jamais écrasé. Si la création est interrompue, le message dit ce qui est fait et « Reprendre » finit sans rien écraser. À la fin, « Voler pour cette compagnie » la choisit et ouvre Missions. Si le code saisi a déjà son dossier mais que la compagnie manque à la liste, l’assistant le dit et propose **« Reprendre cette compagnie »** : elle est remise dans la liste, rien d’autre n’est écrit. Vingt compagnies au plus ; tout ce qui est lu de data/airline/ est traité comme du texte non fiable. « Rejoindre une compagnie » ouvre un autre assistant : collez la page « Flotte » du site de la compagnie (ou « Lire le presse-papiers »), puis « Lire la page » ; l’écran montre **ce qui a été lu** (« 4 appareils · 3 opérateurs »), le nom et le code proposés, le genre (« Escadrille SO » par défaut), les réseaux et l’adresse du site (facultative, en https) **avant que rien ne soit écrit** ; « Rejoindre » écrit alors les réglages, la flotte lue et, en dernier, l’inscription dans la liste. Le pas « ce qui a été lu » dit aussi **combien de missions du registre sont déjà à ce code** (« Registre : 2 missions déjà à ce code »), et s’adapte au code que vous tapez. Une compagnie déjà dans la liste n’est pas rejointe de nouveau : sa flotte se met à jour par le collage de l’écran du site de la compagnie. Sur le poste du lanceur, tant que votre compagnie est encore à la racine de data/airline/, la carte propose de la **migrer** : un code facultatif (proposé d’après le nom), « Voir ce qui serait fait » (le nom, le dossier data/airline/<code>/, les fichiers et leur taille, la flotte qui y sera vide), puis « Migrer vers « <code> » ». Rien n’est supprimé ni écrasé : les fichiers actuels restent en place comme copie. Dans la fiche : sans genre, tous les thèmes sont cochés d’avance et la fiche invite à choisir le genre ; une commerciale a le thème Commercial (fret, passagers, rapatriement à vide, VIP, entraînement, transit, essais en vol), une escadrille les seize thèmes militaires. « Personnel » (tous les thèmes) n’a rien à régler.
