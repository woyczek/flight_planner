# Rejoindre la compagnie

*Dix minutes, une fois par appareil : de la configuration envoyée par votre compagnie à un appareil qui partage ses
données, avec un assistant qui garde où vous en êtes si vous vous arrêtez en route.*

**Avant de commencer.** L'administrateur de votre compagnie vous envoie un lien, un fichier sog-config ou un code QR à
scanner avec l'appareil photo de votre téléphone. Ouvrez-le : l'assistant « Rejoindre la compagnie » démarre. Il
démarre aussi depuis la carte d'accueil de la première ouverture, ou depuis ⚙ Réglages › « Rejoindre la compagnie… ».

## 1. La configuration

![La configuration reçue : compagnie, dépôt, trigramme](img/join-airline-1.fr.png)

**Vérifiez-la.** La compagnie, son dépôt des données et votre trigramme. Rien d'autre n'est changé sur l'appareil.
Puis « Suivant → ».

## 2. Votre compte

![Créer le compte, puis le nom d'utilisateur](img/join-airline-2.fr.png)

**Un compte chez l'hôte du dépôt.** Le plus souvent GitHub. Vous en avez déjà un ? Cochez « Oui ». Sinon cochez « Non,
je le crée » et suivez les trois lignes : s'inscrire, choisir un nom d'utilisateur simple, vérifier l'adresse mail. Si
le dépôt de votre compagnie appartient à un utilisateur, le jeton ouvrira tous les dépôts de votre compte : si vous en
avez déjà d'autres, créez un compte dédié au vol.

**Votre nom d'utilisateur.** Tapez-le : l'administrateur en a besoin. Puis « Suivant → ».

## 3. L'invitation

![Donner son nom, accepter l'invitation](img/join-airline-3.fr.png)

**Donnez votre nom.** « Copier mon nom », puis envoyez-le à l'administrateur : il vous invite sur le dépôt.

**Acceptez.** GitHub vous écrit : ouvrez le mail et acceptez l'invitation (le lien de l'écran y mène aussi). Cochez
« Invitation acceptée », puis « Suivant → ».

## 4. Le jeton

![Créer le jeton sur GitHub, pas à pas](img/join-airline-4.fr.png)

**Créez-le sur GitHub.** Suivez les lignes : le premier lien ouvre la page déjà remplie — un jeton « classique » avec la
case « repo », auquel vous donnez un an de validité. Si le dépôt de votre compagnie appartient à une organisation,
l'assistant montre plutôt un jeton à grain fin (ce seul dépôt, « Contents : Read and write »).

**Copiez-le tout de suite.** GitHub ne le montre qu'une fois. Cochez « Jeton copié », puis « Suivant → ».

## 5. Coller le jeton

![Le jeton testé : accès vérifié](img/join-airline-5.fr.png)

**Collez et testez.** Collez-le, puis « Tester ». Une phrase claire dit ce qui ne va pas : invitation pas encore
acceptée, jeton mal copié ou expiré, ou sans droit sur le contenu. Une fois vérifié, le jeton reste sur cet appareil
seulement. Puis « Suivant → ».

## 6. Vos identifiants réseau

![IVAO, VATSIM, SimBrief : facultatifs](img/join-airline-6.fr.png)

**Facultatifs.** Votre VID IVAO, votre CID VATSIM et votre identifiant SimBrief permettent à l'appli de reprendre vos
vols et votre dernier plan. Puis « Suivant → ».

## 7. Terminé

![L'appareil est réglé et synchronisé](img/join-airline-7.fr.png)

**Terminez.** « Terminer et synchroniser » règle tout et fait la première synchronisation. Gardez ensuite la zone de
vos vols hors ligne (« Données hors ligne »), et enchaînez avec [Préparer un vol](#help?t=prepare-flight).

**Pour aller plus loin.** Le chapitre Réglages du manuel, section « Configurer un pilote »
([Réglages](#help?m=settings)).

<!-- en: c3a1f59e0eb3 -->
