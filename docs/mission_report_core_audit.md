# Mission Report Core — audit et plan d'intégration

> Étape « travail demandé avant codage » (§28 du cahier des charges).
> État de référence : `repository_tree` v3 + branches `fix/explicit-option-values` (!1),
> `feat/reporting-tables-tracking` (!2), `feat/network-tracker` (!3).
> **Aucun fichier n'est modifié par ce document.** Décisions validées le 2026-09-23 :
> voir §G (stockage YAML + CSV généré, HEMS/FIRE reconstruits sur le Core, dossier
> `FIRE/` sans redirection).

---

## A. Audit de l'existant

### A.1 Pages déclarées dans `repository_tree`

| Page | Rôle | Remarques |
|---|---|---|
| `HEMS/hems_medevac_cr.html` | Générateur CR HEMS / MEDEVAC | Script inline minifié (`headers`, `row()`, `data()`), CSV plat 50 colonnes |
| `HEMS/hems_medevac_reporting.html` | Reporting HEMS | `shared/hems_reporting.js` |
| `GAAR/DEFA-Virtual.cr.gen.securite-civile.html` | Générateur CR GAAR | Script inline lisible (`ledgerHeader`, `flattenRow()`), CSV plat 46 colonnes. **Titre et nom de fichier à corriger** |
| `GAAR/mission_stats.html` | Redirection vers `gaar_mission_reporting.html` | Seule entrée de menu GAAR « Statistiques » |
| `mission_operations_reporting.html` | Reporting général GAAR + HEMS | Codé pour deux familles seulement |
| `LandingPerformanceDashboard/…_i18n.html` | Tableau des atterrissages | Référence visuelle des tableaux |
| `flight_performance_planner.html` | Planificateur carburant/performances | Hors périmètre missions |

Non déclarée : **`GAAR/gaar_mission_reporting.html`** (atteinte seulement via la redirection).

### A.2 Composants communs (`shared/`)

| Domaine | Fichiers | Constat |
|---|---|---|
| Framework UI | `repository_nav.js/.css` (en-tête, menu, langue, thèmes par dossier), `app_framework.js` (blocs repliables/déplaçables, ordre mémorisé, pied de page, `guardUnsavedChanges`) | Générique, réutilisable tel quel |
| Tableaux | `mission_table.js` → `SortedTable` (!2) | Générique |
| Période | `time_period.js` | Générique |
| i18n | `content_i18n.js` (traduction des nœuds texte par dictionnaire FR/EN/DE/ES) + `hems_i18n.js`, `gaar_i18n.js`, `reporting_i18n.js`, `mission_operations_i18n.js`, `flight_i18n.js` | Système commun = **dictionnaire de lignes `[fr, en, de, es]`** |
| Persistance | `mission_reporting_config.js` (préférences `missionReportingConfig:v1`, copies locales des registres `missionReportingData:v1:<clé>`, chargement auto, `traceLink`, `serializeLedger`, `openEditor`), `pilot_profile.js` | Clés de registre codées en dur pour 2 familles (`ledgerName`, `gaarLedgerName`) |
| Valeurs de référence | `mission_values.js` (valeurs anglaises des listes, conversion des anciennes valeurs FR) | Liste unique HEMS + GAAR |
| Édition / contrôle | `mission_edit.js` (mode modification, suppression, doublons), `mission_record_loader.js`, `cr_extras.js` | S'appuient sur les globales des pages (`headers`/`row`/`data` ou `ledgerHeader`/`flattenRow`) |
| Extensions CR | `mission_extensions.js` (altitude-densité HEMS, sélecteur FMS GAAR, section trace réseau, mise en cache après archivage), `hems_mission_sync.js` (horaires ↔ événements HEMS), `network_tracker.js` (!3) | Mélange de générique et de spécifique famille |
| Données appareils | `aircraft_directory.js` (flotte type/immat/indicatif + associations locales), `AircraftDB/aircraft_db.js` (base OACI), `aircraft_icons.js` | Réutilisables pour toutes les familles |
| Reportings | `hems_reporting.js`, `gaar_reporting.js` | ~80 % identiques (parse, cartes, répartitions, tableau, export) |
| Registres par défaut | `mission_ledger_defaults.js` | base64 des deux CSV |
| **Inutilisés** | `reporting_data_loader.js`, `gaar_reporting_bridge.js` | Référencés par aucune page |

### A.3 Données, exports, statistiques

- **Registre** : un CSV `;` à plat par famille, une ligne par mission ; en-tête défini en dur dans chaque page CR. Les collections (événements, destinations) ne vont **pas** dans le registre : seulement dans le CSV unitaire (`# events`) et le JSON.
- **JSON** : `Object.fromEntries(FormData)` + `events` + `kpi` — pas de `schemaVersion`.
- **Statistiques** : calculées côté reporting à partir des colonnes plates (minutes, carburant, patients, largages…).
- **Limite structurelle** : le modèle plat ne peut pas porter `aircraft[]`, `crew[]`, `legs[]`, `contacts[]`, `passes[]`… exigés par le cahier des charges (§18).

### A.4 Écarts avec le cahier des charges

1. Deux générateurs écrits à la main, sans moteur commun : toute nouvelle famille = une copie de page (à proscrire, §27).
2. Registres et clés de configuration codés pour 2 familles.
3. Pas de collections dynamiques génériques (seuls les événements et destinations HEMS existent).
4. Pas de capacités combinables (NVG, HOIST… sont aujourd'hui du texte libre « conditions »).
5. Pas de `schemaVersion`, pas de résumé automatique par famille.
6. Reporting général limité à GAAR + HEMS.

---

## B. Mapping des fichiers existants

| Fichier | Décision | Détail |
|---|---|---|
| `repository_nav.js/.css`, `app_framework.js`, `time_period.js`, `mission_table.js`, `pilot_profile.js`, `content_i18n.js` | **Retenu** | Base du Core, inchangés |
| `mission_reporting_config.js` | **Modifié** | Registres déclarés par famille (registre de familles) au lieu de 2 clés en dur ; clés existantes conservées |
| `mission_values.js` | **Modifié** | Devient le registre des vocabulaires (listes par famille + communes) ; table de conversion FR conservée |
| `mission_edit.js`, `mission_record_loader.js`, `cr_extras.js`, `network_tracker.js` | **Modifiés** | Adaptateur : globales HEMS/GAAR **ou** API du Core (`MissionCore.currentRecord()`…) |
| `mission_extensions.js` | **Modifié puis éclaté** | Trace réseau → bloc commun du Core ; altitude-densité → module HEMS ; sélecteur FMS → module FIRE |
| `hems_mission_sync.js` | **Remplacé** (étape 2) | Par le modèle événementiel commun (horaires ⇄ événements pour toutes les familles) |
| `hems_reporting.js`, `gaar_reporting.js` | **Remplacés** (étape 2) | Par le reporting commun `mission_core/reporting.js` configuré par famille |
| `aircraft_directory.js`, `AircraftDB/*` | **Retenus** | Alimentent le bloc Appareil(s) de toutes les familles |
| `*_i18n.js` existants | **Retenus** | Nouveaux dictionnaires par famille dans `shared/mission_core/i18n/` |
| `HEMS/hems_medevac_cr.html`, `HEMS/hems_medevac_reporting.html` | **Reconstruits** (étape 2) | Même adresse ; rendus par le Core (famille HEMS) une fois la parité validée |
| `GAAR/DEFA-Virtual.cr.gen.securite-civile.html` | **Déplacé** → `FIRE/fire_cr.html` (étape 0), reconstruit (étape 2) | Titre « FIRE / GAAR — Compte rendu de mission » ; **pas de redirection** |
| `GAAR/gaar_mission_reporting.html` | **Déplacé** → `FIRE/fire_reporting.html` | Déclaré dans `repository_tree` ; **pas de redirection** |
| `GAAR/mission_stats.html` | **Supprimé** | Redirection devenue inutile |
| `GAAR/DEFA-Virtual.cr_gen.secucivile.html` | **Supprimé** | Ancienne copie du générateur GAAR |
| `GAAR/cl415_gaar_fms_pack/`, `GAAR/milan_gaar_pack/` | **Déplacés** → `FIRE/` | Chemins du sélecteur FMS relatifs à la page |
| `mission_operations_reporting.html` | **Modifié** | Reporting multi-familles (filtre famille, stats communes + spécifiques) |
| `shared/reporting_data_loader.js`, `shared/gaar_reporting_bridge.js` | **Dépréciés → supprimés** | Non référencés |
| `DEFA_mission_reporting_HEMS_GAAR_2026-09-23.zip` | **À retirer du dépôt** | Archive de livraison versionnée par erreur |
| `mission_ledger_defaults.js` | **Modifié** | Registres d'exemple par famille (générés) |

---

## C. Tree cible

Convention : **un dossier par famille, deux pages minces par famille** (`<famille>_cr.html`
pour la saisie, `<famille>_reporting.html` pour le reporting, ~25 lignes chacune : en-tête,
`data-family`, scripts). Toute la logique est dans `shared/mission_core/`. Pas de copie de
générateur (§27), mais bien deux pages par catégorie avec boutons de bascule CR ⇄ reporting.

```text
repository_tree                       (pages, dossiers, thèmes, favicons des 14 familles)
README.md
docs/mission_report_core_audit.md
assets/favicon-<famille>.svg          (×14)
mission_operations_reporting.html     (reporting général multi-familles)
flight_performance_planner.html
LandingPerformanceDashboard/…         (inchangé)
AircraftDB/…                          (inchangé)

HEMS/   hems_medevac_cr.html  hems_medevac_reporting.html  hems_missions.yaml
FIRE/   fire_cr.html          fire_reporting.html           fire_missions.yaml  (+ packs FMS)
        (GAAR/ supprimé, sans redirection)
SAR/    sar_cr.html           sar_reporting.html            sar_missions.yaml
        (idem pour chaque famille : <famille>_missions.yaml)
LE/     le_cr.html            le_reporting.html
MARITIME/ maritime_cr.html    maritime_reporting.html
ISR/    isr_cr.html           isr_reporting.html
SOF/    sof_cr.html           sof_reporting.html
AIRLIFT/ airlift_cr.html      airlift_reporting.html
HADR/   hadr_cr.html          hadr_reporting.html
AIRBORNE/ airborne_cr.html    airborne_reporting.html
COMMAND/ command_cr.html      command_reporting.html
FLIGHTINSPECTION/ fi_cr.html  fi_reporting.html
SURVEY/ survey_cr.html        survey_reporting.html
SPECIAL/ special_cr.html      special_reporting.html

shared/
  repository_nav.js/.css  app_framework.js  content_i18n.js  time_period.js
  mission_table.js  pilot_profile.js  mission_reporting_config.js  mission_values.js
  mission_edit.js  mission_record_loader.js  cr_extras.js  network_tracker.js
  aircraft_directory.js  aircraft_icons.js
  hems_*.js  gaar_*.js  (existants, HEMS / FIRE)
  mission_core/
    core.js            registre des familles, montage de page, brouillon, import/export   [1a]
    model.js           modèle Mission (§E), calculs, migrations de schéma, YAML           [1a]
    blocks.js          blocs communs déclaratifs : identification, appareils[], équipage[],
                       tâche, capacités, environnement, navigation, chronologie, carburant,
                       événements[], étapes[], résultat, remarques, réseau                 [1a]
    form.js            rendu des blocs, collections dynamiques, règles d'affichage        [1a]
    core.css           style des pages de saisie                                           [1a]
    report.js          rendu du CR (§21, sections vides omises) + résumé automatique (§22)
    ledger.js          registre YAML (dossier local / navigateur / fichier) + export CSV    [1a-bis]
    aircraft.js        appareils connus (immatriculation), types OACI enrichissables        [1a-bis]
    vendor/js-yaml.min.js   bibliothèque YAML embarquée (MIT, aucune dépendance réseau)
    reporting.js       page de reporting commune (cartes, répartitions, SortedTable, export) [1a-bis]
    stats.js           statistiques communes + points d'extension famille
    vocab.js           capacités, résultats, types d'événements, rôles d'équipage          [1a]
    families/demo.js   famille de démonstration du moteur (page MissionCore/…_demo.html)   [1a]
    i18n/              core_i18n.js + <famille>_i18n.js (lignes [fr,en,de,es])
    families/          sar.js le.js maritime.js isr.js sof.js airlift.js hadr.js airborne.js
                       command.js flight_inspection.js survey.js special.js
                       hems.js fire.js (adaptateurs des registres existants)
```

---

## D. Matrice fonctionnelle

| Famille | Séries | Voilure fixe | Voilure tournante | Blocs spécifiques (affichage conditionnel) | Stats spécifiques |
|---|---|---|---|---|---|
| HEMS / MEDEVAC *(existant)* | primaire, secondaire, secours… | ○ (MEDEVAC avion) | ● | patients, médicalisation, destinations | patients, alerte→décollage |
| FIRE / GAAR *(existant)* | GAAR, intervention… | ● | ● (HBE) | largages, écopages, FMS | largages, recharges |
| SAR / PR | SAR-LAND, SAR-MARITIME, SAR-AIRCRAFT, PR, CSAR* | ● | ● | datum/LKP, balise, zone + patterns (collection), contacts, survivants, récupération ; **ROTARY+HOIST → treuil** ; **FW+AIRDROP → kit SAR** | recherches, localisés, secourus, treuillages, kits largués |
| LAW ENFORCEMENT | POLICE OBS, GENDARMERIE, BORDER, CUSTOMS, TRAFFIC, PURSUIT, MISSING PERSON, TACTICAL SUPPORT, EVENT SECURITY | ● | ● | autorité, unités sol, objectif, suivi (positions), masquage export public | suivis, durée de suivi |
| MARITIME | MARPAT, FISHERY, CUSTOMS MARITIME, POLLUTION, SHIPPING, ICE, SHIP ID, ANTI-POLLUTION, OFFSHORE | ● | ● | contacts navires (collection : IMO, MMSI, pavillon, AIS/radar/visuel), pollution | navires détectés / identifiés, anomalies, pollutions |
| ISR / RECON | ISR, RECON, EO/IR, IMINT, SIGINT, ELINT, COMINT, BORDER/MARITIME/INFRA ISR | ● | ● | tâche de collecte, orbite, capteurs/modes, contacts/tracks, couverture ; mode générique non classifié | heures sur zone, contacts, couverture |
| SOF / TACTICAL | INSERTION, EXTRACTION, INFIL, EXFIL, TACTICAL TRANSPORT, SR SUPPORT, FAST ROPE, RAPPEL, PARA INSERTION, LZ, SHIP INSERTION | ● | ● | PZ/LZ/DZ (collection), personnels embarqués/déposés/récupérés, profil ; **niveau CR uniquement** | personnels déposés / récupérés |
| AIRLIFT / LOGISTICS | STRATEGIC, TACTICAL, REMOTE, OFFSHORE, POLAR, HUMANITARIAN, PAX, CARGO, COMBI | ● | ● | étapes (legs), manifeste, piste (type/longueur/surface), rotations | passagers, tonnes, rotations |
| HADR / EVACUATION | DISASTER, FLOOD, EARTHQUAKE, CYCLONE, STORM, VOLCANO, HUMANITARIAN, NEO, CIVIL EVAC, ISOLATED, SUPPLY DROP | ● | ● | points d'évacuation, évacués (catégories), fret de secours, rotations | évacués, personnels, fret, sorties |
| AIRBORNE / AIRDROP | PERSONNEL PARADROP, CARGO AIRDROP, RESUPPLY, HUMANITARIAN AIRDROP, SAR KIT DROP, TRAINING DROP | ● | ○ | DZ, passages de largage (collection : prévu/réel, dispersion) | parachutistes, largages, charge larguée |
| COMMAND / AEW / RELAY | AIRBORNE COMMAND, AEW, AIR COORD, COMM RELAY, DISASTER RELAY, FIRE COORD, SAR COORD | ● | ● | unités coordonnées (collection), fréquences/réseaux, orbite, relais, coupures | temps sur station, unités coordonnées, relais |
| FLIGHT INSPECTION | ILS, LOC, GP, VOR, DME, NDB, TACAN, RADAR, PAPI/VASI, RNAV/GNSS, PROC VALIDATION, LIGHTING | ● | ○ | installation, **passes (collection)** ; blocs ILS / VOR-DME-TACAN / validation de procédure selon série | installations inspectées, passes, anomalies, en service / hors service |
| SURVEY / SCIENCE | AERIAL PHOTO, MAPPING, LIDAR, PHOTOGRAMMETRY, GEOPHYSICS, ATMOSPHERIC, WEATHER RECON, VOLCANO, WILDLIFE, ENVIRONMENT, ICE, OCEANOGRAPHIC | ● | ● | projet, lignes (collection), capteurs, qualité données ; **WEATHER RECON → mesures** | heures de survey, lignes, surface couverte, jeux de données |
| SPECIAL / TEST / TRAINING | VIP/GOV, FERRY, TEST, TRAINING | ● | ● | sous-module par série (VIP, convoyage, cartes d'essai + points, exercices de formation) | selon série |

● pertinent · ○ possible/rare · \* CSAR visible seulement si le contexte « militaire » est activé.

---

## E. Schéma de données

### E.1 Mission commune (`schemaVersion: 2`)

```jsonc
{
  "schemaVersion": 2,
  "family": "SAR", "series": "SAR-MARITIME", "subtype": "man-overboard",
  "metadata": { "missionId": "SAR-001", "missionNumber": "", "serial": "", "date": "2026-09-23",
                "timeLocal": "", "timeUtc": "", "classification": "UNCLASSIFIED",
                "context": "exercise|real", "operationName": "", "orderRef": "" },
  "organisation": { "organisation": "", "unit": "", "detachment": "",
                    "requestingAuthority": "", "controllingAuthority": "" },
  "aircraft": [ { "type": "H145", "variant": "", "registration": "F-ZBQU", "tacticalNumber": "",
                  "callsign": "DRAGON06", "category": "rotary|fixed|amphibious",
                  "baseDeparture": "", "baseReturn": "", "massTakeoff": null, "massLanding": null,
                  "configuration": "", "fuel": { "unit": "kg", "start": null, "end": null, "reserve": null } } ],
  "crew": [ { "role": "PIC|COPILOT|WINCH_OPERATOR|RESCUE_SWIMMER|…", "name": "", "aircraftIndex": 0 } ],
  "tasking": { "requestedBy": "", "taskRef": "", "objective": "" },
  "environment": { "metar": "", "taf": "", "wind": "", "temperature": null, "qnh": null,
                   "visibility": "", "ceiling": "", "precipitation": "", "turbulence": "", "icing": "",
                   "seaState": null, "illumination": "", "dayNight": "day|night|twilight", "nvg": false },
  "navigation": { "dep": "", "arr": "", "altn": "", "route": "", "waypoints": [], "area": "",
                  "radiusNm": null, "corridor": "", "orbit": "", "altitude": "", "minAltitude": "",
                  "speed": null, "distanceNm": null },
  "capabilities": [ "NVG", "HOIST" ],
  "timeline": { "briefing": "", "engineStart": "", "offBlock": "", "takeoff": "", "zoneEntry": "",
                "missionStart": "", "missionEnd": "", "zoneExit": "", "landing": "", "onBlock": "", "shutdown": "" },
  "legs": [ { "from": "", "to": "", "takeoff": "", "landing": "", "pax": 0, "cargoKg": 0 } ],
  "events": [ { "timeLocal": "", "timeUtc": "", "type": "CONTACT", "position": "", "altitude": null,
                "speed": null, "heading": null, "fuel": null, "description": "", "result": "" } ],
  "missionData": { /* extension de la famille, versionnée : { "version": 1, … } */ },
  "results": { "outcome": "SUCCESS|PARTIAL_SUCCESS|ABORTED|CANCELLED|DIVERTED|NO_CONTACT|TARGET_NOT_FOUND|WEATHER|TECHNICAL|OPERATIONAL|OTHER",
               "detail": "", "interruptionReason": "", "incidents": "", "anomalies": "" },
  "statistics": { /* calculé : blockMinutes, flightMinutes, transitOutMinutes, timeOnStationMinutes,
                    transitInMinutes, missionMinutes, fuelUsed, distanceNm, personnel, cargoKg, + famille */ },
  "remarks": { "observations": "", "lessonsLearned": "" },
  "network": { "onlineNetwork": "", "ivaoId": "", "vatsimId": "", "trackerUrl": "" }
}
```

Calculs automatiques (§4.4) : bloc = off-block→on-block (ou mise en route→arrêt) ;
vol = décollage→atterrissage ; transit aller = décollage→entrée zone ; temps sur zone =
entrée→sortie zone ; transit retour = sortie zone→atterrissage ; temps mission =
début→fin mission. Passage de minuit géré comme aujourd'hui.

### E.2 Extensions `missionData` par famille (résumé)

| Famille | Structure principale |
|---|---|
| SAR | `rcc, sarNumber, datum{lat,lon,time}, lkp{…}, alertSource, beacon{type,frequency}, persons[{count,description,status}], searchAreas[{pattern,trackSpacing,altitude,speed,visibility,cloud}], sensors[], contacts[{time,position,identified}], recovery{located,recovered,method,destination,sarKitDropped}` |
| LE | `authority, groundUnit, objective{type,description}, contactGround{callsign,frequency}, track[{time,position}], acquisitionTime, lossTime, publicRedaction: true` |
| MARITIME | `seaArea, sector, seaState, waveHeight, vessels[{name,imo,mmsi,callsign,flag,type,course,speed,ais,radar,visual,identified,photo,behaviour,anomaly}], pollution[{nature,dimensions,drift,position}], reportedTo` |
| ISR | `collectionTask, targetRef, orbit, standoffNm, sensors[{sensor,mode}], contacts[{time,trackId,confidence,observation}], coverage, gaps, dissemination, genericMode: true` |
| SOF | `supportedUnit, team, personnelCount, zones[{kind:PZ|LZ|DZ,name,coordinates,tot}], methods{insertion,extraction,landing}, personnel{embarked,delivered,recovered}, profile, lighting` |
| AIRLIFT | `stops[], manifest[{type,weightKg,volume,pallets,dangerousGoods}], pax, runway{type,lengthM,surface,unprepared}, loadingMinutes, unloadingMinutes, delivered, returned, delays, turnaroundMinutes` |
| HADR | `disaster, affectedArea, authority, populationAffected, points[{kind:pickup|evac|shelter,name}], evacuees{planned,transported,children,dependent,medical}, relief{personnel,waterKg,foodKg,medicalKg,shelters,comms}, rotations` |
| AIRBORNE | `dz{name,coordinates,elevation,dimensions}, passes[{type,jumpers,loadKg,parachute,plannedAlt,actualAlt,plannedRunIn,actualRunIn,wind,releaseTime,releasePos,result,landingPos,dispersion}]` |
| COMMAND | `authority, units[{callsign,type,role}], frequencies[], networks[], orbit, stationMinutes, coverage, handovers[], outages[], relayEvents[], effectiveness` |
| FLIGHT INSPECTION | `airport, icao, runway, facility{type,id,frequency,channel}, procedure, inspectionType, passes[{kind,altitude,distance,radial,course,result,anomaly}], ils{locFreq,course,gpAngle,interceptAlt,locResult,gpResult,dmeResult,coverage}, serviceable` |
| SURVEY | `project, organisation, pi, area{polygon}, lines[{number,plannedAlt,actualAlt,plannedSpeed,actualSpeed,start,end,status}], sensors[], dataQuantity, coverage, missedLines, repeatRequired, samples, weatherRecon{points[{altitude,pressure,temperature,humidity,wind,turbulence,icing,dropsonde}]}` |
| SPECIAL | `vip{passengers,authority,schedule,delays,handling} | ferry{reason,technicalStatus,stops,defects} | test{card,points[{id,altitude,speed,config,result,pass}],repeatRequired} | training{instructor,trainee,exercises[{objective,repetitions,completed}],grading}` |
| HEMS | `service, outcome, medicalization, incidentType, patientProfile, sceneLocation, coordinates, destinations[{name,arrival,departure,note}], patients, densityAltitude, alertToTakeoffMinutes, sceneMinutes` (import des anciens CSV/JSON = `schemaVersion: 1`) |
| FIRE / GAAR | `risk, sector, reloadBase, fms, load, drops, reloads, reloadTime, eventDrops, eventReloads, fireAlert, patrolStart, firstDrop, endIntervention` (import des anciens CSV/JSON = `schemaVersion: 1`) |

### E.3 Registre YAML, export CSV et compatibilité *(décision validée)*

- **Source de vérité : un registre YAML par famille** (`<famille>_missions.yaml`) :
  `schemaVersion`, `family`, puis `missions:` (liste de missions au format E.1, arborescent).
  Chargement/écriture comme aujourd'hui : auto-chargement à côté de la page, dossier local
  autorisé (Chrome/Edge), copie locale navigateur partagée entre pages.
- **CSV = export simplifié généré** (une ligne par mission : identifiants, date, famille,
  série, appareil principal, temps calculés, résultat, stats principales) pour les tableurs.
  Il n'est plus relu comme source.
- **Écriture YAML sûre** : dates, heures (`"10:39"`), identifiants et immatriculations
  toujours entre guillemets ; lecture avec le schéma YAML 1.2 « core » (pas de conversion
  implicite des dates) ; commentaires d'en-tête générés.
- **Migration** : les anciens registres CSV HEMS/GAAR et les anciens JSON de CR (sans
  `schemaVersion`) restent importables une fois, convertis vers le YAML (`model.js`).
- JSON reste un format interne (mémoire, copie navigateur), pas un fichier utilisateur.

---

## F. Plan d'intégration (une MR par étape, validation après chacune)

| # | Étape | Contenu | Validation |
|---|---|---|---|
| 0 | Nettoyage + FIRE | fichiers inutilisés/archivés supprimés ; `GAAR/` → `FIRE/` (pages, packs FMS, données locales) sans redirection ; titres corrigés ; `repository_tree` à jour | pages FIRE/HEMS/général fonctionnelles, registres rechargés |
| 1a | Core : modèle + montage | `core.js`, `model.js`, blocs communs (identification, appareils[], équipage[], chronologie, météo, carburant, résultat, remarques, réseau), `collection.js`, capacités | page de démonstration ; export/import JSON ; i18n FR/EN/DE/ES |
| 1a-bis | Core : registre, appareils, reporting *(avancé avant 1b, 2026-09-23)* | `ledger.js` (registre YAML + CSV), `aircraft.js` (appareils connus, types OACI enrichissables, équipements), `reporting.js`, mode modification/suppression, doublons, suivi réseau, pages `MissionCore/demo_cr.html` / `demo_reporting.html` | round-trip CR → registre → reporting → modification / suppression |
| 1b | Core : CR + résumé | `report.js` (sections §21 sans vides), résumé par famille, impression | rapport d'une mission de démo |
| 1c | Core : statistiques | `stats.js` (statistiques communes + points d'extension famille, alimentant reporting famille et général) | totaux vérifiés sur registre de test |
| 2a | HEMS reconstruit sur le Core | `families/hems.js` (mêmes champs, horaires ⇄ événements, destinations), import des anciens CSV/JSON, reporting HEMS par le Core | comparaison champ à champ avec l'ancienne page ; stats identiques |
| 2b | FIRE reconstruit sur le Core | `families/fire.js` (largages, écopages, sélecteur FMS), import des anciens CSV/JSON | idem |
| 2c | Reporting général multi-familles | filtre famille, stats communes + spécifiques, lecture des registres YAML | totaux identiques à l'étape 0 |
| 3 | SAR / PR | famille complète (treuil, kit SAR, patterns) | CR H145 treuillage, H225 recherche maritime |
| 4 | AIRLIFT | legs, manifeste, pistes | A400M tactique, Twin Otter polaire |
| 5 | MARITIME | contacts navires, pollution | CN-235 / Atlantique 2 MARPAT |
| 6 | HADR | évacués, fret de secours | C-130 humanitaire |
| 7 | AIRBORNE | DZ, passes de largage | PC-6 parachutage |
| 8 | FLIGHT INSPECTION | passes, ILS / VOR / procédure | King Air calibration ILS |
| 9 | SURVEY / SCIENCE | lignes, capteurs, weather recon | survey LiDAR |
| 10 | LAW ENFORCEMENT | suivi, masquage export public | hélicoptère police |
| 11 | ISR / RECON | collecte, contacts, mode générique | King Air ISR |
| 12 | COMMAND / AEW / RELAY | unités coordonnées, relais | appareil relais incendie |
| 13 | SOF / TACTICAL | zones, personnels (niveau CR) | insertion hélico NVG |
| 14 | SPECIAL / TEST / TRAINING | VIP, convoyage, essais, formation | vol d'essai, mission gouvernementale |

Après chaque étape : anciens CR/registres testés, nouveau testé, import/export, i18n,
persistance, `repository_tree` mis à jour (pages, dossier, thème, favicon).

---

## G. Décisions

Validées le 2026-09-23 :

1. **Pages** : deux pages minces par famille (`<famille>_cr.html` + `<famille>_reporting.html`)
   rendues par le Core, avec boutons de bascule CR ⇄ reporting.
2. **Nommage** : dossier `FIRE/` (famille « FIRE / GAAR »), `FIRE/fire_cr.html` et
   `FIRE/fire_reporting.html`, **sans redirection** depuis `GAAR/`. HEMS garde ses noms.
3. **Stockage** : registre **YAML** par famille (source de vérité) + **CSV simplifié généré**
   pour les tableurs (§E.3). Pas de colonne JSON, pas de fichier JSON utilisateur.
4. **HEMS / FIRE** : **reconstruits sur le Core** (étapes 2a/2b), anciennes données importées.

Retenues par défaut (à contester si besoin) :

5. **i18n** : libellés des familles déclarés en lignes `[fr, en, de, es]` et enregistrés dans
   le système commun `RepositoryContentI18n` (pas de second système).
6. **Contexte militaire** (CSAR, SOF, ISR) : champs limités au niveau compte rendu de
   simulation, mode générique non classifié par défaut, masquage des champs sensibles à
   l'export public.

## G. Étape 3 — aides à la saisie (2026-09-24)

- **Valeurs connues** : chaque champ texte propose les valeurs des missions enregistrées
  (famille courante + registres des autres familles en cache), les plus récentes d'abord.
  Réserves partagées : aérodromes, personnes, organismes, unités, autorités, opérations,
  points tournants, altitudes (`pool` des champs, `shared/mission_core/assist.js`).
- **Appareils** : immatriculation, indicatif, type OACI et variante se filtrent
  mutuellement ; une seule possibilité → champs vides remplis ; valeurs reprises d'un
  appareil précédent remplacées quand on en choisit un autre. Types H160 / CL2T ajoutés.
- **Équipements / capacités techniques** : repliés par défaut (appareil connu, plan de
  vol) ; groupe « Équipements plan de vol (OACI, case 10) ». Techniques employées :
  bloc replié, reprises de la dernière mission de la même série.
- **Plan de vol déposé** (`fpl.js`) : SimBrief (identifiant dans le profil pilote), IVAO
  (vol en cours), VATSIM (vol en cours ou prefile) → appareil, équipements, route, points,
  niveaux, terrains, METAR / TAF, masses et carburant prévus (champs vides uniquement).
- **Météo / soleil** : METAR analysé à la saisie ; METAR actuel (metar.vatsim.net) ; météo
  modèle à l'heure du vol (Open-Meteo) ; lever / coucher et jour / nuit calculés (heure
  locale du terrain, base mondiale des aérodromes chargée à la demande via jsDelivr).
- **En-tête** : popup famille / sous-type (CR : série de la mission ; reporting : filtre).
- **Champs par famille** : `only` / `hideFor` sur les champs communs, `hide` par famille.
- Sources impossibles depuis une page statique : aviationweather.gov (pas de CORS),
  plans de vol déposés IVAO (API authentifiée).

## H. Étape 4 — flotte DEFA et données locales (2026-09-24)

- **Flotte** : `shared/aircraft_fleet.js` généré depuis la page « Flotte virtuelle »
  (flotte.defa-virtual.fr) par `python AircraftDB/update_fleet.py Flotte.html` :
  205 appareils, 6 opérateurs (AAE, Marine nationale, ALAT, Sécurité civile, SAMU,
  Gendarmerie), type OACI, variante (Rafale B/C/M, Mirage 2000-5/B/D, A330 MRTT…), code
  tactique, numéro, indicatifs (plusieurs possibles), base d'attache. Un appareil connu
  remplit aussi la base de départ et l'organisme (opérateur). Types absents de la base OACI
  ajoutés en supplément (`aircraft.js`). Doublons de la source : F-ZBPD, F-YSBK.
- **Données locales** (`shared/browser_store.js`, menu ☰ › Données locales) : tout le
  localStorage du site (registres, brouillons, appareils, types, aérodromes, préférences,
  caches, FMS, planificateur) copié dans `defa_local_store.yaml` d'un dossier choisi ;
  sauvegarde automatique au départ de page et toutes les 5 min si le dossier est autorisé
  et que les données ont changé ; restauration / resynchronisation par fusion (la donnée
  la plus récente l'emporte, collections fusionnées entrée par entrée), aussi depuis un
  fichier ; les pages du Core relisent leur registre après restauration.
