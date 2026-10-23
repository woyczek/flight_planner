// V3 fuel — module Carburant et niveau de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ;
// modules/fuel/SPEC.md, INTEGRATION.md). Deux écrans dans le module :
//   · Préparer : cinq blocs visibles sur téléphone (appareil, route, niveau et vent, décision du niveau, résultat
//     collant en bas), le reste replié (détail du devis, consignes de montée, réglages du devis) ;
//   · Fiches : les fiches de performances (import CSV / JSON / .lnmperf / OFP, réponse ChatGPT collée, compléments
//     EUROCONTROL, autre fiche du type, édition, export .lnmperf et JSON), chaque changement montré champ par champ et
//     choisi par le pilote avant d'être écrit.
// Calcul pur dans performance_model.js, model.js, levels.js, sheets.js (chargés à la demande, une fois) ; ici seulement
// l'écran, les lectures et écritures par ctx.data, SimBrief par ctx.net, l'identité par ctx.identity. Styles limités au
// module ([data-module="fuel"]) sur les jetons --sog-… du cadre ; aucune feuille globale.
import * as XL from '../../frame/lib/external_links.js';
import * as WX from './weather.js';
import * as MT from '../../frame/lib/metar.js';
import * as WD from './winds.js';
import * as PG from './progress.js';
import * as RT from '../../frame/lib/route_text.js';
import * as CF from '../../frame/lib/current_flight.js';
import {
  svg
} from '../../frame/lib/icons.js';
import {
  copyText
} from '../../frame/lib/clipboard.js'; // marche aussi en http (tablette servie par le poste)
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  fmtZ,
  fmtZLocal,
  fmtDateZ
} from '../../frame/lib/time.js'; // heures en UTC (« 16:30Z »), l'heure locale seulement au départ et à l'arrivée

export const meta = {
  id: 'fuel',
  apps: ['pilot'],
  level: 1,
  reads: ['pilot/', 'cache/fuel/'],
  // fiches, flotte et référence : par aerodb (aircraft()), qui seul écrit aircraft/sheets/ et le miroir V2
  writes: [{
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/fuel/',
    policy: 'cache'
  }],
  // gardés hors ligne dès la première visite (service worker du cadre)
  files: ['performance_model.js', 'model.js', 'levels.js', 'perf_prompt.js', 'weather.js', 'winds.js', 'progress.js',
    '../../frame/lib/metar.js',
    '../../frame/lib/route_text.js', '../../frame/lib/current_flight.js',
    '../../frame/lib/external_links.js', '../../frame/lib/icons.js', '../../frame/lib/dom.js', '../../frame/lib/clipboard.js',
    '../../frame/lib/time.js'
  ]
};

const OFP_PATH = 'cache/fuel/last_ofp.json',
  WX_PATH = 'cache/fuel/weather.json',
  ALOFT_PATH = 'cache/fuel/aloft.json', // prévision en altitude (Open-Meteo) : profils aux lieux de la route
  UI_PATH = 'cache/fuel/ui.json',
  LAST_AC_PATH = 'cache/fuel/last_aircraft.json', // dernier appareil choisi sur cet appareil : proposé, repris d'office
  LIBS = [
    ['FlightPerfModel', 'performance_model.js'],
    ['FuelModel', 'model.js'],
    ['FuelLevels', 'levels.js'],
    ['PERF_PROMPT', 'perf_prompt.js']
  ];

// ---------------------------------------------------------------- textes [fr, en, de, es]
const TX = {
  plan: ['Préparer', 'Plan', 'Planen', 'Preparar'],
  sheets: ['Fiches', 'Sheets', 'Datenblätter', 'Fichas'],
  aircraft: ['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
  acSearch: ['Fiche, immatriculation, indicatif ou type', 'Sheet, registration, callsign or type',
    'Datenblatt, Kennzeichen, Rufzeichen oder Typ',
    'Ficha, matrícula, indicativo o tipo'
  ],
  acChange: ['Changer d’appareil', 'Change aircraft', 'Luftfahrzeug wechseln', 'Cambiar de aeronave'],
  loadingRefs: ['Chargement des appareils et des fiches…', 'Loading aircraft and sheets…',
    'Luftfahrzeuge und Datenblätter werden geladen…', 'Cargando aeronaves y fichas…'
  ],
  loadingFlight: ['Chargement du vol…', 'Loading the flight…', 'Flug wird geladen…', 'Cargando el vuelo…'],
  acNone: ['Aucun appareil : cherchez-le.', 'No aircraft: search for it.', 'Kein Luftfahrzeug: suchen.', 'Ninguna aeronave: búsquela.'],
  acNoRegistry: ['Base des aéronefs indisponible (aerodb).', 'Aircraft base unavailable (aerodb).',
    'Luftfahrzeugbasis nicht verfügbar (aerodb).',
    'Base de aeronaves no disponible (aerodb).'
  ],
  origins: {
    last: ['dernier choisi', 'last chosen', 'zuletzt gewählt', 'último elegido'],
    sheet: ['ma fiche', 'my sheet', 'mein Datenblatt', 'mi ficha'],
    fleet: ['flotte de la compagnie', 'airline fleet', 'Flotte der Fluggesellschaft', 'flota de la aerolínea'],
    reference: ['appareil connu (journal)', 'known aircraft (log)', 'bekanntes Luftfahrzeug (Flugbuch)', 'aeronave conocida (diario)'],
    type: ['type publié', 'published type', 'veröffentlichter Typ', 'tipo publicado'],
    free: ['code libre', 'free code', 'freier Code', 'código libre']
  },
  via: {
    own: ['sa fiche', 'its sheet', 'eigenes Datenblatt', 'su ficha'],
    type: ['fiche de son type', 'its type’s sheet', 'Datenblatt des Typs', 'ficha de su tipo'],
    estimate: ['estimation du type', 'type estimate', 'Typschätzung', 'estimación del tipo']
  },
  otherType: ['Autre type (code OACI)…', 'Other type (ICAO code)…', 'Anderer Typ (ICAO-Code)…', 'Otro tipo (código OACI)…'],
  typeCode: ['Code OACI du type', 'ICAO type code', 'ICAO-Typcode', 'Código OACI del tipo'],
  noSheet: ['Aucune fiche : importez-en une dans Fiches, ou choisissez un type (estimation).',
    'No sheet: import one in Sheets, or choose a type (estimate).',
    'Kein Datenblatt: eines unter Datenblätter importieren oder einen Typ wählen (Schätzung).',
    'Ninguna ficha: importe una en Fichas o elija un tipo (estimación).'
  ],
  source: ['Croisière : {s}', 'Cruise: {s}', 'Reiseflug: {s}', 'Crucero: {s}'],
  approx: ['approché', 'approximate', 'ungefähr', 'aproximado'],
  kinds: {
    entry: ['débit de ce vol', 'this flight’s fuel flow', 'Verbrauch dieses Flugs', 'consumo de este vuelo'],
    map: ['table régime / débit de la fiche', 'sheet’s RPM / fuel flow table', 'Drehzahl-/Verbrauchstabelle des Datenblatts',
      'tabla régimen / consumo de la ficha'
    ],
    profile: ['débit de croisière de la fiche', 'sheet’s cruise fuel flow', 'Reiseverbrauch des Datenblatts',
      'consumo de crucero de la ficha'
    ],
    ps: ['modèle Poll-Schumann', 'Poll-Schumann model', 'Poll-Schumann-Modell', 'modelo Poll-Schumann'],
    simbrief: ['données SimBrief du type', 'SimBrief type data', 'SimBrief-Typdaten', 'datos SimBrief del tipo'],
    estimate: ['estimation du type', 'type estimate', 'Typschätzung', 'estimación del tipo']
  },
  route: ['Route', 'Route', 'Route', 'Ruta'],
  dep: ['Départ', 'Departure', 'Abflug', 'Salida'],
  arr: ['Arrivée', 'Arrival', 'Ankunft', 'Llegada'],
  altn: ['Dégagement', 'Alternate', 'Ausweich', 'Alternativo'],
  routeText: ['Route (points, voies, niveaux : LFBO TOU UN460 NTS/F280 LFRN)',
    'Route (points, airways, levels: LFBO TOU UN460 NTS/F280 LFRN)',
    'Route (Punkte, Luftstraßen, Flugflächen: LFBO TOU UN460 NTS/F280 LFRN)',
    'Ruta (puntos, aerovías, niveles: LFBO TOU UN460 NTS/F280 LFRN)'
  ],
  rinfo: ['{d} · route vraie {t}° · {s}', '{d} · true track {t}° · {s}', '{d} · rechtweisender Kurs {t}° · {s}',
    '{d} · rumbo verdadero {t}° · {s}'
  ],
  rsrc: {
    route: ['d’après la route', 'from the route', 'aus der Route', 'según la ruta'],
    ofp: ['d’après l’OFP SimBrief', 'from the SimBrief OFP', 'aus dem SimBrief-OFP', 'según el OFP de SimBrief'],
    manual: ['saisies à la main', 'typed by hand', 'von Hand eingegeben', 'introducidas a mano']
  },
  rnone: ['Distance et route vraie : la route ne se résout pas encore.', 'Distance and true track: the route does not resolve yet.',
    'Entfernung und Kurs: die Route lässt sich noch nicht auflösen.', 'Distancia y rumbo: la ruta aún no se resuelve.'
  ],
  rmanual: ['Saisir à la main', 'Type them by hand', 'Von Hand eingeben', 'Introducir a mano'],
  ptsN: ['Points ({n})', 'Points ({n})', 'Punkte ({n})', 'Puntos ({n})'],
  stepNames: [
    ['Vol', 'Flight', 'Flug', 'Vuelo'],
    ['Route', 'Route', 'Route', 'Ruta'],
    ['Météo', 'Weather', 'Wetter', 'Meteorología'],
    ['Devis', 'Quote', 'Kalkulation', 'Cálculo'],
    ['Départ', 'Departure', 'Abflug', 'Salida']
  ],
  stepsNav: ['Étapes de la préparation', 'Preparation steps', 'Schritte der Vorbereitung', 'Pasos de la preparación'],
  next: ['Suivant', 'Next', 'Weiter', 'Siguiente'],
  showMap: ['Afficher la carte', 'Show the map', 'Karte zeigen', 'Mostrar el mapa'],
  start: ['Démarrer le vol', 'Start the flight', 'Flug starten', 'Iniciar el vuelo'],
  started: ['Vol démarré à {t}.', 'Flight started at {t}.', 'Flug gestartet um {t}.', 'Vuelo iniciado a las {t}.'],
  starting: ['Météo et devis refaits à l’heure réelle…', 'Weather and quote redone for now…',
    'Wetter und Kalkulation werden für jetzt neu berechnet…',
    'Meteorología y cálculo rehechos para ahora…'
  ],
  startDiff: ['À l’heure réelle : {l}.', 'For now: {l}.', 'Für jetzt: {l}.', 'Para ahora: {l}.'],
  startSame: ['À l’heure réelle : rien ne change.', 'For now: nothing changes.', 'Für jetzt: keine Änderung.',
    'Para ahora: nada cambia.'
  ],
  startSameEta: ['À l’heure réelle : rien ne change ; arrivée prévue {t}.', 'For now: nothing changes; planned arrival {t}.',
    'Für jetzt: keine Änderung; geplante Ankunft {t}.', 'Para ahora: nada cambia; llegada prevista {t}.'
  ],
  startOffline: ['Hors ligne : départ avec le dernier devis.', 'Offline: started with the last quote.',
    'Offline: Start mit der letzten Kalkulation.',
    'Sin conexión: salida con el último cálculo.'
  ],
  diffWind: ['vent {a} → {b}', 'wind {a} → {b}', 'Wind {a} → {b}', 'viento {a} → {b}'],
  diffBlock: ['bloc {a} → {b}', 'block {a} → {b}', 'Block {a} → {b}', 'bloque {a} → {b}'],
  diffEta: ['arrivée prévue {t}', 'planned arrival {t}', 'geplante Ankunft {t}', 'llegada prevista {t}'],
  startHint: ['La carte s’ouvre sur ce vol ; le compte rendu le reprendra.',
    'The map opens on this flight; the report will take it up.',
    'Die Karte öffnet sich mit diesem Flug; der Bericht übernimmt ihn.',
    'El mapa se abre con este vuelo; el informe lo retomará.'
  ],
  sumRoute: ['Route', 'Route', 'Route', 'Ruta'],
  sumLevel: ['Niveau', 'Level', 'Flugfläche', 'Nivel'],
  sumWind: ['Vent', 'Wind', 'Wind', 'Viento'],
  sumBlock: ['Carburant bloc', 'Block fuel', 'Blockkraftstoff', 'Combustible bloque'],
  sumAircraft: ['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
  sumNone: ['—', '—', '—', '—'],
  distance: ['Distance ({u})', 'Distance ({u})', 'Entfernung ({u})', 'Distancia ({u})'],
  track: ['Route vraie (°)', 'True track (°)', 'Rechtweisender Kurs (°)', 'Rumbo verdadero (°)'],
  pts: ['Points de la route', 'Route points', 'Routenpunkte', 'Puntos de la ruta'],
  ptsHint: ['Niveau facultatif sur un point : tenu à partir de ce point (paliers). Sans niveau, le précédent continue.',
    'Optional level on a point: flown from that point on (steps). Without one, the previous level goes on.',
    'Flugfläche je Punkt freiwillig: ab diesem Punkt geflogen (Stufen). Ohne Angabe gilt die vorige weiter.',
    'Nivel opcional en un punto: se vuela a partir de ese punto (escalones). Sin nivel, sigue el anterior.'
  ],
  ptsNone: ['Aucun point : départ et arrivée, ou ajoutez-en.', 'No points: departure and arrival, or add some.',
    'Keine Punkte: Abflug und Ankunft, oder welche hinzufügen.', 'Sin puntos: salida y llegada, o añada alguno.'
  ],
  addPt: ['Ajouter un point (identifiant ou « ID lat lon »)', 'Add a point (identifier or “ID lat lon”)',
    'Punkt hinzufügen (Kennung oder „ID lat lon“)', 'Añadir un punto (identificador o «ID lat lon»)'
  ],
  add: ['Ajouter', 'Add', 'Hinzufügen', 'Añadir'],
  ptLevel: ['Niveau à partir de {id} (FL)', 'Level from {id} (FL)', 'Flugfläche ab {id} (FL)', 'Nivel desde {id} (FL)'],
  ptUp: ['Monter {id} dans la liste', 'Move {id} up', '{id} nach oben', 'Subir {id}'],
  ptDown: ['Descendre {id} dans la liste', 'Move {id} down', '{id} nach unten', 'Bajar {id}'],
  ptDel: ['Retirer {id}', 'Remove {id}', '{id} entfernen', 'Quitar {id}'],
  ptUnknown: ['Point inconnu : {id}', 'Unknown point: {id}', 'Unbekannter Punkt: {id}', 'Punto desconocido: {id}'],
  steps: ['Paliers', 'Steps', 'Stufen', 'Escalones'],
  unresolved: ['Points inconnus : {l}', 'Unknown points: {l}', 'Unbekannte Punkte: {l}', 'Puntos desconocidos: {l}'],
  simbrief: ['Dernier OFP SimBrief', 'Last SimBrief OFP', 'Letzter SimBrief-OFP', 'Último OFP de SimBrief'],
  noSimbrief: ['Identifiant SimBrief à régler (⚙).', 'SimBrief ID to set (⚙).', 'SimBrief-Kennung einstellen (⚙).',
    'Identificador SimBrief por ajustar (⚙).'
  ],
  ofpLoaded: ['OFP {dep} → {arr} repris ({n} points).', 'OFP {dep} → {arr} loaded ({n} points).',
    'OFP {dep} → {arr} übernommen ({n} Punkte).',
    'OFP {dep} → {arr} cargado ({n} puntos).'
  ],
  offline: ['Hors ligne : rien n’a été demandé.', 'Offline: nothing was requested.', 'Offline: nichts wurde angefragt.',
    'Sin conexión: no se pidió nada.'
  ],
  sbError: ['SimBrief n’a pas répondu ({e}).', 'SimBrief did not answer ({e}).', 'SimBrief hat nicht geantwortet ({e}).',
    'SimBrief no respondió ({e}).'
  ],
  levelWind: ['Niveau et vent', 'Level and wind', 'Flugfläche und Wind', 'Nivel y viento'],
  level: ['Niveau (FL)', 'Level (FL)', 'Flugfläche (FL)', 'Nivel (FL)'],
  goal: ['Montée', 'Climb', 'Steigflug', 'Ascenso'],
  goals: {
    eco: ['Économique', 'Economical', 'Sparsam', 'Económico'],
    vy: ['Meilleur vario', 'Best rate', 'Bestes Steigen', 'Mejor régimen'],
    fast: ['Rapide', 'Fast', 'Schnell', 'Rápido'],
    prof: ['Badin de la fiche', 'Sheet IAS', 'IAS des Datenblatts', 'IAS de la ficha'],
    man: ['Manuelle', 'Manual', 'Manuell', 'Manual']
  },
  windDir: ['Vent de (°)', 'Wind from (°)', 'Wind aus (°)', 'Viento de (°)'],
  windKt: ['Force ({u})', 'Speed ({u})', 'Stärke ({u})', 'Fuerza ({u})'],
  isa: ['ISA ± (°C)', 'ISA ± (°C)', 'ISA ± (°C)', 'ISA ± (°C)'],
  manIas: ['Badin ({u})', 'IAS ({u})', 'IAS ({u})', 'IAS ({u})'],
  manVs: ['Vario ({u}, vide : plein gaz)', 'Rate ({u}, empty: full throttle)', 'Steigrate ({u}, leer: Vollgas)',
    'Régimen ({u}, vacío: gases a fondo)'
  ],
  decision: ['Décision du niveau', 'Level decision', 'Wahl der Flugfläche', 'Decisión del nivel'],
  decisionHint: ['Touchez la courbe pour choisir un niveau.', 'Tap the curve to choose a level.',
    'Kurve antippen, um eine Flugfläche zu wählen.', 'Toque la curva para elegir un nivel.'
  ],
  leastFuel: ['Moins de carburant : {fl} ({f})', 'Least fuel: {fl} ({f})', 'Am wenigsten Kraftstoff: {fl} ({f})',
    'Menos combustible: {fl} ({f})'
  ],
  fastest: ['Plus rapide : {fl} ({t})', 'Fastest: {fl} ({t})', 'Am schnellsten: {fl} ({t})', 'Más rápido: {fl} ({t})'],
  use: ['Prendre {fl}', 'Use {fl}', '{fl} nehmen', 'Usar {fl}'],
  gap: ['Au-dessus de {fl} : {r}.', 'Above {fl}: {r}.', 'Über {fl}: {r}.', 'Por encima de {fl}: {r}.'],
  reasons: {
    short: ['trajet trop court pour monter et redescendre', 'trip too short to climb and descend',
      'Strecke zu kurz für Steig- und Sinkflug',
      'trayecto demasiado corto para subir y bajar'
    ],
    thrust: ['poussée insuffisante', 'not enough thrust', 'Schub reicht nicht', 'empuje insuficiente']
  },
  noModel: ['Pas de modèle de vol : la fiche n’a ni TAS ni débit de croisière.',
    'No flight model: the sheet has neither cruise TAS nor fuel flow.',
    'Kein Flugmodell: das Datenblatt hat weder Reise-TAS noch -verbrauch.',
    'Sin modelo de vuelo: la ficha no tiene ni TAS ni consumo de crucero.'
  ],
  noDistance: ['Distance inconnue : renseignez la route ou la distance.', 'Unknown distance: fill in the route or the distance.',
    'Entfernung unbekannt: Route oder Entfernung angeben.', 'Distancia desconocida: indique la ruta o la distancia.'
  ],
  block: ['Carburant bloc', 'Block fuel', 'Blockkraftstoff', 'Combustible bloque'],
  trip: ['Délestage', 'Trip', 'Strecke', 'Trayecto'],
  time: ['Temps', 'Time', 'Zeit', 'Tiempo'],
  tod: ['Début de descente', 'Top of descent', 'Sinkflugbeginn', 'Inicio de descenso'],
  todVal: ['{d} avant', '{d} before', '{d} vorher', '{d} antes'],
  noFuel: ['Aucun débit connu : pas de devis.', 'No fuel flow known: no quote.', 'Kein Verbrauch bekannt: keine Berechnung.',
    'Ningún consumo conocido: sin cálculo.'
  ],
  windRange: ['vent inconnu : fourchette', 'unknown wind: range', 'Wind unbekannt: Spanne', 'viento desconocido: horquilla'],
  overMtow: ['Masse à l’atterrissage au-dessus de la MTOW.', 'Landing mass above MTOW.', 'Landemasse über MTOW.',
    'Masa al aterrizaje por encima de la MTOW.'
  ],
  details: ['Détail du devis', 'Quote details', 'Einzelheiten', 'Detalle del cálculo'],
  taxi: ['Roulage', 'Taxi', 'Rollen', 'Rodaje'],
  climb: ['Montée', 'Climb', 'Steigflug', 'Ascenso'],
  cruise: ['Croisière', 'Cruise', 'Reiseflug', 'Crucero'],
  descent: ['Descente', 'Descent', 'Sinkflug', 'Descenso'],
  contingency: ['Contingence', 'Contingency', 'Zuschlag', 'Contingencia'],
  reserve: ['Réserve', 'Reserve', 'Reserve', 'Reserva'],
  climbGuide: ['Consignes de montée', 'Climb instructions', 'Steigflug-Vorgaben', 'Consignas de ascenso'],
  notReached: ['La montée n’atteint pas le niveau (vario sous {r}).', 'The climb does not reach the level (rate under {r}).',
    'Der Steigflug erreicht die Flugfläche nicht (unter {r}).', 'El ascenso no alcanza el nivel (menos de {r}).'
  ],
  lawFailed: ['La loi de montée choisie n’atteint pas le niveau : montée de la fiche.',
    'The chosen climb law does not reach the level: the sheet’s climb.',
    'Das gewählte Steiggesetz erreicht die Flugfläche nicht: Steigflug des Datenblatts.',
    'La ley de ascenso elegida no alcanza el nivel: ascenso de la ficha.'
  ],
  alt: ['Alt.', 'Alt.', 'Höhe', 'Alt.'],
  thr: ['Gaz', 'Thr.', 'Gas', 'Gases'],
  wxDate: ['Date du vol (facultatif : TAF)', 'Flight date (optional: TAF)', 'Flugdatum (optional: TAF)',
    'Fecha del vuelo (opcional: TAF)'
  ],
  when30: ['Dans 30 min (30 min de plus à chaque appui)', 'In 30 min (30 min more at each press)',
    'In 30 Min. (bei jedem Tippen 30 Min. mehr)', 'Dentro de 30 min (30 min más en cada pulsación)'
  ],
  whenNow: ['Maint.', 'Now', 'Jetzt', 'Ahora'],
  whenNowLong: ['Maintenant (météo observée)', 'Now (observed weather)', 'Jetzt (beobachtetes Wetter)',
    'Ahora (tiempo observado)'
  ],
  wxMids: ['{n} terrains le long de la route', '{n} aerodromes along the route', '{n} Flugplätze entlang der Route',
    '{n} aeródromos a lo largo de la ruta'
  ],
  wxAlong: ['à {d} du départ', '{d} from departure', '{d} nach dem Abflug', 'a {d} de la salida'],
  wxAltnAt: ['dégagement, à {d} de l’arrivée', 'alternate, {d} from arrival', 'Ausweich, {d} von der Ankunft',
    'alternativo, a {d} de la llegada'
  ],
  wxRadius: ['Couloir météo (NM de part et d’autre)', 'Weather corridor (NM each side)', 'Wetterkorridor (NM je Seite)',
    'Corredor meteorológico (NM a cada lado)'
  ],
  wxReal: ['Météo réelle : vent le long de la route', 'Real weather: wind along the route', 'Echtes Wetter: Wind entlang der Route',
    'Meteorología real: viento a lo largo de la ruta'
  ],
  wxRead: ['Lire la météo des terrains', 'Read the aerodromes’ weather', 'Flugplatzwetter lesen',
    'Leer la meteorología de los aeródromos'
  ],
  wxTitle: ['Météo des terrains', 'Aerodrome weather', 'Flugplatzwetter', 'Meteorología de los aeródromos'],
  wxNone: ['Départ et arrivée en codes OACI, puis « Lire la météo des terrains ».',
    'Departure and arrival as ICAO codes, then “Read the aerodromes’ weather”.',
    'Abflug und Ankunft als ICAO-Codes, dann „Flugplatzwetter lesen“.',
    'Salida y llegada en códigos OACI, luego «Leer la meteorología de los aeródromos».'
  ],
  wxCached: ['Hors réseau : dernières valeurs lues le {t}.', 'No network: last values read on {t}.',
    'Kein Netz: zuletzt gelesene Werte am {t}.',
    'Sin red: últimos valores leídos el {t}.'
  ],
  aloftTitle: ['Vents et températures en altitude', 'Winds and temperatures aloft', 'Höhenwinde und -temperaturen',
    'Vientos y temperaturas en altura'
  ],
  aloftNone: ['Pas encore de prévision en altitude : « Lire la météo des terrains » la lit aussi, une fois la route et le niveau donnés.',
    'No forecast aloft yet: “Read the aerodromes’ weather” reads it too, once the route and the level are given.',
    'Noch keine Höhenvorhersage: „Flugplatzwetter lesen“ liest sie mit, sobald Route und Flugfläche angegeben sind.',
    'Aún no hay previsión en altura: «Leer la meteorología» también la lee, una vez dadas la ruta y el nivel.'
  ],
  aloftAt: ['Prévision {m} pour {t}{run}, lue le {r}.', '{m} forecast for {t}{run}, read on {r}.',
    '{m}-Vorhersage für {t}{run}, gelesen am {r}.', 'Previsión {m} para las {t}{run}, leída el {r}.'
  ],
  aloftRun: [' (run de {r})', ' ({r} run)', ' (Lauf {r})', ' (pasada de las {r})'],
  aloftCols: [
    ['Point', 'Point', 'Punkt', 'Punto'],
    ['Niveau', 'Level', 'Fläche', 'Nivel'],
    ['Vent', 'Wind', 'Wind', 'Viento'],
    ['Temp.', 'Temp.', 'Temp.', 'Temp.'],
    ['ISA ±', 'ISA ±', 'ISA ±', 'ISA ±']
  ],
  aloftSrc: ['Vent : moyenne au niveau planifié le long de la route, prévision {m}.',
    'Wind: average at the planned level along the route, {m} forecast.',
    'Wind: Mittel auf der geplanten Fläche entlang der Route, {m}-Vorhersage.',
    'Viento: media al nivel planificado a lo largo de la ruta, previsión {m}.'
  ],
  realTitle: ['Atmosphère réelle au départ ({m})', 'Real atmosphere at departure ({m})', 'Echte Atmosphäre am Abflug ({m})',
    'Atmósfera real en la salida ({m})'
  ],
  realAxis: ['température (°C) · tirets : atmosphère type', 'temperature (°C) · dashed: standard atmosphere',
    'Temperatur (°C) · gestrichelt: Standardatmosphäre', 'temperatura (°C) · discontinua: atmósfera tipo'
  ],
  realLevel: ['Au {l} : {t} °C (ISA {d}), altitude-densité {da} ft.', 'At {l}: {t} °C (ISA {d}), density altitude {da} ft.',
    'Auf {l}: {t} °C (ISA {d}), Dichtehöhe {da} ft.', 'A {l}: {t} °C (ISA {d}), altitud de densidad {da} ft.'
  ],
  realInv: ['Inversion de {a} à {b} ft (+{d} °C).', 'Inversion from {a} to {b} ft (+{d} °C).', 'Inversion von {a} bis {b} ft (+{d} °C).',
    'Inversión de {a} a {b} ft (+{d} °C).'
  ],
  realNoInv: ['Pas d’inversion au départ.', 'No inversion at departure.', 'Keine Inversion am Abflug.', 'Sin inversión en la salida.'],
  wxDirect: ['Sans lanceur : METAR de metar.vatsim.net, TAF d’avwx.rest.',
    'Without a launcher: METAR from metar.vatsim.net, TAF from avwx.rest.',
    'Ohne Starter: METAR von metar.vatsim.net, TAF von avwx.rest.', 'Sin lanzador: METAR de metar.vatsim.net, TAF de avwx.rest.'
  ],
  wxNoTaf: ['TAF indisponible sans lanceur ni clé météo (Réglages › Clé météo (TAF, avwx.rest)) : le METAR répond à la place.',
    'TAF unavailable without a launcher or a weather key (Settings › Weather key (TAF, avwx.rest)): the METAR answers instead.',
    'TAF ohne Starter oder Wetterschlüssel nicht verfügbar (Einstellungen › Wetterschlüssel (TAF, avwx.rest)): das METAR antwortet stattdessen.',
    'TAF no disponible sin lanzador ni clave meteorológica (Ajustes › Clave meteorológica (TAF, avwx.rest)): responde el METAR.'
  ],
  wxRelay: ['La météo n’est joignable que par le lanceur d’un poste.', 'Weather can only be reached through a workstation’s launcher.',
    'Das Wetter ist nur über den Starter eines Arbeitsplatzes erreichbar.',
    'La meteorología solo es accesible a través del lanzador de un puesto.'
  ],
  wxNoData: ['pas de METAR ni de TAF', 'no METAR or TAF', 'kein METAR oder TAF', 'sin METAR ni TAF'],
  wxWind: ['Vent', 'Wind', 'Wind', 'Viento'],
  wxRwy: ['Piste {r}', 'Runway {r}', 'Piste {r}', 'Pista {r}'],
  wxComp: ['{h} kt de {hw}, {c} kt de travers {s}', '{h} kt {hw}, {c} kt crosswind from the {s}',
    '{h} kt {hw}, {c} kt Seitenwind von {s}',
    '{h} kt {hw}, {c} kt de través desde la {s}'
  ],
  wxHead: ['face', 'headwind', 'Gegenwind', 'cara'],
  wxTail: ['dos', 'tailwind', 'Rückenwind', 'cola'],
  wxLeft: ['gauche', 'left', 'links', 'izquierda'],
  wxRight: ['droite', 'right', 'rechts', 'derecha'],
  wxRwyHint: ['piste principale, sens le plus proche du vent', 'main runway, the end closest to the wind',
    'Hauptpiste, Richtung am nächsten zum Wind',
    'pista principal, sentido más cercano al viento'
  ],
  wxCeil: ['Plafond', 'Ceiling', 'Wolkenuntergrenze', 'Techo'],
  wxNoCeil: ['aucun', 'none', 'keine', 'ninguno'],
  wxVis: ['Visibilité', 'Visibility', 'Sicht', 'Visibilidad'],
  wxTemp: ['Température, QNH', 'Temperature, QNH', 'Temperatur, QNH', 'Temperatura, QNH'],
  wxCb: ['CB / TCU annoncés : orages possibles sur la route.', 'CB / TCU reported: thunderstorms possible on the route.',
    'CB / TCU gemeldet: Gewitter auf der Route möglich.', 'CB / TCU anunciados: posibles tormentas en la ruta.'
  ],
  wxRaw: ['Message brut', 'Raw message', 'Rohmeldung', 'Mensaje bruto'],
  wxSrc: ['Vent : moyenne de {l} le long de la route (vent au sol, approximation).',
    'Wind: average of {l} along the route (surface wind, approximation).',
    'Wind: Mittel von {l} entlang der Route (Bodenwind, Näherung).',
    'Viento: media de {l} a lo largo de la ruta (viento en superficie, aproximación).'
  ],
  wxMissing: ['Vent non calculé : il faut le vent d’au moins deux terrains de la route.',
    'Wind not computed: it needs the wind of at least two aerodromes on the route.',
    'Wind nicht berechnet: es braucht den Wind von mindestens zwei Flugplätzen der Route.',
    'Viento no calculado: hace falta el viento de al menos dos aeródromos de la ruta.'
  ],
  isaHint: ['ISA {d} d’après le METAR {id} ({t} °C à {e} ft).', 'ISA {d} from the {id} METAR ({t} °C at {e} ft).',
    'ISA {d} laut METAR {id} ({t} °C auf {e} ft).', 'ISA {d} según el METAR {id} ({t} °C a {e} ft).'
  ],
  isaUse: ['Utiliser ISA {d}', 'Use ISA {d}', 'ISA {d} verwenden', 'Usar ISA {d}'],
  isaAloft: ['ISA {d} au {l} d’après la prévision {m}.', 'ISA {d} at {l} from the {m} forecast.', 'ISA {d} auf {l} laut {m}-Vorhersage.',
    'ISA {d} a {l} según la previsión {m}.'
  ],
  aloftDown: ['prévision en altitude indisponible', 'forecast aloft unavailable', 'Höhenvorhersage nicht verfügbar',
    'previsión en altura no disponible'
  ],
  aloftPending: ['prévision en cours…', 'forecast loading…', 'Vorhersage wird geladen…', 'previsión en curso…'],
  aloftFailed: ['Prévision en altitude indisponible : vent au sol des METAR.', 'Forecast aloft unavailable: METAR surface wind.',
    'Höhenvorhersage nicht verfügbar: Bodenwind der METAR.', 'Previsión en altura no disponible: viento en superficie de los METAR.'
  ],
  windBy: {
    weather: ['vent : {l}', 'wind: {l}', 'Wind: {l}', 'viento: {l}'],
    aloft: ['vent : prévision {m} {l}', 'wind: {m} forecast {l}', 'Wind: {m}-Vorhersage {l}', 'viento: previsión {m} {l}'],
    typed: ['vent saisi', 'wind typed', 'Wind eingegeben', 'viento introducido']
  },
  wxReading: ['Lecture…', 'Reading…', 'Wird gelesen…', 'Leyendo…'],
  diverted: [' — déroutement', ' — diverted', ' — Ausweichlandung', ' — desviado'],
  cancelStart: ['Annuler le départ', 'Cancel the start', 'Start abbrechen', 'Anular la salida'],
  cancelAsk: ['Annuler le départ de {t} ? Le vol ne sera plus proposé au compte rendu comme démarré.',
    'Cancel the {t} start? The flight will no longer be offered to the report as started.',
    'Start um {t} abbrechen? Der Flug wird dem Bericht nicht mehr als gestartet angeboten.',
    '¿Anular la salida de las {t}? El vuelo ya no se propondrá al informe como iniciado.'
  ],
  since: ['Vol démarré à {t} · depuis {d}', 'Flight started at {t} · for {d}', 'Flug gestartet um {t} · seit {d}',
    'Vuelo iniciado a las {t} · desde hace {d}'
  ],
  progTitle: ['Progression prévue', 'Planned progress', 'Geplanter Fortschritt', 'Progreso previsto'],
  progNow: ['Prévu maintenant : {d} du départ, entre {a} et {b} · reste {r} · carburant restant prévu {f}.',
    'Planned now: {d} from departure, between {a} and {b} · {r} to go · planned fuel remaining {f}.',
    'Jetzt geplant: {d} nach dem Abflug, zwischen {a} und {b} · noch {r} · geplanter Restkraftstoff {f}.',
    'Previsto ahora: {d} desde la salida, entre {a} y {b} · faltan {r} · combustible restante previsto {f}.'
  ],
  progTaxi: ['Prévu maintenant : roulage au départ jusqu’à {t} · carburant restant prévu {f}.',
    'Planned now: taxiing at departure until {t} · planned fuel remaining {f}.',
    'Jetzt geplant: Rollen am Abflug bis {t} · geplanter Restkraftstoff {f}.',
    'Previsto ahora: rodaje en la salida hasta las {t} · combustible restante previsto {f}.'
  ],
  progArrived: ['Arrivée prévue atteinte · carburant restant prévu {f}.', 'Planned arrival reached · planned fuel remaining {f}.',
    'Geplante Ankunft erreicht · geplanter Restkraftstoff {f}.', 'Llegada prevista alcanzada · combustible restante previsto {f}.'
  ],
  progHint: [
    'Calculée depuis l’heure de départ et le devis (vent compris) ; la position réelle (simulateur de ce poste, GPS ou réseau) se voit sur la carte.',
    'Worked out from the start time and the quote (wind included); the real position (this computer’s simulator, GPS or network) shows on the map.',
    'Aus Startzeit und Kalkulation berechnet (Wind inbegriffen); die echte Position (Simulator dieses Rechners, GPS oder Netz) erscheint auf der Karte.',
    'Calculado desde la hora de salida y el cálculo (viento incluido); la posición real (simulador de este equipo, GPS o red) se ve en el mapa.'
  ],
  da: ['Altitude-densité', 'Density altitude', 'Dichtehöhe', 'Altitud de densidad'],
  daAxisX: ['écart ISA (°C)', 'ISA deviation (°C)', 'ISA-Abweichung (°C)', 'desviación ISA (°C)'],
  daAxisY: ['altitude-densité (ft)', 'density altitude (ft)', 'Dichtehöhe (ft)', 'altitud de densidad (ft)'],
  daLines: ['Une droite par altitude pression (en milliers de ft) ; trait vertical : l’écart du vol.',
    'One line per pressure altitude (thousands of ft); vertical line: the flight’s deviation.',
    'Eine Gerade je Druckhöhe (in Tausend ft); senkrechte Linie: die Abweichung des Flugs.',
    'Una recta por altitud de presión (en miles de ft); línea vertical: la desviación del vuelo.'
  ],
  daDep: ['Au départ ({id}, {t} °C, QNH {q} hPa) : altitude pression {p} ft, altitude-densité {d} ft.',
    'At departure ({id}, {t} °C, QNH {q} hPa): pressure altitude {p} ft, density altitude {d} ft.',
    'Beim Abflug ({id}, {t} °C, QNH {q} hPa): Druckhöhe {p} ft, Dichtehöhe {d} ft.',
    'En la salida ({id}, {t} °C, QNH {q} hPa): altitud de presión {p} ft, altitud de densidad {d} ft.'
  ],
  daCeil: ['Plafond de la fiche {c} ft : à ISA {d}, il est atteint vers {p} ft d’altitude pression.',
    'Sheet ceiling {c} ft: at ISA {d} it is reached around {p} ft pressure altitude.',
    'Gipfelhöhe des Datenblatts {c} ft: bei ISA {d} wird sie bei etwa {p} ft Druckhöhe erreicht.',
    'Techo de la ficha {c} ft: a ISA {d} se alcanza hacia {p} ft de altitud de presión.'
  ],
  daCeilEst: ['Plafond estimé {c} ft : à ISA {d}, il est atteint vers {p} ft d’altitude pression.',
    'Estimated ceiling {c} ft: at ISA {d} it is reached around {p} ft pressure altitude.',
    'Geschätzte Gipfelhöhe {c} ft: bei ISA {d} wird sie bei etwa {p} ft Druckhöhe erreicht.',
    'Techo estimado {c} ft: a ISA {d} se alcanza hacia {p} ft de altitud de presión.'
  ],
  daNoCeil: ['La fiche ne donne pas de plafond.', 'The sheet gives no ceiling.', 'Das Datenblatt nennt keine Gipfelhöhe.',
    'La ficha no da techo.'
  ],
  openIn: ['Ouvrir dans', 'Open in', 'Öffnen in', 'Abrir en'],
  openInHint: ['Nouvel onglet ; rien n’est envoyé qui ne soit déjà dans le vol.',
    'New tab; nothing is sent that is not already in the flight.',
    'Neuer Tab; nichts wird gesendet, was nicht schon im Flug steht.', 'Pestaña nueva; no se envía nada que no esté ya en el vuelo.'
  ],
  settings: ['Réglages du devis', 'Quote settings', 'Einstellungen', 'Ajustes del cálculo'],
  taxiMin: ['Roulage (min)', 'Taxi (min)', 'Rollen (min)', 'Rodaje (min)'],
  reserveMin: ['Réserve (min)', 'Reserve (min)', 'Reserve (min)', 'Reserva (min)'],
  contPct: ['Contingence (%)', 'Contingency (%)', 'Zuschlag (%)', 'Contingencia (%)'],
  units: ['Unités affichées', 'Displayed units', 'Angezeigte Einheiten', 'Unidades mostradas'],
  unitFuel: ['Carburant', 'Fuel', 'Kraftstoff', 'Combustible'],
  unitSpeed: ['Vitesse', 'Speed', 'Geschwindigkeit', 'Velocidad'],
  unitAlt: ['Altitude', 'Altitude', 'Höhe', 'Altitud'],
  unitDist: ['Distance', 'Distance', 'Entfernung', 'Distancia'],
  entry: ['Débit de croisière de ce vol (kg/h, vide : la fiche)', 'Cruise fuel flow for this flight (kg/h, empty: the sheet)',
    'Reiseverbrauch für diesen Flug (kg/h, leer: Datenblatt)', 'Consumo de crucero de este vuelo (kg/h, vacío: la ficha)'
  ],
  // écran des fiches
  import: ['Importer un fichier', 'Import a file', 'Datei importieren', 'Importar un archivo'],
  paste: ['Coller un texte', 'Paste a text', 'Text einfügen', 'Pegar un texto'],
  newSheet: ['Nouvelle fiche', 'New sheet', 'Neues Datenblatt', 'Nueva ficha'],
  sheetCats: {
    helico: ['Hélicoptères', 'Helicopters', 'Hubschrauber', 'Helicópteros'],
    turboprop: ['Turbopropulseurs', 'Turboprops', 'Turboprops', 'Turbohélices'],
    jet: ['Réacteurs', 'Jets', 'Strahlflugzeuge', 'Reactores'],
    piston: ['Pistons', 'Piston engines', 'Kolbenmotoren', 'Pistón'],
    other: ['Autres', 'Others', 'Andere', 'Otros']
  },
  coType: ['Type de la compagnie ({n} appareil(s)) : performances à renseigner',
    'Company type ({n} aircraft): performance to fill in', 'Typ der Fluggesellschaft ({n} Luftfahrzeug(e)): Leistungen einzutragen',
    'Tipo de la compañía ({n} aeronave(s)): rendimientos por completar'
  ],
  createSheet: ['Créer la fiche', 'Create the sheet', 'Datenblatt anlegen', 'Crear la ficha'],
  fromOfp: ['Depuis le dernier OFP', 'From the last OFP', 'Aus dem letzten OFP', 'Desde el último OFP'],
  sheetsIntro: ['Fiches de la base partagée ; chaque changement est montré avant d’être écrit.',
    'Sheets of the shared database; every change is shown before it is written.',
    'Datenblätter der gemeinsamen Datenbank; jede Änderung wird vor dem Schreiben gezeigt.',
    'Fichas de la base compartida; cada cambio se muestra antes de escribirse.'
  ],
  missing: ['{n} champ(s) vide(s)', '{n} empty field(s)', '{n} leere(s) Feld(er)', '{n} campo(s) vacío(s)'],
  complete: ['complète', 'complete', 'vollständig', 'completa'],
  updated: ['mise à jour {d}', 'updated {d}', 'aktualisiert {d}', 'actualizada {d}'],
  useSheet: ['Utiliser', 'Use', 'Verwenden', 'Usar'],
  edit: ['Modifier', 'Edit', 'Bearbeiten', 'Editar'],
  back: ['← Fiches', '← Sheets', '← Datenblätter', '← Fichas'],
  save: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  saved: ['Fiche enregistrée : elle partira à la prochaine synchronisation.', 'Sheet saved: it will leave at the next synchronisation.',
    'Datenblatt gespeichert: es geht bei der nächsten Synchronisation hinaus.', 'Ficha guardada: saldrá en la próxima sincronización.'
  ],
  eurocontrol: ['Compléter (EUROCONTROL)', 'Complete (EUROCONTROL)', 'Ergänzen (EUROCONTROL)', 'Completar (EUROCONTROL)'],
  noApd: ['Pas de fiche EUROCONTROL pour ce type.', 'No EUROCONTROL record for this type.', 'Kein EUROCONTROL-Datensatz für diesen Typ.',
    'Ninguna ficha EUROCONTROL para este tipo.'
  ],
  fillFrom: ['Compléter depuis une autre fiche', 'Complete from another sheet', 'Aus anderem Datenblatt ergänzen',
    'Completar desde otra ficha'
  ],
  gpt: ['ChatGPT', 'ChatGPT', 'ChatGPT', 'ChatGPT'],
  gptPrompt: ['Copier la demande ChatGPT', 'Copy the ChatGPT request', 'ChatGPT-Anfrage kopieren', 'Copiar la petición a ChatGPT'],
  gptMissing: ['Demande pour les champs vides', 'Request for the empty fields', 'Anfrage für die leeren Felder',
    'Petición para los campos vacíos'
  ],
  copyManual: ['Copie impossible ici : le texte est sélectionné, copiez-le (Ctrl+C ou appui long).',
    'Copying is not possible here: the text is selected, copy it (Ctrl+C or long press).',
    'Kopieren ist hier nicht möglich: Der Text ist markiert, kopieren Sie ihn (Strg+C oder lange drücken).',
    'Aquí no se puede copiar: el texto está seleccionado, cópielo (Ctrl+C o pulsación larga).'
  ],
  copied: ['Demande copiée : collez-la dans ChatGPT, puis sa réponse ci-dessous.',
    'Request copied: paste it into ChatGPT, then its answer below.',
    'Anfrage kopiert: in ChatGPT einfügen, dann die Antwort unten.', 'Petición copiada: péguela en ChatGPT y luego su respuesta abajo.'
  ],
  gptReply: ['Réponse de ChatGPT (telle quelle)', 'ChatGPT’s answer (as is)', 'Antwort von ChatGPT (unverändert)',
    'Respuesta de ChatGPT (tal cual)'
  ],
  read: ['Lire', 'Read', 'Lesen', 'Leer'],
  exportLnm: ['Exporter .lnmperf', 'Export .lnmperf', '.lnmperf exportieren', 'Exportar .lnmperf'],
  exportJson: ['Exporter JSON', 'Export JSON', 'JSON exportieren', 'Exportar JSON'],
  remove: ['Supprimer', 'Delete', 'Löschen', 'Eliminar'],
  removeAsk: ['Supprimer la fiche « {n} » de la base partagée ?', 'Delete the sheet “{n}” from the shared database?',
    'Datenblatt „{n}“ aus der gemeinsamen Datenbank löschen?', '¿Eliminar la ficha «{n}» de la base compartida?'
  ],
  rpmAdd: ['+ Ligne', '+ Row', '+ Zeile', '+ Fila'],
  rpmGone: ['retirée', 'removed', 'entfernt', 'retirada'],
  rpmTable: ['Table régime / débit', 'RPM / fuel flow table', 'Drehzahl-/Verbrauchstabelle', 'Tabla régimen / consumo'],
  review: ['Changements proposés', 'Proposed changes', 'Vorgeschlagene Änderungen', 'Cambios propuestos'],
  reviewNew: ['Nouvelle fiche « {n} »', 'New sheet “{n}”', 'Neues Datenblatt „{n}“', 'Nueva ficha «{n}»'],
  reviewNone: ['Rien ne change.', 'Nothing changes.', 'Nichts ändert sich.', 'Nada cambia.'],
  field: ['Champ', 'Field', 'Feld', 'Campo'],
  before: ['Avant', 'Before', 'Vorher', 'Antes'],
  after: ['Après', 'After', 'Nachher', 'Después'],
  apply: ['Appliquer la sélection', 'Apply the selection', 'Auswahl übernehmen', 'Aplicar la selección'],
  cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
  added: ['ajoutée', 'added', 'hinzugefügt', 'añadida'],
  replaced: ['remplacée', 'replaced', 'ersetzt', 'sustituida'],
  imported: ['{n} fiche(s) lue(s) dans {f}.', '{n} sheet(s) read from {f}.', '{n} Datenblatt/-blätter aus {f} gelesen.',
    '{n} ficha(s) leída(s) de {f}.'
  ],
  unreadable: ['{f} : format non reconnu ({e}).', '{f}: format not recognised ({e}).', '{f}: Format nicht erkannt ({e}).',
    '{f}: formato no reconocido ({e}).'
  ],
  pasteAsk: ['Collez une fiche (JSON, CSV de performances, .lnmperf) ou une réponse de ChatGPT :',
    'Paste a sheet (JSON, performance CSV, .lnmperf) or a ChatGPT answer:',
    'Datenblatt (JSON, Leistungs-CSV, .lnmperf) oder ChatGPT-Antwort einfügen:',
    'Pegue una ficha (JSON, CSV de rendimiento, .lnmperf) o una respuesta de ChatGPT:'
  ],
  pasted: ['texte collé', 'pasted text', 'eingefügter Text', 'texto pegado'],
  noOfp: ['Aucun OFP sur cet appareil : reprenez-le dans Préparer.', 'No OFP on this device: load it in Plan.',
    'Kein OFP auf diesem Gerät: unter Planen laden.', 'Ningún OFP en este dispositivo: cárguelo en Preparar.'
  ],
  calibrated: ['calibrée sur le navlog', 'calibrated on the navlog', 'am Navlog kalibriert', 'calibrada con el navlog']
};
// libellés des champs de fiche (PROFILE_FIELDS de la V2, en français) : groupes, puis libellés, puis préfixes « X · »
const FIELD_TX = {
  'Identité et format': ['Identité et format', 'Identity and format', 'Identität und Format', 'Identidad y formato'],
  'Carburant et opération': ['Carburant et opération', 'Fuel and operation', 'Kraftstoff und Betrieb', 'Combustible y operación'],
  'Piste et alternat': ['Piste et dégagement', 'Runway and alternate', 'Piste und Ausweichflughafen', 'Pista y alternativo'],
  'Montée': TX.climb,
  'Croisière': TX.cruise,
  'Descente': TX.descent,
  'Régime et consommation': ['Régime et consommation', 'RPM and fuel flow', 'Drehzahl und Verbrauch', 'Régimen y consumo'],
  'Nom': ['Nom', 'Name', 'Name', 'Nombre'],
  'Type / ICAO': ['Type / OACI', 'Type / ICAO', 'Typ / ICAO', 'Tipo / OACI'],
  'Description': ['Description', 'Description', 'Beschreibung', 'Descripción'],
  'Immatriculation': ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
  'Indicatif': ['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'],
  'Carburant en volume': ['Carburant en volume', 'Fuel as volume', 'Kraftstoff als Volumen', 'Combustible en volumen'],
  'Carburant Jet': ['Carburant Jet', 'Jet fuel', 'Jet-Kraftstoff', 'Combustible jet'],
  'Carburant utilisable': ['Carburant utilisable', 'Usable fuel', 'Nutzbarer Kraftstoff', 'Combustible utilizable'],
  'Taxi': TX.taxi,
  'Réserve': TX.reserve,
  'Contingence (%)': TX.contPct,
  'Carburant extra': ['Carburant extra', 'Extra fuel', 'Zusatzkraftstoff', 'Combustible extra'],
  'Longueur piste mini (ft)': ['Longueur de piste mini (ft)', 'Minimum runway length (ft)', 'Mindestpistenlänge (ft)',
    'Longitud mínima de pista (ft)'
  ],
  'Type de piste': ['Type de piste', 'Runway type', 'Pistenart', 'Tipo de pista'],
  'Alternat': TX.altn,
  'Badin / IAS (kt)': ['Badin (kt)', 'IAS (kt)', 'IAS (kt)', 'IAS (kt)'],
  'Régime nominal (RPM / N1)': ['Régime nominal (RPM / N1)', 'Nominal RPM / N1', 'Nenndrehzahl (RPM / N1)', 'Régimen nominal (RPM / N1)'],
  'fuel flow': ['débit', 'fuel flow', 'Verbrauch', 'consumo'],
  'Fuel flow': ['Débit', 'Fuel flow', 'Verbrauch', 'Consumo'],
  'TAS (kt)': ['TAS (kt)', 'TAS (kt)', 'TAS (kt)', 'TAS (kt)'],
  'Vario (ft/min)': ['Vario (ft/min)', 'Rate (ft/min)', 'Steigrate (ft/min)', 'Régimen vertical (ft/min)'],
  'Plafond max (ft)': ['Plafond (ft)', 'Ceiling (ft)', 'Gipfelhöhe (ft)', 'Techo (ft)'],
  'Altitude de référence (ft)': ['Altitude de référence (ft)', 'Reference altitude (ft)', 'Referenzhöhe (ft)',
    'Altitud de referencia (ft)'
  ],
  'Motorisation (auto : base OACI)': ['Motorisation (auto : base OACI)', 'Engines (auto: ICAO base)', 'Antrieb (auto: ICAO-Basis)',
    'Motorización (auto: base OACI)'
  ],
  'Altitude de rétablissement (ft)': ['Altitude de rétablissement (ft)', 'Critical altitude (ft)', 'Volldruckhöhe (ft)',
    'Altitud crítica (ft)'
  ],
  'Cabine pressurisée': ['Cabine pressurisée', 'Pressurised cabin', 'Druckkabine', 'Cabina presurizada'],
  'Référence RPM / puissance': ['Référence régime / puissance', 'RPM / power reference', 'Drehzahl-/Leistungsreferenz',
    'Referencia RPM / potencia'
  ],
  'Données RPM / fuel flow': ['Données régime / débit', 'RPM / fuel flow data', 'Drehzahl-/Verbrauchsdaten', 'Datos RPM / consumo'],
  'Base / provenance': ['Base / provenance', 'Basis / origin', 'Grundlage / Herkunft', 'Base / procedencia']
};

// champs de fiche hors du formulaire de la V2
const PATH_TX = {
  reserveFuelFlowPerHour: ['Réserve · débit', 'Reserve · fuel flow', 'Reserve · Verbrauch', 'Reserva · consumo'],
  'tod.gradientFtPerNm': ['Descente · pente (ft/NM)', 'Descent · gradient (ft/NM)', 'Sinkflug · Gradient (ft/NM)',
    'Descenso · pendiente (ft/NM)'
  ],
  'tod.bufferNm': ['Descente · marge (NM)', 'Descent · buffer (NM)', 'Sinkflug · Puffer (NM)', 'Descenso · margen (NM)'],
  typicalWindKt: ['Vent typique (kt)', 'Typical wind (kt)', 'Typischer Wind (kt)', 'Viento típico (kt)'],
  registration: ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
  type: ['Type', 'Type', 'Typ', 'Tipo']
};

// ---------------------------------------------------------------- état du module (un montage à la fois)
let S = null;
/** Vrai si le montage s a été démonté ou remplacé pendant une attente (réponse réseau, base, dialogue) : la suite est
 *  abandonnée, rien n'est écrit dans l'état d'un autre montage. */
const gone = s => S !== s;
/** Ce que la relecture au départ a changé, gardé hors de S (le module peut être remonté quand la vue double s'ouvre) :
 *  { at (started.at), text }. */
let startNote = null;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Nombre lu dans un champ (virgule décimale admise) ; null si vide ou illisible. */
const num = v => {
  const x = Number(String(v ?? '').trim().replace(/\s/g, '').replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(x) ? x : null;
};
/** FL d'une altitude en pieds (FL090). */
/** Niveau écrit comme partout dans la suite : FL au-dessus de l'altitude de transition (5 000 ft par défaut, celle de la
 *  compagnie quand elle la donnera), pieds en dessous (frame/lib/route_text.js). */
const flTxt = h => RT.formatLevel(h, +S?.ctx?.airline?.transitionFt || 5000);
/** Durée en minutes → h:mm. */
const hmm = m => {
  const x = Math.max(0, Math.round(+m || 0));
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
};
/** Copie d'une fiche sans ses clés de travail (« _… » : identifiants de ligne, marques d'origine). */
const plain = p => JSON.parse(JSON.stringify(p, (k, v) => k.startsWith('_') ? undefined : v));

/** Charge le calcul pur (scripts du dossier du module, une fois par page), tous au montage : le service worker du
 *  cadre garde le point d'entrée du module dès la première visite et les fichiers qu'il importe au premier passage. */
async function loadLibs() {
  // en parallèle : les bibliothèques ne se lisent les unes les autres qu'à l'appel (window.FlightPerfModel…), pas au
  // chargement
  await Promise.all(LIBS.filter(([glob]) => !window[glob]).map(([, file]) => import(new URL(`${file}?v=0`, import.meta.url).href)));
  // première visite : la page tourne avant que le service worker la contrôle, ces fichiers lui ont échappé ; relus une
  // fois quand il prend la main, pour que Carburant soit complet hors ligne
  const sw = navigator.serviceWorker;
  if (sw && !sw.controller) sw.addEventListener('controllerchange', () => {
    for (const [, file] of LIBS) fetch(new URL(`${file}?v=0`, import.meta.url)).catch(() => {});
  }, {
    once: true
  });
}

/** Texte d'une ligne de TX dans la langue de l'appli. */
const tt = (row, v) => S.ctx.t(row, v);
/** Libellé traduit d'un champ de fiche (chemin) ; groupe compris si group. */
function fieldLabel(path, group = false) {
  const f = SH().PROFILE_FIELDS.find(x => x[2] === path);
  if (!f) return PATH_TX[path] ? tt(PATH_TX[path]) : path;
  const tr = s => FIELD_TX[s] ? tt(FIELD_TX[s]) : s,
    label = f[1].split(' · ').map(tr).join(' · ');
  return group ? `${tr(f[0])} · ${label}` : label;
}

// ---------------------------------------------------------------- unités et formats
/** Carburant v (unité de la fiche) dans l'unité affichée, arrondi et formaté. */
function fuelTxt(v, unit) {
  if (!Number.isFinite(v)) return '—';
  const to = S.settings.displayUnit || unit || 'kg',
    x = unit && to !== unit ? window.FuelModel.convertFuel(v, unit, to) : v;
  return `${Math.round(x).toLocaleString(S.ctx.lang())} ${to}`;
}

/** Unités d'affichage de la vitesse (kt, km/h), de l'altitude (ft, m) et de la distance (NM, km, SM) : le modèle, le vol
 *  courant et les fiches gardent kt, ft et NM ; la conversion est ici, à l'écran, dans les deux sens (affichage et
 *  saisie), comme pour le carburant. Un niveau de vol (FL120, centaines de pieds) reste un niveau de vol quelle que
 *  soit l'unité d'altitude. Un nombre affiché qui porte l'une de ces unités passe par les aides de sa grandeur :
 *  `Txt` (nombre arrondi et unité), `Num` (nombre arrondi seul, pour un tableau dont l'en-tête porte l'unité), `Field`
 *  (valeur d'un champ de saisie), `Parse` (texte saisi → unité du modèle) et `Label` (symbole). Le symbole d'une unité
 *  n'est pas traduit. */
const UNITS = {
  speed: {
    key: 'displaySpeed',
    base: 'kt',
    list: ['kt', 'kmh'],
    label: {
      kt: 'kt',
      kmh: 'km/h'
    },
    conv: 'convertSpeed'
  },
  alt: {
    key: 'displayAlt',
    base: 'ft',
    list: ['ft', 'm'],
    label: {
      ft: 'ft',
      m: 'm'
    },
    conv: 'convertAlt'
  },
  dist: {
    key: 'displayDist',
    base: 'NM',
    list: ['NM', 'km', 'SM'],
    label: {
      NM: 'NM',
      km: 'km',
      SM: 'SM'
    },
    conv: 'convertDist'
  }
};
/** Unité affichée d'une grandeur (speed, alt, dist) : le réglage, sinon (absent ou inconnu) l'unité du modèle. */
function unitOf(kind) {
  const u = UNITS[kind],
    v = S.settings[u.key];
  return u.list.includes(v) ? v : u.base;
}
/** Aides d'une grandeur : kind (speed, alt, dist) ; perMin : vitesse verticale (unité d'altitude par minute). */
function unitHelpers(kind, perMin = false) {
  const u = UNITS[kind],
    suffix = perMin ? '/min' : '',
    has = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v),
    to = v => window.FuelModel[u.conv](+v, u.base, unitOf(kind)),
    label = () => u.label[unitOf(kind)] + suffix,
    fmt = v => has(v) ? Math.round(to(v)).toLocaleString(S.ctx.lang()) : '—';
  return {
    label,
    num: fmt,
    txt: v => has(v) ? `${fmt(v)} ${label()}` : '—',
    // valeur du champ de saisie : nombre arrondi à l'entier, sans séparateur ; vide sans valeur
    field: v => has(v) ? Math.round(to(v)) : '',
    // texte saisi (unité affichée) → unité du modèle, au centième près quand l'unité change (l'entier saisi revient à
    // l'identique à l'affichage) ; null si vide ou illisible
    parse: text => {
      const x = num(text);
      if (x === null) return null;
      const m = window.FuelModel[u.conv](x, unitOf(kind), u.base);
      return unitOf(kind) === u.base ? m : Math.round(m * 100) / 100;
    }
  };
}
/** Une aide par grandeur et par rôle (les réglages sont lus à chaque appel) ; vs : vitesse verticale (ft/min, m/min). */
const speedTxt = v => unitHelpers('speed').txt(v),
  speedNum = v => unitHelpers('speed').num(v),
  speedField = v => unitHelpers('speed').field(v),
  speedParse = t => unitHelpers('speed').parse(t),
  speedLabel = () => unitHelpers('speed').label(),
  altTxt = v => unitHelpers('alt').txt(v),
  altNum = v => unitHelpers('alt').num(v),
  altLabel = () => unitHelpers('alt').label(),
  distTxt = v => unitHelpers('dist').txt(v),
  distField = v => unitHelpers('dist').field(v),
  distParse = t => unitHelpers('dist').parse(t),
  distLabel = () => unitHelpers('dist').label(),
  vsTxt = v => unitHelpers('alt', true).txt(v),
  vsNum = v => unitHelpers('alt', true).num(v),
  vsField = v => unitHelpers('alt', true).field(v),
  vsParse = t => unitHelpers('alt', true).parse(t),
  vsLabel = () => unitHelpers('alt', true).label();

// ---------------------------------------------------------------- géographie
/** Distance orthodromique (NM) entre deux points { lat, lon }. */
function gcNm(a, b) {
  const r = Math.PI / 180,
    d = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(d)));
}
/** Route vraie initiale (°) de a vers b. */
function bearing(a, b) {
  const r = Math.PI / 180,
    y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r),
    x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
/** Points d'une route. Deux formes : la liste « ID lat lon[/N0450F370] » d'un OFP (une entrée par ligne ou virgule),
 *  ou un texte libre façon item 15 (« LFBO N0450F350 DCT TOU UN460 NTS/F280 LFRN »). Dans le texte libre : groupes
 *  vitesse-niveau et DCT écartés (le niveau d'un groupe, ou un « /Fnnn » collé à un point, devient l'alt_ft de ce
 *  point) ; voies aériennes et procédures gardées telles quelles dans le texte (pas de points) ; coordonnées OACI
 *  (4436N00612E, 44N006E) et « NOM lat lon » lus comme points ; un identifiant cherché dans aerodb, sinon dans known
 *  (points déjà connus du vol : un point posé à la main garde sa position), sinon signalé inconnu. Départ et arrivée
 *  ajoutés aux extrémités s'ils manquent. Les niveaux ne restent que là où ils changent, jamais au départ ni à
 *  l'arrivée. Sortie : { points, unresolved, tokens } — tokens : la suite lue ({ pt: point } | { keep: mot }) pour
 *  réécrire le texte normalisé (routeText). */
async function routePoints(text, dep, arr, known = new Map()) {
  const ctx = S.ctx,
    points = [],
    unresolved = [],
    tokens = [];
  /** Position d'un identifiant : aerodb, sinon un point déjà connu du vol ; null sinon. */
  const find = async id => {
    const c = ctx.aerodb ? await ctx.aerodb.coords(id).catch(() => null) : null;
    if (c && Number.isFinite(+c.lat)) return {
      lat: +c.lat,
      lon: +c.lon
    };
    const k = known.get(id);
    return k ? {
      lat: k.lat,
      lon: k.lon
    } : null;
  };
  /** Ajoute un point (et son jeton) ; son niveau s'il en a un. */
  const add = (id, c, alt) => {
    const p = {
      id,
      lat: c.lat,
      lon: c.lon,
      ...(alt ? {
        alt_ft: alt
      } : {})
    };
    points.push(p);
    tokens.push({
      pt: p
    });
  };
  // jetons du texte (frame/lib/route_text.js) ; un nom est cherché dans aerodb, puis parmi les points connus
  for (const t of RT.tokenize(text)) {
    if (t.kind === 'group') { // groupe vitesse-niveau seul : niveau du dernier point
      if (t.alt_ft && points.length) points.at(-1).alt_ft = t.alt_ft;
    } else if (t.kind === 'coord') add(t.id, t, t.alt_ft);
    else if (t.kind === 'name') {
      const c = await find(t.id);
      if (c) add(t.id, c, t.alt_ft);
      else {
        if (!t.airway) unresolved.push(t.id); // voie aérienne ou procédure : gardée dans le texte, sans alerte
        tokens.push({
          keep: t.id
        });
      }
    } else tokens.push({
      keep: t.id
    });
  }
  if (dep && points[0]?.id !== dep) {
    const c = await find(dep);
    if (c) {
      const p = {
        id: dep,
        lat: c.lat,
        lon: c.lon
      };
      points.unshift(p);
      tokens.unshift({
        pt: p
      });
    } else if (!unresolved.includes(dep)) unresolved.unshift(dep);
  }
  if (arr && points.at(-1)?.id !== arr) {
    const c = await find(arr);
    if (c) add(arr, c);
    else if (!unresolved.includes(arr)) unresolved.push(arr);
  }
  // niveaux : seuls les changements restent (une route d'OFP répète son niveau à chaque point), jamais au départ ni à
  // l'arrivée — le vol part au niveau du plan
  let prev = points[0]?.alt_ft;
  points.forEach((p, i) => {
    const a = p.alt_ft;
    if (!i || i === points.length - 1 || a === prev) delete p.alt_ft;
    if (a) prev = a;
  });
  return {
    points,
    unresolved,
    tokens
  };
}
/** Texte normalisé de la route : « DEP PT1 UN460 PT2/F280 … ARR » — points par leur identifiant (niveau en /Fnnn là
 *  où il change), voies, procédures et mots inconnus gardés à leur place, une seule ligne (frame/lib/route_text.js). */
const routeText = RT.textFromTokens;

// ---------------------------------------------------------------- données (vol courant, réglages, fiches)
/** Chemin d'un document du pilote (trigramme de l'identité, ANON sans identité). */
const pilotPath = name => `pilot/${S.ctx.identity.trigram || 'ANON'}/${name}`;
/** Vol courant vide (schéma 1, INTEGRATION.md § 3). */
const emptyFlight = () => ({
  schema: 1,
  aircraft: {},
  route: {
    text: '',
    dep: '',
    arr: '',
    altn: '',
    points: [],
    distanceNm: null,
    trackDeg: null
  },
  level: {
    ft: null
  },
  wind: null,
  isaDev: 0,
  ofp: null
});
/** Logique des fiches (lecture des formats, fusion, ChatGPT, .lnmperf) : celle d'aerodb (AeroDBSheets). */
const SH = () => S.A?.lib || window.AeroDBSheets;
/** Fiches du registre d'aerodb (les plus récentes d'abord) ; aucune sans aerodb. */
async function readSheets() {
  const s = S,
    // types de la compagnie (flotte, référence) : ceux sans fiche sont proposés « à compléter » (comme la V2) ; les deux
    // lectures ensemble
    [list, co] = await Promise.all([S.A?.sheets ? S.A.sheets.list().catch(() => []) : [], S.A?.fleetTypes ? S.A.fleetTypes()
      .catch(() => []) : []
    ]);
  if (gone(s)) return;
  S.sheets = list;
  S.coTypes = co;
}
/** Enregistre une fiche par aerodb (champs changés tamponnés avec leur source, fichier aircraft/sheets/<id>.json et
 *  miroir V2 écrits par aerodb), puis relit la liste. */
async function storeSheet(p, source = 'edit') {
  const s = S;
  await S.A.sheets.put(plain(p), {
    source
  });
  if (gone(s)) return;
  await readSheets();
  if (!gone(s)) S.ctx.notify(tt(TX.saved), 'ok');
}
/** Écrit le vol courant (après un temps calme) : relu juste avant, seuls les champs de fuel remplacés (et dans progress
 *  ses seules clés : progress.actual appartient au cadre), le reste gardé tel qu'il est (frame/lib/current_flight.js). */
function saveFlight() {
  if (S.flightPending) return; // vol courant pas encore lu : l'écrire effacerait le vrai
  clearTimeout(S.flightTimer);
  const s = S; // gardé : l'écriture part même si le module est démonté entre-temps
  s.flightTimer = setTimeout(async () => {
    const path = `pilot/${s.ctx.identity.trigram || 'ANON'}/current_flight.json`,
      cur = (await s.ctx.data.get(path)) || {};
    s.flight = CF.merge(cur, s.flight, {
      fields: CF.FUEL_FIELDS,
      progressKeys: CF.FUEL_PROGRESS,
      by: 'fuel'
    });
    s.writing = s.flight.updated_at;
    await s.ctx.data.put(path, s.flight);
  }, 300);
}
/** Écrit les réglages du devis (après un temps calme). */
function saveSettings() {
  clearTimeout(S.setTimer);
  const s = S;
  s.setTimer = setTimeout(() => s.ctx.data.put(`pilot/${s.ctx.identity.trigram || 'ANON'}/fuel.json`, {
    ...s.settings,
    schema: 1,
    updated_at: new Date().toISOString()
  }), 800);
}

// ---------------------------------------------------------------- calcul du devis et de la décision
/** Fiche du vol (normalisée) : celle de l'appareil choisi, sinon son type seul (estimation aerodb) ; null tant
 *  qu'aucun appareil n'est choisi (plus de première fiche de la liste par défaut : le devis attend le choix). */
function currentSheet() {
  const a = S.flight.aircraft || {},
    raw = S.sheets.find(p => p.id === a.sheetId) || null;
  if (raw) return window.FuelModel.normalizeSheet(structuredClone(raw));
  if (a.type) return window.FuelModel.normalizeSheet({
    id: `TYPE_${a.type}`,
    icao: a.type,
    name: a.type,
    unit: 'kg'
  });
  return null;
}
/** Devis complet du vol courant : { sheet, source, perf, q, D (décision), G (montée), goal } ; champs absents quand les
 *  entrées manquent. */
function compute() {
  const M = window.FuelModel,
    L = window.FuelLevels,
    A = S.A,
    f = S.flight,
    sheet = currentSheet();
  if (!sheet) return {};
  const code = sheet.icao || sheet.type || sheet.id,
    apd = A?.perf?.(code) || null,
    levelFt = +f.level?.ft || +sheet.cruise.refAltFt || 0,
    entry = num(S.settings.entries?.[sheet.id]),
    source = M.cruiseSource({
      sheet,
      altFt: levelFt,
      entryKg: entry,
      apd,
      simbrief: apd?.simbrief,
      estimate: A?.estimate?.([sheet.type, sheet.icao, sheet.id].filter(Boolean)) || null
    }),
    perf = M.perfModel(sheet, source, {
      apd,
      db: {
        [code]: {
          description: A?.record?.(code)?.description
        }
      },
      dIsa: +f.isaDev || 0
    }),
    o = perf ? {
      profileIas: +M.modelSheet(sheet, source, apd).climb.iasKt || 0,
      curve: sheet.rpmFuelCurve
    } : {};
  if (perf) {
    S.manual = L.manualSettings(perf, sheet, S.manual);
    if (S.manualIn) Object.assign(S.manual, S.manualIn);
    o.manual = S.manual;
  }
  const goal = perf ? L.goalNow(S.settings.goal || 'prof', o.profileIas) : null,
    distanceNm = +f.route?.distanceNm || 0,
    qIn = {
      sheet,
      source,
      perf,
      apd,
      distanceNm,
      levelFt,
      trackDeg: +f.route?.trackDeg || 0,
      wind: f.wind || null,
      taxiMin: +S.settings.taxiMin,
      reserveMin: +S.settings.reserveMin,
      contingencyPct: +S.settings.contingencyPct,
      climbLaw: perf ? L.tripLaw(perf, goal, o) : null,
      steps: routeSteps(f.route, distanceNm)
    },
    q = distanceNm > 0 ? M.quote(qIn) : null,
    D = perf && q ? requoteDecision(L.decisionSeries(perf, {
      distanceNm,
      wc: q.windKnown ? q.wc : 0
    }, goal, o), h => M.quote({
      ...qIn,
      levelFt: h,
      // au niveau retenu : le devis tel quel (vent, paliers de la route) ; ailleurs, vol à ce niveau avec le vent de la
      // prévision à ce niveau quand la météo réelle le donne
      wind: h === levelFt ? qIn.wind : aloftMeanAt(h) || qIn.wind,
      steps: h === levelFt ? qIn.steps : null
    })) : null,
    G = perf && levelFt > 0 ? L.climbGuide(perf, levelFt, goal, o) : null;
  return {
    sheet,
    source,
    perf,
    q,
    D,
    G,
    goal,
    levelFt
  };
}

// ---------------------------------------------------------------- dessins SVG
/** Taille du dessin : largeur de son conteneur (320 à 760), hauteur en proportion (300 au plus). */
const svgSize = box => {
  const w = Math.round(Math.max(320, Math.min(760, box?.clientWidth || 360)));
  return [w, Math.min(300, Math.round(w * .5))];
};
/** Vrai si le plafond du devis ne vient pas d'une fiche : fiche sans plafond (celui du modèle), type seul (estimation
 *  aerodb), ou croisière estimée. */
const ceilEstimated = C => !(+C.sheet?.cruise?.ceilingFt > 0) || String(C.sheet?.id || '').startsWith('TYPE_') || C.source?.kind ===
  'estimate';
/** Graduations « rondes » de 0 à max (cinq environ). */
function ticks(min, max, n = 5) {
  const span = Math.max(1e-9, max - min),
    raw = span / n,
    p = 10 ** Math.floor(Math.log10(raw)),
    step = [1, 2, 2.5, 5, 10].map(k => k * p).find(s => s >= raw),
    out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}
/** Courbe de décision chiffrée comme le devis : chaque niveau tenable (sous le plafond, non extrapolé) reprend le
 *  délestage et la durée de M.quote à ce niveau (même vent, même loi de montée, même descente), de sorte qu'au niveau
 *  retenu la courbe et le devis disent le même chiffre ; le moins de carburant et le plus court sont relus ensuite. Les
 *  points au-delà du plafond gardent le prolongement du modèle (pointillés). */
function requoteDecision(D, quoteAt) {
  if (!D) return D;
  const memo = new Map(),
    fix = r => {
      if (!r || !r.ok || r.extrap || r.h > D.hi) return r;
      if (!memo.has(r.h)) memo.set(r.h, quoteAt(r.h));
      const x = memo.get(r.h);
      return x?.hasFuel && Number.isFinite(x.trip) && Number.isFinite(x.minutes) ? {
        ...r,
        fuel: x.trip,
        minutes: x.minutes
      } : r;
    };
  D.rows = D.rows.map(fix);
  D.real = D.real.map(fix);
  D.all = D.all.map(fix);
  D.best = D.real.reduce((a, b) => b.fuel < a.fuel ? b : a);
  D.fast = D.real.reduce((a, b) => b.minutes < a.minutes ? b : a);
  return D;
}
/** Courbes de la décision du niveau : carburant (trait plein) et temps (tirets) du trajet entier selon le niveau, partie
 *  extrapolée au-delà du plafond en pointillés, zone non tenable grisée, plafond, moins de carburant (rond), plus rapide
 *  (carré), niveau du plan (trait vertical). */
function decisionSvg(C, box) {
  const {
    D,
    sheet,
    levelFt
  } = C, [W, H] = svgSize(box), pl = 48, pr = 44, pt = 24, pb = 30,
    rows = D.rows.filter(r => r && Number.isFinite(r.fuel) && Number.isFinite(r.minutes)),
    fuels = rows.map(r => r.fuel),
    mins = rows.map(r => r.minutes),
    fMin = Math.min(...fuels) * .97,
    fMax = Math.max(...fuels) * 1.02,
    tMin = Math.min(...mins) * .97,
    tMax = Math.max(...mins) * 1.02,
    x = h => pl + h / D.xmax * (W - pl - pr),
    yf = v => pt + (1 - (v - fMin) / ((fMax - fMin) || 1)) * (H - pt - pb),
    yt = v => pt + (1 - (v - tMin) / ((tMax - tMin) || 1)) * (H - pt - pb),
    ceil = S.C.perf.ceiling;
  /** Tracé d'une série (morceaux continus), réelle ou extrapolée. */
  const path = (y, k, ext) => {
    let d = '',
      on = false;
    for (const r of D.rows) {
      const ok = r && Number.isFinite(r[k]) && !!r.extrap === ext;
      if (ok) d += `${on ? 'L' : 'M'}${x(r.h).toFixed(1)},${y(r[k]).toFixed(1)}`;
      on = ok;
    }
    return d;
  };
  const xt = ticks(0, D.xmax, W < 420 ? 6 : 10).filter(v => v > 0),
    ft = ticks(fMin, fMax, 4),
    tm = ticks(tMin, tMax, 4),
    gap = D.gap ? `<rect x="${x(D.gap.from)}" y="${pt}" width="${Math.max(0, x(Math.min(ceil, D.xmax)) - x(D.gap.from))}" height="${H - pt - pb}" class="fu-gap"/>` : '',
    mk = (r, cls, sq) => r ? sq ? `<rect x="${x(r.h) - 5}" y="${yt(r.minutes) - 5}" width="10" height="10" class="${cls}"/>` : `<circle cx="${x(r.h)}" cy="${yf(r.fuel)}" r="5.5" class="${cls}"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tt(TX.decision))}" class="fu-svg" data-chart="decision">
    ${gap}
    ${xt.map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pt}" y2="${H - pb}" class="fu-grid"/><text x="${x(v)}" y="${H - pb + 16}" text-anchor="middle">${flTxt(v)}</text>`).join('')}
    ${ft.map(v => `<text x="${pl - 6}" y="${yf(v) + 4}" text-anchor="end" class="fu-fuel">${Math.round(v / (v >= 10000 ? 1000 : 1)).toLocaleString(S.ctx.lang())}${v >= 10000 ? 'k' : ''}</text>`).join('')}
    ${tm.map(v => `<text x="${W - pr + 6}" y="${yt(v) + 4}" class="fu-time">${hmm(v)}</text>`).join('')}
    <text x="${pl - 6}" y="12" text-anchor="end" class="fu-fuel fu-unit">${esc(sheet.unit)}</text>
    ${ceil < D.xmax ? `<line x1="${x(ceil)}" x2="${x(ceil)}" y1="${pt}" y2="${H - pb}" class="fu-ceil"/>` : ''}
    <path d="${path(yt, 'minutes', false)}" class="fu-line-t"/><path d="${path(yt, 'minutes', true)}" class="fu-line-t fu-ext"/>
    <path d="${path(yf, 'fuel', false)}" class="fu-line-f"/><path d="${path(yf, 'fuel', true)}" class="fu-line-f fu-ext"/>
    ${levelFt > 0 && levelFt <= D.xmax ? `<line x1="${x(levelFt)}" x2="${x(levelFt)}" y1="${pt}" y2="${H - pb}" class="fu-plan"/>` : ''}
    ${mk(D.best, 'fu-best')}${mk(D.fast, 'fu-fast', true)}
    <rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent" data-pick data-x0="${pl}" data-x1="${W - pr}" data-max="${D.xmax}" style="cursor:crosshair"/>
  </svg>`;
}
/** Profil de la montée : altitude selon le temps, un repère par relevé (Badin à côté), niveau visé en tirets. */
function climbSvg(G, box) {
  const [W, H0] = svgSize(box), H = Math.round(H0 * .8), pl = 48, pr = 64, pt = 12, pb = 28,
    tMax = Math.max(1, G.minutes) * 1.04,
    x = t => pl + t / tMax * (W - pl - pr),
    y = h => pt + (1 - h / (G.top * 1.05)) * (H - pt - pb),
    d = G.rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.t).toFixed(1)},${y(r.h).toFixed(1)}`).join('');
  // Badin écrit à côté d'un repère seulement s'il ne chevauche pas le précédent (14 px), le niveau toujours
  let lastY = Infinity;
  const label = G.rows.map((r, i) => {
    const yy = y(r.h),
      keep = i === G.rows.length - 1 || lastY - yy >= 14 && y(G.top) - yy < -14;
    if (keep) lastY = yy;
    return keep;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tt(TX.climbGuide))}" class="fu-svg" data-chart="climb">
    ${ticks(0, tMax, 4).map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pt}" y2="${H - pb}" class="fu-grid"/><text x="${x(v)}" y="${H - pb + 16}" text-anchor="middle">${Math.round(v)}′</text>`).join('')}
    <line x1="${pl}" x2="${W - pr}" y1="${y(G.top)}" y2="${y(G.top)}" class="fu-plan"/>
    <text x="${pl - 6}" y="${y(G.top) + 4}" text-anchor="end">${flTxt(G.top)}</text>
    <path d="${d}" class="fu-line-f"/>
    ${G.rows.map((r, i) => `<circle cx="${x(r.t)}" cy="${y(r.h)}" r="3.5" class="fu-best"/>${label[i] ? `<text x="${x(r.t) + 7}" y="${y(r.h) + 4}" class="fu-time">${esc(speedTxt(r.ias))}</text>` : ''}`).join('')}
  </svg>`;
}

// ---------------------------------------------------------------- styles du module (jetons du cadre)
// placement seulement (primitives et jetons du cadre : frame/design/INTEGRATION.md) ; les dessins prennent leurs
// couleurs dans --sog-chart-* (suivent le design et la nuit sans redessin)
const STYLE = `
[data-module="fuel"] .fu-g3{--f-min:96px}
[data-module="fuel"] .fu-ads{grid-template-columns:repeat(3,minmax(0,8em))} /* codes OACI : 4 lettres, pas plus large */
[data-module="fuel"] .fu-flight{display:flex;flex-wrap:wrap;align-items:flex-end} /* niveau et date à leur largeur utile ; la date passe dessous sur un téléphone */
[data-module="fuel"] .fu-flight>.f-field:first-child{flex:0 0 8em}
[data-module="fuel"] .fu-flight>.f-field:last-child{flex:1 1 20em;max-width:26em}
[data-module="fuel"] .fu-when{display:flex;gap:4px;align-items:stretch}
[data-module="fuel"] .fu-when input{flex:1;min-width:0}
[data-module="fuel"] .fu-when button{flex:none;min-width:44px;min-height:44px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;gap:2px}
[data-module="fuel"] .fu-when button b{font-size:.8em}
[data-module="fuel"] input.fu-code{text-transform:uppercase}
[data-module="fuel"] .fu-hide{display:none}
[data-module="fuel"] .fu-cat{margin:var(--sog-gap) 0 4px;font-size:1em;color:var(--sog-muted)}
[data-module="fuel"] .fu-block{display:block}
[data-module="fuel"] [data-acsel]{flex-wrap:nowrap}
[data-module="fuel"] [data-acsel] .f-muted{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="fuel"] [data-acsel] button{margin-left:auto;flex:none}
[data-module="fuel"] .fu-svg{display:block;max-width:100%;height:auto;touch-action:manipulation}
[data-module="fuel"] .fu-svg text{font-size:11px;fill:var(--sog-muted)}
[data-module="fuel"] .fu-grid{stroke:var(--sog-chart-grid);stroke-width:1}
[data-module="fuel"] .fu-gap{fill:var(--sog-chart-5);opacity:.12}
[data-module="fuel"] .fu-ceil{stroke:var(--sog-chart-5);stroke-dasharray:2 3}
[data-module="fuel"] .fu-plan{stroke:var(--sog-fg);stroke-width:2;stroke-dasharray:6 4}
[data-module="fuel"] .fu-line-f{fill:none;stroke:var(--sog-chart-1);stroke-width:2.2}
[data-module="fuel"] .fu-line-t{fill:none;stroke:var(--sog-chart-2);stroke-width:1.6;stroke-dasharray:5 4}
[data-module="fuel"] .fu-ext{stroke-dasharray:1 4;opacity:.7}
[data-module="fuel"] .fu-da{fill:none;stroke:var(--sog-chart-6);stroke-width:1;opacity:.7}
[data-module="fuel"] .fu-step[hidden]{display:none}
[data-module="fuel"] .fu-startnote:empty{display:none}
[data-module="fuel"] .fu-flightstate{font-weight:700;color:var(--sog-accent)}
[data-module="fuel"] .fu-eta{grid-template-columns:1fr auto}
[data-module="fuel"] .fu-next-pt{border-color:var(--sog-accent);box-shadow:inset 3px 0 0 var(--sog-accent)}
[data-module="fuel"] .fu-steps>button{flex:1 1 0;min-width:44px;padding-inline:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-module="fuel"] .fu-steps>button span{display:none} /* étroit : le numéro seul, le nom pour le pas en cours */
[data-module="fuel"] .fu-steps>button[aria-current]{flex:3 1 0}
[data-module="fuel"] .fu-steps>button[aria-current] span{display:inline}
@container (min-width: 560px){
  [data-module="fuel"] .fu-steps>button span{display:inline}
  [data-module="fuel"] .fu-steps>button[aria-current]{flex:1 1 0}
}
[data-module="fuel"] .fu-next{justify-content:flex-end;margin:4px 0 var(--sog-gap)}
[data-module="fuel"] .fu-sumroute{white-space:normal;word-break:break-word;font-size:14px}
@container (min-width: 900px){ /* module large : tous les pas visibles, sans barre de pas ni « Suivant » */
  [data-module="fuel"] .fu-steps,[data-module="fuel"] .fu-next{display:none}
  [data-module="fuel"] .fu-step[hidden]{display:block}
}
[data-module="fuel"] .fu-rinfo{flex-wrap:wrap;gap:4px 12px;margin:4px 0}
[data-module="fuel"] .fu-linkbtn{min-height:44px;padding:0 4px;border:0;background:none;color:var(--sog-link);text-decoration:underline;font:inherit;cursor:pointer}
[data-module="fuel"] .fu-pt{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}
[data-module="fuel"] .fu-ptid{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
[data-module="fuel"] .fu-ptid small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
[data-module="fuel"] .f-card .fu-pt input[data-k]{width:4.2em;flex:none;text-align:center}
[data-module="fuel"] .fu-ptgap{width:4.2em;flex:none}
[data-module="fuel"] .fu-pt button{flex:none;min-width:44px;padding:0;display:inline-flex;align-items:center;justify-content:center}
[data-module="fuel"] .fu-addpt{flex-wrap:nowrap}
[data-module="fuel"] .fu-addpt input{flex:1;min-width:0}
[data-module="fuel"] .fu-addpt button{flex:none;min-width:44px}
[data-module="fuel"] .fu-isa{fill:none;stroke:var(--sog-muted);stroke-width:1.2;stroke-dasharray:5 4}
[data-module="fuel"] .fu-inv{fill:var(--sog-chart-4);opacity:.18}
[data-module="fuel"] .fu-now{stroke:var(--sog-chart-2);stroke-width:1.5;stroke-dasharray:5 3}
[data-module="fuel"] .fu-best{fill:var(--sog-chart-3)}
[data-module="fuel"] .fu-fast{fill:var(--sog-chart-4)}
[data-module="fuel"] .fu-legend{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px}
[data-module="fuel"] .fu-legend .f-dot{margin-right:6px}
[data-module="fuel"] .fu-legend .fu-sq{border-radius:0}
[data-module="fuel"] .fu-result{display:block}
[data-module="fuel"] .fu-big{font-size:var(--sog-h1);font-weight:700;line-height:1.2}
[data-module="fuel"] .fu-result .f-tiles{grid-template-columns:repeat(3,minmax(0,1fr));margin:6px 0 0}
[data-module="fuel"] .fu-result .f-tiles b{font-size:var(--sog-h3)}
[data-module="fuel"] .fu-links .f-item{display:block}
[data-module="fuel"] .fu-links small{display:block}
[data-module="fuel"] .fu-links .fu-off{opacity:.55}
[data-module="fuel"] .f-list .f-row{justify-content:flex-end}
[data-module="fuel"] .fu-wx{padding:8px 0;border-bottom:1px solid var(--sog-border)}
[data-module="fuel"] .fu-wx:last-child{border-bottom:0}`;

// ---------------------------------------------------------------- écran Préparer
/** Redessine l'écran Préparer en gardant le champ en cours de frappe et le défilement (renderPlanBody fait le dessin). */
function renderPlan() {
  // champ en cours de frappe (data-k, et data-i pour les niveaux des points) : valeur, focus et sélection rendus par
  // keepScroll du cadre (frame/lib/dom.js) — un rendu ne réécrit jamais ce que l'on tape
  keepScroll(S.body, renderPlanBody);
}
/** Dessine l'écran Préparer (champs une fois ; résultats redessinés par refresh). */
function renderPlanBody() {
  const f = S.flight,
    r = f.route || {},
    opt = (v, l, on) => `<option value="${esc(v)}"${on ? ' selected' : ''}>${esc(l)}</option>`,
    fld = (key, label, val, attrs = '', vals) => `<label class="f-field">${esc(tt(label, vals))}<input data-k="${key}" value="${esc(val ?? '')}" ${attrs}></label>`;
  const step = S.step ?? 0,
    sec = (i, body, last = false) => `<section class="fu-step" data-s="${i}"${step === i ? '' : ' hidden'}>${body}${last ? '' : `<div class="f-row fu-next"><button type="button" data-step="${i + 1}">${esc(tt(TX.next))} · ${esc(tt(TX.stepNames[i + 1]))}</button></div>`}</section>`;
  S.body.innerHTML = `
  <nav class="f-steps fu-steps" aria-label="${esc(tt(TX.stepsNav))}">${TX.stepNames.map((n, i) => `<button type="button" data-step="${i}"${step === i ? ' aria-current="step"' : ''} aria-label="${i + 1} ${esc(tt(n))}"><b>${i + 1}</b><span> ${esc(tt(n))}</span></button>`).join('')}</nav>
  ${sec(0, `<div class="f-card" data-block="flight"><h2>${esc(tt(TX.stepNames[0]))}</h2>
      <div class="f-grid fu-ads">${fld('dep', TX.dep, r.dep, 'class="fu-code" maxlength="4" autocapitalize="characters"')}${fld('arr', TX.arr, r.arr, 'class="fu-code" maxlength="4" autocapitalize="characters"')}${fld('altn', TX.altn, r.altn, 'class="fu-code" maxlength="4" autocapitalize="characters"')}</div>
      <div class="f-grid fu-flight">${fld('fl', TX.level, f.level?.ft ? Math.round(f.level.ft / 100) : '', 'inputmode="numeric"')}<label class="f-field">${esc(tt(TX.wxDate))}<span class="fu-when"><input data-k="wxdate" type="datetime-local" value="${esc(f.weather?.when || '')}"><button type="button" data-do="when30" aria-label="${esc(tt(TX.when30))}" title="${esc(tt(TX.when30))}">${svg('clock')}<b>+30</b></button><button type="button" data-do="whennow" aria-label="${esc(tt(TX.whenNowLong))}" title="${esc(tt(TX.whenNowLong))}">${esc(tt(TX.whenNow))}</button></span></label></div>
      <div data-block="aircraft">
      <div class="f-row" data-acsel></div>
      <div class="fu-hide" data-acpanel>
        <label class="f-field"><input type="search" data-k="acsearch" placeholder="${esc(tt(TX.acSearch))}" aria-label="${esc(tt(TX.acSearch))}" autocomplete="off"></label>
        <div class="f-list" data-acres></div>
      </div>
      <p class="f-muted" data-src></p>
      </div>
    </div>`)}
  ${sec(1, `<div class="f-card" data-block="route"><h2>${esc(tt(TX.route))}</h2>
      <label class="f-field">${esc(tt(TX.routeText))}<textarea data-k="rtext" rows="3" autocapitalize="characters" spellcheck="false">${esc(r.text || '')}</textarea></label>
      <p class="f-warn" data-unres></p>
      <p class="f-row fu-rinfo"><span class="f-muted" data-rinfo></span><button type="button" class="fu-linkbtn" data-do="rmanual">${esc(tt(TX.rmanual))}</button></p>
      <div class="f-grid fu-g3 fu-hide" data-rmanual>${fld('dist', TX.distance, distField(r.distanceNm), 'inputmode="decimal"', { u: distLabel() })}${fld('trk', TX.track, r.trackDeg != null ? Math.round(r.trackDeg) : '', 'inputmode="numeric"')}</div>
      <details data-fold="pts"><summary data-ptsn>${esc(tt(TX.ptsN, { n: (r.points || []).length }))}</summary>
      <div class="f-list fu-pts" data-pts></div>
      <div class="f-row fu-addpt"><input data-k="addpt" autocapitalize="characters" autocomplete="off" placeholder="${esc(tt(TX.addPt))}" aria-label="${esc(tt(TX.addPt))}"><button type="button" data-do="addpt" aria-label="${esc(tt(TX.add))}">${svg('plus')}</button></div>
      <p class="f-muted">${esc(tt(TX.ptsHint))}</p></details>
      <div class="f-row">${S.ctx.identity.simbrief ? `<button type="button" data-do="simbrief">${esc(tt(TX.simbrief))}</button>` : `<span class="f-muted">${esc(tt(TX.noSimbrief))}</span>`}<button type="button" data-do="showmap"${S.ctx.layout?.with === 'maps' ? ' class="fu-hide"' : ''}>${svg('map')} ${esc(tt(TX.showMap))}</button></div>
    </div>`)}
  ${sec(2, `<div class="f-card" data-block="level"><h2>${esc(tt(TX.stepNames[2]))}</h2>
      <div class="f-grid fu-g3">${fld('wdir', TX.windDir, f.wind?.dirDeg ?? '', 'inputmode="numeric"')}${fld('wkt', TX.windKt, speedField(f.wind?.speedKt), 'inputmode="numeric"', { u: speedLabel() })}${fld('isa', TX.isa, f.isaDev || '', 'inputmode="numeric"')}</div>
      <p class="f-muted" data-windsrc></p>
      <div class="f-row" data-isahint></div>
      <label class="f-check"><input type="checkbox" data-k="wxreal"${f.weather?.real ? ' checked' : ''}>${esc(tt(TX.wxReal))}</label>
      <div class="f-row"><button type="button" data-do="wx">${esc(tt(TX.wxRead))}</button></div>
    </div>
  <div class="f-card"><h2>${esc(tt(TX.wxTitle))}</h2><div data-wx></div></div>
  <div class="f-card"><h2>${esc(tt(TX.aloftTitle))}</h2><div data-aloft></div></div>`)}
  ${sec(3, `  <details class="f-card" data-fold="da"><summary>${esc(tt(TX.da))}</summary><div data-da></div></details>
  <div class="f-card" data-block="decision"><h2>${esc(tt(TX.decision))}</h2><div data-dec></div>      <div class="f-grid fu-g3"><label class="f-field">${esc(tt(TX.goal))}<select data-k="goal">${window.FuelLevels.GOALS.map(g => opt(g, tt(TX.goals[g]), (S.settings.goal || 'prof') === g)).join('')}</select></label></div>
      <div class="f-grid fu-g3 ${(S.settings.goal || 'prof') === 'man' ? '' : 'fu-hide'}" data-manbox>${fld('mias', TX.manIas, speedField(S.manualIn?.ias), 'inputmode="numeric"', { u: speedLabel() })}${fld('mvs', TX.manVs, vsField(S.manualIn?.vs), 'inputmode="numeric"', { u: vsLabel() })}</div>
</div>
  <details class="f-card" data-fold="openin"><summary>${esc(tt(TX.openIn))}</summary><p class="f-muted">${esc(tt(TX.openInHint))}</p><div class="f-list fu-links" data-openin></div></details>
  <details class="f-card" data-fold="details"><summary>${esc(tt(TX.details))}</summary><div data-details></div></details>
  <details class="f-card" data-fold="climb"><summary>${esc(tt(TX.climbGuide))}</summary><div data-climb></div></details>
  <details class="f-card" data-fold="settings"><summary>${esc(tt(TX.settings))}</summary>
    <div class="f-grid fu-g3">${fld('taxiMin', TX.taxiMin, S.settings.taxiMin, 'inputmode="numeric"')}${fld('reserveMin', TX.reserveMin, S.settings.reserveMin, 'inputmode="numeric"')}${fld('contPct', TX.contPct, S.settings.contingencyPct, 'inputmode="decimal"')}${fld('wxRadius', TX.wxRadius, S.settings.wxRadiusNm ?? 10, 'inputmode="numeric"')}
    </div>
    <p class="f-muted" style="margin:8px 0 4px">${esc(tt(TX.units))}</p>
    <div class="f-grid fu-g3" data-units>
      <label class="f-field">${esc(tt(TX.unitFuel))}<select data-k="unit">${['kg', 'lb'].map(u => opt(u, u, (S.settings.displayUnit || 'kg') === u)).join('')}</select></label>
      ${[['speed', TX.unitSpeed, 'unitSpeed'], ['alt', TX.unitAlt, 'unitAlt'], ['dist', TX.unitDist, 'unitDist']].map(([kind, row, k]) => `<label class="f-field">${esc(tt(row))}<select data-k="${k}">${UNITS[kind].list.map(u => opt(u, UNITS[kind].label[u], unitOf(kind) === u)).join('')}</select></label>`).join('')}</div>
    <div data-entrybox></div>
  </details>`)}
  ${sec(4, `<div class="f-card" data-block="summary"><h2>${esc(tt(TX.stepNames[4]))}</h2><div data-sum></div>
      <div class="f-row" data-startrow></div>
      <p class="fu-startnote" data-startnote aria-live="polite"></p>
      <p class="f-muted">${esc(tt(TX.startHint))}</p></div>
    <div class="f-card fu-hide" data-progcard><h2>${esc(tt(TX.progTitle))}</h2><div data-prog></div><p class="f-muted">${esc(tt(TX.progHint))}</p></div>`, true)}
  <div class="f-bar fu-result" data-block="result" aria-live="polite"></div>`;
  for (const d of S.body.querySelectorAll('details[data-fold]')) {
    d.open = !!S.ui.open?.[d.dataset.fold];
    d.ontoggle = () => {
      S.ui.open = {
        ...S.ui.open,
        [d.dataset.fold]: d.open
      };
      S.ctx.data.put(UI_PATH, S.ui);
      if (d.open) refresh();
    };
  }
  S.body.oninput = S.body.onchange = e => onPlanInput(e);
  S.body.onkeydown = e => {
    if (e.key !== 'Enter') return;
    if (e.target.dataset?.k === 'addpt') {
      e.preventDefault();
      pointAction('addpt');
    } else if (e.target.dataset?.k === 'rtext' && !e.shiftKey) {
      e.preventDefault(); // Entrée : la route est validée (sortie du champ, puis normalisée) ; Maj+Entrée : nouvelle ligne
      e.target.blur();
    }
  };
  renderPts();
  renderRinfo();
  S.body.onclick = e => onPlanClick(e);
  refresh();
  renderWx();
  renderAloft();
  windSourceLine();
  // météo lue une fois par montage quand l'appareil est en ligne et la route a ses terrains
  if (!S.wxTried && wxIds().length && S.ctx.net?.online?.() !== false) {
    S.wxTried = true;
    wxFetch(false);
  }
}
/** Champ changé dans Préparer : vol courant ou réglages mis à jour, route relue si elle change, résultats redessinés. */
function onPlanInput(e) {
  const k = e.target.dataset?.k,
    v = e.target.value,
    f = S.flight;
  if (!k) return;
  if (e.type === 'input' && e.target.tagName === 'SELECT') return;
  const r = f.route ||= emptyFlight().route;
  switch (k) {
    case 'acsearch':
      return acResults(v);
    case 'dep':
    case 'arr':
    case 'altn': {
      const was = r[k];
      r[k] = v.trim().toUpperCase();
      // vol démarré : un autre départ, c'est un autre vol ; une autre arrivée, un déroutement (gardé et noté)
      if (f.started?.at && was && r[k] !== was) {
        if (k === 'dep') f.started = null; // null et non delete : l'écriture fusionne avec le vol gardé
        else if (k === 'arr') f.started = {
          ...f.started,
          diverted: true
        };
      }
      if (k !== 'altn') {
        // le terrain changé l'est aussi dans le texte de la route (sinon le nouveau s'ajoute devant ou derrière l'ancien)
        if (was && r.text && r[k] !== was) {
          r.text = swapEnd(r.text, was, r[k], k === 'arr');
          const ta = S.body?.querySelector('[data-k="rtext"]');
          if (ta && document.activeElement !== ta) ta.value = r.text;
        }
        resolveRoute();
        scheduleWx();
      }
      break;
    }
    case 'rtext':
      r.text = v;
      if (e.type === 'input') r.from = 'route';
      resolveRoute(e.type === 'change'); // pendant la frappe : points relus ; à la sortie : texte normalisé
      break;
    case 'addpt':
      return; // ajouté par « Ajouter » ou Entrée
    case 'ptalt': {
      const p = r.points?.[+e.target.dataset.i];
      if (!p) return;
      num(v) > 0 ? p.alt_ft = Math.round(num(v)) * 100 : delete p.alt_ft;
      return routeEdited(e.type === 'change');
    }
    case 'dist':
      r.distanceNm = distParse(v);
      r.manual = true;
      if (e.type === 'change') renderRinfo();
      break;
    case 'trk':
      r.trackDeg = num(v);
      r.manual = true;
      if (e.type === 'change') renderRinfo();
      break;
    case 'fl':
      f.level = {
        ft: num(v) ? num(v) * 100 : null
      };
      if (e.type === 'change') {
        renderPts(); // niveaux continués des points
        if (S.aloft) aloftApply(); // vent et température au nouveau niveau
      }
      break;
    case 'wdir':
    case 'wkt': {
      if (f.weather?.real) {
        f.weather = {
          ...f.weather,
          real: false
        };
        f.windSource = null;
        const box = S.body.querySelector('[data-k="wxreal"]');
        if (box) box.checked = false;
        windSourceLine();
      }
      const dir = num(S.body.querySelector('[data-k="wdir"]').value),
        kt = speedParse(S.body.querySelector('[data-k="wkt"]').value);
      f.wind = kt === null && dir === null ? null : {
        dirDeg: dir,
        speedKt: kt
      };
      break;
    }
    case 'isa':
      f.isaDev = num(v) || 0;
      S.settings.isaDev = f.isaDev; // gardé dans les réglages du devis : le vol suivant part du même écart
      saveSettings();
      break;
    case 'wxdate':
      f.weather = {
        ...f.weather,
        when: v
      };
      renderWx();
      if (f.weather.real) applyRealWind();
      break;
    case 'wxreal':
      f.weather = {
        ...f.weather,
        real: e.target.checked
      };
      if (f.weather.real) S.wx ? applyRealWind() : wxFetch(true);
      else f.windSource = null;
      windSourceLine();
      break;
    case 'goal':
      S.settings.goal = v;
      S.body.querySelector('[data-manbox]').classList.toggle('fu-hide', v !== 'man');
      saveSettings();
      return refresh();
    case 'mias':
    case 'mvs': {
      const ias = speedParse(S.body.querySelector('[data-k="mias"]').value),
        vs = vsParse(S.body.querySelector('[data-k="mvs"]').value);
      S.manualIn = {
        ...(ias ? {
          ias
        } : {}),
        ...(vs ? {
          vs,
          full: false
        } : {
          full: true
        })
      };
      return refresh();
    }
    case 'wxRadius':
      S.settings.wxRadiusNm = Math.max(0, Math.min(50, num(v) ?? 10));
      saveSettings();
      return scheduleWx();
    case 'taxiMin':
    case 'reserveMin':
      S.settings[k] = num(v) ?? 0;
      saveSettings();
      return refresh();
    case 'contPct':
      S.settings.contingencyPct = num(v) ?? 0;
      saveSettings();
      return refresh();
    case 'unit':
      S.settings.displayUnit = v;
      saveSettings();
      return refresh();
    case 'unitSpeed':
    case 'unitAlt':
    case 'unitDist': {
      // unité d'affichage changée : les champs de saisie portent un nombre et une unité, ils sont redessinés avec la valeur
      // du modèle dans la nouvelle unité (le vol courant n'est pas touché)
      const kind = {
          unitSpeed: 'speed',
          unitAlt: 'alt',
          unitDist: 'dist'
        } [k],
        a = document.activeElement;
      // un champ modifié et encore actif valide sa saisie dans l'ancienne unité avant que l'unité change (son événement
      // « change » partirait sinon pendant le redessin, avec la nouvelle unité)
      if (a && a !== e.target && S.body.contains(a)) a.blur();
      S.settings[UNITS[kind].key] = v;
      saveSettings();
      renderPlan();
      return S.body.querySelector(`[data-k="${k}"]`)?.focus();
    }
    case 'entry': {
      const id = S.C?.sheet?.id;
      if (!id) return;
      S.settings.entries = {
        ...S.settings.entries
      };
      num(v) ? S.settings.entries[id] = num(v) : delete S.settings.entries[id];
      saveSettings();
      return refresh();
    }
  }
  saveFlight();
  refresh();
}
/** Clic dans Préparer : SimBrief, niveau pris sur la courbe ou par un bouton. */
function onPlanClick(e) {
  const st = e.target.closest('[data-step]');
  if (st) return goStep(+st.dataset.step);
  if (e.target.closest('[data-do="showmap"]')) return showMap();
  if (e.target.closest('[data-do="start"]')) return startFlight();
  if (e.target.closest('[data-do="cancelstart"]')) return cancelStart();
  const iu = e.target.closest('[data-do="isause"]');
  if (iu) return useIsa(iu.dataset.v != null ? +iu.dataset.v : undefined);
  if (e.target.closest('[data-do="rmanual"]')) {
    S.rmanualOpen = true;
    renderRinfo();
    return S.body.querySelector('[data-k="dist"]')?.focus();
  }
  const pb = e.target.closest('[data-do^="pt"],[data-do="addpt"]');
  if (pb) return pointAction(pb.dataset.do, +pb.dataset.i);
  const pk = e.target.closest('[data-pick]');
  if (pk) return pickAircraft(pk.dataset.pick);
  if (e.target.closest('[data-do="acopen"]')) return acOpen();
  if (e.target.closest('[data-do="when30"]')) return setWhen(30);
  if (e.target.closest('[data-do="whennow"]')) return setWhen(0);
  const wb = e.target.closest('[data-do="wx"]');
  if (wb) return wxRead(wb);
  const b = e.target.closest('[data-do]'),
    pick = e.target.closest('[data-pick]');
  if (b?.dataset.do === 'simbrief') return loadSimbrief();
  if (b?.dataset.do === 'level') return setLevel(+b.dataset.ft);
  if (pick && S.C?.D) {
    const svg = pick.ownerSVGElement,
      pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse()),
      x0 = +pick.dataset.x0,
      x1 = +pick.dataset.x1,
      D = S.C.D,
      h = Math.round((p.x - x0) / (x1 - x0) * D.xmax / D.step) * D.step;
    setLevel(Math.max(D.lo, Math.min(D.hi, h)));
  }
}
// ---------------------------------------------------------------- météo des terrains (aviationweather.gov)
/** Terrains de la météo, dans l'ordre de la route : départ, intermédiaire, arrivée (codes OACI, sans doublon). */
const wxIds = () => {
  const r = S.flight.route || {},
    corr = S.wxCorr?.list?.map(x => x.id) || [];
  return [...new Set([r.dep, ...corr, r.arr, r.altn].map(x => String(x || '').toUpperCase()).filter(x => /^[A-Z]{4}$/.test(x)))];
};
/** Position d'un point le long de la route (polyligne de points { lat, lon }) : { along (NM depuis le départ), cross
 *  (NM de la route) }, par projection sur le tronçon le plus proche (plan local, assez juste à l'échelle du couloir). */
function alongRoute(pts, p) {
  let best = null,
    cum = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      k = Math.cos(a.lat * Math.PI / 180) * 60,
      bx = (b.lon - a.lon) * k,
      by = (b.lat - a.lat) * 60,
      px = (p.lon - a.lon) * k,
      py = (p.lat - a.lat) * 60,
      l2 = bx * bx + by * by,
      t = l2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / l2)) : 0,
      cross = Math.hypot(px - t * bx, py - t * by),
      len = gcNm(a, b);
    if (!best || cross < best.cross) best = {
      along: cum + t * len,
      cross
    };
    cum += len;
  }
  return best;
}
/** Terrains du couloir de la route : aerodromes d'aerodb dans l'emprise de chaque tronçon élargie du rayon des réglages
 *  (10 NM par défaut), gardés à ce rayon de la route, départ et arrivée exclus, triés le long de la route. Gardé tant que
 *  la route et le rayon ne changent pas ; ceux sans METAR ni TAF sont écartés à l'affichage et pour le vent. */
async function wxCorridor() {
  const s = S,
    r = S.flight.route || {},
    radius = Math.max(0, +(S.settings.wxRadiusNm ?? 10) || 0),
    pts = (r.points || []).filter(p => Number.isFinite(+p.lat) && Number.isFinite(+p.lon)),
    key = JSON.stringify([pts.map(p => [p.id, p.lat, p.lon]), radius, r.dep, r.arr]);
  if (S.wxCorr?.key === key && S.wxCorr.list.length) return S.wxCorr; // vide : relu (base pas encore chargée)
  const out = {
    key,
    list: [],
    pts
  };
  if (pts.length >= 2 && radius > 0 && s.ctx.aerodb?.aerodromes) {
    const seen = new Map(),
      dLat = radius / 60;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        dLon = radius / (60 * Math.max(.1, Math.cos(Math.max(Math.abs(a.lat), Math.abs(b.lat)) * Math.PI / 180))),
        bbox = [Math.min(a.lon, b.lon) - dLon, Math.min(a.lat, b.lat) - dLat, Math.max(a.lon, b.lon) + dLon, Math.max(a.lat, b.lat) +
          dLat
        ];
      for (const ad of (await s.ctx.aerodb.aerodromes({
          bbox,
          lite: true // index léger des terrains (code, position, altitude, axe de piste) : assez pour le couloir
        }).catch(() => null)) || []) {
        const id = String(ad?.icao || '').toUpperCase();
        if (/^[A-Z]{4}$/.test(id) && Number.isFinite(+ad.lat) && Number.isFinite(+ad.lon)) seen.set(id, ad);
      }
    }
    for (const [id, ad] of seen) {
      if (id === r.dep || id === r.arr) continue;
      const pos = alongRoute(pts, {
        lat: +ad.lat,
        lon: +ad.lon
      });
      if (pos && pos.cross <= radius) {
        out.list.push({
          id,
          ad,
          ...pos
        });
        s.wxAd = {
          ...s.wxAd,
          [id]: ad
        };
      }
    }
    out.list.sort((x, y) => x.along - y.along);
  }
  return s.wxCorr = out;
}
/** Relit la météo un peu après un changement de terrain, si elle a déjà été lue ou si la météo réelle est cochée. */
function scheduleWx() {
  clearTimeout(S.wxTimer);
  if (!S.wx && !S.flight.weather?.real) return;
  S.wxTimer = setTimeout(() => wxFetch(false), 1200);
}
/** METAR et TAF des terrains par ctx.net (aviationweather.gov, relayé par le lanceur), gardés sur l'appareil ; hors
 *  réseau, les dernières valeurs gardées, avec leur heure. Fiche des terrains (axe de piste) par aerodb. loud : les
 *  refus sont dits. */
async function wxFetch(loud = false) {
  if (!S) return; // lecture programmée (scheduleWx) partie après le démontage
  const s = S,
    when = wxWhen();
  await wxCorridor();
  if (gone(s)) return;
  const ids = wxIds();
  if (!ids.length) {
    if (loud) S.ctx.notify(tt(TX.wxNone), 'warn');
    return renderWx();
  }
  const chunks = [];
  for (let i = 0; i < ids.length; i += 40) chunks.push(ids.slice(i, i + 40));
  /** Appel par le cadre : réponse, ou erreur codée (offline : hors réseau ; relay : site injoignable d'ici, sans
   *  lanceur ou sans clé ; http : refus du service). */
  const call = async (url, accept = 'application/json') => {
    const res = await s.ctx.net.fetch(url, {
      headers: {
        accept
      }
    });
    if (res.headers.get('x-sog-offline') || res.headers.get('x-sog-unreachable')) throw Object.assign(new Error('net'), {
      code: s.ctx.net.online?.() === false || res.headers.get('x-sog-offline') ? 'offline' : 'relay'
    });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), {
      code: 'http'
    });
    return res;
  };
  // 1. aviationweather.gov (JSON décodé), relayé par le lanceur quand la page est servie par un
  const viaLauncher = async () => {
    const get = async kind => (await Promise.all(chunks.map(async c => {
      const res = await call(`https://aviationweather.gov/api/data/${kind}?ids=${encodeURIComponent(c.join(','))}&format=json`);
      return res.status === 204 ? [] : res.json();
    }))).flat();
    const [metars, tafs] = await Promise.all([get('metar'), get('taf')]);
    return {
      metars,
      tafs,
      source: 'launcher',
      noTaf: false
    };
  };
  // 2. sans lanceur : METAR bruts de metar.vatsim.net (décodés par frame/lib/metar.js), TAF d'avwx.rest avec la clé de
  // l'appareil (ajoutée par le cadre) — seulement si une date de vol les rend utiles, terrain par terrain, douze au plus
  const direct = async () => {
    const metars = (await Promise.all(chunks.map(async c => MT.decodeMetars(await (await call(
      `https://metar.vatsim.net/metar.php?id=${encodeURIComponent(c.join(','))}`, 'text/plain')).text())))).flat();
    const tafs = [];
    let noTaf = false;
    if (when != null) {
      const withMetar = new Set(metars.map(m => m.icaoId)),
        r = s.flight.route || {},
        want = ids.filter(id => withMetar.has(id) || [r.dep, r.arr, r.altn].includes(id)).slice(0, 12);
      for (const id of want) {
        try {
          const t = MT.fromAvwxTaf(await (await call(`https://avwx.rest/api/taf/${encodeURIComponent(id)}`)).json());
          if (t) tafs.push(t);
        } catch (e) {
          if (e.code === 'relay') {
            noTaf = true; // pas de clé météo sur l'appareil : inutile d'insister
            break;
          }
        }
      }
    }
    return {
      metars,
      tafs,
      source: 'direct',
      noTaf
    };
  };
  const kept = (await s.ctx.data.get(WX_PATH).catch(() => null)) || {
    metar: {},
    taf: {}
  };
  try {
    let got;
    try {
      got = await viaLauncher();
    } catch (e) {
      if (e.code !== 'relay') throw e;
      got = await direct(); // aviationweather injoignable d'ici (pas de lanceur) : sources directes
    }
    for (const x of got.metars || []) kept.metar[x.icaoId] = x;
    for (const x of got.tafs || []) kept.taf[x.icaoId] = x;
    kept.at = new Date().toISOString();
    kept.source = got.source;
    kept.noTaf = got.noTaf;
    await s.ctx.data.put(WX_PATH, kept, {
      policy: 'cache'
    });
    if (gone(s)) return;
    S.wx = {
      ...kept,
      cached: false
    };
  } catch (e) {
    if (gone(s)) return;
    S.wx = kept.at ? {
      ...kept,
      cached: true
    } : null;
    if (loud) S.ctx.notify(e.code === 'offline' ? tt(TX.offline) : e.code === 'relay' ? tt(TX.wxRelay) : tt(TX.sbError, {
      e: e.message
    }), 'warn');
  }
  s.wxAd = s.wxAd || {};
  for (const id of ids)
    if (!(id in s.wxAd)) s.wxAd[id] = ((await s.ctx.aerodb?.aerodromes?.({
      icao: id
    }).catch(() => null)) || [])[0] || null;
  if (gone(s)) return;
  await aloftFetch(loud);
  if (gone(s) || !S.body) return;
  renderWx();
  isaHint();
  if (S.flight.weather?.real) applyRealWind();
  else if (S.C) renderDa(S.C);
}
// ---------------------------------------------------------------- vents et températures en altitude (Open-Meteo)
/** Clé de la prévision gardée : positions des points de la route et heure visée (à l'heure près). */
function aloftKey() {
  const pts = (S.flight.route?.points || []).filter(p => Number.isFinite(+p.lat));
  return JSON.stringify([pts.map(p => [(+p.lat).toFixed(2), (+p.lon).toFixed(2)]), Math.round((wxWhen() ?? Date.now() / 1000) / 3600)]);
}
/** Prévision par niveaux aux lieux de la route (points, plus un lieu tous les 50 NM environ, 24 au plus), par ctx.net
 *  (relayée par le lanceur ou directe, sans clé), modèle selon la région (WD.modelFor), heure la plus proche de la date
 *  du vol (sinon maintenant) ; heure du run lue à part si le service la donne. Gardée sur l'appareil ; hors réseau, la
 *  dernière. Puis appliquée au vol (aloftApply). */
async function aloftFetch(loud = false) {
  const s = S,
    pts = (S.flight.route?.points || []).filter(p => Number.isFinite(+p.lat));
  if (pts.length < 2) return;
  const key = aloftKey();
  if (S.aloft?.key === key && !S.aloft.cached) return aloftApply();
  S.aloftState = 'loading';
  const smp = WD.samples(pts),
    mid = smp[Math.floor(smp.length / 2)],
    model = WD.modelFor(mid.lat, mid.lon),
    t = wxWhen() ?? Math.round(Date.now() / 1000);
  try {
    const res = await s.ctx.net.fetch(WD.forecastUrl(smp, model.id), {
      headers: {
        accept: 'application/json'
      }
    });
    if (res.headers.get('x-sog-offline') || res.headers.get('x-sog-unreachable') || !res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), {
      code: res.headers.get('x-sog-offline') ? 'offline' : 'http'
    });
    const profiles = WD.profiles(await res.json(), t);
    let run = null;
    try { // heure du dernier run du modèle (métadonnées d'Open-Meteo), facultative
      const meta = await s.ctx.net.fetch(`https://api.open-meteo.com/data/${{
        meteofrance_seamless: 'meteofrance_arpege_europe',
        icon_seamless: 'dwd_icon',
        gfs_seamless: 'ncep_gfs025'
      }[model.id]}/static/meta.json`);
      const m = meta.ok && !meta.headers.get('x-sog-unreachable') ? await meta.json() : null;
      run = Number.isFinite(+m?.last_run_initialisation_time) ? +m.last_run_initialisation_time : null;
    } catch {
      /* sans heure du run */
    }
    if (gone(s)) return;
    S.aloftState = 'ok';
    S.aloft = {
      key,
      model: model.name,
      short: model.short,
      run,
      time: profiles[0]?.time ?? t,
      at: new Date().toISOString(),
      samples: smp,
      profiles
    };
    await s.ctx.data.put(ALOFT_PATH, S.aloft, {
      policy: 'cache'
    });
  } catch (e) {
    if (gone(s)) return;
    S.aloftState = 'failed'; // le vent au sol des METAR prend le relais, et c'est dit
    if (loud && e.code !== 'offline') S.ctx.notify(tt(TX.sbError, {
      e: e.message
    }), 'warn');
    if (S.aloft) S.aloft.cached = true;
  }
  if (!gone(s)) aloftApply();
}
/** Vents et températures au niveau planifié (paliers compris) : aux lieux de lecture et aux points de la route ;
 *  null sans prévision pour cette route. */
function aloftCalc() {
  const A = S.aloft,
    pts = S.flight.route?.points || [],
    plan = +S.flight.level?.ft || 0;
  if (!A?.profiles?.length || A.key !== aloftKey() || !(plan > 0) || pts.length < 2) return null;
  const nmPts = [0];
  for (let i = 1; i < pts.length; i++) nmPts.push(nmPts[i - 1] + gcNm(pts[i - 1], pts[i]));
  const at = new Date(A.time * 1000).toISOString(),
    winds = A.samples.map((smp, i) => WD.atLevel(A.profiles[i], WD.levelAt(pts, nmPts, plan, smp.nm)));
  return {
    winds,
    nms: A.samples.map(x => x.nm),
    points: pts.map((p, i) => {
      const k = A.samples.findIndex(x => x.point === i),
        lv = WD.levelAt(pts, nmPts, plan, nmPts[i]),
        w = k >= 0 ? WD.atLevel(A.profiles[k], lv) : null;
      return w ? {
        dirDeg: w.dirDeg,
        kt: w.kt,
        tempC: w.tC,
        isaDev: w.isaDev,
        levelFt: lv,
        at
      } : null;
    })
  };
}
/** Prévision appliquée au vol : route.points[].wind = { dirDeg, kt, tempC, levelFt, at } (flèches de la carte) ;
 *  avec « Météo réelle », le vent du devis devient la moyenne au niveau planifié (applyRealWind). */
function aloftApply() {
  const c = aloftCalc(),
    pts = S.flight.route?.points || [];
  if (c) pts.forEach((p, i) => {
    if (c.points[i]) p.wind = {
      dirDeg: c.points[i].dirDeg,
      kt: c.points[i].kt,
      tempC: c.points[i].tempC,
      levelFt: c.points[i].levelFt,
      at: c.points[i].at
    };
    else delete p.wind;
  });
  if (!S.body) return;
  renderAloft(c);
  if (S.flight.weather?.real) applyRealWind();
  else {
    saveFlight();
    if (S.C) renderDa(S.C);
  }
}
/** Carte « Vents et températures en altitude » : source (modèle, heure visée, run, lecture) et une ligne par point de
 *  la route — niveau, vent, température, écart ISA. */
function renderAloft(c = aloftCalc()) {
  const box = S.body?.querySelector('[data-aloft]');
  if (!box) return;
  const A = S.aloft;
  if (!c) return box.innerHTML = `<p class="f-muted">${esc(tt(TX.aloftNone))}</p>`;
  const hh = sec => fmtZ(sec * 1000),
    pts = S.flight.route.points;
  box.innerHTML = `<p class="f-muted">${esc(tt(TX.aloftAt, { m: A.model, t: hh(A.time), run: A.run ? tt(TX.aloftRun, { r: hh(A.run) }) : '', r: fmtDateZ(A.at, S.ctx.lang()) }))}</p>
    <div class="f-scroll"><table class="f-table"><thead><tr>${TX.aloftCols.map((h, i) => `<th${i ? ' class="f-num"' : ''}>${esc(tt(h))}</th>`).join('')}</tr></thead><tbody>
    ${c.points.map((w, i) => w ? `<tr><td>${esc(pts[i].id || '')}</td><td class="f-num">${flTxt(w.levelFt)}</td><td class="f-num">${String(w.dirDeg).padStart(3, '0')}° ${esc(speedTxt(w.kt))}</td><td class="f-num">${w.tempC} °C</td><td class="f-num">${w.isaDev > 0 ? '+' : ''}${w.isaDev}</td></tr>` : '').join('')}
    </tbody></table></div>`;
}
/** Source du vent du devis, en court : « vent : METAR LFRS, TAF LFML », « vent : prévision ICON FL060 », « vent saisi » ;
 *  vide sans vent. */
function windShort() {
  const f = S.flight,
    src = f.windSource;
  if (src?.kind === 'weather') return tt(TX.windBy.weather, {
    l: (src.ids || []).map(x => {
      const m = /^(\S+) \((\w+)\)$/.exec(x);
      return m ? `${m[2]} ${m[1]}` : x;
    }).join(', ')
  }) + (src.aloftFailed ? ` · ${tt(TX.aloftDown)}` : '');
  if (src?.kind === 'aloft') return tt(TX.windBy.aloft, {
    m: src.short || src.model || '',
    l: flTxt(src.levelFt)
  }) + (src.pending ? ` · ${tt(TX.aloftPending)}` : '');
  return Number.isFinite(+f.wind?.speedKt) ? tt(TX.windBy.typed) : '';
}
/** Profil réel au départ (premier lieu de lecture) : température par altitude pression, atmosphère type en tirets,
 *  inversions surlignées, niveau planifié ; lignes de lecture (température, écart ISA et altitude-densité au niveau,
 *  inversions). Chaîne HTML, vide sans prévision. */
function realProfileHtml(box) {
  const A = S.aloft,
    prof = A?.key === aloftKey() ? A.profiles?.[0] : null;
  if (!prof?.levels?.length) return '';
  const plan = +S.flight.level?.ft || 0,
    ceil = +S.C?.perf?.ceiling || 0,
    top = Math.min(prof.levels.at(-1).ft, Math.max(10000, plan * 1.3, ceil * 1.1)),
    L = prof.levels.filter(l => l.ft <= top + 1),
    tMin = Math.floor(Math.min(...L.map(l => l.tC), WD.isaC(top)) / 5) * 5 - 5,
    tMax = Math.ceil(Math.max(...L.map(l => l.tC), 15) / 5) * 5 + 5,
    W = svgSize(box)[0],
    H = Math.min(320, Math.round(W * .7)),
    pl = 52,
    pr = 12,
    pt = 12,
    pb = 30,
    x = c => pl + (c - tMin) / (tMax - tMin) * (W - pl - pr),
    y = ft => pt + (1 - ft / top) * (H - pt - pb),
    line = pts => pts.map(([c, ft], i) => `${i ? 'L' : 'M'}${x(c).toFixed(1)},${y(ft).toFixed(1)}`).join(''),
    inv = WD.inversions({
      levels: L
    }),
    fmt = v => (Math.round(v) || 0).toLocaleString(S.ctx.lang()),
    at = plan > 0 ? WD.atLevel(prof, plan) : null,
    da = at ? densityAlt(plan, at.isaDev) : null;
  return `<h3>${esc(tt(TX.realTitle, { m: A.model }))}</h3>
  <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tt(TX.realTitle, { m: A.model }))}" class="fu-svg" data-chart="real">
    ${ticks(tMin, tMax, W < 420 ? 4 : 6).map(c => `<line x1="${x(c)}" x2="${x(c)}" y1="${pt}" y2="${H - pb}" class="fu-grid"/><text x="${x(c)}" y="${H - pb + 14}" text-anchor="middle">${c}</text>`).join('')}
    ${ticks(0, top, 4).map(ft => `<text x="${pl - 6}" y="${y(ft) + 4}" text-anchor="end">${fmt(ft)}</text>`).join('')}
    <path d="${line([[15, 0], [WD.isaC(top), top]])}" class="fu-isa"/>
    ${inv.map(v => `<rect x="${pl}" y="${y(v.toFt)}" width="${W - pl - pr}" height="${Math.max(1, y(v.fromFt) - y(v.toFt))}" class="fu-inv"/>`).join('')}
    <path d="${line(L.map(l => [l.tC, l.ft]))}" class="fu-line-f"/>
    ${L.map(l => `<circle cx="${x(l.tC)}" cy="${y(l.ft)}" r="3" class="fu-best"/>`).join('')}
    ${plan > 0 && plan <= top ? `<line x1="${pl}" x2="${W - pr}" y1="${y(plan)}" y2="${y(plan)}" class="fu-now"/>` : ''}
  </svg>
  <p class="f-muted">${esc(tt(TX.realAxis))}</p>
  ${at ? `<p>${esc(tt(TX.realLevel, { l: flTxt(plan), t: at.tC, d: signed(at.isaDev), da: fmt(da) }))}</p>` : ''}
  <p>${inv.length ? inv.map(v => esc(tt(TX.realInv, { a: fmt(v.fromFt), b: fmt(v.toFt), d: v.dT }))).join('<br>') : esc(tt(TX.realNoInv))}</p>`;
}
/** Date du vol rapide : plus = 30 → dans 30 min (à partir de la date posée si elle est à venir : chaque appui ajoute
 *  30 min), arrondi aux 5 min au-dessus ; plus = 0 → maintenant (date vidée : l'observation, comme au départ du vol).
 *  Puis la météo des terrains (TAF si la date tombe dans sa validité) et les vents en altitude sont relus pour cette
 *  heure, après un court temps calme (plusieurs appuis, une lecture). */
function setWhen(plus) {
  const f = S.flight,
    now = Date.now(),
    set = Date.parse(f.weather?.when || ''),
    base = Number.isFinite(set) && set > now ? set : now,
    step = 5 * 60000,
    t = plus ? Math.ceil((base + plus * 60000) / step) * step : null,
    d = t ? new Date(t) : null,
    local = d ? new Date(t - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  f.weather = {
    ...f.weather,
    when: local
  };
  const wd = S.body.querySelector('[data-k="wxdate"]');
  if (wd) wd.value = local;
  renderWx();
  saveFlight();
  clearTimeout(S.whenTimer);
  const s = S;
  S.whenTimer = setTimeout(async () => {
    if (gone(s)) return;
    await wxFetch(true);
    if (gone(s)) return;
    if (S.flight.weather?.real) applyRealWind();
    refresh();
  }, 700);
}
/** « Lire la météo des terrains » : bouton occupé (« Lecture… ») pendant les appels, rendu ensuite. */
async function wxRead(btn) {
  if (btn.disabled) return;
  const label = btn.textContent;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = tt(TX.wxReading);
  try {
    await wxFetch(true);
  } finally {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = label;
    }
  }
}
/** Heure visée (secondes) : la date du vol saisie (heure de l'appareil), sinon aucune (METAR). */
const wxWhen = () => {
  const w = S.flight.weather?.when;
  const t = w ? Date.parse(w) : NaN;
  return Number.isFinite(t) ? Math.round(t / 1000) : null;
};
/** Résumés des terrains (METAR, ou TAF si la date du vol tombe dans sa validité). */
const wxStations = () => {
  const r = S.flight.route || {},
    corr = new Map((S.wxCorr?.list || []).map(x => [x.id, x])),
    pts = S.wxCorr?.pts || [],
    total = pts.length >= 2 ? pts.slice(1).reduce((t, p, i) => t + gcNm(pts[i], p), 0) : null;
  return wxIds().map(id => {
    const ad = S.wxAd?.[id] || null,
      role = id === r.dep ? 'dep' : id === r.arr ? 'arr' : id === r.altn && !corr.has(id) ? 'altn' : 'mid',
      along = role === 'dep' ? 0 : role === 'arr' ? total : corr.get(id)?.along ?? null;
    return {
      id,
      ad,
      role,
      along,
      fromArr: role === 'altn' && ad && pts.length ? gcNm(pts.at(-1), {
        lat: +ad.lat,
        lon: +ad.lon
      }) : null,
      st: WX.station(S.wx?.metar?.[id], S.wx?.taf?.[id], wxWhen())
    };
  }).filter(x => x.st || x.role !== 'mid'); // terrain du couloir sans METAR ni TAF : ignoré
};
/** Carte météo : pour chaque terrain, catégorie de vol en couleur, vent et composantes sur la piste la plus proche du
 *  vent, plafond, visibilité, température et QNH, CB / TCU en avertissement, groupes temporaires du TAF, message brut
 *  replié ; hors réseau, l'heure des valeurs. */
function renderWx() {
  const box = S.body?.querySelector('[data-wx]');
  if (!box) return;
  if (!S.wx) return box.innerHTML = `<p class="f-muted">${esc(tt(TX.wxNone))}</p>`;
  const kinds = {
      VFR: 'ok',
      MVFR: 'accent',
      IFR: 'warn',
      LIFR: 'err'
    },
    hhmm = s => s ? new Date(s * 1000).toISOString().slice(11, 16) + 'Z' : '',
    vis = v => !v ? '—' : v.plus && v.sm >= 6 ? '≥ 10 km' : `${(v.sm * 1.609).toFixed(v.sm < 3 ? 1 : 0)} km`,
    wind = (d, sp, g) => sp == null ? '—' : `${d == null ? '—' : typeof d === 'number' ? `${String(d).padStart(3, '0')}°` : d} ${sp} kt${g ? ` G${g}` : ''}`;
  const where = x => x.role === 'altn' ? x.fromArr != null ? tt(TX.wxAltnAt, {
      d: distTxt(x.fromArr)
    }) : '' : x.role !== 'dep' && x.along != null ? tt(TX.wxAlong, {
      d: distTxt(x.along)
    }) : '',
    card = x => {
      const {
        id,
        ad,
        st
      } = x;
      if (!st) return `<div class="f-item"><span><b>${esc(id)}</b> <span class="f-muted">${esc([where(x), tt(TX.wxNoData)].filter(Boolean).join(' · '))}</span></span></div>`;
      const rw = ad ? WX.runwayWind(ad.bearing, ad.magVar, st.wdir, st.wspd) : null;
      return `<div class="fu-wx"><div class="f-row"><b>${esc(id)}</b><span class="f-muted">${esc([ad?.name, where(x), `${st.source} ${hhmm(st.at)}`].filter(Boolean).join(' · '))}</span>${st.cat ? `<span class="f-badge" data-kind="${kinds[st.cat] || 'accent'}">${esc(st.cat)}</span>` : ''}</div>
      <dl class="f-dl"><dt>${esc(tt(TX.wxWind))}</dt><dd>${esc(wind(st.wdir, st.wspd, st.wgst))}</dd>
      ${rw ? `<dt>${esc(tt(TX.wxRwy, { r: rw.ident }))}</dt><dd>${esc(tt(TX.wxComp, { h: Math.abs(rw.head), hw: tt(rw.head >= 0 ? TX.wxHead : TX.wxTail), c: rw.cross, s: tt(rw.side === 'L' ? TX.wxLeft : TX.wxRight) }))} <span class="f-muted">(${esc(tt(TX.wxRwyHint))})</span></dd>` : ''}
      <dt>${esc(tt(TX.wxCeil))}</dt><dd>${st.ceil != null ? `${st.ceil.toLocaleString(S.ctx.lang())} ft` : esc(tt(TX.wxNoCeil))}${st.wx ? ` · ${esc(st.wx)}` : ''}</dd>
      <dt>${esc(tt(TX.wxVis))}</dt><dd>${esc(vis(st.vis))}</dd>
      ${st.temp != null || st.qnh != null ? `<dt>${esc(tt(TX.wxTemp))}</dt><dd>${st.temp != null ? `${st.temp} °C` : '—'} · ${st.qnh != null ? `${Math.round(st.qnh)} hPa` : '—'}</dd>` : ''}
      ${st.tempo.map(g => `<dt>${esc(g.change)}</dt><dd>${esc(wind(g.wdir, g.wspd, g.wgst))} · ${esc(vis(g.vis))}${g.ceil != null ? ` · ${g.ceil} ft` : ''}${g.wx ? ` · ${esc(g.wx)}` : ''}${g.cat ? ` <span class="f-badge" data-kind="${kinds[g.cat] || 'accent'}">${esc(g.cat)}</span>` : ''}</dd>`).join('')}</dl>
      ${st.convective ? `<p class="f-warn">${esc(tt(TX.wxCb))}</p>` : ''}
      <details><summary>${esc(tt(TX.wxRaw))}</summary><pre>${esc(st.raw)}</pre></details></div>`;
    },
    all = wxStations(),
    ends = all.filter(x => x.role !== 'mid'),
    mids = all.filter(x => x.role === 'mid');
  box.innerHTML = (S.wx.cached ? `<p class="f-muted">${esc(tt(TX.wxCached, { t: fmtDateZ(S.wx.at, S.ctx.lang()) }))}</p>` : '') +
    (S.wx.source === 'direct' ? `<p class="f-muted">${esc(tt(TX.wxDirect))}</p>` : '') +
    (S.wx.noTaf && wxWhen() != null ? `<p class="f-warn">${esc(tt(TX.wxNoTaf))}</p>` : '') + ends.map(card).join('') +
    (mids.length > 2 ? `<details data-wxmids${S.ui.wxMidsOpen ? ' open' : ''}><summary>${esc(tt(TX.wxMids, { n: mids.length }))}</summary>${mids.map(card).join('')}</details>` : mids.map(card).join(''));
  const det = box.querySelector('[data-wxmids]');
  if (det) det.ontoggle = () => S.ui.wxMidsOpen = det.open;
}
/** « Météo réelle » : vent moyen des terrains le long de la route (frame : moyenne des vecteurs pondérée par les
 *  segments départ → intermédiaire → arrivée), écrit dans le vol courant avec sa source. */
/** Vent moyen le long de la route à l'altitude constante h (ft), lu dans la prévision en altitude quand la météo réelle
 *  est retenue et que la prévision est celle de la route et de l'heure ; null sinon (la courbe de décision garde alors le
 *  vent du devis). */
function aloftMeanAt(h) {
  const A = S.aloft;
  if (!S.flight.weather?.real || S.flight.windSource?.kind !== 'aloft' || !A?.profiles?.length || A.key !== aloftKey())
    return null;
  return WD.meanWind(A.samples.map((smp, i) => WD.atLevel(A.profiles[i], h)), A.samples.map(x => x.nm));
}

function applyRealWind() {
  const al = aloftCalc(),
    mean = al ? WD.meanWind(al.winds, al.nms) : null;
  if (mean) { // prévision en altitude au niveau planifié : prioritaire sur le vent au sol des METAR
    const f = S.flight;
    f.wind = mean;
    f.windSource = {
      kind: 'aloft',
      model: S.aloft.model,
      short: S.aloft.short,
      levelFt: +f.level?.ft || 0,
      at: new Date(S.aloft.time * 1000).toISOString()
    };
    const d = S.body?.querySelector('[data-k="wdir"]'),
      k = S.body?.querySelector('[data-k="wkt"]'),
      ia = isaAloft();
    if (d) d.value = mean.dirDeg;
    if (k) k.value = speedField(mean.speedKt);
    if (ia) { // météo réelle : l'écart ISA au niveau planifié, comme le vent
      f.isaDev = ia.dT;
      const i = S.body?.querySelector('[data-k="isa"]');
      if (i && document.activeElement !== i) i.value = ia.dT || '';
    }
    windSourceLine();
    isaHint();
    saveFlight();
    return refresh();
  }
  // nouvelle prévision en altitude pas encore là (route ou heure changée) : l'ancien vent en altitude reste, dit « en
  // cours » ; le vent au sol des METAR ne prend le relais qu'après un échec de la prévision, et c'est dit
  if (S.flight.windSource?.kind === 'aloft' && S.aloftState !== 'failed') {
    S.flight.windSource = {
      ...S.flight.windSource,
      pending: true
    };
    windSourceLine();
    return refresh();
  }
  const failed = S.aloftState === 'failed',
    list = wxStations().filter(x => x.role !== 'altn' && x.st && x.along != null && Number.isFinite(+x.st.wdir) && Number.isFinite(+x.st
      .wspd)),
    legs = list.slice(1).map((x, i) => Math.max(0, x.along - list[i].along)),
    w = list.length >= 2 ? WX.routeWind(list.map(x => x.st), legs) : null,
    f = S.flight;
  if (!w) {
    f.windSource = null;
    windSourceLine(tt(TX.wxMissing));
    return;
  }
  f.wind = w;
  f.windSource = {
    kind: 'weather',
    ids: list.map(x => `${x.id} (${x.st.source})`),
    ...(failed ? {
      aloftFailed: true
    } : {})
  };
  const d = S.body?.querySelector('[data-k="wdir"]'),
    k = S.body?.querySelector('[data-k="wkt"]');
  if (d) d.value = w.dirDeg;
  if (k) k.value = speedField(w.speedKt);
  windSourceLine();
  saveFlight();
  refresh();
}
/** Ligne d'origine du vent sous les champs (météo réelle, ou rien). */
function windSourceLine(text) {
  const el = S.body?.querySelector('[data-windsrc]');
  if (!el) return;
  const src = S.flight.windSource;
  el.textContent = text || (src?.kind === 'weather' ? tt(TX.wxSrc, {
    l: src.ids.join(', ')
  }) + (src.aloftFailed ? ` ${tt(TX.aloftFailed)}` : '') : src?.kind === 'aloft' ? tt(TX.aloftSrc, {
    m: src.model
  }) + (src.pending ? ` (${tt(TX.aloftPending)})` : '') : '');
}

// ---------------------------------------------------------------- choix de l'appareil (registre d'aerodb)
/** Ouvre (ou referme) la recherche d'appareil sous la ligne de l'appareil retenu. */
function acOpen() {
  const panel = S.body.querySelector('[data-acpanel]');
  panel.classList.toggle('fu-hide');
  if (!panel.classList.contains('fu-hide')) {
    panel.querySelector('input').focus();
    acResults('');
  }
}
/** Résultats de la recherche unique d'aerodb (fiches → flotte → référence → types → code libre), chacun avec son
 *  origine et, pour un appareil, la fiche qui le servira (la sienne, celle de son type, ou l'estimation). La dernière
 *  demande seule est dessinée. */
async function acResults(text) {
  const box = S.body?.querySelector('[data-acres]');
  if (!box) return;
  if (!S.A?.search) return box.innerHTML = `<p class="f-muted">${esc(tt(TX.acNoRegistry))}</p>`;
  const s = S,
    seq = S.acSeq = (S.acSeq || 0) + 1,
    hits = await S.A.search(text, 30).catch(() => []);
  if (gone(s) || seq !== S.acSeq || !S.body) return;
  S.acHits = new Map(hits.map(h => [h.key, h]));
  const last = !String(text || '').trim() && S.lastAc?.name ? S.lastAc : null; // recherche vide : le dernier choisi d'abord
  box.innerHTML = (last ? `<button type="button" class="f-item" data-pick="last"><span>${esc([last.name, last.registration, last.callsign].filter(Boolean).join(' — '))}</span><span class="f-badge" data-kind="accent">${esc(tt(TX.origins.last))}</span></button>` : '') + hits.map(h => `<button type="button" class="f-item" data-pick="${esc(h.key)}"><span>${esc(h.label)}${h.kind === 'aircraft' && h.sheetVia ? `<small class="f-muted fu-block">${esc(tt(TX.via[h.sheetVia] || TX.via.estimate))}</small>` : ''}</span><span class="f-badge">${esc([...new Set((h.sources?.length > 1 ? h.sources : [h.source]).map(x => /^fleet/.test(x) ? 'fleet' : x))].map(x => tt(TX.origins[x] || TX.origins.free)).join(' + '))}</span></button>`).join(
    ''); // ligne fusionnée (une par immatriculation) : toutes ses origines
}
/** Appareil retenu : le vol courant prend aircraftOf (fiche, type, immatriculation, indicatif, nom, origine). */
function pickAircraft(key) {
  const hit = key === 'last' ? null : S.acHits?.get(key);
  if (!hit && !(key === 'last' && S.lastAc)) return;
  S.flight.aircraft = hit ? S.A.aircraftOf(hit) : {
    ...S.lastAc
  };
  S.lastAc = {
    ...S.flight.aircraft
  };
  S.ctx.data.put(LAST_AC_PATH, {
    aircraft: S.lastAc,
    at: new Date().toISOString()
  });
  S.manual = null;
  const panel = S.body.querySelector('[data-acpanel]');
  panel.classList.add('fu-hide');
  panel.querySelector('input').value = '';
  saveFlight();
  refresh();
}
/** Ligne de l'appareil retenu : nom, immatriculation, indicatif, type, badge d'origine, bouton de recherche. */
function acSelected() {
  const box = S.body?.querySelector('[data-acsel]');
  if (!box) return;
  const a = S.flight.aircraft || {},
    sheet = S.C?.sheet,
    origin = a.source || (a.sheetId ? 'sheet' : a.type ? 'free' : '');
  box.innerHTML = `${sheet ? `<b>${esc(a.name || sheet.name || sheet.id)}</b><span class="f-muted">${esc([a.registration, a.callsign, a.type || sheet.icao].filter(Boolean).join(' · '))}</span>${origin ? `<span class="f-badge" data-kind="accent">${esc(tt(TX.origins[origin] || TX.origins.free))}</span>` : ''}` : `<span class="f-muted">${esc(tt(TX.acNone))}</span>`}
    <button type="button" data-do="acopen" aria-label="${esc(tt(TX.acChange))}" title="${esc(tt(TX.acChange))}">${svg('search')}</button>`;
}

// ---------------------------------------------------------------- écart ISA et altitude-densité
/** Altitude-densité (ft) d'une altitude pression h (ft) à ISA + dT : l'altitude standard de même densité
 *  (FlightPerfModel.isa, inversée par dichotomie). */
function densityAlt(h, dT) {
  const isa = window.FlightPerfModel.isa,
    sigma = isa(h, dT).sigma;
  let lo = -5000,
    hi = 60000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    isa(mid, 0).sigma > sigma ? lo = mid : hi = mid;
  }
  return (lo + hi) / 2;
}
/** Proposition d'écart ISA d'après le METAR du départ : température − (15 − 1,98 × altitude du terrain en milliers de
 *  ft) ; altitude du terrain d'aerodb (ft), sinon du METAR (m). Sortie : { id, dT, t, elev, qnh } ou null. */
function isaProposal() {
  const id = String(S.flight.route?.dep || '').toUpperCase(),
    m = S.wx?.metar?.[id];
  if (!m || !Number.isFinite(+m.temp)) return null;
  const ad = S.wxAd?.[id],
    elev = Number.isFinite(+ad?.elev) ? +ad.elev : Number.isFinite(+m.elev) ? +m.elev * 3.28084 : null;
  if (elev == null) return null;
  return {
    id,
    dT: Math.round(+m.temp - (15 - 1.98 * elev / 1000)),
    t: +m.temp,
    elev: Math.round(elev),
    qnh: Number.isFinite(+m.altim) ? +m.altim : null
  };
}
/** Écart ISA signé (« +3 », « −2 », « 0 »). */
const signed = d => d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '0';
/** Ligne de proposition sous les champs du vent : l'écart ISA du METAR du départ et « Utiliser ». */
function isaHint() {
  const box = S.body?.querySelector('[data-isahint]');
  if (!box) return;
  const pr = isaProposal(),
    al = isaAloft(),
    cur = +S.flight.isaDev || 0;
  box.innerHTML = (pr ? `<span class="f-muted">${esc(tt(TX.isaHint, { d: signed(pr.dT), id: pr.id, t: pr.t, e: pr.elev.toLocaleString(S.ctx.lang()) }))}</span>${pr.dT !== cur ? `<button type="button" data-do="isause" data-v="${pr.dT}">${esc(tt(TX.isaUse, { d: signed(pr.dT) }))}</button>` : ''}` : '') +
    (al ? `<span class="f-muted">${esc(tt(TX.isaAloft, { d: signed(al.dT), l: flTxt(al.levelFt), m: al.short }))}</span>${al.dT !== cur ? `<button type="button" data-do="isause" data-v="${al.dT}">${esc(tt(TX.isaUse, { d: signed(al.dT) }))}</button>` : ''}` : '');
}
/** Écart ISA au niveau planifié d'après la prévision en altitude : moyenne le long de la route, pondérée par les
 *  tronçons ; null sans prévision. { dT, levelFt, short }. */
function isaAloft() {
  const al = aloftCalc();
  if (!al) return null;
  let sum = 0,
    tot = 0;
  for (let i = 1; i < al.winds.length; i++) {
    const a = al.winds[i - 1],
      b = al.winds[i],
      len = Math.max(0, al.nms[i] - al.nms[i - 1]);
    if (!a || !b || !len) continue;
    sum += (a.isaDev + b.isaDev) / 2 * len;
    tot += len;
  }
  return tot ? {
    dT: Math.round(sum / tot),
    levelFt: +S.flight.level?.ft || 0,
    short: S.aloft.short || S.aloft.model
  } : null;
}
/** Prend l'écart ISA proposé : vol courant et réglages du devis (dernier écart retenu). */
function useIsa(v = isaProposal()?.dT) {
  if (!Number.isFinite(+v)) return;
  S.flight.isaDev = +v;
  S.settings.isaDev = +v;
  const i = S.body.querySelector('[data-k="isa"]');
  if (i) i.value = +v || '';
  saveSettings();
  saveFlight();
  refresh();
}
/** Abaque de l'altitude-densité : écart ISA en abscisse, altitude-densité en ordonnée, une droite par altitude pression
 *  (celle où l'écart du vol atteint le plafond en gras) ; écart du vol (trait vertical), plafond de la fiche (trait
 *  horizontal) et leur croisement ; le départ d'après le METAR (température et QNH) marqué ; lignes de lecture dessous. */
function renderDa(C) {
  const box = S.body?.querySelector('[data-da]');
  if (!box || !S.body.querySelector('[data-fold="da"]').open) return;
  const dT = +S.flight.isaDev || 0,
    ceil = +C.sheet?.cruise?.ceilingFt || +C.perf?.ceiling || null,
    paMax = Math.max(10000, Math.ceil((ceil || 10000) / 5000) * 5000),
    pr0 = isaProposal(),
    depPa = pr0 ? pr0.elev + (pr0.qnh != null ? (1013.25 - pr0.qnh) * 27 : 0) : null,
    depDev = pr0 ? pr0.t - (15 - 0.0019812 * depPa) : null, // température du METAR, pas l'écart du vol
    depDa = pr0 ? densityAlt(depPa, depDev) : null,
    xlo = Math.floor(Math.min(-20, dT, depDev ?? 0) / 10) * 10,
    xhi = Math.ceil(Math.max(40, dT, depDev ?? 0) / 10) * 10,
    ymin = Math.min(0, densityAlt(0, xlo)),
    ymax = densityAlt(paMax, xhi),
    W = svgSize(box)[0],
    H = Math.min(360, Math.round(W * .75)),
    pl = 52,
    pr = 12,
    pt = 18,
    pb = 30,
    x = d => pl + (d - xlo) / (xhi - xlo) * (W - pl - pr),
    y = v => pt + (1 - (v - ymin) / ((ymax - ymin) || 1)) * (H - pt - pb),
    line = pa => [xlo, (xlo + xhi) / 2, xhi].map((d, i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(densityAlt(pa, d)).toFixed(1)}`).join(''),
    fmt = v => (Math.round(v) || 0).toLocaleString(S.ctx.lang()),
    kft = v => `${+(v / 1000).toFixed(1)}`;
  // plafond atteint à l'écart du vol : altitude pression où l'altitude-densité égale le plafond
  let effective = null;
  if (ceil) {
    let lo = -5000,
      hi = 60000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      densityAlt(mid, dT) < ceil ? lo = mid : hi = mid;
    }
    effective = Math.round(lo / 100) * 100;
  }
  // droites d'altitude pression, étiquetées à gauche quand elles ne se touchent pas
  const pas = ticks(0, paMax, W < 420 ? 6 : 10);
  let lastY = Infinity;
  const lines = pas.map(pa => {
    const ly = y(densityAlt(pa, xlo)),
      lab = lastY - ly >= 13 ? (lastY = ly, `<text x="${x(xlo) + 4}" y="${ly - 3}">${kft(pa)}</text>`) : '';
    return `<path d="${line(pa)}" class="fu-da"/>${lab}`;
  }).join('');
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tt(TX.da))}" class="fu-svg" data-chart="da">
    ${ticks(xlo, xhi, W < 420 ? 4 : 6).map(v => `<line x1="${x(v)}" x2="${x(v)}" y1="${pt}" y2="${H - pb}" class="fu-grid"/><text x="${x(v)}" y="${H - pb + 14}" text-anchor="middle">${signed(v)}</text>`).join('')}
    ${ticks(ymin, ymax, 5).map(v => `<text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join('')}
    <text x="${pl - 6}" y="${pt - 6}" text-anchor="start">${esc(tt(TX.daAxisY))}</text>
    <text x="${W - pr}" y="${H - 2}" text-anchor="end">${esc(tt(TX.daAxisX))}</text>
    ${lines}
    ${effective != null && effective > 0 && effective <= paMax ? `<path d="${line(effective)}" class="fu-line-f"/>` : ''}
    <line x1="${x(dT)}" x2="${x(dT)}" y1="${pt}" y2="${H - pb}" class="fu-now"/>
    ${ceil ? `<line x1="${pl}" x2="${W - pr}" y1="${y(ceil)}" y2="${y(ceil)}" class="fu-ceil"/><circle cx="${x(dT)}" cy="${y(ceil)}" r="5" class="fu-fast"/>` : ''}
    ${pr0 ? `<circle cx="${x(depDev)}" cy="${y(depDa)}" r="5" class="fu-best"/>` : ''}
  </svg>
  <p class="f-muted">${esc(tt(TX.daLines))}</p>
  ${pr0 ? `<p><span class="f-dot" style="background:var(--sog-chart-3)"></span> ${esc(tt(TX.daDep, { id: pr0.id, t: pr0.t, q: pr0.qnh != null ? Math.round(pr0.qnh) : '—', p: fmt(depPa), d: fmt(depDa) }))}</p>` : ''}
  <p>${ceil ? `<span class="f-dot" style="background:var(--sog-chart-4)"></span> ${esc(tt(ceilEstimated(C) ? TX.daCeilEst : TX.daCeil, { c: fmt(ceil), d: signed(dT), p: fmt(effective) }))}` : esc(tt(TX.daNoCeil))}</p>
  ${realProfileHtml(box)}`;
}

/** Niveau du plan fixé (ft) : champ, vol courant, résultats. */
function setLevel(ft) {
  if (!(ft > 0)) return;
  S.flight.level = {
    ft
  };
  const i = S.body.querySelector('[data-k="fl"]');
  if (i) i.value = Math.round(ft / 100);
  renderPts(); // niveaux continués des points
  if (S.aloft) aloftApply(); // vent, ISA au niveau et leur source refaits au nouveau niveau (puis devis)
  saveFlight();
  refresh();
}
/** Remplace le terrain was par now au début (départ) ou à la fin (arrivée) du texte de la route, s'il y est : dans un
 *  texte libre le mot (niveau collé gardé) ; dans une liste d'OFP « ID lat lon », l'entrée est retirée (la lecture de la
 *  route remet le nouveau terrain à sa place, aux coordonnées d'aerodb). Ailleurs, le texte ne change pas. */
function swapEnd(text, was, now, atEnd) {
  const t = String(text || ''),
    esc = was.replace(/[^A-Z0-9]/gi, ''),
    entries = t.split(/[,\n]+/).map(x => x.trim()).filter(Boolean);
  if (!esc) return t;
  if (entries.length > 1 && entries.every(x => /^[A-Z0-9]{2,7}\s+-?\d/i.test(x))) {
    const i = atEnd ? entries.length - 1 : 0;
    if (entries[i].toUpperCase().split(/\s+/)[0] !== was) return t;
    entries.splice(i, 1);
    return entries.join(',\n');
  }
  const words = t.trim().split(/\s+/),
    i = atEnd ? words.length - 1 : 0,
    w = words[i] || '';
  if (w.toUpperCase().split('/')[0] !== was) return t;
  if (now) words[i] = now + (w.includes('/') ? w.slice(w.indexOf('/')) : '');
  else words.splice(i, 1);
  return words.join(' ');
}
/** Distance (somme des tronçons) et route vraie (départ → arrivée) déduites des points ; champs et ligne de lecture
 *  mis à jour. */
function routeDerived(r) {
  const points = r.points || [];
  if (points.length >= 2) {
    r.distanceNm = Math.round(points.slice(1).reduce((s, p, i) => s + gcNm(points[i], p), 0));
    r.trackDeg = Math.round(bearing(points[0], points.at(-1)));
    r.manual = false;
    S.rmanualOpen = false;
    const $ = k => S.body?.querySelector(`[data-k="${k}"]`);
    if ($('dist')) $('dist').value = distField(r.distanceNm);
    if ($('trk')) $('trk').value = r.trackDeg;
  }
  renderRinfo();
}
/** Ligne de lecture sous la route : distance, route vraie et leur source (route résolue, OFP SimBrief, saisie à la
 *  main) ; sans route résolue, « Saisir à la main » déplie les deux champs (gardés ouverts tant que la saisie à la
 *  main tient). */
function renderRinfo() {
  const box = S.body?.querySelector('[data-rinfo]');
  if (!box) return;
  const r = S.flight.route || {},
    resolved = (r.points || []).length >= 2,
    open = !!r.manual || !!S.rmanualOpen;
  box.textContent = (resolved || r.manual) && r.distanceNm > 0 ? tt(TX.rinfo, {
    d: distTxt(r.distanceNm),
    t: r.trackDeg != null ? String(Math.round(r.trackDeg)).padStart(3, '0') : '—',
    s: tt(TX.rsrc[r.manual ? 'manual' : r.from === 'ofp' ? 'ofp' : 'route'])
  }) : tt(TX.rnone);
  S.body.querySelector('[data-rmanual]')?.classList.toggle('fu-hide', !open);
  const link = S.body.querySelector('[data-do="rmanual"]');
  if (link) link.hidden = open || resolved;
}
/** Liste des points (ordre, niveau facultatif, monter, descendre, retirer) ; le niveau ne se règle pas au départ ni à
 *  l'arrivée. L'indication d'un point sans niveau est celui qu'il continue. */
function renderPts() {
  const box = S.body?.querySelector('[data-pts]');
  if (!box) return;
  const pts = S.flight.route?.points || [],
    plan = +S.flight.level?.ft || 0;
  let cur = plan;
  box.innerHTML = pts.length ? pts.map((p, i) => {
    const mid = i > 0 && i < pts.length - 1,
      hint = cur > 0 ? Math.round(cur / 100) : '';
    if (mid && p.alt_ft > 0) cur = p.alt_ft;
    const id = esc(p.id || '?');
    return `<div class="f-item fu-pt"><span class="fu-ptid"><b>${id}</b><small class="f-muted">${(+p.lat).toFixed(2)} ${(+p.lon).toFixed(2)}</small></span>
      ${mid ? `<input data-k="ptalt" data-i="${i}" inputmode="numeric" maxlength="3" value="${p.alt_ft > 0 ? Math.round(p.alt_ft / 100) : ''}" placeholder="${hint}" aria-label="${esc(tt(TX.ptLevel, { id: p.id }))}">` : '<span class="fu-ptgap"></span>'}
      <button type="button" data-do="ptup" data-i="${i}" ${i ? '' : 'disabled'} aria-label="${esc(tt(TX.ptUp, { id: p.id }))}">${svg('chevron-up')}</button><button type="button" data-do="ptdown" data-i="${i}" ${i < pts.length - 1 ? '' : 'disabled'} aria-label="${esc(tt(TX.ptDown, { id: p.id }))}">${svg('chevron-down')}</button><button type="button" data-do="ptdel" data-i="${i}" aria-label="${esc(tt(TX.ptDel, { id: p.id }))}">${svg('x')}</button></div>`;
  }).join('') : `<p class="f-muted">${esc(tt(TX.ptsNone))}</p>`;
  const n = S.body.querySelector('[data-ptsn]');
  if (n) n.textContent = tt(TX.ptsN, {
    n: pts.length
  });
}
/** Points changés à la main : texte de la route réécrit, distance et route vraie déduites, vol courant écrit, devis
 *  refait ; la liste est redessinée sauf pendant la frappe d'un niveau (le champ garde la main). */
function routeEdited(redraw = true) {
  const r = S.flight.route;
  r.text = RT.textFromPoints(r.points || [], r.text || ''); // voies gardées entre deux points restés voisins
  r.from = 'points';
  const ta = S.body?.querySelector('[data-k="rtext"]');
  if (ta) ta.value = r.text;
  routeDerived(r);
  if (redraw) renderPts();
  if (S.aloft) aloftApply();
  saveFlight();
  refresh();
  scheduleWx();
}
/** Actions de la liste : monter, descendre, retirer un point, ajouter (identifiant cherché dans aerodb, ou « ID lat
 *  lon ») avant l'arrivée. */
async function pointAction(act, i) {
  const s = S,
    r = S.flight.route ||= emptyFlight().route,
    pts = r.points ||= [];
  if (act === 'ptup' && i > 0)[pts[i - 1], pts[i]] = [pts[i], pts[i - 1]];
  else if (act === 'ptdown' && i < pts.length - 1)[pts[i + 1], pts[i]] = [pts[i], pts[i + 1]];
  else if (act === 'ptdel') pts.splice(i, 1);
  else if (act === 'addpt') {
    const inp = S.body.querySelector('[data-k="addpt"]'),
      txt = inp.value.trim().toUpperCase();
    if (!txt) return;
    const m = /^([A-Z0-9]{2,7})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/.exec(txt),
      c = m ? {
        lat: +m[2],
        lon: +m[3]
      } : S.ctx.aerodb ? await S.ctx.aerodb.coords(txt).catch(() => null) : null;
    if (gone(s)) return;
    if (!c || !Number.isFinite(+c.lat) || !Number.isFinite(+c.lon) || Math.abs(c.lat) > 90 || Math.abs(c.lon) > 180)
      return S.ctx.notify(tt(TX.ptUnknown, {
        id: txt
      }), 'warn');
    const p = {
      id: m ? m[1] : txt,
      lat: +c.lat,
      lon: +c.lon
    };
    pts.length && pts.at(-1).id === r.arr ? pts.splice(pts.length - 1, 0, p) : pts.push(p);
    inp.value = '';
  } else return;
  routeEdited();
}
/** Paliers du devis : niveau des points intermédiaires (alt_ft) à leur distance cumulée du départ, ramenée à la
 *  distance du vol si elle a été tapée. */
function routeSteps(r, distanceNm) {
  const pts = r?.points || [];
  if (pts.length < 3) return null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcNm(pts[i - 1], pts[i]));
  const k = cum.at(-1) > 0 ? distanceNm / cum.at(-1) : 1,
    out = pts.slice(1, -1).map((p, i) => p.alt_ft > 0 ? {
      nm: cum[i + 1] * k,
      ft: +p.alt_ft
    } : null).filter(Boolean);
  return out.length ? out : null;
}
// ---------------------------------------------------------------- pas de la préparation
/** Va au pas i (0 Vol, 1 Route, 2 Météo, 3 Devis, 4 Départ) : un seul pas visible sur téléphone et dans un volet ;
 *  dans un module large tous le sont (CSS @container) et la barre de pas est cachée. Pas gardé sur l'appareil. */
function goStep(i) {
  S.step = Math.max(0, Math.min(4, i));
  S.ui.step = S.step;
  S.ctx.data.put(UI_PATH, S.ui);
  for (const sec of S.body.querySelectorAll('.fu-step')) sec.hidden = +sec.dataset.s !== S.step;
  S.body.querySelectorAll('.fu-steps button').forEach((b, k) => k === S.step ? b.setAttribute('aria-current', 'step') : b.removeAttribute(
    'aria-current'));
  refresh();
  S.body.querySelector('.fu-steps')?.scrollIntoView?.({
    block: 'nearest'
  });
}
/** Pas faits (✓ dans la barre) : vol (terrains, appareil, niveau), route (résolue ou saisie), météo (lue ou vent
 *  donné), devis (carburant chiffré), départ (vol démarré). */
function stepsDone(C) {
  const f = S.flight,
    r = f.route || {};
  return [
    !!(r.dep && r.arr && (f.aircraft?.type || f.aircraft?.sheetId) && f.level?.ft > 0),
    (r.points || []).length >= 2 || (r.manual && r.distanceNm > 0),
    !!S.wx || Number.isFinite(+f.wind?.speedKt),
    !!C.q?.hasFuel,
    !!f.started?.at
  ];
}
/** « Afficher la carte » : sur un écran large, la carte s'ouvre en volet à côté (vue double, #fuel?with=maps) ; sur
 *  téléphone, la Carte (retour vers le Carburant par l'en-tête). */
function showMap() {
  location.hash = matchMedia('(min-width: 980px)').matches ? '#fuel?with=maps' : '#maps?from=fuel';
}
/** « Démarrer le vol » : current_flight.started = { at, by: 'fuel' } écrit tout de suite, puis la Carte ; le compte
 *  rendu reprendra ce vol. */
async function startFlight() {
  const s = S,
    f = S.flight,
    btn = S.body.querySelector('[data-do="start"]'),
    note = S.body.querySelector('[data-startnote]'),
    unit = () => S.C?.sheet?.unit || 'kg',
    windTxt = w => Number.isFinite(+w?.speedKt) ? `${w.dirDeg != null ? `${String(Math.round(w.dirDeg)).padStart(3, '0')}°/` : ''}${speedTxt(w.speedKt)}` : '—',
    before = {
      wind: windTxt(f.wind),
      block: S.C?.q?.hasFuel ? fuelTxt(S.C.q.block, unit()) : '—'
    };
  if (btn) {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
  }
  S.startNote = tt(TX.starting);
  if (note) note.textContent = S.startNote;
  // la planification peut dater : date du vol = maintenant, météo des terrains, vents en altitude et ISA relus, devis refait
  f.weather = {
    ...f.weather,
    when: ''
  };
  const wd = S.body.querySelector('[data-k="wxdate"]');
  if (wd) wd.value = '';
  const online = S.ctx.net?.online?.() !== false;
  if (online) await wxFetch(false);
  if (gone(s)) return;
  refresh();
  const offline = !online || S.wx?.cached,
    q = S.C?.q,
    after = {
      wind: windTxt(f.wind),
      block: q?.hasFuel ? fuelTxt(q.block, unit()) : '—'
    },
    eta = q?.minutes ? hhmmLocal(new Date(Date.now() + ((+S.settings.taxiMin || 0) + q.minutes) * 60000).toISOString()) : '',
    diffs = [after.wind !== before.wind ? tt(TX.diffWind, {
      a: before.wind,
      b: after.wind
    }) : '', after.block !== before.block ? tt(TX.diffBlock, {
      a: before.block,
      b: after.block
    }) : ''].filter(Boolean);
  S.startNote = offline ? tt(TX.startOffline) : diffs.length ? tt(TX.startDiff, {
    l: [...diffs, eta ? tt(TX.diffEta, {
      t: eta
    }) : ''].filter(Boolean).join(' · ')
  }) : eta ? tt(TX.startSameEta, {
    t: eta
  }) : tt(TX.startSame);
  if (S.body.querySelector('[data-startnote]')) S.body.querySelector('[data-startnote]').textContent = S.startNote;
  S.flight.started = {
    at: new Date().toISOString(),
    by: 'fuel'
  };
  startNote = {
    at: S.flight.started.at,
    text: S.startNote
  };
  saveFlight();
  renderSummary(S.C || {});
  refresh();
  // écran large : on reste sur le pas Départ, la Carte à droite (vue double) ; téléphone : la Carte, après l'écriture du
  // vol courant (300 ms)
  if (matchMedia('(min-width: 980px)').matches) {
    if (!/with=maps/.test(location.hash)) location.hash = '#fuel?with=maps';
  } else setTimeout(() => location.hash = '#maps?from=fuel', 350);
}
/** Durée « 1 h 12 » (« 12 min » sous l'heure). */
const dur = min => {
  const m = Math.max(0, Math.round(min));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};
/** Heure UTC « 16:30Z » d'un instant ISO (frame/lib/time.js). */
const hhmmOf = iso => fmtZ(iso);
/** Heure UTC et heure locale de l'appareil « 16:30Z (18:30) » : seulement au départ, au décollage et à l'arrivée prévus. */
const hhmmLocal = iso => fmtZLocal(iso);
/** État du vol démarré, en une ligne : « Vol démarré à 13:22 · depuis 1 h 12 », « Vol terminé à 14:34 · bloc 1 h 12 »,
 *  déroutement signalé ; vide sans départ. */
function flightState() {
  const st = S.flight.started;
  if (!st?.at) return '';
  const div = st.diverted ? tt(TX.diverted) : '';
  return tt(TX.since, {
    t: hhmmLocal(st.at),
    d: dur((Date.now() - Date.parse(st.at)) / 60000)
  }) + div;
}
/** « Annuler le départ » (après confirmation) : started = null (null et non effacé : l'écriture fusionne avec le vol
 *  gardé), progression effacée. */
async function cancelStart() {
  const st = S.flight.started;
  if (!st?.at) return;
  const s = S;
  if (!(await S.ctx.ask(tt(TX.cancelAsk, {
      t: hhmmLocal(st.at)
    }))) || gone(s)) return;
  S.flight.started = null;
  S.flight.progress = null;
  saveFlight();
  refresh();
}
/** Progression prévue du vol démarré (progress.js) à l'instant (ou à l'heure d'arrêt) : { P, st, pos, etas } ; null sans
 *  départ ou sans devis. */
function progressCalc(C = S.C) {
  const f = S.flight,
    st = f.started,
    pts = f.route?.points || [];
  if (!st?.at || !C?.q?.hasFuel || pts.length < 2) return null;
  // vent de chaque tronçon : moyenne vectorielle des vents prévus à ses deux bouts (prévision en altitude), sinon celui du devis
  const vec = w => [w.kt * Math.sin(w.dirDeg * Math.PI / 180), w.kt * Math.cos(w.dirDeg * Math.PI / 180)],
    legWinds = pts.slice(1).map((p, i) => {
      const a = pts[i].wind,
        b = p.wind;
      if (!a || !b) return null;
      const x = (vec(a)[0] + vec(b)[0]) / 2,
        y = (vec(a)[1] + vec(b)[1]) / 2;
      return {
        dirDeg: (Math.atan2(x, y) * 180 / Math.PI + 360) % 360,
        kt: Math.hypot(x, y)
      };
    }),
    P = PG.plan({
      points: pts,
      distanceNm: +f.route.distanceNm || 0,
      taxiMin: +S.settings.taxiMin || 0,
      q: C.q,
      legWinds,
      wind: f.wind,
      windComponent: window.FuelModel.windComponent
    });
  if (!P) return null;
  const start = Date.parse(st.at),
    now = Date.now(),
    state = PG.at(P, (now - start) / 60000);
  return {
    P,
    st: state,
    pos: PG.position(pts, P.cum, state.nmFromDep),
    etas: PG.etas(P, start)
  };
}
/** current_flight.progress = { at, plannedPos { lat, lon, legIndex, nmFromDep }, eta: [{ id, at }], fuelRemainingKg,
 *  remainingNm, phase } ; null sans vol démarré. Écrit quand il change (chaque minute pendant le vol). force : écrit
 *  même si seul « at » change. */
function updateProgress(force = false) {
  const c = progressCalc(),
    f = S.flight,
    pts = f.route?.points || [];
  let next = null;
  if (c) {
    const unit = S.C?.sheet?.unit || 'kg',
      rem = Math.max(0, (S.C.q.block || 0) - c.st.fuelUsed);
    next = {
      at: new Date().toISOString(),
      plannedPos: {
        lat: +c.pos.lat.toFixed(4),
        lon: +c.pos.lon.toFixed(4),
        legIndex: c.pos.legIndex,
        nmFromDep: Math.round(c.st.nmFromDep * 10) / 10
      },
      eta: c.etas.map(e => ({
        id: pts[e.i]?.id || '',
        at: new Date(e.at).toISOString()
      })),
      fuelRemainingKg: Math.round(window.FuelModel.convertFuel(rem, unit, 'kg')),
      remainingNm: Math.round(c.st.remainingNm),
      phase: c.st.phase
    };
  }
  // comparées sur les seules clés de fuel (hors at) : la position réelle écrite par le cadre (progress.actual) ne
  // déclenche aucune réécriture ; elle reste en mémoire et dans le fichier (CF.merge ne touche pas aux clés d'autrui)
  const mine = x => JSON.stringify(CF.FUEL_PROGRESS.filter(k => k !== 'at').map(k => x?.[k] ?? null));
  if (!next && !CF.FUEL_PROGRESS.some(k => f.progress?.[k] != null)) return; // rien de fuel à effacer (actual seul : au cadre)
  if (!force && next && f.progress && mine(next) === mine(f.progress)) return;
  // la position prévue avance à chaque rendu (une écriture du cadre en provoque un) : écrite au plus une fois par
  // minute, sauf changement de phase, effacement ou demande expresse
  if (!force && next && f.progress && next.phase === f.progress.phase && Date.now() - (S.progressWritten || 0) < 60000) {
    return; // f.progress reste la dernière écrite : la suivante part dès la minute passée
  }
  S.progressWritten = next ? Date.now() : 0;
  f.progress = next ? {
    ...(f.progress?.actual ? {
      actual: f.progress.actual
    } : {}),
    ...next
  } : null;
  saveFlight();
}
/** Carte « Progression prévue » du pas Départ : la ligne de l'instant et la liste des points avec leur heure prévue, le
 *  tronçon en cours surligné. */
function renderProgress(C) {
  const card = S.body?.querySelector('[data-progcard]'),
    box = S.body?.querySelector('[data-prog]');
  if (!card || !box) return;
  const c = progressCalc(C);
  card.classList.toggle('fu-hide', !c);
  if (!c) return;
  const pts = S.flight.route.points,
    unit = C.sheet?.unit || 'kg',
    rem = fuelTxt(Math.max(0, C.q.block - c.st.fuelUsed), unit),
    line = c.st.phase === 'arrived' ? tt(TX.progArrived, {
      f: rem
    }) : c.st.phase === 'taxi' ? tt(TX.progTaxi, {
      t: c.etas[0] ? hhmmOf(new Date(c.etas[0].at).toISOString()) : '—', // décollage prévu : fin du roulage
      f: rem
    }) : tt(TX.progNow, {
      d: distTxt(c.st.nmFromDep),
      a: pts[c.pos.legIndex]?.id || '',
      b: pts[c.pos.legIndex + 1]?.id || '',
      r: distTxt(c.st.remainingNm),
      f: rem
    });
  box.innerHTML = `<p>${esc(line)}</p><div class="f-list">${c.etas.map(e => `<div class="f-item fu-eta${c.st.phase !== 'arrived' && e.i === c.pos.legIndex + 1 ? ' fu-next-pt' : ''}"${e.i === c.pos.legIndex + 1 && c.st.phase !== 'arrived' ? ' aria-current="step"' : ''}><span><b>${esc(pts[e.i]?.id || '')}</b></span><span class="f-num">${esc((e === c.etas[0] || e === c.etas.at(-1) ? hhmmLocal : hhmmOf)(new Date(e.at).toISOString()))}</span></div>`).join('')}</div>`;
}
/** Récapitulatif du pas Départ : appareil, route normalisée, niveau (paliers), vent et sa source, carburant bloc. */
function renderSummary(C) {
  const box = S.body?.querySelector('[data-sum]');
  if (!box) return;
  const f = S.flight,
    r = f.route || {},
    q = C.q,
    a = f.aircraft || {},
    none = tt(TX.sumNone),
    unit = C.sheet?.unit || 'kg',
    lvl = q ? q.steps ? q.steps.levels.map(l => flTxt(l.ft)).join(' → ') : flTxt(q.levelFt) : f.level?.ft ? flTxt(f.level.ft) : none,
    wind = Number.isFinite(+f.wind?.speedKt) ? `${f.wind.dirDeg != null ? `${String(Math.round(f.wind.dirDeg)).padStart(3, '0')}° ` : ''}${speedTxt(f.wind.speedKt)}` : none,
    block = q?.hasFuel ? q.windKnown || !Number.isFinite(q.blockLow) ? fuelTxt(q.block, unit) : `${fuelTxt(q.blockLow, unit)} – ${fuelTxt(q.blockHigh, unit)}` : none;
  box.innerHTML = `<dl class="f-dl">
    <dt>${esc(tt(TX.sumAircraft))}</dt><dd>${esc([a.name || a.type, a.registration, a.callsign].filter(Boolean).join(' · ') || none)}</dd>
    <dt>${esc(tt(TX.sumRoute))}</dt><dd><code class="fu-sumroute">${esc(r.text || [r.dep, r.arr].filter(Boolean).join(' ') || none)}</code></dd>
    <dt>${esc(tt(TX.sumLevel))}</dt><dd>${esc(lvl)}</dd>
    <dt>${esc(tt(TX.sumWind))}</dt><dd>${esc(wind)}${windShort() ? ` <span class="f-muted">(${esc(windShort())})</span>` : ''}</dd>
    <dt>${esc(tt(TX.sumBlock))}</dt><dd><b>${esc(block)}</b></dd></dl>`;
  const row = S.body.querySelector('[data-startrow]');
  if (row) {
    const on = !!f.started?.at; // un vol démarré s'arrête par son compte rendu (report remet started à null) ou s'annule
    row.innerHTML = on ? `<button type="button" data-do="cancelstart">${esc(tt(TX.cancelStart))}</button>` : `<button type="button" class="primary" data-do="start">${esc(tt(TX.start))}</button>`;
  }
  const sn = S.body.querySelector('[data-startnote]');
  if (sn) sn.textContent = f.started?.at && startNote?.at === f.started.at ? startNote.text : ''; // ce que la relecture au départ a changé
  renderProgress(C);
}
/** Vol courant écrit par un autre module (by ≠ 'fuel' : maps, route modifiée sur la carte) : ses points et son texte
 *  sont gardés tels qu'il les a écrits (ni relus ni normalisés) ; distance et route vraie redéduites des points, devis
 *  refait, profil réécrit et vol courant réécrit par fuel (by: 'fuel') — maps sait alors que TOC et TOD sont à jour.
 *  Que l'écran soit Préparer ou Fiches. */
function adoptForeignFlight() {
  const r = S.flight.route ||= emptyFlight().route;
  routeDerived(r);
  if (S.aloft) aloftApply(); // vents en altitude aux nouveaux points (relus si la route a changé : scheduleWx)
  const C = S.C = compute();
  S.flight.profile = verticalProfile(C.q);
  if (S.view === 'plan' && S.body) {
    const ta = S.body.querySelector('[data-k="rtext"]');
    if (ta && document.activeElement !== ta) ta.value = r.text || '';
    renderPts();
    refresh();
  }
  saveFlight();
}
/** Relit les points de la route (texte, départ, arrivée) dans aerodb, les points déjà connus du vol en secours ;
 *  distance et route vraie déduites. normalize : le texte est réécrit sous sa forme normalisée (routeText) — à la sortie
 *  du champ, pas pendant la frappe. Dernière demande seule retenue. */
function resolveRoute(normalize = true) {
  const seq = S.routeSeq = (S.routeSeq || 0) + 1;
  clearTimeout(S.routeTimer);
  S.routeTimer = setTimeout(async () => {
    const s = S,
      r = S.flight.route,
      known = new Map((r.points || []).filter(p => p?.id && Number.isFinite(+p.lat)).map(p => [p.id, p])),
      {
        points,
        unresolved,
        tokens
      } = await routePoints(r.text, r.dep, r.arr, known);
    if (gone(s) || seq !== S.routeSeq || !S.body) return;
    r.points = points;
    if (S.aloft) aloftApply();
    const ta = S.body.querySelector('[data-k="rtext"]');
    if (normalize && tokens.length && document.activeElement !== ta) {
      r.text = routeText(tokens);
      if (ta) ta.value = r.text;
    }
    routeDerived(r);
    renderPts();
    scheduleWx();
    // écran Fiches ouvert entre-temps : pas de ligne des points non reconnus à écrire
    const un = S.body.querySelector('[data-unres]'),
      ut = unresolved.length ? tt(TX.unresolved, {
        l: unresolved.join(', ')
      }) : '';
    if (un && un.textContent !== ut) un.textContent = ut;
    saveFlight();
    refresh();
  }, 500);
}
/** Dernier OFP SimBrief (identifiant de l'identité) par ctx.net : gardé sur l'appareil (cache), route, niveau, vent et
 *  appareil repris dans le vol courant. */
async function loadSimbrief() {
  const s = S,
    id = String(S.ctx.identity.simbrief || '').trim();
  if (!id) return S.ctx.notify(tt(TX.noSimbrief), 'warn');
  const url = `https://www.simbrief.com/api/xml.fetcher.php?${/^\d+$/.test(id) ? 'userid' : 'username'}=${encodeURIComponent(id)}&json=v2`;
  let res;
  try {
    res = await S.ctx.net.fetch(url);
  } catch (e) {
    if (gone(s)) return;
    return S.ctx.notify(tt(TX.sbError, {
      e: e.message || e
    }), 'err');
  }
  if (gone(s)) return;
  if (res.headers.get('x-sog-offline')) return S.ctx.notify(tt(TX.offline), 'warn');
  const ofp = res.ok ? await res.json().catch(() => null) : null;
  if (gone(s)) return;
  if (!ofp || !SH().isSimbriefOfp(ofp)) return S.ctx.notify(tt(TX.sbError, {
    e: ofp?.fetch?.status || res.status
  }), 'err');
  await S.ctx.data.put(OFP_PATH, ofp, {
    policy: 'cache'
  });
  if (gone(s)) return;
  S.ofp = ofp;
  applyOfp(ofp);
}
/** Reprend un OFP SimBrief dans le vol courant (route « ID lat lon », départ, arrivée, dégagement, niveau, vent moyen,
 *  écart ISA, appareil s'il a une fiche du même type ou de la même immatriculation). */
function applyOfp(ofp) {
  const g = ofp.general || {},
    fix = [].concat(ofp.navlog?.fix || []).filter(x => x && x.pos_lat !== undefined),
    dep = ofp.origin?.icao_code || '',
    arr = ofp.destination?.icao_code || '',
    pts = [{
      ident: dep,
      pos_lat: ofp.origin?.pos_lat,
      pos_long: ofp.origin?.pos_long
    }, ...fix].filter(p => p.ident && Number.isFinite(+p.pos_lat) && Number.isFinite(+p.pos_long)),
    type = String(ofp.aircraft?.icaocode || ofp.aircraft?.icao_code || '').toUpperCase(),
    reg = String(ofp.aircraft?.reg || '').toUpperCase(),
    f = S.flight,
    sheet = S.sheets.find(p => reg && String(p.registration || p.name || '').toUpperCase().includes(reg)) || S.sheets.find(p => (p.icao ||
      '').toUpperCase() === type);
  f.route = {
    ...f.route,
    text: pts.map(p => `${p.ident} ${(+p.pos_lat).toFixed(4)} ${(+p.pos_long).toFixed(4)}`).join(',\n'),
    dep,
    arr,
    altn: ofp.alternate?.icao_code || '',
    manual: false,
    from: 'ofp'
  };
  if (+g.initial_altitude > 0) f.level = {
    ft: +g.initial_altitude
  };
  if (Number.isFinite(+g.avg_wind_spd) && g.avg_wind_spd !== '') f.wind = {
    dirDeg: +g.avg_wind_dir || 0,
    speedKt: +g.avg_wind_spd
  };
  f.isaDev = +g.avg_temp_dev || 0;
  f.aircraft = sheet ? {
    sheetId: sheet.id,
    type: sheet.icao || type,
    registration: reg,
    name: sheet.name || sheet.id
  } : {
    sheetId: '',
    type,
    registration: reg,
    name: ofp.aircraft?.name || type
  };
  f.ofp = {
    date: ofp.params?.time_generated ? new Date(+ofp.params.time_generated * 1000).toISOString() : new Date().toISOString(),
    dep,
    arr,
    altn: f.route.altn,
    points: pts.length,
    levelFt: +g.initial_altitude || null,
    aircraft: `${type} ${reg}`.trim(),
    callsign: ofp.atc?.callsign || ''
  };
  S.ctx.notify(tt(TX.ofpLoaded, {
    dep,
    arr,
    n: pts.length
  }), 'ok');
  saveFlight();
  renderPlan();
  resolveRoute();
}
/** Redessine ce qui dépend du calcul : origine de la croisière, décision, résultat, blocs repliés ouverts. */
/** Profil vertical du devis pour maps (pilot/<trigramme>/current_flight.json, champ profile) : vario et vitesse sol
 *  moyens de la montée et de la descente, distances du départ au sommet de montée et du sommet de descente à
 *  l'arrivée ; null sans devis. Arrondis : 10 ft/min, 1 kt, 0,1 NM. */
function verticalProfile(q) {
  if (!q || !(q.levelFt > 0)) return null;
  const r = (v, s = 1) => Number.isFinite(v) ? +(Math.round(v / s) * s).toFixed(s < 1 ? 1 : 0) : null,
    rate = (p, ft = q.levelFt) => p?.min > 0 ? r(ft / p.min, 10) : null,
    speed = p => p?.min > 0 && Number.isFinite(p.nm) ? r(p.nm / (p.min / 60)) : null;
  return {
    climbFpm: rate(q.climb),
    climbKt: speed(q.climb),
    descentFpm: rate(q.descent, q.endFt ?? q.levelFt),
    descentKt: speed(q.descent),
    tocNm: r(q.climb?.nm, .1),
    todNm: r(q.descent?.nm, .1)
  };
}
/** Écrit le profil du devis dans le vol courant quand il change (maps le lit pour le profil vertical). */
function shareProfile(q) {
  const p = verticalProfile(q),
    sum = quoteSummary(q);
  if (JSON.stringify(p) === JSON.stringify(S.flight.profile ?? null) && JSON.stringify(sum) === JSON.stringify(S.flight.quote ?? null))
    return;
  S.flight.profile = p;
  S.flight.quote = sum;
  saveFlight();
}
/** Résumé du devis pour le compte rendu (current_flight.quote) : carburant bloc et délestage arrondis, dans l'unité de
 *  la fiche, temps de vol (min), niveau ; null sans devis chiffré. */
function quoteSummary(q) {
  if (!q?.hasFuel) return null;
  return {
    block: Math.round(q.block),
    trip: Math.round(q.trip),
    unit: S.C?.sheet?.unit || 'kg',
    minutes: Math.round(q.minutes),
    levelFt: q.levelFt || null,
    approx: !!q.approx
  };
}

/** Liens « Ouvrir dans » (frame/lib/external_links.js, règles de la V2) : SimBrief (dispatch prérempli), SkyVector
 *  (route avec vitesse et niveau), Navigraph et ChartFox (pages des terrains) ; une entrée grisée dit ce qui manque. */
function openInLinks(C) {
  const box = S.body?.querySelector('[data-openin]');
  if (!box) return;
  const f = S.flight,
    r = f.route || {},
    a = f.aircraft || {},
    list = XL.links({
      dep: r.dep,
      arr: r.arr,
      route: r.text,
      type: a.type || C.sheet?.icao || '',
      reg: a.registration,
      callsign: f.ofp?.callsign || '',
      altn: r.altn,
      fl: C.levelFt > 0 ? Math.round(C.levelFt / 100) : '',
      tas: C.q?.cruise?.tas
    }, (row, v) => S.ctx.t(row, v));
  box.innerHTML = list.map(l => l.href ? `<a class="f-item" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}<small class="f-muted">${esc(l.why || '')}</small></a>` : `<span class="f-item fu-off" aria-disabled="true">${esc(l.label)}<small class="f-muted">${esc(l.why || '')}</small></span>`).join('');
}

function refresh() {
  if (!S?.body || S.view !== 'plan') return;
  if (S.refsPending || S.flightPending) {
    const res = S.body.querySelector('[data-block="result"]'),
      ac = S.body.querySelector('[data-acsel]'),
      text = tt(S.flightPending ? TX.loadingFlight : TX.loadingRefs);
    if (res) {
      res.dataset.loading = '';
      res.innerHTML = `<span class="f-muted">${esc(text)}</span>`;
    }
    if (ac) ac.innerHTML = `<span class="f-muted">${esc(tt(TX.loadingRefs))}</span>`;
    S.body.inert = !!S.flightPending; // le vol pas encore lu : rien à saisir
    return;
  }
  S.body.querySelector('[data-block="result"]')?.removeAttribute('data-loading');
  const C = S.C = compute(),
    {
      q,
      D,
      G,
      sheet
    } = C,
    $ = s => S.body.querySelector(s),
    unit = sheet?.unit || 'kg';
  shareProfile(q);
  openInLinks(C);
  acSelected();
  renderSummary(C);
  updateProgress();
  const done = stepsDone(C);
  S.body.querySelectorAll('.fu-steps button').forEach((b, i) => b.toggleAttribute('data-done', !!done[i]));
  isaHint();
  renderDa(C);
  // appareil : origine de la croisière
  $('[data-src]').textContent = C.source ? tt(TX.source, {
    s: `${TX.kinds[C.source.kind] ? tt(TX.kinds[C.source.kind]) : C.source.kind || '—'}${C.source.approx ? ` (${tt(TX.approx)})` : ''}`
  }) : '';
  // décision du niveau
  const dec = $('[data-dec]');
  if (!sheet) dec.innerHTML = `<p class="f-muted">${esc(tt(TX.noSheet))}</p>`;
  else if (!C.perf) dec.innerHTML = `<p class="f-muted">${esc(tt(TX.noModel))}</p>`;
  else if (!q) dec.innerHTML = `<p class="f-muted">${esc(tt(TX.noDistance))}</p>`;
  else if (!D) dec.innerHTML = `<p class="f-muted">${esc(tt(TX.reasons.short))}</p>`;
  else dec.innerHTML = decisionSvg(C, dec) + `<div class="fu-legend">
      <span><span class="f-dot" style="background:var(--sog-chart-3)"></span>${esc(tt(TX.leastFuel, { fl: flTxt(D.best.h), f: fuelTxt(D.best.fuel, unit) }))}</span>
      <span><span class="f-dot fu-sq" style="background:var(--sog-chart-4)"></span>${esc(tt(TX.fastest, { fl: flTxt(D.fast.h), t: hmm(D.fast.minutes) }))}</span>
    </div>
    ${D.gap ? `<p class="f-warn">${esc(tt(TX.gap, { fl: flTxt(D.gap.from), r: tt(TX.reasons[D.gap.reason] || TX.reasons.thrust) }))}</p>` : ''}
    <div class="f-row"><button type="button" data-do="level" data-ft="${D.best.h}">${esc(tt(TX.use, { fl: flTxt(D.best.h) }))}</button>${D.fast.h !== D.best.h ? `<button type="button" data-do="level" data-ft="${D.fast.h}">${esc(tt(TX.use, { fl: flTxt(D.fast.h) }))}</button>` : ''}<span class="f-muted">${esc(tt(TX.decisionHint))}</span></div>`;
  // résultat collant
  const res = $('[data-block="result"]');
  if (!q) res.innerHTML = `<span class="f-muted">${esc(tt(sheet ? TX.noDistance : TX.noSheet))}</span>`;
  else if (!q.hasFuel) res.innerHTML = `<span class="f-warn">${esc(tt(TX.noFuel))}</span>`;
  else {
    const range = !q.windKnown && Number.isFinite(q.blockLow) && Number.isFinite(q.blockHigh) && Math.round(q.blockLow) !== Math.round(q
      .blockHigh);
    res.innerHTML = `${flightState() ? `<div class="fu-flightstate">${esc(flightState())}</div>` : ''}<div class="f-muted">${esc(tt(TX.block))} · ${q.steps ? q.steps.levels.map(l => flTxt(l.ft)).join(' → ') : flTxt(q.levelFt)}${unitOf('alt') !== 'ft' ? ` (${esc(altTxt(q.levelFt))})` : ''}${q.approx ? ` · ${esc(tt(TX.approx))}` : ''}${range ? ` · ${esc(tt(TX.windRange))}` : windShort() ? ` · ${esc(windShort())}` : ''}</div>
      <div class="fu-big">${range ? `${esc(fuelTxt(q.blockLow, unit))} – ${esc(fuelTxt(q.blockHigh, unit))}` : esc(fuelTxt(q.block, unit))}</div>
      <div class="f-tiles"><span class="f-muted">${esc(tt(TX.trip))}<b>${esc(fuelTxt(q.trip, unit))}</b></span><span class="f-muted">${esc(tt(TX.time))}<b>${hmm(q.minutes)}</b></span><span class="f-muted">${esc(tt(TX.tod))}<b>${esc(tt(TX.todVal, { d: distTxt(q.todNm) }))}</b></span></div>
      ${q.overMtow ? `<div class="f-warn">${esc(tt(TX.overMtow))}</div>` : ''}`;
  }
  // détail du devis (replié)
  const det = $('[data-details]');
  if ($('[data-fold="details"]').open) det.innerHTML = q?.hasFuel ? `<table class="f-table"><tbody>
      ${[[TX.taxi, q.taxi], [TX.climb, q.climb], [TX.cruise, q.cruise], ...(q.steps ? [[TX.steps, q.steps]] : []), [TX.descent, q.descent]].map(([l, p]) => `<tr><td>${esc(tt(l))}</td><td class="f-num">${p?.min != null ? hmm(p.min) : ''}</td><td class="f-num">${p?.nm != null ? esc(distTxt(p.nm)) : ''}</td><td class="f-num">${esc(fuelTxt(p?.fuel ?? p, unit))}</td></tr>`).join('')}
      <tr><td><b>${esc(tt(TX.trip))}</b></td><td class="f-num">${hmm(q.minutes)}</td><td></td><td class="f-num"><b>${esc(fuelTxt(q.trip, unit))}</b></td></tr>
      <tr><td>${esc(tt(TX.contingency))}</td><td></td><td></td><td class="f-num">${esc(fuelTxt(q.contingency, unit))}</td></tr>
      <tr><td>${esc(tt(TX.reserve))}</td><td></td><td></td><td class="f-num">${esc(fuelTxt(q.reserve, unit))}</td></tr>
      <tr><td><b>${esc(tt(TX.block))}</b></td><td></td><td></td><td class="f-num"><b>${esc(fuelTxt(q.block, unit))}</b></td></tr>
    </tbody></table>${q.lawFailed ? `<p class="f-warn">${esc(tt(TX.lawFailed))}</p>` : ''}` : '';
  // consignes de montée (repliées)
  const cl = $('[data-climb]'),
    // colonne d'altitude : niveaux de vol tant que l'unité d'altitude est le pied, sinon l'altitude dans l'unité choisie
    altUnit = unitOf('alt') !== 'ft';
  if ($('[data-fold="climb"]').open) cl.innerHTML = G ? climbSvg(G, cl) + `<div class="f-scroll"><table class="f-table"><thead><tr><th class="f-num">${esc(tt(TX.alt))}${altUnit ? ` (${esc(altLabel())})` : ''}</th><th class="f-num">${esc(tt(TX.thr))}</th><th class="f-num">RPM</th><th class="f-num">IAS (${esc(speedLabel())})</th><th class="f-num">${esc(vsLabel())}</th><th class="f-num">${esc(unit)}/h</th><th class="f-num">Mach</th><th class="f-num">${esc(tt(TX.time))}</th><th class="f-num">${esc(unit)}</th></tr></thead><tbody>
      ${G.rows.map(r => `<tr><td class="f-num">${r.h ? altUnit ? altNum(r.h) : flTxt(r.h) : 'GND'}</td><td class="f-num">${Math.round(r.frac * 100)} %</td><td class="f-num">${r.rpm ? Math.round(r.rpm) : '—'}</td><td class="f-num">${speedNum(r.ias)}</td><td class="f-num">${vsNum(r.roc)}</td><td class="f-num">${Math.round(r.ff)}</td><td class="f-num">${r.mach.toFixed(2)}</td><td class="f-num">${hmm(r.t)}</td><td class="f-num">${Math.round(r.f)}</td></tr>`).join('')}
    </tbody></table></div>${G.reached ? '' : `<p class="f-warn">${esc(tt(TX.notReached, { r: vsTxt(20) }))}</p>`}` : `<p class="f-muted">${esc(tt(C.perf ? TX.noDistance : TX.noModel))}</p>`;
  // débit de ce vol (dans les réglages)
  const eb = $('[data-entrybox]');
  if (sheet && eb.dataset.for !== sheet.id) {
    eb.dataset.for = sheet.id;
    eb.innerHTML = `<label class="f-field">${esc(tt(TX.entry))}<input data-k="entry" inputmode="decimal" value="${esc(S.settings.entries?.[sheet.id] ?? '')}"></label>`;
  }
}

// ---------------------------------------------------------------- écran Fiches
/** Dessine la liste des fiches et les gestes d'import. */
function renderSheets() {
  if (S.refsPending) return void(S.body.innerHTML = `<p class="f-muted">${esc(tt(TX.loadingRefs))}</p>`); // fiches pas encore là
  const F = SH(),
    lang = S.ctx.lang();
  S.edit = null;
  S.body.innerHTML = `<p class="f-muted">${esc(tt(TX.sheetsIntro))}</p>
    <div class="f-row" style="margin-bottom:var(--sog-gap)">
      <button type="button" class="primary" data-do="import">${esc(tt(TX.import))}</button>
      <button type="button" data-do="paste">${esc(tt(TX.paste))}</button>
      <button type="button" data-do="new">${esc(tt(TX.newSheet))}</button>
      ${S.ofp ? `<button type="button" data-do="ofp">${esc(tt(TX.fromOfp))}</button>` : ''}
      <input type="file" data-file accept=".csv,.json,.lnmperf,.txt,.xml" multiple hidden>
    </div>
    <div class="f-card fu-hide" data-pastebox><label class="f-field">${esc(tt(TX.pasteAsk))}<textarea data-k="pastetext" rows="6"></textarea></label>
      <button type="button" class="primary" data-do="pasteread">${esc(tt(TX.read))}</button></div>
    <div class="f-list">${sheetGroups().map(g => `<h3 class="fu-cat">${esc(tt(TX.sheetCats[g.cat]))}</h3>${g.rows.map(r => {
      if (r.todo) return `<div class="f-item" data-type="${esc(r.todo.type)}"><div><b>${esc(S.A.label?.(r.todo.type) || r.todo.type)}</b>
        <div class="f-muted">${esc(tt(TX.coType, { n: r.todo.registrations.length }))}</div></div>
        <div class="f-row"><button type="button" data-do="newfor">${esc(tt(TX.createSheet))}</button></div></div>`;
      const p = F.normalize(structuredClone(r.sheet)),
        miss = F.sheetMissingPaths(p).length,
        when = F.profileWhen(p);
      return `<div class="f-item" data-id="${esc(p.id)}"><div><b>${esc(p.name || p.id)}</b> <span class="f-muted">${esc(p.icao || '')} · ${esc(p.unit)}</span>
        <div class="f-muted">${esc(F.profileSourceText(p))} · ${esc(miss ? tt(TX.missing, { n: miss }) : tt(TX.complete))}${when ? ` · ${esc(tt(TX.updated, { d: new Date(when).toLocaleDateString(lang) }))}` : ''}</div></div>
        <div class="f-row"><button type="button" data-do="use">${esc(tt(TX.useSheet))}</button><button type="button" data-do="edit">${esc(tt(TX.edit))}</button></div></div>`;
    }).join('')}`).join('') || `<p class="f-card f-muted">${esc(tt(TX.noSheet))}</p>`}</div>`;
  S.body.onclick = e => onSheetsClick(e);
  S.body.oninput = S.body.onkeydown = null;
  S.body.onchange = e => e.target.matches('[data-file]') && importFiles([...e.target.files]);
}
/** Liste de l'écran Fiches rangée comme la V2 : par catégorie (hélicoptères, turbopropulseurs, réacteurs, pistons,
 *  autres ; aerodb classify), les fiches, puis les types de la compagnie qui n'en ont pas (« à compléter ») ; par nom. */
function sheetGroups() {
  const A = S.A || {},
    canon = c => String(A.canonical?.(c) || c || '').toUpperCase(),
    catOf = c => A.classify?.(c)?.category || 'other',
    covered = new Set(S.sheets.flatMap(x => [x.icao, x.type, x.id].filter(Boolean).map(canon))),
    rows = [...S.sheets.map(sheet => ({
      sheet,
      cat: catOf(sheet.icao || sheet.type || sheet.id),
      name: String(sheet.name || sheet.id)
    })), ...(S.coTypes || []).filter(t => !covered.has(canon(t.type))).map(todo => ({
      todo,
      cat: catOf(todo.type),
      name: String(A.label?.(todo.type) || todo.type)
    }))];
  return ['helico', 'turboprop', 'jet', 'piston', 'other'].map(cat => ({
    cat,
    rows: rows.filter(r => r.cat === cat).sort((a, b) => (!!a.todo - !!b.todo) || a.name.localeCompare(b.name, undefined, {
      numeric: true
    }))
  })).filter(g => g.rows.length);
}
/** Gestes de l'écran Fiches (liste, éditeur, aperçu des changements). */
async function onSheetsClick(e) {
  const s = S,
    b = e.target.closest('[data-do]');
  if (!b) return;
  const F = SH(),
    id = b.closest('[data-id]')?.dataset.id,
    p = S.edit;
  switch (b.dataset.do) {
    case 'import':
      return S.body.querySelector('[data-file]').click();
    case 'paste': {
      const box = S.body.querySelector('[data-pastebox]');
      box.classList.toggle('fu-hide');
      if (!box.classList.contains('fu-hide')) box.querySelector('textarea').focus();
      return;
    }
    case 'pasteread': {
      const txt = S.body.querySelector('[data-k="pastetext"]').value;
      if (txt.trim()) await importText(txt, tt(TX.pasted));
      return;
    }
    case 'new':
    case 'newfor': { // « Créer la fiche » d'un type de la compagnie : son code, sans le demander
      const code = (b.dataset.do === 'newfor' ? b.closest('[data-type]')?.dataset.type || '' : await S.ctx.askText(tt(TX.typeCode), {
        value: ''
      }) || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!code || gone(s)) return;
      const sb = F.simbriefRecordFor(code),
        model = S.A?.record?.(code)?.model, // nom du modèle (base des types) : « EC-145 » plutôt que « EC45 »
        np = sb ? F.profileFromSimbriefType(code, sb) : F.normalize({
          id: code,
          icao: code,
          name: model && S.A.displayName ? S.A.displayName(model).split(' — ')[0] : code
        });
      np.id = uniqueId(np.id || code);
      return review(null, F.normalize(np), {});
    }
    case 'ofp': {
      if (!S.ofp) return S.ctx.notify(tt(TX.noOfp), 'warn');
      const np = F.profileFromOFP(S.ofp),
        c = F.extractOfpCalibration(S.ofp);
      if (c) F.applyCalibration(np, c);
      return proposeIncoming([F.normalize(np)]);
    }
    case 'use': {
      const raw = S.sheets.find(x => x.id === id);
      S.flight.aircraft = {
        sheetId: raw.id,
        type: raw.icao || raw.type || '',
        registration: raw.registration || '',
        callsign: raw.callsign || '',
        name: raw.name || raw.id,
        source: 'sheet'
      };
      saveFlight();
      return show('plan');
    }
    case 'edit':
      return renderEditor(id);
    case 'back':
      return renderSheets();
    case 'rpmadd': {
      const d = readEditor(p, true);
      d.rpmFuelCurve.push({
        rpm: null,
        altFt: null,
        fuelFlowPerHour: null
      });
      return renderEditor(p.id, F.normalize(d));
    }
    case 'rpmdel': {
      const d = readEditor(p, true);
      d.rpmFuelCurve.splice(+b.dataset.i, 1);
      return renderEditor(p.id, d);
    }
    case 'save': {
      const out = readEditor(p);
      return review(S.sheets.find(x => x.id === p.id), out, {});
    }
    case 'apd': {
      const a = F.apdFor(p);
      if (!a) return S.ctx.notify(tt(TX.noApd), 'warn');
      const out = structuredClone(p),
        filled = new Set();
      for (const [path, x] of Object.entries(a.fields || {})) {
        const was = F.pathGet(p, path);
        if (was === null || was === undefined || was === '') filled.add(path);
        F.pathSet(out, path, x.v);
      }
      // une valeur déjà renseignée n'est remplacée que cochée par le pilote
      return review(p, out, {
        checked: path => filled.has(path),
        src: 'EUROCONTROL',
        source: 'eurocontrol'
      });
    }
    case 'fill': {
      const other = S.sheets.find(x => x.id === S.body.querySelector('[data-k="fillfrom"]')?.value);
      if (!other) return;
      return review(p, F.fillProfileGaps(structuredClone(p), F.normalize(structuredClone(other))), {
        src: other.name || other.id,
        source: 'edit'
      });
    }
    case 'gpt':
    case 'gptmiss': {
      const txt = b.dataset.do === 'gpt' ? F.gptPrompt({
        id: p.id,
        p
      }) : F.gptMissingPrompt([{
        p,
        paths: F.sheetMissingPaths(p)
      }]);
      const box = S.body.querySelector('[data-k="gptprompt"]');
      box.value = txt;
      box.closest('label').classList.remove('fu-hide');
      // presse-papiers, sinon copie à l'ancienne, sinon la demande reste sélectionnée dans sa zone : « copiez-la »
      const how = await copyText(txt, {
        box
      });
      S.ctx.notify(tt(how === 'shown' ? TX.copyManual : TX.copied), how === 'shown' ? 'warn' : 'ok');
      return;
    }
    case 'gptread': {
      const txt = S.body.querySelector('[data-k="gptreply"]').value;
      if (!txt.trim()) return;
      try {
        const r = F.parseGptReply(txt, F.normalize(structuredClone(p)).icao),
          incoming = r.profile?.sheets ? r.profile.sheets.find(x => x.id === p.id) || r.profile.sheets[0] : r.profile;
        for (const w of r.warnings || []) S.ctx.notify(w, 'warn');
        return review(p, mergeInto(p, F.normalize(incoming)), {
          src: 'ChatGPT',
          source: 'chatgpt'
        });
      } catch (err) {
        return S.ctx.notify(String(err.message || err), 'err');
      }
    }
    case 'lnm':
      try {
        return download(`${p.id}.lnmperf`, F.toLnmperf(F.normalize(structuredClone(p))), 'application/xml');
      } catch (err) {
        return S.ctx.notify(String(err.message || err), 'err');
      }
    case 'json':
      return download(`${p.id}.json`, JSON.stringify(plain(p), null, 1), 'application/json');
    case 'del':
      if (!(await S.ctx.ask(tt(TX.removeAsk, {
          n: p.name || p.id
        })))) return;
      if (gone(s)) return;
      await S.A.sheets.remove(p.id);
      await readSheets();
      return gone(s) ? undefined : renderSheets();
    case 'apply':
      return applyReview();
    case 'cancel':
      return S.edit ? renderEditor(S.edit.id) : renderSheets();
  }
}
/** Clé d'une ligne RPM (régime et altitude), comme celle de l'aperçu de la V2. */
const rpmKey = r => `${Math.round(Number(r.rpm) * 1000)}@${r.altFt ?? ''}`;
/** Identifiant libre dans la base (suffixe -2, -3… si pris). */
function uniqueId(id) {
  let out = id,
    k = 2;
  while (S.sheets.some(x => x.id === out)) out = `${id}-${k++}`;
  return out;
}
/** Fiche entrante ramenée à la fiche existante p : même identifiant et nom, carburant dans l'unité de p, champs vides de
 *  l'entrante complétés par p (la réponse l'emporte champ par champ, le pilote choisit ensuite). */
function mergeInto(p, incoming) {
  const F = SH();
  let src = structuredClone(incoming);
  if (src.unit && p.unit && src.unit !== p.unit && ['kg', 'lb'].includes(src.unit) && ['kg', 'lb'].includes(p.unit)) src = F
    .fuelConvertedCopy(src, src.unit, p.unit, true);
  src.id = p.id;
  src.name = p.name || src.name;
  src.unit = p.unit;
  return F.fillProfileGaps(F.normalize(src), F.normalize(structuredClone(p)));
}
/** Fiches lues (fichier, texte, OFP) : une fiche de même identifiant passe par l'aperçu des changements, une nouvelle
 *  aussi (créée à l'application) ; une à la fois. */
function proposeIncoming(list) {
  S.queue = list.slice(1);
  const np = list[0];
  if (!np) return renderSheets();
  const old = S.sheets.find(x => x.id === np.id);
  return review(old || null, old ? mergeInto(SH().normalize(structuredClone(old)), np) : np, {
    src: np.source?.format || np.source?.file || '',
    source: /lnm/i.test(np.source?.format || '') ? 'lnmperf' : np.calibration ? 'ofp' : 'import'
  });
}
/** Lit des fichiers choisis (CSV, JSON, .lnmperf, OFP) puis propose leurs fiches. */
async function importFiles(files) {
  const s = S,
    all = [];
  for (const file of files) {
    const txt = await file.text();
    all.push(...readText(txt, file.name));
  }
  if (all.length && !gone(s)) proposeIncoming(all);
}
/** Lit un texte collé (fiche, CSV, .lnmperf, OFP, réponse ChatGPT) puis propose ses fiches. */
async function importText(txt, name) {
  const list = readText(txt, name);
  if (list.length) proposeIncoming(list);
}
/** Fiches d'un texte, selon sa forme : XML .lnmperf, JSON (base, fiche, OFP SimBrief calibré), CSV de performances,
 *  sinon réponse ChatGPT ; notification du nombre lu ou de l'échec. */
function readText(txt, name) {
  const F = SH(),
    s = String(txt || '').replace(/^﻿/, '').trim();
  let list = [];
  try {
    if (/^<\?xml|<AircraftPerf/i.test(s)) list = [F.parseLnmperf(s, name)];
    else if (/^[{[]/.test(s) && (() => {
        try {
          JSON.parse(s);
          return true;
        } catch {
          return false;
        }
      })()) {
      const o = JSON.parse(s);
      if (F.isSimbriefOfp(o)) {
        const p = F.profileFromOFP(o),
          c = F.extractOfpCalibration(o);
        if (c) F.applyCalibration(p, c);
        list = [p];
      } else list = F.profilesFromJson(o, name);
    } else if (/aircraft/i.test(s.split(/\r?\n/)[0]) && /icao/i.test(s.split(/\r?\n/)[0])) {
      try {
        list = F.parsePerformanceCsvEnriched(s, name);
      } catch {
        list = F.parsePerformanceCsv(s, name);
      }
    } else {
      const r = F.parseGptReply(s);
      for (const w of r.warnings || []) S.ctx.notify(w, 'warn');
      list = r.profile?.sheets || [r.profile];
    }
    list = list.filter(Boolean).map(p => F.normalize(p, name));
    S.ctx.notify(tt(TX.imported, {
      n: list.length,
      f: name
    }), list.length ? 'ok' : 'warn');
  } catch (e) {
    S.ctx.notify(tt(TX.unreadable, {
      f: name,
      e: e.message || e
    }), 'err');
  }
  return list;
}
/** Table régime / débit modifiable : écran d'ordinateur seulement (sur téléphone, en lecture). */
const rpmEditable = () => matchMedia('(min-width: 761px)').matches;
/** Éditeur d'une fiche : champs par groupe (libellés traduits), table RPM (modifiable sur écran d'ordinateur),
 *  compléments, ChatGPT, exports. draft : fiche en cours de saisie (ligne RPM ajoutée ou retirée), sinon celle de la base. */
function renderEditor(id, draft = null) {
  const F = SH(),
    raw = S.sheets.find(x => x.id === id);
  if (!raw) return renderSheets();
  const p = S.edit = draft || F.normalize(structuredClone(raw)),
    rpmCell = (i, k, v) => `<td class="f-num"><input data-rpm="${i}" data-rk="${k}" inputmode="decimal" value="${esc(v ?? '')}" style="width:7em" aria-label="${esc(k)}"></td>`,
    groups = [...new Set(F.PROFILE_FIELDS.map(f => f[0]))],
    fuelUnit = path => F.FUEL_PATHS.has(path) ? ` (${p.unit}${path.endsWith('fuelFlowPerHour') ? '/h' : ''})` : '',
    input = ([, , path, type]) => {
      const v = F.pathGet(p, path),
        lab = esc(fieldLabel(path) + fuelUnit(path));
      if (type === 'bool') return `<label class="f-check"><input type="checkbox" data-path="${path}" data-type="bool"${v ? ' checked' : ''}>${lab}</label>`;
      if (type.startsWith('select:')) return `<label class="f-field">${lab}<select data-path="${path}" data-type="text"><option value=""></option>${type.slice(7).split(',').map(o => `<option${String(v ?? '') === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
      if (type === 'textarea') return `<label class="f-field">${lab}<textarea rows="2" data-path="${path}" data-type="text">${esc(v ?? '')}</textarea></label>`;
      return `<label class="f-field">${lab}<input data-path="${path}" data-type="${type}" value="${esc(v ?? '')}"${type === 'number' ? ' inputmode="decimal"' : ''}></label>`;
    },
    others = S.sheets.filter(x => x.id !== p.id);
  S.body.innerHTML = `<div class="f-row" style="margin-bottom:var(--sog-gap)"><button type="button" data-do="back">${esc(tt(TX.back))}</button><b>${esc(p.name || p.id)}</b><span class="f-muted">${esc(F.profileSourceText(p))}</span></div>
    <div class="f-card"><div class="f-row">
      <button type="button" data-do="apd">${esc(tt(TX.eurocontrol))}</button>
      ${others.length ? `<select data-k="fillfrom" aria-label="${esc(tt(TX.fillFrom))}">${others.map(o => `<option value="${esc(o.id)}"${(o.icao || '') === (p.icao || '-') ? ' selected' : ''}>${esc(o.name || o.id)}</option>`).join('')}</select><button type="button" data-do="fill">${esc(tt(TX.fillFrom))}</button>` : ''}
    </div></div>
    <details class="f-card"><summary>${esc(tt(TX.gpt))}</summary>
      <div class="f-row"><button type="button" data-do="gpt">${esc(tt(TX.gptPrompt))}</button><button type="button" data-do="gptmiss">${esc(tt(TX.gptMissing))}</button></div>
      <label class="f-field fu-hide">&nbsp;<textarea data-k="gptprompt" rows="4" readonly></textarea></label>
      <label class="f-field">${esc(tt(TX.gptReply))}<textarea data-k="gptreply" rows="4"></textarea></label>
      <button type="button" data-do="gptread">${esc(tt(TX.read))}</button>
    </details>
    ${groups.map((g, i) => `<details class="f-card"${i < 2 ? ' open' : ''}><summary>${esc(FIELD_TX[g] ? tt(FIELD_TX[g]) : g)}</summary><div class="f-grid fu-g3">${F.PROFILE_FIELDS.filter(f => f[0] === g).map(input).join('')}</div></details>`).join('')}
    ${rpmEditable() ? `<details class="f-card" open><summary>${esc(tt(TX.rpmTable))}</summary><div class="f-scroll"><table class="f-table"><thead><tr><th class="f-num">RPM</th><th class="f-num">ft</th><th class="f-num">${esc(p.unit)}/h min</th><th class="f-num">${esc(p.unit)}/h</th><th class="f-num">${esc(p.unit)}/h max</th><th></th></tr></thead><tbody>${p.rpmFuelCurve.map((r, i) => `<tr>${rpmCell(i, 'rpm', r.rpm)}${rpmCell(i, 'altFt', r.altFt)}${rpmCell(i, 'fuelFlowMin', r.fuelFlowMin)}${rpmCell(i, 'fuelFlowPerHour', r.fuelFlowPerHour)}${rpmCell(i, 'fuelFlowMax', r.fuelFlowMax)}<td><button type="button" data-do="rpmdel" data-i="${i}" aria-label="${esc(tt(TX.remove))}">✕</button></td></tr>`).join('')}</tbody></table></div><button type="button" data-do="rpmadd">${esc(tt(TX.rpmAdd))}</button></details>` : p.rpmFuelCurve.length ? `<details class="f-card"><summary>${esc(tt(TX.rpmTable))}</summary><div class="f-scroll"><table class="f-table"><thead><tr><th class="f-num">RPM</th><th class="f-num">ft</th><th class="f-num">${esc(p.unit)}/h</th></tr></thead><tbody>${p.rpmFuelCurve.map(r => `<tr><td class="f-num">${esc(r.rpm)}</td><td class="f-num">${esc(r.altFt ?? '')}</td><td class="f-num">${esc([r.fuelFlowMin, r.fuelFlowPerHour, r.fuelFlowMax].filter(x => x != null && x !== '').join(' / '))}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
    <div class="f-row"><button type="button" class="primary" data-do="save">${esc(tt(TX.save))}</button><button type="button" data-do="lnm">${esc(tt(TX.exportLnm))}</button><button type="button" data-do="json">${esc(tt(TX.exportJson))}</button><button type="button" data-do="del">${esc(tt(TX.remove))}</button></div>`;
}
/** Fiche de l'éditeur avec les valeurs des champs (nombres lus, vides → null). */
function readEditor(p, keepEmpty = false) {
  const F = SH(),
    out = structuredClone(p);
  // table RPM saisie (écran d'ordinateur) : chaque ligne reprend ses autres champs ; sans régime, retirée à
  // l'enregistrement
  if (S.body.querySelector('[data-rpm]')) {
    out.rpmFuelCurve = out.rpmFuelCurve.map(r => ({
      ...r
    }));
    for (const i of S.body.querySelectorAll('[data-rpm]')) {
      const row = out.rpmFuelCurve[+i.dataset.rpm],
        k = i.dataset.rk,
        v = num(i.value);
      if (v !== null || (row[k] !== undefined && row[k] !== null && row[k] !== '')) row[k] = v;
    }
    if (!keepEmpty) out.rpmFuelCurve = out.rpmFuelCurve.filter(r => r.rpm !== null);
  }
  for (const i of S.body.querySelectorAll('[data-path]')) {
    const t = i.dataset.type,
      v = t === 'bool' ? i.checked : t === 'number' ? num(i.value) : i.value.trim() || null;
    // case décochée d'un champ jamais renseigné : laissé vide (pas de « false » inventé)
    if (t === 'bool' && !v && F.pathGet(p, i.dataset.path) == null) continue;
    F.pathSet(out, i.dataset.path, v);
  }
  return F.normalize(out);
}
/** Aperçu des changements before → after : une ligne cochable par champ et par ligne de table RPM ; o.checked(path) :
 *  coché d'office (tout sinon), o.src : origine affichée. Appliquer écrit la sélection (pickChanges). */
function review(before, after, o = {}) {
  const F = SH(),
    diff = F.profileDiff(before, after, {}, o.src || ''),
    rows = diff.rows.filter(r => r.changed && !r.path.startsWith('source') && !r.path.startsWith('calibration') && r.path !==
      'description' || (r.changed && r.path === 'description' && before)),
    show = v => {
      if (v === undefined || v === null || v === '') return '—';
      try {
        if (typeof v === 'string' && v.startsWith('"')) v = JSON.parse(v);
      } catch {
        /* texte tel quel */
      }
      return esc(String(v));
    },
    box = (attr, on) => before ? `<td><input type="checkbox" ${attr}${on ? ' checked' : ''}></td>` : '<td></td>',
    ff = r => [r.fuelFlowMin, r.fuelFlowPerHour, r.fuelFlowMax].filter(x => x !== null && x !== undefined && x !== '').join(' / '),
    gone = (before?.rpmFuelCurve || []).filter(r => r.rpm !== null && r.rpm !== '' && !(after.rpmFuelCurve || []).some(a => rpmKey(a) ===
      rpmKey(r)));
  S.pending = {
    source: o.source || 'edit',
    before,
    after,
    diff,
    gone
  };
  S.body.innerHTML = `<div class="f-card"><h2>${esc(before ? tt(TX.review) : tt(TX.reviewNew, { n: after.name || after.id }))}${o.src ? ` <span class="f-muted">· ${esc(o.src)}</span>` : ''}</h2>
    ${rows.length || diff.curve.length || gone.length ? `<div class="f-scroll"><table class="f-table"><thead><tr><th></th><th>${esc(tt(TX.field))}</th><th class="f-num">${esc(tt(TX.before))}</th><th class="f-num">${esc(tt(TX.after))}</th></tr></thead><tbody>
      ${rows.map(r => `<tr>${box(`data-path="${esc(r.path)}"`, !o.checked || o.checked(r.path))}<td>${esc(fieldLabel(r.path, true))}</td><td class="f-num">${show(r.old)}</td><td class="f-num">${show(r.now)}</td></tr>`).join('')}
      ${diff.curve.map(c => `<tr>${box(`data-curve="${esc(c.key)}"`, true)}<td>RPM ${esc(c.label)} <span class="f-muted">(${esc(tt(c.kind === 'added' ? TX.added : TX.replaced))})</span></td><td class="f-num">${esc(c.old)}</td><td class="f-num">${esc(c.now)}</td></tr>`).join('')}
      ${gone.map((r, i) => `<tr>${box(`data-gone="${i}"`, true)}<td>RPM ${esc(r.rpm)}${r.altFt !== null && r.altFt !== undefined && r.altFt !== '' ? ` @ ${esc(r.altFt)} ft` : ''} <span class="f-muted">(${esc(tt(TX.rpmGone))})</span></td><td class="f-num">${esc(ff(r))}</td><td class="f-num">—</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="f-muted">${esc(tt(TX.reviewNone))}</p>`}
    <div class="f-row"><button type="button" class="primary" data-do="apply">${esc(tt(TX.apply))}</button><button type="button" data-do="cancel">${esc(tt(TX.cancel))}</button></div></div>`;
}
/** Écrit la sélection de l'aperçu (champs décochés gardés tels qu'avant), puis la fiche suivante de la file. */
async function applyReview() {
  const F = SH(),
    {
      before,
      after,
      diff
    } = S.pending,
    skip = new Set([...S.body.querySelectorAll('[data-path]')].filter(i => !i.checked).map(i => i.dataset.path)),
    skipCurve = new Set([...S.body.querySelectorAll('[data-curve]')].filter(i => !i.checked).map(i => i.dataset.curve)),
    out = before ? F.pickChanges(before, after, diff, {
      skip,
      skipCurve
    }) : after;
  // lignes RPM retirées mais décochées : remises
  for (const i of S.body.querySelectorAll('[data-gone]'))
    if (!i.checked) out.rpmFuelCurve = [...(out.rpmFuelCurve || []), structuredClone(S.pending.gone[+i.dataset.gone])];
  if (!before) out.id = uniqueId(out.id);
  const s = S;
  await storeSheet(out, S.pending.source);
  if (gone(s)) return;
  S.pending = null;
  if (S.queue?.length) return proposeIncoming(S.queue);
  return S.edit && S.sheets.some(x => x.id === S.edit.id) ? renderEditor(S.edit.id) : renderSheets();
}
/** Propose au pilote un fichier créé ici (export). */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {
    type
  }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------------------------------------------------------------- montage
/** Passe d'un écran du module à l'autre (Préparer, Fiches). */
function show(view) {
  S.view = view;
  for (const b of S.el.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
  S.ui.view = view;
  S.ctx.data.put(UI_PATH, S.ui);
  view === 'sheets' ? renderSheets() : renderPlan();
}

export async function mount(el, ctx) {
  S = {
    el,
    ctx,
    sheets: [],
    stops: [],
    view: 'plan'
  };
  // premier dessin sans attendre le réseau (audit de poids, mesure 4) : les bibliothèques et ce que l'appareil a déjà
  // (read sans wait : la copie gardée, ou null pour un fichier jamais lu) ; le registre d'aerodb, les fiches, et le
  // vol courant ou les réglages jamais lus arrivent ensuite (completeMount) — en attendant « chargement… », et rien
  // n'est écrit ni calculé
  const rd = path => Promise.resolve().then(() => ctx.data.read(path)).then(r => r?.value ?? null).catch(() => null),
    [, kept0, fuelSettings, ofp, wxKept, ui, aloftKept, lastAcKept] = await Promise.all([loadLibs(), rd(pilotPath(
      'current_flight.json')), rd(pilotPath('fuel.json')), rd(OFP_PATH), rd(WX_PATH), rd(UI_PATH), rd(ALOFT_PATH), rd(
      LAST_AC_PATH)]);
  S.refsPending = true; // registre d'aerodb et fiches pas encore là : ni devis, ni écriture du devis
  S.flightPending = kept0 == null; // vol courant jamais lu sur cet appareil : écran en attente, aucune écriture
  S.settingsPending = fuelSettings == null;
  const kept = kept0 || {};
  S.flight = {
    ...emptyFlight(),
    ...kept
  };
  S.settings = {
    taxiMin: 10,
    reserveMin: 30,
    contingencyPct: 5,
    displayUnit: 'kg',
    displaySpeed: 'kt',
    displayAlt: 'ft',
    displayDist: 'NM',
    entries: {},
    ...(fuelSettings || {})
  };
  S.lastAc = lastAcKept?.aircraft || null;
  if (!S.flightPending) flightDefaults(kept);
  S.ofp = ofp;
  // météo : dernières valeurs gardées sur l'appareil, relues ensuite si l'appareil est en ligne
  S.wx = wxKept?.at ? {
    ...wxKept,
    cached: true
  } : null;
  S.ui = ui || {};
  S.aloft = aloftKept?.profiles ? {
    ...aloftKept,
    cached: true
  } : null;
  // pas de la préparation : celui gardé, ou Route quand la Carte envoie « Modifier la route » (#fuel?focus=route)
  S.focusRoute = ctx.query?.focus === 'route';
  S.step = S.focusRoute ? 1 : Math.max(0, Math.min(4, +S.ui.step || 0));
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(ctx.t(['Carburant et niveau', 'Fuel and level', 'Kraftstoff und Flugfläche', 'Combustible y nivel']))}</h1>
    <div class="f-tabs" role="group"><button type="button" data-view="plan">${esc(tt(TX.plan))}</button><button type="button" data-view="sheets">${esc(tt(TX.sheets))}</button></div>
    <div data-body></div>`;
  S.body = el.querySelector('[data-body]');
  el.querySelector('.f-tabs').onclick = e => e.target.dataset.view && show(e.target.dataset.view);
  // fiches changées ailleurs (synchronisation, autre onglet) ; vol courant écrit par maps
  const self = S; // ce montage : une relecture qui revient après le démontage n'écrit rien
  S.stops.push(ctx.aerodb?.on?.('change', async e => {
    if (!e?.aircraft || gone(self) || !S.body) return;
    const A = await ctx.aerodb.aircraft().catch(() => S.A);
    if (gone(self)) return;
    S.A = A;
    await readSheets();
    if (gone(self)) return;
    if (S.view === 'sheets' && !S.edit && !S.pending) keepScroll(S.body, renderSheets);
    else if (S.view === 'plan') refresh();
  }));
  S.stops.push(ctx.data.watch(pilotPath('current_flight.json'), async () => {
    if (gone(self)) return;
    const f = await ctx.data.get(pilotPath('current_flight.json'));
    if (gone(self) || !f || f.updated_at === S.writing || f.updated_at === S.flight.updated_at) return;
    // écho d'une de nos écritures, arrivé après une plus récente : ignoré (il ramènerait un texte plus ancien)
    if (f.by === 'fuel' && S.writing && String(f.updated_at) < String(S.writing)) return;
    const typing = S.body?.querySelector('[data-k="rtext"]'),
      keepText = typing && document.activeElement === typing ? typing.value : null,
      // ce qui fait le devis : une écriture d'ailleurs qui n'y touche pas (la position réelle du cadre, une vue de la
      // carte) est relue sans être refaite ni réécrite
      plan = x => JSON.stringify([x?.route?.points, x?.route?.distanceNm, x?.level, x?.aircraft, x?.started?.at ?? null]),
      planChanged = plan(f) !== plan(S.flight);
    S.flight = {
      ...emptyFlight(),
      ...f
    };
    if (S.flightPending) S.flightSeen = true; // arrivé avant la fin du montage : completeMount le garde
    if (S.flightPending || S.refsPending) return; // montage pas fini : completeMount dessine et reprend ce vol
    if (keepText != null) S.flight.route = { // route en cours de frappe : la valeur du champ reste la vérité
      ...emptyFlight().route,
      ...S.flight.route,
      text: keepText
    };
    if (!planChanged && f.by !== 'fuel') return S.view === 'plan' ? refresh() : undefined; // progression seulement
    if (S.view === 'plan') S.body.contains(document.activeElement) ? refresh() : renderPlan();
    if (f.by && f.by !== 'fuel') adoptForeignFlight();
  }));
  // vue double : « Afficher la carte » masqué tant que la carte est à côté (ctx.layout du cadre, suivi par frame-layout)
  const onLayout = () => S?.body?.querySelector('[data-do="showmap"]')?.classList.toggle('fu-hide', S.ctx.layout?.with === 'maps');
  window.addEventListener('frame-layout', onLayout);
  S.stops.push(() => window.removeEventListener('frame-layout', onLayout));
  // dessins à la largeur de l'écran
  const ro = new ResizeObserver(() => {
    clearTimeout(S.roTimer);
    S.roTimer = setTimeout(refresh, 150);
  });
  ro.observe(el);
  S.stops.push(() => ro.disconnect());
  // vol démarré et pas terminé : la ligne d'état et la progression prévue suivent l'heure, chaque minute
  const tick = setInterval(() => {
    if (!S?.body || !S.flight.started?.at || S.view !== 'plan') return;
    refresh();
  }, 60000);
  S.stops.push(() => clearInterval(tick));
  show(S.focusRoute || S.ui.view !== 'sheets' ? 'plan' : 'sheets');
  if (!S.flightPending) flightReady();
  completeMount(self); // pas attendu : le cadre a son écran tout de suite
}
/** Vol courant connu : un vol sans appareil reprend le dernier choisi sur cet appareil (plus de première fiche par
 *  défaut), un vol sans écart ISA le dernier écart retenu (réglages du devis). */
function flightDefaults(kept) {
  const ka = S.flight.aircraft || {};
  if (S.lastAc && !(ka.sheetId || ka.type || ka.registration)) S.flight.aircraft = {
    ...S.lastAc
  };
  if (!Number.isFinite(+kept.isaDev)) S.flight.isaDev = +S.settings.isaDev || 0;
}
/** Vol courant connu et à l'écran : « Modifier la route » de la Carte (champ prêt à la frappe) ; la reprise attend le
 *  registre d'aerodb (elle chiffre le devis). */
function flightReady() {
  S.body.inert = false;
  if (S.focusRoute) {
    const ta = S.body.querySelector('[data-k="rtext"]');
    ta?.focus();
    ta?.setSelectionRange?.(ta.value.length, ta.value.length);
  }
  if (!S.refsPending) resumeFlight();
}
/** Vol modifié ailleurs pendant l'absence de fuel : repris (devis refait) ; sinon la route relue. */
function resumeFlight() {
  if (S.flight.by && S.flight.by !== 'fuel') adoptForeignFlight();
  else if (S.flight.route?.text || S.flight.route?.dep) S.flight.route.manual || resolveRoute();
}
/** Seconde moitié du montage, après le premier dessin : registre d'aerodb et fiches, puis le vol courant et les
 *  réglages s'ils n'avaient jamais été lus sur cet appareil (attente du réseau) ; l'écran se complète sans bouger. */
async function completeMount(self) {
  const ctx = self.ctx,
    // read avec wait : un fichier jamais lu attend le réseau (get rendrait null tout de suite sur un appareil neuf)
    get = path => Promise.resolve().then(() => ctx.data.read(path, {
      wait: true
    })).then(r => r?.value ?? null).catch(() => null),
    [A, kept1, fs1] = await Promise.all([ctx.aerodb?.aircraft ? ctx.aerodb.aircraft().catch(() => null) : null,
      self.flightPending ? get(pilotPath('current_flight.json')) : null, self.settingsPending ? get(pilotPath('fuel.json')) :
      null
    ]);
  if (gone(self)) return;
  S.A = A;
  // logique des fiches d'aerodb : types, fiches et flotte réglés par aerodb ; ici la fiche active, la langue, les textes
  SH()?.configure({
    profiles: () => Object.fromEntries(S.sheets.map(p => [p.id, p])),
    active: () => S.edit || S.C?.sheet || null,
    lang: () => ctx.lang(),
    t: row => ctx.t(row),
    tf: (row, vals) => ctx.t(row, vals)
  });
  await readSheets();
  if (gone(self)) return;
  if (S.settingsPending) {
    S.settings = {
      ...S.settings,
      ...(fs1 || {})
    };
    S.settingsPending = false;
  }
  const wasPending = S.flightPending;
  if (wasPending) { // le vol ne vient que maintenant (sauf s'il est déjà arrivé par le suivi du vol courant)
    if (!S.flightSeen) S.flight = {
      ...emptyFlight(),
      ...(kept1 || {})
    };
    flightDefaults(kept1 || {});
    S.flightPending = false;
  }
  S.refsPending = false;
  if (S.view === 'plan') renderPlan();
  else if (!S.edit && !S.pending) keepScroll(S.body, renderSheets);
  wasPending ? flightReady() : resumeFlight();
}

export function unmount() {
  if (!S) return;
  for (const f of S.stops) try {
    f?.();
  } catch {
    /* déjà arrêté */
  }
  clearTimeout(S.routeTimer);
  clearTimeout(S.roTimer);
  clearTimeout(S.wxTimer);
  S.body = null;
  S = null;
}
