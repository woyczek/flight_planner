(() => {
  'use strict';
  // Mission Report Core — blocs communs à toutes les familles (§4 du cahier des charges).
  // Déclaratifs : un bloc = titre + champs (ou collection dynamique) + règle d'affichage
  // `when(ctx)` ; ctx = { family, series, capabilities:Set, categories:Set, mission }.
  // Champs : { path, label, type: text|number|date|time|select|textarea|checkgroup,
  //            options | vocab, placeholder, full, when(ctx), minLevel }.
  // CR court (niveaux d'utilisation 1-2, v2) : `short` d'un bloc (ou de sa collection) = chemins des champs gardés, les
  // autres n'existent qu'à partir du niveau 3 ; `minLevel: 3` d'un bloc ou d'un champ = réservé aux niveaux 3-4. Rendu
  // par form.js en data-min-level ; « CR détaillé » (core.js) affiche tout sans changer le niveau.
  const V = window.MissionVocab,
    L = V.L;
  /** Définition d'un champ de bloc : chemin dans la mission, libellé [fr, en, de, es], type, options (extra). */
  const f = (path, label, type = 'text', extra = {}) => ({
    path,
    label,
    type,
    ...extra
  });
  // Spécialisation par famille (only : familles où le champ a du sens ; hideFor : familles
  // où il n'en a pas). Les familles peuvent en plus masquer des champs / blocs (hide).
  const CIVIL = ['HEMS', 'FIRE', 'HADR', 'AIRLIFT', 'SURVEY', 'FI'];
  const ON_STATION = ['SAR', 'MARITIME', 'ISR', 'COMMAND', 'LE', 'FIRE', 'SURVEY', 'FI', 'HADR', 'SOF', 'AIRBORNE', 'AAR', 'COMBAT',
    'DEMO'
  ];

  const identification = {
    id: 'identification',
    title: L('Identification & organisation', 'Identification & organisation', 'Identifikation & Organisation',
      'Identificación y organización'),
    icon: 'hash',
    subtitle: L('Numéros, date, série, exercice ou opération réelle, organisation.',
      'Numbers, date, series, exercise or real operation, organisation.', 'Nummern, Datum, Serie, Übung oder Einsatz, Organisation.',
      'Números, fecha, serie, ejercicio u operación real, organización.'),
    // CR court : mission, n° de CR, date et série ; numéros, heures, contexte et organisation au niveau 3.
    short: ['metadata.missionNumber', 'metadata.missionId', 'metadata.date', 'series'],
    fields: [
      // Mission volée (identifiant du registre des missions : M-016, S-002A) → n° de CR calculé (MissionVocab.crId) :
      // CRM-016-1 (essai 1, CRM-016-2 si rejouée) ; sans mission : CR libre de la famille, CRM-A01-0.
      f('metadata.missionNumber', L('Mission (identifiant)', 'Mission (identifier)', 'Einsatz (Kennung)', 'Misión (identificador)'),
        'text', {
          upper: true,
          placeholder: L('M-016, S-002A… — vide : CR sans mission', 'M-016, S-002A… — empty: report without mission',
            'M-016, S-002A… — leer: Bericht ohne Einsatz', 'M-016, S-002A… — vacío: informe sin misión')
        }),
      f('metadata.missionId', L('N° de CR', 'Report no.', 'Bericht-Nr.', 'N.º de informe'), 'text', {
        upper: true,
        alias: 'missionId',
        readonly: L(
          'Calculé : CR + mission + n° d’essai (CRM-016-1, CRM-016-2 si rejouée) ; sans mission : CRM-A01-0 (A01 à A99, puis B01)',
          'Computed: CR + mission + attempt (CRM-016-1, CRM-016-2 if replayed); without mission: CRM-A01-0 (A01 to A99, then B01)',
          'Berechnet: CR + Einsatz + Versuch (CRM-016-1); ohne Einsatz: CRM-A01-0',
          'Calculado: CR + misión + intento (CRM-016-1); sin misión: CRM-A01-0')
      }),
      f('metadata.serial', L('N° de série', 'Serial number', 'Seriennummer', 'Número de serie'), 'text', {
        hideFor: ['HEMS', 'FIRE', 'SAR', 'HADR', 'MARITIME', 'LE']
      }),
      f('series', L('Série', 'Series', 'Serie', 'Serie'), 'select', {
        familySeries: true
      }),
      f('subtype', L('Sous-type', 'Sub-type', 'Untertyp', 'Subtipo'), 'text', {
        familySubtypes: true
      }),
      f('metadata.date', L('Date', 'Date', 'Datum', 'Fecha'), 'date', {
        alias: 'date'
      }),
      f('metadata.timeLocal', L('Heure locale', 'Local time', 'Ortszeit', 'Hora local'), 'time'),
      f('metadata.timeUtc', L('Heure UTC', 'UTC time', 'UTC-Zeit', 'Hora UTC'), 'time'),
      f('metadata.context', L('Exercice / opération réelle', 'Exercise / real operation', 'Übung / realer Einsatz',
        'Ejercicio / operación real'), 'select', {
        options: V.context
      }),
      f('metadata.operationName', L('Nom de l’exercice / opération', 'Exercise / operation name', 'Name der Übung / Operation',
        'Nombre del ejercicio / operación'), 'text', {
        pool: 'operation'
      }),
      f('metadata.classification', L('Classification', 'Classification', 'Einstufung', 'Clasificación'), 'select', {
        options: V.classification,
        hideFor: CIVIL
      }),
      f('metadata.orderRef', L('Référence ordre de mission', 'Tasking order reference', 'Auftragsreferenz', 'Referencia de la orden'),
        'text', {
          hideFor: ['HEMS']
        }),
      f('organisation.organisation', L('Organisme', 'Organisation', 'Organisation', 'Organismo'), 'text', {
        pool: 'organisation'
      }),
      f('organisation.unit', L('Unité', 'Unit', 'Einheit', 'Unidad'), 'text', {
        pool: 'unit'
      }),
      f('organisation.detachment', L('Détachement', 'Detachment', 'Abteilung', 'Destacamento'), 'text', {
        pool: 'unit',
        hideFor: ['HEMS', 'SURVEY', 'FI']
      }),
      f('organisation.requestingAuthority', L('Autorité demandeuse', 'Requesting authority', 'Anfordernde Stelle',
        'Autoridad solicitante'), 'text', {
        pool: 'authority'
      }),
      f('organisation.controllingAuthority', L('Autorité de contrôle', 'Controlling authority', 'Führende Stelle',
        'Autoridad de control'), 'text', {
        pool: 'authority',
        hideFor: ['HEMS', 'SURVEY', 'FI']
      })
    ]
  };

  const aircraft = {
    id: 'aircraft',
    title: L('Appareil(s)', 'Aircraft', 'Luftfahrzeug(e)', 'Aeronave(s)'),
    icon: 'plane',
    subtitle: L('Appareils engagés : type, immatriculation, indicatif.', 'Aircraft involved: type, registration, callsign.',
      'Eingesetzte Luftfahrzeuge: Muster, Kennzeichen, Rufzeichen.', 'Aeronaves empleadas: tipo, matrícula, indicativo.'),
    collection: {
      path: 'aircraft',
      min: 1,
      layout: 'cards', // nombreux champs : une carte par appareil
      // Fiche de l'appareil (statut, activité, performances) depuis le CR.
      link: item => item.registration ? {
        href: new URL(`appareil.html?reg=${encodeURIComponent(item.registration)}`, window.MissionLedger?.APP || location.href).href,
        label: L('Fiche appareil ↗', 'Aircraft sheet ↗', 'Luftfahrzeugblatt ↗', 'Ficha de aeronave ↗')
      } : null,
      item: L('Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'),
      // CR court : immatriculation, type, indicatif et terrains (l'appareil connu remplit le reste) ; terrain
      // d'atterrissage réel gardé (CR issu d'un ordre de mission : position de l'appareil).
      short: ['registration', 'type', 'callsign', 'baseDeparture', 'baseReturn', 'landingAd'],
      add: L('+ Ajouter un appareil', '+ Add aircraft', '+ Luftfahrzeug hinzufügen', '+ Añadir aeronave'),
      empty: () => window.MissionModel.emptyAircraft(),
      // Appareil mal identifié (mauvais type, mauvaise immatriculation…) : tout effacer pour
      // relancer la recherche parmi les appareils connus.
      clear: {
        label: L('⟲ Effacer', '⟲ Clear', '⟲ Leeren', '⟲ Borrar'),
        title: L('Effacer cet appareil (immatriculation, type, indicatif…) et relancer la recherche',
          'Clear this aircraft (registration, type, callsign…) and restart the search',
          'Dieses Luftfahrzeug leeren (Kennzeichen, Muster, Rufzeichen…) und die Suche neu starten',
          'Borrar esta aeronave (matrícula, tipo, indicativo…) y reiniciar la búsqueda')
      },
      fields: [
        // Immatriculation en premier : un appareil connu remplit type, catégorie, indicatif,
        // équipements… (shared/mission_core/aircraft.js, la donnée la plus récente l'emporte).
        // Immatriculation, indicatif, type et variante se filtrent mutuellement (valeurs
        // proposées cohérentes, remplissage quand il ne reste qu'une possibilité).
        f('registration', L('Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'), 'text', {
          upper: true,
          alias: 'registration',
          placeholder: L('F-ZBQU… (appareils connus proposés)', 'F-ZBQU… (known aircraft suggested)',
            'F-ZBQU… (bekannte Luftfahrzeuge)', 'F-ZBQU… (aeronaves conocidas)')
        }),
        f('type', L('Type (OACI)', 'Type (ICAO)', 'Muster (ICAO)', 'Tipo (OACI)'), 'text', {
          upper: true,
          alias: 'aircraft',
          placeholder: L('EC45, CN35, C130…', 'EC45, CN35, C130…')
        }),
        // Indicatif radio = indicatif de la série (DRAGON, PELICAN…) + numéro ; l'indicatif
        // complet reste modifiable (champ libre) et se décompose à la saisie.
        f('callsignPrefix', L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'), 'text', {
          upper: true,
          placeholder: L('DRAGON, PELICAN, SAMU…', 'DRAGON, PELICAN, SAMU…'),
          report: false
        }),
        f('callsignNumber', L('Numéro', 'Number', 'Nummer', 'Número'), 'text', {
          upper: true,
          placeholder: L('76, 41, 74-1…', '76, 41, 74-1…'),
          report: false
        }),
        f('callsign', L('Indicatif complet', 'Full callsign', 'Vollständiges Rufzeichen', 'Indicativo completo'), 'text', {
          upper: true,
          alias: 'callsign'
        }),
        // Forme plan de vol : 7 caractères au plus (OACI), abrégée si besoin (DRAGON76 → DRAGO76).
        f('callsignFpl', L('Indicatif plan de vol (7 car. max)', 'Flight plan callsign (7 chars max)',
          'Flugplan-Rufzeichen (max. 7 Zeichen)', 'Indicativo plan de vuelo (máx. 7 car.)'), 'text', {
          upper: true,
          alias: 'callsignFpl',
          report: false
        }),
        // Désignateur OACI de l'exploitant (OPR/ de la case 18) : FRU, FAF, FGN…
        f('operatorCode', L('Exploitant OACI (OPR/, case 18)', 'ICAO operator (OPR/, item 18)', 'ICAO-Betreiber (OPR/, Feld 18)',
          'Operador OACI (OPR/, casilla 18)'), 'text', {
          upper: true,
          placeholder: L('FRU, FAF, FGN…', 'FRU, FAF, FGN…'),
          report: false
        }),
        f('category', L('Catégorie', 'Category', 'Kategorie', 'Categoría'), 'select', {
          options: V.aircraftCategories,
          blank: true,
          rerender: true
        }),
        f('variant', L('Variante / modèle', 'Variant / model', 'Variante / Modell', 'Variante / modelo')),
        f('tacticalNumber', L('Numéro tactique', 'Tactical number', 'Taktische Nummer', 'Número táctico'), 'text', {
          hideFor: ['HEMS', 'FI', 'SURVEY']
        }),
        f('baseDeparture', L('Base de départ', 'Departure base', 'Startbasis', 'Base de salida'), 'text', {
          upper: true,
          alias: 'baseDeparture',
          pool: 'aerodrome'
        }),
        f('baseReturn', L('Base de retour', 'Return base', 'Rückkehrbasis', 'Base de regreso'), 'text', {
          upper: true,
          pool: 'aerodrome'
        }),
        // terrain réellement atteint, jamais prérempli : un CR issu d'un ordre de mission y place l'appareil
        f('landingAd', L('Terrain d’atterrissage réel (OACI)', 'Actual landing aerodrome (ICAO)',
          'Tatsächlicher Landeflugplatz (ICAO)', 'Aeródromo de aterrizaje real (OACI)'), 'text', {
          upper: true,
          pool: 'aerodrome'
        }),
        f('massTakeoff', L('Masse au décollage (kg)', 'Take-off mass (kg)', 'Startmasse (kg)', 'Masa al despegue (kg)'), 'number'),
        f('massLanding', L('Masse à l’atterrissage (kg)', 'Landing mass (kg)', 'Landemasse (kg)', 'Masa al aterrizaje (kg)'),
          'number', {
            hideFor: ['HEMS']
          }),
        f('enduranceMinutes', L('Endurance disponible (min)', 'Available endurance (min)', 'Verfügbare Flugdauer (min)',
          'Autonomía disponible (min)'), 'number'),
        f('configuration', L('Configuration mission', 'Mission configuration', 'Missionskonfiguration', 'Configuración de misión')),
        f('equipment', L('Équipements / capacités techniques de l’appareil (repris de l’appareil connu ou du plan de vol)',
          'Aircraft equipment / technical capabilities (from the known aircraft or the flight plan)',
          'Ausrüstung / technische Fähigkeiten (vom bekannten Luftfahrzeug oder Flugplan)',
          'Equipamiento / capacidades técnicas (de la aeronave conocida o del plan de vuelo)'), 'checkgroup', {
          groups: V.equipmentGroups,
          full: true,
          byCategory: true,
          collapsed: true
        })
      ]
    }
  };

  const crew = {
    id: 'crew',
    title: L('Équipage', 'Crew', 'Besatzung', 'Tripulación'),
    icon: 'users',
    subtitle: L('Membres d’équipage et leurs fonctions.', 'Crew members and their roles.', 'Besatzungsmitglieder und ihre Funktionen.',
      'Miembros de la tripulación y sus funciones.'),
    collection: {
      path: 'crew',
      min: 1,
      item: L('Membre d’équipage', 'Crew member', 'Besatzungsmitglied', 'Tripulante'),
      add: L('+ Ajouter un membre', '+ Add crew member', '+ Mitglied hinzufügen', '+ Añadir tripulante'),
      empty: () => ({
        role: '',
        name: '',
        aircraft: 1,
        notes: ''
      }),
      fields: [
        f('role', L('Rôle', 'Role', 'Rolle', 'Función'), 'select', {
          crewRoles: true,
          blank: true
        }),
        f('name', L('Nom / indicatif', 'Name / callsign', 'Name / Rufzeichen', 'Nombre / indicativo'), 'text', {
          pool: 'person'
        }),
        f('aircraft', L('Appareil n°', 'Aircraft no.', 'Luftfahrzeug Nr.', 'Aeronave n.º'), 'number'),
        f('notes', L('Remarque', 'Note', 'Bemerkung', 'Observación'))
      ]
    }
  };

  const tasking = {
    id: 'tasking',
    minLevel: 3, // CR détaillé (niveaux 3-4)
    title: L('Tâche / ordre de mission', 'Tasking', 'Auftrag', 'Tarea / orden de misión'),
    icon: 'clipboard',
    subtitle: L('Objectif et consignes de la mission.', 'Mission objective and instructions.', 'Auftrag und Anweisungen der Mission.',
      'Objetivo e instrucciones de la misión.'),
    fields: [
      f('tasking.objective', L('Objectif', 'Objective', 'Ziel', 'Objetivo'), 'textarea', {
        full: true
      }),
      f('tasking.instructions', L('Instructions particulières', 'Special instructions', 'Besondere Anweisungen',
        'Instrucciones particulares'), 'textarea', {
        full: true
      }),
      f('tasking.priority', L('Priorité', 'Priority', 'Priorität', 'Prioridad'))
    ]
  };

  const capabilities = {
    id: 'capabilities',
    minLevel: 3, // CR détaillé (niveaux 3-4)
    title: L('Capacités / techniques employées', 'Capabilities / techniques', 'Fähigkeiten / Verfahren', 'Capacidades / técnicas'),
    icon: 'wrench',
    subtitle: L('Techniques et moyens employés en vol.', 'Techniques and means used in flight.',
      'Im Flug eingesetzte Verfahren und Mittel.', 'Técnicas y medios empleados en vuelo.'),
    // Masqué par défaut (framework) : repris de la dernière mission de la même série à la
    // création d'une mission, à ne renseigner qu'une fois.
    defaultHidden: true,
    fields: [f('capabilities', null, 'checkgroup', {
      groups: V.capabilityGroups,
      full: true
    })]
  };

  const environment = {
    id: 'environment',
    minLevel: 3, // CR détaillé (niveaux 3-4)
    title: L('Environnement / météo', 'Environment / weather', 'Umgebung / Wetter', 'Entorno / meteorología'),
    icon: 'globe',
    subtitle: L('Conditions météo et d’environnement rencontrées.', 'Weather and environmental conditions met.',
      'Angetroffene Wetter- und Umgebungsbedingungen.', 'Condiciones meteorológicas y del entorno.'),
    fields: [
      f('environment.metar', L('METAR (analysé à la saisie : vent, T°, QNH, visibilité, plafond)',
        'METAR (parsed on entry: wind, temp, QNH, visibility, ceiling)',
        'METAR (beim Eingeben ausgewertet: Wind, Temp., QNH, Sicht, Wolkenuntergrenze)',
        'METAR (analizado al introducirlo: viento, T.ª, QNH, visibilidad, techo)'), 'text', {
        full: true,
        upper: true
      }),
      f('environment.taf', L('TAF', 'TAF'), 'text', {
        full: true,
        upper: true
      }),
      f('environment.wind', L('Vent', 'Wind', 'Wind', 'Viento')),
      f('environment.temperature', L('Température (°C)', 'Temperature (°C)', 'Temperatur (°C)', 'Temperatura (°C)'), 'number'),
      f('environment.qnh', L('QNH (hPa)', 'QNH (hPa)'), 'number'),
      // Altitude densité au terrain de départ : calculée (altitude du terrain, QNH, température).
      f('environment.densityAltitude', L('Altitude densité (ft)', 'Density altitude (ft)', 'Dichtehöhe (ft)',
        'Altitud densidad (ft)'), 'number'),
      f('environment.visibility', L('Visibilité', 'Visibility', 'Sicht', 'Visibilidad')),
      f('environment.ceiling', L('Plafond', 'Ceiling', 'Wolkenuntergrenze', 'Techo')),
      f('environment.precipitation', L('Précipitations', 'Precipitation', 'Niederschlag', 'Precipitación')),
      f('environment.turbulence', L('Turbulence', 'Turbulence', 'Turbulenz', 'Turbulencia')),
      f('environment.icing', L('Givrage', 'Icing', 'Vereisung', 'Engelamiento')),
      // État de mer : seulement quand il est pertinent (famille maritime, appontage, très basse altitude maritime).
      f('environment.seaState', L('État de mer', 'Sea state', 'Seegang', 'Estado del mar'), 'text', {
        when: ctx => ctx.flags.maritime || ctx.capabilities.has('SHIPBOARD') || ctx.capabilities.has('MARITIME_LOW_LEVEL') || ctx
          .categories.has('amphibious')
      }),
      f('environment.dayNight', L('Phase jour / nuit', 'Day / night', 'Tag / Nacht', 'Día / noche'), 'select', {
        options: V.dayNight,
        blank: true
      }),
      f('environment.illumination', L('Illumination (lune…)', 'Illumination (moon…)', 'Beleuchtung (Mond…)', 'Iluminación (luna…)'),
        'text', {
          when: ctx => ctx.capabilities.has('NVG') || ctx.capabilities.has('NIGHT') || ctx.mission.environment?.dayNight === 'NIGHT'
        }),
      f('environment.sunrise', L('Lever du soleil', 'Sunrise', 'Sonnenaufgang', 'Salida del sol'), 'time'),
      f('environment.sunset', L('Coucher du soleil', 'Sunset', 'Sonnenuntergang', 'Puesta del sol'), 'time')
    ]
  };

  const navigation = {
    id: 'navigation',
    minLevel: 3, // CR détaillé (niveaux 3-4)
    title: L('Navigation', 'Navigation', 'Navigation', 'Navegación'),
    icon: 'map',
    subtitle: L('Terrains, route, points et zone de travail.', 'Airfields, route, points and working area.',
      'Flugplätze, Route, Punkte und Einsatzgebiet.', 'Aeródromos, ruta, puntos y zona de trabajo.'),
    fields: [
      f('navigation.dep', L('Départ (ADEP)', 'Departure (ADEP)', 'Abflug (ADEP)', 'Salida (ADEP)'), 'text', {
        upper: true,
        pool: 'aerodrome'
      }),
      f('navigation.arr', L('Destination (ADES)', 'Destination (ADES)', 'Ziel (ADES)', 'Destino (ADES)'), 'text', {
        upper: true,
        alias: 'destination',
        pool: 'aerodrome'
      }),
      f('navigation.altn', L('Dégagement (ALTN)', 'Alternate (ALTN)', 'Ausweichflugplatz (ALTN)', 'Alternativo (ALTN)'), 'text', {
        upper: true,
        pool: 'aerodrome'
      }),
      f('navigation.route', L('Route', 'Route', 'Route', 'Ruta'), 'text', {
        full: true,
        upper: true
      }),
      f('navigation.waypoints', L('Points tournants (un par ligne)', 'Waypoints (one per line)', 'Wegpunkte (einer pro Zeile)',
        'Puntos de ruta (uno por línea)'), 'textarea', {
        full: true,
        upper: true,
        appendList: true,
        pool: 'waypoint'
      }),
      f('navigation.coordinates', L('Coordonnées', 'Coordinates', 'Koordinaten', 'Coordenadas'), 'text', {
        hideFor: ['HEMS']
      }),
      f('navigation.altitude', L('Altitude / FL', 'Altitude / FL', 'Höhe / FL', 'Altitud / FL'), 'text', {
        upper: true,
        pool: 'altitude'
      }),
      f('navigation.minAltitude', L('Altitude minimale', 'Minimum altitude', 'Mindesthöhe', 'Altitud mínima'), 'text', {
        upper: true,
        pool: 'altitude'
      }),
      f('navigation.speed', L('Vitesse (kt)', 'Speed (kt)', 'Geschwindigkeit (kt)', 'Velocidad (kt)'), 'number'),
      f('navigation.distanceNm', L('Distance (NM)', 'Distance (NM)', 'Entfernung (NM)', 'Distancia (NM)'), 'number'),
      f('navigation.area', L('Zone d’opération', 'Operating area', 'Einsatzgebiet', 'Zona de operación'), 'text', {
        pool: 'area'
      }),
      f('navigation.radiusNm', L('Rayon (NM)', 'Radius (NM)', 'Radius (NM)', 'Radio (NM)'), 'number', {
        only: ['SAR', 'MARITIME', 'ISR', 'HADR', 'SURVEY', 'LE', 'COMMAND', 'DEMO']
      }),
      f('navigation.corridor', L('Corridor', 'Corridor', 'Korridor', 'Corredor'), 'text', {
        only: ['ISR', 'COMMAND', 'SOF', 'AIRBORNE', 'AIRLIFT', 'AAR', 'FI', 'SURVEY', 'LE', 'DEMO']
      }),
      f('navigation.orbit', L('Attente / orbite', 'Holding / orbit', 'Warteschleife / Orbit', 'Espera / órbita'), 'text', {
        only: ['AAR', 'ISR', 'COMMAND', 'MARITIME', 'SAR', 'LE', 'FI', 'SURVEY', 'SOF', 'DEMO']
      })
    ]
  };

  const timeline = {
    id: 'timeline',
    title: L('Chronologie', 'Timeline', 'Zeitablauf', 'Cronología'),
    icon: 'calendar',
    subtitle: L('Heures clés du vol, du bloc au bloc.', 'Key times of the flight, block to block.',
      'Wichtige Zeiten des Flugs, Block bis Block.', 'Horas clave del vuelo, de calzos a calzos.'),
    // CR court : mise en route, décollage, atterrissage, arrêt (temps bloc calculé de la mise en route à l'arrêt).
    short: ['timeline.engineStart', 'timeline.takeoff', 'timeline.landing', 'timeline.shutdown'],
    fields: [
      f('timeline.briefing', L('Briefing', 'Briefing', 'Briefing', 'Briefing'), 'time'),
      f('timeline.engineStart', L('Mise en route', 'Engine start', 'Anlassen', 'Puesta en marcha'), 'time', {
        alias: 'engineStart'
      }),
      f('timeline.offBlock', L('Départ des cales', 'Off-block', 'Off-Block', 'Fuera calzos'), 'time'),
      f('timeline.takeoff', L('Décollage', 'Take-off', 'Start', 'Despegue'), 'time', {
        alias: 'takeoff'
      }),
      f('timeline.zoneEntry', L('Entrée zone', 'Zone entry', 'Einflug Gebiet', 'Entrada en zona'), 'time'),
      f('timeline.missionStart', L('Début mission', 'Mission start', 'Missionsbeginn', 'Inicio de misión'), 'time'),
      f('timeline.missionEnd', L('Fin mission', 'Mission end', 'Missionsende', 'Fin de misión'), 'time'),
      f('timeline.zoneExit', L('Sortie zone', 'Zone exit', 'Ausflug Gebiet', 'Salida de zona'), 'time'),
      f('timeline.landing', L('Atterrissage', 'Landing', 'Landung', 'Aterrizaje'), 'time', {
        alias: 'landing'
      }),
      f('timeline.onBlock', L('Arrivée aux cales', 'On-block', 'On-Block', 'En calzos'), 'time'),
      f('timeline.shutdown', L('Arrêt moteurs', 'Shutdown', 'Abstellen', 'Parada de motores'), 'time', {
        alias: 'engineStop'
      })
    ]
  };

  const fuel = {
    id: 'fuel',
    title: L('Carburant (appareil principal)', 'Fuel (lead aircraft)', 'Kraftstoff (Führungsluftfahrzeug)',
      'Combustible (aeronave principal)'),
    icon: 'fuel',
    subtitle: L('Carburant embarqué, consommé et restant.', 'Fuel on board, used and remaining.',
      'Getankter, verbrauchter und verbleibender Kraftstoff.', 'Combustible embarcado, consumido y restante.'),
    // CR court : unité, départ et atterrissage (carburant consommé calculé).
    short: ['fuel.unit', 'fuel.start', 'fuel.landing'],
    fields: [
      f('fuel.unit', L('Unité', 'Unit', 'Einheit', 'Unidad'), 'select', {
        options: V.fuelUnits
      }),
      f('fuel.start', L('FOB départ', 'FOB start', 'FOB Start', 'FOB inicial'), 'number'),
      f('fuel.taxi', L('Roulage', 'Taxi', 'Rollen', 'Rodaje'), 'number'),
      f('fuel.takeoff', L('Au décollage', 'At take-off', 'Beim Start', 'Al despegue'), 'number'),
      f('fuel.onTaskArrival', L('Arrivée sur zone', 'Arrival on task', 'Ankunft im Einsatz', 'Llegada a la tarea'), 'number', {
        only: ON_STATION
      }),
      f('fuel.onStation', L('Carburant sur zone', 'Fuel on station', 'Kraftstoff im Einsatzraum', 'Combustible en zona'), 'number', {
        only: ON_STATION
      }),
      f('fuel.taskDeparture', L('Départ de zone', 'Task departure', 'Verlassen des Einsatzes', 'Salida de la tarea'), 'number', {
        only: ON_STATION
      }),
      f('fuel.landing', L('À l’atterrissage', 'At landing', 'Bei der Landung', 'Al aterrizaje'), 'number'),
      f('fuel.block', L('Aux cales', 'At block-in', 'Bei On-Block', 'En calzos'), 'number'),
      f('fuel.reserve', L('Réserve', 'Reserve', 'Reserve', 'Reserva'), 'number'),
      f('fuel.diversion', L('Carburant de dégagement', 'Diversion fuel', 'Ausweichkraftstoff', 'Combustible de alternativa'),
        'number', {
          hideFor: ['HEMS']
        })
    ]
  };

  const events = {
    id: 'events',
    minLevel: 3, // CR détaillé (niveaux 3-4)
    title: L('Événements horodatés', 'Timed events', 'Ereignisse mit Zeitstempel', 'Eventos con hora'),
    icon: 'pin',
    subtitle: L('Événements notables, avec leur heure.', 'Notable events, with their time.', 'Wichtige Ereignisse mit Uhrzeit.',
      'Eventos destacados, con su hora.'),
    collection: {
      path: 'events',
      min: 0,
      compact: true,
      item: L('Événement', 'Event', 'Ereignis', 'Evento'),
      add: L('+ Ajouter un événement', '+ Add event', '+ Ereignis hinzufügen', '+ Añadir evento'),
      empty: () => ({
        timeLocal: '',
        timeUtc: '',
        type: '',
        position: '',
        altitude: null,
        speed: null,
        heading: null,
        fuel: null,
        description: '',
        result: ''
      }),
      fields: [
        f('timeLocal', L('Heure locale', 'Local time', 'Ortszeit', 'Hora local'), 'time'),
        f('timeUtc', L('UTC', 'UTC'), 'time'),
        f('type', L('Type', 'Type', 'Typ', 'Tipo'), 'select', {
          eventTypes: true,
          blank: true
        }),
        f('position', L('Position', 'Position', 'Position', 'Posición'), 'text', {
          upper: true,
          pool: 'waypoint'
        }),
        f('altitude', L('Altitude', 'Altitude', 'Höhe', 'Altitud'), 'number'),
        f('speed', L('Vitesse', 'Speed', 'Geschwindigkeit', 'Velocidad'), 'number'),
        f('heading', L('Cap', 'Heading', 'Steuerkurs', 'Rumbo'), 'number'),
        f('fuel', L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'), 'number'),
        f('description', L('Description', 'Description', 'Beschreibung', 'Descripción'), 'text', {
          full: true
        }),
        f('result', L('Résultat', 'Result', 'Ergebnis', 'Resultado'))
      ]
    }
  };

  const legs = {
    id: 'legs',
    minLevel: 3, // CR détaillé (niveaux 3-4)
    title: L('Étapes / sorties / rotations', 'Legs / sorties / rotations', 'Etappen / Einsätze / Umläufe',
      'Tramos / salidas / rotaciones'),
    icon: 'layers',
    subtitle: L('Étapes, sorties et rotations du vol.', 'Legs, sorties and rotations of the flight.',
      'Etappen, Einsätze und Umläufe des Flugs.', 'Tramos, salidas y rotaciones del vuelo.'),
    collection: {
      path: 'legs',
      min: 0,
      compact: true,
      item: L('Étape', 'Leg', 'Etappe', 'Tramo'),
      add: L('+ Ajouter une étape', '+ Add leg', '+ Etappe hinzufügen', '+ Añadir tramo'),
      empty: () => ({
        from: '',
        to: '',
        takeoff: '',
        landing: '',
        pax: null,
        cargoKg: null,
        notes: ''
      }),
      fields: [
        f('from', L('De', 'From', 'Von', 'Desde'), 'text', {
          upper: true,
          pool: 'aerodrome'
        }), f('to', L('À', 'To', 'Nach', 'Hasta'), 'text', {
          upper: true,
          pool: 'aerodrome'
        }),
        f('takeoff', L('Décollage', 'Take-off', 'Start', 'Despegue'), 'time'), f('landing', L('Atterrissage', 'Landing', 'Landung',
          'Aterrizaje'), 'time'),
        f('pax', L('Passagers', 'Passengers', 'Passagiere', 'Pasajeros'), 'number'), f('cargoKg', L('Fret (kg)', 'Cargo (kg)',
          'Fracht (kg)', 'Carga (kg)'), 'number'),
        f('notes', L('Remarque', 'Note', 'Bemerkung', 'Observación'), 'text', {
          full: true
        })
      ]
    }
  };

  const results = {
    id: 'results',
    title: L('Résultat', 'Results', 'Ergebnis', 'Resultado'),
    icon: 'check',
    subtitle: L('Résultat de la mission et suites à donner.', 'Mission outcome and follow-up.',
      'Ergebnis der Mission und weiteres Vorgehen.', 'Resultado de la misión y seguimiento.'),
    fields: [
      f('results.outcome', L('Résultat', 'Outcome', 'Ergebnis', 'Resultado'), 'select', {
        options: V.outcomes,
        blank: true
      }),
      f('results.interruptionReason', L('Motif d’interruption', 'Interruption reason', 'Abbruchgrund', 'Motivo de interrupción'),
        'text', {
          when: ctx => V.interruptedOutcomes.has(ctx.mission.results?.outcome)
        }),
      // causes (plusieurs) d'une mission non effectuée ou partielle : MNE des ordres de vols (shared/odv_reports.js)
      f('results.causes', L('Causes', 'Causes', 'Ursachen', 'Causas'), 'checkgroup', {
        groups: [{
          id: 'mneCauses',
          title: L('Causes', 'Causes', 'Ursachen', 'Causas'),
          unfiltered: true,
          items: V.mneCauses
        }],
        full: true,
        when: ctx => V.interruptedOutcomes.has(ctx.mission.results?.outcome)
      }),
      f('results.detail', L('Résultat détaillé', 'Detailed result', 'Detailliertes Ergebnis', 'Resultado detallado'), 'textarea', {
        full: true
      }),
      f('results.incidents', L('Incidents', 'Incidents', 'Vorfälle', 'Incidentes'), 'textarea', {
        full: true
      }),
      f('results.anomalies', L('Anomalies techniques', 'Technical anomalies', 'Technische Störungen', 'Anomalías técnicas'),
        'textarea', {
          full: true
        })
    ]
  };

  const remarks = {
    id: 'remarks',
    title: L('Remarques', 'Remarks', 'Bemerkungen', 'Observaciones'),
    icon: 'file-text',
    subtitle: L('Observations libres, enseignements.', 'Free remarks, lessons learned.', 'Freie Bemerkungen, Erkenntnisse.',
      'Observaciones libres, enseñanzas.'),
    fields: [
      f('remarks.observations', L('Observations', 'Observations', 'Beobachtungen', 'Observaciones'), 'textarea', {
        full: true
      }),
      f('remarks.lessonsLearned', L('Enseignements (lessons learned)', 'Lessons learned', 'Erkenntnisse (Lessons Learned)',
        'Lecciones aprendidas'), 'textarea', {
        full: true
      })
    ]
  };

  const network = {
    id: 'network',
    minLevel: 3, // CR détaillé (niveaux 3-4)
    title: L('Trace réseau IVAO / VATSIM', 'IVAO / VATSIM network track', 'IVAO-/VATSIM-Netzwerkspur', 'Traza de red IVAO / VATSIM'),
    icon: 'send',
    subtitle: L('Trace du vol sur IVAO ou VATSIM.', 'Flight track on IVAO or VATSIM.', 'Flugspur auf IVAO oder VATSIM.',
      'Traza del vuelo en IVAO o VATSIM.'),
    fields: [
      f('network.onlineNetwork', L('Réseau', 'Network', 'Netzwerk', 'Red'), 'select', {
        options: V.networks,
        alias: 'onlineNetwork'
      }),
      f('network.ivaoId', L('ID IVAO (VID)', 'IVAO ID (VID)', 'IVAO-ID (VID)', 'ID IVAO (VID)'), 'text', {
        alias: 'ivaoId'
      }),
      f('network.vatsimId', L('ID VATSIM (CID)', 'VATSIM ID (CID)', 'VATSIM-ID (CID)', 'ID VATSIM (CID)'), 'text', {
        alias: 'vatsimId'
      }),
      f('network.trackerUrl', L('URL de la trace', 'Track URL', 'URL der Spur', 'URL de la traza'), 'text', {
        full: true,
        alias: 'trackerUrl',
        keepCase: true
      })
    ]
  };

  // Ordre du formulaire ; les blocs de la famille s'insèrent avant « events » ; navigation et
  // météo (souvent remplies par le plan de vol et les sources météo) en bas de page.
  // Résultat de la mission en 2e position, sous l'identification (lecture du CR).
  const ORDER = [identification, results, aircraft, crew, tasking, capabilities, timeline, fuel, '__family__', events, legs, remarks,
    network, navigation, environment
  ];
  // Champs de texte simple des blocs communs : en majuscules (saisie, registres, migration).
  window.MissionModel.registerUpperFields(ORDER.filter(block => typeof block === 'object'));
  // Messages des contrôles de cohérence (MissionModel.checkMission), dans la langue demandée
  // (index 0 fr, 1 en, 2 de, 3 es) ; libellés des champs repris des blocs.
  const ISSUE = {
    invalid: L('heure invalide', 'invalid time', 'ungültige Uhrzeit', 'hora no válida'),
    order: L('avant', 'before', 'vor', 'antes de'),
    span: L('chronologie de plus de 20 h — vérifier les heures', 'timeline longer than 20 h — check the times',
      'Zeitablauf länger als 20 h — Uhrzeiten prüfen', 'cronología de más de 20 h — revisar las horas'),
    declared: L('durée déclarée sans heures — saisir les heures dans le CR',
      'declared duration without times — enter the times in the report',
      'angegebene Dauer ohne Uhrzeiten — Uhrzeiten im Bericht eintragen',
      'duración declarada sin horas — introducir las horas en el informe'),
    future: L('date future — un CR porte sur un vol réalisé', 'future date — a report covers a flight already flown',
      'Datum in der Zukunft — ein Bericht betrifft einen durchgeführten Flug', 'fecha futura — un informe trata de un vuelo realizado'
    ),
    dateInvalid: L('date invalide', 'invalid date', 'ungültiges Datum', 'fecha no válida'),
    fuel: L('carburant final supérieur au carburant de départ', 'final fuel above starting fuel',
      'Endkraftstoff höher als Startkraftstoff', 'combustible final superior al inicial')
  };
  /** Libellé (langue de rang i) d'un champ de la chronologie ou du carburant, pour les messages de cohérence. */
  const fieldLabel = (path, i) => {
    const field = [timeline, fuel].flatMap(b => b.fields).find(x => x.path === path);
    return field ? field.label[i] || field.label[0] : path;
  };
  /** Texte d'une anomalie de cohérence (MissionModel.checkMission) dans la langue de rang i. */
  const describeIssue = (issue, i = 0) => {
    /** Texte d'une ligne [fr, en, de, es] au rang de langue demandé. */
    const w = row => row[i] || row[0];
    if (issue.kind === 'invalid') return `${fieldLabel(issue.path, i)} « ${issue.value} » : ${w(ISSUE.invalid)}`;
    if (issue.kind === 'order') return `${fieldLabel(issue.path, i)} (${issue.value}) ${w(ISSUE.order)} ${fieldLabel(issue.before, i)} (${issue.other})`;
    if (issue.kind === 'future' || issue.kind === 'dateInvalid') return `${w(L('Date', 'Date', 'Datum', 'Fecha'))} ${issue.value} : ${w(ISSUE[issue.kind])}`;
    if (issue.kind === 'declared') return `${w(issue.measure === 'flightMinutes' ? L('Temps de vol', 'Flight time', 'Flugzeit', 'Tiempo de vuelo') : L('Temps bloc', 'Block time', 'Blockzeit', 'Tiempo calzo'))} ≈ ${Math.floor(issue.value / 60)}h${String(issue.value % 60).padStart(2, '0')} : ${w(ISSUE.declared)}`;
    if (issue.kind === 'span') return `${w(ISSUE.span)} (${Math.floor(issue.minutes / 60)}h${String(issue.minutes % 60).padStart(2, '0')})`;
    return `${w(ISSUE.fuel)} (${issue.value} > ${issue.other})`;
  };
  window.MissionBlocks = {
    ORDER,
    CIVIL,
    ON_STATION,
    identification,
    aircraft,
    crew,
    tasking,
    capabilities,
    environment,
    navigation,
    timeline,
    fuel,
    events,
    legs,
    results,
    remarks,
    network,
    describeIssue
  };
})();
