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

  const eventTypes = [
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

  window.MissionVocab = { L, opt, aircraftCategories, capabilityGroups, outcomes, interruptedOutcomes, eventTypes, crewRoles, context, classification, dayNight, fuelUnits, networks };
})();
