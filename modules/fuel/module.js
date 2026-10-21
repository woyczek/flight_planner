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
export const meta = {
  id: 'fuel',
  apps: ['pilot'],
  level: 1,
  reads: ['planner/', 'pilot/', 'cache/fuel/'],
  writes: [{
    prefix: 'planner/flight_performance_database_merged.fpdb.json',
    merge: 'keyed:profiles:id'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/fuel/',
    policy: 'cache'
  }]
};

const DB_PATH = 'planner/flight_performance_database_merged.fpdb.json',
  OFP_PATH = 'cache/fuel/last_ofp.json',
  UI_PATH = 'cache/fuel/ui.json',
  LIBS = [
    ['FlightPerfModel', 'performance_model.js'],
    ['FuelModel', 'model.js'],
    ['FuelLevels', 'levels.js'],
    ['PERF_PROMPT', 'perf_prompt.js'],
    ['FuelSheets', 'sheets.js']
  ];

// ---------------------------------------------------------------- textes [fr, en, de, es]
const TX = {
  plan: ['Préparer', 'Plan', 'Planen', 'Preparar'],
  sheets: ['Fiches', 'Sheets', 'Datenblätter', 'Fichas'],
  aircraft: ['Appareil', 'Aircraft', 'Luftfahrzeug', 'Aeronave'],
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
  distance: ['Distance (NM)', 'Distance (NM)', 'Entfernung (NM)', 'Distancia (NM)'],
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
  windKt: ['Force (kt)', 'Speed (kt)', 'Stärke (kt)', 'Fuerza (kt)'],
  isa: ['ISA ± (°C)', 'ISA ± (°C)', 'ISA ± (°C)', 'ISA ± (°C)'],
  manIas: ['Badin (kt)', 'IAS (kt)', 'IAS (kt)', 'IAS (kt)'],
  manVs: ['Vario (ft/min, vide : plein gaz)', 'Rate (ft/min, empty: full throttle)', 'Steigrate (ft/min, leer: Vollgas)',
    'Régimen (ft/min, vacío: gases a fondo)'
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
  todVal: ['{nm} NM avant', '{nm} NM before', '{nm} NM vorher', '{nm} NM antes'],
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
  notReached: ['La montée n’atteint pas le niveau (vario sous 20 ft/min).', 'The climb does not reach the level (rate under 20 ft/min).',
    'Der Steigflug erreicht die Flugfläche nicht (unter 20 ft/min).', 'El ascenso no alcanza el nivel (menos de 20 ft/min).'
  ],
  lawFailed: ['La loi de montée choisie n’atteint pas le niveau : montée de la fiche.',
    'The chosen climb law does not reach the level: the sheet’s climb.',
    'Das gewählte Steiggesetz erreicht die Flugfläche nicht: Steigflug des Datenblatts.',
    'La ley de ascenso elegida no alcanza el nivel: ascenso de la ficha.'
  ],
  alt: ['Alt.', 'Alt.', 'Höhe', 'Alt.'],
  thr: ['Gaz', 'Thr.', 'Gas', 'Gases'],
  settings: ['Réglages du devis', 'Quote settings', 'Einstellungen', 'Ajustes del cálculo'],
  taxiMin: ['Roulage (min)', 'Taxi (min)', 'Rollen (min)', 'Rodaje (min)'],
  reserveMin: ['Réserve (min)', 'Reserve (min)', 'Reserve (min)', 'Reserva (min)'],
  contPct: ['Contingence (%)', 'Contingency (%)', 'Zuschlag (%)', 'Contingencia (%)'],
  unit: ['Unité affichée', 'Displayed unit', 'Angezeigte Einheit', 'Unidad mostrada'],
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

/** Charge le calcul pur (scripts du dossier du module, une fois par page). */
async function loadLibs() {
  for (const [glob, file] of LIBS)
    if (!window[glob]) await import(new URL(`${file}?v=0`, import.meta.url).href);
}

/** Texte d'une ligne de TX dans la langue de l'appli. */
const tt = (row, v) => S.ctx.t(row, v);
/** Libellé traduit d'un champ de fiche (chemin) ; groupe compris si group. */
function fieldLabel(path, group = false) {
  const f = window.FuelSheets.PROFILE_FIELDS.find(x => x[2] === path);
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
/** Lit les fiches de la base partagée (brutes, telles que dans le fichier). */
async function readSheets() {
  const doc = await S.ctx.data.get(DB_PATH);
  S.sheets = Array.isArray(doc?.profiles) ? doc.profiles : [];
}
/** Écrit la base des fiches (fiches sans clés de travail ; les autres champs du fichier gardés). */
async function writeSheets() {
  const doc = (await S.ctx.data.get(DB_PATH)) || {};
  await S.ctx.data.put(DB_PATH, {
    ...doc,
    schema: 'flight-performance-db/v1',
    profiles: S.sheets.map(plain)
  });
}
/** Remplace (ou ajoute) une fiche, datée maintenant, puis écrit la base. */
async function storeSheet(p) {
  const rec = plain({
      ...p,
      updatedAt: new Date().toISOString()
    }),
    i = S.sheets.findIndex(x => x.id === rec.id);
  i >= 0 ? S.sheets.splice(i, 1, rec) : S.sheets.push(rec);
  await writeSheets();
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
    ${G.rows.map((r, i) => `<circle cx="${x(r.t)}" cy="${y(r.h)}" r="3.5" class="fu-best"/>${label[i] ? `<text x="${x(r.t) + 7}" y="${y(r.h) + 4}" class="fu-time">${Math.round(r.ias)} kt</text>` : ''}`).join('')}
  </svg>`;
}

// ---------------------------------------------------------------- styles du module (jetons du cadre)
const STYLE = `
[data-module="fuel"]{--fu-gap:var(--sog-gap)}
[data-module="fuel"] h1{font-size:1.25rem;margin:0 0 10px}
[data-module="fuel"] h2{font-size:1rem;margin:0 0 6px}
[data-module="fuel"] .fu-tabs{margin-bottom:var(--sog-gap)}
[data-module="fuel"] .fu-tabs button[aria-pressed="true"]{background:var(--sog-accent);color:var(--sog-accent-ink);border-color:var(--sog-accent)}
[data-module="fuel"] .fu-grid3{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(96px,1fr))}
[data-module="fuel"] .fu-grid3 .f-field{margin:0}
[data-module="fuel"] .f-field input,[data-module="fuel"] .f-field select,[data-module="fuel"] .f-field textarea{width:100%;min-width:0}
[data-module="fuel"] .f-field{font-size:.9em}
[data-module="fuel"] input.fu-code{text-transform:uppercase}
[data-module="fuel"] .fu-svg{display:block;max-width:100%;height:auto;touch-action:manipulation}
[data-module="fuel"] .fu-svg text{font-size:11px;fill:var(--sog-muted)}
[data-module="fuel"] .fu-grid{stroke:var(--sog-border);stroke-width:1}
[data-module="fuel"] .fu-gap{fill:var(--sog-warn);opacity:.12}
[data-module="fuel"] .fu-ceil{stroke:var(--sog-warn);stroke-dasharray:2 3}
[data-module="fuel"] .fu-plan{stroke:var(--sog-accent);stroke-width:2;stroke-dasharray:6 4}
[data-module="fuel"] .fu-line-f{fill:none;stroke:var(--sog-fg);stroke-width:2.2}
[data-module="fuel"] .fu-line-t{fill:none;stroke:var(--sog-muted);stroke-width:1.6;stroke-dasharray:5 4}
[data-module="fuel"] .fu-ext{stroke-dasharray:1 4;opacity:.7}
[data-module="fuel"] .fu-best{fill:var(--sog-ok)}
[data-module="fuel"] .fu-fast{fill:var(--sog-warn)}
[data-module="fuel"] .fu-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.9em;margin-top:6px}
[data-module="fuel"] .fu-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}
[data-module="fuel"] .fu-result{position:sticky;bottom:0;z-index:2;border-color:var(--sog-accent);box-shadow:0 -4px 14px #0002}
[data-module="fuel"] .fu-result .fu-big{font-size:1.5rem;font-weight:700;line-height:1.2}
[data-module="fuel"] .fu-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 12px;margin-top:4px}
[data-module="fuel"] .fu-kv b{display:block;font-size:1.05em}
[data-module="fuel"] details.f-card>summary{min-height:var(--sog-touch);display:flex;align-items:center;cursor:pointer;font-weight:600}
[data-module="fuel"] .fu-table{width:100%;border-collapse:collapse;font-size:.9em}
[data-module="fuel"] .fu-table td,[data-module="fuel"] .fu-table th{padding:5px 6px;border-bottom:1px solid var(--sog-border);text-align:left;vertical-align:top}
[data-module="fuel"] .fu-table td.n,[data-module="fuel"] .fu-table th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
[data-module="fuel"] .fu-scroll{overflow-x:auto}
[data-module="fuel"] .fu-warn{color:var(--sog-warn)}
[data-module="fuel"] .fu-sheet{display:grid;grid-template-columns:1fr auto;gap:6px 10px;align-items:center}
[data-module="fuel"] .fu-sheet .f-row{justify-content:flex-end}
[data-module="fuel"] .fu-review td input{width:20px;height:20px;min-height:0}
[data-module="fuel"] .fu-hide{display:none}
@media (min-width: 980px){
  [data-module="fuel"] .fu-top{display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sog-gap);align-items:start}
  [data-module="fuel"] .fu-top>.f-card{margin-bottom:0}
  [data-module="fuel"] .fu-top+*{margin-top:var(--sog-gap)}
}`;

// ---------------------------------------------------------------- écran Préparer
/** Dessine l'écran Préparer (champs une fois ; résultats redessinés par refresh). */
function renderPlan() {
  const f = S.flight,
    r = f.route || {},
    sel = f.aircraft?.sheetId || (f.aircraft?.type ? '__type' : S.sheets[0]?.id || '__type'),
    opt = (v, l, on) => `<option value="${esc(v)}"${on ? ' selected' : ''}>${esc(l)}</option>`,
    fld = (key, label, val, attrs = '') => `<label class="f-field">${esc(tt(label))}<input data-k="${key}" value="${esc(val ?? '')}" ${attrs}></label>`;
  S.body.innerHTML = `
  <div class="fu-top">
    <div class="f-card" data-block="aircraft"><h2>${esc(tt(TX.aircraft))}</h2>
      <label class="f-field"><select data-k="sheet" aria-label="${esc(tt(TX.aircraft))}">${S.sheets.map(p => opt(p.id, `${p.name || p.id}${p.icao && p.icao !== p.name ? ` — ${p.icao}` : ''}`, p.id === sel)).join('')}${opt('__type', tt(TX.otherType), sel === '__type')}</select></label>
      <div data-typebox class="${sel === '__type' ? '' : 'fu-hide'}">${fld('type', TX.typeCode, f.aircraft?.type, 'class="fu-code" maxlength="5" autocapitalize="characters"')}</div>
      <p class="f-muted" data-src></p>
      ${S.sheets.length ? '' : `<p class="f-muted">${esc(tt(TX.noSheet))}</p>`}
    </div>
    <div class="f-card" data-block="route"><h2>${esc(tt(TX.route))}</h2>
      <div class="fu-grid3">${fld('dep', TX.dep, r.dep, 'class="fu-code" maxlength="4" autocapitalize="characters"')}${fld('arr', TX.arr, r.arr, 'class="fu-code" maxlength="4" autocapitalize="characters"')}${fld('altn', TX.altn, r.altn, 'class="fu-code" maxlength="4" autocapitalize="characters"')}</div>
      <div class="fu-grid3">${fld('dist', TX.distance, r.distanceNm != null ? Math.round(r.distanceNm) : '', 'inputmode="decimal"')}${fld('trk', TX.track, r.trackDeg != null ? Math.round(r.trackDeg) : '', 'inputmode="numeric"')}</div>
      <details><summary class="f-muted">${esc(tt(TX.routeText))}</summary><label class="f-field"><textarea data-k="rtext" rows="3" aria-label="${esc(tt(TX.routeText))}">${esc(r.text || '')}</textarea></label></details>
      <p class="f-muted fu-warn" data-unres></p>
      <div class="f-row">${S.ctx.identity.simbrief ? `<button type="button" data-do="simbrief">${esc(tt(TX.simbrief))}</button>` : `<span class="f-muted">${esc(tt(TX.noSimbrief))}</span>`}</div>
    </div>
    <div class="f-card" data-block="level"><h2>${esc(tt(TX.levelWind))}</h2>
      <div class="fu-grid3">${fld('fl', TX.level, f.level?.ft ? Math.round(f.level.ft / 100) : '', 'inputmode="numeric"')}
        <label class="f-field">${esc(tt(TX.goal))}<select data-k="goal">${window.FuelLevels.GOALS.map(g => opt(g, tt(TX.goals[g]), (S.settings.goal || 'prof') === g)).join('')}</select></label></div>
      <div class="fu-grid3">${fld('wdir', TX.windDir, f.wind?.dirDeg ?? '', 'inputmode="numeric"')}${fld('wkt', TX.windKt, f.wind?.speedKt ?? '', 'inputmode="numeric"')}${fld('isa', TX.isa, f.isaDev || '', 'inputmode="numeric"')}</div>
      <div class="fu-grid3 ${(S.settings.goal || 'prof') === 'man' ? '' : 'fu-hide'}" data-manbox>${fld('mias', TX.manIas, S.manualIn?.ias ?? '', 'inputmode="numeric"')}${fld('mvs', TX.manVs, S.manualIn?.vs ?? '', 'inputmode="numeric"')}</div>
    </div>
  </div>
  <div class="f-card" data-block="decision"><h2>${esc(tt(TX.decision))}</h2><div data-dec></div></div>
  <div class="f-card fu-result" data-block="result" aria-live="polite"></div>
  <details class="f-card" data-fold="details"><summary>${esc(tt(TX.details))}</summary><div data-details></div></details>
  <details class="f-card" data-fold="climb"><summary>${esc(tt(TX.climbGuide))}</summary><div data-climb></div></details>
  <details class="f-card" data-fold="settings"><summary>${esc(tt(TX.settings))}</summary>
    <div class="fu-grid3">${fld('taxiMin', TX.taxiMin, S.settings.taxiMin, 'inputmode="numeric"')}${fld('reserveMin', TX.reserveMin, S.settings.reserveMin, 'inputmode="numeric"')}${fld('contPct', TX.contPct, S.settings.contingencyPct, 'inputmode="decimal"')}
      <label class="f-field">${esc(tt(TX.unit))}<select data-k="unit">${['kg', 'lb'].map(u => opt(u, u, (S.settings.displayUnit || 'kg') === u)).join('')}</select></label></div>
    <div data-entrybox></div>
  </details>`;
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
  S.body.onclick = e => onPlanClick(e);
  refresh();
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
    case 'sheet': {
      const p = S.sheets.find(x => x.id === v);
      S.body.querySelector('[data-typebox]').classList.toggle('fu-hide', v !== '__type');
      f.aircraft = p ? {
        sheetId: p.id,
        type: p.icao || p.type || '',
        registration: p.registration || '',
        name: p.name || p.id
      } : {
        sheetId: '',
        type: (f.aircraft?.type || '').toUpperCase(),
        registration: '',
        name: ''
      };
      S.manual = null;
      break;
    }
    case 'type':
      f.aircraft = {
        sheetId: '',
        type: v.trim().toUpperCase(),
        registration: '',
        name: v.trim().toUpperCase()
      };
      break;
    case 'dep':
    case 'arr':
    case 'altn':
      r[k] = v.trim().toUpperCase();
      if (k !== 'altn') resolveRoute();
      break;
    case 'rtext':
      r.text = v;
      resolveRoute();
      break;
    case 'dist':
      r.distanceNm = num(v);
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
      const dir = num(S.body.querySelector('[data-k="wdir"]').value),
        kt = num(S.body.querySelector('[data-k="wkt"]').value);
      f.wind = kt === null && dir === null ? null : {
        dirDeg: dir,
        speedKt: kt
      };
      break;
    }
    case 'isa':
      f.isaDev = num(v) || 0;
      break;
    case 'goal':
      S.settings.goal = v;
      S.body.querySelector('[data-manbox]').classList.toggle('fu-hide', v !== 'man');
      saveSettings();
      return refresh();
    case 'mias':
    case 'mvs': {
      const ias = num(S.body.querySelector('[data-k="mias"]').value),
        vs = num(S.body.querySelector('[data-k="mvs"]').value);
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
      S.body.querySelector('[data-k="dist"]').value = r.distanceNm;
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
  if (!ofp || !window.FuelSheets.isSimbriefOfp(ofp)) return S.ctx.notify(tt(TX.sbError, {
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
      <span><span class="fu-dot" style="background:var(--sog-ok)"></span>${esc(tt(TX.leastFuel, { fl: flTxt(D.best.h), f: fuelTxt(D.best.fuel, unit) }))}</span>
      <span><span class="fu-dot" style="background:var(--sog-warn);border-radius:0"></span>${esc(tt(TX.fastest, { fl: flTxt(D.fast.h), t: hmm(D.fast.minutes) }))}</span>
    </div>
    ${D.gap ? `<p class="f-muted fu-warn">${esc(tt(TX.gap, { fl: flTxt(D.gap.from), r: tt(TX.reasons[D.gap.reason] || TX.reasons.thrust) }))}</p>` : ''}
    <div class="f-row"><button type="button" data-do="level" data-ft="${D.best.h}">${esc(tt(TX.use, { fl: flTxt(D.best.h) }))}</button>${D.fast.h !== D.best.h ? `<button type="button" data-do="level" data-ft="${D.fast.h}">${esc(tt(TX.use, { fl: flTxt(D.fast.h) }))}</button>` : ''}<span class="f-muted">${esc(tt(TX.decisionHint))}</span></div>`;
  // résultat collant
  const res = $('[data-block="result"]');
  if (!q) res.innerHTML = `<span class="f-muted">${esc(tt(sheet ? TX.noDistance : TX.noSheet))}</span>`;
  else if (!q.hasFuel) res.innerHTML = `<span class="fu-warn">${esc(tt(TX.noFuel))}</span>`;
  else {
    const range = !q.windKnown && Number.isFinite(q.blockLow) && Number.isFinite(q.blockHigh) && Math.round(q.blockLow) !== Math.round(q
      .blockHigh);
    res.innerHTML = `<div class="f-muted">${esc(tt(TX.block))} · ${flTxt(q.levelFt)}${q.approx ? ` · ${esc(tt(TX.approx))}` : ''}${range ? ` · ${esc(tt(TX.windRange))}` : ''}</div>
      <div class="fu-big">${range ? `${esc(fuelTxt(q.blockLow, unit))} – ${esc(fuelTxt(q.blockHigh, unit))}` : esc(fuelTxt(q.block, unit))}</div>
      <div class="fu-kv"><span class="f-muted">${esc(tt(TX.trip))}<b>${esc(fuelTxt(q.trip, unit))}</b></span><span class="f-muted">${esc(tt(TX.time))}<b>${hmm(q.minutes)}</b></span><span class="f-muted">${esc(tt(TX.tod))}<b>${esc(tt(TX.todVal, { nm: Math.round(q.todNm) }))}</b></span></div>
      ${q.overMtow ? `<div class="fu-warn">${esc(tt(TX.overMtow))}</div>` : ''}`;
  }
  // détail du devis (replié)
  const det = $('[data-details]');
  if ($('[data-fold="details"]').open) det.innerHTML = q?.hasFuel ? `<table class="fu-table"><tbody>
      ${[[TX.taxi, q.taxi], [TX.climb, q.climb], [TX.cruise, q.cruise], [TX.descent, q.descent]].map(([l, p]) => `<tr><td>${esc(tt(l))}</td><td class="n">${p?.min != null ? hmm(p.min) : ''}</td><td class="n">${p?.nm != null ? `${Math.round(p.nm)} NM` : ''}</td><td class="n">${esc(fuelTxt(p?.fuel ?? p, unit))}</td></tr>`).join('')}
      <tr><td><b>${esc(tt(TX.trip))}</b></td><td class="n">${hmm(q.minutes)}</td><td></td><td class="n"><b>${esc(fuelTxt(q.trip, unit))}</b></td></tr>
      <tr><td>${esc(tt(TX.contingency))}</td><td></td><td></td><td class="n">${esc(fuelTxt(q.contingency, unit))}</td></tr>
      <tr><td>${esc(tt(TX.reserve))}</td><td></td><td></td><td class="n">${esc(fuelTxt(q.reserve, unit))}</td></tr>
      <tr><td><b>${esc(tt(TX.block))}</b></td><td></td><td></td><td class="n"><b>${esc(fuelTxt(q.block, unit))}</b></td></tr>
    </tbody></table>${q.lawFailed ? `<p class="f-muted fu-warn">${esc(tt(TX.lawFailed))}</p>` : ''}` : '';
  // consignes de montée (repliées)
  const cl = $('[data-climb]');
  if ($('[data-fold="climb"]').open) cl.innerHTML = G ? climbSvg(G, cl) + `<div class="fu-scroll"><table class="fu-table"><thead><tr><th class="n">${esc(tt(TX.alt))}</th><th class="n">${esc(tt(TX.thr))}</th><th class="n">RPM</th><th class="n">IAS</th><th class="n">ft/min</th><th class="n">${esc(unit)}/h</th><th class="n">Mach</th><th class="n">${esc(tt(TX.time))}</th><th class="n">${esc(unit)}</th></tr></thead><tbody>
      ${G.rows.map(r => `<tr><td class="n">${r.h ? flTxt(r.h) : 'GND'}</td><td class="n">${Math.round(r.frac * 100)} %</td><td class="n">${r.rpm ? Math.round(r.rpm) : '—'}</td><td class="n">${Math.round(r.ias)}</td><td class="n">${Math.round(r.roc)}</td><td class="n">${Math.round(r.ff)}</td><td class="n">${r.mach.toFixed(2)}</td><td class="n">${hmm(r.t)}</td><td class="n">${Math.round(r.f)}</td></tr>`).join('')}
    </tbody></table></div>${G.reached ? '' : `<p class="fu-warn">${esc(tt(TX.notReached))}</p>`}` : `<p class="f-muted">${esc(tt(C.perf ? TX.noDistance : TX.noModel))}</p>`;
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
  const F = window.FuelSheets,
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
    ${S.sheets.map(raw => {
      const p = F.normalize(structuredClone(raw)),
        miss = F.sheetMissingPaths(p).length,
        when = F.profileWhen(p);
      return `<div class="f-card fu-sheet" data-id="${esc(p.id)}"><div><b>${esc(p.name || p.id)}</b> <span class="f-muted">${esc(p.icao || '')} · ${esc(p.unit)}</span>
        <div class="f-muted">${esc(F.profileSourceText(p))} · ${esc(miss ? tt(TX.missing, { n: miss }) : tt(TX.complete))}${when ? ` · ${esc(tt(TX.updated, { d: new Date(when).toLocaleDateString(lang) }))}` : ''}</div></div>
        <div class="f-row"><button type="button" data-do="use">${esc(tt(TX.useSheet))}</button><button type="button" data-do="edit">${esc(tt(TX.edit))}</button></div></div>`;
    }).join('') || `<p class="f-card f-muted">${esc(tt(TX.noSheet))}</p>`}`;
  S.body.onclick = e => onSheetsClick(e);
  S.body.oninput = null;
  S.body.onchange = e => e.target.matches('[data-file]') && importFiles([...e.target.files]);
}
/** Gestes de l'écran Fiches (liste, éditeur, aperçu des changements). */
async function onSheetsClick(e) {
  const b = e.target.closest('[data-do]');
  if (!b) return;
  const F = window.FuelSheets,
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
        type: raw.icao || '',
        registration: raw.registration || '',
        name: raw.name || raw.id
      };
      saveFlight();
      return show('plan');
    }
    case 'edit':
      return renderEditor(id);
    case 'back':
      return renderSheets();
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
        src: 'EUROCONTROL'
      });
    }
    case 'fill': {
      const other = S.sheets.find(x => x.id === S.body.querySelector('[data-k="fillfrom"]')?.value);
      if (!other) return;
      return review(p, F.fillProfileGaps(structuredClone(p), F.normalize(structuredClone(other))), {
        src: other.name || other.id
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
          src: 'ChatGPT'
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
      S.sheets = S.sheets.filter(x => x.id !== p.id);
      await writeSheets();
      return renderSheets();
    case 'apply':
      return applyReview();
    case 'cancel':
      return S.edit ? renderEditor(S.edit.id) : renderSheets();
  }
}
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
  const F = window.FuelSheets;
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
  return review(old || null, old ? mergeInto(window.FuelSheets.normalize(structuredClone(old)), np) : np, {
    src: np.source?.format || np.source?.file || ''
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
  const F = window.FuelSheets,
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
/** Éditeur d'une fiche : champs par groupe (libellés traduits), table RPM en lecture, compléments, ChatGPT, exports. */
function renderEditor(id) {
  const F = window.FuelSheets,
    raw = S.sheets.find(x => x.id === id);
  if (!raw) return renderSheets();
  const p = S.edit = F.normalize(structuredClone(raw)),
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
    ${groups.map((g, i) => `<details class="f-card"${i < 2 ? ' open' : ''}><summary>${esc(FIELD_TX[g] ? tt(FIELD_TX[g]) : g)}</summary><div class="fu-grid3">${F.PROFILE_FIELDS.filter(f => f[0] === g).map(input).join('')}</div></details>`).join('')}
    ${p.rpmFuelCurve.length ? `<details class="f-card"><summary>${esc(tt(TX.rpmTable))}</summary><div class="fu-scroll"><table class="fu-table"><thead><tr><th class="n">RPM</th><th class="n">ft</th><th class="n">${esc(p.unit)}/h</th></tr></thead><tbody>${p.rpmFuelCurve.map(r => `<tr><td class="n">${esc(r.rpm)}</td><td class="n">${esc(r.altFt ?? '')}</td><td class="n">${esc([r.fuelFlowMin, r.fuelFlowPerHour, r.fuelFlowMax].filter(x => x != null && x !== '').join(' / '))}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
    <div class="f-row"><button type="button" class="primary" data-do="save">${esc(tt(TX.save))}</button><button type="button" data-do="lnm">${esc(tt(TX.exportLnm))}</button><button type="button" data-do="json">${esc(tt(TX.exportJson))}</button><button type="button" data-do="del">${esc(tt(TX.remove))}</button></div>`;
}
/** Fiche de l'éditeur avec les valeurs des champs (nombres lus, vides → null). */
function readEditor(p) {
  const F = window.FuelSheets,
    out = structuredClone(p);
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
  const F = window.FuelSheets,
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
    box = (attr, on) => before ? `<td><input type="checkbox" ${attr}${on ? ' checked' : ''}></td>` : '<td></td>';
  S.pending = {
    before,
    after,
    diff
  };
  S.body.innerHTML = `<div class="f-card fu-review"><h2>${esc(before ? tt(TX.review) : tt(TX.reviewNew, { n: after.name || after.id }))}${o.src ? ` <span class="f-muted">· ${esc(o.src)}</span>` : ''}</h2>
    ${rows.length || diff.curve.length ? `<div class="fu-scroll"><table class="fu-table"><thead><tr><th></th><th>${esc(tt(TX.field))}</th><th class="n">${esc(tt(TX.before))}</th><th class="n">${esc(tt(TX.after))}</th></tr></thead><tbody>
      ${rows.map(r => `<tr>${box(`data-path="${esc(r.path)}"`, !o.checked || o.checked(r.path))}<td>${esc(fieldLabel(r.path, true))}</td><td class="n">${show(r.old)}</td><td class="n">${show(r.now)}</td></tr>`).join('')}
      ${diff.curve.map(c => `<tr>${box(`data-curve="${esc(c.key)}"`, true)}<td>RPM ${esc(c.label)} <span class="f-muted">(${esc(tt(c.kind === 'added' ? TX.added : TX.replaced))})</span></td><td class="n">${esc(c.old)}</td><td class="n">${esc(c.now)}</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="f-muted">${esc(tt(TX.reviewNone))}</p>`}
    <div class="f-row"><button type="button" class="primary" data-do="apply">${esc(tt(TX.apply))}</button><button type="button" data-do="cancel">${esc(tt(TX.cancel))}</button></div></div>`;
}
/** Écrit la sélection de l'aperçu (champs décochés gardés tels qu'avant), puis la fiche suivante de la file. */
async function applyReview() {
  const F = window.FuelSheets,
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
  if (!before) out.id = uniqueId(out.id);
  await storeSheet(out);
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
  window.FuelSheets.configure({
    aircraft: S.A,
    profiles: () => Object.fromEntries(S.sheets.map(p => [p.id, p])),
    active: () => S.edit || S.C?.sheet || null,
    lang: () => ctx.lang(),
    t: row => ctx.t(row),
    tf: (row, vals) => ctx.t(row, vals)
  });
  await readSheets();
  S.flight = {
    ...emptyFlight(),
    ...((await ctx.data.get(pilotPath('current_flight.json'))) || {})
  };
  S.settings = {
    taxiMin: 10,
    reserveMin: 30,
    contingencyPct: 5,
    displayUnit: 'kg',
    entries: {},
    ...((await ctx.data.get(pilotPath('fuel.json'))) || {})
  };
  S.ofp = await ctx.data.get(OFP_PATH);
  S.ui = (await ctx.data.get(UI_PATH)) || {};
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(ctx.t(['Carburant et niveau', 'Fuel and level', 'Kraftstoff und Flugfläche', 'Combustible y nivel']))}</h1>
    <div class="f-row fu-tabs" role="group"><button type="button" data-view="plan">${esc(tt(TX.plan))}</button><button type="button" data-view="sheets">${esc(tt(TX.sheets))}</button></div>
    <div data-body></div>`;
  S.body = el.querySelector('[data-body]');
  el.querySelector('.fu-tabs').onclick = e => e.target.dataset.view && show(e.target.dataset.view);
  // fiches changées ailleurs (synchronisation, autre onglet) ; vol courant écrit par maps
  S.stops.push(ctx.data.watch(DB_PATH, async () => {
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
