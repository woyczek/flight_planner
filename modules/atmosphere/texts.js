// Textes du module Atmosphère, [fr, en, de, es], français d'abord (ctx.t : {nom} remplacés, espace fine avant : ; ! ?
// en français posée par le cadre). Unités et sigles (NM, ft, hPa, °C, kt, QNH, ISA, TOC, TOD, CAPE, METAR, TAF) non traduits.
export const TX = {
  // en-tête, formulaire
  title: ['Atmosphère de la route', 'Route atmosphere', 'Atmosphäre entlang der Route', 'Atmósfera de la ruta'],
  mockup: ['Maquette', 'Mock-up', 'Entwurf', 'Maqueta'],
  demoTag: ['Démonstration — données inventées', 'Demonstration — invented data', 'Vorführung — erfundene Daten',
    'Demostración — datos inventados'
  ],
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
  summary: ['Résumé', 'Summary', 'Zusammenfassung', 'Resumen'],

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
  errNoFlight: ['Aucun vol courant pour {tri} : préparez-le dans Carburant, ou choisissez l’exemple.',
    'No current flight for {tri}: prepare it in Fuel, or choose the example.',
    'Kein aktueller Flug für {tri}: in Kraftstoff vorbereiten oder das Beispiel wählen.',
    'Ningún vuelo actual para {tri}: prepárelo en Combustible, o elija el ejemplo.'
  ],
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
  trueAlt: ['vraie', 'true', 'wahre', 'verdadera'],
  icing: ['givrage', 'icing', 'Vereisung', 'engelamiento'],
  icePossible: ['possible', 'possible', 'möglich', 'posible'],
  iceProbable: ['probable', 'probable', 'wahrscheinlich', 'probable'],
  icePossibleL: ['givrage possible', 'icing possible', 'Vereisung möglich', 'engelamiento posible'],
  iceProbableL: ['givrage probable', 'icing probable', 'Vereisung wahrscheinlich', 'engelamiento probable'],
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
  xsTitle: ['Coupe le long de la route', 'Cross-section along the route', 'Querschnitt entlang der Route',
    'Corte a lo largo de la ruta'
  ],
  xsAria: ['Coupe verticale de l’atmosphère le long de la route', 'Vertical cross-section of the atmosphere along the route',
    'Vertikaler Querschnitt der Atmosphäre entlang der Route', 'Corte vertical de la atmósfera a lo largo de la ruta'
  ],
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
  lgComputed: ['Trajectoire calculée', 'Computed trajectory', 'Berechnete Bahn', 'Trayectoria calculada'],
  lgPlanned: ['Niveaux planifiés', 'Planned levels', 'Geplante Flughöhen', 'Niveles previstos'],
  lgCloud: ['nébulosité 0 → 100 %', 'cloud cover 0 → 100 %', 'Bewölkung 0 → 100 %', 'nubosidad 0 → 100 %'],
  lgDa: ['altitude-densité − altitude pression :', 'density altitude − pressure altitude:', 'Dichtehöhe − Druckhöhe:',
    'altitud de densidad − altitud de presión:'
  ],
  lgRh: ['humidité', 'humidity', 'Feuchte', 'humedad'],
  lgIso: ['0 °C · isothermes tous les 5 °C', '0 °C · isotherms every 5 °C', '0 °C · Isothermen alle 5 °C',
    '0 °C · isotermas cada 5 °C'
  ],
  lgInv: ['inversion', 'inversion', 'Inversion', 'inversión'],
  lgCu: ['base des cumulus (estimée)', 'cumulus base (estimated)', 'Cumulusbasis (geschätzt)', 'base de los cúmulos (estimada)'],
  lgTerrain: ['relief', 'terrain', 'Gelände', 'relieve'],

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
  mapReading: ['carte : lecture de la grille…', 'map: reading the grid…', 'Karte: Raster wird gelesen…',
    'mapa: leyendo la cuadrícula…'
  ],
  mapLoad: ['carte : « Charger » pour lire la grille', 'map: "Load" to read the grid', 'Karte: „Laden“ zum Lesen des Rasters',
    'mapa: «Cargar» para leer la cuadrícula'
  ],
  mapUnreachable: ['Carte : prévision de la grille injoignable ({m}).', 'Map: grid forecast unreachable ({m}).',
    'Karte: Rastervorhersage nicht erreichbar ({m}).', 'Mapa: previsión de la cuadrícula inaccesible ({m}).'
  ],
  mapBlank: ['fond de carte injoignable : fond neutre', 'base map unreachable: plain background',
    'Grundkarte nicht erreichbar: neutraler Hintergrund', 'fondo de mapa inaccesible: fondo neutro'
  ],
  mapBlankShort: ['fond de carte injoignable', 'base map unreachable', 'Grundkarte nicht erreichbar', 'fondo de mapa inaccesible'],
  mapSub: ['{t} — passage à la tranche choisie', '{t} — passage at the chosen slice', '{t} — Überflug am gewählten Schnitt',
    '{t} — paso por el corte elegido'
  ],
  isoMsl: ['isobares au niveau de la mer (2 hPa)', 'isobars at sea level (2 hPa)', 'Isobaren auf Meereshöhe (2 hPa)',
    'isobaras al nivel del mar (2 hPa)'
  ],
  isoAlt: ['isobares à {z} ft d’altitude vraie, ≈ {l} ({s} hPa)', 'isobars at {z} ft true altitude, ≈ {l} ({s} hPa)',
    'Isobaren in {z} ft wahrer Höhe, ≈ {l} ({s} hPa)', 'isobaras a {z} ft de altitud verdadera, ≈ {l} ({s} hPa)'
  ],
  lgIso2: ['isothermes 2 °C', 'isotherms 2 °C', 'Isothermen 2 °C', 'isotermas 2 °C'],
  lgCloudSfc: ['nébulosité (la plus forte de basse, moyenne, haute)', 'cloud cover (the highest of low, mid, high)',
    'Bewölkung (die stärkste aus tief, mittel, hoch)', 'nubosidad (la mayor de baja, media, alta)'
  ],
  lgCloudAt: ['nébulosité à {l}', 'cloud cover at {l}', 'Bewölkung in {l}', 'nubosidad a {l}'],
  lgWind10: ['barbules : vent à 10 m', 'barbs: wind at 10 m', 'Fiedern: Wind in 10 m', 'barbas: viento a 10 m'],
  lgWindAt: ['barbules : vent à {l}', 'barbs: wind at {l}', 'Fiedern: Wind in {l}', 'barbas: viento a {l}'],
  lgTrajMap: ['route : température rencontrée sur la trajectoire calculée, trait épais dans les nuages, ❄ givrage',
    'route: temperature met on the computed trajectory, thick line in cloud, ❄ icing',
    'Route: Temperatur auf der berechneten Bahn, dicke Linie in Wolken, ❄ Vereisung',
    'ruta: temperatura encontrada en la trayectoria calculada, trazo grueso en nubes, ❄ engelamiento'
  ],
  mlSfc: ['Sol (niveau de la mer)', 'Ground (sea level)', 'Boden (Meereshöhe)', 'Suelo (nivel del mar)'],
  mlReq: ['Niveau demandé {l}', 'Requested level {l}', 'Angeforderte Flughöhe {l}', 'Nivel solicitado {l}'],
  mlStep: ['Palier planifié {l} (dès {id})', 'Planned step {l} (from {id})', 'Geplante Stufe {l} (ab {id})',
    'Escalón previsto {l} (desde {id})'
  ],
  mlTraj: ['Trajectoire calculée (montée, croisière, descente)', 'Computed trajectory (climb, cruise, descent)',
    'Berechnete Bahn (Steig-, Reise-, Sinkflug)', 'Trayectoria calculada (ascenso, crucero, descenso)'
  ],

  // tranche
  sliceTitle: ['Tranche verticale', 'Vertical slice', 'Vertikalschnitt', 'Corte vertical'],
  slicePrev: ['Tranche précédente', 'Previous slice', 'Vorheriger Schnitt', 'Corte anterior'],
  sliceNext: ['Tranche suivante', 'Next slice', 'Nächster Schnitt', 'Corte siguiente'],
  sdAria: ['Sondage vertical de la tranche choisie', 'Vertical sounding of the chosen slice', 'Vertikalsondierung des gewählten Schnitts',
    'Sondeo vertical del corte elegido'
  ],
  sliceHead: ['Tranche {i} / {n} — {nm} NM, {near} — {at} (passage estimé {pass})',
    'Slice {i} / {n} — {nm} NM, {near} — {at} (estimated passage {pass})',
    'Schnitt {i} / {n} — {nm} NM, {near} — {at} (geschätzter Überflug {pass})',
    'Corte {i} / {n} — {nm} NM, {near} — {at} (paso estimado {pass})'
  ],
  lgTemp: ['Température', 'Temperature', 'Temperatur', 'Temperatura'],
  lgDew: ['Point de rosée', 'Dew point', 'Taupunkt', 'Punto de rocío'],
  lgIsa: ['Atmosphère type', 'Standard atmosphere', 'Normatmosphäre', 'Atmósfera tipo'],
  lgSdCloud: ['▮ nuages · barbules : vent', '▮ cloud · barbs: wind', '▮ Wolken · Fiedern: Wind', '▮ nubes · barbas: viento'],
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
