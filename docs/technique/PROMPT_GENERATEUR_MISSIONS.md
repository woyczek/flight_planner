# Prompt — générateur de série de missions (Helo XP)

Prompt à donner à un assistant externe (ChatGPT…) pour produire une série de missions directement
lisible par la suite : générateur de mission, studio cartographique, profil vertical, CR et
statistiques. Il décrit **exactement** ce que lisent `apps/cpco/mission_store.js` (YAML + Markdown),
`apps/cpco/map_parser.html` (cartes, zones, profil vertical) et `shared/mission_core/core.js`
(passerelle mission → CR : famille, appareils, terrains). À mettre à jour avec eux.

Copier tout le bloc ci-dessous, régler les paramètres en tête — ou utiliser « Créer une mission avec ChatGPT » du
générateur de mission (bloc 1), qui les règle et copie le prompt. Après modification de ce document : lancer
`python tools/build_mission_prompt.py` (ou `tools/bump_versions.py`), qui régénère `apps/cpco/mission_prompt.js`.

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
                                     Nouvelle-Calédonie, Polynésie…, ou « étranger (pays) », ex.
                                     « étranger (Japon) » ; plusieurs possibles, liés par « + »,
                                     ex. « Guyane + métropole » — voir § 5)
  ÉQUIPES_DEFA    = 2                (1 à 5 : équipes en vol par opération ; UNE mission
                                     complète par équipe — voir § 3)
  SOUS_TYPE       = libre            (ou un code de sous-type du § 2 pour la famille TYPE)
  RENDEZ_VOUS     = libre            (avec : au moins un rendez-vous par mission ; sans : aucun)
  TYPES_EQUIPES   = libre            (aéronef de chaque équipe en vol, dans l'ordre A, B, C…, ex. « A : A400M — COTAM71 + B : automatique + C : A400M — COTAM72 » ; « automatique » = au choix du générateur ; un même type peut revenir avec des indicatifs différents)
  ÉQUIPES_SOL     = libre            (0 à 3 : équipes au sol en plus des équipes en vol)
  RAVITAILLEMENT  = libre            (oui : ravitaillement en vol planifié ; non : aucun)
  DURÉE           = libre            (XS · S · M · L · XL : durée de l'opération, voir ci-dessous)
  TRADUCTIONS     = en               (langues du brief traduit, en plus du français : en · de · es, liées par
                                     « , », ex. « en, de, es » ; aucune : français seul — bloc i18n, voir ci-dessous)

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
DURÉE = durée de l'opération, du premier décollage au dernier atterrissage des équipes (organisation et attente
au sol comprises pour un exercice), en tailles : XS ≈ 30 à 45 min · S ≈ 45 min à 1 h 30 · M ≈ 1 h 30 à 3 h ·
L ≈ 3 à 5 h · XL ≈ 5 à 8 h. Repères et non bornes strictes : dimensionner distances, nombre de points, temps sur
objectif (time_on_task_min), phases de l'exercice et ravitaillements pour que timing.estimated_block_min de chaque
mission tombe dans la tranche (XS : travail près de la base ; XL : longs transits, plusieurs phases, relèves ou
ravitaillement). Libre : durée au choix, réaliste pour la famille et l'aéronef.

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
- Traductions : pour chaque langue de TRADUCTIONS (en anglais, allemand, espagnol), le YAML porte en fin de fichier un
  bloc i18n avec la traduction des textes du brief, mêmes clés que le texte français (modèle ci-dessous, après notes) :
  title, summary, detailed_description, objectives, notes, risks (même ordre), légendes des cartes (par id), et pour l'organisation d'un exercice
  les textes des événements (par id) et des pistes (par id). Traduction fidèle et naturelle, même ton, même humour ;
  indicatifs, codes OACI, noms propres, coordonnées, niveaux et heures inchangés. Le Markdown et les champs techniques
  restent en français. TRADUCTIONS = aucune : pas de bloc i18n.

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
COMBAT    (combat aérien / chasse)     BFM · ACM · DACT · INTERCEPT (entraînement ; police du ciel réelle : COMMAND
                                       AIR_POLICING ; ravitaillement : AAR)
SOF       (opérations spéciales)       INSERTION · EXTRACTION · INFILTRATION · EXFILTRATION ·
                                       TACTICAL_TRANSPORT · SR_SUPPORT · FAST_ROPE · RAPPEL ·
                                       PARACHUTE_INSERTION · LZ_INSERTION · SHIP_INSERTION
SPECIAL   (VIP, essais, formation, convoyage) sous-type libre et court (ex. VIP, TEST_FLIGHT, FERRY, TRAINING)

────────────────────────────────────────────────────────────────────────────
3. LIVRABLES ET NUMÉROTATION
────────────────────────────────────────────────────────────────────────────
OPÉRATION ET MISSIONS. Chaque opération n (1 à NOMBRE_MISSIONS) engage ÉQUIPES_DEFA équipes en vol ; chaque
équipe reçoit SA mission complète — son brief, son PDF, son compte rendu : propre aéronef, propre terrain de
départ, propres points tournants, propres cartes de situation. Les missions d'une opération se coordonnent
(rendez-vous communs, relèves, créneaux, commandement) et partagent le récit d'ensemble. Exemples : FIRE — un
Milan (DH8D, largage depuis Nîmes-Garons), un Dragon (EC45, reconnaissance et secours depuis sa base) et un avion
de commandement (BE20 ou TBM9, coordination au-dessus du feu) = trois missions ; AIRLIFT — un A400M parti de
métropole et un hélicoptère au-dessus de la Corse avec un rendez-vous commun = deux missions ; AAR — ravitailleur
et receveurs = une mission par équipe, points tournants différents, même axe et même rendez-vous.

Numérotation : NN = lettre de la famille + tiret + numéro de l'opération sur 3 chiffres, compté PAR FAMILLE. Lettres :
HEMS / MEDEVAC M · HADR H · FIRE F · SAR S · AIRLIFT T · AAR R · AIRBORNE P · MARITIME N · ISR I · LE L · COMMAND C ·
COMBAT A · SOF O · FI V · SURVEY G · SPECIAL X. Le préfixe est TOUJOURS cette lettre unique, jamais le code
de famille, le sous-type ni l'indicatif (COMBAT / BFM → « A-001A », pas « BFM-001A » ; AAR → « R-016 », pas
« AAR-016 ») : le programme range la mission d'après cette lettre et refuse tout autre préfixe. Première opération = identifiant donné pour la famille dans PROCHAINS_NUMEROS
(ex. « HEMS M-016 série 4 » → opérations M-016, M-017… ; mission.series = 4). Une seule équipe : mission NN (« M-016 »).
Plusieurs équipes : missions NN + lettre de l'équipe, une par équipe dans l'ordre (« M-016A », « M-016B », « M-016C »).
Deux fichiers par mission, chacun dans son propre bloc de code, précédé d'une ligne « Fichier : … » :
  missionNNX.yaml   (bloc ```yaml)
  summaryNNX.md     (bloc ```markdown)
Ordre : missionM-016A.yaml, summaryM-016A.md, missionM-016B.yaml, summaryM-016B.md, … puis l'opération suivante.

EXERCICE ET ORGANISATION (toutes familles). Une opération devient un EXERCICE dès que des informations ne sont pas
connues de tous au décollage : pistes ou trafics à découvrir, messages passés en vol, plis scellés à ouvrir à un
moment donné, situation qui change en cours de route. Elle reçoit alors, EN PLUS des missions des équipes, la mission
d'organisation NN + « Z » (« I-001Z » pour l'ISR, « M-016Z » pour un HEMS : même lettre de famille que l'opération),
livrée APRÈS les missions des équipes (missionNNZ.yaml puis summaryNNZ.md). Elle porte :
  - le brief général remis à tous (summary, detailed_description : situation, objectifs communs, créneaux, fin) ;
  - l'heure H commune : chaque équipe décolle à H plus ou moins un délai tiré de son timing et des rendez-vous ;
  - les chiffons : pistes que les équipages doivent reconnaître, intercepter, escorter ou retrouver. Un chiffon est
    « joué » (played: true) quand un aéronef du simulateur peut tenir le rôle (trafic léger, hélicoptère, avion
    d'affaires, bateau suivi par un hélico…) : il reçoit sa route, son heure de départ et ses consignes ; sinon il
    n'est que dessiné (played: false). Choisir selon ce que l'exercice demande, les deux peuvent coexister.
    Un chiffon joué est volé par un pilote : il a SA MISSION, comme une équipe (§ 4 complet : appareil avec
    l'indicatif du chiffon, départ et retour sur un terrain réel proche de la piste, route = points de la piste,
    timing, cartes), lettre suivant celles des équipes (I-001D…), mission.role: chiffon, subtype: CHIFFON, citée dans
    operation.missions ; son brief dit ce que le joueur doit faire (consignes) et rien de ce que les équipages doivent
    découvrir. La piste de la Z garde le dessin et les révélations, et renvoie à cette mission (mission, takeoff) ;
  - la chronologie : chaque événement dit QUAND (H+n, ou passage d'un point par un participant, plus un délai),
    SOUS QUELLE FORME (radio : passé par l'émetteur en vol ; pli : remis avant le vol, ouvert au moment indiqué),
    DE QUI, À QUI (un ou plusieurs participants, un chiffon joué, ou ALL) et quelles pistes il révèle.
L'information se découvre progressivement : chaque destinataire ne sait au décollage que ce que son brief lui dit ;
le reste lui parvient par les événements. Sans rien de tel, pas de mission Z. Une seule équipe peut aussi avoir une
mission Z (ex. HEMS dont la destination change en vol, recherche dont la position est donnée en vol) : sa mission
garde son identifiant NN (ex. L-001 et L-001Z).
Aucun autre fichier (pas d'images, pas de manifeste). Puis le bloc VALIDATION (§ 10).
Réponse trop longue pour tout livrer d'un coup : livrer les missions une par une, chacune COMPLÈTE (YAML +
Markdown), puis écrire « Mission suivante : M-016B — répondre « suite » » et attendre ; le bloc VALIDATION suit
la dernière mission. Ne jamais tronquer un fichier.

────────────────────────────────────────────────────────────────────────────
4. YAML — SCHÉMA EXACT (helo-xp-mission 2.0)
────────────────────────────────────────────────────────────────────────────
Textes longs (summary, detailed_description) : bloc littéral « |- », paragraphes séparés par UNE ligne
vide, une idée par paragraphe, 4 phrases au plus par paragraphe. Jamais un seul bloc compact.
Règles de syntaxe : YAML 1.2 valide, indentation 2 espaces, PAS d'ancres ni d'alias (&id / *id) :
répéter les valeurs. Textes contenant « : », « # » ou commençant par un caractère spécial entre
guillemets doubles. id de mission entre guillemets ('M-016'). Booléens true / false. Nombres sans unité.
Coordonnées : degrés décimaux WGS84, 6 décimales, lat puis lon, ouest et sud négatifs.

schema: helo-xp-mission
schema_version: '2.0'
mission:
  series: 4                    # = série indiquée pour la famille dans PROCHAINS_NUMEROS
  number: 16                   # = numéro de l'opération (entier)
  id: 'R-016A'                 # = NN (R = AAR), + lettre de l'équipe s'il y en a plusieurs (en texte)
  type: AAR                    # code de famille (§ 2)
  subtype: TRAINING            # code de sous-type (§ 2)
  theatre: métropole           # théâtre (§ 5) : métropole, Corse, Antilles… ou « étranger »
  country: FR                  # pays du théâtre, code ISO 3166 à 2 lettres (FR pour la France et l'outre-mer ; JP, ID…)
operation:                     # opération commune aux missions de ses équipes (identique dans chacune)
  id: 'R-016'
  name: "Nom de l'opération"
  missions: ['R-016A', 'R-016B']   # toutes les missions des équipes de l'opération, dans l'ordre (sans la Z)
  organisation: 'R-016Z'       # SEULEMENT pour un exercice (§ 3) : id de la mission d'organisation
title: "AXE CECILE — ravitaillement d'une patrouille Rafale"   # court, sans le numéro
summary: |-                   # bloc LITTÉRAL « |- » (jamais « >- » ni « > », qui recollent les lignes)
  Paragraphe 1 (2 à 3 phrases) : la situation — qui, où, ce qui se passe.

  Paragraphe 2 (1 à 2 phrases) : ce que doit faire l'équipage et la contrainte principale.
detailed_description: |-
  Contexte (2 à 4 phrases) : situation, acteurs, pourquoi maintenant.

  Départ et mise en place (1 à 3 phrases) : terrain de départ, ce qui conditionne le départ (créneau,
  météo, équipement). PAS d'itinéraire, de niveaux, de distances ni de durées : la route, le profil et les
  temps sont calculés par le programme d'après les points du fichier.

  Action sur l'objectif (3 à 5 phrases) : ce qui se passe à TARGET, aux rendez-vous et dans les zones,
  coordination avec les autres acteurs.

  Décisions et imprévus (2 à 3 phrases) : critères d'interruption, carburant, météo, plan B.

  Retour et fin de mission (1 à 3 phrases) : retour, déroutement éventuel, ce qui marque la fin.
  Ne pas citer les zones réglementées à activer : le programme les calcule d'après la route et les zones.
aircraft:                      # l'aéronef de CETTE mission (une équipe = un aéronef ; une patrouille de
                               # deux appareils sous un même indicatif reste une équipe). Les autres équipes
                               # de l'opération et les autres acteurs (VSAV, SMUR, CROSS, PGHM, commandement
                               # sol, aéronefs extérieurs) vont dans teams.
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
zones:                         # 0 à 3 zones de travail, id ZONE-1… (règles : voir sous le schéma)
  - id: ZONE-1
    name: "Nom de la zone"
    kind: search               # search : zone de recherche ; mission : zone de travail (observation, largage,
                               # feu, levé, hippodrome…) ; exclusion : zone à éviter (population, faune, relief)
    centre: { lat: 0.000000, lon: 0.000000 }
    radius_km: 20              # zone ronde : centre + rayon
    points:                    # OU zone polygonale (3 à 8 sommets dans l'ordre, lieux réels) : secteur borné par
      - { lat: 0.000000, lon: 0.000000 }   # des vallées, crêtes, routes, côtes… ; le centre reste donné
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
# Pistes (chiffons) et messages en vol : JAMAIS dans la mission d'une équipe, mais dans le bloc exercise de la
# mission d'organisation (§ 4 bis). Les anciens champs tracks / injects ne sont plus produits.
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
                               # exercice (§ 3) : chaque partie figure AUSSI dans la chronologie de la Z (kind: pli,
                               # to: l'équipe, at: trigger_point, by: son indicatif, phase: B)
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
alert:                         # mission d'ASTREINTE (QRA, alerte, réserve) seulement ; sinon OMETTRE le bloc
  ready_at: "H-30mn"           # prêt à partir de (relatif à H, unité comprise, ou heure réelle « 12:30Z »)
  aerodrome: LFBM              # terrain d'attente (OACI)
  notice_min: 15               # décollage prévisible XX minutes après l'ordre
  window_end: "H+2h"           # fin d'astreinte
  trigger: "ordre du CDC (mission d'organisation Z, événement EV-1)"
  phases:                      # suites possibles selon l'ordre reçu (1 à 3)
    - { id: P1, if: "piste nord", route: [PT1, PT2], task: "interception" }
    - { id: P2, if: "piste sud", route: [PT3], task: "identification" }
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
i18n:                          # selon TRADUCTIONS (sinon OMETTRE le bloc) : une clé par langue (en, de, es)
  en:
    title: "AXE CECILE — refuelling a Rafale patrol"
    summary: |-
      …
    detailed_description: |-
      …
    objectives:
      primary: "…"
      secondary:
        - "…"
    notes:                     # même ordre que notes
      - "…"
    risks:                     # même ordre que risks
      - { hazard: "…", consequence: "…", mitigation: "…" }
    events:                    # organisation d'un exercice seulement : textes des événements, par id
      EV-1: { title: "…", text: "…" }
    tracks:                    # organisation d'un exercice seulement : textes des pistes, par id
      TRACK-401: { nature: "…", task: "…", conduct: "…" }
    maps:                      # légendes des cartes (description), par id de carte
      general: "…"

Zones (dessinées sur toutes les cartes) : toute mission dont le travail porte sur une SURFACE et non sur un point
en a une — recherche d'une personne, d'une épave ou d'un véhicule (SAR, LE, HEMS en recherche : kind search), secteur
d'observation ou de surveillance (ISR, MARITIME, COMMAND : mission), feu et ses abords (FIRE : mission), levé (SURVEY :
mission), zone de largage (AIRBORNE : mission), secteur à éviter (exclusion). Taille réaliste pour l'aéronef et le
temps de travail (quelques km pour une recherche en hélicoptère, dizaines de km pour un avion de surveillance) ;
forme ronde quand le secteur est centré sur un point connu, polygonale quand il suit le terrain. Une mission sur un
point précis (évacuation, transport) n'a pas de zone. Quand la position exacte n'est connue qu'en vol (personne ou
véhicule signalé, épave localisée), la mission devient un exercice (§ 3) : la zone de recherche est dans la mission,
TARGET en est le centre, et la position réelle est un chiffon à UN point (played: false, nature de la cible)
révélé par un message radio de la mission Z ; la carte détaillée de TARGET n'est pas produite (le studio fait la
carte de la position révélée).

Basse altitude : un avion de combat ou de transport tactique qui transite ou travaille à basse hauteur (sous
environ 1500 ft ASFC) le fait dans le RTBA (réseau très basse altitude : zones R des cartes AZBA, ex. R 45, R 69,
R 147, R 152, R 590) — points tournants et zones posés dans les tronçons du RTBA, entrée et sortie du réseau
nommées ; cruise_level en ft (« 500 ft »). En dehors du RTBA, pas de basse hauteur pour ces avions. Les
hélicoptères ne sont pas concernés (vol tactique selon la mission).

Astreinte (bloc alert) : mission dont l'heure de décollage n'est pas fixée — l'équipage est « prêt à » une heure sur un
terrain et décolle sur ordre, dans le préavis donné (QRA, alerte SAR, réserve d'un exercice). Le récit le dit (« soyez
prêt à … et attendez les ordres ») ; l'ordre et la phase retenue viennent d'un événement de la mission d'organisation
(exercise.events : message radio) ; chaque phase a sa route (points du § 4) et sa tâche ; les cartes couvrent toutes
les phases. Pas de bloc alert pour une mission à heure fixe.

Combat aérien (COMBAT) : chasseurs (RFAL, MIR2 ; PC21 en instruction), en patrouille contre un adversaire
(plastron ou partenaire ; DACT : type différent — ex. Rafale contre Mirage 2000, ou chasseur étranger en
exercice). Le travail se fait dans une zone d'entraînement réelle au-dessus de la mer ou d'une région peu peuplée
(TSA, CBA ou zone D des cartes, nommée dans role) : zone de kind mission, TARGET en son centre, bloc d'altitude
annoncé (ex. FL150–FL350 ; BFM / ACM au-dessus d'un plancher de sécurité de 10 000 ft sauf zone prévue pour plus
bas), format (1v1, 2v1, 2v2…), contrôleur (CDC au sol ou AWACS), joker et bingo carburant, règles d'entraînement
(knock-it-off, plancher). INTERCEPT : interceptions guidées d'une cible d'entraînement jusqu'à l'identification
visuelle. Tirs simulés seulement ; la mission reste un entraînement (pas de combat réel ni de cible réelle).

Références internes : ORIGIN, DESTINATION et TARGET sont des identifiants réservés ; tout id cité
(centre_ref, route du profil vertical, route_order, participants) DOIT exister dans le fichier.
Retour base : une mission se termine TOUJOURS par un retour base (destination), de préférence la base de départ ;
quand plusieurs retours sont possibles (HEMS : hôpital selon l'état du patient ; déroutement météo ; terrain
avancé), la destination est le cas le plus probable et les autres vont dans return_options. Pas d'autre clé que
celles du schéma.

────────────────────────────────────────────────────────────────────────────
4 bis. MISSION D'ORGANISATION D'UN EXERCICE (missionNNZ.yaml)
────────────────────────────────────────────────────────────────────────────
Même schéma que § 4 pour les champs communs (schema, mission, operation, title, author, date, summary,
detailed_description, teams, notes) ; PAS d'aircraft, origin, destination, turning_points, route_order, timing,
vertical_profile ni maps (les cartes de l'organisation et des chiffons sont faites par le studio). Les rendez-vous et
zones de l'exercice restent dans les missions des équipes. Structure :

schema: helo-xp-mission
schema_version: '2.0'
mission:
  series: 1
  number: 1
  id: 'I-001Z'
  type: ISR                    # famille de l'opération
  subtype: EXERCICE
  role: organisation
operation:                     # identique aux missions des équipes
  id: 'I-001'
  name: "ŒIL DE SOLOGNE"
  missions: ['I-001A', 'I-001B', 'I-001C']
  organisation: 'I-001Z'
title: "ŒIL DE SOLOGNE — organisation de l'exercice"
summary: |-                    # brief général remis à tous
  …
detailed_description: |-
  …
exercise:
  h_hour: "H"                  # UNE seule heure de référence pour tout l'exercice : « H » (ou « T », « M » : le même
                               # instant), ou une heure réelle (« 14:00Z ») si le scénario l'impose. Tout décalage porte
                               # son unité : « H+2mn », « H-15mn », « H+1h », « H+1h30mn » ; jamais « H+50 » sans unité
  participants:                # une ligne par équipe en vol (callsign = aircraft[0].callsign de sa mission)
    - { callsign: CYRANO01, mission: 'I-001A', takeoff: "H-15mn", role: "surveillance et fourniture des pistes" }
    - { callsign: RAFALE31, mission: 'I-001C', takeoff: "H", role: "reconnaissance des pistes" }
  tracks:                      # chiffons ; points réels, coordonnées vérifiables (§ 5)
    - id: TRACK-401
      name: "TRACK 401"
      nature: "trafic léger non coopératif"
      played: true             # true : tenu par un aéronef du simulateur ; false : seulement dessiné
      callsign: CHIFFON401     # indicatif du chiffon joué (vide sinon)
      start: "H+50mn"          # départ du premier point (chiffon joué)
      mission: 'I-001D'        # chiffon joué : sa mission (même indicatif en aircraft[0].callsign), sinon omis
      takeoff: "H+35mn"        # chiffon joué : décollage de sa mission (start moins le transit jusqu'au premier point)
      aircraft_type: "PC-21"   # chiffon joué : type de l'appareil qui tient le rôle (celui de sa mission)
      points:                  # route, dans l'ordre (2 points au moins) ; UN point pour une position fixe (cible
                               # révélée en vol : véhicule, personne, épave)
        - { name: "Rosnay", lat: 46.701667, lon: 1.215278 }
        - { name: "Mézières-en-Brenne", lat: 46.821667, lon: 1.211389 }
      level: "3 500–5 000 ft"
      speed_kt: 120
      task: "ce que les équipages doivent établir : type, cap, comportement, identification"
      conduct: |-              # consignes du chiffon joué (comportement, réponses à la radio, fin)
        …
  events:                      # chronologie ; ids EV-1, EV-2… dans l'ordre
    - id: EV-1
      at: RDV-2                # « H+1h », « H+45mn », ou id d'un point de la mission du participant « by »
      by: RAFALE31             # participant dont le passage à « at » déclenche l'événement (si at est un point)
      delay_min: 0             # minutes après ce passage
      kind: radio              # radio : passé en vol par l'émetteur ; pli : remis avant le vol, ouvert au moment dit
      from: CYRANO01           # émetteur (participant, contrôleur, CODIS, directeur d'exercice…)
      to: [RAFALE31]           # destinataires : indicatifs de participants ou de chiffons joués, ou [ALL]
      title: "Contact tactique — TRACK 401"
      text: |-
        Ce qui est transmis ou ce que contient le pli (2 à 6 phrases), valeurs utiles comprises.
      reveals: [TRACK-401]     # pistes révélées aux destinataires (ids de tracks)

Règles : toute piste est révélée par au moins un événement ; un événement lié à un point cite un point qui existe
dans la mission de son participant « by » ; les décollages (takeoff) et départs (start) sont cohérents avec les
timings des missions et les rendez-vous ; chaque chiffon joué a callsign, start, conduct, mission, takeoff et
aircraft_type, et sa mission est livrée avec celles des équipes (avant la Z) ; les participants ne listent que les
équipes, pas les chiffons ; les destinataires sont des participants, des chiffons joués (id ou indicatif) ou ALL.

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
- Théâtre étranger (« étranger (pays) », pays au choix du générateur s'il n'est pas donné) : mission hors de
  France — détachement ou exercice multinational, coopération, évacuation de ressortissants, aide humanitaire, relais
  vers une base prépositionnée (Djibouti, Abou Dhabi, Niamey, Dakar, Libreville…) ou chez un partenaire. Départ d'une
  base française ou partenaire réellement utilisable, ou arrivée depuis la France avec escales réalistes ; terrains
  et lieux réels du pays, noms locaux usuels, codes OACI certains uniquement. mission.theatre = « étranger »,
  mission.country = code ISO du pays. Les données du programme (espaces aériens, voies aériennes, zones à activer)
  ne couvrent que la France : ne pas en inventer pour l'étranger ; le brief cite l'autorité locale à contacter.
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
  Chasse / surveillance : RFAL (Rafale) · MIR2 (Mirage 2000) · E3CF (E-3F AWACS) · E2 (E-2C / E-2D Hawkeye) · FA50 (Falcon 50) ·
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

## Exercice

Organisation : <operation.organisation>
Heure H : <exercise.h_hour>
Décollage : <takeoff de ce participant>
Plis scellés remis : <nombre de plis adressés à cet équipage, et le moment d'ouverture de chacun — pas leur contenu>
Messages radio attendus en vol : <oui / non>

(section présente seulement pour une mission d'équipe d'un exercice)

## Partie B — <phases[].title>

À ouvrir : <phases[].trigger>
Message : <phases[].message>

<phases[].brief>

(une section « ## Partie X — … » par partie de phases, en FIN de fichier ; absente sans phases)

Mission d'organisation (summaryNNZ.md) : mêmes règles, titres dans cet ordre — # Organisation NNZ — « <title> »,
## Introduction (Type, Sous-type, Opération : <operation.name> — missions <operation.missions>), ## Summary,
## Description détaillée, ## Équipes engagées, puis :

## Heure H et participants

Heure H : <exercise.h_hour>

| Indicatif | Mission | Décollage | Rôle |
|---|---|---|---|
| <callsign> | <mission> | <takeoff> | <role> |

## Chiffons

| Piste | Joué | Indicatif | Départ | Nature | Points | Niveau | Vitesse | À établir | Consignes |
|---|---|---|---|---|---|---|---:|---|---|
| <name> | <oui / non> | <callsign> | <start> | <nature> | <points : nom lat, lon → …> | <level> | <speed_kt> | <task> | <conduct> |

## Chronologie

- **<id> — <at> (<by>) +<delay_min> min** — <radio | pli> — <from> → <to> : <title> — pistes <reveals>
  <text>

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
  [ ] aircraft : l'aéronef de la mission (une équipe), repris dans teams ; indicatifs distincts d'une mission
      à l'autre ; rôle de chacun dans l'opération (pas de figurant)
  [ ] ÉQUIPES_DEFA ≥ 2 : une mission complète par équipe (41A, 41B…), chacune avec son aéronef, son départ, ses
      points tournants et ses cartes ; bloc operation identique partout ; rendez-vous communs identiques
      (id, nom, coordonnées) ; autres équipes dans teams ; section « Coordination de l'opération »
  [ ] TYPES_EQUIPES : chaque aéronef (IMPOSÉ) repris à l'identique (désignateur en tête de aircraft[0].type, indicatif
      exact) dans la mission de son équipe — aucun remplacement
  [ ] aéronefs : désignateur du § 6 en tête du type (sauf aéronef imposé : son désignateur) ; aéronef capable de la mission
  [ ] tous les id cités (centre_ref, route, route_order, participants) existent
  [ ] detailed_description sans itinéraire, niveaux, distances, durées ni zones à activer (calculés par le programme)
  [ ] basse altitude (avion de combat, transport tactique) : dans le RTBA, entrée et sortie du réseau nommées
  [ ] zones : une zone (kind, cercle ou polygone réaliste) pour toute mission de surface (recherche, observation,
      feu, levé, largage) ; position connue seulement en vol → exercice, chiffon à un point, pas de carte détaillée de TARGET
  [ ] exercice (§ 3, § 4 bis) : mission NNZ livrée après les équipes, operation.organisation dans toutes les missions
      de l'opération ; participants = équipes en vol avec leur décollage ; chiffons réels, niveaux et vitesses cohérents
      avec la nature, chiffons joués avec callsign, start, conduct, mission, takeoff, aircraft_type et leur mission
      livrée (§ 4 complet, role chiffon) ; chaque événement a un moment, une forme
      (radio / pli), un émetteur, des destinataires, un texte ; toute piste est révélée ; aucun tracks / injects dans
      les missions des équipes
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
