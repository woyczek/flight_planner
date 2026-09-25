(() => {
  'use strict';
  // Mission Report Core — vocabulaires communs (§4.8, §5, §19 du cahier des charges).
  // Valeurs = codes stables (écrits dans les registres YAML) ; libellés [fr, en, de, es]
  // traduits par le système commun RepositoryContentI18n. Les codes opérationnels
  // internationaux (NVG, HOIST, EO/IR…) restent identiques, seule leur description change.
  const L = (fr, en, de, es) => [fr, en, de ?? en, es ?? en];
  const opt = (value, label) => ({ value, label });

  const aircraftCategories = [
    opt('fixed', L('Voilure fixe', 'Fixed wing', 'Starrflügler', 'Ala fija')),
    opt('rotary', L('Voilure tournante', 'Rotary wing', 'Drehflügler', 'Ala rotatoria')),
    opt('amphibious', L('Amphibie / hydravion', 'Amphibious / seaplane', 'Amphibie / Wasserflugzeug', 'Anfibio / hidroavión'))
  ];

  // Capacités combinables, regroupées ; `when` limite l'affichage au type d'appareil.
  const capabilityGroups = [
    { id: 'flight', title: L('Vol', 'Flight', 'Flug', 'Vuelo'), items: [
      opt('IFR', L('IFR', 'IFR')), opt('VFR', L('VFR', 'VFR')), opt('SVFR', L('VFR spécial', 'Special VFR', 'Sonder-VFR', 'VFR especial')),
      opt('NIGHT', L('Nuit', 'Night', 'Nacht', 'Noche')), opt('NVG', L('NVG (jumelles de vision nocturne)', 'NVG (night vision goggles)', 'NVG (Nachtsichtbrillen)', 'NVG (gafas de visión nocturna)')),
      opt('IMC', L('IMC', 'IMC')), opt('LOW_LEVEL', L('Très basse altitude', 'Low level', 'Tiefflug', 'Baja cota')),
      opt('TERRAIN_FOLLOWING', L('Suivi de terrain', 'Terrain following', 'Geländefolgeflug', 'Seguimiento del terreno')),
      opt('STOL', L('STOL (décollage/atterrissage courts)', 'STOL (short take-off and landing)', 'STOL (Kurzstart und -landung)', 'STOL (despegue y aterrizaje cortos)')),
      opt('UNPREPARED_STRIP', L('Terrain non préparé', 'Unprepared strip', 'Unbefestigte Piste', 'Pista no preparada')),
      opt('MOUNTAIN', L('Montagne', 'Mountain', 'Gebirge', 'Montaña')), opt('POLAR', L('Polaire', 'Polar', 'Polar', 'Polar'))
    ] },
    { id: 'rotary', title: L('Voilure tournante', 'Rotary wing', 'Drehflügler', 'Ala rotatoria'), when: ctx => ctx.categories.has('rotary'), items: [
      opt('HOIST', L('Treuillage (HOIST)', 'Hoist', 'Winde (HOIST)', 'Grúa (HOIST)')), opt('RAPPEL', L('Descente en rappel', 'Rappel', 'Abseilen', 'Rápel')),
      opt('FAST_ROPE', L('Corde lisse (fast rope)', 'Fast rope', 'Fast Rope', 'Cuerda rápida')), opt('SLING', L('Élingue (charge sous élingue)', 'Sling load', 'Außenlast', 'Carga en eslinga')),
      opt('HOVER_EXIT', L('Sortie en stationnaire', 'Hover exit', 'Ausstieg im Schwebeflug', 'Salida en estacionario')),
      opt('SHIPBOARD', L('Appontage', 'Shipboard operations', 'Bordbetrieb', 'Operaciones embarcadas')),
      opt('CONFINED_AREA', L('Zone exiguë', 'Confined area', 'Beengter Landeplatz', 'Zona confinada'))
    ] },
    { id: 'fixed', title: L('Voilure fixe', 'Fixed wing', 'Starrflügler', 'Ala fija'), when: ctx => ctx.categories.has('fixed') || ctx.categories.has('amphibious'), items: [
      opt('PARADROP', L('Largage de personnel', 'Personnel paradrop', 'Personenabsetzen', 'Lanzamiento de personal')),
      opt('AIRDROP', L('Largage de matériel', 'Cargo airdrop', 'Lastenabwurf', 'Lanzamiento de carga')),
      opt('LAPES', L('LAPES (extraction à très basse altitude)', 'LAPES (low-altitude extraction)', 'LAPES (Tiefflug-Lastenabsetzen)', 'LAPES (extracción a baja altura)')),
      opt('SHORT_FIELD', L('Piste courte', 'Short field', 'Kurzpiste', 'Pista corta')), opt('ROUGH_FIELD', L('Piste sommaire', 'Rough field', 'Behelfspiste', 'Pista irregular')),
      opt('MARITIME_LOW_LEVEL', L('Très basse altitude maritime', 'Maritime low level', 'Seetiefflug', 'Baja cota marítima'))
    ] },
    { id: 'sensors', title: L('Capteurs', 'Sensors', 'Sensoren', 'Sensores'), items: [
      opt('EO', L('EO (électro-optique)', 'EO (electro-optical)', 'EO (elektrooptisch)', 'EO (electroóptico)')), opt('IR', L('IR (infrarouge)', 'IR (infrared)', 'IR (Infrarot)', 'IR (infrarrojo)')),
      opt('EO_IR', L('Boule EO/IR', 'EO/IR turret', 'EO/IR-Turm', 'Torreta EO/IR')), opt('RADAR', L('Radar', 'Radar', 'Radar', 'Radar')),
      opt('WEATHER_RADAR', L('Radar météo', 'Weather radar', 'Wetterradar', 'Radar meteorológico')), opt('MARITIME_RADAR', L('Radar maritime', 'Maritime radar', 'Seeradar', 'Radar marítimo')),
      opt('SAR_RADAR', L('Radar à synthèse d’ouverture', 'Synthetic aperture radar', 'Radar mit synthetischer Apertur', 'Radar de apertura sintética')),
      opt('AIS', L('AIS', 'AIS')), opt('DF', L('Radiogoniométrie', 'Direction finding', 'Funkpeilung', 'Radiogoniometría')),
      opt('LIDAR', L('LiDAR', 'LiDAR')), opt('CAMERA', L('Caméra', 'Camera', 'Kamera', 'Cámara')),
      opt('MULTISPECTRAL', L('Multispectral', 'Multispectral', 'Multispektral', 'Multiespectral')),
      opt('MISSION_SENSOR', L('Capteur de mission (générique)', 'Mission sensor (generic)', 'Missionssensor (allgemein)', 'Sensor de misión (genérico)'))
    ] }
  ];

  // Équipements d'un appareil (ce qu'il peut faire), distincts des capacités employées
  // pendant la mission : mêmes codes, sans les techniques de vol pures.
  const equipmentGroups = [
    { id: 'avionics', title: L('Avionique / certification', 'Avionics / certification', 'Avionik / Zulassung', 'Aviónica / certificación'),
      items: capabilityGroups[0].items.filter(o => ['IFR', 'NIGHT', 'NVG'].includes(o.value)) },
    ...capabilityGroups.slice(1),
    // Équipements du plan de vol OACI (cases 10a/10b), repris d'un FPL déposé (SimBrief,
    // IVAO, VATSIM) : jamais filtrés par la famille (unfiltered).
    { id: 'fpl', unfiltered: true, title: L('Équipements plan de vol (OACI, case 10)', 'Flight plan equipment (ICAO item 10)', 'Flugplanausrüstung (ICAO Feld 10)', 'Equipos del plan de vuelo (OACI, casilla 10)'), items: [
      opt('FPL_VOR_ILS', L('VHF / VOR / ILS (S)', 'VHF / VOR / ILS (S)')), opt('FPL_DME', L('DME (D)', 'DME (D)')), opt('FPL_ADF', L('ADF (F)', 'ADF (F)')),
      opt('FPL_GNSS', L('GNSS (G)', 'GNSS (G)')), opt('FPL_PBN', L('PBN (R)', 'PBN (R)')), opt('FPL_RVSM', L('RVSM (W)', 'RVSM (W)')),
      opt('FPL_833', L('VHF 8,33 kHz (Y)', 'VHF 8.33 kHz (Y)')), opt('FPL_HF', L('HF (H)', 'HF (H)')), opt('FPL_UHF', L('UHF (U)', 'UHF (U)')),
      opt('FPL_CPDLC', L('CPDLC (J)', 'CPDLC (J)')), opt('FPL_ACARS', L('ACARS (E)', 'ACARS (E)')), opt('FPL_SATCOM', L('SATCOM (M)', 'SATCOM (M)')),
      opt('FPL_MODE_S', L('Transpondeur mode S', 'Mode S transponder', 'Mode-S-Transponder', 'Transpondedor modo S')), opt('FPL_ADSB', L('ADS-B', 'ADS-B')), opt('FPL_ADSC', L('ADS-C', 'ADS-C'))
    ] }
  ];

  // Indicatifs (forme complète ↔ forme plan de vol ↔ exploitant OPR/) : fichier de données
  // data/callsigns.js (éditable par la page Paramétrage › Bases de données).
  const callsignTable = window.MISSION_CALLSIGNS?.table || [];
  const operatorDesignators = window.MISSION_CALLSIGNS?.operators || {};

  // Index statique des familles du Core (sélecteur d'en-tête : famille / série), chemins
  // relatifs à la racine du site.
  const families = [
    ['HEMS', 'HEMS / MEDEVAC', 'HEMS/hems_core'], ['FIRE', 'FIRE / GAAR — sécurité civile', 'FIRE/fire_core'], ['SAR', 'SAR / récupération de personnel', 'SAR/sar'],
    ['AIRLIFT', 'Transport aérien / logistique', 'AIRLIFT/airlift'], ['AAR', 'Ravitaillement en vol', 'AAR/aar'], ['MARITIME', 'Surveillance maritime', 'MARITIME/maritime'], ['HADR', 'Aide humanitaire / évacuation', 'HADR/hadr'],
    ['AIRBORNE', 'Largage / aéroporté', 'AIRBORNE/airborne'], ['FI', 'Contrôle en vol', 'FLIGHTINSPECTION/fi'], ['SURVEY', 'Levés / missions scientifiques', 'SURVEY/survey'],
    ['LE', 'Police / douane / sécurité', 'LE/le'], ['ISR', 'Renseignement / reconnaissance', 'ISR/isr'], ['COMMAND', 'Commandement / guet aérien / relais', 'COMMAND/command'],
    ['SOF', 'Opérations spéciales / tactiques', 'SOF/sof'], ['SPECIAL', 'Transport spécial / essais / formation', 'SPECIAL/special']
  ].map(([id, label, base]) => ({ id, label, cr: `${base}_cr.html`, reporting: `${base}_reporting.html` }));

  // Famille de CR d'après le type d'une mission générée (SIA XML, helo-xp-mission : mission.type).
  const familyAliases = [[/^(HEMS|MEDEVAC|CASEVAC|EVASAN|SMUR)\b/, 'HEMS'], [/FIRE|GAAR|FEU|INCENDIE/, 'FIRE'], [/^(SAR|CSAR|PR)\b|RESCUE|SAUVETAGE/, 'SAR'], [/\bAAR\b|REFUEL|RAVITAILL|TANKER|AIR[- ]TO[- ]AIR/, 'AAR'], [/AIRLIFT|LOGIST|TRANSPORT|CARGO/, 'AIRLIFT'], [/MARITIME|SURMAR|PATMAR/, 'MARITIME'], [/HADR|HUMANIT|EVAC/, 'HADR'], [/AIRBORNE|AIRDROP|LARGAGE|PARA/, 'AIRBORNE'], [/^FI\b|FLIGHT ?INSPECTION|CALIBRATION/, 'FI'], [/SURVEY|SCIEN|LEV[EÉ]/, 'SURVEY'], [/^LE\b|POLICE|DOUANE|LAW/, 'LE'], [/ISR|RECON|RENSEIGN/, 'ISR'], [/COMMAND|AEW|AWACS|RELAY|RELAIS/, 'COMMAND'], [/^SOF\b|TACTI|OPS? SP[EÉ]CIALES?/, 'SOF']];
  const familyForType = type => { const t = String(type || '').toUpperCase().trim(); return families.find(f => f.id === t)?.id || familyAliases.find(([re]) => re.test(t))?.[1] || 'SPECIAL'; };

  const outcomes = [
    opt('SUCCESS', L('Succès', 'Success', 'Erfolgreich', 'Éxito')), opt('PARTIAL_SUCCESS', L('Succès partiel', 'Partial success', 'Teilweise erfolgreich', 'Éxito parcial')),
    opt('ABORTED', L('Interrompue', 'Aborted', 'Abgebrochen', 'Abortada')), opt('CANCELLED', L('Annulée', 'Cancelled', 'Storniert', 'Cancelada')),
    opt('DIVERTED', L('Déroutée', 'Diverted', 'Umgeleitet', 'Desviada')), opt('NO_CONTACT', L('Pas de contact', 'No contact', 'Kein Kontakt', 'Sin contacto')),
    opt('TARGET_NOT_FOUND', L('Objectif non trouvé', 'Target not found', 'Ziel nicht gefunden', 'Objetivo no encontrado')),
    opt('WEATHER', L('Météo', 'Weather', 'Wetter', 'Meteorología')), opt('TECHNICAL', L('Technique', 'Technical', 'Technisch', 'Técnico')),
    opt('OPERATIONAL', L('Opérationnel', 'Operational', 'Operativ', 'Operacional')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
  ];
  // Résultats qui appellent un motif d'interruption.
  const interruptedOutcomes = new Set(['PARTIAL_SUCCESS', 'ABORTED', 'CANCELLED', 'DIVERTED', 'NO_CONTACT', 'TARGET_NOT_FOUND', 'WEATHER', 'TECHNICAL', 'OPERATIONAL']);

  // Événements de la chronologie (briefing, mise en route, cales…) : créés automatiquement
  // depuis les heures du bloc Chronologie ; proposés dans toutes les familles.
  const TIMELINE_EVENTS = ['BRIEFING', 'ENGINE_START', 'OFF_BLOCK', 'MISSION_START', 'MISSION_END', 'ON_BLOCK', 'SHUTDOWN'];
  const eventTypes = [
    opt('BRIEFING', L('Briefing', 'Briefing', 'Briefing', 'Briefing')), opt('ENGINE_START', L('Mise en route', 'Engine start', 'Anlassen', 'Puesta en marcha')),
    opt('OFF_BLOCK', L('Départ des cales', 'Off-block', 'Off-Block', 'Fuera calzos')), opt('MISSION_START', L('Début mission', 'Mission start', 'Missionsbeginn', 'Inicio de misión')),
    opt('MISSION_END', L('Fin mission', 'Mission end', 'Missionsende', 'Fin de misión')), opt('ON_BLOCK', L('Arrivée aux cales', 'On-block', 'On-Block', 'En calzos')),
    opt('SHUTDOWN', L('Arrêt moteurs', 'Shutdown', 'Abstellen', 'Parada de motores')),
    opt('TAKEOFF', L('Décollage', 'Take-off', 'Start', 'Despegue')), opt('LANDING', L('Atterrissage', 'Landing', 'Landung', 'Aterrizaje')),
    opt('ON_TASK', L('Début de tâche', 'On task', 'Auftragsbeginn', 'En tarea')), opt('OFF_TASK', L('Fin de tâche', 'Off task', 'Auftragsende', 'Fin de tarea')),
    opt('CONTACT', L('Contact', 'Contact', 'Kontakt', 'Contacto')), opt('SIGHTING', L('Observation visuelle', 'Sighting', 'Sichtung', 'Avistamiento')),
    opt('PICKUP', L('Prise en charge', 'Pickup', 'Aufnahme', 'Recogida')), opt('DROP', L('Largage', 'Drop', 'Abwurf', 'Lanzamiento')),
    opt('HOIST', L('Treuillage', 'Hoist', 'Windeneinsatz', 'Izado')), opt('INSERTION', L('Insertion', 'Insertion', 'Absetzen', 'Inserción')),
    opt('EXTRACTION', L('Extraction', 'Extraction', 'Aufnahme (Extraktion)', 'Extracción')), opt('DIVERSION', L('Déroutement', 'Diversion', 'Umleitung', 'Desvío')),
    opt('REFUEL', L('Ravitaillement', 'Refuel', 'Betankung', 'Repostaje')), opt('TECHNICAL', L('Technique', 'Technical', 'Technisch', 'Técnico')),
    opt('WEATHER', L('Météo', 'Weather', 'Wetter', 'Meteorología')), opt('ABORT', L('Interruption', 'Abort', 'Abbruch', 'Interrupción')),
    opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
  ];

  // Événements communs à toutes les familles, puis événements spécialisés proposés
  // seulement aux familles concernées (pas d'insertion / extraction en GAAR…). Les
  // familles ajoutent leurs propres événements (family.events).
  const BASE_EVENTS = ['TAKEOFF', 'LANDING', 'ON_TASK', 'OFF_TASK', 'DIVERSION', 'REFUEL', 'TECHNICAL', 'WEATHER', 'ABORT', 'OTHER'];
  const eventProfiles = {
    SAR: ['CONTACT', 'SIGHTING', 'PICKUP', 'DROP', 'HOIST', 'EXTRACTION'], HEMS: ['PICKUP', 'HOIST'], FIRE: ['DROP'],
    AIRLIFT: ['PICKUP', 'DROP'], AAR: ['CONTACT'], MARITIME: ['CONTACT', 'SIGHTING', 'DROP'], HADR: ['PICKUP', 'DROP', 'HOIST'],
    AIRBORNE: ['DROP', 'INSERTION'], FI: [], SURVEY: [], LE: ['CONTACT', 'SIGHTING', 'INSERTION', 'EXTRACTION'],
    ISR: ['CONTACT', 'SIGHTING'], COMMAND: ['CONTACT'], SOF: ['CONTACT', 'PICKUP', 'DROP', 'HOIST', 'INSERTION', 'EXTRACTION'], SPECIAL: [],
    DEMO: eventTypes.map(o => o.value)
  };
  // Capacités / techniques proposées par famille (absente : toutes). Filtre aussi les
  // équipements des appareils (sauf équipements du plan de vol).
  const FLIGHT = ['IFR', 'VFR', 'SVFR', 'NIGHT', 'IMC', 'LOW_LEVEL', 'MOUNTAIN'];
  const capabilityProfiles = {
    FIRE: [...FLIGHT, 'SLING', 'SHORT_FIELD', 'ROUGH_FIELD', 'IR', 'CAMERA', 'WEATHER_RADAR'],
    HEMS: [...FLIGHT, 'NVG', 'HOIST', 'RAPPEL', 'SLING', 'HOVER_EXIT', 'SHIPBOARD', 'CONFINED_AREA', 'IR', 'EO_IR', 'WEATHER_RADAR'],
    FI: [...FLIGHT, 'MISSION_SENSOR', 'CAMERA'],
    SURVEY: [...FLIGHT, 'TERRAIN_FOLLOWING', 'POLAR', 'SHORT_FIELD', 'UNPREPARED_STRIP', 'EO', 'IR', 'EO_IR', 'RADAR', 'SAR_RADAR', 'LIDAR', 'CAMERA', 'MULTISPECTRAL', 'MISSION_SENSOR']
  };
  const eventTypesFor = familyId => { const allowed = new Set([...BASE_EVENTS, ...TIMELINE_EVENTS, ...(eventProfiles[familyId] || [])]); return eventTypes.filter(o => allowed.has(o.value)); };

  const crewRoles = [
    opt('PIC', L('Commandant de bord (PIC)', 'Aircraft commander (PIC)', 'Kommandant (PIC)', 'Comandante (PIC)')),
    opt('COPILOT', L('Copilote', 'Copilot', 'Kopilot', 'Copiloto')), opt('FLIGHT_ENGINEER', L('Mécanicien navigant', 'Flight engineer', 'Flugingenieur', 'Ingeniero de vuelo')),
    opt('NAVIGATOR', L('Navigateur', 'Navigator', 'Navigator', 'Navegante')), opt('TACCO', L('Coordinateur tactique', 'Tactical coordinator', 'Taktischer Koordinator', 'Coordinador táctico')),
    opt('SENSOR_OPERATOR', L('Opérateur capteurs', 'Sensor operator', 'Sensorbediener', 'Operador de sensores')), opt('LOADMASTER', L('Chef de soute', 'Loadmaster', 'Lademeister', 'Jefe de carga')),
    opt('CREW_CHIEF', L('Chef mécanicien', 'Crew chief', 'Crew Chief', 'Jefe de tripulación')), opt('WINCH_OPERATOR', L('Treuilliste', 'Winch operator', 'Windenbediener', 'Operador de grúa')),
    opt('RESCUE_SWIMMER', L('Nageur-sauveteur', 'Rescue swimmer', 'Rettungsschwimmer', 'Nadador de rescate')), opt('MISSION_COMMANDER', L('Chef de mission', 'Mission commander', 'Missionskommandant', 'Jefe de misión')),
    opt('JUMPMASTER', L('Largueur', 'Jumpmaster', 'Absetzer', 'Jefe de salto')), opt('DOCTOR', L('Médecin', 'Doctor', 'Arzt', 'Médico')),
    opt('NURSE', L('Infirmier', 'Nurse', 'Pflegekraft', 'Enfermero')), opt('OBSERVER', L('Observateur', 'Observer', 'Beobachter', 'Observador')),
    opt('TECHNICIAN', L('Technicien', 'Technician', 'Techniker', 'Técnico')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
  ];

  const context = [opt('EXERCISE', L('Exercice / simulation', 'Exercise / simulation', 'Übung / Simulation', 'Ejercicio / simulación')), opt('REAL', L('Opération réelle', 'Real operation', 'Realer Einsatz', 'Operación real'))];
  const classification = [
    opt('UNCLASSIFIED', L('Non classifié', 'Unclassified', 'Offen', 'No clasificado')),
    opt('RESTRICTED', L('Diffusion restreinte (simulation)', 'Restricted (simulation)', 'Eingeschränkt (Simulation)', 'Difusión limitada (simulación)'))
  ];
  const dayNight = [opt('DAY', L('Jour', 'Day', 'Tag', 'Día')), opt('NIGHT', L('Nuit', 'Night', 'Nacht', 'Noche')), opt('TWILIGHT', L('Crépuscule / aube', 'Twilight', 'Dämmerung', 'Crepúsculo'))];
  const fuelUnits = [opt('kg', L('kg', 'kg')), opt('lb', L('lb', 'lb')), opt('L', L('L', 'L')), opt('USG', L('US gal', 'US gal'))];
  const networks = [opt('', L('Hors réseau / non renseigné', 'Offline / not provided', 'Offline / nicht angegeben', 'Fuera de red / no indicado')), opt('IVAO', L('IVAO', 'IVAO')), opt('VATSIM', L('VATSIM', 'VATSIM'))];

  // Départements (indicatifs numérotés par département : DRAGON74, CHOUCAS74).
  const departments = {"01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes","06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube","11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal","16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud","2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne","25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère","30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault","35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura","40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique","45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire","50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle","55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord","60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques","65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin","69":"Rhône","70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie","74":"Haute-Savoie","75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne","78":"Yvelines","79":"Deux-Sèvres","80":"Somme","81":"Tarn","82":"Tarn-et-Garonne","83":"Var","84":"Vaucluse","85":"Vendée","86":"Vienne","87":"Haute-Vienne","88":"Vosges","89":"Yonne","90":"Territoire de Belfort","91":"Essonne","92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d'Oise","971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","976":"Mayotte"};
  window.MissionVocab = { departments, L, opt, aircraftCategories, capabilityGroups, equipmentGroups, outcomes, interruptedOutcomes, eventTypes, eventTypesFor, eventProfiles, capabilityProfiles, crewRoles, context, classification, dayNight, fuelUnits, networks, families, familyForType, callsignTable, operatorDesignators };
})();
