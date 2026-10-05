# Notes de version — X-Plane Web Suite (DEFA Virtual)

Une section par version publiée, la plus récente en tête, écrite à chaque release (avec la section du
[CHANGELOG](CHANGELOG.md), qui détaille tout) : **synthèse** (ce qui change pour l'utilisateur), **actions à
effectuer** (ce que chacun doit faire après la mise à jour), **notes** (limites connues, points d'attention, à venir).
Entre deux versions, le pied de page affiche le commit en cours (`v4.6.0+abc1234`).

## 4.8.0 — 5 octobre 2026

### Synthèse

- **Les données se partagent.** Le bouton **« Synchroniser (n) »** de l'en-tête envoie vos fichiers (disponibilités,
  affectations, journal, fiches) au dépôt git de `data/` et reçoit ceux des autres. Une fiche modifiée des deux côtés
  garde la version la plus récente, l'autre est copiée dans `_conflits/` : rien ne se perd.
- **Utilisateurs et droits.** Chaque utilisateur a sa fiche (rôle, mot de passe chiffré). En mode `develop` (par
  défaut), la connexion reste facultative ; en mode `production`, elle est exigée pour Mes missions et le Centre.
- **Disponibilités en catégories** définies par le Centre (Paramètres › Centre › Catégories) : palette par groupe,
  plages à la minute ; préférences de thèmes de missions dans Mon profil. Le planning ODV les montre aux mêmes couleurs.
- **Mes missions** : liste et dossier côte à côte, disponibilités en dessous ; le dossier s'ouvre, se ferme et change
  de mission avec une animation propre au design. Trois boutons mènent au profil : Pilote, Appareils maîtrisés,
  Simulateurs.
- **Aide intégrée** : entrée « Aide » de la barre latérale, en fenêtre au-dessus de la page, ouverte au chapitre de la
  page. Manuel utilisateur et manuel administrateur en français, anglais, allemand et espagnol ; recherche ; utilisable
  aussi sans le lanceur.
- **Paramètres en quatre pages** : Mon profil, Centre, Installation, Maintenance. Flotte DEFA importée par copier-coller
  de la page du site.
- **Plus rapide** : index des données dans le navigateur (ODV : deuxième chargement de 114 à 11 requêtes), pages et
  décor sans clignotement.

### Actions à effectuer

1. **Relancer le lanceur** (fermer sa fenêtre, puis `lancer.cmd` ou `lancer.sh`) : il porte la synchronisation et les
   index des données. Puis **recharger chaque page ouverte** (Ctrl+F5).
2. **Pilotes** : vérifier dans **Paramètres › Mon profil** le trigramme, les **appareils maîtrisés et simulateurs**
   (ils ne se règlent plus dans Mes missions) et les préférences de thèmes.
3. **Centre** : vérifier les catégories de disponibilité (Paramètres › Centre › Catégories) ; créer les fiches des
   utilisateurs (Paramètres › Centre › Utilisateurs et droits) **avant** de passer la compagnie en mode `production`.
4. **Partager les données entre plusieurs postes** : Paramètres › Installation › Premier lancement, carte « Dépôt git de
   synchronisation des données » — adresse (git@… ou https://…), « Vérifier », « Enregistrer » ; puis « Synchroniser »
   dans l'en-tête. La première synchronisation crée la branche distante.
5. **Favoris vers la documentation technique** : elle a déménagé dans `docs/technique/` (le premier niveau de `docs/`
   ne garde que l'installation, le paramétrage, l'utilisation et les versions).

### Notes

- La synchronisation passe par git en attendant le serveur web minimal (voir la feuille de route,
  `docs/technique/ROADMAP.md`) ; les données restent pour l'instant sur la branche `test` du dépôt des données.
- Les libellés des catégories propres à la compagnie se traduisent avec l'audit des traductions
  (`tools/audit_i18n.html`, section « Libellés des données »).
- Aide sans lanceur : à vérifier en ouvrant une page depuis le disque.
- À venir : comptes rendus rangés par année, envoi des CR par le site DEFA (copier-coller en attendant une API).

## 4.7.0 — 2 octobre 2026

### Synthèse

- **Exercices : les plis scellés arrivent au pilote.** Dans « Mes missions », les messages et pistes d'un exercice
  sont des enveloppes cachetées, derrière le signet du dossier (page « Informations complémentaires »). Chacune porte
  son heure d'ouverture et s'ouvre seule à l'heure ; on peut briser le scellé avant (confirmation), et le resceller.
  Pistes et cartes d'exercice ne se voient qu'une fois le pli ouvert.
- **Le Centre affecte une opération d'un coup.** Dans l'ODV, les missions d'un exercice (I-001A, B, C…) tiennent sur
  une ligne : une coche, un pilote par équipage, une **heure H** commune — chaque équipage décolle à H + son décalage,
  son convoyage est calculé en conséquence. « + équipier » sous chaque équipage pour une patrouille.
- **ODV plus pratique** : « Modifier » rouvre les missions enregistrées du créneau, préremplies ; les vols de la frise
  mènent à leur créneau ; appareils déjà pris grisés ; la fenêtre ne saute plus pendant la saisie ; choix de la semaine.
- **Convoyage** : le convoyeur ne reçoit que son ordre de convoyage (sans le brief de la mission). Un pilote : une
  mission par tranche (matin, après-midi, soir).
- **Heures d'exercice avec unité** : `H+2mn`, `H-20mn`, `H+1h` (H, T ou M, une seule référence).
- **Prise en main** : lanceurs `lancer.cmd` / `lancer.sh` et page **Premier lancement** ; décor complet et design
  **Aqua** par défaut.
- **Designs** : galons argent (or au Centre), signets et enveloppes par design, nouveaux panneaux et frise d'Aqua.

### Actions à effectuer

1. **Recharger chaque page ouverte** (Ctrl+F5).
2. **Centre** : relire le dossier des missions dans le registre (« Relire le dossier ») avant d'affecter un exercice.
3. **Missions d'exercice** : écrire les décalages avec leur unité (`H-20mn`, `H+1h`) ; les anciens `H-20` restent lus
   en minutes. Les cartes d'exercice des équipages doivent être **enregistrées dans le dossier** depuis le Studio
   (« Enregistrer dans le dossier » coché et autorisé) pour être jointes aux plis.
4. **Développeurs, pages ouvertes en `file://`** : `sh tools/install_hooks.sh` une fois par clone, pour le numéro de
   commit en pied de page.

### Notes

- Le journal des gestes du pilote est tenu dans le navigateur ; le CR prérempli qui s'en servira est à venir.
- La position de l'appareil n'est pas suivie : un pli « au passage d'un point » sans heure estimée reste scellé
  jusqu'à ce que le pilote l'ouvre.
- Libellés encore en français seulement (plis, signet, matrice d'affectation) : traduction à venir.
- Chiffons (pistes jouées par un pilote) : dossier propre dans « Mes missions » à venir.

## 4.6.0 — 1ᵉʳ octobre 2026

### Synthèse

- **Les missions arrivent aux pilotes.** Le Centre affecte une mission (pilotes, appareils, horaire, astreinte,
  convoyage) depuis le registre ou un créneau de l'ODV ; le pilote la retrouve dans sa page **« Mes missions »**, signalée
  par un pli cacheté dans l'en-tête, avec ses disponibilités et ses appareils.
- **Un vrai dossier de mission.** Dans les designs à matières, la mission non lue arrive scellée : dossier ficelé et
  cacheté (Cabinet), enveloppe cachetée du ministère (Carnet de vol), porte-documents noué d'un ruban « URGENT » (Aqua),
  dossier zippé ficelé en croix (Durci). L'ouvrir brise le sceau ; le dossier s'ouvre en livre : on tourne les pages
  par le coin corné ou d'un clic, un signet mène à la dernière page, l'ordre porte l'en-tête de son époque.
- **Planning ODV** plus dense et plus lisible, déclarations des pilotes et missions probables.
- **Sous le capot** : échappement HTML commun, images des pages versionnées (plus d'ancienne image gardée en cache),
  ménage des images sources.

### Actions à effectuer

1. **Recharger chaque page ouverte** (Ctrl+F5) : nouvelles versions des scripts, des feuilles et des images.
2. **Pilotes** : renseigner son **trigramme DEFA** dans ☰ › Profil pilote, pour voir ses missions dans « Mes missions ».
3. **Centre** : le dossier des missions doit être autorisé (Paramètres › Sources et dossiers) pour enregistrer les
   affectations et le journal (`data/missions/`).
4. **Sous Brave** : serveur local seulement, et `brave://flags/#file-system-access-api` → Enabled (voir INSTALL).

### Notes

- Le dossier de mission en livre s'affiche à partir de 760 px de large ; en dessous, présentation ordinaire. Aqua n'a
  pas de signet, Standard n'a pas de dossier.
- `cabinet/1800` : panneaux sources gardés, à convertir.

## 4.5.0 — 1ᵉʳ octobre 2026

### Synthèse

- **CR FIRE / GAAR et HEMS / MEDEVAC sur le Mission Core** : les pages historiques sont remplacées, à la même adresse
  (favoris et liens inchangés), par les pages du socle commun — mêmes champs, mêmes outils que les autres familles
  (import, partage, reporting). Toutes les familles de CR partagent désormais le même socle.
- **Designs** : les styles sont rangés en couches CSS ; les designs l'emportent sans `!important`. Rendu inchangé
  (contrôlé au banc de non-régression sur toutes les pages, dans chaque design et chaque ton).
- **Outils à fond sombre** (Landing, planificateur, planning ODV, reporting des opérations) : une palette commune ;
  la Landing et le reporting des opérations changent de quelques nuances.
- **Choix d'un dossier impossible** : le message dit quoi faire (Brave : réglage à activer ; page en http hors
  localhost ; Firefox, Safari : Chrome ou Edge), en notification. Console plus propre sans dossier `data/`.
- Générateur : durée de l'opération en tailles (XS à XL) ; planificateur : noms d'appareil lisibles.

### Actions à effectuer

1. **Recharger chaque page ouverte** (Ctrl+F5) : nouvelles versions des scripts et des feuilles de style.
2. **Anciens registres FIRE / HEMS** (CSV des pages historiques) : ils ne sont plus lus d'office. Les importer une fois
   depuis la page de la famille : **« Importer l'ancien registre FIRE (CSV) »** / **« … HEMS (CSV) »**.
3. **Sous Brave** : pour choisir les dossiers (Paramètres › Sources et dossiers), ouvrir
   `brave://flags/#file-system-access-api`, passer « File System Access API » à **Enabled**, relancer Brave — ou
   utiliser Chrome / Edge.
4. Toujours servir la suite par un serveur local lancé **à la racine du dossier** (`python -m http.server 8000
   --bind 127.0.0.1`) et l'ouvrir par `http://127.0.0.1:8000/…`, pas en `file://`.

### Notes

- Sans le dépôt de données (`data/`), un seul 404 reste en console (`data/data_tree.js`) : il est voulu et sert à
  basculer sur les exemples.
- Toolkit : phase 3 en cours (187 renforts `:not(#imp)` encore utiles, traités au cas par cas). La page « Mes
  missions » est publiée en 4.6.0.

## 4.4.0 — 30 septembre 2026

### Synthèse

- **Nouvelle famille COMBAT** (lettre A) : combat aérien et entraînement chasse — BFM, ACM, DACT, interception.
  Compte rendu et reporting dédiés (engagements, tirs simulés, issue, knock-it-off) ; le générateur sait produire ces
  missions (zones d'entraînement, Rafale, Mirage 2000).
- **Identifiants de mission liés** : changer l'identifiant d'une mission d'opération propose une migration de toute
  l'opération (missions, organisation, participants, cartes, textes) ; refuser rétablit l'identifiant. Plus
  d'écrasement d'une mission par une autre pendant la saisie.
- **Enregistrement dans le dossier des missions** : chaque échec dit pourquoi (dossier non choisi, autorisation,
  écriture impossible, identifiant hors format) ; le studio cartographique affiche toujours son résultat.
- **Designs à matières** : boutons homogènes, feuille de registre commune (carte posée en papier punaisé), barres de
  progression et notifications dans la matière du design, bouton ☰ centré, textures des fenêtres du Mission Core.

### Actions à effectuer

1. **Recharger chaque page ouverte** (Ctrl+F5) : nouvelles versions des scripts et des feuilles de style.
2. **Dossier de travail déplacé hors de Synology** (poste de développement : `E:\DEFA`) : dans
   **Paramètres › Maintenance › Sources et dossiers**, choisir de nouveau le **dossier des données** (`data/`) — les
   dossiers des missions, des CR et SIA en sont déduits. Garder `data/` sur l'appareil (pas de fichiers « en ligne
   seulement ») : sinon les lectures et enregistrements échouent.
3. **Missions reçues avec un identifiant sans lettre de famille** (ex. `BFM-001A`) : les ouvrir dans le générateur et
   accepter la migration proposée à l'enregistrement ; missions déjà rangées sur disque :
   `python tools/migrate_operation_ids.py BFM-001 A-001 --type COMBAT` (essai : `--dry-run`).
4. **Lot de missions du générateur abîmé avant cette version** (mission vidée, organisation sans ses missions) :
   recharger l'opération depuis le registre (fichiers du dossier), pas depuis le navigateur.

### Notes

- Toolkit : phase 2 terminée ; phase 3 (couches CSS, retrait des `!important`) commencée — le rendu peut encore
  légèrement bouger. Plan : [docs/REFACTORING_TOOLKIT.md](technique/REFACTORING_TOOLKIT.md).
- La punaise des cartes posées sur la feuille de Durci reprend celle de Cabinet (une punaise propre à Durci peut être
  fournie : `shared/deco/field/`).
- Durci en ton sombre : pas de carnet sous les tableaux de registre (bloc d'acier), comme Cabinet et Carnet de vol.
