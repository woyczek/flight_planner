# Créer une fiche de performances — tutoriel

*SO Group Virtual (Virtual Special Operation Group) · [English version](fuel_profile.en.md)*

Le Carburant calcule un devis à partir de la **fiche de performances** de l'appareil : vitesses, varios, consommations,
plafond, cartographie moteur. Ce tutoriel crée une fiche sur la page **Fiches de performances**, la complète, puis
s'en sert dans le Carburant. Comptez dix minutes. Les noms entre guillemets sont ceux des boutons et des blocs, tels
qu'ils s'affichent.

Prérequis : la suite installée et lancée ([tutoriel d'installation](installation.fr.md)), le niveau
d'utilisation **Conception** au moins (Paramètres › Mon profil › « Niveau d'utilisation »). La carte « Moteur » et la carte « SimBrief » demandent le niveau **Expert**.

## 1. Ouvrir la page et choisir l'appareil

1. Barre latérale « Outils » › **Fiches de performances**.
2. Le tableau « Fiches de performances » liste vos appareils (ceux de « Mes appareils » en tête), groupés par
   catégorie. Un appareil sans fiche affiche « aucune » dans la colonne « Performances ».
3. Cliquez la ligne de l'appareil. Elle se surligne, et le sélecteur « Appareil » en haut de la page le montre. Pour
   un appareil sans fiche, la barre du bas affiche « Pas de fiche pour … » et les boutons « Créer la fiche ».

Autre départ : dans Paramètres › Mon profil › Appareils et simulateurs, la colonne « Performances » d'un appareil sans
fiche propose les mêmes façons de créer une fiche. Le lien ouvre la page des fiches sur cet appareil.

Un appareil absent du tableau s'ajoute par « Ajouter un appareil » (barre du bas).

## 2. Créer la fiche

La barre du bas propose, pour l'appareil choisi :

- **« depuis SimBrief »**, quand SimBrief connaît le type. C'est le plus rapide : la fiche reprend la consommation de
  croisière, les masses, le plafond et la vitesse de la liste publique de SimBrief.
- **« Demander à ChatGPT »**, pour tous les types (voir l'étape 3).
- **« Estimer par la classe »**, quand le type est classé (hélicoptère, turbopropulseur, réacteur, monomoteur…). La
  fiche est minimale : consommation, vitesse et plafond typiques de la classe, marqués « estimé ».

Après un clic, la fiche est créée et s'ouvre dans la carte « Fiche en cours » ; la barre du bas affiche « Fiche
enregistrée — … ».

## 3. Compléter avec ChatGPT

1. « Demander à ChatGPT » ouvre le panneau ChatGPT au-dessus du tableau, sur l'appareil choisi.
2. « Copier le prompt et ouvrir ChatGPT » copie la question et ouvre ChatGPT dans un onglet. Collez la question
   (Ctrl+V) et envoyez-la. « Voir le prompt » montre la question dans la page.

   La question demande à ChatGPT de compiler les sources (manuels, constructeur, autorités, Wikipédia, forums de
   simulation) dans les unités de la suite (kt, ft, ft/min, kg/h). Elle donne aussi ce que la suite sait déjà
   (EUROCONTROL, SimBrief, fiche actuelle), pour que ChatGPT complète plutôt que répète.
3. Copiez la réponse de ChatGPT (le bloc JSON) et collez-la dans le champ du panneau.
4. Cliquez sur « Fusionner avec « … » » pour compléter la fiche de l'appareil. Un aperçu montre chaque valeur qui change,
   avec une case par donnée : décochez ce que vous ne voulez pas reprendre, puis validez. « Annuler » reste possible
   10 secondes.

Ce qui est signalé : les clés inconnues, et les valeurs illisibles ou hors plage, qui sont écartées. Les valeurs que
ChatGPT donne comme estimées apparaissent dans la colonne « Manques » du tableau (« estimé : … »). Elles ne le sont plus
dès que vous les modifiez à la main.

**Plusieurs appareils d'un coup.** Cochez leurs lignes (cases, ou Ctrl + clic), puis, dans la barre du bas, ouvrez
« Sélection (n) ▾ » et choisissez « Renseigner les champs manquants (n) ». Une seule question part pour toutes les
fiches cochées, avec les champs vides de chacune. La réponse ne remplit que les champs vides : rien de déjà saisi
n'est remplacé, et un résumé par fiche précède la validation.

## 4. Vérifier et compléter les champs

La carte « Fiche en cours », sous le tableau, montre la fiche ouverte :

- **« Régimes de vol — profil ↔ cartographie »** : badin, vario, régime et débit de chaque phase (montée, croisière,
  descente, roulage, dégagement).
- **« Champs de la fiche »** : tous les champs, groupés (« Identité et format », « Carburant et opération »,
  « Montée », « Croisière », « Descente »…). Quand EUROCONTROL connaît le type, une étiquette « APD … » à côté d'un
  champ propose sa valeur : un clic la reprend. « remplir les champs vides » les reprend toutes.

Corrigez ce qui doit l'être, puis cliquez sur **« Enregistrer la fiche »** dans la barre du bas. « Abandonner les
modifications » revient à la fiche enregistrée.

Au niveau Expert, vérifiez aussi la carte **« Moteur »**. Dans « Cartographie moteur — édition », chaque ligne donne la
consommation à un régime (RPM ou N1), avec l'altitude si la source la précise. « Table RPM / puissance → consommation »
et sa courbe montrent le résultat. « Interpolation moteur » donne le débit pour un régime saisi. Une table vide n'est
pas bloquante : le Carburant prend alors la consommation de croisière de la fiche.

## 5. Utiliser la fiche dans le Carburant

1. Ouvrez le **Carburant**.
2. Le menu « Avion » de l'en-tête liste les appareils qui ont une fiche, ceux de « Mes appareils » en tête. Choisissez
   le vôtre.
3. Saisissez la distance et le niveau : le devis se calcule avec la fiche.

Au niveau Expert, le résultat montre la fiche en lecture seule (groupe « Régimes de vol »), avec « Modifier cette fiche
dans les Fiches de performances ↗ ». Une fiche enregistrée dans les Fiches de performances, ouvertes dans un autre
onglet, est reprise aussitôt par le Carburant, qui refait le devis.

## Pour aller plus loin

- Le chapitre « Fiches de performances » du [manuel utilisateur](../MANUEL_UTILISATEUR.md) décrit chaque bloc : fusion de
  plusieurs fiches, export `.lnmperf`, dossier performances, calibration sur un OFP SimBrief réel.
- Le chapitre « Carburant » du même manuel décrit le devis, la décision du niveau et la montée.
