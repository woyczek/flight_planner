# Écrire son premier compte rendu — tutoriel

*SO Group Virtual (Virtual Special Operation Group) · [English version](first_report.en.md)*

Le compte rendu (CR) raconte un vol réalisé : appareil, équipage, heures, route, ce qui s'est passé. Ce tutoriel en
écrit un de bout en bout, de la mission reçue au vol retrouvé dans « Mes vols ». Comptez quinze minutes la première
fois. Les noms entre guillemets sont ceux des boutons et des blocs, tels qu'ils s'affichent.

Prérequis : la suite installée et lancée ([tutoriel d'installation](installation.fr.md)), votre trigramme et vos
identifiants réseau réglés (Paramètres › Mon profil). Le niveau **Équipage** suffit : il montre un « CR court »,
l'essentiel du formulaire.

## 1. Ouvrir le compte rendu

Trois portes, selon ce que vous avez volé :

- **Une mission affectée** : « Mes missions », ouvrez le dossier de la mission, puis « Créer le CR ». Le CR de la
  bonne famille s'ouvre déjà rempli depuis l'ordre : titre, route, appareil affecté et sa référence.
- **Un vol du journal de la compagnie sans CR** : « Mes vols », cliquez la ligne marquée « sans CR », puis « Rédiger
  le CR ». Date, indicatif, appareil, immatriculation, trajet et durée sont repris.
- **À vide** : barre latérale « Compte rendu ». Choisissez la famille de mission (FIRE, HEMS, AIRLIFT…), d'un clic
  ou en décrivant la mission dans la recherche (« évasan hélico », « largage para ») ; « Continuer avec … » propose la
  dernière famille utilisée.

Si un brouillon est déjà en cours, la page demande avant de le remplacer. Depuis le CR lui-même, « Préremplir ▾ ›
Nouveau CR depuis… » mène aux mêmes endroits (Mes missions, Mes vols, ou un fichier au niveau Conception).

## 2. Vérifier la famille et la série

La pastille en tête de la barre d'outils (« FIRE · GAAR ▾ ») rappelle la famille et la série. Un clic permet d'en
changer ; le formulaire suit (blocs propres à la famille).

## 3. L'appareil

Dans le bloc « Appareil(s) », tapez l'immatriculation (`F-ZB…`) : les appareils connus de la flotte sont proposés.
Choisissez le vôtre : type, catégorie, indicatif, exploitant, base et équipements se remplissent. Vous pouvez aussi
partir de l'indicatif : `ctm58` donne la série, le numéro et l'« Indicatif plan de vol ». « ⟲ Effacer » relance la
recherche si l'appareil n'est pas le bon.

Si vous ne vous êtes pas posé à la base prévue, renseignez le « Terrain d'atterrissage réel (OACI) ».

## 4. Remplir depuis le réseau

Tout ce qui remplit le CR est dans un seul menu de l'en-tête, « Préremplir ▾ » (dès le niveau Équipage), partie
« Compléter ce CR depuis… ». **Seuls les champs vides sont remplis.**

- **« Mon dernier vol »** : « Mon dernier vol IVAO » ou « Mon dernier vol VATSIM ». La suite, ouverte par son
  lanceur, lit vos vols des sept derniers jours ; un seul vol remplit le CR aussitôt, plusieurs se choisissent dans une
  liste (indicatif, trajet, date et heures UTC, « en cours »). Indicatif, terrains, plan de vol déposé (appareil, route,
  niveau, immatriculation…), heures de la trace et distance sont repris. Votre ID IVAO ou VATSIM doit être dans Mon
  profil ; pour IVAO, il faut aussi la clé d'API de la suite (Paramètres › Installation). VATSIM ne publie pas de
  trace : ses heures sont celles de connexion et de déconnexion, à corriger.
- **« Plan de vol déposé »** : votre dernier OFP SimBrief, ou le plan de vol IVAO / VATSIM du vol en cours.
- **« Coller un plan de vol, une page du tracker ou un METAR »** : sur la page de votre vol (tracker IVAO, ou StatSim
  pour VATSIM), Ctrl+A puis Ctrl+C, revenez et collez dans la zone. Le favori « → CR » (« Favoris → CR »), glissé une
  fois dans la barre des favoris, copie la page du tracker en un clic.

Chaque source finit par le même résumé : la source et la date du vol, les champs remplis et les blocs touchés, les
champs déjà saisis gardés, et ce que la source n'a pas donné. « Remplacer les champs déjà saisis » réapplique la source
en les remplaçant ; « Annuler », dans la notification, remet le CR comme avant pendant 10 secondes.

## 5. Les heures et la route

- **« Chronologie »** : les heures clés, en heure locale (HH:MM) — mise en route, décollage, atterrissage, arrêt
  moteurs en CR court ; le bouton « maintenant » à côté d'un champ met l'heure courante. Une heure incohérente est
  surlignée et listée sous les calculs.
- **Carburant** : au départ et à l'atterrissage.
- **« Navigation »** (CR détaillé) : départ, arrivée, route ; un plan de vol collé les remplit.

Les durées (bloc, vol, sur zone) et le carburant consommé se calculent seuls dans « Calculs automatiques ».

## 6. Ce qui s'est passé

- **« Résultat »** : Succès, Succès partiel, Interrompue… ; pour un résultat autre que Succès, cochez les causes
  (météo, technique, contrôle absent…).
- **« Équipage »** : vous et les autres membres (trigramme ou nom), avec leur fonction.
- **Blocs de la famille** : ceux propres au type de mission (FIRE : secteur, largages, base de remplissage…).
- **« Remarques »** : ce qui mérite d'être lu.

« CR détaillé » montre tout le formulaire (événements horodatés, étapes, météo, navigation) ; « CR court » revient à
l'essentiel. L'aperçu du compte rendu, à droite, se met à jour en continu.

## 7. Enregistrer

« Ajouter au registre » range le CR dans le registre des missions (le bouton devient « Enregistrer les
modifications » ensuite). Jusque-là, le brouillon est gardé dans ce navigateur : vous pouvez fermer la page et y
revenir. Le message à droite de la barre dit ce qui a été enregistré et quand.

## 8. Envoyer

Le menu « Envoyer » :

- **« Envoyer le CR »** transmet le compte rendu au webservice de la compagnie, s'il est paramétré (« Registre des
  missions › Paramétrer l'envoi des CR »).
- **« Site de la compagnie »** (si son adresse est réglée) déclare le vol sur le site :
  1. une fois, glissez le favori « → Vol » dans la barre des favoris ;
  2. « Enregistrer le vol sur le site ↗ » ouvre la page « Enregistrer mon vol » du site, avec les champs du vol ;
  3. connectez-vous si le site le demande, puis cliquez « → Vol » : il ouvre votre appareil, puis « Ajouter un
     vol » ; cliquez-le encore pour remplir le formulaire (indicatif, numéro, date de fin, durée, mission, arrivée) ;
  4. relisez, puis « Valider » sur le site. Rien n'est validé à votre place.

  Sans le favori, « Copier les champs » copie une ligne à reporter à la main.

## 9. Retrouver le vol

« Mes vols » (barre latérale, sous « Mes missions ») liste vos vols passés, le plus récent en tête : votre CR y
figure, avec son numéro ; un clic le rouvre pour le corriger. Le lien « Mes vols ↗ » du menu « Envoyer » y mène
directement.

## Pour aller plus loin

- Le chapitre « Compte rendu d'une famille » du [manuel utilisateur](../MANUEL_UTILISATEUR.md) décrit chaque bloc et
  chaque champ.
- Le chapitre « Mes vols » du même manuel décrit le registre des vols, ses filtres et son export.
