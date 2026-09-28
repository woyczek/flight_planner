# Prompt — générateur de série de missions (Helo XP)

Prompt à donner à un assistant externe (ChatGPT…) pour produire une série de missions directement
lisible par la suite : générateur de mission, studio cartographique, profil vertical, CR DEFA et
statistiques. Il décrit **exactement** ce que lisent `apps/sia/mission_store.js` (YAML + Markdown),
`apps/sia/map_parser.html` (cartes, zones, profil vertical) et `shared/mission_core/core.js`
(passerelle mission → CR : famille, appareils, terrains). À mettre à jour avec eux.

Copier tout le bloc ci-dessous, régler les paramètres en tête — ou utiliser « Créer une mission avec ChatGPT » du
générateur de mission (bloc 1), qui les règle et copie le prompt. Après modification de ce document : lancer
`python tools/build_mission_prompt.py` (ou `tools/bump_versions.py`), qui régénère `apps/sia/mission_prompt.js`.

---

```text
GÉNÉRATEUR DE SÉRIE DE MISSIONS — HELO XP

PARAMÈTRES DE CETTE EXÉCUTION
  TYPE            = aléatoire        (ou un code de famille du § 2, ex. AAR)
  PROCHAINS_NUMEROS = auto           (par famille : identifiant de la première opération et numéro de la série,
                                     ex. « HEMS M-016 série 4 · SAR S-003 série 3 · … » ; réglé par le générateur ou
                                     le registre ; auto : M-001 / série 1 pour une famille sans mission)
  NOMBRE_MISSIONS = 5                (1 à 9 : nombre d'opérations)
  THÉÂTRE         = aléatoire       (métropole, Corse, Antilles, Guyane, Réunion, Mayotte,
                                     Nouvelle-Calédonie, Polynésie… ; plusieurs possibles, liés
                                     par « + », ex. « Guyane + métropole » — voir § 5)
  ÉQUIPES_DEFA    = 2                (1 à 5 : équipes DEFA en vol par opération ; UNE mission
                                     complète par équipe — voir § 3)
  SOUS_TYPE       = libre            (ou un code de sous-type du § 2 pour la famille TYPE)
  RENDEZ_VOUS     = libre            (avec : au moins un rendez-vous par mission ; sans : aucun)
  TYPES_EQUIPES   = libre            (aéronef de chaque équipe en vol, dans l'ordre A, B, C…, ex. « A : A400M — COTAM71 + B : automatique + C : A400M — COTAM72 » ; « automatique » = au choix du générateur ; un même type peut revenir avec des indicatifs différents)
  ÉQUIPES_SOL     = libre            (0 à 3 : équipes au sol en plus des équipes en vol)
  RAVITAILLEMENT  = libre            (oui : ravitaillement en vol planifié ; non : aucun)

Tu produis une série cohérente de NOMBRE_MISSIONS missions de simulation aérienne de la famille TYPE.
Si TYPE = aléatoire, choisis UNE famille du § 2 et garde-la pour toute la série.
Si THÉÂTRE = aléatoire, choisis le ou les théâtres de chaque mission (§ 5) ; varier les théâtres dans la série est
bienvenu quand la famille s'y prête (unités réellement présentes). Plusieurs théâtres (« A + B ») : la mission
les relie réellement (§ 5).
Paramètres « libre » : ton choix. Sinon ils s'imposent à chaque mission : SOUS_TYPE = mission.subtype ;
RENDEZ_VOUS = avec → au moins un point dans rendezvous (et une carte detail_rdv par rendez-vous), sans → rendezvous: [] ;
TYPES_EQUIPES = CONTRAINTE STRICTE : l'équipe A emploie le premier aéronef, B le deuxième, etc. Un aéronef marqué
(IMPOSÉ) est repris À L'IDENTIQUE : aircraft[0].type commence par son désignateur OACI (même s'il n'est pas dans la
liste du § 6), aircraft[0].callsign = l'indicatif donné (sans le modifier), même type dans teams[].type. Il prime sur
le § 5 (unités, bases, théâtres) et sur le § 6 : si l'appareil semble peu adapté, ADAPTER LA MISSION (départ = sa base
réelle, distances, tâche) et jamais l'appareil ; ne jamais le remplacer par un appareil « plus adapté » ;
« automatique » : choisir un appareil adapté à la mission ; ÉQUIPES_SOL = nombre exact d'équipes au sol dans teams (en plus des équipes en vol) ;
RAVITAILLEMENT = oui → air_refueling.planned: true avec son axe (§ 7), non → pas de bloc air_refueling planifié.

Les fichiers alimentent automatiquement un briefing, des cartes OpenStreetMap, un PDF de mission, une
coupe verticale, un compte rendu de mission (CR) et des statistiques. Le YAML est la SOURCE DE VÉRITÉ ;
le Markdown en est un produit dérivé qui reprend les MÊMES valeurs. Un programme lit ces fichiers : le
format ci-dessous est un contrat, pas une suggestion.

────────────────────────────────────────────────────────────────────────────
1. PRINCIPES
────────────────────────────────────────────────────────────────────────────
- Exercices de simulation aérienne. Ne jamais employer le mot « joueur ». Employer selon le contexte :
  équipage, appareil, aéronef, équipier, patrouille, leader, élément, formation, équipe au sol,
  détachement.
- Missions réalistes, opérationnellement cohérentes, directement utilisables, intéressantes en
  simulateur, toutes différentes : pas cinq variantes superficielles de la même mission. Varier
  sous-types, terrains, relief / mer / ville, durée, météo évoquée, contraintes, nombre d'acteurs.
- Lieux réels uniquement, coordonnées plausibles ET vérifiables (§ 5). En cas de doute sur un lieu,
  choisis-en un autre plus connu plutôt que d'inventer.
- Ton : le titre et la description (summary, detailed_description) comportent chacun un trait d'humour
  ou une situation décalée — le randonneur qui « arrive dans 5 min » depuis trois heures, le colis urgent
  qui s'avère être le gâteau d'anniversaire du colonel, le cargo qui refuse obstinément de répondre à la
  VHF… L'humour vient de la situation ou des personnages, jamais au détriment de la victime, de la
  sécurité ou du réalisme opérationnel : la mission reste crédible et exécutable. Un trait par texte
  suffit ; varier les ressorts d'une mission à l'autre.
- Langue : français. Pas de texte hors des fichiers demandés (§ 3), sauf le bloc VALIDATION final.

────────────────────────────────────────────────────────────────────────────
2. FAMILLES ET SOUS-TYPES (codes EXACTS)
────────────────────────────────────────────────────────────────────────────
mission.type = un code de famille ci-dessous, tel quel (il choisit la page de CR).
mission.subtype = un code de sous-type de la famille, tel quel. Les cinq missions couvrent au moins
trois sous-types différents quand la famille en a trois ou plus.

HEMS      (HEMS / MEDEVAC)             Primary HEMS · Interhospital transfer (MEDEVAC) · Rescue ·
                                       Search / evacuation · Specialized transport · Training
FIRE      (feux de forêt / GAAR)       GAAR · GAAR with diversion · Response · Training
SAR       (recherche et sauvetage)     SAR-LAND · SAR-MARITIME · SAR-AIRCRAFT · PR · CSAR
AIRLIFT   (transport aérien)           STRATEGIC · TACTICAL · REMOTE · OFFSHORE · POLAR · HUMANITARIAN ·
                                       PERSONNEL · CARGO · COMBI
AAR       (ravitaillement en vol)      TRAINING · OPERATIONAL · QRA · DRAG · EXERCISE · TRIALS
MARITIME  (surveillance maritime)      MARPAT · FISHERY · CUSTOMS · POLLUTION · SHIPPING · ICE · SHIP_ID ·
                                       ANTI_POLLUTION · OFFSHORE
HADR      (aide humanitaire)           DISASTER_RELIEF · FLOOD · EARTHQUAKE · CYCLONE · STORM · VOLCANO ·
                                       HUMANITARIAN · NEO · CIVIL_EVACUATION · ISOLATED_COMMUNITY · SUPPLY_DROP
AIRBORNE  (largage / aéroporté)        PERSONNEL_PARADROP · CARGO_AIRDROP · RESUPPLY · HUMANITARIAN_AIRDROP ·
                                       SAR_KIT_DROP · TRAINING_DROP
FI        (contrôle en vol)            ILS · LOC · GLIDE_PATH · VOR · DME · NDB · TACAN · RADAR · PAPI_VASI ·
                                       RNAV_GNSS · PROCEDURE_VALIDATION · AIRPORT_LIGHTING
SURVEY    (levés / scientifique)       AERIAL_PHOTO · MAPPING · LIDAR · PHOTOGRAMMETRY · GEOPHYSICS ·
                                       ATMOSPHERIC · WEATHER_RECON · VOLCANO · WILDLIFE · ENVIRONMENT · ICE ·
                                       OCEANOGRAPHIC
LE        (police / douane)            POLICE_OBSERVATION · GENDARMERIE · BORDER · CUSTOMS · TRAFFIC · PURSUIT ·
                                       MISSING_PERSON · TACTICAL_SUPPORT · EVENT_SECURITY
ISR       (renseignement)              ISR · RECON · EO_IR · IMINT · SIGINT · ELINT · COMINT · BORDER_ISR ·
                                       MARITIME_ISR · INFRASTRUCTURE_ISR
COMMAND   (commandement / guet / relais) AIR_POLICING · AIRBORNE_COMMAND · AEW · AIR_COORDINATION ·
                                       COMM_RELAY · DISASTER_RELAY · FIRE_COORDINATION · SAR_COORDINATION
SOF       (opérations spéciales)       INSERTION · EXTRACTION · INFILTRATION · EXFILTRATION ·
                                       TACTICAL_TRANSPORT · SR_SUPPORT · FAST_ROPE · RAPPEL ·
                                       PARACHUTE_INSERTION · LZ_INSERTION · SHIP_INSERTION
SPECIAL   (VIP, essais, formation, convoyage) sous-type libre et court (ex. VIP, TEST_FLIGHT, FERRY, TRAINING)

────────────────────────────────────────────────────────────────────────────
3. LIVRABLES ET NUMÉROTATION
────────────────────────────────────────────────────────────────────────────
OPÉRATION ET MISSIONS. Chaque opération n (1 à NOMBRE_MISSIONS) engage ÉQUIPES_DEFA équipes DEFA en vol ; chaque
équipe reçoit SA mission complète — son brief, son PDF, son compte rendu : propre aéronef, propre terrain de
départ, propres points tournants, propres cartes de situation. Les missions d'une opération se coordonnent
(rendez-vous communs, relèves, créneaux, commandement) et partagent le récit d'ensemble. Exemples : FIRE — un
Milan (DH8D, largage depuis Nîmes-Garons), un Dragon (EC45, reconnaissance et secours depuis sa base) et un avion
de commandement (BE20 ou TBM9, coordination au-dessus du feu) = trois missions ; AIRLIFT — un A400M parti de
métropole et un hélicoptère au-dessus de la Corse avec un rendez-vous commun = deux missions ; AAR — ravitailleur
et receveurs = une mission par équipe, points tournants différents, même axe et même rendez-vous.

Numérotation : NN = lettre de la famille + tiret + numéro de l'opération sur 3 chiffres, compté PAR FAMILLE. Lettres :
HEMS / MEDEVAC M · HADR H · FIRE F · SAR S · AIRLIFT T · AAR R · AIRBORNE P · MARITIME N · ISR I · LE L · COMMAND C ·
SOF O · FI V · SURVEY G · SPECIAL X. Première opération = identifiant donné pour la famille dans PROCHAINS_NUMEROS
(ex. « HEMS M-016 série 4 » → opérations M-016, M-017… ; mission.series = 4). Une seule équipe : mission NN (« M-016 »).
Plusieurs équipes : missions NN + lettre de l'équipe, une par équipe dans l'ordre (« M-016A », « M-016B », « M-016C »).
Deux fichiers par mission, chacun dans son propre bloc de code, précédé d'une ligne « Fichier : … » :
  missionNNX.yaml   (bloc ```yaml)
  summaryNNX.md     (bloc ```markdown)
Ordre : missionM-016A.yaml, summaryM-016A.md, missionM-016B.yaml, summaryM-016B.md, … puis l'opération suivante.
Aucun autre fichier (pas d'images, pas de manifeste). Puis le bloc VALIDATION (§ 10).
Réponse trop longue pour tout livrer d'un coup : livrer les missions une par une, chacune COMPLÈTE (YAML +
Markdown), puis écrire « Mission suivante : M-016B — répondre « suite » » et attendre ; le bloc VALIDATION suit
la dernière mission. Ne jamais tronquer un fichier.

────────────────────────────────────────────────────────────────────────────
4. YAML — SCHÉMA EXACT (helo-xp-mission 1.0)
────────────────────────────────────────────────────────────────────────────
Textes longs (summary, detailed_description) : bloc littéral « |- », paragraphes séparés par UNE ligne
vide, une idée par paragraphe, 4 phrases au plus par paragraphe. Jamais un seul bloc compact.
Règles de syntaxe : YAML 1.2 valide, indentation 2 espaces, PAS d'ancres ni d'alias (&id / *id) :
répéter les valeurs. Textes contenant « : », « # » ou commençant par un caractère spécial entre
guillemets doubles. id de mission entre guillemets ('M-016'). Booléens true / false. Nombres sans unité.
Coordonnées : degrés décimaux WGS84, 6 décimales, lat puis lon, ouest et sud négatifs.

schema: helo-xp-mission
schema_version: '1.0'
mission:
  series: 4                    # = série indiquée pour la famille dans PROCHAINS_NUMEROS
  number: 16                   # = numéro de l'opération (entier)
  id: 'R-016A'                 # = NN (R = AAR), + lettre de l'équipe s'il y en a plusieurs (en texte)
  type: AAR                    # code de famille (§ 2)
  subtype: TRAINING            # code de sous-type (§ 2)
operation:                     # opération commune aux missions de ses équipes (identique dans chacune)
  id: 'R-016'
  name: "Nom de l'opération"
  missions: ['R-016A', 'R-016B']   # toutes les missions de l'opération, dans l'ordre
title: "AXE CECILE — ravitaillement d'une patrouille Rafale"   # court, sans le numéro
summary: |-                   # bloc LITTÉRAL « |- » (jamais « >- » ni « > », qui recollent les lignes)
  Paragraphe 1 (2 à 3 phrases) : la situation — qui, où, ce qui se passe.

  Paragraphe 2 (1 à 2 phrases) : ce que doit faire l'équipage et la contrainte principale.
detailed_description: |-
  Contexte (2 à 4 phrases) : situation, acteurs, pourquoi maintenant.

  Départ et transit (2 à 4 phrases) : terrain, route, points tournants, niveaux ou hauteurs, distance
  et durée estimées.

  Action sur l'objectif (3 à 5 phrases) : ce qui se passe à TARGET, aux rendez-vous et dans les zones,
  coordination avec les autres acteurs.

  Décisions et imprévus (2 à 3 phrases) : critères d'interruption, carburant, météo, plan B.

  Retour et fin de mission (1 à 3 phrases) : retour, déroutement éventuel, ce qui marque la fin.
aircraft:                      # l'aéronef DEFA de CETTE mission (une équipe = un aéronef ; une patrouille de
                               # deux appareils sous un même indicatif reste une équipe). Les autres équipes DEFA
                               # de l'opération et les autres acteurs (VSAV, SMUR, CROSS, PGHM, commandement
                               # sol, aéronefs non DEFA) vont dans teams.
  - id: AC1
    type: "A332 A330 MRTT Phénix"   # COMMENCE par le désignateur OACI du § 6, puis le nom usuel
    callsign: COTAM3510        # sans espace, 3 à 9 caractères, lettres et chiffres
    operator: "Armée de l'Air et de l'Espace"
    role: aéronef principal
    cruise_speed_kt: 460         # vitesse vraie de croisière réaliste pour ce type et cette mission (kt)
    cruise_level: FL280          # niveau ou hauteur de transit : FL + 3 chiffres, ou « 1500 ft » (hélicoptère)
origin:                        # terrain de départ de CETTE équipe (§ 5)
  name: "BA 125 Istres-Le Tubé (LFMI)"
  lat: 43.522778
  lon: 4.923889
destination:                   # RETOUR BASE (toujours) : de préférence la base de départ (répéter les valeurs
                               # d'origin), sinon la base où l'appareil finit la mission (relève, escale, base avancée)
  name: "BA 125 Istres-Le Tubé (LFMI)"
  lat: 43.522778
  lon: 4.923889
target:                        # objectif / point central de la mission (id TOUJOURS TARGET)
  id: TARGET
  name: "Nom précis du lieu"
  lat: 0.000000
  lon: 0.000000
  time_on_task_min: 20         # temps passé sur l'objectif (poser, treuillage, largages, recherche, prise en charge…)
turning_points:                # 2 à 6 points dans l'ordre du vol, id PT1, PT2…
  - id: PT1
    name: "Nom réel du point (ville, cap, sommet, balise…)"
    lat: 0.000000
    lon: 0.000000
    role: "transit / entrée zone / point de report / …"
    time_on_task_min: 0          # 0 pour un point de passage ; durée d'un poser, d'une attente, d'un hippodrome…
rendezvous:                    # 0 à 3 rendez-vous, id RDV-1, RDV-2… ; un rendez-vous commun à plusieurs missions
                               # de l'opération a le MÊME id, le même nom et les mêmes coordonnées dans chacune
  - id: RDV-1
    name: "Lieu du rendez-vous"
    lat: 0.000000
    lon: 0.000000
    participants: [COTAM3510, CERBERES51]   # callsigns présents dans aircraft ou teams
    role: "ralliement / relève / largage / poser / …"
    time_on_task_min: 5          # attente, jonction, poser au rendez-vous
zones:                         # 0 à 2 zones de travail, id ZONE-1…
  - id: ZONE-1
    name: "Nom de la zone"
    centre: { lat: 0.000000, lon: 0.000000 }
    radius_km: 20
    role: "zone de recherche / zone AAR / zone de largage / …"
    time_on_task_min: 45         # temps de travail dans la zone (recherche, hippodrome de ravitaillement…)
route_order: [ORIGIN, PT1, RDV-1, TARGET, PT2, DESTINATION]   # route PROBABLE de CETTE équipe, dans l'ordre :
                               # tous les points réellement survolés (points tournants, rendez-vous, TARGET, zones),
                               # de ORIGIN au retour base DESTINATION ; ids du fichier uniquement
return_options:                # 0 à 3 retours possibles AUTRES que destination, selon la situation (état du patient,
                               # météo, carburant, objectif atteint ou non) ; l'appareil rentre ensuite à sa base
  - name: "CHU de Toulouse – Purpan (hélistation)"
    lat: 43.609000
    lon: 1.400000
    condition: "patient instable : centre de traumatologie"
    time_on_task_min: 10       # poser, dépose du patient
    then_base: true            # false si l'appareil y termine la mission
phases:                        # FACULTATIF (0 à 3) : briefs successifs prévus par le scénariste — la situation évolue
                               # en cours de route ; le brief initial est la partie A (le reste du fichier), les
                               # parties B, C… sont remises à l'équipage au moment indiqué (« pli » à ouvrir)
  - id: B
    title: "Changement de destination"
    trigger_point: RDV-1       # point de référence (id du fichier) ; ORIGIN pour un délai après le décollage
    trigger_delay_min: 10      # minutes après le passage à trigger_point
    trigger: "10 min après RDV-1"   # en clair
    message: "« CODIS 66 : le patient a été redescendu à Vernet, nouvelle DZ au stade. »"   # message reçu
    brief: |-
      Ce qui change (2 à 4 phrases) : nouvelle situation, nouvelle tâche, contraintes.
    route_order: [RDV-1, PT3, TARGET, DESTINATION]   # suite de la route à partir de trigger_point (ids du fichier :
                               # déclarer les nouveaux points dans turning_points, rendezvous ou zones)
timing:                        # durées estimées par TOI d'après route_order, vitesses, niveaux et time_on_task_min
  estimated_flight_min: 95     # décollage → atterrissage, retour base compris (option principale)
  estimated_block_min: 110     # cales → cales (mise en route et roulage compris)
teams:                         # tous les acteurs : les ÉQUIPES_DEFA aéronefs, plus autant d'équipes sol ou
                               # d'autres acteurs que la mission le demande
  - name: CERBERES51/52        # callsign ou nom d'équipe
    service: "Armée de l'Air et de l'Espace"   # ou SAMU, gendarmerie, douane, SDIS, Marine nationale…
    department: Landes         # département français (nom) ou « — »
    type: "RFAL Rafale"        # aéronef : désignateur OACI + nom ; équipe au sol : sa nature
    role: receveurs
payload:
  category: FUEL               # FUEL, CARGO, PERSONNEL, PASSENGERS, MEDICAL, SENSOR, EQUIPMENT, NONE
  description: "Nature précise de la charge"
  mass_kg: 18000               # 0 si sans objet
  passengers: 0
  constraints:
    - "contrainte 1"
    - "contrainte 2"
objectives:
  primary: "Une phrase, vérifiable en fin de mission."
  secondary:
    - "objectif 2"
    - "objectif 3"
risks:                         # 2 à 5
  - hazard: "Danger (2 à 4 mots)"
    consequence: "Conséquence"
    mitigation: "Mesure"
air_refueling:                 # AAR, ou toute mission comportant un ravitaillement en vol ; sinon OMETTRE le bloc
  capable: true
  planned: true
  role: tanker                 # tanker | receiver
  track: CECILE                # nom d'axe de la liste du § 7
vertical_profile:              # coupe verticale du studio
  route: "ORIGIN, FL100, PT1, PT2, TARGET, FL060, DESTINATION"
  cruise: FL100                # niveau par défaut : FL + 3 chiffres, ou altitude « 1500 ft »
maps:                          # voir § 8
  - id: general
    filename: general41.png
    type: general
    description: "Vue générale couvrant départ, destination, points tournants, RDV, cible et zones"
    include: { origin: true, destination: true, turning_points: true, target: true, rendezvous: true, zones: true }
  - id: cible
    filename: cible41.png
    type: target
    description: "Vue locale centrée sur TARGET, rayon approximatif 50 km"
    centre_ref: TARGET
    range_km: 50
  - id: detail_cible
    filename: detail_cible41.png
    type: detail
    description: "Vue détaillée 8 × 5 km autour de TARGET"
    centre_ref: TARGET
    width_km: 8
    height_km: 5
rendering:
  north_up: true
  draw_routes: false
  add_markers: false
  attribution_required: true
notes:
  - "Exercice de simulation aérienne."
  - "Toute coordonnée approximative est signalée ici (point et raison)."

Références internes : ORIGIN, DESTINATION et TARGET sont des identifiants réservés ; tout id cité
(centre_ref, route du profil vertical, route_order, participants) DOIT exister dans le fichier.
Retour base : une mission se termine TOUJOURS par un retour base (destination), de préférence la base de départ ;
quand plusieurs retours sont possibles (HEMS : hôpital selon l'état du patient ; déroutement météo ; terrain
avancé), la destination est le cas le plus probable et les autres vont dans return_options. Pas d'autre clé que
celles du schéma.

────────────────────────────────────────────────────────────────────────────
5. GÉOGRAPHIE — CONTRE LES ERREURS
────────────────────────────────────────────────────────────────────────────
- Tu connais les terrains, bases et hôpitaux français et leurs coordonnées : utilise-les, avec les
  coordonnées du point de référence de l'aérodrome (ARP) ou de l'hélistation. Pas de liste imposée,
  mais ces règles :
  • Terrain d'aviation (origin, destination, tout terrain cité) : « Nom (OACI) », code OACI à 4 lettres
    entre parenthèses — le CR en tire le terrain de départ / d'arrivée. Ne jamais inventer un code : si
    tu n'es pas certain du code, choisis un autre terrain. Bases militaires sous leur nom d'usage
    (« BA 123 Orléans-Bricy (LFOJ) », « BAN Lann-Bihoué (LFRH) », « BA 367 Cayenne-Rochambeau (SOCA) »).
  • Hélistation, hôpital, DZ, point en mer, secteur : pas de parenthèses ni de code (« Hélistation du CHU
    de Grenoble », « DZ de … »).
- Terrain de départ selon l'unité (le départ est la base réelle de l'appareil, pas un terrain au hasard) :
  • Dragon (Sécurité civile, EC45 H145) : la base Dragon du secteur (souvent sur un aérodrome, ex. Dragon 66
    à Perpignan) ; retour à cette base ou vers l'hôpital de destination.
  • SAMU / HEMS (EC35, EC45, A139, AS65 civil) : la base SMUR héliportée — hélistation d'un centre hospitalier
    ou aérodrome proche ; destination : hôpital adapté (CHU, centre de traumatologie, grands brûlés…).
  • Gendarmerie (EC35, EC45, AS50) : base de la section aérienne ; Marine (NH90, AS65) : BAN ou bâtiment ;
    Douane (BE20, B350, AS55) : base douanière (aérodrome).
  • FIRE avec Dash 8 (DH8D), Canadair (CL2T) ou Tracker : départ du pélicandrome d'affectation ou de la base
    avions de la Sécurité civile (Nîmes-Garons) ; pélicandromes permanents ou saisonniers connus
    uniquement (Marignane, Cannes, Bastia, Ajaccio, Carcassonne, Bordeaux…). Écopage : plan d'eau réel et
    autorisé (lac, étang, mer).
  • Militaire : départ d'un terrain militaire de préférence (BA, BAN, ALAT, base de défense outre-mer) ;
    arrivée ou départ sur un terrain civil possible (déploiement, transport, entraînement, déroutement).
- Théâtres : métropole et Corse, et les outre-mer, théâtres d'activité réels : Antilles (Guadeloupe,
  Martinique, Saint-Martin), Guyane, La Réunion, Mayotte, Nouvelle-Calédonie, Polynésie française,
  Saint-Pierre-et-Miquelon, Wallis-et-Futuna. Une mission peut couvrir plusieurs théâtres quand l'opération
  les relie réellement : acheminement Guyane – métropole (escales réalistes : Açores, Cap-Vert, Dakar…), relève
  Corse – continent, évacuation Antilles – Guyane, renfort métropole – Réunion ; sinon elle reste dans un seul
  théâtre. Aéronefs et unités présents sur le ou les théâtres ; l'autonomie de l'aéronef impose les escales
  (points tournants sur les terrains d'escale) ; aéronefs et unités présents sur ce théâtre (ex. Guyane : Puma / Fennec / Caracal
  de l'escadron d'hélicoptères, CN-235 ; Réunion : Dragon 974, Gendarmerie ; Polynésie : Falcon 200,
  Dauphin / Panther de la Marine). Longitude négative à l'ouest de Greenwich (Antilles, Guyane,
  Polynésie, Saint-Pierre) ; latitude négative dans l'hémisphère sud (Réunion, Mayotte, Nouvelle-Calédonie,
  Polynésie, Wallis).
- Tous les points sont dans le ou les théâtres choisis (et sur les escales du trajet qui les relie), sur le bon relief : un point « en mer » réellement en mer
  (à plus de 2 km de la côte, préciser dans role), un « sommet » sur le sommet, un « port » sur le port,
  un « lac » sur l'eau.
- Distances cohérentes : somme des branches ≤ 70 % de l'autonomie de l'aéronef principal
  (hélicoptère : 150 à 400 NM selon le type) ; indiquer distances et durées estimées dans
  detailed_description. Points successifs espacés d'au moins 3 NM.
- Hauteurs réalistes : hélicoptère 500 à 3 000 ft sol en transit (relief en plus) ; avion de transport
  FL100 à FL300 ; chasse / tanker FL200 à FL300 sur les axes AAR ; largage de personnel 1 200 ft sol
  (ouverture automatique) ou FL100+ (chute libre).
- Coordonnée approximative (point non référencé, lieu sans position exacte connue) : autorisée
  seulement si le lieu est réel et la position à moins de 2 km ; la signaler dans notes.

────────────────────────────────────────────────────────────────────────────
6. AÉRONEFS — DÉSIGNATEURS OACI RECONNUS
────────────────────────────────────────────────────────────────────────────
Le champ type (aircraft et teams) COMMENCE par l'un de ces désignateurs, suivi du nom usuel
(ex. « EC35 H135 », « A400 A400M Atlas ») :
  Transport : A400 (A400M Atlas) · C30J (C-130J Super Hercules) · C130 (C-130H Hercules) · C295 (C295) ·
              CN35 (CN-235) · A332 (A330 MRTT Phénix) · A320 · DHC6 (Twin Otter) · PC6T (Pilatus Porter) ·
              TBM9 (TBM 900) · B350 (King Air 350) · BE20 (King Air 200)
  Chasse / surveillance : RFAL (Rafale) · E3CF (E-3F AWACS) · E2 (E-2C / E-2D Hawkeye) · FA50 (Falcon 50) ·
              Q9 (MQ-9 Reaper) · PC21 (PC-21)
  Sécurité civile (avions) : CL2T (Canadair CL-415) · DH8D (Dash 8 Q400 MR) · BE9L (King Air 90)
  Hélicoptères : EC35 (H135) · EC45 (H145) · H160 (H160) · AS65 (Dauphin / Panther) · AS50 (Écureuil H125) ·
              AS55 (Fennec / Écureuil 2) · AS32 (Super Puma / Cougar) · EC25 (H225M Caracal) · NH90 (NH90 TTH / NFH
              Caïman) · A139 (AW139) · TIGR (Tigre)
Un autre appareil (ex. Tracker, Falcon 200, Puma) : écrire son désignateur OACI s'il est certain, puis le nom ;
le CR ne le reconnaîtra pas automatiquement, à signaler dans notes. L'aéronef doit être capable de la mission (rayon d'action, charge,
treuil, perche de ravitaillement, capacité de largage…).

────────────────────────────────────────────────────────────────────────────
7. RAVITAILLEMENT EN VOL (AAR et missions qui en comportent)
────────────────────────────────────────────────────────────────────────────
Axes autorisés (MIAM ENR 5.7) : AGATHE, ALOHA, AMELIE, BARBARA, CECILE, DIANA, EDWIGE, FABIOLA, GISELE,
IRENE, JUDITH, KATIA, LEA, LUCIE, MARIE, NADIA, NINA, OCEANE, OLIVIA, REGINA, SIMONE, STACY,
STEPHANIE, TANIA, TIPHAINE, URSULA, VALENTINA, VIVIANE, YVETTE, ZOE, ZORA.
- air_refueling.track = un de ces noms ; turning_points : « <AXE> ARIP » (entrée) et « <AXE> ARCP »
  (point de contact) ; RDV-1 à l'ARIP. Le studio recale l'axe sur la base ENR 5.7 : si tu n'es pas sûr
  des coordonnées ARIP / ARCP, donne une position plausible dans la région de l'axe et écris dans notes
  « coordonnées de l'axe <AXE> à recaler sur l'ENR 5.7 ».
- Tanker : A332 ou A400 (configuration tanker) ou C30J (ravitaillement d'hélicoptères) ; receveurs
  compatibles (Rafale : panier ; hélicoptère ravitaillable : EC25 Caracal).

────────────────────────────────────────────────────────────────────────────
8. CARTES (bloc maps)
────────────────────────────────────────────────────────────────────────────
Obligatoires : general (include : tout à true), cible (TARGET, range_km 30 à 80), detail_cible
(TARGET, 8 × 5 km). En plus : une carte detail_rdv par rendez-vous (id detail_rdv_1, filename
detail_rdvNN-1.png, type detail_rdv, centre_ref RDV-1, 8 × 5 km) et une carte zone par zone (id zone_1,
filename zoneNN.png, type zone, centre_ref ZONE-1, range_km ≈ 2 × radius_km). filename : NN = id de la
mission. description : une phrase.

────────────────────────────────────────────────────────────────────────────
9. MARKDOWN (summaryNN.md) — FORMAT EXACT
────────────────────────────────────────────────────────────────────────────
Mêmes valeurs que le YAML, dans cet ordre de titres (« ## » exactement, libellés exacts) ; les lignes
« Clé : valeur » ont un espace avant et après les deux-points.
Section « Ravitaillement en vol » : seulement si le bloc air_refueling existe. Section « Rendez-vous » :
seulement s'il y a des rendez-vous. Les chevrons <…> sont à remplacer, ils n'apparaissent pas dans le fichier.

# Mission 41 — <CALLSIGN> — « <title> »

## Introduction

Type : <mission.type>
Sous-type : <mission.subtype>
Aéronef : <aircraft[0].type>
Callsign : <aircraft[0].callsign>
Départ : <origin.name> — <lat>, <lon>
Destination : <destination.name> — <lat>, <lon>

## Summary

<summary — mêmes paragraphes que le YAML, séparés par une ligne vide>

## Description détaillée

<detailed_description — mêmes paragraphes que le YAML, séparés par une ligne vide>

## Équipes engagées

| Nom / callsign | Arme / service | Département | Type | Rôle |
|---|---|---|---|---|
| <name> | <service> | <department> | <type> | <role> |

## Coordination de l'opération

Opération : <operation.name> — missions <operation.missions>
- <autre mission> — <callsign> (<type>) : <son rôle en une phrase>, <rendez-vous ou créneau commun>

(section présente seulement s'il y a plusieurs équipes)

## Charge / personnel

Catégorie : <payload.category>
Description : <payload.description>
Masse : <mass_kg> kg
Passagers : <passengers>

Contraintes :
- <contrainte>

## Objectif principal

<objectives.primary>

## Objectifs secondaires

- <objectif>

## Points tournants

| ID | Nom | Latitude | Longitude | Rôle |
|---|---|---:|---:|---|
| PT1 | <name> | <lat> | <lon> | <role> |

## Rendez-vous

- **RDV-1 — <name>** — <lat>, <lon> — participants : <A>, <B> — <role>

## Ravitaillement en vol

- capable: true
- planned: true
- role: tanker
- track: CECILE

## Risques à prendre en compte

- **<hazard>** — conséquence : <consequence> — mesure : <mitigation>

## Cartographie prévue

- `general41.png` — <description>

## Partie B — <phases[].title>

À ouvrir : <phases[].trigger>
Message : <phases[].message>

<phases[].brief>

(une section « ## Partie X — … » par partie de phases, en FIN de fichier ; absente sans phases)

> Scénario de simulation — ne pas utiliser pour une mission réelle.

────────────────────────────────────────────────────────────────────────────
10. VALIDATION (à faire avant de répondre, puis à afficher en fin de réponse)
────────────────────────────────────────────────────────────────────────────
Pour chaque mission, vérifie et corrige avant d'écrire, puis affiche une ligne « NN : OK » ou la
liste des corrections faites :
  [ ] YAML valide, sans ancre ni alias, clés du schéma seulement
  [ ] mission.type et mission.subtype = codes exacts du § 2 ; id = NN en texte
  [ ] terrains au format « Nom (OACI) », codes certains, aucun code inventé ; hélistations sans code
  [ ] départ = base réelle de l'unité (Dragon, SMUR, pélicandrome, base militaire…)
  [ ] toutes les coordonnées dans le ou les théâtres (escales comprises), signes corrects (ouest / sud négatifs), 6 décimales,
      lieux réels, points en mer réellement en mer
  [ ] aircraft : l'aéronef DEFA de la mission (une équipe), repris dans teams ; indicatifs distincts d'une mission
      à l'autre ; rôle de chacun dans l'opération (pas de figurant)
  [ ] ÉQUIPES_DEFA ≥ 2 : une mission complète par équipe (41A, 41B…), chacune avec son aéronef, son départ, ses
      points tournants et ses cartes ; bloc operation identique partout ; rendez-vous communs identiques
      (id, nom, coordonnées) ; autres équipes DEFA dans teams ; section « Coordination de l'opération »
  [ ] TYPES_EQUIPES : chaque aéronef (IMPOSÉ) repris à l'identique (désignateur en tête de aircraft[0].type, indicatif
      exact) dans la mission de son équipe — aucun remplacement
  [ ] aéronefs : désignateur du § 6 en tête du type (sauf aéronef imposé : son désignateur) ; aéronef capable de la mission
  [ ] tous les id cités (centre_ref, route, route_order, participants) existent
  [ ] phases (s'il y en a) : trigger_point existant, délai réaliste, message, brief, route_order reprise à trigger_point ;
      route_order de la mission = partie A ; timing = mission complète prévue (parties comprises) ;
      une section « ## Partie X » par partie
  [ ] route_order : de ORIGIN à DESTINATION (retour base), tous les points survolés ; return_options si plusieurs
      retours sont possibles ; timing cohérent avec la route, cruise_speed_kt, cruise_level et time_on_task_min
  [ ] distances totales compatibles avec l'autonomie ; hauteurs et niveaux réalistes
  [ ] cartes obligatoires présentes, filenames avec le bon NN
  [ ] Markdown : titres exacts, mêmes valeurs que le YAML
  [ ] série : sous-types variés, missions réellement différentes, pas de mot « joueur »
  [ ] summary : 2 paragraphes ; detailed_description : 5 paragraphes ; séparés par une ligne vide, en « |- »
      dans le YAML, identiques dans le Markdown
  [ ] titre et description : un trait d'humour ou une situation décalée chacun, sans nuire au réalisme
```
