# Notes de version — X-Plane Web Suite (DEFA Virtual)

Une section par version publiée, la plus récente en tête, écrite à chaque release (avec la section du
[CHANGELOG](CHANGELOG.md), qui détaille tout) : **synthèse** (ce qui change pour l'utilisateur), **actions à
effectuer** (ce que chacun doit faire après la mise à jour), **notes** (limites connues, points d'attention, à venir).
Entre deux versions, le pied de page affiche le commit en cours (`v4.6.0+abc1234`).

## 5.3.0 — 19 October 2026

### Summary

- **Mission report, one "Prefill ▾" menu and three steps.** "New report from…" (a mission order, one of my flights, a
  file) and "Complete this report from…" (my last IVAO or VATSIM flight, a filed SimBrief / IVAO / VATSIM flight
  plan, a pasted flight plan, tracker page or METAR, the "→ Report" bookmarklet). Every source ends with the same
  summary — what was filled, what was kept, what the source lacked — with "Undo" and "Replace the fields already
  entered". The form reads as Flight, Mission, Result, plus a folded "Flight details" step; prefilled blocks show a
  one-line summary ("Edit" opens the fields), and a badge on each block says where its values come from.
- **My last IVAO flight.** The launcher reads the pilot's sessions with the airline's IVAO key: flight plan with the
  registration, full track, start-up to on-blocks, sessions cut by a disconnection grouped into one flight, link to
  the tracker. VATSIM gives connection times only.
- **Record the flight on the airline website** from the report: the fields travel in the page address, the "→ Flight"
  bookmarklet fills the site's form and never validates it.
- **"My flights"**: the pilot's past flights (reports and the airline log), filters, totals, CSV export, "Write the
  report" for a flight without one.
- **Availability editor**: continuous time axis per day, rectangles drawn to the half hour and adjusted to five
  minutes, unavailability as a background, cuts, drag across days, undo, "Previous week" kept. Weeks are written in
  the new format at their first save; older weeks are still read. The module ships on its own
  (`dispos-module-<version>.zip`) with a regeneration prompt and an integration guide.
- **Performance sheets** have their own page (Tools): sheet management, import by file or paste with duplicate
  detection, ChatGPT answers read whatever their shape, "Fill in the missing fields" for several sheets at once.
  **Fuel** keeps the plan only, with the "Flight level decision" chart.
- **One aircraft picker** (dropdown with search) in Fuel and Performance sheets, the other pages to follow.
- **Keys and external services**: one card per service in Settings › Installation (save, test, remove); personal IDs
  (IVAO VID, VATSIM CID, SimBrief) in My profile only.
- **Landing**: linked points across the five charts, pinned tooltip, one reading block.

### Actions to take

1. **Restart the launcher**, then reload each page (Ctrl+F5): new routes (last IVAO / VATSIM flight, keys) and the
   availability format.
2. **Airline IVAO key**: check it in Settings › Installation › Keys and external services ("Test" says whether IVAO
   accepts it). Pilots: set the IVAO VID / VATSIM CID in My profile › Identity and networks (needed by "My last
   flight").
3. **Mission report**: block layouts memorised in the browser are reset by the new steps; "Detailed report" is now
   the "Flight details" step.
4. **Availability**: nothing to do; a week is rewritten in the new format when it is saved. Two overlapping
   availability categories in an old week read as "the last one wins" (one minute, one state).

### Notes

- Navigraph Charts and ChartFox deep links are not in this version (the "Open in" menu follows).
- The screenshots of the manuals still show the former availability grid and report layout: a screenshot campaign
  is logged in the technical debt.
- The English, German and Spanish manuals follow the French ones; `tools/doc_traductions.py` lists what remains to
  re-translate.

### Delivery

- Delivery archive: `xplane-web-suite-5.3.0.zip` — SHA-256 `3f95d59310f962153496b8bcc0d6ea3282981cb43be1698a02cfb61d5934af8d` (code only, outside the repository: `dist/` folder).
- Module package: `dispos-module-5.3.0.zip` — SHA-256 `6e84695139fc0cab8940e542f8c27c3b5ca0e7a1141fd188f0dd3515fc7c80c7` (outside the repository: `dist/` folder).

## 5.2.0 — 12 October 2026

### Summary

- **One door to create a mission: the generator.** "New mission", "Create the skeleton here" (without ChatGPT) and
  "Order from ChatGPT…" are in its Mission block. The registry consults, files, duplicates, deletes and imports the
  reply of an ordered mission; its "New mission" button opens the generator on a new mission.
- **"Step by step"**: a new mission opens as six steps — Frame, Places, Story, Objectives and risks, Timeline, Maps and
  documents — with values proposed in the fields ("proposed ✓") and warnings under them, each with its one-click fix.
  "Show everything" brings back the full page. Places can be pasted as a table (spreadsheet, Markdown, text).
- **Six paths by hand**, from a standalone flight to a coordinated exercise: "Add a crew…", "Remove this crew…",
  "Create the exercise organisation…", "Open the organisation", on the Operation line of the Mission block. Any crew
  mission can carry a timeline of events at H+n.
- **What is saved, at a glance**: a status line in the generator and the studio ("Saved to the folder", "Unsaved
  changes since 14:32 (n fields)"…) and "Undo changes".
- **Tidy hand-written missions**: risks pasted as columns become hazard, level, consequence and mitigation; a numbered
  main objective is split; a theatre that does not match the departure airfield is flagged; places are searched among
  airfields, beacons, points and towns; callsigns are proposed from the fleet.
- **Map studio**: "Points to place" for a mission without coordinates; "⧉ Window" shows the same interactive map
  (pan, zoom, draggable points) without the rest of the studio; the "SIA database" block is gone (managed in
  Settings › Maintenance).
- **My profile › Aircraft**: declare aircraft outside the fleet, shared with the Centre and the other pilots; their type
  record is completed by the launcher (ICAO, EUROCONTROL, then Aviation Fanatic for retired types).
- **Help**: tutorials first, then the pilot, planner and administrator manuals; the "Help" link of a Centre page
  opens the planner manual. No native browser dialog is left: every confirmation is asked in the page.

### Actions to take

1. **Restart the launcher**, then **reload each page** (Ctrl+F5): the launcher now queues aircraft-type completions
   and runs short passes for types added in My profile.
2. **Hand-written missions** (risks pasted as columns, numbered objectives): open each in the generator — the status
   line says what was tidied — then "Save to the folder".
3. **Missions with a theatre left at the skeleton's default**: open them; if a line flags the theatre, click "Set …".

### Notes

- The English, German and Spanish manuals lag behind the French ones on the latest screenshots: a translation pass is
  due (`tools/doc_traductions.py` lists what to re-translate).
- The town list (GeoNames) does not hold every locality (e.g. "Guipry" but not "Guipry-Messac").
- The old guides `SIA_MISSIONS.md` and `PRESENTATION_en.md` still mention the studio's "SIA database" block; they are
  to be folded into the manuals and removed.

## 5.1.0 — 9 octobre 2026

### Synthèse

- **Profils de performances** (Carburant) : un bloc fait l'état de chaque type de la flotte et de chaque profil
  enregistré (source, cartographie moteur, données manquantes ou estimées). Une case par ligne sert la barre du bloc :
  **Fusionner (n)**, **Exporter (n)** et **Enregistrer dans le dossier (n)** (un fichier par profil), **Supprimer (n)**.
  « Choisir » ou « Créer » restent seuls sur chaque ligne, au même endroit.
- **Fusion** : le plus récent gagne champ par champ, les vides sont comblés, la cartographie est réunie. Un **aperçu**
  montre chaque donnée qui change (valeur actuelle, valeur retenue, source) avec une case pour la reprendre ou garder
  l'actuelle ; « Tout reprendre » / « Ne rien reprendre » ; « Annuler » pendant 10 s.
- **Nouvelles sources de performances** : la fiche **SimBrief** du type (créer un profil, le mettre à jour, le fusionner),
  le modèle de **Poll et Schumann** pour les avions de ligne, **Airframe DB** pour les militaires et les hélicoptères.
- **« Demander à ChatGPT »** : la page prépare un prompt pour le type (avec ce que la suite sait déjà), le copie et ouvre
  ChatGPT ; la réponse collée (JSON ou CSV) s'importe comme nouveau profil ou se fusionne. Valeurs estimées signalées
  dans le bloc jusqu'à ce que vous les corrigiez.
- **Supprimer un profil** le retire aussi du dossier performances (base exportée réécrite, fichier d'un seul profil
  renommé `.bak`) ; « Relire » et « Dossier… » reprennent tout ce que le dossier contient.
- **Carburant** : consignes de montée, montée choisie (badin, vario, régime), état du calcul toujours lisible.
- **Ergonomie** (lots A à G) : contrastes des designs à matières, Premier lancement (rail des étapes, types
  d'aéronefs), Sources et dossiers, Maintenance, Aéro, Cartes de vol en ton foncé, en-têtes des reportings.
- **Données aéronautiques** : rien n'est refait ni retéléchargé si tout est à jour ; « Purger la zone… » ; zone
  **Atlantique Nord** avec les tracks NAT du jour ; profils de cartes revus (IFR simplifié, AIRWAYS, points RNAV).
- Corrigés : A400M sans performances, premier lancement qui renvoyait en boucle, textures absentes après un clone sans
  Git LFS, données servies depuis un autre disque, profils cachés à la relecture du dossier performances.

### Actions à effectuer

1. **Relancer le lanceur**, puis **recharger chaque page** (Ctrl+F5) : il pose désormais lui-même les versions des
   fichiers servis, et lance les nouvelles passes SimBrief et Airframe DB à la mise à jour des types.
2. **Carburant** : si des profils manquent alors qu'ils sont dans le dossier performances, cliquer **« Relire »** (ou
   « Restaurer » sur la ligne « profils retirés encore dans le dossier »).
3. **Atlantique Nord** (facultatif) : Paramètres › Maintenance › Données aéronautiques, carte des zones : cliquer la
   zone océanique puis « Activer », pour avoir les points et routes océaniques et les tracks NAT du jour dans les cartes.
4. **Cartes** : les profils de base de cartes sont remplacés une fois (vos profils personnels restent) ; revoir le
   profil par défaut de vos cartes si vous l'aviez réglé.

### Notes

- Les valeurs proposées par ChatGPT sont des estimations : relisez l'aperçu avant de fusionner, et corrigez à la main
  ce qui est douteux (la marque « estimé » tombe alors).
- Un profil d'un CSV à plusieurs profils n'est pas retiré du fichier : il reste signalé (« Restaurer »).
- Gel des fonctionnalités maintenu : la suite se concentre sur l'ergonomie, les corrections et la documentation.

## 5.0.0 — 8 octobre 2026

### Synthèse

- **Niveau d'utilisation** (Mon profil) remplace « avec ou sans Centre » : 1 équipage (recevoir ses missions, écrire
  ses CR, voir le planning), 2 planification (planifier les ordres), 3 conception (générer et modifier les missions),
  4 expert (tous les outils, cartes avancées, studio cartographique). Barre latérale, onglets, menu ☰, accueil et
  pages ne montrent que ce qui sert au niveau choisi, sept entrées au plus par groupe. Les outils facultatifs (cartes
  de vol, carburant, atterrissages, analyse) se cochent à part. Le niveau range l'interface, il ne donne aucun droit.
- **Page « Aujourd'hui »**, première entrée à tout niveau : ma prochaine mission, les comptes rendus à écrire, ma
  semaine — une action par bloc.
- **Planning refait** : une seule page, six blocs (Ordre du jour en tête, Équipage de la semaine, Zones, Statistiques ;
  Créneaux communs et Missions probables au niveau Expert) ; **Annuler** (dix pas, Ctrl+Z), **Retirer la demande**
  d'une zone, « DLO et butées » repliables, « Masquer les pilotes indisponibles ». Consultable par tous en lecture
  seule ; seul `admin_centre` modifie.
- **Pages simplifiées** aux niveaux 1 à 3 : Cartes de vol (un seul « Générer les cartes et le ZIP »), Carburant, Mes
  missions, CR court (« CR détaillé » à la demande), Réglages, Générateur et Registre. Missions s'ouvre sur le
  registre, avec « Générer une mission ». Toutes les pages occupent la même largeur.
- **Plus sûr et plus rapide** : habilitation du planning corrigée (un compte sans `admin_centre` n'écrit plus) ; textes
  du Centre traduits à la source ; état de la synchronisation servi tout de suite ; Planning sans rafale de requêtes ;
  Cartes de vol et Studio plus légers (listes de complétion construites au focus, villes de la base SIA rangées à
  part, résumé des zones mémorisé) ; Paramètres › Maintenance (tableaux des bases par 100 lignes),
  sauvegarde automatique, activations de zones et décor des designs allégés.
- **La suite guide** : bouton **Arrêter** sur les tâches longues, messages d'erreur reformulés en clair, pastille
  « Synchroniser » discrète aux niveaux 1-2.
- Corrigés : plaquette de convoyage gardée à la modification d'une mission ; déplacement des blocs (bloc visé illuminé,
  dépôt avant/après, « Réinitialiser l'ordre des blocs ») ; dossier des profils de performance d'une autre copie.

### Actions à effectuer

1. **Relancer le lanceur**, puis **recharger chaque page** (Ctrl+F5).
2. **Choisir son niveau d'utilisation** : Mon profil › « Niveau d'utilisation ». Par défaut : Expert si le Centre est
   activé, Équipage sinon. Cocher les outils facultatifs voulus.
3. Base SIA : rien à faire, elle est convertie d'elle-même à la première ouverture (villes rangées à part).
4. **Saisir son trigramme** s'il ne l'est pas : la page « Aujourd'hui » le demande sur place.
5. Planning : la disposition des blocs mémorisée pour l'ancienne page est oubliée une fois (Ordre du jour remis en
   tête) ; ☰ › « Réinitialiser l'ordre des blocs » sur toute autre page au besoin.

### Notes

- Bugs ouverts : « villes_geonames.csv not found » au premier lancement (non reproduit ; la raison est désormais
  affichée) ; lenteur d'environ 4 s à l'ouverture sur certains profils de navigateur (non reproduite ;
  `tools/perf_audit.html` pour la mesurer) ; en allemand, Paramètres › Maintenance traduit « Base » par « Datenbank »
  y compris là où il s'agit du terrain de base d'un appareil.
- Clés de poste et signatures prêtes (`shared/sog_keys.js`) mais pas encore branchées sur les pages ; le mode groupe
  attend le durcissement CSP.
- Atterrissages et Analyse des missions ne sont pas encore simplifiés par niveau.

## 4.11.0 — 8 octobre 2026

### Synthèse

- **Tutoriel d'installation** illustré, en français et en anglais (`docs/tutorial/`, aussi dans l'aide et en pages
  HTML) : l'installation pas à pas avec captures, deux schémas — ce que la suite échange avec chaque service extérieur,
  et où vivent vos identifiants (les mots de passe ne partent nulle part ; une clé ne part que vers son service) — et
  les prérequis, en distinguant l'utilisateur et l'administrateur du SOG. Dans l'aide, le menu de langue fait basculer
  le tutoriel.
- **Centre en mode autonome** : son mot de passe est lu dans les données, `data/config/centre.json` (« DEFA » par
  défaut), affiché à côté du verrou et modifiable dans Paramètres › Centre ; il part aux autres postes avec
  « Synchroniser ». Le mode groupe (comptes signés par git, accès au Centre par le rôle) est conçu
  (`docs/technique/COMPTES_SIGNES.md`) et viendra dans une prochaine version.
- **Mot de passe du site du SOG hors service (INOP)** tant que le SOG n'a pas de webservice : il n'est plus demandé ni
  gardé.
- **Premier lancement plus sûr** : les dossiers des données (SIA, missions, registre) se règlent dès que les données
  arrivent ; quand le navigateur a retiré l'accès au dossier, « Autoriser à nouveau » le redonne, au lieu d'annoncer à
  tort une « autre copie ».
- **Contrôle des mises à jour juste** : il compare le code réellement servi au canal, et ne dit plus « mise à jour
  disponible » quand la version locale est en avance.

### Actions à effectuer

1. **Relancer le lanceur**, puis **recharger chaque page** (Ctrl+F5).
2. **Mot de passe du Centre** : il vient désormais de `data/config/centre.json` (« DEFA » si le fichier est absent).
   Pour un autre mot de passe : Paramètres › Centre › « Mode et accès », puis « Synchroniser ».
3. Si un dossier est signalé « accès à redonner » : Paramètres › Premier lancement, étape 1, « Autoriser à nouveau »
   (choisir « Autoriser à chaque visite » si le navigateur le propose).
4. Le mot de passe du site du SOG enregistré auparavant est retiré au prochain enregistrement du profil : rien à faire.

### Notes

- Comptes et données signés : conception publiée (`docs/technique/COMPTES_SIGNES.md`) ; le mode groupe ne sera
  activable qu'après le durcissement CSP. La clé de signature des postes est prête mais pas encore dans cette version.
- Les zones de la carte sont toujours des contours de pays (Natural Earth), sans valeur aéronautique.

## 4.10.0 — 7 octobre 2026

### Synthèse

- **SO Group Virtual.** La compagnie change de nom dans toute la suite (quatre langues, documents, PDF) : « SO Group
  Virtual », nom long « Virtual Special Operation Group », sigle « SOG ». Le site de la compagnie se règle dans
  Paramètres › Installation › Sources et dossiers.
- **Tableau** (☰ › Centre, barre latérale « Tableau ») : l'ordre de vol de la semaine sur une frise du jour, plaquettes
  de vol glissées, membres affectés par glisser-déposer, conflits signalés, briefing plein écran. Déplacer une plaquette
  réémet l'ordre de mission à la nouvelle heure.
- **Premier lancement repensé** : bilan « Où en est la suite » en tête ; le dossier de l'application d'abord — tout le
  reste est grisé tant qu'il n'est pas choisi et cohérent avec la suite lancée (un dossier d'une autre copie est
  signalé) ; puis données (jeu d'essai fictif ou dépôt de la compagnie), compagnie et clé IVAO, profil, données
  aéronautiques, Centre. Onglet dans Paramètres ; bandeau sur l'accueil tant qu'il reste à faire.
- **Données aéronautiques par pays** : cliquer les pays sur la carte, puis « Activer » — la suite télécharge leurs
  sources, reconstruit la base et calcule la MORA ; sous la carte ne reste que ce qu'elle ne peut pas faire seule
  (commande du SIA, PDF de la MILAIP, dossier X-Plane…). Nouveaux pays lus : Royaume-Uni (AIP militaire : zones de vol à
  basse altitude, axes de ravitaillement) et Canada (NAV CANADA). Axes de ravitaillement français importés du PDF de la
  MILAIP.
- **MORA** : outre-mer compris, grandes zones par la MORA d'X-Plane ou par blocs ; sommets parasites du relief écartés
  (La Réunion sortait à 20 100 ft au lieu de 12 400) ; tableau des changements replié.
- **Sessions ATC et activations de zones** : trainings, examens et réservations IVAO importés (clé d'API IVAO,
  facultative) ; activations VATSIM et IVAO côte à côte ; pays préféré.
- **Flotte et terrain des appareils** lus chaque jour sur le site de la compagnie ; les convoyages partent du terrain
  réel de l'appareil.
- **Apparence** : design « Tactique », barre latérale réglable (taille des icônes, libellés).
- **Sauvegarde des données** : le bouton « Synchroniser » vire à l'orange ou au rouge quand des modifications n'ont pas
  été envoyées.
- **Sécurité** : la suite ne répond plus aux autres sites, ne sert plus rien de privé, n'exécute que des fichiers de
  données au format attendu ; changer de dépôt de données se confirme dans une fenêtre du système.

### Actions à effectuer

1. **Relancer le lanceur** (nouvel en-tête `X-SOG-Setup`, nouvelles routes, règles de sécurité), puis **recharger chaque
   page** (Ctrl+F5).
2. **Ouvrir la suite par le lanceur ou un favori** : un lien depuis un autre site (webmail, forum) est désormais refusé.
3. **Ouvrir Paramètres › Premier lancement** : le bilan montre ce qui reste à régler ; rechoisir le dossier de
   l'application s'il est signalé comme celui d'une autre copie.
4. **Recalculer la MORA** : Paramètres › Maintenance › Données aéronautiques, pays France, « Activer » (ou « Tout
   récupérer et recalculer »). Les grilles déjà calculées peuvent porter des sommets faux ou n'avoir que la métropole.
5. **Clé d'API IVAO** (facultatif, pour importer les sessions ATC) : étape « Compagnie » du premier lancement.
6. Un fichier `.js` de `data/` qui ne suit pas le format des données de la suite est refusé : les fichiers écrits par la
   suite passent tous ; un fichier ajouté à la main n'est plus servi.

### Notes

- framagit est indisponible : le code est sur gitnet. Le contrôle des mises à jour (API de framagit) et le lien du
  CHANGELOG en pied de page ne répondent pas tant que la configuration de publication pointe vers framagit.
- Les zones de la carte sont des contours de pays (Natural Earth), sans valeur aéronautique (dette technique).
- L'ancien en-tête `X-DEFA-Setup` est encore accepté pour cette version.
- Les fichiers de données en `.js` seront remplacés par du JSON (rapport d'audit de sécurité du 7 octobre).

## 4.9.0 — 6 octobre 2026

### Synthèse

- **Des cartes hors de France.** Paramètres › Maintenance › **Données aéronautiques** (ex-« Mise à jour SIA ») réunit
  les sources, chacune activable : SIA et DIRCAM comme avant, et désormais l'AIXM 5.1 d'autres pays (Espagne, Royaume-Uni,
  États-Unis…), des fichiers GeoJSON (zones et routes militaires de la FAA), les exports d'openAIP par pays et les données
  de navigation d'X-Plane (balises, points, voies, MORA mondiale, espaces). Boutons de téléchargement pour les sources
  libres. En France, le SIA reste seul.
- **Zones à activer hors de France** : TSA, MOA, routes MTR, zones d'alerte et d'avertissement, dessinées et comptées.
- **Licences claires** : code sous MPL 2.0, contenu sous CC BY-SA 4.0 ; `LICENSE.md` cite chaque composant, chaque
  source de données et chaque service, avec la mention exigée.
- **Données de tiers non publiées** : la base des types d'aéronefs (OACI, EUROCONTROL) n'est plus livrée avec la suite ;
  chacun la complète sur son poste, type par type.
- **Livraison** : archive de chaque version (`tools/publish_dist.py`).

### Actions à effectuer

1. **Relancer le lanceur** (nouvelles routes : téléchargements aéronautiques, types d'aéronefs), puis **recharger chaque
   page** (Ctrl+F5).
2. **Avant de tirer la mise à jour**, mettre de côté `AircraftDB/aircraft_db.js` et `AircraftDB/aircraft_perf.js` (la
   mise à jour les retire du dépôt) et les remettre ensuite : ils ne sont plus suivis par git et restent sur le poste.
   Sinon, les compléter : Paramètres › Maintenance › Références et dépendances, « Types d'aéronefs et performances »
   (« Flotte », « Types inconnus », ou un code).
3. **Données d'autres pays** (facultatif) : Paramètres › Maintenance › Données aéronautiques — cocher les sources,
   télécharger, puis « Relire le dossier ». X-Plane : choisir le dossier d'installation du simulateur.

### Notes

- openAIP (CC BY-NC) et l'API gratuite d'Open-Meteo sont réservés à un usage non commercial.
- La grille MORA et les axes ENR 5.7 sont calculés sur le poste et ne sont jamais redistribués (`LICENSE.md`).
- À venir : renommage de la compagnie (SO Group Virtual) ; zones de vol à basse altitude britanniques (PDF de la Mil AIP).

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
