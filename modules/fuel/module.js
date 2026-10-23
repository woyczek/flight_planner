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
import {
  svg
} from '../../frame/lib/icons.js';

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
  files: ['performance_model.js', 'model.js', 'levels.js', 'perf_prompt.js', 'weather.js',
    '../../frame/lib/external_links.js', '../../frame/lib/icons.js'
  ]
};

const OFP_PATH = 'cache/fuel/last_ofp.json',
  WX_PATH = 'cache/fuel/weather.json',
  UI_PATH = 'cache/fuel/ui.json',
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
  acNone: ['Aucun appareil : cherchez-le.', 'No aircraft: search for it.', 'Kein Luftfahrzeug: suchen.', 'Ninguna aeronave: búsquela.'],
  acNoRegistry: ['Base des aéronefs indisponible (aerodb).', 'Aircraft base unavailable (aerodb).',
    'Luftfahrzeugbasis nicht verfügbar (aerodb).',
    'Base de aeronaves no disponible (aerodb).'
  ],
  origins: {
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
  routeText: ['Route détaillée (item 15 ou « ID lat lon » par ligne)', 'Detailed route (item 15 or “ID lat lon” per line)',
    'Detaillierte Route (Feld 15 oder „ID lat lon“ je Zeile)', 'Ruta detallada (casilla 15 o «ID lat lon» por línea)'
  ],
  distance: ['Distance ({u})', 'Distance ({u})', 'Entfernung ({u})', 'Distancia ({u})'],
  track: ['Route vraie (°)', 'True track (°)', 'Rechtweisender Kurs (°)', 'Rumbo verdadero (°)'],
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
  wxMid: ['Terrain intermédiaire', 'Intermediate aerodrome', 'Zwischenflugplatz', 'Aeródromo intermedio'],
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
  wxCached: ['Hors réseau : dernières valeurs lues à {t}.', 'No network: last values read at {t}.',
    'Kein Netz: zuletzt gelesene Werte um {t}.',
    'Sin red: últimos valores leídos a las {t}.'
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
  wxMissing: ['Vent non calculé : il manque le vent d’un terrain.', 'Wind not computed: an aerodrome’s wind is missing.',
    'Wind nicht berechnet: der Wind eines Flugplatzes fehlt.', 'Viento no calculado: falta el viento de un aeródromo.'
  ],
  isaHint: ['ISA {d} d’après le METAR {id} ({t} °C à {e} ft).', 'ISA {d} from the {id} METAR ({t} °C at {e} ft).',
    'ISA {d} laut METAR {id} ({t} °C auf {e} ft).', 'ISA {d} según el METAR {id} ({t} °C a {e} ft).'
  ],
  isaUse: ['Utiliser ISA {d}', 'Use ISA {d}', 'ISA {d} verwenden', 'Usar ISA {d}'],
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

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Nombre lu dans un champ (virgule décimale admise) ; null si vide ou illisible. */
const num = v => {
  const x = Number(String(v ?? '').trim().replace(/\s/g, '').replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(x) ? x : null;
};
/** FL d'une altitude en pieds (FL090). */
const flTxt = h => 'FL' + String(Math.round(h / 100)).padStart(3, '0');
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
  for (const [glob, file] of LIBS)
    if (!window[glob]) await import(new URL(`${file}?v=0`, import.meta.url).href);
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
/** Points d'une route : entrées « ID lat lon[/N0450F370] » (forme OFP de la V2) gardées telles quelles, sinon item 15
 *  (vitesse-niveau, DCT, voies aériennes et procédures écartées) ; chaque identifiant cherché dans aerodb. Départ et
 *  arrivée ajoutés aux extrémités s'ils manquent. Sortie : { points, unresolved }. */
async function routePoints(text, dep, arr) {
  const points = [],
    unresolved = [],
    entries = String(text || '').split(/[,\n]+/).map(s => s.trim()).filter(Boolean),
    coord = /^([A-Z0-9]{2,7})\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i;
  const look = async id => {
    const c = S.ctx.aerodb ? await S.ctx.aerodb.coords(id).catch(() => null) : null;
    c ? points.push({
      id,
      lat: c.lat,
      lon: c.lon
    }) : unresolved.push(id);
  };
  if (entries.length && entries.every(e => coord.test(e)))
    for (const e of entries) {
      const m = coord.exec(e);
      points.push({
        id: m[1].toUpperCase(),
        lat: +m[2],
        lon: +m[3]
      });
    }
  else
    for (const tok of String(text || '').toUpperCase().split(/\s+/).map(s => s.split('/')[0]).filter(Boolean)) {
      if (/^[NKM]\d{3,4}([FASM]\d{3,4})?$/.test(tok) || tok === 'DCT' || /^[A-Z]{1,2}\d{1,4}[A-Z]?$/.test(tok) || /\d[A-Z]$/.test(tok))
        continue;
      if (/^[A-Z0-9]{2,5}$/.test(tok)) await look(tok);
    }
  if (dep && points[0]?.id !== dep) {
    const n = points.length;
    await look(dep);
    if (points.length > n) points.unshift(points.pop());
  }
  if (arr && points.at(-1)?.id !== arr) await look(arr);
  return {
    points,
    unresolved
  };
}

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
  S.sheets = S.A?.sheets ? await S.A.sheets.list().catch(() => []) : [];
}
/** Enregistre une fiche par aerodb (champs changés tamponnés avec leur source, fichier aircraft/sheets/<id>.json et
 *  miroir V2 écrits par aerodb), puis relit la liste. */
async function storeSheet(p, source = 'edit') {
  await S.A.sheets.put(plain(p), {
    source
  });
  await readSheets();
  S.ctx.notify(tt(TX.saved), 'ok');
}
/** Écrit le vol courant (après un temps calme) : relu, champs du module changés, reste gardé (partagé avec maps). */
function saveFlight() {
  clearTimeout(S.flightTimer);
  const s = S; // gardé : l'écriture part même si le module est démonté entre-temps
  s.flightTimer = setTimeout(async () => {
    const path = `pilot/${s.ctx.identity.trigram || 'ANON'}/current_flight.json`,
      cur = (await s.ctx.data.get(path)) || {};
    s.flight = {
      ...cur,
      ...s.flight,
      schema: 1,
      by: 'fuel',
      updated_at: new Date().toISOString()
    };
    s.writing = s.flight.updated_at;
    await s.ctx.data.put(path, s.flight);
  }, 800);
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
/** Fiche du vol (normalisée) : celle choisie, sinon un type seul (estimation aerodb) ; null sans rien. */
function currentSheet() {
  const a = S.flight.aircraft || {},
    raw = S.sheets.find(p => p.id === a.sheetId) || (a.sheetId ? null : S.sheets[0]) || null;
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
    q = distanceNm > 0 ? M.quote({
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
      climbLaw: perf ? L.tripLaw(perf, goal, o) : null
    }) : null,
    D = perf && q ? L.decisionSeries(perf, {
      distanceNm,
      wc: q.windKnown ? q.wc : 0
    }, goal, o) : null,
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
[data-module="fuel"] input.fu-code{text-transform:uppercase}
[data-module="fuel"] .fu-hide{display:none}
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
/** Dessine l'écran Préparer (champs une fois ; résultats redessinés par refresh). */
function renderPlan() {
  const f = S.flight,
    r = f.route || {},
    opt = (v, l, on) => `<option value="${esc(v)}"${on ? ' selected' : ''}>${esc(l)}</option>`,
    fld = (key, label, val, attrs = '', vals) => `<label class="f-field">${esc(tt(label, vals))}<input data-k="${key}" value="${esc(val ?? '')}" ${attrs}></label>`;
  S.body.innerHTML = `
  <div class="f-cols">
    <div class="f-card" data-block="aircraft"><h2>${esc(tt(TX.aircraft))}</h2>
      <div class="f-row" data-acsel></div>
      <div class="fu-hide" data-acpanel>
        <label class="f-field"><input type="search" data-k="acsearch" placeholder="${esc(tt(TX.acSearch))}" aria-label="${esc(tt(TX.acSearch))}" autocomplete="off"></label>
        <div class="f-list" data-acres></div>
      </div>
      <p class="f-muted" data-src></p>
    </div>
    <div class="f-card" data-block="route"><h2>${esc(tt(TX.route))}</h2>
      <div class="f-grid fu-g3">${fld('dep', TX.dep, r.dep, 'class="fu-code" maxlength="4" autocapitalize="characters"')}${fld('arr', TX.arr, r.arr, 'class="fu-code" maxlength="4" autocapitalize="characters"')}${fld('altn', TX.altn, r.altn, 'class="fu-code" maxlength="4" autocapitalize="characters"')}</div>
      <div class="f-grid fu-g3">${fld('dist', TX.distance, distField(r.distanceNm), 'inputmode="decimal"', { u: distLabel() })}${fld('trk', TX.track, r.trackDeg != null ? Math.round(r.trackDeg) : '', 'inputmode="numeric"')}</div>
      <details><summary class="f-muted">${esc(tt(TX.routeText))}</summary><label class="f-field"><textarea data-k="rtext" rows="3" aria-label="${esc(tt(TX.routeText))}">${esc(r.text || '')}</textarea></label></details>
      <p class="f-warn" data-unres></p>
      <div class="f-row">${S.ctx.identity.simbrief ? `<button type="button" data-do="simbrief">${esc(tt(TX.simbrief))}</button>` : `<span class="f-muted">${esc(tt(TX.noSimbrief))}</span>`}</div>
    </div>
    <div class="f-card" data-block="level"><h2>${esc(tt(TX.levelWind))}</h2>
      <div class="f-grid fu-g3">${fld('fl', TX.level, f.level?.ft ? Math.round(f.level.ft / 100) : '', 'inputmode="numeric"')}
        <label class="f-field">${esc(tt(TX.goal))}<select data-k="goal">${window.FuelLevels.GOALS.map(g => opt(g, tt(TX.goals[g]), (S.settings.goal || 'prof') === g)).join('')}</select></label></div>
      <div class="f-grid fu-g3">${fld('wdir', TX.windDir, f.wind?.dirDeg ?? '', 'inputmode="numeric"')}${fld('wkt', TX.windKt, speedField(f.wind?.speedKt), 'inputmode="numeric"', { u: speedLabel() })}${fld('isa', TX.isa, f.isaDev || '', 'inputmode="numeric"')}</div>
      <p class="f-muted" data-windsrc></p>
      <div class="f-row" data-isahint></div>
      <div class="f-grid fu-g3">${fld('wxdate', TX.wxDate, f.weather?.when || '', 'type="datetime-local"')}${fld('wxmid', TX.wxMid, f.weather?.mid || '', 'class="fu-code" maxlength="4" autocapitalize="characters"')}</div>
      <label class="f-check"><input type="checkbox" data-k="wxreal"${f.weather?.real ? ' checked' : ''}>${esc(tt(TX.wxReal))}</label>
      <div class="f-row"><button type="button" data-do="wx">${esc(tt(TX.wxRead))}</button></div>
      <div class="f-grid fu-g3 ${(S.settings.goal || 'prof') === 'man' ? '' : 'fu-hide'}" data-manbox>${fld('mias', TX.manIas, speedField(S.manualIn?.ias), 'inputmode="numeric"', { u: speedLabel() })}${fld('mvs', TX.manVs, vsField(S.manualIn?.vs), 'inputmode="numeric"', { u: vsLabel() })}</div>
    </div>
  </div>
  <details class="f-card" data-fold="wx" open><summary>${esc(tt(TX.wxTitle))}</summary><div data-wx></div></details>
  <details class="f-card" data-fold="da"><summary>${esc(tt(TX.da))}</summary><div data-da></div></details>
  <div class="f-card" data-block="decision"><h2>${esc(tt(TX.decision))}</h2><div data-dec></div></div>
  <div class="f-bar fu-result" data-block="result" aria-live="polite"></div>
  <details class="f-card" data-fold="openin"><summary>${esc(tt(TX.openIn))}</summary><p class="f-muted">${esc(tt(TX.openInHint))}</p><div class="f-list fu-links" data-openin></div></details>
  <details class="f-card" data-fold="details"><summary>${esc(tt(TX.details))}</summary><div data-details></div></details>
  <details class="f-card" data-fold="climb"><summary>${esc(tt(TX.climbGuide))}</summary><div data-climb></div></details>
  <details class="f-card" data-fold="settings"><summary>${esc(tt(TX.settings))}</summary>
    <div class="f-grid fu-g3">${fld('taxiMin', TX.taxiMin, S.settings.taxiMin, 'inputmode="numeric"')}${fld('reserveMin', TX.reserveMin, S.settings.reserveMin, 'inputmode="numeric"')}${fld('contPct', TX.contPct, S.settings.contingencyPct, 'inputmode="decimal"')}
    </div>
    <p class="f-muted" style="margin:8px 0 4px">${esc(tt(TX.units))}</p>
    <div class="f-grid fu-g3" data-units>
      <label class="f-field">${esc(tt(TX.unitFuel))}<select data-k="unit">${['kg', 'lb'].map(u => opt(u, u, (S.settings.displayUnit || 'kg') === u)).join('')}</select></label>
      ${[['speed', TX.unitSpeed, 'unitSpeed'], ['alt', TX.unitAlt, 'unitAlt'], ['dist', TX.unitDist, 'unitDist']].map(([kind, row, k]) => `<label class="f-field">${esc(tt(row))}<select data-k="${k}">${UNITS[kind].list.map(u => opt(u, UNITS[kind].label[u], unitOf(kind) === u)).join('')}</select></label>`).join('')}</div>
    <div data-entrybox></div>
  </details>`;
  for (const d of S.body.querySelectorAll('details[data-fold]')) {
    d.open = S.ui.open?.[d.dataset.fold] ?? d.dataset.fold === 'wx'; // météo ouverte tant qu'on ne l'a pas repliée
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
  S.body.onclick = e => onPlanClick(e);
  refresh();
  renderWx();
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
    case 'altn':
      r[k] = v.trim().toUpperCase();
      if (k !== 'altn') {
        resolveRoute();
        scheduleWx();
      }
      break;
    case 'rtext':
      r.text = v;
      resolveRoute();
      break;
    case 'dist':
      r.distanceNm = distParse(v);
      r.manual = true;
      break;
    case 'trk':
      r.trackDeg = num(v);
      r.manual = true;
      break;
    case 'fl':
      f.level = {
        ft: num(v) ? num(v) * 100 : null
      };
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
    case 'wxmid':
      f.weather = {
        ...f.weather,
        mid: v.trim().toUpperCase()
      };
      scheduleWx();
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
  if (e.target.closest('[data-do="isause"]')) return useIsa();
  const pk = e.target.closest('[data-pick]');
  if (pk) return pickAircraft(pk.dataset.pick);
  if (e.target.closest('[data-do="acopen"]')) return acOpen();
  if (e.target.closest('[data-do="wx"]')) return wxFetch(true);
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
  const f = S.flight,
    r = f.route || {};
  return [...new Set([r.dep, f.weather?.mid, r.arr].map(x => String(x || '').toUpperCase()).filter(x => /^[A-Z]{4}$/.test(x)))];
};
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
  const ids = wxIds();
  if (!ids.length) {
    if (loud) S.ctx.notify(tt(TX.wxNone), 'warn');
    return renderWx();
  }
  const q = encodeURIComponent(ids.join(',')),
    get = async kind => {
      const res = await S.ctx.net.fetch(`https://aviationweather.gov/api/data/${kind}?ids=${q}&format=json`, {
        headers: {
          accept: 'application/json'
        }
      });
      if (res.headers.get('x-sog-offline') || res.headers.get('x-sog-unreachable')) throw Object.assign(new Error('net'), {
        code: S.ctx.net.online?.() === false ? 'offline' : 'relay'
      });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), {
        code: 'http'
      });
      return res.status === 204 ? [] : res.json();
    };
  const kept = (await S.ctx.data.get(WX_PATH).catch(() => null)) || {
    metar: {},
    taf: {}
  };
  try {
    const [m, t] = await Promise.all([get('metar'), get('taf')]),
      at = new Date().toISOString();
    for (const x of m || []) kept.metar[x.icaoId] = x;
    for (const x of t || []) kept.taf[x.icaoId] = x;
    kept.at = at;
    await S.ctx.data.put(WX_PATH, kept, {
      policy: 'cache'
    });
    S.wx = {
      ...kept,
      cached: false
    };
  } catch (e) {
    S.wx = kept.at ? {
      ...kept,
      cached: true
    } : null;
    if (loud) S.ctx.notify(e.code === 'offline' ? tt(TX.offline) : e.code === 'relay' ? tt(TX.wxRelay) : tt(TX.sbError, {
      e: e.message
    }), 'warn');
  }
  S.wxAd = S.wxAd || {};
  for (const id of ids)
    if (!(id in S.wxAd)) S.wxAd[id] = ((await S.ctx.aerodb?.aerodromes?.({
      icao: id
    }).catch(() => null)) || [])[0] || null;
  if (!S.body) return;
  renderWx();
  isaHint();
  if (S.flight.weather?.real) applyRealWind();
  else if (S.C) renderDa(S.C);
}
/** Heure visée (secondes) : la date du vol saisie (heure de l'appareil), sinon aucune (METAR). */
const wxWhen = () => {
  const w = S.flight.weather?.when;
  const t = w ? Date.parse(w) : NaN;
  return Number.isFinite(t) ? Math.round(t / 1000) : null;
};
/** Résumés des terrains (METAR, ou TAF si la date du vol tombe dans sa validité). */
const wxStations = () => wxIds().map(id => ({
  id,
  ad: S.wxAd?.[id] || null,
  st: WX.station(S.wx?.metar?.[id], S.wx?.taf?.[id], wxWhen())
}));
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
  box.innerHTML = (S.wx.cached ? `<p class="f-muted">${esc(tt(TX.wxCached, { t: new Date(S.wx.at).toLocaleString(S.ctx.lang()) }))}</p>` : '') + wxStations().map(({
    id,
    ad,
    st
  }) => {
    if (!st) return `<div class="f-item"><span><b>${esc(id)}</b> <span class="f-muted">${esc(tt(TX.wxNoData))}</span></span></div>`;
    const rw = ad ? WX.runwayWind(ad.bearing, ad.magVar, st.wdir, st.wspd) : null;
    return `<div class="fu-wx"><div class="f-row"><b>${esc(id)}</b><span class="f-muted">${esc(ad?.name || '')} · ${esc(st.source)} ${esc(hhmm(st.at))}</span>${st.cat ? `<span class="f-badge" data-kind="${kinds[st.cat] || 'accent'}">${esc(st.cat)}</span>` : ''}</div>
      <dl class="f-dl"><dt>${esc(tt(TX.wxWind))}</dt><dd>${esc(wind(st.wdir, st.wspd, st.wgst))}</dd>
      ${rw ? `<dt>${esc(tt(TX.wxRwy, { r: rw.ident }))}</dt><dd>${esc(tt(TX.wxComp, { h: Math.abs(rw.head), hw: tt(rw.head >= 0 ? TX.wxHead : TX.wxTail), c: rw.cross, s: tt(rw.side === 'L' ? TX.wxLeft : TX.wxRight) }))} <span class="f-muted">(${esc(tt(TX.wxRwyHint))})</span></dd>` : ''}
      <dt>${esc(tt(TX.wxCeil))}</dt><dd>${st.ceil != null ? `${st.ceil.toLocaleString(S.ctx.lang())} ft` : esc(tt(TX.wxNoCeil))}${st.wx ? ` · ${esc(st.wx)}` : ''}</dd>
      <dt>${esc(tt(TX.wxVis))}</dt><dd>${esc(vis(st.vis))}</dd>
      ${st.temp != null || st.qnh != null ? `<dt>${esc(tt(TX.wxTemp))}</dt><dd>${st.temp != null ? `${st.temp} °C` : '—'} · ${st.qnh != null ? `${Math.round(st.qnh)} hPa` : '—'}</dd>` : ''}
      ${st.tempo.map(g => `<dt>${esc(g.change)}</dt><dd>${esc(wind(g.wdir, g.wspd, g.wgst))} · ${esc(vis(g.vis))}${g.ceil != null ? ` · ${g.ceil} ft` : ''}${g.wx ? ` · ${esc(g.wx)}` : ''}${g.cat ? ` <span class="f-badge" data-kind="${kinds[g.cat] || 'accent'}">${esc(g.cat)}</span>` : ''}</dd>`).join('')}</dl>
      ${st.convective ? `<p class="f-warn">${esc(tt(TX.wxCb))}</p>` : ''}
      <details><summary>${esc(tt(TX.wxRaw))}</summary><pre>${esc(st.raw)}</pre></details></div>`;
  }).join('');
}
/** « Météo réelle » : vent moyen des terrains le long de la route (frame : moyenne des vecteurs pondérée par les
 *  segments départ → intermédiaire → arrivée), écrit dans le vol courant avec sa source. */
function applyRealWind() {
  const list = wxStations().filter(x => x.st),
    pos = list.map(x => x.ad && Number.isFinite(+x.ad.lat) ? {
      lat: +x.ad.lat,
      lon: +x.ad.lon
    } : null),
    legs = list.slice(1).map((x, i) => pos[i] && pos[i + 1] ? gcNm(pos[i], pos[i + 1]) : 1),
    w = list.length === wxIds().length ? WX.routeWind(list.map(x => x.st), legs) : null,
    f = S.flight;
  if (!w) {
    f.windSource = null;
    windSourceLine(tt(TX.wxMissing));
    return;
  }
  f.wind = w;
  f.windSource = {
    kind: 'weather',
    ids: list.map(x => `${x.id} (${x.st.source})`)
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
  }) : '');
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
  const seq = S.acSeq = (S.acSeq || 0) + 1,
    hits = await S.A.search(text, 30).catch(() => []);
  if (seq !== S.acSeq || !S.body) return;
  S.acHits = new Map(hits.map(h => [h.key, h]));
  box.innerHTML = hits.map(h => `<button type="button" class="f-item" data-pick="${esc(h.key)}"><span>${esc(h.label)}${h.kind === 'aircraft' && h.sheetVia ? `<small class="f-muted fu-block">${esc(tt(TX.via[h.sheetVia] || TX.via.estimate))}</small>` : ''}</span><span class="f-badge">${esc(tt(TX.origins[h.source] || TX.origins.free))}</span></button>`).join('');
}
/** Appareil retenu : le vol courant prend aircraftOf (fiche, type, immatriculation, indicatif, nom, origine). */
function pickAircraft(key) {
  const hit = S.acHits?.get(key);
  if (!hit) return;
  S.flight.aircraft = S.A.aircraftOf(hit);
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
  const pr = isaProposal();
  box.innerHTML = pr ? `<span class="f-muted">${esc(tt(TX.isaHint, { d: signed(pr.dT), id: pr.id, t: pr.t, e: pr.elev.toLocaleString(S.ctx.lang()) }))}</span>${pr.dT !== (+S.flight.isaDev || 0) ? `<button type="button" data-do="isause">${esc(tt(TX.isaUse, { d: signed(pr.dT) }))}</button>` : ''}` : '';
}
/** Prend l'écart ISA proposé : vol courant et réglages du devis (dernier écart retenu). */
function useIsa() {
  const pr = isaProposal();
  if (!pr) return;
  S.flight.isaDev = pr.dT;
  S.settings.isaDev = pr.dT;
  const i = S.body.querySelector('[data-k="isa"]');
  if (i) i.value = pr.dT || '';
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
  <p>${ceil ? `<span class="f-dot" style="background:var(--sog-chart-4)"></span> ${esc(tt(TX.daCeil, { c: fmt(ceil), d: signed(dT), p: fmt(effective) }))}` : esc(tt(TX.daNoCeil))}</p>`;
}

/** Niveau du plan fixé (ft) : champ, vol courant, résultats. */
function setLevel(ft) {
  if (!(ft > 0)) return;
  S.flight.level = {
    ft
  };
  const i = S.body.querySelector('[data-k="fl"]');
  if (i) i.value = Math.round(ft / 100);
  saveFlight();
  refresh();
}
/** Relit les points de la route (texte, départ, arrivée) dans aerodb ; distance et route vraie déduites, sauf saisie à la
 *  main. Dernière demande seule retenue. */
function resolveRoute() {
  const seq = S.routeSeq = (S.routeSeq || 0) + 1;
  clearTimeout(S.routeTimer);
  S.routeTimer = setTimeout(async () => {
    const r = S.flight.route,
      {
        points,
        unresolved
      } = await routePoints(r.text, r.dep, r.arr);
    if (seq !== S.routeSeq || !S.body) return;
    r.points = points;
    if (points.length >= 2) {
      r.distanceNm = Math.round(points.slice(1).reduce((s, p, i) => s + gcNm(points[i], p), 0));
      r.trackDeg = Math.round(bearing(points[0], points.at(-1)));
      r.manual = false;
      S.body.querySelector('[data-k="dist"]').value = distField(r.distanceNm);
      S.body.querySelector('[data-k="trk"]').value = r.trackDeg;
    }
    S.body.querySelector('[data-unres]').textContent = unresolved.length ? tt(TX.unresolved, {
      l: unresolved.join(', ')
    }) : '';
    saveFlight();
    refresh();
  }, 500);
}
/** Dernier OFP SimBrief (identifiant de l'identité) par ctx.net : gardé sur l'appareil (cache), route, niveau, vent et
 *  appareil repris dans le vol courant. */
async function loadSimbrief() {
  const id = String(S.ctx.identity.simbrief || '').trim();
  if (!id) return S.ctx.notify(tt(TX.noSimbrief), 'warn');
  const url = `https://www.simbrief.com/api/xml.fetcher.php?${/^\d+$/.test(id) ? 'userid' : 'username'}=${encodeURIComponent(id)}&json=v2`;
  let res;
  try {
    res = await S.ctx.net.fetch(url);
  } catch (e) {
    return S.ctx.notify(tt(TX.sbError, {
      e: e.message || e
    }), 'err');
  }
  if (res.headers.get('x-sog-offline')) return S.ctx.notify(tt(TX.offline), 'warn');
  const ofp = res.ok ? await res.json().catch(() => null) : null;
  if (!ofp || !SH().isSimbriefOfp(ofp)) return S.ctx.notify(tt(TX.sbError, {
    e: ofp?.fetch?.status || res.status
  }), 'err');
  await S.ctx.data.put(OFP_PATH, ofp, {
    policy: 'cache'
  });
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
    manual: false
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
    rate = p => p?.min > 0 ? r(q.levelFt / p.min, 10) : null,
    speed = p => p?.min > 0 && Number.isFinite(p.nm) ? r(p.nm / (p.min / 60)) : null;
  return {
    climbFpm: rate(q.climb),
    climbKt: speed(q.climb),
    descentFpm: rate(q.descent),
    descentKt: speed(q.descent),
    tocNm: r(q.climb?.nm, .1),
    todNm: r(q.descent?.nm, .1)
  };
}
/** Écrit le profil du devis dans le vol courant quand il change (maps le lit pour le profil vertical). */
function shareProfile(q) {
  const p = verticalProfile(q);
  if (JSON.stringify(p) === JSON.stringify(S.flight.profile ?? null)) return;
  S.flight.profile = p;
  saveFlight();
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
    res.innerHTML = `<div class="f-muted">${esc(tt(TX.block))} · ${flTxt(q.levelFt)}${unitOf('alt') !== 'ft' ? ` (${esc(altTxt(q.levelFt))})` : ''}${q.approx ? ` · ${esc(tt(TX.approx))}` : ''}${range ? ` · ${esc(tt(TX.windRange))}` : ''}</div>
      <div class="fu-big">${range ? `${esc(fuelTxt(q.blockLow, unit))} – ${esc(fuelTxt(q.blockHigh, unit))}` : esc(fuelTxt(q.block, unit))}</div>
      <div class="f-tiles"><span class="f-muted">${esc(tt(TX.trip))}<b>${esc(fuelTxt(q.trip, unit))}</b></span><span class="f-muted">${esc(tt(TX.time))}<b>${hmm(q.minutes)}</b></span><span class="f-muted">${esc(tt(TX.tod))}<b>${esc(tt(TX.todVal, { d: distTxt(q.todNm) }))}</b></span></div>
      ${q.overMtow ? `<div class="f-warn">${esc(tt(TX.overMtow))}</div>` : ''}`;
  }
  // détail du devis (replié)
  const det = $('[data-details]');
  if ($('[data-fold="details"]').open) det.innerHTML = q?.hasFuel ? `<table class="f-table"><tbody>
      ${[[TX.taxi, q.taxi], [TX.climb, q.climb], [TX.cruise, q.cruise], [TX.descent, q.descent]].map(([l, p]) => `<tr><td>${esc(tt(l))}</td><td class="f-num">${p?.min != null ? hmm(p.min) : ''}</td><td class="f-num">${p?.nm != null ? esc(distTxt(p.nm)) : ''}</td><td class="f-num">${esc(fuelTxt(p?.fuel ?? p, unit))}</td></tr>`).join('')}
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
    <div class="f-list">${S.sheets.map(raw => {
      const p = F.normalize(structuredClone(raw)),
        miss = F.sheetMissingPaths(p).length,
        when = F.profileWhen(p);
      return `<div class="f-item" data-id="${esc(p.id)}"><div><b>${esc(p.name || p.id)}</b> <span class="f-muted">${esc(p.icao || '')} · ${esc(p.unit)}</span>
        <div class="f-muted">${esc(F.profileSourceText(p))} · ${esc(miss ? tt(TX.missing, { n: miss }) : tt(TX.complete))}${when ? ` · ${esc(tt(TX.updated, { d: new Date(when).toLocaleDateString(lang) }))}` : ''}</div></div>
        <div class="f-row"><button type="button" data-do="use">${esc(tt(TX.useSheet))}</button><button type="button" data-do="edit">${esc(tt(TX.edit))}</button></div></div>`;
    }).join('') || `<p class="f-card f-muted">${esc(tt(TX.noSheet))}</p>`}</div>`;
  S.body.onclick = e => onSheetsClick(e);
  S.body.oninput = null;
  S.body.onchange = e => e.target.matches('[data-file]') && importFiles([...e.target.files]);
}
/** Gestes de l'écran Fiches (liste, éditeur, aperçu des changements). */
async function onSheetsClick(e) {
  const b = e.target.closest('[data-do]');
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
    case 'new': {
      const code = (await S.ctx.askText(tt(TX.typeCode), {
        value: ''
      }) || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!code) return;
      const sb = F.simbriefRecordFor(code),
        np = sb ? F.profileFromSimbriefType(code, sb) : F.normalize({
          id: code,
          icao: code,
          name: code
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
      try {
        await navigator.clipboard.writeText(txt);
        S.ctx.notify(tt(TX.copied), 'ok');
      } catch {
        box.select();
      }
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
      await S.A.sheets.remove(p.id);
      await readSheets();
      return renderSheets();
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
  const all = [];
  for (const file of files) {
    const txt = await file.text();
    all.push(...readText(txt, file.name));
  }
  if (all.length) proposeIncoming(all);
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
  await storeSheet(out, S.pending.source);
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
  await loadLibs();
  S = {
    el,
    ctx,
    sheets: [],
    stops: [],
    view: 'plan'
  };
  S.A = ctx.aerodb?.aircraft ? await ctx.aerodb.aircraft().catch(() => null) : null;
  // logique des fiches d'aerodb : types, fiches et flotte réglés par aerodb ; ici la fiche active, la langue, les textes
  SH()?.configure({
    profiles: () => Object.fromEntries(S.sheets.map(p => [p.id, p])),
    active: () => S.edit || S.C?.sheet || null,
    lang: () => ctx.lang(),
    t: row => ctx.t(row),
    tf: (row, vals) => ctx.t(row, vals)
  });
  await readSheets();
  const kept = (await ctx.data.get(pilotPath('current_flight.json'))) || {};
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
    ...((await ctx.data.get(pilotPath('fuel.json'))) || {})
  };
  // un vol sans écart ISA part du dernier écart retenu (réglages du devis)
  if (!Number.isFinite(+kept.isaDev)) S.flight.isaDev = +S.settings.isaDev || 0;
  S.ofp = await ctx.data.get(OFP_PATH);
  // météo : dernières valeurs gardées sur l'appareil, relues ensuite si l'appareil est en ligne
  const wxKept = await ctx.data.get(WX_PATH).catch(() => null);
  S.wx = wxKept?.at ? {
    ...wxKept,
    cached: true
  } : null;
  S.ui = (await ctx.data.get(UI_PATH)) || {};
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(ctx.t(['Carburant et niveau', 'Fuel and level', 'Kraftstoff und Flugfläche', 'Combustible y nivel']))}</h1>
    <div class="f-tabs" role="group"><button type="button" data-view="plan">${esc(tt(TX.plan))}</button><button type="button" data-view="sheets">${esc(tt(TX.sheets))}</button></div>
    <div data-body></div>`;
  S.body = el.querySelector('[data-body]');
  el.querySelector('.f-tabs').onclick = e => e.target.dataset.view && show(e.target.dataset.view);
  // fiches changées ailleurs (synchronisation, autre onglet) ; vol courant écrit par maps
  S.stops.push(ctx.aerodb?.on?.('change', async e => {
    if (!e?.aircraft || !S?.body) return;
    S.A = await ctx.aerodb.aircraft().catch(() => S.A);
    await readSheets();
    if (S.view === 'sheets' && !S.edit && !S.pending) renderSheets();
    else if (S.view === 'plan') refresh();
  }));
  S.stops.push(ctx.data.watch(pilotPath('current_flight.json'), async () => {
    const f = await ctx.data.get(pilotPath('current_flight.json'));
    if (!f || f.updated_at === S.writing || f.updated_at === S.flight.updated_at) return;
    S.flight = {
      ...emptyFlight(),
      ...f
    };
    if (S.view === 'plan' && !S.body.contains(document.activeElement)) renderPlan();
  }));
  // dessins à la largeur de l'écran
  const ro = new ResizeObserver(() => {
    clearTimeout(S.roTimer);
    S.roTimer = setTimeout(refresh, 150);
  });
  ro.observe(el);
  S.stops.push(() => ro.disconnect());
  show(S.ui.view === 'sheets' ? 'sheets' : 'plan');
  if (S.flight.route?.text || S.flight.route?.dep) S.flight.route.manual || resolveRoute();
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
  S.body = null;
  S = null;
}
