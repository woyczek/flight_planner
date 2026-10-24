// Textes du module Atmosphère, [fr, en, de, es], français d'abord (ctx.t : {nom} remplacés, espace fine avant : ; ! ?
// en français posée par le cadre). Unités et sigles (NM, ft, hPa, °C, kt, QNH, ISA, TOC, TOD, CAPE, METAR, TAF) non traduits.
export const TX = {
  // en-tête, formulaire
  demoSrc: ['démonstration hors ligne', 'offline demonstration', 'Offline-Vorführung', 'demostración sin conexión'],
  flight: ['Vol', 'Flight', 'Flug', 'Vuelo'],
  srcCurrent: ['Vol courant ({tri})', 'Current flight ({tri})', 'Aktueller Flug ({tri})', 'Vuelo actual ({tri})'],
  srcExample: ['Exemple : LFRS → LUGEN → LFML', 'Example: LFRS → LUGEN → LFML', 'Beispiel: LFRS → LUGEN → LFML',
    'Ejemplo: LFRS → LUGEN → LFML'
  ],
  srcFile: ['Fichier current_flight.json…', 'current_flight.json file…', 'Datei current_flight.json…',
    'Archivo current_flight.json…'
  ],
  srcText: ['Texte de route', 'Route text', 'Routentext', 'Texto de ruta'],
  file: ['Fichier', 'File', 'Datei', 'Archivo'],
  routeHint: ['Route (points connus de la base, ou « ID lat lon », « 4530N00030E » ; /F270 après un point = palier)',
    'Route (points known to the database, or "ID lat lon", "4530N00030E"; /F270 after a point = step)',
    'Route (Punkte aus der Datenbank, oder „ID lat lon“, „4530N00030E“; /F270 nach einem Punkt = Stufe)',
    'Ruta (puntos de la base, o «ID lat lon», «4530N00030E»; /F270 tras un punto = escalón)'
  ],
  depUtc: ['Départ (UTC)', 'Departure (UTC)', 'Abflug (UTC)', 'Salida (UTC)'],
  levelReq: ['Niveau demandé', 'Requested level', 'Angeforderte Flughöhe', 'Nivel solicitado'],
  cruiseKt: ['Croisière (kt)', 'Cruise (kt)', 'Reise (kt)', 'Crucero (kt)'],
  dataSrc: ['Données', 'Data', 'Daten', 'Datos'],
  dataLive: ['Prévision Open-Meteo', 'Open-Meteo forecast', 'Open-Meteo-Vorhersage', 'Previsión Open-Meteo'],
  dataDemo: ['Démonstration hors ligne', 'Offline demonstration', 'Offline-Vorführung', 'Demostración sin conexión'],
  gridSize: ['Carte : grille', 'Map: grid', 'Karte: Raster', 'Mapa: cuadrícula'],
  grid35: ['6 × 6 (léger)', '6 × 6 (light)', '6 × 6 (leicht)', '6 × 6 (ligera)'],
  grid48: ['8 × 6', '8 × 6', '8 × 6', '8 × 6'],
  grid96: ['12 × 8 (lourd)', '12 × 8 (heavy)', '12 × 8 (schwer)', '12 × 8 (pesada)'],
  load: ['Charger', 'Load', 'Laden', 'Cargar'],

  // vue fixe (gabarit de la Carte) : ligne d'outils, carte, bloc du bas
  srTitle: ['Atmosphère de la route', 'Route atmosphere', 'Atmosphäre entlang der Route', 'Atmósfera de la ruta'],
  demoShort: ['Démo', 'Demo', 'Demo', 'Demo'],
  infoShort: ['Détails', 'Details', 'Details', 'Detalles'],
  flightTitle: ['Vol et réglages', 'Flight and settings', 'Flug und Einstellungen', 'Vuelo y ajustes'],
  infoTitle: ['Détails : résumé, terrains, tableau', 'Details: summary, aerodromes, table',
    'Details: Übersicht, Flugplätze, Tabelle', 'Detalles: resumen, aeródromos, tabla'
  ],
  layers: ['Couches', 'Layers', 'Ebenen', 'Capas'],
  worldTitle: ['Synoptique monde · {at} · run {run} +{h} h', 'World synoptic · {at} · run {run} +{h} h',
    'Weltsynoptik · {at} · Lauf {run} +{h} h', 'Sinóptico mundial · {at} · pasada {run} +{h} h'
  ],
  worldReading: ['Synoptique monde…', 'World synoptic…', 'Weltsynoptik…', 'Sinóptico mundial…'],
  worldNone: ['Synoptique monde non publié : rien n’est demandé hors de la zone du vol',
    'World synoptic not published: nothing is asked outside the flight’s area',
    'Weltsynoptik nicht veröffentlicht: außerhalb des Fluggebiets wird nichts abgefragt',
    'Sinóptico mundial no publicado: no se pide nada fuera de la zona del vuelo'
  ],
  worldPoint: ['Synoptique · {p} · {at}', 'Synoptic · {p} · {at}', 'Synoptik · {p} · {at}', 'Sinóptico · {p} · {at}'],
  zoneFlight: ['Zone du vol · {model}', 'Flight area · {model}', 'Flugbereich · {model}', 'Zona del vuelo · {model}'],
  zoneWorld: ['Monde · {src}, maille de {step}°', 'World · {src}, {step}° grid', 'Welt · {src}, {step}°-Raster',
    'Mundo · {src}, malla de {step}°'
  ],
  worldPointNote: ['Hors de la zone du vol : synoptique mondial ({src}, run {run}, maille de {step}°), rien n’est demandé.',
    'Outside the flight’s area: world synoptic ({src}, run {run}, {step}° grid), nothing is asked.',
    'Außerhalb des Fluggebiets: Weltsynoptik ({src}, Lauf {run}, {step}°-Raster), nichts wird abgefragt.',
    'Fuera de la zona del vuelo: sinóptico mundial ({src}, pasada {run}, malla de {step}°), no se pide nada.'
  ],
  wpLayers: ['Nuages bas / moyens / hauts', 'Low / middle / high cloud', 'Tiefe / mittlere / hohe Wolken',
    'Nubes bajas / medias / altas'
  ],
  wpPr: ['Précipitations', 'Precipitation', 'Niederschlag', 'Precipitación'],
  wpVis: ['Visibilité', 'Visibility', 'Sicht', 'Visibilidad'],
  wpCape: ['Convection (CAPE)', 'Convection (CAPE)', 'Konvektion (CAPE)', 'Convección (CAPE)'],
  wpFrz: ['Isotherme 0 °C', '0 °C isotherm', '0-°C-Grenze', 'Isoterma 0 °C'],
  wpFrzSfc: ['au sol', 'at the surface', 'am Boden', 'en superficie'],
  wpTrop: ['Tropopause', 'Tropopause', 'Tropopause', 'Tropopausa'],
  wpJet: ['Vent à 250 hPa (jet)', '250 hPa wind (jet)', 'Wind in 250 hPa (Jet)', 'Viento a 250 hPa (chorro)'],
  lyJet: ['Courant-jet, 250 hPa', 'Jet stream, 250 hPa', 'Jetstream, 250 hPa', 'Corriente en chorro, 250 hPa'],
  lyConv: ['Convection, CAPE', 'Convection, CAPE', 'Konvektion, CAPE', 'Convección, CAPE'],
  wpP: ['Pression mer', 'Sea-level pressure', 'Luftdruck (Meereshöhe)', 'Presión a nivel del mar'],
  wpWind: ['Vent à 10 m', '10 m wind', 'Wind in 10 m', 'Viento a 10 m'],
  wpCloud: ['Nébulosité', 'Cloud cover', 'Bewölkung', 'Nubosidad'],
  wpT: ['Température à 2 m', '2 m temperature', 'Temperatur in 2 m', 'Temperatura a 2 m'],
  whenAria: ['Date du vol : heures ajoutées au départ prévu', 'Flight date: hours added to the planned departure',
    'Flugdatum: Stunden zum geplanten Abflug hinzu', 'Fecha del vuelo: horas añadidas a la salida prevista'
  ],
  whenPlanned: ['Départ prévu · {at}', 'Planned departure · {at}', 'Geplanter Abflug · {at}', 'Salida prevista · {at}'],
  whenPlus: ['Départ +{h} h · {at}', 'Departure +{h} h · {at}', 'Abflug +{h} h · {at}', 'Salida +{h} h · {at}'],
  tapNote: ['Touchez la carte pour voir l’atmosphère en ce point (tranche locale).',
    'Tap the map to see the atmosphere at that point (local slice).',
    'Tippen Sie auf die Karte, um die Atmosphäre an diesem Punkt zu sehen (lokaler Schnitt).',
    'Toque el mapa para ver la atmósfera en ese punto (corte local).'
  ],
  sheetSize: ['Hauteur du bloc de données : toucher ou glisser', 'Data block height: tap or drag',
    'Höhe des Datenblocks: antippen oder ziehen', 'Altura del bloque de datos: tocar o arrastrar'
  ],
  sheet0: ['réduit', 'collapsed', 'eingeklappt', 'reducido'],
  sheet1: ['normal', 'default', 'normal', 'normal'],
  sheet2: ['agrandi', 'expanded', 'erweitert', 'ampliado'],
  backProfile: ['Retour au profil global', 'Back to the overall profile', 'Zurück zum Gesamtprofil', 'Volver al perfil global'],
  profileTitle: ['Profil', 'Profile', 'Profil', 'Perfil'],
  sliceHeadShort: ['Tranche {i} / {n} · {near} · {nm} NM · {at}', 'Slice {i} / {n} · {near} · {nm} NM · {at}',
    'Schnitt {i} / {n} · {near} · {nm} NM · {at}', 'Corte {i} / {n} · {near} · {nm} NM · {at}'
  ],
  sliceHeadPoint: ['Tranche {p} · à {off} NM de la route · {at}', 'Slice {p} · {off} NM from the route · {at}',
    'Schnitt {p} · {off} NM von der Route · {at}', 'Corte {p} · a {off} NM de la ruta · {at}'
  ],
  sliceLoading: ['Lecture de la prévision à ce point…', 'Reading the forecast at this point…',
    'Vorhersage an diesem Punkt wird gelesen…', 'Leyendo la previsión en este punto…'
  ],
  lgPaths: [
    'Trajectoires : calculée (trait plein), planifiée (tirets), demandée (pointillés). Tranche : température (rouge), point de rosée (vert), atmosphère type (tirets).',
    'Paths: computed (solid), planned (dashed), requested (dotted). Slice: temperature (red), dew point (green), standard atmosphere (dashed).',
    'Bahnen: berechnet (durchgezogen), geplant (gestrichelt), angefordert (gepunktet). Schnitt: Temperatur (rot), Taupunkt (grün), Normatmosphäre (gestrichelt).',
    'Trayectorias: calculada (continua), prevista (guiones), solicitada (puntos). Corte: temperatura (rojo), punto de rocío (verde), atmósfera tipo (guiones).'
  ],

  // vol
  errTwoPoints: ['Ce vol n’a pas deux points positionnés au moins (route.points).',
    'This flight does not have at least two positioned points (route.points).',
    'Dieser Flug hat nicht mindestens zwei positionierte Punkte (route.points).',
    'Este vuelo no tiene al menos dos puntos situados (route.points).'
  ],
  errTextPoints: ['Il faut deux points au moins, connus de la base ou en coordonnées.',
    'At least two points are needed, known to the database or as coordinates.',
    'Mindestens zwei Punkte nötig, aus der Datenbank oder als Koordinaten.',
    'Se necesitan al menos dos puntos, de la base o en coordenadas.'
  ],
  skipped: ['Points inconnus écartés : {ids}.', 'Unknown points left out: {ids}.', 'Unbekannte Punkte ausgelassen: {ids}.',
    'Puntos desconocidos descartados: {ids}.'
  ],
  errFile: ['Choisissez un fichier current_flight.json.', 'Choose a current_flight.json file.',
    'Wählen Sie eine Datei current_flight.json.', 'Elija un archivo current_flight.json.'
  ],
  noFlight: ['Aucun vol prévu : préparez-le dans Carburant.', 'No planned flight: prepare it in Fuel.',
    'Kein geplanter Flug: bereiten Sie ihn in Kraftstoff vor.', 'Ningún vuelo previsto: prepárelo en Combustible.'
  ],
  goFuel: ['Préparer dans Carburant', 'Prepare in Fuel', 'In Kraftstoff vorbereiten', 'Preparar en Combustible'],
  seeExample: ['Voir l’exemple', 'See the example', 'Beispiel ansehen', 'Ver el ejemplo'],
  tagExample: ['Exemple', 'Example', 'Beispiel', 'Ejemplo'],
  tagText: ['Route saisie', 'Typed route', 'Eingegebene Route', 'Ruta escrita'],
  tagFile: ['Fichier', 'File', 'Datei', 'Archivo'],
  fromCurrent: ['vol courant {tri}', 'current flight {tri}', 'aktueller Flug {tri}', 'vuelo actual {tri}'],
  fromExample: ['exemple', 'example', 'Beispiel', 'ejemplo'],
  fromText: ['texte', 'text', 'Text', 'texto'],

  // état, chargement
  readingFlight: ['Lecture du vol…', 'Reading the flight…', 'Flug wird gelesen…', 'Leyendo el vuelo…'],
  reading: ['Open-Meteo ({m}) : route et carte…', 'Open-Meteo ({m}): route and map…', 'Open-Meteo ({m}): Route und Karte…',
    'Open-Meteo ({m}): ruta y mapa…'
  ],
  demoComputing: ['Démonstration : calcul…', 'Demonstration: computing…', 'Vorführung: Berechnung…', 'Demostración: cálculo…'],
  waitQuota: ['Quota minute d’Open-Meteo (600 / min) : reprise dans {s} s…',
    'Open-Meteo minute quota (600 / min): resuming in {s} s…', 'Open-Meteo-Minutenkontingent (600 / min): weiter in {s} s…',
    'Cuota por minuto de Open-Meteo (600 / min): se reanuda en {s} s…'
  ],
  notLoaded: [
    'Prévision non chargée : « Charger » lit ce qui manque à Open-Meteo ({m}, ≈ {n} appels du décompte au plus ; ≈ {d} sur 24 h depuis cet appareil, gratuit : 10 000 / jour), ou choisissez « Démonstration hors ligne ».',
    'Forecast not loaded: "Load" reads what is missing from Open-Meteo ({m}, ≈ {n} counted calls at most; ≈ {d} over 24 h from this device, free: 10,000 / day), or choose "Offline demonstration".',
    'Vorhersage nicht geladen: „Laden“ liest das Fehlende bei Open-Meteo ({m}, höchstens ≈ {n} gezählte Aufrufe; ≈ {d} in 24 h von diesem Gerät, kostenlos: 10 000 / Tag), oder „Offline-Vorführung“ wählen.',
    'Previsión no cargada: «Cargar» lee lo que falta en Open-Meteo ({m}, ≈ {n} llamadas contadas como máximo; ≈ {d} en 24 h desde este dispositivo, gratis: 10 000 / día), o elija «Demostración sin conexión».'
  ],
  failed: ['Échec : {m}', 'Failed: {m}', 'Fehlgeschlagen: {m}', 'Error: {m}'],
  quotaDay: [
    'quota d’Open-Meteo presque atteint sur cet appareil (≈ {n} appels sur 24 h, 10 000 au plus) : réessayez plus tard, ou choisissez « Démonstration hors ligne »',
    'Open-Meteo quota nearly reached on this device (≈ {n} calls over 24 h, 10,000 at most): try again later, or choose "Offline demonstration"',
    'Open-Meteo-Kontingent auf diesem Gerät fast erreicht (≈ {n} Aufrufe in 24 h, höchstens 10 000): später erneut versuchen oder „Offline-Vorführung“ wählen',
    'Cuota de Open-Meteo casi alcanzada en este dispositivo (≈ {n} llamadas en 24 h, 10 000 como máximo): inténtelo más tarde, o elija «Demostración sin conexión»'
  ],
  quotaIp: [
    'quota gratuit d’Open-Meteo atteint pour cette adresse IP (10 000 appels / jour, 600 / min) : réessayez plus tard, ou choisissez « Démonstration hors ligne »',
    'Open-Meteo free quota reached for this IP address (10,000 calls / day, 600 / min): try again later, or choose "Offline demonstration"',
    'Kostenloses Open-Meteo-Kontingent für diese IP-Adresse erreicht (10 000 Aufrufe / Tag, 600 / min): später erneut versuchen oder „Offline-Vorführung“ wählen',
    'Cuota gratuita de Open-Meteo alcanzada para esta dirección IP (10 000 llamadas / día, 600 / min): inténtelo más tarde, o elija «Demostración sin conexión»'
  ],
  offline: ['prévision injoignable (hors ligne) : réessayez avec le réseau, ou choisissez « Démonstration hors ligne »',
    'forecast unreachable (offline): try again with the network, or choose "Offline demonstration"',
    'Vorhersage nicht erreichbar (offline): mit Netz erneut versuchen oder „Offline-Vorführung“ wählen',
    'previsión inaccesible (sin conexión): inténtelo con red, o elija «Demostración sin conexión»'
  ],
  incomplete: ['réponse incomplète d’Open-Meteo', 'incomplete answer from Open-Meteo', 'unvollständige Antwort von Open-Meteo',
    'respuesta incompleta de Open-Meteo'
  ],
  stFlight: ['Vol : {from}', 'Flight: {from}', 'Flug: {from}', 'Vuelo: {from}'],
  altnShort: ['dégagement {id}', 'alternate {id}', 'Ausweich {id}', 'alternativo {id}'],
  written: ['écrit le {d}', 'written {d}', 'geschrieben am {d}', 'escrito el {d}'],
  stPlaces: ['Open-Meteo : {r} lieux sur la route, {g} pour la carte', 'Open-Meteo: {r} places on the route, {g} for the map',
    'Open-Meteo: {r} Orte auf der Route, {g} für die Karte', 'Open-Meteo: {r} lugares en la ruta, {g} para el mapa'
  ],
  stSpent: ['≈ {n} appels du décompte pour ce chargement', '≈ {n} counted calls for this load',
    '≈ {n} gezählte Aufrufe für dieses Laden', '≈ {n} llamadas contadas para esta carga'
  ],
  stCached: ['lu dans la réserve de l’appareil (aucun appel)', 'read from the device cache (no call)',
    'aus dem Gerätespeicher gelesen (kein Aufruf)', 'leído de la reserva del dispositivo (ninguna llamada)'
  ],
  stDay: ['≈ {n} sur 24 h depuis cet appareil (gratuit : 10 000 / jour, 600 / min)',
    '≈ {n} over 24 h from this device (free: 10,000 / day, 600 / min)',
    '≈ {n} in 24 h von diesem Gerät (kostenlos: 10 000 / Tag, 600 / min)',
    '≈ {n} en 24 h desde este dispositivo (gratis: 10 000 / día, 600 / min)'
  ],
  outOfRange: ['⚠ heure hors de la prévision : l’heure la plus proche est montrée',
    '⚠ time outside the forecast: the nearest hour is shown', '⚠ Zeit außerhalb der Vorhersage: die nächste Stunde wird gezeigt',
    '⚠ hora fuera de la previsión: se muestra la hora más cercana'
  ],

  // terrains
  noIcao: ['aucun indicatif OACI', 'no ICAO code', 'kein ICAO-Kennzeichen', 'ningún indicativo OACI'],
  demoMetars: ['METAR inventés (démonstration)', 'invented METARs (demonstration)', 'erfundene METARs (Vorführung)',
    'METAR inventados (demostración)'
  ],
  metarSrc: ['METAR : metar.vatsim.net', 'METAR: metar.vatsim.net', 'METAR: metar.vatsim.net', 'METAR: metar.vatsim.net'],
  metarNone: ['METAR injoignables', 'METARs unreachable', 'METARs nicht erreichbar', 'METAR inaccesibles'],
  tafSrc: ['TAF : avwx.rest', 'TAF: avwx.rest', 'TAF: avwx.rest', 'TAF: avwx.rest'],
  tafNoKey: ['TAF : clé avwx.rest à poser dans les Réglages', 'TAF: set the avwx.rest key in Settings',
    'TAF: avwx.rest-Schlüssel in den Einstellungen setzen', 'TAF: ponga la clave avwx.rest en Ajustes'
  ],
  tafLoad: ['TAF : « Charger » pour les lire', 'TAF: "Load" to read them', 'TAF: „Laden“ zum Lesen', 'TAF: «Cargar» para leerlos'],
  tafNone: ['TAF injoignables', 'TAFs unreachable', 'TAFs nicht erreichbar', 'TAF inaccesibles'],
  roleDep: ['départ', 'departure', 'Abflug', 'salida'],
  roleArr: ['arrivée', 'arrival', 'Ankunft', 'llegada'],
  roleAltn: ['dégagement', 'alternate', 'Ausweichflugplatz', 'alternativo'],
  noMsg: ['{role} — aucun message', '{role} — no message', '{role} — keine Meldung', '{role} — ningún mensaje'],
  at: ['à {t}', 'at {t}', 'um {t}', 'a las {t}'],
  gusts: ['rafales {kt} kt', 'gusts {kt} kt', 'Böen {kt} kt', 'rachas {kt} kt'],
  ceiling: ['plafond', 'ceiling', 'Wolkenuntergrenze', 'techo'],
  wxTitle: ['Terrains', 'Aerodromes', 'Flugplätze', 'Aeródromos'],

  // mots courts
  calm: ['calme', 'calm', 'still', 'calma'],
  wind: ['vent', 'wind', 'Wind', 'viento'],
  dew: ['rosée', 'dew point', 'Taupunkt', 'rocío'],
  rhShort: ['HR', 'RH', 'rF', 'HR'],
  clouds: ['nuages', 'cloud', 'Wolken', 'nubes'],
  da: ['altitude-densité', 'density altitude', 'Dichtehöhe', 'altitud de densidad'],
  icing: ['givrage', 'icing', 'Vereisung', 'engelamiento'],
  icePossible: ['possible', 'possible', 'möglich', 'posible'],
  iceProbable: ['probable', 'probable', 'wahrscheinlich', 'probable'],
  vis: ['visi', 'vis', 'Sicht', 'visib.'],
  precip: ['précip.', 'precip.', 'Niederschl.', 'precip.'],
  ground: ['sol', 'ground', 'Boden', 'suelo'],
  none: ['aucune', 'none', 'keine', 'ninguna'],
  estimated: ['estimée', 'estimated', 'geschätzt', 'estimada'],
  left: ['G', 'L', 'L', 'I'],
  right: ['D', 'R', 'R', 'D'],
  compHead: ['face {h} · trav. {x}', 'head {h} · cross {x}', 'Gegen {h} · quer {x}', 'cara {h} · trav. {x}'],
  compTail: ['arrière {h} · trav. {x}', 'tail {h} · cross {x}', 'Rücken {h} · quer {x}', 'cola {h} · trav. {x}'],
  phClimb: ['montée', 'climb', 'Steigflug', 'ascenso'],
  phCruise: ['croisière', 'cruise', 'Reiseflug', 'crucero'],
  phDescent: ['descente', 'descent', 'Sinkflug', 'descenso'],
  between: ['entre {a} et {b}', 'between {a} and {b}', 'zwischen {a} und {b}', 'entre {a} y {b}'],
  upTo: ['jusqu’à {l}', 'up to {l}', 'bis {l}', 'hasta {l}'],
  stepFrom: ['{l} dès {id}', '{l} from {id}', '{l} ab {id}', '{l} desde {id}'],
  noStep: ['sans palier planifié', 'no planned step', 'keine geplante Stufe', 'sin escalón previsto'],
  low: ['D', 'L', 'T', 'B'],
  high: ['A', 'H', 'H', 'A'],

  // résumé
  kDist: ['Distance', 'Distance', 'Entfernung', 'Distancia'],
  kDistN: ['{n} points · {m} min (sans vent)', '{n} points · {m} min (no wind)', '{n} Punkte · {m} min (ohne Wind)',
    '{n} puntos · {m} min (sin viento)'
  ],
  kClimb: ['Montée / descente', 'Climb / descent', 'Steig- / Sinkflug', 'Ascenso / descenso'],
  kProfile: ['profil de Carburant', 'Fuel’s profile', 'Profil aus Kraftstoff', 'perfil de Combustible'],
  kDefRates: ['taux par défaut (1 200 / 1 500 ft/min)', 'default rates (1,200 / 1,500 ft/min)', 'Standardraten (1 200 / 1 500 ft/min)',
    'tasas por defecto (1 200 / 1 500 ft/min)'
  ],
  kWind: ['Vent en croisière', 'Cruise wind', 'Wind im Reiseflug', 'Viento en crucero'],
  kHeadMean: ['face {kt} kt en moyenne', 'head {kt} kt on average', 'Gegenwind {kt} kt im Mittel', 'de cara {kt} kt de media'],
  kTailMean: ['arrière {kt} kt en moyenne', 'tail {kt} kt on average', 'Rückenwind {kt} kt im Mittel', 'de cola {kt} kt de media'],
  kIsa: ['Écart ISA en croisière', 'ISA deviation in cruise', 'ISA-Abweichung im Reiseflug', 'Desvío ISA en crucero'],
  kZero: ['Isotherme 0 °C', '0 °C isotherm', '0-°C-Isotherme', 'Isoterma 0 °C'],
  kInv: ['Inversions', 'Inversions', 'Inversionen', 'Inversiones'],
  kInvN: ['lieux avec une inversion sous le niveau', 'places with an inversion below the level', 'Orte mit Inversion unter der Flughöhe',
    'lugares con una inversión bajo el nivel'
  ],
  kIce: ['Givrage (indicatif)', 'Icing (indicative)', 'Vereisung (Richtwert)', 'Engelamiento (indicativo)'],
  kIceN: ['dont {n} NM probable', 'of which {n} NM probable', 'davon {n} NM wahrscheinlich', 'de ellos {n} NM probable'],
  kCloud: ['Dans les nuages', 'In cloud', 'In Wolken', 'En nubes'],
  kCloudN: ['nébulosité ≥ 50 % sur la trajectoire', 'cloud cover ≥ 50 % on the trajectory', 'Bewölkung ≥ 50 % auf der Bahn',
    'nubosidad ≥ 50 % en la trayectoria'
  ],
  kDa: ['Altitude-densité départ', 'Departure density altitude', 'Dichtehöhe am Abflug', 'Altitud de densidad en la salida'],
  kDaN: ['terrain {ft} ft', 'field {ft} ft', 'Platz {ft} ft', 'aeródromo {ft} ft'],

  // coupe
  xsSub: ['chaque lieu lu à l’heure de passage · {n} lieux · altitude pression',
    'each place read at the time of passage · {n} places · pressure altitude',
    'jeder Ort zur Überflugzeit gelesen · {n} Orte · Druckhöhe', 'cada lugar leído a la hora de paso · {n} lugares · altitud de presión'
  ],
  stLow: ['Nébul. basse', 'Low cloud', 'Tiefe Bew.', 'Nub. baja'],
  stMid: ['moyenne', 'mid', 'mittel', 'media'],
  stHigh: ['haute', 'high', 'hoch', 'alta'],
  stPrecip: ['Précip.', 'Precip.', 'Niederschl.', 'Precip.'],
  stVis: ['Visi < 8 km', 'Vis < 8 km', 'Sicht < 8 km', 'Visib. < 8 km'],
  tipTraj: ['trajectoire {l} ({p})', 'trajectory {l} ({p})', 'Bahn {l} ({p})', 'trayectoria {l} ({p})'],
  tipBelow: ['sous le relief (sol {l})', 'below the terrain (ground {l})', 'unter dem Gelände (Boden {l})',
    'bajo el relieve (suelo {l})'
  ],

  // couches (boutons)
  lyCloud: ['Nuages', 'Cloud', 'Wolken', 'Nubes'],
  lyIso: ['Isothermes', 'Isotherms', 'Isothermen', 'Isotermas'],
  lyInv: ['Inversions', 'Inversions', 'Inversionen', 'Inversiones'],
  lyIce: ['Givrage', 'Icing', 'Vereisung', 'Engelamiento'],
  lyWind: ['Vent', 'Wind', 'Wind', 'Viento'],
  lyCu: ['Base Cu', 'Cu base', 'Cu-Basis', 'Base Cu'],
  lyTemp: ['Température', 'Temperature', 'Temperatur', 'Temperatura'],
  lyRh: ['Humidité', 'Humidity', 'Feuchte', 'Humedad'],
  lyDa: ['Altitude-densité', 'Density altitude', 'Dichtehöhe', 'Altitud de densidad'],
  lyIsobar: ['Isobares', 'Isobars', 'Isobaren', 'Isobaras'],

  // carte
  mapTitle: ['Carte', 'Map', 'Karte', 'Mapa'],
  mapLevelAria: ['Altitude de la carte', 'Altitude of the map', 'Höhe der Karte', 'Altitud del mapa'],
  mapLoad: ['carte : « Charger » pour lire la grille', 'map: "Load" to read the grid', 'Karte: „Laden“ zum Lesen des Rasters',
    'mapa: «Cargar» para leer la cuadrícula'
  ],
  mapUnreachable: ['Carte : prévision de la grille injoignable ({m}).', 'Map: grid forecast unreachable ({m}).',
    'Karte: Rastervorhersage nicht erreichbar ({m}).', 'Mapa: previsión de la cuadrícula inaccesible ({m}).'
  ],
  isoMsl: ['isobares au niveau de la mer (2 hPa)', 'isobars at sea level (2 hPa)', 'Isobaren auf Meereshöhe (2 hPa)',
    'isobaras al nivel del mar (2 hPa)'
  ],
  isoAlt: ['isobares à {z} ft d’altitude vraie, ≈ {l} ({s} hPa)', 'isobars at {z} ft true altitude, ≈ {l} ({s} hPa)',
    'Isobaren in {z} ft wahrer Höhe, ≈ {l} ({s} hPa)', 'isobaras a {z} ft de altitud verdadera, ≈ {l} ({s} hPa)'
  ],
  mlSfc: ['Sol (niveau de la mer)', 'Ground (sea level)', 'Boden (Meereshöhe)', 'Suelo (nivel del mar)'],
  mlSfcShort: ['Sol', 'SFC', 'Boden', 'Suelo'],
  mlTrajShort: ['Traj.', 'Traj.', 'Bahn', 'Tray.'],
  mlReq: ['Niveau demandé {l}', 'Requested level {l}', 'Angeforderte Flughöhe {l}', 'Nivel solicitado {l}'],
  mlStep: ['Palier planifié {l} (dès {id})', 'Planned step {l} (from {id})', 'Geplante Stufe {l} (ab {id})',
    'Escalón previsto {l} (desde {id})'
  ],
  mlTraj: ['Trajectoire calculée (montée, croisière, descente)', 'Computed trajectory (climb, cruise, descent)',
    'Berechnete Bahn (Steig-, Reise-, Sinkflug)', 'Trayectoria calculada (ascenso, crucero, descenso)'
  ],

  // tranche
  slicePrev: ['Tranche précédente', 'Previous slice', 'Vorheriger Schnitt', 'Corte anterior'],
  sliceNext: ['Tranche suivante', 'Next slice', 'Nächster Schnitt', 'Corte siguiente'],
  rGround: ['Au sol', 'At the ground', 'Am Boden', 'En el suelo'],
  rCloud: ['Nébulosité', 'Cloud cover', 'Bewölkung', 'Nubosidad'],
  rCloudV: ['basse {l} % · moyenne {m} % · haute {h} %', 'low {l} % · mid {m} % · high {h} %', 'tief {l} % · mittel {m} % · hoch {h} %',
    'baja {l} % · media {m} % · alta {h} %'
  ],
  rCu: ['Base des cumulus', 'Cumulus base', 'Cumulusbasis', 'Base de los cúmulos'],
  rTraj: ['Trajectoire {l} ({p})', 'Trajectory {l} ({p})', 'Bahn {l} ({p})', 'Trayectoria {l} ({p})'],

  // table
  tblTitle: ['Le long de la trajectoire calculée', 'Along the computed trajectory', 'Entlang der berechneten Bahn',
    'A lo largo de la trayectoria calculada'
  ],
  tblSub: ['altitude de la trajectoire en chaque lieu de lecture ; heure de passage estimée (sans vent)',
    'altitude of the trajectory at each reading place; estimated time of passage (no wind)',
    'Höhe der Bahn an jedem Leseort; geschätzte Überflugzeit (ohne Wind)',
    'altitud de la trayectoria en cada lugar de lectura; hora de paso estimada (sin viento)'
  ],
  thPlace: ['Lieu', 'Place', 'Ort', 'Lugar'],
  thPass: ['Passage', 'Passage', 'Überflug', 'Paso'],
  thPhase: ['Phase', 'Phase', 'Phase', 'Fase'],
  thTraj: ['Trajectoire', 'Trajectory', 'Bahn', 'Trayectoria'],
  thPlanned: ['Planifié', 'Planned', 'Geplant', 'Previsto'],
  thTemp: ['Temp.', 'Temp.', 'Temp.', 'Temp.'],
  thWind: ['Vent', 'Wind', 'Wind', 'Viento'],
  thComp: ['Face / travers', 'Head / cross', 'Gegen / quer', 'Cara / través'],
  thCloud: ['Nuages', 'Cloud', 'Wolken', 'Nubes'],
  thIce: ['Givrage', 'Icing', 'Vereisung', 'Engelamiento'],
  thDa: ['Alt.-densité', 'Density alt.', 'Dichtehöhe', 'Alt. densidad'],
  thGround: ['Sol', 'Ground', 'Boden', 'Suelo'],
  thLmh: ['Nébul. B / M / H', 'Cloud L / M / H', 'Bew. T / M / H', 'Nub. B / M / A'],

  foot: [
    'Modèle par le milieu de la route (Météo-France AROME / ARPEGE, DWD ICON ou NOAA GFS par Open-Meteo), lu par cases de 0,1° (0,25° pour GFS) ; niveaux en altitude pression (atmosphère type), interpolation en logarithme de la pression ; nébulosité par niveau du modèle, ou tirée de l’humidité ; givrage et base des cumulus indicatifs. Ne remplace pas un dossier météo officiel.',
    'Model chosen by the middle of the route (Météo-France AROME / ARPEGE, DWD ICON or NOAA GFS through Open-Meteo), read by 0.1° cells (0.25° for GFS); levels in pressure altitude (standard atmosphere), interpolation in the logarithm of pressure; cloud cover by model level, or derived from humidity; icing and cumulus base indicative only. Not an official weather briefing.',
    'Modell nach der Routenmitte (Météo-France AROME / ARPEGE, DWD ICON oder NOAA GFS über Open-Meteo), in Zellen von 0,1° gelesen (0,25° für GFS); Höhen als Druckhöhe (Normatmosphäre), Interpolation im Logarithmus des Drucks; Bewölkung je Modellfläche oder aus der Feuchte; Vereisung und Cumulusbasis nur als Richtwert. Ersetzt keine amtliche Wetterberatung.',
    'Modelo según el centro de la ruta (Météo-France AROME / ARPEGE, DWD ICON o NOAA GFS por Open-Meteo), leído por celdas de 0,1° (0,25° para GFS); niveles en altitud de presión (atmósfera tipo), interpolación en el logaritmo de la presión; nubosidad por nivel del modelo, o deducida de la humedad; engelamiento y base de cúmulos solo indicativos. No sustituye un dossier meteorológico oficial.'
  ]
};
