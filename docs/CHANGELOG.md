# Changelog — X-Plane Web Suite (DEFA Virtual)

Toutes les évolutions notables de la suite (CR DEFA, Landing Performance Dashboard, Flight
Performance & Fuel Planner, Missions SIA, framework commun). Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation `majeur.mineur.correctif`.
La version affichée en pied de page de chaque page (lien vers ce fichier) vient de
`repository_tree` (`release`).

Dépôt : <https://framagit.org/asr/flight_planner> — demandes de fusion : `!n`.

## [Non publié]

### Ajouté

- **v2 (branche `feature/v2-niveaux`), lot L0 : niveau d'utilisation** — Mon profil › « Niveau d'utilisation » remplace
  « avec ou sans Centre » : 1 équipage (Mes missions, Compte rendu, Planning en lecture), 2 planification (Planning ODV),
  3 conception (Missions : générateur, registre), 4 expert (tous les outils, studio cartographique) ; outils facultatifs
  (cartes de vol, carburant, atterrissages, analyse des missions) cochés à n'importe quel niveau, rangés sous « Outils ».
  Barre latérale, onglets, menu ☰ et accueil ne montrent que les pages du niveau (`pages[].level`, `pages[].module`),
  au plus sept entrées ; Apparence en onglet de Réglages. Le niveau range l'interface, sans donner de droits.
  Proposition complète : `docs/technique/V2_NIVEAUX.md`.
- **v2 : studio cartographique dans Missions** (onglet, niveau 4) ; « Outils » ne garde que les outils facultatifs, sans
  rien du Centre. L'icône du Centre ne marque Planning et Missions que pour qui s'en sert (Centre ouvert, niveau 2 ou
  plus, pas un compte sans le rôle `admin_centre`) ; sinon icône ordinaire.
- **Planning : « Masquer les pilotes indisponibles »** (palette et vue semaine du Tableau, reprise de la page ODV ; même
  règle que les conflits : plage qui rend affectable à un vol) ; au
  **niveau Expert**, bloc « Créneaux communs et missions probables » repris de la page ODV (cadre sans en-tête,
  `odv_planning.html?blocks=slots,missions`, hauteur ajustée à son contenu).
- **v2, niveau 1 : Planning en consultation seule**, quels que soient les droits (Centre ouvert compris) : ni DLO et
  butées, ni activations de zones, ni modification ; thème ordinaire au lieu de celui du Centre pour qui ne fait que
  consulter (niveau 1, Centre fermé, compte sans le rôle `admin_centre`).
- **v2, Planning rationalisé** : une seule page (plus d'onglet « Planning ODV ») ; au niveau Expert, créneaux communs et
  missions probables à plat dans la page (cadre sans en-tête, onglets ni pied ; « Page ODV complète » pour le classeur
  et l'export) ; **Annuler** (dix pas, Ctrl+Z) ; **Retirer la demande** d'une zone inscrite comme demandée ; l'ordre du
  jour en premier bloc, sa barre (semaine, jours, vue, annuler, briefing) au-dessus de la frise.
- **v2, lot S0 : niveaux dans les pages** — `<html data-level>` posé dès l'en-tête (repository_tree), `data-min-level="n"`
  (élément visible à partir du niveau n) et `data-max-level="n"` (jusqu'au niveau n) appliqués par `repository_nav.css`,
  sans réécriture de la page : blocs, champs et boutons se marquent à la source.
- **v2, lots S1 à S5 : pages simplifiées par niveau** (tout reste au niveau Expert) —
  **Cartes de vol** aux niveaux 1 à 3 : route, niveau, SimBrief, liste des cartes, « Cartes du vol », un seul
  « Générer les cartes et le ZIP » ; **Carburant** (nouveau titre) : avion, plan de vol ou dernier FPL SimBrief,
  « Paramètres du vol » repliés, Calculer, Résultat ; **Mes missions** : dossier réduit à l'essentiel au niveau 1, boutons
  Cartes de vol et Carburant selon les outils cochés, une seule barre de semaine, « Plage précise » repliée ; **CR court**
  aux niveaux 1-2 (identification, résultat, appareil, équipage, 4 heures, carburant, blocs de la famille, remarques) et
  bouton « CR détaillé » ; **Réglages** : Installation au niveau 2, Maintenance au niveau Expert, sept entrées au plus par
  groupe, doublons retirés de la vue (langue, client OAuth IVAO, rubrique « Premier lancement » d'Installation, second
  « Nettoyer et recommencer »), Apparence réduite aux designs courants et aux icônes ; **Générateur et Registre**
  (niveau 3) : sept blocs, commande à six réglages et « Plus d'options », quatre filtres et « Plus de filtres », sept
  colonnes.
- **v2, Planning refait** : six blocs natifs, déplaçables et repliables, sans cadre : Ordre du jour (barre de la semaine
  et frise, tous niveaux), Équipage de la semaine (dispos et DLO, ancienne vue « Semaine »), Zones (activations et demandes
  réunies), Statistiques (ancienne vue) au niveau 2 ; Créneaux communs et Missions probables au niveau Expert, servis par
  le script de la page ODV dans la page (même semaine que le Planning, `OdvPlanning.setMonday`) ; styles des blocs ODV
  partagés (`apps/cpco/odv_blocks.css`) ; plus de choix de vue ; lien vers la page ODV complète (classeur, export).
- **Pages de démonstration du moteur des CR hors des comptes rendus** : `apps/cr/MissionCore/` → `tools/demo/mission_core/`
  (outils de développement, niveau Expert) ; plus rien dans le dossier des CR qui ne soit une famille.
- **Clés de poste et signatures** (`shared/sog_keys.js`, lot L2 de [COMPTES_SIGNES.md](technique/COMPTES_SIGNES.md)) : par
  poste, une paire de signature ECDSA P-256 et une paire d'échange ECDH P-256, non exportables, gardées dans la base
  `sogKeys` du navigateur (hors sauvegarde) ; empreinte courte `7F3A-91C2-04BE-D85E` ; JSON canonique (RFC 8785) ;
  enveloppes et fiches signées ; clé de secours chiffrée par mot de passe (PBKDF2 600 000, AES-GCM). Pas encore branché
  sur les pages (registre et enrôlement : lots suivants). Banc d'essai : `tools/crypto_banc.html`.

### Corrigé

- **Déplacement des blocs (poignée ↕)** : le bloc visé s'illumine dans tous les designs (contour d'accent et trait
  d'insertion ; l'ancienne ombre était recouverte par les designs à matières, visible en Métro seulement) ; posé sur la
  moitié haute d'un bloc, le bloc déplacé va avant lui, sur la moitié basse après (dernière position possible) ; dépôt
  dans une autre colonne ; la page défile pendant le glisser près du bas de la fenêtre et sous l'en-tête fixe (monter un
  bloc tout en haut d'une longue page). Disposition mémorisée sous une clé unique par conteneur (`layout`) ; les
  dispositions déjà mémorisées (`order`) restent lues. Un dépôt qui ne changerait rien est retourné : bloc 1 lâché sur
  le haut du bloc 2 → « après 2 », et dans l'autre sens « avant » (blocs cachés ignorés). Menu ☰ : « Réinitialiser
  l'ordre des blocs » (ordre d'origine de la page, blocs masqués gardés), 4 langues.

  dispositions déjà mémorisées (`order`) restent lues.
- **« Suite lancée depuis …, dossier déclaré …/planner/ » alors que le dossier de l'application est le bon** : le
  dossier des profils de performance (et celui de la sauvegarde locale) était gardé d'une installation à l'autre, pour
  respecter un choix personnel — y compris quand il venait d'une autre copie de la suite. À la déduction des dossiers,
  un dossier gardé qui est celui d'une autre copie (non confirmée) est désormais remplacé par celui de `data/` ; le
  premier lancement refait la déduction à l'ouverture.
- **Habilitation du planning** : un compte connecté sans le rôle `admin_centre` pouvait, Centre ouvert en mode develop,
  inscrire des zones comme demandées, modifier les DLO (objectifs) et, au Planning ODV, ajouter, retirer ou importer des
  sessions ATC, écrire des préférences dans les fiches et affecter des pilotes. Tableau et Planning ODV : écriture
  réservée à `admin_centre` dès qu'un utilisateur est connecté (et toujours en production), lecture seule sinon.
- **Tableau en lecture seule** : le planning seul (frise du jour : vols, contrôles, divers, notes) ; zones, ATC, dispos
  communes, problèmes, journal, vues semaine et statistiques, activations et demandes de zones réservés au Centre.

### Modifié

- **État de la synchronisation servi tout de suite** : le lanceur relançait ses commandes git (1 à 3 s sur un gros
  dossier `data/`) à chaque ouverture de page, deux fois. Il répond désormais avec le dernier état connu et le relit en
  tâche de fond s'il a plus de 20 s (relu tout de suite au premier appel, avec le dépôt distant, et après un passage de
  synchronisation).
- **Fréquence de vérification de la synchronisation réglable** (Paramètres › Maintenance › Versions et
  synchronisations, réglage de ce navigateur) : à chaque page, toutes les 30 minutes (défaut), 3 fois par jour, une fois
  par jour, et « Vérifier maintenant ». Le bouton « Synchroniser » s'affiche tout de suite avec le dernier état connu
  (`syncState:v1`), sans requête ; une seule vérification (dépôt distant compris) quand la période est écoulée, au lieu
  de deux à chaque page et d'une toutes les 5 minutes ; après une écriture, relevé local seul. Manuels (4 langues).
- **Nom de la compagnie par jetons résolus à la source** : `{SOG}`, `{SOG_NOM}`, `{SOG_NOM_LONG}`, `{CENTRE}` dans les
  textes (quatre langues, HTML fixe et titres d'onglet compris), résolus par `K.t` / `K.tf` / `K.brand` et par la
  traduction des textes fixes, de nouveau quand la compagnie réglée change ; l'observateur qui renommait la page après
  coup est supprimé (pages de Paramètres figées, nom réglé contenant l'ancien). Données inchangées.
  « SO Group » seul (premier lancement, mode autonome du Centre) et libellés de catégories du jeu d'essai en jetons aussi.
  Voir `docs/technique/FRAMEWORK.md` § 4 bis.
- **Carte « Accès au Centre » remise en ordre** (Centre verrouillé) : champ du mot de passe, puis bouton « Activer le
  Centre » avec « Mot de passe : DEFA » sur la même ligne (premier lancement compris) ; texte d'introduction à jour (le
  mot de passe vient des données, seule l'activation reste dans le navigateur), traduit en allemand et en espagnol.
- **Textes du Centre traduits à la source** (règle du CLAUDE.md) : carte « Accès au Centre » et « Mode et accès »,
  mot de passe affiché au premier lancement et message de confirmation du dépôt distant passent par `K.t` dans les
  quatre langues ; leurs entrées des tables de traduction après coup (`data_admin_i18n.js`,
  `premier_lancement_i18n.js`) sont retirées ; textes écrits seulement s'ils changent.

## [4.11.0] — 2026-10-08

La suite s'installe avec un tutoriel illustré (captures, schémas des échanges et des identifiants, prérequis
utilisateur et administrateur), en français et en anglais, suivi par le menu de langue de l'aide. Centre en mode
autonome : mot de passe lu dans les données (`data/config/centre.json`, DEFA par défaut), affiché et modifiable ;
conception des comptes et données signés par git. Mot de passe du site du SOG hors service (INOP). Premier lancement
plus sûr (dossiers de `data/` déduits quand les données arrivent, accès à redonner, faux « autre copie » supprimé) ;
contrôle des mises à jour juste (commit servi, filiation demandée au dépôt) ; titres traduits ; nombre de cases MORA
d'une zone correct.

### Ajouté

- **Tutoriel d'installation** (`docs/tutorial/`, français et anglais, Markdown et HTML) : installation en quelques
  minutes, captures d'écran d'une installation neuve à chaque étape du premier lancement ; schémas des échanges de la
  suite avec les services extérieurs (lu, envoyé, par le navigateur ou par le lanceur) et des identifiants (où on les
  saisit, où ils restent, vers qui ils partent) ; prérequis distingués entre utilisateur et administrateur du SOG, avec
  ce que fournissent les admins et comment le créer. Schémas et pages HTML régénérables
  (`docs/tutorial/build_diagrams.py`, `build_html.py`) ; repris par l'aide intégrée ; `INSTALL.md` y renvoie et décrit
  les six étapes actuelles. Visible dès le début : encadré « Start here » en tête du README du dépôt, première ligne
  des sommaires de la documentation (4 langues), bouton « 📘 Tutoriel d'installation, pas à pas » en tête du premier
  lancement, adresse affichée dans la fenêtre du lanceur ; l'ancien `TUTORIAL.md` y renvoie.

### Modifié

- **Mot de passe du Centre dans les données** : le verrou d'usage du Centre ne compare plus le mot de passe à une
  empreinte écrite dans le code. Il lit `data/config/centre.json` (`{ "motDePasse": "DEFA" }`), qui est partagé avec les
  données. Le mot de passe est affiché à côté du bouton « Activer le Centre » (premier lancement, Paramètres › Centre).
  Il se change dans Paramètres › Centre › « Mode et accès », une fois le Centre activé, et part au prochain
  « Synchroniser ». Le jeu d'essai et le modèle des données livrent le fichier.
- **Mode du Centre affiché** : mode autonome (mot de passe) dans le bilan du premier lancement et dans Paramètres ›
  Centre. Le mode groupe (registre signé, accès par le rôle) est en conception
  ([COMPTES_SIGNES.md](technique/COMPTES_SIGNES.md)).
- **Aide : documents nommés par langue** (`….fr.md`, `….en.md`, comme le tutoriel d'installation) affichés dans la
  langue de la suite (allemand, espagnol : l'anglais) ; le menu de langue fait basculer le document, et un lien vers la
  version d'une autre langue change la langue de la suite, comme le menu. Pages HTML du tutoriel : menu de langue.
- **Mot de passe du site du SOG hors service (INOP)** tant que le SOG n'a pas de webservice (un accès futur passera
  probablement par une clé d'API) : champ grisé avec une étiquette façon bande DYMO (composant commun `.repo-inop`,
  `shared/repository_nav.css`) dans Mon profil et au premier lancement ; ce mot de passe n'est plus ni lu ni gardé (un
  ancien est retiré à l'enregistrement). Bilan et étape Profil : l'identifiant suffit.

### Corrigé

- **Pages de Paramètres figées (« page unresponsive »)** quand la compagnie réglée diffère de SO Group Virtual : le
  renommage dans les pages (`repository_nav.js`) réécrivait à l'identique un texte contenant « CPCO » (centre non
  renommé), et chaque écriture relançait son observateur, sans fin. Un texte n'est plus réécrit que s'il change, le texte
  qu'il vient d'écrire n'est pas retraité (nom réglé contenant l'ancien), et un nœud réécrit plus de 20 fois par seconde
  n'est plus touché.
- **« Dossier des données : impossible de vérifier qu'il est celui de la suite servie »** après une installation neuve :
  le lanceur n'écrivait ses repères (`.defa_instance`) qu'au démarrage, avant que `data/` existe ; ils sont désormais
  écrits aussi après le jeu d'essai, le clone du dépôt ou l'archive des données (même jeton pour toute la vie du lanceur).
- **« Mise à jour disponible » alors que la version locale est en avance** : le commit local venait d'un relevé du
  dossier mémorisé par le navigateur (parfois vieux de plusieurs jours), et de la branche `develop` du dépôt même quand
  une autre branche est extraite (`develop-local`) ; « en retard » était décidé par les dates. Désormais : commit local =
  commit servi, relu à chaque contrôle (`AppFramework.servedCommit`) ; le dépôt distant dit s'il manque des commits en
  local (API `repository/compare`). Nouveaux états : « En avance sur … » (le local contient déjà le canal) et
  « Commits locaux non publiés » (commit local inconnu du dépôt).
- **Nombre de cases MORA d'une zone sous-compté** (« 74 case(s) dans mora.csv » pour la France au lieu de 133) : le
  panneau comptait les seules cases dont le centre tombe dans le contour du pays ; les petites îles (La Réunion,
  Mayotte, Antilles…) sont désormais comptées, comme dans le calcul (`zoneCellKeys`).
- **Titres restés en français** : titre de la page Premier lancement (entrée de traduction manquante) et titres d'onglet
  du navigateur de toutes les pages (`document.title` désormais traduit par la couche commune, `shared/content_i18n.js`).
- **Premier lancement : dossiers SIA, missions et registre jamais réglés** quand les données arrivent après le choix du
  dossier de l'application (nouvel ordre des étapes : jeu d'essai, dépôt ou archive installés ensuite) — « dossier SIA
  non autorisé » à l'étape des données aéronautiques. Ils se déduisent dès que les données sont là, et à la demande
  (`FileAccess.get` : dossier déduit absent → déduit du dossier de l'application déjà autorisé, un essai toutes les 10 s).
- **Même dossier annoncé comme « autre copie »** (« Suite lancée depuis E:\…, dossier déclaré …/même dossier ») après un
  rechargement ou un redémarrage : le navigateur retire l'accès au dossier, son repère était illisible et pris pour
  celui d'une autre copie. Sans accès, le contrôle est désormais « impossible pour l'instant » ; l'étape 1 propose
  « Autoriser à nouveau » (accès redonné d'un clic, dossiers de `data/` déduits aussitôt).
- **Case « mémoriser dans le gestionnaire d'identifiants de Git »** seule sur sa ligne, libellé trop grand : case et
  libellé sur une ligne, à la taille des libellés.
- **Villes absentes de la base aéronautique (« villes_geonames.csv not found »)** : la lecture de
  `shared/carto/villes_geonames.csv` est tentée deux fois (un lanceur occupé par un téléchargement peut refuser ou couper
  une requête) ; en cas d'échec, le compte rendu de la relecture donne l'adresse et la raison (code HTTP, erreur réseau,
  dossier de l'application) ; message en 4 langues.

### Livraison

- Archive de livraison : `xplane-web-suite-4.11.0.zip` — SHA-256 `36197cbd531c616c52e1fdf634f46b871ba06540b9410244b44aaab35b8d6c24` (code seul, hors dépôt : dossier `dist/`).

## [4.10.0] — 2026-10-07

La compagnie devient SO Group Virtual. Nouvelle page Tableau (ordre de vol de la semaine). Premier lancement repensé :
bilan, dossier de l'application d'abord (tout grisé tant qu'il n'est pas cohérent avec la suite), jeu d'essai ; accueil
généré. Données aéronautiques par pays : choix sur la carte et « Activer » qui télécharge, reconstruit la base et
calcule la MORA ; Royaume-Uni (AIP militaire) et Canada (NAV CANADA) ; MORA de l'outre-mer et des grandes zones, sommets
parasites du relief écartés. Sessions ATC et activations IVAO et VATSIM ; flotte et terrain des appareils lus sur le site
de la compagnie ; design Tactique. Sécurité : lanceur fermé aux autres sites, fichiers de données au format imposé, git
durci. Code commenté et remis en forme.

### Ajouté

- **Canada : manuel des espaces aériens désignés de NAV CANADA (DAH) téléchargé et lu** — source officielle cochée par
  défaut (openAIP et X-Plane en repli) : le lanceur trouve l'édition en vigueur sur la page des guides opérationnels
  (`aero_fetch.py navcan` → `tools/navcan_dah.py`, sans bibliothèque : polices CID décodées par leur table ToUnicode) ;
  243 espaces de la partie 5 (`zones/ca/navcan_dah.geojson`) : 19 zones dangereuses, 142 réglementées, 26 consultatives
  d'opérations militaires (MOA) et 56 autres consultatives, avec arcs, cercles, secteurs séparés, limites verticales,
  horaires et organisme de contrôle. À retélécharger tous les 56 jours.
- **Royaume-Uni : AIP militaire (UK Mil AIP ENR 5.2) téléchargée et lue** — source officielle cochée par défaut (openAIP et
  X-Plane en repli) : le lanceur prend le PDF à son adresse fixe (`aero_fetch.py ukmil` → `tools/ukmil_aip.py`) ; 25 zones
  de vol à basse altitude (sol à 2000 ft AGL), 30 secteurs de la Valley Aerial Tactics Area, zone d'évitement TVAA, et
  14 zones de ravitaillement (AARA) en axes IP → CP ajoutés à ceux de la DIRCAM (`SiaBase` : `aarXmlExtra`,
  `OdvAirspace.aarTracks`). Fichiers `zones/<zone>/<source>_…` rattachés à leur source par le préfixe ; lien NAV CANADA
  corrigé.
- **Site de la compagnie** : adresses par défaut (site, pages Flotte, Log des vols…) valables pour la compagnie par défaut de
  la suite (SO Group Virtual, ou DEFA Virtual) — elles comptaient « non réglées » depuis le renommage ; le lanceur lit la
  flotte et le journal à l'adresse réglée (transmise par la page), plus à une adresse écrite en dur ; compagnie sans
  adresse réglée : rien n'est importé.
- **MORA des grandes zones** (plus de 1500 cases : États-Unis, Canada…) : MORA d'X-Plane par défaut (panneau, actions à
  faire, mise en place automatique) ; « Calcul complet… » par blocs de 10° sur confirmation (volume annoncé), chaque bloc
  écrit aussitôt dans `mora.csv`, arrêt et reprise ; relief des tuiles ouvertes d'AWS majoré de 100 m, sans requête
  OpenStreetMap (`computeMoraGrid` : options `peaks`, `fineMax`).
- **Données aéronautiques : mise en place automatique d'une zone** à sa première activation (téléchargements, derniers
  ZIP de Téléchargements, reconstruction de la base, MORA de la zone, double jauge) et bouton « Tout récupérer et
  recalculer » ; « Actions à faire » sous la carte (une ligne par source des zones actives, lien et bouton) ; tableau
  de la base en SortedTable (triable, problèmes d'abord), nombre de contrôles sans souci, mode « Afficher les problèmes ».
- **Données aéronautiques et types d'aéronefs dans l'installation** : Paramètres › Installation montre les blocs
  « Données aéronautiques » et « Types d'aéronefs » (mêmes blocs que Maintenance : un bloc peut être sur plusieurs pages,
  `settings.sections` « installation,maintenance ») ; nouveau bloc « Types d'aéronefs (OACI et performances) » avec
  « Compléter les types manquants de la flotte et des missions » ; premier lancement, étape 4 « Données aéronautiques
  et types d'aéronefs » avec ces mêmes blocs (`<div id="maintenance" data-blocks="sia,types">`), « Terminer » ramène à
  l'accueil ; « (facultatif) » sur le classeur ODV et le dépôt git de synchronisation.
- **Terrain actuel des appareils** (`shared/aircraft_positions.js`) : emplacement de la page Flotte du site gardé
  (`location`, `locationAt` : date du dernier changement ; script et collage), ou terrain d'atterrissage réel d'un CR
  issu d'un ordre de mission, le plus récent l'emportant ; les convoyages en partent (fenêtre d'affectation, affectations,
  Planning ODV, fiche appareil). CR : champ « Terrain d'atterrissage réel (OACI) » jamais prérempli, référence de l'ordre
  (`metadata.orderRef`) posée depuis « Mes missions », départ et arrivée du convoyage pour un ordre de convoyage,
  rédacteur (`metadata.reportedBy`). Mon profil › Mes appareils : CR rédigés comptés, décompte du journal affiché.
- **Mon profil › Mes appareils (reporting)** : appareils pilotés ou reportés (CR où le trigramme figure dans l'équipage),
  coche grisée « Flotte DEFA » ; la liste complète reste dans Centre › Flotte.
- **Maintenance › Types d'aéronefs et performances** : codes OACI dans une zone de texte (un par ligne ou séparés par des
  virgules), bouton « Télécharger types et performances ».
- **Flotte dans Paramètres › Centre, avec les appareils du reporting** : sous la flotte connue, les appareils qui volent
  dans le journal des missions (`shared/fleet_reporting.js`), case « personnel » (cochée par défaut : hors flotte ;
  décochée : ajouté à la flotte, affectable) ; index des appareils individuels `data/references/aircraft_personal.js`
  enregistré avec la flotte ; « Rafraîchir types et performances » ; mise à jour depuis le site déplacée sous la flotte.
  Le lanceur complète en tâche de fond les types inconnus après la mise à jour quotidienne (`unknown_types`).
- **Terrain d'un appareil** : il ne change que par la mise à jour depuis le site ou un CR issu d'un ordre de mission ;
  la fiche appareil (« 📍 ») ne le déduit plus du dernier CR venu.
- **Ordres de vols : ordre de mission réémis d'office au déplacement d'une plaquette** — mêmes pilotes, appareils,
  indicatifs et convoyeurs à la nouvelle heure, sans fenêtre ; pli déjà ouvert rescellé. Conflit d'affectation ou dossier
  non autorisé : non réémis, signalé sur la plaquette (`omAttente`, `omRaison`) qui garde sa nouvelle heure.
- **Fenêtre d'affectation : convoyage repris des Ordres de vols** — option `departure` (terrain de départ de secours
  quand le yaml de la mission n'en donne pas : le convoyage n'était alors ni calculé ni montré) et `rows[].ferry`
  (plaquette de convoyage placée : heure et durée reprises telles quelles, marquées « plaquette de convoyage »).
- **Flotte et référence DEFA automatiques depuis le site** : le lanceur lit les pages publiques Flotte et Log des vols de
  flotte.defa-virtual.fr (sans connexion) une fois par jour, à l'ouverture d'une page (`shared/defa_site.js`,
  `/__setup/defa-site`), et les passe aux scripts du collage (`update_fleet.py`, `defa_reference.py`) ; carte
  « Flotte et journal DEFA (site) » dans Paramètres › Maintenance (réglage automatique, « Mettre à jour maintenant »).
  Scripts : option `--out=` ; le lanceur écrit dans son dossier de données (`--data`), envoi du journal du premier
  lancement compris. Procédure du manuel d'exploitation (§ 4.2) réécrite ; mentions périmées corrigées.
- **Périmètre des sessions ATC : pays préféré** (Paramètres › Centre › Planning ODV, France métropolitaine par défaut ;
  44 pays, préfixes OACI des indicatifs de terrain) : imports VATSIM et IVAO, positions en ligne et sessions montrées
  limités à ce pays (`SuiteAtc.perimeter` / `inPerimeter`) ; le lanceur reçoit les préfixes (`/__setup/ivao-bookings?pre=`).
- **Planning ODV, sessions ATC** : trainings, examens et événements en tête du tableau (repérés en marge), simples
  réservations de position repliées ; message d'import détaillé (trainings, examens, autres sessions).
- **« Importer d'IVAO » importe aussi les sessions ATC IVAO** (trainings, examens, réservations) ; import IVAO
  automatique à l'ouverture d'une semaine, au plus une fois par heure, si la page peut écrire (`SuiteAtc.autoImport`,
  commun au Planning ODV et aux Ordres de vols).
- **Activations des zones par réseau, VATSIM et IVAO côte à côte** (Ordres de vols et Planning ODV, même éditeur,
  mêmes données) : saisies de chaque réseau, activations « les deux réseaux » dans les deux colonnes, import IVAO replié
  dans sa colonne ; VATSIM ne publie pas d'activations (saisie à la main).
- **Sessions ATC : import IVAO** (trainings, examens, réservations de France métropolitaine, clé d'API de
  l'installation, lanceur `/__setup/ivao-bookings`) ; un seul import par réseau pour toutes les pages
  (`SuiteAtc.importNetwork`).
- **Fenêtre d'affectation sans écriture** : `apply(lignes, { takeoff, h_hour, alert, block_min })` rend aussi l'heure
  et l'astreinte choisies (Ordres de vols : plaquette remplie en entier).
- **Données aéronautiques : un seul bloc « Base aéronautique : sources, cycles et reconstruction »** (fusion de
  « Reconstruire la base aéronautique » et « Cycles AIRAC et âge des données ») : tableau de toutes les sources cochées des
  zones actives (zone, source, fichiers, cycle ou date, âge, taille, état), ligne cliquable qui met la source à jour,
  boutons « Tout recalculer » et « Purger le cache ».
- **Axes de ravitaillement depuis le PDF de la MILAIP** : Données aéronautiques › zone France › DIRCAM › « Importer le
  PDF MILAIP… » (pdf.js chargé à la demande, `AarTracks.parseEnr57`), anomalies à valider, édition repérée (AMDT),
  écriture de `miam-enr-5-7-tracks.xml` dans le dossier SIA (ancien archivé) et mise à jour de la base.
- **Espace disque : données aéronautiques par zone** (place du dossier SIA, sources, fichiers ; zones inactives signalées).
- **Design « Tactique »** (Apparence) : repris de l'outil Ordres de vols — fond de nuit dégradé à halos, verre fumé
  (flou, bord lumineux), accent cyan, texte Inter, titres Orbitron en capitales, liseré du thème en haut des blocs. Sans
  image ni texture (aucun décor, logo et icônes plats) ; polices dans `shared/fonts/` (SIL OFL). Règles dans
  `designs_skeuo.css` (jetons des composants communs), clé `logo` du registre des designs (logo plat d'un design à matières).
- **Base des types d'aéronefs plus visible** : carte en tête de Références et dépendances, encadrée et signalée par une
  notification quand la base est vide, bouton « Compléter la base » (types de la flotte et des missions), « Recharger la
  page » à la fin d'une passe, fichiers écrits expliqués.
- **Lanceur plus rapide sur `localhost`** : écoute aussi sur `::1` (sous Windows, chaque fichier attendait ≈ 0,2 s le repli
  IPv6 → IPv4 : page et fond affichés en 1,5 s au lieu de 0,15 s).
- **Clés d'API et identifiants des services externes** : Paramètres › Installation › Sources et dossiers › « Clés
  d'API » (IVAO, commune à la suite) et Mon profil › « IVAO — client OAuth (personnel) » (client ID, secret, adresse de
  redirection à déclarer) ; gardés par le lanceur (`secrets/`, exclu de git, hors des données et des sauvegardes ;
  `GET` / `POST /__setup/secrets`), jamais renvoyés à la page (état et 4 derniers caractères).
- **Carte des zones : épinglage** — un clic garde la zone au panneau (activation par « Activer la zone », sources) ;
  nouveau clic, Échap ou « Libérer » la relâchent. Carte redimensionnée quand le bloc s'ouvre depuis le menu ; bouton
  du dossier SIA en double retiré ; plus de rafraîchissement de la page à chaque survol ; panneau sans barre de défilement
  propre (la page défile ; molette au-dessus de la carte : la page, zoom avec Ctrl) ; « Télécharger » : état et résultat
  sous le bouton, avertissement si les fichiers écrits ne sont pas visibles (dossier SIA non autorisé ou autre).
- **Écart entre `data/` et sa sauvegarde git** (`tools/data_sync.py` : `divergence`, `shared/sync.js`) : bouton
  « Synchroniser » orange ou rouge selon les modifications non envoyées (nombre, âge), les commits à recevoir ou non
  envoyés, les fichiers modifiés hors des données synchronisées, l'absence de dépôt git ou distant, une fusion en cours ;
  raisons en infobulle, alerte en notification une fois par session ; bouton « ⚠ Sauvegarde » si `data/` n'est pas un
  dépôt git (hors jeu d'essai) ; seuils dans `data/config/suite.json` (`sync`). `odv/` rejoint les données synchronisées.
- **CR : « Causes »** (plusieurs cases) d'une mission non effectuée ou partielle : météo, technique, simulateur, pilote ou
  équipage absent, contrôle absent, réseau, zone non activée, ravitailleur absent, manque de temps, opérationnel, autre
  (`results.causes`, `MissionVocab.mneCauses`), affichées dans le compte rendu.
- **Ordres de vols** (☰ › Centre — Ordres de vols ; barre latérale « Ordres ») : l'ordre de vol de la semaine, repris de
  l'outil autonome « Ordres de vols V0 » dans le modèle de la suite ([ODV_ORDRES.md](technique/ODV_ORDRES.md)). Frise du
  jour en heures z (tranches matin, après-midi, soir ; nuit aéronautique ; RTBA · LL ; zones des vols ; dispos ensemble),
  plaquettes de vol (mission du registre ou entraînement), contrôle, divers et notes glissés depuis les modèles, membres
  glissés sur les plaquettes, empilement automatique ; conflits (semaine non déclarée, non couvert, non affectable,
  chevauchement, doublon, zone non activée), badge P ; états repris des CR ; récurrences datées ; vue semaine (dispos par
  membre, récup, modifications prises en compte), statistiques, briefing plein écran. Données : `data/odv/<semaine>.json`,
  réglages `data/config/odv.json` (Paramètres › Centre › Ordres de vols) ; dispos et affectations de la suite.
  Catégorie de dispo « Disponible au sol seulement » (`sol`) et règle d'affectation par catégorie
  (`SuiteDispos.affectable` : un contrôle n'est affectable qu'en contrôle).
- **Ordres de vols : modules partagés** — `shared/odv_airspace.js` (activations de zones par réseau et par plage,
  `data/atc/activations/<semaine>.json` ; zones requises d'une mission et leur état ; contrôle ouvert ; examens et
  trainings), `shared/odv_activations_editor.js` (saisie des activations), `shared/odv_reports.js` (missions ravitailleur
  liées ; CR → plaquette : succès = ME, succès partiel ou échec = MNE avec causes, annulée = BÂCHÉ, sans CR après le délai
  = MNE « pas de CR »). Registre des missions : rôle et axe de ravitaillement (`aarRole`, `aarTrack`).
- **Données aéronautiques : carte des zones du monde** (Paramètres › Maintenance › Données aéronautiques). Une zone par
  pays (Natural Earth, domaine public ; la France regroupe métropole et outre-mer), activée d'un clic ; au survol, ses
  sources dans le panneau : téléchargement (openAIP, ENAIRE, FAA), commande ou inscription avec lien et mode d'emploi
  (SIA France, NATS), PDF (DIRCAM ENR 5.7, AIP militaire britannique, NAV CANADA), dossier (X-Plane), calcul (MORA de la
  zone). États sur la carte : vierge, inactive avec données, active incomplète, active complète. « Reconstruire la base
  aéronautique » ne lit que les sources cochées des zones actives (X-Plane découpé à leurs contours) ; tableau des cycles
  AIRAC et de l'âge des données ; MORA par zone (cadres regroupés : métropole et chaque outre-mer). Le pas à pas SIA en
  six étapes et le contrôle des différences disparaissent ; les adresses DIRCAM, NATS, AIP militaire britannique et
  NAV CANADA rejoignent les Sources externes (Paramètres › Installation). Réglage `aeroZones:v1` (ancien `aeroSources:v1`
  repris : pays openAIP).
- **Barre latérale réglable** (Apparence › Icônes) : « Taille des icônes » (petite, moyenne, grande) et « Affichage »
  (icône et libellé, icône seule — barre plus étroite, nom en infobulle —, libellé seul) ; barre resserrée par défaut.
- **Premier lancement : jeu d’essai ou dépôt de données de la compagnie.** Étape « Données » : « Jeu d’essai »
  (données fictives livrées avec la suite, `tools/jeu_essai.py`, lancé par le lanceur : `POST /__setup/jeu-essai`, refusé
  si des données sont déjà là), « Dépôt de données » (adresse saisie, identifiants facultatifs), archive reçue par mail.
  Plus aucune adresse de dépôt de données en dur : `sources.dataRepo` vide, pas de clone automatique sans adresse,
  modèle `tools/data_template` sans adresse ; identifiants en double de la page corrigés (`plRepo`, `plRepoMsg`).
  **Contenu du jeu d'essai** (`tools/jeu_essai/`, voir son README) : 12 missions générées traduites en anglais —
  BOXING GLOVES (exercice A-001 : organisation, deux éléments Rafale, ravitailleur, deux chiffons révélés par radio à
  l'heure dite), EYE OF SOLOGNE (I-001 : E-3F « le grand disque », ravitailleur, Rafale), S-001, N-001, T-001 — ; quatre
  pilotes fictifs (ALF, BRV, CHL, DLT), flotte des types de ces missions, indicatifs, configuration SOG ; disponibilités
  (semaine en cours et suivante) et cinq affectations datées à l'installation (exercice le lendemain, heure H 19:00Z).
  `--force` ne réinstalle que par-dessus un jeu d'essai (dates remises à jour).

### Modifié

- **MORA : tableau des changements de hauteur replié par défaut** (« Voir le tableau des changements de hauteur (n
  case(s)) ») ; ouvert ou fermé, il le reste quand le bloc se redessine.
- **Données aéronautiques : pays choisis sur la carte, puis « Activer »** (Maintenance, Installation, premier lancement) :
  un clic ajoute un pays à la sélection, un autre l'en retire (pays choisis en bleu, barre sous la carte : pays, à
  activer, à désactiver, « Annuler ») ; « Activer » applique la sélection et enchaîne pour toutes les zones choisies
  incomplètes les téléchargements, les derniers ZIP de Téléchargements, une seule reconstruction de la base, puis la
  MORA de chaque zone qui en manque — seulement si la base a été reconstruite (sinon relief sans obstacles) ; une source
  en échec n'arrête pas les autres ; résumé en notification. « Actions à faire » ne liste plus que le manuel (commande
  du SIA, PDF, dossier X-Plane, fichiers à déposer) — téléchargements et MORA comptés sur une ligne « automatique » — et
  ses boutons sont compacts (`aeroAutoZones`, `aeroSelShow`).

- **Code source documenté et remis en forme** : fonctions du Tableau, des modules ODV partagés et du premier lancement
  commentées, docstrings des scripts `tools/` ; `tools/format_sources.py` coupe les lignes au-delà de 140 caractères
  (hors chaînes et gabarits), passé sur 122 fichiers et contrôlé par `tools/verify_format.html` (arbres syntaxiques
  identiques, modules ES compris) : lignes de plus de 300 caractères 1 212 → 711 (gabarits HTML et chaînes).
- **Premier lancement repensé** : bilan « Où en est la suite » en tête (données, git, dossier, compagnie, clé IVAO,
  pilote, identifiants du site, données aéronautiques ; Centre : flotte et journal, missions, utilisateurs, envoi des CR),
  six étapes (données, dossiers, compagnie, profil et identifiants, données aéronautiques, Centre pour les
  administrateurs) ; onglet « Premier lancement » dans Paramètres, carte de rappel sur l'accueil tant qu'il reste à faire.
- **Accueil généré depuis `repository_tree`** (barre latérale et onglets) : plus de liste écrite à la main qui prend du
  retard ; pages du Centre masquées tant qu'il est verrouillé.
- **« Ordres de vols » renommé « Tableau »** (EN Board, DE Einsatztafel, ES Tablero) : page, barre latérale, menu,
  rubrique de Paramètres › Centre, manuels ; fichiers et clés inchangés (`odv_orders.html`, `data/odv/`, `odvOrders`).
- **Renommage : DEFA Virtual → SO Group Virtual** (écriture statique dans les sources, les quatre langues et la
  documentation) : nom de la compagnie « SO Group Virtual » (`repository_tree.va`, en-têtes, pieds de page, PDF, YAML,
  sauvegardes) ; « DEFA » qualificatif retiré (« CR DEFA » → « CR » / « Report », flotte, référence, base, journal,
  trigramme, équipes et aéronefs du générateur, Planning ODV) ; logo générique (cible) ; couche de renommage pour une
  autre compagnie comparée désormais à la marque des sources. **Site de la compagnie** : réglage (Paramètres ›
  Installation › Sources et dossiers) ; les adresses par défaut (flotte.defa-virtual.fr) ne valent que pour DEFA
  Virtual — sinon aucun lien inventé, invitation à renseigner l'adresse (`RepositoryNav.siteLink`) ; libellés « site de
  la compagnie ». **Catégories de disponibilité** : « Exercice SOG », « Vol hors SOG »… (4 langues). En-tête du lanceur
  `X-SOG-Setup` (l'ancien `X-DEFA-Setup` reste accepté pour cette version : **relancer le lanceur** après la mise à
  jour) ; constante du générateur `ÉQUIPES_SOG` (l'ancien nom reste lu). Noms : « SO Group Virtual », nom long
  « Virtual Special Operation Group » (nouveau champ de Paramètres › Sources et dossiers, première mention de l'accueil,
  du premier lancement, des présentations et des manuels), sigle « SOG » ; champ `va` des nouveaux fichiers de
  données : le sigle réglé (les fichiers existants gardent « DEFA »). Couche de renommage pour une autre compagnie
  réparée (expressions régulières abîmées par fc0f4408).
- **Dossier d'une autre copie de la suite : confirmation explicite** : « Suite lancée depuis <dossier servi>, dossier
  déclaré <dossier choisi>. Cela peut conduire à des incohérences. Confirmer ? » (4 langues ; chemin complet du dossier
  choisi lu dans son repère `.defa_instance`, dont le lanceur écrit maintenant le chemin réel en 2e ligne — sinon son
  nom). Confirmé, le dossier et ce qui s'en déduit (data/missions, cr, sia…) sont lus ET écrits directement, avec un
  rappel du même message ; la confirmation est oubliée si le dossier est rechoisi sans elle. Non confirmé (choix
  antérieur), rien n'y est écrit et le message dit pourquoi, au lieu de « Dossier des données d'une autre copie… ».

### Corrigé

- **Reconstruction de la base aéronautique en échec** (« Cannot access 'aarExtra' before initialization », depuis la
  lecture de l'AIP militaire britannique) : la liste des axes de ravitaillement d'autres pays était utilisée avant sa
  déclaration ; aucune base ne se construisait, la MORA d'une zone n'était pas calculée.

- **MORA faussée par des pixels parasites du relief** : les tuiles de relief (Terrarium, AWS) portent des pixels isolés
  faux (5 389 m au bord de mer de La Réunion, trou de la source mal comblé) ; la MORA gardant le point le plus haut de
  chaque case, La Réunion sud sortait à 20 100 ft au lieu de 12 400 ft. Un pixel qui dépasse de plus de 1 000 m la
  médiane de ses 8 voisins est désormais écarté (un vrai sommet : 390 m au plus en z9, 70 m en z12 ; relevé sur le
  Mont Blanc, le Cervin, le Dru, l'Ossau et le Piton des Neiges). Les `mora.csv` déjà calculés gardent l'ancienne
  valeur : recalculer la zone (Paramètres › Maintenance › Données aéronautiques).

### Sécurité

Suite de l'[audit du 7 octobre](technique/AUDIT_SECURITE_2026-10-07.md), lots 1 à 3.

- **Lanceur fermé aux autres sites** : une page web quelconque lisait les fichiers `data/*.js` (trigrammes, vols,
  configuration) par `<script src="http://127.0.0.1:8000/…">`. Toute requête venue d'un autre site (en-tête
  `Sec-Fetch-Site`) est refusée, navigations comprises (page explicative et lien vers l'accueil). S'y ajoutent
  `Cross-Origin-Resource-Policy`, `X-Frame-Options` et `frame-ancestors`.
- **Plus rien de privé servi** : `secrets/` (clé IVAO, en clair), `data/local/`, fichiers et dossiers « . » (`.git` :
  seulement ce que lit le pied de page), listes de dossiers. Contrôle sur le chemin demandé et sur le chemin réel
  (casse, points finaux, flux NTFS, noms courts, liens).
- **Fichiers de données exécutés : format imposé** (`tools/data_guard.py`). Un `.js` de `data/` n'est servi, et commité
  par « Synchroniser », que s'il suit le format des fichiers de données (gabarit de `datafile.py` ou
  `window.NOM = littéral;`, exportations en liste fermée). Les fichiers HTML, SVG ou XML de `data/` sont servis en bac à
  sable.
- **Téléchargements** : la page ne demande plus qu'un motif déclaré par une source (`aero_zones.js`). Avant, `*.*`
  rendait tout le dossier.
- **Dépôt distant de `data/`** : un autre dépôt que celui en place (ou celui de la configuration) se confirme dans une
  fenêtre Oui / Non que le lanceur ouvre sur l'ordinateur. Elle montre l'adresse actuelle et la nouvelle, avec « Non »
  par défaut, et aucune page ne peut y répondre. Sans cela, une page piégée pouvait faire envoyer toutes les données
  ailleurs. Après un « Non », pas de nouvelle demande pendant 30 s. L'adresse ne peut plus contenir de mot de passe ou
  de jeton, ni commencer par « - ».
- **Git durci** : git pris par son chemin absolu hors du dossier de la suite ; `core.fsmonitor=false`,
  `protocol.ext.allow=never`, `submodule.recurse=false` sur chaque appel ; `--` devant les adresses. `lancer.cmd` ne
  lance plus un `py` ou un `git` déposé dans le dossier (`NoDefaultCurrentDirectoryInExePath`).
- **Archive des données** : ni dossier `.git` (commande lancée par git) ni exécutable n'est extrait.
- **XSS** :
  - couleur d'une catégorie de disponibilité ou d'un groupe, et couleurs des modèles d'ODV : vraies couleurs
    seulement (`RepositoryKit.cssColor`) ;
  - statut d'une mission dans le registre ;
  - profil de performance (nom, indicatif, immatriculation d'un appareil SimBrief, d'un `.lnmperf` ou d'un OFP) ;
  - altitude-densité du CR ;
  - version distante dans le badge de mise à jour (validée et échappée).
- **Aide** : `?doc=` limité aux documents de `docs/` (un document d'un autre site s'y chargeait) ; liens limités à
  `http(s)`, plus de `javascript:` ; messages à la page de la suite seulement.

### Livraison

- Archive de livraison : `xplane-web-suite-4.10.0.zip` — SHA-256 `d39a524833076d541ce746d280a8f0a5cd0a11dda34fac548ebf3a414cecf756` (code seul, hors dépôt : dossier `dist/`).

## [4.9.0] — 2026-10-06

Données aéronautiques d'autres pays : lecteurs AIXM 5.1, GeoJSON, OpenAir et X-Plane, téléchargements (openAIP, FAA,
ENAIRE), sources activables dans Paramètres › Maintenance › Données aéronautiques. Licences : code sous MPL 2.0, contenu
sous CC BY-SA 4.0, crédits de toutes les sources (`LICENSE.md`) ; les données de tiers ne sont plus publiées — types
d'aéronefs complétés sur chaque poste, type par type. Outil de livraison des versions (`tools/publish_dist.py`).

### Ajouté

- **Types d'aéronefs complétés sur chaque poste, type par type** : les bases OACI (Doc 8643) et EUROCONTROL
  (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) ne sont plus publiées (ignorées par git) ; Paramètres › Maintenance ›
  Références et dépendances, carte « Types d'aéronefs et performances » : un code saisi, les types inconnus, ceux de la
  flotte ou des missions — jamais toute la base EUROCONTROL (lanceur : `POST /__setup/aircraft-db`,
  `update_aircraft_db.py --only` puis `--apd`) ; liste des codes de la suite : `AircraftDB/aircraft_types.txt`.
  `LICENSE.md` : grille MORA (ODbL pour sa part OpenStreetMap) et axes ENR 5.7 calculés sur le poste, jamais
  redistribués.
- **Licences** : `LICENSE.md` — code sous Mozilla Public License 2.0, contenu (documentation, images) sous CC BY-SA 4.0
  (textes complets dans `LICENSES/`) ; licences et crédits exigés de tout ce qui vient de tiers (MapLibre, jsPDF,
  js-yaml, textures ambientCG, GeoNames, OACI, EUROCONTROL, SIA, DIRCAM, FAA, openAIP, ENAIRE, NATS, Mil AIP, X-Plane,
  Navigraph, OpenStreetMap, OpenTopoMap, OpenFreeMap, VersaTiles, Terrarium, Open-Meteo, mwgg/Airports, VATSIM, IVAO,
  SimBrief) ; pied de page : « © RBR » et lien vers les licences (à la place de « CC RBR ») ; README et présentations
  renvoient à `LICENSE.md`.
- **Logo générique** (cible, 8 variantes : flat, line, gloss, aqua, cabinet, field, flightlog, wood — `shared/icons/generic/`)
  en haut de la barre latérale quand la compagnie virtuelle n’est pas DEFA Virtual (ex. SO Group Virtual) ; le logo
  DEFA reste pour DEFA Virtual (Paramètres › Sources et dossiers).
- **Données aéronautiques d'autres pays** (`shared/aero_sources.js`) : lecteurs AIXM 5.1 (ENAIRE, NATS, DFS, FAA…),
  GeoJSON (openAIP, FAA ADDS — espaces à usage spécial, routes MTR en couloirs, classes —, générique), OpenAir et
  données de navigation de X-Plane (`earth_nav`, `earth_fix`, `earth_awy`, `earth_mora`) ; ajoutés sans doublon après le
  SIA dans la base (version 16, source de chaque espace) ; zones TSA, MOA, MTR, W, A dessinées et comptées dans les
  espaces à activer.
- **Paramètres › Maintenance › Données aéronautiques** (ancienne « Mise à jour SIA ») : sources actives ou non (SIA,
  DIRCAM, AIXM 5.1, GeoJSON, openAIP, X-Plane), fichiers trouvés, téléchargements ; dossier du simulateur X-Plane
  (Sources et dossiers).
- `tools/aero_fetch.py` : téléchargement des données libres (openAIP par pays, FAA, ENAIRE) dans `data/sia/<source>/`,
  en ligne de commande ou par le lanceur (`POST /__setup/aero-fetch`).
- `tools/publish_dist.py` (lanceurs `publish_dist.sh` / `.cmd`) : archive de livraison d’une version publiée,
  `dist/xplane-web-suite-<version>.zip` — le code seul au tag (ni `data/` ni `examples/`), vraies images LFS (pas de
  pointeurs), archive reproductible — empreinte SHA-256 et rubrique « Livraison » dans la section de la version.

### Livraison

- Archive de livraison : `xplane-web-suite-4.9.0.zip` — SHA-256 `0826c50f0764eb64b9913d3bf803593e331b9d6425fa00ecaad24185275b0da9` (code seul, hors dépôt : dossier `dist/`).

## [4.8.0] — 2026-10-05

Les données se partagent : bouton « Synchroniser » (dépôt git de `data/`, fusion fiche par fiche), utilisateurs et
droits, disponibilités en catégories configurables, index des données dans le navigateur. Paramètres en quatre pages ;
Aide intégrée (fenêtre au chapitre de la page, manuels utilisateur et administrateur en quatre langues, sans lanceur
aussi) ; documentation réorganisée. Mes missions : dossier animé selon le design, liste et dossier côte à côte. Briefs
traduits, compagnie virtuelle configurable, en-têtes de l'ordre selon la famille, onglets habillés par design.

### Ajouté

- **En-têtes de l'ordre selon la famille** pour Durci (EMA, BSPP, SSA, HIA, DCSSA, EMZD, DMD, CPCO), Cabinet (aéronautique
  navale) et Carnet de vol (protection civile, secours), avec le **tampon de l'émetteur** à la signature (Carnet de vol).
- `AppFramework.ask` : confirmation dans la page (fond d'un bloc du design, 4 langues) ; `RepositoryKit.viewHtml` et
  `RepositoryKit.tf` (phrase traduite à valeurs).
- Traductions (en, de, es) : Mes missions (dossier, plis, signet, fiche technique), fenêtre et dialogue d'affectation de
  l'ODV, semaines et filtres de l'ODV, générateur et studio, planificateur, Premier lancement.
- **Brief de mission traduit** : bloc `i18n` du YAML (réglage « Traductions » du générateur, `en` par défaut), lu par
  `shared/mission_i18n.js` ; Mes missions affiche le brief, les plis et les pistes dans la langue de la page (repli sur
  le français champ par champ). Doc : `docs/SIA_MISSIONS.md` § 2 sexies.
- Audit de sécurité (`docs/technique/AUDIT_SECURITE_2026-10-02.md`).
- **Livre de mission traduit automatiquement** quand la mission n'apporte pas sa traduction (pas de bloc `i18n`) :
  traducteur intégré du navigateur (Chrome / Edge, sur l'ordinateur, rien n'est envoyé), résultats gardés
  (`shared/machine_translate.js`) ; note en tête de l'ordre, bouton quand la langue doit d'abord être téléchargée.
- **Compagnie virtuelle configurable** (Paramètres › Sources et dossiers) : nom, sigle, centre, pages du site (log des
  vols, flotte, fiche appareil) ; DEFA Virtual par défaut (`repository_tree.va`, `RepositoryNav.va()` / `vaUrl()`) ;
  autre compagnie : « DEFA Virtual », « DEFA » et « CPCO » affichés avec ses valeurs dans toute la suite.
- Outil `tools/audit_i18n.html` : textes restés en français, page par page, dans une autre langue.
- **Journal DEFA** : favori « → Journal DEFA » (copie toute la page « Log des vols », tableau compris), collage du
  HTML du presse-papiers plutôt que du texte seul, bouton « Coller depuis le presse-papiers » ; adresse du log prise dans
  la configuration de la compagnie virtuelle.
- Planches contact des en-têtes de l'ordre de mission par organisme, pour chaque design à matières
  (`tools/planche_rubriques.py` → `docs/planches/`).
- **Dossier d'une autre copie signalé** : le lanceur écrit à chaque démarrage un repère (`.defa_instance`, ignoré par
  git) à la racine et dans `data/` ; un dossier autorisé qui n'est pas celui de la suite lancée (ex. « DEFA - Copy »)
  est confirmé au choix et marqué ⚠ avec une notification sur les boutons de dossier (`FileAccess.sameAsServed`).
- **Chiffons joués traités comme des missions** : chaque chiffon joué a sa mission d'équipe dans l'opération
  (`mission.role: chiffon`, piste de la Z reliée par `mission` et `takeoff`) — registre, affectation dans l'ODV sur la
  ligne de l'opération (décalage par rapport à H), Mes missions (brief, consignes, plis adressés par id de piste ou
  indicatif). Prompt du générateur mis à jour ; pour les opérations existantes, bouton « Créer les missions des
  chiffons joués » dans le bloc Opération du générateur.

- **Synchronisation des données** : bouton « Synchroniser (n) » de l'en-tête (`shared/sync.js`) — fichiers du pool
  commités au nom du trigramme connecté, fusion fiche par fiche par le lanceur (`tools/data_sync.py`), copies de
  conflit dans `_conflits/` ; dépôt git de `data/` (git@ ou https) renseigné et vérifié dans Premier lancement, sans
  bloquer. Architecture : `docs/technique/SYNCHRONISATION.md`.
- **Utilisateurs et droits** : fiches `data/utilisateurs/<TRI>.json` (rôle, actif, empreinte PBKDF2-SHA256 salée), mode
  `develop` / `production` (`data/config/suite.json`), connexion, changement et réinitialisation du mot de passe,
  usurpation par l'administrateur du Centre.
- **Disponibilités en catégories configurables** (Paramètres › Centre › Catégories, `data/config/disponibilites.json`) :
  palette d'une ligne par groupe, libellés abrégés (infobulles), plages précises à la minute, préférences de thèmes par
  domaine (Mon profil) ; ancienne grille horaire importée dans la semaine ; planning ODV aux couleurs des catégories,
  sessions ATC VATSIM / IVAO.
- **Index des données** (IndexedDB) : registres des missions et des CR, suivi du Centre, disponibilités et fiches
  utilisateurs lus par signature (`_index.json` tenus par le lanceur) ; « Index des données » dans Maintenance › caches.
- **Aide** : entrée « Aide » de la barre latérale (à la place de « Menu ») et ☰ › Aide, en fenêtre au-dessus de la page,
  au chapitre de la page en cours ; index documentaire, sommaire, recherche ; **manuels utilisateur et administrateur**
  (un chapitre par page, une section par bloc) en français, anglais, allemand et espagnol ; documents intégrés
  (`apps/aide/docs_bundle.js`, `tools/build_docs_bundle.py`) pour l'ouverture sans lanceur.
- **Mes missions : dossier animé** selon le design — ouverture et fermeture propres à chacun (Cabinet : liasse sortie
  du range-dossier, couverture tournée ; Carnet de vol : carnet sorti de l'enveloppe) ; changement de mission : le
  dossier se referme, part à gauche, le suivant arrive de la droite et se rouvre s'il l'était.
- **Paramètres en quatre pages** : Mon profil, Centre, Installation, Maintenance.
- **Flotte DEFA** : « Coller la page Flotte du site… » (Paramètres › Maintenance › Flotte DEFA).
- Barre latérale configurable (Apparence) ; Apparence, Paramètres et Aide fixés en bas ; bouton « Missions » du
  générateur et du studio.
- Onglets de page habillés par design à matières (Carnet de vol, Cabinet, Durci, Aqua).
- Planning ODV : résumé d'une mission probable déplié sous sa ligne.
- Outils : sommaire `tools/index.html`, jeu de test fantôme, `tools/cabinet_layers.py` ; lanceur `--data <dossier>`
  (servir une copie des données pour les essais).

### Modifié

- Boîtes natives (`confirm`, `alert`) remplacées par la confirmation dans la page et les notifications (gardées : sortie
  de page, fermeture synchrone de la fenêtre d'un créneau, changement d'identifiant du générateur).
- Visionneuse commune pour le registre des missions (YAML, Markdown, versions, cartes).
- Plus de galon sous le bandeau des designs à matières ; bouton désactivé nettement grisé (Cabinet, Carnet de vol).
- Couche de traduction : comparaison sans la typographie de la langue ; libellé court suivi d'une flèche de tri.
- Mes missions : dates et semaine dans la langue de la page ; liste et grille redessinées au changement de langue ;
  rubriques du résumé « pli / plis » de nouveau écartées du dossier (expression abîmée par un caractère de contrôle).
- Traductions : générateur, studio, Cartes de vol, planificateur, ODV (infobulles des zones calculées, créneaux, jours),
  Paramètres, Premier lancement, en-têtes des CR (« FIRE / GAAR — Compte rendu de mission ») ; la couche de traduction
  reconnaît « début libre — texte connu », traduit les infobulles des zones calculées et ne dépend plus du rafraîchissement
  de l'écran (onglet en arrière-plan).
- IVAO et VATSIM à égalité : légende des codes de disponibilité neutre (« Exercice SO (IVAO / VATSIM) »…), favori du CR
  présenté pour le tracker IVAO et StatSim (VATSIM).
- **Lecture des missions et affectations plus fluide** : petite base de fichiers dans `assignments.js` (lectures
  gardées en mémoire et revalidées par requête conditionnelle, fichiers absents compris ; invalidation entre onglets
  `defa-data` ; écritures des affectations, du journal et des disponibilités sous verrous Web Locks) ; plus de relecture
  par le dossier autorisé quand il est celui de la suite servie ; registre : relecture incrémentale du dossier (dossiers
  inchangés repris sans réanalyse) et `mission_registry.yaml` réécrit seulement s'il change ; Mes missions se met à jour
  dès qu'un autre onglet écrit une affectation.
- Sources remises en forme (`tools/format_sources.py`) ; commentaires d'en-tête et `docs/technique/FRAMEWORK.md` à jour.
- **Mes missions** : liste et dossier côte à côte, disponibilités en dessous sur toute la largeur ; bloc « Pilote »
  remplacé par trois boutons vers Mon profil (Pilote, Appareils maîtrisés, Simulateurs) ; appareils et simulateurs
  saisis dans Paramètres › Mon profil.
- **Documentation réorganisée** : au premier niveau de `docs/`, installation, paramétrage, utilisation et versions ; la
  documentation technique (architecture, synchronisation, feuille de route, dette technique, audits, propositions)
  dans `docs/technique/`.
- Planning ODV : classeur ODV masqué par défaut ; changement de créneau sans clignotement.
- Performances : audit et actions de priorité 1 et 2 (`docs/technique/perf/`) ; changement de page par les onglets et
  décor recalculé sans clignotement.
- Versions de cache : l'empreinte des images d'un script ne couvre que les images suivies par git.
- Aqua : bannière livrée en bas de page (sombre / clair selon le ton) ; Durci : poignées latérales retirées.

### Corrigé

- Disponibilités : plus de perte en changeant de semaine.
- Mes missions : le livre ne clignote plus au clic sur une mission ; cartes sans doublons ; CR créé depuis une mission
  avec l'immatriculation de l'appareil affecté.
- Cartes de vol : mission reçue plus remplacée par « Tracer » / « Carburant ».
- Atterrissages : plusieurs fichiers CSV / LOG lus ensemble (bouton et glisser-déposer).
- Paramètres › Centre : utilisateur ajouté affiché aussitôt ; préférences de thèmes lisibles en Cabinet et Carnet de vol.
- Plaques de titre : plus de texte qui déborde dans une colonne étroite.
- Données lues là où elles sont écrites (alerte sinon).

### Sécurité

- Lanceur : en-tête `Host` de la machine exigé (parade au « DNS rebinding »), envois limités à 512 Mo, `nosniff`,
  identifiants framagit sans retour à la ligne.
- Planificateur : commentaire et noms de phase d'un profil importé échappés.
- Webservice d'envoi des CR : `https://` obligatoire (hors localhost).

### Livraison

- Archive de livraison : `xplane-web-suite-4.8.0.zip` — SHA-256 `ae688fc9cf1479f5442d9b6700c105cb01e54050370c9829da166932cc5d48ff` (code seul, hors dépôt : dossier `dist/`).

## [4.7.0] — 2026-10-02

Exercices et plis scellés : les messages et pistes d'un exercice arrivent au pilote dans des enveloppes cachetées,
derrière le signet de son dossier de mission, ouvertes à leur heure ; le Centre affecte une opération entière (toutes
ses missions, une heure H) d'une seule ligne de l'ODV. Lanceurs et page « Premier lancement » ; décor complet et Aqua
par défaut ; galons argent / or ; signets, enveloppes et appareils de page dans les quatre designs à matières.

### Ajouté

- **Lanceurs** `lancer.cmd` (Windows) et `lancer.sh` (macOS / Linux) : Python trouvé ou installé, données récupérées,
  serveur local démarré, navigateur ouvert sur la page **Premier lancement** (`tools/launch.py`).
- **Premier lancement** (`apps/settings/premier_lancement.html`) : données (identifiants framagit ou archive reçue par
  mail ; journal des vols DEFA en option), profil (trigramme, IVAO, VATSIM, SimBrief, identifiants du site DEFA hors
  sauvegardes), dossiers (dossier de l'application, classeur ODV : OneDrive ou fichier Excel), puis mise à jour SIA ;
  bouton « Nettoyer et recommencer ».
- Planning ODV : classeur rouvert à l'arrivée (dossier OneDrive, sinon copie gardée du dernier classeur).
- **Plis scellés de l'exercice** (« Mes missions ») : événements adressés à l'équipage (ou émis par lui : « message à
  transmettre ») dans l'enveloppe cachetée du design, derrière le signet (page « Informations complémentaires », 4
  langues) ; heure d'ouverture calculée (décollage du participant, décalage, passage du point), ouverture automatique
  à l'heure, scellé brisé d'un clic sur l'enveloppe (confirmation en deux temps avant l'heure), « Resceller » ; pistes
  et cartes d'exercice visibles seulement dans le pli ouvert.
- **Journal des gestes du pilote** (`LocalStore.logEvent`, `kind: 'mission'`) : mission ouverte ou rescellée, plis
  ouverts (à l'heure, avant), rescellés, envois vers les Cartes de vol, le carburant, le CR — base du CR prérempli.
- **ODV, opérations à plusieurs missions** : une ligne, une coche, un poste par équipage de chaque mission, « +
  équipier » sous chaque équipage, enregistrement de toutes les missions d'un coup ; **heure H** de l'opération et
  décollage de chaque équipage à H + son décalage, convoyage calculé sur ce décollage.
- **ODV** : « Modifier » montre les missions enregistrées du créneau, préremplies ; vols de la frise horaire →
  « Planifier… / Modifier… » ; choix de la semaine (précédente, suivante, en cours, semaine du classeur) ; convoyage
  par un tiers = mission (« à affecter », puis confiée) ; décollage avancé ou choisi ; missions sur plusieurs
  créneaux ; appareils compatibles seulement, triés par distance, temps de convoyage affiché ; missions probables
  pondérées par les CR de la famille.
- **Heure d'exercice** : une seule référence (H, T ou M), décalages avec leur unité (`H+2mn`, `H-20mn`, `H+1h`) ;
  lecture et écriture communes (`RepositoryKit.hOffset` / `hText`) ; éditeur, prompt du générateur et doc.
- **Visionneuse d'image commune** (`RepositoryKit.viewImage` : croix, Échap, taille réelle au clic) : cartes de
  « Mes missions ».
- **En-tête de l'ordre de mission selon la famille** (Aqua : 9 émetteurs).
- **Designs** : galons (argent, or au Centre) dans les quatre designs à matières ; signets (Aqua, Durci) et enveloppes
  de pli par design ; appareil de page d'Aqua (défibrillateur, moniteur) ; nouvelle frise de pied de page d'Aqua ;
  panneaux du ton sombre d'Aqua et du Carnet de vol ; feuille de registre d'Aqua (porte-bloc, pince, en-tête CPCO-DEFA).
- **Pied de page en `file://`** : numéro de commit lu dans `config/build.js` (crochets git ; `sh tools/install_hooks.sh`
  une fois par clone).
- `tools/assets_status.py` : inventaire des assets des designs.

### Modifié

- Racine rangée : `README.md` pour débutant, documentation dans `docs/` (sommaire), configuration dans
  `config/repository_tree` ; `repository_tree` à la racine ne reste que comme relais pour le contrôle des mises à jour
  des versions 4.6.0 et antérieures (bloc release seul, généré par `tools/bump_versions.py`), à retirer en 4.9.
- Paramètres › Sources et dossiers : dossier du dépôt en tête ; le choisir règle data/, ses sous-dossiers et la
  sauvegarde locale.
- **Décor complet par défaut** partout, **Aqua design par défaut** d'une nouvelle installation.
- **Convoyage** : le pilote convoyeur ne reçoit que l'ordre de convoyage (appareil, départ, arrivée, heure).
- **Une mission par pilote et par tranche** (matin, après-midi, soir), convoyeurs compris.
- **Mes missions** : dernière page du dossier à gauche, signet posé à la fin du dossier (il tourne avec la page) ;
  fiche technique lisible (libellés, tableaux, coordonnées ; ni pistes ni injects) ; cartes de pistes retirées des
  cartes fournies.
- Fenêtres d'affectation lisibles dans les designs à matières (fond d'un bloc), ancrées sur l'élément en cours de
  saisie ; bouton « Enregistrer dans le dossier » au style « danger » du design, sur une ligne.
- Framework : jeton d'angles `--repo-round` ; panneaux de blocs sur une seule classe ; fonds illustrés (BG) retirés.

### Corrigé

- Pages `*_core_*` de FIRE / HEMS ressuscitées par erreur en 4.6.0 : retirées.
- ODV : une mission d'exercice n'affecte plus toutes les équipes de l'opération ; mission d'organisation (…Z) jamais
  proposée ; distance et convoyage pour toutes les missions (départ par position) ; appareil déjà affecté grisé.
- Planificateur carburant : appareil de la mission transmise sélectionné ; SimBrief : sa réponse au lieu de
  « indisponible ».
- Landing : « Cannot access 'esc' before initialization ».
- Signets : clignotements et sauts au tournage des pages ; numéros de page sans saut.

## [4.6.0] — 2026-10-01

Affectation des missions aux pilotes et page pilote « Mes missions » : la mission arrive scellée dans un dossier propre
à chaque design (dossier ficelé du Cabinet, enveloppe cachetée du Carnet de vol, porte-documents noué d'Aqua, dossier
zippé de Durci), s'ouvre comme un livre dont on tourne les pages ; Planning ODV dense ; échappement HTML commun.

### Ajouté

- **Affectation des missions aux pilotes** : bouton « Affecter… » du registre (pilotes, appareils, heure, astreinte,
  convoyage, postes par équipage, conflits), vivier de pilotes disponibles possédant l'appareil, matrice d'un créneau
  ODV, journal des affectations (date, qui, quoi, à qui) ; trigramme dans le profil pilote ; bloc `alert` (astreinte)
  dans le prompt du générateur. Conception : [docs/AFFECTATION_MISSIONS.md](technique/AFFECTATION_MISSIONS.md).
- **Page pilote « Mes missions »** : missions de la semaine, disponibilités aux codes et couleurs de l'ODV, appareils
  du pilote ; pli cacheté dans l'en-tête pour une mission non lue ; transferts Cartes de vol, Carburant, CR.
- **Dossier de mission** dans les designs à matières : mission non lue scellée (ficelle et cachet, ruban noué,
  enveloppe cachetée, ficelle en croix), ouvrir brise le sceau ; dossier ouvert en livre (page 1 l'étiquette, puis
  l'ordre avec l'en-tête du design, le détail, les cartes posées, objectifs et signature), pages tournées autour du dos
  par le coin corné ou un clic, numéros en bas de page ; signets (Cabinet, Carnet de vol) qui mènent à la dernière
  page ; tampons « CONFIDENTIEL », « URGENT », « DIFFUSION RESTREINTE ».
- **Planning ODV** : grille dense, déclarations des pilotes, missions probables, simulateurs abrégés et colorés,
  affectation depuis un créneau, en-têtes en icônes.

### Modifié

- Modules applicatifs : l'échappement HTML commun (`RepositoryKit.esc`) remplace 24 copies ; `kit.js` chargé avant
  tout module qui s'en sert.
- Versions de cache : les images des styles d'une page sont versionnées (`url("…?v=…")`), comme les scripts.
- INSTALL : Brave uniquement en mode serveur local, accès aux dossiers à activer.
- Images sources ChatGPT orphelines retirées du dépôt (86).

## [4.5.0] — 2026-10-01

CR FIRE / GAAR et HEMS / MEDEVAC sur le Mission Core (toutes les familles de CR partagent le même socle) ; toolkit
phase 3 (couches CSS : les designs l'emportent sans `!important`, rendu inchangé au banc) ; palette commune des outils
sombres ; messages clairs quand le navigateur ne permet pas de choisir un dossier (Brave, http, Firefox).

> **Annonce : suite du refactoring du toolkit.** La phase 3 (couches CSS, retrait des `!important`) se poursuit et
> pourra encore modifier légèrement l'apparence des designs à matières. Plan :
> [docs/REFACTORING_TOOLKIT.md](technique/REFACTORING_TOOLKIT.md).

### Ajouté

- Générateur : durée de l'opération en tailles (XS · S · M · L · XL, de 30 min à 8 h).
- Pied de page : numéro de commit entre deux versions (`v4.5.0+abc1234`).

### Modifié

- Planificateur carburant : nom d'appareil « référence surnom — constructeur » (plus de nom tronqué sur l'essentiel).
- Renforts `:not(#imp)` sans effet (audit sur toutes les pages × designs × tons, `tools/imp_audit.html`) rendus à
  leur règle d'origine : 113 règles ; rendu inchangé au banc.

- Framework : socle, styles des pages et styles posés par les scripts rangés dans une couche CSS `app` (MapLibre en
  `lib`, en dessous) ; les designs, hors couche, l'emportent sans `!important`. Les `!important` du socle et des pages
  sont convertis en sélecteurs renforcés (`:not(#imp)`) ; rendu inchangé au banc de non-régression.
- Banc de non-régression : un panel réduit se compare au *snap* du panel complet.
- CR FIRE / GAAR et HEMS / MEDEVAC : les pages du Mission Core remplacent les pages historiques, à la même adresse
  (mêmes champs ; anciens registres CSV importables depuis la page : « Importer l'ancien registre … »). Toutes les
  familles de CR partagent désormais le même socle.
- Outils à fond sombre (Landing, planificateur, planning ODV, reporting des opérations) : une palette commune aux noms
  de la palette claire, atteinte par les designs ; la Landing et le reporting des opérations changent de quelques
  nuances.
- Designs : leurs `!important` convertis eux aussi (`designs.css` 29 → 0, `designs_skeuo.css` 279 → 32 : impression,
  masquage et quatre cas contre un style en ligne) ; rendu inchangé au banc.

### Corrigé

- Choix d'un dossier (Paramètres › Sources et dossiers, registres, sauvegarde) dans un navigateur qui ne le permet
  pas : au lieu de « File System Access API (Chrome / Edge) », un message qui dit quoi faire — Brave : activer
  `brave://flags/#file-system-access-api` puis relancer ; page en http hors localhost : ouvrir par 127.0.0.1 ;
  Firefox, Safari : Chrome ou Edge. Affiché en notification.
- Paramètres › Maintenance sans dossier `data/` : plus de requêtes vers `data/` ni vers `VERSION.json` (404 en
  console) ; seul reste le 404 de `data/data_tree.js`, qui détecte l'absence des données.


## [4.4.0] — 2026-09-30

Nouvelle famille COMBAT (combat aérien : BFM, ACM, DACT, interception) ; identifiants de mission liés migrés d'un bloc
au lieu de casser l'opération ; enregistrement dans le dossier des missions qui dit toujours pourquoi il échoue ;
toolkit phase 2 terminée (jetons, boutons communs, feuille de registre commune), barres de progression et
notifications dans la matière des designs ; début de la phase 3 (couches CSS).

- **Designs à matières — barres de progression et notifications** : `<progress>` (tâches longues, jauges des pages)
  dans la matière du design (piste creusée ; laiton de Cabinet, encre du Carnet de vol, voyants verts de Durci, gel rayé
  d'Aqua), angles vifs, balayage quand l'avancement est inconnu, sans mouvement si le système le demande ;
  notifications flottantes dans la matière des menus (jetons `--sk-prog-*`, `--sk-menu-*`).
- **Registre — feuille de registre** : carte posée sur la feuille (détail d'une mission) en papier punaisé à encre
  foncée dans les trois designs à feuille (Durci : plus de plaque d'acier illisible) ; règles communes par jetons
  `--sheet-*`. Bouton ☰ centré dans tous les designs. Studio cartographique : « Enregistrer dans le dossier » affiche
  toujours son résultat (succès, échec et cause). Fenêtres du Mission Core : texture du design rétablie.
- **Toolkit — phase 3 (couches CSS), début** : banc de non-régression par page et en design « standard » ; 52
  `!important` retirés des styles de 5 pages (banc : aucun écart) ; `tools/strip_page_important.py`. Les pages COMBAT,
  copiées pendant l'essai de couches, sont de nouveau habillées par les designs.
- **Missions — identifiants liés** : changer l'identifiant d'une mission d'opération (générateur : champ quitté, ou
  identifiant hors format corrigé à l'enregistrement) propose une migration globale — toute l'opération si la base
  change (`BFM-001C` → `A-001C` migre `BFM-001` → `A-001` : missions, organisation, participants de l'exercice, noms
  des cartes, textes, famille ; ancien identifiant dans `mission.former_id`) — sinon l'identifiant est rétabli.
  Pendant la saisie, la mission garde sa place dans le lot (plus d'écrasement d'une autre mission par un identifiant
  partiel ou en double). Missions déjà rangées : `tools/migrate_operation_ids.py`. Dossier des missions : cause
  précise de chaque échec (sélecteur, autorisation, écriture, identifiant hors format) au lieu de « non autorisé ».
- **Nouvelle famille COMBAT — combat aérien / entraînement chasse** (lettre A : missions `A-001`, CR `CRA-001-1`,
  `CRA-A01-0`) : sous-types BFM (combat rapproché), ACM (combat aérien manœuvrant), DACT (adversaire dissemblable),
  INTERCEPT (interception d'entraînement, identification visuelle). CR et reporting (`apps/cr/COMBAT/`) : dispositif et
  zone (TSA / CBA / zone D, bloc d'altitude, plancher de sécurité, format 2v2…, adversaire, contrôle, joker / bingo),
  engagements (situation de départ, armement simulé, tirs valides, issue — victoire, défaite, nul, knock-it-off),
  bilan de la séance ; statistiques (engagements, victoires, tirs valides, KIO) et résumé automatique. Générateur de
  missions : famille, règles des zones d'entraînement, Mirage 2000 (MIR2) parmi les appareils. La police du ciel réelle
  reste en COMMAND / AIR_POLICING, le ravitaillement en AAR.
- **Toolkit — phase 2, premiers chantiers** : feuille de registre à éléments facultatifs (valeurs par défaut) et bloc
  « découpe » réécrit par `tools/cut_register_sheet.py <design> --write` ; carnet des aperçus devenu composant commun
  (`.repo-notebooks` / `.repo-notebook`, `designs_skeuo.css`) ; contrôle des images `tools/check_assets.py` (format,
  poids, absentes, orphelines), lancé par `bump_versions.py`.
- **Toolkit — phase 2, suite** : pastilles de code (`--sk-code-*`) et polices des boutons et liens-boutons
  (`--sk-btn-family`, `--sk-lbtn-family`) par jetons ; tonalité des surfaces `html[data-surface]` (« dark » pour Durci,
  dont les blocs sont sombres, et pour tout ton sombre ; déclarée dans le registre des designs : `surface:"dark"`) :
  encadrés d'état écrits pour elle au lieu d'une liste de designs. Rendu identique (banc).
- **Boutons — convention commune** (tous les designs à matières) : 1ᵉʳ bouton de l'en-tête principal, les suivants
  secondaires ; liens secondaires et « Ajouter des fichiers » secondaires. Changements visibles : Cabinet et Carnet de
  vol (2ᵉ bouton de l'en-tête de l'éditeur de mission en parchemin), Aqua (« Ajouter des fichiers » en verre).
- **Toolkit — phase 2** : frise du pied de page déclarative (liste de composants : bande, plaque, radar, voyant de
  sauvegarde) au lieu d'un gabarit HTML propre à Durci.
- **Toolkit — phase 2** : cadre de la page (`--sk-page-*`) et vis des coins de l'en-tête, des blocs et des sous-cartes
  (`--sk-corner-screw`, `--sk-*-screw-*`) par jetons : une règle par emplacement au lieu d'une par design. Rendu
  identique (banc).
- **Toolkit — phase 2** : emblème de l'en-tête (`--sk-emblem-*`, mobile compris), lien « choisir » des zones de dépôt
  (`--sk-pick-shadow`, `--sk-pick-family`), pied de page, ligne de base et police des graphiques du reporting
  (`--sk-chart-base`, `--sk-chart-font`) par jetons. Rendu identique (banc).
- **Toolkit — phase 2** : textes courants des blocs (encre du design) et police des libellés par jetons, règles jumelles
  de Cabinet et Durci retirées (dont couleurs mortes des petits textes de Cabinet). Rendu identique (banc).
- **Toolkit — phase 2** : ombre de la barre latérale, ombre et liseré intérieur des bandeaux, encre des sous-cartes par
  jetons (valeurs relevées sur le rendu actuel : aucun écart) ; banc de non-régression étendu (Planning ODV, registre
  des missions, Paramètres ; bandeaux, feuille de registre, commandes des tableaux).
- **Toolkit — phase 2** : titre de l'en-tête par jetons (`--sk-title-*`) ; plaque de titre du Carnet de vol par les jetons
  communs des plaques ; code mort retiré. Rendu identique (banc).
- **Tableaux des designs à matières** : lignes resserrées (boutons et champs compacts dans les cellules : 45 → 33 px
  dans le registre des missions) ; Durci : type de mission (gras) à l'encre foncée sur la feuille de registre.
- **Textes secondaires des pages** (`var(--muted)`) : encre secondaire du design dans les blocs des designs à cadre
  (sous-lignes des dossiers de Paramètres illisibles en Carnet de vol).
- **Toolkit — phase 2** : sélecteurs segmentés d'Aqua dans les règles communes (jetons de fond de segment et de
  rayon) ; entrée courante de la barre latérale par jetons (`--sk-nav-on-bg`, `--sk-nav-on-edge`, règle de base).
- **Carnet de vol** (feuille de registre) : en-tête entier, fondus courts (le fondu mangeait le texte).
- **Planificateur de vol** : courbe RPM / consommation au même habillage que les autres graphiques (grille, courbe
  nominale, bornes en pointillés, curseur ; écran d'instrument dans les designs à matières).
- **Appareil de page** : entre les blocs 2 et 3 (une page à trois blocs, comme le registre des missions, l'accueille).
- **Versions de cache par empreinte** (`tools/bump_versions.py`) : `?v=` = empreinte du contenu du fichier visé (au lieu
  d'une date à lettres) ; une page ne change que si l'un de ses fichiers change ; feuilles de design chargées avec
  leur propre version (table `FILE_V`) ; versions écrites à la main dans trois scripts (extensions, traductions GAAR
  et HEMS), figées depuis le 23 septembre, désormais tenues à jour.
- **Code lisible** : JavaScript, CSS et scripts / styles des pages remis en forme (118 fichiers : une instruction et une
  déclaration par ligne), sans changer le code — contrôle avant / après des arbres syntaxiques et des règles CSS
  (`tools/format_sources.py`, `tools/verify_format.html`) ; éditeur de mission : chaque fonction commentée.
- **Toolkit — phase 2, jetons des designs à cadre** : règles jumelles de Cabinet et Durci (pastille d'étape, titres
  de sous-cartes, zones de dépôt, icône des bandeaux, focus, pied de page, sélecteur segmenté) fusionnées en règles
  communes à jetons ; code mort retiré. Rendu identique (banc de non-régression).
- **Panneaux de fond** (Cabinet, Durci) : atténués de façon uniforme, plus de dégradé en transparence vers la gauche.
- **Durci** : poignées latérales regénérées (poignée à grip, nette) ; poignée horizontale et barre fine remplacées.

## [4.3.1] — 2026-09-30

Toolkit refactoré (phase 1) ; feuilles de registre, carnets du Studio et appareils de page pour Cabinet, Carnet de vol
et Durci ; tâches longues avec barre de progression et garde de sortie de page.

- **Toolkit — boîte à outils commune** (`shared/kit.js`, `window.RepositoryKit`) : échappement HTML, langue et
  traductions, stockage local protégé, couleurs et contraste WCAG ; chargée par toutes les pages avant
  `repository_nav.js` ; le socle (`repository_nav`, `block_icons`, `appearance_page`, `app_framework`, `file_access`,
  `suite_update`, `design_deco`) l'utilise à la place de ses copies ; API de `RepositoryNav.appearance` reformatée.
- **Toolkit — registre unique des designs** : `REPOSITORY_TREE.designs.list` porte `skeuo` et `chart` ; palette et
  relief des graphiques, logo, dossier des icônes (`appearance.iconFolder`) et jeux du générateur d'icônes en sont
  déduits ; attribut `html[data-skeuo]` pour la CSS commune aux designs à matières (63 listes de designs remplacées).
- **Toolkit — CSS par jetons (en cours)** : 103 jetons `--sk-*` par design et par ton ; en-tête, menus, blocs, cartes,
  zones de dépôt, bandeaux, champs, boutons, liens-boutons, barre latérale, pied de page, barre d'action, outils de bloc
  écrits une seule fois ; règles propres aux CR, à l'éditeur de mission, au planificateur et à l'Apparence rangées dans
  leurs feuilles. Rendu identique (banc `tools/skeuo_regression.html`), `!important` 551 → 328.
- **Cabinet** : plus de rose des vents en filigrane des blocs (les panneaux les habillent) ; feuille de registre redécoupée
  (pages qui dépassent du livre en haut à gauche, tranches raccordables arrêtées aux coins, coins fondus, N° et tampon
  « Diffusion restreinte » à droite, ficelle et œillets posés sur le dos).
- **Landing Performance** (designs à cadre) : barre d'analyse de nouveau fixée en bas de page (les designs forçaient la
  position des blocs : barre décalée à droite dans la page).
- **Durci** : vis cruciformes découpées dans la planche enfin appliquées (règle neutralisée par un commentaire mal fermé).
- **Centre** : fond des icônes par convention de nom (`vierge.rouge.webp`, cuivre, pour Cabinet, Carnet de vol et Durci ;
  à défaut `vierge.gris.webp`) ; option `centreBg` du générateur retirée.
- **Appareil de page** : entre les blocs 3 et 4 pour tous les designs (constante `DEVICE_AT`), plus entre les deux
  premiers ; Carnet de vol : carnet de cuir fermé et DME.
- **Décors** : `design_deco.js` réorganisé et documenté (familles de décors, formats des tableaux de réglage) ; plus
  d'objet posé sur une feuille de registre.
- **Feuille de registre** : géométrie par design (jetons `--sh-*` : coins, bandes, papier, marges, en-tête, accessoire du
  bord gauche) ; `tools/cut_register_sheet.py` générique (une configuration par design, jetons affichés). **Durci** :
  carnet de terrain dans sa pochette olive (coins entiers, bord droit redressé, intérieur réglé effacé), crayon dans son
  étui élastique hors de la fermeture éclair (marge `--sh-gut`), encre foncée sur le papier ; tableau resserré ;
  Carnet de vol reprend le dossier de Cabinet (en attendant son en-tête).
- **Durci** : appareil de page = câble et poste radio de face (entre les blocs 3 et 4) ; crayon parmi les objets (le câble n'y
  est plus) ; génération de cartes : carnet fermé tant qu'aucune carte n'est affichée, carnet ouvert sous chaque carte.
  Plus de défilement horizontal de 10 px (poignées latérales débordant de la marge).
- **Carnet de vol** : sa propre feuille de registre (carnet de vol toilé, en-tête imprimé « République française —
  Carnet de vol », cachet « Autorisation de transit » à droite, ficelle sur le dos) ; carte de navigation (objet)
  reconvertie (PNG de 2,9 Mo → WebP de 90 Ko).
- **Studio cartographique** (Cabinet, Carnet de vol, Durci) : carnet des aperçus commun aux designs à cadre (jetons
  `--nb-*`) ; carnet de cuir bleu pour Cabinet et Carnet de vol ; carnet fermé à la hauteur du carnet ouvert, à la
  place du premier aperçu, calé à droite (il s'ouvre vers la gauche) ; un clic sur le carnet actualise les aperçus. Aperçu agrandi : un clic le ferme.
- **Barres d'action** (designs à matières) : au-dessus des objets posés entre les blocs.
- **Tâches longues** (socle, `AppFramework.task`) : barre de progression flottante et avertissement avant de quitter
  la page (fermeture, rechargement, lien interne) tant qu'une tâche tourne ; Studio : aperçus des cartes (une mission
  ou toutes), génération (une mission ou toutes ; remplace la barre du pied de page) ; registre : lecture du dossier des
  missions ; Paramètres : calcul complet MORA ; import SIA (garde de sortie, erreurs relayées en notifications).
- **Durci** (feuille de registre) : crayon contre la pochette, un peu caché par la fermeture éclair ; coins droits
  redressés comme la bande de droite (tous sur la même verticale).
- **Appareil de page** (designs à matières) : déplaçable latéralement (glisser), position gardée par design ; réduit à
  la largeur de sa colonne s'il la dépasse ; dessiné devant le bloc au-dessus. Durci : câble lové et grand poste radio
  dont l'antenne dépasse sur le contenu au-dessus.
- **Durci** : poignées latérales au premier plan (devant l'en-tête collant), davantage sur la page.
- **Décors** : images inutilisées retirées (fond « carte de cuir » du Carnet de vol) ; vérification croisée images ↔ code.
- **Barre latérale** : contenu un peu descendu (logo DEFA centré dans sa case).
- Proposition de phase 2 du refactoring (supprimer les exceptions ; assets à fournir) : `docs/REFACTORING_TOOLKIT.md`.

## [4.3.0] — 2026-09-30

Décors des designs à matières : objets, panneaux de fond par thème, feuille de registre et appareil de page ; icônes
composées pour tous les jeux skeuomorphes ; contrastes (Planning ODV).

- **Icônes** : Cabinet, Durci et Carnet de vol passent aux icônes composées (fond vierge + glyphe du registre) ; nouveaux
  glyphes `trending-up` et `shield` ; les commandes à ChatGPT prennent l'icône `sparkles`.
- **Panneaux de fond par thème** (Durci, Cabinet) : chaque bloc reçoit un panneau en rapport avec son contenu (appareils,
  terrains, horaires, radio, navigation, équipement, résultats, familles, opérations), choisi d'après son titre, puis son
  icône, puis son sous-titre ; en paysage ou en portrait selon la forme du bloc ; blocs imbriqués : un seul fond, sur le
  grand. Cabinet : jeu « 1930 » marine en ton sombre, ivoire en ton clair (dossier réglable pour un futur jeu « 1800 »).
  Les fonds illustrés propres à Cabinet et Durci sont retirés (les panneaux les remplacent).
- **Feuille de registre** (Cabinet, ton clair) : les blocs de tableau des registres et journaux prennent le dossier
  « Aéronautique navale » en fond (en-tête imprimé et tampon, dos et ficelle, pages empilées), contenu décalé à l'intérieur.
- **Appareil de page** (Cabinet) : livre de bord et poste radio dans un emplacement réel entre les deux premiers blocs.
- **Objets** : Durci (grille d'aération, lampe, plaque vierge, blindage, interrupteur, câble, cadran) ; Cabinet (objets
  « 1930 » : cartes, règle parallèle, porte-mine, sextant, valise, enveloppes, étiquette « Top secret »…) ; objets posés
  dans un bloc (ordre de mission, étiquette) ; objets entre les blocs décalés et inclinés au besoin. Ménage : objets en
  double ou de moindre qualité retirés, panneaux allégés (décors Cabinet et Durci : 9,7 → 4,7 Mo).
- **Contrastes** : panneaux calés à droite et estompés côté texte ; voile à la couleur du design sous les tableaux et les
  données (`--repo-veil`) ; Durci : panneaux assombris ; Planning ODV : détail d'un créneau en sous-bloc habillé,
  avertissements lisibles en ton clair.

## [4.2.1] — 2026-09-29

- **Carte du bloc Route** : les points tournants de la mission déjà portés par la route éditable ne sont plus dessinés une
  seconde fois (plus de double pastille ni de double étiquette) ; les points hors route (rendez-vous, cible…) restent.

## [4.2.0] — 2026-09-29

Planning ODV (Centre), bloc Route (plan de vol case 15 lié à la carte et à la coupe verticale, voies aériennes, RTBA,
SimBrief, points de report VFR), plan de vol unique entre planificateur carburant et Cartes de vol, masse au décollage
prévue, journal des alertes, icônes composées (fond vierge + glyphe) et sélecteur segmenté des designs à matières,
plans trois vues du Carnet de vol.

À la mise à jour : relire le dossier SIA une fois (base au format 15 : points de report VFR).

- **Bloc Route** : réglages du profil de la carte affichée (fond, zones, symboles, éléments) avec le choix de la carte et
  de son profil, sous l'aperçu (plus seulement dans « Cartes à produire »).
- **Carnet de vol** : plans trois vues plus grands (45 % de la largeur du bloc, 340 px au plus) ; en ton sombre, traits crème
  façon blueprint (versions `blueprint-*-clair.webp`), traits sépia en ton clair.

- **Carnet de vol** : plans trois vues (Islander, DC-3, B-17, P-51, Concorde ; `deco/flightlog/blueprint-*.webp`,
  convertis en sépia sans franges, ~100 Ko) au coin des blocs en décor complet, en alternance dans l'ordre de la page
  (rang `data-deco-n` posé par le framework) ; ancien `blueprint.webp` retiré.

- **Framework — sélecteur segmenté** (`repo-segs` / `repo-seg`, `aria-pressed`) : composant commun (page Apparence :
  décor, style des graphiques, barre latérale), habillé dans les designs à matières avec les textures existantes — Cabinet :
  barrette de laiton, choix en cuir marine ; Carnet de vol : aluminium, choix en cuir marine ; Durci : acier sombre, choix
  en champ noir à voyant vert ; Aqua : verre et gel.

- **Bloc Route revu** : champ pleine largeur sans étiquette redondante, barre d'outils sur une ligne en deux groupes
  (construire : niveau, recherche « Voies aériennes / RTBA » + Chercher, SimBrief, route probable ; exploiter : Tracer,
  Carburant, Copier OACI), liste de recherche à sa largeur, syntaxe et mode d'emploi réunis dans « Syntaxe et
  utilisation » ; Cartes de vol : texte d'accueil redondant du bloc « Cartes du vol » retiré.
- **Aqua** : boutons des blocs (masquer, déplacer) en petites bulles vierges teintées, symbole par-dessus (jaune dans le
  Centre).

- **Aqua** : bouton « déplacer le bloc » (↕) de nouveau visible (jeux composés : symbole en texte, comme les jeux au trait).

- **Aqua** : disque teinté ajusté au cerclage des bulles (centre remonté de 1 px, diamètre réduit de 2 px ; réglages up /
  shrink du générateur).
- **Bloc Route** : niveau de croisière avec les outils du champ de route (plus dans les réglages repliés) ; Cartes de vol :
  champ « Niveau » du bloc « Cartes du vol » retiré (doublon).

- **Aqua** : cerclage des bulles hors teinte (seul le disque intérieur prend la couleur Aqua) ; images d'icônes Aqua
  retirées (seules les bulles vierges servent), rotation de teinte (--aq-shift) supprimée, boutons des blocs au trait ;
  barre latérale et page Apparence sans images pour les jeux composés (`REPOSITORY_TREE.iconComposed`, écrit par le
  générateur, réécrit pour séparer jeux composés et jeux peints).

- **Icônes du Centre** : jeux `<jeu>-cpco/` retirés (le Centre se distingue par le fond `vierge.gris` des jeux composés et
  son glyphe jaune) ; plus de lien brisé dans la barre latérale.

- **Aqua : icônes composées** : bulle `vierge.gris.webp` teintée exactement à la couleur Aqua choisie (mélange de calques, plus
  de rotation de teinte) et découpée à sa forme, glyphe blanc ; Centre : même bulle, glyphe jaune. Même principe à venir pour Durci, Cabinet et Carnet de vol (fonds `vierge` / `vierge.gris`).

- **Base SIA** : une base au format précédent (14) reste utilisable (studio, Cartes de vol, profil vertical) — seuls les
  points de report VFR manquent jusqu'à la relecture du dossier SIA (signalé dans la ligne d'état du studio).
- **Syntaxe de la route** : explication associée au champ de route (planificateur : sous « Plan de vol » ; studio et
  Cartes de vol : « Syntaxe de la route » sous le champ).

- **Cartes de vol** : « Créer les cartes » applique les profils par défaut (route et approche en IFR) au lieu de reprendre
  ceux de la mission précédente ; profils choisis à la main et cadrages gardés ; mission enregistrée avec l'ancienne
  carte de route en VFR détaillé recréée en IFR à l'ouverture.

- **Carte du bloc Route** : points exactement sur le tracé (marqueur = pastille seule centrée sur le point, étiquette posée à
  côté hors du cadre ; écart mesuré < 0,5 px quelle que soit la longueur de l'étiquette) ; banc d'essai : option « Correction ».

- **Icônes skeuomorphes composées** (fond + glyphe SVG) : dès que `shared/icons/skeuo/<jeu>-bg/normal.webp` existe
  (Aqua, Cabinet, Durci, Carnet de vol), les icônes du jeu deviennent un fond commun et le glyphe du registre par-dessus
  (blanc / crème ; jaune sur le fond `centre.webp` du Centre), ombre portée vers le bas, contours nets à toute taille ;
  couleurs, ombre et marge réglables dans `tools/build_skeuo_icons_css.py` (GLYPH). Sans fond : images actuelles.

- **Un seul plan de vol** entre le planificateur carburant et les Cartes de vol (`flightPlanShared:v1`, le plus récent
  l'emporte) : champ « Plan de vol (case 15) » en tête du devis carburant (distance, route vraie et niveau en sont
  déduits), bouton « Cartes de vol » (cartes et profil créés à l'arrivée) ; import SimBrief du planificateur repris par
  les Cartes de vol.
- **Masse au décollage prévue** (devis carburant) : comparée à la MTOW de l'appareil (fiche APD), masse à l'atterrissage
  estimée dans le résultat, alerte en cas de dépassement.
- **Outil de développement** : `tools/stub_marker_offset.html` (banc d'essai du décalage des points de route sur la carte).

- **Points de report VFR** : lus dans le XML_SIA (1 098 points « VFR », ex. MM-CV Cavaillon) — base SIA au format 15 :
  relire le dossier SIA une fois ; affichables sur les cartes (profil d'affichage : Symboles OACI › Points de report VFR,
  losange vert et identifiant), utilisables dans le champ de route (« MM-CV ») et comme aimant sur la carte.
- **Voies aériennes sur les cartes** : basses (jusqu'au FL195, bleu) et hautes (violet pointillé), avec désignation
  (Symboles OACI › Voies aériennes) ; nouveau profil d'affichage **AIRWAYS** (ajouté aussi aux profils déjà enregistrés).
- **Bloc Route** : bouton « SimBrief » (route du dernier OFP : départ, groupe vitesse / niveau, route ATC, destination ;
  identifiant du profil pilote). Coordonnées des points ajoutés en notation OACI de la case 15 (degrés et minutes,
  « 4419N00316E ») ; les secondes restent acceptées à la lecture.
- **Designs Cabinet et Carnet de vol** : texte des boutons secondaires (parchemin) plus foncé et en gras.

- **Bloc Route** : clic droit sur un point (carte ou coupe) → suppression, point nommé compris (départ et arrivée
  exceptés) ; point d'entrée ou de sortie d'une voie aérienne supprimé → tronçon direct (« GOSAD DCT CTX »).
- **Designs skeuomorphes** : boutons de zoom des cartes (+ / −) de nouveau avec leur icône (styles des boutons du design
  non appliqués aux commandes MapLibre).

- **Boutons (designs skeuomorphes)** : même hauteur (38 px) avec ou sans icône, dans les blocs, la barre d'action et la
  barre d'état ; l'icône d'un bouton ne l'agrandit plus ; bouton icône seule carré de même hauteur.
- **Carte du bloc Route** : points collés au tracé (le marqueur est la pastille seule, l'étiquette à côté) ; points
  ajoutés écrits à la seconde dans le champ (« 441912N0031604E »), arrondis à la minute seulement dans le plan de vol OACI.

- **Cartes de vol** : la carte de la route (`route_<départ>_<destination>.png`) est en IFR, comme les autres cartes par défaut.
- **Icônes du Centre** : jeux d'icônes propres au Centre `shared/icons/skeuo/<jeu>-cpco/` (copies des jeux Laiton, Acier,
  Gel, Aviation, à retoucher), utilisés sur les pages du Centre et pour ses entrées de la barre latérale ; les filtres
  de couleur (rendu grossier) sont retirés. Règles générées par `tools/build_skeuo_icons_css.py`.
- **Outils** : `tools/README.md` (outils courants, ateliers graphiques, migrations ponctuelles) ; `bump_versions.py`
  met aussi à jour les scripts du Planning ODV et les images des jeux d'icônes du Centre.
- **Décors** : retouches de l'utilisateur (Cabinet, Carnet de vol, Aqua).

- **Barre latérale** : affichée par défaut (Apparence : « Toujours » ; « Selon le design » reste possible).
- **Accès au Centre** : entrées du Centre (barre latérale, menu ☰) montrées ou masquées aussitôt à l'activation ou au
  verrouillage, sans recharger.
- **Planning ODV en Durci** : carte des créneaux en « champ noir » (texte crème, remplissage vert selon le nombre de
  pilotes), jours et textes secondaires éclaircis.

- **Bloc « Route »** (studio du Centre, Cartes de vol) : un seul champ de route au format case 15 OACI, modifiable, juste
  au-dessus de la carte et de la coupe verticale ; recherche de route (voies aériennes ou RTBA) écrite avec les voies
  (« GOSAD G36 LMG G28 CTX »), voies aériennes suivies point par point par le profil et la carte, altitudes au point
  « /A035 » ; survol lié champ ↔ carte ↔ coupe (jeton surligné dans le champ) ; carte : points déplaçables
  latéralement, aimantés sur balises, points de report et terrains, clic sur la route pour insérer un point ;
  « Copier en OACI » (plan de vol strict) ; réglages du profil repliés. Bloc « Cartes à produire » sans aperçu (l'aperçu
  est la carte du bloc Route). Cartes de vol : bloc « Cartes du vol » (rendez-vous, niveau, cartes) après la route.
- **Profil vertical** : l'option « Afficher les altitudes (plafond / plancher) » du profil d'affichage s'applique aussi à
  la coupe (studio, planificateur).
- **Profils des cartes** : IFR par défaut (détail, cible, rendez-vous : VFR détaillé).
- **Planning ODV** : page du Centre (`apps/cpco/odv_planning.html`, accès réservé, entrée « ODV » de la barre latérale).
- **Icônes du Centre en Aqua** : bulle bleu nuit cerclée d'or (au lieu du glyphe jaune).

- **Planning ODV — sessions ATC et registre** : un « TRAINING » ou « EXAMEN » de position (« EXAMEN LFMN_TWR ») rend
  la CTR du terrain indisponible pour le créneau (et si possible ses TMA) ; bouton « Missions du registre… » sur les
  créneaux d'au moins deux pilotes : missions avec rendez-vous ou à plusieurs équipes de la famille, route estimée
  confrontée aux espaces à éviter (CTR → écartée, TMA → signalée), ouverture dans le registre (Centre activé).
- **Framework — journal des alertes** : les erreurs et avertissements notifiés (effacés de l'écran au bout de quelques
  secondes) restent consultables le temps de la page : témoin « ⚠ n » dans l'en-tête (rouge s'il y a une erreur, orange
  sinon, neutre une fois tout acquitté), liste horodatée (répétitions comptées), ACK par alerte, « Tout acquitter »,
  « Vider » ; 50 dernières alertes, rien n'est conservé au changement de page (`AppFramework.alerts`).

- **Profil vertical éditable à la souris** (studio du Centre, Cartes de vol ; `shared/carto/vprof_editor.js`) : clic
  dans la coupe → nouveau point à cette distance et cette altitude (« 44.3361 3.2544/2500 »), aimanté sur un point
  existant proche (seule son altitude change : « R590A/1650 ») ; points déplaçables (altitude au pas de 50 ft ; les
  points ajoutés glissent aussi le long de la route et fusionnent avec le point sur lequel on les lâche ; double-clic :
  suppression) ; altitude, hauteur AGL et relief affichés pendant le déplacement. Étiquettes du cheminement sous le
  champ : survol d'une étiquette, d'un point ou curseur dans le champ → tronçon illuminé des deux côtés. Aux Cartes de
  vol, la route du bloc Vol suit les modifications.

- **Profil vertical → planificateur carburant** : bouton « Planificateur carburant » (studio du Centre, Cartes de vol) :
  cheminement converti en route de plan de vol OACI (`SiaProfile.toIcaoRoute` : points publiés par leur indicatif,
  autres points — sommets des zones du RTBA — en coordonnées `4419N00316E`, changements de niveau « R589B, FL55 » →
  `4419N00316E/N0160F055`), affichée et copiable ; le planificateur s'ouvre avec la route, la distance, le niveau, la
  route vraie et l'appareil, relance le calcul et trace son profil.
- **Cartes de vol** : un seul champ de route — la route du bloc Vol est le cheminement du profil vertical (virgules,
  niveaux « FL55 », « R590A/FL65 », « N0180F055 » acceptés), profil tracé dès « Créer les cartes » et mis à jour quand
  la route change.
- **Designs skeuomorphes** : l'en-tête garde l'arrondi de son design (Cabinet, Carnet de vol, Durci) ; en Durci, carte
  et radar du bandeau à angles droits (plaque et bloc de sauvegarde inchangés).
- **Planning ODV** (`apps/planner/odv_planning.html`, ☰ › Planning ODV, accueil) : lecture du classeur hebdomadaire
  ODV de l'escadrille (.xlsx) **dans le navigateur**, sans envoi ni conservation (lecteur ZIP de la suite +
  `DOMParser` ; seuls les réglages sont mémorisés) ; trigrammes lus dans les zones de texte, codes normalisés
  (casse, espaces), légende et couleurs lues dans le fichier, événements des lignes de groupe, profils FLOTTE (types,
  niveaux, rôles, simulateurs) ; grille de disponibilité filtrable, carte des créneaux communs et détail (horaires en
  commentaire, contrôleurs, événements, vols posés), missions probables par règles expliquées (familles de la suite +
  TRAINING avec contrôleur), vols de la frise contrôlés contre les disponibilités, zones à activer ; décalage de date
  de la frise et anomalies signalés par notifications ; exports CSV, JSON et récapitulatif texte. Voir
  [docs/ODV_PLANNING.md](ODV_PLANNING.md).

## [4.1.0] — 2026-09-29

Centre de planification et de conduite des opérations (CPCO), à accès réservé ; outil public « Cartes de vol ».

- **Centre de planification et de conduite des opérations (CPCO)** : générateur de mission, studio cartographique et
  registre des missions déplacés de `apps/sia/` vers `apps/cpco/` (anciennes adresses redirigées), menu « Centre — … »,
  titres « Centre de planification et de conduite des opérations », thème propre (bleu nuit et or, favicon), compatible
  avec les quatre designs skeuomorphes et proposé dans Apparence.
- **Accès au Centre** : activé dans Paramètres › Centre (CPCO) par un mot de passe (gardé dans ce navigateur) ; Centre
  verrouillé : pages absentes du menu, de la barre latérale et de l'accueil, page ouverte directement recouverte d'un
  avis, réglages du Centre (calcul des routes, espace disque des missions) verrouillés. Verrou d'usage, pas une sécurité.
- **Cartographie partagée** : `aero_symbols.js`, `vertical_profile.js`, MapLibre et `villes_geonames.csv` déplacés dans
  `shared/carto/` (utilisés hors du CPCO : planificateur, Paramètres, Cartes de vol).
- **Cartes de vol** (`apps/planner/map_planner.html`, accessible à tous, ☰ › Cartes de vol, barre latérale « Cartes ») :
  route (codes OACI, balises, points, coordonnées), recherche de la route par les voies aériennes ou à basse hauteur
  par le RTBA, rendez-vous facultatif, niveau ; cartes topographique de la route, approche, rendez-vous et destination,
  profil vertical, réglages et génération du studio. Page construite depuis le studio du Centre par
  `tools/build_map_planner.py` (à relancer après toute modification du studio) ; mission gardée à part dans le
  navigateur (celle du Centre n'est jamais touchée).
- **Icônes du Centre** (designs skeuomorphes) : sur les pages du Centre et pour ses entrées de la barre latérale, fond
  en merisier (laiton) ou peint en rouge (acier), glyphe doré comme un galon (aviation, gel) ; les autres icônes restent
  classiques.
- **Designs skeuomorphes** : en-tête, bandeau décoratif, pied de page (barre d'état) et barre d'action à angles droits.
- **Profil vertical** : les points de transit de la route probable (sommets des zones du RTBA, « R 46 N2 ») sont
  reconnus — la route RTBA (ex. LFBO → LFSI) se trace ; sans niveau saisi, niveau de croisière de l'appareil.
## [4.0.0] — 2026-09-29

Exercices (organisation, chiffons, chronologie radio et plis), routes de transit calculées (voies aériennes, RTBA),
zones à activer, zones de recherche, théâtres étrangers, format de mission 2.0 ; générateur, studio, registre et
Maintenance réorganisés ; framework : notifications flottantes, tableaux à colonnes réglables.

À la mise à jour : relire le dossier SIA une fois (base au format 14 : gestionnaires des zones, voies aériennes) ;
relancer le calcul de la MORA (outre-mer et missions à l'étranger) ; relire le dossier des missions dans le registre.

- **Registre : suppression individuelle des cartes** — croix sur chaque vignette (confirmation), emplacement affiché
  (cartes/ ou racine), cartes en double à la racine repérées et supprimables d'un coup ; PDF compté dans la place.
- **Maintenance › Espace disque** : colonne PDF et « Purger les PDF » (régénérés par le générateur).
- **Registre : cartes surnuméraires** — dans les fichiers d'une mission, cartes absentes de sa liste de cartes marquées
  (croix de suppression), bouton « Supprimer les cartes surnuméraires », place occupée par la mission.
- **Maintenance › Espace disque** : place occupée par les missions (par mission et par type : données, cartes, dont
  surnuméraires, versions, textes reçus ; totaux) et par le navigateur ; purge des cartes surnuméraires ou de toutes les
  cartes générées (régénérables depuis le YAML), avec confirmation.
- **Studio, génération des cartes** : barre de progression et étape en cours dans le pied de page ; rangement dans le
  dossier de la mission toujours annoncé (notification, compte rendu) ; sans accès au dossier, bouton « Ranger les cartes
  dans le dossier » dans le pied de page. Registre : cartes en vignettes réduites.
- **Avertissements** : les zones d'état (`data-status`) passent leurs erreurs et avertissements en notification flottante
  (effacement automatique, croix) et ne les répètent plus en ligne ; état de la base SIA du studio en ligne neutre +
  notification.
- **Routes : mode et réglages visibles** — bloc Durée estimée : transit calculé ou raison du direct (hélicoptère, VFR,
  base SIA à relire, hors de la couverture des données SIA pour une mission à l'étranger, tronçons courts, détour) ;
  mode imposé par mission (`route_mode` : automatique, voies aériennes, RTBA, direct) ; paramètres du calcul réglables
  (longueur minimale, niveaux, portée d'entrée, détour admis), communs et mémorisés dans le navigateur.
- **Organisation d'exercice** : mission seule sans exercice (ex. H-001) → une ligne discrète au lieu du bloc Opération ;
  organisation créée avec un brief général proposé d'après les missions ; dossier organisation sans brief écrit →
  celui des missions.
- **Cartes générées par le studio** : rangement dans le dossier de la mission signalé ; sans accès au dossier, bouton
  « Ranger les cartes dans le dossier de la mission » (les cartes générées sont gardées en mémoire).
- **Markdown depuis le YAML** (`SiaMission.markdownOf`, format du § 9 du prompt, organisation d'exercice comprise) :
  affiché à la demande dans le registre quand le dossier n'a pas de `summary<ID>.md` ; même code pour « Exporter
  Markdown » du générateur (qui ne reprenait que les textes).
- **Cartes d'exercice** ajoutées d'office par le studio à l'ouverture d'une mission d'exercice (message ou pli qui
  révèle une position ou une piste, organisation, chiffons) ; générateur : liste des cartes d'exercice et leur état ;
  PDF de l'équipage : carte de chaque pli après sa page, carte d'un message radio sur une page « à remettre à réception
  du message ». L-001 : `exercice_EV-1_L-001.png` ; L-001Z : `organisation_L-001Z.png`.
- **Théâtre étranger** : commande « étranger (pays) » (champ Pays), règles du prompt (bases prépositionnées,
  partenaires, lieux réels, pas de données aéronautiques inventées), `mission.theatre` et `mission.country` (ISO) ;
  registre : « étranger — Japon ».
- **MORA hors des théâtres français** : le calcul complet (Maintenance) ajoute les emprises des missions du registre
  situées ailleurs (relief et sommets).
- **Villes** : outre-mer français (≥ 500 hab.) et reste du monde (≥ 15 000 hab., 187 pays) ajoutés à
  `villes_geonames.csv` (41 665 → 70 962 villes) par `tools/update_cities_geonames.py` (option `--world`).
- **Maintenance** : Versions et synchronisation, Références et dépendances — `moraCycle` lu dans `SiaBase`.
- **Maintenance** : chaque bloc rendu séparément ; une lecture en échec (dossier, base SIA, git) s'affiche dans son
  bloc et en notification au lieu de laisser Sources et dossiers, Versions et synchronisation… vides.
- **Barre latérale** : préférence et design posés dès l'en-tête de chaque page (repository_tree) ; planificateur :
  navigation chargée avant les calculs — la barre ne paraît plus en fin de calcul.
- **Registre → générateur** : plus de PDF produit à l'ouverture (demande de PDF consommée à l'arrivée, liée à la mission).
- **Notifications** : une seule par zone d'état, effacement automatique (erreur 12 s, avertissement 8 s, autres 5 s),
  plus de doublon message en ligne + notification.
- **Zones de recherche** lisibles sur les fonds topographiques : magenta, liseré blanc, hachures.
- **Format 2.0** : missions mémorisées dans le navigateur (partagée, lot) mises à niveau à la lecture.
- **Routes de transit calculées** (`shared/mission_routing.js`) : voies aériennes de l'AIXM pour un avion en IFR,
  chaînage du RTBA à basse hauteur, direct pour les hélicoptères et le VFR ; dans la route probable, les durées, le
  croquis, le profil vertical (« ↺ Route probable ») et les zones à activer. Temps d'aller et de retour éprouvés par les
  CR repris à la place du calcul. Base SIA au format 14 (voies aériennes) : relire le dossier une fois.
- **Studio réorganisé** — Mission (état, enregistrer, état de la base SIA, ouvrir une autre mission replié) ;
  Cartes et cadrage (liste des cartes, réglages du profil repliés, aperçu ; boutons Actualiser, Garder ce cadrage,
  Recentrer, Cadrage automatique) ; Profil vertical ; Aperçus et génération ; base SIA masquée par défaut. Cadrage
  automatique d'après la mission (points, zones, format 16/10). Fond local PNG « Carte France vierge » et ses champs
  de calage supprimés ; calcul de la MORA retiré du studio (Paramètres › Maintenance).
- **Zones de mission et de recherche** (`zones[]` : cercle ou polygone, `kind`) lues et dessinées par défaut ;
  cheminement affiché sans passer par le profil vertical. L-001 : secteur de recherche et exercice L-001Z (position
  transmise par radio, carte détaillée de la position révélée).
- **Zones à activer** (`shared/mission_airspaces.js`) : zones R, D, TRA, RTBA recoupées par la route et les zones, par
  gestionnaire (AIXM), dans le générateur et les PDF ; base SIA au format 13 (à relire une fois).
- **Générateur** : import et commande ChatGPT repliés quand une mission est chargée, bouton « Commander à
  ChatGPT… » ; Identification refaite (famille, sous-types proposés, identifiant et série suivants en indication
  grise, contrôle de la lettre de famille) ; format **helo-xp-mission 2.0** (`tools/migrate_missions_schema.py`).
- **Registre** : « Ouvrir » charge toute l'opération d'une mission d'opération (boutons en double retirés) ; fichiers
  d'une mission retrouvés même si le registre a gardé un mauvais nom ; croquis de la route et tronçons côte à côte.
- **Correctif** : un YAML commençant par un commentaire « # Mission … » n'est plus découpé en deux fichiers
  (`mission2.yaml` dans le registre).
- **Notifications communes** (`AppFramework.notify`) : les erreurs des zones d'état (`data-status`) et des ouvertures
  s'affichent en bas de page sur toutes les pages qui les déclarent.
- **Prompt** : description sans itinéraire, niveaux, durées ni zones à activer ; basse altitude dans le RTBA ; zones
  selon le type de mission ; position connue en vol = exercice ; schéma 2.0.
- **Studio : carte plate** — certains styles publiés (VersaTiles) imposaient la projection « globe » : vue mappemonde
  et, depuis l'outre-mer (Nouméa…), grille MORA et libellés de métropole projetés sur la carte. Le studio reste en
  Mercator.
- **MORA outre-mer** — le calcul complet (Maintenance, studio) couvre aussi Antilles, Guyane, Saint-Pierre-et-Miquelon,
  Réunion, Mayotte, Nouvelle-Calédonie, Polynésie (îles de la Société) et Wallis-et-Futuna (obstacles de l'AIXM
  FR_OM) ; à relancer pour produire le nouveau `mora.csv`.
- **Villes outre-mer** — `tools/update_cities_geonames.py` ajoute à `villes_geonames.csv` les lieux habités de GeoNames
  (≥ 500 hab., comme cities500) des pays choisis, outre-mer français par défaut.
- **Tableaux : largeur des colonnes réglable** (SortedTable) — poignée à droite de chaque en-tête, double-clic pour la
  largeur automatique, mémorisée par tableau. Registre : hauteur du tableau réglable (poignée en bas), mémorisée.
- **Maintenance › Sources et dossiers** : boutons de dossier sur une ligne (ils se repliaient lettre par lettre).
- **Dossier d'une mission** : `mission<ID>.yaml` (données + réglages du studio + dates et historique), `summary<ID>.md`,
  `cartes/` (PNG du studio), `recu/` (textes reçus horodatés), `versions/` (YAML remplacés). Réimport : comparaison des
  données — identique (rien remplacé) ou nouvelle version (ancienne gardée, différences listées, réglages du studio
  repris). Générateur et studio : « Enregistrer dans le dossier » ; cartes générées rangées dans `cartes/`.
- **Registre : fichiers de la mission** — YAML, Markdown lisible, vignettes des cartes, versions (différences), textes
  reçus, PDF à la demande (générateur, cartes du dossier chargées), Modifier ; état complète / partielle / sans cartes.
- **Exercices : organisation, chiffons, chronologie** (`shared/mission_exercise.js`, toutes familles) — mission
  d'organisation `…Z` de l'opération (`I-001Z`, `M-016Z`…) : brief général, heure H commune, participants et leur
  décollage (H±n), chiffons joués ou seulement dessinés (route, départ, consignes), chronologie de messages radio et
  de plis scellés (à H+n ou au passage d'un point par un participant, émetteur, destinataires, pistes révélées) ;
  chaque destinataire ne reçoit que ce qui lui est adressé. Ancien format (`tracks`, `injects`, `phases`) toujours lu
  et repris à la création de l'organisation. Exercice d'essai : opération I-001 « ŒIL DE SOLOGNE » (I-001Z).
- **Générateur réorganisé** — bloc **Opération** en tête (missions, décollages, organisation, passage de l'une à
  l'autre), mode organisation sur la Z (brief général, exercice, « Ce que reçoit chacun »), bloc **Documents** : brief
  de l'équipage avec ses plis (une page chacun), dossier organisation, fiches des chiffons joués, tous les documents
  de l'exercice (un PDF par destinataire), exports de données.
- **Studio : cartes par destinataire** — organisation (toutes les pistes et les routes des participants), chiffon (sa
  route, son départ), équipage (pistes connues après chaque message ou pli) ; « + Cartes d'exercice » selon la mission.
- **Registre** — missions d'organisation repérées, fiche : membres de l'opération, résumé de l'exercice, « Ouvrir
  l'opération » (générateur ou studio, en un lot) ; en-tête du tableau fixe au défilement, tableau compact (type et
  sous-type, équipes et types réunis, textes longs coupés, complets au survol).
- **Prompt** : mission d'organisation `missionNNZ.yaml` / `summaryNNZ.md` (§ 3, § 4 bis), `operation.organisation`,
  règles de choix (exercice, chiffon joué ou non) ; plus de `tracks` / `injects` dans les missions des équipes.
- **Studio : sommets OSM sans coordonnées** (chemins renvoyés par Overpass) ignorés — ils interrompaient le rendu.
- **Mission reçue → registre et dossier** : une mission chargée ou collée dans le générateur est inscrite au registre
  (commande rapprochée) et rangée dans `data/missions/<lettre>_<FAMILLE>/<identifiant>/` si le dossier est autorisé
  (sinon bouton « Ranger dans le dossier des missions… »).
- **Commande : aéronefs imposés respectés** — chaque aéronef choisi part avec son désignateur OACI en tête et la
  mention (IMPOSÉ) ; le prompt en fait une contrainte stricte (prime sur les listes d'unités et d'aéronefs, la mission
  s'adapte à l'appareil, jamais l'inverse) et la vérifie dans le bloc VALIDATION ; flotte DEFA proposée « type OACI
  variante — indicatif ».
- **Studio : tracé carte par carte** — sans tracé, cheminement (carte brief), route probable avec retours possibles
  et durée (carte organisation), ou les deux ; gardé dans le YAML (`maps[].trace`). Profil vertical : « ↺ Route
  probable » reprend la route probable comme cheminement.
- **Durée estimée et route probable** (`shared/mission_estimate.js`) : dans le générateur (bloc « Durée estimée »)
  et le registre (colonne, fiche) — route probable jusqu'au retour base, vitesses et varios du type (planificateur,
  fiche APD, valeurs types), temps sur place, phases aller / sur zone / retour, options de retour (hôpital selon
  l'état du patient…), briefs successifs ; comparaison avec les CR de la mission (écart par vol et par phase) et,
  dans le CR, « vol estimé — ce vol (+x %) » ; route affichable ou non (croquis, tronçons).
- **Prompt du générateur** : `cruise_speed_kt`, `cruise_level`, `time_on_task_min`, `route_order` (route probable),
  `return_options`, `phases` (briefs successifs B, C… : déclenchement « 10 min après RDV-1 », message reçu, brief,
  suite de la route ; section « ## Partie B » du Markdown), `timing` (durées annoncées) ; retour base obligatoire.
  Brief PDF : une page par partie (« pli à remettre »).
- **Registre ⇄ CR** : fiche d'une mission avec tous ses CR (liens vers chaque CR), colonne « CR » (nombre de vols),
  « Nouveau CR (vol n) » pour les missions récurrentes ; dans le CR, lien « voir la mission dans le registre » sous le
  champ Mission. Le registre retient la mission affichée et accepte `?mission=M-016` ; le générateur et le studio
  ouverts depuis le registre ont un lien « ← Registre (M-016) ».
- **Numérotation unifiée missions / CR, avec tiret** — mission : lettre de famille + tiret + 3 chiffres (+ équipe),
  `M-016`, `S-002A` (écritures sans tiret acceptées). CR : dans le CR, on saisit la mission volée et le n° de CR est
  calculé (lecture seule) — `CRM-016-1`, `CRM-016-2` si la mission est rejouée ; CR sans mission : `CRM-A01-0` …
  `CRM-A99-0`, puis `CRM-B01-0`. « Créer le CR » depuis le registre reprend la mission et l'essai suivant ; statut
  « CR fait » d'après le n° de CR. Migrations : `tools/dash_mission_ids.py` (missions, dossiers et fichiers :
  `M001/missionM001.yaml` → `M-001/missionM-001.yaml`), `tools/renumber_reports.py` (CR : HEMS-014 → `CRM-A14-0`,
  ancien n° dans `metadata.formerMissionId`).
- **Commande ChatGPT unifiée** (`shared/mission_order.js`, `MissionOrder`) : le générateur de brief (« Créer une
  mission avec ChatGPT ») et le registre (« Commander une mission ») montent le même bloc — mêmes paramètres (sous-type,
  identifiant calculé, aéronef par équipe, rendez-vous, équipes au sol, ravitaillement désormais aussi dans le
  générateur), même prompt, réglages partagés ; une commande passée depuis le générateur est inscrite au registre.
- **Registre des missions : « Nettoyer le registre »** — retire les missions « fichier absent » restées après la
  renumérotation (relecture du dossier d'abord, confirmation) ; statut, notes, date de vol, commande et CR reportés sur
  la mission renumérotée (`former_id`, sinon titre + type + lettre d'équipe). `mission.former_id` lu dans le registre.
- **Paramètres › Maintenance › Caches** (nouveau bloc) : état et purge des caches reconstructibles — aérodromes
  utilisés (`missionAirports:v1`), base mondiale des aérodromes (purge du CDN jsDelivr puis rechargement), base SIA
  analysée, contrôle des mises à jour, cache HTTP des fichiers de l'application (« Recharger sans cache ») ; « Tout
  purger et recharger ». Aucune donnée utilisateur touchée. Adresse de la base mondiale réglable (source `airports`).

## [3.1.0] — 2026-09-28

Missions renumérotées par famille, base SIA factorisée et mise à jour SIA guidée, studio et designs retouchés.

### Missions

- **Numérotation des missions** : lettre de famille + numéro sur 3 chiffres, compté par famille (+ lettre d'équipe) —
  « M016 », « S002A ». Lettres : M HEMS/MEDEVAC, H HADR, F FIRE, S SAR, T AIRLIFT, R AAR, P AIRBORNE, N MARITIME,
  I ISR, L LE, C COMMAND, O SOF, V FI, G SURVEY, X SPECIAL ; `mission.series` = rang de la série dans sa famille.
  Prompt du générateur : `PROCHAINS_NUMEROS` (auto, rempli d'après le registre, `SiaMission.nextNumbering()` /
  `numberingTable()`) ; registre : série numérique et identifiant calculé. Fichiers missionM016.yaml /
  summaryM016.md… Rangement : `data/missions/<lettre>_<FAMILLE>/<identifiant>/`. Outils :
  `tools/renumber_missions.py` (ancien identifiant gardé dans `mission.former_id`, table
  `data/missions/RENUMEROTATION.md`), `tools/reletter_missions.py` (migration des identifiants à lettre de série),
  `tools/import_pdf_missions.py` (import de dossiers PDF et ZIP de cartes ; YAML et résumé reconstruits au besoin).
- **Registre des missions, commande** : une ligne par équipe en vol (A, B, C…) ; vide = automatique ; complétion par
  les types courants et les appareils de la flotte DEFA (indicatif) ; un même type peut servir à plusieurs équipes.
- **Correspondance des indicatifs** : une nouvelle ligne propose tous les organismes connus (et plus seulement SAMU).

### Studio SIA

- **Studio, points tournants** : rouge et libellés de 11 pt par défaut ; nouveau sélecteur de couleur de remplissage
  des points (à côté de la taille), en plus de celui des libellés et du contour. Profils d'affichage enregistrés avec
  les anciens réglages par défaut (7 pt, gris foncé) passés aux nouveaux ; réglages personnalisés conservés.
- **Studio, profil vertical** : les deux cases (image `profil_vertical.png` dans les sorties, cheminement sur les
  cartes) sont cochées par défaut et ne se recouvrent plus (une ligne chacune) ; champ du niveau de croisière pleine
  largeur.

### Base et mise à jour SIA

- **Base SIA factorisée** (`shared/sia_base.js`, `SiaBase`) : lecture du dossier SIA, parseurs (AIXM 4.5, XML_SIA,
  obstacles, villes, mora.csv), cache IndexedDB (lecture, écriture, mise à jour, purge), résumé `siaBaseInfo:v1` et base
  précédente (`siaBaseInfo:prev`, gardée à chaque nouvelle lecture), grille MORA (calcul complet et recalcul simple) :
  un seul code pour le studio et Maintenance (fin des copies dans `map_parser.html` et `airac.js`). **Bloc commun**
  « Base de données SIA » (dossier, Relire, Purger, état, fichiers) monté dans le studio et à l'étape 4 de la mise à
  jour SIA : la relecture se fait sur place, sans passer par le studio. Étape 6 : calcul MORA complet ajouté à côté du
  recalcul simple.
- **Mise à jour SIA pas à pas clarifiée** (Paramètres › Maintenance) : étapes renommées, consigne « À faire » par étape
  tant qu'elle n'est pas faite ; étape 4 « Ouvrir le studio et relire » ouvre le bloc « Base de données SIA » du studio,
  qui relit une seule fois le dossier, affiche « ✓ Base chargée et mémorisée (AIRAC …) » et un bouton « Retour à la
  mise à jour » (étape 5) ; au retour, les étapes 4 à 6 se recalculent seules (plus de bouton « Studio relu :
  comparer ») ; étape 5 sans base précédente : « rien à comparer ». Purge du cache rangée sous « En cas de problème »,
  avec son message effacé à la relecture suivante. Studio : plus d'invite d'autorisation en pleine relecture (fond de
  carte), plus de double relecture à l'ouverture.
- **Mise à jour SIA** : étapes 5 et 6 acquittables (« Vu, c'est fait », mémorisé pour la base en cours) ; contrôle de
  cohérence clarifié (registre des missions vide dans ce navigateur → lien vers le Registre ; performances : APD et
  profils du planificateur, seuls les types sans aucune performance sont signalés) ; plus de débordement à droite
  (pastilles et longs textes coupés, colonnes rétrécissables).
- **Relecture SIA observable** : jauge d'avancement (octets lus, étape, temps écoulé), bouton Annuler, alerte après
  15 s sans avancement (onglet en arrière-plan, fichier en cours de téléchargement par le client de synchronisation,
  autre onglet), durée de chaque étape à la fin, journal dans la console (`[SiaBase]`) ; lecture en flux, pauses
  d'affichage non ralenties en arrière-plan ; garde-fou si la base du navigateur (IndexedDB) ne répond pas.

### Designs et framework

- **Designs à matières** : plus de fonds blancs dans le générateur complet de mission (rubriques, éléments de liste,
  cartes du dossier, badges), les CR FIRE / HEMS MEDEVAC (encadré, indicateurs, liens-boutons) et le registre des
  missions (bouton de fichier) — habillés comme les cartes et boutons du design (Durci, Carnet de vol, Cabinet, Aqua).
  Emblème DEFA de l'en-tête (Carnet de vol, Cabinet) ramené dans le bandeau (marge haute et basse). Aqua : en-tête et
  pied de page pleine largeur à angles droits (les arrondis restent aux blocs, cartes et boutons).
- **Bandeaux Carnet de vol, Cabinet, Durci** : le panneau de la page reste à l'intérieur du cadre cousu (marges
  latérales) et l'en-tête devient une plaque vissée en retrait (plus de coins ni de vis contre le bord de la fenêtre,
  plus de bande vide au-dessus) ; emblème du Carnet de vol détouré (médaillon ailé seul) ; avion des plaques de titre
  gravé sur fond transparent (plus de vignette encadrée).
- **Ancres de bloc** : `page.html#id-du-bloc` affiche le bloc (même masqué), le fait défiler et le signale
  (`AppFramework.reveal(id)`).
- **Versions de cache** : `tools/bump_versions.py` refuse un argument qui n'est pas une version (un `--help` avait
  écrit `?v=--help` dans les pages, corrigé).

## [3.0.0] — 2026-09-28

Version majeure : **l'application et les données sont séparées**, arborescence de l'application réorganisée.
Migration d'une installation v2 : INSTALL.md § 2 (`tools/migrate_v3.py`).

- **Espaces aériens lus directement dans `XML_SIA_<date>.xml`** (SIV, RMZ/TMZ, AP, FIR… ; arcs densifiés par le SIA) :
  le fichier dérivé `sia-airspaces-<date>.xml`, qu'aucune source officielle ne publie, n'est plus demandé (un nouveau
  cycle n'est plus signalé « incomplet »). Lecture sans DOM (≈ 40 ms), résultat dans la base mémorisée (version 12 :
  une relecture du dossier). Avertissement quand la base mémorisée est d'un cycle périmé ; **purge du cache** SIA
  (studio › Base de données SIA, et Paramètres › Maintenance › Mise à jour SIA).
- **Données dans un dépôt à part** (privé : <https://framagit.org/defa-virtual/missions-defa>), cloné dans `data/` à la
  racine de l'application et ignoré par git : `references/` (flotte DEFA, référence DEFA, indicatifs, corrections OACI),
  `cr/` (registre unique, registres historiques FIRE / HEMS, CR, packs FMS GAAR), `missions/`, `sia/` (MORA, axes
  ENR 5.7 ; XML AIRAC hors git), `planner/`, `local/` (hors git). Chargement par `shared/data_files.js` (`data/`, sinon
  les exemples fictifs d'`examples/`). Modèle du dépôt de données : `tools/data_template/`.
- **Arborescence de l'application** sans espaces : `apps/cr/` (ex-`CR DEFA/`), `apps/settings/` (Paramétrage,
  Apparence, Maintenance), `apps/sia/` (ex-`SIA XML/`, fond et villes dans `apps/sia/assets/`), `apps/planner/`,
  `apps/landing/` (ex-`LandingPerformanceDashboard/`) ; page d'accueil `index.html`.
- **Un seul dossier à autoriser** : ☰ › Paramètres › Maintenance › Sources et dossiers › **Dossier des données** (`data/`) — registre,
  missions et SIA en sont déduits (les anciens dossiers mémorisés « CR DEFA », « Missions », « SIA XML » sont oubliés
  une fois).
- Outils : `update_fleet.py`, `defa_reference.py`, `update_aircraft_db.py` (corrections), Paramétrage (« Enregistrer
  dans le dépôt ») écrivent dans `data/references/` ; `tools/migrate_v3.py` range les données d'une installation v2.
- Studio : fond de carte et villes pris dans l'application quand le dossier SIA ne les contient pas.
- **Maintenance intégrée à Paramètres** : rubrique « Maintenance » du menu latéral de Paramètres, une entrée par bloc
  (mises à jour, sources et dossiers, versions, dépendances, mise à jour SIA, sauvegarde totale, journal) ; plus de
  bouton « Maintenance » séparé (menu ☰, barre latérale) ; `apps/settings/maintenance.html` redirige vers
  `parametrage.html?m=<bloc>` ; styles dans `shared/maintenance.css`.
- **Git LFS** pour tous les binaires (`.gitattributes` : images, PDF, archives, polices, médias ; mêmes règles dans le
  modèle du dépôt de données) ; les 289 images existantes converties en pointeurs LFS (sans réécrire l'historique) ;
  fins de ligne normalisées (`* text=auto`). Garde-fou `tools/check_binaries.py` (crochet pre-commit : `--install`),
  vérifié par `update_suite.py doctor`.
- `.gitignore` recentré (plus de règles globales `*.json`, `*.csv`, `*.yaml`) ; `VERSION.json` abandonné.

- **Paramètres › Maintenance** (nouvelle page, `CR DEFA/maintenance.html`, bouton « Maintenance » du menu ☰ et de la
  barre latérale) :
  - **Mises à jour** : canal `master` (stable) ou `develop` (early bird) ; contrôle manuel, automatique (à chaque
    ouverture, chaque jour, chaque semaine, chaque cycle AIRAC, chaque mois) ou désactivé ; dernière version du canal
    lue sur framagit (API publique) ; pastille « Mise à jour » dans l'en-tête de toutes les pages ; état git local
    (branche, commit, suivi origin, dernier fetch, canal mémorisé, packs orphelins, journal des mises à jour).
    Application par **`tools/update_suite.py`** (`status`, `channel`, `update`, `doctor`) : refus si des fichiers
    suivis sont modifiés, fast-forward seulement, journal `.git/suite-update.log`.
  - **Versions et synchronisations** : suite, cache des scripts, git, canal distant, AIRAC en vigueur / suivant, base du
    studio, dossier SIA, `mora.csv`, axes ENR 5.7, types OACI, performances APD, flotte et référence DEFA, indicatifs,
    OFP SimBrief, profils du planificateur, registres, journal d'atterrissages, données locales, sauvegarde totale.
  - **Références et dépendances** : pour chaque référence, traçage, processus de mise à jour, dépendants et contrôle de
    cohérence (cycles SIA, MORA, ENR 5.7, types de flotte avec alias, performances, prompt des missions, VERSION.json).
  - **Mise à jour SIA pas à pas** avec mode d'emploi : cycle (liens vers la page du SIA), dossier (inventaire par
    cycle, fichiers manquants, extraction du ZIP d'export du SIA), archivage des anciens cycles (`_archives/`),
    relecture par le studio (`map_parser.html?relire=1`), différences entre les deux bases (espaces ajoutés / retirés,
    aérodromes, obstacles), recalculs simples (grille MORA avec les obstacles du nouveau cycle, flotte, performances,
    profils, terrains des missions).
  - **Sauvegarde totale** : données du navigateur et fichiers connus des dossiers autorisés (registres des CR, missions,
    profils de performance, configuration du dépôt, CSV d'atterrissage, données SIA, dossiers ajoutés) en une archive
    ZIP avec manifeste (tailles, dates, SHA-256) ; « Changements depuis » ; **rechargement** d'une sauvegarde totale
    avec comparaison fichier par fichier (identique, absent, plus ancien / plus récent sur le disque), copie des fichiers
    remplacés dans `_avant_restauration/`.
  - **Journal des sauvegardes et rechargements** : chaque restauration des données locales (☰ › Données locales),
    sauvegarde totale, rechargement, extraction SIA, archivage, recalcul MORA — date, origine, clés ajoutées / mises à jour.
- **Registre des missions générées** (`SIA XML/mission_registry.html`, menu ☰ « Registre des missions (SIA) », barre
  latérale « Registre ») : inventaire des séries du dossier `Missions/` (YAML + Markdown) ; choix par type, sous-type,
  avec ou sans rendez-vous, nombre et types d'équipes engagées, ravitaillement en vol, théâtre, statut ; tirage au
  sort ; ouverture dans le générateur, le studio ou un nouveau CR ; statuts (commandée, générée, planifiée, volée,
  CR fait — repris du registre des CR —, abandonnée), date de vol, notes ; export CSV ; `Missions/mission_registry.yaml`.
  **Commander une mission** : type, sous-type, théâtre(s), série, équipes DEFA en vol, types d'équipes, rendez-vous,
  équipes au sol, ravitaillement → prompt réglé copié et ChatGPT ouvert ; la commande est rapprochée de la mission
  générée à la relecture du dossier.
- **Prompt des missions** : paramètres `SOUS_TYPE`, `RENDEZ_VOUS`, `TYPES_EQUIPES`, `ÉQUIPES_SOL`, `RAVITAILLEMENT`.
- **Studio cartographique** : un seul cycle AIRAC lu (le plus récent du dossier ; les autres sont signalés au lieu
  d'être mélangés) ; cycle mémorisé dans la base (`airac`) et résumé `siaBaseInfo:v1` ; cycle des obstacles tracé
  dans `mora.csv` ; `?relire=1` relit le dossier mémorisé.
- **Framework** : `shared/suite_update.js` (canal, contrôle, pastilles), `shared/airac.js` (cycles AIRAC, dossier SIA,
  base du studio, recalcul MORA), `shared/zip_store.js` (ZIP écrits / lus sans dépendance), dossier mémorisé
  `__missions` (FileAccess), journal `LocalStore.journal()` / `logEvent()`, `LocalStore.toText()`.
- **Sources et dossiers** (Paramètres › Maintenance) : tous les dossiers locaux (dépôt, registre des CR, missions, SIA
  XML, **X-Plane** — journaux d'atterrissage, nouveau —, performances, sauvegarde locale) et les **adresses des sources**
  (site DEFA, SIA : bases de données, page d'un cycle AIRAC, eAIP, contours d'espaces ; dépôts de l'application et des
  données) réglés au même endroit. Adresses par défaut dans `repository_tree` (`sources`), surcharge locale
  (`suiteSources:v1`), lues par `RepositoryNav.source(clé)` : liens DEFA (journal des vols, fiches appareils, flotte,
  logo de la barre latérale), pages SIA des cycles, contrôle des mises à jour. La liste « Dossiers paramétrés » de
  Paramétrage y est transférée. Le sélecteur de fichiers du Landing Dashboard s'ouvre dans le dossier X-Plane ; ses
  journaux entrent dans la sauvegarde totale.
- **Paramétrage** : bloc « Apparence » retiré (doublon du bouton du menu ☰ et de la barre latérale, qui ouvrent la
  même fenêtre ; `shared/appearance_admin.js` supprimé).
- **Corrigé** : `tools/bump_versions.py` re-versionne aussi les scripts de `SIA XML/` (`mission_store.js`,
  `sia_i18n.js`…). Manuel : la version de la suite vient de `repository_tree` (`VERSION.json`, ignoré et périmé,
  n'est lu par rien).
- **Audit** du 28/09/2026 (entrées SIA, installation, git, dépendances) : [docs/AUDIT_2026-09-28.md](technique/AUDIT_2026-09-28.md).

## [2.5.0] — 2026-09-27

- **Planificateur : fin de montée à Vy** : quand la vitesse de montée du profil ne monte plus (haut de la montée), le
  modèle finit la montée à Vy (meilleur vario), comme pour le calcul du plafond, au lieu de refuser le niveau. Supprime
  la zone « inaccessible » artificielle sous le plafond (DC-3 : montée à 135 kt épuisée vers le FL130, plafond FL155 à
  Vy ; tous les niveaux jusqu'au plafond sont désormais utilisables).
- **Planificateur : bloc Résultat épinglable** : bouton « Épingler » dans ses outils ; épinglé, le bloc reste déplié
  quand il suit la page (il se repliait dès qu'il se collait sous l'en-tête). Choix mémorisé dans le navigateur.
- **Planificateur, hélices : plus de niveaux refusés à tort sous le plafond** : quand la puissance de croisière du
  profil ne tient plus le palier (air moins dense), le modèle ajoute la puissance nécessaire et vole à la vitesse de
  puissance minimale (croisière « limitée ») au lieu de refuser le niveau ; refus seulement si même la pleine puissance
  ne tient pas le palier. Supprime la zone « inaccessible — puissance insuffisante » artificielle (un avion qui monte au
  FL123 tient le FL095).
- **Planificateur : moteurs à pistons suralimentés** : champ de profil « Altitude de rétablissement (ft) » (Croisière) ;
  pleine puissance jusqu'à cette altitude, puis décroissance d'un moteur atmosphérique rapportée à ce niveau (DC-3,
  R-1830 : environ 7 500 ft). Sans valeur : moteur atmosphérique, comme avant (puissance en baisse dès le sol).
- **Planificateur : oxygène** : champ de profil « Cabine pressurisée » (non renseigné : piston non pressurisé,
  réacteur et turbopropulseur pressurisés) ; au-dessus de l'altitude sans oxygène (Paramétrage › Planificateur
  carburant, 10 000 ft par défaut), zone « oxygène requis » sur le graphique d'altitude optimale (information, le
  calcul n'est pas limité).
- **Planificateur : zones expliquées sous les graphiques** (altitude optimale, TAS selon le niveau) : « inaccessible —
  trajet trop court », « inaccessible — puissance insuffisante », « oxygène requis », zone au-delà du plafond (plafond du
  profil ou calculé par le modèle, vario résiduel) ; zone tracée seulement pour un vrai niveau refusé (plus de double
  colonne « inaccessible » due à l'arrondi du dernier pas). TAS selon le niveau : plus de réapparition des courbes
  au-delà du plafond après un trou.
- **Durci : bandeau radar adaptatif** : le radar prend presque toute la largeur (plaque DEFA et voyant de sauvegarde
  empilés à droite) ; sa hauteur suit la largeur de la page (140 à 230 px) et l'écran est recadré en conséquence
  (rogné en haut et en bas, réticule toujours au tiers de la hauteur, jamais de vide).
## [2.4.0] — 2026-09-27

- **Durci : bandeau radar recadré** comme la maquette (banner.cropped) : plus large que haut (1402 × 304), bas de
  l'écran visible (réticule en haut, carte en médaillon et échelle en bas) ; plot de la Corse déplacé au repère 010
  de l'échelle, à la même hauteur ; un plot d'île passé en mer.
- **Planificateur : cause réelle des niveaux non tenables** : la zone sous le plafond indique « trajet trop court »
  seulement quand c'est le cas ; sinon « croisière non tenable » (puissance insuffisante pour la vitesse de croisière du
  profil, cas d'un DC-3 à FL250) ou « niveaux non tenables », avec l'explication au survol.
- **Durci : nouveau bandeau radar** (écran tactique, carte, réticule, cible rouge) : balayage recentré sur le réticule
  et étendu jusqu'à la cible, plots sur les îles et la cible ; radar sur toute la largeur restante, rogné en haut et
  en bas (centré) ; plaque DEFA et voyant de sauvegarde à la taille de leur contenu, centrés.
- **Planificateur, altitude optimale : plus de « trou » dans les courbes** : quand le trajet est trop court pour monter
  plus haut, les courbes s'arrêtent au dernier niveau tenable et ne réapparaissent plus au-delà du plafond ; zone
  « trajet trop court » entre ce niveau et le plafond (explication au survol).
- **Planificateur : explication au survol des pastilles** (plus rapide, carburant minimal à la vitesse du profil,
  carburant minimal en croisière économique, niveau du plan) avec niveau, carburant et durée.
- **Barre d'état du planificateur et barre d'analyse de Landing** décalées de la largeur de la barre latérale (leur
  texte passait dessous).
- **Planificateur : graphiques et curseurs en matière** : graphiques du devis carburant en écran d'instrument (Cabinet et
  Carnet de vol : panneau bleu marine serti de laiton, quadrillage gravé or ; Durci : écran phosphore vert à balayage ;
  Aqua : verre clair ou sombre) ; couleurs des courbes selon la palette des graphiques (Apparence) ; curseurs verticaux
  en commandes (bouton de laiton moleté, levier d'acier, bulle de gel) ; redessinés au changement de design.
- **Durci : voyant « modifications à sauvegarder » actif** : un clic sauvegarde comme le bouton de l'en-tête (dossier de
  sauvegarde, sinon choix du dossier, sinon téléchargement).
- **Durci : bandeau radar** : largeur de la colonne, hauteur plafonnée ; l'écran est rogné en haut et en bas, centré
  (le balayage reste centré sur la cible).
- **CR DEFA dans les designs à matières** : boutons et menus de l'en-tête (Ajouter au registre, Analyse / import,
  Suivi réseau, Mission, Registre des missions, changement de mission) habillés comme les boutons du design, action
  principale à la couleur d'accent ; fenêtres surgissantes sur la surface du design (parchemin, acier sombre, verre)
  avec des entrées lisibles (elles étaient en texte sombre sur boutons sombres) ; cartes des calculs automatiques,
  fiches d'appareil, encadrés plan de vol et météo, tableaux habillés ; aperçu du rapport en feuille de papier.
- **CR DEFA : menus de droite de la barre** (Mission, Registre) ouverts vers la gauche : ils ne sortent plus de l'écran.
- **Éditeur de missions (Durci)** : fonds d'« Identification » et d'« Importer » étendus à tout le bloc (le mode
  « side » y montrait les bords du panneau de l'image au milieu du bloc).
- **Durci : série de fonds en panneaux olive rivetés** : reporting (vue aérienne, pictogrammes des missions, ailes au
  laurier validé, chevrons, plaque de plans d'aéronefs, pictogrammes des capacités, cadran soleil et lune, pupitre
  radio, étoile) ; aussi hors reporting : studio cartographique (carte et écran radar sur « Cartes »), éditeur de
  missions (insigne sur « Identification », étagère d'équipement sur « Importer »), planificateur (« Résultat »).
  Anciens fonds Durci retirés.
- **Fonds illustrés : mode « side »** pour les blocs larges : image à la hauteur du bloc, calée à droite, fondue vers
  la gauche (le texte reste sur la matière unie).
- **Cabinet : cadre de cuir plus réaliste** : bordure plus large, bord arrondi (lumière en haut et à gauche, ombre en bas
  et à droite), parchemin serti sous le cuir ; couture de nouveau visible partout (reporting compris), dessinée dans le
  cuir par le contour du bloc lui-même (jamais coupé par le défilement du bloc) ; pas de couture sur l'aluminium du
  Carnet de vol.
- **Blocs du reporting qui changeaient de taille en boucle** (Cabinet, Carnet de vol, décor complet, fenêtres très
  larges, barres de défilement classiques) : la couture et les vis des blocs étaient dessinées par un pseudo-élément
  qui dépassait de 4 px ; dans les blocs à défilement (`.section`, `overflow:auto`), ce dépassement faisait apparaître
  une barre de défilement, qui disparaissait au calcul suivant. Pseudo-élément ramené dans le bloc (le contour, qui ne
  compte pas dans le défilement, reste au même endroit).
- **Barres de défilement qui clignotaient** (designs à matières, décor complet) : place de la barre verticale toujours
  réservée (`scrollbar-gutter: stable`), décors des marges jamais au-delà du bas de la page ni à l'origine d'un
  défilement horizontal. La boucle : barre qui apparaît → marge plus étroite → décors retirés → page plus courte →
  barre qui disparaît → décors remis…
- **Cabinet : série marine** pour le reporting (neuf fonds) : archipel et porte-avions (terrains de départ), barre à
  roue (par famille), ancre aux lauriers (résultats), flotte et phare (séries), frégate et hélicoptère (types
  d'appareil), radar, grue et dôme (capacités), soleil et lune (jour / nuit), satellites et proue (réseau), chenal
  balisé (contexte). Cabinet et Carnet de vol ont chacun leur jeu (la piste des terrains de départ de Carnet de vol
  est rangée dans son propre dossier).
- **Carnet de vol : jeu de fonds propre** pour le reporting (cuir marine, tracés or) : capacités (hélicoptères et
  montagnes), résultats (rose des vents sur mappemonde), types d'appareil (biplan et globe), séries (globes et routes),
  par famille (montage aviation), jour / nuit (piste de nuit) ; terrains de départ inchangés (piste de Cabinet).
  Nouveaux emplacements de fonds sur les blocs par famille, séries, jour / nuit, réseau et contexte.
- **Outils de bloc** (designs à matières) : icônes « déplacer » et « masquer » à la même taille (24 px, boutons de
  30 px) ; « déplacer » était plus petit et plus large.
- **Fonds illustrés du reporting : Durci, Aqua, Carnet de vol** : Durci en panneaux olive rivetés (courbes de niveau,
  plans d'avions) et métal bronze aux tracés de navigation ; Aqua en eau et verre, cadrée différemment sur chaque
  bloc ; Carnet de vol : résultats sur cuir et mappemonde aux avions. Chaque fond peut préciser son image, son cadrage et
  son opacité (`design_deco.js`, `BG`) ; opacité par défaut ajustée par design.
- **Aqua, ton sombre** : icône « déplacer » des blocs de nouveau visible (le dégradé des boutons la recouvrait).
- **Barre latérale : logo DEFA** en haut, décliné selon le design (Cabinet : or sur cuir marine ; Carnet de vol :
  acier riveté ; Durci : plaque militaire ; Aqua : chrome ; autres designs : aplat bleu ; variantes bois et laiton,
  brillant et au trait conservées dans `shared/icons/defa/`) ; un clic ouvre le site de la flotte DEFA Virtual
  (flotte.defa-virtual.fr, nouvel onglet).
- **Fonds illustrés du reporting** (Cabinet, Carnet de vol) : terrains de départ (piste au pied des montagnes),
  capacités (relief et réticule), résultats (mappemonde et rose des vents), types d'appareil (globe), bleu marine et
  or, en mode « cover » atténué.
- **Graphiques : palette et style au choix** (Apparence › Graphiques, comme les icônes) : palettes Automatique
  (selon le design), Vives (couleurs des pages), Ardoise, Laiton et cuir, Kaki et olive ; styles Automatique, Aplats,
  Relief (`html[data-chart-palette]`, `html[data-chart-style]`, règles du relief dans `designs.css` : utilisables dans
  tous les designs).
- **Changement de design, de palette ou de couleurs appliqué en direct** : les reportings (global, par famille) et le
  rapport de mission se redessinent (événement `repository-design-change`), sans recharger la page.
- **Fonds illustrés des blocs** (designs à matières) : emplacements prêts sur les blocs du reporting (terrains de
  départ, capacités, résultats, types d'appareil : `data-deco-bg`), image `shared/deco/<design>/bg-<clé>.webp` sous le
  contenu, fondue vers la droite et le bas ; modes « anchor » (taille d'origine, s'étend vers la droite et le bas) ou
  « cover » (redimensionnée), déclarés dans `design_deco.js` (`BG`).
- **Durci : icônes de la barre latérale** découpées dans la planche haute définition (cible, carte, compte rendu,
  graphique, carburant, avion, palette, réglages, aide), réutilisées pour les mêmes icônes partout.
- **Plaques de titre** : toujours sur la première ligne, à côté de l'icône (plus de passage sous l'icône) ; retour à la
  ligne entre les mots seulement.
- **Fenêtre Apparence** : blocs habillés par le design après chaque réglage (et non plus seulement à l'ouverture) ;
  en-tête au-dessus des outils de bloc (bouton de fermeture toujours visible).
- **Graphiques dans les designs à matières** : couleurs ramenées à la famille du design, peu saturées
  (`RepositoryNav.chartColor` : Cabinet et Carnet de vol en laiton, beige, bleu acier, cuivre, lie-de-vin, sauge, taupe ;
  Durci en kaki, olive, moutarde, rouille, gris-vert, ardoise ; plus de rose vif) : graphiques, indicateurs, pastilles
  de résultat, familles. Style en relief au lieu des aplats : barres cylindriques, anneaux ombrés, rainures gravées,
  repères gravés, ligne de base en laiton, chiffres dans la police du design. Standard, Aero, Ops, Console, Aqua :
  couleurs inchangées.
- **En-têtes de bloc (designs au trait : Standard, Aero…)** : icône, titre et sous-titre, outils centrés verticalement
  (l'icône n'est plus collée en haut à gauche, ni les outils en haut à droite).
- **Cadran Aqua** : ouverture ronde recentrée (la planche Aqua n'est pas étirée : plaque plus haute que large),
  sans correction d'ovale.
- **Aqua : plus de boutons plats** : listes déroulantes, segments, vignettes et rangées de l'Apparence en verre bombé
  (clair ou sombre), état choisi en gel de la couleur Aqua.
- **Apparence, cartes de couleurs** : en-têtes lisibles quelle que soit la page hôte (règle `header` du planificateur
  qui les repeignait en noir) ; pastilles WCAG non repeintes par les encadrés `.ok` / `.err` des tons sombres.
- **Outils de bloc (Déplacer, Masquer)** dans les designs à matières : icônes seules, sans bouton ni libellé
  (libellé en infobulle et pour les lecteurs d'écran), toujours dans le coin haut droit du bloc, même quand la plaque
  de titre passe sur deux lignes.
- **Plaques de titre** (Cabinet, Carnet de vol, Durci) : texte plus petit ; dans les blocs étroits (grilles 3 × 3 du
  reporting), les mots restent entiers (plus de texte vertical ni d'artefacts).
- **Aqua : couleur au choix** (Apparence › Design) : bleu par défaut, turquoise, vert, graphite, violet, orange, rouge,
  rose, ou couleur de chaque application ; boutons gel et icônes suivent (contraste WCAG ≥ 4,5:1 avec le texte blanc),
  les icônes d'état gardent leurs couleurs. Icônes Gel uniformisées sur une seule teinte de base (bleu),
  `tools/icons_skeuo_generator.html?set=gel`.
- **Cadrans** : lunettes non étirées ; les planches d'origine sont étirées d'environ 3,5 % en hauteur, ouverture
  relevée (ellipse) et découpe ramenée au carré (`tools/gauges_from_sheets.html`) : plus de cadran visible en haut.
- **Décors entre blocs** : posés seulement entre deux blocs voisins immédiats, l'un sous l'autre dans la même
  colonne ; plus de décor au milieu d'une grille de graphiques (reporting, « Capacités employées ») quand un
  autre élément s'intercale ; décors recalculés quand la mise en page change après le chargement.
- **Durci** : texte des plaques de titre de bloc réduit (≈ 0,98 rem, interlettrage resserré).
- **Radars** (Durci) : front du balayage net, traînée dégradée derrière (sens de rotation) ; plots éteints qui ne
  s'allument qu'au passage du front (délai calculé selon leur angle), puis s'estompent.
- **Contrastes WCAG dans les designs à matières** (studio en Durci notamment) : pastilles de code (`code`, `kbd`,
  `samp`) accordées à la matière ; encadrés d'état des pages (`.warn` jaune pâle, `.ok` vert et `.err` rouge foncés)
  lisibles sur les matières sombres.
- **Barre d'action** `repo-actionbar` (framework) : barre collée en bas d'une page, habillée par le design (acier,
  cuir marine, métal brossé) ; appliquée à la barre « Générer les cartes et le ZIP » du studio.
- **Icônes des panneaux** (CR : calculs, compte rendu) : plus d'icône en double décrochée ni de panneau déformé (la passe
  précoce de `block_icons.js` traitait un futur bloc comme un élément à icône en ligne).
- **En-têtes de blocs étroits** (designs à matières) : la plaque de titre ne dépasse plus sa colonne, les boutons ↕ /
  Masquer restent visibles et cliquables.
- **Décors entre les blocs** : seulement dans les empilements verticaux (plus dans les grilles, où ils créaient une
  cellule et tombaient sur un titre).
- **Décors** : presse-papiers et boussole redétourés (croissance de région, trous — la pince — rendus transparents,
  seule la plus grande pièce gardée) ; décors placés entre les blocs au-dessus des blocs (z-index), notamment sur la
  page Atterrissages.
- Fenêtre modale Apparence : icônes au trait des rangées d'exemple à leur taille (22 px) quel que soit le CSS de la page.
- **Cadrans** : boîtiers entiers (la découpe rognait les plaques en haut, en bas et sur les côtés) ; séparation
  automatique d'avec les instruments voisins (colonne la moins opaque).
- **Fenêtre modale Apparence** habillée par le design courant : en-tête et blocs du framework (`AppFramework.refresh(racine)`
  monte désormais des blocs dans n'importe quel conteneur), fond de la page du design ; « Tout réinitialiser » et
  « Démonstration » lisibles dans tous les designs.
- **Apparence en fenêtre modale** : le menu ☰, la barre latérale et Paramétrage l'ouvrent au-dessus de la page courante
  (réglages appliqués en direct à cette page ; fermeture par le bouton, Échap ou un clic à côté, on reste sur la page ;
  l'aperçu d'un thème est annulé à la fermeture). La page Apparence reste accessible directement.
- **Boîtiers de cadrans** tirés des planches sur fond transparent (silhouette d'origine exacte : Cabinet, Carnet de vol,
  Durci, Aqua), ouverture ajustée.
- **Boîtiers de cadrans** redécoupés sur leur silhouette (fond et ombres de la planche retirés par croissance de région,
  morceaux d'instruments voisins écartés, bords adoucis) ; ombre recréée sur le contour (contact + portée).
- **En-têtes de blocs** (designs à matières) : icône, plaque de titre et boutons alignés en haut ; en jeu d'icônes
  skeuomorphe, « Masquer / Afficher » et « Déplacer » en images du jeu (chevron haut / bas, déplacer).
- **Planificateur : cadrans réalistes** dans les designs à matières — boîtiers découpés dans les planches de cadrans
  (lunette de laiton pour Cabinet, métal sombre pour Carnet de vol, plaque sombre vissée pour Durci, plaque chromée pour
  Aqua ; vis et bouton de calage ; `tools/gauges_from_sheets.html` mesure l'ouverture et la rend transparente) ; dessous,
  le cadran vivant : fond bombé (bleu nuit pour Aqua), chiffres, graduations et aiguilles crème ombrées, moyeu, reflet
  du verre ; lecture inchangée.
- Barre latérale : groupe Apparence / Paramètres / Menu de nouveau en bas avec les jeux d'icônes skeuomorphes (la marge
  resserrée des séparateurs s'appliquait aussi au séparateur du bas).
## [2.3.0] — 2026-09-26

- **Design « Carnet de vol »** (déclinaison aéronautique de Cabinet, planche dédiée) : blocs cerclés du cadre d'aluminium
  riveté, plan d'avion en filigrane, plaques de titre en aluminium brossé avec silhouette d'avion, emblème à hélice
  ailée, barre latérale en cuir marine ; décors : bandeau du bas (tableau de bord, carte, plan de vol), presse-papier
  « Flight plan » et cadrans (anémomètre, horizon, altimètre) entre les blocs et dans les marges ; jeu d'icônes
  **Avionique** (boutons ronds de métal sombre de la planche, les autres fabriqués dans leur style).
- **Barre latérale, studio cartographique** : icônes décalées (la page n'impose pas `box-sizing` : liens plus larges
  que la barre) → modèle de boîte imposé à la barre ; entrées resserrées en jeu skeuomorphe (tout tient dans 800 px de
  haut), barre de défilement masquée (elle réduisait la largeur des entrées).
- **Barre latérale : icônes skeuomorphes affichées en premier** — images posées dès la construction de la barre
  (téléchargées avec la page, taille réservée), sans attendre le registre d'icônes ni `block_icons.css` ; mises à
  jour au changement de jeu ou de design.
- Icônes skeuomorphes plus grandes dans la barre latérale (50 px) et sur les boutons ; barre latérale de Durci texturée
  (peinture olive assombrie : deux règles de la feuille étaient avalées par un reste de ligne orpheline) ; radar
  de Durci : balayage centré sur la cible de l'image et limité à son cercle.
- **Trois jeux d'icônes skeuomorphes en images**, sélectionnables dans tous les designs : **Laiton** (médaillons),
  **Acier** (plaques vissées), **Gel** (bulles) ; icônes des planches de maquette, les autres (une cinquantaine par
  jeu) fabriquées dans leur style ; l'image remplace le tracé partout (blocs, boutons, barre latérale, zones de dépôt).
  Jeu par défaut : Laiton pour Cabinet, Acier pour Durci, Gel pour Aqua. L'ancien relief « Matière » est retiré.
- **Radar haute définition** dans le pied de page de Durci. Page Apparence : rangées « Selon le design » et des trois
  jeux (vraies images), libellés lisibles dans tous les designs.
- **Jeux d'icônes skeuomorphes tirés des planches** : médaillons de bronze (Cabinet), plaques d'acier vissées (Durci),
  bulles de gel (Aqua), découpés dans les maquettes ; les icônes absentes des planches sont dessinées dans le même
  style (médaillon, plaque, bulle), y compris dans la barre latérale.
- **Décors disséminés** (décor complet, invisibles dans les autres designs) : frise de bureau de la planche Cabinet,
  plaque DEFA, écran radar animé et plaque avion de Durci en pied de page ; presse-papier, plaques « Attention » /
  ailes / DEFA, poignée entre les blocs ; boussole, carte, pochoirs « MISSION » / « DEFA », grille, plaquettes dans les
  marges des grands écrans. Vis cruciformes, punaises de laiton et poignées de la planche à la place des dessins.
- Barres d'état des pages (« Aucune mission chargée ») habillées dans les designs à matières.
- **Textures photographiques** (ambientCG, CC0) : cuir brun et marine, bois verni, parchemin froissé, laiton, acier
  brossé et rayé, peinture écaillée olive / gris-vert / kaki ; relief cuit, reteinte, tuiles WebP ; adresses des
  textures versionnées (plus d'anciennes images en cache).
- **Espacements** : retrait latéral des blocs des designs à matières fixé (22 px ; il tombait à 14 px sur fenêtre
  étroite). **Boutons** : « Démonstration complète » (page Apparence) et « Nouveau compte rendu » (reporting global)
  ne sont plus des liens nus ; les vignettes et sélecteurs de la page Apparence gardent leur dessin (`repo-plain`).
- **Jeu d'icônes « Matière »** (relief : ombre, corps en laiton / acier / gel, trait d'encre ; palette par design),
  choix à part entière sur la page Apparence et jeu par défaut de Cabinet, Durci et Aqua ; médaillons, plaques et
  bulles des icônes de blocs réservés à ce jeu.
- **Aqua sombre** sur les pages à thème sombre (planificateur, Landing) : graphite et verre fumé, graphiques inchangés.
- **Textures plus réalistes** : relief éclairé (grain du cuir, pores du bois, plis du papier, brossage, éclats de
  peinture en creux) ; **illustrations** en décor complet : frise de bureau de Cabinet, radar tournant, plaque DEFA et
  voyants de Durci (`design_deco.js`).
- **Espacements** des blocs, sous-cartes, champs et boutons des designs à matières ; liens d'action en boutons (retour
  au générateur, « Choisir des fichiers »).
- **Réglages** : Apparence et Paramètres en boutons en tête du menu ☰, et en bas de la barre latérale.
- **Designs à matières : Cabinet, Durci, Aqua.** Cabinet (cuir, bois verni, parchemin, laiton gravé, médaillon rose
  des vents ; variante « carte de nuit » sur les thèmes sombres), Durci (carte topographique, peinture olive écaillée,
  acier, plaques kaki, champs noirs, bouton vert à voyant, radar), Aqua (métal brossé, verre dépoli, boutons gel).
  Textures WebP générées (`shared/textures/`, ≈ 140 Ko, chargées seulement avec ces designs), icônes de blocs en
  matière (médaillons, plaques vissées, bulles), emblème d'en-tête, voyant de sauvegarde dans la barre d'état.
  Réglage **Décor** (complet / sobre) sur la page Apparence, sobre par défaut sur les CR, le planificateur et Landing ;
  vignettes des nouveaux designs. Traductions ajoutées : « Exporter tous les PDF », « Dossier d'opération (un PDF) ».
- **Icônes immédiates** : en-têtes de blocs (`app_framework.js`) et icônes (`block_icons.js`) posés dès que le DOM
  est prêt, sans attendre images, polices et cartes (nouvelle passe au chargement complet).
- **Icônes, suite de la migration** : reportings (par famille et global : blocs et boutons d'export / impression /
  dossier), fiches appareil et équipage (blocs du framework), Paramétrage, bandeau d'édition du CR ; nouvelles icônes
  `folder`, `printer`, `clock`, `trash`, `edit`. Emoji remplacés : boutons « maintenant » du CR (📅 / ⏱ → calendrier /
  horloge, icône seule toujours affichée), bouton de sauvegarde (💾). Le bouton de dossier garde son icône quand son
  libellé change (`file_access.js`).
- **Aéro** : arrondis adoucis (blocs 12 px, boutons 8 px au lieu de pastilles, champs 7 px, menus 12 px).
- **Page Apparence** (`CR DEFA/apparence.html`) à la place du bloc de Paramétrage : vignettes des quatre designs
  dessinées dans leur design, jeux d'icônes montrés par épaisseur de trait, barre latérale en trois choix, une carte par
  thème (applications, familles de CR) avec palette de familles, ton, aperçu bandeau / bouton / lien, contrastes WCAG
  et aperçu du thème sur la page ; lien vers la démonstration, réinitialisation. Le menu ☰ « Apparence… » y mène,
  Paramétrage garde un lien.
- **Missions** : plus de numéros 1 / 2 / 3 en tête des blocs du générateur et du studio.
- **Barre latérale immédiate** : construite par `repository_nav.js` dès son exécution, styles dans `repository_nav.css`
  (chargé dans l'en-tête) ; elle paraît avec l'en-tête au lieu d'arriver en dernier, les icônes se posent ensuite dans
  des emplacements de taille fixe (`side_nav.js`). Paramétrage : bouton « Ouvrir la page Apparence ».
- **Icônes et sous-titres de blocs — migration** : CR (les 16 familles : icône et sous-titre des blocs communs, icône par
  défaut des blocs propres aux familles, panneaux de calculs et de compte rendu), Landing, planificateur, générateur de
  mission et studio (blocs numérotés, zones de dépôt de fichiers, boutons à icône) ; sous-titres en 4 langues.
- **Apparence (Paramétrage › Apparence)** : design (Standard, Aéro, Opérationnel, **Console** — remplace Brief),
  jeu d'icônes (trait normal, fin, épais, aucune), barre latérale, **couleurs des thèmes par famille** (teinte /
  saturation) et ton, avec aperçu et contrastes WCAG calculés ; page de démonstration accessible depuis ce bloc.
  Le menu ☰ mène à ces réglages (« Apparence… »).
- **Framework — icônes, numéros, sous-titres, zones de dépôt, barre latérale** (`block_icons.js`,
  `icons/repository_icons.js`, `side_nav.js`), chargés sur toutes les pages ; page pilote : générateur de mission
  (blocs numérotés à icône et sous-titre, zones « glisser-déposer », boutons à icône).
- **Compteur de sauvegarde** : les préférences d'affichage (design, icônes, couleurs, langue, onglets et séparateurs
  du studio, colonnes et cadrans du planificateur, formats de sortie…) ne comptent plus comme modifications.
- `repository_tree` versionné (`?v=`) dans toutes les pages, comme les scripts partagés.
- **Opérations — assemblage** : studio — carte de l'opération (trajets de toutes les équipes en couleurs, légende,
  rendez-vous communs), à la racine du ZIP de toutes les missions et en tête des aperçus ; générateur — **dossier
  d'opération en un PDF** (page de garde : missions et équipes, rendez-vous communs, carte de l'opération ; puis
  le brief de chaque mission).
## [2.2.8] — 2026-09-26

- **Studio — opérations** : aperçus de toutes les cartes de toutes les missions, groupés par mission ; « Générer les
  N missions » en un ZIP (un dossier par mission, chacune avec sa carte d'assemblage) ; réglages des cartes gardés
  d'une mission à l'autre. Générateur : lecture de ce ZIP (carte d'assemblage de chaque mission).
- **Missions — collage de plusieurs missions en un** : réponse de ChatGPT copiée depuis la page (étiquettes « yaml »,
  « Copier le code », sans ```), ou YAML et Markdown des missions à la suite ; texte hors mission écarté.
- **Missions — opérations chargées en plusieurs fois** : sélecteur de l'en-tête affiché dès qu'une mission annonce
  son opération (missions manquantes grisées) ; une mission de la même opération collée ensuite rejoint le lot ;
  prompt : livraison mission par mission (« suite ») quand la réponse est trop longue.
- **Missions — lots (opérations à plusieurs équipes)** : plusieurs missions chargées d'un coup, par fichiers ou
  texte collé (réponse ChatGPT découpée sur « Fichier : … » ou « # Mission … ») ; navigation ◀ ▶ dans l'en-tête du
  générateur et du studio (lot partagé, modifications gardées) ; générateur : **Exporter les N PDF** (un brief par
  mission). Étape suivante : cartes et assemblage de l'opération.
## [2.2.7] — 2026-09-26

- **Prompt de génération — opérations à plusieurs équipes** : une mission complète par équipe DEFA (41A, 41B… : son
  aéronef, son départ, ses points tournants, ses cartes, son brief), regroupées par un bloc `operation` ; rendez-vous
  communs identiques d'une mission à l'autre ; section « Coordination de l'opération » (ex. FIRE : Milan, Dragon et
  avion de commandement). Le lecteur de missions distingue 41A de 41B.
## [2.2.6] — 2026-09-26

- **Planificateur — courbes compactes** : hauteur bornée par la fenêtre (les courbes s'élargissent sur une colonne
  large au lieu de grandir), redessinées au changement de taille ; espace entre courbes ajouté seulement quand un
  panneau déborderait.
- **Prompt / ChatGPT — plusieurs théâtres** : `THÉÂTRE` accepte « A + B » (acheminement Guyane – métropole, relève
  Corse – continent… avec escales réalistes) ; second théâtre facultatif dans le générateur.
- **Créer une mission avec ChatGPT** déplacé dans le **générateur de mission** (sous-bloc du bloc 1, à côté du
  collage) ; correctif « failed to fetch » : le prompt est embarqué dans `SIA XML/mission_prompt.js`
  (`tools/build_mission_prompt.py`, relancé par `bump_versions.py`) au lieu d'être lu dans docs/.
- **Studio** : le doublon de « Générer les cartes et le ZIP » est un vrai pied de page semi-fixe (il était devenu
  un bloc déplaçable), avec le nombre de cartes du ZIP ; bloc « Créer une mission avec ChatGPT » affiché ouvert.
- **Planificateur — au-dessus du plafond** : courbes (altitude optimale, montée, TAS) jusqu'à 110 % du plafond,
  zone grisée « inaccessible », courbes prolongées (modèle au-delà du plafond, sinon extrapolation) ; optimums et
  devis inchangés, sous le plafond.
- **Planificateur — cadran horloge** : temps de vol du trajet au niveau courant, même lecture que le cadran
  carburant (une par courbe, dans sa couleur, changée d'un clic sur l'un ou l'autre).
- **Planificateur** : TAS (tirets de la couleur de chaque loi) sur la courbe « Vitesses de montée — Badin et TAS » ;
  cadran **carburant** (carburant du trajet au niveau courant, kg / lbs, durée), une lecture par courbe — loi
  réglée, profil, croisière économique, montée rapide, Vy, montée économique — changée d'un clic, dans sa couleur ; liens des messages d'erreur vers les
  champs à renseigner (profil incomplet, limites, altitude de référence estimée).
- **Studio** : case « ZIP » aussi sur la carte de contrôle et sur les aperçus ; bouton « Générer les cartes et le
  ZIP » doublé dans une barre fixe en bas de page ; bloc **Créer une mission avec ChatGPT** (type, théâtre, série,
  équipes DEFA en vol 1 à 5, ou aléatoire) : prompt copié et ChatGPT ouvert dans un nouvel onglet.
- **Prompt de génération** : paramètre `ÉQUIPES_DEFA` (aéronefs DEFA en vol ; équipes sol en plus selon la mission).
- **Correctif — plafond et altitude de référence du modèle** : sans « Altitude de référence » dans le profil,
  l'estimation par cohérence des débits de montée / croisière tombait sur la borne basse (Caravelle III calibrée à
  2 000 ft → plafond 17 600 ft ; courbes arrêtées vers le FL150). Désormais : fiche EUROCONTROL APD du type en
  référence (plafond pratique ; réacteur : altitude où le Mach APD donne la TAS du profil), recherche bornée à la
  plage plausible de la classe et retenue seulement si l'optimum est intérieur, sinon altitude type de la classe
  (Caravelle III : plafond 37 300 ft ; Citation X : 40 900 ft ; Twin Otter plafonné à son plafond APD).
- **Correctif — planificateur** : plus de clignotement des colonnes quand on bouge les curseurs (rangées de
  courbes qui ne font que grandir pendant un réglage — `StickyFrame.resetGrow()` au calcul suivant ; hauteur fixe
  de la ligne de rappel du devis).
- **Planificateur — le devis suit les courbes** : block fuel, temps de vol, détail et TOD recalculés aussitôt avec
  la loi de montée des curseurs et le niveau épinglé (à la place du niveau du plan) ; rappel du niveau et de la loi
  retenus sous le block fuel.
- **Studio — case « ZIP » par carte** : décochée, la carte n'est pas générée ni mise dans le ZIP (reste
  prévisualisable) ; recochée à chaque chargement de mission.
- **Planificateur — corrections d'affichage** : aiguille TAS semi-transparente sur le Badin (échelle étendue à la
  TAS) ; la fiche épinglée reste visible quand le bloc Résultat est collé (le mode compact la masquait) ; les
  panneaux de la colonne de droite ne se chevauchent plus (chaque rangée de courbe au moins aussi haute que son
  panneau — option `grow` de `StickyFrame.follow`) et plus d'espace entre les courbes.
- **Planificateur — météo (écart ISA)** : écart ISA, ou température au sol (avec l'altitude du terrain), ou
  température au niveau ; appliqué au modèle (densité, vitesse du son, poussée / puissance, consommation, plafond ;
  profil calibré en standard) : devis, courbes et fiche. Nouveau **temps de vol** dans le Résultat et encart de
  comparaison au standard (trajet, niveau optimal, plafond).
- **Planificateur — courbe TAS** selon le niveau (croisière, croisière économique, montée à la loi réglée,
  croisière en ISA en pointillés), jauge synchronisée.
- **Correctif — modèle de performances** : au plafond d'un réacteur (« coin de cercueil » : traînée minimale
  au-delà du Mach permis), la croisière limitée en poussée donnait une vitesse supérieure au Mach du profil ;
  le palier est maintenant refusé (poussée insuffisante).
- **Prompt de génération de missions** : consignes au lieu d'une liste fermée de terrains — départ depuis la base
  réelle de l'unité (Dragon, SMUR / hôpital, pélicandrome pour Dash 8 / Canadair / Tracker, terrain militaire de
  préférence), théâtres d'outre-mer (Antilles, Guyane, Réunion, Mayotte, Nouvelle-Calédonie, Polynésie…),
  signes des coordonnées ; désignateurs Sécurité civile (CL2T, DH8D, BE9L).
  Titre et description avec un trait d'humour ou une situation décalée, sans nuire au réalisme.
  Textes aérés : résumé en 2 paragraphes, description détaillée en 5 (contexte, transit, action, décisions,
  retour), blocs YAML littéraux « |- » (« >- » recollait les lignes).
- **Planificateur — trois colonnes redimensionnables** : saisie et courbes | Résultat | instruments (Badin, vario,
  altimètre, empilés et collés sous l'en-tête) ; poignées entre les colonnes (framework `column_resize.js`,
  double-clic : largeurs par défaut). Correctif : la colonne Résultat s'arrêtait 120 px avant le bord des blocs
  pleine largeur (colonnes implicites de l'ancienne grille à 12 colonnes).
- **Designs** : formes appliquées à toute la page — boutons et listes déroulantes de l'en-tête (sélecteurs des CR,
  menu ☰, langue), boutons ↕ / Masquer des blocs (ex. Brief : tout carré).
- **Prompt de génération de missions** (`docs/PROMPT_GENERATEUR_MISSIONS.md`) : schéma YAML exact, format Markdown,
  codes de familles et sous-types, désignateurs OACI reconnus, terrains de référence, axes AAR, cartes, profil
  vertical et contrôles de validation, pour produire des séries directement lisibles.
- **Studio — profil vertical** : `DESTINATION` (et `ORIGIN`, `TARGET`) toujours reconnus dans le cheminement,
  même quand la destination est le terrain de départ (le point était fusionné, le retour disparaissait).
- **Planificateur — instruments du bandeau** : Badin, vario et altimètre fictifs dans l'en-tête, associés aux
  curseurs de la loi réglée (consigne en repère violet, valeur tenue à l'altitude survolée / épinglée / du plan) ;
  Badin et vario réglables sur l'instrument (glisser ou molette).
- **Designs graphiques** (menu ☰ › Design) : Standard, **Aéro**, **Opérationnel**, **Brief** — configurés par
  le framework (`shared/designs.css`, liste dans `repository_tree`), sur toutes les pages ; couleurs du thème de
  chaque page conservées.
- **Générateur de mission** : fenêtre de collage (Markdown ou YAML), comme dans le studio.
## [2.2.5] — 2026-09-25

- **Profil vertical (studio et planificateur) — changement de niveau entre deux points** : une ligne `FL105`
  ou `5500 ft` seule dans le cheminement fait monter ou descendre vers ce niveau après le point précédent (sans
  point ni groupe vitesse / niveau).
- **Studio — profil vertical** : champ **Niveau de croisière** (`FL65` ou `6500`, enregistré dans la mission) —
  sans niveau ni altitude dans le cheminement, la trajectoire n'était pas tracée, sans explication (un message le
  dit désormais). Le cheminement proposé suit origine → points tournants → destination (il passait par la
  destination en 2ᵉ point : 906 NM au lieu de 380 sur COMMAND 41) ; les points de la mission sont listés sous le
  champ et s'ajoutent d'un clic.
- **Correctif — menu ☰ et menu des langues** : ils passaient sous les boutons de la ligne 2 de l'en-tête (CR,
  reporting : « Mission ▾ », « Registre ▾ ») ; ils sont maintenant au-dessus.
- **Correctif — lecture des missions générées (YAML + Markdown)** : le Markdown actuel des séries
  (`summaryNN.md` : AAR, AIRLIFT, COMMAND, LE, MARITIME, MEDEVAC) n'était lu qu'au titre près — seul, il donnait
  une mission sans points. Ses données sont maintenant lues (points tournants, rendez-vous, équipes, charge,
  objectifs, ravitaillement en vol, risques, départ / destination) ; le générateur et le studio partagent la même
  lecture. Un dossier de série entier n'est plus fusionné silencieusement en une mission (message clair), les
  fichiers annexes (`maps_manifest.md`, `AAR_TRACKS_REFERENCE.md`, `VALIDATION.txt`) sont ignorés et la ligne
  « --- » recopiée comme équipe dans les YAML MEDEVAC est écartée. Vérifié sur les 44 missions générées.
- **Contrastes (WCAG ≥ 4,5:1)** : description de famille en blanc dans l'en-tête (plus de gris sur la couleur
  du thème) ; thèmes trop clairs assombris d'un ton (MARITIME, AAR, SAR, AIRBORNE, FI, SURVEY : ≥ 5:1 même sur
  les boutons de l'en-tête) ; liens de l'import (texte cyan sur fond cyan, invisibles), libellés du choix de
  famille des reportings (blanc sur blanc) et textes gris des menus (opacité) corrigés.
- **Code — JS partagés lisibles et spécifiés** : framework, Mission Core (modules et familles), modèle de
  performances, profils verticaux, axes AAR, symboles et magasin SIA reformatés (jsbeautifier, littéraux protégés,
  code identique hors blancs, contrôles de syntaxe et d'insertion de points-virgules) ; chaque fonction porte sa
  spécification (rôle, entrées, sortie, effets).
- **Scrapper des types (update_aircraft_db.py)** : la source OACI Doc 8643 était hors service (PDF en 404) —
  remplacée par la liste officielle JSON de l'OACI (7 262 entrées, nom représentatif par désignateur) ;
  position d'aile cohérente avec la classe OACI (plus de « rotor » pour le Rafale ou le MQ-9) ; option
  `--only`. Les 20 types militaires écrits en dur dans `aircraft_catalog.js` viennent maintenant de la base
  (E2C → E2, RQ9P → Q9 en alias dans `aircraft_overrides.json`).
- **Données — inventaire et sauvegarde** : `docs/DONNEES.md` recense chaque base (référence importée par un
  outil, donnée utilisateur sauvegardée, ou cache reconstructible). Les sauvegardes des données locales
  incluent désormais les bases IndexedDB de données utilisateur (OFP / calibrations du planificateur, journal
  d'atterrissages chargé), restaurées par fusion.
- **Base des types — passe EUROCONTROL APD** (252 types) : 173 fiches de performances dans
  `AircraftDB/aircraft_perf.js` (comparées aux profils dans le planificateur), 141 noms de modèle réparés dans
  `aircraft_db.js` (« Aircraft Performance Database », « Skip to aircraft details »), 79 types sans fiche APD.
- Code : carte et spécification des fonctions du planificateur (`flight_performance_planner.html`) et de
  `flight_ui.js` (commentaires seulement).
- **Planificateur** : aide au survol de chaque champ du profil (contenu et usage par le modèle, 4 langues,
  `shared/flight_profile_help.js`) ; Vx partout où figure Vy (fiche du curseur, panneaux, relevés, courbe
  des vitesses en pointillés fins).
## [2.2.4] — 2026-09-25

- **CR DEFA — description de famille dans l'en-tête** : elle était posée mais masquée (règle CSS qui cachait le
  sous-titre quand l'en-tête porte la barre d'outils) ; affichée sur toutes les pages de CR et de reporting,
  anciennes pages FIRE et HEMS / MEDEVAC comprises, même texte qu'au survol des tuiles de « Nouveau compte rendu ».
- **Planificateur — vue des courbes robuste** : chaque courbe et table est dessinée isolément ; une erreur
  n'emporte que sa courbe (cause affichée dans son panneau, détail en console). Sans niveau atteignable, les
  courbes de montée restent affichées et la cause est précisée (plafond sous 1000 ft, trajet trop court).
- **Landing dashboard — traducteur commun** : libellés statiques (titres, options, menus) traduits par
  `content_i18n.js` à partir des dictionnaires de la page, typographie commune partout ; zones calculées
  (cartes, courbes, tables, état) en `data-no-i18n`. Traducteur : conteneur `[data-i18n]` traduit même
  rangé dans le menu ☰.
- **Typographie** (`content_i18n.js`, toutes les pages traduites) : en français, espace fine insécable (U+202F)
  avant « : ; ! ? » » et après « « » — le retour à la ligne ne rejette plus la ponctuation en début de ligne ;
  en anglais, allemand et espagnol, plus d'espace avant « : ; ! ? ». Appliquée à l'affichage (textes et
  attributs, outils d'en-tête compris), jamais aux sources. Planificateur : scripts partagés versionnés (cache).
- **Framework — `sticky_frame.js`** : cadres semi-mobiles (`StickyFrame.stick` / `follow`), repris par le
  Studio cartographique (colonne d'aperçu, même comportement) et le planificateur.
- **Planificateur — vue des courbes réorganisée** (`shared/flight_perf_view.js`, fonctions documentées) :
  courbes à gauche ; à droite le bloc Résultat (compact une fois collé) et un panneau d'explications par
  courbe qui la suit au défilement ; loi réglable en **curseurs verticaux** (vario à gauche, Badin à
  droite) sur chaque courbe, courbe violette aussi sur l'altitude optimale ; couleur au libellé seulement,
  une taille de texte ; définitions au survol ; groupe Régimes de vol repliable.
- **Planificateur** : fiche curseur (⌖ survol, 📌 épinglé) dans le bloc Résultat, suivie du groupe **Régimes de vol**
  (ancien bloc « Profil actif ») ; le bloc Résultat **reste fixe au défilement** jusqu'à la rangée moteur / RPM ; **loi de montée réglable**
  (Badin et vario visé, en violet sur les courbes, dans la table et la fiche) ; croisière d'un réacteur
  **limitée par la poussée** au lieu d'un niveau « inatteignable » ; montée au Badin du profil **puis en Mach**
  (un Badin constant dépassait Mach 0,9 en altitude) ; croisière économique jamais plus rapide que celle
  du profil ; jauges : un seul enregistrement par courbe redessinée.
- **Base des types — EUROCONTROL APD** : `update_aircraft_db.py --apd` lit le tableau de performances de
  chaque type → `AircraftDB/aircraft_perf.js` et répare les noms de modèle mal lus (143 entrées) ;
  écritures atomiques réessayées si un client de synchronisation verrouille le fichier. L'éditeur de
  profil compare les champs aux valeurs APD (étiquettes identique / différent / vide, reprise au clic).

## [2.2.3] — 2026-09-25

- **Planificateur — courbes de performance plus lisibles** : bloc « Comment lire ces courbes » (marche à suivre
  de graphe en graphe, définitions Vy / Vx / Badin / TAS / TOC / TOD, 4 langues) ; les trois courbes en altitude
  ont une **jauge commune** (survol) et un **clic épingle un niveau** (trait blanc sur les trois + fiche 📌 :
  croisières, vario, vitesses à tenir) ; vocabulaire explicite (« croisière du profil », « croisière économique »,
  « vitesse de montée du profil »). Ligne **Limites** : plafond retenu et sa source (champ « Plafond max » du
  profil ou modèle), niveau demandé, niveau le plus haut possible sur la distance ; chaque « inatteignable »
  donne sa cause (trajet trop court, plafond, poussée) et le champ à modifier.
- Correctif : un commentaire `//` dans `content_i18n.js` minifié cassait la traduction de toutes les pages.
- **CR DEFA — nouvelle famille AAR / ravitaillement en vol** : rôle (ravitailleur / ravitaillé),
  hippodrome du MIAM ENR 5.7 ou autre zone, niveau, type de rendez-vous, système (perche, panier,
  nacelles), ravitaillés (indicatif, type, carburant prévu / transféré, contacts, résultat), bilan
  carburant, breakaways, incidents ; statistiques et synthèse ; pages `CR DEFA/AAR/`. Les missions
  « ravitaillement / refuelling / tanker » (brief SIA, journal DEFA) y sont rangées (auparavant
  transport / spécial).
- CR DEFA : **police du ciel / interception (QRA)**, nouveau sous-type de COMMAND (aéronef intercepté,
  motif, délai alerte → décollage, mesure prise, déroutement ; événements scramble, interception,
  identification) ; libellés plus clairs (« Commandement / police du ciel / guet aérien », « Contrôle en
  vol des aides radio ») ; **description de chaque famille** (4 langues) en sous-titre des pages de CR /
  reporting et au survol dans « Nouveau compte rendu ». Recherche de famille dans les 4 langues.
- Traduction : morceaux de texte composés (« Types d’appareil : aucune », « Dossier : navigateur
  uniquement », liste des familles de l’en-tête) désormais traduits en entier.
- « Nouveau compte rendu » : **champ de recherche** de la famille — la description de la mission
  (« évasan hélico », « ravito », « police du ciel »…) est comparée aux mots-clés de chaque famille
  (synonymes FR / EN, appareils et indicatifs typiques, expressions) ; familles classées, les autres
  estompées, Entrée ouvre la première. Recherche locale, sans service en ligne.
- Planificateur : **triangle des optimums de montée** (Vy, montée rapide — temps de bloc, montée
  économique — carburant, gaz compris pour une hélice), lois de Badin selon l'altitude, table
  comparative montée / trajet ; altitude optimale : un optimum par courbe (profil, économique, vitesse)
  au lieu d'un minimum mélangé, relevé de jauge coloré ; textes du planificateur dans les 4 langues.
- Planificateur : jauges déplaçables et valeurs sous les courbes de montée et RPM / consommation ;
  légendes aux couleurs des courbes.
- **Flight Performance & Fuel Planner — Profil vertical** : bloc de coupe le long d'une route
  saisie ou reprise de l'OFP importé en en-tête (paliers compris) ; trajectoire prévue aux taux
  de montée / descente du profil avion actif, **TOC** et **TOD** ; profil d'affichage du studio SIA
  (par défaut celui choisi dans le studio) et base SIA mémorisée par le studio.
- Profil vertical (studio et planificateur) : **groupes vitesse / niveau** du plan de vol
  (`N0450F350`, K / M, F / A / S / M), **VFR**, case 15 (DCT, voies aériennes, coordonnées
  `4630N00130E`) ; trajectoire tracée sur la coupe.
- **Flight Performance & Fuel Planner — modèle de performances** (`shared/flight_performance_model.js`) :
  mécanique du vol calibrée sur le profil (polaire, poussée / puissance selon la densité et la
  motorisation, consommation) ; **altitude optimale** carburant et vitesse (régime économique et régime
  du profil, montée et descente comprises), **montée optimale** (Vy, Vx, vario et carburant par 1000 ft
  selon l'altitude, régimes RPM / N1) ; devis carburant au niveau du plan par le même modèle.
  Correctif : l'optimum ne dépend plus du niveau saisi (il servait de référence quand le profil n'en
  avait pas) ; la calibration OFP enregistre le niveau de croisière et le Badin moyen de chaque phase ;
  champ « Motorisation ».
- Profil vertical : montée selon le modèle de l'appareil (planificateur : avion actif ; studio : appareil
  choisi parmi les profils du planificateur), taux saisis en secours.
- Surfaces bâties : contour **orange** autour des agglomérations des villes ≥ 100 000 hab.,
  **jaune** autour des autres.
- Studio SIA : **plancher** de la coupe réglable (en plus du plafond) ; points « NOM lat lon ».
- Module `SIA XML/vertical_profile.js` partagé : sélection des espaces d'un profil, résolution
  des points, relief (le studio s'en sert aussi).

## [2.2.2] — 2026-09-25

Studio cartographique (Missions SIA) : symboles OACI.

- Onglet **Aérodromes et radionav** renommé **Symboles OACI**.
- **Survol interdit** (installations portant une marque distinctive) : les symboles ⊗ ne se
  recouvrent plus (les plus grands sites d'abord).
- **Parcs et réserves naturels** de nouveau affichés : 117 des 143 de l'AIXM ne sont qu'un point
  et étaient écartés ; ils ont maintenant un symbole vert (base à relire une fois).
- **Agglomérations** dans l'onglet Symboles OACI : surfaces bâties dessinées par le studio sur tous
  les fonds (raster compris), au choix **aucune / contour / remplissage / contour + remplissage**
  (orange / jaune OACI), seulement autour des villes d'au moins **N habitants** (réglable, 20 000
  par défaut) ; polygones OpenMapTiles, visibles dès l'échelle régionale, contour sans coutures de
  tuiles. Villes en symboles OACI (grande ville tache orange, ville jaune, localité point jaune),
  affichées même sans « Libellés de villes » (symbole seul).
- Correctif : le contour orange des surfaces bâties s'affichait même couche décochée ; les surfaces
  bâties n'apparaissaient pas à l'échelle régionale sur le fond vectoriel par défaut.
- Libellés courts, détails en sous-titre (villes OACI, parcs et réserves).
- Onglet Fond de carte : cadre **Villes et agglomérations** (libellés, population, symboles OACI,
  surfaces bâties) ; onglet Symboles OACI : **obstacles** regroupés avec survol interdit et parcs.
- Correctif : surfaces bâties absentes quand la carte se chargeait en arrière-plan (source intégrée au style).
- **Profil vertical** (nouveau) : cheminement (points de la mission, aérodromes, balises,
  coordonnées, altitude prévue « /3000 » ou « /FL65 »), coupe relief / obstacles / espaces traversés
  en second aperçu, image `profil_vertical.png` dans le ZIP (facultative) et dans le brief PDF ;
  réglages enregistrés dans le YAML de la mission (`vertical_profile`). Cheminement fait de tous
  les points connus : brief, aérodromes, balises, points RNAV de l'AIXM, radiale / distance
  « REN300010 » ; tracé sur les cartes (aperçu et PNG).
- Le profil vertical est une **carte comme les autres** : entrée `profil_vertical.png` dans la liste
  des cartes, avec son profil d'affichage (nouveau profil par défaut **Profil vertical** : toutes
  les familles d'espaces, aucune autre case) ; espaces et obstacles de la coupe selon ce profil ;
  libellés de **tous** les espaces traversés (place libre, sinon trait de rappel) ; plafond
  automatique couvrant leurs planchers (jusqu'au FL 195).
- Case **Noms abrégés** (onglet Zones) : nom seul, sans le type de zone (cartes et coupe).
- Villes : curseurs de population logarithmiques dès 1 000 habitants, seuils séparés pour les
  symboles, les libellés et les surfaces bâties ; villes de l'aperçu dessinées sur le canvas
  (placement accéléré par grille : des milliers de villes).
- Correctif : colonne de l'aperçu plus haute que la fenêtre (bas inaccessible). Le fond de
  l'aperçu interactif qui s'efface au défilement reste un bug connu.
- Tour de commentaires dans le code (en-têtes de fichiers, sections) ; section **Bugs connus**.

## [2.2.1] — 2026-09-25

Corrections du studio cartographique (Missions SIA).

- **Outre-mer** : toutes les zones, aérodromes et balises sont de nouveau sélectionnables (Nouméa,
  Polynésie…) ; seul le dessin est limité à l'emprise affichée (rien de l'autre côté du globe).
- **Aérodromes** : ne sont plus masqués par leurs propres balises (LFRN restait invisible derrière
  le DME et l'ILS de Rennes) ; priorité aux plus grands et aux contrôlés ; liste blanche opérante.
- **Radionavigation** : TACAN visibles (au-dessus des symboles de bases aériennes) ; priorité
  TACAN > VOR > DME > NDB > ILS > DME d'ILS (bout de piste) ; libellés rétablis (ils se rejetaient
  eux-mêmes) ; cases « libellés » séparées pour les aérodromes, les balises et les espaces.
- Nouvel onglet **Aérodromes et radionav** (devenu **Symboles OACI** en 2.2.2) ; **installations portant une marque distinctive**
  (survol interdit < 1000 m / 3300 ft, 198 sites de l'AIXM, symbole ⊗) et parcs / réserves.
- Espaces : **opacité réglable** (50 % par défaut) ; libellés de villes et de points tournants
  réservés avant les cartouches de zones (plus de recouvrement).
- **Libellés de villes** sans recouvrement : les villes les plus peuplées d'abord, une ville dont le
  libellé recouvrirait un autre n'est pas écrite (PNG, SVG, carte de contrôle).
- Blocs : 1. Mission (avec « Afficher toutes les cartes » et « Générer »), 2. Profils, 3. Cartes.
- Fenêtre séparée : synchronisée aussi pour le profil de chaque carte et les cartes ajoutées ;
  carte agrandie (⤢) et fenêtre séparée réduites à la carte et à ses commandes.

## [2.2.0] — 2026-09-25

Nouvelle application **Missions SIA** (générateur de mission et studio cartographique), corrections
de la suite.

### Suite

- **Fusions / renommages** (pilotes, appareils) : une fusion faite dans un sens puis renommée dans
  l'autre créait une boucle (A → B et B → A) qui échangeait les deux noms (cas GRR / RBR) et
  empêchait tout nouveau renommage. Le renommage retire l'équivalence contraire, les chaînes sont
  suivies sans boucle ; Paramétrage › **Fusions et renommages** liste les équivalences, signale
  les boucles et permet de les supprimer.
- **Rappel de sauvegarde** : bouton rouge « Sauvegarder dans le dossier (n) · dernière : … » après
  10 modifications des données du navigateur ; il disparaît après la sauvegarde.
- En-têtes des pages Missions SIA alignés sur ceux des autres applications (bandeau pleine largeur,
  titre, boutons, menu ☰ à droite) ; sorties des cartes (PNG, SVG, largeur) dans le menu ☰ comme
  le profil pilote.

### Missions SIA (nouvelle application, dossier `SIA XML/`)

- **Documentation** : [docs/SIA_MISSIONS.md](SIA_MISSIONS.md) (générateur de mission et studio :
  données, format des missions, profils, zones, MORA, hippodromes, stockage, services) ; README
  EN / FR (quatre applications), INSTALL (données SIA), tutoriel (§ 13, mission SIMONE), manuel
  d'exploitation (§ 9.1 : cycle AIRAC, MORA, axes ENR 5.7), FRAMEWORK (`aar_tracks.js`,
  passerelle mission → CR, dossier `__sia`).

- **Générateur de mission** et **studio cartographique** intégrés à la suite : bandeau et menu
  communs (thème et favicon SIA), blocs masquables / déplaçables, pied de page de version,
  js-yaml commun ; historique du dépôt d'origine repris.
- Studio : **hippodromes de ravitaillement** (MILAIP ENR 5.7) tracés exactement pour les axes
  de la mission (cap, longueur, largeur, côté ; côté non publié en pointillés) ;
  `miam-enr-5-7-tracks.xml` nommé et corrigé depuis le PDF (`shared/aar_tracks.js`).
- Studio : choix de **fonds vectoriels** (OSM Shortbread réglable, OpenFreeMap Liberty / Bright /
  Positron, VersaTiles Colorful / Graybeard / Shadow / Eclipse), relief et courbes ajoutés aux
  fonds publiés.
- Studio : **profils d'affichage** (ajout, duplication, suppression) regroupés dans le bloc 3
  avec les zones, et **carte de contrôle** en colonne de droite (carte de la mission au choix,
  profil en cours, actualisée à chaque réglage) ; bouton « Retour » / « Transmettre » dans la
  barre d'en-tête, menu ☰ à droite.
- Studio : les **autres éléments** (points tournants, hippodromes, cercle de zone, quadrillage,
  MORA, tailles et couleurs des libellés) font partie du profil, comme les zones et les couches ;
  chaque carte est dessinée avec les réglages de son profil. Bloc 4 : données complémentaires
  (import MORA, calibration du fond local).
- Studio : **couches OSM sur tous les fonds vectoriels** (OpenFreeMap, VersaTiles : couches du
  style regroupées par source ; POI et numéros masqués) ; seuls les fonds raster les désactivent.
- Studio : collage de mission dans la fenêtre de copier-coller commune.
- **Passerelle vers CR DEFA** : « Créer le CR DEFA » (générateur de mission) ouvre un nouveau CR de
  la famille du type de mission (MEDEVAC → HEMS, TRAINING → SPECIAL…), pré-rempli : nom et numéro,
  objectif, terrains (OACI du nom), points et coordonnées, appareils (type OACI du catalogue,
  indicatif ; à défaut, équipes dotées d'un aéronef), exploitant, charge.
- Studio : **grille MORA calculée** (1° × 1°) : point le plus haut — relief Terrarium (z9 puis
  z12 autour des maxima), sommets OSM, obstacles de l'AIXM SIA (13 836) — + 1000 ft (2000 ft
  au-delà de 5000 ft), arrondi à la centaine ; relief majoré de 100 m si les sommets OSM sont
  indisponibles. Remplace l'import PDF : la carte ENR 6.1 n'a pas de grille (ses valeurs sont
  celles de zones irrégulières), l'ancien `mora.csv` était faux. `mora.csv` régénéré (150
  cellules, 1000 à 18 100 ft). Valeurs non certifiées.
- Studio : grille MORA affichée en **valeurs seules** (le quadrillage fait la grille), centrées dans
  les carrés ; en zoom arrière, cellules fusionnées par 2 × 2 puis 4 × 4 (valeur la plus haute),
  seuil réglable (« espacement minimal des valeurs »), blocs calés sur le quadrillage.
- Studio, sélection des zones : groupes « R 166 — 4 zones (A1, A2, B, C) » dans la complétion
  (identifiant de base : numéro de tête, ou nom sans son numéro final) ; zones
  déjà ajoutées retirées des choix.
- Studio, sélection des zones : tri par famille (R, P, D, CTR, TMA, SIV) puis par numéro (12 avant
  118) ; « Tout supprimer » ; collage d'une liste (une zone par ligne) ; complétion sur toutes les
  familles avec limites verticales ; **alias** modifiables communs aux profils (« @RTBA », proposé
  d'après les zones AZBA de la base SIA).
- Studio : libellés des zones avec leurs limites verticales (« 800 ft ASFC – 2700 ft ASFC ») ;
  libellés des zones, quadrillage et MORA lisibles sur la carte de contrôle (échelle écran).
- Studio, bloc « Profils d'affichage » compact : barre de profil, onglets Fond de carte / Zones /
  Éléments, colonnes 60 / 40 réglables par une barre de redimensionnement (double-clic : 60 / 40),
  carte de contrôle agrandissable (⤢, Échap).
- Studio : **hippodrome choisi explicitement** par mission (Automatique — axe détecté et raison —,
  Aucun, ou l'un des 31 axes) ; axes ENR 5.7 mémorisés avec la base (fonctionne sans relire le
  dossier, y compris en `file://`) ; base mémorisée d'une version précédente relue automatiquement.
- Studio : valeurs MORA lisibles (12 pt, opacité 90 %, halo non atténué).
- Studio : **symbologie des cartes OACI** (légende SIA / IGN) : espaces contrôlés par classe,
  R / D hachurées, P quadrillées, RTBA, croix des petites zones, cartouches nom / plafond /
  plancher ; **tranche d'altitude** affichée (plancher / plafond).
- Studio : **aérodromes** (type de piste, orientation, CAP / restreint / État), **radionavigation**
  (VOR, VOR-DME, VOR-TACAN, TACAN, DME, NDB, rose magnétique), **obstacles** (hauteur minimale,
  balisage, groupes, éoliennes) lus dans l'AIXM SIA (`SIA XML/aero_symbols.js`).
- Studio : colonne de droite = carte de contrôle, commandes (Refresh, **Reprendre le cadre**,
  ⌂, Rétablir, Appliquer, ⧉, ⤢), liste des cartes, **profil de la carte choisie** (plus de liste
  déroulante de carte ni de profil) ; cases à cocher de taille fixe ; champ d'ajout de carte élargi.
- Studio : **ILS** ; priorité des balises (TACAN > VOR > DME > aérodrome > NDB > ILS, élément
  recouvert masqué) ; libellés des grandes zones prioritaires ; MORA décalée pour ne rien
  recouvrir ; taille de la rose des VOR ; **listes** d'aérodromes et de balises (blanche / noire) ;
  croix des petites zones cochée par défaut.
- Studio : erreurs de fond expliquées, secours OSM standard, rapport d'erreur à copier ; course
  entre deux rafraîchissements corrigée (« reading 'layers' »).
- **Mission partagée** générateur ⇄ studio (`SIA XML/mission_store.js`) : un seul document avec
  révision, enregistré à chaque modification et relu par l'autre page ; lecture Markdown / YAML
  commune. Studio : **emprise** de chaque carte modifiable (zoom, déplacement, vue affichée),
  **Appliquer** l'écrit dans la mission (`bbox`), valeurs d'origine gardées jusque-là ; cartes
  **ajoutées / supprimées** ; position de la carte conservée au rafraîchissement, ⌂ pour revenir
  à la position définie.
- Studio : blocs réordonnés (Mission, Sorties, Profils, Base SIA, Données complémentaires) ; liste
  des cartes et profils sous la carte de contrôle ; type de sortie et largeur PNG dans le menu ☰.
- Studio : lecture AIXM corrigée — **arcs** dans le bon sens (du sommet porteur au suivant) et
  **cercles** (185 espaces, dont CTR RENNES absente et CTR NANTES tronquée) ; familles CTA, TRA,
  RMZ, TMZ, PJE ; **territoire** de la mission (plus d'espaces ni d'aérodromes d'outre-mer sur une
  mission en métropole) ; filtres des aérodromes (CAP, restreints, État, hélistations, bandes ;
  contrôlés / non contrôlés) et des balises (VOR, TACAN, DME, NDB) ; libellés sans recouvrement
  (centre puis contour) ; taille des libellés des espaces et altitudes facultatives dans l'onglet
  Zones ; bande OACI uniforme, croix des petites zones facultative.
- Studio : plusieurs hippodromes à la fois (liste à cocher) ; carte de contrôle dans une
  **fenêtre séparée synchronisée** (⧉) ; colonnes redimensionnables jusqu'à 25 / 75 sans
  débordement du bloc de sélection des zones.
- Studio : « Autres éléments » regroupés par élément (case à cocher en titre, réglages grisés
  quand l'élément est décoché).
- Studio : **quadrillage** au pas adapté à l'emprise (1′ à 5°), libellés en degrés et minutes ;
  quadrillage et MORA aussi sur la carte de contrôle dynamique.
- Studio : **sélection des zones** refaite : liste de zones (puces supprimables, nombre de contours
  reconnus), champ d'ajout avec complétion (« R 45 A », « CTR BEZIERS 2 »), mode **liste blanche /
  liste noire**, liste des zones retenues à côté ; comparaison sans espaces, tirets ni accents
  (l'ancienne liste ne reconnaissait pas « LF-R 45 A »).
- Studio : coche globale « toutes » pour les zones R / D / P et les espaces contrôlés ; profil
  « Désactivé » par carte (carte ni générée, ni prévisualisée, ni sur l'assemblage).
- Générateur de mission : nom des exports `S1-M11_AIRLIFT_Pont_logistique_vers_Solenzara`
  (série-numéro, type, titre ou cible) ; résumé et description proposés depuis les données quand
  le fichier n'en contient pas (points, rendez-vous et participants, zone, consignes, axe de
  ravitaillement ENR 5.7 : route, longueur, largeur, sens des virages).
- **Dossier SIA XML mémorisé** (`FileAccess`, clef `__sia`) : « Relire le dossier » après une
  mise à jour AIRAC ; sélecteurs de fichiers des pages SIA ouverts dans ce dossier.
- Supprimés : générateur Python en ligne de commande (`generate_operational_map.py`, son README,
  son exemple de demande et sa carte de vérification), remplacé par le studio ; pdf.js (import
  MORA abandonné).
- Corrections : image vide « carte de contrôle » affichée à côté de la carte dynamique ; un fond
  lent (OpenTopoMap) n'empêche plus les surcharges (points tournants,
  zones) ; une carte en échec n'arrête plus la génération (ZIP des cartes réussies,
  `rapport_generation.txt`, bouton « Réessayer seule ») ni la galerie d'aperçus.

### Demandes de fusion

!48 Missions SIA (générateur, studio, symbologie OACI, MORA, hippodromes), mission partagée,
corrections de la suite.

## [2.1.0] — 2026-09-24

Application **CR DEFA** (Mission Report Core), bases DEFA, reportings unifiés, framework enrichi.

### CR DEFA — comptes rendus

- 14 familles de missions sur un noyau commun (HEMS, FIRE/GAAR, SAR, AIRLIFT, MARITIME, HADR,
  AIRBORNE, FI, SURVEY, LE, ISR, COMMAND, SOF, SPECIAL) ; pages dans `CR DEFA/`, page
  « Nouveau compte rendu » (choix de la famille).
- Registre **unique** `CR DEFA/missions.yaml` (toutes familles), anciens registres HEMS / GAAR
  importés ; lecture robuste (un registre illisible n'est jamais remplacé par une copie
  partielle).
- Saisie assistée : valeurs connues, appareils connus (flotte DEFA, référence DEFA, missions),
  filtrage croisé immatriculation / indicatif / type, indicatif intelligent (`ctm58` → COTAM 58,
  CTM58, OPR/ CTM), table de correspondance des indicatifs (forme plan de vol, autres formes),
  terrains (base mondiale), plan de vol SimBrief / IVAO / VATSIM.
- Analyse de textes collés : plan de vol OACI, pages du tracker IVAO (favori « → CR DEFA »),
  StatSim (VATSIM), historique VATSIM, METAR.
- Suivi réseau en direct (IVAO / VATSIM) : mise en route, décollage, atterrissage, fin de mission.
- Météo : METAR réel ou **METAR calculé** à l'heure du vol (Open-Meteo), lever / coucher du soleil,
  jour / nuit, **altitude densité** ; renseignement automatique dès que terrain, date et heure
  sont connus.
- Saisie : « + » dans le titre des collections, **tableaux compacts** (événements, étapes,
  équipage, points…), bouton **maintenant** sur chaque date / heure, heure locale ⇄ UTC (fuseau
  du terrain, heure d'été), événements créés depuis la chronologie, autorités (historique ou
  département), bloc Résultat en 2e position, lien vers la fiche appareil, routes proposées pour
  le même trajet uniquement.
- Contrôles de cohérence : heures invalides ou inversées, chronologie > 20 h, carburant, date
  future, durées déclarées.
- Barre d'en-tête à 7 entrées (famille · série, enregistrer, envoyer, importer, suivi réseau,
  mission, registre) ; aperçu du CR dans la colonne de droite ; version publique (données
  sensibles masquées) ; champs texte en majuscules.
- **Envoi du CR** à un webservice JSON (adresse et clef paramétrables, clef hors sauvegarde).

### Reportings

- Reporting général « Reporting missions — CR DEFA » et reportings de famille sur le registre
  unique : indicateurs, **graphiques** (activité par période, répartitions), synthèses par
  famille / appareil / équipage, contrôle des données.
- **Période et zoom** : composant commun (préréglages, dates, ◀ zoom − ▶, glisser / cliquer sur
  un graphique), période partagée entre les reportings ; repères « avant / après » sous les
  tableaux.
- **Modification dans le tableau** (date, n°, série, immatriculation, indicatif, résultat,
  terrains, temps de vol / bloc) avec trace ; durées sans heures « déclarées ».
- **Données** : « Mes missions (registre) » ou « Journal DEFA (vols réalisés) » — chargement /
  mise à jour par copier-coller de la page « Log des vols » ou page enregistrée, fusion sans
  doublon (historique cumulé).
- Clic : famille → reporting de la famille ; appareil → **fiche appareil** ; équipage → **fiche
  équipage**.

### Fiches appareil et équipage

- Fiche appareil : statut (disponible, maintenance…), « actuellement à », terrain de
  rattachement, mise en service, indicatifs utilisés, équipements, vie de l'appareil
  (maintenance, incidents…), performances du Flight Planner (courbes), activité **par période**
  (graphique avec zoom).
- Fiche équipage : qualifications, fonctions, heures par type, activité par période.
- **Fusionner / renommer** deux appareils ou deux pilotes (ex. GRR → RBR) : missions mises à jour,
  fiches fusionnées, équivalence appliquée au journal DEFA rechargé.

### Bases DEFA

- Flotte DEFA (205 appareils) importée depuis le site de la flotte.
- **Référence DEFA anonymisée** (`shared/defa_reference.js`, committée) : pilotes (trigrammes),
  appareils, indicatifs utilisés, terrains — sans les vols ; `tools/defa_reference.py`.
- **Journal DEFA** (non committé) : base du navigateur, analyse des séries d'indicatifs
  (≈ 50 séries 2025-2026 ajoutées à la table de correspondance).
- Page **Paramétrage › Bases de données** : flotte, types d'aéronefs, indicatifs, référence et
  journal DEFA, données du navigateur, registres, envoi des CR, dossiers paramétrés.

### Landing Performance Dashboard

- Période : composant commun (préréglages, dates, navigation, zoom par glisser), mémorisée par
  fichier ; types militaires et types locaux reconnus (catalogue commun).

### Flight Performance & Fuel Planner

- Tous les types employés par la DEFA proposés, même sans profil ; ouverture depuis une fiche
  appareil (`?aircraft=`) et liens vers les fiches des appareils du type ; identifiant SimBrief
  du profil pilote commun ; dossier performances mémorisé.

### Framework commun

- `time_period.js` (période et zoom), `charts.js` (graphiques SVG), `file_access.js` (dossiers
  paramétrés affichés, sélecteur de fichiers ouvert dans le dossier paramétré, fenêtres de
  copier-coller avec × / Fermer / Charger → Valider), `aircraft_catalog.js` (types et appareils
  communs aux trois applications), profil pilote, sauvegarde locale avec **rappel de sauvegarde**
  (bouton après 10 modifications), blocs masqués par défaut, lien de version vers ce changelog.

### Documentation

- README (EN / FR) : trois applications et un framework ; INSTALL ; tutoriel ; manuel
  d'exploitation ; `docs/FRAMEWORK.md`, `docs/FLIGHT_PLANNER.md` (reprise de la section d'origine),
  `docs/LANDING_DASHBOARD.md` ; notes de conception (`docs/mission_report_core_audit.md`).

### Demandes de fusion

!35 StatSim · !36 indicatif, METAR calculé, envoi du CR · !37 reporting général et graphiques ·
!38 barre d'en-tête · !39 contrôles de cohérence · !40 période et zoom unifiés, documentation ·
!41 base DEFA · !42 saisie, dossiers, rappel de sauvegarde · !43 référence DEFA, catalogue
commun, journal alternatif · !44 fiches appareil / équipage · !45 modification en grille,
fusions, journal DEFA depuis les reportings, tableaux compacts · !46 fenêtres de copier-coller ·
!47 période sur les fiches, version 2.1.0 et changelog.

## [2.0.7] — 2026-09-21

Première version publiée de la suite réunie dans un seul dépôt.

- CR et reporting GAAR (sécurité civile) ; Flight Performance & Fuel Planner (profils,
  devis carburant, courbe de montée optimale, calibration SimBrief, Little Navmap).
- Landing Performance Dashboard (analyse multi-CSV, tendances, filtres).
- Bandeau et menu communs, arborescence `repository_tree`, thèmes, icônes d'aéronefs,
  traduction FR / EN / DE / ES.
