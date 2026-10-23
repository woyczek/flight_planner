# Réglages

Les réglages de cet appareil (⚙ en haut de l'écran) : votre identité, ce que l'appli vous montre, comment les données
sont échangées, et ce que l'appareil garde hors ligne. Ils restent sur l'appareil, jamais synchronisés.

## Comment s'en servir

**Votre identité.** Dans « Identité », tapez votre trigramme et vos identifiants VID IVAO, CID VATSIM et SimBrief, puis
« Enregistrer ». Les outils s'en servent pour préremplir ; à plusieurs, le trigramme est nécessaire.

**Le niveau.** « Niveau » choisit ce que le menu montre : Découverte, Courant ou Complet, d'un toucher. Sous chaque
choix, la ligne « Menu : » dit quels outils il montre ; un outil caché reste joignable par son adresse.

**Le design.** « Design » montre une vignette par habillage — Standard, Cabinet, Durci — et le ton : Automatique
(comme le système), Jour ou Nuit. Un toucher l'applique aussitôt, sur cet appareil seulement.

**Les usages.** La phrase en tête de « Usages » dit comment les données sont échangées. Sans case cochée, vous êtes
« Seul sur cet appareil » : rien ne part ailleurs. Cochez « Seul, sur plusieurs appareils » ou « À plusieurs (dépôt git
des données) » pour échanger. Sur un poste servi par le lanceur, l'appli lit et écrit déjà le dossier `data/`
du lanceur, même sans case cochée ; un usage d'échange le partage en plus par git.

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

## La clé météo

Le METAR marche sans clé. Le TAF, sur un appareil sans lanceur (téléphone, site), demande une clé personnelle et
gratuite d'avwx.rest : « Créer une clé sur avwx.rest ↗ » ouvre la page du fournisseur. Collez-la dans « Clé météo (TAF,
avwx.rest) », puis « Enregistrer » ; « Tester » demande le TAF d'un terrain, « Effacer » la retire. La clé reste sur cet
appareil seulement, jamais dans le dépôt ni dans une sauvegarde, et n'est jamais réaffichée. Sur un poste servi par le
lanceur, elle est inutile : le lanceur fournit le TAF.

## Les clés du lanceur

Sur un poste servi par le lanceur, « Clés du lanceur » règle la clé de l'API IVAO : elle reste dans le dossier
`secrets/` du lanceur, jamais dans le navigateur ni dans les données. « Tester » vérifie qu'IVAO répond ;
« Effacer » la retire.

## Un dépôt git pour data/

Sur un poste servi par le lanceur, « Accès aux données » montre le dépôt distant de `data/` : son adresse et sa
branche. Pour le régler ou en changer, tapez l'adresse (`git@hôte:compte/dépôt.git` ou `https://…`, sans mot de passe
ni jeton dedans) : « Vérifier » dit si le dépôt répond, « Enregistrer » le règle. Vers une autre adresse que celle de la configuration, une fenêtre Oui / Non s'ouvre sur l'ordinateur, pas dans la page : la carte le dit avant le clic ; répondez-lui (elle peut être derrière les autres fenêtres), puis revenez. Refusée, fermée ou déjà ouverte : la carte en donne la raison et `data/` reste tel quel. C'est voulu : une page piégée ne doit pas pouvoir envoyer vos données ailleurs. Rien ne bloque : un dépôt qui ne répond pas est
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
- **À propos** : liens vers cette aide et la feuille de route (ce qui est livré, en cours, prévu), puis le
  diagnostic, replié : transport, dernière synchro, erreurs, arbre du dépôt, bases de référence et base aéronautique,
  ligne par ligne ; « Copier » met le tout dans le presse-papiers, à coller dans votre message pour signaler un
  problème. Le
  jeton n'y figure jamais.
